"use client";

export type Item = { id: string; name: string; emoji: string };
import type { useItemDrag } from "./useItemDrag";

type Props = {
  items: Item[];
  selected: Item["id"] | null;
  onSelect: (id: Item["id"] | null) => void;
  dragHandlers: ReturnType<typeof useItemDrag>["handlersFor"];
  dragging: Item["id"] | null;
  /** True for a moment after an item arrives: the satchel glows and the item drops in. */
  fresh?: boolean;
  /** Tools that share the satchel strip (the owl, the journal), shown after a divider. */
  children?: React.ReactNode;
};

const SLOTS = 3;

/**
 * The HUD strip: a leather satchel with item slots, then the tools. Click an item to hold it,
 * then click something in the room — or drag it there. Sizes scale with the sidebar's width.
 */
export function Inventory({ items, selected, onSelect, dragHandlers, dragging, fresh = false, children }: Props) {
  return (
    <div className={`hud satchel flex w-full items-center gap-1.5 rounded-2xl px-2.5 py-2 ${fresh ? "satchel-fresh" : ""}`}>
    <section aria-label="Satchel" className="flex items-center gap-1.5">
      <span className="font-storybook mr-0.5 text-xs text-candle/80 [writing-mode:vertical-rl] rotate-180">Satchel</span>
      {Array.from({ length: SLOTS }, (_, i) => {
        const item = items[i];
        if (!item) return <span key={i} className="slot hud-slot rounded-full" aria-hidden />;
        const isSelected = selected === item.id;
        return (
          <button
            key={item.id}
            {...dragHandlers(item)}
            onClick={() => onSelect(isSelected ? null : item.id)}
            aria-pressed={isSelected}
            title={`Drag the ${item.name} onto something in the room, or click to hold it`}
            className={`slot hud-slot ${fresh && i === items.length - 1 ? "fly-in" : "pop-in"} grid cursor-grab touch-none select-none place-items-center rounded-full text-2xl transition active:cursor-grabbing ${
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
    {children && (
      <>
        <span className="hud-divider" aria-hidden />
        <div className="ml-auto flex items-center gap-1.5">{children}</div>
      </>
    )}
    </div>
  );
}
