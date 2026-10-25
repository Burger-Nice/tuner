package app.tuner.player;

import android.os.Bundle;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TunerPlayerPlugin.class);
        super.onCreate(savedInstanceState);
        // If the TV runs low on memory and kills the web page, reload it instead of letting Android close the
        // whole app (and any game playing in the full-screen player).
        getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                runOnUiThread(MainActivity.this::recreate);
                return true;
            }
        });
    }

    @Override
    public void onPause() {
        super.onPause();
        // While the full-screen player is up, keep the app running underneath so it can
        // send scores and save progress.
        if (PlayerActivity.launching || PlayerActivity.current != null) {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().onResume();
                getBridge().getWebView().resumeTimers();
            }
        }
    }
}
