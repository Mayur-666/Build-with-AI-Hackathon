import { describe, expect, it } from "vitest";
import { buildFallbackRoom } from "../lib/game/fallbackRoom";
import { gameReducer, initialGameState } from "../lib/game/reducer";
import {
  listSaved,
  loadByCode,
  loadCurrent,
  MAX_SAVED_ROOMS,
  readSaves,
  SAVE_KEY,
  SAVE_VERSION,
  saveAdventure,
  toAdventure,
  type SavedAdventure,
  type StorageLike,
} from "../lib/game/save";
import type { GameAction, GameState } from "../lib/game/types";

/** An in-memory stand-in for localStorage. */
function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const play = (s: GameState, actions: GameAction[]) => actions.reduce(gameReducer, s);

function adventureFrom(game: GameState, extra: Partial<SavedAdventure> = {}, now = 1000): SavedAdventure {
  return toAdventure(
    { createdAt: 500, objects: ["a rubber duck", "a toaster", "a tiny moon"], inClassicRoom: false, game, dials: [0, 0, 0], stats: null, ...extra },
    now,
  );
}

/** A game partway through: clue read, key taken, box still shut. */
function midGame(): GameState {
  const start = initialGameState(buildFallbackRoom());
  const { clueHolder, keyHolder } = start.room.solution;
  return play(start, [
    { type: "INSPECT", target: clueHolder },
    { type: "INSPECT", target: keyHolder },
    { type: "COLLECT_KEY" },
    { type: "REQUEST_HINT" },
    { type: "ENTER_CODE", code: start.room.solution.code === "000" ? "111" : "000" },
  ]);
}

describe("save and restore", () => {
  it("restores the exact room and progress after a 'refresh'", () => {
    const storage = memoryStorage();
    const game = midGame();
    saveAdventure(storage, adventureFrom(game, { dials: [4, 2, 7] }));

    // A refresh: everything in memory is gone; only storage remains.
    const restored = loadCurrent(storage)!;
    expect(restored.game).toEqual(game);
    expect(restored.dials).toEqual([4, 2, 7]);
    expect(restored.objects).toEqual(["a rubber duck", "a toaster", "a tiny moon"]);
  });

  it("never regenerates puzzle facts: the restored solution is the saved one", () => {
    const storage = memoryStorage();
    const game = midGame();
    saveAdventure(storage, adventureFrom(game));
    const restored = loadCurrent(storage)!;
    expect(restored.game.room.solution).toEqual(game.room.solution);
    expect(restored.game.room.box.orderClue).toBe(game.room.box.orderClue);
  });

  it("a restored game keeps playing to the same win", () => {
    const storage = memoryStorage();
    saveAdventure(storage, adventureFrom(midGame()));
    let s = loadCurrent(storage)!.game;
    s = play(s, [{ type: "DROP_ITEM", item: "key", target: "box" }]);
    expect(s.boxOpen).toBe(true);
    s = gameReducer(s, { type: "ENTER_CODE", code: s.room.solution.code });
    expect(s.escaped).toBe(true);
  });

  it("autosaving repeatedly updates one record under the same room code", () => {
    const storage = memoryStorage();
    let game = initialGameState(buildFallbackRoom());
    const code = game.room.roomCode;
    for (const action of [{ type: "INSPECT", target: "a" }, { type: "INSPECT", target: "box" }, { type: "REQUEST_HINT" }] as GameAction[]) {
      game = gameReducer(game, action);
      saveAdventure(storage, adventureFrom(game));
    }
    expect(listSaved(storage)).toHaveLength(1);
    expect(loadCurrent(storage)!.roomCode).toBe(code);
    expect(loadCurrent(storage)!.game.hintsUsed).toBe(1);
  });
});

describe("room codes", () => {
  it("the room code identifies the save and is stable", () => {
    const storage = memoryStorage();
    const game = midGame();
    saveAdventure(storage, adventureFrom(game));
    const code = game.room.roomCode;
    expect(loadByCode(storage, code)!.game).toEqual(game);
    expect(loadByCode(storage, `  ${code.toLowerCase()} `)!.roomCode).toBe(code);
    expect(loadByCode(storage, "NOPE-0000")).toBeNull();
  });

  it("several rooms can be kept and resumed by code; the newest is current", () => {
    const storage = memoryStorage();
    const first = midGame();
    const second = initialGameState(buildFallbackRoom());
    saveAdventure(storage, adventureFrom(first, {}, 1000));
    saveAdventure(storage, adventureFrom(second, {}, 2000));
    expect(loadCurrent(storage)!.roomCode).toBe(second.room.roomCode);
    expect(loadByCode(storage, first.room.roomCode)!.game).toEqual(first);
    // Resuming the older room makes it current again.
    saveAdventure(storage, { ...loadByCode(storage, first.room.roomCode)!, savedAt: 3000 });
    expect(loadCurrent(storage)!.roomCode).toBe(first.room.roomCode);
  });

  it(`keeps at most ${MAX_SAVED_ROOMS} rooms, dropping the oldest`, () => {
    const storage = memoryStorage();
    const codes: string[] = [];
    for (let i = 0; i < MAX_SAVED_ROOMS + 3; i++) {
      const g = initialGameState(buildFallbackRoom());
      codes.push(g.room.roomCode);
      saveAdventure(storage, adventureFrom(g, {}, 1000 + i));
    }
    const kept = listSaved(storage).map((r) => r.roomCode);
    expect(kept).toHaveLength(MAX_SAVED_ROOMS);
    expect(kept[0]).toBe(codes.at(-1));
    expect(kept).not.toContain(codes[0]);
  });
});

describe("completed adventures", () => {
  it("an escape and its stats survive a refresh", () => {
    const storage = memoryStorage();
    let game = midGame();
    game = gameReducer(game, { type: "ENTER_CODE", code: game.room.solution.code });
    const stats = { seconds: 93, wrongAttempts: 1, hintsUsed: 1, cluesFound: 1 };
    saveAdventure(storage, adventureFrom(game, { stats }));
    const restored = loadCurrent(storage)!;
    expect(restored.game.escaped).toBe(true);
    expect(restored.stats).toEqual(stats);
  });
});

describe("missing, corrupted, and outdated saves", () => {
  it("no save at all is simply empty", () => {
    expect(loadCurrent(memoryStorage())).toBeNull();
    expect(readSaves(memoryStorage()).problem).toBe("missing");
    expect(loadCurrent(null)).toBeNull();
  });

  it("unreadable JSON is discarded, not crashed on", () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, "{definitely not json");
    expect(readSaves(storage).problem).toBe("corrupt");
    expect(loadCurrent(storage)).toBeNull();
    expect(storage.data.has(SAVE_KEY)).toBe(false);
  });

  it("an older save format is discarded", () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION - 1, current: null, rooms: {} }));
    expect(readSaves(storage).problem).toBe("outdated");
    expect(storage.data.has(SAVE_KEY)).toBe(false);
  });

  it("one broken room is dropped; the others survive", () => {
    const storage = memoryStorage();
    const good = midGame();
    saveAdventure(storage, adventureFrom(good));
    const file = JSON.parse(storage.getItem(SAVE_KEY)!);
    file.rooms["BROKEN-0000"] = { roomCode: "BROKEN-0000", game: { nonsense: true } };
    storage.setItem(SAVE_KEY, JSON.stringify(file));

    const { problem, file: read } = readSaves(storage);
    expect(problem).toBe("corrupt");
    expect(Object.keys(read.rooms)).toEqual([good.room.roomCode]);
    expect(loadCurrent(storage)!.game).toEqual(good);
  });

  it("a tampered solution (code no longer matches the digits) is rejected", () => {
    const storage = memoryStorage();
    const game = midGame();
    saveAdventure(storage, adventureFrom(game));
    const file = JSON.parse(storage.getItem(SAVE_KEY)!);
    const sol = file.rooms[game.room.roomCode].game.room.solution;
    sol.code = sol.code === "999" ? "998" : "999";
    storage.setItem(SAVE_KEY, JSON.stringify(file));
    expect(loadCurrent(storage)).toBeNull();
  });

  it("storage that throws (blocked or full) never breaks the game", () => {
    const hostile: StorageLike = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(loadCurrent(hostile)).toBeNull();
    expect(saveAdventure(hostile, adventureFrom(midGame()))).toBe(false);
  });

  it("saves contain no API keys or server secrets", () => {
    const storage = memoryStorage();
    saveAdventure(storage, adventureFrom(midGame()));
    expect(storage.getItem(SAVE_KEY)).not.toMatch(/GEMINI|AIza|api[_-]?key/i);
  });
});
