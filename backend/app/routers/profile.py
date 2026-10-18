from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CandidateProfile, User
from app.schemas import CandidateProfileResponse, CandidateProfileUpdate
from app.services.auth import get_current_user_optional
from app.services.matcher import deduplicate_skills

router = APIRouter(prefix="/profile", tags=["profile"])


def get_or_create_profile(
    db: Session,
    user_id: int | None = None,
) -> CandidateProfile:
    stmt = (
        select(CandidateProfile).where(CandidateProfile.user_id.is_(None))
        if user_id is None
        else select(CandidateProfile).where(CandidateProfile.user_id == user_id)
    )
    profile = db.scalars(stmt.limit(1)).first()
    if profile is None:
        profile = CandidateProfile(
            user_id=user_id,
            full_name="",
            headline="",
            skills=[],
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("", response_model=CandidateProfileResponse)
def read_profile(
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    return get_or_create_profile(db, user_id=user_id)


@router.put("", response_model=CandidateProfileResponse)
def update_profile(
    payload: CandidateProfileUpdate,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    profile = get_or_create_profile(db, user_id=user_id)
    profile.full_name = payload.full_name.strip()
    profile.headline = payload.headline.strip()
    profile.skills = deduplicate_skills(payload.skills)

    db.commit()
    db.refresh(profile)
    return profile
