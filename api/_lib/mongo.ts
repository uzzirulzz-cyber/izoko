// MongoDB singleton client for Vercel serverless functions
// Uses global to preserve client across warm invocations
import { MongoClient, ServerApiVersion, Db } from "mongodb";
import { MONGODB_URI, MONGODB_DB_NAME, cleanMongoUri } from "./config.js";

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientP: Promise<MongoClient> | undefined;
}

const uri = cleanMongoUri(MONGODB_URI);

function createClient(): Promise<MongoClient> {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: true,
    },
    connectTimeoutMS: 8000,
    serverSelectionTimeoutMS: 8000,
  });
  return client.connect();
}

export async function getDb(dbName = MONGODB_DB_NAME): Promise<Db> {
  if (!global.__mongoClientP) {
    global.__mongoClientP = createClient();
  }
  const client = await global.__mongoClientP;
  return client.db(dbName);
}

// Optional: initialize indexes on first call (best-effort)
let indexesInitialized = false;
export async function ensureIndexes(): Promise<void> {
  if (indexesInitialized) return;
  try {
    const db = await getDb();
    await Promise.all([
      db.collection("products").createIndex({ slug: 1 }, { unique: true, sparse: true }),
      db.collection("products").createIndex({ sku: 1 }, { unique: true, sparse: true }),
      db.collection("products").createIndex({ category: 1 }),
      db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true }),
      db.collection("users").createIndex({ staffId: 1 }, { unique: true, sparse: true }),
      db.collection("orders").createIndex({ orderNumber: 1 }, { unique: true, sparse: true }),
      db.collection("orders").createIndex({ userId: 1 }),
    ]);
    indexesInitialized = true;
  } catch (err: any) {
    // Indexes may already exist — safe to ignore
    console.warn("Index init notice:", err?.message);
  }
}
