"""Campaign orchestration — personalization, launch, and channel stub dispatch."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import CHANNEL_STUB_URL, CRM_BASE_URL
from app.models.campaign import Campaign
from app.models.customer import Customer
from app.models.message import Message
from app.services.segment_service import get_matching_customers

CHANNEL_STUB_TIMEOUT_SECONDS = 10.0

# Lifecycle ordering for idempotent webhook updates (higher = further along).
STATUS_RANKS: dict[str, int] = {
    "sent": 0,
    "delivered": 1,
    "opened": 2,
    "clicked": 3,
    "failed": -1,
}


def get_status_rank(status: str) -> int:
    """Map a message status string to its lifecycle rank.

    Ranks define forward-only progression for delivery callbacks:
        sent (0) -> delivered (1) -> opened (2) -> clicked (3)

    ``failed`` maps to -1 — a terminal state that may replace ``sent`` only.
    Once a message reaches delivered/opened/clicked (rank > 0), a late
    ``failed`` callback is ignored.

    Examples:
        get_status_rank("sent") == 0
        get_status_rank("delivered") == 1
        get_status_rank("failed") == -1
    """
    return STATUS_RANKS.get(status, -2)


def should_apply_status_update(current_status: str, new_status: str) -> bool:
    """Return True if a webhook status update should be applied.

    Idempotency rules (handles duplicate/out-of-order callbacks):
        1. Ignore downgrades: delivered -> sent, opened -> delivered, etc.
        2. Ignore duplicate same-rank updates: delivered -> delivered.
        3. Allow failed ONLY while message is still at sent (rank 0).
        4. Ignore late failed after delivery progressed: delivered -> failed.

    Examples:
        should_apply_status_update("sent", "delivered")       -> True
        should_apply_status_update("delivered", "delivered")  -> False  (stale)
        should_apply_status_update("sent", "failed")          -> True
        should_apply_status_update("delivered", "failed")     -> False  (late failure)
        should_apply_status_update("opened", "clicked")       -> True
    """
    if new_status == "failed":
        return get_status_rank(current_status) <= 0

    new_rank = get_status_rank(new_status)
    current_rank = get_status_rank(current_status)

    if new_rank <= current_rank:
        return False

    return True


def personalize_message(template: str, customer: Customer) -> str:
    """Replace ``{name}``, ``{city}``, and ``{email}`` placeholders in a template.

    Example:
        >>> personalize_message(
        ...     "Hey {name} from {city}!",
        ...     customer,  # name="Priya", city="Mumbai"
        ... )
        "Hey Priya from Mumbai!"
    """
    return (
        template.replace("{name}", customer.name)
        .replace("{city}", customer.city or "")
        .replace("{email}", customer.email)
    )


async def send_to_channel_stub(payload: dict) -> None:
    """POST a single message payload to the channel stub, with retries for transient failures.

    Accepts a plain dict only — no ORM objects — so this can safely run
    as a background task after the database session has closed.

    Free-tier hosting (Render) puts idle services to sleep, causing transient
    502/connection errors on the first request after inactivity. Retrying with
    backoff handles this gracefully — this mirrors real-world transient network
    failure handling for unreliable downstream services.
    """
    message_id = payload.get("messageId", "unknown")
    recipient_name = payload.get("recipient", {}).get("name", "unknown")

    max_retries = 3
    base_delay = 2  # seconds

    for attempt in range(1, max_retries + 1):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{CHANNEL_STUB_URL}/send",
                    json=payload,
                    timeout=CHANNEL_STUB_TIMEOUT_SECONDS,
                )
                response.raise_for_status()
            print(
                f"[CAMPAIGN] Sent message {message_id} to channel "
                f"stub for {recipient_name} (attempt {attempt})"
            )
            return

        except Exception as exc:
            is_last_attempt = attempt == max_retries
            print(
                f"[CAMPAIGN] Attempt {attempt}/{max_retries} failed "
                f"for message {message_id}: {exc}"
            )
            if is_last_attempt:
                print(
                    f"[CAMPAIGN] Giving up on message {message_id} "
                    f"after {max_retries} attempts"
                )
                return

            delay = base_delay * (2 ** (attempt - 1))
            await asyncio.sleep(delay)


async def launch_campaign(campaign_id: uuid.UUID, db: AsyncSession) -> Campaign:
    """Create message records for all segment matches and dispatch to channel stub.

    Flow:
        1. Resolve campaign + segment + matching customers
        2. Create and commit Message rows (status=sent) BEFORE any HTTP calls
        3. Build plain-dict payloads (no ORM access after commit)
        4. Fire concurrent channel-stub sends in background tasks

    Committing first ensures webhook callbacks can find message rows even if
    the channel stub responds immediately. Building payloads as plain dicts
    avoids MissingGreenlet errors from accessing expired ORM objects in
    background tasks after the session closes.
    """
    result = await db.execute(
        select(Campaign)
        .options(selectinload(Campaign.segment))
        .where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise ValueError(f"Campaign {campaign_id} not found")

    if campaign.segment is None:
        raise ValueError("Campaign has no associated segment")

    customers = await get_matching_customers(campaign.segment.conditions, db)
    if not customers:
        raise ValueError("Segment has no matching customers")

    # Read everything we need from campaign NOW, while the session is active.
    channel = campaign.channel
    message_template = campaign.message_template
    callback_url = f"{CRM_BASE_URL}/api/webhook/receipt"

    messages: list[Message] = []
    send_payloads: list[dict] = []

    for customer in customers:
        content = personalize_message(message_template, customer)
        message = Message(
            campaign_id=campaign.id,
            customer_id=customer.id,
            channel=channel,
            content=content,
            status="sent",
        )
        db.add(message)
        messages.append(message)

    await db.flush()

    # Now that messages have IDs (post-flush), build plain dict payloads.
    for message, customer in zip(messages, customers):
        send_payloads.append({
            "messageId": str(message.id),
            "recipient": {
                "name": customer.name,
                "phone": customer.phone,
                "email": customer.email,
            },
            "channel": channel,
            "content": message.content,
            "callbackUrl": callback_url,
        })

    campaign.status = "sending"
    campaign.total_sent = len(customers)
    campaign.sent_at = datetime.now(timezone.utc)

    await db.commit()

    # Fire background sends using ONLY plain dicts — no ORM access here.
    for payload in send_payloads:
        asyncio.create_task(send_to_channel_stub(payload))

    await db.refresh(campaign)
    return campaign