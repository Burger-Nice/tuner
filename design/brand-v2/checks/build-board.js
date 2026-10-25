// Generates ../board.html from palette.js / geometry.js / contrast.js so the board can never drift from the tokens. node checks/build-board.js
const fs = require('fs'), path = require('path');
const c = require('./color.js'), P = require('./palette.js'), G = require('./geometry.js');
const { rows } = require('./contrast.js');
const root = path.join(__dirname, '..');
const inline = (f, color, extra = '') => fs.readFileSync(path.join(root, f), 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/currentColor/g, color).replace('<svg ', `<svg ${extra} `);
const ok = (a, b) => c.ratio(P[a], P[b]).toFixed(1) + ':1';
const rr = (kind, fg, bg) => rows.find(r => r.kind === kind && r.fg === fg && r.bg === bg).ratio.toFixed(1) + ':1';
const oklch = k => { const [L, C, h] = c.hex2oklch(P[k]); return `L${L.toFixed(2).slice(1)} C${C.toFixed(3).slice(1)} h${Math.round(h)}`; };
const t = G.tParts();
const old = { 'bg-0': '#0D0E12', 'bg-1': '#13151B', 'surface-1': '#1A1D24', 'surface-2': '#22262F', 'surface-3': '#2C313C', accent: '#FFB020', warning: '#FF8A3D', live: '#FF5A4F', success: '#3DD68C', danger: '#FF5A4F', 'text-3': '#868D9B', focus: '#FFFFFF' };
const sw = (k, label, note, fg) => `<div class="sw" style="background:${P[k]};color:${fg || P['text-1']}"><b>${label}</b><span>${P[k]}</span><span>${oklch(k)}</span>${note ? `<span>${note}</span>` : ''}</div>`;
const L = k => c.hex2oklch(old[k] || P[k])[0];
const sims = ['accent', 'warning', 'live', 'danger', 'success'];
const simRow = (type, label) => `<div class="cvd"><i>${label}</i>${sims.map(k => `<span style="background:${type ? c.cvd(P[k], type) : P[k]}" title="${k}"></span>`).join('')}</div>`;
const optImg = (f, h) => `<img src="checks/options/${f}.svg" style="height:${h}px;display:block" alt="">`;
const step = (set) => ['bg-0', 'bg-1', 'surface-1', 'surface-2', 'surface-3'].map((k, i, a) => i ? (c.hex2oklch(set[k])[0] - c.hex2oklch(set[a[i - 1]])[0]).toFixed(3).slice(1) : '').filter(Boolean).join(' · ');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Tuner Brand Board v2.1</title>
<link rel="stylesheet" href="tokens.css">
<style>
@font-face{font-family:"Archivo Variable";src:url(fonts/archivo-latin-standard-normal.woff2) format("woff2-variations");font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:"Inter Variable";src:url(fonts/inter-latin-wght-normal.woff2) format("woff2-variations");font-weight:100 900}
*{box-sizing:border-box}
html,body{margin:0;background:var(--t-bg-0);color:var(--t-text-1);font-family:var(--t-font-text);font-size:14px;line-height:1.45}
.board{width:1800px;margin:0 auto;padding:56px 64px 72px;display:grid;grid-template-columns:repeat(12,1fr);gap:28px}
.sec{background:var(--t-bg-1);border:1px solid var(--t-line);border-radius:20px;padding:28px 30px;position:relative;min-width:0;overflow:hidden}
.sec h2,.h2{margin:0 0 18px;font:650 12px/1 var(--t-font-text);letter-spacing:.12em;text-transform:uppercase;color:var(--t-text-3)}
.sec p{margin:0;color:var(--t-text-2);font-size:14px}
.sec p+p{margin-top:10px}
.c12{grid-column:span 12}.c8{grid-column:span 8}.c7{grid-column:span 7}.c6{grid-column:span 6}.c5{grid-column:span 5}.c4{grid-column:span 4}.c3{grid-column:span 3}
.hero{grid-column:span 12;display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:stretch}
.hero .lock{background:var(--t-bg-0);border:1px solid var(--t-line);border-radius:20px;display:grid;place-items:center;padding:60px 70px}
.hero .lock img{width:100%}
.hero .light{background:#F2F3F6;border-radius:20px;display:grid;place-items:center;padding:60px 70px;color:#13161B}
.hero .light svg{width:100%;height:auto}
.kicker{font:800 56px/1 var(--t-font-display);font-stretch:112%;letter-spacing:-.02em;margin:0 0 10px}
.kicker em{font-style:normal;color:var(--t-accent)}
.lede{font-size:18px;color:var(--t-text-2);max-width:60ch;margin:0}
.marks{display:flex;gap:30px;align-items:flex-end}
.marks figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:10px}
.marks figcaption{font-size:11px;color:var(--t-text-3);letter-spacing:.06em;text-transform:uppercase}
.tile{border-radius:22.37%;overflow:hidden;display:block}
.circle{border-radius:50%;overflow:hidden;display:block;background:var(--t-bg-0)}
.sizes{display:flex;gap:20px;align-items:flex-end}.sizes img{display:block}
.anat{position:relative;width:100%;aspect-ratio:1;background:var(--t-bg-0);border-radius:16px;border:1px solid var(--t-line)}
.anat svg{position:absolute;inset:0;width:100%;height:100%}
.opt{display:grid;grid-template-columns:150px 1fr;gap:18px;align-items:center;padding:13px 0;border-top:1px solid var(--t-line)}
.opt:first-of-type{border-top:none;padding-top:0}
.opt .n{font-size:12px;color:var(--t-text-3);line-height:1.35}.opt .n b{display:block;color:var(--t-text-1);font-size:13px;margin-bottom:2px}
.opt.pick{background:var(--t-bg-0);margin:0 -14px;padding:13px 14px;border-radius:12px;border:1px solid var(--t-accent)}
.opt .row{display:flex;align-items:flex-end;gap:26px}
.verdict{font-size:12px;color:var(--t-text-3);margin-top:3px}
.swatches{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.sw{height:112px;border-radius:12px;padding:11px;display:flex;flex-direction:column;justify-content:flex-end;border:1px solid var(--t-line);font-size:11px;line-height:1.3}
.sw b{font-size:13px;display:block}.sw span{opacity:.82;font-variant-numeric:tabular-nums}
.ratios{display:grid;grid-template-columns:repeat(3,1fr);gap:0 24px;margin-top:6px;font-size:12px;color:var(--t-text-2);font-variant-numeric:tabular-nums}
.ratios div{display:flex;justify-content:space-between;border-bottom:1px solid var(--t-line);padding:5px 0}
.ratios i{font-style:normal;color:var(--t-text-3)}.ratios b{color:var(--t-text-1);font-weight:600}
.wheel{position:relative;width:300px;height:300px;flex:none}
.wheel .ring{position:absolute;inset:0;border-radius:50%;background:conic-gradient(in oklch longer hue, oklch(.76 .12 0), oklch(.76 .12 359.9));-webkit-mask:radial-gradient(circle, transparent 0 62%, #000 62.5%);mask:radial-gradient(circle, transparent 0 62%, #000 62.5%)}
.wheel .dot{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:3px solid var(--t-bg-1);box-shadow:0 0 0 1px var(--t-line-strong)}
.wheel .lab{position:absolute;font-size:11px;color:var(--t-text-2);white-space:nowrap;font-weight:600}
.diff{display:grid;grid-template-columns:120px 120px 120px 1fr;gap:0 14px;font-size:12px;align-items:center}
.diff>*{padding:9px 0;border-bottom:1px solid var(--t-line)}
.diff .hd{color:var(--t-text-3);font-weight:650;letter-spacing:.08em;text-transform:uppercase;font-size:11px;padding-top:0}
.chip{display:inline-flex;align-items:center;gap:8px}.chip i{width:18px;height:18px;border-radius:5px;display:block;border:1px solid #ffffff20}
.chip span{font-variant-numeric:tabular-nums;color:var(--t-text-2)}
.cvd{display:flex;gap:8px;align-items:center;margin-top:8px}.cvd i{font-style:normal;width:96px;font-size:11px;color:var(--t-text-3)}.cvd span{width:62px;height:30px;border-radius:7px;display:block}
.type{display:flex;flex-direction:column;gap:12px}
.type .l{display:grid;grid-template-columns:200px 1fr;align-items:baseline;gap:20px;border-bottom:1px solid var(--t-line);padding-bottom:10px}
.type .l small{color:var(--t-text-3);font-size:11px;letter-spacing:.06em;text-transform:uppercase}
.specimen .big{font:800 88px/1 var(--t-font-display);font-stretch:112%;letter-spacing:-.025em;white-space:nowrap}
.screen .tv{width:100%;background:var(--t-bg-0);border-radius:14px;border:1px solid var(--t-line);overflow:hidden}
.dodont{font-size:13px;color:var(--t-text-2)}.dodont ul{margin:0;padding-left:18px}.dodont li{margin:5px 0}
.foot{grid-column:span 12;color:var(--t-text-4);font-size:12px;display:flex;justify-content:space-between}
</style></head><body>
<div class="board">

  <div class="hero">
    <div>
      <div class="h2">Tuner · brand v2.1 · "Needle" · revision</div>
      <p class="kicker">Locked <em>on.</em></p>
      <p class="lede">Tuner is one person's private broadcast desk. The mark is a dial scale with the needle locked through it, and since this revision the mark <b style="color:var(--t-text-1)">is</b> the T of the word: <b style="color:var(--t-text-1)">T</b>+UNER, one word, no second T.</p>
      <div class="marks" style="margin-top:34px">
        <figure><img src="mark.svg" height="150" alt=""><figcaption>Mark = the T</figcaption></figure>
        <figure><span style="display:block;color:${P['text-1']};height:150px">${inline('mark-mono.svg', 'currentColor', 'height="150" width="145"')}</span><figcaption>One colour</figcaption></figure>
        <figure><span class="tile"><img src="icon-1024.svg" width="150" alt=""></span><figcaption>iOS / Windows icon</figcaption></figure>
        <figure><span class="circle" style="width:150px;height:150px"><img src="icon-foreground-108.svg" width="150" alt=""></span><figcaption>Android adaptive</figcaption></figure>
      </div>
    </div>
    <div style="display:grid;grid-template-rows:1fr 1fr;gap:28px">
      <div class="lock"><img src="lockup.svg" alt="Tuner"></div>
      <div class="light">${inline('lockup-mono.svg', 'currentColor', 'width="499" height="100"')}</div>
    </div>
  </div>

  <div class="sec c7">
    <h2>Lockup study · should the T be the logo? Yes. Four ways to do it</h2>
    <div class="opt"><div class="n"><b>0 · v1: mark beside TUNER</b>Reads "T TUNER". Two T's. The owner's point.</div><div class="row">${optImg('0-v1-mark-beside-TUNER', 54)}${optImg('0-v1-mark-beside-TUNER', 20)}</div></div>
    <div class="opt"><div class="n"><b>1 · v1 mark as the T</b>T is 16% wider than any letter; needle (18) is lighter than the 23 stems. Logo-in-a-word.</div><div class="row">${optImg('1-v1-mark-as-the-T', 54)}${optImg('1-v1-mark-as-the-T', 20)}</div></div>
    <div class="opt pick"><div class="n"><b style="color:var(--t-accent)">2 · T redrawn as the mark · chosen</b>Same needle-through-scale, drawn on the letter grid: bar = stem weight, one drawing everywhere.</div><div class="row">${optImg('2-T-redrawn-two-tone', 54)}${optImg('2-T-redrawn-two-tone', 20)}${optImg('2-T-redrawn-two-tone', 14)}</div></div>
    <div class="opt"><div class="n"><b>3 · All-amber T</b>Loudest at 14 px, but loses the white needle: no longer the mark. Fallback only.</div><div class="row">${optImg('3-T-all-amber', 54)}${optImg('3-T-all-amber', 20)}</div></div>
    <div class="opt"><div class="n"><b>4 · Scale spans the word</b>Ownable, but UNER shrinks to 74% and amber becomes ~40% of the lockup. Not an accent any more.</div><div class="row">${optImg('4-scale-spans-the-word', 54)}${optImg('4-scale-spans-the-word', 20)}</div></div>
  </div>

  <div class="sec c5">
    <h2>Mark anatomy · the T grid (cap height 100)</h2>
    <div class="anat" style="max-width:420px">
      <svg viewBox="-16 -14 130 128" fill="none">
        <g stroke="${P['line-strong']}" stroke-width=".35"><path d="M-16 0H114M-16 23H114M-16 100H114M0 -14V114M97 -14V114M37.5 -14V114M59.5 -14V114"/></g>
        <circle cx="48.5" cy="46" r="69.6" stroke="${P['text-4']}" stroke-width=".4" stroke-dasharray="1.6 1.6"/>
        <path fill="${P.accent}" d="${t.bar}"/><path fill="${P['text-1']}" d="${t.needle}"/>
        <g font-family="Inter Variable" font-size="3.6" fill="${P['text-3']}"><text x="99.5" y="14">23</text><text x="99.5" y="102">100</text><text x="40" y="-3">97</text><text x="30" y="109">needle 22 → 28</text></g>
      </svg>
    </div>
    <p style="margin-top:14px">Bar 97×23 (thickness = the wordmark stem, 23). Six 3.9×11.5 ticks, pitch 10.5. Needle 22 wide at the top, 28 at the baseline (average 25, matching 23-unit stems; the taper is the only soft move). Dotted circle = Android adaptive safe zone at the foreground-layer scale: the bar's corners sit inside it.</p>
    <p><b style="color:var(--t-text-1)">v1 → v2.1:</b> bar 88×18 → 97×23, needle 14→20 → 22→28, nine ticks → six, aspect 1.16 → 0.97. Heavier, more letter-like, one drawing in rail, icon and lockup.</p>
  </div>

  <div class="sec c4">
    <h2>Minimum sizes</h2>
    <div class="sizes">
      <img src="mark.svg" height="64" alt=""><img src="mark.svg" height="48" alt=""><img src="mark.svg" height="32" alt=""><img src="mark-small.svg" height="24" alt=""><img src="mark-small.svg" height="16" alt="">
      <span class="tile"><img src="icon-1024.svg" width="48" alt=""></span><span class="tile"><img src="icon-1024.svg" width="24" alt=""></span>
    </div>
    <div class="sizes" style="margin-top:22px"><img src="lockup.svg" width="200" alt=""><img src="lockup.svg" width="130" alt=""><img src="lockup.svg" width="90" alt=""></div>
    <p style="margin-top:18px">Mark 24 px tall minimum (ticks drop below 32 px, use mark-small.svg; nothing under 16). Lockup 90 px wide desktop, 140 px on the TV canvas (28 px cap). Clear space = half the cap height all round.</p>
  </div>

  <div class="sec c4">
    <h2>Rail + splash</h2>
    <div style="display:flex;gap:24px;align-items:center;background:var(--t-bg-0);border:1px solid var(--t-line);border-radius:14px;padding:22px 26px">
      <img src="mark.svg" height="88" alt=""><img src="lockup.svg" width="250" alt="">
    </div>
    <p style="margin-top:14px">Rail: the mark alone at 44 px CSS (88 device px on the TV). Boot splash and sign-in: the lockup at 200 px CSS. In the lockup the mark is the T at 1:1 — never a second mark next to it.</p>
  </div>

  <div class="sec c4">
    <h2>Android TV / Google TV banner · 320×180</h2>
    <img src="tv-banner.svg" width="320" style="display:block;border-radius:6px;outline:1px solid var(--t-line)" alt="">
    <div style="display:flex;gap:16px;margin-top:16px;align-items:flex-start">
      <img src="tv-banner.svg" width="140" style="border-radius:4px;outline:1px solid var(--t-line)" alt="">
      <p>Full lockup, cap height 46 (v1: 35), inside the central 80×60% safe area. The compact T-in-word lockup lets it grow 30% in the same safe area. Flat canvas, no border, glow or gradient. Ship 320×180, 480×270, 640×360.</p>
    </div>
  </div>

  <div class="sec c7">
    <h2>Colour revision · what the research changed</h2>
    <div class="swatches">
      ${sw('bg-0', 'bg-0', 'canvas')}${sw('bg-1', 'bg-1', 'rail, sheets')}${sw('surface-1', 'surface-1', 'cards')}${sw('surface-2', 'surface-2', 'hover')}${sw('surface-3', 'surface-3', 'pressed')}${sw('text-1', 'text-1', '', P['bg-0'])}
      ${sw('accent', 'accent', 'the brand', P['on-accent'])}${sw('warning', 'warning', 'with ⚠ + words', P['on-accent'])}${sw('live', 'live', 'on air only', P['on-accent'])}${sw('danger', 'danger', 'errors, icon+text', P['on-accent'])}${sw('success', 'success', '', P['on-accent'])}${sw('text-3', 'text-3 / text-2', P['text-2'], P['bg-0'])}
    </div>
    <div class="h2" style="margin:22px 0 8px">Surface ladder in OKLCH lightness · ΔL per step</div>
    <div style="display:grid;grid-template-columns:70px 1fr;gap:6px 12px;font-size:12px;color:var(--t-text-3);align-items:center;font-variant-numeric:tabular-nums">
      <span>v1</span><div style="display:flex;gap:4px">${['bg-0', 'bg-1', 'surface-1', 'surface-2', 'surface-3'].map(k => `<span style="background:${old[k]};width:62px;height:26px;border-radius:6px;border:1px solid #ffffff18"></span>`).join('')}<span style="margin-left:10px;align-self:center">L .165 → .313 · steps ${step(old)} · R,G of canvas = 13,14 (< 16)</span></div>
      <span>v2.1</span><div style="display:flex;gap:4px">${['bg-0', 'bg-1', 'surface-1', 'surface-2', 'surface-3'].map(k => `<span style="background:${P[k]};width:62px;height:26px;border-radius:6px;border:1px solid #ffffff18"></span>`).join('')}<span style="margin-left:10px;align-self:center">L .199 → .366 · steps ${step(P)} · lowest channel 19</span></div>
    </div>
    <div class="h2" style="margin:22px 0 4px">Key contrast ratios (WCAG 2.x; every text token ≥ 4.5:1 on all five surfaces)</div>
    <div class="ratios">
      <div><i>text-1 on bg-0 / surface-3</i><b>${rr('text', 'text-1', 'bg-0')} / ${rr('text', 'text-1', 'surface-3')}</b></div>
      <div><i>text-2 on bg-0 / surface-3</i><b>${rr('text', 'text-2', 'bg-0')} / ${rr('text', 'text-2', 'surface-3')}</b></div>
      <div><i>text-3 on bg-0 / surface-3</i><b>${rr('text', 'text-3', 'bg-0')} / ${rr('text', 'text-3', 'surface-3')}</b></div>
      <div><i>accent on bg-0 / surface-3</i><b>${rr('text', 'accent', 'bg-0')} / ${rr('text', 'accent', 'surface-3')}</b></div>
      <div><i>on-accent on accent</i><b>${rr('text', 'on-accent', 'accent')}</b></div>
      <div><i>live-text on bg-0 / surface-3</i><b>${rr('text', 'live-text', 'bg-0')} / ${rr('text', 'live-text', 'surface-3')}</b></div>
      <div><i>danger-text on bg-0 / surface-3</i><b>${rr('text', 'danger-text', 'bg-0')} / ${rr('text', 'danger-text', 'surface-3')}</b></div>
      <div><i>success on bg-0 / surface-3</i><b>${rr('text', 'success', 'bg-0')} / ${rr('text', 'success', 'surface-3')}</b></div>
      <div><i>warning on bg-0 / surface-3</i><b>${rr('text', 'warning', 'bg-0')} / ${rr('text', 'warning', 'surface-3')}</b></div>
      <div><i>live dot on bg-0 / surface-3</i><b>${rr('non-text', 'live', 'bg-0')} / ${rr('non-text', 'live', 'surface-3')}</b></div>
      <div><i>outline (inputs) on bg-0 / surface-2</i><b>${rr('non-text', 'outline', 'bg-0')} / ${rr('non-text', 'outline', 'surface-2')}</b></div>
      <div><i>focus ring on bg-0 (via 2px gap)</i><b>${rr('non-text', 'focus ring', 'bg-0 gap')}</b></div>
    </div>
  </div>

  <div class="sec c5">
    <h2>Hue map · OKLCH hue angle</h2>
    <div style="display:flex;gap:22px;align-items:center">
      <div class="wheel" id="wheel"><div class="ring"></div></div>
      <div style="font-size:12px;color:var(--t-text-2);display:flex;flex-direction:column;gap:7px">
        <div><b style="color:var(--t-text-1)">Brand layer:</b> accent h82 vs neutrals h262 = 180°, a straight complement. Grizzlies gold (h80) and navy / Beale Street blue (h264-273) land on the same two points.</div>
        <div><b style="color:var(--t-text-1)">Semantic layer:</b> live 25 · danger 3 · warning 56 · success 160. Set by convention, then spaced and laddered in lightness (.66 → .83) so they survive red-green colour blindness.</div>
        <div><b style="color:var(--t-text-1)">Not changed by the research:</b> amber as the one brand colour on a cool dark field.</div>
      </div>
    </div>
    <div class="h2" style="margin:20px 0 0">Colour-vision check · accent, warning, live, danger, success</div>
    ${simRow(null, 'normal')}${simRow('deut', 'deuteranopia')}${simRow('prot', 'protanopia')}
    <p style="margin-top:12px">Accent vs warning ΔE ${c.dE(P.accent, P.warning).toFixed(1)} (v1 ${c.dE(old.accent, old.warning).toFixed(1)}), warning vs live ${c.dE(P.warning, P.live).toFixed(1)} (v1 ${c.dE(old.warning, old.live).toFixed(1)}). Still close under deuteranopia, so state is never colour alone: icon + word, always.</p>
  </div>

  <div class="sec c12">
    <h2>v1 → v2.1 colour decisions</h2>
    <div class="diff">
      <div class="hd">Token</div><div class="hd">v1</div><div class="hd">v2.1</div><div class="hd">Why</div>
      ${[
        ['canvas bg-0', 'bg-0', 'R,G = 13,14 sat below 16/255 video black. Any TV/HDMI path that treats the UI as limited range clips them to black (a blue-only canvas) and bg-1 almost merges. Lifted so no channel can clip (Netflix #141414, Material #121212 sit in the same zone).'],
        ['surfaces', 'surface-2', 'Steps were uneven (.032→.044) and chroma drifted .009→.021, so the canvas read neutral and chips read blue. Now equal ΔL .042 and constant chroma, hue 262: a steady midnight tint, the complement of the accent.'],
        ['text-3', 'text-3', 'v1 failed 4.5:1 on surface-3 (3.9) and needed a size exception. Now 4.9:1 on every surface; no exceptions.'],
        ['accent', 'accent', 'Hue 75 → 82 (Grizzlies gold is 80), C .165 → .162: v1 sat on the sRGB gamut edge, which Vivid/wide-gamut modes push to neon. Lightness ~kept (.813 → .826): it carries on luma.'],
        ['live', 'live', 'Deeper and slightly less orange (L .687 → .659): 14 ΔE from warning (v1 10). Still only for on-air, only small, never a fill behind text.'],
        ['danger', 'danger', 'v1 reused the exact live hex for errors, so "red" meant two things. Errors are now rose (h3), icon + text.'],
        ['warning', 'warning', 'h51 → 56, L .750 → .760. Nearest neighbour to the accent: only ever with a ⚠ icon and words, never selected or primary.'],
        ['success', 'success', 'Teal-leaning (h157 → 160), L .779 → .776. 78° from the accent so green and amber stay apart.'],
        ['focus', 'focus', 'Still white. Added a 2px canvas gap: white touching amber is only 1.7:1, with the gap the ring is 18:1 against what is next to it.']
      ].map(([n, k, why]) => { const o = old[k] || old['bg-0']; const nk = k === 'bg-0' ? 'bg-0' : k; return `<div>${n}</div><div class="chip"><i style="background:${o}"></i><span>${o}</span></div><div class="chip"><i style="background:${P[nk]}"></i><span>${P[nk]}</span></div><div style="color:var(--t-text-2)">${why}</div>`; }).join('')}
    </div>
  </div>

  <div class="sec c6">
    <h2>Type · Archivo + Inter (unchanged)</h2>
    <div class="specimen"><div class="big">77–70</div></div>
    <div class="type" style="margin-top:14px">
      <div class="l"><small>display-xl · 56/60 · Archivo 800 w112</small><span class="t-display-xl" style="font-size:36px;line-height:1">Grizzlies @ Warriors</span></div>
      <div class="l"><small>title · 22/28 · Inter 650</small><span class="t-title">NBA League Pass 3</span></div>
      <div class="l"><small>body · 16/24 · Inter 500</small><span class="t-body">Star channels and start watching.</span></div>
      <div class="l"><small>label · 14/18 · caps</small><span><span class="t-label">Your team</span> &nbsp; <span class="t-live-pill">Live</span></span></div>
    </div>
    <p style="margin-top:12px">Kept: the pairing still suits the room. The wordmark's heavy wide grotesque and Archivo wdth 112 rhyme. npm: <code>@fontsource-variable/archivo</code> (standard.css), <code>@fontsource-variable/inter</code>; both SIL OFL 1.1.</p>
  </div>

  <div class="sec c6">
    <h2>Rules</h2>
    <div class="dodont"><ul>
      <li><b style="color:var(--t-success)">Do</b> mark only on bg-0/bg-1; amber bar + white needle; wordmark letters text-1.</li>
      <li><b style="color:var(--t-success)">Do</b> amber for the mark, one primary action per screen, selected nav, progress, "your team". Nothing else.</li>
      <li><b style="color:var(--t-success)">Do</b> focus = white 3px ring with a 2px canvas gap + lift. State = icon + word + colour, never colour alone.</li>
      <li><b style="color:var(--t-live-text)">Don't</b> set a second T next to the mark, or the word without its mark-T ("UNER" is not a wordmark by itself).</li>
      <li><b style="color:var(--t-live-text)">Don't</b> gradients, glows, shadows, scanlines, arcs, ribbons or a third colour on the mark.</li>
      <li><b style="color:var(--t-live-text)">Don't</b> use amber for warnings, red for buttons or errors, a status colour as a fill behind text, or pure #000 / #FFF surfaces.</li>
      <li><b style="color:var(--t-live-text)">Don't</b> rotate, outline or recolour the needle; keep it white (or currentColor in mono).</li>
    </ul></div>
  </div>

  <div class="screen sec c12" style="padding:18px">
    <h2 style="margin:6px 0 14px 12px">Sample TV screen · 960×540 canvas as seen on a 1080p panel</h2>
    <div class="tv"><img src="checks/tv-1080.png" style="width:100%;display:block" alt="Sample TV screen"></div>
  </div>

  <div class="foot"><span>Tuner brand v2.1 · design/brand-v2 · tokens.css · fonts under SIL OFL · generated by checks/build-board.js</span><span>mark.svg · wordmark.svg (UNER) · lockup.svg · icon-1024.svg · icon-foreground-108.svg · tv-banner.svg</span></div>
</div>
<script>
// hue wheel markers: conic-gradient puts hue h at h degrees clockwise from the top
const pts = [['neutrals 262', 262, '${P['outline']}', 1], ['accent 82', 82, '${P.accent}', 1], ['warning 56', 56, '${P.warning}', 0], ['live 25', 25, '${P.live}', 0], ['danger 3', 3, '${P.danger}', 0], ['success 160', 160, '${P.success}', 1]];
const w = document.getElementById('wheel'), R = 150, r = 112;
for (const [name, h, col, side] of pts) {
  const a = h * Math.PI / 180, x = R + Math.sin(a) * r, y = R - Math.cos(a) * r;
  const d = document.createElement('div'); d.className = 'dot'; d.style.cssText = 'left:' + x + 'px;top:' + y + 'px;background:' + col; w.appendChild(d);
  const l = document.createElement('div'); l.className = 'lab'; const lx = R + Math.sin(a) * 88, ly = R - Math.cos(a) * 88;
  l.textContent = name; l.style.cssText = 'left:' + lx + 'px;top:' + ly + 'px;transform:translate(-50%,-50%)'; l.style.display = 'none'; w.appendChild(l);
}
// complement axis
const ax = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); ax.setAttribute('viewBox', '0 0 300 300'); ax.style.cssText = 'position:absolute;inset:0';
const a1 = 82 * Math.PI / 180, a2 = 262 * Math.PI / 180;
ax.innerHTML = '<line x1="' + (150 + Math.sin(a1) * 112) + '" y1="' + (150 - Math.cos(a1) * 112) + '" x2="' + (150 + Math.sin(a2) * 112) + '" y2="' + (150 - Math.cos(a2) * 112) + '" stroke="${P['text-3']}" stroke-width="1.5" stroke-dasharray="4 4"/>';
w.appendChild(ax);
const legend = document.createElement('div'); legend.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;background:${P['bg-1']};padding:8px 12px;border-radius:10px;text-align:left;font-size:11px;line-height:1.7;color:${P['text-2']}';
legend.innerHTML = pts.map(p => '<span style="color:' + p[2] + '">●</span> ' + p[0]).join('<br>'); w.appendChild(legend);
</script>
</body></html>
`;
fs.writeFileSync(path.join(root, 'board.html'), html);
console.log('board.html written', html.length);
