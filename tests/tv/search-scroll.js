// Search: "night" has 64 films. The results scroll with ▼ (focus stays in them, nothing below y 513, ▼ past the last
// stays put), the scope chips (Movies: only films; All 64 movies), and Movies' Search button (scoped; Back returns).
// Run: node tests/tv/drive.js <out> search-scroll
module.exports = async ({ p, shot, key }) => {
  const ev = (f, a) => p.evaluate(f, a);
  const C = require('./addons-common.js');
  const { check } = C;
  await require('./signin.js')({ p, key });
  await p.waitForTimeout(3000);
  await ev(() => window.__tunerTest.go('search')); await p.waitForTimeout(2500);
  for (const c of 'NIGHT') await p.keyboard.press(c);
  await p.waitForFunction(() => document.querySelectorAll('[data-right] .rrow').length > 3, null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(500);
  await shot('all');
  const at = () => ev(() => { const a = document.activeElement, r = a.getBoundingClientRect(); return { cls: a.className, top: Math.round(r.top), bottom: Math.round(r.bottom), inR: !!document.querySelector('[data-right]').contains(a), scope: a.dataset.scope || '', text: (a.innerText || '').split('\n')[0].slice(0, 30) }; });
  // into the results from the keyboard
  await ev(() => document.querySelector('[data-key="F"]').focus()); await key('ArrowRight', 1, 400);
  let a = await at();
  check('▶ from the keyboard lands in the results', a.inR, JSON.stringify(a));
  const seen = [];
  for (let i = 0; i < 16; i++) { await key('ArrowDown', 1, 220); seen.push(await at()); }
  check('All: ▼ moves through the results and never leaves them', seen.every((x) => x.inR), seen.map((x) => x.text).join(' | '));
  check('All: the focused row is always inside the screen', seen.every((x) => x.bottom <= 513 && x.top >= 82), seen.map((x) => `${x.top}-${x.bottom}`).join(' '));
  await shot('all-bottom');
  const more = seen.find((x) => /All \d+/.test(x.text));
  check('All: an "All N movies" row', !!more, more?.text);
  // the Movies chip
  await ev(() => document.querySelector('[data-right] .s-scope [data-scope="movie"]').focus()); await key('Enter', 1, 500);
  const rows = await ev(() => [...document.querySelectorAll('[data-right] .rrow')].map((r) => r.dataset.res || ''));
  check('Movies: only films, all of them', rows.length >= 60 && rows.every((r) => /^t:movie:/.test(r)), `${rows.length} rows`);
  for (let i = 0; i < 70; i++) await key('ArrowDown', 1, 60);
  await p.waitForTimeout(400);
  a = await at();
  check('Movies: held ▼ reaches the last film and stays there', a.inR && a.bottom <= 513, JSON.stringify(a));
  await shot('movies-last');
  await key('ArrowDown', 1, 300); const b = await at();
  check('Movies: ▼ past the last stays on it', b.text === a.text && b.inR, b.text);
  // from the Movies tab
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(2500);
  await ev(() => document.querySelector('[data-screen="movie"] [data-act="search"]')?.focus()); await p.waitForTimeout(200);
  check('Movies has a Search button', await ev(() => document.activeElement?.dataset.act === 'search'), '');
  await key('Enter', 1, 1200);
  await shot('from-movies');
  const ph = await ev(() => document.querySelector('.sfield')?.innerText || '');
  const scope = await ev(() => document.querySelector('[data-right] .s-scope .chip.sel')?.dataset.scope || '(empty query: no chips)');
  console.log('from Movies:', ph, scope);
  check('from Movies: the field says Search movies (or keeps the query, scoped)', /Search movies/i.test(ph) || scope === 'movie', `${ph} · ${scope}`);
  await key('Escape', 1, 600); await key('Escape', 1, 1000);
  check('Back from it returns to Movies', await ev(() => window.__tunerTest?.current?.() || document.querySelector('[data-screen]:not([hidden])')?.dataset.screen) === 'movie', await ev(() => document.querySelector('[data-screen]:not([hidden])')?.dataset.screen));
};
