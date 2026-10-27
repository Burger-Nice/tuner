// Shared by the NBA tab's sections and the team page (design/ui-v1/nba-pages/SPEC.md): crests, the night rule for
// tip-off times, game names, Reveal buttons, the copies kept from before a game (the shield's tables), state cards.
import { esc, ic, crest, hm } from '../util.js';
import { emit } from '../state.js';
import { confirmMenu } from '../ui.js';
import { unseenFor, markSeen, revealAll, pinFor, shieldMode } from '../games.js';
import { fetchedAt, failed } from '../league.js';

const { NBA } = window;
// A crest in the neutral disc at 24, 28, 32 or 64 px ('s24', 's28', 's32', 'lg'). Takes a team ({ abbr, logo }) or an abbr.
export const tc = (t, size = 's24') => crest(typeof t === 'string' ? { abbr: t, logo: NBA.logoFor(t) } : { ...t, logo: t.logo || NBA.logoFor(t.abbr) }, size);
// A team's names from its abbreviation (scoreboard sides carry them already): { abbr, name: 'Grizzlies', city: 'Memphis' }.
export function names(abbr) {
  const t = NBA.team(abbr);
  return { abbr, name: t?.name || abbr, full: t ? `${t.city} ${t.name}` : abbr, city: t?.city || '', logo: NBA.logoFor(abbr) };
}

// ---------- time (SPEC 2.3: the night rule) ----------
// A tip-off between 00:00 and 06:00 belongs to the evening before.
const DAY = 864e5;
const night = (t) => new Date(t - 6 * 3600e3);
const late = (t) => new Date(t).getHours() < 6;
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const wd = (d) => d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
const dm = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
// Tile date: 'THU 29 OCT · LATE' (the time goes on its own line: hm(t)).
export const tileDate = (t) => `${wd(night(t))} ${dm(night(t))}${late(t) ? ' · LATE' : ''}`;
// 'TONIGHT', 'TOMORROW', 'TUE NIGHT' / 'TUE', or the date when it's over a week away.
export function whenWord(t) {
  const n = night(t), now = night(Date.now());
  if (sameDay(n, now)) return 'TONIGHT';
  const days = Math.round((new Date(n.toDateString()) - new Date(now.toDateString())) / DAY);
  if (days === 1 && !late(t)) return 'TOMORROW';
  if (days > 0 && days < 7) return `${wd(n)}${late(t) ? ' NIGHT' : ''}`;
  return `${wd(n)} ${dm(n)}`;
}
// The team header's next game: 'NEXT · TONIGHT 01:00', 'NEXT · TUE NIGHT 00:00'.
export const nextLabel = (t) => `NEXT · ${whenWord(t)} ${hm(t)}`;
// Short day for labels: 'Sun' (of the evening the game belongs to).
export const shortDay = (t) => night(t).toLocaleDateString('en-GB', { weekday: 'short' });
// 'Tips off in 1 h 20 min' / 'Tips off in 3 days'.
export function tipsIn(t) {
  const m = Math.round((t - Date.now()) / 60000);
  if (m <= 0) return 'Tipping off';
  if (m < 60) return `Tips off in ${m} min`;
  if (m < 24 * 60) return `Tips off in ${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;
  const d = Math.round(m / 1440);
  return `Tips off in ${d} day${d > 1 ? 's' : ''}`;
}

// ---------- games ----------
export const gameName = (g) => `${g.away.name} at ${g.home.name}`;
// One team's view of a game: { me, op, home, word: 'vs'/'at', won }.
export function sideOf(g, abbr) {
  const home = g.home.abbr === abbr, me = home ? g.home : g.away, op = home ? g.away : g.home;
  return { me, op, home, word: home ? 'vs' : 'at', won: g.state === 'post' && +me.score > +op.score };
}

// ---------- Reveal (SPEC 8.2: never the default focus; it names its game) ----------
// A Reveal button for these unseen games: one game is named; more than one reads 'Reveal 6 results' and confirms.
export function revealBtn(games, cls = 'pillbtn') {
  if (!games?.length) return '';
  const one = games.length === 1;
  return `<span class="${cls} fx nb-reveal" tabindex="-1" data-act="reveal" data-g="${one ? esc(games[0].id) : '*'}">${ic('eyeOff', 'sm')}${one ? `Reveal ${esc(gameName(games[0]))}` : `Reveal ${games.length} results`}</span>`;
}
// OK on a Reveal button (from a click handler: reveal(el) when el.dataset.act === 'reveal'). then: after it's seen.
export function reveal(el, then) {
  const id = el.dataset.g;
  if (id !== '*') { markSeen(id); then?.(); return; }
  const n = unseenFor().length;
  confirmMenu({ title: `Reveal ${n} results?`, text: 'Every score, record and story up to now shows.', yes: 'Reveal', onYes: () => { revealAll(); then?.(); } });
}

// ---------- the copy from before an unseen game (SPEC 8.1-8.2) ----------
// For a table that contains these teams (abbrs; null: any team): the earliest unseen game with any of them, its copy of
// standings / leaders / team stats from before its tip-off, and the label. null when nothing in it is unseen.
//   { game, games (all of them), copy ({ standings, teamStats, leaders: { pts: [...] } } | null when none was kept),
//     loading (the copy is being read), label: 'As of tip-off, Grizzlies at Kings (Sun)' }
// 'league' ('pin') fires when a copy has been read.
const pins = new Map();   // tip-off time -> copy | null; missing = not read yet
export function pinView(abbrs) {
  if (shieldMode() === 'off') return null;
  const games = unseenFor().filter((g) => !abbrs || abbrs.includes(g.home.abbr) || abbrs.includes(g.away.abbr)).sort((a, b) => a.date - b.date);
  if (!games.length) return null;
  const game = games[0];
  if (!pins.has(game.date)) {
    pins.set(game.date, undefined);
    pinFor(game).then((c) => { pins.set(game.date, c || null); emit('league', 'pin'); }, () => { pins.set(game.date, null); emit('league', 'pin'); });
  }
  const copy = pins.get(game.date);
  return { game, games, copy: copy || null, loading: copy === undefined, label: `As of tip-off, ${gameName(game)} (${shortDay(game.date)})` };
}
// The label pill for a table showing a copy: 'As of tip-off, Grizzlies at Kings (Sun)' + its Reveal button.
export const pinNote = (v, style = '') => `<div class="nb-notice" data-row style="${style}">${ic('eyeOff')}<span>${esc(v.label)}</span>${revealBtn(v.games)}</div>`;

// ---------- states ----------
// The section row's right-hand text for this data: 'ESPN · 23:37', or 'ESPN' when the last fetch failed.
export function espnMeta(key) {
  const at = fetchedAt(key);
  return failed(key) || !at ? 'ESPN' : `ESPN · ${hm(at)}`;
}
// A centred state card: { icon, title, text, btn: [act, label] } (its button is focusable: the section's entry then).
export const stateCard = ({ icon = 'wifiOff', title, text = '', btn, top = 200 }) => `<div class="center-col" style="top:${top}px"><div class="state big"><div class="ico">${ic(icon)}</div><b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ''}${btn ? `<div data-row><span class="btn fx" tabindex="-1" data-act="${esc(btn[0])}">${esc(btn[1])}</span></div>` : ''}</div></div>`;
// ESPN isn't answering and nothing is kept: the card with Try again (data-act="retry").
export const downCard = (top) => stateCard({ title: 'Scores aren’t reachable', text: 'ESPN isn’t answering. airglow tries again every minute.', btn: ['retry', 'Try again'], top });
// The copy is old because ESPN isn't answering: 'ESPN isn't answering · showing 22:51' and a Try again pill.
export const downNote = (key) => `<span class="nb-hid">${ic('wifiOff')}ESPN isn’t answering${dotTime(key)}</span><span class="pillbtn fx" tabindex="-1" data-act="retry">Try again</span>`;
const dotTime = (key) => (fetchedAt(key) ? ` · showing ${hm(fetchedAt(key))}` : '');
// Flat blocks where rows will be (loading with nothing kept).
export const skeleton = (n, { top = 0, h = 32, gap = 0, left = 48, width = 852 } = {}) => Array.from({ length: n }, (_, i) => `<div class="nb-sk" style="left:${left}px;top:${top + i * (h + gap)}px;width:${width}px;height:${h - 4}px;border-radius:8px"></div>`).join('');
