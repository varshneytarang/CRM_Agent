from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Literal

import requests

ThreatLevel = Literal["low", "medium", "high"]


@dataclass(frozen=True)
class GroqStrategyResult:
    threat_level: ThreatLevel
    deal_tip: str
    landmine_indexes: list[int]
    note_summary: str


class GroqError(RuntimeError):
    pass


def _clip(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 1] + "…"


def _ensure_threat(value: Any) -> ThreatLevel:
    if value in {"low", "medium", "high"}:
        return value
    raise GroqError(f"Invalid threat_level: {value!r}")


def _ensure_indexes(value: Any, *, max_len: int) -> list[int]:
    if not isinstance(value, list):
        raise GroqError("landmine_indexes must be a list")
    out: list[int] = []
    for item in value:
        if isinstance(item, int):
            out.append(item)
        elif isinstance(item, str) and item.strip().isdigit():
            out.append(int(item.strip()))
        else:
            raise GroqError(f"Invalid index: {item!r}")
    # de-dupe while preserving order
    deduped: list[int] = []
    for idx in out:
        if idx not in deduped:
            deduped.append(idx)
    return deduped[:max_len]


def call_groq_for_strategy(
    *,
    opportunity_name: str,
    opportunity_description: str,
    competitor_name: str,
    evidence_snippets: list[str],
    objections: list[str],
    landmine_questions: list[str],
) -> GroqStrategyResult:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise GroqError("GROQ_API_KEY is not set")

    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    # Keep prompt tight and grounded in provided text.
    evidence_block = "\n".join(f"- { _clip(s, 220) }" for s in evidence_snippets[:8])
    landmine_block = "\n".join(
        f"[{i}] { _clip(q, 200) }" for i, q in enumerate(landmine_questions)
    )

    system = (
        "You are a Real-time Deal Strategist for sales reps. "
        "You must only use the provided deal context and competitor battlecard questions. "
        "Return STRICT JSON only (no markdown, no commentary)."
    )

    user = f"""
Opportunity: {opportunity_name}
Competitor detected: {competitor_name}
Known objection tags (heuristic): {', '.join(objections) if objections else 'none'}

Opportunity description (may be empty):
{_clip(opportunity_description, 1200)}

Evidence snippets:
{evidence_block if evidence_block else '- (none)'}

Candidate landmine questions (select up to 3 by index):
{landmine_block if landmine_block else '(none)'}

TASK:
1) Decide threat_level: low|medium|high.
2) Write one deal_tip (max 240 chars) tailored to this opportunity.
3) Select best landmine_indexes (0-based) from the list above (max 3).
4) Write note_summary (2-4 sentences) suitable for a HubSpot NOTE.

Output JSON schema:
{{
  "threat_level": "low|medium|high",
  "deal_tip": "...",
  "landmine_indexes": [0, 2, 5],
  "note_summary": "..."
}}
""".strip()

    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": model,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {"type": "json_object"},
    }

    try:
        res = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            data=json.dumps(payload),
            timeout=20,
        )
    except requests.RequestException as e:
        raise GroqError(str(e)) from e

    if res.status_code >= 400:
        raise GroqError(f"Groq API error {res.status_code}: {res.text}")

    data = res.json()
    content = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )

    if not isinstance(content, str) or not content.strip():
        raise GroqError("Empty Groq response")

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as e:
        raise GroqError(f"Invalid JSON from Groq: {e}") from e

    threat = _ensure_threat(parsed.get("threat_level"))

    deal_tip = parsed.get("deal_tip")
    if not isinstance(deal_tip, str) or not deal_tip.strip():
        raise GroqError("deal_tip missing")
    deal_tip = _clip(deal_tip.strip(), 240)

    note_summary = parsed.get("note_summary")
    if not isinstance(note_summary, str) or not note_summary.strip():
        raise GroqError("note_summary missing")
    note_summary = _clip(note_summary.strip(), 700)

    indexes = _ensure_indexes(parsed.get("landmine_indexes", []), max_len=3)

    # keep only valid indexes
    indexes = [i for i in indexes if 0 <= i < len(landmine_questions)]

    return GroqStrategyResult(
        threat_level=threat,
        deal_tip=deal_tip,
        landmine_indexes=indexes,
        note_summary=note_summary,
    )
