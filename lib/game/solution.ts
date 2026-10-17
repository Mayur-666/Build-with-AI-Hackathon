import { OBJECT_IDS, type ObjectId, type Solution } from "./types";

type Rng = () => number; // returns [0, 1)

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The engine decides the whole solution before any room text exists.
 * Gemini is later told only the roles, never the digits.
 */
export function createSolution(rng: Rng = Math.random): Solution {
  const clueHolder = pick(OBJECT_IDS, rng);
  const keyHolder = pick(
    OBJECT_IDS.filter((id) => id !== clueHolder),
    rng,
  );
  const order = shuffle(OBJECT_IDS, rng) as [ObjectId, ObjectId, ObjectId];
  const digits = {
    a: Math.floor(rng() * 10),
    b: Math.floor(rng() * 10),
    c: Math.floor(rng() * 10),
  };
  const code = order.map((id) => digits[id]).join("");
  return { clueHolder, keyHolder, order, digits, code };
}
