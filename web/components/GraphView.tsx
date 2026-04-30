"use client";
import { useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import type { Project, Story } from "@/lib/schema";
import { epicColor } from "@/lib/utils";
import { Modal } from "./ui/Modal";

type StoryWithEpic = Story & { epicId: string; epicIdx: number };

export function GraphView({ project }: { project: Project }) {
  const [selected, setSelected] = useState<StoryWithEpic | null>(null);

  const { nodes, edges } = useMemo(() => {
    const stories: StoryWithEpic[] = project.epics.flatMap((e, idx) =>
      e.stories.map((s) => ({ ...s, epicId: e.id, epicIdx: idx })),
    );
    const cp = new Set(project.execution_plan.critical_path);
    // Layered layout: column = depth in DAG; row = position within depth.
    const byId = new Map(stories.map((s) => [s.id, s]));
    const depth = new Map<string, number>();
    function d(id: string): number {
      if (depth.has(id)) return depth.get(id)!;
      const s = byId.get(id);
      if (!s || s.depends_on.length === 0) {
        depth.set(id, 0);
        return 0;
      }
      const v = 1 + Math.max(...s.depends_on.map(d));
      depth.set(id, v);
      return v;
    }
    stories.forEach((s) => d(s.id));
    const cols = new Map<number, StoryWithEpic[]>();
    stories.forEach((s) => {
      const k = depth.get(s.id) ?? 0;
      if (!cols.has(k)) cols.set(k, []);
      cols.get(k)!.push(s);
    });

    const nodes: Node[] = [];
    cols.forEach((arr, col) => {
      arr.forEach((s, i) => {
        nodes.push({
          id: s.id,
          position: { x: col * 240, y: i * 120 },
          data: { label: `${s.id} · ${s.title}` },
          style: {
            border: `2px solid ${epicColor(s.epicId, s.epicIdx)}`,
            background: "rgb(var(--card))",
            color: "rgb(var(--fg))",
            padding: 8,
            borderRadius: 8,
            fontSize: 12,
            width: 200,
          },
        });
      });
    });

    const edges: Edge[] = [];
    stories.forEach((s) => {
      s.depends_on.forEach((dep) => {
        const isCritical = cp.has(dep) && cp.has(s.id);
        edges.push({
          id: `${dep}->${s.id}`,
          source: dep,
          target: s.id,
          animated: isCritical,
          className: isCritical ? "critical" : undefined,
          style: { stroke: isCritical ? "#ef4444" : "rgb(var(--muted))" },
        });
      });
    });

    return { nodes, edges };
  }, [project]);

  const stories: StoryWithEpic[] = useMemo(
    () =>
      project.epics.flatMap((e, idx) =>
        e.stories.map((s) => ({ ...s, epicId: e.id, epicIdx: idx })),
      ),
    [project],
  );

  return (
    <>
      <div className="card h-[600px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={(_, n) => {
            const s = stories.find((x) => x.id === n.id);
            if (s) setSelected(s);
          }}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable className="!bg-bg" />
        </ReactFlow>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.id} · ${selected.title}` : ""}
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <div>
              <span className="chip" style={{ borderColor: epicColor(selected.epicId, selected.epicIdx) }}>
                {selected.epicId}
              </span>{" "}
              <span className="chip">{selected.specialty}</span>{" "}
              <span className="chip">{selected.estimate_points} pts</span>
            </div>
            <p className="text-muted">{selected.description}</p>
            <div>
              <div className="text-xs text-muted">Assignee</div>
              <div>{selected.assignee || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Depends on</div>
              <div>
                {selected.depends_on.length
                  ? selected.depends_on.join(", ")
                  : "—"}
              </div>
            </div>
            {selected.subtasks.length > 0 && (
              <div>
                <div className="text-xs text-muted">Subtasks</div>
                <ul className="list-disc list-inside">
                  {selected.subtasks.map((t) => (
                    <li key={t.id}>
                      {t.title}{" "}
                      <span className="text-muted">
                        ({t.estimate_hours ?? "?"}h)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
