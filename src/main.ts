import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { CampScene } from "./scenes/CampScene";
import { HudScene } from "./scenes/HudScene";
import { MineScene } from "./scenes/MineScene";
import { getState, persist, resetState } from "./state/gameState";

const game = new Phaser.Game({
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
  scene: [BootScene, CampScene, MineScene, HudScene],
});

// Console/debug handle for poking at the prototype (e.g. __ndnl.resetState()).
declare global {
  interface Window {
    __ndnl: { game: Phaser.Game; getState: typeof getState; persist: typeof persist; resetState: typeof resetState };
  }
}
window.__ndnl = { game, getState, persist, resetState };
