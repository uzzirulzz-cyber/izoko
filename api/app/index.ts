// /api/app/* — PUBLIC endpoints for the Playbeat mobile apps.
// These carry NO secrets: only release metadata used by the pre-login
// version gate (admin app) and the customer-app storefront config
// (store URLs, versions, visibility flags) that ship to every visitor.
//   GET /api/app/version       → ADMIN app release metadata (version gate)
//   GET /api/app/storefront    → CUSTOMER app config for /download, footer,
//                                homepage section (DB → env → safe defaults)
//   POST /api/app/push-token   → customer JWT; registers an Expo push token
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleOptions, jsonOk, jsonError, requireUser } from "../_lib/auth.js";
import { getAppRelease, semverGte } from "../_lib/appRelease.js";
import {
  getMobileAppsConfig,
  resolveQrValue,
  upsertPushToken,
} from "../_lib/mobileApps.js";

const SITE_URL = (process.env.PUBLIC_SITE_URL || "https://playbeat.digital").trim();

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
      const belowMin = installed
        ? !semverGte(installed, release.minSupportedVersion)
        : false;
      // forceUpdate ON = blocking gate for EVERYONE below the latest release
      const belowLatest = installed ? !semverGte(installed, release.version) : true;
      const updateRequired = belowMin || (Boolean(release.forceUpdate) && belowLatest);
      const updateAvailable = installed ? belowLatest : true;
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

  // ============ GET /api/app/storefront — customer app public config ============
  if (route === "storefront" && req.method === "GET") {
    try {
      const { config, source } = await getMobileAppsConfig();
      // A platform is "listable" only when the admin switch is on AND a safe
      // URL exists — the storefront renders a Coming soon state otherwise.
      const androidListable = config.android.available && Boolean(config.android.url);
      const iosListable = config.ios.available && Boolean(config.ios.url);
      return jsonOk(res, {
        success: true,
        apps: {
          android: {
            url: androidListable ? config.android.url : "",
            version: config.android.version,
            buildNumber: config.android.buildNumber,
            minOsVersion: config.android.minOsVersion,
            available: androidListable,
            packageName: config.android.packageName,
            source: source.androidUrl || "default",
          },
          ios: {
            url: iosListable ? config.ios.url : "",
            version: config.ios.version,
            buildNumber: config.ios.buildNumber,
            minOsVersion: config.ios.minOsVersion,
            available: iosListable,
            packageName: config.ios.packageName,
            source: source.iosUrl || "default",
          },
          downloadPageVisible: config.downloadPageVisible,
          footerVisible: config.footerVisible,
          homeSectionVisible: config.homeSectionVisible,
          promoBanner: config.promoBanner || "",
          releaseNotes: config.releaseNotes || [],
          qrDestination: config.qrDestination,
          qrValue: resolveQrValue(config, SITE_URL),
          deepLinkScheme: "playbeat",
        },
      });
    } catch (err: any) {
      console.error("GET /api/app/storefront error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/app/push-token — Expo push registration ============
  if (route === "push-token" && req.method === "POST") {
    const user = requireUser(req, res);
    if (!user) return; // 401 already sent
    try {
      const body = typeof req.body === "object" && req.body ? req.body : {};
      const token = String(body.token || "").trim();
      // Expo push tokens look like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
      if (!/^[A-Za-z0-9_\-+\[\]]{16,160}$/.test(token)) {
        return jsonError(res, "Invalid push token", 400);
      }
      const platformRaw = String(body.platform || "").toLowerCase();
      const platform = (platformRaw === "ios" || platformRaw === "web" ? platformRaw : "android") as
        | "android"
        | "ios"
        | "web";
      await upsertPushToken({
        userId: user.id || user._id || "",
        token,
        platform,
        appVersion: body.appVersion,
        deviceName: body.deviceName,
      });
      return jsonOk(res, { success: true, registered: true });
    } catch (err: any) {
      console.error("POST /api/app/push-token error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  return jsonError(res, "Not found", 404);
}
