"use client";
import { useMemo, useState } from "react";
import { Modal } from "./ui/Modal";
import { Loader2 } from "lucide-react";
import type { Project } from "@/lib/schema";
import { useToast } from "./ui/Toast";

export function ExpandDialog({
  open,
  onClose,
  project,
  idea,
  clarifications,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  project: Project;
  idea: string;
  clarifications: Record<string, string>;
  onResult: (p: Project) => void;
}) {
  const stories = useMemo(
    () => project.epics.flatMap((e) => e.stories),
    [project],
  );
  const [storyId, setStoryId] = useState(stories[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function submit() {
    if (!storyId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, storyId, idea, clarifications }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Expand failed");
      onResult(data.project);
      toast("success", `Expanded ${storyId}.`);
      onClose();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Expand a story into sub-tasks">
      <div className="space-y-3">
        <select
          className="select"
          value={storyId}
          onChange={(e) => setStoryId(e.target.value)}
        >
          {stories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} — {s.title}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={submit} disabled={loading} className="btn btn-primary">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Expand
          </button>
        </div>
      </div>
    </Modal>
  );
}
