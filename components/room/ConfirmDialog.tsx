"use client";

import { useEffect, useRef } from "react";

type Props = {
  icon: string;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** An in-world parchment confirmation. Focus starts on the safe choice; Esc cancels. */
export function ConfirmDialog({ icon, title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  const safeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => safeRef.current?.focus(), []);
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(8,6,24,0.7)] p-4 backdrop-blur-[2px]"
      onClick={onCancel}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <div className="parchment pop-in w-full max-w-sm rounded-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <span className="text-4xl" aria-hidden>
          {icon}
        </span>
        <h2 id="confirm-title" className="mt-2 text-2xl text-[#6b3a14]">
          {title}
        </h2>
        <p className="mt-1">{body}</p>
        <div className="mt-5 flex justify-center gap-3">
          <button ref={safeRef} onClick={onCancel} className="brass rounded-full px-5 py-2 font-bold">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="rounded-full bg-sepia px-5 py-2 font-bold text-candle hover:bg-[#5a3e24]">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
