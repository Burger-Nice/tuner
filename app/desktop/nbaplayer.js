// The player sheet (nba-pages/SPEC.md 7.6, phone SPEC 3.3: a medium sheet over Leaders or a team's roster): the team's
// band with his headshot and number, his season averages, his last games, college and home town, an injury if any, and
// one button: from the roster `☆ 1st in the NBA in points` (only in a top 10), from Leaders `<Team> page`.
// Under the shield (his team played a game you haven't seen): MIN, REB and AST only, counted over the games you have
// seen; his last games are the ones you have seen; no leaders button. As the TV's nba/player.js.
import { esc, ic, sheet, push } from './ui.js';
import { on } from '../tv/js/state.js';
import { teamVars } from '../tv/js/util.js';
import { unseenFor, hidden, shielded, behindReplay } from '../tv/js/games.js';
import { peek, want, fetchedAt } from '../tv/js/league.js';
import { names, gameName, sideOf } from '../tv/js/nba/common.js';
import { bestRank, seasonOf, ordinalOf, posName } from '../tv/js/nba/player.js';
import { crest, dayDate, paint } from './nbakit.js';

const { NBA } = window;
const num = (v) => (v == null || v === '' || Number.isNaN(+v) ? '–' : (+v).toFixed(1));
const injuryText = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');

// Box scores read for the sheet (unseen games: only to take them out of his averages, never shown; seen games: his line).
const boxes = new Map();   // game id -> summary | null (failed); missing: being read
let onBox = null;
function boxOf(id) {
  if (boxes.size > 40) boxes.clear();
  if (!boxes.has(id)) { boxes.set(id, undefined); NBA.summary(id).then((s) => boxes.set(id, s), () => boxes.set(id, null)).finally(() => onBox?.()); }
  return boxes.get(id);
}
const lineOf = (s, p) => {
  const team = s?.box?.find((b) => b.abbr === p.abbr), row = team?.players.find((x) => x.name === p.name);
  if (!row) return null;
  if (row.dnp) return { dnp: true, reason: row.reason };
  const v = (k) => row.stats[team.labels.indexOf(k)] ?? '';
  return { min: v('MIN'), pts: v('PTS'), reb: v('REB'), ast: v('AST'), fg: v('FG') };
};
// MIN, REB and AST over the games you've seen: the season's less the unseen games he played in. null while reading.
function seenAverages(p, unseen) {
  let gp = p.gp || 0, min = (p.min || 0) * gp, reb = (p.reb || 0) * gp, ast = (p.ast || 0) * gp, exact = true;
  const at = fetchedAt(`players:${p.abbr}`) || Date.now();
  for (const g of unseen) {
    // only a final that ended before his averages were read is in them (ESPN adds a game ~3 h after tip-off)
    if (g.state !== 'post' || g.date + 3 * 3600e3 > at) continue;
    const s = boxOf(g.id);
    if (s === undefined) return null;
    if (s === null) { exact = false; continue; }
    const l = lineOf(s, p);
    if (!l || l.dnp) continue;
    gp--; min -= parseFloat(l.min) || 0; reb -= parseFloat(l.reb) || 0; ast -= parseFloat(l.ast) || 0;
  }
  if (!exact) return { gp: p.gp, min: p.min, reb: p.reb, ast: p.ast, approx: true };
  return gp > 0 ? { gp, min: min / gp, reb: reb / gp, ast: ast / gp } : { gp: 0 };
}
// His team's last finals you have seen (newest first, up to 5), with his line from each box score.
const seenGame = (g) => !hidden(g) && !(shielded(g) && behindReplay(g));
function lastHtml(p) {
  const d = peek(`schedule:${p.abbr}`)?.data;
  if (!d) return '<div class="note" style="margin:6px 0 0">Loading his games…</div>';
  const games = d.games.filter((g) => g.state === 'post' && g.final !== false && seenGame(g)).slice(-5).reverse();
  if (!games.length) return `<div class="note" style="margin:6px 0 0">${unseenFor(p.abbr).length ? 'No games you’ve seen yet this season' : 'No games yet this season'}</div>`;
  return `<div class="pl-last">${games.map((g) => {
    const s = sideOf(g, p.abbr), b = boxOf(g.id), l = b ? lineOf(b, p) : null;
    const line = b === undefined ? '<span class="t3">…</span>' : !l ? '<span class="t3">No box score</span>' : l.dnp ? `<span class="t3">Didn’t play${l.reason ? ` · ${esc(l.reason.toLowerCase())}` : ''}</span>`
      : `<span><b>${esc(l.pts)}</b> PTS</span><span><b>${esc(l.reb)}</b> REB</span><span><b>${esc(l.ast)}</b> AST</span><span class="t3">${esc(l.min)} MIN</span>`;
    return `<div class="pl-g nbz"><span class="d">${esc(dayDate(g.date))}</span><span class="o nbz">${crest(s.op, 22)}<span class="ellipsis">${s.word} ${esc(s.op.name)}</span></span><span class="r ${s.won ? 'w' : 'l'}">${s.won ? 'W' : 'L'} ${esc(s.me.score)}–${esc(s.op.score)}</span><span class="ln nbz">${line}</span></div>`;
  }).join('')}</div>`;
}

function html(p, r, from) {
  const abbr = p.abbr || r?.abbr, n = names(abbr);
  const unseen = unseenFor(abbr), shield = unseen.length > 0;
  const head = p.headshot || r?.headshot;
  const bits = [posName(r?.pos || p.pos), r?.height, r?.age || p.age ? `${r?.age || p.age} years` : '', r?.exp != null ? `${ordinalOf(r.exp + 1)} season` : ''].filter(Boolean);
  const box = (v, k) => `<div><b>${esc(v)}</b><span>${k}</span></div>`;
  let stats, line = '';
  if (!shield) {
    stats = `<div class="pl-sec">${seasonOf()} · ${p.gp ? `${p.gp} ${p.gp === 1 ? 'game' : 'games'}` : 'Hasn’t played'}</div>
      ${p.gp ? `<div class="pl-avg">${box(num(p.pts), 'PTS')}${box(num(p.reb), 'REB')}${box(num(p.ast), 'AST')}${box(num(p.min), 'MIN')}${box(num(p.fg), 'FG%')}${box(num(p.tp), '3P%')}</div>` : ''}`;
  } else {
    const s = seenAverages(p, unseen);
    const label = !s ? 'Counting the games you’ve seen…' : s.approx ? 'Season averages' : `${s.gp} seen ${s.gp === 1 ? 'game' : 'games'}`;
    stats = `<div class="pl-sec">${seasonOf()} · ${label}</div>${s?.gp ? `<div class="pl-avg three">${box(num(s.min), 'MIN')}${box(num(s.reb), 'REB')}${box(num(s.ast), 'AST')}</div>` : ''}`;
    line = `<div class="pl-hid">${ic('eyeOff')}<span>Points and shooting are hidden: they include ${esc(gameName(unseen[unseen.length - 1]))}${unseen.length > 1 ? ` and ${unseen.length - 1} more` : ''}.</span></div>`;
  }
  const facts = [['College', r?.college], ['From', r?.from], ['Injury', injuryText(r?.injury)]].filter(([, v]) => v);
  let btn = '';
  if (from === 'leaders') btn = `<button class="pill noicon" data-act="team">${crest(abbr, 24)}<span class="ellipsis">${esc(n.name)} page</span></button>`;
  else if (!shield && from === 'roster') { const b = bestRank(p.id); if (b) btn = `<button class="ghost" data-act="leaders" data-cat="${esc(b.cat.key)}">${ic('starO')}<span class="ellipsis">${esc(b.rank)} in the NBA in ${esc(b.cat.label.toLowerCase())}</span></button>`; }
  return `<div class="pl-top" style="${teamVars(abbr)}">${head ? `<img class="hs" src="${esc(head)}" alt="" onerror="this.remove()">` : ''}<div class="num">${r?.jersey ? `#${esc(r.jersey)}` : ''}</div><div class="tm">${crest(abbr, 26)}<span class="ellipsis">${esc(n.full)}</span></div></div>
  <div class="pl-in"><h3 class="ellipsis">${esc(p.name || r?.name)}</h3><div class="pl-bits">${bits.map(esc).join(' · ')}</div>
  ${stats}${line}
  ${facts.length ? `<div class="pl-facts">${facts.map(([k, v]) => `<span>${k}</span><b>${esc(v)}</b>`).join('')}</div>` : ''}
  <div class="pl-sec">Last games${shield ? ' you’ve seen' : ''}</div>${lastHtml({ ...p, abbr })}
  ${btn ? `<div class="pl-btn nbz">${btn}</div>` : ''}</div>`;
}

// player: from NBA.leaders / NBA.teamPlayers (id, name, abbr, pos, headshot, gp, min, pts, reb, ast, fg, tp…).
export function openPlayer(player, { from = 'roster' } = {}) {
  if (!player) return null;
  const abbr = player.abbr;
  want(`roster:${abbr}`); want(`schedule:${abbr}`); want(`players:${abbr}`);
  if (from === 'roster') for (const c of NBA.LEADERS) want(`leaders:${c.key}`);
  const entry = () => (peek(`roster:${abbr}`)?.data || []).find((x) => x.id === player.id) || null;
  // (his averages from the team's table when he was opened from Leaders, which has them too)
  const full = () => ({ ...((peek(`players:${abbr}`)?.data?.players || []).find((x) => x.id === player.id) || {}), ...player });
  let body = null;
  const draw = () => { if (body?.isConnected) paint(body, html(full(), entry(), from)); };
  const off = on('league', (k) => { if (k === `roster:${abbr}` || k === `schedule:${abbr}` || k === `players:${abbr}` || k.startsWith('leaders:')) draw(); });
  const offN = on('nba', draw);
  onBox = draw;
  const sh = sheet(`<div class="body pl-b" data-pl-sheet></div>`, {
    cls: 'pl-sh',
    onClose: () => { off(); offN(); if (onBox === draw) onBox = null; },
    onClick: (act, t, close) => {
      if (act === 'team') { close(); push('team', { abbr }); }
      if (act === 'leaders') { close(); import('./nba.js').then((m) => m.openSection('leaders', { cat: t.dataset.cat })); }
    },
  });
  body = sh.el.querySelector('[data-pl-sheet]');
  draw();
  return sh;
}
