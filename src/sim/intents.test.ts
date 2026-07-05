import { describe, expect, it } from "vitest";
import type { Intent } from "./intents";
import { runToEnd, RunSim, type RunTotals } from "./run";

/**
 * Locks in that the three intents are meaningfully different (GDD 2.0 open
 * question 3). Seeds are fixed, so these are deterministic; the margins exist
 * to catch regressions that would blur the intent identities.
 */

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

interface Stage {
  power: number;
  stamina: number;
  startDepth: number;
}

const BASE: Stage = { power: 1, stamina: 100, startDepth: 0 };
const MID: Stage = { power: 2, stamina: 150, startDepth: 3 };
const LATE: Stage = { power: 3, stamina: 200, startDepth: 9 };

function lootValue(totals: RunTotals): number {
  const { stone, copper, iron } = totals.resources;
  return stone + copper * 3 + iron * 5;
}

function averages(intent: Intent, stage: Stage) {
  let depth = 0;
  let value = 0;
  let copper = 0;
  let iron = 0;
  let durationMs = 0;
  for (const seed of SEEDS) {
    const events = runToEnd(
      new RunSim({ width: 20, height: 40, seed, intent, ...stage }),
    );
    const end = events.at(-1);
    if (end?.type !== "runEnded") throw new Error("run produced no runEnded event");
    depth += end.totals.maxDepth;
    value += lootValue(end.totals);
    copper += end.totals.resources.copper;
    iron += end.totals.resources.iron;
    durationMs += end.totals.durationMs;
  }
  const n = SEEDS.length;
  return {
    depth: depth / n,
    value: value / n,
    copper: copper / n,
    iron: iron / n,
    durationMs: durationMs / n,
  };
}

describe("intent identities", () => {
  const base = {
    balanced: averages("balanced", BASE),
    pushDepth: averages("pushDepth", BASE),
    harvest: averages("harvest", BASE),
  };
  const mid = {
    balanced: averages("balanced", MID),
    pushDepth: averages("pushDepth", MID),
    harvest: averages("harvest", MID),
  };
  const late = {
    balanced: averages("balanced", LATE),
    pushDepth: averages("pushDepth", LATE),
    harvest: averages("harvest", LATE),
  };

  it("push depth digs deeper than balanced, harvest stays shallowest", () => {
    expect(base.pushDepth.depth).toBeGreaterThan(base.balanced.depth + 1);
    expect(base.balanced.depth).toBeGreaterThan(base.harvest.depth + 1);
    expect(mid.pushDepth.depth).toBeGreaterThan(mid.balanced.depth + 2);
    expect(late.pushDepth.depth).toBeGreaterThan(late.balanced.depth + 5);
  });

  it("harvest collects the most value, push depth sacrifices loot", () => {
    expect(base.harvest.value).toBeGreaterThan(base.balanced.value + 0.5);
    expect(mid.harvest.value).toBeGreaterThan(mid.balanced.value + 1);
    expect(late.harvest.value).toBeGreaterThan(late.balanced.value + 3);
    expect(base.pushDepth.value).toBeLessThan(base.balanced.value - 1);
    expect(late.pushDepth.value).toBeLessThan(late.harvest.value - 5);
  });

  it("harvest out-mines balanced on copper once the mine opens up", () => {
    expect(mid.harvest.copper).toBeGreaterThan(mid.balanced.copper + 1);
    expect(late.harvest.copper).toBeGreaterThan(late.balanced.copper + 2);
  });

  it("only push depth farms iron below the gate late game", () => {
    expect(late.pushDepth.iron).toBeGreaterThan(1);
    expect(late.pushDepth.iron).toBeGreaterThan(late.balanced.iron + 1);
    expect(late.pushDepth.iron).toBeGreaterThan(late.harvest.iron + 1);
  });

  it("keeps base-stat run lengths in the GDD band for every intent", () => {
    for (const intent of ["balanced", "pushDepth", "harvest"] as const) {
      const avg = base[intent].durationMs;
      expect(avg).toBeGreaterThanOrEqual(12_000);
      expect(avg).toBeLessThanOrEqual(30_000);
    }
  });
});
