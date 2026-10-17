import { dialActions, lockOf, newProgress, step } from "./engine";
import type { Action, AdventureDef, Progress } from "./types";

const key = (p: Progress) =>
  [p.flags, p.inventory, p.offered, p.taken, p.journal].map((l) => [...l].sort().join(",")).join("|") + (p.openLock ?? "");

/** Everything a player could do next from `p`. `knows` gates entering a lock's answer. */
function moves(def: AdventureDef, p: Progress, { skipLocks = [] as string[], needKnowledge = true } = {}): Action[][] {
  const out: Action[][] = def.hotspots.map((h) => [{ type: "INSPECT", target: h.id }] as Action[]);
  for (const item of p.offered) out.push([{ type: "TAKE", item }]);
  for (const item of p.inventory) for (const h of def.hotspots) out.push([{ type: "DROP_ITEM", item, target: h.id }]);
  if (p.openLock && !skipLocks.includes(p.openLock)) {
    const lock = lockOf(def, p.openLock)!;
    // The answer is only "known" once the clues that reveal it are in the journal.
    if (!needKnowledge || (lock.knowledge ?? []).every((c) => p.journal.includes(c))) {
      out.push([...dialActions(lock, lock.answer), { type: "SUBMIT_LOCK", lock: lock.id }]);
    }
  }
  return out;
}

/**
 * Breadth-first search over everything a player can do: inspect any hotspot, take what's offered,
 * use any held item on any hotspot, and enter a lock's answer once it's open and its clues are
 * known. Returns the shortest winning action list, or null if the room can't be escaped.
 * `skipLocks` forbids solving those locks — used to prove no lock can be bypassed.
 * `from` starts from a mid-game state — used to prove there are no dead ends.
 */
export function solve(
  def: AdventureDef,
  { skipLocks = [] as string[], limit = 20000, from }: { skipLocks?: string[]; limit?: number; from?: Progress } = {},
): Action[] | null {
  const start = from ?? newProgress(def);
  if (start.escaped) return [];
  const queue: { p: Progress; path: Action[] }[] = [{ p: start, path: [] }];
  const seen = new Set([key(start)]);

  while (queue.length && seen.size < limit) {
    const { p, path } = queue.shift()!;
    for (const move of moves(def, p, { skipLocks })) {
      const next = move.reduce((s, a) => step(def, s, a), p);
      if (next.escaped) return [...path, ...move];
      const k = key(next);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push({ p: next, path: [...path, ...move] });
      }
    }
  }
  return null;
}

/** Every distinct state a player can reach, including by lucky guesses (for dead-end checks). */
export function reachable(def: AdventureDef, limit = 5000): Progress[] {
  const start = newProgress(def);
  const out = [start];
  const seen = new Set([key(start)]);
  for (let i = 0; i < out.length && out.length < limit; i++) {
    const p = out[i];
    if (p.escaped) continue;
    for (const move of moves(def, p, { needKnowledge: false })) {
      const next = move.reduce((s, a) => step(def, s, a), p);
      const k = key(next) + (next.escaped ? "!" : "");
      if (!seen.has(k)) {
        seen.add(k);
        out.push(next);
      }
    }
  }
  return out;
}
