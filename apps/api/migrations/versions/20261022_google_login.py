"""Login social via Firebase: firebase_uid em users e senha opcional."""

from alembic import op
import sqlalchemy as sa

revision = "20261022_google_login"
down_revision = "20261021_user_name"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("firebase_uid", sa.String(length=128), nullable=True))
        batch.alter_column("password_hash", existing_type=sa.String(length=255), nullable=True)
        batch.create_index("ix_users_firebase_uid", ["firebase_uid"], unique=True)


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.drop_index("ix_users_firebase_uid")
        batch.alter_column("password_hash", existing_type=sa.String(length=255), nullable=False)
        batch.drop_column("firebase_uid")
