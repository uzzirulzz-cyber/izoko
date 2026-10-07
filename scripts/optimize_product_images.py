#!/home/z/.venv/bin/python3
"""
optimize_product_images.py — one-time production image optimization pass
(performance task §6/§7 "automatic image optimization pipeline").

For every oversized image stored in MongoDB:
  - product_images  (served by GET /api/products/images/:id)
  - media_assets    (served by GET /api/admin/media?id=)
this script stores a WebP re-encode as an ADDITIVE `opt` (and `opt640`)
variant on the same document:

    doc.opt    = { data, mime, size, width, height, created }  # <=1600px q82
    doc.opt640 = { data, mime, size, width, height, created }  # <=640px  q78

The original `bytes`/`data` field is NEVER modified or deleted — this is a
non-destructive, reversible optimization (delete the opt fields to revert).
Visual quality is preserved (q82 WebP, LANCZOS downscale from the original
resolution only when it exceeds 1600px). Filenames, titles, ALT text,
content-type of the original and every product/gallery association stay
exactly as they are.
"""
import io
import json
import time
from datetime import datetime, timezone

from bson import Binary
from PIL import Image
from pymongo import MongoClient


def _mongo_uri_from_env_file():
    """Read MONGODB_URI from the gitignored repo-root .env. Never hardcode credentials."""
    import os
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as fh:
            for line in fh:
                m = re.match(r"^\s*MONGODB_URI\s*=\s*(.+?)\s*$", line)
                if m:
                    v = m.group(1).strip("\"'")
                    if v.startswith("mongodb"):
                        return v
    raise SystemExit("MONGODB_URI not set (env or repo .env). Hardcoding DB credentials is forbidden.")


MONGO_URI = os.environ.get("MONGODB_URI") or _mongo_uri_from_env_file()
DB = "playbeat"
MAX_MAIN = 1600          # product image cap (task §7)
MAX_THUMB = 640          # card thumbnail cap (task §7)
Q_MAIN = 82              # task §7: quality 80-85
Q_THUMB = 78             # task §7: quality 75-80
MIN_BYTES = 40 * 1024    # don't bother with tiny images
SKIP_MIMES = {"image/gif", "image/svg+xml", "image/webp"}  # never blindly convert


def to_pil(data: bytes):
    im = Image.open(io.BytesIO(data))
    im.load()
    return im


def has_alpha(im) -> bool:
    return im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)


def encode(im, max_dim: int, quality: int) -> bytes:
    w, h = im.size
    scale = min(1.0, max_dim / max(w, h))
    if scale < 1.0:
        im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    out = io.BytesIO()
    if has_alpha(im):
        im = im.convert("RGBA")
        im.save(out, "WEBP", quality=quality, method=6)
    else:
        im = im.convert("RGB")
        im.save(out, "WEBP", quality=quality, method=6)
    return out.getvalue()


def variant_doc(webp: bytes, width: int, height: int, mime="image/webp") -> dict:
    return {
        "data": Binary(webp),
        "mime": mime,
        "size": len(webp),
        "width": width,
        "height": height,
        "created": datetime.now(timezone.utc).isoformat(),
    }


def process_collection(col, bytes_field: str, label: str) -> dict:
    stats = {"total": 0, "skipped_small": 0, "skipped_mime": 0, "already": 0,
             "errors": 0, "optimized": 0, "orig_bytes": 0, "opt_bytes": 0}
    docs = list(col.find({}, {bytes_field: 1, "mime": 1, "contentType": 1, "size": 1, "opt": 1, "opt640": 1}))
    for d in docs:
        stats["total"] += 1
        if "opt" in d:
            stats["already"] += 1
            continue
        mime = (d.get("mime") or d.get("contentType") or "").lower()
        raw = d.get(bytes_field)
        data = raw.buffer if hasattr(raw, "buffer") and raw.buffer else (bytes(raw) if raw is not None else b"")
        if not data:
            stats["errors"] += 1
            continue
        if len(data) < MIN_BYTES or mime in SKIP_MIMES:
            stats["skipped_small" if len(data) < MIN_BYTES else "skipped_mime"] += 1
            continue
        try:
            im = to_pil(data)
            w0, h0 = im.size
            main = encode(im, MAX_MAIN, Q_MAIN)
            thumb = encode(im, MAX_THUMB, Q_THUMB)
            # encode() downscales inside; recompute final dims from scaled size
            scale = min(1.0, MAX_MAIN / max(w0, h0))
            fw, fh = max(1, round(w0 * scale)), max(1, round(h0 * scale))
            tscale = min(1.0, MAX_THUMB / max(w0, h0))
            tw, th = max(1, round(w0 * tscale)), max(1, round(h0 * tscale))
            # sanity: never store an "optimization" that is bigger than source
            if len(main) >= len(data) and len(thumb) >= len(data):
                stats["skipped_mime"] += 1
                continue
            setv = {"opt": variant_doc(main, fw, fh), "opt640": variant_doc(thumb, tw, th)}
            col.update_one({"_id": d["_id"]}, {"$set": setv})
            stats["optimized"] += 1
            stats["orig_bytes"] += len(data)
            stats["opt_bytes"] += len(main) + len(thumb)
            print(f"  [{label}] {d['_id']} {w0}x{h0} {len(data)//1024}KB -> main {len(main)//1024}KB + thumb {len(thumb)//1024}KB")
        except Exception as e:
            stats["errors"] += 1
            print(f"  [{label}] ERROR {d['_id']}: {e}")
    return stats


def main():
    c = MongoClient(MONGO_URI, serverSelectionTimeoutMS=30000)
    db = c[DB]
    t0 = time.time()
    print("== product_images ==")
    s1 = process_collection(db["product_images"], "bytes", "pi")
    print("== media_assets ==")
    s2 = process_collection(db["media_assets"], "data", "ma")
    out = {
        "product_images": {k: v for k, v in s1.items()},
        "media_assets": {k: v for k, v in s2.items()},
        "seconds": round(time.time() - t0, 1),
    }
    print(json.dumps(out, indent=1))
    with open("/tmp/img_opt_stats.json", "w") as f:
        json.dump(out, f, indent=1)
    c.close()


if __name__ == "__main__":
    main()
