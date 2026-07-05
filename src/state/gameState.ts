import { baseLevels, emptyWallet, UPGRADES, type UpgradeLevels, type Wallet } from "../sim/economy";
import type { Intent } from "../sim/intents";

/**
 * The persistent camp state between runs. Owned by the view layer;
 * the sim only ever sees derived RunEffects.
 */
export interface GameState {
  wallet: Wallet;
  levels: UpgradeLevels;
  runNumber: number;
  intent: Intent;
}

const STORAGE_KEY = "ndnl-save-v1";
const INTENTS: Intent[] = ["balanced", "pushDepth", "harvest"];

let current: GameState | null = null;

export function getState(): GameState {
  if (!current) current = load();
  return current;
}

export function persist(): void {
  if (!current) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage may be unavailable (private mode); the session still works.
  }
}

export function resetState(): GameState {
  current = fresh();
  persist();
  return current;
}

function fresh(): GameState {
  return { wallet: emptyWallet(), levels: baseLevels(), runNumber: 1, intent: "balanced" };
}

function load(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as GameState;
    return sanitize(parsed);
  } catch {
    return fresh();
  }
}

/** Clamp a possibly stale/hand-edited save back into valid ranges. */
function sanitize(state: GameState): GameState {
  const base = fresh();
  const wallet = { ...base.wallet };
  for (const key of Object.keys(wallet) as (keyof Wallet)[]) {
    const value = state.wallet?.[key];
    wallet[key] = Number.isFinite(value) && value! >= 0 ? Math.floor(value!) : 0;
  }
  const levels = { ...base.levels };
  for (const key of Object.keys(levels) as (keyof UpgradeLevels)[]) {
    const value = state.levels?.[key];
    const max = UPGRADES[key].costs.length;
    levels[key] =
      Number.isFinite(value) && value! >= 0 ? Math.min(Math.floor(value!), max) : 0;
  }
  return {
    wallet,
    levels,
    runNumber:
      Number.isFinite(state.runNumber) && state.runNumber >= 1
        ? Math.floor(state.runNumber)
        : 1,
    intent: INTENTS.includes(state.intent) ? state.intent : "balanced",
  };
}
