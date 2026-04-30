"""Conversation + project state."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class TeamMember:
    name: str
    specialties: list[str]
    capacity_pct: int = 100


@dataclass
class Session:
    messages: list[dict[str, str]] = field(default_factory=list)
    idea: str = ""
    clarifications: dict[str, str] = field(default_factory=dict)
    team: list[TeamMember] = field(default_factory=list)
    project: dict[str, Any] | None = None
    push_enabled: bool = False

    def add_user(self, content: str) -> None:
        self.messages.append({"role": "user", "content": content})

    def add_assistant(self, content: str) -> None:
        self.messages.append({"role": "assistant", "content": content})

    def team_as_json(self) -> list[dict[str, Any]]:
        return [
            {"name": m.name, "specialties": m.specialties, "capacity_pct": m.capacity_pct}
            for m in self.team
        ]
