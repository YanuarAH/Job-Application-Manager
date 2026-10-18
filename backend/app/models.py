from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(150), default="")
    password_hash: Mapped[str] = mapped_column(String(255))
    is_demo: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        default=None,
    )
    company_name: Mapped[str] = mapped_column(String(150))
    job_title: Mapped[str] = mapped_column(String(150))
    job_description: Mapped[str] = mapped_column(Text)

    # Application tracking
    application_status: Mapped[str] = mapped_column(
        String(30), default="Saved", server_default="Saved"
    )
    notes: Mapped[str | None] = mapped_column(
        Text, nullable=True, default=None
    )

    # Hasil analisis AI (nullable sampai dianalisis)
    required_skills: Mapped[list[str] | None] = mapped_column(
        JSON, nullable=True, default=None
    )
    preferred_skills: Mapped[list[str] | None] = mapped_column(
        JSON, nullable=True, default=None
    )
    experience_level: Mapped[str | None] = mapped_column(
        String(50), nullable=True, default=None
    )
    summary: Mapped[str | None] = mapped_column(
        Text, nullable=True, default=None
    )
    analysis_source: Mapped[str | None] = mapped_column(
        String(30), nullable=True, default=None
    )


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        unique=True,
        index=True,
        default=None,
    )
    full_name: Mapped[str] = mapped_column(String(150), default="")
    headline: Mapped[str] = mapped_column(String(200), default="")
    skills: Mapped[list[str]] = mapped_column(JSON, default=list)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        default=None,
    )
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(
        String(30), nullable=True, default=None
    )
