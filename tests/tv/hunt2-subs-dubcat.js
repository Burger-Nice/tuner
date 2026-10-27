// Bug hunt: RANKING.md 5 calls a copy a dub only on positive evidence ("its name's prefix is a non-English language").
// A copy whose NAME has no prefix but sits in an Icelandic category ("IS | Kvikmyndir með íslenskum texta": films
// with Icelandic subtitles) gets _lang Icelandic from the category, and titlesubs.js passes that as the prefix.
// Run: node tests/tv/drive.js <out> hunt2-subs-dubcat
const SC = require('./subs-common.js');
module.exports = async ({ p, key }) => {
  const { check } = SC.C;
  await SC({ p, key }, { delay: 150 });
  const r = await p.evaluate(async () => {
    const c = await import('/tv/js/catalog.js'); const C = await import('/tv/js/copies.js');
    const cat = 'IS | Kvikmyndir með íslenskum texta';
    const lang = c.langOf('Oppenheimer (2023)', true) || c.langOf(cat);
    // what titlesubs.js reqFor() passes (prefixLang: v._lang unless English), with Cinemeta's countries for Oppenheimer
    const dub = C.isDub({ nameSaysDub: C.readName({ name: 'Oppenheimer (2023)' }).dub, prefixLang: lang && lang !== 'English' ? lang : '', taggedSound: '', country: 'United States, United Kingdom' });
    return { lang, dub };
  });
  console.log(JSON.stringify(r));
  check('a film in an Icelandic-subtitles category is not called a dub', !r.dub, JSON.stringify(r));
};
