// An NBA game: compact header (status, team plates, score, Watch live), tabs for each team's box score, the plays and
// team stats. Tables are upright (only the plates slant). Under the shield the body is a Reveal card, never a score.
import { esc, ic, dot, liveP, crest, teamVars, setHtml, hm } from '../util.js';
import { on } from '../state.js';
import { catalog } from '../catalog.js';
import { nba, bestChannel, gameById, show, clockText, ordinal, wantSummary, reveal, isMine, mySide, teamChannel, feedsNow, findFeeds, favTeam } from '../games.js';
import { playLive, watching } from '../player.js';
import { current, push } from '../router.js';
import { focus } from '../focus.js';
import { toast, contextMenu } from '../ui.js';
import { ringFor, ringName } from './home.js';
import { findReplays, replaysOf, replaysLooked, replaysBusy, keptUntil, nightLabel } from '../catchup.js';
import { watchFromTipoff, resumeGame, backToLive, sourcesSheet, chooseVideo, lookAgain } from '../replay.js';
import { behindReplay, shielded, replayPick, liveByClock, replayProgress } from '../games.js';

let el, id = null, tab = 'away', scroll = 0;
const STATS = [['fieldGoalPct', 'Field goal %'], ['threePointFieldGoalPct', '3-point %'], ['freeThrowPct', 'Free throw %'], ['totalRebounds', 'Rebounds'], ['assists', 'Assists'], ['totalTurnovers', 'Turnovers'], ['steals', 'Steals'], ['blocks', 'Blocks'], ['pointsInPaint', 'Points in the paint'], ['fastBreakPoints', 'Fast-break points'], ['largestLead', 'Largest lead']];
const COLS = ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', '+/-'];

// Empty states that say what's actually going on: before tip-off, still loading, or ESPN has nothing for it.
const none = (g, s, what) => `<div class="t-body" style="padding:24px 0">${g.state === 'pre' ? `${what} ${what === 'Box score' ? 'appears' : 'appear'} at tip-off.` : !s && nba.sumFail.has(g.id) ? `ESPN didn't send the ${what.toLowerCase()} for this game. Trying again.` : !s ? `Loading the ${what.toLowerCase()}…` : g.state === 'in' ? `ESPN hasn't sent the ${what.toLowerCase()} yet. It fills in as the game goes.` : `No ${what.toLowerCase()} from ESPN for this game.`}</div>`;
function table(s, abbr, g) {
  const team = s?.box.find((b) => b.abbr === abbr);
  if (!team || !team.players.length) return none(g, s, 'Box score');
  const idx = COLS.map((c) => team.labels.indexOf(c));
  const played = team.players.filter((p) => !p.dnp);
  const rows = played.map((p) => `<tr class="${p.starter ? 'st' : ''}"><td>${esc(p.short || p.name)}<span class="pos">${esc(p.pos)}</span></td>${idx.map((i, k) => `<td${COLS[k] === 'PTS' ? ' class="b"' : ''}>${i >= 0 ? esc(p.stats[i] ?? '') : ''}</td>`).join('')}</tr>`).join('');
  const tot = team.totals.length ? `<tr class="tot"><td>Team</td>${idx.map((i, k) => `<td${COLS[k] === 'PTS' ? ' class="b"' : ''}>${i >= 0 ? esc(team.totals[i] ?? '') : ''}</td>`).join('')}</tr>` : '';
  const side = g.home.abbr === abbr ? g.home : g.away;
  return `<table class="box"><thead><tr><th>Player</th>${COLS.map((c) => `<th>${c === '3PT' ? '3P' : c}</th>`).join('')}</tr></thead><tbody>${rows}${tot}</tbody></table>${teamRow(side)}`;
}
// Under the box score's Team totals: that team's page (SPEC 1; OK on a tab never navigates).
const teamRow = (t) => `<div data-row style="padding:14px 0 6px 6px"><span class="pillbtn fx gd-tp" tabindex="-1" data-act="teampage" data-abbr="${esc(t.abbr)}">${crest(t, 's24')}${esc(t.full || t.name)} page ›</span></div>`;
function plays(s, g) {
  if (!s?.plays.length) return '<div class="t-body" style="padding:24px 0">No plays yet.</div>';
  return `<div class="plays">${s.plays.slice(0, 40).map((p) => `<div class="play"><span class="clk">${esc(ordinal(p.period))} ${esc(p.clock)}</span><span class="tm">${esc(p.team)}</span><span class="tx${p.scoring ? ' sc' : ''}">${p.scoring ? '<i></i>' : ''}${esc(p.text)}</span><span class="sco">${p.scoring ? `${esc(p.away)}–${esc(p.home)}` : ''}</span></div>`).join('')}</div>`;
}
function teamStats(s, g) {
  const a = s?.teams.find((t) => t.abbr === g.away.abbr)?.stats, h = s?.teams.find((t) => t.abbr === g.home.abbr)?.stats;
  if (!a || !h) return none(g, s, 'Team stats');
  const mineAway = g.away.abbr === favTeam();
  return `<div class="tstats">${STATS.filter(([k]) => a[k] != null).map(([k, n]) => {
    const av = parseFloat(a[k]) || 0, hv = parseFloat(h[k]) || 0, sum = av + hv || 1;
    return `<div class="ts"><span class="v l">${esc(a[k])}</span><div class="bars"><div class="bar ${mineAway ? 'l' : 'r'}" style="width:${(av / sum) * 100}%"></div><div class="bar ${mineAway ? 'r' : 'l'}" style="width:${(hv / sum) * 100}%"></div></div><span class="v">${esc(h[k])}</span><span class="n">${n}</span></div>`;
  }).join('')}</div>`;
}

let behind = false;
on('player-closed', () => { if (behind) { behind = false; draw(); } });
function draw() {
  if (watching()) { behind = true; return; }   // nothing to see under the TV player; drawn once it closes
  if (!el || el.hidden || !id) return;
  const g0 = gameById(id);
  if (!g0) { setHtml(el, '<div class="center-col" style="top:200px"><div class="state big"><b>This game is no longer listed</b></div></div>'); return; }
  const v = show(g0), g = v.g, s = v.s;
  const side = (t, right) => `<div class="side${right ? ' r' : ''}" style="${teamVars(t)}">${right ? '' : crest(t, 'md')}<div class="nm">${esc(t.name)}</div>${right ? crest(t, 'md') : ''}</div>`;
  const mid = v.hidden ? `<span class="shield">${ic('eyeOff')}<span>Score hidden</span></span>` : g.state === 'pre' ? '<span class="score md">VS</span>' : `<span class="score md">${esc(g.away.score)}</span><span class="t-3" style="font:700 20px var(--a-font-display)">–</span><span class="score md">${esc(g.home.score)}</span>`;
  const night = nightLabel(g0.date);
  const status = behindReplay(g0) && shielded(g0) && g.state !== 'pre' ? `${liveByClock(g0) ? liveP() : ''}<span class="t-label t-2">You're in ${esc(replayProgress(g0.id)?.item?.pos?.chapter || 'the replay')}</span>`   // (7.2: never the live clock)
    : g.state === 'in' ? `${liveP()}<span class="t-label t-2">${esc(clockText(g))}</span>${!v.hidden && v.delayed != null ? `<span class="synced">${ic('clock')}${v.synced != null ? `Synced · ${v.synced} s behind live` : `Delayed ${v.delayed} s (default)`}</span>` : ''}` : `<span class="t-label t-2">${g.state === 'pre' ? `Tip-off ${new Date(g.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}` : `${v.hidden ? 'Ended' : 'Final'}${dot}${esc(night)}`}</span>`;
  // catch-up (5.5): the tab row's watch buttons, and the shield cards
  const reps = replaysOf(g0), best = reps?.[0] || null, behind = behindReplay(g0);
  const until = best?.kind === 'channel' ? keptUntil(best.windowStart, best.days) : '';
  let watch = g.state !== 'post' ? `<span class="btn fx" tabindex="-1" data-act="watch">${ic('play')}Watch live</span>` : '';
  // (Back to live while the game could still be on, by the clock; after tip-off + 3 h 30: From tip-off, N5)
  if (behind && g.state !== 'pre') watch = `<span class="btn fx" tabindex="-1" data-act="resume" data-hold>${ic('play')}Resume</span>${liveByClock(g0) ? '<span class="btn2 fx" tabindex="-1" data-act="golive">Back to live</span>' : `<span class="btn2 fx" tabindex="-1" data-act="tipoff">${ic('tipoff')}From tip-off</span>`}`;
  else if (g.state === 'in' && best) watch += `<span class="btn2 fx" tabindex="-1" data-act="tipoff" data-hold>${ic('tipoff')}From tip-off</span>`;
  else if (g.state === 'post' && !v.hidden && best) watch = `${until ? `<span class="t-cap" style="margin-left:auto">Replays until ${esc(until)}</span>` : ''}<span class="btn fx" tabindex="-1" data-act="again" data-hold>${ic('play')}Watch again</span>`;
  const tabs = [['away', g.away.name], ['home', g.home.name], ...(v.hidden ? [] : [['plays', 'Plays']]), ['team', 'Team stats']];
  if (!tabs.some(([k]) => k === tab)) tab = 'away';
  let body;
  const name = `${esc(g.away.name)} at ${esc(g.home.name)}`;
  const card = (title, text, btns, cap) => `<div class="state big cu-state" style="margin:28px auto 0"><div class="ico">${ic('eyeOff')}</div><b>${title}</b><p>${text}</p><div class="row-flex" data-row>${btns}</div>${cap ? `<div class="t-cap">${cap}</div>` : ''}</div>`;
  const revealB = `<span class="btn2 fx" tabindex="-1" data-act="reveal">Reveal ${name}</span>`;
  if (v.hidden && behind) body = card(`${name} is hidden`, 'You’re behind in its replay: it counts as seen at the replay’s final buzzer.', `<span class="btn fx" tabindex="-1" data-act="resume" data-hold>${ic('play')}Resume</span>${revealB}`, '');
  else if (v.hidden && g.state === 'post' && best) {
    const pick = replayPick(g0.id);
    const what = best.kind === 'channel' ? `${esc(best.name)}${dot}replays until ${esc(until)}` : `${esc(best.name)}${pick?.kind === 'video' ? '' : `${dot}${esc(best.detail)}`}`;
    body = card(`${name} is hidden`, 'Watch it from tip-off: it counts as seen at the replay’s final buzzer.', `<span class="btn fx" tabindex="-1" data-act="tipoff" data-hold>${ic('play')}Watch from tip-off</span>${revealB}`, `${what}${dot}hold OK: other sources`);
  } else if (v.hidden && g.state === 'post' && reps) {
    const lk = replaysLooked(g0), day = new Date(g0.date + 3 * 864e5 - 6 * 3600e3).toLocaleDateString('en-GB', { weekday: 'short' });
    const still = Date.now() < g0.date + 3 * 864e5;
    body = card('No replay of this game yet', `Full games often reach Movies a few hours after the final. ${still ? `airglow looks every hour until ${day}.` : 'Look again when one may have arrived.'}`,
      `<span class="btn fx" tabindex="-1" data-act="look">${ic('refresh')}${replaysBusy(g0) ? 'Looking…' : 'Look again'}</span><span class="btn2 fx" tabindex="-1" data-act="choose">${ic('search')}Choose a video</span>${revealB}`,
      lk ? `Looked at ${hm(lk.at)} in ${lk.tables} channel archive${lk.tables === 1 ? '' : 's'} and ${lk.videos} NBA video${lk.videos === 1 ? '' : 's'}` : '');
  } else if (v.hidden && g.state === 'post') body = card(`${name} is hidden`, 'Looking for a replay of it…', revealB, '');
  else if (v.hidden) body = `<div class="state" style="margin:28px auto 0;width:520px"><div class="ico">${ic('eyeOff')}</div><b>Box score is hidden</b><p>The spoiler shield covers this game. Revealing it shows its score everywhere, from now on.</p><span class="btn fx" tabindex="-1" data-act="reveal">Reveal ${esc(g.away.name)} at ${esc(g.home.name)}</span></div>`;
  else if (tab === 'plays') body = plays(s, g);
  else if (tab === 'team') body = teamStats(s, g);
  else body = table(s, tab === 'home' ? g.home.abbr : g.away.abbr, g);
  setHtml(el, `<div class="gd-head">
      <div class="abs row-flex" style="left:20px;top:8px;gap:10px;height:24px">${status}</div>
      <div class="mt">${side(g.away)}<div class="sc">${mid}</div>${side(g.home, 1)}</div>
    </div>
    <div class="gd-tabs" data-row>${tabs.map(([k, l]) => `<span class="chip lg fx${k === tab && !v.hidden ? ' sel' : ''}" tabindex="-1" data-tab-g="${k}"${k === 'away' || k === 'home' ? ' data-hold' : ''}>${esc(l)}</span>`).join('')}<span class="t-cap" style="margin-left:auto">${v.hidden ? '' : '▼ scroll'}</span>${watch.replace(/class="btn fx"/g, 'class="btn sm fx" style="transform-origin:100% 50%"').replace(/class="btn2 fx"/g, 'class="btn2 sm fx"')}</div>
    <div class="gd-body" style="bottom:27px;overflow:hidden"><div class="inner" style="transform:translateY(${-scroll}px);--sy:${scroll}px" ${v.hidden ? 'data-row' : ''}>${body}</div></div>`);
}

export default {
  name: 'game',
  mount(root) {
    el = root;
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab-g]');
      if (t) { tab = t.dataset.tabG; scroll = 0; draw(); focus(el.querySelector(`[data-tab-g="${tab}"]`)); return; }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'teampage') { push('team', { abbr: b.dataset.abbr }); return; }
      if (b.dataset.act === 'reveal') { reveal(id); draw(); focus(el.querySelector('[data-tab-g]')); }
      const gg = gameById(id);
      if (b.dataset.act === 'tipoff' || b.dataset.act === 'again') return watchFromTipoff(gg);
      if (b.dataset.act === 'resume') return resumeGame(gg);
      if (b.dataset.act === 'golive') return backToLive(gg);
      if (b.dataset.act === 'choose') return chooseVideo(gg);
      if (b.dataset.act === 'look') { lookAgain(gg).then(() => { if (current() === 'game') { draw(); focus(el.querySelector('.cu-state .btn') || el.querySelector('[data-tab-g]')); } }); draw(); return; }
      if (b.dataset.act === 'watch') {
        const g = gameById(id);
        const ch = bestChannel(g);   // the best-quality channel that carries it
        if (!ch) { findFeeds(g).then((f) => { if (f[0]) playLive(f[0].ch, ringFor(f[0].ch), ringName(f[0].ch)); else toast('No channel found for this game. Pick it in the guide.', 5000); }); return; }
        playLive(ch, ringFor(ch), ringName(ch));
      }
    });
    // Hold OK on a team's tab: its page (the tab itself only switches the box score).
    root.addEventListener('tvhold', (e) => {
      const hb = e.target.closest('[data-act="tipoff"],[data-act="again"],[data-act="resume"]');
      if (hb) return sourcesSheet(gameById(id));
      const t = e.target.closest('[data-tab-g]'), g = gameById(id);
      if (!t || !g || (t.dataset.tabG !== 'away' && t.dataset.tabG !== 'home')) return;
      const side = g[t.dataset.tabG];
      contextMenu(t, [{ icon: 'chevR', label: `${side.name} page`, run: () => push('team', { abbr: side.abbr }) }]);
    });
    // Moving along the tabs switches them; Down scrolls the table.
    root.addEventListener('tvfocus', (e) => { const t = e.target.dataset.tabG; if (t && t !== tab) { tab = t; scroll = 0; draw(); } });
    const redraw = (gid) => { if (current() === 'game' && (gid == null || gid === id)) draw(); };
    on('summary', redraw); on('nba', () => redraw()); on('replays', (gid) => redraw(gid)); on('progress', () => redraw());
    setInterval(() => { if (current() === 'game') draw(); }, 1000);
  },
  enter(root, params, { fresh }) {
    if (params.id && (fresh || params.id !== id)) {
      if (id) wantSummary(id, false);
      id = params.id; scroll = 0;
      const g = gameById(id);
      tab = params.tab || (g && g.home.abbr === favTeam() ? 'home' : 'away');
      wantSummary(id, true);
      if (g) findFeeds(g);
      if (g && g.state !== 'pre') findReplays(g);   // (its replays: looked up when its page opens, 5.3)
    }
    draw();
  },
  leave() { if (id) wantSummary(id, false); },
  // (never the Reveal button: a second OK while the page opens would reveal the game for good)
  // the shield card's first button (Watch from tip-off, Resume, Look again; catch-up 5.5's fix), else the tabs
  entry: (root) => root.querySelector('.cu-state .btn') || root.querySelector(`[data-tab-g="${tab}"]`) || root.querySelector('[data-tab-g]'),
  key(k) {
    const a = document.activeElement;
    const inner = el.querySelector('.gd-body .inner');
    if (a?.classList.contains('gd-tp')) {   // the team-page row under the table: Up goes back to the tabs
      if (k === 'up') { focus(el.querySelector(`[data-tab-g="${tab}"]`)); return true; }
      return k === 'down';
    }
    if (!a?.dataset?.tabG) return false;
    if (!inner) return false;
    if (inner.querySelector('.fx:not(.gd-tp)')) return false;   // something to focus below (Reveal score): ▼ goes there
    const max = Math.max(0, inner.scrollHeight - (513 - 220));
    const to = (y) => { scroll = y; inner.style.transform = `translateY(${-scroll}px)`; inner.style.setProperty('--sy', `${scroll}px`); };
    const row = inner.querySelector('.gd-tp');
    if (k === 'down') { if (scroll < max) to(Math.min(max, scroll + 120)); else if (row) focus(row); return true; }
    if (k === 'up' && scroll > 0) { to(Math.max(0, scroll - 120)); return true; }
    return false;
  },
};
