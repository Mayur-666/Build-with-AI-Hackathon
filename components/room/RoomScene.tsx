"use client";

import type { CSSProperties } from "react";
import { lookOf } from "@/lib/engine/engine";
import type { AdventureDef, HotspotDef, Progress } from "@/lib/engine/types";
import { Hotspot } from "./Hotspot";
import { ArchedWindow, Door, HangingLamp, Machine, Pedestal, Shelf, SideTable, VelvetBox } from "./SceneArt";

type Props = {
  def: AdventureDef;
  progress: Progress;
  onHotspot: (id: string) => void;
  /** The hotspot an item is being dragged over, or undefined when nothing is being dragged. */
  dragOver?: string | null;
  /** The hotspot that just refused (wrong item, locked): it wiggles. */
  nope?: string | null;
  /** The hotspot just inspected: it reacts. */
  poked?: string | null;
  /** The escape is under way: the door swings open and light floods in. */
  escaping?: boolean;
};

const pct = (left: number, top: number, width: number, height: number): CSSProperties => ({
  left: `${left}%`,
  top: `${top}%`,
  width: `${width}%`,
  height: `${height}%`,
});

const FIREFLIES = [
  [14, 30, 0],
  [28, 62, 2.5],
  [55, 24, 5],
  [70, 38, 1.2],
  [88, 14, 7],
  [38, 50, 3.8],
  [60, 70, 9],
];

/** Furniture under a curio, placed relative to its hotspot. */
function Plinth({ h }: { h: HotspotDef }) {
  const [x, y, w, hh] = h.spot;
  const bottom = y + hh;
  if (h.plinth === "shelf")
    return (
      <div className="scene-layer" style={pct(x - 2.5, bottom - 0.5, w + 5, 5)}>
        <Shelf />
      </div>
    );
  if (h.plinth === "pedestal")
    return (
      <div className="scene-layer" style={pct(x + 1.5, bottom - 1, w - 3, 22)}>
        <Pedestal />
      </div>
    );
  if (h.plinth === "table")
    return (
      <div className="scene-layer" style={pct(x + 1.5, bottom - 1, w - 3, 20)}>
        <SideTable />
      </div>
    );
  if (h.plinth === "floor") return <div className="scene-layer floor-shadow" style={pct(x + w * 0.1, bottom - 2.5, w * 0.8, 5)} />;
  return null;
}

/** Any room: backdrop by theme, every hotspot from the definition. */
export function RoomScene({ def, progress, onHotspot, dragOver, nope, poked, escaping = false }: Props) {
  const using = progress.selectedItem !== null;
  const held = progress.selectedItem ? def.items[progress.selectedItem]?.name : null;
  const verb = (name: string) => (held ? `Use the ${held} on the ${name}` : `Inspect the ${name}`);

  return (
    <div className={`scene backdrop-${def.backdrop} ${escaping ? "escaping" : ""}`}>
      <div className="scene-layer wall" />
      <div className="scene-layer wainscot" style={{ top: "52%", bottom: "34%" }} />
      <div className="scene-layer floor" />
      <div className="scene-layer backdrop-decor" />
      <div className="scene-layer rug" />
      <div className="scene-layer" style={pct(5.5, 7, 15, 40)}>
        <ArchedWindow />
      </div>
      <div className="scene-layer" style={pct(30.5, 0, 6, 32)}>
        <HangingLamp />
      </div>

      {def.hotspots.map((h) => (
        <Plinth key={`plinth-${h.id}`} h={h} />
      ))}

      {def.hotspots.map((h) => {
        const look = lookOf(h, progress);
        const state = look?.state ?? null;
        return (
          <Hotspot
            key={h.id}
            id={h.id}
            label={verb(h.name)}
            tag={h.name}
            tagMode={h.tag ?? (h.art === "emoji" ? "always" : "hover")}
            style={pct(...h.spot)}
            unvisited={!progress.inspected.includes(h.id)}
            using={using}
            state={state}
            drop={dragOver === undefined ? null : dragOver === h.id ? "over" : "ready"}
            nope={nope === h.id}
            poked={poked === h.id}
            disabled={escaping}
            onClick={() => onHotspot(h.id)}
          >
            {h.art === "door" && <Door open={escaping} unlocked={state === "unlocked"} />}
            {h.art === "box" && <VelvetBox open={state === "open"} />}
            {h.art === "machine" && <Machine solved={state === "active" || escaping} />}
            {h.art === "emoji" && (
              <>
                <span className="curio-glow" />
                <span className="curio-emoji absolute bottom-0 left-1/2 -translate-x-1/2">{look?.emoji ?? h.emoji}</span>
              </>
            )}
          </Hotspot>
        );
      })}

      <div className="scene-layer lamplight" />
      {FIREFLIES.map(([x, y, delay], i) => (
        <span key={i} className="firefly" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s, ${delay / 2}s` }} />
      ))}
      <div className="scene-layer vignette" />
      {escaping && <div className="scene-layer escape-flood" />}
    </div>
  );
}
