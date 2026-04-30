"use client";
import Link from "next/link";
import { ArrowRight, GitBranch, KanbanSquare, GanttChart } from "lucide-react";

export default function Landing() {
  return (
    <div className="space-y-10">
      <section className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          From idea to Jira-ready plan.
        </h1>
        <p className="text-muted max-w-2xl mx-auto">
          Describe what you want to build, add your team, and get an
          optimized project plan with epics, stories, dependencies, and
          assignees — visualized as a graph, kanban, or Gantt chart.
        </p>
        <div className="flex justify-center">
          <Link href="/new" className="btn btn-primary">
            Start <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <Card icon={<GitBranch className="w-5 h-5" />} title="Dependency graph">
          See the DAG of stories, with the critical path highlighted in red.
        </Card>
        <Card icon={<KanbanSquare className="w-5 h-5" />} title="Kanban">
          Cards grouped by team member, color-coded by epic.
        </Card>
        <Card icon={<GanttChart className="w-5 h-5" />} title="Gantt">
          Phases on the X axis, members on the Y. Critical-path bars stand out.
        </Card>
      </section>
    </div>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5 space-y-2">
      <div className="flex items-center gap-2 text-accent">{icon}<span className="font-semibold text-fg">{title}</span></div>
      <p className="text-sm text-muted">{children}</p>
    </div>
  );
}
