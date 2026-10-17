import { OBJECT_IDS, type RoomText } from "./types";

export type ValidationResult = { ok: true } | { ok: false; reasons: string[] };

const NAME_PLACEHOLDERS = ["{keyHolder}", "{clueHolder}", "{first}", "{second}", "{third}"];
const ALL_PLACEHOLDERS = new Set(["{digit}", ...NAME_PLACEHOLDERS]);

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
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
  }
  room.machine.wrongCodeLines.forEach((s, i) => out.push([`machine.wrongCodeLines[${i}]`, s]));
  for (const step of ["findKey", "openBox", "solveCode"] as const) {
    room.hints[step].forEach((s, i) => out.push([`hints.${step}[${i}]`, s]));
  }
  return out;
}

/**
 * Yes/no checks that the text will produce a solvable room once the engine
 * fills in the facts. The AI never states a fact; it only leaves the right slots.
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

  // The clue points at the key-holder.
  if (!room.clueText.includes("{keyHolder}")) reasons.push("clueText must contain {keyHolder}");

  // The box clue gives the reading order: {first}, {second}, {third}, once each, in order.
  const clue = room.box.orderClue;
  const positions = ["{first}", "{second}", "{third}"].map((p) => clue.indexOf(p));
  if (["{first}", "{second}", "{third}"].some((p) => count(clue, p) !== 1)) {
    reasons.push("box.orderClue must contain {first}, {second}, {third} exactly once each");
  } else if (!(positions[0] < positions[1] && positions[1] < positions[2])) {
    reasons.push("box.orderClue must list {first}, {second}, {third} in that order");
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
