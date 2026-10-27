package app.tuner.player;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.DashPathEffect;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * The timeline (design/ui-v1/catchup/SPEC.md 6.1 to 6.4; player-tipoff, player-replay, player-scrub, player-programme,
 * player-video-replay, player-paused): the top block (title, sub, and on the right where you are), the bar with its
 * buttons, the track with the chapter ticks, the part not aired yet and the live point, the chapter row, the scrub
 * bubble and speed chip. What it shows comes from a {@link Model}: a replay ({@link Replay}) or live TV paused
 * ({@link LivePause}). The keys are the timeline map: ◀▶ 10 s (taps coalesce in the model; held, a scrub that moves only
 * the thumb and asks once on release), OK pause, ▲ the buttons, ▼ Options, Back hides.
 */
final class Timeline {
    interface Model {
        /** The bar's length (ms): fixed for a game, whatever the game does. */
        long length();
        /** Where the picture is (ms into the bar): the played position, or where a seek is going. */
        long shown();
        /** The live point, or -1 (a finished game, a video, a programme that has ended). */
        long livePos();
        List<Mark> ticks();
        /** The chapter you're in (its key), from the as-aired answers; null for none. */
        String current();
        String title();
        String sub();
        /** cu-pos line 1 and 2; line1Eye: the eye-off glyph before line 1. */
        String line1();
        String line2();
        boolean line1Eye();
        /** The chapter row's ends: the left one ("34:10", "10:15", "45 s ago"), the right ("−25:50", "11:00"); endHidden
         * draws [eye-off] End hidden at the right instead. */
        String leftEnd(long pos);
        String rightEnd(long pos);
        boolean endHidden();
        /** The scrub bubble: "Q3 · 1:12:00", never a chapter past Q4. */
        String bubble(long pos);
        /** The buttons, left group then right group; key: when it changes, the row is rebuilt. */
        List<Btn> buttons();
        String buttonsKey();
        boolean playing();
        void toggle();
        /** A tap or a scrub's release: where to go (the model coalesces taps and keeps seeks inside the buffer local). */
        void seekBy(long ms);
        void seekTo(long pos);
        /** The furthest the thumb may go while scrubbing (a hidden video's scrub may run to the bar's end). */
        long scrubMax();
        /** ▶ at the live point: back to live (the replay's card first when the game is hidden). */
        void atLive();
        void options();
        /** CH±: leave the timeline for live TV. */
        void channel(int dir);
        /** ◀▶ step for a tap. */
        long step();
    }
    static final class Mark {
        final String key, label;
        final long at;
        Mark(String key, String label, long at) { this.key = key; this.label = label; this.at = at; }
    }
    static final class Btn {
        final String id, icon, text, hint;
        final boolean pill, right;
        final Runnable act;
        Btn(String id, String icon, String text, boolean pill, boolean right, String hint, Runnable act) {
            this.id = id; this.icon = icon; this.text = text; this.pill = pill; this.right = right; this.hint = hint; this.act = act;
        }
    }

    private final PlayerActivity a;
    Model m;
    final LinearLayout top, bar;
    private final TextView title, sub, pos1, pos2, bubble, speedChip;
    private final ImageView eye;
    private final LinearLayout buttons;
    private final Track track;
    private final List<TextView> btnViews = new ArrayList<>();
    private List<Btn> btns = new ArrayList<>();
    private String btnKey = "";
    private int row;   // 0 the track, 1 the buttons
    private int btn;
    private boolean scrubbing;
    private long scrubPos, scrubFrom;
    private int scrubDir;
    private long liveGuardUntil;

    private final Runnable hide = this::hide;
    private final Runnable tick = new Runnable() { @Override public void run() { update(); if (visible()) a.handler.postDelayed(this, 250); } };

    Timeline(PlayerActivity a, FrameLayout root) {
        this.a = a;
        Context c = a;
        top = new LinearLayout(c);
        top.setGravity(Gravity.TOP);
        LinearLayout tcol = new LinearLayout(c);
        tcol.setOrientation(LinearLayout.VERTICAL);
        title = Ui.line(c, "", 28, Ui.T1, Ui.outfit700);
        Ui.lineHeight(title, 32);
        sub = Ui.line(c, "", 16, Ui.T2, Ui.inter500);
        Ui.lineHeight(sub, 22);
        tcol.addView(title);
        tcol.addView(sub);
        top.addView(tcol, new LinearLayout.LayoutParams(0, -2, 1));
        LinearLayout pcol = new LinearLayout(c);
        pcol.setOrientation(LinearLayout.VERTICAL);
        pcol.setGravity(Gravity.END);
        LinearLayout l1 = new LinearLayout(c);
        l1.setGravity(Gravity.CENTER_VERTICAL);
        eye = Ui.iconView(c, "eyeOff", Ui.T1, 18);
        LinearLayout.LayoutParams el = new LinearLayout.LayoutParams(Ui.dp(18), Ui.dp(18));
        el.setMarginEnd(Ui.dp(6));
        l1.addView(eye, el);
        pos1 = Ui.line(c, "", 18, Ui.T1, Ui.inter650);
        Ui.lineHeight(pos1, 22);
        Ui.tabular(pos1);
        l1.addView(pos1);
        pos2 = Ui.line(c, "", 15, Ui.T2, Ui.inter500);
        Ui.lineHeight(pos2, 20);
        pos2.setGravity(Gravity.END);
        pcol.addView(l1);
        pcol.addView(pos2);
        LinearLayout.LayoutParams pl = new LinearLayout.LayoutParams(-2, -2);
        pl.setMarginStart(Ui.dp(24));
        top.addView(pcol, pl);
        top.setPadding(Ui.dp(48), Ui.dp(30), Ui.dp(48), Ui.dp(36));
        top.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[] { Ui.SCRIM, 0x0015131D }));
        root.addView(top, new FrameLayout.LayoutParams(-1, -2, Gravity.TOP));

        bar = new LinearLayout(c);
        bar.setOrientation(LinearLayout.VERTICAL);
        bar.setPadding(Ui.dp(20), Ui.dp(16), Ui.dp(20), Ui.dp(10));
        bar.setBackground(Ui.round(Ui.BANNER, 16));
        bar.setClipChildren(false);
        bar.setClipToPadding(false);
        buttons = new LinearLayout(c);
        buttons.setGravity(Gravity.CENTER_VERTICAL);
        bar.addView(buttons, new LinearLayout.LayoutParams(-1, Ui.dp(44)));
        track = new Track(c);
        LinearLayout.LayoutParams tl = new LinearLayout.LayoutParams(-1, Ui.dp(Track.H));
        tl.topMargin = Ui.dp(14 - 8);
        tl.setMarginStart(-Ui.dp(Track.PAD));
        tl.setMarginEnd(-Ui.dp(Track.PAD));
        bar.addView(track, tl);
        FrameLayout.LayoutParams bl = new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM);
        bl.setMargins(Ui.dp(48), 0, Ui.dp(48), Ui.dp(64));
        root.addView(bar, bl);

        // the scrub bubble and the speed chip, above the bar on the thumb
        bubble = Ui.text(c, "", 15, Ui.INK, Ui.inter700);
        bubble.setGravity(Gravity.CENTER);
        bubble.setBackground(Ui.round(Ui.T1, 8));
        bubble.setPadding(Ui.dp(10), 0, Ui.dp(10), 0);
        Ui.tabular(bubble);
        FrameLayout.LayoutParams bb = new FrameLayout.LayoutParams(-2, Ui.dp(28), Gravity.BOTTOM | Gravity.START);
        bb.bottomMargin = Ui.dp(64 + 126 + 12);
        root.addView(bubble, bb);
        speedChip = Ui.text(c, "", 15, Ui.T1, Ui.inter700);
        speedChip.setGravity(Gravity.CENTER);
        GradientDrawable sg = Ui.round(Ui.BG1, 8);
        sg.setStroke(Math.max(1, Ui.dp(1)), Ui.BORDER_STRONG);
        speedChip.setBackground(sg);
        speedChip.setPadding(Ui.dp(10), 0, Ui.dp(10), 0);
        root.addView(speedChip, new FrameLayout.LayoutParams(bb));
        top.setVisibility(View.GONE);
        bar.setVisibility(View.GONE);
        bubble.setVisibility(View.GONE);
        speedChip.setVisibility(View.GONE);
    }

    boolean visible() { return bar.getVisibility() == View.VISIBLE; }
    boolean scrubbing() { return scrubbing; }
    /** After the map switches back to live, for 800 ms key repeats are dropped and ▶ is ignored (M8). */
    void guardLive() { liveGuardUntil = SystemClock.uptimeMillis() + 800; }
    boolean guarded() { return SystemClock.uptimeMillis() < liveGuardUntil; }

    void show() {
        if (m == null) return;
        boolean was = visible();
        top.setVisibility(View.VISIBLE);
        bar.setVisibility(View.VISIBLE);
        if (!was) { a.handler.post(tick); a.timelineShown(); }
        rebuild(false);
        update();
        a.handler.removeCallbacks(hide);
        if (m.playing() && !scrubbing) a.handler.postDelayed(hide, 4000);
        a.hintsChanged();
        a.updateBug();
    }
    void hide() {
        if (scrubbing) return;
        top.setVisibility(View.GONE);
        bar.setVisibility(View.GONE);
        bubble.setVisibility(View.GONE);
        speedChip.setVisibility(View.GONE);
        row = 0;
        a.handler.removeCallbacks(hide);
        a.hintsChanged();
        a.updateBug();
    }
    void playStateChanged() { if (visible()) show(); }
    /** The model changed (a new link, the game answer, the skip label): redraw what's up. */
    void changed() { if (visible()) { rebuild(false); update(); a.hintsChanged(); } }

    private void rebuild(boolean force) {
        String k = m.buttonsKey();
        if (!force && k.equals(btnKey) && !btnViews.isEmpty()) { draw(); return; }
        String was = btn < btns.size() ? btns.get(btn).id : null;
        btnKey = k;
        btns = m.buttons();
        buttons.removeAllViews();
        btnViews.clear();
        boolean spaced = false;
        for (Btn b : btns) {
            if (b.right && !spaced) { spaced = true; buttons.addView(new View(a), new LinearLayout.LayoutParams(0, 1, 1)); }
            TextView t;
            if (b.pill) t = Ui.pill(a, b.text, b.icon, "skip".equals(b.id) || "next".equals(b.id));
            else {
                t = Ui.text(a, b.text == null ? "" : b.text, 15, Ui.T1, Ui.inter700);
                t.setGravity(Gravity.CENTER);
                Ui.tabular(t);
                if (b.icon != null) {
                    Drawable d = Ui.icon(b.icon, Ui.T1, 22);
                    d.setBounds(0, 0, Ui.dp(22), Ui.dp(22));
                    t.setCompoundDrawables(d, null, null, null);
                    t.setPadding(Ui.dp(11), 0, 0, 0);
                }
            }
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(b.pill ? -2 : Ui.dp(44), Ui.dp(b.pill ? 40 : 44));
            lp.setMarginEnd(Ui.dp(10));
            buttons.addView(t, lp);
            btnViews.add(t);
        }
        if (!spaced) buttons.addView(new View(a), new LinearLayout.LayoutParams(0, 1, 1));
        btn = 0;
        if (was != null) for (int i = 0; i < btns.size(); i++) if (btns.get(i).id.equals(was)) btn = i;
        btn = Math.max(0, Math.min(btns.size() - 1, btn));
        draw();
    }

    private void draw() {
        for (int i = 0; i < btnViews.size(); i++) {
            TextView t = btnViews.get(i);
            Btn b = btns.get(i);
            boolean f = row == 1 && i == btn;
            if (b.pill) { Ui.pillState(t, false, f); continue; }
            GradientDrawable g = Ui.circle(f ? Ui.S3 : Ui.S2);
            if (f) g.setStroke(Ui.dp(3), Ui.FOCUS);
            t.setBackground(g);
            if ("play".equals(b.id)) {
                Drawable d = Ui.icon(m.playing() ? "pause" : "play", Ui.T1, 22);
                d.setBounds(0, 0, Ui.dp(22), Ui.dp(22));
                t.setCompoundDrawables(d, null, null, null);
            }
        }
        track.focused = row == 0;
        track.invalidate();
    }

    private void update() {
        if (m == null) return;
        title.setText(m.title());
        String s = m.sub();
        sub.setText(s == null ? "" : s);
        sub.setVisibility(s == null || s.isEmpty() ? View.GONE : View.VISIBLE);
        String l1 = m.line1(), l2 = m.line2();
        pos1.setText(l1 == null ? "" : l1);
        eye.setVisibility(m.line1Eye() && l1 != null && !l1.isEmpty() ? View.VISIBLE : View.GONE);
        pos2.setText(l2 == null ? "" : l2);
        pos2.setVisibility(l2 == null || l2.isEmpty() ? View.GONE : View.VISIBLE);
        long pos = scrubbing ? scrubPos : m.shown();
        track.pos = pos;
        track.invalidate();
        if (scrubbing) {
            bubble.setText(m.bubble(pos));
            bubble.setVisibility(View.VISIBLE);
            speedChip.setText((scrubDir > 0 ? "▶▶ ×" : "◀◀ ×") + speed());
            speedChip.setVisibility(View.VISIBLE);
            bubble.measure(0, 0);
            speedChip.measure(0, 0);
            float x = bar.getX() + track.getX() + track.thumbX() - bubble.getMeasuredWidth() / 2f;
            float maxX = bar.getX() + bar.getWidth() - bubble.getMeasuredWidth() - speedChip.getMeasuredWidth() - Ui.dp(8);
            x = Math.max(bar.getX(), Math.min(maxX, x));
            bubble.setTranslationX(x);
            speedChip.setTranslationX(x + bubble.getMeasuredWidth() + Ui.dp(8));
        } else { bubble.setVisibility(View.GONE); speedChip.setVisibility(View.GONE); }
        String k = m.buttonsKey();
        if (!k.equals(btnKey)) rebuild(false);
        else draw();
    }
    private int speed() { long held = SystemClock.uptimeMillis() - scrubFrom; return (int) Math.min(32, 2L << Math.min(4, held / 1000)); }

    /** Keys while nothing else is open (the timeline map, 6.1). */
    boolean key(int code, boolean repeat) {
        if (m == null) return false;
        boolean shown = visible();
        if (guarded() && (repeat || code == KeyEvent.KEYCODE_DPAD_RIGHT)) return true;
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_LEFT: case KeyEvent.KEYCODE_DPAD_RIGHT: case KeyEvent.KEYCODE_MEDIA_REWIND: case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD: {
                int dir = code == KeyEvent.KEYCODE_DPAD_RIGHT || code == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD ? 1 : -1;
                if (shown && row == 1 && (code == KeyEvent.KEYCODE_DPAD_LEFT || code == KeyEvent.KEYCODE_DPAD_RIGHT)) {
                    btn = Math.max(0, Math.min(btns.size() - 1, btn + dir));
                    draw();
                    show();
                    return true;
                }
                long live = m.livePos();
                if (dir > 0 && live >= 0 && m.shown() >= live - 15000 && !scrubbing) {   // reaching the live point
                    if (!repeat) m.atLive();
                    return true;
                }
                if (!repeat) { scrubbing = false; m.seekBy(dir * m.step()); show(); return true; }
                if (!scrubbing) { scrubbing = true; scrubDir = dir; scrubFrom = SystemClock.uptimeMillis(); scrubPos = m.shown(); }
                scrubDir = dir;
                scrubPos = Math.max(0, Math.min(m.scrubMax(), scrubPos + dir * 1500L * speed()));
                if (live >= 0) scrubPos = Math.min(scrubPos, Math.max(0, live - 10000));
                show();
                update();
                return true;
            }
            case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_NUMPAD_ENTER:
                if (repeat) return true;
                if (shown && row == 1 && btn < btns.size()) { btns.get(btn).act.run(); draw(); if (visible()) show(); return true; }
                m.toggle();
                show();
                return true;
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE: case KeyEvent.KEYCODE_SPACE: if (!repeat) { m.toggle(); show(); } return true;
            case KeyEvent.KEYCODE_MEDIA_PLAY: if (!m.playing()) m.toggle(); show(); return true;
            case KeyEvent.KEYCODE_MEDIA_PAUSE: if (m.playing()) m.toggle(); show(); return true;
            case KeyEvent.KEYCODE_DPAD_UP:
                if (shown && row == 1) return true;
                row = 1; btn = 0; show(); return true;
            case KeyEvent.KEYCODE_DPAD_DOWN:
                if (shown && row == 1) { row = 0; show(); return true; }
                if (!repeat) m.options();
                return true;
            case KeyEvent.KEYCODE_CHANNEL_UP: case KeyEvent.KEYCODE_PAGE_UP: if (!repeat) m.channel(1); return true;
            case KeyEvent.KEYCODE_CHANNEL_DOWN: case KeyEvent.KEYCODE_PAGE_DOWN: if (!repeat) m.channel(-1); return true;
        }
        return false;
    }
    /** Key up: a scrub asks for its place once, where it stopped. */
    boolean up(int code) {
        if (scrubbing && (code == KeyEvent.KEYCODE_DPAD_LEFT || code == KeyEvent.KEYCODE_DPAD_RIGHT || code == KeyEvent.KEYCODE_MEDIA_REWIND || code == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD)) {
            scrubbing = false;
            m.seekTo(scrubPos);
            show();
            return true;
        }
        return false;
    }
    /** Back hides the bar first. */
    boolean back() { if (visible()) { scrubbing = false; hide(); return true; } return false; }

    String[][] hints() {
        if (row == 1 && btn < btns.size()) return new String[][] { { "OK", btns.get(btn).hint }, { "◀ ▶", "Buttons" }, { "▼", "Seek bar" }, { "Back", "Hide" } };
        return new String[][] { { "OK", m.playing() ? "Pause" : "Play" }, { "◀ ▶", m.step() >= 10000 ? "10 s, hold for faster" : "10 s" }, { "▲", "Buttons" }, { "▼", "Options" }, { "Back", "Hide" } };
    }
    /** For the emulator test: what the bar shows, in words. */
    String describe() {
        StringBuilder b = new StringBuilder();
        for (Btn x : btns) b.append(x.pill ? x.text : x.id).append(' ');
        return b.toString().trim();
    }

    static String clock(long ms) {
        long s = Math.max(0, ms / 1000), h = s / 3600, mm = (s % 3600) / 60, x = s % 60;
        return h > 0 ? String.format(Locale.ROOT, "%d:%02d:%02d", h, mm, x) : String.format(Locale.ROOT, "%d:%02d", mm, x);
    }
    static String hms(long ms) {
        long s = Math.max(0, ms / 1000);
        return String.format(Locale.ROOT, "%d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60);
    }

    /** The track and the chapter row under it, drawn in one view so the labels sit exactly on their ticks. */
    final class Track extends View {
        static final int H = 22 + 4 + 24, PAD = 12;
        boolean focused = true;
        long pos;
        private final Paint trackP = new Paint(Paint.ANTI_ALIAS_FLAG), fill = new Paint(Paint.ANTI_ALIAS_FLAG), thumb = new Paint(Paint.ANTI_ALIAS_FLAG),
                ring = new Paint(Paint.ANTI_ALIAS_FLAG), tickP = new Paint(Paint.ANTI_ALIAS_FLAG), ahead = new Paint(Paint.ANTI_ALIAS_FLAG),
                dash = new Paint(Paint.ANTI_ALIAS_FLAG), live = new Paint(Paint.ANTI_ALIAS_FLAG), edge = new Paint(Paint.ANTI_ALIAS_FLAG),
                label = new Paint(Paint.ANTI_ALIAS_FLAG), pill = new Paint(Paint.ANTI_ALIAS_FLAG), pillBg = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF r = new RectF();
        private final Drawable eyeD = Ui.icon("eyeOff", Ui.T2, 16);
        Track(Context c) {
            super(c);
            trackP.setColor(Ui.S3);
            thumb.setColor(Ui.T1);
            ring.setStyle(Paint.Style.STROKE); ring.setStrokeWidth(Ui.dp(3)); ring.setColor(Ui.FOCUS);
            tickP.setColor(Ui.T2);
            ahead.setColor(Ui.BG1);
            dash.setStyle(Paint.Style.STROKE); dash.setStrokeWidth(Math.max(1, Ui.dp(1))); dash.setColor(Ui.BORDER_STRONG);
            dash.setPathEffect(new DashPathEffect(new float[] { Ui.dp(4), Ui.dp(3) }, 0));
            live.setColor(Ui.LIVE);
            edge.setColor(Ui.BG1);
            label.setTextSize(Ui.dp(14));
            pill.setStyle(Paint.Style.STROKE); pill.setStrokeWidth(Ui.dp(2)); pill.setColor(Ui.LIVE);
            pillBg.setColor(0x29FF4B4B);
        }
        private float x0() { return Ui.dp(PAD); }
        private float x1() { return getWidth() - Ui.dp(PAD); }
        private float xOf(long t) { long len = Math.max(1, m.length()); return x0() + (x1() - x0()) * Math.max(0, Math.min(1f, t / (float) len)); }
        float thumbX() { return xOf(pos); }
        @Override protected void onSizeChanged(int w, int h, int ow, int oh) { fill.setShader(new LinearGradient(x0(), 0, x1(), 0, Ui.PINK, Ui.ORCHID, Shader.TileMode.CLAMP)); }
        @Override protected void onDraw(@NonNull Canvas c) {
            if (m == null) return;
            float cy = Ui.dp(11), h = Ui.dp(6), x0 = x0(), x1 = x1(), tx = thumbX();
            long lp = m.livePos();
            float lx = lp >= 0 && lp < m.length() ? xOf(lp) : -1;
            // the track; from the live point on, what hasn't aired yet: dashed
            r.set(x0, cy - h / 2, lx >= 0 ? lx : x1, cy + h / 2);
            c.drawRoundRect(r, h / 2, h / 2, trackP);
            if (lx >= 0) { r.set(lx, cy - h / 2, x1, cy + h / 2); c.drawRoundRect(r, h / 2, h / 2, ahead); c.drawRoundRect(r, h / 2, h / 2, dash); }
            r.set(x0, cy - h / 2, Math.max(x0 + h, tx), cy + h / 2);
            c.drawRoundRect(r, h / 2, h / 2, fill);
            // chapter ticks
            List<Mark> ticks = m.ticks();
            for (Mark k : ticks) {
                float x = xOf(k.at);
                r.set(x - Ui.dp(1), cy - Ui.dp(7), x + Ui.dp(1), cy + Ui.dp(7));
                c.drawRoundRect(r, Ui.dp(1), Ui.dp(1), tickP);
            }
            // the live point, and its pill in the chapter row
            List<RectF> taken = new ArrayList<>();
            float rowTop = Ui.dp(26), base = rowTop + Ui.dp(17);
            if (lx >= 0) {
                c.drawCircle(lx, cy, Ui.dp(7), edge);
                c.drawCircle(lx, cy, Ui.dp(5), live);
                label.setTypeface(Ui.inter700);
                label.setTextSize(Ui.dp(13));
                label.setLetterSpacing(0.1f);
                float tw = label.measureText("LIVE"), pw = Ui.dp(8 + 8 + 5) + tw + Ui.dp(8), ph = Ui.dp(22);
                float px = lx + Ui.dp(12) + pw > x1 - Ui.dp(90 - 12) && lx > x1 - Ui.dp(90) ? lx - Ui.dp(12) - pw : lx + Ui.dp(12);
                RectF pr = new RectF(px, rowTop + Ui.dp(1), px + pw, rowTop + Ui.dp(1) + ph);
                c.drawRoundRect(pr, ph / 2, ph / 2, pillBg);
                c.drawRoundRect(pr, ph / 2, ph / 2, pill);
                c.drawCircle(pr.left + Ui.dp(8 + 4), pr.centerY(), Ui.dp(4), live);
                label.setColor(Ui.LIVE_TEXT);
                c.drawText("LIVE", pr.left + Ui.dp(8 + 8 + 5), pr.centerY() + Ui.dp(4.5f), label);
                label.setLetterSpacing(0);
                label.setTextSize(Ui.dp(14));
                taken.add(new RectF(pr.left - Ui.dp(6), pr.top, pr.right + Ui.dp(6), pr.bottom));
            }
            // the ends: elapsed and remaining, or [eye-off] End hidden
            label.setTypeface(Ui.inter500);
            label.setColor(Ui.T2);
            String le = m.leftEnd(pos);
            if (le != null && !le.isEmpty()) { float w = label.measureText(le); c.drawText(le, x0, base, label); taken.add(new RectF(x0, rowTop, x0 + w + Ui.dp(8), rowTop + Ui.dp(24))); }
            if (m.endHidden()) {
                String t = "End hidden";
                float w = label.measureText(t), ix = x1 - w - Ui.dp(22);
                c.drawText(t, x1 - w, base, label);
                eyeD.setBounds((int) ix, (int) (rowTop + Ui.dp(4)), (int) ix + Ui.dp(16), (int) (rowTop + Ui.dp(20)));
                eyeD.draw(c);
                taken.add(new RectF(ix - Ui.dp(8), rowTop, x1, rowTop + Ui.dp(24)));
            } else {
                String re = m.rightEnd(pos);
                if (re != null && !re.isEmpty()) { float w = label.measureText(re); c.drawText(re, x1 - w, base, label); taken.add(new RectF(x1 - w - Ui.dp(8), rowTop, x1, rowTop + Ui.dp(24))); }
            }
            // chapter labels, centred on their ticks; the one you're in chalk (the current one first, so it always shows)
            String cur = m.current();
            List<Mark> order = new ArrayList<>();
            for (Mark k : ticks) if (k.key.equals(cur)) order.add(k);
            for (Mark k : ticks) if (!k.key.equals(cur)) order.add(k);
            for (Mark k : order) {
                boolean on = k.key.equals(cur);
                label.setTypeface(on ? Ui.inter650 : Ui.inter500);
                label.setColor(on ? Ui.T1 : Ui.T3);
                String t = "Halftime".equals(k.label) ? "Half" : k.label;
                float w = label.measureText(t), x = Math.max(x0, Math.min(x1 - w, xOf(k.at) - w / 2));
                RectF lr = new RectF(x - Ui.dp(4), rowTop, x + w + Ui.dp(4), rowTop + Ui.dp(24));
                boolean clash = false;
                for (RectF o : taken) if (RectF.intersects(o, lr)) { clash = true; break; }
                if (clash) continue;
                taken.add(lr);
                c.drawText(t, x, base, label);
            }
            // the thumb: 18 dp, 22 with the ring when focused
            float tr = Ui.dp(focused ? 11 : 9);
            c.drawCircle(tx, cy, tr, thumb);
            if (focused) c.drawCircle(tx, cy, tr + Ui.dp(2.5f), ring);
        }
    }
}
