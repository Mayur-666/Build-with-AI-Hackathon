import { z } from "zod";
import type { GameState } from "./types";

/**
 * Browser-only persistence for adventures (localStorage, no backend).
 * Everything lives under one key, versioned. Saves hold the generated room exactly as
 * played — puzzle facts included — so restoring never regenerates anything.
 * Pure functions over a Storage-like object so they're testable outside a browser.
 */

export const SAVE_KEY = "pocketDungeon.saves";
export const SAVE_VERSION = 1;
export const MAX_SAVED_ROOMS = 8;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type Trio = [string, string, string];
export type SavedStats = { seconds: number; wrongAttempts: number; hintsUsed: number; cluesFound: number };

export type SavedAdventure = {
  roomCode: string;
  createdAt: number;
  savedAt: number;
  /** The relics the player typed, so "same relics, new room" still works after a refresh. */
  objects: Trio | null;
  inClassicRoom: boolean;
  game: GameState;
  /** What the strange machine's dials were last set to. */
  dials: [number, number, number];
  /** Set once the player escapes; the ending survives refreshes. */
  stats: SavedStats | null;
};

type SaveFile = { version: number; current: string | null; rooms: Record<string, SavedAdventure> };

// ── Shape checks (a save written by hand, by an old version, or half-written is rejected) ──

const str = z.string();
const id = z.enum(["a", "b", "c"]);
const hotspot = z.enum(["a", "b", "c", "machine", "box", "exit"]);
const three = z.tuple([str, str, str]);
const digit = z.number().int().min(0).max(9);

const roomSchema = z.object({
  title: str,
  theme: str,
  intro: str,
  objects: z.object({
    a: z.object({ name: str, emoji: str, description: str, riddle: str, signatureWord: str }),
    b: z.object({ name: str, emoji: str, description: str, riddle: str, signatureWord: str }),
    c: z.object({ name: str, emoji: str, description: str, riddle: str, signatureWord: str }),
  }),
  clueText: str,
  keyItem: z.object({ name: str, emoji: str }),
  keyFoundText: str,
  machine: z.object({ description: str, wrongCodeLines: z.array(str).min(1) }),
  box: z.object({ lockedText: str, openText: str, orderClue: str }),
  exit: z.object({ lockedText: str }),
  wrongItemLine: str,
  hints: z.object({ findKey: three, openBox: three, solveCode: three }),
  escapeText: str,
  solution: z.object({
    clueHolder: id,
    keyHolder: id,
    order: z.tuple([id, id, id]),
    digits: z.object({ a: digit, b: digit, c: digit }),
    code: z.string().regex(/^[0-9]{3}$/),
  }),
  roomCode: z.string().min(3).max(24),
});

const message = z
  .object({
    title: str,
    lines: z.array(str),
    tone: z.enum(["normal", "wrong", "discovery", "intro", "hint", "locked", "success"]).optional(),
  })
  .nullable();

const gameSchema = z.object({
  room: roomSchema,
  inspected: z.array(hotspot),
  keyOffered: z.boolean(),
  keyCollected: z.boolean(),
  inventory: z.array(z.object({ id: z.literal("key"), name: str, emoji: str })),
  selectedItem: z.literal("key").nullable(),
  boxOpen: z.boolean(),
  journal: z.array(z.object({ id: z.enum(["clue", "order"]), text: str })),
  hintStep: z.enum(["findKey", "openBox", "solveCode"]),
  hintLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  wrongAttempts: z.number().int().min(0),
  hintsUsed: z.number().int().min(0),
  machineOpen: z.boolean(),
  message,
  escaped: z.boolean(),
});

const adventureSchema = z.object({
  roomCode: str,
  createdAt: z.number(),
  savedAt: z.number(),
  objects: three.nullable(),
  inClassicRoom: z.boolean(),
  game: gameSchema,
  dials: z.tuple([digit, digit, digit]),
  stats: z
    .object({ seconds: z.number(), wrongAttempts: z.number(), hintsUsed: z.number(), cluesFound: z.number() })
    .nullable(),
});

/** Shape is right AND the puzzle facts agree with each other (a tampered code is rejected). */
function validAdventure(value: unknown): SavedAdventure | null {
  const parsed = adventureSchema.safeParse(value);
  if (!parsed.success) return null;
  const adv = parsed.data as SavedAdventure;
  const { solution, roomCode } = adv.game.room;
  const consistent =
    solution.clueHolder !== solution.keyHolder &&
    new Set(solution.order).size === 3 &&
    solution.code === solution.order.map((o) => solution.digits[o]).join("") &&
    roomCode === adv.roomCode;
  return consistent ? adv : null;
}

// ── Reading and writing ──

export type LoadProblem = "missing" | "corrupt" | "outdated";

/** Read the whole save file, dropping anything unusable. Never throws. */
export function readSaves(storage: StorageLike | null): { file: SaveFile; problem: LoadProblem | null } {
  const empty: SaveFile = { version: SAVE_VERSION, current: null, rooms: {} };
  if (!storage) return { file: empty, problem: "missing" };
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return { file: empty, problem: "missing" };
  }
  if (!raw) return { file: empty, problem: "missing" };

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    safeRemove(storage);
    return { file: empty, problem: "corrupt" };
  }
  const top = data as Partial<SaveFile> | null;
  if (!top || typeof top !== "object" || typeof top.version !== "number" || typeof top.rooms !== "object" || !top.rooms) {
    safeRemove(storage);
    return { file: empty, problem: "corrupt" };
  }
  if (top.version !== SAVE_VERSION) {
    safeRemove(storage);
    return { file: empty, problem: "outdated" };
  }

  const rooms: Record<string, SavedAdventure> = {};
  let dropped = false;
  for (const [code, value] of Object.entries(top.rooms)) {
    const adv = validAdventure(value);
    if (adv && adv.roomCode === code) rooms[code] = adv;
    else dropped = true;
  }
  const current = typeof top.current === "string" && rooms[top.current] ? top.current : null;
  const file = { version: SAVE_VERSION, current, rooms };
  if (dropped) write(storage, file);
  return { file, problem: dropped ? "corrupt" : null };
}

function safeRemove(storage: StorageLike) {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

function write(storage: StorageLike, file: SaveFile): boolean {
  // Keep only the most recent rooms; if storage is full, drop the oldest and try again.
  const ordered = Object.values(file.rooms).sort((x, y) => y.savedAt - x.savedAt);
  for (let keep = Math.min(ordered.length, MAX_SAVED_ROOMS); keep >= 1; keep--) {
    const rooms = Object.fromEntries(ordered.slice(0, keep).map((r) => [r.roomCode, r]));
    const current = file.current && rooms[file.current] ? file.current : null;
    try {
      storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, current, rooms }));
      return true;
    } catch {
      /* quota exceeded or storage blocked: try with fewer rooms */
    }
  }
  return false;
}

/** Save (or update) an adventure and make it the current one. Returns false if storage is unavailable. */
export function saveAdventure(storage: StorageLike | null, adventure: SavedAdventure): boolean {
  if (!storage) return false;
  const { file } = readSaves(storage);
  file.rooms[adventure.roomCode] = adventure;
  file.current = adventure.roomCode;
  return write(storage, file);
}

/** The adventure the player was last in, if any. */
export function loadCurrent(storage: StorageLike | null): SavedAdventure | null {
  const { file } = readSaves(storage);
  return file.current ? file.rooms[file.current] : null;
}

/** A specific saved room by its code (case-insensitive), from this browser only. */
export function loadByCode(storage: StorageLike | null, code: string): SavedAdventure | null {
  const { file } = readSaves(storage);
  const wanted = normalizeRoomCode(code);
  return Object.values(file.rooms).find((r) => r.roomCode === wanted) ?? null;
}

/** All rooms saved in this browser, newest first. */
export function listSaved(storage: StorageLike | null): SavedAdventure[] {
  return Object.values(readSaves(storage).file.rooms).sort((x, y) => y.savedAt - x.savedAt);
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/** Build a save record from live game state. */
export function toAdventure(args: Omit<SavedAdventure, "roomCode" | "savedAt">, now = Date.now()): SavedAdventure {
  return { ...args, roomCode: args.game.room.roomCode, savedAt: now };
}

/** localStorage, or null on the server / when the browser blocks it. */
export function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    const s = window.localStorage;
    const probe = "__pd_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

