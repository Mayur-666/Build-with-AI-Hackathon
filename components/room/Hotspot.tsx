"use client";

import type { CSSProperties, ReactNode } from "react";

type Props = {
  id: string;
  label: string;
  tag: string;
  tagMode?: "always" | "hover";
  style: CSSProperties;
  unvisited: boolean;
  using: boolean;
  /** A visual state from the room definition: open, active (powered), lit, unlocked. */
  state?: string | null;
  /** "ready" while an item is being dragged; "over" when it's dragged onto this hotspot. */
  drop?: "ready" | "over" | null;
  /** Briefly true after a wrong item or a locked inspect: it wiggles "no". */
  nope?: boolean;
  /** Briefly true right after it was inspected: the object reacts. */
  poked?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

/** A clickable thing in the scene: glows when unvisited, lifts on hover, shows a brass name plaque. */
export function Hotspot({ id, label, tag, tagMode = "always", style, unvisited, using, state, drop, nope, poked, disabled, onClick, children }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      data-hotspot={id}
      data-state={state ?? undefined}
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={`hotspot ${unvisited ? "unvisited" : ""} ${using ? "using" : ""} ${state ? `is-${state}` : ""} ${drop ? `drop-${drop}` : ""} ${nope ? "nope" : ""} ${poked ? "poked" : ""}`}
    >
      <span className="art relative block h-full w-full">{children}</span>
      <span className={`tag ${tagMode === "hover" && drop !== "over" ? "hover-only" : ""}`}>{tag}</span>
    </button>
  );
}
