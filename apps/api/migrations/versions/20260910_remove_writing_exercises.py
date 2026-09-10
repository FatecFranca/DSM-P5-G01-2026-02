"""Replace writing exercises with contextual letter-location exercises."""

from alembic import op
import sqlalchemy as sa

revision = "20260910_remove_writing"
down_revision = "20260910_word_requirements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exercises", sa.Column("context_word", sa.String(length=40), nullable=True))
    op.execute("DELETE FROM exercises WHERE type = 'write_letter'")


def downgrade() -> None:
    op.drop_column("exercises", "context_word")
