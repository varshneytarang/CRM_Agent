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
    Competitor(
        name="HubSpot",
        keywords=["hubspot", "hub spot"],
        strengths=[
            "Strong SMB-friendly all-in-one CRM + marketing ecosystem",
            "Fast onboarding and intuitive UX",
        ],
        weaknesses=[
            "Advanced enterprise workflows can require paid tiers/add-ons",
            "Complex multi-region governance can require customization",
        ],
        landmine_questions=[
            "How will you handle advanced approval/governance workflows as your org scales?",
            "What is your plan for avoiding reporting blind spots across custom objects/processes?",
            "Which capabilities require tier upgrades over the next 12 months?",
        ],
        pricing_objection_handler=(
            "Anchor on ramp speed and revenue impact, then compare full operating cost at your target scale. "
            "Clarify required tiers/integrations up front to avoid hidden expansion costs."
        ),
    ),
    Competitor(
        name="Microsoft Dynamics 365",
        keywords=["dynamics", "dynamics 365", "ms dynamics"],
        strengths=[
            "Deep Microsoft ecosystem integration",
            "Strong enterprise flexibility and extensibility",
        ],
        weaknesses=[
            "Implementation complexity can delay time-to-value",
            "Customization and admin overhead can become heavy",
        ],
        landmine_questions=[
            "How long can the team wait before seeing measurable pipeline improvement?",
            "Who will own long-term customization and admin maintenance?",
            "How will adoption risk be managed across sales and RevOps users?",
        ],
        pricing_objection_handler=(
            "Discuss implementation and maintenance overhead alongside license cost. "
            "Position faster adoption and lower operational complexity as part of TCO."
        ),
    ),
    Competitor(
        name="Zoho CRM",
        keywords=["zoho", "zoho crm"],
        strengths=[
            "Cost-effective pricing for many SMB use cases",
            "Broad app suite coverage",
        ],
        weaknesses=[
            "Complex enterprise data models may require significant tailoring",
            "Advanced forecasting/governance patterns can be harder to standardize",
        ],
        landmine_questions=[
            "How will you maintain consistent forecasting quality across teams and regions?",
            "What is the plan for advanced governance and auditability requirements?",
            "How will you handle complex integration orchestration at scale?",
        ],
        pricing_objection_handler=(
            "Acknowledge seat-price advantage, then compare on forecasting reliability, governance, "
            "and long-term integration/operations effort."
        ),
    ),
]
