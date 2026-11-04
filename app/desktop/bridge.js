// The Windows app's stand-in for the TV's native bridge (app/tv/js/native.js), as app/phone/bridge.js is the
// iPhone's: the TV's player.js, replay.js and titlecopies.js talk to "the native player" through play / command /
// onEvent (the protocol in design/ui-v1/player-v2 and catchup/PORT-NATIVE.md). Here that player is mpv, embedded by
// app/desktop/player.js, which registers itself as the host. This file must load before any TV module (main.js
// imports it first): native.js reads window.TUNER_NATIVE once, when it is first imported.
const T = window.tuner || null;   // (null in a plain browser: the views' tests stub it)
const listeners = new Set();
let session = 0;
export const host = { impl: null };   // set by player.js: { play(opts, session), command(what, arg), stop() }
export const emitEvent = (e) => { for (const f of listeners) { try { f(e); } catch (err) { console.error(err); } } };
export const currentSession = () => session;
const version = { version: '', code: 0 };
export const desktopInfo = () => ({ ...version, tv: false, desktop: true, replay: true, subs: true, segments: true });
const ready = (async () => {
  try { const v = await T?.version?.(); if (v) { version.version = v; version.code = +String(v).split('.').pop() || 0; } } catch { /* a browser */ }
  return desktopInfo();
})();
let ustatus = { state: T ? 'idle' : 'dev' };
const usubs = new Set();
T?.updates?.onStatus?.((s) => { ustatus = s; usubs.forEach((f) => f(s)); });
T?.updates?.status?.().then((s) => { if (s) { ustatus = s; usubs.forEach((f) => f(s)); } }).catch(() => {});
export const updates = {
  status: () => ustatus,
  check: () => T?.updates?.check(),
  install: () => T?.updates?.install(),
  onStatus: (f) => { usubs.add(f); return () => usubs.delete(f); },
};
window.TUNER_NATIVE = {
  platform: 'windows',
  ready,
  info: desktopInfo,
  version: async () => (await ready).version,
  updates,
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
  onResume: (f) => { T?.onResume?.(f); document.addEventListener('visibilitychange', () => { if (!document.hidden) f(); }); },
  exit: () => T?.quit?.(),
};
