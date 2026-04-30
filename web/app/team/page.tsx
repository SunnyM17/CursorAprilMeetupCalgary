"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import type { TeamMember } from "@/lib/schema";

const SPECIALTIES = ["backend", "frontend", "design", "devops", "qa", "pm", "data", "generalist"];

export default function TeamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { idea, clarifications, team, setTeam, setProject, setGenerating, generating } = useStore();
  const [local, setLocal] = useState<TeamMember[]>(team.length ? team : seed());
  const [submitting, setSubmitting] = useState(false);

  function update(idx: number, patch: Partial<TeamMember>) {
    setLocal((arr) => arr.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  }
  function add() {
    setLocal((arr) => [
      ...arr,
      { name: `Member${arr.length + 1}`, specialties: ["generalist"], capacity_pct: 100 },
    ]);
  }
  function remove(idx: number) {
    setLocal((arr) => arr.filter((_, i) => i !== idx));
  }
  function toggleSpec(idx: number, spec: string) {
    setLocal((arr) =>
      arr.map((m, i) => {
        if (i !== idx) return m;
        const has = m.specialties.includes(spec);
        return {
          ...m,
          specialties: has ? m.specialties.filter((s) => s !== spec) : [...m.specialties, spec],
        };
      }),
    );
  }

  async function generate() {
    if (!idea.trim()) {
      toast("error", "Go back and describe your idea.");
      return;
    }
    if (!local.length) {
      toast("error", "Add at least one team member.");
      return;
    }
    for (const m of local) {
      if (!m.name.trim()) {
        toast("error", "Each member needs a name.");
        return;
      }
      if (m.capacity_pct < 1 || m.capacity_pct > 100) {
        toast("error", `${m.name}: capacity must be 1–100.`);
        return;
      }
    }
    setTeam(local);
    setSubmitting(true);
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, clarifications, team: local }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generate failed");
      setProject(data.project);
      toast("success", "Plan generated.");
      router.push("/plan");
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted">Step 2 of 3</div>
        <h1 className="text-2xl font-bold">Who&apos;s on the team?</h1>
        <p className="text-muted text-sm">
          We use specialties + capacity to balance assignments and parallelize work.
        </p>
      </div>

      <div className="space-y-3">
        {local.map((m, i) => (
          <div key={i} className="card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <input
                className="input flex-1 max-w-xs"
                placeholder="Name"
                value={m.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-xs text-muted">Capacity %</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="input w-20"
                  value={m.capacity_pct}
                  onChange={(e) => update(i, { capacity_pct: Number(e.target.value) })}
                />
                <button
                  className="btn btn-ghost text-red-500"
                  onClick={() => remove(i)}
                  aria-label="Remove member"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted mb-1">Specialties</div>
              <div className="flex flex-wrap gap-1.5">
                {SPECIALTIES.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleSpec(i, s)}
                    className={
                      "chip cursor-pointer " +
                      (m.specialties.includes(s)
                        ? "bg-accent text-white border-transparent"
                        : "")
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
        <button onClick={add} className="btn">
          <Plus className="w-4 h-4" /> Add member
        </button>
      </div>

      <div className="flex justify-between items-center">
        <Link href="/new" className="btn btn-ghost">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <button onClick={generate} disabled={submitting || generating} className="btn btn-primary">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          Generate plan
        </button>
      </div>
    </div>
  );
}

function seed(): TeamMember[] {
  return [
    { name: "Alice", specialties: ["backend"], capacity_pct: 100 },
    { name: "Bob", specialties: ["frontend"], capacity_pct: 80 },
    { name: "Carol", specialties: ["design", "frontend"], capacity_pct: 100 },
  ];
}
