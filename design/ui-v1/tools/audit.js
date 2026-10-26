// node tools/audit.js [--quiet] [page ...]   (NODE_PATH=$(npm root -g))
// Per-mock checks, run on every tv/ and player/ page:
//   focus   one focus ring per screen (HUD overlays with none are listed, not failed)
//   nodes   UI node count (art SVG excluded)
//   banned  filter / backdrop-filter
//   small   text below 14 px that is not a 12 px badge (caps, <= 5 chars)
//   OVERLAP two text boxes from unrelated elements intersect (> 2 px both ways); text over the skewed slab polygon
//   CLIP    text cut by an overflow:hidden ancestor (not ellipsised), or a focus ring clipped by a clipping ancestor
//   SAFE    text or focus ring outside the 5 % safe area (48 / 27 px); anything inside .rail (peek rows) or .bleed is exempt
//   CONTRAST text under 4.5:1 on a flat composited background (gradients skipped)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const root = path.resolve(__dirname, '..'); const b = await chromium.launch();
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--')); const quiet = process.argv.includes('--quiet');
  const files = (args.length ? args : [...fs.readdirSync(root + '/tv').map((f) => 'tv/' + f), ...fs.readdirSync(root + '/player').map((f) => 'player/' + f)]).filter((f) => f.endsWith('.html'));
  let bad = 0; const lines = [];
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 } });
    p.on('pageerror', (e) => lines.push(`${f}  PAGEERROR ${e.message}`));
    await p.goto('file://' + root + '/' + f); await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(() => {
      const SAFE = { l: 48, r: 912, t: 27, b: 513 }, TOL = 1.5;
      const sel = '.f,.f-ring,.f-in,.lift,.nv-row.f,.field.ring,.vb.f,.thumbf';
      const focusEls = [...document.querySelectorAll(sel)];
      const all = document.querySelectorAll('.screen *').length, art = document.querySelectorAll('.art-svg, .art-svg *').length;
      const small = [], banned = [];
      const issues = { overlap: [], clip: [], safe: [], contrast: [] };
      const short = (e) => (e.className && e.className.baseVal === undefined ? '.' + String(e.className).trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase());
      // ---- text boxes: one Range rect per text-bearing element (direct text nodes only)
      const texts = [];
      for (const e of document.querySelectorAll('.screen *')) {
        if (e.closest('svg') || e.closest('.art') && !e.closest('.noart')) continue;
        const cs = getComputedStyle(e);
        if (cs.filter !== 'none' || cs.backdropFilter !== 'none') banned.push(e.className);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        let has = false; const rg = document.createRange();
        for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); has = true; }
        if (!has) continue;
        let rects = [...rg.getClientRects()].filter((q) => q.width > 1 && q.height > 1);
        if (cs.getPropertyValue('-webkit-line-clamp') !== 'none') rects = [e.getBoundingClientRect()];
        if (!rects.length) continue;
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of rects) { x0 = Math.min(x0, q.left); y0 = Math.min(y0, q.top); x1 = Math.max(x1, q.right); y1 = Math.max(y1, q.bottom); }
        // ellipsised text: what is on screen is the part inside its own box
        if (cs.textOverflow === 'ellipsis' && cs.overflow !== 'visible' && cs.display !== 'flex' && cs.display !== 'inline-flex') { const q = e.getBoundingClientRect(); x1 = Math.min(x1, q.right); x0 = Math.max(x0, q.left); }
        const fs = parseFloat(cs.fontSize);
        const txt = e.textContent.trim().replace(/\s+/g, ' ');
        if (fs < 14 && !(fs >= 11.5 && txt.length <= 5)) small.push(fs + ':' + txt.slice(0, 14));
        // occluded text (under a sheet, scrim or menu) is not on screen: skip it for every check
        const hit = (x, y) => { const h = document.elementFromPoint(Math.min(959, Math.max(0, x)), Math.min(539, Math.max(0, y))); return !h || e.contains(h) || h.contains(e) && !h.matches('.scrim,.sheet,.menu,.ctxmenu,.nv-panel,.nv-chip,.nv-card,.nv-zap'); };
        const cy = (y0 + y1) / 2, w = x1 - x0;
        if (!(hit(x0 + 2, cy) || hit(x0 + w / 2, cy) || hit(x1 - 2, cy))) continue;
        texts.push({ e, cs, x0, y0, x1, y1, txt: txt.slice(0, 22), fs });
      }
      // text under a scrim is the underlay of a modal sheet or menu: it was checked on the base page, so it is out of scope here
      const MODAL = '.menu,.sheet,.ctxmenu,.nv-panel,.nv-card,.nv-chip,.nv-zap';
      if (document.querySelector('.scrim')) texts.splice(0, texts.length, ...texts.filter((t) => t.e.closest(MODAL)));
      // ---- overlap between unrelated text boxes
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i], c = texts[j];
        if (a.e.contains(c.e) || c.e.contains(a.e)) continue;
        const ox = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0), oy = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
        if (ox > 2 && oy > 2) issues.overlap.push(`"${a.txt}" x "${c.txt}" ${ox.toFixed(0)}x${oy.toFixed(0)}`);
      }
      // ---- text against component boxes: text that is not inside a box must not touch it; text inside a box must not leave it
      const BOXES = '.pillbtn,.btn,.btn2,.chip,.tag,.logo,.team,.shield,.kbd,.toast,.srow,.rrow,.lr,.nv-row,.state,.card,.vb,.cnt,.sfield,.field,.g-cell,.hc,.gc,.wc,.menu,.sheet,.ctxmenu,.nv-card,.nv-chip,.bubble';
      const hasScrim = !!document.querySelector('.scrim');
      const boxEls = [...document.querySelectorAll(BOXES)].filter((b) => (!hasScrim || b.closest(MODAL)) && !b.closest('.art') && !(b.closest('.vid')) && ((b) => { return true; })(b)).filter((b) => { const q = b.getBoundingClientRect(); return q.width > 8 && q.height > 8 && getComputedStyle(b).visibility !== 'hidden'; });
      for (const t of texts) {
        for (const b of boxEls) {
          const q = b.getBoundingClientRect();
          const inside = b.contains(t.e);
          if (inside) {
            if (b.matches('.sheet,.menu,.card,.state,.g-cell')) continue;                       // containers that scroll or clip on purpose
            if (t.x0 < q.left - 2 || t.x1 > q.right + 2 || t.y0 < q.top - 2 || t.y1 > q.bottom + 2) issues.clip.push(`text "${t.txt}" escapes ${short(b)}`);
          } else {
            const ox = Math.min(t.x1, q.right) - Math.max(t.x0, q.left), oy = Math.min(t.y1, q.bottom) - Math.max(t.y0, q.top);
            if (ox > 2 && oy > 2 && !t.e.contains(b)) issues.overlap.push(`"${t.txt}" touches ${short(b)}`);
          }
        }
      }
      // ---- text over the skewed slab polygon
      const polys = [];
      for (const s of document.querySelectorAll('.slab,.slabline,.l-slab,.l-slabline')) {
        const r0 = s.getBoundingClientRect(); const cs = getComputedStyle(s); if (cs.display === 'none') continue;
        const m = new DOMMatrixReadOnly(cs.transform === 'none' ? undefined : cs.transform);
        const w = s.offsetWidth, h = s.offsetHeight; if (!w || !h) continue;
        const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
        const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => { const q = m.transformPoint({ x, y }); return [cx + q.x, cy + q.y]; });
        polys.push(pts);
      }
      const inPoly = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c; } return c; };
      for (const s of document.querySelectorAll('.slabbox')) {
        const q = s.getBoundingClientRect(), sk = parseFloat(getComputedStyle(s).getPropertyValue('--sk')) || 0;
        polys.push([[q.left + sk, q.top], [q.right, q.top], [q.right, q.bottom], [q.left - sk, q.bottom]]);
      }
      if (polys.length) for (const t of texts) {
        if (t.e.closest('.slab,.slabline,.slabcontent,.slabbox,.l-slab')) continue;
        const pts = [[t.x0, t.y0], [t.x1, t.y0], [t.x0, t.y1], [t.x1, t.y1], [(t.x0 + t.x1) / 2, (t.y0 + t.y1) / 2]];
        if (polys.some((poly) => pts.some((pt) => inPoly(pt, poly)))) issues.overlap.push(`"${t.txt}" on slab`);
      }
      // ---- clipping of text and focus rings by overflow ancestors
      const clipper = (e) => { const out = []; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a); if (o.overflow !== 'visible' || o.overflowX !== 'visible') out.push(a); } return out; };
      for (const t of texts) {
        const sty = t.cs;
        for (const a of clipper(t.e)) {
          const q = a.getBoundingClientRect(); const bs = getComputedStyle(a);
          const cl = { l: q.left + parseFloat(bs.borderLeftWidth), r: q.right - parseFloat(bs.borderRightWidth), t: q.top + parseFloat(bs.borderTopWidth), b: q.bottom - parseFloat(bs.borderBottomWidth) };
          const cut = t.x0 < cl.l - TOL || t.x1 > cl.r + TOL || t.y0 < cl.t - TOL || t.y1 > cl.b + TOL;
          if (!cut) continue;
          if (a.classList.contains('screen') || a.closest('.rail')) continue;       // screen edge / peek rows
          // ellipsised on purpose: the element (or the clipping ancestor) is a block with text-overflow and no flex parent in between
          const ell = (el) => getComputedStyle(el).textOverflow === 'ellipsis' && getComputedStyle(el).display !== 'flex' && getComputedStyle(el).display !== 'inline-flex';
          if (ell(t.e) && t.e.scrollWidth > t.e.clientWidth) continue;
          if (sty.getPropertyValue('-webkit-line-clamp') !== 'none') continue;
          if (a.scrollWidth <= a.clientWidth + 1 && a.scrollHeight <= a.clientHeight + 1 && !(t.y1 > cl.b + TOL || t.y0 < cl.t - TOL || t.x1 > cl.r + TOL || t.x0 < cl.l - TOL)) continue;
          issues.clip.push(`text "${t.txt}" cut by ${short(a)}`); break;
        }
        if (!t.e.closest('.rail') && !t.e.closest('.bleed') && !t.e.closest('.hintbar,.nv-hint,.scrim') ) {
          if (t.x0 < SAFE.l - TOL || t.x1 > SAFE.r + TOL || t.y0 < SAFE.t - TOL || t.y1 > SAFE.b + TOL) issues.safe.push(`text "${t.txt}" at ${t.x0.toFixed(0)},${t.y0.toFixed(0)}-${t.x1.toFixed(0)},${t.y1.toFixed(0)}`);
        } else if (t.e.closest('.hintbar,.nv-hint')) {
          if (t.y1 > SAFE.b + TOL || t.x0 < SAFE.l - TOL || t.x1 > SAFE.r + TOL) issues.safe.push(`hint "${t.txt}" y${t.y1.toFixed(0)}`);
        }
      }
      for (const fe of focusEls) {
        const q = fe.getBoundingClientRect(); const cs = getComputedStyle(fe);
        const ringOut = cs.boxShadow.includes('inset') || fe.classList.contains('f-in') ? 0 : 5;
        const ring = { l: q.left - ringOut, r: q.right + ringOut, t: q.top - ringOut, b: q.bottom + ringOut };
        for (const a of clipper(fe)) {
          if (a.classList.contains('screen')) continue;
          const aq = a.getBoundingClientRect();
          if (ring.l < aq.left - 0.5 || ring.r > aq.right + 0.5 || ring.t < aq.top - 0.5 || ring.b > aq.bottom + 0.5) { issues.clip.push(`focus ring of ${short(fe)} clipped by ${short(a)} (${Math.max(aq.left - ring.l, ring.r - aq.right, aq.top - ring.t, ring.b - aq.bottom).toFixed(0)} px)`); break; }
        }
        if (!fe.closest('.rail') && !fe.closest('.bleed') && !fe.closest('.hintbar,.nv-hint') && (ring.l < SAFE.l - 6 || ring.r > SAFE.r + 6 || ring.t < SAFE.t - 6 || ring.b > SAFE.b + 6)) issues.safe.push(`focus ${short(fe)} ring ${ring.l.toFixed(0)},${ring.t.toFixed(0)}-${ring.r.toFixed(0)},${ring.b.toFixed(0)}`);
      }
      // ---- contrast on flat backgrounds
      const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] == null || isNaN(v[3]) ? 1 : v[3] }; };
      const lum = ({ r, g, b }) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      // ---- v1.2: edge of the screen. Text in a peeking rail must be whole and end by y 520 (inside the fade), never sliced by the bottom edge
      for (const t of texts) {
        if (!t.e.closest('.rail.peek')) { if (t.e.closest('.rail') && (t.y1 > 540.5 || (t.y0 < 540 && t.y1 > 540))) issues.safe.push(`rail text "${t.txt}" sliced by the bottom edge`); continue; }
        if (t.y1 > 540.5 || (t.y0 < 540 && t.y1 > 521)) issues.safe.push(`peek text "${t.txt}" sliced or in the edge margin (y ${t.y0.toFixed(0)}-${t.y1.toFixed(0)})`);
        if (t.x0 < 0 && t.x1 > 0 || t.x0 < 960 && t.x1 > 960.5 && !t.e.closest('.rail')) issues.safe.push(`text "${t.txt}" sliced by the side edge`);
      }
      // ---- v1.2: a focus ring must clear its neighbours (ring = 5 px outside the scaled box, plus 2 px of air)
      const NEIGH = '.btn,.btn2,.chip,.pillbtn,.pc .box,.hc,.gc,.wc,.ep .th,.lr,.arow,.srow,.rrow,.key,.vb,.field,.sfield,.cnt,.tag';
      for (const fe of focusEls) {
        if (fe.classList.contains('f-in') || fe.matches('.tab,.thumbf,.nv-row,.avatar')) continue;
        const q = fe.getBoundingClientRect(); const ring = { l: q.left - 7, r: q.right + 7, t: q.top - 7, b: q.bottom + 7 };
        const host = fe.closest('.pc,.ep') || fe;
        for (const n of document.querySelectorAll(NEIGH)) {
          if (n === fe || fe.contains(n) || n.contains(fe) || host.contains(n)) continue;
          const FLOAT = '.ctxmenu,.menu,.sheet,.nv-panel,.nv-card'; const fc = fe.closest(FLOAT); if (fc && !fc.contains(n)) continue;
          if (fe.matches('.lr,.arow,.srow,.rrow') && n.matches('.lr,.arow,.srow,.rrow')) continue;   // stacked list rows share edges by design
          if (document.querySelector('.scrim') && !n.closest(MODAL) && fe.closest(MODAL)) continue;
          if (n.closest('.nv-panel,.vid') && !fe.closest('.nv-panel')) continue;
          const o = n.getBoundingClientRect();
          if (o.width < 8 || o.height < 8) continue;
          const ox = Math.min(ring.r, o.right) - Math.max(ring.l, o.left), oy = Math.min(ring.b, o.bottom) - Math.max(ring.t, o.top);
          if (ox > 0 && oy > 0) issues.overlap.push(`focus ring of ${short(fe)} touches ${short(n)} (${Math.min(ox, oy).toFixed(1)} px)`);
        }
      }
      // ---- v1.2: team colour. 8 px from any LIVE pill, never touching a focus ring; text on a plate passes 4.5:1; crest text clears its disc
      const plateEls = [...document.querySelectorAll('.mt .side,.tedge')].filter((e) => !document.querySelector('.scrim') || e.closest(MODAL));
      for (const pe of plateEls) {
        const q = pe.getBoundingClientRect();
        for (const lv of document.querySelectorAll('.a-live')) {
          const o = lv.getBoundingClientRect(); if (o.width < 4) continue;
          const dx = Math.max(o.left - q.right, q.left - o.right, 0), dy = Math.max(o.top - q.bottom, q.top - o.bottom, 0);
          if (Math.hypot(dx, dy) < 8) issues.overlap.push(`team colour ${short(pe)} is ${Math.hypot(dx, dy).toFixed(1)} px from a LIVE pill (min 8)`);
        }
        for (const fe of focusEls) {
          if (fe.contains(pe)) continue; const o = fe.getBoundingClientRect();
          if (Math.min(q.right, o.right + 5) - Math.max(q.left, o.left - 5) > 0 && Math.min(q.bottom, o.bottom + 5) - Math.max(q.top, o.top - 5) > 0) issues.overlap.push(`team colour ${short(pe)} touches the focus ring of ${short(fe)}`);
        }
      }
      for (const sd of document.querySelectorAll('.mt .side')) {
        const cs = getComputedStyle(sd), P = parse('rgb(' + cs.getPropertyValue('--tp').trim().match(/[0-9a-f]{2}/gi).map((h) => parseInt(h, 16)).join(',') + ')'), C = parse('rgb(' + cs.getPropertyValue('--tc').trim().match(/[0-9a-f]{2}/gi).map((h) => parseInt(h, 16)).join(',') + ')');
        const L1 = lum(P), L2 = lum(C), cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        if (cr < 4.5) issues.contrast.push(`team plate text ${cr.toFixed(2)}:1`);
      }
      for (const ci of document.querySelectorAll('.team i')) {
        const rg = document.createRange(); rg.selectNodeContents(ci); const tr = rg.getBoundingClientRect(), cr = ci.getBoundingClientRect();
        if (tr.width > cr.width - 6) issues.clip.push(`crest text "${ci.textContent}" has ${((cr.width - tr.width) / 2).toFixed(1)} px of clearance (min 3)`);
      }
      for (const t of texts) {
        if (t.e.closest('.noart,.tag,.vid,.nv-sub,.art,.mt .side,.slabbox')) continue;
        const fg0 = parse(t.cs.color); if (!fg0) continue;
        let stack = [], skip = false;
        for (let a = t.e; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.backgroundImage !== 'none') { skip = true; break; } const c = parse(s.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 0.999) break; } }
        if (skip) continue;
        let bg = { r: 21, g: 19, b: 29 }; for (let i = stack.length - 1; i >= 0; i--) { const c = stack[i]; bg = { r: bg.r * (1 - c.a) + c.r * c.a, g: bg.g * (1 - c.a) + c.g * c.a, b: bg.b * (1 - c.a) + c.b * c.a }; }
        const fg = { r: fg0.r * fg0.a + bg.r * (1 - fg0.a), g: fg0.g * fg0.a + bg.g * (1 - fg0.a), b: fg0.b * fg0.a + bg.b * (1 - fg0.a) };
        const L1 = lum(fg), L2 = lum(bg); const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        if (cr < 4.5 && !(t.cs.opacity < 1) && !t.e.closest('.dis,.chip.dis,.nv-row.dis')) issues.contrast.push(`"${t.txt}" ${cr.toFixed(2)}:1`);
      }
      return { focus: focusEls.length, ui: all - art, small: [...new Set(small)], banned: banned.length, issues };
    });
    const iss = r.issues; const n = iss.overlap.length + iss.clip.length + iss.safe.length + iss.contrast.length + (r.banned ? 1 : 0) + r.small.length;
    bad += n;
    const fl = f.padEnd(34) + ' focus ' + r.focus + ' nodes ' + String(r.ui).padStart(4) + (n ? '  FAIL ' + n : '  ok');
    lines.push(fl);
    if (n || !quiet) for (const k of ['overlap', 'clip', 'safe', 'contrast']) for (const m of [...new Set(iss[k])]) lines.push(`    ${k.toUpperCase().padEnd(8)} ${m}`);
    if (r.small.length) lines.push('    SMALL    ' + r.small.join(' | '));
    if (r.banned) lines.push('    BANNED   ' + r.banned);
    await p.close();
  }
  console.log(lines.join('\n')); console.log(`\n${files.length} pages, ${bad} findings`); await b.close(); process.exit(bad ? 1 : 0);
})();
