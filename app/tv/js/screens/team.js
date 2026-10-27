// Another team's page, pushed over whatever opened it (design/ui-v1/nba-pages/SPEC.md 7.7). Stub: built next.
import { esc } from '../util.js';
import { names, stateCard } from '../nba/common.js';

export default {
  name: 'team',
  mount(root) { root.innerHTML = '<div class="page"></div>'; },
  enter(root, params) { root.querySelector('.page').innerHTML = stateCard({ icon: 'clock', title: `${esc(names(params.abbr || '').full)}`, text: 'Coming next.' }); },
  entry: () => null,
};
