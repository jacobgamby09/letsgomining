# Core 16 Starting Assets

This folder contains the first structured native 16x16 asset pass for New Day
New Loot. It is intentionally separate from the older `tiles/layer1` and
`tiles/layer2` folders so the new direction can be reviewed without overwriting
existing game assets.

## Art Direction

- Native 16x16 pixel art for mine tiles.
- Strong dark seams, upper-left highlights, and lower-right shadow weight.
- Standalone moodboard-style blocks, not auto-tiles.
- Multiple clean variants for repetition control.
- Per-material damage states using the same crack grammar.
- Cleared cells use dark back-wall tiles, not pure black emptiness.
- Copper and iron tiles always imply matching resource payout.
- Hardstone should read as a gate before the worker reaches it.

## Folder Structure

- `tiles/materials/<material>/`: dirt, stone, copper, hardstone, and iron.
- `tiles/back_wall/`: cleared-cell tunnel wall variants.
- `tiles/sheets/`: packed native tilesheet plus frame metadata.
- `icons/resources/`: UI-readable resource pickup icons.
- `effects/mining/`: target marker, hit flash, break dust, and material chips.
- `structures/mine/`: mine entrance and elevator frame, aligned to 16px grid.
- `characters/worker/`: minimum miner frames for idle, walk, wind-up, hit, and recover.
- `camp/`: starter tent, upgrade board, and upgrade props.
- `previews/`: contact sheet, dense mine grid preview, and 4x tilesheet preview.

## Naming Rules

Material tiles use:

```text
<material>_clean_01.png
<material>_clean_02.png
<material>_clean_03.png
<material>_cracked_1.png
<material>_cracked_2.png
<material>_near_break.png
```

The clean variants are meant for map variation. Damage states are one shared
progression per material for this first pass. If the game later needs damaged
variants per clean tile, extend this structure rather than replacing it.

## Regenerating

Run from the project root:

```powershell
python scripts\generate_core16_assets.py
```

The generator writes deterministic PNGs, `manifest.json`, the native tilesheet,
tilesheet metadata, and preview images.

## Review Files

Start visual review with:

- `previews/asset_contact_sheet.png`
- `previews/dense_mine_grid_4x.png`
- `previews/core16_tilesheet_4x.png`

Use the native PNGs for implementation. Use previews only for review.
