// Runs the REAL Gemini SDK client against a fake `fetch`, counting actual HTTP requests.
// This is the proof that no hidden retry (in the SDK or anywhere else) exceeds two calls.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_GEMINI_MODELS, generationConfig } from "../lib/ai/config";
import { createGeminiWriter } from "../lib/ai/gemini";
import { generateRoom } from "../lib/ai/generateRoom";
import { FALLBACK_ROOM_TEXT } from "../lib/game/fallbackRoom";

const names: [string, string, string] = ["rubber duck", "toaster", "tiny moon"];

function goodRoomJson(): string {
  const { objects, ...rest } = structuredClone(FALLBACK_ROOM_TEXT);
  return JSON.stringify({
    ...rest,
    intro: "A rubber duck, a toaster, and a tiny moon share a room.",
    objects: Object.fromEntries(
      (["a", "b", "c"] as const).map((id) => [
        id,
        { emoji: "✨", description: objects[id].description, riddle: objects[id].riddle, signatureWord: objects[id].signatureWord },
      ]),
    ),
  });
}

const errorBody = (code: number, status: string, message: string) =>
  new Response(JSON.stringify({ error: { code, status, message } }), { status: code, headers: { "Content-Type": "application/json" } });

const okBody = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text }] }, finishReason: "STOP" }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

/** A fake fetch that records which model each real HTTP request targeted. */
function recordingFetch(respond: (callIndex: number) => Response) {
  const models: string[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    models.push(url.match(/models\/([^:?]+)/)?.[1] ?? "?");
    return respond(models.length - 1);
  });
  return { fetch: fn as unknown as typeof fetch, models };
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("real SDK client, counted at the HTTP layer", () => {
  const config = generationConfig({});

  it("429 on every request → exactly 2 HTTP requests (primary, then first fallback), no SDK retries", async () => {
    const f = recordingFetch(() => errorBody(429, "RESOURCE_EXHAUSTED", "Quota exceeded"));
    const result = await generateRoom(names, createGeminiWriter({ apiKey: "test-key", fetch: f.fetch }), config);
    expect(f.models).toEqual([DEFAULT_GEMINI_MODELS[0], DEFAULT_GEMINI_MODELS[1]]);
    expect(result.usedFallback && result.fallbackReason).toBe("rate_limited");
  });

  it("503 on every request → exactly 2 HTTP requests", async () => {
    const f = recordingFetch(() => errorBody(503, "UNAVAILABLE", "The model is overloaded."));
    const result = await generateRoom(names, createGeminiWriter({ apiKey: "test-key", fetch: f.fetch }), config);
    expect(f.models).toHaveLength(2);
    expect(result.usedFallback && result.fallbackReason).toBe("unavailable");
  });

  it("invalid key → exactly 1 HTTP request", async () => {
    const f = recordingFetch(() => errorBody(400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key."));
    const result = await generateRoom(names, createGeminiWriter({ apiKey: "bad-key", fetch: f.fetch }), config);
    expect(f.models).toHaveLength(1);
    expect(result.usedFallback && result.fallbackReason).toBe("config");
  });

  it("invalid room text, then a valid room → 2 requests and a generated room", async () => {
    const f = recordingFetch((i) => okBody(i === 0 ? JSON.stringify({ title: "broken" }) : goodRoomJson()));
    const result = await generateRoom(names, createGeminiWriter({ apiKey: "test-key", fetch: f.fetch }), config);
    expect(f.models).toEqual([DEFAULT_GEMINI_MODELS[0], DEFAULT_GEMINI_MODELS[1]]);
    expect(result.usedFallback).toBe(false);
  });

  it("a valid room on the first request → exactly 1 request", async () => {
    const f = recordingFetch(() => okBody(goodRoomJson()));
    const result = await generateRoom(names, createGeminiWriter({ apiKey: "test-key", fetch: f.fetch }), config);
    expect(f.models).toEqual([DEFAULT_GEMINI_MODELS[0]]);
    expect(result.usedFallback).toBe(false);
  });

  it("no key at all → zero HTTP requests", async () => {
    const f = recordingFetch(() => okBody(goodRoomJson()));
    const result = await generateRoom(names, createGeminiWriter({ apiKey: "", fetch: f.fetch }), config);
    expect(f.models).toHaveLength(0);
    expect(result.usedFallback && result.fallbackReason).toBe("config");
  });
});
