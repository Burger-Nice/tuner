// Session state shared by every screen, plus a tiny event bus.
// Storage keys are the same as the previous app's, so accounts, favourites and Continue watching carry over.
import { keyOf } from './util.js';

const { store, settings, saveSettings } = window.Core;
export { store, settings, saveSettings };

const subs = new Map();
export const on = (ev, f) => { if (!subs.has(ev)) subs.set(ev, new Set()); subs.get(ev).add(f); return () => subs.get(ev).delete(f); };
export const emit = (ev, data) => subs.get(ev)?.forEach((f) => { try { f(data); } catch (e) { console.error(e); } });

export const S = {
  accounts: store.get('accounts', []),
  acc: null, src: null, info: null, epoch: 0,
  favs: {}, favOrder: [], progress: {}, recents: [],
};
export const scoped = (k) => `a:${S.acc.id}:${k}`;

export function startSession(acc, src, info) {
  S.epoch++;
  S.acc = acc; S.src = src; S.info = info;
  S.favs = store.get(scoped('favs'), {});
  S.favOrder = store.get(scoped('favOrder'), []);
  S.progress = store.get(scoped('progress'), {});
  S.recents = store.get(scoped('recents'), []);
  emit('session');
}
export function endSession() { S.epoch++; S.acc = S.src = S.info = null; emit('session'); }

// ---------- favourites (Saved) ----------
export const isFav = (it) => !!S.favs[keyOf(it)];
export function toggleFav(it, on) {
  const k = keyOf(it);
  const want = on ?? !S.favs[k];
  if (want) { const { _s, ...snap } = it; S.favs[k] = snap; if (!S.favOrder.includes(k)) S.favOrder.push(k); }
  else { delete S.favs[k]; S.favOrder = S.favOrder.filter((x) => x !== k); }
  store.set(scoped('favs'), S.favs);
  store.set(scoped('favOrder'), S.favOrder);
  emit('favs');
  return want;
}
// Favourites in the order set on Saved > Channels (older favourites without an order come last).
export function favList(kind) {
  const all = Object.entries(S.favs).filter(([, f]) => f.kind === kind);
  const pos = (k) => { const i = S.favOrder.indexOf(k); return i < 0 ? 1e9 : i; };
  return all.sort((a, b) => pos(a[0]) - pos(b[0])).map(([, f]) => f);
}
export function setFavOrder(keys) { S.favOrder = keys; store.set(scoped('favOrder'), keys); emit('favs'); }

// ---------- watching progress ----------
let lastSave = 0;
export function recordProgress(it, t, d, force) {
  if (!it || !d || !isFinite(d) || t == null) return;
  const now = Date.now();
  const { _s, ...snap } = it;
  S.progress[keyOf(it)] = { t, d, at: now, item: snap };
  if (!force && now - lastSave < 5000) return;
  lastSave = now;
  const keys = Object.keys(S.progress);
  if (keys.length > 400) keys.sort((a, b) => S.progress[a].at - S.progress[b].at).slice(0, keys.length - 400).forEach((k) => delete S.progress[k]);
  store.set(scoped('progress'), S.progress);
  emit('progress');
}
export const progressOf = (it) => S.progress[keyOf(it)];
export const inProgress = (p) => p && p.t > 30 && p.t < p.d * 0.94;
export function markWatched(it) {
  S.progress[keyOf(it)] = { t: 1, d: 1, at: Date.now(), item: it, done: true };
  store.set(scoped('progress'), S.progress);
  emit('progress');
}
// Continue watching: part-way titles, newest first, one entry per series.
export function continueRows() {
  const rows = Object.values(S.progress).filter(inProgress).sort((a, b) => b.at - a.at);
  const seen = new Set(), out = [];
  for (const p of rows) {
    if (p.item.kind === 'episode') { if (seen.has(p.item.seriesId)) continue; seen.add(p.item.seriesId); }
    out.push(p);
  }
  return out;
}

export function addRecent(ch) {
  S.recents = [ch.id, ...S.recents.filter((id) => id !== ch.id)].slice(0, 50);
  store.set(scoped('recents'), S.recents);
  store.set(scoped('lastLive'), ch.id);
}
