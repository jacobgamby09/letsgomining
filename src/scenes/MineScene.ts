import Phaser from "phaser";
import { WORKER_BASE } from "../sim/balance";
import type { Cell, Material, MineGrid } from "../sim/grid";
import { tileAt } from "../sim/grid";
import { runToEnd, RunSim, type RunEvent } from "../sim/run";
import { TILES } from "./BootScene";
import { RUN_EVENTS, type EndedPayload, type LootPayload } from "./runEvents";

const TILE = 16;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 40;
const ZOOM = 3;
const SKY_HEIGHT = 96;
const SKY_COLOR = 0x5ec4ea;
const GRASS_COLOR = 0x4fae3c;
const GRASS_ROOT_COLOR = 0x2f6d2a;
/** How far into the swing the pickaxe visually lands. */
const IMPACT_DELAY_MS = 280;

const DEPTHS = { sky: -3, entrance: -1, tiles: 0, grass: 2, marker: 5, worker: 10, fx: 15 };

interface Instruction {
  event: RunEvent;
  startMs: number;
}

/**
 * Plays back one simulated run in real time. The whole run is simulated
 * up front (it takes microseconds); this scene is pure presentation over
 * the resulting event timeline.
 */
export class MineScene extends Phaser.Scene {
  private seed = 1;
  private grid!: MineGrid;
  private worker!: Phaser.GameObjects.Sprite;
  private tiles = new Map<string, Phaser.GameObjects.Image>();
  private grass = new Map<number, Phaser.GameObjects.Rectangle[]>();
  private marker!: Phaser.GameObjects.Image;
  private instructions: Instruction[] = [];
  private cursor = 0;
  private clock = 0;
  private finished = false;

  constructor() {
    super("Mine");
  }

  init(data: { seed?: number }): void {
    this.seed = data.seed ?? 1;
    this.tiles = new Map();
    this.grass = new Map();
    this.instructions = [];
    this.cursor = 0;
    // Small idle beat before the worker sets off.
    this.clock = -500;
    this.finished = false;
  }

  create(): void {
    const sim = new RunSim({
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      seed: this.seed,
      intent: "balanced",
    });
    this.grid = sim.grid;
    this.instructions = runToEnd(sim).map((event) => ({
      event,
      startMs: event.atMs - ("durationMs" in event ? event.durationMs : 0),
    }));

    this.buildWorld();

    const startX = Math.floor(GRID_WIDTH / 2);
    this.worker = this.add
      .sprite(startX * TILE + TILE / 2, 0, "miner_idle_01")
      .setOrigin(0.5, 1)
      .setDepth(DEPTHS.worker);
    this.worker.play("miner-idle");

    this.marker = this.add
      .image(0, 0, "target_marker_01")
      .setVisible(false)
      .setDepth(DEPTHS.marker);

    const camera = this.cameras.main;
    camera.setZoom(ZOOM);
    camera.setBounds(0, -SKY_HEIGHT, GRID_WIDTH * TILE, GRID_HEIGHT * TILE + SKY_HEIGHT);
    camera.startFollow(this.worker, true, 0.12, 0.12);

    if (!this.scene.isActive("Hud")) this.scene.launch("Hud");
    this.game.events.emit(RUN_EVENTS.started, { intent: "balanced", run: this.seed });

    this.input.keyboard?.on("keydown-R", () => this.restartIfFinished());
    this.input.on("pointerdown", () => this.restartIfFinished());
  }

  update(_time: number, delta: number): void {
    if (this.cursor >= this.instructions.length) return;
    this.clock += delta;
    while (
      this.cursor < this.instructions.length &&
      this.instructions[this.cursor].startMs <= this.clock
    ) {
      this.fire(this.instructions[this.cursor].event);
      this.cursor++;
    }
  }

  private buildWorld(): void {
    const worldWidth = GRID_WIDTH * TILE;
    this.add
      .rectangle(worldWidth / 2, -SKY_HEIGHT / 2, worldWidth, SKY_HEIGHT, SKY_COLOR)
      .setDepth(DEPTHS.sky);

    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        const tile = tileAt(this.grid, x, y)!;
        const image = this.add
          .image(x * TILE + TILE / 2, y * TILE + TILE / 2, TILES, `${tile.material}_clean_0${tile.variant}`)
          .setDepth(DEPTHS.tiles);
        this.tiles.set(`${x},${y}`, image);
      }
    }

    // Grass overlay per column so it disappears with the tile beneath it.
    for (let x = 0; x < this.grid.width; x++) {
      const top = this.add
        .rectangle(x * TILE + TILE / 2, 2, TILE, 4, GRASS_COLOR)
        .setDepth(DEPTHS.grass);
      const root = this.add
        .rectangle(x * TILE + TILE / 2, 5.5, TILE, 3, GRASS_ROOT_COLOR)
        .setDepth(DEPTHS.grass);
      this.grass.set(x, [top, root]);
    }

    const startX = Math.floor(GRID_WIDTH / 2);
    this.add
      .image(startX * TILE + TILE / 2, 0, "mine_entrance_basic")
      .setOrigin(0.5, 1)
      .setDepth(DEPTHS.entrance);
  }

  private fire(event: RunEvent): void {
    switch (event.type) {
      case "walked":
        this.playWalk(event.from, event.to, event.durationMs);
        this.emitStamina(event.staminaLeft);
        break;
      case "tileDamaged":
        this.playSwing(event.worker, event.target, () => {
          const material = this.materialAt(event.target);
          this.tileImage(event.target)?.setFrame(`${material}_${event.stage}`);
          this.emitStamina(event.staminaLeft);
        });
        break;
      case "tileBroken":
        this.playSwing(event.worker, event.target, () => {
          this.applyBreak(event.target, event.material, event.yields);
          this.emitStamina(event.staminaLeft);
        });
        break;
      case "runEnded": {
        this.marker.setVisible(false);
        this.worker.play("miner-idle", true);
        this.finished = true;
        const payload: EndedPayload = { reason: event.reason, totals: event.totals };
        this.time.delayedCall(700, () => this.game.events.emit(RUN_EVENTS.ended, payload));
        break;
      }
    }
  }

  private playWalk(from: Cell, to: Cell, durationMs: number): void {
    this.marker.setVisible(false);
    if (to.x !== from.x) this.worker.setFlipX(to.x < from.x);
    this.worker.play("miner-walk", true);
    this.tweens.add({
      targets: this.worker,
      x: to.x * TILE + TILE / 2,
      y: (to.y + 1) * TILE,
      duration: durationMs,
      ease: "Linear",
    });
  }

  private playSwing(workerCell: Cell, target: Cell, onImpact: () => void): void {
    if (target.x !== workerCell.x) this.worker.setFlipX(target.x < workerCell.x);
    this.marker
      .setPosition(target.x * TILE + TILE / 2, target.y * TILE + TILE / 2)
      .setVisible(true);

    this.worker.stop();
    this.worker.setTexture("miner_mine_windup");
    this.time.delayedCall(IMPACT_DELAY_MS, () => {
      this.worker.setTexture("miner_mine_hit");
      this.flashAt(target);
      onImpact();
    });
    this.time.delayedCall(IMPACT_DELAY_MS + 110, () => {
      if (!this.finished) this.worker.setTexture("miner_mine_recover");
    });
  }

  private applyBreak(target: Cell, material: Material, yields: LootPayload["resource"] | null): void {
    const wallVariant = ((target.x * 7 + target.y * 13) % 4) + 1;
    this.tileImage(target)?.setFrame(`back_wall_0${wallVariant}`);
    if (target.y === 0) {
      for (const rect of this.grass.get(target.x) ?? []) rect.destroy();
      this.grass.delete(target.x);
    }

    const cx = target.x * TILE + TILE / 2;
    const cy = target.y * TILE + TILE / 2;

    const dust = this.add.sprite(cx, cy, "break_dust_01").setDepth(DEPTHS.fx);
    dust.play("break-dust");
    dust.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => dust.destroy());

    for (let i = 0; i < 4; i++) {
      const chip = this.add
        .image(cx, cy, `chips_${material}`)
        .setDepth(DEPTHS.fx)
        .setAlpha(0.9);
      this.tweens.add({
        targets: chip,
        x: cx + Phaser.Math.Between(-14, 14),
        y: cy + Phaser.Math.Between(-18, 6),
        alpha: 0,
        angle: Phaser.Math.Between(-90, 90),
        duration: Phaser.Math.Between(220, 380),
        ease: "Cubic.easeOut",
        onComplete: () => chip.destroy(),
      });
    }

    this.cameras.main.shake(60, 0.0015);

    if (yields) {
      const camera = this.cameras.main;
      const payload: LootPayload = {
        resource: yields,
        screenX: (cx - camera.worldView.x) * camera.zoom,
        screenY: (cy - camera.worldView.y) * camera.zoom,
      };
      this.game.events.emit(RUN_EVENTS.loot, payload);
    }
  }

  private flashAt(target: Cell): void {
    const flash = this.add
      .image(target.x * TILE + TILE / 2, target.y * TILE + TILE / 2, "hit_flash_01")
      .setDepth(DEPTHS.fx);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.4,
      duration: 90,
      onComplete: () => flash.destroy(),
    });
  }

  private emitStamina(staminaLeft: number): void {
    this.game.events.emit(RUN_EVENTS.stamina, { fraction: staminaLeft / WORKER_BASE.stamina });
  }

  private materialAt(cell: Cell): Material {
    return tileAt(this.grid, cell.x, cell.y)!.material;
  }

  private tileImage(cell: Cell): Phaser.GameObjects.Image | undefined {
    return this.tiles.get(`${cell.x},${cell.y}`);
  }

  private restartIfFinished(): void {
    if (this.finished) this.scene.restart({ seed: this.seed + 1 });
  }
}
