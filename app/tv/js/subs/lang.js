// Subtitle languages: the add-on's codes, the app's names, and a stopword sniff that catches a mislabelled file
// (SPEC 3.3: Severance's "French" file is English). Plain functions, no app imports.

// The OpenSubtitles add-on's codes (SPEC 3.3, as it returns them) -> the app's language names (Account's list).
export const CODE_NAME = {
  eng: 'English', ice: 'Icelandic', isl: 'Icelandic', spa: 'Spanish', spl: 'Spanish', spn: 'Spanish', ea: 'Spanish',
  por: 'Portuguese', pob: 'Portuguese', pom: 'Portuguese', nld: 'Dutch', dut: 'Dutch', ger: 'German', deu: 'German',
  fre: 'French', fra: 'French', ita: 'Italian', swe: 'Swedish', nor: 'Norwegian', nob: 'Norwegian', dan: 'Danish',
  fin: 'Finnish', pol: 'Polish', tur: 'Turkish', ara: 'Arabic', hin: 'Hindi', zho: 'Chinese', zhe: 'Chinese',
  zht: 'Chinese', chi: 'Chinese', ron: 'Romanian', rum: 'Romanian', heb: 'Hebrew', rus: 'Russian', srp: 'Serbian',
  jpn: 'Japanese', alb: 'Albanian', sqi: 'Albanian', ind: 'Indonesian', hrv: 'Croatian', ell: 'Greek', gre: 'Greek',
  cze: 'Czech', ces: 'Czech', tha: 'Thai', est: 'Estonian', vie: 'Vietnamese', sin: 'Sinhala', may: 'Malay', msa: 'Malay',
  ben: 'Bengali', per: 'Persian', fas: 'Persian', kor: 'Korean', bul: 'Bulgarian', hun: 'Hungarian', slv: 'Slovenian',
  slo: 'Slovak', slk: 'Slovak', ukr: 'Ukrainian', lit: 'Lithuanian', lav: 'Latvian', cat: 'Catalan', baq: 'Basque',
  eus: 'Basque', glg: 'Galician', mac: 'Macedonian', mkd: 'Macedonian', bos: 'Bosnian', tam: 'Tamil', tel: 'Telugu',
  mal: 'Malayalam', urd: 'Urdu', tgl: 'Tagalog', fil: 'Tagalog', kur: 'Kurdish', geo: 'Georgian', arm: 'Armenian',
  khm: 'Khmer', mon: 'Mongolian', bre: 'Breton', epo: 'Esperanto', lb: 'Luxembourgish', ltz: 'Luxembourgish',
};
export const langName = (code) => CODE_NAME[String(code || '').toLowerCase()] || '';
// Two-letter codes, for the player (Media3 takes ISO 639-1 or 639-2).
export const NAME_ISO1 = { English: 'en', Spanish: 'es', French: 'fr', German: 'de', Italian: 'it', Portuguese: 'pt', Dutch: 'nl', Swedish: 'sv', Norwegian: 'no', Danish: 'da', Icelandic: 'is', Polish: 'pl', Turkish: 'tr', Arabic: 'ar', Hindi: 'hi', Finnish: 'fi', Chinese: 'zh', Japanese: 'ja', Korean: 'ko', Russian: 'ru', Greek: 'el', Hebrew: 'he', Czech: 'cs', Hungarian: 'hu', Romanian: 'ro', Croatian: 'hr', Serbian: 'sr' };
// A Media3 / Matroska track language (2 or 3 letters, "und") -> the app's name.
const ISO = { en: 'English', eng: 'English', es: 'Spanish', spa: 'Spanish', fr: 'French', fra: 'French', fre: 'French', de: 'German', deu: 'German', ger: 'German', it: 'Italian', ita: 'Italian', pt: 'Portuguese', por: 'Portuguese', nl: 'Dutch', nld: 'Dutch', dut: 'Dutch', sv: 'Swedish', swe: 'Swedish', no: 'Norwegian', nb: 'Norwegian', nn: 'Norwegian', nor: 'Norwegian', nob: 'Norwegian', da: 'Danish', dan: 'Danish', is: 'Icelandic', isl: 'Icelandic', ice: 'Icelandic', pl: 'Polish', pol: 'Polish', tr: 'Turkish', tur: 'Turkish', ar: 'Arabic', ara: 'Arabic', hi: 'Hindi', hin: 'Hindi', fi: 'Finnish', fin: 'Finnish', zh: 'Chinese', zho: 'Chinese', chi: 'Chinese', ja: 'Japanese', jpn: 'Japanese', ko: 'Korean', kor: 'Korean', ru: 'Russian', rus: 'Russian' };
export const trackLang = (code) => ISO[String(code || '').toLowerCase().split(/[-_]/)[0]] || '';

// ---------- the stopword sniff (SPEC 3.3: "first 50 cues") ----------
// Short, common words that are rarely shared between these languages. A file whose words fit another language much
// better than its label is re-labelled (when that language is one of yours) or dropped.
const W = {
  English: 'the you and to is that it of what this in me my for have be not are was do we on your just with he know all can no get there so here she they me her him about right if',
  Icelandic: 'og að ég er það ekki við þú hann hún en á í um mig þetta hvað var mér með til svo hér ef bara sem eru vil veit nei já núna þeir okkur',
  Spanish: 'que de no la el es y en lo un por qué me una te los se con para mi está si bien pero yo eso las del sí esto muy aquí cómo',
  Portuguese: 'que não de é o a um eu você se do da para em uma isso com está os mas por ele muito aqui bem sim são foi meu tem já',
  Dutch: 'de het een is ik je niet dat en van wat zijn op te we met voor hij maar er die heb naar mij ze dit wel hoe nee',
  German: 'ich die der und nicht das ist du sie es zu ein was wir mit mir den sich auf ja hier war dich mich auch ihr noch wie aber',
  French: 'de je est pas le la vous que les et un il à ne une ça en des on pour qui nous tu mais suis me dans moi bien oui',
  Italian: 'non di che è e la il un per mi sono ti si ma una lo cosa ho questo bene qui come io sei perché della tu gli',
  Swedish: 'jag det är inte du att en och har på vad som för med vi han ska här kan hon mig så den var till om nej',
  Norwegian: 'jeg det er ikke du at en og har på hva som for med vi han skal her kan hun meg så den var til om nei',
  Danish: 'jeg det er ikke du at en og har på hvad som for med vi han skal her kan hun mig så den var til om nej',
  Finnish: 'on ja en se että ei ole mitä minä sinä hän me te mutta kun niin tämä oli olen jos nyt vain sen sinun',
  Polish: 'nie to się na że jest co w jak mi ale tak ja z do już o czy masz mnie jestem go tu ty',
  Turkish: 've bir bu ne için çok ben sen da de mi o ama var değil gibi daha şey bana seni beni şimdi evet hayır',
};
const STOP = Object.fromEntries(Object.entries(W).map(([l, s]) => [l, new Set(s.split(' '))]));
const SCRIPT = [['Arabic', /[؀-ۿ]/g], ['Hindi', /[ऀ-ॿ]/g], ['Chinese', /[一-鿿]/g], ['Japanese', /[぀-ヿ]/g], ['Korean', /[가-힯]/g], ['Russian', /[Ѐ-ӿ]/g], ['Greek', /[Ͱ-Ͽ]/g], ['Hebrew', /[֐-׿]/g], ['Thai', /[฀-๿]/g]];

// { best, scores: { lang: share of words that are its stopwords }, words }
export function sniffLang(cues, n = 50) {
  // skip the first few cues (credits, sound-only lines), then up to n cues of dialogue
  const pick = cues.filter((c) => /\p{L}{2}/u.test(c.text)).slice(0, n + 5).slice(cues.length > n + 5 ? 5 : 0);
  const text = pick.map((c) => c.text.replace(/<\/?i>/g, '').replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')).join(' ');
  const scores = {};
  // other scripts by their letters
  const letters = (text.match(/\p{L}/gu) || []).length || 1;
  for (const [l, re] of SCRIPT) { const k = (text.match(re) || []).length / letters; if (k > 0.3) scores[l] = k; }
  const words = text.toLowerCase().split(/[^\p{L}']+/u).map((w) => w.replace(/^'+|'+$/g, '')).filter(Boolean);
  if (words.length) for (const [l, set] of Object.entries(STOP)) { let k = 0; for (const w of words) if (set.has(w)) k++; scores[l] = Math.max(scores[l] || 0, k / words.length); }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return { best: best ? best[0] : '', share: best ? best[1] : 0, scores, words: words.length };
}
// The verdict on a file labelled `label`: 'ok' (or can't tell), or { relabel: lang } when its words clearly belong
// to another language. Clearly = the other language scores 0.15+ and at least 2x the label's own (and the label is one
// the sniff knows: Serbian, Japanese and the rest are never second-guessed by words they don't have).
export function langVerdict(cues, label) {
  const r = sniffLang(cues);
  if (!label || !r.best || r.best === label || r.words < 40) return 'ok';
  const known = STOP[label] || SCRIPT.some(([l]) => l === label);
  if (!known) return 'ok';
  const own = r.scores[label] || 0;
  // Norwegian, Danish and Swedish share most short words: never re-label among them
  const nordic = ['Norwegian', 'Danish', 'Swedish'];
  if (nordic.includes(label) && nordic.includes(r.best)) return 'ok';
  return r.share >= 0.15 && r.share >= 2 * own ? { relabel: r.best } : 'ok';
}
