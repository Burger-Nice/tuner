// Real quality in words (design/ui-v1/subtitles/SPEC.md 4.1, 4.3, 6.1): what a copy's check found, for the title
// page's tags, the Copies menu's rows and the posters. Only checked facts get the green tick; a claim that only the
// provider's name makes is dashed. Posters and filters never ask for a check: they read what is kept (PORT-UI.md 1).
import { esc } from './util.js';
import { checkFor, checkedFor, loadChecks } from './subs.js';
import { providerCopy, rank } from './copies.js';
// the copy of a title most likely to play, by its name alone (Saved asks for its check: PORT-UI.md 1)
export const byName = (t) => (t.versions?.length > 1 ? rank(t.versions.map((v) => providerCopy(v)), { langs: prefLangs() })[0].v : t.versions?.[0] || null);
import { prefLangs, qualityHook } from './catalog.js';

export const TICK = '<span class="ad-tk"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>';

// One quality vocabulary (SPEC 2.5): 4K, 1080p, 720p, SD; HDR10, Dolby Vision, HDR (HLG); 5.1, 7.1, stereo
export const rangeOf = (k) => (k ? (k.dv ? 'Dolby Vision' : k.hdr === 'HDR10' || k.hdr === 'HDR10+' ? 'HDR10' : k.hdr ? 'HDR' : '') : '');
export const channelsOf = (ch) => (ch >= 8 ? '7.1' : ch >= 6 ? '5.1' : ch === 2 ? 'stereo' : ch === 1 ? 'mono' : '');
// The sound in plain words, from the check's first sound track: "Dolby Digital Plus 5.1", "DTS-HD 5.1", "stereo"
export function soundOf(a) {
  if (!a) return '';
  const m = String(a.mime || '').toLowerCase();
  const name = /eac3|e-ac3|ec-3/.test(m) ? 'Dolby Digital Plus' : /ac3|ac-3/.test(m) ? 'Dolby Digital' : /dts\.hd|dts-hd|dts\.uhd/.test(m) ? 'DTS-HD' : /dts/.test(m) ? 'DTS' : /true-?hd/.test(m) ? 'Dolby TrueHD' : '';
  return [name, channelsOf(a.ch || 0)].filter(Boolean).join(' ');
}
export const soundOfCopy = (v) => soundOf(checkFor(v)?.formats?.audio?.[0]);
const lenWords = (s) => { const m = Math.round(s / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
export { lenWords };

// Why a copy has no checked facts, for the Copies menu's line 2 (PORT-UI.md 1)
export function uncheckedWords(v) {
  const e = checkFor(v);
  if (e?.status === 'couldnt') return 'Couldn\'t check: your provider was busy';
  if (e?.status === 'head-only' && !e.formats) return 'Couldn\'t check: your provider doesn\'t allow a quick look';
  return 'Not checked yet';
}

// ---------- posters (SPEC 6.1, movies-tags): one tag, the best copy's class. Filled = checked (no tick at poster
// size), dashed = only a name says so. Nothing for a title whose names claim nothing better than HD. ----------
const bestOf = (t) => {
  const vs = t.versions?.length ? t.versions : [];
  if (!vs.length) return null;
  if (vs.length === 1) return providerCopy(vs[0], { checked: checkedFor(vs[0]) });
  return rank(vs.map((v) => providerCopy(v, { checked: checkedFor(v) })), { langs: prefLangs() })[0];
};
export function posterTag(t) {
  loadChecks();   // (once per account: the kept checks, read from storage)
  const c = bestOf(t);
  if (!c) return '';
  const res = c.checked?.res || '';
  if (res && res !== 'SD') return `<span class="tag ad-ok">${esc(res)}</span>`;
  if (c.checked) return '';
  const claim = c.claim.res || '';
  return claim === '4K' || claim === '1080p' ? `<span class="tag ad-name">${esc(claim)}</span>` : '';
}

// ---------- the 4K chip and the Quality filter (SPEC 6.1): checked results win. A title is 4K if a check found a 4K
// copy, or if nothing is checked and a name says 4K. ----------
qualityHook.q = (t, q) => {
  const ks = (t.versions || []).map(checkedFor).filter(Boolean);
  if (!ks.length) return null;   // nothing checked: the names decide (catalog.js)
  return q === '4K' ? ks.some((k) => k.res === '4K') : ks.some((k) => k.res && k.res !== 'SD');
};
