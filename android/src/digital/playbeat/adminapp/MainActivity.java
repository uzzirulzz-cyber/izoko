package digital.playbeat.adminapp;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;


/**
 * Playbeat Admin v2.0 — official native Android client for the Playbeat admin
 * platform (enterprise release).
 *
 * Single-ecosystem guarantee: the app owns NO business logic and NO data.
 * Everything renders through the same authenticated web admin session and the
 * same APIs the web panel uses — /api/auth/admin/login, /api/admin/*, MongoDB.
 * Native layers add enterprise mobile security and convenience only:
 *
 *   Security:      FLAG_SECURE screenshots-off, Android Keystore (AES-256-GCM)
 *                  session storage, biometric unlock gate, root warning,
 *                  HTTPS-only, server-driven version gate, device revoke lockout
 *   Convenience:   native enterprise login, bottom navigation with live badges,
 *                  notification bell (real backend feed), pull-to-refresh,
 *                  offline auto-retry, gallery/camera file upload, downloads,
 *                  in-app update flow
 */
public class MainActivity extends Activity {

    private static final String TAG = "MainActivity";
    private static final String HOST = Api.HOST;
    private static final int REQ_LOGIN = 41;
    private static final int REQ_FILE_CHOOSER = 42;
    private static final int REQ_POST_NOTIFICATIONS = 43;

    // ---------- session ----------
    private String token;        // sealed in SecureStore after login
    private String adminName = "";
    private String adminRole = "";

    // ---------- shell ----------
    private WebView webView;
    private FrameLayout root;
    private LinearLayout offlineBanner;
    private LinearLayout errorView;
    private LinearLayout updateBlock;      // blocking "Update Required" overlay
    private LinearLayout updateBanner;     // dismissible optional-update banner
    private LinearLayout biometricOverlay; // lock overlay shown on resume
    private LinearLayout topBar;
    private TextView statusDot;
    private TextView notifBadge;
    private TextView ordersBadge;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> filePickerCallback;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private long lastBackPress = 0L;
    private boolean wasBackgrounded = false;
    private boolean tokenSeeded = false;
    private boolean updateRequiredFlag = false;
    private String latestApkUrl = "";
    private String latestVersion = "";
    private int lastNotifOrderIdHash = 0;

    private final Runnable heartbeatTask = new Runnable() {
        @Override public void run() { sendHeartbeat(); mainHandler.postDelayed(this, 60_000L); }
    };
    private final Runnable notifTask = new Runnable() {
        @Override public void run() { pollNotifications(); mainHandler.postDelayed(this, 120_000L); }
    };

    // =====================================================================
    // Lifecycle
    // =====================================================================

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE);
        getWindow().setStatusBarColor(Color.parseColor("#040816"));
        getWindow().setNavigationBarColor(Color.parseColor("#040816"));
        createNotificationChannel();

        token = SecureStore.get(this, "admin_token");
        adminName = SecureStore.get(this, "admin_name");
        adminRole = SecureStore.get(this, "admin_role");

        buildShell();
        setContentView(root);
        checkVersionAndStart();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (wasBackgrounded && token != null && !updateRequiredFlag) {
            showBiometricGate();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        wasBackgrounded = true;
    }

    @Override
    protected void onDestroy() {
        mainHandler.removeCallbacksAndMessages(null);
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    // =====================================================================
    // Version gate (server-driven — no app-store review needed)
    // =====================================================================

    private void checkVersionAndStart() {
        Api.get("/api/app/version?installed=" + BuildConfig.APP_VERSION, null, result -> {
            JSONObject app = Api.obj(result).optJSONObject("app");
            if (app != null) {
                latestApkUrl = Api.optStr(app, "apkUrl");
                latestVersion = Api.optStr(app, "version");
                boolean updateRequired = app.optBoolean("updateRequired", false);
                String minVersion = Api.optStr(app, "minSupportedVersion");
                if (updateRequired || (!Api.semverGte(BuildConfig.APP_VERSION,
                        minVersion.isEmpty() ? BuildConfig.APP_VERSION : minVersion))) {
                    updateRequiredFlag = true;
                    runOnUiThread(() -> showUpdateBlock(app));
                    return;
                }
                boolean updateAvailable = app.optBoolean("updateAvailable",
                        !Api.semverGte(BuildConfig.APP_VERSION, latestVersion));
                if (updateAvailable) {
                    runOnUiThread(() -> showUpdateBanner(app));
                }
            }
            runOnUiThread(this::startSessionFlow);
        });
    }

    private void showUpdateBlock(JSONObject app) {
        if (updateBlock != null || root == null) return;
        updateBlock = new LinearLayout(this);
        updateBlock.setOrientation(LinearLayout.VERTICAL);
        updateBlock.setGravity(Gravity.CENTER);
        updateBlock.setBackgroundColor(Color.parseColor("#040816"));
        updateBlock.setPadding(dip(28), dip(28), dip(28), dip(28));

        TextView icon = new TextView(this);
        icon.setText("⬆");
        icon.setTextColor(Color.parseColor("#FFC107"));
        icon.setTextSize(42);
        icon.setGravity(Gravity.CENTER);

        TextView title = new TextView(this);
        title.setText("Update Required");
        title.setTextColor(Color.WHITE);
        title.setTextSize(22);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, dip(12), 0, dip(4));

        TextView sub = new TextView(this);
        sub.setText("This Playbeat Admin version (" + BuildConfig.APP_VERSION
                + ") is no longer supported.\nUpdate to v" + latestVersion
                + " to continue administrating.");
        sub.setTextColor(Color.parseColor("#8B93A7"));
        sub.setTextSize(13);
        sub.setGravity(Gravity.CENTER);
        sub.setPadding(0, 0, 0, dip(14));

        updateBlock.addView(icon);
        updateBlock.addView(title);
        updateBlock.addView(sub);

        org.json.JSONArray notes = app.optJSONArray("releaseNotes");
        if (notes != null && notes.length() > 0) {
            LinearLayout notesBox = new LinearLayout(this);
            notesBox.setOrientation(LinearLayout.VERTICAL);
            GradientDrawable nb = new GradientDrawable();
            nb.setCornerRadius(dip(14));
            nb.setColor(Color.parseColor("#0A122E"));
            nb.setStroke(dip(1), Color.parseColor("#232C4D"));
            notesBox.setBackground(nb);
            notesBox.setPadding(dip(16), dip(14), dip(16), dip(14));
            TextView notesTitle = new TextView(this);
            notesTitle.setText("What's new in v" + latestVersion);
            notesTitle.setTextColor(Color.parseColor("#FFC107"));
            notesTitle.setTextSize(12);
            notesTitle.setTypeface(Typeface.DEFAULT_BOLD);
            notesBox.addView(notesTitle);
            for (int i = 0; i < Math.min(notes.length(), 6); i++) {
                TextView line = new TextView(this);
                line.setText("•  " + notes.optString(i));
                line.setTextColor(Color.parseColor("#B9C0D4"));
                line.setTextSize(11.5f);
                line.setPadding(0, dip(5), 0, 0);
                notesBox.addView(line);
            }
            LinearLayout.LayoutParams nbp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            updateBlock.addView(notesBox, nbp);
        }

        TextView btn = goldButton("DOWNLOAD UPDATE v" + latestVersion);
        btn.setOnClickListener(v -> downloadApk());
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dip(52));
        bp.topMargin = dip(18);
        updateBlock.addView(btn, bp);

        root.addView(updateBlock, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private void showUpdateBanner(JSONObject app) {
        if (updateBanner != null || root == null) return;
        updateBanner = new LinearLayout(this);
        updateBanner.setOrientation(LinearLayout.HORIZONTAL);
        updateBanner.setGravity(Gravity.CENTER_VERTICAL);
        updateBanner.setPadding(dip(14), dip(9), dip(8), dip(9));
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(dip(0));
        bg.setColor(Color.parseColor("#14203F"));
        bg.setStroke(dip(1), Color.parseColor("#2C3C68"));
        updateBanner.setBackground(bg);

        TextView text = new TextView(this);
        text.setText("Playbeat Admin v" + latestVersion + " is available — tap to update");
        text.setTextColor(Color.parseColor("#D7DEFF"));
        text.setTextSize(11.5f);
        text.setLayoutParams(new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        text.setOnClickListener(v -> downloadApk());
        updateBanner.addView(text);

        TextView dismiss = new TextView(this);
        dismiss.setText("✕");
        dismiss.setTextColor(Color.parseColor("#8B93A7"));
        dismiss.setTextSize(13);
        dismiss.setPadding(dip(12), dip(6), dip(6), dip(6));
        dismiss.setOnClickListener(v -> updateBanner.setVisibility(View.GONE));
        updateBanner.addView(dismiss);

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dip(0);
        topBar.addView(updateBanner, 1, lp);
    }

    // =====================================================================
    // Session flow: biometric unlock → authenticated shell, or native login
    // =====================================================================

    private void startSessionFlow() {
        if (token == null || token.isEmpty()) {
            openLogin();
            return;
        }
        if (BiometricGate.available(this)) {
            showBiometricGate();
        } else {
            enterShell();
        }
    }

    private void openLogin() {
        Intent i = new Intent(this, LoginActivity.class);
        startActivityForResult(i, REQ_LOGIN);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        // File chooser (product image upload from gallery / files)
        if (requestCode == REQ_FILE_CHOOSER) {
            if (filePickerCallback != null) {
                Uri[] results = null;
                if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
                filePickerCallback.onReceiveValue(results);
                filePickerCallback = null;
            }
            return;
        }
        if (requestCode == REQ_POST_NOTIFICATIONS) {
            return; // user decision on notifications — non-blocking
        }
        if (requestCode == REQ_LOGIN) {
            if (resultCode == RESULT_OK && data != null) {
                token = data.getStringExtra("token");
                adminName = SecureStore.get(this, "admin_name");
                adminRole = SecureStore.get(this, "admin_role");
                wasBackgrounded = false;
                enterShell();
            } else {
                // Login cancelled → nothing to administrate
                finish();
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    private void showBiometricGate() {
        if (biometricOverlay != null && biometricOverlay.getParent() != null) return;
        biometricOverlay = new LinearLayout(this);
        biometricOverlay.setOrientation(LinearLayout.VERTICAL);
        biometricOverlay.setGravity(Gravity.CENTER);
        biometricOverlay.setBackgroundColor(Color.parseColor("#E8040816"));
        biometricOverlay.setPadding(dip(24), dip(24), dip(24), dip(24));

        TextView icon = new TextView(this);
        icon.setText("🔒");
        icon.setTextSize(40);
        icon.setGravity(Gravity.CENTER);

        TextView title = new TextView(this);
        title.setText("Playbeat Admin Locked");
        title.setTextColor(Color.WHITE);
        title.setTextSize(17);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, dip(10), 0, 0);

        TextView sub = new TextView(this);
        sub.setText("Unlock with your biometrics to continue");
        sub.setTextColor(Color.parseColor("#8B93A7"));
        sub.setTextSize(12);
        sub.setGravity(Gravity.CENTER);
        sub.setPadding(0, dip(4), 0, dip(14));

        biometricOverlay.addView(icon);
        biometricOverlay.addView(title);
        biometricOverlay.addView(sub);

        TextView usePassword = new TextView(this);
        usePassword.setText("Use password instead");
        usePassword.setTextColor(Color.parseColor("#FFC107"));
        usePassword.setTextSize(12.5f);
        usePassword.setTypeface(Typeface.DEFAULT_BOLD);
        usePassword.setPadding(0, dip(16), 0, dip(8));
        usePassword.setOnClickListener(v -> {
            removeBiometricOverlay();
            signOutLocal(false); // clear sealed session → native login (re-auth)
        });
        biometricOverlay.addView(usePassword);

        root.addView(biometricOverlay, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        BiometricGate.authenticate(this, "Unlock Playbeat Admin",
                adminName == null || adminName.isEmpty() ? "Administrator session" : adminName,
                new BiometricGate.Listener() {
                    @Override public void onSuccess() { runOnUiThread(() -> { removeBiometricOverlay(); enterShell(); }); }
                    @Override public void onFailure(String message) {
                        runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
                    }
                });
    }

    private void removeBiometricOverlay() {
        if (biometricOverlay != null && biometricOverlay.getParent() != null) {
            root.removeView(biometricOverlay);
        }
        biometricOverlay = null;
    }

    // =====================================================================
    // Shell construction
    // =====================================================================

    private void buildShell() {
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#050814"));

        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);

        // --- Top app bar ---
        topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setGravity(Gravity.CENTER_VERTICAL);
        topBar.setPadding(dip(14), dip(8), dip(10), dip(8));
        topBar.setBackgroundColor(Color.parseColor("#040816"));

        LinearLayout brandBox = new LinearLayout(this);
        brandBox.setOrientation(LinearLayout.HORIZONTAL);
        brandBox.setGravity(Gravity.CENTER_VERTICAL);
        brandBox.setLayoutParams(new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        statusDot = new TextView(this);
        statusDot.setText("●");
        statusDot.setTextColor(Color.parseColor("#64748B"));
        statusDot.setTextSize(11);
        statusDot.setPadding(0, 0, dip(7), 0);
        brandBox.addView(statusDot);

        TextView brand = new TextView(this);
        brand.setText("Playbeat Admin");
        brand.setTextColor(Color.WHITE);
        brand.setTextSize(15);
        brand.setTypeface(Typeface.DEFAULT_BOLD);
        brandBox.addView(brand);

        TextView roleChip = new TextView(this);
        roleChip.setText("  " + ("staff".equalsIgnoreCase(adminRole) ? "STAFF" : "SUPER ADMIN"));
        roleChip.setTextColor("staff".equalsIgnoreCase(adminRole)
                ? Color.parseColor("#7DB3F5") : Color.parseColor("#FFC107"));
        roleChip.setTextSize(9);
        roleChip.setTypeface(Typeface.DEFAULT_BOLD);
        brandBox.addView(roleChip);

        topBar.addView(brandBox);

        // notification bell
        FrameLayout bellWrap = new FrameLayout(this);
        TextView bell = new TextView(this);
        bell.setText("🔔");
        bell.setTextSize(16);
        bell.setPadding(dip(8), dip(6), dip(8), dip(6));
        bellWrap.addView(bell);
        notifBadge = new TextView(this);
        notifBadge.setText("");
        notifBadge.setTextColor(Color.WHITE);
        notifBadge.setTextSize(8.5f);
        notifBadge.setTypeface(Typeface.DEFAULT_BOLD);
        notifBadge.setGravity(Gravity.CENTER);
        GradientDrawable nb = new GradientDrawable();
        nb.setShape(GradientDrawable.OVAL);
        nb.setColor(Color.parseColor("#F43F5E"));
        notifBadge.setBackground(nb);
        notifBadge.setVisibility(View.GONE);
        FrameLayout.LayoutParams nbp = new FrameLayout.LayoutParams(dip(16), dip(16));
        nbp.gravity = Gravity.END | Gravity.TOP;
        notifBadge.setLayoutParams(nbp);
        bellWrap.addView(notifBadge);
        bell.setOnClickListener(v -> showNotificationsDialog());
        topBar.addView(bellWrap);

        column.addView(topBar, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        // --- offline banner ---
        offlineBanner = new LinearLayout(this);
        offlineBanner.setOrientation(LinearLayout.HORIZONTAL);
        offlineBanner.setGravity(Gravity.CENTER);
        offlineBanner.setPadding(dip(10), dip(6), dip(10), dip(6));
        offlineBanner.setBackgroundColor(Color.parseColor("#3A1219"));
        offlineBanner.setVisibility(View.GONE);
        TextView ob = new TextView(this);
        ob.setText("Offline — reconnecting…");
        ob.setTextColor(Color.parseColor("#FF9AA6"));
        ob.setTextSize(11);
        ob.setTypeface(Typeface.DEFAULT_BOLD);
        offlineBanner.addView(ob);
        column.addView(offlineBanner, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        // --- WebView + progress + error overlay ---
        FrameLayout webWrap = new FrameLayout(this);
        webWrap.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        webView = new WebView(this);
        webWrap.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        configureWebView();

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        FrameLayout.LayoutParams pb = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        pb.gravity = Gravity.TOP;
        progressBar.setLayoutParams(pb);
        progressBar.setMax(100);
        progressBar.getProgressDrawable().setColorFilter(
                Color.parseColor("#FFC107"), android.graphics.PorterDuff.Mode.SRC_IN);
        webWrap.addView(progressBar);

        webWrap.addView(buildErrorView());
        column.addView(webWrap);

        // --- Bottom navigation (native) ---
        column.addView(buildBottomNav(), new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dip(58)));

        root.addView(column, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // Network callback → offline banner + auto retry
        registerNetworkCallback();
    }

    private LinearLayout buildBottomNav() {
        LinearLayout nav = new LinearLayout(this);
        nav.setOrientation(LinearLayout.HORIZONTAL);
        nav.setGravity(Gravity.CENTER);
        nav.setBackgroundColor(Color.parseColor("#040816"));
        nav.setPadding(0, dip(6), 0, dip(4));

        nav.addView(navItem("▦", "Dashboard", "dashboard", false));
        nav.addView(navItem("⧉", "Orders", "orders", true));
        nav.addView(navItem("◈", "Products", "products", false));
        nav.addView(navItem("⋯", "More", null, false));
        return nav;
    }

    private LinearLayout navItem(String glyph, String label, String section, boolean withBadge) {
        final LinearLayout item = new LinearLayout(this);
        item.setOrientation(LinearLayout.VERTICAL);
        item.setGravity(Gravity.CENTER);
        item.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f));

        FrameLayout glyphWrap = new FrameLayout(this);
        TextView g = new TextView(this);
        g.setText(glyph);
        g.setTextColor(Color.parseColor("#8B93A7"));
        g.setTextSize(15);
        g.setGravity(Gravity.CENTER);
        glyphWrap.addView(g, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        if (withBadge) {
            ordersBadge = new TextView(this);
            ordersBadge.setTextColor(Color.WHITE);
            ordersBadge.setTextSize(8);
            ordersBadge.setTypeface(Typeface.DEFAULT_BOLD);
            ordersBadge.setGravity(Gravity.CENTER);
            GradientDrawable obg = new GradientDrawable();
            obg.setShape(GradientDrawable.OVAL);
            obg.setColor(Color.parseColor("#F59E0B"));
            ordersBadge.setBackground(obg);
            ordersBadge.setVisibility(View.GONE);
            FrameLayout.LayoutParams obp = new FrameLayout.LayoutParams(dip(15), dip(15));
            obp.gravity = Gravity.END | Gravity.TOP;
            ordersBadge.setLayoutParams(obp);
            glyphWrap.addView(ordersBadge);
        }

        TextView l = new TextView(this);
        l.setText(label);
        l.setTextColor(Color.parseColor("#8B93A7"));
        l.setTextSize(9.5f);
        l.setGravity(Gravity.CENTER);

        item.addView(glyphWrap, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        item.addView(l);

        item.setOnClickListener(v -> {
            if (section != null) {
                loadAdminSection(section);
            } else {
                showMoreDialog();
            }
        });
        return item;
    }

    private LinearLayout buildErrorView() {
        errorView = new LinearLayout(this);
        errorView.setOrientation(LinearLayout.VERTICAL);
        errorView.setGravity(Gravity.CENTER);
        errorView.setBackgroundColor(Color.parseColor("#050814"));
        errorView.setPadding(dip(28), dip(28), dip(28), dip(28));
        errorView.setVisibility(View.GONE);

        TextView title = new TextView(this);
        title.setText("Connection Lost");
        title.setTextColor(Color.WHITE);
        title.setTextSize(20);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);

        TextView msg = new TextView(this);
        msg.setText("Playbeat Admin could not reach the server.\nLoaded data is kept — press retry to reconnect.");
        msg.setTextColor(Color.parseColor("#8B93A7"));
        msg.setTextSize(13);
        msg.setGravity(Gravity.CENTER);
        msg.setPadding(0, dip(12), 0, dip(22));

        TextView retry = goldButton("RETRY CONNECTION");
        retry.setOnClickListener(v -> {
            errorView.setVisibility(View.GONE);
            progressBar.setVisibility(View.VISIBLE);
            webView.reload();
        });

        errorView.addView(title);
        errorView.addView(msg, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        errorView.addView(retry, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dip(48)));
        return errorView;
    }

    private TextView goldButton(String label) {
        TextView b = new TextView(this);
        b.setText(label);
        b.setTextColor(Color.parseColor("#040816"));
        b.setTextSize(13);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setGravity(Gravity.CENTER);
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(dip(14));
        bg.setColors(new int[]{0xFFFFD54F, 0xFFFFC107});
        bg.setOrientation(GradientDrawable.Orientation.TL_BR);
        b.setBackground(bg);
        return b;
    }

    // =====================================================================
    // WebView — the authenticated admin console
    // =====================================================================

    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadsImagesAutomatically(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setUserAgentString(s.getUserAgentString() + Api.UA_SUFFIX);

        // ---- pull-to-refresh (native, framework-only) ----
        final float[] touchStartY = {0f};
        final boolean[] refreshing = {false};
        webView.setOnTouchListener((v, ev) -> {
            switch (ev.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    touchStartY[0] = ev.getRawY();
                    break;
                case MotionEvent.ACTION_MOVE:
                    float dy = ev.getRawY() - touchStartY[0];
                    if (!refreshing[0] && dy > dip(120) && webView.getScrollY() <= 0) {
                        refreshing[0] = true;
                        progressBar.setVisibility(View.VISIBLE);
                        webView.reload();
                        mainHandler.postDelayed(() -> refreshing[0] = false, 1500L);
                    }
                    break;
                default:
                    break;
            }
            return false; // never consume — WebView keeps scrolling normally
        });

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                        String mimeType, long size) {
                enqueueDownload(url, mimeType);
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("https://" + HOST) || url.startsWith("http://" + HOST)) {
                    return false; // keep Playbeat traffic inside the secure shell
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (Exception ignored) {}
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                errorView.setVisibility(View.GONE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                injectRuntime(view);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        WebResourceError error) {
                if (request != null && request.isForMainFrame()) showErrorView();
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request,
                                            android.webkit.WebResourceResponse errorResponse) {
                if (request != null && request.isForMainFrame()
                        && errorResponse != null && errorResponse.getStatusCode() == 401) {
                    // session rejected by the backend → force re-auth
                    runOnUiThread(() -> sessionExpired("Your session has expired. Sign in again."));
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
                progressBar.setProgress(newProgress);
            }

            @Override
            public boolean onShowFileChooser(WebView view,
                                             ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (filePickerCallback != null) filePickerCallback.onReceiveValue(null);
                filePickerCallback = callback;
                try {
                    Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                    pick.addCategory(Intent.CATEGORY_OPENABLE);
                    pick.setType("*/*");
                    if (params != null && params.getAcceptTypes() != null
                            && params.getAcceptTypes().length > 0
                            && params.getAcceptTypes()[0] != null
                            && params.getAcceptTypes()[0].contains("image")) {
                        pick.setType("image/*");
                    }
                    startActivityForResult(Intent.createChooser(pick, "Select file"), REQ_FILE_CHOOSER);
                    return true;
                } catch (Exception e) {
                    filePickerCallback = null;
                    return false;
                }
            }
        });
    }

    /** Loads (or reloads) the authenticated admin console and seeds the session. */
    private void enterShell() {
        if (token == null || token.isEmpty()) { openLogin(); return; }
        seedSessionAndLoad();
        mainHandler.removeCallbacks(heartbeatTask);
        mainHandler.removeCallbacks(notifTask);
        sendHeartbeat();                       // register device immediately
        mainHandler.postDelayed(heartbeatTask, 60_000L);
        mainHandler.postDelayed(notifTask, 120_000L);
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    REQ_POST_NOTIFICATIONS);
        }
    }

    private void loadAdminSection(String section) {
        // hash deep-links are wired into the web admin (#orders, #products, …)
        webView.loadUrl(Api.BASE + "/admin#" + section);
        Toast.makeText(this, sectionTitle(section), Toast.LENGTH_SHORT).show();
    }

    private String sectionTitle(String section) {
        switch (section) {
            case "dashboard": return "Dashboard";
            case "orders": return "Orders & Fulfillment";
            case "products": return "Catalog Products";
            case "customers": return "Customers";
            case "staff": return "Staff Accounts";
            case "backup": return "Restore Points";
            case "mobileapp": return "Mobile App";
            case "profile": return "Profile Settings";
            case "analytics": return "Analytics & Traffic";
            case "cms": return "Website Builder CMS";
            case "support": return "Support Inbox";
            default: return section;
        }
    }

    /**
     * Seeds the web session before the console loads:
     *  1) adminToken cookie for playbeat.digital (server accepts cookie or bearer)
     *  2) localStorage `playbeat_admin_token` — the exact key the web admin reads
     * Then loads /admin. A runtime hook re-seeds if localStorage is ever cleared.
     */
    private void seedSessionAndLoad() {
        try {
            CookieManager cm = CookieManager.getInstance();
            cm.setAcceptCookie(true);
            cm.setAcceptThirdPartyCookies(webView, false);
            cm.setCookie("https://" + HOST, "adminToken=" + token + "; Path=/; Secure; Max-Age=604800");
            cm.flush();
        } catch (Exception e) {
            Log.w(TAG, "cookie seed failed", e);
        }
        if (!tokenSeeded) {
            tokenSeeded = true;
            loadAdminUrlWithSeed();
        } else {
            webView.loadUrl(Api.BASE + "/admin");
        }
    }

    private void loadAdminUrlWithSeed() {
        webView.loadDataWithBaseURL(Api.BASE + "/",
                "<html><body></body><script>" +
                        "try{localStorage.setItem('playbeat_admin_token','" + jsEsc(token) + "');" +
                        "localStorage.setItem('playbeat_admin_session','android-" + jsEsc(adminName == null ? "" : adminName) + "');" +
                        "window.location='https://" + HOST + "/admin';}catch(e){document.title='SEED_FAILED';}" +
                        "</script></html>",
                "text/html", "utf-8", Api.BASE + "/");
    }

    /** App identity + bottom-nav spacing + legacy JS heartbeat guard. */
    private void injectRuntime(WebView view) {
        String js = "(function(){" +
                "window.PLAYBEAT_ANDROID_APP={version:'" + BuildConfig.APP_VERSION +
                "',model:'" + jsEsc(SecureStore.deviceModel()) + "',android:'" +
                jsEsc(SecureStore.androidVersion()) + "',nativeShell:true};" +
                // bottom-nav breathing room so content is never covered
                "try{var st=document.getElementById('pb-android-pad');" +
                "if(!st){st=document.createElement('style');st.id='pb-android-pad';" +
                "st.textContent='body{padding-bottom:58px !important;}';document.head.appendChild(st);}}catch(e){}" +
                "})();" ;
        view.evaluateJavascript(js, null);
    }

    private static String jsEsc(String v) {
        if (v == null) return "";
        return v.replace("\\", "\\\\").replace("'", "\\'").replace("\"", "\\\"");
    }

    private int dip(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    private void showErrorView() {
        progressBar.setVisibility(View.GONE);
        errorView.setVisibility(View.VISIBLE);
    }

    // =====================================================================
    // Heartbeat — live device status + ops snapshot for badges
    // =====================================================================

    private void sendHeartbeat() {
        if (token == null || token.isEmpty()) return;
        JSONObject payload = new JSONObject();
        try {
            payload.put("deviceId", SecureStore.deviceId(this));
            payload.put("deviceModel", SecureStore.deviceModel());
            payload.put("androidVersion", SecureStore.androidVersion());
            payload.put("appVersion", BuildConfig.APP_VERSION);
        } catch (Exception ignored) {}

        Api.post("/api/admin/app/heartbeat", payload, token, result -> {
            if (result.code == 401) {
                runOnUiThread(() -> sessionExpired("Your session has expired. Sign in again."));
                return;
            }
            if (result.code == 403) {
                runOnUiThread(() -> sessionExpired(
                        "This device has been revoked by a super administrator."));
                return;
            }
            JSONObject body = Api.obj(result);
            JSONObject ops = body.optJSONObject("ops");
            final boolean online = result.ok();
            final int pending = ops == null ? 0 : ops.optInt("pendingOrders", 0);
            runOnUiThread(() -> {
                statusDot.setTextColor(Color.parseColor(online ? "#34D399" : "#F87171"));
                if (ordersBadge != null) {
                    if (pending > 0) {
                        ordersBadge.setText(String.valueOf(Math.min(pending, 99)));
                        ordersBadge.setVisibility(View.VISIBLE);
                    } else {
                        ordersBadge.setVisibility(View.GONE);
                    }
                }
            });
        });
    }

    private void sessionExpired(String message) {
        mainHandler.removeCallbacksAndMessages(null);
        signOutLocal(false);
        tokenSeeded = false;
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
        openLogin();
    }

    // =====================================================================
    // Notification feed (real backend data — orders, security, admins)
    // =====================================================================

    private void pollNotifications() {
        if (token == null || token.isEmpty()) return;
        Api.get("/api/admin/app/notifications", token, result -> {
            if (!result.ok()) return;
            JSONObject body = Api.obj(result);
            JSONObject summary = body.optJSONObject("summary");
            org.json.JSONArray items = body.optJSONArray("notifications");
            int unread = 0;
            if (items != null) {
                for (int i = 0; i < items.length(); i++) {
                    JSONObject n = items.optJSONObject(i);
                    if (n != null && !n.optBoolean("read", true)) unread++;
                }
            }
            final int badgeCount = unread;
            runOnUiThread(() -> {
                if (notifBadge != null) {
                    if (badgeCount > 0) {
                        notifBadge.setText(String.valueOf(Math.min(badgeCount, 9)));
                        notifBadge.setVisibility(View.VISIBLE);
                    } else {
                        notifBadge.setVisibility(View.GONE);
                    }
                }
            });
            // heads-up alert for fresh pending orders while the app is open
            if (items != null && items.length() > 0) {
                JSONObject first = items.optJSONObject(0);
                if (first != null && "order".equals(first.optString("category"))
                        && first.optBoolean("read", true) == false) {
                    int h = first.optString("id").hashCode();
                    if (h != lastNotifOrderIdHash) {
                        lastNotifOrderIdHash = h;
                        showHeadsUp("New order received",
                                first.optString("body", "Open the Orders tab to review."));
                    }
                }
            }
        });
    }

    private void showHeadsUp(String title, String text) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        Notification n = null;
        if (Build.VERSION.SDK_INT >= 26) {
            n = new Notification.Builder(this, "admin-alerts")
                    .setContentTitle(title).setContentText(text)
                    .setSmallIcon(android.R.drawable.stat_notify_chat)
                    .setAutoCancel(true).build();
        } else {
            n = new Notification.Builder(this)
                    .setContentTitle(title).setContentText(text)
                    .setSmallIcon(android.R.drawable.stat_notify_chat)
                    .setAutoCancel(true).build();
        }
        try {
            nm.notify(1001, n);
        } catch (Exception ignored) {}
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel("admin-alerts",
                    "Admin Alerts", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Orders, security events and administrative alerts");
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private void showNotificationsDialog() {
        Api.get("/api/admin/app/notifications", token, result -> {
            CharSequence[] rows;
            StringBuilder sb = new StringBuilder();
            JSONObject body = Api.obj(result);
            org.json.JSONArray items = body.optJSONArray("notifications");
            if (items == null || items.length() == 0) {
                runOnUiThread(() -> Toast.makeText(this,
                        "No recent notifications — all clear.", Toast.LENGTH_SHORT).show());
                return;
            }
            for (int i = 0; i < Math.min(items.length(), 8); i++) {
                JSONObject n = items.optJSONObject(i);
                if (n == null) continue;
                String cat = n.optString("category", "info");
                String icon = cat.equals("order") ? "🛒" : cat.equals("security") ? "🛡"
                        : cat.equals("user") ? "👤" : "⚙";
                sb.append(icon).append("  ").append(n.optString("title")).append("\n")
                        .append("    ").append(n.optString("body")).append("\n\n");
            }
            final String content = sb.toString().trim();
            runOnUiThread(() -> new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
                    .setTitle("🔔 Notifications")
                    .setMessage(content)
                    .setPositiveButton("Open Orders", (d, w) -> loadAdminSection("orders"))
                    .setNegativeButton("Close", null)
                    .show());
        });
    }

    // =====================================================================
    // "More" sheet — the full admin surface, one tap away
    // =====================================================================

    private void showMoreDialog() {
        String[][] items = {
                {"Customers", "customers"},
                {"Staff Accounts", "staff"},
                {"Analytics & Traffic", "analytics"},
                {"Website Builder CMS", "cms"},
                {"Restore Points", "backup"},
                {"Mobile App", "mobileapp"},
                {"Profile Settings", "profile"},
                {"Support Inbox", "support"},
                {"Full Dashboard", null},
                {"Sign Out", "signout"},
        };
        String[] labels = new String[items.length];
        for (int i = 0; i < items.length; i++) labels[i] = items[i][0];

        new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
                .setTitle("More — " + (adminName == null || adminName.isEmpty() ? "Administrator" : adminName))
                .setItems(labels, (d, which) -> {
                    String action = items[which][1];
                    if ("signout".equals(action)) {
                        confirmSignOut();
                    } else if (action == null) {
                        loadAdminSection("dashboard");
                    } else {
                        loadAdminSection(action);
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void confirmSignOut() {
        new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
                .setTitle("Sign out of Playbeat Admin?")
                .setMessage("Your session will be securely erased from this device.")
                .setPositiveButton("Sign Out", (d, w) -> signOutLocal(true))
                .setNegativeButton("Cancel", null)
                .show();
    }

    /** Secure logout — wipes every sealed value, notifies the backend. */
    private void signOutLocal(boolean notifyServer) {
        if (notifyServer && token != null) {
            Api.post("/api/auth/admin/logout", new JSONObject(), token, null);
        }
        SecureStore.wipe(this);
        token = null;
        adminName = "";
        adminRole = "";
        tokenSeeded = false;
        mainHandler.removeCallbacks(heartbeatTask);
        mainHandler.removeCallbacks(notifTask);
        openLogin();
    }

    // =====================================================================
    // Network awareness + pull-to-refresh + downloads
    // =====================================================================

    private void registerNetworkCallback() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return;
        try {
            cm.registerDefaultNetworkCallback(new ConnectivityManager.NetworkCallback() {
                @Override public void onAvailable(Network network) {
                    runOnUiThread(() -> {
                        offlineBanner.setVisibility(View.GONE);
                        if (errorView.getVisibility() == View.VISIBLE && !updateRequiredFlag) {
                            errorView.setVisibility(View.GONE);
                            webView.reload();
                        }
                    });
                }
                @Override public void onLost(Network network) {
                    runOnUiThread(() -> offlineBanner.setVisibility(View.VISIBLE));
                }
            });
        } catch (Exception e) {
            Log.w(TAG, "network callback unavailable", e);
        }
    }

    private void enqueueDownload(String url, String mimeType) {
        try {
            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
            req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            String name = url.substring(url.lastIndexOf('/') + 1);
            if (name.isEmpty()) name = "playbeat-download";
            req.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, name);
            req.addRequestHeader("User-Agent", webView.getSettings().getUserAgentString());
            DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            if (dm == null) return;
            long id = dm.enqueue(req);
            Toast.makeText(this, "Downloading " + name + "…", Toast.LENGTH_SHORT).show();

            if (name.endsWith(".apk")) {
                // open the installer once the APK lands
                mainHandler.postDelayed(() -> {
                    try {
                        Uri uri = dm.getUriForDownloadedFile(id);
                        if (uri != null) {
                            Intent install = new Intent(Intent.ACTION_VIEW);
                            install.setDataAndType(uri, "application/vnd.android.package-archive");
                            install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                                    | Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(install);
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "installer open failed", e);
                    }
                }, 4000L);
            }
        } catch (Exception e) {
            Log.w(TAG, "download enqueue failed", e);
            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) {}
        }
    }

    private void downloadApk() {
        if (latestApkUrl.isEmpty()) {
            Toast.makeText(this, "No update package is available yet.", Toast.LENGTH_SHORT).show();
            return;
        }
        String url = latestApkUrl.startsWith("http") ? latestApkUrl : Api.BASE + latestApkUrl;
        enqueueDownload(url, "application/vnd.android.package-archive");
    }

    // =====================================================================
    // Navigation + pull-to-refresh gesture
    // =====================================================================

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        return super.onTouchEvent(event);
    }

    @Override
    public void onBackPressed() {
        if (updateRequiredFlag) {
            // the gate cannot be bypassed — double-back only exits
            if (System.currentTimeMillis() - lastBackPress < 2000) {
                super.onBackPressed();
                return;
            }
            lastBackPress = System.currentTimeMillis();
            Toast.makeText(this, "Update required before the app can be used", Toast.LENGTH_SHORT).show();
            return;
        }
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        if (System.currentTimeMillis() - lastBackPress < 2000) {
            super.onBackPressed();
            return;
        }
        lastBackPress = System.currentTimeMillis();
        Toast.makeText(this, "Press back again to exit Playbeat Admin", Toast.LENGTH_SHORT).show();
    }
}
