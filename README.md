# Idea-to-Jira Workflow Optimizer

A conversational CLI agent that turns a raw idea into an optimized Jira project —
epics, stories, optional sub-tasks, dependencies, and team-aware assignments.

**Dry-run by default.** Live Jira creation is opt-in via `--push` or `/push`.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env, at minimum set OPENAI_API_KEY
```

## Run

```bash
python -m agent.main           # dry-run
python -m agent.main --push    # allow /push to create items in Jira
```

## Flow

1. Describe your idea (free text)
2. Agent asks 1–3 clarifying questions
3. Provide your team roster (size + each member's name, specialties, capacity %)
4. Agent generates the project breakdown (epics → stories → optional sub-tasks)
5. Iterate with `/revise`, `/expand`, `/collapse`
6. `/export` writes Markdown + JSON + Jira-import CSV to `out/`
7. Optional: `/push` creates items live in Jira (requires creds)

## Commands

| Command | Action |
|---|---|
| `/plan` | Generate the project breakdown |
| `/revise` | Provide feedback to refine |
| `/expand <story-id>` | Add sub-tasks to a story |
| `/show` | Re-render the current project |
| `/export` | Write artifacts to `out/` |
| `/push` | Live-create in Jira (opt-in) |
| `/help`, `/quit` | — |

## Smoke test

```bash
python -m tests.test_smoke
```
