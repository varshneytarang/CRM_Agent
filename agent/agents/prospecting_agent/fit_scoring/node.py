from __future__ import annotations

from common.schemas import FitScoreOutput
from common.observability import log_step
from graph.state import ProspectingState


def run_fit_scoring(state: ProspectingState) -> ProspectingState:
    lead = state.get("lead")
    if not lead:
        state["error"] = "fit_scoring requires lead"
        return state

    industry = (lead.company.industry or "").lower()
    score = 72.0 if industry in {"saas", "software", "technology"} else 55.0

    output = FitScoreOutput(
        fit_score=score,
        reason_codes=["industry_alignment", "title_relevance"],
        next_action="sequence" if score >= 65 else "research",
    )

    state["fit_score"] = output.model_dump()
    state.setdefault("trace", []).append("fit_scoring:complete")
    log_step("fit_scoring", output.model_dump())
    return state
