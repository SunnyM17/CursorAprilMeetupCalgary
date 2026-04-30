"""User intake: idea + team roster."""
from __future__ import annotations

import sys

from rich.console import Console
from rich.prompt import IntPrompt, Prompt

from .session import Session, TeamMember

console = Console()


def read_multiline(prompt: str) -> str:
    console.print(f"[bold]{prompt}[/bold] [dim](end with a line containing only 'END')[/dim]")
    lines: list[str] = []
    for line in sys.stdin:
        if line.strip() == "END":
            break
        lines.append(line.rstrip("\n"))
    return "\n".join(lines).strip()


def gather_idea(session: Session) -> None:
    idea = read_multiline("Describe your idea:")
    if not idea:
        idea = Prompt.ask("Idea (one line)")
    session.idea = idea


def gather_team(session: Session) -> None:
    console.print("\n[bold]Team roster[/bold]")
    n = IntPrompt.ask("How many people are on the team?", default=3)

    for i in range(1, n + 1):
        console.print(f"\n[cyan]Member {i}/{n}[/cyan]")
        name = Prompt.ask("  Name", default=f"Member{i}")
        specs_raw = Prompt.ask(
            "  Specialties (comma-separated, e.g. backend, devops)",
            default="generalist",
        )
        specialties = [s.strip().lower() for s in specs_raw.split(",") if s.strip()]
        capacity = IntPrompt.ask("  Capacity %", default=100)
        session.team.append(
            TeamMember(name=name, specialties=specialties, capacity_pct=capacity)
        )

    console.print(f"\n[green]✓ Team registered ({len(session.team)} members).[/green]")
