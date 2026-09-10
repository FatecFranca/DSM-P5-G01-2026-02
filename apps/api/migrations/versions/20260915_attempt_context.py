"""Persist completed_types, record lesson/type on attempts, drop the handwriting-classifier fields.

confidence/uncertain came from the removed on-device letter classifier and were always null/false.
model_version is renamed to served_model_version for the server-side ranking planned next.
"""

from alembic import op
import sqlalchemy as sa

revision = "20260915_attempt_context"
down_revision = "20260915_exercise_word_choices"
branch_labels = None
depends_on = None

BACKFILL_TYPE = """
UPDATE attempts SET exercise_type = CASE
  WHEN exercise_id LIKE 'exercise-_-listen' THEN 'listen_choose'
  WHEN exercise_id LIKE 'exercise-_-recognize' THEN 'recognize_letter'
  WHEN exercise_id LIKE 'exercise-_-find' THEN 'find_in_word'
  WHEN exercise_id LIKE 'exercise-_-complete-word' THEN 'complete_word'
END WHERE exercise_type IS NULL
"""
BACKFILL_LESSON = "UPDATE attempts SET lesson_id = 'lesson-' || substr(exercise_id, 10, 1) WHERE lesson_id IS NULL AND exercise_id LIKE 'exercise-_-%'"


def upgrade() -> None:
    op.add_column("progress", sa.Column("completed_types", sa.JSON(), nullable=True))
    with op.batch_alter_table("attempts") as batch:
        batch.add_column(sa.Column("lesson_id", sa.String(length=64), nullable=True))
        batch.add_column(sa.Column("exercise_type", sa.String(length=32), nullable=True))
        batch.alter_column("model_version", new_column_name="served_model_version")
        batch.drop_column("confidence")
        batch.drop_column("uncertain")
    op.execute(BACKFILL_LESSON)
    op.execute(BACKFILL_TYPE)


def downgrade() -> None:
    with op.batch_alter_table("attempts") as batch:
        batch.add_column(sa.Column("uncertain", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch.add_column(sa.Column("confidence", sa.Float(), nullable=True))
        batch.alter_column("served_model_version", new_column_name="model_version")
        batch.drop_column("exercise_type")
        batch.drop_column("lesson_id")
    op.drop_column("progress", "completed_types")
