"""User authentication and management endpoints."""
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_reset_token,
    decode_token,
    get_current_user,
)
from app.database import get_db
from app.email import FRONTEND_URL, send_password_reset
from app.models import User, UserProgress

router = APIRouter()


# ---------- Schemas ----------

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class LoginRequest(BaseModel):
    identifier: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    subscription_tier: str = "free"
    subscription_plan: str | None = None
    subscription_expires_at: str | None = None
    is_pro: bool = False


class AuthResponse(BaseModel):
    user: UserResponse
    tokens: TokenResponse


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ProgressResponse(BaseModel):
    narrative_id: str
    current_step: int
    completed_steps: list[int]
    started_at: str
    last_activity: str


class ProgressUpdate(BaseModel):
    current_step: int
    completed_steps: list[int] = []


# ---------- Endpoints ----------

@router.post("/register", response_model=AuthResponse)
async def register(body: UserCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    # Check uniqueness
    existing = await db.execute(select(User).where((User.email == body.email) | (User.username == body.username)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email or username already taken")

    user = User(
        email=body.email,
        username=body.username,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return AuthResponse(
        user=_user_response(user),
        tokens=TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        ),
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(User).where((User.email == body.identifier) | (User.username == body.identifier))
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email/username or password")

    return AuthResponse(
        user=_user_response(user),
        tokens=TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        ),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=401, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user:
        token = create_reset_token(user.email)
        reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
        send_password_reset(user.email, user.username, reset_url)
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    email = decode_reset_token(body.token)
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user.password_hash = hash_password(body.new_password)
    await db.commit()
    return {"message": "Password has been reset successfully."}


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        subscription_tier=user.subscription_tier,
        subscription_plan=user.subscription_plan,
        subscription_expires_at=user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
        is_pro=user.is_pro,
    )


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = hash_password(body.new_password)
    await db.commit()
    return {"message": "Password changed successfully."}


@router.get("/me", response_model=UserResponse)
async def get_me(user: Annotated[User, Depends(get_current_user)]):
    return _user_response(user)


@router.get("/me/progress", response_model=list[ProgressResponse])
async def get_progress(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(UserProgress).where(UserProgress.user_id == user.id)
    )
    rows = result.scalars().all()
    return [
        ProgressResponse(
            narrative_id=r.narrative_id,
            current_step=r.current_step,
            completed_steps=r.completed_steps,
            started_at=r.started_at.isoformat(),
            last_activity=r.last_activity.isoformat(),
        )
        for r in rows
    ]


@router.put("/me/progress/{narrative_id}", response_model=ProgressResponse)
async def update_progress(
    narrative_id: str,
    body: ProgressUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(UserProgress).where(
            UserProgress.user_id == user.id,
            UserProgress.narrative_id == narrative_id,
        )
    )
    progress = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if progress is None:
        progress = UserProgress(
            user_id=user.id,
            narrative_id=narrative_id,
            current_step=body.current_step,
            completed_steps=body.completed_steps,
            started_at=now,
            last_activity=now,
        )
        db.add(progress)
    else:
        progress.current_step = body.current_step
        progress.completed_steps = body.completed_steps
        progress.last_activity = now

    await db.commit()
    await db.refresh(progress)

    return ProgressResponse(
        narrative_id=progress.narrative_id,
        current_step=progress.current_step,
        completed_steps=progress.completed_steps,
        started_at=progress.started_at.isoformat(),
        last_activity=progress.last_activity.isoformat(),
    )
