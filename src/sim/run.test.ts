import { describe, expect, it } from "vitest";
import { runToEnd, RunSim, type RunEvent } from "./run";

const GRID = { width: 20, height: 40 };

function earlyRun(seed: number): RunSim {
  return new RunSim({ ...GRID, seed, intent: "balanced" });
}

function endEvent(events: RunEvent[]) {
  const last = events.at(-1);
  if (last?.type !== "runEnded") throw new Error("run produced no runEnded event");
  return last;
}

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

describe("early balanced runs (base stats, no upgrades)", () => {
  const runs = SEEDS.map((seed) => {
    const events = runToEnd(earlyRun(seed));
    return { seed, events, end: endEvent(events) };
  });

  it("last roughly 15-30 seconds (GDD 2.0 run-length target)", () => {
    const durations = runs.map((r) => r.end.totals.durationMs);
    for (const duration of durations) {
      expect(duration).toBeGreaterThanOrEqual(12_000);
      expect(duration).toBeLessThanOrEqual(35_000);
    }
    const average = durations.reduce((a, b) => a + b, 0) / durations.length;
    expect(average).toBeGreaterThanOrEqual(15_000);
    expect(average).toBeLessThanOrEqual(30_000);
  });

  it("end because stamina runs out, not because the mine is empty", () => {
    for (const run of runs) {
      expect(run.end.reason).toBe("exhausted");
    }
  });

  it("collect resources on every run", () => {
    for (const run of runs) {
      const { stone, copper, iron } = run.end.totals.resources;
      expect(stone + copper + iron).toBeGreaterThan(0);
    }
  });

  it("never break hardstone at base power (the gate holds)", () => {
    for (const run of runs) {
      const hardstoneBreaks = run.events.filter(
        (e) => e.type === "tileBroken" && e.material === "hardstone",
      );
      expect(hardstoneBreaks).toHaveLength(0);
    }
  });

  it("always pay out matching resources for copper and iron", () => {
    for (const run of runs) {
      for (const event of run.events) {
        if (event.type !== "tileBroken") continue;
        if (event.material === "copper") expect(event.yields).toBe("copper");
        if (event.material === "iron") expect(event.yields).toBe("iron");
      }
    }
  });
});

describe("simulation invariants", () => {
  it("is deterministic: same seed and intent produce identical event logs", () => {
    const a = runToEnd(new RunSim({ ...GRID, seed: 7, intent: "balanced" }));
    const b = runToEnd(new RunSim({ ...GRID, seed: 7, intent: "balanced" }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("never lets stamina go negative", () => {
    for (const seed of SEEDS) {
      const sim = earlyRun(seed);
      while (!sim.done) {
        sim.tick(100);
        expect(sim.staminaLeft).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("emits damage stages in a sane order before a break", () => {
    const events = runToEnd(earlyRun(3));
    const order = { cracked_1: 0, cracked_2: 1, near_break: 2 };
    const lastStage = new Map<string, number>();
    for (const event of events) {
      if (event.type === "tileDamaged") {
        const key = `${event.target.x},${event.target.y}`;
        const stage = order[event.stage];
        const previous = lastStage.get(key) ?? -1;
        expect(stage).toBeGreaterThanOrEqual(previous);
        lastStage.set(key, stage);
      }
    }
  });

  it("keeps the worker inside cleared cells or on the surface row", () => {
    for (const seed of SEEDS.slice(0, 5)) {
      const sim = earlyRun(seed);
      while (!sim.done) {
        for (const event of sim.tick(100)) {
          if (event.type === "walked") {
            const { x, y } = event.to;
            expect(y === -1 || sim.isCleared(x, y)).toBe(true);
          }
        }
      }
    }
  });

  it("gives more stamina a longer run (upgrade hook works)", () => {
    const base = endEvent(runToEnd(new RunSim({ ...GRID, seed: 11, intent: "balanced" })));
    const upgraded = endEvent(
      runToEnd(new RunSim({ ...GRID, seed: 11, intent: "balanced", stamina: 150 })),
    );
    expect(upgraded.totals.durationMs).toBeGreaterThan(base.totals.durationMs);
    expect(upgraded.totals.tilesBroken).toBeGreaterThan(base.totals.tilesBroken);
  });

  it("lets higher power break hardstone (the gate opens with upgrades)", () => {
    const events = runToEnd(
      new RunSim({ ...GRID, seed: 5, intent: "pushDepth", power: 3, stamina: 400 }),
    );
    const materials = new Set(
      events.filter((e) => e.type === "tileBroken").map((e) => e.material),
    );
    expect(materials.has("hardstone")).toBe(true);
  });
});
