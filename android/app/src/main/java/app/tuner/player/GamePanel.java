package app.tuner.player;

import android.content.Context;
import android.graphics.drawable.GradientDrawable;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ▶ on a game: the score on a skewed plate between the two crests, the clock and how far the score is synced behind
 * live, then tabs for each team's box score, the plays, and Sync. Everything is at the synced delay (the app sends it
 * that way). Under the spoiler shield, for a game you are not watching: no score, no points column, no plays, and a
 * Reveal button you have to move to.
 */
final class GamePanel extends Overlay {
    private final LinearLayout box;
    private int tab;            // 0 away, 1 home, 2 plays, 3 sync
    private boolean onReveal;
    private int scroll;
    private JSONObject d;

    GamePanel(PlayerActivity a, int firstTab) {
        super(a);
        tab = firstTab;
        box = new LinearLayout(a);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setBackground(Ui.panelBg());
        box.setPadding(Ui.dp(10), Ui.dp(12), Ui.dp(10), Ui.dp(12));
        box.setLayoutParams(side(false, 340));
        root = box;
        refresh();
    }

    private boolean hidden() { return d != null && d.optBoolean("hidden"); }
    private int tabs() { return hidden() ? 2 : 4; }

    @Override void refresh() {
        d = a.game;
        if (tab >= tabs()) tab = 0;
        box.removeAllViews();
        Context c = a;
        if (d == null) {
            TextView t = Ui.text(c, "Loading the game…", 16, Ui.T2, Ui.inter500);
            t.setPadding(Ui.dp(10), Ui.dp(10), Ui.dp(10), Ui.dp(10));
            box.addView(t);
            return;
        }
        JSONObject away = d.optJSONObject("away"), home = d.optJSONObject("home");
        // crests and the plate
        LinearLayout tm = new LinearLayout(c);
        tm.setGravity(Gravity.CENTER_VERTICAL);
        tm.setPadding(Ui.dp(6), Ui.dp(6), Ui.dp(6), 0);
        tm.addView(crest(c, away));
        FrameLayout plate = new FrameLayout(c);
        plate.setBackground(new Ui.Plate(Ui.S2, 3));
        JSONArray sc = d.optJSONArray("score");
        if (hidden() || sc == null) {
            TextView h = Ui.text(c, hidden() ? "Hidden" : "–", 14, Ui.T1, Ui.inter500);
            h.setGravity(Gravity.CENTER);
            plate.addView(h, new FrameLayout.LayoutParams(-1, -1));
        } else {
            TextView s = Ui.text(c, "", 30, Ui.T1, Ui.barlow);
            s.setGravity(Gravity.CENTER);
            android.text.SpannableStringBuilder b = new android.text.SpannableStringBuilder();
            b.append(sc.optString(0)).append("  ");
            int from = b.length();
            b.append("–");
            b.setSpan(new android.text.style.ForegroundColorSpan(0x8CF3EFE6), from, b.length(), 0);
            b.append("  ").append(sc.optString(1));
            s.setText(b);
            Ui.tabular(s);
            plate.addView(s, new FrameLayout.LayoutParams(-1, -1));
        }
        LinearLayout.LayoutParams pl = new LinearLayout.LayoutParams(0, Ui.dp(48), 1);
        pl.setMargins(Ui.dp(12), 0, Ui.dp(12), 0);
        tm.addView(plate, pl);
        tm.addView(crest(c, home));
        box.addView(tm, new LinearLayout.LayoutParams(-1, Ui.dp(56)));

        LinearLayout sub = new LinearLayout(c);
        sub.setGravity(Gravity.CENTER);
        sub.setPadding(0, Ui.dp(4), 0, Ui.dp(8));
        if (hidden()) { sub.addView(Ui.iconView(c, "eyeOff", Ui.T3, 16)); sub.addView(space(c, 4)); }
        sub.addView(Ui.text(c, d.optString("clock"), 14, Ui.T3, Ui.inter500));
        if (!hidden() && d.has("synced") && !d.isNull("synced")) {
            sub.addView(Ui.text(c, "  ·  ", 14, Ui.T3, Ui.inter500));
            sub.addView(Ui.iconView(c, "clock", Ui.T3, 16));
            sub.addView(space(c, 4));
            sub.addView(Ui.text(c, "Synced · " + d.optInt("synced") + " s", 14, Ui.T3, Ui.inter500));
        }
        box.addView(sub);

        // tabs
        LinearLayout tabsRow = new LinearLayout(c);
        tabsRow.setPadding(Ui.dp(6), Ui.dp(4), Ui.dp(6), Ui.dp(4));
        String[] names = { away == null ? "" : away.optString("abbr"), home == null ? "" : home.optString("abbr"), "Plays", "Sync" };
        for (int i = 0; i < tabs(); i++) {
            boolean f = i == tab && !onReveal;
            TextView t = Ui.text(c, names[i], 14, i == tab ? Ui.PINK_TEXT : Ui.T2, Ui.inter650);
            t.setGravity(Gravity.CENTER);
            t.setPadding(Ui.dp(i == 3 ? 8 : 12), 0, Ui.dp(12), 0);
            GradientDrawable bg = Ui.round(i == 3 ? 0 : i == tab ? Ui.S3 : Ui.S2, 999);
            if (i == 3) { bg.setStroke(Ui.dp(2), Ui.BORDER_STRONG); t.setTextColor(Ui.T1); t.setCompoundDrawables(sized(Ui.icon("refresh", Ui.T1, 16)), null, null, null); t.setCompoundDrawablePadding(Ui.dp(4)); }
            if (f) bg.setStroke(Ui.dp(3), Ui.FOCUS);
            t.setBackground(bg);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, Ui.dp(30));
            lp.setMarginEnd(Ui.dp(6));
            tabsRow.addView(t, lp);
        }
        box.addView(tabsRow);

        if (tab == 2) plays(c);
        else table(c, tab == 0 ? "away" : "home");

        if (hidden()) {
            TextView note = Ui.text(c, "Spoiler shield: " + d.optString("shieldLabel", "on") + ". Points, plays and the score stay hidden.", 14, Ui.T3, Ui.inter500);
            note.setPadding(Ui.dp(8), Ui.dp(10), Ui.dp(8), Ui.dp(8));
            box.addView(note);
            TextView btn = Ui.text(c, "Reveal score", 16, Ui.T1, Ui.inter650);
            btn.setGravity(Gravity.CENTER);
            btn.setPadding(Ui.dp(16), 0, Ui.dp(16), 0);
            GradientDrawable bg = Ui.round(Ui.S2, 999);
            bg.setStroke(Ui.dp(onReveal ? 3 : 2), onReveal ? Ui.FOCUS : Ui.BORDER_STRONG);
            btn.setBackground(bg);
            LinearLayout.LayoutParams bl = new LinearLayout.LayoutParams(-2, Ui.dp(40));
            bl.setMarginStart(Ui.dp(8));
            box.addView(btn, bl);
        } else {
            TextView foot = Ui.text(c, "Back closes", 14, Ui.T3, Ui.inter500);
            foot.setPadding(Ui.dp(8), Ui.dp(10), Ui.dp(8), 0);
            box.addView(foot);
        }
    }

    private static android.graphics.drawable.Drawable sized(android.graphics.drawable.Drawable dr) { dr.setBounds(0, 0, Ui.dp(16), Ui.dp(16)); return dr; }
    private static View space(Context c, int dp) { View v = new View(c); v.setLayoutParams(new LinearLayout.LayoutParams(Ui.dp(dp), 1)); return v; }

    private View crest(Context c, JSONObject t) {
        TextView v = Ui.text(c, t == null ? "" : t.optString("abbr"), 12, Ui.T1, Ui.inter700);
        v.setGravity(Gravity.CENTER);
        GradientDrawable g = Ui.circle(t == null ? Ui.S3 : Ui.parse(t.optString("p"), Ui.S3));
        g.setStroke(Ui.dp(2), t == null ? Ui.BORDER_STRONG : Ui.parse(t.optString("a"), Ui.BORDER_STRONG));
        v.setBackground(g);
        if (t != null) v.setTextColor(Ui.parse(t.optString("fg"), Ui.T1));
        v.setLayoutParams(new LinearLayout.LayoutParams(Ui.dp(40), Ui.dp(40)));
        return v;
    }

    private int maxRows() { return hidden() ? 7 : 10; }

    private void table(Context c, String side) {
        JSONObject b = d.optJSONObject("box");
        JSONObject t = b == null ? null : b.optJSONObject(side);
        JSONArray rows = t == null ? null : t.optJSONArray("rows");
        if (rows == null || rows.length() == 0) {
            TextView e = Ui.text(c, d.optBoolean("loading") ? "Loading the box score…" : "No box score yet. It appears at tip-off.", 14, Ui.T2, Ui.inter500);
            e.setPadding(Ui.dp(8), Ui.dp(10), Ui.dp(8), Ui.dp(6));
            box.addView(e);
            return;
        }
        JSONArray cols = t.optJSONArray("cols");
        int nc = cols == null ? 0 : cols.length();
        box.addView(tableRow(c, "", cols, nc, true, -1, cols));
        scroll = Math.max(0, Math.min(scroll, rows.length() - maxRows()));
        int bold = -1;
        for (int k = 0; k < nc; k++) if ("PTS".equals(cols.optString(k))) bold = k;
        for (int i = scroll; i < Math.min(rows.length(), scroll + maxRows()); i++) {
            JSONArray r = rows.optJSONArray(i);
            if (r == null) continue;
            JSONArray vals = new JSONArray();
            for (int k = 1; k < r.length(); k++) vals.put(r.optString(k));
            View row = tableRow(c, r.optString(0), vals, nc, false, bold, cols);
            box.addView(row);
        }
    }

    /** One box-score line; FG (made-attempted, "7-12") gets a wider column than the counts. */
    private View tableRow(Context c, String name, JSONArray vals, int n, boolean head, int bold, JSONArray cols) {
        LinearLayout r = new LinearLayout(c);
        r.setGravity(Gravity.CENTER_VERTICAL);
        r.setPadding(Ui.dp(8), 0, Ui.dp(6), 0);
        if (!head) r.setBackground(topLine());
        TextView nm = Ui.line(c, name, 14, Ui.T1, Ui.inter500);
        r.addView(nm, new LinearLayout.LayoutParams(0, -2, 1));
        for (int k = 0; k < n; k++) {
            TextView v = Ui.text(c, vals == null ? "" : vals.optString(k), 14, head ? Ui.T3 : Ui.T1, head ? Ui.inter650 : k == bold ? Ui.inter700 : Ui.inter500);
            v.setGravity(Gravity.END);
            Ui.tabular(v);
            boolean wide = cols != null && cols.optString(k).contains("FG") || cols != null && cols.optString(k).contains("3P");
            r.addView(v, new LinearLayout.LayoutParams(Ui.dp(wide ? 54 : 38), -2));
        }
        r.setLayoutParams(new LinearLayout.LayoutParams(-1, Ui.dp(head ? 22 : 25)));
        return r;
    }
    private static android.graphics.drawable.Drawable topLine() {
        android.graphics.drawable.ShapeDrawable s = new android.graphics.drawable.ShapeDrawable(new android.graphics.drawable.shapes.Shape() {
            final android.graphics.Paint p = new android.graphics.Paint();
            @Override public void draw(android.graphics.Canvas cv, android.graphics.Paint paint) { p.setColor(Ui.BORDER); cv.drawRect(0, 0, getWidth(), Math.max(1, Ui.dp(1)), p); }
        });
        return s;
    }

    private void plays(Context c) {
        JSONArray ps = d.optJSONArray("plays");
        if (ps == null || ps.length() == 0) {
            TextView e = Ui.text(c, "No plays yet.", 14, Ui.T2, Ui.inter500);
            e.setPadding(Ui.dp(8), Ui.dp(10), Ui.dp(8), Ui.dp(6));
            box.addView(e);
            return;
        }
        int max = 7;
        scroll = Math.max(0, Math.min(scroll, ps.length() - max));
        for (int i = scroll; i < Math.min(ps.length(), scroll + max); i++) {
            JSONObject p = ps.optJSONObject(i);
            if (p == null) continue;
            LinearLayout r = new LinearLayout(c);
            r.setOrientation(LinearLayout.VERTICAL);
            r.setPadding(Ui.dp(8), Ui.dp(5), Ui.dp(6), Ui.dp(5));
            r.setBackground(topLine());
            LinearLayout top = new LinearLayout(c);
            top.addView(Ui.text(c, p.optString("clock") + "  " + p.optString("team"), 12, Ui.T3, Ui.inter650), new LinearLayout.LayoutParams(0, -2, 1));
            String s = p.optString("score");
            if (!s.isEmpty()) top.addView(Ui.text(c, s, 12, Ui.PINK_TEXT, Ui.inter700));
            r.addView(top);
            TextView tx = Ui.text(c, p.optString("text"), 14, p.optBoolean("scoring") ? Ui.T1 : Ui.T2, p.optBoolean("scoring") ? Ui.inter650 : Ui.inter500);
            tx.setMaxLines(2);
            tx.setEllipsize(TextUtils.TruncateAt.END);
            r.addView(tx);
            box.addView(r);
        }
    }

    @Override boolean key(int code, boolean repeat) {
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_LEFT: case KeyEvent.KEYCODE_DPAD_RIGHT:
                if (onReveal || repeat) return true;
                tab = Math.max(0, Math.min(tabs() - 1, tab + (code == KeyEvent.KEYCODE_DPAD_RIGHT ? 1 : -1)));
                scroll = 0;
                refresh();
                return true;
            case KeyEvent.KEYCODE_DPAD_DOWN:
                if (hidden()) { if (!onReveal) { onReveal = true; refresh(); } return true; }
                scroll++; refresh(); return true;
            case KeyEvent.KEYCODE_DPAD_UP:
                if (onReveal) { onReveal = false; refresh(); return true; }
                if (scroll > 0) { scroll--; refresh(); }
                return true;
            case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_NUMPAD_ENTER:
                if (repeat) return true;
                if (onReveal) { onReveal = false; a.revealGame(); return true; }
                if (tab == 3) { a.openSync(); return true; }
                a.closeOverlay();
                return true;
        }
        return false;
    }

    @Override String[][] hints() {
        if (hidden()) return onReveal ? new String[][] { { "OK", "Reveal score" }, { "▲", "Tabs" }, { "Back", "Close" } }
                : new String[][] { { "◀ ▶", "Tabs" }, { "▼", "Reveal" }, { "OK", "Close" }, { "Back", "Close" } };
        if (tab == 3) return new String[][] { { "OK", "Sync score" }, { "◀ ▶", "Tabs" }, { "Back", "Close" } };
        return new String[][] { { "◀ ▶", "Tabs" }, { "▲ ▼", "Scroll" }, { "OK", "Close" }, { "Back", "Close" } };
    }
}
