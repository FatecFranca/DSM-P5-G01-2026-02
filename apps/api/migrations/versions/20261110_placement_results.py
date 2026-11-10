"""Resultados do quiz de nivelamento (contracts/placement-quiz.json), corrigidos no servidor."""

from alembic import op
import sqlalchemy as sa

revision = "20261110_placement_results"
down_revision = "20261022_google_login"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("placement_results",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("result_id", sa.String(length=100), nullable=False),
        sa.Column("quiz_version", sa.String(length=32), nullable=False),
        sa.Column("skipped", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("responses", sa.JSON(), nullable=False),
        sa.Column("hits_facil", sa.Integer(), nullable=False),
        sa.Column("hits_medio", sa.Integer(), nullable=False),
        sa.Column("hits_dificil", sa.Integer(), nullable=False),
        sa.Column("difficulty", sa.String(length=16), nullable=False),
        sa.Column("provisional", sa.Boolean(), nullable=False),
        sa.Column("provisional_reason", sa.String(length=32), nullable=True),
        sa.Column("start_level", sa.Integer(), nullable=False),
        sa.Column("credited_letters", sa.String(length=26), nullable=False, server_default=""),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "result_id", name="uq_placement_results_user_result"))


def downgrade() -> None:
    op.drop_table("placement_results")
