from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal, Optional, TypedDict

from dateutil.parser import isoparse
from dotenv import load_dotenv
from flask import Flask, jsonify, request

from real_time_deal_strategist import register_routes


# Load agent/.env for local development (works regardless of CWD)
_ENV_PATH = Path(__file__).with_name(".env")
load_dotenv(dotenv_path=_ENV_PATH)


class Deal(TypedDict):
    id: str
    name: str
    amount: Optional[float]
    stage: Optional[str]
    last_activity: Optional[str]


RiskLevel = Literal["high", "medium", "low"]


class DealRisk(TypedDict):
    deal_id: str
    deal_name: str
    amount: Optional[float]
    stage: Optional[str]
    last_activity: Optional[str]
    risk_level: RiskLevel
    signals: list[str]


class AnalysisSummary(TypedDict):
    total_deals: int
    high_risk_count: int


class PipelineAnalysisReport(TypedDict):
    summary: AnalysisSummary
    high_risk_deals: list[DealRisk]
    all_deals: list[DealRisk]


app = Flask(__name__)
register_routes(app)


def _parse_last_activity(last_activity: Optional[str]) -> Optional[datetime]:
    if not last_activity:
        return None
    try:
        dt = isoparse(last_activity)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _risk_signals(deal: Deal, now: datetime) -> DealRisk:
    signals: list[str] = []

    last_dt = _parse_last_activity(deal.get("last_activity"))
    if last_dt is None:
        signals.append("No recorded last activity")
    else:
        days = (now - last_dt).days
        if days >= 21:
            signals.append(f"No activity for {days} days")
        elif days >= 14:
            signals.append(f"Low activity: last touched {days} days ago")

    stage = (deal.get("stage") or "").lower()
    if stage in {"proposal", "negotiation", "contract", "legal"}:
        if last_dt is None or (now - last_dt) >= timedelta(days=14):
            signals.append("Late-stage deal with low activity")

    amount = deal.get("amount")
    if amount is not None and amount <= 0:
        signals.append("Non-positive amount")

    # Placeholder for LLM:
    # Here you would call an LLM (e.g., OpenAI) with the deals context and return
    # structured signals. This deterministic logic keeps the API stable for now.

    if any(s.startswith("No activity for") for s in signals) or "Late-stage deal with low activity" in signals:
        risk_level: RiskLevel = "high"
    elif len(signals) >= 1:
        risk_level = "medium"
    else:
        risk_level = "low"

    return DealRisk(
        deal_id=deal.get("id", ""),
        deal_name=deal.get("name", ""),
        amount=amount,
        stage=deal.get("stage"),
        last_activity=deal.get("last_activity"),
        risk_level=risk_level,
        signals=signals,
    )


def _normalize_deal(raw: dict) -> Deal:
    amount_value = raw.get("amount")
    if isinstance(amount_value, (int, float)):
        amount: Optional[float] = float(amount_value)
    else:
        amount = None

    return {
        "id": str(raw.get("id", "")),
        "name": str(raw.get("name", "")),
        "amount": amount,
        "stage": str(raw["stage"]) if raw.get("stage") is not None else None,
        "last_activity": str(raw["last_activity"])
        if raw.get("last_activity") is not None
        else None,
    }


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.post("/agent/analyze")
def analyze_pipeline():
    payload = request.get_json(silent=True)
    if not isinstance(payload, list):
        return jsonify({"error": "Request body must be a JSON array of deals"}), 400

    deals = [_normalize_deal(item) for item in payload if isinstance(item, dict)]

    now = datetime.now(timezone.utc)

    risks = [_risk_signals(d, now) for d in deals]
    high = [r for r in risks if r["risk_level"] == "high"]

    report: PipelineAnalysisReport = {
        "summary": {
            "total_deals": len(deals),
            "high_risk_count": len(high),
        },
        "high_risk_deals": high,
        "all_deals": risks,
    }
    return jsonify(report)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
