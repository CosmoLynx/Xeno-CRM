"""Google Gemini integration for segment and campaign message generation."""

from __future__ import annotations

import asyncio
import json
import re

import google.generativeai as genai
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import GEMINI_API_KEY, GEMINI_MODEL
from app.models.campaign import Campaign
from app.models.segment import Segment
from app.schemas.ai import (
    AIMessageRequest,
    AIMessageResponse,
    AISegmentResponse,
    CampaignSuggestion,
    CampaignSuggestionsResponse,
    ChannelPerformance,
)

genai.configure(api_key=GEMINI_API_KEY)
_model = genai.GenerativeModel(GEMINI_MODEL)

SEGMENT_PROMPT_TEMPLATE = """You are a CRM segmentation assistant. Convert the user's \
natural language description into a JSON object for filtering customers.

Available fields and their types:
- total_spent (number, total amount customer has spent)
- order_count (number, total number of orders)
- last_order_date (date, when customer last ordered)
- city (string, customer's city)
- gender (string: male/female/other)
- age (number)
- created_at (date, when customer joined)

Available operators:
- gt, lt, gte, lte, eq (for numbers and exact string match)
- days_ago_gt (field value is MORE than N days ago — i.e. older/inactive)
- days_ago_lt (field value is LESS than N days ago — i.e. recent/active)

Respond with ONLY a JSON object, no markdown, no explanation text outside the JSON, \
in this exact format:
{{
  "conditions": {{
    "operator": "AND" or "OR",
    "rules": [
      {{"field": "...", "operator": "...", "value": ...}}
    ]
  }},
  "explanation": "A short one-sentence explanation of this segment"
}}

User description: {description}"""

MESSAGE_PROMPT_TEMPLATE = """You are a marketing copywriter for a D2C consumer brand.
Write a personalized campaign message.

Campaign goal: {goal}
Target audience: {segment_description}
Channel: {channel}
Tone: {tone}

Rules:
- Use {{name}} as a placeholder for the customer's name (literally write the characters {{name}})
- You may also use {{city}} for the customer's city if relevant
- For SMS: keep under 160 characters total
- For WhatsApp/RCS: keep under 300 characters
- For Email: keep under 500 characters, can be slightly more formal
- Do not include a subject line, just the message body
- Respond with ONLY the message text, no quotes, no markdown, no explanation"""

ALLOWED_CHANNELS = frozenset({"whatsapp", "sms", "email", "rcs"})
ALLOWED_TONES = frozenset({"friendly", "professional", "urgent", "playful"})

SUGGESTIONS_PROMPT_TEMPLATE = """You are an AI marketing strategist for a D2C consumer brand's \
CRM. Suggest 2-3 distinct campaign strategies for the following customer segment.

SEGMENT:
Name: {segment_name}
Description: {segment_description}
Targeting conditions: {segment_conditions}
Number of matching customers: {customer_count}

HISTORICAL CAMPAIGN PERFORMANCE (from past campaigns sent by this brand):
{performance_text}

TASK:
Suggest 2-3 DIFFERENT campaign strategies for this segment. Each should have a different angle \
or channel. Where historical data is available, your reasoning should reference it (e.g. \
"WhatsApp has shown strong click rates historically, making it ideal for..."). Where no \
historical data exists, base reasoning on general marketing best practices for the segment's \
characteristics (e.g. inactive customers respond well to urgency/discounts, high-value \
customers respond to exclusivity).

Also write a 1-sentence "segment_summary" — a plain-English description of who is in this \
segment based on the targeting conditions.

Respond with ONLY a JSON object, no markdown, in this exact format:
{{
  "segment_summary": "...",
  "suggestions": [
    {{
      "title": "...",
      "goal": "...",
      "channel": "whatsapp" | "sms" | "email" | "rcs",
      "tone": "friendly" | "professional" | "urgent" | "playful",
      "reasoning": "..."
    }}
  ]
}}"""


class AIServiceError(Exception):
    """Raised when the AI service fails or returns unusable output."""


def extract_json_from_response(text: str) -> dict:
    """Parse JSON from a Gemini response, stripping markdown fences if present.

    Handles:
        - Plain JSON: ``{"conditions": ...}``
        - Fenced with language tag: `` ```json\\n{...}\\n``` ``
        - Fenced without tag: `` ```\\n{...}\\n``` ``

    Raises:
        ValueError: If the text cannot be parsed as JSON.
    """
    cleaned = text.strip()

    fence_match = re.search(
        r"```(?:json)?\s*\n?(.*?)\n?```",
        cleaned,
        flags=re.DOTALL | re.IGNORECASE,
    )
    if fence_match:
        cleaned = fence_match.group(1).strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Failed to parse JSON from AI response: {exc}. Raw text: {text[:200]!r}"
        ) from exc

    if not isinstance(parsed, dict):
        raise ValueError("AI response JSON must be an object")

    return parsed


def _ensure_api_key() -> None:
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        raise AIServiceError(
            "GEMINI_API_KEY is not configured. Set a valid key in crm_backend/.env"
        )


async def generate_segment_conditions(description: str) -> AISegmentResponse:
    """Convert natural language into validated ``SegmentConditions`` via Gemini."""
    _ensure_api_key()
    prompt = SEGMENT_PROMPT_TEMPLATE.format(description=description)

    try:
        response = await asyncio.to_thread(_model.generate_content, prompt)
    except Exception as exc:
        raise AIServiceError(f"Gemini API error while generating segment: {exc}") from exc

    if not response.text:
        raise AIServiceError("Gemini returned an empty response for segment generation")

    try:
        parsed = extract_json_from_response(response.text)
        return AISegmentResponse.model_validate(parsed)
    except ValidationError as exc:
        raise AIServiceError(
            f"AI returned invalid segment conditions. Raw response: {response.text!r}. "
            f"Validation errors: {exc}"
        ) from exc
    except ValueError as exc:
        raise AIServiceError(str(exc)) from exc


async def generate_campaign_message(request: AIMessageRequest) -> AIMessageResponse:
    """Generate a personalized campaign message template via Gemini."""
    _ensure_api_key()
    prompt = MESSAGE_PROMPT_TEMPLATE.format(
        goal=request.goal,
        segment_description=request.segment_description or "general audience",
        channel=request.channel,
        tone=request.tone or "friendly",
    )

    try:
        response = await asyncio.to_thread(_model.generate_content, prompt)
    except Exception as exc:
        raise AIServiceError(f"Gemini API error while generating message: {exc}") from exc

    if not response.text:
        raise AIServiceError("Gemini returned an empty response for message generation")

    message = response.text.strip().strip('"').strip("'")
    return AIMessageResponse(message=message, character_count=len(message))


async def get_channel_performance_stats(db: AsyncSession) -> list[ChannelPerformance]:
    """Aggregate per-channel delivery/open/click rates from past sent campaigns."""
    result = await db.execute(
        select(Campaign).where(Campaign.status == "sent", Campaign.total_sent > 0)
    )
    campaigns = result.scalars().all()

    if not campaigns:
        return []

    by_channel: dict[str, list[Campaign]] = {}
    for campaign in campaigns:
        by_channel.setdefault(campaign.channel, []).append(campaign)

    stats: list[ChannelPerformance] = []
    for channel, channel_campaigns in by_channel.items():
        count = len(channel_campaigns)
        delivery_rates = [
            campaign.total_delivered / campaign.total_sent * 100
            for campaign in channel_campaigns
        ]
        open_rates = [
            campaign.total_opened / campaign.total_sent * 100
            for campaign in channel_campaigns
        ]
        click_rates = [
            campaign.total_clicked / campaign.total_sent * 100
            for campaign in channel_campaigns
        ]

        stats.append(
            ChannelPerformance(
                channel=channel,
                campaigns_analyzed=count,
                avg_delivery_rate=round(sum(delivery_rates) / count, 1),
                avg_open_rate=round(sum(open_rates) / count, 1),
                avg_click_rate=round(sum(click_rates) / count, 1),
            )
        )

    return stats


def _format_performance_text(performance_stats: list[ChannelPerformance]) -> str:
    if not performance_stats:
        return (
            "No historical campaign data available yet — base suggestions on general "
            "best practices for D2C marketing."
        )

    lines = []
    for stat in performance_stats:
        lines.append(
            f"- {stat.channel}: {stat.avg_delivery_rate}% delivered, "
            f"{stat.avg_open_rate}% opened, {stat.avg_click_rate}% clicked "
            f"(based on {stat.campaigns_analyzed} campaign"
            f"{'' if stat.campaigns_analyzed == 1 else 's'})"
        )
    return "\n".join(lines)


def _sanitize_suggestion(raw: dict) -> CampaignSuggestion:
    """Normalize AI suggestion fields, defaulting invalid channel/tone values."""
    channel = raw.get("channel", "whatsapp")
    if channel not in ALLOWED_CHANNELS:
        print(f"[AI] Invalid channel '{channel}' in suggestion, defaulting to whatsapp")
        channel = "whatsapp"

    tone = raw.get("tone", "friendly")
    if tone not in ALLOWED_TONES:
        print(f"[AI] Invalid tone '{tone}' in suggestion, defaulting to friendly")
        tone = "friendly"

    return CampaignSuggestion(
        title=raw.get("title", "Campaign Strategy"),
        goal=raw.get("goal", ""),
        channel=channel,
        tone=tone,
        reasoning=raw.get("reasoning", ""),
    )


async def generate_campaign_suggestions(
    segment: Segment,
    performance_stats: list[ChannelPerformance],
) -> CampaignSuggestionsResponse:
    """Generate data-informed campaign strategy suggestions for a segment."""
    _ensure_api_key()

    prompt = SUGGESTIONS_PROMPT_TEMPLATE.format(
        segment_name=segment.name,
        segment_description=segment.description or "No description",
        segment_conditions=json.dumps(segment.conditions),
        customer_count=segment.customer_count,
        performance_text=_format_performance_text(performance_stats),
    )

    try:
        response = await asyncio.to_thread(_model.generate_content, prompt)
    except Exception as exc:
        raise AIServiceError(
            f"Gemini API error while generating campaign suggestions: {exc}"
        ) from exc

    if not response.text:
        raise AIServiceError("Gemini returned an empty response for campaign suggestions")

    try:
        parsed = extract_json_from_response(response.text)
        suggestions = [
            _sanitize_suggestion(item)
            for item in parsed.get("suggestions", [])
        ]

        if not suggestions:
            raise ValueError("AI returned no campaign suggestions")

        return CampaignSuggestionsResponse(
            segment_name=segment.name,
            segment_summary=parsed.get("segment_summary", ""),
            historical_performance=performance_stats,
            suggestions=suggestions,
        )
    except ValueError as exc:
        raise AIServiceError(str(exc)) from exc
