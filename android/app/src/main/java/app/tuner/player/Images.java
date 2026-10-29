package app.tuner.player;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import android.util.LruCache;
import android.widget.ImageView;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Channel and team logos for the player's overlays: fetched off the main thread, scaled down to the slot, kept in memory. */
final class Images {
    private Images() {}
    private static final LruCache<String, Bitmap> cache = new LruCache<String, Bitmap>(8 << 20) {
        @Override protected int sizeOf(String k, Bitmap b) { return b.getByteCount(); }
    };
    private static final Set<String> failed = new HashSet<>();
    private static final ExecutorService pool = Executors.newFixedThreadPool(3);
    private static final Handler main = new Handler(Looper.getMainLooper());

    static void load(String url, ImageView into, int sizePx) {
        into.setTag(url);
        if (url == null || url.isEmpty() || !url.startsWith("http")) { into.setImageDrawable(null); return; }
        Bitmap hit = cache.get(url);
        if (hit != null) { into.setImageBitmap(hit); return; }
        into.setImageDrawable(null);
        synchronized (failed) { if (failed.contains(url)) return; }
        pool.execute(() -> {
            Bitmap b = fetch(url, sizePx);
            if (b == null) { synchronized (failed) { failed.add(url); } return; }
            cache.put(url, b);
            main.post(() -> { if (url.equals(into.getTag())) into.setImageBitmap(b); });
        });
    }

    interface Got { void got(Bitmap b); }
    /**
     * A title's logo for the player's title block (player-v2 SPEC 3): cropped to its ink (the box art.js found, as
     * fractions l, t, r, b; else found here from the alpha), scaled to h px high, dark ink drawn in chalk, and the
     * text's shadow (black 70 %, soft, 1 px down) drawn once into a bitmap that has pad px of room on every side.
     */
    static void titleLogo(String url, float[] box, boolean dark, int h, int pad, Got done) {
        String key = url + "#title" + h + (dark ? "d" : "");
        Bitmap hit = cache.get(key);
        if (hit != null) { done.got(hit); return; }
        synchronized (failed) { if (failed.contains(url)) { done.got(null); return; } }
        pool.execute(() -> {
            Bitmap out = null;
            try {
                Bitmap b = fetch(url, h * 2);
                if (b != null) out = framed(b, box, dark, h, pad);
            } catch (Throwable ignored) {}
            if (out == null) synchronized (failed) { failed.add(url); }
            else cache.put(key, out);
            Bitmap f = out;
            main.post(() -> done.got(f));
        });
    }
    private static Bitmap framed(Bitmap b, float[] box, boolean dark, int h, int pad) {
        int W = b.getWidth(), H = b.getHeight();
        int l, t, r, btm;
        if (box != null && box.length == 4 && box[2] > box[0] && box[3] > box[1]) {
            l = Math.round(box[0] * W); t = Math.round(box[1] * H); r = Math.round(box[2] * W); btm = Math.round(box[3] * H);
        } else {   // the ink's bounding box from the alpha (the PNG is small)
            int[] px = new int[W * H];
            b.getPixels(px, 0, W, 0, 0, W, H);
            l = W; t = H; r = -1; btm = -1;
            for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
                if ((px[y * W + x] >>> 24) < 24) continue;
                if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > btm) btm = y;
            }
            if (r < 0) return null;
            r++; btm++;
        }
        l = Math.max(0, Math.min(W - 1, l)); t = Math.max(0, Math.min(H - 1, t));
        r = Math.max(l + 1, Math.min(W, r)); btm = Math.max(t + 1, Math.min(H, btm));
        Bitmap ink = Bitmap.createBitmap(b, l, t, r - l, btm - t);
        int w = Math.max(1, Math.round(ink.getWidth() * (h / (float) ink.getHeight())));
        Bitmap scaled = Bitmap.createScaledBitmap(ink, w, h, true);
        Bitmap out = Bitmap.createBitmap(w + 2 * pad, h + 2 * pad, Bitmap.Config.ARGB_8888);
        android.graphics.Canvas c = new android.graphics.Canvas(out);
        android.graphics.Paint sp = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        sp.setMaskFilter(new android.graphics.BlurMaskFilter(Math.max(1, pad * 0.6f), android.graphics.BlurMaskFilter.Blur.NORMAL));
        sp.setColor(Ui.SHADOW);
        Bitmap alpha = scaled.extractAlpha();
        c.drawBitmap(alpha, pad, pad + Math.max(1, pad / 10f), sp);
        android.graphics.Paint lp = new android.graphics.Paint(android.graphics.Paint.FILTER_BITMAP_FLAG);
        if (dark) lp.setColorFilter(new android.graphics.PorterDuffColorFilter(Ui.T1, android.graphics.PorterDuff.Mode.SRC_IN));
        c.drawBitmap(scaled, pad, pad, lp);
        return out;
    }

    private static Bitmap fetch(String url, int size) {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setConnectTimeout(6000);
            c.setReadTimeout(8000);
            c.setInstanceFollowRedirects(true);
            if (c.getResponseCode() != 200) return null;
            byte[] data;
            try (InputStream in = c.getInputStream(); ByteArrayOutputStream o = new ByteArrayOutputStream()) {
                byte[] buf = new byte[16384];
                int r;
                while ((r = in.read(buf)) > 0) { o.write(buf, 0, r); if (o.size() > (4 << 20)) return null; }
                data = o.toByteArray();
            }
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(data, 0, data.length, o);
            int s = 1;
            while (o.outWidth / (s * 2) >= size && o.outHeight / (s * 2) >= size) s *= 2;
            o.inJustDecodeBounds = false;
            o.inSampleSize = s;
            return BitmapFactory.decodeByteArray(data, 0, data.length, o);
        } catch (Exception e) { return null; }
    }
}
