import { fillRoom } from "./fill";
import { createSolution } from "./solution";
import type { Room, RoomText } from "./types";

/**
 * The handwritten "classic room". Same placeholder format as Gemini's output,
 * so it runs through the same engine. Written to work whichever object the
 * engine picks as clue-holder or key-holder.
 */
export const FALLBACK_ROOM_TEXT: RoomText = {
  title: "The Lantern-Keeper's Study",
  theme: "A forgotten study where the furniture dozes and the lamplight remembers everything.",
  intro:
    "You wake in a dusty, lamplit study that smells of old tea and candle smoke. A brass lantern, a sleepy teapot, and a moth-nibbled map watch you from their pedestals. The arched door is locked tight, and beside it a strange clockwork machine ticks impatiently, waiting for a code.",
  objects: {
    a: {
      name: "brass lantern",
      emoji: "🏮",
      description:
        "A brass lantern with a tiny door. Its flame flickers into the shape of the number {digit} whenever you look away and back again.",
    },
    b: {
      name: "sleepy teapot",
      emoji: "🫖",
      description:
        "A round teapot that snores softly through its spout. Stamped on its belly, beneath a sugar crust, is the number {digit}.",
    },
    c: {
      name: "moth-nibbled map",
      emoji: "🗺️",
      description:
        "A map of a kingdom that doesn't exist. The moths have nibbled the number {digit} neatly into its compass rose.",
    },
  },
  clueText:
    "Tucked away inside is a folded note in spidery handwriting: \"I hid the key where it would be safest — inside the {keyHolder}.\"",
  keyItem: { name: "tiny silver key", emoji: "🗝️" },
  keyFoundText: "Something small glints inside. It's a tiny silver key, warm as if someone just put it down.",
  machine: {
    description:
      "A clockwork machine of brass gears and blinking glass bulbs. Three dials sit beneath a sign: \"SPEAK THE NUMBERS IN THEIR PROPER ORDER.\"",
    wrongCodeLines: [
      "The machine hiccups and puffs out a cloud of glitter. Not quite.",
      "Bzzrt! A tiny bell rings, rather sadly. Try another combination.",
      "The gears grind, consider your offer, and politely refuse.",
    ],
  },
  box: {
    lockedText: "A small velvet box with a silver keyhole. It rattles when you shake it.",
    openText: "The silver key turns with a click and the lid creaks open.",
    orderClue:
      "Inside, embroidered on a ribbon: \"First the {first}, then the {second}, and last of all the {third}.\"",
  },
  exit: { lockedText: "The arched door won't budge. The clockwork machine beside it seems to be in charge." },
  wrongItemLine: "You try it, but nothing happens. That doesn't seem to be where it belongs.",
  hints: {
    findKey: [
      "Everything in this study is hiding something. Inspect each curious object closely.",
      "One object holds a note. Have you looked carefully at the {clueHolder}?",
      "The note says the key is inside the {keyHolder}. Inspect the {keyHolder} and take what you find.",
    ],
    openBox: [
      "That key must fit something in this room.",
      "Look for something with a small silver keyhole.",
      "Select the key in your inventory, then click the velvet box to use it.",
    ],
    solveCode: [
      "The ribbon in the box gives you an order. Each object in the study also carries a number.",
      "Look again at the {first}, the {second}, and the {third}. Each one shows a single digit.",
      "Read the digit on the {first}, then the {second}, then the {third}, and enter them on the machine in that order.",
    ],
  },
  escapeText: "The machine sings a cheerful chord, the door swings wide, and warm golden light spills over you. You're free!",
};

/** A fresh classic room with a newly picked solution. */
export function buildFallbackRoom(): Room {
  return fillRoom(FALLBACK_ROOM_TEXT, createSolution());
}
