// The Worker's pages (SPEC 3.4, 07): /tv signs a TV in from a browser (a one-shot login: no refresh token, no device
// row), /signup and /recover. The same crypto as the apps (crypto.js, a copy of app/tv/js/account/crypto.js), the same
// KDF floor. Memory only: nothing is stored in this browser.
import * as K from './crypto.js';

const $ = (id) => document.getElementById(id);
const WORDS = { bad_login: 'That password doesn\'t open this account', slow_down: 'Wait a minute and try again', bad_invite: 'That invite code doesn\'t work. Ask for a new one.',
  email_taken: 'There is already an account with that email. Sign in in the app instead.', no_code: 'That code isn\'t waiting for a sign-in. Check the letters on the TV.', bad_email: 'Type the email the account uses.',
  bad_recovery: 'That recovery key doesn\'t open this account', weak_kdf: 'This server asked for a weak key. Not signing in.', mismatch: 'This link doesn\'t match the TV it names', letters: 'Those aren\'t the last three letters on the TV.',
  short: 'The password needs 12 characters or more.', offline: 'Can\'t reach airglow\'s server right now.', server: 'airglow\'s server didn\'t answer. Try again in a minute.' };
const say = (code) => { const e = $('err'); e.textContent = WORDS[code] || WORDS.server; e.hidden = false; };
async function api(method, path, body, token) {
  let r;
  try { r = await fetch(path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); } catch { throw Object.assign(new Error('offline'), { code: 'offline' }); }
  const t = await r.text(); const d = t ? JSON.parse(t) : null;
  if (!r.ok) throw Object.assign(new Error(d?.error || 'server'), { code: d?.error || 'server' });
  return d;
}
const busy = (on, label) => { const b = $('go'); b.disabled = on; if (label) b.textContent = on ? 'Working…' : label; };
$('show')?.addEventListener('click', () => { const i = $('pw'); i.type = i.type === 'password' ? 'text' : 'password'; $('show').textContent = i.type === 'password' ? 'Show' : 'Hide'; });
const page = document.querySelector('main').dataset.page || 'tv';
const LETTERS = /[^BCDFGHJKLMNPQRSTVWXZ]/g;

if (page === 'tv') {
  const fromPath = (location.pathname.match(/^\/tv\/([A-Za-z-]{6,7})/) || [])[1];
  const code = fromPath ? fromPath.toUpperCase().replace(LETTERS, '') : '';
  const k = new URLSearchParams(location.hash.slice(1)).get('k') || '';
  history.replaceState(null, '', location.pathname);   // (the key hash isn't kept in history)
  if (code) {
    $('lead').innerHTML = `TV code <b>${code.slice(0, 3)}-${code.slice(3)}</b>`;
    const open = $('open'); open.href = `airglow://tv?code=${code}${k ? `&k=${encodeURIComponent(k)}` : ''}`;
    open.hidden = $('openCap').hidden = $('or').hidden = false;
    $('code').value = `${code.slice(0, 3)}-${code.slice(3)}`;
    $('lastBox').hidden = false;   // (a link can be sent by anyone: the last letters come from the TV screen)
  }
  $('f').addEventListener('submit', async (e) => {
    e.preventDefault(); $('err').hidden = true;
    const typed = $('code').value.toUpperCase().replace(LETTERS, '');
    if (typed.length !== 6) return say('no_code');
    if (code && $('last').value.toUpperCase().replace(LETTERS, '') !== typed.slice(3)) return say('letters');
    busy(true, 'Sign in the TV');
    try {
      const email = $('email').value.trim(), { kdf } = await api('POST', '/v1/prelogin', { email });
      let keys; try { keys = await K.deriveKeys($('pw').value, kdf); } catch { throw Object.assign(new Error(), { code: 'weak_kdf' }); }
      const r = await api('POST', '/v1/login', { email, authKey: K.b64u(keys.ak), oneShot: true });
      const dk = await K.unwrapKey(keys.wk, r.wrappedKey);
      const tv = await api('GET', `/v1/device/${typed}`, null, r.access);
      if (code && k && (await K.pubHash(tv.pub)) !== k) throw Object.assign(new Error(), { code: 'mismatch' });
      await api('POST', '/v1/device/approve', { user_code: typed, box: await K.handoverSeal(dk, tv.pub, typed) }, r.access);
      dk.fill(0);
      $('app').hidden = true; $('done').hidden = false; $('lead').textContent = `${tv.name} · ${typed.slice(0, 3)}-${typed.slice(3)}`;
    } catch (x) { say(x.code); } finally { busy(false, 'Sign in the TV'); }
  });
}

if (page === 'signup') {
  const inv = new URLSearchParams(location.search).get('invite'); if (inv) $('invite').value = inv;
  let text = '', email = '';
  $('f').addEventListener('submit', async (e) => {
    e.preventDefault(); $('err').hidden = true;
    const pw = $('pw').value; email = $('email').value.trim();
    if (pw.length < 12) return say('short');
    busy(true, 'Continue');
    try {
      const a = await K.newAccountKeys(pw);
      const r = await api('POST', '/v1/signup', { invite: $('invite').value, email, device: { name: 'Web page', kind: 'web' }, ...a.body });   // (the invite exactly as typed)
      await api('POST', '/v1/logout', null, r.access).catch(() => {});   // (this page keeps no session)
      text = a.rkText;
      $('key').innerHTML = text.split('-').map((g) => `<span>${g}</span>`).join('');
      $('f').hidden = true; $('rk').hidden = false; document.querySelector('main > h1').hidden = true; document.querySelector('main > .lead').hidden = true;
    } catch (x) { say(x.code); } finally { busy(false, 'Continue'); }
  });
  $('tick').addEventListener('change', () => { $('cont').disabled = !$('tick').checked; });
  $('copy').addEventListener('click', () => { navigator.clipboard?.writeText(text); $('copy').textContent = 'Copied'; });
  $('save').addEventListener('click', () => {
    const blob = new Blob([`airglow recovery key\n\n${text}\n\nEmail: ${email}\nMade: ${new Date().toDateString()}\n`], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'airglow recovery key.txt'; a.click();
  });
  $('cont').addEventListener('click', () => { text = ''; $('rk').hidden = true; $('done').hidden = false; });
}

if (page === 'recover') {
  $('f').addEventListener('submit', async (e) => {
    e.preventDefault(); $('err').hidden = true;
    const pw = $('pw').value, email = $('email').value.trim();
    if (pw.length < 12) return say('short');
    const rk = K.parseRecoveryKey($('rkey').value);
    if (!rk) return say('bad_recovery');
    busy(true, 'Set the new password');
    try {
      const { rwk, rak } = await K.recoveryKeys(rk);
      const st = await api('POST', '/v1/recover/start', { email, recoveryAuthKey: K.b64u(rak) });
      const dk = await K.unwrapKey(rwk, st.recoveryWrappedKey);
      const r = await api('POST', '/v1/recover', { email, recoveryAuthKey: K.b64u(rak), ...(await K.rewrap(pw, dk, rk)), device: { name: 'Web page', kind: 'web' } });
      await api('POST', '/v1/logout', null, r.access).catch(() => {});
      $('f').hidden = true; $('done').hidden = false;
    } catch (x) { say(x.code); } finally { busy(false, 'Set the new password'); }
  });
}
