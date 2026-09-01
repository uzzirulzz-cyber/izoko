package digital.playbeat.adminapp;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Playbeat Admin — official Android client for the Playbeat admin dashboard.
 *
 * Security model (mirrors the web admin at https://playbeat.digital/admin):
 *   - Only SUPER ADMIN and STAFF accounts can sign in (enforced server-side
 *     by /api/auth admin login + requireAdmin on every /api/admin route).
 *   - Same email + password as the web login. No separate app accounts.
 *   - Staff tokens carry role "staff" — restricted access identical to web.
 *   - While signed in, the app sends a live heartbeat (every 60s) to
 *     /api/admin/app/heartbeat so the web "Mobile App" panel shows live status.
 *   - A super admin can revoke a device from the panel; revoked devices are
 *     rejected by the backend immediately.
 */
public class MainActivity extends Activity {

    private static final String ADMIN_URL = "https://playbeat.digital/admin/login";
    private static final String APP_VERSION = "1.0.0";
    private static final String HOST = "playbeat.digital";

    private WebView webView;
    private FrameLayout rootLayout;
    private LinearLayout errorView;
    private ProgressBar progressBar;
    private long lastBackPress = 0L;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.parseColor("#040816"));
        getWindow().setNavigationBarColor(Color.parseColor("#040816"));

        rootLayout = new FrameLayout(this);
        rootLayout.setBackgroundColor(Color.parseColor("#050814"));

        webView = new WebView(this);
        FrameLayout.LayoutParams webParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
        webView.setLayoutParams(webParams);
        webView.setBackgroundColor(Color.parseColor("#050814"));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUserAgentString(
                settings.getUserAgentString() + " PlaybeatAdminApp/" + APP_VERSION);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("https://" + HOST) || url.startsWith("http://" + HOST)) {
                    return false; // keep Playbeat traffic inside the app
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (Exception ignored) {
                }
                return true; // mailto:, tel:, wa.me and other apps handle these
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
                if (request != null && request.isForMainFrame()) {
                    showError();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
                progressBar.setProgress(newProgress);
            }
        });

        // Gold top progress bar
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        FrameLayout.LayoutParams barParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        barParams.gravity = Gravity.TOP;
        progressBar.setLayoutParams(barParams);
        progressBar.setMax(100);
        progressBar.getProgressDrawable().setColorFilter(
                Color.parseColor("#FFC107"), PorterDuff.Mode.SRC_IN);

        rootLayout.addView(webView);
        rootLayout.addView(progressBar);
        rootLayout.addView(buildErrorView());

        setContentView(rootLayout);
        progressBar.setVisibility(View.VISIBLE);
        webView.loadUrl(ADMIN_URL);
    }

    /** Native offline screen with one-tap retry. */
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
        title.setTextSize(21);
        title.setGravity(Gravity.CENTER);

        TextView msg = new TextView(this);
        msg.setText("Playbeat Admin could not reach the server.\nCheck your internet connection and try again.");
        msg.setTextColor(Color.parseColor("#94A3B8"));
        msg.setTextSize(14);
        msg.setGravity(Gravity.CENTER);
        msg.setPadding(0, dip(16), 0, dip(28));

        Button retry = new Button(this);
        retry.setText("Retry Connection");
        retry.setTextColor(Color.parseColor("#040816"));
        retry.setAllCaps(false);
        retry.getBackground().setColorFilter(
                Color.parseColor("#FFC107"), PorterDuff.Mode.SRC_IN);
        retry.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                errorView.setVisibility(View.GONE);
                progressBar.setVisibility(View.VISIBLE);
                webView.reload();
            }
        });

        LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        retryParams.gravity = Gravity.CENTER_HORIZONTAL;

        errorView.addView(title);
        errorView.addView(msg, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        errorView.addView(retry, retryParams);
        return errorView;
    }

    private void showError() {
        progressBar.setVisibility(View.GONE);
        errorView.setVisibility(View.VISIBLE);
    }

    /**
     * Injects the app identity flag + live heartbeat loop into every finished page.
     * The heartbeat only fires when an admin/staff token exists in localStorage,
     * i.e. only after a successful super admin / staff login.
     */
    private void injectRuntime(WebView view) {
        String model = Build.MANUFACTURER + " " + Build.MODEL;
        String androidVer = Build.VERSION.RELEASE;
        String js = "(function(){" +
                "window.PLAYBEAT_ANDROID_APP={version:'" + APP_VERSION +
                "',model:'" + jsEsc(model) + "',android:'" + jsEsc(androidVer) + "'};" +
                "try{" +
                "var K='playbeat_app_device_id';var d=localStorage.getItem(K);" +
                "if(!d){d='pb-and-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);" +
                "localStorage.setItem(K,d);}" +
                "var DEV='" + jsEsc(model) + "';var AV='" + jsEsc(androidVer) + "';" +
                "function beat(){try{var t=localStorage.getItem('playbeat_admin_token');" +
                "if(!t)return;" +
                "fetch('/api/admin/app/heartbeat',{method:'POST'," +
                "headers:{'Content-Type':'application/json','Authorization':'Bearer '+t}," +
                "body:JSON.stringify({deviceId:d,deviceModel:DEV,androidVersion:AV," +
                "appVersion:'" + APP_VERSION + "'})});}catch(e){}}" +
                "if(!window.__pbBeat){window.__pbBeat=1;beat();setInterval(beat,60000);}" +
                "}catch(e){}" +
                "})();";
        view.evaluateJavascript(js, null);
    }

    /** Minimal JS string escaping for device strings. */
    private static String jsEsc(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("'", "\\'").replace("\"", "\\\"");
    }

    private int dip(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onBackPressed() {
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
