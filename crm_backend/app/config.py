"""Application configuration loaded from environment variables."""

import os
from pathlib import Path

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_ENV_PATH)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL is not set. Copy .env.example to .env and add your Supabase URL."
    )
if "@host:port/" in DATABASE_URL or DATABASE_URL.rstrip("/").endswith(":port"):
    raise ValueError(
        "DATABASE_URL still has placeholder values (host:port). "
        "Update crm_backend/.env with your real Supabase connection string and save the file."
    )

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
CHANNEL_STUB_URL = os.getenv("CHANNEL_STUB_URL", "http://localhost:8001")
CRM_BASE_URL = os.getenv("CRM_BASE_URL", "http://localhost:8000")
