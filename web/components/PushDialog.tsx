"use client";
import { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import { Loader2 } from "lucide-react";
import type { Project } from "@/lib/schema";
import { useToast } from "./ui/Toast";

export function PushDialog({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: Project;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setSummary(null);
      setError(null);
      setMapping(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project, dryRun: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to compute diff");
        setSummary(data.summary);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    })();
  }, [open, project]);

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Push failed");
      setMapping(data.mapping);
      toast("success", `Created ${Object.keys(data.mapping).length} issues.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      toast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Push to Jira">
      <div className="space-y-3 text-sm">
        {error && (
          <div className="card p-3 border-red-500/40 text-red-500 text-xs">
            {error}
          </div>
        )}
        {!summary && !error && (
          <div className="flex items-center gap-2 text-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}
        {summary && !mapping && (
          <pre className="whitespace-pre-wrap text-xs bg-bg p-3 rounded-md border border-border">
            {summary}
          </pre>
        )}
        {mapping && (
          <div className="space-y-1 text-xs max-h-64 overflow-auto">
            {Object.entries(mapping).map(([id, key]) => (
              <div key={id} className="flex justify-between">
                <span className="font-mono">{id}</span>
                <span className="font-mono text-accent">{key}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost">
            {mapping ? "Close" : "Cancel"}
          </button>
          {!mapping && summary && (
            <button onClick={confirm} disabled={loading} className="btn btn-primary">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Create issues
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
