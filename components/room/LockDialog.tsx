"use client";

import { useEffect, useRef, useState } from "react";
import type { LockDef } from "@/lib/engine/types";

type Props = {
  lock: LockDef;
  /** Which option each dial shows (indices into lock.dials). */
  values: number[];
  onTurn: (dial: number, delta: number) => void;
  onSet: (dial: number, index: number) => void;
  onSubmit: () => void;
  onClose: () => void;
  /** Bumps on every wrong attempt so the lock can shake. */
  wrongAttempts: number;
  feedback: string | null;
};

/**
 * Any lock up close: digits, letters, clock times, symbols. Mouse/touch: the arrows or the
 * scroll wheel. Keyboard: ↑/↓ turn the focused dial, typing a matching character sets it and
 * moves on, ←/→ switch dials, Enter tries it, Esc steps back.
 */
export function LockDialog({ lock, values, onTurn, onSet, onSubmit, onClose, wrongAttempts, feedback }: Props) {
  const dialRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [turned, setTurned] = useState<number | null>(null);
  useEffect(() => dialRefs.current[0]?.focus(), []);

  const turn = (i: number, delta: number) => {
    onTurn(i, delta);
    setTurned(i);
  };
  const focusDial = (i: number) => dialRefs.current[Math.max(0, Math.min(lock.dials.length - 1, i))]?.focus();
  const wide = lock.dials.some((d) => d.some((o) => o.length > 1));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={lock.title}
      className="absolute inset-0 z-40 grid place-items-center bg-[rgba(8,6,24,0.55)] p-3"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        key={wrongAttempts}
        onClick={(e) => e.stopPropagation()}
        className={`brass pop-in w-full max-w-sm rounded-3xl p-5 ${wrongAttempts ? "shake" : ""}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl text-sepia">{lock.title}</h2>
          <button onClick={onClose} className="rounded-full px-2 text-lg text-sepia hover:bg-black/10" aria-label="Step back">
            ✕
          </button>
        </div>
        <div className="flex justify-center gap-3 rounded-2xl bg-[#2a1d3d] p-4 shadow-inner">
          {lock.dials.map((options, i) => {
            const v = values[i] ?? 0;
            return (
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
                  aria-valuemax={options.length - 1}
                  aria-valuenow={v}
                  aria-valuetext={options[v]}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") (e.preventDefault(), turn(i, 1));
                    else if (e.key === "ArrowDown") (e.preventDefault(), turn(i, -1));
                    else if (e.key === "ArrowLeft") (e.preventDefault(), focusDial(i - 1));
                    else if (e.key === "ArrowRight") (e.preventDefault(), focusDial(i + 1));
                    else if (e.key === "Enter") (e.preventDefault(), onSubmit());
                    else if (e.key.length === 1) {
                      const idx = options.findIndex((o) => o.toLowerCase().startsWith(e.key.toLowerCase()));
                      if (idx >= 0) {
                        onSet(i, idx);
                        setTurned(i);
                        focusDial(i + 1);
                      }
                    }
                  }}
                  onWheel={(e) => turn(i, e.deltaY < 0 ? 1 : -1)}
                  className={`dial grid ${wide ? "h-14 w-16 text-2xl" : "h-14 w-14 text-3xl"} cursor-ns-resize place-items-center rounded-full border-2 border-[#5a3e14] bg-parchment font-extrabold tabular-nums text-sepia shadow-[inset_0_-4px_8px_rgba(0,0,0,0.25)] outline-none focus-visible:ring-4 focus-visible:ring-gold`}
                >
                  <span key={`${i}-${v}-${turned === i}`} className="dial-digit">
                    {options[v]}
                  </span>
                </div>
                <button onClick={() => turn(i, -1)} className="text-candle/80 hover:text-candle" aria-label={`Turn dial ${i + 1} down`} tabIndex={-1}>
                  ▼
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-3 min-h-[2.5rem] text-center text-sm italic text-sepia" aria-live="polite">
          {feedback ?? lock.prompt}
        </p>
        <button
          onClick={onSubmit}
          className="lever mt-2 w-full rounded-full bg-sepia py-2 font-bold text-candle transition hover:bg-[#5a3e24] active:translate-y-0.5"
        >
          Try it
        </button>
      </div>
    </div>
  );
}
