import type { Resource } from "./balance";

/**
 * Upgrade economy: few upgrades, obvious effects (GDD 2.0 "Upgrades").
 * Pure data + functions so pacing is testable by simulating run->buy loops.
 */

export type UpgradeId = "pickaxe" | "stamina" | "elevator";

export type Wallet = Record<Resource, number>;

/** Purchases owned per upgrade; level N means costs[0..N-1] have been paid. */
export type UpgradeLevels = Record<UpgradeId, number>;

export type Cost = Partial<Record<Resource, number>>;

export interface UpgradeDef {
  name: string;
  /** GDD-style promise of what the player will feel next run. */
  tagline: string;
  /** costs[i] is the price of going from level i to i+1. */
  costs: Cost[];
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  pickaxe: {
    name: "Pickaxe",
    tagline: "Breaks tiles faster",
    costs: [{ copper: 4 }, { copper: 10 }, { iron: 8 }],
  },
  stamina: {
    name: "Stamina",
    tagline: "Lasts longer",
    costs: [{ stone: 4 }, { stone: 10 }, { stone: 18 }, { stone: 30 }],
  },
  elevator: {
    name: "Elevator",
    tagline: "Starts deeper",
    costs: [
      { stone: 6, copper: 2 },
      { stone: 14, copper: 6 },
      { stone: 20, iron: 10 },
    ],
  },
};

export const UPGRADE_IDS: UpgradeId[] = ["pickaxe", "stamina", "elevator"];

/** What a run actually uses; derived from owned upgrade levels. */
export interface RunEffects {
  power: number;
  stamina: number;
  /** Rows of pre-cleared elevator shaft; the worker starts at its bottom. */
  startDepth: number;
}

export function effectsFor(levels: UpgradeLevels): RunEffects {
  return {
    power: 1 + levels.pickaxe,
    stamina: 100 + 25 * levels.stamina,
    startDepth: 3 * levels.elevator,
  };
}

export function emptyWallet(): Wallet {
  return { stone: 0, copper: 0, iron: 0 };
}

export function baseLevels(): UpgradeLevels {
  return { pickaxe: 0, stamina: 0, elevator: 0 };
}

export function addLoot(wallet: Wallet, loot: Wallet): Wallet {
  return {
    stone: wallet.stone + loot.stone,
    copper: wallet.copper + loot.copper,
    iron: wallet.iron + loot.iron,
  };
}

export function nextCost(id: UpgradeId, levels: UpgradeLevels): Cost | null {
  return UPGRADES[id].costs[levels[id]] ?? null;
}

export function isMaxed(id: UpgradeId, levels: UpgradeLevels): boolean {
  return nextCost(id, levels) === null;
}

export function canAfford(wallet: Wallet, cost: Cost): boolean {
  return Object.entries(cost).every(
    ([resource, amount]) => wallet[resource as Resource] >= amount,
  );
}

/** Returns the post-purchase state, or null if maxed/unaffordable. */
export function tryPurchase(
  wallet: Wallet,
  levels: UpgradeLevels,
  id: UpgradeId,
): { wallet: Wallet; levels: UpgradeLevels } | null {
  const cost = nextCost(id, levels);
  if (!cost || !canAfford(wallet, cost)) return null;
  const nextWallet = { ...wallet };
  for (const [resource, amount] of Object.entries(cost)) {
    nextWallet[resource as Resource] -= amount;
  }
  return { wallet: nextWallet, levels: { ...levels, [id]: levels[id] + 1 } };
}
