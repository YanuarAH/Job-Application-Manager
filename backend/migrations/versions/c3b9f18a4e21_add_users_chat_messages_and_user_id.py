"""add users chat_messages and user_id scoping

Revision ID: c3b9f18a4e21
Revises: 8db50a052f3f
Create Date: 2026-10-19 00:22:30.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3b9f18a4e21"
down_revision: Union[str, Sequence[str], None] = "8db50a052f3f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=150), nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=False, server_default=""),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_demo", sa.Boolean(), server_default="false", nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=30), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_chat_messages_id"), "chat_messages", ["id"], unique=False)
    op.create_index(
        op.f("ix_chat_messages_user_id"), "chat_messages", ["user_id"], unique=False
    )

    op.add_column("jobs", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_jobs_user_id"), "jobs", ["user_id"], unique=False)
    op.create_foreign_key(
        "fk_jobs_user_id_users",
        "jobs",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.add_column(
        "candidate_profiles", sa.Column("user_id", sa.Integer(), nullable=True)
    )
    op.create_index(
        op.f("ix_candidate_profiles_user_id"),
        "candidate_profiles",
        ["user_id"],
        unique=True,
    )
    op.create_foreign_key(
        "fk_candidate_profiles_user_id_users",
        "candidate_profiles",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "fk_candidate_profiles_user_id_users",
        "candidate_profiles",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_candidate_profiles_user_id"), table_name="candidate_profiles"
    )
    op.drop_column("candidate_profiles", "user_id")

    op.drop_constraint("fk_jobs_user_id_users", "jobs", type_="foreignkey")
    op.drop_index(op.f("ix_jobs_user_id"), table_name="jobs")
    op.drop_column("jobs", "user_id")

    op.drop_index(op.f("ix_chat_messages_user_id"), table_name="chat_messages")
    op.drop_index(op.f("ix_chat_messages_id"), table_name="chat_messages")
    op.drop_table("chat_messages")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")
