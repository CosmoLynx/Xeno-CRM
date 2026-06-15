"""Pydantic schemas for campaign request/response validation."""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.segment import SegmentResponse

CampaignChannel = Literal["whatsapp", "sms", "email", "rcs"]


class CampaignCreate(BaseModel):
    """Payload for creating a new outbound campaign."""

    name: str
    segment_id: UUID
    channel: CampaignChannel
    message_template: str


class CampaignResponse(BaseModel):
    """Campaign record returned from the API."""

    id: UUID
    name: str
    segment_id: Optional[UUID] = None
    channel: str
    message_template: str
    status: str
    total_sent: int
    total_delivered: int
    total_opened: int
    total_clicked: int
    total_failed: int
    sent_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignWithSegment(CampaignResponse):
    """Campaign record with nested segment details."""

    segment: Optional[SegmentResponse] = None
