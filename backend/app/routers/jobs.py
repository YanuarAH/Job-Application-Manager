from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job
from app.routers.profile import get_or_create_profile
from app.schemas import JobCreate, JobResponse, JobUpdate, SkillMatchResult
from app.services.analyzer import analyze_job_description
from app.services.matcher import calculate_skill_match

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_job(
    payload: JobCreate,
    db: Session = Depends(get_db),
):
    job = Job(**payload.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("", response_model=list[JobResponse])
def list_jobs(db: Session = Depends(get_db)):
    statement = select(Job).order_by(Job.id.desc())
    return db.scalars(statement).all()


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    return job


@router.patch("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    payload: JobUpdate,
    db: Session = Depends(get_db),
):
    job = db.get(Job, job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    updates = payload.model_dump(exclude_unset=True, exclude_none=True)

    for field, value in updates.items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/analyze", response_model=JobResponse)
def analyze_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

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
def match_job_skills(job_id: int, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    if job.required_skills is None and job.preferred_skills is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job belum dianalisis. Jalankan analisis AI terlebih dahulu.",
        )

    profile = get_or_create_profile(db)
    return calculate_skill_match(
        job_id=job.id,
        candidate_skills=profile.skills or [],
        required_skills=job.required_skills,
        preferred_skills=job.preferred_skills,
    )


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    db.delete(job)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
