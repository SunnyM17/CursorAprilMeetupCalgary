"use client";
import { Edit3, Wand2, Download, Send, RotateCcw } from "lucide-react";
import type { Project } from "@/lib/schema";

export function PlanHeader({
  project,
  onRevise,
  onExpand,
  onExport,
  onPush,
  onRegenerate,
}: {
  project: Project;
  onRevise: () => void;
  onExpand: () => void;
  onExport: () => void;
  onPush: () => void;
  onRegenerate: () => void;
}) {
  const p = project.project;
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">
            {p.key}
          </div>
          <h1 className="text-2xl font-bold">{p.name}</h1>
          {p.summary && <p className="text-sm text-muted mt-1">{p.summary}</p>}
          {p.vision && (
            <p className="text-sm italic mt-1">
              <span className="text-muted">Vision: </span>
              {p.vision}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button onClick={onRevise} className="btn">
            <Edit3 className="w-4 h-4" /> Revise
          </button>
          <button onClick={onExpand} className="btn">
            <Wand2 className="w-4 h-4" /> Expand story
          </button>
          <button onClick={onExport} className="btn">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={onPush} className="btn">
            <Send className="w-4 h-4" /> Push to Jira
          </button>
          <button onClick={onRegenerate} className="btn btn-ghost">
            <RotateCcw className="w-4 h-4" /> Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}
