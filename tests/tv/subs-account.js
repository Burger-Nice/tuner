// node tests/tv/drive.js <outdir> subs-account -> Account > Languages (design/ui-v1/subtitles/account-languages) and
// the settings move: today's subLang 'auto' on a TV with an account becomes Always, with Icelandic, English.
module.exports = async ({ p, shot, key, log }) => {
  const ev = (f, a) => p.evaluate(f, a);
  await require('./signin.js')({ p, key });
  await p.waitForTimeout(2500);
  // the owner's TV before this version: subLang auto, no subMode yet
  await ev(() => { const s = JSON.parse(localStorage.getItem('tuner.settings') || '{}'); delete s.subMode; delete s.subLangs; s.subLang = 'auto'; s.langs = ['English', 'Icelandic']; localStorage.setItem('tuner.settings', JSON.stringify(s)); });
  await p.reload(); await p.waitForTimeout(3500);
  const s = await ev(() => JSON.parse(localStorage.getItem('tuner.settings')));
  console.log('after the move:', JSON.stringify({ subMode: s.subMode, subLangs: s.subLangs, subLang: s.subLang }));
  console.log(s.subMode === 'always' && s.subLangs?.join() === 'Icelandic,English' && s.subLang === 'Icelandic' ? 'MOVE OK' : 'MOVE WRONG');
  await ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(1200);
  await ev(() => document.querySelector('[data-screen="account"] .gl[data-g="languages"]')?.click()); await p.waitForTimeout(600);
  await key('ArrowDown', 1, 300);
  await log('languages'); await shot('languages');
  console.log('rows:', await ev(() => [...document.querySelectorAll('[data-screen="account"] .arow')].map((r) => `${r.querySelector('.grow').firstChild.textContent} = ${r.querySelector('.av').textContent.trim()}`).join(' | ')));
  await key('Enter', 1, 600); await shot('subtitles-menu');
  await key('ArrowDown', 2, 250); await key('Enter', 1, 600);
  console.log('Off picked:', await ev(() => JSON.parse(localStorage.getItem('tuner.settings')).subMode), await ev(() => JSON.parse(localStorage.getItem('tuner.settings')).subLang));
  await key('Enter', 1, 600); await key('ArrowUp', 2, 250); await key('Enter', 1, 600);   // back to Always (the first row)
  await key('ArrowDown', 1, 300); await key('Enter', 1, 700); await shot('subtitle-languages');
  await key('Escape', 1, 600);
  await key('ArrowDown', 2, 300); await key('Enter', 1, 600); await shot('opensubtitles-menu');
  await key('ArrowDown', 1, 250); await key('Enter', 1, 600);
  console.log('OpenSubtitles off:', await ev(() => JSON.parse(localStorage.getItem('tuner.settings')).subOnline));
  await key('Enter', 1, 600); await key('ArrowUp', 1, 250); await key('Enter', 1, 600);   // back to On
  const after = await ev(() => JSON.parse(localStorage.getItem('tuner.settings')));
  console.log('end:', JSON.stringify({ subMode: after.subMode, subLangs: after.subLangs, subLang: after.subLang, subOnline: after.subOnline }));
};
