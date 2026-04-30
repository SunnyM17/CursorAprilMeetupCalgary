"""Render + export the project: terminal, Markdown, JSON, Jira-import CSV."""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Any

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "project"


def render_terminal(project: dict[str, Any]) -> None:
    p = project.get("project", {})
    console.print()
    console.print(
        Panel.fit(
            f"[bold cyan]{p.get('name', 'Project')}[/bold cyan]  "
            f"[dim]({p.get('key', '?')})[/dim]\n{p.get('summary', '')}",
            border_style="cyan",
        )
    )
    if p.get("vision"):
        console.print(f"[italic]Vision:[/italic] {p['vision']}\n")

    for epic in project.get("epics", []):
        console.print(
            f"\n[bold yellow]{epic.get('id', '?')} — {epic.get('title', '')}[/bold yellow]"
        )
        if epic.get("rationale"):
            console.print(f"  [dim]{epic['rationale']}[/dim]")
        table = Table(show_lines=False, pad_edge=False)
        for col in ("ID", "Story", "Specialty", "Assignee", "Pts", "Deps", "Sub"):
            table.add_column(col, overflow="fold")
        for s in epic.get("stories", []):
            table.add_row(
                s.get("id", ""),
                str(s.get("title", ""))[:60],
                s.get("specialty", ""),
                s.get("assignee", ""),
                str(s.get("estimate_points", "")),
                ", ".join(s.get("depends_on", []) or []),
                str(len(s.get("subtasks", []) or [])),
            )
        console.print(table)

    plan = project.get("execution_plan", {})
    if plan.get("critical_path"):
        console.print(
            f"\n[bold]Critical path:[/bold] {' → '.join(plan['critical_path'])}"
        )

    load = plan.get("_load_by_member", {})
    if load:
        console.print("[bold]Load by member (story points):[/bold]")
        for m, v in sorted(load.items(), key=lambda x: -x[1]):
            console.print(f"  • {m}: {v:g}")

    dag = plan.get("_dag_report", {})
    if dag and not dag.get("ok"):
        if dag.get("unknown_refs"):
            console.print("[red]Unknown deps:[/red]", dag["unknown_refs"])
        if dag.get("cycles"):
            console.print("[red]Cycles:[/red]", dag["cycles"])

    for r in plan.get("risks", []) or []:
        console.print(f"[yellow]Risk:[/yellow] {r.get('risk', '')}")
        console.print(f"  ↳ {r.get('mitigation', '')}")

    saved = plan.get("estimated_time_saved_minutes")
    if saved:
        console.print(
            f"\n[bold green]⏱  Estimated planning time saved: ~{saved} min[/bold green]"
        )


def to_markdown(project: dict[str, Any]) -> str:
    p = project.get("project", {})
    out = [
        f"# {p.get('name', 'Project')} ({p.get('key', '?')})",
        "",
        p.get("summary", ""),
        "",
    ]
    if p.get("vision"):
        out.append(f"**Vision:** {p['vision']}\n")

    team = project.get("team", [])
    if team:
        out.append("## Team")
        for m in team:
            specs = ", ".join(m.get("specialties", []))
            out.append(f"- **{m.get('name', '?')}** — {specs} ({m.get('capacity_pct', 100)}%)")
        out.append("")

    for epic in project.get("epics", []):
        out.append(f"## {epic.get('id', '?')} — {epic.get('title', '')}")
        if epic.get("rationale"):
            out.append(f"_{epic['rationale']}_\n")
        out.append("| ID | Story | Specialty | Assignee | Points | Depends On |")
        out.append("|---|---|---|---|---|---|")
        for s in epic.get("stories", []):
            deps = ", ".join(s.get("depends_on", []) or []) or "—"
            out.append(
                f"| {s.get('id', '')} | {s.get('title', '')} | "
                f"{s.get('specialty', '')} | {s.get('assignee', '')} | "
                f"{s.get('estimate_points', '')} | {deps} |"
            )
            for t in s.get("subtasks", []) or []:
                out.append(
                    f"|  ↳ {t.get('id', '')} | {t.get('title', '')} | — | — | "
                    f"{t.get('estimate_hours', '')}h | — |"
                )
        out.append("")

    plan = project.get("execution_plan", {})
    if plan.get("critical_path"):
        out.append(f"**Critical path:** {' → '.join(plan['critical_path'])}\n")
    for ph in plan.get("phases", []) or []:
        out.append(f"### Phase {ph.get('phase', '?')}")
        for tr in ph.get("parallel_tracks", []) or []:
            out.append(
                f"- {tr.get('member', '?')}: {', '.join(tr.get('story_ids', []))}"
            )
        if ph.get("rationale"):
            out.append(f"_{ph['rationale']}_")
        out.append("")
    risks = plan.get("risks", []) or []
    if risks:
        out.append("## Risks & Mitigations")
        for r in risks:
            out.append(f"- **{r.get('risk', '')}** — {r.get('mitigation', '')}")
        out.append("")
    saved = plan.get("estimated_time_saved_minutes")
    if saved:
        out.append(f"**Estimated planning time saved:** ~{saved} min")

    return "\n".join(out).rstrip() + "\n"


def to_jira_csv_rows(project: dict[str, Any]) -> list[dict[str, str]]:
    """Rows shaped for Jira's CSV importer.

    Columns: Issue Type, Summary, Description, Epic Name, Epic Link,
             Assignee, Story Points, Labels, Depends On, Parent
    """
    rows: list[dict[str, str]] = []
    project_key = project.get("project", {}).get("key", "PROJ")

    for epic in project.get("epics", []):
        epic_id = epic.get("id", "")
        epic_summary = epic.get("title", "")
        rows.append(
            {
                "Issue Type": "Epic",
                "Summary": epic_summary,
                "Description": epic.get("rationale", ""),
                "Epic Name": epic_summary,
                "Epic Link": "",
                "Assignee": "",
                "Story Points": "",
                "Labels": project_key,
                "Depends On": "",
                "Parent": "",
                "External ID": epic_id,
            }
        )
        for s in epic.get("stories", []):
            rows.append(
                {
                    "Issue Type": "Story",
                    "Summary": s.get("title", ""),
                    "Description": s.get("description", ""),
                    "Epic Name": "",
                    "Epic Link": epic_id,
                    "Assignee": s.get("assignee", ""),
                    "Story Points": str(s.get("estimate_points", "")),
                    "Labels": s.get("specialty", ""),
                    "Depends On": ",".join(s.get("depends_on", []) or []),
                    "Parent": "",
                    "External ID": s.get("id", ""),
                }
            )
            for t in s.get("subtasks", []) or []:
                rows.append(
                    {
                        "Issue Type": "Sub-task",
                        "Summary": t.get("title", ""),
                        "Description": "",
                        "Epic Name": "",
                        "Epic Link": "",
                        "Assignee": s.get("assignee", ""),
                        "Story Points": "",
                        "Labels": "",
                        "Depends On": "",
                        "Parent": s.get("id", ""),
                        "External ID": t.get("id", ""),
                    }
                )
    return rows


def export_all(project: dict[str, Any], out_dir: Path) -> dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    name = slugify(project.get("project", {}).get("name", "project"))

    # Strip private debug fields from JSON export
    clean = json.loads(json.dumps(project))
    plan = clean.get("execution_plan", {})
    for k in list(plan):
        if k.startswith("_"):
            plan.pop(k)

    json_path = out_dir / f"{name}.json"
    md_path = out_dir / f"{name}.md"
    csv_path = out_dir / f"{name}.csv"

    json_path.write_text(json.dumps(clean, indent=2))
    md_path.write_text(to_markdown(project))

    rows = to_jira_csv_rows(project)
    if rows:
        with csv_path.open("w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

    return {"json": json_path, "md": md_path, "csv": csv_path}
