// Local dev/test server that mounts the REAL Vercel serverless handlers
// (api/auth, api/payments, api/orders, api/products) onto Express and serves
// the built SPA from dist/. Used ONLY for local verification of the checkout
// redesign — production runs the same handlers on Vercel.
//
//   npx tsx scripts/local-test-server.ts
//
// Env defaults mirror server.ts dev fallbacks (this repo's own dev config).
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// --- env bootstrap (dev fallbacks identical to server.ts) ---
process.env.MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0";
process.env.MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "playbeat";
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET || "playbeat-jwt-super-secret-key-2026";
process.env.PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || "http://localhost:8787";
// Dummy Rapid key so the methods catalog reports Rapid AVAILABLE locally
// (lets the UI be exercised end-to-end; real payment creation still needs the
// production key and is NOT possible with this dummy).
process.env.RAPID_SECRET_KEY = process.env.RAPID_SECRET_KEY || "local-test-secret-key";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");
const PORT = Number(process.env.TEST_PORT) || 8787;

// NOTE: env must be set BEFORE the api modules are imported (they snapshot
// process.env at module scope), so handlers are imported dynamically below.
const [{ default: authHandler }, { default: paymentsHandler }, { default: ordersHandler }, { default: productsHandler }] =
  await Promise.all([
    import("../api/auth/index.js"),
    import("../api/payments/index.js"),
    import("../api/orders/index.js"),
    import("../api/products/index.js"),
  ]);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use((req: Request, _res: Response, next: NextFunction) => {
  // preserve the full original URL — handlers parse sub-routes from req.url
  (req as any).originalUrl = req.originalUrl;
  next();
});

type Handler = (req: any, res: any) => Promise<void> | void;

const mount =
  (fn: Handler) => (req: Request, res: Response) => {
    // rewrite req.url so handler-internal URL parsing sees the full path
    (req as any).url = req.originalUrl;
    Promise.resolve(fn(req, res)).catch((err) => {
      console.error("handler error:", err);
      if (!res.headersSent) res.status(500).json({ success: false, error: "shim error" });
    });
  };

app.all("/api/auth", mount(authHandler));
app.all("/api/auth/*", mount(authHandler));
app.all("/api/payments", mount(paymentsHandler));
app.all("/api/payments/*", mount(paymentsHandler));
app.all("/api/orders", mount(ordersHandler));
app.all("/api/orders/*", mount(ordersHandler));
app.all("/api/products", mount(productsHandler));
app.all("/api/products/*", mount(productsHandler));

// SPA
app.use(express.static(distDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`[local-test-server] http://localhost:${PORT}  (dist: ${distDir})`);
});
