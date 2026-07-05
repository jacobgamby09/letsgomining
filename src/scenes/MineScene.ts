import Phaser from "phaser";
import { generateMine, tileAt } from "../sim/grid";
import { TILES } from "./BootScene";

const TILE = 16;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 40;
const ZOOM = 3;
const SKY_HEIGHT = 64;
const SKY_COLOR = 0x5ec4ea;

export class MineScene extends Phaser.Scene {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super("Mine");
  }

  create(): void {
    const mine = generateMine(GRID_WIDTH, GRID_HEIGHT, 20260705);
    const worldWidth = GRID_WIDTH * TILE;
    const worldHeight = GRID_HEIGHT * TILE;

    this.add
      .rectangle(worldWidth / 2, -SKY_HEIGHT / 2, worldWidth, SKY_HEIGHT, SKY_COLOR)
      .setDepth(-1);

    for (let y = 0; y < mine.height; y++) {
      for (let x = 0; x < mine.width; x++) {
        const tile = tileAt(mine, x, y);
        if (!tile) continue;
        const frame = `${tile.material}_clean_0${tile.variant}`;
        this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, TILES, frame);
      }
    }

    const camera = this.cameras.main;
    camera.setZoom(ZOOM);
    camera.setBounds(0, -SKY_HEIGHT, worldWidth, worldHeight + SKY_HEIGHT);
    // Start at the surface: a strip of sky plus the first mine rows.
    camera.centerOn(worldWidth / 2, 56);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      camera.scrollY += dy * 0.4;
    });
  }

  update(_time: number, delta: number): void {
    if (!this.cursors) return;
    const speed = 0.25 * delta;
    if (this.cursors.up.isDown) this.cameras.main.scrollY -= speed;
    if (this.cursors.down.isDown) this.cameras.main.scrollY += speed;
  }
}
