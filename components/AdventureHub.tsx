"use client";

import Link from "next/link";
import type { Loaded } from "@/lib/engine/saves";
import type { AdventureDef, Difficulty } from "@/lib/engine/types";

export type RoomStatus = { latest: Loaded | null; escapes: number };

type Props = {
  catalogue: AdventureDef[];
  status: Record<string, RoomStatus>;
  customs: Loaded[];
  current: Loaded | null;
  onPlay: (def: AdventureDef) => void;
  onContinue: (saveId: string) => void;
  onRestart: (loaded: Loaded) => void;
  onCreate: () => void;
};

const DIFFICULTY: Record<Difficulty, { label: string; moons: string }> = {
  gentle: { label: "Gentle", moons: "☾" },
  tricky: { label: "Tricky", moons: "☾☾" },
  devious: { label: "Devious", moons: "☾☾☾" },
};

/** The little illustration on each room card: the room's own props, on its own backdrop. */
export function CardArt({ def }: { def: AdventureDef }) {
  const props = def.hotspots.filter((h) => h.art === "emoji").slice(0, 4);
  return (
    <div className={`card-art backdrop-${def.backdrop}`} aria-hidden>
      <div className="wall" />
      <div className="floor" />
      <div className="card-door" />
      <div className="card-props">
        {props.map((h, i) => (
          <span key={h.id} style={{ animationDelay: `${i * 0.4}s` }}>
            {h.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

function statusLine(s: RoomStatus, def: AdventureDef): string {
  if (!s.latest) return s.escapes ? `Escaped ${s.escapes}×` : "Not yet explored";
  const p = s.latest.play.progress;
  if (p.escaped) return `Escaped${s.escapes > 1 ? ` ${s.escapes}×` : ""} ✓`;
  return `In progress · ${p.journal.length} of ${Object.keys(def.clues).length} clues`;
}

/** "Choose your adventure": the ready-made catalogue, or a room dreamed up from your own relics. */
export function AdventureHub({ catalogue, status, customs, current, onPlay, onContinue, onRestart, onCreate }: Props) {
  return (
    <main className="relative mx-auto flex min-h-svh max-w-6xl flex-col gap-10 px-4 py-8 sm:px-8">
      <div className="landing-sky pointer-events-none fixed inset-0" aria-hidden />
      <header className="relative flex flex-col items-center gap-2 text-center">
        <Link href="/" className="font-storybook self-start text-candle/70 hover:text-candle">
          ← The moonlit gate
        </Link>
        <p className="font-storybook text-lg italic text-candle/80">Two ways in</p>
        <h1 className="text-5xl text-gold drop-shadow-[0_0_20px_rgba(242,193,78,0.35)] sm:text-6xl">Choose your adventure</h1>
      </header>

      {current && !current.play.progress.escaped && (
        <section className="landing-card relative flex flex-col items-center justify-between gap-3 rounded-2xl px-5 py-4 sm:flex-row">
          <div>
            <p className="font-storybook text-sm italic text-candle/75">Where you left off</p>
            <p className="text-xl text-gold">{current.def.title}</p>
            <p className="text-sm text-ink/70">
              {current.play.progress.journal.length} of {Object.keys(current.def.clues).length} clues ·{" "}
              <span className="font-mono">{current.play.saveId}</span>
            </p>
          </div>
          <button onClick={() => onContinue(current.play.saveId)} className="brass rounded-full px-6 py-2.5 font-extrabold transition hover:scale-105">
            Continue adventure →
          </button>
        </section>
      )}

      <section className="relative" aria-labelledby="explore-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="explore-title" className="text-3xl text-gold">
              Explore rooms
            </h2>
            <p className="text-ink/75">Hand-made adventures, ready the moment you step in.</p>
          </div>
        </div>
        <ul className="grid gap-5 md:grid-cols-3">
          {catalogue.map((def) => {
            const s = status[def.id] ?? { latest: null, escapes: 0 };
            const latest = s.latest;
            const inProgress = latest && !latest.play.progress.escaped;
            const d = DIFFICULTY[def.difficulty];
            return (
              <li key={def.id} className="room-card landing-card flex flex-col overflow-hidden rounded-2xl">
                <CardArt def={def} />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full border border-gold/40 px-2 py-0.5 text-xs text-candle" title={`Difficulty: ${d.label}`}>
                      <span aria-hidden>{d.moons} </span>
                      {d.label}
                    </span>
                    <span className={`text-xs ${latest?.play.progress.escaped ? "text-gold" : "text-ink/60"}`}>{statusLine(s, def)}</span>
                  </div>
                  <h3 className="text-2xl leading-tight text-candle">{def.title}</h3>
                  <p className="flex-1 text-sm leading-relaxed text-ink/75">{def.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {inProgress ? (
                      <>
                        <button onClick={() => onContinue(latest.play.saveId)} className="brass rounded-full px-4 py-2 font-bold">
                          Continue
                        </button>
                        <button onClick={() => onRestart(latest)} className="satchel rounded-full px-4 py-2 font-bold text-candle">
                          Restart
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => onPlay(def)} className="brass rounded-full px-4 py-2 font-bold">
                          {latest ? "Play again" : "Enter"}
                        </button>
                        {latest && (
                          <button onClick={() => onContinue(latest.play.saveId)} className="satchel rounded-full px-4 py-2 font-bold text-candle">
                            See ending
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="landing-card relative grid items-center gap-5 rounded-3xl p-6 md:grid-cols-[1fr_auto]" aria-labelledby="create-title">
        <div>
          <h2 id="create-title" className="text-3xl text-gold">
            Create your own
          </h2>
          <p className="mt-1 max-w-xl text-ink/80">
            Name any three everyday objects and an AI storyteller writes a brand-new room around them. The game picks the
            solution first and checks every riddle, so it&apos;s always fair. Takes about fifteen seconds.
          </p>
          {customs.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {customs.map((c) => (
                <li key={c.play.saveId} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-candle">{c.def.title}</span>
                  <span className="text-ink/55">
                    {c.play.progress.escaped ? "Escaped ✓" : `${c.play.progress.journal.length} of ${Object.keys(c.def.clues).length} clues`} ·{" "}
                    <span className="font-mono">{c.play.saveId}</span>
                  </span>
                  <button onClick={() => onContinue(c.play.saveId)} className="text-gold underline-offset-4 hover:underline">
                    {c.play.progress.escaped ? "See ending" : "Continue"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button onClick={onCreate} className="brass justify-self-start rounded-full px-7 py-3 text-lg font-extrabold transition hover:scale-105 md:justify-self-end">
          ✨ Choose three relics
        </button>
      </section>
    </main>
  );
}
