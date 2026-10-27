package app.tuner.player;

import static org.junit.Assert.*;

import org.junit.Test;

import java.util.List;

/** The downloaded subtitles' reader and timing (design/ui-v1/subtitles/PORT-NATIVE.md 2.2): cues at
 * start x speed + the automatic offset + his own, and the strip's words. */
public class SrtTrackTest {
    static final String SRT = "1\r\n00:00:01,000 --> 00:00:03,400\r\nÉg veit það ekki.\r\n\r\n"
            + "2\n00:00:04,000 --> 00:00:06,400\n<i>Hvað er að þér?</i>\n\n"
            + "3\n00:01:02,5 --> 00:01:04,250\n<font color=\"#fff\">Það er</font> <b>ekki</b>\nhægt <i>núna</i>.\n\n"
            + "x\nnot a cue\n\n4\n00:00:10,000 --> 00:00:09,000\nbackwards\n";

    @Test public void reads() {
        List<SrtTrack.Line> l = SrtTrack.parse(SRT);
        assertEquals(3, l.size());
        assertEquals(1000, l.get(0).start);
        assertEquals(3400, l.get(0).end);
        assertEquals("Ég veit það ekki.", l.get(0).plain);
        assertEquals("Hvað er að þér?", l.get(1).plain);
        assertArrayEquals(new int[] { 0, 15 }, l.get(1).italics);
        assertEquals(62500, l.get(2).start);
        assertEquals(64250, l.get(2).end);
        assertEquals("Það er ekki\nhægt núna.", l.get(2).plain);
        assertArrayEquals(new int[] { 17, 21 }, l.get(2).italics);
    }

    @Test public void timing() {
        // the Icelandic file of the spec: 25/23.976 and +0.4 s, then his 1.5 s later
        SrtTrack t = new SrtTrack("is", "Icelandic", SRT, 25 / 23.976, 0.4, 1.5, "fixed", "Timing fixed to fit this film", false, false, "rel");
        SrtTrack.Line a = t.lines.get(0);
        assertEquals(Math.round(1000 * 25 / 23.976 + 1900), t.showAt(a));
        assertEquals(Math.round(3400 * 25 / 23.976 + 1900), t.hideAt(a));
        // a step moves the next line by 0.5 s
        long before = t.showAt(t.lines.get(1));
        t.mine += 0.5;
        assertEquals(before + 500, t.showAt(t.lines.get(1)));
        // the next line after a position, as timed now
        assertEquals(0, t.nextAfter(0));
        assertEquals(1, t.nextAfter(t.showAt(a)));
        assertEquals(-1, t.nextAfter(10_000_000));
    }

    @Test public void words() {
        assertEquals("As downloaded", Subs.timingValue(0));
        assertEquals("1.5 s later", Subs.timingValue(1.5));
        assertEquals("2 s earlier", Subs.timingValue(-2));
        assertEquals("0.5 s later", Subs.timingValue(0.5));
    }
}
