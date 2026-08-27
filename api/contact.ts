// POST /api/contact
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./_lib/mongo";
import { handleOptions, jsonOk, jsonError } from "./_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return jsonError(res, "Method not allowed", 405);

  try {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !message) {
      return jsonError(res, "Name, email, and message are required fields.", 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonError(res, "Please provide a valid email address.", 400);
    }

    const db = await getDb();
    const contactsCol = db.collection("contact_messages");
    await contactsCol.insertOne({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject || "Customer Inquiry",
      message: message.trim(),
      status: "new",
      createdAt: new Date(),
    });

    return jsonOk(res, {
      success: true,
      message:
        "Thank you for reaching out! A PlayBeat support specialist will respond within 2-4 hours.",
    });
  } catch (err: any) {
    return jsonError(res, err.message, 500);
  }
}
