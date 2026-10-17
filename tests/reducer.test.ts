import { describe, expect, it } from "vitest";
import { FALLBACK_ROOM_TEXT } from "../lib/game/fallbackRoom";
import { fillRoom } from "../lib/game/fill";
import { gameReducer, initialGameState } from "../lib/game/reducer";
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
