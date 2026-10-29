// The iPhone's stand-in for the TV's native bridge (app/tv/js/native.js): the TV's player.js, replay.js and
// titlecopies.js talk to "the native player" through play / command / onEvent (the protocol in
// design/ui-v1/player-v2 and catchup/PORT-NATIVE.md). Here that player is the HTML5 <video> in app/phone/player.js,
// which registers itself as the host. This file must load before any TV module (main.js imports it first): native.js
// reads window.TUNER_NATIVE once, when it is first imported.
const listeners = new Set();
let session = 0;
export const host = { impl: null };   // set by player.js: { play(opts, session), command(what, arg), stop() }
export const emitEvent = (e) => { for (const f of listeners) { try { f(e); } catch (err) { console.error(err); } } };
export const currentSession = () => session;
const CAP = window.Capacitor;
const version = { version: '', code: 0 };
export const phoneInfo = () => ({ ...version, tv: false, phone: true, replay: false, subs: false, segments: false });
// The app's own version (Capacitor's App plugin), for Account > Updates.
const ready = (async () => {
  try {
    const App = CAP?.Plugins?.App || CAP?.registerPlugin?.('App');
    const i = App ? await App.getInfo() : null;
    if (i) { version.version = i.version || ''; version.code = +i.build || 0; }
  } catch { /* (a desktop browser: no plugin) */ }
  return phoneInfo();
})();
window.TUNER_NATIVE = {
  platform: 'ios',
  ready,
  info: phoneInfo,
  version: async () => (await ready).version,
  updates: { status: () => ({ state: 'idle' }), check: () => {}, install: () => {}, onStatus: () => {} },
  player: {
    async play(opts) {
      if (!host.impl) return { ok: false, error: 'The player is not ready.' };
      const s = ++session;
      const r = await host.impl.play(opts, s);
      return r?.ok === false ? r : { ok: true, session: s };
    },
    stop: () => host.impl?.stop(),
    command: (args) => { try { host.impl?.command(args[0], args[1]); } catch (e) { console.error(e); } return Promise.resolve(); },
    onEvent: (f) => { listeners.add(f); return { remove: () => listeners.delete(f) }; },
  },
  onBack: () => {},
  onResume: (f) => document.addEventListener('visibilitychange', () => { if (!document.hidden) f(); }),
  exit: () => {},
};
