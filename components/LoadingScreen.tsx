"use client";

import { useEffect, useState } from "react";

const LINES = (objects: string[]) => [
  "Sweeping the cobwebs from the corners…",
  `Persuading ${objects[0]} to cooperate…`,
  "Hiding a key where no one would think to look…",
  `Explaining to ${objects[1]} why it's here…`,
  "Teaching the strange machine to count…",
  `Polishing ${objects[2]} until it glows…`,
  "Checking that every riddle has an answer…",
  "Lighting the lantern…",
];

/** A swirling portal while the dungeon dreams up the room. */
export function LoadingScreen({ objects }: { objects: [string, string, string] }) {
  const lines = LINES(objects);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % lines.length), 2400);
    return () => clearInterval(t);
  }, [lines.length]);

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden px-4 text-center">
      <div className="landing-sky pointer-events-none absolute inset-0" aria-hidden />
      <div className="portal" aria-hidden>
        <div className="portal-swirl" />
        <div className="portal-core" />
        {objects.map((o, n) => (
          <span key={n} className="portal-orbit" style={{ animationDelay: `${(-n * 6) / 3}s` }}>
            <span className="portal-tag" style={{ animationDelay: `${(-n * 6) / 3}s` }}>
              {o}
            </span>
          </span>
        ))}
      </div>
      <div className="relative">
        <h1 className="text-3xl text-gold sm:text-4xl">The dungeon is dreaming…</h1>
        <p key={i} role="status" aria-live="polite" className="font-storybook pop-in mt-3 min-h-[1.75rem] text-lg italic text-candle/90">
          {lines[i]}
        </p>
        <p className="mt-2 text-sm text-ink/55">Rooms usually take ten to fifteen seconds to write.</p>
      </div>
    </main>
  );
}
