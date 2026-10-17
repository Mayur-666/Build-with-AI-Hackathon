import type { Metadata } from "next";
import Link from "next/link";
import { ArchedWindow, Door, HangingLamp, Pedestal, Shelf, SideTable } from "@/components/room/SceneArt";

export const metadata: Metadata = {
  title: "Pocket Dungeon — a tiny storybook escape room",
  description: "Name three objects. Escape the strange little room they become.",
};

const STEPS = [
  {
    icon: "🖋️",
    title: "Name three objects",
    body: "Anything at all. A rubber duck, a thundercloud, grandma's dentures. The stranger the better.",
  },
  {
    icon: "🔍",
    title: "Explore and decode",
    body: "A room is written around them. Clues never name things; they speak in riddles. Notice what each object does, and connect the dots.",
  },
  {
    icon: "🗝️",
    title: "Crack the code, escape",
    body: "Find the key, open the box, read the numbers in the right order, and set the dials on the strange machine.",
  },
];

const FIREFLIES = [
  [8, 22, 0],
  [18, 70, 3],
  [32, 40, 6],
  [46, 82, 1.5],
  [64, 18, 4.5],
  [78, 60, 2],
  [90, 34, 7.5],
];

function PlayNow({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/play"
      className={`brass inline-flex items-center gap-2 rounded-full px-8 py-3 text-lg font-extrabold tracking-wide transition hover:scale-105 hover:shadow-[0_0_30px_rgba(242,193,78,0.6)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ${className}`}
    >
      Play Now <span aria-hidden>→</span>
    </Link>
  );
}

/** A non-interactive peek into a room, built from the same art as the game. */
function RoomPeek() {
  const curios = [
    { emoji: "🦆", name: "rubber duck", left: "7%", top: "34%" },
    { emoji: "🍞", name: "toaster", left: "23%", top: "40%" },
    { emoji: "🌙", name: "tiny moon", left: "63%", top: "42%" },
  ];
  return (
    <div className="scene" aria-hidden>
      <div className="scene-layer wall" />
      <div className="scene-layer wainscot" style={{ top: "52%", bottom: "34%" }} />
      <div className="scene-layer floor" />
      <div className="scene-layer rug" />
      <div className="scene-layer" style={{ left: "5.5%", top: "7%", width: "15%", height: "40%" }}>
        <ArchedWindow />
      </div>
      <div className="scene-layer" style={{ left: "30.5%", top: 0, width: "6%", height: "32%" }}>
        <HangingLamp />
      </div>
      <div className="scene-layer" style={{ left: "4%", top: "51.5%", width: "18%", height: "5%" }}>
        <Shelf />
      </div>
      <div className="scene-layer" style={{ left: "24%", top: "56%", width: "10%", height: "22%" }}>
        <Pedestal />
      </div>
      <div className="scene-layer" style={{ left: "64%", top: "58%", width: "10%", height: "20%" }}>
        <SideTable />
      </div>
      <div className="scene-layer door-glow" style={{ left: "41.5%", top: "12.5%", width: "17%", height: "54%" }}>
        <Door />
      </div>
      {curios.map((c) => (
        <div key={c.name} className="scene-layer" style={{ left: c.left, top: c.top, width: "13%", height: "17%" }}>
          <span className="curio-glow" />
          <span className="curio-emoji absolute bottom-0 left-1/2 -translate-x-1/2">{c.emoji}</span>
        </div>
      ))}
      <div className="scene-layer lamplight" />
      {FIREFLIES.map(([x, y, d], i) => (
        <span key={i} className="firefly" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s, ${d / 2}s` }} />
      ))}
      <div className="scene-layer vignette" />
    </div>
  );
}

export default function Landing() {
  return (
    <div className="landing relative overflow-hidden">
      <div className="landing-sky pointer-events-none absolute inset-0" aria-hidden />

      <main className="relative mx-auto flex max-w-6xl flex-col gap-20 px-5 pb-16 pt-12 sm:px-8 lg:pt-20">
        {/* Hero */}
        <section className="grid items-center gap-10 lg:grid-cols-[1fr_1.15fr]">
          <div className="flex flex-col items-start gap-6">
            <p className="font-storybook text-lg italic text-candle/80">A tiny storybook escape room</p>
            <h1 className="text-6xl leading-[0.95] text-gold drop-shadow-[0_0_24px_rgba(242,193,78,0.35)] sm:text-7xl">
              Pocket
              <br />
              Dungeon
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-ink/85">
              Name any three objects. By moonlight, they become a strange little room full of riddles, and you&apos;ll have to
              think your way out.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <PlayNow />
              <a href="#how" className="font-storybook text-lg text-candle/80 underline-offset-4 hover:text-candle hover:underline">
                How it works
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="landing-moon pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full" aria-hidden />
            <RoomPeek />
            <div className="parchment absolute -bottom-8 left-4 right-4 rounded-xl px-4 py-3 text-sm sm:left-10 sm:right-auto sm:max-w-sm">
              <p className="font-storybook text-base text-[#6b3a14]">From the clue journal…</p>
              <p className="italic leading-snug">
                &ldquo;Seek the key inside the yellow swimmer that squeaks at shadows.&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-10 pt-6">
          <h2 className="mb-8 text-center text-4xl text-gold">How it works</h2>
          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="landing-card relative rounded-2xl p-6">
                <span className="font-storybook absolute right-5 top-4 text-4xl text-gold/25" aria-hidden>
                  {["I", "II", "III"][i]}
                </span>
                <span className="mb-3 block text-4xl" aria-hidden>
                  {step.icon}
                </span>
                <h3 className="mb-2 text-2xl text-candle">{step.title}</h3>
                <p className="leading-relaxed text-ink/80">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Fair by design */}
        <section className="landing-card mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-3xl px-6 py-10 text-center">
          <span className="text-4xl" aria-hidden>
            ⚖️
          </span>
          <h2 className="text-3xl text-gold">Strange, but always fair</h2>
          <p className="max-w-xl leading-relaxed text-ink/80">
            An AI storyteller writes every room around your objects, but it never decides the answer. The game picks the
            solution first, checks that every clue truly points to it, and only then lets you in. If a room doesn&apos;t
            pass, you get a hand-written classic instead.
          </p>
          <PlayNow className="mt-4" />
        </section>
      </main>

      <footer className="relative pb-8 text-center text-sm text-ink/50">
        <span className="font-storybook">Pocket Dungeon</span> · made for Devpost&apos;s Build With AI: Basics
      </footer>
    </div>
  );
}
