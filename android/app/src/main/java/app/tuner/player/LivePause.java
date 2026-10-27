package app.tuner.player;

import androidx.media3.common.C;
import androidx.media3.exoplayer.ExoPlayer;

import com.getcapacitor.JSObject;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Live TV paused or rewound (design/ui-v1/catchup/SPEC.md 6.8, player-paused, player-paused-local): the timeline over
 * the live link. A kept channel: the bar is the programme on now, the live point and how far behind you are; rewinding
 * past what the live link holds asks the app for the channel's replay from that moment (a "need: rewind" event, which
 * the app answers by starting a programme replay). A channel that isn't kept: on HLS, ◀ and −10 work inside the live
 * window (its Timeline.Window); on a progressive .ts stream it only pauses.
 */
final class LivePause implements Timeline.Model {
    private final PlayerActivity a;
    private final ExoPlayer p;
    private boolean active;
    private long pausedAt, behindTs;   // a .ts stream: when it paused, and how far behind it has fallen so far
    private final androidx.media3.common.Timeline.Window w = new androidx.media3.common.Timeline.Window();

    LivePause(PlayerActivity a, ExoPlayer p) { this.a = a; this.p = p; }

    boolean active() { return active; }
    /** ⏯ or Rewind and pause: the timeline map, paused. */
    void start(boolean pause) {
        active = true;
        behindTs = 0;
        if (pause && p.getPlayWhenReady()) toggle();
    }
    /** Back to live: the live map again (the bar says so; repeats and ▶ are dropped for 800 ms). */
    void stop() {
        active = false;
        pausedAt = 0;
        behindTs = 0;
    }
    void tick() {}

    private int keptDays() { return a.keptDays(); }
    private boolean hls() {
        androidx.media3.common.Timeline t = p.getCurrentTimeline();
        if (t.isEmpty()) return false;
        t.getWindow(p.getCurrentMediaItemIndex(), w);
        return w.isLive() && w.isSeekable && w.getDurationMs() != C.TIME_UNSET && w.getDurationMs() > 5000;
    }
    private long windowMs() { return hls() ? w.getDurationMs() : 60000; }
    private long behind() {
        if (hls()) return Math.max(0, w.getDefaultPositionMs() - p.getCurrentPosition());
        long b = behindTs;
        if (pausedAt > 0) b += System.currentTimeMillis() - pausedAt;
        return b;
    }
    private JSONObject now() { return a.metaNow(); }
    private long progStart() { JSONObject m = now(); return m == null ? 0 : m.optLong("start"); }
    private long progEnd() { JSONObject m = now(); return m == null ? 0 : m.optLong("end"); }
    private boolean byProgramme() { return keptDays() > 0 && progStart() > 0 && progEnd() > progStart(); }

    @Override public long length() { return byProgramme() ? progEnd() - progStart() : hls() ? windowMs() : 60000; }
    @Override public long livePos() { return byProgramme() ? System.currentTimeMillis() - progStart() : hls() ? w.getDefaultPositionMs() : 60000; }
    @Override public long shown() { return Math.max(0, livePos() - behind()); }
    @Override public List<Timeline.Mark> ticks() { return new ArrayList<>(); }
    @Override public String current() { return null; }
    @Override public String title() { JSONObject m = now(); String t = m == null ? "" : m.optString("now"); return t.isEmpty() ? a.channelName() : t; }
    @Override public String sub() {
        StringBuilder b = new StringBuilder(a.channelName());
        if (byProgramme()) b.append(" · ").append(PlayerActivity.hm(progStart())).append(" to ").append(PlayerActivity.hm(progEnd()));
        if (!p.getPlayWhenReady()) b.append(" · paused");
        return b.toString();
    }
    @Override public String line1() {
        long ms = behind(), s = ms / 1000;
        return ms < 10 * 60000 ? s / 60 + ":" + String.format(java.util.Locale.ROOT, "%02d", s % 60) + " behind live" : Math.round(ms / 60000.0) + " min behind live";
    }
    @Override public String line2() {
        int d = keptDays();
        if (d > 0) return "Replays for " + d + " day" + (d == 1 ? "" : "s") + " on this channel";
        return hls() ? "This channel rewinds " + Math.round(windowMs() / 1000.0) + " s" : "This channel doesn't rewind";
    }
    @Override public boolean line1Eye() { return false; }
    @Override public String leftEnd(long pos) { return byProgramme() ? PlayerActivity.hm(progStart()) : hls() ? Math.round(windowMs() / 1000.0) + " s ago" : ""; }
    @Override public String rightEnd(long pos) { return byProgramme() ? PlayerActivity.hm(progEnd()) : ""; }
    @Override public boolean endHidden() { return false; }
    @Override public String bubble(long pos) { return byProgramme() ? PlayerActivity.hm(progStart() + pos) : "−" + Timeline.clock(livePos() - pos); }
    @Override public List<Timeline.Btn> buttons() {
        List<Timeline.Btn> b = new ArrayList<>();
        b.add(new Timeline.Btn("play", "play", null, false, false, p.getPlayWhenReady() ? "Pause" : "Play", this::toggle));
        if (keptDays() > 0) {
            if (byProgramme()) b.add(new Timeline.Btn("prev", "skipBack", null, false, false, "Start over", () -> rewindTo(progStart())));
            b.add(new Timeline.Btn("m1", null, "−1m", false, false, "Back 1 minute", () -> seekBy(-60000)));
            b.add(new Timeline.Btn("p1", null, "+1m", false, false, "On 1 minute", () -> seekBy(60000)));
        } else if (hls()) {
            b.add(new Timeline.Btn("m10", null, "−10", false, false, "Back 10 s", () -> seekBy(-10000)));
            b.add(new Timeline.Btn("p10", null, "+10", false, false, "On 10 s", () -> seekBy(10000)));
        }
        b.add(new Timeline.Btn("live", null, "Back to live", true, true, "Back to live", this::atLive));
        b.add(new Timeline.Btn("cc", "cc", null, false, true, "Subtitles", a::openSubtitles));
        b.add(new Timeline.Btn("audio", "audio", null, false, true, "Audio", a::openAudio));
        b.add(new Timeline.Btn("pic", "pic", null, false, true, "Picture size", a::openPicture));
        return b;
    }
    @Override public String buttonsKey() { return keptDays() + "|" + hls() + "|" + byProgramme(); }
    @Override public boolean playing() { return p.getPlayWhenReady(); }
    @Override public void toggle() {
        if (p.getPlayWhenReady()) { p.pause(); if (!hls()) pausedAt = System.currentTimeMillis(); }
        else {
            if (pausedAt > 0) { behindTs += System.currentTimeMillis() - pausedAt; pausedAt = 0; }
            if (a.droppedWhilePaused()) { a.resumeDroppedLive(System.currentTimeMillis() - behind()); return; }
            p.play();
        }
    }
    @Override public void seekBy(long ms) { seekTo(shown() + ms); }
    @Override public void seekTo(long pos) {
        long live = livePos();
        pos = Math.min(pos, live);
        if (pos >= live - 2000) { atLive(); return; }
        if (hls()) {
            long start = byProgramme() ? live - w.getDefaultPositionMs() : 0;   // where the HLS window starts on this bar
            long inWin = pos - start;
            if (inWin >= 0) { p.seekTo(inWin); return; }
        } else if (pos >= live - behind() - 500) return;   // a .ts stream can't go back: only forward to live
        if (keptDays() > 0) { rewindTo(System.currentTimeMillis() - (live - pos)); return; }
        a.showText("This channel doesn't rewind further", 2500);
    }
    /** Past what the live link holds, on a kept channel: the channel's replay from that moment (the app plays it). */
    private void rewindTo(long wallclock) {
        JSObject e = a.event("need");
        e.put("what", "rewind");
        e.put("at", wallclock);
        e.put("chId", a.channelId());
        TunerPlayerPlugin.emit(e);
        a.showText("Going back…", 3000);
    }
    @Override public long scrubMax() { return livePos(); }
    @Override public void atLive() { a.backToLiveFromPause(); }
    @Override public void options() { a.openOptions(); }
    @Override public void channel(int dir) { a.backToLiveFromPause(); a.zapFromPause(dir); }
    @Override public long step() { return 10000; }
}
