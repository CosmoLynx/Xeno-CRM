"""Pydantic schemas for customer request/response validation."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class CustomerBase(BaseModel):
    """Shared customer fields for create and response payloads."""

    name: str
    email: EmailStr
    phone: Optional[str] = None
    city: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None


class CustomerCreate(CustomerBase):
    """Payload for creating a new customer."""


class CustomerUpdate(BaseModel):
    """Payload for partial customer updates (PATCH)."""

    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None


class CustomerResponse(CustomerBase):
    """Customer record returned from the API."""

    id: UUID
    total_spent: Decimal
    order_count: int
    last_order_date: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerListResponse(BaseModel):
    """Paginated list of customers."""

    customers: list[CustomerResponse]
    total: int
    page: int
    page_size: int
