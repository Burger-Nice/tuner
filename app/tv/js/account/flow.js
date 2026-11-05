// What every app does after a sign-in, and while signed in (design/ui-v1/accounts-v1/SPEC.md 2.3, 2.6, 4.5):
// the merge question once per device, then the sync on its schedule; the provider that came with the account.
import { S, store, on, emit } from '../state.js';
import * as acct from './acct.js';
import * as M from './merge.js';
import * as Y from './sync.js';

// ask(summary) -> Promise<'merge' | 'replace'>: the app's own question screen (02)
export async function afterSignIn(ask) {
  const id = acct.me()?.id;
  if (!id) return;
  if (!store.get(`acctMerged:${id}`, false)) await M.firstSync(ask);
  else await Y.syncNow();
  Y.start();
}
// The account's provider to open on a device with none open (the active one first, then the first in the list)
export const accountProvider = () => S.accounts.find((a) => a.pid && a.id === store.get('active', null)) || S.accounts.find((a) => a.pid && !(a.type === 'm3u' && !a.url)) || null;
// At launch: a signed-in device syncs after Home is drawn (never before: the launch budget stays)
export function startLater(ms = 4000) { if (acct.me()) setTimeout(() => Y.start(), ms); }
// The account's facts for the verifying rows and Account (02's background, 03)
export function accountLine() {
  const prov = S.accounts.filter((a) => a.pid).length, ads = store.get(`u:${acct.me()?.id}:addons`, []).length;
  const saved = S.accounts.filter((a) => a.pid).reduce((n, a) => n + Object.keys(store.get(`a:${a.id}:favs`, {})).length, 0);
  const parts = [`${prov} provider${prov === 1 ? '' : 's'}`];
  if (store.get(`u:${acct.me()?.id}:stremio`, null)) parts.push('Stremio');
  if (store.get('tmdbKey', '')) parts.push('TMDB');
  parts.push(`${ads} add-on${ads === 1 ? '' : 's'}`, `${saved} saved`);
  return parts.join(' · ');
}
// A pasted M3U (no link) can't travel: Account names it by provider (SPEC 3.1)
export const localOnly = () => S.accounts.filter((a) => a.type === 'm3u' && !a.url);
on('acct-out', () => emit('acct'));
