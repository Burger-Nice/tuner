// The NBA tab's Leaders section (design/ui-v1/nba-pages/SPEC.md 4): the category column (switches on focus after 250 ms),
// the leader on their team's plate, rows 2 to 10 under it. ▶ goes to the card, ▲▼ walk the card and the rows, ◀ back to
// the column. OK on a player: his sheet over Leaders; hold OK: his team's page. Under the shield, a list with a player on
// a team in scope is the copy from before the unseen game's tip-off (SPEC 8.2), or covered when none was kept.
import { esc, ic, dot, hm, setHtml, teamVars } from '../util.js';
import { on } from '../state.js';
import { favTeam, isMine } from '../games.js';
import { peek, want, failed, fetchedAt } from '../league.js';
import { watching } from '../player.js';
import { push } from '../router.js';
import { focus } from '../focus.js';
import { contextMenu, toast } from '../ui.js';
import { tc, names, pinView, revealBtn, reveal, espnMeta, downCard, stateCard } from './common.js';
import { edge, coverCard, onFinal } from './standings.js';

const { NBA } = window;
const CATS = NBA.LEADERS;
const label = (c) => (c.key === '3pm' ? '3-pointers' : c.label);
const POS = { G: 'Guard', PG: 'Guard', SG: 'Guard', F: 'Forward', SF: 'Forward', PF: 'Forward', C: 'Center', FC: 'Forward', GF: 'Guard' };
// headshots at 2x the card's 126 x 92 (ESPN's image combiner)
const head = (u) => (/^https:\/\/a\.espncdn\.com\/i\//.test(u || '') ? `https://a.espncdn.com/combiner/i?img=${u.replace('https://a.espncdn.com', '')}&w=252&h=184` : u || '');
const keyOf = (cat) => `leaders:${cat}`;

let el, ctx, cat = 'pts', dwell = 0, tick = 0, behind = false, list = [];
const $ = (s) => el.querySelector(s);

// What the list shows: today's, the copy from before an unseen game, or nothing (covered / still reading).
function listFor(data) {
  const v = pinView([...new Set(data.map((p) => p.abbr))]);
  if (!v) return { rows: data };
  if (v.loading) return { pin: v, wait: true };
  const c = v.copy?.leaders?.[cat];
  return c ? { rows: c, pin: v, copy: true } : { pin: v, cover: true };
}
// ESPN sorts them; the same order again here keeps ties together whatever comes back.
const sorted = (rows) => [...rows].sort((a, b) => (parseFloat(b.value) || 0) - (parseFloat(a.value) || 0));

function card(p, c, tied) {
  const t = names(p.abbr);
  return `<div class="nb-lead fx" tabindex="-1" data-key="pl:${esc(p.id)}" data-hold><div class="pl" style="${teamVars(p.abbr)}"></div>${p.headshot ? `<img class="hs" src="${esc(head(p.headshot))}" alt="" decoding="async">` : ''}${tc(p.abbr, 's32')}
    <div class="tx"><div class="rk">${tied ? 'T-1st' : '1st'} in the NBA</div><div class="nm${p.name.length > 18 ? ' long' : ''}">${esc(p.name)}</div><div class="mt2">${esc(t.full)}${p.pos ? `${dot}${esc(POS[p.pos] || p.pos)}` : ''}</div></div>
    <div class="v"><b>${esc(p.value)}</b><span>${esc(c.pct ? c.short : `${c.short} per game`).toUpperCase()}</span></div></div>`;
}
function rowsHtml(L) {
  let rk = 1;
  return L.slice(1, 10).map((p, i) => {
    const r = L[i].value === p.value ? rk : (rk = i + 2), mine = p.abbr === favTeam();
    return `<div class="nb-tr fx${mine ? ' mine' : ''}" tabindex="-1" data-key="pl:${esc(p.id)}" data-hold style="top:${i * 30}px">${mine ? edge(p.abbr) : ''}<span class="c c-rk">${r}</span><span class="c-crest" style="margin-left:12px">${tc(p.abbr)}</span><span class="c-nm"><span class="nm">${esc(p.name)}</span></span><span class="c c-tm">${esc(names(p.abbr).name)}</span><span class="c c-val">${esc(p.value)}</span></div>`;
  }).join('');
}
// Flat blocks where the card and the rows will be.
const blocks = () => `<div class="nb-sk" style="left:272px;top:128px;width:640px;height:96px;border-radius:16px"></div>${Array.from({ length: 9 }, (_, i) => `<div class="nb-sk" style="left:272px;top:${238 + i * 30}px;width:640px;height:26px;border-radius:8px"></div>`).join('')}`;

function draw() {
  if (!el || !ctx?.visible()) return;
  if (watching()) { behind = true; return; }   // nothing to see under the TV player; drawn once it closes
  const c = CATS.find((x) => x.key === cat) || CATS[0];
  const got = peek(keyOf(cat)), bad = failed(keyOf(cat));
  setHtml($('.nb-cats'), CATS.map((x) => `<div class="nb-cat fx${x.key === cat ? ' sel' : ''}" tabindex="-1" data-cat="${x.key}">${esc(label(x))}<small>${esc(x.short)}</small></div>`).join(''));
  let note = '<div class="nb-catnote" style="top:428px">Per game, 2026-27.<br>ESPN’s qualified players.</div>', body = '';
  const season = peek('standings')?.data?.season;
  if (season) note = note.replace('2026-27', esc(season));
  if (!got?.data) body = bad ? `<div class="lg-panel">${downCard(196)}</div>` : blocks();
  else if (!got.data.length) body = `<div class="lg-panel">${stateCard({ icon: 'clock', title: 'Leaders start after the first games', text: 'ESPN lists qualified players once the season is under way.', top: 210 })}</div>`;
  else {
    const t = listFor(got.data);
    if (t.wait) body = blocks();
    else if (t.cover) body = `<div class="lg-panel">${coverCard('Leaders are hidden', t.pin, revealBtn(t.pin.games, 'btn2'))}</div>`;
    else {
      list = sorted(t.rows);
      body = `<div class="ld-col" data-col>${card(list[0], c, list[1]?.value === list[0].value)}<div class="nb-lrows nb-tb">${rowsHtml(list)}</div></div>`;
    }
    // the copy's label under the column, its Reveal a button you move to (never the default focus)
    if (t.copy) {
      const [a, b] = t.pin.label.split(/,\s*/);
      note = `<div class="nb-catnote ld-note" style="top:412px"><span class="row-flex">${ic('eyeOff')}${esc(a)},</span><span style="margin-top:-8px">${esc(b || '')}</span><div data-row><span class="pillbtn fx nb-reveal" tabindex="-1" data-act="reveal" data-g="${t.pin.games.length === 1 ? esc(t.pin.game.id) : '*'}">${t.pin.games.length === 1 ? 'Reveal it' : `Reveal ${t.pin.games.length} results`}</span></div></div>`;
    } else if (bad) note = `<div class="nb-catnote ld-note" style="top:412px"><span class="row-flex">${ic('wifiOff')}ESPN isn’t answering</span>${fetchedAt(keyOf(cat)) ? `<span style="margin-top:-8px">showing ${hm(fetchedAt(keyOf(cat)))}</span>` : ''}<div data-row><span class="pillbtn fx" tabindex="-1" data-act="retry">${ic('refresh')}Try again</span></div></div>`;
  }
  setHtml($('.ld-note-box'), note);
  setHtml($('.ld-body'), body);
  const col = $('.ld-col');
  if (col) col.navHook = (dir) => (dir === 'left' ? focus($(`.nb-cats [data-cat="${cat}"]`)) : dir === 'right' ? false : undefined);
}

function pick(k, { now = false } = {}) {
  clearTimeout(dwell);
  if (k === cat) return;
  const go = () => { cat = k; want(keyOf(cat)); draw(); ctx.meta(); };
  if (now) go(); else dwell = setTimeout(() => { if (document.activeElement?.dataset?.cat === k) go(); }, 250);
}
const playerOf = (n) => list.find((p) => `pl:${p.id}` === n.dataset.key);
// The player sheet (another module; until it's there, a word instead of an error).
function open(p) {
  import('./player.js').then((m) => (m.openPlayer ? m.openPlayer(p, { from: 'leaders' }) : Promise.reject()))
    .catch(() => toast(`${p.name}’s card is coming in the next update.`));
}

export default {
  id: 'leaders',
  label: () => 'Leaders',
  mount(root, c) {
    el = root; ctx = c;
    root.classList.add('lg', 'lg-ld');
    root.innerHTML = '<div class="nb-cats" data-col></div><div class="ld-note-box"></div><div class="ld-body"></div>';
    // ▶ from the column goes to the card; ◀ from the card or a row goes back to the selected category
    $('.nb-cats').navHook = (dir) => {
      if (dir === 'right') { const to = $('.ld-col .nb-lead') || $('.ld-body .fx'); return to ? focus(to) : false; }
      if (dir === 'left') return false;
      return undefined;
    };
    root.addEventListener('tvfocus', (e) => {
      const k = e.target.dataset?.cat;
      if (k) pick(k); else clearTimeout(dwell);
    });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat],[data-act],[data-key]');
      if (!b) return;
      if (b.dataset.cat) return pick(b.dataset.cat, { now: true });
      if (b.dataset.act === 'retry') return want(keyOf(cat), { force: true });
      if (b.dataset.act === 'reveal') return reveal(b, draw);
      const p = playerOf(b);
      if (p) open(p);
    });
    root.addEventListener('tvhold', (e) => {
      const n = e.target.closest('[data-key]'), p = n && playerOf(n);
      if (p) contextMenu(n, [{ icon: 'chevR', label: `${names(p.abbr).name} page`, run: () => push('team', { abbr: p.abbr }) }]);
    });
    on('league', (k) => { if (k === keyOf(cat) || k === 'pin' || k.startsWith('schedule:')) { draw(); if (ctx.visible()) ctx.meta(); } });
    on('nba', draw);
    on('player-closed', () => { if (behind) { behind = false; draw(); } });
    onFinal((g) => { if (isMine(g)) setTimeout(() => want(keyOf(cat), { force: true }), 5 * 60e3); });   // 5 min after your team's final
  },
  enter() {
    want(keyOf(cat));
    if (favTeam()) want(`schedule:${favTeam()}`);   // the shield needs your team's games
    clearInterval(tick);
    // every minute: want() fetches when the list is over an hour old, or when the last try failed (ESPN down: 60 s)
    tick = setInterval(() => { if (ctx.visible()) want(keyOf(cat)); }, 60e3);
    draw();
    ctx.meta();
  },
  leave() { clearInterval(tick); clearTimeout(dwell); },
  entry: (root) => root.querySelector('.nb-cats .nb-cat.sel'),
  toTop() {},
  meta: () => (!peek(keyOf(cat))?.data && !failed(keyOf(cat)) ? 'Loading…' : espnMeta(keyOf(cat))),
};
