from __future__ import annotations

from langgraph.graph import END, StateGraph

from agents.engagement_adaptation.node import run_engagement_adaptation
from agents.fit_scoring.node import run_fit_scoring
from agents.personalization.node import run_personalization
from agents.qa_compliance.node import run_qa_compliance
from agents.research_brief.node import run_research_brief
from agents.target_discovery.node import run_target_discovery
from agents.guardrails.node import run_guardrails
from agents.email_sender.node import run_email_sender
from common.config import get_settings
from graph.state import ProspectingState


def _next_after_scoring(state: ProspectingState) -> str:
    fit = state.get("fit_score") or {}
    next_action = fit.get("next_action", "research")
    if next_action == "discard":
        return "end"
    if next_action == "sequence":
        return "node_personalization"
    return "node_research_brief"


def _next_after_guardrails(state: ProspectingState) -> str:
    guardrails = state.get("guardrails") or {}
    if guardrails.get("can_send_email"):
        return "node_email_sender"
    return "end"


def _next_after_qa(state: ProspectingState) -> str:
    settings = get_settings()
    if settings.human_approval_required:
        state.setdefault("trace", []).append("qa_compliance:human_approval_required")
    return "end"


def build_graph():
    graph = StateGraph(ProspectingState)

    graph.add_node("node_target_discovery", run_target_discovery)
    graph.add_node("node_fit_scoring", run_fit_scoring)
    graph.add_node("node_research_brief", run_research_brief)
    graph.add_node("node_personalization", run_personalization)
    graph.add_node("node_guardrails", run_guardrails)
    graph.add_node("node_email_sender", run_email_sender)
    graph.add_node("node_engagement_adaptation", run_engagement_adaptation)
    graph.add_node("node_qa_compliance", run_qa_compliance)

    graph.set_entry_point("node_target_discovery")
    graph.add_edge("node_target_discovery", "node_fit_scoring")

    graph.add_conditional_edges(
        "node_fit_scoring",
        _next_after_scoring,
        {
            "node_research_brief": "node_research_brief",
            "node_personalization": "node_personalization",
            "end": END,
        },
    )

    graph.add_edge("node_research_brief", "node_personalization")
    graph.add_edge("node_personalization", "node_guardrails")

    graph.add_conditional_edges(
        "node_guardrails",
        _next_after_guardrails,
        {
            "node_email_sender": "node_email_sender",
            "end": END,
        },
    )

    graph.add_edge("node_email_sender", "node_engagement_adaptation")
    graph.add_edge("node_engagement_adaptation", "node_qa_compliance")

    graph.add_conditional_edges(
        "node_qa_compliance",
        _next_after_qa,
        {
            "end": END,
        },
    )

    return graph.compile()
