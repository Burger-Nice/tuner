// A title's page: full-bleed backdrop under a flat scrim, a column that flows, Play or Resume (focused), Save, the version
// pill (language and quality, remembered per title) and More like this; series add season chips and the episode row.
import { $, esc, ic, dot, tag, setHtml, fmtTime, leftText, sized } from '../util.js';
import { S, on, settings, saveSettings, isFav, toggleFav, progressOf, inProgress } from '../state.js';
import { catalog, defaultVersion, pickVersion, versionLabel, prettyCat } from '../catalog.js';
import { wideCard } from '../cards.js';
import { playVod, watching } from '../player.js';
import { push } from '../router.js';
import { focus } from '../focus.js';
import { openDetail } from '../actions.js';
import { openOverlay, radioMenu, toast } from '../ui.js';
import { titleCopies, copiesMenu, slotHooks, PUZZLE } from '../titlecopies.js';
import * as AD from '../addons.js';
import { SPIN } from './addons.js';

let el, t = null, ver = null, info = null, season = null, epFocus = null, my = 0;
// tc: this title's copies from every source (titlecopies.js; design/ui-v1/addons/SPEC.md 5). Inert with no stream add-on.
let tc = null, epT = 0;
const img = (url, w = 342) => (url ? `<img src="${esc(sized(url, w))}" alt="" decoding="async">` : '');
const SUBS = [['auto', 'Auto'], ['off', 'Off'], ['English', 'English'], ['Spanish', 'Spanish'], ['French', 'French'], ['German', 'German']];
const subLabel = () => SUBS.find(([v]) => v === (settings().subLang || 'auto'))?.[1] || 'Auto';

const infoCache = new Map();   // kind:id:version -> details, the last 30
// Seasons as shown: the provider's, or with add-ons the union with Cinemeta's (SPEC 5.8): provider episodes stay the
// provider's objects; an add-on-only episode is a stand-in carrying its row (e._row); season 0 is Specials, last.
const rowOf = new WeakMap();
let merged = null;
function seasonsList() {
  const base = info?.seasons || [];
  if (!tc?.active || !tc.eps?.length) return base;
  if (merged?.info === info && merged.eps === tc.eps && merged.match === tc.match) return merged.list;
  const rows = tc.episodes(base), by = new Map();
  for (const r of rows) {
    const e = r.prov || { kind: 'episode', id: r.vid.id, season: r.season, ep: r.ep, name: r.name, plot: r.vid.overview || '', duration: '', still: r.vid.thumbnail || '', seriesId: t.id, seriesName: t.name, poster: t.poster, _row: r };
    rowOf.set(e, r);
    if (!by.has(r.season)) by.set(r.season, []);
    by.get(r.season).push(e);
  }
  const list = [...by.entries()].map(([n, eps]) => ({ n, eps: eps.sort((a, b) => a.ep - b.ep) })).sort((a, b) => (+a.n === 0) - (+b.n === 0) || +a.n - +b.n);
  merged = { info, eps: tc.eps, match: tc.match, list };
  return list;
}
const seasonName = (n) => (+n === 0 ? 'Specials' : `Season ${n}`);
const notOut = (e) => !!e._row?.soon;
function episodes() { return seasonsList().flatMap((s) => s.eps); }
// Providers name episodes "Episode 1: Arrival", "Show - S01E01 - Arrival" or just "Episode 1": the title part only ('' if none).
const epName = (e) => { const n = String(e.name || '').replace(/^.*?\bS\d+\s*E\d+\b\s*[-:–.]?\s*/i, '').replace(/^(episode|ep\.?)\s*\d+\s*[-:–.]?\s*/i, '').trim(); return /^(episode|ep\.?)?\s*\d*$/i.test(n) ? '' : n; };
const epLine = (e) => `E${e.ep}${epName(e) ? ` · ${esc(epName(e))}` : ''}`;
// "00:52:10" or "3130" seconds as "52 min" / "1 h 5 min".
function epLen(d) {
  const m = String(d || '').match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  const min = m ? (m[3] != null ? +m[1] * 60 + +m[2] : +m[1]) + (m[3] != null && +m[3] >= 30 ? 1 : 0) : /^\d+$/.test(String(d)) ? Math.round(+d / 60) : 0;
  if (!min) return String(d || '');
  return min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`;
}
function seriesResume() {
  const eps = episodes();
  if (!eps.length) return null;
  let latest = null;
  for (const e of eps) { const p = progressOf(e); if (p && (!latest || p.at > latest.p.at)) latest = { e, p }; }
  const first = eps.find((e) => +e.season > 0 && !notOut(e)) || eps[0];
  if (!latest) return { ep: first, label: `Play S${first.season} · E${first.ep}` };
  if (inProgress(latest.p)) return { ep: latest.e, label: `Resume S${latest.e.season} · E${latest.e.ep}`, p: latest.p };
  const next = eps.slice(eps.indexOf(latest.e) + 1).find((e) => !notOut(e));
  return next ? { ep: next, label: `Play S${next.season} · E${next.ep}` } : { ep: eps[0], label: 'Watch again from S1 · E1' };
}

// More like this: the titles that share the most genres with this one (all of them, not only the first), the same series
// of films first, then the same provider category, a near year and a good rating as tie-breakers. One entry per title:
// other copies of the same film (another year bucket, another provider name for it) and of this one are left out.
// Scored once per title (tens of thousands of entries), not on every redraw.
const franchise = (s) => String(s || '').replace(/\s+(?:\d{1,2}|[ivx]{1,4}|part \d+|chapter \d+)$/, '');
function moreLikeThis() {
  const c = catalog[t.kind];
  if (!c?.titles) return [];
  if (el._moreFor === t && el._moreList) return el._moreList;
  const gs = new Set(t._genres || []), me = franchise(t._s), yr = +t.year || 0;
  // the best 12 others and the best 4 of the same series of films (so the row always has something new in it)
  const top = { fam: [], other: [] }, CAP = { fam: 4, other: 12 };
  for (const x of c.titles) {
    if (x === t || x._sep || !x._s || x._s === t._s) continue;
    let shared = 0;
    for (const g of x._genres || []) if (gs.has(g)) shared++;
    const fam = me.length > 3 && franchise(x._s) === me;
    if (!shared && !fam && x.cat !== t.cat) continue;
    const union = gs.size + (x._genres?.length || 0) - shared || 1;
    let sc = (4 * shared) / union + (fam ? 3 : 0) + (x.cat === t.cat ? 0.8 : 0);
    if (yr && +x.year) sc += Math.max(0, 1 - Math.abs(yr - x.year) / 15) * 0.6;
    sc += ((x._ir || parseFloat(x.rating) || 0) / 10) * 0.8 + Math.min(1, Math.log10((x._iv || 0) + 1) / 6) * 0.6;
    const k = fam ? 'fam' : 'other', l = top[k];
    if (l.length === CAP[k] && sc <= l[l.length - 1][0]) continue;
    l.push([sc, x]);
    l.sort((p, q) => q[0] - p[0]);
    if (l.length > CAP[k]) l.pop();
  }
  const seen = new Set(), out = [];
  for (const [, x] of [...top.fam, ...top.other].sort((p, q) => q[0] - p[0])) if (!seen.has(x._s)) { seen.add(x._s); out.push(x); }
  el._moreFor = t; el._moreList = out.slice(0, 10);
  return el._moreList;
}

let behind = false;
on('player-closed', () => { if (behind) { behind = false; draw(); } });
function draw() {
  if (watching()) { behind = true; return; }   // nothing to see under the TV player; drawn once it closes
  if (!t) return;
  const movie = t.kind === 'movie';
  const d = info || {};
  const genres = (t._genres?.length ? t._genres : d.genre ? String(d.genre).split(/[,/]/).map((x) => x.trim()) : []).slice(0, 3);
  const cat = catalog[t.kind]?.catName.get(t.cat);
  const eyebrow = [movie ? 'Movie' : 'Series', genres.join(' · ') || (cat ? prettyCat(cat).name : '')].filter(Boolean).join(dot);
  const rating = t._ir ? t._ir.toFixed(1) : d.rating || t.rating;
  const seasons = d.seasons?.length;
  const meta = [rating ? `<span class="star">${ic('star')}${esc(rating)}</span>` : '', d.year || t.year ? `<span>${esc(d.year || t.year)}</span>` : '', movie && d.duration ? `<span>${esc(d.duration)}</span>` : '', !movie && seasons ? `<span>${seasons} season${seasons > 1 ? 's' : ''}</span>` : '']
    .filter(Boolean).join(dot);
  const on = !!tc?.active, best = on && movie ? tc.best() : null;
  const tags = on && best ? tc.tags(best) : [ver?._q === '4K' ? tag('4K', 'q') : ver?._q === 'Full HD' ? tag('HD', 'q') : '', ver?._hdr ? tag('HDR', 'q') : '', ver?._lang ? tag(ver._lang.slice(0, 2).toUpperCase()) : ''].join('');
  const p = movie ? resumePoint() : null;
  const resume = movie && inProgress(p);
  let play = '';
  const wait = on && tc.waiting(), nothing = on && movie && !t.versions.length ? tc.nothing() : '';
  if (movie && wait) play = `<span class="btn fx ad-wbtn" tabindex="-1" data-act="play">${ringSvg(wait)}Playing in ${wait.left()} s</span>`;
  else if (movie && nothing) play = `<span class="btn fx" tabindex="-1" data-act="again">${ic('refresh')}Look again</span>`;
  else if (movie && on && !best) play = `<span class="btn fx" tabindex="-1" data-act="wait">${SPIN}${tc.asking().length || !tc.match ? 'Looking for copies…' : 'No copy yet'}</span>`;
  else if (movie) play = resume ? `<span class="btn fx" tabindex="-1" data-act="play">${ic('play')}Resume ${fmtTime(p.t)}</span><span class="btn2 fx" tabindex="-1" data-act="restart">${ic('restart')}Start over</span>` : `<span class="btn fx" tabindex="-1" data-act="play">${ic('play')}Play</span>`;
  else { const r = info && episodes().length && seriesResume(); play = r ? `<span class="btn fx" tabindex="-1" data-act="play">${ic('play')}${esc(r.label)}</span>` : `<span class="btn fx" tabindex="-1" data-act="wait">${ic('play')}${info ? 'No episodes' : 'Loading…'}</span>`; }
  const saved = isFav(t);
  const credits = [d.director ? `Directed by <span class="t-2">${esc(d.director)}</span>` : '', d.cast ? `<span class="t-2">${esc(d.cast)}</span>` : ''].filter(Boolean).join(dot);
  // the pill-row slot, one text by priority (SPEC 5.1): 1 the time left, 2 who is still asking, 3 the subtitles' text
  const slot = resume ? leftText(p.d - p.t) : on ? tc.slot() || slotHooks.subtitles?.(t, info) || tc.matchNote() : '';
  const vpill = on ? (tc.pillShows() ? `<span class="pillbtn fx" tabindex="-1" data-act="version">${tc.pillHtml()}</span>` : '') : t.versions.length > 1 ? `<span class="pillbtn fx" tabindex="-1" data-act="version">${ic('film')}${esc(versionLabel(ver))} ${ic('chevD')}</span>` : '';
  const pills = `${vpill}<span class="pillbtn fx" tabindex="-1" data-act="subs">${ic('cc')}Subtitles: ${esc(subLabel())}</span>${slot ? `<span class="st-side">${slot}</span>` : ''}`;
  const wcap = wait ? '<span class="ad-wcap">Looking for a better copy · <b>OK</b> plays this one now · <b>Back</b> stops</span>' : '';
  const backdrop = d.backdrop || t.poster;
  let below = '';
  if (movie) {
    const more = moreLikeThis();
    below = more.length ? `<div class="abs rowtitle" style="left:48px;top:366px;font-size:20px">More like this</div><div class="rail abs" style="top:400px;left:0;right:0"><div class="track" data-row data-more>${more.map((x, i) => wideCard(x, i)).join('')}</div></div>` : '';
    el._more = more;
  } else if (seasonsList().length) {
    const all = seasonsList();
    const r = seriesResume();
    if (!season || !all.some((s) => s.n === season)) season = r?.ep.season || all[0].n;
    const s = all.find((x) => x.n === season);
    const fe = epFocus && s.eps.includes(epFocus) ? epFocus : r?.ep && s.eps.includes(r.ep) ? r.ep : s.eps[0];
    const eps = s.eps.map((e, i) => {
      const ep = progressOf(e), done = ep && (ep.done || ep.t >= ep.d * 0.94), part = inProgress(ep);
      const only = e._row ? `<span class="ad-only">${PUZZLE}Add-on</span>` : '';
      const len = notOut(e) ? `Out ${new Date(e._row.soon).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}` : part ? leftText(ep.d - ep.t) : epLen(e.duration);
      return `<div class="ep fx${done ? ' done' : ''}${notOut(e) ? ' soon' : ''}" tabindex="-1" data-ep="${i}" data-key="ep:${esc(e.season)}:${esc(e.ep)}:${esc(e.id)}"><div class="th"><div class="art">${img(e.still || t.poster)}</div><span class="num">${e.ep}</span>${only}${done ? `<span class="chk">${ic('check')}</span>` : ''}${part ? `<div class="prog flush"><i style="width:${Math.min(100, (ep.t / ep.d) * 100)}%"></i></div>` : ''}</div><div class="eb"><b>${esc(epName(e) || `Episode ${e.ep}`)}</b><span>${esc(len)}</span></div></div>`;
    }).join('');
    // (many seasons: the chips slide so the focused one stays on screen, see placeTracks)
    below = `<div class="abs seas" data-row style="left:48px;right:48px;top:272px;clip-path:inset(-12px -12px -12px -8px)"><div class="seas-in" style="display:flex;gap:8px;transition:transform 200ms var(--a-ease)">${all.map((x) => `<span class="chip lg fx${x.n === season ? ' sel' : ''}" tabindex="-1" data-season="${esc(x.n)}">${esc(seasonName(x.n))}</span>`).join('')}<span class="t-cap" style="align-self:center;margin-left:8px;white-space:nowrap">${s.eps.length} episode${s.eps.length > 1 ? 's' : ''}</span></div></div>
      <div class="rail abs" style="top:318px;left:0;right:0"><div class="track" data-row data-eps data-entry='[data-ep="${s.eps.indexOf(fe)}"]' style="gap:24px">${eps}</div></div>
      <div class="abs epsyn" data-syn style="left:48px;top:486px;width:864px">${synLine(fe)}</div>`;
  } else if (info?.error) below = `<div class="abs t-body" style="left:48px;top:300px">${esc(info.error)}</div>`;
  else if (!movie) below = `<div class="abs t-cap" style="left:48px;top:300px">Loading episodes…</div>`;
  setHtml(el, `<div class="d-back"><div class="art">${img(backdrop, 1280)}</div><div class="d-scrim"></div></div><div class="d-scrim2"${movie ? '' : ' style="height:300px"'}></div>
<div class="d-col"${movie ? '' : ' style="top:32px"'}>
  <div class="t-label t-2">${eyebrow}</div>
  <div class="t-display clamp2" data-ttl style="margin-top:6px">${esc(t.name)}</div>
  <div class="metaline" style="margin-top:10px">${meta}${meta && tags ? dot : ''}${tags}</div>
  ${d.plot ? `<div data-row style="margin-top:12px"><div class="t-body clamp2 plotfx" data-plot data-act="about" style="width:460px">${esc(d.plot)}</div></div>` : `<div class="t-body" style="margin-top:12px;color:var(--a-text-3)">${info ? (movie && info.error ? esc(info.error) : '') : 'Loading details…'}</div>`}
  ${movie && credits ? `<div class="t-cap ellipsis" style="margin-top:8px;width:500px">${credits}</div>` : ''}
  ${t.addon ? `<div class="t-cap" style="margin-top:8px;display:flex;align-items:center;gap:6px">${PUZZLE.replace('class="ic"', 'class="ic xs"')}Not on your provider · details from ${esc(info?.from || 'Cinemeta')}</div>` : ''}
  ${nothing ? `<div class="t-body" style="margin-top:8px;width:640px;color:var(--a-text-2)">${esc(nothing)}</div>` : ''}
  <div class="row-flex" data-row style="gap:20px;margin-top:${movie ? 20 : 16}px;height:44px;padding-left:2px">${play}<span class="btn2 fx" tabindex="-1" data-act="save">${ic(saved ? 'check' : 'saved')}${saved ? 'Saved' : 'Save'}</span>${wcap}${movie ? '' : seriesPill() || `<span class="pillbtn fx" tabindex="-1" data-act="subs">${ic('cc')}Subtitles: ${esc(subLabel())}</span>`}</div>
  ${movie ? `<div class="row-flex" data-row style="gap:10px;margin-top:12px;height:36px">${pills}</div>` : ''}
</div>${below}`);
  fitCol(movie);
  placeTracks();
}
// A copy's resume point: the provider version's, or (an add-on copy played before) the title's IMDb key (SPEC 8.3)
function resumePoint() {
  const a = ver ? progressOf(ver) : null;
  const id = tc?.match?.id || (t.addon ? t.id : '');
  const b = id ? progressOf({ kind: 'movie', id }) : null;
  return a && b ? (a.at >= b.at ? a : b) : a || b;
}
// the wait's countdown ring (RANKING.md 3.2): the remaining share of 4 s
function ringSvg(w) {
  const f = Math.max(0, Math.min(1, (w.until - Date.now()) / 4000)), c = 2 * Math.PI * 9;
  return `<svg class="ad-ring" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="9" fill="none" stroke="rgba(20,16,31,.25)" stroke-width="3"/><circle cx="11" cy="11" r="9" fill="none" stroke="var(--a-ink)" stroke-width="3" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 11 11)" stroke-linecap="round"/></svg>`;
}
const playRow = () => { const r = info && episodes().length ? seriesResume() : null; return r ? rowOf.get(r.ep) || { prov: r.ep, season: r.ep.season, ep: r.ep.ep, name: r.ep.name, vid: null } : null; };
// a series: the pill names the copy for the episode Play would play (· S3 · E4)
function seriesPill() {
  if (!tc?.active || !tc.eps) return '';
  const row = playRow(); if (!row) return '';
  if (row.vid) tc.askEpisode(row);
  const list = tc.episodeCopies(row);
  if (!(list.length >= 2 || (list.length === 1 && tc.episodeAsking(row).length))) return '';
  return `<span class="pillbtn fx" tabindex="-1" data-act="version">${tc.pillHtml(list[0], list.length, ` · S${row.season} · E${row.ep}`)}</span>`;
}
// the focused episode's one line: its name and plot, its best copy at the right (SPEC 5.8)
function synLine(e) {
  const row = rowOf.get(e), best = row && tc?.active ? tc.episodeCopies(row)[0] : null;
  const right = best && best.source !== 'provider' ? `<span class="ad-r">${esc([best.claim.res, best.claim.dv ? 'Dolby Vision' : best.claim.hdr ? 'HDR10' : ''].filter(Boolean).join(' ') || 'Copy')} · ${esc(best.source)}</span>` : row?.soon ? `<span class="ad-r">Not out yet</span>` : '';
  return `${right}<b>${epLine(e)}</b>${e.plot ? `${dot}${esc(e.plot)}` : ''}`;
}
// The text column never runs into what's below it (More like this for a film, the seasons for a series): a long plot
// goes to one line, then a long title gets smaller, and the last few pixels move the row below down a little.
// The whole description, with the credits and facts the page has no room for. ▲▼ scroll it when it's long.
function aboutSheet() {
  const d = info || {}, movie = t.kind === 'movie';
  const genres = t._genres?.length ? t._genres : d.genre ? String(d.genre).split(/[,/]/).map((x) => x.trim()).filter(Boolean) : [];
  const facts = [d.year || t.year, movie ? d.duration : d.seasons?.length ? `${d.seasons.length} season${d.seasons.length > 1 ? 's' : ''}` : '', t._ir ? `IMDb ${t._ir.toFixed(1)}` : d.rating ? `Rated ${d.rating}` : ''].filter(Boolean).map(esc).join(dot);
  const part = (h, v) => (v ? `<div class="sec">${h}</div><div class="t-body" style="color:var(--a-text-2)">${esc(v)}</div>` : '');
  const ov = openOverlay(`<div class="sheet about" style="width:520px"><h3 class="clamp2">${esc(t.name)}</h3>${facts ? `<div class="t-cap" style="margin-top:-4px">${facts}</div>` : ''}
    <div class="sheet-body"><div class="inner fx" tabindex="-1" data-col style="outline:none">
      <div class="t-body" style="white-space:pre-line">${esc(d.plot || 'No description from your provider.')}</div>
      ${part('Genres', genres.join(' · '))}${part('Directed by', d.director)}${part('Cast', d.cast)}
    </div></div><div class="t-cap" data-more style="text-align:right"></div></div>`, {
    focusSel: '.inner',
    onKey: (k) => {
      if (k !== 'up' && k !== 'down') return false;
      const inner = ov.el.querySelector('.inner'), box = inner.parentElement;
      const max = Math.max(0, inner.scrollHeight - box.clientHeight + 16);
      const y = Math.max(0, Math.min(max, (inner._y || 0) + (k === 'down' ? 120 : -120)));
      inner._y = y; inner.style.transform = `translateY(${-y}px)`;
      hint();
      return true;
    },
  });
  const hint = () => {
    const inner = ov.el.querySelector('.inner'), box = inner.parentElement, y = inner._y || 0;
    const more = inner.scrollHeight - box.clientHeight + 16 - y > 4;
    ov.el.querySelector('[data-more]').textContent = more ? '▼ More' : y > 0 ? '▲ Back to the top' : '';
  };
  hint();
}
function fitCol(movie) {
  const col = el.querySelector('.d-col');
  const below = movie ? [...el.querySelectorAll('.rowtitle, .rail')] : [...el.querySelectorAll('.seas, .rail, .epsyn')];
  if (!col || !below.length) return;
  const limit = (movie ? 366 : 272) - 14, room = movie ? 16 : 44;
  const bottom = () => col.offsetTop + col.offsetHeight;
  if (bottom() > limit) col.querySelector('[data-plot]')?.classList.add('clamp1');
  if (bottom() > limit) col.querySelector('[data-ttl]')?.classList.add('shrink');
  // a description that doesn't fit is reachable (▲ from the buttons): OK reads all of it
  const pl = col.querySelector('[data-plot]');
  if (pl) { const cut = pl.scrollHeight > pl.clientHeight + 2 || !!(info?.cast || info?.director); pl.classList.toggle('fx', cut); if (cut) pl.tabIndex = -1; else pl.removeAttribute('tabindex'); }
  const push = Math.max(0, Math.min(room, bottom() - limit));
  for (const b of below) { b.style.top = `${(b._top ??= parseFloat(b.style.top)) + push}px`; }
  // (pushed far, the episode's one-line summary under the row would run off the screen: it steps aside)
  const syn = el.querySelector('.epsyn');
  if (syn) syn.hidden = push > 24;
}
function placeTracks() {
  const a = document.activeElement;
  el.querySelectorAll('.track').forEach((tr) => {
    // (the episode row starts scrolled to its entry: the episode you're on)
    const f = tr.contains(a) ? a : tr._mem?.isConnected ? tr._mem : tr.dataset.entry ? tr.querySelector(tr.dataset.entry) : null;
    const n = tr.children.length, w = tr.hasAttribute('data-eps') ? 224 : 222;
    // the focused card stays third from the left, but the row never slides past its last card
    const i = Math.min(f ? [...tr.children].indexOf(f) : 0, Math.max(2, n - Math.floor((864 + 24) / w) + 2));
    tr.style.transform = i > 2 ? `translateX(${-(i - 2) * w}px)` : '';
  });
  // the season chips slide sideways when there are more than fit
  const sin = el.querySelector('.seas-in');
  if (sin) {
    const c = sin.contains(a) ? a : sin.querySelector('.chip.sel');
    const shift = c ? Math.max(0, c.offsetLeft + c.offsetWidth - (864 - 120)) : 0;
    sin.style.transform = shift ? `translateX(${-shift}px)` : '';
  }
}

function play(restart) {
  if (t.kind === 'movie') return playVod(ver, { restart });
  const r = seriesResume();
  if (r) playVod(r.ep, { queue: episodes() });
}
function versionSheet() {
  const vs = [...t.versions];
  radioMenu({
    title: 'Version', value: ver.id, style: 'left:48px;top:150px;width:520px',
    rows: vs.map((v) => ({ v: v.id, l: versionLabel(v), sub: v._title !== t.name ? v.name.slice(0, 28) : '' })),
    extra: '<div class="t-cap" style="padding:8px 8px 2px">Default: your language at the best quality. Remembered per title.</div>',
    onPick: (id) => { ver = vs.find((v) => v.id === id) || ver; pickVersion(t, ver); draw(); focus(el.querySelector('[data-act="version"]')); },
  });
}
function subsMenu() {
  radioMenu({
    title: 'Subtitles', value: settings().subLang || 'auto', style: 'left:48px;top:150px;width:360px',
    rows: SUBS.map(([v, l]) => ({ v, l })),
    extra: '<div class="t-cap" style="padding:8px 8px 2px">Used when the file has them. Change it in the player with ▼.</div>',
    onPick: (v) => { saveSettings({ subLang: v }); draw(); focus(el.querySelector('[data-act="subs"]')); },
  });
}

export default {
  name: 'detail',
  bar: false,
  mount(root) {
    el = root;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act],[data-season],[data-ep],.wc');
      if (!b || !t) return;
      if (b.dataset.season) { season = b.dataset.season; epFocus = null; draw(); focus(el.querySelector(`[data-season="${CSS.escape(season)}"]`)); return; }
      if (b.dataset.ep != null) { const s = info.seasons.find((x) => x.n === season); return playVod(s.eps[+b.dataset.ep], { queue: episodes() }); }
      if (b.classList.contains('wc')) { const x = el._more?.[+b.dataset.i]; if (x) openDetail(x); return; }
      const act = b.dataset.act;
      if (act === 'play') play(false);
      else if (act === 'restart') play(true);
      else if (act === 'save') { const on = toggleFav(t); toast(on ? `Saved ${t.name}` : `Removed ${t.name} from Saved`); draw(); focus(el.querySelector('[data-act="save"]')); }
      else if (act === 'version') versionSheet();
      else if (act === 'subs') subsMenu();
      else if (act === 'about') aboutSheet();
    });
    root.addEventListener('tvfocus', (e) => {
      placeTracks();
      const ep = e.target.closest('.ep');
      if (ep && info) {
        const s = info.seasons.find((x) => x.n === season);
        epFocus = s.eps[+ep.dataset.ep];
        const syn = el.querySelector('[data-syn]');
        if (syn) syn.innerHTML = `<b>${epLine(epFocus)}</b>${epFocus.plot ? `${dot}${esc(epFocus.plot)}` : ''}`;
      }
    });
    on('progress', () => { if (!el.hidden) draw(); });
  },
  async enter(root, params, { fresh }) {
    if (params.title && (fresh || params.title !== t)) {
      t = params.title; ver = defaultVersion(t); season = null; epFocus = null;
      // Details seen this session are kept (Back through More like this doesn't load each page again, and the router
      // can put focus back on the card you opened).
      const ck = `${t.kind}:${t.id}:${ver?.id || ''}`;
      info = infoCache.get(ck) || null;
      const mine = ++my;
      draw();
      if (info) return;
      try {
        const d = t.kind === 'movie' ? await S.src.movieInfo(ver) : await S.src.seriesInfo({ id: t.id, name: t.name, poster: t.poster });
        if (mine !== my) return;
        info = d;
        infoCache.set(ck, d);
        if (infoCache.size > 30) infoCache.delete(infoCache.keys().next().value);
      } catch (e) { if (mine !== my) return; info = { error: e.message, seasons: [] }; }
      const inside = root.contains(document.activeElement);
      draw();   // (keeps focus on the same control)
      if (!inside || !root.contains(document.activeElement)) focus(root.querySelector('[data-act="play"]') || root.querySelector('.btn'));
    } else draw();
  },
  entry: (root) => root.querySelector('[data-act="play"]') || root.querySelector('.btn'),
};
