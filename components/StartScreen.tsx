"use client";

import Link from "next/link";
import { useState } from "react";
import { Pedestal } from "@/components/room/SceneArt";

export const MAX_OBJECT_LENGTH = 40;

type Trio = [string, string, string];
type Props = { onGenerate: (objects: Trio) => void; initial?: Trio; notice?: string | null };

const RELICS = ["First relic", "Second relic", "Third relic"];
const PLACEHOLDERS: Trio = ["a rubber duck", "a toaster", "a tiny moon"];

/** Odd little things for the "surprise me" roll. */
const SURPRISES = [
  "a rubber duck", "a toaster", "a tiny moon", "a snow globe", "a kazoo", "a sleepy dragon", "grandma's dentures",
  "a thundercloud", "a library card", "a cactus", "an accordion", "a jar of fireflies", "a teacup octopus",
  "a broken compass", "a sock puppet", "a lighthouse", "a pocket watch", "a garden gnome", "a paper crane",
  "a lava lamp", "a squeaky shoe", "a bottled storm", "a cuckoo clock", "a pirate's parrot",
];

function roll(): Trio {
  const pool = [...SURPRISES];
  const pick = () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
  return [pick(), pick(), pick()];
}

/** "Prepare your adventure": place three relics on their pedestals, then enter. */
export function StartScreen({ onGenerate, initial, notice }: Props) {
  const [objects, setObjects] = useState<Trio>(initial ?? ["", "", ""]);
  const [rolling, setRolling] = useState(false);
  const filled = objects.filter((o) => o.trim()).length;
  const ready = filled === 3;

  const setAt = (i: number, value: string) => {
    const next = [...objects] as Trio;
    next[i] = value;
    setObjects(next);
  };

  const surprise = () => {
    setRolling(true);
    setObjects(roll());
    setTimeout(() => setRolling(false), 500);
  };

  return (
    <main className="setup relative mx-auto flex min-h-svh max-w-4xl flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="landing-sky pointer-events-none fixed inset-0" aria-hidden />
      <Link href="/" className="font-storybook relative self-start text-candle/70 hover:text-candle sm:self-center">
        ← Back to the moonlit gate
      </Link>

      {notice && (
        <p role="status" className="parchment relative rounded-xl px-4 py-2 text-sm">
          🕯️ {notice}
        </p>
      )}
      <header className="relative text-center">
        <p className="font-storybook text-lg italic text-candle/80">Prepare your adventure</p>
        <h1 className="text-5xl text-gold drop-shadow-[0_0_20px_rgba(242,193,78,0.35)] sm:text-6xl">Choose three relics</h1>
        <p className="mx-auto mt-3 max-w-md text-ink/80">
          Name any three things, real or ridiculous. The dungeon will dream up a room where they belong together.
        </p>
      </header>

      <form
        className="relative flex w-full flex-col items-center gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) onGenerate(objects.map((o) => o.trim()) as Trio);
        }}
      >
        <ol className="grid w-full gap-6 sm:grid-cols-3">
          {objects.map((value, i) => {
            const has = value.trim().length > 0;
            return (
              <li key={i} className="flex flex-col items-center gap-3">
                <div className="relative h-36 w-28" aria-hidden>
                  <span className={`relic-orb ${has ? "lit" : ""} ${rolling ? "rolling" : ""}`}>{has ? "✨" : "?"}</span>
                  <div className="absolute bottom-0 h-20 w-full">
                    <Pedestal />
                  </div>
                </div>
                <label className="parchment flex w-full max-w-[16rem] flex-col gap-1 rounded-xl px-3 py-2">
                  <span className="font-storybook text-sm text-[#6b3a14]">{RELICS[i]}</span>
                  <input
                    placeholder={PLACEHOLDERS[i]}
                    maxLength={MAX_OBJECT_LENGTH}
                    value={value}
                    onChange={(e) => setAt(i, e.target.value)}
                    className="w-full border-b border-dashed border-[#b8955a] bg-transparent pb-1 text-base text-sepia placeholder:text-sepia/40 focus:border-[#6b3a14] focus:outline-none"
                  />
                </label>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={surprise}
            className="satchel rounded-full px-5 py-2.5 font-bold text-candle transition hover:scale-105"
          >
            <span aria-hidden>🎲 </span>Surprise me
          </button>
          <button
            type="submit"
            disabled={!ready}
            className="brass rounded-full px-8 py-3 text-lg font-extrabold transition enabled:hover:scale-105 enabled:hover:shadow-[0_0_30px_rgba(242,193,78,0.6)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Enter the dungeon →
          </button>
        </div>
        <p className="font-storybook -mt-3 text-sm text-candle/70" aria-live="polite">
          {ready ? "The relics are ready." : `${filled} of 3 relics chosen`}
        </p>
      </form>
    </main>
  );
}
