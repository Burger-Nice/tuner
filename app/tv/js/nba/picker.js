// The team picker (design/ui-v1/nba-pages/SPEC.md 1): the 30 crests as a 6-column grid per conference, your team (and
// its conference) first. It's the team section when your team is "None", and `All teams` on a pushed team page opens it
// as a sheet. OK on a crest opens that team's page.
import { esc } from '../util.js';
import { favTeam } from '../games.js';
import { openOverlay } from '../ui.js';
import { push } from '../router.js';
import { tc, names } from './common.js';

const WEST = ['DAL', 'DEN', 'GS', 'HOU', 'LAC', 'LAL', 'MEM', 'MIN', 'NO', 'OKC', 'PHX', 'POR', 'SAC', 'SA', 'UTAH'];
const EAST = ['ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DET', 'IND', 'MIA', 'MIL', 'NY', 'ORL', 'PHI', 'TOR', 'WSH'];
export const confOf = (abbr) => (WEST.includes(abbr) ? 'West' : EAST.includes(abbr) ? 'East' : '');

// The grids: { top } is where the first conference label sits; current: the team whose page is open (marked).
export function pickerHtml({ current = '' } = {}) {
  const mine = favTeam();
  const confs = [['West', WEST], ['East', EAST]];
  if (EAST.includes(mine)) confs.reverse();
  const cell = (a) => `<div class="tp-pk fx${a === mine ? ' mine' : ''}${a === current ? ' cur' : ''}" tabindex="-1" data-pick="${a}" data-key="tm:${a}">${tc(a, 's32')}<span class="ellipsis">${esc(names(a).name)}</span></div>`;
  return confs.map(([c, list]) => {
    const sorted = [...list].sort((x, y) => (x === mine ? -1 : y === mine ? 1 : names(x).full.localeCompare(names(y).full)));
    return `<div class="tp-pkh">${c}ern Conference</div><div class="tp-pkg" data-grid data-cols="6">${sorted.map(cell).join('')}</div>`;
  }).join('');
}

// `All teams` from a team page: the picker as a sheet. OK on a crest pushes that team's page.
export function openPicker({ current = '' } = {}) {
  const ov = openOverlay(`<div class="tp-pick"><div class="tp-pkt">All teams<small>OK opens a team’s page</small></div>${pickerHtml({ current })}</div>`, {
    focusSel: `[data-pick="${current || favTeam() || 'ATL'}"]`,
  });
  ov.el.addEventListener('click', (e) => {
    const c = e.target.closest('[data-pick]');
    if (!c) return;
    ov.close();
    if (c.dataset.pick !== current) push('team', { abbr: c.dataset.pick });
  });
  return ov;
}
