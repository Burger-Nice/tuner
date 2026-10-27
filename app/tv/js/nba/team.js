// A team's page (design/ui-v1/nba-pages/SPEC.md 7): the NBA tab's team section (your team) and the pushed `team` screen
// (any team). Stub: built next.
import { esc } from '../util.js';
import { favTeam } from '../games.js';
import { tc, names, stateCard } from './common.js';

export const teamSection = {
  id: 'team',
  label: () => (favTeam() ? `${tc(favTeam())}${esc(names(favTeam()).name)}` : 'Teams'),
  mount(root) { root.innerHTML = stateCard({ icon: 'clock', title: 'Team page', text: 'Coming next.' }); },
  enter() {},
  leave() {},
  entry: () => null,
  toTop() {},
};
