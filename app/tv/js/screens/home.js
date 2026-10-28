// Home (design/ui-v1/home-final/SPEC.md): two halves joined by one key.
// The Marquee: three big lines down the left (what you are in the middle of, what is new in your shows, one pick for
// tonight; a fourth, the game, on a game day), the lit one opened in place as its card, and one full-screen picture
// that answers it. Down past the last line (or P− from anywhere) is the browsing half: rows of posters and cards, each
// with its reason, the picture answering the focused title (gently), a row index at the right.
// Nothing moves by itself: the page of rows changes between visits (rows.js), never under his thumb; the picture swaps
// only after the focus rests 600 ms; a key press changes classes and one transform.
import { esc, ic, setHtml, hm, leftText, sized, crest, teamPalette, initials } from '../util.js';
import { S, on, store, scoped, settings, favList, continueRows, toggleFav, isFav, markWatched, progressOf, inProgress } from '../state.js';
import { catalog, ensure } from '../catalog.js';
import { guideNow, onNow, warm } from '../guide.js';
import { nba, myGame, mySide, findFeeds, feedsKnown, bestChannel, setTeamChannel, channelCandidates, reveal, show, recordFor, heldLive, gameById, ordinal, liveShown, behindReplay, shielded } from '../games.js';
import { gameCard } from '../cards.js';
import { playLive, watching } from '../player.js';
import { push, go, current, setBar, focusTab } from '../router.js';
import { focus } from '../focus.js';
import { openOverlay, contextMenu, toast, scrollList, confirmMenu } from '../ui.js';
import { resumeItem, openTitle } from '../actions.js';
import { launchOpen, launchDone } from '../launch.js';
import { gameMenu } from '../nba/hub.js';
import { tipsIn } from '../nba/common.js';
import { morningGame, WINDOW, findReplays, replaysOf, programmeView, heroRow, videoMask, sourceCaption } from '../catchup.js';
import { heroAct, heroHold, resumeGame, watchFromTipoff, playProgramme } from '../replay.js';
import { resumeAddonItem } from '../titlecopies.js';
import { checkCopies } from '../subs.js';
import { anyStreamAddon } from '../imdb.js';
import * as R from '../rows.js';
import * as SH from '../shelves.js';
import * as TM from '../tmdb.js';
import * as AD from '../addons.js';
import { analyse, known, capFor, glowOf, logoInfo, logoHtml } from '../art.js';

// ---------- geometry (SPEC 3) ----------
const LINE_Y = 92, SLOT = 42, CARD_H = 192, OPEN = CARD_H + 8 - SLOT;   // the lit line opens 158 px in place
const ROW_Y = 244;                                                       // the focused row's title
const CARD = { poster: [124, 186, 148], wide: [198, 111, 222], channel: [198, 111, 222], door: [198, 111, 222], note: [420, 111, 444], game: [272, 124, 296] };
const rowH = (type) => 46 + CARD[type][1] + 14;                          // title + gap, the cards, 14 px to the next title
const maxPos = (type) => Math.floor((852 - CARD[type][0] * 1.05) / CARD[type][2]);   // the focused card's ring stays inside x 912
const MOUNT = { poster: 8, wide: 6, channel: 6, door: 6, note: 1, game: 4 }, NEAR_UP = 1, NEAR_DOWN = 3;

let el, mq, rw, pic, mode = 'mq', lines = [], lit = 0, leftLine = 0, cards = [];
let rows = [], fi = 0, mem = {}, mounted = {}, page = null, colT = 0, picT = 0, picKey = '', wantKey = '';
let lineData = { day: -1, film: null, cold: null, shows: [], hist: null };
let behind = false, drawnOnce = false, touched = false;   // touched: he has pressed a key on Home since it opened

// ---------- small helpers ----------
const ctx2d = document.createElement('canvas').getContext('2d');
const width = (t, font) => { ctx2d.font = font; return ctx2d.measureText(t).width; };
const NAME_F = '700 30px Outfit, sans-serif', FACT_F = '500 16px "Inter Variable", Inter, sans-serif', PLOT_F = '500 15px "Inter Variable", Inter, sans-serif';
// one line, cut at a word (never mid-word)
function fitWords(text, px, font = PLOT_F) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s || width(s, font) <= px) return s;
  const w = s.split(' ');
  let out = '';
  for (const x of w) { const t = out ? `${out} ${x}` : x; if (width(`${t}…`, font) > px) break; out = t; }
  return out ? `${out.replace(/[,;:.–-]+$/, '')}…` : '';
}
const D = '<span class="dot">·</span>';
const facts = (list) => list.filter(Boolean).map((x) => (typeof x === 'string' ? `<span>${esc(x)}</span>` : x.html)).join(D);
const K = { right: '<span class="k"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>', ok: '<span class="k">OK</span>', hold: '<span class="k">Hold</span>', pm: '<span class="k">P−</span>', pp: '<span class="k">P+</span>' };
const PLAY = '<svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg>';
const pill = (verb, play) => `<span class="hf-pill${play ? '' : ' noicon'}">${play ? PLAY : ''}${esc(verb)}</span>`;
const short = (n) => ({ 'Trail Blazers': 'Blazers', Timberwolves: 'Wolves', Mavericks: 'Mavs', Cavaliers: 'Cavs' }[n] || n);
const pct = (p) => (p?.d ? Math.min(100, (p.t / p.d) * 100) : 0);
const endsAt = (min) => hm(Date.now() + min * 60e3);
const dur = (min) => (min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m` : `${min} min`);
const lastChannel = () => catalog.live?.byId.get(store.get(scoped('lastLive'), '')) || null;
const homeHidden = () => new Set(store.get(scoped('homeHidden'), []));
const late = () => new Date().getHours() >= 23 || new Date().getHours() < 4;
const posterUrl = (u) => sized(String(u || '').replace(/\/poster\/(medium|large)\//, '/poster/small/'), 342);
const bgUrl = (u) => sized(String(u || '').replace(/\/background\/large\//, '/background/medium/'), 1280);
// The zap ring is the group you tuned from: favourites when it's a favourite, else every channel.
export const ringFor = (ch) => (isFav(ch) ? favList('live').map((f) => catalog.live?.byId.get(f.id) || f) : catalog.live?.items || [ch]);
export const ringName = (ch) => (isFav(ch) ? 'Favourites' : 'All channels');
const tune = (ch) => ch && playLive(ch, ringFor(ch), ringName(ch));
// a channel's name short enough for a line of facts: "US: ESPN HD" -> ESPN HD, "NBA 01: Memphis Grizzlies @ …" -> NBA 01
const chShort = (n) => { let s = String(n || '').replace(/^[A-Z]{2,3}\s*[|:]\s*/, ''); const m = s.match(/^([^:]{2,10}):\s/); if (m && s.length > 22) s = m[1]; return s.length > 24 ? `${s.slice(0, 22).replace(/\s+\S*$/, '')}…` : s; };

// metas by IMDb id (logos, backdrops, episode names), asked once; a row or line that waits for one redraws when it lands
const metas = new Map();
let metaT = 0;
function metaOf(type, imdb) {
  if (!imdb) return null;
  const k = `${type}:${imdb}`;
  if (metas.has(k)) return metas.get(k) instanceof Promise ? null : metas.get(k);
  metas.set(k, AD.meta(type, imdb).then((m) => { metas.set(k, m || false); clearTimeout(metaT); metaT = setTimeout(softRedraw, 120); return m; }, () => metas.set(k, false)));
  return null;
}
const imdbOfItem = (it) => (it.kind === 'episode' ? it.imdbSeries || (/^tt/.test(it.id) ? String(it.id).split(':')[0] : '') : /^tt\d+$/.test(it.id) ? it.id : '');

// ---------- the game (home-v2 3.2; catch-up 5.1) ----------
// Your team's game leads from 3 h before tip-off to 30 min after the final; then the morning after (a hidden game with
// a replay). Earlier on a game day it is the lineup's last line.
function heroGame() {
  if (settings().heroGame === false) return null;
  const g = myGame();
  if (g) {
    if (g.state === 'in' || heldLive(g)) return g;
    if (g.state === 'pre' && g.date - Date.now() < 3 * 3600e3) return g;
    if (g.state === 'post' && Date.now() - g.date < WINDOW + 3600e3 && (!g._finalAt || Date.now() - g._finalAt < 30 * 60e3)) { g._finalAt = g._finalAt || Date.now(); return g; }
  }
  return morningGame();
}
const gameDayGame = () => (settings().heroGame === false ? null : heroGame() || myGame());
const gameShort = (g) => `${short(g.away.name)} at ${short(g.home.name)}`;
// the record as he may see it: stamped "as of tip-off" while the game is on or hidden (SPEC 8)
function recLine(t, g) {
  const r = recordFor(t).text;
  if (!r) return '';
  return g.state !== 'pre' && (show(g).hidden || g.state === 'in') ? `${r} · as of tip-off` : r;
}

// ---------- the lineup (SPEC 3, 4) ----------
function buildLines() {
  const out = [];
  const g = gameDayGame(), lead = !!heroGame();
  const hide = homeHidden();
  const cont = continueRows().filter((p) => !hide.has(`${p.item.kind}:${p.item.id}`))[0];
  const films = anyStreamAddon();
  const cold = lineData.hist === false && !cont;
  if (cold) {
    if (films && lineData.cold) out.push({ kind: 'film', it: lineData.cold, cold: true });
    const ch = lastChannel();
    if (ch) out.push({ kind: 'ch', ch });
    out.push({ kind: 'pick' });
  } else {
    if (cont) out.push({ kind: 'cont', p: cont });
    const contShow = cont?.item.kind === 'episode' ? imdbOfItem(cont.item) : '';
    const nw = lineData.shows.find((f) => f.fresh && f.count && f.next && f.imdb !== contShow);
    if (nw) out.push({ kind: 'new', f: nw });
    const shortEp = late() ? lineData.shows.find((f) => f.next && f.imdb !== contShow && f !== nw && (f.meta?.runtime || 99) < 45) : null;
    if (shortEp) out.push({ kind: 'short', f: shortEp });
    else if (films && lineData.film) out.push({ kind: 'film', it: lineData.film });
    if (out.length < 3) { const ch = lastChannel(); if (ch) out.push({ kind: 'ch', ch }); }
    if (out.length < (films ? 2 : 1) && !g) out.push({ kind: 'pick' });   // (always a line to land on)
  }
  const base = out.slice(0, 3);
  if (g) { if (lead) base.unshift({ kind: 'game', g }); else base.push({ kind: 'game', g }); }
  return base;
}
const lineKey = (l) => `line:${l.kind}`;

// What each line says: { name, facts (the 42 px line), ey, big name or logo, meta, line, bar, verb, play, right, hold, picture }
function lineView(l) {
  const v = { kind: l.kind };
  if (l.kind === 'cont') {
    const p = l.p, it = p.item, mk = it.kind === 'movie' ? videoMask(it) : null;
    if (it.kind === 'rp' || mk) {
      const g = it.game;
      v.name = mk ? mk.title : g ? `${short(g.away.name)} at ${short(g.home.name)}` : it.title || it.name;
      const where = it.pos?.chapter ? `Stopped in ${it.pos.chapter}` : 'Started';
      v.facts = ['Continue', 'Replay', where]; v.ey = 'Continue watching'; v.big = mk ? mk.title : g ? `${g.away.name} at ${g.home.name}` : v.name;
      v.meta = [g ? 'NBA · Replay' : `${it.channel || ''} · Replay`, where]; v.bar = pct(p); v.verb = 'Resume'; v.play = true; v.right = g ? 'From tip-off' : 'Start over'; v.hold = 'Game page, Remove';
      v.picture = g ? { kind: 'game', g: gameById(g.id) || g, quiet: true } : { kind: 'flat' };
      return v;
    }
    const ep = it.kind === 'episode', imdb = imdbOfItem(it), m = metaOf(ep ? 'series' : 'movie', imdb);
    const left = leftText(p.d - p.t), vid = ep ? m?.videos?.find((x) => x.season === +it.season && x.episode === +it.ep) : null;
    v.name = ep ? it.seriesName || it._title || m?.name || '' : it._title || it.name;
    v.facts = ['Continue', ...(ep ? [`S${it.season} · E${it.ep}`] : []), left];
    v.ey = 'Continue watching'; v.logo = m?.logo || ''; v.big = v.name;
    v.meta = [...(ep ? [`S${it.season} · E${it.ep}`, vid?.name || it.name] : [it.year ? String(it.year) : '']), left, `Ends ${hm(Date.now() + (p.d - p.t) * 1000)}`].filter(Boolean);
    v.line = ep ? vid?.overview || m?.description || '' : m?.description || '';
    v.bar = pct(p); v.verb = 'Resume'; v.play = true; v.right = ep ? 'Episodes' : 'Details'; v.hold = 'Start over, Details';
    v.picture = m?.background ? { kind: 'img', url: bgUrl(m.background), key: `m:${imdb}` } : it.poster || it.still ? { kind: 'poster', url: it.poster || it.still, key: `p:${it.id}` } : { kind: 'flat' };
    return v;
  }
  if (l.kind === 'new' || l.kind === 'short') {
    const f = l.f, n = f.next, m = f.meta;
    v.name = f.name;
    v.facts = l.kind === 'new' ? ['New episodes', `S${n.season} · E${n.episode}`, { html: `<span class="count">${f.count} new</span>`, badge: true }] : ['Short', `S${n.season} · E${n.episode}`, m?.runtime ? `${m.runtime} min` : ''];
    v.ey = l.kind === 'new' ? 'New episodes' : 'Something short'; v.logo = m?.logo || ''; v.big = f.name;
    v.meta = [`S${n.season} · E${n.episode}`, n.name, m?.runtime ? `${m.runtime} min` : '', m?.runtime ? `Ends ${endsAt(m.runtime)}` : ''].filter(Boolean);
    v.line = n.overview || m?.description || '';
    v.verb = 'Play'; v.play = true; v.right = 'Episodes'; v.hold = 'Details';
    v.picture = m?.background ? { kind: 'img', url: bgUrl(m.background), key: `m:${f.imdb}` } : { kind: 'flat' };
    return v;
  }
  if (l.kind === 'film') {
    const it = l.it;
    v.name = it.name;
    v.facts = l.cold ? ['Popular now', 'a pick for tonight'] : ['A film for tonight', it.runtime ? `ends ${endsAt(it.runtime)}` : ''];
    v.ey = l.cold ? 'Popular now · a pick for tonight' : 'A film for tonight'; v.logo = it.logo || ''; v.big = it.name;
    v.meta = [it.year ? String(it.year) : '', { html: `<span>${esc((it.genres || []).slice(0, 2).join('·'))}</span>` }, it.runtime ? dur(it.runtime) : '', it.runtime ? `Ends ${endsAt(it.runtime)}` : '', it.rating ? `IMDb ${it.rating.toFixed(1)}` : ''].filter((x) => x && (typeof x === 'string' || x.html !== '<span></span>'));
    v.line = it.overview || '';
    v.verb = 'Details'; v.play = false; v.right = 'More popular films'; v.hold = 'Play now, Save';
    v.picture = it.background ? { kind: 'img', url: bgUrl(it.background), key: `i:${it.id}` } : it.poster ? { kind: 'poster', url: it.poster, key: `p:${it.id}` } : { kind: 'flat' };
    return v;
  }
  if (l.kind === 'game') {
    const g = l.g, sv = show(g), hid = sv.hidden || (shielded(g) && behindReplay(g)), row = heroRow(g), ch = bestChannel(g);
    v.name = gameShort(g); v.big = `${g.away.name} at ${g.home.name}`; v.sharp = true; v.row = row?.kind || '';
    v.ey = row?.kind === 'morning' || row?.kind === 'looking' || (g.state === 'post' && Date.now() - g.date > 6 * 3600e3) ? 'Last night' : 'Game night';
    const chName = chShort(ch?.name || g.tv[0] || '');
    const live = g.state === 'in' || heldLive(g);
    v.live = live && !(row?.kind === 'behind');
    if (g.state === 'pre') {
      v.facts = [lineData.hist === false ? 'Your team' : 'Tonight', hm(g.date)];
      v.meta = [`Tip-off ${hm(g.date)}`, tipsIn(g.date), chName];
      v.verb = g.date - Date.now() < 3 * 3600e3 && ch ? 'Watch pre-game' : 'Game page'; v.play = v.verb !== 'Game page'; v.right = 'Guide'; v.hold = ch ? 'Watch, more' : 'Teams, more';
    } else if (row?.kind === 'behind' || row?.kind === 'resume') {
      v.facts = ['Replay', row.pos?.chapter ? `Stopped in ${row.pos.chapter}` : 'Started', 'Score hidden'];
      v.meta = [row.kind === 'behind' ? 'Live' : 'Replay', row.pos?.chapter ? `You stopped in ${row.pos.chapter}` : 'You started it', 'Score hidden'];
      v.verb = 'Resume'; v.play = true; v.right = row.kind === 'behind' ? 'Back to live' : 'From tip-off'; v.hold = 'Sources, more';
    } else if (live) {
      v.facts = ['On now', chName, hid ? 'Score hidden' : ''];
      v.meta = ['On now', chName, hid ? { html: `<span class="hf-hid">${ic('eyeOff', 'xs')}Score hidden</span>` } : `${esc(g.away.score)} – ${esc(g.home.score)}`];
      v.verb = 'Watch live'; v.play = true; v.right = row?.kind === 'live-tipoff' || replaysOf(g)?.length ? 'From tip-off' : 'Game page'; v.hold = hid ? 'Reveal, more' : 'Sources, more';
    } else if (row?.kind === 'morning' || row?.kind === 'looking') {
      v.facts = ['Last night', 'Replay', 'Score hidden'];
      v.meta = ['Replay', row.kind === 'looking' ? 'Looking for a replay' : 'From tip-off, no spoilers', { html: `<span class="hf-hid">${ic('eyeOff', 'xs')}Score hidden</span>` }];
      v.verb = row.kind === 'morning' ? 'Watch from tip-off' : 'Game page'; v.play = row.kind === 'morning'; v.right = 'Game page'; v.hold = 'Reveal, more';
    } else {
      v.facts = hid ? ['Ended', 'Score hidden'] : ['Final', `${g.away.score}–${g.home.score}`];
      v.meta = hid ? ['Ended', { html: `<span class="hf-hid">${ic('eyeOff', 'xs')}Score hidden</span>` }] : ['Final', `${g.away.score} – ${g.home.score}`];
      v.verb = 'Game page'; v.play = false; v.right = replaysOf(g)?.length ? 'Watch again' : ''; v.hold = hid ? 'Reveal, more' : 'Teams, more';
    }
    const ra = recLine(g.away, g), rh = recLine(g.home, g);
    // the morning after: where the replay is and until when ("US: ESPN HD · replays until Thu 29 · late")
    if ((row?.kind === 'morning' || row?.kind === 'resume') && row.src) v.line = sourceCaption(row.src, { short: false }).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&');
    else v.line = ra || rh ? `${g.away.name} ${recordFor(g.away).text || '–'} · ${g.home.name} ${recordFor(g.home).text || '–'}${g.state !== 'pre' && (hid || live) ? ' · as of tip-off' : ''}` : '';
    v.picture = { kind: 'game', g, key: `g:${g.id}:${g.state}:${hid}:${hid ? '' : `${g.period}:${g.clock}:${g.away.score}:${g.home.score}`}:${ra}:${rh}` };
    return v;
  }
  if (l.kind === 'ch') {
    const ch = l.ch, pr = onNow(guideNow(ch)), pv = pr ? programmeView(ch, pr) : null;
    v.name = pv?.title || ch.name;
    v.facts = ['On now', ch.name, pr ? `until ${hm(pr.end)}` : ''];
    v.ey = `On now · ${ch.name} · channel ${ch.num}`; v.big = v.name;
    v.meta = [ch.name, pr ? `${hm(pr.start)} – ${hm(pr.end)}` : '', pr ? leftText((pr.end - Date.now()) / 1000) : ''].filter(Boolean);
    const next = (guideNow(ch) || []).filter((x) => pr && x.start >= pr.end).slice(0, 3);
    v.line = next.length ? `Next · ${next.map((x) => `${programmeView(ch, x).title} ${hm(x.start)}`).join(' · ')}` : '';
    v.verb = 'Tune'; v.play = true; v.right = 'Guide'; v.hold = 'Save channel, Open in the guide';
    v.picture = { kind: 'flat', logo: ch.logo, name: ch.name, key: `c:${ch.id}` };
    return v;
  }
  v.name = 'Pick what you like'; v.facts = ['3 genres start your rows']; v.ey = 'Your rows'; v.big = 'Pick what you like';
  v.meta = ['Three genres you like start your rows']; v.line = R.picked().length ? `You picked ${R.picked().join(', ')}` : 'Comedy, anime, crime, sci-fi…';
  v.verb = 'Open'; v.play = false; v.right = ''; v.hold = '';
  v.picture = null;
  return v;
}
// The 42 px line: the name and its facts inside 470 px (a long name shortens first, then the facts go from the end:
// the badge, then the fact, then the reason)
function compactHtml(v) {
  let fs = v.facts.filter(Boolean);
  const room = 470 - 32;
  const w = () => width(v.name, NAME_F) + 12 + width(fs.map((x) => (typeof x === 'string' ? x : '3 new')).join(' · '), FACT_F) + fs.length * 4;
  if (w() > room) v = { ...v, name: R.shortName(v.name) };   // (Always Sunny, not It's Always Sunny in Philadelphia)
  while (fs.length > 1 && w() > room) fs = fs.slice(0, -1);
  return `<div class="t"><span class="nm">${esc(v.name)}</span><small>${fs.map((x) => (typeof x === 'string' ? `<span>${esc(x)}</span>` : x.html)).join(D).replace(`${D}<span class="count">`, '<span class="count">')}</small></div>`;
}
function cardHtml(v) {
  const title = v.logo ? logoHtml(v.logo, v.big, 56, 340, 'hf-lg') : `<div class="big${String(v.big).length > 18 ? ' long' : ''}">${esc(v.big)}</div>`;
  const hints = [pill(v.verb, v.play)];
  if (v.right && R.hintShown(v.kind, 'right')) hints.push(`<span>${K.right}${esc(v.right)}</span>`);
  if (v.hold && R.hintShown(v.kind, 'hold')) hints.push(`<span>${K.hold}${esc(v.hold)}</span>`);
  const off = S.offline ? '<div class="off">Needs a connection to play</div>' : '';
  return `<div class="ey">${esc(v.ey)}${v.live ? '<span class="a-live compact">Live</span>' : ''}</div>${title}
    <div class="meta">${facts(v.meta)}</div>${v.line ? `<div class="line">${esc(fitWords(v.line, 434))}</div>` : ''}${v.bar != null ? `<div class="bar"><i style="width:${v.bar}%"></i></div>` : ''}${off}
    <div class="hint">${hints.join('')}</div>`;
}
function drawLineup(keepKey) {
  const was = keepKey || (document.activeElement?.closest?.('.hf-lineup') ? document.activeElement.dataset.key : lines[lit] ? lineKey(lines[lit]) : '');
  lines = buildLines();
  const i = lines.findIndex((l) => lineKey(l) === was);
  // the lit line follows its item; until he has pressed a key it is the first line (the lines land one by one)
  lit = !touched ? 0 : i >= 0 ? i : Math.min(lit, Math.max(0, lines.length - 1));
  // the game's channels and replays are looked for as soon as there is a game and a channel list
  for (const l of lines) if (l.kind === 'game') { const g = l.g; if (!feedsKnown(g) && catalog.live) findFeeds(g); if (g.state !== 'pre' && !replaysOf(g) && catalog.live) findReplays(g); }
  const views = lines.map(lineView);
  lines.forEach((l, j) => (l.v = views[j]));
  // (only the lit line's card is in the page: the others' are kept as text and swapped in on a press, SPEC 9)
  cards = views.map(cardHtml);
  const html = views.map((v, j) => `<div class="hf-e fx${v.sharp ? ' sharp' : ''}" tabindex="-1" data-key="${lineKey(lines[j])}" data-li="${j}"${v.row ? ` data-row-kind="${v.row}"` : ''} data-hold>${compactHtml(v)}<div class="cd"></div></div>`).join('');
  setHtml(mq.querySelector('.hf-lineup'), html);
  if (!touched && document.activeElement?.closest?.('.hf-lineup')) { const n = mq.querySelector('.hf-e[data-li="0"]'); if (n && n !== document.activeElement) focus(n); }
  placeLines();
  drawPeek();
  drawNote();
  for (const v of views) if (v.logo && !v.logoAsked) { v.logoAsked = true; logoInfo(v.logo).then(() => { clearTimeout(metaT); metaT = setTimeout(softRedraw, 80); }); }
}
function placeLines() {
  const box = mq.querySelector('.hf-lineup');
  box.querySelectorAll('.hf-e').forEach((n, j) => {
    n.classList.toggle('on', j === lit);
    const cd = n.querySelector('.cd'), want = j === lit ? cards[j] || '' : '';
    if (cd && cd._html !== want) { cd.innerHTML = want; cd._html = want; }
    const y = LINE_Y + j * SLOT + (j > lit ? OPEN : 0) + (j === lit ? 4 : 0);
    n.style.transform = `translateY(${y}px)`;
  });
  if (mode === 'mq') { const v = lines[lit]?.v; if (v) wantPicture(v.picture, { now: !drawnOnce }); }
  drawnOnce = true;
  barPill();
}
// the NBA tab drops its LIVE pill while the game is the lit line (two pills at most, SPEC 8)
export const gameLit = () => !!el && !el.hidden && mode === 'mq' && lines[lit]?.kind === 'game';
function barPill() { setBar({ live: liveShown(myGame()) && !gameLit() }); }
// The first browsing row peeks at the bottom of the Marquee (its title, reason, P− and the tops of its cards)
function drawPeek() {
  const r0 = rows[0];
  const n = rows.length;
  if (!r0) { setHtml(mq.querySelector('.hf-peek'), ''); return; }
  const items = rowItems(r0).slice(0, 7);
  const card = (x) => (r0.type === 'poster' ? `<span class="pp">${x.poster ? `<img src="${esc(posterUrl(x.poster))}" alt="" decoding="async">` : ''}</span>`
    : r0.type === 'game' ? '<span class="pg"></span>' : '<span class="pw"></span>');
  setHtml(mq.querySelector('.hf-peek'), `<div class="rt">${esc(r0.name)}<span>${esc(r0.reason || '')}</span><span class="pk">${K.pm}Browse · ${n} row${n === 1 ? '' : 's'}</span></div><div class="cards ${r0.type}">${items.map(card).join('')}</div>`);
}
// The first evening without a TMDB key: one line under the lineup (SPEC 6a)
function drawNote() {
  const box = mq.querySelector('.hf-note');
  let show = false;
  if (!TM.hasKey() && anyStreamAddon()) {
    const d = store.get('hfKeyNote', null);
    if (d == null) store.set('hfKeyNote', R.dayNo());
    show = d == null || d === R.dayNo();
  }
  const y = LINE_Y + lines.length * SLOT + OPEN + 10;
  box.hidden = !show || y > 440;
  if (show) { box.style.top = `${y}px`; box.innerHTML = 'Add your TMDB key for better rows · Account &gt; Provider'; }
}

// ---------- the picture (two layers, a 200 ms crossfade after a 600 ms rest; SPEC 3, 9) ----------
function wantPicture(spec, { now = false } = {}) {
  if (!spec) return;   // (Pick what you like: the picture stays)
  const key = spec.key || spec.kind;
  if (key === wantKey && !now) return;
  wantKey = key;
  clearTimeout(picT);
  picT = setTimeout(() => applyPicture(spec), now ? 0 : 600);
}
function applyPicture(spec) {
  const key = spec.key || spec.kind;
  if (key === picKey) return;
  picKey = key;
  const target = mode === 'rows' ? 0.22 : 0.3;
  const field = pic.querySelector('.hf-field'), flat = pic.querySelector('.hf-flat');
  const layers = [...pic.querySelectorAll('.hf-bd')];
  const setCap = (a) => { pic.style.setProperty('--capa', capFor(a, target).toFixed(2)); pic.style.setProperty('--amb', a ? glowOf(a, 1) : 'transparent'); };
  const showOnly = (which) => { field.classList.toggle('vis', which === 'field'); flat.classList.toggle('vis', which === 'flat'); if (which !== 'img') layers.forEach((x) => x.classList.remove('vis')); };
  if (spec.kind === 'img') {
    const showing = layers.find((x) => x.classList.contains('vis') && x.querySelector('img').getAttribute('src') === spec.url);
    if (showing && !field.classList.contains('vis') && !flat.classList.contains('vis')) { const a = known(spec.url); setCap(a); return; }
    const next = layers.find((x) => !x.classList.contains('vis')) || layers[1];
    const img = next.querySelector('img');
    const swap = () => {
      if (picKey !== key) return;
      layers.forEach((x) => x.classList.toggle('vis', x === next));
      showOnly('img');
      const a = known(spec.url); setCap(a);
      if (!a) analyse(spec.url).then((b) => { if (picKey === key) setCap(b); });
    };
    next.style.setProperty('--pos', spec.pos || '70% 40%');
    if (img.getAttribute('src') === spec.url && img.complete) swap();
    else { img.onload = swap; img.onerror = () => { if (picKey === key) { showOnly('flat'); flat.innerHTML = ''; } }; img.src = spec.url; }
    return;
  }
  if (spec.kind === 'game') {
    setHtml(field, fieldHtml(spec.g, spec.quiet), false);
    field.classList.toggle('quiet', settings().gameNight === 'quiet');   // (Account > NBA > Game night: quiet)
    showOnly('field');
    pic.style.setProperty('--capa', '0');
    return;
  }
  // flat: a channel's logo on its colour; a title without a backdrop: its poster upright on a glow of its colour
  pic.style.setProperty('--capa', '0'); pic.style.setProperty('--amb', 'transparent');
  if (spec.kind === 'poster') {
    flat.style.setProperty('--flat', 'var(--a-bg-0)');
    flat.innerHTML = `<div class="glow"></div><span class="pst"><img src="${esc(posterUrl(spec.url))}" alt=""></span>`;
    analyse(spec.url).then((a) => { if (picKey === key) flat.querySelector('.glow')?.style.setProperty('--g', glowOf(a, 0.9)); });
  } else if (spec.logo || spec.name) {
    flat.style.setProperty('--flat', 'var(--a-bg-1)');
    flat.innerHTML = `<div class="wm">${spec.logo ? `<img src="${esc(spec.logo)}" alt="" onerror="this.replaceWith(document.createTextNode(${JSON.stringify(initials(spec.name || ''))}))">` : esc(initials(spec.name || ''))}</div>`;
    if (spec.logo) analyse(spec.logo).then((a) => { if (picKey === key && a) flat.style.setProperty('--flat', glowOf(a, 1)); });
  } else { flat.style.setProperty('--flat', 'var(--a-bg-1)'); flat.innerHTML = ''; }
  showOnly('flat');
}
// Game night: the picture is the two teams (their real primaries, darkened for chalk), the crests, the score group
function fieldHtml(g, quiet) {
  const a = teamPalette(g.away), h = teamPalette(g.home);
  const hue = (hex) => { const [r, gg, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255); const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn; if (!d) return [0, mx]; const hh = mx === r ? ((gg - b) / d) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; return [(hh * 60 + 360) % 360, mx]; };
  const [ha, la] = hue(a.p), [hh, lh] = hue(h.p);
  const clash = Math.min(Math.abs(ha - hh), 360 - Math.abs(ha - hh)) < 28 && Math.abs(la - lh) < 0.25;
  const sv = show(g), hid = sv.hidden || (shielded(g) && behindReplay(g)), row = heroRow(g);
  const live = g.state === 'in' || heldLive(g);
  let chip, plate;
  if (g.state === 'pre') { chip = hm(g.date); plate = `Tip-off${bestChannel(g) ? ` · ${esc(bestChannel(g).name)}` : g.tv[0] ? ` · ${esc(g.tv[0])}` : ''}`; }
  else if (row?.kind === 'behind' || row?.kind === 'resume') { chip = esc(row.pos?.chapter || 'REPLAY'); plate = 'You stopped here'; }
  else if (live && hid) { chip = 'ON NOW'; plate = `${ic('eyeOff', 'xs')}Score hidden`; }
  else if (live) { chip = /half/i.test(g.detail) ? 'HALF' : `${ordinal(g.period)} ${esc(g.clock || '')}`; plate = `${esc(g.away.abbr)} ${esc(g.away.score)} – ${esc(g.home.score)} ${esc(g.home.abbr)}`; }
  else if (hid) { chip = 'REPLAY'; plate = `${ic('eyeOff', 'xs')}Score hidden`; }
  else { chip = 'FINAL'; plate = `${esc(g.away.abbr)} ${esc(g.away.score)} – ${esc(g.home.score)} ${esc(g.home.abbr)}`; }
  const side = (t, x) => `<div class="hf-crest" style="left:${x}px"><span class="disc">${crest(t)}</span><div class="n"><b>${esc(t.name)}</b><span>${esc(recLine(t, g))}</span></div></div>`;
  return `<div class="away" style="--c:${a.p}"></div><div class="home${quiet ? ' quiet' : ''}" style="--c:${clash ? 'var(--a-surface-1)' : h.p}"></div><div class="edge"><i style="background:${a.a}"></i><i style="background:${h.a}"></i></div>
    <div class="shade"></div><div class="shade2"></div>${side(g.away, 586)}${side(g.home, 762)}
    <div class="hf-score"><span class="chip"><b>${chip}</b></span><span class="plate"><span class="s">${plate}</span></span></div>`;
}

// ---------- the rows (SPEC 3, 4, 6) ----------
// What a row shows now: its items (kept in the page) or, for the live rows, what the app has
function rowItems(r) {
  if (r.live === 'yourshows') {
    const hide = homeHidden();
    const cont = continueRows().filter((p) => !hide.has(`${p.item.kind}:${p.item.id}`)).slice(0, 12).map((p) => ({ cont: p }));
    const have = new Set(cont.map((c) => imdbOfItem(c.cont.item)).filter(Boolean));
    const fresh = lineData.shows.filter((f) => f.next && f.count && !have.has(f.imdb)).map((f) => ({ show: f }));
    return [...cont, ...fresh].slice(0, 16);
  }
  if (r.live === 'nba') return nba.today.slice(0, 15);
  if (r.live === 'saved') {
    const started = (it) => { const p = progressOf({ kind: 'movie', id: it.imdb }); return p && (p.done || inProgress(p)); };
    return [...SH.savedItems('movie'), ...SH.savedItems('series')].filter((it) => !started(it));
  }
  if (r.live === 'library') return doors();
  if (r.live === 'channels') {
    const live = catalog.live; if (!live) return [];
    const out = [], seen = new Set(), add = (ch) => { if (ch && !seen.has(ch.id) && !ch._sep) { seen.add(ch.id); out.push(ch); } };
    favList('live').forEach((f) => add(live.byId.get(f.id)));
    S.recents.forEach((id) => add(live.byId.get(id)));
    return out.slice(0, 16);
  }
  if (r.live === 'noaddons') return [{ note: true }];
  return r.items || [];
}
// Browse your library: the doors to the Movies and Series shelves (home-v2 4.4)
function doors() {
  const p = R.pageNow(), key = TM.hasKey();
  const gs = [...new Set((p?.rows || []).filter((r) => r.kind === 'genre' && r.genre && r.genre !== 'Anime').map((r) => r.genre))].slice(0, 3);
  return [
    { label: 'Popular films', kind: 'movie', shelf: 'popular' }, { label: 'Popular series', kind: 'series', shelf: 'popular' },
    ...(key ? [{ label: 'Top rated films', kind: 'movie', shelf: 'top' }] : []),
    ...gs.map((g) => ({ label: SH.Plural(g), kind: 'movie', shelf: `g:${g}` })),
    { label: 'Anime', kind: 'series', shelf: 'anime' }, ...(key ? [{ label: 'Á íslensku', kind: 'movie', shelf: 'iceland' }] : []),
    { label: 'New this year', kind: 'movie', shelf: 'new' },
  ];
}
function liveReason(r, items) {
  if (r.live === 'yourshows') return `Where you are, and what is new · ${items.length}`;
  if (r.live === 'nba') {
    const gs = items, n = gs.length, lv = gs.filter((g) => g.state === 'in' || heldLive(g)).length, fin = gs.filter((g) => g.state === 'post').length, pre = gs.filter((g) => g.state === 'pre');
    if (!lv && !fin && pre.length) { const t0 = Math.min(...pre.map((g) => g.date)), first = pre.filter((g) => g.date === t0).length; return `${n} game${n > 1 ? 's' : ''} · ${first} at ${hm(t0)} · ${n - first} later · none started`; }
    return [`${n} game${n > 1 ? 's' : ''}`, lv ? `${lv} live` : '', fin ? `${fin} final` : '', pre.length ? `${pre.length} later` : ''].filter(Boolean).join(' · ');
  }
  if (r.live === 'saved') return `${items.length} title${items.length === 1 ? '' : 's'} you have not started`;
  if (r.live === 'library') return 'OK opens the shelf';
  if (r.live === 'channels') return 'Favourites and recent';
  if (r.live === 'noaddons') return 'Add a Stremio add-on for films and series';
  return r.reason || '';
}
const NAMES = { yourshows: 'Your shows', nba: 'Tonight in the NBA', saved: 'Saved', library: 'Browse your library', channels: 'Channels', noaddons: 'Films and series' };
// The rows on the page now: the engine's, the live ones that have something; an empty row is absent
function shownRows() {
  const p = page?.rows || [];
  return p.map((r) => {
    const items = rowItems(r);
    if (!items.length) return null;
    return { ...r, name: r.live ? NAMES[r.live] : r.name, reason: r.live ? liveReason(r, items) : r.reason, list: items, more: r.see && r.type === 'poster' };
  }).filter(Boolean);
}
const rowLen = (r) => r.list.length + (r.more ? 1 : 0);
// the cards
function posterCard(it, i, near) {
  const art = it.poster ? `<img ${near ? 'src' : 'data-src'}="${esc(posterUrl(it.poster))}" alt="" decoding="async" data-ini="${esc(initials(it.name))}">` : '';
  return `<div class="hf-p fx${it.poster ? '' : ' txt'}" tabindex="-1" data-i="${i}" data-key="t:${esc(it.kind)}:${esc(it.id)}" data-hold>${art}${it.poster ? '' : `<small>No poster</small><b>${esc(it.name)}</b>`}</div>`;
}
const seeAll = (r, i) => `<div class="hf-p all fx" tabindex="-1" data-i="${i}" data-key="all:${esc(r.id)}"><span>${ic('chevR')}</span><b>See all</b></div>`;
function wideCard(x, i, near) {
  if (x.cont) {
    const p = x.cont, it = p.item;
    if (it.kind === 'rp' || (it.kind === 'movie' && videoMask(it))) {
      const g = it.game, mk = videoMask(it);
      return `<div class="hf-w fx rp" tabindex="-1" data-i="${i}" data-key="p:${esc(it.kind)}:${esc(it.id)}" data-hold>${g ? `<div class="tm" style="background:linear-gradient(120deg,${teamPalette(g.away).p} 0 48%,${teamPalette(g.home).p} 52% 100%)"></div>` : ''}<div class="sy"></div><b class="nm">${esc(mk ? mk.title : g ? `${short(g.away.name)} at ${short(g.home.name)}` : it.title || it.name)}</b><div class="ln">${esc(it.pos?.chapter ? `Stopped in ${it.pos.chapter}` : 'Replay')}</div><div class="pb"><i style="width:${pct(p)}%"></i></div></div>`;
    }
    const ep = it.kind === 'episode', m = metaOf(ep ? 'series' : 'movie', imdbOfItem(it));
    const art = (ep && p.t > 30 ? it.still : '') || m?.background || it.poster;   // (an episode not started: the show's backdrop)
    const title = ep ? it.seriesName || m?.name || '' : it._title || it.name;
    return `<div class="hf-w fx" tabindex="-1" data-i="${i}" data-key="p:${esc(it.kind)}:${esc(it.id)}" data-hold>${art ? `<img ${near ? 'src' : 'data-src'}="${esc(sized(String(art).replace('/background/medium/', '/background/small/'), 500))}" alt="">` : ''}<div class="sy"></div>
      ${m?.logo ? `<img class="lg" src="${esc(m.logo)}" alt="">` : `<b class="nm">${esc(title)}</b>`}<div class="ln">${ep ? `S${it.season} · E${it.ep}` : 'Film'}<span> · ${esc(leftText(p.d - p.t))}</span></div><div class="pb"><i style="width:${pct(p)}%"></i></div></div>`;
  }
  const f = x.show, m = f.meta;
  return `<div class="hf-w fx" tabindex="-1" data-i="${i}" data-key="n:${esc(f.imdb)}" data-hold>${m?.background ? `<img ${near ? 'src' : 'data-src'}="${esc(String(m.background).replace('/background/medium/', '/background/small/'))}" alt="">` : ''}<div class="sy"></div>
    ${m?.logo ? `<img class="lg" src="${esc(m.logo)}" alt="">` : `<b class="nm">${esc(f.name)}</b>`}<div class="ln">S${f.next.season} · E${f.next.episode}<span> · ${f.fresh ? `${f.count} new` : 'Up next'}</span></div></div>`;
}
function chCard(ch, i) {
  const pr = onNow(guideNow(ch)), pv = pr ? programmeView(ch, pr) : null;
  const pg = pr ? Math.max(0, Math.min(100, ((Date.now() - pr.start) / (pr.end - pr.start)) * 100)) : 0;
  const tc = '#3D3B45';
  return `<div class="hf-w chn fx" tabindex="-1" data-i="${i}" data-key="ch:${esc(ch.id)}" data-hold style="--tc:${tc}"><span class="tile">${ch.logo ? `<img src="${esc(ch.logo)}" alt="" data-ini="${esc(initials(ch.name))}">` : esc(initials(ch.name))}</span><span class="n">${esc(ch.num)}</span>
    <div class="ln">${esc(pv?.title || ch.name)}</div><div class="u">${pr ? `until ${hm(pr.end)}` : esc(ch.name)}</div>${pr ? `<div class="pb"><i style="width:${pg}%"></i></div>` : ''}</div>`;
}
// the hub's game card; a hidden game that is on says so and nothing more (no quarter, no clock: SPEC 8)
function homeGameCard(g, i) {
  const h = gameCard(g, i);
  const hid = (g.state === 'in' || heldLive(g)) && (show(g).hidden || (shielded(g) && behindReplay(g)));
  return hid ? h.replace(/<div class="st">[\s\S]*?<\/div>/, '<div class="st"><span class="a-live">Live</span><span>Score hidden</span></div>') : h;
}
const doorCard = (d, i) => `<div class="hf-w door fx" tabindex="-1" data-i="${i}" data-key="door:${esc(d.kind)}:${esc(d.shelf)}"><b>${esc(d.label)}</b><span>${d.kind === 'movie' ? 'Movies' : 'Series'}</span></div>`;
const noteCard = (i) => `<div class="hf-w note fx" tabindex="-1" data-i="${i}" data-key="note:addons">${ic('plus')}<b>Add a Stremio add-on for films and series</b><span>OK opens Account &gt; Add-ons</span></div>`;
function cardsHtml(r, upto, near) {
  const n = Math.min(r.list.length, upto);
  let h = '';
  for (let i = 0; i < n; i++) {
    const x = r.list[i];
    h += r.type === 'poster' ? posterCard(x, i, near) : r.type === 'game' ? homeGameCard(x, i) : r.type === 'channel' ? chCard(x, i) : r.type === 'door' ? doorCard(x, i) : r.type === 'note' ? noteCard(i) : wideCard(x, i, near);
  }
  if (r.more && n === r.list.length) h += seeAll(r, r.list.length);
  return h;
}
function drawStack() {
  rows = shownRows();
  let y = 0;
  const html = rows.map((r, i) => {
    const top = y; y += rowH(r.type); r.top = top;
    return `<div class="hf-row ${r.type}" data-ri="${i}" data-rid="${esc(r.id)}" style="top:${top}px"><div class="rt">${esc(r.name)}${r.isNew ? '<span class="new">New row</span>' : ''}<span>${esc(r.reason || '')}</span></div><div class="hf-track" data-row></div></div>`;
  }).join('') + `<div class="hf-end" style="top:${y}px">End of Home${K.pp}Back to the top</div>`;
  mounted = {};
  setHtml(rw.querySelector('.hf-stack'), html, false);
  fi = Math.min(fi, Math.max(0, rows.length - 1));
  drawPeek();
}
// Mount the rows near the focus (8 cards, more as Right reaches the sixth); rows further than 3 away are text only
function mountRows(force) {
  rows.forEach((r, i) => {
    const node = rw.querySelector(`.hf-row[data-ri="${i}"]`); if (!node) return;
    const tr = node.querySelector('.hf-track');
    if (i < fi - NEAR_UP || i > fi + NEAR_DOWN) { if (mounted[r.id] !== undefined) { tr.innerHTML = ''; tr._html = ''; delete mounted[r.id]; } return; }
    const at = mem[r.id] || 0;
    const want = at + MOUNT[r.type];   // (as many ahead of the focus as fit, and more: Right never reaches an unmounted card)
    if (!force && mounted[r.id] >= want && mounted[r.id] !== undefined) return;
    const upto = Math.min(r.list.length, want);
    setHtml(tr, cardsHtml(r, upto, Math.abs(i - fi) <= 1));
    mounted[r.id] = upto;
  });
  paintImages();
}
// images get src only within one row of the focus
function paintImages() {
  rows.forEach((r, i) => {
    if (Math.abs(i - fi) > 1) return;
    rw.querySelectorAll(`.hf-row[data-ri="${i}"] img[data-src]`).forEach((im) => { im.src = im.dataset.src; im.removeAttribute('data-src'); });
  });
}
function placeRows() {
  const st = rw.querySelector('.hf-stack');
  const r = rows[fi];
  if (!r) return;
  st.style.transform = `translateY(${ROW_Y - r.top}px)`;
  rw.querySelectorAll('.hf-row').forEach((n, i) => { n.classList.toggle('up', i < fi); n.classList.toggle('cur', i === fi); n.classList.toggle('nx', i === fi + 1); n.classList.toggle('far', i > fi + 1); });
  rw.querySelector('.hf-end').classList.toggle('nx', fi === rows.length - 1);
  rows.forEach((x, i) => placeTrack(i));
  drawIndex();
}
function placeTrack(i) {
  const r = rows[i];
  const tr = rw.querySelector(`.hf-row[data-ri="${i}"] .hf-track`); if (!tr || !r) return;
  const at = mem[r.id] || 0, n = rowLen(r), [, , pitch] = CARD[r.type];
  const shift = Math.max(0, Math.min(at, n - 1 - maxPos(r.type)));
  tr.style.transform = shift ? `translateX(${-shift * pitch}px)` : '';
  // a card that starts past x 912 (the peeking one) shows its art and no text
  [...tr.children].forEach((c, j) => c.classList.toggle('pk', 60 + (j - shift) * pitch >= 912));
}
// The index at the right: six names around the current one (two above, three below), then how many more
function drawIndex() {
  const a = Math.max(0, Math.min(fi - 2, rows.length - 6)), b = Math.min(rows.length, a + 6);
  const names = rows.slice(a, b).map((r, j) => `<span class="${a + j === fi ? 'cur' : ''}">${esc(r.name)}</span>`).join('');
  const more = rows.length - b;
  setHtml(rw.querySelector('.hf-index'), `${names}${more > 0 ? `<span class="dim">${more} more</span>` : ''}`, false);
}
function cardEl(i = fi, j = mem[rows[i]?.id] || 0) { return rw.querySelector(`.hf-row[data-ri="${i}"] .hf-track > [data-i="${j}"]`); }
function focusRow(i, j) {
  const r = rows[i]; if (!r) return false;
  fi = i;
  const n = rowLen(r);
  mem[r.id] = Math.max(0, Math.min(n - 1, j ?? mem[r.id] ?? 0));
  mountRows();
  if ((mem[r.id] || 0) >= (mounted[r.id] || 0) - 2 && mounted[r.id] < r.list.length) { mounted[r.id] = undefined; mountRows(true); }
  placeRows();
  const c = cardEl();
  if (c) focus(c);
  R.enteredRow(r.id);
  if (mem[r.id] >= r.list.length - 1) R.scrolledEnd(r.id);
  answerFocus();
  return true;
}
// The column and the picture answer the focused card: the column at once (what is known), the picture after 600 ms
function answerFocus() {
  const r = rows[fi]; if (!r) return;
  const j = mem[r.id] || 0, x = r.list[j];
  clearTimeout(colT);
  setHtml(rw.querySelector('.hf-col'), colHtml(r, x), false);
  if (!x) return;
  if (r.type === 'poster') {
    wantPicture(x.background ? { kind: 'img', url: bgUrl(x.background), key: `i:${x.id}` } : x.poster ? { kind: 'poster', url: x.poster, key: `p:${x.id}` } : { kind: 'flat', key: 'flat' });
    // the details (IMDb rating, runtime, logo) once he rests on it
    if (!x._d) colT = setTimeout(() => enrich(x).then(() => { if (rows[fi] === r && r.list[mem[r.id] || 0] === x) setHtml(rw.querySelector('.hf-col'), colHtml(r, x), false); }), 450);
  } else if (r.type === 'channel') wantPicture({ kind: 'flat', logo: x.logo, name: x.name, key: `c:${x.id}` });
  else if (r.type === 'game') wantPicture({ kind: 'flat', key: 'flat' });
  else if (r.type === 'wide' && x.cont) { const it = x.cont.item, m = metaOf(it.kind === 'episode' ? 'series' : 'movie', imdbOfItem(it)); wantPicture(m?.background ? { kind: 'img', url: bgUrl(m.background), key: `m:${imdbOfItem(it)}` } : it.poster ? { kind: 'poster', url: it.poster, key: `p:${it.id}` } : { kind: 'flat', key: 'flat' }); }
  else if (r.type === 'wide' && x.show) wantPicture(x.show.meta?.background ? { kind: 'img', url: bgUrl(x.show.meta.background), key: `m:${x.show.imdb}` } : { kind: 'flat', key: 'flat' });
  else wantPicture({ kind: 'flat', key: 'flat' });
}
const enriching = new Map();
function enrich(it) {
  if (it._d) return Promise.resolve(it._d);
  const k = it.imdb || it.id;
  if (enriching.has(k)) return enriching.get(k);
  const p = (async () => {
    const d = {};
    if (it.tmdb && TM.hasKey() && !it.imdb) { const t = await TM.details(it.kind, it.tmdb).catch(() => null); if (t) { it.imdb = t.imdb || ''; d.runtime = t.runtime; d.logo = t.logo; d.country = t.country?.[0] || ''; if (!it.overview) it.overview = t.overview; } }
    const imdb = it.imdb || (/^tt/.test(it.id) ? it.id : '');
    if (imdb) { const m = await AD.meta(it.kind, imdb).catch(() => null); if (m) { d.rating = parseFloat(m.imdbRating) || 0; if (m.genres?.length) d.genres = m.genres; d.runtime = m.runtime || d.runtime; d.logo = m.logo || d.logo; d.country = SH.firstCountry(m.country) || d.country; d.releaseInfo = m.releaseInfo; if (!it.overview) it.overview = m.description; } }
    it._d = d;
    if (d.logo) await logoInfo(d.logo);
    return d;
  })();
  enriching.set(k, p);
  return p;
}
function colHtml(r, x) {
  if (!x) return '';
  const hint = (ok, hold) => `<div class="hint"><span>${K.ok}<b>${esc(ok)}</b></span>${hold ? `<span>${K.hold}${esc(hold)}</span>` : ''}</div>`;
  if (r.type === 'poster') {
    const d = x._d || {}, logo = d.logo || x.logo, series = x.kind === 'series';
    const rt = d.runtime || x.runtime;
    const meta = [series ? d.releaseInfo || (x.year ? `${x.year}–` : '') : x.year ? String(x.year) : '', { html: `<span>${esc((d.genres || x.genres || []).slice(0, 3).join(' · '))}</span>` }, rt ? (series ? `${rt} min` : dur(rt)) : '', !series && rt ? `Ends ${endsAt(rt)}` : '', d.rating || (x.src === 'cinemeta' && x.rating) ? `IMDb ${(d.rating || x.rating).toFixed(1)}` : '', series && (d.country || x.country) ? SH.firstCountry(d.country || x.country) : ''].filter((y) => y && (typeof y === 'string' || y.html !== '<span></span>'));
    return `${logo ? logoHtml(logo, x.name, 48, 320, 'hf-lg') : `<div class="title">${esc(x.name)}</div>`}<div class="meta">${facts(meta)}</div>${x.overview ? `<div class="line">${esc(fitWords(x.overview, 500))}</div>` : ''}${hint('Details', 'Play now, Save, Not interested')}`;
  }
  if (r.type === 'wide' && x.cont) {
    const p = x.cont, it = p.item, ep = it.kind === 'episode', m = metaOf(ep ? 'series' : 'movie', imdbOfItem(it));
    if (it.kind === 'rp') return `<div class="title">${esc(it.game ? `${it.game.away.name} at ${it.game.home.name}` : it.title || it.name)}</div><div class="meta">${facts(['Replay', it.pos?.chapter ? `Stopped in ${it.pos.chapter}` : 'Started'])}</div>${hint('Resume', 'From tip-off, Game page, Remove')}`;
    const vid = ep ? m?.videos?.find((v) => v.season === +it.season && v.episode === +it.ep) : null;
    const name = ep ? it.seriesName || m?.name : it._title || it.name;
    return `${m?.logo ? logoHtml(m.logo, name, 48, 320, 'hf-lg') : `<div class="title">${esc(name)}</div>`}<div class="meta">${facts([...(ep ? [`S${it.season} · E${it.ep}`, vid?.name || ''] : []), leftText(p.d - p.t), `Ends ${hm(Date.now() + (p.d - p.t) * 1000)}`].filter(Boolean))}</div>${(vid?.overview || m?.description) ? `<div class="line">${esc(fitWords(vid?.overview || m?.description, 500))}</div>` : ''}${hint('Resume', 'Start over, Details, Mark watched, Remove from Home')}`;
  }
  if (r.type === 'wide' && x.show) {
    const f = x.show, m = f.meta;
    return `${m?.logo ? logoHtml(m.logo, f.name, 48, 320, 'hf-lg') : `<div class="title">${esc(f.name)}</div>`}<div class="meta">${facts([`S${f.next.season} · E${f.next.episode}`, f.next.name, f.fresh ? `${f.count} new` : 'Up next'])}</div>${f.next.overview ? `<div class="line">${esc(fitWords(f.next.overview, 500))}</div>` : ''}${hint('Play', 'Details')}`;
  }
  if (r.type === 'channel') {
    const pr = onNow(guideNow(x)), pv = pr ? programmeView(x, pr) : null;
    const next = (guideNow(x) || []).filter((p) => pr && p.start >= pr.end).slice(0, 3);
    return `<div class="title">${esc(pv?.title || x.name)}</div><div class="meta">${facts([`${x.name} · ${x.num}`, pr ? `${hm(pr.start)} – ${hm(pr.end)}` : '', pr ? leftText((pr.end - Date.now()) / 1000) : ''].filter(Boolean))}</div>${next.length ? `<div class="line">Next · ${esc(next.map((p) => `${programmeView(x, p).title} ${hm(p.start)}`).join(' · '))}</div>` : ''}${hint('Tune', 'Save channel, Open in the guide')}`;
  }
  if (r.type === 'game') {
    const g = x, hid = show(g).hidden || (shielded(g) && behindReplay(g));
    const st = g.state === 'pre' ? [`Tip-off ${hm(g.date)}`, tipsIn(g.date), bestChannel(g)?.name || g.tv[0] || ''] : g.state === 'in' || heldLive(g) ? ['On now', bestChannel(g)?.name || g.tv[0] || '', hid ? 'Score hidden' : `${g.away.score} – ${g.home.score}`] : [hid ? 'Ended' : 'Final', hid ? 'Score hidden' : `${g.away.score} – ${g.home.score}`];
    const recs = `${g.away.name} ${recordFor(g.away).text || '–'} · ${g.home.name} ${recordFor(g.home).text || '–'}${g.state !== 'pre' && (hid || g.state === 'in') ? ' · as of tip-off' : ''}`;
    return `<div class="title">${esc(`${g.away.name} at ${g.home.name}`)}</div><div class="meta">${facts(st.filter(Boolean))}</div><div class="line">${esc(recs)}</div>${hint('Game page', g.state === 'in' ? 'Watch live, From tip-off' : 'Teams, more')}`;
  }
  if (r.type === 'door') return `<div class="title">${esc(x.label)}</div><div class="meta">${facts([x.kind === 'movie' ? 'Movies' : 'Series', 'A long shelf to browse'])}</div>${hint('Open the shelf', '')}`;
  if (r.type === 'note') return `<div class="title">Films and series</div><div class="meta"><span>They come from your Stremio add-ons</span></div>${hint('Account > Add-ons', '')}`;
  return '';
}

// ---------- the two halves ----------
function setMode(m) {
  mode = m;
  el.querySelector('.hf').dataset.mode = m;
  picKey = ''; wantKey = '';
  barPill();
}
function enterRows(i = 0, viaP = false) {
  if (!rows.length) return false;
  leftLine = viaP ? 0 : lit;
  setMode('rows');
  return focusRow(Math.min(i, rows.length - 1));
}
function toMarquee(line = 0) {
  setMode('mq');
  lit = Math.max(0, Math.min(line, lines.length - 1));
  placeLines();
  const n = mq.querySelector(`.hf-e[data-li="${lit}"]`);
  if (n) focus(n);
  wantPicture(lines[lit]?.v?.picture, { now: true });
}
function lineFocus(j) {
  lit = j; placeLines();
  const n = mq.querySelector(`.hf-e[data-li="${j}"]`);
  if (n) focus(n);
}

// ---------- the remote (SPEC 4) ----------
function onKey(k) {
  if (!el || el.hidden) return false;
  touched = true;
  const a = document.activeElement;
  const inMq = a?.closest?.('.hf-lineup'), inRows = a?.closest?.('.hf-stack');
  if (k === 'chdown') { if (mode === 'mq' || !inRows) return enterRows(0, true) || true; return true; }
  if (k === 'chup') { if (mode === 'rows') { toMarquee(0); return true; } if (inMq) lineFocus(0); return true; }
  if (inMq) {
    const j = +a.dataset.li;
    if (k === 'up') { if (j > 0) lineFocus(j - 1); else focusTab(); return true; }
    if (k === 'down') { if (j < lines.length - 1) lineFocus(j + 1); else enterRows(0); return true; }
    if (k === 'left') return true;
    if (k === 'right') { R.hintUsed(lines[j]?.kind, 'right'); lineAct(lines[j], 'right'); return true; }
    return false;
  }
  if (inRows) {
    const r = rows[fi], j = mem[r?.id] || 0;
    if (k === 'left') { if (j > 0) { mem[r.id] = j - 1; focusRow(fi); } return true; }
    if (k === 'right') { if (j < rowLen(r) - 1) { mem[r.id] = j + 1; focusRow(fi); } return true; }
    if (k === 'down') { if (fi < rows.length - 1) focusRow(fi + 1); return true; }
    if (k === 'up') { if (fi > 0) focusRow(fi - 1); else toMarquee(leftLine); return true; }
  }
  return false;
}
// Back: from a deeper row to row 1 first, from row 1 to the Marquee with its first line lit; from the Marquee, the tab
function onBack() {
  if (mode !== 'rows') return false;
  if (fi > 0) { focusRow(0); return true; }
  toMarquee(0);
  return true;
}

// ---------- what OK, Right and Hold do ----------
function lineAct(l, act) {
  if (!l) return;
  const v = l.v;
  if (l.kind === 'cont') {
    const it = l.p.item;
    if (it.kind === 'rp') { if (act === 'right' && it.game) return watchFromTipoff(gameById(it.game.id) || it.game); return resumeItem(it, { restart: act === 'right' }); }
    if (act === 'ok') return resumeItem(it);
    return openTitle(it);   // Episodes (the series page's episode list) / Details
  }
  if (l.kind === 'new' || l.kind === 'short') {
    if (act === 'ok') return playEpisode(l.f.imdb, l.f.name, l.f.next, l.f.meta);
    return SH.openItem({ kind: 'series', id: l.f.imdb, imdb: l.f.imdb, name: l.f.name, year: l.f.meta?.year || 0, poster: l.f.meta?.poster || '', genres: l.f.meta?.genres || [] });
  }
  if (l.kind === 'film') {
    if (act === 'ok') return SH.openItem(l.it);
    const i = rows.findIndex((r) => r.id === 'popular:movie');
    if (i >= 0) return enterRows(i);
    return go('movie', { shelf: 'popular' });
  }
  if (l.kind === 'game') return gameAct(l.g, v, act);
  if (l.kind === 'ch') { if (act === 'ok') return tune(l.ch); return go('live', { ch: l.ch.id }); }
  if (l.kind === 'pick' && act === 'ok') return pickSheet();
}
function gameAct(g, v, act) {
  const kind = v.row;
  if (act === 'ok') {
    if (heroAct(g, kind, 'primary')) return;
    if (g.state === 'post' || v.verb === 'Game page') return push('game', { id: g.id });
    const ch = bestChannel(g);
    if (!ch) return chooseChannel(g);
    return tune(ch);
  }
  // Right: the line's "more"
  const r = v.right;
  if (r === 'From tip-off' || r === 'Watch again') return watchFromTipoff(g);
  if (r === 'Back to live') return heroAct(g, kind, 'golive');
  if (r === 'Guide') return go('live', bestChannel(g) ? { ch: bestChannel(g).id } : undefined);
  if (r === 'Game page') return push('game', { id: g.id });
}
// A series' episode, played through the add-ons' best copy (asked on the spot)
async function playEpisode(imdb, name, n, m) {
  const it = { kind: 'episode', id: n.id || `${imdb}:${n.season}:${n.episode}`, name: n.name || `Episode ${n.episode}`, season: n.season, ep: n.episode, seriesId: imdb, seriesName: name, imdbSeries: imdb, poster: m?.poster || '', year: m?.year || '',
    copy: { source: '', key: '', binge: '', kind: 'series', tkey: imdb, tid: imdb, title: name, runtime: (m?.runtime || 0) * 60 } };
  return resumeAddonItem(it);
}
// Hold OK's Play now: the best copy, checked on the spot
async function playNow(x) {
  const imdb = await SH.imdbOfItem(x);
  if (!imdb) return toast(`airglow couldn't find ${x.name}'s details right now`, 3500);
  if (x.kind === 'series') {
    const m = await AD.meta('series', imdb).catch(() => null);
    const v = (m?.videos || []).filter((e) => e.season > 0).sort((a, b) => a.season - b.season || a.episode - b.episode)[0];
    if (!v) return toast('No episodes listed for this series yet', 3500);
    return playEpisode(imdb, m.name || x.name, v, m);
  }
  return resumeAddonItem({ kind: 'movie', id: imdb, name: x.name, _title: x.name, poster: x.poster, year: x.year || '', copy: { source: '', key: '', binge: '', kind: 'movie', tkey: imdb, tid: imdb, title: x.name, runtime: (x.runtime || x._d?.runtime || 0) * 60 } });
}
function lineHold(l, node) {
  if (!l) return;
  R.hintUsed(l.kind, 'hold');
  if (l.kind === 'cont') return contMenu(node, l.p);
  if (l.kind === 'new' || l.kind === 'short') return contextMenu(node, [
    { icon: 'play', label: `Play S${l.f.next.season} · E${l.f.next.episode}`, run: () => playEpisode(l.f.imdb, l.f.name, l.f.next, l.f.meta) },
    { icon: 'info', label: 'Details', run: () => lineAct(l, 'right') },
  ]);
  if (l.kind === 'film') return posterMenu(node, l.it, null);
  if (l.kind === 'game') {
    const g = l.g, kind = l.v.row;
    if (kind && heroHold(g, kind, 'primary')) return;
    const hid = show(g).hidden;
    const rowsM = [];
    const ch = bestChannel(g);
    if (g.state === 'in' && ch) rowsM.push({ icon: 'play', label: 'Watch live', run: () => tune(ch) }, { icon: 'live', label: 'Other channels', run: () => otherFeeds(g) });
    if (g.state === 'pre' && ch) rowsM.push({ icon: 'play', label: 'Watch pre-game', run: () => tune(ch) });
    if (hid) rowsM.push({ icon: 'eyeOff', label: 'Reveal score', run: () => confirmMenu({ title: `Reveal ${g.away.name} at ${g.home.name}?`, text: 'The score, the clock and the records show everywhere.', yes: 'Reveal', no: 'Keep hidden', onYes: () => reveal(g.id) }) });
    rowsM.push({ icon: 'score', label: 'Game page', run: () => push('game', { id: g.id }) }, { icon: 'chevR', label: `${g.away.name} page`, run: () => push('team', { abbr: g.away.abbr }) }, { icon: 'chevR', label: `${g.home.name} page`, run: () => push('team', { abbr: g.home.abbr }) });
    return contextMenu(node, rowsM);
  }
  if (l.kind === 'ch') return chMenu(node, l.ch);
}
function contMenu(node, p) {
  const it = p.item;
  const remove = () => { const s = homeHidden(); s.add(`${it.kind}:${it.id}`); store.set(scoped('homeHidden'), [...s].slice(-200)); softRedraw(true); };
  if (it.kind === 'rp') {
    if (it.game) {
      const g = () => gameById(it.game.id) || it.game;
      return contextMenu(node, [{ icon: 'play', label: 'Resume', run: () => resumeGame(g()) }, { icon: 'tipoff', label: 'From tip-off', run: () => watchFromTipoff(g()) }, { icon: 'score', label: 'Game page', run: () => push('game', { id: it.game.id }) }, { icon: 'close', label: 'Remove', run: () => { delete S.progress[`rp:${it.id}`]; store.set(scoped('progress'), S.progress); softRedraw(true); } }]);
    }
    const ch = catalog.live?.byId.get(it.ch);
    return contextMenu(node, [{ icon: 'play', label: 'Resume', run: () => ch && playProgramme(ch, { title: it.title, start: it.start, end: it.end }) }, { icon: 'tipoff', label: 'Start over', run: () => ch && playProgramme(ch, { title: it.title, start: it.start, end: it.end }, { restart: true }) }, { icon: 'close', label: 'Remove', run: remove }]);
  }
  return contextMenu(node, [
    { icon: 'restart', label: 'Start over', run: () => resumeItem(it, { restart: true }) },
    { icon: 'info', label: 'Details', run: () => openTitle(it) },
    { icon: 'check', label: 'Mark watched', run: () => { markWatched(it); softRedraw(true); } },
    { icon: 'close', label: 'Remove from Home', run: remove },
  ]);
}
function chMenu(node, ch) {
  return contextMenu(node, [
    { icon: 'saved', label: isFav(ch) ? 'Remove from Saved' : 'Save channel', run: () => { toast(toggleFav(ch) ? `Saved ${ch.name}` : `Removed ${ch.name}`); } },
    { icon: 'live', label: 'Open in the guide', run: () => go('live', { ch: ch.id }) },
  ]);
}
function posterMenu(node, x, r) {
  const fav = { kind: x.kind, id: x.imdb || x.id, key: x.imdb || x.id, name: x.name, poster: x.poster, year: x.year ? String(x.year) : '', addon: { type: x.kind }, _genres: x.genres };
  const list = [
    { icon: 'play', label: 'Play now', run: () => playNow(x) },
    { icon: 'saved', label: isFav(fav) ? 'Remove from Saved' : 'Save', run: async () => { const id = await SH.imdbOfItem(x); if (!id) return toast('airglow couldn\'t find this title\'s details'); fav.id = fav.key = id; toast(toggleFav(fav) ? `Saved ${x.name}` : `Removed ${x.name}`); } },
    { icon: 'info', label: 'Details', run: () => SH.openItem(x) },
    { icon: 'close', label: 'Not interested', run: () => { R.notWanted(x); toast(`${x.name} won't be suggested for 30 days`); } },
  ];
  if (r && !r.live) list.push({ icon: 'info', label: 'Why this row?', run: () => whySheet(r) }, { icon: 'eyeOff', label: 'Hide this row', run: () => { R.hideRow(r); toast(`${r.name} is hidden. Account > Home rows brings it back`, 4000); } });
  return contextMenu(node, list);
}
async function whySheet(r) {
  const w = await R.whyRow(r);
  const ov = openOverlay(`<div class="menu hf-why" style="left:50%;top:50%;transform:translate(-50%,-50%);width:520px"><h3>${esc(w.title)}</h3>${w.lines.map((l) => `<p class="t-body" style="padding:0 8px 8px;margin:0">${esc(l)}</p>`).join('')}<div data-row class="row-flex" style="gap:12px;padding:8px"><span class="btn2 fx" tabindex="-1" data-act="ok">OK</span><span class="btn2 fx" tabindex="-1" data-act="hide">Hide this row</span></div></div>`, {
    focusSel: '[data-act="ok"]',
    onClick: (act) => { ov.close(); if (act === 'hide') { R.hideRow(r); toast(`${r.name} is hidden. Account > Home rows brings it back`, 4000); } },
  });
}
// Pick what you like (cold start): three genres seed the rows (10 % each, forgotten after 20 plays)
const PICKABLE = ['Comedy', 'Drama', 'Crime', 'Anime', 'Action', 'Sci-Fi', 'Thriller', 'Horror', 'Romance', 'Documentary', 'Fantasy', 'Mystery', 'Animation', 'Family', 'Adventure', 'History', 'War', 'Western'];
export function pickSheet(done) {
  let sel = [...R.picked()];
  const body = () => `<div class="chips" data-row>${PICKABLE.map((g) => `<span class="chip lg fx${sel.includes(g) ? ' sel' : ''}" tabindex="-1" data-act="g" data-v="${esc(g)}">${esc(g)}</span>`).join('')}</div>`;
  const ov = openOverlay(`<div class="sheet hf-picks"><h3>Pick what you like</h3><div class="t-cap" style="margin:-6px 0 8px">Three genres start your rows. airglow learns the rest from what you watch.</div><div class="inner">${body()}</div>
    <div class="sheet-foot" data-row><span class="btn btn-full fx" tabindex="-1" data-act="done">${sel.length ? `Start my rows · ${sel.length} of 3` : 'Pick up to 3'}</span></div></div>`, {
    focusSel: '.chip',
    onClick: (act, t) => {
      if (act === 'g') {
        const g = t.dataset.v;
        sel = sel.includes(g) ? sel.filter((x) => x !== g) : sel.length < 3 ? [...sel, g] : sel;
        ov.el.querySelectorAll('.chip').forEach((c) => c.classList.toggle('sel', sel.includes(c.dataset.v)));
        ov.el.querySelector('[data-act="done"]').textContent = sel.length ? `Start my rows · ${sel.length} of 3` : 'Pick up to 3';
      } else if (act === 'done') {
        ov.close();
        if (!sel.length) return;
        R.setPicks(sel);
        toast(`Your rows start from ${sel.join(', ')}`);
        refreshRows(true);
        done?.(sel);
      }
    },
  });
}
// Choose channel: the guide's match first, then NBA / League Pass channels, then the Sports group. Remembered per team.
async function chooseChannel(g) {
  const feeds = await findFeeds(g);
  const cands = await channelCandidates();
  const list = [...feeds.map((f) => ({ ch: f.ch, why: f.why })), ...cands.filter((c) => !feeds.some((f) => f.ch.id === c.id)).map((ch) => ({ ch, why: /\bnba\b|league pass/i.test(ch.name) ? 'League' : 'Sports group' }))].slice(0, 24);
  const name = `${g.away.name} at ${g.home.name}`;
  if (!list.length) { toast('No sports channels found. Pick the channel in Live and it will be remembered.', 5000); return go('live'); }
  const ov = openOverlay(`<div class="menu" style="left:48px;top:60px;width:560px;max-height:440px;overflow:hidden"><h3>Where is ${esc(name)}?</h3><div class="sheet-body" style="max-height:360px"><div data-col class="inner">${list.map((x, i) => {
    const p = onNow(guideNow(x.ch));
    return `<div class="lr fx" tabindex="-1" data-act="${i}" style="height:60px"><span class="logo sm">${x.ch.logo ? `<img src="${esc(x.ch.logo)}" alt="">` : esc(x.ch.name.slice(0, 2).toUpperCase())}</span><span class="grow ellipsis">${esc(x.ch.name)}<div class="t-cap ellipsis" style="margin-top:0">${esc(p ? programmeView(x.ch, p).title : '')}</div></span><small>${esc(x.why)}</small></div>`;
  }).join('')}</div></div><div class="t-cap" style="padding:8px 8px 2px">Your pick is remembered for this team.</div></div>`, {
    onClick: (act) => { const x = list[+act]; if (!x) return; ov.close(false); setTeamChannel(mySide(g).abbr, x.ch.id); tune(x.ch); },
  });
  scrollList(ov.el);
}
async function otherFeeds(g) {
  const feeds = await findFeeds(g);
  if (feeds.length < 2) return chooseChannel(g);
  const ov = openOverlay(`<div class="menu" style="left:48px;top:150px;width:480px"><h3>Other channels for this game</h3><div data-col>${feeds.map((f, i) => `<div class="lr fx" tabindex="-1" data-act="${i}"><span class="grow ellipsis">${esc(f.ch.name)}</span><small>Feed ${i + 1} of ${feeds.length}</small></div>`).join('')}<div class="lr fx" tabindex="-1" data-act="choose"><span class="grow">Choose another channel</span></div></div></div>`, {
    onClick: (act) => { ov.close(false); if (act === 'choose') return chooseChannel(g); const f = feeds[+act]; setTeamChannel(mySide(g).abbr, f.ch.id); tune(f.ch); },
  });
}
function cardAct(r, x, node) {
  if (!x && node?.classList.contains('all')) return go(r.see.kind, { shelf: r.see.shelf });
  if (!x) return;
  if (r.type === 'poster') return SH.openItem(x);
  if (r.type === 'game') return push('game', { id: x.id });
  if (r.type === 'channel') return tune(x);
  if (r.type === 'door') return go(x.kind, { shelf: x.shelf });
  if (r.type === 'note') return go('account', { group: 'addons' });
  if (x.cont) return resumeItem(x.cont.item);
  if (x.show) return playEpisode(x.show.imdb, x.show.name, x.show.next, x.show.meta);
}
function cardHold(r, x, node) {
  if (!x) return;
  if (r.type === 'poster') return posterMenu(node, x, r);
  if (r.type === 'game') return gameMenu(node, x);
  if (r.type === 'channel') return chMenu(node, x);
  if (x.cont) return contMenu(node, x.cont);
  if (x.show) return contextMenu(node, [{ icon: 'play', label: `Play S${x.show.next.season} · E${x.show.next.episode}`, run: () => playEpisode(x.show.imdb, x.show.name, x.show.next, x.show.meta) }, { icon: 'info', label: 'Details', run: () => SH.openItem({ kind: 'series', id: x.show.imdb, imdb: x.show.imdb, name: x.show.name, year: x.show.meta?.year || 0, poster: x.show.meta?.poster || '', genres: [] }) }]);
}

// ---------- drawing and data ----------
// The rows: the page as it was last worked out, until he leaves Home (a new page is swapped in between visits)
function applyPage(p) {
  page = p;
  const keepId = rows[fi]?.id;
  drawStack();
  if (mode === 'rows') {
    const i = rows.findIndex((r) => r.id === keepId);
    fi = i >= 0 ? i : 0;
    mountRows(true); placeRows();
    const c = cardEl(); if (c) focus(c);
  }
}
function refreshRows(force) {
  R.buildPage({ force }).then((p) => { if (!p || !el) return; if (mode !== 'rows' || !page || el.hidden) applyPage(p); else pendingPage = p; }).catch(() => {});
}
let pendingPage = null;
// The lineup's slow parts (what is new in his shows, the film for tonight), kept for the next start
async function loadLineData() {
  if (!S.acc) return;
  const acc = S.acc.id, day = R.dayNo();
  const saved = store.get(scoped('hfLine'), null);
  if (saved && saved.day === day && lineData.day !== day) { lineData = { ...lineData, ...saved, hist: lineData.hist ?? saved.hist }; }
  const hist = await R.hasHistory();
  if (S.acc?.id !== acc) return;
  lineData.hist = hist;
  const [shows, film, cold] = await Promise.all([R.followed().catch(() => []), hist ? R.filmTonight().catch(() => null) : null, hist ? null : R.coldPick().catch(() => null)]);
  if (S.acc?.id !== acc) return;
  const slimF = (f) => ({ imdb: f.imdb, name: f.name, at: f.at, next: f.next, count: f.count, fresh: f.fresh, meta: f.meta && { name: f.meta.name, logo: f.meta.logo, background: f.meta.background, poster: f.meta.poster, runtime: f.meta.runtime, year: f.meta.year, description: f.meta.description, genres: f.meta.genres } });
  lineData = { day, shows: shows.map(slimF), film, cold, hist };
  store.set(scoped('hfLine'), lineData);
  softRedraw();
}
// a redraw that keeps the lit line and the row he is on; nothing under the TV player
function softRedraw(full) {
  if (!el || el.hidden) return;
  if (watching()) { behind = true; return; }
  drawLineup();
  if (full || mode !== 'rows') { if (!pendingPage) { const keep = rows[fi]?.id; drawStack(); const i = rows.findIndex((r) => r.id === keep); fi = i >= 0 ? i : 0; } }
  if (mode === 'rows') {
    // live rows (Your shows, the NBA, Channels) redraw their cards in place; focus follows the item (data-key)
    const now = rows.some((r) => r.live && mounted[r.id] !== undefined) ? shownRows() : [];
    rows.forEach((r) => { if (r.live && mounted[r.id] !== undefined) { const fresh = now.find((x) => x.id === r.id); if (fresh) { r.list = fresh.list; r.reason = fresh.reason; mounted[r.id] = undefined; } } });
    mountRows(); placeRows();
  }
}
function draw() {
  if (watching()) { behind = true; return; }
  if (!el || el.hidden) return;
  drawLineup();
  // Continue watching's copies get their quality checks in the background, 60 s apart (subtitles SPEC 5.3)
  checkCopies(continueRows().slice(0, 16).map((x) => x.item).filter((it) => it.url && (it.kind === 'movie' || it.kind === 'episode')), 'continue');
  if (!rows.length || mode !== 'rows') { drawStack(); }
  if (mode === 'rows') { mountRows(true); placeRows(); }
}

export default {
  name: 'home',
  mount(root) {
    el = root;
    root.innerHTML = `<div class="hf" data-mode="mq">
      <div class="hf-pic"><div class="hf-amb"></div><div class="hf-bd vis"><img alt=""></div><div class="hf-bd"><img alt=""></div><div class="hf-field"></div><div class="hf-flat"></div>
        <div class="hf-cap"></div><div class="hf-sx"></div><div class="hf-sy"></div><div class="hf-st"></div><div class="hf-grain"></div><div class="hf-sr"></div><div class="hf-sb"></div></div>
      <div class="hf-mq"><div class="hf-lineup" data-col></div><div class="hf-note" hidden></div><div class="hf-peek"></div></div>
      <div class="hf-rw"><div class="hf-col"></div><div class="hf-index"></div><div class="hf-stack"></div></div></div>`;
    mq = root.querySelector('.hf-mq'); rw = root.querySelector('.hf-rw'); pic = root.querySelector('.hf');
    root.addEventListener('click', (e) => {
      const ln = e.target.closest('.hf-e');
      if (ln) return lineAct(lines[+ln.dataset.li], 'ok');
      const c = e.target.closest('.hf-track > .fx');
      if (c) { const i = +c.closest('.hf-row').dataset.ri, r = rows[i]; return cardAct(r, r?.list[+c.dataset.i], c); }
    });
    root.addEventListener('tvhold', (e) => {
      const ln = e.target.closest('.hf-e');
      if (ln) return lineHold(lines[+ln.dataset.li], ln);
      const c = e.target.closest('.hf-track > .fx');
      if (c) { const i = +c.closest('.hf-row').dataset.ri, r = rows[i]; return cardHold(r, r?.list[+c.dataset.i], c); }
    });
    // focus that came from elsewhere (the top bar's Down, a page popped): the halves follow it
    root.addEventListener('tvfocus', (e) => {
      const ln = e.target.closest('.hf-e');
      if (ln) { if (mode !== 'mq') setMode('mq'); const j = +ln.dataset.li; if (j !== lit) { lit = j; placeLines(); } else wantPicture(lines[lit]?.v?.picture); return; }
      const c = e.target.closest('.hf-track > .fx');
      if (c) {
        const i = +c.closest('.hf-row').dataset.ri, r = rows[i];
        if (mode !== 'rows') setMode('rows');
        if (i !== fi || +c.dataset.i !== (mem[r.id] || 0)) { fi = i; mem[r.id] = +c.dataset.i; mountRows(); placeRows(); answerFocus(); }
      }
    });
    // Under the launch each redraw is a full style, layout and paint competing with the intro: the lineup is drawn
    // once, the rest after the launch.
    let later = false;
    launchDone.then(() => { if (later) { later = false; redraw(); } warmRows(); });
    const redraw = () => { if (current() !== 'home') return; if (!launchOpen()) { later = true; return; } softRedraw(); };
    on('nba', redraw); on('summary', redraw); on('feeds', redraw); on('progress', redraw); on('favs', redraw); on('replays', redraw);
    on('catalog', (k) => { if (k === 'live') { redraw(); warmRows(); } });
    on('league', (k) => { if (k.startsWith('schedule:') || k === 'standings') redraw(); });
    on('player-closed', () => { if (behind) { behind = false; draw(); } });
    on('rows', (p) => { if (!el) return; if (el.hidden || mode !== 'rows' || !page) applyPage(p); else pendingPage = p; });
    on('rows-stale', () => { if (current() !== 'home') refreshRows(); });
    on('tmdb', () => refreshRows(true));
    on('addons', () => { if (current() !== 'home') refreshRows(); });
    on('session', () => { page = null; rows = []; lines = []; lineData = { day: -1, film: null, cold: null, shows: [], hist: null }; mem = {}; fi = 0; metas.clear(); });
    setInterval(redraw, 30000);
  },
  async enter(root, params, { fresh }) {
    // a new visit (the tab chosen again): the Marquee's first line, and the page worked out since the last one
    if (fresh) { if (mode === 'rows') setMode('mq'); lit = 0; touched = false; if (pendingPage) { page = pendingPage; pendingPage = null; rows = []; } }
    draw();   // (the lineup at once: the router focuses its lit line on the next frame)
    if (!page) { const p = await R.cachedPage().catch(() => null); if (p && !page) { page = p; draw(); } }
    loadLineData().catch(() => {});
    if (R.pageStale()) refreshRows();
    ensure('live').then(() => softRedraw()).catch(() => {});
    const g = myGame(); if (g) findFeeds(g);
  },
  entry: (root) => (mode === 'rows' ? cardEl() : null) || root.querySelector(`.hf-e[data-li="${lit}"]`) || root.querySelector('.hf-e'),
  key: onKey,
  back: onBack,
  leave() { setBar({ live: liveShown(myGame()) }); },
  toTop() { if (mode === 'rows') setMode('mq'); lit = 0; placeLines(); },
};
// What's on now on the Channels row and the channel line: a couple at a time, after the launch
async function warmRows() {
  await launchDone;
  const live = catalog.live; if (!live) return;
  const list = [], seen = new Set(), add = (ch) => { if (ch && !seen.has(ch.id)) { seen.add(ch.id); list.push(ch); } };
  add(lastChannel()); favList('live').forEach((f) => add(live.byId.get(f.id))); S.recents.forEach((id) => add(live.byId.get(id)));
  warm(list.slice(0, 16), { still: () => current() === 'home' }).then((n) => { if (n) softRedraw(); });
  // the lineup's other pictures, so a Down shows its picture inside the 600 ms rest
  for (const l of lines) { const u = l.v?.picture?.url; if (u) { const im = new Image(); im.decoding = 'async'; im.src = u; } }
}
