# Home final: what changed

`SPEC.md` describes the current design only. This is the history, newest first.

## v1.2 (cleanup after `REVIEW-independent-2.md`)

- **Safe area:** rows, peeks and the column start at x 60 (the lifted ring now lands at x 51.9 for a poster, 50.1 for a wide card, 49.6 for a game card); the library grid starts at x 58 with 20 px gutters (ring at x 49.9 on the left, 910 on the right). Measured on the mocks, not claimed.
- **`05`:** the focused title and its year line sit in a solid band at the top (the context line and the scroll bubble too); nothing is laid over the next row's poster.
- **One rule for Up from row 1:** the Marquee. The right-hand index's next name is always the row that peeks (`02` peeks `Tonight in the NBA`, `03` `Popular series`, `10` `Popular films`).
- **Peeks and pitch:** the next row sits one card height + 14 px under the focused row (no empty band under wide-card or game-card rows); peeking cards past x 912 and peeking game cards show no text; `07` ends with `End of Home · P+ Back to the top`.
- **Copy:** `Cinemeta` and `TMDB` are gone from every subtitle, eyebrow and context line (the sources are credited in Account > About); `Á íslensku` prints no total (TMDB has 1,451 Icelandic films and 107 series; the row holds the ones over its 10-vote floor); Top rated is TMDB only; `New this week` became `New episodes`; one 600 ms picture rest everywhere.
- **Mocks:** `02` is Palm Springs (a scene backdrop, not the poster's art); `07` has real channel cards (logo tile, programme, progress); `08` has its upright poster placed between the column and the index, the no-poster tile among the visible six and a sheen for loading; `09` has Severance, and unseen episodes show the show's backdrop; the 30 px game line fits the lineup (`Grizzlies at Blazers`).
- **Timeline:** the slate is Celtics at Knicks and Mavs at Rockets 23:00, Nuggets at Thunder 01:30, Grizzlies at Trail Blazers 02:00, two more at 03:30 and 04:00 (so `04` at 03:12 reads 2 live, 2 final, 2 later); Heartstone ends 22:51; Kastljós has 13 min left at 20:42.
- **SPEC:** the v1.1 change tables are folded into the body (decisions 6, 7, 9 and 12, the lineup and the strings, selection step 1, section 6a, the press counts, acceptance).

## v1.1 (answering `REVIEW-independent-1.md` and the outside UX opinion)

- The rows read TMDB with the owner's own key for Top rated, genre rows and blends, anime (keyword 210024 in Japanese), Á íslensku and Because you watched; Cinemeta stays for ids, metas, Popular, New and search.
- The lineup went from six lines to three big ones (four on a game day), the lit line opens as its card in place, the first row peeks on the first screen, P− jumps to the rows: browsing went from 7 presses to 3 (4 on a game day, 1 with P−).
- The rows lost the eyebrow and the Tonight strip; the index got its own backing; the backdrop stops above the posters; the picture swaps after a 600 ms rest with a normalised brightness cap; logos are cropped to their ink.
- The play log, the taste profile (a title's weight split across its genres, anime its own genre), the page rules and the daily fetch budget were specified.
- Wide cards (`09`), game cards (`10`), channel cards (`07`) and the title without a backdrop (`08`) were mocked.

## v1.0

The first reviewed cut: a Marquee of six lines over a full-screen picture, rows below, the add-on library, game night.
