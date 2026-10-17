"use client";

import type { Message } from "@/lib/game/types";

type Props = {
  message: Message | null;
  keyOffered: boolean;
  keyName: string;
  keyEmoji: string;
  onCollect: () => void;
};

/** The parchment narration strip under the scene. */
export function InspectPanel({ message, keyOffered, keyName, keyEmoji, onCollect }: Props) {
  // Re-mount on each new message so it animates in.
  const key = message ? `${message.title}|${message.lines.join("|")}` : "empty";
  return (
    <section
      key={key}
      aria-live="polite"
      className={`parchment pop-in relative min-h-[5.5rem] min-w-0 rounded-xl px-4 py-3 sm:px-5 ${message?.tone === "wrong" ? "shake" : ""} ${
        message?.tone === "discovery" ? "sparkle-in" : ""
      }`}
    >
      {message ? (
        <>
          <h2 className="mb-1 text-lg text-[#6b3a14] first-letter:uppercase">
            {message.tone === "hint" && <span aria-hidden>🦉 </span>}
            {message.title}
          </h2>
          {message.lines.map((line, i) => (
            <p key={i} className="mb-1 text-[0.95rem] leading-snug">
              {line}
            </p>
          ))}
          {keyOffered && (
            <button onClick={onCollect} className="brass mt-2 max-w-full rounded-full px-4 py-1 text-left text-sm font-bold whitespace-normal">
              {keyEmoji} Take the {keyName}
            </button>
          )}
        </>
      ) : (
        <p className="italic opacity-70">Click something in the room to look closer…</p>
      )}
    </section>
  );
}
