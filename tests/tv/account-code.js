// airglow accounts on the TV (design/ui-v1/accounts-v1): the door, the code screen (01) against the local Worker, a
// phone approving it (the same calls the iPhone app makes), the merge question (02), the account group (03), sign out.
// Run: tests/tv/serve.sh, then node tests/tv/drive.js <out> account-code
module.exports = async ({ p, shot, key, log }) => {
  const ev = (f, a) => p.evaluate(f, a);
  const fails = [];
  const check = (name, ok) => { console.log(ok ? 'ok  ' : 'FAIL', name); if (!ok) fails.push(name); };
  await p.waitForFunction(() => !document.getElementById('app').classList.contains('l-on'), null, { timeout: 15000 });
  // a TV with a provider and history already (life without an account), then the account
  await require('./signin.js')({ p, key }); await p.waitForTimeout(3000);
  await ev(() => {
    localStorage.setItem('tuner.acctHost', JSON.stringify('http://127.0.0.1:8790'));
    const a = JSON.parse(localStorage.getItem('tuner.accounts'))[0];   // (two saved channels from life without an account)
    localStorage.setItem(`tuner.a:${a.id}:favs`, JSON.stringify({ 'live:1': { kind: 'live', id: '1', name: 'NBA 01' }, 'live:2': { kind: 'live', id: '2', name: 'NBA 02' } }));
  });
  await ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(800);
  await ev(() => document.querySelector('[data-screen="account"] .gl[data-g="acct"]')?.click()); await p.waitForTimeout(500);
  await ev(() => document.querySelector('[data-screen="account"] .arow.fx')?.focus()); await p.waitForTimeout(300);
  await shot('account-not-signed-in');
  check('Account starts with the airglow account group', await ev(() => /Sign in on your phone/.test(document.querySelector('[data-screen="account"] .inner')?.textContent || '')));
  await key('Enter'); await p.waitForTimeout(2500);
  const code = await ev(() => [...document.querySelectorAll('#agCode span')].map((s) => s.textContent).join(''));
  check('the code screen shows six letters', /^[BCDFGHJKLMNPQRSTVWXZ]{6}$/.test(code));
  check('the QR is drawn', await ev(() => !!document.querySelector('.ag-qr svg path')));
  await shot('code');
  // the phone: the owner's account (sign-up with the owner code), then the approval, in Node against the same Worker
  const phone = require('child_process').spawnSync(process.execPath, ['--no-warnings', require('path').join(__dirname, 'account-phone.mjs'), code], { encoding: 'utf8' });
  console.log(phone.stdout.trim(), phone.stderr.trim());
  check('the phone approved the code', /approved/.test(phone.stdout));
  await p.waitForSelector('.ag-merge', { timeout: 20000 }).catch(() => {});
  await shot('merge-question');
  check('the merge question shows (this TV has things)', await ev(() => !!document.querySelector('.ag-merge')));
  await key('Escape'); await p.waitForTimeout(400);
  check('Back on the question only says to pick one', await ev(() => !!document.querySelector('.ag-merge') && /Pick one/.test(document.body.textContent)));
  await key('Enter'); await p.waitForTimeout(6000);
  await shot('after-merge');
  await ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(1500);
  await ev(() => document.querySelector('[data-screen="account"] .gl[data-g="acct"]')?.click()); await p.waitForTimeout(800);
  await shot('account-signed-in');
  check('Account says Signed in', await ev(() => /Signed in/.test(document.querySelector('[data-screen="account"] .inner')?.textContent || '')));
  check('the provider got a pid and synced', await ev(() => JSON.parse(localStorage.getItem('tuner.accounts') || '[]').some((a) => a.pid)));
  check('the data key is not in localStorage as plain', await ev(() => !Object.keys(localStorage).some((k) => /dk/.test(localStorage.getItem(k) || '') && !k.startsWith('tuner.devsecret'))));
  const r = require('child_process').spawnSync(process.execPath, ['--no-warnings', require('path').join(__dirname, 'account-phone.mjs'), '--count'], { encoding: 'utf8' });
  console.log(r.stdout.trim());
  check('the server holds this TV\'s provider and saved channels (encrypted)', /providers:1/.test(r.stdout) && /favs:[1-9]/.test(r.stdout));
  // A record too big for the server (an add-on with a 300 KB manifest, a 200 KB Home picks list) never stops the rest:
  // the add-on goes without its manifest, the picks wait on this TV, and a saved channel added after them still syncs
  const big = await ev(async () => {
    const Y = await import('/tv/js/account/sync.js'), A = await import('/tv/js/account/acct.js'), st = await import('/tv/js/state.js');
    const u = A.me().id, txt = 'Íslenskt efni á íslensku ✨ '.repeat(11000);
    st.store.set(`u:${u}:addons`, [...st.store.get(`u:${u}:addons`, []), { url: 'https://big.example/manifest.json', manifest: { id: 'big', name: 'Big', description: txt, resources: [], types: [], catalogs: [] } }]);
    st.store.set(`u:${u}:picks`, { genres: [txt.slice(0, 200000)] });
    const acc = st.store.get('accounts', [])[0], favs = st.store.get(`a:${acc.id}:favs`, {});
    favs['live:after-big'] = { kind: 'live', id: 'after-big', name: 'After big' }; st.store.set(`a:${acc.id}:favs`, favs);
    await Y.syncNow();
    const y = Y.syncStatus();
    return { state: y.state, error: y.error, waiting: y.waiting };
  });
  console.log('big:', JSON.stringify(big));
  check('a record too big for the server waits; the sync still finishes', big.state === 'idle' && !big.error && big.waiting === 1, JSON.stringify(big));
  const r2 = require('child_process').spawnSync(process.execPath, ['--no-warnings', require('path').join(__dirname, 'account-phone.mjs'), '--count'], { encoding: 'utf8' });
  console.log(r2.stdout.trim());
  check('... and the add-on (without its manifest) and the saved channel after it reached the server', /addons:[1-9]/.test(r2.stdout) && /favs:[2-9]/.test(r2.stdout), r2.stdout.trim());
  // The owner's TV: the add-on list saved as null (a sync dropped the list in memory while an add-on step was saving):
  // every sync then stopped with "list is not iterable". It is rebuilt from the last sync and nothing is deleted
  const nul = await ev(async () => {
    const Y = await import('/tv/js/account/sync.js'), A = await import('/tv/js/account/acct.js'), st = await import('/tv/js/state.js');
    const u = A.me().id, before = st.store.get(`u:${u}:addons`, []).length;
    localStorage.setItem(`tuner.u:${u}:addons`, 'null');
    await Y.syncNow();
    const y = Y.syncStatus(), after = st.store.get(`u:${u}:addons`, []);
    return { before, after: Array.isArray(after) ? after.length : String(after), state: y.state, error: y.error, detail: y.detail };
  });
  console.log('null list:', JSON.stringify(nul));
  check('a null add-on list: the sync finishes and the add-ons come back from the last sync', nul.state === 'idle' && !nul.error && nul.after === nul.before && nul.before >= 1);
  const r3 = require('child_process').spawnSync(process.execPath, ['--no-warnings', require('path').join(__dirname, 'account-phone.mjs'), '--count'], { encoding: 'utf8' });
  console.log(r3.stdout.trim());
  check('... and the account still holds them', /addons:[2-9]/.test(r3.stdout));
  // Devices sheet
  await ev(() => document.querySelector('[data-act="acctdevices"]')?.focus()); await key('Enter'); await p.waitForTimeout(1500);
  await shot('devices');
  check('Devices lists the TV approved by the phone', await ev(() => /with Test iPhone/.test(document.querySelector('.sheet')?.textContent || '')));
  await key('Escape');
  if (fails.length) console.log(`${fails.length} FAILED: ${fails.join(' · ')}`);
  void log;
};
