"""AI endpoints — natural language segment building and message drafting."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.segment import Segment
from app.schemas.ai import (
    AIMessageRequest,
    AIMessageResponse,
    AISegmentRequest,
    AISegmentResponse,
    CampaignSuggestionRequest,
    CampaignSuggestionsResponse,
)
from app.services.ai_service import (
    AIServiceError,
    generate_campaign_message,
    generate_campaign_suggestions,
    generate_segment_conditions,
    get_channel_performance_stats,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/segment", response_model=AISegmentResponse)
async def ai_generate_segment(payload: AISegmentRequest):
    """Convert natural language into segment filter conditions.

    The returned ``conditions`` object can be passed directly as the
    ``conditions`` field when calling ``POST /api/segments``.
    """
    try:
        return await generate_segment_conditions(payload.description)
    except AIServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


@router.post("/message", response_model=AIMessageResponse)
async def ai_generate_message(payload: AIMessageRequest):
    """Generate a campaign message template with ``{name}`` / ``{city}`` placeholders.

    The returned ``message`` can be used directly as the ``message_template``
    field when calling ``POST /api/campaigns``.
    """
    try:
        return await generate_campaign_message(payload)
    except AIServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


@router.post("/campaign-suggestions", response_model=CampaignSuggestionsResponse)
async def ai_campaign_suggestions(
    payload: CampaignSuggestionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate data-driven campaign strategy suggestions for a segment.

    Powers the "Suggest Campaigns" feature on the Segments page. Each suggestion's
    ``goal`` can feed the AI message generator; ``channel`` and ``tone`` pre-fill
    the Create Campaign form.
    """
    result = await db.execute(select(Segment).where(Segment.id == payload.segment_id))
    segment = result.scalar_one_or_none()
    if segment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Segment {payload.segment_id} not found",
        )

    try:
        performance_stats = await get_channel_performance_stats(db)
        return await generate_campaign_suggestions(segment, performance_stats)
    except AIServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
