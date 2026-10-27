package app.tuner.player;

import static org.junit.Assert.*;

import org.junit.Test;

/** The safe launcher's rules (design/ui-v1/addons/SPEC.md 5.6): which links and app schemes it lets through. */
public class LaunchTest {
    @Test public void outerSchemes() {
        assertTrue(Launch.outerAllowed("intent://www.primevideo.com/detail/x#Intent;scheme=https;package=com.amazon.amazonvideo.livingroom;end"));
        assertTrue(Launch.outerAllowed("vnd.youtube:abc123"));
        assertTrue(Launch.outerAllowed("https://play.max.com/x"));
        assertFalse(Launch.outerAllowed("file:///data/data/app.tuner.player/x"));
        assertFalse(Launch.outerAllowed("content://app.tuner.player.fileprovider/x"));
        assertFalse(Launch.outerAllowed("javascript:alert(1)"));
        assertFalse(Launch.outerAllowed("market://details?id=x"));
        assertFalse(Launch.outerAllowed("no scheme"));
        assertFalse(Launch.outerAllowed(null));
    }
    @Test public void dataSchemes() {
        assertTrue(Launch.dataAllowed("https", null));
        assertTrue(Launch.dataAllowed("vnd.youtube", null));
        assertFalse(Launch.dataAllowed("hbomax", null));            // an app's own scheme only with its package
        assertTrue(Launch.dataAllowed("hbomax", "com.wbd.stream"));
        assertFalse(Launch.dataAllowed("file", "com.wbd.stream"));
        assertFalse(Launch.dataAllowed("content", "com.wbd.stream"));
        assertFalse(Launch.dataAllowed("intent", "com.wbd.stream"));
        assertFalse(Launch.dataAllowed(null, "com.wbd.stream"));
    }
    @Test public void packages() {
        assertTrue(Launch.validPackage("com.amazon.amazonvideo.livingroom"));
        assertFalse(Launch.validPackage("nodots"));
        assertFalse(Launch.validPackage("com.x/.Evil"));
        assertFalse(Launch.validPackage(null));
    }
}
