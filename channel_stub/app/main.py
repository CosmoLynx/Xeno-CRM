"""FastAPI entry point for the Xeno Channel Stub delivery simulator."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import send

app = FastAPI(
    title="Xeno Channel Stub",
    description="Simulates WhatsApp/SMS/Email/RCS delivery for testing",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(send.router)


@app.get("/health")
async def health_check():
    """Liveness probe for local dev and container orchestration."""
    return {"status": "ok", "service": "xeno-channel-stub"}


@app.get("/")
async def root():
    """Describe what this stub service does."""
    return {
        "service": "Xeno Channel Stub",
        "description": (
            "Simulates WhatsApp, SMS, Email, and RCS message delivery "
            "without connecting to any real provider."
        ),
        "note": (
            "This is a stub/simulator for development and testing only — "
            "not a production messaging provider."
        ),
        "endpoints": {
            "send": "POST /send — accept a message and simulate delivery callbacks",
            "health": "GET /health — service liveness check",
            "docs": "GET /docs — interactive API documentation",
        },
    }
