package app.tuner.player;

import android.app.UiModeManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Bridge between the app's JavaScript and the native player and updater. Mirrors the desktop app's mpv interface. */
@CapacitorPlugin(name = "TunerPlayer")
public class TunerPlayerPlugin extends Plugin {
    private static TunerPlayerPlugin instance;
    private static int session = 0;

    @Override
    public void load() { instance = this; }

    static void emit(JSObject e) {
        if (instance != null) instance.notifyListeners("event", e, true);
    }

    // ---------- UI sounds ----------
    // The app's tv/sounds/*.wav, played by SoundPool on the low-latency (game) path: a loaded clip starts within a few ms,
    // where the WebView's audio adds a buffer of its own on top of the TV's. sfxLoad answers once they're all loaded.
    private android.media.SoundPool ui;
    private final java.util.Map<String, Integer> uiIds = new java.util.HashMap<>();
    private final java.util.Set<Integer> uiReady = java.util.Collections.synchronizedSet(new java.util.HashSet<>());
    private int uiPending = 0;
    private PluginCall uiLoadCall;

    @PluginMethod
    public void sfxLoad(PluginCall call) {
        JSArray names = call.getArray("names");
        synchronized (uiIds) {
            if (ui == null) {
                ui = new android.media.SoundPool.Builder().setMaxStreams(4).setAudioAttributes(new android.media.AudioAttributes.Builder()
                        .setUsage(android.media.AudioAttributes.USAGE_GAME).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build()).build();
                ui.setOnLoadCompleteListener((pool, id, status) -> {
                    if (status == 0) uiReady.add(id);
                    synchronized (uiIds) { if (--uiPending <= 0 && uiLoadCall != null) { uiLoadCall.resolve(uiResult()); uiLoadCall = null; } }
                });
            }
            try {
                for (int i = 0; names != null && i < names.length(); i++) {
                    String n = names.getString(i);
                    if (uiIds.containsKey(n)) continue;
                    try {
                        // (not closed here: SoundPool reads it after load() returns)
                        android.content.res.AssetFileDescriptor fd = getContext().getAssets().openFd("public/tv/sounds/" + n + ".wav");
                        uiIds.put(n, ui.load(fd, 1));
                        uiPending++;
                    } catch (Exception ignored) {}
                }
            } catch (Exception ignored) {}
            if (uiPending <= 0) call.resolve(uiResult()); else uiLoadCall = call;
        }
    }
    private JSObject uiResult() { JSObject r = new JSObject(); r.put("loaded", uiReady.size()); return r; }

    @PluginMethod
    public void sfxPlay(PluginCall call) {
        Integer id = uiIds.get(call.getString("name", ""));
        boolean ok = ui != null && id != null && uiReady.contains(id);
        if (ok) {
            float v = Math.max(0f, Math.min(1f, call.getFloat("gain", 1f)));
            float rate = Math.max(0.5f, Math.min(2f, call.getFloat("rate", 1f)));
            ui.play(id, v, v, 1, 0, rate);
        }
        JSObject r = new JSObject(); r.put("ok", ok); call.resolve(r);
    }

    @PluginMethod
    public void info(PluginCall call) {
        JSObject r = new JSObject();
        UiModeManager ui = (UiModeManager) getContext().getSystemService(Context.UI_MODE_SERVICE);
        PackageManager pm = getContext().getPackageManager();
        // Some TV makers don't report television mode, so also go by the TV features and the lack of a touchscreen.
        boolean tv = (ui != null && ui.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION)
                || pm.hasSystemFeature(PackageManager.FEATURE_LEANBACK)
                || pm.hasSystemFeature("android.hardware.type.television")
                || !pm.hasSystemFeature(PackageManager.FEATURE_TOUCHSCREEN);
        r.put("tv", tv);
        // The TV's own "System sounds" switch: the app's sounds start off when it's off (until chosen in Account).
        try { r.put("systemSounds", Settings.System.getInt(getContext().getContentResolver(), Settings.System.SOUND_EFFECTS_ENABLED, 1) == 1); } catch (Exception ignored) {}
        try {
            PackageInfo p = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            r.put("version", p.versionName);
            r.put("code", Build.VERSION.SDK_INT >= 28 ? p.getLongVersionCode() : p.versionCode);
        } catch (Exception ignored) {}
        call.resolve(r);
    }

    /** The playlist the player works through. Kept here rather than in the Intent, which can't carry thousands of channels. */
    static final class Playlist {
        final String key;
        final List<PlayerActivity.Entry> entries;
        Playlist(String key, List<PlayerActivity.Entry> entries) { this.key = key; this.entries = entries; }
    }
    static Playlist playlist;
    /** Commands that arrived before the player opened, for the session being started; it takes them in onCreate. */
    static final java.util.List<String[]> early = new java.util.ArrayList<>();
    static int session() { return session; }

    @PluginMethod
    public void play(PluginCall call) {
        String key = call.getString("key", "");
        JSArray entries = call.getArray("entries");
        // The app sends a big channel list once; after that, playing from the same list sends only its key.
        if (entries == null) {
            if (playlist == null || key.isEmpty() || !key.equals(playlist.key)) { call.reject("Send the list again.", "LIST"); return; }
        } else {
            if (entries.length() == 0) { call.reject("Nothing to play."); return; }
            try { playlist = new Playlist(key, PlayerActivity.parse(entries, call.getString("tpl", ""))); }
            catch (Exception e) { call.reject("Bad playlist: " + e.getMessage()); return; }
        }
        session++;
        Intent i = new Intent(getContext(), PlayerActivity.class);
        i.putExtra("mode", call.getString("mode", "vod"));
        i.putExtra("index", call.getInt("index", 0));
        i.putExtra("ua", call.getString("ua", ""));
        i.putExtra("ring", call.getString("ring", ""));
        i.putExtra("upNext", call.getBoolean("upNext", true));
        i.putExtra("sounds", call.getString("sounds", "on"));
        i.putExtra("sub", call.getString("sub", ""));
        Boolean bug = call.getBoolean("scoreBug");
        if (bug != null) i.putExtra("scoreBug", bug.booleanValue());
        i.putExtra("session", session);
        i.addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
        if (PlayerActivity.current != null) PlayerActivity.current.finish();
        synchronized (early) { early.clear(); }
        PlayerActivity.launching = true;
        getActivity().startActivity(i);
        JSObject r = new JSObject();
        r.put("ok", true);
        r.put("session", session);
        call.resolve(r);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        PlayerActivity p = PlayerActivity.current;
        if (p != null) p.runOnUiThread(p::finish);
        call.resolve();
    }

    /** What the app tells the open player: ["meta", json], ["game", json], ["ring", json], ["show-text", text], … */
    @PluginMethod
    public void command(PluginCall call) {
        JSArray args = call.getArray("args");
        PlayerActivity p = PlayerActivity.current;
        if (args != null && args.length() > 0) {
            String what = args.optString(0, "");
            String arg = args.length() > 1 ? args.optString(1, "") : "";
            if (p != null && p.session() == session) p.runOnUiThread(() -> p.command(what, arg));
            // The player is still starting (play() answers right after asking for it): keep what it must not miss.
            else if (PlayerActivity.launching && "queue".equals(what)) synchronized (early) { early.add(new String[] { what, arg }); }
        }
        call.resolve();
    }

    /** Downloads a new airglow APK and hands it to Android's installer. */
    @PluginMethod
    public void installUpdate(PluginCall call) {
        String url = call.getString("url");
        if (url == null) { call.reject("No update link."); return; }
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= 26 && !ctx.getPackageManager().canRequestPackageInstalls()) {
            Intent s = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + ctx.getPackageName()));
            s.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(s);
            call.reject("Allow airglow to install updates, then press Update again.");
            return;
        }
        new Thread(() -> {
            try {
                File out = new File(ctx.getCacheDir(), "tuner-update.apk");
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setInstanceFollowRedirects(true);
                c.setConnectTimeout(20000);
                c.setReadTimeout(60000);
                int code = c.getResponseCode();
                // GitHub sends release downloads through a redirect to another host.
                for (int hops = 0; (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) && hops < 5; hops++) {
                    String next = c.getHeaderField("Location");
                    c.disconnect();
                    c = (HttpURLConnection) new URL(next).openConnection();
                    c.setConnectTimeout(20000);
                    c.setReadTimeout(60000);
                    code = c.getResponseCode();
                }
                if (code != 200) throw new Exception("The download answered " + code + ".");
                long total = c.getContentLengthLong();
                try (InputStream in = c.getInputStream(); OutputStream o = new FileOutputStream(out)) {
                    byte[] buf = new byte[64 * 1024];
                    long got = 0;
                    int r, lastPct = -1;
                    while ((r = in.read(buf)) > 0) {
                        o.write(buf, 0, r);
                        got += r;
                        int pct = total > 0 ? (int) (got * 100 / total) : 0;
                        if (pct != lastPct && pct % 5 == 0) {
                            lastPct = pct;
                            JSObject e = new JSObject();
                            e.put("percent", pct);
                            notifyListeners("update", e);
                        }
                    }
                }
                Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", out);
                Intent install = new Intent(Intent.ACTION_VIEW);
                install.setDataAndType(uri, "application/vnd.android.package-archive");
                install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(install);
                call.resolve();
            } catch (Exception e) {
                call.reject("Could not download the update: " + e.getMessage());
            }
        }).start();
    }
}
