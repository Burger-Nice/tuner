// Another team's page, pushed over whatever opened it (design/ui-v1/nba-pages/SPEC.md 7.7): the team page's layout with a
// tools row at y 80-120 (`☆ Make the <team> my team`, `All teams`, where it was opened from). Back returns to the opener.
// Team pages pushed from team pages share this screen: each keeps its own place (in its params), so Back lands where you were.
import { current, nav, barHidden } from '../router.js';
import { favTeam } from '../games.js';
import { nbaSection } from './nba.js';
import { teamPage } from '../nba/team.js';
import { names } from '../nba/common.js';

const page = teamPage({ pushed: true });
let el;
const FROM = { games: 'Games', team: 'your team page', standings: 'Standings', leaders: 'Leaders', teamstats: 'Team stats', news: 'News' };
// "Opened from Standings": the screen (and NBA section) of the control that opened this page.
function openedFrom(op) {
  if (op?.closest?.('.gc')) return 'a game card';
  const scr = op?.closest?.('[data-screen]')?.dataset.screen || nav.tab;
  if (scr === 'nba') return nbaSection() === 'team' && !favTeam() ? 'Teams' : FROM[nbaSection()] || 'NBA';
  if (scr === 'team') { const prev = nav.stack[nav.stack.length - 2]; return prev?.params?.abbr ? `the ${names(prev.params.abbr).name} page` : 'a team page'; }
  return { game: 'the game page', home: 'Home', search: 'Search', live: 'the guide' }[scr] || '';
}

export default {
  name: 'team',
  mount(root) {
    el = root;
    page.mount(root, {
      visible: () => current() === 'team' && !el.hidden,
      scrolled: (on) => { root.querySelector('.tp-tools')?.classList.toggle('away', !!on); if (current() === 'team') barHidden(!!on); },
      meta() {}, chip() {},
    });
  },
  enter(root, params) {
    if (!params.abbr) return;
    const top = nav.stack[nav.stack.length - 1];
    if (!params._tp) params._tp = { area: 'top', fi: -1, ws: 0, rowOff: 0, sort: 'pts', opened: openedFrom(top?.opener) };
    page.show(params.abbr, params._tp);
  },
  leave() { barHidden(false); },
  entry: () => page.entry(),
  key: (k, e) => page.key(k, e),
};
