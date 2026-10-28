package app.tuner.player;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.drawable.GradientDrawable;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.media3.common.C;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.PlayerMessage;
import androidx.media3.exoplayer.SeekParameters;

import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Skip intro, Skip recap and where the credits start (design/ui-v1/skip/SPEC.md): the times the app sends per item
 * (TheIntroDB; the next item's ahead), checked against this copy and its subtitles ({@link SkipRules}), the chips in Up
 * next's corner (Skip intro 48 high, the way back 60, the offer 64, each with its drain line), the row's pill, skips by
 * themselves, the offer, and ▼ Options > Intros in this show. Up next stays in PlayerActivity and asks creditsAt().
 */
final class Skips {
    private final PlayerActivity a;
    private final ExoPlayer p;

    // ---------- what the app sends (9.5) ----------
    static final class Seg {
        String id = "", level = "", mode = "button", account = "button", showKey = "", showName = "", episode = "", choice;
        Object recapAuto = Boolean.FALSE;   // true | false | "prev" (the next item's, decided when it starts)
        boolean known, offer, doubtful, ahead;
        long[][] intro = {}, recap = {}, credits = {}, preview = {};
        static long[][] list(JSONArray l) {
            List<long[]> out = new ArrayList<>();
            for (int i = 0; l != null && i < l.length(); i++) { JSONObject o = l.optJSONObject(i); if (o != null) out.add(new long[] { o.optLong("start", 0), o.optLong("end", 0) }); }
            return out.toArray(new long[0][]);
        }
        static Seg from(JSONObject o) {
            Seg s = new Seg();
            s.id = o.optString("id");
            s.level = o.optString("level");
            s.mode = o.optString("mode", "button");
            s.account = o.optString("account", "button");
            s.known = o.optBoolean("known", true);
            s.ahead = o.optBoolean("ahead");
            Object r = o.opt("recapAuto");
            s.recapAuto = "prev".equals(r) ? "prev" : Boolean.valueOf(Boolean.TRUE.equals(r));
            s.intro = list(o.optJSONArray("intro")); s.recap = list(o.optJSONArray("recap"));
            s.credits = list(o.optJSONArray("credits")); s.preview = list(o.optJSONArray("preview"));
            JSONObject sh = o.optJSONObject("show");
            if (sh != null) {
                s.showKey = sh.optString("key"); s.showName = sh.optString("name"); s.episode = sh.optString("episode");
                s.choice = sh.isNull("choice") ? null : sh.optString("choice", null);
                s.offer = sh.optBoolean("offer"); s.doubtful = sh.optBoolean("doubtful");
            }
            return s;
        }
    }
    private final Map<String, Seg> byId = new HashMap<>();
    private Seg seg;              // the item playing
    private String curId = "";
    private int curIndex = -1;
    private boolean episode, prevDone, recapSelf, startedItem;
    private long derivedFor = -1;  // the duration the windows were made for

    // ---------- the windows (3.1) and what this play did with them ----------
    static final int RECAP = 1, INTRO = 2, BOTH = 3;
    static final class St { boolean once, done, leftAlone, hidden, pressedBack; }   // skipped or gone back to · no chip until a seek · gone back to · Back on its chip · gone back from after a press
    final class Win {
        final int kind;
        final long start, end;
        long target;
        Win then;                  // a recap that skips by itself to the intro's start, the intro's own chip after it
        boolean self, anchored;    // may skip by itself (4.3); an anchored file was there to look
        St st;
        PlayerMessage msg;
        Win(int kind, long start, long end) { this.kind = kind; this.start = start; this.end = end; target = Math.max(start, end - 500); }
        String key() { return kind + ":" + start; }
        String part() { return kind == RECAP ? "recap" : kind == INTRO ? "intro" : "both"; }
        String name() { return kind == RECAP ? "recap" : kind == INTRO ? "intro" : "recap and intro"; }
        String skipLabel() { return kind == RECAP ? "Skip recap" : kind == INTRO ? "Skip intro" : "Skip recap and intro"; }
        String skipped() { return kind == RECAP ? "Recap skipped" : kind == INTRO ? "Intro skipped" : "Recap and intro skipped"; }
        String backLabel() { return "Back to " + name(); }
        boolean has(long pos) { return pos >= start && pos < end; }
    }
    private final List<Win> wins = new ArrayList<>();
    private final Map<String, St> states = new HashMap<>();
    private SkipRules.Result res;

    // ---------- the chip ----------
    static final int NONE = 0, SKIP = 1, BACK = 2, OFFER = 3, DONE = 4;
    private int kind;
    private Win cw;                 // SKIP, BACK: its window
    private boolean bySelf;         // BACK: after a skip by itself (the full guard)
    private long life, lifeTotal;   // ms of playing time left, of the whole life
    private long shownAt, bindAt;   // uptime: it appeared, OK binds (0: not yet)
    private boolean started;        // BACK: the first frame after the jump (3.5)
    private boolean sawSeek;
    private long seekAt, target, eatUntil, lastTick;
    private boolean hintOn, ownSeek, wasVisible;
    private Win pending;            // a Skip chip waiting for 1.5 s of quiet, the controls, a panel
    // the offer (4.4)
    private boolean offerPending, offered;
    private long offerIn;
    private String carry = "", carryFrom = "";   // a show whose offer waits for its next episode's start + 10 s
    // what only the TV can tell (15): the diagnosis log's counts for this play
    private int nFile, nStopped, nSelfBlind, nBackSelf, nUpList, nUpSubs;
    private boolean itemFile, itemStopped;   // this item: an anchored file looked at the intro; it found speech inside

    private final FrameLayout box;
    private final ImageView glyph;
    private final TextView title, sub, okCap, okWord, keyOk, keyBack;
    private final LinearLayout keys2;
    private final Drain drain;

    private final Runnable tick = new Runnable() { @Override public void run() { step(); a.handler.postDelayed(this, 200); } };

    Skips(PlayerActivity a, ExoPlayer p, FrameLayout root) {
        this.a = a;
        this.p = p;
        Context c = a;
        // the chip (2.1): bg-1 94% with the 1 px border, radius 16, padding 14 / 12, width = content (max 420)
        box = new FrameLayout(c);
        GradientDrawable bg = Ui.round(Ui.PANEL, 16);
        bg.setStroke(Math.max(1, Ui.dp(1)), Ui.BORDER);
        box.setBackground(bg);
        LinearLayout row = new LinearLayout(c);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(Ui.dp(14), 0, Ui.dp(12), 0);
        glyph = new ImageView(c);
        LinearLayout.LayoutParams gl = new LinearLayout.LayoutParams(Ui.dp(20), Ui.dp(20));
        gl.setMarginEnd(Ui.dp(10));
        row.addView(glyph, gl);
        LinearLayout col = new LinearLayout(c);
        col.setOrientation(LinearLayout.VERTICAL);
        title = Ui.line(c, "", 16, Ui.T1, Ui.inter650);   // Inter 650 16, as chipTitle
        title.setMaxWidth(Ui.dp(330));
        Ui.lineHeight(title, 20);
        sub = Ui.line(c, "", 14, Ui.T2, Ui.inter500);
        Ui.lineHeight(sub, 18);
        col.addView(title);
        col.addView(sub);
        keys2 = new LinearLayout(c);   // the offer's keys on its second line: OK yes · Back not now
        keys2.setGravity(Gravity.CENTER_VERTICAL);
        keyOk = Ui.kbd(c, "OK");
        keys2.addView(keyOk, gap(new LinearLayout.LayoutParams(-2, Ui.dp(20)), 6));
        keys2.addView(Ui.text(c, "yes", 14, Ui.T1, Ui.inter500), gap(new LinearLayout.LayoutParams(-2, -2), 16));
        keyBack = Ui.kbd(c, "Back");
        keys2.addView(keyBack, gap(new LinearLayout.LayoutParams(-2, Ui.dp(20)), 6));
        keys2.addView(Ui.text(c, "not now", 14, Ui.T1, Ui.inter500));
        LinearLayout.LayoutParams kl = new LinearLayout.LayoutParams(-2, -2);
        kl.topMargin = Ui.dp(2);
        col.addView(keys2, kl);
        row.addView(col, new LinearLayout.LayoutParams(-2, -2));
        okCap = Ui.kbd(c, "OK");
        LinearLayout.LayoutParams ol = new LinearLayout.LayoutParams(-2, Ui.dp(20));
        ol.setMarginStart(Ui.dp(10));
        row.addView(okCap, ol);
        okWord = Ui.text(c, "", 14, Ui.T1, Ui.inter500);
        LinearLayout.LayoutParams wl = new LinearLayout.LayoutParams(-2, -2);
        wl.setMarginStart(Ui.dp(6));
        row.addView(okWord, wl);
        box.addView(row, new FrameLayout.LayoutParams(-2, -1));
        drain = new Drain(c);
        FrameLayout.LayoutParams dl = new FrameLayout.LayoutParams(-1, Ui.dp(3), Gravity.BOTTOM);
        dl.setMargins(Ui.dp(14), 0, Ui.dp(12), Ui.dp(5));
        box.addView(drain, dl);
        FrameLayout.LayoutParams bl = new FrameLayout.LayoutParams(-2, Ui.dp(48), Gravity.BOTTOM | Gravity.END);
        bl.setMargins(0, 0, Ui.dp(48), Ui.dp(64));
        box.setVisibility(View.GONE);
        root.addView(box, bl);
        p.addListener(new Player.Listener() {
            @Override public void onPositionDiscontinuity(@NonNull Player.PositionInfo o, @NonNull Player.PositionInfo n, int reason) {
                if (reason != Player.DISCONTINUITY_REASON_SEEK) return;
                if (kind == BACK && !started) sawSeek = true;
                if (ownSeek) { ownSeek = false; return; }
                a.handler.post(() -> landed(p.getCurrentPosition(), SEEK));
            }
            @Override public void onIsPlayingChanged(boolean playing) {
                if (playing && kind == BACK && !started && sawSeek) start();   // the first frame after the jump (3.5)
            }
        });
        a.handler.post(tick);
    }
    private static LinearLayout.LayoutParams gap(LinearLayout.LayoutParams lp, int dp) { lp.setMarginEnd(Ui.dp(dp)); return lp; }

    // ---------- from the app ----------
    void command(String json) {
        Seg s;
        try { s = Seg.from(new JSONObject(json)); } catch (Exception e) { return; }
        Seg was = byId.get(s.id);
        byId.put(s.id, s);
        if (!s.id.equals(curId)) return;
        // the same item again (a pick in Options, the list sent once it started): a recap rule the player decided at the
        // item's start from the one before it ('prev') stays
        boolean keep = startedItem && wasPrev;
        seg = s;
        if (keep) { if (s.doubtful) recapSelf = false; } else resolveRecap();
        boolean fresh = was == null || !sameTimes(was, s) || derivedFor < 0;
        derive();
        if (fresh && startedItem) landed(p.getCurrentPosition(), ANSWER);
    }
    private boolean wasPrev;
    private static boolean sameTimes(Seg x, Seg y) {
        return java.util.Arrays.deepEquals(x.intro, y.intro) && java.util.Arrays.deepEquals(x.recap, y.recap) && java.util.Arrays.deepEquals(x.credits, y.credits) && java.util.Arrays.deepEquals(x.preview, y.preview);
    }
    private void resolveRecap() {
        if (seg == null) { recapSelf = false; return; }
        wasPrev = "prev".equals(seg.recapAuto);
        recapSelf = wasPrev ? prevDone : Boolean.TRUE.equals(seg.recapAuto);
        if (seg.doubtful) recapSelf = false;
    }

    /** A new item: its own times (sent ahead, or on their way); prevDone: the item before it ended or played past 80%. */
    void itemStarted(PlayerActivity.Entry e, int index, boolean prevDone) {
        if (kind == BACK && cw != null) fate(cw, false);
        endChip(false);
        cancelMessages();
        if (itemFile) nFile++;
        if (itemStopped) nStopped++;
        itemFile = itemStopped = false;
        wins.clear(); states.clear(); res = null; pending = null; derivedFor = -1;
        if (offerPending && seg != null && !seg.showKey.isEmpty()) { carry = seg.showKey; carryFrom = curId; }   // (moved on first: the next episode's start + 10 s)
        offerPending = false;
        curId = e == null ? "" : e.id;
        curIndex = index;
        episode = curId.startsWith("episode:");
        this.prevDone = prevDone;
        startedItem = false;
        seg = byId.get(curId);
        resolveRecap();
        a.handler.post(this::ready);
    }
    /** The copy's length is known (STATE_READY): the windows, and the start inside one (a recap at 0:00, a resume). */
    void ready() {
        if (p.getDuration() == C.TIME_UNSET || p.getDuration() <= 0 || p.getCurrentMediaItemIndex() != curIndex) return;
        if (derivedFor != p.getDuration()) derive();
        if (!startedItem) { startedItem = true; landed(p.getCurrentPosition(), START); }
    }
    /** The downloaded subtitles changed (a file, a pick, an Early or late step): the intro's check runs again (9.4). */
    void subsChanged() { if (seg != null && derivedFor > 0) derive(); }

    // ---------- the checks, then the windows ----------
    private void derive() {
        long d = p.getDuration();
        if (seg == null || d == C.TIME_UNSET || d <= 0 || p.getCurrentMediaItemIndex() != curIndex) return;
        derivedFor = d;
        long pos = p.getCurrentPosition();
        SkipRules.Answer in = new SkipRules.Answer();
        in.d = d; in.recap = seg.recap; in.intro = seg.intro; in.credits = seg.credits; in.preview = seg.preview;
        SrtTrack f = a.subs != null ? a.subs.anchoredFile() : null;
        in.anchored = f == null ? null : Subs.cues(f);
        res = SkipRules.check(in);
        // a window already reached keeps what it was (a file that came later gives no evidence for it; a skip made stays)
        List<Win> kept = new ArrayList<>();
        for (Win w : wins) if (pos >= w.start) kept.add(w);
        cancelMessages();
        wins.clear();
        boolean sure = "sure".equals(seg.level);
        boolean introSelf = res.intro != null && episode && sure && "auto".equals(seg.mode) && !seg.doubtful && !res.introChipOnly;
        boolean recapOk = res.recap != null && episode && sure && recapSelf && !seg.doubtful;
        List<Win> made = new ArrayList<>();
        long[] r = res.recap, i = res.intro;
        if (r != null && i != null && i[0] - r[1] <= 3000 && r[1] <= i[1]) {   // a recap then the intro (3.1)
            if (recapOk == introSelf) { Win b = new Win(BOTH, r[0], i[1]); b.self = recapOk; made.add(b); }
            else if (recapOk) {   // only the recap may: it skips alone to the intro's start; the intro keeps its chip
                Win rw = new Win(RECAP, r[0], i[0]), iw = new Win(INTRO, i[0], i[1]);
                rw.self = true; rw.then = iw; rw.target = i[0];
                made.add(rw); made.add(iw);
            } else { Win rw = new Win(RECAP, r[0], Math.min(r[1], i[0])), iw = new Win(INTRO, i[0], i[1]); iw.self = true; made.add(rw); made.add(iw); }
        } else {
            if (r != null) { Win w = new Win(RECAP, r[0], r[1]); w.self = recapOk; made.add(w); }
            if (i != null) { Win w = new Win(INTRO, i[0], i[1]); w.self = introSelf; made.add(w); }
        }
        for (Win w : made) {
            w.anchored = in.anchored != null && w.kind != RECAP;
            boolean clash = false;
            for (Win k : kept) if (k.start < w.end && w.start < k.end) clash = true;
            if (!clash) wins.add(w);
        }
        for (Win k : kept) if (!wins.contains(k)) wins.add(k);
        java.util.Collections.sort(wins, (x, y) -> Long.compare(x.start, y.start));
        for (Win w : wins) {
            St s = states.get(w.key());
            if (s == null) { s = w.st != null ? w.st : new St(); states.put(w.key(), s); }
            w.st = s;
            if (w.then != null && !wins.contains(w.then)) w.then = null;
            // one message per window that skips by itself, at its start, on the main looper (3.5)
            if (w.self && !s.once && w.start > pos) {
                try { w.msg = p.createMessage((type, payload) -> reached((Win) payload)).setLooper(Looper.getMainLooper()).setPosition(curIndex, w.start).setPayload(w).setDeleteAfterDelivery(false).send(); } catch (Exception ignored) {}
            }
        }
        itemFile = in.anchored != null && seg.intro.length > 0;
        itemStopped = itemFile && (res.introChipOnly || res.intro == null);
        if (kind == SKIP && cw != null && !wins.contains(cw)) endChip(false);
    }
    private void cancelMessages() { for (Win w : wins) if (w.msg != null) { try { w.msg.cancel(); } catch (Exception ignored) {} w.msg = null; } }

    /** Where the credits start on this copy, after the checks (-1: not known): Up next's start (5.1). */
    long creditsAt() { return res == null ? -1 : res.credits; }
    void upNextFrom(boolean list) { if (list) nUpList++; else nUpSubs++; }

    // ---------- reaching a window, landing in one ----------
    static final int START = 1, SEEK = 2, ANSWER = 3;
    private boolean canSelf(Win w) {
        return episode && (kind == NONE || (kind == SKIP && cw == w)) && !a.panelOpen() && !a.upNextShowing() && !a.scrubbing();
    }
    /** Play reached a window that skips by itself (its PlayerMessage). */
    private void reached(Win w) {
        if (!wins.contains(w) || p.getCurrentMediaItemIndex() != curIndex || w.st.once || !w.self) return;
        if (canSelf(w)) jump(w, true);
    }
    /** After a seek (his), at an item's start or a resume, or when the times came late (3.6). */
    private void landed(long pos, int how) {
        for (Win w : wins) {
            St s = w.st;
            if (how == SEEK && pos < w.start && s.done && !s.leftAlone) s.done = false;   // before its start: the chip as at first
            if (!w.has(pos) || s.leftAlone) continue;
            if (how == START && w.self && !s.once && canSelf(w)) { jump(w, true); return; }   // a recap at 0:00; resumed inside: from its end
            if (how == ANSWER && w.self && !s.once && pos - w.start <= 3000 && canSelf(w)) { jump(w, true); return; }   // on time
            if (how == SEEK && s.done) { if (w.end - pos >= 15000) s.done = false; else continue; }   // one ◀ after a skip: no chip
            if (kind == SKIP && cw == w) continue;   // ◀ ▶ inside it: the chip stays
            if (w.end - pos >= 5000 && !s.done) pending = w;
        }
    }

    // ---------- the jump and the way back (3.5, 4.2) ----------
    private void jump(Win w, boolean self) {
        w.st.once = true;
        w.st.done = true;
        if (w.msg != null) { try { w.msg.cancel(); } catch (Exception ignored) {} w.msg = null; }
        if (kind == BACK && cw != null && cw != w) fate(cw, false);
        endChip(false);
        pending = null;
        target = w.target;
        kind = BACK;   // (set before the seek: its discontinuity is the start of the wait for the first frame)
        cw = w;
        bySelf = self;
        started = false;
        sawSeek = false;
        seekAt = SystemClock.uptimeMillis();
        life = lifeTotal = 5000;
        bindAt = 0;
        hintOn = hintAsked = false;
        shownAt = seekAt;
        if (self && !w.anchored) nSelfBlind++;
        fill();
        seekTo(target);
        a.hintsChanged();
    }
    /** The exact seek: SeekParameters.EXACT for this seek only, then whatever was set before (scrubbing may differ). */
    private void seekTo(long ms) {
        SeekParameters was = p.getSeekParameters();
        ownSeek = true;
        p.setSeekParameters(SeekParameters.EXACT);
        p.seekTo(ms);
        p.setSeekParameters(was);
        a.recordSeek();
    }
    /** The first frame after the jump (or 1.5 s without one, or play moving on from the target): its 5 s start here. */
    private void start() {
        if (kind != BACK || started) return;
        started = true;
        bindAt = SystemClock.uptimeMillis() + (bySelf ? 700 : 500);
    }
    private void goBack() {
        if (kind != BACK || cw == null) return;
        Win w = cw;
        w.st.leftAlone = true;
        w.st.once = true;
        if (!bySelf) w.st.pressedBack = true;
        if (bySelf) nBackSelf++;
        fate(w, true);
        endChip(false);
        seekTo(w.start);
    }
    /** A skip's fate is known (its way-back chip is over): the app counts presses for the offer and go-backs (9.5). */
    private void fate(Win w, boolean back) {
        if (seg == null || w == null) return;
        JSObject e = a.event("skip");
        e.put("show", seg.showKey);
        e.put("episode", seg.episode);
        e.put("how", bySelf ? "self" : "press");
        e.put("part", w.part());
        e.put("level", seg.level);
        e.put("anchored", w.anchored);
        e.put("back", back);
        TunerPlayerPlugin.emit(e);
        if (!back && !bySelf && w.kind != RECAP && "sure".equals(seg.level) && seg.offer && "button".equals(seg.mode) && !offered && !seg.showKey.isEmpty()) {
            offerPending = true;
            offerIn = 10000;
        }
    }

    // ---------- every 200 ms: lives in playing time, the guard, the pill, the offer ----------
    private void step() {
        if (a.isFinishing()) return;
        long now = SystemClock.uptimeMillis(), dt = lastTick == 0 ? 0 : Math.min(400, now - lastTick);
        lastTick = now;
        if (seg == null && kind == NONE) { pill(); return; }
        long pos = p.getCurrentPosition();
        boolean playing = p.isPlaying(), controls = a.controlsUp(), panel = a.panelOpen(), upNext = a.upNextShowing(), scrub = a.scrubbing();
        if (upNext && kind != NONE) { if (kind == BACK) fate(cw, false); if (kind == OFFER) letGo(); endChip(false); }
        if (kind == BACK && !started && (now - seekAt >= 1500 || (playing && pos >= target + 150))) start();
        boolean vis = kind != NONE && !controls && !panel && !upNext && !scrub;
        if (vis && playing && (kind != BACK || started)) life -= dt;
        if (kind == SKIP && (!cw.has(pos) || pos >= cw.end - 1000 || life <= 0 || cw.st.leftAlone)) { cw.st.done = true; endChip(true); }
        else if (kind == BACK && life <= 0) { fate(cw, false); endChip(true); }
        else if (kind == OFFER && life <= 0) { letGo(); endChip(true); }
        else if (kind == DONE && now - shownAt >= 2000) endChip(false);
        // a Skip chip waiting: 1.5 s without a key (the way-back chip's 5 s count as quiet), with 5 s of the window left
        if (kind == NONE && pending == null && !upNext) for (Win w : wins) {
            if (!w.has(pos) || w.st.done || w.st.leftAlone || w.end - pos < 5000) continue;
            if (w.self && !w.st.once && pos - w.start < 1500 && playing) continue;   // (its message is about to skip it)
            pending = w;
        }
        if (kind == NONE && pending != null) {
            Win w = pending;
            if (!w.has(pos) || w.st.done || w.st.leftAlone || !wins.contains(w)) pending = null;
            else if (!controls && !panel && !upNext && !scrub && now - a.lastKeyAt() >= 1500) {
                if (w.end - 1000 - pos >= 4000) showSkip(w, pos); else pending = null;
            }
        }
        // the offer: 10 s of playing time after the way-back chip went, outside the windows, not in the last 2 min
        if (!carry.isEmpty() && seg != null && startedItem && !carryFrom.equals(curId)) { if (carry.equals(seg.showKey) && "button".equals(seg.mode) && seg.choice == null) { offerPending = true; offerIn = Math.max(0, 10000 - pos); } carry = ""; }
        if (offerPending && kind == NONE && pending == null) {
            if (playing) offerIn -= dt;
            long d = p.getDuration(), end = creditsAt() >= 0 ? creditsAt() : d == C.TIME_UNSET ? Long.MAX_VALUE : d;
            boolean inWin = false;
            for (Win w : wins) if (w.has(pos)) inWin = true;
            if (offerIn <= 0 && end - pos < 120000) { offerPending = false; carry = seg == null ? "" : seg.showKey; carryFrom = curId; }
            else if (offerIn <= 0 && !inWin && !controls && !panel && !upNext && !scrub && now - a.lastKeyAt() >= 1500) showOffer();
        }
        // the guard: OK binds at 0.7 s (0.5 s after a pressed skip's first frame); the hint bar only from that moment, the
        // first 5 times for each chip (review 4: no "OK Pause" changing to "OK Skip intro" under his eyes)
        if (bound() && !hintAsked && kind != DONE && vis) { hintAsked = true; hintOn = a.bumpHint(kind == SKIP ? "skip" : kind == BACK ? "skipback" : "offer"); a.hintsChanged(); }
        render(vis, pos);
        pill();
    }
    private boolean hintAsked;
    boolean bound() { return kind != NONE && kind != DONE && bindAt > 0 && SystemClock.uptimeMillis() >= bindAt; }

    private void showSkip(Win w, long pos) {
        pending = null;
        kind = SKIP;
        cw = w;
        lifeTotal = life = Math.min(10000, w.end - 1000 - pos);
        shownAt = SystemClock.uptimeMillis();
        bindAt = shownAt + 700;
        hintOn = hintAsked = false;
        fill();
    }
    private void showOffer() {
        offerPending = false;
        offered = true;
        kind = OFFER;
        cw = null;
        lifeTotal = life = 8000;
        shownAt = SystemClock.uptimeMillis();
        bindAt = shownAt + 700;
        hintOn = hintAsked = false;
        fill();
    }
    private void letGo() {
        if (seg == null) return;
        JSObject e = a.event("offer");
        e.put("show", seg.showKey);
        e.put("letGo", true);
        TunerPlayerPlugin.emit(e);
    }
    private void yes() {
        if (seg == null) return;
        setChoice("auto");
        kind = DONE;
        shownAt = SystemClock.uptimeMillis();
        bindAt = 0;
        fill();
        a.hintsChanged();
    }
    /** The chip goes. eat: it went by itself, so for 0.7 s OK does nothing (the press was meant for it, 2.2). */
    private void endChip(boolean eat) {
        if (kind == NONE) return;
        kind = NONE;
        cw = null;
        hintOn = hintAsked = false;
        if (eat) eatUntil = SystemClock.uptimeMillis() + 700;
        render(false, 0);
        a.hintsChanged();
    }

    // ---------- drawing ----------
    private void fill() {
        boolean two = kind == BACK || kind == OFFER;
        glyph.setImageDrawable(Ui.icon(kind == BACK ? "skipBack" : "skipFwd", Ui.T1, 20));
        sub.setVisibility(kind == BACK ? View.VISIBLE : View.GONE);
        keys2.setVisibility(kind == OFFER ? View.VISIBLE : View.GONE);
        okCap.setVisibility(kind == SKIP || kind == BACK ? View.VISIBLE : View.GONE);
        okWord.setVisibility(kind == BACK ? View.VISIBLE : View.GONE);
        drain.setVisibility(kind == DONE ? View.GONE : View.VISIBLE);
        if (kind == SKIP) title.setText(cw.skipLabel());
        else if (kind == BACK) {
            title.setText(cw.skipped());
            sub.setText(length(cw.then != null ? cw.then.start - cw.start : cw.end - cw.start));
            okWord.setText(cw.then != null ? "skip intro" : "go back");   // (a recap skipped into the intro: OK skips the intro; Back to recap is the row's)
        } else if (kind == OFFER) title.setText("Always skip this show's intro?");
        else if (kind == DONE) title.setText("Done: this show's intros skip by themselves");
        title.setMaxWidth(Ui.dp(kind == DONE ? 380 : 330));
        FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) box.getLayoutParams();
        lp.height = Ui.dp(kind == OFFER ? 64 : two ? 60 : 48);
        box.setLayoutParams(lp);
        FrameLayout.LayoutParams dl = (FrameLayout.LayoutParams) drain.getLayoutParams();
        dl.bottomMargin = Ui.dp(kind == OFFER ? 4 : 5);
        drain.setLayoutParams(dl);
        wasVisible = false;
    }
    /** Lengths are the window's, to the nearest second up to 99 s, then minutes (2.5). */
    static String length(long ms) { long s = Math.round(ms / 1000.0); return s <= 99 ? s + " s" : Math.round(ms / 60000.0) + " min"; }
    private void render(boolean vis, long pos) {
        boolean show = vis && kind != NONE;
        if (show) {
            boolean b = bound();
            float cap = b ? 1f : 0.4f;   // the OK cap at 40% until OK binds
            okCap.setAlpha(cap);
            keyOk.setAlpha(cap);
            drain.set(lifeTotal <= 0 ? 0 : Math.max(0, Math.min(1, life / (float) lifeTotal)));
            if (!wasVisible) {
                wasVisible = true;
                box.animate().cancel();
                box.setAlpha(0);
                box.setVisibility(View.VISIBLE);
                box.bringToFront();
                box.animate().alpha(1).setDuration(150).start();
            }
        } else if (wasVisible || box.getVisibility() == View.VISIBLE) {
            wasVisible = false;
            box.animate().cancel();
            box.animate().alpha(0).setDuration(120).withEndAction(() -> { if (!wasVisible) box.setVisibility(View.GONE); }).start();
        }
        a.liftSubtitles();
    }
    /** The chip's box on screen (px: left, top), for the subtitles' step up (2.1); null when none floats. */
    int[] box() { return wasVisible && box.getWidth() > 0 ? new int[] { box.getLeft(), box.getTop() } : null; }

    /** The drain line: 3 dp, pink on surface-3, empties over the chip's life. */
    static final class Drain extends View {
        private final Paint track = new Paint(Paint.ANTI_ALIAS_FLAG), fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF r = new RectF();
        private float v = 1;
        Drain(Context c) { super(c); track.setColor(Ui.S3); fill.setColor(Ui.PINK); }
        void set(float x) { if (x != v) { v = x; invalidate(); } }
        @Override protected void onDraw(@NonNull Canvas c) {
            float h = getHeight(), rad = h / 2;
            r.set(0, 0, getWidth(), h);
            c.drawRoundRect(r, rad, rad, track);
            if (v > 0) { r.set(0, 0, getWidth() * v, h); c.drawRoundRect(r, rad, rad, fill); }
        }
    }

    // ---------- the row's pill (3.3) ----------
    private String pillNow = "";
    private void pill() {
        if (a.vodControls() == null) return;
        long pos = p.getCurrentPosition();
        String label = null, icon = null;
        Runnable act = null;
        if (kind == BACK && cw != null) { label = cw.then != null ? "Back to recap" : cw.backLabel(); icon = "skipBack"; act = this::pillBack; }
        else for (Win w : wins) if (w.has(pos)) { label = w.skipLabel(); icon = "skipFwd"; final Win fw = w; act = () -> { jump(fw, false); a.vodControls().focusSeek(); }; break; }
        String k = label == null ? "" : label + (kind == BACK ? ":back" : "");
        if (k.equals(pillNow)) return;
        pillNow = k;
        a.vodControls().setSkip(label, icon, act);
    }
    private void pillBack() { goBack(); if (a.vodControls() != null) a.vodControls().focusSeek(); }
    /** ▲ lands on the pill while the window is fresh: not hidden with Back, not gone back from after a pressed skip; and on
     * Back to recap after a recap skipped by itself into the intro. */
    boolean pillFresh() {
        if (kind == BACK) return cw != null && cw.then != null;
        long pos = p.getCurrentPosition();
        for (Win w : wins) if (w.has(pos)) return !w.st.hidden && !w.st.pressedBack;
        return false;
    }

    // ---------- keys (3.4) ----------
    /** OK while the chip floats (controls hidden): its action once bound; before that it falls through (Pause). */
    boolean key(int code, boolean repeat) {
        boolean ok = code == KeyEvent.KEYCODE_DPAD_CENTER || code == KeyEvent.KEYCODE_ENTER || code == KeyEvent.KEYCODE_NUMPAD_ENTER;
        if (!ok || a.controlsUp() || a.panelOpen()) return false;
        if (kind == NONE || kind == DONE) return SystemClock.uptimeMillis() < eatUntil;
        // before it binds OK pauses, as it did before the chip came; after a pressed skip only a double press is the risk,
        // so then it does nothing (SK-4)
        if (!bound()) return kind == BACK && !bySelf;
        if (repeat) return true;
        if (kind == SKIP) jump(cw, false);
        else if (kind == BACK) { if (cw.then != null) jump(cw.then, false); else goBack(); }   // (a recap skipped into the intro: OK skips the intro)
        else if (kind == OFFER) yes();
        return true;
    }
    /** Back hides the chip and never leaves the player while one floats. */
    boolean back() {
        if (kind == NONE || a.controlsUp()) return false;
        if (kind == SKIP) { cw.st.hidden = true; cw.st.done = true; }
        else if (kind == BACK) fate(cw, false);
        else if (kind == OFFER) letGo();
        endChip(false);
        return true;
    }
    /** A panel opened: the way-back chip ends; the others hide and come back if they have life left. */
    void panelOpened() { if (kind == BACK) { fate(cw, false); endChip(false); } }

    String[][] hints() {
        if (!hintOn || !bound() || a.controlsUp() || a.panelOpen()) return null;
        if (kind == SKIP) return new String[][] { { "OK", cw.skipLabel() }, { "◀ ▶", "Seek 10 s" }, { "▲", "Buttons" }, { "Back", "Hide" } };
        if (kind == BACK) return cw.then != null ? new String[][] { { "OK", "Skip intro" }, { "◀ ▶", "Seek 10 s" }, { "▲", "Back to recap" }, { "Back", "Hide" } }
                : new String[][] { { "OK", "Go back" }, { "◀ ▶", "Seek 10 s" }, { "▲", "Buttons" }, { "Back", "Hide" } };
        if (kind == OFFER) return new String[][] { { "OK", "Yes" }, { "Back", "Not now" }, { "◀ ▶", "Seek 10 s" }, { "▲", "Buttons" } };
        return null;
    }
    boolean floating() { return kind != NONE && wasVisible; }

    // ---------- ▼ Options > Intros in this show (4.1, mock 7 and 9) ----------
    ListPanel.Item optionsRow() {
        if (!episode || seg == null) return null;
        ListPanel.Item it = new ListPanel.Item("Intros in this show");
        it.icon = "skipFwd";
        if ("off".equals(seg.account)) { it.value = "Off in Account"; it.disabled = true; return it; }
        it.value = "auto".equals(seg.choice) ? "Skip by itself" : "button".equals(seg.choice) ? "Show a button" : "Same as Account";
        it.ok = this::openPanel;
        return it;
    }
    private void openPanel() {
        ListPanel p = new ListPanel(a, "Intros in this show", true, 384);
        List<ListPanel.Item> items = new ArrayList<>();
        String[][] rows = { { null, "Same as Account", "Now: " + ("auto".equals(seg.account) ? "Skip by itself" : "Show a button") }, { "auto", "Skip by itself", "You can go back for 5 s" }, { "button", "Show a button", "One press skips it" } };
        int sel = 0;
        for (String[] r : rows) {
            ListPanel.Item it = new ListPanel.Item(r[1]);
            it.sub = r[2];
            it.radio = true;
            it.radioOn = r[0] == null ? seg.choice == null : r[0].equals(seg.choice);
            if (it.radioOn) sel = items.size();
            it.height = 50;
            final String v = r[0];
            it.ok = () -> { setChoice(v); a.openOptions(); };
            items.add(it);
        }
        p.source(ListPanel.of(items), sel);
        p.setFoot(foot() + "\nRecaps skip by themselves when you just watched the episode before.");
        p.backTo = a::openOptions;
        p.hintKeys = new String[][] { { "OK", "Choose" }, { "▲ ▼", "Move" }, { "Back", "Up one level" } };
        a.show(p);
    }
    String foot() {
        if (seg != null && seg.doubtful) return "You went back after a skip, so this show uses buttons for 7 days.";
        return res == null || seg == null || !seg.known ? "Not known for this episode." : res.foot();
    }
    /** The show's choice, here at once and for the app (setting skipShow; null: Same as Account). A pick clears the
     * doubtful mark (review 4). */
    private void setChoice(String v) {
        if (seg == null || seg.showKey.isEmpty()) return;
        for (Seg s : byId.values()) if (seg.showKey.equals(s.showKey)) {
            s.choice = v;
            s.doubtful = false;
            s.mode = "off".equals(s.account) ? "off" : v != null ? v : "auto".equals(s.account) ? "auto" : "button";
            s.offer = false;
        }
        JSObject e = a.event("setting");
        e.put("key", "skipShow");
        e.put("show", seg.showKey);
        e.put("value", v == null ? JSObject.NULL : v);
        TunerPlayerPlugin.emit(e);
        derive();
    }

    // ---------- the test ----------
    String describe() {
        StringBuilder b = new StringBuilder();
        long pos = p.getCurrentPosition();
        b.append("pos=").append(pos).append(" item=").append(curId).append(" seg=").append(seg != null).append(" mode=").append(seg == null ? "" : seg.mode)
                .append(" level=").append(seg == null ? "" : seg.level).append(" recapSelf=").append(recapSelf)
                .append(" chip=").append(new String[] { "none", "skip", "back", "offer", "done" }[kind]).append(" shown=").append(wasVisible)
                .append(" bound=").append(bound()).append(" title=").append(kind == NONE ? "" : title.getText()).append(" sub=").append(kind == BACK ? sub.getText() : "")
                .append(" ok=").append(kind == BACK ? okWord.getText() : "").append(" credits=").append(creditsAt()).append(" pill=").append(pillNow)
                .append(" offerPending=").append(offerPending).append(" offered=").append(offered).append(" foot=").append(foot()).append(" wins=");
        for (Win w : wins) b.append(w.part()).append('@').append(w.start).append('-').append(w.end).append(w.self ? ":self" : "").append(w.st.once ? ":once" : "").append(w.st.leftAlone ? ":alone" : "").append(',');
        b.append(" log=file:").append(nFile).append("/stopped:").append(nStopped).append("/selfBlind:").append(nSelfBlind).append("/backSelf:").append(nBackSelf).append("/upList:").append(nUpList).append("/upSubs:").append(nUpSubs);
        return b.toString();
    }
    void release() { a.handler.removeCallbacks(tick); cancelMessages(); }
}
