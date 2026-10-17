"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { AdventureHub, type RoomStatus } from "@/components/AdventureHub";
import { DisturbanceScreen, type DisturbanceReason } from "@/components/DisturbanceScreen";
import { EscapeScreen, type EscapeAction, type EscapeStats } from "@/components/EscapeScreen";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StartScreen } from "@/components/StartScreen";
import { ClueJournal } from "@/components/room/ClueJournal";
import { ConfirmDialog } from "@/components/room/ConfirmDialog";
import { HintButton } from "@/components/room/HintButton";
import { InspectPanel } from "@/components/room/InspectPanel";
import { Inventory } from "@/components/room/Inventory";
import { LockDialog } from "@/components/room/LockDialog";
import { RoomScene } from "@/components/room/RoomScene";
import { useItemDrag } from "@/components/room/useItemDrag";
import type { FallbackReason } from "@/lib/ai/errors";
import { CATALOGUE, catalogueRoom } from "@/lib/catalogue";
import { lockOf, newProgress, revealedHintLevel, step } from "@/lib/engine/engine";
import { fromChainRoom } from "@/lib/engine/fromChainRoom";
import { browserStorage, findByCode, listPlaythroughs, loadCurrent, loadPlaythrough, newSaveId, savePlaythrough, type Loaded } from "@/lib/engine/saves";
import type { Action, AdventureDef, Message, Progress } from "@/lib/engine/types";
import { validateAdventure } from "@/lib/engine/validate";
import { sound, type Sfx } from "@/lib/audio";
import { buildFallbackRoom } from "@/lib/game/fallbackRoom";
import type { Room } from "@/lib/game/types";

type Trio = [string, string, string];
type Screen = "restoring" | "hub" | "create" | "loading" | "disturbance" | "room" | "escaped";
type HubData = { status: Record<string, RoomStatus>; customs: Loaded[]; current: Loaded | null };
type RoomResponse = { room: Room; usedFallback: boolean; fallbackReason?: FallbackReason };
type Session = { def: AdventureDef; saveId: string; createdAt: number };

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
    return { room: buildFallbackRoom(), usedFallback: true, offline: true };
  }
}

/** Point the URL at what's on screen. `push` adds a history entry (so Back returns here). */
function setPlayUrl(query: string, push = false) {
  const fallback = new URLSearchParams(window.location.search).get("fallback");
  const parts = [query, fallback !== null ? `fallback=${fallback}` : ""].filter(Boolean);
  const url = `/play${parts.length ? `?${parts.join("&")}` : ""}`;
  if (`${window.location.pathname}${window.location.search}` === url) return;
  if (push) window.history.pushState(window.history.state, "", url);
  else window.history.replaceState(window.history.state, "", url);
}

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type PlayState = { def: AdventureDef; p: Progress } | null;
type PlayAction = Action | { type: "BEGIN"; def: AdventureDef; p: Progress } | { type: "END" };

function playReducer(state: PlayState, action: PlayAction): PlayState {
  if (action.type === "BEGIN") return { def: action.def, p: action.p };
  if (action.type === "END") return null;
  return state && { def: state.def, p: step(state.def, state.p, action) };
}

function playthroughRecord(def: AdventureDef, saveId: string, createdAt: number, progress: Progress, stats: EscapeStats | null) {
  return { saveId, roomId: def.id, roomVersion: def.version, origin: def.kind, createdAt, savedAt: Date.now(), progress, stats };
}

/** Holds the current screen and runs the engine for the active playthrough. */
export default function GameShell() {
  const [screen, setScreen] = useState<Screen>("restoring");
  const [objects, setObjects] = useState<Trio | null>(null);
  const [disturbance, setDisturbance] = useState<{ reason: DisturbanceReason; classic: Room } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [stats, setStats] = useState<EscapeStats | null>(null);
  const [escaping, setEscaping] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [classicNote, setClassicNote] = useState(false);
  const [play, dispatch] = useReducer(playReducer, null);
  const [hub, setHub] = useState<HubData | null>(null);
  const [restartTarget, setRestartTarget] = useState<Loaded | null>(null);

  // Player actions (as opposed to loading a save) are marked so their results can make a sound.
  const acted = useRef(false);
  const act = (a: Action) => {
    acted.current = true;
    dispatch(a);
  };

  // Short-lived reactions in the scene.
  const lastTarget = useRef<string | null>(null);
  const prevItems = useRef(0);
  const [nope, setNope] = useState<string | null>(null);
  const [poked, setPoked] = useState<string | null>(null);
  const [freshItem, setFreshItem] = useState(false);
  const flash = (set: (v: string | null) => void, id: string, ms: number) => {
    set(id);
    setTimeout(() => set(null), ms);
  };

  const { drag, handlersFor } = useItemDrag((item, target) => {
    lastTarget.current = target;
    act({ type: "DROP_ITEM", item, target });
  });

  // ── Entering, resuming, routing ──

  const resume = ({ play: saved, def }: Loaded) => {
    dispatch({ type: "BEGIN", def, p: saved.progress });
    setSession({ def, saveId: saved.saveId, createdAt: saved.createdAt });
    setObjects(def.relics ?? null);
    setClassicNote(false);
    prevItems.current = saved.progress.inventory.length;
    setPlayUrl(`save=${saved.saveId}`);
    if (saved.progress.escaped) {
      setStats(
        saved.stats ?? {
          seconds: Math.max(1, Math.round((saved.savedAt - saved.createdAt) / 1000)),
          wrongAttempts: saved.progress.wrongAttempts,
          hintsUsed: saved.progress.hintsUsed,
          cluesFound: saved.progress.journal.length,
        },
      );
      setScreen("escaped");
    } else {
      setStats(null);
      setScreen("room");
    }
  };

  /** Start a brand-new playthrough of a room, with its own save ID. */
  const beginPlaythrough = (def: AdventureDef, opts: { classic?: boolean; replace?: boolean } = {}) => {
    const saveId = newSaveId();
    const createdAt = Date.now();
    const p = newProgress(def);
    dispatch({ type: "BEGIN", def, p });
    setSession({ def, saveId, createdAt });
    setStats(null);
    setNotice(null);
    setClassicNote(!!opts.classic);
    setHub(null);
    prevItems.current = 0;
    savePlaythrough(browserStorage(), catalogueRoom, playthroughRecord(def, saveId, createdAt, p, null), def.kind === "custom" ? def : undefined);
    setPlayUrl(`save=${saveId}`, !opts.replace);
    setScreen("room");
  };

  /** Read every playthrough in this browser for the hub. */
  const openHub = (push = false) => {
    const storage = browserStorage();
    const plays = listPlaythroughs(storage, catalogueRoom);
    const status: Record<string, RoomStatus> = {};
    for (const def of CATALOGUE) {
      const mine = plays.filter((p) => p.roomId === def.id);
      const latest = mine[0] ? loadPlaythrough(storage, catalogueRoom, mine[0].saveId) : null;
      status[def.id] = { latest, escapes: mine.filter((p) => p.progress.escaped).length };
    }
    const seen = new Set<string>();
    const customs = plays
      .filter((p) => p.origin === "custom" && !seen.has(p.roomId) && seen.add(p.roomId))
      .slice(0, 4)
      .flatMap((p) => loadPlaythrough(storage, catalogueRoom, p.saveId) ?? []);
    setHub({ status, customs, current: loadCurrent(storage, catalogueRoom) });
    dispatch({ type: "END" });
    setSession(null);
    setPlayUrl("", push);
    setScreen("hub");
  };

  const route = () => {
    const params = new URLSearchParams(window.location.search);
    const storage = browserStorage();
    if (params.has("new") || params.has("create")) {
      dispatch({ type: "END" });
      setSession(null);
      setScreen("create");
      return;
    }
    const saveId = params.get("save");
    const roomId = params.get("room");
    if (saveId) {
      const found = loadPlaythrough(storage, catalogueRoom, saveId);
      if (found) return resume(found);
      setNotice(`${saveId.toUpperCase()} isn't saved in this browser.`);
      return openHub();
    }
    if (roomId) {
      const found = findByCode(storage, catalogueRoom, roomId);
      if (found) return resume(found);
      const def = catalogueRoom(roomId);
      if (def) return beginPlaythrough(def, { replace: true });
      setNotice(`${roomId.toUpperCase()} isn't a room in this browser.`);
    }
    openHub();
  };

  // localStorage is only read after mount, so server and client HTML match. Back/Forward re-route.
  useEffect(() => {
    route();
    const onPop = () => route();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Autosave: every change to the playthrough, including the ending ──
  useEffect(() => {
    if (!play || !session || (screen !== "room" && screen !== "escaped")) return;
    savePlaythrough(browserStorage(), catalogueRoom, playthroughRecord(session.def, session.saveId, session.createdAt, play.p, play.p.escaped ? stats : null));
  }, [play, session, stats, screen]);

  // ── Sound: each result of a player action gets its own small sound ──
  const lastMessage = play?.p.message;
  useEffect(() => {
    if (!acted.current || !lastMessage) return;
    acted.current = false;
    const byTone: Record<string, Sfx> = { discovery: "discovery", unlock: "unlock", wrong: "wrong", locked: "locked", hint: "hint", success: "escape" };
    sound.play(lastMessage.title === "Collected" ? "collect" : (byTone[lastMessage.tone ?? ""] ?? "inspect"));
  }, [lastMessage]);

  // ── Scene reactions ──
  const message = play?.p.message;
  useEffect(() => {
    if (!message || !lastTarget.current) return;
    if (message.tone === "wrong" || message.tone === "locked") flash(setNope, lastTarget.current, 650);
  }, [message]);

  const itemCount = play?.p.inventory.length ?? 0;
  useEffect(() => {
    if (itemCount > prevItems.current) {
      setFreshItem(true);
      const t = setTimeout(() => setFreshItem(false), 1200);
      prevItems.current = itemCount;
      return () => clearTimeout(t);
    }
    prevItems.current = itemCount;
  }, [itemCount]);

  // ── The escape: the door swings open, light floods in, then out into the night ──
  const escaped = play?.p.escaped ?? false;
  useEffect(() => {
    if (!escaped || screen !== "room" || !play || !session) return;
    setEscaping(true);
    setStats({
      seconds: Math.max(1, Math.round((Date.now() - session.createdAt) / 1000)),
      wrongAttempts: play.p.wrongAttempts,
      hintsUsed: play.p.hintsUsed,
      cluesFound: play.p.journal.length,
    });
    const t = setTimeout(() => {
      setEscaping(false);
      setScreen("escaped");
    }, prefersReducedMotion() ? 300 : DOOR_SEQUENCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escaped, screen]);

  // ── Custom rooms ──
  const startCustom = async (chosen: Trio) => {
    setObjects(chosen);
    setScreen("loading");
    const result = await requestRoom(chosen);
    if (!result.usedFallback) {
      // Validate before play: the engine definition must pass the same checks as catalogue rooms.
      const def = fromChainRoom(result.room, { relics: chosen });
      const check = validateAdventure(def);
      if (check.ok) return beginPlaythrough(check.def);
      console.warn("[custom room] failed validation:", check.reasons);
      setDisturbance({ reason: "invalid_output", classic: buildFallbackRoom() });
    } else {
      setDisturbance({ reason: result.offline ? "offline" : (result.fallbackReason ?? "invalid_output"), classic: result.room });
    }
    setScreen("disturbance");
  };

  const toCreate = () => {
    dispatch({ type: "END" });
    setSession(null);
    setPlayUrl("new", true);
    setScreen("create");
  };

  // ── Screens ──

  if (screen === "restoring") {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p className="font-storybook animate-pulse text-xl text-candle/80">Lighting the lantern…</p>
      </main>
    );
  }

  if (screen === "loading" && objects) return <LoadingScreen objects={objects} />;

  if (screen === "disturbance" && disturbance && objects) {
    return (
      <DisturbanceScreen
        reason={disturbance.reason}
        onRetry={() => startCustom(objects)}
        onExplore={() => openHub(true)}
        onClassic={() => beginPlaythrough(fromChainRoom(disturbance.classic, { relics: objects }), { classic: true })}
        onChangeObjects={toCreate}
      />
    );
  }

  if (screen === "hub" && hub) {
    return (
      <>
        {notice && (
          <p role="status" className="parchment fixed left-1/2 top-4 z-40 -translate-x-1/2 rounded-xl px-4 py-2 text-sm">
            🕯️ {notice}
          </p>
        )}
        <AdventureHub
          catalogue={CATALOGUE}
          status={hub.status}
          customs={hub.customs}
          current={hub.current}
          onPlay={(def) => beginPlaythrough(def)}
          onContinue={(saveId) => {
            const found = loadPlaythrough(browserStorage(), catalogueRoom, saveId);
            if (found) {
              setPlayUrl(`save=${saveId}`, true);
              resume(found);
            }
          }}
          onRestart={setRestartTarget}
          onCreate={() => (setObjects(null), toCreate())}
        />
        {restartTarget && (
          <ConfirmDialog
            icon="🕯️"
            title={`Start ${restartTarget.def.title} over?`}
            body="Everything you've found in this playthrough will be forgotten. Your other playthroughs are untouched."
            confirmLabel="Restart"
            cancelLabel="Keep my progress"
            onConfirm={() => {
              const { play: old, def } = restartTarget;
              const fresh = { ...old, createdAt: Date.now(), savedAt: Date.now(), progress: newProgress(def), stats: null };
              savePlaythrough(browserStorage(), catalogueRoom, fresh, def.kind === "custom" ? def : undefined);
              setRestartTarget(null);
              setPlayUrl(`save=${old.saveId}`, true);
              resume({ play: fresh, def });
            }}
            onCancel={() => setRestartTarget(null)}
          />
        )}
      </>
    );
  }

  if (screen === "escaped" && play && session && stats) {
    const def = session.def;
    const actions: EscapeAction[] = [{ label: "↻ Play this room again", onClick: () => beginPlaythrough(def), primary: true }];
    if (def.relics) actions.push({ label: "✨ Same relics, new room", onClick: () => startCustom(def.relics!) });
    if (def.relics) actions.push({ label: "🎲 Choose new relics", onClick: () => (setObjects(null), toCreate()) });
    actions.push({ label: "🗺️ All adventures", onClick: () => openHub(true) });
    return (
      <EscapeScreen
        title={def.title}
        escapeText={def.escapeText}
        roomId={def.id}
        saveId={session.saveId}
        stats={stats}
        totalClues={Object.keys(def.clues).length}
        actions={actions}
      />
    );
  }

  if (screen !== "room" || !play || !session) {
    return <StartScreen key={objects?.join("|") ?? "new"} onGenerate={startCustom} initial={objects ?? undefined} notice={notice} />;
  }

  // ── The room ──
  const { def, p } = play;
  const onHotspot = (id: string) => {
    lastTarget.current = id;
    if (p.selectedItem) return act({ type: "USE_ITEM", target: id });
    flash(setPoked, id, 600);
    act({ type: "INSPECT", target: id });
  };
  const shown: Message | null =
    p.message?.tone === "intro" && classicNote ? { ...p.message, lines: [CLASSIC_NOTE, ...p.message.lines] } : p.message;
  const items = p.inventory.map((id) => ({ id, ...def.items[id] }));
  const held = p.selectedItem ? def.items[p.selectedItem] : null;
  const openLock = p.openLock ? lockOf(def, p.openLock) : undefined;
  const lockFeedback = openLock && p.message?.tone === "wrong" && p.message.title === openLock.title ? p.message.lines[0] : null;
  const dragTargetName = drag?.over ? def.hotspots.find((h) => h.id === drag.over)?.name : null;

  return (
    <main className="room-layout">
      <header className="room-head text-center">
        <h1 className="text-2xl leading-tight text-gold drop-shadow-[0_0_12px_rgba(242,193,78,0.35)] lg:text-3xl">{def.title}</h1>
        <p className="font-storybook mt-1 text-sm italic leading-snug text-ink/70 lg:text-base">{def.theme}</p>
      </header>

      <div className="room-stage">
        <RoomScene def={def} progress={p} onHotspot={onHotspot} dragOver={drag ? drag.over : undefined} nope={nope} poked={poked} escaping={escaping} />
        {held && !drag && (
          <p className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full bg-[rgba(20,26,58,0.85)] px-4 py-1 text-sm text-candle shadow-lg">
            {held.emoji} Use the {held.name} on…
          </p>
        )}
        {escaping && (
          <p className="font-storybook escape-caption pointer-events-none absolute inset-x-0 bottom-[12%] z-40 text-center text-3xl text-candle sm:text-4xl">
            The door swings open…
          </p>
        )}
        {openLock && !escaping && (
          <LockDialog
            lock={openLock}
            values={p.dials[openLock.id] ?? openLock.dials.map(() => 0)}
            onTurn={(dial, delta) => (sound.play("dial"), dispatch({ type: "TURN_DIAL", lock: openLock.id, dial, delta }))}
            onSet={(dial, index) => (sound.play("dial"), dispatch({ type: "SET_DIAL", lock: openLock.id, dial, index }))}
            onSubmit={() => {
              lastTarget.current = null;
              act({ type: "SUBMIT_LOCK", lock: openLock.id });
            }}
            onClose={() => act({ type: "CLOSE_LOCK" })}
            wrongAttempts={p.wrongAttempts}
            feedback={lockFeedback}
          />
        )}
      </div>

      <aside className="room-side">
        <div className="message-scroll">
          <InspectPanel message={shown} offered={p.offered.map((id) => ({ id, ...def.items[id] }))} onTake={(item) => act({ type: "TAKE", item })} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
          <Inventory
            items={items}
            selected={p.selectedItem}
            onSelect={(item) => act({ type: "SELECT_ITEM", item })}
            dragHandlers={handlersFor}
            dragging={drag?.item.id ?? null}
            fresh={freshItem}
          />
          <div className="ml-auto flex items-center gap-2">
            <HintButton level={revealedHintLevel(def, p)} onHint={() => act({ type: "REQUEST_HINT" })} />
            <ClueJournal entries={p.journal.map((id) => ({ id, text: def.clues[id] }))} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 lg:justify-start">
          <button onClick={() => openHub(true)} className="font-storybook text-sm text-candle/60 underline-offset-4 hover:text-candle hover:underline">
            Leave this room
          </button>
          <button onClick={() => setConfirmRestart(true)} className="font-storybook text-sm text-candle/60 underline-offset-4 hover:text-candle hover:underline">
            Restart room
          </button>
          <span className="font-mono text-xs tracking-wider text-ink/40" title="This playthrough's save code (this browser only)">
            {session.saveId}
          </span>
        </div>
      </aside>

      {confirmRestart && (
        <ConfirmDialog
          icon="🕯️"
          title="Start this room over?"
          body="Everything you've found in this playthrough will be forgotten. Your other playthroughs are untouched."
          confirmLabel="Restart"
          cancelLabel="Keep playing"
          onConfirm={() => {
            setConfirmRestart(false);
            setSession({ ...session, createdAt: Date.now() });
            prevItems.current = 0;
            dispatch({ type: "BEGIN", def, p: newProgress(def) });
          }}
          onCancel={() => setConfirmRestart(false)}
        />
      )}

      {drag && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          <span className="text-4xl">{drag.item.emoji}</span>
          {dragTargetName && <span className="drag-hint">Use on the {dragTargetName}</span>}
        </div>
      )}
    </main>
  );
}
