// airglow accounts on the iPhone (design/ui-v1/accounts-v1/SPEC.md 3.2, mocks 04, 04b, 05, 06): the sign-in card, the
// sign-up with the recovery key, recovery, the approval sheet for a TV (airglow://tv links), and Account's group.
// The data layer is the TV's (app/tv/js/account/*).
import { S, on, store } from '../tv/js/state.js';
import * as acct from '../tv/js/account/acct.js';
import * as Y from '../tv/js/account/sync.js';
import { restore as restoreSnap } from '../tv/js/account/merge.js';
import { afterSignIn, accountProvider, localOnly } from '../tv/js/account/flow.js';
import { switchTo } from '../tv/js/session.js';
import { toast } from '../tv/js/ui.js';
import { ic, esc, go, sheet, confirm, radio, isShown } from './ui.js';

const field = (id, label, attrs) => `<label for="${id}">${label}</label><div class="si-in"><input id="${id}" ${attrs}>${/password/.test(attrs) ? `<button type="button" class="show" data-act="show" data-for="${id}">Show</button>` : ''}</div>`;
const EMAIL = 'type="email" inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="username"';
const ago = (t) => { const m = Math.round((Date.now() - t) / 60e3); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : new Date(t).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }); };
export const showToggle = (root, b) => { const i = root.querySelector(`#${b.dataset.for}`); i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? 'Show' : 'Hide'; };

// ---------- the sign-in page's account cards (05, 06) ----------
// mode: 'in' | 'up' | 'key' | 'recover'
export function cardHtml(mode, st) {
  const err = st.err ? `<div class="si-err">${esc(st.err)}</div>` : '';
  if (mode === 'key') {
    return `<div class="si-steps"><span>1 · Account</span><span class="cur">2 · Recovery</span><span>3 · Provider</span></div><div class="si-card"><h2><span class="ico">${ic('key')}</span>Your recovery key</h2>
      <p>If you forget your password, this key is the only way back in. airglow can't read what it keeps for you, so it can't reset it. Write it down or save it in Passwords.</p>
      <div class="ag-key">${st.key.split('-').map((g) => `<span>${esc(g)}</span>`).join('')}</div>
      <div class="ag-btns"><button class="ghost" data-act="rkcopy">Copy</button><button class="ghost" data-act="rksave">Save to Files</button></div>
      <label class="ag-ck"><input type="checkbox" id="rkok"${st.ticked ? ' checked' : ''}> I've put it somewhere safe</label>
      <button class="pill noicon" data-act="rkdone" style="width:100%;margin-top:14px"${st.ticked ? '' : ' disabled'}>Continue</button>
      <div class="ag-cap" style="margin-top:10px">You can see it again later in Account › airglow account › Recovery key; your password unlocks it. A new key can be made there too, which retires this one.</div></div>`;
  }
  if (mode === 'up') {
    return `<div class="si-steps"><span class="cur">1 · Account</span><span>2 · Recovery</span><span>3 · Provider</span></div><div class="si-card"><h2><span class="ico">${ic('user')}</span>Create an account</h2>
      <form onsubmit="return false" autocomplete="on">${field('agInv', 'Invite code', 'type="text" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off"')}${field('agEmail', 'Email', EMAIL)}${field('agName', 'Name (optional)', 'type="text" autocomplete="nickname"')}${field('agPw', 'Password · 12 characters or more', 'type="password" autocomplete="new-password"')}
      ${err}<button class="pill noicon" data-act="agUp" style="width:100%;margin-top:14px">${st.busy ? 'Making your keys…' : 'Continue'}</button></form>
      <div class="ag-cap" style="margin-top:10px">Your password never leaves this iPhone: it unlocks everything here. airglow's server keeps only locked copies it can't open.</div>
      <button class="ag-link" data-act="agIn">I have an account · Sign in</button></div>`;
  }
  if (mode === 'recover') {
    return `<div class="si-card"><h2><span class="ico">${ic('key')}</span>Use your recovery key</h2><p>Your email, the 20 characters, and a new password. Every device signs out and asks again.</p>
      <form onsubmit="return false">${field('agEmail', 'Email', EMAIL)}${field('agRk', 'Recovery key', 'type="text" autocapitalize="characters" autocorrect="off" spellcheck="false" autocomplete="off"')}${field('agPw', 'New password · 12 characters or more', 'type="password" autocomplete="new-password"')}
      ${err}<button class="pill noicon" data-act="agRec" style="width:100%;margin-top:14px">${st.busy ? 'Working…' : 'Set the new password'}</button></form>
      <button class="ag-link" data-act="agIn">Back to Sign in</button></div>`;
  }
  return `<div class="si-card"><h2><span class="ico">${ic('user')}</span>Sign in</h2><p>Your provider login, Stremio add-ons, TMDB key, Saved and history come to this iPhone by themselves. No other sign-in.</p>
    <form onsubmit="return false" autocomplete="on">${field('agEmail', 'Email', EMAIL)}${field('agPw', 'Password', 'type="password" autocomplete="current-password" enterkeyhint="go"')}
    ${err}<button class="pill noicon" data-act="agGo" style="width:100%;margin-top:14px">${st.busy ? 'Signing in…' : 'Sign in'}</button></form>
    <button class="ag-link" data-act="agForgot">Forgot it? Use your recovery key</button></div>
    <div class="si-next" style="display:flex;flex-direction:column;gap:10px;align-items:stretch"><button class="ghost" data-act="agUpOpen">Create an account with an invite</button><button class="ghost" data-act="noacct">Use airglow without an account</button></div>`;
}
// The phone's merge question (02's words)
export function askMergePhone(sum) {
  return new Promise((done) => {
    const h = sum.here;
    const s = sheet(`<h3>This iPhone already has things</h3><p class="tx">It was used without an account. Keep both, or make this iPhone match your account.</p>
      <p class="tx">On this iPhone: ${h.providers.length ? esc(h.providers.map((p) => p.name).join(', ')) : 'no provider'} · ${h.saved} saved · ${h.plays} plays · ${h.addons} add-ons</p>
      <div class="act2" style="flex-direction:column;gap:8px;padding:0 16px"><button class="pill noicon" data-act="merge" style="width:100%">Merge them · Recommended</button><button class="ghost" data-act="replace" style="width:100%">Use only what's in my account</button></div>
      <p class="tx" style="color:var(--a-text-3)">Asked once, on this iPhone only. Neither choice can be undone here, so your account keeps a copy of today's state for 30 days.</p>`, {
      onClick: (a, t, close) => { if (a === 'merge' || a === 'replace') { picked = true; close(); done(a); } },
      onClose: () => { if (!picked) { toast('Pick one to finish signing in'); setTimeout(() => askMergePhone(sum).then(done), 300); } },
    });
    let picked = false; void s;
  });
}
// After any sign-in: the merge question if needed, the sync, the provider; then Home (or the provider card)
export async function finishSignIn(onNoProvider) {
  try { await afterSignIn(askMergePhone); } catch (e) { toast(e.code === 'offline' ? 'Signed in · it syncs when airglow\'s server answers' : e.message); }
  const pending = takePending();
  if (!S.acc) { const p = accountProvider(); if (p) { try { await switchTo(p); } catch (e) { toast(e.message); } } }
  if (S.acc) go('home'); else onNoProvider?.();
  if (pending) setTimeout(() => approveSheet(pending.code, pending.k), 400);
}

// ---------- approving a TV (04, 04b) ----------
let pendingLink = null;
const takePending = () => { const p = pendingLink; pendingLink = null; return p; };
export function openLink(url) {
  let u; try { u = new URL(url); } catch { return; }
  if (u.protocol !== 'airglow:' || u.host !== 'tv') return;
  const code = acct.normCode(u.searchParams.get('code')), k = u.searchParams.get('k') || '';
  if (code.length !== 6) return;
  if (!acct.me()) { pendingLink = { code, k }; toast('Sign in first, then the TV'); go('signin'); return; }
  approveSheet(code, k);
}
async function onWifi() {
  try { const N = window.Capacitor?.Plugins?.Network; if (!N) return false; return (await N.getStatus()).connectionType === 'wifi'; } catch { return false; }
}
export async function approveSheet(code, k = '') {
  if (!acct.canApprove()) return toast(acct.WORDS.cannot_approve);
  let tv;
  try { tv = await acct.lookupTv(code, k); } catch (e) { return toast(e.message); }
  const wifi = await onWifi();
  const same = !!k && tv.sameNetwork && wifi, typed = !k;
  const secs = Math.max(1, Math.round((tv.now - tv.askedAt) / 1000));
  const shown = acct.showCode(code);
  const s = sheet(`<div class="agp"><span class="ico">${ic('tv')}</span><h2>Sign in this TV?</h2><div class="sub">${esc(tv.name)} · ${same || typed ? esc(shown) : `${esc(shown.slice(0, 4))}___`} · asked ${secs < 90 ? `${secs} s` : `${Math.round(secs / 60)} min`} ago</div>
    <div class="chk"><span class="ag-q">i</span><span>Is this the code on your TV? Only sign in a TV you're looking at. If someone sent you this link, tap Not now.</span></div>
    ${same ? `<div class="chk"><span class="ag-tick">${ic('tick')}</span><span>On the same network as this iPhone</span></div>` : ''}
    ${typed ? '<div class="chk"><span class="ag-q">i</span><span>Make sure the code is the one on your TV.</span></div>' : ''}
    ${!same && !typed ? `<div class="lbl">The last three letters on your TV</div><div class="si-in" style="width:140px"><input id="agLast" class="three" maxlength="3" autocapitalize="characters" autocorrect="off" spellcheck="false" autocomplete="off"></div><div class="ag-cap" style="margin-top:8px">airglow can't tell this iPhone is on the TV's network, so the letters make sure it's your TV.</div>` : ''}
    <div class="lbl">It gets your</div><div class="ag-gives">${['Provider login', 'Stremio add-ons', 'TMDB key', 'Saved', 'History', 'Settings'].map((x) => `<span>${x}</span>`).join('')}</div>
    <div class="ag-cap" style="margin-top:10px">The TV signs in to nothing else: your provider, Stremio and TMDB logins come with it.</div>
    <div class="act"><button class="pill noicon" data-act="yes"${!same && !typed ? ' disabled' : ''}>Sign in the TV</button><button class="ghost" data-act="no">Not now</button></div>
    <div class="note">Locked on this iPhone for that TV only. airglow's server passes it on without being able to read it.</div></div>`, {
    onClick: async (a, t, close) => {
      if (a === 'no') { acct.denyTv(code); close(); return; }
      if (a !== 'yes' || t.disabled) return;
      t.disabled = true; t.textContent = 'Signing in the TV…';
      try { await acct.approveTv(code, tv); close(); toast(`${tv.name} is signing in`); } catch (e) { t.disabled = false; t.textContent = 'Sign in the TV'; toast(e.message); }
    },
  });
  // the three letters are checked here, on the phone, against the code the link carried (the server never sees them)
  s.el.querySelector('#agLast')?.addEventListener('input', (e) => { s.el.querySelector('[data-act="yes"]').disabled = e.target.value.toUpperCase().replace(/[^A-Z]/g, '') !== code.slice(3); });
}

// ---------- Account's group (SPEC 3.2) ----------
export function groupRows(row) {
  const m = acct.me();
  if (!m) return [row({ icon: 'user', g: true, t: 'Sign in to airglow', s: 'Your provider, add-ons, Saved and history on every screen you own', act: 'agSignin' })];
  const y = Y.syncStatus();
  const line = y.state === 'syncing' ? 'Syncing…' : y.state === 'offline' ? `Last synced ${y.lastSync ? ago(y.lastSync) : 'never'} · offline` : y.state === 'error' ? 'airglow\'s server didn\'t answer · trying again in 2 min' : y.lastSync ? `Synced ${ago(y.lastSync)}` : 'Not synced yet';
  return [
    row({ icon: 'user', g: true, t: esc(acct.displayName() || m.email), s: esc(m.email), v: 'Signed in', vcls: 'ok', chev: false }),
    row({ icon: 'refresh', t: esc(line), s: 'Provider logins, Stremio add-ons, TMDB key, Saved, history, Home rows, your settings', v: 'Sync now', act: 'agSync' }),
    y.held ? row({ icon: 'info', t: 'Some changes weren\'t synced', s: `${y.held} deletions wait for a confirm`, act: 'agHeld' }) : '',
    row({ icon: 'phone', t: 'Devices', act: 'agDevices' }),
    acct.canApprove() ? row({ icon: 'tv', t: 'Sign in a TV', s: 'Type the six letters it shows', act: 'agTv' }) : '',
    ...localOnly().map((a) => row({ icon: 'server', t: esc(a.name), s: `${esc(a.name)} stays on the iPhone it was pasted on`, chev: false })),
    row({ icon: 'key', t: 'Recovery key', act: 'agRk' }),
    row({ icon: 'key', t: 'Change password', act: 'agPw' }),
    m.owner ? row({ icon: 'plus', t: 'Invite a friend', s: 'Works once, for 7 days. A friend gets their own account: nothing of yours is shared', act: 'agInvite' }) : '',
    row({ icon: 'refresh', t: 'Undo changes since…', s: 'Restores each item as it was at the start of that day', act: 'agUndo' }),
    row({ icon: 'out', t: 'Sign out of this iPhone', act: 'agOut' }),
    row({ icon: 'out', t: 'Sign out everywhere', act: 'agAll' }),
    row({ icon: 'close', t: 'Delete account', act: 'agDelete' }),
  ];
}
function passwordSheet(title, text, yes, run) {
  const s = sheet(`<h3>${esc(title)}</h3>${text ? `<p class="tx">${esc(text)}</p>` : ''}<div style="padding:0 16px"><div class="si-in"><input id="agp" type="password" autocomplete="current-password" placeholder="Your password"></div><div class="si-err" id="agpe" hidden></div></div><div class="act2" style="margin-top:12px"><button class="ghost" data-act="no">Cancel</button><button class="pill noicon" data-act="ok">${esc(yes)}</button></div>`, {
    onClick: async (a, t, close) => {
      if (a === 'no') return close();
      if (a !== 'ok') return;
      const e = s.el.querySelector('#agpe');
      try { t.textContent = 'Checking…'; await run(s.el.querySelector('#agp').value, close); } catch (x) { e.hidden = false; e.textContent = x.message; t.textContent = yes; }
    },
  });
  setTimeout(() => s.el.querySelector('#agp')?.focus(), 300);
}
const showKey = (key, title) => sheet(`<h3>${esc(title)}</h3><div class="agp"><div class="ag-key">${key.split('-').map((g) => `<span>${esc(g)}</span>`).join('')}</div><div class="act"><button class="ghost" data-act="copy">Copy</button></div><div class="note">Shown for 60 seconds.</div></div>`, {
  onClick: (a) => { if (a === 'copy') { navigator.clipboard?.writeText(key); toast('Copied'); } },
});
export async function groupAct(a, redraw) {
  if (a === 'agSignin') return go('signin', { acct: 'in' });
  if (a === 'agSync') { Y.syncNow().then(() => { const y = Y.syncStatus(); toast(y.error ? acct.WORDS[y.error] || 'Not synced' : 'Synced'); redraw(); }); return; }
  if (a === 'agHeld') return radio('Deletions waiting', [{ v: 'sync', l: 'Sync them', sub: 'Delete them everywhere' }, { v: 'undo', l: 'Undo them', sub: 'Bring them back here' }], null, (v) => (v === 'sync' ? Y.syncHeld() : Y.undoHeld()).then(redraw), { sub: 'One change would have removed most of a list on every device, so airglow held it back.' });
  if (a === 'agTv') {
    const s = sheet(`<h3>Sign in a TV</h3><p class="tx">The six letters on the TV's screen.</p><div style="padding:0 16px"><div class="si-in"><input id="agc" maxlength="7" autocapitalize="characters" autocorrect="off" spellcheck="false" autocomplete="off" placeholder="WDJ-BMH" style="letter-spacing:.14em;font-weight:700"></div></div><div class="act2" style="margin-top:12px"><button class="ghost" data-act="no">Cancel</button><button class="pill noicon" data-act="ok">Next</button></div>`, {
      onClick: (x, t, close) => { if (x === 'no') return close(); if (x !== 'ok') return; const c = acct.normCode(s.el.querySelector('#agc').value); if (c.length !== 6) return; close(); approveSheet(c, ''); },
    });
    return;
  }
  if (a === 'agDevices') return devicesSheet();
  if (a === 'agRk') return radio('Recovery key', [{ v: 'show', l: 'Show it', sub: 'Your password unlocks it' }, { v: 'new', l: 'Make a new one', sub: 'The old one stops working' }], null, (v) => {
    if (v === 'show') passwordSheet('Show the recovery key', 'Your password unlocks it.', 'Show it', async (pw, close) => { const k = await acct.showRecoveryKey(pw); close(); const s = showKey(k, 'Your recovery key'); setTimeout(() => s.close(), 60000); });
    else passwordSheet('Make a new recovery key', 'The old one stops working at once.', 'Make it', async (pw, close) => { const k = await acct.newRecoveryKey(pw); close(); showKey(k, 'Your new recovery key'); });
  });
  if (a === 'agPw') {
    const s = sheet(`<h3>Change password</h3><div style="padding:0 16px"><div class="si-in"><input id="ag0" type="password" autocomplete="current-password" placeholder="Current password"></div><div class="si-in" style="margin-top:8px"><input id="ag1" type="password" autocomplete="new-password" placeholder="New password · 12 or more"></div><div class="si-in" style="margin-top:8px"><input id="ag2" type="password" autocomplete="new-password" placeholder="New password again"></div>
      <label class="tx" style="display:flex;gap:10px;align-items:center;padding:10px 0"><input type="checkbox" id="ag3"> Also sign out my other devices</label><div class="si-err" id="age" hidden></div></div>
      <p class="tx" style="color:var(--a-text-3)">Your other devices keep working: everything is locked with a key the password only unwraps.</p><div class="act2"><button class="ghost" data-act="no">Cancel</button><button class="pill noicon" data-act="ok">Change it</button></div>`, {
      onClick: async (x, t, close) => {
        if (x === 'no') return close(); if (x !== 'ok') return;
        const v = (id) => s.el.querySelector(id).value, e = s.el.querySelector('#age');
        if (v('#ag1') !== v('#ag2')) { e.hidden = false; e.textContent = 'The two new passwords aren\'t the same'; return; }
        try { t.textContent = 'Working…'; await acct.changePassword(v('#ag0'), v('#ag1'), s.el.querySelector('#ag3').checked); close(); toast('Password changed'); } catch (er) { e.hidden = false; e.textContent = er.code === 'short' ? 'The password needs 12 characters or more.' : er.message; t.textContent = 'Change it'; }
      },
    });
    return;
  }
  if (a === 'agInvite') {
    try { const r = await acct.makeInvite(); navigator.clipboard?.writeText(r.code).catch(() => {}); sheet(`<h3>Invite a friend</h3><div class="agp"><div class="ag-key"><span style="flex:none;padding:6px 12px">${esc(r.code)}</span></div><div class="note">copied · Works once, for 7 days. ${r.left} invites left this month. Open sign-up is off: only invited people can make an account.</div></div>`); } catch (e) { toast(e.message); }
    return;
  }
  if (a === 'agUndo') {
    const snaps = await Y.snapshots().catch(() => []);
    const days = [1, 2, 7, 30].map((d) => ({ v: `d${d}`, l: d === 1 ? 'Since yesterday' : `Since ${d} days ago` }));
    return radio('Undo changes since…', [...days, ...snaps.map((s, i) => ({ v: `s${i}`, l: `Restore ${s.day}`, sub: 'The merge snapshot' }))], null, async (v) => {
      try { if (v[0] === 'd') { const n = await Y.undoSince(Date.now() - +v.slice(1) * 864e5); toast(`${n} item${n === 1 ? '' : 's'} restored`); } else { await restoreSnap(snaps[+v.slice(1)]); toast('Restored'); } redraw(); } catch (e) { toast(e.message); }
    }, { sub: 'Restores each item as it was at the start of that day. Forgotten history (Forget my taste) can\'t come back.' });
  }
  if (a === 'agOut') return confirm({ title: 'Sign out of this iPhone?', text: 'Your provider, add-ons and history leave this iPhone; your account keeps them.', yes: 'Sign out', onYes: async () => { if (!(await acct.signOut())) confirm({ title: 'Changes made offline will be lost', text: 'airglow\'s server didn\'t answer.', yes: 'Sign out anyway', onYes: () => acct.signOut({ force: true }) }); } });
  if (a === 'agAll') return passwordSheet('Sign out everywhere?', 'Every device asks for your password or your phone again.', 'Sign out everywhere', async (pw, close) => { await acct.signOutEverywhere(pw); close(); });
  if (a === 'agDelete') return passwordSheet('Delete account', 'Everything on the server goes. Your devices keep what they have, as if they had never signed in.', 'Delete it', async (pw, close) => { await acct.deleteAccount(pw); close(); });
}
async function devicesSheet() {
  const s = sheet('<h3>Devices</h3><div class="body"><p class="tx">Asking airglow\'s server…</p></div>', {
    full: true,
    onClick: (a) => {
      const d = list.find((x) => x.id === a); if (!d) return;
      if (d.this) return renameSheet(d);
      confirm({ title: `Sign out ${d.name}?`, text: 'Signing a device out removes your account\'s things from it the next time it is online; the device keeps working without an account until then.', yes: 'Sign out', onYes: () => acct.removeDevice(d.id).then(() => { toast(`${d.name} is signed out`); s.close(); }) });
    },
  });
  let list = [];
  try {
    const r = await acct.devices(); list = r.devices;
    const how = (d) => (d.how === 'phone' ? `with ${d.approvedBy || 'a phone'}` : d.how === 'recovery' ? 'with the recovery key' : 'with the password') + (d.approverSignedOut ? ' · approved by a device that was signed out' : '');
    s.el.querySelector('.body').innerHTML = `<div class="ac-list"><div class="ac-group"><div class="h">${list.length} of ${r.max}</div><div class="box">${list.map((d) => `<button class="ac-row" data-act="${esc(d.id)}"><span class="ico">${ic(d.kind === 'tv' ? 'tv' : 'phone')}</span><span class="col"><span class="t">${esc(d.name)}${d.this ? ' · This iPhone' : ''}</span><span class="s">Signed in ${new Date(d.createdAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${esc(how(d))}</span></span><span class="v${d.active ? ' ag-dot' : ''}">${d.active ? 'Active now' : `Last seen ${ago(d.lastSeen)}`}</span></button>`).join('')}</div>${r.recoveryAttempts.length ? `<div class="foot">Recovery attempted · ${r.recoveryAttempts.map((t) => new Date(t).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })).join(', ')}</div>` : ''}<div class="foot">Tap a device to sign it out. Tap this iPhone to rename it.</div></div></div>`;
  } catch (e) { s.el.querySelector('.body').innerHTML = `<p class="tx">${esc(e.message)}</p>`; }
}
function renameSheet(d) {
  const s = sheet(`<h3>Rename</h3><div style="padding:0 16px"><div class="si-in"><input id="agn" value="${esc(d.name)}"></div></div><div class="act2" style="margin-top:12px"><button class="ghost" data-act="no">Cancel</button><button class="pill noicon" data-act="ok">Save</button></div>`, {
    onClick: async (a, t, close) => { if (a === 'no') return close(); if (a !== 'ok') return; const n = s.el.querySelector('#agn').value.trim(); if (!n) return; await acct.renameDevice(d.id, n).catch(() => {}); store.set('deviceName', n); close(); toast('Renamed'); },
  });
}
on('acct-sync', () => { if (isShown('account')) document.dispatchEvent(new Event('ag-redraw')); });
export { acct };
