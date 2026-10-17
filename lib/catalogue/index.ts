import type { AdventureDef } from "../engine/types";
import { validateAdventure } from "../engine/validate";

/** Raw room definitions shipped with the app (JSON). Filled in by the catalogue slice. */
const RAW: unknown[] = [];

/** Only rooms that pass the full validator (schema, references, solver, no lock bypass) are offered. */
export const CATALOGUE: AdventureDef[] = RAW.flatMap((raw) => {
  const check = validateAdventure(raw);
  if (check.ok && check.def.kind === "catalogue") return [check.def];
  console.error("[catalogue] rejected a room:", check.ok ? "not a catalogue room" : check.reasons);
  return [];
});

export function catalogueRoom(id: string): AdventureDef | undefined {
  return CATALOGUE.find((r) => r.id === id);
}
