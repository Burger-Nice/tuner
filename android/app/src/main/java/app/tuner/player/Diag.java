package app.tuner.player;

import android.content.Context;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.SystemClock;

import org.json.JSONObject;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.ConnectException;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/**
 * Playback diagnosis (design/ui-v1/diagnosis/SPEC.md): what the player can read about the way from this TV to the
 * provider, the checks it runs when a stall needs them, and the decision table (4.1) that turns them into one cause in
 * the owner's words, drawn on the path TV · Wi-Fi (or Cable) · Internet · Provider · Channel.
 * Nothing here knows about games: no score, clock or result ever goes through it.
 */
final class Diag {
    private Diag() {}

    // node states and link states
    static final int OK = 0, BAD = 1, OFF = 2, RUN = 3;
    static final int L_OK = 0, L_SLOW = 1, L_CUT = 2, L_OFF = 3, L_RUN = 4;
    static final int TV = 0, NET = 1, INET = 2, PROV = 3, CH = 4;

    /** Where the speed test downloads from; android.json's speedUrl can change it without an update. */
    static volatile String speedUrl = "https://speed.cloudflare.com/__down?bytes=25000000";
    static final long SPEED_MAX = 25_000_000L;
    /** When this TV last closed a stream (elapsedRealtime): a provider may still count it for up to a minute. */
    static volatile long closedAt;
    static boolean closedRecently() { return closedAt > 0 && SystemClock.elapsedRealtime() - closedAt < 60000; }

    /** The path as drawn. */
    static final class Path {
        final String[] icon = { "tv", "wifi", "globe", "server", "stream" };
        final String[] label = { "TV", "Wi-Fi", "Internet", "Provider", "Channel" };
        final int[] node = { OFF, OFF, OFF, OFF, OFF };
        final String[] reading = new String[5], value = new String[5];
        final int[] link = { L_OFF, L_OFF, L_OFF, L_OFF };
        Path nodes(int... st) { System.arraycopy(st, 0, node, 0, 5); return this; }
        Path links(int... st) { System.arraycopy(st, 0, link, 0, 4); return this; }
        Path read(int i, String r) { reading[i] = r; return this; }
    }

    /** One cause: what the card, the chip, the failure card and the panel say. */
    static final class Cause {
        String id = "checking", title = "", line = "", shortLine, chip = "", brief = "", verdict = "Checking…", details = "";
        final Path path = new Path();
        String[] actions = {};      // preferred actions in order: feed, copy, lower, retry, next, settings, account
        boolean certain, spin = true, fail, limit;
        String right;               // the keys line's right side when it isn't the reconnect count
        Cause(String id) { this.id = id; }
    }

    /** What's known now. Network and stream fields are kept by the player; check fields come from the last checks. */
    static final class Readings {
        // network (the default network's callback, WifiManager)
        boolean connected = true, wifi, cable, validated = true, captive;
        int rssi = Integer.MIN_VALUE, bars, link, linkMax;
        String gateway;
        // the last checks: 0 not run
        int inet; long inetMs;                    // the HTTP status of the internet check; -1 no answer
        int host; long hostMs, hostOkAt;           // 1 answered, -1 no answer, -2 the name doesn't resolve
        int acct; long acctMs;                     // 1 JSON, 2 an HTML page, -1 no answer, 0 none (M3U)
        String status = ""; long exp; int active = -1, max = -1;
        int router;                                // 1 answers, -1 silent
        double speed = -1; boolean speedFull; int speedState; long speedAt;   // 1 measured, 2 unavailable, 3 no route
        long checkedAt;                            // wall clock
        boolean weakRetried;
        // the stream
        double arrival = -1, need = 0, ahead, refill = -1;
        boolean needAbout = true, stalled, playing, frames;
        String streamHost = "", reqHost = ""; int port = 80;
        String contentType = "";
        // the last error
        int http; boolean limitBody, htmlBody, redirected, noHost, timedOut;
        int decoder;                               // 1 the TV can't play it, 2 damaged at the source
        int height; float fps;
        int pauses5m;

        boolean wifiWeak() { return wifi && ((bars > 0 && bars <= 2) || (link > 0 && need > 0 && link < 2 * need)); }
        boolean starving() { return stalled ? refill < 0.8 : arrival >= 0 && need > 0 && ahead < 10 && arrival < 0.9 * need; }
        double capacity() { return speed < 0 ? -1 : speed + Math.max(0, arrival); }
        boolean active() { return status.isEmpty() || status.toLowerCase(Locale.ROOT).contains("active"); }
        boolean expired() { return exp > 0 && exp * 1000 < System.currentTimeMillis(); }
        void clearError() { http = 0; limitBody = htmlBody = noHost = timedOut = false; decoder = 0; }
    }

    // ---------- the words ----------

    static String mbps(double v) { return String.valueOf(Math.max(0, Math.round(v))); }
    static int bars(int rssi) { return rssi == Integer.MIN_VALUE ? 0 : rssi >= -55 ? 4 : rssi >= -66 ? 3 : rssi >= -75 ? 2 : 1; }
    /** "US: ESPN HD" → "ESPN HD" (the card never shows provider prefixes). */
    static String clean(String n) { return n == null ? "" : n.replaceFirst("^[A-Z]{2,3}\\s*[|:\\-]\\s*", "").trim(); }
    /** What a picture usually needs, when the stream doesn't say (SPEC 4.2). */
    static double typical(int h, float fps) { return h >= 2000 ? 20 : h >= 1000 ? (fps > 40 ? 10 : 8) : h >= 700 ? 5 : h > 0 ? 3 : 8; }
    /** What a provider copy needs, from its name's quality tag. */
    static double needOfName(String n) {
        String s = n == null ? "" : n.toLowerCase(Locale.ROOT);
        return s.matches(".*\\b(4k|uhd|2160p?)\\b.*") ? 20 : s.matches(".*\\b(fhd|full ?hd|1080p?)\\b.*") ? 8 : s.matches(".*\\b(hd|720p?)\\b.*") ? 5 : s.matches(".*\\bsd\\b.*") ? 3 : 6;
    }
    static String tagOfName(String n) {
        double d = needOfName(n);
        return d == 20 ? "4K" : d == 8 ? "Full HD" : d == 5 ? "HD" : d == 3 ? "SD" : "";
    }

    /**
     * The decision table (SPEC 4.1, v1.2 order plus review 3): the TV's own state, then the HTTP status rows (the far
     * side answered), the outage, the Wi-Fi, the provider's server, then speed. First match wins.
     * what: "channel", "movie" or "episode"; name: the channel's title (for C6).
     */
    static Cause decide(Readings r, String what, String name) {
        boolean live = "channel".equals(what);
        String It = live ? "This channel" : "It";
        int lastNode = CH;
        double need = r.need, cap = r.capacity();
        String needS = mbps(need), gets = mbps(Math.max(0, r.arrival));
        Cause c;
        // C1: no network and the picture has stopped (while picture remains it's the chip)
        if (!r.connected) {
            c = new Cause("offline");
            c.title = "Your TV is offline";
            c.line = (r.cable ? "The network cable is unplugged." : "The Wi-Fi dropped.") + " airglow carries on by itself when it's back.";
            netNode(c, r, BAD, "Not connected");
            if (!r.cable) c.path.icon[NET] = "wifiOff";
            c.path.nodes(OK, BAD, OFF, OFF, OFF).links(L_CUT, L_OFF, L_OFF, L_OFF);
            c.actions = new String[] { "settings" };
            c.certain = true; c.spin = false; c.verdict = "Offline"; c.brief = "Your TV is offline"; c.chip = "The Wi-Fi dropped";
            return fin(c, r, what);
        }
        // C1c: a sign-in page (only on an HTTP answer other than 204, never on no answer)
        if (r.captive || (r.inet > 0 && r.inet != 204)) {
            c = new Cause("signin");
            c.title = "Your Wi-Fi wants you to sign in";
            c.line = "Open its sign-in page in the TV's network settings.";
            c.path.nodes(OK, OK, BAD, OFF, OFF).links(L_OK, L_CUT, L_OFF, L_OFF).read(INET, "Sign-in page");
            c.actions = new String[] { "settings" };
            c.certain = true; c.verdict = "Sign in"; c.brief = "Your Wi-Fi wants a sign-in";
            return fin(c, r, what);
        }
        // C8 / C8b: the picture itself
        if (r.decoder == 1) {
            c = new Cause("decoder");
            c.title = "This TV can't play this " + (live ? "channel's" : what + "'s") + " picture";
            String why = r.height >= 2000 && r.fps > 31 ? "It's 4K at a frame rate this TV can't play." : r.height >= 2000 ? "It's a 4K picture this TV can't play." : "It's a picture format this TV can't play.";
            c.line = why + " Not your internet or provider.";
            c.shortLine = why;
            c.path.nodes(BAD, OK, OK, OK, OK).links(L_OK, L_OK, L_OK, L_OK).read(TV, "Can't play it");
            c.actions = new String[] { "lower", "next" };
            c.certain = true; c.fail = true; c.spin = false; c.verdict = "TV"; c.brief = "This TV can't play it";
            return fin(c, r, what);
        }
        if (r.decoder == 2) {
            c = new Cause("broken");
            c.title = live ? "This channel's picture is broken at your provider" : "This picture is broken at your provider";
            c.shortLine = "What arrives is damaged.";
            c.line = "This TV can play this format, but what arrives is damaged.";
            c.path.nodes(OK, OK, OK, OK, BAD).links(L_OK, L_OK, L_OK, L_OK).read(CH, "Damaged");
            c.actions = new String[] { "copy", "feed", "retry" };
            c.certain = true; c.fail = true; c.spin = false; c.verdict = "Provider"; c.brief = "Broken at your provider";
            return fin(c, r, what);
        }
        // the status rows: the far side answered
        int h = r.http;
        if (h == 401 || h == 403 || h == 458 || h == 509) {
            if (h <= 403 && r.acct == 1 && (!r.active() || r.expired())) {
                c = new Cause("ended");
                c.title = "Your provider account has ended";
                c.line = r.exp > 0 ? "It expired on " + new java.text.SimpleDateFormat("d MMM", Locale.ENGLISH).format(new java.util.Date(r.exp * 1000)) + ". Renew it with your provider."
                        : "Your provider says it isn't active. Renew it with them.";
                c.path.nodes(OK, OK, OK, BAD, OFF).links(L_OK, L_OK, L_OK, L_OFF).read(PROV, "Ended");
                c.actions = new String[] { "account" };
                c.certain = true; c.fail = true; c.spin = false; c.verdict = "Account"; c.brief = "Your account has ended";
                return fin(c, r, what);
            }
            boolean full = r.acct == 1 && r.max > 0 && r.active >= r.max;
            if (h >= 458 || r.limitBody || full) {
                c = new Cause("limit");
                int m = r.max;
                c.title = m > 0 ? "Your provider allows " + m + (m == 1 ? " stream" : " streams") : "Your provider's stream limit is reached";
                if (closedRecently()) c.line = m == 1 ? "It still counts this TV's last one. That clears within a minute." : "One is this TV's last channel, which clears within a minute.";
                else c.line = (m == 2 ? "Both are" : m > 2 ? "All " + m + " are" : "They're") + " in use, by other devices. Stop one, or wait a moment.";
                c.path.nodes(OK, OK, OK, BAD, OFF).links(L_OK, L_OK, L_OK, L_OFF).read(PROV, m > 0 && r.active >= 0 ? Math.min(r.active, m) + " of " + m + " in use" : "Limit reached");
                c.actions = new String[] { "retry" };
                c.certain = true; c.limit = true; c.verdict = "Limit"; c.brief = "Your stream limit";
                return fin(c, r, what);
            }
            c = new Cause(r.acct == -1 ? "refused-unsure" : "refused");
            c.title = "Your provider refused this " + what;
            // (review 3, S3-1: when the account check didn't answer, don't claim to know which)
            c.line = r.acct == -1 ? "It may be your stream limit or your package. Trying again in 10 s."
                    : "It may not be in your package, or they block VPNs or new addresses.";
            c.path.nodes(OK, OK, OK, OK, BAD).links(L_OK, L_OK, L_OK, L_CUT).read(CH, "Refused");
            c.actions = r.acct == -1 ? new String[] { "retry" } : new String[] { "copy", "feed", "next", "retry" };
            c.certain = true; c.limit = r.acct == -1; c.verdict = "Provider"; c.brief = "Your provider refused it";
            return fin(c, r, what);
        }
        if (h == 404 || h == 410) {
            c = new Cause("off");
            c.title = "This " + what + " is off at your provider";
            String n = clean(name);
            c.line = "Their server answered, but sends nothing on " + (n.isEmpty() ? "this " + what : n) + ".";
            c.shortLine = "Their server answered, but sends nothing on this " + what + ".";
            c.path.nodes(OK, OK, OK, OK, BAD).links(L_OK, L_OK, L_OK, L_CUT).read(CH, "Nothing sent");
            c.actions = new String[] { "feed", "copy", "next", "retry" };
            c.certain = true; c.spin = false; c.verdict = "Provider"; c.brief = "Off at your provider";
            return fin(c, r, what);
        }
        if (h >= 500 && h < 600) {
            c = new Cause("server-error");
            c.title = "Your provider's server has a problem";
            c.line = "It answered with an error. airglow keeps trying.";
            c.path.nodes(OK, OK, OK, BAD, OFF).links(L_OK, L_OK, L_OK, L_OFF).read(PROV, "Error");
            c.actions = new String[] { "retry" };
            c.certain = true; c.verdict = "Provider"; c.brief = "Your provider has a problem";
            return fin(c, r, what);
        }
        // C6b: an HTML page from the panel's own host (no redirect) and the panel answering HTML too (review 3, S3-2)
        if (h == 200 && r.htmlBody && !r.redirected && r.acct == 2) {
            c = new Cause("blocked");
            c.title = "Something on the way is blocking this " + what;
            c.line = "Your internet company may block it. Private DNS may get around it.";
            c.path.nodes(OK, OK, BAD, OFF, OFF).links(L_OK, L_CUT, L_OFF, L_OFF).read(INET, "Blocked");
            c.actions = new String[] { "copy", "feed" };
            c.certain = true; c.verdict = "Blocked"; c.brief = "Something blocks it";
            c.details = "Private DNS is in the TV's network settings.";
            return fin(c, r, what);
        }
        // C1b: nothing answers at all (review 3, M3-2: on weak Wi-Fi it's the Wi-Fi, after a retry with 5 s timeouts)
        if (r.inet == -1 && r.host == -1) {
            if (r.wifiWeak()) {
                c = new Cause("wifi-gone");
                c.title = "Your Wi-Fi is too weak to get through";
                c.line = "Almost nothing reaches the TV. Move the router closer, or use a cable.";
                c.path.icon[NET] = "wifiWeak";
                c.path.nodes(OK, BAD, OFF, OFF, OFF).links(L_CUT, L_OFF, L_OFF, L_OFF).read(NET, r.bars > 0 ? r.bars + " of 4 bars" : "Too weak");
                c.actions = new String[] { "retry" };
                c.verdict = "Weak Wi-Fi"; c.brief = "Your Wi-Fi is too weak"; c.chip = "Weak Wi-Fi for this " + what;
                c.details = "A network cable, or the router closer, fixes it for good.";
                return fin(c, r, what);
            }
            if (r.router == 1) {
                c = new Cause("no-internet");
                c.title = "Your internet isn't working";
                c.line = "Your router answers, but nothing gets past it. Restart it.";
                c.path.nodes(OK, OK, BAD, OFF, OFF).links(L_OK, L_CUT, L_OFF, L_OFF).read(INET, "No answer");
            } else {
                c = new Cause("no-router");
                c.title = "The TV can't reach your router";
                c.line = "It's on the Wi-Fi, but the router doesn't answer. Restart it.";
                if (r.cable) c.line = "It's on the cable, but the router doesn't answer. Restart it.";
                c.path.nodes(OK, BAD, OFF, OFF, OFF).links(L_CUT, L_OFF, L_OFF, L_OFF).read(NET, "No answer");
            }
            c.details = "If that doesn't help, your internet company may have a fault.";
            c.actions = new String[] { "retry" };
            c.verdict = "Offline"; c.brief = c.title;
            return fin(c, r, what);
        }
        boolean weak = r.wifiWeak(), starving = r.starving();
        // Google failing while the stream host answers: the internet check is ignored and the table carries on (M6)
        boolean netOk = r.inet == 204 || (r.inet == -1 && r.host == 1);
        double ratio = !r.wifi ? -1 : r.linkMax > 0 && cap >= 0 ? cap / r.linkMax : r.bars == 1 ? 1 : -1;
        // C2: weak Wi-Fi, when the readings agree (or with no test: on bars and link alone, S20; a timeout counts)
        if (weak && (r.timedOut || (starving && (cap < 0 ? r.speedState >= 2 || r.bars == 1 : cap < 1.3 * need && ratio >= 0.35)))) {
            c = new Cause("wifi");
            c.title = "Your Wi-Fi is weak";
            c.line = need > 0 && r.arrival >= 0 ? "This " + what + " needs " + needS + " Mbps. Over this Wi-Fi it's getting " + gets + "." : "The signal is too weak for this " + what + ".";
            c.path.icon[NET] = "wifiWeak";
            c.path.nodes(OK, BAD, OFF, OFF, OFF).links(L_SLOW, L_OFF, L_OFF, L_OFF).read(NET, r.bars > 0 ? r.bars + " of 4 bars" : "Weak");
            c.actions = new String[] { "lower", "retry" };
            c.verdict = "Weak Wi-Fi"; c.brief = "Your Wi-Fi is weak"; c.chip = "Weak Wi-Fi for this " + what;
            c.details = "A network cable, or the router closer, fixes it for good.";
            return fin(c, r, what);
        }
        if (r.host == -2 && netOk) {
            c = new Cause("not-found");
            c.title = "Your internet can't find your provider";
            c.line = "Their address doesn't work from here. Your internet company may block it.";
            c.shortLine = "Their address doesn't work from here.";
            c.path.nodes(OK, OK, OK, BAD, OFF).links(L_OK, L_OK, L_CUT, L_OFF).read(PROV, "Not found");
            c.actions = new String[] { "retry" };
            c.verdict = "Provider"; c.brief = "Your provider can't be found";
            c.details = "Private DNS in the TV's network settings may get around it.";
            return fin(c, r, what);
        }
        if (r.host == -1 && netOk && !weak) {
            c = new Cause("provider-down");
            long n = r.hostOkAt > 0 ? (SystemClock.uptimeMillis() - r.hostOkAt) / 1000 : 0;
            c.title = "Your provider isn't answering";
            c.line = n >= 5 && n < 3600 ? "Your internet works. Their server hasn't answered for " + n + " s." : "Your internet works. Their server doesn't answer.";
            c.path.nodes(OK, OK, OK, BAD, OFF).links(L_OK, L_OK, L_CUT, L_OFF).read(PROV, "No answer");
            c.actions = new String[] { "retry" };
            c.verdict = "Provider"; c.brief = "Your provider isn't answering";
            return fin(c, r, what);
        }
        if (starving) {
            String forWhat = live ? (r.height >= 2000 ? "4K" : "this channel") : "this " + what;
            if (cap < 0 && r.speedState >= 2 && !weak) {
                c = new Cause("slow-untested");
                c.title = "This " + what + " is arriving too slowly";
                c.line = "airglow couldn't test your internet's speed this time.";
                c.path.nodes(OK, OK, OFF, r.host == 1 ? OK : OFF, BAD).links(L_OK, L_OK, L_OK, L_SLOW).read(INET, "Not tested")
                        .read(CH, need > 0 && r.arrival >= 0 ? gets + " of " + needS + " Mbps" : "Too slow");
                c.actions = new String[] { "feed", "copy", "retry" };
                c.verdict = "Slow"; c.brief = "It's arriving too slowly"; c.chip = "It's arriving too slowly";
                return fin(c, r, what);
            }
            if (cap >= 0 && need > 0 && cap < 1.3 * need) {
                boolean line = r.cable || (ratio >= 0 && ratio < 0.15);
                if (line) {
                    c = new Cause("internet-slow");
                    c.title = live ? "Your internet is too slow for " + forWhat : "Your internet is slow for this " + what;
                    c.line = live ? (r.height >= 2000 ? "This 4K channel needs " : "This channel needs ") + needS + " Mbps. Your internet gives " + mbps(cap) + " right now."
                            : "It needs " + needS + " Mbps and gets " + mbps(cap) + ".";
                    c.path.nodes(OK, OK, BAD, OFF, OFF).links(L_OK, L_SLOW, L_OFF, L_OFF).read(INET, mbps(cap) + " Mbps");
                    c.actions = new String[] { "lower", "retry" };
                    c.verdict = "Slow"; c.brief = "Your internet is slow"; c.chip = "Your internet is too slow for it";
                    c.details = "Something else on your network may be using it.";
                    return fin(c, r, what);
                }
                c = new Cause("home-slow");
                c.title = "Your connection at home is too slow";
                c.line = "This " + what + " needs " + needS + " Mbps and gets " + mbps(cap) + "." + (r.bars >= 3 ? " The Wi-Fi signal is strong." : "");
                c.path.nodes(OK, BAD, BAD, OFF, OFF).links(L_SLOW, L_SLOW, L_OFF, L_OFF).read(NET, r.bars >= 3 ? "Strong, but slow" : r.bars > 0 ? r.bars + " of 4 bars" : "Slow").read(INET, mbps(cap) + " Mbps");
                c.actions = new String[] { "lower", "retry" };
                c.verdict = "Slow"; c.brief = "Your connection at home is slow"; c.chip = "Your connection at home is too slow";
                c.details = "A network cable would show whether it's the Wi-Fi or the line.";
                return fin(c, r, what);
            }
            if (cap >= 0) {
                c = new Cause("provider-slow");
                c.title = "Your provider is slow with this " + what;
                c.line = "Your Wi-Fi and internet are fine. It's their server, or the way to it.";
                c.path.nodes(OK, OK, OK, r.host == 1 ? OK : OFF, BAD).links(L_OK, L_OK, L_OK, L_SLOW)
                        .read(INET, need > 0 && cap >= 3 * need ? "Fast" : null)
                        .read(CH, need > 0 && r.arrival >= 0 ? gets + " of " + needS + " Mbps" : "Too slow");
                c.actions = new String[] { "feed", "copy", "retry" };
                c.verdict = "Slow"; c.brief = "Your provider is slow"; c.chip = "Your provider is slow with it";
                return fin(c, r, what);
            }
        }
        if (netOk && r.host == 1 && (r.stalled || r.http > 0 || r.timedOut)) {
            c = new Cause("moment");
            c.title = "This " + what + " stopped for a moment";
            c.line = "Your internet and your provider look fine. Reconnecting.";
            c.path.nodes(OK, OK, OK, OK, RUN).links(L_OK, L_OK, L_OK, L_RUN);
            c.actions = new String[] { "feed", "copy", "retry" };
            c.verdict = "Checking…"; c.brief = "It stopped for a moment"; c.chip = "Your provider's stream is uneven";
            return fin(c, r, what);
        }
        if (netOk && r.host == 1 && !r.stalled) return good(r, what);
        c = new Cause("unknown");
        c.title = "Something between this TV and your provider isn't answering";
        c.shortLine = "The readings are in Details.";
        c.line = "The readings are in Details.";
        c.path.nodes(OK, OK, BAD, OFF, OFF).links(L_OK, L_CUT, L_OFF, L_OFF);
        c.actions = new String[] { "retry" };
        c.verdict = "Checking…"; c.brief = "Something isn't answering"; c.chip = "Something on the way isn't answering";
        return fin(c, r, what);
    }
    /** Playing, and nothing says otherwise. */
    static Cause good(Readings r, String what) {
        Cause c = new Cause("good");
        double need = r.need, cap = r.capacity();
        c.title = "All good";
        c.line = need > 0 ? "This " + what + " needs about " + mbps(need) + " Mbps." + (cap >= 3 * need ? " Your internet has plenty of room." : "") : "Everything answered.";
        c.path.nodes(OK, r.connected ? OK : BAD, r.inet == 204 ? OK : OFF, r.host == 1 ? OK : OFF, r.playing || r.frames ? OK : OFF)
                .links(L_OK, r.inet == 204 ? L_OK : L_OFF, r.host == 1 ? L_OK : L_OFF, r.playing ? L_OK : L_OFF);
        c.verdict = "Good"; c.brief = need > 0 ? (r.needAbout ? "Steady · about " : "Steady · ") + mbps(need) + " Mbps" : "Steady"; c.spin = false;
        c.chip = "Your provider's stream is uneven";
        return fin(c, r, what);
    }
    /** The short title C11 uses when the long one doesn't fit one line. */
    static final String UNKNOWN_SHORT = "Something on the way isn't answering";

    /** The card while the checks haven't answered (stall-checking). */
    static Cause checking(Readings r, String what) {
        Cause c = new Cause("checking");
        c.title = "Still loading";
        c.line = "Checking your " + (r.cable ? "connection" : "Wi-Fi") + ", internet and provider…";
        c.path.nodes(OK, r.connected ? OK : OFF, RUN, OFF, OFF).links(L_OK, L_RUN, L_OFF, L_OFF);
        c.verdict = "Checking…"; c.brief = "Checking…";
        return fin(c, r, what);
    }

    private static void netNode(Cause c, Readings r, int st, String reading) { c.path.node[NET] = st; c.path.reading[NET] = reading; }
    private static Cause fin(Cause c, Readings r, String what) {
        if (r.cable) { c.path.label[NET] = "Cable"; c.path.icon[NET] = "cable"; }
        if (!"channel".equals(what)) c.path.label[CH] = "movie".equals(what) ? "Movie" : "Episode";
        if (c.chip.isEmpty()) c.chip = c.brief;
        return c;
    }

    /** The panel's vertical path (SPEC 7): the same states, with each link's own reading and value. */
    static Path panelPath(Cause c, Readings r, long ahead) {
        Path p = new Path();
        System.arraycopy(c.path.icon, 0, p.icon, 0, 5);
        System.arraycopy(c.path.label, 0, p.label, 0, 5);
        System.arraycopy(c.path.node, 0, p.node, 0, 5);
        System.arraycopy(c.path.link, 0, p.link, 0, 4);
        boolean chBad = p.node[CH] == BAD;
        p.reading[TV] = p.node[TV] == BAD ? "Can't play this picture" : r.frames ? "Plays this " + ("Channel".equals(p.label[CH]) ? "channel" : p.label[CH].toLowerCase(Locale.ROOT)) + " fine" : "Starting…";
        if (!chBad && ahead > 0 && r.frames) p.value[TV] = ahead + " s ahead";
        if (!r.connected) p.reading[NET] = "Not connected";
        else if (r.cable) p.reading[NET] = "Connected";
        else if (r.bars > 0) { p.reading[NET] = r.bars >= 3 ? "Strong signal" : r.bars == 2 ? "Weak signal" : "Very weak signal"; p.value[NET] = r.bars + " of 4 bars"; }
        else p.reading[NET] = "Connected";
        p.reading[INET] = r.inet == 204 ? "Answers in " + r.inetMs + " ms" : r.inet == -1 ? "No answer" : r.inet > 0 ? "Sign-in page" : "Not checked yet";
        p.value[INET] = r.speedState == 1 ? (r.speedFull ? (long) (Math.floor(r.speed / 10) * 10) + "+ Mbps" : mbps(r.speed) + " Mbps") : r.speedState >= 2 ? "Not tested" : "Not tested yet";
        String acct = r.acct == 1 && r.max > 0 && r.active >= 0 ? Math.min(r.active, r.max) + " of " + r.max + " streams in use" : "";
        p.reading[PROV] = r.host == 1 ? "Answers in " + r.hostMs + " ms" + (acct.isEmpty() ? "" : " · " + acct) : r.host == -1 ? "No answer" : r.host == -2 ? "Not found" : "Not checked yet";
        if (chBad && r.need > 0 && r.arrival >= 0) { p.reading[CH] = "Getting " + mbps(r.arrival) + " of the " + mbps(r.need) + " Mbps it needs"; if (ahead >= 0) p.value[CH] = ahead + " s ahead"; }
        else if (chBad) p.reading[CH] = c.path.reading[CH] != null ? c.path.reading[CH] : "Too slow";
        else if (r.playing) { p.reading[CH] = "Arriving steadily"; if (r.need > 0) p.value[CH] = (r.needAbout ? "about " : "") + mbps(r.need) + " Mbps"; }
        else p.reading[CH] = r.stalled ? "Not arriving" : "Starting…";
        return p;
    }

    // ---------- the checks (SPEC 10.3), off the UI thread ----------

    static final ExecutorService SETS = Executors.newSingleThreadExecutor();   // one set in flight
    static final ExecutorService POOL = Executors.newCachedThreadPool();       // its parallel requests

    /** What a set of checks needs to know, copied on the UI thread. */
    static final class Req {
        String host, api, gateway; int port = 80;
        boolean weak, starving, speed, speedIfStarving;
        Context ctx;
    }
    /** What a set found. */
    static final class Probe {
        int inet; long inetMs; int host; long hostMs; int acct; long acctMs; String status = ""; long exp; int active = -1, max = -1;
        int router; double speed = -1; boolean speedFull; int speedState; int linkMax; boolean weakRetried;
        void into(Readings r) {
            r.inet = inet; r.inetMs = inetMs;
            r.host = host; r.hostMs = hostMs; if (host == 1) r.hostOkAt = SystemClock.uptimeMillis();
            if (acct != 0 || r.acct == 0) { r.acct = acct; r.acctMs = acctMs; if (acct == 1) { r.status = status; r.exp = exp; r.active = active; r.max = max; } }
            if (router != 0) r.router = router;
            if (speedState != 0) { r.speed = speed; r.speedFull = speedFull; r.speedState = speedState; r.speedAt = SystemClock.uptimeMillis(); }
            if (linkMax > 0) r.linkMax = Math.max(r.link, linkMax);
            r.weakRetried = weakRetried;
            r.checkedAt = System.currentTimeMillis();
        }
    }

    static Probe run(Req q) {
        Probe p = new Probe();
        quick(q, p, 2000);
        // review 3, M3-2: a weak, lossy Wi-Fi can miss 2 s on every check; ask again with 5 s before calling it an outage
        if (q.weak && p.inet == -1 && p.host == -1) { quick(q, p, 5000); p.weakRetried = true; }
        boolean reach = p.inet == 204 || p.host == 1;
        if (reach && (q.speed || (q.speedIfStarving && q.starving))) speedTest(q.ctx, p);
        return p;
    }
    private static void quick(Req q, Probe p, int ms) {
        Future<long[]> inet = POOL.submit(() -> internet(ms));
        Future<long[]> host = q.host == null || q.host.isEmpty() ? null : POOL.submit(() -> hostCheck(q.host, q.port, ms));
        Future<Object[]> acct = q.api == null || q.api.isEmpty() ? null : POOL.submit(() -> account(q.api, ms));
        Future<Integer> router = q.gateway == null ? null : POOL.submit(() -> gateway(q.gateway));
        try { long[] a = inet.get(ms * 2 + 1000, TimeUnit.MILLISECONDS); p.inet = (int) a[0]; p.inetMs = a[1]; } catch (Exception e) { p.inet = -1; }
        try { if (host != null) { long[] a = host.get(ms + 1000, TimeUnit.MILLISECONDS); p.host = (int) a[0]; p.hostMs = a[1]; } } catch (Exception e) { p.host = -1; }
        try { if (acct != null) { Object[] a = acct.get(ms + 1000, TimeUnit.MILLISECONDS); p.acct = (int) a[0]; p.acctMs = (long) a[1]; if (p.acct == 1) { JSONObject u = (JSONObject) a[2]; p.status = u.optString("status", ""); p.exp = u.optLong("exp_date", 0); p.active = u.optInt("active_cons", -1); p.max = u.optInt("max_connections", -1); } } } catch (Exception e) { p.acct = -1; }
        try { if (router != null) p.router = router.get(2500, TimeUnit.MILLISECONDS); } catch (Exception e) { p.router = -1; }
    }

    /** Only 204 passes; another HTTP answer is a sign-in page; no answer at all is a failed check. {status, ms} */
    static long[] internet(int ms) {
        long[] a = http204("https://connectivitycheck.gstatic.com/generate_204", ms);
        if (a[0] == 204) return a;
        long[] b = http204("http://cp.cloudflare.com/", ms);
        if (b[0] == 204) return b;
        return a[0] > 0 ? a : b;
    }
    private static long[] http204(String url, int ms) {
        long t0 = SystemClock.elapsedRealtime();
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(url).openConnection();
            c.setInstanceFollowRedirects(false);
            c.setUseCaches(false);
            c.setConnectTimeout(ms);
            c.setReadTimeout(ms);
            int code = c.getResponseCode();
            return new long[] { code, SystemClock.elapsedRealtime() - t0 };
        } catch (Exception e) {
            return new long[] { -1, 0 };
        } finally { if (c != null) c.disconnect(); }
    }

    /** The stream's own server: a TCP connect and HEAD / (never the stream path, so no slot is taken). Any answer, or a
     * reset, means it's there. {1 answered / -1 no answer / -2 the name doesn't resolve, ms} */
    static long[] hostCheck(String host, int port, int ms) {
        long t0 = SystemClock.elapsedRealtime();
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(host, port), ms);
            long t = SystemClock.elapsedRealtime() - t0;
            s.setSoTimeout(ms);
            try {
                OutputStream o = s.getOutputStream();
                o.write(("HEAD / HTTP/1.1\r\nHost: " + host + "\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
                o.flush();
                s.getInputStream().read();
            } catch (Exception ignored) {}   // connected is enough: a server that closes or resets is still answering
            return new long[] { 1, t };
        } catch (UnknownHostException e) {
            return new long[] { -2, 0 };
        } catch (ConnectException e) {
            String m = String.valueOf(e.getMessage());
            return m.contains("ECONNREFUSED") || m.contains("refused") ? new long[] { 1, SystemClock.elapsedRealtime() - t0 } : new long[] { -1, 0 };
        } catch (Exception e) {
            return new long[] { -1, 0 };
        }
    }

    /** Xtream's player_api.php: {1 JSON / 2 HTML / -1 no answer, ms, user_info} */
    static Object[] account(String api, int ms) {
        long t0 = SystemClock.elapsedRealtime();
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(api).openConnection();
            c.setConnectTimeout(ms);
            c.setReadTimeout(ms);
            c.getResponseCode();
            InputStream in = c.getResponseCode() >= 400 ? c.getErrorStream() : c.getInputStream();
            byte[] buf = new byte[256 * 1024];
            int n = 0, k;
            while (in != null && n < buf.length && (k = in.read(buf, n, buf.length - n)) > 0) n += k;
            long t = SystemClock.elapsedRealtime() - t0;
            String body = new String(buf, 0, n, StandardCharsets.UTF_8).trim();
            if (body.startsWith("<")) return new Object[] { 2, t, null };
            JSONObject u = new JSONObject(body).optJSONObject("user_info");
            return u == null ? new Object[] { 2, t, null } : new Object[] { 1, t, u };
        } catch (Exception e) {
            return new Object[] { -1, 0L, null };
        } finally { if (c != null) c.disconnect(); }
    }

    /** The router: a TCP connect to the default gateway, port 80 then 53 (a refusal is an answer too). */
    static int gateway(String gw) {
        for (int port : new int[] { 80, 53 }) {
            try (Socket s = new Socket()) { s.connect(new InetSocketAddress(gw, port), 1000); return 1; }
            catch (ConnectException e) { return 1; }
            catch (Exception ignored) {}
        }
        return -1;
    }

    /** Up to 25 MB for 3 s, the rate from the last 2 s (past TCP's start); the Wi-Fi link speed sampled through it. */
    static void speedTest(Context ctx, Probe p) {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(speedUrl).openConnection();
            c.setConnectTimeout(3000);
            c.setReadTimeout(3000);
            c.setUseCaches(false);
            int code = c.getResponseCode();
            if (code == 403 || code == 429 || code >= 500 || code >= 400) { p.speedState = 2; return; }
            InputStream in = c.getInputStream();
            byte[] buf = new byte[64 * 1024];
            long t0 = SystemClock.elapsedRealtime(), at1 = 0, got = 0, got1 = 0, nextLink = 0;
            int k;
            while ((k = in.read(buf)) > 0) {
                got += k;
                long t = SystemClock.elapsedRealtime() - t0;
                if (at1 == 0 && t >= 1000) { at1 = t; got1 = got; }
                if (t >= nextLink && ctx != null) { int[] w = wifi(ctx); if (w[1] > p.linkMax) p.linkMax = w[1]; nextLink = t + 500; }
                if (t >= 3000 || got >= SPEED_MAX) break;
            }
            long t = SystemClock.elapsedRealtime() - t0;
            double secs = at1 > 0 ? (t - at1) / 1000.0 : t / 1000.0;
            long bytes = at1 > 0 ? got - got1 : got;
            p.speed = secs > 0.2 ? bytes * 8 / secs / 1e6 : got * 8 / Math.max(0.2, t / 1000.0) / 1e6;
            p.speedFull = got >= SPEED_MAX;
            p.speedState = 1;
        } catch (Exception e) {
            p.speedState = 3;
        } finally { if (c != null) c.disconnect(); }
    }

    /** {RSSI (MIN_VALUE when unknown), receive link speed in Mbps (0 when unknown)} */
    @SuppressWarnings("deprecation")
    static int[] wifi(Context ctx) {
        try {
            WifiManager wm = (WifiManager) ctx.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            WifiInfo w = wm == null ? null : wm.getConnectionInfo();
            if (w == null || w.getNetworkId() == -1 && w.getRssi() <= -127) return new int[] { Integer.MIN_VALUE, 0 };
            int link = Build.VERSION.SDK_INT >= 29 ? w.getRxLinkSpeedMbps() : w.getLinkSpeed();
            int rssi = w.getRssi();
            return new int[] { rssi <= -127 ? Integer.MIN_VALUE : rssi, Math.max(0, link) };
        } catch (Exception e) { return new int[] { Integer.MIN_VALUE, 0 }; }
    }

    /** The best picture this TV's decoders play, for "Plays up to 4K HDR". */
    static String decoders(Context ctx) {
        boolean uhd = false;
        try {
            for (android.media.MediaCodecInfo ci : new android.media.MediaCodecList(android.media.MediaCodecList.REGULAR_CODECS).getCodecInfos()) {
                if (ci.isEncoder()) continue;
                for (String t : ci.getSupportedTypes()) {
                    if (!t.startsWith("video/")) continue;
                    android.media.MediaCodecInfo.VideoCapabilities v = ci.getCapabilitiesForType(t).getVideoCapabilities();
                    if (v != null && v.isSizeSupported(3840, 2160)) uhd = true;
                }
            }
        } catch (Exception ignored) {}
        boolean hdr = false;
        try {
            android.hardware.display.DisplayManager dm = (android.hardware.display.DisplayManager) ctx.getSystemService(Context.DISPLAY_SERVICE);
            android.view.Display d = dm == null ? null : dm.getDisplay(android.view.Display.DEFAULT_DISPLAY);
            hdr = d != null && d.getHdrCapabilities() != null && d.getHdrCapabilities().getSupportedHdrTypes().length > 0;
        } catch (Exception ignored) {}
        return (uhd ? "4K" : "HD") + (hdr ? " HDR" : "");
    }
}
