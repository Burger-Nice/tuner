package app.tuner.player;

import android.os.Handler;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.URLEncoder;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * ESPN's public game summary (the endpoint app/nba.js reads), fetched by the player itself. While the player is in front
 * the app's page is hidden, and Android's WebView throttles a hidden page's timers (and can stop it altogether), so the
 * app's answers to the player come late or never: Sync's clocks and the game panel's box score are read here instead.
 */
final class Espn {
    static final String DEFAULT_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
    private static final ExecutorService NET = Executors.newCachedThreadPool();
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    interface Done { void ok(Summary s); void fail(String why); }

    static final class Play {
        int period; String clock = "", text = "", team = ""; boolean scoring; String away = "", home = ""; long at;
        String label() { return ordinal(period) + " " + clock; }
    }
    static final class Summary {
        long fetchedAt;
        String state = "pre", detail = "", clock = "";
        int period;
        String awayAbbr = "", homeAbbr = "", awayScore = "", homeScore = "";
        final Map<String, JSONObject> box = new HashMap<>();   // abbr -> { labels: [...], players: [[name, stats...]] }
        final List<Play> plays = new ArrayList<>();            // in game order
        final Map<String, Map<String, String>> teams = new HashMap<>();   // abbr -> ESPN's team stats by name, and app/nba.js's extras
    }

    static String ordinal(int n) { return n <= 4 ? "Q" + n : n == 5 ? "OT" : (n - 4) + "OT"; }

    /** The summary of one game, answered on the main thread within `ms` (a slow answer counts as a failure). */
    static void fetch(String base, String id, int ms, Done done) {
        AtomicBoolean over = new AtomicBoolean();
        Runnable late = () -> { if (over.compareAndSet(false, true)) done.fail("ESPN took too long to answer"); };
        MAIN.postDelayed(late, ms);
        NET.execute(() -> {
            Summary s = null; String why = null;
            HttpURLConnection c = null;
            try {
                String b = base == null || base.isEmpty() ? DEFAULT_BASE : base;
                c = (HttpURLConnection) new URL(b + "/summary?event=" + URLEncoder.encode(id, "UTF-8")).openConnection();
                c.setConnectTimeout(ms);
                c.setReadTimeout(ms);
                c.setUseCaches(false);
                int code = c.getResponseCode();
                if (code != 200) why = "ESPN answered " + code;
                else {
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    try (InputStream in = c.getInputStream()) { byte[] buf = new byte[16384]; int n; while ((n = in.read(buf)) > 0) out.write(buf, 0, n); }
                    s = parse(new JSONObject(out.toString("UTF-8")));
                }
            } catch (UnknownHostException e) { why = "Can't reach ESPN (no internet or DNS)";
            } catch (SocketTimeoutException e) { why = "ESPN took too long to answer";
            } catch (java.io.IOException e) { why = "Can't reach ESPN (" + (e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()) + ")";
            } catch (Exception e) { why = "ESPN sent something unreadable";
            } finally { if (c != null) c.disconnect(); }
            Summary got = s; String err = why;
            MAIN.post(() -> {
                if (!over.compareAndSet(false, true)) return;
                MAIN.removeCallbacks(late);
                if (got != null) done.ok(got); else done.fail(err);
            });
        });
    }

    static Summary parse(JSONObject d) {
        Summary s = new Summary();
        s.fetchedAt = System.currentTimeMillis();
        JSONObject comp = d.optJSONObject("header") == null ? null : d.optJSONObject("header").optJSONArray("competitions") == null ? null : d.optJSONObject("header").optJSONArray("competitions").optJSONObject(0);
        Map<String, String> abbrOf = new HashMap<>();
        Map<String, Map<String, String>> extra = new HashMap<>();
        if (comp != null) {
            JSONObject st = comp.optJSONObject("status");
            if (st != null) {
                JSONObject t = st.optJSONObject("type");
                if (t != null) { s.state = t.optString("state", "pre"); s.detail = t.optString("shortDetail", t.optString("detail")); }
                s.clock = st.optString("displayClock");
                s.period = st.optInt("period");
            }
            JSONArray cs = comp.optJSONArray("competitors");
            for (int i = 0; cs != null && i < cs.length(); i++) {
                JSONObject c = cs.optJSONObject(i);
                JSONObject t = c == null ? null : c.optJSONObject("team");
                if (t == null) continue;
                String ab = t.optString("abbreviation");
                abbrOf.put(t.optString("id"), ab);
                Object sc = c.opt("score");
                String score = sc instanceof JSONObject ? ((JSONObject) sc).optString("displayValue") : sc == null ? "" : String.valueOf(sc);
                Map<String, String> x = new HashMap<>();   // (as app/nba.js: team fouls this quarter, the bonus, timeouts left)
                JSONObject f = c.optJSONObject("fouls");
                if (f != null && (f.has("teamFoulsCurrent") || f.has("teamFouls"))) x.put("teamFouls", f.optString(f.has("teamFoulsCurrent") ? "teamFoulsCurrent" : "teamFouls"));
                if (f != null && !f.optString("bonusState").isEmpty()) x.put("inBonus", "NONE".equals(f.optString("bonusState")) ? "No" : "Yes");
                if (c.has("timeoutsRemaining")) x.put("timeoutsLeft", c.optString("timeoutsRemaining"));
                extra.put(ab, x);
                if ("home".equals(c.optString("homeAway"))) { s.homeAbbr = ab; s.homeScore = score; } else { s.awayAbbr = ab; s.awayScore = score; }
            }
        }
        JSONObject bs = d.optJSONObject("boxscore");
        JSONArray players = bs == null ? null : bs.optJSONArray("players");
        for (int i = 0; players != null && i < players.length(); i++) {
            JSONObject p = players.optJSONObject(i);
            if (p == null) continue;
            JSONObject st = p.optJSONArray("statistics") == null ? null : p.optJSONArray("statistics").optJSONObject(0);
            if (st == null) continue;
            JSONArray labels = st.optJSONArray("labels") != null ? st.optJSONArray("labels") : st.optJSONArray("names");
            JSONArray rows = new JSONArray();
            JSONArray as = st.optJSONArray("athletes");
            int pi = -1;
            for (int k = 0; labels != null && k < labels.length(); k++) if ("PTS".equals(labels.optString(k))) pi = k;
            int bench = 0; boolean any = false;
            for (int k = 0; as != null && k < as.length(); k++) {
                JSONObject a = as.optJSONObject(k);
                JSONArray stats = a == null ? null : a.optJSONArray("stats");
                if (a == null || a.optBoolean("didNotPlay") || stats == null || stats.length() == 0) continue;
                JSONObject who = a.optJSONObject("athlete");
                JSONArray r = new JSONArray();
                r.put(who == null ? "" : who.optString("shortName", who.optString("displayName")));
                for (int j = 0; j < stats.length(); j++) r.put(stats.optString(j));
                rows.put(r);
                any = true;
                if (!a.optBoolean("starter") && pi >= 0) try { bench += Integer.parseInt(stats.optString(pi)); } catch (Exception ignored) {}
            }
            String abT = p.optJSONObject("team") == null ? "" : p.optJSONObject("team").optString("abbreviation");
            if (any && pi >= 0) { if (!extra.containsKey(abT)) extra.put(abT, new HashMap<>()); extra.get(abT).put("benchPoints", String.valueOf(bench)); }
            try { s.box.put(p.optJSONObject("team") == null ? "" : p.optJSONObject("team").optString("abbreviation"), new JSONObject().put("labels", labels == null ? new JSONArray() : labels).put("players", rows)); } catch (Exception ignored) {}
        }
        JSONArray ts = bs == null ? null : bs.optJSONArray("teams");
        for (int i = 0; ts != null && i < ts.length(); i++) {
            JSONObject t = ts.optJSONObject(i);
            if (t == null) continue;
            String ab = t.optJSONObject("team") == null ? "" : t.optJSONObject("team").optString("abbreviation");
            Map<String, String> m = new HashMap<>();
            JSONArray st = t.optJSONArray("statistics");
            for (int k = 0; st != null && k < st.length(); k++) { JSONObject x = st.optJSONObject(k); if (x != null) m.put(x.optString("name"), x.optString("displayValue")); }
            if (extra.containsKey(ab)) m.putAll(extra.get(ab));
            s.teams.put(ab, m);
        }
        JSONArray ps = d.optJSONArray("plays");
        for (int i = 0; ps != null && i < ps.length(); i++) {
            JSONObject p = ps.optJSONObject(i);
            if (p == null) continue;
            Play x = new Play();
            x.text = p.optString("text");
            x.clock = p.optJSONObject("clock") == null ? "" : p.optJSONObject("clock").optString("displayValue");
            x.period = p.optJSONObject("period") == null ? 0 : p.optJSONObject("period").optInt("number");
            x.away = p.optString("awayScore"); x.home = p.optString("homeScore");
            x.scoring = p.optBoolean("scoringPlay");
            x.team = p.optJSONObject("team") == null ? "" : String.valueOf(abbrOf.get(p.optJSONObject("team").optString("id")) == null ? "" : abbrOf.get(p.optJSONObject("team").optString("id")));
            x.at = wall(p.optString("wallclock"));
            s.plays.add(x);
        }
        return s;
    }

    private static long wall(String iso) {
        if (iso == null || iso.isEmpty()) return 0;
        try { return java.time.Instant.parse(iso).toEpochMilli(); } catch (Exception e) {
            try { return java.time.OffsetDateTime.parse(iso).toInstant().toEpochMilli(); } catch (Exception e2) { return 0; }
        }
    }

    /** Sync's clock list, as games.js recentClocks: plays with a wallclock in the 8 minutes up to `seenAt`, newest first,
     * one per "Q2 4:31", at most 24. */
    static JSONArray clocks(Summary s, long seenAt) {
        JSONArray out = new JSONArray();
        Set<String> seen = new HashSet<>();
        for (int i = s.plays.size() - 1; i >= 0 && out.length() < 24; i--) {
            Play p = s.plays.get(i);
            if (p.at == 0 || p.at > seenAt || seenAt - p.at > 8 * 60000) continue;
            String label = p.label();
            if (!seen.add(label)) continue;
            try { out.put(new JSONObject().put("label", label).put("at", p.at)); } catch (Exception ignored) {}
        }
        return out;
    }

    /** A box score's rows in the app's columns: [name, value per column]. */
    static JSONArray rows(JSONArray cols, JSONArray labels, JSONArray players) {
        JSONArray out = new JSONArray();
        if (cols == null || labels == null || players == null) return out;
        int[] at = new int[cols.length()];
        for (int k = 0; k < at.length; k++) { at[k] = -1; for (int j = 0; j < labels.length(); j++) if (cols.optString(k).equals(labels.optString(j))) { at[k] = j; break; } }
        for (int i = 0; i < players.length(); i++) {
            JSONArray p = players.optJSONArray(i);
            if (p == null) continue;
            JSONArray r = new JSONArray().put(p.optString(0));
            for (int k : at) r.put(k >= 0 ? p.optString(k + 1) : "");
            out.put(r);
        }
        return out;
    }

    /** The clock line as games.js clockText has it. */
    static String clockText(Summary s, boolean hidden) {
        if ("post".equals(s.state)) return "Final";
        if (!"in".equals(s.state)) return null;
        boolean endOf = s.detail.toLowerCase(java.util.Locale.ROOT).contains("end of");
        if ((s.period > 4 || (s.period == 4 && (endOf || "0:00".equals(s.clock) || "0.0".equals(s.clock)))) && hidden) return "Live";
        if (s.detail.toLowerCase(java.util.Locale.ROOT).contains("half")) return "Halftime";
        if (endOf) return "End " + ordinal(s.period);
        return ordinal(s.period) + " " + s.clock;
    }

    /** The game panel's live answers (score, clock, box, plays) from a summary, laid over what the app sent: the same
     * shape app/tv/js/player.js gameData() builds, its columns and the shield kept as the app chose them. */
    static JSONObject over(JSONObject app, Summary s) {
        try {
            JSONObject g = new JSONObject(app.toString());
            boolean hid = g.optBoolean("hidden");
            String ct = clockText(s, hid);
            if (ct != null) g.put("clock", ct);
            if (!hid && !"pre".equals(s.state)) g.put("score", new JSONArray().put(s.awayScore.isEmpty() ? "0" : s.awayScore).put(s.homeScore.isEmpty() ? "0" : s.homeScore));
            JSONObject box = g.optJSONObject("box");
            if (box != null) {
                for (String side : new String[] { "away", "home" }) {
                    JSONObject t = box.optJSONObject(side), team = g.optJSONObject(side);
                    JSONObject b = team == null ? null : s.box.get(team.optString("abbr"));
                    if (t == null || b == null) continue;
                    t.put("rows", rows(t.optJSONArray("cols"), b.optJSONArray("labels"), b.optJSONArray("players")));
                }
            }
            // team stats: the lines the app chose (the shield's), with the values now
            JSONArray tsj = g.optJSONArray("teamStats");
            JSONObject aw = g.optJSONObject("away"), hm = g.optJSONObject("home");
            Map<String, String> ta = aw == null ? null : s.teams.get(aw.optString("abbr")), th = hm == null ? null : s.teams.get(hm.optString("abbr"));
            for (int i = 0; tsj != null && ta != null && th != null && i < tsj.length(); i++) {
                JSONObject x = tsj.optJSONObject(i);
                if (x == null) continue;
                String k = x.optString("key");
                if (ta.containsKey(k)) x.put("away", ta.get(k));
                if (th.containsKey(k)) x.put("home", th.get(k));
            }
            if (!hid) {
                JSONArray plays = new JSONArray();
                for (int i = s.plays.size() - 1; i >= 0 && plays.length() < 40; i--) {
                    Play p = s.plays.get(i);
                    plays.put(new JSONObject().put("clock", p.label()).put("team", p.team).put("text", p.text).put("scoring", p.scoring).put("score", p.scoring ? p.away + "–" + p.home : ""));
                }
                g.put("plays", plays);
            }
            g.put("loading", false);
            g.put("asOf", s.fetchedAt);
            return g;
        } catch (Exception e) { return app; }
    }
}
