import { describe, expect, it } from "vitest";
import { activeHint, dialActions, lockOf, newProgress, replay, revealedHintLevel, step } from "../lib/engine/engine";
import { fromChainRoom } from "../lib/engine/fromChainRoom";
import { solve } from "../lib/engine/solve";
import type { Action, AdventureDef, Progress } from "../lib/engine/types";
import { validateAdventure } from "../lib/engine/validate";
import { buildFallbackRoom } from "../lib/game/fallbackRoom";

const play = (def: AdventureDef, actions: Action[], from?: Progress) => replay(def, actions, from ?? newProgress(def));
const chainRoom = () => fromChainRoom(buildFallbackRoom());

describe("chain rooms (Gemini and classic) on the engine", () => {
  it("compile to a valid, solvable definition, many times over", () => {
    for (let i = 0; i < 25; i++) {
      const check = validateAdventure(chainRoom());
      expect(check.ok ? "ok" : check.reasons).toBe("ok");
    }
  });

  it("the stored solution wins: key → box → machine → door", () => {
    const def = chainRoom();
    expect(play(def, def.solution).escaped).toBe(true);
  });

  it("solving the machine unlocks the door but does NOT escape by itself", () => {
    const def = chainRoom();
    const lock = lockOf(def, "machine")!;
    let p = play(def, [{ type: "INSPECT", target: "machine" }, ...dialActions(lock, lock.answer), { type: "SUBMIT_LOCK", lock: "machine" }]);
    expect(p.flags).toContain("doorUnlocked");
    expect(p.escaped).toBe(false);
    expect(p.message?.tone).toBe("unlock");
    p = step(def, p, { type: "INSPECT", target: "exit" });
    expect(p.escaped).toBe(true);
    expect(p.message?.tone).toBe("success");
  });

  it("the door stays locked (and says so) until the machine is solved", () => {
    const def = chainRoom();
    const p = play(def, [{ type: "INSPECT", target: "exit" }]);
    expect(p.escaped).toBe(false);
    expect(p.message?.tone).toBe("locked");
  });

  it("a wrong code keeps progress and allows unlimited retries", () => {
    const def = chainRoom();
    const lock = lockOf(def, "machine")!;
    const wrong = lock.answer.join("") === "000" ? ["1", "1", "1"] : ["0", "0", "0"];
    const s = def.solution;
    let p = play(def, s.slice(0, 4)); // clue, key, take, box
    for (let i = 0; i < 5; i++) p = play(def, [{ type: "INSPECT", target: "machine" }, ...dialActions(lock, wrong), { type: "SUBMIT_LOCK", lock: "machine" }], p);
    expect(p.wrongAttempts).toBe(5);
    expect(p.message?.tone).toBe("wrong");
    expect(p.flags).toContain("boxOpen");
    expect(p.journal).toEqual(["clue", "order"]);
    p = play(def, [...dialActions(lock, lock.answer), { type: "SUBMIT_LOCK", lock: "machine" }, { type: "INSPECT", target: "exit" }], p);
    expect(p.escaped).toBe(true);
  });

  it("dropping the key on the box opens it; elsewhere gets the playful line and keeps the key", () => {
    const def = chainRoom();
    let p = play(def, def.solution.slice(0, 3)); // ... take key
    for (const target of ["exit", "machine", "a"]) {
      p = step(def, p, { type: "DROP_ITEM", item: "key", target });
      expect(p.inventory).toEqual(["key"]);
      expect(p.message?.lines).toEqual([def.wrongItemLine]);
    }
    p = step(def, p, { type: "DROP_ITEM", item: "key", target: "box" });
    expect(p.flags).toContain("boxOpen");
    expect(p.inventory).toEqual([]);
  });

  it("click-to-use works the same as dragging", () => {
    const def = chainRoom();
    let p = play(def, def.solution.slice(0, 3));
    p = play(def, [{ type: "SELECT_ITEM", item: "key" }, { type: "USE_ITEM", target: "box" }], p);
    expect(p.flags).toContain("boxOpen");
  });

  it("the key can't be taken before it's offered, and isn't offered twice", () => {
    const def = chainRoom();
    expect(step(def, newProgress(def), { type: "TAKE", item: "key" }).inventory).toEqual([]);
    const keyHolder = def.solution[1] as { target: string };
    let p = play(def, [{ type: "INSPECT", target: keyHolder.target }, { type: "TAKE", item: "key" }]);
    p = step(def, p, { type: "INSPECT", target: keyHolder.target });
    expect(p.offered).toEqual([]);
  });
});

describe("hints follow progress, on any room", () => {
  it("walk 1 → 3, stay at 3, reset per step, and never reveal the code", () => {
    const def = chainRoom();
    let p = newProgress(def);
    for (let i = 0; i < 4; i++) p = step(def, p, { type: "REQUEST_HINT" });
    expect(revealedHintLevel(def, p)).toBe(3);
    expect(p.hintsUsed).toBe(4);
    p = play(def, def.solution.slice(0, 4), p); // through the box
    expect(activeHint(def, p)?.id).toBe("solveCode");
    expect(revealedHintLevel(def, p)).toBe(0);
    for (let i = 0; i < 3; i++) p = step(def, p, { type: "REQUEST_HINT" });
    expect(p.message?.lines.join(" ")).not.toMatch(/[0-9]/);
  });
});

describe("solver", () => {
  it("finds a way out of a solvable room and reports null for an impossible one", () => {
    const def = chainRoom();
    expect(solve(def)).not.toBeNull();
    const broken: AdventureDef = structuredClone(def);
    broken.hotspots = broken.hotspots.map((h) => (h.id === "box" ? { ...h, use: [] } : h)); // the key opens nothing
    expect(solve(broken)).toBeNull();
    const check = validateAdventure(broken);
    expect(check.ok).toBe(false);
  });
});
