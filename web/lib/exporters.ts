// Port of agent/exporters.py — Markdown + Jira CSV rendering.
import type { Project } from "./schema";

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

export function toMarkdown(project: Project): string {
  const p = project.project;
  const out: string[] = [
    `# ${p.name || "Project"} (${p.key || "?"})`,
    "",
    p.summary || "",
    "",
  ];
  if (p.vision) out.push(`**Vision:** ${p.vision}\n`);

  if (project.team?.length) {
    out.push("## Team");
    for (const m of project.team) {
      const specs = (m.specialties || []).join(", ");
      out.push(`- **${m.name}** — ${specs} (${m.capacity_pct ?? 100}%)`);
    }
    out.push("");
  }

  for (const epic of project.epics) {
    out.push(`## ${epic.id} — ${epic.title}`);
    if (epic.rationale) out.push(`_${epic.rationale}_\n`);
    out.push("| ID | Story | Specialty | Assignee | Points | Depends On |");
    out.push("|---|---|---|---|---|---|");
    for (const s of epic.stories) {
      const deps = (s.depends_on || []).join(", ") || "—";
      out.push(
        `| ${s.id} | ${s.title} | ${s.specialty} | ${s.assignee ?? ""} | ${s.estimate_points} | ${deps} |`,
      );
      for (const t of s.subtasks || []) {
        out.push(
          `|  ↳ ${t.id} | ${t.title} | — | — | ${t.estimate_hours ?? ""}h | — |`,
        );
      }
    }
    out.push("");
  }

  const plan = project.execution_plan;
  if (plan.critical_path?.length) {
    out.push(`**Critical path:** ${plan.critical_path.join(" → ")}\n`);
  }
  for (const ph of plan.phases || []) {
    out.push(`### Phase ${ph.phase}`);
    for (const tr of ph.parallel_tracks || []) {
      out.push(`- ${tr.member}: ${(tr.story_ids || []).join(", ")}`);
    }
    if (ph.rationale) out.push(`_${ph.rationale}_`);
    out.push("");
  }
  if (plan.risks?.length) {
    out.push("## Risks & Mitigations");
    for (const r of plan.risks) {
      out.push(`- **${r.risk}** — ${r.mitigation}`);
    }
    out.push("");
  }
  if (plan.estimated_time_saved_minutes) {
    out.push(
      `**Estimated planning time saved:** ~${plan.estimated_time_saved_minutes} min`,
    );
  }
  return out.join("\n").replace(/\s+$/, "") + "\n";
}

export type JiraCsvRow = Record<string, string>;

export function toJiraCsvRows(project: Project): JiraCsvRow[] {
  const rows: JiraCsvRow[] = [];
  const projectKey = project.project.key || "PROJ";

  for (const epic of project.epics) {
    rows.push({
      "Issue Type": "Epic",
      Summary: epic.title,
      Description: epic.rationale || "",
      "Epic Name": epic.title,
      "Epic Link": "",
      Assignee: "",
      "Story Points": "",
      Labels: projectKey,
      "Depends On": "",
      Parent: "",
      "External ID": epic.id,
    });
    for (const s of epic.stories) {
      rows.push({
        "Issue Type": "Story",
        Summary: s.title,
        Description: s.description || "",
        "Epic Name": "",
        "Epic Link": epic.id,
        Assignee: s.assignee || "",
        "Story Points": String(s.estimate_points ?? ""),
        Labels: s.specialty || "",
        "Depends On": (s.depends_on || []).join(","),
        Parent: "",
        "External ID": s.id,
      });
      for (const t of s.subtasks || []) {
        rows.push({
          "Issue Type": "Sub-task",
          Summary: t.title,
          Description: "",
          "Epic Name": "",
          "Epic Link": "",
          Assignee: s.assignee || "",
          "Story Points": "",
          Labels: "",
          "Depends On": "",
          Parent: s.id,
          "External ID": t.id,
        });
      }
    }
  }
  return rows;
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function rowsToCsv(rows: JiraCsvRow[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h] ?? "")).join(","));
  }
  return lines.join("\n") + "\n";
}

/** Strip private debug fields and return clean JSON-stringifiable project. */
export function stripDebugFields(project: Project): Project {
  const clean: Project = JSON.parse(JSON.stringify(project));
  const plan = clean.execution_plan as Record<string, unknown>;
  for (const k of Object.keys(plan)) {
    if (k.startsWith("_")) delete plan[k];
  }
  return clean;
}
