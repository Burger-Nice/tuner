package app.tuner.player;

import static org.junit.Assert.*;

import org.junit.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

/** The home-network phone page (design/ui-v1/addons/PORT-NATIVE.md 5): which links it takes, the request reader's
 * limits, and the code compare. */
public class PhonePageTest {
    @Test public void manifestLinksOnly() {
        assertEquals("https://northlight.example/eyJabc/manifest.json", PhonePage.manifestLink("  https://northlight.example/eyJabc/manifest.json "));
        assertEquals("http://192.168.1.5:7000/manifest.json", PhonePage.manifestLink("http://192.168.1.5:7000/manifest.json"));
        assertEquals("https://torrentio.example/a%7Cb/manifest.json", PhonePage.manifestLink("stremio://torrentio.example/a%7Cb/manifest.json"));
        assertNull(PhonePage.manifestLink("https://example.com/page"));
        assertNull(PhonePage.manifestLink("https://example.com/manifest.json?x=1"));
        assertNull(PhonePage.manifestLink("https://user:pw@example.com/manifest.json"));
        assertNull(PhonePage.manifestLink("javascript:alert(1)//manifest.json"));
        assertNull(PhonePage.manifestLink("file:///sdcard/manifest.json"));
        assertNull(PhonePage.manifestLink("https://a b/manifest.json"));
        assertNull(PhonePage.manifestLink(""));
        assertNull(PhonePage.manifestLink(null));
        StringBuilder big = new StringBuilder("https://e.com/");
        while (big.length() < 2100) big.append('a');
        assertNull(PhonePage.manifestLink(big + "/manifest.json"));
    }
    @Test public void readsARequest() throws Exception {
        String body = "{\"url\":\"https://e.com/manifest.json\"}";
        String raw = "POST /tok123456/send?x=1 HTTP/1.1\r\nHost: 10.0.2.15:8790\r\nContent-Length: " + body.length() + "\r\n\r\n" + body;
        PhonePage.Req r = PhonePage.read(new ByteArrayInputStream(raw.getBytes(StandardCharsets.UTF_8)));
        assertEquals("POST", r.method);
        assertEquals("/tok123456/send", r.path);
        assertEquals(body, new String(r.body, StandardCharsets.UTF_8));
        assertFalse(r.tooBig);
    }
    @Test public void refusesABigBody() throws Exception {
        String raw = "POST /x/send HTTP/1.1\r\nContent-Length: 5000\r\n\r\n";
        assertTrue(PhonePage.read(new ByteArrayInputStream(raw.getBytes(StandardCharsets.UTF_8))).tooBig);
    }
    @Test(expected = java.io.IOException.class) public void refusesHugeHeaders() throws Exception {
        StringBuilder b = new StringBuilder("GET / HTTP/1.1\r\n");
        while (b.length() < 9000) b.append("X-A: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\r\n");
        PhonePage.read(new ByteArrayInputStream(b.toString().getBytes(StandardCharsets.UTF_8)));
    }
    @Test public void comparesCodes() {
        assertTrue(PhonePage.same("482193", "482193"));
        assertFalse(PhonePage.same("482194", "482193"));
        assertFalse(PhonePage.same("", "482193"));
        assertFalse(PhonePage.same(null, "482193"));
    }
}
