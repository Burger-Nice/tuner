// Home (SPEC 3.1, 01 / 02): the Marquee stacked (the picture on top, the lit line as its card, the other lines as 44 pt
// rows) and the personal rows under it. The lines follow the TV's rules (home-final SPEC 3, 4): the game leads from 3 h
// before tip-off (and the morning after), then what you're in the middle of, what is new in your shows, a film for
// tonight, the last channel. The rows are rows.js's page; the live rows (Your shows, the NBA, Saved, Channels) are
// drawn from what the app has.
import { hm, leftText, sized, teamPalette } from '../tv/js/util.js';
import { S, on, store, scoped, settings, continueRows, favList, isFav, toggleFav, progressOf, inProgress } from '../tv/js/state.js';
import { catalog, ensure } from '../tv/js/catalog.js';
import { guideNow, guideFor, onNow } from '../tv/js/guide.js';
import { nba, myGame, show, heldLive, bestChannel, findFeeds, recordFor, behindReplay, shielded, gameById } from '../tv/js/games.js';
import { WINDOW, morningGame, heroRow, findReplays, replaysOf, programmeView, videoMask } from '../tv/js/catchup.js';
import { watchFromTipoff, resumeGame } from '../tv/js/replay.js';
import { playLive } from '../tv/js/player.js';
import { resumeItem } from '../tv/js/actions.js';
import { anyStreamAddon } from '../tv/js/imdb.js';
import * as R from '../tv/js/rows.js';
import * as SH from '../tv/js/shelves.js';
import * as AD from '../tv/js/addons.js';
import * as TM from '../tv/js/tmdb.js';
import { analyse, capFor, glowOf } from '../tv/js/art.js';
import { avatar, ic, esc, push, go, isShown, menu, sheet, longPress, facts, crestImg, tileOf, cleanCh } from './ui.js';
import { gameCard, posterCard, contCard, dayWord } from './cards.js';
import { openTitle } from './detail.js';
import { tipsIn } from '../tv/js/nba/common.js';

let el, lines = [], lit = 0, rows = [], page = null, film = null, shows = [], picT = 0, picKey = '', hist = null;
const lastChannel = () => catalog.live?.byId.get(store.get(scoped('lastLive'), '')) || null;
export const ringFor = (ch) => (isFav(ch) ? favList('live').map((f) => catalog.live?.byId.get(f.id) || f) : catalog.live?.items || [ch]);
const tune = (ch) => ch && playLive(ch, ringFor(ch), isFav(ch) ? 'Favourites' : 'All channels');
// a channel's name short enough for a line of facts (the TV's): "NBA 01: Memphis Grizzlies @ …" -> NBA 01
const chShort = (n) => { let s = cleanCh(n); const m = s.match(/^([^:]{2,10}):\s/); if (m && s.length > 22) s = m[1]; return s.length > 24 ? `${s.slice(0, 22).replace(/\s+\S*$/, '')}…` : s; };
const short = (n) => ({ 'Trail Blazers': 'Blazers', Timberwolves: 'Wolves', Mavericks: 'Mavs', Cavaliers: 'Cavs' }[n] || n);
const imdbOfItem = (it) => (it.kind === 'episode' ? it.imdbSeries || '' : /^tt\d+$/.test(it.id) ? it.id : '');
const metas = new Map();
function metaOf(type, imdb) {
  if (!imdb) return null;
  const k = `${type}:${imdb}`;
  if (metas.has(k)) { const v = metas.get(k); return v instanceof Promise ? null : v; }
  metas.set(k, AD.meta(type, imdb).then((m) => { metas.set(k, m || false); soon(); return m; }, () => metas.set(k, false)));
  return null;
}
let soonT = 0;
const soon = () => { clearTimeout(soonT); soonT = setTimeout(() => { if (el && isShown('home')) draw(); }, 150); };

// ---------- the lines ----------
function heroGame() {
  if (settings().heroGame === false) return null;
  const g = myGame();
  if (g) {
    if (g.state === 'in' || heldLive(g)) return g;
    if (g.state === 'pre' && g.date - Date.now() < 3 * 3600e3) return g;
    if (g.state === 'post' && Date.now() - g.date < WINDOW + 3600e3) return g;
  }
  return morningGame();
}
function buildLines() {
  const out = [];
  const lead = heroGame(), g = lead || (settings().heroGame === false ? null : myGame());
  const cont = continueRows()[0];
  if (cont) out.push({ kind: 'cont', p: cont });
  const contShow = cont?.item.kind === 'episode' ? imdbOfItem(cont.item) : '';
  const nw = shows.find((f) => f.fresh && f.count && f.next && f.imdb !== contShow);
  if (nw) out.push({ kind: 'new', f: nw });
  if (anyStreamAddon() && film) out.push({ kind: 'film', it: film });
  if (out.length < 3) { const ch = lastChannel(); if (ch) out.push({ kind: 'ch', ch }); }
  // a first evening (no history, no picks): Pick what you like starts the rows (the TV's cold start)
  if (hist === false && !cont && !R.picked().length && anyStreamAddon()) out.splice(Math.min(out.length, 2), 0, { kind: 'pick' });
  const base = out.slice(0, 3);
  if (g) { if (lead) base.unshift({ kind: 'game', g }); else base.push({ kind: 'game', g }); }
  if (!base.length) base.push({ kind: 'browse' });
  return base;
}
const lineKey = (l) => `${l.kind}`;
function lineView(l) {
  const v = { kind: l.kind };
  if (l.kind === 'cont') {
    const p = l.p, it = p.item;
    if (it.kind === 'rp' || (it.kind === 'movie' && videoMask(it))) {
      const g = it.game, mk = it.kind === 'movie' ? videoMask(it) : null;
      v.name = mk ? mk.title : g ? `${short(g.away.name)} at ${short(g.home.name)}` : it.title || it.name;
      const where = it.pos?.chapter ? `Stopped in ${it.pos.chapter}` : 'Started';
      v.facts = ['Continue', 'Replay', where]; v.ey = 'Continue watching'; v.big = g ? `${g.away.name} at ${g.home.name}` : v.name;
      v.meta = [g ? 'NBA · Replay' : 'Replay', where]; v.bar = pct(p); v.verb = 'Resume'; v.right = g ? ['tipoff', 'From tip-off'] : null;
      v.pic = g ? { kind: 'game', g: gameById(g.id) || g } : { kind: 'flat' };
      return v;
    }
    const ep = it.kind === 'episode', imdb = imdbOfItem(it), m = metaOf(ep ? 'series' : 'movie', imdb);
    const left = leftText(p.d - p.t), vid = ep ? m?.videos?.find((x) => x.season === +it.season && x.episode === +it.ep) : null;
    v.name = ep ? it.seriesName || it._title || m?.name || '' : it._title || it.name;
    v.facts = ['Continue', ep ? `S${it.season} · E${it.ep}` : '', left];
    v.ey = 'Continue watching'; v.logo = m?.logo || ''; v.big = v.name;
    v.meta = [...(ep ? [`S${it.season} · E${it.ep}`, vid?.name || it.name] : [it.year ? String(it.year) : '']), left, `Ends ${hm(Date.now() + (p.d - p.t) * 1000)}`];
    v.line = ep ? vid?.overview || m?.description || '' : m?.description || '';
    v.bar = pct(p); v.verb = 'Resume'; v.right = ['details', ep ? 'Episodes' : 'Details'];
    v.pic = m?.background ? { kind: 'img', url: m.background } : it.still ? { kind: 'img', url: it.still } : { kind: 'flat' };
    return v;
  }
  if (l.kind === 'new') {
    const f = l.f, n = f.next, m = f.meta;
    v.name = f.name; v.facts = [`S${n.season} · E${n.episode}`, { html: `<span class="count">${f.count} new</span>` }];
    v.ey = 'New episodes'; v.logo = m?.logo || ''; v.big = f.name;
    v.meta = [`S${n.season} · E${n.episode}`, n.name, m?.runtime ? `${m.runtime} min` : ''];
    v.line = n.overview || m?.description || ''; v.verb = 'Episodes'; v.noplay = true; v.right = null;
    v.pic = m?.background ? { kind: 'img', url: m.background } : { kind: 'flat' };
    return v;
  }
  if (l.kind === 'film') {
    const it = l.it;
    v.name = it.name; v.facts = ['A film for tonight', it.runtime ? `ends ${hm(Date.now() + it.runtime * 60e3)}` : ''];
    v.ey = 'A film for tonight'; v.logo = it.logo || ''; v.big = it.name;
    v.meta = [it.year ? String(it.year) : '', (it.genres || []).slice(0, 2).join(' · '), it.runtime ? `${Math.floor(it.runtime / 60)}h ${String(it.runtime % 60).padStart(2, '0')}m` : '', it.rating ? `IMDb ${(+it.rating).toFixed(1)}` : ''];
    v.line = it.overview || ''; v.verb = 'Details'; v.noplay = true; v.right = ['films', 'More popular films'];
    v.pic = it.background ? { kind: 'img', url: it.background } : { kind: 'flat' };
    return v;
  }
  if (l.kind === 'game') {
    const g = l.g, sv = show(g), row = heroRow(g), ch = bestChannel(g);
    const hid = sv.hidden || (shielded(g) && behindReplay(g));
    const live = g.state === 'in' || heldLive(g);
    v.name = `${short(g.away.name)} at ${short(g.home.name)}`; v.big = `${g.away.name} at ${g.home.name}`; v.sharp = true;
    v.ey = row?.kind === 'morning' || row?.kind === 'looking' ? 'Last night' : 'Game night'; v.live = live && row?.kind !== 'behind';
    const cc = ch ? cleanCh(ch.name) : '', chName = cc && cc.length <= 18 ? cc : g.tv?.[0] || chShort(ch?.name || '');
    if (g.state === 'pre') {
      v.facts = ['Tonight', hm(g.date)]; v.meta = [`Tip-off ${hm(g.date)}`, tipsIn(g.date), chName];
      v.verb = ch && g.date - Date.now() < 3 * 3600e3 ? 'Watch pre-game' : 'Game page'; v.noplay = v.verb === 'Game page'; v.right = ['guide', 'Guide'];
    } else if (row?.kind === 'behind' || row?.kind === 'resume') {
      v.facts = ['Replay', row.pos?.chapter ? `Stopped in ${row.pos.chapter}` : 'Started', 'Score hidden'];
      v.meta = [row.kind === 'behind' ? 'Live' : 'Replay', row.pos?.chapter ? `You stopped in ${row.pos.chapter}` : 'You started it', hidHtml()];
      v.verb = 'Resume'; v.right = row.kind === 'behind' ? ['golive', 'Back to live'] : ['tipoff', 'From tip-off'];
    } else if (live) {
      v.facts = ['On now', chName, hid ? 'Score hidden' : `${g.away.score}–${g.home.score}`];
      v.meta = ['On now', chName, hid ? hidHtml() : `${g.away.score} – ${g.home.score}`];
      v.verb = 'Watch live'; v.right = row?.kind === 'live-tipoff' || replaysOf(g)?.length ? ['tipoff', 'From tip-off'] : ['game', 'Game page'];
    } else if (row?.kind === 'morning' || row?.kind === 'looking') {
      v.facts = ['Last night', 'Replay', 'Score hidden']; v.meta = ['Replay', row.kind === 'looking' ? 'Looking for a replay' : 'From tip-off, no spoilers', hidHtml()];
      v.verb = row.kind === 'morning' ? 'Watch from tip-off' : 'Game page'; v.noplay = row.kind !== 'morning'; v.right = ['game', 'Game page'];
    } else {
      v.facts = hid ? ['Ended', 'Score hidden'] : ['Final', `${g.away.score}–${g.home.score}`];
      v.meta = hid ? ['Ended', hidHtml()] : ['Final', `${g.away.score} – ${g.home.score}`];
      v.verb = 'Game page'; v.noplay = true; v.right = replaysOf(g)?.length ? ['tipoff', 'Watch again'] : null;
    }
    const ra = recordFor(g.away).text, rh = recordFor(g.home).text;
    v.line = ra || rh ? `${g.home.name === g.home.name ? '' : ''}${g.away.name} ${ra || '–'} · ${g.home.name} ${rh || '–'}${g.state !== 'pre' && (hid || live) ? ' · as of tip-off' : ''}` : '';
    v.pic = { kind: 'game', g };
    return v;
  }
  if (l.kind === 'ch') {
    const ch = l.ch, pr = onNow(guideNow(ch)), pv = pr ? programmeView(ch, pr) : null;
    if (!guideNow(ch)) guideFor(ch).then(soon).catch(() => {});
    const cn = cleanCh(ch.name);
    v.name = pv?.title ? cleanCh(pv.title) : cn; v.facts = [pr ? `until ${hm(pr.end)}` : 'On now', pv ? cn : ''];
    v.ey = `On now · ${cn}`; v.big = v.name;
    v.meta = [cn, pr ? `${hm(pr.start)} – ${hm(pr.end)}` : '', pr ? leftText((pr.end - Date.now()) / 1000) : ''];
    v.verb = 'Tune'; v.right = ['guide', 'Guide']; v.pic = { kind: 'flat', logo: ch.logo };
    return v;
  }
  if (l.kind === 'pick') {
    v.name = 'Pick what you like'; v.facts = ['Your rows']; v.ey = 'Your rows'; v.big = 'Pick what you like';
    v.meta = ['Three genres you like start your rows']; v.line = 'Comedy, anime, crime, sci-fi… airglow learns the rest from what you watch.';
    v.verb = 'Pick genres'; v.noplay = true; v.right = null; v.pic = { kind: 'flat' };
    return v;
  }
  v.name = 'Browse'; v.facts = ['Live, the NBA, films and series']; v.ey = 'airglow'; v.big = 'What\'s on'; v.meta = ['Live TV, the NBA and your add-ons']; v.verb = 'Live TV'; v.right = ['nba', 'NBA']; v.pic = { kind: 'flat' };
  return v;
}
const hidHtml = () => ({ html: `<span class="hid">${ic('eyeOff')}Score hidden</span>` });
const pct = (p) => (p?.d ? Math.min(100, (p.t / p.d) * 100) : 0);

// ---------- drawing ----------
function cardHtml(v) {
  const title = v.logo ? `<img class="logo" src="${esc(v.logo)}" alt="${esc(v.big)}" onerror="this.outerHTML='<div class=&quot;big&quot;>${esc(v.big).replace(/'/g, '')}</div>'">` : `<div class="big">${esc(v.big)}</div>`;
  const meta = (v.meta || []).filter(Boolean).map((x) => (typeof x === 'string' ? x : x));
  const off = S.offline ? '<div class="off">Needs a connection to play</div>' : '';
  return `<div class="hm-card${v.sharp ? ' sharp' : ''}" data-line="${lit}"><div class="ey">${esc(v.ey)}${v.live ? '<span class="live sm">Live</span>' : ''}</div>${title}
    <div class="facts">${facts(meta)}</div>${v.line ? `<div class="line">${esc(v.line)}</div>` : ''}${v.bar != null ? `<div class="bar4" style="--p:${v.bar}%"><i></i></div>` : ''}${off}
    <div class="act"><button class="pill${v.noplay ? ' noicon' : ''}" data-act="primary">${v.noplay ? '' : ic('play')}${esc(v.verb)}</button>${v.right ? `<button class="ghost" data-act="${v.right[0]}">${esc(v.right[1])}</button>` : ''}<button class="ghost sq" data-act="more" aria-label="More">${ic('more')}</button></div></div>`;
}
function lineRow(v, i) {
  const fs = (v.facts || []).filter(Boolean).map((x) => (typeof x === 'string' ? esc(x) : x.html)).join(' · ');
  return `<button class="e" data-line="${i}"><b>${esc(v.name)}</b><small>${fs}</small>${ic('chevR')}</button>`;
}
function fieldHtml(g) {
  const sv = show(g), hid = sv.hidden || (shielded(g) && behindReplay(g));
  const a = teamPalette(g.away), h = teamPalette(g.home);
  const rec = (t) => { const r = recordFor(t).text; return r ? `${esc(r)}${g.state !== 'pre' ? ' · as of tip-off' : ''}` : ''; };
  const live = g.state === 'in' || heldLive(g);
  const chip = g.state === 'pre' ? hm(g.date) : live ? 'ON NOW' : 'FINAL';
  const plate = g.state === 'pre' ? `${esc(dayWord(g.date))}` : hid ? `${ic('eyeOff')}Score hidden` : `${esc(sv.g.away.score)} – ${esc(sv.g.home.score)}`;
  return `<div class="field" style="--away:${a.p};--home:${h.p};--away-a:${a.a};--home-a:${h.a}"><div class="away"></div><div class="home"></div><div class="edge"><i></i><i></i></div><div class="sh0"></div><div class="shade"></div>
    <div class="side a">${crestImg({ ...g.away, logo: window.NBA.logoFor(g.away.abbr) }, 96)}<b>${esc(g.away.name)}</b><span>${rec(g.away)}</span></div>
    <div class="side h">${crestImg({ ...g.home, logo: window.NBA.logoFor(g.home.abbr) }, 96)}<b>${esc(g.home.name)}</b><span>${rec(g.home)}</span></div>
    <div class="gn-score"><span class="clock"><span>${esc(chip)}</span></span><span class="plate"><span>${plate}</span></span></div></div>`;
}
// the picture answers the lit line after a 600 ms rest; nothing moves by itself
function picture(v, now) {
  const box = el.querySelector('.hm-pic');
  if (!box) return;
  const p = v.pic || { kind: 'flat' };
  const key = p.kind === 'game' ? `g:${p.g.id}:${p.g.state}:${show(p.g).hidden}` : p.kind === 'img' ? p.url : `flat:${p.logo || ''}`;
  if (key === picKey) return;
  clearTimeout(picT);
  const apply = () => {
    picKey = key;
    if (p.kind === 'game') { box.innerHTML = fieldHtml(p.g); return; }
    if (p.kind === 'img') {
      const url = sized(String(p.url).replace(/\/background\/large\//, '/background/medium/'), 1280);
      box.innerHTML = `<img src="${esc(url)}" alt=""><div class="cap"></div><div class="amb"></div><div class="st"></div><div class="sb"></div>`;
      analyse(url).then((a) => { if (picKey !== key) return; box.querySelector('.cap')?.style.setProperty('--capa', capFor(a, 0.34)); box.style.setProperty('--amb', glowOf(a)); }).catch(() => {});
      return;
    }
    box.innerHTML = `<div class="amb" style="--amb:#3a2a55;opacity:.8"></div><div class="st"></div><div class="sb"></div>`;
  };
  if (now) apply(); else picT = setTimeout(apply, 600);
}
function draw() {
  if (!el || !S.acc) return;
  lines = buildLines();
  if (lit >= lines.length) lit = 0;
  const views = lines.map(lineView);
  const v = views[lit];
  const rowsHtml = rowsMarkup();
  const top = `<div class="ph-top"><img class="mk" src="tv/brand/assets/mark-small.svg" alt="airglow"><span class="sp"></span>${avatar()}</div>`;
  const others = views.map((x, i) => (i === lit ? '' : lineRow(x, i))).join('');
  // a redraw (scores, data landing) keeps every row where his thumb left it
  const keep = new Map([...el.querySelectorAll('.row')].map((r) => [r.dataset.id, r.querySelector('.cards')?.scrollLeft || 0]));
  const y = el.scrollTop;
  el.innerHTML = `<div class="hm"><div class="hm-pic"></div>${top}<div class="hm-body">${cardHtml(v)}<div class="hm-lines">${others}</div>${rowsHtml}</div></div>`;
  for (const r of el.querySelectorAll('.row')) { const x = keep.get(r.dataset.id); if (x) r.querySelector('.cards').scrollLeft = x; }
  el.scrollTop = y;
  const was = picKey;
  picKey = '';
  picture(v, true);
  void was;
}
function drawLit(i) {
  lit = i;
  const views = lines.map(lineView), v = views[lit];
  el.querySelector('.hm-card').outerHTML = cardHtml(v);
  el.querySelector('.hm-lines').innerHTML = views.map((x, k) => (k === lit ? '' : lineRow(x, k))).join('');
  picture(v, false);
}

// ---------- the rows ----------
const NAMES = { yourshows: 'Your shows', nba: 'Tonight in the NBA', saved: 'Saved', library: 'Browse your library', channels: 'Channels', noaddons: 'Films and series' };
function rowItems(r) {
  if (r.live === 'yourshows') return continueRows().slice(0, 12).map((p) => ({ cont: p }));
  if (r.live === 'nba') return nba.today.slice(0, 15);
  if (r.live === 'saved') return [...SH.savedItems('movie'), ...SH.savedItems('series')].filter((it) => it.poster);
  if (r.live === 'channels') {
    const live = catalog.live; if (!live) return [];
    const out = [], seen = new Set(), add = (ch) => { if (ch && !seen.has(ch.id) && !ch._sep) { seen.add(ch.id); out.push(ch); } };
    favList('live').forEach((f) => add(live.byId.get(f.id)));
    S.recents.forEach((id) => add(live.byId.get(id)));
    return out.slice(0, 16);
  }
  if (r.live === 'noaddons') return [{ note: true }];
  if (r.live === 'library') return [];
  return r.items || [];
}
function reasonOf(r, items) {
  if (r.live === 'yourshows') return `Where you are · ${items.length}`;
  if (r.live === 'nba') { const n = items.length, lv = items.filter((g) => g.state === 'in').length, fin = items.filter((g) => g.state === 'post').length, pre = items.filter((g) => g.state === 'pre').length; return [`${n} game${n === 1 ? '' : 's'}`, lv && `${lv} live`, fin && `${fin} final`, pre && `${pre} later`].filter(Boolean).join(' · '); }
  if (r.live === 'saved') return `${items.length} title${items.length === 1 ? '' : 's'}`;
  if (r.live === 'channels') return 'Favourites and recent';
  if (r.live === 'noaddons') return 'Add a Stremio add-on in Account › Add-ons';
  return r.reason || '';
}
function rowsMarkup() {
  const p = page?.rows || [];
  rows = p.map((r) => { const items = rowItems(r); return items.length ? { ...r, name: r.live ? NAMES[r.live] : r.name, reason: reasonOf(r, items), list: items } : null; }).filter(Boolean);
  if (!rows.length) {
    // no page yet: what the app has (your shows, the NBA, channels)
    const tmp = [{ id: 'yourshows', type: 'wide', live: 'yourshows' }, { id: 'nba', type: 'game', live: 'nba' }, { id: 'channels', type: 'channel', live: 'channels' }];
    rows = tmp.map((r) => { const items = rowItems(r); return items.length ? { ...r, name: NAMES[r.live], reason: reasonOf(r, items), list: items } : null; }).filter(Boolean);
  }
  return rows.map((r, ri) => `<div class="row" data-ri="${ri}" data-id="${esc(r.id)}"><div class="sec-h"><span class="ellipsis">${esc(r.name)}</span>${r.isNew ? '<span class="badge">New row</span>' : ''}<span class="sp"></span>${ri === 0 ? `<button class="more" data-act="index">${rows.length} rows ${ic('chevD')}</button>` : ''}</div>${r.reason ? `<div class="why">${esc(r.reason)}</div>` : ''}<div class="cards">${r.list.slice(0, 30).map((x, i) => cardOf(r, x, i)).join('')}</div></div>`).join('') + (anyStreamAddon() ? '' : '<div class="state"><b>Films and series</b><p>Add a Stremio add-on for films and series.</p><button class="ghost" data-act="addons">Account › Add-ons</button></div>')
    + (anyStreamAddon() && !TM.hasKey() ? '<div class="state"><b>More rows with your TMDB key</b><p>Trending, top rated, the streaming services and rows for what you like come from TMDB. Type the key from the TV here once.</p><button class="ghost" data-act="tmdb">Account › TMDB key</button></div>' : '')
    + (anyStreamAddon() && hist === false && !R.picked().length ? '<div class="state"><b>Pick what you like</b><p>Three genres start your own rows.</p><button class="pill noicon" data-act="pick">Pick genres</button></div>' : '');
}
function cardOf(r, x, i) {
  if (x.cont) return contCard(x.cont, i);
  if (r.live === 'nba' || r.type === 'game') return gameCard(x, { wide: false }).replace('class="gcard', `data-i="${i}" class="gcard`);
  if (r.live === 'channels' || r.type === 'channel') {
    const pr = onNow(guideNow(x));
    return `<button class="wide" data-i="${i}"><div class="box" style="display:flex;align-items:center;justify-content:center;background:var(--a-surface-1)">${tileOf(x)}<div class="bt"><b>${esc(pr ? programmeView(x, pr).title : x.name)}</b><span>${esc(x.name)}</span></div></div></button>`;
  }
  if (x.note) return '';
  return posterCard(x, i);
}
async function openRowItem(r, x) {
  if (x.cont) return resumeItem(x.cont.item);
  if (r.live === 'nba' || r.type === 'game') return push('game', { id: x.id });
  if (r.live === 'channels' || r.type === 'channel') return tune(x);
  return openTitle(x);
}
function rowMenu(r, x) {
  if (!x) return;
  if (x.cont) { const it = x.cont.item; return menu(it.seriesName || it._title || it.name, [{ label: 'Resume', icon: 'play', run: () => resumeItem(it) }, { label: 'Start over', icon: 'rew', run: () => resumeItem(it, { restart: true }) }]); }
  if (r.live === 'nba' || r.type === 'game') {
    const g = x, ch = bestChannel(g);
    return menu(`${g.away.name} at ${g.home.name}`, [g.state === 'in' && ch ? { label: 'Watch live', icon: 'play', run: () => tune(ch) } : null, g.state !== 'pre' ? { label: 'Watch from tip-off', icon: 'tipoff', run: () => watchFromTipoff(g) } : null, { label: 'Open the game', icon: 'chevR', run: () => push('game', { id: g.id }) }]);
  }
  if (r.live === 'channels' || r.type === 'channel') return menu(x.name, [{ label: 'Tune', icon: 'play', run: () => tune(x) }, { label: isFav(x) ? 'Remove from favourites' : 'Add to favourites', icon: 'star', run: () => toggleFav(x) }]);
  const t = SH.asTitle(x, x.imdb || x.id);
  menu(x.name, [
    { label: 'Details', icon: 'chevR', run: () => openTitle(x) },
    { label: isFav(t) ? 'Remove from Saved' : 'Save', icon: 'heart', run: () => toggleFav(t) },
    r.live ? null : { label: 'Not interested', icon: 'close', run: () => { R.notWanted(x); r.items = (r.items || []).filter((y) => y !== x); draw(); } },
    r.live ? null : { label: 'Why this row?', icon: 'bang', run: async () => { const w = await R.whyRow(r); menu(w.title, w.lines.map((l) => ({ label: l }))); } },
    r.live ? null : { label: 'Hide this row', icon: 'eyeOff', run: () => { R.hideRow(r); page = R.pageNow(); draw(); } },
  ]);
}
function indexSheet() {
  sheet(`<h3>${rows.length} rows</h3><div class="body">${rows.map((r, i) => `<button class="lr" data-act="${i}"><span class="col">${esc(r.name)}${r.reason ? `<small>${esc(r.reason)}</small>` : ''}</span></button>`).join('')}</div>`, {
    full: true, onClick: (a, t, close) => { close(); const row = el.querySelector(`.row[data-ri="${a}"]`); row?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  });
}

// ---------- taps ----------
function lineAct(act) {
  const l = lines[lit], v = lineView(l);
  if (act === 'more') return lineMenu(l);
  if (l.kind === 'game') {
    const g = l.g, ch = bestChannel(g), row = heroRow(g);
    if (act === 'primary') {
      if (v.verb === 'Resume') return resumeGame(g);
      if (v.verb === 'Watch from tip-off') return watchFromTipoff(g);
      if (v.noplay || !ch) { if (!ch && !v.noplay) toastNoChannel(); return push('game', { id: g.id }); }
      return tune(ch);
    }
    if (act === 'tipoff') return watchFromTipoff(g);
    if (act === 'golive') { const c = ch; return c ? tune(c) : toastNoChannel(); }
    if (act === 'game') return push('game', { id: g.id });
    if (act === 'guide') return go('live');
    void row;
  }
  if (l.kind === 'cont') {
    const it = l.p.item;
    if (act === 'primary') return resumeItem(it);
    if (act === 'tipoff' && it.game) return watchFromTipoff(gameById(it.game.id) || it.game);
    if (act === 'details') return openTitleOf(it);
  }
  if (l.kind === 'new') return openTitle({ kind: 'series', id: l.f.imdb, imdb: l.f.imdb, name: l.f.name, poster: l.f.meta?.poster || '' });
  if (l.kind === 'film') { if (act === 'films') return go('lib', { seg: 'movie' }); return openTitle(l.it); }
  if (l.kind === 'ch') { if (act === 'guide') return go('live'); return tune(l.ch); }
  if (l.kind === 'browse') return act === 'nba' ? go('nba') : go('live');
  if (l.kind === 'pick') return pickSheet();
}
const toastNoChannel = () => import('../tv/js/ui.js').then((u) => u.toast('No channel found for this game yet. Pick it in Live and it will be remembered.', 4500));
function openTitleOf(it) {
  if (it.kind === 'episode') return openTitle({ kind: 'series', id: it.imdbSeries || it.seriesId, imdb: it.imdbSeries || '', name: it.seriesName, poster: it.poster, _prov: it.copy?.source === 'provider' || !it.copy ? it.seriesId : null });
  return openTitle({ kind: 'movie', id: it.id, imdb: /^tt/.test(it.id) ? it.id : '', name: it._title || it.name, poster: it.poster, _prov: !it.copy || it.copy.source === 'provider' ? it.id : null });
}
function lineMenu(l) {
  if (l.kind === 'game') { const g = l.g; return menu(`${g.away.name} at ${g.home.name}`, [{ label: 'Game page', icon: 'chevR', run: () => push('game', { id: g.id }) }, g.state !== 'pre' ? { label: 'Watch from tip-off', icon: 'tipoff', run: () => watchFromTipoff(g) } : null, { label: 'NBA', icon: 'ball', run: () => go('nba') }]); }
  if (l.kind === 'cont') { const it = l.p.item; return menu(it.seriesName || it._title || it.name || 'Continue', [{ label: 'Start over', icon: 'rew', run: () => resumeItem(it, { restart: true }) }, it.kind !== 'rp' ? { label: 'Details', icon: 'chevR', run: () => openTitleOf(it) } : null]); }
  if (l.kind === 'ch') return menu(l.ch.name, [{ label: isFav(l.ch) ? 'Remove from favourites' : 'Add to favourites', icon: 'star', run: () => toggleFav(l.ch) }, { label: 'Open the guide', icon: 'chevR', run: () => go('live') }]);
  if (l.kind === 'film') return menu(l.it.name, [{ label: 'Details', icon: 'chevR', run: () => openTitle(l.it) }, { label: 'Save', icon: 'heart', run: () => toggleFav(SH.asTitle(l.it, l.it.imdb || l.it.id)) }]);
  return null;
}

export default {
  name: 'home', tab: true,
  mount(root) {
    el = root;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b) {
        const a = b.dataset.act;
        if (a === 'account') return push('account');
        if (a === 'index') return indexSheet();
        if (a === 'addons') return push('account', { open: 'addons' });
        if (a === 'tmdb') return push('account', { open: 'tmdb' });
        if (a === 'pick') return pickSheet();
        if (b.closest('.hm-card')) return lineAct(a);
      }
      const ln = e.target.closest('.hm-lines [data-line]');
      if (ln) return drawLit(+ln.dataset.line);
      const card = e.target.closest('.row [data-i]');
      if (card) { const r = rows[+card.closest('.row').dataset.ri]; const x = r?.list[+card.dataset.i]; if (x) openRowItem(r, x); }
    });
    longPress(root, '.row [data-i]', (card) => { const r = rows[+card.closest('.row').dataset.ri]; rowMenu(r, r?.list[+card.dataset.i]); });
    longPress(root, '.hm-card', () => lineMenu(lines[lit]));
    const redraw = () => { if (isShown('home')) soon(); };
    on('nba', redraw); on('progress', redraw); on('feeds', redraw); on('replays', redraw); on('favs', redraw);
    on('rows', (p) => { page = p; redraw(); });
    on('session', () => { page = null; film = null; shows = []; lit = 0; hist = null; metas.clear(); });
  },
  async enter(root, params, { fresh }) {
    if (!S.acc) return;
    draw();
    if (fresh) root.scrollTop = 0;
    ensure('live').then(() => soon()).catch(() => {});
    const g = myGame();
    if (g && (g.state === 'in' || (g.state === 'pre' && g.date - Date.now() < 3 * 3600e3))) findFeeds(g).then(soon);
    if (g && g.state !== 'pre') findReplays(g).then(soon);
    if (!page) { const p = await R.cachedPage().catch(() => null); if (p) { page = p; soon(); } }
    R.buildPage().then((p) => { if (p) { page = p; soon(); } }).catch(() => {});
    if (!film && anyStreamAddon()) R.filmTonight().then((f) => { film = f; soon(); }).catch(() => {});
    if (hist == null) R.hasHistory().then((h) => { hist = h; soon(); }).catch(() => {});
    if (!shows.length && anyStreamAddon()) R.followed().then((s) => { shows = s || []; soon(); }).catch(() => {});
  },
};
void progressOf; void inProgress;

// Pick what you like (the TV's cold start, home.js pickSheet): up to three genres seed the rows
const PICKABLE = ['Comedy', 'Drama', 'Crime', 'Anime', 'Action', 'Sci-Fi', 'Thriller', 'Horror', 'Romance', 'Documentary', 'Fantasy', 'Mystery', 'Animation', 'Family', 'Adventure', 'History', 'War', 'Western'];
export function pickSheet() {
  let sel = [...R.picked()];
  const body = () => `<h3>Pick what you like</h3><div class="sub">Three genres start your rows. airglow learns the rest from what you watch.</div><div class="body"><div class="pick-g">${PICKABLE.map((g) => `<button class="chip${sel.includes(g) ? ' sel' : ''}" data-act="g" data-v="${esc(g)}">${esc(g)}</button>`).join('')}</div></div><div class="act2"><button class="pill noicon" data-act="done">${sel.length ? `Start my rows · ${sel.length} of 3` : 'Pick up to 3'}</button></div>`;
  const ov = sheet(body(), {
    onClick: (act, t, close) => {
      if (act === 'g') {
        const g = t.dataset.v;
        sel = sel.includes(g) ? sel.filter((x) => x !== g) : sel.length < 3 ? [...sel, g] : sel;
        ov.el.querySelectorAll('[data-act="g"]').forEach((c) => c.classList.toggle('sel', sel.includes(c.dataset.v)));
        ov.el.querySelector('[data-act="done"]').textContent = sel.length ? `Start my rows · ${sel.length} of 3` : 'Pick up to 3';
      } else if (act === 'done') {
        if (!sel.length) return;
        close();
        R.setPicks(sel);
        import('../tv/js/ui.js').then((u) => u.toast(`Your rows start from ${sel.join(', ')}`));
        R.buildPage({ force: true }).then((p) => { if (p) { page = p; soon(); } }).catch(() => {});
        soon();
      }
    },
  });
}
