"use client";

import type { Message } from "@/lib/engine/types";
import type { Item } from "./Inventory";

type Props = {
  message: Message | null;
  /** Items on offer from what was just inspected; each gets a "Take" button. */
  offered: Item[];
  onTake: (itemId: string) => void;
};

const TONE_ICON: Partial<Record<NonNullable<Message["tone"]>, string>> = {
  hint: "🦉",
  locked: "🔒",
  discovery: "✨",
  wrong: "💨",
  success: "🌟",
  intro: "🌙",
};

/** The parchment narration beside the scene. */
export function InspectPanel({ message, offered, onTake }: Props) {
  // Re-mount on each new message so it animates in.
  const key = message ? `${message.title}|${message.lines.join("|")}` : "empty";
  return (
    <section
      key={key}
      aria-live="polite"
      className={`parchment pop-in relative min-h-[5.5rem] min-w-0 rounded-xl px-4 py-3 sm:px-5 ${message?.tone === "wrong" ? "shake" : ""} ${
        message?.tone === "discovery" || message?.tone === "success" ? "sparkle-in" : ""
      }`}
    >
      {message ? (
        <>
          <h2 className="mb-1 text-lg text-[#6b3a14] first-letter:uppercase">
            {message.tone && TONE_ICON[message.tone] && <span aria-hidden>{TONE_ICON[message.tone]} </span>}
            {message.title}
          </h2>
          {message.lines.map((line, i) => (
            <p key={i} className="mb-1 text-[0.95rem] leading-snug">
              {line}
            </p>
          ))}
          {offered.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {offered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTake(item.id)}
                  className="brass max-w-full rounded-full px-4 py-1 text-left text-sm font-bold whitespace-normal"
                >
                  {item.emoji} Take the {item.name}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="italic opacity-70">Click something in the room to look closer…</p>
      )}
    </section>
  );
}
