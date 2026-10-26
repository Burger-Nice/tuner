// The launch (UI-SPEC section 8): the native splash hands over to #l-launch (same background, the wedge at the same
// place), the lockup builds in 820 ms, then the slab wipes to the first screen. If that screen isn't ready by then the
// lockup holds with the bands breathing, with a caption at 4 s; at 12 s the app is shown anyway (it has its own
// offline states). Keys do nothing until the wipe starts.
import { $ } from './util.js';

const T_HOLD = 820, T_WIPE = 280, T_SLOW = 4000, T_GIVEUP = 12000;
const app = $('#app');
const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let open = false, ready = false, shown = false;
const t0 = performance.now();

export const launchOpen = () => open;

function finish() {
  if (shown) return;
  shown = true;
  open = true;
  app.classList.remove('l-loading', 'l-slow');
  if (reduce) {
    app.classList.add('l-fading');
    setTimeout(() => app.classList.remove('l-on', 'l-rm', 'l-fading'), 120);
    return;
  }
  app.classList.add('l-wiping');
  setTimeout(() => app.classList.remove('l-on', 'l-run', 'l-wiping'), T_WIPE + 40);
}

// The first screen has drawn: wipe now if the intro is done, else as soon as it is.
export function launchReady() {
  if (ready) return;
  ready = true;
  if (performance.now() - t0 >= T_HOLD) finish();
}

app.classList.add(reduce ? 'l-rm' : 'l-run');
setTimeout(() => {
  if (ready) { finish(); return; }
  if (!reduce) app.classList.add('l-loading');
  setTimeout(() => { if (!shown) app.classList.add('l-slow'); }, T_SLOW - T_HOLD);
  setTimeout(finish, T_GIVEUP - T_HOLD);
}, T_HOLD);
