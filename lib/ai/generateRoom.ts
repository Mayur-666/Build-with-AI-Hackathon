import { buildFallbackRoom } from "../game/fallbackRoom";
import { fillRoom } from "../game/fill";
import { createSolution } from "../game/solution";
import type { Room } from "../game/types";
import { validateRoomText } from "../game/validate";
import { buildPrompt } from "./prompt";
import { GeminiRoomSchema, toRoomText } from "./schema";

export type GenerateResult = { room: Room; usedFallback: boolean };
type Writer = (prompt: string) => Promise<string>;

const MAX_ATTEMPTS = 2;

/**
 * The whole pipeline: the engine picks the solution, Gemini writes around it,
 * three layers of checking run, the engine fills in the facts.
 * Any failure after the retry → the classic room. Never throws.
 */
export async function generateRoom(names: [string, string, string], write: Writer): Promise<GenerateResult> {
  const solution = createSolution();
  const prompt = buildPrompt(names, solution);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const started = Date.now();
    try {
      const raw = await write(prompt); // layer 1: structured output
      const parsed = GeminiRoomSchema.safeParse(JSON.parse(raw)); // layer 2: shape
      if (!parsed.success) {
        console.warn(`[generate-room] attempt ${attempt}: schema mismatch`, parsed.error.issues.slice(0, 5));
        continue;
      }
      const text = toRoomText(parsed.data, names);
      const check = validateRoomText(text, names); // layer 3: rules
      console.info(`[generate-room] attempt ${attempt}: ${Date.now() - started}ms, valid=${check.ok}`);
      if (!check.ok) {
        console.warn(`[generate-room] attempt ${attempt}: rejected`, check.reasons);
        continue;
      }
      return { room: fillRoom(text, solution), usedFallback: false };
    } catch (err) {
      console.warn(`[generate-room] attempt ${attempt} failed after ${Date.now() - started}ms:`, (err as Error).message);
      // Network/quota/auth errors won't fix themselves on an immediate retry.
      if (!(err instanceof SyntaxError)) break;
    }
  }
  return { room: buildFallbackRoom(), usedFallback: true };
}
