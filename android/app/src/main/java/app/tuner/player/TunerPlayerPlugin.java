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

import org.json.JSONObject;

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
        final String[] urls, titles;
        final int[] nums;
        final long[] starts;
        Playlist(String key, String[] urls, String[] titles, int[] nums, long[] starts) { this.key = key; this.urls = urls; this.titles = titles; this.nums = nums; this.starts = starts; }
    }
    static Playlist playlist;

    @PluginMethod
    public void play(PluginCall call) {
        String key = call.getString("key", "");
        JSArray entries = call.getArray("entries");
        // The app sends a big channel list once; after that, playing from the same list sends only its key.
        if (entries == null) {
            if (playlist == null || key.isEmpty() || !key.equals(playlist.key)) { call.reject("Send the list again.", "LIST"); return; }
        } else {
            int n = entries.length();
            if (n == 0) { call.reject("Nothing to play."); return; }
            String[] urls = new String[n], titles = new String[n];
            int[] nums = new int[n];
            long[] starts = new long[n];
            try {
                for (int i = 0; i < n; i++) {
                    JSONObject e = entries.getJSONObject(i);
                    urls[i] = e.getString("url");
                    titles[i] = e.optString("title", "");
                    nums[i] = e.optInt("num", 0);
                    starts[i] = (long) e.optDouble("startAt", 0);
                }
            } catch (Exception e) { call.reject("Bad playlist: " + e.getMessage()); return; }
            playlist = new Playlist(key, urls, titles, nums, starts);
        }
        session++;
        Intent i = new Intent(getContext(), PlayerActivity.class);
        i.putExtra("mode", call.getString("mode", "vod"));
        i.putExtra("index", call.getInt("index", 0));
        i.putExtra("ua", call.getString("ua", ""));
        i.putExtra("session", session);
        if (PlayerActivity.current != null) PlayerActivity.current.finish();
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

    @PluginMethod
    public void command(PluginCall call) {
        JSArray args = call.getArray("args");
        PlayerActivity p = PlayerActivity.current;
        try {
            String what = p != null && args != null ? args.getString(0) : "";
            if ("show-text".equals(what)) {
                String text = args.getString(1);
                int ms = args.length() > 2 ? args.getInt(2) : 4000;
                p.runOnUiThread(() -> p.showText(text, ms));
            } else if ("stats".equals(what)) {
                String json = args.optString(1, "");
                p.runOnUiThread(() -> p.showStats(json));
            } else if ("linked".equals(what)) {
                boolean on = args.optBoolean(1, false);
                p.runOnUiThread(() -> p.setGameLinked(on));
            } else if ("sync-plays".equals(what)) {
                String json = args.getString(1);
                p.runOnUiThread(() -> p.askSync(json));
            }
        } catch (Exception ignored) {}
        call.resolve();
    }

    /** Downloads a new Tuner APK and hands it to Android's installer. */
    @PluginMethod
    public void installUpdate(PluginCall call) {
        String url = call.getString("url");
        if (url == null) { call.reject("No update link."); return; }
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= 26 && !ctx.getPackageManager().canRequestPackageInstalls()) {
            Intent s = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + ctx.getPackageName()));
            s.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(s);
            call.reject("Allow Tuner to install updates, then press Update again.");
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
