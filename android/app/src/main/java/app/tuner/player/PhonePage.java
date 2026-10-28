package app.tuner.player;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.LinkAddress;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.SystemClock;

import com.getcapacitor.JSObject;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * "Send a link from your phone" (design/ui-v1/addons/SPEC.md 3.5, PORT-NATIVE.md 5): a tiny HTTP server on the TV's
 * home-network address, only while that screen is open (and 10 minutes at most). The phone opens /<token> (from the
 * QR), or / and types the 6-digit code (5 wrong codes lock it until the app sends a new one), pastes an add-on's link
 * and sends it. The TV adds nothing on the phone's word: the app shows its own confirm.
 *
 * Plain http on the home network, the same trust as the first-run phone sign-in. Nothing here is written to Logcat.
 */
final class PhonePage {
    static final long LIFE_MS = 10 * 60 * 1000;
    static final int MAX_BODY = 2048, MAX_TRIES = 5;

    private static PhonePage running;

    private final ServerSocket ss;
    private final Consumer<JSObject> emit;
    private final String page;
    private final ExecutorService pool = Executors.newFixedThreadPool(3);
    // a whole request gets 10 s: a client sending a byte now and then can't hold a thread
    private final ScheduledExecutorService reaper = Executors.newSingleThreadScheduledExecutor();
    private volatile String token, code;
    // what the page asks for: "link" (an add-on's manifest link) or "tmdb" (the owner's TMDB key, home-final SPEC 6a)
    private volatile String kind = "link";
    private volatile int wrong;
    private volatile boolean locked, closed;
    private volatile long until;
    final String address;

    private PhonePage(ServerSocket ss, String address, String page, Consumer<JSObject> emit) {
        this.ss = ss;
        this.address = address;
        this.page = page;
        this.emit = emit;
    }

    /** Starts it, or (running already) swaps the code and token and gives it 10 more minutes. Returns "ip:port". */
    static synchronized String start(Context ctx, String token, String code, int port, Consumer<JSObject> emit) throws IOException { return start(ctx, token, code, port, "link", emit); }
    static synchronized String start(Context ctx, String token, String code, int port, String kind, Consumer<JSObject> emit) throws IOException {
        if (token == null || !token.matches("[A-Za-z0-9]{8,64}")) throw new IOException("bad token");
        if (code == null || !code.matches("\\d{6}")) throw new IOException("bad code");
        String k = "tmdb".equals(kind) ? "tmdb" : "link";
        if (running != null && !running.closed) {
            running.token = token;
            running.code = code;
            running.kind = k;
            running.wrong = 0;
            running.locked = false;
            running.until = SystemClock.elapsedRealtime() + LIFE_MS;
            return running.address;
        }
        InetAddress ip = homeAddress(ctx);
        if (ip == null) throw new IOException("Not on a home network");
        ServerSocket ss = null;
        IOException last = null;
        int p0 = port > 1023 && port < 65536 ? port : 8790;
        for (int p = p0; p < p0 + 5 && ss == null; p++) {   // (another app on 8790: the next free one)
            try {
                ServerSocket s = new ServerSocket();
                s.setReuseAddress(true);
                s.bind(new InetSocketAddress(ip, p), 8);
                ss = s;
            } catch (IOException e) { last = e; }
        }
        if (ss == null) throw last != null ? last : new IOException("No free port");
        String html = readPage(ctx);
        PhonePage pp = new PhonePage(ss, ip.getHostAddress() + ":" + ss.getLocalPort(), html, emit);
        pp.token = token;
        pp.code = code;
        pp.kind = k;
        pp.until = SystemClock.elapsedRealtime() + LIFE_MS;
        running = pp;
        Thread t = new Thread(pp::serve, "airglow-phone-page");
        t.setDaemon(true);
        t.start();
        return pp.address;
    }
    static synchronized void stop() {
        PhonePage pp = running;
        running = null;
        if (pp != null) pp.close();
    }
    static synchronized boolean isRunning() { return running != null && !running.closed; }

    private void close() {
        closed = true;
        try { ss.close(); } catch (IOException ignored) {}
        pool.shutdownNow();
        reaper.shutdownNow();
    }

    /** The TV's address on the home network: the active network's IPv4 when it is Wi-Fi or Ethernet. */
    static InetAddress homeAddress(Context ctx) {
        try {
            ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
            Network n = cm == null ? null : cm.getActiveNetwork();
            NetworkCapabilities nc = n == null ? null : cm.getNetworkCapabilities(n);
            if (nc != null && (nc.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) || nc.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET))) {
                LinkProperties lp = cm.getLinkProperties(n);
                if (lp != null) for (LinkAddress la : lp.getLinkAddresses()) {
                    InetAddress a = la.getAddress();
                    if (a instanceof Inet4Address && !a.isLoopbackAddress()) return a;
                }
            }
        } catch (Exception ignored) {}
        // (a TV that doesn't say: the first private IPv4 of an interface that is up)
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) if (a instanceof Inet4Address && a.isSiteLocalAddress()) return a;
            }
        } catch (Exception ignored) {}
        return null;
    }
    private static String readPage(Context ctx) throws IOException {
        try (InputStream in = ctx.getResources().openRawResource(R.raw.phone_page)) {
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int k;
            while ((k = in.read(buf)) > 0) b.write(buf, 0, k);
            return b.toString("UTF-8");
        }
    }

    private void serve() {
        try { ss.setSoTimeout(1000); } catch (IOException ignored) {}
        while (!closed) {
            if (SystemClock.elapsedRealtime() > until) { synchronized (PhonePage.class) { if (running == this) running = null; } close(); emit("closed", null); return; }
            try {
                Socket s = ss.accept();
                try { pool.execute(() -> handle(s)); } catch (Exception e) { try { s.close(); } catch (IOException ignored) {} }
            } catch (SocketTimeoutException ignored) {
            } catch (IOException e) { if (!closed) close(); return; }
        }
    }

    // ---------- one request ----------

    static final class Req { String method = "", path = ""; byte[] body = new byte[0]; boolean tooBig; }

    /** Reads a request line, the headers (8 KB at most) and a body of up to MAX_BODY bytes. */
    static Req read(InputStream in) throws IOException {
        ByteArrayOutputStream head = new ByteArrayOutputStream();
        int b, last4 = 0;
        while ((b = in.read()) >= 0) {
            head.write(b);
            last4 = (last4 << 8) | b;
            if (last4 == 0x0D0A0D0A || (last4 & 0xFFFF) == 0x0A0A) break;
            if (head.size() > 8192) throw new IOException("headers too big");
        }
        String h = head.toString("ISO-8859-1");
        String[] lines = h.split("\r?\n");
        Req r = new Req();
        String[] first = lines.length > 0 ? lines[0].split(" ") : new String[0];
        if (first.length < 2) throw new IOException("bad request");
        r.method = first[0];
        r.path = first[1];
        int q = r.path.indexOf('?');
        if (q >= 0) r.path = r.path.substring(0, q);
        long len = 0;
        for (int i = 1; i < lines.length; i++) {
            int c = lines[i].indexOf(':');
            if (c > 0 && lines[i].substring(0, c).trim().equalsIgnoreCase("content-length")) {
                try { len = Long.parseLong(lines[i].substring(c + 1).trim()); } catch (NumberFormatException e) { len = -1; }
            }
        }
        if (len < 0 || len > MAX_BODY) { r.tooBig = true; return r; }
        byte[] body = new byte[(int) len];
        int got = 0;
        while (got < len) { int k = in.read(body, got, (int) len - got); if (k < 0) break; got += k; }
        r.body = got == len ? body : java.util.Arrays.copyOf(body, got);
        return r;
    }

    private void handle(Socket s) {
        ScheduledFuture<?> cut = null;
        try { cut = reaper.schedule(() -> { try { s.close(); } catch (IOException ignored) {} }, 10, TimeUnit.SECONDS); } catch (Exception ignored) {}
        try (Socket sock = s) {
            sock.setSoTimeout(5000);
            Req r = read(new java.io.BufferedInputStream(sock.getInputStream()));
            OutputStream out = sock.getOutputStream();
            String tok = token;
            if (r.tooBig) { json(out, 413, "{\"error\":\"That's too long to be an add-on link.\"}"); return; }
            if ("GET".equals(r.method) && ("/".equals(r.path) || ("/" + tok).equals(r.path))) {
                boolean withToken = !"/".equals(r.path) && same(r.path.substring(1), tok);
                emit("visit", null);
                String html = page.replace("__TOKEN__", withToken ? tok : "").replace("__KIND__", kind);
                send(out, 200, "text/html; charset=utf-8", html.getBytes(StandardCharsets.UTF_8));
                return;
            }
            if ("POST".equals(r.method) && "/code".equals(r.path)) {
                synchronized (this) {
                    if (locked) { json(out, 423, "{\"error\":\"Too many wrong codes. Look at your TV for a new one.\"}"); return; }
                    String typed = "";
                    try { typed = new JSONObject(new String(r.body, StandardCharsets.UTF_8)).optString("code", ""); } catch (Exception ignored) {}
                    typed = typed.replaceAll("\\s", "");
                    if (same(typed, code)) { wrong = 0; json(out, 200, "{\"token\":\"" + tok + "\"}"); return; }
                    wrong++;
                    if (wrong >= MAX_TRIES) {
                        locked = true;
                        emit("locked", null);
                        json(out, 423, "{\"error\":\"Too many wrong codes. Look at your TV for a new one.\"}");
                        return;
                    }
                    json(out, 403, "{\"error\":\"That code isn't right.\",\"left\":" + (MAX_TRIES - wrong) + "}");
                    return;
                }
            }
            if ("POST".equals(r.method) && r.path.startsWith("/") && r.path.endsWith("/send") && same(r.path.substring(1, r.path.length() - 5), tok)) {
                String url = "";
                JSONObject body = null;
                try { body = new JSONObject(new String(r.body, StandardCharsets.UTF_8)); url = body.optString("url", ""); } catch (Exception ignored) {}
                if ("tmdb".equals(kind)) {
                    String key = tmdbKey(body == null ? "" : body.optString("key", url));
                    if (key == null) { json(out, 400, "{\"error\":\"That isn't a TMDB key. Copy the API Read Access Token from themoviedb.org.\"}"); return; }
                    emitKey(key);
                    json(out, 200, "{\"ok\":true,\"text\":\"Sent\"}");
                    return;
                }
                String ok = manifestLink(url);
                if (ok == null) { json(out, 400, "{\"error\":\"That isn't an add-on's link. It usually ends in manifest.json.\"}"); return; }
                emit("sent", ok);
                json(out, 200, "{\"ok\":true,\"text\":\"Sent\"}");
                return;
            }
            send(out, 404, "text/plain; charset=utf-8", "Not here".getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) {
        } finally { if (cut != null) cut.cancel(false); }
    }

    /** Only http(s)://…/manifest.json and stremio://…/manifest.json (rewritten to https://); anything else is null. */
    static String manifestLink(String url) {
        if (url == null) return null;
        String u = url.trim();
        if (u.isEmpty() || u.length() >= MAX_BODY) return null;
        if (u.regionMatches(true, 0, "stremio://", 0, 10)) u = "https://" + u.substring(10);
        if (!u.matches("(?i)https?://[^\\s/?#@]+(/[^\\s?#]*)?/manifest\\.json")) return null;
        return u;
    }
    /** A TMDB key as pasted: the API Read Access Token (a long JWT) or the 32-character API key; else null. */
    static String tmdbKey(String v) {
        if (v == null) return null;
        String k = v.trim().replaceFirst("(?i)^bearer\\s+", "").replaceAll("^[\"']|[\"']$", "");
        return k.matches("[A-Za-z0-9._-]{32,1024}") ? k : null;
    }
    /** Compares in constant time (the code and token). */
    static boolean same(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private void emit(String type, String url) {
        if (emit == null || closed && !"closed".equals(type)) return;
        JSObject e = new JSObject();
        e.put("type", type);
        if (url != null) e.put("url", url);
        try { emit.accept(e); } catch (Exception ignored) {}
    }
    private void emitKey(String key) {
        if (emit == null || closed) return;
        JSObject e = new JSObject();
        e.put("type", "key");
        e.put("key", key);
        try { emit.accept(e); } catch (Exception ignored) {}
    }
    private static void json(OutputStream out, int code, String body) throws IOException { send(out, code, "application/json; charset=utf-8", body.getBytes(StandardCharsets.UTF_8)); }
    private static void send(OutputStream out, int code, String type, byte[] body) throws IOException {
        String reason = code == 200 ? "OK" : code == 400 ? "Bad Request" : code == 403 ? "Forbidden" : code == 404 ? "Not Found" : code == 413 ? "Payload Too Large" : code == 423 ? "Locked" : "Error";
        String h = "HTTP/1.1 " + code + " " + reason + "\r\n"
                + "Content-Type: " + type + "\r\n"
                + "Content-Length: " + body.length + "\r\n"
                + "Cache-Control: no-store\r\n"
                + "X-Content-Type-Options: nosniff\r\n"
                + "Referrer-Policy: no-referrer\r\n"
                + "X-Frame-Options: DENY\r\n"
                + "Connection: close\r\n\r\n";
        out.write(h.getBytes(StandardCharsets.ISO_8859_1));
        out.write(body);
        out.flush();
    }
}
