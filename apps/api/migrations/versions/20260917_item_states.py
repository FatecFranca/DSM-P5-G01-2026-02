"""Per-item spaced-repetition state and session context on attempts (docs/adr/0003)."""

from alembic import op
import sqlalchemy as sa

revision = "20260917_item_states"
down_revision = "20260916_content_model"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("item_states",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("item_id", sa.String(length=80), sa.ForeignKey("items.id"), nullable=False),
        sa.Column("unit_id", sa.String(length=64), sa.ForeignKey("units.id"), nullable=True),
        sa.Column("strength", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("half_life_hours", sa.Float(), nullable=False, server_default="4"),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reps", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("lapses", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("consecutive_correct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_result", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "item_id", name="uq_item_states_user_item"))
    with op.batch_alter_table("attempts") as batch:
        batch.add_column(sa.Column("session_id", sa.String(length=64), nullable=True))
        batch.add_column(sa.Column("position_in_session", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("attempt_index_in_item", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("audio_repeats", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("time_to_first_interaction_ms", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("served_by", sa.String(length=16), nullable=True))
        batch.add_column(sa.Column("served_policy_version", sa.String(length=32), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("attempts") as batch:
        for name in ("served_policy_version", "served_by", "time_to_first_interaction_ms", "audio_repeats", "attempt_index_in_item", "position_in_session", "session_id"):
            batch.drop_column(name)
    op.drop_table("item_states")
