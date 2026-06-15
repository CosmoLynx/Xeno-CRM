"""Campaign ORM model — outbound messaging campaigns targeting a segment."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.message import Message
    from app.models.segment import Segment


class Campaign(Base):
    """A multi-channel campaign sent to customers in a segment."""

    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    segment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("segments.id"),
        nullable=True,
    )
    channel: Mapped[str] = mapped_column(String(50), nullable=False)
    message_template: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        default="draft",
        server_default=text("'draft'"),
    )
    total_sent: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    total_delivered: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0")
    )
    total_opened: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    total_clicked: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0")
    )
    total_failed: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    segment: Mapped[Optional[Segment]] = relationship("Segment", back_populates="campaigns")
    messages: Mapped[list[Message]] = relationship(
        "Message",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Campaign id={self.id} name={self.name!r} status={self.status!r}>"
