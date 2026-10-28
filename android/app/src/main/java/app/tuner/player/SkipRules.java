package app.tuner.player;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * The checks on TheIntroDB's answer against this copy (design/ui-v1/skip/SPEC.md 9.3), the subtitle check of the intro
 * (9.4) and the spoken-line filter that the credits push and Up next's subtitle rule use too. Plain Java, no Android:
 * tested by app/src/test/.../SkipRulesTest.java.
 */
final class SkipRules {
    private SkipRules() {}

    /** A subtitle line as drawn (ms on the copy's clock: the file's fix, its speed and his Early or late steps). */
    static final class Cue {
        final long start, end;
        final String text;
        final boolean italic;   // mostly <i>: how lyrics are set
        Cue(long start, long end, String text, boolean italic) { this.start = start; this.end = end; this.text = text == null ? "" : text; this.italic = italic; }
    }

    /** What the checks get: the copy's length, the app's lists ({start, end} ms; a credits or preview end of 0 runs to
     * the end), and the anchored downloaded file's lines, or null when there is none ready. */
    static final class Answer {
        long d;
        long[][] recap = {}, intro = {}, credits = {}, preview = {};
        List<Cue> anchored;
    }

    /** What is left: at most one recap and one intro (null: none), where the credits start (-1: not known). */
    static final class Result {
        long[] recap, intro;
        boolean introChipOnly;   // spoken lines inside (1 or 2, lyrics, or well inside): the chip, never by itself
        boolean introChecked;    // an anchored file looked at it and found no speech inside
        boolean introsUnsure;    // two intros and nothing to settle it ("Intro times unsure for this episode.")
        long credits = -1;
        /** The Options foot's first line (4.1): the parts known, in order, or why none. */
        String foot() {
            List<String> k = new ArrayList<>();
            if (recap != null) k.add("recap");
            if (intro != null) k.add("intro");
            if (credits >= 0) k.add("credits");
            if (k.isEmpty()) return introsUnsure ? "Intro times unsure for this episode." : "Not known for this episode.";
            if (introsUnsure && intro == null) return "Intro times unsure for this episode.";
            StringBuilder b = new StringBuilder("This episode: ");
            for (int i = 0; i < k.size(); i++) b.append(i == 0 ? "" : i == k.size() - 1 ? " and " : ", ").append(k.get(i));
            return b.append(" known.").toString();
        }
    }

    static final long MIN_WINDOW = 8000;

    static Result check(Answer a) {
        Result r = new Result();
        long d = a.d;
        if (d <= 0) return r;
        // credits and a preview: in the last 25%, 10 s to 12 min before the end (a preview's start counts when earlier)
        List<Long> cs = new ArrayList<>();
        for (long[][] l : new long[][][] { a.credits, a.preview }) for (long[] c : l) {
            long s = c[0];
            if (s >= 0 && s < d && s >= d * 0.75 && d - s >= 10000 && d - s <= 12 * 60000) cs.add(s);
        }
        java.util.Collections.sort(cs);
        long credits0 = cs.isEmpty() ? -1 : cs.get(0);
        // the recap: starts in the first 8 min, 5 s to 5 min long (and 8 s for a chip, 3.1)
        for (long[] x : a.recap) {
            long s = x[0], e = x[1], len = e - s;
            if (s >= 0 && s < 8 * 60000 && e <= d && len >= Math.max(5000, MIN_WINDOW) && len <= 5 * 60000) { r.recap = new long[] { s, e }; break; }
        }
        // the intro: starts in the first 40%, 8 s to 3 min, ends 60 s or more before the credits (or the end)
        List<long[]> intros = new ArrayList<>();
        long limit = (credits0 >= 0 ? credits0 : d) - 60000;
        for (long[] x : a.intro) {
            long s = x[0], e = x[1], len = e - s;
            if (s >= 0 && s <= d * 0.4 && e <= d && e <= limit && len >= MIN_WINDOW && len <= 3 * 60000) intros.add(new long[] { s, e });
        }
        if (intros.size() > 1) {
            // two versions of the truth: an anchored file picks the one with fewer spoken lines inside; a tie or no file, none
            r.introsUnsure = true;
            if (a.anchored != null) {
                long[] best = null;
                int bestN = Integer.MAX_VALUE;
                boolean tie = false;
                for (long[] w : intros) {
                    long[] t = trim(w, a.anchored);
                    int n = t == null ? Integer.MAX_VALUE - 1 : inside(t, a.anchored).size();
                    if (n < bestN) { best = w; bestN = n; tie = false; } else if (n == bestN) tie = true;
                }
                if (!tie && best != null) { intros.clear(); intros.add(best); r.introsUnsure = false; }
            }
            if (r.introsUnsure) intros.clear();
        }
        if (!intros.isEmpty()) {
            long[] w = intros.get(0);
            if (a.anchored == null) r.intro = w;
            else {
                long[] t = trim(w, a.anchored);
                if (t != null) {
                    List<Cue> in = inside(t, a.anchored);
                    if (in.isEmpty()) { r.intro = t; r.introChecked = true; }
                    else if (in.size() <= 2) { r.intro = t; r.introChipOnly = true; }
                    else if (!offsetLike(t, in)) { r.intro = t; r.introChipOnly = true; }   // lyrics, or speech well inside: a sung theme keeps its button
                }
            }
        }
        // the credits start after the intro's end
        for (long s : cs) if (r.intro == null || s >= r.intro[1]) { r.credits = s; break; }
        return r;
    }

    /** Spoken lines within 5 s of an edge trim the window to clear them (a cold open's last word, the scene's first);
     * a window trimmed under 8 s gets nothing (null). */
    static long[] trim(long[] w, List<Cue> cues) {
        long s = w[0], e = w[1];   // (one pass, from the window's own edges: dense speech or lyrics don't eat it away)
        for (Cue c : cues) {
            if (!counts(c, cues)) continue;
            if (c.start < w[0] + 5000 && c.end > w[0]) s = Math.max(s, c.end);
            if (c.end > w[1] - 5000 && c.start < w[1]) e = Math.min(e, c.start);
        }
        return e - s < MIN_WINDOW ? null : new long[] { s, e };
    }
    /** The spoken lines inside a window (a lone cue more than 10 s from any other is a credit placed in a silent intro). */
    static List<Cue> inside(long[] w, List<Cue> cues) {
        List<Cue> out = new ArrayList<>();
        for (Cue c : cues) if (c.start < w[1] && c.end > w[0] && counts(c, cues)) out.add(c);
        return out;
    }
    /** 3 or more lines inside look like an offset copy when non-italic speech sits within 15 s of an edge: the story's
     * speech running into the window. */
    static boolean offsetLike(long[] w, List<Cue> in) {
        for (Cue c : in) if (!c.italic && (c.start < w[0] + 15000 || c.end > w[1] - 15000)) return true;
        return false;
    }
    private static boolean counts(Cue c, List<Cue> all) {
        if (!spoken(c.text)) return false;
        for (Cue o : all) if (o != c && Math.max(o.start - c.end, c.start - o.end) <= 10000) return true;
        return false;   // alone: more than 10 s from any other line
    }

    // ---------- a spoken line (9.4) ----------
    private static final Pattern WEB = Pattern.compile("www\\.|http|\\.com\\b|\\.org\\b|\\.net\\b");
    private static final Pattern WORDS = Pattern.compile("subtitles? by|\\bsync(ed)?\\b|\\bcorrected\\b|\\bripped\\b|translated by|\\btranslation\\b|\\bencoded\\b|opensubtitles|addic7ed|podnapisi|become vip|support us|þýðandi|þýðing|íslenskur texti|texti:");
    private static final Pattern NOT_WORDS = Pattern.compile("\\[[^\\]]*\\]|\\([^)]*\\)|[♪♫#\\s\\p{P}\\p{S}]");
    /** A cue whose text is speech: not only music (♪ ♫), sounds in brackets, or empty, and not a web address, a
     * subtitler's credit or an advert. */
    static boolean spoken(String text) {
        if (text == null) return false;
        if (NOT_WORDS.matcher(text).replaceAll("").isEmpty()) return false;
        String l = text.toLowerCase(Locale.ROOT);
        return !WEB.matcher(l).find() && !WORDS.matcher(l).find();
    }
    /** Where the last spoken line ends (-1: none), for Up next's subtitle rule. */
    static long lastSpoken(List<Cue> cues) {
        for (int i = cues.size() - 1; i >= 0; i--) if (spoken(cues.get(i).text)) return cues.get(i).end;
        return -1;
    }
    /** Where the last spoken line that starts after `from` ends (-1: none), for the credits push (5.1). */
    static long lastSpokenAfter(List<Cue> cues, long from) {
        long out = -1;
        for (Cue c : cues) if (c.start > from && spoken(c.text)) out = Math.max(out, c.end);
        return out;
    }
}
