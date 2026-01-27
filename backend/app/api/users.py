"""User management endpoints."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid

router = APIRouter()


class UserCreate(BaseModel):
    """User registration request."""
    email: EmailStr
    username: str
    password: str


class UserResponse(BaseModel):
    """User response (without password)."""
    id: str
    email: str
    username: str
    progress: dict


class UserProgress(BaseModel):
    """User's learning progress."""
    narrative_id: str
    current_step: int
    completed_steps: list[int]
    started_at: str
    last_activity: str


# Placeholder user storage (will use PostgreSQL)
USERS: dict[str, dict] = {}


@router.post("/register")
async def register_user(user: UserCreate) -> UserResponse:
    """Register a new user."""
    # Check if email already exists
    for existing_user in USERS.values():
        if existing_user["email"] == user.email:
            raise HTTPException(status_code=400, detail="Email already registered")
        if existing_user["username"] == user.username:
            raise HTTPException(status_code=400, detail="Username already taken")

    user_id = str(uuid.uuid4())
    USERS[user_id] = {
        "id": user_id,
        "email": user.email,
        "username": user.username,
        "password_hash": user.password,  # TODO: Hash password properly
        "progress": {},
    }

    return UserResponse(
        id=user_id,
        email=user.email,
        username=user.username,
        progress={},
    )


@router.get("/{user_id}")
async def get_user(user_id: str) -> UserResponse:
    """Get user information."""
    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")

    user = USERS[user_id]
    return UserResponse(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        progress=user["progress"],
    )


@router.get("/{user_id}/progress")
async def get_user_progress(user_id: str) -> dict:
    """Get user's learning progress."""
    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")

    return USERS[user_id]["progress"]


@router.put("/{user_id}/progress/{narrative_id}")
async def update_progress(
    user_id: str,
    narrative_id: str,
    step: int,
) -> dict:
    """Update user's progress on a narrative."""
    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")

    if narrative_id not in USERS[user_id]["progress"]:
        USERS[user_id]["progress"][narrative_id] = {
            "current_step": step,
            "completed_steps": list(range(1, step)),
        }
    else:
        USERS[user_id]["progress"][narrative_id]["current_step"] = step
        if step - 1 not in USERS[user_id]["progress"][narrative_id]["completed_steps"]:
            USERS[user_id]["progress"][narrative_id]["completed_steps"].append(step - 1)

    return USERS[user_id]["progress"][narrative_id]
