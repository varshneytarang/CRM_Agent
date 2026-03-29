from __future__ import annotations

import os

from .competitor_registry import DEFAULT_REGISTRY
from .detection import detect_competitors
from .models import Battlecard, DealStrategy, DetectedCompetitor
from .llm_groq import GroqError, call_groq_for_strategy
from .web_research import research_competitor_context


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


def _stage_bucket(stage: str | None) -> str:
    s = str(stage or "").lower()
    if any(x in s for x in ["proposal", "negotiation", "contract", "legal", "closing"]):
        return "late"
    if any(x in s for x in ["discovery", "qualif", "evaluate", "demo", "pilot"]):
        return "mid"
    if s:
        return "mid"
    return "unknown"


def _confidence_score(*, competitors_count: int, objections_count: int, evidence_count: int, has_description: bool) -> float:
    score = 0.35
    score += min(0.25, competitors_count * 0.1)
    score += min(0.2, evidence_count * 0.03)
    score += min(0.15, objections_count * 0.05)
    if has_description:
        score += 0.05
    if score < 0:
        return 0.0
    if score > 1:
        return 1.0
    return round(score, 2)


def _build_next_actions(
    *,
    threat: str,
    competitor: str | None,
    objections: list[str],
    stage: str | None,
    next_step: str | None,
) -> list[str]:
    stage_group = _stage_bucket(stage)
    actions: list[str] = []

    if competitor:
        actions.append(
            f"Confirm decision criteria against {competitor} and rank must-win outcomes before the next call."
        )

    if "pricing" in objections:
        actions.append("Prepare a one-page TCO comparison with implementation effort and 12-month ROI assumptions.")
    if "migration" in objections:
        actions.append("Share a low-risk migration plan with milestones, owner names, and rollback safeguards.")
    if "security" in objections:
        actions.append("Send security/compliance packet (SOC2/GDPR controls) and pre-answer procurement blockers.")
    if "integrations" in objections:
        actions.append("Map required integrations and demo the exact workflow for the buyer's core tools.")

    if stage_group == "late":
        actions.append("Book a close-plan review with decision maker and procurement to lock timeline and mutual action plan.")
    elif stage_group == "mid":
        actions.append("Run a discovery checkpoint to validate pains, success metrics, and buying committee alignment.")

    if next_step:
        actions.append(f"Execute current CRM next step: {next_step.strip()[:140]}.")

    if threat == "high":
        actions.append("Escalate internal deal review within 24h and align executive sponsor messaging before next buyer touchpoint.")

    deduped: list[str] = []
    seen: set[str] = set()
    for action in actions:
        key = action.lower().strip()
        if key and key not in seen:
            seen.add(key)
            deduped.append(action)

    return deduped[:3]


def generate_deal_strategy(*, opportunity: dict, engagements: list[dict]) -> DealStrategy:
    opp_id = str(opportunity.get("id") or "")
    opp_name = str(opportunity.get("name") or "")
    opp_desc = opportunity.get("description")
    opp_stage = str(opportunity.get("stage") or "").strip() or None
    opp_next_step = str(opportunity.get("next_step") or "").strip() or None
    opp_amount = opportunity.get("amount")
    opp_forecast_category = str(opportunity.get("forecast_category") or "").strip() or None

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
    evidence_count = sum(len(hit.evidence) for hit in hits)
    confidence = _confidence_score(
        competitors_count=len(hits),
        objections_count=len(objections),
        evidence_count=evidence_count,
        has_description=bool(str(opp_desc or "").strip()),
    )
    next_actions = _build_next_actions(
        threat=threat,
        competitor=hits[0].competitor.name if hits else None,
        objections=objections,
        stage=opp_stage,
        next_step=opp_next_step,
    )
    note_summary = ""
    llm_used = False
    llm_status = "not_attempted"
    llm_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    llm_error: str | None = None
    enable_web_research = os.getenv("ENABLE_CI_WEB_RESEARCH", "true").lower() != "false"
    enabled_flag = os.getenv("ENABLE_GROQ_LLM", "true").lower() != "false"
    has_key = bool(os.getenv("GROQ_API_KEY"))
    use_llm = has_key and enabled_flag

    if not enabled_flag:
        llm_status = "disabled"
    elif not has_key:
        llm_status = "missing_key"

    primary_name = hits[0].competitor.name if hits else "None detected"
    llm_landmine_questions = (
        battlecards[0].landmine_questions
        if battlecards
        else [
            "Which decision criteria matter most to the buyer right now?",
            "What risk must be de-risked before procurement/legal sign-off?",
            "Who is the economic buyer and what outcome do they need this quarter?",
        ]
    )

    llm_evidence_snippets: list[str] = []
    if str(opp_desc or "").strip():
        llm_evidence_snippets.append(str(opp_desc).strip()[:300])
    if hits:
        for ev in hits[0].evidence[:8]:
            llm_evidence_snippets.append(ev.snippet)
    else:
        for raw in engagements[:8]:
            subject = str(raw.get("subject") or "").strip()
            content = str(raw.get("content") or "").strip()
            snippet = " ".join(part for part in [subject, content] if part).strip()
            if snippet:
                llm_evidence_snippets.append(snippet[:220])
    if not llm_evidence_snippets:
        llm_evidence_snippets.append("No direct competitor evidence found in current CRM text.")

    if use_llm:
        research_snippets: list[str] = []
        if enable_web_research and primary_name != "None detected":
            for snippet in research_competitor_context(primary_name):
                research_snippets.append(f"{snippet.source}: {snippet.text}")

        try:
            llm_res = call_groq_for_strategy(
                opportunity_name=opp_name or opp_id,
                opportunity_description=str(opp_desc or ""),
                competitor_name=primary_name,
                evidence_snippets=llm_evidence_snippets,
                objections=objections,
                landmine_questions=llm_landmine_questions,
                research_context_snippets=research_snippets,
                stage=opp_stage,
                amount=opp_amount,
                forecast_category=opp_forecast_category,
                next_step=opp_next_step,
            )
            threat = llm_res.threat_level
            confidence = llm_res.confidence_score
            tip = llm_res.deal_tip
            if llm_res.next_actions:
                next_actions = llm_res.next_actions
            note_summary = llm_res.note_summary
            if battlecards and llm_res.landmine_indexes:
                landmines = [battlecards[0].landmine_questions[i] for i in llm_res.landmine_indexes]
            llm_used = True
            llm_status = "ok"
        except GroqError as e:
            # Fall back to deterministic content if Groq fails.
            llm_status = "error"
            llm_error = str(e)[:500] if str(e) else "Groq error"

        if tip.startswith("No competitor detected") and hits:
            if "migration" in objections:
                tip = (
                    f"Buyer signals migration concern vs {primary_name}. "
                    "Lead with a low-risk migration plan, timeline, and proof points."
                )
            elif "pricing" in objections:
                tip = (
                    f"Pricing comparison surfaced against {primary_name}. "
                    "Reframe to TCO + time-to-value; anchor on outcomes and de-risk implementation."
                )
            else:
                tip = (
                    f"Competitor {primary_name} detected. "
                    "Use landmine questions to surface hidden costs/risks and validate decision criteria."
                )

        # Recompute deterministic next actions after final threat/tip settlement.
        next_actions = _build_next_actions(
            threat=threat,
            competitor=hits[0].competitor.name if hits else None,
            objections=objections,
            stage=opp_stage,
            next_step=opp_next_step,
        )

    note_lines: list[str] = [
        "[AI CI Agent]: Real-time Deal Strategist",
        f"Opportunity: {opp_name or opp_id}",
        f"Threat: {threat}",
        f"Confidence: {int(round(confidence * 100))}%",
        f"Recommended tactic: {tip}",
    ]

    if opp_stage:
        note_lines.append(f"Stage: {opp_stage}")
    if opp_forecast_category:
        note_lines.append(f"Forecast category: {opp_forecast_category}")
    if opp_next_step:
        note_lines.append(f"Current CRM next step: {opp_next_step}")

    if objections:
        note_lines.append(f"Primary objections: {', '.join(objections)}")

    if note_summary:
        note_lines.append(note_summary)

    if hits:
        note_lines.append(f"Detected: {', '.join(h.competitor.name for h in hits)}")

    if landmines:
        note_lines.append("Landmine questions:")
        for q in landmines:
            note_lines.append(f"- {q}")

    if next_actions:
        note_lines.append("Next best actions:")
        for action in next_actions:
            note_lines.append(f"- {action}")

    suggested_note = "\n".join(note_lines)

    return DealStrategy(
        opportunity_id=opp_id,
        opportunity_name=opp_name,
        detected=detected,
        threat_level=threat,  # type: ignore[arg-type]
        confidence_score=confidence,
        primary_objections=objections,
        next_actions=next_actions,
        deal_tip=tip,
        battlecards=battlecards,
        suggested_hubspot_note=suggested_note,
        generated_at=DealStrategy.now_iso(),
        llm_used=llm_used,
        llm_status=llm_status,
        llm_model=llm_model,
        llm_error=llm_error,
    )
