/**
 * Why a generation attempt failed, and whether trying the next model could help.
 * Pure — no SDK import — so it's easy to test.
 */
export type FailureKind =
  | "rate_limited" // 429 — this model's quota is exhausted; another model has its own quota
  | "unavailable" // 5xx, timeout, network — temporary trouble
  | "model_unavailable" // 404 / unsupported model — the next model may work
  | "invalid_output" // bad JSON, wrong shape, or failed game-rule validation
  | "config"; // bad/missing API key or permission — no model will work, stop now

export const RETRYABLE: Record<FailureKind, boolean> = {
  rate_limited: true,
  unavailable: true,
  model_unavailable: true,
  invalid_output: true,
  config: false,
};

/** Classify a thrown error from the Gemini client. */
export function classifyError(err: unknown): FailureKind {
  const e = err as { status?: number; name?: string; message?: string } | null;
  const status = typeof e?.status === "number" ? e.status : undefined;
  const msg = String(e?.message ?? "");

  if (/GEMINI_API_KEY is not set|API key not valid|API_KEY_INVALID|PERMISSION_DENIED|API key expired/i.test(msg)) return "config";
  if (status === 401 || status === 403) return "config";
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(msg)) return "rate_limited";
  if (status === 404) return "model_unavailable";
  if (status === 400) {
    // A 400 that isn't about the key usually means this model rejected the request shape.
    return "model_unavailable";
  }
  if (status !== undefined && status >= 500) return "unavailable";
  if (e?.name === "AbortError" || e?.name === "TimeoutError" || /abort|timed? ?out|fetch failed|network|ECONN|ENOTFOUND/i.test(msg)) {
    return "unavailable";
  }
  if (err instanceof SyntaxError) return "invalid_output";
  return "unavailable";
}

/** The single reason reported to the player when every attempt failed. */
export type FallbackReason = "rate_limited" | "unavailable" | "invalid_output" | "config";

/**
 * Pick the most useful reason to show: a key problem beats a rate limit beats temporary
 * trouble beats bad output.
 */
export function summarizeFailures(kinds: FailureKind[]): FallbackReason {
  if (kinds.includes("config")) return "config";
  if (kinds.includes("rate_limited")) return "rate_limited";
  if (kinds.includes("unavailable") || kinds.includes("model_unavailable")) return "unavailable";
  return "invalid_output";
}
