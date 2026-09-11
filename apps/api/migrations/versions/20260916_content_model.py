"""Content model for tracks, syllables and sentences (docs/adr/0002).

modules → tracks, lessons → units, exercises → items, with curation metadata and the tables the catalog strategy requires.
progress.unit_id and attempts.item_id become real foreign keys; rows that reference content that no longer exists are removed
first (they were unusable orphans). syllables moves from "MA-LA" to a JSON list. Downgrade is lossy for the new metadata.
"""

import json

from alembic import op
import sqlalchemy as sa

revision = "20260916_content_model"
down_revision = "20260915_attempt_context"
branch_labels = None
depends_on = None

LEARNING_ORDER = "AEIOUMLPSTRNDCGBFVHQJKZXWY"


def upgrade() -> None:
    bind = op.get_bind()
    op.rename_table("modules", "tracks")
    op.rename_table("lessons", "units")
    op.rename_table("exercises", "items")

    with op.batch_alter_table("tracks") as batch:
        batch.add_column(sa.Column("slug", sa.String(length=64), nullable=True))
        batch.add_column(sa.Column("kind", sa.String(length=16), nullable=False, server_default="theme"))
        batch.add_column(sa.Column("description", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("review_status", sa.String(length=16), nullable=False, server_default="pending"))
        batch.add_column(sa.Column("version", sa.Integer(), nullable=False, server_default="1"))
    op.execute("UPDATE tracks SET slug = id WHERE slug IS NULL")
    op.execute("UPDATE tracks SET kind = 'phonics' WHERE id = 'alphabet'")
    with op.batch_alter_table("tracks") as batch:
        batch.alter_column("slug", nullable=False)
        batch.create_unique_constraint("uq_tracks_slug", ["slug"])

    with op.batch_alter_table("units") as batch:
        batch.alter_column("module_id", new_column_name="track_id")
        batch.alter_column("letter", new_column_name="focus_letter", nullable=True)
        batch.alter_column("phase", nullable=True)
        batch.alter_column("phase_title", nullable=True)
        batch.add_column(sa.Column("kind", sa.String(length=16), nullable=False, server_default="letter"))
        batch.add_column(sa.Column("required_letters", sa.String(length=26), nullable=False, server_default=""))
        batch.add_column(sa.Column("review_status", sa.String(length=16), nullable=False, server_default="pending"))
        batch.add_column(sa.Column("version", sa.Integer(), nullable=False, server_default="1"))
    for row in bind.execute(sa.text("SELECT id, focus_letter FROM units WHERE kind = 'letter'")).all():
        if row.focus_letter in LEARNING_ORDER:
            bind.execute(sa.text("UPDATE units SET required_letters = :letters WHERE id = :id"), {"letters": LEARNING_ORDER[: LEARNING_ORDER.index(row.focus_letter)], "id": row.id})

    with op.batch_alter_table("items") as batch:
        batch.alter_column("lesson_id", new_column_name="unit_id")
        batch.alter_column("answer", type_=sa.String(length=80))
        batch.alter_column("audio_asset", nullable=True)
        batch.add_column(sa.Column("item_kind", sa.String(length=16), nullable=False, server_default="letter"))
        batch.add_column(sa.Column("target_id", sa.String(length=64), nullable=True))
        batch.add_column(sa.Column("payload", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("required_letters", sa.String(length=26), nullable=False, server_default=""))
        batch.add_column(sa.Column("tts_fallback_text", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("review_status", sa.String(length=16), nullable=False, server_default="pending"))
    op.execute("UPDATE items SET tts_fallback_text = instruction WHERE tts_fallback_text IS NULL")

    with op.batch_alter_table("words") as batch:
        batch.add_column(sa.Column("syllable_list", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("raw_frequency", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("frequency_source", sa.String(length=64), nullable=True))
        batch.add_column(sa.Column("difficulty_rationale", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("image_asset", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("image_alt", sa.String(length=120), nullable=True))
        batch.add_column(sa.Column("audio_asset", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("region_notes", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("license", sa.String(length=120), nullable=True))
        batch.add_column(sa.Column("attribution", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("source", sa.String(length=64), nullable=True))
        batch.add_column(sa.Column("review_status", sa.String(length=16), nullable=False, server_default="pending"))
        batch.add_column(sa.Column("content_version", sa.Integer(), nullable=False, server_default="1"))
        batch.alter_column("frequency", nullable=True)
        batch.drop_column("classifier_version")
    for row in bind.execute(sa.text("SELECT id, syllables FROM words")).all():
        bind.execute(sa.text("UPDATE words SET syllable_list = :parts, source = 'curadoria' WHERE id = :id"), {"parts": json.dumps([part for part in (row.syllables or "").split("-") if part], ensure_ascii=False), "id": row.id})
    with op.batch_alter_table("words") as batch:
        batch.drop_column("syllables")
        batch.alter_column("syllable_list", new_column_name="syllables")

    op.create_table("syllables",
        sa.Column("id", sa.String(length=16), primary_key=True), sa.Column("text", sa.String(length=16), nullable=False), sa.Column("pattern", sa.String(length=4), nullable=False),
        sa.Column("required_letters", sa.String(length=26), nullable=False, server_default=""), sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("difficulty", sa.String(length=16), nullable=False, server_default="facil"), sa.Column("audio_asset", sa.String(length=255), nullable=True),
        sa.Column("review_status", sa.String(length=16), nullable=False, server_default="pending"))
    op.create_table("sentences",
        sa.Column("id", sa.String(length=64), primary_key=True), sa.Column("text", sa.String(length=200), nullable=False), sa.Column("track_id", sa.String(length=64), sa.ForeignKey("tracks.id"), nullable=True),
        sa.Column("required_word_ids", sa.JSON(), nullable=False), sa.Column("required_letters", sa.String(length=26), nullable=False, server_default=""), sa.Column("word_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("difficulty", sa.String(length=16), nullable=False, server_default="medio"), sa.Column("audio_asset", sa.String(length=255), nullable=True),
        sa.Column("image_asset", sa.String(length=255), nullable=True), sa.Column("image_alt", sa.String(length=120), nullable=True),
        sa.Column("license", sa.String(length=120), nullable=True), sa.Column("attribution", sa.String(length=255), nullable=True),
        sa.Column("review_status", sa.String(length=16), nullable=False, server_default="pending"), sa.Column("content_version", sa.Integer(), nullable=False, server_default="1"))
    op.create_table("word_tracks",
        sa.Column("word_id", sa.String(length=36), sa.ForeignKey("words.id"), primary_key=True), sa.Column("track_id", sa.String(length=64), sa.ForeignKey("tracks.id"), primary_key=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"))
    op.create_table("content_reviews",
        sa.Column("id", sa.String(length=36), primary_key=True), sa.Column("entity_type", sa.String(length=16), nullable=False), sa.Column("entity_id", sa.String(length=80), nullable=False),
        sa.Column("entity_version", sa.Integer(), nullable=False, server_default="1"), sa.Column("reviewer", sa.String(length=120), nullable=False), sa.Column("decision", sa.String(length=16), nullable=False),
        sa.Column("source", sa.String(length=120), nullable=True), sa.Column("notes", sa.Text(), nullable=True), sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("assets",
        sa.Column("id", sa.String(length=255), primary_key=True), sa.Column("kind", sa.String(length=16), nullable=False), sa.Column("audio_kind", sa.String(length=16), nullable=True),
        sa.Column("license", sa.String(length=120), nullable=True), sa.Column("attribution", sa.String(length=255), nullable=True),
        sa.Column("checksum", sa.String(length=64), nullable=True), sa.Column("duration_ms", sa.Integer(), nullable=True))
    op.create_table("content_versions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True), sa.Column("version", sa.String(length=32), nullable=False), sa.Column("checksum", sa.String(length=64), nullable=False),
        sa.Column("notes", sa.String(length=255), nullable=True), sa.Column("published_at", sa.DateTime(timezone=True), nullable=False))

    # Linhas que apontam para conteúdo inexistente são inutilizáveis; saem antes de as chaves estrangeiras entrarem.
    op.execute("DELETE FROM attempts WHERE exercise_id NOT IN (SELECT id FROM items)")
    op.execute("UPDATE attempts SET lesson_id = NULL WHERE lesson_id IS NOT NULL AND lesson_id NOT IN (SELECT id FROM units)")
    op.execute("DELETE FROM progress WHERE lesson_id NOT IN (SELECT id FROM units)")
    # Renomear e criar chaves estrangeiras em batches separados: o batch resolve nomes de coluna antes do rename.
    with op.batch_alter_table("attempts") as batch:
        batch.alter_column("exercise_id", new_column_name="item_id")
        batch.alter_column("lesson_id", new_column_name="unit_id")
    with op.batch_alter_table("attempts") as batch:
        batch.create_foreign_key("fk_attempts_item_id_items", "items", ["item_id"], ["id"])
        batch.create_foreign_key("fk_attempts_unit_id_units", "units", ["unit_id"], ["id"])
        batch.create_index("ix_attempts_item_id", ["item_id"])
    with op.batch_alter_table("progress") as batch:
        batch.alter_column("lesson_id", new_column_name="unit_id")
    with op.batch_alter_table("progress") as batch:
        batch.create_foreign_key("fk_progress_unit_id_units", "units", ["unit_id"], ["id"])


def downgrade() -> None:
    bind = op.get_bind()
    with op.batch_alter_table("progress") as batch:
        batch.drop_constraint("fk_progress_unit_id_units", type_="foreignkey")
    with op.batch_alter_table("progress") as batch:
        batch.alter_column("unit_id", new_column_name="lesson_id")
    with op.batch_alter_table("attempts") as batch:
        batch.drop_index("ix_attempts_item_id")
        batch.drop_constraint("fk_attempts_unit_id_units", type_="foreignkey")
        batch.drop_constraint("fk_attempts_item_id_items", type_="foreignkey")
    with op.batch_alter_table("attempts") as batch:
        batch.alter_column("unit_id", new_column_name="lesson_id")
        batch.alter_column("item_id", new_column_name="exercise_id")
    for name in ("content_versions", "assets", "content_reviews", "word_tracks", "sentences", "syllables"):
        op.drop_table(name)

    with op.batch_alter_table("words") as batch:
        batch.add_column(sa.Column("syllable_text", sa.String(length=80), nullable=True))
    for row in bind.execute(sa.text("SELECT id, syllables FROM words")).all():
        parts = row.syllables if isinstance(row.syllables, list) else json.loads(row.syllables or "[]")
        bind.execute(sa.text("UPDATE words SET syllable_text = :text WHERE id = :id"), {"text": "-".join(parts), "id": row.id})
    with op.batch_alter_table("words") as batch:
        batch.drop_column("syllables")
        batch.alter_column("syllable_text", new_column_name="syllables", nullable=False)
        batch.add_column(sa.Column("classifier_version", sa.String(length=40), nullable=False, server_default="bootstrap-1"))
        for name in ("content_version", "review_status", "source", "attribution", "license", "region_notes", "audio_asset", "image_alt", "image_asset", "difficulty_rationale", "frequency_source", "raw_frequency"):
            batch.drop_column(name)

    op.execute("DELETE FROM items WHERE item_kind != 'letter'")
    with op.batch_alter_table("items") as batch:
        for name in ("review_status", "tts_fallback_text", "required_letters", "payload", "target_id", "item_kind"):
            batch.drop_column(name)
        batch.alter_column("unit_id", new_column_name="lesson_id")
        batch.alter_column("answer", type_=sa.String(length=16))
    op.execute("DELETE FROM units WHERE kind != 'letter'")
    with op.batch_alter_table("units") as batch:
        for name in ("version", "review_status", "required_letters", "kind"):
            batch.drop_column(name)
        batch.alter_column("focus_letter", new_column_name="letter", nullable=False)
        batch.alter_column("track_id", new_column_name="module_id")
    op.execute("DELETE FROM tracks WHERE kind != 'phonics'")
    with op.batch_alter_table("tracks") as batch:
        batch.drop_constraint("uq_tracks_slug", type_="unique")
        for name in ("version", "review_status", "description", "kind", "slug"):
            batch.drop_column(name)
    op.rename_table("items", "exercises")
    op.rename_table("units", "lessons")
    op.rename_table("tracks", "modules")
