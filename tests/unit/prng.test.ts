import { describe, expect, it } from "vitest";
import {
  createPrng,
  pick,
  pickMultiple,
  randomInt,
  sampleWeights,
  sentence,
} from "@/lib/synthetic/prng";

describe("createPrng", () => {
  it("produces identical sequences for identical seeds", () => {
    const a = createPrng("seed-1");
    const b = createPrng("seed-1");
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createPrng("seed-1");
    const b = createPrng("seed-2");
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("stays within [0, 1)", () => {
    const rand = createPrng("range-check");
    for (let i = 0; i < 1000; i += 1) {
      const value = rand();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("randomInt", () => {
  it("respects bounds", () => {
    const rand = createPrng("ints");
    for (let i = 0; i < 500; i += 1) {
      const value = randomInt(rand, 3, 7);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(7);
    }
  });
});

describe("pick / pickMultiple", () => {
  it("picks only from the provided items", () => {
    const rand = createPrng("picks");
    const items = ["a", "b", "c"];
    for (let i = 0; i < 100; i += 1) {
      expect(items).toContain(pick(rand, items));
    }
  });

  it("returns unique items when count is smaller than the pool", () => {
    const rand = createPrng("unique");
    const items = ["a", "b", "c", "d", "e"];
    const chosen = pickMultiple(rand, items, 3);
    expect(chosen).toHaveLength(3);
    expect(new Set(chosen).size).toBe(3);
  });

  it("returns all items when count exceeds the pool", () => {
    const rand = createPrng("overflow");
    const items = ["a", "b", "c"];
    const chosen = pickMultiple(rand, items, 10);
    expect([...chosen].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("sampleWeights", () => {
  it("honours the heaviest item deterministically", () => {
    const rand = createPrng("weights");
    const picked = Array.from({ length: 50 }, () =>
      sampleWeights(rand, [
        { value: "common", weight: 100 },
        { value: "rare", weight: 1 },
      ]),
    );
    expect(picked.filter((value) => value === "common").length).toBeGreaterThan(
      picked.filter((value) => value === "rare").length,
    );
  });
});

describe("sentence", () => {
  it("returns a capitalised sentence ending in a period", () => {
    const rand = createPrng("words");
    const text = sentence(rand, ["alpha", "beta", "gamma"]);
    expect(text.charAt(0)).toBe(text.charAt(0).toUpperCase());
    expect(text.endsWith(".")).toBe(true);
  });
});
