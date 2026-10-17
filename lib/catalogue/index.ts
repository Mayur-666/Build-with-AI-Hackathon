import type { AdventureDef } from "../engine/types";
import { validateAdventure } from "../engine/validate";
import clockmaker from "./rooms/clockmakers-last-hour.json";
import library from "./rooms/midnight-library.json";
import greenhouse from "./rooms/sleeping-greenhouse.json";

/** Room definitions shipped with the app, as JSON, in catalogue order. */
export const RAW_CATALOGUE: unknown[] = [library, clockmaker, greenhouse];

/** Only rooms that pass the full validator (schema, references, solver, no lock bypass) are offered. */
export const CATALOGUE: AdventureDef[] = RAW_CATALOGUE.flatMap((raw) => {
  const check = validateAdventure(raw);
  if (check.ok && check.def.kind === "catalogue") return [check.def];
  console.error("[catalogue] rejected a room:", check.ok ? "not a catalogue room" : check.reasons);
  return [];
});

export function catalogueRoom(id: string): AdventureDef | undefined {
  return CATALOGUE.find((r) => r.id === id);
}
