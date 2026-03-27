"""
Retention Agent Schemas - Pydantic models for churn prediction and intervention.
"""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class RetentionSignalInput(BaseModel):
    """Incoming signal event from external source."""
    account_id: str
    source: Literal["crm", "product", "support", "email", "billing"]
    signal_type: str  # "usage_drop", "support_ticket", etc
    value: Any
    reliability_score: float = Field(ge=0.0, le=1.0)
    freshness_hours: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)


class AccountFeatureVector(BaseModel):
    """Pre-computed features for a single account."""
    account_id: str
    company_name: str
    annual_contract_value: float
    monthly_recurring_revenue: float
    support_tier: Literal["enterprise", "professional", "standard", "free"]
    
    # Usage
    days_since_last_login: int
    feature_adoption_score: float = Field(ge=0, le=100)
    api_call_volume_trend: Literal["rising", "stable", "declining"]
    
    # Engagement
    support_ticket_count_30d: int
    avg_resolution_time_hours: float
    customer_satisfaction_score: float | None = None
    executive_sponsor_engagement: Literal["high", "medium", "low"]
    
    # Financial
    days_until_renewal: int
    payment_failures_30d: int
    pricing_friction_detected: bool = False
    
    # Contextual
    is_multi_product_user: bool
    competitor_signals: list[str] = Field(default_factory=list)


class RiskAssessmentOutput(BaseModel):
    """Churn risk assessment."""
    account_id: str
    company_name: str
    
    churn_risk_30d: float = Field(ge=0.0, le=1.0)
    churn_risk_90d: float = Field(ge=0.0, le=1.0)
    contraction_risk: float = Field(ge=0.0, le=1.0)
    relationship_risk: float = Field(ge=0.0, le=1.0)
    
    overall_risk_level: Literal["high", "medium", "low"]
    confidence_score: float = Field(ge=0.0, le=1.0)
    data_quality_score: float = Field(ge=0.0, le=1.0)
    
    top_risk_reasons: list[dict[str, Any]] = Field(default_factory=list)
    suggested_interventions: list[Literal["outreach", "offer", "escalation", "monitor"]] = Field(default_factory=list)


class SentimentSummary(BaseModel):
    """Support/email sentiment analysis."""
    overall_sentiment: Literal["positive", "neutral", "negative"]
    sentiment_score: float = Field(ge=-1.0, le=1.0)
    trend: Literal["improving", "stable", "declining"]
    urgency_indicators: list[str] = Field(default_factory=list)
    last_sample_date: str | None = None


class PolicyDecisionOutput(BaseModel):
    """Intervention selection decision."""
    account_id: str
    
    recommended_intervention: Literal["outreach", "offer", "escalation", "monitor"]
    playbook_id: str
    auto_executable: bool
    
    confidence_justification: str
    requires_approval: bool = False
    
    priority: Literal["urgent", "high", "normal"]
    context: dict[str, Any] = Field(default_factory=dict)


class InterventionPlaybookOutput(BaseModel):
    """Intervention action specification."""
    account_id: str
    playbook_id: str
    intervention_type: Literal["outreach", "offer", "escalation", "monitor"]
    
    # Execution details
    channel: Literal["email", "call", "dashboard"] = "email"
    template_name: str
    
    # Personalization
    personalization_context: dict[str, Any] = Field(default_factory=dict)
    suggested_offer: dict[str, Any] | None = None  # If offer type
    
    # Compliance and guardrails
    is_compliant: bool
    compliance_notes: list[str] = Field(default_factory=list)
    
    # Escalation if needed
    escalation_path: str | None = None


class ApprovalRequest(BaseModel):
    """Request for human approval of intervention."""
    account_id: str
    company_name: str
    annual_contract_value: float
    
    intervention_id: str
    playbook_id: str
    
    churn_risk_level: Literal["high", "medium", "low"]
    estimated_cost: float
    estimated_uplift_probability: float = Field(ge=0.0, le=1.0)
    
    context_summary: str


class OutcomeLabel(BaseModel):
    """Post-intervention outcome labels for training."""
    intervention_id: str
    account_id: str
    
    outcome: Literal["saved_account", "delayed_churn", "no_effect", "adverse_effect"]
    confidence: float = Field(ge=0.0, le=1.0)
    
    customer_status_at_renewal: Literal["renewed", "churned", "downgraded", "upgraded", "pending"]
    
    observation_window_days: int
    
    # Pre/post metrics
    churn_probability_before: float
    churn_probability_after: float
    engagement_delta: float


class RetentionRequest(BaseModel):
    """Unified retention agent request."""
    userid: str
    action: Literal[
        "run_retention_scan",
        "score_account",
        "plan_intervention",
        "generate_playbook",
        "route_to_approval",
        "execute_intervention",
        "get_sentiment_intel",
        "simulate_intervention",
    ]
    account_id: str | None = None
    account_ids: list[str] = Field(default_factory=list)
    
    # Optional inputs
    features: AccountFeatureVector | None = None
    context: dict[str, Any] = Field(default_factory=dict)


class RetentionResponse(BaseModel):
    """Unified retention agent response."""
    success: bool
    action: str
    
    data: dict[str, Any] = Field(default_factory=dict)
    trace: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    
    # For scoring results
    scores: list[RiskAssessmentOutput] = Field(default_factory=list)
    
    # For intervention planning
    interventions: list[InterventionPlaybookOutput] = Field(default_factory=list)
    approval_requests: list[ApprovalRequest] = Field(default_factory=list)
