from __future__ import annotations

import re


_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def strip_html(text: str) -> str:
    # MVP: simple tag stripping. If you need robustness later, add a HTML parser dependency.
    return _TAG_RE.sub(" ", text)


def normalize_text(text: str | None) -> str:
    if not text:
        return ""
    cleaned = strip_html(text)
    cleaned = cleaned.replace("\u00a0", " ")
    cleaned = _WS_RE.sub(" ", cleaned).strip()
    return cleaned


def snippet_around(text: str, start: int, end: int, radius: int = 90) -> str:
    left = max(0, start - radius)
    right = min(len(text), end + radius)
    snippet = text[left:right].strip()
    if left > 0:
        snippet = "…" + snippet
    if right < len(text):
        snippet = snippet + "…"
    return snippet
