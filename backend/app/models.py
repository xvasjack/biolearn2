"""SQLAlchemy models."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Boolean, String, ForeignKey, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Subscription fields
    subscription_tier: Mapped[str] = mapped_column(String, default="free", nullable=False)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    subscription_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    subscription_plan: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    group_owner_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    expiry_notified_7d: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expiry_notified_1d: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    progress: Mapped[list["UserProgress"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    @property
    def is_pro(self) -> bool:
        if self.subscription_tier != "pro":
            return False
        if self.subscription_expires_at is None:
            return False
        return self.subscription_expires_at > datetime.now(timezone.utc)


class UserProgress(Base):
    __tablename__ = "user_progress"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    narrative_id: Mapped[str] = mapped_column(String, nullable=False)
    current_step: Mapped[int] = mapped_column(default=0)
    completed_steps: Mapped[list] = mapped_column(JSON, default=list)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_activity: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship(back_populates="progress")
