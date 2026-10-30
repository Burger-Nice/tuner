// A team's page (nba-pages/SPEC.md 7, phone SPEC 3.3): the NBA tab's team section (your team) and the pushed `team`
// screen (any team, Back returns) share it. From the top: the tools (Make them my team / All teams), the header (the
// team's plate, record and place, the next game, the hero state table's buttons), the Schedule rail (sideways, opened on
// the game that matters now), Season ranks (tap: Team stats on that category), News, Injuries, the Roster (sortable;
// tap: the player sheet). Under the shield nothing here tells the result of a game you haven't seen: the record counts
// seen finals, a tile says `Result hidden`, Season ranks are the copy from before tip-off, the roster hides points and
// shooting, and so does the player sheet. The data and the rules are the TV's (league.js, games.js, nba/*).
import { hm, teamVars } from '../tv/js/util.js';
import { on, emit, saveSettings } from '../tv/js/state.js';
import { nba, favTeam, bestChannel, findFeeds, unseenFor, recordFor, show, clockText, shielded, behindReplay, liveByClock, replayProgress, storyCover } from '../tv/js/games.js';
import { peek, want, failed } from '../tv/js/league.js';
import { ensure } from '../tv/js/catalog.js';
import { playLive } from '../tv/js/player.js';
import { toast } from '../tv/js/ui.js';
import { names, tileDate, whenWord, shortDay, tipsIn, gameName, sideOf, pinView } from '../tv/js/nba/common.js';
import { seasonOf, ordinalOf } from '../tv/js/nba/player.js';
import { confOf } from '../tv/js/nba/picker.js';
import { TEAM_CATS } from '../tv/js/nba/teamstats.js';
import { heroRow, findReplays, replaysOf, sourceCaption } from '../tv/js/catchup.js';
import { watchFromTipoff, resumeGame } from '../tv/js/replay.js';
import { esc, ic, push, back, isShown, menu, radio, confirm, sheet, longPress, nav } from './ui.js';
import { crest, revealIds, revealBtn, onReveal, paint } from './nbakit.js';
import { openPlayer } from './nbaplayer.js';
import { storyCard, openStory, storyById } from './nbanews.js';
import { ringFor } from './home.js';

const { NBA } = window;
const tune = (ch) => playLive(ch, ringFor(ch), 'All channels');

// ---------- Season ranks: Team stats' categories, in the design's order ----------
const TILE_ORDER = ['Points', 'Points allowed', 'Rebounds', '3-point %', 'Blocks', 'Assists', 'Field goal %', 'Steals', 'Turnovers'];
const rankCats = () => TEAM_CATS.filter((c) => TILE_ORDER.includes(c.label)).sort((a, b) => TILE_ORDER.indexOf(a.label) - TILE_ORDER.indexOf(b.label));
const statOf = (t, c) => {
  const v = t?.s?.[c.key];
  if (v != null) return +v;
  if (/allowed/i.test(c.label) && t?.s?.avgPoints != null && t?.s?.avgPointsDifferential != null) return t.s.avgPoints - t.s.avgPointsDifferential;
  return null;
};
function rankIn(stats, abbr, c) {
  const all = Object.values(stats || {}).map((t) => [t.abbr, statOf(t, c)]).filter(([, v]) => typeof v === 'number' && !Number.isNaN(v));
  const mine = all.find(([a]) => a === abbr);
  if (!mine) return null;
  const better = all.filter(([, v]) => (c.lower ? v < mine[1] : v > mine[1])).length;
  const tie = all.filter(([, v]) => v === mine[1]).length > 1;
  return { rank: `${tie ? 'T-' : ''}${ordinalOf(better + 1)}`, value: mine[1] };
}
const statText = (c, v) => (/pct|%/i.test(`${c.key} ${c.label}`) ? `${v.toFixed(1)}%` : `${v.toFixed(1)} a game`);

// ---------- small helpers ----------
const SORTS = [['pts', 'Points'], ['reb', 'Rebounds'], ['ast', 'Assists'], ['min', 'Minutes'], ['fg', 'Field goal %'], ['tp', '3-point %'], ['jersey', 'Jersey number'], ['name', 'Name']];
const SHIELDED_SORTS = new Set(['pts', 'fg', 'tp']);
const num = (v) => (v == null || v === '' || Number.isNaN(+v) ? '–' : (+v).toFixed(1));
const shortTv = (s) => String(s || '').replace(/^NBA\s+/i, '');
const has = (g, abbr) => g && (g.home.abbr === abbr || g.away.abbr === abbr);
const live = (g) => nba.today.find((x) => x.id === g.id) || g;
const LIVE = '<span class="live sm">Live</span>';
const keysOf = (abbr) => [`schedule:${abbr}`, 'standings', `players:${abbr}`, `roster:${abbr}`, 'teamStats', `news:${abbr}`];
export function teamWant(abbr, opts) { for (const k of keysOf(abbr)) want(k, opts); ensure('live').catch(() => {}); }
export const teamKeys = keysOf;

// ---------- data ----------
const sched = (abbr) => peek(`schedule:${abbr}`)?.data || null;
const list = (abbr) => (sched(abbr)?.games || []).map(live);
function heroOf(abbr, games) {
  const now = Date.now();
  const today = nba.today.find((g) => has(g, abbr));
  const inGame = (today?.state === 'in' && today) || games.find((g) => g.state === 'in');
  if (inGame) return inGame;
  const recent = [...games].reverse().find((g) => g.state === 'post' && now - g.date < 15 * 3600e3) || (today?.state === 'post' && now - today.date < 15 * 3600e3 ? today : null);
  if (recent) return recent;
  return games.find((g) => g.state === 'pre' && g.date > now - 4 * 3600e3) || (today?.state === 'pre' ? today : null);
}
const nextOf = (games, hero) => (hero?.state === 'pre' ? hero : games.find((g) => g.state === 'pre' && g.date > Date.now() - 4 * 3600e3 && g !== hero) || null);
function espnRecord(abbr) {
  const t = peek('standings')?.data?.confs.flatMap((c) => c.teams).find((x) => x.abbr === abbr);
  if (t) return `${t.w}-${t.l}`;
  const p = peek(`players:${abbr}`)?.data;
  if (p?.record) return p.record;
  let w = 0, l = 0;
  for (const g of list(abbr)) if (g.state === 'post') { if (sideOf(g, abbr).won) w++; else l++; }
  return sched(abbr) ? `${w}-${l}` : '';
}
function placeLines(abbr) {
  const s = peek('standings')?.data;
  const conf = s?.confs.find((c) => c.teams.some((t) => t.abbr === abbr));
  const t = conf?.teams.find((x) => x.abbr === abbr);
  const l1 = conf ? `${ordinalOf(conf.teams.indexOf(t) + 1)} in the ${conf.short || confOf(abbr)}` : '';
  const div = (peek(`players:${abbr}`)?.data?.standing || '').replace(/ in the | in /, ' ').replace(/ Division$/, '');
  return [l1, [t?.streak, div].filter(Boolean).join(' · ')];
}

// ---------- the header and the hero state table (the TV's heroParts) ----------
function heroParts(abbr, g) {
  if (!sched(abbr) && failed(`schedule:${abbr}`)) return { btns: [['retry', `${ic('refresh')}Try again`]], cap: 'ESPN isn’t answering · airglow tries again every minute' };
  if (!g) return { btns: [], cap: '' };
  const v = show(g), s = sideOf(v.g, abbr), row = heroRow(g);
  if (row) {
    const k = row.kind;
    if (k === 'live-tipoff') return { btns: [['watch', `${ic('play')}Watch live`], ['rp:tipoff', 'From tip-off'], v.hidden ? ['reveal', `${ic('eyeOff')}Reveal`] : ['game', 'Box score']], cap: '' };
    if (k === 'behind') return { btns: [['rp:resume', `${ic('play')}Resume`], ['rp:golive', 'Back to live'], ['game', 'Game page']], cap: '' };
    if (k === 'resume') return { btns: [['rp:resume', `${ic('play')}Resume`], ['rp:tipoff', 'From tip-off'], ['game', 'Game page']], cap: '' };
    if (k === 'morning') return { btns: [['rp:tipoff', `${ic('play')}Watch from tip-off`], ['game', 'Game page']], cap: sourceCaption(row.src, { short: false }).replace(/<[^>]*>/g, '') };
    if (k === 'looking') return { btns: row.busy ? [['game', 'Game page']] : [['game', 'Game page'], ['rp:pickch', 'Pick the channel']], cap: row.busy ? 'Looking for a replay…' : 'No replay found · airglow keeps looking' };
    if (k === 'seen') return { btns: [['game', 'Box score'], ['rp:again', `${ic('play')}Watch again`]], cap: `Final · ${s.won ? 'W' : 'L'} ${esc(s.me.score)}–${esc(s.op.score)}` };
  }
  if (g.state === 'pre') {
    const ch = bestChannel(g), soon = g.date - Date.now() <= 3 * 3600e3;
    if (soon && ch) return { btns: [['watch', `${ic('play')}Watch pre-game`], ['game', 'Game page']], cap: `${esc(tipsIn(g.date))} · On ${esc(ch.name)}` };
    return { btns: [['game', 'Game page']], cap: `${esc(tipsIn(g.date))}${g.tv?.[0] ? ` · ${esc(g.tv[0])}` : ''}` };
  }
  if (g.state === 'in') {
    return { btns: [['watch', `${ic('play')}Watch live`], v.hidden ? ['reveal', `${ic('eyeOff')}Reveal`] : ['game', 'Box score']], cap: v.hidden ? 'Score hidden' : `${esc(clockText(v.g))} · ${esc(s.me.score)}–${esc(s.op.score)}` };
  }
  return { btns: [['game', 'Box score']], cap: v.hidden ? 'Ended · result hidden' : `Final · ${s.won ? 'W' : 'L'} ${esc(s.me.score)}–${esc(s.op.score)}` };
}
function headHtml(abbr, games, hero) {
  const n = names(abbr), mine = abbr === favTeam(), data = !!sched(abbr);
  const v = hero && show(hero), s = hero && sideOf(v.g, abbr);
  const sk = (hero || games[games.length - 1])?.season || '';
  const off = data && !hero && !nextOf(games, hero);
  const kind = off ? 'Off-season' : /post|playoff/i.test(sk) ? 'Playoffs' : /pre/i.test(sk) ? 'Preseason' : /play-?in/i.test(sk) ? 'Play-in' : 'Regular season';
  const behind = hero && shielded(hero) && behindReplay(hero);
  const yours = mine ? '<span class="mine">Your team</span>' : '';
  const status = behind ? `${yours}${liveByClock(hero) ? LIVE : ''}<span class="ellipsis">You're in ${esc(replayProgress(hero.id)?.item?.pos?.chapter || 'the replay')} ${s.word} ${esc(s.op.name)}</span>`
    : hero?.state === 'in' ? `${yours}${LIVE}<span class="ellipsis">${v.hidden ? 'Score hidden' : esc(clockText(v.g))} ${s.word} ${esc(s.op.name)}</span>`
    : `${yours}<span class="ellipsis">${esc(sched(abbr)?.season || seasonOf())} · ${kind}</span>`;
  const rec = recordFor({ abbr, record: espnRecord(abbr) });
  let recHtml;
  if (rec.partial) {
    const u = unseenFor(abbr), last = u[0], ls = last && sideOf(last, abbr);
    recHtml = `<b>${esc(rec.text || '–')}${ic('eyeOff')}</b><div><div class="l1">${u.length} ${u.length === 1 ? 'result' : 'results'} hidden</div>${last ? `<div class="l2">${ic('eyeOff')}<span class="ellipsis">${esc(shortDay(last.date))}, ${ls.word} ${esc(ls.op.name)}</span></div>` : ''}</div>`;
  } else {
    const [l1, l2] = placeLines(abbr);
    recHtml = `<b>${esc(rec.text || '–')}</b><div>${l1 ? `<div class="l1">${esc(l1)}</div>` : ''}${l2 ? `<div class="l2"><span class="ellipsis">${esc(l2)}</span></div>` : ''}</div>`;
  }
  const nx = nextOf(games, hero);
  let next = '';
  if (nx) { const ns = sideOf(nx, abbr); next = `<div class="tp-nx nbz"><span class="lb">Next · ${esc(whenWord(nx.date))} ${hm(nx.date)}</span><span class="mu nbz">${crest(ns.op, 24)}<span class="ellipsis">${ns.word} ${esc(ns.op.name)}</span></span>${nx.tv?.[0] ? `<span class="tv">${esc(shortTv(nx.tv[0]))}</span>` : ''}</div>`; }
  else if (data) next = '<div class="tp-nx nbz"><span class="lb">Next</span><span class="mu">Schedule out in August</span></div>';
  const parts = heroParts(abbr, hero);
  const btns = parts.btns.map(([act, label], i) => `<button class="${i ? 'ghost' : act === 'game' || act === 'retry' ? 'pill noicon' : 'pill'}" data-tact="${act}"${act === 'reveal' ? ` data-g="${esc(hero.id)}"` : ''}>${label}</button>`).join('');
  return `<div class="tp-head" style="${teamVars(abbr)}"><div class="band"></div>
  <div class="st nbz">${status}</div>
  <div class="tp-plate nbz"><span class="pl">${crest(abbr, 50)}</span><div class="nm"><div class="loc">${esc(n.city)}</div><div class="nk">${esc(n.name)}</div></div></div>
  <div class="tp-rec nbz">${data ? recHtml : failed(`schedule:${abbr}`) ? '' : '<div class="sk" style="width:180px;height:40px"></div>'}</div>
  ${next}
  ${btns ? `<div class="nb-act nbz">${btns}</div>` : ''}${parts.cap ? `<div class="cap">${parts.cap}</div>` : ''}</div>`;
}

// ---------- Schedule ----------
function tileHtml(abbr, g, next) {
  const v = show(g), s = sideOf(v.g, abbr);
  const ww = whenWord(g.date);
  const d = g === next && (ww === 'TONIGHT' || ww === 'TOMORROW') ? `<b>${ww}</b> · NEXT` : esc(tileDate(g.date));
  let r;
  if (shielded(g) && behindReplay(g)) r = `${liveByClock(g) ? LIVE : ''}<span class="ellipsis">You're in ${esc(replayProgress(g.id)?.item?.pos?.chapter || 'the replay')}</span>`;
  else if (g.state === 'post') r = v.hidden ? `<span class="hid">${ic('eyeOff')}<span class="ellipsis">Result hidden</span></span>` : `<b class="${s.won ? 'w' : 'l'}">${s.won ? 'W' : 'L'}</b><span class="sc">${esc(s.me.score)}–${esc(s.op.score)}</span>`;
  else if (g.state === 'in') r = `${LIVE}<span class="ellipsis">${v.hidden ? 'Score hidden' : esc(clockText(v.g))}</span>`;
  else r = `<span class="ellipsis">${hm(g.date)}${g.tv?.[0] ? ` · ${esc(shortTv(g.tv[0]))}` : ''}</span>`;
  if (g.state !== 'pre' && replaysOf(g)?.length) r += `<span class="rp">${ic('hist')}</span>`;
  return `<button class="tp-gt${g === next ? ' next' : ''}" data-g="${esc(g.id)}"><span class="d">${d}</span><span class="o nbz">${crest(s.op, 28)}<span class="ellipsis">${s.word} ${esc(s.op.name)}</span></span><span class="r nbz">${r}</span></button>`;
}
function schedHtml(abbr, games, hero) {
  const un = unseenFor(abbr), left = games.filter((g) => g.state === 'pre').length;
  const rec = recordFor({ abbr, record: espnRecord(abbr) });
  const seen = games.filter((g) => g.state === 'post').length - un.filter((g) => g.state === 'post').length;
  const fail = failed(`schedule:${abbr}`);
  const small = fail && !sched(abbr) ? 'Couldn’t load from ESPN · trying again'
    : !games.length ? (sched(abbr) ? 'No games on the schedule yet' : 'Loading…')
    : [un.length ? `${seen} seen · ${un.length} hidden` : esc(rec.text), un.length ? '' : `${left} to go`, games.some((g) => g.state !== 'pre' && replaysOf(g)?.length) ? `${ic('hist')} replay` : ''].filter(Boolean).join(' · ');
  const next = nextOf(games, hero);
  const tiles = sched(abbr) ? games.map((g) => tileHtml(abbr, g, next)).join('') : Array.from({ length: 4 }, () => '<div class="tp-gt sk"></div>').join('');
  return `<div class="sec-h tp-h">Schedule<small class="ellipsis">${small}</small></div><div class="rail tp-sched" data-x="sched:${esc(abbr)}">${tiles}</div>`;
}

// ---------- Season ranks ----------
function ranksHtml(abbr) {
  const v = pinView([abbr]);
  const failedNow = failed('teamStats') && !peek('teamStats')?.data;
  let small = 'out of 30 teams · tap for Team stats', body = '';
  let stats = peek('teamStats')?.data;
  if (v) {
    if (v.copy?.teamStats) { stats = v.copy.teamStats; small = `${ic('eyeOff')} ${esc(v.label.replace(/^As/, 'as'))}`; }
    else if (v.loading) stats = null;
    else { stats = null; small = 'Hidden by the shield'; body = `<div class="nb-pin nbz">${ic('eyeOff')}<span class="tx">Season ranks are hidden: they include ${esc(gameName(v.game))}</span>${revealBtn(v.games)}</div>`; }
  }
  if (failedNow && !v) small = 'Couldn’t load from ESPN · trying again';
  if (!body) {
    const tiles = stats ? rankCats().map((c) => { const r = rankIn(stats, abbr, c); return r ? `<button class="tp-rk" data-cat="${esc(c.key)}"><span class="k ellipsis">${esc(c.label)}</span><b>${esc(r.rank)}</b><span class="v ellipsis">${esc(statText(c, r.value))}</span></button>` : ''; }).join('')
      : failedNow ? '' : Array.from({ length: 4 }, () => '<div class="tp-rk sk"></div>').join('');
    body = tiles ? `<div class="rail tp-ranks" data-x="ranks:${esc(abbr)}">${tiles}</div>` : '';
  }
  return `<div class="sec-h tp-h">Season ranks<small class="ellipsis">${small}</small></div>${body}`;
}

// ---------- News ----------
const stories = (abbr) => (peek(`news:${abbr}`)?.data || []).filter((s) => Date.now() - s.published < 7 * 864e5).slice(0, 10);
function newsHtml(abbr) {
  const l = stories(abbr), kept = !!peek(`news:${abbr}`)?.data;
  const cards = kept ? l.map(storyCard).join('') : failed(`news:${abbr}`) ? '' : Array.from({ length: 3 }, () => '<div class="tp-nc sk"></div>').join('');
  const hid = l.filter((s) => storyCover(s)).length;
  const small = failed(`news:${abbr}`) && !kept ? 'Couldn’t load from ESPN · trying again' : !kept ? 'Loading…' : !l.length ? 'No ESPN stories in the last week' : hid ? `${hid} ${hid === 1 ? 'story' : 'stories'} hidden by the shield` : `ESPN · ${esc(names(abbr).name)}`;
  return `<div class="sec-h tp-h">News<small class="ellipsis">${small}</small></div>${cards ? `<div class="rail tp-news" data-x="news:${esc(abbr)}">${cards}</div>` : ''}`;
}

// ---------- Injuries and the Roster ----------
function players(abbr, sortKey) {
  const ro = peek(`roster:${abbr}`)?.data, pl = peek(`players:${abbr}`)?.data?.players || [];
  const byId = new Map(pl.map((p) => [p.id, p]));
  const out = ro ? ro.map((r) => ({ gp: 0, ...byId.get(r.id), id: r.id, name: r.name, abbr, pos: r.pos || byId.get(r.id)?.pos || '', jersey: r.jersey, injury: r.injury, headshot: byId.get(r.id)?.headshot || r.headshot }))
    : pl.map((p) => ({ ...p, jersey: '', injury: '' }));
  const shield = unseenFor(abbr).length > 0;
  const sort = shield && SHIELDED_SORTS.has(sortKey) ? 'jersey' : sortKey;
  const jn = (p) => (p.jersey === '' || p.jersey == null ? 999 : +p.jersey);
  const cmp = sort === 'jersey' ? (a, b) => jn(a) - jn(b) : sort === 'name' ? (a, b) => a.name.localeCompare(b.name)
    : (a, b) => (!a.gp - !b.gp) || (+(b[sort] ?? -1) - +(a[sort] ?? -1)) || a.name.localeCompare(b.name);
  return { list: out.sort(cmp), sort, shield };
}
const injText = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');
function injuriesHtml(abbr) {
  const ro = peek(`roster:${abbr}`)?.data;
  if (!ro) return '';
  const hurt = ro.filter((r) => r.injury);
  return `<div class="sec-h tp-h">Injuries<small class="ellipsis">${hurt.length ? `${hurt.length} on ESPN’s report` : 'Nobody on ESPN’s report'}</small></div>${hurt.length ? `<div class="tp-inj">${hurt.map((r) => `<button class="tp-ij nbz" data-pl="${esc(r.id)}"><span class="no">${esc(r.jersey || '')}</span><span class="nm ellipsis">${esc(r.name)}</span><span class="ps">${esc(r.pos || '')}</span><span class="st">${esc(injText(r.injury))}</span></button>`).join('')}</div>` : ''}`;
}
function rosterHtml(abbr, st) {
  const { list: l, sort, shield } = players(abbr, st.sort);
  const u = unseenFor(abbr);
  const sname = SORTS.find(([k]) => k === sort)?.[1] || 'Points';
  const small = failed(`roster:${abbr}`) && !l.length ? 'Couldn’t load from ESPN · trying again' : !l.length ? 'Loading…'
    : shield ? `Points and shooting hidden: they include ${esc(gameName(u[u.length - 1]))}` : `${l.length} players · season averages`;
  const hid = `<span class="hidc">${ic('eyeOff')}</span>`;
  const cell = (p, k, b) => `<td${b ? ' class="b"' : ''}>${!p.gp ? '–' : shield && SHIELDED_SORTS.has(k) ? hid : num(p[k])}</td>`;
  const rows = l.map((p) => `<tr data-pl="${esc(p.id)}"><td><span class="pc"><span class="nm"><span class="no">${esc(p.jersey ?? '')}</span>${esc(p.name)}</span><small>${esc(p.pos)}${p.injury ? ` · <i>${esc(injText(p.injury))}</i>` : ''}${!p.gp ? ' · Hasn’t played' : ''}</small></span></td><td>${p.gp || 0}</td>${cell(p, 'min')}${cell(p, 'pts', 1)}${cell(p, 'reb')}${cell(p, 'ast')}${cell(p, 'fg')}${cell(p, 'tp')}</tr>`).join('');
  return `<div class="sec-h tp-h">Roster<span class="sp"></span>${l.length ? `<button class="more" data-tact="sort">${ic('sliders')}${esc(sname)}</button>` : ''}</div><div class="note tp-sm">${small}</div>
  ${l.length ? `<div class="tbl tp-ro" data-x="ro:${esc(abbr)}"><table class="box-t ro"><thead><tr><th>Player</th><th>GP</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>FG%</th><th>3P%</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="sk" style="height:220px;margin:12px 16px 0"></div>'}`;
}

// ---------- the tools and the whole page ----------
function toolsHtml(abbr, { pushed }) {
  const n = names(abbr), mine = abbr === favTeam();
  const a = pushed ? (mine ? `<span class="chip sel ico">${ic('tick')}Your team</span>` : `<button class="ghost sm" data-tact="mine">${ic('starO')}<span class="ellipsis">Make the ${esc(n.name)} my team</span></button>`)
    : `<button class="ghost sm" data-tact="change">${ic('starO')}Change my team</button>`;
  return `<div class="nb-tools nbz">${a}<button class="ghost sm" data-tact="all">${ic('more')}All teams</button></div>`;
}
// The page's html for this team. st: its own state ({ sort, placed }).
export function teamHtml(abbr, st, { pushed = false } = {}) {
  const games = list(abbr), hero = heroOf(abbr, games);
  for (const g of games) if ((g.state === 'post' || g.state === 'in') && Date.now() - g.date < 3 * 864e5 && !replaysOf(g)) findReplays(g);
  return `${toolsHtml(abbr, { pushed })}${headHtml(abbr, games, hero)}${schedHtml(abbr, games, hero)}${ranksHtml(abbr)}${newsHtml(abbr)}${injuriesHtml(abbr)}${rosterHtml(abbr, st)}`;
}
// After a paint: the schedule opens on the game that matters now (the hero, else the next game), one tile in.
export function placeRails(root, abbr, st) {
  if (st.placed) return;
  const games = list(abbr);
  if (!games.length) return;
  const rail = root.querySelector('.tp-sched');
  if (!rail || !rail.children.length) return;
  const hero = heroOf(abbr, games);
  let i = games.findIndex((g) => g.id === hero?.id);
  if (i < 0) i = games.findIndex((g) => g.state !== 'post');
  if (i < 0) i = games.length - 1;
  const tile = rail.children[i];
  if (!tile) return;
  rail.scrollLeft = Math.max(0, tile.offsetLeft - rail.offsetLeft - 16 - (i > 0 ? tile.offsetWidth + 10 : 0));
  st.placed = true;
}

// ---------- actions ----------
function heroAct(abbr, act, b, redraw) {
  const g = heroOf(abbr, list(abbr));
  if (act === 'retry') { teamWant(abbr, { force: true }); return; }
  if (!g) return;
  if (act === 'game') return push('game', { id: g.id });
  if (act === 'reveal') return revealIds([g.id], redraw);
  if (act === 'rp:tipoff' || act === 'rp:again') return watchFromTipoff(g);
  if (act === 'rp:resume') return resumeGame(g);
  if (act === 'rp:golive' || act === 'rp:pickch') return push('game', { id: g.id, tab: 'replays' });
  if (act === 'watch') {
    const ch = bestChannel(g);
    if (ch) return tune(ch);
    findFeeds(g).then((f) => { if (f[0]) tune(f[0].ch); else toast('No channel found for this game yet. Pick it in Live and it will be remembered.', 5000); });
  }
}
function openStats(cat) { import('./nba.js').then((m) => m.openSection('teamstats', { cat })); }
function sortSheet(abbr, st, redraw) {
  const shield = unseenFor(abbr).length > 0;
  radio('Sort the roster', SORTS.map(([v, l]) => ({ v, l, sub: shield && SHIELDED_SORTS.has(v) ? 'Hidden by the shield' : '' })), shield && SHIELDED_SORTS.has(st.sort) ? 'jersey' : st.sort, (v) => {
    if (shield && SHIELDED_SORTS.has(v)) { toast('Hidden by the shield: it would tell a result you haven’t seen'); return; }
    st.sort = v; redraw();
  });
}
function confirmMine(abbr, redraw) {
  const n = names(abbr);
  confirm({ title: `Make the ${n.name} your team?`, text: 'Their games lead Home and the NBA tab, and the spoiler shield’s My team follows them.', yes: 'Make them my team', onYes: () => { saveSettings({ nbaTeam: abbr }); emit('nba'); toast(`The ${n.name} are your team`); redraw(); } });
}
export function teamSheet(then) {
  import('./nba.js').then((m) => m.teamSheet(then));
}
function tileMenu(abbr, tile, redraw) {
  const g = list(abbr).find((x) => x.id === tile.dataset.g);
  if (!g) return;
  const s = sideOf(g, abbr), v = show(g), rp = g.state !== 'pre' && replaysOf(g)?.length;
  const ch = bestChannel(g);
  menu(gameName(g), [
    g.state === 'in' ? { label: 'Watch live', icon: 'play', run: () => (ch ? tune(ch) : push('game', { id: g.id })) } : null,
    rp ? { label: g.state === 'in' ? 'From tip-off' : 'Watch from tip-off', icon: 'tipoff', run: () => watchFromTipoff(g) } : null,
    { label: `${s.op.name} page`, lead: crest(s.op, 28), run: () => push('team', { abbr: s.op.abbr }) },
    { label: 'Open the game', icon: 'chevR', run: () => push('game', { id: g.id }) },
    v.hidden ? { label: `Reveal ${gameName(g)}`, icon: 'eyeOff', run: () => revealIds([g.id], redraw) } : null,
  ]);
}
const playerOf = (abbr, id) => players(abbr, 'pts').list.find((p) => p.id === id);
// Taps and long-presses on a team page inside root; abbr() / st() give the team showing and its state.
// (Reveal buttons: the screen's own onReveal.)
export function wireTeam(root, abbr, st, redraw) {
  root.addEventListener('click', (e) => {
    const a = abbr();
    if (!a || !root.querySelector('.tp-head')) return;
    const b = e.target.closest('[data-tact]');
    if (b) {
      const act = b.dataset.tact;
      if (act === 'sort') return sortSheet(a, st(), redraw);
      if (act === 'mine') return confirmMine(a, redraw);
      if (act === 'all') return openPicker({ current: a });
      if (act === 'change') return teamSheet(redraw);
      return heroAct(a, act, b, redraw);
    }
    const tile = e.target.closest('.tp-gt[data-g]');
    if (tile) return push('game', { id: tile.dataset.g });
    const rk = e.target.closest('.tp-rk[data-cat]');
    if (rk) return openStats(rk.dataset.cat);
    const nc = e.target.closest('[data-story]');
    if (nc) return openStory(storyById(nc.dataset.story));
    const row = e.target.closest('[data-pl]');
    if (row) return openPlayer(playerOf(a, row.dataset.pl), { from: 'roster' });
  });
  longPress(root, '.tp-gt[data-g]', (tile) => { const a = abbr(); if (a) tileMenu(a, tile, redraw); });
}

// ---------- the picker (All teams; the team section when your team is None) ----------
const WEST = ['DAL', 'DEN', 'GS', 'HOU', 'LAC', 'LAL', 'MEM', 'MIN', 'NO', 'OKC', 'PHX', 'POR', 'SAC', 'SA', 'UTAH'];
const EAST = ['ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DET', 'IND', 'MIA', 'MIL', 'NY', 'ORL', 'PHI', 'TOR', 'WSH'];
export function pickerHtml({ current = '', act = '' } = {}) {
  const mine = favTeam();
  const confs = [['West', WEST], ['East', EAST]];
  if (EAST.includes(mine)) confs.reverse();
  const cell = (a) => `<button class="tp-pk${a === mine ? ' mine' : ''}${a === current ? ' cur' : ''}"${act ? ` data-act="${act}"` : ''} data-pick="${a}">${crest(a, 40)}<span class="ellipsis">${esc(names(a).name)}</span></button>`;
  return confs.map(([c, l]) => {
    const sorted = [...l].sort((x, y) => (x === mine ? -1 : y === mine ? 1 : names(x).full.localeCompare(names(y).full)));
    return `<div class="tp-pkh">${c}ern Conference</div><div class="tp-pkg">${sorted.map(cell).join('')}</div>`;
  }).join('');
}
export function openPicker({ current = '' } = {}) {
  return sheet(`<h3>All teams</h3><div class="sub">Tap a team for its page</div><div class="body tp-pks">${pickerHtml({ current, act: 'pick' })}</div>`, {
    full: true,
    onClick: (act, t, close) => { if (act !== 'pick') return; close(); if (t.dataset.pick !== current) push('team', { abbr: t.dataset.pick }); },
  });
}

// ---------- the pushed team screen ----------
let tEl = null, tAbbr = '', tSt = null;
const states = new WeakMap();   // a stack entry's params -> its page state (Back lands where you were)
function drawTeam() {
  if (!tEl || !isShown('team') || !tAbbr) return;
  const n = names(tAbbr);
  paint(tEl, `<div class="ph-top"><button class="ph-back" data-act="back" aria-label="Back">${ic('back')}</button><span class="ellipsis" style="font:var(--ph-title);flex:1">${esc(n.full)}</span></div>${teamHtml(tAbbr, tSt, { pushed: true })}`);
  placeRails(tEl, tAbbr, tSt);
}
export const teamScreen = {
  name: 'team',
  mount(root) {
    tEl = root;
    root.addEventListener('click', (e) => { if (e.target.closest('[data-act="back"]')) back(); });
    onReveal(root, drawTeam);
    wireTeam(root, () => tAbbr, () => tSt, drawTeam);
    let soonT = 0;
    const soon = () => { clearTimeout(soonT); soonT = setTimeout(drawTeam, 120); };
    on('league', (k) => { if (k === 'pin' || keysOf(tAbbr).includes(k)) soon(); });
    on('nba', soon); on('feeds', soon); on('replays', soon); on('progress', soon);
    setInterval(() => { if (isShown('team') && tAbbr) { teamWant(tAbbr); drawTeam(); } }, 60000);
  },
  enter(root, p, { fresh }) {
    if (!p?.abbr) return;
    if (!states.has(p)) states.set(p, { sort: 'pts', placed: false, y: 0 });
    tSt = states.get(p);
    if (p.abbr !== tAbbr) root._html = null;
    tAbbr = p.abbr;
    teamWant(tAbbr);
    const games = list(tAbbr), hero = heroOf(tAbbr, games);
    if (hero && (hero.state === 'in' || (hero.state === 'pre' && hero.date - Date.now() < 3 * 3600e3))) findFeeds(hero).then(drawTeam);
    root._html = null;
    drawTeam();
    if (!fresh) { tSt.placed = false; placeRails(root, tAbbr, tSt); root.scrollTop = nav.stack[nav.stack.length - 1]?.scroll ?? tSt.y ?? 0; }
  },
  leave(root) { if (tSt) tSt.y = root.scrollTop; },
};
