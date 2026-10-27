# Home v2: research

What makes the big TV home screens good with a remote, and what of it belongs in a one-person IPTV + NBA app. Written
before the design (`SPEC.md`), kept short. Every finding carries where it comes from.

How to read the marks: **(P)** = the primary page was read in full during this work (Apple's and Google's design
guidelines were reachable from the session); **(S)** = a secondary source: press coverage, help pages or forum
threads reached through search summaries, treated as a hint and said so. The hosts for Netflix's own tech blog, Apple's
newsroom and support pages, Google TV help, Plex support, Firecore's forum and the trade press were not reachable from
this session's network, so those points are (S) and the owner can check them on his side if any decision hangs on them.

## 1. The apps, one by one

### Netflix (TV app, the 2025 redesign)
- The homepage is "a two-dimensional layout" of rows; Netflix picks which rows appear, their order and the titles inside
  each, and it treats some rows as **task rows** (Continue Watching, My List) that must be on the page and the rest as
  **discovery rows**, chosen for relevance and *page-level diversity* (no two rows alike). ("Learning a Personalized
  Homepage", Netflix tech blog 2015, S.)
- One **billboard** per page: a single title spanning the width, with artwork chosen per member. Artwork is the thing
  that gets a title noticed; Netflix picks it per title per member, which is why the billboard carries a key frame, not
  a poster. (S)
- The 2025 TV overhaul moved the menu from a left rail to the **top**, with shortcuts (Search, Home, Shows, Movies, My
  Netflix), made title cards **bigger** and shows a title's synopsis and badges when it has focus, and made the rows
  react to what you did in the session ("responsive recommendations"). The stated reason: members did "a lot of eye
  gymnastics" between rows and title details. The complaints: too few titles on screen, familiar categories gone. (S)
- Netflix had to add an **"Autoplay previews while browsing" switch** after years of complaints about the billboard's
  trailer playing by itself. (S)

### Apple TV app (tvOS 17.2 redesign)
- Home is **Up Next first**: the row of what you are in the middle of, next episodes, and, if you follow a team, its
  **live game with the live score**; alerts "if the game is close so that you can quickly switch to the action".
  (Apple support page, S.) This is the closest thing on the market to airglow's "your team is live" hero.
- Users complained in tvOS 16.2 when Up Next was pushed below a promotional hero and rows could not be rearranged; the
  17.2 redesign put a sidebar in, which reviewers found heavier than the old top tabs. (S) Lesson: the resume row has to
  stay at the top and the owner should be able to hide or order the rest.
- Apple's Top Shelf guidance (P, HIG "Top Shelf"): "Feature new content … avoid promoting content that people have
  already purchased, rented, or watched"; "Personalize people's favorite content … letting people resume media
  playback"; "Avoid showing advertisements or prices"; scrolling banners should be "three to eight images"; a static
  image must not imply it is interactive.
- Focus (P, HIG "Focus and selection"): "Avoid changing focus without people's interaction", "Design your interface to
  accommodate components in various focus states" (the scaled state needs room), "use a focus ring for a text or
  search field, but use a highlight in a list or collection".
- Playing video (P, HIG): "Avoid asking people if they want to resume playback", "Use the previous end time when
  resuming", "Avoid displaying loading screens when possible", "Show a contextually relevant screen" after playback.

### Google TV (the Philips' own launcher)
- Home is the **For you** tab: a hero carousel, **Top picks for you**, **Continue watching** with a progress bar, then
  genre and app rows; a title in Continue watching can be hidden with hold-select → Hide. (Google TV help, S.) The
  launcher plays video and audio previews on the hero by default and both have off switches in its settings. (S)
- Android TV design (P, developer.android.com/design/ui/tv): the **immersive list** is "a row of content & preview of the
  selected item … When a user navigates through the row of content, the preview area automatically update[s] to display
  the current focused item"; backgrounds "16:9 … scale and align the subject to the top right corner"; the focused card
  scales **1.1** with a border. The **featured carousel** "showcase[s] a selection of content relevant to the user",
  with overline, title, description and a button, and "Use a scrim to improve readability". **Cards**: 16:9 is "the
  most common aspect ratio", 2:3 "to break up the grid and bring more emphasis"; 20 dp between cards; 4 cards across are
  196 dp wide; compact cards put text over the image under "a semi-transparent black gradient overlay"; "Avoid long
  descriptions on vertically stacked cards".

### Disney+ (the 2025 redesign)
- A **For You** home with recommendations and "continue watching where you left off", separate brand tabs, cinematic
  poster-style artwork on rows, badges such as "New Series" and "Season Finales", and an **autoplaying** hero
  carousel. Titles can now be removed from Continue Watching. (S)

### Max (HBO Max)
- Reviewers praised Max for putting **Continue Watching right under the main carousel** and criticised Hulu for leading
  with a promoted show; the loudest complaints were the hero trailer's audio playing by itself with no switch. (S)

### Plex
- Home is a stack of **hubs** the server admin can turn on and off and order per library; **Continue Watching is always
  shown and always first**; On Deck was merged into it; how long a title stays in it is a setting ("weeks to consider").
  (Plex support and forums, S.)

### Infuse
- Home opens on **Up Next** (a setting chooses "Watching only", "Recently added only" or both); the other rows (Recently
  Added per library, favourites, lists) are edited from a menu at the top right; users asked for Up Next to hide when
  empty and for the top row to be configurable. (Firecore forum, S.)

### Stremio
- The **Board** is Continue Watching at the top, then **one row per catalog of every installed add-on** (Cinemeta's
  "Movies Popular", "Series Popular", "Featured…"), in add-on order, which users cannot change without a helper add-on.
  (Stremio docs mirror and community posts, S.) The TV app also publishes Continue Watching to the Google TV launcher.

## 2. What the good ones share

1. **The first row is what you were doing.** Continue / Up Next sits at the top of Apple TV, Max, Plex (locked there),
   Infuse, Stremio, and Google TV keeps it on the first screen. Every app that pushed it down (Apple 16.2) got pushed
   back.
2. **One billboard, not a carousel you have to work.** Netflix shows one title; Apple's scrolling banners are 3 to 8
   and rotate on a timer only until something is focused; Google's carousel exists but is the part people switch off.
3. **Art first, text second.** 16:9 key frames with a scrim on the card (Android), 2:3 posters "for emphasis", the
   billboard's artwork chosen per person (Netflix). Nobody shows a title list.
4. **Few big things.** Netflix's 2025 redesign made cards bigger and rows shorter and only got complaints about the
   titles being *too* big; Android's grid is 4 cards of 196 dp or 5 of 124 dp across a 960 dp canvas.
5. **Rows the person can hide or order**, and a "remove from Continue watching" action (Google TV, Disney+, Plex).
6. **No autoplay without a switch.** Every app with an autoplaying hero added an off switch after complaints.
7. **Focus never moves by itself** and the focused thing is the biggest, brightest thing (Apple HIG, Android focus
   scale 1.1 with a border).
8. **Resume without asking**, and land somewhere sensible after playback (Apple HIG).

## 3. What carries over to airglow, and what does not

| Pattern | Carries over? | How |
|---|---|---|
| Continue watching first | **Yes, locked** (Plex's rule) | Row 1 whenever it has items; the billboard is the first item when there is no game |
| Up Next merges resume + next episode (Apple, Infuse) | Yes | A finished episode becomes the next one in Continue watching (already so); a new episode of a show he follows is a separate row (New in your shows) |
| Your team's live game in Up Next with the score, alerts when it is close (Apple) | Yes, better | The game is the billboard from 3 h before tip-off; the shield hides the score; "Tell me when my team is live" exists (the action chip) |
| One billboard with key art and a synopsis (Netflix, Android featured carousel) | Yes | Full-bleed backdrop, eyebrow, title, one meta line, 2-line synopsis for a discovery pick, three buttons |
| Billboard rotation on a timer (Apple banners) | **No** | The focused button must never change its meaning under the thumb (UI-SPEC principle 4); the discovery pick changes once a day, between visits |
| Autoplaying trailer or preview | **No** | No trailers exist on an IPTV provider; the brand bans masked video; the only moving picture stays the opt-in muted slab preview of UI-SPEC 3.5 |
| Immersive list (the background changes with the focused card) | **No** | Every focus move would decode a new 1920 px image on a weak WebView; the billboard is one image per visit |
| 16:9 cards with a scrim and text over the image (Android compact card, Netflix) | Yes | The 198 × 111 wide card for Continue watching, new episodes and channels |
| 2:3 posters "for emphasis" (Android), captions under the art (brand sign-off 2) | Yes | Title rows (Because you watched, Top picks, New on your provider, In 4K, Á íslensku, Saved for later) |
| Bigger cards, fewer titles (Netflix 2025) | Partly | 4 wide cards or 6 posters across, plus a peek; the billboard is the one big thing |
| "Because you watched" and "Top picks" (Netflix, Google TV) | Yes, honestly named | Seeds and rules are printed in the row's subtitle (the last title he finished; "Popular this week · English first"); no fake personalisation |
| Rows per add-on catalog (Stremio's Board) | **No** | One Top picks row merges provider and add-ons with the [tv] mark; add-on catalogs live in Movies / Series (addons SPEC) |
| Hub list the admin orders and hides (Plex), row editing (Infuse) | Yes | Account > Home rows: every row with a toggle, hold OK moves it; Continue watching pinned first |
| Remove from Continue watching (Google TV, Disney+) | Yes | Hold OK on a card: "Remove from Home" |
| Promoted content, ads, prices (Apple: avoid) | **No, nothing promoted** | There is no business here: every row says why it exists |
| Last channels at the top (today's airglow) | **No** (owner) | Channels is the last row: favourites first, then recent |
| Sidebar navigation (Apple 17.2) | No | The top bar stays (UX brief decision; Netflix moved to the top too) |

## 4. Numbers used in the spec

- Android TV: 4 cards across = 196 dp, 20 dp gaps, 16:9 the default card, focus scale 1.1 (airglow keeps its own 1.05
  and 24 px gaps from UI-SPEC 3, which were tuned for the ring).
- Apple: scrolling banners 3 to 8 items (airglow: one billboard, no rotation); Top Shelf "feature new content", "avoid
  promoting content people have already watched" (the discovery pick is always unseen).
- Netflix: task rows (Continue, My List) are required; the rest chosen for diversity (airglow: no two rows share a
  seed; a title appears in one discovery row at most, UI-SPEC-style "the hero's own title is not repeated").
- Attention: on the web most viewing time goes to the first screenful (Nielsen Norman Group, S, web not TV); on a TV
  with a remote the cost of a row is a Down press, so the order is the whole design.

## 5. Sources

(P) Apple HIG: Top Shelf, Focus and selection, Playing video, Designing for tvOS (developer.apple.com/design/human-interface-guidelines/…).
(P) Android TV design: Immersive list, Featured carousel, Cards (developer.android.com/design/ui/tv/guides/components/…).
(S) Netflix tech blog "Learning a Personalized Homepage" (2015) and "Artwork Personalization" (2017); Engadget, What's on
Netflix, Tom's Guide, Android Authority, TechRadar on the May 2025 TV redesign; Thurrott / Hip2Save on the autoplay switch (2020).
(S) Apple newsroom "Redesigned Apple TV app elevates the viewing experience" (Dec 2023); MacRumors and 9to5Mac on tvOS 16.2's
Watch Now; AppleInsider, Macworld, Tom's Guide on 17.2; Apple support "Watch Now / Home in the Apple TV app".
(S) Google TV help "Find something to watch"; 9to5Google and How-To Geek on hiding titles and switching off previews.
(S) Disney+ press and 9to5Mac on the Oct 2025 redesign; IMDb news on Continue Watching removal.
(S) Tom's Guide on HBO Max / Max; MacRumors forum on the trailer audio.
(S) Plex support "Manage Recommendations" and forum threads; Firecore community on Infuse's Up Next and home rows; Stremio
docs mirror (Mintlify) and community posts on the Board.
