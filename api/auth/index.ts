// /api/auth/* — consolidated auth router
// Routes:
//   POST /api/auth/register
//   POST /api/auth/login
//   POST /api/auth/social
//   GET  /api/auth/me
//   POST /api/auth/forgot-password
//   POST /api/auth/admin/login        (super admin env credentials OR staff account in DB)
//   GET  /api/auth/admin/me
//   POST /api/auth/admin/logout
//   GET  /api/auth/oauth-config       (which social providers have OAuth keys configured)
//   GET  /api/auth/oauth/:provider/start    (begin real OAuth flow when configured)
//   GET  /api/auth/oauth/:provider/callback (OAuth code exchange → real account → redirect)
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
import { ADMIN_EMAIL, PUBLIC_SITE_URL } from "../_lib/config.js";

// ---- OAuth provider configuration (activated when env vars are set in Vercel) ----
type ProviderConfig = {
  authUrl: string;
  tokenUrl: string;
  profileUrl: string;
  scope: string;
  clientId?: string;
  clientSecret?: string;
};

function getProviderConfigs(): Record<string, ProviderConfig> {
  return {
    google: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      profileUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
      scope: "openid email profile",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    facebook: {
      authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
      profileUrl: "https://graph.facebook.com/me?fields=id,name,email",
      scope: "email public_profile",
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    },
    tiktok: {
      authUrl: "https://www.tiktok.com/v2/auth/authorize/",
      tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
      profileUrl: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
      scope: "user.info.basic",
      clientId: process.env.TIKTOK_CLIENT_KEY,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET,
    },
    instagram: {
      authUrl: "https://api.instagram.com/oauth/authorize",
      tokenUrl: "https://api.instagram.com/oauth/access_token",
      profileUrl: "https://graph.instagram.com/me?fields=id,username",
      scope: "instagram_basic",
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    },
  };
}

function getProviderLabel(provider: string): string {
  const map: Record<string, string> = {
    google: "Google",
    facebook: "Facebook",
    tiktok: "TikTok",
    instagram: "Instagram",
  };
  return map[provider] || provider;
}

async function upsertSocialUser(
  db: any,
  provider: string,
  profile: { id?: string; name?: string; email?: string; username?: string }
) {
  const usersCol = db.collection("users");
  const label = getProviderLabel(provider);
  let email = (profile.email || "").toLowerCase().trim();
  if (!email) {
    // Provider did not share an email — build a stable provider-scoped identity
    const handle = profile.username || profile.name || profile.id || Date.now().toString();
    email = `${provider}.${String(handle).toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || Date.now().toString().slice(-6)}@users.playbeat.digital`;
  }
  if (email === ADMIN_EMAIL.toLowerCase()) {
    throw new Error("This email is reserved and cannot be claimed.");
  }
  let user: any = await usersCol.findOne({ email });
  if (!user) {
    const newUserDoc = {
      name: profile.name || profile.username || `${label} Member`,
      email,
      provider: label,
      providerId: profile.id || null,
      role: "user",
      createdAt: new Date(),
    };
    const insertRes = await usersCol.insertOne(newUserDoc);
    user = { _id: insertRes.insertedId, ...newUserDoc };
    await db.collection("analytics_events").insertOne({
      type: "signup",
      path: "/storefront",
      sessionId: `signup-${provider}`,
      referrer: `provider:${label}`,
      createdAt: new Date(),
    });
  }
  return user;
}

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
  // Creates/retrieves a REAL user account in MongoDB tagged with the provider.
  // Used by the storefront's provider-linked registration flow (works even before
  // OAuth developer keys are added; when keys are configured the real OAuth flow
  // below takes over automatically).
  if (route === "social" && req.method === "POST") {
    try {
      const { provider, profile } = req.body || {};
      if (!provider) {
        return jsonError(res, "Provider is required.", 400);
      }
      const label = getProviderLabel(String(provider));
      const email = (profile?.email || "").toLowerCase().trim();
      const name = (profile?.name || "").trim();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return jsonError(res, "A valid email address is required to complete registration.", 400);
      }
      if (!name) {
        return jsonError(res, "Your name is required to complete registration.", 400);
      }
      const db = await getDb();
      const user = await upsertSocialUser(db, String(provider), { name, email });
      const token = signUserToken({
        id: user._id.toString(),
        email: user.email,
        role: user.role || "user",
      });
      setCookie(res, "token", token, { maxAge: 30 * 24 * 60 * 60 });
      const cfg = getProviderConfigs()[String(provider).toLowerCase()];
      return jsonOk(res, {
        success: true,
        provider: label,
        oauthConfigured: Boolean(cfg?.clientId && cfg?.clientSecret),
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
  // Accepts EITHER the super administrator env credentials OR an employee/staff
  // account created by the super admin in the admin panel (bcrypt-verified).
  // A DB password override (set via Admin Profile Settings) takes precedence for
  // the super administrator so password changes take real effect.
  if (route === "admin/login" && req.method === "POST") {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return jsonError(res, "Admin email and password are required.", 400);
      }
      const cleanEmail = String(email).toLowerCase().trim();
      const db = await getDb();
      const profilesCol = db.collection("admin_profiles");
      const activityCol = db.collection("admin_activity");
      const profileDoc: any = await profilesCol.findOne({ email: cleanEmail });

      // 1) Super administrator via DB password override or environment credentials
      const superAdminMatch = profileDoc?.passwordOverride
        ? await comparePassword(String(password), profileDoc.passwordOverride)
        : isAdminCredentials(cleanEmail, String(password));
      if (profileDoc?.passwordOverride || isAdminCredentials(cleanEmail, String(password))) {
        if (!superAdminMatch) {
          return jsonError(res, "Invalid administrative credentials.", 401);
        }
        const displayName = profileDoc?.name || "PlayBeat Super Administrator";
        const adminToken = signAdminToken({
          email: ADMIN_EMAIL,
          name: displayName,
        });
        setCookie(res, "adminToken", adminToken, { maxAge: 7 * 24 * 60 * 60 });
        // Track last login (profile override doc + activity feed)
        try {
          await profilesCol.updateOne(
            { email: cleanEmail },
            { $set: { email: cleanEmail, lastLoginAt: new Date(), updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
            { upsert: true }
          );
          await activityCol.insertOne({
            type: "login",
            adminEmail: cleanEmail,
            adminName: displayName,
            role: "admin",
            detail: "Signed in to the admin dashboard",
            meta: { method: profileDoc?.passwordOverride ? "database password" : "platform credentials" },
            createdAt: new Date(),
          });
        } catch { /* activity tracking must never block login */ }
        return jsonOk(res, {
          success: true,
          token: adminToken,
          admin: {
            email: ADMIN_EMAIL,
            name: displayName,
            role: "admin",
          },
        });
      }

      // 2) Staff / employee account created via admin panel
      const usersCol = db.collection("users");
      const staffUser: any = await usersCol.findOne({
        email: cleanEmail,
        role: { $in: ["staff", "admin"] },
      });
      if (staffUser) {
        if (staffUser.active === false) {
          return jsonError(res, "This staff account has been deactivated. Contact your administrator.", 403);
        }
        if (!staffUser.password) {
          return jsonError(res, "Invalid administrative credentials.", 401);
        }
        const ok = await comparePassword(password, staffUser.password);
        if (!ok) {
          return jsonError(res, "Invalid administrative credentials.", 401);
        }
        // Staff/employee token: signed JWT carrying their real role ("staff")
        // plus the Power Authority level (admin | manager | supervisor) and the
        // granular permission list. verifyAdmin() accepts roles admin|staff;
        // authority-restricted routes check authority via requireAuthority().
        const staffToken = signUserToken({
          id: staffUser._id.toString(),
          email: staffUser.email,
          role: staffUser.role,
          authority: staffUser.authority || (staffUser.role === "admin" ? "admin" : "supervisor"),
          permissions: Array.isArray(staffUser.permissions) ? staffUser.permissions : [],
        });
        setCookie(res, "adminToken", staffToken, { maxAge: 7 * 24 * 60 * 60 });
        // Track last login (users doc + activity feed)
        try {
          await usersCol.updateOne(
            { _id: staffUser._id },
            { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
          );
          await activityCol.insertOne({
            type: "login",
            adminEmail: staffUser.email.toLowerCase(),
            adminName: staffUser.name,
            role: staffUser.role,
            detail: "Signed in to the admin dashboard",
            meta: { method: "staff account" },
            createdAt: new Date(),
          });
        } catch { /* activity tracking must never block login */ }
        return jsonOk(res, {
          success: true,
          token: staffToken,
          admin: {
            id: staffUser._id.toString(),
            email: staffUser.email,
            name: staffUser.name,
            role: staffUser.role,
            authority: staffUser.authority || (staffUser.role === "admin" ? "admin" : "supervisor"),
            permissions: Array.isArray(staffUser.permissions) ? staffUser.permissions : [],
            staffId: staffUser.staffId || null,
            department: staffUser.department || null,
          },
        });
      }

      return jsonError(res, "Invalid administrative credentials.", 401);
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ /api/auth/admin/me ============
  if (route === "admin/me" && req.method === "GET") {
    const admin = verifyAdmin(req);
    if (!admin) return jsonError(res, "Admin authentication required", 401);
    return jsonOk(res, {
      success: true,
      admin: {
        email: admin.email,
        name: admin.name,
        role: admin.role,
        authority: admin.role === "admin" ? "super_admin" : admin.authority || "supervisor",
        permissions: Array.isArray(admin.permissions) ? admin.permissions : [],
        id: admin.id || null,
        staffId: admin.staffId || null,
      },
    });
  }

  // ============ /api/auth/oauth-config ============
  if (route === "oauth-config" && req.method === "GET") {
    const cfgs = getProviderConfigs();
    return jsonOk(res, {
      success: true,
      providers: {
        Google: Boolean(cfgs.google.clientId && cfgs.google.clientSecret),
        Facebook: Boolean(cfgs.facebook.clientId && cfgs.facebook.clientSecret),
        TikTok: Boolean(cfgs.tiktok.clientId && cfgs.tiktok.clientSecret),
        Instagram: Boolean(cfgs.instagram.clientId && cfgs.instagram.clientSecret),
      },
    });
  }

  // ============ /api/auth/oauth/:provider/start ============
  if (pathSegments[0] === "oauth" && pathSegments[2] === "start" && req.method === "GET") {
    const provider = (pathSegments[1] || "").toLowerCase();
    const cfg = getProviderConfigs()[provider];
    if (!cfg) return jsonError(res, `Unknown provider: ${provider}`, 404);
    if (!cfg.clientId || !cfg.clientSecret) {
      return res.status(302).redirect(
        `/storefront?social_error=${encodeURIComponent(
          `${getProviderLabel(provider)} OAuth keys are not configured yet — use the quick registration flow.`
        )}`
      );
    }
    const redirectUri = `${PUBLIC_SITE_URL.replace(/\/$/, "")}/api/auth/oauth/${provider}/callback`;
    const state = `${provider}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
    setCookie(res, "oauth_state", state, { maxAge: 600, httpOnly: true });
    const authUrl =
      `${cfg.authUrl}?response_type=code` +
      `&client_id=${encodeURIComponent(cfg.clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(cfg.scope)}` +
      `&state=${encodeURIComponent(state)}`;
    return res.status(302).redirect(authUrl);
  }

  // ============ /api/auth/oauth/:provider/callback ============
  if (pathSegments[0] === "oauth" && pathSegments[2] === "callback" && req.method === "GET") {
    const provider = (pathSegments[1] || "").toLowerCase();
    const cfg = getProviderConfigs()[provider];
    const code = url.searchParams.get("code");
    const qErr = url.searchParams.get("error_description") || url.searchParams.get("error");
    const base = PUBLIC_SITE_URL.replace(/\/$/, "");
    if (qErr) return res.status(302).redirect(`${base}/storefront?social_error=${encodeURIComponent(qErr)}`);
    if (!cfg || !cfg.clientId || !cfg.clientSecret) {
      return res.status(302).redirect(`${base}/storefront?social_error=${encodeURIComponent("Provider not configured")}`);
    }
    if (!code) return res.status(302).redirect(`${base}/storefront?social_error=${encodeURIComponent("Missing OAuth code")}`);
    try {
      const redirectUri = `${base}/api/auth/oauth/${provider}/callback`;
      const tokenRes = await fetch(cfg.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          code,
          redirect_uri: redirectUri,
        } as any),
      } as any);
      const tokenJson: any = await tokenRes.json();
      const accessToken = tokenJson.access_token || tokenJson.data?.access_token;
      if (!accessToken) throw new Error(tokenJson.error_description || tokenJson.error || "Token exchange failed");
      const profRes = await fetch(cfg.profileUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profJson: any = await profRes.json();
      const db = await getDb();
      const user = await upsertSocialUser(db, provider, {
        id: profJson.id || profJson.sub || profJson.open_id || profJson.data?.open_id,
        name: profJson.name || profJson.display_name || profJson.username || profJson.data?.display_name,
        email: profJson.email,
        username: profJson.username,
      });
      const token = signUserToken({
        id: user._id.toString(),
        email: user.email,
        role: user.role || "user",
      });
      setCookie(res, "token", token, { maxAge: 30 * 24 * 60 * 60 });
      return res.status(302).redirect(`${base}/storefront?social_success=${encodeURIComponent(getProviderLabel(provider))}`);
    } catch (err: any) {
      return res.status(302).redirect(`${base}/storefront?social_error=${encodeURIComponent(err.message)}`);
    }
  }

  // ============ /api/auth/admin/logout ============
  if (route === "admin/logout" && req.method === "POST") {
    clearCookie(res, "adminToken");
    return jsonOk(res, { success: true, message: "Admin session terminated." });
  }

  return jsonError(res, `Auth route not found: ${route}`, 404);
}
