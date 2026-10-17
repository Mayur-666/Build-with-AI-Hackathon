import { describe, expect, it } from "vitest";
import { createSolution } from "../lib/game/solution";

describe("createSolution", () => {
  it("always produces a consistent, solvable plan", () => {
    for (let i = 0; i < 500; i++) {
      const s = createSolution();
      expect(s.clueHolder).not.toBe(s.keyHolder);
      expect([...s.order].sort()).toEqual(["a", "b", "c"]);
      for (const d of Object.values(s.digits)) {
        expect(Number.isInteger(d) && d >= 0 && d <= 9).toBe(true);
      }
      expect(s.code).toBe(s.order.map((id) => s.digits[id]).join(""));
      expect(s.code).toMatch(/^[0-9]{3}$/);
    }
  });

  it("is deterministic for a given random source", () => {
    const seq = (vals: number[]) => {
      let i = 0;
      return () => vals[i++ % vals.length];
    };
    const vals = [0.1, 0.5, 0.9, 0.3, 0.7, 0.2, 0.8];
    expect(createSolution(seq(vals))).toEqual(createSolution(seq(vals)));
  });
});
