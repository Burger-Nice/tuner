package app.tuner.player;

import static org.junit.Assert.*;

import org.junit.Test;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.RandomAccessFile;
import java.util.List;
import java.util.zip.GZIPInputStream;

/** The quality check's pure parts, on the JVM: the fingerprint against OpenSubtitles' test vector, the Matroska header
 * walk, the HEVC SPS finder and the box walk (design/ui-v1/subtitles/PORT-NATIVE.md 1.3, 1.4). */
public class ProbeTest {
    private static File repo() {
        File d = new File(System.getProperty("user.dir")).getAbsoluteFile();
        while (d != null && !new File(d, "tests/fixtures/subs").isDirectory()) d = d.getParentFile();
        return d;
    }
    private static byte[] all(InputStream in) throws Exception {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        byte[] b = new byte[65536];
        int n;
        while ((n = in.read(b)) > 0) o.write(b, 0, n);
        return o.toByteArray();
    }

    @Test public void moviehashBreakdance() throws Exception {
        // OpenSubtitles' breakdance.avi, 12,909,756 bytes: its first 65,536 bytes, then its last 65,536
        byte[] both = all(new GZIPInputStream(new FileInputStream(new File(repo(), "tests/fixtures/subs/breakdance-blocks.bin.gz"))));
        assertEquals(131072, both.length);
        byte[] head = java.util.Arrays.copyOfRange(both, 0, 65536), tail = java.util.Arrays.copyOfRange(both, 65536, 131072);
        assertEquals("8e245d9679d31e12", Probe.movieHash(12909756L, head, tail));
    }

    @Test public void moviehashFakeFilm() throws Exception {
        // the fake provider's film (tests/make-media.sh; skipped when it hasn't been made): c66f32bd101993f2 in the JS too
        File f = new File(repo(), "tests/media/movie.mp4");
        if (!f.isFile() || f.length() != 2547988L) return;
        byte[] head = new byte[65536], tail = new byte[65536];
        try (RandomAccessFile r = new RandomAccessFile(f, "r")) { r.readFully(head); r.seek(f.length() - 65536); r.readFully(tail); }
        assertEquals("c66f32bd101993f2", Probe.movieHash(f.length(), head, tail));
    }

    // an EBML element: id bytes, a 1-byte size (< 127), body
    private static byte[] el(int[] id, byte[]... body) {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        for (byte[] b : body) o.write(b, 0, b.length);
        byte[] in = o.toByteArray();
        ByteArrayOutputStream e = new ByteArrayOutputStream();
        for (int x : id) e.write(x);
        e.write(0x80 | in.length);
        e.write(in, 0, in.length);
        return e.toByteArray();
    }
    private static byte[] u(int v) { return new byte[] { (byte) v }; }

    @Test public void matroskaLanguageTags() {
        byte[] video = el(new int[] { 0xAE }, el(new int[] { 0xD7 }, u(1)), el(new int[] { 0x83 }, u(1)));
        byte[] tagged = el(new int[] { 0xAE }, el(new int[] { 0xD7 }, u(3)), el(new int[] { 0x83 }, u(17)), el(new int[] { 0x22, 0xB5, 0x9C }, "ice".getBytes()));
        byte[] untagged = el(new int[] { 0xAE }, el(new int[] { 0xD7 }, u(2)), el(new int[] { 0x83 }, u(17)), el(new int[] { 0x55, 0xAA }, u(1)));
        byte[] bcp = el(new int[] { 0xAE }, el(new int[] { 0xD7 }, u(4)), el(new int[] { 0x83 }, u(2)), el(new int[] { 0x22, 0xB5, 0x9D }, "en-US".getBytes()));
        byte[] tracks = el(new int[] { 0x16, 0x54, 0xAE, 0x6B }, video, tagged, untagged, bcp);
        byte[] info = el(new int[] { 0x15, 0x49, 0xA9, 0x66 }, new byte[10]);
        byte[] segment = el(new int[] { 0x18, 0x53, 0x80, 0x67 }, info, tracks);
        byte[] header = el(new int[] { 0x1A, 0x45, 0xDF, 0xA3 }, el(new int[] { 0x42, 0x82 }, "matroska".getBytes()));
        byte[] file = new byte[header.length + segment.length];
        System.arraycopy(header, 0, file, 0, header.length);
        System.arraycopy(segment, 0, file, header.length, segment.length);
        assertEquals("mkv", Probe.containerOf(file));
        List<Probe.Ebml.Track> t = Probe.Ebml.tracks(file);
        assertEquals(4, t.size());
        assertFalse(t.get(0).tagged);
        assertEquals(17, t.get(1).type); assertTrue(t.get(1).tagged); assertEquals("ice", t.get(1).lang);
        assertEquals(17, t.get(2).type); assertFalse(t.get(2).tagged); assertTrue(t.get(2).forced);
        assertTrue(t.get(3).tagged);
        List<Probe.Ebml.Track> s = Probe.Ebml.sorted(t);
        assertEquals(2, s.get(1).number);   // Media3 lists Matroska tracks by number
    }

    @Test public void hevcSpsInStartCodedBuffer() {
        // VPS (type 32: 0x40 0x01), SPS (type 33: 0x42 0x01), PPS (type 34: 0x44 0x01), each after 00 00 00 01
        byte[] b = { 0, 0, 0, 1, 0x40, 0x01, 9, 9, 0, 0, 0, 1, 0x42, 0x01, 7, 7, 7, 0, 0, 0, 1, 0x44, 0x01, 5 };
        int[] r = Probe.spsNal(b);
        assertNotNull(r);
        assertEquals(12, r[0]);
        assertEquals(17, r[1]);
        assertNull(Probe.spsNal(new byte[] { 0, 0, 1, 0x40, 0x01, 1 }));
    }

    @Test public void boxWalk() {
        byte[] faststart = new byte[64];
        put(faststart, 0, 16, "ftyp"); put(faststart, 16, 24, "moov"); put(faststart, 40, 24, "mdat");
        assertEquals("mp4", Probe.containerOf(faststart));
        assertFalse(Probe.moovAfterMdat(faststart));
        byte[] atEnd = new byte[64];
        put(atEnd, 0, 16, "ftyp"); put(atEnd, 16, 1000000, "mdat");
        assertTrue(Probe.moovAfterMdat(atEnd));
    }
    private static void put(byte[] b, int at, int size, String type) {
        b[at] = (byte) (size >>> 24); b[at + 1] = (byte) (size >>> 16); b[at + 2] = (byte) (size >>> 8); b[at + 3] = (byte) size;
        for (int i = 0; i < 4; i++) b[at + 4 + i] = (byte) type.charAt(i);
    }

    @Test public void refusals() {
        assertTrue(Probe.refusedCode(458));
        assertTrue(Probe.refusedCode(509));
        assertTrue(Probe.refusedCode(503));
        assertFalse(Probe.refusedCode(404));
        assertTrue(Probe.saysMaxConnections("Maximum connections reached for this account"));
        assertTrue(Probe.saysMaxConnections("max_connections exceeded"));
        assertFalse(Probe.saysMaxConnections("Not found"));
    }
}
