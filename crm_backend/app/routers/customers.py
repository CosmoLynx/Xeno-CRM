"""Customer CRUD endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.customer import Customer
from app.schemas.customer import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
)
from app.schemas.order import CustomerWithOrders

router = APIRouter(prefix="/api/customers", tags=["customers"])


def _apply_customer_filters(query, *, search: str | None, city: str | None):
    """Apply optional search and city filters to a customer query."""
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Customer.name.ilike(pattern),
                Customer.email.ilike(pattern),
            )
        )
    if city:
        query = query.where(Customer.city.ilike(city))
    return query


@router.get("", response_model=CustomerListResponse)
async def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    city: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List customers with pagination, optional search, and city filter."""
    try:
        base_query = select(Customer)
        base_query = _apply_customer_filters(base_query, search=search, city=city)

        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        offset = (page - 1) * page_size
        result = await db.execute(
            base_query.order_by(Customer.created_at.desc()).offset(offset).limit(page_size)
        )
        customers = result.scalars().all()

        return CustomerListResponse(
            customers=[CustomerResponse.model_validate(c) for c in customers],
            total=total,
            page=page,
            page_size=page_size,
        )
    except Exception:
        await db.rollback()
        raise


@router.get("/{customer_id}", response_model=CustomerWithOrders)
async def get_customer(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single customer with their order history."""
    try:
        result = await db.execute(
            select(Customer)
            .options(selectinload(Customer.orders))
            .where(Customer.id == customer_id)
        )
        customer = result.scalar_one_or_none()
        if customer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer {customer_id} not found",
            )

        # Sort orders newest-first for a consistent API response.
        customer.orders.sort(key=lambda o: o.ordered_at, reverse=True)
        return CustomerWithOrders.model_validate(customer)
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        raise


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CustomerCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new customer. Email must be unique."""
    try:
        existing = await db.execute(
            select(Customer).where(Customer.email == payload.email)
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Customer with email '{payload.email}' already exists",
            )

        customer = Customer(**payload.model_dump())
        db.add(customer)
        await db.commit()
        await db.refresh(customer)
        return CustomerResponse.model_validate(customer)
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Customer with email '{payload.email}' already exists",
        )
    except Exception:
        await db.rollback()
        raise


@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Partially update a customer. Only provided fields are changed."""
    try:
        result = await db.execute(select(Customer).where(Customer.id == customer_id))
        customer = result.scalar_one_or_none()
        if customer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer {customer_id} not found",
            )

        updates = payload.model_dump(exclude_unset=True)
        if not updates:
            return CustomerResponse.model_validate(customer)

        if "email" in updates and updates["email"] != customer.email:
            existing = await db.execute(
                select(Customer).where(Customer.email == updates["email"])
            )
            if existing.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Customer with email '{updates['email']}' already exists",
                )

        for field, value in updates.items():
            setattr(customer, field, value)

        await db.commit()
        await db.refresh(customer)
        return CustomerResponse.model_validate(customer)
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already in use by another customer",
        )
    except Exception:
        await db.rollback()
        raise
