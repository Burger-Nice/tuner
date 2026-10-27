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
    public void load() {
        instance = this;
        String u = getContext().getSharedPreferences("player", Context.MODE_PRIVATE).getString("speedUrl", "");
        if (u.startsWith("http")) Diag.speedUrl = u;
    }

    static void emit(JSObject e) {
        if (instance != null) instance.notifyListeners("event", e, true);
    }

    // ---------- UI sounds ----------
    // The app's tv/sounds/*.wav, played by SoundPool on the low-latency (game) path: a loaded clip starts within a few ms,
    // where the WebView's audio adds a buffer of its own on top of the TV's. sfxLoad answers once they're all loaded,
    // with the names that loaded (the app plays any other one itself).
    private android.media.SoundPool ui;
    private final java.util.Map<String, Integer> uiIds = new java.util.HashMap<>();
    private final java.util.Set<Integer> uiReady = java.util.Collections.synchronizedSet(new java.util.HashSet<>());
    private int uiPending = 0;
    private final List<PluginCall> uiLoadCalls = new java.util.ArrayList<>();

    @PluginMethod
    public void sfxLoad(PluginCall call) {
        JSArray names = call.getArray("names");
        synchronized (uiIds) {
            if (ui == null) {
                ui = new android.media.SoundPool.Builder().setMaxStreams(4).setAudioAttributes(new android.media.AudioAttributes.Builder()
                        .setUsage(android.media.AudioAttributes.USAGE_GAME).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build()).build();
                ui.setOnLoadCompleteListener((pool, id, status) -> {
                    if (status == 0) uiReady.add(id);
                    synchronized (uiIds) { if (--uiPending <= 0) { for (PluginCall c : uiLoadCalls) c.resolve(uiResult()); uiLoadCalls.clear(); } }
                });
            }
            try {
                for (int i = 0; names != null && i < names.length(); i++) {
                    String n = names.getString(i);
                    if (uiIds.containsKey(n)) continue;
                    try (android.content.res.AssetFileDescriptor fd = getContext().getAssets().openFd("public/tv/sounds/" + n + ".wav")) {
                        uiIds.put(n, ui.load(fd, 1));   // (SoundPool keeps its own copy of the descriptor)
                        uiPending++;
                    } catch (Exception ignored) {}
                }
            } catch (Exception ignored) {}
            if (uiPending <= 0) call.resolve(uiResult()); else uiLoadCalls.add(call);
        }
    }
    private JSObject uiResult() {
        JSArray loaded = new JSArray();
        for (java.util.Map.Entry<String, Integer> e : uiIds.entrySet()) if (uiReady.contains(e.getValue())) loaded.put(e.getKey());
        JSObject r = new JSObject();
        r.put("loaded", loaded);
        return r;
    }

    @Override
    protected void handleOnDestroy() {
        synchronized (uiIds) { if (ui != null) { ui.release(); ui = null; uiIds.clear(); uiReady.clear(); } }
        PhonePage.stop();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void sfxPlay(PluginCall call) {
        Integer id;
        synchronized (uiIds) { id = uiIds.get(call.getString("name", "")); }
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
        // The player speaks the replay protocol (design/ui-v1/catchup/PORT-NATIVE.md): the app sends mode 'replay'.
        r.put("replay", true);
        // The quality check and "plays on this TV" (probe, probeCancel, playable), and downloaded subtitles drawn by the
        // player (the subs command): design/ui-v1/subtitles/PORT-NATIVE.md 0.
        r.put("probe", true);
        r.put("subs", 1);
        // Add-ons (design/ui-v1/addons/PORT-NATIVE.md 0): the entry fields and the copy messages, the home-network phone
        // page, the safe launcher for another app's link, and the TV's own region for countryWhitelist
        r.put("addons", true);
        r.put("phonePage", true);
        r.put("openApp", true);
        String region = java.util.Locale.getDefault().getCountry();
        if (region != null && region.matches("[A-Za-z]{2,3}")) r.put("region", region);
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
    /** A replay's start payload (design/ui-v1/catchup/PORT-NATIVE.md 1), for the player to read in onCreate. */
    static String replayJson = "";
    /** Commands that arrived before the player opened, for the session being started; it takes them in onCreate. */
    static final java.util.List<String[]> early = new java.util.ArrayList<>();
    static int session() { return session; }

    // ---------- the quality check (design/ui-v1/subtitles/PORT-NATIVE.md 1) ----------
    @PluginMethod
    public void probe(PluginCall call) {
        String url = call.getString("url", "");
        if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) { call.reject("No link to check."); return; }
        JSObject result = new JSObject();
        // never while something plays: 'unavailable' keeps it queued until the player closes (probes.js)
        if (PlayerActivity.current != null || PlayerActivity.launching) {
            result.put("id", call.getString("id", ""));
            result.put("status", "unavailable");
            result.put("why", "playing");
            call.resolve(result);
            return;
        }
        java.util.Map<String, String> headers = new java.util.HashMap<>();
        JSObject h = call.getObject("headers");
        if (h != null) for (java.util.Iterator<String> it = h.keys(); it.hasNext(); ) { String k = it.next(); headers.put(k, h.optString(k)); }
        if (!Probe.start(getContext(), call.getString("id", ""), url, headers, call::resolve)) call.reject("busy", "busy");
    }
    @PluginMethod
    public void probeCancel(PluginCall call) { Probe.cancelRunning("cancelled"); call.resolve(); }
    /** "Plays on this TV" for stored formats, with the audio route as it is now; opens no stream. */
    @PluginMethod
    public void playable(PluginCall call) {
        JSArray copies = call.getArray("copies");
        Context ctx = getContext();
        new Thread(() -> {
            try { call.resolve(Probe.playable(ctx, copies)); }
            catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
        }).start();
    }

    @PluginMethod
    public void play(PluginCall call) {
        Probe.cancelRunning("cancelled");   // the check's socket is closed before the stream opens
        String key = call.getString("key", "");
        JSArray entries = call.getArray("entries");
        boolean replay = "replay".equals(call.getString("mode", ""));
        if (replay) {
            JSObject r = call.getObject("replay");
            if (r == null) { call.reject("Nothing to replay."); return; }
            replayJson = r.toString();
        }
        // The app sends a big channel list once; after that, playing from the same list sends only its key.
        else if (entries == null) {
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
        JSObject subs = call.getObject("subs");   // the subtitle settings (PORT-NATIVE.md 2.1)
        if (subs != null) i.putExtra("subs", subs.toString());
        i.putExtra("api", call.getString("api", ""));   // the provider's player_api.php, for the account check
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
            else if (PlayerActivity.launching && ("queue".equals(what) || "subs".equals(what) || "versions".equals(what) || "queue-next".equals(what))) synchronized (early) { early.add(new String[] { what, arg }); }
        }
        call.resolve();
    }

    /** Settings from the release's android.json: speedUrl, where the speed test downloads from (kept across launches). */
    @PluginMethod
    public void config(PluginCall call) {
        String u = call.getString("speedUrl", "");
        if (u != null && (u.startsWith("https://") || u.startsWith("http://"))) {
            Diag.speedUrl = u;
            getContext().getSharedPreferences("player", Context.MODE_PRIVATE).edit().putString("speedUrl", u).apply();
        }
        call.resolve();
    }

    // ---------- Account > Provider > Check the connection (design/ui-v1/diagnosis/SPEC.md 7, 10.3) ----------
    // The five links in order, each reported as it answers ("check" events), then everything at once. The app draws the
    // sheet and its verdict. The last channel is sampled for 5 s only on a 2+ stream account (or when asked), and then
    // the check waits until the provider has let that stream go.
    private volatile int checkRun;
    private static final class Stopped extends RuntimeException {}
    private void step(int run, String name, JSObject data, JSObject all) {
        if (run != checkRun) throw new Stopped();
        all.put(name, data);
        JSObject e = new JSObject();
        e.put("step", name);
        e.put("data", data);
        notifyListeners("check", e);
    }
    @PluginMethod
    public void connectionCheck(PluginCall call) {
        String api = call.getString("api", ""), url = call.getString("url", "");
        boolean sample = Boolean.TRUE.equals(call.getBoolean("sample", false));
        int run = ++checkRun;
        Context ctx = getContext();
        new Thread(() -> {
            JSObject all = new JSObject();
            try {
                JSObject tv = new JSObject();
                tv.put("plays", Diag.decoders(ctx));
                step(run, "tv", tv, all);
                JSObject net = new JSObject();
                android.net.ConnectivityManager cm = (android.net.ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
                android.net.Network n = cm == null ? null : cm.getActiveNetwork();
                android.net.NetworkCapabilities nc = n == null ? null : cm.getNetworkCapabilities(n);
                boolean wifi = nc != null && nc.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI);
                net.put("type", n == null ? "none" : wifi ? "wifi" : nc != null && nc.hasTransport(android.net.NetworkCapabilities.TRANSPORT_ETHERNET) ? "cable" : "other");
                int[] w = wifi ? Diag.wifi(ctx) : new int[] { Integer.MIN_VALUE, 0 };
                net.put("bars", Diag.bars(w[0]));
                net.put("link", w[1]);
                step(run, "net", net, all);
                long[] in = Diag.internet(2000);
                boolean weak = wifi && Diag.bars(w[0]) > 0 && Diag.bars(w[0]) <= 2;
                if (in[0] == -1 && weak) in = Diag.internet(5000);   // (review 3, M3-2)
                JSObject inet = new JSObject();
                inet.put("code", in[0]);
                inet.put("ms", in[1]);
                step(run, "internet", inet, all);
                Diag.Probe sp = new Diag.Probe();
                if (in[0] == 204) Diag.speedTest(ctx, sp); else sp.speedState = 3;
                JSObject speed = new JSObject();
                speed.put("state", sp.speedState);
                speed.put("mbps", Math.round(sp.speed * 10) / 10.0);
                speed.put("full", sp.speedFull);
                speed.put("link", Math.max(w[1], sp.linkMax));
                step(run, "speed", speed, all);
                android.net.Uri u = android.net.Uri.parse(url.isEmpty() ? api : url);
                JSObject prov = new JSObject();
                if (u.getHost() != null) {
                    long[] h = Diag.hostCheck(u.getHost(), u.getPort() > 0 ? u.getPort() : "https".equalsIgnoreCase(u.getScheme()) ? 443 : 80, in[0] == -1 && weak ? 5000 : 2000);
                    prov.put("host", h[0]);
                    prov.put("ms", h[1]);
                }
                int before = -1, max = -1;
                if (!api.isEmpty()) {
                    Object[] a = Diag.account(api, 3000);
                    prov.put("acct", (int) a[0]);
                    if ((int) a[0] == 1) {
                        org.json.JSONObject ui = (org.json.JSONObject) a[2];
                        prov.put("status", ui.optString("status", ""));
                        prov.put("exp", ui.optLong("exp_date", 0));
                        before = ui.optInt("active_cons", -1);
                        max = ui.optInt("max_connections", -1);
                        prov.put("active", before);
                        prov.put("max", max);
                    }
                }
                step(run, "provider", prov, all);
                JSObject ch = new JSObject();
                if (url.isEmpty()) ch.put("state", "none");
                else if (!sample && max >= 0 && max < 2) ch.put("state", "one-stream");   // (S14: on a 1-stream account only when asked)
                else {
                    ch.put("state", "run");
                    step(run, "channel", ch, all);
                    ch = sampleStream(url);
                    Diag.closedAt = android.os.SystemClock.elapsedRealtime();
                    step(run, "channel", ch, all);
                    // until the provider has let that stream go (polling the account every 5 s, up to 60 s)
                    if (!api.isEmpty() && before >= 0) {
                        JSObject rel = new JSObject();
                        rel.put("state", "waiting");
                        step(run, "release", rel, all);
                        long until = android.os.SystemClock.elapsedRealtime() + 60000;
                        boolean freed = false;
                        while (!freed && android.os.SystemClock.elapsedRealtime() < until) {
                            Object[] a = Diag.account(api, 3000);
                            freed = (int) a[0] == 1 && ((org.json.JSONObject) a[2]).optInt("active_cons", 99) <= before;
                            if (!freed) { Thread.sleep(5000); if (run != checkRun) throw new Stopped(); }
                        }
                        rel = new JSObject();
                        rel.put("state", freed ? "done" : "gave-up");
                        step(run, "release", rel, all);
                    }
                }
                if (!"run".equals(ch.optString("state")) && !all.has("channel")) step(run, "channel", ch, all);
                call.resolve(all);
            } catch (Stopped e) {
                JSObject r = new JSObject();
                r.put("stopped", true);
                call.resolve(r);
            } catch (Exception e) {
                call.resolve(all);
            }
        }).start();
    }
    @PluginMethod
    public void connectionCheckStop(PluginCall call) { checkRun++; call.resolve(); }
    /** The last channel's stream for 5 s: what arrives per second (from the last 4 s, past the start). */
    private static JSObject sampleStream(String url) {
        JSObject r = new JSObject();
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(url).openConnection();
            c.setConnectTimeout(4000);
            c.setReadTimeout(4000);
            int code = c.getResponseCode();
            r.put("code", code);
            if (code >= 400) { r.put("state", "fail"); return r; }
            InputStream in = c.getInputStream();
            byte[] buf = new byte[64 * 1024];
            long t0 = android.os.SystemClock.elapsedRealtime(), got = 0, got1 = -1, t1 = 0;
            int k;
            while ((k = in.read(buf)) > 0) {
                got += k;
                long t = android.os.SystemClock.elapsedRealtime() - t0;
                if (got1 < 0 && t >= 1000) { got1 = got; t1 = t; }
                if (t >= 5000) break;
            }
            long t = android.os.SystemClock.elapsedRealtime() - t0;
            double secs = got1 >= 0 ? (t - t1) / 1000.0 : t / 1000.0;
            r.put("mbps", Math.round((got1 >= 0 ? got - got1 : got) * 8 / Math.max(0.2, secs) / 1e5) / 10.0);
            r.put("state", "ok");
        } catch (Exception e) {
            r.put("state", "fail");
            r.put("code", -1);
        } finally { if (c != null) c.disconnect(); }
        return r;
    }

    // ---------- Send a link from your phone (design/ui-v1/addons/PORT-NATIVE.md 5) ----------
    /** Starts the page on the TV's home-network address (or swaps its code): { address: "192.168.1.23:8790" }. */
    @PluginMethod
    public void startPhonePage(PluginCall call) {
        String token = call.getString("token", ""), code = call.getString("code", "");
        Integer port = call.getInt("port", 8790);
        Context ctx = getContext();
        new Thread(() -> {
            try {
                String address = PhonePage.start(ctx, token, code, port == null ? 8790 : port, (e) -> notifyListeners("phone", e));
                JSObject r = new JSObject();
                r.put("address", address);
                call.resolve(r);
            } catch (Exception e) { call.reject("The TV couldn't open its page."); }
        }).start();
    }
    @PluginMethod
    public void stopPhonePage(PluginCall call) { PhonePage.stop(); call.resolve(); }

    // ---------- Watch in another app, trailers (design/ui-v1/addons/SPEC.md 5.6, PORT-NATIVE.md 6) ----------
    /** Opens another app's link the way Chrome treats an untrusted intent: { ok } (false when nothing on the TV takes it). */
    @PluginMethod
    public void openApp(PluginCall call) {
        Intent i = Launch.safeIntent(call.getString("uri", ""), getContext().getPackageName());
        JSObject r = new JSObject();
        if (i == null) { r.put("ok", false); r.put("why", "refused"); call.resolve(r); return; }
        try {
            if (getActivity() != null) getActivity().startActivity(i); else { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); getContext().startActivity(i); }
            r.put("ok", true);
        } catch (Exception e) {   // ActivityNotFoundException (the app isn't on this TV), SecurityException
            r.put("ok", false);
            r.put("why", "missing");
        }
        call.resolve(r);
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
