package app.tuner.player;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.DashPathEffect;
import android.graphics.Paint;
import android.graphics.RectF;
import android.text.TextPaint;
import android.text.TextUtils;
import android.view.View;

import androidx.annotation.NonNull;

/**
 * The diagnosis path (design/ui-v1/diagnosis/SPEC.md 1, 2.1): five nodes, each a disc with its glyph and a badge (a
 * green tick = checked and fine, an ink "!" = the problem, none = not judged), and the links between them (ok, slow
 * dashes, a cut, dotted, the pink "being checked"). Horizontal on the cards, vertical in the panel and the sheet.
 * One invalidate() per change.
 */
final class PathView extends View {
    private final boolean vertical;
    private final int rowDp;
    private Diag.Path p = new Diag.Path();
    private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG), line = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final TextPaint label = new TextPaint(Paint.ANTI_ALIAS_FLAG), reading = new TextPaint(Paint.ANTI_ALIAS_FLAG), value = new TextPaint(Paint.ANTI_ALIAS_FLAG);
    private final RectF r = new RectF();
    private final android.graphics.Path seg = new android.graphics.Path();

    /** rowDp: the vertical row height (44 in the panel, 54 in the sheet); 0 for horizontal. */
    PathView(Context c, boolean vertical, int rowDp) {
        super(c);
        this.vertical = vertical;
        this.rowDp = rowDp;
        line.setStyle(Paint.Style.STROKE);
        label.setTypeface(Ui.inter650);
        reading.setTypeface(Ui.inter500);
        value.setTypeface(Ui.inter650);
        label.setTextSize(Ui.dp(vertical ? 15 : 14));
        reading.setTextSize(Ui.dp(14));
        value.setTextSize(Ui.dp(15));
    }

    void set(Diag.Path path) {
        boolean resize = hasReadings(p) != hasReadings(path);
        p = path;
        if (resize) requestLayout();
        invalidate();
    }
    private static boolean hasReadings(Diag.Path p) { for (String s : p.reading) if (s != null && !s.isEmpty()) return true; return false; }

    @Override protected void onMeasure(int w, int h) {
        int width = MeasureSpec.getSize(w);
        int height = vertical ? Ui.dp(rowDp) * 5 : Ui.dp(hasReadings(p) ? 78 : 60);
        setMeasuredDimension(width, height);
    }

    @Override protected void onDraw(@NonNull Canvas c) {
        if (vertical) drawVertical(c); else drawHorizontal(c);
    }

    private float cx(int i) { float w = getWidth(), n = Ui.dp(88); return n / 2 + i * (w - n) / 4f; }

    private void drawHorizontal(Canvas c) {
        float cy = Ui.dp(18);
        for (int i = 0; i < 4; i++) link(c, p.link[i], cx(i), cy, cx(i + 1), cy, false);
        for (int i = 0; i < 5; i++) {
            float x = cx(i);
            disc(c, i, x, cy);
            int st = p.node[i];
            label.setColor(st == Diag.OFF ? Ui.T3 : Ui.T1);
            label.setTypeface(st == Diag.OFF ? Ui.inter500 : Ui.inter650);
            centred(c, p.label[i], label, x, Ui.dp(2 + 32 + 6 + 14));
            String rd = p.reading[i];
            if (rd != null && !rd.isEmpty()) {
                reading.setColor(st == Diag.BAD ? Ui.T1 : Ui.T2);
                reading.setTypeface(st == Diag.BAD ? Ui.inter650 : Ui.inter500);
                centred(c, rd, reading, x, Ui.dp(2 + 32 + 6 + 18 + 14));
            }
        }
    }
    /** Centred under the node, kept inside the view (a long reading on the last node shifts left, never clips). */
    private void centred(Canvas c, String s, TextPaint tp, float x, float baseline) {
        float w = tp.measureText(s), left = Math.max(0, Math.min(getWidth() - w, x - w / 2));
        c.drawText(s, left, baseline, tp);
    }

    private void drawVertical(Canvas c) {
        float row = Ui.dp(rowDp), dx = Ui.dp(10 + 16), tx = Ui.dp(10 + 32 + 16), right = getWidth() - Ui.dp(10);
        for (int i = 1; i < 5; i++) {
            float y0 = row * (i - 1) + row / 2 + Ui.dp(16), y1 = row * i + row / 2 - Ui.dp(16);
            link(c, p.link[i - 1], dx, y0, dx, y1, true);
        }
        for (int i = 0; i < 5; i++) {
            float cy = row * i + row / 2;
            disc(c, i, dx, cy);
            int st = p.node[i];
            String v = p.value[i];
            float vw = 0;
            if (v != null && !v.isEmpty()) {
                value.setColor(Ui.T1);
                vw = value.measureText(v);
                c.drawText(v, right - vw, cy + Ui.dp(5), value);
                vw += Ui.dp(12);
            }
            label.setColor(st == Diag.OFF ? Ui.T3 : Ui.T1);
            label.setTypeface(st == Diag.OFF ? Ui.inter500 : Ui.inter650);
            String rd = p.reading[i];
            boolean two = rd != null && !rd.isEmpty();
            float room = right - tx - vw;
            c.drawText(TextUtils.ellipsize(p.label[i], label, room, TextUtils.TruncateAt.END).toString(), tx, two ? cy - Ui.dp(3) : cy + Ui.dp(5), label);
            if (two) {
                reading.setColor(st == Diag.BAD ? Ui.T1 : Ui.T2);
                reading.setTypeface(Ui.inter500);
                c.drawText(TextUtils.ellipsize(rd, reading, room, TextUtils.TruncateAt.END).toString(), tx, cy + Ui.dp(15), reading);
            }
        }
    }

    private void link(Canvas c, int st, float x0, float y0, float x1, float y1, boolean vert) {
        line.setPathEffect(null);
        line.setAlpha(255);
        line.setStrokeCap(Paint.Cap.BUTT);
        line.setStrokeWidth(Ui.dp(2));
        line.setColor(Ui.BORDER_STRONG);
        switch (st) {
            case Diag.L_OK: c.drawLine(x0, y0, x1, y1, line); break;
            case Diag.L_SLOW:   // works, too slowly: chalk dashes
                line.setStrokeWidth(Ui.dp(3));
                line.setColor(Ui.T1);
                line.setPathEffect(new DashPathEffect(vert ? new float[] { Ui.dp(4), Ui.dp(3) } : new float[] { Ui.dp(7), Ui.dp(5) }, 0));
                seg.reset(); seg.moveTo(x0, y0); seg.lineTo(x1, y1); c.drawPath(seg, line);
                break;
            case Diag.L_CUT: {   // nothing gets through: a 16 dp gap in the middle (vertical: no connector)
                if (vert) break;
                float mx = (x0 + x1) / 2, g = Ui.dp(8);
                c.drawLine(x0, y0, mx - g, y1, line);
                c.drawLine(mx + g, y0, x1, y1, line);
                break;
            }
            case Diag.L_RUN: {   // being checked: the pink progress
                float mx = x0 + (x1 - x0) * 0.6f, my = y0 + (y1 - y0) * (vert ? 0.5f : 0.6f);
                line.setColor(Ui.S2); c.drawLine(x0, y0, x1, y1, line);
                line.setColor(Ui.PINK); c.drawLine(x0, y0, vert ? x1 : mx, vert ? my : y1, line);
                break;
            }
            default:   // not reached: dotted
                line.setAlpha(180);
                line.setPathEffect(new DashPathEffect(new float[] { Ui.dp(2), Ui.dp(vert ? 3 : 5) }, 0));
                seg.reset(); seg.moveTo(x0, y0); seg.lineTo(x1, y1); c.drawPath(seg, line);
        }
        line.setPathEffect(null);
        line.setAlpha(255);
    }

    private void disc(Canvas c, int i, float x, float y) {
        int st = p.node[i];
        float rad = Ui.dp(16);
        fill.setStyle(Paint.Style.FILL);
        int glyph;
        if (st == Diag.BAD) { fill.setColor(Ui.T1); c.drawCircle(x, y, rad, fill); glyph = Ui.INK; }
        else if (st == Diag.OK) { fill.setColor(Ui.S2); c.drawCircle(x, y, rad, fill); glyph = Ui.T1; }
        else {
            fill.setColor(Ui.BG1); c.drawCircle(x, y, rad, fill);
            line.setColor(Ui.BORDER_STRONG); line.setStrokeWidth(Ui.dp(1.5f)); line.setPathEffect(null);
            c.drawCircle(x, y, rad - Ui.dp(0.75f), line);
            glyph = Ui.T3;
            if (st == Diag.RUN) {
                line.setColor(Ui.PINK); line.setStrokeWidth(Ui.dp(2.5f)); line.setStrokeCap(Paint.Cap.ROUND);
                r.set(x - rad + Ui.dp(0.25f), y - rad + Ui.dp(0.25f), x + rad - Ui.dp(0.25f), y + rad - Ui.dp(0.25f));
                c.drawArc(r, -135, 180, false, line);
                line.setStrokeCap(Paint.Cap.BUTT);
            }
        }
        Ui.Icon ic = icon(p.icon[i], glyph, 18);
        int s = Ui.dp(18);
        ic.setBounds(Math.round(x - s / 2f), Math.round(y - s / 2f), Math.round(x + s / 2f), Math.round(y + s / 2f));
        ic.draw(c);
        if (st == Diag.OK) badge(c, x + Ui.dp(16), y + Ui.dp(13), Ui.dp(8), false);
        else if (st == Diag.BAD) badge(c, x + Ui.dp(15), y + Ui.dp(12), Ui.dp(10), true);
    }

    private final java.util.Map<String, Ui.Icon> icons = new java.util.HashMap<>();   // (parsed once, not on every draw)
    private Ui.Icon icon(String name, int color, int dp) {
        String k = name + color + ":" + dp;
        Ui.Icon ic = icons.get(k);
        if (ic == null) icons.put(k, ic = new Ui.Icon(name, color, dp));
        return ic;
    }

    /** The tick (green disc, ink mark) or the "!" (ink disc, a chalk ring and a chalk mark, its dot painted in chalk
     * explicitly: v1.2 N-M1), each with a 2 dp ring in the card's colour. */
    private void badge(Canvas c, float x, float y, float rad, boolean bang) {
        fill.setColor(Ui.BG1);
        c.drawCircle(x, y, rad + Ui.dp(2), fill);
        fill.setColor(bang ? Ui.INK : Ui.OK);
        c.drawCircle(x, y, rad, fill);
        if (bang) {
            line.setColor(Ui.T1); line.setStrokeWidth(Ui.dp(1.5f)); line.setPathEffect(null);
            c.drawCircle(x, y, rad - Ui.dp(0.75f), line);
        }
        Ui.Icon ic = icon(bang ? "bang" : "check", bang ? Ui.T1 : Ui.INK, bang ? 14 : 10);
        int s = Ui.dp(bang ? 14 : 10);
        ic.setBounds(Math.round(x - s / 2f), Math.round(y - s / 2f), Math.round(x + s / 2f), Math.round(y + s / 2f));
        ic.draw(c);
    }

    /** The puck (SPEC 2.1, 3.1): a 56 dp disc where the card sits. While bytes arrive, a refill ring (how much of the
     * picture the player waits for is loaded); while nothing arrives, the spinner. */
    static final class Puck extends View {
        private final Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG), rim = new Paint(Paint.ANTI_ALIAS_FLAG), arc = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF r = new RectF();
        private float fraction = -1;   // -1: the spinner
        Puck(Context c) {
            super(c);
            bg.setColor(0xF01E1B28);
            rim.setStyle(Paint.Style.STROKE); rim.setStrokeWidth(Math.max(1, Ui.dp(1))); rim.setColor(Ui.BORDER);
            arc.setStyle(Paint.Style.STROKE); arc.setStrokeCap(Paint.Cap.ROUND);
        }
        void set(float f) { if (f != fraction) { fraction = f; invalidate(); } }
        @Override protected void onDraw(@NonNull Canvas c) {
            float s = Math.min(getWidth(), getHeight()), m = s / 2;
            c.drawCircle(m, m, m - Ui.dp(0.5f), bg);
            c.drawCircle(m, m, m - Ui.dp(0.5f), rim);
            if (fraction >= 0) {
                float rad = Ui.dp(12);
                r.set(m - rad, m - rad, m + rad, m + rad);
                arc.setStrokeWidth(Ui.dp(3.5f));
                arc.setColor(Ui.S2); c.drawArc(r, 0, 360, false, arc);
                arc.setColor(Ui.PINK); c.drawArc(r, -90, 360 * Math.min(1, fraction), false, arc);
            } else {
                float rad = Ui.dp(10.5f);
                r.set(m - rad, m - rad, m + rad, m + rad);
                arc.setStrokeWidth(Ui.dp(3));
                arc.setColor(Ui.PINK);
                c.drawArc(r, (System.currentTimeMillis() % 1000) * 0.36f, 270, false, arc);
                if (getVisibility() == VISIBLE && isAttachedToWindow()) postInvalidateOnAnimation();
            }
        }
    }
}
