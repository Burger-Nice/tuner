package app.tuner.player;

import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.text.SpannableStringBuilder;
import android.text.style.ForegroundColorSpan;
import android.view.Display;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.accessibility.CaptioningManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.Format;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.common.TrackSelectionOverride;
import androidx.media3.common.TrackSelectionParameters;
import androidx.media3.common.Tracks;
import androidx.media3.common.VideoSize;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.ui.AspectRatioFrameLayout;
import androidx.media3.ui.CaptionStyleCompat;
import androidx.media3.ui.PlayerView;
import androidx.media3.ui.SubtitleView;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Full-screen player for live TV and movies, built on Media3 (ExoPlayer), with airglow's own overlays
 * (design/ui-v1/UI-SPEC.md section 7).
 * Live: ▲▼ zap (the banner changes at once; holding connects where you stop), OK opens the channel list, holding OK
 * goes back to the last channel, ▶ opens the game (or the live games, or what's on), ◀ and Menu open Options, digits jump.
 * Movies and episodes: focus rests on the seek thumb (◀▶ seek, OK pauses, ▲ buttons, ▼ Options), resume position,
 * Up next. Subtitle and audio choices are remembered by language; picture size per channel and per title.
 * What the player can't know (what's on, the game, the score delay, favourites) comes from the app through
 * {@link TunerPlayerPlugin#command}, and choices go back to it as events.
 */
public class PlayerActivity extends AppCompatActivity {
    static PlayerActivity current;
    /** Set just before this activity starts, so MainActivity keeps the app's JavaScript running underneath. */
    static boolean launching;

    /** A channel, movie or episode. */
    static final class Entry {
        String id = "", url = "", title = "", sub = "", logo = "";
        int num;
        long start;
        static Entry from(JSONObject o) throws JSONException {
            Entry e = new Entry();
            e.url = o.getString("url");
            e.id = o.optString("id", e.url);
            e.title = o.optString("title", "");
            e.sub = o.optString("sub", "");
            e.logo = o.optString("logo", "");
            e.num = o.optInt("num", 0);
            e.start = (long) o.optDouble("startAt", 0);
            return e;
        }
    }
    /** Rows from the app: objects (movies and episodes), or for channels the compact form [id, name, number, logo, url?]
     * where a missing url follows the list's pattern tpl ("…/live/user/pass/{id}.ts"). */
    static List<Entry> parse(JSONArray a, String tpl) throws JSONException {
        List<Entry> out = new ArrayList<>(a.length());
        for (int i = 0; i < a.length(); i++) {
            JSONArray row = a.optJSONArray(i);
            if (row == null) { out.add(Entry.from(a.getJSONObject(i))); continue; }
            Entry e = new Entry();
            e.id = row.optString(0);
            e.title = row.optString(1);
            e.num = row.optInt(2);
            e.logo = row.optString(3);
            e.url = row.length() > 4 ? row.optString(4) : tpl == null ? "" : tpl.replace("{id}", e.id);
            out.add(e);
        }
        return out;
    }

    final Handler handler = new Handler(Looper.getMainLooper());
    private ExoPlayer player;
    private PlayerView view;
    private FrameLayout root;
    private SharedPreferences prefs;

    private List<Entry> ring = new ArrayList<>();
    private Entry cur, last;
    private int index;
    private String ringName = "";
    private boolean upNext = true;
    private boolean live;
    private int session;
    private boolean played, exited;
    private String error;
    private String quality = "";
    private JSONObject versions;   // {id, list:[{id, name, label}]}: other copies of what's playing, from the app
    private boolean hdr;
    private int textTracks, audioTracks, retries;
    private long stoppedAt, tunedAt;

    // from the app
    private final Map<String, JSONObject> meta = new HashMap<>();
    JSONObject game;
    private boolean gameLinked;
    private JSONArray liveGames = new JSONArray(), groups;
    private JSONObject pinned;
    private boolean wantChannels, wantGroups;

    // overlays
    private Overlay open;
    private LinearLayout banner, bNx, hint, zap, chip, card, bug;
    private TextView bNum, bName, bLine, bNext, zName, zNow, chipTitle, chipSub, chipOk, cardTitle, cardSub, toast, digitsView;
    private FrameLayout bLogo, zLogo;
    private LinearLayout bTags;
    private Ui.Bar bProg;
    private Ui.Ring chipRing;
    private Ui.Spinner spinner;
    private VodControls vod;
    private String[][] hintNow;
    private boolean hintsOn, hintForce;
    private long zapAt;
    // Live: how far a stall has put the picture behind where the stream started (a TS stream refills at real time, so
    // every stall adds to it until the next tune or reconnect). Reported to the app, which holds every score back by it.
    private long lagMs, stallAt;
    private String digits = "";
    private long okDownAt;
    private boolean okLong, okInPlayer;
    // the action chip (live) and Up next (movies)
    private boolean chipUp, chipIsUpNext;
    // Its one sound: Your team is live (design/sound-v1). On the media stream so it follows the programme's volume;
    // no audio focus, so it mixes over the programme without pausing or ducking it.
    private android.media.SoundPool sounds;
    private int alertId, alertReady;
    private float soundLevel = 1f;
    private String chipId;
    private long chipUntil;
    private int stayIndex = -1;

    private final Runnable hideBanner = () -> { banner.setVisibility(View.GONE); hintForce = false; hintsChanged(); updateBug(); };
    private final Runnable hideToast = () -> toast.setVisibility(View.GONE);
    private final Runnable hideZap = () -> zap.setVisibility(View.GONE);
    private final Runnable jump = this::jumpToTypedChannel;
    private final Runnable stall = this::reconnect;
    // (a reconnect starts again at the live edge: the lag goes; until the picture is back, scores wait as if still stalled)
    private final Runnable retune = () -> { if (player != null && cur != null) { player.setMediaItem(item(cur)); player.prepare(); player.play(); lagMs = 0; if (stallAt > 0) stallAt = SystemClock.uptimeMillis(); sendLag(); } };
    private final Runnable doTune = () -> {
        if (player == null || cur == null) return;
        player.setMediaItem(item(cur));
        player.prepare();
        player.play();
        TunerPlayerPlugin.emit(event("track"));
    };
    private final Runnable askMeta = this::requestMeta;
    private final Runnable chipTick = new Runnable() {
        @Override public void run() {
            if (!chipUp) return;
            long left = chipUntil - SystemClock.uptimeMillis();
            if (chipIsUpNext) left = upNextLeft();
            if (left <= 0) { hideChip(); return; }
            float total = chipIsUpNext ? 30000f : 8000f;
            chipRing.set(Math.min(1, left / total), (int) Math.ceil(left / 1000.0));
            if (chipIsUpNext) chipTitle.setText("Next episode in " + (int) Math.ceil(left / 1000.0) + " s");
            handler.postDelayed(this, 200);
        }
    };
    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (player != null && !live) {
                long d = player.getDuration();
                if (d != C.TIME_UNSET && d > 0) {
                    JSObject e = event("progress");
                    e.put("t", player.getCurrentPosition() / 1000.0);
                    e.put("d", d / 1000.0);
                    TunerPlayerPlugin.emit(e);
                    long left = d - player.getCurrentPosition();
                    if (player.hasNextMediaItem() && stayIndex != index && left > 0 && left <= 30000) {
                        if (!chipUp && open == null) showUpNext();
                    } else if (chipUp && chipIsUpNext) hideChip();
                }
            }
            handler.postDelayed(this, 1000);
        }
    };

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        current = this;
        launching = false;
        Bundle x = getIntent().getExtras();
        TunerPlayerPlugin.Playlist list = TunerPlayerPlugin.playlist;
        if (x == null || list == null || list.entries.isEmpty()) { finish(); return; }
        Ui.init(this);
        ring = new ArrayList<>(list.entries);
        prefs = getSharedPreferences("player", MODE_PRIVATE);
        live = "live".equals(x.getString("mode"));
        session = x.getInt("session");
        ringName = x.getString("ring", live ? "All channels" : "");
        String lv = x.getString("sounds", "on");
        soundLevel = "off".equals(lv) ? 0f : "quiet".equals(lv) ? 0.5f : 1f;
        if (x.containsKey("scoreBug")) prefs.edit().putBoolean("scorebug", x.getBoolean("scoreBug")).apply();   // the app's setting wins
        String sub = x.getString("sub");
        if (sub != null && !sub.isEmpty()) prefs.edit().putString("sub", sub).apply();   // Account / the title page's subtitle choice
        if (live && soundLevel > 0) {
            sounds = new android.media.SoundPool.Builder().setMaxStreams(1).setAudioAttributes(new android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_MEDIA).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build()).build();
            sounds.setOnLoadCompleteListener((p, id, status) -> { if (status == 0) alertReady = id; });
            alertId = sounds.load(this, R.raw.alert, 1);
        }
        upNext = x.getBoolean("upNext", true);
        index = Math.max(0, Math.min(ring.size() - 1, x.getInt("index")));
        cur = ring.get(index);
        String ua = x.getString("ua", "");

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.hide(WindowInsetsCompat.Type.systemBars());
        bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        view = new PlayerView(this);
        view.setUseController(false);
        view.setFocusable(false);
        view.setKeepScreenOn(true);
        view.setShutterBackgroundColor(Ui.BG0);
        styleSubtitles(view.getSubtitleView());
        view.setResizeMode(resizeMode(pictureFor(cur)));
        root.addView(view, new FrameLayout.LayoutParams(-1, -1));
        buildOverlays();
        setContentView(root);

        DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory()
                .setAllowCrossProtocolRedirects(true)
                .setConnectTimeoutMs(15000)
                .setReadTimeoutMs(live ? 12000 : 20000);   // (a weak Wi-Fi link can go quiet for longer than 8 s)
        if (!ua.isEmpty()) http.setUserAgent(ua);
        DefaultRenderersFactory renderers = new DefaultRenderersFactory(this).setEnableDecoderFallback(true);
        // Live: starts after 2 s of picture, and after a stall waits for 6 s so the next hiccup doesn't stall it again: a
        // live TS stream arrives at real time, so whatever is banked when it resumes is all the cushion it gets. Keeps a
        // steady buffer capped in memory; movies get more room.
        DefaultLoadControl load = new DefaultLoadControl.Builder()
                .setBufferDurationsMs(live ? 10000 : 15000, live ? 30000 : 50000, live ? 2000 : 2500, live ? 6000 : 5000)
                .setTargetBufferBytes((live ? 64 : 96) << 20)
                .setPrioritizeTimeOverSizeThresholds(false)
                .build();
        player = new ExoPlayer.Builder(this, renderers)
                .setMediaSourceFactory(new DefaultMediaSourceFactory(this).setDataSourceFactory(http))
                .setLoadControl(load)
                .build();
        view.setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING);
        player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MOVIE).build(), true);
        // Always the best picture: no capping to the 1080p UI size, and straight to the top quality level.
        // The video plane itself runs at the panel's resolution, so 4K streams play in 4K.
        player.setTrackSelectionParameters(player.getTrackSelectionParameters().buildUpon()
                .clearVideoSizeConstraints()
                .clearViewportSizeConstraints()
                .setForceHighestSupportedBitrate(true)
                .build());
        player.setTrackSelectionParameters(subtitlePreference(player.getTrackSelectionParameters().buildUpon()).build());
        player.setVideoChangeFrameRateStrategy(C.VIDEO_CHANGE_FRAME_RATE_STRATEGY_ONLY_IF_SEAMLESS);
        player.addListener(new Player.Listener() {
            @Override public void onPlaybackStateChanged(int s) {
                handler.removeCallbacks(stall);
                if (s == Player.STATE_READY) {
                    played = true; error = null; retries = 0;
                    if (card.getVisibility() == View.VISIBLE) card.setVisibility(View.GONE);
                    if (open instanceof FailedCard) closeOverlay();
                }
                if (s == Player.STATE_ENDED && !live && !player.hasNextMediaItem()) finish();
                // A live stream the server closed, or one stuck buffering: reconnect instead of freezing.
                if (live && s == Player.STATE_ENDED) reconnect();
                if (live && s == Player.STATE_BUFFERING && played) handler.postDelayed(stall, 12000);
            }
            // Live: whenever the picture isn't moving (a stall, a pause, the Assistant taking the sound for a moment), it falls
            // behind by that long: that's lag, and every score waits for it.
            @Override public void onIsPlayingChanged(boolean playing) {
                if (vod != null) vod.playStateChanged();
                if (!live || !played) return;
                long now = SystemClock.uptimeMillis();
                if (!playing && stallAt == 0) { stallAt = now; handler.postDelayed(lagTick, 1000); }
                else if (playing && stallAt > 0) { lagMs += now - stallAt; stallAt = 0; sendLag(); }
            }
            @Override public void onRenderedFirstFrame() {
                long shown = SystemClock.uptimeMillis() - zapAt;
                handler.removeCallbacks(hideZap);
                handler.postDelayed(hideZap, Math.max(0, 600 - shown));
            }
            @Override public void onPlayerError(@NonNull PlaybackException e) {
                if (live && e.errorCode == PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW) { player.seekToDefaultPosition(); player.prepare(); return; }
                if (live && retries < 6 && e.errorCode != PlaybackException.ERROR_CODE_DECODING_FORMAT_EXCEEDS_CAPABILITIES
                        && e.errorCode != PlaybackException.ERROR_CODE_DECODER_INIT_FAILED) { reconnect(); return; }
                error = errorText(e);
                JSObject ev = event("failed");
                ev.put("error", error);
                TunerPlayerPlugin.emit(ev);
                if (live) showFailed(error); else showText(error, 6000);
            }
            @Override public void onTracksChanged(@NonNull Tracks tracks) {
                textTracks = count(tracks, C.TRACK_TYPE_TEXT);
                audioTracks = count(tracks, C.TRACK_TYPE_AUDIO);
                if (banner.getVisibility() == View.VISIBLE) fillBanner();
            }
            @Override public void onVideoSizeChanged(@NonNull VideoSize size) {
                Format f = player.getVideoFormat();
                quality = qualityLabel(size.height);
                hdr = f != null && f.colorInfo != null && (f.colorInfo.colorTransfer == C.COLOR_TRANSFER_ST2084 || f.colorInfo.colorTransfer == C.COLOR_TRANSFER_HLG);
                matchFrameRate();
                if (banner.getVisibility() == View.VISIBLE) fillBanner();
            }
            @Override public void onMediaItemTransition(MediaItem item, int reason) {
                if (live) return;
                index = player.getCurrentMediaItemIndex();
                if (index < 0 || index >= ring.size()) return;
                cur = ring.get(index);
                if (reason == Player.MEDIA_ITEM_TRANSITION_REASON_AUTO && cur.start > 30) player.seekTo(cur.start * 1000);
                if (chipUp && chipIsUpNext) hideChip();
                vod.setItem(cur, index < ring.size() - 1);
                view.setResizeMode(resizeMode(pictureFor(cur)));
                vod.show();
                TunerPlayerPlugin.emit(event("track"));
            }
        });
        view.setPlayer(player);

        if (live) {
            tuneTo(index, false);
        } else {
            vod = new VodControls(this, player, root);
            List<MediaItem> items = new ArrayList<>();
            for (Entry e : ring) items.add(item(e));
            player.setMediaItems(items, index, cur.start > 30 ? cur.start * 1000 : 0);
            player.prepare();
            player.play();
            vod.setItem(cur, index < ring.size() - 1);
            vod.show();
            TunerPlayerPlugin.emit(event("track"));
            handler.post(tick);
        }
        // What the app sent while this was starting (Up next for an episode resumed at once).
        String[][] early;
        synchronized (TunerPlayerPlugin.early) { early = TunerPlayerPlugin.early.toArray(new String[0][]); TunerPlayerPlugin.early.clear(); }
        if (session == TunerPlayerPlugin.session()) for (String[] c : early) command(c[0], c[1]);
    }
    int session() { return session; }

    private MediaItem item(Entry e) {
        MediaItem.Builder b = new MediaItem.Builder()
                .setUri(Uri.parse(e.url))
                .setMediaMetadata(new MediaMetadata.Builder().setTitle(e.title).build());
        String u = e.url.toLowerCase(Locale.ROOT).split("\\?")[0];
        if (u.endsWith(".m3u8")) b.setMimeType(MimeTypes.APPLICATION_M3U8);
        else if (u.endsWith(".ts")) b.setMimeType(MimeTypes.VIDEO_MP2T);
        return b.build();
    }

    // ---------- the overlays' views ----------

    private void buildOverlays() {
        // banner: number, logo, name + ring, now + times + feed, progress + next, tags, LIVE
        banner = new LinearLayout(this);
        banner.setGravity(Gravity.CENTER_VERTICAL);
        banner.setPadding(Ui.dp(14), 0, Ui.dp(14), 0);
        banner.setBackground(Ui.round(Ui.BANNER, 16));
        bNum = Ui.text(this, "", 24, Ui.T1, Ui.inter700);
        bNum.setGravity(Gravity.CENTER);
        Ui.tabular(bNum);
        banner.addView(bNum, gapped(new LinearLayout.LayoutParams(Ui.dp(40), -2)));
        bLogo = Ui.logo(this, 44);
        banner.addView(bLogo, gapped(new LinearLayout.LayoutParams(Ui.dp(44), Ui.dp(44))));
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        bName = Ui.line(this, "", 16, Ui.T1, Ui.inter650);
        bLine = Ui.line(this, "", 14, Ui.T2, Ui.inter500);
        col.addView(bName);
        col.addView(bLine);
        banner.addView(col, gapped(new LinearLayout.LayoutParams(0, -2, 1)));
        bNx = new LinearLayout(this);
        bNx.setOrientation(LinearLayout.VERTICAL);
        bProg = new Ui.Bar(this, Ui.S2);
        bNx.addView(bProg, new LinearLayout.LayoutParams(Ui.dp(120), Ui.dp(4)));
        bNext = Ui.line(this, "", 14, Ui.T3, Ui.inter500);
        bNext.setMaxWidth(Ui.dp(220));
        LinearLayout.LayoutParams nl = new LinearLayout.LayoutParams(-2, -2);
        nl.topMargin = Ui.dp(4);
        bNx.addView(bNext, nl);
        banner.addView(bNx, gapped(new LinearLayout.LayoutParams(-2, -2)));
        bTags = new LinearLayout(this);
        bTags.setGravity(Gravity.CENTER_VERTICAL);
        banner.addView(bTags);
        FrameLayout.LayoutParams bl = new FrameLayout.LayoutParams(-1, Ui.dp(64), Gravity.TOP);
        bl.setMargins(Ui.dp(48), Ui.dp(27), Ui.dp(48), 0);
        banner.setVisibility(View.GONE);
        root.addView(banner, bl);

        // zap card: logo, name, what's on; shown at once on a zap until the first frame
        zap = new LinearLayout(this);
        zap.setGravity(Gravity.CENTER_VERTICAL);
        zap.setPadding(Ui.dp(26), Ui.dp(18), Ui.dp(26), Ui.dp(18));
        GradientDrawable zb = Ui.round(Ui.PANEL, 24);
        zb.setStroke(Math.max(1, Ui.dp(1)), Ui.BORDER);
        zap.setBackground(zb);
        zLogo = Ui.logo(this, 56);
        zap.addView(zLogo, gapped(new LinearLayout.LayoutParams(Ui.dp(56), Ui.dp(56)), 16));
        LinearLayout zc = new LinearLayout(this);
        zc.setOrientation(LinearLayout.VERTICAL);
        zName = Ui.line(this, "", 22, Ui.T1, Ui.outfit700);
        zName.setMaxWidth(Ui.dp(420));
        zNow = Ui.line(this, "", 16, Ui.T2, Ui.inter500);
        zNow.setMaxWidth(Ui.dp(420));
        zc.addView(zName);
        zc.addView(zNow);
        zap.addView(zc);
        zap.setVisibility(View.GONE);
        root.addView(zap, new FrameLayout.LayoutParams(-2, -2, Gravity.CENTER));

        // score on picture (off by default)
        bug = new LinearLayout(this);
        bug.setGravity(Gravity.CENTER_VERTICAL);
        bug.setPadding(Ui.dp(22), 0, Ui.dp(18), 0);
        bug.setBackground(new Ui.Plate(Ui.BANNER, 4));
        bug.setVisibility(View.GONE);
        FrameLayout.LayoutParams gl = new FrameLayout.LayoutParams(-2, Ui.dp(36), Gravity.TOP | Gravity.END);
        gl.setMargins(0, Ui.dp(27), Ui.dp(48), 0);
        root.addView(bug, gl);

        // status card (reconnecting) and short messages, bottom centre
        card = new LinearLayout(this);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(Ui.dp(22), Ui.dp(16), Ui.dp(22), Ui.dp(16));
        card.setBackground(Ui.panelBg());
        spinner = new Ui.Spinner(this);
        card.addView(spinner, gapped(new LinearLayout.LayoutParams(Ui.dp(26), Ui.dp(26)), 12));
        LinearLayout cc = new LinearLayout(this);
        cc.setOrientation(LinearLayout.VERTICAL);
        cardTitle = Ui.text(this, "", 20, Ui.T1, Ui.outfit700);
        cardSub = Ui.text(this, "", 15, Ui.T2, Ui.inter500);
        cc.addView(cardTitle);
        cc.addView(cardSub);
        card.addView(cc);
        card.setVisibility(View.GONE);
        FrameLayout.LayoutParams cl = new FrameLayout.LayoutParams(-2, -2, Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        cl.bottomMargin = Ui.dp(96);
        root.addView(card, cl);
        toast = Ui.text(this, "", 16, Ui.T1, Ui.inter500);
        toast.setPadding(Ui.dp(20), Ui.dp(12), Ui.dp(20), Ui.dp(12));
        toast.setBackground(Ui.panelBg());
        toast.setMaxWidth(Ui.dp(560));
        toast.setGravity(Gravity.CENTER);
        toast.setVisibility(View.GONE);
        root.addView(toast, new FrameLayout.LayoutParams(cl));

        // typed channel number
        digitsView = Ui.text(this, "", 40, Ui.T1, Ui.inter700);
        Ui.tabular(digitsView);
        digitsView.setPadding(Ui.dp(20), Ui.dp(6), Ui.dp(20), Ui.dp(6));
        digitsView.setBackground(Ui.panelBg());
        digitsView.setVisibility(View.GONE);
        FrameLayout.LayoutParams dl = new FrameLayout.LayoutParams(-2, -2, Gravity.TOP | Gravity.END);
        dl.setMargins(0, Ui.dp(27), Ui.dp(48), 0);
        root.addView(digitsView, dl);

        // action chip / Up next, bottom right above the hint bar
        chip = new LinearLayout(this);
        chip.setGravity(Gravity.CENTER_VERTICAL);
        chip.setPadding(Ui.dp(12), Ui.dp(10), Ui.dp(16), Ui.dp(10));
        chip.setBackground(Ui.panelBg());
        chipRing = new Ui.Ring(this);
        chip.addView(chipRing, gapped(new LinearLayout.LayoutParams(Ui.dp(40), Ui.dp(40)), 12));
        LinearLayout chc = new LinearLayout(this);
        chc.setOrientation(LinearLayout.VERTICAL);
        chipTitle = Ui.line(this, "", 16, Ui.T1, Ui.inter650);
        chipSub = Ui.line(this, "", 14, Ui.T2, Ui.inter500);
        chc.addView(chipTitle);
        chc.addView(chipSub);
        chip.addView(chc, gapped(new LinearLayout.LayoutParams(-2, -2), 12));
        chip.addView(Ui.kbd(this, "OK"), gapped(new LinearLayout.LayoutParams(-2, Ui.dp(22)), 6));
        chipOk = Ui.text(this, "to switch", 14, Ui.T1, Ui.inter500);
        chip.addView(chipOk);
        chip.setVisibility(View.GONE);
        FrameLayout.LayoutParams chl = new FrameLayout.LayoutParams(-2, -2, Gravity.BOTTOM | Gravity.END);
        chl.setMargins(0, 0, Ui.dp(48), Ui.dp(64));
        root.addView(chip, chl);

        // hint bar: a scrim fading up from the bottom edge, key caps and labels
        hint = new LinearLayout(this);
        hint.setGravity(Gravity.BOTTOM | Gravity.START);
        hint.setPadding(Ui.dp(48), 0, Ui.dp(48), Ui.dp(30));
        hint.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[] { 0x0015131D, Ui.SCRIM, 0xF015131D }));
        hint.setVisibility(View.GONE);
        root.addView(hint, new FrameLayout.LayoutParams(-1, Ui.dp(64), Gravity.BOTTOM));
    }
    private static LinearLayout.LayoutParams gapped(LinearLayout.LayoutParams lp) { return gapped(lp, 12); }
    private static LinearLayout.LayoutParams gapped(LinearLayout.LayoutParams lp, int dp) { lp.setMarginEnd(Ui.dp(dp)); return lp; }

    // ---------- banner ----------

    private JSONObject metaOf(Entry e) { return e == null ? null : meta.get(e.id); }
    private static final SimpleDateFormat HM = new SimpleDateFormat("HH:mm", Locale.ROOT);   // the UI thread only
    static String hm(long t) { return HM.format(new Date(t)); }

    private void showBanner() {
        if (!live || open != null) return;
        fillBanner();
        banner.setVisibility(View.VISIBLE);
        handler.removeCallbacks(hideBanner);
        handler.postDelayed(hideBanner, 4000);
        if (!hintsOn) hintsOn = hintForce || bump("live");
        hintsChanged();
        updateBug();
    }
    private void fillBanner() {
        if (cur == null) return;
        bNum.setText(cur.num > 0 ? String.valueOf(cur.num) : "");
        bNum.setVisibility(cur.num > 0 ? View.VISIBLE : View.GONE);
        Ui.bindLogo(bLogo, cur.title, cur.logo);
        SpannableStringBuilder name = new SpannableStringBuilder(cur.title);
        if (!ringName.isEmpty() && index >= 0) {
            int from = name.length();
            name.append("   ").append(ringName).append(" · ").append(String.valueOf(index + 1)).append(" of ").append(String.valueOf(ring.size()));
            name.setSpan(new ForegroundColorSpan(Ui.T3), from, name.length(), 0);
            name.setSpan(new android.text.style.AbsoluteSizeSpan(14, true), from, name.length(), 0);
            name.setSpan(new TypefaceSpanCompat(Ui.inter500), from, name.length(), 0);
        }
        bName.setText(name);
        JSONObject m = metaOf(cur);
        StringBuilder l2 = new StringBuilder();
        boolean nx = false;
        if (m != null && !m.optString("now").isEmpty()) {
            l2.append(m.optString("now"));
            long s = m.optLong("start"), e = m.optLong("end");
            if (s > 0 && e > 0) {
                l2.append("  ·  ").append(hm(s)).append(" to ").append(hm(e));
                bProg.set((System.currentTimeMillis() - s) / (float) Math.max(1, e - s));
                nx = true;
            }
            if (!m.optString("feed").isEmpty()) l2.append("  ·  ").append(m.optString("feed"));
            String next = m.optString("next");
            bNext.setText(next.isEmpty() ? "" : "Next " + (m.optLong("nextStart") > 0 ? hm(m.optLong("nextStart")) + " " : "") + next);
        } else {
            l2.append(error != null ? error : played ? "No guide for this channel" : "Connecting…");
            bNext.setText("");
        }
        bLine.setText(l2);
        bNx.setVisibility(nx ? View.VISIBLE : View.GONE);
        bTags.removeAllViews();
        if (!quality.isEmpty()) bTags.addView(withGap(Ui.tag(this, quality, true)));
        if (hdr) bTags.addView(withGap(Ui.tag(this, "HDR", true)));
        if (textTracks > 0) bTags.addView(withGap(Ui.tag(this, "CC", false)));
        if (m != null && m.optBoolean("live")) bTags.addView(Ui.livePill(this, false));
    }
    private View withGap(TextView t) {
        LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) t.getLayoutParams();
        lp.setMarginEnd(Ui.dp(8));
        return t;
    }

    /** A TypefaceSpan that takes a Typeface on every API level. */
    static final class TypefaceSpanCompat extends android.text.style.MetricAffectingSpan {
        private final android.graphics.Typeface tf;
        TypefaceSpanCompat(android.graphics.Typeface tf) { this.tf = tf; }
        @Override public void updateDrawState(android.text.TextPaint p) { p.setTypeface(tf); }
        @Override public void updateMeasureState(@NonNull android.text.TextPaint p) { p.setTypeface(tf); }
    }

    private void showZapCard() {
        if (cur == null) return;
        Ui.bindLogo(zLogo, cur.title, cur.logo);
        zName.setText(cur.title);
        JSONObject m = metaOf(cur);
        String now = m == null ? "" : m.optString("now");
        zNow.setText(now);
        zNow.setVisibility(now.isEmpty() ? View.GONE : View.VISIBLE);
        zap.setVisibility(View.VISIBLE);
        zapAt = SystemClock.uptimeMillis();
        handler.removeCallbacks(hideZap);
        handler.postDelayed(hideZap, 8000);
    }

    // ---------- hint bar ----------

    /** True while a hint for this place has been shown fewer than 5 times. */
    private boolean bump(String where) {
        int n = prefs.getInt("hint:" + where, 0);
        if (n >= 5) return false;
        prefs.edit().putInt("hint:" + where, n + 1).apply();
        return true;
    }
    void hintsChanged() {
        String[][] h = null;
        if (open != null) h = hintsOn ? open.hints() : null;
        else if (chipUp) h = chipIsUpNext ? new String[][] { { "OK", "Play now" }, { "Back", "Stay on this one" } }
                : new String[][] { { "OK", "Switch" }, { "Back", "Dismiss" }, { "◀", "Options" }, { "▶", "Game" }, { "▲ ▼", "Zap" } };
        else if (!live && vod != null && vod.visible()) h = hintsOn ? vod.hints() : null;
        else if (live && banner.getVisibility() == View.VISIBLE && hintsOn)
            h = new String[][] { { "OK", "Channels" }, { "◀", "Options" }, { "▶", gameLinked ? "Game" : liveGames.length() > 0 ? "Live games" : "Info" }, { "▲ ▼", "Zap" }, { "Hold OK", "Last" } };
        if (h == null) { hint.setVisibility(View.GONE); hintNow = null; if (open == null && !chipUp && (banner.getVisibility() != View.VISIBLE)) hintsOn = false; return; }
        if (!java.util.Arrays.deepEquals(h, hintNow)) {
            hintNow = h;
            hint.removeAllViews();
            for (String[] k : h) {
                hint.addView(Ui.kbd(this, k[0]), gapped(new LinearLayout.LayoutParams(-2, Ui.dp(22)), 6));
                TextView t = Ui.text(this, k[1], 14, Ui.T2, Ui.inter500);
                hint.addView(t, gapped(new LinearLayout.LayoutParams(-2, Ui.dp(22)), 22));
                t.setGravity(Gravity.CENTER_VERTICAL);
            }
        }
        hint.setVisibility(View.VISIBLE);
    }

    // ---------- score on picture ----------

    private boolean bugOn() { return prefs.getBoolean("scorebug", false); }
    private void updateBug() {
        boolean show = live && bugOn() && gameLinked && game != null && open == null && banner.getVisibility() != View.VISIBLE;
        if (!show) { bug.setVisibility(View.GONE); return; }
        bug.removeAllViews();
        boolean hidden = game.optBoolean("hidden");
        JSONArray sc = game.optJSONArray("score");
        String[] sides = { "away", "home" };
        for (int k = 0; k < 2; k++) {
            JSONObject t = game.optJSONObject(sides[k]);
            if (t == null) continue;
            View edge = new View(this);
            edge.setBackgroundColor(Ui.parse(t.optString("a"), Ui.BORDER_STRONG));
            bug.addView(edge, gapped(new LinearLayout.LayoutParams(Ui.dp(4), Ui.dp(24)), 8));
            bug.addView(Ui.text(this, t.optString("abbr"), 14, Ui.T1, Ui.inter700), gapped(new LinearLayout.LayoutParams(-2, -2), 6));
            if (!hidden && sc != null) {
                TextView n = Ui.text(this, sc.optString(k), 24, Ui.T1, Ui.barlow);
                Ui.tabular(n);
                bug.addView(n, gapped(new LinearLayout.LayoutParams(-2, -2), 14));
            } else bug.addView(new View(this), gapped(new LinearLayout.LayoutParams(0, 1), 8));
        }
        if (hidden) bug.addView(Ui.iconView(this, "eyeOff", Ui.T2, 16), gapped(new LinearLayout.LayoutParams(Ui.dp(16), Ui.dp(16)), 4));
        bug.addView(Ui.text(this, game.optString("clock"), 14, Ui.T2, Ui.inter650));
        bug.setVisibility(View.VISIBLE);
    }

    // ---------- the action chip and Up next ----------

    private String[] chipLater;   // a chip that came while a panel was open: shown when it closes
    private void showChip(String title, String sub, String id) {
        if (!live) return;
        if (open != null) { chipLater = new String[] { title, sub, id }; return; }
        long since = SystemClock.uptimeMillis() - tunedAt;
        if (since < 10000) {   // never in the first 10 s after a tune
            handler.postDelayed(() -> { if (cur != null && !id.equals(cur.id)) showChip(title, sub, id); }, 10000 - since);
            return;
        }
        chipIsUpNext = false;
        chipId = id;
        chipTitle.setText(title);
        chipSub.setText(sub);
        chipOk.setText("to switch");
        chipUntil = SystemClock.uptimeMillis() + 8000;
        chipUp = true;
        if (sounds != null && alertReady == alertId && alertId != 0) sounds.play(alertId, soundLevel, soundLevel, 1, 0, 1f);
        chip.setVisibility(View.VISIBLE);
        handler.removeCallbacks(chipTick);
        handler.post(chipTick);
        hintsChanged();
    }
    private long upNextLeft() {
        if (player == null) return 0;
        long d = player.getDuration();
        return d == C.TIME_UNSET ? 0 : d - player.getCurrentPosition();
    }
    private void showUpNext() {
        if (index + 1 >= ring.size()) return;
        Entry n = ring.get(index + 1);
        chipIsUpNext = true;
        chipTitle.setText("Next episode in 30 s");
        chipSub.setText(n.sub == null || n.sub.isEmpty() ? n.title : n.sub);
        chipOk.setText("play now");
        chipUp = true;
        chip.setVisibility(View.VISIBLE);
        handler.removeCallbacks(chipTick);
        handler.post(chipTick);
        hintsChanged();
    }
    boolean upNextShowing() { return chipUp && chipIsUpNext; }
    private void hideChip() {
        if (!chipUp) return;
        chipUp = false;
        chip.setVisibility(View.GONE);
        handler.removeCallbacks(chipTick);
        hintsChanged();
    }

    // ---------- panels ----------

    void show(Overlay o) {
        if (open != null) { root.removeView(open.root); Overlay was = open; open = null; was.closed(); }
        open = o;
        banner.setVisibility(View.GONE);
        handler.removeCallbacks(hideBanner);
        if (chipUp && !chipIsUpNext) hideChip();
        if (vod != null) vod.hide();
        int at = root.indexOfChild(hint);
        root.addView(o.root, at);
        hintsOn = hintForce || bump("panel:" + o.getClass().getSimpleName() + ":" + (o instanceof ListPanel ? ((ListPanel) o).title.getText() : ""));
        if (o instanceof ListPanel) ((ListPanel) o).render();
        updateBug();
        hintsChanged();
    }
    void closeOverlay() {
        if (open == null) return;
        Overlay o = open;
        open = null;
        root.removeView(o.root);
        o.closed();
        hintsOn = false;
        hintsChanged();
        updateBug();
        if (chipLater != null && open == null) { String[] c = chipLater; chipLater = null; if (cur != null && !c[2].equals(cur.id)) showChip(c[0], c[1], c[2]); }
    }
    private ListPanel.Item row(String title, String sub, String value, String icon, Runnable ok) {
        ListPanel.Item it = new ListPanel.Item(title);
        it.sub = sub;
        it.value = value;
        it.icon = icon;
        it.ok = ok;
        it.chevron = ok != null && value != null;
        return it;
    }

    // channel list (mini guide)
    private ListPanel channels;
    private void openChannels() {
        if (ring.isEmpty()) return;
        ListPanel p = new ListPanel(this, ringName.isEmpty() ? "Channels" : ringName, true, 352);
        p.showBack(true);
        p.setCount(index >= 0 ? (index + 1) + " of " + ring.size() : ring.size() + " channels");
        if (pinned != null && cur != null && !pinned.optString("id").equals(cur.id)) {
            ListPanel.Item pin = new ListPanel.Item(pinned.optString("title"));
            pin.sub = pinned.optString("sub");
            pin.icon = "pin";
            pin.logoName = pinned.optString("name");
            pin.logoUrl = pinned.optString("logo");
            pin.live = true;
            pin.pin = true;
            pin.height = 56;
            String id = pinned.optString("id");
            pin.ok = () -> { closeOverlay(); pick(id, "pin"); };
            p.fixed.add(pin);
        }
        p.source(new ListPanel.Source() {
            public int count() { return ring.size(); }
            public ListPanel.Item get(int i) {
                Entry e = ring.get(i);
                ListPanel.Item it = new ListPanel.Item(e.title);
                it.num = e.num > 0 ? String.valueOf(e.num) : "";
                it.logoName = e.title;
                it.logoUrl = e.logo;
                it.height = 52;
                it.current = i == index;
                JSONObject m = meta.get(e.id);
                if (m != null) {
                    it.sub = m.optString("now");
                    it.live = m.optBoolean("live");
                    long s = m.optLong("start"), en = m.optLong("end");
                    if (s > 0 && en > s) it.progress = (System.currentTimeMillis() - s) / (float) (en - s);
                }
                final int fi = i;
                it.ok = () -> { closeOverlay(); if (fi != index) tuneTo(fi, false); else showBanner(); };
                return it;
            }
        }, Math.max(0, index));
        // Watching another game while your team plays: the list opens on your team's row, one OK away.
        if (!p.fixed.isEmpty() && gameLinked) p.sel = 0;
        p.onLeft = this::openGroups;
        p.onMove = (i) -> { handler.removeCallbacks(askMeta); handler.postDelayed(askMeta, 150); };
        p.onClosed = () -> channels = null;
        p.hintKeys = new String[][] { { "OK", "Tune" }, { "◀", "Groups" }, { "▲ ▼", "Move" }, { "Back", "Close" } };
        channels = p;
        show(p);
        requestMeta();
    }
    /** Asks the app what's on for the channels in view (and the one playing). */
    private void requestMeta() {
        JSArray ids = new JSArray();
        long now = System.currentTimeMillis();
        if (cur != null && stale(cur.id, now)) ids.put(cur.id);
        if (channels != null) {
            int from = channels.firstShown(), n = Math.max(9, channels.shownCount() + 2);
            for (int i = Math.max(0, from - 2); i < Math.min(ring.size(), from + n); i++) if (stale(ring.get(i).id, now)) ids.put(ring.get(i).id);
        }
        if (ids.length() == 0) return;
        JSObject e = event("need-meta");
        e.put("ids", ids);
        TunerPlayerPlugin.emit(e);
    }
    private final Map<String, Long> asked = new HashMap<>();
    private boolean stale(String id, long now) {
        JSONObject m = meta.get(id);
        if (m != null && m.optLong("end", 0) > now) return false;
        Long t = asked.get(id);
        if (t != null && now - t < 60000) return false;
        asked.put(id, now);
        return true;
    }

    // groups: ◀ from the channel list; picking one makes it the zap ring
    private void openGroups() {
        if (groups == null) { wantGroups = true; emitNeed("groups"); return; }
        ListPanel p = new ListPanel(this, "Groups", true, 352);
        p.setCount("Up and Down stay here");
        List<ListPanel.Item> items = new ArrayList<>();
        int sel = 0;
        for (int i = 0; i < groups.length(); i++) {
            JSONObject g = groups.optJSONObject(i);
            if (g == null) continue;
            ListPanel.Item it = new ListPanel.Item(g.optString("name"));
            it.radio = true;
            it.radioOn = g.optString("name").equals(ringName);
            if (it.radioOn) sel = items.size();
            it.badge = g.optString("count");
            String key = g.optString("key");
            it.ok = () -> { wantChannels = true; JSObject e = event("group"); e.put("key", key); TunerPlayerPlugin.emit(e); };
            items.add(it);
        }
        p.source(ListPanel.of(items), sel);
        p.onRight = this::openChannels;
        p.backTo = this::openChannels;
        p.hintKeys = new String[][] { { "OK", "Choose" }, { "▶", "Channels" }, { "▲ ▼", "Move" }, { "Back", "Channels" } };
        show(p);
    }
    private void emitNeed(String what) { JSObject e = event("need"); e.put("what", what); TunerPlayerPlugin.emit(e); }

    /** ▶: the game on this channel; else the live games; else what's on. */
    private void right() {
        if (gameLinked) { show(new GamePanel(this, 0)); return; }
        if (liveGames.length() > 0) { openLiveGames(); return; }
        openInfo();
    }
    private void openLiveGames() {
        ListPanel p = new ListPanel(this, "Live games", false, 264);
        p.setCount("OK switches");
        List<ListPanel.Item> items = new ArrayList<>();
        for (int i = 0; i < liveGames.length(); i++) {
            JSONObject g = liveGames.optJSONObject(i);
            if (g == null) continue;
            ListPanel.Item it = new ListPanel.Item(g.optString("title"));
            it.sub = g.optString("sub");
            it.live = g.optBoolean("live");
            it.height = 64;
            String id = g.optString("chId");
            it.disabled = id.isEmpty();
            it.ok = () -> { closeOverlay(); pick(id, "games"); };
            items.add(it);
        }
        p.source(ListPanel.of(items), 0);
        String note = liveGames.length() > 0 ? liveGames.optJSONObject(0).optString("note") : "";
        p.setFoot(note);
        p.onLeft = this::closeOverlay;
        show(p);
    }
    private void openInfo() {
        JSONObject m = metaOf(cur);
        ListPanel p = new ListPanel(this, "On now", false, 320);
        List<ListPanel.Item> items = new ArrayList<>();
        if (m != null && !m.optString("now").isEmpty()) {
            ListPanel.Item now = new ListPanel.Item(m.optString("now"));
            if (m.optLong("start") > 0) now.sub = hm(m.optLong("start")) + " to " + hm(m.optLong("end"));
            now.height = 56;
            items.add(now);
            if (!m.optString("next").isEmpty()) {
                ListPanel.Item nx = new ListPanel.Item(m.optString("next"));
                nx.sub = m.optLong("nextStart") > 0 ? "Next · " + hm(m.optLong("nextStart")) : "Next";
                nx.height = 56;
                items.add(nx);
            }
            p.setFoot(m.optString("desc"));
        } else {
            p.setCaption(cur == null ? "" : cur.title);
            p.setFoot("No guide for this channel.");
        }
        p.source(ListPanel.of(items), 0);
        p.onLeft = this::closeOverlay;
        p.hintKeys = new String[][] { { "▲ ▼", "Move" }, { "Back", "Close" } };
        show(p);
    }

    /** Tune a channel the app named (a feed, a live game, the pinned row, the chip). */
    private void pick(String id, String from) {
        for (int i = 0; i < ring.size(); i++) if (ring.get(i).id.equals(id)) { tuneTo(i, false); return; }
        JSObject e = event("pick");
        e.put("id", id);
        e.put("from", from);
        TunerPlayerPlugin.emit(e);
    }

    // ---------- options ----------

    void openOptions() {
        if (player == null || isFinishing()) return;
        if (versions == null || cur == null || !cur.id.equals(versions.optString("id"))) emitNeed("versions");   // for Quality, ready when it's opened
        ListPanel p = new ListPanel(this, "Options", true, 320);
        List<ListPanel.Item> items = new ArrayList<>();
        if (live) {
            if (gameLinked && game != null) {
                String v = game.has("synced") && !game.isNull("synced") ? game.optInt("synced") + " s" : game.optInt("delay", 60) + " s";
                items.add(row("Sync score", "Match the game clock", v, "refresh", this::openSync));
                JSONArray feeds = otherFeeds();
                if (feeds.length() > 0) items.add(row("Other feeds for this game", feedNames(feeds), String.valueOf(feeds.length()), "tv", this::openFeeds));
            }
        }
        items.add(textTracks > 0 ? row("Subtitles", null, subtitleValue(), "cc", () -> openSubtitles(true))
                : disabled(row("Subtitles", live ? "No subtitles on this channel" : "No subtitles in this file", null, "cc", null)));
        items.add(audioTracks > 1 ? row("Audio", null, audioValue(), "audio", () -> openAudio(true))
                : disabled(row("Audio", audioTracks == 1 ? audioValue() : "One audio track", null, "audio", null)));
        items.add(row("Picture size", live ? "This channel" : "This title", PICTURE_NAMES[pictureIndex(pictureFor(cur))], "pic", this::openPicture2));
        items.add(row("Quality", qualityDetails(player.getVideoFormat()), qualityName(player.getVideoFormat()), "quality", () -> openQuality(true)));
        if (live) {
            JSONObject m = metaOf(cur);
            boolean fav = m != null && m.optBoolean("fav");
            items.add(row(fav ? "Remove from favourites" : "Favourite this channel", null, fav ? "On" : "Off", fav ? "star" : "starO", () -> {
                JSObject e = event("fav");
                e.put("id", cur.id);
                TunerPlayerPlugin.emit(e);
                closeOverlay();
            }));
            if (gameLinked) items.add(row("Score on picture", null, bugOn() ? "On" : "Off", "score", () -> {
                prefs.edit().putBoolean("scorebug", !bugOn()).apply();
                JSObject ev = event("setting");   // the same switch as Account > NBA > Score on picture
                ev.put("key", "scoreBug");
                ev.put("value", bugOn());
                TunerPlayerPlugin.emit(ev);
                closeOverlay();
                showText("Score on picture: " + (bugOn() ? "On" : "Off"), 1800);
            }));
        } else {
            float sp = player.getPlaybackParameters().speed;
            items.add(row("Speed", null, speedName(sp), "speed", this::openSpeed));
            boolean on = prefs.getBoolean("matchRate", false);
            items.add(row("Match frame rate", "Switches the TV to the film's rate", on ? "On" : "Off", "frames", () -> {
                prefs.edit().putBoolean("matchRate", !on).apply();
                matchFrameRate();
                openOptions();
            }));
        }
        for (ListPanel.Item it : items) it.chevron = it.ok != null && it.value != null && !"On".equals(it.value) && !"Off".equals(it.value);
        p.source(ListPanel.of(items), 0);
        // keep the focus off disabled rows
        while (p.sel < items.size() - 1 && items.get(p.sel).disabled) p.sel++;
        p.onRight = () -> { ListPanel.Item it = p.itemAt(p.sel); if (it.ok != null && it.chevron) it.ok.run(); };
        show(p);
    }
    private static ListPanel.Item disabled(ListPanel.Item it) { it.disabled = true; return it; }

    private JSONArray otherFeeds() {
        JSONArray out = new JSONArray();
        JSONArray f = game == null ? null : game.optJSONArray("feeds");
        if (f != null) for (int i = 0; i < f.length(); i++) { JSONObject o = f.optJSONObject(i); if (o != null && cur != null && !cur.id.equals(o.optString("id"))) out.put(o); }
        return out;
    }
    private static String feedNames(JSONArray f) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < Math.min(2, f.length()); i++) { if (b.length() > 0) b.append(", "); b.append(f.optJSONObject(i).optString("name")); }
        if (f.length() > 2) b.append(" +").append(f.length() - 2);
        return b.toString();
    }
    private void openFeeds() {
        JSONArray f = otherFeeds();
        ListPanel p = new ListPanel(this, "Other feeds", true, 352);
        p.setCount(game == null ? "" : game.optString("title"));
        List<ListPanel.Item> items = new ArrayList<>();
        for (int i = 0; i < f.length(); i++) {
            JSONObject o = f.optJSONObject(i);
            ListPanel.Item it = new ListPanel.Item(o.optString("name"));
            it.sub = o.optString("label");
            it.logoName = o.optString("name");
            it.logoUrl = o.optString("logo");
            it.num = o.optInt("num") > 0 ? String.valueOf(o.optInt("num")) : "";
            it.height = 56;
            String id = o.optString("id");
            it.ok = () -> { closeOverlay(); pick(id, "feed"); };
            items.add(it);
        }
        p.source(ListPanel.of(items), 0);
        p.backTo = this::openOptions;
        p.onLeft = this::openOptions;
        show(p);
    }

    // Match the clock: clocks only. The list opens on the stored delay's clock; newer clocks are collapsed behind one row.
    private long syncSeenAt;
    // (if the app doesn't answer in time, say so: Sync must never look like nothing happened)
    private final Runnable syncSlow = () -> showText("The game clocks didn't come in. Try Sync again in a moment.", 5000);
    void openSync() {
        syncSeenAt = System.currentTimeMillis();
        handler.removeCallbacks(syncSlow);
        handler.postDelayed(syncSlow, 8000);
        showText("Getting the game clocks…", 8000);
        JSObject e = event("need");
        e.put("what", "clocks");
        e.put("seenAt", syncSeenAt);
        TunerPlayerPlugin.emit(e);
    }
    private void showClocks(JSONObject d, boolean expanded) {
        handler.removeCallbacks(syncSlow);
        if (toast.getVisibility() == View.VISIBLE) toast.setVisibility(View.GONE);
        JSONArray list = d.optJSONArray("list");
        if (list == null || list.length() == 0) { showText("No game clocks yet to match", 3000); return; }
        long seenAt = d.optLong("seenAt", syncSeenAt);
        int curIdx = Math.max(0, Math.min(list.length() - 1, d.optInt("current", 0)));
        ListPanel p = new ListPanel(this, "Match the clock", true, 360);
        p.setCaption("Pick the game clock on the picture now. Only clocks are listed.");
        List<ListPanel.Item> items = new ArrayList<>();
        int from = expanded ? 0 : curIdx;
        if (!expanded && curIdx > 0) {
            ListPanel.Item more = new ListPanel.Item("Newer clocks hidden");
            more.icon = "chevU";
            more.badge = String.valueOf(curIdx);
            more.height = 40;
            more.disabled = true;
            items.add(more);
            p.onTopUp = () -> showClocks(d, true);
        }
        for (int i = from; i < list.length(); i++) {
            JSONObject c = list.optJSONObject(i);
            ListPanel.Item it = new ListPanel.Item(c.optString("label"));
            it.clock = true;
            it.height = 52;
            if (i == curIdx) it.badge = "Current setting";
            long at = c.optLong("at");
            it.ok = () -> {
                closeOverlay();
                JSObject ev = event("sync");
                ev.put("at", at);
                ev.put("seenAt", seenAt);
                TunerPlayerPlugin.emit(ev);
            };
            items.add(it);
        }
        p.source(ListPanel.of(items), expanded ? curIdx : (curIdx > 0 ? 1 : 0));
        if (expanded) p.sel = curIdx;
        p.setFoot(d.optString("note"));
        p.backTo = this::openOptions;
        p.hintKeys = curIdx > 0 && !expanded ? new String[][] { { "OK", "This clock" }, { "▲", "Newer" }, { "▼", "Older" }, { "Back", "Options" } }
                : new String[][] { { "OK", "This clock" }, { "▲ ▼", "Move" }, { "Back", "Options" } };
        show(p);
    }

    void revealGame() {
        if (game == null) return;
        JSObject e = event("reveal");
        e.put("gameId", game.optString("id"));
        TunerPlayerPlugin.emit(e);
    }

    // picture size: the picture changes as the focus moves; OK keeps it for this channel or title
    private static final String[] PICTURES = { "fit", "zoom", "stretch" };
    private static final String[] PICTURE_NAMES = { "Fit", "Zoom", "Stretch" };
    private static final String[] PICTURE_SUBS = { "Whole picture, bars if needed", "Fill the screen, crop the edges", "Fill the screen, distort" };
    private static int resizeMode(String p) {
        return "zoom".equals(p) ? AspectRatioFrameLayout.RESIZE_MODE_ZOOM : "stretch".equals(p) ? AspectRatioFrameLayout.RESIZE_MODE_FILL : AspectRatioFrameLayout.RESIZE_MODE_FIT;
    }
    private static int pictureIndex(String p) {
        for (int i = 0; i < PICTURES.length; i++) if (PICTURES[i].equals(p)) return i;
        return 0;
    }
    private String pictureKey(Entry e) { return "pic:" + (live ? "" : "v:") + (e == null ? "" : e.id); }
    private String pictureFor(Entry e) { return prefs.getString(pictureKey(e), prefs.getString("picture", "fit")); }
    // ---------- quality ----------
    // What's on screen (resolution, frame rate, bit rate, codec), the stream's own levels when it has several (HLS):
    // Best available (the default: always the top level), Auto (steps down on a slow connection) or one level, and the
    // provider's other copies (the film in 4K or another language, the channel's HD / 4K twin), sent by the app.
    private static String qualityName(Format f) {
        if (f == null || f.height <= 0) return "—";
        return f.height >= 2000 ? "4K" : f.height + "p";
    }
    private String qualityDetails(Format f) {
        if (f == null) return "Starting…";
        List<String> b = new ArrayList<>();
        if (f.frameRate > 0) b.add(Math.round(f.frameRate) + " fps");
        int br = f.bitrate > 0 ? f.bitrate : Math.max(f.averageBitrate, f.peakBitrate);
        if (br > 0) b.add(String.format(java.util.Locale.ROOT, "%.1f Mb/s", br / 1e6));
        String m = f.sampleMimeType == null ? "" : f.sampleMimeType;
        String codec = MimeTypes.VIDEO_H264.equals(m) ? "H.264" : MimeTypes.VIDEO_H265.equals(m) ? "HEVC" : MimeTypes.VIDEO_AV1.equals(m) ? "AV1" : MimeTypes.VIDEO_VP9.equals(m) ? "VP9" : MimeTypes.VIDEO_MPEG2.equals(m) ? "MPEG-2" : "";
        if (!codec.isEmpty()) b.add(codec);
        if (hdr) b.add("HDR");
        return b.isEmpty() ? null : android.text.TextUtils.join(" · ", b);
    }
    private ListPanel.Item radioRow(String title, String sub, boolean on, Runnable ok) {
        ListPanel.Item it = new ListPanel.Item(title);
        it.sub = sub; it.radio = true; it.radioOn = on; it.ok = ok;
        return it;
    }
    void openQuality(boolean fromOptions) {
        if (player == null || isFinishing()) return;
        Format f = player.getVideoFormat();
        List<ListPanel.Item> items = new ArrayList<>();
        ListPanel.Item now = new ListPanel.Item(f == null || f.height <= 0 ? "Now: starting…" : "Now: " + f.width + " × " + f.height);
        now.sub = qualityDetails(f);
        now.disabled = true;
        items.add(now);
        int sel = -1;
        // the stream's own levels
        TrackSelectionParameters ps = player.getTrackSelectionParameters();
        List<Tracks.Group> lg = new ArrayList<>();
        List<Integer> li = new ArrayList<>();
        boolean pinned = false;
        for (Tracks.Group g : player.getCurrentTracks().getGroups()) {
            if (g.getType() != C.TRACK_TYPE_VIDEO) continue;
            if (ps.overrides.containsKey(g.getMediaTrackGroup())) pinned = true;
            for (int i = 0; i < g.length; i++) if (g.isTrackSupported(i)) { lg.add(g); li.add(i); }
        }
        if (lg.size() > 1) {
            Integer[] order = new Integer[lg.size()];
            for (int k = 0; k < order.length; k++) order[k] = k;
            java.util.Arrays.sort(order, (x, y) -> {
                Format a = lg.get(x).getTrackFormat(li.get(x)), b = lg.get(y).getTrackFormat(li.get(y));
                return a.height != b.height ? b.height - a.height : b.bitrate - a.bitrate;
            });
            items.add(radioRow("Best available", "Always the top level (default)", !pinned && ps.forceHighestSupportedBitrate, () -> { setLevel(null, 0, true); after(fromOptions); showText("Quality: best available", 1800); }));
            items.add(radioRow("Auto", "Steps down when the connection is slow", !pinned && !ps.forceHighestSupportedBitrate, () -> { setLevel(null, 0, false); after(fromOptions); showText("Quality: auto", 1800); }));
            for (Integer k : order) {
                Tracks.Group g = lg.get(k);
                int i = li.get(k);
                Format lf = g.getTrackFormat(i);
                String name = qualityName(lf);
                List<String> d = new ArrayList<>();
                if (lf.frameRate > 0) d.add(Math.round(lf.frameRate) + " fps");
                if (lf.bitrate > 0) d.add(String.format(java.util.Locale.ROOT, "%.1f Mb/s", lf.bitrate / 1e6));
                items.add(radioRow(name, d.isEmpty() ? null : android.text.TextUtils.join(" · ", d), pinned && g.isTrackSelected(i), () -> { setLevel(g, i, false); after(fromOptions); showText("Quality: " + name, 1800); }));
            }
        }
        // the provider's other copies
        JSONArray vs = versions != null && cur != null && cur.id.equals(versions.optString("id")) ? versions.optJSONArray("list") : null;
        if (vs != null && vs.length() > 1) {
            ListPanel.Item head = new ListPanel.Item(live ? "This channel in other qualities" : "Other copies of this title");
            head.disabled = true;
            head.height = 40;
            items.add(head);
            for (int k = 0; k < vs.length(); k++) {
                JSONObject o = vs.optJSONObject(k);
                if (o == null) continue;
                String id = o.optString("id");
                boolean on = cur != null && id.equals(cur.id);
                items.add(radioRow(o.optString("name"), o.optString("label", null), on, on ? () -> after(fromOptions) : () -> { closeOverlay(); pickVersion(id); }));
            }
        }
        for (int k = 0; k < items.size(); k++) if (items.get(k).radioOn) { sel = k; break; }
        ListPanel p = new ListPanel(this, "Quality", true, 352);
        p.source(ListPanel.of(items), Math.max(0, sel));
        while (p.sel < items.size() - 1 && items.get(p.sel).disabled) p.sel++;
        boolean one = lg.size() <= 1 && (vs == null || vs.length() <= 1);
        p.setFoot(one ? (live ? "Your provider sends this channel in one quality." : "Your provider sends this video in one quality.")
                : lg.size() > 1 ? "Best available is the default." : "Switching starts the other copy where you are.");
        if (fromOptions) p.backTo = this::openOptions;
        show(p);
    }
    private void setLevel(Tracks.Group g, int i, boolean best) {
        TrackSelectionParameters.Builder b = player.getTrackSelectionParameters().buildUpon()
                .clearOverridesOfType(C.TRACK_TYPE_VIDEO).setForceHighestSupportedBitrate(best);
        if (g != null) b.setOverrideForType(new TrackSelectionOverride(g.getMediaTrackGroup(), i));
        player.setTrackSelectionParameters(b.build());
    }
    /** Another copy: a channel tunes like any pick; a film or episode asks the app to play that copy from here. */
    private void pickVersion(String id) {
        if (live) { pick(id, "version"); return; }
        JSObject e = event("version");
        e.put("id", id);
        e.put("index", index);
        e.put("t", Math.max(0, player.getCurrentPosition() / 1000.0));
        e.put("d", Math.max(0, player.getDuration() / 1000.0));
        TunerPlayerPlugin.emit(e);
    }

    void openPicture() { openPicture(false); }
    private void openPicture2() { openPicture(true); }
    private void openPicture(boolean fromOptions) {
        String saved = pictureFor(cur);
        ListPanel p = new ListPanel(this, "Picture size", true, 320);
        List<ListPanel.Item> items = new ArrayList<>();
        final boolean[] kept = { false };
        for (int i = 0; i < PICTURES.length; i++) {
            ListPanel.Item it = new ListPanel.Item(PICTURE_NAMES[i]);
            it.sub = PICTURE_SUBS[i];
            it.radio = true;
            it.radioOn = PICTURES[i].equals(saved);
            it.height = 56;
            String pic = PICTURES[i];
            it.ok = () -> {
                kept[0] = true;
                prefs.edit().putString(pictureKey(cur), pic).apply();
                view.setResizeMode(resizeMode(pic));
                if (fromOptions) openOptions(); else closeOverlay();
            };
            items.add(it);
        }
        p.source(ListPanel.of(items), pictureIndex(saved));
        p.onMove = (i) -> { if (i >= 0 && i < PICTURES.length) view.setResizeMode(resizeMode(PICTURES[i])); };
        p.onClosed = () -> { if (!kept[0]) view.setResizeMode(resizeMode(saved)); };
        p.setFoot(live ? "Saved for this channel. The picture changes as you move." : "Saved for this title. The picture changes as you move.");
        if (fromOptions) p.backTo = this::openOptions;
        show(p);
    }

    private static final float[] SPEEDS = { 0.75f, 1f, 1.25f, 1.5f, 2f };
    private static String speedName(float s) { return (s == (int) s ? String.valueOf((int) s) : String.valueOf(s)) + "×"; }
    private void openSpeed() {
        float now = player.getPlaybackParameters().speed;
        ListPanel p = new ListPanel(this, "Speed", true, 320);
        List<ListPanel.Item> items = new ArrayList<>();
        int sel = 1;
        for (int i = 0; i < SPEEDS.length; i++) {
            ListPanel.Item it = new ListPanel.Item(speedName(SPEEDS[i]));
            it.radio = true;
            it.radioOn = Math.abs(SPEEDS[i] - now) < 0.01f;
            if (it.radioOn) sel = i;
            float s = SPEEDS[i];
            it.ok = () -> { player.setPlaybackParameters(new PlaybackParameters(s)); openOptions(); };
            items.add(it);
        }
        p.source(ListPanel.of(items), sel);
        p.backTo = this::openOptions;
        show(p);
    }

    // ---------- failure ----------

    /** Shown after six failed reconnects: a game channel offers the game's other channels right here; others offer Try again. */
    static final class FailedCard extends ListPanel {
        FailedCard(PlayerActivity a, String heading) {
            super(a, heading, true, 470);
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Ui.dp(470), -2, Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
            lp.bottomMargin = Ui.dp(96);
            root.setLayoutParams(lp);
        }
    }
    private void showFailed(String why) {
        card.setVisibility(View.GONE);
        JSONArray feeds = gameLinked ? otherFeeds() : new JSONArray();
        List<ListPanel.Item> items = new ArrayList<>();
        FailedCard f;
        if (feeds.length() > 0) {
            f = new FailedCard(this, "This feed stopped");
            f.setCaption((game == null ? "This game" : game.optString("title")) + " is also on");
            for (int i = 0; i < feeds.length(); i++) {
                JSONObject o = feeds.optJSONObject(i);
                ListPanel.Item it = new ListPanel.Item(o.optString("name"));
                it.sub = o.optString("label");
                it.logoName = o.optString("name");
                it.logoUrl = o.optString("logo");
                it.live = true;
                it.height = 56;
                String id = o.optString("id");
                it.ok = () -> { closeOverlay(); pick(id, "failed"); };
                items.add(it);
            }
            items.add(row("Try this feed again", null, null, "refresh", () -> { closeOverlay(); retries = 0; tuneTo(index, false); }));
            f.setFoot("Back closes");
        } else {
            f = new FailedCard(this, "This channel stopped");
            f.setCaption(why == null ? "Reconnected 6 times. The provider may be down." : why);
            items.add(row("Try again", null, null, "refresh", () -> { closeOverlay(); retries = 0; tuneTo(index, false); }));
            if (ring.size() > 1) items.add(row("Next channel", null, null, "chevR", () -> { closeOverlay(); zap(1, false); }));
        }
        f.source(ListPanel.of(items), 0);
        f.hintKeys = new String[][] { { "OK", "Choose" }, { "▲ ▼", "Move" }, { "Back", "Close" } };
        show(f);
    }

    /** Reconnects the live channel with growing waits (1, 2, 4 … seconds), up to six times. */
    private void reconnect() {
        if (player == null || isFinishing()) return;
        if (retries >= 6) { error = "Reconnected 6 times. The provider may be down."; showFailed(error); return; }
        long wait = 2000L << Math.min(retries, 3);   // 2, 4, 8, 16 s (the provider may still count the last connection)
        retries++;
        // A game channel: from the second try, offer the game's other feeds right away (reconnecting carries on underneath;
        // if this one comes back the card goes).
        if (retries == 2 && gameLinked && otherFeeds().length() > 0 && open == null) { showFailed(null); handler.removeCallbacks(retune); handler.postDelayed(retune, wait); return; }
        toast.setVisibility(View.GONE);
        spinner.setVisibility(View.VISIBLE);
        cardTitle.setText("Reconnecting");
        cardSub.setText("Attempt " + retries + " of 6");
        card.setVisibility(View.VISIBLE);
        spinner.invalidate();
        handler.removeCallbacks(retune);
        handler.postDelayed(retune, wait);
    }

    private String errorText(PlaybackException e) {
        if (e.errorCode == PlaybackException.ERROR_CODE_DECODING_FORMAT_EXCEEDS_CAPABILITIES || e.errorCode == PlaybackException.ERROR_CODE_DECODER_INIT_FAILED)
            return "This TV can't decode this " + (live ? "channel's" : "video's") + " picture format.";
        if (e.errorCode == PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS) return live ? "The provider refused this channel (it may be offline or your connections are in use)." : "The provider refused this video.";
        if (e.errorCode == PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED || e.errorCode == PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT) return "Can't reach the provider. Check the internet connection.";
        return live ? "This channel is not available right now." : "This video would not play (" + e.getErrorCodeName() + ").";
    }

    // ---------- tuning ----------

    /** Zapping: the banner changes at once; holding the button only connects to where you stop. */
    private void zap(int d, boolean repeat) {
        if (ring.isEmpty()) return;
        int i = index < 0 ? (d > 0 ? 0 : ring.size() - 1) : index + d;
        tuneTo(i, repeat);
    }
    private void tuneTo(int i, boolean repeat) {
        int n = ring.size();
        if (n == 0) return;
        i = ((i % n) + n) % n;
        tune(ring.get(i), i, repeat);
    }
    private long lastPress;
    private void tune(Entry e, int i, boolean repeat) {
        // Presses in quick succession connect only where they stop (each connection counts against the account's limit).
        long now = SystemClock.uptimeMillis();
        boolean quick = !repeat && now - lastPress < 300;
        lastPress = now;
        if (cur != null && !cur.id.equals(e.id) && !repeat && played) last = cur;
        index = i;
        cur = e;
        error = null; quality = ""; hdr = false; textTracks = audioTracks = 0; retries = 0; played = false;
        resetLag();
        card.setVisibility(View.GONE);
        tunedAt = SystemClock.uptimeMillis();
        if (chipUp && !chipIsUpNext) hideChip();
        view.setResizeMode(resizeMode(pictureFor(cur)));
        showZapCard();
        showBanner();
        handler.removeCallbacks(doTune);
        handler.postDelayed(doTune, repeat ? 450 : quick ? 300 : 0);
        handler.removeCallbacks(askMeta);
        handler.postDelayed(askMeta, repeat ? 450 : 0);
    }
    private void lastChannel() {
        if (last == null || (cur != null && last.id.equals(cur.id))) { showText("No previous channel yet", 2000); return; }
        for (int i = 0; i < ring.size(); i++) if (ring.get(i).id.equals(last.id)) { tuneTo(i, false); return; }
        tune(last, -1, false);
    }
    private void jumpToTypedChannel() {
        String typed = digits;
        digits = "";
        digitsView.setVisibility(View.GONE);
        int n;
        try { n = Integer.parseInt(typed); } catch (NumberFormatException e) { return; }
        for (int i = 0; i < ring.size(); i++) if (ring.get(i).num == n) { tuneTo(i, false); return; }
        JSObject e = event("number");   // not in this group: the app looks in every channel
        e.put("num", n);
        TunerPlayerPlugin.emit(e);
    }

    void nextEpisode() {
        if (player == null || live) return;
        hideChip();
        if (player.hasNextMediaItem()) player.seekToNextMediaItem(); else showText("This is the last one", 2000);
    }
    void recordSeek() {
        long d = player.getDuration();
        if (d == C.TIME_UNSET || d <= 0) return;
        JSObject e = event("progress");
        e.put("t", player.getCurrentPosition() / 1000.0);
        e.put("d", d / 1000.0);
        TunerPlayerPlugin.emit(e);
    }

    // ---------- keys ----------

    private static boolean isOk(int code) { return code == KeyEvent.KEYCODE_DPAD_CENTER || code == KeyEvent.KEYCODE_ENTER || code == KeyEvent.KEYCODE_NUMPAD_ENTER; }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        switch (code) {   // the system's keys
            case KeyEvent.KEYCODE_VOLUME_UP: case KeyEvent.KEYCODE_VOLUME_DOWN: case KeyEvent.KEYCODE_VOLUME_MUTE:
            case KeyEvent.KEYCODE_HOME: case KeyEvent.KEYCODE_POWER: case KeyEvent.KEYCODE_SETTINGS: case KeyEvent.KEYCODE_TV_INPUT:
                return super.dispatchKeyEvent(e);
        }
        if (player == null) return super.dispatchKeyEvent(e);
        if (e.getAction() == KeyEvent.ACTION_DOWN) down(code, e.getRepeatCount() > 0);
        else if (e.getAction() == KeyEvent.ACTION_UP) up(code, e.isCanceled());
        return true;
    }

    private void down(int code, boolean repeat) {
        if (code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) { if (!repeat) back(); return; }
        if (open != null) {
            okInPlayer = false;
            if (!open.key(code, repeat) && (code == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)) togglePlay();
            if (open != null) hintsChanged();
            return;
        }
        if (chipUp && !chipIsUpNext && !isOk(code)) hideChip();   // any other key dismisses the chip
        if (live) liveKey(code, repeat);
        else {
            if (vod.key(code, repeat)) { hintsChanged(); return; }
            switch (code) {
                case KeyEvent.KEYCODE_MENU: openOptions(); break;
                case KeyEvent.KEYCODE_CAPTIONS: openSubtitles(false); break;
                case KeyEvent.KEYCODE_INFO: hintForce = true; hintsOn = true; vod.show(); break;
            }
        }
    }
    private void up(int code, boolean canceled) {
        if (live && isOk(code)) {
            boolean mine = okInPlayer;
            okInPlayer = false;
            if (mine && !okLong && !canceled && open == null) shortOk();
            okLong = false;
            return;
        }
        if (!live && open == null && vod != null) vod.up(code);
    }

    private void liveKey(int code, boolean repeat) {
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_UP: zap(upNext ? 1 : -1, repeat); return;
            case KeyEvent.KEYCODE_DPAD_DOWN: zap(upNext ? -1 : 1, repeat); return;
            case KeyEvent.KEYCODE_CHANNEL_UP: case KeyEvent.KEYCODE_PAGE_UP: zap(1, repeat); return;
            case KeyEvent.KEYCODE_CHANNEL_DOWN: case KeyEvent.KEYCODE_PAGE_DOWN: zap(-1, repeat); return;
            case KeyEvent.KEYCODE_LAST_CHANNEL: if (!repeat) lastChannel(); return;
            case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_NUMPAD_ENTER:
                // A short press is handled on release; holding OK jumps back to the last channel.
                if (!repeat) { okDownAt = SystemClock.uptimeMillis(); okLong = false; okInPlayer = true; }
                else if (okInPlayer && !okLong && SystemClock.uptimeMillis() - okDownAt >= 500) { okLong = true; lastChannel(); }
                return;
            case KeyEvent.KEYCODE_DPAD_LEFT: case KeyEvent.KEYCODE_MENU: if (!repeat) openOptions(); return;
            case KeyEvent.KEYCODE_DPAD_RIGHT: if (!repeat) right(); return;
            case KeyEvent.KEYCODE_INFO: case KeyEvent.KEYCODE_GUIDE:
                if (!repeat) { hintForce = true; hintsOn = true; showBanner(); }
                return;
            case KeyEvent.KEYCODE_CAPTIONS: if (!repeat) openSubtitles(false); return;
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE: case KeyEvent.KEYCODE_SPACE: togglePlay(); return;
            default:
                if (code >= KeyEvent.KEYCODE_0 && code <= KeyEvent.KEYCODE_9 && !repeat) {
                    digits = digits + (code - KeyEvent.KEYCODE_0);
                    if (digits.length() > 5) digits = digits.substring(digits.length() - 5);
                    digitsView.setText(digits);
                    digitsView.setVisibility(View.VISIBLE);
                    handler.removeCallbacks(jump);
                    handler.postDelayed(jump, 1300);
                }
        }
    }
    private void shortOk() {
        if (chipUp && !chipIsUpNext) { String id = chipId; hideChip(); pick(id, "chip"); return; }
        openChannels();
    }
    private void togglePlay() { if (player.isPlaying()) player.pause(); else player.play(); }

    private void back() {
        if (open != null) { if (!open.back()) closeOverlay(); return; }
        if (chipUp) {
            if (chipIsUpNext) {   // stay on this one: no autoplay
                stayIndex = index;
                if (player.getMediaItemCount() > index + 1) player.removeMediaItems(index + 1, player.getMediaItemCount());
                while (ring.size() > index + 1) ring.remove(ring.size() - 1);
                vod.setItem(cur, false);
            }
            hideChip();
            return;
        }
        if (!digits.isEmpty()) { digits = ""; handler.removeCallbacks(jump); digitsView.setVisibility(View.GONE); return; }
        if (!live && vod.back()) return;
        if (live && banner.getVisibility() == View.VISIBLE && hint.getVisibility() == View.VISIBLE && hintForce) { hideBanner.run(); return; }
        finish();
    }

    // ---------- from the app ----------

    /** Called by the plugin with what the app knows: see app/tv/js/player.js. */
    void command(String what, String arg) {
        try {
            switch (what) {
                case "show-text": handler.removeCallbacks(syncSlow); showText(arg, 4000); break;
                case "lag-reset": lagMs = 0; if (stallAt > 0) stallAt = SystemClock.uptimeMillis(); sentLag = -1; sendLag(); break;
                case "linked": {
                    gameLinked = "true".equals(arg);
                    if (!gameLinked) { game = null; if (open instanceof GamePanel) closeOverlay(); }
                    if (banner.getVisibility() == View.VISIBLE) fillBanner();
                    hintsChanged();
                    updateBug();
                    break;
                }
                case "game": {
                    game = arg == null || arg.isEmpty() ? null : new JSONObject(arg);
                    if (open instanceof GamePanel) open.refresh();
                    updateBug();
                    break;
                }
                case "meta": {
                    JSONObject items = new JSONObject(arg);
                    for (java.util.Iterator<String> it = items.keys(); it.hasNext(); ) { String id = it.next(); meta.put(id, items.getJSONObject(id)); }
                    if (cur != null && items.has(cur.id)) {
                        if (banner.getVisibility() == View.VISIBLE) fillBanner();
                        if (zap.getVisibility() == View.VISIBLE) showZapCardText();
                    }
                    if (open == channels && channels != null) channels.render();
                    break;
                }
                case "versions": versions = new JSONObject(arg); break;
                case "pinned": pinned = arg == null || arg.isEmpty() ? null : new JSONObject(arg); break;
                case "games": liveGames = new JSONArray(arg); if (banner.getVisibility() == View.VISIBLE) hintsChanged(); break;
                case "groups": groups = new JSONArray(arg); if (wantGroups) { wantGroups = false; openGroups(); } break;
                case "clocks": showClocks(new JSONObject(arg), false); break;
                case "chip": { JSONObject c = new JSONObject(arg); showChip(c.optString("title"), c.optString("sub"), c.optString("id")); break; }
                case "tune": { for (int i = 0; i < ring.size(); i++) if (ring.get(i).id.equals(arg)) { tuneTo(i, false); break; } break; }
                case "queue": {   // movies and episodes: more to play after the last one (Up next)
                    if (live || player == null) break;
                    List<Entry> more = parse(new JSONObject(arg).getJSONArray("entries"), "");
                    List<MediaItem> items = new ArrayList<>();
                    for (Entry e : more) items.add(item(e));
                    ring.addAll(more);
                    player.addMediaItems(items);
                    vod.setItem(cur, index < ring.size() - 1);
                    break;
                }
                case "ring": {   // a new channel list: read off the UI thread, one at a time and in order, then put in place
                    int seq = ++ringSeq;
                    RINGS.execute(() -> {
                        try {
                            JSONObject r = new JSONObject(arg);
                            List<Entry> next = parse(r.getJSONArray("entries"), r.optString("tpl", ""));
                            if (!next.isEmpty()) runOnUiThread(() -> { if (!isFinishing() && seq == ringSeq) setRing(next, r); });
                        } catch (Exception ignored) {}
                    });
                    break;
                }
            }
        } catch (Exception ignored) {}
    }
    private static final java.util.concurrent.ExecutorService RINGS = java.util.concurrent.Executors.newSingleThreadExecutor();
    private int ringSeq;   // only the newest list asked for is put in place
    private void setRing(List<Entry> next, JSONObject r) {
        ring = next;
        ringName = r.optString("name", ringName);
        index = -1;
        for (int i = 0; i < ring.size(); i++) if (cur != null && ring.get(i).id.equals(cur.id)) index = i;
        String tune = r.optString("tune", "");
        if (!tune.isEmpty()) for (int i = 0; i < ring.size(); i++) if (ring.get(i).id.equals(tune)) { if (i != index) tuneTo(i, false); break; }
        if (wantChannels) { wantChannels = false; openChannels(); }
        else if (banner.getVisibility() == View.VISIBLE) fillBanner();
    }
    private void showZapCardText() {
        JSONObject m = metaOf(cur);
        String now = m == null ? "" : m.optString("now");
        zNow.setText(now);
        zNow.setVisibility(now.isEmpty() ? View.GONE : View.VISIBLE);
    }

    /** A short message at the bottom. */
    void showText(String text, int ms) {
        if (card.getVisibility() == View.VISIBLE) card.setVisibility(View.GONE);
        toast.setText(text);
        toast.setVisibility(View.VISIBLE);
        toast.bringToFront();   // over any open panel (Sync is asked from one)
        handler.removeCallbacks(hideToast);
        handler.postDelayed(hideToast, ms);
    }

    /** Movies are mostly 24 frames a second and TVs run at 60, which makes slow pans judder. When asked, switch the
     * TV to a refresh rate the film divides into (same resolution), for as long as the player is open.
     * Off by default: many TVs go black for a second or two while they switch. */
    private void matchFrameRate() {
        if (live || player == null) return;
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        int want = 0;
        Format f = player.getVideoFormat();
        Display d = getWindowManager().getDefaultDisplay();
        if (prefs.getBoolean("matchRate", false) && f != null && f.frameRate > 0 && d != null) {
            Display.Mode m0 = d.getMode();
            float best = Float.MAX_VALUE;
            for (Display.Mode m : d.getSupportedModes()) {
                if (m.getPhysicalWidth() != m0.getPhysicalWidth() || m.getPhysicalHeight() != m0.getPhysicalHeight()) continue;
                float ratio = m.getRefreshRate() / f.frameRate;
                long n = Math.round(ratio);
                if (n < 1 || Math.abs(ratio - n) > 0.01f * n) continue;
                if (m.getRefreshRate() < best) { best = m.getRefreshRate(); want = m.getModeId(); }
            }
        }
        if (lp.preferredDisplayModeId == want) return;
        lp.preferredDisplayModeId = want;
        getWindow().setAttributes(lp);
    }

    // ---------- subtitles & audio ----------

    private static int count(Tracks tracks, int type) {
        int n = 0;
        for (Tracks.Group g : tracks.getGroups()) if (g.getType() == type) for (int i = 0; i < g.length; i++) if (g.isTrackSupported(i)) n++;
        return n;
    }

    /** The remembered choice: nothing chosen yet (the file decides), off, or a language. */
    private TrackSelectionParameters.Builder subtitlePreference(TrackSelectionParameters.Builder b) {
        String sub = prefs.getString("sub", "auto");
        if ("off".equals(sub)) return b.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true);
        if ("und".equals(sub)) b.setSelectUndeterminedTextLanguage(true);
        else if (!"auto".equals(sub)) b.setPreferredTextLanguage(sub);
        String audio = prefs.getString("audio", "");
        if (!audio.isEmpty()) b.setPreferredAudioLanguage(audio);
        return b;
    }

    private String subtitleValue() {
        if (player.getTrackSelectionParameters().disabledTrackTypes.contains(C.TRACK_TYPE_TEXT)) return "Off";
        for (Tracks.Group g : player.getCurrentTracks().getGroups())
            if (g.getType() == C.TRACK_TYPE_TEXT) for (int i = 0; i < g.length; i++) if (g.isTrackSelected(i)) return trackName(g.getTrackFormat(i), 1);
        return "Off";
    }
    private String audioValue() {
        for (Tracks.Group g : player.getCurrentTracks().getGroups())
            if (g.getType() == C.TRACK_TYPE_AUDIO) for (int i = 0; i < g.length; i++) if (g.isTrackSelected(i)) return trackName(g.getTrackFormat(i), 1);
        return "";
    }

    void openSubtitles() { openSubtitles(false); }
    private void openSubtitles(boolean fromOptions) {
        if (player == null || isFinishing()) return;
        Tracks tracks = player.getCurrentTracks();
        boolean off = player.getTrackSelectionParameters().disabledTrackTypes.contains(C.TRACK_TYPE_TEXT);
        List<ListPanel.Item> items = new ArrayList<>();
        ListPanel.Item none = new ListPanel.Item("Off");
        none.radio = true;
        items.add(none);
        int checked = 0, n = 0;
        for (Tracks.Group g : tracks.getGroups()) {
            if (g.getType() != C.TRACK_TYPE_TEXT) continue;
            for (int i = 0; i < g.length; i++) {
                if (!g.isTrackSupported(i)) continue;
                ListPanel.Item it = new ListPanel.Item(trackName(g.getTrackFormat(i), ++n));
                it.radio = true;
                final Tracks.Group fg = g;
                final int fi = i;
                it.ok = () -> { pickText(fg, fi); after(fromOptions); };
                if (!off && g.isTrackSelected(i)) { checked = items.size(); it.radioOn = true; }
                items.add(it);
            }
        }
        if (n == 0) { showText(live ? "This channel has no subtitles" : "This video has no subtitles", 3000); return; }
        none.radioOn = checked == 0;
        none.ok = () -> { pickText(null, 0); after(fromOptions); };
        ListPanel p = new ListPanel(this, "Subtitles", true, 320);
        p.source(ListPanel.of(items), checked);
        p.setFoot("Remembered by language.");
        if (fromOptions) p.backTo = this::openOptions;
        show(p);
    }
    private void after(boolean fromOptions) { if (fromOptions) openOptions(); else closeOverlay(); }

    void openAudio() { openAudio(false); }
    private void openAudio(boolean fromOptions) {
        Tracks tracks = player.getCurrentTracks();
        List<ListPanel.Item> items = new ArrayList<>();
        int checked = 0;
        for (Tracks.Group g : tracks.getGroups()) {
            if (g.getType() != C.TRACK_TYPE_AUDIO) continue;
            for (int i = 0; i < g.length; i++) {
                if (!g.isTrackSupported(i)) continue;
                Format f = g.getTrackFormat(i);
                ListPanel.Item it = new ListPanel.Item(trackName(f, items.size() + 1));
                it.sub = f.channelCount >= 6 ? (f.channelCount == 8 ? "7.1" : "5.1") : f.channelCount == 2 ? "Stereo" : f.channelCount == 1 ? "Mono" : null;
                it.radio = true;
                it.height = it.sub == null ? 48 : 56;
                if (g.isTrackSelected(i)) { checked = items.size(); it.radioOn = true; }
                final Tracks.Group fg = g;
                final int fi = i;
                it.ok = () -> {
                    player.setTrackSelectionParameters(player.getTrackSelectionParameters().buildUpon()
                            .setOverrideForType(new TrackSelectionOverride(fg.getMediaTrackGroup(), fi)).build());
                    if (f.language != null) prefs.edit().putString("audio", f.language).apply();
                    after(fromOptions);
                };
                items.add(it);
            }
        }
        if (items.isEmpty()) { showText("No audio tracks to choose from", 2500); return; }
        ListPanel p = new ListPanel(this, "Audio", true, 320);
        p.source(ListPanel.of(items), checked);
        p.setFoot("Remembered by language.");
        if (fromOptions) p.backTo = this::openOptions;
        show(p);
    }

    private void pickText(Tracks.Group g, int i) {
        TrackSelectionParameters.Builder b = player.getTrackSelectionParameters().buildUpon().clearOverridesOfType(C.TRACK_TYPE_TEXT);
        if (g == null) {
            b.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true);
            prefs.edit().putString("sub", "off").apply();
            subChanged("off");
        } else {
            Format f = g.getTrackFormat(i);
            String lang = f.language == null || f.language.isEmpty() ? "und" : f.language;
            b.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false).setOverrideForType(new TrackSelectionOverride(g.getMediaTrackGroup(), i));
            if ("und".equals(lang)) b.setSelectUndeterminedTextLanguage(true); else b.setPreferredTextLanguage(lang);
            prefs.edit().putString("sub", lang).apply();
            subChanged(lang);
        }
        player.setTrackSelectionParameters(b.build());
    }

    /** A subtitle choice made here becomes the app's choice too (Account, the title page). */
    private void subChanged(String lang) {
        JSObject ev = event("setting");
        ev.put("key", "sub");
        ev.put("value", lang);
        TunerPlayerPlugin.emit(ev);
    }

    private static String trackName(Format f, int n) {
        String lang = f.language == null || f.language.isEmpty() || "und".equals(f.language) ? null : new Locale(f.language).getDisplayLanguage(Locale.ENGLISH);
        boolean cc = MimeTypes.APPLICATION_CEA608.equals(f.sampleMimeType) || MimeTypes.APPLICATION_CEA708.equals(f.sampleMimeType);
        String name = f.label != null && !f.label.isEmpty() ? f.label : lang != null ? lang : cc ? "Closed captions" : "Track " + n;
        if (lang != null && !name.toLowerCase(Locale.ROOT).contains(lang.toLowerCase(Locale.ROOT))) name += " (" + lang + ")";
        if ((f.selectionFlags & C.SELECTION_FLAG_FORCED) != 0) name += " · forced";
        return name;
    }

    /** Chalk subtitles, Inter 600 at 28 dp with a 1.5 dp black edge and no box, 10% up from the bottom;
     * the TV's own caption style wins when one has been set up. */
    private void styleSubtitles(SubtitleView sv) {
        if (sv == null) return;
        CaptioningManager cm = (CaptioningManager) getSystemService(CAPTIONING_SERVICE);
        sv.setBottomPaddingFraction(0.1f);
        if (cm != null && cm.isEnabled()) { sv.setUserDefaultStyle(); sv.setUserDefaultTextSize(); return; }
        sv.setApplyEmbeddedStyles(false);
        sv.setStyle(new CaptionStyleCompat(Ui.T1, Color.TRANSPARENT, Color.TRANSPARENT,
                CaptionStyleCompat.EDGE_TYPE_OUTLINE, 0xFF000000, Ui.inter600));
        sv.setFixedTextSize(android.util.TypedValue.COMPLEX_UNIT_DIP, 28);
    }

    @Override protected void onStop() { super.onStop(); stoppedAt = System.currentTimeMillis(); if (player != null && !isFinishing()) player.pause(); }
    @Override protected void onStart() {
        super.onStart();
        if (player == null) return;
        // Back after a while on live: start from now rather than an old position.
        if (live && stoppedAt > 0 && System.currentTimeMillis() - stoppedAt > 10000) tuneTo(index < 0 ? 0 : index, false); else player.play();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (!exited) {
            exited = true;
            JSObject e = event("exit");
            if (player != null) {
                long d = player.getDuration();
                e.put("t", player.getCurrentPosition() / 1000.0);
                e.put("d", d == C.TIME_UNSET ? 0 : d / 1000.0);
            }
            e.put("played", played);
            if (!played && error != null) e.put("error", error);
            TunerPlayerPlugin.emit(e);
        }
        if (player != null) { player.release(); player = null; }
        if (sounds != null) { sounds.release(); sounds = null; }
        if (current == this) current = null;
        super.onDestroy();
    }

    private static String qualityLabel(int h) {
        if (h <= 0) return "";
        return h >= 2000 ? "4K" : h >= 700 ? "HD" : "SD";
    }

    // The picture's extra lag (whole seconds; a stall still going counts as it goes) to the app.
    private int sentLag = -1;
    private void sendLag() {
        long now = SystemClock.uptimeMillis();
        int sec = (int) ((lagMs + (stallAt > 0 ? now - stallAt : 0)) / 1000);
        if (sec == sentLag) return;
        sentLag = sec;
        JSObject e = event("lag");
        e.put("sec", sec);
        TunerPlayerPlugin.emit(e);
    }
    private final Runnable lagTick = new Runnable() { @Override public void run() { if (stallAt > 0 && player != null) { sendLag(); handler.postDelayed(this, 1000); } } };
    private void resetLag() { lagMs = 0; stallAt = 0; sendLag(); }

    private JSObject event(String type) {
        JSObject e = new JSObject();
        e.put("type", type);
        e.put("session", session);
        e.put("index", index);
        e.put("id", cur == null ? "" : cur.id);
        return e;
    }
}
