import type { Material } from "./grid";

/**
 * Every gameplay-tunable number lives here so balance passes touch one file.
 * Stamina costs are integers to keep the simulation exact and deterministic.
 */

export type Resource = "stone" | "copper" | "iron";

export interface MaterialBalance {
  /** Swings-to-break at power 1. */
  hp: number;
  /** Planner desire, not economy price. Drives intent target scoring. */
  value: number;
  yields: Resource | null;
}

export const MATERIALS: Record<Material, MaterialBalance> = {
  dirt: { hp: 2, value: 0.15, yields: null },
  stone: { hp: 4, value: 1, yields: "stone" },
  copper: { hp: 6, value: 3, yields: "copper" },
  hardstone: { hp: 14, value: 0.05, yields: "stone" },
  iron: { hp: 8, value: 5, yields: "iron" },
};

export const WORKER_BASE = {
  stamina: 100,
  power: 1,
  moveStamina: 1,
  swingStamina: 3,
  walkMs: 260,
  swingMs: 450,
};
