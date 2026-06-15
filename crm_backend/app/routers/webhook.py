"""Webhook endpoints — receive delivery receipts from the channel stub."""

import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.campaign import Campaign
from app.models.message import Message, MessageEvent
from app.schemas.message import WebhookReceiptPayload
from app.services.campaign_service import should_apply_status_update

router = APIRouter(prefix="/api/webhook", tags=["webhook"])

# Maps webhook status to the campaign counter column to increment.
COUNTER_FIELD_MAP = {
    "delivered": "total_delivered",
    "opened": "total_opened",
    "clicked": "total_clicked",
    "failed": "total_failed",
}


@router.post("/receipt")
async def receive_receipt(
    payload: WebhookReceiptPayload,
    db: AsyncSession = Depends(get_db),
):
    """Receive a delivery status callback from the channel stub.

    Always returns HTTP 200 — real webhook providers retry on 4xx/5xx,
    which causes retry storms when the payload is valid but processing fails.
    """
    try:
        try:
            message_uuid = uuid.UUID(payload.messageId)
        except ValueError:
            return JSONResponse(
                status_code=200,
                content={
                    "received": False,
                    "reason": "invalid messageId format",
                },
            )

        result = await db.execute(select(Message).where(Message.id == message_uuid))
        message = result.scalar_one_or_none()
        if message is None:
            return JSONResponse(
                status_code=200,
                content={
                    "received": False,
                    "reason": "message not found",
                },
            )

        new_status = payload.status

        # Idempotency: ignore stale, duplicate, or out-of-order callbacks.
        # See should_apply_status_update() for the full rule set.
        if not should_apply_status_update(message.status, new_status):
            return JSONResponse(
                status_code=200,
                content={
                    "received": True,
                    "updated": False,
                    "reason": "stale update",
                },
            )

        # --- Single transaction: message update, event, counter, completion ---
        message.status = new_status
        message.updated_at = payload.timestamp

        event = MessageEvent(
            message_id=message.id,
            status=new_status,
            timestamp=payload.timestamp,
        )
        db.add(event)

        # Flush so the message status change is visible to subsequent SQL counts.
        await db.flush()

        if new_status in COUNTER_FIELD_MAP:
            field_name = COUNTER_FIELD_MAP[new_status]
            column = getattr(Campaign, field_name)

            # Atomic increment — Postgres evaluates SET col = col + 1 in one
            # row-level UPDATE, so concurrent webhooks cannot both read the
            # same value and overwrite each other (avoids lost updates).
            await db.execute(
                update(Campaign)
                .where(Campaign.id == message.campaign_id)
                .values({field_name: column + 1})
            )

        # Auto-complete: mark campaign "sent" once every message has received
        # at least one callback (status != "sent").
        #
        # Heuristic: we treat the first non-"sent" status as "this message
        # has been acknowledged by the channel." Messages may still progress
        # (delivered -> opened -> clicked) after this point — we deliberately
        # do not wait for a final terminal state.
        terminal_result = await db.execute(
            select(func.count())
            .select_from(Message)
            .where(
                Message.campaign_id == message.campaign_id,
                Message.status != "sent",
            )
        )
        terminal_count = terminal_result.scalar_one()

        campaign_result = await db.execute(
            select(Campaign.total_sent, Campaign.status).where(
                Campaign.id == message.campaign_id
            )
        )
        total_sent, current_status = campaign_result.one()

        if terminal_count >= total_sent and current_status == "sending":
            await db.execute(
                update(Campaign)
                .where(Campaign.id == message.campaign_id)
                .values(status="sent")
            )

        await db.commit()

        return JSONResponse(
            status_code=200,
            content={"received": True, "updated": True},
        )
    except Exception as exc:
        await db.rollback()
        print(f"[WEBHOOK] Error processing receipt for {payload.messageId}: {exc}")
        return JSONResponse(
            status_code=200,
            content={"received": False, "error": str(exc)},
        )
