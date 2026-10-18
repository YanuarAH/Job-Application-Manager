from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CandidateProfile, User
from app.schemas import (
    AuthTokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
)
from app.services.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.services.seed_data import (
    DEFAULT_DEMO_SKILLS,
    ensure_demo_profile_and_jobs,
    seed_jobs_for_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])

DEMO_EMAIL = "demo@jobmanager.ai"


@router.post(
    "/register",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    payload: UserRegister,
    db: Session = Depends(get_db),
):
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format email tidak valid.",
        )

    existing = db.scalars(select(User).where(User.email == email)).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email tersebut sudah terdaftar. Silakan login.",
        )

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        is_demo=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = CandidateProfile(
        user_id=user.id,
        full_name=user.full_name,
        headline="Software & AI Engineer",
        skills=list(DEFAULT_DEMO_SKILLS) if payload.seed_sample_jobs else [],
    )
    db.add(profile)
    db.commit()

    if payload.seed_sample_jobs:
        seed_jobs_for_user(db, user_id=user.id)

    token = create_access_token(user.id, user.email)
    return AuthTokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=AuthTokenResponse)
def login_user(
    payload: UserLogin,
    db: Session = Depends(get_db),
):
    email = payload.email.strip().lower()
    user = db.scalars(select(User).where(User.email == email)).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah.",
        )

    token = create_access_token(user.id, user.email)
    return AuthTokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/demo", response_model=AuthTokenResponse)
def login_demo_account(db: Session = Depends(get_db)):
    """
    Login instan 1-klik ke Akun Demo (untuk Recruiter / pengunjung portofolio).
    Otomatis memastikan profil dan 6 contoh lowongan tersedia.
    """
    user = db.scalars(select(User).where(User.email == DEMO_EMAIL)).first()
    if user is None:
        user = User(
            email=DEMO_EMAIL,
            full_name="Yanuar (Demo Portfolio)",
            password_hash=hash_password("demo-portfolio-password"),
            is_demo=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    ensure_demo_profile_and_jobs(
        db,
        user_id=user.id,
        full_name="Yanuar",
        reset=False,
    )

    token = create_access_token(user.id, user.email)
    return AuthTokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/demo/reset", response_model=UserResponse)
def reset_user_sample_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mengembalikan 6 lowongan contoh dan skill awal untuk akun yang sedang aktif.
    """
    ensure_demo_profile_and_jobs(
        db,
        user_id=current_user.id,
        full_name=current_user.full_name.replace(" (Demo Portfolio)", ""),
        reset=True,
    )
    return UserResponse.model_validate(current_user)


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
