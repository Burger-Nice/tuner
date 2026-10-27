// The NBA tab's Leaders section (design/ui-v1/nba-pages/SPEC.md). Stub: built next.
import { stateCard } from './common.js';

export default {
  id: 'leaders',
  label: () => 'Leaders',
  mount(root) { root.innerHTML = stateCard({ icon: 'clock', title: 'Leaders', text: 'Coming next.' }); },
  enter() {},
  leave() {},
  entry: () => null,
  toTop() {},
};
