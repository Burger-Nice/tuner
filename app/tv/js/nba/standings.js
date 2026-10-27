// The NBA tab's Standings section (design/ui-v1/nba-pages/SPEC.md 3): West / East chips (your team's conference first;
// they switch on focus after 250 ms), the table with its play-in bands and LIVE pills for teams playing now, and the
// scrolled layout once focus passes row 8 (the margin rule: one whole row stays between the focused row and the edge).
// Under the shield a conference with an unseen final shows the copy kept from before its tip-off, or a cover card when
// none was kept (SPEC 8.2). OK on a row: that team's page; hold OK: its page, or make it your team.
// Also the League sections' shared bits (Leaders and Team stats import them): ord, edge, coverCard, onFinal, dayDate.
import { esc, ic, dot, liveP, setHtml, teamPalette, hm } from '../util.js';
import { on, emit, saveSettings } from '../state.js';
import { nba, favTeam } from '../games.js';
import { peek, want, failed, fetchedAt } from '../league.js';
import { watching } from '../player.js';
import { push } from '../router.js';
import { focus } from '../focus.js';
import { contextMenu, confirmMenu } from '../ui.js';
import { tc, names, pinView, revealBtn, reveal, espnMeta, downCard, stateCard, skeleton, gameName } from './common.js';

// ---------- shared by the League sections ----------
// 1st 2nd 3rd 4th … 11th 12th 13th 21st
export const ord = (n) => { const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'; return `${n}${s}`; };
// Your team's bar at a row's left edge (its secondary colour).
export const edge = (abbr) => `<span class="tedge" style="background:${teamPalette(abbr).a}"></span>`;
// 'Sun 25 Oct' for the evening a game belongs to (the night rule).
export const dayDate = (t) => new Date(t - 6 * 3600e3).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
// No copy from before the unseen game: the table is covered. btns: the card's buttons (Reveal never first).
export function coverCard(title, v, btns = '', top = 196) {
  const more = v.games.length > 1 ? ` and ${v.games.length - 1} more result${v.games.length > 2 ? 's' : ''}` : '';
  return `<div class="center-col" style="top:${top}px"><div class="state big lg-cover"><div class="ico">${ic('eyeOff')}</div><b>${esc(title)}</b><p>They include ${esc(gameName(v.game))} (${esc(dayDate(v.game.date))})${more}, which you haven’t seen. airglow had no copy from before that tip-off.</p><div class="row-flex" data-row style="gap:16px;justify-content:center">${btns}</div></div></div>`;
}
// The copy is old because ESPN isn't answering: 'ESPN isn't answering · showing 22:51' and a Try again pill.
export const downBits = (key) => `${ic('wifiOff', 'sm')}<span>ESPN isn’t answering${fetchedAt(key) ? `${dot}showing ${hm(fetchedAt(key))}` : ''}</span><span class="pillbtn fx" tabindex="-1" data-act="retry">${ic('refresh')}Try again</span>`;
// A game turning final (fn(game)): the tables refresh a little after it (SPEC 11).
const finals = new Set(), states = new Map();
export const onFinal = (fn) => finals.add(fn);
on('nba', () => {
  for (const g of nba.today) {
    const was = states.get(g.id);
    states.set(g.id, g.state);
    if (was && was !== 'post' && g.state === 'post') finals.forEach((f) => f(g));
  }
});
// Moves inside a list come with { repeat } while a key is held: those don't animate.
export const isRepeat = (e) => !!e?.detail?.repeat;

// ---------- Standings ----------
const ROW = 32, BAND = 28;
const TOP = { tb: 194, vh: 319, th: 168 }, SCR = { tb: 80, vh: 433, th: 52 };
const WEST = new Set(['DAL', 'DEN', 'GS', 'HOU', 'LAC', 'LAL', 'MEM', 'MIN', 'NO', 'OKC', 'PHX', 'POR', 'SAC', 'SA', 'UTAH']);
const HEAD = `<span class="c c-seed" style="color:inherit;font-weight:inherit">#</span><span class="c-crest"></span><span class="c-nm">TEAM</span><span class="c c-w">W</span><span class="c c-w">L</span><span class="c c-pct">PCT</span><span class="c c-gb">GB</span><span class="c c-st">STRK</span><span class="c c-l10">L10</span><span class="c c-ha">HOME</span><span class="c c-ha">ROAD</span>`;

let el, ctx, conf = '', dwell = 0, tick = 0, behind = false, legendHookRef = null;
let items = [], H = 0, sc = 0, scrolledOn = false, wasScrolled = false;
const $ = (s) => el.querySelector(s);

// Your team's conference first (before the data comes, from the West's list).
function confOrder(d) {
  const t = favTeam();
  const mine = d?.confs?.find((c) => c.teams.some((x) => x.abbr === t))?.short || (t && !WEST.has(t) ? 'East' : 'West');
  return mine === 'East' ? ['East', 'West'] : ['West', 'East'];
}
// What this conference's table shows: today's, the copy from before an unseen game, or nothing (cover / still reading).
function tableFor(d, short) {
  const live = d.confs.find((c) => c.short === short);
  if (!live) return { teams: [] };
  const v = pinView(live.teams.map((t) => t.abbr));
  if (!v) return { teams: live.teams, name: live.name, season: d.season };
  if (v.loading) return { pin: v, wait: true };
  const c = v.copy?.standings?.confs?.find((x) => x.short === short);
  if (!c) return { pin: v, cover: true };
  return { teams: c.teams, name: c.name, season: v.copy.standings.season || d.season, pin: v, copy: true };
}
const preseason = (teams) => teams.length > 0 && teams.every((t) => !t.w && !t.l);
const offseason = (teams) => teams.length > 0 && teams.every((t) => t.w + t.l >= 82);
// ESPN's playoffSeed, then PCT (ESPN can tie seeds: shown as given). Preseason: alphabetical, no seeds, no bands.
function layout(teams, pre) {
  const list = pre ? [...teams].sort((a, b) => (a.full || '').localeCompare(b.full || ''))
    : [...teams].sort((a, b) => (a.seed || 99) - (b.seed || 99) || (parseFloat(b.pct) || 0) - (parseFloat(a.pct) || 0));
  const out = [];
  let y = 0;
  list.forEach((t, i) => {
    if (!pre && i === 6) { out.push({ band: 'Play-in tournament · 7 to 10', y, h: BAND }); y += BAND; }
    if (!pre && i === 10) { out.push({ band: 'Outside the play-in', y, h: BAND }); y += BAND; }
    out.push({ t, y, h: ROW }); y += ROW;
  });
  return { list: out, h: y };
}
function rowHtml(it, live, pre) {
  if (it.band) return `<div class="nb-band" style="top:${it.y}px">${esc(it.band)}<i></i></div>`;
  const t = it.t, mine = t.abbr === favTeam(), gb = !t.gb || t.gb === '-' ? '–' : t.gb;
  return `<div class="nb-tr fx${mine ? ' mine' : ''}" tabindex="-1" data-key="tm:${esc(t.abbr)}" data-hold style="top:${it.y}px">${mine ? edge(t.abbr) : ''}<span class="c c-seed">${pre ? '' : t.seed || ''}</span><span class="c-crest">${tc(t)}</span><span class="c-nm"><span class="nm">${esc(t.full || names(t.abbr).full)}</span>${live?.has(t.abbr) ? liveP() : ''}</span><span class="c c-w k">${t.w}</span><span class="c c-w k">${t.l}</span><span class="c c-pct k">${esc(t.pct)}</span><span class="c c-gb s">${esc(gb)}</span><span class="c c-st">${esc(t.streak)}</span><span class="c c-l10">${esc(t.l10)}</span><span class="c c-ha s">${esc(t.home)}</span><span class="c c-ha s">${esc(t.road)}</span></div>`;
}
// Preseason: 'Season starts Tue 20 Oct', from your team's schedule when it's on hand.
function seasonStarts() {
  const g = peek(`schedule:${favTeam()}`)?.data?.games?.find((x) => x.state === 'pre');
  return g ? `Season starts ${dayDate(g.date)}` : 'The season hasn’t started';
}
function legend(t, bad, pre) {
  if (t.pin && t.cover) return `<span class="legend">The ${esc(conf)} includes a result you haven’t seen</span>`;
  if (t.pin && t.copy) return `<span class="legend" data-row style="gap:10px">${ic('eyeOff', 'sm')}<span><b style="color:var(--a-text-1);font-weight:650">As of tip-off, ${esc(gameName(t.pin.game))}</b>${dot}${esc(dayDate(t.pin.game.date))}</span>${revealBtn(t.pin.games)}</span>`;
  if (bad) return `<span class="legend" data-row style="gap:10px">${downBits('standings')}</span>`;
  if (t.wait) return '';
  if (pre) return `<span class="legend">${esc(seasonStarts())}</span>`;
  if (t.teams && offseason(t.teams)) return `<span class="legend">${esc(t.season || '')} final standings</span>`;
  return `<span class="legend">1 to 6 make the playoffs${dot}7 to 10 play in${dot}${liveP()} playing now</span>`;
}

function draw() {
  if (!el || !ctx?.visible()) return;
  if (watching()) { behind = true; return; }   // nothing to see under the TV player; drawn once it closes
  const d = peek('standings')?.data, bad = failed('standings');
  const order = confOrder(d);
  if (!order.includes(conf)) conf = order[0];
  const chips = order.map((c) => `<span class="chip lg fx${c === conf ? ' sel' : ''}" tabindex="-1" data-conf="${c}">${c}</span>`).join('');
  let sub = '', rows = '', msg = '', line = '', head = false;
  items = []; H = 0;
  if (!d?.confs?.length) {
    if (bad) msg = downCard(196);                                     // nothing kept: the card, Try again focused
    else if (d) {   // an empty answer: before the season, or ESPN between tables
      const played = peek(`schedule:${favTeam()}`)?.data?.games?.some((g) => g.state === 'post');
      msg = stateCard({ icon: 'clock', title: 'No standings from ESPN yet', text: played ? 'ESPN sent an empty table. airglow asks again in a few minutes.' : `${seasonStarts()}.`, top: 196 });
    }
    else { sub = chips; head = true; msg = skeleton(9, { top: TOP.tb }); }
  } else {
    const t = tableFor(d, conf), pre = !!t.teams && preseason(t.teams);
    sub = chips + legend(t, bad, pre);
    if (t.wait) { head = true; msg = skeleton(9, { top: TOP.tb }); }
    else if (t.cover) {
      const other = order.find((c) => c !== conf);
      msg = coverCard(`${conf} standings are hidden`, t.pin, `<span class="btn2 fx" tabindex="-1" data-act="other" data-c="${other}">Show the ${other}</span>${revealBtn(t.pin.games, 'btn2')}`);
    } else {
      // LIVE pills: today's games in progress, never on a copy or while ESPN's standings aren't answering
      const live = t.copy || bad ? null : new Set(nba.today.filter((g) => g.state === 'in').flatMap((g) => [g.home.abbr, g.away.abbr]));
      const L = layout(t.teams, pre);
      items = L.list; H = L.h; head = true;
      rows = items.map((it) => rowHtml(it, live, pre)).join('');
      line = `NBA${dot}<b>Standings</b>${dot}${esc(t.name || `${conf}ern Conference`)}${t.season ? `${dot}${esc(t.season)}` : ''}${t.copy ? `${dot}As of tip-off, ${esc(gameName(t.pin.game))}` : ''}`;
    }
  }
  let changed = setHtml($('.st-sub'), sub);
  const lg = $('.st-sub .legend[data-row]');
  if (lg) lg.navHook = legendHookRef;
  $('.st-th').hidden = !head;
  $('.st-tb').hidden = !rows;
  changed = setHtml($('.nb-in'), rows) || changed;
  changed = setHtml($('.st-msg'), msg) || changed;
  setHtml($('.st-ctx'), line);
  // ESPN down with nothing kept: Try again is the only thing to focus
  const retry = $('.st-msg [data-act="retry"]'), a = document.activeElement;
  if (retry && el.contains(a) && a !== retry) focus(retry);
  if (changed) place(true);   // (a poll that changed nothing leaves a slide running)
}

// The margin rule and the two layouts. Rows move in whole rows (320 ms; at once while a key repeats).
function place(fast, follow = true) {
  if (!el) return;
  const kids = [...$('.nb-in').children], a = document.activeElement, k = follow ? kids.indexOf(a) : -1;
  if (!follow) { sc = 0; scrolledOn = false; }
  else if (k >= 0 && items[k]) {
    const it = items[k];
    if (!scrolledOn && it.y + 2 * ROW > TOP.vh) scrolledOn = true;   // past row 8: the scrolled layout
    if (scrolledOn) {
      // (every candidate is a row's top: whole rows)
      const top = (y) => items.find((x) => x.y >= y)?.y ?? 0, end = top(H - SCR.vh);
      const below = top(it.y + 2 * ROW - SCR.vh);                     // a whole row below it
      sc = Math.max(0, Math.min(Math.max(sc, below), k > 0 ? items[k - 1].y : 0, end));   // and one above it
    } else sc = 0;
  } else if (el.contains(a) && !a.closest('.st-tb')) { sc = 0; scrolledOn = false; }   // on the chips (a menu over a row keeps it)
  const L = scrolledOn ? SCR : TOP, tb = $('.st-tb'), bar = $('.st-bar');
  el.classList.toggle('fast', !!fast);
  el.classList.toggle('sc', scrolledOn);
  tb.style.top = `${L.tb}px`; tb.style.height = `${L.vh}px`;
  $('.st-th').style.top = `${L.th}px`;
  $('.nb-in').style.transform = sc ? `translateY(${-sc}px)` : '';
  kids.forEach((n, i) => { const it = items[i]; n.classList.toggle('off', !it || it.y < sc || it.y + it.h > sc + L.vh); });   // whole rows only
  bar.hidden = !items.length || H <= L.vh;
  bar.style.top = `${L.tb}px`; bar.style.height = `${L.vh}px`;
  // the thumb stays in its track, and reaches its end when the last row shows
  const th = bar.firstElementChild, tH = Math.min(1, L.vh / (H || 1)) * L.vh, end = items.find((x) => x.y >= H - L.vh)?.y || 0;
  th.style.height = `${tH}px`; th.style.top = `${end > 0 ? Math.min(1, sc / end) * (L.vh - tH) : 0}px`;
  if (wasScrolled !== scrolledOn) { wasScrolled = scrolledOn; ctx.scrolled(scrolledOn); }
}

function pick(c, { now = false } = {}) {
  clearTimeout(dwell);
  if (c === conf) return;
  const go = () => { conf = c; sc = 0; scrolledOn = false; draw(); };
  if (now) go(); else dwell = setTimeout(() => { if (document.activeElement?.dataset?.conf === c) go(); }, 250);
}
// Hold OK on a row: its page, or make it your team (confirmed).
function rowMenu(r) {
  const abbr = r.dataset.key.slice(3), n = names(abbr);
  const rows = [{ icon: 'chevR', label: `${n.name} page`, run: () => push('team', { abbr }) }];
  if (abbr !== favTeam()) {
    rows.push({ icon: 'star', label: `Make the ${n.name} my team`, run: () => confirmMenu({
      title: `Make the ${n.name} your team?`, text: 'Their games come first on Home and in the NBA tab.', yes: 'Make my team',
      onYes: () => { saveSettings({ nbaTeam: abbr }); emit('nba'); },
    }) });
  }
  contextMenu(r, rows);
}
const selChip = () => $(`.st-sub [data-conf="${conf}"]`);

export default {
  id: 'standings',
  label: () => 'Standings',
  mount(root, c) {
    el = root; ctx = c;
    root.classList.add('lg', 'lg-st');
    root.innerHTML = '<div class="nb-cover st-cover"></div><div class="nb-ctx st-ctx"></div><div class="nb-sub st-sub" data-row></div>'
      + `<div class="nb-th st-th" style="top:${TOP.th}px">${HEAD}</div><div class="nb-tb st-tb" data-col style="left:48px;width:852px"><div class="nb-in"></div></div>`
      + '<div class="nb-sbar st-bar" hidden><i></i></div><div class="st-msg"></div>';
    // Down from the chips: your team's row if it shows, else row 1 (or the cover card's first button).
    const down = () => { const to = $(`.nb-in [data-key="tm:${favTeam()}"]:not(.off)`) || $('.nb-in .nb-tr') || $('.st-msg .fx'); return to ? focus(to) : false; };
    // The legend's pill (Reveal, Try again) is its own row: Right from the selected chip (or the last one) goes straight
    // to it, so you never rest on the other chip and switch the table it belongs to; Left from it goes to the last chip.
    const pill = () => $('.st-sub .legend .fx');
    $('.st-sub').navHook = (dir, cur, repeat) => {
      if (dir === 'down') return repeat ? undefined : down();
      if (dir === 'right' && pill() && (cur.classList.contains('sel') || !cur.nextElementSibling?.dataset?.conf)) return focus(pill());
      return undefined;
    };
    const legendHook = (dir, cur, repeat) => {
      if (dir === 'left') return focus([...$('.st-sub').querySelectorAll('[data-conf]')].pop());
      if (dir === 'right') return false;
      if (dir === 'down') return repeat ? undefined : down();
      return undefined;
    };
    legendHookRef = legendHook;
    // The body: row edges stop; Up from the first row goes to the selected chip (and the top layout).
    $('.st-tb').navHook = (dir, cur) => {
      if (dir === 'left' || dir === 'right') return false;
      if (dir === 'up' && cur === $('.nb-in .nb-tr')) return focus(selChip() || $('.st-sub .fx'));
      return undefined;
    };
    root.addEventListener('tvfocus', (e) => {
      const c2 = e.target.dataset?.conf;
      if (c2) pick(c2);
      else clearTimeout(dwell);
      place(isRepeat(e));
    });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-conf],[data-act],.nb-tr');
      if (!b) return;
      if (b.dataset.conf) return pick(b.dataset.conf, { now: true });
      const act = b.dataset.act;
      if (act === 'retry') return want('standings', { force: true });
      if (act === 'reveal') return reveal(b, draw);
      if (act === 'other') { pick(b.dataset.c, { now: true }); return focus(selChip()); }
      if (b.classList.contains('nb-tr')) push('team', { abbr: b.dataset.key.slice(3) });
    });
    root.addEventListener('tvhold', (e) => { const r = e.target.closest('.nb-tr'); if (r) rowMenu(r); });
    on('league', (k) => { if (k === 'standings' || k === 'pin' || k.startsWith('schedule:')) { draw(); if (ctx.visible()) ctx.meta(); } });
    on('nba', draw);
    on('player-closed', () => { if (behind) { behind = false; draw(); } });
    onFinal(() => setTimeout(() => want('standings', { force: true }), 2 * 60e3));   // 2 min after any final
  },
  enter() {
    wasScrolled = null;   // the host may have brought the bar back while the tab was away
    want('standings');
    if (favTeam()) want(`schedule:${favTeam()}`);   // the shield needs your team's games
    clearInterval(tick);
    // every minute: want() fetches when the copy is over 10 min old, or when the last try failed (ESPN down: 60 s)
    tick = setInterval(() => { if (ctx.visible()) want('standings'); }, 60e3);
    draw();
    place(true);
    ctx.meta();
  },
  leave() { clearInterval(tick); clearTimeout(dwell); },
  entry: (root) => root.querySelector('.st-msg [data-act="retry"]') || root.querySelector('.st-sub .chip.sel') || root.querySelector('.st-msg .fx'),
  toTop() { if (el) place(true, false); },
  meta: () => (!peek('standings')?.data && !failed('standings') ? 'Loading…' : espnMeta('standings')),
};
