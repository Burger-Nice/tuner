// Shared by the add-ons scripts (design/ui-v1/addons/SPEC.md): points the app at the fake add-ons, the fake Stremio
// API and the fake ratings file (tests/mock-addons.js, on the fake provider's port), signs in, and helpers.
// opts: { addons: true (start with the fake Stremio account's add-ons in the list), signedIn: true (a Stremio key),
//         at: ISO time (the page's clock) }
const H = 'http://127.0.0.1:8899';
module.exports = async ({ p, key }, opts = {}) => {
  const ev = (f, a) => p.evaluate(f, a);
  await fetch(`${H}/_stremio/reset`).catch(() => {});
  await fetch(`${H}/_addons/ok`).catch(() => {});
  if (opts.at) await p.clock.install({ time: new Date(opts.at) });
  await ev((H) => {
    localStorage.setItem('tuner.cinemetaBase', JSON.stringify(`${H}/addon/cinemeta`));
    localStorage.setItem('tuner.stremioApi', JSON.stringify(`${H}/stremio-api`));
    localStorage.setItem('tuner.stremioLink', JSON.stringify(`${H}/stremio-link`));
    localStorage.setItem('tuner.ratingsUrl', JSON.stringify(`${H}/ratings.json`));
  }, H);
  await p.reload(); await p.waitForTimeout(1500);
  const first = await ev(() => window.__tunerTest?.state().screen);
  if (first === 'first' || !first) await require('./signin.js')({ p, key });
  await p.waitForTimeout(2500);
  // a clean add-on state for this provider account
  await ev(async ({ addons, signedIn, H }) => {
    const acc = JSON.parse(localStorage.getItem('tuner.accounts') || '[]')[0];
    const pre = `tuner.a:${acc.id}:`;
    for (const k of Object.keys(localStorage)) if (k.startsWith(pre + 'addons') || k.startsWith(pre + 'stremio') || k.startsWith(pre + 'imdb') || k.startsWith(pre + 'ver')) localStorage.removeItem(k);
    await window.Core.cache.set('ratings', null);
    if (signedIn || addons) localStorage.setItem(pre + 'stremio', JSON.stringify({ authKey: 'AK-test-1', at: Date.now(), keep: true }));
    if (addons) {
      const r = await fetch(`${H}/stremio-api/api/addonCollectionGet`, { method: 'POST', body: JSON.stringify({ authKey: 'AK-test-1' }) }).then((x) => x.json());
      const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
      const ok = r.result.addons.filter((x) => /^http:\/\/127\.0\.0\.1:8899\/addon\/(cinemeta|northlight|kestrel|opensubtitles\/manifest|watchhub|pdm)/.test(x.transportUrl));
      const def = (m) => { const out = {}, seen = {}; for (const c of m.catalogs || []) { const req = [...(c.extra || []).filter((e) => e.isRequired).map((e) => e.name), ...(c.extraRequired || [])]; if (req.some((n) => n !== 'genre') || !['movie', 'series'].includes(c.type)) continue; seen[c.type] = (seen[c.type] || 0) + 1; out[`${c.type}:${c.id}`] = seen[c.type] <= 2; } return out; };
      localStorage.setItem(pre + 'addons', JSON.stringify(ok.map((x) => ({ key: 'ad' + hash(x.transportUrl), url: x.transportUrl, manifest: x.manifest, at: Date.now(), on: true, catalogs: def(x.manifest), from: 'stremio', kind: {}, health: {} }))));
      const st = JSON.parse(localStorage.getItem(pre + 'stremio')); st.syncedAt = Date.now(); localStorage.setItem(pre + 'stremio', JSON.stringify(st));
    }
  }, { ...opts, H });
  await p.reload(); await p.waitForTimeout(3500);
};
module.exports.H = H;
module.exports.where = (p) => p.evaluate(() => { const a = document.activeElement; return `${a.className} ${a.dataset.key || a.dataset.act || ''} "${(a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50)}"`; });
module.exports.ok = async (p, label, want) => { const w = await module.exports.where(p); const good = typeof want === 'function' ? want(w) : w.includes(want); console.log((good ? 'OK   ' : 'FAIL ') + label.padEnd(34), w); return good; };
module.exports.check = (label, good, detail = '') => { console.log((good ? 'OK   ' : 'FAIL ') + label.padEnd(34), detail); return good; };
module.exports.hold = async (p) => { await p.keyboard.down('Enter'); await p.waitForTimeout(650); await p.keyboard.up('Enter'); await p.waitForTimeout(400); };
