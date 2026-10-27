package app.tuner.player;

import android.content.Context;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

/**
 * A card at the bottom centre of the picture (design/ui-v1/catchup/SPEC.md 6.7, player-golive, player-connlimit,
 * player-replay-failed, player-firstcheck): a title, a line, something of its own (the programme of the first-replay
 * check), rows (the next source) and a row of pill buttons, the first of which can be the gradient. ▲▼ move between the
 * rows and the buttons, ◀▶ along the buttons, OK chooses, Back runs onBack (closes it when there is none).
 */
final class Card extends Overlay {
    static final class Btn {
        final String text, icon;
        final boolean primary;
        final Runnable ok;
        TextView view;
        Btn(String text, String icon, boolean primary, Runnable ok) { this.text = text; this.icon = icon; this.primary = primary; this.ok = ok; }
    }

    static final int KIND_FAILED = 1, KIND_LIMIT = 2, KIND_ENDED = 3, KIND_GOLIVE = 4, KIND_CHECK = 5;
    int kind;
    final LinearLayout box;
    final TextView title, line;
    private final LinearLayout extra, rowsBox, btnRow;
    private final TextView note;
    private final List<ListPanel.Item> rows = new ArrayList<>();
    private final List<ListPanel.Row> rowViews = new ArrayList<>();
    private final List<Btn> btns = new ArrayList<>();
    private int sel;   // 0 .. rows-1: a row; rows + k: button k
    Runnable onBack;
    String backLabel = "Close";

    Card(PlayerActivity a, int widthDp, int bottomDp, boolean centred) {
        super(a);
        Context c = a;
        box = new LinearLayout(c);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setBackground(Ui.panelBg());
        box.setPadding(Ui.dp(20), Ui.dp(18), Ui.dp(20), Ui.dp(16));
        title = Ui.text(c, "", 20, Ui.T1, Ui.outfit700);
        Ui.lineHeight(title, 26);
        line = Ui.text(c, "", 15, Ui.T2, Ui.inter500);
        line.setLineSpacing(0, 1.15f);
        if (centred) { title.setGravity(Gravity.CENTER_HORIZONTAL); line.setGravity(Gravity.CENTER_HORIZONTAL); }
        box.addView(title, new LinearLayout.LayoutParams(-1, -2));
        LinearLayout.LayoutParams ll = new LinearLayout.LayoutParams(-1, -2);
        ll.topMargin = Ui.dp(4);
        box.addView(line, ll);
        extra = new LinearLayout(c);
        extra.setOrientation(LinearLayout.VERTICAL);
        extra.setVisibility(View.GONE);
        LinearLayout.LayoutParams el = new LinearLayout.LayoutParams(-1, -2);
        el.topMargin = Ui.dp(14);
        box.addView(extra, el);
        rowsBox = new LinearLayout(c);
        rowsBox.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams rl = new LinearLayout.LayoutParams(-1, -2);
        rl.topMargin = Ui.dp(10);
        box.addView(rowsBox, rl);
        LinearLayout foot = new LinearLayout(c);
        foot.setGravity(Gravity.CENTER_VERTICAL | (centred ? Gravity.CENTER_HORIZONTAL : 0));
        btnRow = new LinearLayout(c);
        btnRow.setGravity(Gravity.CENTER_VERTICAL);
        foot.addView(btnRow, new LinearLayout.LayoutParams(centred ? -2 : 0, Ui.dp(48), centred ? 0 : 1));
        note = Ui.text(c, "", 14, Ui.T2, Ui.inter500);
        note.setVisibility(View.GONE);
        foot.addView(note);
        LinearLayout.LayoutParams fl = new LinearLayout.LayoutParams(-1, -2);
        fl.topMargin = Ui.dp(12);
        box.addView(foot, fl);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Ui.dp(widthDp), -2, Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        lp.bottomMargin = Ui.dp(bottomDp);
        box.setLayoutParams(lp);
        root = box;
    }

    Card text(String t, String l) {
        title.setText(t);
        line.setText(l == null ? "" : l);
        line.setVisibility(l == null || l.isEmpty() ? View.GONE : View.VISIBLE);
        return this;
    }
    Card extra(View v) {
        extra.removeAllViews();
        if (v != null) extra.addView(v);
        extra.setVisibility(v == null ? View.GONE : View.VISIBLE);
        return this;
    }
    Card note(String s) { note.setText(s == null ? "" : s); note.setVisibility(s == null || s.isEmpty() ? View.GONE : View.VISIBLE); return this; }
    Card row(ListPanel.Item it) {
        rows.add(it);
        ListPanel.Row r = new ListPanel.Row(a);
        rowViews.add(r);
        rowsBox.addView(r);
        return this;
    }
    Card button(String text, String icon, boolean primary, Runnable ok) {
        Btn b = new Btn(text, icon, primary, ok);
        b.view = Ui.pill(a, text, icon, false);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, Ui.dp(40));
        lp.setMarginEnd(Ui.dp(12));
        btnRow.addView(b.view, lp);
        btns.add(b);
        return this;
    }
    /** Which control is focused when it opens: a row (0 …) or a button (rows + k). */
    Card focus(int i) { sel = i; return this; }
    Card focusButton(int k) { sel = rows.size() + k; return this; }
    String focusedLabel() { return sel < rows.size() ? rows.get(sel).title : sel - rows.size() < btns.size() ? btns.get(sel - rows.size()).text : ""; }

    void render() {
        int n = rows.size() + btns.size();
        if (n > 0) sel = Math.max(0, Math.min(n - 1, sel));
        rowsBox.setVisibility(rows.isEmpty() ? View.GONE : View.VISIBLE);
        for (int i = 0; i < rows.size(); i++) rowViews.get(i).bind(rows.get(i), sel == i);
        for (int k = 0; k < btns.size(); k++) Ui.pillState(btns.get(k).view, btns.get(k).primary, sel == rows.size() + k);
    }
    @Override void refresh() { render(); }
    @Override void closed() { a.cardGone(this); }

    @Override boolean key(int code, boolean repeat) {
        int nr = rows.size(), nb = btns.size();
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_UP: if (sel >= nr && nr > 0) sel = nr - 1; else if (sel > 0 && sel < nr) sel--; render(); return true;
            case KeyEvent.KEYCODE_DPAD_DOWN: if (sel < nr - 1) sel++; else if (sel < nr && nb > 0) sel = nr; render(); return true;
            case KeyEvent.KEYCODE_DPAD_LEFT: if (sel > nr) sel--; render(); return true;
            case KeyEvent.KEYCODE_DPAD_RIGHT: if (sel >= nr && sel < nr + nb - 1) sel++; render(); return true;
            case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_NUMPAD_ENTER: {
                if (repeat) return true;
                Runnable r = sel < nr ? rows.get(sel).ok : sel - nr < nb ? btns.get(sel - nr).ok : null;
                if (r != null) r.run();
                return true;
            }
        }
        return true;   // a card keeps the remote: nothing reaches the picture behind it
    }
    @Override boolean back() { if (onBack != null) { onBack.run(); return true; } return false; }
    @Override String[][] hints() {
        List<String[]> h = new ArrayList<>();
        h.add(new String[] { "OK", focusedLabel() });
        if (btns.size() > 1) h.add(new String[] { "◀ ▶", "Move" });
        else if (!rows.isEmpty() && !btns.isEmpty()) h.add(new String[] { "▲ ▼", "Move" });
        h.add(new String[] { "Back", backLabel });
        return h.toArray(new String[0][]);
    }
}
