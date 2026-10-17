"use client";

import type { JournalEntry } from "@/lib/game/types";

export function ClueJournal({ entries }: { entries: JournalEntry[] }) {
  return (
    <section className="rounded-xl border border-plum bg-dusk p-4">
      <h2 className="mb-2 text-gold">Clue journal</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-ink/60">No clues yet.</p>
      ) : (
        <ol className="flex flex-col gap-2 text-sm">
          {entries.map((e) => (
            <li key={e.id} className="text-ink/90">
              {e.text}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
