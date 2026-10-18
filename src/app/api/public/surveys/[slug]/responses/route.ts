import { NextResponse } from "next/server";
import { z } from "zod";
import { clientAddress, pruneBuckets, rateLimit } from "@/lib/rate-limit";
import { submitPublicResponse, SubmissionError } from "@/lib/responses/service";
import { LIMITS } from "@/lib/validation/survey";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 256 * 1024;

const slugSchema = z.string().regex(/^[A-Za-z0-9_-]{6,64}$/, "Invalid survey link.");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return NextResponse.json({ error: "Survey not found." }, { status: 404 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Submission is too large." }, { status: 413 });
  }

  pruneBuckets();
  const limit = rateLimit(`submit:${clientAddress(request.headers)}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Submission is too large." }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const responseId = await submitPublicResponse(body, parsedSlug.data);
    return NextResponse.json({ ok: true, responseId }, { status: 201 });
  } catch (error) {
    if (error instanceof SubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Public submission failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not save your response." }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json(
    { error: "Method not allowed.", maxAnswers: LIMITS.cpuAnswersMax },
    { status: 405 },
  );
}
