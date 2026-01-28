"""
BioLearn - Bioinformatics Learning Platform API
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os

from app.api import router as api_router
from app.websocket import ConnectionManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# WebSocket connection manager
manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management."""
    from app.database import init_db, seed_admin_account
    logger.info("Starting BioLearn API server...")
    await init_db()
    logger.info("Database tables created.")
    await seed_admin_account()
    logger.info("Admin account seeded.")
    yield
    logger.info("Shutting down BioLearn API server...")


app = FastAPI(
    title="BioLearn API",
    description="Backend API for the BioLearn bioinformatics learning platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()
    ] or ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "BioLearn API",
        "version": "0.1.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.websocket("/ws/terminal/{session_id}")
async def websocket_terminal(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for terminal sessions.
    Handles bidirectional communication between frontend terminal and backend.
    """
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Process command and send response
            await manager.process_command(session_id, data)
    except WebSocketDisconnect:
        manager.disconnect(session_id)
        logger.info(f"Terminal session {session_id} disconnected")
