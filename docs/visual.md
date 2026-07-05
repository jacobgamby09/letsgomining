# Visual Style Direction

This document is the current art-direction baseline for New Day New Loot. Use it
when creating sprites, tiles, camp assets, effects, prompts, or visual QA notes.

## Current Baseline

Use the moodboard image with the bright surface camp and clean mine cross-section
as the primary reference.

- Target reference: `docs/art/moodboard_top_right_target.png`
- Runtime tile preview: `src/assets/tiles/style_reference/moodboard_runtime_tiles_preview.png`
- Generated reference sheet: `src/assets/tiles/style_reference/moodboard_style_tileset_reference.png`
- Current native 16x16 starting asset pass: `src/assets/core_16/`

The new direction is a cohesive, colorful pixel-art cross-section. The mine
should feel like one constructed tile system, not a collection of separate
premium-looking icons.

## Core Principles

1. Cohesion before detail.
2. Readable tile identity before decoration.
3. Shared outline, shared lighting, shared texture density.
4. Bright/cozy surface; heavier depth through palette shifts, not a different
   art style.
5. Assets should look good repeated in a dense grid, not only as isolated icons.

If one tile looks more polished than the rest, reduce it. If one material looks
like it came from another tileset, redraw it.

## Pixel Treatment

Use a clean mobile/platformer pixel-art style:

- 16x16 runtime tiles, supporting a slightly more zoomed-out mine view.
- Draw tiles as native 16x16 pixel art unless readability fails in prototype.
- Strong dark outer edge and clear internal cracks.
- Upper-left highlight, lower-right/bottom shadow.
- Simple faceted forms rather than noisy painterly texture.
- Controlled palette ramps with 3-5 colors per material.
- Texture marks are deliberate and sparse.
- No soft gradients, blur, realistic rendering, or hyper-detailed crystals.

The ideal tile reads as a breakable block in a side-view platformer.

Readability is more important than the exact pixel size. If 16x16 makes the
mine hard to parse during testing, revisit tile scale before adding more art.

## Tile Language

All mine tiles must share the same construction grammar:

- A dark rim or seam around the tile.
- A top highlight that helps rows separate.
- A darker bottom edge for weight.
- Internal cracks or clods at similar scale.
- Material-specific color and accent details.

For the first tile pass, use standalone block tiles with visible dark seams like
the moodboard rather than auto-tiles. Repetition should be softened with a small
set of clean variants per material, not by removing the grid language.

Material reads:

- Dirt: warm brown soil block, small clods/speckles, softest material.
- Stone: neutral grey block, simple plate cracks, medium weight.
- Copper: stone base with embedded orange ore chunks, bright but not gem-like.
- Hardstone: darker purple-grey/blue-grey block, same cracks but heavier.
- Iron: hardstone base with pale metal chunks, cooler and tougher than copper.

Ore should be embedded into a base material. Avoid making ore tiles look like
standalone crystal icons pasted onto unrelated rock.

Copper and iron tiles should always pay out their matching resource. The tile
art can imply embedded ore, but the player's read should be simple: copper tile
means copper reward, iron tile means iron reward.

Hardstone should read as a gate even before the worker hits it. Use a darker,
heavier treatment with stronger weight and less welcoming palette while keeping
the shared tile grammar.

When tiles break, reveal a dark back-wall/tunnel tile rather than pure empty
black. The cleared mine should still feel physical and readable.

## Tile Variant Plan

The first cohesive tile family should include:

- Dirt, stone, copper, hardstone, and iron.
- Multiple clean variants per material to reduce obvious repetition.
- Per-material damage states where relevant: clean, cracked 1, cracked 2, near
  break.
- A dark back-wall/tunnel tile for cleared cells.
- Mine entrance and elevator as larger sprites aligned to the 16x16 grid, not
  constrained to single-tile silhouettes.

Damage states should use a shared crack grammar across materials, but each
material should be drawn separately so damage feels embedded in the tile rather
than pasted on top.

Resource icons should use cleaner UI silhouettes than the ore chunks inside the
tiles. They should match the material color language while reading as reward UI,
not as raw tile fragments.

## Surface And Camp

The surface should be a first-read signal:

- Bright cyan sky.
- Clean clouds and simple sun.
- Saturated grass strip with darker root underside.
- Canvas/wood/rope camp materials.
- A small tent as the early camp identity.

Camp buildings should share the same simplified pixel language as the mine.
Avoid oversized detail, realistic shading, and tiny decorative clutter.

## Layer Progression

Layer progression should be visual but still cohesive:

- Layer 1: warm dirt, grey stone, orange copper.
- Layer 2: darker hardstone, pale iron, cooler shadows.
- Layer 3 later: can add glow/crystal accents, but must keep the same tile
  grammar and readability.

Depth should feel like the palette gets heavier, not like the art direction
changes.

## UI Relationship

The UI can remain compact and dark, but it should support the cozy mine read:

- Warm amber action highlights.
- Resource icons that match tile materials.
- Small panels that avoid hiding the playfield.
- No large dashboard styling during runs.

## Do

- Test tiles in a dense grid and in-game camera view.
- Keep early-game tiles bright enough to parse instantly.
- Use the same rim, highlight, and shadow rules across materials.
- Make ore accents large enough to read but not so large they dominate.
- Save richer atmosphere for deeper layers after the base style is stable.

## Do Not

- Mix high-detail painterly rocks with simple platformer dirt.
- Use random noise as texture.
- Use long plank-like dirt streaks.
- Make copper/iron look like UI gems pasted on top.
- Let hardstone become black background.
- Change style between layers; change palette and density instead.

## Production Priority

Current art-pass order:

1. Cohesive tile family for dirt, stone, copper, iron, hardstone.
2. Surface grass and camp tent alignment.
3. Mine entrance/elevator visual pass.
4. Worker and pickaxe polish.
5. Hit/break particles and loot icons.
6. Camp building upgrade states.

Every new asset should be compared against the target reference and the runtime
tile preview before being integrated.

The first structured 16x16 package is documented in
`docs/ASSET_PRODUCTION_LOG.md` and `src/assets/core_16/README.md`.
