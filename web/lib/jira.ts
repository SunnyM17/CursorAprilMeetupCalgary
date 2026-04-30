// Port of agent/jira_writer.py using Jira REST v3 directly (no Python client).
import type { Project } from "./schema";

export function hasJiraCredentials(): boolean {
  return Boolean(
    process.env.JIRA_URL &&
      process.env.JIRA_EMAIL &&
      process.env.JIRA_TOKEN &&
      process.env.JIRA_PROJECT_KEY,
  );
}

export function diffSummary(project: Project): string {
  const nEpics = project.epics.length;
  const nStories = project.epics.reduce((acc, e) => acc + e.stories.length, 0);
  const nSubs = project.epics.reduce(
    (acc, e) =>
      acc + e.stories.reduce((a, s) => a + (s.subtasks?.length || 0), 0),
    0,
  );
  return (
    `Will create in Jira project ${process.env.JIRA_PROJECT_KEY ?? "?"}:\n` +
    `  • ${nEpics} epic(s)\n` +
    `  • ${nStories} story(ies)\n` +
    `  • ${nSubs} sub-task(s)`
  );
}

function authHeader(): string {
  const tok = Buffer.from(
    `${process.env.JIRA_EMAIL}:${process.env.JIRA_TOKEN}`,
  ).toString("base64");
  return `Basic ${tok}`;
}

async function createIssue(fields: Record<string, unknown>): Promise<string> {
  const url = `${process.env.JIRA_URL!.replace(/\/$/, "")}/rest/api/3/issue`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    throw new Error(`Jira create failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { key: string };
  return data.key;
}

async function tryLinkIssues(srcKey: string, dstKey: string): Promise<void> {
  try {
    const url = `${process.env.JIRA_URL!.replace(/\/$/, "")}/rest/api/3/issueLink`;
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: { name: "Blocks" },
        inwardIssue: { key: dstKey },
        outwardIssue: { key: srcKey },
      }),
    });
  } catch {
    // Best-effort.
  }
}

/** Create issues in Jira. Returns mapping of internal ID → Jira key. */
export async function pushToJira(project: Project): Promise<Record<string, string>> {
  const projectKey = process.env.JIRA_PROJECT_KEY!;
  const idToKey: Record<string, string> = {};

  // Epics
  for (const epic of project.epics) {
    const key = await createIssue({
      project: { key: projectKey },
      summary: epic.title,
      description: epic.rationale || "",
      issuetype: { name: "Epic" },
    });
    idToKey[epic.id] = key;
  }

  // Stories
  for (const epic of project.epics) {
    for (const s of epic.stories) {
      const fields: Record<string, unknown> = {
        project: { key: projectKey },
        summary: s.title,
        description: s.description || "",
        issuetype: { name: "Story" },
      };
      if (s.assignee) fields.assignee = { displayName: s.assignee };
      const key = await createIssue(fields);
      idToKey[s.id] = key;
    }
  }

  // Sub-tasks
  for (const epic of project.epics) {
    for (const s of epic.stories) {
      const parentKey = idToKey[s.id];
      if (!parentKey) continue;
      for (const t of s.subtasks || []) {
        const key = await createIssue({
          project: { key: projectKey },
          summary: t.title,
          issuetype: { name: "Sub-task" },
          parent: { key: parentKey },
        });
        idToKey[t.id] = key;
      }
    }
  }

  // Dependency links
  for (const epic of project.epics) {
    for (const s of epic.stories) {
      for (const dep of s.depends_on || []) {
        const src = idToKey[dep];
        const dst = idToKey[s.id];
        if (src && dst) await tryLinkIssues(src, dst);
      }
    }
  }

  return idToKey;
}
