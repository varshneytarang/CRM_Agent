from __future__ import annotations

from common.data_sources import firecrawl_extract_summary, serper_search
from common.schemas import ResearchBriefOutput
from common.providers import get_provider_plan
from common.observability import log_step
from graph.state import ProspectingState


def run_research_brief(state: ProspectingState) -> ProspectingState:
    lead = state.get("lead")
    if not lead:
        state["error"] = "research_brief requires lead"
        return state

    providers = get_provider_plan()
    query = f"{lead.company.name} {lead.company.industry or ''} {lead.contact.title or ''}".strip()
    organic = serper_search(query, limit=4)
    citations = [str(item.get("link")) for item in organic if item.get("link")]
    snippets = [str(item.get("snippet") or "").strip() for item in organic if item.get("snippet")]
    page_summary = firecrawl_extract_summary(citations[0]) if citations else None
    summary = (
        f"{lead.company.name} appears to be a viable target based on public footprint and role relevance."
        if not snippets
        else f"{lead.company.name}: " + " ".join(snippets[:2])
    )
    if page_summary:
        summary = f"{summary} Key page signal: {page_summary}"

    output = ResearchBriefOutput(
        summary=summary,
        pain_hypotheses=[
            "Manual CRM workflows may slow pipeline velocity",
            "Follow-up consistency may be fragmented across reps",
        ],
        value_hooks=[
            "Autonomous prospect research and scoring",
            "Engagement-aware sequence adaptation",
        ],
        citations=citations or [providers.public_research, "firecrawl"],
    )

    state["research_brief"] = output.model_dump()
    state.setdefault("trace", []).append("research_brief:complete")
    log_step("research_brief", output.model_dump())
    return state
