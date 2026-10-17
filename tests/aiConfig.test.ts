import { describe, expect, it } from "vitest";
import { DEFAULT_GEMINI_MODELS, generationConfig, MAX_GENERATION_CALLS } from "../lib/ai/config";
import { classifyError, RETRYABLE, summarizeFailures } from "../lib/ai/errors";

const err = (status: number | undefined, message = "", name = "Error") => Object.assign(new Error(message), { status, name });

describe("generationConfig", () => {
  it("defaults to the verified model list, primary first, and two calls", () => {
    const c = generationConfig({});
    expect(c.models).toEqual([...DEFAULT_GEMINI_MODELS]);
    expect(c.models[0]).toBe("gemini-3.8-flash");
    expect(c.models).not.toContain("gemini-2.5-flash-lite");
    expect(c.maxCalls).toBe(2);
    expect(MAX_GENERATION_CALLS).toBe(2);
  });

  it("accepts a model list override", () => {
    expect(generationConfig({ GEMINI_MODELS: " a , b ,," }).models).toEqual(["a", "b"]);
  });

  it("lets the call budget go down, never up", () => {
    expect(generationConfig({ GEMINI_MAX_CALLS: "1" }).maxCalls).toBe(1);
    expect(generationConfig({ GEMINI_MAX_CALLS: "5" }).maxCalls).toBe(2);
    expect(generationConfig({ GEMINI_MAX_CALLS: "nonsense" }).maxCalls).toBe(2);
    expect(generationConfig({ GEMINI_MAX_CALLS: "0" }).maxCalls).toBe(2);
  });
});

describe("classifyError", () => {
  it.each([
    [err(400, "API key not valid. Please pass a valid API key."), "config"],
    [err(400, "API_KEY_INVALID"), "config"],
    [err(401), "config"],
    [err(403, "PERMISSION_DENIED"), "config"],
    [new Error("GEMINI_API_KEY is not set"), "config"],
    [err(429, "Resource has been exhausted"), "rate_limited"],
    [err(undefined, "RESOURCE_EXHAUSTED: quota exceeded"), "rate_limited"],
    [err(500), "unavailable"],
    [err(503, "The model is overloaded"), "unavailable"],
    [err(undefined, "The operation was aborted due to timeout", "TimeoutError"), "unavailable"],
    [err(undefined, "fetch failed"), "unavailable"],
    [err(404, "models/x is not found"), "model_unavailable"],
    [err(400, "Invalid JSON schema for this model"), "model_unavailable"],
    [new SyntaxError("Empty response"), "invalid_output"],
  ])("%s → %s", (e, kind) => {
    expect(classifyError(e)).toBe(kind);
  });

  it("only configuration problems are non-retryable", () => {
    expect(Object.entries(RETRYABLE).filter(([, r]) => !r).map(([k]) => k)).toEqual(["config"]);
  });
});

describe("summarizeFailures", () => {
  it("prefers the most actionable reason", () => {
    expect(summarizeFailures(["invalid_output", "config"])).toBe("config");
    expect(summarizeFailures(["invalid_output", "rate_limited"])).toBe("rate_limited");
    expect(summarizeFailures(["invalid_output", "unavailable"])).toBe("unavailable");
    expect(summarizeFailures(["model_unavailable", "invalid_output"])).toBe("unavailable");
    expect(summarizeFailures(["invalid_output", "invalid_output"])).toBe("invalid_output");
  });
});
