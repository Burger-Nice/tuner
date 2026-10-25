package app.tuner.player;

import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.SpannableStringBuilder;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.text.style.RelativeSizeSpan;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.accessibility.CaptioningManager;
import android.text.TextUtils;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TableLayout;
import android.widget.TableRow;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Format;
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

import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Full-screen player for live TV and movies, built on Media3 (ExoPlayer).
 * Live: up/down and channel keys zap, number keys jump to a channel, OK shows channel info and, on an NBA game,
 * the score and box score at the side; left/right open the options (subtitles, audio, syncing the score).
 * Movies and episodes: the standard seek controls, resume position, the next episode plays on its own, and down
 * opens subtitles and audio. The subtitle choice is remembered for everything you watch.
 */
public class PlayerActivity extends AppCompatActivity {
    static PlayerActivity current;
    /** Set just before this activity starts, so MainActivity keeps the app's JavaScript running underneath. */
    static boolean launching;

    private ExoPlayer player;
    private PlayerView view;
    private TextView osd, message, digitsView;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private String[] urls, titles;
    private int[] nums;
    private long[] starts;
    private boolean live;
    private int session, index;
    private boolean played, exited;
    private String error;
    private String digits = "";
    private String quality = "";
    private int textTracks, audioTracks;
    private SharedPreferences prefs;
    private AlertDialog menu;
    private boolean gameLinked;
    private LinearLayout stats;
    private JSONObject statsData;
    private int statsTeam;

    private final Runnable hideOsd = () -> osd.setVisibility(View.GONE);
    private final Runnable hideMessage = () -> message.setVisibility(View.GONE);
    private final Runnable jump = this::jumpToTypedChannel;
    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (player != null && !live) {
                long d = player.getDuration();
                if (d != C.TIME_UNSET && d > 0) {
                    JSObject e = event("progress");
                    e.put("t", player.getCurrentPosition() / 1000.0);
                    e.put("d", d / 1000.0);
                    TunerPlayerPlugin.emit(e);
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
        if (x == null || list == null) { finish(); return; }
        urls = list.urls;
        titles = list.titles;
        nums = list.nums;
        starts = list.starts;
        prefs = getSharedPreferences("player", MODE_PRIVATE);
        live = "live".equals(x.getString("mode"));
        session = x.getInt("session");
        index = Math.max(0, Math.min(urls.length - 1, x.getInt("index")));
        String ua = x.getString("ua", "");

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.hide(WindowInsetsCompat.Type.systemBars());
        bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        view = new PlayerView(this);
        view.setUseController(!live);
        view.setShowNextButton(!live && urls.length > 1);
        view.setShowPreviousButton(false);
        view.setShowSubtitleButton(true);
        // The controls come up when asked for (up/OK), so down always reaches subtitles & audio.
        view.setControllerAutoShow(false);
        view.setKeepScreenOn(true);
        styleSubtitles(view.getSubtitleView());
        view.setResizeMode(resizeMode(prefs.getString("picture", "fit")));
        root.addView(view, new FrameLayout.LayoutParams(-1, -1));
        osd = label(26, Gravity.TOP | Gravity.START);
        message = label(24, Gravity.TOP | Gravity.END);
        digitsView = label(40, Gravity.TOP | Gravity.END);
        digitsView.setTextColor(0xFF43D39E);
        root.addView(osd);
        root.addView(message);
        root.addView(digitsView);
        setContentView(root);

        DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory()
                .setAllowCrossProtocolRedirects(true)
                .setConnectTimeoutMs(15000)
                .setReadTimeoutMs(live ? 8000 : 20000);
        if (!ua.isEmpty()) http.setUserAgent(ua);
        DefaultRenderersFactory renderers = new DefaultRenderersFactory(this).setEnableDecoderFallback(true);
        // Live: a short, steady buffer (quick to start, rebuffers rarely) capped in memory; movies get more room.
        DefaultLoadControl load = new DefaultLoadControl.Builder()
                .setBufferDurationsMs(live ? 10000 : 15000, live ? 30000 : 50000, 2500, 5000)
                .setTargetBufferBytes((live ? 64 : 96) << 20)
                .setPrioritizeTimeOverSizeThresholds(false)
                .build();
        player = new ExoPlayer.Builder(this, renderers)
                .setMediaSourceFactory(new DefaultMediaSourceFactory(this).setDataSourceFactory(http))
                .setLoadControl(load)
                .build();
        view.setShowBuffering(PlayerView.SHOW_BUFFERING_ALWAYS);
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
                if (s == Player.STATE_READY) { played = true; error = null; retries = 0; if (message.getText().toString().startsWith("Reconnecting")) message.setVisibility(View.GONE); }
                if (s == Player.STATE_ENDED && !live && !player.hasNextMediaItem()) finish();
                // A live stream the server closed, or one stuck buffering: reconnect instead of freezing.
                if (live && s == Player.STATE_ENDED) reconnect();
                if (live && s == Player.STATE_BUFFERING && played) handler.postDelayed(stall, 12000);
            }
            @Override public void onPlayerError(@NonNull PlaybackException e) {
                if (live && e.errorCode == PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW) { player.seekToDefaultPosition(); player.prepare(); return; }
                if (live && retries < 6 && e.errorCode != PlaybackException.ERROR_CODE_DECODING_FORMAT_EXCEEDS_CAPABILITIES
                        && e.errorCode != PlaybackException.ERROR_CODE_DECODER_INIT_FAILED) { reconnect(); return; }
                error = errorText(e);
                showText(error, 6000);
                JSObject ev = event("failed");
                ev.put("error", error);
                TunerPlayerPlugin.emit(ev);
            }
            @Override public void onTracksChanged(@NonNull Tracks tracks) {
                textTracks = count(tracks, C.TRACK_TYPE_TEXT);
                audioTracks = count(tracks, C.TRACK_TYPE_AUDIO);
                if (osd.getVisibility() == View.VISIBLE) showOsd();
            }
            @Override public void onVideoSizeChanged(@NonNull VideoSize size) {
                quality = qualityLabel(size.height, player.getVideoFormat());
                if (osd.getVisibility() == View.VISIBLE) showOsd();
            }
            @Override public void onMediaItemTransition(MediaItem item, int reason) {
                if (live) return;
                index = player.getCurrentMediaItemIndex();
                if (reason == Player.MEDIA_ITEM_TRANSITION_REASON_AUTO && starts[index] > 30) player.seekTo(starts[index] * 1000);
                showOsd();
                TunerPlayerPlugin.emit(event("track"));
            }
        });
        view.setPlayer(player);

        if (live) {
            tuneTo(index);
        } else {
            List<MediaItem> items = new ArrayList<>();
            for (int i = 0; i < urls.length; i++) items.add(item(i));
            player.setMediaItems(items, index, starts[index] > 30 ? starts[index] * 1000 : 0);
            player.prepare();
            player.play();
            showOsd();
            TunerPlayerPlugin.emit(event("track"));
            handler.post(tick);
        }
    }

    private MediaItem item(int i) {
        MediaItem.Builder b = new MediaItem.Builder()
                .setUri(Uri.parse(urls[i]))
                .setMediaMetadata(new MediaMetadata.Builder().setTitle(titles[i]).build());
        String u = urls[i].toLowerCase().split("\\?")[0];
        if (u.endsWith(".m3u8")) b.setMimeType(MimeTypes.APPLICATION_M3U8);
        else if (u.endsWith(".ts")) b.setMimeType(MimeTypes.VIDEO_MP2T);
        return b.build();
    }

    private int retries, lastIndex = -1;
    private long stoppedAt;
    private boolean longOk;
    private final Runnable stall = this::reconnect;
    private final Runnable retune = () -> { if (player != null) { player.setMediaItem(item(index)); player.prepare(); player.play(); } };
    private final Runnable doTune = () -> { if (player != null) { player.setMediaItem(item(index)); player.prepare(); player.play(); TunerPlayerPlugin.emit(event("track")); } };

    /** Reconnects the live channel with growing waits (1, 2, 4 … seconds), up to six times. */
    private void reconnect() {
        if (player == null || isFinishing()) return;
        if (retries >= 6) { error = "This channel stopped. Press OK on it in the guide to try again."; showText(error, 8000); return; }
        long wait = 1000L << Math.min(retries, 4);
        retries++;
        showText("Reconnecting…", (int) wait + 4000);
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

    /** Zapping: the banner changes at once; holding the button only connects to where you stop. */
    private void zap(int i, boolean repeat) {
        if (index != ((i + urls.length) % urls.length) && !repeat) lastIndex = index;
        index = (i + urls.length) % urls.length;
        error = null; quality = ""; textTracks = audioTracks = 0; retries = 0;
        message.setVisibility(View.GONE);
        showOsd();
        handler.removeCallbacks(doTune);
        handler.postDelayed(doTune, repeat ? 450 : 0);
    }

    private void tuneTo(int i) {
        if (index != ((i + urls.length) % urls.length)) lastIndex = index;
        index = (i + urls.length) % urls.length;
        retries = 0;
        error = null;
        quality = "";
        textTracks = audioTracks = 0;
        message.setVisibility(View.GONE);
        player.setMediaItem(item(index));
        player.prepare();
        player.play();
        showOsd();
        TunerPlayerPlugin.emit(event("track"));
    }

    private void jumpToTypedChannel() {
        String typed = digits;
        digits = "";
        digitsView.setVisibility(View.GONE);
        int n;
        try { n = Integer.parseInt(typed); } catch (NumberFormatException e) { return; }
        for (int i = 0; i < nums.length; i++) if (nums[i] == n) { tuneTo(i); return; }
        showText("There is no channel " + n, 3000);
    }

    private void showOsd() {
        // Live titles already start with the channel number.
        SpannableStringBuilder t = new SpannableStringBuilder(titles[index]);
        if (!quality.isEmpty()) t.append("   ·   ").append(quality);
        if (textTracks > 0) t.append("   ·   CC");
        String hint = live && gameLinked ? "OK  Score & stats      Hold OK  Last channel      ←/→  Options"
                : live ? "Hold OK  Last channel      ←/→  Options" : "↓  Subtitles & picture";
        if (!hint.isEmpty()) {
            int from = t.length();
            t.append("\n").append(hint);
            t.setSpan(new RelativeSizeSpan(0.62f), from, t.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            t.setSpan(new ForegroundColorSpan(0xB3FFFFFF), from, t.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        }
        osd.setText(t);
        osd.setVisibility(View.VISIBLE);
        handler.removeCallbacks(hideOsd);
        handler.postDelayed(hideOsd, 4000);
    }

    /** Called by the app (score updates and messages). */
    void showText(String text, int ms) {
        message.setText(text);
        message.setVisibility(View.VISIBLE);
        handler.removeCallbacks(hideMessage);
        handler.postDelayed(hideMessage, ms);
    }

    /**
     * Movies and episodes: the player's own view takes the arrow keys to bring up its controls, so while the
     * controls are hidden, left/right (seek) and down (subtitles & audio) are caught here first.
     */
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        if (!live && view != null && player != null && !view.isControllerFullyVisible()
                && (code == KeyEvent.KEYCODE_DPAD_LEFT || code == KeyEvent.KEYCODE_DPAD_RIGHT || code == KeyEvent.KEYCODE_DPAD_DOWN)) {
            if (e.getAction() == KeyEvent.ACTION_DOWN) {
                if (code == KeyEvent.KEYCODE_DPAD_DOWN) { if (e.getRepeatCount() == 0) openOptions(); }
                else {
                    long to = player.getCurrentPosition() + (code == KeyEvent.KEYCODE_DPAD_LEFT ? -10000 : 10000);
                    player.seekTo(Math.max(0, to));
                    showText(code == KeyEvent.KEYCODE_DPAD_LEFT ? "−10s" : "+10s", 900);
                }
            }
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    @Override
    public boolean onKeyDown(int code, KeyEvent e) {
        if (stats != null && stats.getVisibility() == View.VISIBLE) {
            switch (code) {
                case KeyEvent.KEYCODE_BACK: case KeyEvent.KEYCODE_ESCAPE: case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER:
                    hideStats(true); longOk = true; return true; // the release mustn't reopen it
                case KeyEvent.KEYCODE_DPAD_LEFT: case KeyEvent.KEYCODE_DPAD_RIGHT:
                    statsTeam ^= 1; renderStats(); return true;
            }
        }
        if (code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) { finish(); return true; }
        if (code == KeyEvent.KEYCODE_CAPTIONS) { openTrackMenu(); return true; }
        if (code == KeyEvent.KEYCODE_MENU) { openOptions(); return true; }
        if (live) {
            switch (code) {
                case KeyEvent.KEYCODE_DPAD_LEFT: case KeyEvent.KEYCODE_DPAD_RIGHT: openOptions(); return true;
                // Up and CH+ both go to the next channel, down and CH- to the previous one.
                case KeyEvent.KEYCODE_DPAD_UP: case KeyEvent.KEYCODE_CHANNEL_UP: case KeyEvent.KEYCODE_PAGE_UP: zap(index + 1, e.getRepeatCount() > 0); return true;
                case KeyEvent.KEYCODE_DPAD_DOWN: case KeyEvent.KEYCODE_CHANNEL_DOWN: case KeyEvent.KEYCODE_PAGE_DOWN: zap(index - 1, e.getRepeatCount() > 0); return true;
                case KeyEvent.KEYCODE_LAST_CHANNEL: lastChannel(); return true;
                case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER:
                    // A short press is handled on release; holding OK jumps back to the last channel.
                    if (e.getRepeatCount() == 0) { e.startTracking(); longOk = false; }
                    return true;
                case KeyEvent.KEYCODE_INFO: case KeyEvent.KEYCODE_GUIDE: case KeyEvent.KEYCODE_G:
                    showOsd();
                    TunerPlayerPlugin.emit(event("game"));
                    return true;
                case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE: case KeyEvent.KEYCODE_SPACE:
                    if (player.isPlaying()) player.pause(); else player.play();
                    return true;
                default:
                    if (code >= KeyEvent.KEYCODE_0 && code <= KeyEvent.KEYCODE_9) {
                        digits = (digits + (code - KeyEvent.KEYCODE_0));
                        if (digits.length() > 5) digits = digits.substring(digits.length() - 5);
                        digitsView.setText(digits);
                        digitsView.setVisibility(View.VISIBLE);
                        handler.removeCallbacks(jump);
                        handler.postDelayed(jump, 1300);
                        return true;
                    }
            }
        } else if (!view.isControllerFullyVisible()) {
            // Up or OK brings up the controls (left/right/down are handled in dispatchKeyEvent).
            if (code == KeyEvent.KEYCODE_DPAD_CENTER || code == KeyEvent.KEYCODE_ENTER || code == KeyEvent.KEYCODE_DPAD_UP) { view.showController(); return true; }
        }
        return super.onKeyDown(code, e);
    }

    // ---------- options (live) ----------

    /**
     * Left/right on live TV, down in movies: on an NBA game the box score and syncing the score to the stream,
     * then subtitles, audio and the picture size.
     */
    private void openOptions() {
        if (player == null || isFinishing() || (menu != null && menu.isShowing())) return;
        long seenAt = System.currentTimeMillis();
        List<String> labels = new ArrayList<>();
        List<Runnable> acts = new ArrayList<>();
        if (gameLinked) {
            labels.add("Score & box score");
            acts.add(() -> TunerPlayerPlugin.emit(event("game")));
            labels.add("Sync the score to this stream");
            acts.add(() -> { JSObject ev = event("sync-start"); ev.put("seenAt", seenAt); TunerPlayerPlugin.emit(ev); });
        }
        if (live && lastIndex >= 0 && lastIndex < urls.length && lastIndex != index) { labels.add("Last channel · " + titles[lastIndex]); acts.add(this::lastChannel); }
        if (textTracks > 0) { labels.add("Subtitles"); acts.add(this::openTrackMenu); }
        if (audioTracks > 1) { labels.add("Audio track"); acts.add(() -> openAudioMenu("Audio")); }
        labels.add("Picture size · " + PICTURE_NAMES[pictureIndex()]);
        acts.add(this::openPictureMenu);
        menu = new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
                .setTitle(titles[index])
                .setItems(labels.toArray(new String[0]), (dlg, which) -> { dlg.dismiss(); acts.get(which).run(); })
                .show();
    }

    // Fit shows the whole picture (bars where the film is wider or narrower than the TV), Zoom fills the screen
    // and trims the edges, Stretch fills it by stretching.
    private static final String[] PICTURES = { "fit", "zoom", "stretch" };
    private static final String[] PICTURE_NAMES = { "Fit", "Zoom", "Stretch" };
    private static int resizeMode(String p) {
        return "zoom".equals(p) ? AspectRatioFrameLayout.RESIZE_MODE_ZOOM : "stretch".equals(p) ? AspectRatioFrameLayout.RESIZE_MODE_FILL : AspectRatioFrameLayout.RESIZE_MODE_FIT;
    }
    private int pictureIndex() {
        String p = prefs.getString("picture", "fit");
        for (int i = 0; i < PICTURES.length; i++) if (PICTURES[i].equals(p)) return i;
        return 0;
    }
    private void openPictureMenu() {
        String[] labels = { "Fit · the whole picture", "Zoom · fill the screen, trim the edges", "Stretch · fill the screen" };
        menu = new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
                .setTitle("Picture size")
                .setSingleChoiceItems(labels, pictureIndex(), (dlg, which) -> {
                    prefs.edit().putString("picture", PICTURES[which]).apply();
                    view.setResizeMode(resizeMode(PICTURES[which]));
                    showText("Picture: " + PICTURE_NAMES[which], 1500);
                    dlg.dismiss();
                })
                .show();
    }

    /** The app's answer to "Sync the score": the latest baskets, to pick the one just seen on screen. */
    void askSync(String json) {
        try {
            JSONObject d = new JSONObject(json);
            JSONArray plays = d.getJSONArray("plays");
            long seenAt = d.getLong("seenAt");
            String[] labels = new String[plays.length()];
            long[] at = new long[plays.length()];
            for (int i = 0; i < plays.length(); i++) { labels[i] = plays.getJSONObject(i).getString("label"); at[i] = plays.getJSONObject(i).getLong("at"); }
            if (menu != null) menu.dismiss();
            menu = new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
                    .setTitle("Which basket did you just see?")
                    .setItems(labels, (dlg, which) -> {
                        JSObject ev = event("sync");
                        ev.put("at", at[which]);
                        ev.put("seenAt", seenAt);
                        TunerPlayerPlugin.emit(ev);
                    })
                    .show();
        } catch (Exception ignored) {}
    }

    void setGameLinked(boolean on) {
        gameLinked = on;
        if (osd.getVisibility() == View.VISIBLE) showOsd();
    }

    // ---------- NBA score & box score at the side ----------

    /** Shows or refreshes the panel with data from the app; empty data closes it. */
    void showStats(String json) {
        if (json == null || json.isEmpty()) { hideStats(false); return; }
        try { statsData = new JSONObject(json); } catch (Exception e) { return; }
        if (stats == null) {
            stats = new LinearLayout(this);
            stats.setOrientation(LinearLayout.VERTICAL);
            int p = dp(20);
            stats.setPadding(p, p, p, p);
            GradientDrawable bg = new GradientDrawable();
            bg.setColor(0xEB0B0D11);
            bg.setCornerRadius(dp(20));
            stats.setBackground(bg);
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(dp(400), -2, Gravity.END | Gravity.CENTER_VERTICAL);
            lp.setMargins(dp(28), dp(28), dp(28), dp(28));
            ((FrameLayout) view.getParent()).addView(stats, lp);
        }
        if (stats.getVisibility() != View.VISIBLE) statsTeam = statsData.optInt("first", 0);
        stats.setVisibility(View.VISIBLE);
        osd.setVisibility(View.GONE);
        message.setVisibility(View.GONE);
        renderStats();
    }

    private void hideStats(boolean tellApp) {
        if (stats == null || stats.getVisibility() != View.VISIBLE) return;
        stats.setVisibility(View.GONE);
        if (tellApp) TunerPlayerPlugin.emit(event("stats-closed"));
    }

    private void renderStats() {
        if (stats == null || statsData == null) return;
        stats.removeAllViews();
        JSONObject d = statsData;
        stats.addView(text(d.optString("score"), 23, Color.WHITE, true));
        String note = d.optString("note");
        if (!note.isEmpty()) stats.addView(text(note, 13, 0x99FFFFFF, false));

        LinearLayout tabs = new LinearLayout(this);
        tabs.setPadding(0, dp(12), 0, dp(8));
        for (int k = 0; k < 2; k++) {
            JSONObject t = d.optJSONObject(k == 0 ? "away" : "home");
            if (t == null) continue;
            TextView tab = text(t.optString("abbr"), 16, k == statsTeam ? Color.WHITE : 0x80FFFFFF, true);
            tab.setPadding(dp(14), dp(5), dp(14), dp(5));
            if (k == statsTeam) {
                GradientDrawable pill = new GradientDrawable();
                pill.setColor(parseColor(t.optString("color"), 0xFF3A3F4B));
                pill.setCornerRadius(dp(99));
                tab.setBackground(pill);
            }
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -2);
            lp.setMarginEnd(dp(8));
            tabs.addView(tab, lp);
        }
        TextView switchHint = text("←/→", 13, 0x80FFFFFF, false);
        switchHint.setPadding(dp(4), dp(6), 0, 0);
        tabs.addView(switchHint);
        stats.addView(tabs);

        JSONObject team = d.optJSONObject(statsTeam == 0 ? "away" : "home");
        JSONArray rows = team == null ? null : team.optJSONArray("rows");
        if (rows == null || rows.length() == 0) {
            stats.addView(text(d.optBoolean("loading") ? "Loading box score…" : "No box score yet. It appears at tip-off.", 14, 0xB3FFFFFF, false));
        } else {
            TableLayout table = new TableLayout(this);
            table.setColumnStretchable(0, true);
            table.setColumnShrinkable(0, true);
            String[] head = { "", "MIN", "PTS", "REB", "AST" };
            table.addView(row(head, 12, 0x80FFFFFF, false));
            for (int i = 0; i < rows.length(); i++) {
                JSONArray r = rows.optJSONArray(i);
                String[] cells = new String[5];
                for (int c = 0; c < 5; c++) cells[c] = r == null ? "" : r.optString(c, "");
                table.addView(row(cells, 15, Color.WHITE, false));
            }
            stats.addView(table);
        }
        TextView foot = text("OK or Back to close", 12, 0x80FFFFFF, false);
        foot.setPadding(0, dp(10), 0, 0);
        stats.addView(foot);
    }

    private TableRow row(String[] cells, int sp, int color, boolean bold) {
        TableRow r = new TableRow(this);
        for (int c = 0; c < cells.length; c++) {
            TextView t = text(cells[c], sp, color, bold);
            t.setPadding(c == 0 ? 0 : dp(12), dp(2), 0, dp(2));
            if (c > 0) { t.setGravity(Gravity.END); t.setFontFeatureSettings("tnum"); }
            else { t.setSingleLine(true); t.setEllipsize(TextUtils.TruncateAt.END); }
            r.addView(t);
        }
        return r;
    }

    private TextView text(String s, int sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextColor(color);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTypeface(bold ? Typeface.create("sans-serif-medium", Typeface.NORMAL) : Typeface.create("sans-serif", Typeface.NORMAL));
        return t;
    }

    private static int parseColor(String c, int fallback) {
        try { return Color.parseColor(c); } catch (Exception e) { return fallback; }
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

    private void openTrackMenu() {
        if (player == null || isFinishing()) return;
        if (menu != null && menu.isShowing()) return;
        Tracks tracks = player.getCurrentTracks();
        boolean off = player.getTrackSelectionParameters().disabledTrackTypes.contains(C.TRACK_TYPE_TEXT);
        List<String> labels = new ArrayList<>();
        List<Runnable> picks = new ArrayList<>();
        labels.add("Off");
        picks.add(() -> pickText(null, 0));
        int checked = 0, n = 0;
        for (Tracks.Group g : tracks.getGroups()) {
            if (g.getType() != C.TRACK_TYPE_TEXT) continue;
            for (int i = 0; i < g.length; i++) {
                if (!g.isTrackSupported(i)) continue;
                labels.add(trackName(g.getTrackFormat(i), ++n));
                final Tracks.Group fg = g;
                final int fi = i;
                picks.add(() -> pickText(fg, fi));
                if (!off && g.isTrackSelected(i)) checked = labels.size() - 1;
            }
        }
        if (n == 0) {
            if (audioTracks > 1) openAudioMenu("Audio · no subtitles here");
            else showText(live ? "This channel has no subtitles" : "This video has no subtitles", 3000);
            return;
        }
        AlertDialog.Builder d = new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
                .setTitle("Subtitles")
                .setSingleChoiceItems(labels.toArray(new String[0]), checked, (dlg, which) -> { picks.get(which).run(); dlg.dismiss(); });
        if (audioTracks > 1) d.setNeutralButton("Audio track", (dlg, w) -> openAudioMenu("Audio"));
        menu = d.show();
    }

    private void openAudioMenu(String title) {
        Tracks tracks = player.getCurrentTracks();
        List<String> labels = new ArrayList<>();
        List<Tracks.Group> groups = new ArrayList<>();
        List<Integer> idx = new ArrayList<>();
        int checked = 0;
        for (Tracks.Group g : tracks.getGroups()) {
            if (g.getType() != C.TRACK_TYPE_AUDIO) continue;
            for (int i = 0; i < g.length; i++) {
                if (!g.isTrackSupported(i)) continue;
                Format f = g.getTrackFormat(i);
                String name = trackName(f, labels.size() + 1);
                if (f.channelCount >= 6) name += " · " + (f.channelCount == 8 ? "7.1" : "5.1");
                labels.add(name);
                groups.add(g);
                idx.add(i);
                if (g.isTrackSelected(i)) checked = labels.size() - 1;
            }
        }
        menu = new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
                .setTitle(title)
                .setSingleChoiceItems(labels.toArray(new String[0]), checked, (dlg, which) -> {
                    Format f = groups.get(which).getTrackFormat(idx.get(which));
                    player.setTrackSelectionParameters(player.getTrackSelectionParameters().buildUpon()
                            .setOverrideForType(new TrackSelectionOverride(groups.get(which).getMediaTrackGroup(), idx.get(which))).build());
                    if (f.language != null) prefs.edit().putString("audio", f.language).apply();
                    dlg.dismiss();
                })
                .show();
    }

    private void pickText(Tracks.Group g, int i) {
        TrackSelectionParameters.Builder b = player.getTrackSelectionParameters().buildUpon().clearOverridesOfType(C.TRACK_TYPE_TEXT);
        if (g == null) {
            b.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true);
            prefs.edit().putString("sub", "off").apply();
            showText("Subtitles off", 1500);
        } else {
            Format f = g.getTrackFormat(i);
            String lang = f.language == null || f.language.isEmpty() ? "und" : f.language;
            b.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false).setOverrideForType(new TrackSelectionOverride(g.getMediaTrackGroup(), i));
            if ("und".equals(lang)) b.setSelectUndeterminedTextLanguage(true); else b.setPreferredTextLanguage(lang);
            prefs.edit().putString("sub", lang).apply();
            showText("Subtitles: " + trackName(f, 1), 1500);
        }
        player.setTrackSelectionParameters(b.build());
    }

    private static String trackName(Format f, int n) {
        String lang = f.language == null || f.language.isEmpty() || "und".equals(f.language) ? null : new Locale(f.language).getDisplayLanguage(Locale.ENGLISH);
        boolean cc = MimeTypes.APPLICATION_CEA608.equals(f.sampleMimeType) || MimeTypes.APPLICATION_CEA708.equals(f.sampleMimeType);
        String name = f.label != null && !f.label.isEmpty() ? f.label : lang != null ? lang : cc ? "Closed captions" : "Track " + n;
        if (lang != null && !name.toLowerCase(Locale.ROOT).contains(lang.toLowerCase(Locale.ROOT))) name += " (" + lang + ")";
        if ((f.selectionFlags & C.SELECTION_FLAG_FORCED) != 0) name += " · forced";
        return name;
    }

    /** Clean white subtitles with a soft outline, unless the TV's own caption style has been set up. */
    private void styleSubtitles(SubtitleView sv) {
        if (sv == null) return;
        CaptioningManager cm = (CaptioningManager) getSystemService(CAPTIONING_SERVICE);
        if (cm != null && cm.isEnabled()) return;
        sv.setStyle(new CaptionStyleCompat(Color.WHITE, Color.TRANSPARENT, Color.TRANSPARENT,
                CaptionStyleCompat.EDGE_TYPE_OUTLINE, 0xE6000000, Typeface.create("sans-serif-medium", Typeface.NORMAL)));
        sv.setFractionalTextSize(SubtitleView.DEFAULT_TEXT_SIZE_FRACTION * 1.1f);
    }

    @Override
    public boolean onKeyLongPress(int code, KeyEvent e) {
        if (live && (code == KeyEvent.KEYCODE_DPAD_CENTER || code == KeyEvent.KEYCODE_ENTER)) { longOk = true; lastChannel(); return true; }
        return super.onKeyLongPress(code, e);
    }

    @Override
    public boolean onKeyUp(int code, KeyEvent e) {
        if (live && (code == KeyEvent.KEYCODE_DPAD_CENTER || code == KeyEvent.KEYCODE_ENTER) && (stats == null || stats.getVisibility() != View.VISIBLE)) {
            if (!longOk && !e.isCanceled()) { showOsd(); TunerPlayerPlugin.emit(event("game")); }
            longOk = false;
            return true;
        }
        return super.onKeyUp(code, e);
    }

    private void lastChannel() {
        if (lastIndex < 0 || lastIndex >= urls.length || lastIndex == index) { showText("No previous channel yet", 2000); return; }
        tuneTo(lastIndex);
    }

    @Override protected void onStop() { super.onStop(); stoppedAt = System.currentTimeMillis(); if (player != null && !isFinishing()) player.pause(); }
    @Override protected void onStart() {
        super.onStart();
        if (player == null) return;
        // Back after a while on live: start from now rather than an old position.
        if (live && stoppedAt > 0 && System.currentTimeMillis() - stoppedAt > 10000) tuneTo(index); else player.play();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (menu != null) menu.dismiss();
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
        if (current == this) current = null;
        super.onDestroy();
    }

    private static String qualityLabel(int h, Format f) {
        if (h <= 0) return "";
        String res = h >= 2000 ? "4K" : h >= 1400 ? "1440p" : h >= 1000 ? "1080p" : h >= 700 ? "720p" : h + "p";
        boolean hdr = f != null && f.colorInfo != null
                && (f.colorInfo.colorTransfer == C.COLOR_TRANSFER_ST2084 || f.colorInfo.colorTransfer == C.COLOR_TRANSFER_HLG);
        return hdr ? res + " HDR" : res;
    }

    private JSObject event(String type) {
        JSObject e = new JSObject();
        e.put("type", type);
        e.put("session", session);
        e.put("index", index);
        return e;
    }

    private TextView label(int sp, int gravity) {
        TextView t = new TextView(this);
        t.setTextColor(Color.WHITE);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        int p = dp(14);
        t.setPadding(p + dp(4), p / 2 + dp(2), p + dp(4), p / 2 + dp(2));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xD90B0D11);
        bg.setCornerRadius(dp(14));
        t.setBackground(bg);
        t.setVisibility(View.GONE);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(-2, -2, gravity);
        lp.setMargins(dp(40), dp(32), dp(40), dp(32));
        t.setLayoutParams(lp);
        return t;
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }
}
