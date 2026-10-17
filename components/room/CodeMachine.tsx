"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onSubmit: (code: string) => void;
  onClose: () => void;
  /** Bumps on every wrong attempt so the machine can shake. */
  wrongAttempts: number;
  feedback: string | null;
};

/** The strange machine up close: three brass dials and a lever. */
export function CodeMachine({ onSubmit, onClose, wrongAttempts, feedback }: Props) {
  const [digits, setDigits] = useState([0, 0, 0]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => panelRef.current?.focus(), []);

  const turn = (i: number, delta: number) =>
    setDigits((d) => d.map((v, j) => (j === i ? (v + delta + 10) % 10 : v)));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="The strange machine"
      className="absolute inset-0 z-40 grid place-items-center bg-[rgba(8,6,24,0.55)] p-3"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        key={wrongAttempts}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Enter") onSubmit(digits.join(""));
        }}
        className={`brass pop-in w-full max-w-sm rounded-3xl p-5 outline-none ${wrongAttempts ? "shake" : ""}`}
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
              <button onClick={() => turn(i, 1)} className="text-candle/80 hover:text-candle" aria-label={`Turn dial ${i + 1} up`}>
                ▲
              </button>
              <div
                aria-live="polite"
                aria-label={`Dial ${i + 1}: ${d}`}
                className="grid h-14 w-14 place-items-center rounded-full border-2 border-[#5a3e14] bg-parchment text-3xl font-extrabold tabular-nums text-sepia shadow-[inset_0_-4px_8px_rgba(0,0,0,0.25)]"
              >
                {d}
              </div>
              <button onClick={() => turn(i, -1)} className="text-candle/80 hover:text-candle" aria-label={`Turn dial ${i + 1} down`}>
                ▼
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 min-h-[2.5rem] text-center text-sm italic text-sepia" aria-live="polite">
          {feedback ?? "Set the three dials, then pull the lever."}
        </p>
        <button
          onClick={() => onSubmit(digits.join(""))}
          className="mt-2 w-full rounded-full bg-sepia py-2 font-bold text-candle transition hover:bg-[#5a3e24]"
        >
          Pull the lever
        </button>
      </div>
    </div>
  );
}
