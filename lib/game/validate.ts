import { OBJECT_IDS, type RoomText } from "./types";

export type ValidationResult = { ok: true } | { ok: false; reasons: string[] };

const NAME_PLACEHOLDERS = ["{keyHolder}", "{clueHolder}", "{first}", "{second}", "{third}"];
const ALL_PLACEHOLDERS = new Set(["{digit}", ...NAME_PLACEHOLDERS]);
const STOP_WORDS = new Set(["the", "and", "of", "with", "for", "from", "its", "his", "her", "their"]);

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Lowercase words of three or more letters, minus filler words. */
export function significantWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

/** Whole-word, case-insensitive. */
function hasWord(text: string, word: string): boolean {
  return new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(text);
}

/** Does `text` contain any significant word of any object name? */
function namedObjects(text: string, room: RoomText): string[] {
  return OBJECT_IDS.map((id) => room.objects[id].name).filter((name) =>
    significantWords(name).some((w) => hasWord(text, w)),
  );
}

/** Every player-facing string in the room, labelled for error messages. */
function allStrings(room: RoomText): [string, string][] {
  const out: [string, string][] = [
    ["title", room.title],
    ["theme", room.theme],
    ["intro", room.intro],
    ["clueText", room.clueText],
    ["keyItem.name", room.keyItem.name],
    ["keyFoundText", room.keyFoundText],
    ["machine.description", room.machine.description],
    ["box.lockedText", room.box.lockedText],
    ["box.openText", room.box.openText],
    ["box.orderClue", room.box.orderClue],
    ["exit.lockedText", room.exit.lockedText],
    ["wrongItemLine", room.wrongItemLine],
    ["escapeText", room.escapeText],
  ];
  for (const id of OBJECT_IDS) {
    out.push([`objects.${id}.name`, room.objects[id].name]);
    out.push([`objects.${id}.description`, room.objects[id].description]);
    out.push([`objects.${id}.riddle`, room.objects[id].riddle]);
    out.push([`objects.${id}.signatureWord`, room.objects[id].signatureWord]);
  }
  room.machine.wrongCodeLines.forEach((s, i) => out.push([`machine.wrongCodeLines[${i}]`, s]));
  for (const step of ["findKey", "openBox", "solveCode"] as const) {
    room.hints[step].forEach((s, i) => out.push([`hints.${step}[${i}]`, s]));
  }
  return out;
}

/**
 * Yes/no checks that the text will produce a solvable — and fair — room once the
 * engine fills in the facts. The AI never states a fact; it only leaves the right slots.
 * `playerObjects`, when given, must each be named in the intro.
 */
export function validateRoomText(room: RoomText, playerObjects?: string[]): ValidationResult {
  const reasons: string[] = [];
  const strings = allStrings(room);

  for (const [label, text] of strings) {
    if (!text || !text.trim()) reasons.push(`${label} is empty`);
    for (const match of text.match(/\{[^}]*\}/g) ?? []) {
      if (!ALL_PLACEHOLDERS.has(match)) reasons.push(`${label} has unknown placeholder ${match}`);
    }
    // A stray numeral could be mistaken for a code digit.
    if (/[0-9]/.test(text)) reasons.push(`${label} contains a numeral`);
  }

  // {digit}: exactly once in each object description, nowhere else.
  for (const id of OBJECT_IDS) {
    if (count(room.objects[id].description, "{digit}") !== 1) {
      reasons.push(`objects.${id}.description must contain {digit} exactly once`);
    }
  }
  for (const [label, text] of strings) {
    if (!/^objects\.[abc]\.description$/.test(label) && text.includes("{digit}")) {
      reasons.push(`${label} must not contain {digit}`);
    }
  }

  // Riddles: each object is identifiable by a signature word that only it has.
  for (const id of OBJECT_IDS) {
    const obj = room.objects[id];
    const word = obj.signatureWord.trim();
    if (/[{}]/.test(obj.riddle)) reasons.push(`objects.${id}.riddle must not contain placeholders`);
    if (!/^[a-z][a-z'-]{2,}$/i.test(word)) {
      reasons.push(`objects.${id}.signatureWord must be a single word`);
      continue;
    }
    if (!hasWord(obj.riddle, word)) reasons.push(`objects.${id}.riddle must contain its signature word "${word}"`);
    if (!hasWord(obj.description, word)) reasons.push(`objects.${id}.description must contain its signature word "${word}"`);
    for (const other of OBJECT_IDS.filter((o) => o !== id)) {
      const o = room.objects[other];
      if (hasWord(o.description, word) || hasWord(o.riddle, word)) {
        reasons.push(`signature word "${word}" of object ${id} also appears in object ${other}`);
      }
    }
    const giveaway = significantWords(obj.name).filter((w) => hasWord(obj.riddle, w));
    if (giveaway.length) reasons.push(`objects.${id}.riddle gives away its name ("${giveaway.join(", ")}")`);
  }

  // The clue points at the key-holder — by riddle, never by name.
  if (!room.clueText.includes("{keyHolder}")) reasons.push("clueText must contain {keyHolder}");
  for (const name of namedObjects(room.clueText, room)) reasons.push(`clueText names "${name}"`);

  // The box clue gives the reading order: {first}, {second}, {third}, once each, in order, never by name.
  const clue = room.box.orderClue;
  const positions = ["{first}", "{second}", "{third}"].map((p) => clue.indexOf(p));
  if (["{first}", "{second}", "{third}"].some((p) => count(clue, p) !== 1)) {
    reasons.push("box.orderClue must contain {first}, {second}, {third} exactly once each");
  } else if (!(positions[0] < positions[1] && positions[1] < positions[2])) {
    reasons.push("box.orderClue must list {first}, {second}, {third} in that order");
  }
  for (const name of namedObjects(clue, room)) reasons.push(`box.orderClue names "${name}"`);

  // Hints escalate: levels 1–2 name nothing; level 3 names what's needed.
  for (const step of ["findKey", "solveCode"] as const) {
    for (const level of [0, 1]) {
      const hint = room.hints[step][level];
      if (NAME_PLACEHOLDERS.some((p) => hint.includes(p))) {
        reasons.push(`hints.${step}[${level}] must not use name placeholders`);
      }
      for (const name of namedObjects(hint, room)) reasons.push(`hints.${step}[${level}] names "${name}"`);
    }
  }
  if (!room.hints.findKey[2].includes("{keyHolder}")) reasons.push("hints.findKey[2] must contain {keyHolder}");
  if (["{first}", "{second}", "{third}"].some((p) => !room.hints.solveCode[2].includes(p))) {
    reasons.push("hints.solveCode[2] must contain {first}, {second}, {third}");
  }

  if (room.machine.wrongCodeLines.length < 1) reasons.push("machine.wrongCodeLines is empty");

  if (playerObjects) {
    const intro = room.intro.toLowerCase();
    for (const name of playerObjects) {
      if (!intro.includes(name.toLowerCase())) reasons.push(`intro does not mention "${name}"`);
    }
  }

  return reasons.length ? { ok: false, reasons } : { ok: true };
}
