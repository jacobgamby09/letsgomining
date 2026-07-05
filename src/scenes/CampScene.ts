import Phaser from "phaser";
import type { Resource } from "../sim/balance";
import {
  canAfford,
  effectsFor,
  isMaxed,
  nextCost,
  tryPurchase,
  UPGRADE_IDS,
  UPGRADES,
  type UpgradeId,
} from "../sim/economy";
import type { Intent } from "../sim/intents";
import { getState, persist } from "../state/gameState";
import { TILES } from "./BootScene";
import { INTENT_LABELS } from "./runEvents";

const SKY_COLOR = 0x5ec4ea;
const GRASS_COLOR = 0x4fae3c;
const GRASS_ROOT_COLOR = 0x2f6d2a;
const PANEL_COLOR = 0x12141a;
const AMBER = 0xf2a33c;
const AMBER_TEXT = "#f2a33c";
const MUTED_TEXT = "#8a8f9c";
const LIGHT_TEXT = "#e8e2d0";
const DISABLED_COLOR = 0x2a2e38;

const TEXT = (size: number, color = LIGHT_TEXT) => ({
  fontFamily: "monospace",
  fontSize: `${size}px`,
  color,
});

const GROUND_Y = 396;
const RESOURCES: Resource[] = ["stone", "copper", "iron"];
const INTENTS: Intent[] = ["balanced", "pushDepth", "harvest"];

interface CardRefs {
  level: Phaser.GameObjects.Text;
  effect: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
  buyBg: Phaser.GameObjects.Rectangle;
  buyLabel: Phaser.GameObjects.Text;
}

/**
 * The upgrade interface between runs (GDD 2.0: "Camp is the upgrade
 * interface, not a separate management game").
 */
export class CampScene extends Phaser.Scene {
  private walletTexts!: Record<Resource, Phaser.GameObjects.Text>;
  private cards!: Record<UpgradeId, CardRefs>;
  private intentButtons!: Map<Intent, { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }>;

  constructor() {
    super("Camp");
  }

  create(): void {
    this.buildBackdrop();
    this.buildWallet();
    this.buildUpgradeCards();
    this.buildIntentPicker();
    this.buildStartButton();
    this.refresh();
  }

  private buildBackdrop(): void {
    this.add.rectangle(480, 270, 960, 540, SKY_COLOR);
    this.add.rectangle(480, GROUND_Y + 6, 960, 12, GRASS_COLOR);
    this.add.rectangle(480, GROUND_Y + 16, 960, 8, GRASS_ROOT_COLOR);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 20; col++) {
        this.add
          .image(col * 48 + 24, GROUND_Y + 20 + row * 48 + 24, TILES, "dirt_clean_01")
          .setScale(3);
      }
    }

    this.add.image(150, GROUND_Y, "tent_basic").setScale(3).setOrigin(0.5, 1);
    this.add.image(300, GROUND_Y, "stamina_barrel_01").setScale(3).setOrigin(0.5, 1);
    this.add.image(480, GROUND_Y, "upgrade_board_basic").setScale(3).setOrigin(0.5, 1);
    this.add.image(640, GROUND_Y, "elevator_crate_01").setScale(3).setOrigin(0.5, 1);
    this.add.image(830, GROUND_Y, "mine_entrance_basic").setScale(3).setOrigin(0.5, 1);

    const state = getState();
    this.add
      .text(480, 20, `CAMP · DAY ${state.runNumber}`, TEXT(18, AMBER_TEXT))
      .setOrigin(0.5, 0);
  }

  private buildWallet(): void {
    this.walletTexts = {} as Record<Resource, Phaser.GameObjects.Text>;
    RESOURCES.forEach((resource, i) => {
      const y = 24 + i * 30;
      this.add.image(26, y, `resource_${resource}`).setScale(2);
      this.walletTexts[resource] = this.add.text(44, y - 9, "0", TEXT(16));
    });
  }

  private buildUpgradeCards(): void {
    this.cards = {} as Record<UpgradeId, CardRefs>;
    const centers = [180, 480, 780];
    UPGRADE_IDS.forEach((id, index) => {
      this.cards[id] = this.buildCard(id, centers[index], 165);
    });
  }

  private buildCard(id: UpgradeId, cx: number, cy: number): CardRefs {
    const def = UPGRADES[id];
    this.add.rectangle(cx, cy, 270, 140, PANEL_COLOR, 0.92).setStrokeStyle(1, 0x353b49);
    this.add.text(cx - 123, cy - 58, def.name.toUpperCase(), TEXT(16, AMBER_TEXT));
    const level = this.add.text(cx + 123, cy - 58, "", TEXT(13, MUTED_TEXT)).setOrigin(1, 0);
    this.add.text(cx - 123, cy - 36, def.tagline, TEXT(11, MUTED_TEXT));
    const effect = this.add.text(cx - 123, cy - 12, "", TEXT(14));
    const cost = this.add.text(cx - 123, cy + 14, "", TEXT(13, MUTED_TEXT));

    const buyBg = this.add
      .rectangle(cx + 88, cy + 42, 92, 32, AMBER)
      .setInteractive({ useHandCursor: true });
    const buyLabel = this.add.text(cx + 88, cy + 42, "BUY", TEXT(14, "#12141a")).setOrigin(0.5);
    buyBg.on("pointerdown", () => this.buy(id));

    return { level, effect, cost, buyBg, buyLabel };
  }

  private buildIntentPicker(): void {
    this.add.text(480, 258, "RUN INTENT", TEXT(11, MUTED_TEXT)).setOrigin(0.5);
    this.intentButtons = new Map();
    INTENTS.forEach((intent, index) => {
      const x = 480 + (index - 1) * 170;
      const bg = this.add
        .rectangle(x, 290, 158, 34, PANEL_COLOR, 0.92)
        .setStrokeStyle(1, 0x353b49)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, 290, INTENT_LABELS[intent], TEXT(14, MUTED_TEXT)).setOrigin(0.5);
      bg.on("pointerdown", () => {
        getState().intent = intent;
        persist();
        this.refresh();
      });
      this.intentButtons.set(intent, { bg, label });
    });
  }

  private buildStartButton(): void {
    const bg = this.add
      .rectangle(830, 470, 200, 52, AMBER)
      .setInteractive({ useHandCursor: true });
    this.add.text(830, 470, "START RUN >", TEXT(18, "#12141a")).setOrigin(0.5);
    bg.on("pointerdown", () => {
      persist();
      this.scene.start("Mine");
    });
    this.add
      .text(830, 505, "The crew mines on its own", TEXT(11, "#2f3542"))
      .setOrigin(0.5);
  }

  private buy(id: UpgradeId): void {
    const state = getState();
    const result = tryPurchase(state.wallet, state.levels, id);
    if (!result) return;
    state.wallet = result.wallet;
    state.levels = result.levels;
    persist();
    this.refresh();
  }

  private refresh(): void {
    const state = getState();
    for (const resource of RESOURCES) {
      this.walletTexts[resource].setText(String(state.wallet[resource]));
    }

    const fx = effectsFor(state.levels);
    const nextFx = {
      pickaxe: `Power ${fx.power} > ${fx.power + 1}`,
      stamina: `Stamina ${fx.stamina} > ${fx.stamina + 25}`,
      elevator: `Start depth ${fx.startDepth} > ${fx.startDepth + 3} rows`,
    };
    const maxedFx = {
      pickaxe: `Power ${fx.power}`,
      stamina: `Stamina ${fx.stamina}`,
      elevator: `Start depth ${fx.startDepth} rows`,
    };

    for (const id of UPGRADE_IDS) {
      const refs = this.cards[id];
      const maxed = isMaxed(id, state.levels);
      const cost = nextCost(id, state.levels);
      refs.level.setText(`Lv ${state.levels[id]}/${UPGRADES[id].costs.length}`);
      refs.effect.setText(maxed ? `${maxedFx[id]} (MAX)` : nextFx[id]);
      if (maxed || !cost) {
        refs.cost.setText("Fully upgraded");
        refs.buyBg.setFillStyle(DISABLED_COLOR).disableInteractive();
        refs.buyLabel.setText("MAX").setColor(MUTED_TEXT);
      } else {
        const costText = Object.entries(cost)
          .map(([resource, amount]) => `${amount} ${resource}`)
          .join(" + ");
        const affordable = canAfford(state.wallet, cost);
        refs.cost.setText(`Cost: ${costText}`).setColor(affordable ? LIGHT_TEXT : "#d96a55");
        refs.buyBg
          .setFillStyle(affordable ? AMBER : DISABLED_COLOR)
          .setInteractive({ useHandCursor: true });
        refs.buyLabel.setText("BUY").setColor(affordable ? "#12141a" : MUTED_TEXT);
      }
    }

    for (const [intent, button] of this.intentButtons) {
      const selected = state.intent === intent;
      button.bg.setStrokeStyle(selected ? 2 : 1, selected ? AMBER : 0x353b49);
      button.label.setColor(selected ? AMBER_TEXT : MUTED_TEXT);
    }
  }
}
