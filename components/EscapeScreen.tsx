"use client";

import type { Room } from "@/lib/game/types";

type Props = { room: Room; onNewRoom: () => void };

export function EscapeScreen({ room, onNewRoom }: Props) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl text-gold">You escaped!</h1>
      <p className="text-ink/90">{room.escapeText}</p>
      <div className="rounded-xl border border-gold px-6 py-3">
        <p className="text-sm text-ink/60">Room code</p>
        <p className="font-mono text-2xl tracking-widest text-candle">{room.roomCode}</p>
      </div>
      <button onClick={onNewRoom} className="rounded-lg bg-gold px-4 py-3 font-semibold text-midnight">
        New room
      </button>
    </main>
  );
}
