# CRM Agent (Sales Ops)

Monorepo with:
- `frontend/` — React (Vite) + Tailwind
- `backend/` — Node.js (Express) + TypeScript (CRM bridge)
- `agent/` — Python (Flask) AI agent (placeholder analysis)

## 1) Backend (Node)

Create a `.env` in `backend/` (copy from `.env.example`) and set:
- `MERGE_API_KEY=...`

Run:

```bash
cd backend
npm run dev
```

Backend runs on `http://localhost:3001`.

### Routes
- `POST /api/merge/link-token` — create a Merge Link token
- `POST /api/merge/account-token` — exchange `public_token` → `account_token` (stored in-memory)
- `POST /api/analyze-pipeline` — fetch deals from Merge and forward to agent

## 2) Agent (Flask)

```bash
cd agent
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\python main.py
```

Agent runs on `http://localhost:8000`.

## 3) Frontend (React)

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api/*` to the backend.

## Local flow
1. In the UI, click **Get link token**
2. Click **Connect HubSpot** (Merge Link)
3. Click **Analyze pipeline** (Node fetches deals, calls the agent, returns report)
