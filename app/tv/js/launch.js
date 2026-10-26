// The launch (UI-SPEC section 8): the native splash hands over to #l-launch (same background, the wedge at the same
// place), the lockup builds in about 1.7 s and holds a beat, then the slab wipes to the first screen. If that screen isn't ready by then the
// lockup holds with the bands breathing, with a caption at 4 s; at 12 s the app is shown anyway (it has its own
// offline states). Keys do nothing until the wipe starts.
import { $ } from './util.js';
import { sfx } from './sfx.js';

// The lockup is built by 1.72 s and holds a beat, then the slab wipes for about half a second.
const T_HOLD = 2000, T_WIPE = 560, T_SLOW = 4500, T_GIVEUP = 12000;
const app = $('#app');
const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let open = false, ready = false, shown = false;
let t0 = performance.now();

export const launchOpen = () => open;

function finish() {
  if (shown) return;
  shown = true;
  open = true;
  app.classList.remove('l-loading', 'l-slow');
  if (reduce) {
    sfx.play('launch-brief');   // the chord lands with the fade
    app.classList.add('l-fading');
    setTimeout(() => app.classList.remove('l-on', 'l-rm', 'l-fading'), 120);
    return;
  }
  app.classList.add('l-wiping');   // (no sound: the launch chord is the last thing you hear)
  setTimeout(() => app.classList.remove('l-on', 'l-run', 'l-wiping'), T_WIPE + 40);
}

// The first screen has drawn: wipe now if the intro is done, else as soon as it is.
export function launchReady() {
  if (ready) return;
  ready = true;
  if (performance.now() - t0 >= T_HOLD) finish();
}

// Start once the page and its fonts are ready, so none of it plays while the TV is still busy loading
// (until then the wedge sits where the native splash left it).
const fontsReady = document.fonts?.ready || Promise.resolve();
Promise.race([fontsReady, new Promise((r) => setTimeout(r, 700))]).then(() => requestAnimationFrame(() => requestAnimationFrame(begin)));
function begin() {
  t0 = performance.now();
  if (!reduce) sfx.launch(t0);   // in step with the animation, however late its file was ready
  app.classList.add(reduce ? 'l-rm' : 'l-run');
  setTimeout(() => {
    if (ready) { finish(); return; }
    if (!reduce) app.classList.add('l-loading');
    setTimeout(() => { if (!shown) app.classList.add('l-slow'); }, T_SLOW - T_HOLD);
    setTimeout(finish, T_GIVEUP - T_HOLD);
  }, T_HOLD);
}
