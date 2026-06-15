# Xeno CRM

An AI-native Mini CRM for helping D2C brands reach their shoppers.

## Services
- `crm_backend/` — Main CRM API (FastAPI + PostgreSQL)
- `channel_stub/` — Fake channel delivery service (FastAPI)
- `frontend/` — Marketer UI (React + Tailwind)

## Local Setup

### CRM Backend
cd crm_backend
cp .env.example .env   # fill in your values
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

### Channel Stub
cd channel_stub
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

### Frontend
cd frontend
cp .env.example .env
npm install
npm run dev

## Environment Variables

### crm_backend/.env
- DATABASE_URL — Supabase PostgreSQL connection string
- GEMINI_API_KEY — Google Gemini API key
- CHANNEL_STUB_URL — URL of the channel stub service

## Architecture
[CRM Frontend] → [CRM Backend] → [Channel Stub]
                      ↑                  |
                      └──── webhook ──────┘
                      ↕
                 [PostgreSQL]
