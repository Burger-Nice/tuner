// node tools/build.js : writes the mocks (960 x 540) from one timeline. Then node tools/render.js for the PNGs.
const fs = require('fs'); const path = require('path');
const root = path.resolve(__dirname, '..');
const EYE = '<svg class="eyeoff" viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7a13 13 0 0 1-2.4 3.7M6.4 6.6A13 13 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
const ARROW_R = '<span class="k"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>';
const ARROW_U = '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
const PLAY = '<svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg>';
const SEARCH = '<svg class="ic" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9"/></svg>';
const AVATAR = '<span class="avatar"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/></svg></span>';
const dot = '<span class="dot">·</span>';

// ---- the one timeline ----
// Wed 28 Oct 2026; the Grizzlies play at Portland Thu 29 Oct 02:00 (Wed night by the night rule); game night is Thu 03:12.
const ends = (clock, minutes) => { const [h, m] = clock.split(':').map(Number); const t = (h * 60 + m + minutes) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
// the luminance cap: alpha = clamp(1 - target / mean, .10, .60), mean from the 32 px copy's right half (measured for the mocks' art)
const LUM = { severance: 0.641, niceguys: 0.625, heartstone: 0.398, spyxfamily: 0.4, heat: 0.362, breakingbad: 0.463, slowhorses: 0.152, nakedgun: 0.448, hailmary: 0.188 };
const cap = (art, target) => Math.min(0.6, Math.max(0.1, 1 - target / LUM[art])).toFixed(2);
// the page's rows tonight (section 6's selection for this profile: comedy 55 %, anime 25 %, crime 20 %; a game day)
const ROWS = ['Comedy for you', 'Tonight in the NBA', 'Popular films', 'Anime comedy', 'Popular series', 'Crime dramas', 'Because you watched Always Sunny', 'Your shows', 'New this year', 'Something different', 'Top rated', 'Á íslensku', 'Saved', 'Browse your library', 'Channels'];

const head = (title, extra = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=960,height=540">
<title>${title}</title>
<link rel="stylesheet" href="../../../app/tv/brand/fonts.css"><link rel="stylesheet" href="../../../app/tv/brand/tokens.css"><link rel="stylesheet" href="home-final.css">
${extra ? `<style>${extra}</style>` : ''}
</head><body><div class="screen">\n`;
const foot = `</div></body></html>\n`;

const topbar = (o = {}) => `<div class="topbar"><img class="mk" src="../../../app/tv/brand/assets/mark-small.svg" alt="">
  <div class="tabs"><span class="tab">${SEARCH}Search</span><span class="tab ${o.sel === 'Movies' ? '' : 'sel'}">Home</span><span class="tab">Live</span><span class="tab">NBA</span><span class="tab ${o.sel === 'Movies' ? 'sel' : ''}">Movies</span><span class="tab">Series</span><span class="tab">Saved</span></div>
  <div class="tb-r"><span>${o.clock}</span>${AVATAR}</div>
</div>\n`;

const picture = (art, pos, capa) => `<div class="hf-bd" style="--pos:${pos}"><img src="art/${art}-bg.jpg" alt=""></div>
<div class="hf-cap" style="--capa:${capa}"></div><div class="hf-sx"></div><div class="hf-sy"></div><div class="hf-st"></div><div class="hf-grain"></div>\n`;

const line = (name, facts, on = false, sharp = false) => `  <div class="e${on ? ' on' : ''}${sharp ? ' sharp' : ''}"><div class="t">${name}<small>${facts}</small></div></div>\n`;
const card = (o) => `  <div class="e on${o.sharp ? ' sharp' : ''}" style="--ambt:${o.ambt}">
  <div class="ey">${o.ey}</div>
  ${o.logo ? `<img class="logo" src="art/${o.logo}-logo.png" alt="${o.title}">` : `<div class="big${o.long ? ' long' : ''}">${o.title}</div>`}
  <div class="meta">${o.meta}</div>
  ${o.line ? `<div class="line">${o.line}</div>` : ''}
  ${o.p ? `<div class="bar" style="--p:${o.p}"><i></i></div>` : ''}
  <div class="hint">${o.hint}</div>
  </div>\n`;
const firstPeek = (title, sub, cards) => `<div class="peek first"><div class="rt">${title}<span>${sub}</span><span class="pk"><span class="k">P−</span>Browse · 15 rows</span></div><div class="cards">${cards.join('')}</div></div>\n`;

// ---------------------------------------------------------------- 1. a normal evening (Wed 20:41)
const LINES = (lit, cardHtml) => [
  ['Severance', `Continue${dot}S2 · E3${dot}21 min left`],
  ['Slow Horses', `New this week${dot}S6 · E4<span class="count">3 new</span>`],
  ['Breaking Bad', `Up next${dot}S3 · E7`],
  ['Heat', `A film for tonight${dot}ends ${ends('20:41', 170)}${dot}4K`],
  ['Grizzlies at Trail Blazers', `Tonight${dot}02:00${dot}ESPN`],
].map(([n, f], i) => (i === lit ? cardHtml : line(n, f))).join('');

const evening = () => head('Home, a normal evening') + `<div class="hf-amb" style="--amb:#3B5247"></div>` +
picture('severance', '78% 30%', cap('severance', 0.30)) + topbar({ clock: 'Wed 20:41' }) + `<div class="lineup">\n${LINES(0, card({ ambt: 'rgba(59,82,71,.6)', ey: 'Continue watching', logo: 'severance', title: 'Severance',
  meta: `<span>S2 · E3</span>${dot}<span>Who Is Alive?</span>${dot}<span>21 min left</span>${dot}<span>Ends ${ends('20:41', 21)}</span><span class="badge">4K</span>`,
  line: 'Mark, Helly, Irving and Dylan search for answers.', p: '57%',
  hint: `<span class="pill">${PLAY}Resume</span><span>${ARROW_R}Episodes</span><span><span class="k">Hold</span>Start over, Details</span>` }))}</div>\n` +
firstPeek('Comedy for you', 'Because you watch Always Sunny, The Office and 12 more', ['niceguys', 'gemstones', 'hotfuzz', 'friendship', 'wwdits', 'gamenight', 'palmsprings'].map((f) => poster(f))) + foot;

// ---------------------------------------------------------------- shared: the rows state
const stripOld = (cur) => `<div class="strip">
  <span class="chip up">${ARROW_U}Tonight</span>
  ${[['severance-bg.jpg', 'Severance'], ['slowhorses-still.jpg', 'Slow Horses'], ['breakingbad-still.jpg', 'Breaking Bad'], ['heat-bg.jpg', 'Heat']].map(([f, n]) => `<span class="chip${n === cur ? ' cur' : ''}"><img src="art/${f}" alt="">${n}</span>`).join('')}<span class="chip"><span class="cr"><img src="art/mem.png" alt=""></span>Grizzlies</span><span class="chip"><span class="wm">RÚV</span>Kastljós</span>
</div>\n`;
const strip = () => topbar({ clock: 'Wed 20:42' });
const index = (cur) => { const i = ROWS.indexOf(cur); const win = ROWS.slice(Math.max(0, i - 2), i + 4); const rest = ROWS.length - (Math.max(0, i - 2) + win.length);
  return `<div class="index">${win.map((n) => `<span class="${n === cur ? 'cur' : ''}">${n}</span>`).join('')}${rest ? `<span class="dim">${rest} more</span>` : ''}</div>\n`; };
const poster = (f, o = {}) => `<div class="poster${o.on ? ' on' : ''}"><img src="art/${f}-poster.jpg" alt="">${o.q ? `<span class="q">${o.q}</span>` : ''}${o.p ? `<div class="pb" style="--p:${o.p}"><i></i></div>` : ''}</div>`;
const wide = (f, logo, c, o = {}) => `<div class="wide${o.on ? ' on' : ''}"><img src="art/${f}" alt=""><div class="sy"></div>${o.q ? `<span class="q">${o.q}</span>` : ''}${logo ? `<img class="lg" src="art/${logo}-logo.png" alt="">` : ''}<div class="c">${c}</div>${o.p ? `<div class="pb" style="--p:${o.p}"><i></i></div>` : ''}</div>`;
const row = (title, sub, cards, o = {}) => `<div class="row"><div class="rt">${title}${o.isNew ? '<span class="new">New row</span>' : ''}<span>${sub}</span></div><div class="cards">${cards.join('')}</div></div>\n`;
const peek = (title, sub, cards) => `<div class="peek"><div class="rt">${title}<span>${sub}</span></div><div class="cards">${cards.join('')}</div></div>\n`;
const column = (o) => `<div class="column">
  ${o.logo ? `<img class="logo" src="art/${o.logo}-logo.png" alt="${o.title}">` : `<div class="title">${o.title}</div>`}
  <div class="meta">${o.meta}</div>
  <div class="line">${o.line}</div>
  <div class="hint">${o.hint}</div>
</div>\n`;
const rowsPicture = (art, pos) => picture(art, pos, cap(art, 0.22)) + `<div class="hf-sr"></div><div class="hf-sb"></div>\n`;
const rowsHint = (verb) => `<span><span class="k">OK</span><b>Details</b></span><span><span class="k">Hold</span>${verb}, Save, Not interested</span>`;

// ---------------------------------------------------------------- 2. rows: Comedy for you (films and series interleaved; the lit one is IMDb 7.3)
const rowsComedy = () => head('Home, the rows: Comedy for you') + rowsPicture('niceguys', '62% 20%') + strip() +
column({ ey: 'Comedy for you · The Nice Guys', logo: 'niceguys', title: 'The Nice Guys',
  meta: `<span>2016</span>${dot}<span>Action · Comedy · Crime</span>${dot}<span>1h 56m</span>${dot}<span>Ends ${ends('20:42', 116)}</span>${dot}<span>IMDb 7.4</span>`,
  line: 'In 1970s Los Angeles, a mismatched pair of private eyes investigate a missing girl and the death of a porn star.',
  hint: rowsHint('Play now') }) +
index('Comedy for you') +
row('Comedy for you', 'Because you watch Always Sunny, The Office and 12 more', [poster('niceguys', { on: true }), poster('gemstones'), poster('hotfuzz'), poster('friendship'), poster('wwdits'), poster('gamenight'), poster('palmsprings')]) +
peek('Popular films', 'Popular on Cinemeta', ['hailmary', 'toystory5', 'weapons', 'superman', 'onebattle', 'sinners', 'f1'].map((f) => poster(f))) + foot;

// ---------------------------------------------------------------- 3. rows: Anime comedy (a blend row)
const rowsBlend = () => head('Home, the rows: Anime comedy (a blend)') + rowsPicture('spyxfamily', '60% 25%') + strip() +
column({ ey: 'Anime comedy · Spy x Family', logo: 'spyxfamily', title: 'Spy x Family',
  meta: `<span>2022–</span>${dot}<span>Animation · Action · Comedy</span>${dot}<span>24 min</span>${dot}<span>IMDb 8.2</span>${dot}<span>Japan</span>`,
  line: 'A spy on an undercover mission gets married and adopts a child as part of his cover. His wife and daughter have secrets of their own.',
  hint: rowsHint('Play S1 · E1') }) +
index('Anime comedy') +
row('Anime comedy', 'Two things you watch, together · anime + comedy', [poster('spyxfamily', { on: true }), poster('onepunch'), poster('mobpsycho'), poster('konosuba'), poster('kaguya'), poster('bocchi'), poster('gintama')], { isNew: true }) +
peek('Because you watched Always Sunny', 'Same kind of thing · TMDB', ['platonic', 'peepshow', 'fnd', 'greatnews', 'tildeath', 'wwdits', 'gemstones'].map((f) => poster(f))) + foot;

// ---------------------------------------------------------------- 4. game night (Thu 03:12, Grizzlies at Trail Blazers, shield on)
const gameNight = () => head('Home, game night', `
  .field { --away: #12173F; --away-a: #5D76A9; --home: #B9302F; --home-a: #1C1C1C; --split: 83%; }
  .c1 { left: 586px; top: 118px; --s: 150px; }
  .c2 { left: 762px; top: 118px; --s: 150px; }
  .score { left: 582px; top: 392px; }
  .clock { padding: 0 18px; } .plate { padding: 0 16px; }`) + `
<div class="field"><div class="away"></div><div class="home"></div><div class="edge"><i></i><i></i></div><div class="shade"></div><div class="shade2"></div></div>
<div class="hf-grain"></div>
` + topbar({ clock: 'Thu 03:12' }) + `
<div class="crest c1"><img src="art/mem.png" alt=""><div class="n"><b>Grizzlies</b><span>3-0 · as of tip-off</span></div></div>
<div class="crest c2"><img src="art/por.png" alt=""><div class="n"><b>Trail Blazers</b><span>1-3 · as of tip-off</span></div></div>
<div class="score"><div class="clock"><span class="q">ON NOW</span></div><div class="plate"><span class="s">${EYE}Score hidden</span></div></div>
<div class="lineup">
` + card({ sharp: true, ambt: 'rgba(18,23,63,.7)', ey: `Game night <span class="live">Live</span>`, title: 'Grizzlies at Trail Blazers', long: true,
  meta: `<span>On now</span>${dot}<span>ESPN</span><span class="badge">4K</span>${dot}${EYE}<span>Score hidden</span>`,
  line: '3rd in the West · 3 in a row · Morant 27.8 · as of tip-off',
  hint: `<span class="pill">${PLAY}Watch live</span><span>${ARROW_R}From tip-off</span><span><span class="k">Hold</span>Reveal, more</span>` }) +
`${line('Severance', `Continue${dot}S2 · E3${dot}21 min left`)}${line('Slow Horses', `New this week${dot}S6 · E4<span class="count">3 new</span>`)}${line('It’s Always Sunny', `Short${dot}S18 · E10${dot}25 min`)}${line('Nuggets at Thunder', `Also live${dot}Prime Video`)}</div>
` +
firstPeek('Tonight in the NBA', '6 games · 1 live · 2 final · 3 later', [gameCard({ mine: true, ta: '#5D76A9', st: 'Your team · live', a: 'mem', an: 'Grizzlies', sep: 'at', h: 'por', hn: 'Blazers', ch: 'ESPN · 4K', pl: 'Score hidden' }), gameCard({ ta: '#FEC524', st: 'Live', a: 'den', an: 'Nuggets', sep: 'at', h: 'okc', hn: 'Thunder', ch: 'Prime Video', pl: '3RD' }), gameCard({ ta: '#BA9653', st: 'Final', a: 'bos', an: 'Celtics', sep: 'at', h: 'ny', hn: 'Knicks', ch: '', pl: '112 – 104' })]) + foot;

// ---------------------------------------------------------------- 5. the library: Movies, Comedy, scrolled deep (#313 is the first cell of its row: 313 = 52 x 6 + 1)
const LIB = [['stepbrothers', 'Step Brothers', '2008 · 1h 38m'], ['superbad', 'Superbad', '2007 · 1h 53m'], ['lebowski', 'The Big Lebowski', '1998 · 1h 57m'], ['holdovers', 'The Holdovers', '2023 · 2h 13m'], ['popstar', 'Popstar', '2016 · 1h 27m'], ['officespace', 'Office Space', '1999 · 1h 29m'],
  ['budapest', 'The Grand Budapest Hotel', '2014 · 1h 39m'], ['burnafterreading', 'Burn After Reading', '2008 · 1h 36m'], ['anchorman', 'Anchorman', '2004 · 1h 34m'], ['dumb', 'Dumb and Dumber', '1994 · 1h 47m'], ['groundhog', 'Groundhog Day', '1993 · 1h 41m'], ['tropic', 'Tropic Thunder', '2008 · 1h 47m'],
  ['shaun', 'Shaun of the Dead', '2004 · 1h 39m'], ['otherguys', 'The Other Guys', '2010 · 1h 47m'], ['meangirls', 'Mean Girls', '2004 · 1h 37m'], ['jumpstreet', '21 Jump Street', '2012 · 1h 49m'], ['happygilmore', 'Happy Gilmore', '1996 · 1h 32m'], ['knivesout', 'Knives Out', '2019 · 2h 10m']];
const library = () => head('Movies: Comedy, scrolled deep', `.grid { --gy: -96px; }`) + `
<div class="ctx"><span><b>Movies</b> · Comedy · Popular · Cinemeta · 3,000+ titles</span><span class="bubble"><b>#313</b><span>of 3,000+ · Popular</span></span></div>
<div class="grid">${LIB.map(([f, n, m], i) => `<div class="cell${i === 6 ? ' on' : ''}">${poster(f, { on: i === 6 })}<div class="cap">${n}<span>${m}</span></div></div>`).join('')}</div>
` + foot;

// ---------------------------------------------------------------- 6. cold start: a new user, no history (the meta shortened by the rule: year · length · Ends · rating)
const coldStart = () => head('Home, first evening: no history yet') + `<div class="hf-amb" style="--amb:#4A3A2A"></div>` + picture('hailmary', '60% 30%', cap('hailmary', 0.30)) + topbar({ clock: 'Wed 20:41' }) + `
<div class="lineup">
` + card({ ambt: 'rgba(74,58,42,.55)', ey: 'Popular on Cinemeta · a pick for tonight', logo: 'hailmary', title: 'Project Hail Mary',
  meta: `<span>2026</span>${dot}<span>2h 37m</span>${dot}<span>Ends ${ends('20:41', 157)}</span>${dot}<span>IMDb 8.2</span>`,
  line: 'A science teacher wakes up alone on a spaceship. As his memory returns, he uncovers an impossible task.',
  hint: `<span class="pill noicon">Details</span><span>${ARROW_R}More popular films</span><span><span class="k">Hold</span>Play now, Save</span>` }) +
`${line('Grizzlies at Trail Blazers', `Your team${dot}Tonight 02:00${dot}ESPN`)}${line('Kastljós', `On now${dot}RÚV${dot}until 20:55`)}${line('Pick what you like', `3 genres start your rows`)}</div>
` +
firstPeek('Popular films', 'Popular on Cinemeta', ['toystory5', 'weapons', 'superman', 'onebattle', 'sinners', 'f1', 'mickey17'].map((f) => poster(f))) + foot;

// ---------------------------------------------------------------- 7. the rows: Channels (a channel has no picture: its logo on a flat field)
const chCard = (wm, n, c, u, o = {}) => `<div class="wide chn${o.on ? ' on' : ''}"><span class="wm">${wm}</span><span class="n">${n}</span><div class="c">${c}</div><div class="u">${u}</div></div>`;
const channel = () => head('Home, the rows: Channels (no picture to show)') + `
<div class="flat" style="--flat:#0F3B5F"><div class="wm">RÚV</div></div>
<div class="hf-sx"></div><div class="hf-sr"></div><div class="hf-sb"></div><div class="hf-grain"></div>
` + strip() + `<div class="column">
  <div class="title">Kastljós</div>
  <div class="meta"><span>RÚV · 1</span>${dot}<span>20:35 – 20:55</span>${dot}<span>14 min left</span><span class="badge">HD</span></div>
  <div class="line">Next · Fréttir 20:55 · Veðrið 21:20 · Kiljan 21:30</div>
  <div class="hint"><span><span class="k">OK</span><b>Tune</b></span><span><span class="k">Hold</span>Save channel, Open in the guide</span></div>
</div>\n` + index('Channels') +
row('Channels', 'Favourites and recent', [chCard('RÚV', '1', 'Kastljós', 'until 20:55', { on: true }), chCard('Stöð 2', '2', 'Ísland í dag', 'until 21:00'), chCard('ESPN', '301', 'SportsCenter', 'until 21:00'), chCard('Sýn Sport', '12', 'Sportpakkinn', 'until 21:30')]) + foot;

// ---------------------------------------------------------------- 8. loading and missing art, in the rows (Cinemeta's English names; the lit title drawn as if it had no backdrop)
const loading = () => head('Home, the rows: a title without a backdrop, posters loading, a title without a poster', `.column .title { font-size: 30px; }`) +
`<div class="flat" style="--flat:#2B2F3A"></div><div class="pst"><img src="art/heartstone-poster.jpg" alt=""></div><div class="hf-sx"></div><div class="hf-sr"></div><div class="hf-sb"></div><div class="hf-grain"></div>\n` + strip() +
column({ ey: 'Á íslensku · Heartstone', title: 'Heartstone',
  meta: `<span>2016</span>${dot}<span>Drama · Romance</span>${dot}<span>2h 09m</span>${dot}<span>Ends ${ends('20:44', 129)}</span>${dot}<span>IMDb 7.4</span>${dot}<span>Iceland</span>`,
  line: 'In a fishing village in Iceland, a boy develops feelings for his best friend as the summer ends.',
  hint: rowsHint('Play now') }) +
index('Á íslensku') +
row('Á íslensku', '1,451 films · 107 series · TMDB', [poster('heartstone', { on: true }), poster('trapped'), poster('katla'), `<div class="poster load"><b>Black Sands</b></div>`, `<div class="poster load"><b>The Valhalla Murders</b></div>`, poster('godland'), `<div class="poster txt"><small>No poster</small><b>Northern Comfort</b></div>`]) +
peek('Saved', '4 titles you have not started', ['oppenheimer', 'dune2', 'sinners', 'mickey17'].map((f) => poster(f))) + foot;

// ---------------------------------------------------------------- 9. rows: Continue watching (wide cards)
const rowsContinue = () => head('Home, the rows: Your shows (wide cards)') + rowsPicture('breakingbad', '60% 20%') + strip() +
column({ logo: 'breakingbad', title: 'Breaking Bad',
  meta: `<span>S3 · E6</span>${dot}<span>Sunset</span>${dot}<span>12 min left</span>${dot}<span>Ends ${ends('20:42', 12)}</span><span class="badge">4K</span>`,
  line: 'As Walt settles into his new surroundings, Walter Jr. demands answers about his parents’ relationship.',
  hint: `<span><span class="k">OK</span><b>Resume</b></span><span><span class="k">Hold</span>Start over, Details, Mark watched, Remove from Home</span>` }) +
index('Your shows') +
row('Your shows', 'Where you are, and what is new · 7', [wide('breakingbad-still.jpg', 'breakingbad', `S3 · E6 <span>· 12 min left</span>`, { on: true, p: '76%', q: '4K' }), wide('bear-still.jpg', 'bear', `S4 · E3 <span>· 18 min left</span>`, { p: '48%' }), wide('andor-still.jpg', 'andor', `S2 · E7 <span>· 31 min left</span>`, { p: '35%' }), wide('slowhorses-still.jpg', 'slowhorses', `S6 · E4 <span>· new · 3</span>`), wide('lastofus-still.jpg', null, `The Last of Us · S2 · E4 <span>· new</span>`)]) +
peek('New this year', '2026 on Cinemeta', ['hailmary', 'toystory5', 'nakedgun', 'weapons', 'superman', 'f1', 'mickey17'].map((f) => poster(f))) + foot;

// ---------------------------------------------------------------- 10. rows: Tonight in the NBA (game cards; the slate's state at 20:42: nothing has started)
const gameCard = (o) => `<div class="gc${o.on ? ' on' : ''}" style="--ta:${o.ta}"><div class="ed"></div><div class="st${o.mine ? ' mine' : ''}">${o.st}</div>
  <div class="tm"><span class="cr"><img src="art/${o.a}.png" alt=""></span><b>${o.an}</b><span class="vs">${o.sep}</span><span class="cr"><img src="art/${o.h}.png" alt=""></span><b>${o.hn}</b></div>
  <div class="ch">${o.ch}</div><div class="pl tip">${o.pl}</div></div>`;
const rowsNba = () => head('Home, the rows: Tonight in the NBA (game cards)') + `<div class="hf-amb" style="--amb:#2A3F7A"></div>` + `<div class="flat" style="--flat:#15131D"></div><div class="hf-sr"></div><div class="hf-sb"></div><div class="hf-grain"></div>\n` + strip('Grizzlies') +
`<div class="column">
  <div class="ey">Tonight in the NBA · your team</div>
  <div class="title">Grizzlies at Trail Blazers</div>
  <div class="meta"><span>Tip-off 02:00</span>${dot}<span>in 5 h 18 min</span>${dot}<span>ESPN</span><span class="badge">4K</span>${dot}<span>Trail Blazers 1-3</span></div>
  <div class="line">3rd in the West · 3 in a row · Morant 27.8 ppg</div>
  <div class="hint"><span><span class="k">OK</span><b>Game page</b></span><span><span class="k">Hold</span>Watch pre-game, Remind me</span></div>
</div>\n` + index('Tonight in the NBA') +
row('Tonight in the NBA', '6 games · 2 at 23:00 · 4 later · none started', [
  gameCard({ on: true, mine: true, ta: '#5D76A9', st: 'Your team · tonight', a: 'mem', an: 'Grizzlies', sep: 'at', h: 'por', hn: 'Blazers', ch: 'ESPN · 4K', pl: '02:00' }),
  gameCard({ ta: '#FEC524', st: 'Tonight', a: 'den', an: 'Nuggets', sep: 'at', h: 'okc', hn: 'Thunder', ch: 'Prime Video', pl: '23:30' }),
  gameCard({ ta: '#BA9653', st: 'Tonight', a: 'bos', an: 'Celtics', sep: 'at', h: 'ny', hn: 'Knicks', ch: 'NBA League Pass', pl: '23:00' }),
  gameCard({ ta: '#C4CED4', st: 'Tonight', a: 'dal', an: 'Mavericks', sep: 'at', h: 'hou', hn: 'Rockets', ch: 'NBA League Pass', pl: '00:30' })]) +
peek('Comedy for you', 'Because you watch Always Sunny, The Office and 12 more', ['niceguys', 'gemstones', 'hotfuzz', 'friendship', 'wwdits', 'gamenight', 'palmsprings'].map((f) => poster(f))) + foot;

const pages = { '01-evening.html': evening(), '02-rows-comedy.html': rowsComedy(), '03-rows-blend.html': rowsBlend(), '04-game-night.html': gameNight(), '05-library-comedy.html': library(), '06-cold-start.html': coldStart(), '07-rows-channels.html': channel(), '08-loading-missing-art.html': loading(), '09-rows-continue.html': rowsContinue(), '10-rows-nba.html': rowsNba() };
for (const [f, html] of Object.entries(pages)) fs.writeFileSync(path.join(root, f), html);
fs.writeFileSync(path.join(root, 'tools', 'pages.json'), JSON.stringify([
  { file: '01-evening.html', title: 'A normal evening', note: 'Wed 20:41 · the Marquee: five lines (the game is tonight), the lit line open as its card in place, the first row peeking; P− jumps to the rows' },
  { file: '02-rows-comedy.html', title: 'The rows: Comedy for you', note: 'Down from the lineup · films and series together · the picture answers the poster · the row index on its backing' },
  { file: '03-rows-blend.html', title: 'The rows: Anime comedy', note: 'A blend row: two of his genres together, named plainly, marked New row for a week' },
  { file: '04-game-night.html', title: 'Game night', note: 'Thu 03:12 · Grizzlies at Trail Blazers live, shield on: ON NOW, no clock, records as of tip-off' },
  { file: '05-library-comedy.html', title: 'Movies: Comedy, deep', note: 'The add-on library: one long Cinemeta scroll per genre, #313 of 3,000+' },
  { file: '06-cold-start.html', title: 'First evening', note: 'No history: a popular pick (Details), the team, the channel, Pick what you like' },
  { file: '07-rows-channels.html', title: 'The rows: Channels', note: 'A channel has no picture: its logo on a flat field, the programme’s progress and what is next; wide channel cards' },
  { file: '08-loading-missing-art.html', title: 'Missing art', note: 'A title without a backdrop (its poster upright on a flat ground), posters loading, a title with no poster' },
  { file: '09-rows-continue.html', title: 'The rows: Your shows', note: 'Continue watching and new episodes in one wide-card row (they are also the Marquee’s lines); New this year peeks' },
  { file: '10-rows-nba.html', title: 'The rows: Tonight in the NBA', note: 'The hub’s game cards; nothing has started at 20:42, so the plates are tip-off times' },
], null, 2));
console.log('wrote', Object.keys(pages).length, 'pages');
