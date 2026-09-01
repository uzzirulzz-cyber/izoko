// /api/app/* — PUBLIC endpoints for the Playbeat Admin Android app.
// These carry NO secrets: only release metadata used by the pre-login
// version gate, so the app can enforce "Update Required" before any
// administrator credentials are involved.
//   GET /api/app/version   → release metadata (version, minSupportedVersion,
//                            forceUpdate, apkUrl, release notes, build date)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleOptions, jsonOk, jsonError } from "../_lib/auth.js";
import { getAppRelease, semverGte } from "../_lib/appRelease.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const url = new URL(req.url || "", "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  const route = parts.slice(2).join("/").toLowerCase() || "version";

  if (route === "version" && req.method === "GET") {
    try {
      const release = await getAppRelease();
      // Optional installed-version hint → server-side update decision
      const installed = String((req.query?.installed as string) || "").trim();
      const updateRequired = installed
        ? !semverGte(installed, release.minSupportedVersion)
        : false;
      const updateAvailable = installed ? !semverGte(installed, release.version) : true;
      return jsonOk(res, {
        success: true,
        app: {
          name: "Playbeat Admin",
          platform: "Android",
          version: release.version,
          versionCode: release.versionCode,
          apkUrl: release.apkUrl,
          aabUrl: release.aabUrl || "",
          sizeBytes: release.sizeBytes,
          sha256: release.sha256,
          minSupportedVersion: release.minSupportedVersion,
          forceUpdate: Boolean(release.forceUpdate),
          buildDate: release.buildDate,
          minAndroid: release.minAndroid,
          targetAndroid: release.targetAndroid,
          releaseNotes: release.releaseNotes,
          installed: installed || null,
          updateRequired,
          updateAvailable,
        },
      });
    } catch (err: any) {
      console.error("GET /api/app/version error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  return jsonError(res, "Not found", 404);
}
