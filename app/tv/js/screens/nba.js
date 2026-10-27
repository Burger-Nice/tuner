// The NBA tab: a section row, `Games · [crest] Grizzlies · Standings · Leaders · Team stats · News` (y 80-120), over one
// section at a time (design/ui-v1/nba-pages/SPEC.md 1-2). Chips switch on focus after 250 ms (OK switches at once and
// goes in); Down from the row lands on the section's entry; Back in a section goes to its chip, then to the NBA tab.
// The last section is remembered while the app runs. Each section is a module (app/tv/js/nba/) with:
//   id, label() (html)   mount(root, ctx)   enter(root, ctx)   leave(root)   entry(root)   toTop(root)
//   key?(k, e) -> true when handled   back?(root) -> true when handled   meta?() -> the row's right-hand text (html)
// ctx: visible() (this section is on screen), scrolled(on) (its scrolled layout: the bar and the row step away),
//      meta() (redraw the row's right-hand text), chip() (focus this section's chip).
import { esc, ic, setHtml } from '../util.js';
import { on } from '../state.js';
import { startNba, shieldMode, favTeam } from '../games.js';
import { current, barHidden } from '../router.js';
import { focus } from '../focus.js';
import hub from '../nba/hub.js';
import standings from '../nba/standings.js';
import leaders from '../nba/leaders.js';
import teamstats from '../nba/teamstats.js';
import news from '../nba/news.js';
import { teamSection } from '../nba/team.js';

const SECTIONS = [hub, teamSection, standings, leaders, teamstats, news];
const byKey = new Map(SECTIONS.map((s) => [s.id, s]));
let el, row, sec = 'games', dwell = 0;
const roots = new Map();   // key -> the section's own box
const ctxs = new Map();

const def = () => byKey.get(sec);
const rootOf = (k = sec) => roots.get(k);
function ctxFor(k) {
  if (!ctxs.has(k)) ctxs.set(k, {
    visible: () => current() === 'nba' && !!el && !el.hidden && sec === k,
    scrolled: (on) => { if (sec !== k) return; row.classList.toggle('away', !!on); if (current() === 'nba') barHidden(!!on); },
    meta: () => drawRow(),
    chip: () => focus(row.querySelector(`[data-sec="${k}"]`)),
  });
  return ctxs.get(k);
}
// The section's box, mounted the first time it's shown.
function ensureRoot(k) {
  if (roots.has(k)) return roots.get(k);
  const r = document.createElement('div');
  r.className = 'nb-s';
  r.dataset.s = k;
  r.hidden = true;
  el.appendChild(r);
  roots.set(k, r);
  byKey.get(k).mount?.(r, ctxFor(k));
  return r;
}

function drawRow() {
  if (!row) return;
  const meta = shieldMode() !== 'off' ? `${ic('eyeOff')}<span>Shield: ${shieldMode() === 'all' ? 'All games' : 'My team'}</span>` : def().meta?.() || '';
  setHtml(row, `${SECTIONS.map((s) => `<span class="chip lg fx${s.id === sec ? ' sel' : ''}" tabindex="-1" data-sec="${s.id}">${s.label()}</span>`).join('')}<span class="meta">${meta}</span>`);
}

function select(k, { enter = true } = {}) {
  if (!byKey.has(k)) k = 'games';
  if (k === sec && rootOf(k) && !rootOf(k).hidden) return;
  const old = rootOf();
  if (old && !old.hidden) { def().toTop?.(old); def().leave?.(old); old.hidden = true; }
  sec = k;
  row.classList.remove('away'); barHidden(false);
  const r = ensureRoot(k);
  r.hidden = false;
  drawRow();
  if (enter) def().enter?.(r, ctxFor(k));
}

export default {
  name: 'nba',
  mount(root) {
    el = root;
    root.innerHTML = '<div class="nb-sec" data-row></div>';
    row = root.querySelector('.nb-sec');
    // Down from the row goes to the section's entry (neighbour() would pick whatever overlaps the chip: SPEC 2.2).
    row.navHook = (dir, cur, repeat) => {
      if (dir !== 'down' || repeat) return undefined;
      const to = def().entry?.(rootOf());
      return to ? focus(to) : undefined;
    };
    row.addEventListener('tvfocus', (e) => {
      const k = e.target.dataset.sec;
      clearTimeout(dwell);
      if (!k || k === sec) return;
      dwell = setTimeout(() => { if (document.activeElement === e.target) select(k); }, 250);
    });
    root.addEventListener('click', (e) => {
      const c = e.target.closest('[data-sec]');
      if (!c) return;
      clearTimeout(dwell);
      select(c.dataset.sec);
      requestAnimationFrame(() => { const to = def().entry?.(rootOf()); if (to) focus(to); });
    });
    on('nba', () => { if (current() === 'nba') drawRow(); });
  },
  enter(root) {
    startNba();
    if (!rootOf() || rootOf().hidden) select(sec, { enter: false });
    drawRow();
    def().enter?.(rootOf(), ctxFor(sec));
  },
  entry: () => def().entry?.(rootOf()) || row.querySelector('.chip.sel'),
  key(k, e) {
    const a = document.activeElement;
    if (rootOf()?.contains(a)) return !!def().key?.(k, e);
    return false;
  },
  // Back in a section's content: its top, and its chip. (On the row, the app's rule: the NBA tab.)
  back() {
    const r = rootOf(), a = document.activeElement;
    if (!r?.contains(a)) return false;
    if (def().back?.(r)) return true;
    def().toTop?.(r);
    r._last = null; el._last = null;
    r.querySelectorAll('[data-row],[data-col],[data-grid]').forEach((b) => (b._mem = null));
    row.classList.remove('away'); barHidden(false);
    focus(row.querySelector(`[data-sec="${sec}"]`));
    return true;
  },
  leave() { const r = rootOf(); if (r && !r.hidden) def().leave?.(r); barHidden(false); },
  toTop() { const r = rootOf(); if (r) def().toTop?.(r); row?.classList.remove('away'); },
};
// The NBA tab's section showing now, and a way to open one from elsewhere (Season ranks -> Team stats on a category).
export const nbaSection = () => sec;
export function openSection(k, params) {
  select(k, { enter: false });
  def().enter?.(rootOf(), ctxFor(k), params);
}
