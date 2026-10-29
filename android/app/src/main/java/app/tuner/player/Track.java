package app.tuner.player;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.ColorFilter;
import android.graphics.DashPathEffect;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.widget.TextView;

import androidx.annotation.NonNull;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * The one track every kind of playback uses (design/ui-v1/player-v2/SPEC.md 3, "Track" and "Ends row"): the 6 dp line
 * across the safe width, the played part in the gradient, the part not aired yet dashed, the chapter ticks that have
 * aired, the live dot, the thumb (14 idle, 22 focused with the house ring), and the ends row under it with the
 * chapter labels on their ticks and the compact LIVE pill. Films set it with {@link #vod}; the timeline sets the
 * fields from its model. The view is wider and taller than the line by {@link #PAD_X} / {@link #PAD_T} so the focused
 * thumb's ring can pass the safe edge without being clipped.
 */
final class Track extends View {
    static final int PAD_X = 20, PAD_T = 8, ROW = 20, GAP = 2, ENDS = 20;
    static final int H = PAD_T + ROW + GAP + ENDS;

    boolean focused = true;
    long length = 1, pos, live = -1;
    List<Timeline.Mark> ticks = Collections.emptyList();
    String current, left = "", right = "";
    boolean endHidden;

    private final Paint line = new Paint(Paint.ANTI_ALIAS_FLAG), fill = new Paint(Paint.ANTI_ALIAS_FLAG), thumb = new Paint(Paint.ANTI_ALIAS_FLAG),
            ring = new Paint(Paint.ANTI_ALIAS_FLAG), gap = new Paint(Paint.ANTI_ALIAS_FLAG), tickP = new Paint(Paint.ANTI_ALIAS_FLAG),
            ahead = new Paint(Paint.ANTI_ALIAS_FLAG), dash = new Paint(Paint.ANTI_ALIAS_FLAG), liveP = new Paint(Paint.ANTI_ALIAS_FLAG),
            label = new Paint(Paint.ANTI_ALIAS_FLAG), pill = new Paint(Paint.ANTI_ALIAS_FLAG), pillBg = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF r = new RectF();
    private final Drawable eyeD = Ui.icon("eyeOff", Ui.T2, 16);

    Track(Context c) {
        super(c);
        line.setColor(0xE64F4C5A);   // surface-3 at 90 %
        thumb.setColor(Ui.T1);
        ring.setStyle(Paint.Style.STROKE); ring.setStrokeWidth(Ui.dp(3)); ring.setColor(Ui.FOCUS);
        gap.setColor(Ui.BG0);
        tickP.setColor(Ui.T2);
        ahead.setColor(Ui.BG1);
        dash.setStyle(Paint.Style.STROKE); dash.setStrokeWidth(Math.max(1, Ui.dp(1))); dash.setColor(Ui.BORDER_STRONG);
        dash.setPathEffect(new DashPathEffect(new float[] { Ui.dp(4), Ui.dp(3) }, 0));
        liveP.setColor(Ui.LIVE);
        label.setTextSize(Ui.dp(14));
        label.setFontFeatureSettings("tnum");
        pill.setStyle(Paint.Style.STROKE); pill.setStrokeWidth(Ui.dp(1.5f)); pill.setColor(Ui.LIVE);
        pillBg.setColor(0x29FF4B4B);
    }

    /** A film or an episode: where it is, its length, and the ends (elapsed, −remaining). */
    void vod(long pos, long duration, String left, String right) {
        this.length = Math.max(1, duration);
        this.pos = Math.max(0, Math.min(this.length, pos));
        this.live = -1;
        this.ticks = Collections.emptyList();
        this.current = null;
        this.left = left == null ? "" : left;
        this.right = right == null ? "" : right;
        this.endHidden = false;
        invalidate();
    }

    private float x0() { return Ui.dp(PAD_X); }
    private float x1() { return getWidth() - Ui.dp(PAD_X); }
    private float xOf(long t) { return x0() + (x1() - x0()) * Math.max(0, Math.min(1f, t / (float) Math.max(1, length))); }
    /** The thumb's centre, in this view's coordinates. */
    float thumbX() { return xOf(pos); }

    @Override protected void onSizeChanged(int w, int h, int ow, int oh) {
        fill.setShader(new LinearGradient(x0(), 0, x1(), 0, Ui.PINK, Ui.ORCHID, Shader.TileMode.CLAMP));
    }

    @Override protected void onDraw(@NonNull Canvas c) {
        float cy = Ui.dp(PAD_T + ROW / 2f), h = Ui.dp(6), x0 = x0(), x1 = x1(), tx = thumbX();
        float lx = live >= 0 && live < length ? xOf(live) : -1;
        // the line; from the live point on, what hasn't aired yet: bg-1 with a dashed edge
        r.set(x0, cy - h / 2, lx >= 0 ? lx : x1, cy + h / 2);
        c.drawRoundRect(r, h / 2, h / 2, line);
        if (lx >= 0) {
            r.set(lx, cy - h / 2, x1, cy + h / 2);
            c.drawRoundRect(r, h / 2, h / 2, ahead);
            float in = dash.getStrokeWidth() / 2;
            r.inset(in, in);
            c.drawRoundRect(r, h / 2, h / 2, dash);
        }
        r.set(x0, cy - h / 2, Math.max(x0 + h, tx), cy + h / 2);
        c.drawRoundRect(r, h / 2, h / 2, fill);
        // chapter ticks: only those that have aired (the live point is the limit)
        List<Timeline.Mark> aired = new ArrayList<>();
        for (Timeline.Mark k : ticks) if ((live < 0 || k.at <= live) && k.at <= length) aired.add(k);
        for (Timeline.Mark k : aired) {
            float x = xOf(k.at);
            r.set(x - Ui.dp(1), cy - Ui.dp(7), x + Ui.dp(1), cy + Ui.dp(7));
            c.drawRoundRect(r, Ui.dp(1), Ui.dp(1), tickP);
        }
        drawEnds(c, aired, lx, x0, x1);
        // the thumb: 14 idle; focused 22 with a 2.5 dp bg-0 gap and the 3 dp white ring
        if (focused) {
            c.drawCircle(tx, cy, Ui.dp(11 + 2.5f), gap);
            c.drawCircle(tx, cy, Ui.dp(11), thumb);
            c.drawCircle(tx, cy, Ui.dp(11 + 2.5f + 1.5f), ring);
        } else c.drawCircle(tx, cy, Ui.dp(7), thumb);
        // the live dot last, so it shows beside (over) the ring when the picture is just behind live
        if (lx >= 0) { c.drawCircle(lx, cy, Ui.dp(9), gap); c.drawCircle(lx, cy, Ui.dp(7), liveP); }
    }

    private void drawEnds(Canvas c, List<Timeline.Mark> aired, float lx, float x0, float x1) {
        float rowTop = Ui.dp(PAD_T + ROW + GAP), rowH = Ui.dp(ENDS);
        List<RectF> taken = new ArrayList<>();
        label.setTypeface(Ui.inter500);
        label.setTextSize(Ui.dp(14));
        label.setLetterSpacing(0);
        Paint.FontMetrics fm = label.getFontMetrics();
        float base = rowTop + (rowH - (fm.descent - fm.ascent)) / 2 - fm.ascent;
        // the compact LIVE pill, 12 dp right of the live dot (to its left within 90 dp of the end), inside the row
        if (lx >= 0) {
            label.setTypeface(Ui.inter700);
            label.setTextSize(Ui.dp(12));
            label.setLetterSpacing(0.1f);
            float tw = label.measureText("LIVE"), pw = Ui.dp(7 + 6 + 5) + tw + Ui.dp(8), ph = Ui.dp(20);
            float px = lx > x1 - Ui.dp(90) ? lx - Ui.dp(12) - pw : lx + Ui.dp(12);
            RectF pr = new RectF(px, rowTop, px + pw, rowTop + ph);
            c.drawRoundRect(pr, ph / 2, ph / 2, pillBg);
            float in = pill.getStrokeWidth() / 2;
            RectF po = new RectF(pr);
            po.inset(in, in);
            c.drawRoundRect(po, ph / 2, ph / 2, pill);
            c.drawCircle(pr.left + Ui.dp(7 + 3), pr.centerY(), Ui.dp(3), liveP);
            Paint.FontMetrics pf = label.getFontMetrics();
            label.setColor(Ui.LIVE_TEXT);
            c.drawText("LIVE", pr.left + Ui.dp(7 + 6 + 5), pr.centerY() - (pf.ascent + pf.descent) / 2, label);
            label.setLetterSpacing(0);
            label.setTextSize(Ui.dp(14));
            taken.add(new RectF(pr.left - Ui.dp(6), pr.top, pr.right + Ui.dp(6), pr.bottom));
        }
        // the ends: elapsed and remaining, the programme's times, or [eye-off] End hidden
        label.setTypeface(Ui.inter500);
        label.setColor(Ui.T2);
        if (left != null && !left.isEmpty()) {
            float w = label.measureText(left);
            c.drawText(left, x0, base, label);
            taken.add(new RectF(x0, rowTop, x0 + w + Ui.dp(8), rowTop + rowH));
        }
        if (endHidden) {
            String t = "End hidden";
            float w = label.measureText(t), ix = x1 - w - Ui.dp(22);
            c.drawText(t, x1 - w, base, label);
            eyeD.setBounds((int) ix, (int) (rowTop + Ui.dp(2)), (int) ix + Ui.dp(16), (int) (rowTop + Ui.dp(18)));
            eyeD.draw(c);
            taken.add(new RectF(ix - Ui.dp(8), rowTop, x1, rowTop + rowH));
        } else if (right != null && !right.isEmpty()) {
            float w = label.measureText(right);
            c.drawText(right, x1 - w, base, label);
            taken.add(new RectF(x1 - w - Ui.dp(8), rowTop, x1, rowTop + rowH));
        }
        // chapter labels on their ticks; the one you're in chalk 650, placed first so it always shows; the rest only
        // where they don't touch a pill, an end or another label
        List<Timeline.Mark> order = new ArrayList<>();
        for (Timeline.Mark k : aired) if (k.key.equals(current)) order.add(k);
        for (Timeline.Mark k : aired) if (!k.key.equals(current)) order.add(k);
        for (Timeline.Mark k : order) {
            boolean on = k.key.equals(current);
            label.setTypeface(on ? Ui.inter650 : Ui.inter500);
            label.setColor(on ? Ui.T1 : Ui.T3);
            String t = "Halftime".equals(k.label) ? "Half" : k.label;
            float w = label.measureText(t), x = Math.max(x0, Math.min(x1 - w, xOf(k.at) - w / 2));
            RectF lr = new RectF(x - Ui.dp(4), rowTop, x + w + Ui.dp(4), rowTop + rowH);
            boolean clash = false;
            for (RectF o : taken) if (RectF.intersects(o, lr)) { clash = true; break; }
            if (clash) continue;
            taken.add(lr);
            c.drawText(t, x, base, label);
        }
    }

    // ---------- the scrub bubble and the speed chip (SPEC 3, "Bubble") ----------

    /** Chalk, ink Inter 700 15, 28 high with a 5 dp point down to the thumb. */
    static TextView bubble(Context c) {
        TextView t = Ui.text(c, "", 15, Ui.INK, Ui.inter700);
        t.setGravity(Gravity.CENTER);
        Ui.tabular(t);
        t.setSingleLine(true);
        t.setBackground(new Point(Ui.T1));
        t.setPadding(Ui.dp(10), 0, Ui.dp(10), Ui.dp(Point.TIP));
        return t;
    }
    /** "▶▶ ×8": bg-1 with a 1 dp border-strong edge, chalk 700 15, 28 high. */
    static TextView speedChip(Context c) {
        TextView t = Ui.text(c, "", 15, Ui.T1, Ui.inter700);
        t.setGravity(Gravity.CENTER);
        t.setSingleLine(true);
        GradientDrawable g = Ui.round(Ui.BG1, 8);
        g.setStroke(Math.max(1, Ui.dp(1)), Ui.BORDER_STRONG);
        t.setBackground(g);
        t.setPadding(Ui.dp(10), 0, Ui.dp(10), 0);
        return t;
    }
    /** A rounded box with a point under its centre. */
    static final class Point extends Drawable {
        static final int TIP = 5;
        private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Path path = new Path();
        private final RectF box = new RectF();
        Point(int color) { p.setColor(color); }
        @Override public void draw(@NonNull Canvas c) {
            Rect b = getBounds();
            float tip = Ui.dp(TIP), rad = Ui.dp(8), cx = b.exactCenterX();
            box.set(b.left, b.top, b.right, b.bottom - tip);
            c.drawRoundRect(box, rad, rad, p);
            path.reset();
            path.moveTo(cx - tip, box.bottom - 1);
            path.lineTo(cx + tip, box.bottom - 1);
            path.lineTo(cx, b.bottom);
            path.close();
            c.drawPath(path, p);
        }
        @Override public void setAlpha(int a) { p.setAlpha(a); }
        @Override public void setColorFilter(ColorFilter f) { p.setColorFilter(f); }
        @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
    }
}
