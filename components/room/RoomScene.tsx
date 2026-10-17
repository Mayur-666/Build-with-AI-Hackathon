"use client";

import type { CSSProperties } from "react";
import type { GameState, HotspotId, ObjectId } from "@/lib/game/types";
import { Hotspot } from "./Hotspot";
import { ArchedWindow, Door, HangingLamp, Machine, Pedestal, Shelf, SideTable, VelvetBox } from "./SceneArt";

type Props = {
  state: GameState;
  onHotspot: (id: HotspotId) => void;
  /** The hotspot an item is being dragged over, or undefined when nothing is being dragged. */
  dragOver?: HotspotId | null;
  /** The hotspot that just rejected an item (wiggles briefly). */
  nope?: HotspotId | null;
};

const pct = (left: number, top: number, width: number, height: number): CSSProperties => ({
  left: `${left}%`,
  top: `${top}%`,
  width: `${width}%`,
  height: `${height}%`,
});

/** Where each curio sits: on the wall shelf, on the pedestal, on the side table. */
const CURIO_SPOTS: Record<ObjectId, CSSProperties> = {
  a: pct(6.5, 35, 13, 17),
  b: pct(22.5, 40, 13, 17),
  c: pct(62.5, 42, 13, 17),
};

const FIREFLIES = [
  [14, 30, 0],
  [28, 62, 2.5],
  [55, 24, 5],
  [70, 38, 1.2],
  [88, 14, 7],
  [38, 50, 3.8],
  [60, 70, 9],
];

/** The one fixed storybook room. Every clickable thing is a <Hotspot>. */
export function RoomScene({ state, onHotspot, dragOver, nope }: Props) {
  const { room } = state;
  const using = state.selectedItem !== null;
  const unvisited = (id: HotspotId) => !state.inspected.includes(id);
  const common = (id: HotspotId) => ({
    id,
    unvisited: unvisited(id),
    using,
    drop: dragOver === undefined ? null : dragOver === id ? ("over" as const) : ("ready" as const),
    nope: nope === id,
    onClick: () => onHotspot(id),
  });
  const verb = (what: string) => (using ? `Use the ${state.inventory[0]?.name ?? "item"} on the ${what}` : `Inspect the ${what}`);

  return (
    <div className="scene">
      {/* back to front */}
      <div className="scene-layer wall" />
      <div className="scene-layer wainscot" style={{ top: "52%", bottom: "34%" }} />
      <div className="scene-layer floor" />
      <div className="scene-layer rug" />

      <div className="scene-layer" style={pct(5.5, 7, 15, 40)}>
        <ArchedWindow />
      </div>
      <div className="scene-layer" style={pct(30.5, 0, 6, 32)}>
        <HangingLamp />
      </div>
      <div className="scene-layer" style={pct(4, 51.5, 18, 5)}>
        <Shelf />
      </div>
      <div className="scene-layer" style={pct(24, 56, 10, 22)}>
        <Pedestal />
      </div>
      <div className="scene-layer" style={pct(64, 58, 10, 20)}>
        <SideTable />
      </div>

      <Hotspot
        label={verb("door")}
        tag="The door"
        tagMode="hover"
        style={pct(41.5, 12.5, 17, 54)}
        {...common("exit")}
      >
        <Door />
      </Hotspot>

      {(["a", "b", "c"] as const).map((id) => {
        const obj = room.objects[id];
        return (
          <Hotspot
            key={id}
            label={verb(obj.name)}
            tag={obj.name}
            style={CURIO_SPOTS[id]}
            {...common(id)}
          >
            <span className="curio-glow" />
            <span className="curio-emoji absolute bottom-0 left-1/2 -translate-x-1/2">{obj.emoji}</span>
          </Hotspot>
        );
      })}

      <Hotspot
        label={verb("strange machine")}
        tag="Strange machine"
        tagMode="hover"
        style={pct(77, 22, 19, 60)}
        {...common("machine")}
      >
        <Machine />
      </Hotspot>

      <Hotspot
        label={verb(state.boxOpen ? "open box" : "locked box")}
        tag={state.boxOpen ? "Open box" : "Locked box"}
        tagMode="hover"
        style={pct(40, 71, 14, 16)}
        {...common("box")}
      >
        <VelvetBox open={state.boxOpen} />
      </Hotspot>

      <div className="scene-layer lamplight" />
      {FIREFLIES.map(([x, y, delay], i) => (
        <span key={i} className="firefly" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s, ${delay / 2}s` }} />
      ))}
      <div className="scene-layer vignette" />
    </div>
  );
}
