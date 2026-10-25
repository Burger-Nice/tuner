package app.tuner.player;

import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
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
import androidx.media3.common.VideoSize;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.ui.PlayerView;

import com.getcapacitor.JSObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Full-screen player for live TV and movies, built on Media3 (ExoPlayer).
 * Live: up/down and channel keys zap, number keys jump to a channel, OK shows channel info and the NBA score.
 * Movies and episodes: the standard seek controls, resume position, and the next episode plays on its own.
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
        urls = x.getStringArray("urls");
        titles = x.getStringArray("titles");
        nums = x.getIntArray("nums");
        starts = x.getLongArray("starts");
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
        view.setKeepScreenOn(true);
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
                .setReadTimeoutMs(20000);
        if (!ua.isEmpty()) http.setUserAgent(ua);
        DefaultRenderersFactory renderers = new DefaultRenderersFactory(this).setEnableDecoderFallback(true);
        player = new ExoPlayer.Builder(this, renderers)
                .setMediaSourceFactory(new DefaultMediaSourceFactory(this).setDataSourceFactory(http))
                .build();
        player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MOVIE).build(), true);
        // Always the best picture: no capping to the 1080p UI size, and straight to the top quality level.
        // The video plane itself runs at the panel's resolution, so 4K streams play in 4K.
        player.setTrackSelectionParameters(player.getTrackSelectionParameters().buildUpon()
                .clearVideoSizeConstraints()
                .clearViewportSizeConstraints()
                .setForceHighestSupportedBitrate(true)
                .build());
        player.setVideoChangeFrameRateStrategy(C.VIDEO_CHANGE_FRAME_RATE_STRATEGY_ONLY_IF_SEAMLESS);
        player.addListener(new Player.Listener() {
            @Override public void onPlaybackStateChanged(int s) {
                if (s == Player.STATE_READY) { played = true; error = null; }
                if (s == Player.STATE_ENDED && !live && !player.hasNextMediaItem()) finish();
            }
            @Override public void onPlayerError(@NonNull PlaybackException e) {
                error = live ? "This channel is not available right now." : "This video would not play (" + e.getErrorCodeName() + ").";
                showText(error, 6000);
                JSObject ev = event("failed");
                ev.put("error", error);
                TunerPlayerPlugin.emit(ev);
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

    private void tuneTo(int i) {
        index = (i + urls.length) % urls.length;
        error = null;
        quality = "";
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
        osd.setText(quality.isEmpty() ? titles[index] : titles[index] + "   ·   " + quality);
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

    @Override
    public boolean onKeyDown(int code, KeyEvent e) {
        if (code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) { finish(); return true; }
        if (live) {
            switch (code) {
                case KeyEvent.KEYCODE_DPAD_UP: case KeyEvent.KEYCODE_CHANNEL_DOWN: case KeyEvent.KEYCODE_PAGE_UP: tuneTo(index - 1); return true;
                case KeyEvent.KEYCODE_DPAD_DOWN: case KeyEvent.KEYCODE_CHANNEL_UP: case KeyEvent.KEYCODE_PAGE_DOWN: tuneTo(index + 1); return true;
                case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_INFO: case KeyEvent.KEYCODE_GUIDE: case KeyEvent.KEYCODE_G:
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
            // Seek without opening the controls; any other key brings them up.
            if (code == KeyEvent.KEYCODE_DPAD_LEFT) { player.seekTo(Math.max(0, player.getCurrentPosition() - 10000)); showText("−10s", 900); return true; }
            if (code == KeyEvent.KEYCODE_DPAD_RIGHT) { player.seekTo(player.getCurrentPosition() + 10000); showText("+10s", 900); return true; }
            if (code == KeyEvent.KEYCODE_DPAD_CENTER || code == KeyEvent.KEYCODE_ENTER || code == KeyEvent.KEYCODE_DPAD_UP || code == KeyEvent.KEYCODE_DPAD_DOWN) { view.showController(); return true; }
        }
        return super.onKeyDown(code, e);
    }

    @Override protected void onStop() { super.onStop(); if (player != null && !isFinishing()) player.pause(); }
    @Override protected void onStart() { super.onStart(); if (player != null) player.play(); }

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
