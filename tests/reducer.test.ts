import { describe, expect, it } from "vitest";
import { FALLBACK_ROOM_TEXT } from "../lib/game/fallbackRoom";
import { fillRoom } from "../lib/game/fill";
import { currentHintStep, gameReducer, initialGameState, revealedHintLevel } from "../lib/game/reducer";
import { createSolution } from "../lib/game/solution";
import type { GameAction, GameState } from "../lib/game/types";

function play(state: GameState, actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

function freshGame() {
  const room = fillRoom(FALLBACK_ROOM_TEXT, createSolution());
  return initialGameState(room);
}

describe("gameReducer — the fixed puzzle chain", () => {
  it("a scripted playthrough escapes, for many random solutions", () => {
    for (let i = 0; i < 100; i++) {
      const start = freshGame();
      const { clueHolder, keyHolder, code } = start.room.solution;

      let s = play(start, [{ type: "INSPECT", target: clueHolder }]);
      expect(s.journal.map((j) => j.id)).toEqual(["clue"]);

      s = play(s, [{ type: "INSPECT", target: keyHolder }]);
      expect(s.keyOffered).toBe(true);

      s = play(s, [{ type: "COLLECT_KEY" }]);
      expect(s.inventory.map((it) => it.id)).toEqual(["key"]);

      s = play(s, [
        { type: "SELECT_ITEM", item: "key" },
        { type: "USE_ITEM", target: "box" },
      ]);
      expect(s.boxOpen).toBe(true);
      expect(s.journal.map((j) => j.id)).toEqual(["clue", "order"]);

      s = play(s, [{ type: "INSPECT", target: "machine" }, { type: "ENTER_CODE", code }]);
      expect(s.escaped).toBe(true);
    }
  });

  it("a wrong code keeps progress and allows unlimited retries", () => {
    const start = freshGame();
    const { clueHolder, keyHolder, code } = start.room.solution;
    const wrong = code === "000" ? "111" : "000";
    let s = play(start, [
      { type: "INSPECT", target: clueHolder },
      { type: "INSPECT", target: keyHolder },
      { type: "COLLECT_KEY" },
    ]);
    for (let i = 0; i < 5; i++) s = gameReducer(s, { type: "ENTER_CODE", code: wrong });
    expect(s.escaped).toBe(false);
    expect(s.wrongAttempts).toBe(5);
    expect(s.message?.tone).toBe("wrong");
    expect(s.inventory.map((it) => it.id)).toEqual(["key"]);
    expect(s.journal.map((j) => j.id)).toEqual(["clue"]);
    s = gameReducer(s, { type: "ENTER_CODE", code });
    expect(s.escaped).toBe(true);
  });

  it("using the key anywhere but the box changes nothing but the message", () => {
    const start = freshGame();
    const { keyHolder } = start.room.solution;
    let s = play(start, [{ type: "INSPECT", target: keyHolder }, { type: "COLLECT_KEY" }]);
    s = play(s, [{ type: "SELECT_ITEM", item: "key" }, { type: "USE_ITEM", target: "exit" }]);
    expect(s.boxOpen).toBe(false);
    expect(s.inventory.map((it) => it.id)).toEqual(["key"]);
    expect(s.message?.lines).toEqual([start.room.wrongItemLine]);
  });

  it("dropping the key on the box opens it, exactly like click-to-use", () => {
    const start = freshGame();
    const { keyHolder } = start.room.solution;
    let s = play(start, [{ type: "INSPECT", target: keyHolder }, { type: "COLLECT_KEY" }]);
    s = gameReducer(s, { type: "DROP_ITEM", item: "key", target: "box" });
    expect(s.boxOpen).toBe(true);
    expect(s.inventory).toEqual([]);
    expect(s.journal.map((j) => j.id)).toContain("order");
    expect(s.selectedItem).toBeNull();
  });

  it("dropping the key somewhere else gets the playful line and keeps the key", () => {
    const start = freshGame();
    const { keyHolder } = start.room.solution;
    let s = play(start, [{ type: "INSPECT", target: keyHolder }, { type: "COLLECT_KEY" }]);
    for (const target of ["exit", "machine", "a"] as const) {
      s = gameReducer(s, { type: "DROP_ITEM", item: "key", target });
      expect(s.boxOpen).toBe(false);
      expect(s.inventory.map((i) => i.id)).toEqual(["key"]);
      expect(s.message?.tone).toBe("wrong");
      expect(s.message?.lines).toEqual([start.room.wrongItemLine]);
    }
  });

  it("dropping an item you don't have does nothing", () => {
    const start = freshGame();
    expect(gameReducer(start, { type: "DROP_ITEM", item: "key", target: "box" })).toBe(start);
  });

  it("the locked box and door only describe themselves", () => {
    const s = play(freshGame(), [{ type: "INSPECT", target: "box" }, { type: "INSPECT", target: "exit" }]);
    expect(s.boxOpen).toBe(false);
    expect(s.escaped).toBe(false);
  });

  it("the key can't be taken before it's found", () => {
    const s = gameReducer(freshGame(), { type: "COLLECT_KEY" });
    expect(s.inventory).toEqual([]);
  });
});

describe("gameReducer — hints follow progress", () => {
  const hint = (s: GameState) => gameReducer(s, { type: "REQUEST_HINT" });

  it("walks levels 1 → 3 for the current step and stays at 3", () => {
    const start = freshGame();
    let s = hint(start);
    expect(s.message?.lines).toEqual([start.room.hints.findKey[0]]);
    s = hint(s);
    expect(s.message?.lines).toEqual([start.room.hints.findKey[1]]);
    s = hint(s);
    expect(s.message?.lines).toEqual([start.room.hints.findKey[2]]);
    s = hint(s);
    expect(s.message?.lines).toEqual([start.room.hints.findKey[2]]);
    expect(revealedHintLevel(s)).toBe(3);
  });

  it("starts over at level 1 when the player reaches the next step", () => {
    const start = freshGame();
    const { keyHolder } = start.room.solution;
    let s = play(start, [{ type: "REQUEST_HINT" }, { type: "REQUEST_HINT" }]);
    s = play(s, [{ type: "INSPECT", target: keyHolder }, { type: "COLLECT_KEY" }]);
    expect(currentHintStep(s)).toBe("openBox");
    expect(revealedHintLevel(s)).toBe(0);
    s = hint(s);
    expect(s.message?.lines).toEqual([start.room.hints.openBox[0]]);
    s = play(s, [{ type: "DROP_ITEM", item: "key", target: "box" }]);
    expect(currentHintStep(s)).toBe("solveCode");
    s = hint(s);
    expect(s.message?.lines).toEqual([start.room.hints.solveCode[0]]);
  });

  it("never reveals the code, even at the last level", () => {
    for (let i = 0; i < 30; i++) {
      const start = freshGame();
      const { keyHolder } = start.room.solution;
      let s = play(start, [
        { type: "INSPECT", target: keyHolder },
        { type: "COLLECT_KEY" },
        { type: "DROP_ITEM", item: "key", target: "box" },
      ]);
      for (let k = 0; k < 3; k++) s = hint(s);
      expect(s.message?.lines.join(" ")).not.toMatch(/[0-9]/);
      expect(s.message?.lines.join(" ")).toContain(start.room.objects[start.room.solution.order[0]].name);
    }
  });

  it("asking for a hint changes nothing about the puzzle", () => {
    const start = freshGame();
    const s = hint(hint(start));
    expect({ ...s, message: null, hintLevel: 0 }).toEqual({ ...start, message: null, hintLevel: 0 });
  });
});

