from __future__ import annotations

from dataclasses import dataclass
from typing import Any
import urllib.parse

import requests


@dataclass(frozen=True)
class ResearchSnippet:
    source: str
    text: str


_DUCK_URL = "https://api.duckduckgo.com/"
_WIKI_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/"


def _clip(text: str, limit: int = 280) -> str:
    cleaned = " ".join(str(text or "").split()).strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1] + "…"


def _query_duckduckgo(query: str) -> list[ResearchSnippet]:
    try:
        res = requests.get(
            _DUCK_URL,
            params={
                "q": query,
                "format": "json",
                "no_html": 1,
                "skip_disambig": 1,
            },
            timeout=8,
        )
        if res.status_code >= 400:
            return []
        payload = res.json()
    except (requests.RequestException, ValueError):
        return []

    snippets: list[ResearchSnippet] = []

    abstract = _clip(str(payload.get("AbstractText") or ""), 320)
    if abstract:
        snippets.append(ResearchSnippet(source="duckduckgo", text=abstract))

    related = payload.get("RelatedTopics")
    if isinstance(related, list):
        for item in related[:4]:
            if not isinstance(item, dict):
                continue
            text = _clip(str(item.get("Text") or ""), 240)
            if text:
                snippets.append(ResearchSnippet(source="duckduckgo", text=text))

    return snippets[:4]


def _query_wikipedia(title: str) -> list[ResearchSnippet]:
    if not title.strip():
        return []
    encoded = urllib.parse.quote(title.strip().replace(" ", "_"), safe="")
    try:
        res = requests.get(_WIKI_SUMMARY_URL + encoded, timeout=8)
        if res.status_code >= 400:
            return []
        payload = res.json()
    except (requests.RequestException, ValueError):
        return []

    extract = _clip(str(payload.get("extract") or ""), 320)
    if not extract:
        return []
    return [ResearchSnippet(source="wikipedia", text=extract)]


def research_competitor_context(competitor_name: str) -> list[ResearchSnippet]:
    """Return concise external snippets for a competitor.

    This is best-effort enrichment only; failures return an empty list.
    """
    candidate = str(competitor_name or "").strip()
    if not candidate:
        return []

    snippets: list[ResearchSnippet] = []
    snippets.extend(_query_duckduckgo(f"{candidate} crm company overview"))
    snippets.extend(_query_wikipedia(candidate))

    deduped: list[ResearchSnippet] = []
    seen: set[str] = set()
    for item in snippets:
        key = item.text.lower().strip()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(item)

    return deduped[:6]
