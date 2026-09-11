"""Ranking logs for off-policy analysis and research consent flag on users (docs/adr/0004)."""

from alembic import op
import sqlalchemy as sa

revision = "20260918_ranking_logs"
down_revision = "20260917_item_states"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("ranking_logs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("session_id", sa.String(length=64), nullable=False),
        sa.Column("unit_id", sa.String(length=64), nullable=True),
        sa.Column("candidate_item_ids", sa.JSON(), nullable=False),
        sa.Column("scores", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("model_version", sa.String(length=80), nullable=True),
        sa.Column("policy_version", sa.String(length=32), nullable=False),
        sa.Column("served_at", sa.DateTime(timezone=True), nullable=False))
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("research_consent", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch.add_column(sa.Column("research_consent_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.drop_column("research_consent_at")
        batch.drop_column("research_consent")
    op.drop_table("ranking_logs")
