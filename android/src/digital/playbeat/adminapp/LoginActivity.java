package digital.playbeat.adminapp;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.InputType;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

/**
 * LoginActivity — native enterprise sign-in for the Playbeat Admin Android app.
 *
 * - EXACTLY the same credentials as the web admin panel (super admin or staff).
 * - The backend (/api/auth/admin/login) is the single source of truth:
 *   customer accounts are rejected server-side, suspended staff are blocked,
 *   and staff tokens carry their real restricted role.
 * - On success the session is sealed with AES-256-GCM (Android Keystore key)
 *   and handed to MainActivity which seeds the authenticated web session.
 */
public class LoginActivity extends Activity {

    private EditText emailField;
    private EditText passwordField;
    private TextView errorText;
    private Button signInBtn;
    private ProgressBar spinner;
    private LinearLayout rootWarning;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Screenshot / recents-thumbnail protection (enterprise requirement)
        getWindow().setFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE,
                android.view.WindowManager.LayoutParams.FLAG_SECURE);
        getWindow().setStatusBarColor(Color.parseColor("#040816"));
        getWindow().setNavigationBarColor(Color.parseColor("#040816"));

        setContentView(buildUi());

        if (Security.isDeviceRooted()) rootWarning.setVisibility(View.VISIBLE);
    }

    // =====================================================================
    // UI construction (programmatic — Obsidian Navy enterprise theme)
    // =====================================================================

    private View buildUi() {
        FrameLayout frame = new FrameLayout(this);
        frame.setBackgroundColor(Color.parseColor("#040816"));

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        frame.addView(scroll, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER_HORIZONTAL);
        col.setPadding(dip(28), dip(48), dip(28), dip(32));
        scroll.addView(col, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        // --- Logo ---
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        logo.setLayoutParams(new LinearLayout.LayoutParams(dip(84), dip(84)));
        logo.setPadding(dip(8), dip(8), dip(8), dip(8));
        GradientDrawable logoBg = new GradientDrawable();
        logoBg.setShape(GradientDrawable.RECTANGLE);
        logoBg.setCornerRadius(dip(24));
        logoBg.setColor(Color.parseColor("#0A122E"));
        logoBg.setStroke(dip(1), Color.parseColor("#3D3D3D"));
        logo.setBackground(logoBg);
        col.addView(logo);

        // --- Titles ---
        col.addView(title("Playbeat Admin", 23, "#FFFFFF", dip(18), 0));
        col.addView(title("ENTERPRISE ADMINISTRATION CONSOLE", 10, "#8B93A7", 0, 0));

        // --- Root warning (conditional) ---
        rootWarning = new LinearLayout(this);
        rootWarning.setOrientation(LinearLayout.HORIZONTAL);
        rootWarning.setGravity(Gravity.CENTER_VERTICAL);
        rootWarning.setPadding(dip(12), dip(10), dip(12), dip(10));
        rootWarning.setVisibility(View.GONE);
        GradientDrawable warnBg = new GradientDrawable();
        warnBg.setCornerRadius(dip(12));
        warnBg.setColor(Color.parseColor("#2A1F04"));
        warnBg.setStroke(dip(1), Color.parseColor("#7A5C0A"));
        rootWarning.setBackground(warnBg);
        TextView warnIcon = new TextView(this);
        warnIcon.setText("⚠");
        warnIcon.setTextColor(Color.parseColor("#FFC107"));
        warnIcon.setTextSize(15);
        TextView warnText = new TextView(this);
        warnText.setText("  Root access detected — this device may not be trusted for administrative access.");
        warnText.setTextColor(Color.parseColor("#FFD54F"));
        warnText.setTextSize(11.5f);
        rootWarning.addView(warnIcon);
        rootWarning.addView(warnText);
        LinearLayout.LayoutParams wp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        wp.topMargin = dip(20);
        col.addView(rootWarning, wp);

        // --- Card ---
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dip(18), dip(22), dip(18), dip(22));
        GradientDrawable cardBg = new GradientDrawable();
        cardBg.setCornerRadius(dip(20));
        cardBg.setColor(Color.parseColor("#0A122E"));
        cardBg.setStroke(dip(1), Color.parseColor("#232C4D"));
        card.setBackground(cardBg);
        LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        cardLp.topMargin = dip(18);
        col.addView(card, cardLp);

        TextView loginAs = new TextView(this);
        loginAs.setText("Administrator Sign In");
        loginAs.setTextColor(Color.parseColor("#FFFFFF"));
        loginAs.setTextSize(15);
        loginAs.setTypeface(Typeface.DEFAULT_BOLD);
        loginAs.setGravity(Gravity.CENTER);
        card.addView(loginAs);

        TextView loginSub = new TextView(this);
        loginSub.setText("Super Admin & Staff accounts only — same credentials as the web panel");
        loginSub.setTextColor(Color.parseColor("#8B93A7"));
        loginSub.setTextSize(11);
        loginSub.setGravity(Gravity.CENTER);
        loginSub.setPadding(0, dip(4), 0, 0);
        card.addView(loginSub);

        // --- Email ---
        card.addView(fieldLabel("Email", dip(20)));
        emailField = darkInput("admin@playbeat.digital", false);
        card.addView(emailField);

        // --- Password + show/hide ---
        card.addView(fieldLabel("Password", dip(14)));
        FrameLayout pwWrap = new FrameLayout(this);
        passwordField = darkInput("••••••••••", true);
        pwWrap.addView(passwordField, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        final TextView toggle = new TextView(this);
        toggle.setText("SHOW");
        toggle.setTextColor(Color.parseColor("#FFC107"));
        toggle.setTextSize(11);
        toggle.setTypeface(Typeface.DEFAULT_BOLD);
        toggle.setPadding(dip(12), dip(12), dip(12), dip(12));
        FrameLayout.LayoutParams tp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        tp.gravity = Gravity.END | Gravity.CENTER_VERTICAL;
        toggle.setOnClickListener(v -> {
            boolean showing = passwordField.getInputType()
                    != (InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
            passwordField.setInputType(showing
                    ? (InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD)
                    : (InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD));
            toggle.setText(showing ? "SHOW" : "HIDE");
            passwordField.setSelection(passwordField.getText().length());
        });
        pwWrap.addView(toggle, tp);
        card.addView(pwWrap);

        // --- Remember device ---
        CheckBox remember = new CheckBox(this);
        remember.setText("Remember this device (biometric unlock next time)");
        remember.setTextColor(Color.parseColor("#8B93A7"));
        remember.setTextSize(11.5f);
        remember.setChecked(true);
        remember.setButtonTintList(android.content.res.ColorStateList.valueOf(Color.parseColor("#FFC107")));
        LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        rp.topMargin = dip(14);
        card.addView(remember, rp);

        // --- Error ---
        errorText = new TextView(this);
        errorText.setTextColor(Color.parseColor("#FF6B81"));
        errorText.setTextSize(12);
        errorText.setGravity(Gravity.CENTER);
        errorText.setVisibility(View.GONE);
        errorText.setPadding(0, dip(10), 0, 0);
        card.addView(errorText);

        // --- Sign in button ---
        signInBtn = new Button(this);
        signInBtn.setText("SIGN IN SECURELY");
        signInBtn.setTextColor(Color.parseColor("#040816"));
        signInBtn.setTextSize(13.5f);
        signInBtn.setAllCaps(false);
        signInBtn.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable btnBg = new GradientDrawable();
        btnBg.setCornerRadius(dip(14));
        btnBg.setColors(new int[]{0xFFFFD54F, 0xFFFFC107});
        btnBg.setOrientation(GradientDrawable.Orientation.TL_BR);
        signInBtn.setBackground(btnBg);
        signInBtn.setOnClickListener(v -> attemptLogin(remember.isChecked()));
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dip(50));
        bp.topMargin = dip(18);
        card.addView(signInBtn, bp);

        // --- Spinner overlay ---
        spinner = new ProgressBar(this);
        spinner.setVisibility(View.GONE);
        FrameLayout.LayoutParams sp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        sp.gravity = Gravity.CENTER;
        frame.addView(spinner, sp);

        // --- Footer ---
        TextView footer = new TextView(this);
        footer.setText("Playbeat Digital Private Limited · v" + BuildConfig.APP_VERSION
                + "\nSessions are encrypted with the Android Keystore");
        footer.setTextColor(Color.parseColor("#4A5170"));
        footer.setTextSize(9.5f);
        footer.setGravity(Gravity.CENTER);
        footer.setPadding(0, dip(22), 0, 0);
        col.addView(footer);

        return frame;
    }

    private TextView title(String text, float size, String color, int top, int bottom) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextColor(Color.parseColor(color));
        t.setTextSize(size);
        if (size > 12) t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setGravity(Gravity.CENTER);
        t.setLetterSpacing(-0.01f);
        t.setPadding(0, top, 0, bottom);
        return t;
    }

    private TextView fieldLabel(String text, int top) {
        TextView t = new TextView(this);
        t.setText(text.toUpperCase());
        t.setTextColor(Color.parseColor("#8B93A7"));
        t.setTextSize(10);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setLetterSpacing(0.08f);
        t.setPadding(dip(4), top, 0, dip(6));
        return t;
    }

    private EditText darkInput(String hint, boolean password) {
        EditText e = new EditText(this);
        e.setHint(hint);
        e.setTextColor(Color.parseColor("#FFFFFF"));
        e.setHintTextColor(Color.parseColor("#4A5170"));
        e.setTextSize(14);
        e.setInputType(password
                ? (InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD)
                : (InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS));
        e.setSingleLine(true);
        e.setPadding(dip(14), dip(14), dip(14), dip(14));
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(dip(12));
        bg.setColor(Color.parseColor("#060B1E"));
        bg.setStroke(dip(1), Color.parseColor("#232C4D"));
        e.setBackground(bg);
        return e;
    }

    private int dip(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    // =====================================================================
    // Authentication
    // =====================================================================

    private void attemptLogin(boolean rememberDevice) {
        final String email = emailField.getText().toString().trim().toLowerCase();
        final String password = passwordField.getText().toString();

        errorText.setVisibility(View.GONE);
        if (TextUtils.isEmpty(email) || TextUtils.isEmpty(password)) {
            showError("Enter your administrator email and password.");
            return;
        }

        setLoading(true);
        JSONObject payload = new JSONObject();
        try {
            payload.put("email", email);
            payload.put("password", password);
        } catch (Exception ignored) {}

        Api.post("/api/auth/admin/login", payload, null, result -> runOnUiThread(() -> {
            setLoading(false);
            if (result.code == -1) {
                showError("Cannot reach the server. Check your internet connection and try again.");
                return;
            }
            JSONObject body = Api.obj(result);
            if (result.code == 401) {
                showError(Api.optStr(body, "error") == null || Api.optStr(body, "error").isEmpty()
                        ? "Invalid administrator credentials." : Api.optStr(body, "error"));
                return;
            }
            if (result.code == 403) {
                showError(Api.optStr(body, "error").isEmpty()
                        ? "This account is not authorized for administrative access."
                        : Api.optStr(body, "error"));
                return;
            }
            if (!result.ok()) {
                showError(Api.optStr(body, "error").isEmpty()
                        ? "Sign-in failed (" + result.code + "). Try again."
                        : Api.optStr(body, "error"));
                return;
            }

            String token = Api.optStr(body, "token");
            JSONObject admin = body.optJSONObject("admin");
            if (token.isEmpty()) {
                showError("Sign-in response was invalid. Please try again.");
                return;
            }

            // Seal the session (AES-256-GCM, Keystore key)
            SecureStore.put(this, "admin_token", token);
            SecureStore.put(this, "admin_email", Api.optStr(admin, "email").isEmpty() ? email : Api.optStr(admin, "email"));
            SecureStore.put(this, "admin_name", Api.optStr(admin, "name"));
            SecureStore.put(this, "admin_role", Api.optStr(admin, "role"));
            SecureStore.put(this, "remember_device", rememberDevice ? "1" : "0");
            SecureStore.put(this, "last_login_at", String.valueOf(System.currentTimeMillis()));

            // Device registration payload for the heartbeat (model + android + app version)
            Toast.makeText(this, "Welcome, " + (Api.optStr(admin, "name").isEmpty()
                    ? "Administrator" : Api.optStr(admin, "name")), Toast.LENGTH_SHORT).show();

            Intent data = new Intent();
            data.putExtra("token", token);
            setResult(RESULT_OK, data);
            finish();
        }));
    }

    private void setLoading(boolean loading) {
        signInBtn.setEnabled(!loading);
        signInBtn.setText(loading ? "VERIFYING…" : "SIGN IN SECURELY");
        spinner.setVisibility(loading ? View.VISIBLE : View.GONE);
        emailField.setEnabled(!loading);
        passwordField.setEnabled(!loading);
    }

    private void showError(String msg) {
        errorText.setText(msg);
        errorText.setVisibility(View.VISIBLE);
    }
}
