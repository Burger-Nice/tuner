// airglow accounts on the iPhone (design/ui-v1/accounts-v1 05, 06, 04, 04b) against the local Worker: sign-up with the
// owner code (or sign-in when the owner exists), the recovery key step, Account's group, then approving a TV from an
// airglow:// link on the same network (the tick) and from another network (the three letters), and the TV opening
// the box. Run: tests/tv/serve.sh; node scripts/build-web.js phone; serve www on 8779; node tests/phone/account.js <out>
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2] || '.tmp/phone-account';
const APP = process.env.PHONE_URL || 'http://127.0.0.1:8779/index.html';
const W = 'http://127.0.0.1:8790';
fs.mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(52)} ${detail}`); return ok; };
const api = async (m, path, body, ip) => { const r = await fetch(W + path, { method: m, headers: { 'content-type': 'application/json', ...(ip ? { 'x-test-ip': ip } : {}) }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); return { status: r.status, body: t ? JSON.parse(t) : null }; };
(async () => {
  const K = await import('../../app/tv/js/account/crypto.js');
  const b = await chromium.launch({ args: ['--disable-web-security'] });
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message}`));
  await p.addInitScript((W) => {
    localStorage.setItem('tuner.acctHost', JSON.stringify(W)); window.TUNER_TEST = 1;
    window.Capacitor = { Plugins: { Network: { getStatus: async () => ({ connected: true, connectionType: window.__wifi === false ? 'cellular' : 'wifi' }) } } };   // (the Network plugin: on Wi-Fi)
  }, W);
  let n = 0;
  const shot = async (name) => { await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); };
  const ev = (f, a) => p.evaluate(f, a);
  const tap = async (sel) => { await (await p.waitForSelector(sel, { timeout: 8000 })).tap(); await p.waitForTimeout(350); };
  await p.goto(APP); await p.waitForTimeout(1500);
  check('the sign-in card says nothing else to sign in to', await ev(() => /No other sign-in/.test(document.body.textContent)));
  await shot('signin');
  // the owner's account: sign up with the owner code when it is unclaimed, else sign in
  const pre = await api('POST', '/v1/prelogin', { email: 'owner@example.com' });
  const kd = await K.deriveKeys('correct horse battery', pre.body.kdf);
  const exists = (await api('POST', '/v1/login', { email: 'owner@example.com', authKey: K.b64u(kd.ak), oneShot: true })).status === 200;
  if (!exists) {
    await tap('[data-act="agUpOpen"]');
    await p.fill('#agInv', 'copper kettle quiet harbour'); await p.fill('#agEmail', 'owner@example.com'); await p.fill('#agName', 'Birgir'); await p.fill('#agPw', 'correct horse battery');
    await shot('signup');
    await tap('[data-act="agUp"]');
    await p.waitForSelector('#rkok', { timeout: 20000 });
    const key = await ev(() => [...document.querySelectorAll('.ag-key span')].map((s) => s.textContent).join('-'));
    check('the recovery key: 20 characters in five groups', /^[0-9A-Z]{4}(-[0-9A-Z]{4}){4}$/.test(key), key.replace(/[A-Z0-9]/g, '•'));
    check('Continue is dim until the tick', await ev(() => document.querySelector('[data-act="rkdone"]').disabled));
    await shot('recovery-key');
    await tap('#rkok'); await tap('[data-act="rkdone"]');
  } else {
    await p.fill('#agEmail', 'owner@example.com'); await p.fill('#agPw', 'correct horse battery');
    await tap('[data-act="agGo"]');
  }
  await p.waitForFunction(() => /home|signin/.test(window.__tunerTest?.state().screen) && !document.querySelector('[data-act="agGo"]'), null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(3000);
  check('signed in', await ev(() => !!JSON.parse(localStorage.getItem('tuner.acct') || 'null')));
  check('the data key is not in plain localStorage (only the browser test store)', await ev(() => !Object.keys(localStorage).filter((k) => !k.startsWith('tuner.devsecret')).some((k) => (localStorage.getItem(k) || '').includes('"dk"'))));
  await shot('after-signin');
  // Account's group
  await ev(() => window.__tunerTest.push('account')); await p.waitForTimeout(1200);
  check('Account shows the airglow account group', await ev(() => /airglow account/i.test(document.body.textContent) && /Sign in a TV/.test(document.body.textContent)));
  await shot('account');
  // a TV on the same network asks; the link opens the sheet with the tick
  const tvSame = await K.tvKeyPair();
  const c1 = (await api('POST', '/v1/device/code', { name: 'Philips TV', kind: 'tv', pub: tvSame.pub })).body;
  await ev(([c, k]) => window.__agOpenLink(`airglow://tv?code=${c}&k=${k}`), [c1.user_code, tvSame.k]);
  await p.waitForSelector('.agp', { timeout: 10000 });
  check('same network on Wi-Fi: the tick, no letters', await ev(() => /On the same network as this iPhone/.test(document.querySelector('.agp').textContent) && !document.querySelector('#agLast')));
  await shot('approve-same');
  await tap('.agp [data-act="yes"]'); await p.waitForTimeout(800);
  await new Promise((r) => setTimeout(r, 5200));
  const t1 = await api('POST', '/v1/device/token', { device_code: c1.device_code });
  let ok1 = false; try { const dk = await K.handoverOpen(tvSame, t1.body.box, c1.user_code); ok1 = await K.dkCheckOk(await K.subkeys(dk), t1.body.dkCheck); } catch {}
  check('the TV opens the box and its check', ok1, JSON.stringify(t1.body?.error || ''));
  // another network: the last three letters first (checked on the phone)
  const tvOther = await K.tvKeyPair();
  const c2 = (await api('POST', '/v1/device/code', { name: 'Bedroom TV', kind: 'tv', pub: tvOther.pub }, '198.51.100.20')).body;
  await ev(([c, k]) => window.__agOpenLink(`airglow://tv?code=${c}&k=${k}`), [c2.user_code, tvOther.k]);
  await p.waitForSelector('#agLast', { timeout: 10000 });
  check('another network: the code ends in ___ and Sign in the TV is dim', await ev(() => /___/.test(document.querySelector('.agp .sub').textContent) && document.querySelector('.agp [data-act="yes"]').disabled));
  await shot('approve-other');
  await p.fill('#agLast', 'XXX'.slice(0, 3) === c2.user_code.slice(3) ? 'BBB' : 'XXX');
  check('wrong letters keep it dim', await ev(() => document.querySelector('.agp [data-act="yes"]').disabled));
  await p.fill('#agLast', c2.user_code.slice(3).toLowerCase());
  check('the right letters light it', await ev(() => !document.querySelector('.agp [data-act="yes"]').disabled));
  await shot('approve-other-letters');
  // a link whose key doesn't match the TV the server names is refused
  const c3 = (await api('POST', '/v1/device/code', { name: 'Odd TV', kind: 'tv', pub: tvOther.pub })).body;
  await tap('.agp [data-act="no"]'); await p.waitForTimeout(500);
  await ev(([c, k]) => window.__agOpenLink(`airglow://tv?code=${c}&k=${k}`), [c3.user_code, tvSame.k]);
  await p.waitForTimeout(1500);
  check('a link that doesn\'t match its TV is refused', await ev(() => /doesn't match the TV/.test(document.body.textContent)));
  console.log(errs.length ? errs.join('\n') : 'no page errors');
  const bad = results.filter((r) => !r.ok);
  console.log(`${results.length - bad.length} of ${results.length} passed`);
  await b.close();
  process.exit(bad.length || errs.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
