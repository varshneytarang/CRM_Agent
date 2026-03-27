from __future__ import annotations

import os

from .competitor_registry import DEFAULT_REGISTRY
from .detection import detect_competitors
from .models import Battlecard, DealStrategy, DetectedCompetitor
from .llm_groq import GroqError, call_groq_for_strategy


def _threat_level(*, competitors_count: int, objections: list[str]) -> str:
    # MVP heuristic. v1 can be LLM-assisted.
    if competitors_count == 0:
        return "low"

    # Pricing + competitor mention is usually serious.
    if "pricing" in objections:
        return "high"

    if competitors_count >= 2:
        return "high"

    if len(objections) >= 2:
        return "medium"

    return "medium"


def generate_deal_strategy(*, opportunity: dict, engagements: list[dict]) -> DealStrategy:
    opp_id = str(opportunity.get("id") or "")
    opp_name = str(opportunity.get("name") or "")
    opp_desc = opportunity.get("description")

    hits, objections = detect_competitors(
        opportunity_description=opp_desc,
        engagements=engagements,
        registry=DEFAULT_REGISTRY,
    )

    threat = _threat_level(competitors_count=len(hits), objections=objections)

    detected: list[DetectedCompetitor] = []
    battlecards: list[Battlecard] = []

    for hit in hits:
        detected.append(
            DetectedCompetitor(
                competitor=hit.competitor.name,
                matched_keywords=hit.matched_keywords,
                evidence=hit.evidence,
            )
        )
        battlecards.append(
            Battlecard(
                competitor=hit.competitor.name,
                strengths=hit.competitor.strengths,
                weaknesses=hit.competitor.weaknesses,
                landmine_questions=hit.competitor.landmine_questions,
                pricing_objection_handler=hit.competitor.pricing_objection_handler,
            )
        )

    tip = "No competitor detected from current description/engagement text."
    landmines: list[str] = battlecards[0].landmine_questions[:3] if battlecards else []
    note_summary = ""
    llm_used = False
    llm_status = "disabled"
    llm_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    llm_error: str | None = None

    if hits:
        primary = hits[0].competitor

        # LLM-assisted synthesis (optional). Uses evidence snippets rather than full engagement bodies.
        enabled_flag = os.getenv("ENABLE_GROQ_LLM", "true").lower() != "false"
        has_key = bool(os.getenv("GROQ_API_KEY"))
        use_llm = has_key and enabled_flag

        if not enabled_flag:
            llm_status = "disabled"
        elif not has_key:
            llm_status = "missing_key"

        if use_llm and battlecards:
            evidence_snippets: list[str] = []
            for ev in hits[0].evidence[:8]:
                evidence_snippets.append(ev.snippet)

            try:
                llm_res = call_groq_for_strategy(
                    opportunity_name=opp_name or opp_id,
                    opportunity_description=str(opp_desc or ""),
                    competitor_name=primary.name,
                    evidence_snippets=evidence_snippets,
                    objections=objections,
                    landmine_questions=battlecards[0].landmine_questions,
                )
                threat = llm_res.threat_level
                tip = llm_res.deal_tip
                note_summary = llm_res.note_summary
                if llm_res.landmine_indexes:
                    landmines = [battlecards[0].landmine_questions[i] for i in llm_res.landmine_indexes]
                llm_used = True
                llm_status = "ok"
            except GroqError as e:
                # Fall back to deterministic content if Groq fails.
                llm_status = "error"
                llm_error = str(e)[:500] if str(e) else "Groq error"
                pass

        if tip.startswith("No competitor detected"):
            if "migration" in objections:
                tip = (
                    f"Buyer signals migration concern vs {primary.name}. "
                    "Lead with a low-risk migration plan, timeline, and proof points."
                )
            elif "pricing" in objections:
                tip = (
                    f"Pricing comparison surfaced against {primary.name}. "
                    "Reframe to TCO + time-to-value; anchor on outcomes and de-risk implementation."
                )
            else:
                tip = (
                    f"Competitor {primary.name} detected. "
                    "Use landmine questions to surface hidden costs/risks and validate decision criteria."
                )

    note_lines: list[str] = [
        "[AI CI Agent]: Real-time Deal Strategist",
        f"Opportunity: {opp_name or opp_id}",
        f"Threat: {threat}",
        f"Recommended tactic: {tip}",
    ]

    if note_summary:
        note_lines.append(note_summary)

    if hits:
        note_lines.append(f"Detected: {', '.join(h.competitor.name for h in hits)}")

    if landmines:
        note_lines.append("Landmine questions:")
        for q in landmines:
            note_lines.append(f"- {q}")

    suggested_note = "\n".join(note_lines)

    return DealStrategy(
        opportunity_id=opp_id,
        opportunity_name=opp_name,
        detected=detected,
        threat_level=threat,  # type: ignore[arg-type]
        deal_tip=tip,
        battlecards=battlecards,
        suggested_hubspot_note=suggested_note,
        generated_at=DealStrategy.now_iso(),
        llm_used=llm_used,
        llm_status=llm_status,
        llm_model=llm_model,
        llm_error=llm_error,
    )
