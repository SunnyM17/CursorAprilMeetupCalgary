"use client";
import { cn } from "@/lib/utils";

export type TabKey = "graph" | "kanban" | "gantt";

export function PlanTabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "graph", label: "Graph" },
    { key: "kanban", label: "Kanban" },
    { key: "gantt", label: "Gantt" },
  ];
  return (
    <div className="border-b border-border flex gap-1" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
            active === t.key
              ? "border-accent text-fg font-semibold"
              : "border-transparent text-muted hover:text-fg",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
