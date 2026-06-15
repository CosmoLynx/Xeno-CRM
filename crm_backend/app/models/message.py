"""Message and MessageEvent ORM models — delivery records and status timeline."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.campaign import Campaign
    from app.models.customer import Customer


class Message(Base):
    """An individual outbound message sent to a customer as part of a campaign."""

    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id"),
        nullable=False,
    )
    channel: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        default="sent",
        server_default=text("'sent'"),
    )
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    campaign: Mapped[Campaign] = relationship("Campaign", back_populates="messages")
    customer: Mapped[Customer] = relationship("Customer", back_populates="messages")
    events: Mapped[list[MessageEvent]] = relationship(
        "MessageEvent",
        back_populates="message",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Message id={self.id} campaign_id={self.campaign_id} status={self.status!r}>"


class MessageEvent(Base):
    """A single status transition event in a message delivery lifecycle."""

    __tablename__ = "message_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    message: Mapped[Message] = relationship("Message", back_populates="events")

    def __repr__(self) -> str:
        return f"<MessageEvent id={self.id} message_id={self.message_id} status={self.status!r}>"
