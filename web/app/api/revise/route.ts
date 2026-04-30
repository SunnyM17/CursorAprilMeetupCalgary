import { NextRequest, NextResponse } from "next/server";
import { chat, extractProjectJson } from "@/lib/openai";
import {
  buildGenerateMessage,
  buildReviseMessage,
} from "@/lib/prompts";
import { ProjectSchema, type Project } from "@/lib/schema";
import { annotate } from "@/lib/optimizer";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { project, feedback, idea, clarifications } = (await req.json()) as {
      project: Project;
      feedback: string;
      idea?: string;
      clarifications?: Record<string, string>;
    };
    if (!project || !feedback?.trim()) {
      return NextResponse.json(
        { error: "project and feedback are required" },
        { status: 400 },
      );
    }
    // Reconstruct minimal context: original generation message + assistant + revise.
    const reply = await chat([
      {
        role: "user",
        content: buildGenerateMessage(
          idea ?? project.project.summary,
          project.team,
          clarifications ?? {},
        ),
      },
      { role: "assistant", content: JSON.stringify(project) },
      { role: "user", content: buildReviseMessage(feedback) },
    ]);
    const raw = extractProjectJson(reply);
    if (!raw) {
      return NextResponse.json(
        { error: "Could not parse JSON from model reply", reply },
        { status: 502 },
      );
    }
    const parsed = ProjectSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Project JSON did not match schema", issues: parsed.error.issues },
        { status: 502 },
      );
    }
    return NextResponse.json({ project: annotate(parsed.data) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
