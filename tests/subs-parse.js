// node tests/subs-parse.js -> subtitle files: bytes to text, the format sniff, SRT and WebVTT, the sounds test and the
// language sniff (design/ui-v1/subtitles/SPEC.md 3.3, 3.5), on real files (tests/fixtures/subs) and made-up edge cases.
const { app, raw, runner } = require('./fixtures/subs/lib.js');
const { t, done } = runner('subs-parse');

(async () => {
  const P = await app('subs/parse.js');
  const L = await app('subs/lang.js');
  const parseRaw = (name, lang) => P.parse(new Uint8Array(raw(name)), lang);

  // ---- the Icelandic Oppenheimer file: a BOM on every cue, CRLF, the translator's credit at the end ----
  const isHead = raw('icelandic.head.srt.gz');
  const boms = (isHead.toString('utf8').match(/﻿/g) || []).length;
  const ih = parseRaw('icelandic.head.srt.gz', 'Icelandic');
  t('Icelandic: SRT', ih.format === 'srt');
  t('Icelandic: real BOMs in the bytes, none left in the text', boms >= 100 && !ih.cues.some((c) => c.text.includes('﻿')), `${boms} BOMs`);
  t('Icelandic: the first cue', ih.cues[0].s === 58.36 && ih.cues[0].e === 61.599 && ih.cues[0].text === 'PRÓMEÞEIFUR STAL ELDI FRÁ GUÐUNUM', JSON.stringify(ih.cues[0]));
  t('Icelandic: no CR left', !ih.cues.some((c) => /\r/.test(c.text)));
  t('Icelandic: about 120 cues in the excerpt', ih.cues.length >= 118 && ih.cues.length <= 121, ih.cues.length);
  const it = parseRaw('icelandic.tail.srt.gz', 'Icelandic');
  t('Icelandic tail: the credit is the last cue, 394.6 s after the line before', it.cues.at(-1).text === 'Þýðandi: Haraldur Jóhannsson' && Math.abs(it.cues.at(-1).s - it.cues.at(-2).s - 394.6) < 0.01);
  t('Icelandic tail: lastDialogue skips the credit', P.lastDialogue(it.cues).text === 'Ég held við höfum gert það.');
  t('Icelandic: the stopword sniff says Icelandic', L.sniffLang(ih.cues).best === 'Icelandic' && L.langVerdict(ih.cues, 'Icelandic') === 'ok');

  // ---- the English files: tags, sounds, names ----
  const heads = { 'Will1869': 'will1869', 'Will1869-HI': 'will1869-hi', 'WEB-DL MA': 'webdl-ma', 'WEB-DL SDH': 'webdl-sdh', GalaxyRG: 'galaxyrg', 'GalaxyRG.Sdh': 'galaxyrg-sdh' };
  const share = {};
  for (const [n, f] of Object.entries(heads)) {
    const p = parseRaw(`${f}.head.srt.gz`);
    share[n] = P.soundsShare(p.cues);
    t(`${n}: 200 cues, SRT, English`, p.format === 'srt' && p.cues.length === 200 && L.sniffLang(p.cues).best === 'English', `${p.cues.length} cues`);
  }
  t('the three files with sounds are over 8%, the other three at 0% (first 200 cues)', share['Will1869-HI'] >= 0.08 && share['WEB-DL SDH'] >= 0.08 && share['GalaxyRG.Sdh'] >= 0.08 && share.Will1869 === 0 && share['WEB-DL MA'] === 0 && share.GalaxyRG === 0, Object.entries(share).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join(', '));
  t('names with sounds: (SDH), -HI, .Sdh, any case', P.nameSaysSounds('Oppenheimer.2023.1080p.MA.WEB-DL.DDP5.1.Atmos.H.264 (SDH).srt') && P.nameSaysSounds('Oppenheimer.2023.1080p.BluRay.x264-Will1869-HI.srt') && P.nameSaysSounds('Oppenheimer.2023.720p.BluRay.999MB.x264-GalaxyRG.Sdh.srt') && P.nameSaysSounds('Show.S01E01.cc.srt'));
  t('names without: Will1869, WEB-DL MA, GalaxyRG, "Hitchcock", "ACCESS"', !P.nameSaysSounds('Oppenheimer.2023.1080p.BluRay.x264-Will1869.srt') && !P.nameSaysSounds('Oppenheimer.2023.1080p.MA.WEB-DL.DDP5.1.Atmos.H.264.srt') && !P.nameSaysSounds('Oppenheimer.2023.720p.BluRay.999MB.x264-GalaxyRG.srt') && !P.nameSaysSounds('Hitchcock.2012.srt') && !P.nameSaysSounds('ACCESS.DENIED.srt'));
  const w = parseRaw('will1869-hi.head.srt.gz');
  t('<i> is kept, other tags go', w.cues.some((c) => /<i>/.test(c.text)) && !w.cues.some((c) => /<(?!\/?i>)[^>]*>/.test(c.text)));

  // ---- WebVTT, served as SubRip (Oppenheimer's Japanese file) ----
  const jp = parseRaw('japanese.head.vtt.gz');
  t('Japanese: sniffed as WebVTT from the body', jp.format === 'vtt' && jp.cues[0].s === 60.02 && jp.cues[0].e === 65.014, JSON.stringify(jp.cues[0]));
  t('Japanese: the sniff says Japanese', L.sniffLang(jp.cues).best === 'Japanese');
  t('Japanese labelled Japanese: ok (no stopwords for it, never second-guessed)', L.langVerdict(jp.cues, 'Japanese') === 'ok');

  // ---- a mislabelled file (Severance S1 E1's "French" file is English, and names 01x08) ----
  const sev = parseRaw('severance-fre.head.srt.gz');
  const v = L.langVerdict(sev.cues, 'French');
  t('Severance "French": re-labelled English', v.relabel === 'English', JSON.stringify(L.sniffLang(sev.cues).scores));

  // ---- made-up edge cases ----
  const enc = (s) => new TextEncoder().encode(s);
  t('UTF-8 BOM bytes', P.decode(new Uint8Array([0xef, 0xbb, 0xbf, 0x41])) === 'A');
  t('UTF-16 LE with a BOM', P.decode(new Uint8Array([0xff, 0xfe, 0x41, 0, 0xf0, 0]))  === 'Að');
  const u16 = new Uint8Array(200); const s16 = '1\r\n00:00:01,000 --> 00:00:02,000\r\nHello there\r\n\r\n'; for (let i = 0; i < s16.length; i++) { u16[2 * i] = s16.charCodeAt(i); }
  t('UTF-16 LE without a BOM', P.parse(u16.subarray(0, s16.length * 2)).cues[0]?.text === 'Hello there');
  t('Windows-1252 Icelandic (not UTF-8)', P.decode(new Uint8Array([0xde, 0xfa, 0x20, 0xe6, 0x74, 0x6c, 0x61, 0xf0, 0x69, 0x72]), 'Icelandic') === 'Þú ætlaðir');
  t('Windows-1250 Polish', P.decode(new Uint8Array([0xb3, 0xb9, 0x9c]), 'Polish') === 'łąś');
  t('Windows-1251 Russian', P.decode(new Uint8Array([0xcf, 0xf0, 0xe8]), 'Russian') === 'При');
  const lf = P.parse('1\n00:00:01,000 --> 00:00:02,500\nOne\n\n2\n00:00:03,000 --> 00:00:04,000\nTwo\n');
  const cr = P.parse('1\r00:00:01,000 --> 00:00:02,500\rOne\r\r2\r00:00:03,000 --> 00:00:04,000\rTwo\r');
  t('LF and CR-only files', lf.cues.length === 2 && cr.cues.length === 2 && cr.cues[1].text === 'Two');
  const noBlank = P.parse('1\n00:00:01,000 --> 00:00:02,000\nOne\n2\n00:00:03,000 --> 00:00:04,000\nTwo\n');
  t('a missing blank line between cues', noBlank.cues.length === 2 && noBlank.cues[0].text === 'One', JSON.stringify(noBlank.cues));
  const tags = P.parse('1\n00:00:01,000 --> 00:00:02,000\n{\\an8}<font color="#ffff00"><b>Top</b></font> <u>line</u>\n<I>tilted</I>\n\n2\n00:00:02,000 --> 00:00:03,000\n<i></i>\n\n3\n00:00:03,000 --> 00:00:04,000\n   \n');
  t('{\\an8}, <font>, <b>, <u> stripped; <I> kept as <i>; empty cues dropped', tags.cues.length === 1 && tags.cues[0].text === 'Top line\n<i>tilted</i>', JSON.stringify(tags.cues));
  const vtt = P.parse('WEBVTT - made up\n\nNOTE a note\nwith two lines\n\nSTYLE\n::cue { color: red }\n\nid-1\n00:01.000 --> 00:02.000 align:start position:10%\n<v Roger>Hi &amp; <c.loud>bye</c>\n\n01:00:00.500 --> 01:00:01.000\n<00:00:00.600>Late\n');
  t('WebVTT: header, NOTE, STYLE, ids, settings, <v>, <c>, entities, hours optional', vtt.format === 'vtt' && vtt.cues.length === 2 && vtt.cues[0].s === 1 && vtt.cues[0].text === 'Hi & bye' && vtt.cues[1].s === 3600.5, JSON.stringify(vtt.cues));
  t('a dot for the comma, and short fractions', P.parse('1\n00:00:01.5 --> 00:00:02.25\nX\n').cues[0].s === 1.5);
  t('MicroDVD and plain text are not subtitles', P.sniff('{1}{25}Hello\n{26}{50}There') === null && P.sniff('Just some text\nmore') === null && P.parse('{1}{25}Hello').cues.length === 0);
  t('end before start: a 1 s cue', P.parse('1\n00:00:05,000 --> 00:00:04,000\nX\n').cues[0].e === 6);
  t('out-of-order cues are sorted', (() => { const c = P.parse('1\n00:00:05,000 --> 00:00:06,000\nB\n\n2\n00:00:01,000 --> 00:00:02,000\nA\n').cues; return c[0].text === 'A' && c[1].text === 'B'; })());
  t('NUL bytes and stray BOMs mid-file', P.parse(enc('1\n00:00:01,000 --> 00:00:02,000\n﻿A\u0000B\n')).cues[0].text === 'AB');
  t('toSrt round trip', (() => { const c = P.parse(P.toSrt(lf.cues)).cues; return c.length === 2 && c[0].s === 1 && c[0].e === 2.5 && c[1].text === 'Two'; })());
  t('a sound line counts once per cue: [door slams], (laughs), ♪, BOHR:', P.soundsShare(P.parse('1\n00:00:01,000 --> 00:00:02,000\n[door slams]\n\n2\n00:00:02,000 --> 00:00:03,000\n(laughs)\n\n3\n00:00:03,000 --> 00:00:04,000\n♪ la la ♪\n\n4\n00:00:04,000 --> 00:00:05,000\nBOHR: <i>Quantum</i>\n\n5\n00:00:05,000 --> 00:00:06,000\nAt 10:30, then.\n').cues) === 0.8);
  t('language codes: eng, ice, spl, pob, zht -> names', L.langName('eng') === 'English' && L.langName('ice') === 'Icelandic' && L.langName('spl') === 'Spanish' && L.langName('pob') === 'Portuguese' && L.langName('zht') === 'Chinese' && L.langName('xyz') === '');
  done();
})();
