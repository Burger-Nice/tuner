// A fake TMDB API v3 for the Home and library tests (design/ui-v1/home-final/SPEC.md 6a), served by tests/mock-provider.js
// on the same port under /tmdb/3/… and its images under /tmdb-img/…. The titles are real names with made-up ids
// (IMDb tt95…, TMDB 7…/8…) and the mocks' art (design/ui-v1/home-final/art). The fake Cinemeta (tests/mock-addons.js)
// answers metas for the same ids, so a TMDB row's title opens on its page and plays through the fake add-ons.
// The app points at it with localStorage: tuner.tmdbBase -> <host>/tmdb/3, tuner.tmdbImg -> <host>/tmdb-img,
// tuner.tmdbKey -> 'test-tmdb-token' (any other key is refused: 401).
// Test helpers: GET /_tmdb/hits (how many requests, by path), /_tmdb/reset.
const fs = require('fs');
const path = require('path');
const ART = path.join(__dirname, '../design/ui-v1/home-final/art');
const TOKEN = 'test-tmdb-token', V3 = '0123456789abcdef0123456789abcdef';
const hits = {};
const MG = { Action: 28, Adventure: 12, Animation: 16, Comedy: 35, Crime: 80, Documentary: 99, Drama: 18, Family: 10751, Fantasy: 14, History: 36, Horror: 27, Music: 10402, Mystery: 9648, Romance: 10749, 'Sci-Fi': 878, Thriller: 53, War: 10752, Western: 37 };
const TG = { Action: 10759, Adventure: 10759, Animation: 16, Comedy: 35, Crime: 80, Documentary: 99, Drama: 18, Family: 10751, Fantasy: 10765, Mystery: 9648, 'Sci-Fi': 10765, War: 10768, Western: 37, Thriller: 9648, Romance: 18, Horror: 9648, History: 10768, Music: 18 };
// [slug, type, name, year, genres, lang, country, rating, votes, popularity, runtime, overview, anime?]
const RAW = [
  ['sunny', 's', "It's Always Sunny in Philadelphia", 2005, ['Comedy'], 'en', 'United States', 8.8, 3200, 210, 22, 'Five friends run a bar in Philadelphia, badly.'],
  ['office', 's', 'The Office', 2005, ['Comedy'], 'en', 'United States', 9.0, 4100, 260, 22, 'A mockumentary about the employees of a paper company.'],
  ['studio', 's', 'The Studio', 2025, ['Comedy'], 'en', 'United States', 8.2, 900, 150, 30, 'A film studio boss tries to keep art alive.'],
  ['palmsprings', 'm', 'Palm Springs', 2020, ['Comedy', 'Romance'], 'en', 'United States', 7.4, 4300, 90, 90, 'Stuck in a time loop, two wedding guests develop a flirtation.'],
  ['niceguys', 'm', 'The Nice Guys', 2016, ['Action', 'Comedy', 'Crime'], 'en', 'United States', 7.4, 6100, 80, 116, 'A private eye and a tough enforcer look for a missing girl.'],
  ['gemstones', 's', 'The Righteous Gemstones', 2019, ['Comedy'], 'en', 'United States', 8.1, 700, 85, 40, 'A televangelist family with a long tradition of mischief.'],
  ['hotfuzz', 'm', 'Hot Fuzz', 2007, ['Action', 'Comedy'], 'en', 'United Kingdom', 7.8, 7500, 70, 121, 'A top London cop is sent to a quiet village.'],
  ['friendship', 'm', 'Friendship', 2025, ['Comedy'], 'en', 'United States', 6.9, 400, 120, 100, 'A suburban dad befriends his new neighbour.'],
  ['wwdits', 's', 'What We Do in the Shadows', 2019, ['Comedy', 'Fantasy'], 'en', 'United States', 8.6, 2100, 140, 25, 'Four vampires share a house on Staten Island.'],
  ['gamenight', 'm', 'Game Night', 2018, ['Comedy', 'Crime'], 'en', 'United States', 7.0, 5200, 60, 100, 'A game night turns into a real mystery.'],
  ['platonic', 's', 'Platonic', 2023, ['Comedy'], 'en', 'United States', 7.2, 300, 75, 30, 'Two old friends reconnect in midlife.'],
  ['greatnews', 's', 'Great News', 2017, ['Comedy'], 'en', 'United States', 7.4, 220, 30, 22, 'A producer\'s mother becomes her intern.'],
  ['tildeath', 's', "'Til Death", 2006, ['Comedy'], 'en', 'United States', 6.9, 180, 25, 22, 'A long-married couple and their newlywed neighbours.'],
  ['fnd', 's', 'Friday Night Dinner', 2011, ['Comedy'], 'en', 'United Kingdom', 8.0, 600, 40, 25, 'Two brothers go home for dinner every Friday.'],
  ['peepshow', 's', 'Peep Show', 2003, ['Comedy'], 'en', 'United Kingdom', 8.6, 900, 45, 25, 'Two flatmates and their inner thoughts.'],
  ['anchorman', 'm', 'Anchorman', 2004, ['Comedy'], 'en', 'United States', 7.2, 8000, 55, 94, 'A 1970s news anchor meets his match.'],
  ['burnafterreading', 'm', 'Burn After Reading', 2008, ['Comedy', 'Crime'], 'en', 'United States', 7.0, 6200, 40, 96, 'A CIA memoir falls into the wrong hands.'],
  ['dumb', 'm', 'Dumb and Dumber', 1994, ['Comedy'], 'en', 'United States', 7.3, 9000, 50, 107, 'Two well-meaning dimwits cross the country.'],
  ['groundhog', 'm', 'Groundhog Day', 1993, ['Comedy', 'Fantasy', 'Romance'], 'en', 'United States', 8.0, 9800, 52, 101, 'A weatherman relives the same day again and again.'],
  ['tropic', 'm', 'Tropic Thunder', 2008, ['Action', 'Comedy'], 'en', 'United States', 7.1, 7200, 48, 107, 'Actors on a war film end up in a real war.'],
  ['shaun', 'm', 'Shaun of the Dead', 2004, ['Comedy', 'Horror'], 'en', 'United Kingdom', 7.9, 8100, 46, 99, 'A slacker faces a zombie outbreak.'],
  ['otherguys', 'm', 'The Other Guys', 2010, ['Action', 'Comedy', 'Crime'], 'en', 'United States', 6.7, 6000, 44, 107, 'Two mismatched desk cops get their chance.'],
  ['meangirls', 'm', 'Mean Girls', 2004, ['Comedy'], 'en', 'United States', 7.1, 8500, 43, 97, 'A new girl learns the rules of high school.'],
  ['jumpstreet', 'm', '21 Jump Street', 2012, ['Action', 'Comedy', 'Crime'], 'en', 'United States', 7.2, 9100, 42, 109, 'Two cops go undercover in a high school.'],
  ['happygilmore', 'm', 'Happy Gilmore', 1996, ['Comedy'], 'en', 'United States', 7.0, 7800, 41, 92, 'A failed hockey player becomes a golfer.'],
  ['knivesout', 'm', 'Knives Out', 2019, ['Comedy', 'Crime', 'Mystery'], 'en', 'United States', 7.9, 9900, 66, 130, 'A detective investigates a crime novelist\'s death.'],
  ['budapest', 'm', 'The Grand Budapest Hotel', 2014, ['Comedy', 'Drama'], 'en', 'Germany', 8.1, 9500, 58, 99, 'A concierge and his lobby boy at a famous hotel.'],
  ['bottoms', 'm', 'Bottoms', 2023, ['Comedy'], 'en', 'United States', 6.8, 1500, 39, 92, 'Two unpopular girls start a fight club.'],
  ['holdovers', 'm', 'The Holdovers', 2023, ['Comedy', 'Drama'], 'en', 'United States', 7.9, 2600, 38, 133, 'A teacher stays on campus over the holidays.'],
  ['inbruges', 'm', 'In Bruges', 2008, ['Comedy', 'Crime', 'Drama'], 'en', 'United Kingdom', 7.9, 6000, 37, 107, 'Two hitmen hide out in Bruges.'],
  ['superbad', 'm', 'Superbad', 2007, ['Comedy'], 'en', 'United States', 7.6, 8700, 36, 113, 'Two friends try to make it to one last party.'],
  ['stepbrothers', 'm', 'Step Brothers', 2008, ['Comedy'], 'en', 'United States', 6.9, 7000, 35, 98, 'Two grown men become stepbrothers.'],
  ['officespace', 'm', 'Office Space', 1999, ['Comedy'], 'en', 'United States', 7.6, 5600, 34, 89, 'Three office workers plot against their company.'],
  ['popstar', 'm', 'Popstar: Never Stop Never Stopping', 2016, ['Comedy', 'Music'], 'en', 'United States', 6.7, 900, 33, 87, 'A pop star\'s second album flops.'],
  ['lebowski', 'm', 'The Big Lebowski', 1998, ['Comedy', 'Crime'], 'en', 'United States', 8.1, 9600, 32, 117, 'The Dude wants his rug back.'],
  ['stalin', 'm', 'The Death of Stalin', 2017, ['Comedy', 'History'], 'en', 'United Kingdom', 7.3, 2300, 31, 107, 'The scramble for power after Stalin dies.'],
  ['nakedgun', 'm', 'The Naked Gun', 2025, ['Comedy', 'Crime'], 'en', 'United States', 7.0, 800, 130, 85, 'A police lieutenant follows in his father\'s footsteps.'],
  // anime (Japanese, keyword 210024)
  ['spyxfamily', 's', 'Spy x Family', 2022, ['Animation', 'Action', 'Comedy'], 'ja', 'Japan', 8.5, 1800, 190, 24, 'A spy marries and adopts a child as part of his cover.', 1],
  ['onepunch', 's', 'One Punch Man', 2015, ['Animation', 'Action', 'Comedy'], 'ja', 'Japan', 8.4, 2100, 170, 24, 'A hero who wins every fight with one punch is bored.', 1],
  ['mobpsycho', 's', 'Mob Psycho 100', 2016, ['Animation', 'Action', 'Comedy'], 'ja', 'Japan', 8.5, 900, 120, 24, 'A boy with psychic powers wants a normal life.', 1],
  ['konosuba', 's', 'KonoSuba', 2016, ['Animation', 'Comedy', 'Fantasy'], 'ja', 'Japan', 8.1, 700, 110, 24, 'A gamer is sent to a fantasy world with useless allies.', 1],
  ['kaguya', 's', 'Kaguya-sama: Love Is War', 2019, ['Animation', 'Comedy', 'Romance'], 'ja', 'Japan', 8.4, 800, 105, 24, 'Two geniuses wait for the other to confess first.', 1],
  ['bocchi', 's', 'Bocchi the Rock!', 2022, ['Animation', 'Comedy', 'Music'], 'ja', 'Japan', 8.6, 500, 100, 24, 'A shy guitarist joins a band.', 1],
  ['saiki', 's', 'The Disastrous Life of Saiki K.', 2016, ['Animation', 'Comedy'], 'ja', 'Japan', 8.2, 600, 95, 24, 'A psychic teenager wants a quiet life.', 1],
  ['nichijou', 's', 'Nichijou', 2011, ['Animation', 'Comedy'], 'ja', 'Japan', 8.0, 300, 60, 24, 'Ordinary days, made absurd.', 1],
  ['gintama', 's', 'Gintama', 2006, ['Animation', 'Action', 'Comedy'], 'ja', 'Japan', 8.6, 900, 90, 24, 'A samurai odd-jobber in an Edo ruled by aliens.', 1],
  ['dandadan', 's', 'Dandadan', 2024, ['Animation', 'Action', 'Comedy'], 'ja', 'Japan', 8.6, 700, 160, 24, 'A girl who believes in ghosts meets a boy who believes in aliens.', 1],
  ['frieren', 's', 'Frieren: Beyond Journey\'s End', 2023, ['Animation', 'Adventure', 'Fantasy'], 'ja', 'Japan', 8.8, 900, 150, 24, 'An elf mage outlives her party.', 1],
  ['jojo', 's', 'JoJo\'s Bizarre Adventure', 2012, ['Animation', 'Action', 'Adventure'], 'ja', 'Japan', 8.4, 1300, 100, 24, 'Generations of the Joestar family fight evil.', 1],
  // animation that is not anime
  ['toystory5', 'm', 'Toy Story 5', 2026, ['Animation', 'Comedy', 'Family'], 'en', 'United States', 7.2, 400, 140, 100, 'The toys meet a tablet.'],
  // crime dramas, thrillers, drama
  ['breakingbad', 's', 'Breaking Bad', 2008, ['Crime', 'Drama', 'Thriller'], 'en', 'United States', 9.5, 14000, 300, 47, 'A chemistry teacher turns to making meth.'],
  ['boardwalk', 's', 'Boardwalk Empire', 2010, ['Crime', 'Drama'], 'en', 'United States', 8.6, 1800, 70, 55, 'Atlantic City during Prohibition.'],
  ['gomorrah', 's', 'Gomorrah', 2014, ['Crime', 'Drama'], 'it', 'Italy', 8.7, 900, 60, 50, 'The Camorra in Naples.'],
  ['justified', 's', 'Justified', 2010, ['Crime', 'Drama', 'Western'], 'en', 'United States', 8.6, 1200, 65, 44, 'A US marshal goes back to Kentucky.'],
  ['mindhunter', 's', 'Mindhunter', 2017, ['Crime', 'Drama', 'Thriller'], 'en', 'United States', 8.6, 2600, 80, 60, 'FBI agents interview serial killers.'],
  ['narcos', 's', 'Narcos', 2015, ['Crime', 'Drama'], 'en', 'United States', 8.8, 3000, 90, 50, 'The rise of the Medellín cartel.'],
  ['ozark', 's', 'Ozark', 2017, ['Crime', 'Drama'], 'en', 'United States', 8.4, 3400, 85, 60, 'A financial adviser launders money in the Ozarks.'],
  ['nightof', 's', 'The Night Of', 2016, ['Crime', 'Drama'], 'en', 'United States', 8.5, 1600, 50, 60, 'A night out ends in a murder charge.'],
  ['topboy', 's', 'Top Boy', 2011, ['Crime', 'Drama'], 'en', 'United Kingdom', 8.4, 500, 40, 50, 'Two dealers on an East London estate.'],
  ['tokyovice', 's', 'Tokyo Vice', 2022, ['Crime', 'Drama'], 'en', 'United States', 8.1, 600, 55, 55, 'An American reporter on the Tokyo police beat.'],
  ['departed', 'm', 'The Departed', 2006, ['Crime', 'Drama', 'Thriller'], 'en', 'United States', 8.5, 15000, 60, 151, 'An undercover cop and a mole in the police.'],
  ['goodfellas', 'm', 'Goodfellas', 1990, ['Crime', 'Drama'], 'en', 'United States', 8.7, 13000, 58, 145, 'Henry Hill and his life in the mob.'],
  ['heat', 'm', 'Heat', 1995, ['Action', 'Crime', 'Drama'], 'en', 'United States', 8.3, 7800, 57, 170, 'A detective hunts a crew of master thieves.'],
  ['prophet', 'm', 'A Prophet', 2009, ['Crime', 'Drama'], 'fr', 'France', 7.9, 2000, 20, 155, 'A young man rises in a prison gang.'],
  ['severance', 's', 'Severance', 2022, ['Drama', 'Mystery', 'Sci-Fi'], 'en', 'United States', 8.7, 2800, 200, 50, 'Office workers whose memories are split between work and home.'],
  ['slowhorses', 's', 'Slow Horses', 2022, ['Drama', 'Thriller', 'Crime'], 'en', 'United Kingdom', 8.3, 1100, 180, 45, 'MI5\'s rejects in a London backwater.'],
  ['lastofus', 's', 'The Last of Us', 2023, ['Drama', 'Sci-Fi', 'Action'], 'en', 'United States', 8.6, 5200, 220, 55, 'A smuggler escorts a girl across a ruined America.'],
  ['andor', 's', 'Andor', 2022, ['Sci-Fi', 'Drama', 'Action'], 'en', 'United States', 8.4, 1900, 160, 45, 'A thief becomes a rebel.'],
  // popular films
  ['hailmary', 'm', 'Project Hail Mary', 2026, ['Sci-Fi', 'Adventure', 'Drama'], 'en', 'United States', 8.2, 1600, 400, 157, 'A science teacher wakes up alone on a spaceship.'],
  ['dune2', 'm', 'Dune: Part Two', 2024, ['Sci-Fi', 'Adventure'], 'en', 'United States', 8.5, 6000, 210, 166, 'Paul Atreides joins the Fremen.'],
  ['f1', 'm', 'F1', 2025, ['Action', 'Drama'], 'en', 'United States', 7.7, 2500, 230, 155, 'A veteran driver returns to Formula 1.'],
  ['superman', 'm', 'Superman', 2025, ['Action', 'Sci-Fi', 'Adventure'], 'en', 'United States', 7.3, 3000, 240, 129, 'Superman finds his place in Metropolis.'],
  ['sinners', 'm', 'Sinners', 2025, ['Horror', 'Drama', 'Thriller'], 'en', 'United States', 7.6, 3100, 190, 137, 'Twin brothers return home to the Mississippi Delta.'],
  ['weapons', 'm', 'Weapons', 2025, ['Horror', 'Mystery'], 'en', 'United States', 7.4, 1800, 170, 128, 'A class of children vanishes in one night.'],
  ['mickey17', 'm', 'Mickey 17', 2025, ['Sci-Fi', 'Comedy'], 'en', 'United States', 6.8, 2200, 150, 137, 'An expendable worker on a colony mission.'],
  ['onebattle', 'm', 'One Battle After Another', 2025, ['Action', 'Crime', 'Thriller'], 'en', 'United States', 8.1, 1300, 260, 162, 'Ex-revolutionaries reunite to rescue a daughter.'],
  ['eeaao', 'm', 'Everything Everywhere All at Once', 2022, ['Action', 'Comedy', 'Sci-Fi'], 'en', 'United States', 7.8, 6800, 80, 139, 'A laundromat owner across the multiverse.'],
  // Icelandic
  ['trapped', 's', 'Trapped', 2015, ['Crime', 'Drama', 'Thriller'], 'is', 'Iceland', 7.9, 400, 40, 50, 'A body is found as a storm cuts off a fjord town.'],
  ['katla', 's', 'Katla', 2021, ['Drama', 'Sci-Fi', 'Mystery'], 'is', 'Iceland', 7.0, 300, 35, 50, 'People return from the glacier at an erupting volcano.'],
  ['valhalla', 's', 'The Valhalla Murders', 2019, ['Crime', 'Drama'], 'is', 'Iceland', 6.9, 150, 20, 45, 'A detective links murders to a boys\' home.'],
  ['blacksands', 's', 'Black Sands', 2021, ['Crime', 'Drama'], 'is', 'Iceland', 6.6, 40, 12, 45, 'A detective in a small town on the south coast.'],
  ['blackport', 's', 'Blackport', 2021, ['Comedy', 'Drama'], 'is', 'Iceland', 7.2, 35, 11, 45, 'A fishing town in the 1980s fights over quotas.'],
  ['godland', 'm', 'Godland', 2022, ['Drama', 'History'], 'is', 'Iceland', 7.4, 260, 15, 143, 'A Danish priest travels to a remote part of Iceland.'],
  ['heartstone', 'm', 'Heartstone', 2016, ['Drama', 'Romance'], 'is', 'Iceland', 7.4, 280, 14, 129, 'In an Icelandic fishing village, a boy falls for his best friend.'],
  ['rams', 'm', 'Rams', 2015, ['Drama', 'Comedy'], 'is', 'Iceland', 7.3, 330, 13, 93, 'Two brothers who haven\'t spoken in decades.'],
  ['lamb', 'm', 'Lamb', 2021, ['Horror', 'Drama'], 'is', 'Iceland', 6.3, 900, 16, 106, 'A childless couple raise a strange newborn.'],
  ['womanatwar', 'm', 'Woman at War', 2018, ['Drama', 'Comedy'], 'is', 'Iceland', 7.3, 400, 12, 101, 'A choir teacher sabotages the aluminium industry.'],
  ['touch', 'm', 'Touch', 2024, ['Drama', 'Romance'], 'is', 'Iceland', 7.5, 120, 11, 121, 'A widower looks for his first love.'],
  ['lightbreaks', 'm', 'When the Light Breaks', 2024, ['Drama'], 'is', 'Iceland', 6.9, 60, 10, 82, 'A summer day in Reykjavík turns into grief.'],
  ['northerncomfort', 'm', 'Northern Comfort', 2023, ['Comedy'], 'is', 'Iceland', 6.4, 70, 10, 97, 'A fear-of-flying group gets stranded in Iceland.'],
  // something different
  ['freesolo', 'm', 'Free Solo', 2018, ['Documentary'], 'en', 'United States', 8.0, 2300, 20, 100, 'A climber attempts El Capitan without a rope.'],
  ['octopus', 'm', 'My Octopus Teacher', 2020, ['Documentary'], 'en', 'South Africa', 8.0, 1600, 18, 85, 'A filmmaker forms a bond with an octopus.'],
  ['lastdance', 's', 'The Last Dance', 2020, ['Documentary'], 'en', 'United States', 8.9, 1800, 25, 50, 'Michael Jordan and the 1990s Chicago Bulls.'],
  ['apollo', 'm', 'Apollo 11', 2019, ['Documentary', 'History'], 'en', 'United States', 8.1, 900, 15, 93, 'The first moon landing in found footage.'],
  ['honnold', 'm', 'The Rescue', 2021, ['Documentary'], 'en', 'United States', 7.8, 500, 14, 107, 'The Thai cave rescue.'],
  ['summerofsoul', 'm', 'Summer of Soul', 2021, ['Documentary', 'Music'], 'en', 'United States', 7.9, 400, 13, 117, 'The 1969 Harlem Cultural Festival.'],
  ['fireoflove', 'm', 'Fire of Love', 2022, ['Documentary'], 'en', 'United States', 7.6, 380, 12, 93, 'Two volcanologists in love.'],
];
// more films and series (made-up names), so the discovery rows (trending, the services, hidden gems, a decade, short
// films) have titles of their own after the rows above them took theirs
const FW = ['Harbour', 'Ember', 'Silver', 'Quiet', 'Northern', 'Paper', 'Velvet', 'Iron', 'Glass', 'Hollow', 'Crimson', 'Distant'];
const FN = ['Lights', 'Road', 'Tide', 'Country', 'Hours', 'Line', 'House', 'Winter'];
const FG = [['Drama', 'Thriller'], ['Action', 'Adventure'], ['Sci-Fi', 'Thriller'], ['Drama', 'Romance'], ['Mystery', 'Crime'], ['Action', 'Sci-Fi'], ['Drama'], ['Adventure', 'Drama']];
for (let i = 0; i < 288; i++) {
  const series = i % 3 === 0, year = [2026, 2026, 1994, 1997, 2003, 2007, 2015, 2019][i % 8];
  RAW.push([`fill${i}`, series ? 's' : 'm', `${FW[i % 12]} ${FN[Math.floor(i / 12) % 8]}${i >= 96 ? ` ${['II', 'III'][Math.floor(i / 96) - 1]}` : ''}`, year, FG[i % 8], 'en', 'United States', 6.6 + (i % 14) / 10, [180, 400, 900, 1400, 2600, 5200][i % 6], 8 + (i % 20), series ? 45 : [88, 95, 112, 124, 98, 135][i % 6], `A made-up ${series ? 'series' : 'film'} for the tests.`]);
}
const imdbOf = (i) => `tt95${String(i).padStart(5, '0')}`;
const TITLES = RAW.map(([slug, t, name, year, genres, lang, country, rating, votes, pop, runtime, overview, anime], i) => ({
  i, slug, type: t === 's' ? 'series' : 'movie', name, year, genres, lang, country, rating, votes, pop, runtime, overview, anime: !!anime,
  tmdb: (t === 's' ? 80000 : 70000) + i, imdb: imdbOf(i),
}));
const byImdb = new Map(TITLES.map((x) => [x.imdb, x]));
const byTmdb = new Map(TITLES.map((x) => [`${x.type}:${x.tmdb}`, x]));
const has = (f) => fs.existsSync(path.join(ART, f));
const poster = (x) => (x.slug === 'northerncomfort' ? null : has(`${x.slug}-poster.jpg`) ? `/${x.slug}-poster.jpg` : `/p${x.i % 8}.jpg`);
const backdrop = (x) => (has(`${x.slug}-bg.jpg`) ? `/${x.slug}-bg.jpg` : x.slug === 'heartstone' ? null : `/bd.jpg`);
const genreIds = (x) => [...new Set(x.genres.map((g) => (x.type === 'series' ? TG : MG)[g]).filter(Boolean))];
const date = (x) => `${x.year}-0${1 + (x.i % 9)}-1${x.i % 9}`;
const result = (x) => ({
  id: x.tmdb, [x.type === 'series' ? 'name' : 'title']: x.name, [x.type === 'series' ? 'original_name' : 'original_title']: x.name,
  [x.type === 'series' ? 'first_air_date' : 'release_date']: date(x), genre_ids: genreIds(x), original_language: x.lang, overview: x.overview,
  poster_path: poster(x), backdrop_path: backdrop(x), vote_average: x.rating, vote_count: x.votes, popularity: x.pop,
});
// Because you watched Always Sunny: the research's verified list first (SPEC 6)
const RECS = { sunny: ['platonic', 'greatnews', 'tildeath', 'fnd', 'peepshow', 'studio', 'wwdits', 'gemstones', 'popstar', 'stalin', 'officespace', 'stepbrothers', 'happygilmore', 'bottoms', 'superbad', 'meangirls', 'budapest', 'holdovers', 'knivesout', 'nakedgun', 'burnafterreading', 'gamenight', 'niceguys'], office: ['platonic', 'greatnews', 'peepshow', 'fnd', 'studio'], studio: ['platonic', 'greatnews', 'gemstones', 'wwdits'] };
function recommendations(x) {
  const ids = RECS[x.slug];
  if (ids) return ids.map((s) => TITLES.find((y) => y.slug === s)).filter((y) => y && y.type === x.type);   // (TMDB recommends within a type)
  return TITLES.filter((y) => y !== x && y.type === x.type && y.genres.some((g) => x.genres.includes(g))).sort((a, b) => b.genres.filter((g) => x.genres.includes(g)).length - a.genres.filter((g) => x.genres.includes(g)).length || b.pop - a.pop).slice(0, 20);
}
// the services a title is on (Netflix, Disney+, Max, Apple TV+): by its index
const providers = (x) => [[8], [337], [1899], [350, 8]][(x.i + Math.floor(x.i / 8)) % 4];
function discover(type, q) {
  const kind = type === 'tv' ? 'series' : 'movie';
  const list0 = TITLES.filter((x) => x.type === kind);
  const ids = (s, sep) => String(s || '').split(sep).filter(Boolean).map(Number);
  const withG = q.get('with_genres') ? (q.get('with_genres').includes('|') ? { any: ids(q.get('with_genres'), '|') } : { all: ids(q.get('with_genres'), ',') }) : null;
  const without = ids(q.get('without_genres'), /[,|]/);
  let list = list0.filter((x) => {
    const g = genreIds(x);
    if (withG?.all && !withG.all.every((id) => g.includes(id))) return false;
    if (withG?.any && !withG.any.some((id) => g.includes(id))) return false;
    if (without.some((id) => g.includes(id))) return false;
    if (q.get('with_keywords') === '210024' && !x.anime) return false;
    if (q.get('with_original_language') && x.lang !== q.get('with_original_language')) return false;
    if (+q.get('vote_count.gte') && x.votes < +q.get('vote_count.gte')) return false;
    if (+q.get('vote_average.gte') && x.rating < +q.get('vote_average.gte')) return false;
    const since = q.get('primary_release_date.gte') || q.get('first_air_date.gte');
    if (since && date(x) < since) return false;
    const until = q.get('primary_release_date.lte') || q.get('first_air_date.lte');
    if (until && date(x) > until) return false;
    if (+q.get('vote_count.lte') && x.votes > +q.get('vote_count.lte')) return false;
    if (+q.get('with_runtime.gte') && x.runtime < +q.get('with_runtime.gte')) return false;
    if (+q.get('with_runtime.lte') && x.runtime > +q.get('with_runtime.lte')) return false;
    if (q.get('with_watch_providers') && !providers(x).includes(+q.get('with_watch_providers'))) return false;
    return true;
  });
  const sort = q.get('sort_by') || 'popularity.desc';
  list.sort(sort.startsWith('vote_average') ? (a, b) => b.rating - a.rating : (a, b) => b.pop - a.pop);
  const page = Math.max(1, +q.get('page') || 1), pages = Math.max(1, Math.ceil(list.length / 20));
  return { page, results: list.slice((page - 1) * 20, page * 20).map(result), total_results: list.length, total_pages: pages };
}
function details(x) {
  const out = { ...result(x), imdb_id: x.type === 'movie' ? x.imdb : undefined, runtime: x.type === 'movie' ? x.runtime : undefined, episode_run_time: x.type === 'series' ? [x.runtime] : undefined, original_language: x.lang,
    genres: genreIds(x).map((id) => ({ id })), production_countries: [{ name: x.country }], origin_country: [], external_ids: { imdb_id: x.imdb },
    keywords: x.type === 'series' ? { results: x.anime ? [{ id: 210024, name: 'anime' }] : [] } : { keywords: x.anime ? [{ id: 210024, name: 'anime' }] : [] },
    images: { logos: has(`${x.slug}-logo.png`) ? [{ file_path: `/${x.slug}-logo.png`, iso_639_1: 'en' }] : [] } };
  return out;
}
// ---------- the fake Cinemeta's side: these titles as Cinemeta metas (genres, country, moviedb_id, episodes) ----------
// Episodes: two seasons of 8 out long ago, and for the ones the tests follow, a season out this month (Slow Horses S6
// has 3 new episodes on Wed 28 Oct 2026)
const SEASONS = { slowhorses: [6, '2026-09-23', 6], sunny: [18, '2026-09-30', 10], severance: [2, '2025-01-17', 10], studio: [1, '2025-03-26', 10], breakingbad: [5, '2012-07-15', 16], lastofus: [2, '2025-04-13', 7], andor: [2, '2025-04-22', 12] };
function videos(x) {
  const out = [];
  const [last, from, n] = SEASONS[x.slug] || [2, `${x.year + 1}-01-10`, 8];
  for (let s = 1; s <= last; s++) {
    const eps = s === last ? n : 8;
    for (let e = 1; e <= eps; e++) {
      const base = s === last ? Date.parse(from) : Date.parse(`${x.year + s - 1}-02-01`);
      out.push({ id: `${x.imdb}:${s}:${e}`, season: s, episode: e, name: s === last && x.slug === 'severance' && e === 3 ? 'Who Is Alive?' : `Episode ${e}`, released: new Date(base + (e - 1) * 7 * 864e5).toISOString(), overview: `${x.name}, season ${s}, episode ${e}.` });
    }
  }
  return out;
}
function cinemetaMeta(id, host) {
  const x = byImdb.get(String(id).split(':')[0]);
  if (!x) return null;
  const img = (p) => (p ? `${host}/tmdb-img/original${p}` : '');
  return {
    id: x.imdb, imdb_id: x.imdb, type: x.type, name: x.name, year: String(x.year), releaseInfo: x.type === 'series' ? `${x.year}–` : String(x.year), runtime: `${x.runtime} min`,
    description: x.overview, genres: x.genres, genre: x.genres, country: x.country, imdbRating: x.rating.toFixed(1), moviedb_id: x.tmdb, director: [], cast: [],
    poster: poster(x) ? img(poster(x)) : '', background: backdrop(x) ? img(backdrop(x)) : '', logo: has(`${x.slug}-logo.png`) ? img(`/${x.slug}-logo.png`) : '',
    ...(x.type === 'series' ? { videos: videos(x) } : {}),
  };
}
const J = (res, obj, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }); res.end(JSON.stringify(obj)); };
const MEDIA = process.env.MEDIA_DIR || path.join(__dirname, 'media');
module.exports = function tmdb(req, res, u) {
  const p = u.pathname;
  if (p === '/_tmdb/hits') { J(res, hits); return true; }
  if (p === '/_tmdb/reset') { for (const k of Object.keys(hits)) delete hits[k]; J(res, { ok: true }); return true; }
  if (p.startsWith('/tmdb-img/')) {
    const f = path.basename(p);
    const file = has(f) ? path.join(ART, f) : path.join(MEDIA, 'img', fs.existsSync(path.join(MEDIA, 'img', f)) ? f : 'p0.jpg');
    if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return true; }
    res.writeHead(200, { 'Content-Type': f.endsWith('png') ? 'image/png' : 'image/jpeg', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=3600' });
    fs.createReadStream(file).pipe(res);
    return true;
  }
  if (!p.startsWith('/tmdb/3/')) return false;
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET' }); res.end(); return true; }
  const rest = p.slice('/tmdb/3'.length), q = u.searchParams;
  const key = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || q.get('api_key') || '';
  const pathKey = rest.replace(/\/\d+/g, '/:id');
  hits[pathKey] = (hits[pathKey] || 0) + 1;
  if (key !== TOKEN && key !== V3) { J(res, { success: false, status_code: 7, status_message: 'Invalid API key: You must be granted a valid key.' }, 401); return true; }
  let m;
  if (rest === '/authentication') { J(res, { success: true, status_code: 1, status_message: 'Success.' }); return true; }
  if ((m = /^\/discover\/(movie|tv)$/.exec(rest))) { J(res, discover(m[1], q)); return true; }
  if ((m = /^\/trending\/(all|movie|tv)\/week$/.exec(rest))) {
    const list = TITLES.filter((x) => (m[1] === 'all' || x.type === (m[1] === 'tv' ? 'series' : 'movie')) && x.year >= 2024).sort((a, b) => b.pop - a.pop);
    const page = Math.max(1, +q.get('page') || 1);
    J(res, { page, results: list.slice((page - 1) * 20, page * 20).map((x) => ({ ...result(x), media_type: x.type === 'series' ? 'tv' : 'movie' })), total_results: list.length, total_pages: Math.ceil(list.length / 20) });
    return true;
  }
  if ((m = /^\/(movie|tv)\/(\d+)\/recommendations$/.exec(rest))) { const x = byTmdb.get(`${m[1] === 'tv' ? 'series' : 'movie'}:${m[2]}`); J(res, { page: 1, results: x ? recommendations(x).map(result) : [], total_results: 0, total_pages: 1 }); return true; }
  if ((m = /^\/(movie|tv)\/(\d+)$/.exec(rest))) { const x = byTmdb.get(`${m[1] === 'tv' ? 'series' : 'movie'}:${m[2]}`); if (!x) { J(res, { success: false, status_code: 34 }, 404); return true; } J(res, details(x)); return true; }
  if ((m = /^\/find\/(tt\d+)$/.exec(rest))) { const x = byImdb.get(m[1]); J(res, { movie_results: x?.type === 'movie' ? [result(x)] : [], tv_results: x?.type === 'series' ? [result(x)] : [] }); return true; }
  J(res, { success: false, status_code: 34, status_message: 'The resource you requested could not be found.' }, 404);
  return true;
};
module.exports.TITLES = TITLES;
module.exports.cinemetaMeta = cinemetaMeta;
module.exports.TOKEN = TOKEN;
module.exports.bySlug = (s) => TITLES.find((x) => x.slug === s);
