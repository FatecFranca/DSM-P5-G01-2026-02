"""Store the word choices of complete_word exercises."""

from alembic import op
import sqlalchemy as sa

revision = "20260915_exercise_word_choices"
down_revision = "20260915_canonical_content_ids"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exercises", sa.Column("word_choices", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.execute("DELETE FROM exercises WHERE type = 'complete_word'")
    op.drop_column("exercises", "word_choices")
