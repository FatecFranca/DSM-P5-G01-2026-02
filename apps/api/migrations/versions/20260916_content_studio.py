"""Local content studio state, snapshots and administrator flag."""

from alembic import op
import sqlalchemy as sa

revision = "20260916_content_studio"
down_revision = "20260918_ranking_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()))
    with op.batch_alter_table("content_versions") as batch:
        batch.add_column(sa.Column("snapshot", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("author_id", sa.String(length=36), nullable=True))
        batch.create_foreign_key("fk_content_versions_author_id_users", "users", ["author_id"], ["id"])
    with op.batch_alter_table("assets") as batch:
        batch.add_column(sa.Column("alt", sa.String(length=120), nullable=True))
    op.create_table(
        "content_studio_state",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("draft", sa.JSON(), nullable=True),
        sa.Column("published", sa.JSON(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("content_studio_state")
    with op.batch_alter_table("assets") as batch:
        batch.drop_column("alt")
    with op.batch_alter_table("content_versions") as batch:
        batch.drop_constraint("fk_content_versions_author_id_users", type_="foreignkey")
        batch.drop_column("author_id")
        batch.drop_column("snapshot")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("is_admin")
