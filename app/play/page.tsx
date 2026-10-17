"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { DisturbanceScreen, type DisturbanceReason } from "@/components/DisturbanceScreen";
import { EscapeScreen, type EscapeStats } from "@/components/EscapeScreen";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StartScreen } from "@/components/StartScreen";
import { ClueJournal } from "@/components/room/ClueJournal";
import { CodeMachine } from "@/components/room/CodeMachine";
import { HintButton } from "@/components/room/HintButton";
import { InspectPanel } from "@/components/room/InspectPanel";
import { Inventory } from "@/components/room/Inventory";
import { LeaveRoom } from "@/components/room/LeaveRoom";
import { RoomScene } from "@/components/room/RoomScene";
import { useItemDrag } from "@/components/room/useItemDrag";
import type { FallbackReason } from "@/lib/ai/errors";
import { buildFallbackRoom } from "@/lib/game/fallbackRoom";
import { gameReducer, initialGameState, revealedHintLevel } from "@/lib/game/reducer";
import type { GameAction, GameState, HotspotId, Message, Room } from "@/lib/game/types";

type Trio = [string, string, string];
type Screen = "start" | "loading" | "disturbance" | "room" | "escaped";
type RoomResponse = { room: Room; usedFallback: boolean; fallbackReason?: FallbackReason };

const CLASSIC_NOTE = "You stepped through into the classic room, an old favourite the dungeon keeps for nights like this.";
const DOOR_SEQUENCE_MS = 2300;

async function requestRoom(objects: Trio): Promise<RoomResponse & { offline?: boolean }> {
  const flag = new URLSearchParams(window.location.search).get("fallback");
  const forceFallback = flag === null ? undefined : flag || true;
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
    return { room: buildFallbackRoom(), usedFallback: true, offline: true };
  }
}

function hotspotName(game: GameState, id: HotspotId): string {
  if (id === "a" || id === "b" || id === "c") return `the ${game.room.objects[id].name}`;
  return { machine: "the strange machine", box: "the box", exit: "the door" }[id];
}

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Holds the current screen and runs the game reducer for the active room. */
export default function GameShell() {
  const [screen, setScreen] = useState<Screen>("start");
  const [objects, setObjects] = useState<Trio | null>(null);
  const [disturbance, setDisturbance] = useState<{ reason: DisturbanceReason; classic: Room } | null>(null);
  const [inClassicRoom, setInClassicRoom] = useState(false);
  const [escaping, setEscaping] = useState(false);
  const startedAt = useRef(0);
  const [stats, setStats] = useState<EscapeStats | null>(null);

  const [game, dispatch] = useReducer(
    (state: GameState | null, action: GameAction | { type: "LOAD"; room: Room } | { type: "RESET" }) => {
      if (action.type === "LOAD") return initialGameState(action.room);
      if (action.type === "RESET") return null;
      return state && gameReducer(state, action);
    },
    null,
  );

  // Short-lived reactions in the scene.
  const lastUseTarget = useRef<HotspotId | null>(null);
  const lastInspected = useRef<HotspotId | null>(null);
  const [nope, setNope] = useState<HotspotId | null>(null);
  const [poked, setPoked] = useState<HotspotId | null>(null);
  const [freshItem, setFreshItem] = useState(false);

  const { drag, handlersFor } = useItemDrag((item, target) => {
    lastUseTarget.current = target;
    dispatch({ type: "DROP_ITEM", item, target });
  });

  const flash = (set: (v: HotspotId | null) => void, id: HotspotId, ms: number) => {
    set(id);
    setTimeout(() => set(null), ms);
  };

  // Wrong item, or a locked box/door: the target wiggles "no".
  useEffect(() => {
    const m = game?.message;
    if (!m) return;
    if (m.tone === "wrong" && m.lines[0] === game?.room.wrongItemLine && lastUseTarget.current) {
      flash(setNope, lastUseTarget.current, 650);
      lastUseTarget.current = null;
    } else if (m.tone === "locked" && lastInspected.current) {
      flash(setNope, lastInspected.current, 650);
    }
  }, [game?.message, game?.room.wrongItemLine]);

  // A new item drops into the satchel with a glow.
  const itemCount = game?.inventory.length ?? 0;
  const prevItems = useRef(0);
  useEffect(() => {
    if (itemCount > prevItems.current) {
      setFreshItem(true);
      const t = setTimeout(() => setFreshItem(false), 1200);
      prevItems.current = itemCount;
      return () => clearTimeout(t);
    }
    prevItems.current = itemCount;
  }, [itemCount]);

  // The right code: the machine sings, the door swings open, then out into the night.
  useEffect(() => {
    if (!game?.escaped || screen !== "room") return;
    setEscaping(true);
    setStats({
      seconds: Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)),
      wrongAttempts: game.wrongAttempts,
      hintsUsed: game.hintsUsed,
      cluesFound: game.journal.length,
    });
    const t = setTimeout(() => {
      setEscaping(false);
      setScreen("escaped");
    }, prefersReducedMotion() ? 300 : DOOR_SEQUENCE_MS);
    return () => clearTimeout(t);
  }, [game?.escaped, game?.wrongAttempts, game?.hintsUsed, game?.journal.length, screen]);

  const enterRoom = (room: Room, classic: boolean) => {
    dispatch({ type: "LOAD", room });
    setInClassicRoom(classic);
    startedAt.current = Date.now();
    prevItems.current = 0;
    setScreen("room");
  };

  const startRoom = async (chosen: Trio) => {
    setObjects(chosen);
    setScreen("loading");
    const result = await requestRoom(chosen);
    if (!result.usedFallback) return enterRoom(result.room, false);
    setDisturbance({ reason: result.offline ? "offline" : result.fallbackReason ?? "invalid_output", classic: result.room });
    setScreen("disturbance");
  };

  const toStart = () => {
    dispatch({ type: "RESET" });
    setScreen("start");
  };

  if (screen === "loading" && objects) return <LoadingScreen objects={objects} />;

  if (screen === "disturbance" && disturbance && objects) {
    return (
      <DisturbanceScreen
        reason={disturbance.reason}
        onRetry={() => startRoom(objects)}
        onClassic={() => enterRoom(disturbance.classic, true)}
        onChangeObjects={toStart}
      />
    );
  }

  if (screen === "escaped" && game && stats) {
    return (
      <EscapeScreen
        room={game.room}
        stats={stats}
        onNewRoom={() => {
          setObjects(null);
          toStart();
        }}
        onSameObjects={() => objects && startRoom(objects)}
      />
    );
  }

  if (screen !== "room" || !game) return <StartScreen key={objects?.join("|") ?? "new"} onGenerate={startRoom} initial={objects ?? undefined} />;

  const onHotspot = (id: HotspotId) => {
    if (game.selectedItem) {
      lastUseTarget.current = id;
      dispatch({ type: "USE_ITEM", target: id });
      return;
    }
    lastInspected.current = id;
    flash(setPoked, id, 600);
    dispatch({ type: "INSPECT", target: id });
  };

  const message: Message | null =
    game.message?.tone === "intro" && inClassicRoom ? { ...game.message, lines: [CLASSIC_NOTE, ...game.message.lines] } : game.message;
  const heldItem = game.inventory.find((i) => i.id === game.selectedItem);
  const machineFeedback = game.machineOpen && game.message?.tone === "wrong" ? game.message.lines[0] : null;

  return (
    <main className="room-layout">
      <header className="room-head text-center">
        <h1 className="text-2xl leading-tight text-gold drop-shadow-[0_0_12px_rgba(242,193,78,0.35)] lg:text-3xl">{game.room.title}</h1>
        <p className="font-storybook mt-1 text-sm italic leading-snug text-ink/70 lg:text-base">{game.room.theme}</p>
      </header>

      <div className="room-stage">
        <RoomScene
          state={game}
          onHotspot={onHotspot}
          dragOver={drag ? drag.over : undefined}
          nope={nope}
          poked={poked}
          escaping={escaping}
        />
        {heldItem && !drag && (
          <p className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full bg-[rgba(20,26,58,0.85)] px-4 py-1 text-sm text-candle shadow-lg">
            {heldItem.emoji} Use the {heldItem.name} on…
          </p>
        )}
        {escaping && (
          <p className="font-storybook escape-caption pointer-events-none absolute inset-x-0 bottom-[12%] z-40 text-center text-3xl text-candle sm:text-4xl">
            The door swings open…
          </p>
        )}
        {game.machineOpen && !escaping && (
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
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
          <Inventory
            items={game.inventory}
            selected={game.selectedItem}
            onSelect={(item) => dispatch({ type: "SELECT_ITEM", item })}
            dragHandlers={handlersFor}
            dragging={drag?.item.id ?? null}
            fresh={freshItem}
          />
          <div className="ml-auto flex items-center gap-2">
            <HintButton level={revealedHintLevel(game)} onHint={() => dispatch({ type: "REQUEST_HINT" })} />
            <ClueJournal entries={game.journal} />
          </div>
        </div>
        <div className="text-center lg:text-left">
          <LeaveRoom onLeave={toStart} />
        </div>
      </aside>

      {drag && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          <span className="text-4xl">{drag.item.emoji}</span>
          {drag.over && <span className="drag-hint">Use on {hotspotName(game, drag.over)}</span>}
        </div>
      )}
    </main>
  );
}
