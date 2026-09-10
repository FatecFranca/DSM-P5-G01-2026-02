"""Store the letters required before a word can be introduced."""

from alembic import op
import sqlalchemy as sa

revision = "20260910_word_requirements"
down_revision = "20260910_progress_metadata"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("words", sa.Column("required_letters", sa.String(length=26), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("words", "required_letters")
