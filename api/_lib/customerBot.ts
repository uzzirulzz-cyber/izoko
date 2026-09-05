// Customer Bot — THE single storefront assistant (no duplicate bot systems).
//
// Design goals:
//   - Catalog-grounded: every product answer is computed from the live
//     MongoDB catalog at request time — never invented, never stale.
//   - Private: runs entirely server-side; exposes no credentials, no admin
//     data, no other customers' orders. Order status answers use the
//     caller's OWN signed-in session only.
//   - Honest: when it cannot answer it says so and offers "Contact Support"
//     (escalation to the human live-support thread).
//   - Deterministic: no external LLM, no API keys to leak, zero marginal
//     cost, instant responses under the 15s function budget.
//
// POST /api/messages/bot   { message, history?: [{ role, text }] }
// → { success, reply, quickReplies?, links?, products?, orders? }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./mongo.js";
import { jsonOk, jsonError, verifyUser } from "./auth.js";
import { clientIp, rateLimit } from "./rateLimit.js";

// Category display name → storefront URL (mirrors App.tsx CATEGORY_ROUTES)
const CATEGORY_URLS: Record<string, string> = {
  streaming: "/streaming",
  subscriptions: "/subscriptions",
  "gift cards": "/giftcards",
  giftcards: "/giftcards",
  gaming: "/gaming",
  software: "/software",
  "smart projectors": "/smart-projectors",
  projectors: "/smart-projectors",
};

const QUICK_MAIN = ["What products do you have?", "How do I checkout?", "Track my order", "Talk to a human"];

interface BotProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  variants: { name: string; price: number }[];
  deliveryType: string;
  inStock: boolean;
  url: string;
}

function fmtPrice(amount: number, currency = "PKR"): string {
  const n = Number(amount) || 0;
  const formatted = n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
  return currency === "PKR" ? `Rs ${formatted}` : `${currency} ${formatted}`;
}

function categoryUrl(category: string): string {
  const key = String(category || "").toLowerCase().trim();
  return CATEGORY_URLS[key] || "/storefront";
}

async function loadCatalog(): Promise<{ products: BotProduct[]; categories: string[] }> {
  const db = await getDb();
  const docs = await db
    .collection("products")
    .find(
      {},
      {
        projection: {
          name: 1,
          category: 1,
          price: 1,
          variants: 1,
          digital: 1,
          deliveryType: 1,
          stock: 1,
          inStock: 1,
          active: 1,
          currency: 1,
        },
      }
    )
    .limit(300)
    .toArray();
  const products: BotProduct[] = docs
    .filter((d: any) => d && d.name)
    .map((d: any) => ({
      id: String(d._id),
      name: String(d.name),
      category: String(d.category || ""),
      price: Number(d.price) || 0,
      currency: String(d.currency || "PKR"),
      variants: Array.isArray(d.variants)
        ? d.variants
            .filter((v: any) => v && v.name)
            .map((v: any) => ({ name: String(v.name), price: Number(v.price ?? d.price) || 0 }))
        : [],
      deliveryType: String(d.deliveryType || (d.digital !== false ? "Instant Auto-Email" : "Courier Shipping")),
      inStock: d.inStock !== false && d.active !== false && d.stock !== 0,
      url: categoryUrl(d.category),
    }));
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  return { products, categories };
}

function tokenize(text: string): string[] {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function searchCatalog(query: string, products: BotProduct[]): BotProduct[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const stop = new Set(["the", "for", "with", "and", "have", "you", "want", "get", "can", "how", "much", "price", "plan", "buy"]);
  const meaningful = tokens.filter((t) => !stop.has(t));
  const scored = products.map((p) => {
    const hay = `${p.name} ${p.category}`.toLowerCase();
    let score = 0;
    for (const t of meaningful) {
      if (p.name.toLowerCase().includes(t)) score += 3;
      else if (p.category.toLowerCase().includes(t)) score += 2;
      else if (hay.includes(t)) score += 1;
      else if (t.length > 4 && hay.includes(t.slice(0, Math.ceil(t.length * 0.8)))) score += 1;
    }
    return { p, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.p);
}

function has(text: string, ...words: string[]): boolean {
  const t = ` ${String(text).toLowerCase()} `;
  return words.some((w) => t.includes(w));
}

const STATUS_LABELS: Record<string, string> = {
  pending: "PENDING — awaiting payment",
  processing: "PROCESSING",
  completed: "COMPLETED",
  paid: "PAID",
  payment_failed: "FAILED",
  cancelled: "CANCELLED",
  refunded: "REFUNDED",
};

export async function handleCustomerBot(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return jsonError(res, "Bot endpoint is POST-only.", 405);

  // Rate limit: 20 questions per minute per IP — the bot queries the catalog
  // on every call, so abusive bursts must not hammer the database.
  const ip = clientIp(req as any);
  const rl = rateLimit(`bot:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return jsonError(res, `Too many questions — please wait ${rl.retryAfterSec}s.`, 429);
  }

  const body = (req.body || {}) as any;
  const message = String(body.message || "").trim().slice(0, 500);
  if (!message) return jsonError(res, "Please type a question.", 400);

  const user = verifyUser(req as any); // optional signed-in context (order status)
  let reply = "";
  let quickReplies: string[] = [];
  let links: { label: string; href: string }[] = [];
  let products: BotProduct[] = [];
  let orders: any[] | undefined;

  try {
    const { products: catalog, categories } = await loadCatalog();

    // ---- 1. Order status (signed-in customers only) ----
    if (has(message, "order", "track", "delivery status", "my keys", "license key", "where is my")) {
      if (user) {
        const db = await getDb();
        const docs = await db
          .collection("orders")
          .find({ userId: String(user.id) })
          .sort({ createdAt: -1 })
          .limit(3)
          .toArray();
        if (docs.length) {
          orders = docs.map((o: any) => ({
            orderNumber: o.orderNumber,
            status: STATUS_LABELS[String(o.status)] || String(o.status).toUpperCase(),
            paymentStatus: String(o.paymentStatus || ""),
            totalAmount: o.totalAmount,
            currency: o.currency || "PKR",
            itemCount: (o.items || []).length,
          }));
          const lines = orders.map(
            (o) =>
              `• ${o.orderNumber} — ${o.status} — ${fmtPrice(Number(o.totalAmount), o.currency)} (${o.itemCount} item${o.itemCount === 1 ? "" : "s"})`
          );
          reply = `Here are your latest orders:\n${lines.join("\n")}\n\nOpen My Orders for full details and license keys (keys appear as soon as payment is confirmed).`;
          links = [
            { label: "My Orders", href: "/account" },
            { label: "Contact Support", href: "/contact" },
          ];
          quickReplies = ["How do I checkout?", "Talk to a human"];
        } else {
          reply =
            "You don't have any orders yet. Browse the store, pick a product, and I'll guide you through checkout — your orders will show up here afterwards.";
          links = [
            { label: "Browse Products", href: "/streaming" },
            { label: "How do I checkout?", href: "/cart" },
          ];
        }
      } else {
        reply =
          "To look up your orders I need you to be signed in — then I can show your latest orders and their status instantly. If you checked out as a guest or need help right away, contact the support team.";
        links = [
          { label: "Sign In", href: "/account" },
          { label: "Contact Support", href: "/contact" },
        ];
        quickReplies = ["How do I checkout?", "What products do you have?"];
      }
    }

    // ---- 2. Browse / categories ----
    else if (
      has(message, "what products", "product do you", "catalog", "categories", "browse", "what do you sell", "what can i buy", "available products")
    ) {
      const catList = categories.length
        ? categories.map((c) => `• ${c}`).join("\n")
        : "• Streaming subscriptions\n• Gift cards\n• Software licenses\n• Smart projectors";
      reply = `We have ${catalog.length} products across ${categories.length || 4} categories:\n${catList}\n\nWhich category are you looking for? I can also find a specific product — just type its name.`;
      links = categories.slice(0, 4).map((c) => ({ label: c, href: categoryUrl(c) }));
      quickReplies = ["Streaming subscriptions", "Gift cards", "How do I checkout?"];
    }

    // ---- 3. Checkout / payment guidance ----
    else if (has(message, "checkout", "pay", "payment", "purchase", "buy", "order process", "rapid", "card", "jazzcash", "easypaisa", "raast")) {
      reply =
        "Checkout takes under a minute:\n1. Add products to your cart (pick a plan/variant on the product card first)\n2. Open the cart and review your summary\n3. Sign in (required for all orders)\n4. Choose a payment method — Rapid Gateway accepts Card, Raast, JazzCash and easypaisa\n5. Confirm — you'll be redirected to the secure hosted payment page\n6. After payment you land on your order page; paid digital orders show license keys instantly";
      links = [
        { label: "Browse Products", href: "/streaming" },
        { label: "My Orders", href: "/account" },
        { label: "Contact Support", href: "/contact" },
      ];
      quickReplies = ["What products do you have?", "Track my order"];
    }

    // ---- 4. Cart guidance ----
    else if (has(message, "cart", "add to cart", "remove item", "quantity")) {
      reply =
        "Your cart lives in the yellow cart button at the top of the page. Add products with \"Add to Cart\" (choose a plan/denomination first where offered), then adjust quantities or remove items inside the drawer before checkout. The total you see is confirmed server-side at checkout — the displayed price always matches the catalog.";
      links = [
        { label: "Browse Products", href: "/streaming" },
        { label: "How do I checkout?", href: "/cart" },
      ];
      quickReplies = ["How do I checkout?", "What products do you have?"];
    }

    // ---- 5. Account / signup / login ----
    else if (has(message, "sign up", "signup", "register", "log in", "login", "account", "password", "profile")) {
      reply =
        "Creating an account takes seconds: click the account icon (top-right) → \"Sign Up\" → enter your name, email and a password (minimum 6 characters) → accept the Terms & Privacy Policy. An account is required to place orders — it keeps your order history, license keys and payment records in one dashboard.";
      links = [
        { label: "Sign In / Sign Up", href: "/account" },
        { label: "My Orders", href: "/account" },
      ];
      quickReplies = ["How do I checkout?", "What products do you have?"];
    }

    // ---- 6. Product search (generic keywords or names) ----
    else if (
      catalog.length &&
      (has(message, "price", "cost", "how much", "plan", "plans", "variant", "denomination", "recommend", "suggest", "looking for", "need", "find") ||
        tokenize(message).some((t) => catalog.some((p) => p.name.toLowerCase().includes(t))))
    ) {
      products = searchCatalog(message, catalog);
      if (products.length) {
        const lines = products.map((p) => {
          const variantInfo = p.variants.length
            ? ` Plans: ${p.variants
                .slice(0, 4)
                .map((v) => `${v.name} ${fmtPrice(v.price, p.currency)}`)
                .join(", ")}.`
            : "";
          return `• ${p.name} — ${fmtPrice(p.price, p.currency)}${variantInfo} (${p.deliveryType})`;
        });
        reply = `Here's what I found:\n${lines.join("\n")}\n\nOpen the product on the storefront, pick a plan, and choose Add to Cart — I can guide you through checkout from there.`;
        links = [
          ...new Map(products.map((p) => [p.category, { label: `Shop ${p.category}`, href: p.url }])).values(),
        ].slice(0, 3);
        quickReplies = ["How do I checkout?", "What products do you have?", "Talk to a human"];
      } else {
        reply = `I couldn't find that in the catalog by name. We currently stock ${categories.length} categories:\n${categories
          .map((c) => `• ${c}`)
          .join("\n")}\n\nTry a product name, a category, or ask a human — they know everything in stock.`;
        links = [{ label: "Contact Support", href: "/contact" }];
        quickReplies = QUICK_MAIN;
      }
    }

    // ---- 7. Greeting ----
    else if (/^\s*(hi|hello|hey|salam|asalam|assalam|good (morning|afternoon|evening)|yo|hiya)\b/i.test(message)) {
      reply = `Hello${user?.name ? ` ${user.name}` : ""}! 👋 I'm the PlayBeat assistant. I can help you browse products, explain pricing and plans, and walk you through checkout, payment and your orders. What are you looking for today?`;
      quickReplies = QUICK_MAIN;
      links = [{ label: "Browse Products", href: "/streaming" }];
    }

    // ---- 8. Thanks / bye ----
    else if (has(message, "thank", "thanks", "shukriya", "bye", "great", "awesome", "helpful")) {
      reply =
        "You're very welcome! If you need anything else — products, pricing, checkout or your orders — I'm right here. Happy shopping! 🛒";
      quickReplies = QUICK_MAIN;
    }

    // ---- 9. Honest fallback ----
    else {
      reply =
        "I'm not sure about that one — I can help with our products, pricing and plans, cart and checkout, payments (Card / Raast / JazzCash / easypaisa via Rapid Gateway), and your order status. For anything else, the PlayBeat support team will be happy to help personally.";
      quickReplies = QUICK_MAIN;
      links = [
        { label: "Contact Support", href: "/contact" },
        { label: "Browse Products", href: "/streaming" },
      ];
    }

    return jsonOk(res, {
      success: true,
      reply,
      ...(quickReplies.length ? { quickReplies } : {}),
      ...(links.length ? { links } : {}),
      ...(products.length ? { products: products.map(({ id, name, price, currency, url }) => ({ id, name, price, currency, url })) } : {}),
      ...(orders ? { orders } : {}),
    });
  } catch (err: any) {
    console.error("customer-bot error:", err);
    return jsonError(res, "The assistant is briefly unavailable — please try again or contact support.", 503);
  }
}
