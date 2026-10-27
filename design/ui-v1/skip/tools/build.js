// node tools/build.js   -> writes the skip mocks (*.html) next to SPEC.md, and tools/pages.json.
// Every mock is the 960 x 540 canvas linking the app's real CSS (tokens, ui.css, app.css), the subtitles' panel rows
// (../subtitles/subtitles.css) and skip.css, as design/ui-v1/subtitles/tools/build.js does.
// Scenario (SPEC 0): the owner's TV, Tue 27 Oct 2026, 21:30 Reykjavik time. Segment times are TheIntroDB's real answers,
// fetched with curl on 27 Oct 2026 (SPEC 9). The video is stand-in art; the subtitle lines are invented.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
global.window = global; require('../../kit/art.js');
const Art = global.Art;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const P = {
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
  pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>',
  // new glyph (SPEC 2.3): skipFwd, the mirror of catch-up's skipBack: a filled triangle and a bar
  skipFwd: '<path d="M4.5 5.2v13.6L15 12z" fill="currentColor" stroke="none"/><rect x="16.4" y="5" width="2.6" height="14" rx="1" fill="currentColor" stroke="none"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17.5 10.2a2.4 2.4 0 1 0 0 3.6"/>',
  audio: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  pic: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 9.5V8h2M17 14.5V16h-2"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
const kbd = (k) => `<span class="kbd">${k}</span>`;
const hint = (items) => `<div class="nv-hint">${items.map(([k, t]) => `<span>${kbd(k)}${t}</span>`).join('')}</div>`;
const video = (seed, style, hue) => `<div class="vid"><div class="art">${Art.art(seed, { style, hue })}</div></div>`;
const sub = (text, lift) => `<div class="nv-sub${lift ? ' sk-lift' : ''}">${esc(text)}</div>`;
const drain = (left) => `<div class="sk-drain"><i style="width:${left}%"></i></div>`;

// the Skip chip (SPEC 3.2): glyph, words, the OK key cap; the drain line shows how long it stays
const skipChip = (words, left) => `<div class="sk-chip">${ic('skipFwd')}<b>${esc(words)}</b>${kbd('OK')}${drain(left)}</div>`;
// the auto-skip chip (SPEC 4.2): what was skipped, from and to, OK to watch it
const skippedChip = (words, span, left) => `<div class="sk-chip two">${ic('skipFwd')}<div class="tx"><b>${esc(words)}</b><small>${esc(span)}</small></div>${kbd('OK')}<span class="t-cap">watch it</span>${drain(left)}</div>`;
// Up next as built (PlayerActivity.showUpNext): ring, "Next episode in N s", the episode, OK play now
const upNext = (secs, ep) => {
  const off = (94.2 * (1 - secs / 15)).toFixed(1);
  return `<div class="nv-chip"><svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke="#3D3B45" stroke-width="4"/><circle cx="20" cy="20" r="15" fill="none" stroke="#F95BAC" stroke-width="4" stroke-dasharray="94.2" stroke-dashoffset="${off}" transform="rotate(-90 20 20)"/></svg><div class="grow" style="white-space:nowrap;min-width:0"><b>Next episode in ${secs} s</b><span style="overflow:hidden;text-overflow:ellipsis">${esc(ep)}</span></div>${kbd('OK')}<span class="t-cap" style="color:var(--a-text-1)">play now</span></div>`;
};

const pages = [];
function page(file, title, note, body) {
  pages.push({ file, title, note });
  fs.writeFileSync(path.join(root, file), `<!doctype html>
<html lang="en" class="tv"><head><meta charset="utf-8"><meta name="viewport" content="width=960,height=540"><meta name="mock-size" content="960x540@2">
<title>${esc(title)}</title>
<link rel="stylesheet" href="../../../app/tv/brand/fonts.css"><link rel="stylesheet" href="../../../app/tv/brand/tokens.css">
<link rel="stylesheet" href="../../../app/tv/ui.css"><link rel="stylesheet" href="../../../app/tv/app.css"><link rel="stylesheet" href="../subtitles/subtitles.css"><link rel="stylesheet" href="skip.css">
</head><body><div class="screen">
${body}
</div></body></html>
`);
}

// 1. Skip intro, button mode, controls hidden. It's Always Sunny S1 E1: intro 1:44.0 to 2:11.6; now 1:47 (3 s of its 10 s gone)
page('player-skip.html', 'Skip intro', 'It\'s Always Sunny S1 E1 at 1:47. The intro runs 1:44 to 2:11 (TheIntroDB). The chip stays 10 s; OK skips to 2:11. The hint bar shows the first 5 times.',
  `${video('sunny-intro', 'retro', 28)}
${skipChip('Skip intro', 70)}
${hint([['OK', 'Skip intro'], ['◀ ▶', 'Seek 10 s'], ['▲', 'Buttons'], ['Back', 'Hide']])}`);

// 2. The controls are up during the intro: Skip intro is in the button row and ▲ lands on it; the seek bar shows the gaps
const D = 1321; // S1 E1 runs 22:01 on this copy (illustrative); credits from 21:28 (TheIntroDB)
const pc = (s) => (s / D * 100).toFixed(2);
page('player-skip-bar.html', 'Skip intro in the button row', 'The controls are up during the intro (▲ pressed at 1:52). The floating chip moves into the row and ▲ lands on it. Small gaps on the bar mark the intro and the credits; no labels.',
  `${video('sunny-intro', 'retro', 28)}
<div class="nv-vtop"><div><b>It's Always Sunny in Philadelphia</b><div class="st-what">S1 · E1 · The Gang Gets Racist</div></div><span class="t-cap" style="margin-left:auto">Ends at 21:50</span></div>
<div class="nv-vbar"><div class="row-flex" style="gap:10px;margin-bottom:12px"><span class="vb">${ic('pause')}</span><span class="vb t">−10</span><span class="vb t">+10</span><span class="vb sk-pill f">${ic('skipFwd')}Skip intro</span><span class="vb sk-pill">${ic('chevR')}Next episode</span><span class="grow"></span><span class="vb sm">${ic('cc')}</span><span class="vb sm">${ic('audio')}</span><span class="vb sm">${ic('pic')}</span></div>
<div class="seek"><i style="width:${pc(112)}%"></i><span class="sk-gap" style="left:${pc(104)}%"></span><span class="sk-gap" style="left:${pc(131.6)}%"></span><span class="sk-gap" style="left:${pc(1288)}%"></span><b style="left:${pc(112)}%"></b></div><div class="row-flex t-cap" style="justify-content:space-between;margin-top:10px"><span>1:52</span><span>-20:09</span></div></div>
${hint([['◀ ▶', 'Move'], ['OK', 'Choose'], ['▼', 'Seek bar'], ['Back', 'Hide']])}`);

// 3. Skip automatically: S1 E2's intro (1:19 to 1:46) was skipped; the chip offers it back for 5 s; the subtitles rise above it
page('player-skipped.html', 'Skipped automatically', 'Skip automatically is on. S1 E2\'s intro (1:19 to 1:46) was skipped; for 5 s OK goes back to 1:19. The subtitle line rises above the chip while it shows.',
  `${video('sunny-bar', 'theatre', 30)}
${sub('So we are all agreed on the plan, then.', true)}
${skippedChip('Intro skipped', '1:19 to 1:46', 55)}
${hint([['OK', 'Watch it'], ['◀ ▶', 'Seek 10 s'], ['▲', 'Buttons'], ['Back', 'Hide']])}`);

// 4. Skip recap: Lost S2 E1, recap 0:02 to 0:28 (TheIntroDB); now 0:06; the hint bar has gone (after 5 views) and the chip's key cap carries OK
page('player-recap.html', 'Skip recap', 'Lost S2 E1 at 0:06. The recap runs 0:02 to 0:28. Recaps have speech, so the subtitles show and rise above the chip. After 5 views the hint bar stops; the key cap on the chip says what OK does.',
  `${video('lost-recap', 'forest', 150)}
${sub('Previously on Lost', true)}
${skipChip('Skip recap', 60)}`);

// 5. Up next at the credits: S1 E1's credits start at 21:28 (TheIntroDB); no speech after it, so the 15 s count starts there
page('player-upnext-credits.html', 'Up next when the credits start', 'S1 E1 at 21:30. The credits start at 21:28 (TheIntroDB) and no one speaks after it, so Up next comes then (not 40 s from the end) and counts 15 s. Unchanged: OK plays now, Back stays on this one.',
  `${video('sunny-credits', 'city', 250)}
${upNext(13, 'S1 · E2 · Charlie Wants an Abortion')}
${hint([['OK', 'Play now'], ['Back', 'Stay on this one']])}`);

// 6. The setting, in the player: Options (▼) > Skip intros. Same setting as Account > Playback
page('player-options-skip.html', 'Options > Skip intros', 'From ▼ Options in an episode. The same setting as Account > Playback > Skip intros. The foot says whether this episode is known.',
  `${video('sunny-intro', 'retro', 28)}
<div class="nv-panel left sk-panel"><div class="nv-h">Skip intros and recaps</div>
<div class="nv-row st-r f"><span class="rd on"></span><div class="grow"><div class="a">Show a button</div><div class="b">One press skips it</div></div></div>
<div class="nv-row st-r"><span class="rd"></span><div class="grow"><div class="a">Skip automatically</div><div class="b">You can go back for 5 s</div></div></div>
<div class="nv-row st-r"><span class="rd"></span><div class="grow"><div class="a">Off</div><div class="b">No buttons</div></div></div>
<div class="st-foot">This episode: intro and credits known.<br>Times come from TheIntroDB, made by viewers. Some episodes are missing.</div></div>
${hint([['OK', 'Choose'], ['▲ ▼', 'Move'], ['Back', 'Up one level']])}`);

fs.writeFileSync(path.join(root, 'tools', 'pages.json'), JSON.stringify(pages, null, 1) + '\n');
console.log('wrote', pages.length, 'mocks');
