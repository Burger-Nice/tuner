# Add-ons: the native player's side (the protocol)

The web side of add-ons is built (`app/tv/js/addons.js`, `imdb.js`, `titlecopies.js`, `copies.js`, `qr.js`,
`screens/addons.js`, and the Account, Movies/Series, title page and Search changes). This file is what
`PlayerActivity` / `Diag` / `VodControls` / `TunerPlayerPlugin` need to do for SPEC.md sections 3.5, 5.6 and 8, and the
exact messages between them and the app. Nothing here changes live TV or replays.

**Secrets.** An add-on copy's `url`, and its `headers`, can hold a debrid key (resolve links carry it in the path).
Never write them to Logcat, a crash report, a toast, the diagnosis, the Connection panel or any Check screen. Show at
most the host. The app never sends them anywhere but to the player.

## 0. Turning it on: `TunerPlayer.info()`

| Field | When | What the app does |
|---|---|---|
| `addons: true` | the player reads the entry fields of 1 and speaks 2 and 3 | (today it plays add-on copies through plain VOD mode: the `url` only, no headers, no hand-over) |
| `phonePage: true` | 5 is built | Account > Add-ons offers **Send a link from your phone** (until then it reads `Comes with the next airglow update`) |
| `openApp: true` | 6 is built | **Watch in another app** and **Trailer** open apps (until then a toast says it comes with an update) |
| `region` | always, when known | the TV's own region from Android Settings (`Locale.getDefault().getCountry()`, alpha-2 or alpha-3). It filters `countryWhitelist` streams (SPEC 5.4, v1.2). Unknown or absent: nothing is filtered |

## 1. What an entry carries: `play({ mode: 'vod', entries })`

`player.js vodEntry()` now spreads an entry's extra fields (`it._entry`) into the entry. For **an add-on copy**:

| Field | Type | Use |
|---|---|---|
| `id` | `movie:tt9000001`, `episode:tt…:4:1` | as today: the key of `progress`. For an add-on copy it is the **title's IMDb key** (SPEC 8.3) |
| `url` | string | `stream.url`, http(s) only. Debrid links redirect (cross-protocol redirects are already on) |
| `headers` | `{ name: value }` or null | `behaviorHints.proxyHeaders.request`. Set them on **this entry's own** `DefaultHttpDataSource.Factory`; a `User-Agent` here wins over Account's `ua` |
| `mime` | `video/x-matroska`, `video/mp4`, `video/mp2t`, `application/x-mpegURL`, … or '' | a `MimeTypes` hint from the file name's extension, else the link's |
| `source` | `'provider'` or the add-on's name (`Northlight`, `Torrentio · RD`) | the title block's line, the hand-over card's wording, **Diag's checks and wording (2.3)** |
| `sourceKind` | `'provider'` \| `'addon'` | the same, without parsing names |
| `copyKey` | `cp:<add-on key>:<hash>` | this copy's identity (never its link) |
| `copies` | `[{ key, source, label, provider }]` | **the next 5 copies in rank order, as identities, not links** (RANKING.md 2). `label` is `4K · HDR10 · Blu-ray`. Ask for a link with `need: copy` (2.1) |
| `binge` | string | `behaviorHints.bingeGroup` (Up next, 3) |
| `key` | `tt…` or `tt…:s:e` | the IMDb key |
| `runtime` | seconds | a film: Cinemeta's runtime; an episode: the provider episode's own length, else 0. **The not-ready rule (2.2)** |
| `label` | string | this copy's first line in the Copies menu, for the player's Quality panel |

A **provider copy** played from a title that has add-on copies gets `source: 'provider'`, `sourceKind: 'provider'`,
`copyKey` and `copies` too, so a failed provider copy can hand over to an add-on one.
`proxyHeaders.response` and `notWebReady` are ignored (they are for Stremio's own server and web player).

## 2. A copy that fails, or isn't ready (SPEC 8.2)

### 2.1 Getting the next copy's link: `need` → `copy`

| Direction | Message | Fields |
|---|---|---|
| player → app | event `need` | `{ what: 'copy', key }` (one of `entry.copies[].key`). With `key: null` and `speedMbps` (Diag just measured the Wi-Fi or internet) the app re-ranks with that speed (RANKING.md band b) and answers with the best copy that fits |
| app → player | command `copy` | `{ key, entry }`: an entry as in 1 (the link resolved now; debrid links expire) · or `{ key, error: 'gone' }` |
| player → app | event `copy-failed` | `{ key, cause }`: the copy didn't play on this TV this session (band e: it drops to the bottom, `didn't play on this TV`) |
| player → app | event `copy-notready` | `{ key }`: the copy was a placeholder (band e, `wasn't ready yet`) |

### 2.2 The rules the player applies

- **Before the first frame** (an HTTP error, a timeout, a decoder error, Dolby Vision profile 7 on a TV that can't):
  the next copy starts at once, with the toast `That copy didn't play · trying 4K · Dolby Vision · Northlight`.
- **Not ready** (RANKING.md 2.2), decided once the duration is known:
  - a film: shorter than 50% of `runtime`;
  - an episode: shorter than 50% of `runtime` when it is not 0, else shorter than 180 s;
  - never against a series runtime (the app never sends one).

  The card reads `That copy isn't ready yet` / `Northlight sent a short "still downloading" clip instead of the film.`,
  the next copy plays in 3 s, and **no progress is saved**: send no `progress` events for it, and if the player closes
  on it, send `exit` with `d: 0` (the app's `recordProgress` ignores a zero duration). Send `copy-notready`.
- **After it played**, once the player's own retries are spent: the card `This copy stopped at 1:12:40` /
  `Northlight stopped sending its 4K Dolby Vision copy. Your place is kept.`, the next best with a 3 s ring and where it
  starts (`starts at 1:12:30`, 10 s back), `Play it now` (focused) / `Choose another`; hint bar
  `OK Play it now · ◀ ▶ Move · Back Stop`.
- **Which copy is next:**
  - a **source-wide** failure (a timeout, 5xx, refused, stopped sending): the next in `copies` from **another source**;
  - a failure of **one copy** (a placeholder, a decoder or a profile it can't play): simply the next in `copies`, even
    from the same add-on;
  - a **Wi-Fi or internet** cause from Diag: `need { what: 'copy', key: null, speedMbps }` (2.1);
  - from one **provider** copy to another: wait for Diag's provider retry first (`Diag.closedAt`), so a 1-connection
    account isn't refused.
- **At most 3 automatic hand-overs** per play; then the card lists the copies left (`Choose another`).
- **Resuming on another copy** starts 10 s earlier (the progress key is the title's, so the position carries over).
- **Live TV and replays never hand over.**

### 2.3 Diag (SPEC M6)

For an entry whose `sourceKind` is `'addon'`, Diag **skips** the Xtream account check, the connection-limit causes
(401, 403, 458, 509, "max connections") and "Your provider account has ended", and names the add-on instead:
`Northlight refused this copy`, `Northlight isn't answering`. The hand-over card wins over Diag's cards for films and
episodes; a Wi-Fi or internet cause becomes its first line (`Your Wi-Fi is too slow for this copy`). The `diag` event to
the app keeps its fields; add `source`.

## 3. Up next keeps the source (SPEC 8.4)

| Direction | Message | Fields |
|---|---|---|
| player → app | event `need` | `{ what: 'next', binge, now? }` for an episode whose entry has `sourceKind: 'addon'` and nothing after it (today's `queue` of provider episodes stays as it is): **5 s after its first frame**; again while nothing is lined up (no answer in 30 s, or no copy: after 1, 2, 4, then every 5 min, and once in the last 3 min); and with `now: true` when he asks for the next one (the end card's OK, the row's `Next episode`, CH+), which then plays as soon as it comes |
| app → player | command `next-info` | `{ title, sub }`: what comes next (`S1 · E4 · Thaw`), sent before its copies are asked, so the end card can name it; or `{ last: true }`: this is the series' last episode out (the row's `Next episode` goes, the end closes the player) |
| app → player | command `queue-next` | `{ entry, same, say }`: the next episode's entry (1), the best copy that plays (not failed, not a "still downloading" one), the same `binge` when one does. `same` is true when it has the same `binge` (a provider episode's group is `provider`); `say` is the card's line: `Same source: Northlight 1080p`, or `Best copy: 1080p · Your provider`. Or `{ none: 'last' \| 'nocopy' \| 'unknown', say }`: nothing to line up (a later ask tries again; an ask that found nothing is asked of the add-ons afresh) |
| player | the end | an add-on episode that ends with nothing lined up and not `last` doesn't close: the end card (skip SPEC 5.1) names the next one from `next-info`; OK asks with `now` and plays it when it comes (`Getting the next episode…`, or `No copy of it yet · OK tries again`); Back, 5 min with no key, or `last` closes. A copy that comes while the card is up waits for OK |

## 4. Options > Quality (SPEC 8.5)

The subtitles design's panel, **384 wide**, with each copy's source on line 2 and `playing` on the current one. For an
add-on film it lists the playing copy (`label`, `source`) and `entry.copies`; picking one is `need: copy` and then a
normal switch at the current position. The playing add-on copy gets its tick once checked as it starts; a failed one is
last and dimmed.

## 5. The page the TV serves on the home network (SPEC 3.5)

| Call / event | What |
|---|---|
| `TunerPlayer.startPhonePage({ token, code, port: 8790 })` → `{ address }` | starts a tiny HTTP server on the TV's home-network address (Wi-Fi or Ethernet), **only while this screen or the setup card is open**; `address` is `192.168.1.23:8790`. Calling it again with a new `code` keeps the server and swaps the code |
| `GET /<token>` | the page (one HTML asset in the APK, `design/ui-v1/addons/phone-page.html`): `Send to your TV`, a paste field, `Send to the TV` |
| `GET /` (no token) | the page asks for the 6-digit `code`; **5 wrong codes lock it** (event `locked`; the app shows a new code) |
| `POST /<token>/send` `{ url }` | under 2 KB; accepts only `http(s)://…/manifest.json` and `stremio://…/manifest.json` (rewritten to `https://`); answers `Sent` |
| events, `addListener('phone', e)` | `{ type: 'visit' }`, `{ type: 'sent', url }`, `{ type: 'locked' }` |
| `TunerPlayer.stopPhonePage()` | closes it. The app also calls it on Back; close it yourself after 10 minutes |

**Nothing is added on the phone's word:** the app shows the confirm (SPEC 3.6). The link travels in plain http on the
home network (the same trust as the first-run phone sign-in).

## 6. Opening another app (SPEC 5.6)

`TunerPlayer.openApp({ uri })` → `{ ok }`:
1. `Intent.parseUri(uri, Intent.URI_INTENT_SCHEME)` for `intent://…`; `ACTION_VIEW` for other schemes
   (`vnd.youtube:<id>` for trailers, `https://…`);
2. clear `component` and `selector`, add `CATEGORY_BROWSABLE` (Chrome's rule for untrusted intents);
3. `startActivity`;
4. `{ ok: false }` when nothing takes it (the app says `That app isn't on this TV`). No browser fallback.

## 7. The emulator test (SPEC 12.11)

The fake add-ons are on the fake provider's port (`tests/mock-addons.js`); their links follow the request's `Host`, so
from the emulator they are `http://10.0.2.2:8899/addon/…`. Point the app at them before the add-on steps:
`localStorage` `tuner.cinemetaBase` = `http://10.0.2.2:8899/addon/cinemeta`, `tuner.stremioApi` =
`…/stremio-api`, `tuner.stremioLink` = `…/stremio-link`, `tuner.ratingsUrl` = `…/ratings.json`, and add the fake
Stremio account's add-ons (as `tests/tv/addons-common.js` does). Then:
- **The Long Night** (film 5000): Play plays Northlight's 4K remux link (`/addon-media/<key>/remux.mkv`, the test
  movie) with `User-Agent: Northlight/1.0`; the torrent, magnet and `127.0.0.1:11470` copies are absent from the
  entry's `copies`;
- pick the **4K web copy** (`short.mp4`, 30 s; Cinemeta's runtime is 2 min): it hands over as not ready, and no progress
  is saved for it;
- `tests/make-media.sh` now makes `short.mp4`.
- **Account has a new group, Add-ons, right after Provider.** `tests/android-test-boot.js`'s last Account steps
  (`DPAD_LEFT, DPAD_DOWN, DPAD_DOWN` to reach NBA) now land one group earlier; they carry no check, but their
  screenshots change. Clicking the group (`.gl[data-g="nba"]`) is steadier than counting presses.

## 8. What the web side already does for these

- Ranks every copy (RANKING.md 2), puts failed / not-ready copies (from `copy-failed` / `copy-notready`) at the bottom
  for the session, resolves `need: copy` and `need: next` (`titlecopies.js`), resumes Continue watching on an add-on
  copy by asking again for the same identity (else the best), and never stores a link.
- Up to `addons: true`, an add-on copy plays through today's VOD mode with its `url` only.
