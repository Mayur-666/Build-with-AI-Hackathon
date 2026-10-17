"use client";

import type { Item } from "@/lib/game/types";

type Props = {
  items: Item[];
  selected: Item["id"] | null;
  onSelect: (id: Item["id"] | null) => void;
};

export function Inventory({ items, selected, onSelect }: Props) {
  return (
    <section className="rounded-xl border border-plum bg-dusk p-4">
      <h2 className="mb-2 text-gold">Inventory</h2>
      {items.length === 0 ? (
        <p className="text-sm text-ink/60">Nothing yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                aria-pressed={selected === item.id}
                onClick={() => onSelect(selected === item.id ? null : item.id)}
                className={`rounded-lg border px-3 py-1 ${selected === item.id ? "border-gold bg-gold/20" : "border-plum"}`}
              >
                {item.emoji} {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && <p className="mt-2 text-sm text-candle">Now click something to use it on.</p>}
    </section>
  );
}
