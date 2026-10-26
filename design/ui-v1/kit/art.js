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

  /* ---- v1.1 scenes: stand-ins for real key art. Still flat gradients and hard-edged shapes; radial gradients are static (decoded once, never animated). ---- */
  const glow = (id, cx, cy, rr, col, a) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${rr}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${col}" stop-opacity="${a}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
  styles.arena = (h, r) => {
    const id = 'a' + (++uid); let lights = '', crowd = '', floorLines = '';
    for (let i = 0; i < 9; i++) lights += `<ellipse cx="${30 + i * 42}" cy="${22 + (i % 2) * 8}" rx="15" ry="4" fill="${hsl(48, 90, 92)}"/><circle cx="${30 + i * 42}" cy="${26 + (i % 2) * 8}" r="26" fill="url(#${id}g)"/>`;
    for (let i = 0; i < 70; i++) { const x = r() * 400, y = 150 + r() * 58; crowd += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1.2 + r() * 2.2).toFixed(1)}" fill="${hsl(30 + r() * 40, 70, 68)}" opacity="${(.25 + r() * .5).toFixed(2)}"/>`; }
    for (let i = -5; i <= 5; i++) floorLines += `<path d="M${200 + i * 26} 236 L${200 + i * 120} 400" stroke="${hsl(h + 10, 40, 80)}" stroke-width="1.2" opacity=".16"/>`;
    return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(h + 200, 45, 5)}"/><stop offset="1" stop-color="${hsl(h + 200, 40, 14)}"/></linearGradient>
      <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(h, 62, 34)}"/><stop offset="1" stop-color="${hsl(h - 6, 58, 16)}"/></linearGradient><radialGradient id="${id}g"><stop offset="0" stop-color="${hsl(48, 100, 88)}" stop-opacity=".5"/><stop offset="1" stop-color="${hsl(48, 100, 88)}" stop-opacity="0"/></radialGradient></defs>
      <rect width="400" height="400" fill="url(#${id})"/>${lights}
      <path d="M0 214 C 60 196 140 190 200 190 S 340 196 400 214 V 238 H0Z" fill="${hsl(h + 200, 35, 7)}"/>${crowd}
      <path d="M0 236 H400 L440 400 H-40Z" fill="url(#${id}f)"/>${floorLines}
      <ellipse cx="200" cy="318" rx="104" ry="26" fill="none" stroke="${hsl(h + 10, 30, 90)}" stroke-width="3" opacity=".55"/><path d="M96 318 H304" stroke="${hsl(h + 10, 30, 90)}" stroke-width="2.5" opacity=".5"/>
      <path d="M150 236 L116 400 M250 236 L284 400" stroke="${hsl(h + 10, 30, 90)}" stroke-width="2.5" opacity=".4"/>
      <rect x="170" y="112" width="60" height="42" fill="none" stroke="${hsl(0, 0, 90)}" stroke-width="3" opacity=".8"/><rect x="186" y="136" width="28" height="18" fill="none" stroke="${hsl(20, 90, 55)}" stroke-width="2.5"/>
      <ellipse cx="200" cy="158" rx="16" ry="4" fill="none" stroke="${hsl(18, 95, 56)}" stroke-width="3.5"/><path d="M185 160 L192 184 M215 160 L208 184 M200 162 V186" stroke="#F3EFE6" stroke-width="1.2" opacity=".6"/>
      <path d="M118 400 C 120 330 132 296 150 290 C 166 286 178 300 178 330 L184 400Z" fill="${hsl(h + 200, 30, 4)}"/><circle cx="154" cy="266" r="14" fill="${hsl(h + 200, 30, 4)}"/>
      <path d="M262 400 C 262 340 272 308 290 302 C 308 300 318 318 316 350 L322 400Z" fill="${hsl(h + 200, 30, 5)}"/><circle cx="292" cy="280" r="13" fill="${hsl(h + 200, 30, 5)}"/>
      <circle cx="222" cy="232" r="17" fill="${hsl(22, 88, 48)}"/><path d="M205 232 H239 M222 215 V249 M210 221 C 218 230 218 236 210 244 M234 221 C 226 230 226 236 234 244" stroke="${hsl(22, 80, 20)}" stroke-width="1.6" fill="none"/>`;
  };
  styles.lighthouse = (h, r) => {
    const id = 'a' + (++uid); let sea = '', stars = '';
    for (let i = 0; i < 40; i++) stars += `<circle cx="${(r() * 400).toFixed(0)}" cy="${(r() * 170).toFixed(0)}" r="${(0.6 + r() * 1.1).toFixed(1)}" fill="#F3EFE6" opacity="${(.3 + r() * .6).toFixed(2)}"/>`;
    for (let i = 0; i < 7; i++) { const y = 262 + i * 22, a = 5 + r() * 7; sea += `<path d="M0 ${y} C 80 ${y - a} 150 ${y + a} 230 ${y} S 360 ${y - a} 400 ${y} V400 H0Z" fill="${hsl(h + 8, 50 - i * 2, 20 - i * 2.2)}"/>`; }
    return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(h + 30, 55, 7)}"/><stop offset=".7" stop-color="${hsl(h + 10, 58, 22)}"/><stop offset="1" stop-color="${hsl(h, 50, 34)}"/></linearGradient>
      <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFE9B0" stop-opacity=".55"/><stop offset="1" stop-color="#FFE9B0" stop-opacity="0"/></linearGradient></defs>
      <rect width="400" height="400" fill="url(#${id})"/>${stars}<circle cx="86" cy="86" r="26" fill="${hsl(48, 30, 92)}" opacity=".92"/>
      <path d="M262 150 L-20 98 L-20 190Z" fill="url(#${id}b)"/>
      ${sea}<path d="M72 262 V400 M86 262 V400 M100 262 V400" stroke="${hsl(48, 30, 92)}" stroke-width="2" opacity=".14"/>
      <path d="M296 120 H322 L330 292 H288Z" fill="${hsl(h, 30, 6)}"/><path d="M292 190 H326 M291 236 H327" stroke="${hsl(0, 0, 78)}" stroke-width="9" opacity=".8"/>
      <rect x="291" y="104" width="36" height="18" fill="${hsl(48, 100, 78)}"/><path d="M288 104 H330 L309 86Z" fill="${hsl(h, 30, 6)}"/><rect x="296" y="120" width="26" height="6" fill="${hsl(h, 30, 6)}"/>
      <path d="M250 292 C 270 276 340 276 372 292 L400 400 H230Z" fill="${hsl(h, 30, 5)}"/><path d="M-10 400 L40 350 L110 372 L150 400Z" fill="${hsl(h, 30, 4)}"/>`;
  };
  styles.tower = (h, r) => {
    const id = 'a' + (++uid); let b = '', arcs = '';
    for (let i = 0, x = -6; x < 410; i++) { const w = 22 + r() * 30, hh = 50 + r() * 110; b += `<rect x="${x}" y="${400 - hh}" width="${w}" height="${hh}" fill="${hsl(h, 34, 6 + r() * 3)}"/>`; for (let wy = 400 - hh + 8; wy < 392; wy += 12) for (let wx = x + 4; wx < x + w - 5; wx += 8) if (r() > .7) b += `<rect x="${wx}" y="${wy}" width="3" height="5" fill="${hsl(h + 40 + r() * 40, 90, 74)}" opacity=".85"/>`; x += w + 3; }
    for (let i = 1; i <= 4; i++) arcs += `<path d="M${200 - i * 34} ${108 - i * 6} A ${i * 40} ${i * 40} 0 0 1 ${200 + i * 34} ${108 - i * 6}" fill="none" stroke="${hsl(340, 90, 68)}" stroke-width="3" opacity="${(0.8 - i * 0.16).toFixed(2)}"/>`;
    return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(h, 55, 8)}"/><stop offset="1" stop-color="${hsl(h + 30, 60, 30)}"/></linearGradient><radialGradient id="${id}g"><stop offset="0" stop-color="${hsl(340, 90, 62)}" stop-opacity=".6"/><stop offset="1" stop-color="${hsl(320, 90, 50)}" stop-opacity="0"/></radialGradient></defs>
      <rect width="400" height="400" fill="url(#${id})"/><circle cx="200" cy="112" r="210" fill="url(#${id}g)"/>${arcs}${b}
      <path d="M200 112 L176 330 H224Z M188 200 H212 M182 256 H218 M200 112 V96" stroke="${hsl(h, 30, 3)}" stroke-width="5" fill="none"/><path d="M200 112 L176 330 M200 112 L224 330" stroke="${hsl(h, 30, 3)}" stroke-width="5"/><circle cx="200" cy="108" r="5" fill="${hsl(340, 95, 70)}"/>`;
  };
  styles.studio = (h, r) => {
    const id = 'a' + (++uid); let scr = '';
    for (let i = 0; i < 5; i++) scr += `<rect x="${40 + i * 66}" y="${90 + (i % 2) * 14}" width="56" height="34" rx="3" fill="${hsl(h + 20, 70, 58 - (i % 3) * 8)}" opacity=".85"/>`;
    return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hsl(h, 60, 14)}"/><stop offset="1" stop-color="${hsl(h + 30, 65, 32)}"/></linearGradient></defs>
      <rect width="400" height="400" fill="url(#${id})"/>${scr}<path d="M0 280 H400 V400 H0Z" fill="${hsl(h, 45, 8)}"/><path d="M30 280 C 30 250 60 238 130 238 H270 C 340 238 370 250 370 280Z" fill="${hsl(h + 10, 30, 22)}"/>
      <circle cx="160" cy="196" r="20" fill="${hsl(24, 40, 62)}"/><path d="M126 244 C 128 220 142 214 160 214 C 178 214 192 220 194 244Z" fill="${hsl(h + 60, 40, 24)}"/><rect x="0" y="278" width="400" height="4" fill="${hsl(h + 120, 80, 62)}" opacity=".8"/>`;
  };
  styles.pitch = (h, r) => {
    const id = 'a' + (++uid); let stripes = '', lamps = '';
    for (let i = 0; i < 8; i++) stripes += `<path d="M${-40 + i * 60} 400 L${130 + i * 20} 220 H${150 + i * 20} L${20 + i * 60 + 60} 400Z" fill="${hsl(h, 55, i % 2 ? 30 : 26)}"/>`;
    for (let i = 0; i < 6; i++) lamps += `<circle cx="${40 + i * 64}" cy="${40 + (i % 2) * 10}" r="9" fill="${hsl(52, 90, 94)}"/>`;
    return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(h + 100, 50, 8)}"/><stop offset="1" stop-color="${hsl(h + 100, 45, 24)}"/></linearGradient></defs>
      <rect width="400" height="400" fill="url(#${id})"/>${lamps}<path d="M0 200 C 100 170 300 170 400 200 V 224 H0Z" fill="${hsl(h + 100, 30, 6)}"/><rect y="220" width="400" height="180" fill="${hsl(h, 55, 26)}"/>${stripes}
      <path d="M60 400 L150 232 H250 L340 400Z" fill="none" stroke="#F3EFE6" stroke-width="2.4" opacity=".6"/><ellipse cx="200" cy="318" rx="62" ry="16" fill="none" stroke="#F3EFE6" stroke-width="2.4" opacity=".6"/>`;
  };
  styles.theatre = (h, r) => {
    const id = 'a' + (++uid);
    return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(h, 55, 6)}"/><stop offset="1" stop-color="${hsl(h, 50, 16)}"/></linearGradient>${glow(id + 'g', 200, 120, 240, hsl(h + 40, 90, 70), .5)}</defs>
      <rect width="400" height="400" fill="url(#${id})"/><path d="M200 0 L60 400 H340Z" fill="${hsl(h + 40, 90, 80)}" opacity=".14"/><path d="M200 0 L120 400 H280Z" fill="${hsl(h + 40, 90, 85)}" opacity=".16"/>
      <path d="M0 0 H70 C 60 120 40 260 0 400Z M400 0 H330 C 340 120 360 260 400 400Z" fill="${hsl(h + 340, 70, 22)}"/><path d="M0 330 H400 V400 H0Z" fill="${hsl(h, 40, 9)}"/><ellipse cx="200" cy="332" rx="96" ry="10" fill="${hsl(h + 40, 90, 80)}" opacity=".35"/>
      <circle cx="200" cy="222" r="19" fill="${hsl(h, 30, 3)}"/><path d="M158 332 C 160 270 176 248 200 248 C 224 248 240 270 242 332Z" fill="${hsl(h, 30, 3)}"/>`;
  };
  const posterTitle = (t, y = 336) => {
    const words = t.toUpperCase().replace(/[:&]/g, '').split(/\s+/); const lines = []; let cur = '';
    for (const w of words) { if ((cur + ' ' + w).trim().length > 11 && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) lines.push(cur);
    const L = lines.slice(0, 3), fsz = L.some((l) => l.length > 9) ? 26 : 32;
    return `<g font-family="Outfit, sans-serif" font-weight="700" text-anchor="middle" fill="#F3EFE6" letter-spacing="2">${L.map((l, i) => `<text x="200" y="${y + i * (fsz + 4) - (L.length - 1) * (fsz + 4) * .5}" font-size="${fsz}">${l}</text>`).join('')}</g>`;
  };
  const order = ['sun', 'city', 'peaks', 'figure', 'waves', 'rings', 'retro', 'forest'];

  /** art(seed, {style, hue}) -> inline SVG that fills its box (position it absolutely). */
  function art(seed, o = {}) {
    const h = hash(seed), r = rnd(h ^ 0x9e3779b9);
    const hue = o.hue != null ? o.hue : h % 360;
    const style = o.style || order[h % order.length];
    const vb = o.crop ? o.crop.join(' ') : '0 0 400 400';
    return `<svg class="art-svg" viewBox="${vb}" preserveAspectRatio="${o.align || 'xMidYMid'} slice" aria-hidden="true">${styles[style](hue, r)}</svg>`;
  }
  /** poster(seed, {style,hue,title}) -> the same art with a stand-in title treatment, like a printed poster (the caption under it stays the real title) */
  function poster(seed, o = {}) {
    const h = hash(seed), r = rnd(h ^ 0x9e3779b9);
    const hue = o.hue != null ? o.hue : h % 360, style = o.style || order[h % order.length];
    return `<svg class="art-svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${styles[style](hue, r)}<rect y="232" width="400" height="168" fill="url(#pv${h})"/><defs><linearGradient id="pv${h}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#15131D" stop-opacity="0"/><stop offset="1" stop-color="#15131D" stop-opacity=".78"/></linearGradient></defs>${o.title ? posterTitle(o.title, 332) : ''}</svg>`;
  }
  const hue = (s) => hash(s) % 360;
  g.Art = { art, poster, hash, hue, order };
})(window);
