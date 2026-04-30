"""Post-processing: DAG validation, critical path, load balance check.

Pure-Python — no LLM. Operates on the project dict produced by `decomposer`.
"""
from __future__ import annotations

from typing import Any


def all_stories(project: dict[str, Any]) -> list[dict[str, Any]]:
    return [s for epic in project.get("epics", []) for s in epic.get("stories", [])]


def validate_dag(project: dict[str, Any]) -> dict[str, Any]:
    """Check that every depends_on refers to a real story and there are no cycles.

    Returns a report dict with `unknown_refs`, `cycles`, and `ok`.
    """
    stories = all_stories(project)
    by_id = {s["id"]: s for s in stories}

    unknown_refs: list[tuple[str, str]] = []
    for s in stories:
        for dep in s.get("depends_on", []) or []:
            if dep not in by_id:
                unknown_refs.append((s["id"], dep))

    # Cycle detection via DFS
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {sid: WHITE for sid in by_id}
    cycles: list[list[str]] = []

    def dfs(sid: str, stack: list[str]) -> None:
        color[sid] = GRAY
        stack.append(sid)
        for dep in by_id[sid].get("depends_on", []) or []:
            if dep not in by_id:
                continue
            if color[dep] == GRAY:
                # cycle: extract from stack
                if dep in stack:
                    cycles.append(stack[stack.index(dep) :] + [dep])
            elif color[dep] == WHITE:
                dfs(dep, stack)
        stack.pop()
        color[sid] = BLACK

    for sid in by_id:
        if color[sid] == WHITE:
            dfs(sid, [])

    return {
        "unknown_refs": unknown_refs,
        "cycles": cycles,
        "ok": not unknown_refs and not cycles,
    }


def critical_path(project: dict[str, Any]) -> list[str]:
    """Longest dependency chain by estimate_points."""
    stories = all_stories(project)
    by_id = {s["id"]: s for s in stories}

    memo: dict[str, tuple[float, list[str]]] = {}

    def longest(sid: str) -> tuple[float, list[str]]:
        if sid in memo:
            return memo[sid]
        s = by_id.get(sid)
        if s is None:
            memo[sid] = (0, [])
            return memo[sid]
        best_cost = 0.0
        best_path: list[str] = []
        for dep in s.get("depends_on", []) or []:
            cost, path = longest(dep)
            if cost > best_cost:
                best_cost = cost
                best_path = path
        pts = float(s.get("estimate_points") or 0)
        memo[sid] = (best_cost + pts, [*best_path, sid])
        return memo[sid]

    if not by_id:
        return []
    best = max((longest(sid) for sid in by_id), key=lambda x: x[0])
    return best[1]


def load_by_member(project: dict[str, Any]) -> dict[str, float]:
    totals: dict[str, float] = {}
    for s in all_stories(project):
        a = s.get("assignee") or "Unassigned"
        totals[a] = totals.get(a, 0.0) + float(s.get("estimate_points") or 0)
    return totals


def annotate(project: dict[str, Any]) -> dict[str, Any]:
    """Return a copy of project with execution_plan.critical_path filled in if missing."""
    plan = project.setdefault("execution_plan", {})
    if not plan.get("critical_path"):
        plan["critical_path"] = critical_path(project)
    plan["_load_by_member"] = load_by_member(project)
    plan["_dag_report"] = validate_dag(project)
    return project
