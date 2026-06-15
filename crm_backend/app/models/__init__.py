"""ORM model registry — import all models so SQLAlchemy registers table metadata."""

from app.models.campaign import Campaign
from app.models.customer import Customer
from app.models.message import Message, MessageEvent
from app.models.order import Order
from app.models.segment import Segment

__all__ = [
    "Campaign",
    "Customer",
    "Message",
    "MessageEvent",
    "Order",
    "Segment",
]
