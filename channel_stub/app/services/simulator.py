"""Delivery simulation engine — models outbound sends and posts lifecycle callbacks."""

from __future__ import annotations

import asyncio
import random
from datetime import datetime, timezone
from typing import Any

import httpx
from pydantic import BaseModel, Field

CALLBACK_TIMEOUT_SECONDS = 10.0


class SendRequest(BaseModel):
    """Inbound send payload from the CRM backend."""

    messageId: str
    recipient: dict[str, Any] = Field(
        default_factory=dict,
        description="Recipient details (name, phone, email, etc.)",
    )
    channel: str
    content: str
    callbackUrl: str


def _utc_timestamp() -> str:
    """Return an ISO 8601 UTC timestamp with a trailing Z suffix."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


async def post_callback(
    callback_url: str,
    message_id: str,
    status: str,
    client: httpx.AsyncClient,
) -> None:
    """POST a delivery status update to the CRM webhook URL.

    Failures are logged but never raised — the simulation must continue
    even when the callback endpoint is unreachable.
    """
    payload = {
        "messageId": message_id,
        "status": status,
        "timestamp": _utc_timestamp(),
    }

    try:
        response = await client.post(
            callback_url,
            json=payload,
            timeout=CALLBACK_TIMEOUT_SECONDS,
        )
        print(
            f"[SIMULATOR] {message_id} -> {status} -> "
            f"callback OK ({response.status_code})"
        )
    except httpx.HTTPError as exc:
        print(
            f"[SIMULATOR] {message_id} -> {status} -> "
            f"callback FAILED ({exc.__class__.__name__}: {exc})"
        )
    except Exception as exc:
        print(
            f"[SIMULATOR] {message_id} -> {status} -> "
            f"callback FAILED ({exc.__class__.__name__}: {exc})"
        )


def _recipient_label(recipient: dict[str, Any]) -> str:
    """Build a short recipient label for log lines."""
    phone = recipient.get("phone")
    email = recipient.get("email")
    if phone:
        return str(phone)
    if email:
        return str(email)
    return recipient.get("name", "unknown")


def _plan_simulation_path() -> list[str]:
    """Pre-compute the callback statuses this simulation will emit.

    Probability tree:
        Sent (100%)
          ├─ 15% → failed (stop)
          └─ 85% → delivered
                ├─ 40% → stop at delivered
                └─ 60% → opened
                      ├─ 65% → stop at opened
                      └─ 35% → clicked
    """
    if random.random() < 0.15:
        return ["failed"]

    path = ["delivered"]

    if random.random() >= 0.60:
        return path

    path.append("opened")

    if random.random() >= 0.35:
        return path

    path.append("clicked")
    return path


async def simulate_delivery(request: SendRequest) -> None:
    """Run the full delivery lifecycle in the background with realistic delays.

    Uses a single shared ``httpx.AsyncClient`` for all callbacks in this run.
    """
    message_id = request.messageId
    recipient = _recipient_label(request.recipient)
    path = _plan_simulation_path()

    print(
        f"[SIMULATOR] {message_id} starting simulation for "
        f"{request.channel} -> {recipient}"
    )
    print(f"[SIMULATOR] {message_id} will be: {' -> '.join(path)}")

    async with httpx.AsyncClient() as client:
        for index, status in enumerate(path):
            if index == 0:
                delay = random.uniform(1, 3)
            elif status == "opened":
                delay = random.uniform(2, 5)
            elif status == "clicked":
                delay = random.uniform(2, 4)
            else:
                delay = random.uniform(1, 3)

            await asyncio.sleep(delay)
            await post_callback(request.callbackUrl, message_id, status, client)

    print(f"[SIMULATOR] {message_id} simulation complete")
