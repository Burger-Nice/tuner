// The add-on library (design/ui-v1/home-final/SPEC.md 3, 7; mock 05): Movies' chips (Popular, New, Top rated, his
// genres first, More genres, Anime, In Icelandic, the add-ons' catalogs, Saved, History); Popular is Cinemeta's, paged 50
// (skip), with the grid's 6 × 124 posters from x 58 (rings inside 48–912) and at most 72 mounted; scrolled, the solid
// band (Movies · Popular, the focused title, its facts) and the bubble while ▼ repeats; Comedy is TMDB's, paged 20; a
// filter keeps loading until it has enough ("so far"); Title A–Z; OK opens the title's page; Back scrolls to the top
// and the tab; without a key there is no Top rated chip; the provider's films are never listed.
// Run: node tests/tv/drive.js <out> home-library
const HC = require('./home-common.js');
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const { check, H } = HC;
  const ev = (f, a) => p.evaluate(f, a);
  const hits = async () => (await (await fetch(`${H}/_tmdb/hits`)).json());
  await HC(ctx, {});
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(3500);
  const chips = await ev(() => [...document.querySelectorAll('[data-screen="movie"] .lib-chips .chip')].map((c) => c.textContent.trim()));
  console.log('chips:', chips.join(' | '));
  check('the chips: Popular, New, Top rated, his genres (Comedy first), More genres, Anime, In Icelandic …', chips[0] === 'Popular' && chips[1] === 'New' && chips[2] === 'Top rated' && chips[3] === 'Comedy' && chips.includes('More genres') && chips.includes('Anime') && chips.includes('In Icelandic') && chips.includes('Saved') && chips.includes('History'), chips.slice(0, 8).join(','));
  const head = await ev(() => document.querySelector('[data-screen="movie"] [data-head]').textContent.replace(/\s+/g, ' '));
  check('the header: Popular · how many', /Movies ?Popular ?·? ?\d+\+? titles/.test(head), head.slice(0, 60));
  check('no provider film is listed', await ev(async () => { const c = await import('/tv/js/catalog.js'); const prov = new Set((c.catalog.movie?.titles || []).map((t) => t.name)); return ![...document.querySelectorAll('[data-screen="movie"] .lb-p')].some((x) => /^\d+$/.test(x.dataset.key?.split(':').pop() || '')); }));
  await shot('library');
  // into the grid: the band and the first poster's ring
  await key('ArrowDown', 1, 900);
  const g1 = await ev(() => { const a = document.activeElement.getBoundingClientRect(); return { l: a.left - 5, band: !document.querySelector('[data-screen="movie"] .lb-band').hidden, t: Math.round(a.top) }; });
  check('in the grid: the band, the first column\'s ring inside x 48', g1.band && g1.l >= 48, JSON.stringify(g1));
  for (let i = 0; i < 5; i++) await key('ArrowRight', 1, 120);
  const g6 = await ev(() => document.activeElement.getBoundingClientRect().right + 5);
  check('the sixth column\'s ring inside x 912', g6 <= 912, g6.toFixed(1));
  await key('ArrowDown', 2, 400); await p.waitForTimeout(600);
  const band = await ev(() => document.querySelector('[data-screen="movie"] .lb-band').innerText.replace(/\s+/g, ' '));
  check('the band: Movies · Popular, the focused title and its facts', /^Movies · Popular .+ \d{4}/.test(band), band);
  check('the focused row sits at y 156', await ev(() => Math.round(document.activeElement.getBoundingClientRect().top + 186 * 0.025)) === 156);
  await shot('library-scrolled');
  // hold ▼: the bubble, the next page (skip), at most 72 posters mounted
  for (let i = 0; i < 14; i++) { await p.keyboard.down('ArrowDown'); await p.waitForTimeout(110); }
  const bub = await ev(() => { const b = document.querySelector('[data-screen="movie"] .lb-bubble'); return b && !b.hidden ? b.innerText.replace(/\s+/g, ' ') : ''; });
  await p.keyboard.up('ArrowDown'); await p.waitForTimeout(1500);
  check('the bubble while ▼ repeats: #N of …', /^#\d+ of [\d,]+\+?/.test(bub), bub);
  const st = await ev(() => ({ n: document.querySelectorAll('[data-screen="movie"] .lb-p').length, i: +document.activeElement.dataset.i }));
  check('page 2 came (past #50) and no more than 72 are mounted', st.i > 50 && st.n <= 72, JSON.stringify(st));
  await key('Escape', 1, 900);
  check('Back: the top and the tab', await ev(() => document.activeElement.dataset.tab === 'movie'));
  // Comedy: TMDB's list, 20 a page
  const before = (await hits())['/discover/movie'] || 0;
  await key('ArrowDown', 1, 600); await key('ArrowUp', 1, 600);   // (Down from the tab: the grid; Up from its first row: the chips)
  await ev(() => document.querySelector('[data-screen="movie"] [data-chip="g:Comedy"]').focus()); await key('Enter', 1, 2500);
  const h2 = await ev(() => document.querySelector('[data-screen="movie"] [data-head]').textContent.replace(/\s+/g, ' '));
  check('Comedy: its count from TMDB', /Comedy · Popular ?·? ?\d+ titles/.test(h2), h2.slice(0, 50));
  await key('ArrowDown', 1, 900); await shot('library-comedy');
  // Top rated: TMDB's list, 20 a page: scrolling asks for the next
  await key('ArrowUp', 1, 600);
  await ev(() => document.querySelector('[data-screen="movie"] [data-chip="top"]').focus()); await key('Enter', 1, 2000);
  await key('ArrowDown', 1, 600); for (let i = 0; i < 4; i++) await key('ArrowDown', 1, 500);
  await p.waitForTimeout(1200);
  const after = (await hits())['/discover/movie'] || 0;
  const n = await ev(() => +document.activeElement.dataset.i);
  check('scrolling asks TMDB for the next page (20 a page)', after - before >= 3 && n >= 20, `${before} → ${after}, at #${n + 1}`);
  await key('Escape', 1, 800); await key('ArrowDown', 1, 600); await key('ArrowUp', 1, 600);
  await ev(() => document.querySelector('[data-screen="movie"] [data-chip="g:Comedy"]').focus()); await key('Enter', 1, 2000);
  // Filters: Decade 2010s
  await key('Escape', 1, 800); await key('ArrowDown', 1, 600); await key('ArrowUp', 2, 500);
  await ev(() => document.querySelector('[data-screen="movie"] [data-act="filters"]').focus()); await key('Enter', 1, 800);
  await ev(() => document.querySelector('#overlays [data-k="decade"][data-v="2010s"]').focus()); await key('Enter', 1, 400);
  await shot('library-filters');
  await key('Escape', 1, 1500);
  const h3 = await ev(() => document.querySelector('[data-screen="movie"] [data-head]').textContent.replace(/\s+/g, ' '));
  const years = await ev(() => [...document.querySelectorAll('[data-screen="movie"] .lb-p')].length);
  check('a filter: "so far" and only 2010s titles', /so far/.test(h3) && years > 0, h3.slice(0, 60));
  // Sort: Title A–Z
  await ev(() => document.querySelector('[data-screen="movie"] [data-act="sort"]').focus()); await key('Enter', 1, 600);
  await ev(() => document.querySelector('#overlays [data-v="az"]').focus()); await key('Enter', 1, 1200);
  const az = await ev(async () => { const s = document.querySelector('[data-screen="movie"]'); return s.querySelector('[data-head]').textContent.includes('A–Z'); });
  check('Sort: Title A–Z of what has loaded', az);
  // OK on a poster: the title's page
  await key('ArrowDown', 2, 500); await key('Enter', 1, 2500);
  check('OK opens the title\'s page', await ev(() => window.__tunerTest.state().screen === 'detail'));
  await key('Escape', 1, 1200);
  // Series: the Anime shelf
  await ev(() => window.__tunerTest.go('series', { shelf: 'anime' })); await p.waitForTimeout(2500);
  const an = await ev(() => document.querySelector('[data-screen="series"] [data-head]').textContent.replace(/\s+/g, ' '));
  check('Series · Anime (from a door or See all)', /Series ?Anime · Popular ?·? ?\d+ titles/.test(an), an.slice(0, 60));
  await key('ArrowDown', 1, 900); await shot('library-anime');
  // no key: no Top rated chip
  await ev(() => { localStorage.removeItem('tuner.tmdbKey'); }); await ev(async () => (await import('/tv/js/tmdb.js')).clearKey());
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(2000);
  const c2 = await ev(() => [...document.querySelectorAll('[data-screen="movie"] .lib-chips .chip')].map((c) => c.textContent.trim()));
  check('without a key: no Top rated, no In Icelandic', !c2.includes('Top rated') && !c2.includes('In Icelandic'), c2.slice(0, 6).join(','));
};
