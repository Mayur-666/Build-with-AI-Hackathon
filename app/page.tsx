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
import type { GameAction, GameState, HotspotId, Room } from "@/lib/game/types";

type Screen = "start" | "room";

/** Holds the current screen and runs the game reducer for the active room. */
export default function GameShell() {
  const [screen, setScreen] = useState<Screen>("start");
  const [game, dispatch] = useReducer(
    (state: GameState | null, action: GameAction | { type: "LOAD"; room: Room } | { type: "RESET" }) => {
      if (action.type === "LOAD") return initialGameState(action.room);
      if (action.type === "RESET") return null;
      return state && gameReducer(state, action);
    },
    null,
  );

  const startRoom = () => {
    // Slice 1: always the classic room. Slice 2 asks Gemini first.
    dispatch({ type: "LOAD", room: buildFallbackRoom() });
    setScreen("room");
  };

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

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-4 py-6">
      <header>
        <h1 className="text-3xl text-gold">{game.room.title}</h1>
        <p className="text-ink/70">{game.room.theme}</p>
      </header>
      <RoomScene state={game} onHotspot={onHotspot} />
      {game.machineOpen && (
        <CodeMachine
          onSubmit={(code) => dispatch({ type: "ENTER_CODE", code })}
          onClose={() => dispatch({ type: "CLOSE_MACHINE" })}
        />
      )}
      <InspectPanel
        message={game.message}
        keyOffered={game.keyOffered}
        keyName={game.room.keyItem.name}
        onCollect={() => dispatch({ type: "COLLECT_KEY" })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Inventory
          items={game.inventory}
          selected={game.selectedItem}
          onSelect={(item) => dispatch({ type: "SELECT_ITEM", item })}
        />
        <ClueJournal entries={game.journal} />
      </div>
    </main>
  );
}
