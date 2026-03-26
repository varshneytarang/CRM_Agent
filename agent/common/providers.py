from __future__ import annotations

from dataclasses import dataclass

from common.config import get_settings


@dataclass
class ProviderPlan:
    enrichment: str
    firmographic_signal: list[str]
    intent_signal: list[str]
    public_research: str
    crawler: str
    email_verification: str
    email_sending: str
    calendar_handoff: str


def get_provider_plan() -> ProviderPlan:
    settings = get_settings()
    return ProviderPlan(
        enrichment=settings.enrichment_provider,
        firmographic_signal=["builtwith", "similarweb", "crunchbase"],
        intent_signal=["bombora", "g2", "first_party_site_events"],
        public_research=settings.public_search_provider,
        crawler="firecrawl",
        email_verification="neverbounce",
        email_sending=settings.email_provider,
        calendar_handoff="calendly",
    )
