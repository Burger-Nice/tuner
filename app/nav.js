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

  // scope: an element, or a list of elements to search (missing and hidden ones are skipped).
  function move(dir, scope = document) {
    const cur = document.activeElement;
    const scopes = (Array.isArray(scope) ? scope : [scope]).filter((s) => s && !s.hidden);
    // In a long grid (data-nav="grid") only the cards around the current one are measured, so a press costs the
    // same however far down you've scrolled.
    const grid = cur?.parentElement?.closest?.('[data-nav="grid"]');
    if (grid && cur.parentElement === grid) {
      const kids = [...grid.children], i = kids.indexOf(cur);
      const hit = nearest(cur, dir, kids.slice(Math.max(0, i - 24), i + 25).filter((el) => el !== cur && el.matches(FOCUSABLE) && visible(el)));
      if (hit) { focusEl(hit); return true; }
    }
    const items = scopes.flatMap((s) => [...s.querySelectorAll(FOCUSABLE)]).filter((el) => el !== cur && visible(el));
    // Nothing focused: start in the content. A gated container (the menu rail) is only entered the gated way.
    if (!cur || cur === document.body || !scopes.some((s) => s.contains(cur))) {
      let first = items.find((el) => !el.closest('[data-nav-in]'));
      if (!first) {
        const gate = items[0]?.closest('[data-nav-in]');
        if (gate && gate.dataset.navIn === dir) first = (gate.dataset.navEntry && gate.querySelector(gate.dataset.navEntry)) || items[0];
      }
      first?.focus();
      return !!first;
    }

    // Groups (data-nav="v" / "h", optionally "-strict"): moves along a group's axis try its own items first.
    // Strict groups never let that move escape (the menu rail keeps up/down to itself).
    const group = cur.closest('[data-nav]:not([data-nav="grid"])');
    if (group) {
      const [axis, strict] = group.dataset.nav.split('-');
      const along = axis === 'v' ? dir === 'up' || dir === 'down' : dir === 'left' || dir === 'right';
      if (along) {
        const hit = nearest(cur, dir, items.filter((el) => group.contains(el)));
        if (hit || strict) { if (hit) focusEl(hit); return !!hit; }
      }
    }
    // A container with data-nav-in (the menu rail: "left") can only be entered by pressing that direction.
    const allowed = (el) => { const gate = el.closest('[data-nav-in]'); return !gate || gate.contains(cur) || gate.dataset.navIn === dir; };
    let best = nearest(cur, dir, items.filter(allowed));
    // Entering a group with an entry point (the rail's current section) lands there, not on the nearest item.
    const target = best?.closest('[data-nav-entry]');
    if (target && !target.contains(cur)) {
      const entry = target.querySelector(target.dataset.navEntry);
      if (entry && visible(entry)) best = entry;
    }
    if (best) focusEl(best);
    return !!best;
  }

  function focusEl(el) { el.focus(); el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }

  function nearest(cur, dir, items) {
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
    return best;
  }

  // Distance between two 1-D spans, 0 when they overlap.
  function spanGap(a1, a2, b1, b2) { return b2 < a1 ? a1 - b2 : b1 > a2 ? b1 - a2 : 0; }

  global.Nav = { keyOf, move, FOCUSABLE };
})(window);
