"use client";

import type { CSSProperties, ReactNode } from "react";

type Props = {
  label: string;
  tag: string;
  tagMode?: "always" | "hover";
  style: CSSProperties;
  unvisited: boolean;
  using: boolean;
  onClick: () => void;
  children: ReactNode;
};

/** A clickable thing in the scene: glows when unvisited, lifts on hover, shows a brass name plaque. */
export function Hotspot({ label, tag, tagMode = "always", style, unvisited, using, onClick, children }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={style}
      className={`hotspot ${unvisited ? "unvisited" : ""} ${using ? "using" : ""}`}
    >
      <span className="art relative block h-full w-full">{children}</span>
      <span className={`tag ${tagMode === "hover" ? "hover-only" : ""}`}>{tag}</span>
    </button>
  );
}
