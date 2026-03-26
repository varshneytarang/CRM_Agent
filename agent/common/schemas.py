from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class CompanyProfile(BaseModel):
    name: str
    domain: str | None = None
    industry: str | None = None
    employee_count: int | None = None
    tech_stack: list[str] = Field(default_factory=list)


class ContactProfile(BaseModel):
    full_name: str
    title: str | None = None
    email: str | None = None
    linkedin_url: str | None = None


class LeadProfile(BaseModel):
    lead_id: str
    company: CompanyProfile
    contact: ContactProfile
    source: str


class FitScoreOutput(BaseModel):
    fit_score: float = Field(ge=0.0, le=100.0)
    reason_codes: list[str]
    next_action: Literal["research", "sequence", "discard"]


class ResearchBriefOutput(BaseModel):
    summary: str
    pain_hypotheses: list[str]
    value_hooks: list[str]
    citations: list[str] = Field(default_factory=list)


class SequenceStep(BaseModel):
    step: int
    channel: Literal["email", "linkedin", "call"]
    subject: str | None = None
    body: str


class PersonalizationOutput(BaseModel):
    sequence_name: str
    steps: list[SequenceStep]
    rationale: str


class AdaptationOutput(BaseModel):
    signal: Literal["open", "click", "reply", "no_response", "bounce", "unsubscribe"]
    recommended_tone: Literal["direct", "consultative", "urgent", "friendly", "stop"]
    updated_cta: str
    next_message: str
    stop_sequence: bool


class QAOutput(BaseModel):
    approved: bool
    violations: list[str] = Field(default_factory=list)
    corrected_copy: str | None = None


class ProspectingRequest(BaseModel):
    userid: str
    action: Literal[
        "run_full_flow",
        "target_discovery",
        "fit_scoring",
        "research_brief",
        "personalization",
        "engagement_adaptation",
        "qa_compliance",
    ]
    lead: LeadProfile | None = None
    leads: list[LeadProfile] = Field(default_factory=list)
    engagement_signal: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)


class ProspectingResponse(BaseModel):
    success: bool
    action: str
    data: dict[str, Any] = Field(default_factory=dict)
    trace: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
