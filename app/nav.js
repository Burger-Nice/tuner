// Remote-control navigation: maps TV remote and keyboard keys to actions,
// and moves focus to the nearest control in the pressed direction.
(function (global) {
  'use strict';

  const FOCUSABLE = 'button:not([disabled]), input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])';

  // Tizen, webOS and Android TV remotes send these codes for keys that have no standard e.key.
  const CODES = { 10009: 'back', 461: 'back', 415: 'play', 19: 'pause', 413: 'stop', 427: 'chup', 428: 'chdown', 33: 'chup', 34: 'chdown' };
  const KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'ok',
    Escape: 'back', GoBack: 'back', BrowserBack: 'back',
    MediaPlayPause: 'playpause', MediaPlay: 'play', MediaPause: 'pause',
    ChannelUp: 'chup', ChannelDown: 'chdown', MediaTrackNext: 'chup', MediaTrackPrevious: 'chdown',
  };

  function keyOf(e) { return KEYS[e.key] || CODES[e.keyCode] || null; }

  function visible(el) {
    if (el.closest('[hidden]')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function move(dir, scope = document) {
    const cur = document.activeElement;
    const items = [...scope.querySelectorAll(FOCUSABLE)].filter((el) => el !== cur && visible(el));
    if (!cur || cur === document.body || !scope.contains(cur)) { items[0]?.focus(); return !!items[0]; }

    const a = cur.getBoundingClientRect();
    let best = null, bestScore = Infinity;
    for (const el of items) {
      const b = el.getBoundingClientRect();
      let gap, ortho;
      if (dir === 'down') { if (b.top < a.bottom - 4) continue; gap = b.top - a.bottom; ortho = spanGap(a.left, a.right, b.left, b.right); }
      else if (dir === 'up') { if (b.bottom > a.top + 4) continue; gap = a.top - b.bottom; ortho = spanGap(a.left, a.right, b.left, b.right); }
      else if (dir === 'right') { if (b.left < a.right - 4) continue; gap = b.left - a.right; ortho = spanGap(a.top, a.bottom, b.top, b.bottom); }
      else { if (b.right > a.left + 4) continue; gap = a.left - b.right; ortho = spanGap(a.top, a.bottom, b.top, b.bottom); }
      const score = Math.max(0, gap) + ortho * 3;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) { best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    return !!best;
  }

  // Distance between two 1-D spans, 0 when they overlap.
  function spanGap(a1, a2, b1, b2) { return b2 < a1 ? a1 - b2 : b1 > a2 ? b1 - a2 : 0; }

  global.Nav = { keyOf, move, FOCUSABLE };
})(window);
