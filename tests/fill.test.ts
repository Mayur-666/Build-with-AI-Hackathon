import { describe, expect, it } from "vitest";
import { FALLBACK_ROOM_TEXT } from "../lib/game/fallbackRoom";
import { fillRoom, makeRoomCode, nounPhrase } from "../lib/game/fill";
import type { Solution } from "../lib/game/types";

const solution: Solution = {
  clueHolder: "b",
  keyHolder: "c",
  order: ["c", "a", "b"],
  digits: { a: 4, b: 7, c: 1 },
  code: "147",
};

describe("fillRoom", () => {
  const room = fillRoom(FALLBACK_ROOM_TEXT, solution, () => 0);

  it("puts each object's digit into its own description", () => {
    expect(room.objects.a.description).toContain("4");
    expect(room.objects.b.description).toContain("7");
    expect(room.objects.c.description).toContain("1");
  });

  it("names the objects in the solution's reading order", () => {
    const clue = room.box.orderClue;
    const [first, second, third] = solution.order.map((id) => clue.indexOf(room.objects[id].name));
    expect(first).toBeGreaterThan(-1);
    expect(first).toBeLessThan(second);
    expect(second).toBeLessThan(third);
  });

  it("points the clue at the key-holder", () => {
    expect(room.clueText).toContain(room.objects.c.name);
  });

  it("leaves no placeholders behind", () => {
    expect(JSON.stringify(room)).not.toMatch(/\{(digit|keyHolder|clueHolder|first|second|third)\}/);
  });

  it("attaches the solution and a room code", () => {
    expect(room.solution.code).toBe("147");
    expect(room.roomCode).toMatch(/^[A-Z]{1,6}-[A-Z2-9]{4}$/);
  });
});

describe("nounPhrase", () => {
  it("adds 'the' when the AI left it out", () => {
    expect(nounPhrase("toaster", "First observe ")).toBe("the toaster");
  });
  it("keeps an article the AI already wrote", () => {
    expect(nounPhrase("toaster", "inside the ")).toBe("toaster");
    expect(nounPhrase("toaster", "look at your ")).toBe("toaster");
  });
  it("leaves possessive names alone", () => {
    expect(nounPhrase("grandma's dentures", "then ")).toBe("grandma's dentures");
  });
  it("capitalizes at the start of a sentence", () => {
    expect(nounPhrase("tiny moon", "")).toBe("The tiny moon");
    expect(nounPhrase("tiny moon", "It hums. ")).toBe("The tiny moon");
    expect(nounPhrase("tiny moon", 'It reads: "')).toBe("The tiny moon");
  });
});

describe("makeRoomCode", () => {
  it("uses the first object's letters, or ROOM when there are none", () => {
    expect(makeRoomCode("rubber duck", () => 0)).toBe("RUBBER-AAAA");
    expect(makeRoomCode("42", () => 0)).toBe("ROOM-AAAA");
  });
});
