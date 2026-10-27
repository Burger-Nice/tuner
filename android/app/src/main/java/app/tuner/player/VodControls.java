package app.tuner.player;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.media3.common.C;
import androidx.media3.exoplayer.ExoPlayer;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Movies and episodes: the title at the top and a bar at the bottom. Focus rests on the seek thumb: ◀▶ seek 10 s
 * (holding scrubs, faster every second, up to ×32), OK pauses and resumes, ▲ reaches the buttons, ▼ opens Options.
 * The controls hide after 4 s while playing.
 */
final class VodControls {
    private final PlayerActivity a;
    private final ExoPlayer p;
    final LinearLayout top, bar;
    private final TextView title, sub, ends, elapsed, remaining, bubble, what;
    private final android.widget.ImageView whatTick;
    private final LinearLayout whatRow;
    private final Seek seek;
    private final LinearLayout buttons;
    private final List<TextView> btns = new ArrayList<>();
    private final List<Runnable> acts = new ArrayList<>();
    private int row;            // 0 the seek thumb, 1 the buttons
    private int btn;
    private boolean scrubbing;
    private long scrubPos, scrubFrom;
    private TextView playBtn;

    private final Runnable hide = this::hide;
    private final Runnable tick = new Runnable() { @Override public void run() { update(); if (visible()) a.handler.postDelayed(this, 250); } };

    VodControls(PlayerActivity a, ExoPlayer p, FrameLayout root) {
        this.a = a;
        this.p = p;
        Context c = a;
        top = new LinearLayout(c);
        LinearLayout tcol = new LinearLayout(c);
        tcol.setOrientation(LinearLayout.VERTICAL);
        title = Ui.line(c, "", 28, Ui.T1, Ui.outfit700);
        Ui.lineHeight(title, 32);
        sub = Ui.line(c, "", 16, Ui.T2, Ui.inter500);
        Ui.lineHeight(sub, 22);
        tcol.addView(title);
        tcol.addView(sub);
        // the st-what line (design/ui-v1/subtitles SPEC 7.1): tick + the copy's checked quality and sound · best of N
        // copies · the subtitles that are on
        whatRow = new LinearLayout(c);
        whatRow.setGravity(Gravity.CENTER_VERTICAL);
        whatTick = new android.widget.ImageView(c);
        whatTick.setImageDrawable(new Ui.Tick(16));
        LinearLayout.LayoutParams wt = new LinearLayout.LayoutParams(Ui.dp(16), Ui.dp(16));
        wt.setMarginEnd(Ui.dp(8));
        whatRow.addView(whatTick, wt);
        what = Ui.line(c, "", 15, Ui.T2, Ui.inter500);
        whatRow.addView(what, new LinearLayout.LayoutParams(0, -2, 1));
        LinearLayout.LayoutParams wl = new LinearLayout.LayoutParams(-1, -2);
        wl.topMargin = Ui.dp(4);
        whatRow.setVisibility(View.GONE);
        tcol.addView(whatRow, wl);
        top.addView(tcol, new LinearLayout.LayoutParams(0, -2, 1));
        ends = Ui.text(c, "", 16, Ui.T2, Ui.inter500);
        Ui.tabular(ends);
        top.addView(ends);
        FrameLayout.LayoutParams tl = new FrameLayout.LayoutParams(-1, -2, Gravity.TOP);
        top.setPadding(Ui.dp(48), Ui.dp(30), Ui.dp(48), Ui.dp(36));
        top.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[] { Ui.SCRIM, 0x0015131D }));
        root.addView(top, tl);

        bar = new LinearLayout(c);
        bar.setOrientation(LinearLayout.VERTICAL);
        bar.setPadding(Ui.dp(20), Ui.dp(16), Ui.dp(20), Ui.dp(14));
        bar.setBackground(Ui.round(Ui.BANNER, 16));
        buttons = new LinearLayout(c);
        buttons.setGravity(Gravity.CENTER_VERTICAL);
        bar.addView(buttons, new LinearLayout.LayoutParams(-1, Ui.dp(44)));
        FrameLayout seekBox = new FrameLayout(c);
        seekBox.setClipChildren(false);
        seek = new Seek(c);
        seekBox.addView(seek, new FrameLayout.LayoutParams(-1, Ui.dp(28), Gravity.BOTTOM));
        bubble = Ui.text(c, "", 14, Ui.INK, Ui.inter700);
        bubble.setGravity(Gravity.CENTER);
        bubble.setBackground(Ui.round(Ui.T1, 8));
        bubble.setPadding(Ui.dp(8), 0, Ui.dp(8), 0);
        Ui.tabular(bubble);
        bubble.setVisibility(View.GONE);
        seekBox.addView(bubble, new FrameLayout.LayoutParams(-2, Ui.dp(26), Gravity.TOP | Gravity.START));
        LinearLayout.LayoutParams sl = new LinearLayout.LayoutParams(-1, Ui.dp(28 + 30));
        sl.topMargin = Ui.dp(-22);
        bar.addView(seekBox, sl);
        bar.setClipChildren(false);
        LinearLayout times = new LinearLayout(c);
        elapsed = Ui.text(c, "", 14, Ui.T2, Ui.inter500);
        remaining = Ui.text(c, "", 14, Ui.T2, Ui.inter500);
        Ui.tabular(elapsed);
        Ui.tabular(remaining);
        times.addView(elapsed, new LinearLayout.LayoutParams(0, -2, 1));
        times.addView(remaining);
        LinearLayout.LayoutParams tml = new LinearLayout.LayoutParams(-1, -2);
        tml.topMargin = Ui.dp(8);   // (14 px under the bar, not 10: the thumb's focus ring at 0:00 touched the elapsed time)
        bar.addView(times, tml);
        FrameLayout.LayoutParams bl = new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM);
        bl.setMargins(Ui.dp(48), 0, Ui.dp(48), Ui.dp(64));
        root.addView(bar, bl);
        top.setVisibility(View.GONE);
        bar.setVisibility(View.GONE);
    }

    boolean visible() { return bar.getVisibility() == View.VISIBLE; }

    /** New title: rebuild the buttons (Next episode only when there is one). */
    void setItem(PlayerActivity.Entry e, boolean hasNext) {
        title.setText(e.title);
        sub.setText(e.sub == null ? "" : e.sub);
        sub.setVisibility(e.sub == null || e.sub.isEmpty() ? View.GONE : View.VISIBLE);
        buttons.removeAllViews();
        btns.clear();
        acts.clear();
        playBtn = round("play", null, () -> toggle());
        round(null, "−10", () -> seekBy(-10000));
        round(null, "+10", () -> seekBy(10000));
        if (hasNext) pill("Next episode", () -> a.nextEpisode());
        View sp = new View(a);
        buttons.addView(sp, new LinearLayout.LayoutParams(0, 1, 1));
        round("cc", null, () -> a.openSubtitles());
        round("audio", null, () -> a.openAudio());
        round("pic", null, () -> a.openPicture());
        btn = 0;
        draw();
    }

    private TextView round(String icon, String text, Runnable act) {
        TextView t = Ui.text(a, text == null ? "" : text, 16, Ui.T1, Ui.inter650);
        t.setGravity(Gravity.CENTER);
        Ui.tabular(t);
        if (icon != null) t.setTag(icon);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(Ui.dp(44), Ui.dp(44));
        lp.setMarginEnd(Ui.dp(10));
        buttons.addView(t, lp);
        btns.add(t);
        acts.add(act);
        return t;
    }
    private void pill(String text, Runnable act) {
        TextView t = Ui.text(a, text, 16, Ui.T1, Ui.outfit700);
        t.setGravity(Gravity.CENTER);
        android.graphics.drawable.Drawable ch = Ui.icon("chevR", Ui.T1, 18);
        ch.setBounds(0, 0, Ui.dp(18), Ui.dp(18));
        t.setCompoundDrawables(ch, null, null, null);
        t.setCompoundDrawablePadding(Ui.dp(8));
        t.setPadding(Ui.dp(16), 0, Ui.dp(18), 0);
        t.setTag("pill");
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, Ui.dp(40));
        lp.setMarginEnd(Ui.dp(10));
        buttons.addView(t, lp);
        btns.add(t);
        acts.add(act);
    }

    private void draw() {
        for (int i = 0; i < btns.size(); i++) {
            TextView t = btns.get(i);
            boolean f = row == 1 && i == btn;
            boolean pill = "pill".equals(t.getTag());
            GradientDrawable g = pill ? Ui.round(f ? Ui.S3 : 0, 999) : Ui.circle(f ? Ui.S3 : Ui.S2);
            if (f) g.setStroke(Ui.dp(3), Ui.FOCUS);
            else if (pill) g.setStroke(Ui.dp(2), Ui.BORDER_STRONG);
            t.setBackground(g);
            Object icon = t.getTag();
            if (icon instanceof String && !pill) {
                String name = t == playBtn ? (p.isPlaying() ? "pause" : "play") : (String) icon;
                android.graphics.drawable.Drawable d = Ui.icon(name, Ui.T1, 22);
                d.setBounds(0, 0, Ui.dp(22), Ui.dp(22));
                t.setCompoundDrawables(d, null, null, null);
                t.setPadding(Ui.dp(11), 0, 0, 0);
            }
        }
        seek.focused = row == 0;
        seek.invalidate();
    }

    /** The st-what line: [tick, text] from the player, or null for none. */
    void setWhat(boolean tick, String text) {
        boolean on = text != null && !text.isEmpty();
        whatRow.setVisibility(on ? View.VISIBLE : View.GONE);
        whatTick.setVisibility(tick ? View.VISIBLE : View.GONE);
        what.setText(on ? text : "");
    }
    void show() {
        a.fillWhat(this);
        boolean was = visible();
        top.setVisibility(View.VISIBLE);
        bar.setVisibility(View.VISIBLE);
        if (!was) a.handler.post(tick);
        draw();
        update();
        a.handler.removeCallbacks(hide);
        if (p.isPlaying() && !scrubbing) a.handler.postDelayed(hide, 4000);
        a.hintsChanged();
    }
    void hide() {
        if (scrubbing) return;
        top.setVisibility(View.GONE);
        bar.setVisibility(View.GONE);
        bubble.setVisibility(View.GONE);
        row = 0;   // the next time they come up, focus is back on the seek thumb
        a.handler.removeCallbacks(hide);
        a.hintsChanged();
    }
    void playStateChanged() { if (visible()) show(); }

    private void update() {
        long d = p.getDuration(), pos = scrubbing ? scrubPos : p.getCurrentPosition();
        if (d == C.TIME_UNSET || d <= 0) { seek.set(0); elapsed.setText(fmt(pos)); remaining.setText(""); ends.setText(""); return; }
        seek.set(pos / (float) d);
        elapsed.setText(fmt(pos));
        remaining.setText("-" + fmt(Math.max(0, d - pos)));
        float speed = p.getPlaybackParameters().speed;
        long endAt = System.currentTimeMillis() + (long) ((d - p.getCurrentPosition()) / Math.max(0.25f, speed));
        ends.setText("Ends at " + PlayerActivity.hm(endAt));
        if (scrubbing) {
            bubble.setVisibility(View.VISIBLE);
            bubble.setText(fmt(pos));
            bubble.measure(0, 0);
            float x = seek.thumbX() - bubble.getMeasuredWidth() / 2f;
            bubble.setTranslationX(Math.max(0, Math.min(seek.getWidth() - bubble.getMeasuredWidth(), x)));
        } else bubble.setVisibility(View.GONE);
    }

    static String fmt(long ms) {
        long s = Math.max(0, ms / 1000), h = s / 3600, m = (s % 3600) / 60, x = s % 60;
        return h > 0 ? String.format(Locale.ROOT, "%d:%02d:%02d", h, m, x) : String.format(Locale.ROOT, "%d:%02d", m, x);
    }

    private void toggle() { if (p.isPlaying()) p.pause(); else p.play(); draw(); show(); }
    private void seekBy(long ms) {
        long d = p.getDuration();
        long to = Math.max(0, p.getCurrentPosition() + ms);
        if (d != C.TIME_UNSET && d > 0) to = Math.min(d - 1000, to);
        p.seekTo(to);
        a.recordSeek();
        show();
    }

    /** Keys while nothing else is open. */
    boolean key(int code, boolean repeat) {
        boolean shown = visible();
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_LEFT: case KeyEvent.KEYCODE_DPAD_RIGHT: case KeyEvent.KEYCODE_MEDIA_REWIND: case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD: {
                int dir = code == KeyEvent.KEYCODE_DPAD_RIGHT || code == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD ? 1 : -1;
                if (shown && row == 1 && (code == KeyEvent.KEYCODE_DPAD_LEFT || code == KeyEvent.KEYCODE_DPAD_RIGHT)) {
                    btn = Math.max(0, Math.min(btns.size() - 1, btn + dir));
                    draw();
                    show();
                    return true;
                }
                if (!repeat) { scrubbing = false; seekBy(dir * 10000L); return true; }
                if (!scrubbing) { scrubbing = true; scrubFrom = System.currentTimeMillis(); scrubPos = p.getCurrentPosition(); }
                long held = System.currentTimeMillis() - scrubFrom;
                int speed = (int) Math.min(32, 1L << Math.min(5, held / 1000));
                long d = p.getDuration();
                scrubPos = Math.max(0, scrubPos + dir * 2500L * speed);
                if (d != C.TIME_UNSET && d > 0) scrubPos = Math.min(d - 1000, scrubPos);
                show();
                update();
                return true;
            }
            case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_NUMPAD_ENTER:
                if (repeat) return true;
                if (!shown && a.upNextShowing()) { a.nextEpisode(); return true; }
                if (shown && row == 1) { acts.get(btn).run(); return true; }
                toggle();
                return true;
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE: case KeyEvent.KEYCODE_SPACE: toggle(); return true;
            case KeyEvent.KEYCODE_MEDIA_PLAY: p.play(); show(); return true;
            case KeyEvent.KEYCODE_MEDIA_PAUSE: p.pause(); show(); return true;
            case KeyEvent.KEYCODE_DPAD_UP:
                if (shown && row == 1) return true;
                row = 1; btn = 0; show(); return true;
            case KeyEvent.KEYCODE_DPAD_DOWN:
                if (shown && row == 1) { row = 0; show(); return true; }
                if (!repeat) a.openOptions();
                return true;
            case KeyEvent.KEYCODE_CHANNEL_UP: case KeyEvent.KEYCODE_MEDIA_NEXT:
                if (!repeat) a.nextEpisode();
                return true;
        }
        return false;
    }
    /** Key up: a scrub seeks where it stopped. */
    boolean up(int code) {
        if (scrubbing && (code == KeyEvent.KEYCODE_DPAD_LEFT || code == KeyEvent.KEYCODE_DPAD_RIGHT || code == KeyEvent.KEYCODE_MEDIA_REWIND || code == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD)) {
            scrubbing = false;
            p.seekTo(scrubPos);
            a.recordSeek();
            show();
            return true;
        }
        return false;
    }
    /** Back hides the controls first. */
    boolean back() { if (visible()) { scrubbing = false; hide(); return true; } return false; }

    String[][] hints() {
        if (row == 1) return new String[][] { { "◀ ▶", "Move" }, { "OK", "Choose" }, { "▼", "Seek bar" }, { "Back", "Hide" } };
        return new String[][] { { "OK", p.isPlaying() ? "Pause" : "Play" }, { "◀ ▶", "Seek 10 s" }, { "▲", "Buttons" }, { "▼", "Options" }, { "Back", "Hide" } };
    }

    /** 6 dp seek bar: surface-3 track, gradient fill, 22 dp chalk thumb with the focus ring around it. */
    static final class Seek extends View {
        boolean focused = true;
        private float v;
        private final Paint track = new Paint(Paint.ANTI_ALIAS_FLAG), fill = new Paint(Paint.ANTI_ALIAS_FLAG), thumb = new Paint(Paint.ANTI_ALIAS_FLAG), ring = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF r = new RectF();
        Seek(Context c) {
            super(c);
            track.setColor(Ui.S3);
            thumb.setColor(Ui.T1);
            ring.setStyle(Paint.Style.STROKE);
            ring.setStrokeWidth(Ui.dp(3));
            ring.setColor(Ui.FOCUS);
        }
        void set(float x) { x = Math.max(0, Math.min(1, x)); if (x != v) { v = x; invalidate(); } }
        float pad() { return Ui.dp(14); }
        float thumbX() { return pad() + (getWidth() - pad() * 2) * v; }
        @Override protected void onSizeChanged(int w, int h, int ow, int oh) { fill.setShader(new LinearGradient(0, 0, w, 0, Ui.PINK, Ui.ORCHID, Shader.TileMode.CLAMP)); }
        @Override protected void onDraw(@NonNull Canvas c) {
            float cy = getHeight() / 2f, h = Ui.dp(6), x0 = pad(), x1 = getWidth() - pad(), tx = thumbX();
            r.set(x0, cy - h / 2, x1, cy + h / 2);
            c.drawRoundRect(r, h / 2, h / 2, track);
            r.set(x0, cy - h / 2, tx, cy + h / 2);
            c.drawRoundRect(r, h / 2, h / 2, fill);
            float tr = Ui.dp(11);
            c.drawCircle(tx, cy, focused ? tr : tr * 0.7f, thumb);
            if (focused) c.drawCircle(tx, cy, tr + Ui.dp(2.5f), ring);
        }
    }
}
