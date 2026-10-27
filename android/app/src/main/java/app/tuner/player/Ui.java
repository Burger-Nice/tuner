package app.tuner.player;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.CornerPathEffect;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PixelFormat;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.core.graphics.PathParser;

/**
 * The airglow look for the player's own views: brand tokens (design/brand-v5/v5.4/tokens.css), the brand fonts, and
 * the small pieces every overlay is built from. Sizes are dp, equal to the CSS px of the mocks in design/ui-v1/player/.
 */
final class Ui {
    private Ui() {}

    // ---- tokens ----
    static final int BG0 = 0xFF15131D, BG1 = 0xFF1E1B28, S1 = 0xFF2D2B35, S2 = 0xFF3D3B45, S3 = 0xFF4F4C5A;
    static final int BORDER = 0xFF3C3452, BORDER_STRONG = 0xFF918BA7;
    static final int T1 = 0xFFF3EFE6, T2 = 0xFFD2CEE2, T3 = 0xFFC8C4D8, T4 = 0xFF726E81, INK = 0xFF14101F;
    static final int PINK = 0xFFF95BAC, ORCHID = 0xFFD540F5, PINK_TEXT = 0xFFFFB4D4;
    static final int LIVE = 0xFFFF4B4B, LIVE_TEXT = 0xFFFF8F8F, LIVE_TEXT_ON_S3 = 0xFFFFBABA;
    static final int FOCUS = 0xFFFFFFFF;
    /** "Checked and fine" (the diagnosis path's tick badge), always with its icon. */
    static final int OK = 0xFF47D394;
    /** Panels sit on the picture at 92 to 94%. */
    static final int PANEL = 0xF01E1B28, BANNER = 0xEB1E1B28, SCRIM = 0xD915131D;

    // ---- fonts ----
    static Typeface inter500, inter600, inter650, inter700, outfit700, barlow;
    static float density = 1;

    static void init(Context c) {
        density = c.getResources().getDisplayMetrics().density;
        if (inter500 != null) return;
        inter500 = font(c, "inter_500.ttf", Typeface.create("sans-serif", Typeface.NORMAL));
        inter600 = font(c, "inter_600.ttf", Typeface.create("sans-serif-medium", Typeface.NORMAL));
        inter650 = font(c, "inter_650.ttf", inter600);
        inter700 = font(c, "inter_700.ttf", Typeface.DEFAULT_BOLD);
        outfit700 = font(c, "outfit_bold.ttf", Typeface.DEFAULT_BOLD);
        barlow = font(c, "barlow_condensed_xbold_italic.ttf", Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD_ITALIC));
    }
    private static Typeface font(Context c, String file, Typeface fallback) {
        try { return Typeface.createFromAsset(c.getAssets(), "fonts/" + file); } catch (Exception e) { return fallback; }
    }

    static int dp(float v) { return Math.round(v * density); }

    // ---- text ----
    static TextView text(Context c, String s, float sp, int color, Typeface tf) {
        TextView t = new TextView(c);
        t.setText(s);
        t.setTextColor(color);
        t.setTextSize(TypedValue.COMPLEX_UNIT_DIP, sp);
        t.setTypeface(tf);
        t.setIncludeFontPadding(false);
        return t;
    }
    static TextView line(Context c, String s, float sp, int color, Typeface tf) {
        TextView t = text(c, s, sp, color, tf);
        t.setSingleLine(true);
        t.setEllipsize(TextUtils.TruncateAt.END);
        return t;
    }
    static void lineHeight(TextView t, float dp) {
        Paint.FontMetricsInt fm = t.getPaint().getFontMetricsInt();
        int h = dp(dp), natural = fm.descent - fm.ascent;
        int pad = Math.max(0, (h - natural) / 2);
        t.setPadding(t.getPaddingLeft(), pad, t.getPaddingRight(), Math.max(0, h - natural - pad));
    }
    static void tabular(TextView t) { t.setFontFeatureSettings("tnum"); }

    // ---- shapes ----
    static GradientDrawable round(int color, float radiusDp) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(dp(radiusDp));
        return g;
    }
    static GradientDrawable panelBg() {
        GradientDrawable g = round(PANEL, 16);
        g.setStroke(Math.max(1, dp(1)), BORDER);
        return g;
    }
    /** Rows in a panel: the current one on surface-2, the focused one on surface-3 with a 3 dp ring inside (no scale). */
    static Drawable rowBg(boolean focused, boolean current) {
        if (focused) {
            GradientDrawable g = round(S3, 12);
            g.setStroke(dp(3), FOCUS);
            return g;
        }
        return current ? round(S2, 12) : null;
    }
    static GradientDrawable circle(int color) {
        GradientDrawable g = new GradientDrawable();
        g.setShape(GradientDrawable.OVAL);
        g.setColor(color);
        return g;
    }

    /** The LIVE pill: a red dot and the word, 2 dp outline (1.5 compact). Never colour alone. */
    static TextView livePill(Context c, boolean compact) {
        TextView t = text(c, "LIVE", compact ? 12 : 13, LIVE_TEXT, inter700);
        t.setLetterSpacing(0.1f);
        t.setGravity(Gravity.CENTER_VERTICAL);
        GradientDrawable bg = round(0x29FF4B4B, 999);
        bg.setStroke(compact ? Math.max(2, Math.round(1.5f * density)) : dp(2), LIVE);
        t.setBackground(bg);
        GradientDrawable dot = circle(LIVE);
        int d = dp(compact ? 6 : 8);
        dot.setBounds(0, 0, d, d);
        t.setCompoundDrawables(dot, null, null, null);
        t.setCompoundDrawablePadding(dp(5));
        t.setPadding(dp(8), 0, dp(8), 0);
        t.setLayoutParams(new LinearLayout.LayoutParams(-2, dp(compact ? 19 : 24)));
        return t;
    }
    static void liveOnFocus(TextView pill, boolean focused) { pill.setTextColor(focused ? LIVE_TEXT_ON_S3 : LIVE_TEXT); }

    static TextView tag(Context c, String s, boolean quality) {
        TextView t = text(c, s.toUpperCase(), 12, T1, inter650);
        t.setLetterSpacing(0.04f);
        t.setGravity(Gravity.CENTER);
        GradientDrawable bg = round(quality ? S3 : 0xC715131D, 8);
        if (!quality) bg.setStroke(Math.max(1, dp(1)), BORDER_STRONG);
        t.setBackground(bg);
        t.setPadding(dp(7), 0, dp(7), 0);
        t.setLayoutParams(new LinearLayout.LayoutParams(-2, dp(22)));
        return t;
    }

    /** A pill button (btn2): Outfit 700 16 chalk, 40 dp high. The primary one is the gradient with ink text; focused, any
     * pill gets the 3 dp white ring (catch-up cards and the timeline's pills). */
    static TextView pill(Context c, String s, String icon, boolean chevron) {
        TextView t = text(c, s, 16, T1, outfit700);
        t.setGravity(Gravity.CENTER);
        t.setSingleLine(true);
        if (icon != null || chevron) {
            Drawable l = icon == null ? null : icon(icon, T1, 20), r = chevron ? icon("chevR", T1, 18) : null;
            if (l != null) l.setBounds(0, 0, dp(20), dp(20));
            if (r != null) r.setBounds(0, 0, dp(18), dp(18));
            t.setCompoundDrawables(l, null, r, null);
            t.setCompoundDrawablePadding(dp(8));
        }
        t.setPadding(dp(icon != null ? 14 : 18), 0, dp(chevron ? 14 : 18), 0);
        return t;
    }
    static void pillState(TextView t, boolean primary, boolean focused) {
        GradientDrawable g;
        if (primary) {
            g = new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, new int[] { PINK, ORCHID });
            g.setCornerRadius(dp(999));
        } else g = round(focused ? S3 : 0, 999);
        if (focused) g.setStroke(dp(3), FOCUS);
        else if (!primary) g.setStroke(dp(2), BORDER_STRONG);
        t.setBackground(g);
        int fg = primary ? INK : T1;
        t.setTextColor(fg);
        Drawable[] ds = t.getCompoundDrawables();
        for (Drawable d : ds) if (d instanceof Icon) ((Icon) d).color(fg);
    }

    /** A remote key, as drawn in the hint bar: chalk on surface-2. */
    static TextView kbd(Context c, String s) {
        TextView t = text(c, s, 14, T1, inter650);
        t.setGravity(Gravity.CENTER);
        t.setBackground(round(S2, 8));
        t.setPadding(dp(8), 0, dp(8), 0);
        t.setMinWidth(dp(22));
        return t;
    }

    /** A channel tile: the provider's logo when it loads, initials until then. */
    static FrameLayout logo(Context c, int sizeDp) {
        FrameLayout f = new FrameLayout(c);
        f.setBackground(round(S2, sizeDp >= 56 ? 12 : 8));
        f.setClipToOutline(true);
        TextView ini = text(c, "", sizeDp >= 56 ? 18 : sizeDp >= 40 ? 14 : 12, T2, outfit700);
        ini.setGravity(Gravity.CENTER);
        f.addView(ini, new FrameLayout.LayoutParams(-1, -1));
        ImageView img = new ImageView(c);
        img.setScaleType(ImageView.ScaleType.FIT_CENTER);
        int p = dp(sizeDp >= 44 ? 5 : 3);
        img.setPadding(p, p, p, p);
        f.addView(img, new FrameLayout.LayoutParams(-1, -1));
        f.setLayoutParams(new LinearLayout.LayoutParams(dp(sizeDp), dp(sizeDp)));
        return f;
    }
    static void bindLogo(FrameLayout tile, String name, String url) {
        ((TextView) tile.getChildAt(0)).setText(initials(name));
        Images.load(url, (ImageView) tile.getChildAt(1), tile.getLayoutParams() != null ? Math.max(tile.getLayoutParams().width, dp(32)) : dp(56));
    }

    /** "US: ESPN HD" -> ES, "Sky Sports Main Event" -> SS; mirrors initials() in app/tv/js/util.js. */
    static String initials(String n) {
        if (n == null) return "";
        String s = n.replaceFirst("^[A-Z]{2,3}\\s*[|:\\-]\\s*", "").replaceAll("[^\\p{L}\\p{N} ]", " ").trim();
        String[] w = s.split("\\s+");
        StringBuilder b = new StringBuilder();
        for (String x : w) {
            if (x.isEmpty() || x.matches("(?i)hd|fhd|uhd|4k|sd|tv|\\d+")) continue;
            b.append(Character.toUpperCase(x.charAt(0)));
            if (b.length() == 2) break;
        }
        if (b.length() == 1 && w.length > 0 && w[0].length() > 1) b.append(Character.toUpperCase(w[0].charAt(1)));
        return b.length() > 0 ? b.toString() : s.length() > 1 ? s.substring(0, 2).toUpperCase() : s.toUpperCase();
    }

    static int parse(String c, int fallback) {
        try { return c == null || c.isEmpty() ? fallback : Color.parseColor(c); } catch (Exception e) { return fallback; }
    }

    // ---- icons (24 x 24, stroked, from app/tv/js/util.js and the design kit) ----
    static Drawable icon(String name, int color, int sizeDp) { return new Icon(name, color, sizeDp); }
    static ImageView iconView(Context c, String name, int color, int sizeDp) {
        ImageView v = new ImageView(c);
        v.setImageDrawable(icon(name, color, sizeDp));
        v.setLayoutParams(new LinearLayout.LayoutParams(dp(sizeDp), dp(sizeDp)));
        return v;
    }

    static final class Icon extends Drawable {
        private final Path path = new Path(), dots = new Path(), faint = new Path();   // dots are filled; faint is drawn at 30 %
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG), dotP = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final boolean fill;
        private final int size;
        Icon(String name, int color, int sizeDp) {
            size = dp(sizeDp);
            paint.setColor(color);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(1.8f);
            paint.setStrokeCap(Paint.Cap.ROUND);
            paint.setStrokeJoin(Paint.Join.ROUND);
            boolean f = false;
            switch (name) {
                case "chevL": d("M15 5l-7 7 7 7"); break;
                case "chevR": d("M9 5l7 7-7 7"); break;
                case "chevU": d("M5 15l7-7 7 7"); break;
                case "chevD": d("M5 9l7 7 7-7"); break;
                case "pin": d("M9 3h6l-1 6 3.5 3.5h-11L10 9zM12 16v5"); break;
                case "cc": rect(3, 5, 18, 14, 3); d("M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17.5 10.2a2.4 2.4 0 1 0 0 3.6"); break;
                case "audio": d("M4 9.5v5h4L13 19V5L8 9.5z"); d("M16.5 8.5a5 5 0 0 1 0 7"); break;
                case "pic": rect(3, 5.5f, 18, 13, 2); d("M7 10V8.5h1.5M17 14v1.5h-1.5"); break;
                case "star": d("M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9z"); f = true; break;
                case "starO": d("M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9z"); break;
                case "score": rect(3, 5.5f, 18, 13, 2.5f); d("M12 5.5v13M6.5 10h2.5M15 10h2.5M6.5 14h2.5M15 14h2.5"); break;
                case "tv": rect(3, 5, 18, 12, 2); d("M8 21h8M12 17v4"); break;
                case "refresh": d("M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5"); break;
                case "clock": path.addCircle(12, 12, 9, Path.Direction.CW); d("M12 7v5l3.2 2"); break;
                case "eyeOff": d("M3 3l18 18M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7a13 13 0 0 1-2.4 3.7M6.4 6.6A13 13 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"); break;
                case "play": d("M7 4.5v15l13-7.5z"); f = true; break;
                case "pause": rect(6, 4.5f, 4, 15, 1); rect(14, 4.5f, 4, 15, 1); f = true; break;
                case "next": d("M5 5l9 7-9 7zM18 5v14"); break;
                // catch-up (design/ui-v1/catchup): ⏮ to tip-off or a programme's start, the history glyph
                case "skipBack": rect(5, 5, 2.6f, 14, 1); d("M19.5 5.2v13.6L9 12z"); f = true; break;
                case "hist": d("M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 4.5V9H8"); d("M12 7.5V12l3 2"); break;
                case "speed": path.addCircle(12, 13, 8, Path.Direction.CW); d("M12 13l4-4M12 3v2"); break;
                case "frames": rect(3, 4, 18, 16, 2.5f); d("M3 9h18M3 15h18"); break;
                case "quality": rect(3, 5, 18, 14, 3); d("M7 9.5v5M7 12h3.2M10.2 9.5v5M13.5 9.5v5h1.3a2.5 2.5 0 0 0 0-5z"); break;
                case "info": path.addCircle(12, 12, 9, Path.Direction.CW); d("M12 11v5.5M12 7.8v.2"); break;
                // the diagnosis path (design/ui-v1/diagnosis/SPEC.md 2.3)
                case "wifi": sw(2); d(ARCS); dot(12, 19.2f, 1.4f); break;
                case "wifiWeak": sw(2); faint(ARCS2); d("M8.7 15.8a5 5 0 0 1 6.6 0"); dot(12, 19.2f, 1.4f); break;
                case "wifiOff": sw(2); faint(ARCS); d("M4 4l16 16"); break;
                case "cable": sw(2); d("M9 3v4.5M15 3v4.5M6.5 7.5h11v3.5a5.5 5.5 0 0 1-11 0zM12 16.5V21"); break;
                case "globe": sw(2); path.addCircle(12, 12, 9, Path.Direction.CW); d("M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z"); break;
                case "server": sw(2); rect(4, 4, 16, 7, 2); rect(4, 13, 16, 7, 2); dot(8, 7.5f, 1.5f); dot(8, 16.5f, 1.5f); break;
                case "stream": sw(2); dot(12, 12, 2); d("M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.4 5.4a9.3 9.3 0 0 0 0 13.2M18.6 5.4a9.3 9.3 0 0 1 0 13.2"); break;
                case "signal": sw(2.6f); d("M5 19v-3M10 19v-6.5M15 19V9M20 19V5"); break;
                case "list": sw(2.2f); d("M8 6h12M8 12h12M8 18h12"); dot(4, 6, 1.3f); dot(4, 12, 1.3f); dot(4, 18, 1.3f); break;
                case "check": sw(3.6f); d("M5 12.5l4.5 4.5L19 7.5"); break;
                case "bang": sw(3.2f); d("M12 5v8.5"); dot(12, 18.6f, 2); break;
                default: break;
            }
            fill = f;
            if (fill) paint.setStyle(Paint.Style.FILL);
            dotP.setColor(color);
            setBounds(0, 0, size, size);
        }
        private static final String ARCS = "M2.6 9.2a14 14 0 0 1 18.8 0M5.6 12.5a9.6 9.6 0 0 1 12.8 0M8.7 15.8a5 5 0 0 1 6.6 0", ARCS2 = "M2.6 9.2a14 14 0 0 1 18.8 0M5.6 12.5a9.6 9.6 0 0 1 12.8 0";
        private void sw(float w) { paint.setStrokeWidth(w); }
        private void dot(float x, float y, float r) { dots.addCircle(x, y, r, Path.Direction.CW); }
        private void faint(String s) { try { faint.addPath(PathParser.createPathFromPathData(s)); } catch (Exception ignored) {} }
        private void d(String s) { try { path.addPath(PathParser.createPathFromPathData(s)); } catch (Exception ignored) {} }
        private void rect(float x, float y, float w, float h, float r) { path.addRoundRect(new RectF(x, y, x + w, y + h), r, r, Path.Direction.CW); }
        @Override public void draw(@NonNull Canvas c) {
            float s = getBounds().width() / 24f;
            c.save();
            c.translate(getBounds().left, getBounds().top);
            c.scale(s, s);
            c.drawPath(path, paint);
            if (!dots.isEmpty()) c.drawPath(dots, dotP);
            if (!faint.isEmpty()) { int a = paint.getAlpha(); paint.setAlpha(a * 3 / 10); c.drawPath(faint, paint); paint.setAlpha(a); }
            c.restore();
        }
        @Override public int getIntrinsicWidth() { return size; }
        @Override public int getIntrinsicHeight() { return size; }
        @Override public void setAlpha(int a) { paint.setAlpha(a); dotP.setAlpha(a); }
        @Override public void setColorFilter(ColorFilter f) { paint.setColorFilter(f); dotP.setColorFilter(f); }
        @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
        void color(int c) { if (paint.getColor() != c) { paint.setColor(c); dotP.setColor(c); invalidateSelf(); } }
    }

    /** The Sharp dialect's plate: a parallelogram skewed 12 degrees (a real skew, not a rotated rectangle). */
    static final class Plate extends Drawable {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Path path = new Path();
        Plate(int color, float cornerDp) {
            paint.setColor(color);
            if (cornerDp > 0) paint.setPathEffect(new CornerPathEffect(dp(cornerDp)));
        }
        @Override public void draw(@NonNull Canvas c) {
            android.graphics.Rect b = getBounds();
            float off = (float) (b.height() * Math.tan(Math.toRadians(12))) / 2f;
            path.reset();
            path.moveTo(b.left + off * 2, b.top);
            path.lineTo(b.right, b.top);
            path.lineTo(b.right - off * 2, b.bottom);
            path.lineTo(b.left, b.bottom);
            path.close();
            c.drawPath(path, paint);
        }
        @Override public void setAlpha(int a) { paint.setAlpha(a); }
        @Override public void setColorFilter(ColorFilter f) { paint.setColorFilter(f); }
        @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
    }

    /** A thin progress bar: surface-2 track, the pink-to-orchid gradient fill. */
    static final class Bar extends View {
        private final Paint track = new Paint(Paint.ANTI_ALIAS_FLAG), fillP = new Paint(Paint.ANTI_ALIAS_FLAG);
        private float value;
        private final RectF r = new RectF();
        Bar(Context c, int trackColor) { super(c); track.setColor(trackColor); }
        void set(float v) { v = Math.max(0, Math.min(1, v)); if (v != value) { value = v; invalidate(); } }
        @Override protected void onSizeChanged(int w, int h, int ow, int oh) {
            fillP.setShader(new LinearGradient(0, 0, w, 0, PINK, ORCHID, Shader.TileMode.CLAMP));
        }
        @Override protected void onDraw(@NonNull Canvas c) {
            float h = getHeight(), rad = h / 2;
            r.set(0, 0, getWidth(), h);
            c.drawRoundRect(r, rad, rad, track);
            if (value > 0) { r.set(0, 0, getWidth() * value, h); c.drawRoundRect(r, rad, rad, fillP); }
        }
    }

    /** The countdown ring of the action chip and Up next: a pink arc on a surface-2 track; the last 3 s as a digit. */
    static final class Ring extends View {
        private final Paint track = new Paint(Paint.ANTI_ALIAS_FLAG), arc = new Paint(Paint.ANTI_ALIAS_FLAG), digit = new Paint(Paint.ANTI_ALIAS_FLAG);
        private float left = 1;
        private int seconds;
        private final RectF r = new RectF();
        Ring(Context c) {
            super(c);
            for (Paint p : new Paint[] { track, arc }) { p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(dp(4)); }
            arc.setStrokeCap(Paint.Cap.ROUND);
            track.setColor(S2);
            arc.setColor(PINK);
            digit.setColor(T1);
            digit.setTypeface(inter700);
            digit.setTextSize(dp(14));
            digit.setTextAlign(Paint.Align.CENTER);
        }
        void set(float fraction, int secondsLeft) { left = fraction; seconds = secondsLeft; invalidate(); }
        @Override protected void onDraw(@NonNull Canvas c) {
            float s = Math.min(getWidth(), getHeight()), pad = dp(5);
            r.set(pad, pad, s - pad, s - pad);
            c.drawArc(r, 0, 360, false, track);
            c.drawArc(r, -90, 360 * left, false, arc);
            if (seconds > 0 && seconds <= 3) c.drawText(String.valueOf(seconds), s / 2, s / 2 + dp(5), digit);
        }
    }

    /** Reconnecting: a pink arc that turns. */
    static final class Spinner extends View {
        private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF r = new RectF();
        Spinner(Context c) {
            super(c);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(dp(2.5f));
            p.setStrokeCap(Paint.Cap.ROUND);
            p.setColor(PINK);
        }
        @Override protected void onDraw(@NonNull Canvas c) {
            float s = Math.min(getWidth(), getHeight()), pad = dp(3);
            r.set(pad, pad, s - pad, s - pad);
            float a = (System.currentTimeMillis() % 1000) * 0.36f;
            c.drawArc(r, a, 270, false, p);
            if (getVisibility() == VISIBLE && isAttachedToWindow()) postInvalidateOnAnimation();
        }
    }
}
