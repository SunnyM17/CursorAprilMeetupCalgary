"use client";
import { useMemo, useState } from "react";
import type { Project } from "@/lib/schema";
import { epicColor } from "@/lib/utils";

export function KanbanView({ project }: { project: Project }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const epicIdxById = useMemo(() => {
    const m = new Map<string, number>();
    project.epics.forEach((e, i) => m.set(e.id, i));
    return m;
  }, [project]);

  const cards = useMemo(() => {
    return project.epics.flatMap((e) =>
      e.stories.map((s) => ({ ...s, epicId: e.id })),
    );
  }, [project]);

  const members = useMemo(() => {
    const set = new Set<string>(project.team.map((m) => m.name));
    cards.forEach((c) => c.assignee && set.add(c.assignee));
    return Array.from(set);
  }, [project, cards]);

  return (
    <div className="grid grid-flow-col auto-cols-[260px] gap-3 overflow-x-auto pb-2">
      {members.map((m) => {
        const col = cards.filter((c) => (c.assignee || "Unassigned") === m);
        return (
          <div key={m} className="card p-3 space-y-2 min-h-[300px]">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{m}</span>
              <span className="text-xs text-muted">
                {col.reduce((a, c) => a + (c.estimate_points || 0), 0)} pts
              </span>
            </div>
            <div className="space-y-2">
              {col.map((c) => {
                const idx = epicIdxById.get(c.epicId) ?? 0;
                const color = epicColor(c.epicId, idx);
                const highlighted =
                  hovered && c.depends_on.includes(hovered);
                const isSource = hovered === c.id;
                return (
                  <div
                    key={c.id}
                    className={
                      "rounded-md border p-2 text-xs space-y-1 transition " +
                      (highlighted
                        ? "ring-2 ring-accent border-accent"
                        : "border-border")
                    }
                    style={{ borderTop: `3px solid ${color}` }}
                  >
                    <div className="font-medium">
                      {c.id} · {c.title}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">{c.epicId} · {c.specialty}</span>
                      <span>{c.estimate_points} pts</span>
                    </div>
                    {c.depends_on.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {c.depends_on.map((d) => (
                          <span
                            key={d}
                            className="chip cursor-help"
                            onMouseEnter={() => setHovered(d)}
                            onMouseLeave={() => setHovered(null)}
                          >
                            ↪ {d}
                          </span>
                        ))}
                      </div>
                    )}
                    {isSource && (
                      <div className="text-[10px] text-accent">
                        ← cards depending on this are highlighted
                      </div>
                    )}
                  </div>
                );
              })}
              {col.length === 0 && (
                <div className="text-xs text-muted italic">No stories.</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
