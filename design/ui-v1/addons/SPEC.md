# airglow TV: add-ons (the Stremio add-on system), v1.2

This is the design spec for the engineer. It extends `design/ui-v1/UI-SPEC.md` v1.2 (layout, type, focus, the shield)
and plugs into the designs made beside it:
- **subtitles and real quality** (`design/ui-v1/subtitles/`): the Version pill, the Copies menu, the 64 KB check,
  "Which film is this?", the player's Subtitles panel;
- **diagnosis** (`design/ui-v1/diagnosis/`): the player's stall and failure cards;
- **catch-up** (`design/ui-v1/catchup/SPEC.md`): replays and their shield.

Everything not said here follows those. **The copy ranking, the one wait before Play and the IMDb match live in one
shared file, `design/ui-v1/copies/RANKING.md`** (owned by the subtitles designer, reviewed by me). Section 5.0 points
there and keeps only what is add-ons-specific.

The owner asked: *"I want to be able to add addons like stremio, just do stremio's system on our app."* His provider's
films and shows are often poor (missing subtitles, bad quality). Add-ons add more copies, catalogs and subtitles
**next to** the provider, never instead of it.

- **The mocks** are real HTML at the 960 x 540 canvas. They link the app's own `app/tv/brand/tokens.css`, `ui.css`
  and `app.css`, plus `addons.css` (new classes only, prefix `ad-`, written to be appended to `app/tv/app.css`).
- **The data** is real where it can be: Cinemeta, OpenSubtitles v3, WatchHub, Public Domain Movies, the Stremio API
  and its link codes, Stremio's add-on lists and the retired Archivio, fetched on Tue 27 Oct 2026 at 04:10 UTC
  (`data.json`, `tools/fetch.js`). Shown as the owner's TV would show it at 21:10 Reykjavik time (UTC).
- **Illustrative**: the provider's copies; **Northlight** (a stream add-on set up with a debrid account, giving direct
  links); **Kestrel** (a slow one); every stream's size and file name. I have no debrid account, so no real debrid
  answer was fetched (11.5). Art is the kit's procedural stand-in.

| File | What it is |
|---|---|
| `SPEC.md` | this |
| `*.html` (30) | the mocks; `png/*.png` are their 2x renders, `png/contact-sheet.png` shows all 30 |
| `addons.css` | the new CSS |
| `data.json` | the real add-on answers used by the mocks and section 11, with a timed request log |
| `tools/fetch.js` | fetches `data.json` (`NODE_USE_ENV_PROXY=1 node tools/fetch.js` behind a proxy) |
| `tools/build.js` | builds the mocks from `data.json` |
| `tools/render.js` | the PNGs and the contact sheet |
| `tools/audit.js` | the self-check (section 13) |
| `../copies/` | **v1.2**: the shared `RANKING.md`, `copies.js` and `copies-test.js` (90 cases). This folder's own `tools/copies.js` and `copies-test.js` are deleted; their cases live on there |
| `REVIEW-independent.md`, `REVIEW-independent-2.md` | the reviews of v1.0 (7.2) and v1.1 (7.8) |

---

## v1.2 changes: an answer to the second review

### Must fix

**M1. The ranking, wait and match were written twice and disagreed. Accepted.**
- They now live in **one file**, `design/ui-v1/copies/RANKING.md`, with `copies.js` and `copies-test.js` (90 cases,
  0 failed). This was the coordinator's decision; the subtitles designer owns the file and I review changes to it.
- **Section 5.0 here is a pointer.** It keeps only what is about add-ons: who is asked, info-only add-ons, links never
  opened before Play, the Likely group's look.
- This folder's `tools/copies.js` and `copies-test.js` are **deleted**. Their cases (the name parser, the bands, the
  not-ready rule) are in the shared test. The self-check runs it (13.2).
- **The order changes, as RANKING.md 8 says:** `detail-sources-sheet` is now **B, A, N, P, F**. Northlight's 1080p
  Blu-ray (14.2 GB, about 11 Mb/s from its size) is above the provider's checked 1080p (7.1 Mb/s). `player-sources` and
  the hand-over card follow the same order.
- **The subtitles spec's section 15, mirrored:**
  - **Copies foot:** `Mb/s is the picture's share. Picking a copy keeps it for this film.` (the Likely menu adds `, and
    tells airglow it's the same film`).
  - **Line 2:** the source first, then the problem (`named 4K`, `its name says Dolby Vision`, `not checked yet`), then
    the rest; on a provider row, the provider's name in quotes, last.
  - **Pill:** `4K Blu-ray · Northlight · best of 9`.
  - **Tags:** `1080p`, never `HD`, with their case kept (`detail-play-wait`, `detail-copies-likely`). A text scan of the
    mocks finds no `HD` or `Full HD` left.
  - **The pill-row slot**, one text by priority: 1 the time left, 2 `Still asking …`, 3 the subtitles text. **The wait
    caption is on the Play button's row, not in the slot** (`detail-play-wait`: caption after Save; the slot says
    `Still asking Northlight`).
  - **Quality panel:** 384 wide (`player-sources`). A new audit check, **PANEL**, fails anything else.

**M2. The match gate and the placeholder rule broke on series. Accepted; settled in RANKING.md 4.3 and 2.2.**
- **A series is Sure** when he picked it, or the TMDB or TVDB ids agree, or 2 of its first 3 checked episodes are within
  8% of the series runtime.
- **One odd-length episode** gets its own note and never changes the series.
- **Not ready, for an episode:** under 50% of the provider episode's own length, else under a 3 min floor, or the
  add-on's marker. Never the series runtime.
- `detail-series` now says why The Bear is Sure: the TVDB ids agree, 403294.
- 8.1's `runtime` field and 8.2 point there.

### Should fix (all accepted)

1. **Speed cap on unchecked copies** and **2. checked before unchecked**: settled in RANKING.md 2:
   - unchecked copies get a size-based bitrate;
   - the speed counts only if measured in the last 7 days;
   - "checked first" applies between provider copies only.
3. **The `add-list` filter is now a rule on the manifest text** (3.4).
   - It leaves out an add-on that names a language and none of his: 19 of the 44 subtitle add-ons, computed from the
     real list in `tools/build.js`.
   - Rows keep Stremio's order and their **own** descriptions, one line with an ellipsis. Those lines are marked
     `data-desc`, which the CUT check exempts.
   - OpenSubtitles v3 is no longer shown under Community.
4. **The pill-row slot:** see M1 (5.1).
5. **Which copy comes next** (8.2):
   - another source only for **source-wide** failures (timeouts, 5xx, refused, stopped sending);
   - a placeholder or decoder failure takes the next in rank, even from the same add-on (`player-not-ready`).
6. **A Wi-Fi cause re-ranks** with the new speed before picking the next copy (8.2).
7. **`stremio:///detail` links** go into More like this, at most 10, with duplicates and the title itself dropped;
   never into Copies (5.6).
8. **`countryWhitelist`** uses the TV's own region (Android Settings); when it's unknown nothing is filtered (5.4).
9. **Picking a Likely add-on copy** makes the match Sure for this title, so it stays first next time (5.2).
10. **Default catalog switches:** the first two catalogs of each type per add-on start on, the rest off. Cinemeta:
    Popular and New on, Featured off (3.1.3).

### Nits (all fixed)
- **Kestrel's moment:** `state-addon-down` is now later the same evening (23:10, synced 23:02), after Kestrel timed out.
  The title-page mocks at 21:10 still ask it.
- **The contact sheet header** no longer lists "Courtside".
- **`add-stremio-found`:** changes arrive `when airglow starts or you open Add-ons`.
- **Copies line 2:** the problem comes right after the source.
- **The same add-on set up twice** gets a short label after its name in Copies, Continue watching and Account: the
  debrid service when its link or name says it (`Torrentio · RD`), else `· 2` (3.3).
- **`player-not-ready`:** the next copy, unchecked, says `the name says`.

## v1.1 changes: an answer to every review point

*(History. Where it says 5.0.1, 5.0.2 or 5.0.3, read RANKING.md 2, 3 and 4: v1.2 moved them there, and `tools/copies.js` went with them.)*

### Must fix

**M1. Home rows broke Home's layout. Accepted: option (a).**
- Home is unchanged: the hero plus its two rails (`home.js`, `ROW_TOP = [278, 422]`; UI-SPEC 5.2's no-shelves
  decision stands).
- Add-on catalogs show **only as chips on Movies and Series** (4.2).
- Hiding a catalog happens where it shows: hold OK on its chip, `Hide this chip` (new mock `movies-chip-menu`). It also
  happens in the add-on's sheet, where each catalog is now one switch (`acct-addon-sheet`).
- `home-rows`, `home-row-menu` and `acct-catalog-menu` are gone. Owner question 3 now asks whether he wants an add-on
  row on Home at all; if he does, it would take Home's second rail, and needs its own design.

**M2. Two rankings and two waits. Accepted.**
- **Section 5.0, "Shared with subtitles: the copy ranking, the Play wait and the IMDb match"**, is the one place they
  are written. It **amends** subtitles 5.4 (the ranking), 4.2's Play row (the wait) and 3.2 (the match) rather than
  replacing them. It is the subtitles list with *kind*, *cinema recording last*, *the match gate*, *not ready* and the
  *speed cap* inserted, and *ties: provider, then add-on order* at the end.
- **One pre-play wait** (5.0.2): one 4 s budget from the press, one caption, whatever it is waiting for. It never
  waits on a provider check when the account allows 1 or 2 connections (the subtitles review's S11).
- The Version pill also shows with **one copy while a stream add-on is still asking** (5.0.2, `detail-play-wait`).
- The caption is now `Looking for a better copy · OK plays this one now · Back stops`. Pills and captions say `1080p`;
  the meta-line tag stays `HD`, the subtitles 4.1 rule for tags.
- `tools/copies.js` is the reference code, and `tools/copies-test.js` proves the order on the mocks' copies.

**M3. Info-only "streams" would show as apps or copies. Accepted.**
- An `externalUrl` stream is offered as **another app** only when it has `androidTvUrl`, or its host is on a short list
  of streaming services (5.6).
- `stremio:///detail/{type}/{id}` opens airglow's own title page for that id; any other `stremio://` link is dropped.
- Other info-only answers (AfterCredits' `No Stingers Found`) never become copies. They show as one quiet line in the
  title's full description: `AfterCredits: no scene after the credits`.
- **An add-on's kind is learnt from its answers** (3.1.1). An add-on that has only sent info, or only `externalUrl`,
  is never counted as "still looking", so it can't make Play wait.
- **`add-list`:** the `Streams` chip is gone. None of the 19 community stream add-ons gives copies of films; they are
  ratings, after-credits notes and warnings, so they sit under `Extras`. One line under the chips says where copies
  come from.

**M4. The 64 KB check and debrid links. Accepted.**
- **An add-on copy's link is never opened before Play** (5.0.1). Checks run only on the provider's copies, under the
  subtitles design's rules. An add-on copy is checked as it starts, and only the copy that is about to play.
- Add-on copies therefore carry no tick until they have played once. They show the dashed "the name says" tags
  (`.tag.ad-name` = `.tag.st-name`), on the pill, in Copies and in the meta line.
- **Placeholders:** a copy shorter than half the title's runtime (Cinemeta's `runtime`, else the provider's length) is
  `not ready yet`. It gets no progress, no "watched" and no tick; the next copy plays; it drops to the bottom for this
  session (8.2, new mock `player-not-ready`).
- The fake add-on in the tests (12.11) serves a 30 s placeholder for one copy.

**M5. A wrong match would play another film. Accepted.**
- **The match gate** (5.0.1, 5.0.3): an add-on copy may outrank the provider's own copy only when the match is **Sure**.
  Sure means: the TMDB ids agree, or he picked it, or the provider copy's checked length is within ±8% of Cinemeta's
  runtime.
- With a **Likely** match the add-on copies are listed after all the provider's copies, under `From add-ons · might be
  another film`, each naming the film it is for (new mock `detail-copies-likely`).
- **The gap is filled:** a film with no year is never Sure or Likely by name alone. Even with one candidate it is
  Unsure (it asks), unless its length agrees.
- The match counts the rows per key in the ratings file, as the subtitles review asked, so a key with 2+ rows is Unsure.

**M6. The diagnosis cards blamed "your provider". Accepted.**
- The player gets each copy's `source` (8.1). For any copy that isn't the provider's, `Diag` skips:
  - the Xtream account check;
  - the connection-limit causes (401, 403, 458, 509, "max connections");
  - "Your provider account has ended".
- It names the add-on instead: `Northlight refused this copy`, `Northlight isn't answering`.
- **Which card wins** (8.2): for films and episodes, the hand-over card. Diag's network causes (Wi-Fi, internet) still
  show when they are the reason, inside the hand-over card's first line: `Your Wi-Fi is too slow for this copy`.

**M7. The shield had no way to find add-on replays. Accepted: moved to later.**
- Section 10 keeps one rule: any add-on video that names a hidden game's teams follows catch-up 5.8 masking wherever it
  appears (Search, Movies chips, Copies), and shows no size or length.
- Finding add-on replays for `replaySources(g)` is "later", with an open question (14).
- `sources-shield` is gone. No real NBA replay add-on was checked, and "Courtside" was made up.

### Should fix (all accepted)

1. **The same add-on set up twice.** Add-ons are keyed by a hash of the `transportUrl` (`data-key ad:<hash>`, order,
   switches, sync). `manifest.id` is used only to carry choices over when one add-on's address changes and it is
   clearly the same one: same id, same host, a newer version (3.3).
2. **The name parser.** Whole tokens on `[^a-z0-9+]` boundaries, with the file extension removed first (11.4,
   `tools/copies.js`). Tested on `.ts`, `DTS`, `DVDRip`, `HDRip`, `webcam`, `sd` inside words and a real release name.
3. **Dolby Vision profile 7, and speed.**
   - A name that claims Dolby Vision on a Blu-ray or remux ranks and reads as **HDR10** until checked; line 2 says
     `its name says Dolby Vision`.
   - The check reads the profile, and profile 7 plays only where the TV decodes it.
   - A copy faster than 0.7 x Diag's last measured speed goes after every copy that fits (5.0.1).
4. **Older manifests.**
   - Read `extraSupported` and `extraRequired` too.
   - Respect `behaviorHints.countryWhitelist`: lowercase ISO 3166-1 alpha-3; he is in `isl`, from the provider's
     country or the TV's locale.
   - An absent `idPrefixes` means all ids (11.1).
5. **Series numbering.** Episodes are merged only when season and number agree **and** either the names match or the
   lengths are within ±20%. Otherwise they stay separate rows, and add-on copies are asked only by Cinemeta's numbering
   (5.8).
6. **Up next and Continue watching.**
   - A new `need: next` event: the player asks the app for the next episode's copy, so add-on links are resolved when
     needed, not sent at start (8.4).
   - Continue watching stores the copy's identity (source, `bingeGroup`, file name, size), never its link (8.3).
7. **Hand-over on a 1-connection provider.** An automatic hand-over prefers a copy from **another source**. When it
   must go from one provider copy to another, it waits for Diag's existing provider retry (`Diag.closedAt`) (8.2).
8. **The setup card's Install path.** While the setup card is open and he is signed in to Stremio, airglow reads his
   collection every 5 s and moves on when the new add-on appears (3.7, `add-setup`).
9. **Movies paging.**
   - While a page is on its way, the next row is a static skeleton and focus stays put, even under key repeat.
   - A failed page is one inline card with `Try again` (new mock `movies-addon-more`).
   - The full card stays for a first page that fails (`movies-addon-down`).
10. **Catalogs without a stream add-on.** With no enabled stream add-on covering a catalog's type and id prefix, its
    chip shows **only the titles the provider has**, captioned `only titles your provider has`. With none of those
    either, the chip isn't offered, and the sheet row says why (4.2).
11. **Signing out of Stremio** calls `POST /api/logout {type:"Logout", authKey}` before forgetting the key (3.3).
12. **Untrusted intents and text.**
    - `androidTvUrl` is parsed with `Intent.parseUri(…, URI_INTENT_SCHEME)`, then `component` and `selector` are cleared
      and `CATEGORY_BROWSABLE` is added (Chrome's rule) (5.6).
    - All add-on text is escaped: names, descriptions, cast, stream names.
13. **The Wi-Fi page's code** has 6 digits and locks after 5 wrong tries (the screen then shows a new one) (3.5,
    `add-phone`).
14. **Stream links are secrets** like configured add-on links: never logged, and never shown in any toast, diagnosis or
    Check screen (11.3). The audit's SECRET check already catches a long path part in any link on screen.
15. **The confirm says what the add-on sees:** `Northlight sees which films you open.` (`add-confirm`).
16. **"Stream" is off the screen:** `Copies of films and series`, `Copies: films, series`, `rent, buy or subscribe`.
    `stream` is in the audit's JARGON list, which then found it in 5 mocks; all are fixed.
17. **The debrid requirement, in his words**, on `add-ways` and `add-list`: `Copies of films come from add-ons set up
    with a service like Real-Debrid. Add-ons that play torrents directly won't show anything here.`
18. **Cut text.** `add-ways` line 1 is now `Sign in once on your phone. Your add-ons come over`; `add-stremio-found`
    reads `Keep in step / with Stremio`. A new audit check, **CUT**, fails a row in a menu, sheet, panel or list whose
    text an ellipsis cuts. On its first run it found two more (`add-stremio-found`, `state-addon-down`), both fixed.
19. **Order, in words:** `Order: whose details and catalogs come first`.
20. **`add-stremio-found`:** an add-on known to give nothing playable (Public Domain Movies) starts unticked:
    `Add 4 add-ons`.

### Nits (all fixed)

- **One wording per fact:**
  - Public Domain Movies: `A catalog only: its films come as torrents` everywhere;
  - one section caption;
  - `4K · HDR10` in the player as in Copies;
  - `home network`, not "Wi-Fi", on the phone screens.
- **Archivio** reads `Not an add-on any more` (`Opens a web page now`). `Not answering` is kept for timeouts: Kestrel,
  in the same mock.
- **`detail-addon-only`:** dashed tags, no tick (M4); the puzzle glyph sits on the text's baseline.
- **Search** leaves out titles that aren't out yet (Dune: Part Three is replaced by Dune, 1984).
- **`add-list`** opens on Community · Subtitles filtered to his languages, so focus lands on something he can use.
- **Copy keys** are `cp:<source>:<hash of file name + size, or bingeGroup>`. Debrid links change on every request, so
  the link is never the key.
- **CORS:** `CapacitorHttp` is enabled (`capacitor.config.json`), so add-on requests go through the native HTTP stack
  and a missing CORS header never blocks an add-on (11.1).

---

## 0. The firm rule, and the idea in one paragraph

**airglow plays only direct links**: a stream object's `url` with `http:` or `https:`. Debrid services and ordinary
add-ons give these. **Torrent and P2P streams are not supported and never shown**:
- `infoHash` / `fileIdx`, and `magnet:` links;
- everything that needs Stremio's own streaming server: `nzbUrl`, `rarUrls`, `zipUrls`, `7zipUrls`, `tgzUrls`,
  `tarUrls`, any `url` on `127.0.0.1:11470`.

`ytId` (trailers) opens the YouTube app, and `externalUrl` may open another app (5.6). There is no torrent engine and
none is designed here.

**The idea.** An add-on is a web address with a `manifest.json`. airglow keeps an ordered list of them.
- Their **catalogs** become chips on Movies and Series.
- Their **streams** become more **copies** of a title, in the same Copies list as the provider's, ranked by 5.0, with
  Play taking the best.
- Their **subtitles** feed the subtitles design's panel.

Titles are joined across provider and add-ons by **IMDb id**, matched once per provider title and never guessed.
Add-ons are added **without typing**, in one of three ways:
- from the owner's Stremio account (sign in once by scanning a code);
- from Stremio's own list on the TV;
- by sending a link from his phone to a page the TV serves.

## 1. Where it lives (the IA decision)

| Surface | What changes | Mocks |
|---|---|---|
| Account | a new group **Add-ons** under Provider | `acct-addons`, `acct-addon-sheet`, `acct-addon-move`, `state-addon-down` |
| Adding one | a menu of four ways, then the chosen screen; every way ends at one confirm | `add-ways`, `add-stremio-code`, `add-stremio-found`, `add-stremio-email`, `add-list`, `add-phone`, `add-confirm`, `add-setup`, `phone-page` |
| Movies, Series | add-on catalogs as chips after the provider's, past a divider | `movies-addon`, `movies-chip-menu`, `movies-addon-more`, `movies-addon-down` |
| Home | **unchanged** (v1.1, M1) | – |
| Search | a "From add-ons" block after the provider's results | `search-addons` |
| The title page | the Version pill and the Copies menu list add-on copies too; add-on-only titles use the same page | `detail-sources`, `detail-sources-sheet`, `detail-play-wait`, `detail-addon-only`, `detail-copies-likely`, `detail-series`, `detail-match`, `detail-nosources` |
| The player | Quality lists every copy; a failed or placeholder copy hands over; Up next keeps the source | `player-sources`, `player-source-failed`, `player-not-ready`, `player-upnext` |

**Why no add-on tab or Discover page:** the top bar already has 7 destinations, and he doesn't want a second app inside
airglow. He wants better copies of what he watches, so add-ons show up where he already looks: the title page, Movies
and Series, Search and the player.

**Words.**
- In the UI an add-on is an **add-on**; one stream is a **copy** (the subtitles design's word); where a copy comes from
  is its **source** (`Your provider` or the add-on's name).
- *stream, manifest, catalog id, infoHash, debrid, resource, transport, JSON* never reach the screen. The audit's
  JARGON check enforces this; v1.1 added `stream` to its list.
- `manifest.json` appears once, where he is told what a link looks like.
- `Real-Debrid` appears once, as an example of the kind of service add-ons need (M3, S17).

---

## 2. Rules every add-on surface follows

### 2.1 Geometry

| What | Value |
|---|---|
| Account panes | groups x 48, w 200, rows 44 (9 groups fit y 90 to 486); right pane rows end at x 906 (the ring stays inside 912) |
| Add-on row (`.ad-row`) | 52 high, 6 gap, radius 12, surface-1. Logo tile 32 (`.ad-lg`); name Inter 650 16; line 2 Inter 500 14 `text-2`; state at the right, 15 |
| Section line (`.ad-sec`) | 22 high, caps label 14 + plain caption 14 |
| Sheets | right sheet 420 (x 492 to 912, y 27 to 513); centred menus 520 to 640 wide; every floating box inside y 27 to 513 (audit) |
| Copies menu, Which film | the subtitles design's: left 48, 600 / 540 wide, two-line rows 60 (`.lr.ad-two` = `.lr.st-two`), group line `.ad-grp2` |
| Full-screen steps | title y 64 (head 28), steps from y 118 (body 16/24, w 470), QR 200 at x 616 to 912, the wait card at y 420, 64 high |
| Movies chips | the lib chip row (y 122), add-on chips after a 1 x 24 divider (`.ad-cut`); the row scrolls (`.lib-chips.scrolled`) |
| Movies paging card | 864 x 64 at the next row's top, in the scrolled layout (context line at y 27, grid from y 56) |
| Player cards | the hand-over card 560 wide (`.nv-card.ad-fail`); Up next 400 at the right, 84 above the bottom |
| Phone page | one column for a 360 px wide phone (drawn at 264 in the mock), text 14 and up, buttons 44 high |

### 2.2 Focus and keys (on `focus.js` as it is)

- **Containers:**
  - `[data-col]`: the Account list and every sheet or menu list;
  - `[data-row]`: Movies' chip row;
  - Stremio's add-on list: a `[data-col]` under a `[data-row]` of chips.
  - No new hook is needed.
- **Rings:**
  - list rows use the ring only, no scale (`f-ring`);
  - buttons and posters use the ring and the 1.05 lift, the first of a row lifting from its left edge.
- **One ring:** when a sheet or menu opens, the opener loses its ring.
- **Hold OK** (500 ms) on an add-on row or an add-on chip opens a menu with the harmless item first.
- **Back** closes a sheet or menu and restores the opener. From the Add-ons list it goes to the group, then the avatar,
  then leaves.
- **Identity keys** (`data-key`), which data arriving never moves focus away from:
  - add-on rows `ad:<hash of transportUrl>`;
  - catalog titles `t:<type>:<imdb id or add-on id>`;
  - copies `cp:<source>:<hash of file name + size, or bingeGroup>`.

### 2.3 Icons (new; same 24 grid and 2 px stroke as `util.js`)

- **New:** `puzzle` (an add-on), `phone`, `link`, `keys` (the keyboard), `ext` (opens another app), `x`.
- **Reused:**
  - the provider mark on posters is the `tv` glyph;
  - the checked tick and the dashed name tag are the subtitles design's;
  - the "!" disc is the diagnosis design's, in chalk (never red, never amber).

### 2.4 Port notes (selectors)

- The mocks mark focus with `.f` / `.f-ring` / `.f-in`; the app uses `:focus` on `.fx`.
- Add to the ring-only list in `app.css`: `.ad-row.fx:focus, .ad-lr.fx:focus`.
- These classes are the subtitles design's under my prefix, so neither folder depends on the other:

  | Mine | Theirs |
  |---|---|
  | `.ad-tk` | `.st-tk` |
  | `.tag.ad-ok`, `.tag.ad-name` | `.tag.st-ok`, `.tag.st-name` |
  | `.ad-copies` | `.st-copies` |
  | `.ad-match` | `.st-match` |
  | `.ad-two` | `.st-two` |

  **Port one set** (theirs).

---

## 3. Account > Add-ons

### 3.1 The list (`acct-addons`)

| Row | Line 1 | Line 2 | Right |
|---|---|---|---|
| Add an add-on | `Add an add-on` | `From your Stremio account, Stremio's list, or your phone` | `+` |
| (section) | `INSTALLED · 7` | `Order: whose details and catalogs come first · synced with Stremio 21:02` | – |
| each add-on | its `manifest.name` (escaped) | what it gives (3.1.1) | its state (3.1.2) `›` |

**3.1.1 What it gives**, built from `resources` and `types`, then corrected by its answers:

| Line 2 | When |
|---|---|
| `Copies of films and series` | it has a `stream` resource |
| `Subtitles for films and series` | it has a `subtitles` resource |
| `Catalogs and details · Popular, New, Featured` | it has catalogs; their first 3 names |
| `Where else to watch it: rent, buy or subscribe` | its streams have all been `externalUrl` with `androidTvUrl` |
| `Extras: notes about films` | its streams have all been info (M3) |
| `A catalog only: its films come as torrents` | every stream it sent was dropped by rule 0 |

An add-on that sends only info or other-app links is **never waited for before Play** (RANKING.md 3.1).

**3.1.2 States:**
- `On`;
- `Off` (the row is dimmed);
- `Catalog only`;
- `Needs setup`;
- `Not answering` (timeouts, with the "!");
- `Not an add-on any more` (it answers, but not with an add-on, with the "!");
- `Checking…` (the first read of its manifest).

| Key | On the list |
|---|---|
| OK | Add an add-on: the four ways (3.2). An add-on: its sheet (3.1.3) |
| Hold OK | `Move` (focused) · `Turn off` / `Turn on` · `Set up again on your phone` (configurable only) · `Remove from airglow` |
| ▲▼ | rows; the list scrolls by whole rows, the focused one keeps a row of margin |
| Back | the Add-ons group, then Account's rule |

Entry focus: the first add-on (or `Add an add-on` when there are none).

**3.1.3 An add-on's sheet** (`acct-addon-sheet`, right 420).
- **Head:** logo 56, the name, `Version 3.0.14 · from your Stremio account`, what it gives as chips.
- **Rows:**
  - `Use this add-on` (a switch; focused);
  - **`Catalogs · chips in Movies and Series`**: one switch per catalog (`Popular movies / A chip in Movies`; Cinemeta's
    New reads `this year first`, because its genre is required and is a year), where OK toggles;
  - `Move up or down`;
  - `Set it up again on your phone` (configurable only);
  - `Remove from airglow`.
- For an add-on from Stremio the remove row reads `Hide in airglow` / `It stays in your Stremio account`.
- **Catalogs that are never listed:** those with a required extra other than `genre` (Cinemeta's `last-videos`).
- **Search-only catalogs** read `Used by Search`, with no switch.
- **A catalog no stream add-on covers** reads `Only titles your provider has` (S10).
- **Defaults (v1.2):** the first two catalogs of each type per add-on start on, the rest off (Cinemeta: Popular and New
  on, Featured off). Search-only catalogs are always used by Search.

**3.1.4 Move** (`acct-addon-move`): the Saved reorder model.
- The row lifts (ring, 1.02), the grip arrows show and the right side says `2 of 7`. ▲▼ move it, OK drops, Back puts it
  back.
- **Order decides** whose details win for a title, the order of catalog chips, and the tie-break between equal copies
  (RANKING.md 2, key 12).

### 3.2 Adding one: the decision (`add-ways`)

OK on `Add an add-on` opens a centred menu of four ways, the first focused and marked `Easiest`:

| Way | For | Typing |
|---|---|---|
| **Use your Stremio account** | everything, including add-ons set up on a web page; stays in step | none on the TV; he signs in on the phone |
| **Pick from Stremio's list** | add-ons that need no setup | none |
| **Send a link from your phone** | one set up on a web page, without a Stremio account | none on the TV |
| **Type the link** | the last resort | the TV keyboard |

The menu's foot says, in his words: `Copies of films come from add-ons set up with a service like Real-Debrid. Add-ons
that play torrents directly won't show anything here.`

**Why these, and not a hosted airglow page or a short code:**

| Option | What it needs | Privacy of the add-on link (it holds his debrid key) | Verdict |
|---|---|---|---|
| An airglow page hosted somewhere (GitHub Pages) | a static page can't reach the TV; it needs a **relay server** we'd run forever | the relay sees every link | no |
| A short code (type 6 letters on the phone) | the same relay | the same | no |
| **The Stremio account** (verified, 11.2) | nothing of ours: Stremio's own TV sign-in and add-on list | Stremio already holds it | **first** |
| **A page the TV serves on the home network** | about 200 lines of Java in `TunerPlayerPlugin`, only while the screen is open | never leaves the house | **second** |

- **The Stremio account is first** because it *is* "Stremio's system". A configurable add-on (most debrid ones) is set
  up on its own web page, whose **Install** button puts it in the Stremio account, and airglow then picks it up.
- **The home-network page** is for an owner without a Stremio account. It is also the page the first-run "Use your
  phone" sign-in was designed around (UI-SPEC 5.1) and never built.

### 3.3 Use your Stremio account (`add-stremio-code`, `add-stremio-found`, `add-stremio-email`)

**The code screen.**
1. airglow calls `GET https://link.stremio.com/api/v2/create?type=Create`. Verified: it returns `code` (4 characters),
   `link` (`https://link.stremio.com/<code>`) and `qrcode`.
2. The screen shows the steps, the QR of `link`, and the code in four 52 x 60 tiles.
3. The phone opens the link, which redirects to `stremio.com/login?code=…` (verified), and he signs in any way Stremio
   allows.
4. airglow asks `GET …/api/v2/read?type=Read&code=<code>` **every 3 s**.
   - While nobody has signed in it answers `{"error":{"code":101,"message":"Invalid or expired token"}}` (verified).
   - Success is `{"result":{"authKey":"…"}}` (stremio-core's `LinkAuthKey`).
5. After 10 min a new code is created and shown.

On the screen:
- The wait card reads `Waiting for you to sign in` / `airglow reads your add-on list. It never changes your Stremio
  account.`
- Focus is on the one button, `Use email and password`.
- Back returns to the four ways.

**What it reads.** `POST https://api.strem.io/api/addonCollectionGet` with
`{"type":"AddonCollectionGet","authKey":"…","update":true}` returns `result.addons[]`, each
`{ transportUrl, manifest, flags }` (verified with no key). airglow never calls `addonCollectionSet`.

**Your Stremio add-ons** (`add-stremio-found`).
- `8 in your account. airglow can use 5 of them.`
- A check row per usable add-on. **One known to give nothing playable starts unticked** (S20).
- Then one sentence names the ones left out, and why:

| Left out | Why (on screen) |
|---|---|
| a `transportUrl` ending `/stremio/v1` (the old OpenSubtitles) | `an older kind of add-on; v3 does the same` |
| `http://127.0.0.1:11470/…` (Local Files) | `needs the Stremio app on this TV` |
| `ipfs://`, `ipns://` | `a kind of link airglow can't open` |
| only `channel` / `tv` types (YouTube) | `channels aren't in airglow yet` |

- At the right: `Keep in step / with Stremio` (a switch, on) and `Add 4 add-ons` (focused).

**Keeping in step.**
- With the switch on, airglow reads the collection at every cold start and whenever Account > Add-ons opens (at most
  once a minute). While the setup card is open it reads every 5 s (3.7).
- **New** add-ons are added at the end, with a toast `Comet came from your Stremio account`.
- **Removed** ones are removed here if they came from Stremio.
- airglow's own choices (off, order, catalog switches) are kept **by `transportUrl` hash** (S1) and survive every sync.
  If an address changes but the manifest id, host and a newer version say it's the same add-on, the choices move over.
- **The same add-on set up twice** (two links, one manifest id) is two add-ons. The second gets a short label after its
  name everywhere it shows: the debrid service when its link or name says it (`Torrentio · RD`), else `· 2`.
- `{"error":{"code":1,"message":"Session does not exist"}}` (verified for a bad key) means he was signed out. The
  section line reads `Stremio signed you out · Sign in again ›`, and the add-ons stay as they were.

**Email and password** (`add-stremio-email`).
- `POST https://api.strem.io/api/login` with `{"type":"Login","email":…,"password":…}`; success is
  `{result:{authKey,user}}` (stremio-core's `AuthResponse`).
- Errors go under the field that caused them, in chalk with the "!" disc:
  - `{"error":{"code":2,"message":"User not found","wrongEmail":true}}` (verified) reads `No Stremio account uses this
    email`;
  - any other error shows its `message` under the password.
- A side card: `Signed up with Google, Apple or Facebook? Those accounts have no password here. Use the code instead.`

**The key.**
- The `authKey` is stored like the provider's password: scoped storage, never logged, never on screen.
- **Sign out** first calls `POST /api/logout {"type":"Logout","authKey":…}` (S11), then forgets the key, and offers
  `Keep the add-ons` (focused) / `Remove them too`.

### 3.4 Pick from Stremio's list (`add-list`)

- Cinemeta's `addon_catalog` resource is Stremio's own list: `/addon_catalog/all/official.json` (7) and
  `/addon_catalog/all/community.json` (97), verified.
- A pushed screen with the chips `Official · Community | Catalogs · Subtitles · Extras`.
  - **Subtitles leaves out add-ons for other languages only (v1.2):** a subtitle add-on whose name or description names
    a language and none of his (Account > Languages), nor "your language" / "40+ languages", is left out. Manifests
    don't declare subtitle languages, so this is a rule on their text. On the real list it leaves out 19 of 44, and the
    header says so (`19 for other languages left out`).
  - **Extras** are the community stream add-ons that give info, not copies (M3).
- Under the chips: `Copies of films come from add-ons set up with a service like Real-Debrid, not from this list.`

| Right side | When | OK |
|---|---|---|
| `+ Add` | no setup needed | the confirm (3.6) |
| `✓ Added` | already in the list | its sheet |
| `[phone] Set up on your phone` | `behaviorHints.configurationRequired` | the setup card (3.7) |

- Rows keep Stremio's order and show the manifest's own description, one line with an ellipsis (HTML stripped).
- Entry focus: the first row.

### 3.5 Send a link from your phone (`add-phone`, `phone-page`)

- **When the server runs:** the TV starts a tiny HTTP server **only while this screen or the setup card is open**, on
  port 8790 of its address on the home network (Wi-Fi or Ethernet). It closes after 10 minutes, or on Back.
- **The QR** holds `http://<tv-ip>:8790/<token>` (16 random characters). The screen also prints the address and a
  **6-digit code** (`482 193`), which the page asks for when the token is missing. **5 wrong codes lock it**, and the
  screen then shows a new one (S13).
- **The page** (one HTML asset in the APK, `phone-page`): `Send to your TV`, a paste field, `Send to the TV`, and `Or
  set one up` buttons for add-ons waiting for setup.
  - It POSTs `{ url }` (under 2 KB) and the TV answers `Sent`.
  - It accepts only `http(s)://…/manifest.json` and `stremio://…/manifest.json` (rewritten to `https://`).
- **Nothing is added on the phone's word**: the TV shows the confirm (3.6).
- The link travels on the home network in plain http, the same trust as the first-run phone sign-in.
- **Focus:** `Type the link instead`.

### 3.6 Before adding: what it gives (`add-confirm`)

Every way in ends here. airglow fetches `<base>/manifest.json` (6 s), then shows the logo, `Add Northlight?`, where it
came from, what it gives as chips, and these lines:

| Manifest says | Line |
|---|---|
| (always) | `Northlight sees which films you open.` (S15) |
| a config part in the link, or `configurable` | `Its link holds your account details, so airglow keeps it private and never shows it in full.` |
| `behaviorHints.p2p` | `It says it uses torrents. airglow shows only its direct links.` |
| `behaviorHints.adult` | `It says it has adult content.` (`Cancel` is focused, not `Add it`) |
| only types airglow doesn't show | `airglow doesn't show what it gives yet.` (no `Add it`) |

- The buttons: `Add it` (focused, unless adult) / `Cancel`.
- A link that isn't an add-on gets `That link isn't an add-on`, with what came back in plain words (`a web page`,
  `nothing`), and `Try another`.

### 3.7 An add-on that needs setting up (`add-setup`)

- **When:** the add-on has `configurationRequired`, or he chose `Set it up again`.
- **Where the setup happens:** on the add-on's own page, `<base>/configure` (Stremio's rule).
- **The card:** a centred card whose QR opens **airglow's** phone page in its setup state (`phone-page`, middle), with
  `Open its setup page` and a paste field.
- **Two ways it finishes:**
  - the add-on page's **Install** puts it in his Stremio account; while the card is open and he is signed in, airglow
    reads the collection every **5 s** and moves on when it appears (S8);
  - **Copy link**, then paste it on airglow's page and send.
- The wait line reads `Waiting for your phone or your Stremio account · Back cancels`. Nothing is focusable.

---

## 4. Catalogs

### 4.1 Home

Unchanged (v1.1, M1). Add-on catalogs don't appear on Home.

### 4.2 Movies and Series (`movies-addon`, `movies-chip-menu`, `movies-addon-more`, `movies-addon-down`)

**The chips.**
- The provider's chips stay first: All, New in English, Top rated, 4K, genres.
- Then a 1 x 24 divider, then one chip per catalog that is switched on: `Popular  Cinemeta` (the name, then the add-on
  in `text-3`). A catalog with no `name` is named by its add-on (Public Domain Movies, verified).
- The row scrolls sideways.

**On an add-on chip.**
- The grid is that catalog in **its own order**, captioned `Popular from Cinemeta · [tv] also on your provider`.
- **Sort and Jump go.** **Filters becomes `Genre`**, with the catalog's own `extra.genre.options` (one at a time, unless
  `optionsLimit` > 1).
- A catalog whose genre is required (Cinemeta's New: id `year`, 107 options that are years, verified) opens on its
  first option.

**Hold OK on an add-on chip** (`movies-chip-menu`): `Hide this chip` (focused; it comes back from the add-on's sheet),
or `Cinemeta's catalogs` (opens the sheet).

**Paging** (S9).
- The next page is asked for when focus reaches the last 2 rows, with `skip=<titles received so far>`.
- It stops when a page is empty or brings only titles already shown. Cinemeta sends 49 or 50 a page (verified), so
  neither the SDK's "100" nor its "fewer means the end" holds.
- **On the way:** the next row is static surface-2 blocks, and focus stays where it is, even under key repeat.
- **Failed** (`movies-addon-more`): one inline card in the scrolled layout, `Cinemeta didn't send the next page / The
  titles above stay. ▼ to try again`, with `Try again`.

**Posters.**
- The meta's `poster`, with the `[tv]` mark when the provider has the title (a Sure or Likely match, RANKING.md 4), and the
  provider's 4K tag when it has a 4K copy.
- **Without a stream add-on** covering the catalog's type and id prefix, the chip shows only the titles the provider
  has, captioned `only titles your provider has` (S10).

**Not answering** (`movies-addon-down`): the first page didn't come.
- The card: `Cinemeta isn't answering` / `Its catalogs come back when it does. Your provider's movies are all still
  here, under All.`
- `Try again` (focused) / `All movies`.

### 4.3 Details for add-on titles

- An add-on title's page uses the first enabled add-on (in order) that has `meta` for its id prefix; for `tt` that is
  Cinemeta.
- **Fields used:** `name, releaseInfo, description, runtime, genres, cast, director, imdbRating, background, logo,
  videos[], trailerStreams[]`.
- Cinemeta sends HTML entities (`Judith O&apos;Dea`, verified): decode them, then escape them for display (S12).

### 4.4 The IMDb match

Written once, in `design/ui-v1/copies/RANKING.md` 4 (series in 4.3), shared with the subtitles design.

---

## 5. The title page

### 5.0 The copy ranking, the Play wait and the IMDb match: `design/ui-v1/copies/RANKING.md`

**One file for the whole app.** The ranking (its section 2), the one wait before Play (3), the IMDb match (4,
including series in 4.3), not-ready copies (2.2), dubs (5) and reading a copy's name (6) are written **only there**.
This spec has no list of its own. Port `defaultVersion()`, the wait, `matchLevel()` and `readName()` from
`design/ui-v1/copies/copies.js`. If anything here seems to disagree with RANKING.md, RANKING.md wins.

**What stays here, because it is about add-ons:**
- **Who is asked** and when (5.4). Info-only and other-app-only add-ons, and Not answering ones, are never waited for
  (3.1.1; RANKING.md 3.1).
- **Add-on links are never opened before Play** (RANKING.md 2.1): asking an add-on only reads its list of streams. An
  add-on copy is checked as it starts.
- **How the bands look:**
  - band c (an add-on copy whose match isn't Sure) is the Likely group in the Copies menu (5.2);
  - band e (failed or not ready) is dimmed at the bottom, with `wasn't ready yet` / `didn't play on this TV`.
- **The wait on screen** (RANKING.md 3.2): the button reads `Playing in 3 s`, and the caption `Looking for a better copy
  · OK plays this one now · Back stops` sits on the Play button's row, after Save. The pill-row slot meanwhile says who
  is still asking (5.1).
- **The match picker** is the shared "Which film is this?" (`detail-match` in both folders). Its None-of-these line is
  `Keep this copy only: no add-on copies, no downloaded subtitles`.

### 5.1 The Version pill names the best copy (`detail-sources`)

- **What it says:** the best copy and its source, by RANKING.md 2: `[film] 4K Blu-ray · Northlight · best of 9 ▾`. With
  only the provider: `[tick] 1080p · Your provider`. On a series: the copy for the episode Play would play (`· S3 · E4`).
  It shows with 2+ copies, or with 1 while a stream add-on is still asking.
- **Ticks:** an add-on copy has no tick and dashed meta tags until it has played (M4). Provider copies follow the
  subtitles design's ticks.
- **Progressive:**
  - stream add-ons are asked when the page opens (5.4);
  - right of the pills, in **the pill-row slot** (`.st-side`, to x 912 at most, ellipsis as a last resort), one text by
    priority: **1** the time left (as `detail.js` today), **2** `[spinner] Still asking Kestrel`, until the last add-on
    answers or times out, **3** the subtitles design's text;
  - the pill updates in place, focus never moves, and Play is focused on entry.
- **The wait caption** never uses the slot: it is on the Play button's row (5.0).

### 5.2 The Copies menu (`detail-sources-sheet`, `detail-copies-likely`)

OK on the pill opens the subtitles design's menu (`Copies of …`, `Always the best copy` first and focused, two-line
rows, a `Best` tag), with every copy from every source in **one** list, in RANKING.md's order. In the mock that is
**B, A, N, P** (F is below the fold): RANKING.md 8.

| Row | Line 1 | Line 2 |
|---|---|---|
| Always the best copy | `Always the best copy` | `Now: 4K · Blu-ray · Northlight. Changes if a better copy shows up` |
| an add-on copy (unchecked) | `4K · HDR10 · Blu-ray` | `Northlight · its name says Dolby Vision · English · 51.6 GB` |
| another add-on copy | `1080p · Blu-ray` | `Northlight · the name says · English · 14.2 GB` |
| a provider copy (checked) | `[tick] 1080p · 7.1 Mb/s` | `Your provider · named 4K · English · 6.1 GB · “EN| Dune: Part Two 4K”` |
| a Likely match | under `FROM ADD-ONS · MIGHT BE ANOTHER FILM`: `4K · HDR10 · web copy` | `Northlight · for The Invite (2026) · the name says` |
| still looking | spinner, `Kestrel is still looking` | `Its copies join this list as they come` |
| other apps | `[ext] Watch in another app` | `HBO Max, Prime Video and 6 more · WatchHub` (5.6) |
| trailer | `[play] Trailer` | `Opens YouTube` |

- **The header's right side:** `matched on IMDb · 9 so far`, or `matched by name and year` (Likely).
- **The foot** (shared): `Mb/s is the picture's share. Picking a copy keeps it for this film.` Below it, out of view,
  are 4 more copies, Watch in another app and the trailer.
- **Picking a Likely copy** (band c) makes the match Sure for this title, so it ranks on equal terms from then on. The
  Likely menu's foot says so: `…, and tells airglow it's the same film`.
- **A copy that failed** or wasn't ready this session sits at the bottom, dimmed: `wasn't ready yet` / `didn't play on
  this TV`.
- **Line 2 in words:** the source (bold), then the problem or `the name says`, then language and size; a provider row
  ends with the provider's name in quotes. An add-on's file name is never shown (it is jargon).

### 5.3 Ranking

RANKING.md 2.

### 5.4 Asking add-ons (progressive)

- **When:**
  - on entering a title page (a film: its id; a series: the episode Play would play);
  - on focusing an episode for 1 s;
  - on Home, for the first Continue watching card.
- **Cache:** answers are kept 30 min (debrid links expire).
- **Who:** every enabled add-on whose `resources` include `stream` (a string, or an object with its own `types` and
  `idPrefixes`) for this type and id prefix; an absent `idPrefixes` matches all ids (S4).
- **How many:** all at once, and at most 6 add-on requests in the air app-wide.
- **Time:** 10 s each.
- **Country:** a stream whose `behaviorHints.countryWhitelist` doesn't include his country is dropped. His country is
  the TV's own region (Android Settings), never the provider's; when it's unknown, nothing is dropped (v1.2).
- Asking only reads the add-on's list of streams: no stream link is opened (M4).

### 5.5 Play while an add-on is still looking (`detail-play-wait`)

RANKING.md 3, drawn as 5.0 says.

### 5.6 Other apps, info and trailers (M3)

**What becomes "Watch in another app"**: `externalUrl` streams that have an `androidTvUrl`, or whose host is a known
streaming service (WatchHub's are both, verified: `Amazon Video · Rent, Buy`, with `intent://…`). They are one row,
which opens a menu (`HBO Max · Subscription`, `Prime Video · Rent, buy`).

**Opening one (S12):**
1. `Intent.parseUri(androidTvUrl, URI_INTENT_SCHEME)`;
2. clear `component` and `selector`, add `CATEGORY_BROWSABLE`;
3. `startActivity`;
4. if nothing takes it, `That app isn't on this TV`.

There is no browser fallback: the Google TV usually has none.

**Other links and text:**
- `stremio:///detail/{type}/{id}` links (Watch Next sends ten for one title) become cards in **More like this**: at
  most 10, the title itself and duplicates dropped, each opening airglow's own page for that id. Never in Copies. Other
  `stremio://` links are dropped.
- **Info-only answers** (an `externalUrl` to a web page, or no link at all, as AfterCredits sends) go to the full
  description sheet as one line per add-on: `AfterCredits: No stingers found`.
- **Trailers:** `ytId` opens `vnd.youtube:<id>`.

### 5.7 A title only add-ons have (`detail-addon-only`)

- The same page: details from 4.3, copies from stream add-ons, More like this from the provider's titles and the
  catalogs' (by shared genres).
- One quiet line: `[puzzle] Not on your provider · details from Cinemeta`.
- Tags are dashed until a copy has played (M4).

### 5.8 Series (`detail-series`)

- **Episodes are the union** of the provider's `get_series_info` and the meta's `videos[]` (id `tt…:s:e`, season 0 =
  `Specials`, verified on The Bear).
- **Sure for a series:** RANKING.md 4.3 (his pick, TMDB or TVDB ids, or 2 of the first 3 checked episodes within 8%).
  The Bear is Sure by its TVDB id (403294). An odd-length episode gets its own note, never the series.
- **Merging (S5):** a provider episode and a Cinemeta episode are one row only when the season and number agree **and**
  either the names match (normalised) or the lengths are within ±20%. Otherwise they stay separate.
  - A provider episode with no Cinemeta twin gets no add-on copies.
  - An add-on episode with no provider twin is marked `[puzzle] Add-on`.
  - This is the subtitles design's "this episode's number doesn't match IMDb" case.
- **Not out yet:** an episode whose `released` is in the future shows its date and can't be played.
- The focused episode's best copy sits at the right of its one-line summary.

### 5.9 No copy to play (`detail-nosources`)

- **The real case:** Public Domain Movies answers *Night of the Living Dead* with an `infoHash` only (verified), and the
  provider doesn't have it.
- **One line** names each add-on and why: `No copy to play. Public Domain Movies has it only as a torrent, which airglow
  doesn't play. Northlight found nothing.`
- Play is replaced by `Look again` (focused), next to Save.

---

## 6. Search (`search-addons`)

- **The provider first**, instant, as today.
- **From add-ons:** every enabled catalog with a `search` extra, asked after **3 letters and a 600 ms pause**, one
  request per catalog. The heading: `FROM ADD-ONS  Cinemeta · 11 more below`.
- **Rows:** name, kind, year, plus a director or a note.
- **Left out:**
  - titles not out yet (a `releaseInfo` year in the future, or `released` in the future);
  - titles the provider has: they stay in the provider's block, with `4K from Northlight` when that is their best copy.
- **States:**
  - asking: the heading's caption is a spinner and `Cinemeta…`;
  - no answer: `Cinemeta didn't answer`;
  - no results: no heading.
- **Keys:** Right from the keyboard enters the results; ▼ past the provider's block enters the add-on block.

---

## 7. Subtitles from add-ons (plugs into `design/ui-v1/subtitles/`)

The subtitles design owns the Subtitles sheet, the player's Subtitles panel, timing, checks and defaults. This design
widens "OpenSubtitles" to **every subtitle add-on**.

- **Who is asked:** every enabled add-on with the `subtitles` resource for the type and id prefix, in order, all at
  once, 8 s each.
- **The request:** `/subtitles/{type}/{id}.json`, or with the copy's details:
  `…/subtitles/movie/tt15239678/filename=<behaviorHints.filename>&videoSize=<videoSize>&videoHash=<videoHash>.json`
  (OpenSubtitles v3 answers this form, verified). For an add-on copy these come from the stream object, so no link is
  opened (M4).
- **The answer:** `subtitles[]` of `{ id, url, lang, label? }`.
  - `lang` is ISO 639-2 and may be regional (`pob`, verified).
  - OpenSubtitles adds `movieReleaseName` and `fpsMilli`, which the subtitles design uses (a release = `movieReleaseName`
    without its HI tokens, per its review).
- **Groups in the player:**
  - subtitles inside a stream object (`stream.subtitles[]`) are a group `With this copy`, first;
  - then one group per add-on, `FROM <ADD-ON NAME>`, in add-on order.
- **Down or slow:** the subtitles design's states, naming the add-on.

---

## 8. Playback (native: `PlayerActivity`, `player.js`, `Diag`)

### 8.1 What the player gets

`vodEntry()` gains, for an add-on copy:

| Field | From | Use |
|---|---|---|
| `url` | `stream.url` (http/https only) | cross-protocol redirects are already on (debrid links redirect) |
| `headers` | `behaviorHints.proxyHeaders.request` | set on this entry's own `DefaultHttpDataSource.Factory`; a `User-Agent` here wins over Account's |
| `mime` | `behaviorHints.filename`'s extension, else the link's | a `MimeTypes` hint for `.mkv`, `.mp4`, `.ts`, `.m3u8` |
| `source` | `provider` or the add-on's name | the title block's line; **Diag's wording and checks (M6)** |
| `copies` | the next 5 in rank order, **as identities** (`cp:` key, source, label), not links | 8.2: the app resolves the link on `need: copy` |
| `binge` | `behaviorHints.bingeGroup` | 8.4 |
| `key` | the IMDb id (`tt…` or `tt…:s:e`) | progress, 8.3 |
| `runtime` | for a film, Cinemeta's `runtime`; for an episode, the provider episode's own length (else none) | the not-ready rule, RANKING.md 2.2 |

`proxyHeaders.response` and `notWebReady` are ignored: they exist for Stremio's own server and web player.

### 8.2 A copy that fails, or isn't ready (`player-source-failed`, `player-not-ready`)

- **Before the first frame** (an HTTP error, a timeout, a decoder error, Dolby Vision profile 7 on a TV that can't):
  the next copy starts at once, with a toast `That copy didn't play · trying 4K · Dolby Vision · Northlight`.
- **Not ready** (RANKING.md 2.2): a film under 50% of IMDb's runtime; an episode under 50% of the provider episode's
  length, else under 3 min; or the add-on's marker. The card reads `That copy isn't ready
  yet` / `Northlight sent a short "still downloading" clip instead of the film.` No progress is saved; it is not
  "watched"; the next copy plays in 3 s.
- **After it played**, once the player's retries are spent: `This copy stopped at 1:12:40` / `Northlight stopped sending
  its 4K Dolby Vision copy. Your place is kept.`
  - The card shows the next best with a 3 s ring, and where it starts (`starts at 1:12:30`, 10 s back).
  - Buttons: `Play it now` (focused) / `Choose another`. Hint bar: `OK Play it now · ◀ ▶ Move · Back Stop`.
- **Which copy is next (v1.2):**
  - **a source-wide failure** (a timeout, 5xx, refused, "stopped sending"): the next in rank from **another source**. In
    `player-source-failed` that is the provider's 1080p, though Northlight's 1080p ranks above it;
  - **a failure of one copy** (a placeholder, a decoder or profile it can't play): simply the next in rank, even from the
    same add-on (`player-not-ready`);
  - **a Wi-Fi or internet cause from Diag:** re-rank with the speed Diag just measured (RANKING.md band b) and take the
    best copy that fits, not the next 4K;
  - going from one provider copy to another waits for Diag's provider retry first, so a 1-connection account isn't
    refused.
- **At most 3 automatic hand-overs** per play; then the card lists the copies left.
- **With Diag (M6):** for a copy whose `source` isn't the provider, Diag skips the Xtream account and connection-limit
  causes and names the add-on (`Northlight refused this copy`, `Northlight isn't answering`). The hand-over card wins;
  a Wi-Fi or internet cause becomes its first line (`Your Wi-Fi is too slow for this copy`).
- **Live TV never hands over** (UI-SPEC 6: the score delay).

### 8.3 Continue watching across copies

- Progress is kept by **title** (`key`), whenever the title has one; provider-only titles keep today's key.
- **What is stored (S6):** the copy's identity (source, `cp:` key, `bingeGroup`, file name, size), never its link.
  Resuming asks the add-on again and picks the same identity, or the best.
- **Resuming on another copy** starts 10 s earlier. Copies of a different cut resume at the same fraction, with a
  toast.
- A not-ready copy saves nothing (8.2).
- **The first time** progress moves to the IMDb key, today's per-version progress is copied over.

### 8.4 Up next keeps the source (`player-upnext`)

- **Soon after an episode starts** (5 s after its first frame; it was 2 minutes before the end, then halfway, and the
  credits' Up next came too late or not at all), the player sends **`need: next`** (S6), again while nothing is lined
  up, and at once when he asks for the next one. The app asks for the next episode's copies and answers with
  `queue-next {entry}` (PORT-NATIVE.md 3). Every add-on episode knows its series' episodes: the series page's, or
  Cinemeta's by the series' IMDb id (Continue watching, Home's cards and rows).
- **Nothing lined up at the end** (slow add-ons, no copy yet): the end card names the next episode and OK gets it;
  only the series' last episode (or Back) closes the player.
- **The pick:** the copy with **the same `bingeGroup`**; a provider episode's group is `provider`.
- **The card** says `Same source: Northlight 4K`; with no match it takes the best and says `Best copy: 1080p · Your
  provider`.
- **Today's `queue`** of provider episodes, with their links up front, stays as it is.

### 8.5 Quality in the player (`player-sources`)

- Options > Quality is the subtitles design's panel, **384 wide** while a film plays, with each copy's source on line 2
  and `playing` on the current one.
- The playing add-on copy has its tick (it was checked as it started); a failed one is last and dimmed.
- Same order as the title page.

---

## 9. States

| State | Where | What it says / does |
|---|---|---|
| Add-on slow | title page, Search | `Still asking Kestrel` until 10 s; later copies join the list |
| Add-on returns nothing | title page | named only when nothing came at all (5.9) |
| Only torrents | title page, Account | 5.9's line; after 20 titles with nothing playable: `Catalog only` |
| Only info or other apps | Account, Copies | `Extras: notes about films` or `Where else to watch it…`; never asked during the Play wait |
| Not answering | Account (`state-addon-down`, 23:10) | timeouts, 3 in 10 min: `Not answering` with the "!", `No answer in 10 s, 3 times since 22:40 · tries again 23:40`; not asked for 30 min, and never waited for |
| Not an add-on any more | Account (`state-addon-down`) | it answers, but not with JSON (Archivio, real): `Opens a web page now · last worked Sat 24 Oct`; after 7 days, `Remove it ›` |
| Catalog down | Movies | the first page: the card (`movies-addon-down`); a later page: the inline card (`movies-addon-more`) |
| Needs setup | Account, the list | `Needs setup` / `Set up on your phone` → 3.7 |
| Stremio sign-in | code screen | an expired code: a new one, with `The last code ran out. Here's a new one`; no network: `Can't reach Stremio · Try again` (focused) |
| Stremio signed out | Account | 3.3 |
| Phone can't reach the TV | phone screen | after 60 s with no visit: `Phone not getting through? It must be on your home network, not a guest network.` |
| Phone code guessed wrong 5 times | phone screen | `Too many wrong codes · here's a new one` |
| The provider also has it | everywhere | one card, the provider's page, add-on copies in its Copies list (gated by RANKING.md 4) |
| Likely match | Copies | `From add-ons · might be another film` (`detail-copies-likely`) |
| Unsure match | title page | the pill's caption and the shared picker (`detail-match`) |
| Not ready yet | player | 8.2 (`player-not-ready`) |
| No internet | everywhere | the app's Offline bar; catalogs and copies come from their caches |

---

## 10. The spoiler shield

**For now, one rule.** Any add-on video whose name names a hidden game's teams follows catch-up 5.8 masking wherever it
appears (Search, Movies chips, the Copies menu): airglow's name and art, no size, no length.

**Later (M7).** Finding add-on replays for catch-up's `replaySources(g)` needs a real NBA replay add-on to design
against. Such an add-on would most likely use type `tv`, `channel` or `other`, with its own id prefix, which 3.3 leaves
out today. Open question 7.

---

## 11. Data and protocol (what I verified, 27 Oct 2026)

### 11.1 The requests

| Resource | URL | Notes |
|---|---|---|
| manifest | `<base>/manifest.json` | `base` = the add-on link without `/manifest.json`; a configured add-on's base holds its settings |
| catalog | `<base>/catalog/{type}/{id}.json` | extras in the path, `/catalog/{type}/{id}/{k=v&k=v}.json`, values `encodeURIComponent`ed (`genre=Sci-Fi&skip=50` verified). Read `extra[]` **and** the older `extraSupported` / `extraRequired` (Cinemeta sends both, S4) |
| meta | `<base>/meta/{type}/{id}.json` | an unknown id answers a meta with no name (verified): treat as none |
| stream | `<base>/stream/{type}/{videoId}.json` | films: the IMDb id; episodes `tt…:s:e` |
| subtitles | `<base>/subtitles/{type}/{id}[/{extras}].json` | 7 |
| addon_catalog | `<base>/addon_catalog/{type}/{id}.json` | 3.4 |

- **`idPrefixes`** on the manifest or on an object resource narrows which ids an add-on is asked for; absent means all
  (S4).
- **CORS:** every route must send `Access-Control-Allow-Origin: *` (protocol doc), and all I tried do. Requests go
  through `core.js` `fetchT`, which with `CapacitorHttp` enabled (`capacitor.config.json`) runs on the native HTTP
  stack, so CORS never blocks an add-on.

### 11.2 Verified, with timings from this sandbox (one request each; `data.json` `log`)

| What | Found |
|---|---|
| Cinemeta manifest | `com.linvo.cinemeta` 3.0.14. Resources `catalog, meta, addon_catalog`; idPrefixes `tt`. Catalogs: `top` (Popular: genre, search, skip); `year` (New: **genre required**, 107 options that are years); `imdbRating` (Featured); `last-videos` and `calendar-videos` (required extras). 244 ms |
| Cinemeta catalogs | a **307 redirect** to `cinemeta-catalogs.strem.io` (search isn't redirected); pages of **49 to 50**; 90 to 600 ms |
| Cinemeta search | `search=dune`: 19 movies, 5 series. 50 ms |
| Cinemeta meta | Dune: Part Two: `moviedb_id 693134`, `runtime "167 min"`, `trailerStreams[].ytId`. The Bear: 47 `videos`, seasons 0 to 5, ids like `tt14452776:3:5`. Cast with `&apos;` entities |
| Images | metahub `poster/small` 34 KB; `background/small` 480 x 270, 19 KB (the review); `medium` about 1 MB |
| OpenSubtitles v3 | `subtitles` only; 89 to 95 files for a film; per-episode ids; the extras form; SRT UTF-8 with CORS. 45 to 250 ms |
| Public Domain Movies | catalog with no `name`; streams are `infoHash` + `fileIdx` only; `cacheMaxAge 604800`, `staleRevalidate`, `staleError` |
| WatchHub | `externalUrl` streams with `name`, `title` and `androidTvUrl` intents |
| A direct-link add-on | Anthony Bourdain Fans: `{"title":"HTTP URL","url":"https://…m3u8"}`, no `name`; **object resources** in its manifest |
| Info "streams" | (the review, checked live) AfterCredits: `externalUrl` to its own page; Watch Next: `stremio:///detail/movie/tt…` |
| Archivio | its manifest redirects to a docs web page |
| Stremio list | `addon_catalog`: official 7, community 97 (44 subtitles, 23 of them need setup; 19 streams, all info-only per the review; 40 catalogs) |
| Stremio API | `addonCollectionGet` with no key: the 7-add-on default collection; a bad key: `code 1 "Session does not exist"`; `login` with an unknown email: `code 2 "User not found", wrongEmail: true` |
| Link codes | `create` → `{result:{success, code, link, qrcode}}`; `link.stremio.com/<code>` → 302 to `stremio.com/login?code=…`; `read` while waiting → `code 101`; the success shape is from stremio-core |
| Protocol docs | the SDK's `stream.md`, `manifest.md` (incl. `countryWhitelist`: lowercase ISO 3166-1 alpha-3), `subtitles.md`, `protocol.md`, `defineCatalogHandler.md`, `advanced.md` |

### 11.3 Stored

| What | Kept |
|---|---|
| The add-on list | settings, per account, **keyed by `transportUrl` hash**: `{ url, manifest (24 h), on, order, catalogs:{id: on}, from, kind (learnt), health }` |
| The Stremio key | scoped storage, like the provider's password |
| Catalog pages | IndexedDB, 6 h, stale while revalidating |
| Metas | 7 days, last 500 |
| Stream lists | 30 min, last 50 titles; **links are never written to disk** |
| Add-on copy checks | by `cp:` key, with the subtitles design's check cache |
| IMDb answers | one per title, shared with subtitles |
| Progress | by title key, with the copy's identity (8.3) |

**Secrets** are configured add-on links and every stream link (debrid resolve links carry the API key in the path).
They are never logged, never sent anywhere but their own host, never shown in a toast, a diagnosis or the Check screens,
and shown at most as their host (audit: SECRET).

### 11.4 Turning a stream into a copy (reference: `design/ui-v1/copies/copies.js` `readName`, RANKING.md 6)

1. **Drop it** unless `url` is `http(s)://` and not `127.0.0.1:11470` (rule 0).
   - `externalUrl` → 5.6, and `ytId` → trailer.
   - Drop it too when `countryWhitelist` excludes his country.
2. **Read** `name`, `description` (or the old `title`) and `behaviorHints.filename` together.
   - **Remove the file extension first**, then split on `[^a-z0-9+]` and match **whole tokens only** (S2).
   - **Picture:** `2160p|4k|uhd`, `1080p|1080i|fhd`, `720p`, `480p|576p|sd`.
   - **Range:** `dv|dovi|dolby vision`; `hdr10+`; `hdr10|hdr`; `hlg`.
   - **Kind:**
     - `remux|bluray|bdrip|brrip` → Blu-ray;
     - `web|webdl|webrip` → web copy;
     - `hdtv` → TV copy;
     - `dvdrip|dvd` → DVD copy;
     - `cam|hdcam|camrip|ts|hdts|telesync|tc|telecine` → cinema recording.
   - **Size:** `videoSize`, else `N GB|MB`.
   - **Language:** words (`multi`, `dual`, `ita`, `french`…).
   - **Not ready:** a ⏳ or `download` marker in the name. Since Real-Debrid stopped reporting what it has cached, many
     copies won't carry one; that's why the length rule in 8.2 exists.
3. A copy's check (at Play) replaces claims with facts and ticks them.

`design/ui-v1/copies/copies-test.js` covers `.ts`, `DTS`, `DVDRip`, `HDRip`, `webcam`, `sd` inside a word, `HDTS`, a
real release name from OpenSubtitles, and the size rules.

### 11.5 Couldn't verify

- a real debrid add-on's answers (no account);
- a successful link-code or email sign-in;
- a link code's expiry;
- ExoPlayer on debrid redirect links;
- the home-network page on his router;
- Dolby Vision (and which profiles) on the 55OLED810;
- a real NBA replay add-on (M7).

---

## 12. Port checklist

1. **`scripts/build-ratings.js`:** the tconst as the 7th field (`v: 2`, shared with subtitles). The index counts rows per
   key. `core.js` keeps Xtream's `tmdb_id` (films and series). The match levels: port `matchLevel` from
   `design/ui-v1/copies/copies.js`.
2. **`app/addons.js`** (new):
   - the list, keyed by `transportUrl` hash;
   - manifests (with `extraSupported` and `extraRequired`);
   - the requests of 11.1, with timeouts and the 6-at-once limit;
   - health and the learnt kind;
   - caches;
   - `readName` (port from `design/ui-v1/copies/copies.js`);
   - country filtering;
   - Stremio link codes, login, logout and `addonCollectionGet` (read only), and keeping in step.
3. **Account:** the Add-ons group, the sheet with its catalog switches, Move, the four ways and their screens. Stremio's
   list is a pushed screen.
4. **`TunerPlayerPlugin`:** the home-network page server:
   - `startPhonePage({token, code})` → events `phone-visit`, `phone-sent {url}`, `phone-locked`;
   - `stopPhonePage()`;
   - the page itself as one HTML asset.

   Also the safe intent launcher of 5.6.
5. **Movies and Series:** add-on chips, the chip menu, paging (skeleton and inline failure), the merge by IMDb id,
   provider-only chips (S10).
6. **Title page:**
   - `defaultVersion()` becomes RANKING.md 2 (port `rank`);
   - the pre-play wait of RANKING.md 3, drawn as 5.0 says;
   - add-on copies in the subtitles design's pill and Copies menu, with the Likely group;
   - asking (5.4), other apps and info (5.6), series merging (5.8), 5.9.
7. **Search:** the From add-ons block, without unreleased titles.
8. **Subtitles:** every subtitle add-on as a group (7), with stream details from the stream object.
9. **`player.js` / `PlayerActivity` / `Diag`:**
   - per-entry headers and the MIME hint;
   - `source` into Diag (M6);
   - copies as identities, with `need: copy`;
   - the not-ready rule;
   - hand-over preferring another source;
   - `need: next` / `queue-next`;
   - progress by title key with the copy's identity;
   - Quality with sources.
10. **The shield:** 10's one rule.
11. **Tests:**
    - `tests/tv/serve.sh` gets a fake add-on: a manifest; one catalog; `url` copies to the fake provider's sample file;
      **one 30 s placeholder**; one `infoHash` copy (must not show); one info-only `externalUrl`; one with
      `androidTvUrl`; subtitles.
    - It also gets a fake Stremio API: link create/read, `addonCollectionGet`, logout.
    - `drive.js` scripts per surface.
    - The emulator test plays an add-on copy, checks the torrent copy is absent, and checks the placeholder hands over
      with no progress saved.
12. **On the TV (the owner):**
    - sign in with the code;
    - add his debrid add-on;
    - play a 4K copy;
    - force a failure (Wi-Fi off and on);
    - open the home-network page from his phone.

---

## 13. Self-check

### 13.1 The audit (`node tools/audit.js`; ring data in `tools/audit-rings.json`)

**The catch-up audit**, on all 30 mocks: one ring, text under 14 px, overlaps, clipping, the safe area, contrast,
floating boxes inside y 27 to 513 and x 48 to 912, CONTAIN, TRUNC, RING (the ring read back from the 2x screenshot on
every side). Plus three add-on checks:

- **JARGON:** protocol words on screen (`stream`, `infoHash`, `magnet`, `bingeGroup`, `proxyHeaders`, `behaviorHints`,
  `idPrefixes`, `JSON`, `API`, `transport`, `resource`, `P2P`, `HEVC`, `x265`, `remux`, a `tt` id…). `manifest.json`
  is allowed. **v1.1 added `stream`**, which found 5 mocks; all are fixed (S16).
- **SECRET:** a link with a long path part shown in full.
- **CUT** (new in v1.1): a row's text in a menu, sheet, panel or list cut by an ellipsis. It found 2 on its first run
  (S18); both are fixed. v1.2 exempts an add-on's own description in Stremio's list (`data-desc`), one line by design.
- **PANEL** (new in v1.2): the player's Options, Subtitles and Quality panels must be 384 wide. A 400 wide copy of
  `player-sources` fails it.

**Proof they fire:** `--inject` adds a line with `infoHash` and a full configured link to every page. JARGON and SECRET
fire on all 30 pages: 60 findings.

**Result: 30 pages, 0 findings.** Every ring is 100% white on all four sides.

### 13.2 The logic test (`node ../copies/copies-test.js`)

**90 cases, 0 failed** (run from this folder on 27 Oct 2026). It is the shared test. It holds this design's old 31
cases (the name parser, the bands, not ready) and the mock order **B, A, N, P, F**. It also holds the second review's
series cases: TVDB and TMDB Sure, a 60 min episode of a 35 min show, a 12 min special, a 30 s clip, the provider
episode's own length. The first v1.1 run caught the speed-band bug; that rule is now in RANKING.md 2.

### 13.3 The rings

| Mock | Focused | Ring box | To the safe edge |
|---|---|---|---|
| acct-addons | Northlight row | 267, 215, 911, 277 | 1 |
| acct-addon-sheet | Popular movies | 508, 233, 896, 291 | 16 |
| acct-addon-move | Northlight, lifted | 261, 272, 917, 336 | −5.4 (the 1.02 lift; inside the 6 px allowance) |
| add-ways | Use your Stremio account | 192, 133, 768, 207 | 106 |
| add-stremio-code, add-phone | the fallback button | 680 / 706, 429, 896, 475 | 16 |
| add-stremio-found | Add 4 add-ons | 614, 295, 827, 351 | 85 |
| add-stremio-email | Email field | 43, 137, 573, 195 | −5 (ring in the margin) |
| add-list | Where's The Jump (the first row of the real list) | 43, 205, 917, 267 | −5 |
| add-confirm | Add it | 238, 327, 379, 383 | 130 |
| movies-addon | Tenzing | 188, 166, 328, 372 | 139 |
| movies-chip-menu | Hide this chip | 344, 180, 572, 238 | 153 |
| movies-addon-more | Backrooms | 484, 46, 624, 252 | 19 |
| movies-addon-down | Try again | 322, 391, 491, 447 | 66 |
| search-addons | Dune (1984) | 427, 331, 917, 397 | −5 |
| detail-sources, -addon-only, -nosources, -play-wait | the first button | 45, 218 to 244, … | −3.3 (lift from the left edge) |
| detail-sources-sheet, detail-copies-likely | Always the best copy | 56, 75, 640, 145 | 8 |
| detail-series | E5 | 491, 310, 711, 438 | 75 |
| detail-match | Dune · 2021 | 56, 116, 580, 186 | 8 |
| player-source-failed, player-not-ready | Play it now | 210, 387, 368, 435 | 78 |
| player-sources | 1080p · Blu-ray, Northlight (inset) | 59, 220, 421, 270 | 11 |
| state-addon-down | Archivio | 267, 349, 911, 411 | 1 |
| add-setup, phone-page, player-upnext | nothing (a progress card, the phone, Up next) | – | – |

**Couldn't check:** the real TV (rings on OLED, 14 px from the sofa), real debrid answers, real sign-ins (11.5).

---

## 14. Decisions, and questions for the owner

**Decided here:**
- Add-ons add to the provider; nothing of the provider's is hidden or replaced. Home is unchanged.
- Only direct links play, and torrent-only add-ons say so in his words.
- Adding without typing: the Stremio account first, Stremio's list on the TV, the home-network page from the phone;
  typing last. No hosted page and no relay.
- airglow reads the Stremio account and never writes to it.
- **One ranking, one pre-play wait, one IMDb match and one picker for the whole app: `design/ui-v1/copies/RANKING.md`.**
- An add-on link is never opened before Play, and an add-on copy outranks his provider's only on a Sure match.
- A failed or placeholder film copy hands over by itself, preferring another source; live TV never does.

**Questions for the owner:**
1. Do you have a Stremio account, and a debrid service (Real-Debrid or similar)? Which add-ons do you use?
2. When a 4K copy might still be coming, should Play wait up to 4 seconds for it (as designed), or always start at once?
3. Do you want an add-on row on Home at all? (Today: no. If yes, it would take Home's second row, and needs its own
   design.)
4. When your provider and an add-on have equally good copies, should your provider's come first (as designed)?
5. "Keep in step with Stremio" is on by default, so add-ons you install in Stremio on your phone show up here. OK?
6. Later, should airglow also bring over your Stremio watch history (Continue watching)?
7. Is there an add-on you use for NBA replays? (That decides whether add-on replays join catch-up.)
