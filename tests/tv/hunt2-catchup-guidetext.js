// Hunt: guide text the morning after (catch-up 4.2, 4.3 S4/S6/S12/S3, 7.1). US: ESPN HD's short guide is replaced by
// programmes that tell (a studio show's description with the score, a later studio show with the result in its
// title, a re-air of the hidden game and the programme after it). Read: the guide cells, the Now panel of each, OK on a
// later one (the details card), Home's On now card, Saved › Channels, the last-channel hero (no team, All games).
// Run: node tests/tv/drive.js <out> hunt2-catchup-guidetext
const setup = require('./catchup-lib.js');
const { screenText, spoilers } = setup;
const b64 = (s) => Buffer.from(s).toString('base64');
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  const T = (iso) => Date.parse(`2026-10-27T${iso}:00Z`) / 1000;
  const progs = [
    ['10:30', '11:00', process.env.NOWT || 'SportsCenter', 'Ja Morant and the Grizzlies beat the Jazz 118-112 in overtime.'],
    ['11:00', '12:00', 'College GameDay', 'Previewing the weekend.'],
    ['12:00', '14:47', 'NBA: Memphis Grizzlies @ Utah Jazz', 'Replay of last night\'s game.'],
    ['14:47', '15:30', 'Grizzlies beat Jazz in OT: reaction', 'Postgame reaction.'],
    ['15:30', '17:00', 'Around the Horn', 'Debate.'],
  ];
  await p.route('**/player_api.php*', (r) => {
    const u = new URL(r.request().url());
    if (u.searchParams.get('action') === 'get_short_epg' && u.searchParams.get('stream_id') === '1001') {
      return r.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ epg_listings: progs.map(([s, e, t, d]) => ({ title: b64(t), description: b64(d), start_timestamp: String(T(s)), stop_timestamp: String(T(e)) })) }) });
    }
    return r.fallback();
  });
  const panel = () => ev(() => document.querySelector('.g-now')?.innerText.replace(/\s+/g, ' '));
  const where = () => ev(() => { const a = document.activeElement; return `${a.className} "${(a.innerText || '').replace(/\s+/g, ' ').slice(0, 60)}"`; });
  const rowName = () => ev(() => document.activeElement.closest('.g-row')?.querySelector('.nm')?.textContent || '');
  const report = (label, text) => { const s = spoilers(text || ''); console.log(`${s.length ? 'LEAK' : 'ok  '} ${label}: ${text}${s.length ? `\n      -> ${s.join(' ; ')}` : ''}`); };

  await setup(ctx);
  await ev(() => window.__tunerTest.go('live')); await p.waitForTimeout(3500);
  for (let i = 0; i < 6 && !(await rowName()).includes('ESPN'); i++) await key('ArrowDown', 1, 400);
  await p.waitForTimeout(1500);
  console.log('ESPN row:', await ev(() => [...document.activeElement.closest('.g-row').querySelectorAll('.g-cell')].map((c) => c.innerText.replace(/\s+/g, ' ')).join(' | ')));
  report('now panel, on now', await panel());
  await shot('guide-now');
  for (let k = 0; k < 4; k++) {
    await key('ArrowRight', 1, 700);
    report(`later cell ${k + 1}: ${await where()}`, await panel());
    if (k === 1 || k === 2) await shot(`guide-later-${k + 1}`);
  }
  // OK on the later studio show (the details card) and on the re-air
  await key('ArrowLeft', 1, 600);
  console.log('focused:', await where());
  await key('Enter', 1, 900);
  report('details card (re-air)', await ev(() => document.querySelector('#overlays .menu')?.innerText.replace(/\s+/g, ' ')));
  await shot('details-reair');
  await key('Escape', 1, 500);
  await key('ArrowRight', 1, 600);
  await key('Enter', 1, 900);
  report('details card (studio show after the re-air)', await ev(() => document.querySelector('#overlays .menu')?.innerText.replace(/\s+/g, ' ')));
  await shot('details-studio');
  await key('Escape', 1, 500);
  // favourite ESPN (hold OK), then Saved › Channels and Home's On now
  await key('ArrowLeft', 4, 300);
  await p.keyboard.down('Enter'); await p.waitForTimeout(700); await p.keyboard.up('Enter'); await p.waitForTimeout(800);
  await ev(() => window.__tunerTest.go('saved')); await p.waitForTimeout(2500);
  report('Saved › Channels', await ev(() => [...document.querySelectorAll('[data-screen="saved"] .srow')].map((r) => r.innerText.replace(/\s+/g, ' ')).join(' | ')));
  await shot('saved-channels');
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(3500);
  report('Home On now', await ev(() => [...document.querySelectorAll('[data-screen="home"] .hc')].map((r) => r.innerText.replace(/\s+/g, ' ')).join(' | ')));
  // Search › On TV (a programme on now whose title matches)
  await ev(() => window.__tunerTest.go('search')); await p.waitForTimeout(1200); await p.keyboard.type(process.env.SEARCHQ || 'sportscenter', { delay: 80 }); await p.waitForTimeout(2500);
  report('Search › On TV', await ev(() => document.querySelector('[data-screen="search"] [data-right]')?.innerText.replace(/\s+/g, ' ')));
  await shot('search-ontv');
  // no team, All games: the last-channel hero on ESPN
  await setup(ctx, { shield: 'all', team: 'none' });
  await ev(async () => { const s = await import('./tv/js/state.js'); s.store.set(s.scoped('lastLive'), '1001'); });
  await ev(() => window.__tunerTest.go('live')); await p.waitForTimeout(1500);
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(4000);
  report('Home hero (last channel)', await ev(() => document.querySelector('[data-screen="home"] .hero-plate')?.innerText.replace(/\s+/g, ' ')));
  await shot('home-lastchannel');
};
