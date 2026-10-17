"use client";

import { useEffect, useRef, useState } from "react";

/** A small "leave" door button with an in-world confirmation. */
export function LeaveRoom({ onLeave }: { onLeave: () => void }) {
  const [asking, setAsking] = useState(false);
  const stayRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (asking) stayRef.current?.focus();
  }, [asking]);

  return (
    <>
      <button
        onClick={() => setAsking(true)}
        className="font-storybook text-sm text-candle/60 underline-offset-4 hover:text-candle hover:underline"
      >
        Leave this room
      </button>
      {asking && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="leave-title"
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(8,6,24,0.7)] p-4 backdrop-blur-[2px]"
          onClick={() => setAsking(false)}
          onKeyDown={(e) => e.key === "Escape" && setAsking(false)}
        >
          <div className="parchment pop-in w-full max-w-sm rounded-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <span className="text-4xl" aria-hidden>
              🕯️
            </span>
            <h2 id="leave-title" className="mt-2 text-2xl text-[#6b3a14]">
              Step out of this room?
            </h2>
            <p className="mt-1">
              Your progress is saved in this browser. Come back any time from the moonlit gate, or with this room&apos;s code.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button ref={stayRef} onClick={() => setAsking(false)} className="brass rounded-full px-5 py-2 font-bold">
                Stay a while
              </button>
              <button onClick={onLeave} className="rounded-full bg-sepia px-5 py-2 font-bold text-candle hover:bg-[#5a3e24]">
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
