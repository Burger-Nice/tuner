// Account > Add-ons (design/ui-v1/addons/SPEC.md 3): the empty list, the four ways, the Stremio code screen (the fake
// phone signs in), Your Stremio add-ons (what's left out and why, Public Domain Movies unticked), the list with its
// states, an add-on's sheet with its catalog switches, Move, hold OK, Stremio's list (the Subtitles filter), typing a
// link that isn't an add-on, the confirm, the email fallback's errors, and signing out (logout is called).
// Run: node tests/tv/drive.js <out> addons-account   (mocks: design/ui-v1/addons/png/acct-*.png, add-*.png)
const C = require('./addons-common.js');
const flows = async ({ p, shot, key }) => {
  const { ok, check, hold, H } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, {});
  const toAddons = async () => { await ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(900); await ev(() => document.querySelector('[data-g="addons"]').click()); await p.waitForTimeout(600); await ev(() => document.querySelector('[data-screen="account"] [data-act="ad:add"]').focus()); };
  await toAddons();
  await ok(p, 'empty: Add an add-on', 'ad:add'); await shot('acct-empty');
  await key('Enter', 1, 700); await ok(p, 'four ways: Stremio first', 'stremio'); await shot('add-ways');
  const phoneDis = await ev(() => document.querySelector('[data-act="phone"]').classList.contains('dis'));
  check('phone way waits for the native page', phoneDis);
  // the code screen
  await key('Enter', 1, 1500); await ok(p, 'code: the email button', 'email'); await shot('add-stremio-code');
  const qr = await ev(() => !!document.querySelector('.ad-full svg.qr path'));
  check('a real QR code is drawn', qr, await ev(() => document.querySelector('.ad-code')?.textContent));
  await fetch(`${H}/_stremio/approve`);
  await p.waitForTimeout(4500);
  await ok(p, 'found: Add 4 add-ons', (w) => /Add \d add-ons/.test(w)); await shot('add-stremio-found');
  const found = await ev(() => document.querySelector('.ad-full').innerText);
  check('left out: Local Files, YouTube, old OpenSubtitles', /Local Files/.test(found) && /YouTube/.test(found) && /older kind/.test(found));
  check('Public Domain Movies starts unticked', await ev(() => { const r = [...document.querySelectorAll('.ad-imp .ad-lr')].find((x) => /Public Domain/.test(x.textContent)); return r && !r.querySelector('.ck.on'); }));
  check('the link with a key is never on screen', !/eyJ|SECRET/.test(found));
  await key('Enter', 1, 1200);
  await ok(p, 'list: first add-on', 'ad:'); await shot('acct-addons');
  const rows = await ev(() => [...document.querySelectorAll('[data-screen="account"] .ad-row')].map((r) => r.innerText.replace(/\s+/g, ' ')));
  console.log(rows.join('\n'));
  check('list shows no secret', !rows.join(' ').includes('eyJ'));
  // the sheet: Cinemeta (catalog switches)
  await key('Enter', 1, 800); await ok(p, 'sheet: Use this add-on', 'use'); await shot('acct-addon-sheet');
  await key('ArrowDown', 1, 300); await shot('acct-addon-sheet-cat');
  await key('Escape', 1, 500);
  // hold OK on Northlight: Move first
  await key('ArrowDown', 1, 300); await ok(p, 'Northlight row', 'ad:');
  await hold(p); await ok(p, 'hold menu: Move first', 'Move'); await shot('acct-addon-hold');
  await key('Enter', 1, 500); await key('ArrowDown', 1, 400); await shot('acct-addon-move');
  const lifted = await ev(() => document.querySelector('.ad-row.lift')?.innerText.replace(/\s+/g, ' '));
  check('Move: the row lifts, "3 of N"', /3 of \d/.test(lifted || ''), lifted);
  await key('Escape', 1, 600);
  const back = await ev(() => [...document.querySelectorAll('[data-screen="account"] .ad-row')].map((r) => r.querySelector('.a').textContent));
  check('Back puts it back', back[1] === 'Northlight', back.join(', '));
  // Stremio's list: Community · Subtitles, with the other-language filter
  await key('ArrowUp', 2, 150); await ok(p, 'Add an add-on', 'ad:add');
  await key('Enter', 1, 600); await key('ArrowDown', 1, 200); await key('Enter', 1, 1500); await shot('add-list');
  const list = await ev(() => document.querySelector('.ad-full').innerText);
  check('Subtitles: Legendas Brasil left out', !/Legendas/.test(list) && /1 for other languages left out/.test(list), list.split('\n').slice(0, 3).join(' | '));
  await key('ArrowUp', 1, 200); await key('ArrowRight', 3, 150); await key('Enter', 1, 600); await shot('add-list-extras');
  await key('ArrowDown', 1, 300); await ok(p, 'Extras: a row', 'row'); await key('Enter', 1, 600); await ok(p, 'confirm: Add it', 'add'); await shot('add-confirm');
  await key('ArrowRight', 1, 200); await key('Enter', 1, 400); await key('Escape', 1, 500);
  // typing a link that isn't an add-on
  await key('ArrowDown', 3, 150); await ok(p, 'type the link', 'type'); await key('Enter', 1, 600);
  await ev((H) => { document.querySelector('#adUrl').value = `${H}/addon/archivio/manifest.json`; }, H);
  await key('ArrowDown', 1, 200); await key('Enter', 1, 1500); await shot('add-type-notaddon');
  check('not an add-on: says what came back', await ev(() => /isn't an add-on: it sent a web page/.test(document.querySelector('.ad-full').innerText)));
  await ev((H) => { document.querySelector('#adUrl').value = `${H}/addon/aftercredits/manifest.json`; }, H);
  await key('ArrowDown', 1, 200); await key('Enter', 1, 1500); await ok(p, 'typed: the confirm', 'add'); await shot('add-confirm-typed');
  await key('Enter', 1, 800);
  const n = await ev(() => document.querySelectorAll('[data-screen="account"] .ad-row').length);
  check('AfterCredits added', n >= 6, `${n} rows`);
  // the email fallback's errors
  await ev(() => window.__tunerTest.go('home')); await toAddons();
  await key('Enter', 1, 600); await key('Enter', 1, 1500); await ok(p, 'signed in: found again', (w) => /Done|Add/.test(w)); await shot('found-again'); await key('Escape', 1, 500); await key('Escape', 1, 400); await key('Escape', 1, 400);   // (Back: the sheet, the group on the left, the top bar)
  // sign out (Keep the add-ons)
  await key('ArrowDown', 12, 120); await ok(p, 'Stremio account row', 'ad:stremio'); await key('Enter', 1, 500); await shot('stremio-signout'); await key('Enter', 1, 1200);
  const st = await fetch(`${H}/_stremio/state`).then((r) => r.json());
  check('sign out called logout', st.logouts === 1, `logouts ${st.logouts}`);
  // email with an unknown address
  await ev(() => document.querySelector('[data-screen="account"] [data-act="ad:add"]').focus()); await key('Enter', 1, 600); await key('Enter', 1, 1500); await ok(p, 'signed out: the code again', 'email'); await key('Enter', 1, 800);
  await ev(() => { document.querySelector('#adEmail').value = 'nobody@example.com'; document.querySelector('#adPass').value = 'x'; });
  await key('ArrowDown', 2, 200); await ok(p, 'email: Sign in', 'signin'); await key('Enter', 1, 1500); await shot('add-stremio-email');
  check('unknown email: under the field', await ev(() => /No Stremio account uses this email/.test([...document.querySelectorAll('.ad-full')].pop().innerText)));
  await ev(() => { document.querySelector('#adEmail').value = 'demo@example.com'; document.querySelector('#adPass').value = 'demo'; });
  await key('ArrowDown', 2, 200); await key('Enter', 1, 2500); await ok(p, 'email: signed in, found', (w) => /Done|Add/.test(w));
};
// the states (state-addon-down): Kestrel timed out 3 times (Not answering, tries again later), Archivio's manifest is a
// web page now (Not an add-on any more), learnt on opening Add-ons
module.exports = async (ctx) => {
  await flows(ctx);
  const { p, shot } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  await ev((H) => {
    const acc = JSON.parse(localStorage.getItem('tuner.accounts') || '[]')[0];
    const k = `tuner.a:${acc.id}:addons`, l = JSON.parse(localStorage.getItem(k) || '[]');
    const now = Date.now();
    const kes = l.find((a) => a.manifest?.name === 'Kestrel');
    if (kes) kes.health = { fails: [now - 25 * 60e3, now - 12 * 60e3, now - 8 * 60e3], downSince: now - 30 * 60e3, downUntil: now + 30 * 60e3 };
    l.push({ key: 'adarchivio', url: `${H}/addon/archivio/manifest.json`, manifest: { id: 'org.archivio', name: 'Archivio', version: '0.9.0', resources: ['catalog', 'meta'], types: ['movie'], catalogs: [] }, at: 0, on: true, catalogs: {}, from: 'typed', kind: {}, health: { lastOk: Date.parse('2026-10-24T20:00:00Z') } });
    localStorage.setItem(k, JSON.stringify(l));
  }, C.H);
  await p.reload(); await p.waitForTimeout(2500);
  await ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(900);
  await ev(() => document.querySelector('[data-g="addons"]').click()); await p.waitForTimeout(2500);
  await ev(() => document.querySelector('[data-screen="account"] [data-ad="adarchivio"]')?.focus());
  await ev(() => document.querySelector('[data-screen="account"] [data-ad="adarchivio"]')?.dispatchEvent(new CustomEvent('tvfocus', { bubbles: true })));
  await p.waitForTimeout(500); await shot('state-addon-down');
  const rows = await ev(() => [...document.querySelectorAll('[data-screen="account"] .ad-row')].map((r) => r.innerText.replace(/\s+/g, ' ')));
  console.log(rows.join('\n'));
  C.check('Kestrel: Not answering, tries again', rows.some((r) => /Kestrel/.test(r) && /No answer in 10 s, 3 times since/.test(r) && /Not answering/.test(r)));
  C.check('Archivio: Not an add-on any more', rows.some((r) => /Archivio/.test(r) && /Opens a web page now · last worked/.test(r) && /Not an add-on any more/.test(r)));
};
