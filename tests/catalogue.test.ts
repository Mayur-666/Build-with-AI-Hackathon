import { describe, expect, it } from "vitest";
import { CATALOGUE, catalogueRoom, RAW_CATALOGUE } from "../lib/catalogue";
import { lockOf, newProgress, replay, step } from "../lib/engine/engine";
import { reachable, solve } from "../lib/engine/solve";
import type { AdventureDef } from "../lib/engine/types";
import { validateAdventure } from "../lib/engine/validate";

const ids = ["midnight-library", "clockmakers-last-hour", "sleeping-greenhouse"];

describe("catalogue loading and validation", () => {
  it("ships three rooms, all of which pass the full validator", () => {
    expect(RAW_CATALOGUE).toHaveLength(3);
    for (const raw of RAW_CATALOGUE) {
      const check = validateAdventure(raw);
      expect(check.ok ? "ok" : check.reasons).toBe("ok");
    }
    expect(CATALOGUE.map((r) => r.id)).toEqual(ids);
  });

  it("rooms are found by their stable IDs", () => {
    for (const id of ids) expect(catalogueRoom(id)?.id).toBe(id);
    expect(catalogueRoom("not-a-room")).toBeUndefined();
  });

  it("each room has a title, description, and a different difficulty", () => {
    for (const r of CATALOGUE) {
      expect(r.title.length).toBeGreaterThan(5);
      expect(r.description.length).toBeGreaterThan(20);
    }
    expect(new Set(CATALOGUE.map((r) => r.difficulty)).size).toBe(3);
  });

  it("a broken definition is rejected, not offered", () => {
    const broken = structuredClone(RAW_CATALOGUE[0]) as AdventureDef;
    const cabinet = broken.hotspots.find((h) => h.lock)!;
    cabinet.lock!.answer = ["Q", "Q"];
    expect(validateAdventure(broken).ok).toBe(false);
  });
});

describe.each(CATALOGUE.map((r) => [r.id, r] as const))("%s", (_id, room) => {
  it("its stored solution escapes", () => {
    expect(replay(room, room.solution).escaped).toBe(true);
  });

  it("the solver finds a way out independently", () => {
    expect(solve(room)).not.toBeNull();
  });

  it("the door doesn't open until its final requirement is met", () => {
    const p = step(room, newProgress(room), { type: "INSPECT", target: "door" });
    expect(p.escaped).toBe(false);
    expect(p.message?.tone).toBe("locked");
  });

  it("no lock can be bypassed", () => {
    for (const h of room.hotspots) if (h.lock) expect(solve(room, { skipLocks: [h.lock.id] })).toBeNull();
  });

  it("every lock's answer is backed by clues the player can find", () => {
    for (const h of room.hotspots) {
      if (!h.lock) continue;
      expect(h.lock.knowledge?.length).toBeGreaterThan(0);
      for (const c of h.lock.knowledge!) expect(room.clues[c]).toBeTruthy();
    }
  });

  it("has no dead ends: from every reachable state there is still a way out", () => {
    const states = reachable(room);
    expect(states.length).toBeGreaterThan(5);
    for (const p of states) expect(solve(room, { from: p })).not.toBeNull();
  });

  it("invalid item use never changes progress", () => {
    let p = newProgress(room);
    for (const action of room.solution) {
      for (const item of p.inventory) {
        for (const h of room.hotspots) {
          const after = step(room, p, { type: "DROP_ITEM", item, target: h.id });
          if (after.message?.lines[0] === room.wrongItemLine) {
            expect(after.flags).toEqual(p.flags);
            expect(after.inventory).toEqual(p.inventory);
          }
        }
      }
      p = step(room, p, action);
    }
    expect(p.escaped).toBe(true);
  });
});

describe("the three rooms are genuinely different puzzles", () => {
  const library = catalogueRoom("midnight-library")!;
  const clock = catalogueRoom("clockmakers-last-hour")!;
  const green = catalogueRoom("sleeping-greenhouse")!;

  it("each uses a different kind of lock", () => {
    expect(lockOf(library, "cabinet")!.dials[0]).toContain("Z"); // letters
    expect(lockOf(clock, "clock")!.dials.map((d) => d.length)).toEqual([12, 4]); // a time
    expect(lockOf(green, "guardian")!.dials[0]).toContain("☾"); // symbols
  });

  it("the library needs light: its clues can't be read in the dark", () => {
    let p = replay(library, [
      { type: "INSPECT", target: "bookshelf" },
      { type: "INSPECT", target: "desk" },
    ]);
    expect(p.journal).toEqual([]);
    p = replay(library, library.solution.slice(0, 5));
    expect([...p.journal].sort()).toEqual(["ink", "spines"]);
  });

  it("the clock can't be set until the gear train runs, and the gears go in either order", () => {
    expect(replay(clock, [{ type: "INSPECT", target: "grandfather" }]).openLock).toBeNull();
    const take = clock.solution.slice(0, 4);
    const ab = replay(clock, [
      ...take,
      { type: "DROP_ITEM", item: "smallGear", target: "geartrain" },
      { type: "DROP_ITEM", item: "greatGear", target: "geartrain" },
    ]);
    const ba = replay(clock, [
      ...take,
      { type: "DROP_ITEM", item: "greatGear", target: "geartrain" },
      { type: "DROP_ITEM", item: "smallGear", target: "geartrain" },
    ]);
    expect(ab.flags).toContain("running");
    expect(ba.flags).toContain("running");
  });

  it("the greenhouse transforms items: the empty can becomes moonwater at the barrel", () => {
    expect(replay(green, green.solution.slice(0, 3)).inventory).toEqual(["moonwater"]);
  });

  it("their win sequences differ from each other and from the classic key-box-machine chain", () => {
    const shapes = CATALOGUE.map((r) => r.solution.map((a) => a.type).join(","));
    expect(new Set(shapes).size).toBe(3);
    for (const r of CATALOGUE) expect(r.hotspots.some((h) => h.art === "box")).toBe(false);
  });
});
