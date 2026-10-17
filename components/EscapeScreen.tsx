"use client";

import Link from "next/link";
import { useState } from "react";
import type { Room } from "@/lib/game/types";

export type EscapeStats = { seconds: number; wrongAttempts: number; hintsUsed: number; cluesFound: number };

type Props = {
  room: Room;
  stats: EscapeStats;
  onNewRoom: () => void;
  onSameObjects: () => void;
};

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? `${m} min ${s.toString().padStart(2, "0")} s` : `${s} s`;
}

/** Out through the door, under the open sky. */
export function EscapeScreen({ room, stats, onNewRoom, onSameObjects }: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const STATS = [
    { label: "Time in the room", value: formatTime(stats.seconds), icon: "⌛" },
    { label: "Wrong codes", value: String(stats.wrongAttempts), icon: "⚙️" },
    { label: "Owl hints", value: String(stats.hintsUsed), icon: "🦉" },
    { label: "Clues found", value: `${stats.cluesFound} of 2`, icon: "📖" },
  ];

  return (
    <main className="escape relative flex min-h-svh flex-col items-center justify-center gap-4 overflow-hidden px-4 py-6 text-center sm:gap-5">
      <div className="landing-sky pointer-events-none absolute inset-0" aria-hidden />
      <div className="escape-rays pointer-events-none absolute inset-0" aria-hidden />
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          className="escape-mote"
          style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.7) % 5}s`, animationDuration: `${6 + (i % 4)}s` }}
          aria-hidden
        />
      ))}

      <div className="escape-arch relative" aria-hidden>
        <svg viewBox="0 0 200 220" className="h-full w-full">
          <defs>
            <radialGradient id="outside" cx="0.5" cy="0.35">
              <stop offset="0" stopColor="#3a4a9a" />
              <stop offset="1" stopColor="#141a3a" />
            </radialGradient>
          </defs>
          <path d="M20 220 V90 A80 80 0 0 1 180 90 V220 Z" fill="#4d4170" />
          <path d="M34 220 V94 A66 66 0 0 1 166 94 V220 Z" fill="url(#outside)" />
          <circle cx="132" cy="70" r="16" fill="#fff1c2" className="escape-moon" />
          <circle cx="70" cy="60" r="1.6" fill="#ffe8a8" />
          <circle cx="96" cy="44" r="1.2" fill="#fff" />
          <circle cx="60" cy="110" r="1" fill="#fff" />
          <path d="M34 190 Q70 168 100 182 T166 176 V220 H34 Z" fill="#1c2a3a" />
          <path d="M92 220 Q98 200 100 186 Q102 200 108 220 Z" fill="#f2c14e" opacity="0.6" />
        </svg>
      </div>

      <div className="relative flex max-w-xl flex-col items-center gap-3">
        <p className="font-storybook text-lg italic text-candle/80">{room.title}</p>
        <h1 className="text-5xl text-gold drop-shadow-[0_0_24px_rgba(242,193,78,0.5)] sm:text-6xl">You escaped!</h1>
        <p className="text-lg leading-relaxed text-ink/90">{room.escapeText}</p>
      </div>

      <ul className="relative grid w-full max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((s) => (
          <li key={s.label} className="landing-card rounded-2xl px-3 py-3">
            <span className="block text-2xl" aria-hidden>
              {s.icon}
            </span>
            <span className="block text-lg font-extrabold text-candle">{s.value}</span>
            <span className="block text-xs text-ink/65">{s.label}</span>
          </li>
        ))}
      </ul>

      <div className="brass relative flex items-center gap-4 rounded-2xl px-5 py-3">
        <div className="text-left">
          <p className="font-storybook text-sm">Room code</p>
          <p className="font-mono text-2xl font-bold tracking-[0.2em]">{room.roomCode}</p>
        </div>
        <button onClick={copy} className="rounded-full bg-sepia px-3 py-1.5 text-sm font-bold text-candle hover:bg-[#5a3e24]">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>

      <div className="relative flex flex-col items-center gap-3 sm:flex-row">
        <button onClick={onSameObjects} className="brass rounded-full px-6 py-3 font-extrabold transition hover:scale-105">
          ↻ Same relics, new room
        </button>
        <button onClick={onNewRoom} className="satchel rounded-full px-6 py-3 font-extrabold text-candle transition hover:scale-105">
          🎲 Choose new relics
        </button>
      </div>
      <Link href="/" className="font-storybook relative text-candle/75 underline-offset-4 hover:text-candle hover:underline">
        Back to the moonlit gate
      </Link>
    </main>
  );
}
