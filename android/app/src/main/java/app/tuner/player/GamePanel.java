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
 * In a replay (design/ui-v1/catchup/SPEC.md 6.9, player-replay-panel) it shows only the app's as-aired answers: the
 * score as aired on the plate with "Q2 6:41 · as aired", tabs Quarters · Plays · Sync (the box score only once the
 * buzzer + 2 min has played), Quarters with their aired times, OK jumping there. A video replay: "Replay", no score,
 * and the sources. Live on a kept channel, a foot button "⏮ From tip-off" starts the game's replay (6.9).
 * <p>
 * ▶ on a game: the score on a skewed plate between the two crests, the clock and how far the score is synced behind
 * live, then tabs for each team's box score, the plays, and Sync. Everything is at the synced delay (the app sends it
 * that way). Under the spoiler shield, for a game you are not watching: no score, no points column, no plays, and a
 * Reveal button you have to move to.
 */
final class GamePanel extends Overlay {
    private final LinearLayout box;
    private int tab;            // live: see liveTabs() (away, home, team, plays, sync); a replay: see replayTabs()
    private int page;           // the box score's columns: OK on a team's tab shows the next set (More stats)
    // (all of ESPN's box score, a set at a time so it reads from the sofa; columns the app left out, as under the shield, are skipped)
    private static final String[][] PAGES = { { "MIN", "PTS", "REB", "AST", "FG" }, { "3PT", "FT", "STL", "BLK", "TO" }, { "OREB", "DREB", "PF", "+/-" } };
    private boolean onReveal;
    private int foot;           // live: 0 the tabs, 1 Reveal, 2 From tip-off (the foot buttons, reached with ▼)
    private int qsel = -1;      // a replay's Quarters: the focused row (-1: the tabs)
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

    private boolean replay() { return a.rp != null && a.rp.isGame(); }
    private boolean hidden() { return d != null && d.optBoolean("hidden") && !replay(); }
    private int tabs() { return replay() ? replayTabs().size() : liveTabs().size(); }
    /** Live: each team's box score, the team stats, then (not under the shield) the plays and Sync. */
    private java.util.List<String> liveTabs() {
        java.util.List<String> t = new java.util.ArrayList<>(java.util.Arrays.asList("away", "home", "team"));
        if (!hidden()) { t.add("plays"); t.add("sync"); }
        return t;
    }
    /** The team whose box score is up ("away" / "home"), or null. */
    private String boxSide() {
        if (!replay()) { String lt = liveTab(); return "away".equals(lt) || "home".equals(lt) ? lt : null; }
        String tn = tabName();
        JSONObject aw = d == null ? null : d.optJSONObject("away"), hm = d == null ? null : d.optJSONObject("home");
        return aw != null && tn.equals(aw.optString("abbr")) ? "away" : hm != null && tn.equals(hm.optString("abbr")) ? "home" : null;
    }
    private String liveTab() { java.util.List<String> t = liveTabs(); return tab < t.size() ? t.get(tab) : ""; }
    /** A replay's tabs: Quarters · Plays · (the box score, once ready) · Sync; a video: Sources. */
    private java.util.List<String> replayTabs() {
        java.util.List<String> t = new java.util.ArrayList<>();
        if (a.rp != null && a.rp.isVideo()) { t.add("Sources"); return t; }
        t.add("Quarters");
        t.add("Plays");
        if (d != null && d.optBoolean("boxReady")) { JSONObject aw = d.optJSONObject("away"), hm = d.optJSONObject("home"); t.add(aw == null ? "Away" : aw.optString("abbr")); t.add(hm == null ? "Home" : hm.optString("abbr")); t.add("Team"); }
        t.add("Sync");
        return t;
    }
    private String tabName() { java.util.List<String> t = replayTabs(); return tab < t.size() ? t.get(tab) : ""; }
    /** Live on a kept channel: From tip-off under the table (the app sends kept and the tip-off with the game). */
    private boolean tipoffButton() { return !replay() && d != null && d.optBoolean("kept") && d.optBoolean("started"); }

    @Override void refresh() {
        d = a.game;
        if (tab >= tabs()) tab = 0;
        if (replay()) { refreshReplay(); return; }
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
        boolean synced = d.has("synced") && !d.isNull("synced"), delayed = d.has("delayed") && !d.isNull("delayed");
        if (!hidden() && (synced || delayed)) {   // only "Synced" once a sync is stored; the 60 s default says so
            sub.addView(Ui.text(c, "  ·  ", 14, Ui.T3, Ui.inter500));
            sub.addView(Ui.iconView(c, "clock", Ui.T3, 16));
            sub.addView(space(c, 4));
            sub.addView(Ui.text(c, synced ? "Synced · " + d.optInt("synced") + " s" : "Delayed " + d.optInt("delayed") + " s (default)", 14, Ui.T3, Ui.inter500));
        }
        box.addView(sub);

        // tabs
        LinearLayout tabsRow = new LinearLayout(c);
        tabsRow.setPadding(Ui.dp(6), Ui.dp(4), Ui.dp(6), Ui.dp(4));
        java.util.List<String> keys = liveTabs();
        for (int i = 0; i < keys.size(); i++) {
            String k = keys.get(i);
            boolean f = i == tab && !onReveal, sync = "sync".equals(k);
            String name = "away".equals(k) ? (away == null ? "" : away.optString("abbr")) : "home".equals(k) ? (home == null ? "" : home.optString("abbr")) : "team".equals(k) ? "Team" : "plays".equals(k) ? "Plays" : "Sync";
            TextView t = Ui.text(c, name, 14, i == tab ? Ui.PINK_TEXT : Ui.T2, Ui.inter650);
            t.setGravity(Gravity.CENTER);
            t.setPadding(Ui.dp(sync ? 8 : 12), 0, Ui.dp(12), 0);
            GradientDrawable bg = Ui.round(sync ? 0 : i == tab ? Ui.S3 : Ui.S2, 999);
            if (sync) { bg.setStroke(Ui.dp(2), Ui.BORDER_STRONG); t.setTextColor(Ui.T1); t.setCompoundDrawables(sized(Ui.icon("refresh", Ui.T1, 16)), null, null, null); t.setCompoundDrawablePadding(Ui.dp(4)); }
            if (f) bg.setStroke(Ui.dp(3), Ui.FOCUS);
            t.setBackground(bg);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, Ui.dp(30));
            lp.setMarginEnd(Ui.dp(6));
            tabsRow.addView(t, lp);
        }
        box.addView(tabsRow);

        String lt = liveTab();
        if ("plays".equals(lt)) plays(c);
        else if ("team".equals(lt)) teamStats(c);
        else if (!"sync".equals(lt)) table(c, lt);

        onReveal = foot == 1;
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
        }
        if (tipoffButton()) {
            TextView btn = Ui.pill(c, "From tip-off", "skipBack", false);
            Ui.pillState(btn, false, foot == 2);
            LinearLayout.LayoutParams bl = new LinearLayout.LayoutParams(-2, Ui.dp(40));
            bl.setMarginStart(Ui.dp(8));
            bl.topMargin = Ui.dp(10);
            box.addView(btn, bl);
        }
        if (!hidden() || tipoffButton()) {
            TextView ft = Ui.text(c, "Back closes", 14, Ui.T3, Ui.inter500);
            ft.setPadding(Ui.dp(8), Ui.dp(10), Ui.dp(8), 0);
            box.addView(ft);
        }
    }

    // ---------- in a replay ----------
    private void refreshReplay() {
        box.removeAllViews();
        Context c = a;
        Replay r = a.rp;
        JSONObject away = d == null ? null : d.optJSONObject("away"), home = d == null ? null : d.optJSONObject("home");
        LinearLayout tm = new LinearLayout(c);
        tm.setGravity(Gravity.CENTER_VERTICAL);
        tm.setPadding(Ui.dp(6), Ui.dp(6), Ui.dp(6), 0);
        tm.addView(crest(c, away));
        FrameLayout plate = new FrameLayout(c);
        plate.setBackground(new Ui.Plate(Ui.S2, 3));
        JSONArray sc = d == null ? null : d.optJSONArray("score");
        if (sc == null) {
            TextView h = Ui.text(c, r.isVideo() ? "Replay" : "–", 14, Ui.T1, Ui.inter500);
            h.setGravity(Gravity.CENTER);
            plate.addView(h, new FrameLayout.LayoutParams(-1, -1));
        } else plate.addView(scoreText(c, sc), new FrameLayout.LayoutParams(-1, -1));
        LinearLayout.LayoutParams pl = new LinearLayout.LayoutParams(0, Ui.dp(48), 1);
        pl.setMargins(Ui.dp(12), 0, Ui.dp(12), 0);
        tm.addView(plate, pl);
        tm.addView(crest(c, home));
        box.addView(tm, new LinearLayout.LayoutParams(-1, Ui.dp(56)));
        TextView mom = Ui.text(c, d == null ? "Loading the game…" : r.isVideo() ? "Full game · no timing to match" : d.optString("moment", d.optString("clock")), 14, Ui.T3, Ui.inter500);
        mom.setGravity(Gravity.CENTER);
        mom.setPadding(0, Ui.dp(4), 0, Ui.dp(8));
        box.addView(mom, new LinearLayout.LayoutParams(-1, -2));
        // tabs
        java.util.List<String> names = replayTabs();
        LinearLayout tabsRow = new LinearLayout(c);
        tabsRow.setPadding(Ui.dp(6), Ui.dp(4), Ui.dp(6), Ui.dp(4));
        for (int i = 0; i < names.size(); i++) {
            boolean sync = "Sync".equals(names.get(i)), f = i == tab && qsel < 0;
            TextView t = Ui.text(c, names.get(i), 14, i == tab ? Ui.PINK_TEXT : Ui.T2, Ui.inter650);
            t.setGravity(Gravity.CENTER);
            t.setPadding(Ui.dp(sync ? 7 : 9), 0, Ui.dp(9), 0);
            GradientDrawable bg = Ui.round(sync ? 0 : i == tab ? Ui.S3 : Ui.S2, 999);
            if (sync) { bg.setStroke(Ui.dp(2), Ui.BORDER_STRONG); t.setTextColor(Ui.T1); t.setCompoundDrawables(sized(Ui.icon("refresh", Ui.T1, 16)), null, null, null); t.setCompoundDrawablePadding(Ui.dp(4)); }
            if (f) bg.setStroke(Ui.dp(3), Ui.FOCUS);
            t.setBackground(bg);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, Ui.dp(30));
            lp.setMarginEnd(Ui.dp(4));
            tabsRow.addView(t, lp);
        }
        box.addView(tabsRow);
        String tn = tabName();
        if (d == null) return;
        if ("Quarters".equals(tn)) quarters(c, r);
        else if ("Plays".equals(tn)) plays(c);
        else if ("Sources".equals(tn)) sources(c, r);
        else if ("Team".equals(tn)) teamStats(c);
        else if ("Sync".equals(tn)) {
            TextView e = Ui.text(c, "OK lists the game clocks around the moment on screen. What you pick is kept for this channel's replays.", 14, Ui.T2, Ui.inter500);
            e.setPadding(Ui.dp(8), Ui.dp(10), Ui.dp(8), Ui.dp(6));
            box.addView(e);
        } else {
            JSONObject aw = d.optJSONObject("away");
            table(c, aw != null && tn.equals(aw.optString("abbr")) ? "away" : "home");
        }
        TextView ft = Ui.text(c, "Quarters".equals(tn) ? (d.optBoolean("boxReady") ? "OK jumps there." : "OK jumps there. The box score comes after the final buzzer.") : "Back closes", 14, Ui.T3, Ui.inter500);
        ft.setPadding(Ui.dp(8), Ui.dp(10), Ui.dp(8), 0);
        box.addView(ft);
    }
    private TextView scoreText(Context c, JSONArray sc) {
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
        return s;
    }
    /** Tip-off · 01:12, Q2, Halftime, Q3, Q4 (OT rows only once played), with their aired times; yours on surface-2. */
    private java.util.List<Timeline.Mark> quarterMarks(Replay r) { return r.ticks(); }
    private void quarters(Context c, Replay r) {
        java.util.List<Timeline.Mark> q = quarterMarks(r);
        if (q.isEmpty()) {
            TextView e = Ui.text(c, "The quarters come with the game's plays from ESPN.", 14, Ui.T2, Ui.inter500);
            e.setPadding(Ui.dp(8), Ui.dp(10), Ui.dp(8), Ui.dp(6));
            box.addView(e);
            return;
        }
        if (qsel >= q.size()) qsel = q.size() - 1;
        String cur = r.current();
        Replay.Source s = r.src();
        for (int i = 0; i < q.size(); i++) {
            Timeline.Mark k = q.get(i);
            LinearLayout row = new LinearLayout(c);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(Ui.dp(12), 0, Ui.dp(12), 0);
            boolean f = i == qsel, now = k.key.equals(cur);
            row.setBackground(Ui.rowBg(f, now));
            row.addView(Ui.text(c, k.label, 16, Ui.T1, Ui.inter650), new LinearLayout.LayoutParams(0, -2, 1));
            String at = now ? "now" : s.windowStart > 0 ? PlayerActivity.hm(s.windowStart + k.at - s.delay * 1000L) : "";
            row.addView(Ui.text(c, at, 15, Ui.T2, Ui.inter500));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, Ui.dp(44));
            lp.topMargin = Ui.dp(4);
            box.addView(row, lp);
        }
    }
    private void sources(Context c, Replay r) {
        for (int i = 0; i < r.sources.size(); i++) {
            Replay.Source x = r.sources.get(i);
            ListPanel.Row row = new ListPanel.Row(c);
            ListPanel.Item it = new ListPanel.Item(x.name);
            it.sub = x.detail;
            it.radio = true;
            it.radioOn = i == r.si;
            it.height = 52;
            box.addView(row);
            row.bind(it, i == qsel);
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
        JSONArray all = t.optJSONArray("cols");
        java.util.List<int[]> pages = pages(all);
        if (pages.isEmpty()) return;
        page = Math.floorMod(page, pages.size());
        int[] at = pages.get(page);
        JSONArray cols = new JSONArray();
        for (int i : at) cols.put(all.optString(i));
        int nc = cols.length();
        box.addView(tableRow(c, pages.size() > 1 ? "Stats " + (page + 1) + " of " + pages.size() : "", cols, nc, true, -1, cols));
        scroll = Math.max(0, Math.min(scroll, rows.length() - maxRows()));
        int bold = -1;
        for (int k = 0; k < nc; k++) if ("PTS".equals(cols.optString(k))) bold = k;
        for (int i = scroll; i < Math.min(rows.length(), scroll + maxRows()); i++) {
            JSONArray r = rows.optJSONArray(i);
            if (r == null) continue;
            JSONArray vals = new JSONArray();
            for (int k : at) vals.put(r.optString(k + 1));
            View row = tableRow(c, r.optString(0), vals, nc, false, bold, cols);
            box.addView(row);
        }
    }
    /** The column sets on this table: indexes into its cols, each set with at least one column the app sent. */
    private static java.util.List<int[]> pages(JSONArray cols) {
        java.util.List<int[]> out = new java.util.ArrayList<>();
        java.util.List<String> have = new java.util.ArrayList<>();
        for (int i = 0; cols != null && i < cols.length(); i++) have.add(cols.optString(i));
        java.util.Set<String> placed = new java.util.HashSet<>();
        for (String[] p : PAGES) {
            java.util.List<Integer> at = new java.util.ArrayList<>();
            for (String k : p) { int i = have.indexOf(k); if (i >= 0) { at.add(i); placed.add(k); } }
            if (!at.isEmpty()) out.add(toInts(at));
        }
        java.util.List<Integer> rest = new java.util.ArrayList<>();   // (any other column ESPN adds: a last set)
        for (int i = 0; i < have.size(); i++) if (!placed.contains(have.get(i))) rest.add(i);
        for (int i = 0; i < rest.size(); i += 5) out.add(toInts(rest.subList(i, Math.min(rest.size(), i + 5))));
        return out;
    }
    private static int[] toInts(java.util.List<Integer> l) { int[] r = new int[l.size()]; for (int i = 0; i < r.length; i++) r[i] = l.get(i); return r; }
    private int pageCount() {
        String lt = boxSide();
        if (d == null || lt == null) return 0;
        JSONObject b = d.optJSONObject("box"), t = b == null ? null : b.optJSONObject(lt);
        JSONArray rows = t == null ? null : t.optJSONArray("rows");
        return rows == null || rows.length() == 0 ? 0 : pages(t.optJSONArray("cols")).size();
    }

    /** Team stats, away on the left and home on the right (the app sends only what the shield allows). */
    private void teamStats(Context c) {
        JSONArray ts = d.optJSONArray("teamStats");
        if (ts == null || ts.length() == 0) {
            TextView e = Ui.text(c, d.optBoolean("loading") ? "Loading the team stats…" : "No team stats yet. They appear at tip-off.", 14, Ui.T2, Ui.inter500);
            e.setPadding(Ui.dp(8), Ui.dp(10), Ui.dp(8), Ui.dp(6));
            box.addView(e);
            return;
        }
        JSONObject away = d.optJSONObject("away"), home = d.optJSONObject("home");
        box.addView(statRow(c, away == null ? "" : away.optString("abbr"), "", home == null ? "" : home.optString("abbr"), true));
        scroll = Math.max(0, Math.min(scroll, ts.length() - maxRows()));
        for (int i = scroll; i < Math.min(ts.length(), scroll + maxRows()); i++) {
            JSONObject s = ts.optJSONObject(i);
            if (s != null) box.addView(statRow(c, s.optString("away"), s.optString("label"), s.optString("home"), false));
        }
    }
    private View statRow(Context c, String l, String name, String r, boolean head) {
        LinearLayout row = new LinearLayout(c);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(Ui.dp(8), 0, Ui.dp(8), 0);
        if (!head) row.setBackground(topLine());
        TextView a = Ui.text(c, l, 14, head ? Ui.T3 : Ui.T1, head ? Ui.inter650 : Ui.inter650);
        Ui.tabular(a);
        row.addView(a, new LinearLayout.LayoutParams(Ui.dp(52), -2));
        TextView n = Ui.line(c, name, 14, Ui.T2, Ui.inter500);
        n.setGravity(Gravity.CENTER);
        row.addView(n, new LinearLayout.LayoutParams(0, -2, 1));
        TextView b = Ui.text(c, r, 14, head ? Ui.T3 : Ui.T1, Ui.inter650);
        b.setGravity(Gravity.END);
        Ui.tabular(b);
        row.addView(b, new LinearLayout.LayoutParams(Ui.dp(52), -2));
        row.setLayoutParams(new LinearLayout.LayoutParams(-1, Ui.dp(head ? 22 : 25)));
        return row;
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
            String cn = cols == null ? "" : cols.optString(k);
            boolean wide = cn.contains("FG") || cn.contains("3P") || cn.equals("FT");
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

    private boolean replayKey(int code, boolean repeat) {
        Replay r = a.rp;
        String tn = tabName();
        int rows = "Quarters".equals(tn) ? quarterMarks(r).size() : "Sources".equals(tn) ? r.sources.size() : 0;
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_LEFT: case KeyEvent.KEYCODE_DPAD_RIGHT:
                if (repeat || qsel >= 0) return true;
                tab = Math.max(0, Math.min(tabs() - 1, tab + (code == KeyEvent.KEYCODE_DPAD_RIGHT ? 1 : -1)));
                scroll = 0;
                page = 0;
                refresh();
                return true;
            case KeyEvent.KEYCODE_DPAD_DOWN:
                if (rows > 0) { if (qsel < rows - 1) qsel++; refresh(); return true; }
                scroll++; refresh(); return true;
            case KeyEvent.KEYCODE_DPAD_UP:
                if (qsel >= 0) { qsel--; refresh(); return true; }
                if (scroll > 0) { scroll--; refresh(); }
                return true;
            case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_NUMPAD_ENTER:
                if (repeat) return true;
                if ("Sync".equals(tn)) { a.openSync(); return true; }
                if ("Quarters".equals(tn) && qsel >= 0) { Timeline.Mark k = quarterMarks(r).get(qsel); a.closeOverlay(); r.seek(Math.max(0, k.at - 10000), false); return true; }
                if ("Sources".equals(tn) && qsel >= 0) { int n = qsel; a.closeOverlay(); if (n != r.si) r.pickSource(n); return true; }
                if (pageCount() > 1) { page++; refresh(); return true; }   // More stats
                a.closeOverlay();
                return true;
        }
        return false;
    }

    @Override boolean key(int code, boolean repeat) {
        if (replay()) return replayKey(code, repeat);
        int feet = (hidden() ? 1 : 0) + (tipoffButton() ? 1 : 0);
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_LEFT: case KeyEvent.KEYCODE_DPAD_RIGHT:
                if (foot > 0 || repeat) return true;
                tab = Math.max(0, Math.min(tabs() - 1, tab + (code == KeyEvent.KEYCODE_DPAD_RIGHT ? 1 : -1)));
                scroll = 0;
                page = 0;
                refresh();
                return true;
            case KeyEvent.KEYCODE_DPAD_DOWN:
                if (feet > 0 && (hidden() || foot > 0 || scrollEnd())) {
                    int next = foot == 0 ? (hidden() ? 1 : 2) : foot == 1 && tipoffButton() ? 2 : foot;
                    if (next != foot) { foot = next; refresh(); }
                    return true;
                }
                scroll++; refresh(); return true;
            case KeyEvent.KEYCODE_DPAD_UP:
                if (foot > 0) { foot = foot == 2 && hidden() ? 1 : 0; refresh(); return true; }
                if (scroll > 0) { scroll--; refresh(); }
                return true;
            case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_NUMPAD_ENTER:
                if (repeat) return true;
                if (foot == 1) { foot = 0; a.revealGame(); return true; }
                if (foot == 2) { foot = 0; a.closeOverlay(); a.fromTipoff(); return true; }
                if ("sync".equals(liveTab())) { a.openSync(); return true; }
                if (pageCount() > 1) { page++; refresh(); return true; }   // More stats
                a.closeOverlay();
                return true;
        }
        return false;
    }

    /** The table or the plays are scrolled to their end (▼ then goes on to the foot button). */
    private boolean scrollEnd() {
        JSONArray rows = null;
        String lt = liveTab();
        if (d != null && "plays".equals(lt)) rows = d.optJSONArray("plays");
        else if (d != null && "team".equals(lt)) rows = d.optJSONArray("teamStats");
        else if (d != null && ("away".equals(lt) || "home".equals(lt))) { JSONObject b = d.optJSONObject("box"), t = b == null ? null : b.optJSONObject(lt); rows = t == null ? null : t.optJSONArray("rows"); }
        int n = rows == null ? 0 : rows.length(), max = "plays".equals(lt) ? 7 : maxRows();
        return scroll >= Math.max(0, n - max) || "sync".equals(lt);
    }

    @Override String[][] hints() {
        if (replay()) {
            String tn = tabName();
            if ("Quarters".equals(tn) || "Sources".equals(tn)) return qsel >= 0 ? new String[][] { { "OK", "Quarters".equals(tn) ? "Jump there" : "Play this" }, { "▲ ▼", "Move" }, { "Back", "Close" } }
                    : new String[][] { { "◀ ▶", "Tabs" }, { "▼", "Quarters".equals(tn) ? "Quarters" : "Sources" }, { "Back", "Close" } };
            if ("Sync".equals(tn)) return new String[][] { { "OK", "Sync score" }, { "◀ ▶", "Tabs" }, { "Back", "Close" } };
            if (pageCount() > 1) return new String[][] { { "◀ ▶", "Tabs" }, { "▲ ▼", "Scroll" }, { "OK", "More stats" }, { "Back", "Close" } };
            return new String[][] { { "◀ ▶", "Tabs" }, { "▲ ▼", "Scroll" }, { "Back", "Close" } };
        }
        if (foot == 2) return new String[][] { { "OK", "From tip-off" }, { "▲", "Back up" }, { "Back", "Close" } };
        if (hidden()) return onReveal ? new String[][] { { "OK", "Reveal score" }, { "▲", "Tabs" }, { "Back", "Close" } }
                : new String[][] { { "◀ ▶", "Tabs" }, { "▼", "Reveal" }, { "OK", "Close" }, { "Back", "Close" } };
        if ("sync".equals(liveTab())) return new String[][] { { "OK", "Sync score" }, { "◀ ▶", "Tabs" }, { "Back", "Close" } };
        if (pageCount() > 1) return new String[][] { { "◀ ▶", "Tabs" }, { "▲ ▼", "Scroll" }, { "OK", "More stats" }, { "Back", "Close" } };
        return new String[][] { { "◀ ▶", "Tabs" }, { "▲ ▼", "Scroll" }, { "OK", "Close" }, { "Back", "Close" } };
    }
}
