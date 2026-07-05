import Phaser from "phaser";
import type { Resource } from "../sim/balance";
import {
  RUN_EVENTS,
  type EndedPayload,
  type LootPayload,
  type RunStartedPayload,
  type StaminaPayload,
} from "./runEvents";

const RESOURCES: Resource[] = ["stone", "copper", "iron"];
const TEXT_STYLE = { fontFamily: "monospace", fontSize: "16px", color: "#e8e2d0" };
const STAMINA_WIDTH = 150;

/**
 * Screen-space overlay: resource counters, stamina bar and the end-of-run
 * summary. Runs in its own scene so the mine camera zoom never touches it.
 */
export class HudScene extends Phaser.Scene {
  private counts!: Record<Resource, number>;
  private countTexts!: Record<Resource, Phaser.GameObjects.Text>;
  private counterPos!: Record<Resource, { x: number; y: number }>;
  private staminaFill!: Phaser.GameObjects.Rectangle;
  private runLabel!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Container;
  private panelBody!: Phaser.GameObjects.Text;

  constructor() {
    super("Hud");
  }

  create(): void {
    this.counts = { stone: 0, copper: 0, iron: 0 };
    this.countTexts = {} as Record<Resource, Phaser.GameObjects.Text>;
    this.counterPos = {} as Record<Resource, { x: number; y: number }>;

    RESOURCES.forEach((resource, i) => {
      const y = 24 + i * 30;
      this.add.image(26, y, `resource_${resource}`).setScale(2);
      this.countTexts[resource] = this.add.text(44, y - 9, "0", TEXT_STYLE);
      this.counterPos[resource] = { x: 26, y };
    });

    const barX = 960 - 16 - STAMINA_WIDTH;
    this.add.text(barX, 14, "STAMINA", { ...TEXT_STYLE, fontSize: "11px", color: "#8a8f9c" });
    this.add.rectangle(barX, 34, STAMINA_WIDTH, 12, 0x1c1f27).setOrigin(0, 0.5);
    this.staminaFill = this.add
      .rectangle(barX + 1, 34, STAMINA_WIDTH - 2, 8, 0xf2a33c)
      .setOrigin(0, 0.5);

    this.runLabel = this.add.text(16, 540 - 28, "", {
      ...TEXT_STYLE,
      fontSize: "13px",
      color: "#8a8f9c",
    });

    this.panel = this.buildPanel();

    const events = this.game.events;
    events.on(RUN_EVENTS.started, this.onStarted, this);
    events.on(RUN_EVENTS.loot, this.onLoot, this);
    events.on(RUN_EVENTS.stamina, this.onStamina, this);
    events.on(RUN_EVENTS.ended, this.onEnded, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      events.off(RUN_EVENTS.started, this.onStarted, this);
      events.off(RUN_EVENTS.loot, this.onLoot, this);
      events.off(RUN_EVENTS.stamina, this.onStamina, this);
      events.off(RUN_EVENTS.ended, this.onEnded, this);
    });
  }

  private buildPanel(): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, 430, 160, 0x12141a, 0.94).setStrokeStyle(2, 0xf2a33c);
    const title = this.add
      .text(0, -54, "RUN COMPLETE", { ...TEXT_STYLE, fontSize: "20px", color: "#f2a33c" })
      .setOrigin(0.5);
    this.panelBody = this.add
      .text(0, -8, "", { ...TEXT_STYLE, fontSize: "15px", align: "center", lineSpacing: 6 })
      .setOrigin(0.5);
    const hint = this.add
      .text(0, 54, "Press R or click to start the next run", {
        ...TEXT_STYLE,
        fontSize: "13px",
        color: "#8a8f9c",
      })
      .setOrigin(0.5);
    return this.add
      .container(480, 250, [bg, title, this.panelBody, hint])
      .setDepth(50)
      .setVisible(false);
  }

  private onStarted(payload: RunStartedPayload): void {
    this.counts = { stone: 0, copper: 0, iron: 0 };
    for (const resource of RESOURCES) this.countTexts[resource].setText("0");
    this.staminaFill.setScale(1, 1);
    this.panel.setVisible(false);
    const intent = payload.intent.charAt(0).toUpperCase() + payload.intent.slice(1);
    this.runLabel.setText(`${intent} · Run ${payload.run}`);
  }

  private onLoot(payload: LootPayload): void {
    const icon = this.add
      .image(payload.screenX, payload.screenY, `resource_${payload.resource}`)
      .setScale(2.4)
      .setDepth(40);
    const destination = this.counterPos[payload.resource];
    this.tweens.chain({
      targets: icon,
      tweens: [
        { y: payload.screenY - 26, scale: 2.8, duration: 140, ease: "Quad.easeOut" },
        {
          x: destination.x,
          y: destination.y,
          scale: 1.6,
          duration: 330,
          ease: "Cubic.easeIn",
        },
      ],
      onComplete: () => {
        icon.destroy();
        this.counts[payload.resource] += 1;
        const text = this.countTexts[payload.resource];
        text.setText(String(this.counts[payload.resource]));
        this.tweens.add({ targets: text, scale: 1.25, duration: 70, yoyo: true });
      },
    });
  }

  private onStamina(payload: StaminaPayload): void {
    this.tweens.add({
      targets: this.staminaFill,
      scaleX: Math.max(payload.fraction, 0),
      duration: 120,
      ease: "Quad.easeOut",
    });
  }

  private onEnded(payload: EndedPayload): void {
    const { resources, maxDepth, durationMs } = payload.totals;
    const reason = payload.reason === "exhausted" ? "Out of stamina" : "Mine cleared";
    this.panelBody.setText(
      [
        `${reason} after ${(durationMs / 1000).toFixed(1)}s`,
        `Stone ${resources.stone} · Copper ${resources.copper} · Iron ${resources.iron}`,
        `Deepest tile broken: row ${maxDepth + 1}`,
      ].join("\n"),
    );
    this.panel.setVisible(true);
  }
}
