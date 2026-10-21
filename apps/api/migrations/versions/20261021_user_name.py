"""Nome opcional (como a pessoa quer ser chamada) na tabela users."""

from alembic import op
import sqlalchemy as sa

revision = "20261021_user_name"
down_revision = "20261018_word_ml_labels"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("name", sa.String(length=80), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.drop_column("name")
