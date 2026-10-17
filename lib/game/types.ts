// Shared game types. Pure data — no React, no AI.

export type ObjectId = "a" | "b" | "c";
export const OBJECT_IDS: readonly ObjectId[] = ["a", "b", "c"];

export type HotspotId = ObjectId | "machine" | "box" | "exit";

/** The engine's secret plan, decided before any text is written. */
export type Solution = {
  clueHolder: ObjectId;
  keyHolder: ObjectId; // always different from clueHolder
  order: [ObjectId, ObjectId, ObjectId];
  digits: Record<ObjectId, number>; // 0–9
  code: string; // digits read in `order`, e.g. "472"
};

export type HintStep = "findKey" | "openBox" | "solveCode";
export type HintSet = [string, string, string];

export type RoomObjectText = {
  name: string;
  emoji: string;
  description: string; // contains {digit} exactly once
};

/**
 * Room text with placeholders. Written by Gemini (or by hand for the fallback).
 * Placeholders: {digit} (object descriptions only), {keyHolder}, {clueHolder},
 * {first}, {second}, {third}. The engine fills them with real values.
 */
export type RoomText = {
  title: string;
  theme: string;
  intro: string;
  objects: Record<ObjectId, RoomObjectText>;
  clueText: string; // found in the clue-holder; contains {keyHolder}
  keyItem: { name: string; emoji: string };
  keyFoundText: string; // found in the key-holder
  machine: { description: string; wrongCodeLines: string[] };
  box: { lockedText: string; openText: string; orderClue: string };
  exit: { lockedText: string };
  wrongItemLine: string;
  hints: Record<HintStep, HintSet>;
  escapeText: string;
};

/** A finished, playable room: placeholders filled, solution attached. */
export type Room = RoomText & { solution: Solution; roomCode: string };

export type JournalEntry = { id: "clue" | "order"; text: string };
export type Item = { id: "key"; name: string; emoji: string };
export type Message = { title: string; lines: string[]; tone?: "normal" | "wrong" | "discovery" };

export type GameState = {
  room: Room;
  inspected: HotspotId[];
  keyOffered: boolean;
  keyCollected: boolean;
  inventory: Item[];
  selectedItem: Item["id"] | null;
  boxOpen: boolean;
  journal: JournalEntry[];
  hintStep: HintStep;
  hintLevel: 0 | 1 | 2 | 3;
  wrongAttempts: number;
  machineOpen: boolean;
  message: Message | null;
  escaped: boolean;
};

export type GameAction =
  | { type: "INSPECT"; target: HotspotId }
  | { type: "COLLECT_KEY" }
  | { type: "SELECT_ITEM"; item: Item["id"] | null }
  | { type: "USE_ITEM"; target: HotspotId }
  | { type: "ENTER_CODE"; code: string }
  | { type: "CLOSE_MACHINE" }
  | { type: "REQUEST_HINT" };
