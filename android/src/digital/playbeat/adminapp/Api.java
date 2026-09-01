package digital.playbeat.adminapp;

import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;


/**
 * Api — minimal HTTPS JSON client for the Playbeat backend.
 *
 * Every call runs on a background executor. TLS-only (cleartext is blocked
 * at the manifest + network-security-config level). The same endpoints power
 * the web admin panel — no duplicated business logic lives in this app.
 *
 *   POST /api/auth/admin/login          → { token, admin{email,name,role} }
 *   GET  /api/app/version?installed=x   → release metadata + update decision
 *   POST /api/admin/app/heartbeat       → { onlineNow, ops{...} }
 *   GET  /api/admin/app/notifications   → { summary{...}, notifications[...] }
 */
public final class Api {

    public static final String HOST = "playbeat.digital";
    public static final String BASE = "https://" + HOST;
    public static final String UA_SUFFIX = " PlaybeatAdminApp/" + BuildConfig.APP_VERSION;

    public static class Result {
        public int code;
        public String body;
        public boolean ok() { return code >= 200 && code < 300; }
    }

    private static final ExecutorService EXEC = Executors.newFixedThreadPool(3);
    private static final String TAG = "Api";

    public interface Callback {
        void onDone(Result result);
    }

    private Api() {}

    public static void post(String path, JSONObject payload, String bearer, Callback cb) {
        run("POST", path, payload, bearer, cb);
    }

    public static void get(String path, String bearer, Callback cb) {
        run("GET", path, null, bearer, cb);
    }

    private static void run(String method, final String path, final JSONObject payload,
                            final String bearer, final Callback cb) {
        EXEC.execute(() -> {
            Result result = new Result();
            HttpURLConnection conn = null;
            try {
                URL url = new URL(path.startsWith("http") ? path : BASE + path);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod(method);
                conn.setConnectTimeout(12000);
                conn.setReadTimeout(15000);
                conn.setRequestProperty("User-Agent",
                        System.getProperty("http.agent", "PlaybeatAdmin") + UA_SUFFIX);
                conn.setRequestProperty("Accept", "application/json");
                if (payload != null) {
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);
                }
                if (bearer != null && !bearer.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + bearer);
                }
                conn.connect();
                if (payload != null) {
                    OutputStream os = conn.getOutputStream();
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();
                }
                result.code = conn.getResponseCode();
                java.io.InputStream is = result.code >= 400 ? conn.getErrorStream() : conn.getInputStream();
                StringBuilder sb = new StringBuilder();
                if (is != null) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                    br.close();
                }
                result.body = sb.toString();
            } catch (Exception e) {
                Log.w(TAG, method + " " + path + " failed: " + e.getMessage());
                result.code = -1;
                result.body = "{\"error\":\"network\"}";
            } finally {
                if (conn != null) conn.disconnect();
            }
            final Result r = result;
            if (cb != null) cb.onDone(r);
        });
    }

    // ---------- response helpers ----------

    public static JSONObject obj(Result r) {
        try { return new JSONObject(r.body == null || r.body.isEmpty() ? "{}" : r.body); }
        catch (Exception e) { return new JSONObject(); }
    }

    public static JSONArray arr(JSONObject o, String key) {
        try { return o.has(key) ? o.getJSONArray(key) : new JSONArray(); }
        catch (Exception e) { return new JSONArray(); }
    }

    public static String optStr(JSONObject o, String key) {
        return o == null || !o.has(key) || o.isNull(key) ? "" : o.optString(key, "");
    }

    // ---------- version compare ----------

    /** Semver compare: returns true when a >= b. */
    public static boolean semverGte(String a, String b) {
        try {
            String[] pa = a.split("\\.");
            String[] pb = b.split("\\.");
            for (int i = 0; i < 3; i++) {
                int ia = i < pa.length ? Integer.parseInt(pa[i].replaceAll("[^0-9]", "")) : 0;
                int ib = i < pb.length ? Integer.parseInt(pb[i].replaceAll("[^0-9]", "")) : 0;
                if (ia > ib) return true;
                if (ia < ib) return false;
            }
            return true;
        } catch (Exception e) {
            return true; // never brick the app over a malformed version string
        }
    }
}
