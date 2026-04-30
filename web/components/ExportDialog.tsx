"use client";
import { Modal } from "./ui/Modal";
import { FileJson, FileText, FileSpreadsheet } from "lucide-react";
import type { Project } from "@/lib/schema";
import { useToast } from "./ui/Toast";

export function ExportDialog({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: Project;
}) {
  const { toast } = useToast();

  async function download(format: "md" | "csv" | "json") {
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, format }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Export failed");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="?([^"]+)"?/);
      const name = m?.[1] || `project.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      toast("success", `Downloaded ${name}`);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unknown error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Export">
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => download("md")} className="card p-4 hover:bg-bg flex flex-col items-center gap-2 text-sm">
          <FileText className="w-6 h-6" /> Markdown
        </button>
        <button onClick={() => download("csv")} className="card p-4 hover:bg-bg flex flex-col items-center gap-2 text-sm">
          <FileSpreadsheet className="w-6 h-6" /> Jira CSV
        </button>
        <button onClick={() => download("json")} className="card p-4 hover:bg-bg flex flex-col items-center gap-2 text-sm">
          <FileJson className="w-6 h-6" /> JSON
        </button>
      </div>
    </Modal>
  );
}
