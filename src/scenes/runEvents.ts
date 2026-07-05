import type { Resource } from "../sim/balance";
import type { Intent } from "../sim/intents";
import type { RunEndReason, RunTotals } from "../sim/run";

export const INTENT_LABELS: Record<Intent, string> = {
  balanced: "Balanced",
  pushDepth: "Push Depth",
  harvest: "Harvest",
};

export const INTENT_DESCRIPTIONS: Record<Intent, string> = {
  balanced: "Steady mix of loot and progress",
  pushDepth: "Dig deep, ignore most loot",
  harvest: "Hunt the richest ore nearby",
};

/**
 * Game-level events the MineScene emits while playing back a run, consumed
 * by the HudScene. Emitted on `game.events` so scene restarts cannot leave
 * stale scene-level listeners behind.
 */
export const RUN_EVENTS = {
  started: "run:started",
  loot: "run:loot",
  stamina: "run:stamina",
  ended: "run:ended",
} as const;

export interface RunStartedPayload {
  intent: Intent;
  run: number;
}

export interface LootPayload {
  resource: Resource;
  /** Canvas-space coordinates where the loot icon should spawn. */
  screenX: number;
  screenY: number;
}

export interface StaminaPayload {
  /** 0-1 share of starting stamina remaining. */
  fraction: number;
}

export interface EndedPayload {
  reason: RunEndReason;
  totals: RunTotals;
}
