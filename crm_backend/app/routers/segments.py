"""Segment CRUD and preview endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.segment import Segment
from app.schemas.customer import CustomerResponse
from app.schemas.segment import (
    SegmentCreate,
    SegmentPreviewRequest,
    SegmentPreviewResponse,
    SegmentResponse,
    SegmentWithCustomers,
)
from app.services.segment_service import (
    count_matching_customers,
    get_matching_customers,
)

router = APIRouter(prefix="/api/segments", tags=["segments"])


def _conditions_to_dict(conditions) -> dict:
    """Serialize validated SegmentConditions to a plain dict for storage."""
    return conditions.model_dump()


@router.get("", response_model=list[SegmentResponse])
async def list_segments(db: AsyncSession = Depends(get_db)):
    """List all audience segments, newest first."""
    try:
        result = await db.execute(select(Segment).order_by(Segment.created_at.desc()))
        segments = result.scalars().all()
        return [SegmentResponse.model_validate(s) for s in segments]
    except Exception:
        await db.rollback()
        raise


@router.post("/preview", response_model=SegmentPreviewResponse)
async def preview_segment(
    payload: SegmentPreviewRequest,
    db: AsyncSession = Depends(get_db),
):
    """Preview matching customers for given conditions without saving a segment."""
    try:
        conditions = _conditions_to_dict(payload.conditions)
        matching_count = await count_matching_customers(conditions, db)
        customers = await get_matching_customers(conditions, db, limit=50)

        return SegmentPreviewResponse(
            matching_count=matching_count,
            customers=[CustomerResponse.model_validate(c) for c in customers],
        )
    except (ValueError, ValidationError) as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception:
        await db.rollback()
        raise


@router.post("", response_model=SegmentResponse, status_code=status.HTTP_201_CREATED)
async def create_segment(
    payload: SegmentCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a segment and persist the computed customer_count."""
    try:
        conditions = _conditions_to_dict(payload.conditions)
        customer_count = await count_matching_customers(conditions, db)

        segment = Segment(
            name=payload.name,
            description=payload.description,
            conditions=conditions,
            customer_count=customer_count,
        )
        db.add(segment)
        await db.commit()
        await db.refresh(segment)
        return SegmentResponse.model_validate(segment)
    except (ValueError, ValidationError) as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception:
        await db.rollback()
        raise


@router.get("/{segment_id}", response_model=SegmentWithCustomers)
async def get_segment(
    segment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a segment with up to 100 matching customers."""
    try:
        result = await db.execute(select(Segment).where(Segment.id == segment_id))
        segment = result.scalar_one_or_none()
        if segment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Segment {segment_id} not found",
            )

        customers = await get_matching_customers(segment.conditions, db, limit=100)

        response = SegmentWithCustomers.model_validate(segment)
        response.customers = [CustomerResponse.model_validate(c) for c in customers]
        return response
    except HTTPException:
        raise
    except (ValueError, ValidationError) as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception:
        await db.rollback()
        raise


@router.delete("/{segment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_segment(
    segment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a segment. Fails if campaigns are still linked to it."""
    try:
        result = await db.execute(
            select(Segment)
            .options(selectinload(Segment.campaigns))
            .where(Segment.id == segment_id)
        )
        segment = result.scalar_one_or_none()
        if segment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Segment {segment_id} not found",
            )

        if segment.campaigns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Segment '{segment.name}' has {len(segment.campaigns)} linked "
                    "campaign(s) and cannot be deleted"
                ),
            )

        await db.delete(segment)
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise
