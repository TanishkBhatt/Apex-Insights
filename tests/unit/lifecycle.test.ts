import { describe, expect, it } from "vitest";
import {
  canTransition,
  isAcceptingResponses,
  isPubliclyAnswerable,
} from "@/lib/surveys/lifecycle";
import { generateSlug } from "@/lib/surveys/lifecycle";

describe("survey lifecycle", () => {
  it("allows draft -> published", () => {
    expect(canTransition("draft", "published")).toBe(true);
  });

  it("allows published -> closed", () => {
    expect(canTransition("published", "closed")).toBe(true);
  });

  it("allows closed -> published (reopen)", () => {
    expect(canTransition("closed", "published")).toBe(true);
  });

  it("rejects draft -> closed and no-op transitions", () => {
    expect(canTransition("draft", "closed")).toBe(false);
    expect(canTransition("published", "published")).toBe(false);
    expect(canTransition("closed", "closed")).toBe(false);
  });

  it("only published surveys are publicly answerable", () => {
    expect(isPubliclyAnswerable("published")).toBe(true);
    expect(isPubliclyAnswerable("draft")).toBe(false);
    expect(isPubliclyAnswerable("closed")).toBe(false);
  });
});

describe("response availability", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("accepts responses while published with no limits", () => {
    expect(
      isAcceptingResponses(
        { status: "published", closesAt: null, maxResponses: null },
        0,
        now,
      ),
    ).toBe(true);
  });

  it("stops accepting after the close date", () => {
    expect(
      isAcceptingResponses(
        {
          status: "published",
          closesAt: new Date("2026-06-01T11:59:00Z"),
          maxResponses: null,
        },
        0,
        now,
      ),
    ).toBe(false);
  });

  it("stops accepting once the response limit is reached", () => {
    expect(
      isAcceptingResponses(
        { status: "published", closesAt: null, maxResponses: 3 },
        2,
        now,
      ),
    ).toBe(true);
    expect(
      isAcceptingResponses(
        { status: "published", closesAt: null, maxResponses: 3 },
        3,
        now,
      ),
    ).toBe(false);
  });

  it("never accepts responses for drafts or closed surveys", () => {
    expect(
      isAcceptingResponses(
        { status: "draft", closesAt: null, maxResponses: null },
        0,
        now,
      ),
    ).toBe(false);
    expect(
      isAcceptingResponses(
        { status: "closed", closesAt: null, maxResponses: null },
        0,
        now,
      ),
    ).toBe(false);
  });
});

describe("slug generation", () => {
  it("is URL safe and unpredictable", () => {
    const slugs = new Set(Array.from({ length: 200 }, () => generateSlug()));
    expect(slugs.size).toBe(200);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[A-Za-z0-9_-]{12}$/);
    }
  });
});
