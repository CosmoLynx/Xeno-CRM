"""Pydantic schema registry for API request/response models."""

from app.schemas.ai import (
    AIMessageRequest,
    AIMessageResponse,
    AISegmentRequest,
    AISegmentResponse,
    CampaignSuggestion,
    CampaignSuggestionRequest,
    CampaignSuggestionsResponse,
    ChannelPerformance,
)
from app.schemas.campaign import CampaignCreate, CampaignResponse, CampaignWithSegment
from app.schemas.customer import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
)
from app.schemas.message import MessageEventResponse, MessageResponse, WebhookReceiptPayload
from app.schemas.order import CustomerWithOrders, OrderCreate, OrderResponse
from app.schemas.segment import (
    SegmentConditions,
    SegmentCreate,
    SegmentPreviewRequest,
    SegmentPreviewResponse,
    SegmentResponse,
    SegmentRule,
    SegmentWithCustomers,
)

__all__ = [
    "AIMessageRequest",
    "AIMessageResponse",
    "AISegmentRequest",
    "AISegmentResponse",
    "CampaignSuggestion",
    "CampaignSuggestionRequest",
    "CampaignSuggestionsResponse",
    "ChannelPerformance",
    "CampaignCreate",
    "CampaignResponse",
    "CampaignWithSegment",
    "CustomerCreate",
    "CustomerListResponse",
    "CustomerResponse",
    "CustomerUpdate",
    "CustomerWithOrders",
    "MessageEventResponse",
    "MessageResponse",
    "OrderCreate",
    "OrderResponse",
    "SegmentConditions",
    "SegmentCreate",
    "SegmentPreviewRequest",
    "SegmentPreviewResponse",
    "SegmentResponse",
    "SegmentRule",
    "SegmentWithCustomers",
    "WebhookReceiptPayload",
]
