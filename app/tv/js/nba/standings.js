// The NBA tab's Standings section (design/ui-v1/nba-pages/SPEC.md). Stub: built next.
import { stateCard } from './common.js';

export default {
  id: 'standings',
  label: () => 'Standings',
  mount(root) { root.innerHTML = stateCard({ icon: 'clock', title: 'Standings', text: 'Coming next.' }); },
  enter() {},
  leave() {},
  entry: () => null,
  toTop() {},
};
