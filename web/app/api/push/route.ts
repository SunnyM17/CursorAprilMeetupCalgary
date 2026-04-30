import { NextRequest, NextResponse } from "next/server";
import { hasJiraCredentials, pushToJira, diffSummary } from "@/lib/jira";
import type { Project } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    if (!hasJiraCredentials()) {
      return NextResponse.json(
        { error: "Missing Jira credentials. Set JIRA_URL/EMAIL/TOKEN/PROJECT_KEY." },
        { status: 412 },
      );
    }
    const { project, dryRun } = (await req.json()) as {
      project: Project;
      dryRun?: boolean;
    };
    if (!project) {
      return NextResponse.json({ error: "project is required" }, { status: 400 });
    }
    if (dryRun) {
      return NextResponse.json({ summary: diffSummary(project) });
    }
    const mapping = await pushToJira(project);
    return NextResponse.json({ mapping });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
