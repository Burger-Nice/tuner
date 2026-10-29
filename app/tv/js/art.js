// What a picture is like, from a tiny copy (design/ui-v1/home-final/SPEC.md 9): its brightness (the normalised cap over
// it, so walking a row never flashes the room) and its colour (the glow behind the lineup); a logo's ink box (so 56 px
// is 56 px of letters, not of empty margin) and whether it is dark ink (drawn in chalk). Worked out once per image
// and kept for the session. An image server that doesn't allow reading its pixels leaves the defaults.
import { esc } from './util.js';

const memo = new Map(), logos = new Map(), ready = new Map();
// (a table: a logo's ink is up to 240 x 240 pixels, three Math.pow each was most of its cost)
const LIN = Float64Array.from({ length: 256 }, (_, v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
const lin = (v) => LIN[v];
// the small copy of a backdrop: metahub's small size, TMDB's w300
export const small = (u) => String(u || '').replace(/\/background\/(medium|large)\//, '/background/small/').replace(/(image\.tmdb\.org\/t\/p\/)(w\d+|original)\//, '$1w300/');
function load(src, ms = 4000) {
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const t = setTimeout(() => res(null), ms);
    img.onload = () => { clearTimeout(t); res(img); };
    img.onerror = () => { clearTimeout(t); res(null); };
    img.src = src;
  });
}
// -> { mean (relative luminance of its right half, where the subject is), tl (its top-left quarter), color 'r,g,b' } | null
export function analyse(url) {
  if (!url) return Promise.resolve(null);
  if (memo.has(url)) return memo.get(url);
  const p = load(small(url)).then((img) => {
    if (!img) return null;
    try {
      const c = document.createElement('canvas'); c.width = 32; c.height = 18;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, 32, 18);
      const d = x.getImageData(0, 0, 32, 18).data;
      let lum = 0, n = 0, r = 0, g = 0, b = 0, tl = 0, tn = 0;
      for (let i = 0; i < d.length; i += 4) {
        const px = (i / 4) % 32, py = Math.floor(i / 4 / 32);
        r += d[i]; g += d[i + 1]; b += d[i + 2];
        const L = 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
        if (px >= 16) { lum += L; n++; }
        if (px < 16 && py < 9) { tl += L; tn++; }   // (the top-left quarter: where the player's title block sits)
      }
      const m = d.length / 4;
      const out = { mean: lum / n, tl: tl / Math.max(1, tn), color: `${Math.round(r / m)},${Math.round(g / m)},${Math.round(b / m)}` };
      ready.set(url, out);
      return out;
    } catch { return null; }   // (a tainted canvas: the server doesn't allow it)
  });
  memo.set(url, p);
  return p;
}
export const known = (url) => ready.get(url) || null;
// alpha = clamp(1 − target / mean, .10, .60): target .30 on the Marquee, .22 in the rows
export const capFor = (a, target) => (a ? Math.max(0.1, Math.min(0.6, 1 - target / Math.max(0.01, a.mean))) : 0.42);
// the glow: the art's colour, kept dark enough for chalk on it
export const glowOf = (a, alpha = 0.6) => { if (!a) return 'transparent'; const [r, g, b] = a.color.split(',').map(Number); const f = Math.min(1, 110 / Math.max(1, Math.max(r, g, b))); return `rgba(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)},${alpha})`; };

// ---------- logos ----------
// -> { x0, y0, x1, y1 (fractions of the image), w, h (natural), dark, lum (the ink's mean luminance) } | null
export function logoInfo(url) {
  if (!url) return Promise.resolve(null);
  if (logos.has(url)) return logos.get(url);
  const p = load(url, 6000).then((img) => {
    if (!img || !img.naturalWidth) { failedLogos.add(url); return null; }
    try {
      const W = Math.min(240, img.naturalWidth), Hh = Math.max(1, Math.round((W * img.naturalHeight) / img.naturalWidth));
      const c = document.createElement('canvas'); c.width = W; c.height = Hh;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, W, Hh);
      const d = x.getImageData(0, 0, W, Hh).data;
      let x0 = W, y0 = Hh, x1 = -1, y1 = -1, lum = 0, n = 0;
      for (let y = 0; y < Hh; y++) for (let xx = 0; xx < W; xx++) {
        const i = (y * W + xx) * 4;
        if (d[i + 3] < 24) continue;
        if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y;
        lum += 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]); n++;
      }
      if (x1 < 0) return null;
      const out = { x0: x0 / W, y0: y0 / Hh, x1: (x1 + 1) / W, y1: (y1 + 1) / Hh, w: img.naturalWidth, h: img.naturalHeight, dark: n > 0 && lum / n < 0.04, lum: n > 0 ? lum / n : 0 };
      ready.set(`logo:${url}`, out);
      return out;
    } catch { return { plain: true }; }
  });
  logos.set(url, p);
  return p;
}
export const logoKnown = (url) => ready.get(`logo:${url}`) || null;
// a logo that didn't load (404, offline, too slow): the screens show the name in text instead
const failedLogos = new Set();
export const logoFailed = (url) => failedLogos.has(url);
// A logo whose ink is h px tall and at most maxW wide; before its ink box is known, the image fitted to h.
export function logoHtml(url, alt, h, maxW, cls = 'lgo') {
  const info = logoKnown(url);
  if (!info || info.plain) return `<img class="${cls}" src="${esc(url)}" alt="${esc(alt)}" style="height:${h}px;max-width:${maxW}px" decoding="async">`;
  let Hd = h / (info.y1 - info.y0), Wd = (Hd * info.w) / info.h;
  let inkW = (info.x1 - info.x0) * Wd;
  if (inkW > maxW) { const s = maxW / inkW; Hd *= s; Wd *= s; inkW = maxW; }
  const inkH = (info.y1 - info.y0) * Hd;
  const pos = `left:${(-info.x0 * Wd).toFixed(1)}px;top:${(-info.y0 * Hd).toFixed(1)}px;width:${Wd.toFixed(1)}px;height:${Hd.toFixed(1)}px`;
  const inner = info.dark
    ? `<i style="position:absolute;${pos};background:var(--a-text-1);-webkit-mask:url('${esc(url)}') 0 0/100% 100% no-repeat;mask:url('${esc(url)}') 0 0/100% 100% no-repeat"></i>`
    : `<img src="${esc(url)}" alt="${esc(alt)}" style="position:absolute;${pos}" decoding="async">`;
  return `<span class="${cls} ink" style="width:${inkW.toFixed(1)}px;height:${inkH.toFixed(1)}px">${inner}</span>`;
}

// The player's title block (design/ui-v1/player-v2/SPEC.md 3): a title's logo, its ink box and whether it reads. The
// player can't read its video frames, so the check is against the backdrop art's top-left as a proxy for the frame,
// under the top scrim (bg-0 at about 78 % there): the ink must pass 3 : 1, or the player shows the text title. Dark ink is
// drawn in chalk, as Home does. line: the first sentence of the story, for the pause screen.
export function playerArt(logo, background, story) {
  const out = { line: firstSentence(story) };
  if (!logo) return out;
  out.logo = logo;
  const info = logoKnown(logo);
  if (info && !info.plain) {
    out.box = [info.x0, info.y0, info.x1, info.y1];
    out.dark = !!info.dark;
    const bg = known(background || '');
    const under = 0.78 * 0.0068 + 0.22 * (bg ? bg.tl ?? bg.mean : 0.05);
    const L = info.dark ? 0.86 : info.lum ?? 0.5;
    out.ok = (Math.max(L, under) + 0.05) / (Math.min(L, under) + 0.05) >= 3;
  }
  return out;
}
function firstSentence(s) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const m = t.match(/^.{20,}?[.!?](?=\s|$)/);
  const one = m ? m[0] : t;
  return one.length > 120 ? `${one.slice(0, 117).replace(/\s+\S*$/, '')}…` : one;
}
