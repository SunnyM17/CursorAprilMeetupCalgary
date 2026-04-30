"use client";
import { useState } from "react";
import { Modal } from "./ui/Modal";
import { Loader2 } from "lucide-react";
import type { Project } from "@/lib/schema";
import { useToast } from "./ui/Toast";

export function ReviseDialog({
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
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function submit() {
    if (!feedback.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, feedback, idea, clarifications }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Revise failed");
      onResult(data.project);
      toast("success", "Plan revised.");
      setFeedback("");
      onClose();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Revise plan">
      <div className="space-y-3">
        <p className="text-sm text-muted">
          Tell the agent what to change. The full plan will be regenerated.
        </p>
        <textarea
          className="textarea min-h-[140px]"
          placeholder="e.g. Split the API epic into auth and recipes, and add a story for caching..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={submit} disabled={loading} className="btn btn-primary">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Revise
          </button>
        </div>
      </div>
    </Modal>
  );
}
