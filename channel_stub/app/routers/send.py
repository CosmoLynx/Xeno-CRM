"""Send endpoint — accepts messages and kicks off async delivery simulation."""

import asyncio

from fastapi import APIRouter, HTTPException, status

from app.services.simulator import SendRequest, simulate_delivery

router = APIRouter(tags=["send"])

ALLOWED_CHANNELS = frozenset({"whatsapp", "sms", "email", "rcs"})


@router.post("/send")
async def send_message(request: SendRequest):
    """Accept a message send request and simulate async channel delivery.

    Mirrors a real provider's async send API: this endpoint acknowledges
    immediately with ``accepted``, then simulates delivery outcomes
    (delivered / opened / clicked / failed) in the background and POSTs
    each status update to ``callbackUrl``.
    """
    if request.channel not in ALLOWED_CHANNELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid channel '{request.channel}'. "
                f"Allowed: {', '.join(sorted(ALLOWED_CHANNELS))}"
            ),
        )

    if not request.callbackUrl or not request.callbackUrl.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="callbackUrl is required and must be non-empty",
        )

    asyncio.create_task(simulate_delivery(request))

    return {
        "status": "accepted",
        "messageId": request.messageId,
        "channel": request.channel,
    }
