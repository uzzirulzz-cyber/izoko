package digital.playbeat.adminapp;

import android.app.Application;

/** Application entry — initializes the context holder used by security checks. */
public class AdminApp extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        Security.AppContextHolder.init(this);
    }
}
