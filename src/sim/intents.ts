import { MATERIALS } from "./balance";
import { WORKER_BASE } from "./balance";
import type { Cell, MineGrid } from "./grid";
import { tileAt } from "./grid";

/**
 * The player's pre-run choice. The planner turns it into target scoring
 * weights; the worker itself has no other decision-making.
 */
export type Intent = "balanced" | "pushDepth" | "harvest";

export interface IntentWeights {
  /** How much the material's value attracts the worker. */
  value: number;
  /** Reward per row of target depth. */
  depth: number;
  /** Penalty per point of stamina the target costs to reach and break. */
  cost: number;
}

export const INTENT_WEIGHTS: Record<Intent, IntentWeights> = {
  balanced: { value: 1.0, depth: 0.25, cost: 0.12 },
  pushDepth: { value: 0.3, depth: 1.0, cost: 0.08 },
  harvest: { value: 1.6, depth: 0.05, cost: 0.15 },
};

export interface Plan {
  /** Cells to walk through, ending on the cell the worker mines from. */
  path: Cell[];
  /** The solid tile to break, 4-adjacent to the last path cell (or to the worker if path is empty). */
  target: Cell;
}

export interface PlanInput {
  grid: MineGrid;
  worker: Cell;
  power: number;
  weights: IntentWeights;
  /** True for cells the worker can stand in (broken tiles). Surface row y=-1 is always walkable. */
  isCleared: (x: number, y: number) => boolean;
  /** Remaining hp of a solid tile (accounts for damage dealt earlier in the run). */
  hpAt: (x: number, y: number) => number;
}

const NEIGHBORS = [
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

interface Candidate {
  target: Cell;
  approach: Cell;
  dist: number;
}

/**
 * Pick the best mining target reachable through already-cleared cells.
 * BFS from the worker gives shortest walking distance; every solid tile
 * touching a reachable cell is a candidate, scored by the intent weights.
 * Deterministic: ties break on distance, then depth, then x.
 */
export function selectPlan(input: PlanInput): Plan | null {
  const { grid, worker, power, weights, isCleared, hpAt } = input;
  const key = (x: number, y: number) => `${x},${y}`;
  const walkable = (x: number, y: number) =>
    x >= 0 && x < grid.width && (y === -1 ? true : y >= 0 && y < grid.height && isCleared(x, y));

  const parent = new Map<string, Cell | null>();
  const dist = new Map<string, number>();
  const startKey = key(worker.x, worker.y);
  parent.set(startKey, null);
  dist.set(startKey, 0);
  const queue: Cell[] = [worker];

  const candidates = new Map<string, Candidate>();

  while (queue.length > 0) {
    const cell = queue.shift()!;
    const cellDist = dist.get(key(cell.x, cell.y))!;
    for (const { dx, dy } of NEIGHBORS) {
      const nx = cell.x + dx;
      const ny = cell.y + dy;
      const nKey = key(nx, ny);
      if (walkable(nx, ny)) {
        if (!dist.has(nKey)) {
          dist.set(nKey, cellDist + 1);
          parent.set(nKey, cell);
          queue.push({ x: nx, y: ny });
        }
      } else if (ny >= 0 && ny < grid.height && nx >= 0 && nx < grid.width) {
        // Solid tile adjacent to a reachable cell: minable from `cell`.
        // BFS order guarantees the first approach found is the closest.
        if (!candidates.has(nKey)) {
          candidates.set(nKey, { target: { x: nx, y: ny }, approach: cell, dist: cellDist });
        }
      }
    }
  }

  let best: Candidate | null = null;
  let bestScore = -Infinity;
  for (const candidate of candidates.values()) {
    const tile = tileAt(grid, candidate.target.x, candidate.target.y)!;
    const swings = Math.ceil(hpAt(candidate.target.x, candidate.target.y) / power);
    const staminaCost =
      candidate.dist * WORKER_BASE.moveStamina + swings * WORKER_BASE.swingStamina;
    const score =
      weights.value * MATERIALS[tile.material].value +
      weights.depth * (candidate.target.y + 1) -
      weights.cost * staminaCost;
    if (
      score > bestScore ||
      (score === bestScore &&
        best !== null &&
        (candidate.dist < best.dist ||
          (candidate.dist === best.dist &&
            (candidate.target.y > best.target.y ||
              (candidate.target.y === best.target.y && candidate.target.x < best.target.x)))))
    ) {
      best = candidate;
      bestScore = score;
    }
  }

  if (!best) return null;

  const path: Cell[] = [];
  let walk: Cell | null = best.approach;
  while (walk && !(walk.x === worker.x && walk.y === worker.y)) {
    path.push(walk);
    walk = parent.get(key(walk.x, walk.y)) ?? null;
  }
  path.reverse();
  return { path, target: best.target };
}
