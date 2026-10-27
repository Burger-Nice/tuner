package app.tuner.player;

import android.content.SharedPreferences;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.media3.common.C;
import androidx.media3.common.PlaybackException;
import androidx.media3.exoplayer.ExoPlayer;

import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * A replay (design/ui-v1/catchup/SPEC.md 6, the protocol in design/ui-v1/catchup/PORT-NATIVE.md): a game from a channel's
 * archive, a game's full video from Movies, or a kept programme. It plays positions inside a window the app chose, with
 * the app's links (it never builds one), and it is the timeline's model.
 * <p>
 * The shield (7.1): the bar is the window, fixed, whatever the game does; a hidden game shows no remaining time, no end
 * mark and no OT tick until the as-aired answers have one; chapter displays come from those answers (90 s behind the
 * picture), the skip button from the played position; nothing changes when the app marks the game seen.
 * <p>
 * Seeking (6.5): taps coalesce into one seek 600 ms after the last press; a seek inside what's buffered stays local; a
 * .m3u8 (or a video) seeks inside its one link; a .ts link is minute-granular, so a seek asks the app for a link from that
 * minute (up to 59 s early) after the old stream has been released.
 */
final class Replay implements Timeline.Model {
    static final class Source {
        String id = "", kind = "channel", name = "", detail = "", badge = "", chId = "", chName = "";
        JSONArray links = new JSONArray();
        long windowStart, windowMs;
        int delay, days;
    }

    private final PlayerActivity a;
    private final ExoPlayer p;
    private final SharedPreferences prefs;
    final String id, kind, title, sub, gameId;
    final boolean hidden;
    final long barMs, margin;
    private long windowMs, tipoffAt, startAt;
    private final int extensions;
    final List<Source> sources = new ArrayList<>();
    int si, li;
    private List<Timeline.Mark> chapters = new ArrayList<>();   // Tip-off to Q4, drawn ahead (never OT, M7)
    private final List<Timeline.Mark> aired = new ArrayList<>(); // what the as-aired answers have reached (OT once played)
    final JSONObject live, programme;
    private JSONObject check;
    private final boolean firstSeenNote;

    // the media
    private long offset;        // where the playing link starts, in the window
    private long target = -1;   // a seek on its way: the thumb shows it
    private boolean opening, waitingLinks, waitingExt, ended, checking;
    private long pendingFrom = -1, openedAt, lastReopen, duration, played;
    private String playingUrl = "";
    private int posTick, extCount, limitTries, checkStep, checkLi;
    private final Set<Integer> failed = new HashSet<>();
    private String gameClock = "";
    private boolean gameBefore;
    private Card card;   // the card this replay has up (null when none)
    private Runnable cardTick;

    Replay(PlayerActivity a, ExoPlayer p, JSONObject R, SharedPreferences prefs) throws JSONException {
        this.a = a;
        this.p = p;
        this.prefs = prefs;
        id = R.optString("id");
        kind = R.optString("kind", "game");
        title = R.optString("title");
        sub = R.optString("sub");
        gameId = R.optString("gameId", "");
        hidden = R.optBoolean("hidden");
        barMs = Math.max(60000, R.optLong("windowMs", 3 * 3600000L + 1800000L));
        windowMs = barMs;
        tipoffAt = R.optLong("tipoffAt", 0);
        startAt = Math.max(0, R.optLong("startAt", 0));
        margin = R.optLong("margin", 90000);
        extensions = R.optInt("extensions", 0);
        live = R.optJSONObject("live");
        programme = R.optJSONObject("programme");
        check = R.optJSONObject("check");
        JSONArray ss = R.optJSONArray("sources");
        for (int i = 0; ss != null && i < ss.length(); i++) sources.add(source(ss.getJSONObject(i)));
        if (sources.isEmpty()) throw new JSONException("A replay with no source");
        si = Math.max(0, Math.min(sources.size() - 1, R.optInt("source", 0)));
        chapters = marks(R.optJSONArray("chapters"), false);
        firstSeenNote = !prefs.getBoolean("rpSeenNote", false);
    }
    private static Source source(JSONObject o) {
        Source s = new Source();
        s.id = o.optString("id");
        s.kind = o.optString("kind", "channel");
        s.name = o.optString("name");
        s.detail = o.optString("detail");
        s.badge = o.optString("badge");
        s.chId = o.optString("chId");
        JSONObject ch = o.optJSONObject("channel");
        s.chName = ch == null ? s.name : ch.optString("name", s.name);
        JSONArray l = o.optJSONArray("links");
        if (l != null) s.links = l;
        s.windowStart = o.optLong("windowStart", 0);
        s.windowMs = o.optLong("windowMs", 0);
        s.delay = o.optInt("delay", 0);
        s.days = o.optInt("days", 0);
        return s;
    }
    private static List<Timeline.Mark> marks(JSONArray a, boolean otOnly) {
        List<Timeline.Mark> out = new ArrayList<>();
        for (int i = 0; a != null && i < a.length(); i++) {
            JSONObject c = a.optJSONObject(i);
            if (c == null) continue;
            String k = c.optString("key");
            if (otOnly != k.startsWith("ot")) continue;
            out.add(new Timeline.Mark(k, c.optString("label"), c.optLong("at")));
        }
        return out;
    }

    Source src() { return sources.get(si); }
    boolean isVideo() { return "video".equals(src().kind); }
    /** A game on a channel's archive: quarter ticks, the skip button, Back to live, the as-aired panel. */
    boolean gameOnChannel() { return !gameId.isEmpty() && !isVideo(); }
    boolean isGame() { return !gameId.isEmpty(); }
    boolean isProgramme() { return gameId.isEmpty(); }
    /** A programme still on now (rewound live TV, 6.8): Back to live and the live point, not Next programme. */
    private boolean onNow() { return isProgramme() && programme != null && programme.optLong("end") > System.currentTimeMillis(); }
    private long progLen() { long s = programme == null ? 0 : programme.optLong("start"), e = programme == null ? 0 : programme.optLong("end"); return e > s ? e - s : windowMs; }
    /** What the diagnosis calls it: "this replay", "this video". */
    String what() { return isVideo() ? "video" : "replay"; }
    String name() { Source s = src(); return isVideo() ? s.name : s.chName + "'s replay"; }
    String pictureId() { return isVideo() ? id : src().chId.isEmpty() ? id : src().chId; }

    // ---------- starting ----------
    void start() {
        played = startAt;
        if (check != null) { runCheck(0); return; }
        openAt(startAt);
        a.showTimeline();
    }

    /** The link to play now: [url, engine], or null when the source has no more. */
    private String[] link(int k) {
        JSONArray l = src().links;
        JSONObject o = k < l.length() ? l.optJSONObject(k) : null;
        return o == null ? null : new String[] { o.optString("url"), o.optString("engine") };
    }
    private static boolean whole(String[] l, boolean video) {
        if (video || "native".equals(l[1]) || "hls".equals(l[1])) return true;
        String u = l[0].toLowerCase(java.util.Locale.ROOT).split("\\?")[0];
        return u.endsWith(".m3u8") || u.endsWith(".mp4") || u.endsWith(".mkv");
    }

    /** Plays the window from t (ms into it): inside the playing link when it can, else a new one. */
    private void openAt(long t) {
        t = Math.max(0, t);
        String[] l = link(li);
        if (l == null || l[0].isEmpty()) { linkFailed(0, "error"); return; }
        if (whole(l, isVideo())) {
            boolean same = !opening && p.isCurrentMediaItemSeekable() && (l[0].equals(playingUrl) || offset > 0 && !fromUrl.isEmpty() && fromUrl.equals(playingUrl));
            long dur = p.getDuration();
            boolean known = dur != C.TIME_UNSET && dur > 0;
            if (same && t >= offset && (!known || t - offset < dur - 1000)) { localSeek(t); return; }
            // a link that doesn't reach that far (an archive playlist shorter than the window): the rest from that minute
            if (same && known && t - offset >= dur - 1000 && !isVideo() && minuteFrom(t) > offset) { askFrom(t); return; }
            play(l[0], 0, t);
            return;
        }
        // .ts / timeshift.php: minute-granular; a seek inside what it has stays local, otherwise a link from the minute
        long from = minuteFrom(t);
        boolean same = !opening && l[0].equals(playingUrl);
        if (same && t >= offset && p.isCurrentMediaItemSeekable() && t - offset <= Math.max(p.getBufferedPosition(), p.getDuration() == C.TIME_UNSET ? 0 : p.getDuration())) { localSeek(t); return; }
        // (a few seconds on, inside the minute this link already plays: an unseekable stream can't, and a new link from the
        // minute would go back)
        if (same && from <= offset + p.getCurrentPosition() && t >= offset + p.getCurrentPosition()) { target = -1; tlChanged(); return; }
        if (from <= 0) { play(l[0], 0, 0); return; }
        askFrom(t);
    }
    /** Asks the app for the window's links from the minute t falls in (the old stream goes first). */
    private void askFrom(long t) {
        long from = minuteFrom(t);
        a.releaseStream();
        playingUrl = "";
        opening = true;
        pendingFrom = from;
        target = t;
        openedAt = SystemClock.uptimeMillis();
        a.spinnerSoon();
        JSObject e = a.event("need");
        e.put("what", "links");
        e.put("source", si);
        e.put("at", from);
        e.put("link", li);
        TunerPlayerPlugin.emit(e);
    }
    private String fromUrl = "";
    private boolean waitingNet;
    /** The network is back (2 s after it validated): the same place again, on the same link. */
    void netBack() {
        if (!waitingNet) return;
        waitingNet = false;
        opening = false;
        playingUrl = "";
        openAt(target >= 0 ? target : played);
    }   // the link from a minute that plays now (offset > 0)
    /** The start of the minute t falls in, as a window position (the archive's links start on whole minutes). */
    private long minuteFrom(long t) {
        long ws = src().windowStart;
        if (ws <= 0) return (t / 60000) * 60000;
        return Math.max(0, ((ws + t) / 60000) * 60000 - ws);
    }
    private void localSeek(long t) {
        p.seekTo(Math.max(0, t - offset));
        target = -1;
        posAfterSeek = true;
        tlChanged();
    }
    private boolean posAfterSeek;
    /** A new link: the old stream goes first, then this one is asked for. */
    private void play(String url, long from, long at) {
        a.releaseStream();
        offset = from;
        playingUrl = url;
        if (from == 0) fromUrl = "";
        opening = true;
        openTarget = at;
        target = at;
        openedAt = SystemClock.uptimeMillis();
        a.setStream(url, Math.max(0, at - from));
        a.spinnerSoon();
        tlChanged();
    }

    // ---------- what the player reports ----------
    /** The played position (ms into the window): where the picture is, never the thumb, and while a link opens the last
     * place it played (a scrub never counts as played, M7). */
    long played() {
        if (opening || waitingLinks || checking) return Math.max(0, played);
        return Math.max(0, offset + p.getCurrentPosition());
    }
    void ready() {
        if (opening) { opening = false; target = -1; posAfterSeek = true; played = played(); }
        a.spinnerGone();
        limitTries = 0;
        if (card != null && card.kind == Card.KIND_LIMIT) closeCard();
        if (isVideo()) { long d = p.getDuration(); if (d != C.TIME_UNSET && d > 0) duration = d; }
        if (checking) { a.handler.removeCallbacks(checkPause); a.handler.postDelayed(checkPause, check == null ? 10000 : check.optLong("playMs", 10000)); }
        if (posAfterSeek && !checking) { posAfterSeek = false; emitPosition(); }
        tlChanged();
    }
    private final Runnable checkPause = this::pauseCheck;
    private void pauseCheck() { if (checking) p.pause(); }
    /** The 1 s tick. */
    void tick() {
        if (opening || checking || waitingLinks) return;
        played = played();
        if (p.isPlaying() && ++posTick % 2 == 0) emitPosition();
        if (isGame() && !waitingExt && !ended && played >= windowMs - 1500) windowEnded();
        if (isProgramme() && !onNow() && programme != null && programme.optJSONObject("next") != null) {
            long left = progLen() - played;
            if (left <= 10000 && left > 0 && p.isPlaying()) upNext(); else a.upNextCardGone();
        }
    }
    private void emitPosition() {
        JSObject e = a.event("position");
        e.put("played", played());
        e.put("source", si);
        if (isVideo() && duration > 0) e.put("duration", duration);
        TunerPlayerPlugin.emit(e);
    }
    private long openTarget;
    void onEnded() {
        if (checking) { p.pause(); return; }
        long d = p.getDuration(), end = offset + (d != C.TIME_UNSET && d > 0 ? d : p.getCurrentPosition());
        long want = Math.max(openTarget, end);   // where it should go on from: what the link was asked for, or its end
        played = Math.min(want, Math.max(played(), end));
        if (isVideo()) { showEnded(false); return; }
        long lp = livePos();
        // the link ended before the window did, and well before the live point: the rest from that minute (an archive
        // playlist can be shorter than what was asked; a .ts link may close)
        boolean early = want < windowMs - 60000 && (lp < 0 || want < lp - 120000) && !(isProgramme() && want >= progLen() - 30000);
        if (early && minuteFrom(want) > offset) { askFrom(want); return; }
        if (isProgramme() && !onNow()) { a.finish(); return; }
        if (lp >= 0) {   // caught up with what the archive had when the link was asked for: ask again from here
            long now = SystemClock.uptimeMillis();
            if (now - lastReopen < 20000) { atLive(); return; }
            lastReopen = now;
            li = 0;
            play(link(0)[0], 0, played);
            return;
        }
        windowEnded();
    }
    /** The window ran out before the buzzer: the app may give it another 60 min (up to twice), else Replay ended. */
    private void windowEnded() {
        if (waitingExt || ended) return;
        if (extensions <= 0 || extCount >= extensions) { showEnded(false); return; }
        waitingExt = true;
        JSObject e = a.event("need");
        e.put("what", "extend");
        e.put("source", si);
        e.put("count", extCount);
        e.put("played", played);
        TunerPlayerPlugin.emit(e);
        a.handler.postDelayed(() -> { if (waitingExt) { waitingExt = false; showEnded(false); } }, 8000);
    }

    // ---------- errors (6.7) ----------
    void error(PlaybackException e) {
        a.classifyError(e);
        int http = a.httpCode();
        if (checking) { checkLi++; playCheck(); return; }
        if (waitingLinks) return;
        if (!a.online()) { waitingNet = true; a.showOffline(); return; }   // the network went: the same link once it's back
        if (a.limitAnswer() && limitTries < 3) { connLimit(); return; }
        long t = target >= 0 ? target : played;
        if ((http == 404 || http == 410) && !isVideo() && src().windowStart > 0 && System.currentTimeMillis() - (src().windowStart + t) < 10 * 60000) {
            notReady();
            return;
        }
        String reason = http > 0 ? "http-" + http : a.timedOut() ? "timeout" : a.decoderFault() ? "decoder" : "error";
        li++;
        if (link(li) != null) { opening = false; openAt(t); return; }
        linkFailed(http, reason);
    }
    private void linkFailed(int http, String reason) {
        a.spinnerGone();
        JSObject ev = a.event("source-failed");
        ev.put("source", si);
        ev.put("code", http);
        ev.put("reason", reason);
        TunerPlayerPlugin.emit(ev);
        failed.add(si);
        showSourceFailed();
    }
    private int nextSource() {
        for (int k = 1; k < sources.size(); k++) { int n = (si + k) % sources.size(); if (!failed.contains(n)) return n; }
        return -1;
    }

    // ---------- the cards ----------
    private Card newCard(int kind, int width, int bottom, boolean centred) {
        closeCard();
        Card c = new Card(a, width, bottom, centred);
        c.kind = kind;
        card = c;
        return c;
    }
    void closeCard() {
        if (cardTick != null) { a.handler.removeCallbacks(cardTick); cardTick = null; }
        Card c = card;
        card = null;
        if (c != null && a.isOpen(c)) { a.closeOverlay(); if (!checking) a.showTimeline(); }
    }
    void cardClosed(Overlay o) { if (o == card) { card = null; if (cardTick != null) { a.handler.removeCallbacks(cardTick); cardTick = null; } } }
    private void exitThen(String then) { a.exitThen = then; a.finish(); }

    private void showSourceFailed() {
        int n = nextSource();
        Card c;
        if (n >= 0) {
            Source s = src(), x = sources.get(n);
            c = newCard(Card.KIND_FAILED, 500, 96, false);
            c.text(isVideo() ? "The video didn't start" : "This replay didn't start", isVideo() ? Diag.clean(s.name) + " didn't start." : Diag.clean(s.chName) + "'s replay didn't start.");
            ListPanel.Item it = new ListPanel.Item(x.name);
            it.sub = x.detail;
            it.icon = "video".equals(x.kind) ? "frames" : "hist";
            it.badge = x.badge.isEmpty() ? null : x.badge;
            it.height = 56;
            it.ok = () -> { closeCard(); pickSource(n); };
            c.row(it);
            c.button("Try again", null, false, () -> { closeCard(); failed.remove(si); li = 0; opening = false; openAt(target >= 0 ? target : played); });
            c.note("Back closes");
            c.focus(0);
        } else {
            c = newCard(Card.KIND_FAILED, 500, 96, false);
            if (isGame()) {
                c.text(title + " didn't start from any source", null);
                c.button("Choose a video", null, true, () -> exitThen("choose-video"));
                c.button("Game page", null, false, () -> exitThen("game-page"));
            } else {
                c.text(title + " didn't start", Diag.clean(src().chName) + "'s replay didn't start.");
                c.button("Try again", "refresh", true, () -> { closeCard(); failed.clear(); li = 0; opening = false; openAt(target >= 0 ? target : played); });
            }
            c.note("Back closes");
            c.focusButton(0);
        }
        c.onBack = a::finish;
        c.backLabel = "Close";
        a.show(c);
    }
    /** "Your provider allows 1 stream": tries again by itself every 5 s, three times (6.5). */
    private void connLimit() {
        a.spinnerGone();
        JSObject ev = a.event("conn-limit");
        ev.put("source", si);
        TunerPlayerPlugin.emit(ev);
        a.checkAccount();
        int max = a.maxStreams();
        Card c = newCard(Card.KIND_LIMIT, 500, 96, false);
        String t = max > 0 ? "Your provider allows " + max + " stream" + (max == 1 ? "" : "s") : "Your provider's stream limit is reached";
        final long[] at = { SystemClock.uptimeMillis() + 5000 };
        c.text(t, "Close it on your other devices, or wait a few seconds. Trying again in 5 s.");
        c.button("Try again now", "refresh", true, this::retryLimit);
        c.note("Back closes");
        c.focusButton(0);
        c.onBack = a::finish;
        a.show(c);
        cardTick = new Runnable() {
            @Override public void run() {
                if (card != c) return;
                long left = at[0] - SystemClock.uptimeMillis();
                int mx = a.maxStreams();
                if (mx > 0) c.title.setText("Your provider allows " + mx + " stream" + (mx == 1 ? "" : "s"));
                if (left <= 0) { retryLimit(); return; }
                c.line.setText("Close it on your other devices, or wait a few seconds. Trying again in " + (left + 999) / 1000 + " s.");
                a.handler.postDelayed(this, 250);
            }
        };
        a.handler.postDelayed(cardTick, 250);
    }
    private void retryLimit() {
        limitTries++;
        closeCard();
        opening = false;
        long t = target >= 0 ? target : played;
        playingUrl = "";
        openAt(t);
    }
    /** "The last few minutes aren't in the replay yet": a rewind or From tip-off near now, and the archive says 404. */
    private void notReady() {
        a.spinnerGone();
        JSObject ev = a.event("source-failed");
        ev.put("source", si);
        ev.put("code", 404);
        ev.put("reason", "http-404");
        TunerPlayerPlugin.emit(ev);
        Card c = newCard(Card.KIND_FAILED, 500, 96, false);
        c.text("The last few minutes aren't in the replay yet", "Your provider adds them to the replay a little behind live.");
        if (live != null) c.button("Back to live", null, true, () -> { closeCard(); goLive(); });
        c.button("Try again in a minute", null, live == null, () -> {
            closeCard();
            a.showText("Trying again in a minute", 3000);
            a.handler.postDelayed(() -> { if (!a.isFinishing()) { li = 0; opening = false; playingUrl = ""; openAt(target >= 0 ? target : played); } }, 60000);
        });
        c.focusButton(0);
        c.onBack = a::finish;
        a.show(c);
    }
    /** Replay ended (6.7): at the window's end once the buzzer has played, or after the silent extensions. */
    private void showEnded(boolean seen) {
        ended = true;
        p.pause();
        a.spinnerGone();
        Card c = newCard(Card.KIND_ENDED, 500, 96, false);
        c.text("Replay ended", title);
        if (isGame()) {
            c.button("Box score", null, true, () -> exitThen("game-page"));
            if (seen || !hidden) c.button("Watch again", null, false, this::watchAgain);
            else c.button("Reveal " + title, null, false, () -> { JSObject e = a.event("reveal"); e.put("gameId", gameId); TunerPlayerPlugin.emit(e); exitThen("game-page"); });
            if (!(seen || !hidden)) c.button("Watch again", null, false, this::watchAgain);
        } else c.button("Watch again", null, true, this::watchAgain);
        c.focusButton(0);
        c.onBack = a::finish;
        a.show(c);
    }
    private void watchAgain() {
        closeCard();
        ended = false;
        waitingExt = false;
        seekTo(isVideo() ? 0 : tipoffAt);
        p.play();
    }
    /** Up next, the last 10 s of a kept programme (titles come from the app, through its telling() mask). */
    private void upNext() {
        JSONObject n = programme.optJSONObject("next");
        if (n == null) return;
        a.upNextCard("Next on " + Diag.clean(src().chName), (n.optLong("start") > 0 ? PlayerActivity.hm(n.optLong("start")) + " " : "") + n.optString("title"));
    }

    // ---------- Back to live (6.7, S1) ----------
    void backToLive() {
        if (live == null) return;
        if (!hidden) { goLive(); return; }
        Card c = newCard(Card.KIND_GOLIVE, 500, 96, true);
        c.text("Going live may show the score", Diag.clean(live.optString("name")) + " is live now. Your replay stays where you left it.");
        c.button("Stay in the replay", null, true, this::closeCard);
        c.button("Go live", null, false, () -> { closeCard(); goLive(); });
        c.focusButton(0);
        c.onBack = this::closeCard;
        c.backLabel = "Stay";
        a.show(c);
    }
    private void goLive() {
        if (live == null) return;
        emitPosition();
        JSObject e = a.event("golive");
        e.put("chId", live.optString("id"));
        TunerPlayerPlugin.emit(e);
        PlayerActivity.replayLeftAt = SystemClock.uptimeMillis();
        a.spinnerSoon();
    }

    // ---------- the first-replay check (6.6, M1) ----------
    private void runCheck(int step) { checkStep = step; checkLi = 0; checking = true; playCheck(); showCheck(); }
    private JSONArray checkLinks() {
        JSONObject tries = check == null ? null : check.optJSONObject("tries");
        return tries == null ? null : tries.optJSONArray(checkStep == 0 ? "0" : checkStep == 1 ? "-1" : "1");
    }
    private void playCheck() {
        JSONArray l = checkLinks();
        JSONObject o = l == null || checkLi >= l.length() ? null : l.optJSONObject(checkLi);
        if (o == null) { checkAnswer(null); return; }   // nothing to look at: the check can't tell, so it stores nothing
        play(o.optString("url"), 0, 0);
    }
    private void showCheck() {
        String t = check.optString("title");
        Card c = newCard(Card.KIND_CHECK, 640, 64, false);
        if (checkStep == 0) c.text("Is this " + t + "?", "airglow is playing 10 s of it to check your provider's replays line up. You'll see this once.");
        else c.text("Is it " + t + " now?", "Playing 10 s from an hour " + (checkStep == 1 ? "earlier" : "later") + " on " + Diag.clean(check.optString("channel")) + ".");
        c.extra(programmeBlock());
        c.button("Yes, that's it", null, true, () -> checkAnswer(checkStep == 0 ? 0 : checkStep == 1 ? -1 : 1));
        if (checkStep == 0) c.button("No, it's something else", null, false, () -> runCheck(1));
        else if (checkStep == 1) c.button("Try an hour later", null, false, () -> runCheck(2));
        else c.button("No, it's something else", null, false, () -> checkAnswer(null));
        c.button("Not sure", null, false, () -> checkAnswer(null));
        c.focusButton(0);
        c.onBack = () -> checkAnswer(null);
        c.backLabel = "Not sure";
        a.show(c);
    }
    private View programmeBlock() {
        LinearLayout row = new LinearLayout(a);
        row.setGravity(Gravity.CENTER_VERTICAL);
        FrameLayout art = new FrameLayout(a);
        art.setBackground(Ui.round(Ui.S2, 8));
        art.setClipToOutline(true);
        TextView ini = Ui.text(a, Ui.initials(check.optString("channel")), 22, Ui.T2, Ui.outfit700);
        ini.setGravity(Gravity.CENTER);
        art.addView(ini, new FrameLayout.LayoutParams(-1, -1));
        ImageView img = new ImageView(a);
        img.setScaleType(ImageView.ScaleType.FIT_CENTER);
        img.setPadding(Ui.dp(14), Ui.dp(10), Ui.dp(14), Ui.dp(10));
        art.addView(img, new FrameLayout.LayoutParams(-1, -1));
        Images.load(check.optString("logo"), img, Ui.dp(160));
        LinearLayout.LayoutParams al = new LinearLayout.LayoutParams(Ui.dp(160), Ui.dp(90));
        al.setMarginEnd(Ui.dp(16));
        row.addView(art, al);
        LinearLayout col = new LinearLayout(a);
        col.setOrientation(LinearLayout.VERTICAL);
        TextView t = Ui.line(a, check.optString("title"), 20, Ui.T1, Ui.outfit700);
        Ui.lineHeight(t, 26);
        TextView l = Ui.line(a, check.optString("line"), 15, Ui.T2, Ui.inter500);
        TextView d = Ui.line(a, check.optString("desc"), 15, Ui.T2, Ui.inter500);
        col.addView(t);
        LinearLayout.LayoutParams ll = new LinearLayout.LayoutParams(-1, -2);
        ll.topMargin = Ui.dp(2);
        col.addView(l, ll);
        LinearLayout.LayoutParams dl = new LinearLayout.LayoutParams(-1, -2);
        dl.topMargin = Ui.dp(4);
        col.addView(d, dl);
        row.addView(col, new LinearLayout.LayoutParams(0, -2, 1));
        return row;
    }
    private void checkAnswer(Integer shift) {
        if (!checking) return;
        checking = false;
        a.handler.removeCallbacks(checkPause);
        closeCard();
        a.releaseStream();
        playingUrl = "";
        JSObject e = a.event("check-answer");
        e.put("shift", shift == null ? JSONObject.NULL : shift);
        TunerPlayerPlugin.emit(e);
        check = null;
        waitingLinks = true;
        p.setPlayWhenReady(true);
        played = startAt;
        a.spinnerSoon();
        // the app answers with the source's links (replay-links); if it doesn't, the game plays with what it has
        a.handler.postDelayed(() -> { if (waitingLinks) { waitingLinks = false; li = 0; openAt(startAt); a.showTimeline(); } }, 6000);
    }

    // ---------- the app's commands ----------
    void game(JSONObject g) {
        if (g == null) return;
        List<Timeline.Mark> ot = marks(g.optJSONArray("chapters"), true), all = marks(g.optJSONArray("chapters"), false);
        aired.clear();
        aired.addAll(all);
        aired.addAll(ot);
        java.util.Collections.sort(aired, (x, y) -> Long.compare(x.at, y.at));
        gameClock = g.optString("clock");
        gameBefore = "Before tip-off".equals(g.optString("moment")) || aired.isEmpty();
        tlChanged();
    }
    /** replay-links: a source's new links (Not the game?, the check's answer, Sync, or a .ts link from a minute). */
    void links(JSONObject o) {
        int s = o.optInt("source", si);
        if (s < 0 || s >= sources.size()) return;
        Source x = sources.get(s);
        JSONArray l = o.optJSONArray("links");
        boolean from = o.has("from");
        if (from) {   // a .ts link from that minute, asked for by a seek
            if (s != si || pendingFrom < 0) return;
            long f = o.optLong("from");
            if (f != pendingFrom) return;
            pendingFrom = -1;
            JSONObject k = l == null ? null : l.optJSONObject(Math.min(li, l.length() - 1));
            if (k == null) { linkFailed(0, "error"); return; }
            fromUrl = k.optString("url");
            play(fromUrl, f, Math.max(f, target >= 0 ? target : f));
            return;
        }
        boolean keep = o.optBoolean("keepPosition");
        boolean sameLinks = l != null && l.toString().equals(x.links.toString()) && (!o.has("windowStart") || o.optLong("windowStart") == x.windowStart);
        if (l != null) x.links = l;
        if (o.has("windowStart")) x.windowStart = o.optLong("windowStart");
        long was = played();
        if (s == si) {
            if (o.has("tipoffAt")) tipoffAt = o.optLong("tipoffAt");
            if (o.has("chapters")) chapters = marks(o.optJSONArray("chapters"), false);
        }
        if (s != si && !waitingLinks) return;
        if (keep && sameLinks && !waitingLinks && !opening) { tlChanged(); return; }   // (Sync: only the chapters moved)
        boolean wasWaiting = waitingLinks;
        waitingLinks = false;
        li = 0;
        opening = false;
        playingUrl = "";
        openAt(keep ? was : tipoffAt);
        if (wasWaiting) a.showTimeline();
        tlChanged();
    }
    /** replay-extend: another 60 min on the same start (keep the position), or the end. */
    void extend(JSONObject o) {
        waitingExt = false;
        if (o.optBoolean("ended")) { showEnded(o.optBoolean("seen")); return; }
        int s = o.optInt("source", si);
        if (s != si) return;
        extCount++;
        windowMs = Math.max(windowMs, o.optLong("windowMs", windowMs));
        JSONArray l = o.optJSONArray("links");
        if (l != null) src().links = l;
        src().windowMs = windowMs;
        long t = played();
        li = 0;
        opening = false;
        playingUrl = "";
        openAt(t);
    }

    // ---------- choosing ----------
    void pickSource(int n) {
        if (n < 0 || n >= sources.size()) return;
        Source o = src(), x = sources.get(n);
        long t = played(), at;
        if ("channel".equals(o.kind) && "channel".equals(x.kind)) {
            // the same aired moment on the other channel; the chapters move with it
            long shift = (o.windowStart - x.windowStart) + (x.delay - o.delay) * 1000L;
            at = t + shift;
            List<Timeline.Mark> moved = new ArrayList<>();
            for (Timeline.Mark k : chapters) moved.add(new Timeline.Mark(k.key, k.label, k.at + shift));
            chapters = moved;
            tipoffAt += shift;
        } else at = "video".equals(x.kind) ? 0 : tipoffAt;
        si = n;
        li = 0;
        opening = false;
        playingUrl = "";
        ended = false;
        JSObject e = a.event("pick-source");
        e.put("source", n);
        TunerPlayerPlugin.emit(e);
        openAt(at);
        tlChanged();
    }
    void notTheGame(int hours) {
        JSObject e = a.event("not-the-game");
        e.put("source", si);
        e.put("hours", hours);
        TunerPlayerPlugin.emit(e);
        waitingLinks = true;
        a.showText(hours > 0 ? "Moving the replay 1 hour later…" : "Moving the replay 1 hour earlier…", 3000);
        a.handler.postDelayed(() -> waitingLinks = false, 8000);
    }
    void askClocks() {
        JSObject e = a.event("need");
        e.put("what", "clocks");
        e.put("played", played());
        e.put("seenAt", System.currentTimeMillis());
        TunerPlayerPlugin.emit(e);
    }

    // ---------- the timeline (6.2 to 6.4) ----------
    private void tlChanged() { a.timelineChanged(); }
    private long now() { return System.currentTimeMillis(); }

    @Override public long length() {
        if (isProgramme()) return progLen();
        if (isVideo()) return hidden || duration <= 0 ? barMs : duration;
        return barMs;
    }
    @Override public long shown() { return target >= 0 ? target : played(); }
    @Override public long livePos() {
        if (isVideo() || live == null) return -1;
        long ws = isProgramme() && programme != null ? programme.optLong("start") : src().windowStart;
        if (ws <= 0) return -1;
        long lp = now() - ws;
        return lp >= 0 && lp < length() ? lp : -1;
    }
    @Override public List<Timeline.Mark> ticks() {
        if (!gameOnChannel()) return new ArrayList<>();
        List<Timeline.Mark> out = new ArrayList<>(chapters);
        for (Timeline.Mark k : aired) if (k.key.startsWith("ot")) out.add(k);
        return out;
    }
    @Override public String current() {
        if (!gameOnChannel() || aired.isEmpty()) return null;
        return aired.get(aired.size() - 1).key;
    }
    @Override public String title() { return title; }
    @Override public String sub() {
        if (onNow() && !p.getPlayWhenReady()) return sub + " · paused";
        return sub;
    }
    private static String behind(long ms) {
        if (ms < 10 * 60000) { long s = Math.max(0, ms / 1000); return s / 60 + ":" + String.format(java.util.Locale.ROOT, "%02d", s % 60) + " behind live"; }
        return Math.round(ms / 60000.0) + " min behind live";
    }
    @Override public String line1() {
        long lp = livePos();
        if (lp >= 0) return behind(lp - shown());
        if (isProgramme()) { float sp = Math.max(0.25f, p.getPlaybackParameters().speed); return "Ends at " + PlayerActivity.hm(now() + (long) (Math.max(0, progLen() - shown()) / sp)); }
        return hidden ? "Score hidden" : "";
    }
    @Override public boolean line1Eye() { return hidden && livePos() < 0 && !isProgramme(); }
    /** Your position, from the last as-aired answer (never the live game's): "You're in Q1", "Halftime". */
    private String position() {
        if (gameClock.isEmpty() && aired.isEmpty()) return "";
        if ("Halftime".equals(gameClock)) return "Halftime";
        if (gameBefore) return "Before tip-off";
        Timeline.Mark k = aired.get(aired.size() - 1);
        return "You're in " + ("tip".equals(k.key) ? "Q1" : "half".equals(k.key) ? "Halftime" : k.label);
    }
    @Override public String line2() {
        if (isProgramme()) {
            if (onNow()) { int d = src().days; return d > 0 ? "Replays for " + d + " day" + (d == 1 ? "" : "s") + " on this channel" : ""; }
            JSONObject n = programme == null ? null : programme.optJSONObject("next");
            return n == null ? "" : "Next: " + n.optString("title");
        }
        if (isVideo()) return hidden ? "Seen at the end of the video" : "";
        if (livePos() < 0 && hidden) {
            if (firstSeenNote) prefs.edit().putBoolean("rpSeenNote", true).apply();
            return firstSeenNote ? "Seen at the final buzzer (the scores show then)" : "Seen at the final buzzer";
        }
        return position();
    }
    @Override public String leftEnd(long pos) {
        if (isProgramme()) return onNow() ? PlayerActivity.hm(programme.optLong("start")) : Timeline.clock(pos);
        if (isVideo()) return Timeline.clock(pos);
        return "";
    }
    @Override public String rightEnd(long pos) {
        if (isProgramme()) return onNow() ? PlayerActivity.hm(programme.optLong("end")) : "−" + Timeline.clock(Math.max(0, progLen() - pos));
        if (isVideo() && !hidden && duration > 0) return "−" + Timeline.clock(Math.max(0, duration - pos));
        return "";
    }
    @Override public boolean endHidden() { return hidden && (isVideo() || livePos() < 0) && !isProgramme(); }
    /** The chapter a position falls in, never past Q4 (M7): the ticks handed in never include OT. */
    private Timeline.Mark chapterOf(long pos) {
        Timeline.Mark c = null;
        for (Timeline.Mark k : chapters) if (k.at <= pos) c = k;
        return c;
    }
    @Override public String bubble(long pos) {
        if (!gameOnChannel() || chapters.isEmpty()) return Timeline.clock(pos);
        Timeline.Mark c = chapterOf(pos), tip = chapters.get(0);
        if (c == null) return "Before tip-off";
        String name = "tip".equals(c.key) ? "Q1" : c.label;
        return name + " · " + Timeline.hms(pos - tip.at);
    }
    /** The skip button: its label and place from the played position (v1.3 S1); none from Q4 on. */
    private String[] skip() {
        if (!gameOnChannel() || chapters.isEmpty()) return null;
        Timeline.Mark c = chapterOf(played());
        String key = c == null ? "tip" : c.key;
        String to;
        String label;
        switch (key) {
            case "tip": to = "q2"; label = "Skip to Q2"; break;
            case "q2": to = "q3"; label = "Skip to Q3"; break;
            case "half": to = "q3"; label = "Skip halftime"; break;
            case "q3": to = "q4"; label = "Skip to Q4"; break;
            default: return null;
        }
        for (Timeline.Mark k : chapters) if (k.key.equals(to)) return new String[] { label, String.valueOf(Math.max(0, k.at - 10000)) };
        return null;
    }
    @Override public List<Timeline.Btn> buttons() {
        List<Timeline.Btn> b = new ArrayList<>();
        b.add(new Timeline.Btn("play", "play", null, false, false, p.getPlayWhenReady() ? "Pause" : "Play", this::toggle));
        String prevHint = gameOnChannel() ? "Back to tip-off" : isProgramme() ? "Back to the start" : "Back to the start";
        b.add(new Timeline.Btn("prev", "skipBack", null, false, false, prevHint, () -> seek(gameOnChannel() ? tipoffAt : 0, true)));
        b.add(new Timeline.Btn("m1", null, "−1m", false, false, "Back 1 minute", () -> seek(shown() - 60000, true)));
        b.add(new Timeline.Btn("p1", null, "+1m", false, false, "On 1 minute", () -> seek(shown() + 60000, true)));
        String[] sk = skip();
        if (sk != null) { long at = Long.parseLong(sk[1]); b.add(new Timeline.Btn("skip", null, sk[0], true, false, sk[0], () -> seek(at, true))); }
        if (isProgramme() && !onNow() && programme != null && programme.optJSONObject("next") != null) b.add(new Timeline.Btn("next", null, "Next programme", true, false, "Next programme", () -> exitThen("next-programme")));
        if (live != null && (gameOnChannel() || onNow())) b.add(new Timeline.Btn("live", null, "Back to live", true, true, "Back to live", this::backToLive));
        if (isGame()) b.add(new Timeline.Btn("game", "score", null, false, true, "Game panel", a::openReplayPanel));
        b.add(new Timeline.Btn("cc", "cc", null, false, true, "Subtitles", a::openSubtitles));
        b.add(new Timeline.Btn("audio", "audio", null, false, true, "Audio", a::openAudio));
        b.add(new Timeline.Btn("pic", "pic", null, false, true, "Picture size", a::openPicture));
        return b;
    }
    @Override public String buttonsKey() {
        String[] sk = skip();
        return (sk == null ? "" : sk[0]) + "|" + (live != null && (gameOnChannel() || onNow())) + "|" + isVideo() + "|" + onNow();
    }
    @Override public boolean playing() { return p.getPlayWhenReady() && !ended; }
    @Override public void toggle() {
        if (ended) return;
        if (p.getPlayWhenReady()) p.pause(); else p.play();
    }
    @Override public void seekBy(long ms) { seek(shown() + ms, true); }
    @Override public void seekTo(long pos) { seek(pos, false); }
    @Override public long scrubMax() { return isVideo() && hidden ? length() : clampMax(); }
    private long clampMax() {
        long max = length() - 1000;
        if (isVideo() && duration > 0) max = Math.min(max, duration - 1000);
        if (isGame() && !isVideo()) max = windowMs - 1000;
        long lp = livePos();
        if (lp >= 0) max = Math.min(max, lp - 10000);
        return Math.max(0, max);
    }
    private final Runnable commit = () -> { if (target >= 0) doSeek(target); };
    /** A seek: the thumb moves at once; inside the buffer it's local at once, otherwise one request 600 ms after the last tap. */
    void seek(long pos, boolean coalesce) {
        if (checking || ended || waitingLinks) return;
        if (isVideo() && duration > 0 && pos > duration - 5000) pos = duration - 5000;   // a hidden video's scrub past its end: the last 5 s (M5)
        pos = Math.max(0, Math.min(clampMax(), pos));
        target = pos;
        a.handler.removeCallbacks(commit);
        long buffered = offset + p.getBufferedPosition(), at = offset + p.getCurrentPosition();
        if (!opening && pos >= at && pos <= buffered && p.isCurrentMediaItemSeekable()) { doSeek(pos); return; }
        if (coalesce) a.handler.postDelayed(commit, 600); else doSeek(pos);
        tlChanged();
    }
    private void doSeek(long pos) {
        a.handler.removeCallbacks(commit);
        target = pos;
        openAt(pos);
    }
    @Override public void atLive() { backToLive(); }
    @Override public void options() { a.openOptions(); }
    @Override public void channel(int dir) { if (live != null) backToLive(); }
    @Override public long step() { return 10000; }

    boolean busy() { return opening || waitingLinks; }
    String describe() { return "src=" + si + " link=" + li + " played=" + played() + " opening=" + opening + " checking=" + checking + " ended=" + ended + " url=" + playingUrl; }
}
