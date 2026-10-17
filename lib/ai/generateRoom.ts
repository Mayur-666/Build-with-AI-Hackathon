import { buildFallbackRoom } from "../game/fallbackRoom";
import { fillRoom } from "../game/fill";
import { createSolution } from "../game/solution";
import type { Room } from "../game/types";
import { validateRoomText } from "../game/validate";
import { MAX_GENERATION_CALLS, type GenerationConfig } from "./config";
import { classifyError, RETRYABLE, summarizeFailures, type FailureKind, type FallbackReason } from "./errors";
import type { RoomWriter } from "./gemini";
import { buildPrompt } from "./prompt";
import { GeminiRoomSchema, toRoomText } from "./schema";

/** One line of server-side diagnostics per API call. Never contains the key or the prompt. */
export type AttemptLog = { call: number; model: string; ms: number; outcome: "ok" | FailureKind; detail?: string };

export type GenerateResult =
  | { room: Room; usedFallback: false; attempts: AttemptLog[] }
  | { room: Room; usedFallback: true; fallbackReason: FallbackReason; attempts: AttemptLog[] };

/** Strip anything that could leak a key from an error message before logging it. */
function safeDetail(err: unknown): string {
  return String((err as Error)?.message ?? err)
    .replace(/key=[^&\s"]+/gi, "key=[redacted]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]")
    .slice(0, 160);
}

/**
 * The whole pipeline: the engine picks the solution, Gemini writes around it, three layers of
 * checking run, the engine fills in the facts. Model fallback: call N uses models[N] (the last
 * model repeats if the list is shorter than the budget). At most `maxCalls` API calls — never
 * more than MAX_GENERATION_CALLS — however long the model list is. Never throws.
 */
export async function generateRoom(
  names: [string, string, string],
  write: RoomWriter,
  { models, maxCalls }: GenerationConfig,
): Promise<GenerateResult> {
  const solution = createSolution();
  const prompt = buildPrompt(names, solution);
  const budget = Math.min(maxCalls, MAX_GENERATION_CALLS);
  const attempts: AttemptLog[] = [];

  for (let call = 1; call <= budget && models.length > 0; call++) {
    const model = models[Math.min(call - 1, models.length - 1)];
    const started = Date.now();
    const log = (outcome: AttemptLog["outcome"], detail?: string) =>
      attempts.push({ call, model, ms: Date.now() - started, outcome, ...(detail ? { detail } : {}) });

    let raw: string;
    try {
      raw = await write(prompt, model); // exactly one API call
    } catch (err) {
      const kind = classifyError(err);
      log(kind, safeDetail(err));
      if (!RETRYABLE[kind]) break; // e.g. a bad key: no model will succeed
      continue;
    }

    // Layers 1–3: JSON, schema, game rules. A failure here moves on to the next model.
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      log("invalid_output", "unparseable JSON");
      continue;
    }
    const parsed = GeminiRoomSchema.safeParse(json);
    if (!parsed.success) {
      log("invalid_output", `schema: ${parsed.error.issues.slice(0, 3).map((i) => i.path.join(".")).join(", ")}`);
      continue;
    }
    const text = toRoomText(parsed.data, names);
    const check = validateRoomText(text, names);
    if (!check.ok) {
      log("invalid_output", `rules: ${check.reasons.slice(0, 3).join("; ")}`);
      continue;
    }
    log("ok");
    return { room: fillRoom(text, solution), usedFallback: false, attempts };
  }

  // No models configured at all is a configuration problem, not bad output.
  const reason = attempts.length
    ? summarizeFailures(attempts.map((a) => a.outcome).filter((o): o is FailureKind => o !== "ok"))
    : "config";
  return { room: buildFallbackRoom(), usedFallback: true, fallbackReason: reason, attempts };
}
