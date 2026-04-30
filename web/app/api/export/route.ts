import { NextRequest, NextResponse } from "next/server";
import {
  rowsToCsv,
  slugify,
  stripDebugFields,
  toJiraCsvRows,
  toMarkdown,
} from "@/lib/exporters";
import type { Project } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { project, format } = (await req.json()) as {
      project: Project;
      format: "md" | "csv" | "json";
    };
    if (!project) {
      return NextResponse.json({ error: "project is required" }, { status: 400 });
    }
    const name = slugify(project.project.name || "project");

    if (format === "md") {
      const body = toMarkdown(project);
      return new NextResponse(body, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${name}.md"`,
        },
      });
    }
    if (format === "csv") {
      const body = rowsToCsv(toJiraCsvRows(project));
      return new NextResponse(body, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${name}.csv"`,
        },
      });
    }
    if (format === "json") {
      const body = JSON.stringify(stripDebugFields(project), null, 2);
      return new NextResponse(body, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${name}.json"`,
        },
      });
    }
    return NextResponse.json({ error: "unknown format" }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
