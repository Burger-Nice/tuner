// Bug hunt: the Copies menu and Options > Quality against design/ui-v1/copies/RANKING.md on real-world cases:
// a PAL copy of the main cut (25 fps, 172.6 min of a 180 min film: the same cut, key 5), a longer cut (200 min), a
// DTS-only copy, a "4K" name that is 1080p. Run: node tests/tv/drive.js <out> hunt2-subs-ranking
const SC = require('./subs-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check } = SC.C;
  const ev = (f, a) => p.evaluate(f, a);
  await SC({ p, key }, { delay: 150 });
  const MIN = 60;
  const over = {
    // the FHD copy: a PAL transfer of the same cut
    7002: { size: 9.8e9, dur: 172.6 * MIN, formats: { video: { w: 1920, h: 800, fps: 25 }, audio: [{ mime: 'audio/ac3', ch: 6, lang: 'eng', tagged: true }], text: [] } },
    // the "4K UHD" copy: really 1080p, and a longer cut
    7003: { size: 4.1e9, dur: 200 * MIN, formats: { video: { w: 1920, h: 800, fps: 23.976 }, audio: [{ mime: 'audio/mp4a-latm', ch: 2, lang: 'eng', tagged: true }], text: [] } },
  };
  await SC.unlearn(p, [7001, 7002, 7003, 7004], over);
  const D = '[data-screen="detail"]';
  await SC.open(p, 'movie', 'Oppenheimer', 2023);
  await p.waitForTimeout(6000);
  await key('ArrowDown', 1, 300); await key('Enter', 1, 800);
  const rows = await SC.text(p, '.menu.ad-copies .lr.ad-two');
  console.log(rows.join('\n'));
  await shot('copies');
  const pal = rows.find((r) => /“EN\| Oppenheimer FHD”/.test(r)) || '';
  const longer = rows.find((r) => /4K UHD”/.test(r)) || '';
  check('the PAL copy is the main cut (no "Shorter cut")', !/Shorter cut|Longer cut/.test(pal), pal);
  check('the 200 min copy: Longer cut · 3 h 20 min', /Longer cut · 3 h 20 min/.test(longer), longer);
  await key('Escape', 1, 400);
};
