// /api/contact
//  - POST /api/contact           — storefront contact form (stores message + Meta CAPI lead)
//  - POST /api/data-deletion     — Meta Data Deletion Request Callback
//    (vercel.json rewrites /api/data-deletion → /api/contact?metaDeletion=1 to
//     stay within the Hobby plan's 12 serverless function cap)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { getDb } from "./_lib/mongo.js";
import { handleOptions, jsonOk, jsonError } from "./_lib/auth.js";
import { sendMetaLead } from "./_lib/metaCapi.js";

// ============ Meta Data Deletion Request Callback ============
// Contract (developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback):
//   Meta POSTs application/x-www-form-urlencoded `signed_request` =
//     base64url( HMAC_SHA256(payload, app_secret) ) + "." + base64url(payload)
//   payload JSON: { algorithm, user_id, issued_at, expires?, oauth_token? }
//   NOTE: Meta does NOT send a confirmation_code — per the official PHP sample,
//   THIS endpoint generates the unique code and returns it.
//   Required 200 response (TOP-LEVEL fields, not wrapped):
//     { "url": "<status page>", "confirmation_code": "<code>" }
async function handleMetaDataDeletion(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return jsonOk(res, { service: "meta-data-deletion-callback", expects: "POST signed_request" });
  }
  if (req.method !== "POST") return jsonError(res, "Method not allowed", 405);

  const APP_SECRET = process.env.META_APP_SECRET || "";
  if (!APP_SECRET) {
    console.error("META_APP_SECRET is not configured — data deletion callback cannot verify requests.");
    return jsonError(res, "Callback not configured.", 500);
  }

  let body: any = req.body;
  if (typeof body === "string") {
    try { body = Object.fromEntries(new URLSearchParams(body)); } catch { body = {}; }
  }
  const signedRequest = String(body?.signed_request || "");
  const dot = signedRequest.indexOf(".");
  if (dot <= 0) return jsonError(res, "Malformed signed_request.", 400);
  const encodedSig = signedRequest.slice(0, dot);
  const encodedPayload = signedRequest.slice(dot + 1);

  let data: any;
  try {
    const expected = crypto.createHmac("sha256", APP_SECRET).update(encodedPayload).digest();
    const sig = Buffer.from(encodedSig, "base64url");
    if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) {
      return jsonError(res, "Invalid signature.", 403);
    }
    data = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return jsonError(res, "Malformed signed_request.", 400);
  }

  if (data?.algorithm !== "HMAC-SHA256") {
    return jsonError(res, "Unsupported algorithm.", 400);
  }
  const metaUserId = String(data.user_id ?? "").trim();
  if (!metaUserId) {
    return jsonError(res, "Missing user_id.", 400);
  }
  // Meta's payload carries only user_id/issued_at (plus oauth_token/expires) —
  // the confirmation code is generated HERE (16-char alphanumeric), matching
  // Meta's reference implementation. Accept theirs if one is ever supplied.
  const confirmationCode =
    String(data.confirmation_code ?? "").trim() ||
    crypto.randomBytes(8).toString("hex").toUpperCase();

  // Persist the request for the admin trail. Best-effort: Meta only needs the
  // contract response; a DB hiccup must not fail the deletion handshake.
  try {
    const db = await getDb();
    await db.collection("meta_data_deletion_requests").insertOne({
      metaUserId,
      confirmationCode,
      issuedAt: data.issued_at ? new Date(Number(data.issued_at) * 1000) : null,
      status: "received",
      source: "meta-data-deletion-callback",
      receivedAt: new Date(),
    });
  } catch (err: any) {
    console.error("meta data deletion persist failed:", err?.message || err);
  }

  res.status(200);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.send(
    JSON.stringify({
      url: `https://playbeat.digital/data-deletion?code=${encodeURIComponent(confirmationCode)}`,
      confirmation_code: confirmationCode,
    })
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  // ---- Meta data deletion callback (rewritten in with ?metaDeletion=1) ----
  if (String((req.query as Record<string, string>).metaDeletion || "") === "1") {
    try {
      return await handleMetaDataDeletion(req, res);
    } catch (err: any) {
      console.error("meta data deletion callback error:", err);
      return jsonError(res, err?.message || "Deletion callback failed.", 500);
    }
  }

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
    const inserted = await contactsCol.insertOne({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject || "Customer Inquiry",
      message: message.trim(),
      status: "new",
      createdAt: new Date(),
    });

    // ---- Meta Conversions API Lead (mirrors the official Lead payload).
    // Best-effort: unconfigured = no-op, failures never fail the form. ----
    try {
      await sendMetaLead({ email, leadId: String(inserted.insertedId), source: "contact_form" });
    } catch { /* non-blocking */ }

    return jsonOk(res, {
      success: true,
      message:
        "Thank you for reaching out! A PlayBeat support specialist will respond within 2-4 hours.",
    });
  } catch (err: any) {
    return jsonError(res, err.message, 500);
  }
}
