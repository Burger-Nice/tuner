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
 * Movies and episodes (design/ui-v1/player-v2/SPEC.md 4.1 to 4.5): the title block top-left, the corner (Ends at / n min
 * left; Paused), and on the bottom scrim the buttons row and the track, no box. Focus rests on the seek thumb: ◀▶ seek
 * 10 s (holding scrubs, faster every second, up to ×32), OK pauses and resumes, ▲ reaches the buttons, ▼ opens Options.
 * The controls hide after 4 s while playing; paused they stay, and fade to 35 % after 2 min (any key brings them back;
 * OK and ⏯ also act).
 */
final class VodControls {
    private final PlayerActivity a;
    private final ExoPlayer p;
    final Hud hud;
    private final LinearLayout buttons;
    private final List<TextView> btns = new ArrayList<>();
    private final List<String> ids = new ArrayList<>();
    private final List<Runnable> acts = new ArrayList<>();
    private int row;            // 0 the seek thumb, 1 the buttons
    private int btn;
    private boolean scrubbing;
    private long scrubPos, scrubFrom;
    private int scrubDir = 1;
    private TextView playBtn, nextBtn;

    private final Runnable hide = this::hide;
    private final Runnable tick = new Runnable() { @Override public void run() { update(); if (visible()) a.handler.postDelayed(this, 250); } };

    VodControls(PlayerActivity a, ExoPlayer p, FrameLayout root) {
        this.a = a;
        this.p = p;
        hud = new Hud(a, root);
        buttons = hud.row;
    }

    boolean visible() { return hud.up(); }

    /** New title: rebuild the buttons (Next episode only when there is one). */
    void setItem(PlayerActivity.Entry e, boolean hasNext) {
        hud.title(e.title, e.artLogo, e.artBox, e.artDark);
        hud.sub(e.sub);
        hud.story(e.line);
        buttons.removeAllViews();
        btns.clear();
        ids.clear();
        acts.clear();
        playBtn = disc("play", "play", null, () -> toggle());
        disc("m10", null, "−10", () -> seekBy(-10000));
        disc("p10", null, "+10", () -> seekBy(10000));
        nextBtn = hasNext ? pill("next", "Next episode", () -> a.nextEpisode()) : null;
        skipBtn = null;
        spacer = new View(a);
        buttons.addView(spacer, new LinearLayout.LayoutParams(0, 1, 1));
        disc("cc", "cc", null, () -> a.openSubtitles());
        disc("audio", "audio", null, () -> a.openAudio());
        TextView last = disc("pic", "pic", null, () -> a.openPicture());
        ((LinearLayout.LayoutParams) last.getLayoutParams()).setMarginEnd(0);
        btn = 0;
        if (skipLabel != null) addSkip();
        draw();
    }

    // ---------- the Skip intro / Back to intro pill (design/ui-v1/skip SPEC 3.3): the last of the left group ----------
    private View spacer;
    private TextView skipBtn;
    private String skipLabel, skipIcon;
    private Runnable skipAct;
    /** The pill (label null: none). Nothing to its left moves; when it goes with focus on it, focus goes to the thumb. */
    void setSkip(String label, String icon, Runnable act) {
        skipAct = act;
        if (label == null) {
            skipLabel = null;
            if (skipBtn == null) return;
            int at = btns.indexOf(skipBtn);
            buttons.removeView(skipBtn);
            btns.remove(at);
            ids.remove(at);
            acts.remove(at);
            skipBtn = null;
            if (row == 1 && btn == at) row = 0;   // (the controls keep their 4 s timer)
            else if (btn > at) btn--;
            draw();
            return;
        }
        boolean had = skipBtn != null;
        skipLabel = label;
        skipIcon = icon;
        if (!had) addSkip(); else { skipBtn.setText(label); skipIcon(skipBtn, icon); acts.set(btns.indexOf(skipBtn), () -> { if (skipAct != null) skipAct.run(); }); }
        draw();
    }
    private void addSkip() {
        if (spacer == null) return;
        TextView t = Ui.pill(a, skipLabel, skipIcon == null ? "skipFwd" : skipIcon, false);
        t.setTag("pill");
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, Ui.dp(40));
        lp.setMarginStart(Ui.dp(6));   // (16 either side with the pill before it)
        lp.setMarginEnd(Ui.dp(16));
        int at = buttons.indexOfChild(spacer), bi = 0;
        for (int i = 0; i < at; i++) if (btns.contains(buttons.getChildAt(i))) bi++;
        buttons.addView(t, at, lp);
        btns.add(bi, t);
        ids.add(bi, "skip");
        acts.add(bi, () -> { if (skipAct != null) skipAct.run(); });
        if (btn >= bi && row == 1) btn++;   // (focus stays on what it was on: a late answer adds the pill without moving it)
        skipBtn = t;
    }
    private static void skipIcon(TextView t, String icon) {
        android.graphics.drawable.Drawable d = Ui.icon(icon == null ? "skipFwd" : icon, Ui.T1, 20);
        d.setBounds(0, 0, Ui.dp(20), Ui.dp(20));
        t.setCompoundDrawables(d, null, null, null);
    }
    /** After a skip from the pill, or when it goes: focus on the seek thumb. */
    void focusSeek() { row = 0; draw(); if (visible()) show(); }
    boolean scrubbing() { return scrubbing; }
    boolean onButtons() { return row == 1; }
    /** For the emulator test: what has focus. */
    String focusName() { if (row == 0 || btn >= btns.size()) return "seek"; TextView t = btns.get(btn); return t.getText().length() > 0 ? t.getText().toString() : String.valueOf(t.getTag()); }
    /** ▲: the buttons, on the Skip pill while its window is fresh, on Next episode while Up next counts, else on Play. */
    private int upTo() {
        if (skipBtn != null && a.skipPillFresh()) return btns.indexOf(skipBtn);
        if (nextBtn != null && a.upNextShowing()) return btns.indexOf(nextBtn);
        return 0;
    }
    /** For the emulator test: the name over the focused button. */
    String labelText() { return hud.labelText(); }

    private TextView disc(String id, String icon, String text, Runnable act) {
        TextView t = Ui.disc(a, icon, text);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(Ui.dp(44), Ui.dp(44));
        lp.setMarginEnd(Ui.dp(10));
        buttons.addView(t, lp);
        btns.add(t);
        ids.add(id);
        acts.add(act);
        return t;
    }
    private TextView pill(String id, String text, Runnable act) {
        TextView t = Ui.pill(a, text, null, true);
        t.setTag("pill");
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, Ui.dp(40));
        lp.setMarginEnd(Ui.dp(10));
        buttons.addView(t, lp);
        btns.add(t);
        ids.add(id);
        acts.add(act);
        return t;
    }

    private boolean paused() { return !p.getPlayWhenReady(); }
    /** The focused button's name, over it: "Subtitles · Icelandic", "Skip intro". */
    private String labelOf(int i) {
        String id = ids.get(i);
        switch (id) {
            case "play": return paused() ? "Play" : "Pause";
            case "m10": return "Back 10 s";
            case "p10": return "On 10 s";
            case "next": return a.upNextShowing() ? "Play now" : "Next episode";
            case "skip": return skipLabel == null ? "" : skipLabel;
            default: return a.buttonLabel(id);
        }
    }
    /** What OK does there, for the hint bar. */
    private String hintOf(int i) {
        String id = ids.get(i);
        switch (id) {
            case "cc": return "Subtitles";
            case "audio": return "Audio";
            case "pic": return "Picture size";
            default: return labelOf(i);
        }
    }

    private void draw() {
        for (int i = 0; i < btns.size(); i++) {
            TextView t = btns.get(i);
            boolean f = row == 1 && i == btn;
            if ("pill".equals(t.getTag())) Ui.pillState(t, false, f);
            else Ui.discState(t, f);
        }
        if (playBtn != null) Ui.discIcon(playBtn, paused() ? "play" : "pause");
        hud.track.focused = row == 0;
        hud.track.invalidate();
        hud.focus(row == 1 && btn < btns.size() ? btns.get(btn) : null, row == 1 && btn < btns.size() ? labelOf(btn) : null);
        hud.paused(paused());
    }

    /** The st-what line: [tick, text] from the player, or null for none. */
    void setWhat(boolean tick, String text) { hud.what(tick, text); }
    void show() {
        a.fillWhat(this);
        boolean was = visible();
        hud.show();
        if (!was) a.handler.post(tick);
        draw();
        update();
        hud.touch();
        a.handler.removeCallbacks(hide);
        if (p.isPlaying() && !scrubbing) a.handler.postDelayed(hide, 4000);
        a.hintsChanged();
        if (!was) a.placeChip();
    }
    void hide() {
        if (scrubbing) return;
        hud.hide();
        row = 0;   // the next time they come up, focus is back on the seek thumb
        hud.focus(null, null);
        a.handler.removeCallbacks(hide);
        a.hintsChanged();
        a.placeChip();
    }
    void playStateChanged() { if (visible()) show(); }

    private void update() {
        long d = p.getDuration(), pos = scrubbing ? scrubPos : p.getCurrentPosition();
        if (d == C.TIME_UNSET || d <= 0) {
            hud.track.vod(0, 1, fmt(pos), "");
            hud.corner("", false, "");
        } else {
            hud.track.vod(pos, d, fmt(pos), "−" + fmt(Math.max(0, d - pos)));
            // the corner: one time, the same as the bar's end (−25:50 is "26 min left", and it ends then)
            float speed = Math.max(0.25f, p.getPlaybackParameters().speed);
            long left = (long) (Math.max(0, d - p.getCurrentPosition()) / speed), endAt = System.currentTimeMillis() + left;
            String mins = minsLeft(left), ends = "Ends at " + PlayerActivity.hm(endAt);
            if (paused()) hud.corner(mins, false, ends + " if you play now");
            else hud.corner(ends, false, mins);
        }
        hud.scrubbing(scrubbing);
        if (scrubbing) {
            long held = System.currentTimeMillis() - scrubFrom;
            int sp = (int) Math.min(32, 1L << Math.min(5, held / 1000));
            hud.placeBubble(fmt(pos), sp >= 2 ? (scrubDir > 0 ? "▶▶ ×" : "◀◀ ×") + sp : null);
        }
    }
    /** "26 min left", "1 h 12 min left", rounded to the minute like the bar's end. */
    static String minsLeft(long ms) {
        long m = Math.max(1, Math.round(ms / 60000.0));
        return m >= 60 ? m / 60 + " h " + (m % 60 > 0 ? m % 60 + " min " : "") + "left" : m + " min left";
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
        // after the 2 min fade: any key brings the controls back; OK and ⏯ also do what they do (no wasted press)
        if (shown && hud.wake() && !playKey(code)) { show(); return true; }
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
                scrubDir = dir;
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
                if (!shown && a.upNextOk()) return true;   // (Up next's OK guard: its first 0.7 s OK pauses)
                if (shown && row == 1) { acts.get(btn).run(); return true; }
                toggle();
                return true;
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE: case KeyEvent.KEYCODE_SPACE: toggle(); return true;
            case KeyEvent.KEYCODE_MEDIA_PLAY: p.play(); show(); return true;
            case KeyEvent.KEYCODE_MEDIA_PAUSE: p.pause(); show(); return true;
            case KeyEvent.KEYCODE_DPAD_UP:
                if (shown && row == 1) return true;
                row = 1; btn = upTo(); show(); return true;
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

    static boolean playKey(int code) {
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_NUMPAD_ENTER:
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE: case KeyEvent.KEYCODE_SPACE: case KeyEvent.KEYCODE_MEDIA_PLAY: case KeyEvent.KEYCODE_MEDIA_PAUSE:
                return true;
        }
        return false;
    }

    String[][] hints() {
        String ok = paused() ? "Play" : "Pause";
        if (scrubbing) return new String[][] { { "◀ ▶", "10 s, hold for faster" }, { "OK", ok }, { "Back", "Hide" } };
        if (row == 1 && btn < btns.size()) return new String[][] { { "OK", hintOf(btn) }, { "◀ ▶", "Move" }, { "▼", "Seek bar" }, { "Back", "Hide" } };
        return new String[][] { { "OK", ok }, { "◀ ▶", "Seek 10 s" }, { "▲", "Buttons" }, { "▼", "Options" }, { "Back", "Hide" } };
    }
}
