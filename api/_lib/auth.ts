// Shared utilities for Vercel serverless functions
// JWT, cookie parsing, auth verification, response helpers

import type { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD } from "./config.js";

export interface AuthenticatedRequest extends VercelRequest {
  user?: any;
}

// Parse cookies from Cookie header
export function parseCookies(req: VercelRequest): Record<string, string> {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((pair: string) => {
    const [k, ...rest] = pair.trim().split("=");
    if (k) cookies[k] = decodeURIComponent(rest.join("="));
  });
  return cookies;
}

// Extract bearer token from Authorization header OR cookie
export function getToken(req: VercelRequest, cookieName = "token"): string | null {
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  const cookies = parseCookies(req);
  return cookies[cookieName] || null;
}

// Verify user JWT
export function verifyUser(req: AuthenticatedRequest): any | null {
  const token = getToken(req, "token");
  if (!token) return null;
  try {
    return jwt.verify(token, SESSION_SECRET);
  } catch {
    return null;
  }
}

// Verify admin JWT (must have role === "admin" (super admin) or "staff" (employee))
export function verifyAdmin(req: AuthenticatedRequest): any | null {
  const token = getToken(req, "adminToken");
  if (!token) return null;
  try {
    const decoded: any = jwt.verify(token, SESSION_SECRET);
    if (decoded.role !== "admin" && decoded.role !== "staff") return null;
    return decoded;
  } catch {
    return null;
  }
}

// Check whether the verified admin token belongs to a SUPER admin (not employee staff)
export function isSuperAdmin(admin: any): boolean {
  return Boolean(admin && admin.role === "admin");
}

// Middleware-style: returns 401 if user not authed
export function requireUser(req: AuthenticatedRequest, res: VercelResponse): any | null {
  const user = verifyUser(req);
  if (!user) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return null;
  }
  req.user = user;
  return user;
}

// Middleware-style: returns 403 if not admin (staff or super admin both allowed)
export function requireAdmin(req: AuthenticatedRequest, res: VercelResponse): any | null {
  const admin = verifyAdmin(req);
  if (!admin) {
    res.status(401).json({ success: false, error: "Admin authentication required" });
    return null;
  }
  req.user = admin;
  return admin;
}

// Middleware-style: returns 403 unless token belongs to the SUPER admin
export function requireSuperAdmin(req: AuthenticatedRequest, res: VercelResponse): any | null {
  const admin = verifyAdmin(req);
  if (!admin) {
    res.status(401).json({ success: false, error: "Admin authentication required" });
    return null;
  }
  if (!isSuperAdmin(admin)) {
    res
      .status(403)
      .json({ success: false, error: "Super administrator privileges required for this action." });
    return null;
  }
  req.user = admin;
  return admin;
}

// Set HTTP-only cookie via Set-Cookie header
export function setCookie(
  res: VercelResponse,
  name: string,
  value: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
    maxAge?: number; // seconds
    path?: string;
  } = {}
): void {
  const {
    httpOnly = true,
    secure = process.env.NODE_ENV === "production",
    sameSite = "lax",
    maxAge,
    path = "/",
  } = options;

  const parts: string[] = [`${name}=${encodeURIComponent(value)}`];
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  parts.push(`SameSite=${sameSite}`);
  if (typeof maxAge === "number") parts.push(`Max-Age=${maxAge}`);
  parts.push(`Path=${path}`);

  // Append (don't overwrite) so multiple cookies can be set
  const existing = res.getHeader("Set-Cookie");
  if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, parts.join("; ")]);
  } else if (typeof existing === "string") {
    res.setHeader("Set-Cookie", [existing, parts.join("; ")]);
  } else {
    res.setHeader("Set-Cookie", parts.join("; "));
  }
}

export function clearCookie(res: VercelResponse, name: string): void {
  setCookie(res, name, "", { maxAge: 0 });
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Sign user JWT
export function signUserToken(user: {
  id: string;
  email: string;
  role?: string;
  authority?: string;
  permissions?: string[];
}): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || "user",
      authority: user.authority || null,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    },
    SESSION_SECRET,
    {
      expiresIn: "30d",
    }
  );
}

// Sign admin JWT
export function signAdminToken(admin: { email: string; name: string }): string {
  return jwt.sign(
    { email: admin.email, role: "admin", name: admin.name },
    SESSION_SECRET,
    { expiresIn: "7d" }
  );
}

// Verify admin env credentials
export function isAdminCredentials(email: string, password: string): boolean {
  return (
    email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim() &&
    password === ADMIN_PASSWORD
  );
}

// ---------------------------------------------------------------------------
// POWER AUTHORITIES — Admin / Manager / Supervisor / IT hierarchy
//
// Stacked on top of the role system:
//   • role "admin"  → super administrator (env credentials)        rank 4
//   • role "staff"  + authority "admin"      → Administrator       rank 3
//   • role "staff"  + authority "manager"    → Manager             rank 2
//   • role "staff"  + authority "supervisor" → Supervisor          rank 1
//   • role "staff"  + authority "it"         → IT — Payment Gateway rank 0
//     (staff accounts created before this field existed default to supervisor)
//
// IT (rank 0) deliberately sits BELOW every other authority: it cannot pass
// any requireAuthority(...) check (supervisor needs rank 1+). Its ONLY extra
// capability is the payment-gateway configuration panel, guarded separately
// by requireGatewayTech() — see api/admin gateway-* routes.
// ---------------------------------------------------------------------------
export type Authority = "supervisor" | "manager" | "admin" | "it";

export const AUTHORITY_RANK: Record<string, number> = {
  it: 0,
  supervisor: 1,
  manager: 2,
  admin: 3,
};

export const AUTHORITY_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  supervisor: "Supervisor",
  it: "IT — Payment Gateway",
  super_admin: "Super Administrator",
};

/** Effective authority rank of a verified admin token. */
export function authorityRank(admin: any): number {
  if (!admin) return 0;
  if (admin.role === "admin") return 4; // super administrator
  // NB: must not be `|| 1` — IT's rank is legitimately 0 (lowest).
  const r = AUTHORITY_RANK[admin.authority];
  return r === undefined ? 1 : r; // unknown authority → treated as supervisor
}

/** Can this verified admin perform actions at the given minimum level? */
export function hasAuthority(admin: any, min: Authority): boolean {
  return authorityRank(admin) >= AUTHORITY_RANK[min];
}

/** Is this verified admin an IT-scoped account (Payment Gateway panel only)? */
export function isItScoped(admin: any): boolean {
  return Boolean(admin && admin.role !== "admin" && admin.authority === "it");
}

/** Normalize an incoming authority value. */
export function normalizeAuthority(value: any): Authority {
  const v = String(value || "").toLowerCase();
  if (v === "admin" || v === "manager" || v === "supervisor" || v === "it") return v as Authority;
  return "supervisor";
}

/**
 * Payment-gateway configuration guard: super administrator, an Administrator-
 * authority staff member, or an IT authority account. IT accounts have rank 0
 * so they fail every OTHER requireAuthority check — this is their only door.
 */
export function canConfigureGateway(admin: any): boolean {
  if (!admin) return false;
  if (admin.role === "admin") return true; // super administrator
  if (admin.authority === "it") return true;
  return authorityRank(admin) >= AUTHORITY_RANK.admin;
}

/** Middleware-style guard for the /api/admin/gateway-* routes. */
export function requireGatewayTech(req: AuthenticatedRequest, res: VercelResponse): any | null {
  const admin = verifyAdmin(req);
  if (!admin) {
    res.status(401).json({ success: false, error: "Admin authentication required" });
    return null;
  }
  if (!canConfigureGateway(admin)) {
    res.status(403).json({
      success: false,
      error: "Payment Gateway access requires IT or Administrator authority.",
    });
    return null;
  }
  req.user = admin;
  return admin;
}

// Middleware-style: requires admin with at least the given authority level.
// Super administrators always pass. Returns 403 with a clear message on failure.
export function requireAuthority(
  req: AuthenticatedRequest,
  res: VercelResponse,
  min: Authority
): any | null {
  const admin = verifyAdmin(req);
  if (!admin) {
    res.status(401).json({ success: false, error: "Admin authentication required" });
    return null;
  }
  if (!hasAuthority(admin, min)) {
    const needed = AUTHORITY_LABELS[min] || min;
    res.status(403).json({
      success: false,
      error: `${needed} authority or higher is required for this action.`,
    });
    return null;
  }
  req.user = admin;
  return admin;
}

/**
 * Staff-management guard: super administrator OR a staff account carrying
 * the "admin" (Administrator) power authority may manage staff accounts.
 */
export function requireStaffAuthority(req: AuthenticatedRequest, res: VercelResponse): any | null {
  const admin = verifyAdmin(req);
  if (!admin) {
    res.status(401).json({ success: false, error: "Admin authentication required" });
    return null;
  }
  if (!isSuperAdmin(admin) && admin.authority !== "admin") {
    res
      .status(403)
      .json({ success: false, error: "Administrator authority is required to manage staff accounts." });
    return null;
  }
  req.user = admin;
  return admin;
}

// CORS + JSON helpers
export function setCorsHeaders(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export function jsonOk(res: VercelResponse, data: any, status = 200) {
  setCorsHeaders(res);
  res.status(status).json(data);
}

export function jsonError(res: VercelResponse, error: string, status = 500) {
  setCorsHeaders(res);
  res.status(status).json({ success: false, error });
}

// Handle OPTIONS preflight
export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.status(204).end();
    return true;
  }
  return false;
}
