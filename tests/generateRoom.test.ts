import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateRoom } from "../lib/ai/generateRoom";
import { cleanObjectName } from "../lib/ai/prompt";
import { geminiRoomJsonSchema, safeEmoji, type GeminiRoom } from "../lib/ai/schema";
import { FALLBACK_ROOM_TEXT } from "../lib/game/fallbackRoom";

const names: [string, string, string] = ["rubber duck", "toaster", "tiny moon"];

/** A response shaped like Gemini's, written around the player's objects. */
function fakeGeminiRoom(): GeminiRoom {
  const { objects, ...rest } = structuredClone(FALLBACK_ROOM_TEXT);
  return {
    ...rest,
    intro: "A rubber duck, a toaster, and a tiny moon have been locked in together.",
    objects: {
      a: { emoji: "🦆", description: objects.a.description, riddle: objects.a.riddle, signatureWord: objects.a.signatureWord },
      b: { emoji: "🍞", description: objects.b.description, riddle: objects.b.riddle, signatureWord: objects.b.signatureWord },
      c: { emoji: "🌙", description: objects.c.description, riddle: objects.c.riddle, signatureWord: objects.c.signatureWord },
    },
  };
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("generateRoom pipeline", () => {
  it("uses a valid AI room, with the player's names and engine-filled digits", async () => {
    const result = await generateRoom(names, async () => JSON.stringify(fakeGeminiRoom()));
    expect(result.usedFallback).toBe(false);
    expect(result.room.objects.a.name).toBe("rubber duck");
    const { digits } = result.room.solution;
    expect(result.room.objects.b.description).toContain(String(digits.b));
    expect(result.room.box.orderClue).toContain(result.room.objects[result.room.solution.order[0]].riddle.replace(/^the /, ""));
    expect(result.room.box.orderClue).not.toContain("rubber duck");
  });

  it("retries once after an invalid room, then succeeds", async () => {
    const bad = fakeGeminiRoom();
    bad.box.orderClue = "No order here.";
    const write = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(bad))
      .mockResolvedValueOnce(JSON.stringify(fakeGeminiRoom()));
    const result = await generateRoom(names, write);
    expect(write).toHaveBeenCalledTimes(2);
    expect(result.usedFallback).toBe(false);
  });

  it("falls back after two invalid rooms", async () => {
    const bad = fakeGeminiRoom();
    bad.objects.a.description = "No number.";
    const write = vi.fn().mockResolvedValue(JSON.stringify(bad));
    const result = await generateRoom(names, write);
    expect(write).toHaveBeenCalledTimes(2);
    expect(result.usedFallback).toBe(true);
    expect(result.room.title).toBe(FALLBACK_ROOM_TEXT.title);
  });

  it("falls back on a wrong-shaped response", async () => {
    const result = await generateRoom(names, async () => JSON.stringify({ title: "Only a title" }));
    expect(result.usedFallback).toBe(true);
  });

  it("falls back immediately on an API error (no pointless retry)", async () => {
    const write = vi.fn().mockRejectedValue(new Error("429 quota exceeded"));
    const result = await generateRoom(names, write);
    expect(write).toHaveBeenCalledTimes(1);
    expect(result.usedFallback).toBe(true);
  });

  it("retries after unparseable JSON", async () => {
    const write = vi.fn().mockResolvedValueOnce("{not json").mockResolvedValueOnce(JSON.stringify(fakeGeminiRoom()));
    const result = await generateRoom(names, write);
    expect(result.usedFallback).toBe(false);
  });
});

describe("input and schema helpers", () => {
  it("cleans object names", () => {
    expect(cleanObjectName("  A   rubber duck ")).toBe("rubber duck");
    expect(cleanObjectName("the {first} moon")).toBe("first moon");
    expect(cleanObjectName("x".repeat(80))).toHaveLength(40);
  });

  it("repairs bad emoji", () => {
    expect(safeEmoji("🦆")).toBe("🦆");
    expect(safeEmoji("duck")).toBe("✨");
    expect(safeEmoji("")).toBe("✨");
  });

  it("produces a JSON schema without $schema", () => {
    const schema = geminiRoomJsonSchema();
    expect(schema.$schema).toBeUndefined();
    expect(schema.type).toBe("object");
  });
});
