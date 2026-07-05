from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "assets" / "core_16"
TILE = 16
PREVIEW_SCALE = 4


def rgb(value: str) -> tuple[int, int, int, int]:
    value = value.strip().removeprefix("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4)) + (255,)


def rgba(value: str, alpha: int) -> tuple[int, int, int, int]:
    base = rgb(value)
    return base[:3] + (alpha,)


PALETTES = {
    "dirt": {
        "outline": rgb("#2a1a12"),
        "base": rgb("#8c4f27"),
        "light": rgb("#bd7438"),
        "mid": rgb("#72401f"),
        "shadow": rgb("#4d2a18"),
        "crack": rgb("#332014"),
        "detail": rgb("#623519"),
    },
    "stone": {
        "outline": rgb("#24272d"),
        "base": rgb("#797d84"),
        "light": rgb("#aeb3bb"),
        "mid": rgb("#656a72"),
        "shadow": rgb("#4d525b"),
        "crack": rgb("#3d424b"),
        "detail": rgb("#8d9299"),
    },
    "copper": {
        "outline": rgb("#24272d"),
        "base": rgb("#777c84"),
        "light": rgb("#aeb3bb"),
        "mid": rgb("#60666f"),
        "shadow": rgb("#4a5058"),
        "crack": rgb("#3b4048"),
        "detail": rgb("#888d94"),
        "ore_shadow": rgb("#7f3118"),
        "ore_mid": rgb("#e46128"),
        "ore_light": rgb("#ffad55"),
    },
    "hardstone": {
        "outline": rgb("#12131c"),
        "base": rgb("#403d52"),
        "light": rgb("#686377"),
        "mid": rgb("#343143"),
        "shadow": rgb("#252432"),
        "crack": rgb("#1d1c29"),
        "detail": rgb("#504b60"),
    },
    "iron": {
        "outline": rgb("#12131c"),
        "base": rgb("#403d52"),
        "light": rgb("#686377"),
        "mid": rgb("#343143"),
        "shadow": rgb("#252432"),
        "crack": rgb("#1d1c29"),
        "detail": rgb("#504b60"),
        "ore_shadow": rgb("#6d7884"),
        "ore_mid": rgb("#c9d4dc"),
        "ore_light": rgb("#f6fbff"),
    },
}


records: list[dict[str, object]] = []
sheet_entries: list[tuple[str, Path]] = []


def seeded_rng(*parts: object) -> random.Random:
    key = ":".join(str(part) for part in parts)
    seed = int(hashlib.sha256(key.encode("utf-8")).hexdigest()[:16], 16)
    return random.Random(seed)


def save_image(
    image: Image.Image,
    rel_path: str,
    category: str,
    tags: Iterable[str] = (),
    include_in_sheet: bool = False,
) -> Path:
    path = OUT / rel_path
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)
    records.append(
        {
            "path": str(Path("src/assets/core_16") / rel_path).replace("\\", "/"),
            "size": [image.width, image.height],
            "category": category,
            "tags": list(tags),
        }
    )
    if include_in_sheet:
        sheet_entries.append((Path(rel_path).stem, path))
    return path


def canvas(size: tuple[int, int] = (TILE, TILE)) -> Image.Image:
    return Image.new("RGBA", size, (0, 0, 0, 0))


def draw_block_base(draw: ImageDraw.ImageDraw, palette: dict[str, tuple[int, int, int, int]], gate: bool = False) -> None:
    draw.rectangle([0, 0, 15, 15], fill=palette["outline"])
    draw.rectangle([1, 1, 14, 14], fill=palette["base"])
    draw.line([(2, 1), (13, 1)], fill=palette["light"])
    draw.line([(2, 2), (9, 2)], fill=palette["light"])
    draw.rectangle([1, 13, 14, 14], fill=palette["shadow"])
    draw.line([(14, 2), (14, 13)], fill=palette["shadow"])
    draw.point([(1, 1), (14, 1)], fill=palette["outline"])
    if gate:
        draw.rectangle([0, 0, 15, 1], fill=palette["outline"])
        draw.rectangle([0, 14, 15, 15], fill=palette["outline"])
        draw.point([(2, 13), (13, 2), (13, 13)], fill=palette["shadow"])


def draw_plate_lines(draw: ImageDraw.ImageDraw, color: tuple[int, int, int, int], variant: int) -> None:
    if variant == 1:
        lines = [[(3, 10), (7, 6), (12, 7)], [(7, 6), (8, 13)], [(2, 13), (8, 12), (13, 14)]]
    elif variant == 2:
        lines = [[(2, 7), (6, 5), (10, 8), (14, 6)], [(10, 8), (11, 13)], [(4, 12), (7, 10)]]
    else:
        lines = [[(3, 5), (8, 8), (13, 5)], [(8, 8), (5, 13)], [(9, 11), (13, 13)]]
    for line in lines:
        draw.line(line, fill=color, width=1)


def draw_dirt_marks(draw: ImageDraw.ImageDraw, palette: dict[str, tuple[int, int, int, int]], variant: int) -> None:
    rng = seeded_rng("dirt", variant)
    for _ in range(7):
        x = rng.randint(3, 12)
        y = rng.randint(4, 11)
        color = palette["mid"] if rng.random() > 0.35 else palette["detail"]
        draw.point((x, y), fill=color)
        if rng.random() > 0.6:
            draw.point((min(13, x + 1), y), fill=color)


def draw_ore_chunk(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    size: int,
    palette: dict[str, tuple[int, int, int, int]],
) -> None:
    shadow = palette["ore_shadow"]
    mid = palette["ore_mid"]
    light = palette["ore_light"]
    if size == 3:
        draw.polygon([(x, y - 2), (x + 3, y - 1), (x + 3, y + 2), (x + 1, y + 3), (x - 2, y + 2), (x - 2, y - 1)], fill=shadow)
        draw.polygon([(x, y - 2), (x + 2, y - 1), (x + 2, y + 1), (x, y + 2), (x - 1, y + 1), (x - 1, y - 1)], fill=mid)
        draw.line([(x - 1, y - 1), (x + 1, y - 2)], fill=light)
    else:
        draw.rectangle([x - 1, y - 1, x + 2, y + 1], fill=shadow)
        draw.rectangle([x - 1, y - 2, x + 1, y], fill=mid)
        draw.point((x, y - 2), fill=light)


def draw_ore(draw: ImageDraw.ImageDraw, material: str, variant: int) -> None:
    palette = PALETTES[material]
    positions = {
        1: [(5, 6, 3), (11, 9, 2), (7, 12, 2)],
        2: [(9, 5, 3), (5, 10, 2), (12, 12, 2)],
        3: [(4, 8, 2), (10, 7, 3), (8, 12, 2)],
    }[variant]
    for x, y, size in positions:
        draw_ore_chunk(draw, x, y, size, palette)


def draw_damage(draw: ImageDraw.ImageDraw, material: str, state: str) -> None:
    p = PALETTES[material]
    crack = p["crack"]
    if state == "cracked_1":
        draw.line([(4, 5), (8, 8), (11, 7)], fill=crack, width=1)
        draw.line([(8, 8), (7, 12)], fill=crack, width=1)
    elif state == "cracked_2":
        draw.line([(3, 4), (7, 7), (12, 5)], fill=crack, width=1)
        draw.line([(7, 7), (9, 12), (13, 14)], fill=crack, width=1)
        draw.line([(4, 12), (7, 10), (10, 11)], fill=crack, width=1)
        draw.point([(6, 8), (11, 6), (9, 13)], fill=p["outline"])
    elif state == "near_break":
        draw.line([(2, 3), (7, 7), (13, 4)], fill=crack, width=1)
        draw.line([(7, 7), (5, 13)], fill=crack, width=1)
        draw.line([(7, 7), (11, 13), (14, 14)], fill=crack, width=1)
        draw.line([(2, 12), (6, 10), (10, 11), (13, 9)], fill=crack, width=1)
        draw.rectangle([6, 7, 8, 9], fill=p["outline"])
        draw.point([(4, 5), (10, 5), (4, 13), (12, 12), (7, 4)], fill=p["outline"])


def make_material_tile(material: str, variant: int, state: str = "clean") -> Image.Image:
    image = canvas()
    draw = ImageDraw.Draw(image)
    palette = PALETTES[material]
    gate = material == "hardstone"
    draw_block_base(draw, palette, gate=gate)

    if material == "dirt":
        draw_dirt_marks(draw, palette, variant)
    else:
        draw_plate_lines(draw, palette["crack"], variant)
        rng = seeded_rng(material, variant, "detail")
        for _ in range(3):
            draw.point((rng.randint(3, 12), rng.randint(4, 11)), fill=palette["detail"])

    if material in {"copper", "iron"}:
        draw_ore(draw, material, variant)

    if state != "clean":
        draw_damage(draw, material, state)
    return image


def make_back_wall(variant: int) -> Image.Image:
    image = canvas()
    draw = ImageDraw.Draw(image)
    palettes = [
        (rgb("#241817"), rgb("#34211d"), rgb("#120d0e"), rgb("#3f2921")),
        (rgb("#21171c"), rgb("#30222b"), rgb("#110d12"), rgb("#3c2a34")),
        (rgb("#1e1715"), rgb("#2b1f1b"), rgb("#0f0b0b"), rgb("#3a281f")),
        (rgb("#211b1e"), rgb("#31292e"), rgb("#100d10"), rgb("#3b3238")),
    ]
    outline, base, shadow, highlight = palettes[variant - 1]
    draw.rectangle([0, 0, 15, 15], fill=outline)
    draw.rectangle([1, 1, 14, 14], fill=base)
    draw.rectangle([2, 2, 13, 4], fill=highlight)
    draw.rectangle([2, 9, 13, 13], fill=shadow)
    rng = seeded_rng("backwall", variant)
    for _ in range(5):
        draw.point((rng.randint(3, 12), rng.randint(4, 12)), fill=outline)
    if variant % 2:
        draw.line([(2, 8), (7, 7), (12, 9)], fill=outline)
    else:
        draw.line([(4, 5), (8, 8), (11, 12)], fill=outline)
    return image


def make_resource_icon(resource: str) -> Image.Image:
    image = canvas()
    draw = ImageDraw.Draw(image)
    if resource == "stone":
        outline, mid, light, shadow = rgb("#25272d"), rgb("#8a9098"), rgb("#c7ccd2"), rgb("#5c626b")
        draw.polygon([(4, 3), (11, 2), (14, 8), (10, 14), (3, 12), (2, 6)], fill=outline)
        draw.polygon([(5, 4), (10, 3), (12, 8), (9, 12), (4, 10), (3, 6)], fill=mid)
        draw.line([(5, 4), (9, 3), (11, 6)], fill=light)
        draw.line([(4, 10), (9, 12), (12, 8)], fill=shadow)
    elif resource == "copper":
        outline, mid, light, shadow = rgb("#5a2414"), rgb("#dc612b"), rgb("#ffb45d"), rgb("#92391b")
        draw.polygon([(4, 4), (12, 3), (14, 7), (11, 13), (4, 12), (2, 8)], fill=outline)
        draw.polygon([(5, 5), (11, 4), (12, 7), (10, 11), (5, 10), (4, 8)], fill=mid)
        draw.line([(5, 5), (10, 4), (12, 7)], fill=light)
        draw.line([(5, 10), (10, 11)], fill=shadow)
    elif resource == "iron":
        outline, mid, light, shadow = rgb("#404954"), rgb("#c8d2da"), rgb("#f7fbff"), rgb("#78848f")
        draw.polygon([(3, 5), (10, 3), (14, 6), (13, 11), (7, 14), (2, 10)], fill=outline)
        draw.polygon([(4, 6), (10, 4), (12, 7), (11, 10), (7, 12), (4, 9)], fill=mid)
        draw.line([(5, 6), (10, 4), (12, 7)], fill=light)
        draw.line([(4, 9), (7, 12), (11, 10)], fill=shadow)
    else:
        raise ValueError(resource)
    return image


def make_hit_flash() -> Image.Image:
    image = canvas()
    draw = ImageDraw.Draw(image)
    draw.line([(8, 1), (8, 14)], fill=rgba("#fff7c7", 230), width=1)
    draw.line([(1, 8), (14, 8)], fill=rgba("#fff7c7", 230), width=1)
    draw.line([(4, 4), (12, 12)], fill=rgba("#ffd24d", 220), width=1)
    draw.line([(12, 4), (4, 12)], fill=rgba("#ffd24d", 220), width=1)
    draw.rectangle([7, 7, 9, 9], fill=rgb("#ffffff"))
    return image


def make_target_marker() -> Image.Image:
    image = canvas()
    draw = ImageDraw.Draw(image)
    color = rgba("#ffd24d", 210)
    dark = rgba("#7a4a19", 220)
    for x, y, sx, sy in [(1, 1, 1, 1), (14, 1, -1, 1), (1, 14, 1, -1), (14, 14, -1, -1)]:
        draw.line([(x, y), (x + sx * 4, y)], fill=dark)
        draw.line([(x, y), (x, y + sy * 4)], fill=dark)
        draw.point((x, y), fill=color)
    return image


def make_dust(index: int) -> Image.Image:
    image = canvas()
    draw = ImageDraw.Draw(image)
    colors = [rgba("#b89a75", 170), rgba("#8a6a50", 150), rgba("#d0b08a", 150)]
    clusters = {
        1: [(4, 10, 2), (8, 8, 3), (12, 11, 2), (6, 13, 1)],
        2: [(3, 11, 2), (7, 9, 2), (11, 8, 3), (13, 12, 1)],
    }[index]
    for i, (x, y, r) in enumerate(clusters):
        draw.rectangle([x - r, y - r, x + r, y + r], fill=colors[i % len(colors)])
    return image


def make_chips(material: str) -> Image.Image:
    image = canvas()
    draw = ImageDraw.Draw(image)
    p = PALETTES[material]
    bits = [(4, 6, p["light"]), (9, 4, p["mid"]), (12, 8, p["shadow"]), (6, 12, p["detail"])]
    if material in {"copper", "iron"}:
        bits.append((10, 11, p["ore_mid"]))
        bits.append((5, 9, p["ore_light"]))
    for x, y, color in bits:
        draw.rectangle([x, y, x + 1, y + 1], fill=color)
    return image


def make_mine_entrance() -> Image.Image:
    image = canvas((64, 64))
    draw = ImageDraw.Draw(image)
    wood_dark, wood, wood_light = rgb("#4c2c18"), rgb("#895328"), rgb("#b37238")
    outline = rgb("#25160f")
    tunnel = rgb("#120d0d")
    # Dirt socket behind frame.
    draw.rectangle([3, 17, 60, 63], fill=rgb("#54301f"))
    draw.rectangle([6, 20, 57, 63], fill=rgb("#2b1c17"))
    # Tunnel opening.
    draw.rectangle([19, 28, 45, 63], fill=tunnel)
    draw.polygon([(19, 28), (32, 17), (45, 28)], fill=tunnel)
    # Timber posts and cap.
    draw.rectangle([11, 23, 18, 63], fill=outline)
    draw.rectangle([46, 23, 53, 63], fill=outline)
    draw.rectangle([7, 15, 57, 25], fill=outline)
    draw.rectangle([12, 24, 17, 62], fill=wood)
    draw.rectangle([47, 24, 52, 62], fill=wood)
    draw.rectangle([8, 16, 56, 24], fill=wood)
    draw.rectangle([12, 18, 53, 20], fill=wood_light)
    draw.rectangle([12, 24, 13, 61], fill=wood_light)
    draw.rectangle([16, 24, 17, 62], fill=wood_dark)
    draw.rectangle([51, 24, 52, 62], fill=wood_dark)
    # Lantern.
    draw.rectangle([29, 34, 35, 45], fill=outline)
    draw.rectangle([30, 36, 34, 43], fill=rgb("#f4a63b"))
    draw.rectangle([31, 37, 33, 42], fill=rgb("#ffe28a"))
    draw.line([(32, 34), (32, 27)], fill=rgb("#6d4a2b"), width=1)
    return image


def make_elevator_frame() -> Image.Image:
    image = canvas((48, 64))
    draw = ImageDraw.Draw(image)
    outline = rgb("#25160f")
    wood = rgb("#8d5a2e")
    wood_light = rgb("#b8793c")
    rope = rgb("#d2ad6c")
    metal = rgb("#59606b")
    # Legs.
    draw.polygon([(4, 63), (11, 63), (25, 6), (19, 6)], fill=outline)
    draw.polygon([(44, 63), (37, 63), (23, 6), (29, 6)], fill=outline)
    draw.polygon([(6, 62), (10, 62), (24, 7), (21, 7)], fill=wood)
    draw.polygon([(42, 62), (38, 62), (24, 7), (27, 7)], fill=wood)
    # Cross beams.
    for y, w in [(19, 22), (37, 31), (53, 39)]:
        x0 = (48 - w) // 2
        draw.rectangle([x0, y, x0 + w, y + 4], fill=outline)
        draw.rectangle([x0 + 1, y + 1, x0 + w - 1, y + 3], fill=wood)
        draw.line([(x0 + 2, y + 1), (x0 + w - 2, y + 1)], fill=wood_light)
    # Pulley and rope.
    draw.ellipse([16, 1, 32, 17], outline=metal, width=2)
    draw.line([(24, 2), (24, 17)], fill=metal, width=1)
    draw.line([(17, 9), (31, 9)], fill=metal, width=1)
    draw.line([(24, 17), (24, 52)], fill=rope, width=1)
    draw.rectangle([17, 51, 31, 60], fill=outline)
    draw.rectangle([18, 52, 30, 59], fill=metal)
    draw.rectangle([19, 52, 29, 54], fill=rgb("#7c858f"))
    return image


def make_worker_frame(frame: str) -> Image.Image:
    image = canvas((16, 24))
    draw = ImageDraw.Draw(image)
    skin = rgb("#e0a47d")
    helmet = rgb("#efb23b")
    helmet_shadow = rgb("#c98524")
    shirt = rgb("#2f72a7")
    shirt_shadow = rgb("#1f4e78")
    boot = rgb("#221c18")
    outline = rgb("#171313")

    bob = 1 if frame in {"idle_02", "walk_02", "walk_04"} else 0
    arm_offset = -1 if frame == "walk_02" else (1 if frame == "walk_04" else 0)
    leg_offset = 1 if frame in {"walk_01", "walk_03"} else 0
    if frame == "mine_windup":
        arm_offset = -3
    elif frame == "mine_hit":
        arm_offset = 3

    # Helmet and head.
    draw.rectangle([3, bob, 12, bob + 5], fill=outline)
    draw.rectangle([4, bob, 11, bob + 4], fill=helmet)
    draw.rectangle([3, bob + 4, 12, bob + 5], fill=helmet_shadow)
    draw.rectangle([4, bob + 6, 11, bob + 10], fill=skin)
    draw.point((10, bob + 7), fill=outline)
    # Body.
    draw.rectangle([3, bob + 11, 12, bob + 19], fill=outline)
    draw.rectangle([4, bob + 11, 11, bob + 18], fill=shirt)
    draw.rectangle([4, bob + 17, 11, bob + 18], fill=shirt_shadow)
    # Arms.
    draw.rectangle([1, bob + 12 + arm_offset, 3, bob + 16 + arm_offset], fill=skin)
    draw.rectangle([12, bob + 12 - arm_offset, 14, bob + 16 - arm_offset], fill=skin)
    # Legs and boots.
    draw.rectangle([4, 20, 6, 22], fill=outline)
    draw.rectangle([9, 20, 11, 22], fill=outline)
    draw.rectangle([4, 19 + leg_offset, 6, 22], fill=rgb("#3b3934"))
    draw.rectangle([9, 20 - leg_offset, 11, 22], fill=rgb("#3b3934"))
    draw.rectangle([3, 22, 7, 23], fill=boot)
    draw.rectangle([9, 22, 13, 23], fill=boot)
    # Pickaxe in mining frames.
    if frame == "mine_windup":
        draw.line([(11, 6), (6, 0)], fill=rgb("#8a5a33"), width=1)
        draw.line([(3, 1), (10, 1)], fill=rgb("#bcc4cc"), width=1)
    elif frame == "mine_hit":
        draw.line([(12, 13), (15, 7)], fill=rgb("#8a5a33"), width=1)
        draw.line([(11, 7), (15, 7)], fill=rgb("#bcc4cc"), width=1)
    elif frame == "mine_recover":
        draw.line([(12, 11), (15, 14)], fill=rgb("#8a5a33"), width=1)
        draw.line([(12, 14), (15, 14)], fill=rgb("#bcc4cc"), width=1)
    return image


def make_pickaxe_prop() -> Image.Image:
    image = canvas()
    draw = ImageDraw.Draw(image)
    draw.line([(5, 14), (11, 3)], fill=rgb("#8a5a33"), width=2)
    draw.line([(6, 4), (14, 2)], fill=rgb("#c1c8cf"), width=2)
    draw.point((14, 2), fill=rgb("#f3f7fb"))
    return image


def make_tent() -> Image.Image:
    image = canvas((64, 48))
    draw = ImageDraw.Draw(image)
    outline = rgb("#3b2a1c")
    canvas_mid = rgb("#d8b47a")
    canvas_light = rgb("#efcf96")
    canvas_shadow = rgb("#b88d5b")
    draw.polygon([(7, 44), (31, 6), (58, 44)], fill=outline)
    draw.polygon([(10, 43), (31, 8), (55, 43)], fill=canvas_mid)
    draw.polygon([(31, 8), (55, 43), (38, 43)], fill=canvas_shadow)
    draw.line([(31, 8), (19, 43)], fill=canvas_light)
    draw.line([(31, 8), (47, 43)], fill=canvas_light)
    draw.polygon([(25, 43), (31, 22), (38, 43)], fill=rgb("#251c18"))
    draw.line([(31, 22), (31, 43)], fill=outline)
    draw.rectangle([29, 2, 33, 9], fill=rgb("#8d5a2e"))
    return image


def make_upgrade_board() -> Image.Image:
    image = canvas((48, 32))
    draw = ImageDraw.Draw(image)
    outline = rgb("#2f1d12")
    wood = rgb("#8d5a2e")
    wood_light = rgb("#b8793c")
    paper = rgb("#efe2c5")
    draw.rectangle([5, 6, 42, 22], fill=outline)
    draw.rectangle([6, 7, 41, 21], fill=wood)
    draw.line([(8, 9), (39, 9)], fill=wood_light)
    draw.rectangle([10, 11, 18, 18], fill=paper)
    draw.rectangle([22, 10, 30, 19], fill=paper)
    draw.rectangle([33, 12, 38, 18], fill=rgb("#ffd24d"))
    draw.rectangle([8, 22, 11, 31], fill=outline)
    draw.rectangle([36, 22, 39, 31], fill=outline)
    return image


def make_barrel() -> Image.Image:
    image = canvas((24, 24))
    draw = ImageDraw.Draw(image)
    outline = rgb("#2f1d12")
    wood = rgb("#9b6536")
    metal = rgb("#68717c")
    draw.ellipse([4, 2, 19, 7], fill=outline)
    draw.rectangle([4, 5, 19, 19], fill=outline)
    draw.ellipse([4, 16, 19, 22], fill=outline)
    draw.ellipse([5, 3, 18, 7], fill=wood)
    draw.rectangle([5, 5, 18, 19], fill=wood)
    draw.ellipse([5, 16, 18, 21], fill=rgb("#7d4f2c"))
    draw.rectangle([5, 8, 18, 10], fill=metal)
    draw.rectangle([5, 16, 18, 18], fill=metal)
    return image


def make_elevator_crate() -> Image.Image:
    image = canvas((24, 24))
    draw = ImageDraw.Draw(image)
    outline = rgb("#2f1d12")
    wood = rgb("#8d5a2e")
    light = rgb("#b8793c")
    draw.rectangle([3, 6, 20, 21], fill=outline)
    draw.rectangle([4, 7, 19, 20], fill=wood)
    draw.line([(5, 8), (18, 8)], fill=light)
    draw.line([(4, 14), (19, 14)], fill=outline)
    draw.line([(4, 20), (19, 7)], fill=outline)
    draw.line([(4, 7), (19, 20)], fill=outline)
    return image


def build_tilesheet() -> None:
    images = [(key, Image.open(path).convert("RGBA")) for key, path in sheet_entries]
    cols = 8
    rows = (len(images) + cols - 1) // cols
    sheet = canvas((cols * TILE, rows * TILE))
    entries: list[dict[str, object]] = []
    for index, (key, img) in enumerate(images):
        x = (index % cols) * TILE
        y = (index // cols) * TILE
        sheet.alpha_composite(img, (x, y))
        entries.append({"key": key, "x": x, "y": y, "w": TILE, "h": TILE})

    save_image(sheet, "tiles/sheets/core16_tilesheet.png", "tilesheet", ["native", "tiles"])
    preview = sheet.resize((sheet.width * PREVIEW_SCALE, sheet.height * PREVIEW_SCALE), Image.Resampling.NEAREST)
    save_image(preview, "previews/core16_tilesheet_4x.png", "preview", ["tilesheet", "4x"])

    sheet_json = OUT / "tiles" / "sheets" / "core16_tilesheet.json"
    sheet_json.parent.mkdir(parents=True, exist_ok=True)
    sheet_json.write_text(json.dumps({"tileSize": TILE, "image": "core16_tilesheet.png", "frames": entries}, indent=2), encoding="utf-8")
    records.append(
        {
            "path": "src/assets/core_16/tiles/sheets/core16_tilesheet.json",
            "size": None,
            "category": "tilesheet",
            "tags": ["metadata", "tiles"],
        }
    )


def build_dense_preview(asset_paths: dict[str, Path]) -> None:
    width_tiles, height_tiles = 20, 10
    image = canvas((width_tiles * TILE, height_tiles * TILE))
    layout = [
        ["dirt"] * 20,
        ["dirt", "dirt", "stone", "stone", "dirt", "copper", "stone", "dirt", "dirt", "stone", "copper", "stone", "dirt", "dirt", "stone", "stone", "copper", "dirt", "dirt", "stone"],
        ["stone", "stone", "stone", "dirt", "stone", "stone", "copper", "stone", "dirt", "stone", "stone", "stone", "copper", "stone", "dirt", "stone", "stone", "stone", "copper", "stone"],
        ["stone", "back", "back", "back", "stone", "copper", "stone", "stone", "stone", "back", "back", "stone", "stone", "stone", "copper", "stone", "stone", "stone", "stone", "stone"],
        ["stone", "back", "back", "back", "stone", "stone", "stone", "copper", "stone", "back", "back", "stone", "stone", "copper", "stone", "stone", "stone", "stone", "stone", "stone"],
        ["hardstone"] * 20,
        ["hardstone", "hardstone", "hardstone", "iron", "hardstone", "hardstone", "hardstone", "hardstone", "iron", "hardstone", "hardstone", "hardstone", "hardstone", "hardstone", "iron", "hardstone", "hardstone", "hardstone", "hardstone", "hardstone"],
        ["hardstone", "back", "back", "hardstone", "hardstone", "iron", "hardstone", "hardstone", "hardstone", "hardstone", "back", "back", "hardstone", "hardstone", "hardstone", "iron", "hardstone", "hardstone", "hardstone", "hardstone"],
        ["hardstone", "back", "back", "hardstone", "iron", "hardstone", "hardstone", "hardstone", "hardstone", "hardstone", "back", "back", "hardstone", "hardstone", "iron", "hardstone", "hardstone", "hardstone", "hardstone", "hardstone"],
        ["hardstone"] * 20,
    ]
    variant_counts = {"dirt": 3, "stone": 3, "copper": 3, "hardstone": 3, "iron": 3, "back": 4}
    for y, row in enumerate(layout):
        for x, cell in enumerate(row):
            if cell == "back":
                variant = ((x + y) % variant_counts[cell]) + 1
                key = f"back_wall_{variant:02d}"
            else:
                variant = ((x * 3 + y) % variant_counts[cell]) + 1
                key = f"{cell}_clean_{variant:02d}"
            tile = Image.open(asset_paths[key]).convert("RGBA")
            image.alpha_composite(tile, (x * TILE, y * TILE))
    save_image(image, "previews/dense_mine_grid_native.png", "preview", ["dense-grid", "native"])
    scaled = image.resize((image.width * PREVIEW_SCALE, image.height * PREVIEW_SCALE), Image.Resampling.NEAREST)
    save_image(scaled, "previews/dense_mine_grid_4x.png", "preview", ["dense-grid", "4x"])


def build_contact_sheet(asset_paths: dict[str, Path]) -> None:
    ordered = [Path(record["path"]).name for record in records if record["category"] not in {"preview", "tilesheet"} and str(record["path"]).endswith(".png")]
    images = []
    for record in records:
        path = record["path"]
        if record["category"] in {"preview", "tilesheet"} or not str(path).endswith(".png"):
            continue
        rel = str(path).replace("src/assets/core_16/", "")
        img = Image.open(OUT / rel).convert("RGBA")
        images.append((Path(rel).stem, img))

    thumb = 64
    label_h = 13
    cols = 8
    rows = (len(images) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * thumb, rows * (thumb + label_h)), rgb("#15181f"))
    draw = ImageDraw.Draw(sheet)
    for index, (name, img) in enumerate(images):
        x = (index % cols) * thumb
        y = (index // cols) * (thumb + label_h)
        scale = max(1, min((thumb - 12) // img.width, (thumb - 18) // img.height))
        preview = img.resize((img.width * scale, img.height * scale), Image.Resampling.NEAREST)
        px = x + (thumb - preview.width) // 2
        py = y + 4 + (thumb - 12 - preview.height) // 2
        sheet.alpha_composite(preview, (px, py))
        draw.text((x + 3, y + thumb - 2), name[:12], fill=rgb("#cfd6df"))
    save_image(sheet, "previews/asset_contact_sheet.png", "preview", ["contact-sheet"])
    _ = ordered  # Keeps the asset ordering visible while avoiding accidental lint churn.


def write_manifest() -> None:
    manifest = {
        "name": "core_16_starting_assets",
        "version": 1,
        "tileSize": TILE,
        "generatedBy": "scripts/generate_core16_assets.py",
        "artDirection": {
            "summary": "Native 16x16 readable pixel-art mining assets with shared dark seams, upper-left highlights, lower-right weight, and per-material damage states.",
            "sourceDocs": ["docs/GDD_2.0.md", "docs/visual.md"],
        },
        "records": records,
    }
    path = OUT / "manifest.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def main() -> None:
    asset_paths: dict[str, Path] = {}

    for material in ["dirt", "stone", "copper", "hardstone", "iron"]:
        for variant in [1, 2, 3]:
            image = make_material_tile(material, variant, "clean")
            rel = f"tiles/materials/{material}/{material}_clean_{variant:02d}.png"
            key = f"{material}_clean_{variant:02d}"
            asset_paths[key] = save_image(image, rel, "tile", [material, "clean"], include_in_sheet=True)
        for state in ["cracked_1", "cracked_2", "near_break"]:
            image = make_material_tile(material, 1, state)
            rel = f"tiles/materials/{material}/{material}_{state}.png"
            key = f"{material}_{state}"
            asset_paths[key] = save_image(image, rel, "tile", [material, state], include_in_sheet=True)

    for variant in [1, 2, 3, 4]:
        image = make_back_wall(variant)
        rel = f"tiles/back_wall/back_wall_{variant:02d}.png"
        key = f"back_wall_{variant:02d}"
        asset_paths[key] = save_image(image, rel, "tile", ["back-wall", "cleared"], include_in_sheet=True)

    for resource in ["stone", "copper", "iron"]:
        save_image(make_resource_icon(resource), f"icons/resources/resource_{resource}.png", "icon", [resource, "resource"])

    save_image(make_hit_flash(), "effects/mining/hit_flash_01.png", "effect", ["impact", "flash"])
    save_image(make_target_marker(), "effects/mining/target_marker_01.png", "effect", ["target", "marker"])
    for index in [1, 2]:
        save_image(make_dust(index), f"effects/mining/break_dust_{index:02d}.png", "effect", ["break", "dust"])
    for material in ["dirt", "stone", "copper", "hardstone", "iron"]:
        save_image(make_chips(material), f"effects/mining/chips_{material}.png", "effect", [material, "chips"])

    save_image(make_mine_entrance(), "structures/mine/mine_entrance_basic.png", "structure", ["mine", "entrance"])
    save_image(make_elevator_frame(), "structures/mine/elevator_frame_basic.png", "structure", ["mine", "elevator"])

    for frame in ["idle_01", "idle_02", "walk_01", "walk_02", "walk_03", "walk_04", "mine_windup", "mine_hit", "mine_recover"]:
        save_image(make_worker_frame(frame), f"characters/worker/miner_{frame}.png", "character", ["worker", frame])

    save_image(make_pickaxe_prop(), "camp/props/pickaxe_upgrade_01.png", "camp", ["upgrade", "pickaxe"])
    save_image(make_barrel(), "camp/props/stamina_barrel_01.png", "camp", ["upgrade", "stamina"])
    save_image(make_elevator_crate(), "camp/props/elevator_crate_01.png", "camp", ["upgrade", "elevator"])
    save_image(make_tent(), "camp/tent/tent_basic.png", "camp", ["tent", "surface"])
    save_image(make_upgrade_board(), "camp/upgrade_board/upgrade_board_basic.png", "camp", ["upgrade", "board"])

    build_tilesheet()
    build_dense_preview(asset_paths)
    build_contact_sheet(asset_paths)
    write_manifest()

    print(f"Generated {len(records)} asset records in {OUT}")


if __name__ == "__main__":
    main()
