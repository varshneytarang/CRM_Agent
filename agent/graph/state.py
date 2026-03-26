from __future__ import annotations

from typing import Any, TypedDict

from common.schemas import LeadProfile


class ProspectingState(TypedDict, total=False):
    userid: str
    lead: LeadProfile
    leads: list[LeadProfile]
    context: dict[str, Any]
    fit_score: dict[str, Any]
    research_brief: dict[str, Any]
    sequence: dict[str, Any]
    guardrails: dict[str, Any]
    email_send_results: dict[str, Any]
    adaptation: dict[str, Any]
    qa: dict[str, Any]
    trace: list[str]
    error: str
