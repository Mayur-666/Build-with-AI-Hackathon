import type { ObjectId, Room } from "../game/types";
import { dialActions } from "./engine";
import type { Action, AdventureDef, HotspotDef, LockDef } from "./types";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const CURIO: Record<ObjectId, Pick<HotspotDef, "spot" | "plinth">> = {
  a: { spot: [6.5, 35, 13, 17], plinth: "shelf" },
  b: { spot: [22.5, 40, 13, 17], plinth: "pedestal" },
  c: { spot: [62.5, 42, 13, 17], plinth: "table" },
};

/**
 * Turn a filled Gemini (or classic) room into an engine definition. The puzzle facts are the
 * engine-chosen ones already baked into `room`; nothing is regenerated. The sequence:
 * clue → key → box (order) → machine (code) → machine releases the door's last lock → open the door.
 */
export function fromChainRoom(room: Room, opts: { relics?: [string, string, string]; kind?: "custom" | "catalogue" } = {}): AdventureDef {
  const { solution: s } = room;

  const curio = (id: ObjectId): HotspotDef => {
    const o = room.objects[id];
    const rules: HotspotDef["inspect"] = [];
    if (id === s.keyHolder) {
      rules.push({ when: { notFlags: ["took:key"] }, title: o.name, say: [o.description, room.keyFoundText], tone: "discovery", do: [{ offer: "key" }] });
    }
    if (id === s.clueHolder) {
      rules.push({ title: o.name, say: [o.description, room.clueText], tone: "discovery", do: [{ clue: "clue" }] });
    }
    rules.push({ title: o.name, say: [o.description] });
    return { id, name: o.name, art: "emoji", emoji: o.emoji, tag: "always", ...CURIO[id], inspect: rules };
  };

  const machineLock: LockDef = {
    id: "machine",
    title: "The strange machine",
    prompt: "Set the three dials, then pull the lever.",
    dials: [DIGITS, DIGITS, DIGITS],
    answer: s.code.split(""),
    knowledge: ["order"], // the box's message gives the reading order; the digits are on the objects
    solved: {
      title: "The strange machine",
      say: ["The machine sings a cheerful chord. Deep inside the door, something heavy goes clunk: its final lock has slid open."],
      tone: "unlock",
      do: [{ set: "doorUnlocked" }],
    },
    wrong: room.machine.wrongCodeLines,
  };

  const hotspots: HotspotDef[] = [
    {
      id: "exit",
      name: "the door",
      art: "door",
      spot: [41.5, 12.5, 17, 54],
      tag: "hover",
      looks: [{ when: { flags: ["doorUnlocked"] }, state: "unlocked" }],
      inspect: [
        { when: { flags: ["doorUnlocked"] }, title: "The door", say: [room.escapeText], tone: "success", do: [{ escape: true }] },
        { title: "The door", say: [room.exit.lockedText], tone: "locked" },
      ],
    },
    curio("a"),
    curio("b"),
    curio("c"),
    {
      id: "machine",
      name: "strange machine",
      art: "machine",
      spot: [77, 22, 19, 60],
      tag: "hover",
      looks: [{ when: { flags: ["solved:machine"] }, state: "active" }],
      inspect: [
        { when: { flags: ["solved:machine"] }, title: "The strange machine", say: ["The machine hums contentedly. Its work is done; the door is waiting."] },
        { title: "The strange machine", say: [room.machine.description] },
      ],
      lock: machineLock,
    },
    {
      id: "box",
      name: "box",
      art: "box",
      spot: [40, 71, 14, 16],
      tag: "hover",
      looks: [{ when: { flags: ["boxOpen"] }, state: "open" }],
      inspect: [
        { when: { flags: ["boxOpen"] }, title: "The box", say: [room.box.openText, room.box.orderClue] },
        { title: "The box", say: [room.box.lockedText], tone: "locked" },
      ],
      use: [
        {
          item: "key",
          rules: [
            {
              when: { notFlags: ["boxOpen"] },
              title: "The box",
              say: [room.box.openText, room.box.orderClue],
              tone: "discovery",
              do: [{ set: "boxOpen" }, { take: "key" }, { clue: "order" }],
            },
          ],
        },
      ],
    },
  ];

  const solution: Action[] = [
    { type: "INSPECT", target: s.clueHolder },
    { type: "INSPECT", target: s.keyHolder },
    { type: "TAKE", item: "key" },
    { type: "DROP_ITEM", item: "key", target: "box" },
    { type: "INSPECT", target: "machine" },
    ...dialActions(machineLock, machineLock.answer),
    { type: "SUBMIT_LOCK", lock: "machine" },
    { type: "INSPECT", target: "exit" },
  ];

  return {
    id: room.roomCode,
    version: 1,
    kind: opts.kind ?? "custom",
    title: room.title,
    theme: room.theme,
    description: room.theme,
    difficulty: "tricky",
    backdrop: "study",
    intro: room.intro,
    items: { key: { name: room.keyItem.name, emoji: room.keyItem.emoji } },
    clues: { clue: room.clueText, order: room.box.orderClue },
    hotspots,
    hints: [
      { id: "findKey", when: { notFlags: ["took:key"] }, levels: room.hints.findKey },
      { id: "openBox", when: { notFlags: ["boxOpen"] }, levels: room.hints.openBox },
      { id: "solveCode", when: { notFlags: ["doorUnlocked"] }, levels: room.hints.solveCode },
      {
        id: "openDoor",
        levels: [
          "The machine did something to the door when you solved it.",
          "Listen: the door's final lock just slid open.",
          "Click the door to step through and escape.",
        ],
      },
    ],
    wrongItemLine: room.wrongItemLine,
    escapeText: room.escapeText,
    solution,
    ...(opts.relics ? { relics: opts.relics } : {}),
  };
}
