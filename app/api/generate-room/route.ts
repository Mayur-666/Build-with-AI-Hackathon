import { generateRoomText } from "@/lib/ai/gemini";
import { generateRoom } from "@/lib/ai/generateRoom";
import { cleanObjectName } from "@/lib/ai/prompt";
import { buildFallbackRoom } from "@/lib/game/fallbackRoom";

// Two Gemini attempts at up to 25s each, plus overhead.
export const maxDuration = 60;

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

  // Dev-only switch so the fallback path can be tried on purpose.
  if (body.forceFallback === true && process.env.NODE_ENV !== "production") {
    return Response.json({ room: buildFallbackRoom(), usedFallback: true });
  }

  const result = await generateRoom(names as [string, string, string], generateRoomText);
  return Response.json(result);
}
