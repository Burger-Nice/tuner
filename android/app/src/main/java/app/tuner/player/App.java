package app.tuner.player;

import android.app.Application;

/** The app's process: starts error reports before any screen (design/ui-v1/error-reports/SPEC.md D5), then looks at how
 *  the last run ended. */
public class App extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        Reports.start(this);
        if (Reports.started) new Thread(() -> Reports.lastExit(this), "reports-exit").start();
    }
}
