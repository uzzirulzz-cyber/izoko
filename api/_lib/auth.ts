// Shared utilities for Vercel serverless functions
// JWT, cookie parsing, auth verification, response helpers

import type { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD } from "./config";

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

// Verify admin JWT (must have role === "admin")
export function verifyAdmin(req: AuthenticatedRequest): any | null {
  const token = getToken(req, "adminToken");
  if (!token) return null;
  try {
    const decoded: any = jwt.verify(token, SESSION_SECRET);
    if (decoded.role !== "admin") return null;
    return decoded;
  } catch {
    return null;
  }
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

// Middleware-style: returns 403 if not admin
export function requireAdmin(req: AuthenticatedRequest, res: VercelResponse): any | null {
  const admin = verifyAdmin(req);
  if (!admin) {
    res.status(401).json({ success: false, error: "Admin authentication required" });
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
export function signUserToken(user: { id: string; email: string; role?: string }): string {
  return jwt.sign({ id: user.id, email: user.email, role: user.role || "user" }, SESSION_SECRET, {
    expiresIn: "30d",
  });
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
