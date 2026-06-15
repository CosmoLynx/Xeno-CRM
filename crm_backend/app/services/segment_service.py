"""Segment filter evaluation — translates JSON conditions into SQLAlchemy queries."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import and_, false, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import ColumnElement

from app.models.customer import Customer

ALLOWED_FIELDS = frozenset(
    {
        "total_spent",
        "order_count",
        "last_order_date",
        "city",
        "gender",
        "age",
        "created_at",
    }
)

ALLOWED_OPERATORS = frozenset(
    {
        "gt",
        "lt",
        "eq",
        "gte",
        "lte",
        "days_ago_gt",
        "days_ago_lt",
    }
)

NUMERIC_FIELDS = frozenset({"total_spent", "order_count", "age"})
DATE_FIELDS = frozenset({"last_order_date", "created_at"})
STRING_FIELDS = frozenset({"city", "gender"})


def _coerce_value(field: str, value: Any) -> Any:
    """Cast a rule value to the Python type expected for the target column."""
    if field in NUMERIC_FIELDS:
        if field == "total_spent":
            return Decimal(str(value))
        return int(value)
    if field in STRING_FIELDS:
        return str(value)
    return value


def _days_ago_cutoff(days: Any) -> datetime:
    """Return a UTC cutoff datetime N days before now."""
    return datetime.now(timezone.utc) - timedelta(days=int(days))


def build_filter_expression(rule: dict[str, Any]) -> ColumnElement[bool]:
    """Build a SQLAlchemy filter for a single segment rule.

    Args:
        rule: Dict with ``field``, ``operator``, and ``value`` keys.

    Returns:
        A SQLAlchemy boolean column expression suitable for ``.where()``.

    Raises:
        ValueError: If the field or operator is not recognized.

    Example:
        >>> # total_spent > 1000
        >>> build_filter_expression(
        ...     {"field": "total_spent", "operator": "gt", "value": 1000}
        ... )

    ``days_ago_gt`` / ``days_ago_lt`` (date fields only):
        These operators compare a datetime column against "now minus N days".

        Timeline (today = T):
            past <-------- cutoff (T - N days) --------> present (T)

        - ``days_ago_gt`` with value N  →  column < cutoff
          Matches customers whose date is *older than* N days ago (inactive).

        - ``days_ago_lt`` with value N  →  column > cutoff
          Matches customers whose date is *more recent than* N days ago (active).

        Example — last order older than 60 days (inactive shoppers):
            {"field": "last_order_date", "operator": "days_ago_gt", "value": 60}
            → last_order_date < (now - 60 days)
    """
    field = rule["field"]
    operator = rule["operator"]
    raw_value = rule["value"]

    if field not in ALLOWED_FIELDS:
        allowed = ", ".join(sorted(ALLOWED_FIELDS))
        raise ValueError(f"Invalid field '{field}'. Allowed fields: {allowed}")

    if operator not in ALLOWED_OPERATORS:
        allowed = ", ".join(sorted(ALLOWED_OPERATORS))
        raise ValueError(f"Invalid operator '{operator}'. Allowed operators: {allowed}")

    column = getattr(Customer, field)

    if operator in {"days_ago_gt", "days_ago_lt"}:
        if field not in DATE_FIELDS:
            raise ValueError(
                f"Operator '{operator}' is only valid for date fields: "
                f"{', '.join(sorted(DATE_FIELDS))}"
            )
        cutoff = _days_ago_cutoff(raw_value)
        if operator == "days_ago_gt":
            return column < cutoff
        return column > cutoff

    value = _coerce_value(field, raw_value)

    if operator == "gt":
        return column > value
    if operator == "lt":
        return column < value
    if operator == "gte":
        return column >= value
    if operator == "lte":
        return column <= value
    if operator == "eq":
        return column == value

    raise ValueError(f"Unknown operator '{operator}'")


def build_combined_filter(conditions: dict[str, Any]) -> ColumnElement[bool]:
    """Combine multiple rule expressions with AND/OR logic.

    Args:
        conditions: Full conditions dict with ``operator`` (``AND``/``OR``)
            and a ``rules`` list of rule dicts.

    Returns:
        A single combined SQLAlchemy boolean expression.

    Example:
        >>> build_combined_filter({
        ...     "operator": "AND",
        ...     "rules": [
        ...         {"field": "total_spent", "operator": "gt", "value": 1000},
        ...         {"field": "city", "operator": "eq", "value": "Mumbai"},
        ...     ],
        ... })
    """
    rules = conditions.get("rules", [])
    if not rules:
        return false()

    expressions = [build_filter_expression(rule) for rule in rules]
    logic = conditions.get("operator", "AND").upper()

    if logic == "OR":
        return or_(*expressions)
    return and_(*expressions)


async def get_matching_customers(
    conditions: dict[str, Any],
    db: AsyncSession,
    limit: Optional[int] = None,
) -> list[Customer]:
    """Return customers matching the given segment conditions.

    Args:
        conditions: Segment conditions dict (``operator`` + ``rules``).
        db: Active async database session.
        limit: Optional maximum number of rows to return.

    Returns:
        List of ``Customer`` ORM instances.
    """
    combined_filter = build_combined_filter(conditions)
    query = select(Customer).where(combined_filter).order_by(Customer.created_at.desc())

    if limit is not None:
        query = query.limit(limit)

    result = await db.execute(query)
    return list(result.scalars().all())


async def count_matching_customers(conditions: dict[str, Any], db: AsyncSession) -> int:
    """Count customers matching conditions without loading full rows.

    Args:
        conditions: Segment conditions dict (``operator`` + ``rules``).
        db: Active async database session.

    Returns:
        Integer count of matching customers.
    """
    combined_filter = build_combined_filter(conditions)
    query = select(func.count()).select_from(Customer).where(combined_filter)
    result = await db.execute(query)
    return result.scalar_one()
