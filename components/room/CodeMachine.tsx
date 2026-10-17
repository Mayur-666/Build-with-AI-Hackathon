"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onSubmit: (code: string) => void;
  onClose: () => void;
  /** Bumps on every wrong attempt so the machine can shake. */
  wrongAttempts: number;
  feedback: string | null;
  /** The dials' current setting (saved with the adventure). */
  digits: [number, number, number];
  onDigitsChange: (digits: [number, number, number]) => void;
};

/**
 * The strange machine up close: three brass dials and a lever.
 * Mouse/touch: the arrows. Keyboard: ↑/↓ turn the focused dial, digits set it and move on,
 * ←/→ switch dials, Enter pulls the lever, Esc steps back.
 */
export function CodeMachine({ onSubmit, onClose, wrongAttempts, feedback, digits, onDigitsChange }: Props) {
  const setDigits = (f: (d: [number, number, number]) => number[]) => onDigitsChange(f(digits) as [number, number, number]);
  const [turned, setTurned] = useState<number | null>(null);
  const dialRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => dialRefs.current[0]?.focus(), []);

  const turn = (i: number, delta: number) => {
    setDigits((d) => d.map((v, j) => (j === i ? (v + delta + 10) % 10 : v)));
    setTurned(i);
  };
  const set = (i: number, value: number) => {
    setDigits((d) => d.map((v, j) => (j === i ? value : v)));
    setTurned(i);
  };
  const focusDial = (i: number) => dialRefs.current[Math.max(0, Math.min(2, i))]?.focus();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="The strange machine"
      className="absolute inset-0 z-40 grid place-items-center bg-[rgba(8,6,24,0.55)] p-3"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        key={wrongAttempts}
        onClick={(e) => e.stopPropagation()}
        className={`brass pop-in w-full max-w-sm rounded-3xl p-5 ${wrongAttempts ? "shake" : ""}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl text-sepia">The strange machine</h2>
          <button onClick={onClose} className="rounded-full px-2 text-lg text-sepia hover:bg-black/10" aria-label="Step back from the machine">
            ✕
          </button>
        </div>
        <div className="flex justify-center gap-3 rounded-2xl bg-[#2a1d3d] p-4 shadow-inner">
          {digits.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <button onClick={() => turn(i, 1)} className="text-candle/80 hover:text-candle" aria-label={`Turn dial ${i + 1} up`} tabIndex={-1}>
                ▲
              </button>
              <div
                ref={(el) => {
                  dialRefs.current[i] = el;
                }}
                tabIndex={0}
                role="spinbutton"
                aria-label={`Dial ${i + 1}`}
                aria-valuemin={0}
                aria-valuemax={9}
                aria-valuenow={d}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") (e.preventDefault(), turn(i, 1));
                  else if (e.key === "ArrowDown") (e.preventDefault(), turn(i, -1));
                  else if (e.key === "ArrowLeft") (e.preventDefault(), focusDial(i - 1));
                  else if (e.key === "ArrowRight") (e.preventDefault(), focusDial(i + 1));
                  else if (/^[0-9]$/.test(e.key)) (set(i, Number(e.key)), focusDial(i + 1));
                  else if (e.key === "Enter") (e.preventDefault(), onSubmit(digits.join("")));
                }}
                onWheel={(e) => turn(i, e.deltaY < 0 ? 1 : -1)}
                className="dial grid h-14 w-14 cursor-ns-resize place-items-center rounded-full border-2 border-[#5a3e14] bg-parchment text-3xl font-extrabold tabular-nums text-sepia shadow-[inset_0_-4px_8px_rgba(0,0,0,0.25)] outline-none focus-visible:ring-4 focus-visible:ring-gold"
              >
                <span key={`${i}-${d}-${turned === i}`} className="dial-digit">
                  {d}
                </span>
              </div>
              <button onClick={() => turn(i, -1)} className="text-candle/80 hover:text-candle" aria-label={`Turn dial ${i + 1} down`} tabIndex={-1}>
                ▼
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 min-h-[2.5rem] text-center text-sm italic text-sepia" aria-live="polite">
          {feedback ?? "Set the three dials (arrows, scroll, or type), then pull the lever."}
        </p>
        <button
          onClick={() => onSubmit(digits.join(""))}
          className="lever mt-2 w-full rounded-full bg-sepia py-2 font-bold text-candle transition hover:bg-[#5a3e24] active:translate-y-0.5"
        >
          Pull the lever
        </button>
      </div>
    </div>
  );
}
