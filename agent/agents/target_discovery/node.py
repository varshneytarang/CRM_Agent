from __future__ import annotations

from common.data_sources import discover_targets_from_public_data, enrich_company_with_apollo
from common.observability import log_step
from graph.state import ProspectingState


def run_target_discovery(state: ProspectingState) -> ProspectingState:
    log_step("target_discovery", {"userid": state.get("userid")})

    if state.get("leads"):
        state.setdefault("trace", []).append("target_discovery:using_supplied_leads")
        return state

    userid = str(state.get("userid") or "")
    context = state.get("context") or {}
    industry = str(context.get("industry") or "")
    keyword = str(context.get("keyword") or "")
    limit_raw = context.get("limit", 5)
    try:
        limit = max(1, min(int(limit_raw), 10))
    except Exception:
        limit = 5

    leads = discover_targets_from_public_data(
        userid=userid,
        industry=industry,
        keyword=keyword,
        limit=limit,
    )

    enriched_leads = []
    for lead in leads:
        enriched_company = enrich_company_with_apollo(lead.company)
        enriched_leads.append(lead.model_copy(update={"company": enriched_company}))

    state["leads"] = enriched_leads
    state.setdefault("trace", []).append(f"target_discovery:found_{len(enriched_leads)}")
    return state
