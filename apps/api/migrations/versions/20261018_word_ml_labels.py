"""Campos de predição ML e feedback humano na tabela words."""

from alembic import op
import sqlalchemy as sa

revision = "20261018_word_ml_labels"
down_revision = "20260916_content_studio"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("words") as batch:
        batch.add_column(sa.Column("model_difficulty", sa.String(length=16), nullable=True))
        batch.add_column(sa.Column("label_feedback", sa.String(length=16), nullable=True))
        batch.add_column(sa.Column("labeled_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("labeled_by", sa.String(length=120), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("words") as batch:
        batch.drop_column("labeled_by")
        batch.drop_column("labeled_at")
        batch.drop_column("label_feedback")
        batch.drop_column("model_difficulty")
