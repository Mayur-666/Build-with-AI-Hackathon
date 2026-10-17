"use client";

import type { FallbackReason } from "@/lib/ai/errors";

export type DisturbanceReason = FallbackReason | "offline";

const COPY: Record<DisturbanceReason, { title: string; body: string; plain: string; retryHelps: boolean }> = {
  rate_limited: {
    title: "Too many dreamers at once",
    body: "So many travellers are dreaming up rooms that the storyteller has run out of breath.",
    plain: "The AI service's rate limit was reached. Waiting a few seconds before retrying usually works.",
    retryHelps: true,
  },
  unavailable: {
    title: "The storyteller's lantern flickered out",
    body: "The storyteller went quiet mid-sentence and never finished your room.",
    plain: "The AI service didn't answer in time or had a temporary error. Trying again usually works.",
    retryHelps: true,
  },
  invalid_output: {
    title: "The room wouldn't hold together",
    body: "The storyteller wrote a room whose riddles didn't point to a fair solution, so the dungeon refused to let you in.",
    plain: "The generated room failed the game's fairness checks twice. Retry, or try different objects.",
    retryHelps: true,
  },
  config: {
    title: "The storyteller can't be reached",
    body: "The dungeon's speaking-stone has gone dark.",
    plain: "The AI service isn't configured or its key was rejected. Retrying won't help until that's fixed, but the classic room is always open.",
    retryHelps: false,
  },
  offline: {
    title: "The path to the dungeon is lost",
    body: "Your lantern couldn't find the way to the dungeon at all.",
    plain: "The game server couldn't be reached. Check your connection, then retry.",
    retryHelps: true,
  },
};

type Props = {
  reason: DisturbanceReason;
  onRetry: () => void;
  onClassic: () => void;
  onChangeObjects: () => void;
};

/** A failed generation, shown as a disturbance in the dungeon's magic, with ways forward. */
export function DisturbanceScreen({ reason, onRetry, onClassic, onChangeObjects }: Props) {
  const c = COPY[reason];
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10 text-center">
      <div className="landing-sky pointer-events-none absolute inset-0" aria-hidden />
      <div className="storm" aria-hidden>
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <defs>
            <radialGradient id="stormGlow">
              <stop offset="0" stopColor="#b48cff" stopOpacity="0.7" />
              <stop offset="1" stopColor="#b48cff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="90" fill="url(#stormGlow)" className="storm-pulse" />
          <circle cx="100" cy="100" r="42" fill="#fff1c2" />
          <path d="M100 58 L92 84 L104 92 L90 120 L110 96 L98 88 L108 60 Z" fill="#2a2350" opacity="0.85" />
          <g className="storm-ring">
            {Array.from({ length: 10 }, (_, i) => (
              <circle key={i} cx={100 + 70 * Math.cos((i / 10) * Math.PI * 2)} cy={100 + 70 * Math.sin((i / 10) * Math.PI * 2)} r={i % 3 ? 2 : 3.5} fill="#ffe8a8" />
            ))}
          </g>
          <path d="M150 30 L140 60 L152 62 L136 96" stroke="#ffe8a8" strokeWidth="3" fill="none" className="storm-bolt" />
        </svg>
      </div>

      <div className="relative flex max-w-xl flex-col items-center gap-3">
        <p className="font-storybook text-lg italic text-candle/80">A disturbance in the dungeon&apos;s magic</p>
        <h1 className="text-4xl text-gold sm:text-5xl">{c.title}</h1>
        <p className="text-lg text-ink/85">{c.body}</p>
        <p className="parchment mt-2 rounded-xl px-4 py-3 text-sm" role="status">
          <span className="font-bold">What happened: </span>
          {c.plain}
        </p>
      </div>

      <div className="relative flex flex-col items-center gap-3 sm:flex-row">
        <button
          onClick={onRetry}
          className={`rounded-full px-6 py-3 font-extrabold transition hover:scale-105 ${c.retryHelps ? "brass" : "satchel text-candle"}`}
        >
          ↻ Try again
        </button>
        <button
          onClick={onClassic}
          className={`rounded-full px-6 py-3 font-extrabold transition hover:scale-105 ${c.retryHelps ? "satchel text-candle" : "brass"}`}
        >
          🏮 Enter the classic room
        </button>
      </div>
      <button onClick={onChangeObjects} className="font-storybook relative text-candle/75 underline-offset-4 hover:text-candle hover:underline">
        Choose different relics
      </button>
    </main>
  );
}
