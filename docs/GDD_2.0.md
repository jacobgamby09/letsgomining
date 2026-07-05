# New Day New Loot - GDD 2.0

## Purpose

This document defines the stripped-down version of New Day New Loot.

The goal is to protect the core gameplay from extra systems. If a feature does
not make the core loop clearer, faster, or more satisfying, it does not belong
in this version.

## One-Sentence Pitch

New Day New Loot is a short-session mining game where you send a tiny crew into
a tile-based mine, watch them dig automatically, collect resources, and spend
those resources to make the next run better.

## Core Fantasy

The player is running a small mining camp.

Each day, the mine resets. The crew goes down, breaks blocks, brings back
materials, and the camp slowly becomes better at mining.

The fantasy is not managing a large town or solving a complex strategy game.
The fantasy is:

- "One more run."
- "We got a little deeper."
- "Now I can afford the next useful upgrade."

## Design Pillars

### 1. Runs Are Short

A run should be quick enough that restarting feels natural.

Target:

- Early run: 15-30 seconds.
- Improved run: still short, but more productive.

Progression should make runs better, not simply longer.

### 2. Mining Is Fun To Watch

The player should enjoy watching the worker mine.

The important feedback is:

- worker moves toward a tile
- pickaxe wind-up
- impact
- tile cracks
- tile breaks
- resource flies to the UI

If this sequence does not feel good, no amount of extra content will save the
game.

### 3. The Player Makes A Small Choice Before Each Run

The player should not micromanage every tile.

Before a run, the player chooses a simple intent:

- Balanced: mine useful nearby resources and make steady progress.
- Push Depth: prioritize going downward.
- Harvest: prioritize valuable reachable resources.

The worker then executes that plan automatically.

### 4. Upgrades Make The Next Run Noticeably Better

After a run, the player spends resources on upgrades.

Each upgrade should create a visible or felt improvement in the next run:

- breaks tiles faster
- lasts longer
- starts deeper
- reaches better resources

Avoid upgrades that only change abstract numbers without changing what the
player sees.

## Core Loop

1. The player starts at camp.
2. The player chooses a run intent.
3. The worker enters the mine.
4. The worker automatically mines according to the intent.
5. The worker loses stamina while moving and mining.
6. Tiles break and resources fly to the UI.
7. The run ends when stamina runs out.
8. The loot summary shows what was collected.
9. The player buys one or more upgrades.
10. The next run begins.

This loop is the game.

## First Playable Scope

The first playable version should include only what is needed to test the loop.

Required:

- One mine grid.
- One worker.
- Dirt, stone, copper, hardstone, iron.
- Worker stamina.
- Three run intents: Balanced, Push Depth, Harvest.
- Resources flying to the UI.
- End-of-run summary.
- Simple camp upgrade surface.
- A small number of upgrades that clearly improve future runs.

Not required:

- prestige
- quests
- contracts
- daily modifiers
- large worker roster
- worker classes
- crafting
- automation
- offline progress
- complex base building
- rare events
- story systems
- layer 3+

## Mine

The mine is a side-view tile grid.

Runtime mine tiles should start at 16x16 so the camera can show a larger,
slightly more zoomed-out section of the mine while keeping individual materials
readable.

The player should understand the mine visually:

- brown dirt is easy
- grey stone is stronger
- copper is valuable early ore
- dark hardstone marks the next layer
- pale iron is the deeper ore

Mined cells should reveal a dark back-wall/tunnel tile rather than pure empty
black, so the cleared mine still feels physical.

Copper and iron tiles should always pay out their matching resource. Hardstone
should read as a clear gate before the worker reaches it, signaling that the
player likely needs more pickaxe power or progression.

The mine does not need complex procedural rules at first. It only needs enough
variety that runs feel slightly different and the worker has meaningful choices.

## Worker

Start with one worker.

The worker needs:

- position in the mine
- stamina
- mining speed
- simple movement
- simple mining animation

The worker does not need personality, class, equipment slots, or complex AI in
GDD 2.0.

## Stamina

Stamina is the run timer.

The worker spends stamina to:

- move
- mine
- handle harder materials

When stamina reaches zero, the run ends.

The player should feel:

- "I almost reached that ore."
- "One more upgrade would let me get deeper."

## Upgrades

Upgrades should be few and obvious.

Initial upgrade categories:

- Pickaxe: increases mining power.
- Stamina: increases run duration.
- Elevator: starts the worker deeper.
- Crew: unlocks the second worker later, only after the one-worker loop feels
  good.

Each upgrade category can be represented physically in camp, but the camp should
stay simple. Camp is the upgrade interface, not a separate management game.

## Resources

Use only resources that have immediate upgrade meaning.

Initial resources:

- Stone: basic camp and stamina upgrades.
- Copper: pickaxe and early efficiency upgrades.
- Iron: deeper upgrades after hardstone becomes reachable.

Do not add gems, relics, machine parts, or rare currencies until the basic loop
has proven addictive.

## Visual Direction

Use the bright pixel-art mine cross-section baseline from `visual.md`.

The mine should read as one cohesive block system:

- shared tile outlines
- simple material differences
- clear layer transition
- cozy surface camp

Visual clarity matters more than asset complexity.

## Success Criteria

The core loop is working if a new player can say:

- "I understand what the worker is doing."
- "I can tell why the run ended."
- "I know what upgrade I want next."
- "The next run should be better."
- "I want to press Start Run again."

## Hard No For GDD 2.0

Do not add a feature because it might be cool later.

Do not add a feature because it fits the theme.

Do not add a feature because another idle/incremental game has it.

Only add a feature if it improves the current run -> loot -> upgrade -> next run
loop.

## Open Questions

These are the only questions worth answering right now:

1. Is the run length satisfying?
2. Is watching mining satisfying?
3. Are the three intents meaningfully different?
4. Are upgrades obvious and motivating?
5. Does the player want another run after the summary?
