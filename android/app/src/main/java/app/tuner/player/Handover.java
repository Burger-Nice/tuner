package app.tuner.player;

import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.media3.common.C;
import androidx.media3.common.PlaybackException;

import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * A film's or an episode's copies in the player (design/ui-v1/addons/PORT-NATIVE.md 2 to 4, SPEC 8): the copies as
 * identities (never links) in rank order, asking the app for a link (need: copy → copy), the hand-over when a copy
 * fails or turns out to be a "still downloading" placeholder, Options > Quality's copies, and Up next keeping the
 * source (need: next → queue-next). Live TV and replays never get one.
 *
 * Secrets: a copy's link and headers can hold a debrid key. Nothing here logs, shows or sends them anywhere: the cards
 * and rows name the source and the label only.
 */
final class Handover {
    private final PlayerActivity a;
    /** The copies in rank order: the one that started the play first, then entry.copies ({key, source, label, provider}). */
    private final List<JSONObject> chain = new ArrayList<>();
    private final Map<String, String> tried = new HashMap<>();   // copy key → "failed" | "notready"
    private int auto;                 // automatic hand-overs this play (at most 3)
    private String bestKey = "";      // the top copy of the play (Quality's Always the best copy)
    private boolean chosen;           // he picked a copy in Quality: Always the best copy is off
    // the copy playing now
    private boolean frames, decided, notReady, retried, nextAsked;
    private long startMs;             // where the play began (a placeholder's hand-over starts the next copy there)
    // asking for a link
    private String waitKey;           // the key asked for; "" while asking with a speed (key null)
    private boolean waitAny;
    private PlayerActivity.Entry ready;   // a link that arrived, waiting for the ring or Play it now
    private Runnable onLink;              // what to do with it once it arrives
    private long nextStartMs;
    private Card card;
    private Runnable cardTick;
    private final Runnable linkTimeout = () -> linkGone(waitKey);
    // Up next (an add-on episode): the card's line from the app
    String upNextSay = "";

    Handover(PlayerActivity a, PlayerActivity.Entry first) {
        this.a = a;
        reset(first);
    }

    /** A new title in the ring (Up next): its own copies, a fresh count. */
    void reset(PlayerActivity.Entry e) {
        chain.clear();
        tried.clear();
        auto = 0;
        chosen = false;
        if (e == null) return;
        startMs = e.start > 30 ? e.start * 1000 : 0;
        if (!e.copyKey.isEmpty()) chain.add(identity(e));
        JSONArray cs = e.copies;
        for (int i = 0; cs != null && i < cs.length(); i++) {
            JSONObject o = cs.optJSONObject(i);
            if (o != null && !o.optString("key").isEmpty() && !o.optString("key").equals(e.copyKey)) chain.add(o);
        }
        bestKey = chain.isEmpty() ? "" : chain.get(0).optString("key");
        copyStarted();
        nextAsked = false;
        upNextSay = "";
    }
    private static JSONObject identity(PlayerActivity.Entry e) {
        JSONObject o = new JSONObject();
        try {
            o.put("key", e.copyKey);
            o.put("source", e.addon() ? e.source : "provider");
            o.put("label", e.label);
            o.put("provider", !e.addon());
        } catch (Exception ignored) {}
        return o;
    }
    private void copyStarted() { frames = false; decided = false; notReady = false; retried = false; }

    /** There are copies to hand over to, or the not-ready rule applies (an add-on copy). */
    boolean active() { PlayerActivity.Entry e = a.entryNow(); return chain.size() > 1 || (e != null && e.addon()); }
    boolean hasOthers() { return !left().isEmpty(); }
    /** Quality lists the copies (not the provider's versions) once there is more than one. */
    boolean listsCopies() { return chain.size() > 1; }
    boolean notReady() { return notReady; }
    /** Progress is saved only for a copy that isn't a placeholder, once that's decided (PORT-NATIVE.md 2.2). */
    boolean progressAllowed() { PlayerActivity.Entry e = a.entryNow(); return e == null || !e.addon() || (decided && !notReady); }
    String playingKey() { PlayerActivity.Entry e = a.entryNow(); return e == null ? "" : e.copyKey; }

    private static String sourceName(JSONObject o) { return o.optBoolean("provider") || "provider".equals(o.optString("source")) ? "Your provider" : o.optString("source"); }
    private static String sourceName(PlayerActivity.Entry e) { return e.addon() ? e.source : "Your provider"; }
    private static boolean isProvider(JSONObject o) { return o.optBoolean("provider") || "provider".equals(o.optString("source")); }
    private static String label(JSONObject o) { String l = o.optString("label"); return l.isEmpty() ? "another copy" : l; }

    /** The copies not tried yet this play, in rank order, without the one playing. */
    private List<JSONObject> left() {
        List<JSONObject> out = new ArrayList<>();
        String now = playingKey();
        for (JSONObject o : chain) { String k = o.optString("key"); if (!k.equals(now) && !tried.containsKey(k)) out.add(o); }
        return out;
    }
    /** A source-wide failure prefers another source; one copy's failure simply takes the next (PORT-NATIVE.md 2.2). */
    private JSONObject pickNext(boolean sourceWide) {
        List<JSONObject> l = left();
        if (l.isEmpty()) return null;
        if (sourceWide) {
            PlayerActivity.Entry e = a.entryNow();
            String mine = e == null ? "" : e.addon() ? e.source : "provider";
            for (JSONObject o : l) if (!(isProvider(o) ? "provider" : o.optString("source")).equals(mine)) return o;
        }
        return l.get(0);
    }
    /** From one provider copy to another: the provider's own count of this TV's stream has to clear first. */
    private long providerWait(JSONObject next) {
        PlayerActivity.Entry e = a.entryNow();
        if (e == null || e.addon() || next == null || !isProvider(next)) return 0;
        long since = SystemClock.elapsedRealtime() - Diag.closedAt;
        long need = a.maxStreams() == 1 ? 10000 : 5000;
        return Math.max(0, need - Math.max(0, since));
    }

    // ---------- the player's hooks ----------

    void firstFrame() { frames = true; }
    /** The player is ready: once the duration is known, the not-ready rule (RANKING.md 2.2). */
    void readyNow() {
        retried = false;
        decide();
    }
    /** Also from the 1 s tick, for a duration that arrived late. */
    void decide() {
        if (decided) return;
        PlayerActivity.Entry e = a.entryNow();
        if (e == null) return;
        if (!e.addon()) { decided = true; return; }
        long d = a.durationMs();
        if (d == C.TIME_UNSET || d <= 0) return;
        decided = true;
        double sec = d / 1000.0;
        boolean episode = e.id.startsWith("episode:");
        boolean placeholder = episode ? (e.runtime > 0 ? sec < 0.5 * e.runtime : sec < 180) : e.runtime > 0 && sec < 0.5 * e.runtime;
        if (!placeholder) return;
        notReady = true;
        a.pausePlayer();
        JSObject ev = a.event("copy-notready");
        ev.put("key", e.copyKey);
        TunerPlayerPlugin.emit(ev);
        tried.put(e.copyKey, "notready");
        JSONObject next = pickNext(false);
        long at = Math.max(0, startMs - 10000 > 0 ? startMs - 10000 : startMs);
        if (next == null || auto >= 3) {
            chooseCard("That copy isn't ready yet", e.source + " sent a short \"still downloading\" clip instead of the " + (episode ? "episode" : "film") + ".", at);
            return;
        }
        auto++;
        showCard("That copy isn't ready yet", e.source + " sent a short \"still downloading\" clip instead of the " + (episode ? "episode" : "film") + ".",
                next, at, "Playing the next best in %d s: ", sourceName(next) + " · nothing is saved", 3000);
    }

    /** A failed copy: true when it hands over (or asks him), false to leave it to the player's own card. */
    boolean error(PlaybackException e) {
        PlayerActivity.Entry cur = a.entryNow();
        if (cur == null) return false;
        if (notReady) return true;   // (the placeholder's card is up already)
        a.classifyError(e);
        int h = a.httpCode();
        boolean decoder = e.errorCode >= 4000 && e.errorCode < 5000;   // the decoder or a profile this TV can't play
        boolean parsing = e.errorCode >= 3000 && e.errorCode < 4000;
        boolean timeout = a.timedOut() || e.errorCode == PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT;
        boolean network = e.errorCode == PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED || timeout;
        boolean sourceWide = !decoder && !parsing && (network || h >= 500 || h == 401 || h == 403 || h == 429 || h == 458 || h == 509 || (h == 0 && frames));
        if (!a.online()) return false;   // the TV is offline: the diagnosis says so, and no copy would play either
        long pos = a.positionMs();
        // after it played: the player's own retries first, once more from here, before calling it gone
        if (frames && sourceWide && !retried) { retried = true; a.retryHere(); return true; }
        String cause = decoder ? "decoder" : h > 0 ? "http-" + h : timeout ? "timeout" : network ? "network" : parsing ? "format" : "error";
        if (!cur.copyKey.isEmpty()) {
            tried.put(cur.copyKey, "failed");
            JSObject ev = a.event("copy-failed");
            ev.put("key", cur.copyKey);
            ev.put("cause", cause);
            TunerPlayerPlugin.emit(ev);
        }
        String slow = slowLine();
        JSONObject next = slow != null ? null : pickNext(sourceWide);
        if (slow == null && next == null) return false;   // nothing left to hand over to: the player's own card
        boolean played = frames;
        long at = played ? Math.max(0, pos - 10000) : Math.max(0, startMs - 10000 > 0 ? startMs - 10000 : startMs);
        if (!played && slow == null) {
            if (auto >= 3) { chooseCard("That copy didn't play", sourceName(cur) + " couldn't play its " + label(identity(cur)) + " copy.", at); return true; }
            // before the first frame: the next copy at once, with a toast
            auto++;
            a.showText("That copy didn't play · trying " + label(next) + " · " + sourceName(next), 4000);
            long wait = providerWait(next);
            a.releasePlayback();
            ask(next.optString("key"), false, () -> start(at));
            if (wait > 0) { Runnable go = onLink; onLink = () -> a.handler.postDelayed(go, wait); }
            return true;
        }
        String title = played ? "This copy stopped at " + clock(pos) : "That copy didn't play";
        String line;
        if (slow != null) line = slow;
        else if (decoder) line = "This TV couldn't play the rest of its " + label(identity(cur)) + " copy. Your place is kept.";
        else line = (cur.addon() ? cur.source : "Your provider") + " stopped sending its " + label(identity(cur)) + " copy. Your place is kept.";
        if (auto >= 3) { chooseCard(title, line, at); return true; }
        auto++;
        a.releasePlayback();
        if (slow != null) showCard(title, line, null, at, "Next best in %d s: ", "starts at " + clock(at), 3000);
        else showCard(title, line, next, at, "Next best in %d s: ", sourceName(next) + " · starts at " + clock(at), Math.max(3000, providerWait(next)));
        return true;
    }
    /** A Wi-Fi or internet cause from the diagnosis becomes the card's first line, and the app re-ranks with the speed. */
    private String slowLine() {
        String c = a.causeId();
        if (c == null) return null;
        if ("wifi".equals(c) || "wifi-gone".equals(c)) return "Your Wi-Fi is too slow for this copy. Your place is kept.";
        if ("internet-slow".equals(c) || "home-slow".equals(c)) return "Your internet is too slow for this copy. Your place is kept.";
        return null;
    }
    /** A stall the diagnosis put down to the Wi-Fi or the internet, with a speed it measured: a copy that fits. */
    boolean slowStall() {
        PlayerActivity.Entry cur = a.entryNow();
        if (cur == null || card != null || notReady || auto >= 3 || left().isEmpty()) return false;
        String line = slowLine();
        if (line == null || a.measuredMbps() <= 0) return false;
        auto++;
        long pos = a.positionMs(), at = Math.max(0, pos - 10000);
        a.releasePlayback();
        showCard(line.startsWith("Your Wi-Fi") ? "Your Wi-Fi is too slow for this copy" : "Your internet is too slow for this copy", "airglow is finding a copy that fits. Your place is kept.", null, at, "Next best in %d s: ", "starts at " + clock(at), 3000);
        return true;
    }

    // ---------- asking the app for a link (need: copy → copy) ----------

    private boolean askOnly;   // he picked this copy: if it's gone, say so rather than take another
    private void ask(String key, boolean speed, Runnable then) { ask(key, speed, then, false); }
    private void ask(String key, boolean speed, Runnable then, boolean only) {
        ready = null;
        askOnly = only;
        onLink = then;
        waitKey = speed ? "" : key;
        waitAny = speed;
        JSObject e = a.event("need");
        e.put("what", "copy");
        if (speed) { e.put("key", org.json.JSONObject.NULL); e.put("speedMbps", Math.round(a.measuredMbps() * 10) / 10.0); }
        else e.put("key", key);
        TunerPlayerPlugin.emit(e);
        a.handler.removeCallbacks(linkTimeout);
        a.handler.postDelayed(linkTimeout, 12000);
    }
    /** The app's answer: { key, entry } or { key, error: 'gone' }. */
    void copy(JSONObject o) {
        String key = o.optString("key");
        if (waitKey == null || (!waitAny && !waitKey.equals(key))) return;
        a.handler.removeCallbacks(linkTimeout);
        JSONObject ej = o.optJSONObject("entry");
        if (ej == null || o.has("error")) { linkGone(key); return; }
        try { ready = PlayerActivity.Entry.from(ej); } catch (Exception x) { linkGone(key); return; }
        if (ready.copyKey.isEmpty()) ready.copyKey = key;
        if (ready.label.isEmpty()) ready.label = labelOf(key);
        waitKey = null;
        // a speed answer: the card names the copy now
        if (card != null && cardNext != null && nextLabel.isEmpty()) fillNext(ready);
        Runnable r = onLink;
        if (r != null && card == null) { onLink = null; r.run(); }
        else if (r != null && cardDue) { onLink = null; r.run(); }
    }
    private String sourceOf(String key) { for (JSONObject o : chain) if (o.optString("key").equals(key)) return sourceName(o); return "its add-on"; }
    private String labelOf(String key) { for (JSONObject o : chain) if (o.optString("key").equals(key)) return o.optString("label"); return ""; }
    private void linkGone(String key) {
        if (waitKey == null) return;
        waitKey = null;
        if (key != null && !key.isEmpty()) tried.put(key, "failed");
        Runnable then = onLink;
        onLink = null;
        if (askOnly) { a.showText("That copy has gone from " + sourceOf(key), 4000); return; }
        JSONObject next = pickNext(false);
        if (next == null || then == null) { chooseCard("That copy didn't play", "", startMs); return; }
        ask(next.optString("key"), false, then);
    }
    /** Plays the copy that arrived, at. */
    private void start(long at) {
        PlayerActivity.Entry e = ready;
        ready = null;
        if (e == null) return;
        closeCard();
        copyStarted();
        a.switchCopy(e, at);
    }

    // ---------- the cards (player-source-failed, player-not-ready) ----------

    private TextView cardNext, cardSub;
    private Ui.Ring ring;
    private boolean cardDue;
    private String nextFmt = "";
    private void showCard(String title, String line, JSONObject next, long at, String fmt, String sub, long ms) {
        closeCard();
        a.hideDiagCard();
        nextStartMs = at;
        nextFmt = fmt;
        Card c = new Card(a, 560, 96, false);
        c.text(title, line);
        LinearLayout box = new LinearLayout(a);
        box.setGravity(Gravity.CENTER_VERTICAL);
        box.setBackground(Ui.round(Ui.S1, 12));
        box.setPadding(Ui.dp(14), Ui.dp(10), Ui.dp(14), Ui.dp(10));
        ring = new Ui.Ring(a);
        LinearLayout.LayoutParams rl = new LinearLayout.LayoutParams(Ui.dp(36), Ui.dp(36));
        rl.setMarginEnd(Ui.dp(12));
        box.addView(ring, rl);
        LinearLayout col = new LinearLayout(a);
        col.setOrientation(LinearLayout.VERTICAL);
        cardNext = Ui.line(a, "", 16, Ui.T1, Ui.inter650);
        cardSub = Ui.line(a, sub, 14, Ui.T2, Ui.inter500);
        col.addView(cardNext);
        col.addView(cardSub);
        box.addView(col, new LinearLayout.LayoutParams(0, -2, 1));
        c.extra(box);
        c.button("Play it now", "play", true, this::playNow);
        c.button("Choose another", null, false, () -> chooseCard(title, line, at));
        c.focusButton(0);
        c.onBack = a::finish;
        c.backLabel = "Stop";
        card = c;
        cardDue = false;
        if (next != null) { nextLabel = label(next); ask(next.optString("key"), false, () -> start(at)); }
        else { nextLabel = ""; ask(null, true, () -> start(at)); }
        a.show(c);
        long until = SystemClock.uptimeMillis() + ms;
        cardTick = new Runnable() {
            @Override public void run() {
                if (card != c) return;
                long left = until - SystemClock.uptimeMillis();
                int s = (int) Math.max(0, (left + 999) / 1000);
                ring.set(Math.max(0, Math.min(1, left / (float) ms)), s);
                if (!nextLabel.isEmpty()) cardNext.setText(String.format(Locale.ROOT, nextFmt, Math.max(1, s)) + nextLabel);
                else cardNext.setText("Finding a copy that fits…");
                if (left <= 0) { playNow(); return; }
                a.handler.postDelayed(this, 200);
            }
        };
        a.handler.post(cardTick);
    }
    private String nextLabel = "";
    private void fillNext(PlayerActivity.Entry e) {
        nextLabel = e.label.isEmpty() ? "another copy" : e.label;
        cardSub.setText(sourceName(e) + " · starts at " + clock(nextStartMs));
    }
    private void playNow() {
        if (cardTick != null) a.handler.removeCallbacks(cardTick);
        cardDue = true;
        if (ready != null) { Runnable r = onLink; onLink = null; if (r != null) r.run(); else start(nextStartMs); return; }
        if (cardNext != null) cardNext.setText("Getting its link…");
        if (ring != null) ring.set(0, 0);
    }
    /** Choose another (and after 3 automatic hand-overs): the copies left, best first. */
    private void chooseCard(String title, String line, long at) {
        closeCard();
        a.hideDiagCard();
        waitKey = null;
        a.handler.removeCallbacks(linkTimeout);
        a.releasePlayback();
        List<JSONObject> l = left();
        Card c = new Card(a, 560, 96, false);
        c.text(title, l.isEmpty() ? "No other copy is left to try." : line);
        for (JSONObject o : l.subList(0, Math.min(4, l.size()))) {
            ListPanel.Item it = new ListPanel.Item(label(o));
            it.sub = sourceName(o) + " · starts at " + clock(at);
            it.icon = "quality";
            it.height = 52;
            String k = o.optString("key");
            it.ok = () -> { cardDue = true; a.showText("Getting its link…", 3000); ask(k, false, () -> start(at)); };
            c.row(it);
        }
        if (l.isEmpty()) c.button("Close", null, true, a::finish);
        c.note("Back stops");
        c.onBack = a::finish;
        c.backLabel = "Stop";
        card = c;
        cardNext = null;
        a.show(c);
    }
    private void closeCard() {
        if (cardTick != null) { a.handler.removeCallbacks(cardTick); cardTick = null; }
        Card c = card;
        card = null;
        cardNext = null;
        if (c != null && a.isOpen(c)) a.closeOverlay();
    }
    void cardClosed(Overlay o) { if (o == card) { card = null; if (cardTick != null) { a.handler.removeCallbacks(cardTick); cardTick = null; } } }
    boolean cardUp() { return card != null; }

    static String clock(long ms) {
        long s = Math.max(0, ms / 1000);
        return s >= 3600 ? String.format(Locale.ROOT, "%d:%02d:%02d", s / 3600, s / 60 % 60, s % 60) : String.format(Locale.ROOT, "%d:%02d", s / 60, s % 60);
    }

    // ---------- Options > Quality (SPEC 8.5, player-sources) ----------

    /** The copies of this film, best first: Always the best copy, the one playing (its tick once it played), the others,
     * and the failed or not-ready ones last and dimmed. Picking one asks for its link and switches where you are. */
    void qualityRows(List<ListPanel.Item> items, Runnable closeQuality) {
        String now = playingKey();
        JSONObject best = chain.isEmpty() ? null : chain.get(0);
        if (best != null) {
            ListPanel.Item b = new ListPanel.Item("Always the best copy");
            b.radio = true;
            b.radioOn = !chosen && now.equals(bestKey);
            b.sub = "Now: " + label(best) + " · " + sourceName(best);
            b.height = 50;
            b.ok = () -> { closeQuality.run(); chosen = false; if (!now.equals(bestKey)) switchHere(bestKey); };
            items.add(b);
        }
        items.add(ListPanel.Item.heading("Copies · best first"));
        List<ListPanel.Item> last = new ArrayList<>();
        for (JSONObject o : chain) {
            String k = o.optString("key");
            boolean playing = k.equals(now);
            String t = tried.get(k);
            ListPanel.Item it = new ListPanel.Item(label(o));
            it.radio = true;
            it.radioOn = chosen && playing;
            it.tickA = playing && frames && !notReady;
            it.height = 50;
            it.sub = sourceName(o) + (playing ? " · playing" : "notready".equals(t) ? " · wasn't ready yet" : t != null ? " · didn't play on this TV" : "");
            if (t != null && !playing) { it.disabled = true; last.add(it); continue; }
            it.ok = playing ? closeQuality : () -> { closeQuality.run(); chosen = true; switchHere(k); };
            items.add(it);
        }
        items.addAll(last);
    }
    private void switchHere(String key) {
        long at = Math.max(0, a.positionMs());
        a.showText("Getting that copy…", 3000);
        ask(key, false, () -> { a.releasePlayback(); start(at); }, true);
    }

    // ---------- Up next keeps the source (SPEC 8.4) ----------

    /** 2 minutes before the end of an add-on episode: the app answers with queue-next. */
    void tick(long pos, long dur) {
        decide();
        PlayerActivity.Entry e = a.entryNow();
        if (e == null || nextAsked || !e.addon() || !e.id.startsWith("episode:") || dur <= 0 || notReady || a.hasNext()) return;
        if (dur - pos > 120000 || dur - pos <= 0) return;
        nextAsked = true;
        JSObject ev = a.event("need");
        ev.put("what", "next");
        ev.put("binge", e.binge);
        TunerPlayerPlugin.emit(ev);
    }

    /** For the emulator test: what the copies are doing (never a link or a header's value). */
    String describe() {
        PlayerActivity.Entry e = a.entryNow();
        StringBuilder b = new StringBuilder();
        b.append("key=").append(e == null ? "" : e.copyKey).append(" source=").append(e == null ? "" : e.source)
                .append(" kind=").append(e == null ? "" : e.sourceKind).append(" copies=").append(chain.size())
                .append(" tried=").append(tried.size()).append(" auto=").append(auto).append(" notReady=").append(notReady)
                .append(" decided=").append(decided).append(" frames=").append(frames).append(" card=").append(card != null)
                .append(" headers=").append(e == null || e.headers == null ? "" : android.text.TextUtils.join(",", e.headers.keySet()));
        return b.toString();
    }
}
