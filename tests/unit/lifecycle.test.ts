import { describe, expect, it } from "vitest";
import { canTransition, isPubliclyAnswerable } from "@/lib/surveys/lifecycle";
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

describe("slug generation", () => {
  it("is URL safe and unpredictable", () => {
    const slugs = new Set(Array.from({ length: 200 }, () => generateSlug()));
    expect(slugs.size).toBe(200);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[A-Za-z0-9_-]{12}$/);
    }
  });
});
