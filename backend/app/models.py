from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_name: Mapped[str] = mapped_column(String(150))
    job_title: Mapped[str] = mapped_column(String(150))
    job_description: Mapped[str] = mapped_column(Text)

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
    full_name: Mapped[str] = mapped_column(String(150), default="")
    headline: Mapped[str] = mapped_column(String(200), default="")
    skills: Mapped[list[str]] = mapped_column(JSON, default=list)
