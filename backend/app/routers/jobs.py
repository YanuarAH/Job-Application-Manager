from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job, User
from app.routers.profile import get_or_create_profile
from app.schemas import (
    ApplicationStatus,
    AssistantRequest,
    AssistantResponse,
    JobCreate,
    JobResponse,
    JobUpdate,
    SkillMatchResult,
)
from app.services.analyzer import analyze_job_description
from app.services.assistant import generate_career_advice
from app.services.auth import get_current_user_optional
from app.services.matcher import calculate_skill_match

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _get_user_job(
    db: Session,
    job_id: int,
    user_id: int | None,
) -> Job:
    stmt = select(Job).where(Job.id == job_id)
    if user_id is None:
        stmt = stmt.where(Job.user_id.is_(None))
    else:
        stmt = stmt.where(Job.user_id == user_id)

    job = db.scalars(stmt).first()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    return job


@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_job(
    payload: JobCreate,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    job = Job(user_id=user_id, **payload.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("", response_model=list[JobResponse])
def list_jobs(
    status_filter: ApplicationStatus | None = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    statement = (
        select(Job).where(Job.user_id.is_(None))
        if user_id is None
        else select(Job).where(Job.user_id == user_id)
    )
    if status_filter is not None:
        statement = statement.where(Job.application_status == status_filter)
    statement = statement.order_by(Job.id.desc())
    return db.scalars(statement).all()


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    return _get_user_job(db, job_id, user_id)


@router.patch("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    payload: JobUpdate,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    job = _get_user_job(db, job_id, user_id)

    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        if value is None and field != "notes":
            continue
        setattr(job, field, value)

    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/analyze", response_model=JobResponse)
def analyze_job(
    job_id: int,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    job = _get_user_job(db, job_id, user_id)

    result, source = analyze_job_description(
        job_title=job.job_title,
        company_name=job.company_name,
        job_description=job.job_description,
    )

    job.required_skills = result.required_skills
    job.preferred_skills = result.preferred_skills
    job.experience_level = result.experience_level
    job.summary = result.summary
    job.analysis_source = source

    db.commit()
    db.refresh(job)
    return job


@router.get("/{job_id}/match", response_model=SkillMatchResult)
def match_job_skills(
    job_id: int,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    job = _get_user_job(db, job_id, user_id)

    if job.required_skills is None and job.preferred_skills is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job belum dianalisis. Jalankan analisis AI terlebih dahulu.",
        )

    profile = get_or_create_profile(db, user_id=user_id)
    return calculate_skill_match(
        job_id=job.id,
        candidate_skills=profile.skills or [],
        required_skills=job.required_skills,
        preferred_skills=job.preferred_skills,
    )


@router.post("/{job_id}/assistant", response_model=AssistantResponse)
def ask_job_assistant(
    job_id: int,
    payload: AssistantRequest,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    job = _get_user_job(db, job_id, user_id)

    if job.required_skills is None and job.preferred_skills is None:
        result, source = analyze_job_description(
            job_title=job.job_title,
            company_name=job.company_name,
            job_description=job.job_description,
        )
        job.required_skills = result.required_skills
        job.preferred_skills = result.preferred_skills
        job.experience_level = result.experience_level
        job.summary = result.summary
        job.analysis_source = source
        db.commit()
        db.refresh(job)

    profile = get_or_create_profile(db, user_id=user_id)
    match = calculate_skill_match(
        job_id=job.id,
        candidate_skills=profile.skills or [],
        required_skills=job.required_skills,
        preferred_skills=job.preferred_skills,
    )

    answer, source = generate_career_advice(
        job=job,
        profile=profile,
        match=match,
        question=payload.question,
    )

    return AssistantResponse(
        job_id=job.id,
        question=payload.question.strip(),
        answer=answer,
        source=source,
    )


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    job = _get_user_job(db, job_id, user_id)

    db.delete(job)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
