from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    groq_api_key: str
    groq_fast_model: str
    groq_personalization_model: str
    public_search_provider: str
    serper_api_key: str
    apollo_api_key: str
    firecrawl_api_key: str
    enrichment_provider: str
    email_provider: str
    observability_provider: str
    human_approval_required: bool


def get_settings() -> Settings:
    return Settings(
        groq_api_key=os.getenv("GROQ_API_KEY", ""),
        groq_fast_model=os.getenv("GROQ_FAST_MODEL", "llama-3.1-8b-instant"),
        groq_personalization_model=os.getenv("GROQ_PERSONALIZATION_MODEL", "llama-3.3-70b-versatile"),
        public_search_provider=os.getenv("PUBLIC_SEARCH_PROVIDER", "serper"),
        serper_api_key=os.getenv("SERPER_API_KEY", ""),
        apollo_api_key=os.getenv("APOLLO_API_KEY", ""),
        firecrawl_api_key=os.getenv("FIRECRAWL_API_KEY", ""),
        enrichment_provider=os.getenv("ENRICHMENT_PROVIDER", "apollo"),
        email_provider=os.getenv("EMAIL_PROVIDER", "resend"),
        observability_provider=os.getenv("OBSERVABILITY_PROVIDER", "langfuse"),
        human_approval_required=os.getenv("HUMAN_APPROVAL_REQUIRED", "true").lower() == "true",
    )
