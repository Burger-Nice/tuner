# airglow TV: add-ons (the Stremio add-on system), v1.0

This is the design spec for the engineer. It extends `design/ui-v1/UI-SPEC.md` v1.2 (layout, type, focus, the shield)
and plugs into two designs being made beside it: **subtitles and real quality** (`design/ui-v1/subtitles/`, the
Version pill, the Copies menu, the 64 KB check, "Which film is this?", the player's Subtitles panel) and **catch-up**
(`design/ui-v1/catchup/SPEC.md`, replays and their shield). Everything not said here follows those.

The owner asked: *"I want to be able to add addons like stremio, just do stremio's system on our app."* His provider's
films and shows are often poor (missing subtitles, bad quality). Add-ons add more copies, catalogs and subtitles
**next to** the provider, never instead of it.

- **The mocks** are real HTML at the 960 x 540 canvas. They link the app's own `app/tv/brand/tokens.css`, `ui.css`
  and `app.css`, plus `addons.css` (new classes only, prefix `ad-`, written to be appended to `app/tv/app.css`).
- **The data** is real where it can be: Cinemeta, OpenSubtitles v3, WatchHub, Public Domain Movies, the Stremio API
  and its link codes, Stremio's add-on lists and the retired Archivio, fetched on Tue 27 Oct 2026 at 04:10 UTC
  (`data.json`, `tools/fetch.js`). Shown as the owner's TV would show it at 21:10 Reykjavik time (UTC).
- **Illustrative**: the provider's copies, **Northlight** (a stream add-on set up with a debrid account, giving direct
  links), **Kestrel** (a slow stream add-on), **Courtside** (NBA replays), and every stream's size and quality. I have
  no debrid account, so no real debrid answer was fetched (section 11.6). Art is the kit's procedural stand-in.

| File | What it is |
|---|---|
| `SPEC.md` | this |
| `*.html` (30) | the mocks; `png/*.png` are their 2x renders, `png/contact-sheet.png` shows all 30 |
| `addons.css` | the new CSS |
| `data.json` | the real add-on answers used by the mocks and section 11, with a timed request log |
| `tools/fetch.js` | fetches `data.json` (`NODE_USE_ENV_PROXY=1 node tools/fetch.js` behind a proxy) |
| `tools/build.js` | builds the mocks from `data.json` |
| `tools/render.js` | the PNGs and the contact sheet (from catch-up's) |
| `tools/audit.js` | the self-check (section 13; catch-up's, plus JARGON and SECRET) |

---

## 0. The firm rule, and the idea in one paragraph

**airglow plays only direct links**: a stream object's `url` with `http:` or `https:`. Debrid services and ordinary
add-ons give these. **Torrent and P2P streams are not supported and never shown**: `infoHash`/`fileIdx`, `magnet:`
links, and everything that needs Stremio's own streaming server (`nzbUrl`, `rarUrls`, `zipUrls`, `7zipUrls`,
`tgzUrls`, `tarUrls`, any `url` on `127.0.0.1:11470`). `ytId` (trailers) opens the YouTube app; `externalUrl` opens
the app it names ("Watch in another app"). There is no torrent engine and none is designed here.

**The idea.** An add-on is a web address with a `manifest.json`. airglow keeps an ordered list of them. Their
**catalogs** become rows on Home and chips on Movies and Series; their **streams** become more **copies** of a title,
in the same Copies list as the provider's, ranked best first, with Play taking the best; their **subtitles** feed the
subtitles design's panel. Titles are joined across provider and add-ons by **IMDb id**, matched once per provider
title from a local file. Add-ons are added **without typing**: from the owner's Stremio account (sign in once by
scanning a code), from Stremio's own list on the TV, or by sending a link from his phone to a page the TV serves.

## 1. Where it lives (the IA decision)

| Surface | What changes | Mocks |
|---|---|---|
| Account | a new group **Add-ons** under Provider | `acct-addons`, `acct-addon-sheet`, `acct-catalog-menu`, `acct-addon-move`, `state-addon-down` |
| Adding one | a menu of four ways, then the chosen screen; every way ends at one confirm | `add-ways`, `add-stremio-code`, `add-stremio-found`, `add-stremio-email`, `add-list`, `add-phone`, `add-confirm`, `add-setup`, `phone-page` |
| Home | add-on catalog rows after airglow's own rows | `home-rows`, `home-row-menu` |
| Movies, Series | add-on catalogs as chips after the provider's, past a divider | `movies-addon`, `movies-addon-down` |
| Search | a "From add-ons" block after the provider's results | `search-addons` |
| The title page | the Version pill and the Copies menu list add-on copies too; add-on-only titles use the same page | `detail-sources`, `detail-sources-sheet`, `detail-play-wait`, `detail-addon-only`, `detail-series`, `detail-match`, `detail-nosources` |
| The player | Quality lists every copy; a failed copy hands over to the next; Up next keeps the source | `player-sources`, `player-source-failed`, `player-upnext` |
| The shield | add-on replays join catch-up's sources | `sources-shield` |

**Why no "Add-ons" tab or "Discover" page:** the top bar already has 7 destinations, and the owner doesn't want a
second app inside airglow. He wants better copies of what he watches. So add-ons show up **where he already looks**:
the title page (copies), the rows he scrolls (catalogs), Search, and the player.

**Words.** In the UI an add-on is an **add-on**; one stream is a **copy** (the subtitles design's word); where a copy
comes from is its **source** (`Your provider` or the add-on's name). The words *stream, manifest, catalog id, infoHash,
debrid, resource, transport, JSON* never reach the screen. `manifest.json` appears once, where he is told what a link
looks like (audit: JARGON, section 13).

---

## 2. Rules every add-on surface follows

### 2.1 Geometry

| What | Value |
|---|---|
| Account panes | groups x 48, w 200, rows 44 (9 groups now fit y 90 to 486); right pane x 260 to 918 inner, rows end at x 906 (ring inside 912) |
| Add-on row (`.ad-row`) | 52 high, 6 gap, radius 12, surface-1; logo tile 32 (`.ad-lg`), name Inter 650 16, line 2 Inter 500 14 `text-2`, state at the right 15 |
| Section line (`.ad-sec`) | 22 high, caps label 14 + plain caption 14 (`Installed · 6  Higher comes first · synced with Stremio 21:02`) |
| Sheets | right sheet 420 (x 492 to 912, y 27 to 513) as UI-SPEC; centred menus 520 to 640 wide; every floating box inside y 27 to 513 (audit) |
| Copies menu, Which film | the subtitles design's: left 48, 600 / 540 wide, two-line rows 60 (`.lr.ad-two` = `.lr.st-two`) |
| Full-screen steps | title y 64 (head 28), steps from y 118 (body 16/24, w 470), QR 200 at x 616 to 912, the wait card at y 420, 64 high |
| Home add-on rows | the Home rail: titles 22, cards 198 x 100 at a 144 pitch; the add-on name is the row title's `small` caption |
| Movies chips | the lib chip row (y 122), add-on chips after a 1 x 24 divider (`.ad-cut`); the row scrolls (`.lib-chips.scrolled`) |
| Player cards | the failure card 560 wide (`.nv-card.ad-fail`), Up next 400 at the right, 84 above the bottom |
| Phone page | one column for a 360 px wide phone (drawn at 264 in the mock), text 14 and up, buttons 44 high |

### 2.2 Focus and keys (on `focus.js` as it is)

- **Containers:** the Account list and every sheet or menu list are `[data-col]`; Movies' chip row and Home rails are
  `[data-row]`; Stremio's add-on list is a `[data-col]` under a `[data-row]` of chips. No new hook is needed.
- **Rings:** list rows (add-on rows, sheet rows, menu rows) use the ring only, no scale (`f-ring`); buttons and cards
  use the ring and the 1.05 lift, the first of a row lifting from its left edge (UI-SPEC 3.2).
- **One ring:** when a sheet or menu opens, the opener loses its ring (the mocks show none under a scrim).
- **Hold OK** (500 ms) on an add-on row, an add-on card on Home, or an add-on chip opens a menu with the safe item first.
- **Back** closes a sheet or menu and restores the opener; from the Add-ons list it goes to the Add-ons group, then the
  avatar, then leaves (Account's rule).
- **Identity keys** (`data-key`): add-on rows `ad:<manifest.id>`, add-on cards `t:<type>:<imdb id or add-on id>`,
  copies `cp:<source>:<hash of url>`. Data arriving never moves focus (add-ons answer late all the time).

### 2.3 Icons (new; same 24 grid and 2 px stroke as `util.js`)

`puzzle` (an add-on), `phone`, `link`, `keys` (the keyboard), `ext` (opens another app), `x`. The provider mark on
cards is the existing `tv` glyph. The checked tick and the "!" disc are the subtitles and diagnosis designs' (green
tick only on what airglow checked itself; "!" in chalk; never red, never amber).

### 2.4 Port notes (selectors)

The mocks mark focus with `.f` / `.f-ring` / `.f-in`; the app uses `:focus` on `.fx`. Add to the ring-only list in
`app.css`: `.ad-row.fx:focus, .ad-lr.fx:focus`. `.ad-tk`, `.ad-copies`, `.ad-match`, `.ad-two` are the subtitles
design's `.st-tk`, `.st-copies`, `.st-match`, `.st-two` under my prefix so neither folder depends on the other: **port
one set** (theirs) and drop mine.

---

## 3. Account > Add-ons

### 3.1 The list (`acct-addons`)

| Row | Line 1 | Line 2 | Right |
|---|---|---|---|
| Add an add-on | `Add an add-on` | `From your Stremio account, Stremio's list, or your phone` | `+` |
| (section) | `INSTALLED · 6` | `Higher comes first · synced with Stremio 21:02` (or `· not linked to Stremio`) | – |
| each add-on | its `manifest.name` | what it gives, in words (3.1.1) | its state (3.1.2) `›` |

**3.1.1 What it gives**, built from `resources` and `types`: `Streams for movies and series`, `Subtitles for movies
and series`, `Catalogs and details · Popular, New, Featured` (catalog names, first 3), `Where else to watch: rent, buy
or stream` (a stream add-on whose streams are all `externalUrl`, learnt from its first answers), `A catalog only: its
films come as torrents` (learnt: every stream it ever sent was dropped by the rule in 0).

**3.1.2 States:** `On`, `Off` (row dimmed), `Catalog only`, `Needs setup` (configurationRequired and no config in its
link), `Not answering` with the "!" disc (section 9), `Checking…` (first manifest read).

| Key | On the list |
|---|---|
| OK | Add an add-on: the four ways (3.2). An add-on: its sheet (3.1.3) |
| Hold OK | `Move` (focused) · `Turn off` / `Turn on` · `Set up again on your phone` (configurable only) · `Remove from airglow` |
| ▲▼ | rows; the list scrolls by whole rows, the focused one keeps a row of margin |
| Back | the Add-ons group, then Account's rule |

Entry focus: the first add-on (or `Add an add-on` when there are none).

**3.1.3 An add-on's sheet** (`acct-addon-sheet`, right 420): logo 56, name, `Version 3.0.14 · from your Stremio
account`, what it gives as chips, then rows: `Use this add-on` (toggle; focused), **Catalogs · where they show** (one
row per catalog: `Popular movies   Home, Movies ›`), then `Move up or down`, `Set it up again on your phone`
(configurable), `Remove from airglow`. For one from Stremio the remove row reads `Hide in airglow` with `It stays in
your Stremio account`.

**3.1.4 One catalog** (`acct-catalog-menu`): OK on a catalog row opens a menu with two checks, `On Home` (focused) and
`In Movies` / `In Series`. Both off hides it everywhere; the add-on stays on for details. Catalogs that can't be a row
(a required extra other than `genre`, e.g. Cinemeta's `last-videos`) aren't listed; search-only catalogs are listed as
`Used by Search` with no checks.

**3.1.5 Move** (`acct-addon-move`): the Saved reorder model. The row lifts (ring, 1.02), the grip arrows show, the
right side says `2 of 6`; ▲▼ move it, OK drops, Back puts it back. **Order decides:** the order of Home rows and Movies
chips, which add-on's details win for a title, and the tie-break between equally good copies (5.3).

### 3.2 Adding one: the decision (`add-ways`)

OK on `Add an add-on` opens a centred menu of four ways, the first focused and marked `Easiest`:

| Way | For | Typing |
|---|---|---|
| **Use your Stremio account** | everything, including add-ons set up on a web page; stays in step | none on the TV; sign in on the phone |
| **Pick from Stremio's list** | add-ons that need no setup | none |
| **Send a link from your phone** | one set up on a web page, without a Stremio account | none on the TV |
| **Type the link** | the last resort | the TV keyboard |

The foot of the menu says the rule once: `airglow plays direct links. An add-on that only finds torrents shows nothing
here.`

**Why these and not a hosted airglow page or a short code.** The brief asked how a phone page would be served when the
TV can't easily run a server. I compared the three:

| Option | What it needs | Privacy of the add-on link (it holds his debrid key) | Verdict |
|---|---|---|---|
| An airglow page hosted somewhere (GitHub Pages) | a static page can't reach the TV; it needs a **relay server** we'd run and keep up forever | the relay sees every link | no |
| A short code (type 6 letters on the phone) | the same relay | the same | no |
| **The Stremio account** (verified, 11.4) | nothing of ours: Stremio's own TV sign-in (`link.stremio.com`) and add-on list | Stremio already holds it | **first** |
| **A page the TV serves on the Wi-Fi** | ~200 lines of Java in `TunerPlayerPlugin` (a `ServerSocket`), only while the screen is open | never leaves the house | **second** |

The Stremio account is first because it *is* "Stremio's system": a configurable add-on (most debrid ones) is set up on
its own web page, whose **Install** button puts it in the Stremio account; airglow then picks it up. The Wi-Fi page is
for an owner without a Stremio account, and it is also the page the first-run "Use your phone" sign-in was designed
around (UI-SPEC 5.1) and never built, so it pays twice. "Not easy" was about a full server; this one is a single page
and one POST.

### 3.3 Use your Stremio account (`add-stremio-code`, `add-stremio-found`, `add-stremio-email`)

**The code screen.** airglow calls `GET https://link.stremio.com/api/v2/create?type=Create` (verified: it returns
`code` (4 characters), `link` (`https://link.stremio.com/<code>`) and `qrcode`). The screen shows the steps, the QR of
`link`, and the code in four 52 x 60 tiles. The phone opens the link, which redirects to `stremio.com/login?code=…`
(verified), and he signs in any way Stremio allows. airglow asks `GET …/api/v2/read?type=Read&code=<code>` **every 3 s**
(verified: `{"error":{"code":101,"message":"Invalid or expired token"}}` while nobody has signed in); success is
`{"result":{"authKey":"…"}}` (from stremio-core's `LinkAuthKey`; not seen live, see 13). After 10 min with no sign-in
a new code is created and shown (the old one may have expired; the expiry isn't documented).

- The wait card says `Waiting for you to sign in` and `airglow reads your add-on list. It never changes your Stremio
  account.`
- **Focus:** the one button, `Use email and password` (f-ring), so a stray OK lands on the fallback, never on nothing.
- **Back** cancels and returns to the four ways.

**What it reads.** `POST https://api.strem.io/api/addonCollectionGet` with
`{"type":"AddonCollectionGet","authKey":"…","update":true}` returns `result.addons[]`, each `{ transportUrl, manifest,
flags }` (verified with no key: the default collection). airglow **never** calls `addonCollectionSet`: his Stremio stays
as he set it.

**Your Stremio add-ons** (`add-stremio-found`): `8 in your account. airglow can use 5 of them.` A check row per usable
add-on (OK toggles), then **one sentence** naming the ones left out and why, never a broken row:

| Left out | Why (on screen) | How airglow knows |
|---|---|---|
| a `transportUrl` ending `/stremio/v1` (e.g. the old OpenSubtitles) | `an older kind of add-on; v3 does the same` | legacy transport (protocol doc) |
| `http://127.0.0.1:11470/…` (Local Files) | `needs the Stremio app on this TV` | the local streaming server |
| `ipfs://`, `ipns://` | `a kind of link airglow can't open` | transport |
| only the `channel` / `tv` types (YouTube) | `channels aren't in airglow yet` | `types` |

At the right: `Keep in step` / `with your Stremio account` (toggle, on) and `Add 5 add-ons` (focused).

**Keeping in step.** With the toggle on, airglow reads the collection at every cold start and when Account > Add-ons
opens (at most once a minute). New ones are added at the end, with a toast `Comet came from your Stremio account`;
ones removed in Stremio are removed here if they came from Stremio. airglow's own choices (off, order, which catalogs
show where) are kept by `manifest.id` and survive every sync. `{"error":{"code":1,"message":"Session does not exist"}}`
(verified for a bad key) means he was signed out: the section line reads `Stremio signed you out · Sign in again ›`
and the add-ons stay as they were.

**Email and password** (`add-stremio-email`): `POST https://api.strem.io/api/login` with
`{"type":"Login","email":…,"password":…}`; success is `{result:{authKey,user}}` (stremio-core `AuthResponse`).
Errors go under the field that caused them, in chalk with the "!" disc: `{"error":{"code":2,"message":"User not
found","wrongEmail":true}}` (verified) reads `No Stremio account uses this email`; any other error code shows its
`message` under the password. A card at the right: `Signed up with Google, Apple or Facebook? Those accounts have no
password here. Use the code instead.` Entry focus: Email. OK on a field opens the keyboard (as sign-in today).

The `authKey` is stored like the provider's password (scoped storage, never logged, never on screen). `Account >
Add-ons > Stremio account > Sign out` forgets it and offers `Keep the add-ons` (focused) / `Remove them too`.

### 3.4 Pick from Stremio's list (`add-list`)

Cinemeta's `addon_catalog` resource is Stremio's own list: `/addon_catalog/all/official.json` (7) and
`/addon_catalog/all/community.json` (97), verified. A pushed screen: title `Stremio's add-ons`, chips `Official ·
Community | Streams · Catalogs · Subtitles` (filters by `resources`; counts on the selected chip), then add-on rows
with the manifest's description (one line, ellipsis) and at the right:

| Right side | When | OK |
|---|---|---|
| `+ Add` | no setup needed | the confirm (3.6) |
| `✓ Added` | already in the list | its sheet |
| `[phone] Set up on your phone` | `behaviorHints.configurationRequired` | the setup card (3.7) |

Add-ons that the rule in 0 makes useless are not hidden here (a manifest can't say it only gives torrents; only its
answers can). When an added add-on turns out torrent-only, its row reads `Catalog only` or, with no catalogs,
`Nothing airglow can play` with `Remove it ›`.

### 3.5 Send a link from your phone (`add-phone`, `phone-page`)

- The TV starts a tiny HTTP server **only while this screen (or the setup card) is open**, on port 8790 of its Wi-Fi
  address, closed after 10 minutes or on Back. The QR holds `http://<tv-ip>:8790/<token>` (a random 16-character token);
  the screen also prints the address and a 4-digit code the page asks for when the token is missing (typed address).
- **The page** (one HTML file in the APK, `phone-page`): `Send to your TV`, a paste field, `Send to the TV`, then
  `Or set one up` buttons for add-ons waiting for setup. It POSTs `{ url }` (under 2 KB); the TV answers `Sent`. It
  accepts only `http(s)://…/manifest.json` and `stremio://…/manifest.json` (rewritten to `https://`).
- Nothing is added on the phone's word: the TV shows the confirm (3.6).
- The link travels on the home Wi-Fi in plain http. That is the same trust as the first-run phone sign-in; said in the
  page's last line (`Works only on the same Wi-Fi as the TV`).
- Wait card: `Waiting for your phone` / `The TV serves this page itself, only while this screen is open. Nothing leaves
  your home network.` Focus: `Type the link instead`.

### 3.6 Before adding: what it gives (`add-confirm`)

Every way in ends here. airglow fetches `<base>/manifest.json` (6 s), then shows: logo, `Add Northlight?`, where it came
from, what it gives as chips, and one line for each warning:

| Manifest says | Line |
|---|---|
| a config part in the link, or `configurable` | `Its link holds your account details, so airglow keeps it private and never shows it in full.` |
| `behaviorHints.p2p` | `It says it uses torrents. airglow shows only its direct links.` |
| `behaviorHints.adult` | `It says it has adult content.` (and `Add it` is not focused: `Cancel` is) |
| only types airglow doesn't show (`channel`, `tv`, `Podcasts`…) | `airglow doesn't show what it gives yet.` (no `Add it`) |

`Add it` (focused, unless adult) / `Cancel`. A link that isn't an add-on (not JSON, no `id`, `resources` or `types`)
gets `That link isn't an add-on`, with what came back in plain words (`a web page`, `nothing`), and `Try another`.

### 3.7 An add-on that needs setting up (`add-setup`)

`configurationRequired` (or `Set it up again`): a centred card. The setup itself happens on the add-on's own page,
`<base>/configure` (Stremio's rule: protocol doc, "Creating Addon Configuration Pages"). The QR opens **airglow's**
phone page in its setup state (`phone-page`, middle), which has `Open its setup page` and a paste field. The add-on's
page ends with **Install** (a `stremio://` link: with Stremio on the phone it goes into his Stremio account, and on to
airglow if he's in step) or **Copy link** (paste and send). Nothing on the TV is focusable; `Back cancels` is printed
(the verifying-screen rule, UI-SPEC 5.1).

---

## 4. Catalogs

### 4.1 Home (`home-rows`, `home-row-menu`)

- **Where:** after airglow's own rows (Continue watching, On now, Tonight's games), in add-on order, then catalog
  order. Row title = the catalog's name (`Popular movies`); the add-on's name is its small caption (`Cinemeta`).
  A catalog with no `name` (Public Domain Movies' has none, verified) is titled by the add-on's name.
- **How many:** **2 by default**: the first movie and the first series catalog of the first add-on that has catalogs.
  At most 6 add-on rows. More are switched on in the add-on's sheet (3.1.4).
- **Only rows he can play:** a catalog row is offered only when some enabled stream add-on covers its type and id
  prefix (`tt` here), or the provider matches its titles. Otherwise its sheet row says `Off: no add-on gives copies for
  these`.
- **Cards** (198 x 100): the meta's `background` under the Home scrim; `★ 7.5` (its `imdbRating`) at the top right; the
  title; `2026 · Comedy`. **A title the provider has too** (4.4) reads `[tv] Also on your provider` and carries the
  provider's quality tag; OK opens the provider's title page. After a title page found nothing for a title, its card
  reads `No copy found` for 24 h.
- **Hold OK** (`home-row-menu`): `Save to Saved` (focused, the app-wide rule), `Details`, `Hide "Popular movies" from
  Home`. Hiding un-ticks `On Home` (3.1.4) and toasts `Hidden. Account > Add-ons > Cinemeta brings it back`.
- Rows load on the first Down into them (the current Home is drawn once during the intro, `CONTEXT.md`; add-on rows
  must not add to that), from a cache of the last answer (6 h), refreshed behind.

### 4.2 Movies and Series (`movies-addon`, `movies-addon-down`)

- The provider's chips stay first (All, New in English, Top rated, 4K, genres). Then a 1 x 24 divider, then one chip per
  catalog of that type that is `In Movies` / `In Series`: `Popular  Cinemeta` (name, then the add-on in `text-3`).
  The row scrolls sideways (the existing `.lib-chips.scrolled` mask).
- **On an add-on chip** the grid is that catalog in **its own order** (it has no total and no sort): the caption reads
  `Popular from Cinemeta · [tv] also on your provider`. **Sort and Jump go**; **Filters becomes `Genre`** with the
  catalog's own `extra.genre.options` (one at a time unless `optionsLimit` > 1). A catalog whose `genre` is required
  (Cinemeta's `New`, id `year`, verified: required, 107 options that are years) opens on its first option (`2026`).
- **Paging:** 6 posters a row; the next page is asked for when the focus reaches the last 2 rows: `skip=<titles
  received so far>`. It stops when a page is empty or brings only titles already shown. (The SDK says pages are 100 and
  fewer means the end; Cinemeta sends 49 or 50 per page, verified, so neither rule can be trusted.)
- Posters: the meta's `poster`; the provider mark `[tv]` at the bottom right of a poster the provider has; the
  provider's 4K tag when it has a 4K copy.
- **Not answering** (`movies-addon-down`): the grid area shows `Cinemeta isn't answering` / `Its catalogs come back
  when it does. Your provider's movies are all still here, under All.` `Try again` (focused) / `All movies`.
- **Hold OK on an add-on chip:** `Hide this chip` (un-ticks `In Movies`).

### 4.3 Details for add-on titles

An add-on title's page uses the first enabled add-on (in order) that has `meta` for its id prefix; for `tt` that is
Cinemeta. Used: `name, releaseInfo, description, runtime, genres, cast, director, imdbRating, background, logo,
videos[], trailerStreams[]`. Cinemeta sends HTML entities in names (`Judith O&apos;Dea`, verified): decode them.

### 4.4 The IMDb match (shared with the subtitles design)

Add-ons speak IMDb ids (`tt…`, `tt…:season:episode`); the provider speaks its own ids. Every provider title needs its
IMDb id once. **One match serves add-on copies, add-on catalogs and downloaded subtitles** (the subtitles design's
`detail-which-film` / `detail-match` are the same picker).

**Where the id comes from, in order:**

1. **The local ratings file.** `scripts/build-ratings.js` already reads IMDb's `title.basics` and `title.ratings`
   every week and keys rows by `Titles.norm(primaryTitle)` plus the year (the app's `matchImdb`). **Add the `tconst`
   to each row** (`v: 2`; ~0.8 MB more for ~70k rows). Then `matchImdb` returns the id with the rating, in memory, with
   no request.
2. **The provider's `tmdb_id`** (Xtream `get_vod_info`'s `info.tmdb_id` on most panels): when Cinemeta's `meta` for the
   candidate has the same `moviedb_id` (verified field: Dune: Part Two = 693134), the match is sure.
3. **Cinemeta search** (`/catalog/movie/top/search=<name>.json`, 50 ms here) for titles the file doesn't hold
   (under 1,000 votes).

**How sure it must be:**

| Level | Rule | Used for |
|---|---|---|
| **Sure** | same key and same year, and the only row with that key within ±1 year; or the TMDB ids agree | everything |
| **Likely** | same key, year ±1, still the only one; a series with no year whose key is unique among series | everything |
| **Unsure** | no year and two or more candidates (two films called *Dune*); or Cinemeta search with no single exact name within ±1 year | nothing until he picks |
| none | no candidate | provider only |

**Never guessed.** For an unsure title the source pill reads `[puzzle] Add-ons need to know which Dune` and OK opens
**Which film is this?** (`detail-match`, the subtitles design's picker): rows `Dune / 2021 · 2 h 35 min · Denis
Villeneuve`, then `Search by another name`, `None of these` (`Keep this copy only: no add-on copies or downloaded
subtitles`). **The focused row is the closest length to this copy** (the subtitles design's check knows the copy's
length), never the first result. The pick is kept per provider title (`imdbPick[titleKey]`) and serves both designs.

**Merging:** an add-on title and a provider title with the same IMDb id (sure or likely) are one title: one card, one
page, one Copies list. Add-on items with other id prefixes (`kitsu:`, `yt_id:`) are never merged.

---

## 5. The title page

### 5.1 The Version pill names the best copy (`detail-sources`)

The subtitles design owns the pill and the Copies menu; this design adds the add-on copies to them.

- The pill reads the best copy and its source: `[film][tick] 4K Dolby Vision · Northlight  best of 9 ▾`. With only the
  provider: `1080p · Your provider  best of 1`. On a series, the copy for the episode Play would play (`S3 · E4`).
- **Progressive:** stream add-ons are asked when the page opens (5.4). A caption right of the pills names who is still
  looking: `[spinner] Still asking Kestrel`, and goes when the last one answers or times out. The pill updates in
  place; focus never moves; Play is always focused on entry.
- Tags in the meta line are the best copy's, ticked when checked (the subtitles design's rule).
- The subtitles line under the pills is the subtitles design's (`EN and IS from OpenSubtitles · none in this copy's
  file`).

### 5.2 The Copies menu (`detail-sources-sheet`)

OK on the pill. The subtitles design's menu (`Copies of …`, `Always the best copy` first and focused, two-line rows,
`Best` tag), with every copy from every source in **one** list, best first:

| Row | Line 1 | Line 2 |
|---|---|---|
| Always the best copy | `Always the best copy` | `Now: 4K · Dolby Vision · Northlight. Changes if a better copy shows up` |
| a checked copy | `[tick] 4K · Dolby Vision · 41 Mb/s` | `Northlight · English · Blu-ray · Atmos · 51.6 GB` |
| a provider copy | `[tick] 1080p · 7.1 Mb/s` | `Your provider · English · named 4K · 6.1 GB` |
| not checked yet | `1080p` (no tick) | `Northlight · English · Blu-ray · 14.2 GB · not checked yet` |
| still looking | spinner, `Kestrel is still looking` | `Its copies join this list as they come` |
| other apps | `[ext] Watch in another app` | `HBO Max, Prime Video and 6 more · WatchHub` (OK: a menu of them, 5.6) |
| trailer | `[play] Trailer` | `Opens YouTube` (from `trailerStreams[].ytId`) |

The header's right side: `9 so far · checked 21:08`. The foot: `▼ 4 more, and Watch in another app · picking a copy
keeps it for this film`. Picking a copy keeps it for this title (the subtitles design's rule); `Always the best copy`
goes back. A copy that failed this session sits at the bottom with `Didn't play just now`.

**Line 2 in words** (what each part is, from 11.5): source (bold), language, the kind of copy (`Blu-ray`, `web copy`,
`TV copy`, `cinema recording`), sound when special (`Atmos`, `5.1`), size. The add-on's file name is not shown (it is
jargon: `Dune.Part.Two.2024.2160p.WEB-DL.DDP5.1.Atmos.DV.HDR.H.265`); a copy whose quality is only what its name
claims has no tick until checked.

### 5.3 Best first (what Play plays)

1. **Plays on this TV** (the subtitles design's check: a copy whose only sound track the TV can't play goes last).
2. **Your languages** (`settings().langs`; unknown counts as yours, `Multi` as yours).
3. **Picture:** 4K, then 1080p, 720p, SD, unknown. The subtitles design's rule holds: a 4K copy under 8 Mb/s ranks as
   1080p.
4. **Range:** Dolby Vision, HDR10+, HDR10, HLG, SDR (the 55OLED810 is meant to show all of them; to confirm on the TV).
5. **Kind:** Blu-ray, web copy, TV copy, unknown. **A cinema recording is always last**, whatever its resolution, and
   says `cinema recording · poor`.
6. **More data:** higher measured bitrate, else bigger size.
7. **Ties:** `Your provider` first (it needs no other service), then add-on order (3.1.5).

Unchecked copies rank by what their name says; the check (the subtitles design's 64 KB read) runs on the top 3 by that
order, 2 at a time for add-on copies (they don't use the provider's connections), and the list re-sorts as checks
land, without moving focus.

### 5.4 Asking add-ons (progressive)

- **When:** on entering a title page (movie: its id; series: the episode Play would play); on focusing an episode for
  1 s; on Home, for the first Continue watching card. Answers are kept 30 min (debrid links expire).
- **Who:** every enabled add-on whose `resources` include `stream` (a string, or an object with its own `types` and
  `idPrefixes`, verified on a real manifest) for this type and id prefix. All at once; at most 6 add-on requests in the
  air app-wide.
- **Time:** 10 s each (debrid scrapers are slow). The page never waits for them; Play waits only as in 5.5.

### 5.5 Play while an add-on is still looking (`detail-play-wait`)

Play plays the best copy known. **Only when** the best known isn't 4K and a stream add-on hasn't answered, Play waits
**up to 4 s** for a better one: the button reads `Playing in 3 s` with a countdown ring, and the caption `OK plays
1080p now · Back stops`. It plays at once when 4K arrives or the last add-on answers. With a 4K copy in hand, Play
never waits. (The owner wants the highest quality: open question 3.)

### 5.6 Other apps and trailers

`externalUrl` streams (WatchHub, verified: `name` `Amazon Video`, `title` `Rent, Buy`, plus `androidTvUrl` intents)
are never copies. They are one row, `Watch in another app`, opening a menu: `HBO Max · Subscription`, `Prime Video ·
Rent, buy`. OK fires the `androidTvUrl` intent when there is one, else opens `externalUrl` with `ACTION_VIEW`; if no app
takes it, `That app isn't on this TV`. `ytId` opens `vnd.youtube:<id>` (the YouTube app is on Google TV).

### 5.7 A title only add-ons have (`detail-addon-only`)

The same page: details from 4.3, copies from stream add-ons, More like this from the provider's titles and the add-on
catalogs' (shared genres, as today). One quiet credits-line note: `[puzzle] Not on your provider · details from
Cinemeta`. Save works (Saved stores the IMDb id and the add-on's preview).

### 5.8 Series (`detail-series`)

- **Episodes are the union** of the provider's `get_series_info` and the meta's `videos[]` (`id` `tt…:s:e`, `season`,
  `episode`, `name`, `overview`, `thumbnail`, `released`; season 0 is `Specials`, verified on The Bear: seasons 0 to 5).
  Matched by season and episode number.
- An episode only add-ons may have carries `[puzzle] Add-on` on its still (top right). An episode not released yet
  (`released` in the future) shows its date instead of a length and isn't playable.
- The focused episode's best copy sits at the right of its one-line summary (`4K HDR10 · Northlight`), once known.
- Resume and Continue watching follow 8.3.

### 5.9 No copy to play (`detail-nosources`)

Real case: Public Domain Movies answers *Night of the Living Dead* with one stream, `infoHash` only (verified), and the
provider doesn't have it. The page says why in one line, naming each add-on: `No copy to play. Public Domain Movies has
it only as a torrent, which airglow doesn't play. Northlight found nothing.` Play is replaced by `Look again`
(focused; asks every stream add-on again, skipping the cache), with Save. More like this stays.

---

## 6. Search (`search-addons`)

- **The provider first**, instant, as today (Top result, On TV, Movies and series).
- **From add-ons:** every enabled catalog with a `search` extra (Cinemeta's `top` for movies and series, Public Domain
  Movies'), asked after **3 letters and a 600 ms pause**, one request per catalog
  (`/catalog/movie/top/search=dune.json`, 56 ms here). The block's heading: `FROM ADD-ONS  Cinemeta · 12 more below`.
  Rows: a small poster, the name, `Movie · 2026 · not out yet` / `Series · 2024–`. A title the provider has is not
  repeated: it stays in the provider's block, and its line says `4K from Northlight` when that is its best copy.
- **States:** asking: the heading's caption is a spinner and `Cinemeta…`; no answer: `Cinemeta didn't answer`; no
  results: the heading isn't shown.
- **Keys:** Right from the keyboard enters the results (as today); ▼ past the provider's block enters the add-on block.
  OK opens the title page.

---

## 7. Subtitles from add-ons (plugs into `design/ui-v1/subtitles/`)

The subtitles design owns the Subtitles sheet, the player's Subtitles panel, timing, the checks and the defaults. Its
mocks already use OpenSubtitles through the Stremio add-on. This design widens "OpenSubtitles" to **every subtitle
add-on** and gives it the add-on copies' file details.

- **Who is asked:** every enabled add-on with the `subtitles` resource for the type and id prefix (OpenSubtitles v3 is
  in Stremio's default collection, verified). In order; all at once; 8 s each.
- **The request:** `/subtitles/{type}/{id}.json`, or with the copy's details when it has them:
  `/subtitles/movie/tt15239678/filename=<behaviorHints.filename>&videoSize=<behaviorHints.videoSize>&videoHash=<behaviorHints.videoHash>.json`
  (OpenSubtitles v3 answers this form, verified). Provider copies send `videoSize` once the check knows it.
- **The answer:** `subtitles[]` of `{ id, url, lang, label? }`; `lang` is ISO 639-2 and may be a regional code
  (`pob` = Portuguese, Brazil, verified). OpenSubtitles v3 also sends `subtitleFileName`, `movieReleaseName`,
  `releaseGroup`, `fpsMilli` (verified, not in the protocol): when `movieReleaseName` matches the playing copy's
  `filename` (release group and source), the subtitles design's row can say `Made for this copy` before any timing
  check. Files are SRT, UTF-8, served with CORS (verified).
- **Subtitles inside a stream object** (`stream.subtitles[]`) belong to that copy: a group `With this copy`, first.
- **Groups in the panel:** one per add-on, headed `FROM <ADD-ON NAME>` (the subtitles design's `FROM OPENSUBTITLES`),
  in add-on order, after the copy's own; the same language from two add-ons shows in both groups, the subtitles
  design's ranking within each.
- **Down or slow:** the subtitles design's states (`detail-subs-down`, `player-subs-down`), naming the add-on.

---

## 8. Playback (native: `PlayerActivity`, `player.js`)

### 8.1 What the player gets

`vodEntry()` gains, for an add-on copy:

| Field | From | Use |
|---|---|---|
| `url` | `stream.url` (http/https only) | as today; cross-protocol redirects already on (debrid links redirect) |
| `headers` | `stream.behaviorHints.proxyHeaders.request` | set on this entry's own `DefaultHttpDataSource.Factory` (`setDefaultRequestProperties`); a `User-Agent` here wins over Account's |
| `mime` | `behaviorHints.filename`'s extension, else the URL's | `MimeTypes` hint for `.mkv`, `.mp4`, `.ts`, `.m3u8` (debrid links often have no extension) |
| `source` | the add-on's name | the title block's line (`Northlight · 4K Dolby Vision`, the subtitles design's `player-start`) |
| `copies` | the ranked list's next 5 `{id, url, headers, label}` | 8.2 |
| `binge` | `behaviorHints.bingeGroup` | 8.4 |
| `key` | the IMDb id (`tt…` or `tt…:s:e`) | progress, 8.3 |

`proxyHeaders.response` and `notWebReady` are ignored: they exist for Stremio's own server and web player; ExoPlayer
plays MKV and TS directly.

### 8.2 A copy that fails (`player-source-failed`)

- **Before the first frame** (a 4xx/5xx, a timeout, a decoder error): the next copy starts at once with a toast
  `That copy didn't play · trying 4K HDR10 · Northlight`.
- **After it played**, once the player's own retries are spent: the card `This copy stopped at 1:12:40` /
  `Northlight's 4K Dolby Vision copy stopped sending. Your place is kept.`, the next best with a 3 s ring and where it
  starts (`starts at 1:12:30`, 10 s back), `Play it now` (focused) / `Choose another` (the Quality panel). Hint bar
  `OK Play it now · ◀ ▶ Move · Back Stop`.
- At most 3 automatic hand-overs per play; then the card lists the copies left.
- **Films and episodes only.** Live TV never switches by itself (UI-SPEC 6: the score delay). An add-on NBA replay is a
  replay (8.5): it switches like a film, with catch-up's ranking.

### 8.3 Continue watching across copies

- Progress is kept by **title** (`key` = the IMDb id; episodes `tt…:s:e`), not by copy, whenever the title has one.
  Provider-only titles keep today's key.
- Resuming on another copy starts 10 s earlier. If the copies' lengths differ by more than 3 min (another cut), it
  resumes at the same fraction of the film, with the toast `This copy is 6 min longer: picked up at about the same
  point`.
- Continue watching shows one card per title, whichever copy was played; OK resumes the copy last played, or the best
  if it is gone.
- The first time progress moves to the IMDb key, today's per-version progress is copied over (so nothing he's half
  way through is lost).

### 8.4 Up next keeps the source (`player-upnext`)

2 minutes before the end of an episode, airglow asks for the next episode's copies (if not cached). Up next plays the
copy with **the same `bingeGroup`** (same add-on, same quality); a provider episode's group is `provider`. The card says
`Same source: Northlight 4K`; with no match it takes the best and says `Best copy: 1080p · Your provider`.

### 8.5 Quality in the player (`player-sources`)

Options > Quality is the subtitles design's panel (`Always the best copy` first, then the copies), with each copy's
source on line 2 and `playing` on the current one. Same list and order as the title page. "Switching starts the other
copy where you are" (today's wording).

---

## 9. States

| State | Where | What it says / does |
|---|---|---|
| Add-on slow | title page, Search | `Still asking Kestrel` until 10 s; then it simply stops being named. Copies that come later join the list |
| Add-on returns nothing | title page | not named unless nothing at all came: then 5.9's line names it (`Northlight found nothing`) |
| Add-on returns only torrents | title page, Account | 5.9's line; after 20 titles with nothing playable, its Account state becomes `Catalog only` (or `Nothing airglow can play`) |
| Add-on not answering | Account (`state-addon-down`) | after 3 failures in 10 min: `Not answering` with the "!", line 2 says what came back and when it last worked (`Sends a web page, not an add-on · last worked Sat 24 Oct`); not asked for 30 min, then tried again. Real: Archivio's manifest now redirects to a docs page |
| Add-on gone (404 / not JSON for 7 days) | Account | `Gone since Sat 24 Oct · Remove it ›` |
| Catalog down | Movies (`movies-addon-down`), Home | the card of 4.2; a Home row keeps its last cards with `Cinemeta didn't answer · showing 18:40` as its caption |
| Configurable, needs setup | Account, the list | `Needs setup` / `Set up on your phone` → 3.7 |
| Stremio sign-in fails | code screen | the code expired: a new one appears with `The last code ran out. Here's a new one`; network down: `Can't reach Stremio · Try again` (focused) |
| Stremio signed out | Account | 3.3 (`Session does not exist`) |
| Phone can't reach the TV | phone screen | after 60 s with no visit: the wait card adds `Phone not getting through? It must be on the same Wi-Fi, not a guest network.` |
| The provider also has the title | everywhere | one card, the provider's page, add-on copies in its Copies list; add-on rows say `Also on your provider` (4.1) |
| Unsure match | title page | 4.4: the pill's caption and the picker |
| No internet | everywhere | the app's Offline bar; add-on rows and copies come from their caches, never a spinner |

---

## 10. The spoiler shield (`sources-shield`)

NBA replays from add-ons follow **catch-up SPEC 3 and 7** unchanged; this only says where add-ons fit.

- An add-on video matched to a hidden game by catch-up 3.3 (both teams, a date within a day of the ET date, not
  highlights) is a **full-game video**, source `<Add-on> add-on`, ranked with the provider's videos (catch-up 3.4).
- It joins the **sources sheet** (catch-up 5.6) and **Choose a video** (5.7) with the same masking: a name that could
  tell reads `Video naming the Grizzlies and the Jazz` / `Courtside add-on · Name hidden`.
- **No size and no length** for any copy of a hidden game, anywhere (the Copies menu included): either could tell
  overtime. The 64 KB check still runs; its length isn't shown.
- Add-on catalog cards and Search rows whose names name a hidden game's teams go through catch-up 5.8 (airglow's name
  and art, the game page instead of the title page).
- A replay never reveals (catch-up 6.10); its buzzer + 2 min marks it seen, as a provider video.

---

## 11. Data and protocol (what I verified, 27 Oct 2026)

### 11.1 The requests

| Resource | URL | Notes |
|---|---|---|
| manifest | `<base>/manifest.json` | `base` = the add-on link without `/manifest.json`; a configured add-on's base holds its settings (`https://host/<config>/manifest.json`) |
| catalog | `<base>/catalog/{type}/{id}.json` | extras in the path: `/catalog/{type}/{id}/{k=v&k=v}.json`, values `encodeURIComponent`ed (`genre=Sci-Fi&skip=50` verified) |
| meta | `<base>/meta/{type}/{id}.json` | unknown id: `{"meta":{"id":…,"type":…,"behaviorHints":…}}` with no name (verified for tt0000000): treat as none |
| stream | `<base>/stream/{type}/{videoId}.json` | movies: the IMDb id; episodes `tt…:s:e` |
| subtitles | `<base>/subtitles/{type}/{id}[/{extras}].json` | extras `filename`, `videoSize`, `videoHash` (7) |
| addon_catalog | `<base>/addon_catalog/{type}/{id}.json` | Stremio's lists (3.4) |

Every route must send `Access-Control-Allow-Origin: *` (protocol doc); all the add-ons I tried do. Requests use the
same fetch as the provider (`core.js` `fetchT`), with the timeouts of 5.4, 6 and 7, and follow redirects.

### 11.2 Verified, with timings from this sandbox (one request each; `data.json` `log`)

| What | Found |
|---|---|
| Cinemeta manifest | `com.linvo.cinemeta` 3.0.14; resources `catalog, meta, addon_catalog`; types `movie, series`; idPrefixes `tt`; catalogs `top` (Popular: genre, search, skip), `year` (New: **genre required**, 107 options that are years), `imdbRating` (Featured), `last-videos` and `calendar-videos` (required extras: not rows); `behaviorHints.newEpisodeNotifications`. 244 ms |
| Cinemeta catalogs | **307 redirect** to `cinemeta-catalogs.strem.io` (search isn't redirected); pages of **49 to 50**, not 100; metas carry `id, name, releaseInfo, poster, background, description, runtime, genres, imdbRating` and more. 90 to 600 ms |
| Cinemeta search | `search=dune`: 19 movies (Dune 2021, Dune: Part Three 2026, Dune: Part Two 2024, Dune 1984…), 5 series. 50 ms |
| Cinemeta meta | Dune: Part Two: `moviedb_id 693134`, `runtime "167 min"`, `trailerStreams[].ytId`, `logo`, `background`. The Bear: 47 `videos`, seasons 0 to 5, `id "tt14452776:3:5"`. Cast with `&apos;` entities |
| Images | `images.metahub.space/poster/small|medium/<tt>/img` (34 / 51 KB), `background/medium` (770 KB: ask for `small` on cards) |
| OpenSubtitles v3 | resources `subtitles` only; 89 to 95 files for a film in 30+ languages (ISO 639-2, `pob`); per-episode ids answer; the extras form answers; SRT UTF-8 with CORS. 45 to 250 ms |
| Public Domain Movies | catalog `publicdomainmovies` (no `name`), extras `skip, search`; 34 films; **streams are `infoHash` + `fileIdx` only**; answers carry `cacheMaxAge 604800`, `staleRevalidate`, `staleError` |
| WatchHub | `externalUrl` streams with `name` (service), `title` (`Rent, Buy` / `Subscription`) and `androidTvUrl` (`intent://…`) |
| A direct-link add-on | Anthony Bourdain Fans (DailyMotion): `{"title":"HTTP URL","url":"https://…m3u8"}`: no `name`, no `behaviorHints`, so quality unknown until the check. Its manifest uses **object resources** (`{name:"stream", types, idPrefixes}`) |
| Archivio | its manifest now redirects to a docs web page (retired): the "not an add-on" state |
| Stremio list | `addon_catalog/all/official.json` 7, `…/community.json` 97: 44 give subtitles (23 need setup), 19 streams, 40 catalogs; 48 need setup in all |
| Stremio API | `addonCollectionGet` with no key: the default collection (Cinemeta, YouTube, WatchHub, Public Domain Movies, OpenSubtitles v3, OpenSubtitles legacy `/stremio/v1`, Local Files `127.0.0.1:11470`), each `{manifest, transportUrl, flags:{official, protected}}`; a bad key: `code 1 "Session does not exist"`; `login` with an unknown email: `code 2 "User not found", wrongEmail: true`; CORS preflight answered with `*` |
| Link codes | `GET link.stremio.com/api/v2/create?type=Create` → `{result:{success, code, link, qrcode}}` (4-letter code); `link.stremio.com/<code>` → 302 to `stremio.com/login?code=<code>`; `read` while waiting → `code 101 "Invalid or expired token"`; the success shape `{result:{authKey}}` is from stremio-core (`src/types/api/response.rs` `LinkAuthKey`), polled the way its `Link` model does |
| Protocol docs | the SDK's `stream.md`, `manifest.md`, `subtitles.md`, `protocol.md`, `defineCatalogHandler.md`, `advanced.md` (configure pages, `stremio://` install links) |

### 11.3 Stored

| What | Kept |
|---|---|
| The add-on list | settings, per account: `{ url, manifest (cached 24 h, refreshed in the background), on, order, catalogs:{id:{home, lib}}, from:'stremio'|'here', health }` |
| The Stremio key | scoped storage, like the provider's password |
| Catalog pages | IndexedDB, 6 h, stale while revalidating |
| Metas | 7 days, last 500 |
| Streams | 30 min, last 50 titles |
| Subtitles lists | 2 days (the subtitles design) |
| IMDb picks, match results | settings, with the catalog's `PREP` bump for the new match |
| Copy checks | the subtitles design's cache |

An add-on's link is a secret when it has a config part: it is never logged, never sent anywhere but its own host, and
shown as its host only (audit: SECRET).

### 11.4 Turning a stream into a copy (`toCopy(stream, addon)`)

1. Drop it unless `url` is `http(s)://` and not `127.0.0.1:11470` (rule 0). `externalUrl` → 5.6; `ytId` → trailer.
2. Read `name`, `description` (or the old `title`) and `behaviorHints.filename` together:
   - picture `2160p|4k|uhd` → 4K, `1080p`, `720p`, `480p|sd`;
   - range `dv|dolby ?vision` → DV, `hdr10\+`, `hdr10|hdr`, `hlg`;
   - kind `remux|blu-?ray|bdrip` → Blu-ray, `web-?dl|webrip|web` → web copy, `hdtv` → TV copy,
     `cam|hdcam|ts|telesync|hdts` → cinema recording;
   - sound `atmos`, `truehd`, `dts`, `ddp?5\.1|5\.1`;
   - size `videoSize`, else `(\d+(\.\d+)?)\s?(GB|MB)`;
   - language: flag emoji and words (`ita`, `french`, `multi`, `dual`), else unknown;
   - debrid names in brackets (`[RD+]`, `[AD]`…) are dropped from what shows; a "not cached yet" marker in the name
     (`download`, `⏳`) ranks the copy last and labels it `not ready yet`.
3. The check (the subtitles design) then replaces claims with facts and ticks them.

### 11.5 Couldn't verify

A real debrid add-on's answers (no account), a successful link-code or email sign-in (needs a real account), the
expiry of a link code, ExoPlayer on debrid redirect links, the Wi-Fi page on the owner's router (guest networks block
it), and Dolby Vision on the 55OLED810. Each has a check in section 12.

---

## 12. Port checklist

1. **`scripts/build-ratings.js`:** add `tconst` to each row (`v: 2`); `catalog.js` `matchImdb` returns `{id, r, n, g}`;
   the sure/likely/unsure levels of 4.4; `core.js` keeps Xtream's `tmdb_id`.
2. **`app/addons.js`** (new, shared like `core.js`): the list, manifests, the six requests of 11.1 with timeouts,
   redirects, the 6-at-once limit, health (9), caches (11.3), `toCopy` (11.4), Stremio link codes, login and
   `addonCollectionGet` (read only), the in-step sync.
3. **Account:** the Add-ons group (3.1), the sheet, the catalog menu, Move, the four ways and their screens (3.2 to
   3.7); a pushed screen for Stremio's list.
4. **`TunerPlayerPlugin`:** the Wi-Fi page server (`startPhonePage({token,code})` → events `phone-visit`,
   `phone-sent {url}`; `stopPhonePage()`); the page itself as one HTML asset. The first-run phone sign-in can use it
   too.
5. **Home and Movies/Series:** add-on rows (4.1) and chips (4.2), the merge by IMDb id, the hold-OK menus.
6. **Title page:** add-on copies into the subtitles design's Version pill and Copies menu; 5.3 ranking; 5.4 asking;
   5.5 Play wait; 5.6 other apps; series union (5.8); 5.9.
7. **Search:** the From add-ons block (6).
8. **Subtitles:** the subtitles design's panel takes every subtitle add-on as a group (7).
9. **`player.js` / `PlayerActivity`:** per-entry headers and MIME hint (8.1), failure hand-over and its card (8.2),
   progress by IMDb key with the one-time copy-over (8.3), Up next by `bingeGroup` (8.4), Quality with sources (8.5).
10. **The shield:** add-on videos into catch-up's `replaySources` and masking (10).
11. **Tests:** `tests/tv/serve.sh` gets a fake add-on (manifest, one catalog, streams that are `url`s to the fake
    provider's sample file, one `infoHash` stream that must not show, one `externalUrl`, subtitles) and a fake Stremio
    API (link create/read, `addonCollectionGet`); `drive.js` scripts for each surface; the emulator test plays an
    add-on copy and checks that the torrent copy is absent.
12. **On the TV (the owner):** sign in with the code; add his debrid add-on; play a 4K copy; force a failure (turn the
    Wi-Fi off and on) to see the hand-over; open the Wi-Fi page from his phone.

---

## 13. Self-check (`node tools/audit.js`; ring data in `tools/audit-rings.json`)

The catch-up audit, run on all 30 mocks: one ring, text under 14 px, text overlaps, clipping, the safe area, contrast,
floating boxes inside y 27 to 513 and x 48 to 912, CONTAIN, TRUNC, RING (the ring read back from the 2x screenshot on
every side), SHIELD and SPOILER on the shield mock. **Two new checks:**

- **JARGON:** a mock fails if the screen shows a protocol word (`infoHash`, `magnet`, `bingeGroup`, `proxyHeaders`,
  `behaviorHints`, `idPrefixes`, `JSON`, `API`, `transport`, `resource`, `P2P`, `HEVC`, `x265`, `remux`, a `tt` id…).
  `manifest.json` is allowed.
- **SECRET:** a mock fails if a link with a long path part (a configured add-on's settings) is shown in full.

**Proof they fire:** `--inject` adds a line with `infoHash` and a full configured link to every page, plus catch-up's
score, remaining time and focused Reveal to the shield mock: JARGON and SECRET fire on all 30 pages (60 findings), and
SHIELD and SPOILER fire on `sources-shield`.

**Result: 30 pages, 0 findings.** Every ring is 100% white on all four sides.

Fixed during the work, from the audit and my own look at every PNG:
- two rings under a sheet (the opener kept its ring) in three mocks;
- the separator element breaking card meta lines (`2026` / `·` / `Comedy` on three lines): cards use a text ` · `;
- a menu crossing y 513 (`detail-match`, 527); the phone frames overlapping; the series row not scrolled to its focused
  episode; a 12 px badge with 6 letters (`Add-on`, now 14 px);
- the audit itself: the credits line ellipsises its own spans (as `detail.js` does), and a one-line Outfit title has 3
  px of descender; both are exempt, and the plot's clamp is by design (UI-SPEC 5.6).

| Mock | Focused | Ring box | To the safe edge |
|---|---|---|---|
| acct-addons | Northlight row | 267, 215, 911, 277 | 1 |
| acct-addon-sheet | Popular movies | 508, 233, 896, 291 | 16 |
| acct-catalog-menu | On Home | 158, 198, 462, 256 | 110 |
| acct-addon-move | Northlight, lifted | 261, 272, 917, 336 | −5.4 (the 1.02 lift; inside the 6 px allowance) |
| add-ways | Use your Stremio account | 192, 144, 768, 218 | 117 |
| add-stremio-code, add-phone | the fallback button | 680, 429, 896, 475 | 16 |
| add-stremio-found | Add 5 add-ons | 614, 275, 826, 331 | 86 |
| add-stremio-email | Email field | 43, 137, 573, 195 | −5 (ring in the margin) |
| add-list | the first row | 43, 179, 917, 241 | −5 |
| add-confirm | Add it | 238, 327, 379, 383 | 130 |
| home-rows | Tenzing | 265, 204, 483, 320 | 177 |
| home-row-menu | Save to Saved | 272, 334, 601, 392 | 121 |
| movies-addon | Tenzing | 188, 166, 328, 372 | 139 |
| movies-addon-down | Try again | 322, 391, 491, 447 | 66 |
| search-addons | Dune: Part Three | 427, 331, 917, 397 | −5 |
| detail-sources, -addon-only, -nosources, -play-wait | the first button | 45, 244, 173, 300 | −3.3 (lift from the left edge) |
| detail-sources-sheet | Always the best copy | 56, 75, 640, 145 | 8 |
| detail-series | E5 | 491, 310, 711, 438 | 75 |
| detail-match | Dune · 2021 | 56, 116, 580, 186 | 8 |
| player-source-failed | Play it now | 210, 387, 368, 435 | 78 |
| player-sources | 4K HDR10 (inset) | 59, 220, 437, 270 | 11 |
| state-addon-down | Archivio | 267, 407, 911, 469 | 1 |
| sources-shield | NBA League Pass 4 | 508, 103, 896, 177 | 16 |
| add-setup, phone-page, player-upnext | nothing (by design: a progress card, the phone, Up next) | – | – |

**Couldn't check:** the real TV (rings on OLED, 14 px from the sofa), real debrid answers, real sign-ins (11.5).

---

## 14. Decisions, and questions for the owner

**Decided here:**
- Add-ons add to the provider; nothing of the provider's is hidden or replaced.
- Direct links only; torrent-only add-ons say so in plain words (rule 0).
- Adding without typing: the Stremio account first, Stremio's list on the TV, the Wi-Fi page from the phone; typing
  last. No hosted page, no relay server.
- airglow reads the Stremio account and never writes to it.
- One IMDb match, shared with subtitles; never guessed.
- One Copies list (the subtitles design's), best first, Play takes the top; picks are per title.
- A failed film copy hands over to the next by itself; live TV never does.

**Questions for the owner:**
1. Do you have a Stremio account, and a debrid service (Real-Debrid or similar)? Which add-ons do you use? (That decides
   what we test first.)
2. When a 4K copy might still be coming, should Play wait up to 4 seconds for it (as designed), or always start at once?
3. Two add-on rows on Home by default (Popular movies, Popular series): more, fewer, or none until you pick?
4. When your provider and an add-on have equally good copies, should your provider's come first (as designed)?
5. "Keep in step with Stremio" is on by default, so add-ons you install in Stremio on your phone show up here. OK?
6. Later, should airglow also bring over your Stremio watch history (Continue watching)? Not designed yet.
