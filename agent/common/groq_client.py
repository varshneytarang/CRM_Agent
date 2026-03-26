from __future__ import annotations

import json
import os
from typing import Any

import requests
try:
    from langfuse import Langfuse
except ImportError:
    Langfuse = None

from common.config import get_settings


class GroqClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        
        # Initialize Langfuse if API key is configured
        langfuse_key = os.getenv("LANGFUSE_SECRET_KEY")
        langfuse_public = os.getenv("LANGFUSE_PUBLIC_KEY")
        if langfuse_key and langfuse_public and Langfuse is not None:
            self.langfuse = Langfuse(
                secret_key=langfuse_key,
                public_key=langfuse_public,
            )
        else:
            self.langfuse = None

    def _call(self, model: str, messages: list[dict[str, str]], temperature: float = 0.2) -> str:
        if not self.settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is not configured")

        # Start Langfuse trace if available
        trace_name = f"groq_{model.replace('-', '_')}"
        span = None
        if self.langfuse:
            span = self.langfuse.span(
                name=trace_name,
                input={"messages": messages, "model": model, "temperature": temperature},
            )

        try:
            response = requests.post(
                self.base_url,
                headers={
                    "Authorization": f"Bearer {self.settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                },
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            result = data["choices"][0]["message"]["content"]
            
            # Log successful call to Langfuse
            if span:
                span.end(output={"content": result})
            
            return result
        except Exception as e:
            # Log error to Langfuse
            if span:
                span.end(output={"error": str(e)})
            raise

    def call_fast(self, messages: list[dict[str, str]], temperature: float = 0.1) -> str:
        return self._call(self.settings.groq_fast_model, messages, temperature)

    def call_personalization(self, messages: list[dict[str, str]], temperature: float = 0.5) -> str:
        return self._call(self.settings.groq_personalization_model, messages, temperature)

    @staticmethod
    def parse_json_strict(raw: str) -> dict[str, Any]:
        text = raw.strip()
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("No JSON object found in model output")
        return json.loads(text[start : end + 1])
