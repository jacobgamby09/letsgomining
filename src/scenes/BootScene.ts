import Phaser from "phaser";
import tilesheetUrl from "../assets/core_16/tiles/sheets/core16_tilesheet.png";
import tilesheetData from "../assets/core_16/tiles/sheets/core16_tilesheet.json";

/** Texture key holding every 16x16 tile frame from the core_16 tilesheet. */
export const TILES = "core16";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    this.load.image(TILES, tilesheetUrl);
  }

  create(): void {
    // The tilesheet JSON is our own generator format, so register the named
    // frames directly instead of going through a Phaser atlas loader.
    const texture = this.textures.get(TILES);
    for (const frame of tilesheetData.frames) {
      texture.add(frame.key, 0, frame.x, frame.y, frame.w, frame.h);
    }
    this.scene.start("Mine");
  }
}
