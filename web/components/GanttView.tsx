"use client";
import { useMemo } from "react";
import type { Project } from "@/lib/schema";
import { epicColor } from "@/lib/utils";

/**
 * Rows = team members. Columns = phases (from execution_plan.phases).
 * If no phases provided, derive 3 phases from DAG depth.
 */
export function GanttView({ project }: { project: Project }) {
  const cp = useMemo(
    () => new Set(project.execution_plan.critical_path),
    [project],
  );
  const epicIdxById = useMemo(() => {
    const m = new Map<string, number>();
    project.epics.forEach((e, i) => m.set(e.id, i));
    return m;
  }, [project]);

  const allStories = useMemo(
    () =>
      project.epics.flatMap((e) =>
        e.stories.map((s) => ({ ...s, epicId: e.id })),
      ),
    [project],
  );

  const phases = useMemo(() => {
    if (project.execution_plan.phases.length) {
      return project.execution_plan.phases.map((p) => ({
        label: `Phase ${p.phase}`,
        storyIds: new Set(
          p.parallel_tracks.flatMap((t) => t.story_ids),
        ),
      }));
    }
    // Derive from DAG depth
    const byId = new Map(allStories.map((s) => [s.id, s]));
    const depth = new Map<string, number>();
    function d(id: string): number {
      if (depth.has(id)) return depth.get(id)!;
      const s = byId.get(id);
      if (!s || !s.depends_on.length) {
        depth.set(id, 0);
        return 0;
      }
      const v = 1 + Math.max(...s.depends_on.map(d));
      depth.set(id, v);
      return v;
    }
    allStories.forEach((s) => d(s.id));
    const groups = new Map<number, string[]>();
    allStories.forEach((s) => {
      const k = depth.get(s.id) ?? 0;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(s.id);
    });
    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([k, ids]) => ({
        label: `Phase ${k + 1}`,
        storyIds: new Set(ids),
      }));
  }, [project, allStories]);

  const members = useMemo(() => {
    const set = new Set<string>(project.team.map((m) => m.name));
    allStories.forEach((s) => s.assignee && set.add(s.assignee));
    return Array.from(set);
  }, [project, allStories]);

  const colWidth = 220;
  return (
    <div className="card p-3 overflow-x-auto">
      <div className="grid" style={{ gridTemplateColumns: `140px repeat(${phases.length}, ${colWidth}px)` }}>
        <div className="text-xs text-muted font-semibold px-2 pb-2 sticky left-0 bg-card">
          Member
        </div>
        {phases.map((p) => (
          <div key={p.label} className="text-xs font-semibold pb-2 px-2 border-l border-border">
            {p.label}
          </div>
        ))}

        {members.map((m) => (
          <RowFragment
            key={m}
            member={m}
            phases={phases}
            stories={allStories.filter(
              (s) => (s.assignee || "Unassigned") === m,
            )}
            cp={cp}
            epicIdxById={epicIdxById}
          />
        ))}
      </div>
    </div>
  );
}

function RowFragment({
  member,
  phases,
  stories,
  cp,
  epicIdxById,
}: {
  member: string;
  phases: { label: string; storyIds: Set<string> }[];
  stories: ({ epicId: string } & {
    id: string;
    title: string;
    estimate_points: number;
    depends_on: string[];
  })[];
  cp: Set<string>;
  epicIdxById: Map<string, number>;
}) {
  return (
    <>
      <div className="px-2 py-2 text-sm sticky left-0 bg-card border-t border-border">
        {member}
      </div>
      {phases.map((p) => {
        const inPhase = stories.filter((s) => p.storyIds.has(s.id));
        return (
          <div
            key={p.label}
            className="border-l border-t border-border px-1.5 py-1.5 space-y-1 min-h-[48px]"
          >
            {inPhase.map((s) => {
              const w = Math.min(100, Math.max(20, s.estimate_points * 18));
              const color = epicColor(s.epicId, epicIdxById.get(s.epicId) ?? 0);
              const critical = cp.has(s.id);
              return (
                <div
                  key={s.id}
                  title={`${s.id} · ${s.title} (${s.estimate_points} pts)`}
                  className={
                    "rounded text-[11px] px-1.5 py-0.5 truncate text-white " +
                    (critical ? "ring-2 ring-red-500" : "")
                  }
                  style={{ background: color, width: `${w}%` }}
                >
                  {s.id} · {s.title}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
