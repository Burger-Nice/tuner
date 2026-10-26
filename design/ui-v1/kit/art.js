/* airglow UI mocks: procedural key art.
   The test provider has no artwork and real posters can't be shipped in a design folder, so every poster and backdrop
   here is generated from a seed: flat gradients and hard-edged shapes only (no filters, no blur), the same cost as a
   real <img>. Each art is an inline SVG that is cropped with preserveAspectRatio="xMidYMid slice", so the same drawing
   serves a 2:3 poster, a 16:9 card and a full-bleed backdrop. */
(function (g) {
  'use strict';
  let uid = 0;
  const rnd = (seed) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; };
  const hash = (str) => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const hsl = (h, s, l, a) => `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%${a == null ? '' : ' / ' + a}`.replace(/$/, ')');

  // 400 x 400 compositions, centre-weighted so a 2:3 or 16:9 crop both hold.
  const styles = {
    sun(h, r) {
      const id = 'a' + (++uid);
      const sx = 160 + r() * 80, sy = 190 + r() * 40;
      const hill = (y, k, c) => `<path d="M0 ${y} C ${100 + r() * 60} ${y - k} ${220 + r() * 60} ${y + k * 0.6} 400 ${y - k * 0.4} V400 H0Z" fill="${c}"/>`;
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(h, 55, 16)}"/><stop offset="1" stop-color="${hsl(h + 40, 70, 46)}"/></linearGradient></defs>
        <rect width="400" height="400" fill="url(#${id})"/><circle cx="${sx}" cy="${sy}" r="74" fill="${hsl(h + 55, 90, 72)}"/>
        ${hill(250, 26, hsl(h + 10, 45, 20))}${hill(300, 34, hsl(h + 5, 40, 14))}${hill(350, 22, hsl(h, 35, 9))}`;
    },
    city(h, r) {
      const id = 'a' + (++uid); let b = '', x = -10;
      while (x < 410) { const w = 24 + r() * 36, hh = 70 + r() * 190; b += `<rect x="${x}" y="${400 - hh}" width="${w}" height="${hh}" fill="${hsl(h, 38, 8 + r() * 4)}"/>`;
        for (let wy = 400 - hh + 10; wy < 392; wy += 14) for (let wx = x + 5; wx < x + w - 6; wx += 9) if (r() > 0.72) b += `<rect x="${wx}" y="${wy}" width="4" height="6" fill="${hsl(h + 45, 90, 76)}" opacity=".85"/>`;
        x += w + 2 + r() * 6; }
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(h, 50, 10)}"/><stop offset="1" stop-color="${hsl(h + 25, 62, 34)}"/></linearGradient></defs>
        <rect width="400" height="400" fill="url(#${id})"/><circle cx="${230 + r() * 80}" cy="${100 + r() * 40}" r="38" fill="${hsl(h + 40, 40, 88)}" opacity=".9"/>${b}`;
    },
    peaks(h, r) {
      const id = 'a' + (++uid);
      const layer = (base, hgt, n, c, snow) => { let d = `M0 400 L0 ${base}`; let x = 0; const pts = [];
        for (let i = 0; i < n; i++) { const w = 400 / n; const px = x + w / 2 + (r() - 0.5) * 30, py = base - hgt * (0.55 + r() * 0.45); pts.push([px, py]); d += ` L${px} ${py} L${x + w} ${base}`; x += w; }
        d += ' L400 400Z'; const caps = snow ? pts.map(([px, py]) => `<path d="M${px - 16} ${py + 24} L${px} ${py} L${px + 16} ${py + 24} L${px + 6} ${py + 18} L${px} ${py + 26} L${px - 7} ${py + 18}Z" fill="${hsl(h, 20, 92)}"/>`).join('') : '';
        return `<path d="${d}" fill="${c}"/>${caps}`; };
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(h + 20, 60, 28)}"/><stop offset="1" stop-color="${hsl(h + 60, 70, 62)}"/></linearGradient></defs>
        <rect width="400" height="400" fill="url(#${id})"/>${layer(240, 160, 3, hsl(h + 10, 35, 30), true)}${layer(300, 130, 4, hsl(h + 5, 38, 18), false)}${layer(360, 90, 5, hsl(h, 40, 10), false)}`;
    },
    figure(h, r) {
      const id = 'a' + (++uid), cx = 200 + (r() - 0.5) * 40;
      return `<defs><radialGradient id="${id}" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${hsl(h + 15, 65, 42)}"/><stop offset="1" stop-color="${hsl(h, 50, 9)}"/></radialGradient></defs>
        <rect width="400" height="400" fill="url(#${id})"/><path d="M${cx - 20} 0 L${cx + 20} 0 L${cx + 150} 400 L${cx - 150} 400Z" fill="${hsl(h + 30, 80, 70)}" opacity=".13"/>
        <circle cx="${cx}" cy="178" r="30" fill="${hsl(h, 40, 5)}"/><path d="M${cx - 92} 400 C ${cx - 88} 290 ${cx - 40} 218 ${cx} 218 C ${cx + 40} 218 ${cx + 88} 290 ${cx + 92} 400Z" fill="${hsl(h, 40, 5)}"/>`;
    },
    waves(h, r) {
      const id = 'a' + (++uid); let w = '';
      for (let i = 0; i < 6; i++) { const y = 170 + i * 42, a = 18 + r() * 22; w += `<path d="M0 ${y} C 90 ${y - a} 150 ${y + a} 230 ${y} S 360 ${y - a} 400 ${y} V400 H0Z" fill="${hsl(h + i * 8, 55 + i * 3, 52 - i * 7)}"/>`; }
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(h - 20, 55, 18)}"/><stop offset="1" stop-color="${hsl(h + 20, 70, 50)}"/></linearGradient></defs>
        <rect width="400" height="400" fill="url(#${id})"/><circle cx="${200 + (r() - 0.5) * 120}" cy="130" r="46" fill="${hsl(h + 70, 85, 80)}"/>${w}`;
    },
    rings(h, r) {
      const id = 'a' + (++uid), cx = 200 + (r() - 0.5) * 60, cy = 190 + (r() - 0.5) * 60; let c = '';
      for (let i = 0; i < 6; i++) c += `<circle cx="${cx}" cy="${cy}" r="${30 + i * 28}" fill="none" stroke="${hsl(h + i * 14, 70, 55 + i * 4)}" stroke-width="${i % 2 ? 3 : 8}" opacity="${0.95 - i * 0.12}"/>`;
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hsl(h, 45, 9)}"/><stop offset="1" stop-color="${hsl(h + 40, 55, 22)}"/></linearGradient></defs>
        <rect width="400" height="400" fill="url(#${id})"/>${c}<path d="M-20 330 L420 150 L420 190 L-20 370Z" fill="${hsl(h + 180, 70, 60)}" opacity=".22"/>`;
    },
    retro(h, r) {
      const id = 'a' + (++uid); let l = '';
      for (let i = 0; i < 9; i++) { const y = 262 + i * i * 2.2; l += `<rect x="0" y="${y}" width="400" height="${1.5 + i * 0.5}" fill="${hsl(h + 150, 80, 66)}" opacity=".7"/>`; }
      for (let i = -6; i <= 6; i++) l += `<path d="M${200 + i * 14} 262 L${200 + i * 70} 400" stroke="${hsl(h + 150, 80, 66)}" stroke-width="1.5" opacity=".5"/>`;
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(h, 60, 12)}"/><stop offset="1" stop-color="${hsl(h + 60, 70, 38)}"/></linearGradient>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(h + 60, 95, 72)}"/><stop offset="1" stop-color="${hsl(h + 120, 90, 62)}"/></linearGradient></defs>
        <rect width="400" height="400" fill="url(#${id})"/><circle cx="200" cy="215" r="64" fill="url(#${id}s)"/><rect y="262" width="400" height="140" fill="${hsl(h, 55, 8)}"/>${l}`;
    },
    forest(h, r) {
      const id = 'a' + (++uid);
      const row = (base, size, n, c) => { let t = ''; for (let i = 0; i < n; i++) { const x = (i + 0.3 + r() * 0.4) * (440 / n) - 20, s = size * (0.8 + r() * 0.5); t += `<path d="M${x} ${base - s * 2.2} L${x + s * 0.55} ${base} L${x - s * 0.55} ${base}Z" fill="${c}"/>`; } return t; };
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(h + 30, 45, 22)}"/><stop offset="1" stop-color="${hsl(h + 70, 40, 52)}"/></linearGradient></defs>
        <rect width="400" height="400" fill="url(#${id})"/><circle cx="${250 + r() * 60}" cy="130" r="30" fill="${hsl(h + 80, 50, 90)}" opacity=".85"/>
        ${row(300, 44, 7, hsl(h, 30, 24))}${row(350, 56, 6, hsl(h, 32, 15))}${row(410, 74, 5, hsl(h, 35, 8))}`;
    },
    court(h, r) {
      const id = 'a' + (++uid);
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hsl(h, 62, 36)}"/><stop offset="1" stop-color="${hsl(h - 14, 66, 22)}"/></linearGradient></defs>
        <rect width="400" height="400" fill="url(#${id})"/><g fill="none" stroke="${hsl(h + 10, 30, 92)}" stroke-width="5" opacity=".75"><circle cx="200" cy="200" r="70"/><path d="M0 200 H400"/><path d="M0 70 H110 V330 H0"/><path d="M400 70 H290 V330 H400"/><path d="M110 150 A 60 60 0 0 1 110 250"/></g>`;
    },
  };
  const order = ['sun', 'city', 'peaks', 'figure', 'waves', 'rings', 'retro', 'forest'];

  /** art(seed, {style, hue}) -> inline SVG that fills its box (position it absolutely). */
  function art(seed, o = {}) {
    const h = hash(seed), r = rnd(h ^ 0x9e3779b9);
    const hue = o.hue != null ? o.hue : h % 360;
    const style = o.style || order[h % order.length];
    return `<svg class="art-svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${styles[style](hue, r)}</svg>`;
  }
  const hue = (s) => hash(s) % 360;
  g.Art = { art, hash, hue, order };
})(window);
