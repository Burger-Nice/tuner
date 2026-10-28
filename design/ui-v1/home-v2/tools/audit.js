// design/ui-v1/home-v2: the self-check (SPEC 11). node tools/audit.js [--quiet] [--inject] [page ...]
// The catch-up / nba-pages audit (one ring, OVERLAP, CLIP, SAFE, CONTRAST, RING read back from pixels, HUE, CLOCK, SPOILER,
// CONTAIN, TRUNC, RAILFOCUS, RINGTEXT) run on the Home v2 mocks, plus the checks this design adds:
//   PRIMARY  one gradient button per screen (the billboard's), and it is the one focused on an unscrolled Home
//   ORDER    Continue watching is the first row when it has items; Channels is the last row when other rows exist
//   PEEK     a peeking row (its cards cross the safe line) shows art only: no text, no badge, inside the screen
//   SLABTXT  nothing but the slab's own content over the slab polygon
//   BAR      the top bar is away on a scrolled page, present otherwise; the context line only when scrolled
//   HERO     the billboard's text column ends before x 600 (the art side) and its buttons sit at y 232-276
//   LINES    a card's title and meta, the billboard's meta and fan line, a row title and a game card's status are one line each
//   RECORD   on a shield mock with a game billboard the records are partial (the eye-off), never a full W-L
//   LIVEBG   the pixels around every LIVE pill are dark canvas, never a team colour (read from the screenshot)
//   DATA     a channel card never carries art (the Xtream guide has none): the logo tile, or the game's team colours
// --inject puts one fault per new check into the pages (a second primary, a swapped row order, a caption in a peek row,
// a score on a shield page) to prove they fire.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const root = path.resolve(__dirname, '..'); const b = await chromium.launch();
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--')); const quiet = process.argv.includes('--quiet'), inject = process.argv.includes('--inject');
  const files = (args.length ? args : JSON.parse(fs.readFileSync(root + '/tools/pages.json', 'utf8')).map((p) => p.file)).filter((f) => f.endsWith('.html'));
  const rings = []; let bad = 0; const lines = [];
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
    p.on('pageerror', (e) => lines.push(`${f}  PAGEERROR ${e.message}`));
    await p.goto('file://' + root + '/' + f); await p.evaluate(() => document.fonts.ready);
    if (inject) await p.evaluate(() => {
      const s = document.querySelector('.screen');
      s.insertAdjacentHTML('beforeend', '<span class="btn" style="position:absolute;left:700px;top:470px;z-index:30">Second primary</span>');
      const rows = [...document.querySelectorAll('.hv-row')]; const c = rows.find((r) => r.dataset.rail === 'cont'); if (c && rows[1]) { const t = c.style.top; c.style.top = rows[1].style.top; rows[1].style.top = t; }
      const pk = document.querySelector('.rail.peek .wc .tx,.rail.peek .pc .cap'); if (pk) pk.style.visibility = 'visible';
      if (document.querySelector('meta[name="shield"]')) s.insertAdjacentHTML('beforeend', '<div style="position:absolute;left:300px;top:30px;font:500 16px Inter;color:#F3EFE6;z-index:30">Final 118–112</div>');
    });
    const r = await p.evaluate(() => {
      const SAFE = { l: 48, r: 912, t: 27, b: 513 }, TOL = 1.5;
      const sel = '.f,.f-ring,.f-in,.lift';
      const focusEls = [...document.querySelectorAll(sel)].filter((e) => !e.closest('.sb-shot'));
      const NOFOCUS = !!document.querySelector('meta[name="nofocus"],meta[name="storyboard"]');
      const all = document.querySelectorAll('.screen *').length, art = document.querySelectorAll('.art-svg, .art-svg *').length;
      const small = [], banned = [];
      const issues = { overlap: [], clip: [], safe: [], contrast: [], home: [] };
      const short = (e) => (e.className && e.className.baseVal === undefined ? '.' + String(e.className).trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase());
      const vis = (e) => { for (let a = e; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; } return true; };
      // ---- text boxes: one Range rect per text-bearing element (direct text nodes only)
      const texts = [];
      for (const e of document.querySelectorAll('.screen *')) {
        if (e.closest('svg') || e.closest('.sb-shot') || e.closest('.art') && !e.closest('.noart')) continue;
        const cs = getComputedStyle(e);
        if (cs.filter !== 'none' || cs.backdropFilter !== 'none') banned.push(e.className);
        if (!vis(e)) continue;
        let has = false; const rg = document.createRange();
        for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); has = true; }
        if (!has) continue;
        let rects = [...rg.getClientRects()].filter((q) => q.width > 1 && q.height > 1);
        if (cs.getPropertyValue('-webkit-line-clamp') !== 'none') rects = [e.getBoundingClientRect()];
        if (!rects.length) continue;
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of rects) { x0 = Math.min(x0, q.left); y0 = Math.min(y0, q.top); x1 = Math.max(x1, q.right); y1 = Math.max(y1, q.bottom); }
        if (cs.textOverflow === 'ellipsis' && cs.overflow !== 'visible' && cs.display !== 'flex' && cs.display !== 'inline-flex') { const q = e.getBoundingClientRect(); x1 = Math.min(x1, q.right); x0 = Math.max(x0, q.left); }
        const fs = parseFloat(cs.fontSize);
        const txt = e.textContent.trim().replace(/\s+/g, ' ');
        if (fs < 14 && !(fs >= 11.5 && txt.length <= 5)) small.push(fs + ':' + txt.slice(0, 14));
        // text clipped away by the screen (a card that slid out) or under a menu is not on screen
        const hit = (x, y) => { const h = document.elementFromPoint(Math.min(959, Math.max(0, x)), Math.min(539, Math.max(0, y))); return !h || e.contains(h) || h.contains(e) && !h.matches('.scrim,.sheet,.menu,.ctxmenu'); };
        const cy = (y0 + y1) / 2, w = x1 - x0;
        if (!(hit(x0 + 2, cy) || hit(x0 + w / 2, cy) || hit(x1 - 2, cy))) continue;
        texts.push({ e, cs, x0, y0, x1, y1, txt: txt.slice(0, 22), fs });
      }
      const MODAL = '.menu,.sheet,.ctxmenu';
      if (document.querySelector('.scrim')) texts.splice(0, texts.length, ...texts.filter((t) => t.e.closest(MODAL)));
      // ---- overlap between unrelated text boxes
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i], c = texts[j];
        if (a.e.contains(c.e) || c.e.contains(a.e)) continue;
        if (!!a.e.closest('.ctxmenu') !== !!c.e.closest('.ctxmenu')) continue;   // the hold-OK menu floats over the page on purpose
        const ox = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0), oy = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
        if (ox > 2 && oy > 2) issues.overlap.push(`"${a.txt}" x "${c.txt}" ${ox.toFixed(0)}x${oy.toFixed(0)}`);
      }
      // ---- text against component boxes
      const BOXES = '.btn,.btn2,.chip,.tag,.logo,.team,.shield,.kbd,.toast,.lr,.arow,.wc,.pc .box,.gc,.menu,.sheet,.ctxmenu,.endcard,.offline-bar,.hv-pst';
      const cover = !!document.querySelector('.hv-cover');
      const boxEls = [...document.querySelectorAll(BOXES)].filter((b) => !b.closest('.art') && !b.closest('.sb-shot')).filter((b) => { const q = b.getBoundingClientRect(); return q.width > 8 && q.height > 8 && vis(b) && !(cover && q.bottom < 84); });   // (a card under the scrolled page's cover band is not on screen)
      for (const t of texts) for (const b of boxEls) {
        const q = b.getBoundingClientRect(); const inside = b.contains(t.e);
        if (inside) { if (b.matches('.sheet,.menu')) continue; if (t.x0 < q.left - 2 || t.x1 > q.right + 2 || t.y0 < q.top - 2 || t.y1 > q.bottom + 2) issues.clip.push(`text "${t.txt}" escapes ${short(b)}`); }
        else {
          const ox = Math.min(t.x1, q.right) - Math.max(t.x0, q.left), oy = Math.min(t.y1, q.bottom) - Math.max(t.y0, q.top);
          if (ox > 2 && oy > 2 && !t.e.contains(b) && !(b.closest('.ctxmenu') && !t.e.closest('.ctxmenu')) && !(t.e.closest('.ctxmenu') && !b.closest('.ctxmenu'))) issues.overlap.push(`"${t.txt}" touches ${short(b)}`);
        }
      }
      // ---- SLABTXT: text over the slab polygon (the box's left is the bottom-left corner; the top-left is at + 2 * --sk)
      const polys = [];
      for (const s of document.querySelectorAll('.slabbox')) { const q = s.getBoundingClientRect(), sk = parseFloat(getComputedStyle(s).getPropertyValue('--sk')) || 0; polys.push([[q.left + 2 * sk, q.top], [q.right, q.top], [q.right, q.bottom], [q.left, q.bottom]]); }
      const inPoly = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c; } return c; };
      if (polys.length) for (const t of texts) {
        if (t.e.closest('.slabbox') || t.e.closest('.topbar')) continue;
        if (t.e.closest(MODAL)) continue;
        const pts = [[t.x0, t.y0], [t.x1, t.y0], [t.x0, t.y1], [t.x1, t.y1], [(t.x0 + t.x1) / 2, (t.y0 + t.y1) / 2]];
        if (polys.some((poly) => pts.some((pt) => inPoly(pt, poly)))) issues.home.push(`SLABTXT: "${t.txt}" on the slab`);
      }
      // ---- clipping of text and focus rings by overflow ancestors; safe area
      const clipper = (e) => { const out = []; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a); if (o.overflow !== 'visible' || o.overflowX !== 'visible' || o.clipPath !== 'none') out.push(a); } return out; };
      for (const t of texts) {
        for (const a of clipper(t.e)) {
          const q = a.getBoundingClientRect(); const bs = getComputedStyle(a);
          const cl = { l: q.left + parseFloat(bs.borderLeftWidth), r: q.right - parseFloat(bs.borderRightWidth), t: q.top + parseFloat(bs.borderTopWidth), b: q.bottom - parseFloat(bs.borderBottomWidth) };
          const cut = t.x0 < cl.l - TOL || t.x1 > cl.r + TOL || t.y0 < cl.t - TOL || t.y1 > cl.b + TOL;
          if (!cut) continue;
          if (a.classList.contains('screen') || a.closest('.rail') || a.classList.contains('rail') || a.classList.contains('hv-bb')) continue;
          const ell = (el) => getComputedStyle(el).textOverflow === 'ellipsis' && getComputedStyle(el).display !== 'flex' && getComputedStyle(el).display !== 'inline-flex';
          if (ell(t.e) && t.e.scrollWidth > t.e.clientWidth) continue;
          if (t.cs.getPropertyValue('-webkit-line-clamp') !== 'none') continue;
          issues.clip.push(`text "${t.txt}" cut by ${short(a)}`); break;
        }
        if (!t.e.closest('.rail') && !t.e.closest('.offline-bar')) {
          if (t.x0 < SAFE.l - TOL || t.x1 > SAFE.r + TOL || t.y0 < SAFE.t - TOL || t.y1 > SAFE.b + TOL) issues.safe.push(`text "${t.txt}" at ${t.x0.toFixed(0)},${t.y0.toFixed(0)}-${t.x1.toFixed(0)},${t.y1.toFixed(0)}`);
        }
      }
      for (const fe of focusEls) {
        const q = fe.getBoundingClientRect(); const cs = getComputedStyle(fe);
        const ringOut = cs.boxShadow.includes('inset') || fe.classList.contains('f-in') ? 0 : 5;
        const ring = { l: q.left - ringOut, r: q.right + ringOut, t: q.top - ringOut, b: q.bottom + ringOut };
        for (const a of clipper(fe)) {
          if (a.classList.contains('screen')) continue;
          const aq = a.getBoundingClientRect(); const cp = getComputedStyle(a).clipPath; const inset = /inset\(0(?:px)? 0(?:px)? 0(?:px)? (\d+)px\)/.exec(cp); const al = aq.left + (inset ? +inset[1] : 0);
          if (ring.l < al - 0.5 || ring.r > aq.right + 0.5 || ring.t < aq.top - 0.5 || ring.b > aq.bottom + 0.5) { issues.clip.push(`focus ring of ${short(fe)} clipped by ${short(a)}`); break; }
        }
        if (!fe.closest('.rail') && (ring.l < SAFE.l - 6 || ring.r > SAFE.r + 6 || ring.t < SAFE.t - 6 || ring.b > SAFE.b + 6)) issues.safe.push(`focus ${short(fe)} ring ${ring.l.toFixed(0)},${ring.t.toFixed(0)}-${ring.r.toFixed(0)},${ring.b.toFixed(0)}`);
        if (fe.closest('.rail') && (ring.l < SAFE.l - 6 || ring.t < SAFE.t - 6 || ring.b > SAFE.b + 6)) issues.safe.push(`focus ${short(fe)} ring ${ring.l.toFixed(0)},${ring.t.toFixed(0)}-${ring.r.toFixed(0)},${ring.b.toFixed(0)} (rail)`);
      }
      for (const m of document.querySelectorAll('.ctxmenu,.menu,.sheet')) { const q = m.getBoundingClientRect(); if (q.bottom > 513.5 || q.top < 26.5 || q.left < 47.5 || q.right > 912.5) issues.safe.push(`${short(m)} box ${q.left.toFixed(0)},${q.top.toFixed(1)}-${q.right.toFixed(0)},${q.bottom.toFixed(1)} crosses the safe area`); }
      for (const fe of focusEls) if (/reveal/i.test(fe.textContent)) issues.overlap.push(`SHIELD: the focused element is a Reveal ("${fe.textContent.trim().slice(0, 30)}")`);
      // ---- CONTAIN: a control poking out of its card / bar
      const CONT = '.sheet,.menu,.ctxmenu,.gc,.wc,.hv-btns,.hv-status,.arow,.offline-bar';
      for (const c of document.querySelectorAll('.btn,.btn2,.chip,.lr,.tag,.a-live,.pillbtn,.logo')) {
        const box = c.parentElement && c.parentElement.closest(CONT); if (!box || !vis(c)) continue;
        const q = c.getBoundingClientRect(), bb = box.getBoundingClientRect(), bs = getComputedStyle(box);
        const inner = { l: bb.left + parseFloat(bs.borderLeftWidth), r: bb.right - parseFloat(bs.borderRightWidth), t: bb.top + parseFloat(bs.borderTopWidth), b: bb.bottom - parseFloat(bs.borderBottomWidth) };
        const sc = c.classList.contains('f') ? (q.width - c.offsetWidth) / 2 : 0;
        const out = Math.max(inner.l - q.left - sc, q.right - inner.r - sc, inner.t - q.top - sc, q.bottom - inner.b - sc);
        if (out > 1) issues.clip.push(`CONTAIN: ${short(c)} "${(c.textContent || '').trim().slice(0, 24)}" pokes ${out.toFixed(0)} px out of ${short(box)}`);
      }
      for (const e of document.querySelectorAll('.clamp2,.clamp3,.hv-plot,.hv-title')) { if (e.closest('.rail,.art')) continue; if (e.scrollHeight > e.clientHeight + 1) issues.clip.push(`TRUNC: "${e.textContent.trim().slice(0, 30)}" is cut by its line clamp`); }
      // ---- SPOILER on shield mocks (catch-up): scores, remaining time, OT, result words outside data-other
      if (document.querySelector('meta[name="shield"]')) {
        const walker = document.createTreeWalker(document.querySelector('.screen'), NodeFilter.SHOW_TEXT);
        const runs = new Map();
        for (let n = walker.nextNode(); n; n = walker.nextNode()) { const host = n.parentElement.closest('[data-other]') ? null : n.parentElement.closest('.plate,.gc,.x,div,span,b'); if (host && vis(n.parentElement)) runs.set(host, (runs.get(host) || '') + n.textContent); }
        for (const [host, txt0] of runs) {
          const txt = txt0.replace(/\s+/g, ' ').replace(/\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b(?=\s|$|·)/g, ' ');
          if (/\b\d{2,3}\s?[-–]\s?\d{2,3}\b/.test(txt) || /\b(6\d|[7-9]\d|1\d\d)\s?(:|—|–|-|\bto\b)\s?(6\d|[7-9]\d|1\d\d)\b/.test(txt)) issues.overlap.push(`SPOILER: a score "${txt.trim().slice(0, 30)}" on a shield mock`);
          if (/[−-]\d{1,2}:\d\d/.test(txt)) issues.overlap.push(`SPOILER: a remaining time "${txt.trim().slice(0, 30)}"`);
          if (/\bOT\b|\b\dOT\b|overtime/i.test(txt)) issues.overlap.push(`SPOILER: "OT" on a shield mock`);
          if (/\bFinal\b(?! buzzer)/.test(txt) || /\b(won|beat|lost to|wins|swept)\b|\b[WL] \d/i.test(txt)) issues.overlap.push(`SPOILER: a result word "${txt.trim().slice(0, 30)}"`);
        }
        for (const pl of document.querySelectorAll('.plate')) { if (pl.closest('[data-other]')) continue; if (pl.querySelectorAll('.score').length >= 2 && [...pl.querySelectorAll('.score')].every((x) => /^\d+$/.test(x.textContent.trim()))) issues.overlap.push('SPOILER: a score plate on a shield mock'); }
      }
      // ---- contrast on flat backgrounds
      const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] == null || isNaN(v[3]) ? 1 : v[3] }; };
      const lum = ({ r, g, b }) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      for (const t of texts) {
        if (t.e.closest('.noart,.tag,.art,.hv-mt .side,.slabbox,.wc,.hv-bb,.pc .box')) continue;
        const fg0 = parse(t.cs.color); if (!fg0) continue;
        let stack = [], skip = false;
        for (let a = t.e; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.backgroundImage !== 'none') { skip = true; break; } const c = parse(s.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 0.999) break; } }
        if (skip) continue;
        let bg = { r: 21, g: 19, b: 29 }; for (let i = stack.length - 1; i >= 0; i--) { const c = stack[i]; bg = { r: bg.r * (1 - c.a) + c.r * c.a, g: bg.g * (1 - c.a) + c.g * c.a, b: bg.b * (1 - c.a) + c.b * c.a }; }
        const fg = { r: fg0.r * fg0.a + bg.r * (1 - fg0.a), g: fg0.g * fg0.a + bg.g * (1 - fg0.a), b: fg0.b * fg0.a + bg.b * (1 - fg0.a) };
        const L1 = lum(fg), L2 = lum(bg); const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        if (cr < 4.5 && !(t.cs.opacity < 1) && !t.e.closest('.dis')) issues.contrast.push(`"${t.txt}" ${cr.toFixed(2)}:1`);
      }
      for (const sd of document.querySelectorAll('.hv-mt .side')) {
        const cs = getComputedStyle(sd), P = parse('rgb(' + cs.getPropertyValue('--tp').trim().match(/[0-9a-f]{2}/gi).map((h) => parseInt(h, 16)).join(',') + ')'), C = parse('rgb(' + cs.getPropertyValue('--tc').trim().match(/[0-9a-f]{2}/gi).map((h) => parseInt(h, 16)).join(',') + ')');
        const L1 = lum(P), L2 = lum(C), cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        if (cr < 4.5) issues.contrast.push(`team plate text ${cr.toFixed(2)}:1`);
      }
      // ---- PEEK: a peeking row shows art only, nothing sliced by the bottom edge
      for (const t of texts) {
        if (t.e.closest('.rail.peek')) { if (t.e.closest('.tx,.cap,.cm,.nm,.rc,.plate')) issues.home.push(`PEEK: body text "${t.txt}" in a peeking row`); else if (t.y1 > 540.5) issues.home.push(`PEEK: "${t.txt}" sliced by the edge (y ${t.y1.toFixed(0)})`); continue; }
        if (t.e.closest('.rail') && (t.y1 > 540.5 || (t.y0 < 540 && t.y1 > 540))) issues.safe.push(`rail text "${t.txt}" sliced by the bottom edge`);
        if (t.e.closest('.rail') && t.y1 > 513.5 && !t.e.closest('.rail.peek')) issues.safe.push(`rail text "${t.txt}" below the safe line (y ${t.y1.toFixed(0)})`);
      }
      for (const bd of document.querySelectorAll('.rail.peek .tag,.rail.peek .tl,.rail.peek .tr,.rail.peek .ch,.rail.peek .crs,.rail.peek .a-live')) { if (!vis(bd)) continue; const q = bd.getBoundingClientRect(); if (q.bottom > 540.5) issues.home.push(`PEEK: a badge (${short(bd)}) sliced by the edge`); }
      // ---- RAILFOCUS: a rail that takes focus keeps its cards inside the safe line when focused (card bottom <= 513)
      for (const rl of document.querySelectorAll('.rail:not(.peek)')) {
        for (const c of rl.querySelectorAll('.wc,.pc .box,.gc,.endcard')) { const q = c.getBoundingClientRect(); if (q.left > 912 || q.right < 48) continue;
          const lift = c.classList.contains('f') ? 0 : (q.height * 0.05) / 2;
          if (q.bottom + lift + 5 > 519.5) { issues.safe.push(`RAILFOCUS: ${short(c)} would sit at y ${(q.bottom + lift).toFixed(0)} focused, past 513`); break; } }
      }
      // ---- a focus ring must clear its neighbours (ring = 5 px outside the scaled box, plus 2 px of air) and any text outside it
      const NEIGH = '.btn,.btn2,.chip,.pc .box,.wc,.gc,.lr,.arow,.tag,.endcard,.hv-pst';
      for (const fe of focusEls) {
        if (fe.classList.contains('f-in')) continue;
        const q = fe.getBoundingClientRect(); const ring = { l: q.left - 7, r: q.right + 7, t: q.top - 7, b: q.bottom + 7 };
        const host = fe.closest('.pc') || fe;
        for (const n of document.querySelectorAll(NEIGH)) {
          if (n === fe || fe.contains(n) || n.contains(fe) || host.contains(n) || !vis(n)) continue;
          const fc = fe.closest(MODAL); if (fc && !fc.contains(n)) continue;
          if (fe.matches('.lr,.arow') && n.matches('.lr,.arow')) continue;
          const o = n.getBoundingClientRect(); if (o.width < 8 || o.height < 8) continue;
          const ox = Math.min(ring.r, o.right) - Math.max(ring.l, o.left), oy = Math.min(ring.b, o.bottom) - Math.max(ring.t, o.top);
          if (ox > 0 && oy > 0) issues.overlap.push(`focus ring of ${short(fe)} touches ${short(n)} (${Math.min(ox, oy).toFixed(1)} px)`);
        }
        const g = 6, R = { l: q.left - g, r: q.right + g, t: q.top - g, b: q.bottom + g };
        for (const t of texts) {
          if (fe.contains(t.e) || t.e.contains(fe) || host.contains(t.e) || t.e.closest('.art')) continue;
          const fl = fe.closest(MODAL); if (fl && !fl.contains(t.e)) continue; if (!fl && t.e.closest(MODAL)) continue;
          const ox = Math.min(R.r, t.x1) - Math.max(R.l, t.x0), oy = Math.min(R.b, t.y1) - Math.max(R.t, t.y0);
          if (ox > 1 && oy > 1) issues.overlap.push(`RINGTEXT: the ring of ${short(fe)} crosses "${t.txt}" (${Math.min(ox, oy).toFixed(1)} px)`);
        }
      }
      // ---- team colour: 8 px from any LIVE pill, never touching a focus ring
      for (const pe of document.querySelectorAll('.hv-mt .side,.tedge')) {
        const q = pe.getBoundingClientRect();
        for (const lv of document.querySelectorAll('.a-live')) { const o = lv.getBoundingClientRect(); if (o.width < 4) continue; const dx = Math.max(o.left - q.right, q.left - o.right, 0), dy = Math.max(o.top - q.bottom, q.top - o.bottom, 0); if (Math.hypot(dx, dy) < 8) issues.overlap.push(`team colour ${short(pe)} is ${Math.hypot(dx, dy).toFixed(1)} px from a LIVE pill (min 8)`); }
        for (const fe of focusEls) { if (fe.contains(pe)) continue; const o = fe.getBoundingClientRect(); if (Math.min(q.right, o.right + 5) - Math.max(q.left, o.left - 5) > 0 && Math.min(q.bottom, o.bottom + 5) - Math.max(q.top, o.top - 5) > 0) issues.overlap.push(`team colour ${short(pe)} touches the focus ring of ${short(fe)}`); }
      }
      // ---- HUE: no amber or yellow anywhere in the UI, red only on LIVE (art, team plates and crests excluded)
      { const hue = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); if (v[3] === 0) return null; const [r, g, b] = v.map((x) => x / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 0.25) return null; const l = (mx + mn) / 2, sat = d / (1 - Math.abs(2 * l - 1)); if (sat < 0.45) return null; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; return h; };
        for (const e of document.querySelectorAll('.screen *')) { if (e.closest('svg,.art,.tedge,.hv-mt .side,.team,.wc.crest,.sb-shot') || e.matches('.tedge,.hv-fa,.hv-fh') || !vis(e)) continue; const cs = getComputedStyle(e);
          for (const [k, c] of [['color', cs.color], ['background', cs.backgroundColor], ['border', cs.borderTopWidth !== '0px' ? cs.borderTopColor : ''], ['border-b', cs.borderBottomWidth !== '0px' ? cs.borderBottomColor : '']]) { const h = hue(c); if (h == null) continue;
            if (k === 'color' && !(e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))) continue;
            if (h >= 32 && h <= 68) issues.overlap.push(`HUE: amber/yellow ${k} on ${short(e)}`);
            if ((h < 12 || h > 350) && !e.closest('.a-live')) issues.overlap.push(`HUE: red ${k} on ${short(e)} (red is LIVE only)`); } } }
      // ---- CLOCK: 24 h times
      const allText = texts.map((t) => t.e.textContent).join(' | ');
      { const j = allText.match(/\b\d{1,2}(:\d\d)?\s?(am|pm|a\.m\.|p\.m\.)\b/i); if (j) issues.overlap.push(`CLOCK: "${j[0]}" is a 12 h time`); }
      // ---- Home v2 checks
      const prim = [...document.querySelectorAll('.btn')].filter((e) => vis(e) && !e.closest('.sb-shot'));
      if (prim.length > 1) issues.home.push(`PRIMARY: ${prim.length} gradient buttons on screen`);
      const scrolled = !!document.querySelector('.topbar.away');
      if (!scrolled && !NOFOCUS && document.querySelector('.hv-bb') && !document.querySelector('.ctxmenu') && prim.length === 1 && !prim[0].classList.contains('f')) issues.home.push('PRIMARY: the billboard\'s primary is not the focused element');
      if (scrolled && !document.querySelector('.ctxline')) issues.home.push('BAR: scrolled page without its context line');
      if (!scrolled && document.querySelector('.ctxline')) issues.home.push('BAR: a context line while the bar is present');
      if (scrolled) { const bbEl = document.querySelector('.hv-bb'); if (!bbEl) issues.home.push('BAR: the billboard is unmounted on a scrolled page (hide it, keep its image)'); else if (getComputedStyle(bbEl).visibility !== 'hidden' && bbEl.getBoundingClientRect().bottom > 0) issues.home.push('BAR: the billboard shows on a scrolled page'); }
      const rws = [...document.querySelectorAll('.hv-row')].map((r) => ({ id: r.dataset.rail, top: parseFloat(r.style.top) })).sort((a, b) => a.top - b.top);
      if (rws.length) { const ci = rws.findIndex((r) => r.id === 'cont'); if (ci > 0) issues.home.push(`ORDER: Continue watching is row ${ci + 1}, not first`); const chi = rws.findIndex((r) => r.id === 'channels'); if (chi >= 0 && chi !== rws.length - 1) issues.home.push('ORDER: Channels is not the last row'); }
      const col = document.querySelector('.hv-col'); if (col) { for (const t of texts) if (col.contains(t.e) && t.x1 > 600.5) issues.home.push(`HERO: column text "${t.txt}" past x 600`); }
      const hb = document.querySelector('.hv-btns'); if (hb) { const q = hb.getBoundingClientRect(); if (!NOFOCUS && (Math.abs(q.top - 232) > 0.5 || Math.abs(q.bottom - 276) > 0.5)) issues.home.push(`HERO: the button row sits at y ${q.top.toFixed(0)}-${q.bottom.toFixed(0)}, not 232-276`); }
      // ---- LINES (review 1): one line each
      for (const e of document.querySelectorAll('.wc .tx b,.wc .tx span:not(.dot-sep):not(.epn):not(.cu-may),.hv-meta,.hv-ctx,.hv-rt,.gc .st,.pc .cap,.pc .cm,.hv-eye,.hv-status')) {
        if (!vis(e) || e.closest('.sb-shot')) continue; const q = e.getBoundingClientRect(), lh = parseFloat(getComputedStyle(e).lineHeight) || 20;
        if (q.height > lh * 1.5) issues.home.push(`LINES: "${e.textContent.trim().replace(/\s+/g, ' ').slice(0, 28)}" wraps to ${Math.round(q.height / lh)} lines (${short(e)})`);
      }
      // ---- RECORD (review 3): a shield mock with a game billboard never shows a full W-L on a plate
      if (document.querySelector('meta[name="shield"]') && document.querySelector('.hv-bb.game')) for (const rc of document.querySelectorAll('.hv-side .rc')) if (!rc.closest('.sb-shot') && !rc.querySelector('.nb-rp') && /\d+-\d+/.test(rc.textContent)) issues.home.push(`RECORD: a full record "${rc.textContent.trim()}" under the shield`);
      // ---- DATA (review 4): a channel card never carries art
      for (const c of document.querySelectorAll('.wc.chc')) if (c.querySelector('.art-svg,.art img')) issues.home.push('DATA: a channel card with art (live TV has none)');
      const livePills = [...document.querySelectorAll('.a-live:not(.compact)')].filter((e) => vis(e) && !e.closest('.sb-shot') && !e.closest('.rail')).map((e) => { const q = e.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; });
      const fr = focusEls.map((fe) => { const q = fe.getBoundingClientRect(), cs = getComputedStyle(fe); return { cls: short(fe), inset: cs.boxShadow.includes('inset') || fe.classList.contains('f-in'), x0: q.left, y0: q.top, x1: q.right, y1: q.bottom, rad: parseFloat(cs.borderTopLeftRadius) || 0, sc: q.width / (fe.offsetWidth || q.width) }; });
      return { focus: focusEls.length, ui: all - art, small: [...new Set(small)], banned: banned.length, issues, fr, nofocus: NOFOCUS, livePills };
    });
    const iss = r.issues; const n = iss.overlap.length + iss.clip.length + iss.safe.length + iss.contrast.length + iss.home.length + (r.banned ? 1 : 0) + r.small.length + (r.focus !== 1 && !r.nofocus ? 1 : 0);
    bad += n;
    lines.push(f.padEnd(28) + ' focus ' + r.focus + ' nodes ' + String(r.ui).padStart(4) + (n ? '  FAIL ' + n : '  ok'));
    if (r.focus !== 1 && !r.nofocus) lines.push(`    FOCUS    ${r.focus} focus rings (one per screen)`);
    if (n || !quiet) for (const k of ['overlap', 'clip', 'safe', 'contrast', 'home']) for (const m of [...new Set(iss[k])]) lines.push(`    ${k.toUpperCase().padEnd(8)} ${m}`);
    if (r.small.length) lines.push('    SMALL    ' + r.small.join(' | '));
    if (r.banned) lines.push('    BANNED   ' + r.banned);
    // ---- RING: sample the screenshot just outside every edge of each focused element: the ring must really be there
    const shot = (await p.screenshot()).toString('base64');
    if (r.livePills.length) {
      const q = await b.newPage(); await q.setContent('<canvas></canvas>');
      const res = await q.evaluate(async ({ shot, pills }) => { const im = new Image(); im.src = 'data:image/png;base64,' + shot; await im.decode(); const c = document.querySelector('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        return pills.map(([l, t, rr, bb]) => { const pts = [[l - 8, (t + bb) / 2], [rr + 8, (t + bb) / 2], [(l + rr) / 2, t - 8], [(l + rr) / 2, bb + 8]]; let worst = 0; for (const [px, py] of pts) { const d = x.getImageData(Math.round(px * 2), Math.round(py * 2), 1, 1).data; const sat = Math.max(d[0], d[1], d[2]) - Math.min(d[0], d[1], d[2]); worst = Math.max(worst, sat); } return worst; }); }, { shot, pills: r.livePills });
      await q.close();
      res.forEach((sat, i) => { if (sat > 40) { bad++; lines.push(`    LIVEBG   LIVE pill ${i + 1}: a coloured ground next to it (saturation ${sat}/255, max 40)`); } });
    }
    for (const g of r.fr) {
      const off = g.inset ? -1.5 : 3.6 * g.sc, pts = [], skip = g.rad * g.sc + 4;
      for (let x = g.x0 + skip; x <= g.x1 - skip; x += 3) { pts.push([x, g.y0 - off, 't'], [x, g.y1 + off, 'b']); }
      for (let y = g.y0 + skip; y <= g.y1 - skip; y += 3) { pts.push([g.x0 - off, y, 'l'], [g.x1 + off, y, 'r']); }
      const q = await b.newPage(); await q.setContent('<canvas></canvas>');
      const res = await q.evaluate(async ({ shot, pts }) => { const im = new Image(); im.src = 'data:image/png;base64,' + shot; await im.decode(); const c = document.querySelector('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const out = { t: [0, 0], b: [0, 0], l: [0, 0], r: [0, 0] }; for (const [px, py, s] of pts) { if (px < 0 || px > 959 || py < 0 || py > 539) continue; const d = x.getImageData(Math.round(px * 2), Math.round(py * 2), 1, 1).data; out[s][1]++; if (d[0] > 228 && d[1] > 228 && d[2] > 228) out[s][0]++; } return out; }, { shot, pts });
      await q.close();
      const pc = (s) => (res[s][1] ? Math.round((100 * res[s][0]) / res[s][1]) : 100), min = Math.min(pc('t'), pc('b'), pc('l'), pc('r'));
      const ringBox = g.inset ? [g.x0, g.y0, g.x1, g.y1] : [g.x0 - 5 * g.sc, g.y0 - 5 * g.sc, g.x1 + 5 * g.sc, g.y1 + 5 * g.sc];
      const safe = Math.min(ringBox[0] - 48, 912 - ringBox[2], ringBox[1] - 27, 513 - ringBox[3]);
      rings.push({ f, el: g.cls, inset: g.inset, top: pc('t'), bottom: pc('b'), left: pc('l'), right: pc('r'), min, ring: ringBox.map((v) => +v.toFixed(1)), safe: +safe.toFixed(1) });
      lines.push(`    RING     ${g.cls} white t${pc('t')} b${pc('b')} l${pc('l')} r${pc('r')} %  ring ${ringBox.map((v) => v.toFixed(0)).join(',')}  to safe edge ${safe.toFixed(1)} px`);
      if (min < 90) { bad++; lines.push(`    FAILRING ${g.cls} only ${min}% of one side is white`); }
    }
    await p.close();
  }
  fs.writeFileSync(root + '/tools/audit-rings.json', JSON.stringify(rings, null, 1));
  console.log(lines.join('\n')); console.log(`\n${files.length} pages, ${bad} findings`); await b.close(); process.exit(bad ? 1 : 0);
})();
