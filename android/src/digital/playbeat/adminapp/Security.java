package digital.playbeat.adminapp;

import android.content.Context;
import android.util.Log;

import java.io.File;

/**
 * Security — lightweight runtime integrity checks.
 *
 * Root evidence triggers a visible security warning in the login screen
 * (administrative access from a compromised device is a real enterprise
 * risk — the administrator decides whether to continue on a trusted device).
 * The backend remains the single source of authorization regardless.
 */
public final class Security {

    private static Boolean rootCache = null;

    private Security() {}

    public static boolean isDeviceRooted() {
        if (rootCache != null) return rootCache;
        boolean rooted = false;
        try {
            String[] paths = {
                    "/system/bin/su", "/system/xbin/su", "/sbin/su", "/system/sd/xbin/su",
                    "/system/bin/failsafe/su", "/data/local/xbin/su", "/data/local/bin/su",
                    "/data/local/su", "/su/bin/su",
            };
            for (String p : paths) {
                if (new File(p).exists()) { rooted = true; break; }
            }
            if (!rooted) {
                String[] pkgs = {
                        "com.topjohnwu.magisk", "eu.chainfire.supersu", "com.koushikdutta.superuser",
                        "com.thirdparty.superuser", "com.noshufou.android.su",
                };
                Context c = AppContextHolder.get();
                if (c != null) {
                    for (String pkg : pkgs) {
                        try {
                            c.getPackageManager().getPackageInfo(pkg, 0);
                            rooted = true;
                            break;
                        } catch (Exception ignored) { /* not installed */ }
                    }
                }
            }
        } catch (Throwable t) {
            Log.w("Security", "root check failed", t);
        }
        rootCache = rooted;
        return rooted;
    }

    /** Generic application context holder (initialized in AdminApp). */
    public static final class AppContextHolder {
        private static Context appContext;

        public static void init(Context ctx) { appContext = ctx.getApplicationContext(); }
        public static Context get() { return appContext; }
    }
}
