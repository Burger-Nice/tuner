// airglow accounts on this device (design/ui-v1/accounts-v1/SPEC.md 2, 5.7, 5.8): who is signed in, the data key in
// memory, the tokens, the calls to the Worker, the secure store per platform, signing up / in / out, approving a TV.
// The TV, the iPhone and the Windows app share it. Nothing here touches the DOM.
import { S, store, emit } from '../state.js';
import { native } from '../native.js';
import * as K from './crypto.js';

export const host = () => String(store.get('acctHost', '') || window.Core.ACCOUNTS_HOST || '').replace(/\/+$/, '');
// What every screen can read synchronously: { id, email, owner, deviceId, how, kind, name } or null. No secrets.
export const me = () => store.get('acct', null);
export const signedIn = () => !!me();
let A = { keys: null, dk: null, access: null, refresh: null, ready: null };

// ---------- the secure store (SPEC 5.7) ----------
// TV: the plugin's Keystore-wrapped store; iPhone: the Keychain; Windows: safeStorage. A plain desktop browser
// (development and the tests) keeps it in localStorage under a dev key; an Android build without the plugin method
// keeps it in memory only (signed in until the app restarts), never in the WebView's storage.
const DEV = !window.Capacitor?.isNativePlatform?.() && !window.tuner?.secret && !native?.secret;
const vault = native?.secret || window.tuner?.secret || (DEV ? {
  get: async (k) => { try { return localStorage.getItem(`tuner.devsecret.${k}`); } catch { return null; } },
  set: async (k, v) => { localStorage.setItem(`tuner.devsecret.${k}`, v); },
  clear: async (k) => { try { localStorage.removeItem(`tuner.devsecret.${k}`); } catch { /* none */ } },
} : null);
const memVault = new Map();
async function vget() { try { if (vault) return await vault.get('acct'); } catch { /* fall back */ } return memVault.get('acct') || null; }
async function vset(v) {
  memVault.set('acct', v);
  // (awaited: the write is finished before the new token is used; a build without the store keeps it in memory only)
  if (vault) { try { await vault.set('acct', v); } catch (e) { console.warn('airglow: no secure store, the account stays signed in until the app restarts', e?.message); } }
}
async function vclear() { memVault.delete('acct'); try { await vault?.clear('acct'); } catch { /* none */ } }

// ---------- errors ----------
// Our errors are AppErrors (app/tv/js/report-scrub.js): error reports send their code, never their message.
const AppErrorBase = globalThis.AppError || class extends Error { constructor(code, message, status) { super(message); this.code = code; if (status != null) this.status = status; } };
export class AcctError extends AppErrorBase { constructor(code, status, body) { super(code, WORDS[code] || code, status); this.name = 'AcctError'; this.code = code; this.status = status; this.body = body; } }
// SPEC 10's sentences for the Worker's codes (the raw message is never shown)
export const WORDS = {
  offline: 'Can\'t reach airglow\'s server right now. You can use airglow without an account and sign in later.',
  server: 'airglow\'s server didn\'t answer · trying again in 2 min', not_ready: 'airglow\'s server didn\'t answer · trying again in 2 min',
  bad_login: 'That password doesn\'t open this account', slow_down: 'Wait a minute and try again', weak_kdf: 'This server asked for a weak key. Not signing in.',
  bad_invite: 'That invite code doesn\'t work. Ask for a new one.', email_taken: 'There is already an account with that email. Sign in instead.',
  bad_email: 'Type the email the account uses.', bad_recovery: 'That recovery key doesn\'t open this account', no_code: 'That code isn\'t waiting for a sign-in. Check the letters on the TV.',
  cannot_approve: 'This device signed in with a phone, so it can\'t sign in another. Use your phone or PC.', too_many_devices: 'Your account has 10 devices. Sign one out in Devices first.',
  no_invites_left: 'No invites left this month', quota: 'Your account is full', revoked: 'Signed out', bad_check: 'This key doesn\'t open your account. Try again.',
  mismatch: 'This link doesn\'t match the TV it names', expired_token: 'The code ran out · here is a new one',
};

// ---------- the calls ----------
export async function api(method, path, body, { token, timeout = 20000 } = {}) {
  const h = host();
  if (!h) throw new AcctError('offline');
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
  let r;
  try {
    r = await fetch(h + path, { method, signal: ctl.signal, cache: 'no-store', headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new AcctError('offline'); } finally { clearTimeout(t); }
  const text = await r.text().catch(() => '');
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (data && typeof data.now === 'number') serverNow(data.now);
  if (!r.ok) throw new AcctError(data?.error || (r.status >= 500 ? 'server' : 'offline'), r.status, data);
  return data;
}
let offset = 0;
function serverNow(n) { offset = n - Date.now(); }
export const now = () => Date.now() + offset;   // (the server's clock: the merge rules clamp to it)

let refreshing = null;
async function refreshTokens() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    await ready();
    if (!A.refresh) throw new AcctError('revoked', 401, { error: 'revoked', why: 'gone' });
    const r = await api('POST', '/v1/token', { refresh: A.refresh });
    // The new refresh token is stored (and the write finished) before the new access token is used (review 3, M1)
    await vset(JSON.stringify({ dk: K.b64u(A.dk), refresh: r.refresh }));
    A.refresh = r.refresh; A.access = r.access;
  })().finally(() => { refreshing = null; });
  return refreshing;
}
// An authenticated call: refreshes once on a plain 401; an explicit `revoked` signs this device out (and only that)
export async function authed(method, path, body) {
  await ready();
  if (!me()) throw new AcctError('revoked');
  for (let i = 0; i < 2; i++) {
    try {
      if (!A.access) await refreshTokens();
      return await api(method, path, body, { token: A.access });
    } catch (e) {
      if (e.code === 'revoked') { await revoked(e.body || {}); throw e; }
      if (e.code === 'unauthorized' && i === 0) { A.access = null; continue; }
      throw e;
    }
  }
}

// ---------- starting up ----------
// The keys come back from the secure store once, at start-up (scoped() only needs me().id, which is synchronous).
export function ready() {
  if (A.ready) return A.ready;
  A.ready = (async () => {
    if (!me()) return false;
    const raw = await vget();
    if (!raw) return false;
    try { const v = JSON.parse(raw); A.dk = K.unb64u(v.dk); A.refresh = v.refresh; A.keys = await K.subkeys(A.dk); return true; } catch { return false; }
  })();
  return A.ready;
}
export const keys = () => A.keys;
export const hasKeys = async () => { await ready(); return !!A.keys; };

// A device just got its tokens and dk (sign-up, sign-in, recovery, a TV's handover): keep them, then say so.
async function establish(r, dk, how) {
  const keys = await K.subkeys(dk);
  if (r.dkCheck && !(await K.dkCheckOk(keys, r.dkCheck))) throw new AcctError('bad_check');
  await vset(JSON.stringify({ dk: K.b64u(dk), refresh: r.refresh }));
  A = { keys, dk, access: r.access, refresh: r.refresh, ready: Promise.resolve(true) };
  const prev = me();
  store.set('acct', { id: r.account.id, email: r.account.email, owner: !!r.account.owner, deviceId: r.deviceId, how, kind: deviceInfo().kind, name: prev?.id === r.account.id ? prev.name : '', at: Date.now() });
  S.user = r.account.id;
  store.del('acctSignedOut');
  emit('acct');
}
export function deviceInfo() {
  const p = native?.platform || (window.tuner ? 'windows' : '');
  const kind = p === 'android' ? 'tv' : p === 'ios' ? 'phone' : p === 'windows' || window.tuner ? 'pc' : 'other';
  const name = store.get('deviceName', '') || (kind === 'tv' ? (native?.info?.().model ? `${native.info().model}` : 'TV') : kind === 'phone' ? 'iPhone' : kind === 'pc' ? 'Windows PC' : 'Browser');
  return { name: kind === 'tv' && !/tv/i.test(name) ? `${name} TV`.replace(/^ TV$/, 'TV') : name, kind, platform: p || 'web' };
}
export const displayName = () => me()?.name || (me()?.email || '').split('@')[0] || '';

// ---------- sign up, sign in, recover (iPhone, Windows; the TV's typed fallback) ----------
export async function signUp({ invite, email, name, password }) {
  if (String(password).length < 12) throw new AcctError('short', 400);
  const a = await K.newAccountKeys(password);
  const r = await api('POST', '/v1/signup', { invite, email, device: deviceInfo(), ...a.body });   // (the invite exactly as typed)
  await establish(r, a.dk, 'password');
  setName(name || email.split('@')[0]);
  return { recoveryKey: a.rkText };
}
export async function signIn({ email, password }) {
  const { kdf } = await api('POST', '/v1/prelogin', { email });
  const { wk, ak } = await K.deriveKeys(password, kdf);   // (refuses a weak KDF before anything is derived)
  const r = await api('POST', '/v1/login', { email, authKey: K.b64u(ak), device: deviceInfo() });
  let dk; try { dk = await K.unwrapKey(wk, r.wrappedKey); } catch { throw new AcctError('bad_check'); }
  await establish(r, dk, 'password');
}
export async function recover({ email, recoveryKey, password }) {
  const rk = K.parseRecoveryKey(recoveryKey);
  if (!rk) throw new AcctError('bad_recovery');
  const { rwk, rak } = await K.recoveryKeys(rk);
  const st = await api('POST', '/v1/recover/start', { email, recoveryAuthKey: K.b64u(rak) });
  let dk; try { dk = await K.unwrapKey(rwk, st.recoveryWrappedKey); } catch { throw new AcctError('bad_recovery'); }
  const w = await K.rewrap(password, dk, rk);
  const r = await api('POST', '/v1/recover', { email, recoveryAuthKey: K.b64u(rak), ...w, device: deviceInfo() });
  await establish(r, dk, 'recovery');
}
// The TV's handover (device.js gets the box): dk opened with the TV's private key
export async function adoptHandover(r, dk) { await establish(r, dk, 'phone'); }

// The password's keys again, for the confirms that need it (Show it, a new recovery key, a password change, delete)
async function proveWith(password) {
  const { kdf } = await api('POST', '/v1/prelogin', { email: me().email });
  return { kdf, ...(await K.deriveKeys(password, kdf)) };
}
export async function showRecoveryKey(password) {
  const { wk, ak } = await proveWith(password);
  const r = await api('POST', '/v1/login', { email: me().email, authKey: K.b64u(ak), oneShot: true });
  try { return K.recoveryText(await K.unwrapRecovery(wk, r.recoveryKeyWrappedByPw)); } catch { throw new AcctError('bad_login'); }
}
export async function newRecoveryKey(password) {
  await ready();
  const { wk, ak } = await proveWith(password), rk = K.newRecoveryKey(), { rwk, rak } = await K.recoveryKeys(rk);
  await authed('POST', '/v1/recovery-key', { authKey: K.b64u(ak), recoveryWrappedKey: await K.wrapKey(rwk, A.dk), recoveryAuthKey: K.b64u(rak), recoveryKeyWrappedByPw: await K.wrapRecovery(wk, rk) });
  return K.recoveryText(rk);
}
export async function changePassword(current, next, signOutOthers) {
  await ready();
  if (String(next).length < 12) throw new AcctError('short', 400);
  const { ak } = await proveWith(current);
  const r = await api('POST', '/v1/login', { email: me().email, authKey: K.b64u(ak), oneShot: true });   // (the rk wrap, to re-wrap it)
  const { wk } = await K.deriveKeys(current, r.kdf);
  const rk = await K.unwrapRecovery(wk, r.recoveryKeyWrappedByPw);
  await authed('POST', '/v1/password', { authKey: K.b64u(ak), ...(await K.rewrap(next, A.dk, rk)), signOutOthers: !!signOutOthers });
}

// ---------- approving a TV (SPEC 2.3, 3.2, 5.5) ----------
export const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
export const showCode = (c) => `${c.slice(0, 3)}-${c.slice(3)}`;
export const canApprove = () => ['password', 'recovery'].includes(me()?.how);
// The TV's request; `k` (from the QR link) must match the key the server reports, or the sheet refuses.
export async function lookupTv(code, k, { token } = {}) {
  const r = token ? await api('GET', `/v1/device/${normCode(code)}`, null, { token }) : await authed('GET', `/v1/device/${normCode(code)}`);
  if (k && (await K.pubHash(r.pub)) !== k) throw new AcctError('mismatch');
  return r;
}
export async function approveTv(code, tv, { token, dk } = {}) {
  await ready();
  const box = await K.handoverSeal(dk || A.dk, tv.pub, normCode(code));
  if (token) await api('POST', '/v1/device/approve', { user_code: normCode(code), box }, { token });
  else await authed('POST', '/v1/device/approve', { user_code: normCode(code), box });
}
export const denyTv = (code) => authed('POST', '/v1/device/deny', { user_code: normCode(code) }).catch(() => {});

// ---------- devices, invites ----------
export const devices = () => authed('GET', '/v1/devices');
export const renameDevice = (id, name) => authed('PATCH', `/v1/devices/${id}`, { name });
export const removeDevice = (id) => authed('DELETE', `/v1/devices/${id}`);
export const invites = () => authed('GET', '/v1/invites');
export const makeInvite = () => authed('POST', '/v1/invites');
export function setName(name) { const m = me(); if (!m) return; store.set('acct', { ...m, name: String(name || '').slice(0, 40) }); const s = window.Core.settings(); if (s.name !== m.name) window.Core.saveSettings({ name: String(name || '').slice(0, 40) }); emit('acct'); }

// ---------- signing out (SPEC 2.5, 3.5) ----------
const wipers = [];
export const onWipe = (f) => wipers.push(f);   // (sync.js clears the synced stores; the apps go to the first screen)
async function wipe(reason) {
  const m = me();
  for (const f of wipers) { try { await f(m, reason); } catch (e) { console.error(e); } }
  await vclear();
  store.del('acct');
  A = { keys: null, dk: null, access: null, refresh: null, ready: null };
  S.user = null;
  emit('acct');
  emit('acct-out', reason);
}
let flushBeforeOut = null;
export const beforeSignOut = (f) => { flushBeforeOut = f; };
// Returns false when changes made offline couldn't be pushed (the screen then asks before going on)
export async function signOut({ force = false } = {}) {
  if (!me()) return true;
  if (!force && flushBeforeOut) { try { await flushBeforeOut(); } catch { return false; } }
  try { await authed('POST', '/v1/logout'); } catch { /* offline: the token dies with the device's copy */ }
  await wipe({ why: 'signout' });
  return true;
}
export async function signOutEverywhere(password) {
  const body = password != null ? { authKey: K.b64u((await proveWith(password)).ak) } : {};
  await authed('POST', '/v1/logout-all', body);
  await wipe({ why: 'everywhere', by: deviceInfo().name, here: true });
}
export async function deleteAccount(password) {
  const { ak } = await proveWith(password);
  await authed('DELETE', '/v1/account', { authKey: K.b64u(ak) });
  await wipe({ why: 'deleted', here: true });
}
// The server said this device is signed out: wipe, and keep the one-time line for the first screen
async function revoked(body) {
  if (!me()) return;
  const line = body.why === 'everywhere' ? `Signed out everywhere from ${body.by || 'another device'}`
    : body.why === 'reuse' ? `Signed out from ${body.by || 'this device'} · a sign-in token was reused`
    : body.why === 'removed' ? `Signed out from ${body.by || 'another device'}` : body.why === 'recovered' ? 'Signed out · the account was recovered with its recovery key' : 'Signed out';
  store.set('acctSignedOut', line);
  await wipe({ why: body.why || 'revoked', line });
}
export const signedOutLine = () => store.get('acctSignedOut', '');
export const clearSignedOutLine = () => store.del('acctSignedOut');
