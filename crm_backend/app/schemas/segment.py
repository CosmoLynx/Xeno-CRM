"""Pydantic schemas for segment request/response validation."""

from datetime import datetime
from typing import Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.customer import CustomerResponse

ALLOWED_FIELDS = frozenset(
    {
        "total_spent",
        "order_count",
        "last_order_date",
        "city",
        "gender",
        "age",
        "created_at",
    }
)

ALLOWED_OPERATORS = frozenset(
    {
        "gt",
        "lt",
        "eq",
        "gte",
        "lte",
        "days_ago_gt",
        "days_ago_lt",
    }
)


class SegmentRule(BaseModel):
    """A single filter rule within a segment definition."""

    field: str
    operator: str
    value: Union[str, int, float]

    @field_validator("field")
    @classmethod
    def validate_field(cls, value: str) -> str:
        if value not in ALLOWED_FIELDS:
            allowed = ", ".join(sorted(ALLOWED_FIELDS))
            raise ValueError(f"Invalid field '{value}'. Allowed fields: {allowed}")
        return value

    @field_validator("operator")
    @classmethod
    def validate_operator(cls, value: str) -> str:
        if value not in ALLOWED_OPERATORS:
            allowed = ", ".join(sorted(ALLOWED_OPERATORS))
            raise ValueError(f"Invalid operator '{value}'. Allowed operators: {allowed}")
        return value


class SegmentConditions(BaseModel):
    """Grouped filter rules with AND/OR logic."""

    operator: Literal["AND", "OR"] = "AND"
    rules: list[SegmentRule] = Field(min_length=1)


class SegmentCreate(BaseModel):
    """Payload for creating a new audience segment."""

    name: str
    description: Optional[str] = None
    conditions: SegmentConditions


class SegmentResponse(BaseModel):
    """Segment record returned from the API."""

    id: UUID
    name: str
    description: Optional[str] = None
    conditions: dict
    customer_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SegmentWithCustomers(SegmentResponse):
    """Segment record with a sample of matching customers."""

    customers: list[CustomerResponse] = []


class SegmentPreviewRequest(BaseModel):
    """Payload to preview segment matches without persisting a segment."""

    conditions: SegmentConditions


class SegmentPreviewResponse(BaseModel):
    """Preview result showing how many customers match given conditions."""

    matching_count: int
    customers: list[CustomerResponse]
