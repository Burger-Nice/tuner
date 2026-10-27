// A team's page (design/ui-v1/nba-pages/SPEC.md 7): the NBA tab's team section (your team) and the pushed `team` screen
// (any team) share this renderer. From the top: the header (plate, record, next game, the hero state table's buttons),
// the Schedule rail, then the cue `⌄ Season ranks · News · Roster`; Down from the schedule slides the page so the focused
// section's title sits at y 52 (the bar and the row above step away). Under the shield nothing here tells the result of
// a game you haven't seen: the record counts seen finals, the tile says `Result hidden`, Season ranks are the copy from
// before tip-off, the roster hides points and shooting, and so does the player sheet.
import { esc, ic, dot, liveP, hm, teamVars, setHtml } from '../util.js';
import { on, emit, saveSettings } from '../state.js';
import { nba, favTeam, bestChannel, findFeeds, unseenFor, recordFor, show, clockText, storyCover, shielded, behindReplay, liveByClock, replayProgress } from '../games.js';
import { peek, want, failed, loading } from '../league.js';
import { ensure } from '../catalog.js';
import { playLive, watching } from '../player.js';
import { push, go, current } from '../router.js';
import { focus } from '../focus.js';
import { toast, contextMenu, confirmMenu, radioMenu } from '../ui.js';
import { ringFor, ringName } from '../screens/home.js';
import nbaHost, { openSection } from '../screens/nba.js';
import { tc, names, tileDate, whenWord, shortDay, tipsIn, gameName, sideOf, revealBtn, reveal, pinView, espnMeta } from './common.js';
import { openPlayer, seasonOf, ordinalOf, posName } from './player.js';
import { pickerHtml, openPicker, confOf } from './picker.js';
import * as newsMod from './news.js';
import * as statsMod from './teamstats.js';
import { heroRow, findReplays, replaysOf, sourceCaption } from '../catchup.js';
import { watchFromTipoff, resumeGame, backToLive, sourcesSheet } from '../replay.js';

const svg = (p) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const INJ = svg('<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M12 8v8M8 12h8"/>');
const GRID = svg('<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>');

// ---------- the page's geometry (page y; the blocks slide up by --sy) ----------
const R0 = 524;   // Season ranks' title: just past the first screen
const Y = { sched: 324, rail: 350, cue: 484, ranks: R0, ranksRail: R0 + 30, news: R0 + 144, newsRail: R0 + 170, roster: R0 + 353, th: R0 + 393, body: R0 + 421 };
const SHIFT = { top: 0, ranks: Y.ranks - 52, news: Y.news - 52, roster: Y.roster - 52 };
const ROW = 32, ROWS = 12;   // the roster, scrolled: 12 rows from y 120
const RANK_STEP = 172, RANK_VIS = 5, NEWS_STEP = 296, NEWS_VIS = 3, SLOTS = 8;

// Season ranks: Team stats' categories (teamstats.js), else SPEC 5's; the tiles are in the design's order.
const OWN_CATS = [
  { key: 'avgPoints', label: 'Points' }, { key: 'avgPointsAllowed', label: 'Points allowed', lower: true },
  { key: 'avgRebounds', label: 'Rebounds' }, { key: 'avgAssists', label: 'Assists' }, { key: 'fieldGoalPct', label: 'Field goal %' },
  { key: 'threePointFieldGoalPct', label: '3-point %' }, { key: 'avgThreePointFieldGoalsMade', label: '3-pointers made' },
  { key: 'avgSteals', label: 'Steals' }, { key: 'avgBlocks', label: 'Blocks' }, { key: 'avgTurnovers', label: 'Turnovers', lower: true },
];
const TILE_ORDER = ['Points', 'Points allowed', 'Rebounds', '3-point %', 'Blocks', 'Assists', 'Field goal %', 'Steals', 'Turnovers'];
const rankCats = () => {
  const theirs = statsMod.TEAM_CATS?.length ? statsMod.TEAM_CATS : [];
  const cats = [...theirs, ...OWN_CATS.filter((c) => !theirs.some((t) => String(t.label).toLowerCase() === c.label.toLowerCase()))];
  const at = (c) => { const i = TILE_ORDER.findIndex((l) => l.toLowerCase() === String(c.label).toLowerCase()); return i < 0 ? 99 : i; };
  return cats.filter((c) => at(c) < 99).sort((a, b) => at(a) - at(b));
};
const statOf = (t, c) => {
  if (!t) return null;
  if (typeof c.get === 'function') return c.get(t);
  const v = t.s?.[c.key];
  if (v != null) return +v;
  if (/allowed/i.test(c.label) && t.s?.avgPoints != null && t.s?.avgPointsDifferential != null) return t.s.avgPoints - t.s.avgPointsDifferential;
  return null;
};
// That team's place in the league on this category, ties as 'T-8th': { rank, value } or null.
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
const SORTS = [['pts', 'Points', 'points'], ['reb', 'Rebounds', 'rebounds'], ['ast', 'Assists', 'assists'], ['min', 'Minutes', 'minutes'], ['fg', 'FG%', 'field goal %', 'Field goal %'], ['tp', '3P%', '3-point %', '3-point %'], ['jersey', 'Jersey', 'jersey', 'Jersey number'], ['name', 'Name', 'name']];
const SHIELDED_SORTS = new Set(['pts', 'fg', 'tp']);
const num = (v) => (v == null || v === '' || Number.isNaN(+v) ? '–' : (+v).toFixed(1));
const shortTv = (s) => String(s || '').replace(/^NBA\s+/i, '');
const typeName = (t) => ({ HeadlineNews: 'News', Story: 'Story', Preview: 'Preview', Recap: 'Recap' }[t] || 'News');
function ago(t) {
  const m = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (m < 60) return `${m} min ago`;
  if (m < 24 * 60) return `${Math.round(m / 60)} h ago`;
  return m < 48 * 60 ? 'Yesterday' : new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
const has = (g, abbr) => g && (g.home.abbr === abbr || g.away.abbr === abbr);
const hidHtml = `<span class="nb-hid" style="justify-content:flex-end">${ic('eyeOff')}</span>`;

// One page: mounted into a root; show(abbr) draws that team. opts.pushed: the pushed screen (tools row, no section row).
export function teamPage({ pushed = false } = {}) {
  let root, ctx, body, cover, ctxLine, tools;
  let abbr = '', st = null, behind = false;
  const keys = () => [`schedule:${abbr}`, 'standings', `players:${abbr}`, `roster:${abbr}`, 'teamStats', `news:${abbr}`];
  const fresh = () => ({ area: 'top', fi: -1, ws: 0, rowOff: 0, sort: 'pts', opened: '' });

  // ---------- data ----------
  const live = (g) => nba.today.find((x) => x.id === g.id) || g;
  const sched = () => peek(`schedule:${abbr}`)?.data || null;
  const list = () => (sched()?.games || []).map(live);
  function heroOf(games) {
    const now = Date.now();
    const today = nba.today.find((g) => has(g, abbr));
    const inGame = (today?.state === 'in' && today) || games.find((g) => g.state === 'in');
    if (inGame) return inGame;
    const recent = [...games].reverse().find((g) => g.state === 'post' && now - g.date < 15 * 3600e3) || (today?.state === 'post' && now - today.date < 15 * 3600e3 ? today : null);
    if (recent) return recent;
    return games.find((g) => g.state === 'pre' && g.date > now - 4 * 3600e3) || (today?.state === 'pre' ? today : null);
  }
  const nextOf = (games, hero) => (hero?.state === 'pre' ? hero : games.find((g) => g.state === 'pre' && g.date > Date.now() - 4 * 3600e3 && g !== hero) || null);
  function espnRecord() {
    const s = peek('standings')?.data;
    const t = s?.confs.flatMap((c) => c.teams).find((x) => x.abbr === abbr);
    if (t) return `${t.w}-${t.l}`;
    const p = peek(`players:${abbr}`)?.data;
    if (p?.record) return p.record;
    let w = 0, l = 0;
    for (const g of list()) if (g.state === 'post') { if (sideOf(g, abbr).won) w++; else l++; }
    return sched() ? `${w}-${l}` : '';
  }
  function placeLines() {
    const s = peek('standings')?.data;
    const conf = s?.confs.find((c) => c.teams.some((t) => t.abbr === abbr));
    const t = conf?.teams.find((x) => x.abbr === abbr);
    const l1 = conf ? `${ordinalOf(conf.teams.indexOf(t) + 1)} in the ${conf.short || confOf(abbr)}` : '';
    const div = (peek(`players:${abbr}`)?.data?.standing || '').replace(/ in the | in /, ' ').replace(/ Division$/, '');
    return [l1, [t?.streak, div].filter(Boolean).map(esc).join(dot)];
  }

  // ---------- header (7.1) and the hero state table ----------
  function heroParts(g) {
    if (!sched() && failed(`schedule:${abbr}`)) return { btns: [['retry', `${ic('refresh')}Try again`]], cap: 'ESPN isn’t answering<br>airglow tries again every minute' };
    if (!g) return { btns: [], cap: '' };   // (off-season: the next-game block says so)
    const v = show(g), s = sideOf(v.g, abbr);
    // the hero state table's catch-up rows (catch-up 5.1)
    const row = heroRow(g);
    if (row) {
      const k = row.kind;
      if (k === 'live-tipoff') return { btns: [['watch', `${ic('play')}Watch live`], ['rp:tipoff', `${ic('tipoff')}From tip-off`], v.hidden ? ['reveal', `${ic('eyeOff', 'sm')}Reveal ${esc(gameName(g))}`] : ['game', 'Box score']], cap: '' };
      if (k === 'behind') return { btns: [['rp:resume', `${ic('play')}Resume`], ['rp:golive', 'Back to live'], ['game', 'Game page']], cap: '' };
      if (k === 'resume') return { btns: [['rp:resume', `${ic('play')}Resume`], ['rp:tipoff', `${ic('tipoff')}From tip-off`], ['game', 'Game page']], cap: '' };
      if (k === 'morning') return { btns: [['rp:tipoff', `${ic('play')}Watch from tip-off`], ['game', 'Game page']], cap: sourceCaption(row.src) };
      if (k === 'looking') return { btns: [['game', 'Game page']], cap: 'No replay yet<br>airglow keeps looking' };
      if (k === 'seen') return { btns: [['game', `${ic('score')}Box score`], ['rp:again', `${ic('play')}Watch again`]], cap: `Final${dot}${s.won ? 'W' : 'L'} ${esc(s.me.score)}–${esc(s.op.score)}` };
    }
    if (g.state === 'pre') {
      const ch = bestChannel(g), soon = g.date - Date.now() <= 3 * 3600e3;
      if (soon && ch) return { btns: [['watch', `${ic('play')}Watch pre-game`], ['game', 'Game page']], cap: `${esc(tipsIn(g.date))}<br>On ${esc(ch.name)}` };
      return { btns: [['game', 'Game page']], cap: `${esc(tipsIn(g.date))}${g.tv[0] ? `<br>${esc(g.tv[0])}` : ''}` };
    }
    if (g.state === 'in') {
      return {
        btns: [['watch', `${ic('play')}Watch live`], v.hidden ? ['reveal', `${ic('eyeOff', 'sm')}Reveal ${esc(gameName(g))}`] : ['game', 'Box score']],
        cap: v.hidden ? 'Score hidden' : `${esc(clockText(v.g))}${dot}${esc(s.me.score)}–${esc(s.op.score)}`,
      };
    }
    return { btns: [['game', `${ic('score')}Box score`]], cap: v.hidden ? 'Ended · result hidden' : `Final${dot}${s.won ? 'W' : 'L'} ${esc(s.me.score)}–${esc(s.op.score)}` };
  }
  function headHtml(games, hero) {
    const n = names(abbr), mine = abbr === favTeam(), data = !!sched();
    const v = hero && show(hero), s = hero && sideOf(v.g, abbr);
    const sk = (hero || games[games.length - 1])?.season || '';
    const off = data && !hero && !nextOf(games, hero);
    const kind = off ? 'Off-season' : /post|playoff/i.test(sk) ? 'Playoffs' : /pre/i.test(sk) ? 'Preseason' : /play-?in/i.test(sk) ? 'Play-in' : 'Regular season';
    const season = `${esc(sched()?.season || seasonOf())}${dot}${kind}`;
    const behind = hero && shielded(hero) && behindReplay(hero);
    const status = behind
      ? `${mine ? '<span class="t-label" style="color:var(--a-pink-text)">Your team</span>' : ''}${liveByClock(hero) ? liveP() : ''}<span class="t-label t-2">You're in ${esc(replayProgress(hero.id)?.item?.pos?.chapter || 'the replay')} ${s.word} ${esc(s.op.name)}</span>`   // (catch-up 7.2)
      : hero?.state === 'in'
      ? `${mine ? '<span class="t-label" style="color:var(--a-pink-text)">Your team</span>' : ''}${liveP()}<span class="t-label t-2">${esc(clockText(v.g))} ${s.word} ${esc(s.op.name)}</span>`
      : `${mine ? '<span class="t-label" style="color:var(--a-pink-text)">Your team</span>' : ''}<span class="t-label t-2">${season}</span>`;
    const rec = recordFor({ abbr, record: espnRecord() });
    let recHtml;
    if (rec.partial) {
      const u = unseenFor(abbr), last = u[0], ls = last && sideOf(last, abbr);
      recHtml = `<div class="big">${esc(rec.text || '–')}</div><div><div class="l1">${u.length} ${u.length === 1 ? 'result' : 'results'} hidden</div>${last ? `<div class="l2 row-flex" style="gap:6px">${ic('eyeOff', 'xs')}${esc(shortDay(last.date))}, ${ls.word} ${esc(ls.op.name)}</div>` : ''}</div>`;
    } else {
      const [l1, l2] = placeLines();
      recHtml = `<div class="big">${esc(rec.text || '–')}</div><div>${l1 ? `<div class="l1">${esc(l1)}</div>` : ''}${l2 ? `<div class="l2">${l2}</div>` : ''}</div>`;
    }
    const nx = nextOf(games, hero);
    let next = '';
    if (nx) { const ns = sideOf(nx, abbr); next = `<div class="nb-next"><span class="t-label">Next${dot}${esc(whenWord(nx.date))} ${hm(nx.date)}</span><div class="mu">${tc(ns.op, 's28')}<span>${ns.word} ${esc(ns.op.name)}</span></div><div class="tv">${esc(nx.tv[0] || '')}</div></div>`; }
    else if (data) next = '<div class="nb-next"><span class="t-label">Next</span><div class="tv">Schedule out in August</div></div>';   // (the status row says Off-season)
    const parts = heroParts(hero);
    const btns = parts.btns.map(([act, label], i) => `<span class="${i ? 'btn2' : 'btn'} fx" tabindex="-1" data-act="${act}"${act === 'reveal' ? ` data-g="${esc(hero.id)}"` : ''}${/^rp:(tipoff|resume|again)$/.test(act) ? ' data-hold' : ''}>${label}</span>`).join('');
    return `<div class="nb-head tp-b" data-area="top">
  <div class="st">${status}</div>
  <div class="nb-plate" style="${teamVars(abbr)}">${tc(abbr, 'xl')}<div><div class="loc">${esc(n.city)}</div><div class="nk">${esc(n.name)}</div></div></div>
  <div class="nb-rec">${data ? recHtml : failed(`schedule:${abbr}`) ? '' : '<div class="nb-sk" style="position:relative;width:200px;height:48px"></div>'}</div>
  ${next}
  <div class="nb-btns" data-row>${btns}<span class="t-cap clamp2">${parts.cap}</span></div>
</div>`;
  }

  // ---------- Schedule (7.2): a window of 8 tiles over the season, moved by the rail's navHook ----------
  function tileHtml(g, k, next) {
    const v = show(g), s = sideOf(v.g, abbr), pk = k >= 4;
    const ww = whenWord(g.date);
    const d = g === next && (ww === 'TONIGHT' || ww === 'TOMORROW') ? `<span class="n">${ww}</span><span>Next</span>` : `<span>${esc(tileDate(g.date))}</span>`;
    let r;
    // (behind in its replay first: the real game ending says nothing until he's watched it, 7.2)
    if (shielded(g) && behindReplay(g)) r = `${liveByClock(g) ? liveP() : ''}<span>You're in ${esc(replayProgress(g.id)?.item?.pos?.chapter || 'the replay')}</span>`;
    else if (g.state === 'post') r = v.hidden ? `<span class="nb-hid">${ic('eyeOff')}Result hidden</span>` : `<b class="${s.won ? '' : 'l'}">${s.won ? 'W' : 'L'}</b><b class="${s.won ? '' : 'l'}" style="font-weight:650">${esc(s.me.score)}–${esc(s.op.score)}</b>`;
    else if (g.state === 'in') r = `${liveP()}<span>${esc(clockText(v.g))}</span>`;
    else r = `<span>${hm(g.date)}${g.tv[0] ? `${dot}${esc(shortTv(g.tv[0]))}` : ''}</span>`;
    if (g.state !== 'pre' && replaysOf(g)?.length) r += `<span class="cu-g">${ic('hist')}</span>`;   // (catch-up 5.3: a replay)
    return `<div class="nb-gt${g === next ? ' next' : ''}${pk ? ' pk' : ' fx'}${k === 3 ? ' edge' : ''}"${pk ? '' : ' tabindex="-1" data-hold'} data-key="g:${esc(g.id)}" data-g="${esc(g.id)}"><div class="d">${d}</div><div class="o">${tc(s.op, 's32')}<span>${s.word} ${esc(s.op.name)}</span></div><div class="r">${r}</div></div>`;
  }
  const clampWs = (fi, n) => Math.max(0, Math.min(fi - 2, n - 4));
  function railTiles(games, hero) {
    if (!games.length) return '';
    if (st.fi < 0 || st.fi >= games.length) {
      const h = games.indexOf(games.find((g) => g.id === hero?.id));
      st.fi = h >= 0 ? h : Math.max(0, games.findIndex((g) => g.state !== 'post'));
      if (games.every((g) => g.state === 'post')) st.fi = games.length - 1;
      st.ws = clampWs(st.fi, games.length);
    }
    const next = nextOf(games, hero);
    return games.slice(st.ws, st.ws + SLOTS).map((g, k) => tileHtml(g, k, next)).join('');
  }
  function schedHtml(games, hero) {
    const un = unseenFor(abbr), left = games.filter((g) => g.state === 'pre').length;
    const rec = recordFor({ abbr, record: espnRecord() });
    const seen = games.filter((g) => g.state === 'post').length - un.filter((g) => g.state === 'post').length;
    const fail = failed(`schedule:${abbr}`);
    if (fail && !sched()) return `<div class="nb-title tp-b" style="top:${Y.sched}px">Schedule<small>Couldn’t load from ESPN · trying again</small></div>`;
    const small = fail ? 'Couldn’t load from ESPN · trying again'
      : !games.length ? (sched() ? 'No games on the schedule yet' : 'Loading…')
      : [un.length ? `${seen} seen${dot}${un.length} hidden` : esc(rec.text), un.length ? '' : `${left} to go`, games.some((g) => g.state !== 'pre' && replaysOf(g)?.length) ? `${ic('hist', 'xs')}&nbsp;replay` : '', '◀ results', '▶ coming up'].filter(Boolean).join(dot);
    const tiles = sched() ? railTiles(games, hero) : Array.from({ length: 5 }, (_, k) => `<div class="nb-gt${k >= 4 ? ' pk' : ''}" style="background:var(--a-surface-1)"></div>`).join('');
    const entry = games[st.fi] ? ` data-entry='[data-key="g:${esc(games[st.fi].id)}"]'` : '';
    return `<div class="nb-title tp-b" style="top:${Y.sched}px">Schedule<small>${small}</small></div>
  <div class="nb-rail rail tp-b" data-area="top" style="top:${Y.rail}px;margin-top:0"><div class="tp-tr tp-sched" data-row${entry}>${tiles}</div></div>
  <div class="nb-cue tp-b" style="top:${Y.cue}px">${ic('chevD')}Season ranks${dot}News${dot}Roster</div>`;
  }

  // ---------- Season ranks (7.3) ----------
  function ranksHtml() {
    const v = pinView([abbr]);
    const failedNow = failed('teamStats') && !peek('teamStats')?.data;
    let small = 'out of 30 teams · OK opens Team stats', tiles = '', note = '';
    let stats = peek('teamStats')?.data;
    if (v) {
      if (v.copy?.teamStats) { stats = v.copy.teamStats; small = `${ic('eyeOff', 'xs')} ${esc(v.label.replace(/^As/, 'as'))}`; }
      else if (v.loading) stats = null;
      else {
        stats = null;
        small = 'Hidden by the shield';
        note = `<div class="nb-notice tp-b" data-row data-area="ranks" style="top:${Y.ranksRail + 24}px">${ic('eyeOff')}<span>Season ranks are hidden: they include ${esc(gameName(v.game))}</span>${revealBtn(v.games)}</div>`;
      }
    }
    if (failedNow && !v) small = 'Couldn’t load from ESPN · trying again';
    if (stats) {
      tiles = rankCats().map((c) => {
        const r = rankIn(stats, abbr, c);
        return r ? `<div class="nb-rk fx" tabindex="-1" data-cat="${esc(c.key)}" data-key="rk:${esc(c.key)}"><div class="k">${esc(c.label)}</div><div class="o">${esc(r.rank)}</div><div class="v">${esc(statText(c, r.value))}</div></div>` : '';
      }).join('');
    } else if (!note && !failedNow) tiles = Array.from({ length: 6 }, () => '<div class="nb-rk" style="background:var(--a-surface-1)"></div>').join('');
    return `<div class="nb-title tp-b" style="top:${Y.ranks}px">Season ranks<small class="row-flex" style="gap:6px">${small}</small></div>
  ${note || `<div class="nb-rail rail tp-b tp-clipl" data-area="ranks" style="top:${Y.ranksRail}px;margin-top:0"><div class="tp-tr tp-ranks" data-row style="gap:16px">${tiles}</div></div>`}`;
  }

  // ---------- News (7.4) ----------
  function newsCard(story, i) {
    if (typeof newsMod.storyCard === 'function') return newsMod.storyCard(story, i);
    const cov = storyCover(story);
    if (cov) {
      const who = names(story.teams?.find((a) => has(cov, a)) || (has(cov, abbr) ? abbr : cov.home.abbr)).name;
      return `<div class="nb-nc fx" tabindex="-1" data-i="${i}" data-key="n:${esc(story.id)}" style="background:var(--a-surface-2)"><div class="nb-cov" style="justify-content:flex-start;padding-top:22px">${ic('eyeOff')}</div><div class="tx" style="background:none"><b>A ${esc(who)} story · hidden by the shield</b><span>${esc(ago(story.published))}</span></div></div>`;
    }
    const ph = story.image ? `<img src="${esc(story.image)}" alt="" decoding="async" loading="lazy">`
      : `<div class="nb-noph">${tc(story.teams?.[0] || abbr, '')}${story.teams?.[1] ? `<i>at</i>${tc(story.teams[1], '')}` : ''}</div>`;
    return `<div class="nb-nc fx" tabindex="-1" data-i="${i}" data-key="n:${esc(story.id)}">${ph}<div class="tx"><b>${esc(story.headline)}</b><span>${esc(typeName(story.type))} · ${esc(ago(story.published))}</span></div></div>`;
  }
  const stories = () => (peek(`news:${abbr}`)?.data || []).filter((s) => Date.now() - s.published < 7 * 864e5).slice(0, 10);
  function newsHtml() {
    const list = stories(), n = names(abbr);
    const covered = list.filter((s) => storyCover(s)).length;
    const kept = !!peek(`news:${abbr}`)?.data;
    const small = failed(`news:${abbr}`) && !kept ? 'Couldn’t load from ESPN · trying again'
      : !kept ? 'Loading…' : !list.length ? 'No ESPN stories in the last week'
      : covered ? `${covered} ${covered === 1 ? 'story' : 'stories'} hidden by the shield` : `ESPN${dot}${esc(n.name)}`;
    const cards = kept ? list.map(newsCard).join('') : failed(`news:${abbr}`) ? '' : Array.from({ length: 4 }, () => '<div class="nb-nc"></div>').join('');
    return `<div class="nb-title tp-b" style="top:${Y.news}px">News<small>${small}</small></div>
  <div class="nb-rail rail tp-b tp-clipl" data-area="news" style="top:${Y.newsRail}px;margin-top:0"><div class="tp-tr tp-news" data-row>${cards}</div></div>`;
  }

  // ---------- Roster (7.5) ----------
  function players() {
    const ro = peek(`roster:${abbr}`)?.data, pl = peek(`players:${abbr}`)?.data?.players || [];
    const byId = new Map(pl.map((p) => [p.id, p]));
    const out = ro ? ro.map((r) => ({ gp: 0, ...byId.get(r.id), id: r.id, name: r.name, abbr, pos: r.pos || byId.get(r.id)?.pos || '', jersey: r.jersey, injury: r.injury, headshot: byId.get(r.id)?.headshot || r.headshot }))
      : pl.map((p) => ({ ...p, jersey: '', injury: '' }));
    const shield = unseenFor(abbr).length > 0;
    const sort = shield && SHIELDED_SORTS.has(st.sort) ? 'jersey' : st.sort;
    const jn = (p) => (p.jersey === '' || p.jersey == null ? 999 : +p.jersey);
    const cmp = sort === 'jersey' ? (a, b) => jn(a) - jn(b) : sort === 'name' ? (a, b) => a.name.localeCompare(b.name)
      : (a, b) => (!a.gp - !b.gp) || (+(b[sort] ?? -1) - +(a[sort] ?? -1)) || a.name.localeCompare(b.name);
    return { list: out.sort(cmp), sort, shield };
  }
  function rosterHtml() {
    const { list, sort, shield } = players();
    const u = unseenFor(abbr);
    const s = SORTS.find(([k]) => k === sort);
    const small = failed(`roster:${abbr}`) && !list.length ? 'Couldn’t load from ESPN · trying again'
      : !list.length ? 'Loading…'
      : shield ? `Points and shooting hidden: they include ${esc(gameName(u[u.length - 1]))}`
      : st.area === 'roster' ? `Season averages${dot}sorted by ${esc(s[2])}` : `${list.length} players${dot}season averages`;
    const cells = (p) => [['min'], ['pts', 'b'], ['reb'], ['ast'], ['fg'], ['tp']].map(([k, b]) => `<span class="c c-st5${b ? ' b' : ''}">${!p.gp ? '–' : shield && SHIELDED_SORTS.has(k) ? hidHtml : num(p[k])}</span>`).join('');
    const rows = list.map((p, j) => `<div class="nb-tr fx" tabindex="-1" data-hold data-pl="${esc(p.id)}" data-key="pl:${esc(p.id)}" style="top:${(j - st.rowOff) * ROW}px"><span class="c c-no">${esc(p.jersey)}</span><span class="c-nm"><span class="nm" style="font-weight:650">${esc(p.name)}</span><span class="sub">${esc(p.pos)}</span>${p.injury ? `<span class="inj">${INJ}${esc(p.injury.charAt(0).toUpperCase() + p.injury.slice(1).toLowerCase())}</span>` : ''}${!p.gp ? '<span class="sub">Hasn’t played</span>' : ''}</span><span class="c c-gp">${p.gp || 0}</span>${cells(p)}</div>`).join('');
    const pill = list.length ? `<span class="pillbtn fx" tabindex="-1" data-act="sort" style="position:absolute;right:0;top:-4px">${ic('sort')}Sort<b>${esc(s[1])}</b></span>` : '';
    return `<div class="nb-title tp-b" style="top:${Y.roster}px;width:852px">Roster<small>${small}</small><div data-row data-area="roster" class="tp-pill">${pill}</div></div>
  <div class="nb-th tp-b" style="top:${Y.th}px"><span class="c c-no" style="color:inherit">#</span><span class="c-nm">PLAYER</span><span class="c c-gp">GP</span><span class="c c-st5">MIN</span><span class="c c-st5">PTS</span><span class="c c-st5">REB</span><span class="c c-st5">AST</span><span class="c c-st5">FG%</span><span class="c c-st5">3P%</span></div>
  <div class="nb-tb tp-b tp-roster" data-col data-area="roster" style="top:${Y.body}px;height:${ROW}px">${rows}</div>
  <div class="nb-sbar tp-b tp-sbar" style="top:${Y.body}px;height:${ROWS * ROW}px" hidden><i></i></div>`;
  }

  // ---------- drawing ----------
  function draw() {
    if (!root || !abbr || !ctx?.visible() || body.parentElement.hidden) return;   // (the section's picker is showing instead)
    if (watching()) { behind = true; return; }   // nothing to see under the TV player; drawn once it closes
    const games = list(), hero = heroOf(games);
    // the finals of the last 3 days (and a live game): their replays, for the tiles' mark (catch-up 5.3)
    for (const g of games) if ((g.state === 'post' || g.state === 'in') && Date.now() - g.date < 3 * 864e5 && !replaysOf(g)) findReplays(g);
    // each part is redrawn only when it changed, so a tick of the clock doesn't replace the tile you're holding OK on
    let changed = false;
    changed = setHtml(part('head'), headHtml(games, hero)) || changed;
    changed = drawSched(games, hero) || changed;
    changed = setHtml(part('ranks'), ranksHtml()) || changed;
    changed = setHtml(part('news'), newsHtml()) || changed;
    changed = setHtml(part('roster'), rosterHtml()) || changed;
    if (changed) hooks();
    if (pushed) drawTools();
    place();
    // a pushed page opened before its data came: focus went to the tools row; the header's primary takes it once it's drawn
    const a = document.activeElement;
    if (st.needEntry && pushed && page0.entry() && (a === document.body || a === st.waitEl || (!st.waitEl && tools.contains(a)))) { st.needEntry = false; focus(page0.entry()); }
  }
  function drawTools() {
    if (!tools) return;
    const n = names(abbr), mine = abbr === favTeam();
    setHtml(tools, `${mine ? `<span class="pillbtn dis" style="border-color:var(--a-border)">${ic('check')}Your team</span>` : `<span class="pillbtn fx" tabindex="-1" data-act="mine">${ic('starO')}Make the ${esc(n.name)} my team</span>`}<span class="pillbtn fx" tabindex="-1" data-act="all">${GRID}All teams</span><span class="t-cap">${st.opened ? `Opened from ${esc(st.opened)}${dot}Back returns there` : ''}</span>`);
  }
  const $ = (s) => body.querySelector(s);
  const PARTS = ['head', 'sched', 'ranks', 'news', 'roster'];
  const part = (k) => body.querySelector(`:scope>[data-part="${k}"]`);
  function drawSched(games = list(), hero = heroOf(games), restore = true) { return setHtml(part('sched'), schedHtml(games, hero), restore); }
  const visibleFx = (box) => (box ? [...box.querySelectorAll('.fx')].filter((e) => !e.classList.contains('dis')) : []);
  const firstOf = (box) => (box?._mem?.isConnected && box.contains(box._mem) ? box._mem : visibleFx(box)[0]) || null;
  const schedTile = () => { const t = $('.tp-sched'); return t?.querySelector(t.dataset.entry || '.fx') || firstOf(t); };
  const rosterRow = () => { const b = $('.tp-roster'); return b?._mem?.isConnected && b.contains(b._mem) ? b._mem : b?.children[st.rowOff] || null; };
  const ranksFirst = () => ($('.tp-ranks .nb-rk.fx') ? firstOf($('.tp-ranks')) : $('.nb-notice[data-area="ranks"] .fx'));
  const btnFirst = () => $('.nb-btns .fx');
  const pillBtn = () => $('.tp-pill .fx');
  // the page's parts top to bottom; Up and Down go to the nearest one that has something to focus
  const ORDER = [btnFirst, schedTile, ranksFirst, () => firstOf($('.tp-news')), rosterRow];
  const go2 = (...fs) => { for (const f of fs) { const el = f(); if (el) return focus(el); } return false; };
  const below = (i) => go2(...ORDER.slice(i + 1));
  // nothing above in the page (no header buttons, no schedule): back to the top, and the chip (or the tools row)
  const above = (i) => go2(...ORDER.slice(0, i).reverse()) || toChip();
  function toChip() {
    st.area = 'top'; place(false);
    if (pushed) return focus(tools?.querySelector('.fx'));
    ctx.chip(); return true;
  }
  // The page's own moves (SPEC 7.2, 7.8): the schedule's window, and Up/Down between the rails and the roster.
  function hooks() {
    const btns = $('.nb-btns'), sch = $('.tp-sched'), rk = $('.tp-ranks') || $('.nb-notice[data-area="ranks"]'), nw = $('.tp-news'), pill = $('.tp-pill'), ro = $('.tp-roster');
    const vert = (i) => (dir, cur, rep) => (dir === 'down' ? (rep && i === 0 ? undefined : below(i)) : dir === 'up' && i > 0 ? above(i) : undefined);
    if (btns) btns.navHook = vert(0);
    if (sch) sch.navHook = (dir, cur, rep) => {
      if (dir === 'left' || dir === 'right') { moveSched(dir === 'right' ? 1 : -1); return true; }
      return vert(1)(dir, cur, rep);
    };
    if (rk) rk.navHook = vert(2);
    if (nw) nw.navHook = vert(3);
    if (pill) pill.navHook = (dir) => (dir === 'up' ? above(4) : dir === 'down' ? go2(rosterRow) : undefined);
    if (ro) ro.navHook = (dir, cur) => (dir === 'up' && cur === ro.firstElementChild ? go2(pillBtn) || above(4) : dir === 'down' && cur === ro.lastElementChild ? false : dir === 'left' || dir === 'right' ? false : undefined);
  }
  function moveSched(d, to) {
    const games = list();
    const fi = Math.max(0, Math.min(games.length - 1, to ?? st.fi + d));
    if (fi === st.fi || !games.length) return;
    st.fi = fi; st.ws = clampWs(fi, games.length);
    drawSched(games, heroOf(games), false);
    hooks();
    focus($(`.tp-sched [data-key="g:${games[fi].id}"]`));
  }
  // CH± on the schedule: a month on, or back.
  function jumpMonth(dir) {
    const games = list(), cur = games[st.fi];
    if (!cur) return;
    const t = cur.date + dir * 30 * 864e5;
    const i = dir > 0 ? games.findIndex((g) => g.date >= t) : games.map((g) => g.date <= t).lastIndexOf(true);
    moveSched(0, i < 0 ? (dir > 0 ? games.length - 1 : 0) : i);
  }
  // Where the page sits for the focused part: its title at y 52, the bar and the row above out of the way.
  const AREA = { ranks: 'Season ranks', news: 'News', roster: 'Roster' };
  function place(fromFocus = true) {
    const a = document.activeElement;
    if (fromFocus && body.contains(a)) st.area = a.closest('[data-area]')?.dataset.area || 'top';
    const area = SHIFT[st.area] != null ? st.area : 'top', shift = SHIFT[area];
    body.style.setProperty('--sy', `${shift}px`);
    body.classList.toggle('at-roster', area === 'roster');
    cover.hidden = ctxLine.hidden = !shift;
    const count = body.querySelectorAll('.tp-roster>.nb-tr').length;
    if (shift) setHtml(ctxLine, `NBA${dot}<b>${esc(names(abbr).name)}</b>${dot}${AREA[area]}${area === 'roster' && count ? `${dot}${count} players` : ''}`, false);
    ctx.scrolled(shift > 0);
    // the roster: whole rows only; scrolled, 12 rows with one row of margin to the edge
    const tb = $('.tp-roster');
    if (tb) {
      const rows = [...tb.children], n = area === 'roster' ? ROWS : Math.max(0, Math.floor((513 - (Y.body - shift)) / ROW));
      let off = area === 'roster' ? st.rowOff : 0;
      const i = rows.indexOf(a);
      if (area === 'roster' && i >= 0) off = Math.min(Math.max(off, i - (n - 2)), Math.max(0, i - 1));
      off = Math.max(0, Math.min(off, rows.length - n));
      st.rowOff = off;
      rows.forEach((r, j) => { r.style.top = `${(j - off) * ROW}px`; });
      tb.style.height = `${Math.min(n, rows.length) * ROW}px`;
      const bar = $('.tp-sbar');
      bar.hidden = area !== 'roster' || rows.length <= n;
      if (!bar.hidden) bar.firstElementChild.style.cssText = `top:${(off / rows.length) * ROWS * ROW}px;height:${(n / rows.length) * ROWS * ROW}px`;
      const sm = $('.tp-pill')?.parentElement.querySelector('small');
      if (sm && !unseenFor(abbr).length && rows.length) { const s = SORTS.find(([k]) => k === st.sort); sm.innerHTML = area === 'roster' ? `Season averages${dot}sorted by ${esc(s[2])}` : `${rows.length} players${dot}season averages`; }
    }
    slide($('.tp-ranks'), RANK_STEP, RANK_VIS, a);
    slide($('.tp-news'), NEWS_STEP, NEWS_VIS, a);
  }
  // A rail longer than the screen slides so the focused card keeps one card of room on its right; cards outside show
  // their surface only.
  function slide(tr, step, vis, a) {
    if (!tr) return;
    const items = [...tr.children], f = tr.contains(a) ? a : tr._mem?.isConnected ? tr._mem : null;
    const i = f ? items.indexOf(f) : 0;
    const start = Math.max(0, Math.min(i - (vis - 2), items.length - vis));
    tr.style.transform = start > 0 ? `translateX(${-start * step}px)` : '';
    items.forEach((el, k) => { el.classList.toggle('pk', k < start || k >= start + vis); el.classList.toggle('edge', k === start + vis - 1); });
  }

  // ---------- actions ----------
  function heroAct(act, b) {
    const games = list(), g = heroOf(games);
    if (!g) return;
    if (act === 'game' || act === 'box') return push('game', { id: g.id });
    if (act === 'reveal') return reveal(b, () => draw());
    if (act === 'rp:tipoff' || act === 'rp:again') return watchFromTipoff(g);
    if (act === 'rp:resume') return resumeGame(g);
    if (act === 'rp:golive') return backToLive(g);
    if (act === 'watch') {
      const ch = bestChannel(g);
      if (ch) return playLive(ch, ringFor(ch), ringName(ch));
      findFeeds(g).then((f) => { if (f[0]) playLive(f[0].ch, ringFor(f[0].ch), ringName(f[0].ch)); else toast('No channel found for this game yet. Pick it from Home or the guide and it will be remembered.', 5000); });
    }
  }
  // Season ranks -> Team stats on that category (the NBA tab's section; from a pushed page, the NBA tab first).
  function openStats(cat) {
    if (current() !== 'nba') go('nba', null, { focusIn: false });
    openSection('teamstats', { cat });
    requestAnimationFrame(() => focus(nbaHost.entry()));
  }
  function tileMenu(tile) {
    const g = list().find((x) => x.id === tile.dataset.g);
    if (!g) return;
    const s = sideOf(g, abbr), v = show(g), rp = g.state !== 'pre' && replaysOf(g)?.length;
    const rows = [
      { icon: 'chevR', label: `${s.op.name} page`, run: () => push('team', { abbr: s.op.abbr }) },
      { icon: 'score', label: 'Open the game', run: () => push('game', { id: g.id }) },
    ];
    if (v.hidden) rows.push({ icon: 'eyeOff', label: `Reveal ${gameName(g)}`, run: () => reveal({ dataset: { g: g.id } }, () => draw()) });
    if (!rp) return contextMenu(tile, rows);
    // with a replay (catch-up 5.4): Watch from tip-off first (live: Watch live, From tip-off), the opponent's crest
    rows[0].lead = tc(s.op, 's24');
    if (g.state === 'in') {
      const ch = bestChannel(g);
      rows.unshift({ icon: 'play', label: 'Watch live', run: () => (ch ? playLive(ch, ringFor(ch), ringName(ch)) : push('game', { id: g.id })) }, { icon: 'tipoff', label: 'From tip-off', run: () => watchFromTipoff(g) });
    } else rows.unshift({ icon: 'play', label: 'Watch from tip-off', run: () => watchFromTipoff(g) });
    contextMenu(tile, rows, { cls: 'cu-w' });
  }
  function sortMenu() {
    const shield = unseenFor(abbr).length > 0;
    radioMenu({
      title: 'Sort the roster', value: shield && SHIELDED_SORTS.has(st.sort) ? 'jersey' : st.sort, cls: 'menu tp-sortm',
      rows: SORTS.map(([v, l, , long]) => ({ v, l: long || l, dis: shield && SHIELDED_SORTS.has(v), sub: shield && SHIELDED_SORTS.has(v) ? 'Hidden by the shield' : '' })),
      onPick: (v) => { st.sort = v; st.rowOff = 0; $('.tp-roster')._mem = null; draw(); requestAnimationFrame(() => focus($('.tp-pill .fx'))); },
    });
  }
  const playerOf = (row) => players().list.find((p) => p.id === row.dataset.pl);
  function confirmMine() {
    const n = names(abbr);
    confirmMenu({
      title: `Make the ${n.name} your team?`, text: 'Their games lead Home and the NBA tab, and the spoiler shield’s My team follows them.', yes: 'Make them my team',
      onYes: () => { saveSettings({ nbaTeam: abbr }); emit('nba'); toast(`The ${n.name} are your team`); draw(); requestAnimationFrame(() => focus(tools.querySelector('[data-act="all"]'))); },
    });
  }

  const page0 = {
    entry: () => body?.querySelector('.nb-btns .fx') || body?.querySelector('.tp-sched .fx') || body?.querySelector('[data-act="retry"]') || null,
  };
  return {
    mount(r, c) {
      root = r; ctx = c;
      root.insertAdjacentHTML('beforeend', `${pushed ? '<div class="nb-tools tp-tools" data-row></div>' : ''}<div class="nb-clip tp-clip"><div class="tp-body">${['head', 'sched', 'ranks', 'news', 'roster'].map((k) => `<div data-part="${k}"></div>`).join('')}</div><div class="nb-cover" hidden></div><div class="nb-ctx" hidden></div></div>`);
      body = root.querySelector('.tp-body'); cover = root.querySelector('.nb-cover'); ctxLine = root.querySelector('.nb-ctx'); tools = root.querySelector('.tp-tools');
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]');
        if (b?.dataset.act === 'retry') { for (const k of keys()) want(k, { force: true }); return; }
        if (b && b.closest('.nb-btns')) return heroAct(b.dataset.act, b);
        if (b?.dataset.act === 'reveal') return reveal(b, () => draw());
        if (b?.dataset.act === 'sort') return sortMenu();
        if (b?.dataset.act === 'mine') return confirmMine();
        if (b?.dataset.act === 'all') return openPicker({ current: abbr });
        const tile = e.target.closest('.nb-gt.fx');
        if (tile) return push('game', { id: tile.dataset.g });
        const rk = e.target.closest('.nb-rk.fx');
        if (rk) return openStats(rk.dataset.cat);
        const nc = e.target.closest('.nb-nc.fx');
        if (nc) {
          const s = stories().find((x) => `n:${x.id}` === nc.dataset.key) || stories()[+nc.dataset.i];
          if (s && typeof newsMod.openStory === 'function') return newsMod.openStory(s);
          return toast('Stories open from the News section.');
        }
        const row = e.target.closest('.nb-tr.fx');
        if (row) return openPlayer(playerOf(row), { from: 'roster' });
      });
      root.addEventListener('tvhold', (e) => {
        const hb = e.target.closest('.nb-btns [data-act^="rp:"]');
        if (hb) { const g = heroOf(list()); if (g) sourcesSheet(g); return; }
        const tile = e.target.closest('.nb-gt.fx');
        if (tile) return tileMenu(tile);
        const row = e.target.closest('.nb-tr.fx');
        if (row) contextMenu(row, [{ icon: 'user', label: 'Player card', run: () => openPlayer(playerOf(row), { from: 'roster' }) }]);
      });
      root.addEventListener('tvfocus', (e) => { if (body.contains(e.target)) place(); });
      const redraw = () => { if (abbr && ctx.visible()) draw(); };
      on('league', (k) => { if (k === 'pin' || keys().includes(k) || k.startsWith('schedule:')) redraw(); });
      on('nba', redraw); on('feeds', redraw); on('replays', redraw); on('progress', redraw);
      on('player-closed', () => { if (behind) { behind = false; redraw(); } });
      // every minute: want() fetches what's older than its age (schedule and news 10 min, stats 1 h), or what failed
      setInterval(() => { if (!abbr || !ctx.visible()) return; for (const k of keys()) if (!loading(k)) want(k); draw(); }, 60000);
      setInterval(redraw, 30000);   // "Tips off in 1 h 20 min"
    },
    // Draw this team (state: the page's own place, kept per pushed page so Back to it lands where you were).
    show(a, state) {
      if (a !== abbr) for (const k of PARTS) part(k)._html = null;
      abbr = a; st = state || fresh();
      for (const k of keys()) want(k);
      ensure('live').catch(() => {});
      const games = list(), hero = heroOf(games);
      if (hero && (hero.state === 'in' || (hero.state === 'pre' && hero.date - Date.now() < 3 * 3600e3))) findFeeds(hero);
      draw();
      st.needEntry = !page0.entry(); st.waitEl = null;
      // where the opening focus went (after the router's own): moving on from there yourself cancels the hand-over
      if (st.needEntry) requestAnimationFrame(() => requestAnimationFrame(() => { st.waitEl = document.activeElement; }));
    },
    state: () => st,
    abbr: () => abbr,
    draw,
    entry: page0.entry,
    toTop() {
      if (!st) return;
      st.area = 'top'; st.rowOff = 0;
      st.fi = -1;   // the next game back in the third slot
      if (abbr && sched()) { drawSched(undefined, undefined, false); hooks(); }
      body.querySelectorAll('[data-row],[data-col]').forEach((b) => (b._mem = null));
      place(false);
    },
    key(k) {
      const a = document.activeElement;
      if ((k === 'chup' || k === 'chdown') && a?.closest('.tp-sched')) { jumpMonth(k === 'chup' ? 1 : -1); return true; }
      return false;
    },
    leave() {},
  };
}

// ---------- the NBA tab's team section: your team, or the picker when your team is "None" ----------
const page = teamPage();
let secRoot, secCtx, pickBox, shownFor = null;
function drawPicker() {
  setHtml(pickBox, `<div class="tp-picker">${pickerHtml()}</div>`);
}
export const teamSection = {
  id: 'team',
  label: () => (favTeam() ? `${tc(favTeam())}${esc(names(favTeam()).name)}` : 'Teams'),
  mount(root, ctx) {
    secRoot = root; secCtx = ctx;
    root.innerHTML = '<div class="tp-pickbox"></div>';
    pickBox = root.querySelector('.tp-pickbox');
    page.mount(root, ctx);
    root.addEventListener('click', (e) => { const c = e.target.closest('[data-pick]'); if (c) push('team', { abbr: c.dataset.pick }); });
    on('nba', () => { if (ctx.visible() && (favTeam() || '') !== (shownFor ?? '')) teamSection.enter(root, ctx); });
  },
  enter(root, ctx) {
    const t = favTeam();
    const was = shownFor;
    shownFor = t;
    root.querySelector('.tp-clip').hidden = !t;
    pickBox.hidden = !!t;
    if (!t) { page.toTop(); drawPicker(); return; }
    page.show(t, was === t ? page.state() : null);
  },
  leave() {},
  entry: (root) => (favTeam() ? page.entry() : root.querySelector('.tp-picker .fx')),
  toTop() { page.toTop(); },
  key: (k, e) => page.key(k, e),
  meta: () => (favTeam() ? espnMeta(`schedule:${favTeam()}`) : ''),
};
