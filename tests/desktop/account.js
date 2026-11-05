// airglow accounts on the Windows app (design/ui-v1/accounts-v1 05, 08) in Chromium with tests/desktop/stub.js:
// sign in with the owner's account (made by tests/tv/account-phone.mjs when missing) against the local Worker, the
// merge question for a PC that already has a provider, Account's group with the devices and an invite, sign out.
// Run: tests/tv/serve.sh; node tests/desktop/account.js <out>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const fs = require('fs');
const out = process.argv[2] || '.tmp/desktop-account';
const APP = process.env.DESKTOP_URL || 'http://127.0.0.1:8777/desktop.html';
fs.mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, d = '') => { results.push({ ok: !!ok }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(50)} ${d}`); };
(async () => {
  require('child_process').spawnSync(process.execPath, ['--no-warnings', path.join(__dirname, '..', 'tv', 'account-phone.mjs'), '--count'], { encoding: 'utf8' });   // (the owner exists)
  const b = await chromium.launch({ args: ['--disable-web-security'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript({ path: path.join(__dirname, 'stub.js') });
  await p.addInitScript(() => { localStorage.setItem('tuner.acctHost', JSON.stringify('http://127.0.0.1:8790')); window.TUNER_TEST = 1; });
  let n = 0;
  const shot = async (name) => { await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); };
  const ev = (f, a) => p.evaluate(f, a);
  const wait = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(f).catch(() => false)) return true; await p.waitForTimeout(200); } return false; };
  await p.goto(APP);
  await wait(() => document.querySelector('[data-act="noacct"]'));
  // life without an account first: the provider
  await p.click('[data-act="noacct"]'); await wait(() => document.querySelector('#siServer'));
  await p.fill('#siServer', 'http://127.0.0.1:8899'); await p.fill('#siUser', 'demo'); await p.fill('#siPass', 'demo'); await p.click('#siGo');
  await wait(() => document.querySelector('[data-act="done"]')); await p.click('[data-act="done"]'); await p.waitForTimeout(1500);
  // then Account › airglow account › Sign in
  await ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(800);
  await p.click('[data-grp="acct"]'); await shot('account-signed-out');
  check('Account offers Sign in to airglow', await ev(() => !!document.querySelector('[data-act="agSignin"]')));
  await p.click('[data-act="agSignin"]'); await wait(() => document.querySelector('#agEmail'));
  await p.fill('#agEmail', 'owner@example.com'); await p.fill('#agPw', 'correct horse battery');
  await shot('signin-card');
  await p.click('[data-act="agGo"]');
  const asked = await wait(() => /already has things/.test(document.body.textContent), 30000);
  check('a PC with a provider is asked to merge or not', asked);
  await shot('merge');
  if (asked) await p.click('[data-act="merge"]');
  await wait(() => window.__tunerTest.state().screen === 'home', 30000);
  await p.waitForTimeout(2500);
  check('signed in to airglow', await ev(() => !!JSON.parse(localStorage.getItem('tuner.acct') || 'null')));
  check('the keys are in the safeStorage stand-in, not localStorage', await ev(() => !!sessionStorage.getItem('stub-secret-acct') && !Object.keys(localStorage).some((k) => (localStorage.getItem(k) || '').includes('"refresh"'))));
  await ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(800);
  await p.click('[data-grp="acct"]'); await p.waitForTimeout(800);
  check('the sidebar says Account · synced', await ev(() => /Account · synced/.test(document.body.textContent)));
  await shot('account');
  await p.click('[data-act="agDevices"]'); await wait(() => /This PC/.test(document.body.textContent));
  check('Devices lists this PC and the phone', await ev(() => /This PC/.test(document.body.textContent) && /Test iPhone/.test(document.body.textContent)));
  await shot('devices');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await ev(() => document.querySelectorAll('.fl').forEach((x) => x.remove()));
  await p.click('[data-act="agInvite"]'); await p.waitForTimeout(1200);
  check('the owner makes an invite', await ev(() => /AIRGLOW-[A-Z]{4}-[A-Z]{4}/.test(document.body.textContent)));
  await shot('invite');
  await ev(() => document.querySelectorAll('.fl').forEach((x) => x.remove()));
  await p.click('[data-act="agOut"]'); await p.waitForTimeout(400); await p.click('.fl [data-act="yes"]');
  await wait(() => !localStorage.getItem('tuner.acct'), 10000);
  check('signed out: the account and its keys leave this PC', await ev(() => !localStorage.getItem('tuner.acct') && !sessionStorage.getItem('stub-secret-acct')));
  check('the PC\'s own provider stays', await ev(() => JSON.parse(localStorage.getItem('tuner.accounts') || '[]').length === 1 && !JSON.parse(localStorage.getItem('tuner.accounts'))[0].pid));
  console.log(errs.length ? errs.join('\n') : 'no page errors');
  const bad = results.filter((r) => !r.ok).length;
  console.log(`${results.length - bad} of ${results.length} passed`);
  await b.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
