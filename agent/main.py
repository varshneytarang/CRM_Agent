from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from flask import Flask, jsonify, request

# Load .env from parent directory (CRM_Agent root)
load_dotenv(Path(__file__).parent.parent / ".env")

from agents.prospecting_agent.engagement_adaptation.node import run_engagement_adaptation
from agents.prospecting_agent.fit_scoring.node import run_fit_scoring
from agents.prospecting_agent.personalization.node import run_personalization
from agents.prospecting_agent.qa_compliance.node import run_qa_compliance
from agents.prospecting_agent.research_brief.node import run_research_brief
from agents.prospecting_agent.target_discovery.node import run_target_discovery
from common.groq_client import GroqClient
from common.schemas import ProspectingRequest, ProspectingResponse
from graph.state import ProspectingState
from graph.workflow import build_graph


app = Flask(__name__)
workflow = build_graph()


def _state_from_request(payload: ProspectingRequest) -> ProspectingState:
    state: ProspectingState = {
        "userid": payload.userid,
        "context": payload.context,
        "trace": [],
    }
    if payload.lead:
        state["lead"] = payload.lead
    if payload.leads:
        state["leads"] = payload.leads
    if payload.engagement_signal:
        state.setdefault("context", {})["engagement_signal"] = payload.engagement_signal
    return state


def _response(action: str, state: ProspectingState, success: bool = True, error: str | None = None):
    body = ProspectingResponse(
        success=success,
        action=action,
        data={
            "fit_score": state.get("fit_score"),
            "research_brief": state.get("research_brief"),
            "sequence": state.get("sequence"),
            "adaptation": state.get("adaptation"),
            "qa": state.get("qa"),
            "leads": [lead.model_dump() for lead in state.get("leads", [])],
        },
        trace={
            "steps": state.get("trace", []),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        error=error,
    )
    return jsonify(body.model_dump())


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "agent-runtime"})


@app.post("/agent/run")
def run_agent_flow():
    try:
        payload = ProspectingRequest.model_validate(request.get_json(silent=True) or {})
        state = _state_from_request(payload)

        if payload.action == "run_full_flow":
            final_state = workflow.invoke(state)
            return _response(payload.action, final_state)

        run_map: dict[str, Any] = {
            "target_discovery": run_target_discovery,
            "fit_scoring": run_fit_scoring,
            "research_brief": run_research_brief,
            "personalization": run_personalization,
            "engagement_adaptation": run_engagement_adaptation,
            "qa_compliance": run_qa_compliance,
        }

        fn = run_map.get(payload.action)
        if not fn:
            return _response(payload.action, state, success=False, error=f"Unsupported action: {payload.action}"), 400

        result_state = fn(state)
        if result_state.get("error"):
            return _response(payload.action, result_state, success=False, error=str(result_state["error"])), 400

        return _response(payload.action, result_state)
    except Exception as err:  # noqa: BLE001
        return jsonify({"success": False, "error": str(err)}), 500


@app.post("/agent/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    message = str(payload.get("message", "")).strip()
    context = payload.get("context", {})
    if not message:
        return jsonify({"success": False, "error": "message is required"}), 400

    try:
        client = GroqClient()
        raw = client.call_fast(
            [
                {
                    "role": "system",
                    "content": "You are a sales prospecting copilot. Keep responses concise and action-oriented.",
                },
                {
                    "role": "user",
                    "content": f"Message: {message}\\nContext: {context}",
                },
            ],
            temperature=0.2,
        )
        return jsonify({"success": True, "reply": raw})
    except Exception as err:  # noqa: BLE001
        return jsonify({"success": False, "error": str(err)}), 500


@app.post("/agent/analyze")
def analyze_pipeline_compat():
    payload = request.get_json(silent=True)
    if not isinstance(payload, list):
        return jsonify({"error": "Request body must be a JSON array of deals"}), 400

    all_deals: list[dict[str, Any]] = []
    high_risk: list[dict[str, Any]] = []

    for item in payload:
        if not isinstance(item, dict):
            continue
        stage = str(item.get("stage") or "").lower()
        last_activity = str(item.get("last_activity") or "")
        stale = not last_activity
        late_stage = stage in {"proposal", "negotiation", "contract", "legal"}
        signals: list[str] = []
        if stale:
            signals.append("No recorded last activity")
        if late_stage and stale:
            signals.append("Late-stage deal with low activity")

        level = "high" if signals else "low"
        result = {
            "deal_id": str(item.get("id") or ""),
            "deal_name": str(item.get("name") or ""),
            "amount": item.get("amount"),
            "stage": item.get("stage"),
            "last_activity": item.get("last_activity"),
            "risk_level": level,
            "signals": signals,
        }
        all_deals.append(result)
        if level == "high":
            high_risk.append(result)

    return jsonify(
        {
            "summary": {
                "total_deals": len(all_deals),
                "high_risk_count": len(high_risk),
            },
            "high_risk_deals": high_risk,
            "all_deals": all_deals,
        }
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
