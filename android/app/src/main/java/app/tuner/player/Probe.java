package app.tuner.player;

import android.content.Context;
import android.net.Uri;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;
import android.os.SystemClock;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.media3.common.C;
import androidx.media3.common.Format;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.Timeline;
import androidx.media3.common.TrackGroup;
import androidx.media3.container.NalUnitUtil;
import androidx.media3.datasource.DataSource;
import androidx.media3.datasource.DataSpec;
import androidx.media3.datasource.TransferListener;
import androidx.media3.exoplayer.analytics.PlayerId;
import androidx.media3.exoplayer.audio.AudioCapabilities;
import androidx.media3.exoplayer.mediacodec.MediaCodecInfo;
import androidx.media3.exoplayer.mediacodec.MediaCodecSelector;
import androidx.media3.exoplayer.mediacodec.MediaCodecUtil;
import androidx.media3.exoplayer.source.MediaPeriod;
import androidx.media3.exoplayer.source.MediaSource;
import androidx.media3.exoplayer.source.ProgressiveMediaSource;
import androidx.media3.exoplayer.source.TrackGroupArray;
import androidx.media3.exoplayer.upstream.DefaultAllocator;
import androidx.media3.exoplayer.upstream.LoadErrorHandlingPolicy;
import androidx.media3.extractor.DefaultExtractorsFactory;
import androidx.media3.extractor.mkv.MatroskaExtractor;

import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The quality check (design/ui-v1/subtitles/SPEC.md 5.1, PORT-NATIVE.md 1): the first and last 64 KiB of a copy, read
 * with two range requests (one connection at a time, each closed before the next opens), give its size and its
 * OpenSubtitles fingerprint; a ProgressiveMediaSource prepared over those bytes (HTTP for anything else, capped) gives
 * its duration and its tracks. One check at a time, a 6 s wall-clock limit, cancelled by any play().
 * Also "plays on this TV" for stored formats (PORT-NATIVE.md 1.5).
 */
final class Probe {
    static final int BLOCK = 65536;
    static final long CAP = 1 << 20;          // HTTP reads per check past the two blocks
    static final long MOOV_CAP = 8L << 20;    // one moov read when the box walk shows it after the mdat
    static final long TIMEOUT_MS = 6000;

    interface Done { void done(JSObject result); }

    private static Probe running;
    private static Handler MAIN;   // (made on first use: the JVM unit tests load this class without Android)

    /** Starts a check; false when one is running already (the caller rejects with "busy"). */
    static synchronized boolean start(Context ctx, String id, String url, Map<String, String> headers, Done done) {
        if (running != null) return false;
        Probe p = new Probe(ctx, id, url, headers, done);
        running = p;
        p.go();
        return true;
    }
    /** play() and probeCancel(): the socket is closed first, then the check answers couldnt / cancelled. */
    static void cancelRunning(String why) {
        Probe p;
        synchronized (Probe.class) { p = running; }
        if (p != null) p.cancel(why);
    }
    static synchronized boolean busy() { return running != null; }

    private final Context ctx;
    private final String id, url;
    private final Map<String, String> headers;
    private final Done done;
    private final long t0 = SystemClock.elapsedRealtime();
    private volatile boolean over;
    private volatile String stopWhy;
    private volatile HttpURLConnection conn;
    private HandlerThread thread;
    private Handler h;
    // what the reads found
    byte[] head = new byte[0], tail;
    long size;
    String etag = "";
    boolean ranged;          // the head came back 206
    String container = "";
    boolean moovAfterMdat;
    // the parse
    private MediaSource source;
    private MediaPeriod period;
    private Timeline timeline;
    private long httpRead;

    private Probe(Context ctx, String id, String url, Map<String, String> headers, Done done) {
        this.ctx = ctx.getApplicationContext();
        this.id = id;
        this.url = url;
        this.headers = headers;
        this.done = done;
    }

    private void go() {
        if (MAIN == null) MAIN = new Handler(Looper.getMainLooper());
        thread = new HandlerThread("probe");
        thread.start();
        h = new Handler(thread.getLooper());
        MAIN.postDelayed(timedOut, TIMEOUT_MS);
        h.post(this::reads);
    }
    private final Runnable timedOut = () -> cancel("timeout");
    void cancel(String why) {
        if (over) return;
        stopWhy = why;
        HttpURLConnection c = conn;
        if (c != null) try { c.disconnect(); } catch (Exception ignored) {}
        JSObject r = base("couldnt");
        r.put("why", why);
        finish(r);
    }

    private JSObject base(String status) {
        JSObject r = new JSObject();
        r.put("id", id);
        r.put("status", status);
        r.put("size", size);
        r.put("etag", etag == null ? "" : etag);
        r.put("hash", "");
        r.put("dur", 0);
        r.put("formats", JSONObject.NULL);
        r.put("why", "");
        return r;
    }
    private void finish(JSObject r) {
        synchronized (this) { if (over) return; over = true; }
        r.put("ms", SystemClock.elapsedRealtime() - t0);
        MAIN.removeCallbacks(timedOut);
        synchronized (Probe.class) { if (running == this) running = null; }
        HttpURLConnection c = conn;
        if (c != null) try { c.disconnect(); } catch (Exception ignored) {}
        Diag.closedAt = SystemClock.elapsedRealtime();   // the provider's count of this TV's streams takes a moment to drop
        // the parse is released on its own thread, then the thread ends
        Handler hh = h;
        if (hh != null) hh.post(() -> {
            try { if (period != null && source != null) source.releasePeriod(period); } catch (Exception ignored) {}
            try { if (source != null) source.releaseSource(caller); } catch (Exception ignored) {}
            period = null; source = null;
            thread.quitSafely();
        });
        try { done.done(r); } catch (Exception ignored) {}
    }

    // ---------- 1.2: the reads ----------
    private HttpURLConnection open(String range) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setInstanceFollowRedirects(true);
        c.setConnectTimeout(4000);
        c.setReadTimeout(4000);
        c.setUseCaches(false);
        c.setRequestProperty("Accept-Encoding", "identity");
        if (range != null) c.setRequestProperty("Range", range);
        if (headers != null) for (Map.Entry<String, String> e : headers.entrySet()) if (e.getValue() != null && !e.getValue().isEmpty()) c.setRequestProperty(e.getKey(), e.getValue());
        conn = c;
        if (over) { c.disconnect(); throw new IOException(stopWhy == null ? "stopped" : stopWhy); }
        return c;
    }
    private static final Pattern RANGE = Pattern.compile("bytes\\s+(\\d+)-(\\d+)/(\\d+|\\*)", Pattern.CASE_INSENSITIVE);
    static boolean refusedCode(int code) { return code == 401 || code == 403 || code == 429 || code == 458 || code == 509 || code >= 500; }
    static boolean saysMaxConnections(String body) { return body != null && Pattern.compile("max(imum)?[ _-]*(number of )?connection", Pattern.CASE_INSENSITIVE).matcher(body).find(); }

    /** Reads up to n bytes (stops at n: the connection is closed right after). */
    private static byte[] readUpTo(InputStream in, int n) throws IOException {
        byte[] b = new byte[n];
        int got = 0, k;
        while (got < n && (k = in.read(b, got, n - got)) > 0) got += k;
        if (got == n) return b;
        byte[] out = new byte[got];
        System.arraycopy(b, 0, out, 0, got);
        return out;
    }
    private static String bodyOf(HttpURLConnection c) {
        try {
            InputStream in = c.getErrorStream() != null ? c.getErrorStream() : c.getInputStream();
            return in == null ? "" : new String(readUpTo(in, 2048), "UTF-8");
        } catch (Exception e) { return ""; }
    }

    private void reads() {
        try {
            // the head
            HttpURLConnection c = open("bytes=0-" + (BLOCK - 1));
            int code = c.getResponseCode();
            etag = c.getHeaderField("ETag");
            if (refusedCode(code)) { JSObject r = base("refused"); r.put("why", String.valueOf(code)); c.disconnect(); conn = null; finish(r); return; }
            if (code == 206) {
                Matcher m = RANGE.matcher(String.valueOf(c.getHeaderField("Content-Range")));
                if (!m.find() || "*".equals(m.group(3)) || Long.parseLong(m.group(1)) != 0) { JSObject r = base("couldnt"); r.put("why", "head range"); c.disconnect(); conn = null; finish(r); return; }
                size = Long.parseLong(m.group(3));
                head = readUpTo(c.getInputStream(), (int) Math.min(BLOCK, size));
                ranged = true;
            } else if (code == 200) {
                size = Math.max(0, c.getContentLengthLong());
                String type = String.valueOf(c.getContentType()).toLowerCase(Locale.ROOT);
                head = readUpTo(c.getInputStream(), BLOCK);
                if ((type.startsWith("text/") || type.contains("json") || type.contains("html")) && saysMaxConnections(new String(head, 0, Math.min(head.length, 2048), "UTF-8"))) {
                    JSObject r = base("refused"); r.put("why", "max connections"); c.disconnect(); conn = null; finish(r); return;
                }
            } else {
                String body = bodyOf(c);
                JSObject r = base(saysMaxConnections(body) ? "refused" : "couldnt");
                r.put("why", saysMaxConnections(body) ? "max connections" : String.valueOf(code));
                c.disconnect(); conn = null; finish(r); return;
            }
            c.disconnect();
            conn = null;
            if (over) return;
            // the tail: a 206 naming exactly that range, or the check stops (a 200 would hand over the first 64 KiB)
            if (ranged && size > BLOCK) {
                long a = size - BLOCK, b = size - 1;
                c = open("bytes=" + a + "-" + b);
                code = c.getResponseCode();
                Matcher m = RANGE.matcher(String.valueOf(c.getHeaderField("Content-Range")));
                boolean exact = code == 206 && m.find() && Long.parseLong(m.group(1)) == a && Long.parseLong(m.group(2)) == b && String.valueOf(size).equals(m.group(3));
                if (!exact) {
                    JSObject r = base(refusedCode(code) ? "refused" : "couldnt");
                    r.put("why", refusedCode(code) ? String.valueOf(code) : "tail " + code);
                    c.disconnect(); conn = null; finish(r); return;
                }
                tail = readUpTo(c.getInputStream(), BLOCK);
                c.disconnect();
                conn = null;
                if (tail.length != BLOCK) { JSObject r = base("couldnt"); r.put("why", "tail short"); finish(r); return; }
            }
            if (over) return;
            container = containerOf(head);
            moovAfterMdat = "mp4".equals(container) && moovAfterMdat(head);
            parse();
        } catch (Exception e) {
            if (over) return;
            JSObject r = base("couldnt");
            r.put("why", e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
            finish(r);
        }
    }

    // ---------- 1.2.3: the parse ----------
    private final MediaSource.MediaSourceCaller caller = (src, tl) -> {
        timeline = tl;
        if (period == null && !over && !tl.isEmpty()) {
            period = src.createPeriod(new MediaSource.MediaPeriodId(tl.getUidOfPeriod(0)), new DefaultAllocator(true, C.DEFAULT_BUFFER_SEGMENT_SIZE), 0);
            period.prepare(new MediaPeriod.Callback() {
                @Override public void onPrepared(@NonNull MediaPeriod p) { prepared(p.getTrackGroups()); }
                // until it's prepared it reads on (within the caps); then everything is released
                @Override public void onContinueLoadingRequested(@NonNull MediaPeriod p) { if (!over) p.continueLoading(new androidx.media3.exoplayer.LoadingInfo.Builder().setPlaybackPositionUs(0).build()); }
            }, 0);
        }
    };
    private static final LoadErrorHandlingPolicy NO_RETRY = new LoadErrorHandlingPolicy() {
        @Nullable @Override public FallbackSelection getFallbackSelectionFor(@NonNull FallbackOptions o, @NonNull LoadErrorInfo i) { return null; }
        @Override public long getRetryDelayMsFor(@NonNull LoadErrorInfo i) { return C.TIME_UNSET; }
        @Override public int getMinimumLoadableRetryCount(int dataType) { return 0; }
    };
    private long idleSince;
    private final Runnable poll = new Runnable() {
        @Override public void run() {
            if (over) return;
            try {
                if (source != null) source.maybeThrowSourceInfoRefreshError();
                if (period != null) period.maybeThrowPrepareError();
            } catch (IOException e) {
                failParse(e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
                return;
            }
            // (a head-only copy whose head doesn't say enough: the reads end and nothing is prepared)
            if (period != null && !period.isLoading()) { if (idleSince == 0) idleSince = SystemClock.elapsedRealtime(); else if (SystemClock.elapsedRealtime() - idleSince > 400) { failParse("the head doesn't say"); return; } }
            else idleSince = 0;
            h.postDelayed(this, 100);
        }
    };
    /** The tracks couldn't be read: a head-only copy says so ("doesn't allow a quick look"); a ranged one couldn't be
     * checked, though its size and fingerprint are still sent. */
    private void failParse(String why) {
        JSObject r = base(ranged ? "couldnt" : "head-only");
        r.put("why", why);
        r.put("hash", hash());
        finish(r);
    }
    private void parse() {
        DefaultExtractorsFactory ef = new DefaultExtractorsFactory().setMatroskaExtractorFlags(MatroskaExtractor.FLAG_DISABLE_SEEK_FOR_CUES);
        source = new ProgressiveMediaSource.Factory(Bytes::new, ef)
                .setLoadErrorHandlingPolicy(NO_RETRY)
                .setContinueLoadingCheckIntervalBytes(256 * 1024)
                .createMediaSource(MediaItem.fromUri(Uri.parse(url)));
        source.prepareSource(caller, null, PlayerId.UNSET);
        h.postDelayed(poll, 100);
    }
    private String hash() { return ranged && tail != null && head.length == BLOCK && size >= BLOCK ? movieHash(size, head, tail) : ""; }

    private void prepared(TrackGroupArray groups) {
        if (over) return;
        JSObject r = base(ranged ? "ok" : "head-only");
        r.put("hash", hash());
        long durUs = C.TIME_UNSET;
        if (timeline != null && !timeline.isEmpty()) durUs = timeline.getWindow(0, new Timeline.Window()).durationUs;
        r.put("dur", durUs == C.TIME_UNSET || durUs <= 0 ? 0 : Math.round(durUs / 1e5) / 10.0);
        try { r.put("formats", formats(groups)); } catch (Exception e) { r.put("formats", JSONObject.NULL); r.put("why", "formats: " + e.getMessage()); }
        finish(r);
    }

    // ---------- 1.3: formats ----------
    private JSONObject formats(TrackGroupArray groups) throws Exception {
        List<Ebml.Track> mk = "mkv".equals(container) || "webm".equals(container) ? Ebml.tracks(head) : Collections.emptyList();
        JSONObject out = new JSONObject();
        out.put("container", container);
        JSONObject video = null;
        JSONArray audio = new JSONArray(), text = new JSONArray();
        int na = 0, nt = 0;
        for (int i = 0; i < groups.length; i++) {
            TrackGroup g = groups.get(i);
            Format f = g.getFormat(0);
            int type = g.type;
            if (type == C.TRACK_TYPE_VIDEO && video == null) {
                video = new JSONObject();
                video.put("mime", nz(f.sampleMimeType));
                video.put("codecs", nz(f.codecs));
                video.put("w", Math.max(0, f.width));
                video.put("h", Math.max(0, f.height));
                video.put("fps", f.frameRate > 0 ? Math.round(f.frameRate * 1000) / 1000.0 : 0);
                video.put("transfer", transfer(f));
                int[] dv = dolbyVision(f);
                if (dv == null) video.put("dv", JSONObject.NULL);
                else { JSONObject d = new JSONObject(); d.put("profile", dv[0]); d.put("level", dv[1]); video.put("dv", d); }
            } else if (type == C.TRACK_TYPE_AUDIO) {
                JSONObject a = new JSONObject();
                String mime = nz(f.sampleMimeType);
                a.put("mime", mime);
                a.put("codecs", nz(f.codecs));
                a.put("ch", Math.max(0, f.channelCount));
                a.put("rate", Math.max(0, f.sampleRate));
                a.put("lang", nz(f.language));
                a.put("tagged", tagged(f, mk, 2, na++));
                a.put("atmos", MimeTypes.AUDIO_E_AC3_JOC.equals(mime) || (MimeTypes.AUDIO_TRUEHD.equals(mime) && nz(f.codecs).toLowerCase(Locale.ROOT).contains("atmos")));
                a.put("label", nz(f.label));
                audio.put(a);
            } else if (type == C.TRACK_TYPE_TEXT) {
                JSONObject t = new JSONObject();
                String mime = nz(f.sampleMimeType);
                if (MimeTypes.APPLICATION_MEDIA3_CUES.equals(mime) && f.codecs != null) mime = f.codecs;   // (parsed while extracting: the original is in codecs)
                t.put("mime", mime);
                t.put("lang", nz(f.language));
                t.put("tagged", tagged(f, mk, 17, nt++));
                t.put("forced", (f.selectionFlags & C.SELECTION_FLAG_FORCED) != 0);
                t.put("label", nz(f.label));
                text.put(t);
            }
        }
        out.put("video", video == null ? JSONObject.NULL : video);
        out.put("audio", audio);
        out.put("text", text);
        return out;
    }
    private static String nz(String s) { return s == null ? "" : s; }
    /** Whether the track's language was really in the file: Matroska's Language element (Media3 says "eng" when it's
     * missing), else a language other than "und". */
    private static boolean tagged(Format f, List<Ebml.Track> mk, int type, int nth) {
        if (!mk.isEmpty()) {
            Ebml.Track hit = null;
            for (Ebml.Track t : mk) if (t.type == type && f.id != null && f.id.equals(String.valueOf(t.number))) { hit = t; break; }
            if (hit == null) { int k = 0; for (Ebml.Track t : Ebml.sorted(mk)) if (t.type == type && k++ == nth) { hit = t; break; } }
            if (hit != null) return hit.tagged;
        }
        return f.language != null && !f.language.isEmpty() && !"und".equals(f.language);
    }
    static String transfer(Format f) {
        if (f.colorInfo != null && f.colorInfo.colorTransfer != Format.NO_VALUE) return transferName(f.colorInfo.colorTransfer);
        // HEVC with no colour info: the SPS in the initialisation data (one start-coded VPS / SPS / PPS buffer in MKV)
        boolean hevc = MimeTypes.VIDEO_H265.equals(f.sampleMimeType) || MimeTypes.VIDEO_DOLBY_VISION.equals(f.sampleMimeType);
        if (hevc) for (byte[] b : f.initializationData) {
            int[] sps = spsNal(b);
            if (sps == null) continue;
            try {
                NalUnitUtil.H265SpsData d = NalUnitUtil.parseH265SpsNalUnit(b, sps[0], sps[1], null);
                if (d.colorTransfer != Format.NO_VALUE) return transferName(d.colorTransfer);
            } catch (Exception ignored) {}
        }
        return "";
    }
    private static String transferName(int t) {
        return t == C.COLOR_TRANSFER_ST2084 ? "pq" : t == C.COLOR_TRANSFER_HLG ? "hlg" : t == C.COLOR_TRANSFER_SDR || t == C.COLOR_TRANSFER_GAMMA_2_2 || t == C.COLOR_TRANSFER_LINEAR ? "sdr" : "";
    }
    /** The HEVC SPS (NAL type 33) in a start-coded buffer: [start, end) without its start code, or null. A buffer that
     * is one bare NAL (no start code) is taken as it is. */
    static int[] spsNal(byte[] b) {
        if (b == null || b.length < 3) return null;
        int start = -1;
        for (int i = 0; i + 3 < b.length; i++) {
            if (b[i] == 0 && b[i + 1] == 0 && b[i + 2] == 1) {
                if (start >= 0) { int end = i; if (end > start && b[end - 1] == 0) end--; return new int[] { start, end }; }
                int n = i + 3;
                if (((b[n] >> 1) & 0x3f) == 33) start = n;
                i += 2;
            }
        }
        if (start >= 0) return new int[] { start, b.length };
        if (((b[0] >> 1) & 0x3f) == 33) return new int[] { 0, b.length };
        return null;
    }
    /** Dolby Vision from the MIME type and codecs ("dvhe.08.06" -> profile 8, level 6), or null. */
    static int[] dolbyVision(Format f) {
        String c = nz(f.codecs).toLowerCase(Locale.ROOT);
        boolean dv = MimeTypes.VIDEO_DOLBY_VISION.equals(f.sampleMimeType) || c.startsWith("dvhe") || c.startsWith("dvh1") || c.startsWith("dvav") || c.startsWith("dva1") || c.startsWith("dav1");
        if (!dv) return null;
        int prof = 0, lvl = 0;
        String[] p = c.split("\\.");
        try { if (p.length > 1) prof = Integer.parseInt(p[1]); if (p.length > 2) lvl = Integer.parseInt(p[2]); } catch (Exception ignored) {}
        return new int[] { prof, lvl };
    }

    // ---------- the head's own bytes ----------
    static String containerOf(byte[] b) {
        if (b.length >= 4 && (b[0] & 0xff) == 0x1a && (b[1] & 0xff) == 0x45 && (b[2] & 0xff) == 0xdf && (b[3] & 0xff) == 0xa3) {
            String s = new String(b, 0, Math.min(b.length, 64), java.nio.charset.StandardCharsets.ISO_8859_1);
            return s.contains("webm") ? "webm" : "mkv";
        }
        if (b.length >= 8) {
            String t = new String(b, 4, 4, java.nio.charset.StandardCharsets.ISO_8859_1);
            if (t.equals("ftyp") || t.equals("moov") || t.equals("mdat") || t.equals("free") || t.equals("wide") || t.equals("skip")) return "mp4";
        }
        if (b.length > 376 && b[0] == 0x47 && b[188] == 0x47 && b[376] == 0x47) return "ts";
        return "";
    }
    /** The top-level box walk: an mdat before any moov (the moov is at the end: one bigger read is allowed for it). */
    static boolean moovAfterMdat(byte[] b) {
        long p = 0;
        while (p + 8 <= b.length) {
            long sz = ((b[(int) p] & 0xffL) << 24) | ((b[(int) p + 1] & 0xffL) << 16) | ((b[(int) p + 2] & 0xffL) << 8) | (b[(int) p + 3] & 0xffL);
            String t = new String(b, (int) p + 4, 4, java.nio.charset.StandardCharsets.ISO_8859_1);
            if (t.equals("moov")) return false;
            if (t.equals("mdat")) return true;
            if (sz == 1 && p + 16 <= b.length) { sz = ByteBuffer.wrap(b, (int) p + 8, 8).getLong(); }
            else if (sz == 0) return false;
            if (sz < 8) return false;
            p += sz;
        }
        return false;
    }

    // ---------- 1.4: OpenSubtitles' moviehash ----------
    static String movieHash(long size, byte[] head, byte[] tail) {   // each exactly 65536 bytes
        long h = size;
        ByteBuffer a = ByteBuffer.wrap(head).order(ByteOrder.LITTLE_ENDIAN), b = ByteBuffer.wrap(tail).order(ByteOrder.LITTLE_ENDIAN);
        for (int i = 0; i < BLOCK / 8; i++) h += a.getLong() + b.getLong();   // long overflow is the mod 2^64
        return String.format("%016x", h);
    }

    // ---------- the data source: the two blocks from memory, the rest over HTTP within the caps ----------
    private final class Bytes implements DataSource {
        private Uri uri;
        private long pos, end;             // end: exclusive, or -1 when unknown (head-only)
        private InputStream in;
        private HttpURLConnection c;
        private long inUntil;              // the HTTP read's exclusive end
        @Override public void addTransferListener(@NonNull TransferListener l) {}
        @Override public long open(@NonNull DataSpec spec) throws IOException {
            if (over) throw new IOException("stopped");
            uri = spec.uri;
            pos = spec.position;
            if (!ranged) {   // head-only: what the head has, of an unknown length (no reads past it: the server ignores ranges)
                end = -1;
                if (pos >= head.length) throw new IOException("past the head");
                return spec.length != C.LENGTH_UNSET ? spec.length : C.LENGTH_UNSET;
            }
            end = spec.length != C.LENGTH_UNSET ? Math.min(size, pos + spec.length) : size;
            return end - pos;
        }
        @Override public int read(@NonNull byte[] buf, int off, int len) throws IOException {
            if (len == 0) return 0;
            if (over) throw new IOException("stopped");
            if (!ranged) {
                if (pos >= head.length) return C.RESULT_END_OF_INPUT;
                int n = (int) Math.min(len, head.length - pos);
                System.arraycopy(head, (int) pos, buf, off, n);
                pos += n;
                return n;
            }
            if (pos >= end) return C.RESULT_END_OF_INPUT;
            long tailAt = tail != null ? size - BLOCK : size;
            if (pos < head.length) {
                int n = (int) Math.min(Math.min(len, head.length - pos), end - pos);
                System.arraycopy(head, (int) pos, buf, off, n);
                pos += n;
                return n;
            }
            if (tail != null && pos >= tailAt) {
                int n = (int) Math.min(len, end - pos);
                System.arraycopy(tail, (int) (pos - tailAt), buf, off, n);
                pos += n;
                return n;
            }
            // between the blocks: one HTTP read up to where the tail starts (1 MiB in all, 8 MiB more for a moov at the end)
            long cap = CAP + (moovAfterMdat ? MOOV_CAP : 0);
            if (httpRead >= cap) { closeHttp(); throw new IOException("over the read cap"); }
            if (in == null || pos >= inUntil) {
                closeHttp();
                long until = Math.min(end, tailAt);
                c = Probe.this.open("bytes=" + pos + "-" + (until - 1));
                int code = c.getResponseCode();
                Matcher m = RANGE.matcher(String.valueOf(c.getHeaderField("Content-Range")));
                if (code != 206 || !m.find() || Long.parseLong(m.group(1)) != pos) { closeHttp(); throw new IOException("middle " + code); }
                in = c.getInputStream();
                inUntil = until;
            }
            int want = (int) Math.min(Math.min(len, inUntil - pos), cap - httpRead);
            int n = in.read(buf, off, want);
            if (n < 0) { closeHttp(); throw new IOException("ended early"); }
            pos += n;
            httpRead += n;
            return n;
        }
        private void closeHttp() {
            if (c != null) { try { c.disconnect(); } catch (Exception ignored) {} if (conn == c) conn = null; }
            c = null; in = null;
        }
        @Nullable @Override public Uri getUri() { return uri; }
        @Override public void close() { closeHttp(); }
    }

    // ---------- 1.5: plays on this TV, from stored formats and the audio route now ----------
    static JSObject playable(Context ctx, JSONArray copies) {
        JSObject out = new JSObject();
        AudioCapabilities caps;
        try { caps = AudioCapabilities.getCapabilities(ctx, androidx.media3.common.AudioAttributes.DEFAULT, null); }
        catch (Throwable t) { caps = AudioCapabilities.DEFAULT_AUDIO_CAPABILITIES; }
        for (int i = 0; copies != null && i < copies.length(); i++) {
            JSONObject c = copies.optJSONObject(i);
            if (c == null) continue;
            JSONObject f = c.optJSONObject("formats");
            JSObject r = new JSObject();
            boolean video = true, audio = true;
            String reason = "";
            if (f != null) {
                JSONObject v = f.optJSONObject("video");
                if (v != null && !v.optString("mime").isEmpty()) video = videoPlays(v);
                JSONArray a = f.optJSONArray("audio");
                if (a != null && a.length() > 0) {
                    audio = false;
                    for (int k = 0; k < a.length() && !audio; k++) { JSONObject t = a.optJSONObject(k); if (t != null) audio = audioPlays(t, caps); }
                }
            }
            if (!video) reason = "no-picture"; else if (!audio) reason = "no-sound";
            r.put("video", video);
            r.put("audio", audio);
            r.put("reason", reason);
            out.put(c.optString("id"), r);
        }
        return out;
    }
    private static boolean videoPlays(JSONObject v) {
        Format f = new Format.Builder().setSampleMimeType(v.optString("mime")).setCodecs(v.optString("codecs").isEmpty() ? null : v.optString("codecs"))
                .setWidth(v.optInt("w", Format.NO_VALUE) > 0 ? v.optInt("w") : Format.NO_VALUE)
                .setHeight(v.optInt("h", Format.NO_VALUE) > 0 ? v.optInt("h") : Format.NO_VALUE)
                .setFrameRate(v.optDouble("fps", 0) > 0 ? (float) v.optDouble("fps") : Format.NO_VALUE).build();
        try {
            // as the player runs: soft matching first, then (decoder fallback on) the alternative MIME type, which for Dolby
            // Vision profile 8 is HEVC (its HDR10 base) and for profile 5 is none
            List<MediaCodecInfo> list = new ArrayList<>(MediaCodecUtil.getDecoderInfosSoftMatch(MediaCodecSelector.DEFAULT, f, false, false));
            list.addAll(MediaCodecUtil.getAlternativeDecoderInfos(MediaCodecSelector.DEFAULT, f, false, false));
            for (MediaCodecInfo i : list) if (i.isFormatSupported(f)) return true;
            // a decoder that would try it at a lower level counts too (the player falls back the same way)
            if (!list.isEmpty() && f.width > 0) for (MediaCodecInfo i : list) if (i.isVideoSizeAndRateSupportedV21(f.width, f.height, f.frameRate > 0 ? f.frameRate : 30)) return true;
            return false;
        } catch (Exception e) { return true; }
    }
    private static boolean audioPlays(JSONObject a, AudioCapabilities caps) {
        String mime = a.optString("mime");
        if (mime.isEmpty()) return true;
        Format f = new Format.Builder().setSampleMimeType(mime).setCodecs(a.optString("codecs").isEmpty() ? null : a.optString("codecs"))
                .setChannelCount(a.optInt("ch", 0) > 0 ? a.optInt("ch") : Format.NO_VALUE)
                .setSampleRate(a.optInt("rate", 0) > 0 ? a.optInt("rate") : Format.NO_VALUE).build();
        try {
            if (caps.isPassthroughPlaybackSupported(f, androidx.media3.common.AudioAttributes.DEFAULT)) return true;
        } catch (Throwable ignored) {}
        try {
            for (MediaCodecInfo i : MediaCodecUtil.getDecoderInfos(mime, false, false)) if (i.isFormatSupported(f)) return true;
        } catch (Exception ignored) {}
        return false;
    }

    // ---------- the Matroska header walk: which tracks really have a language ----------
    static final class Ebml {
        static final class Track { long number; int type; boolean tagged, forced; String lang = ""; }
        static List<Track> sorted(List<Track> l) { List<Track> s = new ArrayList<>(l); Collections.sort(s, (x, y) -> Long.compare(x.number, y.number)); return s; }
        /** [value, length]; an ID keeps its marker bit, a size doesn't (all ones: unknown, -1). */
        private static long[] vint(byte[] b, int p, boolean id) {
            if (p >= b.length) return null;
            int first = b[p] & 0xff, len = 1;
            while (len <= 8 && (first & (0x80 >> (len - 1))) == 0) len++;
            if (len > 8 || p + len > b.length) return null;
            long v = id ? first : first & (0xff >> len);
            boolean ones = v == (0xff >> len);
            for (int i = 1; i < len; i++) { v = (v << 8) | (b[p + i] & 0xff); if ((b[p + i] & 0xff) != 0xff) ones = false; }
            return new long[] { !id && ones ? -1 : v, len };
        }
        private static long uint(byte[] b, int p, long n) { long v = 0; for (int i = 0; i < n && p + i < b.length; i++) v = (v << 8) | (b[p + i] & 0xff); return v; }
        static List<Track> tracks(byte[] b) {
            List<Track> out = new ArrayList<>();
            try {
                int p = 0;
                long[] id = vint(b, p, true), sz;
                if (id == null || id[0] != 0x1A45DFA3L) return out;
                sz = vint(b, p + (int) id[1], false);
                p += id[1] + sz[1] + sz[0];
                id = vint(b, p, true);
                if (id == null || id[0] != 0x18538067L) return out;
                sz = vint(b, p + (int) id[1], false);
                p += id[1] + sz[1];
                while (p < b.length) {
                    id = vint(b, p, true);
                    if (id == null) break;
                    sz = vint(b, p + (int) id[1], false);
                    if (sz == null) break;
                    int body = p + (int) id[1] + (int) sz[1];
                    if (id[0] == 0x1654AE6BL) { entries(b, body, sz[0] < 0 ? b.length : (int) Math.min(b.length, body + sz[0]), out); break; }
                    if (id[0] == 0x1F43B675L || sz[0] < 0) break;   // a Cluster: the tracks come before
                    p = (int) Math.min(Integer.MAX_VALUE, body + sz[0]);
                }
            } catch (Exception ignored) {}
            return out;
        }
        private static void entries(byte[] b, int p, int end, List<Track> out) {
            while (p < end) {
                long[] id = vint(b, p, true);
                if (id == null) return;
                long[] sz = vint(b, p + (int) id[1], false);
                if (sz == null || sz[0] < 0) return;
                int body = p + (int) id[1] + (int) sz[1], stop = (int) Math.min(end, body + sz[0]);
                if (id[0] == 0xAEL) {
                    Track t = new Track();
                    int q = body;
                    while (q < stop) {
                        long[] cid = vint(b, q, true);
                        if (cid == null) break;
                        long[] cs = vint(b, q + (int) cid[1], false);
                        if (cs == null || cs[0] < 0) break;
                        int cb = q + (int) cid[1] + (int) cs[1];
                        if (cid[0] == 0xD7L) t.number = uint(b, cb, cs[0]);
                        else if (cid[0] == 0x83L) t.type = (int) uint(b, cb, cs[0]);
                        else if (cid[0] == 0x22B59CL || cid[0] == 0x22B59DL) { t.tagged = true; t.lang = new String(b, cb, (int) Math.min(cs[0], b.length - cb), java.nio.charset.StandardCharsets.US_ASCII).trim(); }
                        else if (cid[0] == 0x55AAL) t.forced = uint(b, cb, cs[0]) != 0;
                        q = cb + (int) cs[0];
                    }
                    out.add(t);
                }
                if (stop >= end && body + sz[0] > end) return;   // (cut by the head)
                p = stop;
            }
        }
    }
}
