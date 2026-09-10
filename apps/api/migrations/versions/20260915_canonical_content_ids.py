"""Canonicalize content IDs.

Legacy app IDs (letter-a, A-listen) and fresh-seed IDs (exercise-A-find_in_word) become lesson-A / exercise-A-find.
Progress rows that collide after renaming are merged per user. Data-only: downgrade is a no-op because merged rows
cannot be split back. The regexes are inlined on purpose so this migration never depends on current app code.
"""

import re

from alembic import op
import sqlalchemy as sa

revision = "20260915_canonical_content_ids"
down_revision = "20260910_remove_writing"
branch_labels = None
depends_on = None

LEGACY_LESSON = re.compile(r"^letter-([a-z])$")
EXERCISE = re.compile(r"^(?:exercise-)?([A-Z])-(listen|recognize|find|find_in_word|complete-word)$")
COUNTERS = ("completed_exercises", "attempts", "correct_attempts", "review_count")


def lesson_id(value: str) -> str:
    match = LEGACY_LESSON.match(value)
    return f"lesson-{match.group(1).upper()}" if match else value


def exercise_id(value: str) -> str:
    match = EXERCISE.match(value)
    if not match:
        return value
    return f"exercise-{match.group(1)}-{'find' if match.group(2) == 'find_in_word' else match.group(2)}"


def upgrade() -> None:
    bind = op.get_bind()
    existing = {row.id for row in bind.execute(sa.text("SELECT id FROM exercises"))}
    for old in sorted(existing):
        new = exercise_id(old)
        if new == old:
            continue
        if new in existing:
            bind.execute(sa.text("DELETE FROM exercises WHERE id = :old"), {"old": old})
        else:
            bind.execute(sa.text("UPDATE exercises SET id = :new WHERE id = :old"), {"new": new, "old": old})

    for row in bind.execute(sa.text("SELECT DISTINCT exercise_id FROM attempts")).all():
        new = exercise_id(row.exercise_id)
        if new != row.exercise_id:
            bind.execute(sa.text("UPDATE attempts SET exercise_id = :new WHERE exercise_id = :old"), {"new": new, "old": row.exercise_id})

    rows = [dict(row) for row in bind.execute(sa.text(f"SELECT id, user_id, lesson_id, status, {', '.join(COUNTERS)} FROM progress")).mappings()]
    by_id = {row["id"]: row for row in rows}
    owners = {(row["user_id"], row["lesson_id"]): row["id"] for row in rows}
    for row in rows:
        target = lesson_id(row["lesson_id"])
        if target == row["lesson_id"]:
            continue
        keeper = owners.get((row["user_id"], target))
        if keeper is None:
            bind.execute(sa.text("UPDATE progress SET lesson_id = :target WHERE id = :id"), {"target": target, "id": row["id"]})
            owners[(row["user_id"], target)] = row["id"]
            continue
        kept = by_id[keeper]
        merged = {"status": "completed" if "completed" in (kept["status"], row["status"]) else kept["status"]}
        merged |= {name: max(kept[name] or 0, row[name] or 0) for name in COUNTERS}
        assignments = ", ".join(f"{name} = :{name}" for name in merged)
        bind.execute(sa.text(f"UPDATE progress SET {assignments} WHERE id = :id"), {**merged, "id": keeper})
        kept.update(merged)
        bind.execute(sa.text("DELETE FROM progress WHERE id = :id"), {"id": row["id"]})


def downgrade() -> None:
    pass
