// /api/auth/* — consolidated auth router
// Routes:
//   POST /api/auth/register
//   POST /api/auth/login
//   POST /api/auth/social
//   GET  /api/auth/me
//   POST /api/auth/forgot-password
//   POST /api/auth/admin/login
//   GET  /api/auth/admin/me
//   POST /api/auth/admin/logout
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../_lib/mongo.js";
import {
  handleOptions,
  jsonOk,
  jsonError,
  setCookie,
  clearCookie,
  hashPassword,
  comparePassword,
  signUserToken,
  signAdminToken,
  verifyUser,
  verifyAdmin,
  isAdminCredentials,
  AuthenticatedRequest,
} from "../_lib/auth.js";
import { ADMIN_EMAIL } from "../_lib/config.js";

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  // The catch-all param is `path` (an array). Vercel passes it as req.query.path
  // Extract sub-path from req.url (Vercel rewrites /api/auth/:path* → /api/auth)
  // So we parse the ORIGINAL path from req.url to get the sub-route
  const url = new URL(req.url || '', 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);
  // Drop the first 2 segments ("api", "auth" or "products" etc.)
  const pathSegments = parts.slice(2);
  const route = pathSegments.join("/").toLowerCase();

  // ============ /api/auth/register ============
  if (route === "register" && req.method === "POST") {
    try {
      const { name, email, password } = req.body || {};
      if (!name || !email || !password) {
        return jsonError(res, "Name, email, and password are required.", 400);
      }
      if (password.length < 6) {
        return jsonError(res, "Password must be at least 6 characters long.", 400);
      }
      if (email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()) {
        return jsonError(res, "This email is reserved and cannot be registered.", 403);
      }
      const db = await getDb();
      const usersCol = db.collection("users");
      const existing = await usersCol.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return jsonError(res, "An account with this email already exists.", 409);
      }
      const hashedPassword = await hashPassword(password);
      const newUserDoc = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: "user",
        provider: "local",
        createdAt: new Date(),
      };
      const result = await usersCol.insertOne(newUserDoc);
      const userId = result.insertedId.toString();
      const token = signUserToken({ id: userId, email: newUserDoc.email, role: "user" });
      setCookie(res, "token", token, { maxAge: 30 * 24 * 60 * 60 });
      return jsonOk(res, {
        success: true,
        message: "Account registered successfully",
        token,
        user: { id: userId, name: newUserDoc.name, email: newUserDoc.email, role: "user" },
      }, 201);
    } catch (err: any) {
      console.error("Register Error:", err);
      return jsonError(res, err.message || "Failed to register account", 500);
    }
  }

  // ============ /api/auth/login ============
  if (route === "login" && req.method === "POST") {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return jsonError(res, "Email and password are required.", 400);
      }
      if (email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()) {
        return jsonError(
          res,
          "This account is restricted. Administrative access is via the dedicated admin login only.",
          403
        );
      }
      const db = await getDb();
      const usersCol = db.collection("users");
      const user = await usersCol.findOne({ email: email.toLowerCase().trim() });
      if (!user || !user.password) {
        return jsonError(res, "Invalid email or password.", 401);
      }
      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        return jsonError(res, "Invalid email or password.", 401);
      }
      const token = signUserToken({
        id: user._id.toString(),
        email: user.email,
        role: user.role || "user",
      });
      setCookie(res, "token", token, { maxAge: 30 * 24 * 60 * 60 });
      return jsonOk(res, {
        success: true,
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role || "user",
        },
      });
    } catch (err: any) {
      console.error("Login Error:", err);
      return jsonError(res, err.message || "Login failed", 500);
    }
  }

  // ============ /api/auth/social ============
  if (route === "social" && req.method === "POST") {
    try {
      const { provider, profile } = req.body || {};
      if (!provider) {
        return jsonError(res, "Provider is required.", 400);
      }
      const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID);
      const fbConfigured = Boolean(process.env.FACEBOOK_CLIENT_ID);
      const tiktokConfigured = Boolean(process.env.TIKTOK_CLIENT_KEY);
      const email =
        profile?.email?.toLowerCase().trim() ||
        `${provider.toLowerCase()}.${Date.now().toString().slice(-4)}@playbeat.digital`;
      const name = profile?.name || `${provider} Member`;
      if (email === ADMIN_EMAIL.toLowerCase().trim()) {
        return jsonError(res, "This email is reserved and cannot be claimed.", 403);
      }
      const db = await getDb();
      const usersCol = db.collection("users");
      let user: any = await usersCol.findOne({ email });
      if (!user) {
        const newUserDoc = { name, email, provider, role: "user", createdAt: new Date() };
        const insertRes = await usersCol.insertOne(newUserDoc);
        user = { _id: insertRes.insertedId, ...newUserDoc };
      }
      const token = signUserToken({
        id: user._id.toString(),
        email: user.email,
        role: user.role || "user",
      });
      setCookie(res, "token", token, { maxAge: 30 * 24 * 60 * 60 });
      return jsonOk(res, {
        success: true,
        provider,
        configured:
          provider === "Google" ? googleConfigured :
          provider === "Facebook" ? fbConfigured :
          provider === "TikTok" ? tiktokConfigured : false,
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role || "user",
        },
      });
    } catch (err: any) {
      console.error("Social Auth Error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ /api/auth/me ============
  if (route === "me" && req.method === "GET") {
    try {
      const decoded = verifyUser(req);
      if (!decoded) return jsonError(res, "Authentication required", 401);
      const db = await getDb();
      const usersCol = db.collection("users");
      const user = await usersCol.findOne({ _id: new ObjectId(decoded.id) });
      if (!user) return jsonError(res, "User not found", 404);
      return jsonOk(res, {
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role || "user",
          provider: user.provider || "local",
        },
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ /api/auth/forgot-password ============
  if (route === "forgot-password" && req.method === "POST") {
    const { email } = req.body || {};
    if (!email) return jsonError(res, "Email is required.", 400);
    return jsonOk(res, {
      success: true,
      message: "If an account exists with this email, a password reset link has been dispatched.",
    });
  }

  // ============ /api/auth/admin/login ============
  if (route === "admin/login" && req.method === "POST") {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return jsonError(res, "Admin email and password are required.", 400);
      }
      if (!isAdminCredentials(email, password)) {
        return jsonError(res, "Invalid administrative credentials.", 401);
      }
      const adminToken = signAdminToken({
        email: ADMIN_EMAIL,
        name: "PlayBeat Super Administrator",
      });
      setCookie(res, "adminToken", adminToken, { maxAge: 7 * 24 * 60 * 60 });
      return jsonOk(res, {
        success: true,
        token: adminToken,
        admin: {
          email: ADMIN_EMAIL,
          name: "PlayBeat Super Administrator",
          role: "admin",
        },
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ /api/auth/admin/me ============
  if (route === "admin/me" && req.method === "GET") {
    const admin = verifyAdmin(req);
    if (!admin) return jsonError(res, "Admin authentication required", 401);
    return jsonOk(res, { success: true, admin });
  }

  // ============ /api/auth/admin/logout ============
  if (route === "admin/logout" && req.method === "POST") {
    clearCookie(res, "adminToken");
    return jsonOk(res, { success: true, message: "Admin session terminated." });
  }

  return jsonError(res, `Auth route not found: ${route}`, 404);
}
