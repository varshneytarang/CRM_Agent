from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Competitor:
    name: str
    keywords: list[str]
    strengths: list[str]
    weaknesses: list[str]
    landmine_questions: list[str]
    pricing_objection_handler: str


# MVP registry (static). Move to DB in v1.
DEFAULT_REGISTRY: list[Competitor] = [
    Competitor(
        name="Salesforce",
        keywords=["salesforce", "sfdc"],
        strengths=[
            "Highly configurable enterprise CRM",
            "Large ecosystem and marketplace",
        ],
        weaknesses=[
            "Complex implementations can be slow",
            "Total cost often increases with add-ons",
        ],
        landmine_questions=[
            "How long can you afford to wait for full adoption and ROI?",
            "What is the plan to avoid admin/config complexity as requirements change?",
            "How will you ensure data quality across objects and automations?",
        ],
        pricing_objection_handler=(
            "Frame total cost of ownership: implementation time, admin overhead, and add-ons. "
            "Offer a clear rollout plan with measurable milestones and fast time-to-value."
        ),
    ),
    Competitor(
        name="Zendesk",
        keywords=["zendesk"],
        strengths=[
            "Strong support ticketing workflows",
            "Broad helpdesk feature set",
        ],
        weaknesses=[
            "CRM-style revenue workflows may require customization",
            "Reporting across sales + support can be fragmented",
        ],
        landmine_questions=[
            "How will you unify revenue and support data for a single customer view?",
            "What happens when you need complex sales forecasting and pipeline governance?",
            "How will you measure time-to-value beyond ticket metrics?",
        ],
        pricing_objection_handler=(
            "Compare outcomes, not seat price: resolution time, retention impact, and expansion workflows. "
            "Highlight bundled capabilities and reduced tool sprawl."
        ),
    ),
]
