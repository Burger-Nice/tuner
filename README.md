# Tuner

A fast, ad-free IPTV player for Xtream Codes and M3U playlists. Live TV with a guide, movies, series, favorites and continue-watching. Nothing locked, nothing phoning home.

## Get it

Download [**Tuner-Setup.exe**](https://github.com/Burger-Nice/tuner/releases/latest/download/Tuner-Setup.exe) and run it. After that, Tuner updates itself: new versions download in the background and install when you restart it. Windows may warn that the app is from an unknown publisher, because it isn't code-signed: click **More info**, then **Run anyway**.

Then sign in with the server address, username and password from your provider. If your provider gave you one long link with `get.php?username=…&password=…` in it, paste the whole link into **Server address** and the other fields fill in.

## The full player

Movies, episodes and full-screen TV play in **mpv**, which comes bundled with the Windows installer. It handles what the built-in player can't: HEVC/4K, Dolby and DTS audio, MKV files, subtitles and extra audio tracks. Move the mouse to show its controls. In full-screen TV, ↑/↓ change channel and number keys jump to a channel. Esc brings you back to Tuner.

You can switch back to the simpler built-in player under **Account → Playback**.

## NBA

The **NBA** tab has every game for the day with live scores, plus the full box score, team stats and play-by-play for each one. **Find on TV** searches your channels for the game. Your team (Memphis by default; change it under **Account**) is pinned on top, and Tuner lets you know when they tip off.

While you watch live TV, Tuner works out which game is on from the channel name or the guide. It then shows a score bug on the picture and a box score under it. If it guesses wrong, pick the right game from the menu on that card. In full-screen TV, press **G** for the score. Scores come from ESPN and update every 10–15 seconds.

IPTV streams run behind the real game, so the score bug can spoil a play. Set **Account → Score delay on live TV** to hold the score back to match your stream. The NBA tab always shows real time.

## Run from source

Install Node.js (LTS), then in this folder run `npm install` (on Windows this downloads mpv too) and `npm start`. `npm run dist` builds the Windows installer into `dist/`.

## Keyboard

| Key | What it does |
| --- | --- |
| ↑ ↓ | Change channel (or move through lists when one has focus) |
| 0–9 | Type a channel number, like a remote |
| L | Back to the last channel |
| Enter / F | Full screen |
| S | Favorite the current channel |
| M | Mute |
| ← → | Seek 10 s in movies; volume in full-screen live |
| J / L | Seek 30 s back / forward in movies |
| N | Next episode |
| / | Search |
| Esc / Backspace | Back |

Arrow keys move focus between controls everywhere, so the whole app works without a mouse.

## If something won't play

- **A live channel won't start:** go to **Account → Live stream format** and switch between HLS and MPEG-TS. Tuner already tries the other format automatically, but some providers work better with one first.
- **Nothing plays at all:** set **Account → User agent** to `VLC/3.0.20 LibVLC/3.0.20`. Some providers only accept certain apps.
- **No sound on a channel in the small preview:** some channels use Dolby audio the preview can't decode. Press **F** to watch full screen in the full player.

## Privacy

Your login is stored only on this computer, in the app's local storage. It is not encrypted, so don't use Tuner on a computer you share with people you don't trust.

## How it's built

Plain HTML, CSS and JavaScript in an Electron window. No frameworks, so it stays quick even with tens of thousands of channels.

- `app/core.js`: Xtream Codes API, M3U parsing and storage. No UI code, so it can be reused for a TV version.
- `app/player.js`: playback. Tries HLS (hls.js), then MPEG-TS (mpegts.js), then the built-in player.
- `app/nba.js`: live NBA scores, box scores and play-by-play from ESPN, and matching channels to games.
- `app/nav.js`: remote-control style arrow-key navigation, with TV remote key codes for Samsung, LG and Android TV.
- `app/app.js`, `app/index.html`, `app/styles.css`: the interface.
- `main.js`, `preload.js`: the desktop window and request headers.
- `mpv.js`, `player/tuner.lua`: runs mpv over Tuner's window and talks to it; the Lua script adds the Back key and channel zapping inside mpv.
- `scripts/fetch-mpv.js`: downloads the Windows build of mpv.
- `.github/workflows/build.yml`: builds and tests the Windows installer on GitHub.
