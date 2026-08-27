// POST /api/auth/social (Google, Facebook, TikTok, Instagram)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../_lib/mongo";
import {
  handleOptions,
  jsonOk,
  jsonError,
  setCookie,
  signUserToken,
} from "../_lib/auth";
import { ADMIN_EMAIL } from "../_lib/config";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return jsonError(res, "Method not allowed", 405);

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
    let user = await usersCol.findOne({ email });
    if (!user) {
      const newUserDoc = { name, email, provider, role: "user", createdAt: new Date() };
      const insertRes = await usersCol.insertOne(newUserDoc);
      user = { _id: insertRes.insertedId, ...newUserDoc } as any;
    }

    const token = signUserToken({
      id: (user as any)._id.toString(),
      email: (user as any).email,
      role: (user as any).role || "user",
    });

    setCookie(res, "token", token, { maxAge: 30 * 24 * 60 * 60 });

    return jsonOk(res, {
      success: true,
      provider,
      configured:
        provider === "Google"
          ? googleConfigured
          : provider === "Facebook"
          ? fbConfigured
          : provider === "TikTok"
          ? tiktokConfigured
          : false,
      token,
      user: {
        id: (user as any)._id.toString(),
        name: (user as any).name,
        email: (user as any).email,
        role: (user as any).role || "user",
      },
    });
  } catch (err: any) {
    console.error("Social Auth Error:", err);
    return jsonError(res, err.message, 500);
  }
}
