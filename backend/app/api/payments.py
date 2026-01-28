"""Stripe payment and subscription endpoints."""
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated

import stripe
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, hash_password
from app.database import get_db
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

PRICE_IDS = {
    "day": os.getenv("STRIPE_PRICE_ID_DAY", ""),
    "monthly": os.getenv("STRIPE_PRICE_ID_MONTHLY", ""),
    "group_monthly": os.getenv("STRIPE_PRICE_ID_GROUP", ""),
}

PLAN_DURATIONS = {
    "day": timedelta(hours=24),
    "monthly": timedelta(days=30),
    "group_monthly": timedelta(days=30),
}


# ---------- Schemas ----------

class CreateCheckoutRequest(BaseModel):
    plan: str  # "day", "monthly", "group_monthly"
    group_emails: list[EmailStr] = []  # only for group_monthly


class SubscriptionStatusResponse(BaseModel):
    subscription_tier: str
    subscription_plan: str | None
    subscription_expires_at: str | None
    is_pro: bool


class GroupMembersRequest(BaseModel):
    emails: list[EmailStr]


class GroupMemberResponse(BaseModel):
    email: str
    username: str
    subscription_tier: str


# ---------- Endpoints ----------

@router.post("/create-checkout")
async def create_checkout_session(
    body: CreateCheckoutRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a Stripe Checkout Session and return the URL."""
    if body.plan not in PRICE_IDS:
        raise HTTPException(status_code=400, detail="Invalid plan. Choose: day, monthly, group_monthly")

    price_id = PRICE_IDS[body.plan]
    if not price_id:
        raise HTTPException(status_code=500, detail="Stripe price not configured for this plan")

    if body.plan == "group_monthly" and (not body.group_emails or len(body.group_emails) > 10):
        raise HTTPException(status_code=400, detail="Group plan requires 1-10 email addresses")

    # Create or reuse Stripe customer
    if not user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=user.email,
            metadata={"user_id": user.id},
        )
        user.stripe_customer_id = customer.id
        await db.commit()

    metadata = {
        "user_id": user.id,
        "plan": body.plan,
    }
    if body.plan == "group_monthly":
        metadata["group_emails"] = ",".join(body.group_emails)

    session = stripe.checkout.Session.create(
        customer=user.stripe_customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="payment",
        currency="myr",
        success_url=f"{FRONTEND_URL}/?payment=success",
        cancel_url=f"{FRONTEND_URL}/?payment=cancelled",
        metadata=metadata,
    )

    return {"checkout_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook error")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        await _handle_checkout_completed(session, db)

    return {"status": "ok"}


async def _handle_checkout_completed(session: dict, db: AsyncSession):
    """Process a completed checkout session."""
    metadata = session.get("metadata", {})
    user_id = metadata.get("user_id")
    plan = metadata.get("plan")

    if not user_id or not plan:
        logger.warning("Webhook missing user_id or plan in metadata")
        return

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        logger.warning(f"Webhook: user {user_id} not found")
        return

    duration = PLAN_DURATIONS.get(plan, timedelta(days=30))
    expires_at = datetime.now(timezone.utc) + duration

    # Upgrade the purchasing user
    user.subscription_tier = "pro"
    user.subscription_plan = plan
    user.subscription_expires_at = expires_at

    # Handle group plan: upgrade group member accounts
    if plan == "group_monthly":
        group_emails_str = metadata.get("group_emails", "")
        if group_emails_str:
            emails = [e.strip() for e in group_emails_str.split(",") if e.strip()]
            for email in emails[:10]:
                await _upgrade_or_create_group_member(email, user.id, expires_at, db)

    await db.commit()
    logger.info(f"User {user_id} upgraded to pro ({plan}), expires {expires_at}")


async def _upgrade_or_create_group_member(
    email: str, owner_id: str, expires_at: datetime, db: AsyncSession
):
    """Upgrade an existing user or create a placeholder account for a group member."""
    result = await db.execute(select(User).where(User.email == email))
    member = result.scalar_one_or_none()

    if member:
        member.subscription_tier = "pro"
        member.subscription_plan = "group_monthly"
        member.subscription_expires_at = expires_at
        member.group_owner_id = owner_id
    else:
        # Create account with a random password (user must reset)
        import secrets
        member = User(
            email=email,
            username=email.split("@")[0] + "_" + secrets.token_hex(3),
            password_hash=hash_password(secrets.token_hex(16)),
            subscription_tier="pro",
            subscription_plan="group_monthly",
            subscription_expires_at=expires_at,
            group_owner_id=owner_id,
        )
        db.add(member)


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(user: Annotated[User, Depends(get_current_user)]):
    """Get current user's subscription status."""
    return SubscriptionStatusResponse(
        subscription_tier=user.subscription_tier,
        subscription_plan=user.subscription_plan,
        subscription_expires_at=user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
        is_pro=user.is_pro,
    )


@router.post("/group/members", response_model=list[GroupMemberResponse])
async def manage_group_members(
    body: GroupMembersRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Add/update group member emails. Only for group plan owners."""
    if user.subscription_plan != "group_monthly" or not user.is_pro:
        raise HTTPException(status_code=403, detail="Only active group plan owners can manage members")

    if len(body.emails) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 group members")

    expires_at = user.subscription_expires_at
    if not expires_at:
        raise HTTPException(status_code=400, detail="No active subscription")

    members = []
    for email in body.emails:
        await _upgrade_or_create_group_member(email, user.id, expires_at, db)

    await db.commit()

    # Return current group members
    result = await db.execute(select(User).where(User.group_owner_id == user.id))
    group_users = result.scalars().all()
    return [
        GroupMemberResponse(
            email=u.email,
            username=u.username,
            subscription_tier=u.subscription_tier,
        )
        for u in group_users
    ]
