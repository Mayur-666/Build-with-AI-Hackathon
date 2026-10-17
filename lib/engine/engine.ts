import type { Action, AdventureDef, Cond, Effect, HintDef, HotspotDef, LockDef, Message, Progress, Rule } from "./types";

/** Flag set automatically when a lock is solved. */
export const solvedFlag = (lockId: string) => `solved:${lockId}`;
/** Flag set automatically when an item is taken (so offers don't repeat). */
export const tookFlag = (itemId: string) => `took:${itemId}`;

export function newProgress(def: AdventureDef): Progress {
  const dials: Record<string, number[]> = {};
  for (const h of def.hotspots) if (h.lock) dials[h.lock.id] = h.lock.dials.map(() => 0);
  return {
    flags: [],
    inventory: [],
    offered: [],
    taken: [],
    journal: [],
    inspected: [],
    selectedItem: null,
    openLock: null,
    dials,
    wrongAttempts: 0,
    hintsUsed: 0,
    hint: { id: null, level: 0 },
    message: { title: def.title, lines: [def.intro], tone: "intro" },
    escaped: false,
  };
}

export function holds(cond: Cond | undefined, p: Progress): boolean {
  if (!cond) return true;
  return (
    (cond.flags ?? []).every((f) => p.flags.includes(f)) &&
    (cond.notFlags ?? []).every((f) => !p.flags.includes(f)) &&
    (cond.items ?? []).every((i) => p.inventory.includes(i)) &&
    (cond.notItems ?? []).every((i) => !p.inventory.includes(i))
  );
}

const firstRule = (rules: Rule[] | undefined, p: Progress) => rules?.find((r) => holds(r.when, p));
const add = (list: string[], v: string) => (list.includes(v) ? list : [...list, v]);
const hotspot = (def: AdventureDef, id: string) => def.hotspots.find((h) => h.id === id);
export const lockOf = (def: AdventureDef, lockId: string): LockDef | undefined =>
  def.hotspots.find((h) => h.lock?.id === lockId)?.lock;

function applyEffects(def: AdventureDef, p: Progress, effects: Effect[] = []): Progress {
  let next = p;
  for (const e of effects) {
    if ("offer" in e) {
      if (!next.taken.includes(e.offer) && !next.inventory.includes(e.offer)) next = { ...next, offered: add(next.offered, e.offer) };
    } else if ("give" in e) {
      next = { ...next, inventory: add(next.inventory, e.give), taken: add(next.taken, e.give), flags: add(next.flags, tookFlag(e.give)) };
    } else if ("take" in e) {
      next = { ...next, inventory: next.inventory.filter((i) => i !== e.take), selectedItem: next.selectedItem === e.take ? null : next.selectedItem };
    } else if ("set" in e) {
      next = { ...next, flags: add(next.flags, e.set) };
    } else if ("clue" in e) {
      if (def.clues[e.clue] !== undefined) next = { ...next, journal: add(next.journal, e.clue) };
    } else if ("escape" in e) {
      next = { ...next, escaped: true, openLock: null };
    }
  }
  return next;
}

function say(rule: Rule, fallbackTitle: string): Message {
  return { title: rule.title ?? fallbackTitle, lines: rule.say, tone: rule.tone };
}

/** Apply a rule: its effects, then its words. */
function run(def: AdventureDef, p: Progress, rule: Rule, title: string): Progress {
  const next = applyEffects(def, p, rule.do);
  return { ...next, message: say(rule, title) };
}

/** The hint step that matches the player's progress right now. */
export function activeHint(def: AdventureDef, p: Progress): HintDef | undefined {
  return def.hints.find((h) => holds(h.when, p));
}

/** How many levels of the current hint step have been shown (0–3). */
export function revealedHintLevel(def: AdventureDef, p: Progress): number {
  const h = activeHint(def, p);
  return h && p.hint.id === h.id ? p.hint.level : 0;
}

function inspect(def: AdventureDef, p: Progress, target: string): Progress {
  const h = hotspot(def, target);
  if (!h) return p;
  let next: Progress = { ...p, inspected: add(p.inspected, target), selectedItem: null, offered: [], openLock: null };
  const rule = firstRule(h.inspect, next);
  if (rule) next = run(def, next, rule, h.name);
  if (h.lock && !next.escaped && !next.flags.includes(solvedFlag(h.lock.id)) && holds(h.lock.when, next)) {
    next = { ...next, openLock: h.lock.id };
  }
  return next;
}

function useItem(def: AdventureDef, p: Progress, item: string, target: string): Progress {
  const h = hotspot(def, target);
  if (!h || !p.inventory.includes(item)) return { ...p, selectedItem: null };
  const rule = firstRule(h.use?.find((u) => u.item === item)?.rules, p);
  if (!rule) {
    return { ...p, selectedItem: null, message: { title: "Hmm…", lines: [def.wrongItemLine], tone: "wrong" } };
  }
  return { ...run(def, { ...p, selectedItem: null, offered: [] }, rule, h.name), selectedItem: null };
}

function submitLock(def: AdventureDef, p: Progress, lockId: string): Progress {
  const lock = lockOf(def, lockId);
  if (!lock || p.flags.includes(solvedFlag(lockId))) return p;
  const chosen = (p.dials[lockId] ?? []).map((i, d) => lock.dials[d][i]);
  if (chosen.length === lock.answer.length && chosen.every((v, i) => v === lock.answer[i])) {
    const solved = { ...p, flags: add(p.flags, solvedFlag(lockId)), openLock: null };
    return run(def, solved, lock.solved, lock.title);
  }
  return {
    ...p,
    wrongAttempts: p.wrongAttempts + 1,
    message: { title: lock.title, lines: [lock.wrong[p.wrongAttempts % lock.wrong.length]], tone: "wrong" },
  };
}

function setDial(def: AdventureDef, p: Progress, lockId: string, dial: number, index: number): Progress {
  const lock = lockOf(def, lockId);
  if (!lock || dial < 0 || dial >= lock.dials.length) return p;
  const n = lock.dials[dial].length;
  const current = p.dials[lockId] ?? lock.dials.map(() => 0);
  const dials = current.map((v, i) => (i === dial ? ((index % n) + n) % n : v));
  return { ...p, dials: { ...p.dials, [lockId]: dials } };
}

/** All play rules — identical for catalogue and custom rooms. Pure. */
export function step(def: AdventureDef, p: Progress, action: Action): Progress {
  if (p.escaped) return p;
  switch (action.type) {
    case "INSPECT":
      return inspect(def, p, action.target);
    case "TAKE": {
      if (!p.offered.includes(action.item) || !def.items[action.item]) return p;
      const item = def.items[action.item];
      const next = applyEffects(def, { ...p, offered: p.offered.filter((i) => i !== action.item) }, [{ give: action.item }]);
      return { ...next, message: { title: "Collected", lines: [`You take the ${item.name}.`], tone: "discovery" } };
    }
    case "SELECT_ITEM":
      return { ...p, selectedItem: action.item && p.inventory.includes(action.item) ? action.item : null };
    case "USE_ITEM":
      return p.selectedItem ? useItem(def, p, p.selectedItem, action.target) : p;
    case "DROP_ITEM":
      return useItem(def, p, action.item, action.target);
    case "SET_DIAL":
      return setDial(def, p, action.lock, action.dial, action.index);
    case "TURN_DIAL": {
      const current = p.dials[action.lock]?.[action.dial] ?? 0;
      return setDial(def, p, action.lock, action.dial, current + action.delta);
    }
    case "SUBMIT_LOCK":
      return submitLock(def, p, action.lock);
    case "CLOSE_LOCK":
      return { ...p, openLock: null };
    case "REQUEST_HINT": {
      const h = activeHint(def, p);
      if (!h) return p;
      const level = Math.min(revealedHintLevel(def, p) + 1, 3);
      return {
        ...p,
        hint: { id: h.id, level },
        hintsUsed: p.hintsUsed + 1,
        message: { title: `A hint (${level} of 3)`, lines: [h.levels[level - 1]], tone: "hint" },
      };
    }
    default:
      return p;
  }
}

/** Replay a list of actions from a fresh start. */
export function replay(def: AdventureDef, actions: Action[], from: Progress = newProgress(def)): Progress {
  return actions.reduce((p, a) => step(def, p, a), from);
}

/** The visual state of a hotspot right now (for the scene). */
export function lookOf(h: HotspotDef, p: Progress) {
  return h.looks?.find((l) => holds(l.when, p));
}

/** Set every dial of a lock to the given answer (used by the solver and tests). */
export function dialActions(lock: LockDef, values: string[]): Action[] {
  return values.map((v, d) => ({ type: "SET_DIAL", lock: lock.id, dial: d, index: lock.dials[d].indexOf(v) }) as Action);
}
