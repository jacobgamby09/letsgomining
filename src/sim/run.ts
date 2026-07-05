import { MATERIALS, WORKER_BASE, type Resource } from "./balance";
import { generateMine, tileAt, type Cell, type Material, type MineGrid } from "./grid";
import { INTENT_WEIGHTS, selectPlan, type Intent, type Plan } from "./intents";

/** Damage stage a tile enters after a swing, mapping to the cracked art frames. */
export type DamageStage = "cracked_1" | "cracked_2" | "near_break";

export type RunEndReason = "exhausted" | "cleared";

export type RunEvent =
  | {
      type: "walked";
      atMs: number;
      durationMs: number;
      from: Cell;
      to: Cell;
      staminaLeft: number;
    }
  | {
      type: "tileDamaged";
      atMs: number;
      durationMs: number;
      worker: Cell;
      target: Cell;
      stage: DamageStage;
      hpLeft: number;
      staminaLeft: number;
    }
  | {
      type: "tileBroken";
      atMs: number;
      durationMs: number;
      worker: Cell;
      target: Cell;
      material: Material;
      yields: Resource | null;
      staminaLeft: number;
    }
  | { type: "runEnded"; atMs: number; reason: RunEndReason; totals: RunTotals };

export interface RunTotals {
  resources: Record<Resource, number>;
  tilesBroken: number;
  /** Deepest row a tile was broken in; -1 if none. */
  maxDepth: number;
  durationMs: number;
}

export interface RunConfig {
  width: number;
  height: number;
  seed: number;
  intent: Intent;
  /** Upgrade overrides; defaults come from WORKER_BASE. */
  stamina?: number;
  power?: number;
}

type Action =
  | { kind: "walk"; to: Cell; startedAt: number; endsAt: number }
  | { kind: "swing"; target: Cell; startedAt: number; endsAt: number };

/**
 * One mining run, simulated in milliseconds. Pure logic: the scene layer
 * ticks it in real time and animates the emitted events; tests run it to
 * completion instantly. Deterministic for a given config.
 */
export class RunSim {
  readonly grid: MineGrid;
  readonly intent: Intent;

  private readonly power: number;
  private stamina: number;
  private workerPos: Cell;
  private readonly cleared = new Set<string>();
  private readonly damage = new Map<string, number>();
  private action: Action | null = null;
  private plan: Plan | null = null;
  private now = 0;
  private ended = false;
  private readonly totals: RunTotals = {
    resources: { stone: 0, copper: 0, iron: 0 },
    tilesBroken: 0,
    maxDepth: -1,
    durationMs: 0,
  };

  constructor(config: RunConfig) {
    this.grid = generateMine(config.width, config.height, config.seed);
    this.intent = config.intent;
    this.stamina = config.stamina ?? WORKER_BASE.stamina;
    this.power = config.power ?? WORKER_BASE.power;
    this.workerPos = { x: Math.floor(config.width / 2), y: -1 };
  }

  get done(): boolean {
    return this.ended;
  }

  get worker(): Cell {
    return { ...this.workerPos };
  }

  get staminaLeft(): number {
    return this.stamina;
  }

  isCleared(x: number, y: number): boolean {
    return this.cleared.has(`${x},${y}`);
  }

  hpAt(x: number, y: number): number {
    const tile = tileAt(this.grid, x, y);
    if (!tile) return 0;
    return this.damage.get(`${x},${y}`) ?? MATERIALS[tile.material].hp;
  }

  /** Advance the run by dtMs, returning every event that completed. */
  tick(dtMs: number): RunEvent[] {
    const events: RunEvent[] = [];
    const targetTime = this.now + dtMs;
    while (!this.ended) {
      if (!this.action) {
        this.startNextAction(events);
        if (this.ended) break;
      }
      if (!this.action || this.action.endsAt > targetTime) break;
      this.now = this.action.endsAt;
      this.resolveAction(this.action, events);
      this.action = null;
    }
    if (!this.ended) this.now = targetTime;
    return events;
  }

  private startNextAction(events: RunEvent[]): void {
    if (!this.plan) {
      this.plan = selectPlan({
        grid: this.grid,
        worker: this.workerPos,
        power: this.power,
        weights: INTENT_WEIGHTS[this.intent],
        isCleared: (x, y) => this.isCleared(x, y),
        hpAt: (x, y) => this.hpAt(x, y),
      });
      if (!this.plan) {
        this.endRun("cleared", events);
        return;
      }
    }

    const step = this.plan.path.length > 0;
    const cost = step ? WORKER_BASE.moveStamina : WORKER_BASE.swingStamina;
    if (this.stamina < cost) {
      this.endRun("exhausted", events);
      return;
    }
    this.stamina -= cost;

    if (step) {
      const to = this.plan.path.shift()!;
      this.action = { kind: "walk", to, startedAt: this.now, endsAt: this.now + WORKER_BASE.walkMs };
    } else {
      this.action = {
        kind: "swing",
        target: this.plan.target,
        startedAt: this.now,
        endsAt: this.now + WORKER_BASE.swingMs,
      };
    }
  }

  private resolveAction(action: Action, events: RunEvent[]): void {
    if (action.kind === "walk") {
      const from = this.workerPos;
      this.workerPos = action.to;
      events.push({
        type: "walked",
        atMs: this.now,
        durationMs: WORKER_BASE.walkMs,
        from,
        to: { ...action.to },
        staminaLeft: this.stamina,
      });
      return;
    }

    const { target } = action;
    const key = `${target.x},${target.y}`;
    const material = tileAt(this.grid, target.x, target.y)!.material;
    const hpLeft = this.hpAt(target.x, target.y) - this.power;

    if (hpLeft <= 0) {
      this.damage.delete(key);
      this.cleared.add(key);
      this.plan = null;
      const yields = MATERIALS[material].yields;
      if (yields) this.totals.resources[yields] += 1;
      this.totals.tilesBroken += 1;
      this.totals.maxDepth = Math.max(this.totals.maxDepth, target.y);
      events.push({
        type: "tileBroken",
        atMs: this.now,
        durationMs: WORKER_BASE.swingMs,
        worker: { ...this.workerPos },
        target: { ...target },
        material,
        yields,
        staminaLeft: this.stamina,
      });
    } else {
      this.damage.set(key, hpLeft);
      events.push({
        type: "tileDamaged",
        atMs: this.now,
        durationMs: WORKER_BASE.swingMs,
        worker: { ...this.workerPos },
        target: { ...target },
        stage: damageStage(hpLeft, MATERIALS[material].hp),
        hpLeft,
        staminaLeft: this.stamina,
      });
    }
  }

  private endRun(reason: RunEndReason, events: RunEvent[]): void {
    this.ended = true;
    this.totals.durationMs = this.now;
    events.push({ type: "runEnded", atMs: this.now, reason, totals: { ...this.totals } });
  }
}

export function damageStage(hpLeft: number, maxHp: number): DamageStage {
  const ratio = hpLeft / maxHp;
  if (ratio > 0.6) return "cracked_1";
  if (ratio > 0.3) return "cracked_2";
  return "near_break";
}

/** Run a sim to completion instantly (for tests and balance checks). */
export function runToEnd(sim: RunSim, stepMs = 250, capMs = 600_000): RunEvent[] {
  const events: RunEvent[] = [];
  let elapsed = 0;
  while (!sim.done) {
    events.push(...sim.tick(stepMs));
    elapsed += stepMs;
    if (elapsed > capMs) throw new Error(`run did not terminate within ${capMs}ms of sim time`);
  }
  return events;
}
