"use client";

type Props = { level: number; onHint: () => void };

/** A wise old owl. Each press reveals the next of three hints for the step you're on. */
export function HintButton({ level, onHint }: Props) {
  const label = level >= 3 ? "Hint (all three shown for this step)" : `Hint (${level} of 3 shown for this step)`;
  return (
    <button
      onClick={onHint}
      aria-label={label}
      title="Ask the owl for a hint"
      className="hud-tool relative grid place-items-center rounded-xl transition hover:scale-105 hover:bg-white/5"
    >
      <span aria-hidden>🦉</span>
      <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 gap-1" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-1.5 w-1.5 rounded-full border border-[#2c1a0e] ${n <= level ? "bg-gold shadow-[0_0_6px_rgba(242,193,78,0.9)]" : "bg-[#3a2416]"}`}
          />
        ))}
      </span>
    </button>
  );
}
