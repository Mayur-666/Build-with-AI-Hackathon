"use client";

import { useState } from "react";

export const MAX_OBJECT_LENGTH = 40;

type Props = { onGenerate: (objects: [string, string, string]) => void };

export function StartScreen({ onGenerate }: Props) {
  const [objects, setObjects] = useState<[string, string, string]>(["", "", ""]);
  const ready = objects.every((o) => o.trim().length > 0);

  const setAt = (i: number, value: string) => {
    const next = [...objects] as [string, string, string];
    next[i] = value;
    setObjects(next);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4">
      <h1 className="text-center text-4xl text-gold">Pocket Dungeon</h1>
      <p className="text-center text-ink/80">Name three objects. We&apos;ll build a strange little room around them.</p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) onGenerate(objects.map((o) => o.trim()) as [string, string, string]);
        }}
      >
        {objects.map((value, i) => (
          <input
            key={i}
            aria-label={`Object ${i + 1}`}
            placeholder={["a rubber duck", "a toaster", "a tiny moon"][i]}
            maxLength={MAX_OBJECT_LENGTH}
            value={value}
            onChange={(e) => setAt(i, e.target.value)}
            className="rounded-lg border border-plum bg-dusk px-4 py-3 text-ink placeholder:text-ink/40 focus:border-gold focus:outline-none"
          />
        ))}
        <button
          type="submit"
          disabled={!ready}
          className="mt-2 rounded-lg bg-gold px-4 py-3 font-semibold text-midnight disabled:cursor-not-allowed disabled:opacity-40"
        >
          Build my room
        </button>
      </form>
    </main>
  );
}
