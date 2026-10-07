// Shared MongoDB connection loader for maintenance scripts — SERVER-SIDE ONLY.
//
// SECURITY: this file must NEVER contain a hardcoded connection string.
// Resolution order:
//   1. process.env.MONGODB_URI
//   2. repo-root .env (gitignored) — key MONGODB_URI
// If neither is present this throws with remediation instructions.
// Never log or print the resolved URI.
const fs = require("fs");
const path = require("path");

function readEnvFileUri() {
  const envPath = path.join(__dirname, "..", ".env");
  try {
    if (!fs.existsSync(envPath)) return undefined;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*MONGODB_URI\s*=\s*(.+?)\s*$/);
      if (m) {
        const v = m[1].replace(/^["']|["']$/g, "");
        if (v && v.startsWith("mongodb")) return v;
      }
    }
  } catch {
    /* fall through to undefined */
  }
  return undefined;
}

const MONGODB_URI = process.env.MONGODB_URI || readEnvFileUri();

if (!MONGODB_URI) {
  throw new Error(
    "[_mongo_uri] MONGODB_URI is not configured. Set it in the environment or in the " +
      "repo-root .env file (gitignored). Hardcoding database credentials in source " +
      "files is forbidden — see .env.example."
  );
}

module.exports = { MONGODB_URI };
