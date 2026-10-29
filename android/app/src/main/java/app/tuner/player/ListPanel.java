package app.tuner.player;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
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

/**
 * A side panel with a header and a list of rows: the channel list, groups, options, subtitles, audio, picture size,
 * "Match the clock" and live games all use it. Only the rows in view exist (the list can be every channel); the
 * focused row has the inset ring and never changes size. Up and down move, OK chooses, left and right are the panel's.
 */
class ListPanel extends Overlay {
    static final class Item {
        String title = "", sub, value, badge, icon, num, logoName, logoUrl;
        boolean radio, radioOn, live, disabled, current, chevron, pin, clock;
        // the subtitles design (design/ui-v1/subtitles SPEC 7.2, 7.7): a section head (30 high, caps, no focus), a row
        // indented under the one it belongs to, and the checked tick before line 1 or line 2 (centred, 6 dp from its text)
        boolean head, tickA, tickB, info, subLit;   // info: takes no focus but reads as normal text (Quality's "Now: …"); subLit: line 2 too
        int indent;
        float progress = -1;
        int height = 46;   // (player v2: eight rows and the header fit the 453 cap)
        Runnable ok;
        Object data;
        Item(String title) { this.title = title; }
        static Item heading(String title) { Item it = new Item(title); it.head = true; it.disabled = true; return it; }
    }
    interface Source { int count(); Item get(int i); }

    static Source of(List<Item> list) {
        return new Source() { public int count() { return list.size(); } public Item get(int i) { return list.get(i); } };
    }

    final LinearLayout box, rows, extra;
    final TextView title, count, caption, foot;
    final ImageView backIcon;
    final List<Item> fixed = new ArrayList<>();   // rows above the scrolling list (the pinned game)
    Source src;
    int sel, top;
    Runnable onLeft, onRight, onTopUp;
    java.util.function.IntConsumer onMove;
    String[][] hintKeys;
    private final List<Row> pool = new ArrayList<>(), fixedViews = new ArrayList<>();
    private final LinearLayout fixedBox;

    ListPanel(PlayerActivity a, String heading, boolean left, int widthDp) {
        super(a);
        Context c = a;
        box = new LinearLayout(c);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setBackground(Ui.panelBg());
        box.setPadding(Ui.dp(10), Ui.dp(12), Ui.dp(10), Ui.dp(12));
        LinearLayout head = new LinearLayout(c);
        head.setGravity(Gravity.CENTER_VERTICAL);
        head.setPadding(Ui.dp(10), 0, Ui.dp(10), 0);
        backIcon = Ui.iconView(c, "chevL", Ui.T2, 20);
        backIcon.setVisibility(View.GONE);
        head.addView(backIcon);
        title = Ui.line(c, heading, 22, Ui.T1, Ui.outfit700);
        LinearLayout.LayoutParams tl = new LinearLayout.LayoutParams(0, -2, 1);
        tl.setMarginStart(Ui.dp(8));
        head.addView(title, tl);
        count = Ui.text(c, "", 14, Ui.T3, Ui.inter500);
        head.addView(count);
        box.addView(head, new LinearLayout.LayoutParams(-1, Ui.dp(36)));
        caption = Ui.text(c, "", 14, Ui.T3, Ui.inter500);
        caption.setPadding(Ui.dp(10), Ui.dp(2), Ui.dp(10), Ui.dp(6));
        caption.setVisibility(View.GONE);
        box.addView(caption);
        extra = new LinearLayout(c);   // the diagnosis' verdict and path, above the rows
        extra.setOrientation(LinearLayout.VERTICAL);
        extra.setVisibility(View.GONE);
        box.addView(extra);
        fixedBox = new LinearLayout(c);
        fixedBox.setOrientation(LinearLayout.VERTICAL);
        box.addView(fixedBox);
        rows = new LinearLayout(c);
        rows.setOrientation(LinearLayout.VERTICAL);
        box.addView(rows);
        foot = Ui.text(c, "", 14, Ui.T3, Ui.inter500);
        foot.setPadding(Ui.dp(10), Ui.dp(8), Ui.dp(10), 0);
        foot.setVisibility(View.GONE);
        box.addView(foot);
        root = box;
        box.setLayoutParams(side(left, widthDp));
    }

    ListPanel source(Source s, int focus) {
        src = s;
        sel = fixed.size() + Math.max(0, Math.min(s.count() - 1, focus));
        if (s.count() == 0) sel = 0;
        top = -1;
        return this;
    }
    void setCaption(String s) { caption.setText(s); caption.setVisibility(s == null || s.isEmpty() ? View.GONE : View.VISIBLE); }
    private int extraDp;
    /** Something above the rows that isn't a row (the Connection panel's verdict and path), heightDp tall. */
    void setExtra(View v, int heightDp) {
        extra.removeAllViews();
        if (v != null) extra.addView(v);
        extra.setVisibility(v == null ? View.GONE : View.VISIBLE);
        extraDp = v == null ? 0 : heightDp;
    }
    void setFoot(String s) { foot.setText(s); foot.setVisibility(s == null || s.isEmpty() ? View.GONE : View.VISIBLE); }
    void setCount(String s) { count.setText(s == null ? "" : s); }
    void showBack(boolean on) { backIcon.setVisibility(on ? View.VISIBLE : View.GONE); }

    int total() { return fixed.size() + (src == null ? 0 : src.count()); }
    Item itemAt(int i) { return i < fixed.size() ? fixed.get(i) : src.get(i - fixed.size()); }
    /** The focused row of the list (not counting the fixed rows), or -1 on a fixed row. */
    int listIndex() { return sel - fixed.size(); }

    /** Space for the scrolling rows: the panel's cap less its header, caption, fixed rows and footer. */
    private int room() {
        int h = Ui.dp(MAX_H) - Ui.dp(24) - Ui.dp(36);
        if (caption.getVisibility() == View.VISIBLE) h -= Ui.dp(44);
        if (foot.getVisibility() == View.VISIBLE) h -= Ui.dp(30);
        h -= Ui.dp(extraDp);
        for (Item it : fixed) h -= Ui.dp(it.height + 10);
        if (foot.getVisibility() == View.VISIBLE && foot.getLineCount() > 1) h -= Ui.dp(20 * (foot.getLineCount() - 1));
        return h;
    }

    void render() {
        // fixed rows
        while (fixedViews.size() < fixed.size()) { Row r = new Row(a); fixedViews.add(r); fixedBox.addView(r); }
        for (int i = 0; i < fixedViews.size(); i++) {
            Row r = fixedViews.get(i);
            if (i < fixed.size()) { r.setVisibility(View.VISIBLE); r.bind(fixed.get(i), sel == i); } else r.setVisibility(View.GONE);
        }
        int n = src == null ? 0 : src.count();
        int li = listIndex();
        int avail = room();
        // keep the focused row in view, moving the window as little as possible
        if (top < 0) {   // open with the focused row in the middle where the list allows
            int vis = n == 0 ? 1 : visibleFrom(Math.max(0, Math.min(n - 1, li)), n, avail);
            top = li < 0 ? 0 : Math.max(0, Math.min(li - vis / 2, n - vis));
        }
        if (li >= 0 && li < top) top = li;
        while (li >= 0 && li >= top + visibleFrom(top, n, avail)) top++;
        int shown = visibleFrom(top, n, avail);
        while (pool.size() < shown) { Row r = new Row(a); pool.add(r); rows.addView(r); }
        for (int i = 0; i < pool.size(); i++) {
            Row r = pool.get(i);
            int idx = top + i;
            if (i < shown && idx < n) { r.setVisibility(View.VISIBLE); r.bind(src.get(idx), li == idx); }
            else r.setVisibility(View.GONE);
        }
    }
    private int visibleFrom(int from, int n, int avail) {
        int used = 0, k = from;
        while (k < n) { Item it = src.get(k); int h = Ui.dp(it.head ? 38 : it.height + 4); if (used + h > avail) break; used += h; k++; }
        return Math.max(1, k - from);
    }

    @Override boolean key(int code, boolean repeat) {
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_UP: case KeyEvent.KEYCODE_DPAD_DOWN: {
                int d = code == KeyEvent.KEYCODE_DPAD_DOWN ? 1 : -1, n = total(), i = sel + d;
                while (i >= 0 && i < n && itemAt(i).disabled) i += d;
                if (i < 0 || i >= n) { if (d < 0 && onTopUp != null && !repeat) onTopUp.run(); return true; }
                sel = i;
                render();
                if (onMove != null) onMove.accept(listIndex());
                return true;
            }
            case KeyEvent.KEYCODE_CHANNEL_UP: case KeyEvent.KEYCODE_PAGE_UP: case KeyEvent.KEYCODE_CHANNEL_DOWN: case KeyEvent.KEYCODE_PAGE_DOWN: {
                int page = Math.max(1, pool.size() - 1), n = total();
                boolean down = code == KeyEvent.KEYCODE_CHANNEL_DOWN || code == KeyEvent.KEYCODE_PAGE_DOWN;
                sel = Math.max(0, Math.min(n - 1, sel + (down ? page : -page)));
                render();
                if (onMove != null) onMove.accept(listIndex());
                return true;
            }
            case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_NUMPAD_ENTER: {
                if (repeat || total() == 0) return true;
                Item it = itemAt(sel);
                if (!it.disabled && it.ok != null) it.ok.run();
                return true;
            }
            case KeyEvent.KEYCODE_DPAD_LEFT: if (onLeft != null && !repeat) onLeft.run(); return true;
            case KeyEvent.KEYCODE_DPAD_RIGHT: if (onRight != null && !repeat) onRight.run(); return true;
        }
        return false;
    }
    /** Sub-panels (Subtitles, Audio, …) go back to Options on Back. */
    Runnable backTo, onClosed;
    @Override void closed() { if (onClosed != null) onClosed.run(); }
    /** The list rows on screen now: [first, first + count). */
    int firstShown() { return Math.max(0, top); }
    int shownCount() { int n = 0; for (Row r : pool) if (r.getVisibility() == View.VISIBLE) n++; return n; }
    @Override boolean back() { if (backTo != null) { backTo.run(); return true; } return false; }
    @Override String[][] hints() { return hintKeys != null ? hintKeys : super.hints(); }
    @Override void refresh() { render(); }

    // ---------- a row ----------
    static final class Row extends FrameLayout {
        final LinearLayout in;
        final TextView num, a, b, badge, value;
        final ImageView icon, chevron, tickA, tickB;
        final LinearLayout ra, rb;
        final Radio radio;
        final FrameLayout logo;
        final TextView live;
        final Ui.Bar bar;
        private Item bound;

        Row(Context c) {
            super(c);
            in = new LinearLayout(c);
            in.setGravity(Gravity.CENTER_VERTICAL);
            in.setPadding(Ui.dp(12), 0, Ui.dp(12), 0);
            addView(in, new LayoutParams(-1, -1));
            num = Ui.text(c, "", 14, Ui.T3, Ui.inter650);
            num.setGravity(Gravity.END);
            Ui.tabular(num);
            in.addView(num, gap(new LinearLayout.LayoutParams(Ui.dp(34), -2)));
            icon = new ImageView(c);
            in.addView(icon, gap(new LinearLayout.LayoutParams(Ui.dp(20), Ui.dp(20))));
            radio = new Radio(c);
            in.addView(radio, gap(new LinearLayout.LayoutParams(Ui.dp(18), Ui.dp(18))));
            logo = Ui.logo(c, 32);
            in.addView(logo, gap(new LinearLayout.LayoutParams(Ui.dp(32), Ui.dp(32))));
            LinearLayout col = new LinearLayout(c);
            col.setOrientation(LinearLayout.VERTICAL);
            a = Ui.line(c, "", 16, Ui.T1, Ui.inter650);
            b = Ui.line(c, "", 14, Ui.T3, Ui.inter500);
            ra = new LinearLayout(c);
            ra.setGravity(Gravity.CENTER_VERTICAL);
            tickA = new ImageView(c);
            tickA.setImageDrawable(new Ui.Tick(16));
            LinearLayout.LayoutParams ta = new LinearLayout.LayoutParams(Ui.dp(16), Ui.dp(16));
            ta.setMarginEnd(Ui.dp(6));
            ra.addView(tickA, ta);
            ra.addView(a, new LinearLayout.LayoutParams(0, -2, 1));
            rb = new LinearLayout(c);
            rb.setGravity(Gravity.CENTER_VERTICAL);
            tickB = new ImageView(c);
            tickB.setImageDrawable(new Ui.Tick(14));
            LinearLayout.LayoutParams tb = new LinearLayout.LayoutParams(Ui.dp(14), Ui.dp(14));
            tb.setMarginEnd(Ui.dp(6));
            rb.addView(tickB, tb);
            rb.addView(b, new LinearLayout.LayoutParams(0, -2, 1));
            col.addView(ra);
            col.addView(rb);
            in.addView(col, gap(new LinearLayout.LayoutParams(0, -2, 1)));
            badge = Ui.text(c, "", 14, Ui.T3, Ui.inter500);
            in.addView(badge, gap(new LinearLayout.LayoutParams(-2, -2)));
            value = Ui.line(c, "", 15, Ui.T2, Ui.inter500);
            value.setMaxWidth(Ui.dp(130));
            in.addView(value, gap(new LinearLayout.LayoutParams(-2, -2)));
            live = Ui.livePill(c, true);
            in.addView(live);
            chevron = Ui.iconView(c, "chevR", Ui.T2, 16);
            in.addView(chevron);
            bar = new Ui.Bar(c, 0x8C15131D);
            LayoutParams bl = new LayoutParams(-1, Ui.dp(3), Gravity.BOTTOM);
            bl.setMargins(Ui.dp(12), 0, Ui.dp(12), Ui.dp(4));
            addView(bar, bl);
        }
        private static LinearLayout.LayoutParams gap(LinearLayout.LayoutParams lp) { lp.setMarginEnd(Ui.dp(10)); return lp; }

        void bind(Item it, boolean focused) {
            bound = it;
            LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) getLayoutParams();
            if (lp == null) { lp = new LinearLayout.LayoutParams(-1, Ui.dp(it.height)); setLayoutParams(lp); }
            lp.height = Ui.dp(it.head ? 30 : it.height);
            lp.topMargin = Ui.dp(it.pin ? 0 : it.head ? 8 : 4);
            lp.bottomMargin = Ui.dp(it.pin ? 6 : 0);
            setLayoutParams(lp);
            in.setPadding(Ui.dp(12 + it.indent), 0, Ui.dp(12), 0);
            if (it.head) {   // a section head: caps, letter-spaced, no background and no focus
                setBackground(null);
                for (View v : new View[] { num, icon, radio, logo, rb, tickA, badge, value, live, chevron, bar }) show(v, false);
                a.setText(it.title.toUpperCase(java.util.Locale.ROOT));
                a.setTextColor(Ui.T3);
                a.setTypeface(Ui.inter650);
                a.setTextSize(13);
                a.setLetterSpacing(0.08f);
                return;
            }
            a.setLetterSpacing(0);
            if (focused) setBackground(Ui.rowBg(true, false));
            else if (it.pin) { android.graphics.drawable.GradientDrawable g = Ui.round(Ui.S1, 12); g.setStroke(Math.max(1, Ui.dp(1)), Ui.BORDER); setBackground(g); }
            else setBackground(Ui.rowBg(false, it.current));
            int main = it.disabled && !it.info ? Ui.T4 : Ui.T1;
            show(num, it.num != null);
            if (it.num != null) num.setText(it.num);
            show(icon, it.icon != null);
            if (it.icon != null) icon.setImageDrawable(Ui.icon(it.icon, it.disabled ? Ui.T4 : Ui.T2, 20));
            show(radio, it.radio);
            radio.on = it.radioOn;
            radio.invalidate();
            show(logo, it.logoName != null);
            if (it.logoName != null) Ui.bindLogo(logo, it.logoName, it.logoUrl);
            a.setText(it.title);
            a.setTextColor(main);
            if (it.clock) { a.setTypeface(Ui.inter700); a.setTextSize(20); }
            else { a.setTypeface(it.radio || it.icon != null ? Ui.inter500 : Ui.inter650); a.setTextSize(16); }
            show(tickA, it.tickA);
            show(tickB, it.tickB);
            show(rb, it.sub != null && !it.sub.isEmpty());
            b.setText(it.sub);
            b.setTextColor(it.disabled && !it.info && !it.subLit ? Ui.T4 : Ui.T3);
            show(badge, it.badge != null);
            badge.setText(it.badge);
            show(value, it.value != null);
            value.setText(it.value);
            show(live, it.live);
            Ui.liveOnFocus(live, focused);
            show(chevron, it.chevron);
            show(bar, it.progress >= 0);
            if (it.progress >= 0) bar.set(it.progress);
        }
        Item bound() { return bound; }
        private static void show(View v, boolean on) { v.setVisibility(on ? VISIBLE : GONE); }
    }

    /** Radio mark: a ring, pink with a dot when chosen. */
    static final class Radio extends View {
        boolean on;
        private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        Radio(Context c) { super(c); }
        @Override protected void onDraw(@NonNull Canvas c) {
            float s = Math.min(getWidth(), getHeight()), r = s / 2;
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Ui.dp(2));
            p.setColor(on ? Ui.PINK : Ui.BORDER_STRONG);
            c.drawCircle(r, r, r - Ui.dp(1), p);
            if (on) { p.setStyle(Paint.Style.FILL); c.drawCircle(r, r, r - Ui.dp(5), p); }
        }
    }
}
