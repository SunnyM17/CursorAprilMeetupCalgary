import { NextRequest, NextResponse } from "next/server";
import { chat, extractProjectJson } from "@/lib/openai";
import { buildGenerateMessage } from "@/lib/prompts";
import { ProjectSchema, type TeamMember } from "@/lib/schema";
import { annotate } from "@/lib/optimizer";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      idea: string;
      clarifications?: Record<string, string>;
      team: TeamMember[];
    };
    if (!body.idea || !body.team?.length) {
      return NextResponse.json(
        { error: "idea and non-empty team are required" },
        { status: 400 },
      );
    }
    const reply = await chat([
      {
        role: "user",
        content: buildGenerateMessage(body.idea, body.team, body.clarifications ?? {}),
      },
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
        { error: "Project JSON did not match schema", issues: parsed.error.issues, raw },
        { status: 502 },
      );
    }
    const project = annotate(parsed.data);
    return NextResponse.json({ project });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
