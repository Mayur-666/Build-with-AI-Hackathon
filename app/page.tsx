import type { Metadata } from "next";
import Link from "next/link";
import { AdventureActions } from "@/components/AdventureActions";
import { CardArt } from "@/components/AdventureHub";
import { ArchedWindow, Door, HangingLamp, Pedestal, Shelf, SideTable } from "@/components/room/SceneArt";
import { CATALOGUE } from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "Pocket Dungeon — a tiny storybook escape room",
  description: "Hand-made riddle rooms, or a room dreamed up from any three objects. Find the clues, open the door, escape.",
};

const DIFFICULTY = { gentle: "☾ Gentle", tricky: "☾☾ Tricky", devious: "☾☾☾ Devious" } as const;

const TEASERS: Record<string, string> = {
  "midnight-library": "Some words only appear by lamplight.",
  "clockmakers-last-hour": "Every clock stopped at the same moment. Which one?",
  "sleeping-greenhouse": "A hundred years asleep, and one of them bites.",
};

const FEATURES = [
  { icon: "🔍", title: "Inspect everything", body: "Every object has something to say, and some only speak once you've changed something else." },
  { icon: "🗝️", title: "Drag and use", body: "Pick items up from your satchel and drag them onto the room. Or tap one, then tap where it goes." },
  { icon: "📜", title: "Riddles, not instructions", body: "Clues describe things by what they do. Notice, connect, and the answer is always there to find." },
  { icon: "🦉", title: "A patient owl", body: "Stuck? Three hints for every step, from a gentle nudge to a clear way forward, never the answer itself." },
  { icon: "💾", title: "Saves itself", body: "Close the tab mid-puzzle and come back later. Every playthrough keeps its own save code in this browser." },
  { icon: "🎵", title: "Moonlit sound", body: "Soft chimes, clicks, and a music-box lullaby, all off until you turn them on." },
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

function Cta({ href = "/play", children, className = "" }: { href?: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`brass inline-flex items-center gap-2 rounded-full px-8 py-3 text-lg font-extrabold tracking-wide transition hover:scale-105 hover:shadow-[0_0_30px_rgba(242,193,78,0.6)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ${className}`}
    >
      {children}
    </Link>
  );
}

/** The night outside: drifting clouds, a shooting star, and a crooked castle skyline with lit windows. */
function NightSky() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="landing-sky absolute inset-0" />
      <div className="hero-moon" />
      <div className="hero-cloud" style={{ top: "14%", animationDuration: "70s" }} />
      <div className="hero-cloud small" style={{ top: "30%", animationDuration: "95s", animationDelay: "-40s" }} />
      <span className="shooting-star" />
      <span className="shooting-star late" />
      <svg className="hero-skyline" viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice">
        <path d="M0 260 V190 Q180 150 360 178 T720 170 T1080 160 T1440 176 V260 Z" fill="#1a1636" />
        {/* the crooked tower */}
        <path d="M1040 260 V120 L1028 112 L1060 52 L1092 112 L1080 120 V260 Z" fill="#141029" />
        <path d="M1150 260 V150 L1140 144 L1170 96 L1200 144 L1190 150 V260 Z" fill="#161230" />
        <path d="M980 260 V170 H1240 V260 Z" fill="#141029" />
        <path d="M980 170 v-12 h20 v12 h20 v-12 h20 v12 h20 v-12 h20 v12 h20 v-12 h20 v12 h20 v-12 h20 v12 h20 v-12 h20 v12 h20 v-12 h20 v12" fill="#141029" />
        <rect x="1054" y="132" width="10" height="16" rx="5" fill="#f2c14e" className="window-glow" />
        <rect x="1165" y="168" width="9" height="14" rx="4.5" fill="#f2c14e" className="window-glow late" />
        <rect x="1012" y="196" width="9" height="14" rx="4.5" fill="#f2c14e" className="window-glow" />
        <path d="M0 260 V222 Q240 196 520 214 T1000 206 T1440 216 V260 Z" fill="#100d22" />
      </svg>
    </div>
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
        <Door unlocked />
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

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col items-center gap-2 text-center">
      <p className="font-storybook text-lg italic text-candle/75">{eyebrow}</p>
      <h2 className="text-4xl text-gold drop-shadow-[0_0_18px_rgba(242,193,78,0.25)] sm:text-5xl">{title}</h2>
      {children && <p className="max-w-2xl text-ink/75">{children}</p>}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="landing relative overflow-hidden">
      {/* ── Hero ── */}
      <header className="hero relative">
        <NightSky />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-40 pt-14 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:pb-48 lg:pt-20">
          <div className="flex flex-col items-start gap-6">
            <p className="font-storybook text-lg italic text-candle/80">A tiny storybook escape room</p>
            <h1 className="hero-title text-6xl leading-[0.92] text-gold sm:text-8xl">
              Pocket
              <br />
              Dungeon
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-ink/85">
              Slip into hand-made rooms full of riddles, or name any three objects and let the moon dream up a room just for
              you. Find the clues, release the last lock, and open the door.
            </p>
            <AdventureActions />
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-candle/70">
              <li>✦ 3 hand-made rooms</li>
              <li>✦ Endless custom rooms</li>
              <li>✦ Always solvable</li>
            </ul>
          </div>

          <div className="relative">
            <div className="hero-peek">
              <RoomPeek />
            </div>
            <div className="parchment hero-note absolute -bottom-10 left-4 right-4 rounded-xl px-4 py-3 text-sm sm:left-10 sm:right-auto sm:max-w-sm">
              <p className="font-storybook text-base text-[#6b3a14]">From the clue journal…</p>
              <p className="italic leading-snug">&ldquo;Seek the key inside the yellow swimmer that squeaks at shadows.&rdquo;</p>
            </div>
            <span className="hero-key" aria-hidden>
              🗝️
            </span>
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex max-w-6xl flex-col gap-28 px-5 pb-20 sm:px-8">
        {/* ── The catalogue ── */}
        <section id="rooms" className="scroll-mt-10">
          <SectionTitle eyebrow="Ready the moment you step in" title="Three rooms are waiting">
            Each one hand-made, each with its own kind of puzzle. No waiting for the storyteller.
          </SectionTitle>
          <ul className="grid gap-6 md:grid-cols-3">
            {CATALOGUE.map((def) => (
              <li key={def.id} className="room-card landing-card flex flex-col overflow-hidden rounded-2xl">
                <CardArt def={def} />
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <span className="self-start rounded-full border border-gold/40 px-2 py-0.5 text-xs text-candle">{DIFFICULTY[def.difficulty]}</span>
                  <h3 className="text-2xl leading-tight text-candle">{def.title}</h3>
                  <p className="font-storybook italic text-candle/75">{TEASERS[def.id] ?? def.theme}</p>
                  <p className="flex-1 text-sm leading-relaxed text-ink/70">{def.description}</p>
                  <Link href={`/play?room=${def.id}`} className="mt-2 self-start font-bold text-gold underline-offset-4 hover:underline">
                    Step inside →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Create your own ── */}
        <section className="landing-card relative overflow-hidden rounded-3xl p-6 sm:p-10">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="flex flex-col items-center gap-6" aria-hidden>
              <div className="flex items-center gap-3 sm:gap-4">
                {["🦆", "🍞", "🌙"].map((e, i) => (
                  <span key={e} className="landing-relic" style={{ animationDelay: `${i * 0.5}s` }}>
                    {e}
                  </span>
                ))}
              </div>
              <span className="text-3xl text-gold/70">⇣</span>
              <div className="parchment w-full max-w-sm rounded-xl px-5 py-4 text-left">
                <p className="font-storybook text-lg text-[#6b3a14]">The Orbiting Kitchenette</p>
                <p className="mt-1 text-sm italic leading-snug">
                  &ldquo;Follow the hush of the room: heed the yellow swimmer that squeaks at shadows, then the silver crumb-box that
                  clicks without toast, and finish at the silver orb that glows upon a thread.&rdquo;
                </p>
              </div>
            </div>
            <div>
              <p className="font-storybook text-lg italic text-candle/75">Or bring your own relics</p>
              <h2 className="mt-1 text-4xl text-gold sm:text-5xl">A room nobody has seen before</h2>
              <p className="mt-4 leading-relaxed text-ink/80">
                Name any three everyday objects. An AI storyteller weaves them into one strange little room, where they react
                to each other, hide things for each other, and speak only in riddles.
              </p>
              <ul className="mt-5 flex flex-col gap-3 text-ink/85">
                <li className="flex gap-3">
                  <span className="text-gold">①</span> The game picks the answer first, and the storyteller never sees it.
                </li>
                <li className="flex gap-3">
                  <span className="text-gold">②</span> Riddles are written around the answer, then checked one by one.
                </li>
                <li className="flex gap-3">
                  <span className="text-gold">③</span> The finished room is proven solvable before you step in.
                </li>
              </ul>
              <Cta href="/play?create" className="mt-7">
                ✨ Choose three relics
              </Cta>
            </div>
          </div>
        </section>

        {/* ── How it plays ── */}
        <section id="how" className="scroll-mt-10">
          <SectionTitle eyebrow="Strange, but always fair" title="How it plays" />
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="landing-card feature-card rounded-2xl p-6">
                <span className="feature-icon" aria-hidden>
                  {f.icon}
                </span>
                <h3 className="mt-3 text-2xl text-candle">{f.title}</h3>
                <p className="mt-1 leading-relaxed text-ink/75">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Closing ── */}
        <section className="final-cta relative flex flex-col items-center gap-6 overflow-hidden rounded-3xl px-6 py-14 text-center">
          <div className="final-door" aria-hidden>
            <Door open />
          </div>
          <h2 className="text-4xl text-gold sm:text-5xl">The door is waiting</h2>
          <p className="max-w-md text-ink/80">Somewhere behind it, a lamp has just gone out. Bring a little curiosity.</p>
          <Cta>Choose your adventure →</Cta>
        </section>
      </main>

      <footer className="relative pb-8 text-center text-sm text-ink/50">
        <span className="font-storybook">Pocket Dungeon</span> · made for Devpost&apos;s Build With AI: Basics · MIT licensed
      </footer>
    </div>
  );
}
