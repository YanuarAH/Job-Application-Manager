from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChatMessage, Job, User
from app.routers.profile import get_or_create_profile
from app.schemas import (
    CareerChatMessage,
    CareerChatRequest,
    CareerChatResponse,
)
from app.services.assistant import generate_global_career_chat
from app.services.auth import get_current_user_optional

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.get("/history", response_model=list[CareerChatMessage])
def get_chat_history(
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    stmt = (
        select(ChatMessage).where(ChatMessage.user_id.is_(None))
        if user_id is None
        else select(ChatMessage).where(ChatMessage.user_id == user_id)
    ).order_by(ChatMessage.id.asc())
    messages = db.scalars(stmt).all()
    return [
        CareerChatMessage(
            role="assistant" if m.role == "assistant" else "user",
            content=m.content,
            source=m.source,
        )
        for m in messages
    ]


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
def clear_chat_history(
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    stmt = (
        delete(ChatMessage).where(ChatMessage.user_id.is_(None))
        if user_id is None
        else delete(ChatMessage).where(ChatMessage.user_id == user_id)
    )
    db.execute(stmt)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/chat", response_model=CareerChatResponse)
def career_assistant_chat(
    payload: CareerChatRequest,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    profile = get_or_create_profile(db, user_id=user_id)
    job_stmt = (
        select(Job).where(Job.user_id.is_(None))
        if user_id is None
        else select(Job).where(Job.user_id == user_id)
    ).order_by(Job.id.desc())
    jobs = list(db.scalars(job_stmt).all())

    reply, source = generate_global_career_chat(
        profile=profile,
        jobs=jobs,
        message=payload.message,
        history=payload.history,
    )

    user_msg = ChatMessage(
        user_id=user_id,
        role="user",
        content=payload.message.strip(),
        source=None,
    )
    assistant_msg = ChatMessage(
        user_id=user_id,
        role="assistant",
        content=reply,
        source=source,
    )
    db.add(user_msg)
    db.add(assistant_msg)
    db.commit()

    return CareerChatResponse(reply=reply, source=source)
