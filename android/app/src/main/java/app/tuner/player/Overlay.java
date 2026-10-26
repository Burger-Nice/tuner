package app.tuner.player;

import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;

/**
 * One of the player's panels (channels, groups, options, the game, …). Only one is open at a time; while it is, it gets
 * the remote's keys first, and the hint bar shows its keys instead of the player's.
 */
abstract class Overlay {
    final PlayerActivity a;
    View root;

    Overlay(PlayerActivity a) { this.a = a; }

    /** Key down (repeats included). Return false to let the player handle it. */
    abstract boolean key(int code, boolean repeat);
    /** Back: true when the panel handled it itself (a sub-panel going back to Options); false closes it. */
    boolean back() { return false; }
    void closed() {}
    /** The hint bar while this is open: pairs of key and label. */
    String[][] hints() { return new String[][] { { "▲ ▼", "Move" }, { "OK", "Choose" }, { "Back", "Close" } }; }
    /** Refreshes with new data from the app (meta, game, …). */
    void refresh() {}

    /** Where panels sit: left or right inside the safe area, from y 27, never taller than 453 dp (to y 480). */
    static FrameLayout.LayoutParams side(boolean left, int widthDp) {
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Ui.dp(widthDp), -2, Gravity.TOP | (left ? Gravity.START : Gravity.END));
        lp.setMargins(Ui.dp(48), Ui.dp(27), Ui.dp(48), 0);
        return lp;
    }
    static final int MAX_H = 453;
}
