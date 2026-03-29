from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal, TypedDict


EngagementType = Literal["NOTE", "EMAIL", "CALL", "TASK", "MEETING", "OTHER"]
ThreatLevel = Literal["low", "medium", "high"]


class OpportunityIn(TypedDict, total=False):
    id: str
    name: str
    description: str | None
    amount: float | int | None
    stage: str | None
    owner: str | None
    close_date: str | None
    probability: float | int | None
    forecast_category: str | None
    next_step: str | None
    pipeline: str | None
    status: str | None
    modified_at: str | None


class EngagementIn(TypedDict, total=False):
    id: str
    type: EngagementType
    subject: str | None
    content: str | None
    occurred_at: str | None


class DealStrategyRequest(TypedDict):
    opportunity: OpportunityIn
    engagements: list[EngagementIn]


@dataclass(frozen=True)
class Evidence:
    source: str  # e.g. "opportunity.description" or "engagement.content"
    snippet: str
    engagement_id: str | None = None
    occurred_at: str | None = None


@dataclass(frozen=True)
class Battlecard:
    competitor: str
    strengths: list[str]
    weaknesses: list[str]
    landmine_questions: list[str]
    pricing_objection_handler: str


@dataclass(frozen=True)
class DetectedCompetitor:
    competitor: str
    matched_keywords: list[str]
    evidence: list[Evidence]


@dataclass(frozen=True)
class DealStrategy:
    opportunity_id: str
    opportunity_name: str
    detected: list[DetectedCompetitor]
    threat_level: ThreatLevel
    confidence_score: float
    primary_objections: list[str]
    next_actions: list[str]
    deal_tip: str
    battlecards: list[Battlecard]
    suggested_hubspot_note: str
    generated_at: str
    llm_used: bool
    llm_status: str
    llm_model: str | None
    llm_error: str | None

    @staticmethod
    def now_iso() -> str:
        return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
