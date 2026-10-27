// Subtitles from OpenSubtitles and real quality per copy: the app's side (design/ui-v1/subtitles/SPEC.md 9.1).
// The pieces are in js/subs/ (plain functions, tested in node by tests/subs-*.js); this file wires them to the app:
// the settings, the account, the caches, the native check, and the hooks the title page and the player use
// (design/ui-v1/subtitles/PORT-UI.md).
//
//   initSubs()                    once at start: the settings move (6.2) and the check queue
//   subSettings() / saveSubSettings(patch)
//   checkCopies(versions, why)    ask for quality checks ('title' | 'continue' | 'saved'); never starts a stream
//   checkedFor(version)           what the check found (copies.js `checked`), or null
//   prepare(req)                  the subtitles for a title or an episode -> state (and 'subs' events as it changes)
//   subState(key) / forPlayer(key) / subMemory()
import { S, store, scoped, settings, saveSettings, on, emit } from './state.js';
import { native, ANDROID } from './native.js';
import { watching } from './player.js';
import { parse, hasSounds, soundsShare, toSrt } from './subs/parse.js';
import { langVerdict } from './subs/lang.js';
import { checkFile, WORDS } from './subs/timing.js';
import { fetchList, fetchFile, normalise, downloadPlan, choose, listUrl } from './subs/opensubs.js';
import { readFingerprint } from './subs/hash.js';
import { subPrefs, migrate, legacySubLang, makeMemory } from './subs/prefs.js';
import { makeProbes, checkedOf } from './subs/probes.js';

const Core = window.Core;

// ---------- settings ----------
export const subSettings = () => subPrefs(settings());
export function saveSubSettings(patch) {
  const s = saveSettings(patch);
  const legacy = legacySubLang(subPrefs(s));
  if (s.subLang !== legacy) saveSettings({ subLang: legacy });   // today's player reads subLang (prefs.js)
  emit('subs-settings');
  return subPrefs(settings());
}

// ---------- per-title memory (subpick, subtime), one record per account ----------
// subMemory().pick(title), .setPick(title, { source, id, lang }), .offsetFor(title, copy, sub, { series, release }),
// .setOffset(...), .noteBigChange(title), .forget(title) (prefs.js makeMemory). null without an account.
const mems = new Map();
const scopedStore = { get: (k, d) => store.get(scoped(k), d), set: (k, v) => store.set(scoped(k), v) };
export function subMemory() {
  if (!S.acc) return null;
  if (!mems.has(S.acc.id)) mems.set(S.acc.id, makeMemory(scopedStore));
  return mems.get(S.acc.id);
}

// ---------- the quality check ----------
let previewing = 0;
export const setPreviewing = (on) => { previewing = on ? 1 : 0; if (!on) probes?.poke(); };
const TP = () => (ANDROID ? window.Capacitor?.Plugins?.TunerPlayer : null);
// The native check exists once the player says so (PORT-NATIVE.md: info().probe). In a desktop browser (development,
// the walkthrough) the fingerprint reads run over fetch, with no formats.
const nativeProbe = () => !!native?.info?.().probe && !!TP();
const engine = async (job, signal) => {
  if (window.TUNER_TEST && window.__probeEngine) return window.__probeEngine(job, signal);   // (browser tests: a fake native check)
  if (nativeProbe()) {
    const p = TP();
    const stop = () => p.probeCancel?.().catch(() => {});
    signal.addEventListener('abort', stop);
    try {
      const r = await p.probe({ id: job.key, url: job.url, headers: job.headers || {} });
      // a check that Play cut short, or asked for while the player is open, is asked again later (never kept)
      if (r && r.status === 'couldnt' && r.why === 'cancelled') return { status: 'unavailable', why: 'cancelled' };
      return r || { status: 'couldnt', why: 'no answer' };
    } finally { signal.removeEventListener('abort', stop); }
  }
  if (ANDROID) return { status: 'unavailable', why: 'no native check yet' };
  const r = await readFingerprint(job.url, { headers: job.headers, signal });
  return { status: r.status, size: r.size, etag: r.etag, hash: r.hash, formats: null, dur: 0, mbps: 0, why: r.why };
};
// another device on the account: a login call reads active_cons before each batch (M3U: 1 connection, none known)
async function activeCons() {
  if (S.acc?.type !== 'xtream' || !S.src?.login) return 0;
  const d = await S.src.login();
  if (d?.user_info) S.info = { ...(S.info || {}), user_info: d.user_info };
  return +d?.user_info?.active_cons || 0;
}
let probes = null, probesAcc = '';
function probeQueue() {
  if (!S.acc) return null;
  if (probes && probesAcc === S.acc.id) return probes;
  probesAcc = S.acc.id;
  const k = `probes:${S.acc.id}`;
  probes = makeProbes({
    now: () => Date.now(),
    engine,
    streamsInUse: () => (watching() ? 1 : 0) + previewing,
    activeCons,
    load: () => Core.cache.get(k),
    save: (obj) => Core.cache.set(k, obj),
    budgetStore: { get: () => store.get(scoped('probeBudget'), null), set: (v) => store.set(scoped('probeBudget'), v) },
  });
  probes.on((e) => {
    if (e.type === 'result') { emit('probed', e.key); for (const st of states.values()) if (st.copyKey === e.key) refresh(st.key); }
  });
  return probes;
}
export const probeKey = (v) => `${S.acc?.id}:${v.kind}:${v.id}`;
export const probeJob = (v) => ({ key: probeKey(v), url: v.url, headers: settings().ua ? { 'User-Agent': settings().ua } : {} });
// versions: provider items ({ kind, id, url }), name-best first. A no-op without an account or a stream URL.
export function checkCopies(versions, why = 'title') {
  if (ANDROID && !nativeProbe()) return;   // until the native check is in (PORT-NATIVE.md); never JS range reads on the TV
  const q = probeQueue(); if (!q) return;
  q.want(versions.filter((v) => v?.url).map(probeJob), why);
}
export const leaveCopies = (versions) => probeQueue()?.leave(versions.map(probeKey));
export const checkFor = (v) => (v ? probeQueue()?.peek(probeKey(v)) || null : null);
export const checkedFor = (v) => checkedOf(checkFor(v));
export const probeStatus = () => probeQueue()?.status() || null;
// "Plays on this TV", decided now from the stored formats and the audio route (PORT-NATIVE.md 1.5): -> Map(version id ->
// { video, audio, reason }) for the checked copies; unchecked ones (and every copy before the native check exists) are
// left out, and copies.js counts them as playing. Kept 60 s (the soundbar can go off).
let playCache = { at: 0, m: new Map() };
export async function playable(versions) {
  const tp = window.TUNER_TEST && window.__playable ? { playable: window.__playable } : nativeProbe() ? TP() : null;   // (browser tests: a fake TV)
  if (!tp) return new Map();
  if (Date.now() - playCache.at > 60e3) playCache = { at: Date.now(), m: new Map() };
  const ask = versions.filter((v) => !playCache.m.has(probeKey(v)) && checkFor(v)?.formats).map((v) => ({ id: probeKey(v), formats: checkFor(v).formats }));
  if (ask.length) { try { const r = await tp.playable({ copies: ask }); for (const [k, x] of Object.entries(r || {})) playCache.m.set(k, x); } catch { /* not there yet */ } }
  return new Map(versions.filter((v) => playCache.m.has(probeKey(v))).map((v) => [v.id, playCache.m.get(probeKey(v))]));
}
export const noteStart = (v, facts) => probeQueue()?.noteStart(probeKey(v), facts);
// Play cancels a check in flight; the player closing lets the queue go on
export const cancelChecks = () => probeQueue()?.cancel();
// The checks kept from before, read once so posters can show them (posters never ask: PORT-UI.md 1); 'probed' redraws.
let loaded = '';
export function loadChecks() { const q = probeQueue(); if (!q || loaded === S.acc.id) return; loaded = S.acc.id; q.ready().then(() => emit('probed', '')); }
on('player-closed', () => probes?.poke());
on('session', () => { probes = null; probesAcc = ''; });

// ---------- lists and files, cached ----------
// Lists: one request per title or episode, kept 2 days; a failure is retried after 60 s, then every 5 min.
// Files: kept 30 days, 80 files, the least recently used out first (IndexedDB, through Core.cache).
const LIST_KEEP = 2 * 86400e3, FILE_KEEP = 30 * 86400e3, FILE_MAX = 80;
const listFails = new Map();   // url -> { n, next }
async function getList(q) {
  const url = listUrl(q);
  const k = `subs:list:${url}`;
  const old = await Core.cache.get(k);
  if (old && Date.now() - old.at < LIST_KEEP) return { ok: true, files: normalise(old.json, q), cached: true };
  const f = listFails.get(url);
  if (f && Date.now() < f.next) return { ok: false, why: 'waiting', retryAt: f.next, stale: old ? normalise(old.json, q) : null };
  const r = await fetchList(q, { fetch: async (u, o) => { const res = await fetch(u, o); if (!res.ok) return res; const json = await res.clone().json(); Core.cache.set(k, { at: Date.now(), json }); return res; } });
  if (r.ok) { listFails.delete(url); return r; }
  const n = (f?.n || 0) + 1, next = Date.now() + (n === 1 ? 60e3 : 5 * 60e3);
  listFails.set(url, { n, next });
  return { ...r, retryAt: next, stale: old ? normalise(old.json, q) : null };
}
let fileIdx = null;   // id -> { at }, the files kept (one copy in memory: downloads run side by side)
const saveIdx = () => {
  const ks = Object.keys(fileIdx);
  if (ks.length > FILE_MAX) ks.sort((a, b) => fileIdx[a].at - fileIdx[b].at).slice(0, ks.length - FILE_MAX).forEach((x) => { delete fileIdx[x]; Core.cache.set(`subs:file:${x}`, null); });
  store.set('subsFiles', fileIdx);
};
async function getFile(f) {
  const k = `subs:file:${f.id}`;
  fileIdx = fileIdx || store.get('subsFiles', {}) || {};
  const hit = fileIdx[f.id] && Date.now() - fileIdx[f.id].at < FILE_KEEP ? await Core.cache.get(k) : null;
  let text = hit?.text;
  if (text == null) {
    const r = await fetchFile(f.url);
    if (!r.ok) return null;
    const p = parse(r.bytes, f.lang);
    if (!p.format) return { format: null, cues: [] };
    text = new TextDecoder().decode(r.bytes);
    await Core.cache.set(k, { text });
  }
  fileIdx[f.id] = { at: Date.now() };
  saveIdx();
  return parse(text, f.lang);
}

// ---------- the subtitles for one title (SPEC 3) ----------
// req: { key (title key: keyOf), name, imdb ('tt…'), level ('sure'|'likely'|'unsure', from imdb.js matchTitle),
//        season, episode (an episode), series (the series' key, for Early or late across episodes), episodeKnown
//        (false: Cinemeta's videos[] lacks it), runtime (Cinemeta, minutes), version (the provider item playing:
//        { kind, id, url }), soundLang (the copy's language), dub (copies.js isDub()) }
// state: { key, status, on, offReason, langs, ready, missing, others, files, retryAt, note, pill, side, verdicts }
//   status: 'looking' | 'ready' | 'none' | 'down' | 'unsure' | 'wrong-film' | 'off' | 'file-only'
const states = new Map();   // key -> state (the last 30)
const reqs = new Map();
export const subState = (key) => states.get(key) || null;
function put(st) {
  states.delete(st.key); states.set(st.key, st);
  if (states.size > 30) states.delete(states.keys().next().value);
  emit('subs', st.key);
  return st;
}
function refresh(key) { const r = reqs.get(key); if (r) prepare(r, { again: true }); }
// The add-on down or slow: asked again at the retry time (60 s, then every 5 min) while the title is the last one asked
// for (the open title page, or the film playing). forget(key) stops it.
const retries = new Map();
function retryLater(st) {
  clearTimeout(retries.get(st.key)); retries.delete(st.key);
  if (!st.retryAt || [...reqs.keys()].pop() !== st.key) return;
  retries.set(st.key, setTimeout(() => { retries.delete(st.key); refresh(st.key); }, Math.max(1000, st.retryAt - Date.now() + 200)));
}
export function forgetSubs(key) { clearTimeout(retries.get(key)); retries.delete(key); reqs.delete(key); }

// The player's "Try now" (the add-on down): ask again at once, past the retry wait.
export function retryNow(key) { const r = reqs.get(key); if (!r) return null; listFails.clear(); return prepare(r, { again: true }); }

export async function prepare(req, { again = false } = {}) {
  reqs.delete(req.key); reqs.set(req.key, req);   // (the last one asked for is last)
  if (reqs.size > 30) reqs.delete(reqs.keys().next().value);
  const prefs = subSettings();
  // a language picked in the player's Other languages is fetched for this title too (after his own)
  if (req.alsoLang && !prefs.langs.includes(req.alsoLang)) prefs.langs = [...prefs.langs, req.alsoLang];
  const v = req.version || null;
  const entry = v ? checkFor(v) : null;
  const checked = checkedOf(entry);
  const copy = { soundLang: req.soundLang || checked?.lang || '', dub: !!req.dub, inFile: checked?.inFile || [] };
  const base = { key: req.key, copyKey: v ? probeKey(v) : '', prefs, copy, files: [], others: [], retryAt: 0, note: '' };
  const fileOnly = (status, note = '') => put(finish({ ...base, status, note, choice: choose({ ...prefs, online: false }, copy, []) }));
  // (Off still lists them: the panel and the sheet show what there is, and the choice says Off)
  if (!prefs.online) return fileOnly('file-only');
  if (!req.imdb || req.level === 'unsure') return fileOnly(req.dub ? 'file-only' : 'unsure');
  if (req.season != null && req.episodeKnown === false) return fileOnly('file-only');
  // a Likely match re-checked when the copy's length arrives (RANKING.md 4.2): more than 8% off drops the downloads
  const lenMin = checked?.len ? checked.len / 60 : 0;
  if (req.level === 'likely' && req.season == null && lenMin && req.runtime && Math.abs(lenMin - req.runtime) / req.runtime > 0.08) return fileOnly('wrong-film', 'These subtitles were for another film');
  if (!again && !states.has(req.key)) put(finish({ ...base, status: 'looking', choice: choose(prefs, copy, []) }));
  const q = { imdb: req.imdb, season: req.season, episode: req.episode, hash: entry?.hash || '', size: entry?.size || 0, base: store.get('subsBase', undefined) };   // (tuner.subsBase: a fake add-on in tests)
  const list = await getList(q);
  if (!list.ok && !list.stale) { const st = put(finish({ ...base, status: 'down', retryAt: list.retryAt || 0, triedAt: Date.now(), choice: choose(prefs, copy, []) })); retryLater(st); return st; }
  const files = list.ok ? list.files : list.stale;
  const ctx = { copyFps: checked?.fps || 0, copyLen: checked?.len || 0, pairCache: new Map() };
  const got = new Map(), tried = new Set();   // id -> a downloaded file with its cues
  // up to 3 rounds: a file that fails to parse, is in another language or is off against an anchor is skipped and the
  // next one is tried
  for (let round = 0; round < 3; round++) {
    const todo = downloadPlan(prefs, copy, files, ctx).files.filter((f) => !tried.has(f.id));
    if (!todo.length) break;
    todo.forEach((f) => tried.add(f.id));
    await Promise.all(todo.map(async (f) => {
      const p = await getFile(f);
      if (!p || !p.cues.length) { f.dropped = 'parse'; return; }
      f.cues = p.cues; f.format = p.format;
      f.sounds = hasSounds(f.fileName, p.cues); f.soundsShare = soundsShare(p.cues);
      const lv = langVerdict(p.cues, f.lang);
      if (lv !== 'ok') { if (prefs.langs.includes(lv.relabel)) f.lang = lv.relabel; else { f.dropped = 'language'; return; } }
      got.set(f.id, f);
    }));
    // the timing check, again for any file still unchecked now that more files are in
    const have = [...got.values()];
    const hashFile = have.find((f) => f.m === 'h') || null;
    for (const f of have) {
      if (f.timing && f.timing.verdict !== 'unchecked') continue;
      f.timing = checkFile(f, { ...ctx, hashFile, others: have.filter((x) => x !== f) });
      if (f.timing.skip) { f.dropped = 'timing'; got.delete(f.id); }
    }
  }
  const choice = choose(prefs, copy, files.filter((f) => !f.dropped), ctx);
  const others = [...new Set(files.filter((f) => !f.dropped && f.lang && !prefs.langs.includes(f.lang)).map((f) => f.lang))];
  const anyMine = choice.perLang.some((p) => p.source);
  const st = put(finish({ ...base, files: [...got.values()], others, choice, status: anyMine ? 'ready' : 'none', retryAt: list.ok ? 0 : list.retryAt || 0, down: !list.ok }));
  retryLater(st);
  return st;
}

// The words the title page and the player show (SPEC 4.2, 7.2, 8). One text for the slot; the UI decides priority.
function finish(st) {
  const c = st.choice, p = st.prefs;
  const at = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const langs = c.perLang.map((x) => ({
    lang: x.lang, source: x.source, track: x.track || null, fileId: x.file?.id || '',
    sounds: !!x.file?.sounds, ready: x.source === 'file' || !!x.file?.cues,
    verdict: x.source === 'file' ? (x.track?.tagged === false ? 'untagged' : 'made') : x.file?.timing?.verdict || (x.file ? 'pending' : ''),
    words: x.source === 'file' ? (x.track?.tagged === false ? 'Its file doesn\'t say the language' : 'Made for this copy') : x.file?.timing?.words || '',
    anchored: x.source === 'file' ? x.track?.tagged !== false : !!x.file?.timing?.anchored,
  }));
  let pill, side = '';
  const on = c.on;
  if (st.status === 'unsure') { pill = 'Subtitles: which film is it?'; side = st.note || ''; }
  else if (st.status === 'wrong-film') { pill = 'Subtitles: which film is it?'; side = st.note; }
  else if (p.mode === 'off') pill = 'Subtitles: Off';
  else if (on) pill = `Subtitles: ${on.lang}`;
  else if (c.offReason) pill = 'Subtitles: Off';
  else if (st.status === 'looking') pill = 'Subtitles: looking…';
  else if (st.status === 'down') pill = 'Subtitles: none yet';
  else pill = 'Subtitles: none found';
  if (!side) {
    if (st.status === 'down') side = `OpenSubtitles isn't answering · trying again at ${at(st.retryAt || Date.now() + 60e3)}`;
    else if (st.status === 'none') side = 'Not in the file, none on OpenSubtitles';
    else if (on) {
      const src = on.source === 'file' ? 'In the file' : 'From OpenSubtitles';
      const readyToo = langs.find((l) => l.lang !== on.lang && l.source);
      const missing = c.missing[0];
      side = readyToo ? `${src} · ${readyToo.lang}${readyToo.source === 'file' ? ' in the file' : ' ready too'}` : missing ? `${src} · No ${missing} for this film` : src;
      if (on.source === 'file' && readyToo?.source === 'opensubtitles') side = `In the file · ${readyToo.lang} from OpenSubtitles`;
    } else if (c.missing.length && c.missing.length < p.langs.length) side = `No ${c.missing[0]} for this film`;
  }
  return { ...st, on, offReason: c.offReason, langs, ready: c.ready, missing: c.missing, pill, side };
}

// ---------- what the native player gets (SPEC 9.1: about 240 KB once; PORT-NATIVE.md `subs`) ----------
// { list: [{ id, lang, source, sounds, verdict, words, anchored }], pick: { source, id, lang } | null,
//   files: [{ id, lang, text (SRT, cleaned), speed, autoOffset, mine, verdict }] }
export function forPlayer(key, opts = {}) {
  const copyId = opts.copyId || '';
  const st = states.get(key);
  if (!st) return null;
  const mem = subMemory();
  const pick = mem?.pick(key) || (st.on ? { source: st.on.source, id: st.on.source === 'file' ? `track:${st.on.track?.raw || st.on.lang}` : st.langs.find((l) => l.lang === st.on.lang)?.fileId, lang: st.on.lang } : st.prefs.mode === 'off' || st.offReason ? { source: 'off', id: '', lang: '' } : null);
  const files = st.files.filter((f) => f.cues && !f.dropped).map((f) => ({
    id: f.id, lang: f.lang, text: toSrt(f.cues), speed: f.timing?.speed || 1, autoOffset: f.timing?.offset || 0,
    mine: mem?.offsetFor(key, copyId, f.id, { series: opts.series, release: f.release }) || 0, release: f.release, verdict: f.timing?.verdict || 'unchecked', words: f.timing?.words || WORDS.unchecked, anchored: !!f.timing?.anchored, sounds: !!f.sounds,
  }));
  // (status, retryAt, triedAt, note: the panel's states, SPEC 7.6)
  return { title: key, copy: copyId, list: st.langs, pick, files, others: st.others, status: st.status, retryAt: st.retryAt || 0, triedAt: st.triedAt || 0, note: st.note || '' };
}
// ---------- start ----------
let started = false;
export function initSubs() {
  if (started) return; started = true;
  const patch = migrate(settings(), { hasAccounts: (store.get('accounts', []) || []).length > 0 });
  if (patch) saveSettings(patch);
}
