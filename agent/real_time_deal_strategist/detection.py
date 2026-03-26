from __future__ import annotations

import re
from dataclasses import dataclass

from .competitor_registry import Competitor
from .models import Evidence
from .text_normalize import normalize_text, snippet_around


@dataclass(frozen=True)
class CompetitorHit:
    competitor: Competitor
    matched_keywords: list[str]
    evidence: list[Evidence]


_OBJECTION_RULES: list[tuple[str, re.Pattern[str]]] = [
    ("pricing", re.compile(r"\b(cheaper|too\s+expensive|price|pricing|discount|cost|20%\s+cheaper|higher\s+than)\b", re.I)),
    ("migration", re.compile(r"\b(migration|migrate|data\s+migration|switching\s+cost)\b", re.I)),
    ("implementation", re.compile(r"\b(implementation|implement|rollout|go\s*live|time\s*to\s*value)\b", re.I)),
    ("security", re.compile(r"\b(security|compliance|soc\s*2|gdpr|hipaa|encryption)\b", re.I)),
    ("integrations", re.compile(r"\b(integration|integrations|api|connectors|native\s+integration)\b", re.I)),
]


def detect_objections(text: str) -> list[str]:
    found: list[str] = []
    for name, pattern in _OBJECTION_RULES:
        if pattern.search(text):
            found.append(name)
    return found


def _compile_keyword_patterns(registry: list[Competitor]) -> dict[str, re.Pattern[str]]:
    # Word-boundary match for each keyword; escape literals.
    patterns: dict[str, re.Pattern[str]] = {}
    for comp in registry:
        for kw in comp.keywords:
            kw_norm = kw.strip().lower()
            if not kw_norm or kw_norm in patterns:
                continue
            patterns[kw_norm] = re.compile(r"\b" + re.escape(kw_norm) + r"\b", re.I)
    return patterns


def detect_competitors(
    *,
    opportunity_description: str | None,
    engagements: list[dict],
    registry: list[Competitor],
) -> tuple[list[CompetitorHit], list[str]]:
    keyword_patterns = _compile_keyword_patterns(registry)

    competitor_hits: dict[str, CompetitorHit] = {}
    objections: set[str] = set()

    # 1) Opportunity description (highest value signal for MVP)
    desc = normalize_text(opportunity_description)
    if desc:
        objections.update(detect_objections(desc))
        for comp in registry:
            matched: list[str] = []
            evidences: list[Evidence] = []
            for kw in comp.keywords:
                kw_norm = kw.strip().lower()
                pattern = keyword_patterns.get(kw_norm)
                if not pattern:
                    continue
                for m in pattern.finditer(desc):
                    matched.append(kw)
                    evidences.append(
                        Evidence(
                            source="opportunity.description",
                            snippet=snippet_around(desc, m.start(), m.end()),
                            engagement_id=None,
                            occurred_at=None,
                        )
                    )
            if matched:
                competitor_hits[comp.name] = CompetitorHit(
                    competitor=comp,
                    matched_keywords=sorted(set(matched), key=str.lower),
                    evidence=evidences,
                )

    # 2) Engagement content (notes/emails)
    for raw in engagements:
        content = normalize_text(raw.get("content"))
        if not content:
            continue

        objections.update(detect_objections(content))

        for comp in registry:
            matched: list[str] = []
            evidences: list[Evidence] = []
            for kw in comp.keywords:
                kw_norm = kw.strip().lower()
                pattern = keyword_patterns.get(kw_norm)
                if not pattern:
                    continue
                for m in pattern.finditer(content):
                    matched.append(kw)
                    evidences.append(
                        Evidence(
                            source="engagement.content",
                            snippet=snippet_around(content, m.start(), m.end()),
                            engagement_id=str(raw.get("id")) if raw.get("id") else None,
                            occurred_at=str(raw.get("occurred_at")) if raw.get("occurred_at") else None,
                        )
                    )

            if not matched:
                continue

            if comp.name in competitor_hits:
                existing = competitor_hits[comp.name]
                competitor_hits[comp.name] = CompetitorHit(
                    competitor=existing.competitor,
                    matched_keywords=sorted(
                        set(existing.matched_keywords + matched),
                        key=str.lower,
                    ),
                    evidence=existing.evidence + evidences,
                )
            else:
                competitor_hits[comp.name] = CompetitorHit(
                    competitor=comp,
                    matched_keywords=sorted(set(matched), key=str.lower),
                    evidence=evidences,
                )

    # Deterministic ordering by number of evidence hits
    hits = sorted(competitor_hits.values(), key=lambda h: len(h.evidence), reverse=True)
    return hits, sorted(objections)
