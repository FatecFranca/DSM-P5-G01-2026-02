"""Add progressive learning phase metadata to lessons."""

from alembic import op
import sqlalchemy as sa

revision = "20260910_progressive_learning"
down_revision = "6fb301185a23"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("lessons", sa.Column("phase", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("lessons", sa.Column("phase_title", sa.String(length=120), nullable=False, server_default="Vogais"))
    phase_two = "'M','L','P','S','T','R','N','D','C','G'"
    phase_three = "'B','F','V','H','Q','J','K','Z','X','W','Y'"
    op.execute(f"UPDATE lessons SET phase = 2, phase_title = 'Consoantes de alta utilidade' WHERE letter IN ({phase_two})")
    op.execute(f"UPDATE lessons SET phase = 3, phase_title = 'Ampliação do vocabulário' WHERE letter IN ({phase_three})")


def downgrade() -> None:
    op.drop_column("lessons", "phase_title")
    op.drop_column("lessons", "phase")
