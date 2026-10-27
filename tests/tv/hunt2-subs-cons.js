// Bug hunt: another device uses the account (active_cons 1). No check may start (SPEC 5.3), and the title page should
// say the checks are waiting ("4K · not checked", SPEC 8), not "Checking copies".
// Run: node tests/tv/drive.js <out> hunt2-subs-cons
const SC = require('./subs-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check } = SC.C;
  const ev = (f, a) => p.evaluate(f, a);
  await SC({ p, key }, { delay: 200 });
  let logins = 0;
  await p.route(/127\.0\.0\.1:8899\/player_api\.php\?username=demo&password=demo$/, async (r) => {
    logins++;
    const j = await (await r.fetch()).json();
    j.user_info.active_cons = '1';
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(j) });
  });
  await SC.forget(p);
  await p.reload(); await p.waitForTimeout(4000);
  await ev(() => { window.__probeLog = []; });
  const D = '[data-screen="detail"]';
  await SC.open(p, 'movie', 'Oppenheimer', 2023);
  await p.waitForTimeout(6000);
  const pl = await SC.text(p, `${D} .row-flex .pillbtn`);
  const slot = (await SC.text(p, `${D} .st-side`))[0] || '';
  const log = await ev(() => window.__probeLog);
  const st = await ev(async () => (await import('/tv/js/subs.js')).probeStatus());
  console.log('logins', logins, 'status', JSON.stringify(st));
  check('no check ran while another device uses the account', log.length === 0, JSON.stringify(log));
  check('the Version pill says the checks wait (4K · not checked)', /not checked/.test(pl[0]), pl[0]);
  check('the slot does not claim checking is under way', !/Checking what each copy really is/.test(slot), slot);
  await shot('account-in-use');
  // Play now, while nothing is checked: RANKING.md key 4 puts a MULTI| copy after his languages ("Before a check, the
  // claim's language"), so the EN| 4K copy should play, not the MULTI| 2160p DV one (in SPEC 0 it has only DTS-HD)
  await ev(() => { window.__lastVod = null; });
  await key('Enter', 1, 800);
  const v = await ev(() => (window.__lastVod || [])[0]);
  check('Play before any check: the EN| 4K copy (7001)', v && /\/7001\.mkv$/.test(v.url), v?.url);
  const tags = await SC.text(p, `${D} .metaline .tag`);
  check('the meta line\'s dashed tags describe EN| Oppenheimer 4K (no Dolby Vision)', !tags.includes('Dolby Vision'), tags.join(' '));
};
