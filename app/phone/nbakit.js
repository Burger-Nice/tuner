// The phone NBA pages' shared bits (design/ui-v1/phone-v1/SPEC.md 3.3, nba-pages/SPEC.md 8): crests, Reveal (always
// behind a confirm on the phone: a stray tap must never give a result away), the shield's "As of tip-off" note and its
// cover card, a paint that keeps the page's and its sideways rails' scroll, loading blocks and the ESPN-down card.
import { esc, ic, crestImg, confirm } from './ui.js';
import { unseenFor, markSeen, markSeenMany, revealAll, gameById, knownGames } from '../tv/js/games.js';
import { gameName } from '../tv/js/nba/common.js';

const { NBA } = window;
// A crest in its disc: a team ({ abbr, logo }) or an abbreviation.
export const crest = (t, size = 26) => crestImg(typeof t === 'string' ? { abbr: t, logo: NBA.logoFor(t) } : { ...t, logo: t.logo || NBA.logoFor(t.abbr) }, size);
// 'Sun 25 Oct' for the evening a game belongs to (the night rule: before 06:00 is the evening before).
export const dayDate = (t) => new Date(t - 6 * 3600e3).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
const gameOf = (id) => gameById(id) || unseenFor().find((g) => g.id === id) || knownGames().find((g) => g.id === id);

// Reveal these games ('*': every unseen one) once he says so. One game is named; more read "Reveal 6 results".
export function revealIds(ids, then) {
  const all = ids === '*' || ids?.[0] === '*';
  const list = all ? unseenFor().map((g) => g.id) : (ids || []).filter(Boolean);
  if (!list.length) { then?.(); return; }
  if (list.length === 1 && !all) {
    const g = gameOf(list[0]);
    confirm({ title: `Reveal ${g ? gameName(g) : 'this game'}?`, text: 'Its score, record and stories show on this iPhone from now on.', no: 'Keep it hidden', yes: 'Reveal', onYes: () => { markSeen(list[0]); then?.(); } });
    return;
  }
  confirm({ title: `Reveal ${list.length} results?`, text: all ? 'Every score, record and story up to now shows.' : 'Their scores, records and stories show.', no: 'Keep them hidden', yes: 'Reveal', onYes: () => { if (all) revealAll(); else markSeenMany(list); then?.(); } });
}
// A Reveal button naming its game (never the first button of a card).
export const revealBtn = (games, cls = 'ghost sm') => (games?.length ? `<button class="${cls} nb-rv" data-reveal="${esc(games.map((g) => g.id).join(','))}">${ic('eyeOff')}<span class="ellipsis">${games.length === 1 ? `Reveal ${esc(gameName(games[0]))}` : `Reveal ${games.length} results`}</span></button>` : '');
// Taps on [data-reveal] inside root: the confirm, then redraw.
export function onReveal(root, redraw) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-reveal]');
    if (!b || !root.contains(b)) return;
    e.stopPropagation();
    revealIds(b.dataset.reveal.split(','), redraw);
  });
}
// A table showing the copy from before an unseen game: 'As of tip-off, Grizzlies at Kings (Sun)' and its Reveal.
export const pinNote = (v) => `<div class="nb-pin nbz">${ic('eyeOff')}<span class="tx">${esc(v.label)}</span>${revealBtn(v.games)}</div>`;
// No copy from before the unseen game: the table is covered. keep: the first button (Keep it hidden, Show the East).
export function coverHtml(title, v, keep = '<button class="ghost sm" data-act="keep">Keep it hidden</button>') {
  const more = v.games.length > 1 ? ` and ${v.games.length - 1} more result${v.games.length > 2 ? 's' : ''}` : '';
  return `<div class="cover nb-cov"><div class="h">${ic('eyeOff')}<span>${esc(title)}</span></div><p>They include ${esc(gameName(v.game))} (${esc(dayDate(v.game.date))})${more}, which you haven't seen on this iPhone. airglow had no copy from before that tip-off.</p><div class="act nbz">${keep}${revealBtn(v.games)}</div></div>`;
}
// Flat blocks where rows will be.
export const blocks = (n, h = 44, top = 12) => `<div class="nb-sks" style="margin-top:${top}px">${Array.from({ length: n }, () => `<div class="sk" style="height:${h}px"></div>`).join('')}</div>`;
// ESPN isn't answering and nothing is kept.
export const downState = (title = 'Scores aren’t reachable') => `<div class="state"><div class="ico">${ic('globe')}</div><b>${esc(title)}</b><p>ESPN isn’t answering. airglow tries again every minute.</p><button class="ghost" data-act="retry">${ic('refresh')}Try again</button></div>`;
// innerHTML that keeps the element's scroll and its sideways rails' ([data-x], by their key); nothing when unchanged.
export function paint(el, html) {
  if (!el || el._html === html) return false;
  const xs = new Map([...el.querySelectorAll('[data-x]')].map((r) => [r.dataset.x, r.scrollLeft]));
  const y = el.scrollTop;
  el.innerHTML = html;
  el._html = html;
  for (const r of el.querySelectorAll('[data-x]')) if (xs.has(r.dataset.x)) r.scrollLeft = xs.get(r.dataset.x);
  el.scrollTop = y;
  return true;
}
// 1st 2nd 3rd 11th 21st
export const ord = (n) => { const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'; return `${n}${s}`; };
