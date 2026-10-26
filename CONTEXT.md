# airglow: the whole story so far

Everything a new session needs that isn't obvious from the code: what was asked, what was decided and why, what
shipped, and how the owner likes to work. Read this, then `CLAUDE.md` (how the code fits together, the rules) and
`NEXT.md` (what's next). The project ran in one long Claude Code cloud session from 24 to 26 Oct 2026.

## The owner

- Builds this for himself. Mainly watches NBA, above all the **Memphis Grizzlies**, on a **Philips 55" OLED Ambilight
  4K, 55OLED810/12 (Google TV)** with the remote. Also has a Windows laptop and an iPhone.
- Writes casually and fast ("fuck yeah", "fireee", "release baby"). Likes big ambition and top-notch polish, and wants
  plain answers. Tests on the real TV and reports with photos. Has the Max plan, so cost isn't a worry, but don't waste.
- Enjoys the agent-team way of working: specialist agents (brand designer, UI/UX designer, engineer, reviewers, bug
  hunters) that critique and score each other's work.

## How it got here (timeline)

**24 Oct, "can we make an IPTV player real quick, everything I find is so lame".**
- Built "Tuner": an Electron Windows app with Xtream Codes, M3U and mpv playback, self-updating from GitHub releases.
- Added live NBA scores, box scores and play-by-play from ESPN's public JSON, in team colours, with a score delay so the
  score doesn't run ahead of the stream. 4K/HEVC playback. A first logo (scanline T).
- Added an iPhone app (Capacitor) released through AltStore.

**25 Oct, "now I got my TV, it's Google TV Philips".**
- Added the Android/Google TV app: a Capacitor WebView UI with a native **Media3/ExoPlayer** player
  (`android/app/src/main/java/app/tuner/player/`), always the top quality, plus a 4K/HDR badge.
- The APK is signed with a key kept encrypted in the repo. Its password lives only in the `TUNER_KEY_PASSWORD` GitHub
  secret. The owner offered to make the repo private or commit the password; the answer was no, keep it in the secret.
- Self-update on the TV from `android.json` in the latest release. An Android TV emulator test runs in CI.
- The owner wanted separate builds per device after a "Layout" switch got stuck zoomed on the TV. Now each build is
  locked to its device (`scripts/build-web.js tv|phone`).
- Remote-first TV layout:
  - The keyboard only opens when OK is pressed on a field.
  - The update prompt is reachable with the remote.
  - Subtitles, picture size and Match frame rate.
  - A Popular sort plus filters.
  - IMDb ratings (from IMDb's free datasets) for Popular and Top rated.
  - A new Account page.
- The owner asked for "agents that work together, one UI/UX expert, one QoL expert…, they review and rate". So:
  - **Audits:** a UI/UX audit (5.0/10), a speed/memory audit, and fixes from both.
- **Brand:**
  - **Agents:** a brand agent ("Fable" at first, then Sonnet because Fable was expensive) plus an independent UI reviewer.
  - **The 7.5 bar:** the owner's process is that the reviewer scores, and if it's under 7.5 the reviewer writes a review
    and the brand agent goes again. **Never tell the reviewer about the 7.5 bar.**
  - **The rounds:**
    - v2 "Needle": the T of TUNER as the mark.
    - The owner: "doesn't scream TV and shows and movies watching awesomeness"; the name can change too.
    - v3: four directions (SLATE, airtime, TIPOFF, …).
    - The owner loved airtime's gradient and name, SLATE's colours (but "slate" is taken by another project of his),
      and TIPOFF's slant.
    - v4 hybrids: **airglow**, FLARE, SKYLIT. The owner: "I really really like airglow".
    - v5: airglow Soft and Sharp. The owner picked Soft, with Sharp slanted bits for the NBA section.
    - The owner then rejected the glow ("looks cheaply made") and picked the earlier echo mark.
    - v5.3–5.4 refined it: a wedge with three tucked bands, pink→violet, no glow. Reviewed 7.5.
    - The tile's corner hue is near Twitch purple, a deliberate owner decision: "looks nothing like twitch".
  - **Palette:**
    - ink `#0C0B12`
    - chalk `#F3EFE6`
    - orchid `#E04BFF`
    - pink `#FF5CB8`
    - violet `#5B2BD9`
  - **Rules:** red is for LIVE only, and there's no amber or yellow. Files are in `design/brand-v5/v5.4/`.

**26 Oct, the airglow TV interface.**
- **The design team:**
  - **Brief and process:** a UX brief (top bar, not a side rail) and a UI designer with the brand agent and UX expert
    as consultants. "The UI can look completely different, be creative." The owner asked for a launch animation.
  - **Milestones:** all screens, the player overlays and the launch animation were designed in `design/ui-v1/` (UI-SPEC.md,
    43+ mocks), then went through UX checks, brand checks and independent reviews (6.5 → 7.5).
  - **Spoiler shield:** hides scores until you reveal; watching a game counts as revealing it.
  - **Synced score delay:** per channel, matched with "Match the game clock".
  - **Choose-channel and backup feeds** for the game.
  - **Team colours:** after the owner said "team colours should stay, it's the teams' colors", plates use each team's
    real primary with a secondary 4 px bar. Memphis and OKC are darkened slightly for contrast.
- **The port:** to the app (`app/tv/`) and the native player overlays (ListPanel, GamePanel, VodControls, Ui), plus
  the rename to airglow (icon, TV banner, splash) and the launch animation. An engineering agent measured speed at 6x
  CPU throttle, and the fixes followed. **First airglow release: v0.2.41 / v0.2.45.**
- **Owner feedback from the TV, then fixed:**
  - The guide showed "No guide information".
  - The filters couldn't be reached with Down.
  - Movies' Sort/Filters couldn't be reached.
  - The top bar switched page by itself.
  - Only one genre could be filtered at a time (now multi-select).
  - The launch was too fast (now about 2.3 s with a hold).
  - The "g" was clipped.
- **Sounds:** the brand agent made a sound set (`design/sound-v1/`): launch, focus tick, select, back, open/close,
  toggles. "Change the whoosh", then "none and the long version": the long launch sound, no wipe sound. Later the
  owner said: **"the sounds are fine, don't worry about how they sound, just make them fast"**. The design is final.
- **Joint engineer + UX review:**
  - Speed: chunked catalog storage, a guide request queue, Home ready sooner, a launch key-skip.
  - Fixes: the offline bar, honest guide labels, Back to the exact item.
  - Then the to-do list:
    - a cached NBA schedule
    - cancellable sign-in with errors under the fields
    - "None" and all 30 teams
    - "Tonight's games" on Home
    - Series Down landing on the resume episode
    - wording fixes
  - **Released v0.2.53.**
- **Owner on the TV:** "sound isn't there" (he had it off), "intro lagging", "No guide information" still,
  bottom-row titles cut in grids, More like this "lame" with duplicates, overlaps on title pages, Settings boxes
  clipping, the NBA grid's empty space, sounds "delay behind what I do", and "can't go into the search results".
  All fixed:
  - **Sounds:** they now play through Android SoundPool (native), not the WebView, and default to On.
  - **Intro lag:** Home is drawn once during the intro, not 3–4 times.
  - **Guide:** a full-table fallback, the clock-offset logic and a "Check the guide" readout in Account.
  - **More like this:** rebuilt with scoring.
  - **Search:** Right goes from the keyboard into the results.
- **New features:**
  - **Full description:** Up from the buttons on a title page.
  - **Quality in the player:** see and change it (Options > Quality).
- **The bug hunt ("bug exterminators roll out"):** five agents (Home/sign-in, Live/Saved, Movies/Series/detail,
  NBA/game/Search/Account, plus a code review) were given QA research (TV safe area, D-pad rules, boundary values,
  live-update, flood and bad-network tours). They found about 70 issues, all fixed. **Released v0.2.58.**
- Owner: "it's wonderful brother we've made something amazing."

## What the app does now (v0.2.58)

- **Sign-in:** an Xtream server/user/password, or a full get.php link, or an M3U link. Several saved accounts.
  Three quick choices: your team (or None), the spoiler shield, and your languages.
- **Launch:** the airglow logo builds and wipes to Home, with a long launch sound. A key skips it once Home is ready.
- **Top bar:** Search · Home · Live · NBA · Movies · Series · Saved, with Account at the right. It hides when you
  scroll down.
- **Home:**
  - **Hero:** your team's game (from 3 h before tip-off), else Resume, else the last channel.
  - **Rows:** Continue watching, On now, and Tonight's games.
- **Live:** a guide grid (2.5 h window, favourites first), a Now panel, the group sheet, digits to jump to a channel,
  and hold OK to favourite.
- **NBA:**
  - **Hub:** day chips, your team's hero, and the games grid.
  - **Game page:** the box score (with FG), plays and team stats.
  - **Scores:** the shield and the synced delay everywhere.
- **Movies/Series:** Popular (IMDb-weighted) and other sorts, quick chips, Filters (multi-genre, language, quality,
  subtitles, IMDb, decade), versions merged into one card, title pages with More like this, the full description,
  seasons and episodes.
- **Search:** an on-screen keyboard, suggestions and results.
- **Saved:** channels (reorderable), movies, series and history.
- **Account:**
  - **Provider:** the provider details, Check the guide and Refresh.
  - **Settings:** playback, sound (On/Quiet/Off), NBA (team, shield, score on picture, delays), languages and Home rows.
  - **App:** updates and About.
- **Player (native):**
  - **Live:** zapping, the channel list, groups, the game panel with the box score, a "your team is live" chip, the
    score bug, Sync score and other feeds.
  - **Options:** subtitles, audio, picture size, Quality, speed and Match frame rate.
  - **Movies and shows:** a seek bar and Up next.

## Things that are true but easy to miss

- **Pushing `tv-redesign` to `main` = a release.** The release job does **not** wait for the emulator test, so run CI
  on the branch first and only merge on the owner's "release".
- **What CI can and can't test:** the emulator test can't judge feel (sounds, intro smoothness), the real provider, or
  anything over HDMI. The owner is the final test.
- **CI flakes:** CI has failed once on a Gradle download (a network flake, not the code), and one run hung for over
  30 min (cancel it and rerun).
- **ESPN:** it's called from the TV directly. The cloud session couldn't reach it until the owner allowed all domains.
- **Unconfirmed guide fixes:** the owner's provider still showed "No guide information" on some channels at the last
  report. The fallbacks are in but unconfirmed. Ask for a photo of Account > Provider > Check the guide.

## What's next (the owner's list, 26 Oct)

All of these: catch-up (rewind / watch from tip-off), reminders (also over other apps, e.g. while playing **PS5 on
HDMI**), the Team page, the **League page** (standings, stats, league leaders, big NBA news), the Google TV home screen
("a sick home screen would be awesome"), and multiview. Details and the order are in `NEXT.md`. The owner moved to
working from his computer so builds can go straight onto the TV over adb.
