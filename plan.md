# Idea-to-Jira Workflow Optimizer

A conversational CLI agent that turns a raw idea into an optimized Jira project — epics, stories, (optional) sub-tasks, dependencies, and team-aware assignments — with a dry-run output by default and an opt-in flag to push live to Jira.

---

## Overview

**Flow:**
1. User describes an idea in free text.
2. Agent asks clarifying questions about scope/goals.
3. Agent gathers **team roster**: number of people + each person's specialty (e.g. backend, frontend, design, QA, PM).
4. Agent generates a Jira-ready project breakdown (epics → stories → optional sub-tasks) with:
   - Dependencies between items
   - Suggested assignees matched to specialty
   - Story-point estimates
   - Optimized execution order (minimize blockers, maximize parallel work)
5. User iterates on the draft.
6. Output as structured Markdown + JSON/CSV (importable into Jira).
7. **Optional:** with `--push` flag and Jira credentials, agent creates the items live via Jira REST API.

---

## Architecture

```
User ↔ CLI Chat REPL
         │
         ▼
    Agent Orchestrator
         │
   ┌─────┴──────────────────────────┐
   │                                │
LLM Layer (GPT-4o)            Output Layer
  • Idea decomposition          • Markdown report
  • Granularity decision        • Jira-import JSON/CSV
  • Specialty-aware assignment  • Optional live push (jira-python)
  • Dependency graph            • Pretty terminal render (rich)
```

---

## Components

| File | Purpose |
|---|---|
| `agent/main.py` | REPL entry point; orchestrates the full flow |
| `agent/intake.py` | Gathers idea + team roster (name, specialty, capacity) |
| `agent/prompt_builder.py` | System + user prompts (decomposition, assignment, revision) |
| `agent/decomposer.py` | LLM call → structured project JSON; granularity auto-selected |
| `agent/optimizer.py` | Post-processing: validates DAG, computes critical path, balances load |
| `agent/exporters.py` | Markdown report + Jira-import CSV + raw JSON |
| `agent/jira_writer.py` | Optional live push via `jira-python` (only when `--push`) |
| `agent/session.py` | Conversation + project state |
| `requirements.txt` | `openai`, `jira`, `python-dotenv`, `rich` |
| `.env.example` | `OPENAI_API_KEY`, optional `JIRA_URL/EMAIL/TOKEN/PROJECT_KEY` |

---

## Data Model (project JSON)

```json
{
  "project": {"name": "...", "key": "PROJ", "summary": "...", "vision": "..."},
  "team": [{"name": "Alice", "specialties": ["backend"], "capacity_pct": 100}],
  "epics": [
    {
      "id": "E1", "title": "...", "rationale": "...",
      "stories": [
        {
          "id": "S1.1", "title": "...", "description": "...",
          "specialty": "backend", "assignee": "Alice",
          "estimate_points": 3, "depends_on": ["S1.0"],
          "subtasks": [
            {"id": "T1.1.a", "title": "...", "estimate_hours": 4}
          ]
        }
      ]
    }
  ],
  "execution_plan": {
    "phases": [{"phase": 1, "parallel_tracks": [...], "rationale": "..."}],
    "critical_path": ["S1.1", "S2.1"],
    "risks": [{"risk": "...", "mitigation": "..."}],
    "estimated_time_saved_minutes": 60
  }
}
```

Sub-tasks are emitted only when the agent judges the story is complex enough — per your "let the agent decide" choice.

---

## Conversation Flow

1. **Idea intake** — "Describe your idea." Agent asks 1–3 clarifying questions (goals, constraints, deadline).
2. **Team intake** — Prompts: number of people, then for each: name + specialties (comma-separated) + capacity %.
3. **Draft generation** — Agent calls LLM, returns project JSON. Renders Markdown summary in terminal.
4. **Iteration** — `/revise <feedback>`, `/show`, `/expand <story-id>`, `/collapse <epic-id>`.
5. **Finalize** — `/export` writes `out/<project>.md`, `out/<project>.json`, `out/<project>.csv`.
6. **Optional push** — `/push` (or launching with `--push`) creates the items in Jira if credentials are set; prints a confirmation diff first.

---

## Commands

| Command | Action |
|---|---|
| `/plan` | Generate the project breakdown |
| `/revise` | Provide feedback to refine |
| `/expand <id>` | Add sub-tasks to a story |
| `/show` | Re-render the latest project |
| `/export` | Write Markdown + JSON + CSV to `out/` |
| `/push` | Live-create in Jira (requires creds + confirmation) |
| `/help`, `/quit` | Standard |

---

## Implementation Steps

1. **Scaffold** — `requirements.txt`, `.env.example`, `README.md`, `agent/` package, `out/` folder
2. **Intake** — `intake.py`: idea prompt + team roster prompt loop
3. **Prompts** — `prompt_builder.py`: system prompt enforcing the project JSON schema, specialty-aware assignment, and dependency reasoning
4. **Decomposer** — `decomposer.py`: LLM call + JSON extraction; agent decides granularity
5. **Optimizer** — `optimizer.py`: DAG validation, critical path, parallel-phase grouping, load balance check
6. **Exporters** — `exporters.py`: Markdown report, Jira-import CSV (Summary, Issue Type, Epic Link, Assignee, Story Points, Description, Depends On), raw JSON
7. **Jira writer** (opt-in) — `jira_writer.py`: create project (if missing), epics, stories, sub-tasks, set links/assignees
8. **REPL** — `main.py`: wire everything together with `rich` UI
9. **Smoke test** — mock idea + 4-person team; verify JSON shape, CSV export, Markdown render (no live LLM call needed for parsing/export tests)

---

## Key Decisions

- **CLI chat agent** (consistent with prior plan), Python, `rich` for UI
- **GPT-4o** by default (`OPENAI_MODEL` env var to override)
- **Dry-run is the default**; `--push` / `/push` is the only path to mutate Jira
- **Agent decides granularity** per idea, but user can `/expand` or `/collapse`
- **Specialty matching** is a hard signal in the prompt: stories should go to a teammate whose specialties include the story's required specialty; load is balanced by capacity %

---

## Out of Scope (v1)

- Web UI
- Multi-project portfolios
- Slack/email notifications
- Persistent storage beyond `out/` files
- Auto-sync back from Jira after manual edits
