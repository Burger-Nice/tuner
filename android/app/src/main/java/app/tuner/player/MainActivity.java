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
        // The page is full screen and always moving by transforms (rows sliding in, the guide scrolling): let the WebView
        // raster the parts just outside the screen ahead of time, so a row that slides in is drawn already (Android's
        // advice for a WebView that is visible and animating).
        preRaster(true);
        // If the TV runs low on memory and kills the web page, reload it instead of letting Android close the
        // whole app (and any game playing in the full-screen player).
        getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // error reports: the page died (the open "reloads by itself" item): a crash or a low-memory kill, and the memory
                try { Reports.webviewGone(MainActivity.this, detail.didCrash(), detail.rendererPriorityAtExit()); } catch (Throwable ignored) {}
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
            // ...but hidden behind the player the page needs no tiles drawn ahead: let them go while he watches (the
            // renderer was killed for memory behind the player once, AIRGLOW-3). Back on when the app is in front again.
            preRaster(false);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        preRaster(true);
    }

    private void preRaster(boolean on) {
        WebView wv = getBridge() != null ? getBridge().getWebView() : null;
        if (wv == null) return;   // (set every time: after a recreate() the new WebView starts with it off)
        wv.getSettings().setOffscreenPreRaster(on);
        Reports.preRaster = on;
    }
}
