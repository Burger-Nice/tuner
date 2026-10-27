// The NBA tab's Team stats section (design/ui-v1/nba-pages/SPEC.md). Stub: built next.
import { stateCard } from './common.js';

export default {
  id: 'teamstats',
  label: () => 'Team stats',
  mount(root) { root.innerHTML = stateCard({ icon: 'clock', title: 'Team stats', text: 'Coming next.' }); },
  enter() {},
  leave() {},
  entry: () => null,
  toTop() {},
};
