from pydantic import BaseModel, ConfigDict, Field


class JobCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=150)
    job_title: str = Field(min_length=1, max_length=150)
    job_description: str = Field(min_length=1)


class JobUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=1, max_length=150)
    job_title: str | None = Field(default=None, min_length=1, max_length=150)
    job_description: str | None = Field(default=None, min_length=1)


class JobAnalysisResult(BaseModel):
    """Skema terstruktur yang dikembalikan oleh LLM / fallback analyzer."""

    required_skills: list[str] = Field(
        default_factory=list,
        description="Daftar skill teknis atau non-teknis yang wajib dimiliki kandidat.",
    )
    preferred_skills: list[str] = Field(
        default_factory=list,
        description="Daftar skill tambahan (nice-to-have / plus) jika disebutkan.",
    )
    experience_level: str = Field(
        default="Not specified",
        description="Tingkat pengalaman: Intern, Entry Level, Mid Level, Senior, atau Not specified.",
    )
    summary: str = Field(
        default="",
        description="Ringkasan singkat (1-2 kalimat) mengenai fokus utama peran ini.",
    )


class JobResponse(BaseModel):
    id: int
    company_name: str
    job_title: str
    job_description: str
    required_skills: list[str] | None = None
    preferred_skills: list[str] | None = None
    experience_level: str | None = None
    summary: str | None = None
    analysis_source: str | None = None

    model_config = ConfigDict(from_attributes=True)
