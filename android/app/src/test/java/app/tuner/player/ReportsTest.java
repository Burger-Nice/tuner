package app.tuner.player;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** The native side's error-report rules (Reports.codeFor and net; design/ui-v1/error-reports/SPEC.md §3), with no
 *  Android or Media3 objects: an exception's message leaves the TV only for the JVM's own types, and then through the net. */
public class ReportsTest {
    private static final String LINK = "http://tv.examplepanel.net:8080/live/u-Hk29x/p%40ss%2BZq7%23r9/1234.ts";

    @Test public void networkAndParserErrorsBecomeReasonCodes() {
        assertEquals("dns", Reports.codeFor("UnknownHostException", "dns", null, 0, false, "Unable to resolve host \"tv.examplepanel.net\""));
        assertEquals("refused", Reports.codeFor("ConnectException", "refused", null, 0, false, "failed to connect to tv.examplepanel.net/1.2.3.4 (port 8080)"));
        assertEquals("timeout", Reports.codeFor("SocketTimeoutException", "timeout", null, 0, false, "timeout"));
        assertEquals("tls", Reports.codeFor("SSLHandshakeException", "tls", null, 0, false, "x"));
        assertEquals("404", Reports.codeFor("FileNotFoundException", "404", null, 0, false, LINK));
        assertEquals("json", Reports.codeFor("JSONException", "json", null, 0, false, "Value <html> at " + LINK + " cannot be converted"));
        assertEquals("http-403", Reports.codeFor("InvalidResponseCodeException", "http-code", null, 403, false, "Response code: 403 " + LINK));
        assertEquals("ERROR_CODE_IO_BAD_HTTP_STATUS", Reports.codeFor("ExoPlaybackException", "playback", "ERROR_CODE_IO_BAD_HTTP_STATUS", 0, false, "Source error " + LINK));
    }

    @Test public void anythingElseKeepsItsClassNameOnly() {
        assertEquals("RuntimeException", Reports.codeFor("RuntimeException", "", null, 0, true, "Forced test crash at " + LINK));
        assertEquals("IllegalStateException", Reports.codeFor("IllegalStateException", "own", null, 0, false, "thrown by a library " + LINK));
    }

    @Test public void jvmMessagesAreKeptButStillNetted() {
        assertEquals("Attempt to invoke virtual method 'int java.lang.String.length()' on a null object reference",
            Reports.codeFor("NullPointerException", "jvm", null, 0, true, "Attempt to invoke virtual method 'int java.lang.String.length()' on a null object reference"));
        String v = Reports.codeFor("IllegalStateException", "own", null, 0, true, "bad state for " + LINK + " and leak.test@example.com");
        assertFalse(v, v.contains("examplepanel") || v.contains("Hk29x") || v.contains("example.com") || v.contains("/live/"));
        assertTrue(v, v.startsWith("bad state for <link>"));
    }

    @Test public void theNet() {
        String s = Reports.net("token=rdkey-Mx41Tq9 at 10.0.0.2:8080/x and tv.examplepanel.net:8080 and aB3aB3aB3aB3aB3aB3aB3aB3aB3");
        assertFalse(s, s.contains("Mx41") || s.contains("10.0.0.2") || s.contains("examplepanel") || s.contains("aB3aB3"));
        assertEquals("plain words stay", Reports.net("plain words stay"));
    }

    @Test public void codesAreCodeShaped() {
        assertEquals("provider-down", Reports.code("provider-down"));
        assertEquals("other", Reports.code("Sky Sports HD"));
        assertEquals("other", Reports.code("u-Hk29x@tv.examplepanel.net/x"));
    }
}
