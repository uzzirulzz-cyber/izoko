// /api/media/:id — PUBLIC product-media server
// ---------------------------------------------------------------------------
// Serves image bytes stored in MongoDB `media_assets` (uploaded via
// POST /api/admin/media). Product documents only ever reference the URL
// "/api/media/<id>" — base64 image data must NEVER live inside a product
// document (Vercel caps serverless request bodies at ~4.5MB, and large
// base64 strings inside catalog JSON caused HTTP 413 on every save).
//
// GET /api/media/:id   → image bytes (Content-Type + immutable caching)
//
// The id is the Mongo ObjectId of the asset. Content for a given id never
// changes (assets are immutable — re-uploads create new ids), so the
// response is safe to cache aggressively at the edge/browser.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../_lib/mongo.js";

export const config = { api: { bodyParser: false } };

// BSON Binary arrives in different shapes depending on the driver version —
// cover every one explicitly (same approach as the proven avatar endpoint).
function toBuffer(stored: any): Buffer | null {
  if (Buffer.isBuffer(stored)) return stored;
  if (stored && Buffer.isBuffer(stored.buffer)) {
    return stored.buffer.subarray(0, stored.position || stored.buffer.length);
  }
  if (stored && stored.buffer instanceof ArrayBuffer) {
    return Buffer.from(
      new Uint8Array(stored.buffer, 0, stored.position || stored.buffer.byteLength)
    );
  }
  if (stored instanceof Uint8Array) return Buffer.from(stored);
  if (typeof stored === "string") {
    try {
      return Buffer.from(stored, "base64");
    } catch {
      return null;
    }
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ success: false, error: "Method not allowed." });
  }

  // In the Vercel Node runtime dynamic segments arrive on req.query; the
  // final path segment is the id either way.
  const rawId = String(
    (req.query && (req.query.id as string)) ||
      String(req.url || "").split("?")[0].split("/").pop() ||
      ""
  ).trim();

  if (!ObjectId.isValid(rawId)) {
    return res.status(404).json({ success: false, error: "Media not found." });
  }

  try {
    const db = await getDb();
    const doc = await db.collection("media_assets").findOne({ _id: new ObjectId(rawId) });
    if (!doc) {
      return res.status(404).json({ success: false, error: "Media not found." });
    }
    const bytes = toBuffer(doc.bytes);
    if (!bytes || bytes.length === 0) {
      return res
        .status(500)
        .json({ success: false, error: "Stored media is unreadable." });
    }

    // Raw Node response API — the VercelResponse helper does not reliably
    // transmit binary bodies in this runtime (see avatar endpoint note).
    res.writeHead(200, {
      "Content-Type": String(doc.mime || "application/octet-stream"),
      // Assets are immutable: a re-upload produces a new id, so a year of
      // immutable caching is safe and keeps the storefront snappy.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Length": String(bytes.length),
    });
    res.end(req.method === "HEAD" ? undefined : bytes);
  } catch (err: any) {
    console.error("GET /api/media/:id error:", err);
    return res.status(500).json({ success: false, error: "Failed to serve media." });
  }
}
