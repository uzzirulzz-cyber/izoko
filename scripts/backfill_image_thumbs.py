#!/usr/bin/env python3
"""
backfill_image_thumbs.py — one-time additive thumbnail backfill (perf task §7).

For every image doc in `product_images` and `media_assets` WITHOUT a stored
thumbnail, generates the SAME ≤600px / q78 WebP thumbnail the admin upload
pipeline produces client-side (src/lib/uploadImage.ts: MAX_THUMB_DIMENSION=600,
encodeCanvas(..., MAX_THUMB_BYTES=200*1024, 0.78)) and stores it as
thumbBytes/thumbMime/thumbSize — additive $set only, originals untouched.

Then sets products.imageThumb for every product whose main image references
either image route (mirrors mediaThumbUrl() in src/lib/uploadImage.ts) and
swaps the 2 placeholder rows from the 1.88MB /playbeat-logo.png to the new
800px WebP variant.

Idempotent: docs/products already carrying a thumb are skipped.
Usage:  python3 scripts/backfill_image_thumbs.py [--dry-run]
Requires: MONGODB_URI in env or repo-root .env (same resolution as
scripts/_mongo_uri.cjs). Never prints the URI.
"""
import base64
import io
import os
import re
import sys

from PIL import Image
from bson import Binary
import pymongo

MAX_THUMB_DIMENSION = 600
MAX_THUMB_BYTES = 200 * 1024
THUMB_QUALITY = 78

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def mongo_uri():
    uri = os.environ.get("MONGODB_URI")
    if uri:
        return uri
    env_path = os.path.join(REPO, ".env")
    if os.path.exists(env_path):
        for line in open(env_path, encoding="utf-8"):
            m = re.match(r"^\s*MONGODB_URI\s*=\s*(.+?)\s*$", line)
            if m:
                v = m.group(1).strip("\"'")
                if v.startswith("mongodb"):
                    return v
    raise SystemExit("MONGODB_URI not configured (env or repo .env)")


def to_buffer(b):
    if b is None:
        return None
    if isinstance(b, bytes):
        return b
    if isinstance(b, Binary) or hasattr(b, "__buffer__"):
        return bytes(b)
    return None


def make_thumb(data: bytes, mime: str):
    """Mirror compressImageFileWithThumb(): returns (bytes, mime) or None."""
    if (mime or "").lower() == "image/gif":
        return None  # animation must never be flattened
    try:
        im = Image.open(io.BytesIO(data))
        im.load()
    except Exception:
        return None
    w, h = im.size
    if max(w, h) <= MAX_THUMB_DIMENSION:
        # main image IS its own thumbnail when small enough (pipeline parity)
        if len(data) <= MAX_THUMB_BYTES * 1.35:
            return data, mime
        # small but heavy (heavy PNG) — still re-encode below
    im2 = im.convert("RGBA")
    im2.thumbnail((MAX_THUMB_DIMENSION, MAX_THUMB_DIMENSION), Image.LANCZOS)
    for q in (THUMB_QUALITY, 65):
        out = io.BytesIO()
        im2.save(out, "WEBP", quality=q, method=6)
        blob = out.getvalue()
        if len(blob) <= MAX_THUMB_BYTES * 1.35:
            return blob, "image/webp"
    # last resort: keep the q65 result (still far smaller than the original)
    return blob, "image/webp"


def process_collection(db, name, dry):
    col = db[name]
    total = thumbs_before = generated = skipped_small = skipped_fmt = 0
    for doc in col.find({}):
        total += 1
        if doc.get("thumbBytes"):
            thumbs_before += 1
            continue
        data = to_buffer(doc.get("bytes"))
        if not data:
            continue
        res = make_thumb(data, doc.get("mime") or "")
        if not res:
            skipped_fmt += 1
            continue
        blob, tm = res
        if blob == data:
            skipped_small += 1
        if not dry:
            col.update_one(
                {"_id": doc["_id"]},
                {"$set": {"thumbBytes": Binary(blob),
                          "thumbMime": tm,
                          "thumbSize": len(blob),
                          "thumbGeneratedAt": __import__("datetime").datetime.utcnow()}},
            )
        generated += 1
    print(f"[{name}] total={total} hadThumb={thumbs_before} generated={generated} "
          f"(self-thumb {skipped_small}, skipped-format {skipped_fmt})")
    return generated


def image_thumb_url(image: str) -> str | None:
    if not isinstance(image, str):
        return None
    if image.startswith("/api/admin/media?id="):
        return f"{image}&t=1"
    if re.match(r"^/api/products/images/[0-9a-fA-F]{24}", image):
        return f"{image}?t=1"
    return None


def backfill_products(db, dry):
    col = db["products"]
    stats = {"media": 0, "prodimg": 0, "placeholder": 0, "already": 0, "missing_thumb": 0}
    for p in col.find({}, {"image": 1, "imageThumb": 1}):
        img = p.get("image")
        if not isinstance(img, str):
            continue
        if img == "/playbeat-logo.png":
            if not dry:
                col.update_one({"_id": p["_id"]}, {"$set": {"image": "/playbeat-logo-800.webp"}})
            stats["placeholder"] += 1
            continue
        tu = image_thumb_url(img)
        if not tu:
            continue
        if p.get("imageThumb"):
            stats["already"] += 1
            continue
        # only set when the referenced image actually has a thumb now
        m = re.search(r"(?:id=|images/)([0-9a-fA-F]{24})", img)
        has = False
        if m:
            oid = None
            try:
                from bson import ObjectId
                oid = ObjectId(m.group(1))
            except Exception:
                oid = None
            for cname in ("product_images", "media_assets"):
                q = {"thumbBytes": {"$exists": True}, "$or": [{"_id": m.group(1)}]}
                if oid is not None:
                    q["$or"].append({"_id": oid})
                has = has or bool(db[cname].find_one(q, {"_id": 1}))
        if not has:
            stats["missing_thumb"] += 1
            continue
        if not dry:
            col.update_one({"_id": p["_id"]}, {"$set": {"imageThumb": tu}})
        stats["media" if "media?id=" in img else "prodimg"] += 1
    print(f"[products] imageThumb set: {stats}")


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    client = pymongo.MongoClient(mongo_uri(), serverSelectionTimeoutMS=30000)
    db = client["playbeat"]
    print(f"mode: {'DRY-RUN' if dry else 'APPLY'}")
    g1 = process_collection(db, "product_images", dry)
    g2 = process_collection(db, "media_assets", dry)
    backfill_products(db, dry)
    print(f"done: {g1 + g2} thumbnails generated ({'dry-run' if dry else 'APPLIED'})")
