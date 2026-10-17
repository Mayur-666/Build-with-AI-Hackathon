import type { ObjectId, Room, RoomText, Solution } from "./types";

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Display-only souvenir code, e.g. "TOASTE-7QX3". */
export function makeRoomCode(firstObjectName: string, rng: () => number = Math.random): string {
  const prefix = firstObjectName.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "ROOM";
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += CODE_CHARS[Math.floor(rng() * CODE_CHARS.length)];
  return `${prefix}-${suffix}`;
}

const DETERMINER = /\b(the|a|an|your|my|this|that|its|their)\s+$/i;

/**
 * Insert an object name where a placeholder was, as a grammatical noun phrase:
 * "observe {first}" → "observe the toaster"; "the {first}" stays "the toaster";
 * possessive names ("grandma's dentures") get no article; sentence starts are capitalized.
 */
export function nounPhrase(name: string, before: string): string {
  const needsArticle = !DETERMINER.test(before) && !/'s\b/i.test(name);
  const phrase = needsArticle ? `the ${name}` : name;
  const sentenceStart = /(^|[.!?:]\s*["'“‘]?|^["'“‘])\s*$/.test(before);
  return sentenceStart ? phrase[0].toUpperCase() + phrase.slice(1) : phrase;
}

/** Replace name placeholders in any text. {digit} is handled per object. */
function fillNames(text: string, room: RoomText, solution: Solution): string {
  const ids: Record<string, ObjectId> = {
    keyHolder: solution.keyHolder,
    clueHolder: solution.clueHolder,
    first: solution.order[0],
    second: solution.order[1],
    third: solution.order[2],
  };
  return text.replace(/\{(keyHolder|clueHolder|first|second|third)\}/g, (_m, key: string, offset: number) =>
    nounPhrase(room.objects[ids[key]].name, text.slice(0, offset)),
  );
}

/**
 * Turn validated placeholder text into a playable room.
 * The engine — not the AI — supplies every fact here.
 */
export function fillRoom(text: RoomText, solution: Solution, rng: () => number = Math.random): Room {
  const f = (s: string) => fillNames(s, text, solution);
  const objectFor = (id: ObjectId) => ({
    ...text.objects[id],
    description: f(text.objects[id].description.replaceAll("{digit}", String(solution.digits[id]))),
  });

  return {
    title: f(text.title),
    theme: f(text.theme),
    intro: f(text.intro),
    objects: { a: objectFor("a"), b: objectFor("b"), c: objectFor("c") },
    clueText: f(text.clueText),
    keyItem: text.keyItem,
    keyFoundText: f(text.keyFoundText),
    machine: {
      description: f(text.machine.description),
      wrongCodeLines: text.machine.wrongCodeLines.map(f),
    },
    box: {
      lockedText: f(text.box.lockedText),
      openText: f(text.box.openText),
      orderClue: f(text.box.orderClue),
    },
    exit: { lockedText: f(text.exit.lockedText) },
    wrongItemLine: f(text.wrongItemLine),
    hints: {
      findKey: text.hints.findKey.map(f) as Room["hints"]["findKey"],
      openBox: text.hints.openBox.map(f) as Room["hints"]["openBox"],
      solveCode: text.hints.solveCode.map(f) as Room["hints"]["solveCode"],
    },
    escapeText: f(text.escapeText),
    solution,
    roomCode: makeRoomCode(text.objects.a.name, rng),
  };
}
