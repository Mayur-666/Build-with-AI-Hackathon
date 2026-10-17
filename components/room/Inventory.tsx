"use client";

import type { Item } from "@/lib/game/types";

type Props = {
  items: Item[];
  selected: Item["id"] | null;
  onSelect: (id: Item["id"] | null) => void;
};

const SLOTS = 3;

/** A leather satchel with item slots. Click an item to hold it, then click something in the room. */
export function Inventory({ items, selected, onSelect }: Props) {
  return (
    <section aria-label="Satchel" className="satchel flex items-center gap-2 rounded-2xl px-3 py-2">
      <span className="font-storybook mr-1 text-sm text-candle/80 [writing-mode:vertical-rl] rotate-180">Satchel</span>
      {Array.from({ length: SLOTS }, (_, i) => {
        const item = items[i];
        if (!item) return <span key={i} className="slot h-12 w-12 rounded-full" aria-hidden />;
        const isSelected = selected === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(isSelected ? null : item.id)}
            aria-pressed={isSelected}
            title={isSelected ? `Holding the ${item.name}. Click something in the room to use it.` : `Hold the ${item.name}`}
            className={`slot pop-in grid h-12 w-12 place-items-center rounded-full text-2xl transition ${
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
