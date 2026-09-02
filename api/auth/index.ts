// /api/auth/* — consolidated auth router
// Routes:
//   POST /api/auth/register
//   POST /api/auth/login
//   POST /api/auth/social            → 410 GONE (mock sign-up disabled; real OAuth only)
//   GET  /api/auth/me
//   POST /api/auth/forgot-password
//   POST /api/auth/admin/login        (super admin env credentials OR staff account in DB)
//   GET  /api/auth/admin/me
//   POST /api/auth/admin/logout
//   GET  /api/auth/oauth-config       (which social providers have OAuth keys configured)
//   GET  /api/auth/oauth/:provider/start    (begin real OAuth flow when configured)
//   GET  /api/auth/oauth/:provider/callback (OAuth code exchange → real account → redirect)
//
// REAL social sign-up/sign-in: Google, Facebook, TikTok, Instagram.
// Each provider only activates when its developer credentials are present in the
// Vercel environment variables (see getProviderConfigs for the exact env names).
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { randomBytes } from "crypto";
import { getDb } from "../_lib/mongo.js";
import {
  handleOptions,
  jsonOk,
  jsonError,
  setCookie,
  clearCookie,
  parseCookies,
  getToken,
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
  // Provider quirks handled uniformly by the start/callback handlers:
  clientIdParam?: "client_id" | "client_key";          // TikTok uses client_key
  tokenClientAuth?: "body_secret" | "basic_auth";      // Google/FB/TikTok/IG all use body secret today
  profileAuth?: "header" | "query";                    // Instagram reads access_token from query string
  extraAuthParams?: Record<string, string>;            // e.g. Google prompt=select_account
  parseProfile?: (json: any) => { id?: string; name?: string; email?: string; username?: string };
};

function getProviderConfigs(): Record<string, ProviderConfig> {
  return {
    google: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      profileUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
      scope: "openid email profile",
      clientIdParam: "client_id",
      tokenClientAuth: "body_secret",
      profileAuth: "header",
      extraAuthParams: { prompt: "select_account", access_type: "online", include_granted_scopes: "true" },
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      parseProfile: (j) => ({ id: j?.id || j?.sub, name: j?.name, email: j?.email, username: j?.email }),
    },
    facebook: {
      authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
      profileUrl: "https://graph.facebook.com/v21.0/me?fields=id,name,email",
      scope: "email,public_profile",
      clientIdParam: "client_id",
      tokenClientAuth: "body_secret",
      profileAuth: "header",
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      parseProfile: (j) => ({ id: j?.id, name: j?.name, email: j?.email, username: j?.email }),
    },
    tiktok: {
      // TikTok Login Kit v2 — the client identifier is "client_key" (NOT client_id),
      // and the user info endpoint nests the profile under data.user.
      authUrl: "https://www.tiktok.com/v2/auth/authorize/",
      tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
      profileUrl: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,avatar_url",
      scope: "user.info.basic",
      clientIdParam: "client_key",
      tokenClientAuth: "body_secret",
      profileAuth: "header",
      clientId: process.env.TIKTOK_CLIENT_KEY,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET,
      parseProfile: (j) => ({
        id: j?.data?.user?.open_id || j?.data?.user?.union_id || j?.open_id,
        name: j?.data?.user?.display_name || j?.data?.user?.username,
        email: undefined, // TikTok never shares an email — a stable provider-scoped identity is generated
        username: j?.data?.user?.display_name,
      }),
    },
    instagram: {
      // "Instagram API with Instagram Login" (the current Meta product — the old
      // Basic Display API was deprecated in Dec 2024). No email scope exists, so a
      // stable provider-scoped identity email is generated from the username.
      authUrl: "https://www.instagram.com/oauth/authorize",
      tokenUrl: "https://api.instagram.com/oauth/access_token",
      profileUrl: "https://graph.instagram.com/v21.0/me?fields=user_id,username,account_type",
      scope: "instagram_business_basic",
      clientIdParam: "client_id",
      tokenClientAuth: "body_secret",
      profileAuth: "query",
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
      parseProfile: (j) => ({
        id: j?.user_id || j?.id,
        name: j?.username,
        email: undefined, // Instagram does not expose email — provider-scoped identity is generated
        username: j?.username,
      }),
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

  // 1) Returning social user — match on the provider identity first (stable
  //    even if the display name/username changes), then fall back to email.
  let user: any = null;
  if (profile.id) {
    user = await usersCol.findOne({ provider: label, providerId: String(profile.id) });
  }
  if (!user) {
    user = await usersCol.findOne({ email });
    // Link the social identity onto an existing account (e.g. previously
    // registered by email with the same address) and remember the provider id.
    if (user && profile.id) {
      await usersCol.updateOne(
        { _id: user._id },
        { $set: { provider: label, providerId: String(profile.id), updatedAt: new Date() } }
      );
      user = { ...user, provider: label, providerId: String(profile.id) };
    }
  }

  // 2) First-time sign-up — create the real account record.
  if (!user) {
    const newUserDoc = {
      name: profile.name || profile.username || `${label} Member`,
      email,
      provider: label,
      providerId: profile.id ? String(profile.id) : null,
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
  // DISABLED — this endpoint previously created accounts from CLIENT-SUPPLIED
  // name/email (mock sign-up, no proof the caller owned the identity). It is
  // now permanently rejected. Real social sign-up uses the OAuth flow:
  //   GET /api/auth/oauth/:provider/start  → provider consent → callback →
  //   real profile fetched server-side from the provider → account created.
  if (route === "social" && req.method === "POST") {
    return jsonError(
      res,
      "Mock social sign-up has been disabled. Sign up with Google, Facebook, TikTok or Instagram via the secure OAuth button, or use email registration.",
      410
    );
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
      // If the session was verified via the httpOnly cookie (e.g. right after an
      // OAuth redirect), echo the token so the SPA can also make Bearer calls.
      // The token belongs to the caller only — safe to return to the verified party.
      const cameFromCookie = !req.headers?.authorization?.startsWith("Bearer ");
      return jsonOk(res, {
        success: true,
        ...(cameFromCookie ? { token: getToken(req, "token") } : {}),
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
          `${getProviderLabel(provider)} sign-in is being activated — its OAuth keys are not configured yet. Please use email registration meanwhile.`
        )}`
      );
    }
    const redirectUri = `${PUBLIC_SITE_URL.replace(/\/$/, "")}/api/auth/oauth/${provider}/callback`;
    // CSRF protection: random single-use state stored in a short-lived httpOnly
    // cookie; the callback must receive the identical value back from the provider.
    const state = `${provider}.${Date.now()}.${randomBytes(16).toString("hex")}`;
    setCookie(res, "oauth_state", state, { maxAge: 600, httpOnly: true, sameSite: "lax" });
    const idParam = cfg.clientIdParam || "client_id";
    const params = new URLSearchParams({
      response_type: "code",
      [idParam]: cfg.clientId,
      redirect_uri: redirectUri,
      scope: cfg.scope,
      state,
      ...(cfg.extraAuthParams || {}),
    });
    return res.status(302).redirect(`${cfg.authUrl}?${params.toString()}`);
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

    // CSRF check: the state we set in the start-step cookie must match the state
    // the provider echoed back (defends against forged authorization callbacks).
    const stateCookie = parseCookies(req)["oauth_state"];
    const stateQuery = url.searchParams.get("state");
    if (!stateCookie || !stateQuery || stateCookie !== stateQuery) {
      clearCookie(res, "oauth_state");
      return res.status(302).redirect(
        `${base}/storefront?social_error=${encodeURIComponent("Sign-in session expired or invalid (state mismatch). Please try again.")}`
      );
    }
    clearCookie(res, "oauth_state");

    try {
      const redirectUri = `${base}/api/auth/oauth/${provider}/callback`;
      // Token exchange — TikTok requires client_key (not client_id); the rest use client_id.
      const idParam = cfg.clientIdParam || "client_id";
      const tokenBody: Record<string, string> = {
        grant_type: "authorization_code",
        [idParam]: cfg.clientId,
        code,
        redirect_uri: redirectUri,
      };
      if (provider === "tiktok") {
        tokenBody.client_secret = cfg.clientSecret;
      } else {
        tokenBody.client_id = cfg.clientId;
        tokenBody.client_secret = cfg.clientSecret;
      }
      const tokenRes = await fetch(cfg.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams(tokenBody),
      });
      const tokenJson: any = await tokenRes.json();
      const accessToken = tokenJson.access_token || tokenJson.data?.access_token || tokenJson.data?.token;
      if (!accessToken) {
        throw new Error(
          tokenJson.error_description ||
            tokenJson.error?.description ||
            tokenJson.error_message ||
            tokenJson.error ||
            "Token exchange failed"
        );
      }

      // Profile fetch — Instagram reads the token from the query string; the rest use a Bearer header.
      const profileFetchUrl =
        cfg.profileAuth === "query"
          ? `${cfg.profileUrl}${cfg.profileUrl.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(accessToken)}`
          : cfg.profileUrl;
      const profRes = await fetch(profileFetchUrl, {
        headers:
          cfg.profileAuth === "query"
            ? { Accept: "application/json" }
            : { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      });
      const profJson: any = await profRes.json();
      const extracted = cfg.parseProfile
        ? cfg.parseProfile(profJson)
        : {
            id: profJson.id || profJson.sub || profJson.open_id,
            name: profJson.name || profJson.display_name || profJson.username,
            email: profJson.email,
            username: profJson.username,
          };

      const db = await getDb();
      const user = await upsertSocialUser(db, provider, extracted);
      const token = signUserToken({
        id: user._id.toString(),
        email: user.email,
        role: user.role || "user",
      });
      setCookie(res, "token", token, { maxAge: 30 * 24 * 60 * 60 });
      return res.status(302).redirect(`${base}/storefront?social_success=${encodeURIComponent(getProviderLabel(provider))}`);
    } catch (err: any) {
      return res.status(302).redirect(`${base}/storefront?social_error=${encodeURIComponent(err.message || "Sign-in failed")}`);
    }
  }

  // ============ /api/auth/admin/logout ============
  if (route === "admin/logout" && req.method === "POST") {
    clearCookie(res, "adminToken");
    return jsonOk(res, { success: true, message: "Admin session terminated." });
  }

  return jsonError(res, `Auth route not found: ${route}`, 404);
}
