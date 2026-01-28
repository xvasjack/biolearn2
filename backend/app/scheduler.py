"""Background scheduler for periodic tasks like expiry notifications."""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, and_

from app.database import async_session
from app.models import User
from app.email import send_expiry_warning

logger = logging.getLogger(__name__)

CHECK_INTERVAL_SECONDS = 3600  # Run every hour


async def check_expiry_notifications():
    """Check for users whose subscriptions are expiring soon and send notifications."""
    now = datetime.now(timezone.utc)

    async with async_session() as db:
        # 7-day warning: expires between now and now+7d, not yet notified
        seven_days = now + timedelta(days=7)
        result = await db.execute(
            select(User).where(
                and_(
                    User.subscription_tier == "pro",
                    User.subscription_expires_at != None,  # noqa: E711
                    User.subscription_expires_at <= seven_days,
                    User.subscription_expires_at > now,
                    User.expiry_notified_7d == False,  # noqa: E712
                )
            )
        )
        users_7d = result.scalars().all()
        for user in users_7d:
            days_left = (user.subscription_expires_at - now).days
            if days_left <= 7:
                expiry_str = user.subscription_expires_at.strftime("%B %d, %Y")
                send_expiry_warning(user.email, user.username, max(days_left, 1), expiry_str)
                user.expiry_notified_7d = True
                logger.info("Sent 7-day expiry warning to %s", user.email)

        # 1-day warning: expires between now and now+1d, not yet notified
        one_day = now + timedelta(days=1)
        result = await db.execute(
            select(User).where(
                and_(
                    User.subscription_tier == "pro",
                    User.subscription_expires_at != None,  # noqa: E711
                    User.subscription_expires_at <= one_day,
                    User.subscription_expires_at > now,
                    User.expiry_notified_1d == False,  # noqa: E712
                )
            )
        )
        users_1d = result.scalars().all()
        for user in users_1d:
            expiry_str = user.subscription_expires_at.strftime("%B %d, %Y at %H:%M UTC")
            send_expiry_warning(user.email, user.username, 1, expiry_str)
            user.expiry_notified_1d = True
            logger.info("Sent 1-day expiry warning to %s", user.email)

        await db.commit()


async def scheduler_loop():
    """Run periodic checks in the background."""
    logger.info("Expiry notification scheduler started (interval: %ds)", CHECK_INTERVAL_SECONDS)
    while True:
        try:
            await check_expiry_notifications()
        except Exception as e:
            logger.error("Scheduler error: %s", e)
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
