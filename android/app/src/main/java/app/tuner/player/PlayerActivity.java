package app.tuner.player;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.net.ConnectivityManager;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.RouteInfo;
import android.provider.Settings;
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
import androidx.core.content.ContextCompat;
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
import androidx.media3.datasource.DataSource;
import androidx.media3.datasource.DataSpec;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.datasource.HttpDataSource;
import androidx.media3.datasource.TransferListener;
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
import java.util.concurrent.atomic.AtomicLong;

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
    // subtitles from OpenSubtitles and the copy's real quality (design/ui-v1/subtitles): the settings, the downloads
    Subs subs;
    private JSONObject subSettings;
    // catch-up (design/ui-v1/catchup): a replay session, its timeline, live TV paused or rewound
    Replay rp;
    Timeline tl;
    LivePause lp;
    String exitThen;              // the exit event's then (a failure card's Choose a video / Game page, Next programme, tipoff)
    static long replayLeftAt;     // when a replay went Back to live: the next live player drops repeats and ▶ for 800 ms (M8)
    private boolean guardLive;
    private long liveGuardUntil;
    private boolean resumeAfterStop = true;
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
    // 12 s of BUFFERING: a stream still refilling at half speed or better isn't thrown away (that would drop what it has
    // loaded), until 45 s; one that isn't is reconnected (SPEC 3.1)
    private final Runnable stall = new Runnable() {
        @Override public void run() {
            long el = stallStart > 0 ? SystemClock.uptimeMillis() - stallStart : 12000;
            if (rd.refill >= 0.5 && el < 45000) { handler.postDelayed(this, 12000); return; }
            reconnect();
        }
    };
    // (a reconnect starts again at the live edge: the lag goes; until the picture is back, scores wait as if still stalled)
    private final Runnable retune = () -> { if (player != null && cur != null) { player.setMediaItem(item(cur)); player.prepare(); player.play(); lagMs = 0; if (stallAt > 0) stallAt = SystemClock.uptimeMillis(); sendLag(); nextTryAt = 0; updateRight(); } };
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
            if (!chipUp || chipKind == CHIP_OFFLINE) return;   // (the offline chip has no countdown)
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
            if (player != null) { sample(); timeline(); if (connPanel != null && open == connPanel) fillConnection(); }
            if (player != null && rp != null) rp.tick();
            if (player != null && lp != null) lp.tick();
            if (player != null && !live && rp == null) {
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
        boolean replayMode = x != null && "replay".equals(x.getString("mode"));
        JSONObject rj = null;
        if (replayMode) { try { rj = new JSONObject(TunerPlayerPlugin.replayJson); } catch (Exception e) { rj = null; } }
        if (x == null || (replayMode ? rj == null : list == null || list.entries.isEmpty())) { finish(); return; }
        Ui.init(this);
        if (replayMode) {
            Entry e = new Entry();
            e.id = rj.optString("id");
            e.title = rj.optString("title");
            e.sub = rj.optString("sub");
            ring = new ArrayList<>();
            ring.add(e);
        } else ring = new ArrayList<>(list.entries);
        prefs = getSharedPreferences("player", MODE_PRIVATE);
        live = "live".equals(x.getString("mode"));
        guardLive = live && SystemClock.uptimeMillis() - replayLeftAt < 15000;
        session = x.getInt("session");
        ringName = x.getString("ring", live ? "All channels" : "");
        String lv = x.getString("sounds", "on");
        soundLevel = "off".equals(lv) ? 0f : "quiet".equals(lv) ? 0.5f : 1f;
        if (x.containsKey("scoreBug")) prefs.edit().putBoolean("scorebug", x.getBoolean("scoreBug")).apply();   // the app's setting wins
        try { String sj = x.getString("subs"); subSettings = sj == null || sj.isEmpty() ? null : new JSONObject(sj); } catch (Exception e) { subSettings = null; }
        String sub = x.getString("sub");
        if (sub != null && !sub.isEmpty()) prefs.edit().putString("sub", sub).apply();   // Account / the title page's subtitle choice
        if (live && soundLevel > 0) {
            sounds = new android.media.SoundPool.Builder().setMaxStreams(1).setAudioAttributes(new android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_MEDIA).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build()).build();
            sounds.setOnLoadCompleteListener((p, id, status) -> { if (status == 0) alertReady = id; });
            alertId = sounds.load(this, R.raw.alert, 1);
        }
        upNext = x.getBoolean("upNext", true);
        index = replayMode ? 0 : Math.max(0, Math.min(ring.size() - 1, x.getInt("index")));
        cur = ring.get(index);
        String ua = x.getString("ua", "");
        apiUrl = x.getString("api", "");

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
        http.setTransferListener(health);
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
        view.setShowBuffering(PlayerView.SHOW_BUFFERING_NEVER);   // the puck replaces the centre spinner
        player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MOVIE).build(), true);
        // Always the best picture: no capping to the 1080p UI size, and straight to the top quality level.
        // The video plane itself runs at the panel's resolution, so 4K streams play in 4K.
        player.setTrackSelectionParameters(player.getTrackSelectionParameters().buildUpon()
                .clearVideoSizeConstraints()
                .clearViewportSizeConstraints()
                .setForceHighestSupportedBitrate(true)
                .build());
        player.setTrackSelectionParameters(subtitlePreference(player.getTrackSelectionParameters().buildUpon()).build());
        // movies and episodes: his subtitle languages in order, and airglow's own view for downloaded subtitles
        if (!live && !replayMode && subSettings != null) {
            subs = new Subs(this, player, root, root.indexOfChild(view) + 1, subSettings);
            player.setTrackSelectionParameters(subs.prefer(player.getTrackSelectionParameters().buildUpon()).build());
        }
        player.setVideoChangeFrameRateStrategy(C.VIDEO_CHANGE_FRAME_RATE_STRATEGY_ONLY_IF_SEAMLESS);
        player.addListener(new Player.Listener() {
            @Override public void onPlaybackStateChanged(int s) {
                handler.removeCallbacks(stall);
                if (s == Player.STATE_READY) {
                    played = true; error = null; retries = 0;
                    reconnecting = false; limitTries = 0; notFound = 0; nextTryAt = 0;
                    rd.clearError(); rd.frames = true;
                    if (card.getVisibility() == View.VISIBLE) card.setVisibility(View.GONE);
                    if (open instanceof FailedCard) closeOverlay();
                    if (rp != null) rp.ready();
                    if (!live && rp == null && !askedVersions) { askedVersions = true; if (versions == null || cur == null || !cur.id.equals(versions.optString("id"))) emitNeed("versions"); }   // (the title block's line and Quality)
                }
                if (s == Player.STATE_ENDED && rp != null) { rp.onEnded(); return; }
                if (s == Player.STATE_ENDED && !live && !player.hasNextMediaItem()) finish();
                // A live stream the server closed, or one stuck buffering: reconnect instead of freezing.
                if (live && s == Player.STATE_ENDED) { quietTry = true; reconnect(); }   // (the puck covers a routine one; the card only if it doesn't come back)
                if (live && s == Player.STATE_BUFFERING && played) handler.postDelayed(stall, 12000);
            }
            // Live: whenever the picture isn't moving (a stall, a pause, the Assistant taking the sound for a moment), it falls
            // behind by that long: that's lag, and every score waits for it.
            @Override public void onIsPlayingChanged(boolean playing) {
                if (vod != null) vod.playStateChanged();
                if (tl != null) tl.playStateChanged();
                if (!live || !played) return;
                long now = SystemClock.uptimeMillis();
                if (!playing && stallAt == 0) { stallAt = now; handler.postDelayed(lagTick, 1000); }
                else if (playing && stallAt > 0) { lagMs += now - stallAt; stallAt = 0; sendLag(); }
            }
            @Override public void onRenderedFirstFrame() {
                if (guardLive) { guardLive = false; liveGuardUntil = SystemClock.uptimeMillis() + 800; }
                long shown = SystemClock.uptimeMillis() - zapAt;
                handler.removeCallbacks(hideZap);
                handler.postDelayed(hideZap, Math.max(0, 600 - shown));
            }
            @Override public void onPlayerError(@NonNull PlaybackException e) {
                if (rp != null) { rp.error(e); return; }
                if (live && e.errorCode == PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW) {   // C9: no card
                    showText("Back to live: the stream skipped ahead", 2000);
                    resetLag();
                    player.seekToDefaultPosition(); player.prepare(); return;
                }
                if (live) { liveError(e); return; }
                error = errorText(e);
                JSObject ev = event("failed");
                ev.put("error", error);
                TunerPlayerPlugin.emit(ev);
                showText(error, 6000);
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
                if (live || rp != null) return;
                index = player.getCurrentMediaItemIndex();
                if (index < 0 || index >= ring.size()) return;
                cur = ring.get(index);
                if (reason == Player.MEDIA_ITEM_TRANSITION_REASON_AUTO && cur.start > 30) player.seekTo(cur.start * 1000);
                if (chipUp && chipIsUpNext) hideChip();
                if (subs != null) subs.reset();   // (the app sends the next episode's subtitles)
                vod.setItem(cur, index < ring.size() - 1);
                view.setResizeMode(resizeMode(pictureFor(cur)));
                vod.show();
                TunerPlayerPlugin.emit(event("track"));
            }
        });
        view.setPlayer(player);
        watchNetwork();
        debugIntent();

        if (replayMode) {
            try { rp = new Replay(this, player, rj, prefs); } catch (JSONException e) { finish(); return; }
            tl = new Timeline(this, root);
            tl.m = rp;
            view.setResizeMode(resizeMode(pictureFor(cur)));
            player.setPlayWhenReady(true);
            rp.start();
            handler.post(tick);
        } else if (live) {
            tuneTo(index, false);
            handler.post(tick);
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
        // the diagnosis card (design/ui-v1/diagnosis SPEC 3.2): the cause, its evidence, the path, its keys; takes no focus
        dcard = new LinearLayout(this);
        dcard.setOrientation(LinearLayout.VERTICAL);
        dcard.setPadding(Ui.dp(20), Ui.dp(16), Ui.dp(20), Ui.dp(14));
        dcard.setBackground(Ui.panelBg());
        LinearLayout dh = new LinearLayout(this);
        dSpin = new Ui.Spinner(this);
        LinearLayout.LayoutParams sl = gapped(new LinearLayout.LayoutParams(Ui.dp(22), Ui.dp(22)), 12);
        sl.topMargin = Ui.dp(2);
        dh.addView(dSpin, sl);
        LinearLayout dtx = new LinearLayout(this);
        dtx.setOrientation(LinearLayout.VERTICAL);
        dTitle = Ui.line(this, "", 20, Ui.T1, Ui.outfit700);
        Ui.lineHeight(dTitle, 26);
        dLine = Ui.line(this, "", 15, Ui.T2, Ui.inter500);
        Ui.lineHeight(dLine, 20);
        dtx.addView(dTitle);
        LinearLayout.LayoutParams ll = new LinearLayout.LayoutParams(-1, -2);
        ll.topMargin = Ui.dp(2);
        dtx.addView(dLine, ll);
        dh.addView(dtx, new LinearLayout.LayoutParams(0, -2, 1));
        dcard.addView(dh);
        dPath = new PathView(this, false, 0);
        LinearLayout.LayoutParams pl = new LinearLayout.LayoutParams(-1, -2);
        pl.topMargin = Ui.dp(12);
        dcard.addView(dPath, pl);
        dKeys = new LinearLayout(this);
        dKeys.setGravity(Gravity.CENTER_VERTICAL);
        dOkKey = Ui.kbd(this, "OK");
        dKeys.addView(dOkKey, gapped(new LinearLayout.LayoutParams(-2, Ui.dp(22)), 6));
        dOk = Ui.line(this, "", 15, Ui.T1, Ui.inter650);
        dKeys.addView(dOk, gapped(new LinearLayout.LayoutParams(-2, -2), 20));
        dLeftKey = Ui.kbd(this, "◀");
        dKeys.addView(dLeftKey, gapped(new LinearLayout.LayoutParams(-2, Ui.dp(22)), 6));
        dDetails = Ui.text(this, "Details", 15, Ui.T2, Ui.inter500);
        dKeys.addView(dDetails, new LinearLayout.LayoutParams(0, -2, 1));
        dRight = Ui.line(this, "", 14, Ui.T3, Ui.inter500);
        dKeys.addView(dRight);
        LinearLayout.LayoutParams kl = new LinearLayout.LayoutParams(-1, Ui.dp(28));
        kl.topMargin = Ui.dp(12);
        dcard.addView(dKeys, kl);
        dcard.setVisibility(View.GONE);
        FrameLayout.LayoutParams dl0 = new FrameLayout.LayoutParams(Ui.dp(560), -2, Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        dl0.bottomMargin = Ui.dp(96);
        root.addView(dcard, dl0);
        // the puck: a routine stall shows only this (SPEC 2.1)
        puck = new PathView.Puck(this);
        puck.setVisibility(View.GONE);
        FrameLayout.LayoutParams pk = new FrameLayout.LayoutParams(Ui.dp(56), Ui.dp(56), Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        pk.bottomMargin = Ui.dp(96);
        root.addView(puck, pk);

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
        chipGlyph = new FrameLayout(this);   // the offline chip's glyph, where the countdown ring would be
        chipGlyph.setBackground(Ui.circle(Ui.S2));
        chipGlyph.addView(Ui.iconView(this, "wifiOff", Ui.T1, 22), new FrameLayout.LayoutParams(Ui.dp(22), Ui.dp(22), Gravity.CENTER));
        chipGlyph.setVisibility(View.GONE);
        chip.addView(chipGlyph, gapped(new LinearLayout.LayoutParams(Ui.dp(40), Ui.dp(40)), 12));
        LinearLayout chc = new LinearLayout(this);
        chc.setOrientation(LinearLayout.VERTICAL);
        chipTitle = Ui.line(this, "", 16, Ui.T1, Ui.inter650);
        chipSub = Ui.line(this, "", 14, Ui.T2, Ui.inter500);
        chipSub.setMaxWidth(Ui.dp(240));   // (the kit's chip is 420 at most)
        chc.addView(chipTitle);
        chc.addView(chipSub);
        chip.addView(chc, gapped(new LinearLayout.LayoutParams(-2, -2), 12));
        chipKbd = Ui.kbd(this, "OK");
        chip.addView(chipKbd, gapped(new LinearLayout.LayoutParams(-2, Ui.dp(22)), 6));
        chipOk = Ui.line(this, "to switch", 14, Ui.T1, Ui.inter500);
        chipOk.setMaxWidth(Ui.dp(120));
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
        if (keptDays() > 0) {   // a kept channel: the history glyph as a tag (catch-up 6.8)
            FrameLayout k = new FrameLayout(this);
            GradientDrawable kb = Ui.round(0xC715131D, 8);
            kb.setStroke(Math.max(1, Ui.dp(1)), Ui.BORDER_STRONG);
            k.setBackground(kb);
            k.addView(Ui.iconView(this, "hist", Ui.T1, 16), new FrameLayout.LayoutParams(Ui.dp(16), Ui.dp(16), Gravity.CENTER));
            LinearLayout.LayoutParams kl = new LinearLayout.LayoutParams(Ui.dp(30), Ui.dp(22));
            kl.setMarginEnd(Ui.dp(8));
            bTags.addView(k, kl);
        }
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
        else if (chipUp && chipKind == CHIP_STUTTER) h = chipAct.isEmpty() ? new String[][] { { "◀ ▼", "Details" }, { "Back", "Dismiss" }, { "▲ ▼", "Zap" } }
                : new String[][] { { "OK", chipOk.getText().toString() }, { "◀ ▼", "Details" }, { "Back", "Dismiss" }, { "▲ ▼", "Zap" } };
        else if (chipUp && chipKind == CHIP_OFFLINE) h = new String[][] { { "Back", "Dismiss" }, { "▲ ▼", "Zap" } };
        else if (chipUp && chipKind == CHIP_PROGRAMME) h = tl != null && tl.visible() && hintsOn ? tl.hints() : null;
        else if (chipUp) h = chipIsUpNext ? new String[][] { { "OK", "Play now" }, { "Back", "Stay on this one" } }
                : new String[][] { { "OK", "Switch" }, { "Back", "Dismiss" }, { "◀", "Options" }, { "▶", "Game" }, { "▲ ▼", "Zap" } };
        else if (live && cardUp && banner.getVisibility() == View.VISIBLE && hintsOn)
            h = act.isEmpty() ? new String[][] { { "◀", "Details" }, { "Back", "Hide" }, { "▲ ▼", "Zap" } }
                    : new String[][] { { "OK", actLabel }, { "◀", "Details" }, { "Back", "Hide" }, { "▲ ▼", "Zap" } };
        else if (tl != null && tlActive() && tl.visible()) h = hintsOn ? tl.hints() : null;
        else if (!live && vod != null && vod.visible()) h = hintsOn ? vod.hints() : null;
        else if (live && banner.getVisibility() == View.VISIBLE && hintsOn) {
            h = new String[][] { { "OK", "Channels" }, { "◀", "Options" }, { "▶", gameLinked ? "Game" : liveGames.length() > 0 ? "Live games" : "Info" }, { "▲ ▼", "Zap" }, { "Hold OK", "Last" } };
            // a kept channel, on a remote with ⏯: Pause leads (catch-up 6.8); without it, ◀ Options has Rewind and pause
            if (keptDays() > 0 && hasPlayPause()) h = new String[][] { { "OK", "Channels" }, { "⏯", "Pause" }, { "◀", "Options" }, { "▶", h[2][1] }, { "▲ ▼", "Zap" } };
        }
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
    void updateBug() {
        boolean inReplay = rp != null && rp.gameOnChannel() && game != null && game.optBoolean("replay");
        boolean show = (live && gameLinked || inReplay) && bugOn() && game != null && open == null && banner.getVisibility() != View.VISIBLE && (tl == null || !tl.visible());
        if (!show) { bug.setVisibility(View.GONE); return; }
        bug.removeAllViews();
        boolean hidden = game.optBoolean("hidden") && !inReplay;   // (a replay's answers are as aired: what the picture has shown)
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
        chipKind = CHIP_TEAM;
        chipStyle(true, true);
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
        chipKind = CHIP_UPNEXT;
        chipStyle(true, true);
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
        chipKind = 0;
        chip.setVisibility(View.GONE);
        handler.removeCallbacks(chipTick);
        hintsChanged();
        if (waitingStutter != null && SystemClock.uptimeMillis() - waitingStutterAt < 30000) { Diag.Cause c = waitingStutter; waitingStutter = null; showStutter(c); }
        else waitingStutter = null;
    }
    /** The chip with its countdown ring (or the offline glyph) and with or without its OK key. */
    private void chipStyle(boolean ring, boolean ok) {
        chipRing.setVisibility(ring ? View.VISIBLE : View.GONE);
        chipGlyph.setVisibility(ring ? View.GONE : View.VISIBLE);
        chipKbd.setVisibility(ok ? View.VISIBLE : View.GONE);
        chipOk.setVisibility(ok ? View.VISIBLE : View.GONE);
    }

    // ---------- panels ----------

    void show(Overlay o) {
        if (open != null) { root.removeView(open.root); Overlay was = open; open = null; was.closed(); }
        open = o;
        banner.setVisibility(View.GONE);
        handler.removeCallbacks(hideBanner);
        if (chipUp && !chipIsUpNext) hideChip();
        if (vod != null) vod.hide();
        if (tl != null) tl.hide();
        if (cardUp && !(o instanceof FailedCard)) hideCard(false);
        int at = root.indexOfChild(hint);
        root.addView(o.root, at);
        hintsOn = hintForce || bump("panel:" + o.getClass().getSimpleName() + ":" + (o instanceof ListPanel ? ((ListPanel) o).title.getText() : ""));
        if (o instanceof ListPanel) ((ListPanel) o).render();
        if (o instanceof Card) ((Card) o).render();
        updateBug();
        hintsChanged();
    }
    boolean isOpen(Overlay o) { return o != null && open == o; }
    void cardGone(Card c) { if (rp != null) rp.cardClosed(c); }
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
    void emitNeed(String what) { JSObject e = event("need"); e.put("what", what); TunerPlayerPlugin.emit(e); }

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
        if (rp != null) { openReplayOptions(); return; }
        if (versions == null || cur == null || !cur.id.equals(versions.optString("id"))) emitNeed("versions");   // for Quality, ready when it's opened
        ListPanel p = new ListPanel(this, "Options", true, live ? 320 : 384);   // (384 while a film plays: SPEC 2.1)
        List<ListPanel.Item> items = new ArrayList<>();
        int order = optOrder;
        optOrder = 0;
        ListPanel.Item conn = connectionRow();
        if (order == 1) items.add(conn);
        if (live) {
            if (order == 1 && gameLinked && game != null) {   // while the card shows: Connection, then the other feeds
                JSONArray feeds = otherFeeds();
                if (feeds.length() > 0) items.add(row("Other feeds for this game", feedNames(feeds), String.valueOf(feeds.length()), "tv", this::openFeeds));
                String v = game.has("synced") && !game.isNull("synced") ? game.optInt("synced") + " s" : game.optInt("delay", 60) + " s";
                items.add(row("Sync score", "Match the game clock", v, "refresh", this::openSync));
            } else if (gameLinked && game != null) {
                String v = game.has("synced") && !game.isNull("synced") ? game.optInt("synced") + " s" : game.optInt("delay", 60) + " s";
                items.add(row("Sync score", "Match the game clock", v, "refresh", this::openSync));
                if (order == 2) items.add(conn);
                if (keptDays() > 0 && game.optBoolean("started")) {
                    long tip = game.optLong("tipAt");
                    ListPanel.Item t = row("Watch from tip-off", tip > 0 ? "Tipped off at " + hm(tip) : "The game from its start", null, "skipBack", () -> { closeOverlay(); fromTipoff(); });
                    if (optFromLeft && order == 0) focusRow = t;
                    items.add(t);
                    items.add(row("Rewind and pause", keptLine(), null, "pause", () -> { closeOverlay(); pauseLive(); }));
                }
                JSONArray feeds = otherFeeds();
                if (feeds.length() > 0) items.add(row("Other feeds for this game", feedNames(feeds), String.valueOf(feeds.length()), "tv", this::openFeeds));
            } else if (keptDays() > 0) {
                JSONObject m = metaOf(cur);
                long st = m == null ? 0 : m.optLong("start");
                if (st > 0 && st < System.currentTimeMillis()) items.add(row("Start over", "From " + hm(st), null, "skipBack", () -> { closeOverlay(); rewindLive(st); }));
                items.add(row("Rewind and pause", keptLine(), null, "pause", () -> { closeOverlay(); pauseLive(); }));
            }
        }
        // (Subtitles when the file has tracks, or there are downloads, or a list is coming: SPEC 9.2)
        boolean subsRow = textTracks > 0 || (subs != null && (subs.hasDownloads() || (subs.textWanted() && subs.anyComing())));
        items.add(subsRow ? row("Subtitles", null, subs != null && subs.value() != null ? subs.value() : subtitleValue(), "cc", () -> openSubtitles(true))
                : disabled(row("Subtitles", live ? "No subtitles on this channel" : "No subtitles in this file", null, "cc", null)));
        items.add(audioTracks > 1 ? row("Audio", null, audioValue(), "audio", () -> openAudio(true))
                : disabled(row("Audio", audioTracks == 1 ? audioValue() : "One audio track", null, "audio", null)));
        items.add(row("Picture size", live ? "This channel" : "This title", PICTURE_NAMES[pictureIndex(pictureFor(cur))], "pic", this::openPicture2));
        items.add(row("Quality", qualityDetails(player.getVideoFormat()), qualityName(player.getVideoFormat()), "quality", () -> openQuality(true)));
        if (!items.contains(conn)) items.add(conn);
        if (order == 2 && items.indexOf(conn) > 1) { items.remove(conn); items.add(1, conn); }
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
        p.source(ListPanel.of(items), focusRow != null && items.contains(focusRow) ? items.indexOf(focusRow) : 0);
        focusRow = null;
        optFromLeft = false;
        // keep the focus off disabled rows
        while (p.sel < items.size() - 1 && items.get(p.sel).disabled) p.sel++;
        p.onRight = () -> { ListPanel.Item it = p.itemAt(p.sel); if (it.ok != null && it.chevron) it.ok.run(); };
        show(p);
    }
    private static ListPanel.Item disabled(ListPanel.Item it) { it.disabled = true; return it; }
    private ListPanel.Item focusRow;
    private boolean optFromLeft;

    // ---------- catch-up on live TV (6.6, 6.8, 6.9) ----------
    /** How many days the provider keeps this channel (the app sends it with what's on); 0: not kept. */
    int keptDays() { JSONObject m = metaOf(cur); return m == null ? 0 : m.optInt("kept", 0); }
    private String keptLine() { int d = keptDays(); return "Replays for " + d + " day" + (d == 1 ? "" : "s") + " on this channel"; }
    JSONObject metaNow() { return metaOf(cur); }
    String channelName() { return cur == null ? "" : cur.title; }
    String channelId() { return cur == null ? "" : cur.id; }
    boolean droppedWhilePaused() { return droppedWhilePaused; }
    /** From tip-off (Options, the game panel's foot button): the app starts the game's replay (a new replay session). */
    void fromTipoff() { TunerPlayerPlugin.emit(event("tipoff")); showText("Starting from tip-off…", 3000); }
    /** Start over on a kept channel: the programme's replay from that moment (the app plays it). */
    private void rewindLive(long wallclock) {
        JSObject e = event("need");
        e.put("what", "rewind");
        e.put("at", wallclock);
        e.put("chId", cur == null ? "" : cur.id);
        TunerPlayerPlugin.emit(e);
        showText("Going back…", 3000);
    }
    /** ⏯ or Rewind and pause: the timeline map over the live link, paused (6.8). */
    void pauseLive() {
        if (!live || player == null) return;
        if (lp == null) lp = new LivePause(this, player);
        if (tl == null) tl = new Timeline(this, root);
        tl.m = lp;
        handler.removeCallbacks(hideBanner);
        hideBanner.run();
        lp.start(true);
        tl.show();
    }
    /** Back to live from paused or rewound live TV: the live map, the banner, and 800 ms without repeats or ▶ (M8). */
    void backToLiveFromPause() {
        if (lp == null || !lp.active()) return;
        lp.stop();
        if (tl != null) tl.hide();
        liveGuardUntil = SystemClock.uptimeMillis() + 800;
        if (droppedWhilePaused) { resumeDropped(); return; }
        if (lp.hls()) { player.seekToDefaultPosition(); player.play(); }
        else { retries = 0; tryNow(); player.play(); }   // a .ts stream can't skip ahead: a fresh connection at the live edge
        showBanner();
    }
    void zapFromPause(int dir) { zap(dir, false); }
    /** A paused stream the provider dropped: a kept channel goes on from where you paused, in its replay; else live. */
    void resumeDroppedLive(long wallclock) {
        if (keptDays() > 0) { droppedWhilePaused = false; rewindLive(wallclock); return; }
        if (lp != null) lp.stop();
        if (tl != null) tl.hide();
        droppedWhilePaused = false;
        showText("Back to live: this channel doesn't rewind", 2500);
        retries = 0;
        tryNow();
    }

    /** Options in a replay (catch-up 6.6, player-replay-options): Game panel · Other sources · Not the game? · Sync score
     * · Subtitles · Audio · Picture size, and Connection (the playback diagnosis). A kept programme: Speed. */
    private void openReplayOptions() {
        ListPanel p = new ListPanel(this, "Options", true, 340);
        List<ListPanel.Item> items = new ArrayList<>();
        ListPanel.Item conn = connectionRow();
        if (optOrder == 1) items.add(conn);
        optOrder = 0;
        if (rp.isGame()) items.add(row("Game panel", rp.gameOnChannel() ? "Quarters and plays, as aired" : "The game and where it plays from", null, "score", () -> { closeOverlay(); openReplayPanel(); }));
        if (rp.sources.size() > 1) items.add(row("Other sources", sourcesLine(), String.valueOf(rp.sources.size()), "frames", this::openSources));
        if (rp.gameOnChannel()) {
            items.add(row("Not the game?", "It starts on the wrong show", null, "clock", this::openNotTheGame));
            items.add(row("Sync score", "Match the game clock", rp.src().delay + " s", "refresh", this::openSync));
        }
        items.add(textTracks > 0 ? row("Subtitles", null, subtitleValue(), "cc", () -> openSubtitles(true)) : disabled(row("Subtitles", "No subtitles in this replay", null, "cc", null)));
        items.add(audioTracks > 1 ? row("Audio", null, audioValue(), "audio", () -> openAudio(true)) : disabled(row("Audio", audioTracks == 1 ? audioValue() : "One audio track", null, "audio", null)));
        items.add(row("Picture size", rp.isVideo() ? "This title" : "This channel", PICTURE_NAMES[pictureIndex(pictureFor(cur))], "pic", this::openPicture2));
        if (rp.isProgramme()) items.add(row("Speed", null, speedName(player.getPlaybackParameters().speed), "speed", this::openSpeed));
        if (!items.contains(conn)) items.add(conn);
        for (ListPanel.Item it : items) it.chevron = it.ok != null && it.value != null;
        p.source(ListPanel.of(items), 0);
        while (p.sel < items.size() - 1 && items.get(p.sel).disabled) p.sel++;
        p.onRight = () -> { ListPanel.Item it = p.itemAt(p.sel); if (it.ok != null && it.chevron) it.ok.run(); };
        p.hintKeys = new String[][] { { "OK", "Open" }, { "▲ ▼", "Move" }, { "Back", "Close" } };
        show(p);
    }
    private String sourcesLine() {
        Replay.Source o = null;
        for (int i = 0; i < rp.sources.size(); i++) if (i != rp.si) { o = rp.sources.get(i); break; }
        if (o == null) return null;
        int more = rp.sources.size() - 2;
        return o.name + (more > 0 ? ", " + more + " more" : "");
    }
    /** Other sources: every source of this replay, Best first; OK plays it from the same moment. */
    void openSources() {
        ListPanel p = new ListPanel(this, "Other sources", true, 400);
        p.setCount(rp.title);
        List<ListPanel.Item> items = new ArrayList<>();
        for (int i = 0; i < rp.sources.size(); i++) {
            Replay.Source x = rp.sources.get(i);
            ListPanel.Item it = new ListPanel.Item(x.name);
            it.sub = x.detail;
            it.radio = true;
            it.radioOn = i == rp.si;
            it.badge = x.badge.isEmpty() ? null : x.badge;
            it.height = 56;
            final int fi = i;
            it.ok = () -> { closeOverlay(); if (fi != rp.si) rp.pickSource(fi); };
            items.add(it);
        }
        p.source(ListPanel.of(items), rp.si);
        p.setFoot("Your pick is remembered for this game.");
        p.backTo = this::openOptions;
        show(p);
    }
    /** Not the game? (player-notgame): move the replay an hour either way; airglow remembers it for the channel. */
    private void openNotTheGame() {
        ListPanel p = new ListPanel(this, "Not the game?", true, 420);
        List<ListPanel.Item> items = new ArrayList<>();
        ListPanel.Item later = row("Showing what was on before the game?", "Move the replay 1 hour later", null, "chevR", () -> { closeOverlay(); rp.notTheGame(1); });
        ListPanel.Item earlier = row("Started mid-game, or after it?", "Move the replay 1 hour earlier", null, "chevL", () -> { closeOverlay(); rp.notTheGame(-1); });
        later.height = earlier.height = 56;
        items.add(later);
        items.add(earlier);
        if (rp.sources.size() > 1) { ListPanel.Item o = row("Other sources", sourcesLine(), String.valueOf(rp.sources.size()), "frames", this::openSources); o.chevron = true; o.height = 56; items.add(o); }
        p.source(ListPanel.of(items), 0);
        p.setFoot("airglow remembers this for the channel.");
        p.backTo = this::openOptions;
        p.hintKeys = new String[][] { { "OK", "Move the replay" }, { "▲ ▼", "Move" }, { "Back", "Close" } };
        show(p);
    }

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
        if (rp != null && !rp.gameOnChannel()) { showText("A video has no clock to match", 3000); return; }
        syncSeenAt = System.currentTimeMillis();
        handler.removeCallbacks(syncSlow);
        handler.postDelayed(syncSlow, 8000);
        showText("Getting the game clocks…", 8000);
        if (rp != null) { rp.askClocks(); return; }
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
        boolean replayClocks = d.optBoolean("replay");
        long playedAt = d.optLong("played", -1);
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
                if (replayClocks && playedAt >= 0) ev.put("played", playedAt);   // a replay: where the picture showed that clock
                TunerPlayerPlugin.emit(ev);
            };
            items.add(it);
        }
        p.source(ListPanel.of(items), expanded ? curIdx : (curIdx > 0 ? 1 : 0));
        if (expanded) p.sel = curIdx;
        p.setFoot(d.optString("note"));
        if (replayClocks) p.setCaption("Pick the game clock the picture showed. Only clocks are listed.");
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
    private String pictureKey(Entry e) { return rp != null ? "pic:" + (rp.isVideo() ? "v:" : "") + rp.pictureId() : "pic:" + (live ? "" : "v:") + (e == null ? "" : e.id); }
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
    private boolean qualityFromOptions, askedVersions;
    void openQuality(boolean fromOptions) {
        if (player == null || isFinishing()) return;
        qualityFromOptions = fromOptions;
        Format f = player.getVideoFormat();
        List<ListPanel.Item> items = new ArrayList<>();
        JSONArray vs = versions != null && cur != null && cur.id.equals(versions.optString("id")) ? versions.optJSONArray("list") : null;
        boolean film = !live && vs != null && versions.optBoolean("film");   // the copies with what their checks found (SPEC 7.7)
        ListPanel.Item now = new ListPanel.Item(f == null || f.height <= 0 ? "Now: starting…" : "Now: " + f.width + " × " + f.height + (film && hdr ? " · " + (f.colorInfo != null && f.colorInfo.colorTransfer == C.COLOR_TRANSFER_HLG ? "HDR" : "HDR10") : ""));
        now.sub = film ? null : qualityDetails(f);
        now.disabled = true;
        if (film) now.height = 44;
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
        // the copies of this film, ranked by the app (RANKING.md): Always the best copy, then each with its checked facts
        if (film && vs.length() > 1) {
            items.add(ListPanel.Item.heading("Copies of this film"));
            boolean always = versions.optBoolean("always", true);
            String bestId = versions.optString("bestId");
            ListPanel.Item best = radioRow("Always the best copy", versions.optString("bestLine").isEmpty() ? null : "Now the " + versions.optString("bestLine") + " copy", always, () -> {
                closeOverlay();
                if (cur != null && bestId.equals(cur.id)) { JSObject e = event("version"); e.put("id", bestId); e.put("always", true); e.put("stay", true); TunerPlayerPlugin.emit(e); showText("Always the best copy", 1800); }
                else { JSObject e = event("version"); e.put("id", bestId); e.put("always", true); e.put("t", Math.max(0, player.getCurrentPosition() / 1000.0)); e.put("d", Math.max(0, player.getDuration() / 1000.0)); TunerPlayerPlugin.emit(e); }
            });
            best.height = 50;
            items.add(best);
            for (int k = 0; k < vs.length(); k++) {
                JSONObject o = vs.optJSONObject(k);
                if (o == null) continue;
                String id = o.optString("id");
                boolean playing = cur != null && id.equals(cur.id);
                ListPanel.Item it = radioRow(o.optString("line1", o.optString("name")), o.optString("line2", o.optString("label", null)), !always && o.optBoolean("pinned"), playing && !always ? () -> after(fromOptions) : () -> { closeOverlay(); pickVersion(id); });
                it.tickA = o.optBoolean("checked");
                it.height = 50;
                items.add(it);
            }
        } else if (vs != null && vs.length() > 1) {   // the provider's other copies (a channel's twins; a film before its checks)
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
        ListPanel p = new ListPanel(this, "Quality", true, live ? 352 : 384);
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

    /** The failure card (SPEC 5): the cause on top (title, line, the path), then its rows, the first focused. */
    static final class FailedCard extends ListPanel {
        FailedCard(PlayerActivity a, String heading) {
            super(a, heading, true, 560);
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Ui.dp(560), -2, Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
            lp.bottomMargin = Ui.dp(96);
            root.setLayoutParams(lp);
            title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_DIP, 20);
            caption.setTextSize(android.util.TypedValue.COMPLEX_UNIT_DIP, 15);
            caption.setTextColor(Ui.T2);
            caption.setSingleLine(true);
            caption.setEllipsize(android.text.TextUtils.TruncateAt.END);
        }
    }
    /** After six failed reconnects, or at once when it can't come back by itself (an ended account, the TV's decoder,
     * a picture broken at the source, a channel that's off). Replaces "This channel stopped". */
    private void showFailed(Diag.Cause c) {
        if (c == null || "checking".equals(c.id) || "good".equals(c.id)) c = cause != null && !"checking".equals(cause.id) && !"good".equals(cause.id) ? cause : Diag.decide(rd, what(), cur == null ? "" : cur.title);
        hideCard(false);
        card.setVisibility(View.GONE);
        handler.removeCallbacks(retune);
        reconnecting = false;
        cause = c;
        error = c.title;
        JSObject ev = event("failed");
        ev.put("error", error);
        TunerPlayerPlugin.emit(ev);
        JSONArray feeds = gameLinked ? otherFeeds() : new JSONArray();
        boolean feedCase = feeds.length() > 0 && !"decoder".equals(c.id);
        List<ListPanel.Item> items = new ArrayList<>();
        String title = c.title;
        if (feedCase && "off".equals(c.id)) title = "This feed is off at your provider";
        FailedCard f = new FailedCard(this, title);
        f.setCaption(feedCase ? (game == null ? "This game" : game.optString("title")) + " is also on these channels." : fit(f.caption, c.line, c.shortLine, 520));
        PathView pv = new PathView(this, false, 0);
        pv.set(c.path);
        FrameLayout wrap = new FrameLayout(this);
        wrap.setPadding(Ui.dp(10), Ui.dp(6), Ui.dp(10), Ui.dp(6));
        wrap.addView(pv, new FrameLayout.LayoutParams(-1, -2));
        f.setExtra(wrap, 90);
        if (feedCase) {
            for (int i = 0; i < feeds.length(); i++) {
                JSONObject o = feeds.optJSONObject(i);
                ListPanel.Item it = new ListPanel.Item(Diag.clean(o.optString("name")));
                it.sub = o.optString("label");
                it.logoName = o.optString("name");
                it.logoUrl = o.optString("logo");
                it.live = true;
                it.height = 52;
                String id = o.optString("id");
                it.ok = () -> { closeOverlay(); pick(id, "diagnosis"); };
                items.add(it);
            }
        } else {
            for (String[] a : actions(c, 2)) {
                if ("retry".equals(a[0])) continue;
                ListPanel.Item it = row(a[1], a[2], null, a[3], runOf(a));
                it.height = 52;
                items.add(it);
            }
        }
        if ("off".equals(c.id)) {
            ListPanel.Item it = row("Refresh channels", "Your provider may have moved it", null, "list", () -> { closeOverlay(); TunerPlayerPlugin.emit(event("refresh")); showText("Refreshing your channels…", 3000); });
            it.height = 52;
            items.add(it);
        }
        if (!"decoder".equals(c.id) && !"ended".equals(c.id))
            items.add(row(feedCase ? "Try this feed again" : "Try again", null, null, "refresh", () -> { closeOverlay(); retries = 0; limitTries = 0; tuneTo(index, false); }));
        if (items.isEmpty() && ring.size() > 1) items.add(row("Next channel", null, null, "chevR", () -> { closeOverlay(); zap(1, false); }));
        f.source(ListPanel.of(items), 0);
        f.setFoot("Back closes");
        f.hintKeys = new String[][] { { "OK", "Choose" }, { "▲ ▼", "Move" }, { "Back", "Close" } };
        show(f);
        emitDiag(c, "failed");
    }

    /** Reconnects the live channel: 2, 4, 8, 16, 16, 16 s, then the failure card. A limit answer (with evidence) backs off
     * 10, 20, 30 s and then every 30 s instead: the provider may still count this TV's last stream. */
    private void reconnect() {
        if (player == null || isFinishing() || !live) return;
        boolean limit = (cause != null && cause.limit) || limitEvidence();
        if (!limit && retries >= 6) { showFailed(cause); return; }
        long wait = limit ? (limitTries < 3 ? 10000L * (limitTries + 1) : 30000L) : 2000L << Math.min(retries, 3);
        if (limit) limitTries++; else retries++;
        Diag.closedAt = SystemClock.elapsedRealtime();
        reconnecting = true;
        nextTryAt = SystemClock.uptimeMillis() + wait;
        toast.setVisibility(View.GONE);
        card.setVisibility(View.GONE);
        boolean quiet = quietTry && retries <= 1;
        quietTry = false;
        if (!cardUp && open == null && !quiet) {
            Diag.Cause c = cause != null && !"good".equals(cause.id) ? cause : Diag.checking(rd, what());
            if (!hidden(c)) showCause(c);
            if (!checkRunning) runChecks(false);
        }
        handler.removeCallbacks(retune);
        handler.postDelayed(retune, wait);
        updateRight();
    }
    private boolean quietTry;
    private boolean limitEvidence() {
        int h = rd.http;
        return h == 458 || h == 509 || ((h == 401 || h == 403) && (rd.limitBody || Diag.closedRecently() || (rd.acct == 1 && rd.max > 0 && rd.active >= rd.max)));
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
        if (lp != null && lp.active()) { lp.stop(); if (tl != null) tl.hide(); }
        if (cur != null && !cur.id.equals(e.id) && !repeat && played) last = cur;
        if (played) Diag.closedAt = SystemClock.elapsedRealtime();   // the stream this TV had closes now
        index = i;
        cur = e;
        error = null; quality = ""; hdr = false; textTracks = audioTracks = 0; retries = 0; played = false;
        resetLag();
        resetDiag();
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
        // Options' order is decided now (opening it dismisses the chip): Connection first while the card shows, second while
        // a diagnosis chip does (so ◀ OK OK still syncs), else under Quality
        boolean opts = code == KeyEvent.KEYCODE_DPAD_LEFT || code == KeyEvent.KEYCODE_MENU;
        optFromLeft = code == KeyEvent.KEYCODE_DPAD_LEFT;
        optOrder = !opts ? 0 : cardUp && live ? 1 : chipUp && (chipKind == CHIP_STUTTER || chipKind == CHIP_OFFLINE) ? 2 : 0;
        if (chipUp && !chipIsUpNext && !isOk(code)) hideChip();   // any other key dismisses the chip
        if (tl != null && tlActive()) {   // the timeline map (catch-up 6.1): a replay, or live TV paused or rewound
            if (tl.key(code, repeat)) { hintsChanged(); return; }
            switch (code) {
                case KeyEvent.KEYCODE_MENU: if (!repeat) openOptions(); break;
                case KeyEvent.KEYCODE_CAPTIONS: if (!repeat) openSubtitles(false); break;
                case KeyEvent.KEYCODE_INFO: hintForce = true; hintsOn = true; tl.show(); break;
            }
            return;
        }
        if (live) {
            if (SystemClock.uptimeMillis() < liveGuardUntil && (repeat || code == KeyEvent.KEYCODE_DPAD_RIGHT)) return;   // (M8)
            liveKey(code, repeat);
        }
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
        if (tl != null && tlActive() && open == null) { tl.up(code); return; }
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
        if (chipUp && chipKind == CHIP_STUTTER) { Runnable r = chipRun; hideChip(); if (r != null) r.run(); return; }
        if (chipUp && chipKind == CHIP_OFFLINE) { openChannels(); return; }
        if (chipUp && !chipIsUpNext) { String id = chipId; hideChip(); pick(id, "chip"); return; }
        if (cardUp && !act.isEmpty()) {
            // (not for 700 ms after it appears, nor 1 s after its action changes: OK pressed for something else)
            long now = SystemClock.uptimeMillis();
            if (now - cardAt < 700 || now - actionAt < 1000) return;
            if (actRun != null) actRun.run();
            return;
        }
        openChannels();
    }
    private void togglePlay() {
        if (live && droppedWhilePaused) { resumeDropped(); return; }
        if (live && player.getPlayWhenReady() && played) { pauseLive(); return; }   // ⏯: live TV paused, on the timeline (6.8)
        if (player.isPlaying()) player.pause(); else player.play();
    }

    private void back() {
        if (open != null) { if (!open.back()) closeOverlay(); return; }
        if (chipUp) {
            if (chipIsUpNext) {   // stay on this one: no autoplay
                stayIndex = index;
                if (player.getMediaItemCount() > index + 1) player.removeMediaItems(index + 1, player.getMediaItemCount());
                while (ring.size() > index + 1) ring.remove(ring.size() - 1);
                vod.setItem(cur, false);
            }
            if (chipKind == CHIP_STUTTER && cur != null) stutterBacked.add(cur.id);
            hideChip();
            return;
        }
        if (!digits.isEmpty()) { digits = ""; handler.removeCallbacks(jump); digitsView.setVisibility(View.GONE); return; }
        if (cardUp) {   // hides it: that cause on this channel stays quiet for 10 minutes unless it stops for good
            if (cause != null && cur != null) hiddenUntil.put(cur.id + ":" + cause.id, SystemClock.uptimeMillis() + 600000);
            hideCard(false);
            return;
        }
        if (tl != null && tlActive() && tl.back()) return;
        if (rp != null) { finish(); return; }
        if (lp != null && lp.active()) { finish(); return; }   // Back on rewound live TV leaves the player, as a movie (13.3)
        if (!live && vod != null && vod.back()) return;
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
                    if (rp != null) rp.game(game);
                    if (open instanceof GamePanel) open.refresh();
                    updateBug();
                    break;
                }
                case "replay-links": if (rp != null) rp.links(new JSONObject(arg)); break;
                case "replay-extend": if (rp != null) rp.extend(new JSONObject(arg)); break;
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
                case "versions": versions = new JSONObject(arg); if (open instanceof ListPanel && "Quality".contentEquals(((ListPanel) open).title.getText())) openQuality(qualityFromOptions); break;
                case "subs": if (subs != null) subs.command(arg); break;
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
        if (subs != null && rp == null) {   // Options > Subtitles, rebuilt (SPEC 7.2)
            if (textTracks == 0 && !subs.hasDownloads() && ("none".equals(subs.status()) || !subs.textWanted() && !"".equals(subs.status()))) { showText("This video has no subtitles", 3000); return; }
            subs.open(fromOptions);
            return;
        }
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

    void pickText(Tracks.Group g, int i) {
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

    static String trackName(Format f, int n) {
        String lang = f.language == null || f.language.isEmpty() || "und".equals(f.language) ? null : new Locale(f.language).getDisplayLanguage(Locale.ENGLISH);
        boolean cc = MimeTypes.APPLICATION_CEA608.equals(f.sampleMimeType) || MimeTypes.APPLICATION_CEA708.equals(f.sampleMimeType);
        String name = f.label != null && !f.label.isEmpty() ? f.label : lang != null ? lang : cc ? "Closed captions" : "Track " + n;
        if (lang != null && !name.toLowerCase(Locale.ROOT).contains(lang.toLowerCase(Locale.ROOT))) name += " (" + lang + ")";
        if ((f.selectionFlags & C.SELECTION_FLAG_FORCED) != 0) name += " · forced";
        return name;
    }

    /** Chalk subtitles, Inter 600 at 28 dp with a 1.5 dp black edge and no box, 10% up from the bottom;
     * the TV's own caption style wins when one has been set up. */
    void styleSubtitles(SubtitleView sv) {
        if (sv == null) return;
        CaptioningManager cm = (CaptioningManager) getSystemService(CAPTIONING_SERVICE);
        sv.setBottomPaddingFraction(0.1f);
        if (cm != null && cm.isEnabled()) { sv.setUserDefaultStyle(); sv.setUserDefaultTextSize(); return; }
        sv.setApplyEmbeddedStyles(false);
        sv.setStyle(new CaptionStyleCompat(Ui.T1, Color.TRANSPARENT, Color.TRANSPARENT,
                CaptionStyleCompat.EDGE_TYPE_OUTLINE, 0xFF000000, Ui.inter600));
        sv.setFixedTextSize(android.util.TypedValue.COMPLEX_UNIT_DIP, 28);
    }

    @Override protected void onStop() { super.onStop(); stopped = true; cancelChecks(); stoppedAt = System.currentTimeMillis(); if (player != null && !isFinishing()) { resumeAfterStop = live || player.getPlayWhenReady(); player.pause(); } }
    @Override protected void onStart() {
        super.onStart();
        stopped = false;
        if (player == null) return;
        // Back after a while on live: start from now rather than an old position.
        if (live && stoppedAt > 0 && System.currentTimeMillis() - stoppedAt > 10000) tuneTo(index < 0 ? 0 : index, false);
        else if (live && droppedWhilePaused) resumeDropped();
        else if (resumeAfterStop) player.play();
        if (netBackPending) { netBackPending = false; handler.postDelayed(netBack, 2000); }   // (nothing re-tunes while it's in the background)
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (subs != null) subs.drawer.stop();
        cancelChecks();
        try { if (netCb != null) ((ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE)).unregisterNetworkCallback(netCb); } catch (Exception ignored) {}
        try { if (debug != null) unregisterReceiver(debug); } catch (Exception ignored) {}
        if (played) Diag.closedAt = SystemClock.elapsedRealtime();
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
            if (rp != null) e.put("played", rp.played());   // a replay: ms into its window (PORT-NATIVE.md 3)
            if (exitThen != null) e.put("then", exitThen);
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

    // ---------- catch-up: what the replay and the timeline use (design/ui-v1/catchup/PORT-NATIVE.md) ----------
    /** The timeline map is on: a replay, or live TV paused or rewound. */
    boolean tlActive() { return rp != null || (lp != null && lp.active()); }
    void timelineShown() { if (!hintsOn) hintsOn = hintForce || bump("timeline"); }
    void timelineChanged() { if (tl != null) tl.changed(); }
    void showTimeline() { if (tl != null && open == null && !isFinishing()) tl.show(); }
    private long spinnerFrom;
    /** The stream this TV has goes first (one connection, 6.11), so the provider can count it gone before the next. */
    void releaseStream() {
        if (player == null) return;
        if (played) Diag.closedAt = SystemClock.elapsedRealtime();
        player.stop();
        player.clearMediaItems();
        resetDiag();
    }
    void setStream(String url, long posMs) {
        if (player == null) return;
        cur.url = url;
        player.setMediaItem(item(cur), Math.max(0, posMs));
        player.prepare();
    }
    /** The reconnect spinner (no text), from 1 s after a link was asked for. */
    void spinnerSoon() { spinnerFrom = SystemClock.uptimeMillis(); }
    void spinnerGone() { spinnerFrom = 0; if (puck != null && !rd.stalled) puck.setVisibility(View.GONE); }
    void classifyError(PlaybackException e) { classify(e); }
    int httpCode() { return rd.http; }
    boolean limitAnswer() { return limitEvidence(); }
    boolean timedOut() { return rd.timedOut; }
    boolean decoderFault() { return rd.decoder > 0; }
    /** The account check (max_connections for the stream-limit card), in the background. */
    boolean online() { return rd.connected; }
    private Boolean playPauseKey;
    private boolean hasPlayPause() {
        if (playPauseKey == null) { try { playPauseKey = android.view.KeyCharacterMap.deviceHasKey(KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE); } catch (Exception e) { playPauseKey = false; } }
        return playPauseKey;
    }
    /** A replay's link failed with the network gone: the diagnosis card says so (offline, the router, the Wi-Fi). */
    void showOffline() { showCause(Diag.decide(rd, what(), title())); }
    void checkAccount() { if (!apiUrl.isEmpty() && !checkRunning) runChecks(false); }
    int maxStreams() { return rd.acct == 1 ? rd.max : -1; }
    /** A kept programme's Up next (6.7), the last 10 s: the chip without a countdown or a key. */
    void upNextCard(String title, String sub) {
        if (open != null || (chipUp && chipKind != CHIP_PROGRAMME)) return;
        chipKind = CHIP_PROGRAMME;
        chipIsUpNext = false;
        chipRing.setVisibility(View.GONE);
        chipGlyph.setVisibility(View.GONE);
        chipKbd.setVisibility(View.GONE);
        chipOk.setVisibility(View.GONE);
        chipTitle.setText(title);
        chipSub.setText(sub);
        if (!chipUp) { chipUp = true; chip.setVisibility(View.VISIBLE); hintsChanged(); }
    }
    void upNextCardGone() { if (chipUp && chipKind == CHIP_PROGRAMME) hideChip(); }
    /** The game panel in a replay (6.9): the as-aired answers only. */
    void openReplayPanel() { if (rp != null && rp.isGame()) show(new GamePanel(this, 0)); }
    /** For the emulator test: what the replay is doing. */
    String replayState() { return rp == null ? "" : rp.describe() + " bar=" + (tl != null && tl.visible()) + " buttons=" + (tl == null ? "" : tl.describe()); }

    // ---------- playback diagnosis (design/ui-v1/diagnosis/SPEC.md) ----------
    // A routine stall shows only the puck; one that isn't recovering gets the card with its cause (checked, never
    // guessed); a channel that can't come back gets the failure card; Options > Connection shows every reading.
    // No score, clock or result anywhere here: games are named by title, feeds by channel.

    static final int CHIP_TEAM = 1, CHIP_UPNEXT = 2, CHIP_STUTTER = 3, CHIP_OFFLINE = 4, CHIP_PROGRAMME = 5;
    private int chipKind;
    private FrameLayout chipGlyph;
    private TextView chipKbd;
    private String chipAct = "";
    private Runnable chipRun;
    private Diag.Cause waitingStutter;   // the team chip has the slot: shown after it, if it's under 30 s old
    private long waitingStutterAt;
    private final java.util.Set<String> stutterBacked = new java.util.HashSet<>();
    private final Map<String, Long> stutterAt = new HashMap<>();
    private final List<Long> stalls = new ArrayList<>();
    private boolean stutterWanted;

    private LinearLayout dcard, dKeys;
    private TextView dTitle, dLine, dOk, dOkKey, dLeftKey, dDetails, dRight;
    private Ui.Spinner dSpin;
    private PathView dPath;
    private PathView.Puck puck;
    private final Diag.Readings rd = new Diag.Readings();
    private Diag.Cause cause;
    private String pendingId;
    private boolean cardUp, forced;
    private long cardAt, actionAt, steadyAt;
    private String act = "", actLabel = "";
    private Runnable actRun;
    private final Map<String, Long> hiddenUntil = new HashMap<>();   // "channel:cause" → hidden until (Back on the card)
    private long stallStart;
    private int notRec;
    private boolean versionsAsked, stallSlowStart, stallCounts;
    private boolean reconnecting, droppedWhilePaused, decoderRetried, stopped, netBackPending, wasOffline;
    private int limitTries, notFound, broken;
    private long nextTryAt, lastNetTune;
    private String apiUrl = "";
    private int optOrder;
    private int checkSeq;
    private boolean checkRunning;
    private long lastCheckAt = -600000;
    private ListPanel connPanel;
    private TextView connTitle, connLine;
    private PathView connPath;

    private String what() { return rp != null ? rp.what() : live ? "channel" : cur != null && cur.id.startsWith("episode:") ? "episode" : "movie"; }
    private String title() { return rp != null ? rp.name() : cur == null ? "" : cur.title; }

    // ----- what arrives (10.2): bytes from a TransferListener on the loader threads, read once a second here -----
    private final AtomicLong bytesIn = new AtomicLong();
    private volatile Uri streamUri;
    private volatile boolean streamRedirected;
    private volatile String streamType = "";
    private final TransferListener health = new TransferListener() {
        @Override public void onTransferInitializing(@NonNull DataSource s, @NonNull DataSpec d, boolean net) {}
        @Override public void onTransferStart(@NonNull DataSource s, @NonNull DataSpec d, boolean net) {
            if (!net) return;
            Uri u = s.getUri();   // after redirects: the server the stream really comes from
            Uri at = u != null ? u : d.uri;
            String a = d.uri.getHost(), b = at.getHost();
            streamRedirected = a != null && b != null && !a.equalsIgnoreCase(b);
            String t = "";
            try { for (Map.Entry<String, List<String>> h : s.getResponseHeaders().entrySet()) if (h.getKey() != null && "content-type".equalsIgnoreCase(h.getKey()) && !h.getValue().isEmpty()) t = h.getValue().get(0); } catch (Exception ignored) {}
            streamType = t;
            streamUri = at;
        }
        @Override public void onBytesTransferred(@NonNull DataSource s, @NonNull DataSpec d, boolean net, int n) { if (net) bytesIn.addAndGet(n); }
        @Override public void onTransferEnd(@NonNull DataSource s, @NonNull DataSpec d, boolean net) {}
    };
    private final long[] perSec = new long[10];
    private int perSecN, aheadN;
    private long bytesSeen;
    private final double[] aheadHist = new double[3];
    private long needAt, needBytes;
    private double needMedia, needMeasured;

    /** The 1 s sample (rides the tick): arrival over the last 3 s, the refill rate over 2 s, the need, the Wi-Fi. */
    private void sample() {
        long b = bytesIn.get(), d = b - bytesSeen;
        bytesSeen = b;
        perSec[perSecN++ % perSec.length] = d;
        if (forced) return;
        long sum = 0;
        int n = Math.min(3, perSecN);
        for (int k = 1; k <= n; k++) sum += perSec[(perSecN - k) % perSec.length];
        rd.arrival = n == 0 ? -1 : sum * 8.0 / n / 1e6;
        double ahead = player.getTotalBufferedDuration() / 1000.0;
        rd.refill = aheadN >= 2 ? (ahead - aheadHist[(aheadN + 1) % 3]) / 2 : -1;
        aheadHist[aheadN++ % 3] = ahead;
        rd.ahead = ahead;
        long now = SystemClock.uptimeMillis();
        rd.playing = player.isPlaying();
        // a stall: buffering after the first frame, or a slow start (no first frame 6 s after a tune)
        rd.stalled = player.getPlaybackState() == Player.STATE_BUFFERING && player.getPlayWhenReady() && (played || (live && tunedAt > 0 && now - tunedAt > 6000));
        Format f = player.getVideoFormat(), af = player.getAudioFormat();
        int vb = f == null ? 0 : f.bitrate > 0 ? f.bitrate : Math.max(f.averageBitrate, f.peakBitrate);
        int ab = af == null ? 0 : af.bitrate > 0 ? af.bitrate : Math.max(af.averageBitrate, af.peakBitrate);
        if (f != null) { rd.height = f.height; rd.fps = f.frameRate; }
        // a .ts stream doesn't say its rate: bytes ÷ media seconds gained over 10 s of steady play
        double media = (player.getCurrentPosition() + player.getTotalBufferedDuration()) / 1000.0;
        if (rd.playing) {
            if (needAt == 0) { needAt = now; needBytes = b; needMedia = media; }
            else if (now - needAt >= 10000) { double gain = media - needMedia; if (gain >= 5) needMeasured = (b - needBytes) * 8 / gain / 1e6; needAt = 0; }
        } else needAt = 0;
        if (vb > 0) { rd.need = (vb + Math.max(ab, 0)) / 1e6; rd.needAbout = false; }
        else if (needMeasured > 0) { rd.need = needMeasured; rd.needAbout = true; }
        else { rd.need = Diag.typical(rd.height, rd.fps); rd.needAbout = true; }
        if (rd.stalled || cardUp || (connPanel != null && open == connPanel)) wifiNow();
    }
    private void wifiNow() {
        if (!rd.wifi) return;
        int[] w = Diag.wifi(this);
        rd.rssi = w[0]; rd.bars = Diag.bars(w[0]); rd.link = w[1]; rd.linkMax = Math.max(rd.linkMax, w[1]);
    }

    /** The stall timeline (3.1) against the real load control: the puck from 1 s; from 3 s the card once two seconds in a
     * row aren't recovering (refill ≥ 0.8 s per second and done within 4 s more); at 12 s at the latest. */
    private void timeline() {
        if (forced) return;
        long now = SystemClock.uptimeMillis();
        if (rd.stalled) {
            if (stallStart == 0) { stallStart = now; notRec = 0; stallSlowStart = !played; stallCounts = played && !reconnecting; }
            long el = now - stallStart;
            float target = live ? 6f : 5f;
            if (chipUp && chipKind == CHIP_OFFLINE && !rd.connected) { hideChip(); showCause(Diag.decide(rd, what(), title())); }   // the picture stopped: the chip becomes the card
            if (el >= 1000 && !cardUp) { puck.set(rd.arrival > 0.02 && rd.refill > 0 ? (float) (rd.ahead / target) : -1); puck.setVisibility(View.VISIBLE); }
            if (el >= 1000 && !versionsAsked && live) { versionsAsked = true; if (versions == null || cur == null || !cur.id.equals(versions.optString("id"))) emitNeed("versions"); }
            if (el >= 3000 && el < 12000) { boolean rec = rd.refill >= 0.8 && (target - rd.ahead) / rd.refill <= 4; notRec = rec ? 0 : notRec + 1; }
            if (!cardUp && (notRec >= 2 || el >= 12000 || stallSlowStart)) { if (stallSlowStart) zap.setVisibility(View.GONE); openCheck(); }
        } else {
            if (stallStart > 0) { stallEnded(now - stallStart); stallStart = 0; notRec = 0; }
            boolean asking = rp != null && rp.busy() && now - spinnerFrom >= 1000 && spinnerFrom > 0;
            if (asking) puck.set(-1);
            puck.setVisibility(asking ? View.VISIBLE : View.GONE);
            if (!cardUp && reconnecting && open == null && cause != null && !hidden(cause)) showCause(cause);
        }
        if (cardUp) {
            if (player.isPlaying()) { if (steadyAt == 0) steadyAt = now; else if (now - steadyAt >= 1000) hideCard(true); }
            else steadyAt = 0;
            if (!live) dKeys.setVisibility(vod != null && vod.visible() ? View.GONE : View.VISIBLE);   // (S13: with the controls up OK stays play/pause)
            updateRight();
            // at most once per 15 s while it lasts
            if (!checkRunning && now - lastCheckAt >= 15000 && (rd.stalled || reconnecting)) runChecks(false);
        }
    }
    private void openCheck() {
        if (open != null || cardUp || cur == null) return;
        Diag.Cause c = cause != null && !"good".equals(cause.id) ? cause : Diag.checking(rd, what());
        if (!hidden(c)) showCause(c);
        if (!checkRunning && (cause == null || "checking".equals(cause.id) || SystemClock.uptimeMillis() - lastCheckAt >= 15000)) runChecks(false);
    }
    /** "This keeps pausing": the third stall of half a second or more in 5 min while playing (not in the first 10 s after a
     * tune), once per channel per 15 min (30 after Back). */
    private void stallEnded(long dur) {
        if (!live || dur < 500 || !stallCounts || cur == null) return;   // (a reconnect's own refill isn't a pause in the picture)
        long now = SystemClock.uptimeMillis();
        if (now - tunedAt < 10000) return;
        stalls.add(now);
        while (!stalls.isEmpty() && now - stalls.get(0) > 300000) stalls.remove(0);
        rd.pauses5m = stalls.size();
        if (stalls.size() < 3 || open != null || cardUp) return;
        Long at = stutterAt.get(cur.id);
        if (at != null && now - at < (stutterBacked.contains(cur.id) ? 1800000 : 900000)) return;
        stutterAt.put(cur.id, now);
        stutterWanted = true;
        runChecks(false);
    }

    // ----- the checks (10.3, 10.5): one set at a time on a single thread, results back on this one -----
    private void runChecks(boolean speed) {
        if (cur == null || stopped || player == null) return;
        if (checkRunning && !speed) return;
        Diag.Req q = new Diag.Req();
        q.ctx = getApplicationContext();
        Uri u = streamUri != null ? streamUri : Uri.parse(cur.url);
        q.host = u.getHost();
        q.port = u.getPort() > 0 ? u.getPort() : "https".equalsIgnoreCase(u.getScheme()) ? 443 : 80;
        q.api = apiUrl;
        q.gateway = rd.gateway;
        q.weak = rd.wifiWeak();
        q.starving = rd.starving();
        q.speed = speed;
        q.speedIfStarving = !(rd.speedState == 1 && SystemClock.uptimeMillis() - rd.speedAt < 600000);   // (cached 10 min)
        wifiNow();
        rd.linkMax = rd.link;   // the ratio uses the highest link speed seen during this test
        int seq = ++checkSeq;
        checkRunning = true;
        lastCheckAt = SystemClock.uptimeMillis();
        Diag.SETS.execute(() -> {
            Diag.Probe p = Diag.run(q);
            handler.post(() -> {
                if (seq != checkSeq || isFinishing() || player == null) return;
                checkRunning = false;
                if (forced) return;
                p.into(rd);
                diagnosed();
            });
        });
    }
    private void cancelChecks() { checkSeq++; checkRunning = false; }
    private void diagnosed() {
        Diag.Cause c = Diag.decide(rd, what(), title());
        if (cardUp) applyCause(c);
        else if (!"good".equals(c.id) && (rd.stalled || reconnecting)) cause = c;
        if (stutterWanted) {
            stutterWanted = false;
            if (chipUp && chipKind == CHIP_TEAM) { waitingStutter = c; waitingStutterAt = SystemClock.uptimeMillis(); }
            else if (!chipUp && open == null && !cardUp) showStutter(c);
        }
        if (connPanel != null && open == connPanel) fillConnection();
    }
    /** A cause changes only when two checks in a row agree; certain ones (an HTTP status, offline, the decoder) at once. */
    private void applyCause(Diag.Cause c) {
        if ("good".equals(c.id)) return;
        if (cause == null || "checking".equals(cause.id) || c.certain || c.id.equals(cause.id) || c.id.equals(pendingId)) { pendingId = null; showCause(c); }
        else pendingId = c.id;
    }

    // ----- the card -----
    private boolean hidden(Diag.Cause c) {
        Long u = cur == null ? null : hiddenUntil.get(cur.id + ":" + c.id);
        return u != null && u > SystemClock.uptimeMillis() && !c.fail;
    }
    private static String fit(TextView t, String full, String shorter, int widthDp) {
        return shorter != null && t.getPaint().measureText(full) > Ui.dp(widthDp) ? shorter : full;
    }
    private void showCause(Diag.Cause c) {
        if (c.fail && live) { showFailed(c); return; }
        boolean changed = cause == null || !c.id.equals(cause.id) || !cardUp;
        cause = c;
        if (hidden(c)) { hideCard(false); return; }
        if (open != null) return;   // the card waits for the panel to close
        String[] a = live ? first(actions(c, 1)) : null;
        String was = act;
        act = a == null ? "" : a[0];
        actLabel = a == null ? "" : a[1];
        actRun = a == null ? null : runOf(a);
        if (!act.equals(was) || changed) actionAt = SystemClock.uptimeMillis();
        dSpin.setVisibility(c.spin ? View.VISIBLE : View.GONE);
        dTitle.setText(fit(dTitle, c.title, "unknown".equals(c.id) ? Diag.UNKNOWN_SHORT : null, c.spin ? 486 : 520));
        dLine.setText(fit(dLine, c.line, c.shortLine, c.spin ? 486 : 520));
        dPath.set(c.path);
        if (live) {
            dOkKey.setText(act.isEmpty() ? "▲ ▼" : "OK");
            dOk.setText(act.isEmpty() ? "Zap" : actLabel);
            dOk.setTextColor(act.isEmpty() ? Ui.T2 : Ui.T1);
            dOk.setTypeface(act.isEmpty() ? Ui.inter500 : Ui.inter650);
        }
        for (View v : new View[] { dOkKey, dOk, dLeftKey }) v.setVisibility(live ? View.VISIBLE : View.GONE);
        dDetails.setText(live ? "Details" : "");
        updateRight();
        if (!cardUp) {
            cardUp = true;
            cardAt = SystemClock.uptimeMillis();
            steadyAt = 0;
            dcard.animate().cancel();
            dcard.setAlpha(1);
            dcard.setVisibility(View.VISIBLE);
            dcard.bringToFront();
            puck.setVisibility(View.GONE);
            toast.setVisibility(View.GONE);
            zap.setVisibility(View.GONE);
            hintsChanged();
        }
        if (changed) emitDiag(c, "card");
    }
    private void hideCard(boolean fade) {
        if (!cardUp) return;
        cardUp = false;
        pendingId = null;
        dcard.animate().cancel();
        if (fade) dcard.animate().alpha(0).setDuration(200).withEndAction(() -> { if (!cardUp) dcard.setVisibility(View.GONE); dcard.setAlpha(1); }).start();
        else { dcard.setVisibility(View.GONE); dcard.setAlpha(1); }
        hintsChanged();
    }
    private void updateRight() {
        if (!cardUp || cause == null || dRight == null) return;
        long now = SystemClock.uptimeMillis();
        String r;
        if (nextTryAt > now) r = "Next try in " + Math.max(1, (nextTryAt - now + 999) / 1000) + " s";
        else if (reconnecting) r = cause.limit ? "Trying again…" : "Reconnecting · try " + Math.max(1, retries) + " of 6";
        else r = "Back hides";
        if (!r.contentEquals(dRight.getText())) dRight.setText(r);
    }

    // ----- actions (4.4): another feed of the game, another copy, try again, next channel; never automatic -----
    private static String[] first(List<String[]> l) { return l.isEmpty() ? null : l.get(0); }
    /** {kind, label, sub, icon, id} for up to max of the cause's actions that exist right now. */
    private List<String[]> actions(Diag.Cause c, int max) {
        List<String[]> out = new ArrayList<>();
        java.util.Set<String> kinds = new java.util.HashSet<>();
        for (String k : c.actions) {
            if (out.size() >= max) break;
            String[] a = action(k);
            if (a != null && kinds.add(a[0])) out.add(a);
        }
        return out;
    }
    private String[] action(String k) {
        switch (k) {
            case "feed": {
                if (!live || !gameLinked) return null;
                JSONArray f = otherFeeds();
                if (f.length() == 0) return null;
                JSONObject o = f.optJSONObject(0);
                return new String[] { "feed", "Same game on " + Diag.clean(o.optString("name")), o.optString("label"), "tv", o.optString("id") };
            }
            case "copy": case "lower": {
                JSONObject o = copy("lower".equals(k));
                if (o == null) return null;
                String tag = Diag.tagOfName(o.optString("name"));
                return new String[] { "copy", tag.isEmpty() ? "Watch the other copy" : "Watch the " + tag + " copy", Diag.clean(o.optString("name")), "quality", o.optString("id") };
            }
            case "retry": return new String[] { "retry", "Try again now", null, "refresh", "" };
            case "next": {
                if (!live || ring.size() < 2) return null;
                Entry n = ring.get(((index + 1) % ring.size() + ring.size()) % ring.size());
                return new String[] { "next", "Next channel", (n.num > 0 ? n.num + " · " : "") + Diag.clean(n.title), "chevR", n.id };
            }
            case "settings": return new String[] { "settings", "Network settings", null, "signal", "" };
            case "account": return new String[] { "account", "Account", "Renew it with your provider", "chevR", "" };
        }
        return null;
    }
    /** Another copy of the channel (the Quality sheet's versions): lower = the best one whose need fits 0.8 × what
     * arrives, else the lowest below this one; otherwise the copy nearest this one's quality (another stream). */
    private JSONObject copy(boolean lower) {
        JSONArray vs = versions != null && cur != null && cur.id.equals(versions.optString("id")) ? versions.optJSONArray("list") : null;
        if (vs == null || cur == null) return null;
        double mine = Diag.needOfName(cur.title), room = Math.max(rd.arrival, rd.capacity());
        JSONObject best = null, lowest = null;
        for (int i = 0; i < vs.length(); i++) {
            JSONObject o = vs.optJSONObject(i);
            if (o == null || cur.id.equals(o.optString("id"))) continue;
            double n = Diag.needOfName(o.optString("name"));
            if (!lower) { if (best == null || Math.abs(n - mine) < Math.abs(Diag.needOfName(best.optString("name")) - mine)) best = o; continue; }
            if (n >= mine) continue;
            if (lowest == null || n < Diag.needOfName(lowest.optString("name"))) lowest = o;
            if ((room <= 0 || n <= 0.8 * room) && (best == null || n > Diag.needOfName(best.optString("name")))) best = o;
        }
        return best != null ? best : lowest;
    }
    private Runnable runOf(String[] a) {
        switch (a[0]) {
            case "feed": case "copy": { String id = a[4]; return () -> { closeOverlay(); hideCard(false); pick(id, "diagnosis"); }; }   // its own score delay, lag 0
            case "next": return () -> { closeOverlay(); hideCard(false); zap(1, false); };
            case "settings": return this::openNetworkSettings;
            case "account": return () -> { TunerPlayerPlugin.emit(event("goto-account")); finish(); };
            default: return () -> { closeOverlay(); tryNow(); };
        }
    }
    private static String shortLabel(String[] a) {
        switch (a[0]) {
            case "feed": return a[1].replace("Same game on ", "");
            case "copy": return a[1].replace("Watch the ", "");
            case "retry": return "Try again";
            default: return a[1];
        }
    }
    private void tryNow() {
        handler.removeCallbacks(retune);
        reconnecting = true;
        Diag.closedAt = SystemClock.elapsedRealtime();
        retune.run();
    }
    private void openNetworkSettings() {
        for (String a : new String[] { Settings.ACTION_WIFI_SETTINGS, Settings.ACTION_WIRELESS_SETTINGS, Settings.ACTION_SETTINGS }) {
            try { startActivity(new Intent(a)); return; } catch (Exception ignored) {}
        }
        showText("The TV's network settings didn't open", 3000);
    }

    // ----- errors -----
    private void liveError(PlaybackException e) {
        classify(e);
        if (!player.getPlayWhenReady()) { droppedWhilePaused = true; return; }   // (review 3, S3-4) a stream dropped while paused waits for Play
        if (e.errorCode == PlaybackException.ERROR_CODE_DECODER_INIT_FAILED && !decoderRetried) {
            // a decoder still held after coming back to the app: once more, 1 s later, before blaming the TV
            decoderRetried = true;
            handler.removeCallbacks(retune);
            handler.postDelayed(retune, 1000);
            return;
        }
        if (rd.http == 404 || rd.http == 410) notFound++;
        Diag.Cause c = Diag.decide(rd, what(), title());
        if (c.fail || ("off".equals(c.id) && notFound >= 2)) { showFailed(c); return; }
        boolean askAccount = (rd.http == 401 || rd.http == 403) && !apiUrl.isEmpty();
        if (askAccount) {   // a limit needs evidence: the account check says which (C7b, C7, C7c)
            cause = null;
            if (!cardUp && open == null) showCause(Diag.checking(rd, what()));
            cancelChecks();
            runChecks(false);
        } else if (c.certain) { if (open == null || cardUp) showCause(c); }
        else {
            if (!cardUp && open == null) showCause(cause != null && !"good".equals(cause.id) ? cause : Diag.checking(rd, what()));
            if (!checkRunning) runChecks(false);
        }
        reconnect();
    }
    private void classify(PlaybackException e) {
        rd.clearError();
        rd.redirected = streamRedirected;
        String ct = streamType == null ? "" : streamType.toLowerCase(Locale.ROOT);
        switch (e.errorCode) {
            case PlaybackException.ERROR_CODE_DECODING_FORMAT_EXCEEDS_CAPABILITIES:
            case PlaybackException.ERROR_CODE_DECODING_FORMAT_UNSUPPORTED: rd.decoder = 1; break;
            case PlaybackException.ERROR_CODE_DECODER_INIT_FAILED: if (decoderRetried) rd.decoder = 1; break;
            case PlaybackException.ERROR_CODE_DECODING_FAILED: if (++broken >= 2) rd.decoder = 2; break;
            case PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT: rd.timedOut = true; break;
            case PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED:
            case PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED: if (ct.contains("html")) { rd.http = 200; rd.htmlBody = true; } break;
        }
        for (Throwable t = e.getCause(); t != null; t = t.getCause()) {
            if (t instanceof HttpDataSource.InvalidResponseCodeException) {
                HttpDataSource.InvalidResponseCodeException x = (HttpDataSource.InvalidResponseCodeException) t;
                rd.http = x.responseCode;
                byte[] body = x.responseBody;
                String s = body == null ? "" : new String(body, 0, Math.min(2048, body.length), java.nio.charset.StandardCharsets.UTF_8).toLowerCase(Locale.ROOT);
                rd.limitBody = s.matches("(?s).*(connection|max.?con|too many|stream limit|limit reached).*");
                rd.htmlBody = s.contains("<html") || s.contains("<!doctype");
            }
            if (t instanceof java.net.UnknownHostException) rd.noHost = true;
            if (t instanceof java.net.SocketTimeoutException) rd.timedOut = true;
        }
    }
    private void resumeDropped() {
        droppedWhilePaused = false;
        showText("Back to live: the stream was dropped while paused", 2500);
        retries = 0;
        tryNow();   // (a reconnect starts at the live edge, so the lag starts again from there)
    }
    private void resetDiag() {
        cancelChecks();
        hideCard(false);
        if (chipUp && chipKind == CHIP_STUTTER) hideChip();
        if (puck != null) puck.setVisibility(View.GONE);
        cause = null; pendingId = null; forced = false;
        stallStart = 0; notRec = 0; versionsAsked = false; stallSlowStart = false;
        reconnecting = false; droppedWhilePaused = false; decoderRetried = false;
        limitTries = 0; notFound = 0; broken = 0; nextTryAt = 0;
        rd.clearError(); rd.host = 0; rd.frames = false; rd.need = 0; rd.arrival = -1; rd.refill = -1; rd.height = 0; rd.pauses5m = 0;
        needAt = 0; needMeasured = 0; aheadN = 0; stalls.clear();
        streamUri = null; streamRedirected = false; streamType = "";
        handler.removeCallbacks(retune);
    }

    // ----- the network (S8): the offline chip, the card, and one re-tune once it has been back for 2 s -----
    private ConnectivityManager.NetworkCallback netCb;
    private void watchNetwork() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (cm == null) return;
        readNetwork();
        netCb = new ConnectivityManager.NetworkCallback() {
            @Override public void onLost(@NonNull Network n) { handler.post(PlayerActivity.this::netLost); }
            @Override public void onCapabilitiesChanged(@NonNull Network n, @NonNull NetworkCapabilities c) {
                handler.post(() -> {
                    rd.connected = true;
                    caps(c);
                    if (rd.validated) { handler.removeCallbacks(netBack); handler.postDelayed(netBack, 2000); }
                });
            }
            @Override public void onLinkPropertiesChanged(@NonNull Network n, @NonNull LinkProperties lp) { handler.post(() -> gateway(lp)); }
        };
        try { cm.registerDefaultNetworkCallback(netCb); } catch (Exception e) { netCb = null; }
    }
    private void readNetwork() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            Network n = cm.getActiveNetwork();
            rd.connected = n != null;
            NetworkCapabilities nc = n == null ? null : cm.getNetworkCapabilities(n);
            if (nc != null) caps(nc);
            LinkProperties lp = n == null ? null : cm.getLinkProperties(n);
            if (lp != null) gateway(lp);
        } catch (Exception ignored) {}
    }
    private void caps(NetworkCapabilities c) {
        rd.wifi = c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
        rd.cable = c.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET);
        rd.validated = c.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
        rd.captive = c.hasCapability(NetworkCapabilities.NET_CAPABILITY_CAPTIVE_PORTAL);
    }
    private void gateway(LinkProperties lp) {
        for (RouteInfo r : lp.getRoutes()) if (r.isDefaultRoute() && r.getGateway() != null && !r.getGateway().isAnyLocalAddress()) { rd.gateway = r.getGateway().getHostAddress(); return; }
    }
    private void netLost() {
        if (forced || isFinishing()) return;
        rd.connected = false;
        rd.validated = false;
        wasOffline = true;
        if (!played || cur == null) return;
        if (player.isPlaying()) showOfflineChip();   // picture still in hand (S15)
        else if (open == null) showCause(Diag.decide(rd, what(), title()));
    }
    private final Runnable netBack = () -> {
        if (!rd.validated || !rd.connected || forced || isFinishing()) return;
        if (stopped) { netBackPending = true; return; }   // nothing re-tunes until airglow is back in front
        if (chipUp && chipKind == CHIP_OFFLINE) hideChip();
        if (rp != null) { hideCard(false); rp.netBack(); return; }
        boolean outage = cause != null && ("offline".equals(cause.id) || "no-internet".equals(cause.id) || "no-router".equals(cause.id) || "wifi-gone".equals(cause.id));
        boolean stuck = outage || (wasOffline && (reconnecting || rd.stalled || open instanceof FailedCard));
        wasOffline = false;
        long now = SystemClock.uptimeMillis();
        if (!live || !stuck || now - lastNetTune < 10000) return;   // at most once per 10 s
        lastNetTune = now;
        if (open instanceof FailedCard) closeOverlay();
        retries = 0;
        tryNow();
    };

    // ----- chips (3.4) -----
    private void showOfflineChip() {
        if (!live || open != null || (chipUp && chipKind == CHIP_TEAM)) return;
        chipKind = CHIP_OFFLINE;
        chipIsUpNext = false;
        chipStyle(false, false);
        chipTitle.setText(rd.cable ? "The network dropped" : "The Wi-Fi dropped");
        chipSub.setText("Playing what's loaded");
        chipUp = true;
        chip.setVisibility(View.VISIBLE);
        handler.removeCallbacks(chipTick);
        hintsChanged();
        emitDiag(Diag.decide(rd, what(), title()), "chip");
    }
    private void showStutter(Diag.Cause c) {
        if (!live || open != null || cardUp || cur == null) return;
        if (chipUp && chipKind == CHIP_TEAM) { waitingStutter = c; waitingStutterAt = SystemClock.uptimeMillis(); return; }
        String[] a = null;
        for (String k : c.actions.length > 0 ? c.actions : new String[] { "feed", "copy" }) { a = action(k); if (a != null) break; }
        chipKind = CHIP_STUTTER;
        chipIsUpNext = false;
        chipStyle(true, a != null);
        chipTitle.setText("This keeps pausing");
        chipSub.setText(c.chip);
        chipAct = a == null ? "" : a[0];
        chipRun = a == null ? null : runOf(a);
        chipOk.setText(a == null ? "" : shortLabel(a));
        chipUntil = SystemClock.uptimeMillis() + 8000;
        chipUp = true;
        chip.setVisibility(View.VISIBLE);
        handler.removeCallbacks(chipTick);
        handler.post(chipTick);
        hintsChanged();
        emitDiag(c, "chip");
    }

    // ----- Options > Connection (6, 7) -----
    /** What the readings say now: the card's cause; while it plays, All good unless a fresh check says otherwise. */
    private Diag.Cause current() {
        if (cardUp && cause != null) return cause;
        if (!rd.connected) return Diag.decide(rd, what(), title());
        boolean fresh = rd.checkedAt > 0 && System.currentTimeMillis() - rd.checkedAt < 60000;
        if (rd.stalled && !fresh) return Diag.checking(rd, what());
        if (!fresh && (rd.playing || rd.frames)) return Diag.good(rd, what());
        if (!fresh) return Diag.checking(rd, what());
        return Diag.decide(rd, what(), title());
    }
    private ListPanel.Item connectionRow() {
        Diag.Cause c = current();
        return row("Connection", c.brief, c.verdict, "signal", this::openConnection);
    }
    private void openConnection() {
        Diag.Cause c = current();
        ListPanel p = new ListPanel(this, "Connection", true, 400);
        LinearLayout ex = new LinearLayout(this);
        ex.setOrientation(LinearLayout.VERTICAL);
        connTitle = Ui.line(this, "", 18, Ui.T1, Ui.outfit700);
        Ui.lineHeight(connTitle, 24);
        connTitle.setPadding(Ui.dp(10), Ui.dp(2), Ui.dp(10), 0);
        connLine = Ui.text(this, "", 14, Ui.T2, Ui.inter500);
        connLine.setMaxLines(2);
        connLine.setEllipsize(android.text.TextUtils.TruncateAt.END);
        connLine.setPadding(Ui.dp(10), Ui.dp(2), Ui.dp(10), Ui.dp(8));
        connPath = new PathView(this, true, 44);
        View sep = new View(this);
        sep.setBackgroundColor(Ui.BORDER);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(-1, Math.max(1, Ui.dp(1)));
        sp.topMargin = Ui.dp(4);
        sp.bottomMargin = Ui.dp(2);
        ex.addView(connTitle);
        ex.addView(connLine);
        ex.addView(connPath, new LinearLayout.LayoutParams(-1, -2));
        ex.addView(sep, sp);
        int lines = connLine.getPaint().measureText(c.line) > Ui.dp(360) ? 2 : 1;
        p.setExtra(ex, 26 + 18 * lines + 10 + 220 + 7);
        List<ListPanel.Item> items = new ArrayList<>();
        for (String[] a : actions(c, 3)) {
            if ("retry".equals(a[0]) || items.size() >= 1) continue;   // one action, then Check again (the cap is 453)
            ListPanel.Item it = row(a[1], a[2], null, a[3], runOf(a));
            it.height = 50;
            items.add(it);
        }
        ListPanel.Item again = row("Check again", "Includes a 3 s speed test", null, "refresh", () -> { if (forced) return; runChecks(true); fillConnection(); });
        again.height = 50;
        items.add(again);
        p.source(ListPanel.of(items), items.size() - 1);   // always on Check again: a switch is never the default (N-M9)
        p.backTo = this::openOptions;
        p.hintKeys = items.size() > 1 ? new String[][] { { "OK", "Check again" }, { "▲", items.get(0).title }, { "Back", "Close" } }
                : new String[][] { { "OK", "Check again" }, { "Back", "Options" } };
        connPanel = p;
        p.onClosed = () -> { if (connPanel == p) connPanel = null; };
        show(p);
        fillConnection();
        if (SystemClock.uptimeMillis() - lastCheckAt > 60000 && !checkRunning && !forced) runChecks(false);   // the speed test only on Check again
        emitDiag(c, "panel");
    }
    private void fillConnection() {
        if (connPanel == null || connTitle == null) return;
        Diag.Cause c = current();
        connPanel.setCount(checkRunning ? "Checking…" : rd.checkedAt > 0 ? "Checked " + hm(rd.checkedAt) : "Not checked yet");
        connTitle.setText(c.title);
        String l = c.line;
        if (!"good".equals(c.id) && rd.pauses5m >= 2 && l.length() < 40) l += " " + rd.pauses5m + " pauses in 5 min.";
        connLine.setText(l);
        connPath.set(Diag.panelPath(c, rd, Math.round(rd.ahead)));
    }

    private void emitDiag(Diag.Cause c, String surface) {
        JSObject e = event("diag");
        e.put("cause", c.id);
        e.put("title", c.title);
        e.put("line", c.line);
        e.put("surface", surface);
        JSObject r = new JSObject();
        r.put("arrival", Math.round(rd.arrival * 10) / 10.0);
        r.put("need", Math.round(rd.need * 10) / 10.0);
        r.put("bars", rd.bars);
        r.put("internet", rd.inet);
        r.put("host", rd.host);
        r.put("speed", Math.round(rd.speed));
        e.put("readings", r);
        TunerPlayerPlugin.emit(e);
    }

    // ----- the debug intent (SPEC 11.10) -----
    private BroadcastReceiver debug;
    /** Debug builds only: `adb shell am broadcast -a app.tuner.player.DIAG -p app.tuner.player --es diag <cause>` shows
     * that cause's surface from made-up readings, for the emulator test's screenshots. "clear" puts things back. */
    private void debugIntent() {
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) == 0) return;
        debug = new BroadcastReceiver() {
            @Override public void onReceive(Context c, Intent i) {
                String d = i.getStringExtra("diag");
                if (d != null) handler.post(() -> forceDiag(d));
                // (the emulator test: what the subtitles show now, as an event)
                if (i.getStringExtra("subs") != null) handler.post(() -> { JSObject e = event("subs-state"); e.put("state", subs == null ? "none" : subs.describe()); e.put("strip", subs == null ? "" : subs.stripState()); e.put("text", subs == null ? "" : subs.lastText()); e.put("mine", subs == null ? 0 : subs.offsetNow()); TunerPlayerPlugin.emit(e); });
            }
        };
        ContextCompat.registerReceiver(this, debug, new IntentFilter("app.tuner.player.DIAG"), ContextCompat.RECEIVER_EXPORTED);
    }
    private void forceDiag(String name) {
        if (isFinishing() || player == null) return;
        if ("clear".equals(name)) {
            forced = false;
            hideCard(false);
            if (chipUp) hideChip();
            if (open != null) closeOverlay();
            puck.setVisibility(View.GONE);
            cause = null;
            // the made-up readings go: back to what the network and the next checks say
            rd.clearError(); rd.inet = 0; rd.host = 0; rd.acct = 0; rd.router = 0; rd.speedState = 0; rd.speed = -1; rd.checkedAt = 0; rd.bars = 0; rd.link = rd.linkMax = 0;
            readNetwork();
            return;
        }
        cancelChecks();
        forced = true;
        boolean fail = name.startsWith("fail-");
        String n = fail ? name.substring(5) : name;
        fake(rd, n);
        if (open != null) closeOverlay();
        if (chipUp) hideChip();
        hideCard(false);
        cause = null;
        hiddenUntil.clear();
        switch (n) {
            case "puck": puck.set(0.62f); puck.setVisibility(View.VISIBLE); return;
            case "checking": showCause(Diag.checking(rd, what())); return;
            case "offline-chip": showOfflineChip(); return;
            case "stutter": tunedAt = SystemClock.uptimeMillis() - 60000; showStutter(Diag.decide(rd, what(), title())); return;
            case "panel": openConnection(); return;
            case "options": showCause(Diag.decide(rd, what(), title())); optOrder = 1; openOptions(); return;
        }
        Diag.Cause c = Diag.decide(rd, what(), title());
        if (fail || c.fail) showFailed(c); else showCause(c);
    }
    /** Readings that lead to each cause (the scenarios of the mocks). */
    private static void fake(Diag.Readings f, String n) {
        long now = SystemClock.uptimeMillis();
        f.connected = true; f.wifi = true; f.cable = false; f.validated = true; f.captive = false;
        f.rssi = -60; f.bars = 3; f.link = 300; f.linkMax = 300;
        f.inet = 204; f.inetMs = 38; f.host = 1; f.hostMs = 90; f.hostOkAt = now; f.acct = 1; f.acctMs = 120;
        f.status = "Active"; f.exp = System.currentTimeMillis() / 1000 + 23 * 86400; f.active = 1; f.max = 2; f.router = 1;
        f.speed = 64; f.speedFull = true; f.speedState = 1; f.speedAt = now; f.checkedAt = System.currentTimeMillis();
        f.arrival = 9; f.need = 9; f.needAbout = true; f.ahead = 1; f.refill = 0.3; f.stalled = true; f.playing = false; f.frames = true;
        f.clearError(); f.redirected = false; f.height = 1080; f.fps = 50; f.pauses5m = 0;
        switch (n) {
            case "wifi": f.bars = 1; f.link = f.linkMax = 26; f.speed = 10; f.arrival = 4; f.need = 12; break;
            case "wifi-gone": f.bars = 1; f.link = f.linkMax = 6; f.inet = -1; f.host = -1; break;
            case "internet-slow": f.wifi = false; f.cable = true; f.bars = 0; f.height = 2160; f.need = 25; f.speed = 8; f.arrival = 3; f.speedFull = false; break;
            case "home-slow": f.bars = 4; f.link = f.linkMax = 30; f.need = 12; f.speed = 3; f.arrival = 2; f.speedFull = false; break;
            case "provider-slow": case "options": f.arrival = 3; break;
            case "panel": f.arrival = 3; f.stalled = false; f.playing = true; f.pauses5m = 3; break;
            case "stutter": f.stalled = false; f.playing = true; f.bars = 2; f.link = f.linkMax = 20; f.need = 9; f.arrival = 4; f.speed = 6; f.speedFull = false; break;
            case "provider-down": f.host = -1; f.hostOkAt = now - 20000; break;
            case "no-internet": f.inet = -1; f.host = -1; f.router = 1; break;
            case "no-router": f.inet = -1; f.host = -1; f.router = -1; break;
            case "offline": f.connected = false; break;
            case "signin": f.inet = 200; break;
            case "limit": f.http = 403; f.active = 2; Diag.closedAt = SystemClock.elapsedRealtime(); break;
            case "ended": f.http = 403; f.status = "Expired"; f.exp = System.currentTimeMillis() / 1000 - 7 * 86400; break;
            case "refused": f.http = 403; f.active = 0; break;
            case "refused-unsure": f.http = 403; f.acct = -1; break;
            case "off": f.http = 404; break;
            case "server-error": f.http = 503; break;
            case "blocked": f.http = 200; f.htmlBody = true; f.acct = 2; break;
            case "not-found": f.host = -2; break;
            case "slow-untested": f.speed = -1; f.speedState = 2; f.arrival = 3; break;
            case "moment": f.refill = 1.0; break;
            case "unknown": f.inet = -1; f.host = 0; f.refill = 1.0; break;
            case "decoder": f.decoder = 1; f.height = 2160; break;
            case "broken": f.decoder = 2; break;
        }
    }

    FrameLayout rootView() { return root; }
    /** The VOD title block's line (SPEC 7.1): "[tick] 4K · HDR10 · Dolby Digital Plus 5.1 • best of 4 copies • Icelandic subtitles". */
    void fillWhat(VodControls v) {
        List<String> parts = new ArrayList<>();
        boolean tick = false;
        JSONObject w = versions != null && cur != null && cur.id.equals(versions.optString("id")) ? versions.optJSONObject("what") : null;
        if (w != null) {
            if (!w.optString("line").isEmpty()) { parts.add(w.optString("line")); tick = w.optBoolean("checked"); }
            if (!w.optString("of").isEmpty()) parts.add(w.optString("of"));
        }
        String st = null;
        if (subs != null && subs.value() != null) st = subs.value() + " subtitles";
        else if (player != null && !player.getTrackSelectionParameters().disabledTrackTypes.contains(C.TRACK_TYPE_TEXT)) {
            for (Tracks.Group g : player.getCurrentTracks().getGroups()) if (g.getType() == C.TRACK_TYPE_TEXT) for (int i = 0; i < g.length; i++) if (g.isTrackSelected(i)) { Format f = g.getTrackFormat(i); if (f.language != null && !"und".equals(f.language)) st = new Locale(f.language).getDisplayLanguage(Locale.ENGLISH) + " subtitles"; }
        }
        if (st != null) parts.add(st);
        if (parts.isEmpty() || w == null && st == null) { v.setWhat(false, null); return; }
        v.setWhat(tick && w != null && !w.optString("line").isEmpty(), android.text.TextUtils.join("  •  ", parts));
    }
    /** The other copies of the film the app sent (Options > Quality), for the Subtitles panel's "Other copies" row. */
    int otherCopies() {
        JSONArray vs = versions != null && cur != null && cur.id.equals(versions.optString("id")) ? versions.optJSONArray("list") : null;
        return vs == null ? 0 : Math.max(0, vs.length() - 1);
    }
    /** "1 has English in its file": the other copies whose check found subtitles in one of his languages. */
    String copiesWithSubs(List<String> langs) {
        JSONArray vs = versions != null && cur != null && cur.id.equals(versions.optString("id")) ? versions.optJSONArray("list") : null;
        if (vs == null) return null;
        Map<String, Integer> n = new java.util.LinkedHashMap<>();
        for (int i = 0; i < vs.length(); i++) {
            JSONObject o = vs.optJSONObject(i);
            if (o == null || o.optString("id").equals(cur.id)) continue;
            JSONArray in = o.optJSONArray("inFile");
            for (int k = 0; in != null && k < in.length(); k++) { String l = in.optString(k); if (langs.contains(Subs.codeOf(l))) { n.merge(l, 1, Integer::sum); break; } }
        }
        if (n.isEmpty()) return null;
        Map.Entry<String, Integer> e = n.entrySet().iterator().next();
        return e.getValue() + (e.getValue() == 1 ? " has " : " have ") + e.getKey() + " in its file";
    }

    JSObject event(String type) {
        JSObject e = new JSObject();
        e.put("type", type);
        e.put("session", session);
        e.put("index", index);
        e.put("id", cur == null ? "" : cur.id);
        return e;
    }
}
