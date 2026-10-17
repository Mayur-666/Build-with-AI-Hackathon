"use client";

import type { Item } from "@/lib/game/types";
import type { useItemDrag } from "./useItemDrag";

type Props = {
  items: Item[];
  selected: Item["id"] | null;
  onSelect: (id: Item["id"] | null) => void;
  dragHandlers: ReturnType<typeof useItemDrag>["handlersFor"];
  dragging: Item["id"] | null;
  /** True for a moment after an item arrives: the satchel glows and the item drops in. */
  fresh?: boolean;
};

const SLOTS = 3;

/** A leather satchel with item slots. Click an item to hold it, then click something in the room. */
export function Inventory({ items, selected, onSelect, dragHandlers, dragging, fresh = false }: Props) {
  return (
    <section aria-label="Satchel" className={`satchel flex items-center gap-2 rounded-2xl px-3 py-2 ${fresh ? "satchel-fresh" : ""}`}>
      <span className="font-storybook mr-1 text-sm text-candle/80 [writing-mode:vertical-rl] rotate-180">Satchel</span>
      {Array.from({ length: SLOTS }, (_, i) => {
        const item = items[i];
        if (!item) return <span key={i} className="slot h-12 w-12 rounded-full" aria-hidden />;
        const isSelected = selected === item.id;
        return (
          <button
            key={item.id}
            {...dragHandlers(item)}
            onClick={() => onSelect(isSelected ? null : item.id)}
            aria-pressed={isSelected}
            title={`Drag the ${item.name} onto something in the room, or click to hold it`}
            className={`slot ${fresh && i === items.length - 1 ? "fly-in" : "pop-in"} grid h-12 w-12 cursor-grab touch-none select-none place-items-center rounded-full text-2xl transition active:cursor-grabbing ${
              dragging === item.id ? "opacity-30" : ""
            } ${
              isSelected ? "scale-110 ring-2 ring-gold shadow-[0_0_18px_rgba(242,193,78,0.8)]" : "hover:scale-105"
            }`}
          >
            <span aria-hidden>{item.emoji}</span>
            <span className="sr-only">{item.name}</span>
          </button>
        );
      })}
    </section>
  );
}
