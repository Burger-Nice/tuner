package app.tuner.player;

import android.graphics.Typeface;
import android.os.Handler;
import android.text.SpannableStringBuilder;
import android.text.Spanned;
import android.text.style.StyleSpan;

import androidx.media3.common.text.Cue;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.SubtitleView;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A downloaded subtitle file (design/ui-v1/subtitles/PORT-NATIVE.md 2): the cues from the SRT text the app sends (no
 * download here), shown at start × speed + the automatic offset + his own "Early or late", in airglow's own
 * SubtitleView, so a timing step or a file change shows at once with no re-buffer.
 */
final class SrtTrack {
    static final class Line {
        final long start, end;       // ms, as in the file
        final String plain;          // the words, tags taken out
        final int[] italics;         // [from, to) pairs in plain: <i>
        private CharSequence text;
        Line(long s, long e, String p, int[] it) { start = s; end = e; plain = p; italics = it; }
        /** The words with <i> as italic (made when first shown). */
        CharSequence text() {
            if (text != null) return text;
            if (italics.length == 0) return text = plain;
            SpannableStringBuilder b = new SpannableStringBuilder(plain);
            for (int i = 0; i + 1 < italics.length; i += 2) b.setSpan(new StyleSpan(Typeface.ITALIC), italics[i], italics[i + 1], Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            return text = b;
        }
    }

    final String id, lang, verdict, words, release;
    final boolean anchored, sounds;
    final double speed, autoOffset;   // the automatic fix (SPEC 3.4)
    double mine;                      // his Early or late, seconds in 0.5 steps (later = positive)
    final double mineAtStart;
    final List<Line> lines;

    SrtTrack(String id, String lang, String text, double speed, double autoOffset, double mine, String verdict, String words, boolean anchored, boolean sounds, String release) {
        this.id = id; this.lang = lang;
        this.speed = speed > 0 ? speed : 1;
        this.autoOffset = autoOffset;
        this.mine = mine;
        this.mineAtStart = mine;
        this.verdict = verdict; this.words = words; this.anchored = anchored; this.sounds = sounds; this.release = release;
        this.lines = parse(text);
    }

    /** When a line shows and goes, on the film's clock (ms). */
    long showAt(Line l) { return Math.round(l.start * speed + (autoOffset + mine) * 1000); }
    long hideAt(Line l) { return Math.round(l.end * speed + (autoOffset + mine) * 1000); }

    /** The first line shown after pos (as timed now), or -1. */
    int nextAfter(long pos) {
        int lo = 0, hi = lines.size();
        while (lo < hi) { int m = (lo + hi) >>> 1; if (showAt(lines.get(m)) <= pos) lo = m + 1; else hi = m; }
        return lo < lines.size() ? lo : -1;
    }

    // ---------- the reader: index, "hh:mm:ss,mmm --> hh:mm:ss,mmm", lines, a blank line ----------
    private static final Pattern TIME = Pattern.compile("(\\d{1,2}):(\\d{2}):(\\d{2})[,.](\\d{1,3})\\s*-->\\s*(\\d{1,2}):(\\d{2}):(\\d{2})[,.](\\d{1,3})");
    private static final Pattern TAG = Pattern.compile("<(/?)([a-zA-Z]+)[^>]*>|\\{\\\\[^}]*\\}");
    static List<Line> parse(String srt) {
        List<Line> out = new ArrayList<>();
        if (srt == null) return out;
        String[] rows = srt.replace("\r\n", "\n").replace('\r', '\n').split("\n");
        int i = 0;
        while (i < rows.length) {
            Matcher m = TIME.matcher(rows[i]);
            if (!m.find()) { i++; continue; }
            long s = ms(m, 1), e = ms(m, 5);
            i++;
            StringBuilder raw = new StringBuilder();
            while (i < rows.length && !rows[i].trim().isEmpty()) {
                if (TIME.matcher(rows[i]).find()) break;
                if (raw.length() > 0) raw.append('\n');
                raw.append(rows[i].trim());
                i++;
            }
            if (raw.length() == 0 || e <= s) continue;
            Line l = styled(s, e, raw.toString());
            if (!l.plain.trim().isEmpty()) out.add(l);
        }
        Collections.sort(out, (a, b) -> Long.compare(a.start, b.start));
        return out;
    }
    private static long ms(Matcher m, int g) {
        String f = m.group(g + 3);
        long frac = Long.parseLong(f) * (f.length() == 1 ? 100 : f.length() == 2 ? 10 : 1);
        return ((Long.parseLong(m.group(g)) * 60 + Long.parseLong(m.group(g + 1))) * 60 + Long.parseLong(m.group(g + 2))) * 1000 + frac;
    }
    /** <i> becomes italic; every other tag is dropped. */
    static Line styled(long start, long end, String s) {
        StringBuilder b = new StringBuilder();
        List<Integer> it = new ArrayList<>();
        Matcher m = TAG.matcher(s);
        int at = 0, italicFrom = -1;
        while (m.find()) {
            b.append(s, at, m.start());
            at = m.end();
            String name = m.group(2);
            if (name == null || !name.equalsIgnoreCase("i")) continue;
            if (m.group(1).isEmpty()) { if (italicFrom < 0) italicFrom = b.length(); }
            else if (italicFrom >= 0) { if (b.length() > italicFrom) { it.add(italicFrom); it.add(b.length()); } italicFrom = -1; }
        }
        b.append(s, at, s.length());
        if (italicFrom >= 0 && b.length() > italicFrom) { it.add(italicFrom); it.add(b.length()); }
        int[] r = new int[it.size()];
        for (int i = 0; i < r.length; i++) r[i] = it.get(i);
        return new Line(start, end, b.toString(), r);
    }

    /**
     * Draws a track in its own SubtitleView: setCues() only at boundaries (a post at the next line's start or end), and
     * at once on seek, pause, resume, a speed change and a timing step (PORT-NATIVE.md 2.3).
     */
    static final class Drawer {
        final SubtitleView view;
        private final Handler h;
        private final ExoPlayer p;
        SrtTrack track;
        private final List<Line> showing = new ArrayList<>();
        Runnable onLine;          // a line just showed (the "timing not checked" chip waits for the first)
        String lastText = "";     // (the emulator test reads it: what shows now, the last line shown, how many have)
        String lastShown = "";
        int shownCount;
        private final Runnable tick = this::update;

        Drawer(SubtitleView view, Handler h, ExoPlayer p) { this.view = view; this.h = h; this.p = p; }

        void set(SrtTrack t) { track = t; showing.clear(); update(); }

        void update() {
            h.removeCallbacks(tick);
            if (track == null) { showing.clear(); view.setCues(Collections.emptyList()); lastText = ""; return; }
            long pos = p.getCurrentPosition();
            List<Line> on = new ArrayList<>();
            long next = Long.MAX_VALUE;
            int k = track.nextAfter(pos);
            if (k >= 0) next = track.showAt(track.lines.get(k));
            // the lines on now: they started at or before pos (a line is at most a minute long)
            for (int i = (k < 0 ? track.lines.size() : k) - 1; i >= 0; i--) {
                Line l = track.lines.get(i);
                long s = track.showAt(l), e = track.hideAt(l);
                if (s < pos - 60000) break;
                if (s <= pos && e > pos) { on.add(0, l); next = Math.min(next, e); }
            }
            if (!on.equals(showing)) {
                boolean fresh = !on.isEmpty() && (showing.isEmpty() || !showing.contains(on.get(on.size() - 1)));
                showing.clear();
                showing.addAll(on);
                List<Cue> cues = new ArrayList<>();
                StringBuilder all = new StringBuilder();
                for (Line l : on) { cues.add(new Cue.Builder().setText(l.text()).build()); if (all.length() > 0) all.append('\n'); all.append(l.plain); }
                view.setCues(cues);
                lastText = all.toString();
                if (fresh) { shownCount++; lastShown = on.get(on.size() - 1).plain; }
                if (fresh && onLine != null) onLine.run();
            }
            if (p.isPlaying() && next != Long.MAX_VALUE) {
                float sp = Math.max(0.25f, p.getPlaybackParameters().speed);
                h.postDelayed(tick, Math.max(10, (long) ((next - pos) / sp) + 5));
            }
        }
        void stop() { h.removeCallbacks(tick); }
    }
}
