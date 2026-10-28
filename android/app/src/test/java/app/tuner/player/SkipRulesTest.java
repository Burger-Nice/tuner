package app.tuner.player;

import static org.junit.Assert.*;

import org.junit.Test;

import java.util.ArrayList;
import java.util.List;

/** The checks on TheIntroDB's answer against the copy (design/ui-v1/skip/SPEC.md 9.3), the intro's subtitle check (9.4)
 * and the spoken-line filter, with the real answers of section 0 where they fit. */
public class SkipRulesTest {
    static final long SUNNY = 1321000;   // It's Always Sunny S1 E1: 22:01

    static SkipRules.Answer ans(long d) { SkipRules.Answer a = new SkipRules.Answer(); a.d = d; return a; }
    static long[][] w(long... v) { long[][] o = new long[v.length / 2][]; for (int i = 0; i < o.length; i++) o[i] = new long[] { v[2 * i], v[2 * i + 1] }; return o; }
    static SkipRules.Cue cue(long s, long e, String t) { return new SkipRules.Cue(s, e, t, t.startsWith("<i>")); }
    /** A file whose lines run every 3 s through the whole episode except inside [from, to). */
    static List<SkipRules.Cue> story(long d, long from, long to) {
        List<SkipRules.Cue> l = new ArrayList<>();
        for (long t = 1000; t < d; t += 3000) if (t + 2400 <= from || t >= to) l.add(cue(t, t + 2400, "Line at " + t));
        return l;
    }

    @Test public void theNormalCase() {
        SkipRules.Answer a = ans(SUNNY);
        a.intro = w(104000, 131646);
        a.credits = w(1288000, 0);
        SkipRules.Result r = SkipRules.check(a);
        assertArrayEquals(new long[] { 104000, 131646 }, r.intro);
        assertEquals(1288000, r.credits);
        assertFalse(r.introChipOnly);
        assertEquals("This episode: intro and credits known.", r.foot());
    }
    @Test public void onlyCredits() {
        SkipRules.Answer a = ans(1330000);
        a.credits = w(1299000, 0);
        SkipRules.Result r = SkipRules.check(a);
        assertNull(r.intro);
        assertEquals(1299000, r.credits);
        assertEquals("This episode: credits known.", r.foot());
        assertEquals("Not known for this episode.", SkipRules.check(ans(1330000)).foot());
    }
    @Test public void aWrongCreditsLabelIsDropped() {   // SK-18: Stranger Things' shape, "credits" at 5:51 of 22:00
        SkipRules.Answer a = ans(1320000);
        a.intro = w(350700, 398800);
        a.credits = w(351200, 399700);
        SkipRules.Result r = SkipRules.check(a);
        assertEquals(-1, r.credits);
        assertNotNull(r.intro);
    }
    @Test public void aRecapThenAShortIntro() {   // Lost S2 E1
        SkipRules.Answer a = ans(2600000);
        a.recap = w(2000, 28000);
        a.intro = w(239000, 250500);
        a.credits = w(2568000, 0);
        SkipRules.Result r = SkipRules.check(a);
        assertArrayEquals(new long[] { 2000, 28000 }, r.recap);
        assertArrayEquals(new long[] { 239000, 250500 }, r.intro);
        assertEquals("This episode: recap, intro and credits known.", r.foot());
    }
    @Test public void lengthsAndPlaces() {
        SkipRules.Answer a = ans(SUNNY);
        a.intro = w(100000, 106000);   // a 6 s card
        assertNull(SkipRules.check(a).intro);
        a.intro = w(6000, 112800);     // Game of Thrones' 107 s
        assertNotNull(SkipRules.check(a).intro);
        a.intro = w(10000, 200000);    // over 3 min
        assertNull(SkipRules.check(a).intro);
        a.intro = w(600000, 630000);   // past the first 40%
        assertNull(SkipRules.check(a).intro);
        a.intro = w(500000, 530000);
        a.credits = w(1288000, 0);
        assertNotNull(SkipRules.check(a).intro);
        a.recap = w(500000, 530000);   // a recap after the first 8 min
        assertNull(SkipRules.check(a).recap);
        a.recap = w(0, 4000);          // too short
        assertNull(SkipRules.check(a).recap);
        a.credits = w(1315000, 0);     // 6 s before the end
        assertEquals(-1, SkipRules.check(a).credits);
        a.credits = w(1500000, 0);     // past the end
        assertEquals(-1, SkipRules.check(a).credits);
        a.intro = w(104000, 131646);
        a.credits = w(1300000, 0);
        a.preview = w(1290000, 0);     // a preview's earlier start counts as the credits start
        assertEquals(1290000, SkipRules.check(a).credits);
    }
    @Test public void anIntroTooCloseToTheCredits() {
        SkipRules.Answer a = ans(SUNNY);
        a.intro = w(450000, 480000);
        a.credits = w(1000000, 0);   // (not in the last 25%: dropped, so the end counts)
        assertNotNull(SkipRules.check(a).intro);
        a.d = 600000;
        a.intro = w(200000, 230000);
        a.credits = w(470000, 0);    // 470 - 60 = 410 >= 230: kept
        assertNotNull(SkipRules.check(a).intro);
        a.intro = w(200000, 230000);
        a.credits = w(280000, 0);    // not in the last 25% either
        assertNotNull(SkipRules.check(a).intro);
    }
    @Test public void twoIntros() {   // Severance S1 E2
        SkipRules.Answer a = ans(3300000);
        a.intro = w(320600, 400000, 401600, 481000);
        SkipRules.Result r = SkipRules.check(a);
        assertNull(r.intro);
        assertTrue(r.introsUnsure);
        assertEquals("Intro times unsure for this episode.", r.foot());
        a.anchored = story(3300000, 401600, 481000);   // speech through the first one, silence in the second
        r = SkipRules.check(a);
        assertNotNull(r.intro);
        assertEquals(401600, r.intro[0], 3000);
        a.anchored = story(3300000, 0, 0);             // speech through both: a tie
        assertNull(SkipRules.check(a).intro);
    }
    @Test public void theSubtitleCheck() {
        SkipRules.Answer a = ans(SUNNY);
        a.intro = w(104000, 131646);
        a.anchored = story(SUNNY, 104000, 131646);
        SkipRules.Result r = SkipRules.check(a);
        assertTrue(r.introChecked);
        assertFalse(r.introChipOnly);
        // 1 or 2 spoken lines inside: the chip, never by itself
        a.anchored.add(cue(115000, 117000, "Wait, what?"));
        a.anchored.add(cue(118000, 120000, "Nothing."));
        sort(a.anchored);
        r = SkipRules.check(a);
        assertNotNull(r.intro);
        assertTrue(r.introChipOnly);
    }
    @Test public void threeLinesThatLookLikeAnOffset() {   // SK-19
        SkipRules.Answer a = ans(SUNNY);
        a.intro = w(104000, 131646);
        a.anchored = story(SUNNY, 104000, 131646);
        a.anchored.add(cue(112000, 114000, "So we're agreed."));   // 8 s from its start
        a.anchored.add(cue(116000, 118000, "On the plan."));
        a.anchored.add(cue(120000, 122000, "Nobody tells Mac."));
        sort(a.anchored);
        SkipRules.Result r = SkipRules.check(a);
        assertNull(r.intro);
        assertEquals("Not known for this episode.", r.foot());
    }
    @Test public void lyricsKeepTheChip() {   // SK-30
        SkipRules.Answer a = ans(SUNNY);
        a.intro = w(104000, 131646);
        a.anchored = story(SUNNY, 104000, 131646);
        for (int k = 0; k < 6; k++) a.anchored.add(cue(108000 + k * 3500, 110500 + k * 3500, "<i>Sing the theme</i>"));
        sort(a.anchored);
        SkipRules.Result r = SkipRules.check(a);
        assertNotNull(r.intro);
        assertTrue(r.introChipOnly);
    }
    @Test public void edgesTrim() {
        SkipRules.Answer a = ans(SUNNY);
        a.intro = w(104000, 131646);
        a.anchored = story(SUNNY, 104000, 131646);
        a.anchored.add(cue(103000, 106000, "the cold open's last word"));
        a.anchored.add(cue(129000, 131000, "the scene's first"));
        sort(a.anchored);
        SkipRules.Result r = SkipRules.check(a);
        assertArrayEquals(new long[] { 106000, 129000 }, r.intro);
        assertFalse(r.introChipOnly);
        a.intro = w(104000, 114000);   // trimmed under 8 s: nothing
        a.anchored = story(SUNNY, 104000, 114000);
        a.anchored.add(cue(103000, 106500, "a"));
        a.anchored.add(cue(110000, 113000, "b"));
        sort(a.anchored);
        assertNull(SkipRules.check(a).intro);
    }
    @Test public void aCreditInASilentIntro() {   // SK-29: "Synced by" alone, and a lone line far from any other
        SkipRules.Answer a = ans(SUNNY);
        a.intro = w(104000, 131646);
        a.anchored = story(SUNNY, 90000, 145000);
        a.anchored.add(cue(115000, 117000, "Synced and corrected by Jón"));
        sort(a.anchored);
        SkipRules.Result r = SkipRules.check(a);
        assertTrue(r.introChecked);
        a.anchored = story(SUNNY, 90000, 145000);
        a.anchored.add(cue(115000, 117000, "Hello?"));   // 25 s from the nearest line
        sort(a.anchored);
        assertTrue(SkipRules.check(a).introChecked);
    }
    @Test public void spokenLines() {
        assertTrue(SkipRules.spoken("I don't know."));
        assertTrue(SkipRules.spoken("Hello [laughs]"));
        assertFalse(SkipRules.spoken("♪ ♪"));
        assertFalse(SkipRules.spoken("♪ La la la ♪".replace("La la la", "")));
        assertFalse(SkipRules.spoken("[door slams]"));
        assertFalse(SkipRules.spoken("(SIGHS)"));
        assertFalse(SkipRules.spoken("www.OpenSubtitles.org"));
        assertFalse(SkipRules.spoken("Support us and become VIP member"));
        assertFalse(SkipRules.spoken("Subtitles by explosiveskull"));
        assertFalse(SkipRules.spoken("Þýðandi: Jón Jónsson"));
        assertFalse(SkipRules.spoken("Íslenskur texti: RÚV"));
        assertFalse(SkipRules.spoken("visit example.com"));
        assertFalse(SkipRules.spoken(""));
    }
    @Test public void theCreditsPush() {   // SK-24 and SK-29
        List<SkipRules.Cue> l = story(SUNNY, 1288000, SUNNY);
        assertEquals(-1, SkipRules.lastSpokenAfter(l, 1288000 + 5000));
        l.add(cue(1291000, 1293000, "a line running over the cut"));   // 3 s after the start
        assertEquals(-1, SkipRules.lastSpokenAfter(l, 1288000 + 5000));
        l.add(cue(1308000, 1310000, "www.OpenSubtitles.org"));       // an advert 20 s after
        assertEquals(-1, SkipRules.lastSpokenAfter(l, 1288000 + 5000));
        l.add(cue(1318000, 1320500, "Wait, where's Dennis?"));        // speech 30 s after
        assertEquals(1320500, SkipRules.lastSpokenAfter(l, 1288000 + 5000));
        assertEquals(1320500, SkipRules.lastSpoken(l));
    }
    @Test public void lengths() {
        assertEquals("28 s", Skips.length(27646));
        assertEquals("26 s", Skips.length(26000));
        assertEquals("3 min", Skips.length(180000));
        assertEquals("99 s", Skips.length(99000));
    }
    static void sort(List<SkipRules.Cue> l) { l.sort((x, y) -> Long.compare(x.start, y.start)); }
}
