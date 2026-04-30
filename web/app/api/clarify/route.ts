import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/openai";
import { buildIntakeMessage } from "@/lib/prompts";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { idea } = (await req.json()) as { idea?: string };
    if (!idea || !idea.trim()) {
      return NextResponse.json({ error: "idea is required" }, { status: 400 });
    }
    const reply = await chat([{ role: "user", content: buildIntakeMessage(idea) }]);
    // Parse plain-text reply into bullet questions.
    const lines = reply
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*([-*\d]+[.)]?\s*)/, "").trim())
      .filter((l) => l.length > 0 && /\?$/.test(l));
    const questions = lines.length ? lines : [reply.trim()];
    return NextResponse.json({ questions, raw: reply });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
