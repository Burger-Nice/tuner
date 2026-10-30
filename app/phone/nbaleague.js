// The League sections of the NBA tab (nba-pages/SPEC.md 3-5, phone SPEC 3.3): Standings (West / East, the play-in
// bands, LIVE pills, tap: the team's page), Leaders (the category column as a chip row, the leader on their team's plate,
// rows 2 to 10; tap: the player sheet, long-press: the team's page) and Team stats (the categories with your rank, all 30
// teams ranked with a bar, opened on your team; tap: the team's page). Under the shield a table with a team in scope is
// the copy kept from before the unseen game's tip-off, labelled, or covered when none was kept (SPEC 8.2).
import { hm, teamVars } from '../tv/js/util.js';
import { nba, favTeam } from '../tv/js/games.js';
import { peek, want, failed, fetchedAt } from '../tv/js/league.js';
import { names, pinView } from '../tv/js/nba/common.js';
import { TEAM_CATS } from '../tv/js/nba/teamstats.js';
import { esc, ic } from './ui.js';
import { crest, pinNote, coverHtml, blocks, downState, ord } from './nbakit.js';

const { NBA } = window;
export const L = { conf: '', lcat: 'pts', tcat: TEAM_CATS[0].key, centre: true };
const downNote = (key) => `<div class="nb-pin nbz">${ic('globe')}<span class="tx">ESPN isn’t answering${fetchedAt(key) ? ` · showing ${hm(fetchedAt(key))}` : ''}</span><button class="ghost sm" data-act="retry">${ic('refresh')}Try again</button></div>`;
const chips = (rows, sel, attr) => `<div class="chips nb-sub">${rows.map(([k, l, sm]) => `<button class="chip${k === sel ? ' sel' : ''}" data-${attr}="${esc(k)}">${esc(l)}${sm ? `<small>${esc(sm)}</small>` : ''}</button>`).join('')}</div>`;

// ---------- Standings ----------
const WEST = new Set(['DAL', 'DEN', 'GS', 'HOU', 'LAC', 'LAL', 'MEM', 'MIN', 'NO', 'OKC', 'PHX', 'POR', 'SAC', 'SA', 'UTAH']);
export function standingsWant() { want('standings'); if (favTeam()) want(`schedule:${favTeam()}`); }
export function standingsHtml() {
  const d = peek('standings')?.data;
  if (!d) return failed('standings') ? downState('Standings aren’t reachable') : blocks(12, 40);
  const t = favTeam();
  const order = (d.confs.find((c) => c.teams.some((x) => x.abbr === t))?.short || (t && !WEST.has(t) ? 'East' : 'West')) === 'East' ? ['East', 'West'] : ['West', 'East'];
  if (!L.conf) L.conf = order[0];
  const cur = d.confs.find((c) => c.short === L.conf);
  const head = chips(order.map((c) => [c, c]), L.conf, 'conf');
  if (!cur) return head;
  const v = pinView(cur.teams.map((x) => x.abbr));
  let teams = cur.teams, note = failed('standings') ? downNote('standings') : '';
  if (v) {
    if (v.loading) return `${head}${blocks(12, 40)}`;
    const c = v.copy?.standings?.confs?.find((x) => x.short === L.conf);
    const other = order.find((x) => x !== L.conf);
    if (!c) return `${head}${coverHtml(`${L.conf} standings are hidden`, v, `<button class="ghost sm" data-conf="${other}">Show the ${other}</button>`)}`;
    teams = c.teams; note = pinNote(v);
  }
  const playing = new Set(failed('standings') ? [] : nba.today.filter((g) => g.state === 'in').flatMap((g) => [g.home.abbr, g.away.abbr]));
  const rows = [...teams].sort((a, b) => (a.seed || 99) - (b.seed || 99) || (parseFloat(b.pct) || 0) - (parseFloat(a.pct) || 0)).map((x, i) => {
    const band = i === 6 ? '<tr class="band"><td colspan="9">Play-in · 7 to 10</td></tr>' : i === 10 ? '<tr class="band"><td colspan="9">Out of the play-in</td></tr>' : '';
    return `${band}<tr data-team="${esc(x.abbr)}"${x.abbr === t ? ' class="mine"' : ''}><td><span class="tc"><span class="sd">${i + 1}</span>${crest(x.abbr, 22)}<span class="nm">${esc(NBA.team(x.abbr)?.name || x.name || x.abbr)}</span>${playing.has(x.abbr) ? '<span class="live sm">Live</span>' : ''}</span></td><td>${x.w}</td><td>${x.l}</td><td>${esc(x.pct || '')}</td><td>${esc(x.gb ?? '')}</td><td>${esc(x.streak || '')}</td><td>${esc(x.l10 || '')}</td><td>${esc(x.home || '')}</td><td>${esc(x.road || '')}</td></tr>`;
  }).join('');
  return `${head}${note}<div class="tbl st-t" data-x="st:${esc(L.conf)}"><table class="box-t st"><thead><tr><th>${esc(cur.name || L.conf)}</th><th>W</th><th>L</th><th>PCT</th><th>GB</th><th>STRK</th><th>L10</th><th>HOME</th><th>ROAD</th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="note">${esc(d.season || '')}${d.season ? ' · ' : ''}Tap a team for its page</div>`;
}

// ---------- Leaders ----------
const CATS = NBA.LEADERS;
const catLabel = (c) => (c.key === '3pm' ? '3-pointers' : c.label);
const POS = { G: 'Guard', PG: 'Guard', SG: 'Guard', F: 'Forward', SF: 'Forward', PF: 'Forward', C: 'Center', FC: 'Forward', GF: 'Guard' };
const head = (u) => (/^https:\/\/a\.espncdn\.com\/i\//.test(u || '') ? `https://a.espncdn.com/combiner/i?img=${u.replace('https://a.espncdn.com', '')}&w=252&h=184` : u || '');
export let leaderList = [];
export function leadersWant() { want(`leaders:${L.lcat}`); want('standings'); if (favTeam()) want(`schedule:${favTeam()}`); }
export function leadersHtml() {
  const c = CATS.find((x) => x.key === L.lcat) || CATS[0], key = `leaders:${c.key}`;
  const got = peek(key), bad = failed(key);
  const top = chips(CATS.map((x) => [x.key, catLabel(x)]), c.key, 'lcat');
  const season = peek('standings')?.data?.season;
  const foot = `<div class="note">Per game, ${season ? esc(season) : 'this season'} · ESPN’s qualified players</div>`;
  if (!got?.data) return `${top}${bad ? downState('Leaders aren’t reachable') : blocks(8, 44)}`;
  if (!got.data.length) return `${top}<div class="state"><div class="ico">${ic('clock')}</div><b>Leaders start after the first games</b><p>ESPN lists qualified players once the season is under way.</p></div>`;
  // any unseen game counts: a player who dropped out of the list after an unseen game would give it away by his absence
  const v = pinView(null);
  let rows = got.data, note = bad ? downNote(key) : '';
  if (v) {
    if (v.loading) return `${top}${blocks(8, 44)}`;
    const cp = v.copy?.leaders?.[c.key];
    if (!cp?.length) return `${top}${coverHtml('Leaders are hidden', v)}`;
    rows = cp; note = pinNote(v);
  }
  const l = [...rows].sort((a, b) => (parseFloat(b.value) || 0) - (parseFloat(a.value) || 0));
  leaderList = l;
  const p = l[0], tied = l[1]?.value === p.value, t = names(p.abbr);
  const card = `<button class="ld-card nbz" data-lp="${esc(p.id)}" style="${teamVars(p.abbr)}"><span class="pl"></span>${p.headshot ? `<img class="hs" src="${esc(head(p.headshot))}" alt="" onerror="this.remove()">` : ''}<span class="tx"><span class="rk">${tied ? 'T-1st' : '1st'} in the NBA</span><b class="nm">${esc(p.name)}</b><span class="mt ellipsis">${esc(t.full)}${p.pos ? ` · ${esc(POS[p.pos] || p.pos)}` : ''}</span></span><span class="v"><b>${esc(p.value)}</b><small>${esc(c.pct ? c.short : `${c.short} a game`)}</small></span></button>`;
  let rk = 1;
  const list = l.slice(1, 10).map((x, i) => {
    const r = l[i].value === x.value ? rk : (rk = i + 2);
    return `<button class="ld-row nbz${x.abbr === favTeam() ? ' mine' : ''}" data-lp="${esc(x.id)}"><span class="rk">${r}</span>${crest(x.abbr, 26)}<span class="nm"><span class="ellipsis">${esc(x.name)}</span><small class="ellipsis">${esc(names(x.abbr).name)}</small></span><span class="v">${esc(x.value)}</span></button>`;
  }).join('');
  return `${top}${note}${card}<div class="ld-rows">${list}</div>${foot}`;
}

// ---------- Team stats ----------
function ranked(data, k) {
  const l = Object.values(data || {}).filter((t) => typeof t.s?.[k] === 'number');
  l.sort((a, b) => (a.rank[k] || 99) - (b.rank[k] || 99));
  const n = new Map();
  l.forEach((t) => n.set(t.rank[k], (n.get(t.rank[k]) || 0) + 1));
  return l.map((t) => ({ t, v: t.s[k], rank: t.rank[k], tie: n.get(t.rank[k]) > 1 }));
}
const rankText = (r, long) => (r ? `${r.tie ? 'T-' : ''}${long ? ord(r.rank) : r.rank}` : '');
const preseason = (data) => !Object.keys(data || {}).length || Object.values(data).every((t) => !t.s?.gamesPlayed);
export function teamStatsWant() { want('teamStats'); if (favTeam()) want(`schedule:${favTeam()}`); }
export function teamStatsHtml() {
  const c = TEAM_CATS.find((x) => x.key === L.tcat) || TEAM_CATS[0];
  const got = peek('teamStats')?.data, bad = failed('teamStats'), me = favTeam();
  let tb = {};
  const v = got && !preseason(got) ? pinView(null) : null;   // every team is in this table
  if (got && !preseason(got)) tb = !v ? { data: got } : v.loading ? { wait: true } : v.copy?.teamStats ? { data: v.copy.teamStats, pin: v } : { cover: v };
  const top = chips(TEAM_CATS.map((x) => { const r = tb.data && me ? ranked(tb.data, x.key).find((y) => y.t.abbr === me) : null; return [x.key, x.label, rankText(r, true)]; }), c.key, 'tcat');
  if (!got) return `${top}${bad ? downState('Team stats aren’t reachable') : blocks(10, 40)}`;
  if (preseason(got)) return `${top}<div class="state"><div class="ico">${ic('clock')}</div><b>Team stats start after the first games</b><p>The ranks show once every team has played.</p></div>`;
  if (tb.wait) return `${top}${blocks(10, 40)}`;
  if (tb.cover) return `${top}${coverHtml('Team stats are hidden', tb.cover)}`;
  const note = tb.pin ? pinNote(tb.pin) : bad ? downNote('teamStats') : '';
  const rows = ranked(tb.data, c.key);
  const vals = rows.map((r) => r.v), lo = Math.min(...vals), hi = Math.max(...vals);
  const unit = /%/.test(c.label) ? c.label : `${c.label} a game`;
  const list = rows.map((r) => {
    const w = 18 + (82 * (c.lower ? hi - r.v : r.v - lo)) / (hi - lo || 1);
    return `<button class="ts-row nbz${r.t.abbr === me ? ' mine' : ''}" data-team="${esc(r.t.abbr)}"><span class="rk">${esc(rankText(r))}</span>${crest(r.t.abbr, 26)}<span class="nm ellipsis">${esc(r.t.full || names(r.t.abbr).full)}</span><span class="bar"><i style="width:${w.toFixed(1)}%"></i></span><span class="v">${(+r.v).toFixed(1)}</span></button>`;
  }).join('');
  return `${top}${note}<div class="ts-h nbz"><span>#</span><span>Team</span><span>${esc(unit)}${c.lower ? ' · lower is better' : ''}</span></div><div class="ts-rows">${list}</div>`;
}
