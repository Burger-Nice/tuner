// design/ui-v1/skip: the subtitles audit (../subtitles/tools/audit.js) run unchanged on the skip mocks: one ring, OVERLAP, CLIP, SAFE, CONTRAST, RING. node tools/audit.js --quiet
// node tools/audit.js [--quiet] [--inject-st] [page ...]
// design/ui-v1/subtitles: the diagnosis audit plus the subtitles checks ONE, TICK, BEST, STEP, SOURCE, JARGON, CLOCK, HUE, and in v1.1 RINGTEXT, RAILFOCUS, TICKGAP, and in v1.2 SIDE (SPEC 12).
// node tools/audit.js --quiet --inject-v11   puts the v1.1 fault back (two texts in the pill-row slot), to prove SIDE fires.
// node tools/audit.js --quiet --inject-v10   puts the v1.0 faults back, to prove the v1.1 checks fire.
// design/ui-v1/catchup/tools/audit.js (itself from nba-pages), run on the diagnosis mocks. Originally adapted to the catch-up mocks (cu- classes and the player's timeline), plus SPOILER:
// on a mock marked <meta name="shield" content="unseen">, no visible score (\d{2,3}–\d{2,3}), remaining time (−m:ss) or
// "OT" may show outside an element marked data-other (another game, shown by the My team rule, or a seen one) or
// data-moment (the score as aired at the playback moment, SPEC 7). --inject adds a score, a remaining time and a focused
// Reveal to every shield mock, to prove the checks fire.
// From the nba-pages audit: RING, the focus ring read
// back from the 2x screenshot (white pixels sampled all round it, so a ring hidden under a band, a sheet or a clip fails).
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
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--')); const quiet = process.argv.includes('--quiet'), inject = process.argv.includes('--inject'), injectV10 = process.argv.includes('--inject-v10');
  const files = (args.length ? args : JSON.parse(fs.readFileSync(root + '/tools/pages.json', 'utf8')).map((p) => p.file)).filter((f) => f.endsWith('.html'));
  const rings = [];
  let bad = 0; const lines = [];
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
    p.on('pageerror', (e) => lines.push(`${f}  PAGEERROR ${e.message}`));
    await p.goto('file://' + root + '/' + f); await p.evaluate(() => document.fonts.ready);
    // --inject-v10: put back the two v1.0 CSS bugs the review found (the 560 px shield card, the clipped Sync chip) and the
    // "Live is in Q2" line, to prove CONTAIN and SPOILER catch them
    if (injectV10) await p.evaluate(() => {
      document.head.insertAdjacentHTML('beforeend', '<style>.state.big.cu-state{width:560px}.nv-tabs.cu-t{gap:6px}.nv-tabs.cu-t span,.nv-tabs.cu-t span.act{padding:0 12px}</style>');
      const cap = document.querySelector('.hero-btns .clamp2'); if (cap && /Until/.test(cap.textContent)) cap.innerHTML = 'NBA League Pass 4<br>Kept until Thu 29 Oct · late';   // the v1.1 caption
      const pos = document.querySelector('.cu-pos span'); if (pos && document.querySelector('meta[name="shield"]')) pos.textContent = 'Live is in Q2';
    });
    if (injectV10) await p.evaluate(() => { const c = document.querySelector('.cu-check'); if (!c) return; [...c.querySelectorAll('.btn2')].filter((b) => /Not sure/.test(b.textContent)).forEach((b) => b.remove()); });   // the v1.2 card had no Not sure
    // --inject-v11: put back the v1.0 faults the review found, to prove the diagnosis checks fire
    if (process.argv.includes('--inject-v11')) await p.evaluate(() => {
      const s = document.querySelector('.screen');
      s.insertAdjacentHTML('beforeend', '<div class="nv-chip dg-chip" style="width:440px;max-width:440px;bottom:300px"><div class="grow"><b>HEVC at 100 fps</b><span>US: ESPN HD</span></div><span class="kbd">Hold OK</span><span>Details</span></div>');
      const b = document.querySelector('i.bang'); if (b) b.remove();
      const cut = document.querySelector('.dg-l.cut'); if (cut) { const n = cut.nextElementSibling && cut.nextElementSibling.nextElementSibling && cut.nextElementSibling.nextElementSibling.nextElementSibling; if (n && n.classList.contains('dg-n')) { n.classList.replace('off', 'ok'); n.setAttribute('data-proof', 'x'); } }
    });
    // --inject-v12: put back the v1.1 faults review 2 found (ink dot, "◀ Details" on a chip, the panel opening on a switch)
    if (process.argv.includes('--inject-v12')) await p.evaluate(() => {
      document.querySelectorAll('i.bang svg circle').forEach((c) => { c.style.fill = '#14101F'; });
      const ln = document.querySelector('.dg-card .dg-head span'); if (ln) ln.textContent += ' Restarting the router usually helps, and so does waiting a little.';
      if (document.querySelector('.nv-chip')) for (const k of document.querySelectorAll('.nv-hint .kbd')) if (k.textContent === '◀ ▼') k.textContent = '◀';
      const pr = document.querySelectorAll('.dg-panel .nv-row'); if (pr.length > 1) { pr.forEach((x) => x.classList.remove('f')); pr[0].classList.add('f'); }
    });
    // --inject-v10: put back the v1.0 faults review 1 found, to prove the v1.1 checks fire: the source line under the pills
    // (More like this pushed to 392 / 426), the sheet heading with no air, the tick tight and low on its line
    if (process.argv.includes('--inject-v10')) await p.evaluate(() => {
      document.head.insertAdjacentHTML('beforeend', '<style>.sheet.st-sheet .sec{margin-bottom:0}.lr.st-two .b .st-tk,.nv-row .b .st-tk{margin-right:0;vertical-align:-6px}</style>');
      const rt = document.querySelector('.rowtitle'), rl = rt && rt.nextElementSibling; if (rt && rl && rl.classList.contains('rail')) { rt.style.top = '392px'; rl.style.top = '426px'; }
    });
    // --inject-v11: put back the v1.1 fault review 2 found: the slot with two texts (time left + the subtitles line)
    if (process.argv.includes('--inject-v11')) await p.evaluate(() => { const sd = document.querySelector('.st-side'); if (sd) sd.insertAdjacentHTML('beforeend', '<span class="dot-sep"></span>1 h 12 min left<span class="dot-sep"></span>OpenSubtitles isn\'t answering · trying again at 21:31'); });
    // --inject-st: put in one fault per subtitles check, to prove each fires (SPEC 12)
    if (process.argv.includes('--inject-st')) await p.evaluate(() => {
      const s = document.querySelector('.screen');
      s.insertAdjacentHTML('beforeend', '<div style="position:absolute;left:300px;top:200px;z-index:40;font:500 16px Inter;color:#F3EFE6;background:#1E1B28">2.2 s later · HEVC · 9:30 pm</div><div style="position:absolute;left:300px;top:230px;z-index:40;font:500 16px Inter;color:#F5B112;background:#1E1B28">Amber text</div>');
      const n = document.querySelector('[data-q="named"]'); if (n) n.insertAdjacentHTML('afterbegin', '<span class="st-tk"></span>');
      const r = document.querySelectorAll('[data-rank]'); if (r.length > 1) r[1].insertAdjacentHTML('beforeend', '<span class="tag q">Best</span>');
      const sh = document.querySelector('.nv-panel,.sheet'); if (sh) sh.innerHTML = sh.innerHTML.replace(/OpenSubtitles/g, 'the web') + '<div class="b">Timing fixed</div>';
      const f = document.querySelector('.nv-row:not(.f):not(.dis),.lr:not(.f-ring)'); if (f) f.classList.add(f.classList.contains('nv-row') ? 'f' : 'f-ring');
    });
    if (inject) await p.evaluate(() => { if (!document.querySelector('meta[name="shield"]')) return; const s = document.querySelector('.screen'); s.insertAdjacentHTML('beforeend', '<div style="position:absolute;left:300px;top:30px;font:500 16px Inter;color:#F3EFE6;z-index:30">Final 118–112 · −12:40</div><div style="position:absolute;left:300px;top:52px;font:500 16px Inter;color:#F3EFE6;z-index:30">Grizzlies vs Jazz 2026-10-26</div><div style="position:absolute;left:300px;top:74px;font:500 16px Inter;color:#F3EFE6;z-index:30">Jazz 118:112</div><span class="btn2 f" style="position:absolute;left:600px;top:470px;z-index:30">Reveal score</span>'); });
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
      const MODAL = '.menu,.sheet,.ctxmenu,.nv-panel,.nv-card,.nv-chip,.nv-zap,.nb-read';
      if (document.querySelector('.scrim')) texts.splice(0, texts.length, ...texts.filter((t) => t.e.closest(MODAL)));
      // ---- overlap between unrelated text boxes
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i], c = texts[j];
        if (a.e.contains(c.e) || c.e.contains(a.e)) continue;
        if (!!a.e.closest('.ctxmenu') !== !!c.e.closest('.ctxmenu')) continue;   // the hold-OK menu floats over the page on purpose (no scrim, as app ui.js contextMenu)
        const ox = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0), oy = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
        if (ox > 2 && oy > 2) issues.overlap.push(`"${a.txt}" x "${c.txt}" ${ox.toFixed(0)}x${oy.toFixed(0)}`);
      }
      // ---- text against component boxes: text that is not inside a box must not touch it; text inside a box must not leave it
      const BOXES = '.cu-badge,.cu-day,.cu-nowr,.nb-tr,.nb-gt,.nb-rk,.nb-nc,.nb-nrow,.nb-cat,.pillbtn,.btn,.btn2,.chip,.tag,.logo,.team,.shield,.kbd,.toast,.srow,.rrow,.lr,.nv-row,.state,.card,.vb,.cnt,.sfield,.field,.g-cell,.hc,.gc,.wc,.menu,.sheet,.ctxmenu,.nv-card,.nv-chip,.bubble';
      const hasScrim = !!document.querySelector('.scrim');
      const boxEls = [...document.querySelectorAll(BOXES)].filter((b) => (!hasScrim || b.closest(MODAL)) && !b.closest('.art') && !(b.closest('.vid')) && ((b) => { return true; })(b)).filter((b) => { const q = b.getBoundingClientRect(); return q.width > 8 && q.height > 8 && getComputedStyle(b).visibility !== 'hidden'; });
      for (const t of texts) {
        for (const b of boxEls) {
          const q = b.getBoundingClientRect();
          const inside = b.contains(t.e);
          if (inside) {
            if (b.matches('.sheet,.menu,.card,.state,.g-cell,.nb-read')) continue;                       // containers that scroll or clip on purpose
            if (t.x0 < q.left - 2 || t.x1 > q.right + 2 || t.y0 < q.top - 2 || t.y1 > q.bottom + 2) issues.clip.push(`text "${t.txt}" escapes ${short(b)}`);
          } else {
            const ox = Math.min(t.x1, q.right) - Math.max(t.x0, q.left), oy = Math.min(t.y1, q.bottom) - Math.max(t.y0, q.top);
            if (ox > 2 && oy > 2 && !t.e.contains(b) && !(b.closest('.ctxmenu') && !t.e.closest('.ctxmenu')) && !(t.e.closest('.ctxmenu') && !b.closest('.ctxmenu'))) issues.overlap.push(`"${t.txt}" touches ${short(b)}`);
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
        if (t.e.closest(MODAL) && document.querySelector('.scrim')) continue;   // a sheet over a scrim covers the slab (catch-up)
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
          if (a.classList.contains('screen') || a.closest('.rail') || a.classList.contains('nb-scroll')) continue;       // screen edge / peek rows / the reader's faded scroll viewport
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
      // ---- v1.1 (review): floating boxes stay inside y 27-513 and x 48-912; Reveal is never the focused default; no text in a tile peeking past x 912
      for (const m of document.querySelectorAll('.ctxmenu,.menu,.sheet,.nb-read,.cu-state,.cu-tbar,.nv-panel,.nv-card')) { const q = m.getBoundingClientRect(); if (q.bottom > 513.5 || q.top < 26.5 || q.left < 47.5 || q.right > 912.5) issues.safe.push(`${short(m)} box ${q.left.toFixed(0)},${q.top.toFixed(1)}-${q.right.toFixed(0)},${q.bottom.toFixed(1)} crosses the safe area`); }
      for (const fe of focusEls) if (/reveal/i.test(fe.textContent)) issues.overlap.push(`SHIELD: the focused element is a Reveal ("${fe.textContent.trim().slice(0, 30)}")`);
      for (const t of texts) if (t.e.closest('.nb-rail') && t.x1 > 913) issues.safe.push(`peek text "${t.txt}" past x 912`);
      // ---- catch-up v1.1: CONTAIN, a control poking out of its card, panel or bar (review M11: the v1.0 audit passed a
      // 560 px card with its buttons outside it, and a Sync chip cut by its panel)
      const CONT = '.state,.nv-panel,.nv-card,.cu-tbar,.sheet,.menu,.ctxmenu,.hero-plate,.gc,.nb-gt,.hc,.nb-head,.gd-head,.g-cell,.g-ch,.nv-tabs';
      for (const c of document.querySelectorAll('.btn,.btn2,.vb,.chip,.lr,.nv-row,.nv-tabs>span,.tag,.cu-badge,.a-live,.pillbtn')) {
        const box = c.parentElement && c.parentElement.closest(CONT); if (!box || getComputedStyle(c).display === 'none') continue;
        const q = c.getBoundingClientRect(), b = box.getBoundingClientRect(), bs = getComputedStyle(box);
        const inner = { l: b.left + parseFloat(bs.borderLeftWidth), r: b.right - parseFloat(bs.borderRightWidth), t: b.top + parseFloat(bs.borderTopWidth), b: b.bottom - parseFloat(bs.borderBottomWidth) };
        const sc = c.classList.contains('f') ? (q.width - c.offsetWidth) / 2 : 0;   // a lifted control may grow past its row by its own lift
        const out = Math.max(inner.l - q.left - sc, q.right - inner.r - sc, inner.t - q.top - sc, q.bottom - inner.b - sc);
        if (out > 1) issues.clip.push(`CONTAIN: ${short(c)} "${(c.textContent || '').trim().slice(0, 24)}" pokes ${out.toFixed(0)} px out of ${short(box)}`);
      }
      // ---- catch-up v1.3: CHECK, the first-replay card (review 3, M1): it shows what it plays (title, time, description),
      // always offers a way out that stores nothing ("Not sure"), and never uses a sports channel (it must not show a score)
      for (const c of document.querySelectorAll('.cu-check')) {
        const t = c.textContent;
        if (!/Not sure/.test(t)) issues.overlap.push('CHECK: the first-replay card has no "Not sure"');
        if (!c.querySelector('.cu-prog .a') || !c.querySelector('.cu-prog .b') || !c.querySelector('.cu-prog .c')) issues.overlap.push('CHECK: the first-replay card must show the programme title, time and description');
        if (/sport|nba|espn|league pass|tnt|dazn/i.test(c.querySelector('.cu-prog .b')?.textContent || '')) issues.overlap.push('CHECK: the first-replay card uses a sports channel');
      }
      // ---- catch-up v1.2: TRUNC, a two-line caption cut by its clamp (the hero caption "Kept until Thu 29 Oct ·…")
      for (const e of document.querySelectorAll('.clamp2,.clamp3')) { if (e.closest('.rail,.art')) continue; if (e.scrollHeight > e.clientHeight + 1) issues.clip.push(`TRUNC: "${e.textContent.trim().slice(0, 30)}" is cut by its line clamp`); }
      // ---- catch-up: SPOILER on shield mocks (scores, remaining time, OT) outside data-other / data-moment
      if (document.querySelector('meta[name="shield"]')) {
        const vis = (e) => { for (let a = e; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; } return true; };
        const walker = document.createTreeWalker(document.querySelector('.screen'), NodeFilter.SHOW_TEXT);
        const runs = new Map();
        for (let n = walker.nextNode(); n; n = walker.nextNode()) { const host = n.parentElement.closest('[data-other],[data-moment]') ? null : n.parentElement.closest('.plate,.gc,.nb-gt,.x,div,span,b'); if (host && vis(n.parentElement)) runs.set(host, (runs.get(host) || '') + n.textContent); }
        for (const [host, txt0] of runs) {
          // dates are not scores (review S6): drop yyyy-mm-dd, dd.mm.yyyy, mm/dd and the like first
          // v1.2 (review 2, N2): a provider-style numeric date near the hidden game (ET date − 1 day on) beside a hidden team's name
          { const raw = txt0.replace(/\s+/g, ' '), et = document.querySelector('meta[name="hidden-et"]')?.content;
            if (et && /grizzlies|memphis|jazz|utah/i.test(raw)) for (const m of raw.matchAll(/\b(20\d\d)-(\d\d)-(\d\d)\b|\b(\d\d)\.(\d\d)\.(20\d\d)\b/g)) {
              const d = m[1] ? `${m[1]}-${m[2]}-${m[3]}` : `${m[6]}-${m[5]}-${m[4]}`;
              if (Date.parse(d) >= Date.parse(et) - 864e5) issues.overlap.push(`SPOILER: a provider title dated ${d}, around the hidden game ("${raw.trim().slice(0, 34)}")`);
            } }
          const txt = txt0.replace(/\s+/g, ' ').replace(/\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b(?=\s|$|·)/g, ' ');
          if (/\b\d{2,3}\s?[-–]\s?\d{2,3}\b/.test(txt) || /\b(6\d|[7-9]\d|1\d\d)\s?(:|—|–|-|\bto\b)\s?(6\d|[7-9]\d|1\d\d)\b/.test(txt)) issues.overlap.push(`SPOILER: a score "${txt.trim().slice(0, 30)}" on a shield mock`);
          if (/[−-]\d{1,2}:\d\d/.test(txt)) issues.overlap.push(`SPOILER: a remaining time "${txt.trim().slice(0, 30)}" on a shield mock`);
          if (/\bOT\b|\b\dOT\b|overtime/i.test(txt)) issues.overlap.push(`SPOILER: "OT" on a shield mock`);
          // v1.1 (review M3, M5, S9): the live state while you're behind, an end time, minutes left, a result word
          if (/\bLive is (in|at)\b|\blive (is )?in (Q\d|OT|half)/i.test(txt)) issues.overlap.push(`SPOILER: the live state "${txt.trim().slice(0, 30)}"`);
          if (/\bEnds at\b|\b\d+\s?(min|h \d+m) left\b/i.test(txt)) issues.overlap.push(`SPOILER: an end or a time left "${txt.trim().slice(0, 30)}"`);
          if ((/\bFinal\b(?! buzzer)/.test(txt) || /\b(won|beat|lost to|wins|swept)\b|\b[WL] \d/i.test(txt))) issues.overlap.push(`SPOILER: a result word "${txt.trim().slice(0, 30)}"`);
        }
        // the score plates of a game card: two numbers in separate spans
        for (const pl of document.querySelectorAll('.plate')) { if (pl.closest('[data-other],[data-moment]')) continue; if (pl.querySelectorAll('.score').length >= 2 && [...pl.querySelectorAll('.score')].every((x) => /^\d+$/.test(x.textContent.trim()))) issues.overlap.push('SPOILER: a score plate on a shield mock'); }
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
      const NEIGH = '.nb-gt,.nb-rk,.nb-nc,.nb-nrow,.nb-cat,.nb-lead,.btn,.btn2,.chip,.pillbtn,.pc .box,.hc,.gc,.wc,.ep .th,.lr,.arow,.srow,.rrow,.key,.vb,.field,.sfield,.cnt,.tag';
      for (const fe of focusEls) {
        if (fe.classList.contains('f-in') || fe.matches('.tab,.thumbf,.nv-row,.avatar')) continue;
        const q = fe.getBoundingClientRect(); const ring = { l: q.left - 7, r: q.right + 7, t: q.top - 7, b: q.bottom + 7 };
        const host = fe.closest('.pc,.ep') || fe;
        for (const n of document.querySelectorAll(NEIGH)) {
          if (n === fe || fe.contains(n) || n.contains(fe) || host.contains(n)) continue;
          const FLOAT = '.ctxmenu,.menu,.sheet,.nv-panel,.nv-card'; const fc = fe.closest(FLOAT); if (fc && !fc.contains(n)) continue;
          if (fe.matches('.lr,.arow,.srow,.rrow,.nb-cat,.nb-nrow') && n.matches('.lr,.arow,.srow,.rrow,.nb-cat,.nb-nrow')) continue;   // stacked list rows share edges by design
          if (document.querySelector('.scrim') && !n.closest(MODAL) && fe.closest(MODAL)) continue;
          if (n.closest('.nv-panel,.vid') && !fe.closest('.nv-panel')) continue;
          const o = n.getBoundingClientRect();
          if (o.width < 8 || o.height < 8) continue;
          const ox = Math.min(ring.r, o.right) - Math.max(ring.l, o.left), oy = Math.min(ring.b, o.bottom) - Math.max(ring.t, o.top);
          if (ox > 0 && oy > 0) issues.overlap.push(`focus ring of ${short(fe)} touches ${short(n)} (${Math.min(ox, oy).toFixed(1)} px)`);
        }
      }
      // ---- v1.2: team colour. 8 px from any LIVE pill, never touching a focus ring; text on a plate passes 4.5:1; crest text clears its disc
      const plateEls = [...document.querySelectorAll('.mt .side,.tedge,.nb-plate,.nb-lead .pl,.nb-pl .top')].filter((e) => !document.querySelector('.scrim') || e.closest(MODAL));
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
      for (const sd of document.querySelectorAll('.mt .side,.nb-plate')) {
        const cs = getComputedStyle(sd), P = parse('rgb(' + cs.getPropertyValue('--tp').trim().match(/[0-9a-f]{2}/gi).map((h) => parseInt(h, 16)).join(',') + ')'), C = parse('rgb(' + cs.getPropertyValue('--tc').trim().match(/[0-9a-f]{2}/gi).map((h) => parseInt(h, 16)).join(',') + ')');
        const L1 = lum(P), L2 = lum(C), cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        if (cr < 4.5) issues.contrast.push(`team plate text ${cr.toFixed(2)}:1`);
      }
      for (const ci of document.querySelectorAll('.team i')) {
        const rg = document.createRange(); rg.selectNodeContents(ci); const tr = rg.getBoundingClientRect(), cr = ci.getBoundingClientRect();
        if (tr.width > cr.width - 6) issues.clip.push(`crest text "${ci.textContent}" has ${((cr.width - tr.width) / 2).toFixed(1)} px of clearance (min 3)`);
      }
      for (const t of texts) {
        if (t.e.closest('.noart,.tag,.vid,.nv-sub,.art,.mt .side,.slabbox,.nb-plate,.nb-nc .tx,.nb-read .ph')) continue;
        const fg0 = parse(t.cs.color); if (!fg0) continue;
        let stack = [], skip = false;
        for (let a = t.e; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.backgroundImage !== 'none') { skip = true; break; } const c = parse(s.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 0.999) break; } }
        if (skip) continue;
        let bg = { r: 21, g: 19, b: 29 }; for (let i = stack.length - 1; i >= 0; i--) { const c = stack[i]; bg = { r: bg.r * (1 - c.a) + c.r * c.a, g: bg.g * (1 - c.a) + c.g * c.a, b: bg.b * (1 - c.a) + c.b * c.a }; }
        const fg = { r: fg0.r * fg0.a + bg.r * (1 - fg0.a), g: fg0.g * fg0.a + bg.g * (1 - fg0.a), b: fg0.b * fg0.a + bg.b * (1 - fg0.a) };
        const L1 = lum(fg), L2 = lum(bg); const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        if (cr < 4.5 && !(t.cs.opacity < 1) && !t.e.closest('.dis,.chip.dis,.nv-row.dis')) issues.contrast.push(`"${t.txt}" ${cr.toFixed(2)}:1`);
      }
      // ---- diagnosis v1.1 (REVIEW-independent.md): checks for the review points that can be read off a mock
      const DG = '.dg-card,.dg-panel,.nv-chip,.dg-sheet';
      // BADGE (S16): every problem node carries the "!" badge
      for (const c of document.querySelectorAll('.dg-n.bad>.dg-c,.dg-vn.bad>.dg-c')) if (!c.querySelector('i.bang')) issues.overlap.push('BADGE: a problem node without its "!" badge');
      // TICK (S6): a tick names the check that proved it; nothing past a cut link is ticked; past a slow problem link the
      // throughput nodes (Internet, Channel/Movie) are ticked only if measured directly (proof arrival / stream-bytes)
      for (const pth of document.querySelectorAll('.dg-path,.dg-vpath')) {
        const nodes = [...pth.querySelectorAll(':scope>.dg-n,:scope>.dg-vn')];
        const linkInto = (n, i) => { if (n.classList.contains('dg-vn')) { const m = [...n.classList].find((k) => k.startsWith('in-')); return m ? m.slice(3) : 'ok'; } const l = n.previousElementSibling; return l && l.classList.contains('dg-l') ? ([...l.classList].find((k) => k !== 'dg-l') || 'ok') : 'ok'; };
        let past = '';
        nodes.forEach((n, i) => {
          const lab = (n.querySelector('b') || {}).textContent || '', ok = n.classList.contains('ok'), pf = n.getAttribute('data-proof');
          if (ok && !pf) issues.overlap.push(`TICK: "${lab}" is ticked without a proof`);
          if (ok && past === 'cut') issues.overlap.push(`TICK: "${lab}" is ticked past a cut link`);
          if (ok && past === 'slow' && /Internet|Channel|Movie|Episode/.test(lab) && !/arrival|stream-bytes/.test(pf || '')) issues.overlap.push(`TICK: "${lab}" is ticked past the slow link without being measured`);
          const li = i ? linkInto(n, i) : 'ok';
          if (n.classList.contains('bad') && (li === 'cut' || li === 'slow') && !past) past = li;
        });
      }
      // CHIP (S12) and PANEL (UI-SPEC 7): the kit's sizes
      for (const c of document.querySelectorAll('.nv-chip')) if (c.getBoundingClientRect().width > 420.5) issues.safe.push(`CHIP: ${c.getBoundingClientRect().width.toFixed(0)} wide (max 420)`);
      for (const c of document.querySelectorAll('.nv-panel')) if (c.getBoundingClientRect().height > 453.5) issues.safe.push(`PANEL: ${c.getBoundingClientRect().height.toFixed(0)} tall (cap 453)`);
      for (const c of document.querySelectorAll(DG)) {
        const t = c.textContent.replace(/\s+/g, ' ');
        // JARGON (S17): no codec, format or protocol words on a diagnosis surface
        const j = t.match(/\b(HEVC|HLS|fps|bitrate|buffer\w*|dBm|codec|MPEG\S*|transport stream|AV1|H\.26\d|RSSI|DNS|timeout)\b/i); if (j) issues.overlap.push(`JARGON: "${j[0]}" on a diagnosis surface`);
        // PAIR (2.5): at most one pair of Mbps figures per card or chip
        if (c.matches('.dg-card,.nv-chip') && (t.match(/Mbps/g) || []).length > 2) issues.overlap.push(`PAIR: ${(t.match(/Mbps/g) || []).length} Mbps figures on one card`);
        if (/US:\s/.test(t)) issues.overlap.push('TITLE: a channel title with its "US:" prefix');
      }
      // ELLIPSIS (v1.1): a reading cut short on a panel or path row says less than it should
      for (const e of document.querySelectorAll('.nv-panel .a,.nv-panel .b,.dg-vn small,.dg-vn b,.dg-ver span,.dg-n small')) if (e.scrollWidth > e.clientWidth + 1) issues.clip.push(`ELLIPSIS: "${e.textContent.trim().slice(0, 30)}" is cut short`);
      // LINE (v1.2, 2.5): a stall card's title and its line are one line each
      for (const e of document.querySelectorAll('.dg-card .dg-head b,.dg-card .dg-head span,.nv-chip b,.nv-chip .grow span')) { const lh = parseFloat(getComputedStyle(e).lineHeight); if (e.getBoundingClientRect().height > lh * 1.5) issues.overlap.push(`LINE: "${e.textContent.trim().slice(0, 30)}" wraps to two lines`); }
      // CHIPKEYS (v1.2, N-M9): while a chip shows, Options keeps Sync first, so Details is ◀ ▼, never ◀ alone
      if (document.querySelector('.nv-chip')) for (const k of document.querySelectorAll('.nv-hint .kbd,.nv-chip .kbd')) if (k.textContent.trim() === '◀' && /Details/.test(k.parentElement.textContent)) issues.overlap.push('CHIPKEYS: a chip offers "◀ Details" (◀ OK OK is the Sync habit; it is ◀ ▼)');
      // PANELFOCUS (v1.2, N-M9): the Connection panel never opens on a feed or copy switch
      for (const r of document.querySelectorAll('.dg-panel .nv-row.f')) if (/Same game|Watch the|copy|feed/i.test(r.textContent)) issues.overlap.push(`PANELFOCUS: the panel opens on a switch ("${r.textContent.trim().slice(0, 24)}")`);
      // KEYS (S10): Hold OK is Last channel, always
      for (const k of document.querySelectorAll('.kbd')) if (/^Hold OK$/.test(k.textContent.trim())) { const nx = (k.nextSibling && k.nextSibling.textContent || '') + (k.nextElementSibling ? k.nextElementSibling.textContent : ''); if (!/^\s*Last/.test(nx)) issues.overlap.push(`KEYS: Hold OK bound to "${nx.trim().slice(0, 20)}" (it is Last channel)`); }
      // ---- subtitles v1.0 (SPEC 12): the checks for this design
      // ONE: one focus ring per screen (the timing strip and the chip are HUDs with none)
      if (focusEls.length > 1) issues.overlap.push(`ONE: ${focusEls.length} focus rings`);
      // TICK: a green tick only on something airglow checked; a named-only claim is dashed and has no tick
      for (const t of document.querySelectorAll('[data-q]')) {
        const k = t.getAttribute('data-q'), tick = !!t.querySelector('.st-tk');
        if (k === 'named' && (tick || !t.classList.contains('st-name'))) issues.overlap.push(`TICK: the named claim "${t.textContent.trim()}" looks checked`);
        if (k === 'checked' && !tick && !t.closest('.pc')) issues.overlap.push(`TICK: the checked "${t.textContent.trim().slice(0, 20)}" has no tick`);
      }
      // v1.1 RINGTEXT (review M7): a focus ring's full extent (5 px outside, 7 with its gap) must not cross any text that
      // isn't inside the focused element (a heading, a caption, a neighbour's label)
      for (const fe of focusEls) {
        const q = fe.getBoundingClientRect(), inset = getComputedStyle(fe).boxShadow.includes('inset') || fe.classList.contains('f-in');
        const g = inset ? 0 : 6, R = { l: q.left - g, r: q.right + g, t: q.top - g, b: q.bottom + g };
        const fl = fe.closest('.ctxmenu,.menu,.sheet,.nv-panel,.nv-card');
        for (const t of texts) {
          if (fe.contains(t.e) || t.e.contains(fe) || t.e.closest('.vid,.nv-hint,.art')) continue;
          if (fl && !fl.contains(t.e)) continue;
          if (!fl && t.e.closest('.ctxmenu,.menu,.sheet,.nv-panel,.nv-card')) continue;
          const ox = Math.min(R.r, t.x1) - Math.max(R.l, t.x0), oy = Math.min(R.b, t.y1) - Math.max(R.t, t.y0);
          if (ox > 1 && oy > 1) issues.overlap.push(`RINGTEXT: the ring of ${short(fe)} crosses "${t.txt}" (${Math.min(ox, oy).toFixed(1)} px)`);
        }
      }
      // v1.1 RAILFOCUS (review M4): a rail that takes focus (not a .peek row) keeps every card inside the safe line when
      // focused: card bottom <= 513, ring <= 519 (the 6 px ring allowance)
      for (const rl of document.querySelectorAll('.rail:not(.peek)')) {
        if (!rl.querySelector('[data-row]') && !rl.querySelector('.track')) continue;
        for (const c of rl.querySelectorAll('.wc,.ep .th,.pc .box,.hc,.gc')) { const q = c.getBoundingClientRect(); if (q.left > 912 || q.right < 48) continue;
          const lift = c.classList.contains('f') ? 0 : (q.height * 0.04) / 2;   // a lift grows the card ~4%
          if (q.bottom + lift > 513.5 || q.bottom + lift + 5 > 519.5) { issues.safe.push(`RAILFOCUS: ${short(c)} would sit at y ${(q.bottom + lift).toFixed(0)} focused (ring ${(q.bottom + lift + 5).toFixed(0)}), past 513`); break; } }
      }
      // v1.2 SIDE (review 2, M2): the pill row's one slot ends by x 912 and isn't cut (the mocks show the priority winner whole)
      for (const sd of document.querySelectorAll('.st-side')) { const q = sd.getBoundingClientRect();
        if (q.right > 912.5) issues.safe.push(`SIDE: the pill-row slot ends at x ${q.right.toFixed(0)}`);
        if (sd.scrollWidth > sd.clientWidth + 1) issues.clip.push(`SIDE: the pill-row slot is cut ("${sd.textContent.trim().slice(0, 30)}…"): show one text, by priority`); }
      // v1.1 TICKGAP (review S18): a tick is centred on its text line and 4 px or more from the text after it
      for (const tk of document.querySelectorAll('.st-tk')) {
        const q = tk.getBoundingClientRect(); let n = tk.nextSibling; while (n && n.nodeType === 3 && !n.textContent.trim()) n = n.nextSibling;
        if (!n) continue; const rg = document.createRange(); if (n.nodeType === 3) rg.selectNodeContents(n); else rg.selectNodeContents(n);
        const r0 = [...rg.getClientRects()][0]; if (!r0) continue;
        const gap = r0.left - q.right, dc = Math.abs((q.top + q.bottom) / 2 - (r0.top + r0.bottom) / 2);
        if (gap < 3.5 || dc > 3) issues.overlap.push(`TICKGAP: a tick ${gap.toFixed(1)} px from its text, ${dc.toFixed(1)} px off its line ("${(n.textContent || '').trim().slice(0, 20)}")`);
      }
      // BEST: in a list of copies, ranks run in order and exactly one Best, on rank 1
      const ranked = [...document.querySelectorAll('[data-rank]')];
      if (ranked.length) {
        const rk = ranked.map((e) => +e.dataset.rank); if (rk.some((v, i) => i && v < rk[i - 1])) issues.overlap.push(`BEST: copies out of rank order (${rk.join(',')})`);
        const bests = ranked.filter((e) => /\bbest\b/i.test(e.innerText)); if (bests.length !== 1 || +bests[0].dataset.rank !== 1) issues.overlap.push(`BEST: ${bests.length} Best marks, on rank ${bests.map((e) => e.dataset.rank).join(',') || '-'}`);
      }
      const vis = (e) => { for (let a = e; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if (c.display === 'none' || c.visibility === 'hidden') return false; } return true; };
      const allText = texts.map((t) => t.e.textContent).join(' | ');
      // STEP: timing moves in 0.5 s steps
      for (const m of allText.matchAll(/(\d+(?:\.\d+)?) s (earlier|later)/g)) if (Math.abs(+m[1] * 2 - Math.round(+m[1] * 2)) > 1e-6) issues.overlap.push(`STEP: "${m[0]}" is not a 0.5 s step`);
      // SOURCE: a surface that offers downloaded subtitles names where they come from
      for (const c of document.querySelectorAll('.nv-panel,.sheet,.nv-chip,.st-src,.menu')) { const t = c.textContent; if (/Timing (fixed|fits|not checked)|from (the )?internet|(?<!no )downloaded/i.test(t) && !/OpenSubtitles/.test(t)) issues.overlap.push(`SOURCE: "${t.trim().slice(0, 30)}" offers downloaded subtitles without naming OpenSubtitles`); }
      // JARGON: plain words: no codec, container or hash words on screen
      { const j = allText.match(/\b(HEVC|AVC|H\.?26[45]|x26[45]|codec|moviehash|hash|SRT|fps|remux|bitrate|tt\d{6,})\b/i); if (j) issues.overlap.push(`JARGON: "${j[0]}" on screen`); }
      // CLOCK: 24 h times
      { const j = allText.match(/\b\d{1,2}(:\d\d)?\s?(am|pm|a\.m\.|p\.m\.)/i); if (j) issues.overlap.push(`CLOCK: "${j[0]}" is a 12 h time`); }
      // HUE: no amber or yellow anywhere in the UI, and red only on LIVE (stand-in art and video excluded)
      { const hue = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); if (v[3] === 0) return null; const [r, g, b] = v.map((x) => x / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 0.25) return null; const l = (mx + mn) / 2, sat = d / (1 - Math.abs(2 * l - 1)); if (sat < 0.45) return null; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; return h; };
        for (const e of document.querySelectorAll('.screen *')) { if (e.closest('svg,.art,.vid') || !vis(e)) continue; const cs = getComputedStyle(e);
          for (const [k, c] of [['color', cs.color], ['background', cs.backgroundColor], ['border', cs.borderTopWidth !== '0px' ? cs.borderTopColor : '']]) { const h = hue(c); if (h == null) continue;
            if (k === 'color' && !(e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))) continue;
            if (h >= 32 && h <= 68) issues.overlap.push(`HUE: amber/yellow ${k} on ${short(e)}`);
            if ((h < 12 || h > 350) && !e.closest('.a-live')) issues.overlap.push(`HUE: red ${k} on ${short(e)} (red is LIVE only)`); } } }
      const fr = focusEls.map((fe) => { const q = fe.getBoundingClientRect(), cs = getComputedStyle(fe); return { cls: short(fe), inset: cs.boxShadow.includes('inset') || fe.classList.contains('f-in'), x0: q.left, y0: q.top, x1: q.right, y1: q.bottom, rad: parseFloat(cs.borderTopLeftRadius) || 0, sc: q.width / (fe.offsetWidth || q.width) }; });
      const textFocus = [...document.querySelectorAll('.fx')].filter((e) => !e.matches(sel)).map(short);
      const bangs = [...document.querySelectorAll('i.bang')].map((g) => { const c = g.querySelector('circle').getBoundingClientRect(), pa = g.querySelector('path').getBoundingClientRect(); return { dot: [c.left + c.width / 2, c.top + c.height / 2], bar: [pa.left + pa.width / 2, pa.top + pa.height / 2] }; });
      return { bangs, focus: focusEls.length, ui: all - art, small: [...new Set(small)], banned: banned.length, issues, fr, textFocus };
    });
    const iss = r.issues; const n = iss.overlap.length + iss.clip.length + iss.safe.length + iss.contrast.length + (r.banned ? 1 : 0) + r.small.length;
    bad += n;
    const fl = f.padEnd(34) + ' focus ' + r.focus + ' nodes ' + String(r.ui).padStart(4) + (n ? '  FAIL ' + n : '  ok');
    lines.push(fl);
    if (n || !quiet) for (const k of ['overlap', 'clip', 'safe', 'contrast']) for (const m of [...new Set(iss[k])]) lines.push(`    ${k.toUpperCase().padEnd(8)} ${m}`);
    if (r.small.length) lines.push('    SMALL    ' + r.small.join(' | '));
    if (r.banned) lines.push('    BANNED   ' + r.banned);
    // ---- RING: sample the screenshot just outside (or, inset, just inside) every edge of each focused element
    const shot = (await p.screenshot()).toString('base64');
    for (const g of r.fr) {
      const off = g.inset ? -1.5 : 3.6 * g.sc, pts = [], skip = g.rad * g.sc + 4;
      for (let x = g.x0 + skip; x <= g.x1 - skip; x += 3) { pts.push([x, g.y0 - off, 't'], [x, g.y1 + off, 'b']); }
      for (let y = g.y0 + skip; y <= g.y1 - skip; y += 3) { pts.push([g.x0 - off, y, 'l'], [g.x1 + off, y, 'r']); }
      const q = await b.newPage(); await q.setContent('<canvas></canvas>');
      const res = await q.evaluate(async ({ shot, pts }) => { const im = new Image(); im.src = 'data:image/png;base64,' + shot; await im.decode(); const c = document.querySelector('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const out = { t: [0, 0], b: [0, 0], l: [0, 0], r: [0, 0] }; for (const [px, py, s] of pts) { const d = x.getImageData(Math.round(px * 2), Math.round(py * 2), 1, 1).data; out[s][1]++; if (d[0] > 228 && d[1] > 228 && d[2] > 228) out[s][0]++; } return out; }, { shot, pts });
      await q.close();
      const pc = (s) => (res[s][1] ? Math.round((100 * res[s][0]) / res[s][1]) : 100), min = Math.min(pc('t'), pc('b'), pc('l'), pc('r'));
      const ringBox = g.inset ? [g.x0, g.y0, g.x1, g.y1] : [g.x0 - 5 * g.sc, g.y0 - 5 * g.sc, g.x1 + 5 * g.sc, g.y1 + 5 * g.sc];
      const safe = Math.min(ringBox[0] - 48, 912 - ringBox[2], ringBox[1] - 27, 513 - ringBox[3]);
      rings.push({ f, el: g.cls, inset: g.inset, top: pc('t'), bottom: pc('b'), left: pc('l'), right: pc('r'), min, ring: ringBox.map((v) => +v.toFixed(1)), safe: +safe.toFixed(1) });
      lines.push(`    RING     ${g.cls} ${g.inset ? 'inset' : 'outer'} white t${pc('t')} b${pc('b')} l${pc('l')} r${pc('r')} %  ring ${ringBox.map((v) => v.toFixed(0)).join(',')}  to safe edge ${safe.toFixed(1)} px`);
      if (min < 90) { bad++; lines.push(`    FAILRING ${g.cls} only ${min}% of one side is white`); }
    }
    // ---- BADGE pixels (v1.2, N-M1): the "!" must show a chalk bar AND a chalk dot (v1.1's dot was ink on ink)
    if (r.bangs.length) {
      const q = await b.newPage(); await q.setContent('<canvas></canvas>');
      const res = await q.evaluate(async ({ shot, bangs }) => { const im = new Image(); im.src = 'data:image/png;base64,' + shot; await im.decode(); const c = document.querySelector('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const lit = ([cx, cy]) => { let n = 0; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const d = x.getImageData(Math.round(cx * 2) + dx, Math.round(cy * 2) + dy, 1, 1).data; if (d[0] > 190 && d[1] > 190 && d[2] > 180) n++; } return n; };
        return bangs.map((g) => ({ dot: lit(g.dot), bar: lit(g.bar) })); }, { shot, bangs: r.bangs });
      await q.close();
      res.forEach((v, i) => { if (v.dot < 3 || v.bar < 3) { bad++; lines.push(`    BADGEPX  badge ${i + 1}: the "!" ${v.dot < 3 ? 'dot' : 'bar'} isn't visible (${v.dot}/9 dot, ${v.bar}/9 bar chalk pixels)`); } });
    }
    // ---- DIVIDER: no 1 px row line (#3C3452) drawn against a highlighted (.mine) or focused row, top or bottom
    const rowsHL = await p.evaluate(() => [...document.querySelectorAll('.nb-tr.mine,.nb-tr.f-in')].map((e) => { const q = e.getBoundingClientRect(); return [q.left + q.width / 2, q.top, q.bottom]; }));
    if (rowsHL.length) {
      const q = await b.newPage(); await q.setContent('<canvas></canvas>');
      const hits = await q.evaluate(async ({ shot, rows }) => { const im = new Image(); im.src = 'data:image/png;base64,' + shot; await im.decode(); const c = document.querySelector('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const out = []; for (const [cx, y0, y1] of rows) for (const yy of [Math.round(y0 * 2) - 1, Math.round(y0 * 2), Math.round(y1 * 2), Math.round(y1 * 2) + 1]) { const d = x.getImageData(Math.round(cx * 2) - 300, yy, 1, 1).data; if (Math.abs(d[0] - 0x3C) < 5 && Math.abs(d[1] - 0x34) < 5 && Math.abs(d[2] - 0x52) < 5) out.push(yy / 2); } return out; }, { shot, rows: rowsHL });
      await q.close();
      for (const h of hits) { bad++; lines.push(`    DIVIDER  a row line at y ${h} touches a highlighted or focused row`); }
    }
    if (!r.fr.length) lines.push(`    RING     none: a HUD with no focus ring by design (the timing strip, the chip)`);
    await p.close();
  }
  fs.writeFileSync(root + '/tools/audit-rings.json', JSON.stringify(rings, null, 1));
  console.log(lines.join('\n')); console.log(`\n${files.length} pages, ${bad} findings`); await b.close(); process.exit(bad ? 1 : 0);
})();
