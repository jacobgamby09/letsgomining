import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { HudScene } from "./scenes/HudScene";
import { MineScene } from "./scenes/MineScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 540,
  backgroundColor: "#0c0e12",
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MineScene, HudScene],
});
