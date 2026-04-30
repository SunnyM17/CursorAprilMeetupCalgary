// Port of agent/optimizer.py — pure logic, no LLM.
import type { Project, Story } from "./schema";

export function allStories(project: Project): Story[] {
  return project.epics.flatMap((e) => e.stories);
}

export type DagReport = {
  unknown_refs: [string, string][];
  cycles: string[][];
  ok: boolean;
};

export function validateDag(project: Project): DagReport {
  const stories = allStories(project);
  const byId = new Map(stories.map((s) => [s.id, s]));

  const unknown: [string, string][] = [];
  for (const s of stories) {
    for (const dep of s.depends_on || []) {
      if (!byId.has(dep)) unknown.push([s.id, dep]);
    }
  }

  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  for (const id of byId.keys()) color.set(id, WHITE);
  const cycles: string[][] = [];

  function dfs(sid: string, stack: string[]) {
    color.set(sid, GRAY);
    stack.push(sid);
    for (const dep of byId.get(sid)?.depends_on || []) {
      if (!byId.has(dep)) continue;
      const c = color.get(dep);
      if (c === GRAY) {
        const idx = stack.indexOf(dep);
        if (idx !== -1) cycles.push([...stack.slice(idx), dep]);
      } else if (c === WHITE) {
        dfs(dep, stack);
      }
    }
    stack.pop();
    color.set(sid, BLACK);
  }

  for (const id of byId.keys()) {
    if (color.get(id) === WHITE) dfs(id, []);
  }

  return {
    unknown_refs: unknown,
    cycles,
    ok: unknown.length === 0 && cycles.length === 0,
  };
}

export function criticalPath(project: Project): string[] {
  const stories = allStories(project);
  const byId = new Map(stories.map((s) => [s.id, s]));
  const memo = new Map<string, { cost: number; path: string[] }>();

  function longest(sid: string): { cost: number; path: string[] } {
    if (memo.has(sid)) return memo.get(sid)!;
    const s = byId.get(sid);
    if (!s) {
      const r = { cost: 0, path: [] as string[] };
      memo.set(sid, r);
      return r;
    }
    let bestCost = 0;
    let bestPath: string[] = [];
    for (const dep of s.depends_on || []) {
      const r = longest(dep);
      if (r.cost > bestCost) {
        bestCost = r.cost;
        bestPath = r.path;
      }
    }
    const pts = Number(s.estimate_points || 0);
    const result = { cost: bestCost + pts, path: [...bestPath, sid] };
    memo.set(sid, result);
    return result;
  }

  if (byId.size === 0) return [];
  let best = { cost: -1, path: [] as string[] };
  for (const id of byId.keys()) {
    const r = longest(id);
    if (r.cost > best.cost) best = r;
  }
  return best.path;
}

export function loadByMember(project: Project): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const s of allStories(project)) {
    const a = s.assignee || "Unassigned";
    totals[a] = (totals[a] || 0) + Number(s.estimate_points || 0);
  }
  return totals;
}

/** Return a copy of `project` with execution_plan annotations filled in. */
export function annotate(project: Project): Project {
  const next: Project = JSON.parse(JSON.stringify(project));
  const plan = next.execution_plan;
  if (!plan.critical_path || plan.critical_path.length === 0) {
    plan.critical_path = criticalPath(next);
  }
  plan._load_by_member = loadByMember(next);
  plan._dag_report = validateDag(next);
  return next;
}
