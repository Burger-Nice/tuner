// Bug hunt: adversarial add-ons added the "Type the link" way (readManifest + the confirm + addAddon), served with
// page.route: junk manifests (a null resource, catalogs as an object, a null catalog, extra as an object), a huge
// manifest, a slow one, a redirect to a web page; then Account > Add-ons, Movies, a title page and Search.
const C = require('./addons-common.js');
const J = (o) => ({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
const base = { version: '1.0.0', types: ['movie', 'series'], idPrefixes: ['tt'] };
const V = {
  nullres: { ...base, id: 'x.nullres', name: 'NullRes', resources: ['stream', null], catalogs: [] },
  catobj: { ...base, id: 'x.catobj', name: 'CatObj', resources: ['catalog', 'stream'], catalogs: {} },
  catnull: { ...base, id: 'x.catnull', name: 'CatNull', resources: ['catalog'], catalogs: [null] },
  extraobj: { ...base, id: 'x.extraobj', name: 'ExtraObj', resources: ['catalog'], catalogs: [{ type: 'movie', id: 'top', name: 'Top', extra: { genre: 1 } }] },
  huge: { ...base, id: 'x.huge', name: 'Huge', resources: ['catalog', 'stream'], catalogs: Array.from({ length: 3000 }, (_, i) => ({ type: 'movie', id: 'c' + i, name: 'Catalog ' + i, extra: [{ name: 'genre', options: Array.from({ length: 40 }, (_, j) => 'Genre number ' + j) }, { name: 'skip' }] })) },
};
module.exports = async ({ p, shot, key }) => {
  const { check } = C;
  const ev = (f, a) => p.evaluate(f, a);
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await C({ p, key }, { addons: true });
  await p.route('http://junk.test/**', async (route) => {
    const u = new URL(route.request().url());
    const v = u.pathname.split('/')[1];
    if (v === 'slow') { await new Promise((r) => setTimeout(r, 8000)); return route.fulfill(J({ ...base, id: 'x.slow', name: 'Slow', resources: ['stream'] })).catch(() => {}); }
    if (v === 'redir') return route.fulfill({ status: 302, headers: { Location: 'http://junk.test/page/index.html', 'Access-Control-Allow-Origin': '*' } });
    if (v === 'page') return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Docs</title><p>moved</p>' });
    if (u.pathname.endsWith('manifest.json') && V[v]) return route.fulfill(J(V[v]));
    if (/\/stream\//.test(u.pathname)) return route.fulfill(J({ streams: [] }));
    if (/\/catalog\//.test(u.pathname)) return route.fulfill(J({ metas: [] }));
    return route.fulfill({ status: 404, body: '' });
  });
  const add = (v) => ev(async (v) => {
    const A = await import('/tv/js/addons.js');
    const S = await import('/tv/js/screens/addons.js');
    const r = await A.readManifest(`http://junk.test/${v}/manifest.json`);
    if (!r.ok) return 'not ok: ' + r.why;
    try { S.confirm(r, 'typed'); } catch (e) { return 'confirm threw: ' + e.message; }
    const b = document.querySelector('.ov:last-child [data-act="add"]');
    if (!b) return 'no Add it button';
    b.click();
    return 'added: ' + A.addons().map((a) => a.manifest?.name).join(', ');
  }, v);
  const tour = async (label) => {
    errs.length = 0;
    await ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(800);
    await ev(() => document.querySelector('[data-g="addons"]').click()); await p.waitForTimeout(800);
    const acc = await ev(() => document.querySelectorAll('[data-screen="account"] .ad-row').length);
    await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(1500);
    const chips = await ev(() => document.querySelectorAll('[data-screen="movie"] .chip, [data-screen="movie"] [data-chip]').length);
    await shot(label + '-movies');
    await ev(async () => { const a = await import('/tv/js/actions.js'), c = await import('/tv/js/catalog.js'); a.openDetail(c.catalog.movie.titles.find((x) => x.name === 'The Long Night')); });
    await p.waitForTimeout(2500); await shot(label + '-detail');
    const pill = await ev(() => document.querySelector('[data-screen="detail"] [data-act="version"]')?.innerText.replace(/\s+/g, ' ') || '(no pill)');
    check(`${label}: no page errors`, !errs.length, `acct rows ${acc} · movie chips ${chips} · pill ${pill} · ${errs.slice(0, 3).join(' | ')}`);
    await key('Escape', 1, 500);
  };
  for (const v of ['nullres', 'catobj', 'catnull', 'extraobj']) {
    errs.length = 0;
    const r = await add(v);
    console.log(v.padEnd(9), r, errs.slice(0, 2).join(' | '));
    await p.waitForTimeout(300);
    await ev(() => { while (document.querySelector('#overlays .ov')) document.querySelector('#overlays .ov').remove(); });
    await tour(v);
    // remove it again (so the next one is tested alone)
    await ev(async (v) => { const A = await import('/tv/js/addons.js'); const a = A.addons().find((x) => x.manifest?.id === 'x.' + v); if (a) A.removeAddon(a); }, v);
  }
  // slow and redirect: what the typed screen says
  for (const v of ['slow', 'redir']) console.log(v.padEnd(9), await ev(async (v) => { const A = await import('/tv/js/addons.js'); const t = Date.now(); const r = await A.readManifest(`http://junk.test/${v}/manifest.json`); return JSON.stringify(r) + ' in ' + (Date.now() - t) + ' ms'; }, v));
  // huge: localStorage
  const used = () => ev(() => { let n = 0; for (const k of Object.keys(localStorage)) n += k.length + localStorage.getItem(k).length; return n; });
  console.log('localStorage chars before huge', await used());
  console.log('huge', await add('huge'));
  console.log('localStorage chars after huge', await used());
  const saved = await ev(() => { const acc = JSON.parse(localStorage.getItem('tuner.accounts'))[0]; return (JSON.parse(localStorage.getItem(`tuner.a:${acc.id}:addons`)) || []).map((a) => a.manifest?.name).join(', '); });
  check('huge: the list was saved', /Huge/.test(saved), saved);
  // can other settings still be saved?
  const ok2 = await ev(() => window.Core.store.set('hunt2probe', 'x'.repeat(200000)));
  check('huge: a 200 KB setting still saves', ok2 !== false, String(ok2));
  await ev(() => window.Core.store.del?.('hunt2probe'));
  await ev(async () => { const A = await import('/tv/js/addons.js'); const a = A.addons().find((x) => x.manifest?.id === 'x.huge'); if (a) A.removeAddon(a); });
};
