// Meta Conversions API (CAPI) — server-side events for playbeat.digital.
//
// Complements the browser Pixel (index.html, ID 1971402550484565) with
// server-verified events that ad blockers / iOS ATT cannot strip:
//   - Purchase  : fired when an order becomes PAID (fulfillment ledger makes
//                 this once-per-order even across Rapid webhook retries)
//   - Lead      : fired when a customer submits the contact form
//
// Config (Vercel environment variables — the token is a SECRET and must never
// live in the DB, mirroring the trackingConfig.ts policy):
//   META_CAPI_ACCESS_TOKEN     System-user token from Events Manager (required to send)
//   META_PIXEL_ID              optional override (default: the live pixel)
//   META_CAPI_TEST_EVENT_CODE  optional — routes events to Events Manager
//                              "Test Events" instead of live traffic
//
// EVERYTHING here is best-effort: with no token configured every call is a
// no-op, and any delivery failure is logged to `meta_capi_log` and swallowed —
// checkout, webhooks and the contact form must NEVER fail because of Meta.
import { getDb } from "./mongo.js";

const DEFAULT_PIXEL_ID = "1971402550484565";
const GRAPH_VERSION = "v19.0";
const TIMEOUT_MS = 4000;

function pixelId(): string {
  return (process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID).trim();
}

export function isMetaCapiConfigured(): boolean {
  return Boolean((process.env.META_CAPI_ACCESS_TOKEN || "").trim());
}

// ---- Meta user_data hashing (SHA-256 hex, lowercase) ----
import { createHash } from "crypto";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normEmail(email: unknown): string | undefined {
  const e = String(email || "").trim().toLowerCase();
  return e.includes("@") ? sha256(e) : undefined;
}

function normPhone(phone: unknown): string | undefined {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  return digits.length >= 8 ? sha256(digits) : undefined;
}

type MetaEvent = {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: "website";
  user_data: Record<string, unknown>;
  custom_data: Record<string, unknown>;
};

// ---- Delivery core ----
async function deliver(
  eventName: string,
  event: MetaEvent,
  ctx: { source: string }
): Promise<void> {
  const token = (process.env.META_CAPI_ACCESS_TOKEN || "").trim();
  if (!token) return; // unconfigured → silent no-op (zero behavior change)

  const testCode = (process.env.META_CAPI_TEST_EVENT_CODE || "").trim();
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId()}/events?access_token=${encodeURIComponent(token)}`;
  const body: Record<string, unknown> = { data: [event] };
  if (testCode) body.test_event_code = testCode;

  let ok = false;
  let status = 0;
  let detail = "";
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    status = res.status;
    detail = (await res.text()).slice(0, 500);
    ok = res.ok;
  } catch (err: any) {
    detail = `exception: ${err?.message || String(err)}`.slice(0, 500);
  }

  // Best-effort audit trail (never throws, never blocks the caller)
  try {
    const db = await getDb();
    await db.collection("meta_capi_log").insertOne({
      at: new Date(),
      event: eventName,
      eventId: event.event_id,
      source: ctx.source,
      ok,
      status,
      response: detail,
    });
  } catch { /* logging is optional */ }

  if (!ok) {
    console.error(`meta-capi: ${eventName} (${event.event_id}) delivery failed status=${status}: ${detail}`);
  }
}

// ---- Purchase — call when an order becomes PAID ----
// event_id = orderNumber so a future browser-side Purchase (same event_id)
// dedupes against this server event in Events Manager.
export async function sendMetaPurchase(order: any, source: string): Promise<void> {
  try {
    if (!isMetaCapiConfigured()) return;
    const items = Array.isArray(order?.items) ? order.items : [];
    const contents = items.map((it: any) => ({
      id: String(it.productId || it.id || it.name || "item").slice(0, 64),
      item_price: Number(it.price ?? it.amount ?? 0),
      quantity: Math.max(1, Number(it.quantity || 1)),
    }));
    const event: MetaEvent = {
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: String(order.orderNumber || order._id || `order-${Date.now()}`),
      action_source: "website",
      user_data: {
        ...(normEmail(order.customerEmail) ? { em: [normEmail(order.customerEmail)] } : {}),
        ...(normPhone(order.customerPhone) ? { ph: [normPhone(order.customerPhone)] } : {}),
      },
      custom_data: {
        currency: String(order.currency || "PKR").toUpperCase().slice(0, 8),
        value: Number(order.totalAmount ?? 0),
        order_id: String(order.orderNumber || ""),
        contents,
        content_type: "product",
      },
    };
    await deliver("Purchase", event, { source });
  } catch (err: any) {
    console.error("meta-capi: purchase event error:", err?.message);
  }
}

// ---- Lead — call when the contact form is submitted ----
// Mirrors Meta's Lead sample: crm event_source + lead_event_source branding.
export async function sendMetaLead(input: {
  email: string;
  phone?: string;
  leadId?: string;
  source?: string;
}): Promise<void> {
  try {
    if (!isMetaCapiConfigured()) return;
    const em = normEmail(input.email);
    const event: MetaEvent = {
      event_name: "Lead",
      event_time: Math.floor(Date.now() / 1000),
      event_id: String(input.leadId || `lead-${Date.now()}`),
      action_source: "website",
      user_data: {
        ...(em ? { em: [em] } : {}),
        ...(normPhone(input.phone) ? { ph: [normPhone(input.phone)] } : {}),
      },
      custom_data: {
        event_source: "crm",
        lead_event_source: "PlayBeat Digital Storefront",
        content_name: "contact_form",
      },
    };
    await deliver("Lead", event, { source: input.source || "contact_form" });
  } catch (err: any) {
    console.error("meta-capi: lead event error:", err?.message);
  }
}
