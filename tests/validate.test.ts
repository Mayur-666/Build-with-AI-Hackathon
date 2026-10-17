import { describe, expect, it } from "vitest";
import { FALLBACK_ROOM_TEXT } from "../lib/game/fallbackRoom";
import type { RoomText } from "../lib/game/types";
import { validateRoomText } from "../lib/game/validate";

const good = (): RoomText => structuredClone(FALLBACK_ROOM_TEXT);
const names = ["brass lantern", "sleepy teapot", "moth-nibbled map"];

function reasonsFor(room: RoomText, playerObjects?: string[]): string[] {
  const r = validateRoomText(room, playerObjects);
  return r.ok ? [] : r.reasons;
}

describe("validateRoomText", () => {
  it("accepts a well-formed room", () => {
    expect(validateRoomText(good(), names)).toEqual({ ok: true });
  });

  it("rejects a description missing its {digit}", () => {
    const room = good();
    room.objects.b.description = "A teapot with no number at all.";
    expect(reasonsFor(room)).toContain("objects.b.description must contain {digit} exactly once");
  });

  it("rejects a description with two {digit}s", () => {
    const room = good();
    room.objects.a.description += " Also {digit}.";
    expect(reasonsFor(room)).toContain("objects.a.description must contain {digit} exactly once");
  });

  it("rejects {digit} outside object descriptions", () => {
    const room = good();
    room.hints.solveCode[2] = "The code starts with {digit}.";
    expect(reasonsFor(room)).toContain("hints.solveCode[2] must not contain {digit}");
  });

  it("rejects an order clue with misordered placeholders", () => {
    const room = good();
    room.box.orderClue = "Read the {second}, then the {first}, then the {third}.";
    expect(reasonsFor(room)).toContain("box.orderClue must list {first}, {second}, {third} in that order");
  });

  it("rejects an order clue missing a placeholder", () => {
    const room = good();
    room.box.orderClue = "Read the {first}, then the {second}.";
    expect(reasonsFor(room)).toContain("box.orderClue must contain {first}, {second}, {third} exactly once each");
  });

  it("rejects a clue that doesn't point at the key-holder", () => {
    const room = good();
    room.clueText = "The key is somewhere around here.";
    expect(reasonsFor(room)).toContain("clueText must contain {keyHolder}");
  });

  it("rejects stray numerals that could be mistaken for code digits", () => {
    const room = good();
    room.machine.description = "A machine with 3 dials.";
    expect(reasonsFor(room)).toContain("machine.description contains a numeral");
  });

  it("rejects unknown placeholders", () => {
    const room = good();
    room.escapeText = "Well done, {playerName}!";
    expect(reasonsFor(room)).toContain("escapeText has unknown placeholder {playerName}");
  });

  it("rejects empty text", () => {
    const room = good();
    room.keyFoundText = "  ";
    expect(reasonsFor(room)).toContain("keyFoundText is empty");
  });

  it("rejects an intro that leaves out a player object", () => {
    expect(reasonsFor(good(), [...names.slice(0, 2), "rubber duck"])).toContain('intro does not mention "rubber duck"');
  });
});
