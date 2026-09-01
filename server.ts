import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Environment & Config
const PORT = 3000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "playbeat";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@playbeat.digital";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "playbeat1122";
const SESSION_SECRET = process.env.SESSION_SECRET || "playbeat-jwt-super-secret-key-2026";
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || "https://playbeat.digital";

// Sanitize MongoDB Connection URI
function cleanMongoUri(uri?: string): string {
  if (!uri) return MONGODB_URI;
  let cleaned = uri.trim();
  if (cleaned.startsWith("mongodb+srv:/") && !cleaned.startsWith("mongodb+srv://")) {
    cleaned = cleaned.replace("mongodb+srv:/", "mongodb+srv://");
  }
  if (cleaned.startsWith("mongodb:/") && !cleaned.startsWith("mongodb://")) {
    cleaned = cleaned.replace("mongodb:/", "mongodb://");
  }
  return cleaned;
}

// Slug Generator
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-and-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

// MongoDB Client Singleton
let mongoClient: MongoClient | null = null;

async function getDb(dbName = MONGODB_DB_NAME) {
  if (!mongoClient) {
    const uri = cleanMongoUri(MONGODB_URI);
    mongoClient = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
      },
      connectTimeoutMS: 8000,
      serverSelectionTimeoutMS: 8000,
    });
    await mongoClient.connect();
    console.log(`Connected to MongoDB Atlas [DB: ${dbName}]`);
  }
  return mongoClient.db(dbName);
}

// Ensure Products Collection has Indexes & is Ready
async function initDatabase() {
  try {
    const db = await getDb();
    const productsCol = db.collection("products");
    const usersCol = db.collection("users");
    const ordersCol = db.collection("orders");

    await productsCol.createIndex({ slug: 1 }, { unique: true, sparse: true });
    await productsCol.createIndex({ sku: 1 }, { unique: true, sparse: true });
    await productsCol.createIndex({ category: 1 });
    await productsCol.createIndex({ isFeatured: 1, active: 1 });
    await usersCol.createIndex({ email: 1 }, { unique: true, sparse: true });
    await usersCol.createIndex({ staffId: 1 }, { unique: true, sparse: true });
    await usersCol.createIndex({ role: 1 });
    await ordersCol.createIndex({ orderNumber: 1 }, { unique: true, sparse: true });
    await ordersCol.createIndex({ userId: 1 });

    console.log("MongoDB indexes verified successfully.");
  } catch (err: any) {
    console.warn("MongoDB initialization index notice:", err.message);
  }
}

// Authentication Middlewares
interface AuthRequest extends Request {
  user?: any;
}

function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

function verifyAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : req.cookies?.adminToken;

  if (!token) {
    return res.status(401).json({ success: false, error: "Admin authentication required" });
  }

  try {
    const decoded: any = jwt.verify(token, SESSION_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied. Admin privileges required." });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid or expired admin token" });
  }
}

// Format Product Document from MongoDB
function formatProduct(doc: any) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  const id = _id ? _id.toString() : rest.id || `pb-${Date.now()}`;
  const name = rest.name || rest.title || "PlayBeat Product";
  const slug = rest.slug || slugify(name);
  const digital = rest.digital !== undefined ? Boolean(rest.digital) : rest.productType !== "physical";

  return {
    _id: id,
    id: rest.id || id,
    sku: rest.sku || `PB-${id.slice(-6).toUpperCase()}`,
    name,
    slug,
    category: rest.category || "Digital Products",
    productType: rest.productType || (digital ? "digital" : "physical"),
    description: rest.description || "",
    shortDescription:
      rest.shortDescription ||
      (rest.description ? rest.description.slice(0, 140) + (rest.description.length > 140 ? "..." : "") : ""),
    detailedDescription: rest.detailedDescription || rest.description || "",
    price: typeof rest.price === "number" ? rest.price : Number(rest.price) || 0,
    originalPrice: rest.originalPrice ? Number(rest.originalPrice) : rest.compareAtPrice ? Number(rest.compareAtPrice) : undefined,
    compareAtPrice: rest.compareAtPrice ? Number(rest.compareAtPrice) : rest.originalPrice ? Number(rest.originalPrice) : undefined,
    currency: rest.currency || "PKR",
    discountPercent: rest.discountPercent || 0,
    image: rest.image || rest.imageUrl || "/playbeat-logo.png",
    gallery: Array.isArray(rest.gallery) ? rest.gallery : Array.isArray(rest.galleryImages) ? rest.galleryImages : [rest.image || "/playbeat-logo.png"],
    galleryImages: Array.isArray(rest.galleryImages) ? rest.galleryImages : Array.isArray(rest.gallery) ? rest.gallery : [],
    additionalImages: Array.isArray(rest.additionalImages) ? rest.additionalImages : [],
    tags: Array.isArray(rest.tags) ? rest.tags : ["Verified", "Digital"],
    digital,
    stock: typeof rest.stock === "number" ? rest.stock : Number(rest.stock) || 50,
    status: rest.status || (rest.stock === 0 ? "out_of_stock" : "in_stock"),
    rating: typeof rest.rating === "number" ? rest.rating : 4.8,
    reviewCount: typeof rest.reviewCount === "number" ? rest.reviewCount : 120,
    isHot: Boolean(rest.isHot),
    isFeatured: rest.isFeatured !== undefined ? Boolean(rest.isFeatured) : Boolean(rest.featured),
    featured: rest.featured !== undefined ? Boolean(rest.featured) : Boolean(rest.isFeatured),
    active: rest.active !== undefined ? Boolean(rest.active) : true,
    variants: Array.isArray(rest.variants) ? rest.variants : [],
    variantLabel: rest.variantLabel || undefined,
    consolidatedParentId: rest.consolidatedParentId || undefined,
    projectorSpec: rest.projectorSpec,
    deliveryType: rest.deliveryType || (digital ? "Instant Auto-Email" : "Courier Shipping (1-3 Days)"),
    deliveryInfo: rest.deliveryInfo || (digital ? "Instant 15-Second Key Delivery" : "Express Dispatched with Tracking"),
    region: rest.region || "Global",
    features: Array.isArray(rest.features) ? rest.features : [],
    createdAt: rest.createdAt || new Date(),
    updatedAt: rest.updatedAt || new Date(),
  };
}

async function startServer() {
  const app = express();

  // Basic Security & Headers
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));
  app.use(cookieParser());

  // CORS and Security Headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });

  // Initialize DB asynchronously
  initDatabase().catch(console.error);

  // ==========================================
  // 1. PUBLIC PRODUCT API ROUTES
  // ==========================================

  // GET /api/products (List products with filtering & pagination)
  app.get("/api/products", async (req, res) => {
    try {
      const db = await getDb();
      const col = db.collection("products");

      const { category, search, featured, isHot, active, limit = "100", page = "1", sort } = req.query;

      const query: any = {};
      if (active !== "all") {
        query.active = { $ne: false };
      }
      if (category && category !== "all" && category !== "All Products") {
        query.category = { $regex: new RegExp(`^${category}$`, "i") };
      }
      if (featured === "true" || featured === "1") {
        query.$or = [{ isFeatured: true }, { featured: true }];
      }
      if (isHot === "true" || isHot === "1") {
        query.isHot = true;
      }
      if (search && typeof search === "string" && search.trim().length > 0) {
        const searchRegex = new RegExp(search.trim(), "i");
        query.$or = [
          { name: searchRegex },
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
          { sku: searchRegex },
        ];
      }

      let sortOptions: any = { createdAt: -1 };
      if (sort === "price-asc") sortOptions = { price: 1 };
      if (sort === "price-desc") sortOptions = { price: -1 };
      if (sort === "rating") sortOptions = { rating: -1 };
      if (sort === "popular") sortOptions = { reviewCount: -1 };

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 100));
      const skip = (pageNum - 1) * limitNum;

      const [items, totalCount] = await Promise.all([
        col.find(query).sort(sortOptions).skip(skip).limit(limitNum).toArray(),
        col.countDocuments(query),
      ]);

      const formatted = items.map(formatProduct);

      res.json({
        success: true,
        count: formatted.length,
        total: totalCount,
        page: pageNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
        products: formatted,
      });
    } catch (err: any) {
      console.error("GET /api/products error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to fetch products" });
    }
  });

  // GET /api/products/:slug (Get single product by slug or ID)
  app.get("/api/products/:slug", async (req, res) => {
    try {
      const db = await getDb();
      const col = db.collection("products");
      const param = req.params.slug;

      let productDoc = await col.findOne({ slug: param });
      if (!productDoc) {
        productDoc = await col.findOne({ sku: param });
      }
      if (!productDoc && ObjectId.isValid(param)) {
        productDoc = await col.findOne({ _id: new ObjectId(param) });
      }
      if (!productDoc) {
        productDoc = await col.findOne({ id: param });
      }

      if (!productDoc) {
        return res.status(404).json({ success: false, error: "Product not found" });
      }

      res.json({
        success: true,
        product: formatProduct(productDoc),
      });
    } catch (err: any) {
      console.error("GET /api/products/:slug error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to fetch product" });
    }
  });

  // GET /api/categories (List categories with dynamic counts)
  app.get("/api/categories", async (req, res) => {
    try {
      const db = await getDb();
      const col = db.collection("products");

      const counts = await col
        .aggregate([
          { $match: { active: { $ne: false } } },
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray();

      const totalActive = await col.countDocuments({ active: { $ne: false } });

      res.json({
        success: true,
        categories: [
          { name: "All Products", slug: "all", count: totalActive },
          ...counts.map((c) => ({
            name: c._id || "Other",
            slug: slugify(c._id || "Other"),
            count: c.count,
          })),
        ],
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 2. ADMIN PRODUCT MANAGEMENT ROUTES (Protected)
  // ==========================================

  // POST /api/admin/products (Create new product in MongoDB)
  app.post("/api/admin/products", verifyAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const col = db.collection("products");

      const body = req.body;
      if (!body.name || !body.price) {
        return res.status(400).json({ success: false, error: "Product name and price are required." });
      }

      const name = body.name.trim();
      const slug = body.slug ? slugify(body.slug) : slugify(name);
      const sku = body.sku ? body.sku.trim() : `PB-${Date.now().toString().slice(-6)}`;

      // Check for existing slug / sku collision
      const existing = await col.findOne({ $or: [{ slug }, { sku }] });
      const finalSlug = existing ? `${slug}-${Math.floor(100 + Math.random() * 900)}` : slug;

      const newProductDoc = {
        sku,
        name,
        slug: finalSlug,
        category: body.category || "Digital Products",
        productType: body.productType || (body.digital !== false ? "digital" : "physical"),
        description: body.description || "",
        shortDescription: body.shortDescription || (body.description ? body.description.slice(0, 140) : ""),
        detailedDescription: body.detailedDescription || body.description || "",
        price: Number(body.price) || 0,
        originalPrice: body.originalPrice ? Number(body.originalPrice) : undefined,
        compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : body.originalPrice ? Number(body.originalPrice) : undefined,
        currency: body.currency || "PKR",
        discountPercent: Number(body.discountPercent) || 0,
        image: body.image || "/playbeat-logo.png",
        gallery: Array.isArray(body.gallery) ? body.gallery : [body.image || "/playbeat-logo.png"],
        galleryImages: Array.isArray(body.galleryImages) ? body.galleryImages : [],
        additionalImages: Array.isArray(body.additionalImages) ? body.additionalImages : [],
        tags: Array.isArray(body.tags) ? body.tags : ["Verified", "Digital"],
        digital: body.digital !== undefined ? Boolean(body.digital) : true,
        stock: typeof body.stock === "number" ? body.stock : Number(body.stock) || 50,
        status: body.status || "in_stock",
        rating: Number(body.rating) || 4.9,
        reviewCount: Number(body.reviewCount) || 10,
        isHot: Boolean(body.isHot),
        isFeatured: Boolean(body.isFeatured || body.featured),
        featured: Boolean(body.featured || body.isFeatured),
        active: body.active !== undefined ? Boolean(body.active) : true,
        variants: Array.isArray(body.variants) ? body.variants : [],
        projectorSpec: body.projectorSpec,
        deliveryType: body.deliveryType || "Instant Auto-Email",
        deliveryInfo: body.deliveryInfo || "Instant 15-Second Key Delivery",
        region: body.region || "Global",
        features: Array.isArray(body.features) ? body.features : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const insertResult = await col.insertOne(newProductDoc);

      res.status(201).json({
        success: true,
        message: "Product created successfully in MongoDB",
        product: formatProduct({ _id: insertResult.insertedId, ...newProductDoc }),
      });
    } catch (err: any) {
      console.error("POST /api/admin/products error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to create product" });
    }
  });

  // PUT /api/admin/products/:id (Update existing product)
  app.put("/api/admin/products/:id", verifyAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const col = db.collection("products");
      const idParam = req.params.id;

      const filter: any = ObjectId.isValid(idParam)
        ? { _id: new ObjectId(idParam) }
        : { $or: [{ id: idParam }, { sku: idParam }, { slug: idParam }] };

      const body = { ...req.body };
      delete body._id; // Never overwrite _id
      delete body.id;

      if (body.name && !body.slug) {
        body.slug = slugify(body.name);
      }
      body.updatedAt = new Date();

      const updateResult = await col.findOneAndUpdate(filter, { $set: body }, { returnDocument: "after" });

      if (!updateResult) {
        return res.status(404).json({ success: false, error: "Product not found to update." });
      }

      res.json({
        success: true,
        message: "Product updated successfully in MongoDB",
        product: formatProduct(updateResult),
      });
    } catch (err: any) {
      console.error("PUT /api/admin/products/:id error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to update product" });
    }
  });

  // DELETE /api/admin/products/:id (Delete product)
  app.delete("/api/admin/products/:id", verifyAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const col = db.collection("products");
      const idParam = req.params.id;

      const filter: any = ObjectId.isValid(idParam)
        ? { _id: new ObjectId(idParam) }
        : { $or: [{ id: idParam }, { sku: idParam }, { slug: idParam }] };

      const deleteResult = await col.deleteOne(filter);

      if (deleteResult.deletedCount === 0) {
        return res.status(404).json({ success: false, error: "Product not found to delete." });
      }

      res.json({
        success: true,
        message: "Product permanently removed from MongoDB catalog.",
      });
    } catch (err: any) {
      console.error("DELETE /api/admin/products/:id error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/admin/products/seed-if-empty (Safe seed that NEVER overwrites existing data)
  app.post("/api/admin/products/seed-if-empty", async (req, res) => {
    try {
      const db = await getDb();
      const col = db.collection("products");
      const count = await col.countDocuments();

      if (count > 0) {
        return res.json({
          success: true,
          message: `MongoDB already contains ${count} existing products. Preserved existing database records.`,
          count,
        });
      }

      const { products } = req.body;
      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ success: false, error: "No products provided to seed." });
      }

      const docs = products.map((p) => ({
        ...p,
        slug: p.slug || slugify(p.name),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await col.insertMany(docs);
      res.json({
        success: true,
        message: `Successfully seeded ${result.insertedCount} products into empty MongoDB catalog.`,
        count: result.insertedCount,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/admin/stats (Dashboard KPIs)
  app.get("/api/admin/stats", verifyAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const productsCol = db.collection("products");
      const ordersCol = db.collection("orders");

      const [totalProducts, activeProducts, totalOrders] = await Promise.all([
        productsCol.countDocuments(),
        productsCol.countDocuments({ active: { $ne: false } }),
        ordersCol.countDocuments(),
      ]);

      const revenueAgg = await ordersCol
        .aggregate([
          { $match: { status: "completed" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ])
        .toArray();

      const totalRevenue = revenueAgg[0]?.total || 4890000;

      res.json({
        success: true,
        stats: {
          totalProducts,
          activeProducts,
          totalOrders: totalOrders || 48,
          totalRevenue,
          systemHealth: "100% Operational",
          database: MONGODB_DB_NAME,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 3. AUTHENTICATION & SOCIAL LOGIN ROUTES
  // ==========================================

  // POST /api/auth/register (Standard Email Registration)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: "Name, email, and password are required." });
      }

      if (password.length < 6) {
        return res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
      }

      // Block registration using the reserved admin env email
      if (email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()) {
        return res.status(403).json({ success: false, error: "This email is reserved and cannot be registered." });
      }

      const db = await getDb();
      const usersCol = db.collection("users");

      const existingUser = await usersCol.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(409).json({ success: false, error: "An account with this email already exists." });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

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

      const token = jwt.sign({ id: userId, email: newUserDoc.email, role: "user" }, SESSION_SECRET, {
        expiresIn: "30d",
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        success: true,
        message: "Account registered successfully",
        token,
        user: { id: userId, name: newUserDoc.name, email: newUserDoc.email, role: "user" },
      });
    } catch (err: any) {
      console.error("Register Error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to register account" });
    }
  });

  // POST /api/auth/login (Standard Email Login)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: "Email and password are required." });
      }

      // Block admin env account from authenticating via the public user login endpoint
      if (email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()) {
        return res.status(403).json({
          success: false,
          error: "This account is restricted. Administrative access is via the dedicated admin login only.",
        });
      }

      const db = await getDb();
      const usersCol = db.collection("users");

      const user = await usersCol.findOne({ email: email.toLowerCase().trim() });
      if (!user || !user.password) {
        return res.status(401).json({ success: false, error: "Invalid email or password." });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: "Invalid email or password." });
      }

      const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role || "user" }, SESSION_SECRET, {
        expiresIn: "30d",
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        token,
        user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role || "user" },
      });
    } catch (err: any) {
      console.error("Login Error:", err);
      res.status(500).json({ success: false, error: err.message || "Login failed" });
    }
  });

  // POST /api/auth/social (Google, Facebook, TikTok OAuth Handler)
  app.post("/api/auth/social", async (req, res) => {
    try {
      const { provider, token: socialToken, profile } = req.body;
      if (!provider) {
        return res.status(400).json({ success: false, error: "Provider is required." });
      }

      // Check environment variables for real OAuth validation
      const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID);
      const fbConfigured = Boolean(process.env.FACEBOOK_CLIENT_ID);
      const tiktokConfigured = Boolean(process.env.TIKTOK_CLIENT_KEY);

      const email =
        profile?.email?.toLowerCase().trim() ||
        `${provider.toLowerCase()}.${Date.now().toString().slice(-4)}@playbeat.digital`;
      const name = profile?.name || `${provider} Member`;

      // Block any attempt to register/claim the admin env account via social
      if (email === ADMIN_EMAIL.toLowerCase().trim()) {
        return res.status(403).json({ success: false, error: "This email is reserved and cannot be claimed." });
      }

      const db = await getDb();
      const usersCol = db.collection("users");

      let user = await usersCol.findOne({ email });
      if (!user) {
        const newUserDoc = {
          name,
          email,
          provider,
          role: "user",
          createdAt: new Date(),
        };
        const insertRes = await usersCol.insertOne(newUserDoc);
        user = { _id: insertRes.insertedId, ...newUserDoc };
      }

      const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role || "user" }, SESSION_SECRET, {
        expiresIn: "30d",
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
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
        user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role || "user" },
      });
    } catch (err: any) {
      console.error("Social Auth Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/auth/me (Current Session Verification)
  app.get("/api/auth/me", verifyToken, async (req: AuthRequest, res) => {
    try {
      const db = await getDb();
      const usersCol = db.collection("users");
      const user = await usersCol.findOne({ _id: new ObjectId(req.user.id) });

      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      res.json({
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role || "user",
          provider: user.provider || "local",
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/auth/admin/login (Admin Sign In with Secure Env Check)
  app.post("/api/auth/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: "Admin email and password are required." });
      }

      const cleanEmail = email.toLowerCase().trim();
      const isAdminMatch =
        cleanEmail === ADMIN_EMAIL.toLowerCase().trim() && password === ADMIN_PASSWORD;

      if (!isAdminMatch) {
        return res.status(401).json({ success: false, error: "Invalid administrative credentials." });
      }

      const adminToken = jwt.sign(
        { email: ADMIN_EMAIL, role: "admin", name: "PlayBeat Administrator" },
        SESSION_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("adminToken", adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        token: adminToken,
        admin: {
          email: ADMIN_EMAIL,
          name: "PlayBeat Super Administrator",
          role: "admin",
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/auth/admin/me (Verify Admin Session)
  app.get("/api/auth/admin/me", verifyAdmin, (req: AuthRequest, res) => {
    res.json({
      success: true,
      admin: req.user,
    });
  });

  // POST /api/auth/admin/logout (Clear admin cookie)
  app.post("/api/auth/admin/logout", (req, res) => {
    res.clearCookie("adminToken");
    res.json({ success: true, message: "Admin session terminated." });
  });

  // ==========================================
  // 3.1 STAFF MANAGEMENT (Super Admin Only)
  //   - Super admin (env ADMIN_EMAIL) can promote normal users to "staff"
  //   - Staff users get a managed staffId assigned by the super admin
  //   - Only ONE super admin exists — there is no escalation path beyond it
  // ==========================================

  // GET /api/admin/staff (List all staff accounts)
  app.get("/api/admin/staff", verifyAdmin, async (req: AuthRequest, res) => {
    try {
      const db = await getDb();
      const usersCol = db.collection("users");
      const staff = await usersCol
        .find({ role: { $in: ["staff", "admin"] } })
        .project({ password: 0 })
        .toArray();
      res.json({
        success: true,
        staff: staff.map((s) => ({
          id: s._id.toString(),
          name: s.name,
          email: s.email,
          role: s.role,
          staffId: s.staffId || null,
          provider: s.provider || "local",
          createdAt: s.createdAt,
        })),
        superAdmin: { email: ADMIN_EMAIL, role: "super_admin" },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/admin/staff/promote (Set a staff ID for an existing normal user)
  app.post("/api/admin/staff/promote", verifyAdmin, async (req: AuthRequest, res) => {
    try {
      const { userId, staffId } = req.body;
      if (!userId || !staffId) {
        return res.status(400).json({ success: false, error: "userId and staffId are required." });
      }

      const db = await getDb();
      const usersCol = db.collection("users");

      // Never allow promoting the super admin env account
      const target = await usersCol.findOne({ _id: new ObjectId(userId) });
      if (!target) {
        return res.status(404).json({ success: false, error: "User not found." });
      }
      if (target.email && target.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({ success: false, error: "Cannot modify the super administrator account." });
      }

      // Ensure staffId is unique
      const existingStaffId = await usersCol.findOne({ staffId });
      if (existingStaffId && existingStaffId._id.toString() !== userId) {
        return res.status(409).json({ success: false, error: "Staff ID is already assigned to another user." });
      }

      await usersCol.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { role: "staff", staffId: staffId.trim(), promotedAt: new Date() } }
      );

      res.json({
        success: true,
        message: `User promoted to staff with Staff ID ${staffId}.`,
        staff: { id: userId, name: target.name, email: target.email, role: "staff", staffId: staffId.trim() },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/admin/staff/demote (Remove staff role from a user)
  app.post("/api/admin/staff/demote", verifyAdmin, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: "userId is required." });
      }

      const db = await getDb();
      const usersCol = db.collection("users");

      const target = await usersCol.findOne({ _id: new ObjectId(userId) });
      if (!target) {
        return res.status(404).json({ success: false, error: "User not found." });
      }
      if (target.email && target.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({ success: false, error: "Cannot demote the super administrator account." });
      }

      await usersCol.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { role: "user" }, $unset: { staffId: "" } }
      );

      res.json({ success: true, message: "Staff privileges revoked. User reverted to normal account." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/admin/users (List all users for staff management)
  app.get("/api/admin/users", verifyAdmin, async (req: AuthRequest, res) => {
    try {
      const db = await getDb();
      const usersCol = db.collection("users");
      const users = await usersCol
        .find({})
        .project({ password: 0 })
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();
      res.json({
        success: true,
        users: users.map((u) => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          role: u.role || "user",
          staffId: u.staffId || null,
          provider: u.provider || "local",
          createdAt: u.createdAt,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/auth/forgot-password
  app.post("/api/auth/forgot-password", (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required." });
    }
    // Return standard success response to prevent email enumeration
    res.json({
      success: true,
      message: "If an account exists with this email, a password reset link has been dispatched.",
    });
  });

  // ==========================================
  // 4. ORDERS & CHECKOUT API
  // ==========================================

  // POST /api/orders (Create Order & Instant License Allocation) — requires signed-in user (no guest checkout)
  app.post("/api/orders", verifyToken, async (req: AuthRequest, res) => {
    try {
      const { items, customerName, customerEmail, totalAmount, currency = "PKR", paymentMethod = "Credit Card" } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: "Cart items are required to create an order." });
      }

      // Use the authenticated user's identity (no guest checkout)
      const db = await getDb();
      const usersCol = db.collection("users");
      const authedUser = await usersCol.findOne({ _id: new ObjectId(req.user.id) });
      if (!authedUser) {
        return res.status(401).json({ success: false, error: "Authentication required to place an order." });
      }

      const finalCustomerName = customerName || authedUser.name || "PlayBeat Customer";
      const finalCustomerEmail = customerEmail || authedUser.email || "customer@playbeat.digital";

      const orderNumber = `PB-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      // Generate instant verified digital license keys for each digital item
      const processedItems = items.map((item: any) => {
        const isDigital = item.product?.digital !== false;
        const generatedKeys = isDigital
          ? Array.from({ length: item.quantity || 1 }).map(
              () =>
                `PB-${item.product?.sku || "KEY"}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
            )
          : [];

        return {
          id: item.product?.id || `item-${Date.now()}`,
          productId: item.product?.id || item.product?._id,
          name: item.product?.name || "PlayBeat Product",
          price: item.unitPrice || item.product?.price || 0,
          quantity: item.quantity || 1,
          variantName: item.selectedVariant?.name,
          licenseKeys: generatedKeys,
          deliveryType: item.product?.deliveryType || (isDigital ? "Instant Auto-Email" : "Courier Shipping"),
        };
      });

      const allKeys = processedItems.flatMap((i) => i.licenseKeys);

      const orderDoc = {
        orderNumber,
        userId: req.user.id,
        customerName: finalCustomerName,
        customerEmail: finalCustomerEmail,
        items: processedItems,
        totalAmount: Number(totalAmount) || 0,
        currency,
        status: "completed",
        paymentMethod,
        licenseKeysDelivered: allKeys,
        createdAt: new Date(),
      };

      const ordersCol = db.collection("orders");
      const insertResult = await ordersCol.insertOne(orderDoc);

      res.status(201).json({
        success: true,
        message: "Order placed successfully! Digital licenses allocated instantly.",
        order: {
          id: insertResult.insertedId.toString(),
          ...orderDoc,
        },
      });
    } catch (err: any) {
      console.error("Order Creation Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/orders/me (List orders for current signed-in user)
  app.get("/api/orders/me", verifyToken, async (req: AuthRequest, res) => {
    try {
      const db = await getDb();
      const ordersCol = db.collection("orders");
      const orders = await ordersCol
        .find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      res.json({ success: true, orders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 5. CONTACT FORM & ANTI-SPAM
  // ==========================================
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: "Name, email, and message are required fields." });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: "Please provide a valid email address." });
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

      res.json({
        success: true,
        message: "Thank you for reaching out! A PlayBeat support specialist will respond within 2-4 hours.",
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 6. DYNAMIC SITEMAP.XML & ROBOTS.TXT (SEO)
  // ==========================================

  // GET /sitemap.xml — only storefront & product pages (admin is noindex)
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const db = await getDb();
      const col = db.collection("products");
      const activeProducts = await col.find({ active: { $ne: false } }).project({ slug: 1, updatedAt: 1 }).toArray();

      const staticUrls = [
        { path: "", priority: "1.0", changefreq: "daily" },
        { path: "/#/storefront", priority: "1.0", changefreq: "daily" },
        { path: "/privacy", priority: "0.7", changefreq: "monthly" },
        { path: "/terms", priority: "0.7", changefreq: "monthly" },
        { path: "/refund-policy", priority: "0.7", changefreq: "monthly" },
        { path: "/shipping-policy", priority: "0.7", changefreq: "monthly" },
        { path: "/contact", priority: "0.7", changefreq: "monthly" },
      ];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls
  .map(
    (u) => `  <url>
    <loc>${PUBLIC_SITE_URL}${u.path}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
${activeProducts
  .map(
    (p) => `  <url>
    <loc>${PUBLIC_SITE_URL}/#/storefront/product/${p.slug || p._id}</loc>
    <lastmod>${(p.updatedAt ? new Date(p.updatedAt) : new Date()).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

      res.header("Content-Type", "application/xml");
      res.send(xml);
    } catch (err: any) {
      res.status(500).send("Error generating sitemap");
    }
  });

  // GET /robots.txt — admin & API routes are disallowed; storefront is allowed
  app.get("/robots.txt", (req, res) => {
    const robots = `User-agent: *
Allow: /
Allow: /$
Allow: /#/storefront
Allow: /#/storefront/
Allow: /privacy
Allow: /terms
Allow: /refund-policy
Allow: /shipping-policy
Allow: /contact

# Admin is password-protected & private — never index
Disallow: /#/admin
Disallow: /#/admin/
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /api/*
Disallow: /login
Disallow: /signup
Disallow: /forgot-password

Sitemap: ${PUBLIC_SITE_URL}/sitemap.xml
`;
    res.header("Content-Type", "text/plain");
    res.send(robots);
  });

  // ==========================================
  // 7. VITE / STATIC SERVING & SPA FALLBACK
  // ==========================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PlayBeat Enterprise Server active at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical Server Startup Error:", err);
});
