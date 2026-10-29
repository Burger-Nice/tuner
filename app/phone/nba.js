// NBA (SPEC 3.3, 04): the TV's hub, stacked. The section chips (Games · [crest] team · Standings · News), the hero (your
// team's game with the tip-off slab: `02:00 / TIP-OFF`, the clock when live and seen, `Score hidden` under the shield;
// the catch-up rows: Watch from tip-off, Resume, Back to live), the day chips, the day's games as full-width cards
// (the hero's game isn't repeated). The game page (pushed): the box score and plays behind the shield's cover.
// Every score goes through games.js; the seen store is this phone's own (SPEC 0.9: it starts empty and over-hides).
import { hm, teamPalette } from '../tv/js/util.js';
import { S, on, settings, saveSettings } from '../tv/js/state.js';
import { ensure } from '../tv/js/catalog.js';
import { nba, startNba, myGame, favTeam, isMine, show, bestChannel, findFeeds, feedsNow, dayGames, dayLabel, recordFor, reveal, hidden, shielded, behindReplay, heldLive, retryScores, gameById, wantSummary, summaryOf, ordinal, clockText, liveByClock, setShield, shieldMode, storyCover, holdGame, unseenFor, markSeen } from '../tv/js/games.js';
import { peek, want, failed } from '../tv/js/league.js';
import { heroRow, findReplays, replaysOf, sourceCaption, nightLabel } from '../tv/js/catchup.js';
import { watchFromTipoff, resumeGame } from '../tv/js/replay.js';
import { playLive } from '../tv/js/player.js';
import { pinView, tipsIn, gameName } from '../tv/js/nba/common.js';
import { toast } from '../tv/js/ui.js';
import { avatar, ic, esc, push, back, isShown, menu, radio, confirm, longPress, crestImg } from './ui.js';
import { gameCard, recText, dayWord } from './cards.js';
import { ringFor } from './home.js';

const { NBA } = window;
let el, sec = 'games', offset = 0, games = [], loading = false, err = '';
const team = (t) => ({ ...t, logo: t.logo || NBA.logoFor(t.abbr) });
const tune = (ch) => playLive(ch, ringFor(ch), 'All channels');

// ---------- the hero ----------
export function heroGame() {
  const mine = myGame();
  if (mine) return mine;
  const t = favTeam();
  const d = t && peek(`schedule:${t}`)?.data;
  if (!d) return null;
  const now = Date.now();
  const recent = [...d.games].reverse().find((g) => g.state === 'post' && now - g.date < 15 * 3600e3);
  return recent || d.games.find((x) => x.state !== 'post' && x.date > now - 4 * 3600e3) || null;
}
// the hero's state, as the TV's state table (cards.js gameHero / replayHero): eyebrow, slab, buttons, caption
function heroModel(g0) {
  const row = heroRow(g0), v = show(g0), g = v.g, ch = bestChannel(g0);
  const shield = v.hidden || (shielded(g0) && behindReplay(g0));
  const live = g.state === 'in' || heldLive(g0);
  const m = { g: g0, shield, acts: [], cap: '', ey: [isMine(g0) ? 'Your team' : 'NBA', 'NBA'] };
  const d = Math.round((g.date - Date.now()) / 60000);
  if (g.state === 'pre') {
    m.ey = ['Your team', 'NBA · Tip-off'];
    m.slab = [d > 0 && d < 80 ? `${d} MIN` : hm(g.date), 'Tip-off'];
    m.acts = ch && d < 180 ? [['live', 'Watch pre-game', true]] : [['game', 'Game page', false]];
    m.cap = [tipsIn(g.date), ch?.name || g.tv?.[0] || ''].filter(Boolean).join(' · ');
    return m;
  }
  if (row && row.kind !== 'live-tipoff') {
    const pos = row.pos;
    const posBig = pos?.chapter ? (pos.chapter === 'Halftime' ? 'HALF' : pos.chapter) : 'REPLAY';
    m.ey = ['Your team', `NBA · ${nightLabel(g0.date)}`];
    if (row.kind === 'behind') { m.slab = [posBig, 'You stopped here']; m.acts = [['resume', 'Resume', true], ['live', 'Back to live', false], ['game', 'Game page', false]]; m.liveTag = liveByClock(g0); }
    else if (row.kind === 'resume') { m.slab = [posBig, 'You stopped here']; m.acts = [['resume', 'Resume', true], ['tipoff', 'From tip-off', false]]; }
    else if (row.kind === 'morning') { m.slab = ['REPLAY', 'Score hidden']; m.acts = [['tipoff', 'Watch from tip-off', true], ['game', 'Game page', false]]; m.cap = sourceCaption(row.src, { short: false }).replace(/<[^>]*>/g, ''); }
    else if (row.kind === 'looking') { m.slab = ['END', 'Score hidden']; m.acts = [['game', 'Game page', false]]; m.cap = row.busy ? 'Looking for a replay…' : 'No replay found · airglow keeps looking'; }
    else { m.slab = ['FINAL', g.period > 4 ? 'After overtime' : 'Full time']; m.acts = [['game', 'Box score', false], ['tipoff', 'Watch again', true]]; m.cap = `Final · ${g.away.score}–${g.home.score}`; }
    return m;
  }
  if (live) {
    m.ey = ['Your team', 'NBA']; m.liveTag = true;
    m.slab = shield ? ['ON NOW', 'Score hidden'] : /half/i.test(g.detail) ? ['HALF', 'Live'] : [`${ordinal(g.period)} ${g.clock}`, v.synced != null ? 'Live · synced' : 'Live'];
    m.acts = [['live', 'Watch live', true]];
    if (row?.kind === 'live-tipoff' || replaysOf(g0)?.length) m.acts.push(['tipoff', 'From tip-off', false]);
    m.acts.push(shield ? ['reveal', 'Reveal', false] : ['game', 'Box score', false]);
    m.cap = ch ? `On ${ch.name.replace(/^([^:]{2,10}):\s.{12,}$/, '$1')}${feedsNow(g0).length > 1 ? ` · ${feedsNow(g0).length - 1} more channel${feedsNow(g0).length > 2 ? 's' : ''}` : ''}` : 'Looking for the channel…';
    return m;
  }
  m.ey = ['Your team', `NBA · ${shield ? 'Ended' : 'Final'}`];
  m.slab = shield ? ['END', 'Score hidden'] : ['FINAL', g.period > 4 ? 'After overtime' : 'Full time'];
  m.acts = [['game', 'Box score', false]];
  if (replaysOf(g0)?.length) m.acts.push(['tipoff', 'Watch from tip-off', true]);
  if (shield) m.acts.push(['reveal', 'Reveal', false]);
  return m;
}
function heroHtml(g0) {
  const m = heroModel(g0), g = show(g0).g;
  const trow = (t) => `<div class="tr${t.abbr === favTeam() ? ' mine' : ''}"><span class="tedge" style="--te:${teamPalette(t).p}"></span>${crestImg(team(t), 40)}<div style="min-width:0"><div class="nm">${esc(t.name)}</div>${!m.shield && g.state !== 'pre' ? `<span style="position:absolute;right:136px;font:italic 800 24px/1 var(--a-font-live)">${esc(t.score ?? '')}</span>` : ''}<div class="rc">${m.shield ? `${esc(recordFor(t).text || '')}${recordFor(t).text ? ' · as of tip-off' : ''}` : recText(t)}</div></div></div>`;
  const score = !m.shield && g.state !== 'pre' ? ` · ${esc(g.away.score)}–${esc(g.home.score)}` : '';
  const slab = m.shield && m.slab[1] === 'Score hidden' ? `<div><b>${esc(m.slab[0])}</b><span>${ic('eyeOff')}Score hidden</span></div>` : `<div><b>${esc(m.slab[0])}</b><span>${esc(m.slab[1])}</span></div>`;
  const acts = m.acts.map(([a, l, play], i) => (i === 0 ? `<button class="pill${play ? '' : ' noicon'}" data-hero="${a}">${play ? ic('play') : ''}${esc(l)}</button>` : `<button class="ghost" data-hero="${a}">${esc(l)}</button>`)).join('');
  return `<div class="nb-hero" data-g="${esc(g0.id)}"><div class="ey">${esc(`${m.ey[0]} · ${m.ey[1]}`)}${m.liveTag ? '<span class="live sm">Live</span>' : ''}</div>
    <div class="mt">${trow(g.away)}<div class="at">AT</div>${trow(g.home)}</div><div class="slab">${slab}</div>
    <div class="act">${acts}</div>${m.cap || score ? `<div class="cap">${esc(m.cap)}${score && !m.cap.includes('Final') ? '' : ''}</div>` : ''}</div>`;
}
function heroAct(a, g) {
  const ch = bestChannel(g);
  if (a === 'live') { if (!ch) { toast('No channel found for this game yet. Pick it in Live and it will be remembered.', 4500); findFeeds(g); return; } return tune(ch); }
  if (a === 'tipoff') return watchFromTipoff(g);
  if (a === 'resume') return resumeGame(g);
  if (a === 'game') return push('game', { id: g.id });
  if (a === 'reveal') return revealAsk(g);
}
export function revealAsk(g, then) {
  confirm({ title: `Reveal ${gameName(g)}?`, text: 'Its score, record and stories show on this iPhone from now on.', no: 'Keep it hidden', yes: 'Reveal', onYes: () => { reveal(g.id); then?.(); } });
}

// ---------- the sections ----------
const SECS = () => [['games', 'Games'], ['team', NBA.team(favTeam())?.name || 'Teams'], ['standings', 'Standings'], ['news', 'News']];
function top() {
  const at = nba.at ? `ESPN · ${hm(nba.at)}` : nba.err ? 'ESPN' : '';
  return `<div class="ph-top"><h1>NBA</h1><span class="sp"></span><span class="clk">${esc(at)}</span>${avatar()}</div>
    <div class="chips" style="margin-top:12px">${SECS().map(([k, l]) => `<button class="chip${k === sec ? ' sel' : ''}${k === 'team' && favTeam() ? ' ico' : ''}" data-sec="${k}">${k === 'team' && favTeam() ? `<span class="cr"><img src="${esc(NBA.logoFor(favTeam()))}" alt=""></span>` : ''}${esc(l)}</button>`).join('')}</div>`;
}
function gamesHtml() {
  const mine = offset === 0 ? heroGame() : null;
  if (mine && mine.state !== 'pre' && !replaysOf(mine)) findReplays(mine);
  const rest = games.filter((g) => g.id !== mine?.id);
  const d = (o) => dayLabel(o).split(' · ').pop();
  const count = loading ? 'Loading…' : rest.length ? `${rest.length} game${rest.length === 1 ? '' : 's'}` : '';
  const days = `<div class="nb-days"><button class="chip" data-day="-1">${ic('chevL')}${esc(dayLabel(offset - 1).split(' · ').pop().split(' ')[0])}</button><button class="chip sel">${esc(offset === 0 ? `Today · ${d(0).replace(/^\w+ /, '')}` : dayLabel(offset))}</button><button class="chip" data-day="1">${esc(dayLabel(offset + 1).split(' · ').pop().split(' ')[0])}${ic('chevR')}</button><span class="cap">${esc(count)}</span></div>`;
  const body = err && !games.length ? `<div class="state"><div class="ico">${ic('globe')}</div><b>Scores aren't reachable</b><p>ESPN isn't answering. airglow tries again every minute.</p><button class="ghost" data-act="retry">${ic('refresh')}Try again</button></div>`
    : loading && !games.length ? Array.from({ length: 4 }, () => '<div class="sk" style="height:96px;border-radius:14px"></div>').join('')
    : !rest.length ? `<div class="note">${mine ? 'No other games' : `No games ${offset ? 'that day' : 'today'}`}</div>`
    : rest.map((g) => gameCard(g)).join('');
  return `${mine ? heroHtml(mine) : !favTeam() ? '<div class="state"><b>Pick your team</b><p>Its next game leads here, and the spoiler shield follows it.</p><button class="ghost" data-act="pickteam">Teams</button></div>' : ''}${days}<div class="nb-grid">${body}</div>`;
}
const WEST = new Set(['DAL', 'DEN', 'GS', 'HOU', 'LAC', 'LAL', 'MEM', 'MIN', 'NO', 'OKC', 'PHX', 'POR', 'SAC', 'SA', 'UTAH']);
let conf = '';
function standingsHtml() {
  const d = peek('standings')?.data;
  want('standings');
  if (!d) return failed('standings') ? '<div class="state"><b>Standings aren\'t reachable</b><p>ESPN isn\'t answering.</p></div>' : '<div class="sk" style="height:400px;margin:16px"></div>';
  const t = favTeam();
  const order = (d.confs.find((c) => c.teams.some((x) => x.abbr === t))?.short || (t && !WEST.has(t) ? 'East' : 'West')) === 'East' ? ['East', 'West'] : ['West', 'East'];
  if (!conf) conf = order[0];
  const live = d.confs.find((c) => c.short === conf);
  const chips = `<div class="chips" style="margin-top:14px">${order.map((c) => `<button class="chip${c === conf ? ' sel' : ''}" data-conf="${c}">${c}</button>`).join('')}</div>`;
  if (!live) return chips;
  const v = pinView(live.teams.map((x) => x.abbr));
  let teams = live.teams, note = '';
  if (v) {
    if (v.loading) return `${chips}<div class="sk" style="height:300px;margin:16px"></div>`;
    const c = v.copy?.standings?.confs?.find((x) => x.short === conf);
    if (!c) return `${chips}<div class="cover"><div class="h">${ic('eyeOff')}${esc(conf)} standings are hidden</div><p>They include ${esc(gameName(v.game))}, which you haven't seen on this iPhone. airglow had no copy from before that tip-off.</p><div class="act"><button class="ghost" data-act="keep">Keep it hidden</button><button class="ghost" data-reveal="${esc(v.games.map((g) => g.id).join(','))}">${ic('eyeOff')}Reveal</button></div></div>`;
    teams = c.teams; note = `<div class="note">${ic('eyeOff')} ${esc(v.label)}</div>`;
  }
  const list = [...teams].sort((a, b) => (a.seed || 99) - (b.seed || 99) || (parseFloat(b.pct) || 0) - (parseFloat(a.pct) || 0));
  const rows = list.map((x, i) => `<tr${x.abbr === t ? ' style="background:rgba(249,91,172,.08)"' : ''}><td>${i + 1}. ${esc(NBA.team(x.abbr)?.name || x.name || x.abbr)}</td><td>${x.w}</td><td>${x.l}</td><td>${esc(x.pct || '')}</td><td>${esc(x.gb ?? '')}</td><td>${esc(x.streak || '')}</td></tr>${i === 5 ? '<tr><td colspan="6" style="color:var(--a-text-3);text-align:left">Play-in · 7 to 10</td></tr>' : i === 9 ? '<tr><td colspan="6"></td></tr>' : ''}`).join('');
  return `${chips}${note}<div class="tbl"><table class="box-t"><thead><tr><th>${esc(live.name || conf)}</th><th>W</th><th>L</th><th>PCT</th><th>GB</th><th>STRK</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function teamHtml() {
  const t = favTeam();
  if (!t) return '<div class="state"><b>No team picked</b><button class="ghost" data-act="pickteam">Teams</button></div>';
  const d = peek(`schedule:${t}`)?.data;
  want(`schedule:${t}`);
  const info = NBA.team(t);
  const head = `<div class="cover" style="display:flex;gap:12px;align-items:center">${crestImg({ abbr: t, logo: NBA.logoFor(t) }, 56)}<div><div style="font:var(--ph-title)">${esc(info ? `${info.city} ${info.name}` : t)}</div><div class="note" style="margin:2px 0 0">${recText({ abbr: t, record: peek('standings')?.data?.confs?.flatMap((c) => c.teams).find((x) => x.abbr === t) ? `${peek('standings').data.confs.flatMap((c) => c.teams).find((x) => x.abbr === t).w}-${peek('standings').data.confs.flatMap((c) => c.teams).find((x) => x.abbr === t).l}` : '' })}</div></div><span style="flex:1"></span><button class="ghost sm" data-act="pickteam">Change</button></div>`;
  if (!d) return `${head}<div class="sk" style="height:300px;margin:16px"></div>`;
  const now = Date.now();
  const list = d.games.filter((g) => g.date > now - 14 * 864e5).slice(0, 14).map((g) => gameById(g.id) || g);
  return `${head}<div class="sec-h" style="margin-top:22px">Schedule</div><div class="nb-grid">${list.map((g) => gameCard(g)).join('')}</div>`;
}
function newsHtml() {
  const d = peek('news')?.data;
  want('news');
  if (!d) return failed('news') ? '<div class="state"><b>News isn\'t reachable</b></div>' : '<div class="sk" style="height:300px;margin:16px"></div>';
  return `<div class="nb-grid">${d.slice(0, 20).map((s) => {
    const g = storyCover(s);
    if (g) return `<div class="cover"><div class="h">${ic('eyeOff')}A story about a game you haven't seen</div><p>${esc(gameName(g))} · ${esc(dayWord(g.date))}</p><div class="act"><button class="ghost" data-reveal="${esc(g.id)}">${ic('eyeOff')}Reveal ${esc(gameName(g))}</button></div></div>`;
    return `<div class="cover">${s.image ? `<img src="${esc(s.image)}" alt="" style="width:100%;border-radius:10px;margin-bottom:10px;aspect-ratio:16/9;object-fit:cover" loading="lazy">` : ''}<div class="h">${esc(s.headline)}</div><p>${esc(s.description)}</p></div>`;
  }).join('')}</div>`;
}
function draw() {
  if (!el) return;
  const y = el.scrollTop;
  const body = sec === 'games' ? gamesHtml() : sec === 'standings' ? standingsHtml() : sec === 'team' ? teamHtml() : newsHtml();
  el.innerHTML = top() + body;
  el.scrollTop = y;
}
let soonT = 0;
const soon = () => { clearTimeout(soonT); soonT = setTimeout(() => { if (isShown('nba')) draw(); }, 150); };
async function load(o, { force = false, quiet = false } = {}) {
  offset = o;
  if (!quiet) { loading = true; err = ''; draw(); }
  let got, bad = '';
  try { got = await dayGames(o, { force }); } catch (e) { bad = e.message; got = []; }
  if (o !== offset) return;
  games = got; err = bad; loading = false;
  draw();
}
export function teamSheet(then) {
  const rows = [{ v: 'none', l: 'No team' }, ...(NBA.TEAMS || []).map(([abbr, city, name]) => ({ v: abbr, l: `${city} ${name}` })).sort((a, b) => a.l.localeCompare(b.l))];
  radio('Your team', rows, settings().nbaTeam || 'MEM', (v) => { saveSettings({ nbaTeam: v }); import('../tv/js/state.js').then((s) => s.emit('nba')); then?.(); }, { full: true });
}
export function shieldSheet(then) {
  radio('Spoiler shield', [{ v: 'off', l: 'Off', sub: 'Scores show everywhere' }, { v: 'mine', l: 'My team', sub: 'Your team\'s scores stay hidden until you\'ve watched' }, { v: 'all', l: 'All games', sub: 'Every score stays hidden until you\'ve watched' }], shieldMode(), (v) => { setShield(v); then?.(); });
}
export default {
  name: 'nba', tab: true,
  mount(root) {
    el = root;
    root.addEventListener('click', (e) => {
      const s = e.target.closest('[data-sec]');
      if (s) { sec = s.dataset.sec; root.scrollTop = 0; draw(); return; }
      const d = e.target.closest('[data-day]');
      if (d) { load(offset + +d.dataset.day); return; }
      const c = e.target.closest('[data-conf]');
      if (c) { conf = c.dataset.conf; draw(); return; }
      const rv = e.target.closest('[data-reveal]');
      if (rv) { const ids = rv.dataset.reveal.split(','); const g = gameById(ids[0]) || unseenFor().find((x) => x.id === ids[0]); if (g) revealAsk(g, () => { ids.forEach(markSeen); draw(); }); return; }
      const h = e.target.closest('[data-hero]');
      if (h) { const g = gameById(h.closest('[data-g]').dataset.g) || heroGame(); if (g) heroAct(h.dataset.hero, g); return; }
      const b = e.target.closest('[data-act]');
      if (b) {
        if (b.dataset.act === 'account') return push('account');
        if (b.dataset.act === 'retry') { if (offset) load(offset, { force: true }); else retryScores(); return; }
        if (b.dataset.act === 'pickteam') return teamSheet(draw);
        if (b.dataset.act === 'keep') return;
      }
      const card = e.target.closest('.gcard[data-g]');
      if (card) push('game', { id: card.dataset.g });
    });
    longPress(root, '.gcard[data-g]', (card) => {
      const g = gameById(card.dataset.g) || games.find((x) => x.id === card.dataset.g);
      if (!g) return;
      const ch = bestChannel(g);
      menu(gameName(g), [
        g.state === 'in' ? { label: 'Watch live', icon: 'play', run: () => (ch ? tune(ch) : toast('No channel found yet')) } : null,
        g.state !== 'pre' ? { label: 'Watch from tip-off', icon: 'tipoff', run: () => watchFromTipoff(g) } : null,
        { label: 'Open the game', icon: 'chevR', run: () => push('game', { id: g.id }) },
        hidden(g) ? { label: `Reveal ${gameName(g)}`, icon: 'eyeOff', run: () => revealAsk(g, draw) } : null,
      ]);
    });
    const redraw = () => { if (!isShown('nba')) return; if (!offset) { games = nba.today; loading = false; err = nba.err; } soon(); };
    on('nba', redraw); on('summary', redraw); on('feeds', redraw); on('replays', redraw); on('progress', redraw); on('league', redraw);
  },
  enter() {
    startNba();
    ensure('live').catch(() => {});
    if (favTeam()) want(`schedule:${favTeam()}`);
    if (offset === 0) { games = nba.today; loading = !nba.today.length && !nba.err; err = nba.err; draw(); const m = heroGame(); if (m && (m.state === 'in' || (m.state === 'pre' && m.date - Date.now() < 3 * 3600e3))) findFeeds(m).then(soon); }
    else load(offset);
  },
};

// ---------- the game page (pushed) ----------
let gEl = null, gId = null, gTab = 'box';
function gameHtml() {
  const g0 = gameById(gId);
  if (!g0) return `<div class="ph-top"><button class="ph-back" data-act="back">${ic('back')}</button><h1>Game</h1></div><div class="state"><b>That game isn't on hand</b></div>`;
  holdGame(g0);
  const v = show(g0), g = v.g, hid = v.hidden || (shielded(g0) && behindReplay(g0));
  const s = summaryOf(g0.id);
  const ch = bestChannel(g0);
  const st = g.state === 'pre' ? `${dayWord(g.date)} · ${hm(g.date)}` : g.state === 'in' ? (hid ? 'Live · score hidden' : clockText(g)) : hid ? 'Ended · score hidden' : `Final${g.period > 4 ? ' / OT' : ''}`;
  const sc = !hid && g.state !== 'pre' ? `<div style="font:italic 800 40px/1 var(--a-font-live);text-align:center;margin-top:10px">${esc(g.away.score)} – ${esc(g.home.score)}</div>` : hid ? `<div class="note" style="text-align:center">${ic('eyeOff')} Score hidden</div>` : '';
  const side = (t) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">${crestImg(team(t), 64)}<b style="font:var(--ph-title)">${esc(t.name)}</b><span class="note" style="margin:0">${hid ? `${esc(recordFor(t).text || '')}${recordFor(t).text ? ' · as of tip-off' : ''}` : recText(t)}</span></div>`;
  const acts = [];
  if (g.state === 'in' || (g.state === 'pre' && g.date - Date.now() < 3 * 3600e3)) acts.push(`<button class="pill" data-gact="live">${ic('play')}${g.state === 'pre' ? 'Watch pre-game' : 'Watch live'}</button>`);
  if (g.state !== 'pre') acts.push(`<button class="${acts.length ? 'ghost' : 'pill'}" data-gact="tipoff">${acts.length ? '' : ic('play')}From tip-off</button>`);
  if (hid) acts.push(`<button class="ghost" data-gact="reveal">${ic('eyeOff')}Reveal</button>`);
  let body = '';
  if (g.state === 'pre') body = `<div class="note">${esc(tipsIn(g.date))}${ch ? ` · ${esc(ch.name)}` : g.tv?.[0] ? ` · ${esc(g.tv[0])}` : ''}</div>`;
  else if (hid) body = `<div class="cover"><div class="h">${ic('eyeOff')}The box score and plays are hidden</div><p>You haven't seen ${esc(gameName(g))} on this iPhone. Watch it from tip-off and they show once you reach the end, or reveal it now.</p><div class="act"><button class="ghost" data-act="back">Keep it hidden</button><button class="ghost" data-gact="reveal">${ic('eyeOff')}Reveal ${esc(gameName(g))}</button></div></div>`;
  else if (!s) body = '<div class="sk" style="height:300px;margin:16px"></div>';
  else {
    const tabs = `<div class="chips" style="margin-top:16px"><button class="chip${gTab === 'box' ? ' sel' : ''}" data-gtab="box">Box score</button><button class="chip${gTab === 'plays' ? ' sel' : ''}" data-gtab="plays">Plays</button></div>`;
    if (gTab === 'plays') body = `${tabs}<div class="play-l" style="margin-top:8px">${(s.plays || []).slice(0, 60).map((p) => `<div class="${p.scoring ? 'sc' : ''}"><b>${esc(ordinal(p.period))} ${esc(p.clock)}</b><span>${esc(p.text)}${p.scoring ? ` · ${esc(p.away)}–${esc(p.home)}` : ''}</span></div>`).join('')}</div>`;
    else {
      const cols = ['MIN', 'PTS', 'REB', 'AST', 'FG'];
      body = tabs + (s.box || []).map((b) => { const ix = cols.map((l) => b.labels.indexOf(l)); return `<div class="sec-h" style="margin-top:18px">${esc(NBA.team(b.abbr)?.name || b.abbr)}</div><div class="tbl"><table class="box-t"><thead><tr><th>Player</th>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${b.players.filter((p) => !p.dnp).map((p) => `<tr><td>${esc(p.short || p.name)}</td>${ix.map((i) => `<td>${i >= 0 ? esc(p.stats[i] ?? '') : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }).join('');
    }
  }
  return `<div class="ph-top"><button class="ph-back" data-act="back" aria-label="Back">${ic('back')}</button><span class="ellipsis" style="font:var(--ph-title)">${esc(st)}</span></div>
    <div style="display:flex;gap:8px;margin:18px 16px 0">${side(g.away)}<div style="align-self:center;font:italic 800 16px var(--a-font-live);color:var(--a-text-3)">AT</div>${side(g.home)}</div>${sc}
    <div style="display:flex;gap:8px;margin:18px 16px 0;flex-wrap:wrap">${acts.join('')}</div>${body}`;
}
function drawGame() { if (gEl && isShown('game')) { const y = gEl.scrollTop; gEl.innerHTML = gameHtml(); gEl.scrollTop = y; } }
export const gamePage = {
  name: 'game',
  mount(root) {
    gEl = root;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act="back"]');
      if (b) return back();
      const t = e.target.closest('[data-gtab]');
      if (t) { gTab = t.dataset.gtab; drawGame(); return; }
      const a = e.target.closest('[data-gact]');
      if (!a) return;
      const g = gameById(gId);
      if (!g) return;
      if (a.dataset.gact === 'live') { const ch = bestChannel(g); if (ch) tune(ch); else { toast('No channel found for this game yet. Pick it in Live and it will be remembered.', 4500); findFeeds(g); } }
      if (a.dataset.gact === 'tipoff') watchFromTipoff(g);
      if (a.dataset.gact === 'reveal') revealAsk(g, drawGame);
    });
    on('summary', (id) => { if (id === gId) drawGame(); });
    on('nba', drawGame); on('feeds', drawGame);
  },
  enter(root, p) {
    if (gId && gId !== p.id) wantSummary(gId, false);
    gId = p.id; gTab = p.tab || 'box';
    wantSummary(gId, true);
    const g = gameById(gId);
    if (g && g.state !== 'post') findFeeds(g).then(drawGame);
    if (g && g.state !== 'pre') findReplays(g);
    drawGame();
  },
  leave() { if (gId) wantSummary(gId, false); },
};
void nightLabel;
