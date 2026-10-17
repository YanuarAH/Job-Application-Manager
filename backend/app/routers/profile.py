from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CandidateProfile
from app.schemas import CandidateProfileResponse, CandidateProfileUpdate
from app.services.matcher import deduplicate_skills

router = APIRouter(prefix="/profile", tags=["profile"])


def get_or_create_profile(db: Session) -> CandidateProfile:
    profile = db.scalars(select(CandidateProfile).limit(1)).first()
    if profile is None:
        profile = CandidateProfile(
            full_name="",
            headline="",
            skills=[],
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("", response_model=CandidateProfileResponse)
def read_profile(db: Session = Depends(get_db)):
    return get_or_create_profile(db)


@router.put("", response_model=CandidateProfileResponse)
def update_profile(
    payload: CandidateProfileUpdate,
    db: Session = Depends(get_db),
):
    profile = get_or_create_profile(db)
    profile.full_name = payload.full_name.strip()
    profile.headline = payload.headline.strip()
    profile.skills = deduplicate_skills(payload.skills)

    db.commit()
    db.refresh(profile)
    return profile
