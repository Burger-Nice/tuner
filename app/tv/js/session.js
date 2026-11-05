// Accounts and signing in. A signed-in account opens straight away on what the device remembers; the login is checked
// in the background (a wrong password returns to sign-in, an unreachable server only shows a note).
import { S, store, startSession, endSession, emit } from './state.js';
import { resetCatalogs } from './catalog.js';
import { resetGuides } from './guide.js';
import { toast } from './ui.js';
import { wipeCollection } from './account/sync.js';
import { natural } from './account/rules.js';

const { Core } = window;
const withText = (a) => (a.type === 'm3u' && !a.url ? { ...a, text: store.get('m3u:' + a.id, '') } : { ...a });
export const activeAccount = () => S.accounts.find((a) => a.id === store.get('active', null)) || null;

function begin(a, src, info) {
  resetCatalogs();
  resetGuides();
  startSession(a, src, info);
}

// Opens the last account at once if it was signed in before. Returns true when a session started.
export function resume() {
  const a = activeAccount();
  if (!a) return false;
  const acc = withText(a);
  if (a.type === 'm3u') {
    // A playlist opens on its saved lists; it's only downloaded again when those are refreshed.
    if (!acc.url && !acc.text) return false;
    begin(acc, Core.m3u(acc), store.get('info:' + a.id, null) || {});
    return true;
  }
  const known = store.get('info:' + a.id, null);
  if (!known) return false;
  acc.tz = known.server_info?.timezone || null;   // for guides that send times as text
  const src = Core.xtream(acc);
  begin(acc, src, known);
  src.login().then((d) => {
    if (S.acc?.id !== a.id) return;
    S.info = d; store.set('info:' + a.id, d);
    emit('info');
  }).catch((err) => {
    if (S.acc?.id !== a.id) return;
    if (/password|account is/i.test(err.message)) { emit('signed-out', err.message); signOut(true); }
    else { S.offline = true; emit('offline', err.message); }
  });
  return true;
}

// Signs in with a new or saved account; throws a readable error.
// `gone()` true means the person cancelled while it was connecting: nothing is saved or started.
export async function signIn(a, gone) {
  const s = a.type === 'xtream' ? Core.xtream(a) : Core.m3u(a);
  const d = await s.login();
  if (gone?.()) return null;
  a.tz = d?.server_info?.timezone || null;
  const same = S.accounts.find((x) => x.type === a.type && x.server === a.server && x.username === a.username && x.url === a.url && (a.url || x.name === a.name));
  a.id = a.id || same?.id || Math.random().toString(36).slice(2, 10);
  // Signed in to airglow: the provider joins the account under an id every device agrees on (its pid, assigned once;
  // the same login already in the account keeps that one). A pasted M3U with no link stays on this device.
  if (S.user && !(a.type === 'm3u' && !a.url)) a.pid = a.pid || same?.pid || S.accounts.find((x) => x.pid && natural(x) === natural(a))?.pid || crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
  const { text, ...slim } = a;
  if (text && !store.set('m3u:' + a.id, text)) toast('This playlist is too large to remember. You will need to load it again next time.', 5000);
  S.accounts = [slim, ...S.accounts.filter((x) => x.id !== a.id)];
  store.set('accounts', S.accounts);
  store.set('active', a.id);
  store.set('info:' + a.id, d);
  begin(a, s, d);
  return d;
}
export const switchTo = (a, gone) => signIn(withText(a), gone);

export function signOut(keepAccount = true) {
  store.del('active');
  endSession();
  if (!keepAccount) return;
}
// (signed in to airglow, Remove provider is a confirmed action: its Saved and progress go from the account as well, so
// those deletes are sent with `wipe` naming the two collections)
export function removeAccount(a) {
  if (a.pid && S.user) { wipeCollection('favs'); wipeCollection('progress'); wipeCollection('providers'); }
  S.accounts = S.accounts.filter((x) => x.id !== a.id);
  store.set('accounts', S.accounts);
  ['favs', 'favOrder', 'progress', 'recents', 'liveCat', 'lastLive', 'movieView', 'seriesView', 'delays', 'teamCh', 'ver'].forEach((k) => store.del(`a:${a.id}:${k}`));
  store.del('m3u:' + a.id);
  store.del('info:' + a.id);
}

// Account facts for the Account page and the provider row.
export function accountFacts() {
  const u = S.info?.user_info || {};
  const exp = +u.exp_date ? new Date(+u.exp_date * 1000) : null;
  const days = exp ? Math.ceil((exp - Date.now()) / 86400e3) : null;
  return {
    status: S.acc?.type === 'xtream' ? String(u.status || 'Unknown') : 'Playlist',
    active: !u.status || /active/i.test(u.status),
    exp, days,
    cons: u.max_connections ? `${u.active_cons || 0} of ${u.max_connections} in use` : '',
    maxCons: +u.max_connections || 0,
  };
}
