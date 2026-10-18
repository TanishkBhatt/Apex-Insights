/**
 * Seeded pseudo-random number generator (mulberry32) for deterministic,
 * reproducible synthetic data generation.
 */
export function createPrng(seed: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  let a = h >>> 0;
  return function rand(): number {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return value;
  };
}

export function randomInt(rand: () => number, min: number, max: number): number {
  if (max < min) [min, max] = [max, min];
  const range = max - min + 1;
  if (range <= 0) return min;
  return Math.floor(rand() * range) + min;
}

export function pick<T>(rand: () => number, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("Cannot pick from an empty array.");
  }
  return items[randomInt(rand, 0, items.length - 1)];
}

export function pickMultiple<T>(
  rand: () => number,
  items: readonly T[],
  count: number,
): T[] {
  if (count <= 0) return [];
  const pool = [...items];
  if (count >= pool.length) {
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice();
  }
  const selected: T[] = [];
  const used = new Set<number>();
  let attempts = 0;
  while (selected.length < count && attempts < count * 10) {
    const index = Math.floor(rand() * pool.length);
    if (!used.has(index)) {
      used.add(index);
      selected.push(pool[index]);
    }
    attempts += 1;
  }
  if (selected.length < count) {
    for (let i = 0; i < pool.length && selected.length < count; i += 1) {
      if (!used.has(i)) selected.push(pool[i]);
    }
  }
  return selected;
}

export function sampleWeights<T>(rand: () => number, items: Array<{ value: T; weight: number }>): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (total <= 0) return pick(rand, items.map((item) => item.value));
  let r = rand() * total;
  for (const item of items) {
    r -= Math.max(0, item.weight);
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

export function sentence(rand: () => number, words: string[], maxWords = 6): string {
  const count = randomInt(rand, 1, Math.max(1, maxWords));
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) parts.push(pick(rand, words));
  const text = parts.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}
