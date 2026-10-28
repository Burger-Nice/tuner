// What a picture is like, from a tiny copy (design/ui-v1/home-final/SPEC.md 9): its brightness (the normalised cap over
// it, so walking a row never flashes the room) and its colour (the glow behind the lineup); a logo's ink box (so 56 px
// is 56 px of letters, not of empty margin) and whether it is dark ink (drawn in chalk). Worked out once per image
// and kept for the session. An image server that doesn't allow reading its pixels leaves the defaults.
import { esc } from './util.js';

const memo = new Map(), logos = new Map(), ready = new Map();
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
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
// -> { mean (relative luminance of its right half, where the subject is), color 'r,g,b' } | null
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
      let lum = 0, n = 0, r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) {
        const px = (i / 4) % 32;
        r += d[i]; g += d[i + 1]; b += d[i + 2];
        if (px >= 16) { lum += 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]); n++; }
      }
      const m = d.length / 4;
      const out = { mean: lum / n, color: `${Math.round(r / m)},${Math.round(g / m)},${Math.round(b / m)}` };
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
// -> { x0, y0, x1, y1 (fractions of the image), w, h (natural), dark } | null
export function logoInfo(url) {
  if (!url) return Promise.resolve(null);
  if (logos.has(url)) return logos.get(url);
  const p = load(url, 6000).then((img) => {
    if (!img || !img.naturalWidth) return null;
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
      const out = { x0: x0 / W, y0: y0 / Hh, x1: (x1 + 1) / W, y1: (y1 + 1) / Hh, w: img.naturalWidth, h: img.naturalHeight, dark: n > 0 && lum / n < 0.04 };
      ready.set(`logo:${url}`, out);
      return out;
    } catch { return { plain: true }; }
  });
  logos.set(url, p);
  return p;
}
export const logoKnown = (url) => ready.get(`logo:${url}`) || null;
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
