"""FastAPI application entry point for the Xeno CRM backend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import ai, campaigns, customers, orders, segments, webhook


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup and shutdown hooks for the application."""
    await init_db()
    yield


app = FastAPI(
    title="Xeno CRM API",
    description="AI-native Mini CRM for reaching shoppers",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router)
app.include_router(orders.router)

app.include_router(segments.router)

app.include_router(campaigns.router)
app.include_router(webhook.router)
app.include_router(ai.router)


@app.get("/health")
async def health_check():
    """Lightweight liveness probe for load balancers and local dev."""
    return {"status": "ok", "service": "xeno-crm"}
