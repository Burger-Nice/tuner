// node tools/build.js   -> writes the subtitles + real-quality mocks (*.html) next to SPEC.md, and tools/pages.json.
// Every mock is the 960 x 540 canvas linking the app's real CSS (tokens, ui.css, app.css) plus subtitles.css, as
// design/ui-v1/diagnosis/tools/build.js. Focus is marked with the kit classes: .f (ring + lift), .f-ring, .f-in, and
// .nv-row.f (the native panels' inset ring).
// Scenario (SPEC 0): the owner's TV, Tue 27 Oct 2026, 21:30 Reykjavik time (UTC). Settings > Languages: English,
// Icelandic; Subtitles: Always; Sound descriptions: Leave out.
// Real data (checked with curl on 27 Oct 2026, SPEC 10): Oppenheimer is tt15398776 with 96 OpenSubtitles files in 33
// languages, 6 English (2 of them with sound descriptions) and 1 Icelandic, which was timed for a copy that runs 4.27%
// faster; Severance S1 E1 (tt11280740:1:1) has 2 English and no Icelandic; Cinemeta's search for "konungur ljonanna"
// returns The Lion King (1994), The Lion King (2019) and Mufasa: The Lion King (2024).
// Illustrative: the provider's copies of Oppenheimer, their names, sizes and what the check finds in them.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
global.window = global; require('../../kit/art.js');
const Art = global.Art;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- icons (app/tv/js/util.js names where they exist) ----------
const P = {
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>', chevR: '<path d="M9 5l7 7-7 7"/>', chevD: '<path d="M5 9l7 7 7-7"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9"/>',
  star: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9z" fill="currentColor" stroke="none"/>',
  saved: '<path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4-6.5 4V4.5a1 1 0 0 1 1-1z"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M3 15h18"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17.5 10.2a2.4 2.4 0 1 0 0 3.6"/>',
  audio: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  pic: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 9.5V8h2M17 14.5V16h-2"/>',
  quality: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 15V9M7 12h3.5M10.5 9v6M14 9v6h1.5a3 3 0 0 0 0-6z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/>',
  sort: '<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>',
  filters: '<path d="M4 7h8M18 7h2M4 17h2M12 17h8"/><circle cx="15" cy="7" r="2.5"/><circle cx="9" cy="17" r="2.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5"/>',
  // new (SPEC 2.3): timing = a clock with an arrow either side; globe = from the internet (OpenSubtitles)
  timing: '<circle cx="12" cy="13" r="7"/><path d="M12 9.5V13l2.2 1.6M2.5 6.5L5 4M21.5 6.5L19 4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z"/>',
  speed: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/>', speed2: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
const dot = '<span class="dot-sep"></span>';
const TK = `<span class="st-tk"><svg viewBox="0 0 24 24">${P.check}</svg></span>`;
const kbd = (k) => `<span class="kbd">${k}</span>`;
// quality tags: ok = checked by airglow (filled, tick), name = only the provider's name says so (dashed outline)
const qt = (t, ok = true) => `<span class="tag ${ok ? 'st-ok' : 'st-name'}" data-q="${ok ? 'checked' : 'named'}">${ok ? TK : ''}${esc(t)}</span>`;
const tagPlain = (t) => `<span class="tag">${esc(t)}</span>`;

// ---------- the copies of Oppenheimer on the provider (illustrative; SPEC 0). Ranked by SPEC 5.4 ----------
// score: plays on this TV, then resolution class (a 4K copy under 8 Mb/s counts as 1080p), HDR, then bitrate, then sound
const COPIES = [
  { id: 'a', name: 'EN| Oppenheimer 4K', res: '4K', px: '3840 × 1600', hdr: 'HDR10', mbps: 16.0, snd: 'Dolby Digital Plus 5.1', plays: true, gb: 21.6, rank: 1 },
  { id: 'b', name: 'EN| Oppenheimer FHD', res: '1080p', px: '1920 × 800', hdr: '', mbps: 7.3, snd: 'Dolby Digital 5.1', plays: true, gb: 9.8, rank: 2, inFile: ['English', 'Spanish'] },
  { id: 'c', name: 'EN| Oppenheimer (2023) 4K UHD', res: '1080p', px: '1920 × 800', hdr: '', mbps: 3.0, snd: 'stereo', plays: true, gb: 4.1, rank: 3, named: '4K' },
  { id: 'd', name: 'MULTI| Oppenheimer 2160p DV', res: '4K', px: '3840 × 2160', hdr: 'Dolby Vision', mbps: 25.6, snd: 'DTS-HD 5.1', plays: false, gb: 34.5, rank: 4, why: 'No sound on this TV: DTS-HD is its only sound' },
];
const qline = (c) => [c.res, c.hdr, `${c.mbps.toFixed(c.mbps < 10 ? 1 : 0)} Mb/s`].filter(Boolean).join(' · ');

// ---------- page shell ----------
function topbar(sel) {
  const tabs = [['search', 'Search'], ['home', 'Home'], ['live', 'Live'], ['nba', 'NBA'], ['movie', 'Movies'], ['series', 'Series'], ['saved', 'Saved']];
  return `<div class="topbar" data-row="topbar"><img src="../../../app/tv/brand/assets/mark-small.svg" class="mk" alt=""><div class="tabs">${tabs.map(([k, l]) => `<span class="tab${k === 'search' ? ' srch' : ''}${k === sel ? ' sel' : ''}">${k === 'search' ? ic('search') : ''}${l}</span>`).join('')}</div><div class="tb-r"><span class="avatar">${ic('user')}</span></div></div>`;
}
const pages = [];
function page(file, title, body, note, { group = '' } = {}) {
  fs.writeFileSync(path.join(root, file), `<!doctype html>
<html lang="en" class="tv"><head><meta charset="utf-8"><meta name="viewport" content="width=960,height=540"><meta name="mock-size" content="960x540@2">
<title>${esc(title)}</title>
<link rel="stylesheet" href="../../../app/tv/brand/fonts.css"><link rel="stylesheet" href="../../../app/tv/brand/tokens.css">
<link rel="stylesheet" href="../../../app/tv/ui.css"><link rel="stylesheet" href="../../../app/tv/app.css"><link rel="stylesheet" href="subtitles.css">
</head><body><div class="screen">
${body}
</div></body></html>
`);
  pages.push({ file, title, note, group });
}
const G1 = 'On the title page', G2 = 'Around the app', G3 = 'In the player';

// ---------- the title page (app/tv/js/screens/detail.js markup, plus the new pills and source line, SPEC 4) ----------
function wide(seed, name, year, i, style) { return `<div class="wc" data-i="${i}"><div class="art">${Art.art(seed, style ? { style } : {})}</div><div class="tx"><b>${esc(name)}</b><span>${year}</span></div></div>`; }
const MORE_OPP = [['Killers of the Flower Moon', 2023, 'sun'], ['The Holdovers', 2023, 'city'], ['Past Lives', 2023, 'city'], ['Poor Things', 2023, 'theatre'], ['Napoleon', 2023, 'sun']];
function detail({ eyebrow, title, meta, tags, plot, credits = '', play = 'Play', focus = 'play', pills, src, below, art = ['oppenheimer', 'sun', 280], overlay = '' }) {
  const f = (k) => (focus === k ? (k === 'play' || k === 'save' ? ' f' : ' f-ring') : '');
  const btns = `<div class="row-flex" data-row style="gap:20px;margin-top:20px;height:44px;padding-left:2px"><span class="btn${f('play')}" data-act="play">${ic('play')}${play}</span><span class="btn2${f('save')}" data-act="save">${ic('saved')}Save</span></div>`;
  return `<div class="d-back"><div class="art">${Art.art(art[0], { style: art[1], hue: art[2] })}</div><div class="d-scrim"></div></div><div class="d-scrim2"></div>
<div class="d-col">
  <div class="t-label t-2">${eyebrow}</div>
  <div class="t-display clamp2" style="margin-top:6px">${esc(title)}</div>
  <div class="metaline" style="margin-top:10px">${meta}${tags ? dot + tags : ''}</div>
  <div style="margin-top:12px"><div class="t-body clamp2" style="width:460px">${esc(plot)}</div></div>
  ${credits ? `<div class="t-cap ellipsis" style="margin-top:8px;width:500px">${credits}</div>` : ''}
  ${btns}
  <div class="st-pills" data-row>${pills(f)}</div>
  ${src ? `<div class="st-src">${src}</div>` : ''}
</div>${below || ''}${overlay}`;
}
const oppMeta = `<span class="star">${ic('star')}8.2</span>${dot}<span>2023</span>${dot}<span>3 h 0 min</span>`;
const oppPlot = 'J. Robert Oppenheimer leads the Manhattan Project, then faces a hearing that puts his loyalty on trial.';
const oppCred = `Directed by <span class="t-2">Christopher Nolan</span>${dot}<span class="t-2">Cillian Murphy, Emily Blunt</span>`;
const moreRow = (top = 392) => `<div class="abs rowtitle" style="left:48px;top:${top}px;font-size:20px">More like this</div><div class="rail abs" style="top:${top + 34}px;left:0;right:0"><div class="track" data-row>${MORE_OPP.map(([n, y, s], i) => wide(n, n, y, i, s)).join('')}</div></div>`;
const verPill = (f, label, n = 4) => `<span class="pillbtn${f('ver')}" data-act="version">${ic('film')}${label}<span class="t-cap" style="color:var(--a-text-2)">best of ${n}</span>${ic('chevD')}</span>`;
const subPill = (f, label, cls = '') => `<span class="pillbtn${cls}${f('subs')}" data-act="subs">${ic('cc')}${label}</span>`;

// 1. ready
page('detail-ready.html', 'Title page: checked, subtitles ready', detail({
  eyebrow: `Movie${dot}Drama · History`, title: 'Oppenheimer', meta: oppMeta, plot: oppPlot, credits: oppCred,
  tags: `${qt('4K')}${qt('HDR10')}${qt('5.1')}`,
  pills: (f) => `${verPill(f, `${TK}4K HDR10`)}${subPill(f, 'Subtitles: EN · IS')}`,
  src: `${ic('globe', 'xs')}<span><b>EN</b> and <b>IS</b> from OpenSubtitles${dot}none in this copy's file</span>`,
  below: moreRow(),
}), 'The tags now say what the copy really is: airglow read its first and last 64 KB (SPEC 5). Filled tags with a tick are checked, so the Version pill names the real best copy ("best of 4"). Subtitles: English is on; Icelandic is ready for the player. The line under the pills names the source.', { group: G1 });

// 2. checking (first visit)
page('detail-checking.html', 'Title page: first visit, checking', detail({
  eyebrow: `Movie${dot}Drama · History`, title: 'Oppenheimer', meta: oppMeta, plot: oppPlot, credits: oppCred,
  tags: `${qt('4K', false)}`,
  pills: (f) => `<span class="pillbtn st-wait${f('ver')}" data-act="version">${ic('film')}Checking copies · 2 of 4</span>${subPill(f, 'Subtitles: looking…', ' st-wait')}`,
  src: `<span class="st-run"><i style="width:50%"></i></span><span>Reading each copy's first and last 64 KB, one at a time</span>`,
  below: moreRow(),
}), 'Until a copy is checked, the tag is what the name says: dashed, no tick. The checks run one copy at a time (SPEC 5.3: never more streams than the provider allows). Play stays focused and works: it plays the best copy known by then and waits at most 3 s for a check already running.', { group: G1 });

// 3. the Copies menu
const copyRow = (c, { f = false, on = false } = {}) => `<div class="lr st-two${c.plays ? '' : ' st-bad'}${f ? ' f-ring' : ''}" data-q="checked" data-rank="${c.rank}"><span class="rd${on ? ' on' : ''}"></span><span class="grow"><span class="a">${TK}${qline(c)}${c.rank === 1 ? '' : ''}</span><span class="b">${c.plays ? '' : '<em>No sound on this TV</em> · '}${c.named ? `<em>Named ${c.named}</em> · ` : ''}${c.plays ? c.snd : 'DTS-HD only'} · ${c.gb} GB${dot}“${esc(c.name)}”</span></span>${c.rank === 1 ? '<span class="tag q st-best">Best</span>' : ''}</div>`;
page('detail-copies.html', 'The Copies menu', detail({
  eyebrow: `Movie${dot}Drama · History`, title: 'Oppenheimer', meta: oppMeta, plot: oppPlot, credits: oppCred,
  tags: `${qt('4K')}${qt('HDR10')}${qt('5.1')}`, focus: 'none',
  pills: (f) => `${verPill(f, `${TK}4K HDR10`)}${subPill(f, 'Subtitles: EN · IS')}`,
  below: moreRow(),
  overlay: `<div class="scrim"></div><div class="menu st-copies" style="left:48px;top:40px"><h3>Copies of Oppenheimer<small>Checked today 21:02</small></h3><div data-col>
  <div class="lr st-two f-ring"><span class="rd on"></span><span class="grow"><span class="a">Always the best copy</span><span class="b">Now: 4K · HDR10 · 16 Mb/s. Changes if a better copy shows up</span></span></div>
  <div class="st-sep"></div>${COPIES.map((c) => copyRow(c)).join('')}</div>
  <div class="st-foot">Picking a copy keeps it for this film. A 4K copy under 8 Mb/s is ranked as 1080p.</div></div>`,
}), 'OK on the Version pill. "Always the best copy" is the default and is focused. Every copy shows what the check found, not its name: the "4K UHD" one is really 1080p at 3 Mb/s, and the Dolby Vision one ranks last because this TV has no way to play its only sound track. The name is still there, in quotes, at the end.', { group: G1 });

// 4. the Subtitles sheet
const sheetRow = (on, a, b, { f = false, v = '' } = {}) => `<div class="lr st-two${f ? ' f-ring' : ''}">${on == null ? '' : `<span class="rd${on ? ' on' : ''}"></span>`}<span class="grow"><span class="a">${a}</span>${b ? `<span class="b">${b}</span>` : ''}</span>${v ? `<span class="v">${v}${ic('chevR', 'sm')}</span>` : ''}</div>`;
page('detail-subs-sheet.html', 'The Subtitles sheet', detail({
  eyebrow: `Movie${dot}Drama · History`, title: 'Oppenheimer', meta: oppMeta, plot: oppPlot, credits: oppCred,
  tags: `${qt('4K')}${qt('HDR10')}${qt('5.1')}`, focus: 'none',
  pills: (f) => `${verPill(f, `${TK}4K HDR10`)}${subPill(f, 'Subtitles: EN · IS')}`,
  below: moreRow(),
  overlay: `<div class="scrim"></div><div class="sheet st-sheet"><h3>Subtitles</h3><div class="t-cap" style="margin-top:-4px">Oppenheimer (2023), matched on IMDb</div><div data-col>
  <div class="sec">Your languages</div>
  ${sheetRow(true, 'English', `${TK}OpenSubtitles · timing fits this copy`, { f: true })}
  ${sheetRow(false, 'Icelandic', `${TK}OpenSubtitles · timing fixed for this copy`)}
  ${sheetRow(false, 'Off', '')}
  <div class="sec">More</div>
  ${sheetRow(null, 'Other languages', '', { v: '31' })}
  ${sheetRow(null, 'Not this film?', 'Match it again', { v: '' })}
  </div><div class="st-note">This copy has no subtitles in its file. airglow lines up downloaded ones with the copy before they show.</div></div>`,
}), 'OK on the Subtitles pill. Your languages first, with where each comes from and whether its timing was checked. The pick is for this film and goes with you into the player. "Not this film?" re-opens the match (next mocks). The default for every film is in Account > Settings > Languages.', { group: G1 });

// 5. which film? (Cinemeta couldn't decide: two films with the same name and no year from the provider)
const lionPlot = 'Með íslensku tali. Ljónsunginn Simbi á að verða konungur.';
page('detail-which-film.html', 'Subtitles: which film is it?', detail({
  eyebrow: `Movie${dot}Kids · Animation`, title: 'Konungur ljónanna', meta: `<span>No year from your provider</span>`, plot: lionPlot,
  tags: `${tagPlain('IS')}${dot}${qt('1080p', false)}`, focus: 'subs', art: ['lion', 'sun', 250],
  pills: (f) => `${subPill(f, 'Subtitles: which film is it?')}`,
  src: `<span>Two films have this name. OK to pick the right one</span>`,
}), 'The IMDb match needs a name and a year. The provider gives "IS| Konungur ljónanna" with no year, and Cinemeta finds The Lion King twice (1994 and 2019, real result, SPEC 10.2). airglow doesn\'t guess. Only the file\'s own subtitles are used until you pick.', { group: G1 });

// 6. the match menu
page('detail-match.html', 'Which film is this?', detail({
  eyebrow: `Movie${dot}Kids · Animation`, title: 'Konungur ljónanna', meta: `<span>No year from your provider</span>`, plot: lionPlot,
  tags: `${tagPlain('IS')}${dot}${qt('1080p', false)}`, focus: 'none', art: ['lion', 'sun', 250],
  pills: (f) => `${subPill(f, 'Subtitles: which film is it?')}`,
  overlay: `<div class="scrim"></div><div class="menu st-match" style="left:48px;top:44px"><h3>Which film is this?</h3><div class="st-q">From the Cinemeta search for “Konungur ljónanna”</div><div data-col>
  ${sheetRow(null, 'The Lion King', '1994 · animated · 1 h 28 min', { f: true })}
  ${sheetRow(null, 'The Lion King', '2019 · computer-animated · 1 h 58 min')}
  ${sheetRow(null, 'Mufasa: The Lion King', '2024 · 1 h 58 min')}
  ${sheetRow(null, 'Search by another name', '', { v: '' })}
  ${sheetRow(null, 'None of these', 'Use only the subtitles in the file')}
  </div><div class="st-foot">Your pick is remembered for this title. It also gives the page its IMDb rating.</div></div>`,
}), 'Each row has the year and the length, so you can tell the films apart (this copy runs 1 h 28 min, so it\'s the 1994 film: the check in SPEC 5 found its length). The first result is focused because it is the closest length, never because it came first. "None of these" turns OpenSubtitles off for this title.', { group: G1 });

// 7. the add-on down
page('detail-subs-down.html', 'Subtitles: OpenSubtitles isn\'t answering', detail({
  eyebrow: `Movie${dot}Drama · History`, title: 'Oppenheimer', meta: oppMeta, plot: oppPlot, credits: oppCred,
  tags: `${qt('4K')}${qt('HDR10')}${qt('5.1')}`,
  pills: (f) => `${verPill(f, `${TK}4K HDR10`)}${subPill(f, 'Subtitles: none yet', ' st-wait')}`,
  src: `<span>OpenSubtitles isn't answering${dot}trying again at 21:31</span>`,
  below: moreRow(),
}), 'The add-on is down (or slow: 8 s). The page says so and when it tries again; nothing to press. Play still works: subtitles that come in later appear in the player, which says so once (SPEC 7.6). Lists already downloaded for a film are kept for 2 days, so a film you opened before still has them.', { group: G1 });

// 8. series (episode level: EN only)
const EPS = [[1, 'Good News About Hell', '57 min'], [2, 'Half Loop', '52 min'], [3, 'In Perpetuity', '50 min'], [4, 'The You You Are', '47 min'], [5, 'The Grim Barbarity of Optics and Design', '50 min']];
const epCard = ([n, t, d], i) => `<div class="ep" data-ep="${i}"><div class="th${i === 0 ? ' f' : ''}"><div class="art">${Art.art('sev' + n, { style: 'city', hue: 200 })}</div><span class="num">${n}</span></div><div class="eb"><b>${esc(t)}</b><span>${d}</span></div></div>`;
page('detail-series.html', 'A series: subtitles per episode', `<div class="d-back"><div class="art">${Art.art('severance', { style: 'city', hue: 200 })}</div><div class="d-scrim"></div></div><div class="d-scrim2" style="height:300px"></div>
<div class="d-col" style="top:32px">
  <div class="t-label t-2">Series${dot}Drama · Mystery · Sci-Fi</div>
  <div class="t-display clamp2" style="margin-top:6px">Severance</div>
  <div class="metaline" style="margin-top:10px"><span class="star">${ic('star')}8.6</span>${dot}<span>2022</span>${dot}<span>2 seasons</span>${dot}${qt('4K')}${qt('HDR')}</div>
  <div class="row-flex" data-row style="gap:20px;margin-top:16px;height:44px;padding-left:2px"><span class="btn" data-act="play">${ic('play')}Play S1 · E1</span><span class="btn2" data-act="save">${ic('saved')}Save</span>${subPill(() => '', 'Subtitles: EN')}</div>
  <div class="st-src">${ic('globe', 'xs')}<span><b>EN</b> from OpenSubtitles for S1 · E1${dot}no Icelandic for this episode</span></div>
</div>
<div class="abs seas" style="left:48px;right:48px;top:226px"><span class="chip lg sel">Season 1</span><span class="chip lg">Season 2</span><span class="t-cap" style="align-self:center;margin-left:8px;white-space:nowrap">9 episodes</span></div>
<div class="rail abs" style="top:276px;left:0;right:0"><div class="track" data-row style="gap:24px">${EPS.map(epCard).join('')}</div></div>
<div class="abs epsyn" style="left:48px;top:462px;width:864px"><b>E1 · Good News About Hell</b>${dot}Helly wakes up on a conference room table with no memory of who she is.</div>`,
'Series: the pill and the line follow the focused episode (subtitles are found per episode: tt11280740:1:1, real result: 2 English, no Icelandic). The tags are the checked episode copy. One request per episode, made when the episode is focused for 1 s or played.', { group: G1 });

// ---------- Movies grid: poster tags (SPEC 6.1) ----------
const POSTERS = [
  { n: 'Oppenheimer', y: 2023, r: 8.2, s: 'sun', h: 280, tl: [['4K', 1]], tr: '+3' },
  { n: 'Dune: Part Two', y: 2024, r: 8.5, s: 'sun', h: 230, tl: [['HD', 1]], tr: '+1', f: 1 },
  { n: 'Poor Things', y: 2023, r: 7.8, s: 'theatre', tl: [['4K', 0]] },
  { n: 'The Holdovers', y: 2023, r: 7.9, s: 'city', tl: [] },
  { n: 'Killers of the Flower Moon', y: 2023, r: 7.6, s: 'sun', h: 200, tl: [['4K', 0]], tr: '+1' },
  { n: 'Past Lives', y: 2023, r: 7.8, s: 'city', h: 210, tl: [['HD', 1]] },
  { n: 'Anatomy of a Fall', y: 2023, r: 7.7, s: 'studio', tl: [] },
  { n: 'The Zone of Interest', y: 2023, r: 7.3, s: 'pitch', tl: [['HD', 0]] },
  { n: 'Godzilla Minus One', y: 2023, r: 7.7, s: 'city', h: 180, tl: [['4K', 1]] },
  { n: 'Barbie', y: 2023, r: 6.8, s: 'sun', h: 300, tl: [['4K', 0]], tr: '+2' },
  { n: 'Civil War', y: 2024, r: 7.0, s: 'city', h: 10, tl: [] },
  { n: 'Challengers', y: 2024, r: 7.1, s: 'pitch', h: 140, tl: [['HD', 1]] },
];
const pc = (p, i) => `<div class="pc${p.f ? ' fc' : ''}" data-c="${i % 6}"><div class="box${p.f ? ' f' : ''}"><div class="art">${Art.poster(p.n, { style: p.s, hue: p.h })}</div>${p.tl.length ? `<div class="tl">${p.tl.map(([t, ok]) => qt(t, !!ok)).join('')}</div>` : ''}${p.tr ? `<div class="tr">${tagPlain(p.tr)}</div>` : ''}</div><div class="cap">${esc(p.n)}</div><div class="cm">${p.y} · ★ ${p.r.toFixed(1)}</div></div>`;
page('movies-tags.html', 'Movies: checked and named tags', `${topbar('movie')}<div class="lib-head"><span class="t-head">Movies</span><span class="t-cap" style="margin-top:6px">11 204 titles${dot}English first</span><span class="grow"></span>
<span class="pillbtn">${ic('sort')}Sort<b>Popular</b></span><span class="pillbtn">${ic('filters')}Filters</span><span class="pillbtn">${ic('chevD')}Jump</span></div>
<div class="lib-chips"><span class="chip lg sel">All</span><span class="chip lg">New in English</span><span class="chip lg">Top rated</span><span class="chip lg">4K</span><span class="chip lg">Drama</span><span class="chip lg">Action</span><span class="chip lg">Kids</span></div>
<div class="lib-grid bleed" style="top:176px">${POSTERS.map(pc).join('')}</div><div class="edgefade"></div>`,
'A filled tag with a tick is what airglow found in the best copy; a dashed one is only the provider\'s name. Dune: Part Two\'s copies are named 4K, but both checked as 1080p, so its tag is HD (and it leaves the 4K chip). Checks run in the background when nothing plays (SPEC 5.3), so the ticks spread over the titles you look at.', { group: G2 });

// ---------- Account > Settings > Languages (SPEC 6.2) ----------
const arow = (t, v, sub = '', f = false) => `<div class="arow${f ? ' f-ring' : ''}"><span class="grow" style="min-width:0">${t}${sub ? `<div class="t-cap" style="margin-top:0">${sub}</div>` : ''}</span><span class="av">${v} ${ic('chevR', 'sm')}</span></div>`;
page('account-languages.html', 'Account: Languages', `${topbar('')}<div class="abs" style="left:48px;top:90px;width:200px">${['Provider', 'Playback', 'Sound', 'NBA', 'Languages', 'Home rows', 'Updates', 'About'].map((g) => `<div class="gl${g === 'Languages' ? ' sel' : ''}">${g}</div>`).join('')}</div>
<div class="abs" style="left:260px;top:84px;width:652px;padding:6px 12px;box-sizing:border-box"><div class="t-title" style="margin-bottom:10px">Languages</div>
${arow('Shown first', 'English, Icelandic', 'Movies and series in these come first')}
${arow('Subtitles', 'Always', 'Always, only when the sound isn\'t in your language, or off', true)}
${arow('Subtitle languages', 'English, Icelandic', 'The first one found shows. The others wait in the player')}
${arow('Sound descriptions', 'Leave out', 'Lines like [door slams] for people who can\'t hear the sound')}
${arow('Subtitles from OpenSubtitles', 'On', 'When the file has none in your languages')}
</div>`, 'The one place for the defaults. "Subtitles" gets a third choice, "Only when the sound isn\'t in your language". Subtitle languages default to Shown first and can be set apart (English sound with Icelandic subtitles). Sound descriptions are the [rain pattering] files (2 of the 6 English ones for Oppenheimer).', { group: G2 });

// =====================================================================================================================
// THE PLAYER (native)
// =====================================================================================================================
const video = (seed, style, hue) => `<div class="vid"><div class="art">${Art.art(seed, style ? { style, hue } : {})}</div></div>`;
const hint = (items) => `<div class="nv-hint">${items.map(([k, t]) => `<span><span class="kbd">${k}</span>${t}</span>`).join('')}</div>`;
const sub = (lines) => `<div class="nv-sub">${lines.map(esc).join('<br>')}</div>`;
const head = (t) => `<div class="nv-row dis st-head">${t}</div>`;
const rrow = (a, b, { on = false, f = false, dis = false } = {}) => `<div class="nv-row st-r${b ? '' : ' st-1'}${f ? ' f' : ''}${dis ? ' dis' : ''}"><span class="rd${on ? ' on' : ''}"></span><div class="grow"><div class="a">${a}</div>${b ? `<div class="b">${b}</div>` : ''}</div></div>`;
const vrow = (icn, a, b, v, { f = false, dis = false } = {}) => `<div class="nv-row st-r${b ? '' : ' st-1'}${f ? ' f' : ''}${dis ? ' dis' : ''}"><span class="ico">${ic(icn, 'sm')}</span><div class="grow"><div class="a">${a}</div>${b ? `<div class="b">${b}</div>` : ''}</div>${v != null ? `<span class="v">${v}${ic('chevR', 'sm')}</span>` : ''}</div>`;

// 12. the start of a film: what plays, in real terms
page('player-start.html', 'Play: the best copy starts', `${video('oppenheimer', 'sun', 280)}<div class="nv-vtop"><div><b>Oppenheimer</b><div class="st-what">${TK}4K · HDR10 · Dolby Digital Plus 5.1${dot}best of 4 copies${dot}English subtitles</div></div><span class="t-cap" style="margin-left:auto">Ends at 00:31</span></div>
<div class="nv-vbar"><div class="row-flex" style="gap:10px;margin-bottom:12px"><span class="vb">${ic('play')}</span><span class="vb t">−10</span><span class="vb t">+10</span><span class="grow"></span><span class="vb sm">${ic('cc')}</span><span class="vb sm">${ic('audio')}</span><span class="vb sm">${ic('pic')}</span></div>
<div class="seek"><i style="width:0.2%"></i><b class="thumbf" style="left:0.2%"></b></div><div class="row-flex t-cap" style="justify-content:space-between;margin-top:10px"><span>0:12</span><span>-2:59:48</span></div></div>
${hint([['OK', 'Pause'], ['◀ ▶', 'Seek 10 s'], ['▲', 'Buttons'], ['▼', 'Options'], ['Back', 'Hide']])}`,
'The controls show for 4 s when a film starts (as today). The title block gets one line: what the check found in the copy that is playing, that it was the best of 4, and the subtitles that are on. If you picked a copy by hand it says "your pick" instead of "best of 4".', { group: G3 });

// 13. Options > Subtitles (downloaded only)
page('player-subs.html', 'Options > Subtitles', `${video('oppenheimer', 'sun', 280)}<div class="nv-panel left st-panel"><div class="nv-h">Subtitles</div>
${rrow('Off', '')}
${head('From OpenSubtitles')}
${rrow('English', `${TK}Timing fits this copy`, { on: true })}
${rrow('Icelandic', `${TK}Timing fixed: it was made for a faster copy`, { f: true })}
${rrow('English, with sound descriptions', '[rain pattering] and who is speaking')}
${vrow('globe', 'Other languages', '', '31')}
${vrow('timing', 'Early or late', 'For the subtitles on now', 'As downloaded')}
<div class="st-foot">None in this copy's file. Remembered for this film.</div></div>${hint([['OK', 'Choose'], ['▲ ▼', 'Move'], ['Back', 'Up one level']])}`,
'CC, or ▼ then Subtitles. Rows say where each comes from and what the timing check found (SPEC 7.3). The Icelandic file was timed for a copy that runs 4% faster (real: its lines drift 7 min over the film); airglow stretched it to fit, which no early/late step can do. "Subtitles early or late" sits right under the choices.', { group: G3 });

// 14. Options > Subtitles, with subtitles in the file too
page('player-subs-mixed.html', 'Options > Subtitles: in the file and downloaded', `${video('oppenheimer', 'sun', 280)}<div class="nv-panel left st-panel"><div class="nv-h">Subtitles</div>
${rrow('Off', '')}
${head('In the file')}
${rrow('English', 'Made for this copy', { on: true })}
${rrow('Spanish', 'Made for this copy')}
${head('From OpenSubtitles')}
${rrow('Icelandic', `${TK}Timing fixed: it was made for a faster copy`, { f: true })}
${vrow('globe', 'Other languages', '', '31')}
${vrow('timing', 'Early or late', 'Only for downloaded subtitles', null, { dis: true })}
</div>${hint([['OK', 'Choose'], ['▲ ▼', 'Move'], ['Back', 'Up one level']])}`,
'The 1080p copy has English and Spanish in its file: they come first and need no check. Downloads only fill your languages the file doesn\'t have (Icelandic here). Early/late is greyed for subtitles in the file: ExoPlayer draws them, and they are made for it (SPEC 7.4).', { group: G3 });

// 15. timing strip
const strip = (val, pos, extra = '') => `<div class="st-strip"><div class="hd">${ic('timing')}Icelandic subtitles: early or late<small>Remembered for this film</small></div>
<div class="st-ctl"><span class="side">${kbd('◀')}Earlier</span><div class="mid"><span class="val">${val}</span><span class="st-track"><span class="z"></span><span class="d" style="left:${pos}%"></span></span></div><span class="side">Later${kbd('▶')}</span></div>
<div class="st-keys"><span>${kbd('OK')}<b>Done</b></span><span>${kbd('▼')}Match a line instead</span><span>${kbd('▲')}As downloaded</span></div>${extra}</div>`;
page('player-timing.html', 'Subtitles early or late', `${video('oppenheimer2', 'theatre', 280)}${strip('1.5 s later', 57.5)}${sub(['Hvað með það?'])}`,
'One small strip at the top, so the picture and the subtitle line at the bottom stay in view while you change it. Each ◀ ▶ moves the subtitles 0.5 s (hold: 4 steps a second, up to 60 s either way), and it shows at once: airglow draws downloaded subtitles itself (SPEC 7.4). The film keeps playing.', { group: G3 });

// 16. match a line
page('player-timing-match.html', 'Match a line', `${video('oppenheimer2', 'theatre', 280)}<div class="st-strip"><div class="hd">${ic('timing')}Match a line<small>Icelandic subtitles</small></div>
<div class="st-line">“Dr. Oppenheimer.”</div><div class="st-wait">Press OK when you hear it. As timed now, it comes in about 4 s</div>
<div class="st-keys"><span>${kbd('OK')}<b>I hear it</b></span><span>${kbd('▶')}Another line</span><span>${kbd('Back')}Cancel</span></div></div>`,
'When you can\'t tell if they\'re early or late: the strip shows the next line coming up. You press OK when you hear it, and the difference (less 0.3 s for the press) becomes the timing, rounded to 0.5 s. Then it goes back to the early/late strip so you can adjust by a step.', { group: G3 });

// 17. chip: timing couldn't be checked
page('player-subs-chip.html', 'Downloaded subtitles, timing not checked', `${video('oppenheimer3', 'city', 250)}<div class="nv-chip st-chip"><div class="gl0">${ic('cc')}</div><div class="grow"><b>Icelandic subtitles, from OpenSubtitles</b><span>Timing not checked. Off? ▼, then Subtitles</span></div></div>${sub(['Ég held við höfum gert það.'])}`,
'Shown once per film, for 6 s at the first downloaded line, only when nothing could check the timing (no file made for this copy, no others to compare: SPEC 7.3). Top right on films: the bottom is the subtitles\' place. No action and no countdown, so OK stays Pause.', { group: G3 });

// 18. add-on down in the player
page('player-subs-down.html', 'Options > Subtitles: OpenSubtitles down', `${video('oppenheimer', 'sun', 280)}<div class="nv-panel left st-panel"><div class="nv-h">Subtitles</div>
${rrow('Off', '', { on: true })}
${head('In the file')}
<div class="nv-row dis st-r"><div class="grow"><div class="a">None in this copy's file</div></div></div>
${head('From OpenSubtitles')}
<div class="nv-row dis st-r"><div class="grow"><div class="a">OpenSubtitles isn't answering</div><div class="b">Tried at 21:31. Trying again at 21:32</div></div></div>
${vrow('refresh', 'Try now', '', null, { f: true })}
${vrow('film', 'Other copies of this film', '1 has English in its file', '3')}
</div>${hint([['OK', 'Choose'], ['▲ ▼', 'Move'], ['Back', 'Up one level']])}`,
'The add-on is down and this copy has none. The panel says so, offers Try now, and points at the copy that has subtitles in its file (known from the check, SPEC 5.2), which opens Quality. When subtitles come in later, a one-line note says so: "English subtitles are ready · CC".', { group: G3 });

// 19. Quality with the real copies
const qrow = (c, { on = false, f = false } = {}) => `<div class="nv-row st-r${f ? ' f' : ''}"><span class="rd${on ? ' on' : ''}"></span><div class="grow"><div class="a">${qline(c)}</div><div class="b">${c.plays ? '' : 'No sound on this TV · '}${c.named ? `Named ${c.named} · ` : ''}${c.plays ? c.snd : 'DTS-HD only'}${c.rank === 1 ? ' · playing' : ''}</div></div></div>`;
page('player-quality.html', 'Options > Quality: the real copies', `${video('oppenheimer', 'sun', 280)}<div class="nv-panel left st-panel st-q"><div class="nv-h">Quality</div>
<div class="nv-row dis st-r"><div class="grow"><div class="a" style="color:var(--a-text-1)">Now: 3840 × 1600</div><div class="b" style="color:var(--a-text-2)">4K · HDR10 · 16 Mb/s · Dolby Digital Plus 5.1</div></div></div>
${head('Copies of this film')}
${rrow('Always the best copy', 'Now the 4K HDR10 copy', { on: true, f: true })}
${COPIES.map((c) => qrow(c)).join('')}
<div class="st-foot">Switching starts the other copy where you are. Checked today 21:02.</div></div>${hint([['OK', 'Choose'], ['▲ ▼', 'Move'], ['Back', 'Up one level']])}`,
'The panel that exists today (openQuality), with each copy\'s real quality in place of its name, and the same "Always the best copy" default as the title page. The rows are the cached checks: opening this panel never opens another stream.', { group: G3 });

fs.writeFileSync(path.join(root, 'tools', 'pages.json'), JSON.stringify(pages, null, 1));
console.log(`wrote ${pages.length} mocks`);
