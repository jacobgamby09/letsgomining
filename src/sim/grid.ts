import { mulberry32, randInt, type Rng } from "./rng";

export type Material = "dirt" | "stone" | "copper" | "hardstone" | "iron";

export interface Tile {
  material: Material;
  /** Which clean art variant (1-3) this tile renders with. */
  variant: number;
}

export interface MineGrid {
  width: number;
  height: number;
  /** Row-major: tiles[y * width + x]. Row 0 is the surface row. */
  tiles: Tile[];
}

export function tileAt(grid: MineGrid, x: number, y: number): Tile | undefined {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return undefined;
  return grid.tiles[y * grid.width + x];
}

/**
 * Depth bands, in rows from the surface. Layer 1 is warm dirt/stone/copper;
 * a hardstone band gates the transition to the cooler iron layer below
 * (GDD 2.0 "Mine" + visual.md "Layer Progression").
 */
const GATE_START = 12;
const GATE_END = 13;

interface MaterialWeights {
  dirt: number;
  stone: number;
  copper: number;
  hardstone: number;
  iron: number;
}

function weightsForDepth(depth: number): MaterialWeights {
  if (depth < 2) {
    return { dirt: 0.94, stone: 0.06, copper: 0, hardstone: 0, iron: 0 };
  }
  if (depth < 8) {
    // Copper becomes worth detouring for while dirt slowly gives way to stone.
    const stone = 0.1 + (depth - 2) * 0.04;
    return { dirt: 0.78 - stone / 2, stone, copper: 0.12, hardstone: 0, iron: 0 };
  }
  if (depth < GATE_START) {
    return { dirt: 0.3, stone: 0.48, copper: 0.14, hardstone: 0.08, iron: 0 };
  }
  if (depth <= GATE_END) {
    // The gate: nearly solid hardstone so it reads as "come back stronger".
    return { dirt: 0, stone: 0.12, copper: 0, hardstone: 0.88, iron: 0 };
  }
  const iron = Math.min(0.1 + (depth - GATE_END) * 0.015, 0.2);
  return { dirt: 0, stone: 0.26, copper: 0, hardstone: 0.74 - iron, iron };
}

function rollMaterial(weights: MaterialWeights, rng: Rng): Material {
  let roll = rng();
  for (const material of ["dirt", "stone", "copper", "hardstone", "iron"] as const) {
    roll -= weights[material];
    if (roll < 0) return material;
  }
  return "stone";
}

export function generateMine(width: number, height: number, seed: number): MineGrid {
  const rng = mulberry32(seed);
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y++) {
    const weights = weightsForDepth(y);
    for (let x = 0; x < width; x++) {
      tiles.push({ material: rollMaterial(weights, rng), variant: randInt(rng, 1, 3) });
    }
  }
  return { width, height, tiles };
}
