import { describe, expect, it } from "vitest";
import { newProgress, replay, step } from "../lib/engine/engine";
import { fromChainRoom } from "../lib/engine/fromChainRoom";
import {
  customRoom,
  findByCode,
  latestFor,
  listPlaythroughs,
  loadCurrent,
  loadPlaythrough,
  MAX_PLAYTHROUGHS,
  newSaveId,
  readSaves,
  SAVE_KEY,
  savePlaythrough,
  type CatalogueLookup,
  type Playthrough,
  type StorageLike,
} from "../lib/engine/saves";
import type { AdventureDef, Progress } from "../lib/engine/types";
import { buildFallbackRoom } from "../lib/game/fallbackRoom";

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

// A stand-in "catalogue" room and a custom room, both built on the engine.
const catalogueRoom: AdventureDef = { ...fromChainRoom(buildFallbackRoom(), { kind: "catalogue" }), id: "test-catalogue-room" };
const catalogue: CatalogueLookup = (id) => (id === catalogueRoom.id ? catalogueRoom : undefined);
const customDef = () => fromChainRoom(buildFallbackRoom(), { relics: ["a rubber duck", "a toaster", "a tiny moon"] });

let clock = 1000;
function playthrough(def: AdventureDef, progress: Progress = newProgress(def), saveId = newSaveId()): Playthrough {
  clock += 10;
  return { saveId, roomId: def.id, roomVersion: def.version, origin: def.kind, createdAt: 500, savedAt: clock, progress, stats: null };
}
const midway = (def: AdventureDef) => replay(def, [...def.solution.slice(0, 3), { type: "REQUEST_HINT" }]);

describe("save and restore (catalogue and custom rooms)", () => {
  it("restores a catalogue playthrough exactly, without storing the room itself", () => {
    const storage = memoryStorage();
    const play = playthrough(catalogueRoom, midway(catalogueRoom));
    savePlaythrough(storage, catalogue, play);
    expect(storage.getItem(SAVE_KEY)).not.toContain(catalogueRoom.intro); // definition not duplicated
    const loaded = loadCurrent(storage, catalogue)!;
    expect(loaded.play).toEqual(play);
    expect(loaded.def).toBe(catalogueRoom);
  });

  it("restores a custom room's definition and progress exactly, with no regeneration", () => {
    const storage = memoryStorage();
    const def = customDef();
    const play = playthrough(def, midway(def));
    savePlaythrough(storage, catalogue, play, def);
    const loaded = loadPlaythrough(storage, catalogue, play.saveId)!;
    expect(loaded.def).toEqual(def);
    expect(loaded.play.progress).toEqual(play.progress);
    // And it keeps playing to the same win.
    expect(replay(loaded.def, loaded.def.solution.slice(3), loaded.play.progress).escaped).toBe(true);
    expect(customRoom(storage, catalogue, def.id)).toEqual(def);
  });

  it("a custom playthrough can't be saved without its room", () => {
    const storage = memoryStorage();
    const def = customDef();
    expect(savePlaythrough(storage, catalogue, playthrough(def))).toBe(false);
  });

  it("each action's autosave updates one record under the same save ID", () => {
    const storage = memoryStorage();
    const saveId = newSaveId();
    let p = newProgress(catalogueRoom);
    for (const a of catalogueRoom.solution.slice(0, 4)) {
      p = step(catalogueRoom, p, a);
      savePlaythrough(storage, catalogue, playthrough(catalogueRoom, p, saveId));
    }
    expect(listPlaythroughs(storage, catalogue)).toHaveLength(1);
    expect(loadCurrent(storage, catalogue)!.play.progress.flags).toContain("boxOpen");
  });
});

describe("playthroughs and restarting", () => {
  it("playing a room again creates a separate playthrough; the earlier one is untouched", () => {
    const storage = memoryStorage();
    const first = playthrough(catalogueRoom, replay(catalogueRoom, catalogueRoom.solution));
    first.stats = { seconds: 80, wrongAttempts: 0, hintsUsed: 0, cluesFound: 2 };
    savePlaythrough(storage, catalogue, first);
    const second = playthrough(catalogueRoom);
    savePlaythrough(storage, catalogue, second);
    expect(listPlaythroughs(storage, catalogue)).toHaveLength(2);
    expect(loadPlaythrough(storage, catalogue, first.saveId)!.play.progress.escaped).toBe(true);
    expect(latestFor(storage, catalogue, catalogueRoom.id)!.saveId).toBe(second.saveId);
  });

  it("restarting one playthrough resets only that one", () => {
    const storage = memoryStorage();
    const a = playthrough(catalogueRoom, midway(catalogueRoom));
    const b = playthrough(catalogueRoom, midway(catalogueRoom));
    savePlaythrough(storage, catalogue, a);
    savePlaythrough(storage, catalogue, b);
    // Restart b: same save ID, fresh progress.
    savePlaythrough(storage, catalogue, { ...b, createdAt: clock, savedAt: ++clock, progress: newProgress(catalogueRoom), stats: null });
    expect(loadPlaythrough(storage, catalogue, b.saveId)!.play.progress.inventory).toEqual([]);
    expect(loadPlaythrough(storage, catalogue, a.saveId)!.play.progress).toEqual(a.progress);
  });

  it(`keeps at most ${MAX_PLAYTHROUGHS} playthroughs and forgets custom rooms nobody plays`, () => {
    const storage = memoryStorage();
    const def = customDef();
    savePlaythrough(storage, catalogue, playthrough(def), def);
    for (let i = 0; i < MAX_PLAYTHROUGHS; i++) savePlaythrough(storage, catalogue, playthrough(catalogueRoom));
    expect(listPlaythroughs(storage, catalogue)).toHaveLength(MAX_PLAYTHROUGHS);
    expect(customRoom(storage, catalogue, def.id)).toBeNull();
  });

  it("save IDs look like PD-XXXXXX and don't repeat", () => {
    const ids = new Set(Array.from({ length: 500 }, () => newSaveId()));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(id).toMatch(/^PD-[A-Z2-9]{6}$/);
  });
});

describe("codes", () => {
  it("a save ID opens that playthrough; a room ID opens the room's latest playthrough", () => {
    const storage = memoryStorage();
    const def = customDef();
    const older = playthrough(def, midway(def));
    const newer = playthrough(def);
    savePlaythrough(storage, catalogue, older, def);
    savePlaythrough(storage, catalogue, newer, def);
    expect(findByCode(storage, catalogue, older.saveId.toLowerCase())!.play.saveId).toBe(older.saveId);
    expect(findByCode(storage, catalogue, ` ${def.id.toLowerCase()} `)!.play.saveId).toBe(newer.saveId);
    expect(findByCode(storage, catalogue, "PD-NOPE00")).toBeNull();
  });
});

describe("completed playthroughs", () => {
  it("the ending and stats survive a refresh", () => {
    const storage = memoryStorage();
    const done = playthrough(catalogueRoom, replay(catalogueRoom, catalogueRoom.solution));
    done.stats = { seconds: 61, wrongAttempts: 2, hintsUsed: 1, cluesFound: 2 };
    savePlaythrough(storage, catalogue, done);
    const loaded = loadCurrent(storage, catalogue)!;
    expect(loaded.play.progress.escaped).toBe(true);
    expect(loaded.play.stats).toEqual(done.stats);
  });
});

describe("missing, corrupted, and outdated saves", () => {
  it("nothing saved, or no storage at all, is simply empty", () => {
    expect(loadCurrent(memoryStorage(), catalogue)).toBeNull();
    expect(loadCurrent(null, catalogue)).toBeNull();
  });

  it("unreadable JSON is cleared", () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, "{nope");
    expect(readSaves(storage, catalogue).problem).toBe("corrupt");
    expect(storage.data.has(SAVE_KEY)).toBe(false);
  });

  it("a version 1 save (before the engine) is recognised as outdated and cleared", () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, current: "X", rooms: {} }));
    expect(readSaves(storage, catalogue).problem).toBe("outdated");
    expect(loadCurrent(storage, catalogue)).toBeNull();
    expect(storage.data.has(SAVE_KEY)).toBe(false);
  });

  it("a catalogue room that changed version drops its old progress", () => {
    const storage = memoryStorage();
    savePlaythrough(storage, catalogue, playthrough(catalogueRoom, midway(catalogueRoom)));
    const bumped: CatalogueLookup = (id) => (id === catalogueRoom.id ? { ...catalogueRoom, version: 2 } : undefined);
    expect(loadCurrent(storage, bumped)).toBeNull();
  });

  it("progress that doesn't fit its room (tampered item) is dropped; other playthroughs survive", () => {
    const storage = memoryStorage();
    const good = playthrough(catalogueRoom, midway(catalogueRoom));
    const bad = playthrough(catalogueRoom, midway(catalogueRoom));
    savePlaythrough(storage, catalogue, good);
    savePlaythrough(storage, catalogue, bad);
    const file = JSON.parse(storage.getItem(SAVE_KEY)!);
    file.plays[bad.saveId].progress.inventory = ["golden-crown"];
    storage.setItem(SAVE_KEY, JSON.stringify(file));
    expect(readSaves(storage, catalogue).problem).toBe("corrupt");
    expect(loadPlaythrough(storage, catalogue, bad.saveId)).toBeNull();
    expect(loadPlaythrough(storage, catalogue, good.saveId)!.play).toEqual(good);
  });

  it("a stored custom room that fails the schema is dropped with its playthroughs", () => {
    const storage = memoryStorage();
    const def = customDef();
    const play = playthrough(def);
    savePlaythrough(storage, catalogue, play, def);
    const file = JSON.parse(storage.getItem(SAVE_KEY)!);
    file.rooms[def.id].hotspots = "not a list";
    storage.setItem(SAVE_KEY, JSON.stringify(file));
    expect(loadPlaythrough(storage, catalogue, play.saveId)).toBeNull();
  });

  it("storage that throws never breaks the game", () => {
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
    expect(loadCurrent(hostile, catalogue)).toBeNull();
    expect(savePlaythrough(hostile, catalogue, playthrough(catalogueRoom))).toBe(false);
  });

  it("saves contain no API keys or server secrets", () => {
    const storage = memoryStorage();
    const def = customDef();
    savePlaythrough(storage, catalogue, playthrough(def, midway(def)), def);
    expect(storage.getItem(SAVE_KEY)).not.toMatch(/GEMINI|AIza|api[_-]?key/i);
  });
});
