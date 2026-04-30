# Idea-to-Jira Web UI

Next.js 14 (TypeScript) front-end for the `agent/` idea-to-Jira workflow.
Three-screen flow (Idea → Team → Plan) with Graph / Kanban / Gantt
visualizations over the same project JSON.

## Setup

```bash
cp .env.example .env.local   # set OPENAI_API_KEY (and JIRA_* if pushing)
npm install
npm run dev
```

Visit http://localhost:3000.

## Scripts

- `npm run dev` — local dev server
- `npm run build && npm start` — production build
- `npm run lint`

## Notes

- The Python `agent/` package is the original CLI surface and remains usable
  via `python -m agent.main`. This web app is a parallel TS implementation;
  the shared contract is the **Project JSON schema** (`lib/schema.ts`).
- The system prompt in `lib/prompts.ts` is a byte-equivalent port of
  `agent/prompt_builder.py`'s `SYSTEM_PROMPT` so both surfaces produce
  identical structures.
- Live Jira push uses Jira's REST v3 directly (no Python client) and is
  guarded by `JIRA_*` env vars.
