"use client";

import type { GameState, HotspotId } from "@/lib/game/types";

type Props = { state: GameState; onHotspot: (id: HotspotId) => void };

export function RoomScene({ state, onHotspot }: Props) {
  const { room } = state;
  const hotspots: { id: HotspotId; emoji: string; label: string }[] = [
    ...(["a", "b", "c"] as const).map((id) => ({ id, emoji: room.objects[id].emoji, label: room.objects[id].name })),
    { id: "machine", emoji: "⚙️", label: "strange machine" },
    { id: "box", emoji: state.boxOpen ? "📭" : "📦", label: state.boxOpen ? "open box" : "locked box" },
    { id: "exit", emoji: "🚪", label: "locked door" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {hotspots.map((h) => (
        <button
          key={h.id}
          aria-label={`Inspect the ${h.label}`}
          onClick={() => onHotspot(h.id)}
          className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-4 transition hover:border-gold ${
            state.selectedItem ? "border-candle" : "border-plum"
          } ${state.inspected.includes(h.id) ? "bg-dusk/60" : "bg-dusk"}`}
        >
          <span className="text-3xl">{h.emoji}</span>
          <span className="text-sm capitalize">{h.label}</span>
        </button>
      ))}
    </div>
  );
}
