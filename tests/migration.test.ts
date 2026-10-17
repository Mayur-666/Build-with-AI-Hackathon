// Regression guard for the engine migration: the classic/Gemini room must behave exactly as it did
// on the original hard-coded reducer (lib/game/reducer.ts), except for the one intended change —
// the machine now unlocks the door, and the player opens the door to escape.
import { describe, expect, it } from "vitest";
import { dialActions, lockOf, newProgress, revealedHintLevel, step } from "../lib/engine/engine";
import { fromChainRoom } from "../lib/engine/fromChainRoom";
import type { Action as EngineAction, Progress } from "../lib/engine/types";
import { buildFallbackRoom } from "../lib/game/fallbackRoom";
import { gameReducer, initialGameState, revealedHintLevel as oldHintLevel } from "../lib/game/reducer";
import type { GameAction, GameState } from "../lib/game/types";

type Pair = { old: GameAction[]; neu: EngineAction[] };

function both(room = buildFallbackRoom()) {
  const def = fromChainRoom(room);
  let o: GameState = initialGameState(room);
  let n: Progress = newProgress(def);
  const run = ({ old, neu }: Pair) => {
    o = old.reduce(gameReducer, o);
    n = neu.reduce((p, a) => step(def, p, a), n);
    return { o, n };
  };
  return { room, def, run, get o() { return o; }, get n() { return n; } };
}

const same = (o: GameState, n: Progress) => {
  expect(n.message?.lines).toEqual(o.message?.lines);
  expect(n.inventory.length).toBe(o.inventory.length);
  expect(n.flags.includes("boxOpen")).toBe(o.boxOpen);
  expect(n.wrongAttempts).toBe(o.wrongAttempts);
  expect(n.hintsUsed).toBe(o.hintsUsed);
};

describe("engine migration parity with the original reducer", () => {
  it("the full classic sequence produces the same text and state at every step", () => {
    for (let i = 0; i < 40; i++) {
      const g = both();
      const { clueHolder, keyHolder, code } = g.room.solution;
      const lock = lockOf(g.def, "machine")!;
      const wrong = code === "000" ? "111" : "000";

      // Intro.
      expect(g.n.message?.lines).toEqual(g.o.message?.lines);
      // Locked things first.
      for (const t of ["box", "exit"] as const) {
        g.run({ old: [{ type: "INSPECT", target: t }], neu: [{ type: "INSPECT", target: t }] });
        same(g.o, g.n);
      }
      // A hint before anything is found.
      g.run({ old: [{ type: "REQUEST_HINT" }], neu: [{ type: "REQUEST_HINT" }] });
      same(g.o, g.n);
      expect(revealedHintLevel(g.def, g.n)).toBe(oldHintLevel(g.o));
      // Clue, key.
      g.run({ old: [{ type: "INSPECT", target: clueHolder }], neu: [{ type: "INSPECT", target: clueHolder }] });
      same(g.o, g.n);
      expect(g.n.journal.map((id) => g.def.clues[id])).toEqual(g.o.journal.map((j) => j.text));
      g.run({ old: [{ type: "INSPECT", target: keyHolder }], neu: [{ type: "INSPECT", target: keyHolder }] });
      same(g.o, g.n);
      expect(g.n.offered.length > 0).toBe(g.o.keyOffered);
      g.run({ old: [{ type: "COLLECT_KEY" }], neu: [{ type: "TAKE", item: "key" }] });
      same(g.o, g.n);
      // Wrong item use, then the box.
      g.run({ old: [{ type: "DROP_ITEM", item: "key", target: "exit" }], neu: [{ type: "DROP_ITEM", item: "key", target: "exit" }] });
      same(g.o, g.n);
      g.run({ old: [{ type: "DROP_ITEM", item: "key", target: "box" }], neu: [{ type: "DROP_ITEM", item: "key", target: "box" }] });
      same(g.o, g.n);
      expect(g.n.journal.map((id) => g.def.clues[id])).toEqual(g.o.journal.map((j) => j.text));
      // A wrong code.
      g.run({
        old: [{ type: "INSPECT", target: "machine" }, { type: "ENTER_CODE", code: wrong }],
        neu: [{ type: "INSPECT", target: "machine" }, ...dialActions(lock, wrong.split("")), { type: "SUBMIT_LOCK", lock: "machine" }],
      });
      same(g.o, g.n);
      // The right code: the old reducer escaped here; the engine unlocks the door instead…
      g.run({ old: [{ type: "ENTER_CODE", code }], neu: [...dialActions(lock, code.split("")), { type: "SUBMIT_LOCK", lock: "machine" }] });
      expect(g.o.escaped).toBe(true);
      expect(g.n.escaped).toBe(false);
      expect(g.n.flags).toContain("doorUnlocked");
      // …and opening the door escapes, with the same ending text.
      g.run({ old: [], neu: [{ type: "INSPECT", target: "exit" }] });
      expect(g.n.escaped).toBe(true);
      expect(g.n.message?.lines).toEqual([g.room.escapeText]);
    }
  });

  it("hint texts per step are unchanged", () => {
    const g = both();
    const { keyHolder } = g.room.solution;
    for (let k = 0; k < 3; k++) {
      g.run({ old: [{ type: "REQUEST_HINT" }], neu: [{ type: "REQUEST_HINT" }] });
      same(g.o, g.n);
    }
    g.run({ old: [{ type: "INSPECT", target: keyHolder }, { type: "COLLECT_KEY" }], neu: [{ type: "INSPECT", target: keyHolder }, { type: "TAKE", item: "key" }] });
    for (let k = 0; k < 3; k++) {
      g.run({ old: [{ type: "REQUEST_HINT" }], neu: [{ type: "REQUEST_HINT" }] });
      same(g.o, g.n);
    }
  });
});
