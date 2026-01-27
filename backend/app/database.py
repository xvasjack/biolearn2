"""Database session setup using async SQLAlchemy."""
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./biolearn.db",
)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    """Dependency that yields an async DB session."""
    async with async_session() as session:
        yield session


async def init_db():
    """Create all tables."""
    async with engine.begin() as conn:
        from app.models import User, UserProgress  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)


async def seed_admin_account():
    """Ensure the admin account exists."""
    from sqlalchemy import select
    from app.models import User
    from app.auth import hash_password

    async with async_session() as session:
        result = await session.execute(select(User).where(User.username == "kreatbio"))
        if result.scalar_one_or_none() is None:
            session.add(User(
                email="adriana.kreatbio@gmail.com",
                username="kreatbio",
                password_hash=hash_password("@Drigoh9798"),
            ))
            await session.commit()
