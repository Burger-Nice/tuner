// The NBA tab's Team stats section (design/ui-v1/nba-pages/SPEC.md 5): the category column with your team's rank in each
// (switches on focus after 250 ms), and all 30 teams ranked in the picked one, with a bar, opened centred on your team.
// ▶ goes to the list on your team's row; OK on a row: that team's page. Under the shield the list is the copy from before
// the unseen game's tip-off (SPEC 8.2), labelled, or covered when none was kept.
import { esc, ic, dot, hm, setHtml } from '../util.js';
import { on } from '../state.js';
import { favTeam, isMine } from '../games.js';
import { peek, want, failed, fetchedAt } from '../league.js';
import { watching } from '../player.js';
import { push } from '../router.js';
import { focus } from '../focus.js';
import { tc, names, pinView, pinNote, revealBtn, reveal, espnMeta, downCard, stateCard } from './common.js';
import { ord, edge, coverCard, onFinal, isRepeat } from './standings.js';

// The categories, in the spec's order: key = the stat's name in NBA.teamStats() (s and rank), lower = lower is better.
// (Points allowed isn't here: NBA.teamStats() keeps only each team's own numbers, not ESPN's opponent split.)
export const TEAM_CATS = [
  { key: 'avgPoints', label: 'Points' },
  { key: 'oppAvgPoints', label: 'Points allowed', lower: true },
  { key: 'avgRebounds', label: 'Rebounds' },
  { key: 'avgAssists', label: 'Assists' },
  { key: 'fieldGoalPct', label: 'Field goal %' },
  { key: 'threePointFieldGoalPct', label: '3-point %' },
  { key: 'avgThreePointFieldGoalsMade', label: '3-pointers made' },
  { key: 'avgSteals', label: 'Steals' },
  { key: 'avgBlocks', label: 'Blocks' },
  { key: 'avgTurnovers', label: 'Turnovers', lower: true },
];
const KEY = 'teamStats', RH = 30;
// the list without a note (11 rows from y 156), and under a note (the copy's label, or ESPN down: 10 rows from y 196)
const PLAIN = { th: 128, tb: 156, n: 11 }, NOTED = { th: 172, tb: 196, n: 10 };

let el, ctx, cat = TEAM_CATS[0].key, first = -1, rows = [], L = PLAIN, dwell = 0, tick = 0, behind = false;
const $ = (s) => el.querySelector(s);
const catOf = (k) => TEAM_CATS.find((c) => c.key === k) || TEAM_CATS[0];

// Every team with a number in this category, best first.
function ranked(data, k) {
  const list = Object.values(data || {}).filter((t) => typeof t.s?.[k] === 'number');
  list.sort((a, b) => (a.rank[k] || 99) - (b.rank[k] || 99));   // (stable: ties keep ESPN's order)
  const n = new Map();
  list.forEach((t) => n.set(t.rank[k], (n.get(t.rank[k]) || 0) + 1));
  return list.map((t) => ({ t, v: t.s[k], rank: t.rank[k], tie: n.get(t.rank[k]) > 1 }));
}
const rankText = (r, long) => (r ? `${r.tie ? 'T-' : ''}${long ? ord(r.rank) : r.rank}` : '');
// What the list shows: today's, the copy from before an unseen game, or nothing (covered / still reading).
function tableFor(data) {
  const v = pinView(null);   // every team is in this table
  if (!v) return { data };
  if (v.loading) return { pin: v, wait: true };
  return v.copy?.teamStats ? { data: v.copy.teamStats, pin: v, copy: true } : { pin: v, cover: true };
}
const blocks = (top, n) => Array.from({ length: n }, (_, i) => `<div class="nb-sk" style="left:272px;top:${top + i * RH}px;width:628px;height:${RH - 4}px;border-radius:8px"></div>`).join('');
const preseason = (data) => !Object.keys(data || {}).length || Object.values(data).every((t) => !t.s?.gamesPlayed);

function draw() {
  if (!el || !ctx?.visible()) return;
  if (watching()) { behind = true; return; }   // nothing to see under the TV player; drawn once it closes
  const c = catOf(cat), got = peek(KEY)?.data, bad = failed(KEY);
  const t = got && !preseason(got) ? tableFor(got) : {};
  const me = favTeam();
  // the column: your team's rank in each category (from the same table as the list)
  setHtml($('.nb-cats'), TEAM_CATS.map((x) => {
    const r = t.data && me ? ranked(t.data, x.key).find((y) => y.t.abbr === me) : null;
    return `<div class="nb-cat fx${x.key === cat ? ' sel' : ''}" tabindex="-1" data-cat="${x.key}">${esc(x.label)}<small>${esc(rankText(r, true))}</small></div>`;
  }).join(''));
  let note = '', head = '', body = '', msg = '';
  rows = [];
  if (!got) msg = bad ? `<div class="lg-panel">${downCard(196)}</div>` : blocks(PLAIN.tb, PLAIN.n);
  else if (preseason(got)) msg = `<div class="lg-panel">${stateCard({ icon: 'clock', title: 'Team stats start after the first games', text: 'The ranks show once every team has played.', top: 210 })}</div>`;
  else if (t.wait) msg = blocks(PLAIN.tb, PLAIN.n);
  else if (t.cover) msg = `<div class="lg-panel">${coverCard('Team stats are hidden', t.pin, revealBtn(t.pin.games, 'btn2'))}</div>`;
  else {
    if (t.pin) note = pinNote(t.pin, 'left:272px;top:126px');
    else if (bad) note = `<div class="nb-notice" data-row style="left:272px;top:126px">${ic('wifiOff')}<span>ESPN isn’t answering${fetchedAt(KEY) ? `${dot}showing ${hm(fetchedAt(KEY))}` : ''}</span><span class="pillbtn fx" tabindex="-1" data-act="retry">${ic('refresh')}Try again</span></div>`;
    L = note ? NOTED : PLAIN;
    rows = ranked(t.data, cat);
    const vals = rows.map((r) => r.v), lo = Math.min(...vals), hi = Math.max(...vals);
    const unit = /%/.test(c.label) ? c.label.toUpperCase() : `${c.label.toUpperCase()} A GAME`;
    head = `<span class="c c-rk" style="width:36px;color:inherit;font-weight:inherit">#</span><span class="c-crest" style="margin-left:12px"></span><span class="c-nm">TEAM</span><span class="c c-val" style="width:auto;font:inherit">${esc(unit)}</span>`;
    body = rows.map((r, i) => {
      const mine = r.t.abbr === me, w = 18 + (82 * (c.lower ? hi - r.v : r.v - lo)) / (hi - lo || 1);   // 18 to 100%
      return `<div class="nb-tr fx${mine ? ' mine' : ''}" tabindex="-1" data-key="tm:${esc(r.t.abbr)}" style="top:${i * RH}px">${mine ? edge(r.t.abbr) : ''}<span class="c c-rk" style="width:36px">${esc(rankText(r))}</span><span class="c-crest" style="margin-left:12px">${tc(r.t)}</span><span class="c-nm"><span class="nm">${esc(r.t.full || names(r.t.abbr).full)}</span></span><span class="c-bar"><i style="width:${w.toFixed(1)}%"></i></span><span class="c c-val">${(+r.v).toFixed(1)}</span></div>`;
    }).join('');
  }
  let changed = setHtml($('.ts-note'), note);
  changed = setHtml($('.ts-msg'), msg) || changed;
  const th = $('.ts-th'), tb = $('.ts-tb');
  setHtml(th, head); th.hidden = !head; th.style.top = `${L.th}px`;
  changed = setHtml($('.nb-in'), body) || changed;
  tb.hidden = !body; tb.style.top = `${L.tb}px`; tb.style.height = `${L.n * RH}px`;
  if (first < 0 || first > Math.max(0, rows.length - L.n)) { centre(); changed = true; }
  if (changed) place(true);   // (a poll that changed nothing leaves a slide running)
}
// The list opens with your team in the middle.
function centre() {
  const i = rows.findIndex((r) => r.t.abbr === favTeam());
  first = Math.max(0, Math.min(rows.length - L.n, (i < 0 ? 0 : i) - Math.floor(L.n / 2)));
}
// Whole rows, one row of margin to either edge (320 ms; at once while a key repeats).
function place(fast) {
  const kids = [...$('.nb-in').children], i = kids.indexOf(document.activeElement);
  if (i >= 0) {
    if (i < first + 1) first = Math.max(0, i - 1);
    if (i > first + L.n - 2) first = Math.min(rows.length - L.n, i - L.n + 2);
    first = Math.max(0, first);
  }
  el.classList.toggle('fast', !!fast);
  $('.nb-in').style.transform = first > 0 ? `translateY(${-first * RH}px)` : '';
  kids.forEach((n, k) => n.classList.toggle('off', k < first || k >= first + L.n));
  const bar = $('.ts-bar');
  bar.hidden = rows.length <= L.n;
  bar.style.top = `${L.tb}px`; bar.style.height = `${L.n * RH}px`;
  bar.firstElementChild.style.top = `${(first / (rows.length || 1)) * L.n * RH}px`;
  bar.firstElementChild.style.height = `${(L.n / (rows.length || 1)) * L.n * RH}px`;
}

function pick(k, { now = false } = {}) {
  clearTimeout(dwell);
  if (k === cat) return;
  const go = () => { cat = k; first = -1; draw(); };
  if (now) go(); else dwell = setTimeout(() => { if (document.activeElement?.dataset?.cat === k) go(); }, 250);
}

export default {
  id: 'teamstats',
  label: () => 'Team stats',
  mount(root, c) {
    el = root; ctx = c;
    root.classList.add('lg', 'ts');
    root.innerHTML = '<div class="nb-cats" data-col></div><div class="ts-note"></div><div class="nb-th ts-th" style="left:272px;width:628px" hidden></div>'
      + '<div class="nb-tb ts-tb" data-col style="left:272px;width:628px" hidden><div class="nb-in"></div></div><div class="nb-sbar ts-bar" hidden><i></i></div><div class="ts-msg"></div>';
    // ▶ from the column: the list, on your team's row
    $('.nb-cats').navHook = (dir, cur, repeat) => {
      if (dir === 'up' && repeat && cur === $('.nb-cats .nb-cat')) return false;   // a held key stops at the top of the list
      if (dir === 'left') return false;
      if (dir !== 'right') return undefined;
      const to = $(`.nb-in [data-key="tm:${favTeam()}"]`) || $('.nb-in .nb-tr:not(.off)') || $('.ts-msg .fx') || $('.ts-note .fx');
      return to ? focus(to) : false;
    };
    $('.ts-tb').navHook = (dir) => (dir === 'left' ? focus($(`.nb-cats [data-cat="${cat}"]`)) : dir === 'right' ? false : undefined);
    root.addEventListener('tvfocus', (e) => {
      const k = e.target.dataset?.cat;
      if (k) pick(k); else clearTimeout(dwell);
      place(isRepeat(e));
    });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat],[data-act],.nb-tr');
      if (!b) return;
      if (b.dataset.cat) return pick(b.dataset.cat, { now: true });
      if (b.dataset.act === 'retry') return want(KEY, { force: true });
      if (b.dataset.act === 'reveal') return reveal(b, draw);
      if (b.classList.contains('nb-tr')) push('team', { abbr: b.dataset.key.slice(3) });
    });
    on('league', (k) => { if (k === KEY || k === 'pin' || k.startsWith('schedule:')) { draw(); if (ctx.visible()) ctx.meta(); } });
    on('nba', draw);
    on('player-closed', () => { if (behind) { behind = false; draw(); } });
    onFinal((g) => { if (isMine(g)) setTimeout(() => want(KEY, { force: true }), 5 * 60e3); });   // 5 min after your team's final
  },
  // params.cat (a TEAM_CATS key): open on that category, focused (Season ranks on the team page)
  enter(root, c, params) {
    const k = params?.cat && TEAM_CATS.some((x) => x.key === params.cat) ? params.cat : null;
    if (k) cat = k;
    first = -1;
    want(KEY);
    if (favTeam()) want(`schedule:${favTeam()}`);   // the shield needs your team's games
    clearInterval(tick);
    // every minute: want() fetches when the table is over an hour old, or when the last try failed (ESPN down: 60 s)
    tick = setInterval(() => { if (ctx.visible()) want(KEY); }, 60e3);
    draw();
    ctx.meta();
    if (k) focus($(`.nb-cats [data-cat="${k}"]`));
  },
  leave() { clearInterval(tick); clearTimeout(dwell); },
  entry: (root) => root.querySelector('.nb-cats .nb-cat.sel'),
  toTop() { if (!el) return; first = -1; centre(); place(true); },
  meta: () => (!peek(KEY)?.data && !failed(KEY) ? 'Loading…' : espnMeta(KEY)),
};
