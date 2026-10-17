"use client";

import { useState } from "react";

type Props = { onSubmit: (code: string) => void; onClose: () => void };

export function CodeMachine({ onSubmit, onClose }: Props) {
  const [digits, setDigits] = useState(["", "", ""]);
  const complete = digits.every((d) => /^[0-9]$/.test(d));

  return (
    <section className="rounded-xl border border-gold bg-dusk p-4">
      <h2 className="mb-3 text-gold">Enter the code</h2>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (complete) onSubmit(digits.join(""));
        }}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            aria-label={`Digit ${i + 1}`}
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => {
              const next = [...digits];
              next[i] = e.target.value.replace(/[^0-9]/g, "").slice(-1);
              setDigits(next);
              if (next[i] && i < 2) (e.target.nextElementSibling as HTMLInputElement | null)?.focus();
            }}
            className="h-12 w-12 rounded-lg border border-plum bg-midnight text-center text-2xl text-candle focus:border-gold focus:outline-none"
          />
        ))}
        <button
          type="submit"
          disabled={!complete}
          className="ml-2 rounded-lg bg-gold px-3 py-2 font-semibold text-midnight disabled:opacity-40"
        >
          Try it
        </button>
        <button type="button" onClick={onClose} className="ml-auto text-sm text-ink/60 hover:text-ink">
          Step back
        </button>
      </form>
    </section>
  );
}
