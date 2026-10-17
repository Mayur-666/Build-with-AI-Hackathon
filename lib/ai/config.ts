/**
 * Room-generation settings. Edit the list to change which models are tried, in order.
 * Verified against the Gemini API with this project's key (see devpost/checklist.md › Revisions):
 * all four respond to structured-output calls. `gemini-2.5-flash-lite` is excluded — it returns
 * 404 "no longer available to new users".
 */
export const DEFAULT_GEMINI_MODELS = [
  "gemini-3.8-flash", // primary
  "gemini-3.1-flash-lite", // first fallback
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
] as const;

/**
 * Hard ceiling on Gemini API calls per room request, across ALL models. A longer model list
 * never raises it; the env override can only lower it.
 */
export const MAX_GENERATION_CALLS = 2;

/** Per-call timeout. Two calls must fit inside the route's maxDuration (60s). */
export const CALL_TIMEOUT_MS = 25_000;

export type GenerationConfig = { models: string[]; maxCalls: number };

/** Reads optional overrides: GEMINI_MODELS="a,b,c", GEMINI_MAX_CALLS=1. */
export function generationConfig(env: Record<string, string | undefined> = process.env): GenerationConfig {
  const fromEnv = env.GEMINI_MODELS?.split(",").map((m) => m.trim()).filter(Boolean);
  const models = fromEnv?.length ? fromEnv : [...DEFAULT_GEMINI_MODELS];
  const requested = Number(env.GEMINI_MAX_CALLS);
  const maxCalls = Number.isInteger(requested) && requested >= 1 ? Math.min(requested, MAX_GENERATION_CALLS) : MAX_GENERATION_CALLS;
  return { models, maxCalls };
}
