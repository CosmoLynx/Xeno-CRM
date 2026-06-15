"""Pydantic schemas for AI-powered segment and message generation."""

import uuid
from typing import Literal, Optional

from pydantic import BaseModel, field_validator

from app.schemas.segment import SegmentConditions

ALLOWED_CHANNELS = frozenset({"whatsapp", "sms", "email", "rcs"})
ALLOWED_TONES = frozenset({"friendly", "professional", "urgent", "playful"})


class AISegmentRequest(BaseModel):
    """Natural language description to convert into segment filter rules."""

    description: str


class AISegmentResponse(BaseModel):
    """AI-generated segment conditions with a human-readable explanation."""

    conditions: SegmentConditions
    explanation: str


class AIMessageRequest(BaseModel):
    """Inputs for AI campaign message copy generation."""

    goal: str
    segment_description: Optional[str] = None
    channel: str
    tone: Optional[str] = "friendly"

    @field_validator("channel")
    @classmethod
    def validate_channel(cls, value: str) -> str:
        if value not in ALLOWED_CHANNELS:
            allowed = ", ".join(sorted(ALLOWED_CHANNELS))
            raise ValueError(f"Invalid channel '{value}'. Allowed channels: {allowed}")
        return value


class AIMessageResponse(BaseModel):
    """AI-generated campaign message template with placeholder tokens."""

    message: str
    character_count: int


class CampaignSuggestionRequest(BaseModel):
    """Request AI-generated campaign strategies for a segment."""

    segment_id: uuid.UUID


class CampaignSuggestion(BaseModel):
    """A single data-informed campaign strategy recommendation."""

    title: str
    goal: str
    channel: str
    tone: str
    reasoning: str


class ChannelPerformance(BaseModel):
    """Aggregated delivery metrics for a channel across past sent campaigns."""

    channel: str
    campaigns_analyzed: int
    avg_delivery_rate: float
    avg_open_rate: float
    avg_click_rate: float


class CampaignSuggestionsResponse(BaseModel):
    """AI campaign strategy suggestions grounded in segment and historical data."""

    segment_name: str
    segment_summary: str
    historical_performance: list[ChannelPerformance]
    suggestions: list[CampaignSuggestion]
