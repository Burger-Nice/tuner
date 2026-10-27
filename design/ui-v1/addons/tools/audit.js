// node tools/audit.js [--quiet] [--inject] [page ...]
// design/ui-v1/catchup/tools/audit.js, adapted to the add-on mocks (ad- classes), plus two add-on checks (SPEC 13):
//   JARGON  protocol words a non-technical owner shouldn't meet (infoHash, magnet, bingeGroup, manifest fields, tt ids, JSON, API…);
//           "manifest.json" is allowed only where he is told what a link looks like
//   SECRET  a configured add-on link (a long path segment) shown in full: it holds his debrid or account key
// --inject adds a jargon line and a full configured link to every page, to prove both fire.
// From catch-up: SPOILER:
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
    if (inject) await p.evaluate(() => { document.querySelector('.screen').insertAdjacentHTML('beforeend', '<div style="position:absolute;left:300px;top:100px;font:500 16px Inter;color:#F3EFE6;z-index:30">infoHash 5d6406 · https://northlight.example/eyJkZWJyaWQiOiJyZCIsImtleSI6IjEyMyJ9/manifest.json</div>'); });
    if (inject) await p.evaluate(() => { if (!document.querySelector('meta[name="shield"]')) return; const s = document.querySelector('.screen'); s.insertAdjacentHTML('beforeend', '<div style="position:absolute;left:300px;top:30px;font:500 16px Inter;color:#F3EFE6;z-index:30">Final 118–112 · −12:40</div><div style="position:absolute;left:300px;top:52px;font:500 16px Inter;color:#F3EFE6;z-index:30">Grizzlies vs Jazz 2026-10-26</div><div style="position:absolute;left:300px;top:74px;font:500 16px Inter;color:#F3EFE6;z-index:30">Jazz 118:112</div><span class="btn2 f" style="position:absolute;left:600px;top:470px;z-index:30">Reveal score</span>'); });
    const r = await p.evaluate(() => {
      const SAFE = { l: 48, r: 912, t: 27, b: 513 }, TOL = 1.5;
      const sel = '.f,.f-ring,.f-in,.lift,.nv-row.f,.field.ring,.vb.f,.thumbf';   // .ad-row.lift is the moving row (the Saved model)
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
      const BOXES = '.ad-row,.ad-lr,.ad-q,.ad-gives span,.ad-code span,.ad-next,.ad-up,.cu-badge,.cu-day,.cu-nowr,.nb-tr,.nb-gt,.nb-rk,.nb-nc,.nb-nrow,.nb-cat,.pillbtn,.btn,.btn2,.chip,.tag,.logo,.team,.shield,.kbd,.toast,.srow,.rrow,.lr,.nv-row,.state,.card,.vb,.cnt,.sfield,.field,.g-cell,.hc,.gc,.wc,.menu,.sheet,.ctxmenu,.nv-card,.nv-chip,.bubble';
      const hasScrim = !!document.querySelector('.scrim');
      const boxEls = [...document.querySelectorAll(BOXES)].filter((b) => (!hasScrim || b.closest(MODAL)) && !b.closest('.art') && !(b.closest('.vid')) && ((b) => { return true; })(b)).filter((b) => { const q = b.getBoundingClientRect(); return q.width > 8 && q.height > 8 && getComputedStyle(b).visibility !== 'hidden'; });
      for (const t of texts) {
        for (const b of boxEls) {
          const q = b.getBoundingClientRect();
          const inside = b.contains(t.e);
          if (inside) {
            if (b.matches('.sheet,.menu,.card,.state,.g-cell,.nb-read,.ad-phone')) continue;                       // containers that scroll or clip on purpose
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
      // ---- add-ons: JARGON and SECRET (SPEC 13)
      { const all = []; const tw = document.createTreeWalker(document.querySelector('.screen'), NodeFilter.SHOW_TEXT);
        for (let n = tw.nextNode(); n; n = tw.nextNode()) { const pe = n.parentElement; let vis = true; for (let a = pe; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) { vis = false; break; } } if (vis && n.textContent.trim()) all.push(n.textContent); }
        const txt = all.join(' ').replace(/\s+/g, ' ');
        const jar = txt.replace(/manifest\.json/g, '').match(/\b(tt\d{6,}|infoHash|info hash|magnet:?|bingeGroup|proxyHeaders|notWebReady|behaviorHints|idPrefixes|JSON|API|endpoint|transport(Url)?|resources?|catalog id|meta(data)? object|stream object|P2P|codec|HEVC|x26[45]|remux)\b/i);
        if (jar) issues.overlap.push(`JARGON: "${jar[0]}" on screen`);
        for (const m of txt.matchAll(/https?:\/\/[^\s]+/g)) { if (m[0].split('/').some((seg) => seg.length > 16 && !/…/.test(seg) && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(seg))) issues.overlap.push(`SECRET: a configured link shown in full ("${m[0].slice(0, 40)}")`); }
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
      const NEIGH = '.ad-row,.ad-lr,.nb-gt,.nb-rk,.nb-nc,.nb-nrow,.nb-cat,.nb-lead,.btn,.btn2,.chip,.pillbtn,.pc .box,.hc,.gc,.wc,.ep .th,.lr,.arow,.srow,.rrow,.key,.vb,.field,.sfield,.cnt,.tag';
      for (const fe of focusEls) {
        if (fe.classList.contains('f-in') || fe.matches('.tab,.thumbf,.nv-row,.avatar')) continue;
        const q = fe.getBoundingClientRect(); const ring = { l: q.left - 7, r: q.right + 7, t: q.top - 7, b: q.bottom + 7 };
        const host = fe.closest('.pc,.ep') || fe;
        for (const n of document.querySelectorAll(NEIGH)) {
          if (n === fe || fe.contains(n) || n.contains(fe) || host.contains(n)) continue;
          const FLOAT = '.ctxmenu,.menu,.sheet,.nv-panel,.nv-card'; const fc = fe.closest(FLOAT); if (fc && !fc.contains(n)) continue;
          if (fe.matches('.lr,.arow,.srow,.rrow,.nb-cat,.nb-nrow,.ad-row,.ad-lr') && n.matches('.lr,.arow,.srow,.rrow,.nb-cat,.nb-nrow,.ad-row,.ad-lr')) continue;   // stacked list rows share edges by design
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
      const fr = focusEls.map((fe) => { const q = fe.getBoundingClientRect(), cs = getComputedStyle(fe); return { cls: short(fe), inset: cs.boxShadow.includes('inset') || fe.classList.contains('f-in'), x0: q.left, y0: q.top, x1: q.right, y1: q.bottom, rad: parseFloat(cs.borderTopLeftRadius) || 0, sc: q.width / (fe.offsetWidth || q.width) }; });
      const textFocus = [...document.querySelectorAll('.fx')].filter((e) => !e.matches(sel)).map(short);
      return { focus: focusEls.length, ui: all - art, small: [...new Set(small)], banned: banned.length, issues, fr, textFocus };
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
    // ---- DIVIDER: no 1 px row line (#3C3452) drawn against a highlighted (.mine) or focused row, top or bottom
    const rowsHL = await p.evaluate(() => [...document.querySelectorAll('.nb-tr.mine,.nb-tr.f-in')].map((e) => { const q = e.getBoundingClientRect(); return [q.left + q.width / 2, q.top, q.bottom]; }));
    if (rowsHL.length) {
      const q = await b.newPage(); await q.setContent('<canvas></canvas>');
      const hits = await q.evaluate(async ({ shot, rows }) => { const im = new Image(); im.src = 'data:image/png;base64,' + shot; await im.decode(); const c = document.querySelector('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const out = []; for (const [cx, y0, y1] of rows) for (const yy of [Math.round(y0 * 2) - 1, Math.round(y0 * 2), Math.round(y1 * 2), Math.round(y1 * 2) + 1]) { const d = x.getImageData(Math.round(cx * 2) - 300, yy, 1, 1).data; if (Math.abs(d[0] - 0x3C) < 5 && Math.abs(d[1] - 0x34) < 5 && Math.abs(d[2] - 0x52) < 5) out.push(yy / 2); } return out; }, { shot, rows: rowsHL });
      await q.close();
      for (const h of hits) { bad++; lines.push(`    DIVIDER  a row line at y ${h} touches a highlighted or focused row`); }
    }
    if (!r.fr.length) lines.push(`    RING     none: the focused element is a text body (${r.textFocus.join(' ') || 'no .fx'}), scrolled with up/down, as the Full description sheet`);
    await p.close();
  }
  fs.writeFileSync(root + '/tools/audit-rings.json', JSON.stringify(rings, null, 1));
  console.log(lines.join('\n')); console.log(`\n${files.length} pages, ${bad} findings`); await b.close(); process.exit(bad ? 1 : 0);
})();
