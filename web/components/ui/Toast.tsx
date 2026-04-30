"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastKind = "success" | "error" | "info";
export type Toast = { id: number; kind: ToastKind; message: string };

type ToastContext = {
  toast: (kind: ToastKind, message: string) => void;
};
const Ctx = createContext<ToastContext | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast outside provider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const toast = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, message }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "card px-4 py-2 flex items-start gap-2 min-w-[260px] shadow-lg",
              t.kind === "error" && "border-red-500/40",
              t.kind === "success" && "border-emerald-500/40",
            )}
          >
            {t.kind === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />}
            {t.kind === "error" && <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />}
            {t.kind === "info" && <Info className="w-4 h-4 text-accent mt-0.5" />}
            <div className="text-sm flex-1">{t.message}</div>
            <button
              onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))}
              className="btn-ghost p-0.5"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
