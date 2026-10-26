// node tools/audit.js : per-mock checks (one focus ring, node count, banned CSS, text below 14 px that is not a 12 px badge)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const root = path.resolve(__dirname, '..'); const b = await chromium.launch();
  const files = [...fs.readdirSync(root + '/tv').map((f) => 'tv/' + f), ...fs.readdirSync(root + '/player').map((f) => 'player/' + f)].filter((f) => f.endsWith('.html'));
  const rows = [];
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 } });
    await p.goto('file://' + root + '/' + f); await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(() => {
      const sel = '.f,.f-ring,.f-in,.lift,.nv-row.f,.field.ring,.vb.f';
      const focus = [...document.querySelectorAll(sel)].filter((e) => !e.closest('.scrim') || true).length;
      const all = document.querySelectorAll('.screen *').length, art = document.querySelectorAll('.art-svg, .art-svg *').length;
      const small = [], banned = [];
      for (const e of document.querySelectorAll('.screen *')) {
        const cs = getComputedStyle(e);
        if (cs.filter !== 'none' || cs.backdropFilter !== 'none') banned.push(e.className);
        if (e.children.length === 0 && e.textContent.trim() && !e.closest('svg')) {
          const fs = parseFloat(cs.fontSize);
          if (fs < 14) small.push(fs + ':' + e.textContent.trim().slice(0, 14));
        }
      }
      return { focus, ui: all - art, small: [...new Set(small)], banned: banned.length };
    });
    rows.push([f, r]); await p.close();
  }
  for (const [f, r] of rows) console.log(f.padEnd(34), 'focus', r.focus, 'nodes', String(r.ui).padStart(4), r.banned ? 'BANNED ' + r.banned : '', r.small.length ? 'small ' + r.small.join(' | ') : '');
  await b.close();
})();
