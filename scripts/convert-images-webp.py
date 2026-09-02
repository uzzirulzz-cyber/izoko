#!/usr/bin/env python3
"""Convert product images to optimized WebP.

- Converts public/assets/images/products/*.{jpg,jpeg,png} -> .webp
- Resizes to max width 900px (product cards render far smaller)
- Quality 78 (visually lossless for catalog thumbnails/cards)
- Deletes originals after successful conversion (git history keeps them)
Prints a size before/after summary.
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET = os.path.join(ROOT, "public", "assets", "images", "products")
MAX_WIDTH = 900
QUALITY = 78

total_before = 0
total_after = 0
converted = 0
errors = []

for name in sorted(os.listdir(TARGET)):
    path = os.path.join(TARGET, name)
    base, ext = os.path.splitext(name)
    if ext.lower() not in (".jpg", ".jpeg", ".png"):
        continue
    if name.endswith(".webp"):
        continue

    try:
        before = os.path.getsize(path)
        total_before += before
        with Image.open(path) as im:
            im = im.convert("RGB")
            if im.width > MAX_WIDTH:
                new_h = round(im.height * MAX_WIDTH / im.width)
                im = im.resize((MAX_WIDTH, new_h), Image.LANCZOS)
            out_path = os.path.join(TARGET, base + ".webp")
            im.save(out_path, "WEBP", quality=QUALITY, method=6)
        after = os.path.getsize(out_path)
        total_after += after
        converted += 1
        os.remove(path)  # original replaced by webp
        print(f"{name} ({before//1024}KB) -> {base}.webp ({after//1024}KB)")
    except Exception as e:  # noqa: BLE001
        errors.append(f"{name}: {e}")

print("-" * 50)
print(f"converted: {converted} images")
if total_before:
    print(f"size: {total_before//1024}KB -> {total_after//1024}KB "
          f"({100 - round(total_after * 100 / total_before)}% smaller)")
if errors:
    print("ERRORS:", *errors, sep="\n  ")
    sys.exit(1)
