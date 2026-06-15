"""Customer ORM model — core shopper profile and spend aggregates."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Integer, Numeric, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.message import Message
    from app.models.order import Order


class Customer(Base):
    """A shopper in the CRM with contact info and purchase history aggregates."""

    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_spent: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("0"),
        server_default=text("0"),
    )
    order_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default=text("0"),
    )
    last_order_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    orders: Mapped[list[Order]] = relationship(
        "Order",
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    messages: Mapped[list[Message]] = relationship(
        "Message",
        back_populates="customer",
    )

    def __repr__(self) -> str:
        return f"<Customer id={self.id} name={self.name!r}>"
