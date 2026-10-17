import "server-only";
import { generationConfig } from "@/lib/ai/config";
import { createGeminiWriter } from "@/lib/ai/gemini";
import { generateRoom } from "@/lib/ai/generateRoom";
import { cleanObjectName } from "@/lib/ai/prompt";
import { buildFallbackRoom } from "@/lib/game/fallbackRoom";

// Two Gemini calls at up to 25s each, plus overhead.
export const maxDuration = 60;

const writeRoom = createGeminiWriter();

export async function POST(request: Request) {
  let body: { objects?: unknown; forceFallback?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const raw = Array.isArray(body.objects) ? body.objects : [];
  const names = raw.map((o) => (typeof o === "string" ? cleanObjectName(o) : ""));
  if (names.length !== 3 || names.some((n) => !n)) {
    return Response.json({ error: "Please name three objects." }, { status: 400 });
  }

  // Dev-only switch so the fallback path can be tried on purpose: true, or a reason to simulate.
  const forced = body.forceFallback;
  if (forced && process.env.NODE_ENV !== "production") {
    const reason = ["rate_limited", "unavailable", "invalid_output", "config"].includes(String(forced)) ? forced : "invalid_output";
    return Response.json({ room: buildFallbackRoom(), usedFallback: true, fallbackReason: reason });
  }

  const config = generationConfig();
  const result = await generateRoom(names as [string, string, string], writeRoom, config);

  // Server-side diagnostics only: models, timings, outcomes. No key, no prompt, no player text.
  console.info(
    `[generate-room] ${result.usedFallback ? `fallback (${result.fallbackReason})` : "ok"} ` +
      result.attempts.map((a) => `#${a.call} ${a.model} ${a.outcome} ${a.ms}ms${a.detail ? ` (${a.detail})` : ""}`).join(" | "),
  );

  const { attempts: _diagnostics, ...forPlayer } = result;
  return Response.json(forPlayer);
}
