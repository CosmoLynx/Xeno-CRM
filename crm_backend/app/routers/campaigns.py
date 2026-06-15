"""Campaign CRUD and launch endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.campaign import Campaign
from app.models.message import Message
from app.models.segment import Segment
from app.schemas.campaign import CampaignCreate, CampaignResponse, CampaignWithSegment
from app.schemas.message import MessageResponse
from app.services.campaign_service import launch_campaign

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

ALLOWED_CHANNELS = frozenset({"whatsapp", "sms", "email", "rcs"})


@router.get("", response_model=list[CampaignResponse])
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    """List all campaigns, newest first."""
    try:
        result = await db.execute(select(Campaign).order_by(Campaign.created_at.desc()))
        campaigns = result.scalars().all()
        return [CampaignResponse.model_validate(c) for c in campaigns]
    except Exception:
        await db.rollback()
        raise


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: CampaignCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a draft campaign targeting an existing segment."""
    try:
        if payload.channel not in ALLOWED_CHANNELS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Invalid channel '{payload.channel}'. "
                    f"Allowed: {', '.join(sorted(ALLOWED_CHANNELS))}"
                ),
            )

        segment_result = await db.execute(
            select(Segment).where(Segment.id == payload.segment_id)
        )
        segment = segment_result.scalar_one_or_none()
        if segment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Segment {payload.segment_id} not found",
            )

        campaign = Campaign(
            name=payload.name,
            segment_id=payload.segment_id,
            channel=payload.channel,
            message_template=payload.message_template,
            status="draft",
        )
        db.add(campaign)
        await db.commit()
        await db.refresh(campaign)
        return CampaignResponse.model_validate(campaign)
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise


@router.get("/{campaign_id}", response_model=CampaignWithSegment)
async def get_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a campaign with its linked segment details."""
    try:
        result = await db.execute(
            select(Campaign)
            .options(selectinload(Campaign.segment))
            .where(Campaign.id == campaign_id)
        )
        campaign = result.scalar_one_or_none()
        if campaign is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campaign {campaign_id} not found",
            )
        return CampaignWithSegment.model_validate(campaign)
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        raise


@router.post("/{campaign_id}/send", response_model=CampaignResponse)
async def send_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Launch a draft campaign — creates messages and dispatches to channel stub."""
    try:
        result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
        campaign = result.scalar_one_or_none()
        if campaign is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campaign {campaign_id} not found",
            )

        if campaign.status != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campaign has already been sent or is sending",
            )

        campaign = await launch_campaign(campaign_id, db)
        return CampaignResponse.model_validate(campaign)
    except HTTPException:
        await db.rollback()
        raise
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception:
        await db.rollback()
        raise


@router.get("/{campaign_id}/messages", response_model=list[MessageResponse])
async def list_campaign_messages(
    campaign_id: uuid.UUID,
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
):
    """List messages for a campaign, optionally filtered by delivery status."""
    try:
        campaign_result = await db.execute(
            select(Campaign).where(Campaign.id == campaign_id)
        )
        if campaign_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campaign {campaign_id} not found",
            )

        query = select(Message).where(Message.campaign_id == campaign_id)
        if status_filter is not None:
            query = query.where(Message.status == status_filter)

        result = await db.execute(query.order_by(Message.sent_at.desc()))
        messages = result.scalars().all()
        return [MessageResponse.model_validate(m) for m in messages]
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        raise
