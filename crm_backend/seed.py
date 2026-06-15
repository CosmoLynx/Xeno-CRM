"""Seed the database with realistic demo data for walkthroughs and demos."""

from __future__ import annotations

import asyncio
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from faker import Faker
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.campaign import Campaign
from app.models.customer import Customer
from app.models.message import Message, MessageEvent
from app.models.order import Order
from app.models.segment import Segment
from app.services.campaign_service import personalize_message
from app.services.segment_service import count_matching_customers, get_matching_customers

fake = Faker("en_IN")

CITIES = [
    "Mumbai",
    "Delhi",
    "Bangalore",
    "Chennai",
    "Hyderabad",
    "Pune",
    "Ahmedabad",
    "Kolkata",
    "Jaipur",
    "Lucknow",
]

INDIAN_FIRST_NAMES = [
    "Priya",
    "Ananya",
    "Kavya",
    "Riya",
    "Sneha",
    "Aarav",
    "Vihaan",
    "Arjun",
    "Rohan",
    "Aditya",
    "Ishaan",
    "Neha",
    "Pooja",
    "Divya",
    "Meera",
    "Karan",
    "Vikram",
    "Sanjay",
    "Deepak",
    "Nikhil",
    "Aisha",
    "Fatima",
    "Zara",
    "Kabir",
    "Raj",
    "Amit",
    "Suresh",
    "Lakshmi",
    "Anjali",
    "Manish",
]

INDIAN_LAST_NAMES = [
    "Sharma",
    "Patel",
    "Singh",
    "Kumar",
    "Gupta",
    "Reddy",
    "Iyer",
    "Nair",
    "Mehta",
    "Shah",
    "Joshi",
    "Desai",
    "Kapoor",
    "Malhotra",
    "Chopra",
    "Verma",
    "Rao",
    "Pillai",
    "Banerjee",
    "Das",
    "Khan",
    "Ahmed",
    "Menon",
    "Shetty",
    "Bose",
    "Chatterjee",
    "Agarwal",
    "Saxena",
    "Tiwari",
    "Mishra",
]

CATEGORIES = ["clothing", "footwear", "accessories", "beauty", "electronics", "home", "sports"]

PRODUCTS_BY_CATEGORY: dict[str, list[str]] = {
    "clothing": [
        "Cotton T-Shirt",
        "Denim Jacket",
        "Formal Shirt",
        "Linen Kurta",
        "Summer Dress",
        "Chino Trousers",
    ],
    "footwear": [
        "Running Shoes",
        "Sneakers",
        "Sandals",
        "Leather Loafers",
        "Sports Slides",
        "Canvas Slip-ons",
    ],
    "accessories": [
        "Leather Belt",
        "Sunglasses",
        "Crossbody Bag",
        "Smartwatch Strap",
        "Wallet",
        "Scarf",
    ],
    "beauty": [
        "Face Serum",
        "Lipstick Set",
        "Sunscreen SPF50",
        "Hair Oil",
        "Moisturizer",
        "Perfume Mini Set",
    ],
    "electronics": [
        "Wireless Earbuds",
        "Phone Case",
        "Power Bank",
        "Bluetooth Speaker",
        "USB-C Cable",
        "Smart LED Bulb",
    ],
    "home": [
        "Ceramic Mug Set",
        "Bedsheet Set",
        "Scented Candle",
        "Storage Basket",
        "Wall Clock",
        "Throw Pillow",
    ],
    "sports": [
        "Yoga Mat",
        "Resistance Bands",
        "Cricket Bat",
        "Gym Bottle",
        "Tennis Balls",
        "Fitness Tracker Band",
    ],
}

SEGMENT_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "High Value Customers",
        "description": "Customers who have spent over ₹5000 total",
        "conditions": {
            "operator": "AND",
            "rules": [{"field": "total_spent", "operator": "gt", "value": 5000}],
        },
    },
    {
        "name": "Inactive Customers (60+ days)",
        "description": (
            "Customers who haven't ordered in over 60 days — "
            "candidates for win-back campaigns"
        ),
        "conditions": {
            "operator": "AND",
            "rules": [{"field": "last_order_date", "operator": "days_ago_gt", "value": 60}],
        },
    },
    {
        "name": "Frequent Buyers",
        "description": "Loyal customers with 5 or more orders",
        "conditions": {
            "operator": "AND",
            "rules": [{"field": "order_count", "operator": "gte", "value": 5}],
        },
    },
    {
        "name": "New Customers (Last 30 Days)",
        "description": (
            "Customers who joined in the last 30 days — candidates for welcome offers"
        ),
        "conditions": {
            "operator": "AND",
            "rules": [{"field": "created_at", "operator": "days_ago_lt", "value": 30}],
        },
    },
    {
        "name": "Mumbai High Spenders",
        "description": "High-spending customers based in Mumbai",
        "conditions": {
            "operator": "AND",
            "rules": [
                {"field": "city", "operator": "eq", "value": "Mumbai"},
                {"field": "total_spent", "operator": "gt", "value": 3000},
            ],
        },
    },
]

CAMPAIGN_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "Welcome Back Offer",
        "segment_name": "Inactive Customers (60+ days)",
        "channel": "whatsapp",
        "message_template": (
            "Hey {name}! We miss you 👋 Here's 15% off your next order. Use code WELCOME15!"
        ),
    },
    {
        "name": "VIP Exclusive Drop",
        "segment_name": "High Value Customers",
        "channel": "email",
        "message_template": (
            "Hi {name}, as one of our most valued customers, get early access to "
            "our new collection in {city}!"
        ),
    },
    {
        "name": "Loyalty Rewards",
        "segment_name": "Frequent Buyers",
        "channel": "sms",
        "message_template": (
            "{name}, thank you for being a loyal customer! Enjoy 10% off your next "
            "purchase with code LOYAL10."
        ),
    },
]

MESSAGE_OUTCOME_WEIGHTS = [
    ("failed", 15),
    ("delivered", 25),
    ("opened", 35),
    ("clicked", 25),
]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _random_past_datetime(min_days_ago: int, max_days_ago: int) -> datetime:
    """Return a random timezone-aware datetime in the given day range."""
    days_ago = random.randint(min_days_ago, max_days_ago)
    hours = random.randint(0, 23)
    minutes = random.randint(0, 59)
    return _utc_now() - timedelta(days=days_ago, hours=hours, minutes=minutes)


def _indian_name() -> str:
    if random.random() < 0.7:
        return f"{random.choice(INDIAN_FIRST_NAMES)} {random.choice(INDIAN_LAST_NAMES)}"
    return fake.name()


def _indian_phone() -> str:
    first_digit = random.choice("6789")
    rest = "".join(str(random.randint(0, 9)) for _ in range(9))
    return f"+91{first_digit}{rest}"


def _email_from_name(name: str) -> str:
    base = name.lower().replace(" ", ".")
    base = "".join(ch for ch in base if ch.isalnum() or ch == ".")
    suffix = random.randint(1, 999)
    domain = random.choice(["gmail.com", "yahoo.in", "outlook.com", "hotmail.com"])
    return f"{base}{suffix}@{domain}"


def _assign_order_counts(customers: list[Customer]) -> dict[Any, int]:
    """Assign per-customer order counts: some zero, most 1-5, few power users."""
    counts: dict[Any, int] = {}
    shuffled = customers.copy()
    random.shuffle(shuffled)

    zero_count = 30
    power_count = 15

    for customer in shuffled[:zero_count]:
        counts[customer.id] = 0

    for customer in shuffled[zero_count : zero_count + power_count]:
        counts[customer.id] = random.randint(8, 12)

    for customer in shuffled[zero_count + power_count :]:
        counts[customer.id] = random.randint(1, 5)

    return counts


def _order_date_for_profile(profile: str) -> datetime:
    """Return ordered_at based on customer shopping profile."""
    if profile == "inactive":
        return _random_past_datetime(70, 180)
    if profile == "active":
        return _random_past_datetime(1, 25)
    if profile == "power":
        # Mix of recent and older orders for realistic totals.
        return _random_past_datetime(1, 120)
    return _random_past_datetime(1, 180)


def _pick_message_outcome() -> str:
    outcomes, weights = zip(*MESSAGE_OUTCOME_WEIGHTS)
    return random.choices(outcomes, weights=weights, k=1)[0]


def _build_message_events(
    final_status: str,
    sent_at: datetime,
) -> list[tuple[str, datetime]]:
    """Build status progression events with increasing timestamps."""
    if final_status == "failed":
        return [("failed", sent_at + timedelta(seconds=random.randint(30, 120)))]

    events: list[tuple[str, datetime]] = []
    t = sent_at + timedelta(seconds=random.randint(30, 90))
    events.append(("delivered", t))

    if final_status in {"opened", "clicked"}:
        t += timedelta(seconds=random.randint(60, 300))
        events.append(("opened", t))

    if final_status == "clicked":
        t += timedelta(seconds=random.randint(60, 240))
        events.append(("clicked", t))

    return events


async def clear_data(db: AsyncSession) -> None:
    """Delete all demo data in FK-safe order."""
    await db.execute(
        text(
            "TRUNCATE TABLE message_events, messages, campaigns, segments, "
            "orders, customers RESTART IDENTITY CASCADE"
        )
    )
    await db.commit()
    print("Cleared existing data")


async def seed_customers(db: AsyncSession) -> list[Customer]:
    """Create 200 customers with realistic Indian shopper profiles."""
    print("Creating 200 customers...")
    customers: list[Customer] = []
    used_emails: set[str] = set()

    for _ in range(200):
        name = _indian_name()
        email = _email_from_name(name)
        while email in used_emails:
            email = _email_from_name(name)
        used_emails.add(email)

        # ~30 customers joined in the last 30 days for the New Customers segment.
        if len(customers) < 30:
            created_at = _random_past_datetime(1, 29)
        else:
            created_at = _random_past_datetime(30, 365)

        customer = Customer(
            name=name,
            email=email,
            phone=_indian_phone(),
            city=random.choice(CITIES),
            gender=random.choices(["male", "female", "other"], weights=[48, 48, 4], k=1)[0],
            age=random.randint(18, 65),
            created_at=created_at,
        )
        db.add(customer)
        customers.append(customer)

    await db.flush()
    print(f"Created {len(customers)} customers")
    return customers


async def seed_orders(db: AsyncSession, customers: list[Customer]) -> list[Order]:
    """Create 400-600 orders with realistic distribution and date spread."""
    target_count = random.randint(400, 600)
    print(f"Creating ~{target_count} orders...")

    order_counts = _assign_order_counts(customers)
    total_orders = sum(order_counts.values())

    while total_orders > target_count:
        candidates = [cid for cid, count in order_counts.items() if count > 0]
        if not candidates:
            break
        chosen = random.choice(candidates)
        order_counts[chosen] -= 1
        total_orders -= 1

    while total_orders < target_count:
        chosen = random.choice(customers).id
        order_counts[chosen] = order_counts.get(chosen, 0) + 1
        total_orders += 1

    profiles: dict[Any, str] = {}

    # Tag customers so inactive / active / power segments get matches.
    shuffled = customers.copy()
    random.shuffle(shuffled)
    for customer in shuffled[:45]:
        if order_counts[customer.id] > 0:
            profiles[customer.id] = "inactive"
    for customer in shuffled[45:90]:
        if order_counts[customer.id] > 0:
            profiles[customer.id] = "active"
    for customer in shuffled[90:105]:
        if order_counts[customer.id] >= 8:
            profiles[customer.id] = "power"

    orders: list[Order] = []
    for customer in customers:
        count = order_counts[customer.id]
        profile = profiles.get(customer.id, "mixed")

        for _ in range(count):
            category = random.choice(CATEGORIES)
            # Power users and high-value profiles skew toward larger baskets.
            if profile == "power" and random.random() < 0.35:
                amount = Decimal(str(round(random.triangular(1200, 8000, 3500), 2)))
            else:
                amount = Decimal(str(round(random.triangular(200, 8000, 1500), 2)))

            order = Order(
                customer_id=customer.id,
                order_amount=amount,
                product_name=random.choice(PRODUCTS_BY_CATEGORY[category]),
                category=category,
                status=random.choices(["completed", "cancelled"], weights=[90, 10], k=1)[0],
                ordered_at=_order_date_for_profile(profile),
            )
            db.add(order)
            orders.append(order)

    await db.flush()
    print(f"Created {len(orders)} orders")
    return orders


async def update_customer_aggregates(db: AsyncSession, customers: list[Customer]) -> None:
    """Recalculate total_spent, order_count, and last_order_date from completed orders."""
    print("Updating customer aggregates...")

    result = await db.execute(select(Order).where(Order.status == "completed"))
    completed_orders = result.scalars().all()

    stats: dict[Any, dict[str, Any]] = {}
    for order in completed_orders:
        entry = stats.setdefault(
            order.customer_id,
            {"total_spent": Decimal("0"), "order_count": 0, "last_order_date": None},
        )
        entry["total_spent"] += order.order_amount
        entry["order_count"] += 1
        if (
            entry["last_order_date"] is None
            or order.ordered_at > entry["last_order_date"]
        ):
            entry["last_order_date"] = order.ordered_at

    for customer in customers:
        entry = stats.get(customer.id)
        if entry:
            customer.total_spent = entry["total_spent"]
            customer.order_count = entry["order_count"]
            customer.last_order_date = entry["last_order_date"]
        else:
            customer.total_spent = Decimal("0")
            customer.order_count = 0
            customer.last_order_date = None

    await db.commit()
    print("Updated customer aggregates")


async def seed_segments(db: AsyncSession) -> list[Segment]:
    """Create five pre-built audience segments with live customer counts."""
    print("Creating 5 segments...")
    segments: list[Segment] = []

    for definition in SEGMENT_DEFINITIONS:
        conditions = definition["conditions"]
        customer_count = await count_matching_customers(conditions, db)

        segment = Segment(
            name=definition["name"],
            description=definition["description"],
            conditions=conditions,
            customer_count=customer_count,
        )
        db.add(segment)
        segments.append(segment)
        print(f"  - {definition['name']}: {customer_count} matching customers")

    await db.commit()
    for segment in segments:
        await db.refresh(segment)

    print(f"Created {len(segments)} segments")
    return segments


async def seed_campaigns(db: AsyncSession, segments: list[Segment]) -> None:
    """Create three sent campaigns with messages, events, and delivery stats."""
    print("Creating 3 campaigns...")
    segment_by_name = {segment.name: segment for segment in segments}

    for definition in CAMPAIGN_DEFINITIONS:
        segment = segment_by_name.get(definition["segment_name"])
        if segment is None:
            print(f"  WARNING: Segment '{definition['segment_name']}' not found, skipping")
            continue

        matching_customers = await get_matching_customers(segment.conditions, db)
        if not matching_customers:
            print(
                f"  WARNING: No matches for '{definition['segment_name']}', "
                f"skipping campaign '{definition['name']}'"
            )
            continue

        sent_at = _random_past_datetime(1, 14)
        campaign = Campaign(
            name=definition["name"],
            segment_id=segment.id,
            channel=definition["channel"],
            message_template=definition["message_template"],
            status="sent",
            sent_at=sent_at,
        )
        db.add(campaign)
        await db.flush()

        totals = {
            "total_sent": 0,
            "total_delivered": 0,
            "total_opened": 0,
            "total_clicked": 0,
            "total_failed": 0,
        }

        pending_messages: list[tuple[Message, list[tuple[str, datetime]]]] = []

        for customer in matching_customers:
            outcome = _pick_message_outcome()
            message_sent_at = sent_at + timedelta(minutes=random.randint(0, 5))
            events = _build_message_events(outcome, message_sent_at)
            updated_at = events[-1][1]

            message = Message(
                campaign_id=campaign.id,
                customer_id=customer.id,
                channel=campaign.channel,
                content=personalize_message(campaign.message_template, customer),
                status=outcome,
                sent_at=message_sent_at,
                updated_at=updated_at,
            )
            db.add(message)
            pending_messages.append((message, events))

            totals["total_sent"] += 1
            if outcome == "failed":
                totals["total_failed"] += 1
            else:
                totals["total_delivered"] += 1
            if outcome in {"opened", "clicked"}:
                totals["total_opened"] += 1
            if outcome == "clicked":
                totals["total_clicked"] += 1

        await db.flush()

        for message, events in pending_messages:
            for event_status, event_time in events:
                db.add(
                    MessageEvent(
                        message_id=message.id,
                        status=event_status,
                        timestamp=event_time,
                    )
                )

        campaign.total_sent = totals["total_sent"]
        campaign.total_delivered = totals["total_delivered"]
        campaign.total_opened = totals["total_opened"]
        campaign.total_clicked = totals["total_clicked"]
        campaign.total_failed = totals["total_failed"]

        print(
            f"  - {definition['name']}: {totals['total_sent']} recipients, "
            f"segment '{definition['segment_name']}'"
        )

    await db.commit()
    print("Created campaigns with messages and delivery events")


async def print_summary(db: AsyncSession) -> None:
    """Print final row counts for all seeded tables."""
    tables = [
        ("customers", Customer),
        ("orders", Order),
        ("segments", Segment),
        ("campaigns", Campaign),
        ("messages", Message),
        ("message_events", MessageEvent),
    ]

    print("\n=== Seed Summary ===")
    for label, model in tables:
        result = await db.execute(select(func.count()).select_from(model))
        count = result.scalar_one()
        print(f"  {label:16} {count:>6}")


async def main() -> None:
    """Run the full seed pipeline."""
    async with AsyncSessionLocal() as db:
        try:
            await clear_data(db)
            customers = await seed_customers(db)
            orders = await seed_orders(db, customers)
            await update_customer_aggregates(db, customers)
            await db.commit()
            segments = await seed_segments(db)
            await seed_campaigns(db, segments)
            await print_summary(db)
            print("\nSeed completed successfully.")
        except Exception as exc:
            await db.rollback()
            print(f"\nSeed failed: {exc}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
