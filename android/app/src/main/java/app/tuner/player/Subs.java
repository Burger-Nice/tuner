package app.tuner.player;

import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.media3.common.C;
import androidx.media3.common.Format;
import androidx.media3.common.Player;
import androidx.media3.common.TrackSelectionParameters;
import androidx.media3.common.Tracks;
import androidx.media3.common.util.Util;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.SubtitleView;

import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Subtitles in the player (design/ui-v1/subtitles/SPEC.md 7, PORT-NATIVE.md 2): the settings at start (his languages
 * in order, Off, a dub, only when the sound isn't his language, with sounds), the downloads the app sends with the
 * `subs` command drawn by {@link SrtTrack.Drawer} in airglow's own SubtitleView, Options > Subtitles (384 wide), the
 * "Early or late" strip with Match a line, and the "Timing not checked" chip.
 */
final class Subs {
    private final PlayerActivity a;
    private final ExoPlayer p;
    final SrtTrack.Drawer drawer;
    private final SubtitleView view;
    // the settings (PORT-NATIVE.md 2.1)
    private final String mode;
    private final List<String> langs = new ArrayList<>(), shown = new ArrayList<>();
    private final boolean sounds, dub;
    // from the app, for the title playing
    private JSONObject data;
    private final Map<String, SrtTrack> files = new LinkedHashMap<>();
    SrtTrack on;
    private boolean picked;          // he picked in the panel: the app's later lists don't change what's on
    private boolean asked;           // need { what: 'subs' } sent
    private boolean chipDone;        // "Timing not checked", once per film
    private boolean announced;       // "… subtitles are ready · CC", once
    private String waitingFor = "";  // a pick whose file was still downloading at Play
    private int bigChanges;          // "Still off? ▼ Another file" after two changes over 3 s
    private int gen;                 // the payload parsed last wins

    Subs(PlayerActivity a, ExoPlayer p, FrameLayout root, int at, JSONObject settings) {
        this.a = a;
        this.p = p;
        view = new SubtitleView(a);
        a.styleSubtitles(view);
        root.addView(view, at, new FrameLayout.LayoutParams(-1, -1));
        drawer = new SrtTrack.Drawer(view, a.handler, p);
        drawer.onLine = this::lineShown;
        JSONObject s = settings == null ? new JSONObject() : settings;
        mode = s.optString("mode", "always");
        JSONArray l = s.optJSONArray("langs"), sh = s.optJSONArray("shown");
        for (int i = 0; l != null && i < l.length(); i++) langs.add(norm(l.optString(i)));
        for (int i = 0; sh != null && i < sh.length(); i++) shown.add(norm(sh.optString(i)));
        sounds = s.optBoolean("sounds", false);
        dub = s.optBoolean("dub", false);
        p.addListener(new Player.Listener() {
            @Override public void onIsPlayingChanged(boolean playing) { drawer.update(); }
            @Override public void onPositionDiscontinuity(@NonNull Player.PositionInfo o, @NonNull Player.PositionInfo n, int reason) { drawer.update(); }
            @Override public void onPlaybackParametersChanged(@NonNull androidx.media3.common.PlaybackParameters pp) { drawer.update(); }
            @Override public void onTracksChanged(@NonNull Tracks t) { foreign(t); }
        });
    }
    static String norm(String code) { String c = Util.normalizeLanguageCode(code == null ? "" : code.trim()); return c == null ? "" : c.toLowerCase(Locale.ROOT); }

    // ---------- 2.1: the settings at start ----------
    /** His languages in order (Media3 takes the list in order), Off and a dub with text off, sounds preferred or not. */
    TrackSelectionParameters.Builder prefer(TrackSelectionParameters.Builder b) {
        b.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, "off".equals(mode) || dub);
        if (!langs.isEmpty()) b.setPreferredTextLanguages(langs.toArray(new String[0]));
        b.setPreferredTextRoleFlags(sounds ? C.ROLE_FLAG_DESCRIBES_MUSIC_AND_SOUND : 0);
        return b;
    }
    /** Only when the sound isn't in your language: text on only while the sound track playing isn't one of Shown first. */
    private void foreign(Tracks t) {
        if (!"foreign".equals(mode) || picked || on != null || dub) return;
        String audio = "";
        for (Tracks.Group g : t.getGroups()) if (g.getType() == C.TRACK_TYPE_AUDIO) for (int i = 0; i < g.length; i++) if (g.isTrackSelected(i)) audio = norm(g.getTrackFormat(i).language);
        if (audio.isEmpty()) return;
        boolean off = shown.contains(audio);
        TrackSelectionParameters ps = p.getTrackSelectionParameters();
        if (ps.disabledTrackTypes.contains(C.TRACK_TYPE_TEXT) != off) p.setTrackSelectionParameters(ps.buildUpon().setTrackTypeDisabled(C.TRACK_TYPE_TEXT, off).build());
    }
    boolean textWanted() { return !"off".equals(mode) && !dub; }

    // ---------- 2.2: the subs command ----------
    void command(String json) {
        int g = ++gen;
        // (about 240 KB: read off the UI thread, put in place on it)
        new Thread(() -> {
            try {
                JSONObject d = new JSONObject(json);
                Map<String, SrtTrack> parsed = new LinkedHashMap<>();
                JSONArray fs = d.optJSONArray("files");
                for (int i = 0; fs != null && i < fs.length(); i++) {
                    JSONObject f = fs.getJSONObject(i);
                    String id = f.optString("id");
                    SrtTrack old = files.get(id);
                    SrtTrack t = new SrtTrack(id, f.optString("lang"), f.optString("text"), f.optDouble("speed", 1), f.optDouble("autoOffset", 0),
                            old != null ? old.mine : f.optDouble("mine", 0), f.optString("verdict", "unchecked"), f.optString("words", ""),
                            f.optBoolean("anchored"), f.optBoolean("sounds"), f.optString("release", ""));
                    if (!t.lines.isEmpty()) parsed.put(id, t);
                }
                a.runOnUiThread(() -> { if (g == gen && !a.isFinishing()) apply(d, parsed); });
            } catch (Exception ignored) {}
        }).start();
    }
    private void apply(JSONObject d, Map<String, SrtTrack> parsed) {
        boolean first = data == null;
        data = d;
        String onId = on == null ? "" : on.id;
        files.clear();
        files.putAll(parsed);
        if (on != null) { on = files.get(onId); drawer.set(on); if (on == null) restoreText(); }
        JSONObject pick = d.optJSONObject("pick");
        if (!picked && pick != null && (first || !waitingFor.isEmpty())) {
            String src = pick.optString("source");
            if ("opensubtitles".equals(src)) {
                SrtTrack t = files.get(pick.optString("id"));
                // (a language picked from Other languages: its first file, once the app has it)
                if (t == null && waitingFor.startsWith("lang:")) for (SrtTrack o : files.values()) if (o.lang.equals(waitingFor.substring(5))) { t = o; break; }
                if (t == null && !pick.optString("lang").isEmpty() && pick.optString("id").isEmpty()) for (SrtTrack o : files.values()) if (o.lang.equals(pick.optString("lang"))) { t = o; break; }
                if (t != null) {
                    boolean late = !waitingFor.isEmpty() && !first;
                    useDownload(t);
                    waitingFor = "";
                    if (late && !announced) { announced = true; a.showText(t.lang + " subtitles are ready · CC", 4000); }
                } else if (!waitingFor.startsWith("lang:")) waitingFor = pick.optString("id", "?");
            } else if ("file".equals(src)) {
                waitingFor = "";
                String lang = pick.optString("id").replaceFirst("^track:", "");
                if (!lang.isEmpty() && textWanted()) p.setTrackSelectionParameters(p.getTrackSelectionParameters().buildUpon().clearOverridesOfType(C.TRACK_TYPE_TEXT)
                        .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false).setPreferredTextLanguages(codeOf(lang)).build());
            } else if ("off".equals(src)) {
                waitingFor = "";
                drop();
                p.setTrackSelectionParameters(p.getTrackSelectionParameters().buildUpon().setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true).build());
            }
        }
        if (a.isOpen(panel)) open(panelFromOptions);
    }
    /** A language as the app names it ("Icelandic") or a code -> the ISO 639-1 code Media3 compares. */
    static String codeOf(String lang) {
        if (lang == null) return "";
        if (lang.length() <= 3) return norm(lang);
        for (String iso : Locale.getISOLanguages()) if (new Locale(iso).getDisplayLanguage(Locale.ENGLISH).equalsIgnoreCase(lang)) return iso;
        return lang.toLowerCase(Locale.ROOT);
    }
    /** The track playing in the file has no language of its own (the app's list says so: "untagged"). */
    private Set<String> untagged() {
        Set<String> out = new HashSet<>();
        JSONArray l = data == null ? null : data.optJSONArray("list");
        for (int i = 0; l != null && i < l.length(); i++) { JSONObject r = l.optJSONObject(i); if (r != null && "file".equals(r.optString("source")) && "untagged".equals(r.optString("verdict"))) out.add(r.optString("lang")); }
        return out;
    }

    void useDownload(SrtTrack t) {
        on = t;
        p.setTrackSelectionParameters(p.getTrackSelectionParameters().buildUpon().setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true).build());   // ExoPlayer's own view stays empty
        drawer.set(t);
    }
    /** The download goes (a file track or Off was picked). */
    void drop() { if (on != null) { on = null; drawer.set(null); } }
    private void restoreText() {
        p.setTrackSelectionParameters(prefer(p.getTrackSelectionParameters().buildUpon()).build());
    }
    /** A new episode: the app sends that episode's subtitles. */
    void reset() {
        gen++;
        data = null; files.clear(); drop();
        picked = asked = chipDone = announced = false; waitingFor = ""; bigChanges = 0;
        if (a.isOpen(strip)) a.closeOverlay();
        restoreText();
    }
    boolean hasDownloads() { return !files.isEmpty(); }
    boolean anyComing() { return data == null || hasListed(); }
    private boolean hasListed() {
        JSONArray l = data == null ? null : data.optJSONArray("list");
        for (int i = 0; l != null && i < l.length(); i++) { JSONObject r = l.optJSONObject(i); if (r != null && "opensubtitles".equals(r.optString("source"))) return true; }
        return false;
    }
    String value() { return on != null ? on.lang : null; }
    String status() { return data == null ? "" : data.optString("status", ""); }
    String lastText() { return drawer.lastText; }
    double offsetNow() { return on == null ? 0 : on.mine; }
    String describe() { return "subs on=" + (on == null ? "" : on.lang + ":" + on.id) + " mine=" + offsetNow() + " files=" + files.size() + " text=" + lastText().replace('\n', ' '); }

    // ---------- the chip (SPEC 7.6): once per film, 6 s at the first downloaded line ----------
    private LinearLayout chip;
    private void lineShown() {
        if (chipDone || on == null || !"unchecked".equals(on.verdict)) return;
        chipDone = true;
        if (chip == null) {
            chip = new LinearLayout(a);
            chip.setGravity(Gravity.CENTER_VERTICAL);
            chip.setPadding(Ui.dp(12), Ui.dp(10), Ui.dp(16), Ui.dp(10));
            chip.setBackground(Ui.panelBg());
            FrameLayout g = new FrameLayout(a);
            g.setBackground(Ui.circle(Ui.S2));
            g.addView(Ui.iconView(a, "cc", Ui.T1, 22), new FrameLayout.LayoutParams(Ui.dp(22), Ui.dp(22), Gravity.CENTER));
            LinearLayout.LayoutParams gl = new LinearLayout.LayoutParams(Ui.dp(40), Ui.dp(40));
            gl.setMarginEnd(Ui.dp(12));
            chip.addView(g, gl);
            LinearLayout col = new LinearLayout(a);
            col.setOrientation(LinearLayout.VERTICAL);
            col.addView(Ui.line(a, "", 16, Ui.T1, Ui.inter650));
            col.addView(Ui.line(a, "Timing not checked. Off? ▼, then Subtitles", 14, Ui.T2, Ui.inter500));
            chip.addView(col);
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(-2, -2, Gravity.TOP | Gravity.END);
            lp.setMargins(0, Ui.dp(27), Ui.dp(48), 0);
            a.rootView().addView(chip, lp);
        }
        ((TextView) ((LinearLayout) chip.getChildAt(1)).getChildAt(0)).setText(on.lang + " subtitles, from OpenSubtitles");
        chip.setVisibility(View.VISIBLE);
        chip.bringToFront();
        a.handler.removeCallbacks(hideChip);
        a.handler.postDelayed(hideChip, 6000);
    }
    private final Runnable hideChip = () -> { if (chip != null) chip.setVisibility(View.GONE); };
    boolean chipShowing() { return chip != null && chip.getVisibility() == View.VISIBLE; }

    // ---------- Options > Subtitles (SPEC 7.2, player-subs, player-subs-mixed, player-subs-down) ----------
    private ListPanel panel;
    private boolean panelFromOptions;
    private static ListPanel.Item radio(String title, String sub, boolean on, int h) {
        ListPanel.Item it = new ListPanel.Item(title);
        it.sub = sub; it.radio = true; it.radioOn = on; it.height = h;
        return it;
    }
    private static ListPanel.Item note(String title, String sub) {
        ListPanel.Item it = new ListPanel.Item(title);
        it.sub = sub; it.disabled = true; it.height = sub == null ? 44 : 50;
        return it;
    }
    void open(boolean fromOptions) {
        if (data == null && !asked) { asked = true; a.emitNeed("subs"); }
        panelFromOptions = fromOptions;
        Tracks tracks = p.getCurrentTracks();
        boolean textOff = p.getTrackSelectionParameters().disabledTrackTypes.contains(C.TRACK_TYPE_TEXT);
        List<ListPanel.Item> items = new ArrayList<>();
        int focus = 0;
        ListPanel.Item off = radio("Off", null, false, 44);
        items.add(off);
        // IN THE FILE
        List<ListPanel.Item> inFile = new ArrayList<>();
        Set<String> untagged = untagged();
        int n = 0;
        for (Tracks.Group g : tracks.getGroups()) {
            if (g.getType() != C.TRACK_TYPE_TEXT) continue;
            for (int i = 0; i < g.length; i++) {
                if (!g.isTrackSupported(i)) continue;
                Format f = g.getTrackFormat(i);
                String name = PlayerActivity.trackName(f, ++n);
                String langName = f.language == null || f.language.isEmpty() || "und".equals(f.language) ? "" : new Locale(f.language).getDisplayLanguage(Locale.ENGLISH);
                boolean unt = !langName.isEmpty() && untagged.contains(langName);
                ListPanel.Item it = radio(unt ? "Probably " + langName : name, unt ? "Its file doesn't say the language" : "Made for this copy", on == null && !textOff && g.isTrackSelected(i), 50);
                it.tickB = !unt;
                final Tracks.Group fg = g;
                final int fi = i;
                final String ln = langName.isEmpty() ? name : langName;
                it.ok = () -> {
                    picked = true;
                    drop();
                    a.pickText(fg, fi);
                    pickEvent("file", "track:" + (f.language == null ? "und" : f.language), ln);
                    a.closeOverlay();
                };
                if (it.radioOn) focus = items.size() + 1 + inFile.size();
                inFile.add(it);
            }
        }
        String status = status();
        boolean down = "down".equals(status), none = "none".equals(status);
        if (!inFile.isEmpty()) { items.add(ListPanel.Item.heading("In the file")); items.addAll(inFile); }
        else if (down || none) { items.add(ListPanel.Item.heading("In the file")); items.add(note("None in this copy's file", null)); }
        // FROM OPENSUBTITLES
        List<ListPanel.Item> dl = new ArrayList<>();
        if (data == null) { if (textWanted()) dl.add(note("Looking on OpenSubtitles…", null)); }
        else if (down) {
            ListPanel.Item d = note("OpenSubtitles isn't answering", downLine());
            dl.add(d);
            ListPanel.Item again = new ListPanel.Item("Try now");
            again.icon = "refresh"; again.height = 44;
            again.ok = () -> { JSObject e = a.event("need"); e.put("what", "subs"); e.put("again", true); TunerPlayerPlugin.emit(e); a.showText("Asking OpenSubtitles again…", 2500); };
            dl.add(again);
            int copies = a.otherCopies();
            if (copies > 0) {
                ListPanel.Item oc = new ListPanel.Item("Other copies of this film");
                oc.icon = "list"; oc.value = String.valueOf(copies); oc.chevron = true; oc.height = 50;
                oc.sub = a.copiesWithSubs(langs);
                oc.ok = () -> a.openQuality(true);
                dl.add(oc);
            }
        } else if (none) dl.add(note("Nothing on OpenSubtitles for this film", null));
        else if ("unsure".equals(status) || "wrong-film".equals(status)) dl.add(note("Which film is this?", data.optString("note", "Pick it on the film's page, then subtitles come")));
        else {
            JSONArray list = data.optJSONArray("list");
            Set<String> listed = new HashSet<>();
            for (int i = 0; list != null && i < list.length(); i++) {
                JSONObject r = list.optJSONObject(i);
                if (r == null || !"opensubtitles".equals(r.optString("source"))) continue;
                String lang = r.optString("lang"), fid = r.optString("fileId");
                SrtTrack t = files.get(fid);
                if (t == null) { dl.add(note(lang + " · getting it…", null)); listed.add(fid); continue; }
                listed.add(fid);
                focus = addDownload(dl, items.size() + 1, t, focus, textOff);
                // one more of that language when it differs in sounds (the mock's "English, with sounds")
                for (SrtTrack o : files.values()) if (!listed.contains(o.id) && o.lang.equals(lang) && o.sounds != t.sounds) { listed.add(o.id); focus = addDownload(dl, items.size() + 1, o, focus, textOff); break; }
            }
            // a pick of another language from Other languages
            for (SrtTrack o : files.values()) if (!listed.contains(o.id) && on == o) { listed.add(o.id); focus = addDownload(dl, items.size() + 1, o, focus, textOff); }
        }
        if (!dl.isEmpty()) { items.add(ListPanel.Item.heading("From OpenSubtitles")); items.addAll(dl); }
        JSONArray others = data == null ? null : data.optJSONArray("others");
        if (others != null && others.length() > 0) {
            ListPanel.Item o = new ListPanel.Item("Other languages");
            o.icon = "globe"; o.value = String.valueOf(others.length()); o.chevron = true; o.height = 44;
            o.ok = this::openOthers;
            items.add(o);
        }
        off.radioOn = (on == null && (textOff || noneSelected(tracks)));
        off.ok = () -> {
            picked = true;
            drop();
            a.pickText(null, 0);
            pickEvent("off", "", "");
            a.closeOverlay();
            a.showText("Subtitles off for this film", 2000);
        };
        if (off.radioOn) focus = 0;
        // (after a "getting it…" or a down row, the focus goes to the first row that can be chosen)
        if (down) for (int i = 0; i < items.size(); i++) if ("Try now".equals(items.get(i).title)) { focus = i; break; }
        ListPanel pn = new ListPanel(a, "Subtitles", true, 384);
        pn.source(ListPanel.of(items), Math.max(0, Math.min(items.size() - 1, focus)));
        while (pn.sel < items.size() - 1 && items.get(pn.sel).disabled) pn.sel++;
        pn.setFoot(down ? null : inFile.isEmpty() ? "None in this copy's file. Remembered for this film." : "Remembered for this film.");
        pn.onRight = () -> { ListPanel.Item it = pn.itemAt(pn.sel); if (it.ok != null && it.chevron) it.ok.run(); };
        if (fromOptions) pn.backTo = a::openOptions;
        panel = pn;
        a.show(pn);
    }
    private static boolean noneSelected(Tracks t) {
        for (Tracks.Group g : t.getGroups()) if (g.getType() == C.TRACK_TYPE_TEXT && g.isSelected()) return false;
        return true;
    }
    private String downLine() {
        long tried = data.optLong("triedAt", 0), again = data.optLong("retryAt", 0);
        String s = tried > 0 ? "Tried at " + PlayerActivity.hm(tried) + "." : "";
        if (again > 0) s += (s.isEmpty() ? "" : " ") + "Trying again at " + PlayerActivity.hm(again);
        return s.isEmpty() ? null : s;
    }
    private int addDownload(List<ListPanel.Item> dl, int base, SrtTrack t, int focus, boolean textOff) {
        String title = t.lang + (t.sounds ? ", with sounds" : "");
        String sub = t.sounds && !t.anchored ? "[door slams] and who is speaking" : t.words.isEmpty() ? "Timing not checked" : t.words;
        ListPanel.Item it = radio(title, sub, on == t, 50);
        it.tickB = t.anchored;
        it.ok = () -> {
            picked = true;
            useDownload(t);
            pickEvent("opensubtitles", t.id, t.lang);
            a.closeOverlay();
            a.showText(t.lang + " subtitles on · ▼, then Subtitles for timing", 4000);
        };
        if (on == t) focus = base + dl.size();
        dl.add(it);
        if (on == t) {
            ListPanel.Item el = new ListPanel.Item("Early or late");
            el.icon = "timing"; el.indent = 44; el.height = 44; el.value = timingValue(t.mine); el.chevron = true;
            el.ok = () -> openStrip(true);
            dl.add(el);
        }
        return focus;
    }
    private void pickEvent(String source, String id, String lang) {
        JSObject e = a.event("setting");
        e.put("key", "subpick");
        e.put("title", data == null ? "" : data.optString("title"));
        JSObject v = new JSObject();
        v.put("source", source);
        v.put("id", id);
        v.put("lang", lang);
        e.put("value", v);
        TunerPlayerPlugin.emit(e);
        if ("opensubtitles".equals(source)) {   // the language becomes the app's choice too, as a file track's does
            JSObject s = a.event("setting");
            s.put("key", "sub");
            s.put("value", codeOf(lang));
            TunerPlayerPlugin.emit(s);
        }
    }
    private void openOthers() {
        JSONArray others = data == null ? null : data.optJSONArray("others");
        if (others == null) return;
        List<ListPanel.Item> items = new ArrayList<>();
        for (int i = 0; i < others.length(); i++) {
            String name = others.optString(i);
            ListPanel.Item it = new ListPanel.Item(name);
            it.height = 44;
            it.ok = () -> {
                // the app downloads that language and sends the list again; it comes on when it's ready
                JSObject e = a.event("need");
                e.put("what", "subs");
                e.put("lang", name);
                TunerPlayerPlugin.emit(e);
                picked = false;
                waitingFor = "lang:" + name;
                announced = false;
                a.closeOverlay();
                a.showText("Getting " + name + " subtitles from OpenSubtitles…", 3000);
            };
            items.add(it);
        }
        ListPanel pn = new ListPanel(a, "Other languages", true, 384);
        pn.source(ListPanel.of(items), 0);
        pn.setFoot("From OpenSubtitles. Timing is lined up when it can be.");
        pn.backTo = () -> open(panelFromOptions);
        a.show(pn);
    }

    // ---------- Early or late (SPEC 7.3, player-timing) and Match a line (7.4, player-timing-match) ----------
    static String timingValue(double s) {
        if (Math.abs(s) < 0.25) return "As downloaded";
        String n = (Math.abs(s) == Math.floor(Math.abs(s)) ? String.valueOf((long) Math.abs(s)) : String.valueOf(Math.abs(s)));
        return n + " s " + (s > 0 ? "later" : "earlier");
    }
    private Strip strip;
    void openStrip(boolean fromOptions) {
        if (on == null) { a.showText("Early or late is for downloaded subtitles", 2500); return; }
        strip = new Strip(a, fromOptions);
        a.show(strip);
    }
    boolean stripOpen() { return a.isOpen(strip); }
    String stripState() { return strip == null || !a.isOpen(strip) ? "" : strip.matching ? "match" : "strip"; }

    private void step(double d) {
        if (on == null) return;
        on.mine = Math.max(-60, Math.min(60, Math.round((on.mine + d) * 2) / 2.0));
        drawer.update();
        saveOffset();
    }
    private void saveOffset() {
        JSObject e = a.event("setting");
        e.put("key", "subtime");
        e.put("title", data == null ? "" : data.optString("title"));
        e.put("copy", data == null ? "" : data.optString("copy"));
        e.put("sub", on.id);
        e.put("value", on.mine);
        e.put("release", on.release);
        TunerPlayerPlugin.emit(e);
    }

    /** The strip: a HUD at the top centre (x 220 to 740, y 27 to 155) with no focus ring; the subtitles stay in view. */
    final class Strip extends Overlay {
        final boolean fromOptions;
        boolean matching;
        private final LinearLayout box, keys, slider;
        private final TextView head, right, big, line, more;
        private final Dot dot;
        private final double openedAt;
        private long lastStep;
        private int target = -1;     // Match a line: the line he listens for
        private final Runnable tick = new Runnable() { @Override public void run() { if (a.isOpen(Strip.this)) { if (matching) fillMatch(); a.handler.postDelayed(this, 250); } } };

        Strip(PlayerActivity pa, boolean fromOptions) {
            super(pa);
            this.fromOptions = fromOptions;
            openedAt = on.mine;
            box = new LinearLayout(pa);
            box.setOrientation(LinearLayout.VERTICAL);
            box.setBackground(Ui.panelBg());
            box.setPadding(Ui.dp(18), Ui.dp(12), Ui.dp(18), Ui.dp(12));
            LinearLayout top = new LinearLayout(pa);
            top.setGravity(Gravity.CENTER_VERTICAL);
            LinearLayout.LayoutParams il = new LinearLayout.LayoutParams(Ui.dp(18), Ui.dp(18));
            il.setMarginEnd(Ui.dp(10));
            top.addView(Ui.iconView(pa, "timing", Ui.T2, 18), il);
            head = Ui.line(pa, "", 15, Ui.T1, Ui.inter650);
            top.addView(head, new LinearLayout.LayoutParams(0, -2, 1));
            right = Ui.line(pa, "", 14, Ui.T2, Ui.inter500);
            top.addView(right);
            box.addView(top, new LinearLayout.LayoutParams(-1, Ui.dp(24)));
            // ◀ Earlier · the value and its slider · Later ▶
            LinearLayout mid = new LinearLayout(pa);
            mid.setGravity(Gravity.CENTER_VERTICAL);
            slider = mid;
            mid.addView(Ui.kbd(pa, "◀"), kl(8));
            mid.addView(Ui.line(pa, "Earlier", 15, Ui.T2, Ui.inter500));
            LinearLayout centre = new LinearLayout(pa);
            centre.setOrientation(LinearLayout.VERTICAL);
            centre.setGravity(Gravity.CENTER_HORIZONTAL);
            big = Ui.line(pa, "", 22, Ui.T1, Ui.outfit700);
            big.setGravity(Gravity.CENTER);
            centre.addView(big, new LinearLayout.LayoutParams(-2, -2));
            dot = new Dot(pa);
            centre.addView(dot, new LinearLayout.LayoutParams(Ui.dp(220), Ui.dp(14)));
            mid.addView(centre, new LinearLayout.LayoutParams(0, -2, 1));
            mid.addView(Ui.line(pa, "Later", 15, Ui.T2, Ui.inter500), kl(8));
            mid.addView(Ui.kbd(pa, "▶"));
            LinearLayout.LayoutParams ml = new LinearLayout.LayoutParams(-1, -2);
            ml.topMargin = Ui.dp(6);
            box.addView(mid, ml);
            // Match a line's text and its line, in place of the slider
            line = Ui.text(pa, "", 15, Ui.T2, Ui.inter500);
            line.setGravity(Gravity.CENTER);
            LinearLayout.LayoutParams lnl = new LinearLayout.LayoutParams(-1, -2);
            lnl.topMargin = Ui.dp(4);
            box.addView(line, lnl);
            keys = new LinearLayout(pa);
            keys.setGravity(Gravity.CENTER_VERTICAL);
            LinearLayout.LayoutParams kyl = new LinearLayout.LayoutParams(-1, Ui.dp(28));
            kyl.topMargin = Ui.dp(6);
            box.addView(keys, kyl);
            more = Ui.line(pa, "Still off? ▼ Another file", 14, Ui.T2, Ui.inter500);
            more.setVisibility(View.GONE);
            box.addView(more);
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Ui.dp(520), -2, Gravity.TOP | Gravity.CENTER_HORIZONTAL);
            lp.topMargin = Ui.dp(27);
            box.setLayoutParams(lp);
            root = box;
            fill();
            a.handler.post(tick);
        }
        private LinearLayout.LayoutParams kl(int gap) { LinearLayout.LayoutParams l = new LinearLayout.LayoutParams(-2, Ui.dp(26)); l.setMarginEnd(Ui.dp(gap)); return l; }
        private void keysOf(String[][] ks) {
            keys.removeAllViews();
            for (String[] k : ks) {
                keys.addView(Ui.kbd(a, k[0]), kl(6));
                TextView t = Ui.line(a, k[1], 15, k == ks[0] ? Ui.T1 : Ui.T2, k == ks[0] ? Ui.inter650 : Ui.inter500);
                LinearLayout.LayoutParams l = new LinearLayout.LayoutParams(-2, -2);
                l.setMarginEnd(Ui.dp(18));
                keys.addView(t, l);
            }
        }
        void fill() {
            matching = false;
            head.setText(on.lang + " subtitles: early or late");
            right.setText("Remembered for this film");
            slider.setVisibility(View.VISIBLE);
            line.setVisibility(View.GONE);
            big.setText(timingValue(on.mine));
            dot.v = on.mine;
            dot.invalidate();
            boolean another = bigChanges >= 2;
            more.setVisibility(another ? View.VISIBLE : View.GONE);
            keysOf(new String[][] { { "OK", "Done" }, { "▼", another ? "Another file" : "Match a line" }, { "▲", "Undo my changes" } });
        }
        // Match a line: the next line as timed now; OK when he hears it
        void startMatch(int from) {
            matching = true;
            long pos = p.getCurrentPosition();
            target = from >= 0 ? from : on.nextAfter(pos);
            head.setText("Match a line");
            right.setText(on.lang + " subtitles");
            slider.setVisibility(View.GONE);
            line.setVisibility(View.VISIBLE);
            more.setVisibility(View.GONE);
            keysOf(new String[][] { { "OK", "I hear it" }, { "▶", "Another line" }, { "Back", "Cancel" } });
            fillMatch();
        }
        private void fillMatch() {
            long pos = p.getCurrentPosition();
            // a line long gone (20 s past) gives way to the next one
            while (target >= 0 && target < on.lines.size() && on.showAt(on.lines.get(target)) < pos - 20000) target++;
            if (target < 0 || target >= on.lines.size()) { big.setText(""); line.setText("No line for a while. ▶ to wait for the next one"); return; }
            SrtTrack.Line l = on.lines.get(target);
            long in = on.showAt(l) - pos;
            big.setText("“" + l.plain.replace('\n', ' ') + "”");
            big.setMaxLines(2);
            if (in > 20000) line.setText("No line for a while. ▶ to wait for the next one");
            else line.setText("Press OK when you hear it. As timed now, it " + (in >= 1000 ? "comes in about " + Math.round(in / 1000.0) + " s" : in > -1000 ? "comes now" : "came " + Math.round(-in / 1000.0) + " s ago"));
        }
        @Override boolean key(int code, boolean repeat) {
            switch (code) {
                case KeyEvent.KEYCODE_DPAD_LEFT: case KeyEvent.KEYCODE_DPAD_RIGHT: {
                    if (matching) {
                        if (code == KeyEvent.KEYCODE_DPAD_RIGHT && !repeat && target >= 0) { target = Math.min(on.lines.size(), target + 1); fillMatch(); }
                        return true;
                    }
                    // hold: 4 steps a second
                    long now = android.os.SystemClock.uptimeMillis();
                    if (repeat && now - lastStep < 250) return true;
                    lastStep = now;
                    step(code == KeyEvent.KEYCODE_DPAD_RIGHT ? 0.5 : -0.5);
                    fill();
                    return true;
                }
                case KeyEvent.KEYCODE_DPAD_UP:
                    if (repeat || matching) return true;
                    if (on.mine != 0) { on.mine = 0; drawer.update(); saveOffset(); }
                    fill();
                    a.showText("Back to the automatic timing", 1800);
                    return true;
                case KeyEvent.KEYCODE_DPAD_DOWN:
                    if (repeat || matching) return true;
                    if (bigChanges >= 2) { done(); open(fromOptions); return true; }
                    startMatch(-1);
                    return true;
                case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_NUMPAD_ENTER:
                    if (repeat) return true;
                    if (matching) {
                        if (target >= 0 && target < on.lines.size()) {
                            long pos = p.getCurrentPosition();
                            double d = (pos - 300 - on.showAt(on.lines.get(target))) / 1000.0;
                            step(Math.round(d * 2) / 2.0);
                            a.showText(timingValue(on.mine) + " · matched to that line", 2500);
                        }
                        fill();
                        return true;
                    }
                    done();
                    a.closeOverlay();
                    return true;
            }
            return false;
        }
        @Override boolean back() {
            if (matching) { fill(); return true; }   // cancels Match a line
            done();
            return false;
        }
        private boolean counted;
        private void done() { if (!counted && Math.abs(on.mine - openedAt) > 3) { counted = true; bigChanges++; } }
        @Override void closed() { a.handler.removeCallbacks(tick); }
        @Override String[][] hints() { return null; }
    }

    /** The strip's slider: a line, its centre mark (as downloaded) and the pink dot at his offset (±10 s across). */
    static final class Dot extends View {
        double v;
        private final android.graphics.Paint pt = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        Dot(android.content.Context c) { super(c); }
        @Override protected void onDraw(@NonNull android.graphics.Canvas c) {
            float w = getWidth(), h = getHeight(), cy = h / 2f, r = Ui.dp(6);
            pt.setColor(Ui.S3);
            c.drawRoundRect(new android.graphics.RectF(r, cy - Ui.dp(2), w - r, cy + Ui.dp(2)), Ui.dp(2), Ui.dp(2), pt);
            pt.setColor(Ui.T3);
            c.drawRect(w / 2f - Ui.dp(1), cy - Ui.dp(6), w / 2f + Ui.dp(1), cy + Ui.dp(6), pt);
            float x = (float) (w / 2f + Math.max(-1, Math.min(1, v / 10.0)) * (w / 2f - r));
            pt.setColor(Ui.PINK);
            c.drawCircle(x, cy, r, pt);
        }
    }
}
