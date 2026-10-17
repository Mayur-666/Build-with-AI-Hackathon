"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { catalogueRoom } from "@/lib/catalogue";
import { browserStorage, findByCode, loadCurrent, normalizeCode, type Loaded } from "@/lib/engine/saves";

export function progressLine({ play, def }: Loaded): string {
  const p = play.progress;
  if (p.escaped) {
    const secs = play.stats?.seconds ?? Math.round((play.savedAt - play.createdAt) / 1000);
    return `Escaped in ${secs >= 60 ? `${Math.floor(secs / 60)} min ${secs % 60} s` : `${secs} s`}`;
  }
  const bits = [`${p.journal.length} of ${Object.keys(def.clues).length} clues`];
  if (p.inventory.length) bits.push(`${p.inventory.map((i) => def.items[i]?.name).join(", ")} in your satchel`);
  if (p.hintsUsed) bits.push(`${p.hintsUsed} owl ${p.hintsUsed === 1 ? "hint" : "hints"}`);
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
  const [saved, setSaved] = useState<Loaded | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => setSaved(loadCurrent(browserStorage(), catalogueRoom)), []);

  const openCode = (e: React.FormEvent) => {
    e.preventDefault();
    const wanted = normalizeCode(code);
    if (!wanted) return;
    const found = findByCode(browserStorage(), catalogueRoom, wanted);
    if (!found) {
      setCodeError(`Nothing called ${wanted} is saved in this browser. Codes only work where the room was played.`);
      return;
    }
    router.push(`/play?save=${encodeURIComponent(found.play.saveId)}`);
  };

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      {saved ? (
        <div className="landing-card pop-in w-full rounded-2xl p-4">
          <p className="font-storybook text-sm italic text-candle/75">{saved.play.progress.escaped ? "Your last adventure" : "Your adventure awaits"}</p>
          <p className="mt-0.5 text-xl text-gold">
            {saved.play.progress.escaped && <span aria-hidden>🌟 </span>}
            {saved.def.title}
          </p>
          <p className="text-sm text-ink/75">
            {progressLine(saved)} · <span className="font-mono tracking-wider">{saved.play.saveId}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {saved.play.progress.escaped ? (
              <>
                <Link href="/play?new" className={primary}>
                  New Adventure →
                </Link>
                <Link href={`/play?save=${encodeURIComponent(saved.play.saveId)}`} className={secondary}>
                  See your ending
                </Link>
              </>
            ) : (
              <>
                <Link href={`/play?save=${encodeURIComponent(saved.play.saveId)}`} className={primary}>
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
          Have a save or room code?
        </label>
        <input
          id="room-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setCodeError(null);
          }}
          placeholder="e.g. PD-K7QX3M"
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
