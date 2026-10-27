// The NBA tab's News section (design/ui-v1/nba-pages/SPEC.md). Stub: built next.
import { stateCard } from './common.js';

export default {
  id: 'news',
  label: () => 'News',
  mount(root) { root.innerHTML = stateCard({ icon: 'clock', title: 'News', text: 'Coming next.' }); },
  enter() {},
  leave() {},
  entry: () => null,
  toTop() {},
};
