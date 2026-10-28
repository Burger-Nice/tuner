// Home's Marquee (design/ui-v1/home-final/SPEC.md 3, 4, 12): four big lines on a game day (the live game first, then
// Continue watching, New episodes with its count, A film for tonight), the lit line opened as its card in place (the
// lines under it 158 px lower, the ones above never moving), the picture after a 600 ms rest, the peek of the first row
// with P−, Right / Hold / Up, and the safe area.
// Run: node tests/tv/drive.js <out> home-marquee   (mocks: 01-evening; the fake ESPN's live Grizzlies game is the game)
const HC = require('./home-common.js');
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const { check } = HC;
  const ev = (f, a) => p.evaluate(f, a);
  await HC(ctx, {});
  await ev(() => window.__tunerTest.go('home')); await HC.waitRows(p, 5); await p.waitForTimeout(1500);
  const L = await HC.lineup(p);
  console.log(L.join('\n'));
  check('four lines on a game day', L.length === 4, L.length);
  check('the live game first, its card open', /^\*GAME NIGHT/.test(L[0]) && /Watch live/.test(L[0]));
  check('Continue watching: Severance S2 · E3 · 21 min left', /Severance Continue · S2 · E3 · 21 min left/.test(L[1]));
  check('New episodes with its count (Slow Horses S6 · E4, 3 new)', /Slow Horses New episodes · S6 · E4 ?3 new/.test(L[2]), L[2]);
  check('A film for tonight, its end time', /A film for tonight · ends \d\d:\d\d/.test(L[3]));
  const geo = () => ev(() => [...document.querySelectorAll('[data-screen="home"] .hf-e')].map((e) => { const r = e.getBoundingClientRect(); return { y: Math.round(new DOMMatrix(getComputedStyle(e).transform).m42), h: Math.round(r.height), on: e.classList.contains('on'), w: e.querySelector('.t').scrollWidth }; }));
  let g = await geo();
  check('the lit card: 192 px at y 96', g[0].on && g[0].h === 192 && g[0].y === 96, JSON.stringify(g[0]));
  check('the lines under it sit 158 px lower (292, 334, 376)', g[1].y === 292 && g[2].y === 334 && g[3].y === 376, g.map((x) => x.y).join(' '));
  check('every name and its facts fit the 470 px lineup', g.every((x) => x.w <= 438), g.map((x) => x.w).join(' '));
  const peek = await ev(() => document.querySelector('[data-screen="home"] .hf-peek').innerText.replace(/\s+/g, ' '));
  check('the peek: the first row, its reason and P− Browse', /^Comedy for you Because you watch .* P− Browse · \d+ rows/.test(peek), peek);
  check('the NBA tab has no LIVE pill while the game is lit', await ev(() => !document.querySelector('#topbar [data-tab="nba"] .a-live')));
  await shot('marquee-game');
  // Down: the card closes on the game and opens on Severance; the line above (the game) doesn't move
  const pic = () => ev(() => document.querySelector('[data-screen="home"] .hf-bd.vis img')?.getAttribute('src') || (document.querySelector('[data-screen="home"] .hf-field.vis') ? 'field' : ''));
  const before = await pic();
  await key('ArrowDown', 1, 200);
  const at200 = await pic();
  await p.waitForTimeout(900);
  const at900 = await pic();
  g = await geo();
  check('Down: Severance lit at y 138, the game stays at 92', g[1].on && g[1].y === 138 && g[0].y === 92, g.map((x) => x.y).join(' '));
  check('the picture waits for the 600 ms rest', before === 'field' && at200 === 'field' && /severance-bg/.test(at900), `${before} → ${at200} → ${at900}`);
  const card = await ev(() => document.querySelector('[data-screen="home"] .hf-e.on .cd').innerText.replace(/\s+/g, ' '));
  check('the card: CONTINUE WATCHING, the episode, Ends, Resume, → Episodes, Hold', /CONTINUE WATCHING/i.test(card) && /S2 · E3 · Who Is Alive\? · 21 min left · Ends 21:\d\d/.test(card) && /Resume/.test(card) && /Episodes/.test(card) && /Start over, Details/.test(card), card);
  check('the cap is set from the picture (a number between .10 and .60)', await ev(() => { const v = +getComputedStyle(document.querySelector('[data-screen="home"] .hf')).getPropertyValue('--capa'); return v >= 0.1 && v <= 0.6; }));
  // the safe area: the lit card's ring and text inside x 48–912, y 27–513
  const safe = await ev(() => { const e = document.querySelector('[data-screen="home"] .hf-e.on'); const r = e.getBoundingClientRect(); const t = [...e.querySelectorAll('.cd *')].filter((x) => x.children.length === 0 && x.textContent.trim()).map((x) => x.getBoundingClientRect()); return { ring: [r.left - 5, r.right + 5, r.top - 5, r.bottom + 5], text: t.every((b) => b.left >= 48 && b.right <= 912 && b.top >= 27 && b.bottom <= 513) }; });
  check('the lit card and its ring inside the safe area', safe.ring[0] >= 48 && safe.ring[1] <= 912 && safe.ring[2] >= 27 && safe.ring[3] <= 513 && safe.text, safe.ring.join(' '));
  await shot('marquee-continue');
  // Hold OK: the card menu
  await HC.hold(p);
  const menu = await ev(() => [...document.querySelectorAll('.ctxmenu .lr')].map((r) => r.textContent).join(' | '));
  check('Hold: Start over · Details · Mark watched · Remove from Home', /Start over \| Details \| Mark watched \| Remove from Home/.test(menu), menu);
  await key('Escape', 1, 500);
  // Right: the series' page (its episodes); Back comes back to the lit line
  await key('ArrowRight', 1, 2500);
  check('Right on Continue opens Severance\'s page', await ev(() => window.__tunerTest.state().screen === 'detail' && /Severance/.test(document.querySelector('[data-screen="detail"]').innerText)));
  await key('Escape', 1, 1200);
  check('Back returns to the Severance line', (await HC.focusKey(p)) === 'line:cont', await HC.focusKey(p));
  // Up twice: the game line, then the top bar; Down comes back to the line
  await key('ArrowUp', 1, 400); await key('ArrowUp', 1, 400);
  check('Up from the first line: the top bar', (await HC.focusKey(p)) === 'home', await HC.focusKey(p));
  await key('ArrowDown', 1, 600);
  check('Down from the bar: the lineup', /^line:/.test(await HC.focusKey(p)), await HC.focusKey(p));
  // the third line: New episodes, its card and Play
  await ev(() => document.querySelector('[data-screen="home"] .hf-e[data-key="line:new"]')?.focus());
  await key('ArrowDown', 1, 300); await key('ArrowUp', 1, 1100);
  const nw = await ev(() => document.querySelector('[data-screen="home"] .hf-e.on .cd')?.innerText.replace(/\s+/g, ' '));
  check('New episodes: the card says Play and → Episodes', /NEW EPISODES/i.test(nw) && /Play/.test(nw) && /Episodes/.test(nw), nw);
  await shot('marquee-new');
  // Down past the last line: the rows, on row 1
  await key('ArrowDown', 1, 300); await key('ArrowDown', 1, 1200);
  check('Down from the last line: row 1, Comedy for you', /^t:/.test(await HC.focusKey(p)) && /Comedy for you/.test(await HC.index(p)), await HC.focusKey(p));
  await key('ArrowUp', 1, 900);
  check('Up from row 1: the line he left lit (the film)', (await HC.focusKey(p)) === 'line:film', await HC.focusKey(p));
};
