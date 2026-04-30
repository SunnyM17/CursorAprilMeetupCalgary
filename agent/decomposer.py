"""LLM call + JSON extraction."""
from __future__ import annotations

import json
import os
import re
from typing import Any

from openai import OpenAI

from .prompt_builder import SYSTEM_PROMPT

_client: OpenAI | None = None


def _client_lazy() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI()
    return _client


def chat(messages: list[dict[str, str]]) -> str:
    """Send messages to the LLM, return assistant text."""
    model = os.getenv("OPENAI_MODEL", "gpt-4o")
    full = [{"role": "system", "content": SYSTEM_PROMPT}, *messages]
    resp = _client_lazy().chat.completions.create(
        model=model,
        messages=full,
        temperature=0.3,
    )
    return resp.choices[0].message.content or ""


def extract_project_json(text: str) -> dict[str, Any] | None:
    """Find and parse the first balanced { ... } JSON object in the response."""
    text = text.strip()

    fence = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fence:
        text = fence.group(1)

    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(text)):
        c = text[i]
        if in_string:
            if escape:
                escape = False
            elif c == "\\":
                escape = True
            elif c == '"':
                in_string = False
            continue
        if c == '"':
            in_string = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                candidate = text[start : i + 1]
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    return None
    return None
