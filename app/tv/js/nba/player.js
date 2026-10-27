// The player sheet (design/ui-v1/nba-pages/SPEC.md 7.6): a right sheet over Leaders or a team's roster. The team plate
// with his headshot and number, his averages, college and home town, an injury if any, and one button: from the roster
// `☆ 1st in the NBA in points` (only when he's in a top 10), from Leaders `<Team> page`. Under the shield (his team
// played a game you haven't seen) only MIN, REB and AST show, counted over the games you have seen, and there's no button.
import { esc, ic, dot, teamVars } from '../util.js';
import { on } from '../state.js';
import { unseenFor } from '../games.js';
import { peek, want, fetchedAt } from '../league.js';
import { openOverlay } from '../ui.js';
import { push, go, current } from '../router.js';
import { focus } from '../focus.js';
import { tc, names, gameName } from './common.js';

const { NBA } = window;
const POS = { G: 'Guard', F: 'Forward', C: 'Center', PG: 'Point guard', SG: 'Shooting guard', SF: 'Small forward', PF: 'Power forward', 'G-F': 'Guard-forward', 'F-C': 'Forward-center', 'F-G': 'Forward-guard', 'C-F': 'Center-forward' };
export const posName = (p) => POS[p] || p || '';
export const ordinalOf = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const num = (v) => (v == null || v === '' || Number.isNaN(+v) ? '–' : (+v).toFixed(1));
const injuryText = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');
// The season a date belongs to: '2026-27' (the season starts in October).
export const seasonOf = (t = Date.now()) => { const d = new Date(t), y = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1; return `${y}-${String((y + 1) % 100).padStart(2, '0')}`; };

// His best place in the league's top 10s (peek('leaders:<cat>')): { cat, rank: 'T-2nd' } or null.
export function bestRank(id) {
  let best = null;
  for (const c of NBA.LEADERS) {
    const list = peek(`leaders:${c.key}`)?.data;
    if (!list) continue;
    const i = list.slice(0, 10).findIndex((p) => p.id === id);
    if (i < 0) continue;
    const first = list.findIndex((p) => p.value === list[i].value), tie = list.filter((p) => p.value === list[i].value).length > 1;
    if (!best || first < best.n) best = { cat: c, n: first, rank: `${tie ? 'T-' : ''}${ordinalOf(first + 1)}` };
  }
  return best;
}

// MIN, REB and AST over the games you've seen: the season's averages less the unseen games he played in (their box
// scores, read once and never shown). null while those box scores are being read.
const boxes = new Map();   // game id -> summary | null (failed) ; missing: being read
function boxOf(id) {
  if (boxes.size > 24) boxes.clear();   // (a handful of unseen games at most: never grows for long)
  if (!boxes.has(id)) { boxes.set(id, undefined); NBA.summary(id).then((s) => boxes.set(id, s), () => boxes.set(id, null)).finally(() => onBox?.()); }
  return boxes.get(id);
}
let onBox = null;
function seenAverages(p, unseen) {
  let gp = p.gp || 0, min = (p.min || 0) * gp, reb = (p.reb || 0) * gp, ast = (p.ast || 0) * gp, exact = true;
  const at = fetchedAt(`players:${p.abbr}`) || Date.now();
  for (const g of unseen) {
    // only a final that ended before his averages were read is in them (ESPN adds a game once it's over: ~3 h after tip-off)
    if (g.state !== 'post' || g.date + 3 * 3600e3 > at) continue;
    const s = boxOf(g.id);
    if (s === undefined) return null;
    if (s === null) { exact = false; continue; }
    const team = s.box.find((b) => b.abbr === p.abbr), row = team?.players.find((x) => x.name === p.name);
    if (!row || row.dnp) continue;
    const v = (k) => parseFloat(row.stats[team.labels.indexOf(k)]) || 0;
    gp--; min -= v('MIN'); reb -= v('REB'); ast -= v('AST');
  }
  if (!exact) return { gp: p.gp, min: p.min, reb: p.reb, ast: p.ast, approx: true };
  return gp > 0 ? { gp, min: min / gp, reb: reb / gp, ast: ast / gp } : { gp: 0 };
}

function html(p, r, from) {
  const abbr = p.abbr || r?.abbr, n = names(abbr);
  const unseen = unseenFor(abbr);
  const shield = unseen.length > 0;
  const head = p.headshot || r?.headshot;
  const bits = [posName(r?.pos || p.pos), r?.height, r?.age || p.age ? `${r?.age || p.age} years` : '', r?.exp != null ? `${ordinalOf(r.exp + 1)} season` : ''].filter(Boolean);
  const box = (v, k) => `<div><b>${esc(v)}</b><span>${k}</span></div>`;
  let stats, line = '';
  if (!shield) {
    stats = `<div class="sec" style="margin-top:8px">${seasonOf()}<span class="dot-sep" style="margin:0 6px"></span>${p.gp ? `${p.gp} ${p.gp === 1 ? 'game' : 'games'}` : 'Hasn’t played'}</div>
      ${p.gp ? `<div class="avg">${box(num(p.pts), 'PTS')}${box(num(p.reb), 'REB')}${box(num(p.ast), 'AST')}${box(num(p.min), 'MIN')}${box(num(p.fg), 'FG%')}${box(num(p.tp), '3P%')}</div>` : ''}`;
  } else {
    const s = seenAverages(p, unseen);
    const label = !s ? 'Counting the games you’ve seen…' : s.approx ? `${p.gp} games` : `${s.gp} seen ${s.gp === 1 ? 'game' : 'games'}`;
    stats = `<div class="sec" style="margin-top:8px">${seasonOf()}<span class="dot-sep" style="margin:0 6px"></span>${label}</div>
      ${s?.gp ? `<div class="avg">${box(num(s.min), 'MIN')}${box(num(s.reb), 'REB')}${box(num(s.ast), 'AST')}</div>` : ''}`;
    line = `<div class="nb-hid" style="margin-top:10px;white-space:normal;align-items:flex-start;font-size:15px;line-height:20px">${ic('eyeOff')}<span>Points and shooting are hidden: they include ${esc(gameName(unseen[unseen.length - 1]))}${unseen.length > 1 ? ` and ${unseen.length - 1} more` : ''}.</span></div>`;
  }
  const facts = [['College', r?.college], ['From', r?.from], ['Injury', injuryText(r?.injury)]].filter(([, v]) => v);
  let btn = '';
  if (!shield && from === 'leaders') btn = `<span class="btn fx" tabindex="-1" data-act="team" style="transform-origin:0 50%">${tc(abbr, 's24')}${esc(n.name)} page</span>`;
  else if (!shield && from === 'roster') { const b = bestRank(p.id); if (b) btn = `<span class="btn fx" tabindex="-1" data-act="leaders" data-cat="${b.cat.key}" style="transform-origin:0 50%">${ic('starO')}${b.rank} in the NBA in ${esc(b.cat.label.toLowerCase())}</span>`; }
  return `<div class="sheet nb-pl" style="gap:0"><div class="top" style="${teamVars(abbr)}">${head ? `<img class="hs" src="${esc(head)}" alt="" decoding="async">` : ''}<div class="num">${r?.jersey ? `#${esc(r.jersey)}` : ''}</div>${tc(abbr, 's28')}<span class="tp-pltm">${esc(n.name)}</span></div>
  <div class="nb-plb${btn ? '' : ' fx'}" tabindex="-1"${btn ? '' : ' data-col'}>
  <h3 class="ellipsis">${esc(p.name || r?.name)}</h3><div class="t-cap" style="margin-top:2px;color:var(--a-text-2)">${bits.map(esc).join(dot)}</div>
  ${stats}${line}
  ${facts.length ? `<div class="facts" style="margin-top:8px">${facts.map(([k, v]) => `<span>${k}</span>${esc(v)}`).join('')}</div>` : ''}</div>
  ${btn ? `<div class="sheet-foot" data-row style="align-items:flex-start">${btn}</div>` : ''}</div>`;
}

// player: a player from NBA.leaders / NBA.teamPlayers (id, name, abbr, pos, headshot, gp, min, pts, reb, ast, fg, tp...).
// from: 'leaders' (its button opens his team's page) or 'roster' (its button opens Leaders on his best category).
export function openPlayer(player, { from = 'roster' } = {}) {
  if (!player) return null;
  const abbr = player.abbr;
  want(`roster:${abbr}`);
  if (from === 'roster') for (const c of NBA.LEADERS) want(`leaders:${c.key}`);
  const entry = () => (peek(`roster:${abbr}`)?.data || []).find((x) => x.id === player.id) || null;
  let ov = null;
  const draw = () => {
    if (!ov?.el.isConnected) return;
    const box = ov.el.querySelector('.sheet');
    const had = box.contains(document.activeElement);
    const next = html(player, entry(), from);
    if (box._html === next) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = next;
    box.replaceWith(tmp.firstElementChild);
    ov.el.querySelector('.sheet')._html = next;
    if (had) focus(ov.el.querySelector('.sheet .btn.fx') || ov.el.querySelector('.sheet .fx'));
  };
  const off = on('league', (k) => { if (k === `roster:${abbr}` || k.startsWith('leaders:')) draw(); });
  onBox = draw;
  ov = openOverlay(html(player, entry(), from), {
    focusSel: '.sheet .btn.fx, .sheet .nb-plb.fx',
    onClose: () => { off(); if (onBox === draw) onBox = null; },
    onClick: (act, t) => {
      if (act === 'team') { ov.close(); push('team', { abbr }); }
      if (act === 'leaders') {
        ov.close();
        // Leaders on that category (the NBA tab's section); from a pushed page, the NBA tab first
        import('../screens/nba.js').then(({ openSection, default: host }) => {
          if (current() !== 'nba') go('nba', null, { focusIn: false });
          openSection('leaders', { cat: t.dataset.cat });
          requestAnimationFrame(() => focus(host.entry()));
        });
      }
    },
  });
  ov.el.querySelector('.sheet')._html = html(player, entry(), from);
  return ov;
}
