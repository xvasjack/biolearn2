"""API routes for BioLearn."""
from fastapi import APIRouter

from app.api import analysis, narratives, payments, templates, users

router = APIRouter()

router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
router.include_router(narratives.router, prefix="/narratives", tags=["narratives"])
router.include_router(payments.router, prefix="/payments", tags=["payments"])
router.include_router(templates.router, prefix="/templates", tags=["templates"])
router.include_router(users.router, prefix="/users", tags=["users", "auth"])
