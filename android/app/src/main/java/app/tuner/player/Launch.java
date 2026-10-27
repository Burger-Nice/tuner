package app.tuner.player;

import android.content.Intent;
import android.net.Uri;

import java.util.Locale;

/**
 * The safe launcher for "Watch in another app" and trailers (design/ui-v1/addons/SPEC.md 5.6, PORT-NATIVE.md 6). An
 * add-on's androidTvUrl is untrusted, so it is opened the way Chrome opens an intent from a web page: parsed, its
 * component and selector cleared, BROWSABLE added (only activities that accept links from a browser can take it), no
 * extras and no flags of its own (so no granted URI permissions). Only web links, YouTube's and an app's own link
 * scheme when the link names that app's package are let through; never airglow itself, files or content.
 */
final class Launch {
    private Launch() {}

    /** Schemes the outer link may use. */
    static boolean outerAllowed(String uri) {
        String s = schemeOf(uri);
        return "intent".equals(s) || "https".equals(s) || "http".equals(s) || "vnd.youtube".equals(s);
    }
    /** Schemes an intent's data may use: web links and YouTube's always; an app's own scheme only with its package. */
    static boolean dataAllowed(String scheme, String pkg) {
        if (scheme == null) return false;
        String s = scheme.toLowerCase(Locale.ROOT);
        if ("https".equals(s) || "http".equals(s) || "vnd.youtube".equals(s)) return true;
        if (BLOCKED.contains(s)) return false;
        return pkg != null && validPackage(pkg) && s.matches("[a-z][a-z0-9+.-]{1,31}");
    }
    private static final java.util.Set<String> BLOCKED = new java.util.HashSet<>(java.util.Arrays.asList(
            "file", "content", "javascript", "data", "about", "android-app", "intent", "jar", "blob", "chrome", "market", "tel", "sms", "smsto", "mailto"));
    static boolean validPackage(String p) { return p != null && p.length() <= 128 && p.matches("[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z][A-Za-z0-9_]*)+"); }
    static String schemeOf(String uri) {
        if (uri == null) return "";
        int c = uri.indexOf(':');
        return c <= 0 ? "" : uri.substring(0, c).trim().toLowerCase(Locale.ROOT);
    }

    /** The intent to start, or null when the link isn't one airglow opens. */
    static Intent safeIntent(String uri, String self) {
        if (uri == null || uri.isEmpty() || uri.length() > 4096 || !outerAllowed(uri)) return null;
        Intent i;
        try {
            if ("intent".equals(schemeOf(uri))) {
                Intent p = Intent.parseUri(uri, Intent.URI_INTENT_SCHEME);
                Uri data = p.getData();
                String pkg = p.getPackage();
                if (data == null || !dataAllowed(data.getScheme(), pkg)) return null;
                if (pkg != null && (!validPackage(pkg) || pkg.equals(self))) return null;
                i = new Intent(Intent.ACTION_VIEW, data);   // (a fresh intent: its action, extras, flags and clip data are dropped)
                if (pkg != null) i.setPackage(pkg);
            } else {
                i = new Intent(Intent.ACTION_VIEW, Uri.parse(uri));
            }
        } catch (Exception e) { return null; }
        i.setComponent(null);
        i.setSelector(null);
        i.addCategory(Intent.CATEGORY_BROWSABLE);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return i;
    }
}
