"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserStorage, loadByCode, loadCurrent, normalizeRoomCode, type SavedAdventure } from "@/lib/game/save";

function progressLine(s: SavedAdventure): string {
  const g = s.game;
  if (g.escaped) {
    const secs = s.stats?.seconds ?? Math.round((s.savedAt - s.createdAt) / 1000);
    return `Escaped in ${secs >= 60 ? `${Math.floor(secs / 60)} min ${secs % 60} s` : `${secs} s`}`;
  }
  const bits = [`${g.journal.length} of 2 clues`];
  if (g.boxOpen) bits.push("box opened");
  else if (g.keyCollected) bits.push(`${g.room.keyItem.name} in your satchel`);
  if (g.hintsUsed) bits.push(`${g.hintsUsed} owl ${g.hintsUsed === 1 ? "hint" : "hints"}`);
  return bits.join(" · ");
}

const primary =
  "brass inline-flex items-center gap-2 rounded-full px-7 py-3 text-lg font-extrabold transition hover:scale-105 hover:shadow-[0_0_30px_rgba(242,193,78,0.6)]";
const secondary = "satchel inline-flex items-center gap-2 rounded-full px-6 py-3 font-extrabold text-candle transition hover:scale-105";

/**
 * The landing page's call to action. Server render: a plain Play Now. After mount, if this browser
 * has a saved adventure: Continue / New Adventure, with progress or the escaped status.
 */
export function AdventureActions() {
  const router = useRouter();
  const [saved, setSaved] = useState<SavedAdventure | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => setSaved(loadCurrent(browserStorage())), []);

  const openCode = (e: React.FormEvent) => {
    e.preventDefault();
    const wanted = normalizeRoomCode(code);
    if (!wanted) return;
    const found = loadByCode(browserStorage(), wanted);
    if (!found) {
      setCodeError(`No room ${wanted} is saved in this browser. Room codes only work where the room was played.`);
      return;
    }
    router.push(`/play?room=${encodeURIComponent(found.roomCode)}`);
  };

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      {saved ? (
        <div className="landing-card pop-in w-full rounded-2xl p-4">
          <p className="font-storybook text-sm italic text-candle/75">{saved.game.escaped ? "Your last adventure" : "Your adventure awaits"}</p>
          <p className="mt-0.5 text-xl text-gold">
            {saved.game.escaped && <span aria-hidden>🌟 </span>}
            {saved.game.room.title}
          </p>
          <p className="text-sm text-ink/75">
            {progressLine(saved)} · <span className="font-mono tracking-wider">{saved.roomCode}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {saved.game.escaped ? (
              <>
                <Link href="/play?new" className={primary}>
                  New Adventure →
                </Link>
                <Link href={`/play?room=${encodeURIComponent(saved.roomCode)}`} className={secondary}>
                  See your ending
                </Link>
              </>
            ) : (
              <>
                <Link href={`/play?room=${encodeURIComponent(saved.roomCode)}`} className={primary}>
                  Continue Adventure →
                </Link>
                <Link href="/play?new" className={secondary}>
                  New Adventure
                </Link>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-5">
          <Link href="/play?new" className={primary}>
            Play Now <span aria-hidden>→</span>
          </Link>
          <a href="#how" className="font-storybook text-lg text-candle/80 underline-offset-4 hover:text-candle hover:underline">
            How it works
          </a>
        </div>
      )}

      <form onSubmit={openCode} className="flex w-full flex-wrap items-center gap-2 text-sm">
        <label htmlFor="room-code" className="font-storybook text-candle/75">
          Have a room code?
        </label>
        <input
          id="room-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setCodeError(null);
          }}
          placeholder="e.g. TOASTE-7QX3"
          maxLength={24}
          className="w-36 rounded-full border border-plum bg-dusk/70 px-3 py-1.5 font-mono uppercase tracking-wider text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-ink/35 focus:border-gold focus:outline-none"
        />
        <button type="submit" className="rounded-full border border-gold/50 px-3 py-1.5 text-candle hover:bg-gold/10">
          Open room
        </button>
        {codeError && (
          <p role="alert" className="w-full text-candle/90">
            {codeError}
          </p>
        )}
      </form>
    </div>
  );
}
