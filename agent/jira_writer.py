"""Optional live push to Jira. Only invoked when --push / /push is used.

This is a thin wrapper that creates Epics, Stories, and Sub-tasks in an
existing Jira project (`JIRA_PROJECT_KEY`). It does NOT create the Jira project
itself (that requires admin privileges and varies by Jira deployment).
"""
from __future__ import annotations

import os
from typing import Any


def has_credentials() -> bool:
    return all(
        os.getenv(k)
        for k in ("JIRA_URL", "JIRA_EMAIL", "JIRA_TOKEN", "JIRA_PROJECT_KEY")
    )


def diff_summary(project: dict[str, Any]) -> str:
    n_epics = len(project.get("epics", []))
    n_stories = sum(len(e.get("stories", [])) for e in project.get("epics", []))
    n_subs = sum(
        len(s.get("subtasks", []) or [])
        for e in project.get("epics", [])
        for s in e.get("stories", [])
    )
    return (
        f"Will create in Jira project {os.getenv('JIRA_PROJECT_KEY', '?')}:\n"
        f"  • {n_epics} epic(s)\n"
        f"  • {n_stories} story(ies)\n"
        f"  • {n_subs} sub-task(s)"
    )


def push(project: dict[str, Any]) -> dict[str, str]:
    """Create issues in Jira. Returns mapping of internal ID → Jira key."""
    from jira import JIRA  # lazy

    client = JIRA(
        server=os.environ["JIRA_URL"],
        basic_auth=(os.environ["JIRA_EMAIL"], os.environ["JIRA_TOKEN"]),
    )
    project_key = os.environ["JIRA_PROJECT_KEY"]
    id_to_key: dict[str, str] = {}

    # Epics first
    for epic in project.get("epics", []):
        issue = client.create_issue(
            project=project_key,
            summary=epic.get("title", ""),
            description=epic.get("rationale", ""),
            issuetype={"name": "Epic"},
        )
        id_to_key[epic["id"]] = issue.key

    # Stories
    for epic in project.get("epics", []):
        epic_key = id_to_key.get(epic["id"])
        for s in epic.get("stories", []):
            fields: dict[str, Any] = {
                "project": project_key,
                "summary": s.get("title", ""),
                "description": s.get("description", ""),
                "issuetype": {"name": "Story"},
            }
            assignee = s.get("assignee")
            if assignee:
                fields["assignee"] = {"name": assignee}
            issue = client.create_issue(**fields)
            id_to_key[s["id"]] = issue.key
            if epic_key:
                # Best-effort epic linking; field id varies across Jira instances
                try:
                    issue.update(fields={"customfield_10014": epic_key})
                except Exception:
                    pass

    # Sub-tasks
    for epic in project.get("epics", []):
        for s in epic.get("stories", []):
            parent_key = id_to_key.get(s["id"])
            if not parent_key:
                continue
            for t in s.get("subtasks", []) or []:
                issue = client.create_issue(
                    project=project_key,
                    summary=t.get("title", ""),
                    issuetype={"name": "Sub-task"},
                    parent={"key": parent_key},
                )
                id_to_key[t["id"]] = issue.key

    # Dependency links (Blocks)
    for epic in project.get("epics", []):
        for s in epic.get("stories", []):
            for dep in s.get("depends_on", []) or []:
                src = id_to_key.get(dep)
                dst = id_to_key.get(s["id"])
                if src and dst:
                    try:
                        client.create_issue_link("Blocks", src, dst)
                    except Exception:
                        pass

    return id_to_key
