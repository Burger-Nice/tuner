// The Android / Google TV bridge (Capacitor): the native Media3 player and the updater.
// In a desktop browser (development, tests) there is no bridge and `native` is null.
const CAP = window.Capacitor;
export const ANDROID = CAP?.getPlatform?.() === 'android';

function bridge() {
  if (!ANDROID || !CAP.registerPlugin) return null;
  const TP = CAP.registerPlugin('TunerPlayer');
  const AppPlugin = CAP.registerPlugin('App');
  let info = { version: '', code: 0, tv: true };
  const ready = TP.info().then((i) => (info = i)).catch(() => info);
  let ustatus = { state: 'idle' };
  const usubs = [];
  const uset = (st) => { ustatus = st; usubs.forEach((f) => f(st)); };
  let lastCheck = 0;
  const ucheck = async () => {
    if (ustatus.state === 'downloading') return;
    lastCheck = Date.now();
    uset({ state: 'checking' });
    try {
      const me = await ready;
      const r = await fetch('https://github.com/Burger-Nice/tuner/releases/latest/download/android.json', { cache: 'no-store' });
      const latest = await r.json();
      uset(+latest.code > +me.code ? { state: 'ready', version: latest.version, url: latest.url, notes: latest.notes || '' } : { state: 'current' });
    } catch {
      uset({ state: 'error', message: 'Could not reach GitHub.' });
    }
  };
  TP.addListener('update', (e) => uset({ ...ustatus, state: 'downloading', percent: e.percent }));
  setTimeout(ucheck, 8000);
  setInterval(ucheck, 4 * 3600e3);
  // The TV keeps apps running in the background, so check again whenever the app comes back on screen.
  const resumeSubs = [];
  AppPlugin.addListener('resume', () => {
    if (Date.now() - lastCheck > 10 * 60e3) setTimeout(ucheck, 1500);
    resumeSubs.forEach((f) => f());
  });
  return {
    platform: 'android',
    ready,
    info: () => info,
    version: async () => (await ready).version,
    updates: {
      status: () => ustatus,
      check: ucheck,
      install: async () => {
        if (!ustatus.url) return;
        const was = ustatus;
        uset({ ...was, state: 'downloading', percent: 0 });
        try { await TP.installUpdate({ url: was.url }); uset({ ...was, state: 'ready' }); } catch (e) { uset({ ...was, state: 'ready', note: e.message }); }
      },
      onStatus: (f) => usubs.push(f),
    },
    sfx: {
      load: (names) => TP.sfxLoad({ names }),
      play: (name, rate, gain) => { TP.sfxPlay({ name, rate, gain }).catch(() => {}); },
    },
    player: {
      play: (o) => TP.play(o),
      stop: () => TP.stop(),
      command: (args) => TP.command({ args }),
      onEvent: (f) => TP.addListener('event', f),
    },
    onBack: (f) => AppPlugin.addListener('backButton', f),
    onResume: (f) => resumeSubs.push(f),
    exit: () => AppPlugin.exitApp?.() ?? AppPlugin.minimizeApp(),
  };
}

export const native = bridge();
if (ANDROID && !native) console.error('airglow: the Android plugin bridge is missing, so the native player and updates are off.');
