"""Persist progressive learning mastery metadata."""

from alembic import op
import sqlalchemy as sa

revision = "20260910_progress_metadata"
down_revision = "20260910_progressive_learning"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("progress", sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("progress", sa.Column("correct_attempts", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("progress", sa.Column("accuracy", sa.Float(), nullable=True))
    op.add_column("progress", sa.Column("review_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("progress", sa.Column("last_practiced_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("progress", sa.Column("next_review_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("progress", "next_review_at")
    op.drop_column("progress", "last_practiced_at")
    op.drop_column("progress", "review_count")
    op.drop_column("progress", "accuracy")
    op.drop_column("progress", "correct_attempts")
    op.drop_column("progress", "attempts")
