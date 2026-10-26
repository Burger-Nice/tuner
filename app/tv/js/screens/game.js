// An NBA game: compact header (status, team plates, score, Watch live), tabs for each team's box score, the plays and
// team stats. Tables are upright (only the plates slant). Under the shield the body is a Reveal card, never a score.
import { esc, ic, dot, liveP, crest, teamVars, setHtml } from '../util.js';
import { on } from '../state.js';
import { catalog } from '../catalog.js';
import { gameById, show, clockText, ordinal, wantSummary, reveal, isMine, mySide, teamChannel, feedsNow, findFeeds, favTeam } from '../games.js';
import { playLive, watching } from '../player.js';
import { current } from '../router.js';
import { focus } from '../focus.js';
import { toast } from '../ui.js';
import { ringFor, ringName } from './home.js';

let el, id = null, tab = 'away', scroll = 0;
const STATS = [['fieldGoalPct', 'Field goal %'], ['threePointFieldGoalPct', '3-point %'], ['freeThrowPct', 'Free throw %'], ['totalRebounds', 'Rebounds'], ['assists', 'Assists'], ['totalTurnovers', 'Turnovers'], ['steals', 'Steals'], ['blocks', 'Blocks'], ['pointsInPaint', 'Points in the paint'], ['fastBreakPoints', 'Fast-break points'], ['largestLead', 'Largest lead']];
const COLS = ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', '+/-'];

function table(s, abbr) {
  const team = s?.box.find((b) => b.abbr === abbr);
  if (!team || !team.players.length) return '<div class="t-body" style="padding:24px 0">The box score appears at tip-off.</div>';
  const idx = COLS.map((c) => team.labels.indexOf(c));
  const played = team.players.filter((p) => !p.dnp);
  const rows = played.map((p) => `<tr class="${p.starter ? 'st' : ''}"><td>${esc(p.short || p.name)}<span class="pos">${esc(p.pos)}</span></td>${idx.map((i, k) => `<td${COLS[k] === 'PTS' ? ' class="b"' : ''}>${i >= 0 ? esc(p.stats[i] ?? '') : ''}</td>`).join('')}</tr>`).join('');
  const tot = team.totals.length ? `<tr class="tot"><td>Team</td>${idx.map((i, k) => `<td${COLS[k] === 'PTS' ? ' class="b"' : ''}>${i >= 0 ? esc(team.totals[i] ?? '') : ''}</td>`).join('')}</tr>` : '';
  return `<table class="box"><thead><tr><th>Player</th>${COLS.map((c) => `<th>${c === '3PT' ? '3P' : c}</th>`).join('')}</tr></thead><tbody>${rows}${tot}</tbody></table>`;
}
function plays(s, g) {
  if (!s?.plays.length) return '<div class="t-body" style="padding:24px 0">No plays yet.</div>';
  return `<div class="plays">${s.plays.slice(0, 40).map((p) => `<div class="play"><span class="clk">${esc(ordinal(p.period))} ${esc(p.clock)}</span><span class="tm">${esc(p.team)}</span><span class="tx${p.scoring ? ' sc' : ''}">${p.scoring ? '<i></i>' : ''}${esc(p.text)}</span><span class="sco">${p.scoring ? `${esc(p.away)}–${esc(p.home)}` : ''}</span></div>`).join('')}</div>`;
}
function teamStats(s, g) {
  const a = s?.teams.find((t) => t.abbr === g.away.abbr)?.stats, h = s?.teams.find((t) => t.abbr === g.home.abbr)?.stats;
  if (!a || !h) return '<div class="t-body" style="padding:24px 0">Team stats appear at tip-off.</div>';
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
  const status = g.state === 'in' ? `${liveP()}<span class="t-label t-2">${esc(clockText(g))}</span>${!v.hidden && v.delayed != null ? `<span class="synced">${ic('clock')}${v.synced != null ? `Synced · ${v.synced} s behind live` : `Delayed ${v.delayed} s (default)`}</span>` : ''}` : `<span class="t-label t-2">${g.state === 'pre' ? `Tip-off ${new Date(g.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}` : v.hidden ? 'Ended' : 'Final'}</span>`;
  const watch = g.state !== 'post' ? `<span class="btn fx" tabindex="-1" data-act="watch">${ic('play')}Watch live</span>` : '';
  const tabs = [['away', g.away.name], ['home', g.home.name], ...(v.hidden ? [] : [['plays', 'Plays']]), ['team', 'Team stats']];
  if (!tabs.some(([k]) => k === tab)) tab = 'away';
  let body;
  if (v.hidden) body = `<div class="state" style="margin:28px auto 0;width:520px"><div class="ico">${ic('eyeOff')}</div><b>Box score is hidden</b><p>The spoiler shield covers this game. Reveal it for this game, this session.</p><span class="btn fx" tabindex="-1" data-act="reveal">Reveal score</span></div>`;
  else if (tab === 'plays') body = plays(s, g);
  else if (tab === 'team') body = teamStats(s, g);
  else body = table(s, tab === 'home' ? g.home.abbr : g.away.abbr);
  setHtml(el, `<div class="gd-head">
      <div class="abs row-flex" style="left:20px;top:8px;gap:10px;height:24px">${status}</div>
      <div class="mt">${side(g.away)}<div class="sc">${mid}</div>${side(g.home, 1)}</div>
      <div class="abs row-flex" data-row style="right:20px;top:26px;gap:10px">${watch}</div>
    </div>
    <div class="gd-tabs" data-row>${tabs.map(([k, l]) => `<span class="chip lg fx${k === tab && !v.hidden ? ' sel' : ''}" tabindex="-1" data-tab-g="${k}">${esc(l)}</span>`).join('')}<span class="t-cap" style="margin-left:auto">${v.hidden ? '' : '▶ ◀ change tab · ▼ scroll'}</span></div>
    <div class="gd-body" style="bottom:27px;overflow:hidden"><div class="inner" style="transform:translateY(${-scroll}px)" ${v.hidden ? 'data-row' : ''}>${body}</div></div>`);
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
      if (b.dataset.act === 'reveal') { reveal(id); draw(); focus(el.querySelector('[data-tab-g]')); }
      if (b.dataset.act === 'watch') {
        const g = gameById(id);
        const pick = isMine(g) && teamChannel(mySide(g).abbr);
        const ch = (pick && catalog.live?.byId.get(pick)) || feedsNow(g)[0]?.ch;
        if (!ch) { findFeeds(g).then((f) => { if (f[0]) playLive(f[0].ch, ringFor(f[0].ch), ringName(f[0].ch)); else toast('No channel found for this game. Pick it in the guide.', 5000); }); return; }
        playLive(ch, ringFor(ch), ringName(ch));
      }
    });
    // Moving along the tabs switches them; Down scrolls the table.
    root.addEventListener('tvfocus', (e) => { const t = e.target.dataset.tabG; if (t && t !== tab) { tab = t; scroll = 0; draw(); } });
    const redraw = (gid) => { if (current() === 'game' && (gid == null || gid === id)) draw(); };
    on('summary', redraw); on('nba', () => redraw());
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
    }
    draw();
  },
  leave() { if (id) wantSummary(id, false); },
  entry: (root) => root.querySelector('[data-act="reveal"]') || root.querySelector(`[data-tab-g="${tab}"]`),
  key(k) {
    const a = document.activeElement;
    if (!a?.dataset?.tabG) return false;
    const inner = el.querySelector('.gd-body .inner');
    if (!inner) return false;
    const max = Math.max(0, inner.scrollHeight - (513 - 220));
    if (k === 'down') { if (scroll >= max) return true; scroll = Math.min(max, scroll + 120); inner.style.transform = `translateY(${-scroll}px)`; return true; }
    if (k === 'up' && scroll > 0) { scroll = Math.max(0, scroll - 120); inner.style.transform = `translateY(${-scroll}px)`; return true; }
    return false;
  },
};
