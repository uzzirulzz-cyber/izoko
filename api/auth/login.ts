// POST /api/auth/login
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../_lib/mongo";
import {
  handleOptions,
  jsonOk,
  jsonError,
  setCookie,
  comparePassword,
  signUserToken,
} from "../_lib/auth";
import { ADMIN_EMAIL } from "../_lib/config";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return jsonError(res, "Method not allowed", 405);

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return jsonError(res, "Email and password are required.", 400);
    }

    // Block admin env account from public user login
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
