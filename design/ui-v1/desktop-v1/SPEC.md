# airglow for Windows, v1: the TV app on a PC, and what a PC adds

The owner: "start working on the Windows version, let's make it unbelievably good. I want all the features from the TV
version, and more if you have any in mind for a better experience on PC." So this is the TV app (Home with the Marquee
and the personal rows, Live with the guide and catch-up, NBA with its sections and the spoiler shield, the player with
skip intro, Up next, Sync, the box score, subtitles and copies, the add-on library, title pages, Search, Saved, Account
and add-ons) translated faithfully to a Windows window driven by a mouse and a keyboard, on mpv, plus the things only a
PC can do: multiview, a mini player that stays on top, the box score beside the game, a guide you can drag, a command
palette, shortcuts for everything, notifications at tip-off, a second screen.

| File | What |
|---|---|
| `SPEC.md` | this: decisions, research, the frame, mouse and keyboard, every screen, the player, the PC extras (v1 / later), shortcuts, the architecture, what the builder changes where, open items |
| `01` … `11`, `13` `.html` | the mocks at 1920 × 1080 CSS px (Windows at 100 %); `12-home-1366.html` at 1366 × 768. Real art: the TV's Cinemeta / metahub files (`../home-final/art`), ESPN's crests (`../home-final/art`, `../nba-pages/img`) |
| `png/*.png`, `png/contact-sheet.png` | the renders at 1x (1920 × 1080; `12` at 1366 × 768) and the sheet of all thirteen |
| `REVIEW-independent-1.md` | the review of v1.0 (7.6; buildability 6) that v1.1 answers |
| `desktop.css` | the desktop classes (`.tbar`, `.side`, `.ct`, `.lineup`, `.guide`, `.hero`, `.pv-*`, `.dock`, `.tile`, `.mini`, `.pal`, `.sheet` …) on the brand's tokens, written to become `app/desktop/desktop.css` |
| `tools/build.js`, `tools/pages.json`, `tools/render.js` | builds the pages from one timeline; renders them (Playwright) |

The timeline is home-final's: the owner's laptop, Reykjavik (UTC), shield `My team`, languages Icelandic then English,
add-ons Cinemeta plus the debrid add-on `Northlight` (a stand-in name), live TV from his provider. Wed 28 Oct 2026 20:41
is the normal evening (`01`, `03`, `04`, `05`, `06`, `10`, `11`, `12`); the Grizzlies play at Portland Thu 29 Oct 02:00, and
`02`, `07`, `08`, `09` are Thu 03:12 to 03:14 with the game on. The game pictures are stand-ins for the broadcast (the
two crests on the teams' fields, as `player-v2` draws them). Box-score numbers and plays in `07` are stand-ins too.

---

## v1.1 changes (an answer to the independent review; the build starts from this)

**The seven must-fixes, all in.**
1. **A mouse way out of the player.** Theater keeps a **40 px title strip** above the video: the mark, a `← Back` button
   (named for where you came from: `Severance`, `NBA`), the title line, and Windows' own caption buttons at the right,
   which are never under mpv's window, so minimise / maximise / close and the Snap Layouts flyout keep working (`06`, `07`).
   The video sits under the strip, aspect-fit (1848 × 1040 at 1920 × 1080, 36 px bars at the sides); full screen (`F`)
   drops the strip and takes the monitor. §6.1.
2. **The docked panel starts under the caption area** (`07`): its header with the `G` cap and `×` is at y 40, never
   beside the window's close. The picture is pinned to the top of the 1520 px area at 16:9 (855 high) and the bar, the
   track, the ends row and the hint line sit **in the band under the picture**, not over it; the panel's lower half
   holds the latest plays under the box score. §6.3.
3. **1366 Home** (`12`): the lit card is 232 px tall, so the progress bar and the buttons have their own rows. §4.
4. **Multiview's add flow is designed** (`13`, and `08` reshaped): the sidebar folds to the rail; `Add a game or
   channel` (the header button, an empty slot's `Choose…`, `Ctrl M` anywhere) opens a **picker column at the right**
   (a search field, `Tonight's games` and `Favourite channels` as rows with a `+` for the next free slot and a grip to
   drag onto a slot; rows already in a slot say so); an empty slot reads `Empty slot · Drop a game or a channel here`,
   and lights pink with `Drop to add · tunes at 03:30` while a row or a card is over it; a game before tip-off becomes
   a waiting slot. The finished game left the showcase (`08` shows two live games, a waiting slot and an empty slot). §7.
5. **§9, plan A is rewritten:** airglow creates **one plain host child window (HWND) per picture** at the video rect
   and passes **that** handle to `--wid`, never the main window's (mpv fills whatever it is given); hosts are moved
   with `SetWindowPos` and re-parented with `SetParent` to hand a picture between windows.
6. **§9, airspace:** whenever any video is on screen, **one overlay window covers the content area** and hosts
   everything that floats: the controls, panels, chips, the banner, the palette, the shortcuts sheet, menus, toasts,
   tooltips, multiview's chrome and the mini player's chrome (the mini player's strip and bar sit over its picture, in
   its own overlay; `09` was right, the spec was wrong).
7. **§9, the overlay never takes focus** (`focusable: false`, no-activate), **hides while the window moves or resizes**
   and shows again after, and **keeps the pointer over the picture** (click pauses, double-click goes full screen, the
   wheel is volume) instead of passing clicks to an input-less mpv.

**The top should-fixes, in.** The guide (`03`): the Now line runs **behind** the cells (it shows in the gaps and on the
ruler, never through a title), every clipped title ends in an ellipsis, a cell under 80 px is a silhouette, the channel
numbers show, the channel column is 220 px, `Favourites 11`, the `HD` badge sits on the channel line. The palette
(`10`): one verb per row and Enter does it (`Watch · Enter`, `Add · Ctrl M`, `Set · Ctrl R`, `Open`), and no single-letter
shortcut while the caret is in the field. The keys (`11`, §8): **one meaning per key**: `Ctrl ← →` is the NBA sections
only, the mini player snaps with `Ctrl Shift ← →`; digits tune on Home, Live and in the player and give the audio to a
tile only in multiview; `Esc` leaves full screen first, then hides the controls, then leaves; the `Everywhere` group
holds no single letters (`?` and `/` are punctuation, and the mini player is `Ctrl P` there, `P` inside the player).
Media keys are registered only while airglow plays and released at stop (§9). Hand-offs (a game to the mini player, a
tile to full and back) **move the picture's host window between windows with `SetParent`**: the same mpv, the same
stream, no second connection and no gap (§9). The player's hint line is per context (`C Subtitles` on an episode, no
`G`; nothing from v1.1 in a v1 hint), the top scrim is stronger, the corner and the track agree (`21 min left` /
`−21:00`), and the player's row gains an `Episodes` pill (`E`; the TV reaches it through Options).

**Also:** the fallback order is A → C → B (C is what `mpv.js` does today and is known to work; B is the least proven);
the copy checks' probes count against `max_connections` and pause while multiview is full; a reminder toast is never
updated with a result once it sits in the Action Center; art is chosen by `width × devicePixelRatio`; the designer notes
printed in the renders are gone. Left for the next round (listed, not done, to keep this one lean): a blurred
translucent sidebar over the Marquee's art, the title page's backdrop fading before the episode list, `ON NOW` /
`Score hidden` under the team names on game night, the right-click menu / toast / tray / Movies grid / Account › Windows
frames and a 2560 render, an inside-the-window corner player while airglow is in front.

---

## 0. Decisions (each with its reason, in plain words)

1. **Same sections, same words, same art, same rules; only the surface changes.** Home is the Marquee over the personal
   rows, Live is the guide, NBA has the section row, the title page has the copy line and the pill, the player wears the
   v2 bar, the shield is byte for byte the TV's. *Why:* the owner asked for "all the features from the TV version"; the TV
   design has been through seven reviews; and a PC that reads like the TV is a PC he can use without learning anything.
   The data modules (`app/tv/js`) run as they are, as the iPhone proved (phone-v1 §5).
2. **A left sidebar, not the TV's top bar.** Home · Live · NBA · Movies · Series · Saved, with Account at the bottom and
   a `Now playing` card when something plays in the corner. 240 px with labels; a 72 px rail of icons under 1500 px of
   window width or with `Ctrl B`. *Why:* this is what every desktop streaming app does now: the Apple TV app on the Mac
   moved its top tabs into a sidebar in 2023, Plex's desktop app, Stremio's shell and Jellyfin's desktop client all use a
   left rail (§1). Microsoft's own guidance picks left navigation for five or more destinations and folds it to a compact
   rail on narrow windows. A sidebar scales from 1366 to 4K (the content grows, the nav does not), and on Windows the top
   of the window belongs to the title bar and its caption buttons, which the TV's top bar would fight.
3. **One box for search and commands (`Ctrl K`).** The search field in the title bar *is* the command palette: type a
   title, a channel number or name, a team, a game, a setting, or an action (`Watch Grizzlies at Trail Blazers`, `Add to
   multiview`, `Remind me`). Enter opens, `Shift Enter` plays now, digits tune. *Why:* the TV's Search tab exists because
   a remote needs an on-screen keyboard; a PC has a real one, and the proven desktop pattern (VS Code, Linear,
   Superhuman, Raycast; §1) is one palette that finds things and does things. The Search page stays for browsing results
   (`/` opens it), the palette is the fast path.
4. **Mouse first, keyboard complete, and the two never fight.** Hover lights (a card lifts 4 %, a line brightens, the
   Marquee's picture answers after a 600 ms rest as on the TV), click opens, double-click plays or goes full screen, right-
   click is the TV's hold-OK menu, the wheel scrolls (rows vertically, a row with `Shift`, the guide's channels; `Ctrl`
   wheel zooms the guide), drag pans the guide and drops cards into multiview slots. The keyboard has every key the sheet
   lists (§8); the focus ring (3 px white, the desktop token) appears only when the keyboard moved the focus, never on a
   click, so the screen is calm under the mouse. *Why:* Windows' guidance asks for on-object commanding (context menus and
   shortcuts for every action) and the TV's hold-OK menus map one to one onto right-click.
5. **The player is mpv, embedded in the window, with the v2 controls drawn by the app over it.** For every picture
   airglow creates a plain child window of its own at the video rect and mpv attaches to it (`--wid`); one transparent,
   non-activating overlay window over the content area draws everything that floats (the bar, the title block, the
   corner, the timeline, the chips, the panels, the palette, the sheet, menus, toasts, tooltips) in HTML. *Why:* mpv is
   what plays everything the owner's add-ons give him (HEVC, MKV, AC3/DTS/EAC3, every subtitle format, extra audio
   tracks) and it already runs as a process over JSON IPC in `mpv.js`; drawing the controls in HTML keeps them identical
   to the TV's design and the phone's port instead of rebuilding them in Lua. The detail (and the two fallbacks if the
   child window misbehaves in Electron) is §9.
6. **Playing takes the window; leaving keeps a live game in the corner.** Play = theater (the content area becomes the
   player, the sidebar folds away, `F` or double-click is full screen on the monitor, `Esc` returns). Leaving a live game
   or channel moves it to the **mini player**, a small always-on-top window of its own; leaving a film or an episode stops
   it and the title page offers Resume (Apple's rule). *Why:* on a PC he will browse while a game runs; YouTube's
   miniplayer and the Apple TV app's PiP are the known shapes; keeping a film running while browsing is noise.
7. **The box score sits beside the game.** The TV's game panel (box score, plays, quarters, feeds) docks at the right of
   the player, 400 px, persistent, `G`; the picture keeps 16:9 in the remaining width. *Why:* a 1920 px window has the
   room the TV never had, and this is the one thing the owner looks at during a game besides the picture. Its score is
   the as-aired score at the synced delay, as everywhere.
8. **Multiview is several mpv instances, audio follows the click.** Two to four tiles (2 side by side, 1 + 2, 2 × 2), each
   its own mpv process, all muted but the one with the white border; `1–4` pick the audio; a slot can wait for a tip-off
   and tune itself; drag a game card or a channel row onto a slot. *Why:* NBA League Pass's own multiview (four games,
   the audio game marked by a border, live only) and YouTube TV's Build a Multiview are the shapes he knows; neither
   exists in a desktop browser, so this is where the Windows app beats everything he has. The provider's stream limit
   (`max_connections`) caps the slots and the bar says so.
9. **The guide is a big grid you can drag.** 3 h across at 1920 (2.5 h at 1366), 5 px a minute, 11 channel rows, a `Now`
   flag and line, the groups as chips, a date and a time-scale control; the hovered programme answers in a right panel
   with `Remind me`, `Tune now`, `Multiview`, where else it is on, and the channel's kept replays. *Why:* the TV's guide
   is a grid already (UI-SPEC 5.3); the PC adds the mouse's verbs (drag, wheel, zoom) and the room for a panel, as
   YouTube TV's and Plex's web guides do.
10. **Notifications and a tray.** `Remind me` on a game is a Windows notification 10 min before tip-off ("Grizzlies at
    Trail Blazers tips off at 02:00 · Watch"), the masked name under the shield; the tray icon shows the next game and
    `Watch`, and closing the window keeps airglow in the tray (a setting) so reminders fire with the window closed.
    *Why:* NEXT.md's first item is reminders; on Windows they are cheap (`Notification`, `Tray`) and need no overlay trick.
11. **Keyboard shortcuts for everything, one sheet, the TV's words.** `?` opens a sheet of seven groups; every shortcut
    uses the TV's verbs (`Zap`, `From the start`, `Back to live`, `Reveal`), letters match YouTube and Netflix where they
    have one (`Space`, `J K L`, `F`, `M`, `C`), and sections are `Ctrl 1–6` as browsers do with tabs. *Why:* discoverable
    shortcuts are the PC's version of the remote's hint bar; the hint line in the player shows the first 5 times and
    retires (the TV's rule), the sheet is always one key away.
12. **It scales from 1366 × 768 to 4K without changing its mind.** Breakpoints fold the sidebar (1500) and narrow the
    lineup (1440); posters are 170 × 255 at 1920 and 140 × 210 at 1366; rows show as many cards as fit (8 at 1920, 7 at
    1366, 14 at 3840); the Marquee's picture always bleeds under the sidebar; type never scales with the window (Windows'
    display scaling does that: at 125 % a 1920 laptop is 1536 CSS px wide and takes the 1440 layout). *Why:* Microsoft's
    breakpoints (641, 1008) and Snap Layouts (half, third, quarter) are the test cases; the owner's laptop is the small
    case, a TV over HDMI the large one. Minimum window 1024 × 640.
13. **Dark only, the brand's tokens, no Mica.** `bg-0` canvas, the picture under translucent chrome (the sidebar and title
    bar are `bg-1` at 84 % over the Marquee's backdrop, which is the brand's "scrims over art" rule, not Windows' Mica).
    The window's caption buttons are Windows' own (the Window Controls Overlay) coloured to the canvas. *Why:* one brand on
    three screens; Mica would tint the app with the desktop wallpaper, which the OLED-tuned palette was never checked
    against; the WCO keeps Windows' minimise / maximise / close exactly where every Windows app has them.
14. **Nothing moves by itself** (UI-SPEC 1.4 holds): no carousel, no autoplay, no reordering while a page is on screen,
    the picture swaps only after the hover rests 600 ms, hover never plays video. The one exception the owner may turn
    on: muted live previews in the guide's panel (a setting, off by default, as on the TV).
15. **Updates stay quiet and come from the same place.** electron-updater from the GitHub release (already in `main.js`):
    downloaded in the background, installed on the next quit, or now from Account › Updates; the version is `0.4.<run>`
    like the TV's so one release number means one release everywhere.
16. **What is v1 and what waits.** v1: the shell, every TV screen, the player with the docked panel, the mini player,
    multiview, the guide grid, the palette and the sheet, notifications and the tray, media keys, window memory. Later
    (ordered in §7): second-screen mode, frame thumbnails on the track (thumbfast), live previews in the guide, global
    zap keys from other apps, downloads for offline, a web-share of the box score. Each has a reason in §7.

---

## 1. Research (what was looked at, what it establishes, which decision it backs)

Read in this session (November 2026) unless marked (S) for "from published summaries" (the host could not be opened
from here: learn.microsoft.com, mpv.io, electronjs.org, forums.plex.tv and support.watch.nba.com are outside the
session's allowed domains; their GitHub source mirrors were read instead where they exist).

**Desktop streaming and media apps**
- Plex HTPC versus the Plex desktop app (S; [forums](https://forums.plex.tv/t/introducing-plex-htpc/703075),
  [Yahoo](https://www.yahoo.com/entertainment/plex-introduces-desktop-app-ends-171806756.html)): Plex split its PC
  client in two in 2022: a TV-style app for a PC on a television (refresh-rate switching, passthrough, input maps) and a
  desktop app "built for keyboard and mouse"; both play through mpv. → Decision 1 and 5 (one app, mouse and keyboard
  first, mpv underneath); the HTPC half is our full-screen mode, not a second app.
- Stremio 5's shell (read: [the community v5 shell's wiki](https://github.com/Zaarrg/stremio-community-v5/wiki); the
  official [stremio-shell README](https://github.com/Stremio/stremio-shell)): a WebView2 host loads the web UI and mpv
  does "native playback" as an integrated player, with `mpv.conf` / `input.conf` / scripts in a portable config folder,
  minimise to tray, pause on minimise / on lost focus, picture-in-picture, a built-in updater, dark mode following
  Windows. → Decisions 5, 6, 10; the mpv escape hatch in Account › Windows (§5.8).
- Jellyfin Media Player (read: [README](https://github.com/jellyfin/jellyfin-media-player)): Qt WebEngine plus libmpv in
  one window, audio passthrough, hardware decoding, an `mpv.conf` for the rest. The same shape as Plex HTPC (it is a
  fork of Plex Media Player). → Decision 5: the three proven desktop IPTV / media shells all put a web UI over mpv; none
  of them is Electron, which is why §9 has a fallback plan.
- Kodi 22 "Piers" (S; [BetaNews](https://betanews.com/article/this-is-whats-new-and-changed-in-the-first-new-kodi-22-piers-release),
  [Kodi](https://kodi.tv/article/kodi-22-piers-alpha-3)): RC in October 2026; FFmpeg 8, HDR work, PVR features (recently
  added channels, custom timers, delete after watching). → Nothing to copy for the interface (Kodi is a 10-foot UI);
  "delete after watching" shaped the replays list's wording (`kept · 1 h`).
- Infuse 8 on the Mac (S; [Firecore](https://firecore.com/blog/infuse-8-now-available),
  [MacRumors](https://forums.macrumors.com/threads/infuse-8-for-macos-now-available.2270534/)): one design across iPhone,
  iPad, Apple TV, Mac and Vision, new player controls, skip intro / credits. → Decision 1 (one design, three screens).
- The Apple TV app on the Mac (S; [9to5Mac](https://9to5mac.com/2023/03/16/tv-app-mac-redesign/),
  [MacTech](https://www.mactech.com/2023/12/11/apple-updates-its-apple-tv-app-with-new-sidebar-navigation-unified-guide-and-more/amp/)):
  the top tabs became a sidebar with subsections (Home, Apple TV+, Store, Library, Devices); Home is the unified guide.
  → Decision 2.
- YouTube TV multiview (S; [SlashGear](https://www.slashgear.com/1818819/youtube-tv-multiview-watch-pc/),
  [Android Authority](https://androidauthority.com/youtube-tv-build-a-multiview-rolling-out-3415016)): custom multiview
  of up to four streams on TVs and phones, **not in a desktop browser**, live only; the audio switches between the
  streams. → Decision 8: a real desktop multiview is the Windows app's biggest win over what he can get today.
- NBA League Pass multiview (S; [NBA support](https://support.watch.nba.com/hc/en-us/articles/26849702436247-Multiview),
  [Engadget](https://www.engadget.com/entertainment/nba-league-pass-gets-multiview-just-in-time-for-the-season-to-start-191016755.html),
  [SVG](https://www.sportsvideo.org/2024/10/15/nba-app-adds-multiview-capabilities-on-connected-devices)): up to four
  games, "select the game of your choice and the audio feed will change to that game with a white border", live
  broadcasts only, two streams on weaker devices. → Decision 8's white border, `1–4`, the stream cap.
- Netflix on Windows (S; [Windows Latest](https://windowslatest.com/2024/05/14/netflix-teases-a-new-windows-11-app-with-ads-but-no-downloads-feature),
  [PCWorld](https://www.pcworld.com/article/2410849/netflixs-new-app-for-windows-lacks-features.html)): the native app
  became a web wrapper in 2024 and lost downloads. → Decision 16: downloads are "later"; the cautionary tale is a
  Windows app that is just the website, which is why the PC extras exist.

**Windows design guidance**
- Windows app design, best practices (S; [learn.microsoft.com](https://learn.microsoft.com/windows/apps/get-started/best-practices)):
  the five principles (effortless, calm, personal, familiar, coherent), on-object commanding (context menus, keyboard
  shortcuts), test Snap Layouts at ½, ⅓ and ¼, dark mode, Mica as the base layer. → Decisions 4, 12, 13.
- Title bar design (read: [the docs source](https://github.com/MicrosoftDocs/windows-dev-docs/blob/docs/hub/apps/design/basics/titlebar-design.md)):
  "the standard title bar has a height of 32px"; a search box centred in the window raises it to 48; everything not
  interactive in it is draggable; caption buttons have full-bleed backplates at the right. → §3: a 40 px title bar with
  the search box centred, the Windows caption buttons at the right.
- Screen sizes and breakpoints (read: [the docs source](https://github.com/MicrosoftDocs/windows-dev-docs/blob/docs/hub/apps/design/layout/screen-sizes-and-breakpoints-for-responsive-design.md)):
  small ≤ 640, medium 641–1007, large ≥ 1008 effective px; sizes in multiples of 4; design in effective pixels with the
  100 / 125 / 150 % plateaus. → Decision 12, §3's breakpoints and the 4 px grid.
- NavigationView (S; [learn.microsoft.com](https://learn.microsoft.com/windows/apps/design/controls/navigationview)):
  left navigation for five or more top-level destinations, top navigation for fewer; the pane is open at 1008 epx and
  up, compact under it, with footer items (settings) pinned at the bottom. → Decision 2 (six destinations + Account at
  the bottom); ours folds at 1500 because the content, not the pane, needs the width.
- Mica (read: [the docs source](https://github.com/MicrosoftDocs/windows-dev-docs/blob/docs/hub/apps/design/style/mica.md)):
  Mica is the recommended base layer with a visible title bar. → Decision 13 declines it (brand), keeps the visible bar.
- Keyboard accelerators (S; [learn.microsoft.com](https://learn.microsoft.com/windows/apps/design/input/keyboard-accelerators)):
  Ctrl for commands, single keys only in focused contexts, show the accelerator in tooltips. → §8: `Ctrl` for app-wide
  commands, single letters only inside the player / guide / browsing, every tooltip ends with its key.

**mpv embedding and Electron**
- mpv's manual (read from source: [options.rst](https://github.com/mpv-player/mpv/blob/master/DOCS/man/options.rst)):
  `--wid=<ID>` "tells mpv to attach to an existing window" and on Windows the ID is an HWND; `--input-ipc-server` uses a
  named pipe on Windows (as `mpv.js` already does); `--hwdec=d3d11va` needs `--vo=gpu-next` with `--gpu-context=d3d11`;
  `--keep-open`, `--force-window`, `--idle`, `--cursor-autohide`, `--window-dragging=no`, `--screen` / `--fs-screen` for
  the second monitor, `--audio-device`. → §9's mpv command line.
- libmpv's render API (read: [render.h](https://github.com/mpv-player/mpv/blob/master/libmpv/render.h) via
  [docs.rs](https://docs.rs/crate/radiance-libmpv-sys/latest/source/include/render.h)): "window embedding can cause
  various issues, especially with GUI toolkits and certain platforms", and the render API is the alternative. → §9's plan
  B is exactly that alternative.
- `--wid` in Electron (read: [Node-MPV issue 106](https://github.com/j-holub/Node-MPV/issues/106)): a user passed the
  BrowserWindow's handle, mpv ran and reported a duration, but no video showed until `--wid` was removed. → §9's spike
  comes first in the build order, and plan A sets the z-order of mpv's child window explicitly.
- `electron-mpv-video` (read: [README](https://github.com/yscoder/electron-mpv-video)): libmpv in a native addon with
  software frames to WebGL / Canvas 2D, or Electron's shared-texture path (Electron 40 +) to WebGPU; HTML controls on top
  for free; Windows x64 and macOS; source-built, `sandbox: false`, no performance figures, early stage. → §9's plan B.
- Electron (read from source: [browser-window.md](https://github.com/electron/electron/blob/main/docs/api/browser-window.md),
  [base-window-options.md](https://github.com/electron/electron/blob/main/docs/api/structures/base-window-options.md),
  [custom-title-bar.md](https://github.com/electron/electron/blob/main/docs/tutorial/custom-title-bar.md),
  [custom-window-interactions.md](https://github.com/electron/electron/blob/main/docs/tutorial/custom-window-interactions.md),
  [notification.md](https://github.com/electron/electron/blob/main/docs/api/notification.md)): a child window (`parent`)
  "will always show on top of the parent window" and on Windows does not move with it; `transparent` "on Windows does
  not work unless the window is frameless"; `titleBarStyle: 'hidden'` + `titleBarOverlay: { color, symbolColor, height }`
  gives Windows' caption buttons over our content with `env(titlebar-area-*)` for the safe area; `getNativeWindowHandle()`
  is the HWND; `setAlwaysOnTop(true, 'floating')`; `setIgnoreMouseEvents(true, { forward: true })` keeps mouse moves
  reaching the page (the click-through overlay pattern); `setAspectRatio`; `setContentProtection`; `Notification` with
  `click` and `toastXml` on Windows. → §9.
- thumbfast (read: [README](https://github.com/po5/thumbfast)): on-demand seek-bar thumbnails from a background mpv,
  no constant CPU, works on network streams when `network=yes`. → §7 "later": thumbnails on the track.
- Command palettes (read: [Retool](https://retool.com/blog/designing-the-command-palette),
  [Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)): one trigger that works the same
  everywhere, grouped results (global / page / object), keyboard-only completion. → Decision 3, §5.6.

**The house specs this one sits on**: `home-final/SPEC.md` (the Marquee, the rows, the engine), `player-v2/SPEC.md` (the
bar), `nba-pages/SPEC.md` (the sections, the shield per surface), `catchup/SPEC.md` (replays, the timeline),
`subtitles/`, `copies/RANKING.md`, `addons/SPEC.md`, `diagnosis/SPEC.md`, `skip/SPEC.md`, `phone-v1/SPEC.md` (the reuse
model), `brand-v5/v5.4` (tokens; `:root.desktop` already holds the desktop type scale).

**Where this design departs on purpose.** A sidebar where the TV has a top bar (2). The command palette replaces the
on-screen keyboard (3). The episode list is vertical, not the TV's rail (§5.5; the Apple TV app and Netflix on the web do
this, and a mouse reads a list). The player docks a panel beside the picture (7), which no TV player does. Mica is not
used (13). mpv stays a process rather than libmpv in-process (5, §9), unlike Plex, Jellyfin and Stremio.

---

## 2. The frame (every page)

| Element | Geometry at 1920 × 1080 |
|---|---|
| Window | frameless with Windows' caption buttons (`titleBarStyle: 'hidden'`, `titleBarOverlay: { color: bg-0, symbolColor: text-2, height: 40 }`); min 1024 × 640; the last bounds, monitor and maximised state remembered |
| Title bar | y 0–40, `app-region: drag` except its controls: the mark (24 px) at x 20; back / forward (28 px discs) at the sidebar's right edge; **the one box** centred (560 × 30, radius 8, `surface-2` at 72 %, `Search or jump to anything`, the `Ctrl K` caps at its right); the avatar (26) at the right before the caption area (138 × 40, Windows' own) |
| Sidebar | x 0–240, under the title bar, `bg-1` at 84 % over the page's picture, a 1 px `border`; items 44 high, radius 9, icon 20 + Outfit 500 15; the selected one `surface-2` with a 3 px gradient bar at its left; the NBA item carries the compact LIVE pill while a game is on (the TV's top-bar rule, but never while Home's lit line is the game); `Now playing` (a 118 px picture card) when the mini player is up; Account at the bottom (avatar, name, `update ready` and a dot when one waits) |
| Rail | the sidebar at 72 px: icons centred, labels in tooltips, the LIVE pill a red dot on the icon, `Now playing` hidden |
| Content | from x 240 (72), 48 px gutters, no maximum width; pages scroll vertically with the wheel |
| Breakpoints | width ≥ 1500: the sidebar with labels; 1100–1499: the rail; < 1100 (a snapped half of 1920, or 1024): the rail and the compact lineup; height < 800: the Marquee's card loses its story line and the peek shows 60 % of a poster |
| Scale | CSS px; Windows' display scaling applies on top (125 % on a 1920 laptop gives 1536 px, the 1440 layout; 150 % on a 4K monitor gives 2560, the wide layout with 11 posters a row) |
| Type | the brand's `:root.desktop` scale: lit lines Outfit 700 40 / 36, page titles 26, row titles 20, body Inter 16 / 15, facts 14, captions 13, badges and key caps 11–12 (the TV's 14 px floor is for 3 m; a laptop is read at 60 cm) |
| Focus | mouse: hover = lift 4 % and a 1.5 px chalk edge at 70 %; keyboard: the 3 px white ring (`--a-focus-ring` desktop) only after a key moved the focus; dense grids (the guide) use the inset ring |
| Motion | the TV's (`--a-dur` 200 ms, transform and opacity only); hover lift 120 ms; the picture crossfade 200 ms after a 600 ms rest; reduced motion follows Windows' setting |
| Sounds | the UI sounds play on launch and on a tune only (Web Audio, as the launch sound does today); off when Windows is muted; the setting is the TV's |

---

## 3. Mouse and keyboard (the rules every page shares)

| Input | Does |
|---|---|
| Hover | lights the thing (a card lifts, a line brightens, a cell gets the chalk edge); after 600 ms the Marquee's picture and the rows' column answer the hovered title (the TV's focus-rest rule); the pointer hides after 3 s in the player |
| Click | the thing's one verb: a line or a row card opens Details; a lit line's pill plays; a guide cell tunes (now) or opens the panel (later); a game card opens the game page; a tile in multiview takes the audio |
| Double-click | plays (a poster, an episode row, a game card); in the player, full screen; in multiview, expands a tile |
| Right-click | the TV's hold-OK menu as a context menu (`Play now`, `Save`, `Details`, `Not interested`, `Why this row?`, `Hide this row`; a game: `Watch live`, `From tip-off`, `Add to multiview`, `Remind me`, `Reveal score`; a channel: `Tune`, `From the start`, `Favourite`, `Open in the guide`, `Add to multiview`); `Shift F10` from the keyboard |
| Wheel | scrolls the page (Home moves from the Marquee into the rows and back, one row per notch as on the TV); `Shift` wheel scrolls a row; in the guide the wheel is channels, `Shift` wheel time, `Ctrl` wheel the time scale; in the player the wheel is volume |
| Drag | the guide pans along time (a grab cursor); a card or a channel row drags into a multiview slot (a ghost of the card, the slot lights); the mini player drags anywhere; the volume and the track scrub |
| Keyboard | arrows move the focus the way the D-pad does on the TV (`focus.js`'s containers, `[data-row]`, `[data-col]`, `[data-grid]`, unchanged); `Enter` = OK, `Shift Enter` = play now, `Esc` = Back, `Shift F10` = hold OK; the full map is §8 |
| Tooltips | every button's tooltip ends with its key (`Mini player · P`), after a 600 ms hover |
| Text fields | real ones (sign-in, the TMDB key, the Stremio code, a channel number in the palette); paste works; no on-screen keyboard anywhere |

Selection versus focus: a click selects and acts; it never leaves a ring. The ring shows only after a key moved the
focus and goes away on the next mouse move (the convention of Windows and the web).

---

## 4. Home (`01-home-evening`, `02-home-gamenight`, `09-mini-player`, `12-home-1366`)

**From the TV:** `screens/home.js`'s line model (`kind`, the 3-or-4 rule, the morning after, `gameLit`), `rows.js`,
`shelves.js`, `tmdb.js`, `art.js`, `state.js`, `catalog.js`, as the phone reads them (phone-v1 §5).

**The Marquee.** The picture bleeds under the whole window (the sidebar and title bar are translucent over it); the
lineup at x 48 of the content, y 76, 640 wide: 56 px lines (Outfit 700 36 at 66 % + facts Inter 17), the lit line its
card in place (640 × 236, radius 20, a 1 px chalk edge at 22 %, the glow colour from the 32 px copy): eyebrow, the logo
at 64 px of ink (else the name at 40), the facts with badges, one line, the 320 × 4 bar, then **buttons instead of
hints**: the pill (`Resume`, `Play`, `Watch live`, `Tune`, `Details`), a ghost button for the line's "more" (`Episodes`,
`More popular films`, `From tip-off`, `Guide`), `Multiview` on a game, and `⋯` (the hold-OK menu). A small caption after
them says the keys the first 5 times (`Enter plays · right-click for more`). Hover lights a line and its card opens in
place after 150 ms (the lines under it slide 180 px in 200 ms); the picture answers after the 600 ms rest. The wheel or
`↓` past the last line goes to the rows; `↑` from the first line goes to the one box. The first row peeks at the bottom
(posters cut at 70 %) with `Browse · 15 rows ↓` at its right.

**Game night (`02`)**: the fields split at 80 % with the 12° edge; crests 220 at y 150; the `ON NOW` chip and `Score
hidden` plate at y 560; the game's line is the Sharp card with `Watch live` · `From tip-off` · `Multiview` · `⋯`; the
NBA item in the sidebar carries no pill while the game is the lit line. The peek is `Tonight in the NBA` with the hub's
cards (378 × 176 here).

**The rows (`09`)**: the picture area is the top 44 % under the normalised cap, the column at x 48 (logo 60, facts, a
3-line plot, `Play now` · `Details` · `Save` · `⋯`), the row index at the right (six names, the current one marked, `N
more`; a click jumps), the focused row (title, reason, `New row`, `See all ›` at the right), 8 posters of 170 × 255 at 20
px gaps (a 9th peeks), an arrow at the row's right edge on hover, the next row's title and the top of its cards under it.
Hover on a poster: lift, a `▶` disc and a `⋯` disc on its bottom scrim (nothing is printed on the art itself); click =
Details, double-click or `▶` = play now, right-click = the menu. The wheel moves one row per notch; `Home` returns to the
top. Game cards and wide cards as the TV's (`Your shows`, `Channels`).

**1366 × 768 (`12`)**: the rail, the lineup 520 wide (lines 30 / 34, the card 520 × 232 so the bar and the buttons keep
their own rows, the logo 54), posters 140 × 210 (7 across), the peek 150 high, the key caption hidden. Nothing is dropped.

**States** (home-final §2 holds): loading with a cache = Home as last drawn; offline = the pill `Offline · showing what
airglow remembers` in the title bar's right and `Needs a connection to play` under the lit line; no add-ons = the footer
line `Add a Stremio add-on for films and series` (opens Account › Add-ons); cold start = `Popular now · a pick for
tonight`, the team's next game, `Pick what you like`; late mode; the morning after a hidden game.

---

## 5. The other screens

### 5.1 Live: the guide (`03-live-guide`)

**From the TV:** `screens/live.js` (groups, favourites, tune, `programmeView`), `guide.js` (the queue, now / next, the
clock offset), `catchup.js` / `replay.js` (kept programmes, `Earlier`), `games.js` (`gameOn`, feeds).

| Part | Geometry |
|---|---|
| Controls row | y 20, 36 high: the group chips (`☰ Favourites 10` selected, `All channels`, `Sports`, `Iceland`, `UK`, `News`, `Movies`, `▾ 12 more`); at the right `‹ Now ›`, the date (`Wed 28 Oct ▾`, a calendar popover), the scale (`3 h ▾`: 2 h · 3 h · 4 h · 6 h) |
| Grid | x 48, y 76, 1180 wide (the content minus the panel): the channel column 220 (the number, 15 `text-3`, always shown because `0–9` tunes; a 42 px logo tile in the channel's colour, the provider's logo when it has one, else the initials; the name on two lines; the star, or the pin for your team's channel), the time axis 960 px for 3 h (16/3 px a minute), the ruler 30 high with the `Now` flag (gradient, 26 high) at the now column and the 2 px pink line down the grid **behind the cells** (it shows in the gaps and on the ruler, never through a title), times every 30 min; rows 76 high at an 84 px pitch (11 rows at 1080); cells 10 px radius on `surface-1` at 86 %, title Inter 650 16 **with an ellipsis**, times 14 `text-3` with `‹` for a programme that began before the window, the compact LIVE pill, `kept` on a programme with a replay (when the cell is wider than 200), a progress bar on the programme on now; a cell under 80 px is a silhouette (its title is in the panel on hover); a missing guide is one dashed `No guide information` cell, still tunable |
| Panel | right 48, y 76, 380 wide: the picture 380 × 214 (the programme's art, the two crests on team fields for a game, a muted mpv preview when the setting is on; the `Tips off in 2 h 19 min` tag), the title Outfit 700 24 with LIVE when so, the facts (`NBA League Pass 4 · 23:00 to 01:30 · Wed 28 Oct · HD`), the second facts line (records, the arena; `No guide information` for a channel without), one paragraph, the buttons (`Remind me` pill on a future programme / `Tune` pill on a current one, `Tune now` ghost, `From the start` when kept, `Multiview`, `⋯`), `Also on …` (the other channels carrying the same game with their quality), `Earlier on this channel · replays for 3 days` with the kept programmes as rows (`‹ NBA Today · 20:00 · kept · 1 h`) |

Mouse: hover a cell = the chalk edge and the panel answers (after 150 ms); click = tune a current programme, show a
future one in the panel; double-click = tune; drag = pan along time (the ruler and the Now flag move; `N` or the `Now`
control snaps back); the wheel = channels, `Shift` wheel = time, `Ctrl` wheel = the scale; right-click = the channel
menu (`Tune`, `From the start`, `Favourite`, `Add to multiview`, `Remind me`, `Which game is this?`). Keyboard: `← →`
along time (at the now column `←` goes to the channel column, never the sidebar), `↑ ↓` channels, `PgUp PgDn` eleven rows,
`Enter` tunes / opens, `Shift Enter` from the start, `F` favourite (the undo toast), `R` remind, `D` the day, `0–9` a
channel number (the TV's digits rule, with the number shown in the one box), `Home` now. The selected group is the zap
ring in the player. Entry focus: the current programme of the last channel. The hint line (`drag to pan · Ctrl wheel
zooms`) shows the first 5 times.

States: loading (the channel column filled, cells as flat blocks), guide failed (`Guide not answering · Try again` under
the ruler), no provider (the sign-in card in place of the grid), offline (the cache, no LIVE pills, no progress).

### 5.2 NBA (`04-nba-hub`)

**From the TV:** `screens/nba.js`, `nba/hub.js` (the hero's state table, the day's games), `nba/standings.js`,
`leaders.js`, `teamstats.js`, `news.js`, `team.js`, `player.js`, `picker.js`, `league.js`, `games.js`, `app/nba.js`,
`screens/game.js`, `screens/team.js`.

The hub: the section row as chips at y 20 (`Games · [crest] Grizzlies · Standings · Leaders · Team stats · News`, the
ESPN clock at the right; `Ctrl ← →` or a click switch); the hero 1584 × 300 (the TV's broadcast graphic: eyebrow, the
two team plates at 12°, `VS` or the score, the slab at the right: `02:00 / TIP-OFF · THU, LATE` pre-game, the clock
when live and seen, `Score hidden` under the shield; the buttons `Remind me` pill (pre-game beyond 3 h), `Watch pre-game`
/ `Watch live` pill (inside 3 h / live), `From tip-off`, `Add to multiview`, `Last game`, `⋯`; the caption with the
countdown, the channels and what Remind me does); the day strip (`‹ Tue · Today · Wed 28 Oct · Thu ›`, `6 games · none
started · tip-off order`); the game cards 378 × 176 four to a row (status line with the LIVE pill, the network at the
right; two team rows with the 5 px team edge, crests 36, records; the skewed plate with the tip time, the score stack,
`Score hidden`, or the final). Hover on a card shows `▶` `⊞` `⋯` discs; click opens the game page; double-click watches;
drag puts it in a multiview slot.

Standings, Leaders, Team stats, News, the team page, the player sheet and the game page are the TV's pages with their
tables at desktop sizes (rows 40, Inter 14, sortable column heads on the standings and leaders; the leaders' category
column stays a column; the news list shows the picture at the left and the story on the right in a 2-column reading
layout; the player sheet is a right sheet 480 wide). Every shield cover (`West standings are hidden`, `A story about a
game you haven't seen`) is the TV's card with `Keep it hidden` and `Reveal …`; Reveal's confirm is a dialog with the
TV's words. The game page docks the same panel the player uses (§6.3) under its header, so the box score and plays are
one component on both.

### 5.3 Movies and Series (the add-on library)

**From the TV:** `screens/lib.js` (shelves, Sort / Filters / Jump), `shelves.js` (`Pager`, `shelves`, `genreShelf`),
`catalog.js`. The TV's page with the shelf chips, the context line (`Movies · Comedy · Popular · 3,000+ films`) and
Sort / Filters as popovers (Filters a right sheet 420 wide, chips with live counts, `Show 214 titles` pinned); the grid 8
posters of 170 × 255 across at 1920 (as many as fit), captions under each (title 15, facts 14), the `4K` badge where a
copy was checked, the scroll bubble (`#313 of 3,000+`) at the right of the context line while the list is flung. Hover
lifts, click = Details, double-click = play now, right-click = the menu. `Jump` is the TV's (rank bands, years, letters).
The library is the add-ons, never the provider's VOD (the owner's decision).

### 5.4 Search

The one box (§5.6) is the fast path. The Search page (`/`, or the box's `See all results`) is the TV's results layout
without the keyboard: the field at the top, the type chips (`All · Movies · Series · Channels · Games`), Top result,
On TV (the guide's titles, next 24 h), Movies and series rows; results update per keystroke (150 ms), matching
normalises accents and prefixes as the TV's does. Recent and Trending when empty.

### 5.5 The title page (`05-title-series`)

**From the TV:** `screens/detail.js` (the facts, the pill's verb, seasons and episodes), `titlecopies.js` + `copies.js`,
`titlesubs.js` + `subs/*`, `imdb.js`, `shelves.js` (`openItem`), `rows.js` (`plays`).

The backdrop full-bleed under the chrome; the column at x 48, y 76, 900 wide: eyebrow (`SERIES · THRILLER · SCI-FI ·
DRAMA · APPLE TV+`), the logo at 96 px of ink (else the name Outfit 700 44), the facts (`★ 8.7 · 2022– · 2 seasons · 19
episodes · TV-MA · 4K HDR · 5.1 · Icelandic subtitles`), the plot (3 lines at 760, `more` expands), the credits line,
the buttons (`▶ Resume S2 · E3` pill 44, `Saved`, `Icelandic` (the subtitles sheet), `Copies · best of 3` (the sources
sheet), `⋯` with `Start over`, `Mark watched`, `Choose a copy`, `Open in mpv's own window`), the copy line with the tick
(`4K HDR, 5.1 · best of 3 copies · from Northlight · Icelandic subtitles found · plays in mpv`; mpv plays every copy, so
no plays-here term is needed, unlike the phone). Below, **the episodes as a vertical list** (season chips, `10 episodes
· 7 left`; rows 108 high: the still 158 × 88 with the number, the watched tick, the resume bar; the name and the
duration or `21 min left`; one line; a `▶` disc at the right, filled on the current and hovered rows) and **More like
this** as a 4 × 2 grid of posters at the right of the list. A film: the same column without seasons, `More like this` as
a row. Back returns to the card that opened it.

### 5.6 The one box and the command palette (`10-palette`)

`Ctrl K` from anywhere (or a click in the box): a 760 px sheet 110 px from the top over a 60 % dim; the field (20 px,
the typed text, the completion in `text-4`, `Esc`); groups in this order, each at most 3 rows: **Actions** (verbs on
the things the query matches: `Watch …`, `Add … to multiview`, `Remind me 10 min before tip-off`, `Tune …`, `Open the
guide at …`, `Reveal …`), **Teams**, **Channels** (number · name, what is on and until when), **Films and series** (the
poster tile, year · genre · length · IMDb), **Games**, **Settings** (`Spoiler shield · My team`), **Pages**; **each row
has one verb** at its right (`Watch`, `Add`, `Set`, `Tune`, `Open`, `Details`) and Enter does that verb; a row's shortcut
is always a chord (`Ctrl M`, `Ctrl R`), never a letter, because the caret is in a text field; the footer: `↑↓ Move · Enter
Open · Shift Enter Play now · Esc Close · Type a channel number to tune`. Digits alone show `Tune channel 4 · NBA League Pass 4` as the first row (Enter tunes,
the TV's digit rule). Results come from the catalog, the guide, the schedule, the add-ons' search (Cinemeta `search=`)
and the settings' names, 150 ms after the last key; the last 5 queries show when empty. Under the shield an action row
never prints a score or a result.

### 5.7 Saved

The TV's chips (`Channels · Movies · Series · History`) as a segmented control; favourites reorder by drag (the grip),
`↑ ↓` with `Alt` from the keyboard; the side card says what the order drives.

### 5.8 Account

A settings page in two panes (the groups at the left, 56 px rows at the right, the Windows Settings shape): the TV's
groups (**Provider**, **Playback**, **NBA**, **Languages**, **Films and series** with Add-ons and the TMDB key typed in a
real field, **Home rows**, **Updates**, **About** with the TMDB attribution) plus one PC group, **Windows**: `Start with
Windows` (off), `Close keeps airglow in the tray` (on; reminders need it), `Notifications` (tip-off, update ready),
`Mini player when you leave a game` (on), `Always on top` for the mini player (on), `Pause when the window is hidden`
(off), `Player` (`Hardware decoding: automatic (d3d11va) / off`, `HDR: pass through when Windows HDR is on`, `Audio
device`, `Audio passthrough (AC3, DTS, EAC3)`, `Open mpv.conf` as the escape hatch, as Stremio and Jellyfin give it),
`Second screen` (which display takes the game), `Keyboard shortcuts` (the sheet), `Reset window layout`. Provider gains
`Streams · 4 allowed · 1 in use` (from `max_connections` / `active_cons`), which multiview reads.

### 5.9 Sign-in and first run

The TV's Welcome with real fields: Xtream (server, user, password with Show) or a pasted `get.php` or M3U link, `Sign
in` as the pill; then the three quick choices (your team, the shield, languages), `Pick what you like`, the TMDB key
(typed or pasted), the Stremio account code (`addons.js`, `qr.js`'s code shown as text to type at stremio.com/link).
No phone path: a PC has a keyboard. Several saved accounts. The launch animation plays on a cold start once a day, as
on the TV; any key or click skips it.

### 5.10 Updates

`main.js`'s electron-updater flow as it is: checked 5 s after launch and every 4 h, downloaded quietly, installed on
quit; Account › Updates shows `airglow 0.4.112 is ready · Restart to update` and the About line; the avatar carries the
dot; never over the player and never inside your team's game window (UI-SPEC F8). The release job publishes
`Tuner-Setup.exe`, its blockmap and `latest.yml` already (`build.yml`); the version becomes `0.4.<run>`.

---

## 6. The player

**From the TV:** `player.js` (the command / event vocabulary: `meta`, `game`, `ring`, `tune`, `queue`, `versions`;
events `track`, `need`, `pick`, `progress`, `setting`, `exit`), `games.js` (the per-channel delay, `chaptersOf`,
`asAired`, `bestChannel`), `replay.js`, `catchup.js`, `subs.js` + `subs/*`, `quality.js`, `conncheck.js`, `intros.js`,
`skipshow.js`. The desktop writes the host (`app/desktop/player.js`) the way the phone wrote its `<video>` host: it
registers itself behind `TUNER_NATIVE.player` and talks to mpv through `window.tuner.mpv` (§9).

### 6.1 Modes

| Mode | What |
|---|---|
| Theater (default on play) | the content area is the player; the sidebar folds away; **the 40 px title strip stays** (`06`): the mark, `← Back` named for where you came from, the title line, Windows' caption buttons at the right (never under the video); the video is aspect-fit under the strip (1848 × 1040 at 1920 × 1080, 36 px bars at the sides); `Back`, `Esc` (after full screen and the controls) or `Ctrl W` leaves (a live game to the mini player, a film stops with Resume on its page); `T` keeps the sidebar (the "window" layout for a second monitor's small window) |
| Full screen | `F`, double-click, or the ⤢ disc: the monitor, no strip, no caption buttons, the pointer hidden after 3 s; the first `Esc` leaves full screen (Netflix, YouTube, VLC) |
| Docked (`07`) | `G` or the `Game panel` pill docks the game panel 400 px at the right, **under the title strip**; the picture is pinned to the top of the remaining 1520 at 16:9 (855 high) and the bar, the track, the ends row and the hint line sit in the 185 px band under it, never over the picture (the title block and the corner stay over it on the top scrim) |
| Mini (`09`) | `P` in the player (`Ctrl P` anywhere), or leaving a live game: a frameless always-on-top window of its own, 480 × 270 by default (320 min, 16:9 kept, resizable from any edge), bottom right, snaps to a corner within 24 px, `Ctrl Shift ← →` moves it between corners; its chrome sits **over its picture** in its own overlay (§9) on hover: a top strip (LIVE, the channel, pin, close) and a bottom bar (title, the shield's line or the time left, pause, mute, `⤢` back to the app); the main window's sidebar shows `Now playing`; `P` again or `⤢` brings it back to theater by moving the picture's host window, the same stream (§9) |
| Second screen (later, §7) | the player window on the other display, the game panel as a window on this one |

### 6.2 The v2 bar on a PC (`06`)

The geometry of `player-v2` scaled to the window, the same words: the top block at x 48, y 60 (the logo 60 px of ink
or the title Outfit 700 34, the episode line with the quality badges, the st-what line with the tick, and on a PC what
mpv is doing: `mpv, hardware decoding`), the corner at right 48 (`Ends at 21:02` / `21 min left`; `Paused` / `Ends at …
if you play now`; a game: `Q3 4:12` / `Synced · the score waits 42 s for the picture`; hidden: `Score hidden` / `You're in
Q2`), the buttons row at bottom 158 (48 px discs: `⏸`, `−10`, `+10`, then `Next episode ›` or `Skip intro` as outlined
pills; at the right `CC`, the speaker **with a volume slider that unfolds on hover** (120 px, the number), `⚙` Options,
`⧉` mini player, `⤢` full screen; an episode adds the `Episodes` pill (`E`, the season's list as a right sheet); a game:
`⏮`, `−1m`, `+1m`, `Skip to Q4 ›`, `Back to live`, the `Game panel` pill), the track at bottom 108 (6 px line, the gradient
played part, chapter ticks only up to the live point, the live dot and its compact LIVE pill, the dashed not-aired part,
the 16 px thumb, 22 with the ring from the keyboard), the ends row (the corner's `21 min left` and the track's `−21:00`
are one number), and the hint line at bottom 36 the first 5 times, **per context**: an episode `Space Pause · ← → 10 s ·
↑ ↓ Volume · F Full screen · P Mini player · C Subtitles · ? All shortcuts`; a game `Space Pause · ← → 1 min · End Back
to live · G Game panel · P Mini player · PgUp PgDn Feeds · ? All shortcuts`; never a key from a later version. The pointer
on the track shows the time bubble (and, later, a frame); a button under the bubble fades to 22 % (the scrubbing
rule). Controls show on any mouse move or key, hide after 3 s of rest (never while paused; after 2 min paused they fade
to 35 %, the OLED rule holds for a laptop too). The overlay keeps the pointer over the picture (§9): click = pause /
play, double-click = full screen, the wheel = volume, right-click = Options; `Ctrl` wheel = nothing (reserved).

### 6.3 The docked game panel (`07`)

400 px, `bg-1` at 98 %, a 1 px border at its left: the header (`Game panel`, the `G` cap, `×`); the score plate (crests 44
with the team's secondary as a 2 px edge, the as-aired score in Barlow 38, `Q3 4:12 · as aired · 42 s behind`); the
tabs `Box score · Plays · Quarters · Feeds` (`Tab` cycles); the team toggle; the box score table (Player · Min · Pts · Reb
· Ast · FG; starters, bench, the team row; it updates with the picture, 42 s behind the broadcast, never ahead of it);
Plays (scoring plays in chalk with the pink dot, the clock as text); Quarters (the chapters aired so far, the current one
on `surface-2`, a click jumps there); Feeds (the game's other channels with their quality and `best`); the footer. Under
the shield the plate reads `Score hidden`, the box score waits for the final buzzer (`The box score comes after the
final buzzer`), Plays are hidden, Quarters show only aired chapters, and `Reveal` lives in the `⋯` menu with its confirm.
The same component serves the game page under its header.

### 6.4 Live TV, replays, Options, the rest

The banner (the top block for a channel: number, the logo tile, the channel, the programme as the big line, the times
with the 120 × 4 bar, `Next …`, `Feed 1 of 3`, `Subtitles · Replays 3 days`, the clock and quality tags, LIVE at the live
point) on a zap and 4 s after a tune; `PgUp PgDn` zap; digits tune; the zap card on key down; the channel list (`L`) as
a left sheet with the groups (`Shift L`); `Backspace` the last channel. The timeline for a kept programme or a replay
(`Home` from the start, `End` back to live, the catch-up spec's map); the shield's rules in the player (player-v2 §7)
unchanged. Options (`O` or `⚙`) is a popover from the gear with the TV's rows (Subtitles, Audio, Picture size, Quality,
Connection, Speed, Intros in this show; live: Rewind and pause, Feeds, Sync, Game panel); Subtitles / Audio / Sync /
Connection are right sheets. Subtitles are rendered by mpv from the file the app found (`sub-add`), styled by the app
(chalk, Inter, 5.3 % of the picture); the owner's OpenSubtitles flow is `subs/*` as it is. The copy checks (`probes.js`)
run through mpv too (`--frames=1` probes in an idle instance, one at a time). Skip intro, Up next, the stall and failure
cards, the diagnosis (`conncheck.js` from Node's side, same words), the score bug (top right, the synced delay, hides
under every overlay) are the TV's.

States: loading (black, the title block drawn at once, the spinner after 2 s), stalled (the diagnosis card naming the
side at fault: `Try another copy`, `Check the connection`), the provider's limit (`Your provider allows 4 streams · 4 in
use · the TV is watching …`), paused, behind live, hidden, Up next, no copy (`No copy plays · try another add-on`; mpv
plays every format, so this is a network state, not a format one), mpv missing (`vendor/mpv` lost: `The player is not
installed · Reinstall airglow`).

---

## 7. The PC extras (judged by how much the owner would use each and how hard it is)

| Extra | Use | Effort | When | Why |
|---|---|---|---|---|
| Multiview, 2–4 games or channels, audio follows the click, the picker and drag to a slot, a slot that waits for tip-off, an empty slot (`08`, `13`) | high on game nights | medium (N mpv instances, bounds, mute, the stream cap) | **v1** | the thing no app on his PC does; the NBA app's own shape |
| The mini player, always on top (`09`) | high (browsing during a game) | low (a second window with its own mpv) | **v1** | the YouTube / Apple TV shape; the "leave a game" default |
| The box score docked beside the game (`07`) | high | low (the game panel is a component already; a 400 px dock) | **v1** | what he looks at during a game; the PC has the width |
| The guide as a big grid with drag, wheel, zoom and the right panel (`03`) | high | low–medium (the TV's grid plus pointer handlers) | **v1** | the TV's guide with the mouse's verbs |
| The one box: search and commands (`10`) | high daily | medium (an index over catalog, guide, schedule, settings) | **v1** | the desktop convention; replaces the TV's keyboard screen |
| Shortcuts for everything and the sheet (`11`) | high | low | **v1** | the remote's hint bar, grown up |
| Notifications at tip-off and the tray | high (reminders are NEXT.md's first item) | low (`Notification`, `Tray`, a timer in main) | **v1** | cheap on Windows; needs the tray to fire with the window closed |
| Media keys from any app (play / pause, next / previous zap), registered only while airglow plays | medium | trivial (`globalShortcut` on play, released on stop) | **v1** | never taken from Spotify or the browser while airglow is idle |
| Window memory (bounds, monitor, maximised), the sidebar's fold, the last page | medium | trivial | **v1** | every desktop app |
| Second-screen mode: the game full screen on one monitor, the panel (box score, plays) as a window on the other | medium (only with a second monitor) | low–medium (`screen.getAllDisplays`, a second player window, `--fs-screen`) | **v1.1** | the laptop has one screen; build it when he has a monitor |
| Frame thumbnails on the track (thumbfast) | medium | medium (a background mpv per playing file; `network=yes`) | **v1.1** | Netflix / YouTube have them; the provider's streams allow it on a PC's CPU |
| Muted live preview in the guide's panel (1.5 s dwell, one extra stream) | medium | low | **v1.1** | the TV's setting; costs a connection on a 1-stream account |
| Global zap and volume keys while another app is in front | low–medium | low | **v1.1** | nice with the mini player; collides with other apps' keys, so opt-in |
| Downloads of add-on copies for offline (direct links to a file, mpv plays it) | low (he watches at home) | medium (a download queue, storage, expiry; debrid links expire) | **later** | only if he travels with the laptop; Netflix's removal shows people miss it, but it is not his use |
| Picture-in-picture over other apps' full-screen games (PS5 is HDMI, not the PC) | low | – | **no** | not a PC case |
| Discord rich presence, Chromecast | low | – | **no** | not asked, not his |

Rules shared by the v1 extras: every extra is one key and one menu item away, never a mode he must learn; each one
respects the shield (a multiview tile, the mini player's bar, a notification's text, the tray's menu and a palette's
action row print `Score hidden` and the masked name, never a result; a reminder toast that sits in Windows' Action
Center is never updated with a result afterwards); each one counts against the provider's streams (the copy checks'
probes included) and says so.

**The multiview add flow (`13`).** `Add a game or channel` (the header button, an empty slot's `Choose…`, `Ctrl M`
from any card, the palette's `Add … to multiview`) opens the picker at the right of the tiles (320 px): a search field
(`Find a game, a channel or a number`), `Tonight's games` (crests, the name, the state: `03:30 · in 18 min · NBA League
Pass`, `Final · post-game on …`, or `In slot 1 · ESPN · 4K · live` for a game already placed, dimmed with a tick) and
`Favourite channels` (the tile, number · name, what is on); each row has `+` (the next free slot) and a grip (drag onto a
slot). An empty slot reads `Empty slot · Drop a game or a channel here · Choose…`; while a row, a game card or a channel
row is over it, it lights pink and says `Drop to add · tunes at 03:30` (or `· Score hidden` for his team). A game before
tip-off becomes the waiting slot (`08`) and tunes itself; a channel tunes at once; a game already on another tile moves
there instead of starting twice. The picker closes with `Esc` or when every slot is full; the sidebar is the rail
throughout multiview.

---

## 8. Keyboard shortcuts (the sheet, `11`)

| Group | Keys |
|---|---|
| Everywhere | `Ctrl K` search and commands · `/` search · `?` this sheet · `Ctrl 1–6` sections · `Alt ← →` back / forward · `Ctrl B` sidebar · `Ctrl ,` settings · `F11` full-screen window · `Ctrl P` mini player · `Ctrl Shift M` multiview · `Ctrl R` remind me (on a game) · `Ctrl Shift P` print the sheet |
| Browsing | `↑ ↓ ← →` move · `Enter` open · `Shift Enter` play now · `S` save · `X` not interested · `Shift F10` / right-click menu · `PgDn PgUp` next / previous row · `Home` top · `Shift` wheel scroll a row · `0–9` tune a channel (Home and Live only) |
| The guide | `← →` or drag along time · `↑ ↓` or wheel channels · `PgUp PgDn` a page · `N` back to now · `D` day · `Ctrl` wheel zoom · `Enter` tune · `Shift Enter` from the start · `F` favourite · `R` remind me |
| The player | `Space` `K` or click play / pause · `← →` `J L` 10 s · `Shift ← →` 1 min · `↑ ↓` or wheel volume · `M` mute · `F` or double-click full screen · `Esc` leave full screen · `C` subtitles · `A` audio · `Q` quality · `[ ]` speed · `O` options · `G` game panel · `P` mini player · `N` next episode · `E` episodes · `Enter` skip intro / recap when offered · `Esc` hide the controls, then leave · `Ctrl W` close the player |
| Live TV | `PgUp PgDn` zap · `0–9` channel number · `Backspace` last channel · `L` channels · `Shift L` groups · `Space` pause live · `End` back to live · `Home` from the start · `Ctrl Shift R` reveal the score |
| Multiview | `Ctrl M` or drag add from any card · `1–4` audio to a tile · `Shift 1–4` or double-click expand · `Del` remove · `Ctrl L` layout · drag swap · `Esc` leave |
| Windows and screens | `Ctrl Shift T` always on top · `Ctrl Shift ← →` snap the mini player · `Ctrl Shift H` minimise to the tray · media keys while airglow plays |

Rules: **one meaning per key**: `Ctrl ← →` is the NBA sections and nothing else; digits tune on Home, Live and in the
player and pick a tile's audio only in multiview, never in a text field; `Esc` is one ladder (full screen → the controls
→ the player → the sheet or the palette → Back); `Ctrl` for app-wide commands; single letters only inside the player,
the guide and the rows (`?` and `/` are punctuation and work everywhere outside a field); every tooltip names its key;
the sheet is generated from the one key map (`app/desktop/keys.js`) so it cannot drift and the map refuses a duplicate
in one scope; a conflict with Windows (`Alt F4`, `Win`, `Ctrl Alt Del`) is never claimed; `Ctrl Shift R` for Reveal is
deliberately awkward; second-screen keys arrive with second-screen mode (v1.1), not before.

---

## 9. Architecture (the builder follows this)

**Shape.** One Electron app (`main.js`, Electron 45 as in `package.json`), one renderer page `app/desktop.html` with
new views in `app/desktop/` (one file per screen, as the phone did in `app/phone/`), **reusing `app/tv/js`'s data
modules as they are** (rows, shelves, tmdb, art, guide, catalog, catchup, replay, games, league, nba, copies,
titlecopies, subs, quality, conncheck, intros, skipshow, addons, qr, imdb, state, session, util, ui's sheets and
menus; `focus.js` for the keyboard's arrows), `app/core.js`, `app/nba.js`, `app/titles.js`. `app/desktop/bridge.js`
sets `window.TUNER_NATIVE` before any TV module loads (exactly phone-v1 §5's trick), implemented over `window.tuner`
from `preload.js` (`contextIsolation`, `sandbox: true` kept; IPC only). The old `app/index.html` / `app/app.js` /
`app/player.js` / `app/nav.js` are retired once the new shell plays.

**The three kinds of window (the rule the whole plan follows).** (1) **Electron windows**: the main window, the mini
player's window, later the second screen's; the pages in them are ordinary HTML. (2) **Host windows**: for every picture
airglow creates a plain Win32 child window (`CreateWindowExW` with the `STATIC` class, no window procedure of its own,
`WS_CHILD | WS_VISIBLE`, a black brush) as a child of the Electron window at the video rect; mpv attaches to the host
with `--wid` and fills it (mpv sizes its video to whatever parent it is given, which is why the main window's own handle
is never passed: that would cover the sidebar and everything else). airglow moves and sizes hosts with `SetWindowPos`
and re-parents them with `SetParent` to hand a picture between Electron windows. (3) **Overlay windows**: whenever a host
is on screen in an Electron window, one transparent frameless child window of that window (`parent`, `transparent:
true`, `frame: false`, `hasShadow: false`, `skipTaskbar: true`, **`focusable: false`** so it never activates and the
keyboard stays with its parent) covers that window's **whole content area** and hosts **everything that floats**: the
player's controls, title block, corner, timeline, chips, banner, hint line and panels, the docked panel's popovers, the
palette, the shortcuts sheet, context menus, toasts, tooltips, multiview's borders, numbers, chips, label strips, drop
states and picker, and the mini player's strip and bar. Nothing in the parent page can draw over a host (the airspace
rule), so nothing floating is ever drawn there while a host is up; the sidebar, the title strip and the band under a
docked picture are the parent's, because no host covers them. The overlay is sized to the content area on every
`resize`, **hidden on `will-move` / `will-resize` / `minimize` and shown again on `moved` / `resized` / `restore`**
(owned windows do not follow their owner during a drag or a Snap animation), and it **keeps all pointer input over
the picture**: it paints a 1 % alpha fill over the video rects (so Windows treats the pixels as hit-testable; the spike
confirms this) and turns clicks into pause / play, double-clicks into full screen, the wheel into volume and right-click
into Options, forwarding nothing to mpv (which runs with `--input-cursor=no`); `setIgnoreMouseEvents` is used only over
the band and the sidebar when the overlay covers them, with `{ forward: true }` so hover still reaches the overlay's
controls. Keyboard events go to the main window's page (the overlay is never focused); the two pages share state over
IPC through main (`overlay.state`), one message per change, never per frame.

**mpv, embedded (plan A, the one to build).** `mpv.js` becomes an `MpvInstance` class (one per picture: the player, each
multiview tile, the mini player, the probe): spawns `vendor/mpv/mpv.exe` (shinchiro's build via `scripts/fetch-mpv.js`,
as today) with `--wid=<host HWND>` (the host window's handle as mpv expects it on Windows, a 32-bit HWND value),
`--input-ipc-server=\\.\pipe\airglow-<pid>-<n>`, `--idle=yes --keep-open=yes --force-window=yes`,
`--vo=gpu-next --gpu-context=d3d11 --hwdec=auto-safe` (d3d11va), `--target-colorspace-hint=yes` when the HDR setting is
on, `--audio-device=<chosen>`, `--audio-spdif=ac3,dts,eac3` when passthrough is on, `--sub-*` for the house subtitle
style, `--osc=no --osd-level=0 --input-default-bindings=no --input-cursor=no --window-dragging=no --cursor-autohide=no`
(the app draws and handles everything), `--cache=yes --demuxer-max-bytes=200MiB --network-timeout=20`, the live
reconnect options from today's `mpv.js`, `--user-agent` from the provider. The host is created, placed, sized, raised
(`HWND_TOP` among the Electron window's children, above Chromium's own child HWND, which is where the Node-MPV report of
§1 stopped) and re-parented by the main process through `app/desktop/win32.js`, a 60-line module over
[koffi](https://koffi.dev) (a prebuilt FFI package, so no native build step: `CreateWindowExW`, `DestroyWindow`,
`SetWindowPos`, `SetParent`, `ShowWindow`, `GetClientRect`); the renderer sends each picture's rect over IPC on every
layout change and main applies it in one `SetWindowPos` per host. The old `player/tuner.lua` goes (its keys become the
app's). The overlay (above) loads `app/desktop/overlay.html`; the docked panel and the band under a docked picture are
ordinary HTML in the main window because no host covers them; the subtitles the app renders itself (when mpv's ASS
rendering of the OpenSubtitles file is not wanted) live in the overlay.

**Hand-offs are moves, not restarts.** A game going to the mini player, a tile expanding to the player and back, the
audio tile becoming the player when multiview closes: the picture's host window is **re-parented with `SetParent`
into the other Electron window** and placed; the mpv instance, its stream and its buffer are untouched, so there is no
second connection and no gap (`--wid` names the host, and the host is what moves). The TV's zap rule (a second stream
overlapping the first for 1 s) is used only when the source really changes.

**The spike (one day, step 1 of §10).** On the owner's laptop, in Electron 45: a host child HWND with mpv in it shows
video, resizes cleanly, survives a monitor change, sleep and a Windows HDR toggle (a 4K HEVC HDR file and a live
`.ts`); the overlay's 1 % alpha fill takes the mouse over the picture; `focusable: false` keeps typing in the main
window; the overlay hides and shows cleanly around a window drag and a Snap; `SetParent` moves a playing host between
two windows without a frame drop; an SDR overlay over an HDR swapchain is not dimmed. Pass → plan A. **Fallbacks, in
this order: A → C → B.** **Plan C, the one that works today:** mpv as its own borderless top-level window (as `mpv.js`
does now), owned by the Electron window (`SetWindowLongPtrW GWLP_HWNDPARENT`) so it stays above the app and follows its
activation, glued to the video rect by `SetWindowPos`; the overlay sits above it the same way and the rest of the plan
(hosts per picture, hand-offs by re-owning) is unchanged; it costs three top-level windows instead of one. **Plan B, the
last resort:** `electron-mpv-video`'s shape, libmpv in a native addon rendering to a shared D3D11 texture into Chromium
(Electron 40 +), the video a `<canvas>` in the page, no overlay at all; it is the least proven (early stage, no
performance figures, `sandbox: false` on the player page, a built addon), so it is tried only if both child-window plans
fail on his machine.

**Multiview.** `MpvInstance` × N, each in its own host at its tile's rect (2 × 2: 850 × 478 tiles at 1920 with the rail
and 8 px gaps; 700 × 394 with the picker open; 2 across; 1 + 2), `--mute=yes` on all but the audio tile (`set mute` over
IPC when the audio moves; the border, the numbers, the `Audio` chip, the label strips, the drop states and the picker
are in the overlay), `--hwdec` on all (four 1080p streams decode on any 2020 + laptop; four 4K ones do not, so a tile
asks for the provider's HD copy when the slot count is over 2, and the bar says `HD in multiview`), a waiting slot is a
timer in the renderer that tunes at tip-off, the provider's `max_connections` caps the slots and counts the probes
(`Your provider allows 4 streams · 2 in use`; the copy checks pause while multiview is full). Leaving multiview quits
every instance but the audio one, whose host becomes the player's (a move).

**The mini player.** A second frameless `BrowserWindow` (`alwaysOnTop` at `'floating'`, `skipTaskbar`, `setAspectRatio(16/9)`,
`minWidth` 320, remembered bounds) with the picture's host re-parented into it and **its own overlay** (the same rules:
non-activating, the strip and the bar drawn over the picture on hover, hidden while the mini window is dragged); the
main window's `Now playing` card reads its state over IPC; `⤢` or `P` re-parents the host back into the main window.

**Second screen (v1.1).** `screen.getAllDisplays()`; a `BrowserWindow` per display; the game full screen on the chosen
one (`setFullScreen` on that display's bounds) with the host moved there, the game panel as a 400 px window on the
other; `Ctrl Shift S` swaps (the key arrives with the feature).

**Native Electron work (main process).** Windows: `titleBarStyle: 'hidden'` + `titleBarOverlay` (the WCO), window
state saved to `userData`, min size, `setContentProtection` off (he may screenshot). Tray: `Tray` with the airglow mark,
the menu `Grizzlies at Trail Blazers · 02:00 · Watch`, `Open airglow`, `Multiview`, `Quit`; `close` hides to the tray
when the setting is on. Notifications: `app.setAppUserModelId('app.tuner.player')` (the NSIS appId), `new Notification`
with the masked title, `click` opens and tunes; the reminder schedule is kept in `userData` and re-armed on launch;
`powerMonitor` `resume` re-checks the clock; a toast already shown is never edited afterwards (the Action Center keeps
it, and a result there would be a spoiler). Global shortcuts: `MediaPlayPause`, `MediaNextTrack`, `MediaPreviousTrack`
only (`globalShortcut`), **registered when playback starts and unregistered when it stops or pauses for more than 2
min**, so an idle airglow never takes them from Spotify or the browser; everything else in-window. IPC (`preload.js` →
`window.tuner`): `mpv.create/play/command/quit/onEvent(id)`, `host.{rect(id, rect), moveTo(id, window)}`, `overlay.state`,
`window.{mini, theater, fullscreen, alwaysOnTop, snap, state}`, `notify`,
`reminders.{set, list, clear}`, `tray.update`, `displays`, `updates.*` (as today), `net.fetch` for the diagnosis
(`conncheck.js`'s checks run in main with Node's sockets, so the provider sees a plain client), `files.{mpvConf, log}`.
Headers: today's `onBeforeSendHeaders` rewrite stays (Origin / Referer stripped, the provider's user agent).

**Updates.** electron-updater from the GitHub release, `latest.yml`, quiet download, install on quit or on `Restart`;
`VERSION` `0.4.<run>` shared with the TV; a failed update shows the TV's words in Account › Updates.

**Performance targets.** Idle (Home drawn, nothing playing): under 2 % CPU and 250 MB; a 4K HEVC HDR copy: hardware
decoding, under 10 % CPU on his laptop's iGPU, no frame drops at 24 / 50 / 60 Hz (`--video-sync=audio` default; `Match
frame rate` is a Windows display-mode change, offered as a setting but off: it is slow on laptops); four 1080p tiles:
under 35 % CPU; the overlay repaints only on state changes (the TV's "no string built on a press" rule); images at slot
size, chosen by **`width × devicePixelRatio`** (`sized()` as on the TV: posters `/poster/small/` at 1x and `/medium/` at
1.5x and up, the Marquee `/background/large/` at 1920 physical px and the original at 2560 and up).

**Security.** `contextIsolation` and `sandbox` stay on for the app page; `webSecurity: false` stays only because the
provider's servers send no CORS headers (as today), so the renderer never loads remote pages (`will-navigate` and
`setWindowOpenHandler` deny, as today); mpv gets URLs only (never shell arguments from content); the mpv.conf escape
hatch is the user's own file, read by mpv, never by the app.

**Tests and CI.** Playwright drives Electron (`_electron.launch`) against the fake provider and fake ESPN
(`tests/tv/serve.sh`): `tests/desktop/flows.js` walks sign-in, Home, the guide, the hub, a title page, the palette, the
sheet, multiview's layout (mpv with `--vo=null --ao=null` on the runner), the mini window's bounds, a notification's
text under the shield; `build.yml`'s Windows job keeps the packaged `--smoke-test` (it already proves the bundled mpv
runs) and adds the flows; screenshots upload with the Android ones.

---

## 10. What the builder changes in which files (and the order)

| File | Change |
|---|---|
| `app/desktop.html`, `app/desktop/desktop.css` | the shell page (title bar, sidebar, content) on `app/tv/brand/*` and `app/tv/ui.css`; this folder's `desktop.css` is the starting sheet |
| `app/desktop/bridge.js` | `window.TUNER_NATIVE` over `window.tuner`: `player` (play / stop / command / onEvent to the `MpvInstance` the host owns), `updates`, `sfx`, `diag`, `info()` = `{ version, code, tv: false, desktop: true, replay: true, subs: true, segments: true }`, `onBack`, `onResume` (`powerMonitor`), `exit` |
| `app/desktop/main.js` (renderer) | start-up (the launch animation, the router), the key map (`keys.js`), the palette, the sheet, the sidebar, window state, the Offline pill |
| `app/desktop/keys.js` | the one key map (§8); the sheet and every tooltip read it |
| `app/desktop/home.js`, `live.js`, `nba.js` (+ `nbateam.js`, `nbaleague.js`, `nbanews.js`, `nbaplayer.js`, `nbagame.js`), `library.js`, `detail.js`, `search.js`, `saved.js`, `account.js`, `signin.js` | the views, one per screen, on the models the phone already lifted out of the TV screens (`screens/home.js`'s lines, `live.js`'s `programmeView`, `hub.js`'s hero table, `detail.js`'s facts and episodes, `account.js`'s groups) |
| `app/desktop/guide.js` | the grid: cells positioned by time, drag / wheel / zoom, the panel, the Now flag |
| `app/desktop/palette.js` | the index (catalog, guide, schedule, teams, settings, pages) and the sheet |
| `app/desktop/player.js` | the host behind `TUNER_NATIVE.player`: asks main for an `MpvInstance` in a host window, sends the picture's rect, owns the overlay's state (controls, panels, chips, banner, timeline), the title strip's Back, the docked panel and its band, mini / theater / full screen, the `Esc` ladder |
| `app/desktop/overlay.html`, `overlay.js` | everything that floats while a picture is on screen (the `pv-*` classes of `player-v2.css` at desktop sizes, the palette, the sheet, menus, toasts, tooltips, multiview's chrome and picker, the mini player's chrome); the pointer over the picture (click, double-click, wheel, right-click); never focused |
| `app/desktop/multiview.js`, `mini.html` / `mini.js` | the tiles, the audio border, the picker, drag and drop, the waiting and empty slots; the mini window's page |
| `app/desktop/win32.js` | koffi: `CreateWindowExW` (the `STATIC` host), `DestroyWindow`, `SetWindowPos`, `SetParent`, `ShowWindow`, `GetClientRect`, `SetWindowLongPtrW` (plan C only); nothing else |
| `mpv.js` | `MpvInstance` (id, its host HWND, `--wid`, the named pipe, `observe_property` for time, duration, pause, mute, volume, track lists, `demuxer-cache-state` for the diagnosis, `sub-add`, `audio-add`, `playlist`, `seek`, the live reconnect), `MpvProbe` (the copy checks, counted against the streams) |
| `main.js` | the windows (main with the WCO and the title strip, one overlay per Electron window that holds a host, mini, later the second screen), the hosts (`win32` glue, rects, `SetParent` moves), the overlay's hide / show around moves, the tray, notifications and the reminder schedule, media keys while playing, window state, IPC handlers (§9), `conncheck` in main, the updater as it is, `--smoke-test` kept |
| `preload.js` | the `window.tuner` surface of §9 |
| `scripts/build-web.js` | a `desktop` target is not needed: Electron loads `app/desktop.html` straight from the repo (as the PC app does today); `package.json` `build.files` adds `app/desktop/**` and drops the old PC files when they go |
| `scripts/fetch-mpv.js` | unchanged (mpv.exe); add `libmpv-2.dll` only if plan B is taken |
| `package.json` | `productName` and the NSIS `shortcutName` become `airglow` (the appId stays `app.tuner.player` so updates keep working); `koffi` as a dependency; `playwright` dev |
| `tests/desktop/flows.js`, `.github/workflows/build.yml` | the Playwright walk on the Windows job |
| `CLAUDE.md` | the desktop section: `app/desktop.html` + `app/desktop/`, mpv's `MpvInstance`, the overlay, the tests |

**Order.** (1) The spike of §9, one day, on the owner's laptop: the host child HWND, the overlay's pointer and focus
rules, the `SetParent` move, HDR. Decide A, else C, else B. (2) The shell:
`desktop.html`, the sidebar, the router, `bridge.js`, Home and the title page, the launch. (3) The player host, the
overlay, the v2 bar, the banner, the timeline, Options; the game panel docked. (4) The guide. (5) NBA. (6) Library,
Search, the palette, the sheet, Saved, Account, sign-in. (7) The mini player, multiview, the tray and notifications,
media keys, window memory. (8) The flows test, CI, the first Windows release. Each step runs against the fake provider.

---

## 11. States every page shares

| State | What shows |
|---|---|
| No provider | the sign-in card in Home's Marquee slot, in Live's grid and in NBA's hero place; the NBA pages still work on ESPN alone, as on the TV |
| Offline with a cache | the pill `Offline · showing what airglow remembers` at the title bar's right, no LIVE pills, no clocks, `Needs a connection to play` on every play button, the diagnosis card when a stream drops |
| Loading | the final layout with flat blocks, never a spinner on a page; the player's black and spinner after 2 s |
| Empty | the TV's neutral card (icon disc, title, one sentence, one button) |
| An error | neutral, icon + text on `surface-1`, `Try again`; never red (red is LIVE) |
| mpv not found | `The player is not installed · Reinstall airglow`, with the GitHub release link |
| Window too small (< 1024 × 640) | Windows refuses the size (`minWidth` / `minHeight`); a snapped quarter at 1080p is 960 × 540 and gets the compact layout at the minimum size |
| Another airglow running | the second instance focuses the first (`requestSingleInstanceLock`) and passes its arguments (a tune from a notification) |

---

## 12. Where this departs from the TV spec, and why

- **A sidebar for the top bar** (decision 2): desktop convention, Windows' title bar, scaling.
- **Buttons where the TV prints hints** (`Resume` · `Episodes` · `⋯` instead of `→ Episodes · Hold …`): a mouse needs
  targets; the keys are still said once (the caption, the tooltips, the sheet).
- **The command palette for the keyboard screen**: a PC has a keyboard.
- **The episode list is vertical**: a mouse reads lists; the TV's rail suits a D-pad.
- **The guide's Now panel is a right column, not a top row**, and the grid is 3 h: the width is there.
- **The player docks the game panel**: a PC extra; the TV's floating panel stays the rule when the dock is closed.
- **Leaving a game keeps it in the corner** (the TV stops): a PC multitasks.
- **Posters are 170 × 255 at 1920, not the TV's 248 × 372 (2x of 124 × 186)**: the viewing distance is a quarter of the
  TV's; the TV's canvas doubled would show four posters where a PC shows eight.
- **The type floor is 12 px** (badges, captions, key caps) instead of the TV's 14: 60 cm versus 3 m.
- **No `Match frame rate` by default**: a laptop's display-mode switch is slow and flashes; a setting for a TV over HDMI.
- **No phone sign-in path**: typed on a keyboard.

---

## 13. Open items (need the owner's laptop)

1. The spike (§9): the one decision the build hinges on; the three plans are written so the builder loses no design
   either way. Its open questions: does Windows hit-test a 1 % alpha fill in a transparent Electron window (else the
   overlay keeps `setIgnoreMouseEvents(false)` over the whole picture and passes nothing); does a `STATIC` host need its
   own message loop for mpv's d3d11 swapchain (it should not: mpv creates its own child inside it); is an SDR overlay
   dimmed over an HDR host.
2. His laptop: the GPU (d3d11va for HEVC 10-bit?), the display (HDR? 125 % scaling?), a second monitor or not (second
   screen goes to v1.1 until there is one).
3. The provider's `max_connections` on his account: it decides how many multiview slots he really gets.
4. The sound in Electron: the UI sounds through Web Audio were fine on the PC before; confirm no delay with the new shell.
5. Windows notifications need the app registered (the NSIS installer does it; a portable build would not): confirm on
   the first install that a reminder toast shows with the window closed and the tray on.
6. The 3 s controls hide and the 2 min paused fade on a laptop screen: confirm they feel right with a trackpad.
7. The TMDB key: typed on the PC, it stays on the PC (the TV's key is typed there); a one-time "send from the TV's phone
   page" is open item 6 of phone-v1 and stays out.
8. Episode stills (Cinemeta's thumbnails) for the title page's list; the mock reuses the backdrop.
9. A real broadcast frame for `07`, `08` and `09` from his provider, to check the stand-in scrims against a bright court.
10. The guide's `Earlier on this channel` list and `kept` badge depend on the provider's catch-up answers (NEXT.md's
    guide questions apply to the PC as much as to the TV).

---

## 14. Strings (new on the PC; everything else is the TV's)

Title bar: `Search or jump to anything`. Sidebar: `Now playing`, `Account`, `update ready`. Home: `Browse · 15 rows`,
`See all`, `Enter plays · right-click for more`, `Enter opens Details · Shift Enter plays`. Guide: `Now`, `3 h`, `Tune
now`, `From the start`, `Multiview`, `Also on …`, `Earlier on this channel · replays for 3 days`, `kept · 1 h`, `Tips off in
2 h 19 min`, `drag to pan · Ctrl wheel zooms`. NBA: `Add to multiview`, `Last game`, `Remind me is a Windows notification
10 min before, even when airglow is closed`, `tip-off order`. Player: `mpv, hardware decoding`, `Game panel`, `Hide the
panel`, `Mini player`, `Send to the other screen`, `All shortcuts`, `Ends when the game ends`, `Synced · the score waits
42 s for the picture`, `as aired · 42 s behind`, `The box score comes after the final buzzer`. Multiview: `4 of 4 slots`,
`Your provider allows 4 streams · 3 in use`, `Audio: …`, `Add a game or channel`, `Full screen`, `Tips off at 03:30 · in
18 min · this slot tunes NBA League Pass by itself`, `Tune now`, `Clear slot`, `HD in multiview`. Mini player: `In the
corner · ESPN · Score hidden`. Palette: `Actions`, `Teams`, `Channels`, `Films and series`, `Games`, `Settings`, `Pages`,
`Tune`, `Details`, `Remind me`, `Type a channel number to tune`. Sheet: `Keyboard shortcuts`, `Windows · the same words as
the TV's remote`, `Print`. Account › Windows: the rows of §5.8. Notifications: `Grizzlies at Trail Blazers tips off at
02:00 · Watch`, `airglow 0.4.112 is ready · Restart to update`. Tray: `Open airglow`, `Multiview`, `Quit`. States: `The
player is not installed · Reinstall airglow`, `Your provider allows 4 streams · 4 in use · the TV is watching …`.
