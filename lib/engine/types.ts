/**
 * The adventure engine's data model. A room is pure data (an AdventureDef — JSON for the
 * catalogue, compiled from Gemini's text for custom rooms); a playthrough is a Progress.
 * Definitions never change while playing; progress is what gets saved.
 */

/** All listed conditions must hold. */
export type Cond = {
  flags?: string[];
  notFlags?: string[];
  items?: string[]; // in the satchel right now
  notItems?: string[];
};

export type Tone = "normal" | "wrong" | "discovery" | "intro" | "hint" | "locked" | "success" | "unlock";

export type Effect =
  | { offer: string } // show a "Take" button for this item (once — never re-offered after taking)
  | { give: string } // straight into the satchel
  | { take: string } // used up
  | { set: string } // set a flag
  | { clue: string } // copy a clue into the journal
  | { escape: true }; // the adventure is won

/** What happens: the first rule whose `when` matches is used. */
export type Rule = { when?: Cond; title?: string; say: string[]; tone?: Tone; do?: Effect[] };

export type ArtKind = "door" | "box" | "machine" | "emoji";

/** A visual state a hotspot can show when its condition holds (first match wins). */
export type Look = { when: Cond; emoji?: string; state: "open" | "active" | "lit" | "unlocked" };

export type LockDef = {
  id: string;
  title: string;
  prompt: string;
  /** Options on each dial, e.g. digits, letters, hours, symbols. */
  dials: string[][];
  /** The winning option on each dial. */
  answer: string[];
  /** Whether the lock can be operated yet (otherwise inspecting just describes it). */
  when?: Cond;
  /**
   * Journal clues that together reveal the answer. The solver only "knows" the answer once
   * these are found, so a room whose answer can't be learned fails validation.
   */
  knowledge?: string[];
  solved: Rule;
  wrong: string[];
};

export type HotspotDef = {
  id: string;
  name: string;
  art: ArtKind;
  emoji?: string;
  /** Left, top, width, height in % of the scene. */
  spot: [number, number, number, number];
  plinth?: "shelf" | "pedestal" | "table" | "floor" | "wall";
  tag?: "always" | "hover";
  looks?: Look[];
  inspect: Rule[];
  use?: { item: string; rules: Rule[] }[];
  lock?: LockDef;
};

export type HintDef = { id: string; when?: Cond; levels: [string, string, string] };

export type Difficulty = "gentle" | "tricky" | "devious";
export type Backdrop = "study" | "library" | "workshop" | "greenhouse";

export type Action =
  | { type: "INSPECT"; target: string }
  | { type: "TAKE"; item: string }
  | { type: "SELECT_ITEM"; item: string | null }
  | { type: "USE_ITEM"; target: string }
  | { type: "DROP_ITEM"; item: string; target: string }
  | { type: "SET_DIAL"; lock: string; dial: number; index: number }
  | { type: "TURN_DIAL"; lock: string; dial: number; delta: number }
  | { type: "SUBMIT_LOCK"; lock: string }
  | { type: "CLOSE_LOCK" }
  | { type: "REQUEST_HINT" };

export type AdventureDef = {
  id: string;
  version: number;
  kind: "catalogue" | "custom";
  title: string;
  theme: string;
  description: string;
  difficulty: Difficulty;
  backdrop: Backdrop;
  intro: string;
  items: Record<string, { name: string; emoji: string }>;
  clues: Record<string, string>;
  hotspots: HotspotDef[];
  hints: HintDef[];
  wrongItemLine: string;
  escapeText: string;
  /** A known winning sequence; the tests replay it, the solver independently confirms a win exists. */
  solution: Action[];
  /** For custom rooms: the relics the player chose. */
  relics?: [string, string, string];
};

export type Message = { title: string; lines: string[]; tone?: Tone };

/** One playthrough's changing state. Everything here is saved; nothing here is a puzzle fact. */
export type Progress = {
  flags: string[];
  inventory: string[];
  offered: string[];
  taken: string[];
  journal: string[];
  inspected: string[];
  selectedItem: string | null;
  openLock: string | null;
  dials: Record<string, number[]>;
  wrongAttempts: number;
  hintsUsed: number;
  hint: { id: string | null; level: number };
  message: Message | null;
  escaped: boolean;
};
