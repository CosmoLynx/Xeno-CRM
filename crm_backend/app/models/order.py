"""Order ORM model — individual purchase records linked to a customer."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.customer import Customer


class Order(Base):
    """A single order placed by a customer."""

    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
    )
    order_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    product_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(
        String(50),
        default="completed",
        server_default=text("'completed'"),
    )
    ordered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    customer: Mapped[Customer] = relationship("Customer", back_populates="orders")

    def __repr__(self) -> str:
        return f"<Order id={self.id} customer_id={self.customer_id} amount={self.order_amount}>"
