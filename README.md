# CRM Agent

CRM Agent is an AI-driven revenue operations platform that helps sales teams run prospecting, deal intelligence, and retention workflows from one system.

It is designed for teams that want:
- one interface across multiple CRMs,
- agent-assisted decision support,
- explainable outputs instead of black-box automation,
- a practical human-in-the-loop workflow.

## What We Are Building

This project combines CRM data + specialized AI agents to support the full go-to-market cycle:
- Discover and qualify leads
- Generate personalized outreach
- Monitor engagement signals and adapt strategy
- Analyze deal health and competitive risks
- Detect churn risk and trigger retention actions

## Novel Architecture (Core Idea)

Our key architectural idea is a **dual-orchestration model**:
- **Operational API Orchestration (TypeScript backend):** Handles auth, CRM connectivity, data access, approvals, and external integrations.
- **Reasoning Orchestration (Python agent runtime):** Runs specialized AI workflows (prospecting graph, deal strategy, retention reasoning).

Instead of putting all logic in one LLM chain, we separate:
- deterministic system responsibilities (security, persistence, integration, routing), and
- adaptive reasoning responsibilities (scoring, strategy generation, message personalization).

This split gives better control, easier auditing, safer fallbacks, and clearer debugging.

## High-Level System Design

1. Frontend (React) captures operator intent and displays agent outputs.
2. Backend (Express/TS) authenticates requests, fetches CRM context, and coordinates business rules.
3. Python agent runtime executes agent workflows and returns structured outputs.
4. Optional infrastructure (PostgreSQL, Redis) supports persistence and queue-based execution.

## Repository Structure

```text
CRM_Agent/
	frontend/   # React + Vite UI
	backend/    # Express + TypeScript API, auth, CRM bridge, routes
	agent/      # Flask + Python agent workflows (prospecting, retention, CI)
```

## Main Capabilities

- **Authentication and session management** for multi-user workflows
- **CRM integration via Merge** for account and deal data
- **Prospecting agent flow** (discovery -> scoring -> research -> personalization -> guardrails)
- **Deal intelligence** for risk and recovery recommendations
- **Retention module** for churn scoring and intervention planning
- **Approvals + webhook hooks** for human oversight and signal ingestion

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts
- **Backend:** Node.js, Express, TypeScript, Axios, BullMQ
- **Agent Runtime:** Python, Flask, LangGraph, Pydantic
- **LLM + AI:** Groq API, optional Langfuse tracing
- **Data + Infra:** PostgreSQL, Redis (optional queue mode), Merge API

## Local Setup

### 1) Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL (optional but recommended)
- Redis (optional; required for queue mode)

### 2) Environment Files

Use provided examples:

- Root-level env template: `.env.example`
- Backend env template: `backend/.env.example`

Minimum important backend variables:

```bash
MERGE_API_KEY=your_merge_key
JWT_SECRET=your_jwt_secret
AGENT_BASE_URL=http://localhost:8000
```

Recommended extras:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/crm_agent
TOKEN_ENCRYPTION_KEY=your_token_encryption_key
USE_JOB_QUEUE=false
```

For Python agent features:

```bash
GROQ_API_KEY=your_groq_key
```

### 3) Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Agent
cd ../agent
python -m venv .venv
\.venv\Scripts\pip install -r requirements.txt
```

### 4) Run the Services

In separate terminals:

```bash
# Terminal 1: backend
cd backend
npm run dev
```

```bash
# Terminal 2: python agent
cd agent
\.venv\Scripts\python main.py
```

```bash
# Terminal 3: frontend
cd frontend
npm run dev
```

Default local URLs:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Agent: http://localhost:8000

## Basic Run Flow

1. Register/login in the frontend.
2. Connect CRM through Merge.
3. Open dashboard/agent workspaces.
4. Trigger prospecting, deal intelligence, or retention actions.
5. Review outputs and apply human approvals where needed.

## Vision

CRM Agent is built to be a practical, transparent, and extensible AI system for revenue teams.
The long-term goal is not just automation, but **trustworthy autonomous assistance** across the full sales lifecycle.
