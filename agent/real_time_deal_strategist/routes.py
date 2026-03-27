from __future__ import annotations

from flask import Blueprint, jsonify, request

from .strategist import generate_deal_strategy


def register_routes(app) -> None:
    bp = Blueprint("real_time_deal_strategist", __name__)

    @bp.post("/agent/ci/deal-strategy")
    def deal_strategy():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"error": "Request body must be a JSON object"}), 400

        opportunity = payload.get("opportunity")
        engagements = payload.get("engagements")

        if not isinstance(opportunity, dict):
            return jsonify({"error": "'opportunity' must be an object"}), 400
        if engagements is None:
            engagements = []
        if not isinstance(engagements, list) or not all(isinstance(e, dict) for e in engagements):
            return jsonify({"error": "'engagements' must be an array of objects"}), 400

        strategy = generate_deal_strategy(opportunity=opportunity, engagements=engagements)

        # Dataclasses -> JSON
        return jsonify(
            {
                "opportunity_id": strategy.opportunity_id,
                "opportunity_name": strategy.opportunity_name,
                "threat_level": strategy.threat_level,
                "deal_tip": strategy.deal_tip,
                "suggested_hubspot_note": strategy.suggested_hubspot_note,
                "generated_at": strategy.generated_at,
                "llm": {
                    "used": strategy.llm_used,
                    "status": strategy.llm_status,
                    "model": strategy.llm_model,
                    "error": strategy.llm_error,
                },
                "detected": [
                    {
                        "competitor": d.competitor,
                        "matched_keywords": d.matched_keywords,
                        "evidence": [
                            {
                                "source": ev.source,
                                "snippet": ev.snippet,
                                "engagement_id": ev.engagement_id,
                                "occurred_at": ev.occurred_at,
                            }
                            for ev in d.evidence
                        ],
                    }
                    for d in strategy.detected
                ],
                "battlecards": [
                    {
                        "competitor": b.competitor,
                        "strengths": b.strengths,
                        "weaknesses": b.weaknesses,
                        "landmine_questions": b.landmine_questions,
                        "pricing_objection_handler": b.pricing_objection_handler,
                    }
                    for b in strategy.battlecards
                ],
            }
        )

    app.register_blueprint(bp)
