import { NextResponse } from "next/server";
import { loadAnalytics, type AnalyticsSource } from "@/lib/analytics/load";
import { getSessionUser } from "@/lib/session";
import {
  buildResponsesCsv,
  buildResponsesJson,
  contentDispositionFilename,
} from "@/lib/exports/formatters";

const VALID_FORMATS = ["csv", "json"] as const;
const VALID_SOURCES: AnalyticsSource[] = ["real", "demo", "both"];
const UUID_RE = /^[0-9a-f-]{36}$/i;

type Format = (typeof VALID_FORMATS)[number];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const formatParam = (url.searchParams.get("format") ?? "csv").toLowerCase();
  const sourceParam = (url.searchParams.get("source") ?? "real").toLowerCase();

  const format = VALID_FORMATS.includes(formatParam as Format)
    ? (formatParam as Format)
    : null;
  if (!format) {
    return NextResponse.json(
      { error: "Unsupported format. Use csv or json." },
      { status: 400 },
    );
  }

  const source: AnalyticsSource = VALID_SOURCES.includes(sourceParam as AnalyticsSource)
    ? (sourceParam as AnalyticsSource)
    : "real";

  const data = await loadAnalytics(user.id, id, source);
  if (!data) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const filename = contentDispositionFilename(data.survey.title, source, format);
  const disposition = `attachment; filename="${filename}"`;

  if (format === "csv") {
    const csv = buildResponsesCsv(data.questions, data.rows, source);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "json") {
    const payload = buildResponsesJson(data.survey, data.questions, data.rows, source);
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
      },
    });
  }
}
