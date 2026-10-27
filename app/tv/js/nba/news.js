// The NBA tab's News section (design/ui-v1/nba-pages/SPEC.md 6): ESPN's stories, newest first, as a list on the left
// (6 rows of 60, scrolling in whole rows) and a preview of the focused one on the right (150 ms after focus settles,
// display only). OK opens the reader over the scrim; a story that would give away a game you haven't seen is covered
// (SPEC 8.3): its row and preview say so, and OK opens a card that names the game, with Keep it hidden focused.
// The team page's News rail uses storyCard() and openStory() from here.
import { esc, ic, dot, setHtml } from '../util.js';
import { on } from '../state.js';
import { storyCover, shieldParagraphs, unseenFor, favTeam, shieldMode, knownGames } from '../games.js';
import { peek, want, failed } from '../league.js';
import { watching } from '../player.js';
import { push } from '../router.js';
import { focus } from '../focus.js';
import { openOverlay } from '../ui.js';
import { tc, names, gameName, revealBtn, reveal, espnMeta, downCard, downNote, stateCard, skeleton } from './common.js';

const ROWS = 6, ROW = 64, LIST_H = 380, PREV_WAIT = 150, REFRESH = 60e3;
let el, ctx, first = 0, sel = 0, stories = [], prevT = 0, tick = 0, behind = false;

// ---------- words ----------
const TYPE = { HeadlineNews: 'News', Story: 'Story', Preview: 'Preview', Recap: 'Recap' };
const kindOf = (s) => TYPE[s.type] || 'Story';
export function ago(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  if (h < 48) return 'Yesterday';
  const d = Math.floor(h / 24);
  return d < 7 ? `${d} days ago` : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
// Whose story: your team when it's tagged, else the first team; 'NBA' with none or 4 and more (round-ups).
function who(s) {
  const t = s.teams || [];
  if (!t.length || t.length >= 4) return 'NBA';
  return names(t.includes(favTeam()) ? favTeam() : t[0]).name;
}
// The covered row's words: 'A Kings story' (the tagged team of the hidden game, yours first), else 'A story'.
function coverWho(s, g) {
  const both = [g.away.abbr, g.home.abbr].filter((a) => s.teams?.includes(a));
  const a = both.includes(favTeam()) ? favTeam() : both[0];
  return a ? `A ${names(a).name} story` : 'A story';
}
const nightDay = (t) => new Date(t - 6 * 3600e3).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
const hiddenNote = (n) => `${ic('eyeOff')}<span>Shield: ${n} paragraph${n === 1 ? '' : 's'} hidden</span>`;

// ---------- pictures ----------
// ESPN photos at 2x their display size through ESPN's resizer.
const sized = (url, w, h) => {
  try { const u = new URL(url); return u.host === 'a.espncdn.com' && u.pathname.startsWith('/photo/') ? `https://a.espncdn.com/combiner/i?img=${encodeURIComponent(u.pathname)}&w=${w}&h=${h}` : url; } catch { return url; }
};
// A story's two teams, away first: from the game it's tagged with when airglow knows it, else from the headline
// ('Phoenix visits Oklahoma City', 'Grizzlies at Jazz', 'Utah hosts Memphis'). { t: [abbrs], at: away/home is known }.
const reEsc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function placeIn(text, a) {
  const n = names(a), found = [n.name, n.city].filter(Boolean).map((w) => text.match(new RegExp(`\\b${reEsc(w)}\\b`, 'i'))).filter(Boolean);
  if (!found.length) return null;
  const m = found.sort((x, y) => x.index - y.index)[0];
  return { a, i: m.index, end: m.index + m[0].length };
}
function sides(s) {
  const t = s.teams || [];
  if (t.length !== 2) return { t: t.length === 1 ? t : [], at: false };
  const g = s.events?.length ? knownGames().find((x) => s.events.includes(x.id) && t.includes(x.home.abbr) && t.includes(x.away.abbr)) : null;
  if (g) return { t: [g.away.abbr, g.home.abbr], at: true };
  for (const text of [s.headline || '', s.description || '']) {
    const [x, y] = t.map((a) => placeIn(text, a));
    if (!x || !y) continue;
    const [p, q] = x.i < y.i ? [x, y] : [y, x], mid = text.slice(p.end, q.i);
    if (/\b(visits?|at|travels? to|heads? to)\b|@/i.test(mid)) return { t: [p.a, q.a], at: true };
    if (/\b(hosts?|welcomes?)\b/i.test(mid)) return { t: [q.a, p.a], at: true };
  }
  return { t, at: false };   // which side is home isn't known: the crests side by side, no 'at'
}
// The photo, or (none, or only ESPN's score graphic, which news() leaves out) the teams' crests: never the score.
function photo(s, w = 896, h = 504) {
  if (s.image) return `<img src="${esc(sized(s.image, w, h))}" alt="" decoding="async">`;
  const { t, at } = sides(s);
  if (!t.length) return '<div class="nb-noph"><i>NBA</i></div>';
  return `<div class="nb-noph">${t.map((a) => tc(a, '')).join(at ? '<i>at</i>' : '')}</div>`;
}

// ---------- the list and the preview ----------
const row = (s, i, g) => g
  ? `<div class="nb-nrow fx cov" tabindex="-1" data-key="n:${esc(s.id)}" data-i="${i}"><b>${ic('eyeOff')}${esc(coverWho(s, g))} · hidden by the shield</b><div class="m"><span>${esc(ago(s.published))}</span></div></div>`
  : `<div class="nb-nrow fx" tabindex="-1" data-key="n:${esc(s.id)}" data-i="${i}"><b>${esc(s.headline)}</b><div class="m"><span>${esc(who(s))}</span>${dot}${s.premium ? `<span class="nb-plus">ESPN+</span>${dot}` : ''}<span>${esc(ago(s.published))}</span></div></div>`;

function prevHtml(s) {
  if (!s) return '';
  const g = storyCover(s);
  if (g) return `<div class="ph"><div class="nb-cov">${ic('eyeOff')}<span>Hidden until you reveal<br>${esc(gameName(g))}</span></div></div><div class="lb">${esc(ago(s.published))}</div><h2>A story about ${esc(gameName(g))}, which you haven't seen</h2><p>OK explains and lets you reveal that game. Nothing of the story shows until you do.</p>`;
  const lb = [s.premium && '<span class="tag">ESPN+</span>', `<span>${esc(kindOf(s))}</span>`, `<span>${esc(ago(s.published))}</span>`, s.byline && `<span>${esc(s.byline)}</span>`].filter(Boolean);
  return `<div class="ph">${photo(s)}</div><div class="lb">${lb.join(dot)}</div><h2>${esc(s.headline)}</h2>${s.description ? `<p>${esc(s.description)}</p>` : ''}`;
}
const drawPrev = () => { if (el) setHtml(el.querySelector('.nb-prev'), prevHtml(stories[sel] || stories[0])); };

function draw() {
  if (!el || !ctx?.visible()) return;
  if (watching()) { behind = true; return; }   // nothing to see under the TV player; drawn once it closes
  const hit = peek('news'), bad = failed('news');
  stories = hit?.data || [];
  const list = el.querySelector('.nb-nlist'), st = el.querySelector('.nw-st');
  let state = '';
  if (!stories.length) {
    const none = !hit?.data;   // (a failed first fetch keeps an entry with no data)
    state = none && bad ? downCard(200)
      : none ? `${skeleton(ROWS, { top: 128, h: ROW, left: 48, width: 392 })}<div class="nb-sk" style="left:464px;top:128px;width:448px;height:224px;border-radius:16px"></div>${skeleton(3, { top: 364, h: 30, left: 464, width: 448 })}`
      : stateCard({ icon: 'clock', title: 'No ESPN stories in the last week', text: 'New stories show here as ESPN posts them.' });
  }
  const onRetry = st.contains(document.activeElement) || el.querySelector('.nw-down').contains(document.activeElement);
  setHtml(st, state);
  el.classList.toggle('nw-empty', !stories.length);
  setHtml(list, stories.map((s, i) => row(s, i, storyCover(s))).join(''));
  // ESPN isn't answering but the list is kept: the note and Try again where the preview's summary was (→ from the list)
  setHtml(el.querySelector('.nw-down'), stories.length && bad ? downNote('news') : '');
  el.classList.toggle('nw-down-on', !!(stories.length && bad));
  sel = Math.min(sel, Math.max(0, stories.length - 1));
  if (onRetry && stories.length) focus(list.children[sel] || list.firstElementChild);   // Try again worked: back on the list
  place();
  drawPrev();
  ctx.meta();
}
// Whole rows: the focused one keeps a row of margin to either edge when there's more; rows outside the six don't show.
function place(top = false) {
  const list = el.querySelector('.nb-nlist'), rows = [...list.children], n = rows.length;
  const i = top ? -1 : rows.indexOf(document.activeElement);
  if (i >= 0) { sel = i; first = Math.min(Math.max(first, i - (ROWS - 2)), i - 1); }
  first = Math.max(0, Math.min(first, n - ROWS));
  list.style.transform = first ? `translateY(${-first * ROW}px)` : '';
  rows.forEach((r, j) => r.classList.toggle('off', j < first || j >= first + ROWS));
  const bar = el.querySelector('.nb-sbar');
  bar.hidden = n <= ROWS;
  if (n > ROWS) { const t = bar.firstElementChild; t.style.top = `${(LIST_H * first) / n}px`; t.style.height = `${(LIST_H * ROWS) / n}px`; }
}

// What a shield needs to know about stories: the schedules (which games are unseen) and both rosters of each unseen game.
function wantShield() {
  if (shieldMode() === 'off') return;
  if (favTeam()) want(`schedule:${favTeam()}`);
  for (const g of unseenFor()) for (const a of [g.home.abbr, g.away.abbr]) want(`roster:${a}`);
}

// ---------- the reader (SPEC 6) ----------
let rd = null;   // { ov, s, y }
function body(s) {
  const d = peek(`story:${s.id}`)?.data, bad = failed(`story:${s.id}`);
  let paras, note = '';
  if (s.premium) { paras = [s.description]; note = 'The rest of this story is for ESPN+ subscribers.'; }
  else if (d?.paragraphs?.length) paras = d.paragraphs;
  else { paras = [s.description]; note = d ? '' : bad ? 'The rest of the story isn’t reachable: ESPN isn’t answering.' : 'Loading the story…'; }
  paras = paras.filter(Boolean);
  // scanned before anything shows (SPEC 8.3): a paragraph that would tell a result you haven't seen reads so
  const shown = shieldParagraphs(paras), hid = shown.filter((p) => p == null).length;
  const words = paras.join(' ').split(/\s+/).length, mins = d?.paragraphs?.length ? Math.max(1, Math.round(words / 230)) : 0;
  const lb = [`<span class="tag">${esc(kindOf(s))}</span>`, s.premium ? '<span class="tag">ESPN+</span>' : '', `<span>${esc(ago(s.published))}</span>`, mins ? `${dot}<span>${mins} min read</span>` : ''].join('');
  const by = [d?.byline || s.byline, 'ESPN'].filter(Boolean).map(esc).join('<span class="dot-sep" style="margin:0 8px"></span>');
  const text = shown.map((p, i) => (p == null ? `<p class="hidp">${ic('eyeOff')}<span>A result is hidden here</span></p>` : `<p${i ? '' : ' class="lede"'}>${esc(p)}</p>`)).join('');
  // its teams' pages at the end (up to 2; a round-up of 4 and more names none)
  const t = (s.teams || []).length >= 4 ? [] : [...new Set([...(s.teams || []).filter((a) => a === favTeam()), ...(s.teams || [])])].slice(0, 2);
  const btns = t.length ? `<div class="nb-rbtns" data-row>${t.map((a) => `<span class="btn2 fx" tabindex="-1" data-act="team" data-abbr="${esc(a)}">${esc(names(a).name)} page${ic('chevR')}</span>`).join('')}</div>` : '';
  return { hid, html: `<div class="ph">${photo(s, 1360, 765)}</div><div class="bd fx" tabindex="-1" data-body><div class="lb">${lb}</div><h1>${esc(s.headline)}</h1><div class="by">${by}</div>${text}${note ? `<p class="nb-rnote">${esc(note)}</p>` : ''}</div>${btns}` };
}
function readerFill() {
  if (!rd) return;
  const { hid, html } = body(rd.s), inner = rd.ov.el.querySelector('.in');
  rd.hid = hid;
  setHtml(inner, html);
  scrollTo(rd.y);
}
function scrollTo(y) {
  const r = rd.ov.el, inner = r.querySelector('.in'), vp = r.querySelector('.vp');
  const max = Math.max(0, inner.offsetHeight - vp.clientHeight);
  rd.y = Math.max(0, Math.min(max, y));
  inner.style.transform = rd.y ? `translateY(${-rd.y}px)` : '';
  const bar = r.querySelector('.rbar'), bh = bar.clientHeight;
  bar.hidden = !max;
  if (max) { const th = Math.max(24, (bh * vp.clientHeight) / inner.offsetHeight); bar.firstElementChild.style.cssText = `top:${((bh - th) * rd.y) / max}px;height:${th}px`; }
  const onBtn = !!document.activeElement?.closest('.nb-rbtns'), btn = r.querySelector('.nb-rbtns .btn2');
  const more = rd.y < max - 1 ? '▼ More' : onBtn ? '▲ The story' : btn ? `▼ ${btn.textContent}` : '';
  setHtml(r.querySelector('.foot'), `<span>${rd.hid ? `${hiddenNote(rd.hid)}&nbsp;·&nbsp;` : ''}Back closes</span>${esc(more)}`);
  return max;
}
function readerKey(k) {
  if (!rd) return false;
  const a = document.activeElement, r = rd.ov.el;
  if (a?.closest('.nb-rbtns')) {
    if (k === 'up') { focus(r.querySelector('.bd')); scrollTo(rd.y); return true; }
    return k === 'down';
  }
  if (k === 'left' || k === 'right') return true;
  if (k !== 'up' && k !== 'down') return false;
  const max = scrollTo(rd.y);
  if (k === 'down' && rd.y >= max - 1) { const b = r.querySelector('.nb-rbtns .fx'); if (b) { focus(b); scrollTo(max); } return true; }
  scrollTo(rd.y + (k === 'down' ? 240 : -240));
  return true;
}
function openReader(s) {
  const ov = openOverlay(`<div class="nb-read"><div class="vp nb-scroll"><div class="in" data-col></div></div><div class="fade"></div><div class="rbar"><i></i></div><div class="foot"></div></div>`, {
    onKey: readerKey,
    onClick: (act, t) => { if (act === 'team') { ov.close(); push('team', { abbr: t.dataset.abbr }); } },
    onClose: () => { if (rd?.ov === ov) rd = null; },
  });
  rd = { ov, s, y: 0, hid: 0 };
  readerFill();
  focus(ov.el.querySelector('.bd'));
  if (!s.premium) want(`story:${s.id}`);
}
// The card for a covered story: Keep it hidden (focused) and the named Reveal, which marks the game seen and opens it.
function coverCard(s, g) {
  const ov = openOverlay(`<div class="menu nb-covcard" data-col style="left:50%;top:50%;transform:translate(-50%,-50%);width:500px"><h3>This story is about a game you haven't seen</h3><p class="t-body" style="padding:0 8px 14px">${esc(gameName(g))}, ${esc(nightDay(g.date))}. Reveal it to read the story; the result also shows everywhere else in airglow.</p><div data-row class="row-flex" style="gap:20px;padding:4px 8px 4px"><span class="btn2 fx" tabindex="-1" data-act="keep">Keep it hidden</span>${revealBtn([g], 'btn2')}</div></div>`, {
    focusSel: '[data-act="keep"]',
    onClick: (act, t) => { ov.close(); if (act === 'reveal') reveal(t, () => openStory(s)); },
  });
  return ov;
}

// ---------- for the team page's News rail ----------
// A 272 x 153 news card for a rail (covered-aware): data-key "n:<id>", data-i.
export function storyCard(s, i) {
  const g = storyCover(s);
  if (g) return `<div class="nb-nc fx cov" tabindex="-1" data-key="n:${esc(s.id)}" data-i="${i}"><div class="nb-cov">${ic('eyeOff')}</div><div class="tx"><b>${esc(coverWho(s, g))} · hidden by the shield</b><span>${esc(ago(s.published))}</span></div></div>`;
  const m = [kindOf(s), s.premium && 'ESPN+', ago(s.published)].filter(Boolean).map(esc).join(' · ');
  return `<div class="nb-nc fx" tabindex="-1" data-key="n:${esc(s.id)}" data-i="${i}">${photo(s, 544, 306)}<div class="tx"><b>${esc(s.headline)}</b><span>${m}</span></div></div>`;
}
// OK on a story: the reader, or the card when it would give away a game you haven't seen.
export function openStory(s) {
  if (!s) return;
  const g = storyCover(s);
  return g ? coverCard(s, g) : openReader(s);
}

on('league', (k) => {
  if (rd && k === `story:${rd.s.id}`) readerFill();
  if (k === 'news' || k.startsWith('roster:') || k.startsWith('schedule:')) draw();
});
on('nba', () => draw());
on('player-closed', () => { if (behind) { behind = false; draw(); } });

export default {
  id: 'news',
  label: () => 'News',
  meta: () => (!peek('news')?.data && !failed('news') ? 'Loading…' : espnMeta('news')),
  mount(root, c) {
    el = root; ctx = c;
    root.innerHTML = `<div class="nb-nlist" data-col></div><div class="nb-sbar" style="right:auto;left:444px;top:${128}px;height:${LIST_H}px" hidden><i></i></div><div class="nb-prev"></div><div class="nw-down" data-row></div><div class="nw-st"></div>`;
    // the Try again pill (ESPN down, the list kept): Left or Down goes back to the list's row
    root.querySelector('.nw-down').navHook = (dir) => {
      if (dir !== 'left' && dir !== 'down') return undefined;
      const r = root.querySelector(`.nb-nrow[data-i="${sel}"]`) || root.querySelector('.nb-nrow');
      return r ? focus(r) : false;
    };
    root.addEventListener('tvfocus', (e) => {
      if (!e.target.closest('.nb-nlist')) return;
      place();
      clearTimeout(prevT);
      prevT = setTimeout(drawPrev, PREV_WAIT);   // display only: drawn once focus settles
    });
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="retry"]')) { want('news', { force: true }); return; }
      const r = e.target.closest('.nb-nrow');
      if (r) openStory(stories[+r.dataset.i]);
    });
  },
  enter(root) {
    want('news');
    wantShield();
    draw();
    clearInterval(tick);
    // every 10 min while shown (league.js says when it's that old); after a failure, every minute
    tick = setInterval(() => { if (ctx.visible() && !watching()) { want('news'); wantShield(); } }, REFRESH);
  },
  leave() { clearInterval(tick); clearTimeout(prevT); },
  entry: (root) => root.querySelector(`.nb-nrow[data-i="${sel}"]`) || root.querySelector('.nb-nrow') || root.querySelector('.nw-st [data-act="retry"]'),
  toTop(root) { first = 0; sel = 0; clearTimeout(prevT); if (root.querySelector('.nb-nlist').children.length) { place(true); drawPrev(); } },
};
