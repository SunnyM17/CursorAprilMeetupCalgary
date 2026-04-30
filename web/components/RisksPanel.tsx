"use client";
import type { Project } from "@/lib/schema";
import { AlertTriangle, Clock } from "lucide-react";

export function RisksPanel({ project }: { project: Project }) {
  const risks = project.execution_plan.risks ?? [];
  const saved = project.execution_plan.estimated_time_saved_minutes;
  return (
    <div className="space-y-3">
      <div className="card p-4 space-y-2">
        <div className="font-semibold text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500" /> Risks
        </div>
        {risks.length === 0 ? (
          <div className="text-xs text-muted">No risks captured.</div>
        ) : (
          <ul className="space-y-2">
            {risks.map((r, i) => (
              <li key={i} className="text-xs">
                <div className="font-medium">{r.risk}</div>
                <div className="text-muted">↳ {r.mitigation}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {saved ? (
        <div className="card p-4 flex items-center gap-2 text-sm text-emerald-500">
          <Clock className="w-4 h-4" />
          <span>~{saved} min planning time saved</span>
        </div>
      ) : null}
    </div>
  );
}
