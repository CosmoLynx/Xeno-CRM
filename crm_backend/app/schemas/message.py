"""Pydantic schemas for message and webhook payload validation."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MessageResponse(BaseModel):
    """Outbound message record returned from the API."""

    id: UUID
    campaign_id: UUID
    customer_id: UUID
    channel: str
    content: str
    status: str
    sent_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageEventResponse(BaseModel):
    """Delivery lifecycle event for a message."""

    id: UUID
    message_id: UUID
    status: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class WebhookReceiptPayload(BaseModel):
    """Inbound delivery receipt from the channel stub webhook."""

    messageId: str
    status: str
    timestamp: datetime
