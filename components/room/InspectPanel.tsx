"use client";

import type { Message } from "@/lib/game/types";

type Props = {
  message: Message | null;
  keyOffered: boolean;
  keyName: string;
  onCollect: () => void;
};

export function InspectPanel({ message, keyOffered, keyName, onCollect }: Props) {
  return (
    <section aria-live="polite" className="min-h-28 rounded-xl border border-plum bg-dusk p-4">
      {message ? (
        <>
          <h2 className={`mb-2 capitalize ${message.tone === "wrong" ? "text-candle" : "text-gold"}`}>{message.title}</h2>
          {message.lines.map((line, i) => (
            <p key={i} className="mb-2 text-ink/90">
              {line}
            </p>
          ))}
          {keyOffered && (
            <button onClick={onCollect} className="mt-1 rounded-lg bg-gold px-3 py-1 font-semibold text-midnight">
              Take the {keyName}
            </button>
          )}
        </>
      ) : (
        <p className="text-ink/60">Click something in the room to inspect it.</p>
      )}
    </section>
  );
}
