// WhatsApp Cloud API configuration + send helper (mirrors trackingConfig.ts).
//
// Resolution order: a document in the `whatsapp_config` Mongo collection
// (set from the admin WhatsApp panel) overrides WHATSAPP_* build-time env
// vars. The access token is a SECRET — it is never returned unmasked by any
// API route; only a masked preview (first 6 + last 4) reaches the admin UI.
// A 30-second in-process cache keeps hot config reads cheap.
import { ObjectId } from "mongodb";
import { getDb } from "./mongo.js";

export type WhatsAppConfig = {
  phoneNumberId: string; // WhatsApp Business phone number id
  wabaId: string; // WhatsApp Business Account id
  accessToken: string; // Cloud API bearer token (SECRET)
  graphVersion: string; // Graph API version, e.g. "v25.0"
};

// ===========================================================================
// ORDER NOTIFICATIONS — automatic customer WhatsApp messages on order events.
// Stored under the `notifications` field of the whatsapp_config document and
// edited from the admin WhatsApp panel. Every event is INDEPENDENT and OFF
// by default — nothing is ever sent until the owner explicitly enables it.
// ===========================================================================

export type WhatsAppEventKey =
  | "order_placed"
  | "payment_confirmed"
  | "order_shipped"
  | "order_delivered";

export const WHATSAPP_EVENT_KEYS: WhatsAppEventKey[] = [
  "order_placed",
  "payment_confirmed",
  "order_shipped",
  "order_delivered",
];

export type WhatsAppNotificationEvent = {
  enabled: boolean;
  mode: "template" | "text"; // template = approved WABA template, text = free-form
  templateName: string; // WABA template name (template mode)
  templateLang: string; // e.g. "en_US"
  bodyParams: string[]; // template body params — each supports {{placeholders}}
  textTemplate: string; // free-text body — supports {{placeholders}}
};

export type WhatsAppNotifications = {
  defaultCountryCode: string; // e.g. "92" — applied to 0-prefixed local numbers
  events: Record<WhatsAppEventKey, WhatsAppNotificationEvent>;
};

export const WHATSAPP_ORDER_PLACEHOLDERS = [
  "customerName",
  "orderNumber",
  "total",
  "currency",
  "status",
  "paymentStatus",
  "paymentMethod",
  "itemsSummary",
  "itemCount",
  "orderUrl",
  "storeName",
  "orderDate",
] as const;

const DEFAULT_EVENT: WhatsAppNotificationEvent = {
  enabled: false,
  mode: "text",
  templateName: "",
  templateLang: "en_US",
  bodyParams: [],
  textTemplate: "",
};

export function defaultNotifications(): WhatsAppNotifications {
  return {
    defaultCountryCode: "92",
    events: {
      order_placed: {
        ...DEFAULT_EVENT,
        textTemplate:
          "Hi {{customerName}}, thanks for your order {{orderNumber}} at {{storeName}}! Total: {{currency}} {{total}}. We will keep you posted.",
      },
      payment_confirmed: {
        ...DEFAULT_EVENT,
        textTemplate:
          "Payment received for order {{orderNumber}} — thank you! Your items are unlocked. Track it: {{orderUrl}}",
      },
      order_shipped: {
        ...DEFAULT_EVENT,
        textTemplate:
          "Good news, {{customerName}} — your order {{orderNumber}} has shipped and is on its way!",
      },
      order_delivered: {
        ...DEFAULT_EVENT,
        textTemplate:
          "Your order {{orderNumber}} has been delivered. Enjoy, and thank you for shopping with {{storeName}}!",
      },
    },
  };
}

export type WhatsAppSource = {
  phoneNumberId: "db" | "env" | "none";
  wabaId: "db" | "env" | "none";
  accessToken: "db" | "env" | "none";
  graphVersion: "db" | "env" | "none";
};

const CACHE_TTL_MS = 30_000;
let cache: { value: WhatsAppConfig; source: WhatsAppSource; at: number } | null = null;

const ID_PATTERN = /^\d{6,25}$/; // phone-number-id / waba-id are numeric strings
const VERSION_PATTERN = /^v\d{2}\.\d{2}$/;

function envConfig(): WhatsAppConfig {
  return {
    phoneNumberId: (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim(),
    wabaId: (process.env.WHATSAPP_WABA_ID || "").trim(),
    accessToken: (process.env.WHATSAPP_ACCESS_TOKEN || "").trim(),
    graphVersion: (process.env.WHATSAPP_GRAPH_VERSION || "v25.0").trim(),
  };
}

export type WhatsAppConfigPatch = Partial<WhatsAppConfig> & {
  notifications?: WhatsAppNotifications;
};

/** Deep-validate the notifications object from the admin panel. */
function sanitizeNotifications(raw: any): WhatsAppNotifications | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out = defaultNotifications();
  if (
    typeof raw.defaultCountryCode === "string" &&
    /^\d{1,4}$/.test(raw.defaultCountryCode.trim())
  ) {
    out.defaultCountryCode = raw.defaultCountryCode.trim();
  }
  const src = raw.events && typeof raw.events === "object" ? raw.events : {};
  for (const key of WHATSAPP_EVENT_KEYS) {
    const e = src[key] && typeof src[key] === "object" ? src[key] : {};
    out.events[key] = {
      enabled: Boolean(e.enabled),
      mode: e.mode === "template" ? "template" : "text",
      templateName: String(e.templateName || "").trim().slice(0, 120),
      templateLang:
        String(e.templateLang || "en_US").trim().slice(0, 12) || "en_US",
      bodyParams: Array.isArray(e.bodyParams)
        ? e.bodyParams
            .slice(0, 5)
            .map((p: any) => String(p ?? "").slice(0, 160))
        : [],
      textTemplate: String(e.textTemplate || "").slice(0, 1024),
    };
  }
  return out;
}

/** Read the notifications config (defaults merged for any missing part). */
export async function getNotifications(db: any): Promise<WhatsAppNotifications> {
  const base = defaultNotifications();
  try {
    const doc = await db
      .collection("whatsapp_config")
      .findOne({ key: "active" }, { projection: { notifications: 1 } });
    const raw = doc?.notifications;
    if (raw && typeof raw === "object") {
      if (typeof raw.defaultCountryCode === "string" && /^\d{1,4}$/.test(raw.defaultCountryCode)) {
        base.defaultCountryCode = raw.defaultCountryCode;
      }
      for (const key of WHATSAPP_EVENT_KEYS) {
        const e = raw.events?.[key];
        if (e && typeof e === "object") {
          base.events[key] = {
            enabled: Boolean(e.enabled),
            mode: e.mode === "template" ? "template" : "text",
            templateName: String(e.templateName || "").slice(0, 120),
            templateLang: String(e.templateLang || "en_US").slice(0, 12) || "en_US",
            bodyParams: Array.isArray(e.bodyParams)
              ? e.bodyParams.slice(0, 5).map((p: any) => String(p ?? ""))
              : [],
            textTemplate: String(e.textTemplate || "").slice(0, 1024),
          };
        }
      }
    }
  } catch {
    /* DB unavailable — defaults (all OFF) */
  }
  return base;
}

/** Validate + normalize an admin-submitted config patch. Throws on bad IDs. */
export function sanitizeWhatsAppPatch(body: Record<string, any>): WhatsAppConfigPatch {
  const out: WhatsAppConfigPatch = {};
  for (const key of ["phoneNumberId", "wabaId"] as const) {
    if (typeof body[key] !== "string") continue;
    const v = body[key].trim();
    if (v === "") {
      out[key] = ""; // explicit clear
      continue;
    }
    if (!ID_PATTERN.test(v)) throw new Error(`Invalid format for ${key}: "${v}" — expected a numeric ID.`);
    out[key] = v;
  }
  if (typeof body.accessToken === "string") {
    const v = body.accessToken.trim();
    // tokens are opaque — only length sanity
    if (v === "") out.accessToken = "";
    else if (v.length < 40 || v.length > 1024) throw new Error("Invalid access token length — paste the full token from the Meta console.");
    else out.accessToken = v;
  }
  if (typeof body.graphVersion === "string") {
    const v = body.graphVersion.trim();
    if (v === "") out.graphVersion = "";
    else if (!VERSION_PATTERN.test(v)) throw new Error(`Invalid graphVersion: "${v}" — expected e.g. v25.0`);
    else out.graphVersion = v;
  }
  if (body.notifications !== undefined) {
    const notif = sanitizeNotifications(body.notifications);
    if (notif) out.notifications = notif;
  }
  return out;
}

export function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 12) return token.slice(0, 2) + "…";
  return `${token.slice(0, 6)}…${token.slice(-4)} (${token.length} chars)`;
}

export async function getWhatsAppConfig(force = false): Promise<{
  config: WhatsAppConfig;
  source: WhatsAppSource;
}> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { config: cache.value, source: cache.source };
  }

  const env = envConfig();
  let dbDoc: any = null;
  try {
    const db = await getDb();
    dbDoc = await db.collection("whatsapp_config").findOne({ key: "active" });
  } catch {
    dbDoc = null; // DB unavailable — env-only fallback
  }

  const config: WhatsAppConfig = { ...env };
  const source: WhatsAppSource = {
    phoneNumberId: env.phoneNumberId ? "env" : "none",
    wabaId: env.wabaId ? "env" : "none",
    accessToken: env.accessToken ? "env" : "none",
    graphVersion: "env",
  };

  if (dbDoc && typeof dbDoc === "object") {
    for (const key of ["phoneNumberId", "wabaId", "accessToken", "graphVersion"] as const) {
      const v = dbDoc[key];
      if (typeof v === "string" && v.trim() !== "") {
        (config as any)[key] = v.trim();
        (source as any)[key] = "db";
      } else if (v === "") {
        (config as any)[key] = "";
        (source as any)[key] = "db";
      }
    }
  }

  cache = { value: config, source, at: Date.now() };
  return { config, source };
}

export async function saveWhatsAppConfig(patch: WhatsAppConfigPatch, actor: string) {
  const db = await getDb();
  const col = db.collection("whatsapp_config");
  await col.updateOne(
    { key: "active" },
    { $set: { ...patch, updatedAt: new Date(), updatedBy: actor } },
    { upsert: true }
  );
  await db.collection("whatsapp_config_audit").insertOne({
    at: new Date(),
    actor,
    keys: Object.keys(patch),
    patch: { ...patch, accessToken: patch.accessToken ? "***stored***" : undefined },
  });
  cache = null; // invalidate
  return getWhatsAppConfig(true);
}

/** Send a Cloud API message. Returns the Graph API response JSON. */
export async function sendWhatsAppMessage(
  cfg: WhatsAppConfig,
  payload: Record<string, any>
): Promise<{ ok: boolean; status: number; body: any }> {
  if (!cfg.phoneNumberId || !cfg.accessToken) {
    return { ok: false, status: 400, body: { error: "WhatsApp is not configured — set Phone Number ID and access token first." } };
  }
  const url = `https://graph.facebook.com/${cfg.graphVersion || "v25.0"}/${cfg.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = { raw: "non-JSON response" };
  }
  return { ok: res.ok, status: res.status, body };
}

/** Normalize a recipient to the digits-only form Cloud API expects. */
export function normalizeRecipient(raw: string): string {
  return String(raw || "").replace(/[^\d]/g, "");
}

// ===========================================================================
// AUTO-SEND ENGINE — order event → rendered message → Cloud API send.
// Best-effort by design: a WhatsApp failure NEVER blocks or fails the order
// flow; every attempt (and skip reason) is logged to whatsapp_messages so
// the admin panel shows exactly what went out (and why nothing did).
// ===========================================================================

/** Replace {{placeholders}} in an admin-authored string from order context. */
export function renderPlaceholders(text: string, ctx: Record<string, string>): string {
  return String(text || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key: string) =>
    ctx[key] !== undefined ? ctx[key] : m
  );
}

function buildOrderContext(order: any): Record<string, string> {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsSummary = (() => {
    const parts = items
      .slice(0, 3)
      .map((i: any) => `${Number(i.quantity || 1)}× ${String(i.name || "Item")}`);
    if (items.length > 3) parts.push(`+${items.length - 3} more`);
    return parts.join(", ");
  })();
  const site = (process.env.PUBLIC_SITE_URL || "https://playbeat.digital").replace(/\/$/, "");
  const when =
    order.createdAt instanceof Date
      ? order.createdAt
      : order.createdAt
      ? new Date(order.createdAt)
      : new Date();
  return {
    customerName: String(order.customerName || "customer"),
    orderNumber: String(order.orderNumber || ""),
    total: String(order.totalAmount != null ? order.totalAmount : ""),
    currency: String(order.currency || "PKR"),
    status: String(order.status || ""),
    paymentStatus: String(order.paymentStatus || ""),
    paymentMethod: String(order.paymentMethod || ""),
    itemsSummary,
    itemCount: String(items.reduce((s: number, i: any) => s + Number(i.quantity || 1), 0)),
    orderUrl: `${site}/order/${order.orderNumber || ""}`,
    storeName: "PlayBeat Digital",
    orderDate: isNaN(when.getTime()) ? "" : when.toLocaleDateString("en-PK"),
  };
}

/** Normalize a customer phone into E.164-ish digits using the store default CC. */
export function normalizeRecipientE164(raw: string, defaultCountryCode = "92"): string {
  let d = String(raw || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("00")) d = d.slice(2);
  const cc = String(defaultCountryCode || "").replace(/\D/g, "");
  // Local format "03001234567" → national 0 dropped, country code prepended.
  if (cc && d.startsWith("0") && d.length >= 10 && d.length <= 12 && !d.startsWith(cc)) {
    d = cc + d.slice(1);
  }
  return d;
}

/** Customer phone for an order: order.customerPhone → user profile phone. */
async function resolveOrderPhone(db: any, order: any): Promise<string> {
  const direct = String(order.customerPhone || "").trim();
  if (direct) return direct;
  if (order.userId) {
    try {
      const u = await db
        .collection("users")
        .findOne({ _id: new ObjectId(String(order.userId)) }, { projection: { phone: 1 } });
      if (u?.phone) return String(u.phone);
    } catch {
      /* profile lookup is best-effort */
    }
  }
  return "";
}

export type WhatsAppNotifyResult = {
  sent: boolean;
  ok?: boolean;
  skipped?: string;
  error?: string;
  wamid?: string;
  to?: string;
  mode?: string;
};

/**
 * Fire the configured WhatsApp notification for an order event.
 * opts.force bypasses the enabled toggle (admin tests) and opts.overrideTo
 * replaces the resolved customer number (admin tests).
 */
export async function sendOrderNotification(
  trigger: WhatsAppEventKey,
  db: any,
  order: any,
  opts?: { force?: boolean; overrideTo?: string }
): Promise<WhatsAppNotifyResult> {
  try {
    if (!WHATSAPP_EVENT_KEYS.includes(trigger)) return { sent: false, skipped: "unknown_trigger" };
    const { config } = await getWhatsAppConfig();
    if (!config.phoneNumberId || !config.accessToken) {
      return { sent: false, skipped: "not_configured" };
    }
    const notif = await getNotifications(db);
    const ev = notif.events[trigger];
    if (!ev || (!ev.enabled && !opts?.force)) {
      return { sent: false, skipped: "disabled" };
    }
    const rawTo = opts?.overrideTo || (await resolveOrderPhone(db, order));
    const to = normalizeRecipientE164(rawTo, notif.defaultCountryCode);
    if (!to || to.length < 10) {
      // Honest skip record — the owner can see WHY nothing went out.
      try {
        await db.collection("whatsapp_messages").insertOne({
          at: new Date(),
          to: rawTo ? normalizeRecipient(rawTo) : null,
          kind: ev?.mode || "text",
          trigger,
          orderNumber: String(order.orderNumber || "") || null,
          ok: false,
          skipped: "no_phone",
          error: "No WhatsApp number on the order or customer profile.",
          actor: `auto:${trigger}`,
        });
      } catch { /* logging never blocks */ }
      return { sent: false, skipped: "no_phone" };
    }

    const ctx = buildOrderContext(order);
    let payload: Record<string, any>;
    if (ev.mode === "template") {
      if (!ev.templateName) return { sent: false, skipped: "no_template" };
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: ev.templateName,
          language: { code: ev.templateLang || "en_US" },
          components: [
            {
              type: "body",
              parameters: ev.bodyParams.map((p) => ({
                type: "text",
                text: renderPlaceholders(p, ctx),
              })),
            },
          ],
        },
      };
    } else {
      const text = renderPlaceholders(ev.textTemplate, ctx).trim();
      if (!text) return { sent: false, skipped: "empty_text" };
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text.slice(0, 1024) },
      };
    }

    const result = await sendWhatsAppMessage(config, payload);
    const wamid = result.body?.messages?.[0]?.id || null;
    const err = result.ok
      ? null
      : result.body?.error?.error_data?.details ||
        result.body?.error?.message ||
        result.body?.error ||
        `HTTP ${result.status}`;
    try {
      await db.collection("whatsapp_messages").insertOne({
        at: new Date(),
        to,
        kind: ev.mode,
        trigger,
        orderNumber: String(order.orderNumber || "") || null,
        templateName: ev.mode === "template" ? ev.templateName : null,
        ok: result.ok,
        wamid,
        error: err ? String(err) : null,
        actor: `auto:${trigger}`,
      });
    } catch { /* logging never blocks */ }
    return {
      sent: true,
      ok: result.ok,
      error: err ? String(err) : undefined,
      wamid: wamid || undefined,
      to,
      mode: ev.mode,
    };
  } catch (e: any) {
    return { sent: false, error: e?.message || "notification failed" };
  }
}
