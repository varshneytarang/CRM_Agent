from __future__ import annotations

from urllib.parse import urlparse

import requests

from common.config import get_settings
from common.schemas import CompanyProfile, ContactProfile, LeadProfile


def _extract_domain(url: str) -> str | None:
    if not url:
        return None
    parsed = urlparse(url)
    host = parsed.netloc.lower().strip()
    if host.startswith("www."):
        host = host[4:]
    return host or None


def serper_search(query: str, limit: int = 5) -> list[dict]:
    settings = get_settings()
    if not settings.serper_api_key:
        return []

    response = requests.post(
        "https://google.serper.dev/search",
        headers={
            "X-API-KEY": settings.serper_api_key,
            "Content-Type": "application/json",
        },
        json={"q": query, "num": max(1, min(limit, 10))},
        timeout=20,
    )
    response.raise_for_status()
    payload = response.json()
    return payload.get("organic", []) if isinstance(payload, dict) else []


def discover_targets_from_public_data(
    userid: str,
    industry: str,
    keyword: str,
    limit: int = 5,
) -> list[LeadProfile]:
    query = " ".join([part for part in [industry, keyword, "B2B company"] if part]).strip() or "B2B SaaS company"
    organic = serper_search(query, limit=limit)

    leads: list[LeadProfile] = []
    for i, row in enumerate(organic[:limit], start=1):
        title = str(row.get("title") or "").strip() or f"Prospect {i}"
        link = str(row.get("link") or "").strip()
        snippet = str(row.get("snippet") or "").strip()
        domain = _extract_domain(link)

        company = CompanyProfile(
            name=title,
            domain=domain,
            industry=industry or "Unknown",
            employee_count=None,
            tech_stack=[],
        )
        contact = ContactProfile(
            full_name=f"Prospect Contact {i}",
            title="Decision Maker",
            email=None,
            linkedin_url=None,
        )
        lead = LeadProfile(
            lead_id=f"{userid}-serper-{i}",
            company=company,
            contact=contact,
            source=f"serper:{snippet[:120]}" if snippet else "serper",
        )
        leads.append(lead)

    if leads:
        return leads

    fallback_company = CompanyProfile(
        name="Fallback Prospect",
        domain=None,
        industry=industry or "Unknown",
        employee_count=None,
        tech_stack=[],
    )
    fallback_contact = ContactProfile(
        full_name="Fallback Contact",
        title="Ops Leader",
        email=None,
        linkedin_url=None,
    )
    return [
        LeadProfile(
            lead_id=f"{userid}-fallback-1",
            company=fallback_company,
            contact=fallback_contact,
            source="fallback",
        )
    ]


def enrich_company_with_apollo(company: CompanyProfile) -> CompanyProfile:
    settings = get_settings()
    if not settings.apollo_api_key or not company.domain:
        return company

    try:
        response = requests.post(
            "https://api.apollo.io/api/v1/organizations/enrich",
            headers={
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
                "X-Api-Key": settings.apollo_api_key,
            },
            json={"domain": company.domain},
            timeout=20,
        )

        if response.status_code >= 400:
            return company

        payload = response.json() if response.content else {}
        org = payload.get("organization") if isinstance(payload, dict) else None
        if not isinstance(org, dict):
            return company

        return CompanyProfile(
            name=str(org.get("name") or company.name),
            domain=str(org.get("primary_domain") or company.domain or "") or company.domain,
            industry=str(org.get("industry") or company.industry or "") or company.industry,
            employee_count=(
                int(org.get("estimated_num_employees"))
                if isinstance(org.get("estimated_num_employees"), (int, float))
                else company.employee_count
            ),
            tech_stack=company.tech_stack,
        )
    except Exception:
        return company


def firecrawl_extract_summary(url: str) -> str | None:
    settings = get_settings()
    if not settings.firecrawl_api_key or not url:
        return None

    try:
        response = requests.post(
            "https://api.firecrawl.dev/v1/scrape",
            headers={
                "Authorization": f"Bearer {settings.firecrawl_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "url": url,
                "formats": ["markdown"],
                "onlyMainContent": True,
            },
            timeout=30,
        )

        if response.status_code >= 400:
            return None

        payload = response.json() if response.content else {}
        if not isinstance(payload, dict):
            return None

        data = payload.get("data")
        if not isinstance(data, dict):
            return None

        markdown = data.get("markdown")
        if not isinstance(markdown, str) or not markdown.strip():
            return None

        text = " ".join(markdown.split())
        return text[:480]
    except Exception:
        return None
