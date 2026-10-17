"use client";

import type { CSSProperties, ReactNode } from "react";
import type { HotspotId } from "@/lib/game/types";

type Props = {
  id: HotspotId;
  label: string;
  tag: string;
  tagMode?: "always" | "hover";
  style: CSSProperties;
  unvisited: boolean;
  using: boolean;
  /** "ready" while an item is being dragged; "over" when it's dragged onto this hotspot. */
  drop?: "ready" | "over" | null;
  /** Briefly true after a wrong item was used here. */
  nope?: boolean;
  onClick: () => void;
  children: ReactNode;
};

/** A clickable thing in the scene: glows when unvisited, lifts on hover, shows a brass name plaque. */
export function Hotspot({ id, label, tag, tagMode = "always", style, unvisited, using, drop, nope, onClick, children }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      data-hotspot={id}
      onClick={onClick}
      style={style}
      className={`hotspot ${unvisited ? "unvisited" : ""} ${using ? "using" : ""} ${drop ? `drop-${drop}` : ""} ${nope ? "nope" : ""}`}
    >
      <span className="art relative block h-full w-full">{children}</span>
      <span className={`tag ${tagMode === "hover" && drop !== "over" ? "hover-only" : ""}`}>{tag}</span>
    </button>
  );
}
