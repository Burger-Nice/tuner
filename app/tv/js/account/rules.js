// The merge rules (design/ui-v1/accounts-v1/SPEC.md 4.4, with review 3's M2 and S1): pure functions over plaintext
// values, so tests/account-merge-test.js can run them in Node. `local` is this device's value (undefined when it has
// none), `remote` the incoming one (null for a tombstone); each returns the value the device keeps.
export const MIN5 = 5 * 60e3;
// Dates from devices are clamped to the server's clock + 5 min (sync answers carry `now`): a TV whose clock runs
// ahead can't push the shield or Forget my taste into the future for every device.
export const clamp = (t, serverNow) => (serverNow ? Math.min(+t || 0, serverNow + MIN5) : +t || 0);

// Last write: the newer `at` wins (`at` is the envelope's, set when the device noticed the change)
export const lww = (local, remote, localAt, remoteAt) => (remote === undefined ? local : local === undefined || (remoteAt || 0) >= (localAt || 0) ? remote : local);
// Newest `at` inside the value (progress)
export const newest = (local, remote) => (!local ? remote : !remote ? local : (remote.at || 0) >= (local.at || 0) ? remote : local);
// Orders: the newer list, then the other's keys it doesn't have, appended
export function order(local, remote, localAt, remoteAt) {
  if (!local) return remote; if (!remote) return local;
  const [a, b] = (remoteAt || 0) >= (localAt || 0) ? [remote, local] : [local, remote];
  const keys = [...a.keys]; for (const k of b.keys || []) if (!keys.includes(k)) keys.push(k);
  return { keys };
}
// Maps with a time per entry (the shared settings: { key: [value, at] }; the IMDb notes and skip choices: entries with .at)
export function perKey(local, remote, atOf = (e) => (Array.isArray(e) ? e[1] : e?.at || 0)) {
  if (!local) return remote; if (!remote) return local;
  const out = { ...local };
  for (const [k, v] of Object.entries(remote)) if (!(k in out) || atOf(v) >= atOf(out[k])) out[k] = v;
  return out;
}
// Not interested: union by key, the later expiry
export function notInterested(local, remote) {
  if (!local) return remote; if (!remote) return local;
  const out = { ...local };
  for (const [k, t] of Object.entries(remote)) out[k] = Math.max(out[k] || 0, t);
  return out;
}
// Forget my taste: upTo = max, clamped
export const forget = (local, remote, serverNow) => ({ upTo: clamp(Math.max(local?.upTo || 0, remote?.upTo || 0), serverNow) });

// The spoiler shield (review 3, M2): { since, upTo, ids }. The higher `since` (set when the shield is turned on or
// made stricter, and by Reveal all) wins wholesale; with the same `since`, upTo = max and ids = union. Clamped.
export function shield(local, remote, serverNow) {
  const fix = (s) => s && { since: clamp(s.since || 0, serverNow), upTo: clamp(s.upTo || 0, serverNow), ids: Array.isArray(s.ids) ? s.ids : [] };
  local = fix(local); remote = fix(remote);
  if (!local) return remote; if (!remote) return local;
  if (remote.since !== local.since) return remote.since > local.since ? remote : local;
  const ids = [...local.ids]; for (const x of remote.ids) if (!ids.some(([id]) => id === x[0])) ids.push(x);
  const upTo = Math.max(local.upTo, remote.upTo);
  return { since: local.since, upTo, ids: ids.filter(([, t]) => t >= upTo || t > Date.now() - 8 * 864e5) };
}

// Plays: union by playId across parts (the newer copy of one play wins: a resumed play moves its `at`), nothing at or
// before forget.upTo, sorted by `at`.
export function plays(lists, forgetUpTo = 0) {
  const by = new Map();
  for (const list of lists) for (const p of list || []) {
    if (!p || !p.playId || (p.at || 0) <= forgetUpTo) continue;
    const had = by.get(p.playId);
    if (!had || (p.at || 0) > (had.at || 0) || ((p.at || 0) === (had.at || 0) && (p.to || 0) > (had.to || 0))) by.set(p.playId, p);
  }
  return [...by.values()].sort((a, b) => a.at - b.at || (a.playId < b.playId ? -1 : 1));
}
// A play's id: random for a new one; deterministic for a play made from Continue watching (the same title on two
// devices is one play, review 3 S1) and for a play from before accounts (its own content).
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
export const migratedPlayId = (p) => `m:${p.imdb}:${p.season || 0}:${p.episode || 0}`;
export const oldPlayId = (p) => `h:${fnv(`${p.imdb}|${p.season || 0}|${p.episode || 0}|${p.at}|${p.source || ''}`)}`;
export const newPlayId = () => `p:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
export const withIds = (list) => (list || []).map((p) => (p.playId ? p : { ...p, playId: p.source === 'history' ? migratedPlayId(p) : oldPlayId(p) }));
// Parts of at most `per` plays, by month: { 'YYYY-MM:n': [plays] }
export function partsOf(list, per = 200) {
  const months = {};
  for (const p of list) { const m = new Date(p.at).toISOString().slice(0, 7); (months[m] ||= []).push(p); }
  const out = {};
  for (const [m, ps] of Object.entries(months)) for (let i = 0; i * per < ps.length; i++) out[`${m}:${i + 1}`] = ps.slice(i * per, (i + 1) * per);
  return out;
}

// A provider's canonical natural key (SPEC 4.2): duplicates on two devices become one
export function natural(a) {
  if (!a) return '';
  if (a.type === 'm3u') return `m3u|${String(a.url || '').trim()}`;
  let s = String(a.server || '').trim();
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(s) ? s : `http://${s}`);
    const port = u.port && !((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) ? `:${u.port}` : '';
    s = `${u.protocol}//${u.hostname.toLowerCase()}${port}${u.pathname.replace(/\/+$/, '')}`;
  } catch { s = s.toLowerCase().replace(/\/+$/, ''); }
  return `xtream|${s}|${String(a.username || '')}`;
}
