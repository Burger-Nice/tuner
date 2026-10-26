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
