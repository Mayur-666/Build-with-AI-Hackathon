"use client";

import { useEffect, useState } from "react";

/**
 * All sound is synthesized with the Web Audio API — no files to load or license.
 * Everything is OFF until the player turns it on (and the AudioContext is only created then,
 * from that click, so browsers allow it). Preferences live in localStorage.
 */

export type Sfx = "inspect" | "collect" | "discovery" | "unlock" | "wrong" | "locked" | "hint" | "dial" | "escape";
type Prefs = { sfx: boolean; music: boolean };

const PREFS_KEY = "pocketDungeon.sound";
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; // C major pentatonic, bell-ish register
const THROTTLE_MS: Partial<Record<Sfx, number>> = { inspect: 140, dial: 45, wrong: 250, locked: 250 };

function readPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    const p = raw ? JSON.parse(raw) : null;
    return { sfx: p?.sfx === true, music: p?.music === true };
  } catch {
    return { sfx: false, music: false };
  }
}

class SoundSystem {
  prefs: Prefs = { sfx: false, music: false };
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private last: Partial<Record<Sfx, number>> = {};
  private musicTimer: ReturnType<typeof setTimeout> | null = null;
  private drone: { stop: () => void } | null = null;
  private listeners = new Set<() => void>();
  private loaded = false;

  load() {
    if (this.loaded || typeof window === "undefined") return;
    this.loaded = true;
    // Saved "on" preferences still wait for a click before any audio starts (autoplay rules).
    this.prefs = readPrefs();
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch {
      /* ignore */
    }
    this.listeners.forEach((fn) => fn());
  }

  /** Create the audio graph lazily, from a user gesture. */
  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setSfx(on: boolean) {
    this.prefs = { ...this.prefs, sfx: on };
    if (on) {
      this.ensure();
      this.play("discovery");
    }
    this.emit();
  }

  setMusic(on: boolean) {
    this.prefs = { ...this.prefs, music: on };
    if (on) this.startMusic();
    else this.stopMusic();
    this.emit();
  }

  /** Called on the first click after load, if music was left on last time. */
  resumeFromGesture() {
    if (this.prefs.music && !this.musicTimer) this.startMusic();
    else if (this.prefs.sfx) this.ensure();
  }

  // ── Building blocks ──

  private tone(freq: number, { at = 0, dur = 0.4, type = "sine" as OscillatorType, gain = 0.06, attack = 0.01, glideTo }: { at?: number; dur?: number; type?: OscillatorType; gain?: number; attack?: number; glideTo?: number } = {}) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noise({ at = 0, dur = 0.05, gain = 0.05, freq = 2000 }: { at?: number; dur?: number; gain?: number; freq?: number } = {}) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + at;
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(this.master!);
    src.start(t);
  }

  // ── Effects ──

  play(name: Sfx) {
    if (!this.prefs.sfx) return;
    const now = performance.now();
    const wait = THROTTLE_MS[name] ?? 80;
    if (now - (this.last[name] ?? -1e9) < wait) return;
    this.last[name] = now;
    if (!this.ensure()) return;
    const pick = () => PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
    switch (name) {
      case "inspect":
        this.tone(pick(), { dur: 0.5, gain: 0.045 });
        this.tone(pick() * 2, { dur: 0.3, gain: 0.015, at: 0.01 });
        break;
      case "collect":
        [659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, { at: i * 0.07, dur: 0.35, type: "triangle", gain: 0.05 }));
        break;
      case "discovery":
        [1318.5, 1760, 2093].forEach((f, i) => this.tone(f, { at: i * 0.05, dur: 0.4, gain: 0.025 }));
        break;
      case "unlock":
        this.noise({ dur: 0.04, gain: 0.08, freq: 3000 });
        this.noise({ at: 0.09, dur: 0.05, gain: 0.07, freq: 1800 });
        [523.25, 659.25, 783.99].forEach((f) => this.tone(f, { at: 0.15, dur: 1.1, gain: 0.04, attack: 0.03 }));
        break;
      case "wrong":
        this.tone(330, { dur: 0.35, type: "triangle", gain: 0.05, glideTo: 196 });
        break;
      case "locked":
        this.tone(120, { dur: 0.18, gain: 0.08, glideTo: 80 });
        this.noise({ dur: 0.06, gain: 0.05, freq: 600 });
        break;
      case "hint":
        this.tone(392, { dur: 0.35, gain: 0.04, attack: 0.04 });
        this.tone(329.63, { at: 0.32, dur: 0.5, gain: 0.04, attack: 0.04 });
        break;
      case "dial":
        this.noise({ dur: 0.015, gain: 0.05, freq: 4500 });
        break;
      case "escape":
        [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => this.tone(f, { at: i * 0.11, dur: 0.9, type: "triangle", gain: 0.045 }));
        [1046.5, 1318.5, 1567.98].forEach((f) => this.tone(f, { at: 0.75, dur: 2, gain: 0.025, attack: 0.2 }));
        break;
    }
  }

  // ── Music: a slow, sparse music box over a soft drone ──

  private startMusic() {
    if (!this.ensure() || this.musicTimer) return;
    const ctx = this.ctx!;
    const pad = (freq: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.value = 0.012;
      lfo.frequency.value = 0.07;
      lfoGain.gain.value = 0.008;
      lfo.connect(lfoGain).connect(g.gain);
      osc.connect(g).connect(this.master!);
      osc.start();
      lfo.start();
      return () => {
        g.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
        osc.stop(ctx.currentTime + 2);
        lfo.stop(ctx.currentTime + 2);
      };
    };
    const stops = [pad(130.81), pad(196), pad(261.63 * 1.003)];
    this.drone = { stop: () => stops.forEach((s) => s()) };
    const melody = [523.25, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 523.25, 440, 523.25];
    let i = 0;
    const next = () => {
      if (!this.prefs.music) return;
      const f = melody[i % melody.length] * (Math.random() < 0.15 ? 2 : 1);
      this.tone(f, { dur: 2.2, gain: 0.018, attack: 0.005 });
      if (Math.random() < 0.35) this.tone(f * 1.5, { at: 0.18, dur: 1.6, gain: 0.008 });
      i += Math.random() < 0.8 ? 1 : 2;
      this.musicTimer = setTimeout(next, 900 + Math.random() * 1300);
    };
    this.musicTimer = setTimeout(next, 300);
  }

  private stopMusic() {
    if (this.musicTimer) clearTimeout(this.musicTimer);
    this.musicTimer = null;
    this.drone?.stop();
    this.drone = null;
  }
}

export const sound = new SoundSystem();

/** React access to the sound preferences (re-renders when they change). */
export function useSound() {
  const [prefs, setPrefs] = useState<Prefs>({ sfx: false, music: false });
  useEffect(() => {
    sound.load();
    setPrefs(sound.prefs);
    const unsub = sound.subscribe(() => setPrefs({ ...sound.prefs }));
    const onFirstClick = () => sound.resumeFromGesture();
    window.addEventListener("pointerdown", onFirstClick, { once: true });
    return () => {
      unsub();
      window.removeEventListener("pointerdown", onFirstClick);
    };
  }, []);
  return prefs;
}
