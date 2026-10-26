/* airglow UI mocks: realistic, messy content. Titles are fictional; channel names are the kind a provider really sends.
   Mock "now" is Mon 26 Oct, 20:41. Times are 24 h (brand rule). */
(function (g) {
  'use strict';
  const NOW = { day: 'Mon 26 Oct', time: '20:41', mins: 20 * 60 + 41 };

  const MOVIES = [
    { id: 'm1', vers: 4, t: 'Harbor Lights', y: 2024, r: 7.8, g: ['Thriller', 'Mystery'], lang: 'EN', q: ['4K', 'HDR'], rt: '2h 06m', raw: 'EN| Harbor Lights (2024) 4K HDR MULTI-SUB', style: 'sun', hue: 192, plot: 'A harbour pilot starts getting radio calls from a lighthouse that was decommissioned in 1987. Every call comes a few minutes before a ship goes missing.', dir: 'Mara Okafor', cast: 'Tom Heller, Ines Duarte, Paul Wen' },
    { id: 'm2', t: 'The Long Take', y: 2023, r: 7.4, g: ['Drama'], lang: 'EN', q: ['HD'], rt: '1h 48m', raw: 'EN| THE LONG TAKE 2023 FHD', style: 'figure', hue: 14, prog: 28, plot: 'One unbroken shot follows a stage manager through the last night of a theatre that is about to close.', dir: 'Luc Fabre', cast: 'Alma Reyes, Joel Tan' },
    { id: 'm3', vers: 2, t: 'Paper Moons', y: 2022, r: 8.1, g: ['Animation', 'Family'], lang: 'EN', q: ['4K'], rt: '1h 37m', raw: 'EN| Paper Moons (2022) [4K]', style: 'waves', hue: 232, plot: 'Two siblings fold a paper city and find out it folds back.', dir: 'Yuki Arai', cast: 'Voices of Ella Park, Sam Cho' },
    { id: 'm4', t: 'Dead Air', y: 2025, r: 6.9, g: ['Horror'], lang: 'EN', q: ['HD'], rt: '1h 31m', raw: 'EN| DEAD AIR 2025 WEB-DL', style: 'city', hue: 340, plot: 'The overnight host of a call-in show realises one caller keeps predicting the next.', dir: 'R. Castellan', cast: 'Dina Moss, Ike Barrow' },
    { id: 'm5', t: 'Salt & Static', y: 2021, r: 7.2, g: ['Comedy'], lang: 'EN', q: ['HD'], rt: '1h 44m', raw: 'EN| Salt and Static (2021)', style: 'retro', hue: 276, plot: 'Two rival radio hosts are stuck sharing one frequency and one lighthouse.', dir: 'Pia Nordin', cast: 'Gus Oyelaran, Wanda Li' },
    { id: 'm6', vers: 3, t: 'Midnight Relay', y: 2024, r: 7.6, g: ['Action'], lang: 'EN', q: ['4K'], rt: '2h 12m', raw: 'EN| Midnight Relay (2024) 2160p', style: 'city', hue: 210, plot: 'A courier crosses a city in one night with a package that everybody wants delivered late.', dir: 'Dag Holm', cast: 'Reza Amini, Kay Brandt' },
    { id: 'm7', t: 'Glass Orchard', y: 2019, r: 8.3, g: ['Drama'], lang: 'EN', q: ['HD'], rt: '2h 20m', raw: 'EN| Glass Orchard 2019 BluRay', style: 'forest', hue: 128, plot: 'Three generations argue over whether to sell the family greenhouse.', dir: 'Hana Weiss', cast: 'Ruth Calder, Ben Ito' },
    { id: 'm8', t: 'Low Orbit', y: 2023, r: 7.0, g: ['Sci-Fi'], lang: 'EN', q: ['4K'], rt: '1h 58m', raw: 'EN| Low Orbit (2023) 4K', style: 'rings', hue: 258, plot: 'A repair crew on a failing station has nine hours to fix a clock that is only wrong on Tuesdays.', dir: 'Tomas Lund', cast: 'Aiko Mori, Dev Rao' },
    { id: 'm9', t: 'The Cartographer', y: 2022, r: 7.7, g: ['Adventure'], lang: 'EN', q: ['HD'], rt: '2h 03m', raw: 'EN| The Cartographer (2022) MULTI', style: 'peaks', hue: 24, plot: 'A mapmaker is hired to chart a valley that keeps rearranging itself.', dir: 'Eli Brandt', cast: 'Mina Sato, Owen Pike' },
    { id: 'm10', t: 'Velvet Static', y: 2020, r: 6.5, g: ['Romance'], lang: 'EN', q: ['HD'], rt: '1h 39m', raw: 'EN| VELVET STATIC (2020)', style: 'waves', hue: 330, plot: 'A sound engineer and a voice actor fall for each other without ever meeting.', dir: 'Joy Abara', cast: 'Cleo Finch, Marc Dube' },
    { id: 'm11', t: 'Cold Harbour', y: 2024, r: 7.1, g: ['Crime'], lang: 'EN', q: ['HD'], rt: '1h 55m', raw: 'EN| Cold Harbour 2024 720p', style: 'sun', hue: 214, plot: 'A port inspector follows a missing container through three countries.', dir: 'Stig Berg', cast: 'Lena Kruger, Omar Haddad' },
    { id: 'm12', t: 'Northbound', y: 2018, r: 7.9, g: ['Drama'], lang: 'EN', q: ['HD'], rt: '2h 01m', raw: 'EN| Northbound (2018) BluRay', style: 'forest', hue: 200, plot: 'A night train, eleven strangers, one missed stop.', dir: 'C. Vidal', cast: 'Hugo Ramsey, Nora Weiss' },
    { id: 'm13', t: 'Ember Run', y: 2025, r: 6.8, g: ['Action'], lang: 'EN', q: ['4K'], rt: '1h 49m', raw: 'EN| EMBER RUN 2025 4K UHD', style: 'retro', hue: 8, plot: 'Wildfire season, one road out, and a convoy that cannot stop.', dir: 'Kai Mendez', cast: 'Tess Gordon, Lee Park' },
    { id: 'm14', t: 'Quiet Frequencies', y: 2021, r: 8.0, g: ['Mystery'], lang: 'EN', q: ['HD'], rt: '1h 52m', raw: 'EN| Quiet Frequencies (2021) HD', style: 'rings', hue: 290, plot: 'Someone is broadcasting numbers on a dead channel. A retired codebreaker answers.', dir: 'Ada Wren', cast: 'Walt Ferris, Imani Cole' },
    { id: 'm15', t: 'La Lumière Brisée', y: 2023, r: 7.5, g: ['Drama'], lang: 'FR', q: ['HD'], rt: '1h 59m', raw: 'FR| LA LUMIERE BRISEE (2023) VOSTFR', style: 'sun', hue: 40, plot: 'A glassmaker loses her sight and keeps working.', dir: 'Éloïse Marty', cast: 'Chloé Aubin' },
    { id: 'm16', t: 'Nattens Röst', y: 2022, r: 7.3, g: ['Thriller'], lang: 'SV', q: ['HD'], rt: '1h 46m', raw: 'SE| Nattens Röst 2022 SUBS', style: 'city', hue: 250, plot: 'The night ferry has one passenger too many.', dir: 'Maja Strand', cast: 'Jon Eklund' },
    { id: 'm17', t: 'Tidewater', y: 2020, r: 7.0, g: ['Drama'], lang: 'EN', q: ['HD'], rt: '1h 42m', raw: 'EN| Tidewater.2020.1080p', style: 'waves', hue: 176, plot: 'Brothers reopen a boatyard.', dir: 'N. Pryce', cast: 'Cal Frost' },
    { id: 'm18', t: 'The Understudy', y: 2024, r: 7.6, g: ['Comedy', 'Drama'], lang: 'EN', q: ['HD'], rt: '1h 53m', raw: 'EN| The Understudy (2024) [MULTI-SUB]', style: 'figure', hue: 316, plot: 'The lead falls ill on opening night. Nobody told the understudy it was tonight.', dir: 'Ana Lisbon', cast: 'Priya Nair, Doug Hale' },
    { id: 'm19', t: 'A Very Long Title for a Short Film That Keeps Going', y: 2019, r: 6.4, g: ['Short'], lang: 'EN', q: ['HD'], rt: '0h 24m', raw: 'EN| A Very Long Title for a Short Film That Keeps Going (2019)', noart: true },
    { id: 'm20', t: 'Copper Falls: The Movie', y: 2022, r: 6.9, g: ['Drama'], lang: 'EN', q: ['HD'], rt: '1h 35m', raw: 'EN| COPPER FALLS THE MOVIE 2022', noart: true },
  ];

  const SERIES = [
    { id: 's1', t: 'Night Circuit', y: 2024, r: 7.8, g: ['Thriller', 'Sci-Fi'], lang: 'EN', q: ['4K'], rating: 'TV-MA', seasons: 2, eps: 8, raw: 'EN| Night Circuit (2024) S01-S02 4K', style: 'city', hue: 262, plot: 'A night-shift radio engineer finds a signal that only appears during live broadcasts, and every game it interrupts changes the score.', cast: 'Mei Tanaka, Ola Berg, Reggie Cole' },
    { id: 's2', t: 'Signal Hill', y: 2023, r: 8.2, g: ['Drama'], lang: 'EN', q: ['HD'], rating: 'TV-14', seasons: 3, eps: 10, raw: 'EN| SIGNAL HILL (2023) S01-S03', style: 'peaks', hue: 150 },
    { id: 's3', t: 'The Understudy: Season Two', y: 2025, r: 7.1, g: ['Comedy'], lang: 'EN', q: ['HD'], rating: 'TV-14', seasons: 2, eps: 8, raw: 'EN| The Understudy S02', style: 'figure', hue: 316 },
    { id: 's4', t: 'Copper Falls', y: 2021, r: 7.6, g: ['Crime'], lang: 'EN', q: ['HD'], rating: 'TV-MA', seasons: 4, eps: 10, raw: 'EN| COPPER FALLS (2021)', style: 'forest', hue: 24 },
    { id: 's5', t: 'Deep Field', y: 2024, r: 8.4, g: ['Sci-Fi'], lang: 'EN', q: ['4K'], rating: 'TV-14', seasons: 1, eps: 8, raw: 'EN| Deep Field 2024 4K', style: 'rings', hue: 232 },
    { id: 's6', t: 'Rookie Season', y: 2022, r: 7.3, g: ['Sports', 'Drama'], lang: 'EN', q: ['HD'], rating: 'TV-PG', seasons: 2, eps: 12, raw: 'EN| Rookie Season (2022)', style: 'court', hue: 28 },
  ];

  const EPISODES = [
    { n: 1, t: 'Dead Air', rt: '48m', done: true, plot: 'An overnight shift. One station. A signal nobody scheduled.' },
    { n: 2, t: 'Signal', rt: '47m', done: true, plot: 'Mei traces the burst to a stadium that was demolished in March.' },
    { n: 3, t: 'Night Circuit', rt: '49m', prog: 58, plot: 'The signal returns in the fourth quarter and changes the score.' },
    { n: 4, t: 'The Relay', rt: '48m', plot: 'A second transmitter is found in the wrong city.' },
    { n: 5, t: 'Low Orbit', rt: '52m', plot: 'A satellite pass gives them eleven minutes.' },
    { n: 6, t: 'Static', rt: '46m', plot: 'The recordings do not match the broadcast.' },
    { n: 7, t: 'Handoff', rt: '50m', plot: 'Someone else is listening.' },
    { n: 8, t: 'Sign-off', rt: '55m', plot: 'Season finale.' },
  ];

  /* Live channels as a provider sends them (raw) and as the app shows them (name, tag). */
  const CHANNELS = [
    { n: 4, art: { style: 'arena',hue:28 }, raw: 'US| NBA LEAGUE PASS 04 ᴴᴰ', name: 'NBA League Pass 4', tag: 'US', q: 'HD', ini: 'NBA', fav: true, now: { t: 'Grizzlies at Warriors', s: 19.5, e: 22, live: true, game: true }, next: { t: 'NBA Postgame', s: 22, e: 22.5 } },
    { n: 12, art: { style: 'studio',hue:212 }, raw: 'US: ESPN HD', name: 'ESPN', tag: 'US', q: 'HD', ini: 'ES', fav: true, now: { t: 'SportsCenter', s: 20, e: 21 }, next: { t: 'NFL Live', s: 21, e: 22 } },
    { n: 31, art: { style: 'arena',hue:18 }, raw: 'USA| TNT SPORTS 1 FHD', name: 'TNT Sports 1', tag: 'US', q: 'FHD', ini: 'TN', now: { t: 'Lakers at Suns', s: 20.5, e: 23, live: true, game: true }, next: { t: 'Inside the NBA', s: 23, e: 24 } },
    { n: 33, art: { style: 'studio',hue:268 }, raw: 'US| NBA TV', name: 'NBA TV', tag: 'US', q: 'HD', ini: 'NT', fav: true, now: { t: 'Game Time', s: 20, e: 21 }, next: { t: 'Press Pass', s: 21, e: 21.5 } },
    { n: 101, art: { style: 'studio',hue:200 }, raw: 'UK| BBC ONE HD', name: 'BBC One', tag: 'UK', q: 'HD', ini: 'B1', now: { t: 'Panorama', s: 20.5, e: 21 }, next: { t: 'Silent Witness', s: 21, e: 22 } },
    { n: 118, art: { style: 'pitch',hue:132 }, raw: 'UK| SKY SPORTS MAIN EVENT FHD', name: 'Sky Sports Main Event', tag: 'UK', q: 'FHD', ini: 'SS', now: { t: 'Premier League: Live', s: 20, e: 22.25, live: true }, next: { t: 'Final Score', s: 22.25, e: 23 } },
    { n: 204, art: { style: 'studio',hue:300 }, raw: '|EN| CNN INTERNATIONAL', name: 'CNN International', tag: 'EN', q: 'HD', ini: 'CN', now: { t: 'Connect the World', s: 20, e: 21 }, next: { t: 'Amanpour', s: 21, e: 22 } },
    { n: 305, art: { style: 'theatre',hue:330 }, raw: '┃NL┃ RTL 4 HD', name: 'RTL 4', tag: 'NL', q: 'HD', ini: 'R4', now: { t: 'Goede Tijden, Slechte Tijden', s: 20.25, e: 20.75 }, next: { t: 'RTL Nieuws', s: 20.75, e: 21.25 } },
    { n: 412, art: { style: 'pitch',hue:150 }, raw: 'FR| CANAL+ SPORT 360 4K', name: 'Canal+ Sport 360', tag: 'FR', q: '4K', ini: 'C+', now: { t: 'Top 14: Résumé', s: 20, e: 21.5 }, next: { t: 'Match en direct', s: 21.5, e: 23.5 } },
    { n: 501, art: { style: 'tower',hue:205 }, raw: 'US| MOVIE CHANNEL EAST', name: 'Movie Channel East', tag: 'US', q: 'HD', ini: 'MC', now: { t: 'Midnight Relay', s: 20.25, e: 22.3 }, next: { t: 'Cold Harbour', s: 22.3, e: 24.3 } },
  ];

  /* Team identity (UI-SPEC 3.4). c1/c2 = the stand-in crest (the app shows the ESPN logo, 500-dark, inside the same neutral disc).
     p = flat field colour (dark enough for 7:1 chalk text), a = 4 px edge accent. Red, orange and crimson teams (HOU, MIA, CLE, PHX, OKC) get
     a non-red accent so no team colour can read as LIVE. */
  const TEAMS = {
    MEM: { n: 'Grizzlies', city: 'Memphis', c1: '#12173F', c2: '#5D76A9', p: '#12173F', a: '#5D76A9' },
    GS: { n: 'Warriors', city: 'Golden State', c1: '#1D428A', c2: '#FFC72C', p: '#10285C', a: '#FFC72C' },
    BOS: { n: 'Celtics', city: 'Boston', c1: '#007A33', c2: '#F3EFE6', p: '#00381C', a: '#BA9653' },
    NY: { n: 'Knicks', city: 'New York', c1: '#006BB6', c2: '#F58426', p: '#00305A', a: '#F58426' },
    LAL: { n: 'Lakers', city: 'Los Angeles', c1: '#552583', c2: '#FDB927', p: '#3A1A5A', a: '#FDB927' },
    PHX: { n: 'Suns', city: 'Phoenix', c1: '#1D1160', c2: '#E56020', p: '#1D1160', a: '#8E7ED8' },
    DAL: { n: 'Mavericks', city: 'Dallas', c1: '#00538C', c2: '#B8C4CA', p: '#00285E', a: '#7FA6D0' },
    HOU: { n: 'Rockets', city: 'Houston', c1: '#CE1141', c2: '#C4CED4', p: '#26262B', a: '#C4CED4' },
    DEN: { n: 'Nuggets', city: 'Denver', c1: '#0E2240', c2: '#FEC524', p: '#0E2240', a: '#FEC524' },
    OKC: { n: 'Thunder', city: 'Oklahoma City', c1: '#0A3A5E', c2: '#007AC1', p: '#0A3A5E', a: '#4DA6E0' },
    MIL: { n: 'Bucks', city: 'Milwaukee', c1: '#00471B', c2: '#EEE1C6', p: '#00331A', a: '#EEE1C6' },
    MIA: { n: 'Heat', city: 'Miami', c1: '#98002E', c2: '#F9A01B', p: '#1F1B22', a: '#F9A01B' },
    CLE: { n: 'Cavaliers', city: 'Cleveland', c1: '#860038', c2: '#FDBB30', p: '#2B1A33', a: '#FDBB30' },
    IND: { n: 'Pacers', city: 'Indiana', c1: '#002D62', c2: '#FDBB30', p: '#00204A', a: '#FDBB30' },
  };
  const GAMES = [
    { id: 'g1', away: 'MEM', home: 'GS', aw: 77, hw: 70, ar: '1-0', hr: '0-1', state: 'in', q: 3, clock: '7:29', tv: ['NBA League Pass', 'ESPN'], mine: true, lines: { MEM: [24, 21, 32], GS: [19, 25, 26] }, lead: { MEM: ['G. Marshall', '24 PTS'], GS: ['T. Whitlock', '22 PTS'] } },
    { id: 'g2', away: 'LAL', home: 'PHX', aw: 48, hw: 51, ar: '0-1', hr: '1-0', state: 'in', q: 2, clock: '4:12', tv: ['TNT'] },
    { id: 'g3', away: 'BOS', home: 'NY', aw: 112, hw: 104, ar: '1-0', hr: '0-1', state: 'post', tv: ['ESPN'] },
    { id: 'g4', away: 'DAL', home: 'HOU', aw: 121, hw: 118, ar: '1-0', hr: '0-1', state: 'post', ot: true, tv: ['NBA League Pass'] },
    { id: 'g5', away: 'CLE', home: 'IND', aw: 108, hw: 99, ar: '1-0', hr: '0-1', state: 'post', tv: ['NBA League Pass'] },
    { id: 'g6', away: 'DEN', home: 'OKC', state: 'pre', tip: '21:30', ar: '1-0', hr: '0-1', tv: ['TNT'] },
    { id: 'g7', away: 'MIL', home: 'MIA', state: 'pre', tip: '22:00', ar: '0-1', hr: '1-0', tv: ['NBA League Pass'] },
  ];

  /* One deterministic rule for the stand-in channel tile (the app shows the provider logo when it loads): first letter of the first two
     words, or the first two letters of a single word. Letters only, so "Canal+ Sport 360" is CS and "RTL 4" is R4. */
  const iniOf = (name) => { const w = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean); return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase(); };
  CHANNELS.forEach((c) => { c.ini = iniOf(c.name); });
  const m = (id) => MOVIES.find((x) => x.id === id), sr = (id) => SERIES.find((x) => x.id === id);
  Object.assign(m('m1'), { style: 'lighthouse', hue: 205 }); Object.assign(m('m2'), { style: 'theatre', hue: 14 }); Object.assign(sr('s1'), { style: 'tower', hue: 262 });
  Object.assign(m('m6'), { style: 'tower', hue: 205 });

  g.Mock = { iniOf, NOW, MOVIES, SERIES, EPISODES, CHANNELS, TEAMS, GAMES };
})(window);
