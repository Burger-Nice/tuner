# airglow add-ons v1.0: independent review

Reviewer: independent TV UI/UX reviewer, 27 Oct 2026. I read `SPEC.md`, all 30 PNGs and the contact sheet, and the
designs and code it has to fit: `UI-SPEC.md`, brand v5.4 `BRAND.md`, `subtitles/SPEC.md`, `catchup/SPEC.md`,
`home.js`, `account.js`, `detail.js`, `catalog.js`, `state.js`, `player.js`, `core.js`, `PlayerActivity.java`,
`Diag.java`, `build-ratings.js` and `capacitor.config.json`. I ran `tools/audit.js` (30 pages, 0 findings).

**What I checked live (27 Oct 2026):**
- **Stremio's link API.**
  - `link.stremio.com/api/v2/create?type=Create` returns `{result:{success, code, link, qrcode}}` with a 4-character code.
  - `/api/v2/read` while nobody has signed in answers `101 "Invalid or expired token"`.
  - `link.stremio.com/<code>` sends a 302 to `stremio.com/login?code=…`.
  - `link.stremio.com/` really has a box for typing the 4 letters.
- **Stremio's account API.**
  - `addonCollectionGet` with no key gives the 7-add-on default collection, each with `transportUrl` and `flags`.
  - With a bad key it answers `code 1 "Session does not exist"`.
- **Cinemeta.**
  - The manifest is 3.0.14.
  - `year` needs a genre: 107 options for movies, 67 for series.
  - `last-videos` and `calendar-videos` have required extras.
  - The catalogs answer with a 307 redirect to `cinemeta-catalogs.strem.io`.
  - Searching "dune" gives 19 results.
- **OpenSubtitles v3** answers the `filename / videoSize / videoHash` request form.
- **Images.** metahub `background/small` is 480 x 270 and 19 KB; `medium` is about 1 MB.
- **Stremio's community list**: 97 add-ons, 48 of them need setup, 19 offer streams. Sampling those streams changes
  the picture (see M3).

**Overall, this is the most thorough design in the repo.**
- The protocol claims I could check are right.
- The rule that only direct links play is applied consistently.
- The no-typing ways in (the Stremio link code, the TV's own Wi-Fi page) are the right answer for a remote-only owner.

**The problems are where it meets the rest of the app:**
- Home's layout, which an earlier review settled.
- The subtitles design's ranking and Play wait, which now exist twice.
- The diagnosis cards, which blame "your provider".
- The catch-up shield, which has no way to find add-on replays.
- Some real add-on behaviour the mocks don't model: info-only "streams", debrid placeholder videos, the same add-on
  set up twice.

## Scores

| Dimension | Score |
|---|---|
| Protocol correctness and compatibility with real add-ons | 7.5 |
| Remote ergonomics (adding without typing, Stremio sign-in) | 8.5 |
| Clarity for a casual, non-technical owner | 7.0 |
| Visual quality and consistency | 8.0 |
| Feasibility (Wi-Fi page, IMDb match, latency, 1 to 2 connections, TV performance) | 6.5 |
| Privacy and security | 7.5 |
| States and edge cases | 7.0 |
| **Overall** | **7.2** |

---

## Must-fix

### M1. Home: the add-on rows break Home's layout, and an earlier review had ruled them out

**What's wrong:**
- **Code.** Home is a hero plus **two** rails: `rows = order.filter(...).slice(0, 2)`, `ROW_TOP = [278, 422]`, the
  second rail a fading "peek".
- **UI-SPEC 5.2 and its decisions table (row "UX 4.3 Home rows and UX 4.9 shelves page")** decided against a shelves
  page: "fewer nodes, one mental model".
- **SPEC 4.1** adds up to 6 add-on rows "after airglow's own rows (Continue watching, On now, Tonight's games)".
  Today Tonight's games isn't even shown when two other rows are.
- **`acct-catalog-menu`** says "A row after Tonight's games".
- **`home-rows` and `home-row-menu`** show only a scrolled-down state, with no top bar and no hero. Nothing specifies:
  - how the page scrolls past the hero;
  - where the peek row goes;
  - how many rows stay mounted (the UI-SPEC budget is about 250 nodes per screen);
  - what Up and Back do from the 5th row;
  - how AC-P4 (resume in 1 to 2 presses) survives.

**What to do instead.** Either:
- **(a)** keep Home as it is and put add-on catalogs on Movies and Series only (chips, as `movies-addon` already
  does), with Home rows off by default and owner question 3 deciding; or
- **(b)** design the scrolling Home properly: a mock of the first Down from the hero, the page-lift geometry for row
  3 and later, virtualisation (at most 3 rails mounted), Back from any row going to the hero, and an explicit
  amendment of UI-SPEC 5.2.

(a) is cheaper and matches the spec's own claim that he "wants better copies, not a second app".

### M2. One ranking and one Play wait, shared with the subtitles design (5.3 and 5.5 against subtitles 4.2 and 5.4)

**Two rankings for one Copies list:**

| | Subtitles 5.4 | This design 5.3 |
|---|---|---|
| Order | pinned → language → plays on this TV → class → HDR → bitrate → sound → subtitles in the file | plays on this TV → language → picture → range → kind (Blu-ray / web / TV / cinema recording) → data → ties (provider first) |
| Unchecked copies | rank "below checked copies of the same class" | not said |

So the two `defaultVersion()`s disagree on the first two keys and on unchecked copies. The Copies menu,
`player-sources` and Play will pick different "best" copies depending on which spec the engineer follows.

**Two waits before Play:**
- Subtitles 4.2: Play may first read "Checking 2 copies…" for up to 3 s.
- This design 5.5: Play may read "Playing in 3 s" for up to 4 s.
- Nothing stops them running one after the other (7 s).

**Smaller mismatches:**
- `detail-play-wait` shows the Version pill with "best of 1"; subtitles 4.2 says the pill shows only with 2+ copies.
- The caption reads "OK plays Full HD now", the spec says "OK plays 1080p now", and the tag says "HD".

**What to do instead:**
- Write **one** ranking in one place: the subtitles list with "kind" and "cinema recording last" inserted after
  class, and "ties: provider, then add-on order" at the end. Say this design amends subtitles 5.4 and doesn't
  replace it.
- Write **one** pre-play wait with a single 4 s budget that covers both checking and waiting for add-ons, with one
  caption.
- Say the pill also shows with 1 copy while a stream add-on is still asking.

### M3. Info-only "streams" from real add-ons would show up as "Watch in another app" or as copies (5.6, 11.4)

**What I found** when I asked the community stream add-ons for Dune: Part Two:
- AfterCredits answers `{"name":"After Credits","title":"No Stingers Found","externalUrl":"https://aftercredits…"}`.
- Watch Next answers ten recommendations as `externalUrl: "stremio:///detail/movie/tt1160419"`.
- In 3.4's `Streams` chip, none of the 19 community stream add-ons give film copies. They are IMDb Ratings,
  DoesTheDogDie, Cast Search, Statusio and similar widgets.

**What would happen.** Under 5.6, every `externalUrl` becomes a "Watch in another app" entry. The owner would see:
- "After Credits" and "Dune", "Star Wars…" listed as if they were HBO Max and Prime Video;
- `stremio:///` links fired with `ACTION_VIEW` (nothing on his TV takes them);
- plain web pages on a Google TV that usually has no browser.

**What to do instead:**
- Only offer an `externalUrl` stream as "another app" when it has `androidTvUrl`, or its host is a known streaming
  service.
- Map `stremio:///detail/{type}/{id}` to airglow's own title page, or drop it.
- Drop the rest, or show them as one quiet info line ("AfterCredits: no scene after the credits").
- Learn an add-on's kind from its answers, as 3.1.1 already does, and don't count info-only add-ons as "still
  looking" in 5.1 or 5.5. Otherwise WatchHub-like add-ons make Play wait.
- In `add-list`, rename the `Streams` chip or explain under it that copies come from add-ons set up with a debrid
  service, which aren't in Stremio's list. As drawn, the chip promises what the list can't give.

### M4. The 64 KB check and auto-play on debrid links have side effects and can be fooled (5.3, 5.5, 8.2, 11.4)

**What's wrong:**
- Debrid add-ons (Torrentio and its relatives) give "resolve" links. Opening one makes the add-on add the torrent to
  the owner's debrid account.
- For an uncached torrent, the add-on starts a download and redirects to a short "downloading" placeholder video.
- Since late 2024 Real-Debrid no longer tells add-ons what's cached, so many results don't carry the ⏳ or
  `download` marker 11.4 relies on.

**What the design does with that:**
- 5.3 runs the subtitles check on the **top 3** add-on copies as soon as the page opens. That adds 3 torrents to his
  debrid account per title browsed, and can start downloads he never asked for.
- The placeholder is a valid video, so the check would tick its resolution and length.
- 8.2's "before the first frame" failure never fires, because the placeholder plays.
- Progress, Continue watching and even "watched" (at 94%) could be recorded from a 30-second clip.

**What to do instead:**
- Never open an add-on copy's link before Play. Check add-on copies only when he presses Play (or picks one), and
  only the copy about to play.
- Treat a copy whose length is under 50% of the title's runtime (from Cinemeta's `runtime` or the provider) as
  "not ready yet". Hand over to the next copy, and record no progress from it.
- Add the placeholder case to 8.2 and to the fake add-on in the 12.11 tests.

### M5. A wrong IMDb match would make Play play a different film (4.4, 5.3)

**What's wrong.** "Likely" matches (same key, year ±1, or a series with no year) are used "for everything", and 5.3
puts a 4K add-on copy above the provider's 1080p. So Play plays a remake or a same-name film when the match is
wrong. The ratings file only holds titles with 1,000+ votes, so "the only row with that key" is weaker than it looks
(`build-ratings.js`: `MIN_VOTES = 1000`).

The levels table also has a gap: a **movie** with no year and exactly one candidate is in none of the rows.

**What to do instead:**
- An add-on copy may outrank the provider's own copy on a provider title only when the match is **Sure**, or when the
  copy's checked length is within ±8% of the provider copy's.
- Otherwise list the add-on copy below the provider's with a "might be another film" note, and let him pick.
- Fill the gap in the levels table.

### M6. The player's diagnosis would blame "your provider" for add-on failures (8.1, 8.2; `Diag.java`)

**What's wrong.** `Diag.decide` turns HTTP 401, 403, 458 and 509, an unreachable host and slow arrival into cards
like these:
- "Your provider allows 1 stream";
- "Your provider account has ended. Renew it with your provider";
- "Your provider isn't answering".

It also checks the Xtream account API to decide. A failing Northlight or Real-Debrid link would produce these cards,
and they compete with this design's own failure card in `player-source-failed`. The spec never mentions the
diagnosis design.

**What to do instead:**
- Pass `source` into the player.
- For non-provider copies, skip the account and connection-limit checks, and name the add-on: "Northlight refused
  this copy", "Northlight isn't answering".
- Say which card wins. I suggest the hand-over card for films and episodes, with Diag's network causes (Wi-Fi,
  internet) still shown when they are the reason.

### M7. The shield (section 10) has no way to find add-on replays, and 3.3 would drop the add-ons that carry them

**What's wrong.**
- Catch-up 3.3 matches names inside `catalog.movie`, the provider's list, which is already in memory.
- An NBA replay add-on has no IMDb ids. It would expose games through its own catalog, typically `type: tv`,
  `channel` or `other` with its own id prefix.
- So `replaySources(g)` would need to know which add-on catalogs to read, with what search, how often, and with what
  timeout.
- Meanwhile 3.3 leaves out add-ons that give only `channel` or `tv` ("channels aren't in airglow yet"), which is
  exactly where such an add-on would sit.
- "Courtside" is illustrative, and no real add-on was checked.

**What to do instead.** Either:
- specify discovery: catalogs whose names or genres match NBA, searched with both teams' names, cached for 1 h
  through the 6-at-once limit, and allowed past the `tv` and `channel` exclusion; or
- move section 10 to "later", keeping only the sentence that any add-on video of a hidden game follows catch-up 5.8
  masking wherever it appears.

---

## Should-fix

**Protocol and compatibility**
1. **The same add-on set up twice.** Torrentio set up once with Real-Debrid and once with another service has one
   `manifest.id`, but the spec keys everything by it: `data-key ad:<manifest.id>`, the choices that survive sync,
   and order. Key by a hash of the `transportUrl`. Only fall back to `manifest.id` when one add-on's address
   changes and it is clearly the same one (a version upgrade).
2. **The 11.4 name parser** needs whole-token matching on `[^a-z0-9]` boundaries, with the file extension removed
   first. As written:
   - `ts` matches `.ts` files and the "ts" in `DTS`, labelling them "cinema recording · poor";
   - `dv` matches `DVDRip` and becomes Dolby Vision;
   - `hdr` matches `HDRip`;
   - `web` matches any word containing "web";
   - `sd` matches inside other words.
3. **Dolby Vision profile 7.** Blu-ray remuxes ("4K · Dolby Vision · Blu-ray · 51.6 GB", the top row in
   `detail-sources-sheet`) are usually Dolby Vision profile 7. Media3 has no HEVC fallback for profile 7, and most
   Google TV chips can't decode it.
   - Until checked, rank a name-claimed "DV + Blu-ray/remux" copy as HDR10.
   - Have the check read the profile; subtitles 5.2 covers only profiles 5 and 8.
   - Also cap by measured speed: rule 6, "higher measured bitrate", rewards a 41 Mb/s copy his Wi-Fi may not hold.
     Use Diag's speed result (skip copies above 0.7 x measured speed) for "Always the best copy".
4. **Older manifests.** Also read `extraSupported` and `extraRequired` on catalogs (Cinemeta still sends both). Respect
   `behaviorHints.countryWhitelist` on streams (he is in Iceland). Treat `idPrefixes` being absent as "all".
5. **Series numbering.** The union in 5.8 matches episodes by season and episode number. That breaks on providers
   that use absolute numbers, year-named seasons or split seasons, and then plays the wrong episode's add-on copy.
   Check the episode's name, or its length within ±20%, before merging. Otherwise keep them as separate episodes.
6. **Up next and the native queue.** `playVod` sends all queued entries with their URLs at start. Add-on episodes
   don't have one until they are asked. Spell out a `need: next` event so the URL is resolved lazily. Also say that
   Continue watching stores the copy's identity (source, `bingeGroup`, filename), not its URL. Debrid redirect links
   expire, and today `recordProgress` keeps the whole item snapshot.

**Feasibility, connections, performance**

7. **Hand-over on a 1-connection provider.** `Diag.closedAt` notes that a provider may still count a closed stream for
   up to a minute. 8.2's instant hand-over from one provider copy to another will hit "max connections". Prefer a
   copy from another source for automatic hand-overs, or wait for the existing retry.
8. **The setup card's Install path never finishes.** `add-setup` waits for a POST from the phone. The add-on page's
   **Install** goes into his Stremio account instead, and sync only runs at cold start or when Account > Add-ons
   opens (3.3). While the card is open and he is signed in, read the collection every 5 s, and move on when a new
   add-on appears.
9. **Movies paging.** Specify the loading state when key repeat runs into a page not fetched yet: a static skeleton
   row, with focus staying put. Also cover a failed next page, with an inline "Try again" row, not the full
   `movies-addon-down` card.
10. **Home rows without a stream add-on.** "Or the provider matches its titles" (4.1) is ambiguous. Without a stream
    add-on, show only the cards the provider has, or no row. Otherwise most cards lead to "No copy to play".

**Privacy and security**

11. **Signing out of Stremio.** `Sign out` should call `POST /api/logout {type:"Logout", authKey}` before forgetting
    the key. Otherwise the session stays alive on Stremio's side.
12. **`androidTvUrl` comes from untrusted add-ons.** Parse it with `Intent.parseUri(…, URI_INTENT_SCHEME)`, then
    clear `component` and `selector` and add `CATEGORY_BROWSABLE` (Chrome's rule). Without that, a community add-on
    can launch any exported activity. Also escape all add-on text: name, description, cast.
13. **The Wi-Fi page's 4-digit code.** It can be guessed on the home network within the 10 minutes. Lock it after 5
    wrong tries, or use 6 digits.
14. **Stream links are secrets too.** Extend SECRET (11.3) to them: debrid resolve links carry the API key in the
    path. Never log them, and never show them in any toast, diagnosis or Check screen.
15. **Say plainly that add-ons see what he opens.** One line on the confirm screen (`add-confirm`): "Northlight sees
    which films you open."

**Clarity for the owner**

16. **"Stream" is on screen**, though 1 says it never reaches the screen. It appears in:
    - `acct-addons` and `state-addon-down`: "Streams for movies and series";
    - `add-stremio-found`;
    - `add-confirm`: the chip "Streams: movies, series";
    - `add-list`: the `Streams` chip.
    Use "Copies of films and series", and add `stream` to the JARGON list so the audit catches it.
17. **The most important requirement is invisible.** The `add-ways` footer says "airglow plays direct links. An
    add-on that only finds torrents shows nothing here", and "debrid" is banned from the screen. Most of the add-ons
    he knows from Stremio give torrents unless set up with a debrid service. Say it once, in his words, on
    `add-ways` and `add-list`: "Copies come from add-ons set up with a service like Real-Debrid. Add-ons that play
    torrents directly won't show anything here."
18. **Text cut off where it matters.**
    - `add-ways`: the first and most important row's line 2 ends "come here an…". Shorten it to "Sign in once on your
      phone. Your add-ons come over and stay in step".
    - `add-stremio-found`: "with your Stremio acco…". Use two lines, or "with Stremio".
19. **`acct-addons` "Higher comes first"** is unclear. Say what order does: "Order: which add-on's details and
    catalogs come first".
20. **`add-stremio-found` ticks Public Domain Movies by default**, though its own line says its films are torrents.
    Leave unticked by default any add-on airglow already knows gives nothing playable.

---

## Nits

- **Words that differ between mocks:**
  - Public Domain Movies' line 2: `acct-addons` "A catalog only: its films come as torrents" vs `state-addon-down`
    "Its films come as torrents, which airglow doesn't play".
  - The section caption: "Higher comes first · synced with Stremio 21:02" vs "Synced with your Stremio account at
    21:02".
  - Pick one of each.
- **`state-addon-down`**: Archivio answers (with a web page), so "Not answering" is the wrong state. Use "Not an
  add-on any more", and keep "Not answering" for timeouts.
- **`detail-addon-only`**: the pill is ticked ("✓ 4K HDR10 · Northlight"), but the meta tags `4K` and `HDR` are
  neither ticked nor dashed. Follow the subtitles 4.1 rule. The puzzle glyph in "Not on your provider" sits above the
  text baseline.
- **`player-source-failed`**: "4K · HDR" vs the Copies menu's "4K · HDR10". Use one word per fact across the
  player's cards.
- **`search-addons`**: "Dune: Part Three · not out yet" opens a page with nothing to play. Leave unreleased titles out
  of Search, or dim them, unless Saved is the point.
- **`add-list`**: entry focus lands on a Polish subtitles add-on (Napisy24). Open on Official, or filter community
  subtitle add-ons to his languages (Account > Languages).
- **`add-phone` and 3.5**: say "home network", not "Wi-Fi". A TV on Ethernet works the same way.
- **Copy keys**: `cp:<source>:<hash of url>`. Real-Debrid's direct links change on every request, so hash the
  filename plus size (or `bingeGroup`) for focus identity, not the URL.
- **11.1**: CORS doesn't matter with `CapacitorHttp` enabled (Capacitor 8 sends fetch through the native proxy).
  Say so, so nobody blocks an add-on for a missing header.

## What's good and should stay

- Signing in with Stremio's link code is verified end to end as far as it can be without an account. Focus starts on
  the fallback button, and the TV never writes to his Stremio account.
- The Wi-Fi page served by the TV, rather than a relay server, with the reasoning written down. It also unlocks the
  phone sign-in UI-SPEC 5.1 planned and never built.
- `add-confirm` as the single end point for every way in, with its warning lines for configured, torrent and adult
  add-ons.
- `detail-nosources` naming each add-on and why ("only as a torrent"), with Look again focused.
- Catalogs as chips on Movies and Series, with Sort and Jump honestly removed, and the paging rule based on what
  Cinemeta really sends (49 or 50 per page).
- The shield rules that are written (no size or length for hidden-game copies, names masked) are the right ones. They
  only need M7's discovery to have anything to apply to.
- The audit's new JARGON and SECRET checks, proven with `--inject`. They need `stream` added (S16).
