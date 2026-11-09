package app.tuner.player;

import android.app.ActivityManager;
import android.app.ApplicationExitInfo;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Process;
import android.os.SystemClock;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import io.sentry.Breadcrumb;
import io.sentry.Hint;
import io.sentry.Sentry;
import io.sentry.SentryEvent;
import io.sentry.SentryLevel;
import io.sentry.android.core.SentryAndroid;
import io.sentry.protocol.App;
import io.sentry.protocol.Contexts;
import io.sentry.protocol.Device;
import io.sentry.protocol.Message;
import io.sentry.protocol.OperatingSystem;
import io.sentry.protocol.SentryException;
import io.sentry.protocol.SentryStackFrame;
import io.sentry.protocol.SentryStackTrace;

/**
 * Error reports from the TV's native side (design/ui-v1/error-reports/SPEC.md D5): Sentry started from {@link App}
 * before any screen, only when the build has an address and reports are on. Every report is rebuilt from an allowlist;
 * an exception's message is kept only for the JVM's own types (they name code), everything else becomes a reason code
 * or its class name, so no link, host or secret can leave the TV. The JS side has its own rules (report-scrub.js).
 */
public final class Reports {
    private Reports() {}

    static final String PREFS = "reports";
    static volatile boolean started;
    static volatile String screen = "";
    static volatile int heapMb = -1;
    static volatile String lastCause = "";   // the player's last diagnosis, its id only (info().lastCause)
    static int recreates;
    /** MainActivity's pre-drawing of off-screen tiles: on while the app is in front, off behind the player. */
    static volatile boolean preRaster;
    /** What's playing now, as safe facts (formats, how the sound is sent out, whether it resumed partway): Account's
     *  Send a report now carries them (info().lastPlay), for problems no error reports, like sound out of sync. */
    static final java.util.Map<String, Object> lastPlay = new java.util.concurrent.ConcurrentHashMap<>();
    static void playFact(String k, Object v) { if (k != null && v != null) { Object s = safeFact(v); if (s != null) lastPlay.put(k, s); } }
    static String encodingName(int e) {
        switch (e) {
            case androidx.media3.common.C.ENCODING_AC3: return "ac3";
            case androidx.media3.common.C.ENCODING_E_AC3: return "eac3";
            case androidx.media3.common.C.ENCODING_E_AC3_JOC: return "eac3-joc";
            case androidx.media3.common.C.ENCODING_AC4: return "ac4";
            case androidx.media3.common.C.ENCODING_DTS: return "dts";
            case androidx.media3.common.C.ENCODING_DTS_HD: return "dts-hd";
            case androidx.media3.common.C.ENCODING_DOLBY_TRUEHD: return "truehd";
            case androidx.media3.common.C.ENCODING_PCM_16BIT: return "pcm16";
            case androidx.media3.common.C.ENCODING_PCM_FLOAT: return "pcmfloat";
            default: return "enc-" + e;
        }
    }

    // ---------- start (App.onCreate) ----------
    static void start(Context ctx) {
        String dsn = BuildConfig.REPORTS_DSN;
        if (dsn == null || dsn.isEmpty() || !ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("on", true)) return;
        try {
            SentryAndroid.init(ctx, o -> {
                o.setDsn(dsn);
                String v = "0.0.0";
                try { v = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0).versionName; } catch (Exception ignored) {}
                o.setRelease("airglow@" + v);
                if (!BuildConfig.GIT_SHA.isEmpty()) o.setDist(BuildConfig.GIT_SHA);
                o.setEnvironment(BuildConfig.REPORTS_TEST ? "test" : BuildConfig.REPORTS_ENV);
                o.setSendClientReports(false);
                o.setEnableAutoSessionTracking(false);
                o.setSendDefaultPii(false);
                o.setAttachStacktrace(false);
                o.setAttachThreads(false);
                o.setAttachScreenshot(false);
                o.setAttachViewHierarchy(false);
                o.setAttachAnrThreadDump(false);
                o.setEnableActivityLifecycleBreadcrumbs(false);
                o.setEnableAppLifecycleBreadcrumbs(false);
                o.setEnableAppComponentBreadcrumbs(false);
                o.setEnableSystemEventBreadcrumbs(false);
                o.setEnableNetworkEventBreadcrumbs(false);
                o.setEnableUserInteractionBreadcrumbs(false);
                o.setEnableAutoActivityLifecycleTracing(false);
                o.setEnableFramesTracking(false);
                o.setMaxBreadcrumbs(20);
                o.setMaxCacheItems(10);
                o.setBeforeBreadcrumb((b, hint) -> "note".equals(b.getCategory()) ? b : null);
                o.setBeforeSend((event, hint) -> {
                    try {
                        SentryEvent out = prepare(event);
                        if (out == null) return null;
                        return BuildConfig.REPORTS_TEST || allow(ctx, fingerprintKey(out)) ? out : null;
                    } catch (Throwable t) { return null; }   // if the rules themselves fail, nothing is sent
                });
            });
            Sentry.configureScope(s -> { s.setTag("app", "tv"); s.setTag("side", "native"); });
            started = true;
        } catch (Throwable ignored) {}
    }

    /** The switch (Account › App), from JS at every start and on each change: off stops at once and clears the queue. */
    static void setOn(Context ctx, boolean on) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (p.getBoolean("on", true) != on) p.edit().putBoolean("on", on).apply();
        if (!on && started) {
            started = false;
            String dir = null;
            try { dir = Sentry.getCurrentScopes().getOptions().getCacheDirPath(); } catch (Throwable ignored) {}
            try { Sentry.close(); } catch (Throwable ignored) {}
            if (dir != null) deleteAll(new File(dir));
        }
    }
    private static void deleteAll(File f) {
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteAll(k);
        //noinspection ResultOfMethodCallIgnored
        f.delete();
    }

    static void setScreen(String s) {
        if (s == null) return;
        screen = code(s);
        if (started) Sentry.configureScope(sc -> sc.setTag("screen", screen));
    }

    // ---------- notes and problems ----------
    static void note(String word, Map<String, Object> data) {
        if (!started) return;
        Breadcrumb b = new Breadcrumb();
        b.setCategory("note");
        b.setMessage(word);
        b.setLevel(SentryLevel.INFO);
        if (data != null) for (Map.Entry<String, Object> e : data.entrySet()) { Object v = safeFact(e.getValue()); if (v != null) b.setData(e.getKey(), v); }
        Sentry.addBreadcrumb(b);
    }

    /** A problem: a message with a fixed set of safe facts (numbers, yes/no and short codes only). */
    static void problem(String kind, String key, Map<String, Object> facts) {
        if (!started) return;
        SentryEvent ev = new SentryEvent();
        Message m = new Message();
        m.setFormatted(kind);
        ev.setMessage(m);
        ev.setLevel(SentryLevel.WARNING);
        ev.setTag("kind", kind);
        ev.setFingerprints(Arrays.asList("problem", kind, code(key == null ? "-" : key)));
        Map<String, Object> f = new HashMap<>();
        if (facts != null) for (Map.Entry<String, Object> e : facts.entrySet()) { Object v = safeFact(e.getValue()); if (v != null) f.put(e.getKey(), v); }
        ev.setExtra("facts", f);
        Sentry.captureEvent(ev);
    }

    /** The WebView's renderer died (MainActivity reloads the page): the facts that tell a low-memory kill from a crash. */
    static void webviewGone(Context ctx, boolean didCrash, int priorityAtExit) {
        Map<String, Object> f = new HashMap<>();
        f.put("didCrash", didCrash);
        f.put("priority", priorityAtExit);
        f.put("playerUp", PlayerActivity.current != null);
        f.put("uptimeMin", (SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime()) / 60000);
        f.put("recreates", ++recreates);
        f.put("offscreenPreRaster", preRaster);
        f.put("screen", screen);
        if (heapMb >= 0) f.put("heapMb", heapMb);
        memory(ctx, f);
        problem("webview-gone", didCrash ? "crash" : "killed", f);
    }

    /** At start: how the app's last run ended, when it ended while he was using it (Android API 30+). */
    static void lastExit(Context ctx) {
        if (!started || Build.VERSION.SDK_INT < 30) return;
        try {
            ActivityManager am = (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
            List<ApplicationExitInfo> list = am.getHistoricalProcessExitReasons(ctx.getPackageName(), 0, 1);
            if (list.isEmpty()) return;
            ApplicationExitInfo x = list.get(0);
            SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            if (x.getTimestamp() <= p.getLong("lastExit", 0)) return;
            p.edit().putLong("lastExit", x.getTimestamp()).apply();
            int r = x.getReason();
            String reason = r == ApplicationExitInfo.REASON_LOW_MEMORY ? "low-memory" : r == ApplicationExitInfo.REASON_CRASH_NATIVE ? "native-crash"
                : r == ApplicationExitInfo.REASON_SIGNALED ? "signaled" : null;   // (Java crashes and ANRs: Sentry's own)
            if (reason == null || x.getImportance() > ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE) return;
            Map<String, Object> f = new HashMap<>();
            f.put("reason", reason);
            f.put("importance", x.getImportance());
            f.put("pssMb", x.getPss() / 1024);
            f.put("rssMb", x.getRss() / 1024);
            f.put("lmkReported", ActivityManager.isLowMemoryKillReportSupported());
            memory(ctx, f);
            problem("last-exit", reason, f);
        } catch (Throwable ignored) {}
    }

    private static void memory(Context ctx, Map<String, Object> f) {
        try {
            ActivityManager am = (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
            am.getMemoryInfo(mi);
            f.put("availMb", mi.availMem / 1048576);
            f.put("totalMb", mi.totalMem / 1048576);
            f.put("lowRam", am.isLowRamDevice());
        } catch (Throwable ignored) {}
    }

    // ---------- the rules ----------
    private static final Pattern CODE = Pattern.compile("[A-Za-z0-9_.:+-]{1,48}");
    static String code(String s) { return s != null && CODE.matcher(s).matches() && !looksKey(s) ? s : "other"; }
    private static boolean looksKey(String s) { return s.length() >= 24 && s.matches(".*[A-Za-z].*") && s.matches(".*\\d.*"); }
    private static final Pattern MIME = Pattern.compile("[a-z]+/[a-z0-9.+-]{1,30}");
    private static final Pattern CODECS = Pattern.compile("[A-Za-z0-9.,+ -]{1,60}");
    private static Object safeFact(Object v) {
        if (v instanceof Number || v instanceof Boolean) return v;
        if (v instanceof String) { String s = (String) v; return CODE.matcher(s).matches() && !looksKey(s) || MIME.matcher(s).matches() || CODECS.matcher(s).matches() && !looksKey(s.replace(" ", "")) ? s : "other"; }
        return null;
    }

    /** What an exception may say. Pure, so ReportsTest checks it without Android or Media3 objects.
     *  kind: what the caller found by instanceof (see kindOf); message: the exception's own message. */
    static String codeFor(String simpleName, String kind, String errorCodeName, int responseCode, boolean inAppTop, String message) {
        switch (kind == null ? "" : kind) {
            case "jvm": return message == null ? simpleName : net(message);   // the JVM's own messages name code
            case "own": return inAppTop && message != null ? net(message) : simpleName;
            case "playback": return errorCodeName != null ? code(errorCodeName) : simpleName;
            case "http-code": return "http-" + responseCode;
            case "http": return "http";
            case "dns": case "refused": case "timeout": case "tls": case "404": case "json": case "uri": case "parse": case "cleartext": return kind;
            default: return simpleName;
        }
    }
    /** Which rule an exception falls under (only for real objects; codeFor is the pure part). */
    static String kindOf(Throwable t) {
        if (t instanceof NullPointerException || t instanceof ClassCastException || t instanceof IndexOutOfBoundsException
                || t instanceof java.util.ConcurrentModificationException || t instanceof ArithmeticException) return "jvm";
        if (t instanceof IllegalStateException || t instanceof IllegalArgumentException) return "own";
        if (t instanceof androidx.media3.common.PlaybackException) return "playback";
        if (t instanceof androidx.media3.datasource.HttpDataSource.InvalidResponseCodeException) return "http-code";
        if (t instanceof androidx.media3.datasource.HttpDataSource.HttpDataSourceException) return "http";
        if (t instanceof java.net.UnknownHostException) return "dns";
        if (t instanceof java.net.ConnectException) return "refused";
        if (t instanceof java.net.SocketTimeoutException) return "timeout";
        if (t instanceof javax.net.ssl.SSLException) return "tls";
        if (t instanceof java.io.FileNotFoundException) return "404";
        if (t instanceof org.json.JSONException) return "json";
        if (t instanceof java.net.URISyntaxException) return "uri";
        if (t instanceof androidx.media3.common.ParserException) return "parse";
        if (t instanceof java.io.IOException && t.getMessage() != null && t.getMessage().contains("CLEARTEXT")) return "cleartext";
        return "";
    }
    static String valueOf(Throwable t, boolean inAppTop) {
        String err = t instanceof androidx.media3.common.PlaybackException ? ((androidx.media3.common.PlaybackException) t).getErrorCodeName() : null;
        int code = t instanceof androidx.media3.datasource.HttpDataSource.InvalidResponseCodeException ? ((androidx.media3.datasource.HttpDataSource.InvalidResponseCodeException) t).responseCode : 0;
        return codeFor(t.getClass().getSimpleName(), kindOf(t), err, code, inAppTop, t.getMessage());
    }

    /** The last net, on text that's kept: links, hosts with ports, key-like runs, emails become placeholders. */
    static String net(String s) {
        if (s == null) return null;
        return s.replaceAll("(?i)\\b[a-z][a-z0-9+.-]*://\\S*", "<link>")
                .replaceAll("(?i)/(live|movie|series|timeshift|streaming)/\\S*", "<link>")
                .replaceAll("(?i)\\b[a-z0-9.-]+\\.[a-z]{2,}:\\d{2,5}\\S*", "<link>")
                .replaceAll("\\b(\\d{1,3}\\.){3}\\d{1,3}(:\\d{2,5})?\\S*", "<link>")
                .replaceAll("(?i)\\b(password|username|token|key|auth|apikey)=[^&\\s]+", "$1=<key>")
                .replaceAll("[^\\s@]+@[^\\s@]+\\.[A-Za-z]{2,}", "<email>")
                .replaceAll("\\b(?=[A-Za-z0-9_-]*\\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{24,}\\b", "<key>");
    }

    /** The report, rebuilt from the allowlist (SPEC D3). */
    static SentryEvent prepare(SentryEvent e) {
        String kind = e.getTag("kind");
        boolean problem = kind != null && Arrays.asList("play-failed", "webview-gone", "last-exit").contains(kind);
        List<SentryException> exs = e.getExceptions();
        if (exs != null && !exs.isEmpty()) {
            // the real throwables behind the list: Sentry lists the outermost last (an error, then its causes, reversed)
            List<Throwable> chain = new ArrayList<>();
            for (Throwable t = e.getThrowable(); t != null && chain.size() < 8; t = t.getCause() == t ? null : t.getCause()) chain.add(0, t);
            int off = exs.size() - chain.size();
            List<SentryException> out = new ArrayList<>();
            for (int i = 0; i < exs.size(); i++) {
                SentryException x = exs.get(i);
                Throwable t = i - off >= 0 && i - off < chain.size() ? chain.get(i - off) : null;
                boolean match = t != null && t.getClass().getSimpleName().equals(x.getType());
                SentryException y = new SentryException();
                y.setType(x.getType());
                y.setModule(x.getModule());
                y.setMechanism(x.getMechanism());
                SentryStackTrace st = cleanFrames(x.getStacktrace());
                y.setStacktrace(st);
                boolean inAppTop = topInApp(st);
                y.setValue(match ? valueOf(t, inAppTop) : x.getType());
                out.add(y);
            }
            e.setExceptions(out);
            e.setMessage(null);
        } else if (problem && e.getMessage() != null) {
            Message m = new Message();
            m.setFormatted(kind);
            e.setMessage(m);
        } else if (e.getThreads() == null || e.getThreads().isEmpty()) {
            return null;   // a message that isn't one of ours: nothing safe to send
        } else {
            e.setMessage(null);
        }
        // an ANR keeps the main thread's frames only (no names)
        if (e.getThreads() != null) {
            List<io.sentry.protocol.SentryThread> keep = new ArrayList<>();
            for (io.sentry.protocol.SentryThread th : e.getThreads()) if (Boolean.TRUE.equals(th.isMain()) || Boolean.TRUE.equals(th.isCrashed())) {
                io.sentry.protocol.SentryThread n = new io.sentry.protocol.SentryThread();
                n.setId(th.getId()); n.setMain(th.isMain()); n.setCrashed(th.isCrashed()); n.setCurrent(th.isCurrent());
                n.setStacktrace(cleanFrames(th.getStacktrace()));
                keep.add(n);
            }
            e.setThreads(keep);
        }
        e.setUser(null);
        e.setServerName(null);
        e.setRequest(null);
        e.setDebugMeta(null);
        e.setModules(null);
        e.setTransaction(null);
        Map<String, String> tags = new HashMap<>();
        for (String k : new String[]{"app", "side", "screen", "kind"}) { String v = e.getTag(k); if (v != null) tags.put(k, code(v)); }
        e.setTags(tags);
        Object facts = e.getExtra("facts");
        Map<String, Object> ex = new HashMap<>();
        if (problem && facts instanceof Map) ex.put("facts", facts);
        e.setExtras(ex);
        List<Breadcrumb> crumbs = new ArrayList<>();
        if (e.getBreadcrumbs() != null) for (Breadcrumb b : e.getBreadcrumbs()) if ("note".equals(b.getCategory())) crumbs.add(b);
        e.setBreadcrumbs(crumbs.size() > 20 ? crumbs.subList(crumbs.size() - 20, crumbs.size()) : crumbs);
        // contexts: the OS, the device's model and memory, whether the app was in front; nothing else
        Contexts c = e.getContexts();
        OperatingSystem os = c.getOperatingSystem();
        Device dv = c.getDevice();
        App ap = c.getApp();
        for (String k : java.util.Collections.list(c.keys())) c.remove(k);
        if (os != null) { OperatingSystem o = new OperatingSystem(); o.setName(os.getName()); o.setVersion(os.getVersion()); c.setOperatingSystem(o); }
        if (dv != null) { Device d = new Device(); d.setModel(dv.getModel()); d.setManufacturer(dv.getManufacturer()); d.setFreeMemory(dv.getFreeMemory()); d.setLowMemory(dv.isLowMemory()); c.setDevice(d); }
        if (ap != null) { App a = new App(); a.setInForeground(ap.getInForeground()); c.setApp(a); }
        if (!problem) e.setFingerprints(null);
        return e;
    }
    private static SentryStackTrace cleanFrames(SentryStackTrace st) {
        if (st == null || st.getFrames() == null) return st;
        List<SentryStackFrame> fs = new ArrayList<>();
        for (SentryStackFrame f : st.getFrames()) {
            SentryStackFrame n = new SentryStackFrame();
            n.setModule(f.getModule()); n.setFunction(f.getFunction()); n.setFilename(f.getFilename());
            n.setLineno(f.getLineno()); n.setInApp(f.isInApp()); n.setNative(f.isNative());
            fs.add(n);
        }
        SentryStackTrace out = new SentryStackTrace(fs);
        return out;
    }
    private static boolean topInApp(SentryStackTrace st) {
        if (st == null || st.getFrames() == null || st.getFrames().isEmpty()) return false;
        SentryStackFrame top = st.getFrames().get(st.getFrames().size() - 1);   // Sentry lists the frame that threw last
        return top.getModule() != null && top.getModule().startsWith("app.tuner");
    }

    // ---------- caps: the same report once in 10 minutes, 30 a day (SPEC D6) ----------
    private static final Map<String, Long> seen = new HashMap<>();
    private static String fingerprintKey(SentryEvent e) {
        if (e.getFingerprints() != null) return String.join("|", e.getFingerprints());
        List<SentryException> exs = e.getExceptions();
        if (exs != null && !exs.isEmpty()) { SentryException x = exs.get(exs.size() - 1); return x.getType() + "|" + x.getValue(); }
        return "anr";
    }
    private static synchronized boolean allow(Context ctx, String key) {
        long now = System.currentTimeMillis();
        if (seen.size() > 200) seen.clear();
        Long at = seen.get(key);
        if (at != null && now - at < 10 * 60_000L) return false;
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long day = now / 86_400_000L;
        int n = p.getLong("capDay", -1) == day ? p.getInt("capN", 0) : 0;
        if (n >= 30) return false;
        p.edit().putLong("capDay", day).putInt("capN", n + 1).apply();
        seen.put(key, now);
        return true;
    }
}
