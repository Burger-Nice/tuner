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
    setTimeout(() => { app.classList.remove('l-on', 'l-rm', 'l-fading'); done(); }, 120);
    return;
  }
  app.classList.add('l-wiping');   // (no sound: the launch chord is the last thing you hear)
  setTimeout(() => { app.classList.remove('l-on', 'l-run', 'l-wiping'); done(); }, T_WIPE + 40);
}

// The first screen has drawn: wipe now if the intro is done, else as soon as it is.
export function launchReady() {
  if (ready) return;
  ready = true;
  if (performance.now() - t0 >= T_HOLD) finish();
}

// A key pressed once Home is ready skips the rest of the launch (that key only ends it: it doesn't act on Home).
// Until then keys are held back, as before.
export function launchKey() {
  if (shown) return false;
  if (ready) finish();
  return true;
}
// Resolves when the launch has gone (other start-up work that can wait, waits for it).
let done;
export const launchDone = new Promise((r) => (done = r));

// Start on the first frames the page can draw (the lockup is shapes, not text: nothing to wait for).
requestAnimationFrame(() => requestAnimationFrame(begin));
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
