
from pydantic import BaseModel, ConfigDict, Field


class JobCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=150)
    job_title: str = Field(min_length=1, max_length=150)
    job_description: str = Field(min_length=1)


class JobUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=1, max_length=150)
    job_title: str | None = Field(default=None, min_length=1, max_length=150)
    job_description: str | None = Field(default=None, min_length=1)


class JobResponse(BaseModel):
    id: int
    company_name: str
    job_title: str
    job_description: str

    model_config = ConfigDict(from_attributes=True)
