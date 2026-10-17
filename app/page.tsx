"use client";

import { useReducer, useState } from "react";
import { EscapeScreen } from "@/components/EscapeScreen";
import { StartScreen } from "@/components/StartScreen";
import { ClueJournal } from "@/components/room/ClueJournal";
import { CodeMachine } from "@/components/room/CodeMachine";
import { InspectPanel } from "@/components/room/InspectPanel";
import { Inventory } from "@/components/room/Inventory";
import { RoomScene } from "@/components/room/RoomScene";
import { buildFallbackRoom } from "@/lib/game/fallbackRoom";
import { gameReducer, initialGameState } from "@/lib/game/reducer";
import type { GameAction, GameState, HotspotId, Message, Room } from "@/lib/game/types";

type Screen = "start" | "loading" | "room";

const FALLBACK_NOTE = "The dungeon got its wires crossed, so you've been given a classic room instead.";

async function requestRoom(objects: [string, string, string]): Promise<{ room: Room; usedFallback: boolean }> {
  const forceFallback = new URLSearchParams(window.location.search).has("fallback");
  try {
    const res = await fetch("/api/generate-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objects, forceFallback }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    // Server unreachable: the classic room still works entirely in the browser.
    return { room: buildFallbackRoom(), usedFallback: true };
  }
}

/** Holds the current screen and runs the game reducer for the active room. */
export default function GameShell() {
  const [screen, setScreen] = useState<Screen>("start");
  const [usedFallback, setUsedFallback] = useState(false);
  const [game, dispatch] = useReducer(
    (state: GameState | null, action: GameAction | { type: "LOAD"; room: Room } | { type: "RESET" }) => {
      if (action.type === "LOAD") return initialGameState(action.room);
      if (action.type === "RESET") return null;
      return state && gameReducer(state, action);
    },
    null,
  );

  const startRoom = async (objects: [string, string, string]) => {
    setScreen("loading");
    const result = await requestRoom(objects);
    dispatch({ type: "LOAD", room: result.room });
    setUsedFallback(result.usedFallback);
    setScreen("room");
  };

  if (screen === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="font-storybook animate-pulse text-2xl text-gold">Building your room…</p>
      </main>
    );
  }

  if (screen === "start" || !game) return <StartScreen onGenerate={startRoom} />;

  if (game.escaped) {
    return (
      <EscapeScreen
        room={game.room}
        onNewRoom={() => {
          dispatch({ type: "RESET" });
          setScreen("start");
        }}
      />
    );
  }

  const onHotspot = (id: HotspotId) =>
    dispatch(game.selectedItem ? { type: "USE_ITEM", target: id } : { type: "INSPECT", target: id });

  const message: Message | null =
    game.message?.tone === "intro" && usedFallback
      ? { ...game.message, lines: [FALLBACK_NOTE, ...game.message.lines] }
      : game.message;
  const heldItem = game.inventory.find((i) => i.id === game.selectedItem);
  const machineFeedback = game.machineOpen && game.message?.tone === "wrong" ? game.message.lines[0] : null;

  return (
    <main className="room-layout">
      <header className="room-head text-center">
        <h1 className="text-2xl leading-tight text-gold drop-shadow-[0_0_12px_rgba(242,193,78,0.35)] lg:text-3xl">{game.room.title}</h1>
        <p className="font-storybook mt-1 text-sm italic leading-snug text-ink/70 lg:text-base">{game.room.theme}</p>
      </header>

      <div className="room-stage">
        <RoomScene state={game} onHotspot={onHotspot} />
        {heldItem && (
          <p className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full bg-[rgba(20,26,58,0.85)] px-4 py-1 text-sm text-candle shadow-lg">
            {heldItem.emoji} Use the {heldItem.name} on…
          </p>
        )}
        {game.machineOpen && (
          <CodeMachine
            onSubmit={(code) => dispatch({ type: "ENTER_CODE", code })}
            onClose={() => dispatch({ type: "CLOSE_MACHINE" })}
            wrongAttempts={game.wrongAttempts}
            feedback={machineFeedback}
          />
        )}
      </div>

      <aside className="room-side">
        <div className="message-scroll">
          <InspectPanel
            message={message}
            keyOffered={game.keyOffered}
            keyName={game.room.keyItem.name}
            keyEmoji={game.room.keyItem.emoji}
            onCollect={() => dispatch({ type: "COLLECT_KEY" })}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Inventory
            items={game.inventory}
            selected={game.selectedItem}
            onSelect={(item) => dispatch({ type: "SELECT_ITEM", item })}
          />
          <ClueJournal entries={game.journal} />
        </div>
      </aside>
    </main>
  );
}
