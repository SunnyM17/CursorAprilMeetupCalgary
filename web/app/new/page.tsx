"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

export default function NewIdeaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { idea, setIdea, clarifyingQuestions, setClarifyingQuestions, clarifications, setClarifications } = useStore();
  const [loading, setLoading] = useState(false);

  async function clarify() {
    if (!idea.trim()) {
      toast("error", "Describe your idea first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Clarify failed");
      setClarifyingQuestions(data.questions || []);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted">Step 1 of 3</div>
        <h1 className="text-2xl font-bold">What do you want to build?</h1>
        <p className="text-muted text-sm">
          Describe the idea in your own words. We&apos;ll ask a couple of clarifying
          questions before generating the plan.
        </p>
      </div>

      <textarea
        className="textarea min-h-[180px]"
        placeholder="e.g. A web app that lets home cooks share recipes and discover seasonal meals..."
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
      />

      {clarifyingQuestions.length === 0 ? (
        <div className="flex gap-2">
          <button onClick={clarify} disabled={loading} className="btn btn-primary">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Ask clarifying questions
          </button>
        </div>
      ) : (
        <div className="card p-4 space-y-3">
          <div className="font-semibold">A few quick questions:</div>
          <ol className="space-y-3 list-decimal list-inside">
            {clarifyingQuestions.map((q, i) => (
              <li key={i} className="space-y-1">
                <div className="text-sm">{q}</div>
                <input
                  className="input"
                  placeholder="Your answer (optional)"
                  value={clarifications[`q${i}`] || ""}
                  onChange={(e) =>
                    setClarifications({ ...clarifications, [`q${i}`]: e.target.value })
                  }
                />
              </li>
            ))}
          </ol>
          <div className="flex justify-between items-center">
            <button onClick={clarify} disabled={loading} className="btn btn-ghost">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Re-ask"}
            </button>
            <Link href="/team" className="btn btn-primary">
              Next: Team <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
