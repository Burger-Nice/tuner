// The NBA tab (phone SPEC 3.3, 04; the TV's screens/nba.js and nba/*): the section chips, `Games · [crest] team ·
// Standings · Leaders · Team stats · News`, scrolling sideways over one section at a time (the last one remembered while
// the app runs). Games is the TV's hub, stacked: the hero (your team's game with the tip-off slab: `02:00 / TIP-OFF`, the
// clock when live and seen, `Score hidden` under the shield; the catch-up rows), the day chips, the day's games as
// full-width cards (the hero's game isn't repeated). The team section is your team's page (nbateam.js; the picker when
// it's None); the League sections are in nbaleague.js, News in nbanews.js, the game page in nbagame.js. Every score
// goes through games.js; the seen store is this phone's own (SPEC 0.9: it starts empty and over-hides).
import { hm, teamPalette } from '../tv/js/util.js';
import { on, settings, saveSettings } from '../tv/js/state.js';
import { ensure } from '../tv/js/catalog.js';
import { nba, startNba, myGame, favTeam, isMine, show, bestChannel, findFeeds, feedsNow, dayGames, dayLabel, recordFor, hidden, shielded, behindReplay, heldLive, retryScores, gameById, ordinal, liveByClock, setShield, shieldMode } from '../tv/js/games.js';
import { peek, want, failed, fetchedAt } from '../tv/js/league.js';
import { heroRow, findReplays, replaysOf, sourceCaption, nightLabel } from '../tv/js/catchup.js';
import { watchFromTipoff, resumeGame } from '../tv/js/replay.js';
import { playLive } from '../tv/js/player.js';
import { tipsIn, gameName } from '../tv/js/nba/common.js';
import { toast } from '../tv/js/ui.js';
import { avatar, ic, esc, push, go, current, isShown, menu, radio, longPress, crestImg } from './ui.js';
import { gameCard, recText } from './cards.js';
import { ringFor } from './home.js';
import { paint, onReveal, revealIds, downState } from './nbakit.js';
import { teamHtml, teamWant, placeRails, wireTeam, pickerHtml, teamScreen } from './nbateam.js';
import { L, standingsHtml, standingsWant, leadersHtml, leadersWant, leaderList, teamStatsHtml, teamStatsWant } from './nbaleague.js';
import { newsHtml, wantNews, openStory, storyById } from './nbanews.js';
import { openPlayer } from './nbaplayer.js';
import { gamePage } from './nbagame.js';

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
export const revealAsk = (g, then) => revealIds([g.id], then);

// ---------- the sections: Games · [crest] team · Standings · Leaders · Team stats · News (remembered while the app runs) ----------
const SECS = () => [['games', 'Games'], ['team', favTeam() ? NBA.team(favTeam())?.name || favTeam() : 'Teams'], ['standings', 'Standings'], ['leaders', 'Leaders'], ['teamstats', 'Team stats'], ['news', 'News']];
const META = { team: () => `schedule:${favTeam()}`, standings: () => 'standings', leaders: () => `leaders:${L.lcat}`, teamstats: () => 'teamStats', news: () => 'news' };
function top() {
  const key = META[sec]?.(), at = key ? fetchedAt(key) : nba.at;
  const meta = shieldMode() !== 'off' ? `${ic('eyeOff')}${shieldMode() === 'all' ? 'All games' : 'My team'}` : at ? `ESPN · ${hm(at)}` : (key ? failed(key) : nba.err) ? 'ESPN' : '';
  return `<div class="ph-top"><h1>NBA</h1><span class="sp"></span><span class="clk nb-meta">${meta}</span>${avatar()}</div>
    <div class="chips nb-secs" data-x="secs" style="margin-top:12px">${SECS().map(([k, l]) => `<button class="chip${k === sec ? ' sel' : ''}${k === 'team' && favTeam() ? ' ico' : ''}" data-sec="${k}">${k === 'team' && favTeam() ? `<span class="cr"><img src="${esc(NBA.logoFor(favTeam()))}" alt=""></span>` : ''}${esc(l)}</button>`).join('')}</div>`;
}
function gamesHtml() {
  const mine = offset === 0 ? heroGame() : null;
  if (mine && mine.state !== 'pre' && !replaysOf(mine)) findReplays(mine);
  const rest = games.filter((g) => g.id !== mine?.id);
  const d = (o) => dayLabel(o).split(' · ').pop();
  const count = loading ? 'Loading…' : rest.length ? `${rest.length} game${rest.length === 1 ? '' : 's'}${mine ? ' · yours above' : ''}` : '';
  const days = `<div class="nb-days nbz"><button class="chip" data-day="-1">${ic('chevL')}${esc(dayLabel(offset - 1).split(' · ').pop().split(' ')[0])}</button><button class="chip sel">${esc(offset === 0 ? `Today · ${d(0).replace(/^\w+ /, '')}` : dayLabel(offset))}</button><button class="chip" data-day="1">${esc(dayLabel(offset + 1).split(' · ').pop().split(' ')[0])}${ic('chevR')}</button><span class="cap">${esc(count)}</span></div>`;
  const body = err && !games.length ? downState()
    : loading && !games.length ? Array.from({ length: 4 }, () => '<div class="sk" style="height:96px;border-radius:14px"></div>').join('')
    : !rest.length ? `<div class="note">${mine ? 'No other games' : `No games ${offset ? 'that day' : 'today'}`}</div>`
    : rest.map((g) => gameCard(g)).join('');
  return `${mine ? heroHtml(mine) : !favTeam() ? '<div class="state"><b>Pick your team</b><p>Its next game leads here, and the spoiler shield follows it.</p><button class="ghost" data-sec="team">Teams</button></div>' : ''}${days}<div class="nb-grid">${body}</div>`;
}
const teamSt = new Map();   // your team -> its page's state (sort, the schedule placed)
const stOf = (a) => { if (!teamSt.has(a)) teamSt.set(a, { sort: 'pts', placed: false }); return teamSt.get(a); };
function teamSecHtml() {
  const t = favTeam();
  if (!t) return `<div class="note" style="margin-top:16px">No team picked · tap a team for its page, or make one yours in Account › NBA</div><div class="tp-pks">${pickerHtml()}</div>`;
  return teamHtml(t, stOf(t));
}
const BODY = { games: gamesHtml, team: teamSecHtml, standings: standingsHtml, leaders: leadersHtml, teamstats: teamStatsHtml, news: newsHtml };
const WANT = { team: () => favTeam() && teamWant(favTeam()), standings: standingsWant, leaders: leadersWant, teamstats: teamStatsWant, news: wantNews };
function draw() {
  if (!el) return;
  paint(el, top() + `<div class="nb-body" data-sec-body="${sec}">${(BODY[sec] || gamesHtml)()}</div>`);
  if (sec === 'team' && favTeam()) placeRails(el, favTeam(), stOf(favTeam()));
  if (sec === 'teamstats' && L.centre) {
    const r = el.querySelector(`.ts-row[data-team="${favTeam()}"]`);
    if (r) { L.centre = false; el.scrollTop = Math.max(0, r.offsetTop - el.clientHeight / 2); }
  }
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
function select(k, params) {
  sec = k;
  if (params?.cat && k === 'leaders') L.lcat = params.cat;
  if (params?.cat && k === 'teamstats') L.tcat = params.cat;
  if (k === 'teamstats') L.centre = true;
  WANT[sec]?.();
  if (el) el.scrollTop = 0;
  draw();
  requestAnimationFrame(() => el?.querySelector('.nb-secs .chip.sel')?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' }));
}
// A section from elsewhere (the player sheet's "1st in the NBA in points", Season ranks' tiles): the NBA tab on it.
export function openSection(k, params) {
  if (current() !== 'nba') go('nba');
  select(k, params);
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
    onReveal(root, draw);
    wireTeam(root, () => (sec === 'team' ? favTeam() : ''), () => stOf(favTeam()), draw);
    root.addEventListener('click', (e) => {
      const s = e.target.closest('[data-sec]');
      if (s) { select(s.dataset.sec); return; }
      const d = e.target.closest('[data-day]');
      if (d) { load(offset + +d.dataset.day); return; }
      const c = e.target.closest('[data-conf]');
      if (c) { L.conf = c.dataset.conf; draw(); return; }
      const lc = e.target.closest('[data-lcat]');
      if (lc) { L.lcat = lc.dataset.lcat; leadersWant(); draw(); return; }
      const tc = e.target.closest('[data-tcat]');
      if (tc) { L.tcat = tc.dataset.tcat; L.centre = true; draw(); return; }
      const pk = e.target.closest('[data-pick]');
      if (pk) { push('team', { abbr: pk.dataset.pick }); return; }
      const tr = e.target.closest('[data-team]');
      if (tr) { push('team', { abbr: tr.dataset.team }); return; }
      const lp = e.target.closest('[data-lp]');
      if (lp) { const p = leaderList.find((x) => x.id === lp.dataset.lp); if (p) openPlayer(p, { from: 'leaders' }); return; }
      const st = e.target.closest('.nw-row[data-story],.nw-lead[data-story]');
      if (st) { openStory(storyById(st.dataset.story)); return; }
      const h = e.target.closest('[data-hero]');
      if (h) { const g = gameById(h.closest('[data-g]').dataset.g) || heroGame(); if (g) heroAct(h.dataset.hero, g); return; }
      const b = e.target.closest('[data-act]');
      if (b) {
        if (b.dataset.act === 'account') return push('account');
        if (b.dataset.act === 'retry') { if (sec === 'games') { if (offset) load(offset, { force: true }); else retryScores(); } else { const k = META[sec]?.(); if (k) want(k, { force: true }); if (sec === 'team' && favTeam()) teamWant(favTeam(), { force: true }); } return; }
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
        { label: `${g.away.name} page`, lead: crestImg(team(g.away), 28), run: () => push('team', { abbr: g.away.abbr }) },
        { label: `${g.home.name} page`, lead: crestImg(team(g.home), 28), run: () => push('team', { abbr: g.home.abbr }) },
        { label: 'Open the game', icon: 'chevR', run: () => push('game', { id: g.id }) },
        hidden(g) ? { label: `Reveal ${gameName(g)}`, icon: 'eyeOff', run: () => revealIds([g.id], draw) } : null,
      ]);
    });
    longPress(root, '[data-lp]', (n) => { const p = leaderList.find((x) => x.id === n.dataset.lp); if (p) menu(p.name, [{ label: `${NBA.team(p.abbr)?.name || p.abbr} page`, lead: crestImg(team({ abbr: p.abbr }), 28), run: () => push('team', { abbr: p.abbr }) }, { label: 'Player card', icon: 'user', run: () => openPlayer(p, { from: 'leaders' }) }]); });
    const redraw = () => { if (!isShown('nba')) return; if (!offset) { games = nba.today; loading = false; err = nba.err; } soon(); };
    on('nba', redraw); on('summary', redraw); on('feeds', redraw); on('replays', redraw); on('progress', redraw); on('league', redraw);
    // every minute: what the section shows is asked for again when it's older than its age (or the last try failed)
    setInterval(() => { if (isShown('nba') && sec !== 'games') { WANT[sec]?.(); soon(); } }, 60000);
  },
  enter() {
    startNba();
    ensure('live').catch(() => {});
    if (favTeam()) want(`schedule:${favTeam()}`);
    WANT[sec]?.();
    if (offset === 0) { games = nba.today; loading = !nba.today.length && !nba.err; err = nba.err; draw(); const m = heroGame(); if (m && (m.state === 'in' || (m.state === 'pre' && m.date - Date.now() < 3 * 3600e3))) findFeeds(m).then(soon); }
    else load(offset);
  },
  toTop() { if (sec !== 'games') select('games'); },
};
export { gamePage, teamScreen };
void nightLabel;
