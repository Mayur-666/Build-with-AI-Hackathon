import { z } from "zod";
import { newProgress, replay } from "./engine";
import { solve } from "./solve";
import type { AdventureDef, Cond, Effect, Rule } from "./types";

const str = z.string().min(1);
const cond = z
  .object({ flags: z.array(str), notFlags: z.array(str), items: z.array(str), notItems: z.array(str) })
  .partial()
  .strict();
const tone = z.enum(["normal", "wrong", "discovery", "intro", "hint", "locked", "success", "unlock"]);
const effect = z.union([
  z.object({ offer: str }).strict(),
  z.object({ give: str }).strict(),
  z.object({ take: str }).strict(),
  z.object({ set: str }).strict(),
  z.object({ clue: str }).strict(),
  z.object({ escape: z.literal(true) }).strict(),
]);
const rule = z.object({ when: cond.optional(), title: str.optional(), say: z.array(str).min(1), tone: tone.optional(), do: z.array(effect).optional() }).strict();
const action = z.union([
  z.object({ type: z.literal("INSPECT"), target: str }),
  z.object({ type: z.literal("TAKE"), item: str }),
  z.object({ type: z.literal("SELECT_ITEM"), item: str.nullable() }),
  z.object({ type: z.literal("USE_ITEM"), target: str }),
  z.object({ type: z.literal("DROP_ITEM"), item: str, target: str }),
  z.object({ type: z.literal("SET_DIAL"), lock: str, dial: z.number().int().min(0), index: z.number().int().min(0) }),
  z.object({ type: z.literal("TURN_DIAL"), lock: str, dial: z.number().int().min(0), delta: z.number().int() }),
  z.object({ type: z.literal("SUBMIT_LOCK"), lock: str }),
  z.object({ type: z.literal("CLOSE_LOCK") }),
  z.object({ type: z.literal("REQUEST_HINT") }),
]);
const pct = z.number().min(0).max(100);

export const adventureSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9-]{3,40}$/),
    version: z.number().int().min(1),
    kind: z.enum(["catalogue", "custom"]),
    title: str,
    theme: str,
    description: str,
    difficulty: z.enum(["gentle", "tricky", "devious"]),
    backdrop: z.enum(["study", "library", "workshop", "greenhouse"]),
    intro: str,
    items: z.record(str, z.object({ name: str, emoji: str }).strict()),
    clues: z.record(str, str),
    hotspots: z
      .array(
        z
          .object({
            id: str,
            name: str,
            art: z.enum(["door", "box", "machine", "emoji"]),
            emoji: str.optional(),
            spot: z.tuple([pct, pct, pct, pct]),
            plinth: z.enum(["shelf", "pedestal", "table", "floor", "wall"]).optional(),
            tag: z.enum(["always", "hover"]).optional(),
            looks: z.array(z.object({ when: cond, emoji: str.optional(), state: z.enum(["open", "active", "lit", "unlocked"]) }).strict()).optional(),
            inspect: z.array(rule).min(1),
            use: z.array(z.object({ item: str, rules: z.array(rule).min(1) }).strict()).optional(),
            lock: z
              .object({
                id: str,
                title: str,
                prompt: str,
                dials: z.array(z.array(str).min(2)).min(1).max(5),
                answer: z.array(str).min(1),
                when: cond.optional(),
                knowledge: z.array(str).optional(),
                solved: rule,
                wrong: z.array(str).min(1),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .min(2)
      .max(10),
    hints: z.array(z.object({ id: str, when: cond.optional(), levels: z.tuple([str, str, str]) }).strict()).min(1),
    wrongItemLine: str,
    escapeText: str,
    solution: z.array(action).min(1),
    relics: z.tuple([str, str, str]).optional(),
  })
  .strict();

export type RoomCheck = { ok: true; def: AdventureDef } | { ok: false; reasons: string[] };

/** Every effect and condition in the room, for reference checks. */
function walk(def: AdventureDef) {
  const rules: Rule[] = [];
  const conds: Cond[] = [];
  for (const h of def.hotspots) {
    rules.push(...h.inspect, ...(h.use ?? []).flatMap((u) => u.rules));
    if (h.lock) {
      rules.push(h.lock.solved);
      if (h.lock.when) conds.push(h.lock.when);
    }
    for (const l of h.looks ?? []) conds.push(l.when);
  }
  for (const r of rules) if (r.when) conds.push(r.when);
  for (const hint of def.hints) if (hint.when) conds.push(hint.when);
  const effects: Effect[] = rules.flatMap((r) => r.do ?? []);
  return { rules, conds, effects };
}

/**
 * Schema + references + game rules: every item/clue/hotspot referenced exists, lock answers are
 * real dial options, at least one rule escapes, the stored solution wins, and the solver
 * independently finds a way out. Used for catalogue JSON and Gemini rooms alike.
 */
export function validateAdventure(input: unknown): RoomCheck {
  const parsed = adventureSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reasons: parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  const def = parsed.data as AdventureDef;
  const reasons: string[] = [];
  const ids = def.hotspots.map((h) => h.id);
  if (new Set(ids).size !== ids.length) reasons.push("hotspot ids must be unique");
  const lockIds = def.hotspots.flatMap((h) => (h.lock ? [h.lock.id] : []));
  if (new Set(lockIds).size !== lockIds.length) reasons.push("lock ids must be unique");

  for (const h of def.hotspots) {
    if (h.art === "emoji" && !h.emoji) reasons.push(`${h.id}: emoji art needs an emoji`);
    for (const u of h.use ?? []) if (!def.items[u.item]) reasons.push(`${h.id}: uses unknown item ${u.item}`);
    if (h.lock) {
      const { dials, answer } = h.lock;
      if (answer.length !== dials.length) reasons.push(`${h.lock.id}: answer length must match dial count`);
      answer.forEach((a, i) => dials[i] && !dials[i].includes(a) && reasons.push(`${h.lock!.id}: answer "${a}" isn't on dial ${i + 1}`));
      for (const c of h.lock.knowledge ?? []) if (def.clues[c] === undefined) reasons.push(`${h.lock.id}: knowledge needs unknown clue ${c}`);
    }
  }

  const { effects, conds } = walk(def);
  for (const e of effects) {
    if ("offer" in e && !def.items[e.offer]) reasons.push(`offers unknown item ${e.offer}`);
    if ("give" in e && !def.items[e.give]) reasons.push(`gives unknown item ${e.give}`);
    if ("take" in e && !def.items[e.take]) reasons.push(`takes unknown item ${e.take}`);
    if ("clue" in e && def.clues[e.clue] === undefined) reasons.push(`reveals unknown clue ${e.clue}`);
  }
  for (const c of conds) for (const i of [...(c.items ?? []), ...(c.notItems ?? [])]) if (!def.items[i]) reasons.push(`condition on unknown item ${i}`);
  if (!effects.some((e) => "escape" in e)) reasons.push("no rule lets the player escape");

  if (reasons.length) return { ok: false, reasons };

  if (!replay(def, def.solution, newProgress(def)).escaped) reasons.push("the stored solution doesn't escape");
  if (!solve(def)) reasons.push("the solver found no way out (or the answers can't be learned from the clues)");
  // No shortcuts: every lock must be required to escape.
  for (const lockId of def.hotspots.flatMap((h) => (h.lock ? [h.lock.id] : []))) {
    if (solve(def, { skipLocks: [lockId] })) reasons.push(`the room can be escaped without solving ${lockId}`);
  }
  return reasons.length ? { ok: false, reasons } : { ok: true, def };
}
