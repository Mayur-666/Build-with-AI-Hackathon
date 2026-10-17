import { describe, expect, it } from "vitest";
import { buildFallbackRoom, FALLBACK_ROOM_TEXT } from "../lib/game/fallbackRoom";
import { validateRoomText } from "../lib/game/validate";

describe("fallback room", () => {
  it("passes the same validator Gemini's rooms must pass", () => {
    expect(validateRoomText(FALLBACK_ROOM_TEXT)).toEqual({ ok: true });
  });

  it("names its own three objects in the intro", () => {
    const names = Object.values(FALLBACK_ROOM_TEXT.objects).map((o) => o.name);
    expect(validateRoomText(FALLBACK_ROOM_TEXT, names)).toEqual({ ok: true });
  });

  it("builds a fresh, filled room each time", () => {
    const room = buildFallbackRoom();
    expect(room.solution.code).toMatch(/^[0-9]{3}$/);
    expect(JSON.stringify(room)).not.toMatch(/\{(digit|keyHolder|clueHolder|first|second|third)\}/);
  });
});
