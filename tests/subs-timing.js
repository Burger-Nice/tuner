// node tests/subs-timing.js -> the timing check (design/ui-v1/subtitles/SPEC.md 3.4) on the real Oppenheimer files'
// cue starts (tests/fixtures/subs/timing.json.gz, from make.js), with the numbers SPEC 10.3 measured.
const { app, timing, runner } = require('./fixtures/subs/lib.js');
const { t, done } = runner('subs-timing');

(async () => {
  const T = await app('subs/timing.js');
  const F = timing();
  const file = (n) => ({ id: n, cues: F[n].cues, release: T.releaseOf(F[n]), fps: F[n].fpsMilli / 1000, m: '' });
  const near = (a, b, d = 1e-6) => Math.abs(a - b) <= d;
  const PAL = 25 / 23.976;
  const cmp = (a, b) => T.compare(T.startsOf(F[a].cues), T.startsOf(F[b].cues));
  const fmt = (r) => `speed ${r.speed.toFixed(4)} offset ${r.offset} score ${r.score.toFixed(2)} ${r.ratio.toFixed(1)}x thirds ${r.thirds.map((x) => x.toFixed(2)).join('/')}`;

  t('the fixture has every cue: Will1869 2,885, Icelandic 2,946 (+ its credit), WEB-DL MA 3,395', F.Will1869.count === 2885 && F.Icelandic.count === 2946 && F['WEB-DL MA'].count === 3395);

  // ---- SPEC 10.3's table, against Will1869 ----
  let r = cmp('Will1869', 'Will1869-HI');
  t('Will1869-HI: 1.00 at (1, 0): the same release', near(r.speed, 1) && r.offset === 0 && r.score >= 0.99 && r.ratio >= 4.5 && T.releaseOf(F.Will1869) === T.releaseOf(F['Will1869-HI']), fmt(r));
  r = cmp('Will1869', 'WEB-DL MA');
  t('WEB-DL MA: 0.70 at 1x, -0.5 s, 2.7x, accepted', near(r.speed, 1) && r.offset === -0.5 && near(r.score, 0.70, 0.01) && r.ratio >= 2.6 && r.ratio < 2.8 && T.accepted(r), fmt(r));
  r = cmp('Will1869', 'WEB-DL SDH');
  t('WEB-DL SDH: 0.70 at 1x, -0.5 s, 2.6x', near(r.speed, 1) && r.offset === -0.5 && near(r.score, 0.70, 0.01) && r.ratio >= 2.5 && T.accepted(r), fmt(r));
  r = cmp('Will1869', 'GalaxyRG');
  t('GalaxyRG: 0.70 at 1x, +0.2 s, 2.7x', near(r.speed, 1) && r.offset === 0.2 && near(r.score, 0.70, 0.01) && r.ratio >= 2.6 && T.accepted(r), fmt(r));
  r = cmp('Will1869', 'GalaxyRG.Sdh');
  t('GalaxyRG.Sdh: 0.70 at 1x, +0.2 s, 2.6x', near(r.speed, 1) && r.offset === 0.2 && near(r.score, 0.70, 0.01) && r.ratio >= 2.5 && T.accepted(r), fmt(r));
  r = cmp('Will1869', 'Icelandic');
  t('Icelandic: 0.81 at 25/23.976, +0.4 s, 3.6x, each third 0.8', near(r.speed, PAL) && r.offset === 0.4 && near(r.score, 0.81, 0.01) && r.ratio >= 3.5 && r.thirds.every((x) => x >= 0.75) && T.accepted(r), fmt(r));
  r = cmp('GalaxyRG', 'WEB-DL MA');
  t('GalaxyRG vs WEB-DL MA: 1.00 at -0.7 s (the same cues, another offset)', near(r.speed, 1) && r.offset === -0.7 && r.score >= 0.99, fmt(r));
  r = cmp('Will1869', 'TDK');
  t('The Dark Knight vs Oppenheimer: under 0.25, no speed ahead (1.0x): rejected', r.score < T.SKIP && r.ratio < 1.2 && !T.accepted(r), fmt(r));

  // ---- the thresholds have room on these files (review 1, M2: not on a knife edge) ----
  const ok = ['WEB-DL MA', 'GalaxyRG', 'Icelandic'].map((n) => cmp('Will1869', n));
  t('correct pairs clear 0.4 by 0.3 and 2x by 0.6', ok.every((x) => x.score - T.ACCEPT >= 0.29 && x.ratio - T.RATIO >= 0.6));
  t('a wrong film stays under the skip line', cmp('WEB-DL MA', 'TDK').score < T.SKIP && cmp('Icelandic', 'TDK').score < T.SKIP);

  // ---- the thirds catch a different cut: drop the middle third of the candidate and shift the rest by 10 min ----
  const cut = F['WEB-DL MA'].cues.filter((c) => c.s < 3600 || c.s > 7200).map((c) => ({ ...c, s: c.s > 7200 ? c.s - 600 : c.s }));
  r = T.compare(T.startsOf(F.Will1869.cues), T.startsOf(cut));
  t('a different cut fails the thirds', !T.accepted(r) && r.thirds.some((x) => x < T.THIRD), fmt(r));

  // ---- the anchor table (checkFile) ----
  const others = ['Will1869', 'WEB-DL MA', 'GalaxyRG', 'Will1869-HI'].map(file);
  let v = T.checkFile(file('Icelandic'), { copyFps: 23.976, copyLen: 10800, others });
  t('Icelandic on a 23.976 copy: "Timing fixed to fit this film", 25/23.976 with its +0.4 s, no tick', v.verdict === 'fixed' && near(v.speed, PAL) && v.offset === 0.4 && !v.anchored && v.words === 'Timing fixed to fit this film', `${v.verdict} ${v.speed} ${v.offset}`);
  v = T.checkFile(file('Icelandic'), { copyFps: 25, copyLen: 10800 * 23.976 / 25, others });
  t('Icelandic on a 25 fps copy: at its own speed, "Lined up with other subtitles", offset under 2 s not applied', v.verdict === 'pair' && near(v.speed, 1) && v.offset === 0, `${v.verdict} ${v.speed} ${v.offset}`);
  v = T.checkFile(file('Will1869'), { copyFps: 23.976, copyLen: 10800, others: others.filter((f) => f.id !== 'Will1869') });
  t('Will1869 on a 23.976 copy: "Lined up with other subtitles" (WEB-DL MA + GalaxyRG agree), -0.5 s not applied', v.verdict === 'pair' && near(v.speed, 1) && v.offset === 0 && !v.anchored, `${v.verdict} ${v.why.offset}`);
  v = T.checkFile(file('Will1869'), { copyFps: 25, copyLen: 10360, others });
  t('Will1869 on a 25 fps copy: sped up to 23.976/25 with its offset', v.verdict === 'fixed' && near(v.speed, 23.976 / 25), `${v.verdict} ${v.speed} ${v.offset}`);
  v = T.checkFile(file('TDK'), { copyFps: 23.976, copyLen: 10800, others });
  t('The Dark Knight against the pair: skipped (another film)', v.verdict === 'skip' && v.skip);
  v = T.checkFile(file('Icelandic'), { copyFps: 0, copyLen: 0, others });
  t('copy rate not known yet: the pair\'s 23.976 assumed (and said so), the fix as on a 23.976 copy', v.verdict === 'fixed' && near(v.speed, PAL) && v.why.assumedFps === true);
  v = T.checkFile(file('Icelandic'), { copyFps: 23.976, copyLen: 10800, others: [file('Will1869'), file('Will1869-HI')] });
  t('two files of one release are not a pair: "Timing not checked"', v.verdict === 'unchecked' && v.words === 'Timing not checked' && near(v.speed, 1) && v.offset === 0);
  v = T.checkFile(file('Icelandic'), { copyFps: 23.976, copyLen: 10800, others: [] });
  t('no anchor: "Timing not checked", shown as downloaded', v.verdict === 'unchecked' && !v.anchored);
  // the fingerprint file as the anchor: any speed and offset, with a tick
  const hashFile = { ...file('GalaxyRG'), m: 'h' };
  v = T.checkFile(file('Icelandic'), { copyFps: 23.976, copyLen: 10800, hashFile, others });
  t('against a fingerprint file: "Lined up with this copy", with a tick', v.verdict === 'lined' && v.anchored && near(v.speed, PAL) && v.words === 'Lined up with this copy', `${v.speed} ${v.offset}`);
  v = T.checkFile(file('Will1869'), { hashFile, others });
  t('against a fingerprint file at the right speed, the small offset IS applied (+0.2 s the other way)', v.verdict === 'lined' && near(v.speed, 1) && v.offset === -0.2, `${v.offset}`);
  t('the fingerprint file itself: "Made for this copy"', T.checkFile(hashFile, {}).verdict === 'made' && T.checkFile(hashFile, {}).anchored);
  v = T.checkFile(file('TDK'), { hashFile, others });
  t('a wrong film against the fingerprint file: skipped', v.verdict === 'skip');

  // ---- the length bound and the translator's credit (SPEC 3.4.3) ----
  const ice = F.Icelandic.cues;
  const fix = { speed: PAL, offset: 0.4 };
  const credit = ice[ice.length - 1].s * PAL + 0.4, lastLine = ice[ice.length - 2].s * PAL + 0.4;
  t('the credit would be at 3:00:14 after the fix, the last line at 2:53:23 (10,403 s)', Math.round(credit) === 10814 && Math.round(lastLine) === 10403, `${credit.toFixed(0)} ${lastLine.toFixed(1)}`);
  t('the credit is 395 s after the line before, so the bound skips it', Math.round(ice[ice.length - 1].s - ice[ice.length - 2].s) === 395);
  t('fits a 3 h 0 min copy', T.fitsLength(ice, fix, 10800));
  t('does not fit a 2 h 45 min copy', !T.fitsLength(ice, fix, 9900));
  t('a copy whose length is unknown: no bound', T.fitsLength(ice, fix, 0));
  v = T.checkFile(file('Icelandic'), { copyFps: 23.976, copyLen: 9900, others });
  t('too long for the copy: not applied, "Timing not checked"', v.verdict === 'unchecked');

  // ---- the release field ----
  t('release: movieReleaseName lowercased, HI / SDH / CC and the extension gone', T.releaseOf({ movieReleaseName: 'Oppenheimer.2023.1080p.BluRay.x264-Will1869-HI.srt' }) === 'oppenheimer.2023.1080p.bluray.x264.will1869' && T.releaseOf({ movieReleaseName: 'Show (SDH)' }) === 'show');
  t('Early or late on top of the fix', near(T.shown(100, fix, 1.5), 100 * PAL + 0.4 + 1.5));

  // ---- speed: about 15 ms a pair here; the TV is slower, but it runs once per file ----
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 5; i++) cmp('Will1869', 'Icelandic');
  const ms = Number(process.hrtime.bigint() - t0) / 5e6;
  t('one pair under 100 ms on this machine', ms < 100, `${ms.toFixed(1)} ms`);
  done();
})();
