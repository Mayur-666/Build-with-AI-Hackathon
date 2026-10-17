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

  it("rejects a riddle missing its signature word", () => {
    const room = good();
    room.objects.a.riddle = "the one that glows";
    expect(reasonsFor(room)).toContain('objects.a.riddle must contain its signature word "flickers"');
  });

  it("rejects a description missing its signature word", () => {
    const room = good();
    room.objects.b.description = "A round teapot, quiet as a mouse, stamped with {digit}.";
    expect(reasonsFor(room)).toContain('objects.b.description must contain its signature word "snores"');
  });

  it("rejects a signature word shared with another object", () => {
    const room = good();
    room.objects.c.description += " Even the map snores a little.";
    expect(reasonsFor(room)).toContain('signature word "snores" of object b also appears in object c');
  });

  it("rejects a multi-word signature", () => {
    const room = good();
    room.objects.a.signatureWord = "flickers brightly";
    expect(reasonsFor(room)).toContain("objects.a.signatureWord must be a single word");
  });

  it("rejects a riddle that gives away the object's name", () => {
    const room = good();
    room.objects.b.riddle = "the teapot that snores";
    expect(reasonsFor(room)).toContain('objects.b.riddle gives away its name ("teapot")');
  });

  it("rejects clues that name objects directly", () => {
    const room = good();
    room.clueText = "The key is inside {keyHolder}, next to the teapot.";
    room.box.orderClue = "Read {first}, then {second}, then {third}, starting at the lantern.";
    const reasons = reasonsFor(room);
    expect(reasons).toContain('clueText names "sleepy teapot"');
    expect(reasons).toContain('box.orderClue names "brass lantern"');
  });

  it("rejects early hints that name objects or use name placeholders", () => {
    const room = good();
    room.hints.findKey[0] = "Look at the lantern.";
    room.hints.solveCode[1] = "Start with the {first}.";
    const reasons = reasonsFor(room);
    expect(reasons).toContain('hints.findKey[0] names "brass lantern"');
    expect(reasons).toContain("hints.solveCode[1] must not use name placeholders");
  });

  it("requires the last hints to name the answer's objects", () => {
    const room = good();
    room.hints.findKey[2] = "Think harder about the note.";
    room.hints.solveCode[2] = "Read the {first} and the {second}.";
    const reasons = reasonsFor(room);
    expect(reasons).toContain("hints.findKey[2] must contain {keyHolder}");
    expect(reasons).toContain("hints.solveCode[2] must contain {first}, {second}, {third}");
  });

  it("rejects an intro that leaves out a player object", () => {
    expect(reasonsFor(good(), [...names.slice(0, 2), "rubber duck"])).toContain('intro does not mention "rubber duck"');
  });
});
