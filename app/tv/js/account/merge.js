// The first sign-in on a device that already has things (design/ui-v1/accounts-v1/SPEC.md 2.6): the counts for the
// question, a snapshot of the device's state kept 30 days, then Merge (fold each provider's per-person copies into the
// person's u: set, map this device's providers to the account's pids) or Use only what's in my account.
import { S, store, emit } from '../state.js';
import * as acct from './acct.js';
import * as K from './crypto.js';
import * as R from './rules.js';
import * as Y from './sync.js';

const Core = window.Core;
const PERSON_KEYS = ['addons', 'stremio', 'picks', 'hiddenRows', 'rowsOff', 'notInterested', 'imdb', 'skipShows', 'finishes', 'playsFrom'];
const prefixes = () => [...store.get('accounts', []).map((a) => `a:${a.id}:`), 'x:'];
const uKey = (k) => `u:${acct.me().id}:${k}`;
const rid = () => K.b64u(K.random(16));

// Everything in the account, read once without touching this device (for the counts)
async function accountView() {
  const keys = acct.keys(), u = acct.me().id, out = { providers: [], favs: 0, plays: 0, addons: 0 };
  let since = 0, more = true;
  while (more) {
    const r = await acct.authed('GET', `/v1/sync?since=${since}&limit=200`);
    for (const rec of r.records || []) {
      if (rec.deleted || rec.col === 'snapshots') continue;
      let p; try { p = await K.decryptRecord(keys, u, rec); } catch { continue; }
      if (rec.col === 'providers') out.providers.push(p.v);
      if (rec.col === 'favs' && p.n.startsWith('fav|')) out.favs++;
      if (rec.col === 'plays') out.plays += p.v.plays?.length || 0;
      if (rec.col === 'addons' && p.n.startsWith('addon|')) out.addons++;
    }
    since = r.seq; more = r.more;
  }
  return out;
}
async function localPlays() {
  const lists = [];
  for (const p of prefixes()) lists.push(R.withIds((await Core.cache.get(`${p}plays`)) || []));
  return R.plays(lists);
}
// The question's two columns (02): this device and the account
export async function summary() {
  const acc = await accountView(), nat = new Set(acc.providers.map((p) => p.natural));
  const local = store.get('accounts', []).filter((a) => !(a.type === 'm3u' && !a.url));
  let saved = 0, addons = 0;
  for (const a of store.get('accounts', [])) { saved += Object.keys(store.get(`a:${a.id}:favs`, {})).length; addons += store.get(`a:${a.id}:addons`, []).length; }
  const plays = (await localPlays()).length;
  const providers = local.map((a) => ({ name: a.name, same: nat.has(R.natural(a)) }));
  return {
    here: { providers, saved, plays, addons }, account: { providers: acc.providers.map((p) => p.name), saved: acc.favs, plays: acc.plays, addons: acc.addons },
    ask: providers.some((p) => !p.same) || saved > 0 || plays > 0 || addons > 0,
  };
}
// The device's own stores, for the snapshot (and Restore)
async function localState() {
  const ls = {};
  try { for (const k of Object.keys(localStorage)) if (/^tuner\.(accounts|settings|nbaSeen|tmdbKey|a:|x:)/.test(k) && !/:(info|m3u)/.test(k)) ls[k] = localStorage.getItem(k); } catch { /* none */ }
  return { at: Date.now(), ls, plays: await localPlays() };
}

// Folds every provider's per-person copies (and life without a provider's x: ones) into the u: set
async function fold(extra) {
  const accs = store.get('accounts', []), act = store.get('active', null);
  const copies = (k) => [...accs.sort((a, b) => (a.id === act ? -1 : b.id === act ? 1 : 0)).map((a) => store.get(`a:${a.id}:${k}`, null)), store.get(`x:${k}`, null), store.get(uKey(k), null), extra?.[k]].filter((x) => x != null);
  const addons = []; for (const list of copies('addons')) for (const a of Array.isArray(list) ? list : []) if (a?.url && !addons.some((x) => x.url === a.url)) addons.push(a);
  if (addons.length) store.set(uKey('addons'), addons);
  const strem = copies('stremio').find((s) => s?.authKey); if (strem) store.set(uKey('stremio'), strem);
  for (const k of ['picks', 'hiddenRows', 'rowsOff']) { const c = copies(k)[0]; if (c != null) store.set(uKey(k), c); }
  const ni = copies('notInterested').reduce((m, x) => R.notInterested(m, x), null); if (ni) store.set(uKey('notInterested'), ni);
  for (const k of ['imdb', 'skipShows']) { const m = copies(k).reduce((x, y) => R.perKey(x, y), null); if (m) store.set(uKey(k), m); }
  if (copies('playsFrom').length) store.set(uKey('playsFrom'), Date.now());
  const plays = R.plays([await localPlays(), R.withIds((await Core.cache.get(uKey('plays'))) || []), R.withIds(extra?.plays || [])]);
  await Core.cache.set(uKey('plays'), plays.slice(-2000));
}
// This device's providers get the account's pid for the same login, or a new one (Merge), or go (Replace)
async function mapProviders(acc, keepNew) {
  const byNat = new Map(acc.providers.map((p) => [p.natural, p.pid]));
  const out = [];
  for (const a of store.get('accounts', [])) {
    const pid = byNat.get(R.natural(a));
    if (pid) out.push({ ...a, pid });
    else if (keepNew && !(a.type === 'm3u' && !a.url)) out.push({ ...a, pid: rid() });
    else if (keepNew) out.push(a);   // (a pasted M3U stays on this device, not in the account)
    else { for (const k of ['favs', 'favOrder', 'progress', 'recents', 'lastLive']) store.del(`a:${a.id}:${k}`); store.del(`info:${a.id}`); store.del(`m3u:${a.id}`); }
  }
  store.set('accounts', out); S.accounts = out;
  if (S.acc && !out.some((a) => a.id === S.acc.id)) store.del('active');
}

// The whole first sign-in. ask(summary) -> 'merge' | 'replace' (only called when the device has things).
export async function firstSync(ask) {
  const sum = await summary();
  let choice = 'merge';
  if (sum.ask) {
    choice = await ask(sum);
    try { await Y.uploadSnapshot(await localState()); } catch (e) { console.warn('airglow: the snapshot did not upload', e?.code); }
  }
  const acc = await accountView();
  if (choice === 'replace') {
    for (const a of store.get('accounts', [])) for (const k of ['favs', 'favOrder', 'progress']) store.del(`a:${a.id}:${k}`);
    await mapProviders(acc, false);
  } else {
    await mapProviders(acc, true);
    await fold();
  }
  store.set(`acctMerged:${acct.me().id}`, true);
  emit('acct-data');
  await Y.syncNow();
  return choice;
}
// Account › Sync › Undo › Restore: the snapshot's state merged in again (SPEC 2.6)
export async function restore(snap) {
  const { data } = await Y.readSnapshot(snap);
  const pick = (k) => { const v = data.ls?.[`tuner.${k}`]; try { return v ? JSON.parse(v) : null; } catch { return null; } };
  const extra = {};
  for (const k of PERSON_KEYS) for (const key of Object.keys(data.ls || {})) if (key.endsWith(`:${k}`) && /^tuner\.(a:|x:)/.test(key)) { const v = pick(key.slice(6)); if (v != null && extra[k] == null) extra[k] = v; }
  extra.plays = data.plays || [];
  // Saved and progress of the providers this device knows, unioned in by the same rules
  const accs = store.get('accounts', []), old = pick('accounts') || [];
  for (const o of old) {
    const a = accs.find((x) => R.natural(x) === R.natural(o)); if (!a) continue;
    const favs = { ...(pick(`a:${o.id}:favs`) || {}), ...store.get(`a:${a.id}:favs`, {}) };
    store.set(`a:${a.id}:favs`, favs);
    const p = store.get(`a:${a.id}:progress`, {}); for (const [k, v] of Object.entries(pick(`a:${o.id}:progress`) || {})) p[k] = R.newest(p[k], v); store.set(`a:${a.id}:progress`, p);
  }
  await fold(extra);
  emit('acct-data');
  await Y.syncNow();
}
