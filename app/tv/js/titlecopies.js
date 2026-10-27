// One title's copies from every source (design/ui-v1/addons/SPEC.md 5; design/ui-v1/copies/RANKING.md): the IMDb match,
// asking the stream add-ons (progressive), the provider's versions and the add-on copies in one ranked list, the
// Version pill's words, the pill-row slot's "Still asking …", the Copies menu, the one wait before Play, playing an
// add-on copy (its entry for the native player: design/ui-v1/addons/PORT-NATIVE.md), series episodes from both sources.
// detail.js owns the page; this owns the copies. The provider's copies are always ranked here, with what their quality
// checks found (subtitles SPEC 4.3, 5.4); with no stream add-on enabled (addons false) nothing is asked and no add-on
// episode joins a series.
import { S, store, scoped, emit, on, settings, progressOf, inProgress } from './state.js';
import { esc, ic, dot } from './util.js';
import { prefLangs } from './catalog.js';
import * as AD from './addons.js';
import { matchTitle, pickMatch, anyStreamAddon } from './imdb.js';
import { rank, waitPlan, providerCopy, copyLine, sizeText, originalLang, pinNote, episodeNotReady, cutLabel } from './copies.js';
import { checkFor, checkedFor } from './subs.js';
import { soundOfCopy, uncheckedWords, lenWords } from './quality.js';
import { native } from './native.js';
import { ctx as playing, playVod, playerCommand } from './player.js';
import { openOverlay, toast, scrollList } from './ui.js';
import { SPIN, PUZZLE, fieldKeys } from './screens/addons.js';
import { focus } from './focus.js';

// The pill-row slot's third text (RANKING.md / subtitles SPEC 4.2): the subtitles work sets slotHooks.subtitles =
// (title, info) => html | ''. 1 the time left and 2 "Still asking …" come first.
export const slotHooks = { subtitles: null };
// A failed or not-ready copy this session (band e), by copy key
const failed = new Map();   // key -> 'failed' | 'notready'
const VKEY = () => scoped('ver');
const pins = () => store.get(VKEY(), {});
const pinOf = (t) => pins()[t.key];
function setPin(t, id) { const m = pins(); if (id) m[t.key] = id; else delete m[t.key]; store.set(VKEY(), m); }

const TICK = '<span class="ad-tk"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>';
const KIND_SHORT = { bluray: 'Blu-ray', web: 'web', tv: 'TV', dvd: 'DVD', cinema: 'cinema' };

// ---------- one title ----------
// t: a provider title (versions) or an add-on title (t.addon); info: the provider's details (tmdb, imdb)
export function titleCopies(t, onChange) {
  const tc = {
    t, active: t.kind !== 'live', addons: (anyStreamAddon() || !!t.addon) && t.kind !== 'live', match: null, meta: null, q: null, eps: null,
    vids: [], wait: null, dead: false, epQ: new Map(), pm: new Map(),
  };
  const changed = () => { if (!tc.dead) onChange?.(tc); };
  const unq = [];
  tc.destroy = () => { tc.dead = true; unq.forEach((f) => f()); clearInterval(tc.wait?.timer); tc.wait = null; };
  // ---- the match, then asking ----
  tc.start = async (info = {}) => {
    if (!tc.active) return;
    tc.match = await matchTitle(t, info).catch(() => ({ level: 'unsure', id: '' }));
    if (tc.dead) return;
    tc.meta = tc.match.meta || (tc.match.id ? await AD.meta(t.kind === 'series' ? 'series' : 'movie', tc.match.id) : null);
    if (tc.dead) return;
    tc.vids = tc.match.id && tc.match.level !== 'unsure' ? tc.meta?.videos || [] : [];
    if (tc.addons && t.kind === 'movie' && tc.match.id && tc.match.level !== 'unsure') ask();
    if (tc.addons && t.kind === 'series' && tc.match.id && tc.match.level !== 'unsure') tc.eps = tc.vids;
    changed();
  };
  // the match changed under the page (a check's length made a Likely one Sure or dropped it, his pick): the same id
  // keeps what was asked; another id starts again
  tc.rematch = async (info = {}) => {
    if (!tc.active) return;
    const m = await matchTitle(t, info).catch(() => null);
    if (tc.dead || !m) return;
    if (m.id === tc.match?.id) { tc.match = { ...tc.match, ...m, meta: m.meta || tc.match.meta }; if (tc.q) tc.q.match = m.level; changed(); return; }
    tc.q = null; tc.eps = null;
    await tc.start(info);
  };
  const ask = () => {
    tc.q = AD.askStreams('movie', tc.match.id, { match: tc.match.level, origin: originalLang(tc.meta?.country) });
    unq.push(tc.q.on(changed));
  };
  tc.lookAgain = () => { if (!tc.match?.id) return; AD.forgetStreams('movie', tc.match.id); ask(); changed(); };
  // ---- the copies, ranked ----
  const provCopies = (vs) => vs.map((v) => { const c = providerCopy(v, { pinned: pinOf(t) === v.id, checked: checkedFor(v) }); c.failed = failed.get(c.key) === 'failed'; return c; });
  const addonCopies = (q) => AD.copiesOf(q).map((c) => Object.assign(c, { pinned: pinOf(t) === c.key, failed: failed.get(c.key) === 'failed', notReady: c.claim.notReady || failed.get(c.key) === 'notready', match: tc.match?.level || 'likely' }));
  // (pm: "plays on this TV" for the checked provider copies, subs.js playable(), filled by the page)
  const playsNow = (c) => { const x = c.source === 'provider' ? tc.pm.get(c.id) : null; return x ? x.video && x.audio : undefined; };
  tc.rankCtx = () => ({ langs: prefLangs(), runtime: (tc.meta?.runtime || 0) * 60, playsNow });
  tc.copies = () => rank([...provCopies(t.versions || []), ...addonCopies(tc.q)], tc.rankCtx());
  tc.best = () => tc.copies()[0] || null;
  tc.asking = () => AD.stillAsking(tc.q);
  tc.answered = () => !!tc.q && !tc.asking().length;
  // ---- words ----
  // (an Unsure match shows it too: its Copies menu asks "Which film is this?")
  tc.unsure = () => tc.match?.level === 'unsure' && !tc.match.none && (tc.match.cands || []).length > 0;
  tc.pillShows = (n = tc.copies().length) => tc.active && (n >= 2 || (n === 1 && tc.addons && (tc.asking().length > 0 || tc.unsure())));
  // "[tick] 4K HDR10 · best of 4" (checked) or the name's claim; the source follows the quality only when add-on copies
  // are in the list (subtitles SPEC 15)
  tc.pillHtml = (best = tc.best(), n = tc.copies().length, suffix = '', list = null) => {
    if (!best) return '';
    const k = best.checked, res = (k && k.res) || best.claim.res || '';
    const range = k ? (k.dv ? 'Dolby Vision' : k.hdr === 'HDR10' ? 'HDR10' : k.hdr ? 'HDR' : '') : '';
    const word = [res, range, KIND_SHORT[best.claim.kind] && best.source !== 'provider' ? KIND_SHORT[best.claim.kind] : ''].filter(Boolean).join(' ');
    const mixed = best.source !== 'provider' || (list || tc.copies()).some((c) => c.source !== 'provider') || (tc.addons && !!tc.q);
    const tail = best.pinned ? ' · your pick' : n > 1 ? ` · best of ${n}` : tc.unsure() && !suffix ? ' · which film is it?' : '';
    const head = mixed ? `${word ? `${esc(word)} · ` : ''}${esc(srcName(best))}` : esc(word || 'Copies');
    return `${ic('film')}${k ? TICK : ''}<span>${head}</span><span class="ad-of">${esc(tail + suffix)}</span>${ic('chevD')}`;
  };
  tc.slot = () => { const a = tc.asking(); return a.length ? `${SPIN}Still asking ${esc(listNames(a))}` : ''; };
  tc.matchNote = () => (tc.match?.level === 'unsure' && !tc.match.none && tc.match.cands?.length > 1 ? `${tc.match.cands.length} films are called ${esc(t.name)} · which one? (in Copies)` : '');
  // the meta line's tags: the default copy's, each with a tick once checked (4K / HDR10 / 5.1), dashed while only its
  // name says so (subtitles SPEC 4.1; add-ons M4). The language tag stays as it was.
  tc.tags = (best = tc.best()) => tagsHtml(best);
  // 5.9: nothing to play, in one line naming each add-on and why
  tc.nothing = () => {
    if (!tc.q || tc.asking().length || tc.copies().length) return '';
    const order = (r) => (r.dropped.torrent ? 0 : r.state === 'timeout' || r.state === 'failed' || r.state === 'down' ? 1 : 2);
    const bits = [...tc.q.results.values()].sort((a, b) => order(a) - order(b)).map((r) => r.dropped.torrent ? `${AD.label(r.a)} has it only as a torrent, which airglow doesn't play.` : r.state === 'timeout' || r.state === 'failed' || r.state === 'down' ? `${AD.label(r.a)} isn't answering.` : r.ext.length || r.info.length ? '' : `${AD.label(r.a)} found nothing.`).filter(Boolean);
    if (!tc.q.results.size) return 'No copy to play. None of your add-ons gives copies of films: add one in Account > Add-ons.';
    return `No copy to play. ${bits.join(' ')}`.trim();
  };
  tc.others = () => (tc.q ? [...tc.q.results.values()].flatMap((r) => r.ext) : []);
  tc.trailers = () => [...(tc.meta?.trailers || []), ...(tc.q ? [...tc.q.results.values()].flatMap((r) => r.trailers) : [])].filter((x, i, l) => l.findIndex((y) => y.ytId === x.ytId) === i);
  tc.infoLines = () => (tc.q ? [...tc.q.results.values()].flatMap((r) => r.info.map((x) => `${x.from}: ${x.text}`)) : []);
  // stremio:///detail links: More like this (at most 10, the title itself and duplicates dropped; SPEC 5.6)
  tc.details = () => { const own = tc.match?.id; const seen = new Set(); return (tc.q ? [...tc.q.results.values()].flatMap((r) => r.details) : []).filter((d) => d.id !== own && !seen.has(d.id) && seen.add(d.id)).slice(0, 10); };
  // ---- picking (the Copies menu) ----
  tc.pick = (key) => {
    if (!key) { setPin(t, null); changed(); return; }
    const c = tc.copies().find((x) => x.key === key);
    if (!c) return;
    setPin(t, c.source === 'provider' ? c.id : c.key);
    // picking a Likely add-on copy makes the match Sure for this title (SPEC 5.2)
    if (c.source !== 'provider' && tc.match?.level === 'likely') { pickMatch(t, tc.match.id); tc.match = { ...tc.match, level: 'sure' }; if (tc.q) tc.q.match = 'sure'; }
    changed();
  };
  // ---- the one wait, then play (RANKING.md 3) ----
  tc.waiting = () => tc.wait;
  tc.play = (opts = {}) => {
    const best = tc.best();
    if (!best) return false;
    if (opts.now || !tc.active) return playCopy(t, best, tc, opts);
    const plan = waitPlan({ best, asking: tc.asking() });
    if (!plan.wait) return playCopy(t, best, tc, opts);
    const until = Date.now() + plan.budgetMs;
    tc.wait = { until, opts, left: () => Math.max(0, Math.ceil((until - Date.now()) / 1000)) };
    tc.wait.timer = setInterval(() => {
      if (tc.dead) return;
      const b = tc.best(), top4k = b && ((b.checked && b.checked.res) || b.claim.res) === '4K' && (b.lang || '') === (prefLangs()[0] || 'English');
      if (Date.now() >= until || !tc.asking().length || top4k) { tc.stopWait(); playCopy(t, tc.best(), tc, opts); }
      else if (!tc.dead) onChange?.(tc, 'tick');   // (only the button's countdown changes)
    }, 250);
    changed();
    return true;
  };
  tc.stopWait = () => { if (!tc.wait) return false; clearInterval(tc.wait.timer); tc.wait = null; changed(); return true; };
  // ---- series: episodes from both sources (SPEC 5.8) ----
  // rows: [{ season, ep, name, prov (provider episode) | null, vid (Cinemeta video) | null, soon (date) }]
  tc.episodes = (seasons) => mergeEpisodes(seasons || [], tc.eps || [], tc.match);
  tc.askEpisode = (row) => {
    if (!tc.addons || !row?.vid) return null;
    const k = row.vid.id;
    if (!tc.epQ.has(k)) { const q = AD.askStreams('series', k, { match: tc.match?.level || 'likely', origin: originalLang(tc.meta?.country) }); unq.push(q.on(changed)); tc.epQ.set(k, q); }
    return tc.epQ.get(k);
  };
  tc.episodeCopies = (row) => {
    const q = row?.vid ? tc.epQ.get(row.vid.id) : null;
    const prov = row?.prov ? [providerCopy(row.prov)] : [];
    const lenSec = row?.prov ? durSec(row.prov.duration) : 0;
    const ad = AD.copiesOf(q).map((c) => Object.assign(c, { match: tc.match?.level === 'sure' ? 'sure' : 'likely', failed: failed.get(c.key) === 'failed', notReady: c.claim.notReady || failed.get(c.key) === 'notready', providerLenSec: lenSec }));
    return rank([...prov, ...ad], { langs: prefLangs() });
  };
  tc.episodeAsking = (row) => AD.stillAsking(row?.vid ? tc.epQ.get(row.vid.id) : null);
  tc.playEpisode = (row, queueRows, opts = {}) => {
    const c = tc.episodeCopies(row)[0];
    if (!c) return false;
    if (c.source === 'provider') return playVod(row.prov, { queue: queueRows.map((r) => r.prov).filter(Boolean), ...opts });
    return playCopy(t, c, tc, { ...opts, row, rows: queueRows });
  };
  return tc;
}
// (also for a series' episode: the copy Play plays)
export function tagsHtml(best) {
  if (!best) return '';
  const k = best.checked, cls = k ? 'ad-ok' : 'ad-name', tk = k ? TICK : '';
  const res = (k && k.res) || best.claim.res, range = k ? (k.dv ? 'Dolby Vision' : k.hdr === 'HDR10' || k.hdr === 'HDR10+' ? 'HDR10' : k.hdr ? 'HDR' : '') : best.claim.dv && !(best.claim.kind === 'bluray' || best.claim.remux) ? 'Dolby Vision' : best.claim.dv || best.claim.hdr ? 'HDR10' : '';
  const snd = k ? (k.ch >= 8 ? '7.1' : k.ch >= 6 ? '5.1' : '') : '';
  const lang = (k && k.lang) || best.lang;
  const one = (x) => (x ? `<span class="tag ${cls}">${tk}${esc(x)}</span>` : '');
  return [one(res), one(range), one(snd), lang ? `<span class="tag">${esc(LANG2[lang] || lang.slice(0, 2).toUpperCase())}</span>` : ''].join('');
}
const LANG2 = { English: 'EN', French: 'FR', German: 'DE', Spanish: 'ES', Italian: 'IT', Icelandic: 'IS', Multi: 'MULTI', Portuguese: 'PT', Dutch: 'NL', Swedish: 'SV', Norwegian: 'NO', Danish: 'DA', Polish: 'PL' };
const srcName = (c) => (c.source === 'provider' ? 'Your provider' : c.source);
const listNames = (a) => (a.length <= 2 ? a.join(' and ') : `${a.slice(0, 2).join(', ')} and ${a.length - 2} more`);
export const durSec = (d) => { const m = String(d || '').match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/); return m ? (m[3] != null ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[1] * 60 + +m[2]) : /^\d+$/.test(String(d)) ? +d : 0; };

// ---------- series: one row per episode, from the provider and Cinemeta (SPEC 5.8, S5) ----------
const norm = (s) => window.Titles.norm(String(s || '').replace(/^.*?\bS\d+\s*E\d+\b\s*[-:–.]?\s*/i, '').replace(/^(episode|ep\.?)\s*\d+\s*[-:–.]?\s*/i, ''));
function mergeEpisodes(seasons, vids, match) {
  const rows = [];
  const byKey = new Map();
  for (const s of seasons) for (const e of s.eps) { const r = { season: String(s.n), ep: +e.ep, name: e.name, prov: e, vid: null }; rows.push(r); byKey.set(`${+s.n}:${+e.ep}`, r); }
  if (!match?.id || match.level === 'unsure') return rows;
  for (const v of vids) {
    const r = byKey.get(`${v.season}:${v.episode}`);
    // one row only when the season and number agree and the names match (Cinemeta has no episode lengths); else apart
    if (r && !r.vid && (norm(r.prov.name) === norm(v.name) || !norm(r.prov.name) || !norm(v.name))) { r.vid = v; continue; }
    const soon = v.released && Date.parse(v.released) > Date.now() ? v.released : '';
    rows.push({ season: String(v.season), ep: v.episode, name: v.name, prov: null, vid: v, soon, addonOnly: true });
  }
  return rows;
}

// ---------- playing an add-on copy (design/ui-v1/addons/PORT-NATIVE.md) ----------
// The item the player and progress see: the title's IMDb key (progress by title, SPEC 8.3) and the copy's identity;
// its link and headers are non-enumerable, so saving it (Continue watching) never writes them.
export function addonItem(t, c, tc, row) {
  const ep = !!row;
  const id = ep ? row.vid.id : tc.match?.id || t.id;
  const it = {
    kind: ep ? 'episode' : 'movie', id, name: ep ? row.name || `Episode ${row.ep}` : t.name, _title: t.name, poster: t.poster || tc.meta?.poster || '', year: t.year || '',
    ...(ep ? { season: row.season, ep: row.ep, seriesId: t.id, seriesName: t.name, imdbSeries: tc.match?.id } : {}),
    copy: { source: c.source, addonKey: c.addonKey, key: c.key, binge: c.binge, filename: c.filename, size: c.size, title: t.name, kind: t.kind, tkey: t.key, tid: t.id },
  };
  const runtime = ep ? (c.providerLenSec || 0) : (tc.meta?.runtime || 0) * 60;
  const entry = { headers: c.headers || null, mime: mimeOf(c), source: c.source, sourceKind: 'addon', key: id, binge: c.binge || '', runtime, copyKey: c.key, label: copyLine(c) };
  Object.defineProperty(it, 'url', { value: c.url, enumerable: false });
  Object.defineProperty(it, '_entry', { value: entry, enumerable: false });
  return it;
}
const mimeOf = (c) => { const m = String(c.filename || c.url || '').toLowerCase().split('?')[0].match(/\.(mkv|mp4|m4v|ts|m3u8|webm|avi|mov)$/); return m ? { mkv: 'video/x-matroska', mp4: 'video/mp4', m4v: 'video/mp4', ts: 'video/mp2t', m3u8: 'application/x-mpegURL', webm: 'video/webm', avi: 'video/x-msvideo', mov: 'video/quicktime' }[m[1]] : ''; };
// the next copies, as identities (never links): the player asks for one with need: copy (SPEC 8.1)
const identities = (list) => list.slice(0, 5).map((c) => ({ key: c.key, source: c.source === 'provider' ? 'provider' : c.source, label: copyLine(c) || 'Copy', provider: c.source === 'provider' }));
let lastPlay = null;   // { tc, list (ranked at the press), row, rows }
function playCopy(t, c, tc, opts = {}) {
  if (!c) return false;
  const list = opts.row ? tc.episodeCopies(opts.row) : tc.copies();
  const rest = list.filter((x) => x !== c && x.key !== c.key);
  if (c.source === 'provider') {
    lastPlay = { tc, list, t };
    const v = c.v;
    if (v._entry === undefined) Object.defineProperty(v, '_entry', { value: { source: 'provider', sourceKind: 'provider', copyKey: c.key, copies: identities(rest) }, enumerable: false, configurable: true, writable: true });
    else v._entry = { ...v._entry, copies: identities(rest) };
    return playVod(v, { restart: opts.restart });
  }
  const it = addonItem(t, c, tc, opts.row);
  it._entry.copies = identities(rest);
  lastPlay = { tc, list, t, row: opts.row, rows: opts.rows };
  const p = progressOf(it);
  playVod(it, { restart: opts.restart || !inProgress(p) ? !!opts.restart : false });
  return true;
}
// Continue watching / Resume for an add-on copy: ask again, then the same identity, or the best (SPEC 8.3)
export async function resumeAddonItem(it, { restart } = {}) {
  const cp = it.copy;
  const q = AD.askStreams(it.kind === 'episode' ? 'series' : 'movie', it.id, { match: 'sure' });
  toast('Asking your add-ons for this copy…');
  await q.done;
  const all = rank(AD.copiesOf(q).map((c) => Object.assign(c, { match: 'sure' })), { langs: prefLangs() });
  const same = all.find((c) => c.key === cp.key) || all.find((c) => cp.binge && c.binge === cp.binge) || all[0];
  if (!same) { toast('None of your add-ons has a copy of this right now', 4000); return; }
  const t = { kind: cp.kind || 'movie', key: cp.tkey || it.id, id: cp.tid || it.id, name: cp.title || it._title || it.name, poster: it.poster, year: it.year, versions: [] };
  const tc = { match: { id: it.kind === 'episode' ? it.imdbSeries : it.id, level: 'sure' }, meta: null, episodeCopies: () => all, copies: () => all };
  const row = it.kind === 'episode' ? { vid: { id: it.id }, season: it.season, ep: it.ep, name: it.name } : null;
  const item = addonItem(t, same, tc, row);
  item._entry.copies = identities(all.filter((c) => c !== same));
  if (same.key !== cp.key) toast(`That copy has gone · playing ${copyLine(same)} · ${same.source}`, 4000);
  lastPlay = { tc, list: all, t, row };
  playVod(item, { restart });
}

// What the player asks for (PORT-NATIVE.md): need: copy (the link for a hand-over), copy-failed (band e for this
// session), need: next (Up next keeps the source). The links go only to the player, never anywhere else.
native?.player.onEvent((e) => {
  const c = playing.cur;
  if (!c || e.session !== c.session || !lastPlay) return;
  if (e.type === 'need' && e.what === 'copy') {
    // key null with speedMbps: Diag just measured the Wi-Fi or internet; re-rank with it (band b) and take the best that fits
    const x = e.key ? lastPlay.list.find((y) => y.key === e.key)
      : rank(lastPlay.list.filter((y) => y.key !== playing.cur?.items?.[playing.cur.index]?._entry?.copyKey && !failed.has(y.key)), { langs: prefLangs(), runtime: (lastPlay.tc.meta?.runtime || 0) * 60, speedMbps: +e.speedMbps || 0 })[0];
    if (!x) { playerCommand('copy', { key: e.key, error: 'gone' }); return; }
    if (x.source === 'provider') { playerCommand('copy', { key: x.key, entry: { id: `movie:${x.v.id}`, url: x.v.url, title: x.v._title || x.v.name, source: 'provider', sourceKind: 'provider' } }); return; }
    const it = addonItem(lastPlay.t, x, lastPlay.tc, lastPlay.row);
    playerCommand('copy', { key: x.key, entry: { id: `${it.kind}:${it.id}`, url: it.url, title: lastPlay.t.name, ...it._entry } });
  } else if (e.type === 'copy-failed' || e.type === 'copy-notready') {
    failed.set(e.key, e.type === 'copy-notready' ? 'notready' : 'failed');
    emit('copies');
  } else if (e.type === 'need' && e.what === 'next' && lastPlay.row && lastPlay.rows) {
    const rows = lastPlay.rows, i = rows.findIndex((r) => r === lastPlay.row || (r.vid && lastPlay.row.vid && r.vid.id === lastPlay.row.vid.id));
    const next = rows[i + 1];
    if (!next) return;
    const tc = lastPlay.tc;
    const q = tc.askEpisode?.(next);
    Promise.resolve(q?.done).then(() => {
      const list = tc.episodeCopies(next);
      const binge = e.binge || '';
      const same = list.find((x) => binge && x.binge === binge) || (binge === 'provider' ? list.find((x) => x.source === 'provider') : null);
      const pick = same || list[0];
      if (!pick) return;
      const item = pick.source === 'provider' ? next.prov : addonItem(lastPlay.t, pick, tc, next);
      const entry = pick.source === 'provider' ? { id: `episode:${next.prov.id}`, url: next.prov.url, title: lastPlay.t.name, sub: `S${next.season} · E${next.ep} · ${next.name}`, source: 'provider', binge: 'provider' } : { id: `episode:${item.id}`, url: item.url, title: lastPlay.t.name, sub: `S${next.season} · E${next.ep} · ${next.name}`, ...item._entry };
      playerCommand('queue-next', { entry, same: !!same, say: same ? `Same source: ${pick.source === 'provider' ? 'Your provider' : pick.source} ${pick.claim.res || ''}`.trim() : `Best copy: ${copyLine(pick)} · ${pick.source === 'provider' ? 'Your provider' : pick.source}` });
      playing.cur?.items?.push(item);   // (the player's next item: its progress is saved under it, PORT-NATIVE.md 3)
      lastPlay = { ...lastPlay, row: next };
    });
  }
});

// ---------- the Copies menu (SPEC 5.2; subtitles 4.3) ----------
export function copiesMenu(tc, { title, onDone, row, which }) {
  const draw = () => {
    const list = row ? tc.episodeCopies(row) : tc.copies();
    const best = list[0];
    const likely = tc.match?.level !== 'sure';
    const pin = pinOf(tc.t);
    const asking = row ? tc.episodeAsking(row) : tc.asking();
    const two = (act, v, a, b, right = '', cls = '') => `<div class="lr ad-two fx${cls}" tabindex="-1" data-act="${act}" data-v="${esc(v)}"><span class="rd${(v === '' && !pin) || (v && (v === pin || list.find((c) => c.key === v)?.id === pin)) ? ' on' : ''}"></span><span class="grow"><span class="a">${a}</span><span class="b">${b}</span></span>${right}</div>`;
    const mixed = list.some((c) => c.source !== 'provider') || asking.length > 0;
    const ref = (tc.meta?.runtime || 0) * 60 || list.find((c) => c.source === 'provider' && c.checked?.len)?.checked.len || 0;
    // a provider row (subtitles SPEC 4.3, 15): the source first when add-on copies are listed, then the problem in chalk
    // (Named 4K, No sound on this TV, Longer cut · 3 h 20 min, a pin passed over), then sound and size, and the
    // provider's name in quotes last
    const provLine2 = (c) => {
      const k = c.checked, bits = mixed ? [`<em>${esc(srcName(c))}</em>`] : [];
      const em = (x) => bits.push(`<em>${esc(x)}</em>`);
      if (c.pinned && pinNote(list, tc.rankCtx())) bits.push(`<span class="ad-pin">${esc(pinNote(list, tc.rankCtx()))}</span>`);
      else if (c.failed) em('Didn\'t play on this TV');
      const x = tc.pm.get(c.id);
      if (x && !x.audio) em('No sound on this TV'); else if (x && !x.video) em('This TV can\'t play its picture');
      if (k && c.claim.res && k.res && c.claim.res !== k.res) em(`Named ${c.claim.res}`);
      const cut = k && ref ? cutLabel(k.len, ref, k.fps) : '';
      if (cut) em(`${cut} · ${lenWords(k.len)}`);
      if (!k) bits.push(esc(uncheckedWords(c.v)));
      const snd = k ? soundOfCopy(c.v) : '';
      if (snd) bits.push(esc(x && !x.audio ? `${snd.split(' ').slice(0, -1).join(' ') || snd} only` : snd));
      if (!k && c.lang) bits.push(esc(c.lang));
      const size = checkFor(c.v)?.size || c.size;
      if (size) bits.push(sizeText(size));
      bits.push(`“${esc(c.v?.name || '')}”`);
      return bits.join(' · ');
    };
    const line2 = (c) => {
      if (c.source === 'provider') return provLine2(c);
      const k = c.checked, bits = [`<em>${esc(srcName(c))}</em>`];
      if (c.failed) bits.push('didn\'t play on this TV'); else if (c.notReady) bits.push('wasn\'t ready yet');
      else if (likely && !c.pinned) bits.push(`for ${esc(tc.t.name)}${tc.meta?.year ? ` (${tc.meta.year})` : ''}`, 'the name says');
      else if (c.claim.dv && (c.claim.kind === 'bluray' || c.claim.remux)) bits.push('its name says Dolby Vision');
      else bits.push('the name says');
      if (c.pinned && pinNote(list)) bits.splice(1, 0, `<span class="ad-pin">${esc(pinNote(list))}</span>`);
      if ((k && k.lang) || c.lang) bits.push(esc((k && k.lang) || c.lang));
      if (c.size) bits.push(sizeText(c.size));
      return bits.join(' · ');
    };
    const rowOf = (c, i) => two('copy', c.key, `${c.checked ? TICK : ''}${esc(copyLine(c) || 'Quality not known yet')}`, line2(c), i === 0 ? '<span class="tag ad-best">Best</span>' : '', c.failed || c.notReady ? ' dim' : '');
    const good = list.filter((c) => !(c.source !== 'provider' && c.match !== 'sure') || c.failed || c.notReady);
    const maybe = list.filter((c) => c.source !== 'provider' && c.match !== 'sure' && !c.failed && !c.notReady);
    const ends = good.filter((c) => c.failed || c.notReady);
    const main = good.filter((c) => !ends.includes(c));
    const nowLine = !best ? '' : mixed ? [copyLine(best).split(' · ').filter((x) => !/Mb\/s/.test(x)).join(' · '), srcName(best)].filter(Boolean).join(' · ') : copyLine(best) || 'quality not known yet';
    let html = two('copy', '', 'Always the best copy', best ? `Now: ${esc(nowLine)}. Changes if a better copy shows up` : 'Changes if a better copy shows up');
    html += main.map((c) => rowOf(c, list.indexOf(c))).join('');
    if (maybe.length) html += `<div class="ad-grp2">From add-ons · might be another film</div>${maybe.map((c) => rowOf(c, list.indexOf(c))).join('')}`;
    html += asking.map((n) => `<div class="lr ad-two"><span class="ad-spin-wrap" style="width:20px;display:grid;place-items:center">${SPIN}</span><span class="grow"><span class="a">${esc(n)} is still looking</span><span class="b">Its copies join this list as they come</span></span></div>`).join('');
    html += ends.map((c) => rowOf(c, list.indexOf(c))).join('');
    const others = row ? [] : tc.others();
    if (others.length) html += `<div class="lr ad-two fx" tabindex="-1" data-act="apps"><span class="ico" style="width:20px">${ic('chevR')}</span><span class="grow"><span class="a">Watch in another app</span><span class="b">${esc(listNames(others.map((o) => o.name)))} · ${esc(others[0].from)}</span></span></div>`;
    const tr = row ? [] : tc.trailers();
    if (tr.length) html += `<div class="lr ad-two fx" tabindex="-1" data-act="trailer"><span class="ico" style="width:20px">${ic('play')}</span><span class="grow"><span class="a">Trailer</span><span class="b">Opens YouTube</span></span></div>`;
    if (!row && tc.match && tc.match.level !== 'sure') html += `<div class="lr ad-two fx" tabindex="-1" data-act="which"><span class="ico" style="width:20px">${ic('search')}</span><span class="grow"><span class="a">Which film is this?</span><span class="b">${tc.match.level === 'unsure' ? 'Pick it, and add-on copies join this list' : 'Pick it to be sure'}</span></span></div>`;
    const n = list.length;
    // (provider copies only: when they were checked, "Checked today 21:02"; with add-ons, how the film was matched)
    const at = Math.max(0, ...list.filter((c) => c.source === 'provider').map((c) => checkFor(c.v)?.at || 0));
    const when = (x) => { const d = new Date(x), today = new Date().toDateString() === d.toDateString(); return `Checked ${today ? 'today' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    const right = !mixed ? (at ? when(at) : 'Not checked yet') : tc.match?.level === 'sure' ? `matched on IMDb · ${n} so far` : tc.match?.level === 'likely' ? 'matched by name and year' : 'not matched yet';
    return `<h3><span class="ellipsis">${esc(title)}</span><small>${esc(right)}</small></h3><div class="sheet-body" style="max-height:380px;padding:0"><div class="inner" data-col>${html}</div></div><div class="ad-foot">Mb/s is the picture's share. Picking a copy keeps it for this ${which || 'film'}${maybe.length ? ', and tells airglow it\'s the same film' : ''}.</div>`;
  };
  const ov = openOverlay(`<div class="menu ad-copies">${draw()}</div>`, {
    focusSel: '[data-act="copy"][data-v=""]',
    onClick: (act, el) => {
      if (act === 'copy') { ov.close(); tc.pick(el.dataset.v); onDone?.(); }
      else if (act === 'apps') otherApps(tc.others());
      else if (act === 'trailer') openUri(`vnd.youtube:${tc.trailers()[0].ytId}`, 'YouTube');
      else if (act === 'which') { ov.close(false); whichFilm(tc, onDone); }
    },
  });
  scrollList(ov.el);
  // copies that arrive while it is open join the list in place (focus stays on the same row)
  const off = on('addon-streams', () => { if (!ov.el.isConnected) return off(); const at = document.activeElement?.dataset?.v; ov.el.querySelector('.menu').innerHTML = draw(); scrollList(ov.el); const f = ov.el.querySelector(`[data-act="copy"][data-v="${CSS.escape(at ?? '')}"]`) || ov.el.querySelector('.fx'); f?.focus({ preventScroll: true }); });
  return ov;
}
function otherApps(list) {
  const ov = openOverlay(`<div class="menu" style="left:48px;top:120px;width:460px"><h3>Watch in another app</h3><div data-col>${list.map((o, i) => `<div class="lr ad-two fx" tabindex="-1" data-act="${i}"><span class="ico" style="width:20px">${ic('chevR')}</span><span class="grow"><span class="a">${esc(o.name)}</span><span class="b">${esc(o.how || 'Opens its app')}</span></span></div>`).join('')}</div><div class="ad-foot">From ${esc(list[0]?.from || '')}</div></div>`, {
    onClick: (act) => { const o = list[+act]; if (o) openUri(o.androidTvUrl || o.url, o.name); ov.close(); },
  });
}
// The safe intent launcher is native (SPEC 5.6, PORT-NATIVE.md: parseUri, clear component and selector, BROWSABLE)
function openUri(uri, name) {
  if (!AD.openAppReady()) { toast(`Opening ${name} comes with the next airglow update`, 3500); return; }
  native.openApp({ uri }).then((r) => { if (!r?.ok) toast('That app isn\'t on this TV', 3500); }).catch(() => toast('That app isn\'t on this TV', 3500));
}

// ---------- Which film is this? (subtitles 4.5, shared; SPEC 5.0) ----------
// opts.query: another name to search by (Search by another name). The header says how long this copy runs (its check)
// and the row closest to that length has focus; with no length, the row of the provider's year, else the first.
export async function whichFilm(tc, onDone, { query = '' } = {}) {
  const t = tc.t, kind = t.kind === 'series' ? 'series' : 'movie', name = query || t.name;
  const copyLen = t.kind === 'movie' ? tc.copies().find((c) => c.source === 'provider' && c.checked?.len)?.checked.len || 0 : 0;
  const runs = t.kind !== 'movie' ? '' : copyLen ? ` · this copy runs ${lenWords(copyLen)}` : ' · this copy\'s length is unknown';
  const ov = openOverlay(`<div class="menu ad-match"><h3>Which ${kind === 'series' ? 'series' : 'film'} is this?</h3><div class="ad-qq">From the Cinemeta search for “${esc(name)}”${runs}</div><div data-col data-list><div class="lr"><span class="ad-spin-wrap">${SPIN}</span><span class="grow">Asking Cinemeta…</span></div></div><div class="ad-foot">Your pick is remembered for this title, for subtitles and copies alike.</div></div>`);
  const ids = [...new Set([...(query ? [] : tc.match?.cands || []).map((c) => c.id), ...((await AD.cinemetaSearch(kind, name)) || []).map((r) => r.id)])].slice(0, 6);
  const metas = (await Promise.all(ids.map((id) => AD.meta(kind, id)))).filter(Boolean);
  if (!ov.el.isConnected) return;
  const len = (m) => (m.runtime ? (m.runtime >= 60 ? `${Math.floor(m.runtime / 60)} h ${m.runtime % 60} min` : `${m.runtime} min`) : '');
  ov.el.querySelector('[data-list]').innerHTML = metas.map((m) => `<div class="lr ad-two fx" tabindex="-1" data-act="pick" data-v="${esc(m.id)}"><span class="rd${tc.match?.id === m.id ? ' on' : ''}"></span><span class="grow"><span class="a">${esc(m.name)}</span><span class="b">${esc([m.year, len(m), (m.director || []).slice(0, 2).join(', ')].filter(Boolean).join(' · '))}</span></span></div>`).join('')
    + (metas.length ? '' : `<div class="lr"><span class="grow t-2">Nothing on Cinemeta for “${esc(name)}”</span></div>`)
    + `<div class="lr ad-two fx" tabindex="-1" data-act="search"><span class="ico" style="width:20px">${ic('search')}</span><span class="grow"><span class="a">Search by another name</span><span class="b">On the keyboard</span></span></div>`
    + `<div class="lr ad-two fx" tabindex="-1" data-act="none"><span class="rd${tc.match?.none ? ' on' : ''}"></span><span class="grow"><span class="a">None of these</span><span class="b">Keep this copy only: no add-on copies, no downloaded subtitles</span></span></div>`;
  const byLen = copyLen ? [...metas].filter((m) => m.runtime).sort((a, b) => Math.abs(a.runtime * 60 - copyLen) - Math.abs(b.runtime * 60 - copyLen))[0] : null;
  const near = byLen || metas.find((m) => +m.year === +t.year) || metas[0];
  ov.el.querySelector(near ? `[data-v="${CSS.escape(near.id)}"]` : '[data-act="search"]')?.focus({ preventScroll: true });
  ov.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'search') { ov.close(false); searchName(tc, onDone, name); return; }
    ov.close();
    if (b.dataset.act === 'none') { pickMatch(t, ''); tc.match = { id: '', level: 'unsure', none: true }; tc.q = null; }
    else { pickMatch(t, b.dataset.v); tc.match = { id: b.dataset.v, level: 'sure', via: 'picked' }; tc.meta = await AD.meta(kind, b.dataset.v); tc.vids = tc.meta?.videos || []; if (t.kind === 'movie') { if (tc.addons) tc.lookAgain(); } else if (tc.addons) { tc.eps = tc.vids; } }
    onDone?.();
  });
}
// Search by another name: a field on the TV keyboard (OK opens it, Enter searches), then the same menu for that name
function searchName(tc, onDone, was) {
  let sent = false;
  // (Back returns to the picker it came from)
  const ov = openOverlay(`<div class="menu ad-match"><h3>Search by another name</h3><div class="ad-qq">The title as Cinemeta might know it, in English or in its own language</div><div data-col><div class="fld" data-row style="padding:0 8px 6px"><input class="field fx" tabindex="-1" id="wfName" type="text" placeholder="${esc(was)}" readonly spellcheck="false" autocomplete="off" style="width:100%"></div></div><div class="ad-foot">OK opens the keyboard · Enter searches · Back returns</div></div>`, { onClose: () => { if (!sent) setTimeout(() => whichFilm(tc, onDone, { query: was === tc.t.name ? '' : was }), 0); } });
  const f = ov.el.querySelector('#wfName');
  fieldKeys(ov.el, ['wfName'], () => {
    const v = f.value.trim();
    if (v) { sent = true; setTimeout(() => { ov.close(false); whichFilm(tc, onDone, { query: v }); }, 0); }
    return f;
  });
  focus(f);
}
export { PUZZLE };
