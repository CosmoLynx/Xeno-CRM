"""Pydantic schemas for order request/response validation."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.customer import CustomerResponse


class OrderBase(BaseModel):
    """Shared order fields for create and response payloads."""

    customer_id: UUID
    order_amount: Decimal
    product_name: Optional[str] = None
    category: Optional[str] = None
    status: str = "completed"


class OrderCreate(OrderBase):
    """Payload for creating a new order."""


class OrderResponse(OrderBase):
    """Order record returned from the API."""

    id: UUID
    ordered_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerWithOrders(CustomerResponse):
    """Customer record with nested order history."""

    orders: list[OrderResponse] = []
