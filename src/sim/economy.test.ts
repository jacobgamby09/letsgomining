import { describe, expect, it } from "vitest";
import {
  addLoot,
  baseLevels,
  canAfford,
  effectsFor,
  emptyWallet,
  nextCost,
  tryPurchase,
  UPGRADE_IDS,
  UPGRADES,
} from "./economy";
import { runToEnd, RunSim, type RunEvent } from "./run";

const GRID = { width: 20, height: 40 };

function endEvent(events: RunEvent[]) {
  const last = events.at(-1);
  if (last?.type !== "runEnded") throw new Error("run produced no runEnded event");
  return last;
}

describe("purchases", () => {
  it("rejects purchases the wallet cannot cover", () => {
    expect(tryPurchase(emptyWallet(), baseLevels(), "pickaxe")).toBeNull();
  });

  it("deducts cost and raises the level", () => {
    const wallet = { stone: 0, copper: 5, iron: 0 };
    const result = tryPurchase(wallet, baseLevels(), "pickaxe");
    expect(result).not.toBeNull();
    expect(result!.wallet.copper).toBe(1);
    expect(result!.levels.pickaxe).toBe(1);
    expect(wallet.copper).toBe(5);
  });

  it("stops at max level", () => {
    const rich = { stone: 999, copper: 999, iron: 999 };
    let levels = baseLevels();
    for (let i = 0; i < UPGRADES.pickaxe.costs.length; i++) {
      const result = tryPurchase(rich, levels, "pickaxe");
      expect(result).not.toBeNull();
      levels = result!.levels;
    }
    expect(nextCost("pickaxe", levels)).toBeNull();
    expect(tryPurchase(rich, levels, "pickaxe")).toBeNull();
  });

  it("maps levels to run effects", () => {
    expect(effectsFor(baseLevels())).toEqual({ power: 1, stamina: 100, startDepth: 0 });
    expect(effectsFor({ pickaxe: 2, stamina: 3, elevator: 1 })).toEqual({
      power: 3,
      stamina: 175,
      startDepth: 3,
    });
  });
});

describe("upgrades change runs in the promised direction", () => {
  it("higher power breaks more tiles with the same stamina", () => {
    const seeds = [21, 22, 23, 24, 25];
    let baseTiles = 0;
    let upgradedTiles = 0;
    for (const seed of seeds) {
      baseTiles += endEvent(
        runToEnd(new RunSim({ ...GRID, seed, intent: "balanced" })),
      ).totals.tilesBroken;
      upgradedTiles += endEvent(
        runToEnd(new RunSim({ ...GRID, seed, intent: "balanced", power: 2 })),
      ).totals.tilesBroken;
    }
    expect(upgradedTiles).toBeGreaterThan(baseTiles);
  });

  it("elevator start reaches deeper tiles on the same budget", () => {
    const seeds = [31, 32, 33, 34, 35];
    let baseDepth = 0;
    let elevatorDepth = 0;
    for (const seed of seeds) {
      baseDepth += endEvent(
        runToEnd(new RunSim({ ...GRID, seed, intent: "balanced" })),
      ).totals.maxDepth;
      elevatorDepth += endEvent(
        runToEnd(new RunSim({ ...GRID, seed, intent: "balanced", startDepth: 6 })),
      ).totals.maxDepth;
    }
    expect(elevatorDepth).toBeGreaterThan(baseDepth);
  });

  it("elevator shaft itself pays out nothing", () => {
    const sim = new RunSim({ ...GRID, seed: 41, intent: "balanced", startDepth: 6, stamina: 3 });
    // One swing of stamina: the run ends almost immediately; shaft rows must
    // not have produced loot on their own.
    const end = endEvent(runToEnd(sim));
    const { stone, copper, iron } = end.totals.resources;
    expect(stone + copper + iron).toBeLessThanOrEqual(1);
  });
});

describe("progression pacing", () => {
  it("affords the first upgrade within three runs", () => {
    let wallet = emptyWallet();
    for (let run = 0; run < 3; run++) {
      const end = endEvent(runToEnd(new RunSim({ ...GRID, seed: 200 + run, intent: "balanced" })));
      wallet = addLoot(wallet, end.totals.resources);
    }
    const anyAffordable = UPGRADE_IDS.some((id) =>
      canAfford(wallet, nextCost(id, baseLevels())!),
    );
    expect(anyAffordable).toBe(true);
  });

  it("greedy upgrading reaches iron within 20 runs (gate opens via progression)", () => {
    let wallet = emptyWallet();
    let levels = baseLevels();
    let ironTotal = 0;
    let runsUsed = 0;
    for (let run = 0; run < 20 && ironTotal === 0; run++) {
      runsUsed = run + 1;
      const fx = effectsFor(levels);
      const end = endEvent(
        runToEnd(
          new RunSim({
            ...GRID,
            seed: 300 + run,
            intent: "balanced",
            power: fx.power,
            stamina: fx.stamina,
            startDepth: fx.startDepth,
          }),
        ),
      );
      wallet = addLoot(wallet, end.totals.resources);
      ironTotal += end.totals.resources.iron;

      let boughtSomething = true;
      while (boughtSomething) {
        boughtSomething = false;
        for (const id of UPGRADE_IDS) {
          const result = tryPurchase(wallet, levels, id);
          if (result) {
            wallet = result.wallet;
            levels = result.levels;
            boughtSomething = true;
          }
        }
      }
    }
    expect(ironTotal).toBeGreaterThan(0);
    expect(runsUsed).toBeLessThanOrEqual(20);
  });
});
