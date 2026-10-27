// Subtitle files: bytes to text, the format sniff, SRT and WebVTT parsing, and what a file's lines say about it
// (design/ui-v1/subtitles/SPEC.md 3.3 and 3.5). Plain functions with no app imports, so tests/subs-*.js run them in node.
//
// A cue is { s, e, text } with s and e in seconds (3 decimals) and text with only <i> kept, lines joined by "\n".

// ---------- bytes to text ----------
// The add-on's download links convert to UTF-8 already ("subencoding-stremio-utf8"), but a file can come from anywhere
// (another add-on, a test): a BOM decides first, then strict UTF-8, then the language's old Windows code page.
const CODEPAGE = {
  Polish: 'windows-1250', Czech: 'windows-1250', Slovak: 'windows-1250', Hungarian: 'windows-1250', Croatian: 'windows-1250',
  Slovenian: 'windows-1250', Romanian: 'windows-1250', Serbian: 'windows-1250', Bosnian: 'windows-1250', Albanian: 'windows-1250',
  Russian: 'windows-1251', Ukrainian: 'windows-1251', Bulgarian: 'windows-1251', Macedonian: 'windows-1251',
  Greek: 'windows-1253', Turkish: 'windows-1254', Hebrew: 'windows-1255', Arabic: 'windows-1256', Persian: 'windows-1256',
  Estonian: 'windows-1257', Latvian: 'windows-1257', Lithuanian: 'windows-1257', Vietnamese: 'windows-1258',
  Chinese: 'gb18030', Japanese: 'shift_jis', Korean: 'euc-kr', Thai: 'windows-874',
};
export function decode(input, lang = '') {
  if (typeof input === 'string') return input;
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  const dec = (enc, bytes, fatal = false) => new TextDecoder(enc, { fatal }).decode(bytes);
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return dec('utf-8', b.subarray(3));
  if (b[0] === 0xff && b[1] === 0xfe) return dec('utf-16le', b.subarray(2));
  if (b[0] === 0xfe && b[1] === 0xff) return dec('utf-16be', b.subarray(2));
  // UTF-16 without a BOM: every other byte of plain text is 0
  let z0 = 0, z1 = 0; const n = Math.min(b.length, 2000);
  for (let i = 0; i < n; i += 2) { if (b[i] === 0) z0++; if (b[i + 1] === 0) z1++; }
  if (n > 20 && z1 > n / 4 && z0 < n / 40) return dec('utf-16le', b);
  if (n > 20 && z0 > n / 4 && z1 < n / 40) return dec('utf-16be', b);
  try { return dec('utf-8', b, true); } catch { /* not UTF-8 */ }
  try { return dec(CODEPAGE[lang] || 'windows-1252', b); } catch { return dec('windows-1252', b); }
}

// ---------- the format, from the body (SPEC 3.5: Oppenheimer's Japanese file is WebVTT, served as SubRip) ----------
const STAMP = /(?:(\d{1,3}):)?(\d{1,2}):(\d{1,2})(?:[,.:](\d{1,3}))?/;
const ARROW = new RegExp(`^\\s*${STAMP.source}\\s*-{1,2}>\\s*${STAMP.source}`);
export function sniff(text) {
  const t = String(text || '').replace(/^[﻿\s]+/, '');
  if (/^WEBVTT(?:[ \t\r\n]|$)/.test(t)) return 'vtt';
  // SRT: a timing line within the first lines (MicroDVD "{1}{25}", SAMI, ASS and plain text are none of these)
  const head = t.slice(0, 4000).split(/\r\n|\r|\n/).slice(0, 30);
  return head.some((l) => ARROW.test(l) && /-->/.test(l)) ? 'srt' : null;
}

const secs = (h, m, s, f) => (+(h || 0)) * 3600 + (+m) * 60 + (+s) + (f ? +`0.${f}` : 0);
const r3 = (x) => Math.round(x * 1000) / 1000;

// ---------- cleaning a cue's text (SPEC 3.5 and v1.1 S8) ----------
// {\an8}-style overrides, <font>, <b>, <u>, WebVTT's <c>, <v>, <lang>, <ruby>, <rt> and inline timestamps go; <i> stays.
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ', '&lrm;': '', '&rlm;': '', '&quot;': '"', '&#39;': "'", '&apos;': "'" };
export function cleanText(raw, vtt = false) {
  let t = String(raw).replace(/\{\\[^}]*\}/g, '');
  t = t.replace(/<\s*(\/?)\s*i\s*>/gi, '\u0001$1\u0002');                  // keep <i> and </i> (any case)
  t = t.replace(/<[^>\n]*>/g, '');                                            // every other tag
  t = t.replace(/\u0001(\/?)\u0002/g, '<$1i>');
  if (vtt || /&(amp|lt|gt|nbsp|lrm|rlm|quot|apos|#39);/.test(t)) t = t.replace(/&(amp|lt|gt|nbsp|lrm|rlm|quot|apos|#39);/g, (m) => ENT[m]);
  const lines = t.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter((l) => l && !/^(<\/?i>)+$/.test(l));
  const out = lines.join('\n');
  // a cue that is only tags, or only "<i></i>"
  return out.replace(/<\/?i>/g, '').trim() ? out : '';
}

// ---------- parsing (SRT and WebVTT, one tolerant reader) ----------
// - U+FEFF anywhere (the Icelandic Oppenheimer file has 2,912 of them, one per cue), NULs and stray CRs go;
// - CRLF, LF and CR all work;
// - a cue starts at its timing line, so a missing blank line between cues doesn't merge them (the index line that
//   ends up at the bottom of the previous cue's text is taken off);
// - WebVTT's header, NOTE, STYLE and REGION blocks and cue settings are skipped;
// - empty cues are dropped; cues are sorted by start.
export function parse(input, lang = '') {
  const text = decode(input, lang).replace(/[﻿\u0000]/g, '');
  const format = sniff(text);
  if (!format) return { format: null, cues: [] };
  const lines = text.split(/\r\n|\r|\n/);
  const cues = [];
  let cur = null, skip = false;
  const close = () => {
    if (!cur) return;
    // the SRT index of the next cue (when the blank line before it is missing) is not part of this one
    while (cur.lines.length && /^\s*\d+\s*$/.test(cur.lines[cur.lines.length - 1])) cur.lines.pop();
    const t = cleanText(cur.lines.join('\n'), format === 'vtt');
    if (t) cues.push({ s: cur.s, e: cur.e, text: t });
    cur = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const m = l.includes('->') && ARROW.exec(l);
    if (m) {
      close(); skip = false;
      const s = secs(m[1], m[2], m[3], m[4]), e0 = secs(m[5], m[6], m[7], m[8]);
      cur = { s: r3(s), e: r3(e0 > s ? e0 : s + 1), lines: [] };
      continue;
    }
    if (format === 'vtt' && !cur && /^(NOTE|STYLE|REGION)\b/.test(l)) { skip = true; continue; }
    if (!l.trim()) { if (cur && cur.lines.length) close(); else if (cur) { /* blank right after the timing line */ } skip = false; continue; }
    if (skip || !cur) continue;
    cur.lines.push(l);
  }
  close();
  cues.sort((a, b) => a.s - b.s);
  return { format, cues };
}

// ---------- what a file's own lines say ----------
// Subtitles with sounds ("SDH", "HI", "CC"): the file name says so (whole tokens, any case: "(SDH)", "-HI", ".Sdh"), or
// 8% or more of the cues have [..], (..), ♪ or a "NAME:" line (SPEC 3.3; on Oppenheimer the three such files are at
// 15-19% and the other four at 0%).
export const nameSaysSounds = (name) => /(^|[^a-z0-9])(hi|sdh|cc)([^a-z0-9]|$)/i.test(String(name || '').replace(/\.(srt|vtt|sub|ass|ssa|txt)$/i, ''));
const SOUNDISH = /\[[^\]\n]{1,80}\]|\([^)\n]{1,80}\)|♪|(^|\n)(<i>)?-?\s*(<i>)?[A-Z][A-Z0-9 .'’&-]{1,30}:(\s|$)/;
export function soundsShare(cues) {
  if (!cues.length) return 0;
  let n = 0;
  for (const c of cues) if (SOUNDISH.test(c.text)) n++;
  return n / cues.length;
}
export const SOUNDS_SHARE = 0.08;
export const hasSounds = (fileName, cues) => nameSaysSounds(fileName) || soundsShare(cues) >= SOUNDS_SHARE;

// The last cue that is within 60 s of the one before it (SPEC 3.4.3): the translator's credit that some files put
// minutes after the last line ("Þýðandi: Haraldur Jóhannsson", 395 s after the line before) doesn't count.
export function lastDialogue(cues, gap = 60) {
  for (let i = cues.length - 1; i > 0; i--) if (cues[i].s - cues[i - 1].s <= gap) return cues[i];
  return cues[cues.length - 1] || null;
}

// The whole file as SRT again (what the player gets: one format, already cleaned, timing as downloaded).
const two = (n) => String(n).padStart(2, '0');
const stamp = (t) => { const ms = Math.max(0, Math.round(t * 1000)); return `${two(Math.floor(ms / 3600000))}:${two(Math.floor(ms / 60000) % 60)}:${two(Math.floor(ms / 1000) % 60)},${String(ms % 1000).padStart(3, '0')}`; };
export const toSrt = (cues) => cues.map((c, i) => `${i + 1}\n${stamp(c.s)} --> ${stamp(c.e)}\n${c.text}\n`).join('\n');
