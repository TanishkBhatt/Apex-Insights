import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Question } from "@/db/schema";
import { computeQuestionStats, type AnalyticsRow } from "@/lib/analytics/compute";
import { QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/validation/survey";
import { formatAnswerValue, summarizeStatsForPdf, toPdfSafeText } from "./formatters";

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM_LIMIT = 64;

const INK = rgb(0.12, 0.16, 0.22);
const MUTED = rgb(0.42, 0.47, 0.53);
const ACCENT = rgb(0.31, 0.27, 0.9);
const RULE = rgb(0.85, 0.87, 0.9);

const MAX_TABLE_ROWS = 150;

type Ctx = {
  doc: PDFDocument;
  page: import("pdf-lib").PDFPage;
  font: import("pdf-lib").PDFFont;
  bold: import("pdf-lib").PDFFont;
  y: number;
};

async function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - MARGIN;
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y - needed < BOTTOM_LIMIT) {
    newPage(ctx);
  }
}

function drawText(
  ctx: Ctx,
  text: string,
  options: {
    font?: import("pdf-lib").PDFFont;
    size?: number;
    color?: import("pdf-lib").RGB;
    indent?: number;
    leading?: number;
    maxWidth?: number;
  } = {},
) {
  const font = options.font ?? ctx.font;
  const size = options.size ?? 10;
  const color = options.color ?? INK;
  const indent = options.indent ?? 0;
  const maxWidth = options.maxWidth ?? CONTENT_WIDTH - indent;
  const lineHeight = options.leading ?? size * 1.4;

  for (const line of wrapText(font, text, size, maxWidth)) {
    ensureSpace(ctx, lineHeight);
    ctx.page.drawText(line, {
      x: MARGIN + indent,
      y: ctx.y - size,
      size,
      font,
      color,
    });
    ctx.y -= lineHeight;
  }
}

function wrapText(
  font: import("pdf-lib").PDFFont,
  text: string,
  size: number,
  maxWidth: number,
): string[] {
  const safe = toPdfSafeText(text);
  const paragraphs = safe.split(/\r?\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        // Hard-break words longer than a line.
        if (font.widthOfTextAtSize(word, size) > maxWidth) {
          let chunk = "";
          for (const char of word) {
            if (font.widthOfTextAtSize(chunk + char, size) > maxWidth) {
              lines.push(chunk);
              chunk = char;
            } else {
              chunk += char;
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function drawRule(ctx: Ctx) {
  ensureSpace(ctx, 16);
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y - 4 },
    end: { x: PAGE_WIDTH - MARGIN, y: ctx.y - 4 },
    thickness: 0.7,
    color: RULE,
  });
  ctx.y -= 16;
}

export async function buildResponsesPdf(params: {
  survey: { id: string; title: string; description: string | null; status: string };
  questions: Question[];
  rows: AnalyticsRow[];
  source: string;
  generatedAt: Date;
}): Promise<Uint8Array> {
  const { survey, questions, rows, source, generatedAt } = params;

  const doc = await PDFDocument.create();
  doc.setTitle(toPdfSafeText(survey.title));
  doc.setAuthor("Apex Insights");
  doc.setCreator("Apex Insights");
  doc.setProducer("Apex Insights");
  doc.setSubject(`Survey export (${source})`);
  doc.setCreationDate(generatedAt);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: Ctx = { doc, page: undefined as never, font, bold, y: 0 };
  await newPage(ctx);

  // Header
  drawText(ctx, survey.title, { font: bold, size: 20, color: INK });
  drawText(
    ctx,
    `Apex Insights · Survey report · ${source === "demo" ? "Demo data" : source === "both" ? "Real + demo data" : "Real responses"}`,
    { size: 9, color: MUTED },
  );
  drawText(ctx, `Generated ${generatedAt.toISOString()}`, { size: 9, color: MUTED });
  if (survey.description) {
    drawText(ctx, survey.description, { size: 10, color: INK });
  }
  drawRule(ctx);

  // Summary
  drawText(ctx, "Summary", { font: bold, size: 13, color: ACCENT });
  const answeredCounts = questions.map((question) => {
    const values = rows.map(
      (row) => row.answers.find((a) => a.questionId === question.id)?.value ?? null,
    );
    return computeQuestionStats(String(question.type), values);
  });
  drawText(ctx, `Responses: ${rows.length}`);
  drawText(ctx, `Questions: ${questions.length}`);
  ctx.y -= 8;

  // Per-question breakdown
  questions.forEach((question, index) => {
    ensureSpace(ctx, 60);
    const typeLabel =
      QUESTION_TYPE_LABELS[question.type as QuestionType] ?? String(question.type);
    drawText(ctx, `${index + 1}. ${question.title}`, { font: bold, size: 11, color: INK });
    drawText(ctx, typeLabel, { size: 8.5, color: MUTED });
    for (const line of summarizeStatsForPdf(answeredCounts[index])) {
      drawText(ctx, line, { size: 9.5, indent: 10 });
    }
    ctx.y -= 6;
  });

  drawRule(ctx);

  // Response table
  drawText(ctx, "Responses", { font: bold, size: 13, color: ACCENT });
  if (rows.length === 0) {
    drawText(ctx, "No responses to show.", { size: 10, color: MUTED });
  } else {
    const shown = rows.slice(0, MAX_TABLE_ROWS);
    for (let i = 0; i < shown.length; i += 1) {
      const row = shown[i];
      ensureSpace(ctx, 40);
      drawText(ctx, `#${i + 1} · ${row.submittedAt.toISOString()}`, {
        font: bold,
        size: 9,
        color: INK,
      });
      const answerByQuestion = new Map(row.answers.map((a) => [a.questionId, a]));
      for (const question of questions) {
        const answer = answerByQuestion.get(question.id);
        drawText(ctx, `${question.title}:`, { size: 8.5, color: MUTED, indent: 10 });
        drawText(ctx, formatAnswerValue(String(question.type), answer?.value ?? null) || "—", {
          size: 9,
          indent: 18,
        });
      }
      ctx.y -= 6;
    }
    if (rows.length > shown.length) {
      drawText(
        ctx,
        `Showing first ${shown.length} of ${rows.length} responses. Use CSV or JSON export for the full dataset.`,
        { size: 9, color: MUTED },
      );
    }
  }

  // Footer page numbers
  const pages = doc.getPages();
  pages.forEach((page, index) => {
    const label = `Page ${index + 1} of ${pages.length}`;
    const width = font.widthOfTextAtSize(label, 8);
    page.drawText(label, {
      x: PAGE_WIDTH - MARGIN - width,
      y: MARGIN / 2,
      size: 8,
      font,
      color: MUTED,
    });
  });

  return doc.save();
}

export function contentDispositionFilename(title: string, source: string, ext: string): string {
  const slug = toPdfSafeText(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "survey"}-${source}.${ext}`;
}
