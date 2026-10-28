// The title page with add-on copies (design/ui-v1/addons/SPEC.md 5, design/ui-v1/copies/RANKING.md): a Sure match (The
// Long Night: TMDB ids agree) with the pill, "Still asking Kestrel", the Copies menu in RANKING.md's order with no torrent,
// magnet or Stremio-server copy and the country-whitelisted one dropped, Play handing the player an add-on entry; a
// Likely match (Northern Lights: the "might be another film" group, the one 4 s wait, Back stops it, then the provider's
// copy plays); an Unsure one (Glacier: which film is it?); a title only add-ons have (Tenzing); no copy to play (Night of
// the Living Dead: a torrent only); a series from both sources (The Bear).
// Run: node tests/tv/drive.js <out> addons-detail
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { ok, check } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true, region: 'isl' });
  await ev(() => localStorage.setItem('tuner.tvRegion', JSON.stringify('isl')));
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(3000);
  await ev(() => window.__tunerTest.go('series')); await p.waitForTimeout(2500);
  const open = (kind, name, year, addon) => ev(async ({ kind, name, year, addon }) => {
    const a = await import('/tv/js/actions.js'), c = await import('/tv/js/catalog.js');
    const t = addon ? { kind, key: addon, id: addon, name, year: String(year || ''), versions: [], _qs: new Set(), _langs: new Set(), _genres: [], addon: { type: kind } } : c.catalog[kind].titles.find((x) => x.name === name && (!year || +x.year === year));
    a.openDetail(t);
  }, { kind, name, year, addon });
  const slot = () => ev(() => document.querySelector('[data-screen="detail"] .st-side')?.innerText || '');
  const pill = () => ev(() => document.querySelector('[data-screen="detail"] [data-act="version"]')?.innerText.replace(/\s+/g, ' ') || '');
  const menuRows = () => ev(() => [...document.querySelectorAll('.menu.ad-copies .lr.ad-two, .menu.ad-copies .ad-grp2')].map((r) => r.innerText.replace(/\s+/g, ' ')));
  const lastVod = () => ev(() => (window.__lastVod || [])[0] || null);

  // ---- A. The Long Night: Sure ----
  await open('movie', 'The Long Night', 2000); await p.waitForTimeout(1800);
  await ok(p, 'Play focused', 'play'); await shot('detail-sources');
  check('pill: 4K Blu-ray · Northlight · best of', /4K Blu-ray · Northlight · best of \d/.test(await pill()), await pill());
  check('slot: Still asking Kestrel', /Still asking Kestrel/.test(await slot()), await slot());
  check('tags dashed (the name says)', await ev(() => document.querySelectorAll('[data-screen="detail"] .metaline .tag.ad-name').length >= 2));
  await key('ArrowDown', 1, 300); await ok(p, 'the pill', 'version'); await key('Enter', 1, 700); await ok(p, 'Copies: Always the best copy', 'Always the best copy'); await shot('detail-sources-sheet');
  const rows = await menuRows(); console.log(rows.join('\n'));
  check('order: remux 4K Blu-ray, 4K web, 1080p Blu-ray, then the provider', /^4K · HDR10 · Blu-ray/.test(rows[1]) && /^4K · Dolby Vision · web copy/.test(rows[2]) && /^1080p · Blu-ray/.test(rows[3]) && /Your provider/.test(rows[4]), '');
  check('no torrent, magnet or Stremio-server copy', !rows.some((r) => /P2P|magnet|local|torrent/i.test(r)));
  check('the French copy (countryWhitelist fra) dropped in Iceland', !rows.some((r) => /3\.3 GB/.test(r)));
  check('line 2: its name says Dolby Vision', /Northlight · its name says Dolby Vision · English · 51.6 GB/.test(rows[1]), rows[1]);
  check('Kestrel is still looking', rows.some((r) => /Kestrel is still looking/.test(r)));
  check('trailer and other apps rows', rows.some((r) => /Trailer/.test(r)) && rows.some((r) => /Watch in another app/.test(r)));
  check('no secret on screen', !(await ev(() => document.body.innerText)).includes('eyJ'));
  await p.waitForTimeout(5000); await shot('detail-sources-sheet-kestrel');
  const rows2 = await menuRows();
  check('Kestrel\'s 720p joined in place', rows2.some((r) => /^720p/.test(r) && /Kestrel/.test(r)) && !rows2.some((r) => /still looking/.test(r)), rows2.length + ' rows');
  await key('Escape', 1, 400); await key('ArrowUp', 1, 300); await key('ArrowLeft', 2, 150); await ok(p, 'back on Play', 'play');
  await key('Enter', 1, 800);
  const v = await lastVod();
  check('Play: an add-on entry for the player', v && /addon-media/.test(v.url) && v.source === 'Northlight' && v.headers?.['User-Agent'] === 'Northlight/1.0' && v.copies?.length >= 3 && v.mime === 'video/x-matroska' && v.runtime === 120 && v.id === 'movie:tt9000001', JSON.stringify(v && { ...v, url: '(link)' }).slice(0, 300));
  check('the next copies are identities, not links', v && v.copies.every((c) => !c.url && c.key.startsWith('cp:')));
  // ---- B. Northern Lights: Likely, the one wait ----
  await ev(() => { window.__lastVod = null; });
  await key('Escape', 1, 600); await open('movie', 'Northern Lights', 2001); await p.waitForTimeout(1500);
  await key('ArrowDown', 1, 200); await key('Enter', 1, 700); await shot('detail-copies-likely');
  const lr = await menuRows(); console.log(lr.join('\n'));
  check('the Likely group: might be another film', lr.some((r) => /might be another film/i.test(r)) && lr.some((r) => /for Northern Lights \(2001\) · the name says/.test(r)));
  check('provider first (band c)', /Your provider/.test(lr[1]), lr[1]);
  await key('Escape', 1, 400); await key('ArrowUp', 1, 300); await key('Enter', 1, 900); await shot('detail-play-wait');
  const btn = await ev(() => document.querySelector('[data-screen="detail"] [data-act="play"]').innerText);
  check('the wait: Playing in 3 s', /Playing in [34] s/.test(btn), btn);
  check('the caption on the Play row', await ev(() => /Looking for a better copy · OK plays this one now · Back stops/.test(document.querySelector('[data-screen="detail"] .ad-wcap')?.innerText || '')));
  check('slot: Still asking Kestrel', /Still asking Kestrel/.test(await slot()), await slot());
  await key('Escape', 1, 500);
  check('Back stops the wait, the page stays', !(await lastVod()) && /Play/.test(await ev(() => document.querySelector('[data-screen="detail"] [data-act="play"]').innerText)));
  await key('Enter', 1, 4800);
  const v2 = await lastVod();
  check('after 4 s: the provider\'s copy plays', v2 && /\/movie\/demo\/demo\/5001\.mp4$/.test(v2.url) && v2.source === 'provider', v2?.url);
  // ---- C. Glacier: Unsure ----
  await key('Escape', 1, 600); await open('movie', 'Glacier', 2003); await p.waitForTimeout(2000); await shot('detail-unsure');
  check('pill: which film is it?', /which film is it/.test(await pill()), await pill());
  await key('ArrowDown', 1, 200); await key('Enter', 1, 600); await key('ArrowDown', 6, 120); await ok(p, 'Which film is this?', 'which'); await key('Enter', 1, 1500); await shot('detail-match');
  const mrows = await ev(() => [...document.querySelectorAll('.menu.ad-match .lr')].map((r) => r.innerText.replace(/\s+/g, ' ')));
  check('the picker lists both Glaciers and None of these', mrows.filter((r) => /Glacier/.test(r)).length === 2 && mrows.some((r) => /None of these/.test(r)), mrows.join(' | '));
  await key('Enter', 1, 1500);
  check('picked: Sure now', await ev(() => { const a = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.endsWith(':imdb')))); return Object.values(a).some((x) => x.picked); }));
  // ---- D. Tenzing: add-ons only ----
  await key('Escape', 1, 600); await open('movie', 'Tenzing', 2026, 'tt9000010'); await p.waitForTimeout(2000); await shot('detail-addon-only');
  check('no "from an add-on" label (films and series all come from add-ons)', await ev(() => !/Not on your provider|Add-on/.test(document.querySelector('[data-screen="detail"]').innerText)));
  check('pill: 4K web · Northlight', /4K web · Northlight/.test(await pill()), await pill());
  // ---- E. Night of the Living Dead: a torrent only ----
  await key('Escape', 1, 600); await open('movie', 'Night of the Living Dead', 1968, 'tt0063350'); await p.waitForTimeout(7500); await shot('detail-nosources');
  const nl = await ev(() => document.querySelector('[data-screen="detail"]').innerText);
  check('No copy to play, each add-on named', /No copy to play\. Public Domain Movies has it only as a torrent, which airglow doesn't play\. Northlight found nothing\./.test(nl), (nl.match(/No copy to play[^\n]*/) || [''])[0]);
  await ok(p, 'Look again focused', 'again');
  // ---- F. The Bear: both sources ----
  await key('Escape', 1, 600); await open('series', 'The Bear'); await p.waitForTimeout(3000); await shot('detail-series');
  const chips = await ev(() => [...document.querySelectorAll('[data-screen="detail"] [data-season]')].map((c) => c.textContent));
  check('seasons: 1 to 5 and Specials last', chips.join(',') === 'Season 1,Season 2,Season 3,Season 4,Season 5,Specials', chips.join(','));
  check('series pill: S1 · E1', /S1 · E1/.test(await pill()), await pill());
  for (let i = 0; i < 4; i++) { if (/data-season|chip/.test(await C.where(p))) break; await key('ArrowDown', 1, 300); }
  await ok(p, 'a season chip', 'chip');
  // the episode row holds still when the page redraws (copies, progress): no slide back to the start and over again
  await key('ArrowDown', 1, 400); await key('ArrowRight', 4, 250); await p.waitForTimeout(600);
  const tx = await ev(async () => {
    const { emit } = await import('/tv/js/state.js');
    const tr = () => getComputedStyle(document.querySelector('[data-screen="detail"] .track[data-eps]')).transform;
    const out = [tr()];
    emit('progress'); emit('copies');
    for (let i = 0; i < 6; i++) { await new Promise((r) => setTimeout(r, 40)); out.push(tr()); }
    return out;
  });
  check('a redraw keeps the episode row where it is', tx[0] !== 'none' && tx.every((x) => x === tx[0]), [...new Set(tx)].join(' / '));
  await key('ArrowUp', 1, 400); await key('ArrowLeft', 6, 150);
  for (let i = 0; i < 6; i++) { if (/Season 4/.test(await C.where(p))) break; await key('ArrowRight', 1, 200); }
  await key('Enter', 1, 600); await key('ArrowDown', 1, 500); await p.waitForTimeout(1500); await shot('detail-series-s4');
  const s4 = await ev(() => [...document.querySelectorAll('[data-screen="detail"] .ep')].map((e) => e.innerText.replace(/\s+/g, ' ')));
  check('season 4: the add-on episodes, with no Add-on badge', s4.length === 2 && !s4.some((x) => /Add-on/.test(x)), s4.join(' | '));
  check('their best copy on the summary line', await ev(() => /Northlight/.test(document.querySelector('[data-screen="detail"] .epsyn')?.innerText || '')));
  await key('Enter', 1, 800);
  const v3 = await lastVod();
  check('an add-on episode plays with its IMDb key', v3 && v3.id === 'episode:tt9000020:4:1' && v3.binge === 'northlight|1080p|web', v3 && v3.id);
};
