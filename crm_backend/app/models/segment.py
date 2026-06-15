"""Segment ORM model — audience definitions with JSON filter conditions."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import DateTime, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.campaign import Campaign


class Segment(Base):
    """A named audience segment defined by a set of filter rules."""

    __tablename__ = "segments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    conditions: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    customer_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default=text("0"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    campaigns: Mapped[list[Campaign]] = relationship(
        "Campaign",
        back_populates="segment",
    )

    def __repr__(self) -> str:
        return f"<Segment id={self.id} name={self.name!r}>"
