// The Reel launch (design/brand-v7/rapt/launch3: NOTES.md, preview.html), played inside the Try Rapt page with its
// sound (the Settle ending). The full ident only: the page under it is already drawn, so it is "Home ready" from the
// start and the way in begins at T_HOLD. Any key once it's ready skips to the way in, as the app's launch does.
// Classes go on the page's root (rl- prefixed, so the app's own launch classes on #app are never touched).
import { raptSound } from './sound.js';
import { watch } from './meter.js';

const T = { hold: 1400, wipe: 460, ready: 400 };
const CL = ['rl-on', 'rl-run', 'rl-wiping', 'rl-rm', 'rl-fading'];
const MARK_PATH = 'M1.5 2.333Q12 5.667 22.5 2.333Q23.5 2 23.5 3V21Q23.5 22 22.5 21.667Q12 18.333 1.5 21.667Q0.5 22 0.5 21V3Q0.5 2 1.5 2.333ZM4.2 5.47Q12 6.53 19.8 5.47Q20.3 5.4 20.3 5.9V18.1Q20.3 18.6 19.8 18.53Q12 17.47 4.2 18.53Q3.7 18.6 3.7 18.1V5.9Q3.7 5.4 4.2 5.47Z';
export const markSvg = (cls) => `<svg class="${cls}" viewBox="0 0 24 24" role="img" aria-label="Rapt"><path fill="#F4F2EE" fill-rule="evenodd" d="${MARK_PATH}"/><rect x="6" y="7.125" width="6.5" height="9.75" rx="0.7" fill="#F4F2EE"/></svg>`;

export const reelHtml = () => `<div class="rl-launch" aria-hidden="true"><div class="rl-bg"></div><div class="rl-cam"><div class="rl-scr"><svg viewBox="0 0 24 24"><path fill="#F4F2EE" fill-rule="evenodd" d="${MARK_PATH}"/></svg></div><div class="rl-roll"><div class="rl-dim">${[-430, -350, -270, -190, -110, 50, 130, 210, 290, 370, 450, 530, 610].map((x) => `<i style="left:${x}px"></i>`).join('')}</div><div class="rl-lit"></div></div></div><svg class="rl-wo"><text x="0" y="93.09" font-family="'Funnel Display'" font-weight="800" font-size="93.09" letter-spacing="-4.19" fill="#F4F2EE">Rapt</text></svg></div>`;

let run = null;   // { root, ready, reduce, timers }
export const reelRunning = () => !!run;

export async function playReel(root) {
  if (run) return;
  const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  run = { root, ready: false, reduce, timers: [], done: false };
  const me = run;
  raptSound.preloadLaunch();
  // the word is live text: the bundled font first (it never waits more than half a second)
  await Promise.race([document.fonts?.load?.('800 93px "Funnel Display"').catch(() => {}), new Promise((r) => setTimeout(r, 500))]);
  if (run !== me) return;
  root.classList.remove(...CL); void root.offsetWidth;
  root.classList.add('rl-on');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (run !== me) return;
    if (reduce) root.classList.add('rl-rm'); else { root.classList.add('rl-run'); raptSound.launch(); }
    watch('launch', T.hold + T.wipe + 100);
    later(() => { me.ready = true; }, T.ready);
    later(finish, T.hold);
  }));
}
const later = (f, ms) => run?.timers.push(setTimeout(f, ms));
function finish() {
  const me = run;
  if (!me || me.done) return;
  me.done = true;
  const { root } = me;
  const end = () => { root.classList.remove(...CL); me.timers.forEach(clearTimeout); if (run === me) run = null; };
  if (me.reduce) { root.classList.add('rl-fading'); me.timers.push(setTimeout(end, 130)); return; }
  root.classList.add('rl-wiping');
  watch('launch', T.wipe + 100);
  me.timers.push(setTimeout(end, T.wipe + 40));
}
// A key while it plays: nothing until it's ready, then the way in. Always swallowed.
export function reelKey() { if (!run) return false; if (run.ready) finish(); return true; }
// Leaving the page mid-launch: everything off at once
export function reelStop() { if (!run) return; run.timers.forEach(clearTimeout); run.root.classList.remove(...CL); run = null; }
