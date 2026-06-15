"""Order creation and listing endpoints."""

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.customer import Customer
from app.models.order import Order
from app.schemas.order import OrderCreate, OrderResponse

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create an order and update the customer's spend aggregates in one transaction."""
    try:
        result = await db.execute(
            select(Customer).where(Customer.id == payload.customer_id)
        )
        customer = result.scalar_one_or_none()
        if customer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer {payload.customer_id} not found",
            )

        order = Order(**payload.model_dump())
        db.add(order)
        await db.flush()

        customer.total_spent = (customer.total_spent or Decimal("0")) + order.order_amount
        customer.order_count = (customer.order_count or 0) + 1
        customer.last_order_date = order.ordered_at

        await db.commit()
        await db.refresh(order)
        return OrderResponse.model_validate(order)
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise


@router.get("", response_model=list[OrderResponse])
async def list_orders(
    customer_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List orders, optionally filtered by customer."""
    try:
        query = select(Order).order_by(Order.ordered_at.desc())
        if customer_id is not None:
            query = query.where(Order.customer_id == customer_id)

        result = await db.execute(query)
        orders = result.scalars().all()
        return [OrderResponse.model_validate(o) for o in orders]
    except Exception:
        await db.rollback()
        raise
