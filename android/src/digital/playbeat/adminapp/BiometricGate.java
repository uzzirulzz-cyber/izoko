package digital.playbeat.adminapp;

import android.app.Activity;
import android.os.Build;
import android.util.Log;

import java.util.concurrent.Executor;

/**
 * BiometricGate — device-unlock protection for a persisted admin session.
 *
 * Framework-only implementation:
 *  - API 28+: android.hardware.biometrics.BiometricPrompt (BIOMETRIC_WEAK)
 *  - API 24–27: android.hardware.fingerprint.FingerprintManager
 *
 * If no biometric hardware / enrollment exists the gate is skipped —
 * the session is then protected by the device lockscreen expectation and
 * the 7-day server-side token lifetime.
 */
public final class BiometricGate {

    private static final String TAG = "BiometricGate";

    public interface Listener {
        void onSuccess();
        void onFailure(String message);
    }

    private BiometricGate() {}

    /** True when the device can show a biometric prompt right now. */
    public static boolean available(Activity activity) {
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                return Api30Impl.canAuth(activity);
            } else if (Build.VERSION.SDK_INT >= 28) {
                return Api28Impl.canAuth(activity);
            } else if (Build.VERSION.SDK_INT >= 23) {
                return Api23Impl.canAuth(activity);
            }
        } catch (Throwable t) {
            Log.w(TAG, "availability check failed", t);
        }
        return false;
    }

    public static void authenticate(Activity activity, String title, String subtitle, Listener listener) {
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                Api30Impl.authenticate(activity, title, subtitle, listener);
            } else if (Build.VERSION.SDK_INT >= 28) {
                Api28Impl.authenticate(activity, title, subtitle, listener);
            } else if (Build.VERSION.SDK_INT >= 23) {
                Api23Impl.authenticate(activity, title, subtitle, listener);
            } else {
                listener.onSuccess();
            }
        } catch (Throwable t) {
            Log.e(TAG, "authenticate failed", t);
            listener.onFailure("Biometric unlock unavailable on this device.");
        }
    }

    // ===== API 30+ (explicit authenticator flags + BiometricManager) =====


    private static final class Api30Impl {
        static boolean canAuth(Activity a) {
            android.hardware.biometrics.BiometricManager bm =
                    a.getSystemService(android.hardware.biometrics.BiometricManager.class);
            return bm != null && bm.canAuthenticate(
                    android.hardware.biometrics.BiometricManager.Authenticators.BIOMETRIC_WEAK)
                    == android.hardware.biometrics.BiometricManager.BIOMETRIC_SUCCESS;
        }

        static void authenticate(Activity a, String title, String sub, Listener l) {
            Executor exec = a.getMainExecutor();
            android.hardware.biometrics.BiometricPrompt prompt =
                    new android.hardware.biometrics.BiometricPrompt.Builder(a)
                            .setTitle(title)
                            .setSubtitle(sub)
                            .setNegativeButton("Use password instead", exec,
                                    (dialog, which) -> l.onFailure("Unlock cancelled"))
                            .setAllowedAuthenticators(
                                    android.hardware.biometrics.BiometricManager.Authenticators.BIOMETRIC_WEAK)
                            .build();
            prompt.authenticate(new android.os.CancellationSignal(), exec,
                    new android.hardware.biometrics.BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(
                                android.hardware.biometrics.BiometricPrompt.AuthenticationResult result) {
                            l.onSuccess();
                        }

                        @Override
                        public void onAuthenticationError(int code, CharSequence errString) {
                            l.onFailure(errString == null ? "Unlock cancelled" : errString.toString());
                        }
                    });
        }
    }

    // ===== API 28–29 =====


    private static final class Api28Impl {
        static boolean canAuth(Activity a) {
            android.hardware.biometrics.BiometricManager bm =
                    a.getSystemService(android.hardware.biometrics.BiometricManager.class);
            return bm != null
                    && bm.canAuthenticate() == android.hardware.biometrics.BiometricManager.BIOMETRIC_SUCCESS;
        }

        static void authenticate(Activity a, String title, String sub, Listener l) {
            android.hardware.biometrics.BiometricPrompt prompt =
                    new android.hardware.biometrics.BiometricPrompt.Builder(a)
                            .setTitle(title)
                            .setSubtitle(sub)
                            .setNegativeButton("Use password instead",
                                    a.getMainExecutor(), (dialog, which) -> l.onFailure("Unlock cancelled"))
                            .build();
            prompt.authenticate(new android.os.CancellationSignal(), a.getMainExecutor(),
                    new android.hardware.biometrics.BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(
                                android.hardware.biometrics.BiometricPrompt.AuthenticationResult result) {
                            l.onSuccess();
                        }

                        @Override
                        public void onAuthenticationError(int code, CharSequence errString) {
                            l.onFailure(errString == null ? "Unlock cancelled" : errString.toString());
                        }
                    });
        }
    }

    // ===== API 23–27 (FingerprintManager) =====


    private static final class Api23Impl {
        static boolean canAuth(Activity a) {
            android.hardware.fingerprint.FingerprintManager fm =
                    a.getSystemService(android.hardware.fingerprint.FingerprintManager.class);
            return fm != null && fm.isHardwareDetected() && fm.hasEnrolledFingerprints();
        }

        static void authenticate(final Activity a, String title, String sub, final Listener l) {
            android.hardware.fingerprint.FingerprintManager fm =
                    a.getSystemService(android.hardware.fingerprint.FingerprintManager.class);
            if (fm == null) { l.onSuccess(); return; }
            android.os.CancellationSignal signal = new android.os.CancellationSignal();
            fm.authenticate(null, signal, 0,
                    new android.hardware.fingerprint.FingerprintManager.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(
                                android.hardware.fingerprint.FingerprintManager.AuthenticationResult result) {
                            l.onSuccess();
                        }

                        @Override
                        public void onAuthenticationError(int code, CharSequence errString) {
                            l.onFailure(errString == null ? "Unlock cancelled" : errString.toString());
                        }

                        @Override
                        public void onAuthenticationFailed() {
                            l.onFailure("Fingerprint not recognized — try again");
                        }
                    }, null);
            // fallback hint if the hardware dialog is unavailable
            android.widget.Toast.makeText(a, sub, android.widget.Toast.LENGTH_SHORT).show();
        }
    }
}
