"use client";

import { useEffect, useRef, useState } from "react";
export type JournalEntry = { id: string; text: string };

/** A little book button; opens to a parchment page of clues found so far. */
export function ClueJournal({ entries }: { entries: JournalEntry[] }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const fresh = entries.length > seen;
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setSeen(entries.length);
      closeRef.current?.focus();
    }
  }, [open, entries.length]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Clue journal (${entries.length} ${entries.length === 1 ? "clue" : "clues"})`}
        className={`hud-tool relative grid place-items-center rounded-xl transition hover:scale-105 hover:bg-white/5 ${
          fresh ? "sparkle-in" : ""
        }`}
      >
        <span aria-hidden>📖</span>
        {fresh && (
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-gold text-xs font-bold text-sepia">
            !
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Clue journal"
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(8,6,24,0.7)] p-4 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <div className="parchment pop-in w-full max-w-lg rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl text-[#6b3a14]">Clue Journal</h2>
              <button ref={closeRef} onClick={() => setOpen(false)} className="rounded-full px-2 text-xl hover:bg-black/10" aria-label="Close journal">
                ✕
              </button>
            </div>
            {entries.length === 0 ? (
              <p className="italic opacity-70">The pages are blank. Clues you find will be copied here.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {entries.map((e, i) => (
                  <li key={e.id} className="border-l-2 border-[#b8955a] pl-3 leading-snug">
                    <span className="font-storybook mr-2 text-[#6b3a14]">{["I.", "II.", "III."][i] ?? "•"}</span>
                    {e.text}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
}
