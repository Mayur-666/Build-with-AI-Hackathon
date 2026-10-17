import { z } from "zod";
import type { RoomText } from "../game/types";

const objectText = z.object({
  emoji: z.string().describe("One emoji that best depicts this object."),
  description: z
    .string()
    .describe("Two or three whimsical sentences. Must contain the placeholder {digit} exactly once, shown as a visible number on or in the object."),
});

const threeHints = z.array(z.string()).min(3).max(3);

/**
 * What Gemini must return. Object names are NOT included — the player's own
 * names are facts the engine supplies, so the AI can't rename them.
 */
export const GeminiRoomSchema = z.object({
  title: z.string().describe("A short storybook title for the room."),
  theme: z.string().describe("One sentence capturing the room's strange situation."),
  intro: z.string().describe("Three or four sentences explaining why these three objects are here together and that the player must escape. Names all three objects exactly."),
  objects: z.object({ a: objectText, b: objectText, c: objectText }),
  clueText: z.string().describe("The clue found inside the clue-holder. Must contain {keyHolder}."),
  keyItem: z.object({
    name: z.string().describe("A small key or tool that opens the locked box, inspired by the objects."),
    emoji: z.string(),
  }),
  keyFoundText: z.string().describe("What the player sees when they find the key item inside the key-holder."),
  machine: z.object({
    description: z.string().describe("The strange machine by the exit: a combination lock with three dials."),
    wrongCodeLines: z.array(z.string()).min(3).max(3).describe("Three playful lines the machine says for a wrong code."),
  }),
  box: z.object({
    lockedText: z.string(),
    openText: z.string().describe("What happens as the key item opens the box."),
    orderClue: z.string().describe("The note inside the box. Must contain {first}, {second}, {third} in that order, telling the player to read the objects' numbers in that order."),
  }),
  exit: z.object({ lockedText: z.string() }),
  wrongItemLine: z.string().describe("A short in-world line when an item is used on the wrong thing."),
  hints: z.object({
    findKey: threeHints,
    openBox: threeHints,
    solveCode: threeHints,
  }),
  escapeText: z.string().describe("Two sentences of triumphant escape."),
});

export type GeminiRoom = z.infer<typeof GeminiRoomSchema>;

/** JSON Schema sent to Gemini's structured output. */
export function geminiRoomJsonSchema(): Record<string, unknown> {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(GeminiRoomSchema) as Record<string, unknown>;
  return schema;
}

const PICTOGRAPH = /\p{Extended_Pictographic}/u;

/** Repair a bad emoji instead of failing the whole room. */
export function safeEmoji(emoji: string): string {
  const e = emoji.trim();
  return e.length > 0 && e.length <= 12 && PICTOGRAPH.test(e) && !/[A-Za-z0-9]/.test(e) ? e : "✨";
}

/** Merge Gemini's text with the player's own object names. */
export function toRoomText(g: GeminiRoom, names: [string, string, string]): RoomText {
  const obj = (o: GeminiRoom["objects"]["a"], name: string) => ({ name, emoji: safeEmoji(o.emoji), description: o.description });
  return {
    ...g,
    objects: { a: obj(g.objects.a, names[0]), b: obj(g.objects.b, names[1]), c: obj(g.objects.c, names[2]) },
    keyItem: { name: g.keyItem.name, emoji: safeEmoji(g.keyItem.emoji) },
    hints: {
      findKey: g.hints.findKey as RoomText["hints"]["findKey"],
      openBox: g.hints.openBox as RoomText["hints"]["openBox"],
      solveCode: g.hints.solveCode as RoomText["hints"]["solveCode"],
    },
  };
}
