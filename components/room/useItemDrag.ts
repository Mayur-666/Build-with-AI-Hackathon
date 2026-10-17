"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { HotspotId, Item } from "@/lib/game/types";

export type DragState = { item: Item; x: number; y: number; over: HotspotId | null };

const DRAG_THRESHOLD = 6; // px of movement before a press becomes a drag (so a plain click still selects)

/** The hotspot under a screen point, found via the `data-hotspot` attribute. */
function hotspotAt(x: number, y: number): HotspotId | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-hotspot]");
  return (el?.dataset.hotspot as HotspotId | undefined) ?? null;
}

/**
 * Drag an inventory item onto the room with mouse, pen, or touch (Pointer Events).
 * Dropping on a hotspot calls `onDrop`; dropping elsewhere or pressing Esc cancels.
 */
export function useItemDrag(onDrop: (item: Item["id"], target: HotspotId) => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const press = useRef<{ item: Item; x: number; y: number; active: boolean } | null>(null);
  const swallowClick = useRef(false);

  useEffect(() => {
    if (!drag) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        press.current = null;
        setDrag(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drag]);

  const handlersFor = (item: Item) => ({
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      press.current = { item, x: e.clientX, y: e.clientY, active: false };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic events can't be captured; dragging still works without it.
      }
    },
    onPointerMove(e: ReactPointerEvent<HTMLElement>) {
      const p = press.current;
      if (!p) return;
      if (!p.active) {
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_THRESHOLD) return;
        p.active = true;
      }
      e.preventDefault();
      setDrag({ item: p.item, x: e.clientX, y: e.clientY, over: hotspotAt(e.clientX, e.clientY) });
    },
    onPointerUp(e: ReactPointerEvent<HTMLElement>) {
      const p = press.current;
      press.current = null;
      if (!p?.active) return; // a plain click: let onClick handle select
      swallowClick.current = true;
      setDrag(null);
      const target = hotspotAt(e.clientX, e.clientY);
      if (target) onDrop(p.item.id, target);
    },
    onPointerCancel() {
      press.current = null;
      setDrag(null);
    },
    onClickCapture(e: React.MouseEvent) {
      if (swallowClick.current) {
        swallowClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }
    },
  });

  return { drag, handlersFor };
}
