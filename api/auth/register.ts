// POST /api/auth/register
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../_lib/mongo";
import {
  handleOptions,
  jsonOk,
  jsonError,
  setCookie,
  hashPassword,
  signUserToken,
} from "../_lib/auth";
import { ADMIN_EMAIL } from "../_lib/config";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return jsonError(res, "Method not allowed", 405);

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
