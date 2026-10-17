import { z } from "zod";
import { adventureSchema } from "./validate";
import type { AdventureDef, Progress } from "./types";

/**
 * Browser-only persistence (localStorage, no backend), version 2.
 *
 * - A **room definition** is the puzzle (catalogue rooms live in JSON in the app; custom Gemini
 *   rooms are stored here because they exist nowhere else).
 * - A **playthrough** is one player's progress through one room, with its own save ID, so playing
 *   a room again never overwrites an earlier attempt.
 *
 * Pure functions over a Storage-like object, testable outside a browser.
 */

export const SAVE_KEY = "pocketDungeon.saves";
export const SAVE_VERSION = 2;
export const MAX_PLAYTHROUGHS = 12;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type Stats = { seconds: number; wrongAttempts: number; hintsUsed: number; cluesFound: number };

export type Playthrough = {
  saveId: string;
  roomId: string;
  roomVersion: number;
  origin: "catalogue" | "custom";
  createdAt: number;
  savedAt: number;
  progress: Progress;
  stats: Stats | null;
};

type SaveFile = {
  version: number;
  current: string | null;
  plays: Record<string, Playthrough>;
  /** Custom (Gemini) room definitions, by room ID. Catalogue rooms are never stored. */
  rooms: Record<string, AdventureDef>;
};

/** Finds a catalogue room definition by ID (injected so this module stays pure). */
export type CatalogueLookup = (roomId: string) => AdventureDef | undefined;

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newSaveId(rng: () => number = Math.random): string {
  let s = "PD-";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(rng() * CODE_CHARS.length)];
  return s;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

// ── Shape checks ──

const str = z.string();
const message = z.object({ title: str, lines: z.array(str), tone: z.string().optional() }).nullable();
const progressSchema = z.object({
  flags: z.array(str),
  inventory: z.array(str),
  offered: z.array(str),
  taken: z.array(str),
  journal: z.array(str),
  inspected: z.array(str),
  selectedItem: str.nullable(),
  openLock: str.nullable(),
  dials: z.record(str, z.array(z.number().int().min(0))),
  wrongAttempts: z.number().int().min(0),
  hintsUsed: z.number().int().min(0),
  hint: z.object({ id: str.nullable(), level: z.number().int().min(0).max(3) }),
  message,
  escaped: z.boolean(),
});
const playSchema = z.object({
  saveId: z.string().regex(/^PD-[A-Z0-9]{6}$/),
  roomId: str,
  roomVersion: z.number().int(),
  origin: z.enum(["catalogue", "custom"]),
  createdAt: z.number(),
  savedAt: z.number(),
  progress: progressSchema,
  stats: z.object({ seconds: z.number(), wrongAttempts: z.number(), hintsUsed: z.number(), cluesFound: z.number() }).nullable(),
});

/** Progress must make sense for this room: every item and clue it mentions exists there. */
function fitsRoom(p: Progress, def: AdventureDef): boolean {
  const items = (ids: string[]) => ids.every((i) => def.items[i]);
  const hotspotIds = new Set(def.hotspots.map((h) => h.id));
  const lockIds = new Set(def.hotspots.flatMap((h) => (h.lock ? [h.lock.id] : [])));
  return (
    items(p.inventory) &&
    items(p.offered) &&
    items(p.taken) &&
    p.journal.every((c) => def.clues[c] !== undefined) &&
    p.inspected.every((h) => hotspotIds.has(h)) &&
    (p.openLock === null || lockIds.has(p.openLock)) &&
    Object.keys(p.dials).every((l) => lockIds.has(l))
  );
}

// ── Reading and writing ──

export type LoadProblem = "missing" | "corrupt" | "outdated";
const empty = (): SaveFile => ({ version: SAVE_VERSION, current: null, rooms: {}, plays: {} });

function safeRemove(storage: StorageLike) {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

/** Read the save file, dropping anything unusable. Never throws. */
export function readSaves(storage: StorageLike | null, catalogue: CatalogueLookup): { file: SaveFile; problem: LoadProblem | null } {
  if (!storage) return { file: empty(), problem: "missing" };
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return { file: empty(), problem: "missing" };
  }
  if (!raw) return { file: empty(), problem: "missing" };

  let top: Partial<SaveFile> | null;
  try {
    top = JSON.parse(raw);
  } catch {
    safeRemove(storage);
    return { file: empty(), problem: "corrupt" };
  }
  if (!top || typeof top !== "object" || typeof top.version !== "number") {
    safeRemove(storage);
    return { file: empty(), problem: "corrupt" };
  }
  if (top.version !== SAVE_VERSION) {
    safeRemove(storage);
    return { file: empty(), problem: "outdated" };
  }

  const rooms: Record<string, AdventureDef> = {};
  for (const [id, def] of Object.entries(top.rooms ?? {})) {
    const ok = adventureSchema.safeParse(def);
    if (ok.success && ok.data.id === id && ok.data.kind === "custom") rooms[id] = ok.data as AdventureDef;
  }

  const plays: Record<string, Playthrough> = {};
  let dropped = Object.keys(rooms).length !== Object.keys(top.rooms ?? {}).length;
  for (const [id, value] of Object.entries(top.plays ?? {})) {
    const parsed = playSchema.safeParse(value);
    const play = parsed.success ? (parsed.data as Playthrough) : null;
    const def = play && (play.origin === "catalogue" ? catalogue(play.roomId) : rooms[play.roomId]);
    // A catalogue room that has since changed version makes old progress meaningless: drop it.
    if (play && play.saveId === id && def && def.version === play.roomVersion && fitsRoom(play.progress, def)) plays[id] = play;
    else dropped = true;
  }
  const current = typeof top.current === "string" && plays[top.current] ? top.current : null;
  const file: SaveFile = { version: SAVE_VERSION, current, rooms, plays };
  if (dropped) write(storage, file);
  return { file, problem: dropped ? "corrupt" : null };
}

function write(storage: StorageLike, file: SaveFile): boolean {
  const ordered = Object.values(file.plays).sort((x, y) => y.savedAt - x.savedAt);
  for (let keep = Math.min(ordered.length, MAX_PLAYTHROUGHS); keep >= 0; keep--) {
    const plays = Object.fromEntries(ordered.slice(0, keep).map((p) => [p.saveId, p]));
    // Keep only custom rooms some playthrough still uses.
    const used = new Set(Object.values(plays).map((p) => p.roomId));
    const rooms = Object.fromEntries(Object.entries(file.rooms).filter(([id]) => used.has(id)));
    const current = file.current && plays[file.current] ? file.current : null;
    try {
      storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, current, plays, rooms }));
      return true;
    } catch {
      /* quota exceeded or blocked: try keeping fewer */
    }
  }
  return false;
}

/** Save a playthrough (and, for custom rooms, its definition). Makes it current. */
export function savePlaythrough(storage: StorageLike | null, catalogue: CatalogueLookup, play: Playthrough, customDef?: AdventureDef): boolean {
  if (!storage) return false;
  const { file } = readSaves(storage, catalogue);
  if (play.origin === "custom") {
    if (customDef) file.rooms[customDef.id] = customDef;
    if (!file.rooms[play.roomId]) return false;
  }
  file.plays[play.saveId] = play;
  file.current = play.saveId;
  return write(storage, file);
}

export type Loaded = { play: Playthrough; def: AdventureDef };

function resolve(file: SaveFile, catalogue: CatalogueLookup, play: Playthrough | undefined): Loaded | null {
  if (!play) return null;
  const def = play.origin === "catalogue" ? catalogue(play.roomId) : file.rooms[play.roomId];
  return def ? { play, def } : null;
}

export function loadCurrent(storage: StorageLike | null, catalogue: CatalogueLookup): Loaded | null {
  const { file } = readSaves(storage, catalogue);
  return resolve(file, catalogue, file.current ? file.plays[file.current] : undefined);
}

export function loadPlaythrough(storage: StorageLike | null, catalogue: CatalogueLookup, saveId: string): Loaded | null {
  const { file } = readSaves(storage, catalogue);
  return resolve(file, catalogue, file.plays[normalizeCode(saveId)]);
}

/** Every playthrough in this browser, newest first. */
export function listPlaythroughs(storage: StorageLike | null, catalogue: CatalogueLookup): Playthrough[] {
  return Object.values(readSaves(storage, catalogue).file.plays).sort((x, y) => y.savedAt - x.savedAt);
}

/** The most recent playthrough of a room, if any. */
export function latestFor(storage: StorageLike | null, catalogue: CatalogueLookup, roomId: string): Playthrough | null {
  return listPlaythroughs(storage, catalogue).find((p) => p.roomId === roomId) ?? null;
}

/** A stored custom room definition (so a custom room can be played again). */
export function customRoom(storage: StorageLike | null, catalogue: CatalogueLookup, roomId: string): AdventureDef | null {
  return readSaves(storage, catalogue).file.rooms[roomId] ?? null;
}

/** Look up a code: a save ID opens that playthrough; a room ID opens that room's latest one. */
export function findByCode(storage: StorageLike | null, catalogue: CatalogueLookup, code: string): Loaded | null {
  const wanted = normalizeCode(code);
  const { file } = readSaves(storage, catalogue);
  if (file.plays[wanted]) return resolve(file, catalogue, file.plays[wanted]);
  const latest = Object.values(file.plays)
    .filter((p) => normalizeCode(p.roomId) === wanted)
    .sort((x, y) => y.savedAt - x.savedAt)[0];
  return resolve(file, catalogue, latest);
}

/** localStorage, or null on the server / when the browser blocks it. */
export function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    const s = window.localStorage;
    s.setItem("__pd_probe__", "1");
    s.removeItem("__pd_probe__");
    return s;
  } catch {
    return null;
  }
}
