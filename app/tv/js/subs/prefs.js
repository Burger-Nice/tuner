// Account > Settings > Languages, the subtitle part (design/ui-v1/subtitles/SPEC.md 6.2), the move from today's one
// `subLang` setting, and what airglow remembers per title: the subtitle picked and his "Early or late" steps (7.2, 7.3).
// Plain functions: the settings object and a store ({ get, set }) are passed in, so tests run them in node.

export const MODES = { always: 'Always', foreign: 'Only when the sound isn\'t in your language', off: 'Off' };
export const SOUNDS = { leave: 'Leave out', prefer: 'Prefer them' };

// The subtitle settings, with their defaults:
//   subMode   'always' | 'foreign' | 'off'           (Subtitles)
//   subLangs  ['Icelandic', 'English']                (Subtitle languages; none saved = Shown first)
//   subSounds 'leave' | 'prefer'                      (Subtitles with sounds)
//   subOnline true | false                            (Subtitles from OpenSubtitles; the owner said yes, 27 Oct)
export function subPrefs(s) {
  const shown = s.langs?.length ? s.langs : ['English'];
  return {
    mode: MODES[s.subMode] ? s.subMode : 'always',
    langs: Array.isArray(s.subLangs) && s.subLangs.length ? s.subLangs : shown,
    shown,
    sounds: s.subSounds === 'prefer',
    online: s.subOnline !== false,
  };
}

// Today's player still reads one `subLang` (Auto, Off or a language) and sends it to Media3 as the preferred text
// language. Until the native player takes the list (PORT-NATIVE.md), it gets the first subtitle language, or Off: with
// Media3 a preferred language that the file lacks picks nothing, as today's Auto did.
export const legacySubLang = (p) => (p.mode === 'off' ? 'off' : p.langs[0] || 'auto');

// The move (SPEC 6.2), once, when there is no subMode yet:
//   auto (the default, his value) -> Always, with Icelandic, English (his answer, 27 Oct 2026);
//   off -> Off;  a language -> Always, with that language first, then the rest of Shown first.
// A new install (no account yet) gets Always with Shown first. -> the patch to save, or null when there's nothing to do.
export function migrate(s, { hasAccounts = true } = {}) {
  if (s.subMode) return null;
  const shown = s.langs?.length ? s.langs : ['English'];
  const v = s.subLang || 'auto';
  let patch;
  if (v === 'off') patch = { subMode: 'off' };
  else if (v === 'auto') patch = hasAccounts ? { subMode: 'always', subLangs: ['Icelandic', 'English'] } : { subMode: 'always' };
  else patch = { subMode: 'always', subLangs: [v, ...shown.filter((l) => l !== v)] };
  const p = subPrefs({ ...s, ...patch });
  patch.subLang = legacySubLang(p);
  return patch;
}

// The rows' values on Account > Languages.
export function rowValues(s) {
  const p = subPrefs(s);
  return { shown: p.shown.join(', '), mode: p.mode === 'foreign' ? 'Only when it\'s not your language' : MODES[p.mode], langs: p.langs.join(', '), sounds: p.sounds ? SOUNDS.prefer : SOUNDS.leave, online: p.online };
}

// ---------- per title ----------
// subpick:<title key> -> { source: 'file'|'opensubtitles'|'off', id, lang } (SPEC v1.1 S21)
// subtime:<title key>:<copy id>:<subtitle id> -> seconds, his own steps on top of the automatic fix (0.5 s steps, +-60 s)
// subrel:<series key>:<release> -> seconds: the next episode starts from the last value when its file is from the
//   same release (SPEC 7.3)
// All in one record per account (the store keeps JSON in localStorage), the least recently used out past 600.
const CAP = 600;
export const step = (x) => Math.max(-60, Math.min(60, Math.round(x * 2) / 2));
export function makeMemory(store, key = 'submem') {
  let m = null;
  const load = () => (m || (m = store.get(key, {}) || {}));
  const save = () => {
    const ks = Object.keys(m);
    if (ks.length > CAP) ks.sort((a, b) => (m[a].at || 0) - (m[b].at || 0)).slice(0, ks.length - CAP).forEach((k) => delete m[k]);
    store.set(key, m);
  };
  const get = (k) => { const v = load()[k]; return v ? v.v : undefined; };
  const put = (k, v) => { load(); if (v === undefined) delete m[k]; else m[k] = { v, at: Date.now() }; save(); };
  return {
    pick: (title) => get(`subpick:${title}`) || null,
    setPick: (title, p) => put(`subpick:${title}`, p ? { source: p.source, id: p.id || '', lang: p.lang || '' } : undefined),
    // Early or late
    offset: (title, copy, sub) => get(`subtime:${title}:${copy}:${sub}`) || 0,
    setOffset(title, copy, sub, secs, { series, release } = {}) {
      const v = step(secs);
      put(`subtime:${title}:${copy}:${sub}`, v || undefined);
      if (series && release) put(`subrel:${series}:${release}`, v || undefined);
      return v;
    },
    // the value a new episode starts from: its own, else the series' last for the same release
    offsetFor(title, copy, sub, { series, release } = {}) {
      const own = get(`subtime:${title}:${copy}:${sub}`);
      if (own !== undefined) return own;
      return (series && release && get(`subrel:${series}:${release}`)) || 0;
    },
    // "You change it by more than 3 s, twice" -> "Still off? ▼ Another file"
    noteBigChange(title) { const n = (get(`subbig:${title}`) || 0) + 1; put(`subbig:${title}`, n); return n >= 2; },
    forget: (title) => { load(); for (const k of Object.keys(m)) if ([`subpick:${title}`, `subbig:${title}`].includes(k) || k.startsWith(`subtime:${title}:`)) delete m[k]; save(); },
  };
}
