// Verbatim port of agent/prompt_builder.py.
// Keep SYSTEM_PROMPT byte-equivalent so the CLI and web produce identical structures.

import type { TeamMember } from "./schema";

export const SYSTEM_PROMPT = `You are a senior technical product manager + sprint planner.

Your job: turn a user's idea into a fully-formed, Jira-ready project plan that a
team can execute efficiently.

You optimize for:
  1. Clear, well-scoped epics and stories aligned to the idea's outcomes.
  2. Specialty-aware assignment — match each story to a team member whose
     specialties include the required skill.
  3. Balanced load — respect each member's capacity_pct.
  4. Dependency-correct ordering — no story starts before its blockers finish.
  5. Maximum parallelism across team members.
  6. Granularity decided per idea: emit sub-tasks ONLY for stories complex enough
     to warrant them. Leave \`subtasks: []\` otherwise.

When the user issues GENERATE_PROJECT, REVISE_PROJECT, or EXPAND_STORY, respond
with a SINGLE JSON object (no prose, no markdown fences) matching this schema:

{
  "project": {
    "name": "Short project name",
    "key": "UPPERCASE-KEY",
    "summary": "One-sentence summary",
    "vision": "1-2 sentence vision / outcome"
  },
  "team": [
    {"name": "...", "specialties": ["..."], "capacity_pct": 100}
  ],
  "epics": [
    {
      "id": "E1",
      "title": "...",
      "rationale": "Why this epic exists",
      "stories": [
        {
          "id": "S1.1",
          "title": "...",
          "description": "User-story style: As a X, I want Y, so that Z.",
          "specialty": "backend|frontend|design|devops|qa|pm|data|generalist",
          "assignee": "Name from team",
          "estimate_points": 3,
          "depends_on": ["S1.0"],
          "subtasks": [
            {"id": "T1.1.a", "title": "...", "estimate_hours": 4}
          ]
        }
      ]
    }
  ],
  "execution_plan": {
    "phases": [
      {"phase": 1, "parallel_tracks": [
        {"member": "Alice", "story_ids": ["S1.1"]}
      ], "rationale": "..."}
    ],
    "critical_path": ["S1.1", "S2.1"],
    "risks": [{"risk": "...", "mitigation": "..."}],
    "estimated_time_saved_minutes": 60
  }
}

For conversational turns (clarifying questions, discussion), respond in plain
text. ONLY emit JSON when explicitly told to GENERATE_PROJECT, REVISE_PROJECT,
or EXPAND_STORY.
`;

export function buildIntakeMessage(idea: string): string {
  return (
    `The user wants to build the following idea:\n\n---\n${idea}\n---\n\n` +
    "Ask 1-3 short clarifying questions to nail down scope, constraints, and " +
    "success criteria. Do NOT produce a project plan yet. Plain text only."
  );
}

export function buildGenerateMessage(
  idea: string,
  team: TeamMember[],
  clarifications: Record<string, string>,
): string {
  return (
    "GENERATE_PROJECT now using the context below.\n\n" +
    `## Idea\n${idea}\n\n` +
    `## Clarifications\n\`\`\`json\n${JSON.stringify(clarifications, null, 2)}\n\`\`\`\n\n` +
    `## Team (${team.length} members)\n\`\`\`json\n${JSON.stringify(team, null, 2)}\n\`\`\`\n\n` +
    "Decide story granularity per the system prompt rules. Emit JSON only."
  );
}

export function buildReviseMessage(feedback: string): string {
  return (
    `REVISE_PROJECT based on this feedback:\n\n${feedback}\n\n` +
    "Output the full updated JSON object only."
  );
}

export function buildExpandMessage(storyId: string): string {
  return (
    `EXPAND_STORY: Break story ${storyId} into concrete sub-tasks with ` +
    "estimate_hours. Output the full updated project JSON object only."
  );
}
