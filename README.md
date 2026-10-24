# Tuner

A fast, ad-free IPTV player for Xtream Codes and M3U playlists. Live TV with a guide, movies, series, favorites and continue-watching. Nothing locked, nothing phoning home.

## Get it

Download **Tuner-Setup.exe** from this repo's **Releases** page (the "latest" release) and run it. GitHub builds a fresh installer on Windows every time the code changes. Windows may warn that the app is from an unknown publisher, because it isn't code-signed: click **More info**, then **Run anyway**.

Then sign in with the server address, username and password from your provider. If your provider gave you one long link with `get.php?username=…&password=…` in it, paste the whole link into **Server address** and the other fields fill in.

## The full player

Movies, episodes and full-screen TV play in **mpv**, which comes bundled with the Windows installer. It handles what the built-in player can't: HEVC/4K, Dolby and DTS audio, MKV files, subtitles and extra audio tracks. Move the mouse to show its controls. In full-screen TV, ↑/↓ change channel and number keys jump to a channel. Esc brings you back to Tuner.

You can switch back to the simpler built-in player under **Account → Playback**.

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
- `app/nav.js`: remote-control style arrow-key navigation, with TV remote key codes for Samsung, LG and Android TV.
- `app/app.js`, `app/index.html`, `app/styles.css`: the interface.
- `main.js`, `preload.js`: the desktop window and request headers.
- `mpv.js`, `player/tuner.lua`: runs mpv over Tuner's window and talks to it; the Lua script adds the Back key and channel zapping inside mpv.
- `scripts/fetch-mpv.js`: downloads the Windows build of mpv.
- `.github/workflows/build.yml`: builds and tests the Windows installer on GitHub.
