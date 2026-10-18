from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job
from app.routers.profile import get_or_create_profile
from app.schemas import CareerChatRequest, CareerChatResponse
from app.services.assistant import generate_global_career_chat

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/chat", response_model=CareerChatResponse)
def career_assistant_chat(
    payload: CareerChatRequest,
    db: Session = Depends(get_db),
):
    profile = get_or_create_profile(db)
    jobs = list(db.scalars(select(Job).order_by(Job.id.desc())).all())

    reply, source = generate_global_career_chat(
        profile=profile,
        jobs=jobs,
        message=payload.message,
        history=payload.history,
    )
    return CareerChatResponse(reply=reply, source=source)
