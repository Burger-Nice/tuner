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
    final Hud hud;
    private final LinearLayout buttons;
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
        hud = new Hud(a, root);
        buttons = hud.row;
    }

    boolean visible() { return hud.up(); }
    boolean scrubbing() { return scrubbing; }
    /** After the map switches back to live, for 800 ms key repeats are dropped and ▶ is ignored (M8). */
    void guardLive() { liveGuardUntil = SystemClock.uptimeMillis() + 800; }
    boolean guarded() { return SystemClock.uptimeMillis() < liveGuardUntil; }

    /** Live paused: the channel's banner is the top block (SPEC 4.8), and the corner sits under its tags. */
    private boolean bannerTop() { return m instanceof LivePause; }
    void show() {
        if (m == null) return;
        boolean was = visible();
        hud.topBlock(!bannerTop());
        hud.show();
        if (!was) { a.handler.post(tick); a.timelineShown(); }
        rebuild(false);
        update();
        hud.touch();
        a.handler.removeCallbacks(hide);
        if (m.playing() && !scrubbing) a.handler.postDelayed(hide, 4000);
        if (!was) { a.timelineBanner(bannerTop()); a.placeChip(); }
        a.hintsChanged();
        a.updateBug();
    }
    void hide() {
        if (scrubbing) return;
        boolean was = visible();
        hud.hide();
        row = 0;
        hud.focus(null, null);
        a.handler.removeCallbacks(hide);
        if (was) { a.timelineBanner(false); a.placeChip(); }
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
        TextView last = null;
        for (Btn b : btns) {
            if (b.right && !spaced) {
                spaced = true;
                if (last != null) ((LinearLayout.LayoutParams) last.getLayoutParams()).setMarginEnd(0);
                buttons.addView(new View(a), new LinearLayout.LayoutParams(0, 1, 1));
            }
            TextView t = b.pill ? Ui.pill(a, b.text, b.icon, "skip".equals(b.id) || "next".equals(b.id)) : Ui.disc(a, b.icon, b.text);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(b.pill ? -2 : Ui.dp(44), Ui.dp(b.pill ? 40 : 44));
            lp.setMarginEnd(Ui.dp(10));
            buttons.addView(t, lp);
            btnViews.add(t);
            last = t;
        }
        if (last != null) ((LinearLayout.LayoutParams) last.getLayoutParams()).setMarginEnd(0);
        if (!spaced) buttons.addView(new View(a), new LinearLayout.LayoutParams(0, 1, 1));
        btn = 0;
        if (was != null) for (int i = 0; i < btns.size(); i++) if (btns.get(i).id.equals(was)) btn = i;
        btn = Math.max(0, Math.min(btns.size() - 1, btn));
        draw();
    }

    /** The focused button's name, over it ("Subtitles · Icelandic", "Back to live"). */
    private String labelOf(Btn b) {
        switch (b.id) {
            case "play": return m.playing() ? "Pause" : "Play";
            case "cc": case "audio": case "pic": return a.buttonLabel(b.id);
            default: return b.pill && b.text != null ? b.text : b.hint;
        }
    }
    /** For the emulator test: the name over the focused button. */
    String labelText() { return hud.labelText(); }

    private void draw() {
        for (int i = 0; i < btnViews.size(); i++) {
            TextView t = btnViews.get(i);
            Btn b = btns.get(i);
            boolean f = row == 1 && i == btn;
            if (b.pill) { Ui.pillState(t, false, f); continue; }
            Ui.discState(t, f);
            if ("play".equals(b.id)) Ui.discIcon(t, m.playing() ? "pause" : "play");
        }
        hud.track.focused = row == 0;
        hud.track.invalidate();
        boolean on = row == 1 && btn < btns.size();
        hud.focus(on ? btnViews.get(btn) : null, on ? labelOf(btns.get(btn)) : null);
        hud.paused(!m.playing());
    }

    private void update() {
        if (m == null) return;
        hud.title(m.title(), null, null, false);
        hud.sub(m.sub());
        hud.corner(m.line1(), m.line1Eye(), m.line2());
        long pos = scrubbing ? scrubPos : m.shown();
        Track t = hud.track;
        t.length = Math.max(1, m.length());
        t.pos = pos;
        t.live = m.livePos();
        t.ticks = m.ticks();
        t.current = m.current();
        t.left = m.leftEnd(pos);
        t.right = m.rightEnd(pos);
        t.endHidden = m.endHidden();
        t.invalidate();
        hud.scrubbing(scrubbing);
        if (scrubbing) hud.placeBubble(m.bubble(pos), (scrubDir > 0 ? "▶▶ ×" : "◀◀ ×") + speed());
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
        // after the 2 min fade: any key brings the bar back; OK and ⏯ also do what they do
        if (shown && hud.wake() && !VodControls.playKey(code)) { show(); return true; }
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
}
