"use client";

import { sound, useSound } from "@/lib/audio";

/** Two small toggles: sound effects and music. Both start off. "inline" sits in the room sidebar. */
export function SoundControls({ variant = "fixed" }: { variant?: "fixed" | "inline" }) {
  const prefs = useSound();
  const base = `satchel grid place-items-center rounded-full transition hover:scale-105 ${variant === "inline" ? "h-8 w-8 text-sm" : "h-10 w-10 text-lg"}`;
  return (
    <div
      className={variant === "fixed" ? "sound-fixed absolute right-3 top-3 z-50 flex gap-2 sm:fixed" : "flex gap-1.5"}
      role="group"
      aria-label="Sound"
    >
      <button
        onClick={() => sound.setSfx(!prefs.sfx)}
        aria-pressed={prefs.sfx}
        aria-label={prefs.sfx ? "Sound effects on" : "Sound effects off"}
        title={prefs.sfx ? "Sound effects: on" : "Sound effects: off"}
        className={`${base} ${prefs.sfx ? "ring-2 ring-gold" : "opacity-75"}`}
      >
        <span aria-hidden>{prefs.sfx ? "🔊" : "🔈"}</span>
      </button>
      <button
        onClick={() => sound.setMusic(!prefs.music)}
        aria-pressed={prefs.music}
        aria-label={prefs.music ? "Music on" : "Music off"}
        title={prefs.music ? "Music: on" : "Music: off"}
        className={`${base} ${prefs.music ? "ring-2 ring-gold" : "opacity-75"}`}
      >
        <span aria-hidden className={prefs.music ? "" : "opacity-50"}>
          🎵
        </span>
      </button>
    </div>
  );
}
