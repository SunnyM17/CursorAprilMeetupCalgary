"use client";
import type { Project } from "@/lib/schema";

export function LoadBar({ project }: { project: Project }) {
  const load = project.execution_plan._load_by_member ?? {};
  const entries = Object.entries(load).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  // capacity flags
  const capByName = new Map(
    project.team.map((m) => [m.name, m.capacity_pct ?? 100]),
  );
  return (
    <div className="card p-4 space-y-2">
      <div className="font-semibold text-sm">Load by member</div>
      {entries.length === 0 && (
        <div className="text-xs text-muted">No assignments yet.</div>
      )}
      {entries.map(([name, pts]) => {
        const cap = capByName.get(name) ?? 100;
        // overload if pts > cap/10 (rough heuristic: 1pt ~ 10% of capacity)
        const overload = pts > cap / 10;
        return (
          <div key={name} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className={overload ? "text-red-500 font-medium" : ""}>
                {name}
              </span>
              <span className="text-muted">{pts} pts</span>
            </div>
            <div className="h-2 bg-bg rounded">
              <div
                className={
                  "h-2 rounded " +
                  (overload ? "bg-red-500" : "bg-accent")
                }
                style={{ width: `${(pts / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
