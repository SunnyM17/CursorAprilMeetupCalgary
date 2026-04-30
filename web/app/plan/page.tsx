"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { PlanHeader } from "@/components/PlanHeader";
import { PlanTabs, type TabKey } from "@/components/PlanTabs";
import { GraphView } from "@/components/GraphView";
import { KanbanView } from "@/components/KanbanView";
import { GanttView } from "@/components/GanttView";
import { LoadBar } from "@/components/LoadBar";
import { RisksPanel } from "@/components/RisksPanel";
import { ReviseDialog } from "@/components/ReviseDialog";
import { ExpandDialog } from "@/components/ExpandDialog";
import { ExportDialog } from "@/components/ExportDialog";
import { PushDialog } from "@/components/PushDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

export default function PlanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    project,
    idea,
    clarifications,
    team,
    setProject,
    generating,
    setGenerating,
  } = useStore();
  const [tab, setTab] = useState<TabKey>("graph");
  const [revising, setRevising] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [loading, setLoading] = useState(false);

  async function regenerate() {
    if (!idea || !team.length) {
      toast("error", "Missing idea or team — start over.");
      router.push("/new");
      return;
    }
    setLoading(true);
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, clarifications, team }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generate failed");
      setProject(data.project);
      toast("success", "Plan regenerated.");
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }

  if (!project) {
    return (
      <div className="space-y-6">
        {generating ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted">
              <Loader2 className="w-4 h-4 animate-spin" /> Generating your plan…
            </div>
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="card p-8 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-accent mx-auto" />
            <h2 className="font-semibold text-lg">No plan yet</h2>
            <p className="text-sm text-muted">
              Start by describing your idea and adding a team.
            </p>
            <Link href="/new" className="btn btn-primary inline-flex">
              Start
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PlanHeader
        project={project}
        onRevise={() => setRevising(true)}
        onExpand={() => setExpanding(true)}
        onExport={() => setExporting(true)}
        onPush={() => setPushing(true)}
        onRegenerate={regenerate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="space-y-3 min-w-0">
          <PlanTabs active={tab} onChange={setTab} />
          {loading ? (
            <Skeleton className="h-[500px]" />
          ) : (
            <>
              {tab === "graph" && <GraphView project={project} />}
              {tab === "kanban" && <KanbanView project={project} />}
              {tab === "gantt" && <GanttView project={project} />}
            </>
          )}
        </div>
        <aside className="space-y-3">
          <LoadBar project={project} />
          <RisksPanel project={project} />
        </aside>
      </div>

      <ReviseDialog
        open={revising}
        onClose={() => setRevising(false)}
        project={project}
        idea={idea}
        clarifications={clarifications}
        onResult={(p) => setProject(p)}
      />
      <ExpandDialog
        open={expanding}
        onClose={() => setExpanding(false)}
        project={project}
        idea={idea}
        clarifications={clarifications}
        onResult={(p) => setProject(p)}
      />
      <ExportDialog open={exporting} onClose={() => setExporting(false)} project={project} />
      <PushDialog open={pushing} onClose={() => setPushing(false)} project={project} />
    </div>
  );
}
