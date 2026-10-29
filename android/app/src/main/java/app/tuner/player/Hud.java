package app.tuner.player;

import android.graphics.Bitmap;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * What the film bar and the timeline share (design/ui-v1/player-v2/SPEC.md 3): no box, the controls on the picture over
 * a top and a bottom scrim; the title block top-left (the title's logo or its name, the sub line, the st-what line, the
 * story line on pause); the corner top-right (the Paused tag and two lines); the buttons row at y 382 with the focused
 * button's name over it; the track at y 438 with its ends; the scrub bubble and speed chip where the row was; the pause
 * dim; and the 2 min pause fade. Positions are dp from the bottom of the 540 dp canvas, as the rest of the player.
 */
final class Hud {
    private final PlayerActivity a;
    private final FrameLayout root;
    final View dim, scrimTop, scrimBottom;
    final LinearLayout top, corner, whatRow;
    final ImageView logo, whatTick, eye;
    final TextView title, sub, what, story, tag, c1, c2, label, bubble, speed;
    final Row row;
    final Track track;
    private final View[] parts;
    private boolean up, paused, faded, scrub, topOn = true, logoOn;
    private View focused;
    private String labelText = "", logoUrl = "";
    private final Runnable fadeR = () -> fade(true);

    /** The buttons row: places the label over the focused button once it has its place. */
    final class Row extends LinearLayout {
        Row() { super(Hud.this.a); }
        @Override protected void onLayout(boolean changed, int l, int t, int r, int b) { super.onLayout(changed, l, t, r, b); placeLabel(false); }
    }

    Hud(PlayerActivity a, FrameLayout root) {
        this.a = a;
        this.root = root;
        int base = a.overlayBase();
        dim = new View(a);
        dim.setBackgroundColor(Ui.DIM);
        dim.setVisibility(View.GONE);
        root.addView(dim, base, new FrameLayout.LayoutParams(-1, -1));
        scrimTop = Ui.scrimView(a, Ui.SCRIM_TOP, Ui.SCRIM_TOP_AT);
        root.addView(scrimTop, base + 1, new FrameLayout.LayoutParams(-1, Ui.dp(220), Gravity.TOP));
        scrimBottom = Ui.scrimView(a, Ui.SCRIM_BOTTOM, Ui.SCRIM_BOTTOM_AT);
        root.addView(scrimBottom, base + 2, new FrameLayout.LayoutParams(-1, Ui.dp(250), Gravity.BOTTOM));

        // the title block: x 48, y 30, 600 wide at most
        top = new LinearLayout(a);
        top.setOrientation(LinearLayout.VERTICAL);
        logo = new ImageView(a);
        logo.setScaleType(ImageView.ScaleType.FIT_XY);
        logo.setVisibility(View.GONE);
        top.addView(logo, new LinearLayout.LayoutParams(-2, -2));
        title = Ui.shadow(Ui.line(a, "", 28, Ui.T1, Ui.outfit700));
        Ui.lineHeight(title, 32);
        title.setLetterSpacing(-0.01f);
        top.addView(title);
        sub = Ui.shadow(Ui.line(a, "", 16, Ui.T2, Ui.inter500));
        Ui.lineHeight(sub, 22);
        top.addView(sub);
        // the st-what line (subtitles SPEC 7.1), chalk: it sits where the scrim is thinnest
        whatRow = new LinearLayout(a);
        whatRow.setGravity(Gravity.CENTER_VERTICAL);
        whatTick = new ImageView(a);
        whatTick.setImageDrawable(new Ui.Tick(16));
        LinearLayout.LayoutParams wt = new LinearLayout.LayoutParams(Ui.dp(16), Ui.dp(16));
        wt.setMarginEnd(Ui.dp(8));
        whatRow.addView(whatTick, wt);
        what = Ui.shadow(Ui.line(a, "", 15, Ui.T1, Ui.inter500));
        Ui.lineHeight(what, 20);
        whatRow.addView(what, new LinearLayout.LayoutParams(0, -2, 1));
        LinearLayout.LayoutParams wl = new LinearLayout.LayoutParams(-1, -2);
        wl.topMargin = Ui.dp(4);
        whatRow.setVisibility(View.GONE);
        top.addView(whatRow, wl);
        story = Ui.shadow(Ui.line(a, "", 15, Ui.T2, Ui.inter500));
        Ui.lineHeight(story, 20);
        story.setMaxWidth(Ui.dp(520));
        story.setVisibility(View.GONE);
        LinearLayout.LayoutParams sl = new LinearLayout.LayoutParams(-2, -2);
        sl.topMargin = Ui.dp(6);
        top.addView(story, sl);
        FrameLayout.LayoutParams tl = new FrameLayout.LayoutParams(Ui.dp(600), -2, Gravity.TOP | Gravity.START);
        tl.setMargins(Ui.dp(48), Ui.dp(30), 0, 0);
        root.addView(top, tl);

        // the corner: right 48, y 32
        corner = new LinearLayout(a);
        corner.setOrientation(LinearLayout.VERTICAL);
        corner.setGravity(Gravity.END);
        tag = Ui.text(a, "Paused", 14, Ui.T1, Ui.inter650);
        tag.setGravity(Gravity.CENTER_VERTICAL);
        android.graphics.drawable.Drawable pz = Ui.icon("pause", Ui.T1, 14);
        pz.setBounds(0, 0, Ui.dp(14), Ui.dp(14));
        tag.setCompoundDrawables(pz, null, null, null);
        tag.setCompoundDrawablePadding(Ui.dp(6));
        tag.setPadding(Ui.dp(8), 0, Ui.dp(10), 0);
        android.graphics.drawable.GradientDrawable tg = Ui.round(Ui.GLASS, 999);
        tg.setStroke(Math.max(1, Ui.dp(1)), Ui.GLASS_EDGE);
        tag.setBackground(tg);
        tag.setVisibility(View.GONE);
        LinearLayout.LayoutParams tgl = new LinearLayout.LayoutParams(-2, Ui.dp(24));
        tgl.bottomMargin = Ui.dp(4);
        corner.addView(tag, tgl);
        LinearLayout l1 = new LinearLayout(a);
        l1.setGravity(Gravity.CENTER_VERTICAL);
        eye = Ui.iconView(a, "eyeOff", Ui.T1, 16);
        LinearLayout.LayoutParams el = new LinearLayout.LayoutParams(Ui.dp(16), Ui.dp(16));
        el.setMarginEnd(Ui.dp(6));
        eye.setVisibility(View.GONE);
        l1.addView(eye, el);
        c1 = Ui.shadow(Ui.line(a, "", 18, Ui.T1, Ui.inter650));
        Ui.lineHeight(c1, 22);
        Ui.tabular(c1);
        l1.addView(c1);
        corner.addView(l1);
        c2 = Ui.shadow(Ui.line(a, "", 15, Ui.T2, Ui.inter500));
        Ui.lineHeight(c2, 20);
        Ui.tabular(c2);
        corner.addView(c2);
        FrameLayout.LayoutParams cl = new FrameLayout.LayoutParams(-2, -2, Gravity.TOP | Gravity.END);
        cl.setMargins(0, Ui.dp(32), Ui.dp(48), 0);
        root.addView(corner, cl);

        // the buttons row: x 48 to 912, y 382 to 426
        row = new Row();
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setClipChildren(false);
        FrameLayout.LayoutParams rl = new FrameLayout.LayoutParams(-1, Ui.dp(44), Gravity.BOTTOM);
        rl.setMargins(Ui.dp(48), 0, Ui.dp(48), Ui.dp(540 - 426));
        root.addView(row, rl);
        // the focused button's name: its bottom 8 dp above the row
        label = Ui.label(a);
        label.setVisibility(View.GONE);
        FrameLayout.LayoutParams ll = new FrameLayout.LayoutParams(-2, Ui.dp(24), Gravity.BOTTOM | Gravity.START);
        ll.bottomMargin = Ui.dp(540 - 374);
        root.addView(label, ll);
        // the track: the line at y 438 to 458, the ends at 460 to 480
        track = new Track(a);
        FrameLayout.LayoutParams kl = new FrameLayout.LayoutParams(-1, Ui.dp(Track.H), Gravity.BOTTOM);
        kl.setMargins(Ui.dp(48 - Track.PAD_X), 0, Ui.dp(48 - Track.PAD_X), Ui.dp(540 - 480));
        root.addView(track, kl);
        // the scrub bubble (y 400 to 428, its point to 433) and the speed chip, where the row was
        bubble = Track.bubble(a);
        bubble.setVisibility(View.GONE);
        FrameLayout.LayoutParams bl = new FrameLayout.LayoutParams(-2, Ui.dp(28 + Track.Point.TIP), Gravity.BOTTOM | Gravity.START);
        bl.bottomMargin = Ui.dp(540 - 433);
        root.addView(bubble, bl);
        speed = Track.speedChip(a);
        speed.setVisibility(View.GONE);
        FrameLayout.LayoutParams spl = new FrameLayout.LayoutParams(-2, Ui.dp(28), Gravity.BOTTOM | Gravity.START);
        spl.bottomMargin = Ui.dp(540 - 428);
        root.addView(speed, spl);

        parts = new View[] { scrimTop, scrimBottom, top, corner, row, track };
        for (View v : parts) v.setVisibility(View.GONE);
    }

    boolean up() { return up; }
    boolean faded() { return faded; }

    /** Opacity 0 to 1 in 150 ms with an 8 dp rise of the bar; a show while up changes nothing. */
    void show() {
        if (up) return;
        up = true;
        for (View v : parts) {
            v.animate().cancel();
            boolean on = topOn || (v != top && v != scrimTop);
            v.setVisibility(on ? View.VISIBLE : View.GONE);
            v.setAlpha(0);
            v.animate().alpha(target(v)).setDuration(150).start();
        }
        for (View v : new View[] { row, track }) { v.setTranslationY(Ui.dp(8)); v.animate().translationY(0).setDuration(150).start(); }
        if (paused) dimTo(true);
        touch();
    }
    /** Opacity to 0 in 200 ms; the label, bubble and dim go with it. */
    void hide() {
        if (!up) return;
        up = false;
        for (View v : parts) {
            v.animate().cancel();
            v.animate().alpha(0).setDuration(200).withEndAction(() -> { if (!up) v.setVisibility(View.GONE); }).start();
        }
        label.setVisibility(View.GONE);
        bubble.setVisibility(View.GONE);
        speed.setVisibility(View.GONE);
        dimTo(false);
        a.handler.removeCallbacks(fadeR);
        if (faded) { faded = false; a.hintAlpha(1); }
    }
    private float target(View v) { return faded && v != scrimTop && v != scrimBottom ? 0.35f : 1f; }

    /** The title block on or off (live paused shows the channel's banner there instead; the corner moves under its tags). */
    void topBlock(boolean on) {
        if (on == topOn) return;
        topOn = on;
        corner.setTranslationY(on ? 0 : Ui.dp(52));
        if (up) { top.setVisibility(on ? View.VISIBLE : View.GONE); scrimTop.setVisibility(on ? View.VISIBLE : View.GONE); top.setAlpha(target(top)); scrimTop.setAlpha(1); }
    }

    /** Paused: the picture rests 35 % darker, the corner's tag, the story line; the 2 min fade is armed. */
    void paused(boolean p) {
        if (p == paused) return;
        paused = p;
        tag.setVisibility(p ? View.VISIBLE : View.GONE);
        story.setVisibility(p && story.getText().length() > 0 ? View.VISIBLE : View.GONE);
        if (up) dimTo(p);
        if (!p && faded) fade(false);
        touch();
    }
    private void dimTo(boolean on) {
        dim.animate().cancel();
        if (on) { if (dim.getVisibility() != View.VISIBLE) { dim.setAlpha(0); dim.setVisibility(View.VISIBLE); } dim.animate().alpha(1).setDuration(150).start(); }
        else if (dim.getVisibility() == View.VISIBLE) dim.animate().alpha(0).setDuration(150).withEndAction(() -> { if (!(up && paused)) dim.setVisibility(View.GONE); }).start();
    }
    /** A key: the 2 min count starts again (while paused and up). */
    void touch() {
        a.handler.removeCallbacks(fadeR);
        if (paused && up) a.handler.postDelayed(fadeR, 120000);
    }
    /** After 2 min paused the controls fade to 35 % (an OLED: no bright overlay held for long); the dim stays. */
    void fade(boolean f) {
        if (f == faded || (f && !(up && paused))) return;
        faded = f;
        for (View v : parts) if (v.getVisibility() == View.VISIBLE) { v.animate().cancel(); v.animate().alpha(target(v)).setDuration(320).start(); }
        label.animate().cancel();
        label.animate().alpha(f ? 0.35f : 1f).setDuration(320).start();
        a.hintAlpha(f ? 0.35f : 1f);
        if (!f) touch();
    }
    /** Any key while faded: back to full; true when it was faded (the caller decides whether the key also acts). */
    boolean wake() { if (!faded) return false; fade(false); return true; }

    /** While ◀ or ▶ is held the row is gone (0 %, 120 ms) and the bubble leads. */
    void scrubbing(boolean s) {
        if (s == scrub) return;
        scrub = s;
        row.animate().cancel();
        row.animate().alpha(s ? 0 : target(row)).setDuration(120).start();
        if (s) label.setVisibility(View.GONE); else { bubble.setVisibility(View.GONE); speed.setVisibility(View.GONE); placeLabel(true); }
    }
    /** The bubble (and the speed chip after it) centred on the thumb, kept inside x 48 to 912. */
    void placeBubble(String text, String speedText) {
        bubble.setText(text);
        bubble.setVisibility(View.VISIBLE);
        boolean sp = speedText != null && !speedText.isEmpty();
        speed.setVisibility(sp ? View.VISIBLE : View.GONE);
        if (sp) speed.setText(speedText);
        int hs = View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED);
        bubble.measure(hs, hs);
        int bw = bubble.getMeasuredWidth(), sw = 0;
        if (sp) { speed.measure(hs, hs); sw = speed.getMeasuredWidth() + Ui.dp(8); }
        float x = track.getLeft() + track.thumbX() - bw / 2f;
        float max = root.getWidth() - Ui.dp(48) - bw - sw;
        x = Math.max(Ui.dp(48), Math.min(max, x));
        bubble.setTranslationX(x);
        speed.setTranslationX(x + bw + Ui.dp(8));
    }

    /** The focused button and its name (null: the thumb has focus, no label). */
    void focus(View b, String name) {
        focused = b;
        labelText = name == null ? "" : name;
        placeLabel(true);
    }
    /** For the emulator test: the name over the focused button ("" on the thumb). */
    String labelText() { return focused != null && up ? labelText : ""; }
    private void placeLabel(boolean ask) {
        if (focused == null || !up || scrub || labelText.isEmpty() || focused.getParent() != row) { label.setVisibility(View.GONE); return; }
        if (focused.getWidth() == 0) { label.setVisibility(View.GONE); if (ask) row.requestLayout(); return; }
        if (!labelText.contentEquals(label.getText())) label.setText(labelText);
        int hs = View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED);
        label.measure(hs, View.MeasureSpec.makeMeasureSpec(Ui.dp(24), View.MeasureSpec.EXACTLY));
        int w = label.getMeasuredWidth();
        float bx = row.getLeft() + focused.getLeft();
        float x = row.indexOfChild(focused) == 0 ? bx : bx + focused.getWidth() / 2f - w / 2f;   // (the first one's label is left-aligned to it)
        x = Math.max(Ui.dp(48), Math.min(root.getWidth() - Ui.dp(48) - w, x));
        label.setTranslationX(x);
        label.setAlpha(faded ? 0.35f : 1f);
        label.setVisibility(View.VISIBLE);
    }

    // ---------- the title: its logo (cropped to its ink, with the shadow drawn in) or its name ----------

    /** title: the text title; logoUrl: the title's logo when its ink passes 3 : 1 on the art (else null); box: its ink
     * box as fractions {l, t, r, b} from art.js, or null to find it here; dark: dark ink, drawn in chalk. */
    void title(String text, String url, float[] box, boolean dark) {
        if (!(text == null ? "" : text).contentEquals(title.getText())) title.setText(text == null ? "" : text);
        String u = url == null ? "" : url;
        if (u.isEmpty() && logoUrl.isEmpty()) return;
        if (u.equals(logoUrl) && logoOn) return;
        logoUrl = u;
        logoOn = false;
        logo.setVisibility(View.GONE);
        title.setVisibility(View.VISIBLE);
        if (u.isEmpty()) return;
        Images.titleLogo(u, box, dark, Ui.dp(40), Ui.dp(10), (Bitmap b) -> {
            if (!u.equals(logoUrl) || b == null) return;
            int pad = Ui.dp(10);
            if (b.getWidth() - 2 * pad > Ui.dp(260)) return;   // a logo over 260 wide at 40 high: the text title
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(b.getWidth(), b.getHeight());
            lp.setMargins(-pad, Ui.dp(2) - pad, -pad, Ui.dp(6) - pad);   // (the bitmap carries the shadow's room around the ink)
            logo.setLayoutParams(lp);
            logo.setImageBitmap(b);
            logo.setVisibility(View.VISIBLE);
            title.setVisibility(View.GONE);
            logoOn = true;
        });
    }
    void sub(String s) {
        if (!(s == null ? "" : s).contentEquals(sub.getText())) sub.setText(s == null ? "" : s);
        sub.setVisibility(s == null || s.isEmpty() ? View.GONE : View.VISIBLE);
    }
    void story(String s) { story.setText(s == null ? "" : s); story.setVisibility(paused && s != null && !s.isEmpty() ? View.VISIBLE : View.GONE); }
    void what(boolean tick, String text) {
        boolean on = text != null && !text.isEmpty();
        whatRow.setVisibility(on ? View.VISIBLE : View.GONE);
        whatTick.setVisibility(tick ? View.VISIBLE : View.GONE);
        what.setText(on ? text : "");
    }
    void corner(String l1, boolean eyeOn, String l2) {
        if (!(l1 == null ? "" : l1).contentEquals(c1.getText())) c1.setText(l1 == null ? "" : l1);
        eye.setVisibility(eyeOn && l1 != null && !l1.isEmpty() ? View.VISIBLE : View.GONE);
        if (!(l2 == null ? "" : l2).contentEquals(c2.getText())) c2.setText(l2 == null ? "" : l2);
        c2.setVisibility(l2 == null || l2.isEmpty() ? View.GONE : View.VISIBLE);
    }
}
