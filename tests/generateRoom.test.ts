import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateRoom } from "../lib/ai/generateRoom";
import { cleanObjectName } from "../lib/ai/prompt";
import { geminiRoomJsonSchema, safeEmoji, type GeminiRoom } from "../lib/ai/schema";
import { FALLBACK_ROOM_TEXT } from "../lib/game/fallbackRoom";

const names: [string, string, string] = ["rubber duck", "toaster", "tiny moon"];
const MODELS = ["primary", "second", "third", "fourth"];
const config = { models: MODELS, maxCalls: 2 };

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
const good = () => JSON.stringify(fakeGeminiRoom());
const invalid = () => {
  const bad = fakeGeminiRoom();
  bad.box.orderClue = "No order here.";
  return JSON.stringify(bad);
};
const apiError = (status: number, message = `HTTP ${status}`) => Object.assign(new Error(message), { status });

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("generateRoom — success", () => {
  it("uses the primary model's valid room, with the player's names and engine-filled digits", async () => {
    const write = vi.fn().mockResolvedValue(good());
    const result = await generateRoom(names, write, config);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(expect.any(String), "primary");
    expect(result.usedFallback).toBe(false);
    expect(result.room.objects.a.name).toBe("rubber duck");
    expect(result.room.objects.b.description).toContain(String(result.room.solution.digits.b));
    expect(result.room.box.orderClue).not.toContain("rubber duck");
  });
});

describe("generateRoom — model fallback within a two-call budget", () => {
  it("invalid output from the primary → the next model, whose valid room is used", async () => {
    const write = vi.fn().mockResolvedValueOnce(invalid()).mockResolvedValueOnce(good());
    const result = await generateRoom(names, write, config);
    expect(write.mock.calls.map((c) => c[1])).toEqual(["primary", "second"]);
    expect(result.usedFallback).toBe(false);
    expect(result.attempts.map((a) => a.outcome)).toEqual(["invalid_output", "ok"]);
  });

  it("the second model's output goes through the same validation", async () => {
    const write = vi.fn().mockResolvedValue(invalid());
    const result = await generateRoom(names, write, config);
    expect(write).toHaveBeenCalledTimes(2);
    expect(result.usedFallback).toBe(true);
    if (result.usedFallback) expect(result.fallbackReason).toBe("invalid_output");
    expect(result.room.title).toBe(FALLBACK_ROOM_TEXT.title);
  });

  it("unparseable JSON and wrong-shaped JSON both move to the next model", async () => {
    const write = vi.fn().mockResolvedValueOnce("{not json").mockResolvedValueOnce(JSON.stringify({ title: "only" }));
    const result = await generateRoom(names, write, config);
    expect(write.mock.calls.map((c) => c[1])).toEqual(["primary", "second"]);
    expect(result.usedFallback).toBe(true);
  });

  it("a rate limit on the primary → the next model (separate quota)", async () => {
    const write = vi.fn().mockRejectedValueOnce(apiError(429, "RESOURCE_EXHAUSTED")).mockResolvedValueOnce(good());
    const result = await generateRoom(names, write, config);
    expect(write.mock.calls.map((c) => c[1])).toEqual(["primary", "second"]);
    expect(result.usedFallback).toBe(false);
  });

  it("rate limits on both calls → classic room, reason rate_limited", async () => {
    const write = vi.fn().mockRejectedValue(apiError(429));
    const result = await generateRoom(names, write, config);
    expect(write).toHaveBeenCalledTimes(2);
    expect(result.usedFallback && result.fallbackReason).toBe("rate_limited");
  });

  it("temporary server errors and timeouts move to the next model", async () => {
    const timeout = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
    const write = vi.fn().mockRejectedValueOnce(apiError(503)).mockRejectedValueOnce(timeout);
    const result = await generateRoom(names, write, config);
    expect(write).toHaveBeenCalledTimes(2);
    expect(result.usedFallback && result.fallbackReason).toBe("unavailable");
  });

  it("a model that no longer exists (404) moves to the next model", async () => {
    const write = vi.fn().mockRejectedValueOnce(apiError(404, "no longer available")).mockResolvedValueOnce(good());
    expect((await generateRoom(names, write, config)).usedFallback).toBe(false);
  });
});

describe("generateRoom — non-retryable errors stop immediately", () => {
  it.each([
    ["an invalid key", apiError(400, "API key not valid. Please pass a valid API key.")],
    ["a forbidden key", apiError(403, "PERMISSION_DENIED")],
    ["a missing key", new Error("GEMINI_API_KEY is not set")],
  ])("%s → one call, classic room, reason config", async (_label, err) => {
    const write = vi.fn().mockRejectedValue(err);
    const result = await generateRoom(names, write, config);
    expect(write).toHaveBeenCalledTimes(1);
    expect(result.usedFallback && result.fallbackReason).toBe("config");
  });
});

describe("generateRoom — the two-call ceiling is absolute", () => {
  it("never exceeds two calls, however many models are listed", async () => {
    const write = vi.fn().mockRejectedValue(apiError(503));
    await generateRoom(names, write, { models: Array.from({ length: 20 }, (_, i) => `m${i}`), maxCalls: 2 });
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("never exceeds two calls even if asked for more", async () => {
    const write = vi.fn().mockResolvedValue(invalid());
    await generateRoom(names, write, { models: MODELS, maxCalls: 10 });
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("with a single-model list, the second call reuses that model", async () => {
    const write = vi.fn().mockRejectedValueOnce(apiError(500)).mockResolvedValueOnce(good());
    await generateRoom(names, write, { models: ["only"], maxCalls: 2 });
    expect(write.mock.calls.map((c) => c[1])).toEqual(["only", "only"]);
  });

  it("can be lowered to one call", async () => {
    const write = vi.fn().mockResolvedValue(invalid());
    await generateRoom(names, write, { models: MODELS, maxCalls: 1 });
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("an empty model list makes no calls and reports a configuration problem", async () => {
    const write = vi.fn();
    const result = await generateRoom(names, write, { models: [], maxCalls: 2 });
    expect(write).not.toHaveBeenCalled();
    expect(result.usedFallback && result.fallbackReason).toBe("config");
  });

  it("diagnostics never contain the API key", async () => {
    const write = vi.fn().mockRejectedValue(apiError(400, "API key not valid: key=AIzaSyFAKEFAKEFAKEFAKEFAKEFAKE123"));
    const result = await generateRoom(names, write, config);
    expect(JSON.stringify(result.attempts)).not.toContain("AIzaSyFAKE");
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
