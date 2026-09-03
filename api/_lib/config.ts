// Shared config for Vercel serverless functions
// Mirrors the env vars used in server.ts

// SECURITY: no hardcoded fallbacks for secrets. This repo is PUBLIC — the
// previous committed defaults (Atlas URI, admin password, JWT secret) were
// world-readable and have been rotated / must be provided per-environment.
// Vercel injects these for production; missing values fail CLOSED:
//   - empty MONGODB_URI  → DB routes error out
//   - empty SESSION_SECRET → every jwt.verify/sign throws → all auth 401
export const MONGODB_URI = process.env.MONGODB_URI || "";
export const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "playbeat";
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@playbeat.digital";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
export const SESSION_SECRET = process.env.SESSION_SECRET || "";
export const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || "https://playbeat.digital";

export function cleanMongoUri(uri?: string): string {
  if (!uri) return MONGODB_URI;
  let cleaned = uri.trim();
  if (cleaned.startsWith("mongodb+srv:/") && !cleaned.startsWith("mongodb+srv://")) {
    cleaned = cleaned.replace("mongodb+srv:/", "mongodb://");
  }
  if (cleaned.startsWith("mongodb:/") && !cleaned.startsWith("mongodb://")) {
    cleaned = cleaned.replace("mongodb:/", "mongodb://");
  }
  return cleaned;
}

// Slug helper
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-and-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}
