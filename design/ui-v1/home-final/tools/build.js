// node tools/build.js : writes the mocks (960 x 540) from one timeline. Then node tools/render.js for the PNGs.
const fs = require('fs'); const path = require('path');
const root = path.resolve(__dirname, '..');
const EYE = '<svg class="eyeoff" viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7a13 13 0 0 1-2.4 3.7M6.4 6.6A13 13 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
const ARROW_R = '<span class="k"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>';
const ARROW_D = '<span class="k"><svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg></span>';
const ARROW_U = '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
const PLAY = '<svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg>';
const SEARCH = '<svg class="ic" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9"/></svg>';
const AVATAR = '<span class="avatar"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/></svg></span>';
const dot = '<span class="dot">·</span>';

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

const picture = (src, pos, extra = '') => `<div class="hf-bd" style="--pos:${pos}"><img src="${src}" alt=""></div>
<div class="hf-cap"${extra}></div><div class="hf-sx"></div><div class="hf-sy"></div><div class="hf-st"></div><div class="hf-grain"></div>\n`;

const entry = (name, facts) => `  <div class="e"><div class="t">${name}<small>${facts}</small></div></div>\n`;

// ---------------------------------------------------------------- 1. a normal evening
const evening = head('Home, a normal evening') + `<div class="screen-amb hf-amb" style="--amb:#3B5247"></div>` +
picture('art/severance-bg.jpg', '78% 30%') + topbar({ clock: 'Wed 20:41' }) + `
<div class="lineup">
  <div class="e on" style="--ambt:rgba(59,82,71,.55)"><div class="ey">Continue watching</div>
    <img class="logo" src="art/severance-logo.png" alt="Severance">
    <div class="meta"><span>S2 · E3</span>${dot}<span>Who Is Alive?</span>${dot}<span>21 min left</span>${dot}<span>Ends 21:03</span><span class="badge">4K</span></div>
    <div class="line">Mark, Helly, Irving and Dylan search for answers.</div>
    <div class="bar" style="--p:57%"><i></i></div>
    <div class="hint"><span class="pill">${PLAY}Resume</span><span>${ARROW_R}Episodes</span><span><span class="k">Hold</span>Start over, Details</span></div>
  </div>
${entry('Slow Horses', `New this week${dot}S6 · E6<span class="count">3 new</span>`)}${entry('Breaking Bad', `Up next${dot}S3 · E7`)}${entry('Heat', `A film for tonight${dot}ends 23:33${dot}4K`)}${entry('Grizzlies at Trail Blazers', `Thu 02:00${dot}ESPN`)}${entry('Kastljós', `On now${dot}RÚV${dot}until 20:55`)}</div>
<div class="more"><svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg><span><b>Browse</b> · Comedy for you · Anime comedy · Popular films · 11 more rows</span></div>
` + foot;

// ---------------------------------------------------------------- shared: the rows state
const strip = (cur, clock) => `<div class="strip">
  <span class="chip up">${ARROW_U}Tonight</span>
  <span class="chip"><img src="art/severance-bg.jpg" alt="">Severance</span><span class="chip"><img src="art/slowhorses-still.jpg" alt="">Slow Horses</span><span class="chip"><img src="art/breakingbad-still.jpg" alt="">Breaking Bad</span><span class="chip"><img src="art/heat-bg.jpg" alt="">Heat</span><span class="chip"><span class="cr"><img src="art/mem.png" alt=""></span>Grizzlies</span><span class="chip"><span class="wm">RÚV</span>Kastljós</span>
</div>\n`;
const INDEX = ['Continue watching', 'Comedy for you', 'Anime comedy', 'Popular films', 'Crime dramas', 'Because you watched The Bear', 'Comedy series for you', 'New this year', 'Top rated', 'Á íslensku', 'Something different · Documentaries', 'Saved', 'Channels'];
const index = (cur, list = INDEX.slice(0, 6), more = 7) => `<div class="index">${list.map((n) => `<span class="${n === cur ? 'cur' : ''}">${n}</span>`).join('')}${more ? `<span class="dim">${more} more</span>` : ''}</div>\n`;
const poster = (f, o = {}) => `<div class="poster${o.on ? ' on' : ''}"><img src="art/${f}-poster.jpg" alt="">${o.q ? `<span class="q">${o.q}</span>` : ''}${o.p ? `<div class="pb" style="--p:${o.p}"><i></i></div>` : ''}</div>`;
const row = (title, sub, cards, o = {}) => `<div class="row"><div class="rt">${title}${o.isNew ? '<span class="new">New row</span>' : ''}<span>${sub}</span></div><div class="cards">${cards.join('')}</div></div>\n`;
const peek = (title, sub, files) => `<div class="peek"><div class="rt">${title}<span>${sub}</span></div><div class="cards">${files.map((f) => `<div class="poster"><img src="art/${f}-poster.jpg" alt=""></div>`).join('')}</div></div>\n`;
const column = (o) => `<div class="column">
  <div class="ey">${o.ey}</div>
  ${o.logo ? `<img class="logo" src="${o.logo}" alt="${o.title}">` : `<div class="title">${o.title}</div>`}
  <div class="meta">${o.meta}</div>
  <div class="line">${o.line}</div>
  <div class="hint">${o.hint}</div>
</div>\n`;
const rowsPicture = (src, pos) => picture(src, pos, ' style="--capa:.34"');

// ---------------------------------------------------------------- 2. rows: Comedy for you
const rowsComedy = head('Home, the rows: Comedy for you') + rowsPicture('art/nakedgun-bg.jpg', '70% 20%') + strip('Comedy for you', 'Wed 20:42') +
column({ ey: 'Comedy for you · the Naked Gun', logo: 'art/nakedgun-logo.png', title: 'The Naked Gun',
  meta: `<span>2025</span>${dot}<span>Action · Comedy</span>${dot}<span>1h 25m</span>${dot}<span>Ends 22:08</span>${dot}<span>IMDb 6.3</span>${dot}<span>Cinemeta</span>`,
  line: 'Following in his father’s footsteps, a detective works to solve a murder case and save the world.',
  hint: `<span><span class="k">OK</span><b>Details</b></span><span><span class="k">Hold</span>Play now, Save, Not interested</span>` }) +
index('Comedy for you') +
row('Comedy for you', 'Because you watch Always Sunny, The Office and 12 more', [poster('nakedgun', { on: true }), poster('friendship'), poster('hotfuzz'), poster('niceguys'), poster('gamenight'), poster('palmsprings'), poster('inbruges')]) +
peek('Anime comedy', 'Two things you watch, together · Animation from Japan + Comedy', ['spyxfamily', 'onepunch', 'mobpsycho', 'konosuba', 'kaguya', 'bocchi', 'gintama']) + foot;

// ---------------------------------------------------------------- 3. rows: Anime comedy (a blend row)
const rowsBlend = head('Home, the rows: Anime comedy (a blend)') + rowsPicture('art/spyxfamily-bg.jpg', '60% 25%') + strip('Anime comedy', 'Wed 20:42') +
column({ ey: 'Anime comedy · Spy x Family', logo: 'art/spyxfamily-logo.png', title: 'Spy x Family',
  meta: `<span>2022–</span>${dot}<span>Animation · Action · Comedy</span>${dot}<span>24 min</span>${dot}<span>IMDb 8.2</span>${dot}<span>Japan</span>${dot}<span>Cinemeta</span>`,
  line: 'A spy on an undercover mission gets married and adopts a child as part of his cover. His wife and daughter have secrets of their own.',
  hint: `<span><span class="k">OK</span><b>Details</b></span><span><span class="k">Hold</span>Play S1 · E1, Save, Not interested</span>` }) +
index('Anime comedy') +
row('Anime comedy', 'Two things you watch, together · Animation from Japan + Comedy', [poster('spyxfamily', { on: true }), poster('onepunch'), poster('mobpsycho'), poster('konosuba'), poster('kaguya'), poster('bocchi'), poster('gintama')], { isNew: true }) +
peek('Popular films', 'This week on Cinemeta', ['hailmary', 'toystory5', 'weapons', 'superman', 'onebattle', 'sinners', 'f1']) + foot;

// ---------------------------------------------------------------- 4. game night (Thu 03:12, Grizzlies at Trail Blazers, shield on)
const gameNight = head('Home, game night', `
  .field { --away: #12173F; --away-a: #5D76A9; --home: #B9302F; --home-a: #1C1C1C; --split: 76%; }
  .field { --split: 79%; }
  .c1 { left: 540px; top: 126px; --s: 168px; }
  .c2 { left: 744px; top: 126px; --s: 168px; }
  .score { left: 524px; top: 392px; }
  .e .meta .eyeoff { color: var(--a-text-3); }`) + `
<div class="field"><div class="away"></div><div class="home"></div><div class="edge"><i></i><i></i></div><div class="shade"></div><div class="shade2"></div></div>
<div class="hf-grain"></div>
` + topbar({ clock: 'Thu 03:12' }) + `
<div class="crest c1"><img src="art/mem.png" alt=""><div class="n"><b>Grizzlies</b><span>3-0 · as of tip-off</span></div></div>
<div class="crest c2"><img src="art/por.png" alt=""><div class="n"><b>Trail Blazers</b><span>1-3 · as of tip-off</span></div></div>
<div class="score"><div class="clock"><span class="q">ON NOW</span></div><div class="plate"><span class="s">${EYE}Score hidden</span></div></div>
<div class="lineup">
  <div class="e on sharp"><div class="ey">Game night <span class="live">Live</span></div>
    <div class="t long">Grizzlies at Trail Blazers</div>
    <div class="meta"><span>On now</span>${dot}<span>ESPN</span><span class="badge">4K</span>${dot}${EYE}<span>Score hidden</span></div>
    <div class="line">3rd in the West · 3 in a row · Morant 27.8 · as of tip-off</div>
    <div class="hint"><span class="pill">${PLAY}Watch live</span><span>${ARROW_R}From tip-off</span><span><span class="k">Hold</span>Reveal, more</span></div>
  </div>
${entry('Severance', `Continue${dot}S2 · E3${dot}21 min left`)}${entry('Slow Horses', `New this week${dot}S6 · E6<span class="count">3 new</span>`)}${entry('It’s Always Sunny', `Short${dot}S18 · E10${dot}25 min`)}${entry('Nuggets at Thunder', `Also live${dot}TNT`)}</div>
<div class="more"><svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg><span><b>Browse</b> · Tonight in the NBA · Comedy for you · 12 more rows</span></div>
` + foot;

// ---------------------------------------------------------------- 5. the library: Movies, Comedy, scrolled deep
const LIB = [['stepbrothers', 'Step Brothers', '2008 · 1h 38m'], ['superbad', 'Superbad', '2007 · 1h 53m'], ['lebowski', 'The Big Lebowski', '1998 · 1h 57m'], ['holdovers', 'The Holdovers', '2023 · 2h 13m'], ['popstar', 'Popstar', '2016 · 1h 27m'], ['officespace', 'Office Space', '1999 · 1h 29m'],
  ['burnafterreading', 'Burn After Reading', '2008 · 1h 36m'], ['anchorman', 'Anchorman', '2004 · 1h 34m'], ['budapest', 'The Grand Budapest Hotel', '2014 · 1h 39m'], ['dumb', 'Dumb and Dumber', '1994 · 1h 47m'], ['groundhog', 'Groundhog Day', '1993 · 1h 41m'], ['tropic', 'Tropic Thunder', '2008 · 1h 47m'],
  ['shaun', 'Shaun of the Dead', '2004 · 1h 39m'], ['otherguys', 'The Other Guys', '2010 · 1h 47m'], ['meangirls', 'Mean Girls', '2004 · 1h 37m'], ['jumpstreet', '21 Jump Street', '2012 · 1h 49m'], ['happygilmore', 'Happy Gilmore', '1996 · 1h 32m'], ['knivesout', 'Knives Out', '2019 · 2h 10m']];
const library = head('Movies: Comedy, scrolled deep', `.grid { --gy: -96px; }`) + `
<div class="ctx"><span><b>Movies</b> · Comedy · Popular · Cinemeta · 3,000+ titles</span><span class="bubble"><b>#313</b><span>of 3,000+ · Popular</span></span></div>
<div class="grid">${LIB.map(([f, n, m], i) => `<div class="cell${i === 8 ? ' on' : ''}">${poster(f, { on: i === 8 })}<div class="cap">${n}<span>${m}</span></div></div>`).join('')}</div>
` + foot;

// ---------------------------------------------------------------- 6. cold start: a new user, no history
const coldStart = head('Home, first evening: no history yet') + `<div class="hf-amb" style="--amb:#4A3A2A"></div>` + picture('art/hailmary-bg.jpg', '60% 30%') + topbar({ clock: 'Wed 20:41' }) + `
<div class="lineup">
  <div class="e on" style="--ambt:rgba(74,58,42,.5)"><div class="ey">Popular on Cinemeta · a pick for tonight</div>
    <img class="logo" src="art/hailmary-logo.png" alt="Project Hail Mary">
    <div class="meta"><span>2026</span>${dot}<span>Adventure · Comedy · Sci-Fi</span>${dot}<span>2h 37m</span>${dot}<span>Ends 23:19</span>${dot}<span>IMDb 8.2</span></div>
    <div class="line">A science teacher wakes up alone on a spaceship. As his memory returns, he uncovers an impossible task.</div>
    <div class="hint"><span class="pill">${PLAY}Details</span><span>${ARROW_R}More popular films</span><span><span class="k">Hold</span>Play now, Save</span></div>
  </div>
${entry('Grizzlies at Trail Blazers', `Your team${dot}Thu 02:00${dot}ESPN`)}${entry('Kastljós', `On now${dot}RÚV${dot}until 20:55`)}${entry('Pick what you like', `3 genres start your rows${dot}airglow learns as you watch`)}</div>
<div class="more"><svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg><span><b>Browse</b> · Popular films · Popular series · New this year · Top rated · Á íslensku · Channels</span></div>
` + foot;

// ---------------------------------------------------------------- 7. no picture: the channel line focused
const channel = head('Home, the channel line: no picture to show') + `
<div class="flat" style="--flat:#0F3B5F"><div class="wm">RÚV</div>
  <div class="prog"><b>Kastljós</b><span>20:35 – 20:55 · 14 min left</span><div class="bar" style="--p:30%"><i></i></div></div>
  <div class="next"><b>Next</b> · Fréttir 20:55 · Veðrið 21:20</div></div>
<div class="hf-sx"></div><div class="hf-grain"></div>
` + topbar({ clock: 'Wed 20:41' }) + `
<div class="lineup">
${entry('Severance', `Continue${dot}S2 · E3${dot}21 min left`)}${entry('Slow Horses', `New this week${dot}S6 · E6<span class="count">3 new</span>`)}${entry('Breaking Bad', `Up next${dot}S3 · E7`)}${entry('Heat', `A film for tonight${dot}ends 23:33${dot}4K`)}${entry('Grizzlies at Trail Blazers', `Thu 02:00${dot}ESPN`)}  <div class="e on" style="--ambt:rgba(15,59,95,.6)"><div class="ey">On now · RÚV · channel 1</div>
    <div class="t">Kastljós</div>
    <div class="meta"><span>20:35 – 20:55</span>${dot}<span>14 min left</span>${dot}<span>Next: Fréttir</span><span class="badge">HD</span></div>
    <div class="line">Fréttaskýringaþáttur: viðtöl og umfjöllun um málefni dagsins.</div>
    <div class="hint"><span class="pill">${PLAY}Tune</span><span>${ARROW_R}Guide</span><span><span class="k">Hold</span>Save channel</span></div>
  </div>
</div>
<div class="more"><svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg><span><b>Browse</b> · Comedy for you · Anime comedy · Popular films · 11 more rows</span></div>
` + foot;

// ---------------------------------------------------------------- 8. loading and missing art, in the rows
const loading = head('Home, the rows: art still loading, a title without art', `.column .title { font-size: 30px; }`) + rowsPicture('art/heartstone-bg.jpg', '50% 25%') + strip('Á íslensku', 'Wed 20:44') +
column({ ey: 'Á íslensku · Hjartasteinn', title: 'Hjartasteinn',
  meta: `<span>2016</span>${dot}<span>Drama</span>${dot}<span>2h 09m</span>${dot}<span>Ends 22:53</span>${dot}<span>IMDb 7.4</span>${dot}<span>Iceland</span>${dot}<span>Northlight</span>`,
  line: 'In a fishing village in Iceland, a boy develops feelings for his best friend as the summer ends.',
  hint: `<span><span class="k">OK</span><b>Details</b></span><span><span class="k">Hold</span>Play now, Save, Not interested</span>` }) +
index('Á íslensku', ['Crime dramas', 'Because you watched The Bear', 'Comedy series for you', 'New this year', 'Top rated', 'Á íslensku'], 3) +
row('Á íslensku', 'Icelandic films and series from your add-ons · 44', [poster('heartstone', { on: true }), poster('godland'), `<div class="poster load"><b>Kona fer í stríð</b></div>`, `<div class="poster load"><b>Volaða land</b></div>`, poster('rams'), `<div class="poster txt"><small>No poster</small><b>Svar við bréfi Helgu</b></div>`, poster('touch')]) +
peek('Something different', 'Documentaries · a kind you rarely watch, rated 7.5 and up', ['oppenheimer', 'f1', 'dune2', 'sinners', 'weapons', 'mickey17', 'superman']) + foot;

const pages = { '01-evening.html': evening, '02-rows-comedy.html': rowsComedy, '03-rows-blend.html': rowsBlend, '04-game-night.html': gameNight, '05-library-comedy.html': library, '06-cold-start.html': coldStart, '07-channel-no-picture.html': channel, '08-loading-missing-art.html': loading };
for (const [f, html] of Object.entries(pages)) fs.writeFileSync(path.join(root, f), html);
fs.writeFileSync(path.join(root, 'tools', 'pages.json'), JSON.stringify([
  { file: '01-evening.html', title: 'A normal evening', note: 'Wed 20:41 · the Marquee: the lineup, Severance resumes with one press' },
  { file: '02-rows-comedy.html', title: 'The rows: Comedy for you', note: 'Down from the lineup · the picture answers the poster · the row index at the right' },
  { file: '03-rows-blend.html', title: 'The rows: Anime comedy', note: 'A blend row: two of his genres together, named plainly, marked New row for a week' },
  { file: '04-game-night.html', title: 'Game night', note: 'Thu 03:12 · Grizzlies at Trail Blazers live, shield on: ON NOW, no clock, records as of tip-off' },
  { file: '05-library-comedy.html', title: 'Movies: Comedy, deep', note: 'The add-on library: one long Cinemeta scroll per genre, #313 of 3,000+' },
  { file: '06-cold-start.html', title: 'First evening', note: 'No history: a popular pick, the team, the channel, and Pick what you like' },
  { file: '07-channel-no-picture.html', title: 'The channel line', note: 'No picture to show: the channel’s logo on a flat field, the programme and its time' },
  { file: '08-loading-missing-art.html', title: 'Loading and missing art', note: 'Posters still loading, a title with no poster, a title with no logo' },
], null, 2));
console.log('wrote', Object.keys(pages).length, 'pages');
