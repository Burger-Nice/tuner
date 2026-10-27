# Subtitles and real quality: the hooks for the UI round

What the title page, the posters, Continue watching, Saved and the player's JS side call. Everything is in
`app/tv/js/subs.js` (wiring) and `app/tv/js/subs/` (plain functions). The looks and words are `SPEC.md` 4 and 7 and the
mocks; the native side is `PORT-NATIVE.md`.

```js
import { prepare, subState, forPlayer, forgetSubs, subSettings, saveSubSettings, subMemory,
         checkCopies, leaveCopies, checkFor, checkedFor, probeStatus, playable, cancelChecks, noteStart, setPreviewing } from './subs.js';
import { on } from './state.js';
on('subs', (titleKey) => …);      // a title's subtitle state changed: redraw its pill, slot and sheet
on('probed', (copyKey) => …);     // a copy's check finished: redraw tags, the Version pill, the Copies menu
on('subs-settings', () => …);     // Account > Languages changed something
```

## 1. Quality checks (`SPEC.md` 5.3)

| Where | Call | Notes |
|---|---|---|
| A title page opens | `checkCopies(versions, 'title')` | the provider versions in name-best order (`copies.js rank()` on their claims); they run at once, one at a time |
| It closes | `leaveCopies(versions)` | its copies drop to the background |
| Continue watching is drawn | `checkCopies(rows.map((p) => p.item), 'continue')` | 60 s apart |
| Saved is drawn | `checkCopies(films, 'saved')` | 60 s apart, after Continue watching |
| Posters, filters, Search | **never ask**: only `checkedFor(v)` | they fill in slowly by design |
| Play (any) | `cancelChecks()` before `playVod` / `playLive` | the native side also cancels on `play()` |
| The player's start event (size, ETag) | `noteStart(v, { size, etag })` | true → the copy is checked again later |
| A live preview starts / stops | `setPreviewing(true / false)` | counts as a stream in use |

**What a check found**, for `copies.js providerCopy(v, { checked: checkedFor(v) })`: `{ res, hdr, dv, dvProfile, mbps,
lang, taggedSound, len (s), fps, w, h, ch, atmos, subsInFile, inFile }` (`probes.js checkedOf`). `taggedSound` is the
`isDub()` input c (never the untagged `eng`).

**The Copies menu's line 2** from `checkFor(v)`:
- `null` → `Not checked yet`; `probeStatus().why` says why nothing runs (`streams in use`, `account in use`,
  `today's checks are used`, `backing off`, `refused twice today`) for the dashed "4K · not checked".
- `status 'couldnt'` → `Couldn't check: your provider was busy`.
- `status 'head-only'` with no `formats` → `Couldn't check: your provider doesn't allow a quick look`; with formats it
  is checked (tags filled), just without a fingerprint.

**Plays on this TV:** `const pm = await playable(versions)`; then `copies.js rank(cs, { …, playsNow: (c) => { const x =
pm.get(c.id); return x ? x.video && x.audio : undefined; } })`, and `x.reason` gives "No sound on this TV" / "This TV
can't play its picture".

**The IMDb match learns the length:** on `probed` for the title's default copy,
`imdb.js noteLength(title, checkedFor(v).len / 60)` (it turns Likely into Sure, or drops a wrong match), then
`prepare()` again.

## 2. Subtitles for a title (`SPEC.md` 3, 4.2, 4.4)

```js
const m = await matchTitle(title, info);                 // imdb.js (RANKING.md 4)
const st = await prepare({
  key: keyOf(title),                                      // 'movie:123'
  name: title.name, imdb: m.id, level: m.level, runtime: m.meta?.runtime,   // minutes, for the Likely re-check
  version: defaultVersion(title),                         // the copy Play plays (its check gives fps, length, tracks, fingerprint)
  soundLang: copyLang, dub: isDub({ … }),                 // copies.js
});
```
An episode adds `season, episode, series: keyOf(series), episodeKnown` (false when Cinemeta's `videos[]` lacks it) and
passes the series' id and level. Fetch an episode's list after its tile has had focus 1 s, or on Play.

`prepare()` resolves with the state, and emits `'subs'` first with `status: 'looking'`, then with the result. It runs
again by itself when the copy's check lands (`probed`) and at the add-on's retry time (60 s, then every 5 min) while the
title is the last one asked for; `forgetSubs(key)` stops that when the page closes. `subState(key)` reads the last one.

**The state:**

| Field | What |
|---|---|
| `status` | `looking` · `ready` · `none` (nothing in his languages) · `down` (the add-on is down or slow) · `unsure` (ask which film) · `wrong-film` (a Likely match was 8% off) · `file-only` (OpenSubtitles off, a dub with no id, an episode not in Cinemeta) |
| `pill` | the Subtitles pill: `Subtitles: Icelandic` · `Subtitles: Off` · `Subtitles: looking…` (dashed) · `Subtitles: none found` · `Subtitles: none yet` (dashed) · `Subtitles: which film is it?` |
| `side` | this design's slot text (priority 3; the time left and "Still asking …" win, SPEC 4.2): `From OpenSubtitles · English ready too` · `In the file · Icelandic from OpenSubtitles` · `From OpenSubtitles · No Icelandic for this film` · `OpenSubtitles isn't answering · trying again at 21:31` · `Not in the file, none on OpenSubtitles` · `These subtitles were for another film` |
| `on` | `{ lang, source: 'file' \| 'opensubtitles', track?, file? }` or null (Off, a dub, or Only-when-not-your-language) |
| `offReason` | `off` · `dub` · `your language` · '' |
| `langs` | the sheet's YOUR LANGUAGES rows, in his order: `{ lang, source, fileId, sounds, ready, verdict, words, anchored }`. `words` is line 2 (`Made for this copy`, `Lined up with this copy`, `Lined up with other subtitles`, `Timing fixed to fit this film`, `Timing not checked`, `Its file doesn't say the language`); **a tick only when `anchored`** |
| `others` | the other languages' names, for `Other languages · n` |
| `missing` | his languages with none ("No Icelandic for this film") |
| `retryAt` | when the add-on is asked again (`down`) |
| `note` | the one line for `wrong-film` |

**The sheet's picks:** a row → `subMemory().setPick(key, { source, id: fileId | 'track:<lang>', lang })`, then
`prepare()` again isn't needed (the pick is read by `forPlayer`). Off → `setPick(key, { source: 'off' })`.
**Match it again** → `imdb.js pickMatch(title, id)` then `prepare(...)`.
**Account > Languages** is built (`account.js`): `subSettings()` → `{ mode, langs, shown, sounds, online }`.

## 3. The player's JS side (`player.js`, with the native engineer)

- After `playVod()` answers: `cmd('subs', forPlayer(keyOf(item), { copyId: keyOf(version), series }))` (PORT-NATIVE 2.2),
  and on `need { what: 'subs' }` again.
- `playerSettings()` gets `subs: { mode, langs: [ISO 639-1…], shown, sounds, dub }` from `subSettings()`
  (`subs/lang.js NAME_ISO1` maps the names) in place of today's single `sub`.
- `setting` events: `subtime` → `subMemory().setOffset(title, copy, sub, value, { series, release })`; `subpick` →
  `subMemory().setPick(title, value)`. `subMemory().noteBigChange(title)` after a change over 3 s; true → the fourth line
  "Still off? ▼ Another file".
- Options > Quality: rows from `rank()` with `checkedFor` and `playable`, never a stream.

## 4. What is tested and what isn't

- Node: `tests/subs-parse.js`, `subs-timing.js`, `subs-choose.js`, `subs-hash.js`, `subs-probes.js`, `subs-prefs.js`.
- Browser: `tests/tv/subs-account.js` (the Languages rows and the move), `tests/tv/subs-hub.js` (`prepare()` with
  Oppenheimer's real list and its files' real timings: `Subtitles: Icelandic`, `From OpenSubtitles · English ready too`,
  the Icelandic file at 25/23.976; the add-on down; an unsure match; a dub; one browser fingerprint of the fake film).
- Not yet: anything on screen beyond Account, and anything native.
