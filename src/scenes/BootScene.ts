import Phaser from "phaser";
import tilesheetUrl from "../assets/core_16/tiles/sheets/core16_tilesheet.png";
import tilesheetData from "../assets/core_16/tiles/sheets/core16_tilesheet.json";

/** Texture key holding every 16x16 tile frame from the core_16 tilesheet. */
export const TILES = "core16";

// Every standalone sprite in the asset pack, keyed by file basename
// (e.g. "miner_walk_01"). Tiles come from the packed sheet instead.
const spriteUrls = import.meta.glob("../assets/core_16/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    this.load.image(TILES, tilesheetUrl);
    for (const [path, url] of Object.entries(spriteUrls)) {
      if (path.includes("/previews/") || path.includes("/sheets/")) continue;
      const key = path.split("/").pop()!.replace(".png", "");
      this.load.image(key, url);
    }
  }

  create(): void {
    // The tilesheet JSON is our own generator format, so register the named
    // frames directly instead of going through a Phaser atlas loader.
    const texture = this.textures.get(TILES);
    for (const frame of tilesheetData.frames) {
      texture.add(frame.key, 0, frame.x, frame.y, frame.w, frame.h);
    }

    this.anims.create({
      key: "miner-idle",
      frames: [{ key: "miner_idle_01" }, { key: "miner_idle_02" }],
      frameRate: 2,
      repeat: -1,
    });
    this.anims.create({
      key: "miner-walk",
      frames: ["miner_walk_01", "miner_walk_02", "miner_walk_03", "miner_walk_04"].map((key) => ({
        key,
      })),
      frameRate: 14,
      repeat: -1,
    });
    this.anims.create({
      key: "break-dust",
      frames: [{ key: "break_dust_01" }, { key: "break_dust_02" }],
      frameRate: 14,
      hideOnComplete: true,
    });

    this.scene.start("Camp");
  }
}
