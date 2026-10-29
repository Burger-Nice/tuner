// The title page (SPEC 3.5, 05): the backdrop, the eyebrow, the logo (else the name), the facts, the plot (two lines,
// tap expands), the pill (Play / Resume / Resume S1 · E3) beside Save, the copy line, seasons and episodes.
// Copies are titlecopies.js's (the provider's and the add-ons', one ranking) with the plays-here term first (SPEC
// 0.11a): MP4 / HLS before MKV; when no copy plays on the iPhone the pill is Open in Infuse and the line says why.
import { sized } from '../tv/js/util.js';
import { S, on, progressOf, inProgress, isFav, toggleFav } from '../tv/js/state.js';
import { prefLangs, defaultVersion } from '../tv/js/catalog.js';
import { titleCopies } from '../tv/js/titlecopies.js';
import { rank, copyLine } from '../tv/js/copies.js';
import { playVod } from '../tv/js/player.js';
import { videoMask } from '../tv/js/catchup.js';
import { openVideoGame } from '../tv/js/replay.js';
import * as AD from '../tv/js/addons.js';
import * as SH from '../tv/js/shelves.js';
import { toast } from '../tv/js/ui.js';
import { ic, esc, push, back, isShown, menu, longPress, facts } from './ui.js';
import { playsHere, handOff, infuseUrl, vlcUrl } from './streams.js';
import { posterCard } from './cards.js';
import * as TM from '../tv/js/tmdb.js';

// The version line in words (the design's: `4K · Dolby Vision · 5.1`): the best copy's quality, never its add-on or count
function friendly(c) {
  const k = c.checked, res = (k && k.res) || c.claim.res || '';
  const range = k ? (k.dv ? 'Dolby Vision' : k.hdr ? 'HDR' : '') : c.claim.dv && !(c.claim.kind === 'bluray' || c.claim.remux) ? 'Dolby Vision' : c.claim.dv || c.claim.hdr ? 'HDR' : '';
  const snd = k ? (k.ch >= 8 ? '7.1' : k.ch >= 6 ? '5.1' : '') : '';
  const lang = (k && k.lang) || c.lang || '';
  const out = [res, range, snd, lang && !['English', 'Multi'].includes(lang) ? lang : ''].filter(Boolean);
  return out.length ? out : [c.source === 'provider' ? 'Your provider' : 'Ready to play'];
}
function creditsHtml() {
  const d = info || {};
  const rows = [d.director ? `<div><b>Directed by</b> ${esc(d.director)}</div>` : '', d.cast ? `<div><b>Cast</b> ${esc(String(d.cast).split(/,\s*/).slice(0, 6).join(', '))}</div>` : ''].filter(Boolean);
  return rows.length ? `<div class="credits">${rows.join('')}</div>` : '';
}
function moreHtml() {
  if (!more?.length) return '';
  return `<div class="row dt-more-h"><div class="sec-h">More like this</div><div class="cards">${more.map((x, i) => posterCard(x, i).replace('class="poster"', `class="poster" data-more="${i}"`)).join('')}</div></div>`;
}
// More like this (the TV's row): TMDB's recommendations with the key, else Cinemeta's best of the same genre, and the
// add-ons' own "watch next" links; never the title itself
async function loadMore(tt, mine) {
  const kind = tt.kind === 'series' ? 'series' : 'movie';
  const imdb = tc?.match?.id || (String(tt.id).startsWith('tt') ? tt.id : '');
  let list = [];
  try {
    if (TM.hasKey()) {
      let id = info?.tmdb || tt.tmdb || '';
      if (!id && imdb) id = (await TM.findByImdb(imdb).catch(() => null))?.tmdb || '';
      if (id) list = await TM.recommendations(kind, id).catch(() => []);
    }
    if (!list.length) {
      const g = (tt._genres || String(info?.genre || '').split(/,\s*/))[0];
      if (g) list = await SH.cinemeta(kind, 'top', { genre: SH.canon(g) }).catch(() => []);
    }
  } catch { /* none */ }
  if (mine !== my) return;
  more = list.filter((x) => x && x.poster && (x.imdb || x.id) !== imdb && x.name !== tt.name).slice(0, 16);
  if (more.length) draw();
}

let el, t = null, info = null, tc = null, season = null, my = 0, open = false, more = null;
const linkOf = (c) => (c ? (c.source === 'provider' ? c.v?.url : c.url) : '');
const here = (c) => playsHere({ url: linkOf(c), filename: c?.filename, mime: '' });
// the iPhone's ranking: plays here first (the TV's key 3, playsNow), the TV's order after it
function phoneRanking(x) {
  const base = x.rankCtx;
  x.rankCtx = () => { const c = base(); const was = c.playsNow; return { ...c, playsNow: (cp) => (here(cp) ? was?.(cp) : false) }; };
  const be = x.episodeCopies;
  x.episodeCopies = (row) => rank(be(row), { langs: prefLangs(), playsNow: (cp) => (here(cp) ? undefined : false) });
  return x;
}

// Open a title from a row, the library, search: an add-on item (its IMDb id first) or a provider title.
export async function openTitle(it) {
  if (!it) return;
  if (it.versions) return showTitle(it);
  const slow = setTimeout(() => toast(`Opening ${it.name}…`, 1500), 600);
  const tt = await SH.titleOf(it).catch(() => null);
  clearTimeout(slow);
  if (!tt) { toast(`airglow couldn't find ${it.name}'s details right now`, 3500); return; }
  showTitle(tt);
}
function showTitle(tt) {
  const mk = videoMask(tt);
  if (mk?.kind === 'game') return openVideoGame(mk.g, tt.versions?.[0] || tt);   // a hidden game's full game: its game page
  push('detail', { title: tt });
}
async function addonInfo(x) {
  const m = await AD.meta(x.addon.type || x.kind, x.id);
  if (!m) return { error: 'No details for this title', seasons: [] };
  if (m.genres?.length && !x._genres?.length) x._genres = m.genres;
  if (m.imdbRating && !x._ir) x._ir = parseFloat(m.imdbRating) || 0;
  const mins = m.runtime;
  return { plot: m.description, genre: (m.genres || []).join(', '), cast: (m.cast || []).slice(0, 6).join(', '), director: (m.director || []).join(', '), tmdb: m.moviedb ? String(m.moviedb) : '', year: m.year ? String(m.year) : '', duration: mins ? (mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`) : '', rating: m.imdbRating, backdrop: m.background || m.poster, logo: m.logo, seasons: [] };
}
// seasons as shown: the provider's, or the union with Cinemeta's when add-ons are on (titlecopies mergeEpisodes)
const rowOf = new WeakMap();
function seasonsList() {
  const base = info?.seasons || [];
  if (!tc?.active || !tc.eps?.length) { for (const s of base) for (const e of s.eps) rowOf.set(e, { prov: e, season: e.season, ep: e.ep, name: e.name, vid: null }); return base; }
  const rows = tc.episodes(base), by = new Map();
  for (const r of rows) {
    const e = r.prov || { kind: 'episode', id: r.vid.id, season: r.season, ep: r.ep, name: r.name, plot: r.vid.overview || '', duration: '', still: r.vid.thumbnail || '', seriesId: t.id, seriesName: t.name, poster: t.poster, _row: r };
    rowOf.set(e, r);
    if (!by.has(r.season)) by.set(r.season, []);
    by.get(r.season).push(e);
  }
  return [...by.entries()].map(([n, eps]) => ({ n, eps: eps.sort((a, b) => a.ep - b.ep) })).sort((a, b) => (+a.n === 0) - (+b.n === 0) || +a.n - +b.n);
}
const epProg = (e) => progressOf(e) || (e._row?.vid ? progressOf({ kind: 'episode', id: e._row.vid.id }) : null) || (e.id && /^tt/.test(e.id) ? progressOf({ kind: 'episode', id: e.id }) : null);
function seriesResume() {
  const eps = seasonsList().flatMap((s) => s.eps);
  if (!eps.length) return null;
  let best = null;
  for (const e of eps) { const p = epProg(e); if (p && (!best || p.at > best.p.at)) best = { e, p }; }
  if (!best) return { e: eps[0], verb: 'Play', label: `S${eps[0].season} · E${eps[0].ep}` };
  if (inProgress(best.p)) return { e: best.e, verb: 'Resume', label: `S${best.e.season} · E${best.e.ep}` };
  const i = eps.indexOf(best.e), nx = eps[i + 1];
  return nx ? { e: nx, verb: 'Play', label: `S${nx.season} · E${nx.ep}` } : { e: best.e, verb: 'Play', label: `S${best.e.season} · E${best.e.ep}` };
}
const epName = (e) => { const n = String(e.name || '').replace(/^.*?\bS\d+\s*E\d+\b\s*[-:–.]?\s*/i, '').replace(/^(episode|ep\.?)\s*\d+\s*[-:–.]?\s*/i, '').trim(); return /^(episode|ep\.?)?\s*\d*$/i.test(n) ? `Episode ${e.ep}` : n; };
function epLen(d) {
  const m = String(d || '').match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  const min = m ? (m[3] != null ? +m[1] * 60 + +m[2] : +m[1]) : /^\d+$/.test(String(d)) ? Math.round(+d / 60) : 0;
  return !min ? '' : min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min} min`;
}

function draw() {
  if (!el || !t) return;
  const movie = t.kind === 'movie';
  const best = tc?.active ? tc.best() : null;
  const all = tc?.active ? tc.copies() : [];
  const bg = info?.backdrop || tc?.meta?.background || t.poster;
  const logo = tc?.meta?.logo || info?.logo || '';
  const genres = (t._genres?.length ? t._genres : String(info?.genre || '').split(/,\s*/)).filter(Boolean).slice(0, 3);
  const rating = t._ir || parseFloat(info?.rating) || 0;
  const seasons = movie ? [] : seasonsList();
  const fs = [rating ? { html: `${ic('star', 'f')}${rating.toFixed(1)}` } : '', info?.year || t.year || '', movie ? info?.duration || '' : seasons.length ? `${seasons.filter((s) => +s.n).length || seasons.length} season${seasons.length === 1 ? '' : 's'}` : ''];
  let verb, sub = '', noHere = false;
  if (movie) {
    const p = (t.versions || []).map((v) => progressOf(v)).find(inProgress) || (tc?.match?.id ? progressOf({ kind: 'movie', id: tc.match.id }) : null);
    verb = inProgress(p) ? 'Resume' : 'Play';
    noHere = !!all.length && !all.some(here) && !tc?.asking().length;
    if (tc?.waiting()) verb = `Playing in ${tc.waiting().left()} s`;
  } else { const r = seriesResume(); verb = r ? `${r.verb} ${r.label}` : 'Play'; }
  const copy = (() => {
    if (!tc?.active) return t.versions?.length ? `<div class="what"><span class="tick">${ic('tick')}</span>Your provider${t.versions.length > 1 ? ` · ${t.versions.length} copies` : ''}</div>` : '';
    if (noHere) return `<div class="what warn">${ic('film')}Only MKV copies · Infuse or VLC plays them</div>`;
    if (!best) return tc.asking().length ? `<div class="what warn"><span class="spin" style="width:14px;height:14px;border-width:2px"></span>Asking ${esc(tc.asking().join(', '))}…</div>` : tc.nothing() ? `<div class="what warn">${esc(tc.nothing())}</div>` : '';
    const line = [...friendly(best), here(best) ? 'plays here' : ''].filter(Boolean);
    return `<div class="what">${here(best) ? `<span class="tick">${ic('tick')}</span>` : ''}${esc(line.join(' · '))}</div>`;
  })();
  if (!movie) season = season && seasons.some((s) => s.n === season) ? season : (seriesResume()?.e?.season ?? seasons[0]?.n ?? null);
  const cur = !movie ? seriesResume()?.e : null;
  const sea = seasons.find((s) => s.n === season);
  const eps = sea ? sea.eps.map((e, i) => {
    const p = epProg(e), done = p?.done || (p && !inProgress(p) && p.t >= p.d * 0.94);
    return `<button class="ep${e === cur ? ' cur' : ''}" data-ep="${i}"><span class="th">${e.still ? `<img src="${esc(sized(e.still, 300))}" alt="" loading="lazy">` : ''}<span class="n">${e.ep}</span>${done ? `<span class="seen">${ic('tick')}</span>` : ''}${p && inProgress(p) ? `<span class="pb"><i style="--p:${Math.min(100, (p.t / p.d) * 100)}%"></i></span>` : ''}</span><span class="col"><span class="t">${esc(epName(e))}</span><span class="m">${esc([epLen(e.duration), done ? 'Watched' : p && inProgress(p) ? `${Math.max(1, Math.round((p.d - p.t) / 60))} min left` : '', e._row?.soon ? `Out ${new Date(e._row.soon).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''].filter(Boolean).join(' · '))}</span>${e.plot ? `<span class="l">${esc(e.plot)}</span>` : ''}</span></button>`;
  }).join('') : '';
  const left = sea ? sea.eps.filter((e) => { const p = epProg(e); return !p?.done && !(p && !inProgress(p) && p.t >= p.d * 0.94); }).length : 0;
  const seasonsHtml = seasons.length ? `<div class="dt-seasons"><div class="chips">${seasons.map((s) => `<button class="chip${s.n === season ? ' sel' : ''}" data-season="${esc(s.n)}">${+s.n === 0 ? 'Specials' : `Season ${esc(s.n)}`}</button>`).join('')}</div><div class="note">${sea ? `${sea.eps.length} episodes · ${left} left` : ''}</div></div><div class="dt-eps">${eps}</div>` : '';
  const loadingSeries = !movie && !info ? '<div class="sk" style="height:200px;margin:16px"></div>' : '';
  const y = el.scrollTop;
  el.innerHTML = `<div class="dt-pic">${bg ? `<img src="${esc(sized(bg, 1280))}" alt="">` : ''}<div class="cap"></div><div class="st"></div><div class="sb"></div></div>
    <button class="disc l" data-act="back" aria-label="Back">${ic('back')}</button><button class="disc r" data-act="more" aria-label="More">${ic('more')}</button>
    <div class="dt-head"><div class="ey">${esc([movie ? 'Film' : 'Series', ...genres].join(' · '))}</div>${logo ? `<img class="logo" src="${esc(logo)}" alt="${esc(t.name)}" onerror="this.outerHTML='<h1>${esc(t.name).replace(/'/g, '')}</h1>'">` : `<h1>${esc(t.name)}</h1>`}
    <div class="facts">${facts(fs)}</div>${info?.plot ? `<div class="plot${open ? ' open' : ''}" data-act="plot">${esc(info.plot)}</div>` : info?.error ? `<div class="note" style="margin:8px 0 0">${esc(info.error)}</div>` : ''}
    <div class="act">${noHere ? `<button class="pill noicon" data-act="infuse">Open in Infuse</button>` : `<button class="pill" data-act="play">${ic('play')}${esc(verb)}</button>`}<button class="ghost" data-act="save">${ic('heart')}${isFav(t) ? 'Saved' : 'Save'}</button>${noHere ? '<button class="ghost" data-act="vlc">VLC</button>' : ''}</div>${copy}</div>${seasonsHtml}${loadingSeries}${creditsHtml()}${moreHtml()}`;
  el.scrollTop = y;
}
let soonT = 0;
const soon = () => { clearTimeout(soonT); soonT = setTimeout(() => { if (isShown('detail')) draw(); }, 120); };
function playEpisode(e) {
  if (e._row?.soon) return toast(`${epName(e)} isn't out yet`);
  const row = rowOf.get(e);
  const all = seasonsList().flatMap((s) => s.eps);
  const rows = all.map((x) => rowOf.get(x) || { prov: x, season: x.season, ep: x.ep, name: x.name, vid: null }).filter((x) => !x.soon);
  if (tc?.active && row) {
    const q = tc.askEpisode(row);
    const go = () => {
      const c = tc.episodeCopies(row)[0];
      if (c && !here(c)) { menu('Only MKV copies', [{ label: 'Open in Infuse', icon: 'ext', run: () => handOff(infuseUrl(linkOf(c)), 'Infuse') }, { label: 'Open in VLC', icon: 'ext', run: () => handOff(vlcUrl(linkOf(c)), 'VLC') }], { sub: 'This iPhone can\'t play MKV' }); return; }
      if (!tc.playEpisode(row, rows.slice(rows.indexOf(row)))) { if (e._row) toast('No copy of this episode yet. Your add-ons are still looking'); else playVod(e, { queue: all.filter((x) => !x._row) }); }
    };
    if (q && tc.episodeAsking(row).length) { toast('Asking your add-ons…', 1500); Promise.race([q.done, new Promise((r) => setTimeout(r, 6000))]).then(go); } else go();
    return;
  }
  playVod(e, { queue: all.filter((x) => !x._row) });
}
function play(restart) {
  if (t.kind !== 'movie') { const r = seriesResume(); if (r) playEpisode(r.e); return; }
  if (tc?.active) { if (tc.waiting()) { tc.stopWait(); return tc.play({ now: true, restart }); } return tc.play({ restart }); }
  const v = t.versions?.length ? defaultVersion(t) : null;
  if (v) playVod(v, { restart });
}
export default {
  name: 'detail',
  mount(root) {
    el = root;
    root.addEventListener('click', (e) => {
      const s = e.target.closest('[data-season]');
      if (s) { season = s.dataset.season; draw(); return; }
      const mo = e.target.closest('[data-more]');
      if (mo) { const x = more?.[+mo.dataset.more]; if (x) openTitle(x); return; }
      const ep = e.target.closest('[data-ep]');
      if (ep) { const sea = seasonsList().find((x) => x.n === season); const x = sea?.eps[+ep.dataset.ep]; if (x) playEpisode(x); return; }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const a = b.dataset.act;
      if (a === 'back') return back();
      if (a === 'plot') { open = !open; draw(); return; }
      if (a === 'play') return play(false);
      if (a === 'save') { toggleFav(t); draw(); return; }
      if (a === 'infuse' || a === 'vlc') { const c = tc?.best(); return handOff(a === 'vlc' ? vlcUrl(linkOf(c)) : infuseUrl(linkOf(c)), a === 'vlc' ? 'VLC' : 'Infuse'); }
      if (a === 'more') return moreMenu();
    });
    longPress(root, '[data-act="play"]', () => moreMenu());
    on('progress', soon); on('favs', soon); on('copies', soon);
  },
  async enter(root, params, { fresh }) {
    if (!params.title || (!fresh && params.title === t)) { draw(); return; }
    t = params.title; info = null; season = null; open = false; more = null;
    tc?.destroy();
    tc = phoneRanking(titleCopies(t, (x, why) => { if (x !== tc) return; if (why === 'tick') { const b = el.querySelector('[data-act="play"]'); const w = tc.waiting(); if (b && w) b.innerHTML = `${ic('play')}Playing in ${w.left()} s`; return; } soon(); }));
    const mine = ++my;
    draw();
    try {
      const ver = t.versions?.length ? defaultVersion(t) : null;
      const d = t.addon ? await addonInfo(t) : t.kind === 'movie' ? await S.src.movieInfo(ver) : await S.src.seriesInfo({ id: t.id, name: t.name, poster: t.poster });
      if (mine !== my) return;
      info = d;
    } catch (e) { if (mine !== my) return; info = { error: e.message, seasons: [] }; }
    tc.start(info);
    draw();
    loadMore(t, mine);
  },
  leave() { tc?.stopWait(); },
};
function moreMenu() {
  const best = tc?.active ? tc.best() : null;
  const list = tc?.active ? tc.copies() : [];
  menu(t.name, [
    { label: 'Start over', icon: 'rew', run: () => play(true) },
    list.length > 1 ? { label: 'Choose a copy', sub: `${list.length} copies`, icon: 'film', run: () => menu('Copies', list.slice(0, 12).map((c) => ({ label: copyLine(c) || (c.source === 'provider' ? 'Your provider' : c.source), sub: [c.source === 'provider' ? 'Your provider' : c.source, here(c) ? 'plays here' : 'MKV · Infuse or VLC', c === best ? 'Best' : ''].filter(Boolean).join(' · '), run: () => { if (!here(c)) return handOff(infuseUrl(linkOf(c)), 'Infuse'); tc.pick(c.key); tc.play({ now: true }); } }))) } : null,
    best ? { label: 'Open in VLC', icon: 'ext', run: () => handOff(vlcUrl(linkOf(best)), 'VLC') } : null,
    { label: isFav(t) ? 'Remove from Saved' : 'Save', icon: 'heart', run: () => { toggleFav(t); draw(); } },
  ]);
}
