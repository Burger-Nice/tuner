# airglow TV: Home, final design (A Marquee, refined, with browsing rows)

The design a builder can build from. It replaces `home-v2/SPEC.md` section 2 to 8 for Home and keeps that spec's
correctness rules (the shield's seen model, "only data the app has", the one timeline, the owner's answers in its
section 14) unless a line below changes them. It also sets the Movies and Series tabs' library on the add-ons.

| File | What |
|---|---|
| `SPEC.md` | this: Decisions, Research, screens, layout, the remote, the row engine, the add-on library, game night, states, performance, other screens |
| `01-evening.html` … `10-rows-nba.html` | the mocks at 960 × 540, real art (Cinemeta / metahub / ESPN, in `art/`), real titles, episodes, runtimes and ratings as of 28 Oct 2026 |
| `png/*.png`, `png/contact-sheet.png` | the renders at 1920 × 1080 and the sheet of all of them |
| `home-final.css` | the new classes (`hf-*`, `.e`, `.row`, `.column`, `.strip`, `.index` …), written to be appended to `app/tv/app.css` |
| `tools/build.js`, `tools/render.js`, `tools/pages.json` | builds the pages from one timeline; renders them (Playwright) |
| `CHANGES.md` | what changed between the reviewed versions (the history; this file describes the current design only) |

The timeline: the owner's TV, Reykjavik (UTC), shield `My team`, languages Icelandic then English, add-ons Cinemeta
plus a debrid add-on called `Northlight` (a stand-in name), live TV from the provider. Wed 28 Oct 2026 20:41 is the
normal evening; the Grizzlies play at Portland on Thu 29 Oct at 02:00, and `04-game-night` is Thu 03:12 (one
timeline: the game the evening mocks announce is the game the game-night mock shows).

---

## 0. Decisions (each with its reason, in plain words)

1. **Home has two halves and one key joins them.** The top is the Marquee: three big lines down the left (what
   you are in the middle of, what is new in your shows, one pick for tonight; a fourth, the game, on a game day) and one full-screen picture that answers the line you are on. The first browsing row peeks at
   the bottom of that screen, and Down past the last line (or **P−** from anywhere) is the browsing half: rows
   like Netflix (Popular, New, Top rated, genres) and rows built from what he watches (`Comedy for you`, `Anime
   comedy`, `Crime dramas`, `Because you watched Always Sunny`). *Why:* the owner asked for both: "the continue
   watching of course and the game thing" and "genres and popular and all that". The review scored the Marquee
   highest for ease and clarity; the rows are where "finding something to watch" happens.
2. **In the rows the picture still answers the focus, but gently.** The top 44 % of the screen shows the focused
   title's backdrop (darker than on the Marquee), its logo, one line of facts and one line of plot; one full row
   sits under it, the next row's title peeks. *Why:* this is Google's tested "immersive list" pattern (a row with a
   large preview of the focused item) and the Apple TV app's, and it keeps the Marquee's identity down the page.
   The picture swaps only after the focus rests 600 ms and its brightness is normalised to the art (section 3),
   so walking a row does not flash the room (review fix 6; the outside opinion's "light show").
3. **A row index at the right tells him where he is and what is below.** Six row names on their own backing, the
   current one marked, `N more`. *Why:* Netflix has no map of its rows and people complain that rows move; here the names are the map,
   and the order is stable for the day.
4. **Every row says why it exists** in a subtitle (`Because you watch Always Sunny, The Office and 12 more`, `Two
   things you watch, together`, `Popular now`, `A kind you rarely watch, rated 7.5 and up`). *Why:* the
   research on explanations (section 1) finds that short "because you watched" reasons plus a simple way to mute a
   theme restore trust; the mute is `Hold OK · Not interested` and `Hide this row`.
5. **Personal rows are calibrated to his history**, not just "most likely to click". If 55 % of what he watches is
   comedy, 25 % anime and 20 % crime, the personal rows come in that proportion, one row deliberately outside it.
   *Why:* calibration (Steck, Netflix 2018, and the 2025 survey) is the published answer to "I watch comedy and
   anime, show me both", and it is what keeps a monothematic week from eating the page.
6. **Blends are real rows with plain names.** Two of his genres that he watches *together* (titles carrying both)
   make a row: `Anime comedy`, `Crime dramas`, `Sci-fi thrillers`, `Horror comedies`. *Why:* the owner's example
   ("maybe anime and comedy"); TMDB serves it (`/discover` with both genres, section 6a); it is the most "mine" a row can feel.
7. **Anime is TMDB keyword 210024 in Japanese.** Cinemeta has no anime genre and Animation alone catches Pixar; a title is anime when TMDB tags it `anime` and its original language is `ja` (Spy x Family, One Punch Man, Mob Psycho 100, KonoSuba, Kaguya-sama come out of the blend; Moana, Up, Frozen, Toy Story and Soul do not). Without a key: Animation with Japan as the first country plus a deny list. An anime add-on's own catalog, when he has one, feeds the same row and is named after the add-on.
8. **Films and series come from the add-ons and TMDB; the provider is live TV.** The personal rows, Top rated,
   anime and Á íslensku read TMDB's API with the owner's own free key (section 6a); Popular, New, Search, metas,
   episodes and ids read Cinemeta; copies come from the stream add-ons. The
   provider feeds channels, the guide, the game and its replays. *Why:* the owner's decision; Cinemeta's catalogs
   are deep (Popular films answer at skip 10,000) and carry genres, ratings, runtimes, countries and art for every
   title.
9. **The library is one long scroll per shelf.** Movies and Series: Popular, New, Top rated, 19 (22) genres, the
   other add-ons' catalogs, Popular and New are Cinemeta catalogs (paged 50 at a time), Top rated, genres, anime and Á íslensku are TMDB lists (paged 20), the scroll bubble saying `#313 of 3,000+`. *Why:* it is what Cinemeta is shaped like, and the owner wants "browse everything" places; the
   existing Movies grid (6 posters a row, Sort / Filters / Jump) stays as it is, fed by the add-ons.
10. **A hidden game shows `ON NOW` and `Score hidden`, nothing more**: no quarter, no clock, both records stamped
    `as of tip-off`, the fan line too. *Why:* the review and the catch-up spec (S4): a clock tells him how the game
    is going when he might start it from tip-off.
11. **Game night stays the Marquee's event**: the whole picture becomes the two teams, the game is the first line,
    `Watch live` is one press, the rest of the evening waits under it. *Why:* it was the best-scored game night of
    the round; the mode changes the picture and the first line, never the keys.
12. **The review fixes are in**: every ring of every card kind inside the safe area (x ≥ 48: the lineup card at x 56, the rows and the peeks at x 60, the library grid at x 58 with 20 px gutters), the score group inside
    x 912, Right drawn as an arrow (never ▶), nothing printed on poster art (the end time is in the plate or the
    column), a designed no-picture area (the channel's logo on a flat field; a title without a backdrop shows its
    poster upright on a flat ground), the 600 ms rest and the normalised brightness cap, and a lineup of fixed 42 px slots whose lit line opens as its card in place (the lines under it slide the same 158 px in 200 ms; the lines above never move). From F: the hero logo (56 px of ink). From D: the
    count chip (`3 new`) and the glow (the art's colour behind the lit line and its plate, from the 32 px copy, no
    blur).
13. **OK means one thing per surface and the line says which.** On the Marquee OK plays (`Resume`, `Play`, `Watch
    live`, `Tune`) and the verb sits in a pink pill inside the focused block; in the rows OK opens `Details` (he has
    not seen the title: the owner's rule for picks); Hold OK is always the menu. *Why:* the review asked that the
    split be stated every time; the pill and the hint line do.
14. **Nothing moves by itself.** No carousel, no autoplay, no reordering while Home is on screen; rows change
    between visits and a changed row says so (`New row` for 7 days). *Why:* the earlier principle (UI-SPEC 1.4) and
    the research on choice stability.
15. **Channels last; Á íslensku its own row; the greeting in English; late mode on; `A film for tonight` and the
    doors kept** (home-v2's answered decisions). The doors live in the rows as `Browse your library` (row 13).

---

## 1. Research (what was looked at, what is proven, which decision it backs)

Sources read for this round (October 2026), with what they establish and the decision each one backs. Where a
page could not be opened from this session, the finding is from its published summaries and is marked (S).

**Row-based personalised homepages**
- Netflix, *Learning a Personalized Homepage* (Alvino, Basilico, 2015; mirror read via summaries, S):
  the page is a two-dimensional layout of thematic rows; row candidates are generated, each ranked inside, then a
  **row selection** step assembles the page under **device constraints (row count, min/max row length, what is
  visible)**; the hard problem is **diversity across rows** and **continuation versus discovery**; rows are
  chosen greedily for usefulness while staying dissimilar from rows already placed. → Decisions 1, 5; the engine
  (section 6: candidates, greedy selection with a 30 % overlap cap, a title in one row only, the row cap).
  [Netflix Tech Blog mirror](https://gwern.net/doc/www/netflixtechblog.com/2f5717e8bbdc98d2caf5c7a972359fbb7e7c0b28.html),
  [Basilico's slides](https://www.slideshare.net/slideshow/learning-a-personalized-homepage/33397216).
- Netflix, *Artwork Personalization* (Chandrashekar et al., 2017, RecSys 2018 abstract; S): per-member artwork
  chosen by contextual bandits lifts engagement; **artwork that changes between sessions confuses people** is a
  named open problem. → The app shows one artwork per title (Cinemeta's poster, background and logo), never a
  rotating one; the logo is the title's own. [RecSys '18 abstract](https://www.aminer.org/pub/5bbacb6117c44aecc4ead40a/artwork-personalization-at-netflix),
  [Reforge summary](https://www.reforge.com/blog/brief-netflix-artwork-personalization-through-multi-armed-bandit-testing).
- Netflix, *GenPage* (2026 coverage): the newest work folds row choice and layout into one model; the goal is still
  "a page of rows a member can read". → Not copied (no model here), but it confirms rows plus layout as the unit.
  [InfoQ](https://infoq.com/news/2026/07/netflix-llm-homepage-generation).
- Netflix's 2025 TV redesign (May 2025): navigation moved to a **top bar** (Search, Home, Shows, Movies, Games, My
  Netflix); **"fewer choices with more detail per title"**; **callouts** on previewed titles explaining what makes
  them distinctive; rows that update as you watch; My Netflix gathers My List and Continue Watching. → Our top bar
  stays; the Marquee is "fewer choices, more detail"; the row subtitles and the `New row` tag are our callouts.
  [Netflix Tudum](https://www.netflix.com/tudum/articles/netflix-new-tv-layout), [Netflix help](https://help.netflix.com/node/321880164349028),
  [Tom's Guide](https://www.tomsguide.com/entertainment/netflix/netflix-is-making-a-massive-change-to-its-homepage-for-the-first-time-in-years).
- Netflix's row rules as published (Continue Watching first, then Top Picks, then Popular, then personalised genre
  rows; placement set by business rules) and the user complaint that **Continue Watching moves around**. → Our
  Continue watching is pinned (the Marquee's first line, and the `Your shows` row), and the row order holds for the day.
  [Forasoft summary](https://www.forasoft.com/learn/ott/articles-ott/personalized-merchandising-rows-artwork),
  [Stylist](https://www.stylist.co.uk/life/netflix-continue-watching-row-remove-movie-tv-show-title-homepage-hacks/401800).
- Calibrated recommendations (Steck, Netflix, RecSys 2018; survey by Corrêa da Silva and Jannach, 2025, S): a
  recommendation list should **mirror the distribution of the user's past genres** (70 % comedy, 30 % anime gives
  roughly that mix), and pure calibration **reduces diversity for a monothematic user**, so a small deliberate
  departure is needed. → Decision 5 and the `Something different` row. [arXiv 2507.02643](https://arxiv.org/abs/2507.02643v1).
- Explanations: a 2025 study of movie explanations (129 participants; S) found short, positive, **feature-based**
  reasons rated highest (it tested features of popular films, not history-based "because you watched" reasons, so
  it supports short positive reasons rather than our exact wording); a qualitative study finds brief justifications
  **plus simple controls to mute a theme** restore acceptance, and that trust drops when a home looks
  promotion-driven. → Decision 4; every row
  names its reason; `Not interested` and `Hide this row` are one Hold OK away; no promotional rows.
  [arXiv 2505.03376](https://arxiv.org/abs/2505.03376), [thesis summary](https://ebiblioteka.efsa.unsa.ba/xmlui/handle/EFSA/1044).
- The value of recommendations at Netflix (Aridor et al., 2025 working paper; S): the recommender also scored best on
  the **diversity** of what members watch. → Diversity is a goal of the engine, not a side effect.
  [Kellogg Insight](https://insight.kellogg.northwestern.edu/article/what-lures-netflix-viewers).

**Catalog sources (the catalog research of 28 Oct 2026)**
- TMDB API v3 (official references read: discover movie / tv, movie recommendations, append_to_response,
  authentication, rate limiting, FAQ, API terms): `/discover` filters by genre (AND / OR), keyword, original
  language, vote average with a votes floor, dates and runtime; `/recommendations` per title; free for
  non-commercial use with attribution; no caching beyond 6 months; no ML use; about 40 requests a second. The
  research confirmed on TMDB's own site that the vote-floored Top rated order is sensible, that keyword 210024 is
  `anime` (2,395 films, 2,435 series; none of Moana, Up, Frozen, Toy Story, Soul), that `original_language=is`
  gives 1,451 films and 107 series (verified with the owner's key; the row holds the ones over its 10-vote floor), that Icelandic translations are thin, and that TMDB's Comedy
  filter still holds Parasite and Pulp Fiction (hence the exclusion heuristic). → Section 6a and the rows that read
  TMDB. [Discover movie](https://developer.themoviedb.org/reference/discover-movie), [Discover TV](https://developer.themoviedb.org/reference/discover-tv),
  [Recommendations](https://developer.themoviedb.org/reference/movie-recommendations), [FAQ](https://developer.themoviedb.org/docs/faq),
  [API terms](https://www.themoviedb.org/api-terms-of-use), [Rate limiting](https://developer.themoviedb.org/docs/rate-limiting),
  [The anime keyword](https://www.themoviedb.org/keyword/210024-anime/movie).
- The add-on alternatives were checked and set aside for Home: the TMDB add-on (no Icelandic, no top rated, no
  anime, no blends; `tmdb:` ids), AIOMetadata (catalogs only after a per-user web configuration on a third-party
  host), MDBList and Trakt (keys or accounts; curated lists, not his taste; Trakt would have to be kept in sync),
  Anime Kitsu (Cloudflare-blocked from the session; `kitsu:` ids), AniList (keyless, good anime scores, no IMDb
  mapping for most titles). Streaming Catalogs is an optional `On Netflix now` row. Cinemeta stays the backbone
  for ids, metas (they carry `moviedb_id`), episodes and search.
  [TMDB add-on](https://raw.githubusercontent.com/mrcanelas/tmdb-addon/main/README.md), [AIOMetadata](https://raw.githubusercontent.com/cedya77/aiometadata/master/README.md),
  [AniList](https://graphql.anilist.co), [Streaming Catalogs](https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/manifest.json).

**10-foot UI guidelines**
- Android TV design guidelines (Google, read directly): design at **960 × 540 dp**; keep important elements inside
  **5 % margins (48 dp sides, 27 dp top and bottom)**; let backgrounds bleed; a 12-column grid with **card widths
  196 dp (4 across) and 124 dp (5 across)**; **20 dp between cards and a peeking card at the edge** to say there is
  more; leave room for the focused state's growth; **"design each remote direction with a clear purpose"**; the
  **immersive list**: a row whose focused item is shown large in the background, the focused card scaled **1.1**,
  background images **16:9 with the subject placed top right**, never cropped behind the text; the **featured
  carousel** needs a scrim and no text in the picture; cards need a scrim for text. → Our canvas and safe area;
  124 px posters six across with a seventh peeking; the rows' picture area (immersive list); `object-position` per
  title so the subject sits in the right half; scrims under all text.
  [Layouts](https://developer.android.com/design/ui/tv/guides/styles/layouts), [Cards](https://developer.android.com/design/ui/tv/guides/components/cards),
  [Immersive list](https://developer.android.com/design/ui/tv/guides/components/immersive-list), [Featured carousel](https://developer.android.com/design/ui/tv/guides/components/featured-carousel),
  [Design for TV](https://developer.android.com/design/ui/tv/guides/foundations/design-for-tv).
- Android TV app quality (Google, read directly): **TV-OV** no text cut by the edges; **TV-DP** everything reachable
  with the five-way D-pad; **TV-DB** Back leads back; **TV-DM** no dependence on a Menu button. → The safe-area
  rule, the Back model in section 4, no Menu key anywhere.
  [TV app quality](https://developer.android.com/docs/quality-guidelines/tv-app-quality).
- Apple tvOS HIG, Focus and selection, Lockups (S): rely on one clear focus effect; **the person controls focus,
  never move it for them** except when the focused item disappears; focused lockups grow, so leave space between
  them. → One ring, no auto-moving focus, the 24 px gutter and the lift room above each row.
  [Focus and selection](https://developer-rno.apple.com/design/human-interface-guidelines/inputs/focus-and-selection),
  [Lockups](https://developer.apple.com/design/human-interface-guidelines/lockups.md).
- Apple TV app (tvOS 18.1): `Up Next` became **`Continue Watching`** and a separate **Watchlist** was added; Home puts
  Continue Watching at the top, then curated rows. → Our naming (`Continue watching`, `Saved`) and order.
  [Apple support](https://support.apple.com/en-za/guide/tv/atvb457e13ae/tvos), [9to5Mac](https://9to5mac.com/2024/09/24/apple-tv-app-adds-separate-watchlist-in-ios-18-1-beta/).
- Google TV home (2025): `For You` renamed **Home**, navigation in pill containers top-left, the Library moved under
  the profile; users missed the Library tab. → We keep Movies and Series as tabs; the library is never hidden
  behind a profile menu. [9to5Google](https://9to5google.com/2025/09/24/google-tv-homescreen-redesign-official-rolling-out-to-more-users/).
- Disney+ (October 2025): **badging tags** (`Season Finale`, `New Series`, `New Movie`), cinematic poster art, video
  in the hero carousel. → Tags as small chips (`3 new`, `New row`, `4K`); no video in the hero (decision 14).
  [9to5Mac](https://9to5mac.com/2025/10/02/disney-reveals-app-redesign-coming-soon-to-ios-and-tvos/), [Disney+](https://www.disneyplus.com/explore/articles/disney-plus-app-redesign-new-features).
- Plex (2025 redesign): home rows are **customisable and reorderable**, Continue Watching always present; the TV
  top-navigation change drew complaints and was partly rolled back. → Account > Home rows keeps every row
  switchable and movable; the top bar is unchanged from the app the owner already uses.
  [Plex](https://www.plex.tv/?p=10177), [AFTVnews](https://www.aftvnews.com/plex-is-rolling-back-some-of-the-changes-brought-on-by-its-recent-redesign/).
- Prime Video (2022 redesign, still current): a proper Continue Watching row, a Top 10 carousel, a "super carousel"
  for featured titles. → Rows named by what they are; no promoted carousel. [TVLine](https://tvline.com/2022/07/18/amazon-prime-video-new-design-user-interface-revamped).
- Smashing Magazine, *Designing for TV* (2025, two parts; S): viewing distance, text size, rows versus grids, one
  focus. → Consistent with the sizes below. [Part 2](https://smashingmagazine.com/2025/09/designing-tv-principles-patterns-practical-guidance/).

**TV web performance**
- Samsung Smart TV, *Web app memory optimization* (S): **images are the largest memory consumer**, then the **number
  of DOM nodes**; load images only as they near the viewport; long carousels with hundreds of cards are the risk.
  → Section 9: rows mounted with eight cards, `src` only within one row of the focus, rows beyond kept as text.
  [Samsung](https://developer.samsung.com/smarttv/develop/guides/web-app-memory-optimization-guide.html).
- web.dev, browser-level lazy loading: Chromium's `loading="lazy"` fetches images **1,250 px (fast) / 2,500 px (slow)**
  ahead and the thresholds cannot be tuned; it skips images hidden in carousels. → We do not rely on
  `loading="lazy"` (it would fetch most of a 16-row page); the app's own by-row rule (home-v2 9.2) stays.
  [web.dev](https://web.dev/articles/lazy-loading-images).
- TitanOS and low-end TV guidance (S): an unoptimised app on a flagship loses to a lean one on a low chipset; heavy
  CSS effects cause input lag. → No filters, no blur, no box-shadow spreads, transforms and opacity only.
  [TitanOS](https://docs.titanos.tv/performance-optimization-strategies), [Oxagile](https://www.oxagile.com/article/samsung-tizen-tv-apps-for-all-tips-for-low-end-tvs/).

**The API checks.** Verified on 28 Oct 2026 against `v3-cinemeta.strem.io`: the manifest's catalogs and their extras
(`top`: genre, search, skip; `year`: genre = a year; `imdbRating`, named `Featured`), that `top/genre=Comedy` answers at
skip 3,000 and Popular films at skip 10,000, the `country` field on the metas used (the seven anime titles list Japan
first; Heartstone, Godland and Rams list Iceland), and every episode name, runtime and rating printed on the mocks.
Verified with the owner's TMDB key (the numbers in section 6a): the discover parameters, the anime keyword and its
negatives, 1,451 Icelandic films and 107 series, the recommendations. The independent review measured, in Cinemeta's
own catalogs, that the `imdbRating` catalog's first page is mostly 2026 and unrated, that 6 of the first 50
`top/genre=Comedy` titles are not comedies by their own genres, and that about 40 of the first 150 `top/genre=Animation`
films list Japan among their countries. Those findings are why Top rated, genre rows and anime read TMDB.

**Where this design departs on purpose**
- No hero carousel and no autoplay, though Netflix, Max and Disney+ have them: the owner's rule (nothing moves by
  itself) and the review's point that the screen must not change under his thumb.
- The first screen is a list of names with one picture, not rows of thumbnails: the reviewed strength of A
  (readable from the sofa), kept because the rows are one press away.
- Rows are named by their reason, never by a promotion (`Trending`, `Top 10` are fine when they say why:
  `Popular films · Popular now`).
- The row index is new: no streaming home shows a map of its rows. It costs one 14 px column and answers the most
  common complaint about Netflix's rows (that they move and hide).

---

## 2. Screens and states

| Mock | State |
|---|---|
| `01-evening` | Wed 20:41, a game day (tip-off 02:00). The Marquee: four big lines, Severance's line open as its card in place: `CONTINUE WATCHING`, the Severance logo (56 px of ink), `S2 · E3 · Who Is Alive? · 21 min left · Ends 21:02 · 4K`, the episode's line, the bar, `Resume` pill · `→ Episodes` · `Hold Start over, Details`; the other lines Slow Horses (`New episodes · S6 · E4 · 3 new`), Heat (`A film for tonight · ends 23:31 · 4K`), Grizzlies at Blazers (`Tonight · 02:00`); the first row `Comedy for you` peeking at the bottom with `P− Browse · 15 rows` |
| `02-rows-comedy` | Down from the lineup (or P−): the top bar, the picture answering Palm Springs (IMDb 7.4; its backdrop is a scene, never the poster's own art), the row index on its backing, row 1 `Comedy for you · Because you watch Always Sunny, The Office and 12 more` (films and series together), `Tonight in the NBA` peeking (the index's next name; the cards show art only) |
| `03-rows-blend` | the blend row `Anime comedy · New row · Two things you watch, together · anime + comedy`, Spy x Family lit; `Popular series` peeking (the index's next name) |
| `04-game-night` | Thu 03:12, Grizzlies at Trail Blazers live, shield on: the two fields, `ON NOW` on the chip, `Score hidden`, both records `as of tip-off`, the fan line `as of tip-off`, `Watch live` · `→ From tip-off` · `Hold Reveal, more`; four lines, the game's line open as its card (the Sharp plate), then Severance, Slow Horses and a short episode; `Tonight in the NBA` peeking with the hidden game's card reading `Score hidden`; the NBA tab carries no second pill |
| `05-library-comedy` | the Movies tab, Comedy, Popular, scrolled to #313 of 3,000+ (a solid band holds the context line, the focused title and its facts, and the scroll bubble; six posters a row, no caption over the next row) |
| `06-cold-start` | a new user, no history: `Project Hail Mary · Popular now · a pick for tonight` lit (`Details` the primary, no ▶), `Grizzlies at Blazers · Your team · 02:00`, `Pick what you like · 3 genres start your rows` (three lines); `Popular films` peeking |
| `07-rows-channels` | the `Channels` row: a channel has no picture, so the area shows the channel's logo on a flat field in the logo's colour; the column has `Kastljós · RÚV · 1 · 20:35 – 20:55 · 14 min left · HD` and `Next · Fréttir 20:55 …`; wide channel cards (a logo tile in the channel's colour, the number, the programme, `until 20:55` and its progress bar); under the last row `End of Home · P+ Back to the top`; `Tune` · `Hold Save channel, Open in the guide` |
| `08-loading-missing-art` | the row `Á íslensku · Icelandic films and series` (no total: the row holds the titles over its 10-vote floor): the lit title drawn as if it had no backdrop (its poster upright, 114 × 171, between the column and the index on a glow of its colour) and no logo (its name in Outfit), real Icelandic titles from TMDB's list (Trapped, Katla, Godland), two posters still loading (a sheen block with no name), a title with no poster among the visible six (`No poster` and the name on surface-1; the name is a stand-in for the state) |
| `09-rows-continue` | the `Your shows` row: wide cards with the show's logo, the episode and the time left (Breaking Bad, Severance, The Bear, Andor, Slow Horses `3 new`, The Last of Us); an episode he has not started shows the show's backdrop, never its own still; `New this year` peeking, one card height + 14 px under the row |
| `10-rows-nba` | `Tonight in the NBA` at 20:42: the hub's game cards, nothing started, the plates are tip-off times (the slate: Celtics at Knicks and Mavs at Rockets 23:00, Nuggets at Thunder 01:30, Grizzlies at Trail Blazers 02:00, two more at 03:30 and 04:00); `Popular films` peeking; the column has the next game's facts and the pre-game fan line |

Other states (no mock, the rules):
- **Loading, cold start with nothing cached:** home-v2 3.6 Welcome; the Marquee draws its lines as their data lands
  (the game first, it needs no history), the picture the first backdrop that arrives.
- **Loading with a cache:** Home as last drawn; a line or row is replaced only when its data changed.
- **Offline with a cache:** the Marquee from the cache with `Needs a connection to play` under the lit line; the
  rows from the cache; no LIVE pills, no clocks; the pill `Offline · showing what airglow remembers` top right.
- **No add-ons:** the lineup has no film from Cinemeta; the rows are `Tonight in the NBA` and
  `Channels`; the footer says `Add a Stremio add-on for films and series` and OK on it opens Account > Add-ons.
- **Empty row:** absent (never a placeholder). **Too few:** a row with fewer than 6 titles hides; a blend with fewer
  than 6 falls back to its larger genre row and says so in the subtitle (`Anime · not enough anime comedy yet`).
- **A row's data not in yet:** the row is absent until its first page lands; rows appear below the focus only.
- **Late (after 23:00):** `A film for tonight` becomes `Something short` (an unseen episode under 45 min from his
  shows); `Ends` past midnight reads `Ends 00:12`.
- **The morning after a hidden game:** the first line is `Last night · Grizzlies at Trail Blazers · Replay · Score
  hidden` until 18:00 (home-v2 3.1); then the ordinary lineup.

---

## 3. Layout (960 × 540, safe x 48–912, y 27–513)

**The Marquee (`01`, `04`, `06`, `07`)**

| Element | Geometry and type |
|---|---|
| Picture | one `<img>` 960 × 540, `object-fit: cover`, `object-position` per title (default 70 % 40 %; the subject in the right half); over it the normalised brightness cap (section 9), the left scrim (bg-0 to clear by x 770), the bottom scrim (220 px), the top scrim (120 px, for the bar), grain at 50 %; the glow `.hf-amb`: a flat radial of the art's colour at 55 % behind the lineup |
| Top bar | the app's, y 32–72: mark, Search, Home, Live, NBA, Movies, Series, Saved, the clock, the avatar. While the game is the lit line the NBA tab carries **no** pill |
| Lineup | x 56, y 92, 470 wide, a `[data-col]`; lines are **42 px slots** and the lit line is its **card, 192 px, opened in place** (+ 4 px margins), so the lines under the lit one sit 158 px lower than they would and every press moves them by that same distance with a 200 ms `translateY` (the lines are one layer each; nothing else lays out). **Three lines** (Continue, New in your shows, the pick for tonight), **four on a game day** (the game first when it is live or within 3 h of tip-off, else last). Unfocused lines **Outfit 700 30/34** chalk at 66 % + the facts in Inter 500 16 (`New episodes · S6 · E4`), padding 2/16; a line's name and facts stay inside the 470 px (a long name shortens first: `Trail Blazers` becomes `Blazers`, then the channel goes, then the reason); the count chip (`3 new`, surface-2, 12 px 650) after the facts. The lit line is replaced by its card (next row) |
| The lit line's card | **in the lit line's slot, 470 × 192**, radius 18, the ring (5 px white, 2 px canvas gap), the glow colour at 45 % to canvas at 22 %: eyebrow 14 px caps pink-text (`CONTINUE WATCHING`, `NEW EPISODES`, `A FILM FOR TONIGHT`, `GAME NIGHT`); the **logo, 56 px of ink, 340 wide at most** (Cinemeta `logo` cropped to its alpha box when fetched, chalk when black), else the name Outfit 700 34/40 (30 when longer than 18 characters); meta 15/20 text-2 with badges (section 12's shortening rule); the title's line 15/20 (one line, ellipsis at 434 px); the bar 280 × 4; the hint row at the plate's bottom: the **pill** (gradient, 30 high, ink, Outfit 700 15, the verb; a ▶ only on play verbs) · `→` key cap + word · `Hold` + words |
| The peek | y 462: the first row's title (Outfit 700 18 text-2) with its reason and, at the right (ending at x 912), `P− Browse · 15 rows`; the top of its cards at 85 % (art may bleed; a game card shows its status line only, never half a name) |
| Game night | the fields: away x 0 to the split, home from the split, the split at 12° at 83 % (x 797 at the top); each field the team's real primary darkened for 4.5:1 chalk (`#12173F` Memphis navy with the Beale Street blue edge; Portland `#B9302F` with its black edge); the left shade (canvas to clear by x 576) under the lineup; crests 150 in the neutral disc at x 586 and x 762, y 118, names Outfit 700 24 and the record 14 under; the score group at x 582, y 392: the chip (gradient, 56 high, 12°, `ON NOW` Barlow 800 italic 34) and the plate (`Score hidden` with the eye-off) ending before x 912; the lit line is the Sharp plate (12°) |
| No picture | the flat field (`.flat`, the logo's colour, else bg-1) with the channel's logo 120 px tall at x 560, y 120 (the facts live in the plate or the column, never repeated on the field); for a title without a backdrop: the poster upright, 114 × 171 at x 640, y 80, on a flat glow of its colour (`.glow`) |

**The rows (`02`, `03`, `08`)**

| Element | Geometry and type |
|---|---|
| Top bar | the app's own, unchanged. **Up from row 1 goes to the Marquee** (the line he left lit); the top bar is one Up further, from the Marquee's first line |
| Picture area | the full-bleed backdrop under the normalised cap (target .22), the left scrim, the index's backing (`.hf-sr`: canvas from 0 at x 576 to 88 % at x 960) and a 320 px bottom scrim to canvas at 97 %, so the posters sit on near-canvas and the picture is the top half |
| Column | x 60, y 92, 540 wide: the logo 48 px (else the name Outfit 700 30/36); meta 15/20 (`2016 · Action · Comedy · Crime · 1h 56m · Ends 22:38 · IMDb 7.4`; a series: `2022– · Animation · Action · Comedy · 24 min · IMDb 8.2 · Japan`; the add-on's name only when a copy is known); one line of plot (cut at a word, never mid-word: written to fit 500 px); the hint `OK Details · Hold Play now, Save, Not interested`. No eyebrow: the row's name is in the row title and the index |
| Row index | right-aligned at x 912, y 92, Inter 600 14 text-2 on the backing, pitch 22: six row names around the current one (two above, three below), the current chalk with a pink dot, then `N more` in text-3 |
| The focused row | at x 60: title Outfit 700 20 at y 244 with the subtitle Inter 500 14 text-3 after it and the `New row` tag when so; cards from y 290: posters **124 × 186, radius 12, 24 px gutters, six across and the seventh peeking at x 948**; wide cards 198 × 111 (`Your shows`: the still, the show's logo at 22 px, `S3 · E6 · 12 min left`, the bar; `Channels`: the logo, the number, the programme, `until 20:55`); game cards as the hub's (272 × 124, the team edge, the status, two crests, the channel, the plate: a tip time, a quarter, `Score hidden` or a final). The focused card lifts (8 px, scale 1.05; a wide card 6 px, 1.05; a game card 6 px, 1.04) with the ring, whose left edge lands at x 51.9 for a poster, 50.1 for a wide card and 49.6 for a game card, all inside x 48; a card that starts past x 912 (the peeking one) shows its art and no text; nothing is printed on poster art except the quality badge (top left, when a copy was checked) and the progress bar |
| The next row | **always the index's next name**: its title (Outfit 700 18 text-2) one card height + 14 px under the focused row's cards (y 490 under posters, 415 under wide cards, 428 under game cards, so no empty band) and the top of its cards, at 78 % (a game card shows no text). After the last row: `End of Home · P+ Back to the top` |
| Scrolling | Down moves the page by one row: the row that was next becomes the focused row (its title at y 244), the picture area and the column answer the new focus, the index shifts. Nothing scrolls smoothly: the page translates once per press (200 ms, transform) |

**The library (`05`)**: the Movies tab as UI-SPEC 5.5, scrolled. A **solid 132 px band** (canvas, an 8 px fade under it) holds,
at x 48: the context line (`Movies · Comedy · Popular`), the **focused title** (Outfit 700 24, one line) and its facts
(`2014 · 1h 39m`, 14 px), and at the right the scroll bubble (`#313 of 3,000+`, only while a key repeats). The grid is
6 × 124 with **20 px gutters at x 58** (844 wide, so the focused ring stays inside x 48–912: its left edge is x 49.9, the
right-hand column's 910), row pitch 210, the focused row's top at y 156. The other posters carry no caption (their art
carries the title; a poster without art shows its name on the tile); nothing is laid over a poster. (A change from
UI-SPEC 5.5's captions under every poster: one-line captions cut most titles, which reads as broken from the sofa.)

---

## 4. The remote (every surface)

**The Marquee.** Up / Down: the lineup, one line per press; the card closes on the line you leave and opens on the
line you reach (its contents swap at once, they are text and a flat colour; the lines under it slide 158 px in 200 ms), the picture after the focus rests 600 ms (a 200 ms opacity crossfade of two image
layers). Up from the first line: the top bar. **P−** (channel down): the rows, on row 1 at its remembered card, from
any line; **P+** from the rows: the Marquee with its first line lit. **OK**: the line's one
verb (the pill): Resume, Play, Watch live, Tune, Details (a pick), Open (the genre picker). **Right**: the line's
"more": Episodes (the series page's episode list), More popular films (the row), From tip-off, the guide at that
channel. Left: nothing (the lineup's edge stops). **Hold OK**: the card menu (Start over · Details · Mark watched ·
Remove from Home; a game: the sources sheet, `Reveal score` with its one-step confirm `Reveal Grizzlies at Trail
Blazers?` · Reveal · Keep hidden; a channel: Save channel · Open in the guide). **Down from the last line**: the rows, on row 1 (`Comedy for you` tonight, never a copy of a Marquee line) at its
remembered card; the peek shows what is coming. **Back**: the Home tab; a second Back exits (the tab rule).

**The rows.** Left / Right: along the row (both edges stop; Right past the last card reaches `See all`). Up / Down:
the previous / next row, each row remembering its card (`data-key`). Up from row 1: the Marquee, with the line he left lit (the first line after P−); this is the only rule for Up from row 1. **OK** on a poster: the title page (Details). OK on a wide card:
play (continue, a new episode), tune (a channel), the game page or `Watch live` as the hub's rule. OK on `See all`:
the Movies / Series tab with that shelf set. **Hold OK**: poster → `Play now` (the best copy, checked on the spot) ·
`Save` · `Details` · `Not interested` (out of every personal and discovery row for 30 days) · `Hide this row`
(the row leaves Home; Account > Home rows lists it under `Hidden`); continue card → home-v2's menu. **Back**: from a deeper row to **row 1** first (as Netflix and the Apple TV app do), from row 1 to the Marquee with
the first line lit (where OK resumes), a third Back to the tab.

**The library.** As UI-SPEC 5.5 (Left / Right / Up / Down in the grid, OK Details, Hold OK Save · Mark watched ·
Details, CH± pages, Back scrolls to the top then leaves). Digits on Home tune a channel number as in Live.

Press counts: resume 1; the game live 1 (from tip-off 2); the pick for tonight 3 (Down, Down, OK); **the first
browsing row 3 on a normal night, 4 on a game day, or 1 with P−**; `Comedy for you`'s first poster the same, its
title page +1; a channel: its number (1–3 digits) or the Live tab in 4; any named row: P− then its position in the
index.

From the top of Home to the first browsing row, counted from the first line lit: **3 Downs (4 on a game day) past the lines, or 1 with P−**.

---

## 5. Elements, piece by piece

- **The pill** (`.pill`): gradient, ink text, Outfit 700 15, 30 high, a ▶ glyph for play verbs only (`Details`,
  `Open`, `Game page` carry none); it is not a second focus (the ring is on the line); it tells him what OK does
  from three metres. One per screen.
- **Hints that go away**: each hint (`→ Episodes`, `Hold Start over, Details`, `OK Details`) is shown until he has
  used that key on that kind of line five times, then it fades; the pill stays, and Hold OK always opens the menu.
  Account > Home rows has `Show the hints again`.
- **Key caps** (`.k`): 20 high, border-strong, the arrow glyphs drawn as SVG arrows (→ ↓ ↑), `OK` and `Hold` as
  words. Never ▶ for a direction.
- **Count chip** (`.count`): surface-2, 12 px 650, after the facts: `3 new`, `2 live`, `4 unseen`. `3 new` means OK plays the first unseen episode (E4).
- **Badges** (`.badge`): 4K, HDR, HD, IS (Icelandic sound); 11 px caps, five characters or fewer; only when a copy
  was checked (copies are known only after asking the stream add-ons for a title: the pick of the night and
  anything in Continue watching or Saved are checked in the background; a row's posters carry no badge until then).
- **Row title and subtitle**: Outfit 700 20 and Inter 500 14 text-3 on one line; the subtitle is the reason and is
  never omitted; `New row` is a pink-soft tag for 7 days after a row first appears.
- **The row index**: Inter 600 14, six names, the current with a pink dot; the names are the rows' titles, so what
  he reads at the right is what he will read at the left after a Down.
- **Posters**: 124 × 186, radius 12, a 1 px border, the art fills; focus = ring + lift 8 + scale 1.05; no caption in
  the rows (the column above is the caption), captions in the library grid (title 15, meta 14).
- **Wide cards**: 198 × 111, radius 16, the art under a bottom scrim, the show's logo at 22 px and one line at 14 (`S3 · E6 · 12 min left`), the progress bar flush at the bottom; **an episode he has not started shows the show's backdrop, never its own still** (a still can show a later scene); a channel card: a logo tile in the channel's colour, the number, the programme, `until 20:55` and its progress bar; a game card as the hub's.
- **Dots**: two levels on purpose: a wide gap between facts (`2016  ·  1h 56m`) and a tight one inside a fact (`Action·Comedy`, `S2·E3`); dots in text-3.
- **Type**: Outfit 700 for names and row titles, Inter for facts (tabular numbers), Barlow Condensed 800 italic
  only on the game chip. Nothing under 14 px except badges and the count chip.
- **Colour**: the brand's tokens; pink-text for eyebrows; the gradient only on the pill, the progress bar, the chip
  and the avatar; red only as LIVE; team colours only on the fields (data, never UI).
- **Motion**: the picture crossfade (200 ms, opacity) after a 600 ms rest; the lit line's extra lines fade in (120
  ms); the page translate between rows (200 ms); the lift (200 ms); game night's entry as home-v2 3.9. Reduced
  motion: 120 ms fades.

---

## 6. The personal-row engine

**Signals** (all local, in IndexedDB, nothing leaves the TV):
- **The play log** (new, `plays` store): append-only, one record per playback session longer than 3 minutes:
  `{ imdb, type, season, episode, from, to, completion, at, source }`; a session that resumes within 30 minutes
  extends the last record. Today's `progress` store (one entry per item, overwritten, capped at 400) stays as it is
  for Continue watching; at first start of this version a one-time migration writes one `plays` record per
  `progress` entry whose title matches an IMDb id through `imdb.js` (provider-era items that do not match are left
  out). So the owner's first weeks are a cold start plus whatever migrated; the personal rows appear after 3
  finished titles as below.
- Finishes (≥ 90 %); Continue watching; Saved; `Not interested` (30 days); `Hide this row`; the Marquee's chosen
  lines (what he picked over what).
- Each title's Cinemeta meta: `genres` (up to 3), `country`, `year`, `runtime`, `imdbRating`, `cast`, `director`,
  `type`; fetched once per title in history (the app already fetches metas for the title page), cached 30 days.

**The taste profile** (recomputed at 04:00 and after every finish, in a worker, under 50 ms for 500 plays):
- Weight of a play: `w = completion × recency`, recency = 0.5^(days / 30) (a half-life of 30 days). A series counts
  per episode but at most 3 episodes per series per week, so a binge is one strong vote, not thirty.
- Genre shares: a title's weight is **split across its genres** (`w / n` for each of its n genres, as calibration
  does), so the shares add up to 100 %: `G[g] = Σ (w / n) over titles carrying g ÷ Σ w`, per type and combined.
  **Anime is its own genre**: an anime title's Animation weight, and its Action weight when it carries Action, go to
  `Anime` instead, so `Action for you` cannot ride along on his anime. A title in his history is anime when its
  TMDB keywords include 210024 and its original language is `ja` (one `/{type}/{id}?append_to_response=keywords`
  per history title, cached 30 days); without a key, Animation with Japan as the first country and a deny list.
  Country shares the same way; Icelandic = `original_language` `is` (or `country` Iceland first on the fallback).
- Pair counts `P[a,b]` = Σ w over titles carrying both a and b; a pair is a **blend candidate** when `P[a,b]` ≥ the
  weight of 3 full plays and both shares ≥ 8 %.
- Seeds: the last three finished titles (for `Because you watched`), the last finished film and series separately.

### 6a. The sources (TMDB for the rows, Cinemeta for ids, meta and search)

- **TMDB API v3**, called by the app with the owner's own free key (the "API Read Access Token", sent as
  `Authorization: Bearer`). The key is typed once through the existing phone page (Account > Provider > `TMDB
  key`), kept in the app's settings store, **never in the repo** (the repo is public). Free for non-commercial use;
  airglow has no ads or payments. CORS is open from the WebView. Rate: about 40 requests a second upper bound; a
  Home build is 12 to 20 calls; a 429 backs off and uses the cache.
- **Two rules every TMDB row follows** (from the verified runs): a **votes floor** (`vote_count.gte` 300 films /
  150 series for rated rows, 100 for genre rows, 50 for anime series, 10 for Icelandic) and, for a grown-up genre
  row, the **family exclusion** `without_genres` adds Animation (16) and Family (10751) unless his profile's share
  of Animation + Family is 5 % or more (anime is its own genre and never excluded by this); anime series rows sort by
  `vote_average.desc` under their floor, not by popularity, so Doraemon and Sazae-san do not lead them.
- **What TMDB gives each row**: `/discover/{movie,tv}` with `with_genres` (comma = AND), `without_genres`,
  `with_keywords=210024` (anime), `with_original_language` (`ja`, `is`), `sort_by=vote_average.desc` with
  `vote_count.gte`, `primary_release_date` / `first_air_date` ranges; `/movie/{id}/recommendations` and
  `/tv/{id}/recommendations` for `Because you watched`; posters and backdrops from `image.tmdb.org/t/p/w342` and
  `/w1280` (no key needed); `language=is-IS` for Icelandic titles and overviews with English as the fallback.
- **Ids**: discover results carry TMDB ids, no IMDb id. A row draws from TMDB's own art and names; when a title is
  opened (or becomes the focused title in the rows) the app calls `/{type}/{id}?append_to_response=external_ids`
  for its `imdb_id`, then continues through Cinemeta meta and the stream add-ons as today. A title first met in
  Cinemeta maps the other way without a call: Cinemeta metas carry `moviedb_id`.
- **Cinemeta stays** for `Popular films` / `Popular series` (`top`), `New this year` (`year`), Search, episode
  lists, logos by IMDb id and the Marquee's titles. The `imdbRating` catalog is never read.
- **Caching, within TMDB's terms** (nothing cached longer than 6 months): discover pages 12 hours, recommendations
  24 hours, title details 30 days, images in the WebView's HTTP cache. `Because you watched` is a counting rule
  (how often a candidate appears in the recommendations of his last 5–10 titles), not a model: TMDB's terms forbid
  using its data for ML/AI applications, and this is not one.
- **Attribution**: Account > About shows the TMDB logo (less prominent than airglow's) and "This product uses the
  TMDB API but is not endorsed or certified by TMDB."
- **No key yet** (the first run, or a revoked key): the rows that need TMDB fall back to Cinemeta and are **named
  honestly**: `Popular comedies` (Cinemeta `top/genre=Comedy`, re-filtered by the title's own genres) instead of
  `Comedy for you`'s TMDB list, `Top rated` and `Top rated <genre>` hide (they are TMDB's lists only),
  `Anime` from Animation with Japan first plus the deny list, `Á íslensku` from the build-time Icelandic list,
  `Because you watched` from the Cinemeta scoring below; the blends and `Something different` hide. The Marquee
  shows a one-time line `Add your TMDB key for better rows · Account > Provider` on the first evening without one.

**Row candidates**, each with a source, a name rule and a reason line:

| Kind | Source (Cinemeta unless said) | Name | Reason line |
|---|---|---|---|
| Continue watching | the app's progress store | `Continue watching` | – |
| New in your shows | followed series' new episodes (home-v2 9.3) | `New in your shows` | `Slow Horses S6 and 2 more` |
| Tonight in the NBA | the slate (ESPN) | as home-v2 4.2 | `1 live · 1 later · 3 final` |
| A film for tonight | `top` films, unseen, runtime known, ends before 00:00, ≥ 6.5 | `A film for tonight` | `Ends before midnight · best first` |
| Genre for you | TMDB `/discover` `with_genres=G` and the row's `without_genres` exclusion (Comedy: 18,53,27,80,9648,10752; Crime: none; Horror: 35,16 … a table the builder tunes), `vote_count.gte=100`, `sort_by=popularity.desc`, films and series interleaved by his type share, unseen, ≥ 6.5 | `Comedy for you` | `Because you watch Always Sunny, The Office and 12 more` (the three heaviest titles of that genre in his history) |
| Blend | TMDB `/discover` `with_genres=A,B` (AND); anime blends add `with_keywords=210024&with_original_language=ja` | from the table below | `Two things you watch, together · anime + comedy` |
| Anime | TMDB `with_keywords=210024&with_original_language=ja` (`with_genres=16` to drop live action), `vote_count.gte=150` | `Anime` | `Because you watch Spy x Family and 4 more` |
| Because you watched X | TMDB `/recommendations` for each of his last 5–10 finished titles, merged on the device: a candidate's score = how many seeds recommend it (+1 per seed), unseen only, top 20; X is the seed that contributed most (verified: Always Sunny gives Platonic, Great News, 'Til Death, Friday Night Dinner, Peep Show). Fallback without a key: the seed's genre with the largest share in his profile, scored by shared genres (2 points each), director (3), cast (1 each, up to 3), decade (1) | `Because you watched Always Sunny` | `Same kind of thing · Comedy · Drama` |
| Popular | `top` films / series | `Popular films` / `Popular series` | `Popular now` |
| New this year | `year` films / series | `New this year` | `Released this year` |
| Top rated | TMDB `/discover` `sort_by=vote_average.desc&vote_count.gte=300` (150 for series); **TMDB only, never Cinemeta's `imdbRating` catalog** (it is `Featured`: mostly new, mostly unrated); without a key the row hides | `Top rated` | `Rated 8.0 and up` |
| Top rated in a genre | the same with `with_genres=G` | `Top rated comedies` | `Rated 7.5 and up` |
| Something different | a genre with share < 3 %, the same, `vote_average.gte=7.5` | `Something different` | `Documentaries · a kind you rarely watch, rated 7.5 and up` |
| Add-on catalog | another add-on's catalog (its manifest) | the catalog's name | `From <add-on>` |
| Á íslensku | TMDB `/discover` `with_original_language=is` by popularity with `vote_count.gte=10` (films and series; `language=is-IS` with English fallback per field), plus copies with Icelandic audio; TMDB holds 1,451 Icelandic films and 107 series; the row holds the ones over its vote floor, so the subtitle prints no total. Fallback: a build-time list of Icelandic ids (`country` includes Iceland) | `Á íslensku` | `Icelandic films and series` |
| Saved | Saved, not started | `Saved` | – |
| Browse your library | the doors (home-v2 4.4), over the add-on catalogs | `Browse your library` | `OK opens the shelf` |
| Channels | favourites and recent | `Channels` | `Favourites and recent` |

Blend names (both orders are looked up; a pair not in the table reads `Comedy and Crime`):
`Animation+Comedy+Japan → Anime comedy`, `Animation+Action+Japan → Action anime`, `Animation+Japan → Anime`,
`Crime+Drama → Crime dramas`, `Crime+Thriller → Crime thrillers`, `Sci-Fi+Thriller → Sci-fi thrillers`,
`Comedy+Romance → Rom-coms`, `Horror+Comedy → Horror comedies`, `Comedy+Drama → Comedy dramas`,
`Documentary+Sport → Sports documentaries`, `Mystery+Thriller → Mystery thrillers`, `Action+Comedy → Action
comedies`, `Fantasy+Adventure → Fantasy adventures`, `Drama+History → Period dramas`.

**Selection** (the Netflix 2015 shape: candidates, then a greedy page):
1. Anchors in fixed slots: **row 1 is the top browsing row** (never a copy of a Marquee line); Continue watching and New in your shows are the Marquee's lines and one `Your shows` row after the personal rows; Tonight in the NBA is row 2 on a game day (else after the personal rows); Channels last, `Browse your library` second last, Saved before it.
2. Personal slots: `round(8 × share)` rows per genre, at least one for each genre ≥ 12 % and at most three; blends
   fill a slot when their candidate exists (a blend outranks the plain row of its smaller genre). Then one
   `Because you watched`, then `Something different`.
3. Discovery slots: Popular (films and series alternate by his type share), New this year, Top rated, Top rated
   in his top genre, the add-ons' own catalogs.
4. Order after the anchors: personal, discovery, personal, blend, discovery … alternating, so the page is
   calibrated top to bottom, not all personal then all generic.
5. Diversity: a title appears in **one row only** (the earlier row keeps it) and **once per row** (rows
   de-duplicate by IMDb id across their sources); a row whose first 20 titles overlap an already placed row by more
   than 30 % is skipped; a row under 6 titles hides. **Every genre row, blend and genre shelf re-filters by the
   title's own genres** (a catalog page is a candidate list, not the row).
6. The page is **12 to 16 rows**. When the slots give more, rows are dropped in this order until 16 remain: the
   add-ons' own catalogs beyond the first, `Top rated in a genre`, the third personal genre row, `New this year`,
   `Popular series` or `Popular films` (whichever is the smaller type share), a second blend. `Your shows`,
   `Tonight in the NBA` (on a game day), `Saved`, `Browse your library` and `Channels` are never dropped.
7. Row 1 is always a browsing row (the top personal row, else `Popular films`), never a copy of a Marquee line;
   `Your shows` (Continue watching and new episodes in one wide-card row) sits after the personal rows.

**Refresh and change.** The profile and the page are computed once a day (04:00) and when a title is finished; the
order holds for the day (a seeded sort). Each day the discovery rows take Cinemeta's own new order and the personal
rows reshuffle their unseen titles with the daily seed; a row he scrolled to the end gets new titles the next day.
A genre that crosses 12 % adds a row marked `New row` for 7 days; a row he has not entered in 14 days drops one
slot a week and leaves after 28 days (it stays available under Movies / Series). So the page is never the same six
rows, and a change is always announced.

**Cold start** (no history): the Marquee is `Popular now · a pick for tonight` (Details is the primary),
the team's next game, what is on, and `Pick what you like` (a genre picker: 3 chips seed the profile at 10 % each
and are forgotten after 20 plays); the rows are Popular films, Popular series, New this year, Top rated (with a key),
Á íslensku, Channels. Personal rows appear after 3 finished titles; blends after 3 titles carrying both genres.

**Telling him why.** Every row's subtitle; `Hold OK · Why this row?` on any row title (the index) opens a one-card
sheet: `Comedy for you · 55 % of what you watched in the last month is comedy · Always Sunny (8 episodes), The Office
(5), The Studio (3) · Hide this row`.

---

## 7. The add-on library (Movies and Series tabs, Search, the title page)

- **Shelves**: Popular (Cinemeta `top`), New (Cinemeta `year`), Top rated (TMDB discover, vote-floored; hidden without a key), one per
  genre (TMDB discover with the exclusion table; Cinemeta `top/genre=G` re-filtered when there is no key), `Anime`
  (TMDB keyword 210024, combinable with a genre), `Á íslensku`, the other add-ons' catalogs by their names, Saved,
  History; the chips row of UI-SPEC 5.5 carries All · Popular · New · Top rated · four of his genres · More genres
  (a sheet). A TMDB shelf pages 20 at a time (`page`), a Cinemeta shelf 50 (`skip`).
- **Paging**: by the source's page; the grid asks for the next page when the focus is 2 rows from the end of what
  is loaded and keeps at most 12 rows (72 titles) mounted around the focus (rows above are unmounted into a height
  spacer and remounted from the cache on the way up); the scroll bubble reads `#313 of 3,000+` (Cinemeta gives no
  total: `3,000+` once a page past 3,000 answered).
- **Filters** over a shelf (Genre, Decade, IMDb, Runtime, Language) are applied to the pages loaded so far and keep
  loading until 50 matches or 10 pages; the count shows `214 so far`.
- **Sort** is the catalog (Popular / New / Top rated); Title A–Z sorts the loaded pages. **`New` with a genre** is
  `top/genre=G` sorted by year (Cinemeta's `year` catalog takes a year as its genre and cannot be combined with a
  genre); `Top rated` is TMDB's vote-floored list only (the chip hides without a key), never the `imdbRating` catalog.
- **Copies**: a poster shows no quality until its title was opened or checked; the title page asks the stream
  add-ons (the existing copies ranking) and the badge is cached 7 days.
- **Icelandic** in the library: the `Á íslensku` shelf is built as the row is (section 6); the Filters' Language chip
  `Icelandic` applies the same rule.
- **Search**: Cinemeta `search=` over films and series, the guide's titles for live, as UI-SPEC 5.7.
- **The provider's VOD** is no longer read for Movies / Series (the owner's decision); a playlist account with no
  add-ons shows the no-add-ons state of section 2.

---

## 8. Game night and the shield

The rules of home-v2 3.2 hold with these changes:
- **Live, hidden**: the chip says `ON NOW` (no period, no clock, catch-up S4), the plate `Score hidden`; the lit line
  reads `On now · ESPN · 4K · Score hidden`; the fan line ends `· as of tip-off`; both records read `3-0 · as of
  tip-off` and `1-3 · as of tip-off`. Another live game shows only in the NBA row (`Nuggets at Thunder · Live · 3RD`, its card's plate). The NBA tab's own pill is dropped while the game is the lit line (two pills at most: the eyebrow's and
  a card's).
- **Reveal** is Hold OK → `Reveal` → the confirm sheet `Reveal Grizzlies at Trail Blazers?` · `Reveal` · `Keep
  hidden`; a reveal marks the game seen.
- **Live, revealed** (shield off or after Reveal): the chip is the clock `2ND 4:12 · synced`, the plate the score.
- **Pre-game**, **behind in a replay**, **the morning after**, **final seen**: as home-v2's state table, with the
  chip's text as there (`49 MIN`, `1ST 8:20 / paused`, `REPLAY / no spoilers`, `FINAL`).
- The fields: the teams' real primaries darkened for chalk; the clash rule (ΔE 24 / 28° of hue) sends the
  opponent's field to surface-1; a red opponent (Portland) keeps its red: the LIVE pills and the ring sit on the
  canvas and the dark plates, never on a field (the audit's LIVEBG check).
- In the rows, a hidden game's card reads `Score hidden`; `Tonight in the NBA` counts never spoil (`1 live · 1 later
  · 3 final`); the news and video masks of the catch-up spec apply to every row (a matched video of a hidden game
  reads `Grizzlies at Trail Blazers · Score hidden`).

---

## 9. Performance (the Philips 55OLED810, Chrome 113-class WebView)

- **Drawing**: one container for the Marquee (its lines are text; the picture is two `<img>` layers cross-faded on
  opacity), one container per row (`setHtml` per row, as home-v2 9.1), named nodes for live values (`Ends`, the
  clocks, the bar). A key press changes classes and one transform; no string is built on a press.
- **Images at slot size**: metahub `/background/medium/` (1,440 wide) for the picture, `/poster/small/` for 124 px
  posters, `/logo/medium/` for logos, ESPN `500` crests; the Cinemeta `poster` URL rewritten by `sized()`.
- **Loading by row, not by `loading="lazy"`**: the Marquee's picture and the first row get `src` at first paint; the pictures of the lineup's other lines are fetched in the request queue after `launchDone` (so a Down shows its picture inside the 600 ms rest); every other row's cards carry `data-src` and get `src` when their row comes
  within one row of the focus; a row mounts 8 cards and appends the rest when Right reaches the sixth; rows more
  than three away from the focus are text only (their images released) so a 16-row page holds about 40 decoded
  images, under the Samsung guidance that images and node count are the two memory risks.
- **The picture**: swapped after a 600 ms rest, two layers, opacity only; **the cap is normalised**: alpha =
  clamp(1 − target / mean, .10, .60) with the mean luminance of the 32 px copy's right half (target .30 on the
  Marquee, .22 in the rows), computed once per image with the glow colour and cached; the glow is a flat radial from
  the same copy (home-v2 3.8), never a blur.
- **Series catalog pages** are 620–700 KB because each item embeds its episodes: the worker keeps only
  `id, name, type, genres, country, year, runtime, imdbRating, poster, logo, background, cast, director` before
  writing to IndexedDB (about 1.5 KB per title), and the daily fetch budget is 40 catalog pages (about 15 MB
  of series JSON at most, parsed off the main thread) plus the metas of new history titles.
- **Game night**: flat CSS fields, a skewed box for the split, grain; no mask on moving pixels.
- **Nothing animates width**; nothing uses `filter`; the only shadows are the ring and the 1 px border.
- **The engine** runs in a worker from IndexedDB; TMDB discover pages are cached 12 h and recommendations 24 h
  (section 6a), Cinemeta pages 24 h (`catalog/<type>/<id>/<extra>`), metas 30 days; a Home build is 12 to 20 TMDB
  calls (one per row, 5–10 for recommendations) plus the Cinemeta pages, fetched after `launchDone` in the queue,
  3 at a time; TMDB responses are small (about 20 KB a page), so the series-page budget above applies to Cinemeta
  only. Row art for TMDB rows is `image.tmdb.org/t/p/w342` posters and `w1280` backdrops (the app's `sized()` already
  rewrites TMDB URLs); the focused title's logo comes from `/{type}/{id}/images?include_image_language=en,null`
  once, cached with the title.
- **Memory**: ≤ 16 rows × 8 cards + the grid's 72 cells; the audit's node count stays under 400.

---

## 10. What changes in other screens

- **Movies / Series**: fed by the add-ons (section 7); the chips row gains his genres; `See all` from a Home row opens
  the tab with that shelf; the header's count reads `3,000+` for a catalog without a total.
- **Account > Home rows**: lists every row the engine can make with On / Off and the grip (home-v2 section 8), a
  `Hidden` group for rows he hid, `Why this row?` on each, `Reset` and `Forget what you like` (clears the profile,
  not History).
- **Account > Add-ons**: unchanged; the no-add-ons state of Home points here.
- **Account > Provider** gains `TMDB key` (typed through the phone page, shown as `Set · ends …`, `Remove`); the
  first evening without one shows the Marquee's one-time line (section 6a).
- **Account > About** gains the TMDB logo and the attribution line (section 6a) and credits the other sources (Cinemeta for catalogs and metas, ESPN, the add-ons). Source names never appear in Home's subtitles or eyebrows.
- **First start**: the three quick choices gain `Pick what you like` (3 genre chips, skippable).
- **The title page**: unchanged; it is where copies are checked and where OK from a row lands.
- **The NBA tab**: drops its LIVE pill while Home's lit line is the game; unchanged otherwise.
- **The launch**: Home ready = the Marquee's lines from the cache and its first picture decoded, as home-v2. The
  full launch animation plays on a cold start and at most once a day; a warm start shows its last frame; any key
  skips it.
- **Account > NBA**: `Game night: full / quiet` (quiet keeps the fields to the right third of the picture and the
  canvas under the lineup).
- **The remote**: P− / P+ (channel down / up) on Home mean `Browse` / `Tonight`; in the player they keep zapping.

---

## 11. Strings

Eyebrows: `CONTINUE WATCHING`, `NEW EPISODES`, `A FILM FOR TONIGHT`, `GAME NIGHT`, `LAST NIGHT`, `ON NOW ·
RÚV · CHANNEL 1`, `POPULAR NOW · A PICK FOR TONIGHT`.
Line facts: `New episodes`, `A film for tonight`, `ends 23:31`, `Your team`, `On now`, `until 20:55`, `Short`, `3 new`.
Pills: `Resume`, `Play`, `Watch live`, `Tune`, `Details`, `Open`. Hints: `Episodes`, `More popular films`, `From
tip-off`, `Guide`, `Start over, Details`, `Reveal, more`, `Play now, Save, Not interested`, `Save channel`.
Rows: the names and reasons of section 6 (`Popular now`, `Released this year`, `Rated 8.0 and up`, `Icelandic films
and series`, `Where you are, and what is new`, `Favourites and recent`); `New row`; `See all`; `Why this row?`; `Hide this
row`; `Not interested`. The peek: `P− Browse · 15 rows`; the end: `End of Home · P+ Back to the top`; `Add a Stremio
add-on for films and series`.
Game: `ON NOW`, `Score hidden`, `as of tip-off`, `Reveal Grizzlies at Trail Blazers?`, `Reveal`, `Keep hidden`.
States: `Needs a connection to play`, `Offline · showing what airglow remembers`, `No poster`, `Not enough anime
comedy yet`. No source name (Cinemeta, TMDB) is printed in an eyebrow, a subtitle or a context line.

## 12. Acceptance (what the builder's audit checks)

Safe area (every text and every ring inside x 48–912, y 27–513, checked on the first card of every row kind (poster, wide, game, channel) and on the library grid's first and last columns; art may bleed; a peeking card shows no text); one ring per screen; no text under
14 px except badges and the count chip; no `Ends` or title text printed on poster art; a hidden game shows no
quarter, clock, score, OT or result anywhere on Home and every record carries `as of tip-off`; the LIVE pill and the
ring never on a team colour (pixels sampled); at most two LIVE pills; every row has a reason line; a title in one
row only; the row index names the rows on the page in order, and the row that peeks below is the index's next name; the picture swap waits 600 ms; node count under 400;
no `filter`, no width animation; images at slot size; the Marquee has 3 lines (4 on a game day), each name plus facts within the lineup's 470 px (the facts shortened by the rule `title first, then the reason, then the fact, then the badge`).
