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
        "A brass lantern with a tiny door. Its flame flickers into the shape of the number {digit} whenever you look away and back again, and the teapot leans toward it for warmth.",
      riddle: "the one whose little flame flickers",
      signatureWord: "flickers",
    },
    b: {
      name: "sleepy teapot",
      emoji: "🫖",
      description:
        "A round teapot that snores softly through its spout, dreaming of the lantern's glow. Stamped on its belly, beneath a sugar crust, is the number {digit}.",
      riddle: "the one that snores through its spout",
      signatureWord: "snores",
    },
    c: {
      name: "moth-nibbled map",
      emoji: "🗺️",
      description:
        "A map of a kingdom that doesn't exist, kept well away from the lantern by its nervous moths. They have nibbled the number {digit} neatly into its compass rose.",
      riddle: "the one whose compass points to nowhere real",
      signatureWord: "compass",
    },
  },
  clueText:
    "Tucked away inside is a folded note in spidery handwriting: \"I hid the key where it would be safest — inside {keyHolder}.\"",
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
      "Inside, embroidered on a ribbon: \"First {first}, then {second}, and last of all {third}.\"",
  },
  exit: { lockedText: "The arched door won't budge. The clockwork machine beside it seems to be in charge." },
  wrongItemLine: "You try it, but nothing happens. That doesn't seem to be where it belongs.",
  hints: {
    findKey: [
      "Everything in this study is hiding something. Inspect each curious object closely and look for a note.",
      "The note doesn't name the hiding place; it describes it. Which object's description matches?",
      "The note means the {keyHolder}. Inspect the {keyHolder} and take what you find.",
    ],
    openBox: [
      "That key must fit something in this room.",
      "Look for something with a small silver keyhole.",
      "Select the key in your inventory, then click the velvet box to use it.",
    ],
    solveCode: [
      "The ribbon in the box gives you an order, and each object in the study carries a number.",
      "Match each riddle on the ribbon to the object whose description shows that trait, then note its number.",
      "The ribbon means the {first}, then the {second}, then the {third}. Read their numbers in that order and enter them on the machine.",
    ],
  },
  escapeText: "The machine sings a cheerful chord, the door swings wide, and warm golden light spills over you. You're free!",
};

/** A fresh classic room with a newly picked solution. */
export function buildFallbackRoom(): Room {
  return fillRoom(FALLBACK_ROOM_TEXT, createSolution());
}
