import { dialActions, lockOf, newProgress, step } from "./engine";
import type { Action, AdventureDef, Progress } from "./types";

const key = (p: Progress) =>
  [p.flags, p.inventory, p.offered, p.taken, p.journal].map((l) => [...l].sort().join(",")).join("|") + (p.openLock ?? "");

/**
 * Breadth-first search over everything a player can do: inspect any hotspot, take what's offered,
 * use any held item on any hotspot, and enter a lock's answer once it's open. Returns the shortest
 * winning action list, or null if the room can't be escaped. A game-rule check for every room.
 * `skipLocks` forbids solving those locks — used to prove no lock can be bypassed.
 */
export function solve(def: AdventureDef, { skipLocks = [] as string[], limit = 20000 } = {}): Action[] | null {
  const start = newProgress(def);
  const queue: { p: Progress; path: Action[] }[] = [{ p: start, path: [] }];
  const seen = new Set([key(start)]);

  while (queue.length && seen.size < limit) {
    const { p, path } = queue.shift()!;
    const moves: Action[][] = [];
    for (const h of def.hotspots) moves.push([{ type: "INSPECT", target: h.id }]);
    for (const item of p.offered) moves.push([{ type: "TAKE", item }]);
    for (const item of p.inventory) for (const h of def.hotspots) moves.push([{ type: "DROP_ITEM", item, target: h.id }]);
    if (p.openLock && !skipLocks.includes(p.openLock)) {
      const lock = lockOf(def, p.openLock)!;
      // The answer is only "known" once the clues that reveal it are in the journal.
      if ((lock.knowledge ?? []).every((c) => p.journal.includes(c))) {
        moves.push([...dialActions(lock, lock.answer), { type: "SUBMIT_LOCK", lock: lock.id }]);
      }
    }
    for (const move of moves) {
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
