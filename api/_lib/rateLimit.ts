// In-memory sliding-window rate limiter for Vercel serverless functions.
//
// NOTE: serverless instances are ephemeral — this limiter is per-instance and
// best-effort. It reliably absorbs abusive bursts against a single warm
// function without external infrastructure; for hard global caps a shared
// store (e.g. MongoDB TTL collection or Upstash) would be required. Chosen
// deliberately: zero dependencies, zero cold-start cost, no extra round-trip
// on the hot path.

interface Bucket {
  hits: number[]
}

const buckets = new Map<string, Bucket>();

// Periodically purge stale buckets so the map cannot grow unbounded.
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
const BUCKET_TTL_MS = 15 * 60 * 1000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    const newest = bucket.hits[bucket.hits.length - 1] || 0;
    if (now - newest > BUCKET_TTL_MS) buckets.delete(key);
  }
}

export function clientIp(req: {
  headers: { [key: string]: string | string[] | undefined };
  socket?: { remoteAddress?: string };
}): string {
  const h = req.headers || {};
  const fwd = h["x-forwarded-for"];
  const first = Array.isArray(fwd) ? fwd[0] : fwd;
  if (first) return String(first).split(",")[0].trim();
  const real = h["x-real-ip"];
  if (real) return (Array.isArray(real) ? real[0] : real).trim();
  return req.socket?.remoteAddress || "unknown";
}

/**
 * Consume one hit against the limit. Returns true when the request is ALLOWED,
 * false when the caller has exceeded `limit` requests within `windowMs`.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key) || { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    buckets.set(key, bucket);
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, retryAfterSec: 0 };
}

// ---------------------------------------------------------------------------
// MongoDB-backed limiter — SHARED across all serverless instances (the
// in-memory limiter above is per-instance and therefore leaky on Vercel,
// where requests rotate between warm lambdas). Uses fixed time-bucket
// counters in a TTL collection: one atomic findOneAndUpdate per call.
// Fails OPEN on database errors — availability beats strictness for
// non-security-critical damping (webhooks have their own crypto auth).
// ---------------------------------------------------------------------------

let ttlIndexReady = false;

export async function mongoRateLimit(
  db: any,
  key: string,
  limit: number,
  windowSec: number
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  try {
    const col = db.collection("rate_limits");
    if (!ttlIndexReady) {
      try {
        await col.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
        ttlIndexReady = true;
      } catch {
        /* index already exists */
      }
    }
    const bucket = Math.floor(Date.now() / (windowSec * 1000));
    const res = await col.findOneAndUpdate(
      { _id: `${key}:${bucket}` },
      {
        $inc: { count: 1 },
        $setOnInsert: { firstHit: new Date() },
        $set: { expireAt: new Date(Date.now() + windowSec * 2000) },
      },
      { upsert: true, returnDocument: "after" }
    );
    const count = Number(res?.count ?? res?.value?.count ?? 1);
    if (count > limit) {
      const retryAfterSec = Math.max(
        1,
        windowSec - Math.floor((Date.now() % (windowSec * 1000)) / 1000)
      );
      return { allowed: false, retryAfterSec };
    }
    return { allowed: true, retryAfterSec: 0 };
  } catch {
    // Database hiccup → allow the request (fail open), never break the UX.
    return { allowed: true, retryAfterSec: 0 };
  }
}
