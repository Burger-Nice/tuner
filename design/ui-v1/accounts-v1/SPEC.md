# airglow accounts and sync, v1.2: sign in on any screen, everything follows, the server can't read it

The owner asked for "the login thing so I can log in on different devices", then chose a real account system over a
GitHub-only one "if my friends want to use it", and today asked the question this whole design has to answer: *"I still
have to log into the provider and Stremio? what's the point?"* No. **Signing in to airglow on a new screen brings your
provider login, your Stremio add-ons and link, your TMDB key, Saved and history with it, by themselves. You sign in to
nothing else.** That is the point, it is the first decision below, and every sign-in screen says it in its own words.

This is **airglow accounts**: a few people now (him and friends), each with their own provider, add-ons and history,
built so it could grow into a product later without a rewrite. Three apps share it (`app/tv/js`'s data modules are
already common to the TV, the iPhone and the Windows app), and one small server holds the locked copies: a Cloudflare
Worker with D1, deployed by CI, on the free plan.

Mocks (`png/`, contact sheet `png/contact-sheet.png`; built by `tools/build.js`, rendered by `tools/render.js`): the TV
sign-in with the code and the QR (`01`), the TV's merge-or-replace question (`02`), Account › airglow account on the TV
(`03`), the iPhone approving a TV (`04`, and `04b` from another network), the iPhone sign-in (`05`) and the recovery key at sign-up (`06`), the page the
QR opens on a phone (`07`), and the Windows Account page with the devices (`08`).

## As built (v1.2 with `REVIEW-independent-3.md` folded in)

Where the build departs from the text below, and why:
- **Refresh tokens (M1):** access tokens carry the refresh generation (`gen`); "used" = the first authenticated call
  with the current generation, or a refresh that presents the current token. Refresh tokens are `<deviceId>.<secret>`;
  a token older than the previous one also revokes. Clients store the new refresh token (the write finished) before
  the new access token is used. Tests: thief refreshes first → revoked; crash before use → re-issued.
- **No ratchets (M2):** `shield/nbaSeen` is `{ since, upTo, ids }` (`setShield` and `revealAll` set `since`; the higher
  `since` wins outright); every sync answer carries the server's `now`; `upTo`, `since` and `forget.upTo` are clamped
  to it + 5 min.
- **S1:** a play made from Continue watching has the id `m:<imdb>:<s>:<e>`, a play from before accounts an id from its
  content; union dedupes them. **S3:** held deletes keep the last plaintext locally (Undo them is local); a by-ids read
  `POST /v1/sync/get` exists too. **S4:** `wipe` is a list of collections; deletes in other collections stay guarded.
  **S5:** the invite field is sent as typed; owner-code tries are capped at 20 an hour across all addresses.
  **S8:** a `plays` wipe drops the server's previous copies of those parts. **The cap:** previous versions count
  (`prev_bytes`) and the oldest go first. **04b:** `airglow can't tell this iPhone is on the TV's network, so the
  letters make sure it's your TV.` Scopes are deny-by-default in the router.
- **Recovery** needs the recovery wrap before the new password's wraps can be made, so it is two calls:
  `POST /v1/recover/start { email, recoveryAuthKey } → { recoveryWrappedKey, kdf }`, then `POST /v1/recover`.
- **Record ids** are all HMACs of a natural key (`prov|<pid>`, `fav|<pid>|<key>`, `plays|<month>:<part>`, …); the
  plaintext is `{ n, at, v }`. The IMDb notes travel in 16 parts.
- **The host** is `https://acct.airglow-tv.workers.dev` (`airglow` was taken; CI registered `airglow-tv` once).
- **iPhone:** the Keychain is the app's own small plugin (`AirglowSecret`, in `SceneDelegate.swift`); the Wi-Fi check is
  `@capacitor/network`. A PC counts as on a fixed line for the same-network tick.

## v1.2 changes (an answer to `REVIEW-independent-2.md`; the build starts from this)

Spec text only, plus one new mock (`04b`) and four words on screens. The six must-fixes:

1. **Undo is the client's (§4.4, §6.1).** The server can't re-encrypt, and the AAD binds `ver`, so `GET /v1/undo?since=`
   now returns the previous blobs *with their old `ver`*; the client opens each with that `ver`, re-encrypts it under a
   fresh `ver` and pushes it as an ordinary compare-and-set write. `POST /v1/undo` is gone. Snapshot `Restore` was
   already client-side and stays so.
2. **The mass-delete guard has a door (§4.4):** `wipe: true` is sent by the confirmed actions that really do delete most
   of a collection: `Remove provider`, `Forget my taste`, `Reset rows`, `Clear Continue watching`, `Delete account`.
   Each already has its own confirm. A client that gets `too_many_deletes` without `wipe` keeps the records locally,
   marks them held, shows `Some changes weren't synced · <n> deletions wait for a confirm` on the Sync row with
   `Sync them` / `Undo them`, and stops retrying those records. For logs, deletes win over union: `Forget my taste`
   writes `rows/forget = { upTo }` and every merge of plays drops plays with `at ≤ upTo` and tombstones the parts; a
   part's tombstone beats any lower `ver` of it.
3. **A full inventory of today's local keys (§4.2a), and a person-wide prefix when signed in.** Per-person stores
   (add-ons, the Stremio state, picks, hidden rows, rows off, finishes, not interested, IMDb notes, skip shows, the plays
   log, the Home page cache) move under `u:<accountId>:*` when signed in; `scoped()` routes by a table of which keys are
   which. Per-provider stores (Saved, order, progress, recents, last channel, live group, delays, team channel, the
   probe budget, `m3u:`, `info:`, `probes:`) keep the device's random `acc.id`, and the sync adapter maps `acc.id ↔ pid`
   at the boundary through the account's provider record, so nothing on the device is renamed and nothing is missed.
   The merge step folds each provider's per-person copies into the `u:` set (union for add-ons, newest for picks).
4. **A refresh grace that can be built (§5.8):** the successor token is deterministic,
   `next = HMAC(refreshKey, deviceId || prev)`, so a retry with the previous token recomputes the same successor and
   re-signs the same access token; a reuse of the previous token counts as theft only once the successor has itself
   been used (`refresh_used_at`); and a client wipes only on an explicit `{ error: "revoked" }`, never on a 401, a 5xx,
   the 503 for missing secrets or a network error.
5. **Recovery no longer depends on the password's salt (§5.3):** `rwk` and `rak` are HKDF'd from `rk` with the constant
   salt `"airglow/v1/recovery"` (fine for 100 random bits), so a password change or a KDF upgrade that replaces the KDF
   salt can't break recovery; the known-answer tests add "change the password, then recover". A KDF ceiling (5 million
   PBKDF2 iterations) joins the floor.
6. **The CI secrets step fails closed (§7.2):** `shell: bash` with `set -euo pipefail`, the `secret list` output
   validated as a JSON array before anything is read from it, `PEPPER` and `TOKEN_SECRET` never written while
   `/v1/health` answers `ready: true`, an empty owner value skipped, and the job runs on `push` and `workflow_dispatch`
   only.

The top should-fixes, taken: the owner's first account is claimed with an **owner code**, not his email (§7.3): a phrase
he picks, kept as the `AIRGLOW_OWNER_CODE` repository secret and put into the Worker once as `OWNER_CODE`; he types it in
the invite field of the first sign-up, after which it is spent; `/v1/health` answers only `{ ok, version, ready }` and
says nothing about an owner. `04b` mocks the other-network approval (the three-letter step). The same-network tick shows
only when the phone is on Wi-Fi (never on mobile data: CGNAT) and reads `On the same network as this iPhone`; the `/tv`
page asks for the letters too unless the code was typed; a home network that speaks IPv4 to the TV and IPv6 to the
phone will show the step, which is friction only, and is measured on his network (open item). Only devices that signed
in with the password or the recovery key may approve a TV, and Devices shows the approver (`signed in Tue 28 Oct with
Birgir's iPhone`). The `/tv` page's one-shot token is scoped to lookup and approve for 5 minutes. A provider's `pid` is
assigned once, when the provider is first added, and stored in its record; a server-URL edit keeps it, and duplicates
are matched at merge by a canonical natural key. `records_prev` counts toward the 8 MB cap and keeps one previous
version per record per UTC day; `rowStats` stays on the device. Plays dedupe by `playId` across parts; `delays` and
`teamCh` don't travel at all. Account names a pasted M3U's exception by provider (`backup.m3u stays on the iPhone it
was pasted on`). The display name comes from an optional `Name` at sign-up (defaulting to the part before `@`), kept in
the `settings` record. `GET /v1/devices` says `active`, not `now`. Invite codes are 8 letters (two blocks of four, about
35 bits). Safari's `Open in "airglow"?` confirmation is counted (five taps). `07` says `Your password stays in this
browser`. `logout-all` from a TV asks only the remote's OK, which is accepted and stated. After a pepper loss, signed-in
devices keep working; nobody can sign in *again*.

## v1.1 changes (an answer to `REVIEW-independent-1.md`)

The screens barely change; the words and the crypto do. The twelve must-fixes, in the review's order:

1. **The QR path on an AltStore iPhone (§2.3, `07`).** No Universal Links, so the QR keeps its https link and the
   `/tv` page it opens *leads* with a full-width `Open in airglow` (an `airglow://tv?code=…&k=…` link the phone app
   registers); the browser form sits under `or sign in here`. The honest count is four steps (OK on the TV, scan, `Open
   in airglow`, `Sign in the TV`), about 45 to 60 s with the phone already signed in. Encoding `airglow://` straight into
   the QR is open item 1, to test on his iPhone; if the camera offers it, the count drops to three.
2. **The approval sheet no longer says "It's the TV you scanned" (§3.2, §5.5, `04`).** The key hash proves the link and
   the server agree on the TV's key; it proves nothing about who stands at a TV. The sheet now asks `Is this the code
   on your TV?` and says `If someone sent you this link, tap Not now.` The same-network tick appears only when the
   phone's and the TV's addresses match (IPv4 exactly, IPv6 by /64); when they don't, the app hides the last three
   letters and asks for them from the TV screen before `Sign in the TV` lights.
3. **Record ids come from the data key (§5.6):** `idKey = HKDF(dk, "airglow/v1/ids")`, so the TV (which never has `mk`)
   makes the same ids and a password change changes none of them. Records are encrypted under `encKey = HKDF(dk,
   "airglow/v1/records")`, never `dk` itself, and a `dk_check` value lets a device prove it holds the right key.
4. **The handover's AAD is what both ends know (§5.5):** `"airglow/v1/handover|" + user_code + "|" + base64url(SHA-256(tvPub))`,
   and the key hash in the QR is the full 256 bits as 43 base64url characters (at least 128 were asked; the QR has room).
5. **A KDF floor in every client, in v1 (§2.4, §5.2):** `prelogin` answers below 600,000 PBKDF2 iterations (or below the
   Argon2id minimums, later) are refused with `This server asked for a weak key. Not signing in.`
6. **The recovery key is kept wrapped under the password key (§5.3, §2.9).** `Show it` therefore works only with the
   password, and never from a device that holds just `dk` (a TV). It is not stored under `dk`, ever. Both `Show it` and
   `Make a new one` stay. Why wrap rather than drop: 1Password shows the Secret Key in-app behind the password for the
   same reason, people lose paper, and a key you can't look at again is one you stop trusting.
7. **No plaintext `now_playing` on the server (§6.2, `08`).** Dropped; the Devices list shows name, kind, how and when it
   signed in, active or last seen. What the server can see is stated exactly in §8.
8. **A 60-second grace window for the previous refresh token (§5.8):** a retry with the token just rotated returns the
   same new pair; reuse after the window revokes the device. `revoked_at` is checked on every authenticated request.
9. **Provider scoping (§4.2, §9):** a provider record gets an account-assigned id (`pid`, the HMAC of `type|server|
   username` under `idKey`); `session.js` uses it as the local `acc.id` when signed in, so `state.js`'s `scoped()` and
   `rows.js`'s keys line up across devices; Saved, order and progress are keyed `<pid>/<item>`; plays and taste are per
   person (one log per account, each play carrying its `pid`); the merge step renames a device's `a:<random>:*` stores
   to the matched `pid`.
10. **Server-side undo (§4.4, §6.2):** every overwritten or deleted record's previous blob is kept 30 days
    (`records_prev`), `Account › Sync › Undo changes since…` restores; and one push that would delete more than half of
    a collection (five or more records) is refused unless flagged, which no client path does.
11. **The owner's first account (§7):** his email is a repository secret (`AIRGLOW_OWNER_EMAIL`), never in
    `wrangler.toml`; while no owner account exists, sign-up with that one email needs no invite and becomes the owner.
    §7 lists the exact steps he does, once.
12. **CI makes the Worker's secrets (§7):** on each deploy it lists the Worker's secrets and creates `PEPPER` and
    `TOKEN_SECRET` only if absent, piping `openssl rand` straight into `wrangler secret put`, never echoed, never
    re-sent. The Worker answers 503 on `/v1/*` until both exist. **Deleting or renaming the `acct` Worker loses the
    pepper and locks every account out of sign-in and recovery** (the data stays safe; nobody can log in); this goes in
    `NEXT.md` as well.

Should-fixes taken: the stolen-database sentence corrected (§5.4, §8: `wrapped_key` is an offline guessing oracle at the
KDF's cost, as in Bitwarden; the pepper protects the auth path only); SRI dropped from §8; HKDF subkeys per purpose
from the pepper and from `dk`; clients refuse a lower `ver` than they hold; a `reset` answer for cursors older than the
tombstone horizon; overflow parts for play months and snapshots, a random `pid` per play; the free-plan arithmetic (8
MB per account, 256 KB / 100 records per request, `GET /v1/sync/seq` for idle polls, `progress` pruned at a year);
hourly limits as D1 counters, `[[ratelimits]]` for the per-minute one; CORS `*` without credentials (Electron sends
`Origin: null`); `/tv/*` routed through the Worker; dirty records pushed before a voluntary sign-out; lenient Crockford
decoding of the recovery key; the `/tv` page's login one-shot (no refresh token, no device row); `<host>/signup` named on
the TV; a new recovery key offered after a recovery; the note that a password change does not rotate `dk`; failure
limits keyed on account + IP. Nits: `02`'s foot and `Use only what's in my account`; Back on `02` shows a hint; fewer
"things"; passwords are not trimmed; invite codes are 16 base-20 letters (about 17 bits a block; the mock no longer
shows digits); the wrong-lookup rule has a subject; `prelogin`'s fake answer follows the current default KDF.

---

## 0. Decisions (each with its reason, in plain words)

1. **Signing in brings everything; there is no other sign-in.** The provider login(s), the Stremio add-ons and the
   Stremio link, the TMDB key, Saved, history and the settings that are about you travel in the account, encrypted.
   A new screen asks for one thing (your phone, or your email and password) and then has your channels, your add-ons
   and your Continue watching. Every sign-in screen says so in its first line (`01`'s card, `04`'s chips and the line
   under them, `05`'s card). Without an account, airglow works as it does today.
2. **The TV signs in from your phone, with a code and a QR (RFC 8628's device flow).** The TV shows six letters and a
   QR; the phone app (or the page the QR opens) approves it. Netflix (`netflix.com/tv8`, 8 digits and a QR), Plex
   (`plex.tv/link`, 4 characters), YouTube (`yt.be/activate`), Disney+ (`disneyplus.com/begin`) and Spotify
   (`spotify.com/pair`) all do this, because typing an email and a password with a remote is the worst part of any TV
   app. Typing stays as the fallback (the TV keyboard exists already). On an AltStore iPhone the QR opens the Worker's
   page first, which leads with `Open in airglow` (v1.1 change 1).
3. **The code is six letters from RFC 8628's base-20 alphabet** (`BCDFGHJKLMNPQRSTVWXZ`: no vowels, so no accidental
   words; no `0/O`, `1/I`), shown as `WDJ-BMH`, valid 10 minutes, with the counters of §6.3 behind it. 20^6 = 64
   million codes against a 10-minute window and a per-account, per-address limit is far beyond what a guesser can
   reach; Plex gets away with 4. The QR carries the same link plus the hash of the TV's handover key, so the link and
   the server have to agree on which key the phone wraps for; that hash does not prove anyone stands at a TV, which is
   why the approval sheet asks the person (decision 2 of v1.1).
4. **End-to-end encryption, the password-manager way (Bitwarden / 1Password / Standard Notes), with WebCrypto only.**
   The password never leaves the device: PBKDF2-HMAC-SHA-256 (600,000 iterations, OWASP's floor, Bitwarden's default)
   makes a master key; HKDF splits it into a *wrapping key* (stays on the device) and an *auth key* (what the server
   sees). A random *data key* is the root of everything that syncs; the server stores it only wrapped. Argon2id would
   be a stronger KDF but WebCrypto has none; PBKDF2 runs natively on the TV's WebView, in Electron and in WKWebView,
   with no WASM to ship, and the account carries its KDF parameters so it can move to Argon2id later (Bitwarden's
   path). Clients refuse parameters below the floor.
5. **A recovery key, shown once at sign-up, is the only way back without the password.** The server can't reset what
   it can't read, so a reset by email would be a lie (Proton explains this best: a reset without a backup of the key
   loses the data). 1Password's Emergency Kit and Proton's recovery phrase are the same idea. The key is 20 characters
   (100 bits), unwraps a second copy of the data key, is itself kept wrapped under the password key so it can be shown
   again with the password, and can be replaced from Account. Losing both password and key means a fresh account; that
   sentence is on the screen, not in a help page.
6. **A password change re-wraps the data key; the data stays as it is and other devices keep working.** Only the
   wrapping changes (Standard Notes and Bitwarden do the same), so there is no bulk re-encryption and the TV, which
   never knew the password, needs nothing. Signing other devices out is a choice on that screen, off by default: the
   owner changes a password on his laptop and doesn't want the TV to ask for his phone again. The data key itself is
   not rotated by a password change (a past compromise of `dk` survives it); `keyVersion` is the later path.
7. **Each syncable thing is a record the client encrypts; the server stores blobs and a sequence number.** The server
   can't merge what it can't read, so merging is the client's job and the rules are per collection (§4.4): last write
   wins per item for settings and saved items, union for logs (plays, the shield's seen list) and lists keyed by id.
   This is the Standard Notes shape (items keys, `items_key_id`, sync by cursor) with the merge rules airglow's data
   already implies (`plays` is append-only; `nbaSeen` is `{ upTo, ids }`). The server keeps 30 days of previous
   versions; the client opens them and pushes them back, so a bad push is undoable.
8. **Local first.** Every app keeps working exactly as today with the account offline: the local store stays the
   source of truth; sync is a push of changed records and a pull by cursor, on launch, every 15 minutes (a one-read
   `seq` check), on a change (debounced 5 s), and when the app comes back. A device that was used without an account
   and then signs in is asked once: merge or replace (§2.6), with a snapshot kept 30 days.
9. **The provider logins sync (encrypted), the TMDB key syncs, add-ons sync, the Stremio link syncs** (decision 1).
   Per-device things do not sync: the TV's picture, sound, zap direction and player settings, the PC's window, tray and
   mpv settings, the phone's data saver. §4.2 lists both sides. Saved, order and progress stay scoped to the provider
   they belong to (as `state.js` stores them today), under an id every device agrees on.
10. **Invite-only, no payments, soft limits.** The owner makes invite codes (Account › Friends); open sign-up is a
    Worker flag left off; the owner's own first account is claimed with an owner code he picks (§7.3). Each account is separate:
    nothing is shared between friends. Limits (§4.6) keep the free plan free.
11. **No email is sent in v1.** With no reset-by-email (decision 5) and invite-only sign-up, there is nothing an email
    must carry; the email is a sign-in name. Cloudflare's Email Sending is paid-plan only and Resend's free tier is
    100 a day; both are a §11 hook for later (new-device notices), not a dependency now.
12. **A phone without the airglow app can still sign a TV in**, through the form under `Open in airglow` on `/tv` (`07`):
    the page does the same unwrapping in the browser. This is the Bitwarden web-vault compromise: the page's
    JavaScript comes from the server you are trusting with ciphertext, so a malicious server could serve a bad page.
    The owner deploys that server from this repo through CI; the risk is stated in §8, and the app is the path the
    page leads with.
13. **The server stores an HMAC of the auth key, not a slow hash.** Workers Free gives 10 ms of CPU per request;
    a server-side PBKDF2 would not fit. The auth key is already a 256-bit output of 600,000 client-side iterations, so
    guessing it offline is as hard as guessing the password through the client KDF; HMAC-SHA-256 with a server-side
    pepper and a per-account salt protects the auth path if D1 leaks alone. The wrapped data key in D1 is still an
    offline guessing oracle at the KDF's cost, exactly as in Bitwarden; the password's length (12 or more) and the KDF
    are the defence there. Bitwarden's own server-side iterations were shown to add little for the same reason.
14. **Sessions: a short access token (1 h, HMAC-signed) and a rotating refresh token (90 days, stored hashed, with a
    deterministic successor so a lost response or a crash never signs a device out).** "Sign out everywhere" revokes every refresh token; the device wipes the
    account's data the next time it is online and is told. A device that stays offline keeps what it has (there is no
    way to reach it), and the Devices list says so.
15. **Everything that already exists keeps working without an account.** The TV's and the phone's provider sign-in
    stay the second door on the first screen (`Use airglow without an account`). An account can be added later from
    Account; the merge question (§2.6) handles the history that is already there.

---

## 1. Research (what was read, what it establishes, which decision it backs)

TV sign-in patterns
- RFC 8628, OAuth 2.0 Device Authorization Grant (summaries by [Janssen](https://docs.jans.io/stable/janssen-server/auth-server/oauth-features/device-grant),
  [Kinde](https://docs.kinde.com/authenticate/device-authorization-flow/overview/), [Deadbolt](https://deadbolt.readthedocs.io/en/latest/plugins/device-authorization/)):
  `device_code` / `user_code` / `verification_uri(_complete)` / `expires_in` / `interval` (5 s default), the errors
  `authorization_pending`, `slow_down`, `access_denied`, `expired_token`; §6.1's base-20 user-code alphabet; §5's
  warnings on brute force and remote phishing (the approver must be told what it is approving, and a link alone proves
  nothing). → Decisions 2, 3; §2.3, §3.2, §6.
- Netflix, [How to sign in to Netflix](https://help.netflix.com/en/node/311830241325668): an 8-digit code at `netflix.com/tv8`,
  a QR on TVs that show one, the TV signs in by itself. → the TV screen's shape (`01`).
- Plex, [Connect app to your Plex account](https://support.plex.tv/articles/203395277-connect-app-to-your-plex-account/):
  a 4-character code at `plex.tv/link`, a QR on some platforms, the app refreshes itself a few seconds later. → the
  waiting card that moves on by itself.
- Spotify, [Spotify on TV](https://support.spotify.com/ng/article/spotify-on-tv/): "Log in with PIN" at `spotify.com/pair`.
  YouTube `yt.be/activate` and Disney+ `disneyplus.com/begin` (third-party guides only; the pattern is the same:
  code on the TV, sign in on the phone, enter the code). → Decision 2.

End-to-end encrypted sync with recovery
- Bitwarden, [Encryption key derivation](https://bitwarden.com/help/kdf-algorithms/) and the
  [security white paper](https://bitwarden.com/help/bitwarden-security-white-paper/): PBKDF2-SHA256 600,000 iterations
  (the floor since 2026.2.1), HKDF stretching of the master key, a protected symmetric key wrapped with it, Argon2id
  as the alternative, the KDF change re-wrapping the key. → Decisions 4, 6; §5.
- Bitwarden server-side iterations ([Palant, 2023](https://palant.info/2023/01/23/bitwarden-design-flaw-server-side-iterations/)):
  server-side PBKDF2 of the auth hash adds little; the client-side KDF is the defence, and a server that lowers the
  client's iteration count is the attack a client-side floor stops. → Decision 13; v1.1 change 5.
- Bitwarden, [Forgot master password](https://bitwarden.com/help/forgot-master-password) and
  [Emergency access](https://bitwarden.com/help/emergency-access/): zero knowledge means no reset; the ways out are a
  trusted contact's takeover or an emergency sheet. → Decision 5 (airglow picks a recovery key over a trusted contact:
  simpler for a few friends, and 1Password's and Proton's answer).
- 1Password, [About PBKDF2](https://support.1password.com/pbkdf2/) and the
  [security design changelog](https://agilebits.github.io/security-design/changelog.html): 650,000 iterations since
  2023, HKDF-derived salts, the Secret Key as a second high-entropy secret (2SKD) that the app can show again behind the
  password. → §5.2's HKDF salting; the recovery key as a high-entropy secret that needs no slow KDF and is shown again
  only with the password.
- Standard Notes, [protocol 004](https://raw.githubusercontent.com/standardnotes/app/main/packages/snjs/specification.md):
  Argon2id 64 MiB / 5 / 1 → 512 bits split into a master key and a server password; items keys as items encrypted
  with the master key; a password change re-encrypts only the items keys. → Decisions 6, 7; §4.3.
- Proton, [Data recovery and end-to-end encryption](https://proton.me/blog/data-recovery-end-to-end-encryption): a
  reset without a backup of the key loses the data; the recovery phrase is a second password that unlocks a copy of the
  key. → Decision 5 and the words on screen (`06`).
- OWASP, [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html):
  Argon2id 19 MiB / 2 / 1 preferred; PBKDF2-HMAC-SHA-256 at 600,000 when FIPS or availability demand it. → Decision 4.
- WebCrypto has no Argon2 ([WICG proposal](https://github.com/WICG/proposals/issues/59); WASM options
  [hash-wasm](https://mojoauth.com/security-guides/argon2-in-javascript-in-browser.md), [openpgpjs/argon2id](https://www.github.com/openpgpjs/argon2id)).
  → Decision 4's PBKDF2 now, parameters stored per account for Argon2id later.
- Refresh-token rotation with a reuse window: Auth0's "reuse interval" and Okta's grace period are the industry shape
  (a lost response must not revoke a device). → Decision 14; §5.8.
- Android: Jetpack Security's `EncryptedSharedPreferences` is deprecated
  ([Include Security](https://blog.includesecurity.com/2026/08/encryptedsharedpreferences-is-dead-heres-what-you-should-use-instead/),
  [ProAndroidDev](https://proandroiddev.com/goodbye-encryptedsharedpreferences-a-2026-migration-guide-4b819b4a537a)); a
  Keystore-held AES key wrapping the app's secret is the recommended shape. → §5.7.

Cloudflare Workers + D1
- Workers limits ([limits](https://developers.cloudflare.com/workers/platform/limits/), [pricing](https://developers.cloudflare.com/workers/platform/pricing/)):
  Free = 100,000 requests a day (1,000 a minute burst), 10 ms CPU per request, 5 cron triggers, static assets free and
  unmetered. → Decisions 10, 13; §4.6, §7.
- D1 ([limits](https://developers.cloudflare.com/d1/platform/limits), [pricing](https://developers.cloudflare.com/d1/platform/pricing/),
  [free-tier enforcement from 1 Sep 2026](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)):
  Free = 5 million rows read and 100,000 rows written a day (index updates count), 5 GB in all, 10 databases of
  500 MB; over the limit, queries fail until 00:00 UTC. → §4.6.
- Workers Web Crypto ([docs](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)): PBKDF2, HKDF,
  AES-GCM, ECDH P-256 supported; `crypto.subtle.timingSafeEqual` for comparing hashes. → §6.
- [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/): `limit({ key })`
  with a 10 or 60 s period only, free, "permissive, eventually consistent". → §6.3: the per-minute shield; the hourly
  rules are D1 counters.
- [Static Assets](https://developers.cloudflare.com/workers/static-assets/): the pages are files beside the Worker;
  `run_worker_first` for `/v1/*` and `/tv/*` (a code in the path is not a file).
- [cloudflare/wrangler-action](https://github.com/cloudflare/wrangler-action) (v4; `apiToken`, `accountId`, `command`,
  `workingDirectory`): `d1 migrations apply` then `deploy`; secrets are made with `wrangler secret put` from a pipe. → §7.
- Email, for later: [Cloudflare Email Sending](https://developers.cloudflare.com/changelog/post/2026-04-16-email-sending-public-beta/)
  (public beta, paid plan), [Resend free tier](https://resend.com/blog/new-free-tier) (3,000 a month, 100 a day). → Decision 11.
- [Turnstile](https://developers.cloudflare.com/turnstile/plans/): free up to 20 widgets. Not used in v1 (invite-only
  sign-up needs no bot wall); the `/signup` page gets it when open sign-up is switched on.

Where this departs from the models and why: Bitwarden and 1Password authenticate with SRP or a server-side slow hash;
airglow sends an HKDF-derived auth key over TLS and stores its HMAC (decision 13), because the Worker has 10 ms and the
auth key is not a password. Standard Notes has no recovery key; airglow adds one (decision 5). The device flow's
approver also carries a key (§5.5), which RFC 8628 never needed because OAuth servers hold the secrets; airglow's
can't, so the approver wraps the data key for the TV itself.

---

## 2. The flows

### 2.1 First run (every app)

The first screen has two doors and keeps the old one:

- TV (`screens/first.js` Welcome, revised): the lockup, `Sign in on your phone` (primary, entry focus) with the line
  `Your provider, add-ons and history come with it`, `Use airglow without an account` (secondary: today's `Type it
  here` / `Load an M3U link` path, unchanged), and the saved accounts row as now.
- iPhone (`05`) and Windows: the lockup and one line; the `Sign in` card (`Your provider login, Stremio add-ons, TMDB
  key, Saved and history come to this iPhone by themselves. No other sign-in.`, email, password with Show, `Sign in`,
  `Forgot it? Use your recovery key`); then `Create an account with an invite` and `Use airglow without an account`.
- After a sign-in, the three quick choices (team, shield, languages) are skipped when the account already has them;
  Home opens as soon as the provider's channels are in, as today, with no provider screen in between.

### 2.2 Sign-up (iPhone, Windows, or the Worker's `/signup` page; never the TV)

1. **Account:** the invite code (from the link, or typed; the owner types his owner code here the first time, §7.3),
   email, an optional `Name` (the part before `@` when empty; what `Signed in as Birgir` and the avatar's letter show),
   password (12 characters or more; a strength line, no rules beyond length;
   NFKC-normalised, never trimmed), `Continue`. The device makes the master key, the wrapping key and the auth key
   (§5.2), a random data key and a random recovery key, wraps the data key twice and the recovery key once (§5.3), and
   calls `POST /v1/signup`.
2. **Recovery key (`06`):** the 20 characters in five groups, `Copy`, `Save to Files` (iOS share sheet; `Save as…` on
   Windows: a text file "airglow recovery key.txt" with the email and the date), the tick `I've put it somewhere safe`
   (Continue is dim until it is ticked), the line where to see it again. Typing it back later is lenient: Crockford's
   `I`/`L` read as `1`, `O` as `0`, lower case and missing dashes are fine.
3. **Provider:** today's provider card (Xtream or M3U), or `Skip for now` (an account with no provider still syncs
   add-ons, Saved and settings; Home says what's missing).

### 2.3 Signing a TV in (`01` → `07` → `04` → `02` if needed → Home)

1. The TV calls `POST /v1/device/code` with its name ("Philips TV"; the Android model when it has no better name),
   its kind and a fresh ECDH P-256 public key (§5.5). It gets `user_code` (6 letters), `device_code` (random, 32 bytes,
   never shown), `expires_in` 600, `interval` 5, and draws `01`: the three steps, the letters, the QR with
   `https://<host>/tv/WDJBMH#k=<base64url(SHA-256(tvPub))>`, the waiting card (`Your provider login, Stremio add-ons,
   TMDB key, Saved and history come to this TV by themselves, locked for it. Nothing else to sign in to.`),
   `Type email and password` as the secondary button.
2. The TV polls `POST /v1/device/token` every 5 s (`slow_down` adds 5 s). `authorization_pending` keeps the card;
   `expired_token` redraws with a new code and the line `The code ran out · here is a new one`; `access_denied` ("Not
   now" on the phone) goes back to the choices.
3. On the phone, the camera opens the https link in Safari: the `/tv` page (`07`), which names the TV and the code and
   leads with `Open in airglow` (`airglow://tv?code=WDJBMH&k=…`; the scheme is registered by the phone app, which works
   for a sideloaded build, unlike Universal Links; Safari asks `Open in "airglow"?` first). The app shows the sheet `04`: the TV's name, the code, `asked 20 s
   ago`, the question `Is this the code on your TV? Only sign in a TV you're looking at. If someone sent you this link,
   tap Not now.`, the same-network tick when it applies (§3.2), what the TV gets and that it signs in to nothing else,
   `Sign in the TV`, `Not now`. The app checks that `SHA-256(tvPub)` from the server equals `k` from the link, wraps the
   data key for `tvPub` (§5.5) and calls `POST /v1/device/approve`. A phone without the app uses the form under `or
   sign in here` on the same page; it asks for the last three letters as well (a browser's address rarely matches:
   Private Relay, mobile data), and its login is one-shot: a 5-minute token good for the lookup and the approval only,
   no refresh token, no device row.
4. The TV's next poll returns the tokens and the box; the TV opens it, checks `dk_check`, keeps the data key (§5.7),
   pulls the account's records, and shows `Signed in as Birgir` with the verifying rows (`02`'s background: Account,
   `Your account, unlocked on this TV · 2 providers · Stremio · TMDB · 7 add-ons · 31 saved · 1,860 plays`). If this TV
   already has things from life without an account, the merge question (§2.6) comes first. Home opens when the
   provider's channels are in.

Steps for the person: OK on the TV, scan, `Open in airglow`, Safari's `Open in "airglow"?`, `Sign in the TV`. Five
taps, four of them on the phone; about 45 to 60 s when the phone is already signed in (measured against Netflix's five: open the site, sign in, type eight
digits, confirm, wait). If the iPhone camera opens `airglow://` links from a QR directly (open item 1), the page is
skipped and it is three or four.

### 2.4 Signing in on the iPhone or Windows (`05`)

`POST /v1/prelogin { email }` returns the KDF parameters (for an unknown email, the current default parameters and a
fake salt `HKDF(PEPPER, "fake-salt") ⊕ email`-derived, so the answer doesn't say whether the account exists, and keeps
saying the same thing after a KDF upgrade). **The client refuses parameters below the floor** (600,000 PBKDF2, or the
Argon2id minimums later) **or above the ceiling** (5,000,000: a hostile answer must not hang the TV) with `This server
asked for a weak key. Not signing in.` The device derives the keys, calls
`POST /v1/login { email, authKey, device }`, unwraps the data key with its wrapping key, checks `dk_check`, keeps it
(§5.7), pulls the records, merges with what is local (§2.6 if there is anything), and opens Home with the provider
already there. A wrong password is the neutral sentence under the field (`That password doesn't open this account`);
five wrong in 10 minutes for this account *from this address* answer `slow_down` (`Wait a minute and try again`), so
someone who knows the email can't lock the owner out from elsewhere.

### 2.5 Sign-out

- `Sign out of this device` (TV `03`, phone, Windows): pushes dirty records first (or says `Changes made offline will be
  lost` if it can't), revokes this device's refresh token, wipes the account's data key and the synced records from the
  device, and leaves the device as it was before the account (the local-only provider, if any, stays; if the provider
  came from the account, the first screen comes back).
- `Sign out everywhere` (every app; a confirm with the password on the phone and Windows, the TV only confirms with OK,
  so anyone with the remote can do it: accepted, it is the same trust as the remote's Sign out today): revokes
  all refresh tokens; every device wipes on its next contact and shows the first screen with `Signed out everywhere
  from <device name>` once. Offline devices keep what they hold until they come online, which the Devices list says
  (`08`'s foot).
- `Devices` lists each device (name, kind, how it signed in: *with Birgir's iPhone* (the approver's name) or *with the
  password* or *with the recovery key*, when, last seen) with `Sign out` per device and `Rename` on this one. Nothing
  about what plays. A device that signed in with a phone (a TV) can't approve another: only devices that signed in with
  the password or the recovery key can, so a stolen TV can't enrol a second screen.

### 2.6 First sign-in on a device that already has things (`02`)

Asked once per device, only when the device has local data for a provider that is not already in the account or has
local plays / Saved / add-ons. Two choices:

- **Merge them** (recommended, focused): union by the rules of §4.4; duplicate providers (the same canonical natural
  key, §4.2) become one and the device's `acc.id` is mapped to the account's `pid` for that provider (§4.2a; nothing is
  renamed); each provider's per-person stores are folded into the person's `u:` set (add-ons unioned, the newest picks,
  the plays log unioned with their timestamps and `pid`); Saved is unioned, the account's order first.
- **Use only what's in my account**: the device's own records are dropped locally (nothing is pushed as deleted) and
  the account's pulled. The provider stays if it is the same one.

Before either, the device uploads a **snapshot**: encrypted records (`snapshot:<deviceId>:<date>:<part>`, 64 KB parts)
holding the device's local state, kept 30 days and listed under Account › Sync › Undo (`08`), restorable from any device
(`Restore` re-runs the merge with it). The foot says `Neither choice can be undone here, so your account keeps a copy of
today's state for 30 days.` Back on this screen shows the toast `Pick one to finish signing in`.

### 2.7 Password change (iPhone, Windows; the TV never knows the password)

Asks for the current password and the new one twice. The device derives the new keys, re-wraps the data key and the
recovery key with the new wrapping key, and calls `POST /v1/password` with the old auth key, the new auth key, the new
KDF parameters (a fresh KDF salt is fine: recovery no longer depends on it, §5.3) and the two new wraps. A tick `Also sign out my other devices` (off) revokes the other refresh tokens.
Nothing else is re-encrypted; `dk` is not rotated (decision 6).

### 2.8 Forgot the password: the recovery key

`Forgot it? Use your recovery key` → email, the 20 characters (lenient decoding), a new password twice. The device
HKDFs the recovery key into the recovery wrapping key and the recovery auth key (§5.3), unwraps the data key, derives
the new password keys, re-wraps `dk` and `rk`, and calls `POST /v1/recover` with the recovery auth key as the proof.
The server swaps the credentials and revokes every refresh token (a recovery is a reason to). Five wrong keys in an
hour lock recovery for that account for an hour (and the Devices list gets a line `Recovery attempted · Tue 20:12`).
Right after, the app offers `Make a new recovery key` (the old one has just been typed somewhere).

### 2.9 Recovery key, later

Account › Security › `Recovery key` (`08`): `Show it` (the password first: the device derives `wk`, unwraps
`recovery_key_wrapped_by_pw`, shows the key for 60 s with Copy / Save; a TV can't, and says so) and `Make a new one` (a
new random key, `dk` re-wrapped under it, the new key wrapped under `wk`, `POST /v1/recovery-key`; the old key stops
working the moment the server has the new wrap).

### 2.10 Invites and friends

Account › Friends › `Invite a friend` (`08`): a code `AIRGLOW-KXWR-MZPQ` (two blocks of four base-20 letters, about 17
bits each; the prefix says what it is) with `Copy`, `New code`; each code works once, for 7 days; the owner has 10 a
month (a Worker var). A friend opens the app, `Create an account with an invite`, types it (or opens
`https://<host>/signup?invite=…`). The friend's account is separate in every way; the owner's Devices and Friends
lists never show the friend's things, only that the invite was used (`used by a friend on 2 Nov`).

### 2.11 Delete account

Account › `Delete account`: the password, then the sentence `Everything on the server goes. Your devices keep what they
have, as if they had never signed in.` → `DELETE /v1/account`. D1 rows go at once (previous versions too); the audit row
stays 30 days with the email hashed.

---

## 3. Where it lives in each app, and the words

### 3.1 TV (`01`, `02`, `03`)

- **First run:** Welcome gains `Sign in on your phone` (primary) above today's path. `01` is the code screen:
  `Sign in on your phone`; the steps `Scan the code with your phone's camera, or open <host>/tv and type the letters
  below.` / `Sign in to your airglow account there. No account yet? Make one at <host>/signup with your invite.` / `Tap
  Sign in the TV. This screen moves on by itself.`; the six letters (50 x 60 boxes, Outfit 700 34, a dash between the
  triplets); the QR (200 px in the 12 px chalk box, `qr.js`); the caption `<host>/tv/WDJBMH` and `The code works for 10
  minutes`; the card `Waiting for your phone` with the decision-1 line and `Type email and password` (`btn2 sm`, the
  only focusable thing; OK opens today's field screen with Email and Password instead of the provider fields); the hint
  `Back returns to the choices`. Safe area kept: the card ends at y 484, the hint at 510, and neither may grow.
- **The merge question (`02`):** a centred `menu` (640 wide) over the verifying screen, scrim behind: title, one line,
  the two columns `On this TV` / `In your account` (provider, saved channels, plays, add-ons, with the small notes
  `the same provider`, `14 not in your account`), the two rows (`Merge them` with the RECOMMENDED tag, focused; `Use
  only what's in my account`), the foot. Back shows `Pick one to finish signing in` (the TV can't sign out of a
  half-merged state); Left/Right do nothing; Up/Down move between the two rows.
- **Account (`03`):** a new first group `airglow account`: `Birgir` / the email / `Signed in` (OK opens Devices);
  `Synced 2 min ago` / `Provider logins, Stremio add-ons, TMDB key, Saved, history, Home rows, your settings` / `Sync
  now ›`; `Devices` / this TV named / `3 ›` (a right sheet listing the devices, OK on one offers `Sign out <name>`); a pasted
  M3U with no link gets its own line under the provider's row (`backup.m3u stays on the iPhone it was pasted on`);
  `What syncs` / `Not this TV's picture, sound or player settings: those stay here` / `See ›` (a sheet with §4.2's two
  lists); `Sign out of this TV` / `Your provider, add-ons and history leave this TV. Your account keeps them`; `Sign out
  everywhere` (a confirm menu: `Every device asks for your password or your phone again. The TV keeps working without
  an account.` / `Sign out everywhere` / `Cancel`). Not signed in: the group shows one row `Sign in on your phone ›` and
  the sub `Your provider, add-ons, Saved and history on every screen you own`. The avatar in the top bar shows the
  account's initial when signed in (it shows the icon today).
- The password is never typed on the TV except in the fallback; the recovery key, the password change and invites are
  phone and Windows things (`Recovery key: on your phone or PC` as a dim row, so the TV says where).

### 3.2 iPhone (`04`, `05`, `06`)

- **Sign in (`05`):** the first-run page described in §2.1; the fields carry the attributes the phone sign-in already
  uses (no capitals, no autocorrect, Passwords can fill them; `autocomplete="username"` / `"current-password"` so iOS
  offers to save the pair; `"new-password"` at sign-up).
- **Create an account (`06`):** three step chips (`1 · Account`, `2 · Recovery`, `3 · Provider`), the recovery-key card.
- **Approving a TV (`04`):** a bottom sheet over whatever was on screen (the app was opened by `Open in airglow`; if the
  app was not signed in, the sign-in card comes first and the sheet after): the TV icon, `Sign in this TV?`, `Philips TV
  · WDJ-BMH · asked 20 s ago`, the question line with the info bullet, then:
  - **same network** (the phone is on Wi-Fi, by Capacitor's Network plugin, and the Worker saw the TV's code request
    and the phone's lookup from the same public IPv4, or the same IPv6 /64): the tick `On the same network as this
    iPhone`. Never on mobile data (a carrier's CGNAT puts strangers behind one address).
  - **different networks, or no Wi-Fi** (`04b`): no tick; the sheet shows `WDJ-___`, a three-letter field `The last
    three letters on your TV`, the line `This iPhone isn't on the TV's network, so the letters make sure it's your TV.`,
    and `Sign in the TV` lights only when they match the code the link carried. The letters are in the link, so this is
    friction for a phished person, not proof; it is the friction RFC 8628 §5.4 asks for. A home where the TV speaks
    IPv4 and the phone IPv6 will see this step too (the families never match); it fails closed, and whether it shows at
    the owner's home is measured there (open item 9).
  - **a typed code** (Account › `Sign in a TV`, no `k`): the app trusts the server's `tvPub` and the line says `Make
    sure the code is the one on your TV.`
  Then `IT GETS YOUR` chips (`Provider login`, `Stremio add-ons`, `TMDB key`, `Saved`, `History`, `Settings`), the line
  `The TV signs in to nothing else: your provider, Stremio and TMDB logins come with it.`, `Sign in the TV`, `Not now`,
  the note about where the lock lives.
- **Account:** the group `airglow account` at the top of the pushed Account page: the email with `Signed in`; `Devices`;
  `Sign in a TV` (type the letters; the camera via the Capacitor barcode plugin is open item 3); `Recovery key`;
  `Change password`; `Invite a friend`; `What syncs`; `Sign out`. The avatar on the tabs shows the initial.

### 3.3 Windows (`08`)

Account › `airglow account` as the first group of the two-pane page: the header line (`Birgir · email · synced just
now`); two columns of grouped rows: **Devices** (`3 of 10`; each device: icon, name, `This PC` tag, how and when it
signed in, `Active now` (ok dot) or `Last seen 18:41`, `Sign out` / `Rename`; the foot explaining sign-out and
sign-out-everywhere), **Friends** (`Invite a friend` with the code field, `copied`, `New code`; the foot `3 invites left
this month. Open sign-up is off`), the unnamed group (`Sign out of this PC`, `Delete account`); **Security** (`Change
password`, `Recovery key · Set · 28 Oct`, `What the server has`), **Sync** (`Synced just now` with the list of what syncs
and the `not this PC's player, window or tray settings` line, `Sync now`; `Undo · Undo changes since…`, the 30 days of
previous versions and the merge snapshots, restored by this device, §4.4). The sidebar's Account item reads `Account · synced` (or `· offline`, `· sign
in`).

### 3.4 The Worker's pages (`07`)

Static files beside the Worker, in the brand (the TV's tokens and fonts, `phone.css`'s field and pill): `/tv` (the TV's
name and the code from the link, `Open in airglow` first, `or sign in here` with the code, email, password, the
three-letter step unless the code was typed, `Sign in the TV` as a ghost, the note `Your password stays in this browser:
it unlocks the key your TV needs`), `/signup` (the invite code, email, name, password, then the recovery key page, then `Done · open
airglow on your phone or PC`), `/recover` (email, the recovery key, a new password). No account page on the web in v1:
devices, invites and the rest are in the apps. `/tv/<code>` is routed through the Worker (`run_worker_first`), which
serves the same page with the code filled in.

### 3.5 States every screen shares

- Offline: the TV's Offline bar and the apps' equivalents already exist; the account rows say `Last synced Tue 20:41 ·
  offline` and `Sync now` is dim. Nothing else changes: local first.
- The server is down or answers 5xx (or 503 because its secrets are missing, §7): `airglow's server didn't answer ·
  trying again in 2 min` on the Sync row; sign-in screens show `Can't reach airglow's server right now. You can use
  airglow without an account and sign in later.`
- A device was signed out from elsewhere: on the next contact the app wipes the account's data and shows the first
  screen with the one-time line `Signed out everywhere from Laptop` (or `Signed out from Laptop · a sign-in token was
  reused`).
- Sync conflict (a record changed on two devices between syncs): merged by §4.4, never asked. The only question ever
  asked is §2.6's, once.
- Errors are neutral (icon + sentence), never red; red stays LIVE's.

---

## 4. The sync model

### 4.1 Records

A record is `{ col, id, ver, iv, blob, deleted, seq }`: the collection name and the item id in the clear (short labels
derived so they say nothing: §5.6), a version counter, the AES-GCM IV, the ciphertext, a deleted flag, and the server's
sequence number. The plaintext is JSON. Records are at most 64 KB; anything that can grow past that is split into
numbered parts (`plays:2026-10:1`, `:2`, …; `snapshot:<dev>:<date>:1`, …), and a part set is read back as one.

### 4.2 What syncs (and what doesn't)

`pid` is the provider's account-wide id, assigned once when the provider is first added to the account (random, 16
bytes, base64url) and stored in its record; a server-URL edit keeps it. Duplicates are found at merge by the canonical
natural key (`type|scheme://host[:port]|username`, scheme and host lowercased, a default port and a trailing slash
dropped; `type|url` for an M3U). On the device the provider keeps its random `acc.id`; the sync adapter maps
`acc.id ↔ pid` through the account's provider record at the boundary (§4.2a).

| Collection | Record id | Plaintext | From | Merge rule (§4.4) |
|---|---|---|---|---|
| `providers` | `<pid>` | `{ pid, natural, type, server, username, password, url, name, tz }` (an M3U's text never; a large M3U is re-downloaded from its `url`; a pasted one with no `url` stays on its device and Account says so) | `store 'accounts'`, `session.js` | union by `pid`; last write per record |
| `keys` | `tmdb`, `stremio` | `{ key }`; `{ authKey, email, keep }` | `tmdb.js`, `addons.js` `scoped('stremio')` | last write |
| `addons` | `<addonId>` (HMAC of the manifest url) and `order` | `{ url, name, from, on, catalogs }` (the manifest is re-fetched); `{ keys }` | `addons.js` list | union by id; last write per record; `order` = the newest list with unknown keys appended |
| `favs` | `<pid>/<itemKey>` and `<pid>/order` | `{ kind, item }`; `{ keys }` | `state.js` favs / favOrder | union; last write per item; order merged by the newest list with unknown keys appended |
| `progress` | `<pid>/<itemKey>` | `{ t, d, at, item }` | `state.js` progress | newest `at` wins; entries older than a year are pruned on both sides |
| `plays` | `<month>:<part>` (per person) | `{ plays: [{ pid, playId, imdb, type, name, year, season, episode, from, to, completion, at, source }] }` | `rows.js` plays (IndexedDB); the taste profile reads the whole log | union by `playId` (random, made when the play is logged) across all parts; plays with `at ≤ forget.upTo` dropped; a part's tombstone beats any lower `ver`; sorted by `at`; the 2,000 cap per device stays local |
| `rows` | `picks`, `hiddenRows`, `rowsOff`, `notInterested`, `forget` | as today; `forget = { upTo }` | `rows.js`, `shelves.js` | last write per record (`notInterested` union by key with the later expiry); `forget.upTo` = max, and it prunes `plays` on every merge |
| `titles` | `imdb`, `skipShows` | the IMDb notes and the learnt intro skips | `imdb.js`, `skip` | last write per key inside the record |
| `shield` | `nbaSeen` | `{ upTo, ids }` | `games.js` SEEN | `upTo` = max; `ids` = union, pruned by the auto-seen window |
| `settings` | `shared` | the shared keys with a timestamp each: `name`, `nbaTeam`, `shield`, `langs`, `subLang`, `replaysPlay`, `skipIntro`, `heroGame`, `gameNight`, `scoreBug`, `liveAlert` | `core.js` settings | last write per key |
| `snapshots` | `<deviceId>:<date>:<part>` (§2.6) | the device's local stores | the merge step | never merged; listed under Undo |
| `devices-meta` | `<deviceId>` | `{ name }` | Account | last write |

Stays on the device: `liveFormat`, `ua`, `scale`, `player`, `sounds`, `zapUp`, `previews`, `setupDone`, `recents`, the
TV's picture and frame-rate settings, the catch-up delays and `teamCh` per channel (a score delay is tuned to one
device's buffer; it doesn't travel), `rowStats` (written on every row entered: too chatty to sync), the PC's Windows
group, the phone's data saver and PiP, the guide and catalog caches, the subtitle files index, the probe budget.

Plays and taste are per person, not per provider: the owner's films come from add-ons, not the provider, and his
Comedy row should not forget what he watched when he switches lines. Saved and progress stay per provider because
their items are that provider's channels and copies.

### 4.2a The device's keys today, and where each one lives when signed in

Every key the three apps write (`store`, `tuner.<key>` in localStorage, and `Core.cache`, the IndexedDB parts), marked
**person** (one copy per account, under `u:<accountId>:<key>` when signed in), **provider** (per provider login, under
`a:<acc.id>:<key>` as today), **device** (never leaves the device) or **cache** (re-fetched, never synced).

| Key | Today | When signed in | Synced as |
|---|---|---|---|
| `accounts`, `active` | device | device; the list also carries each account's `pid` once mapped | `providers` (the login and `pid`), not the list |
| `m3u:<acc.id>` (a pasted playlist's text), `info:<acc.id>` (the Xtream login answer) | provider | provider, by `acc.id` | never (`info` is re-fetched; `m3u` text stays, §4.2) |
| `a:…:favs`, `favOrder`, `progress`, `recents`, `lastLive`, `liveCat`, `dkLiveGroup`, `phLiveGroup`, `hfLine`, `homeHidden` | provider | provider, by `acc.id` | `favs`, `progress` with `pid`; the rest device |
| `a:…:delays`, `teamCh`, `probeBudget`, `ver` (the pinned copy version), `replayPick`, `replayDelay`, `archiveShift`, `nbaWatchedOn` | provider | provider | device (they are about this device's buffer, probes and replays) |
| `probes:<acc.id>` (the copy checks) | provider | provider | device |
| `a:…:addons`, `stremio` | provider | **person** (`u:`) | `addons`, `keys/stremio` |
| `a:…:picks`, `hiddenRows`, `rowsOff`, `finishes`, `playsFrom`, `notInterested` (`shelves.js` `hiddenKey()`) | provider (`x:` with no account) | **person** | `rows/*` (`finishes` and `playsFrom` device) |
| `a:…:rowStats` | provider | person, local only | never |
| `a:…:imdb`, `skipShows` | provider | **person** | `titles` |
| `cache a:…:plays` (IndexedDB) | provider | **person** | `plays/<month>:<part>` |
| `cache a:…:homePage` | provider | person, local only | never (rebuilt from the rows) |
| `settings` (one object) | device | device; the shared keys of §4.2 mirrored to `u:` | `settings/shared` |
| `tmdbKey`, `tmdbBad`, `tmdbIx` | device | person for the key | `keys/tmdb`; `tmdbBad` and the index device |
| `nbaSeen`, `nbaPins`, `nba:today`, `nbaStories` | device | person for `nbaSeen` | `shield/nbaSeen`; the rest cache |
| `hfHints`, `hfKeyNote`, `subsFiles`, `tvRegion`, `*Base` / `*Url` overrides | device | device | never |
| `cache` catalogs, guides, `ratings`, `ad:meta:*`, `subs:file:*`, `nba` pins, pages | cache | cache | never |

`scoped(k)` becomes `S.user && PERSON.has(k) ? u:${S.user}:${k} : a:${S.acc.id}:${k}` with `PERSON` the set in the
table; `rows.js`'s `k()`, `addons.js`'s `LKEY`/`SKEY`, `shelves.js`'s `hiddenKey()`, the plays `PKEY` and the IMDb /
skip stores go through it. The merge step (§2.6) folds each provider's existing per-person copies into the `u:` set
once (add-ons unioned by manifest url, the Stremio state kept if any copy has it, picks and hidden rows from the newest
copy, plays unioned), and leaves the `a:` copies in place for life without the account. Switching providers while
signed in therefore keeps the add-ons, the Home rows and the taste; only Saved, progress and the last channel change
with the line, as they do today.

### 4.3 Keys and encryption of records

`dk` (32 bytes) is the root. `encKey = HKDF-SHA-256(dk, salt "", info "airglow/v1/records")` encrypts records:
AES-256-GCM with a fresh 12-byte IV and additional data `accountId/col/id/ver`, so a record can't be swapped for
another or moved between accounts without the client noticing. `idKey = HKDF(dk, "", "airglow/v1/ids")` makes record
ids (§5.6). `dk_check = AES-256-GCM(encKey, iv, aad "airglow/v1/check", "airglow")` is stored with the account; a device
that just received `dk` (a TV after a handover, a device after recovery) must open it before it writes anything.
Clients also refuse an incoming record whose `ver` is lower than the one they hold for that id (the AAD stops swaps,
this stops a replayed older version). (Standard Notes gives each item its own key under an items key; airglow's
records are small and few, one key is enough, and a key rotation is a future `keyVersion` on the record.)

### 4.4 Merge rules, the client's

Pull first (`GET /v1/sync?since=<seq>`), apply each incoming record to the local store by its collection's rule, then
push the local records whose `dirty` flag is set. A push answers `conflict` for a record whose server `ver` moved since
the base the client holds; the client re-reads that record, merges, bumps `ver` and pushes again (compare-and-set).
The rules: *last write* uses the record's `at` inside the plaintext (device clocks; a skew of up to a day is harmless
for settings); *union* never loses an element; *newest list* for orders. Deletes are tombstones (`deleted`, blob
empty) kept 90 days; a client whose cursor is older than that gets `{ reset: true }` and does a full pull, dropping its
non-dirty records the server no longer has.

Two server-side guards against a bad push, both finished by the client:

- **Undo.** Every overwritten or deleted record's previous blob is kept 30 days in `records_prev` (one per record per
  UTC day: the first predecessor stored that day, so an undo point is the start of any day; it counts toward the 8 MB
  cap). `GET /v1/undo?since=<time>&col=` returns those blobs *with the `ver` they were written under*; the device opens
  each with that `ver` in the AAD, re-encrypts it under the current `ver + 1`, and pushes it as an ordinary
  compare-and-set write, so the undo syncs everywhere and is itself undoable. The server never re-versions a blob.
- **The mass-delete guard.** One push that would delete more than half of a collection and at least five records is
  refused with `too_many_deletes` unless it carries `{ wipe: true }`. The confirmed actions that send it, each behind
  its own confirm already: `Remove provider` (its `providers/<pid>`, `favs/<pid>/*`, `progress/<pid>/*`), `Forget my
  taste` (the plays parts, plus `rows/forget`), `Reset rows` (`rows/*`), `Clear Continue watching` (`progress/<pid>/*`),
  `Delete account`. Sign-out and Replace clear locally and push nothing. A client refused without `wipe` keeps the
  records locally, marks them *held*, stops retrying them, and shows on the Sync row `Some changes weren't synced ·
  <n> deletions wait for a confirm` with `Sync them` (re-push with `wipe`) and `Undo them` (drop the local deletes and
  pull).
- **Deletes win over union for logs.** `Forget my taste` writes `rows/forget = { upTo: now }` (last write, max) and
  tombstones every plays part; a merge of plays drops every play with `at ≤ forget.upTo`, and a part's tombstone beats
  any lower `ver` of that part, so a phone's old copy can't bring the log back.

### 4.5 When

On launch (after Home is drawn, never before: the launch budget stays), every 15 minutes while the app is open (a
`GET /v1/sync/seq` first; a pull only if it moved), 5 s after a change (debounced), on return from background, on
`Sync now`, and before a voluntary sign-out. The TV's timer is suspended in the player (nothing to sync while a stream
plays; the play log is written at the end anyway).

### 4.6 Limits (and the free plan's arithmetic)

Per account: 10 devices, 5,000 records, 8 MB. Per request: 100 records, 256 KB (parsing and binding more can pass the
10 ms CPU budget on Free; the Miniflare tests measure a full push). Per day: 2,000 pushes. The Worker: 50 people × (a
few launches + 96 idle `seq` reads + ~20 pushes + ~10 pulls) ≈ 7,000 requests a day against 100,000; TV sign-ins poll
120 times at most each. D1: a record push is about three rows written (the record, its `seq` index, the account's
counter), a pull one indexed read per changed record; well under 5 M / 100 k. Storage: 50 accounts × 8 MB = 400 MB,
inside one 500 MB Free database; `plays` months older than a year fold into a yearly record, `progress` is pruned at a
year, so the cap is a ceiling nobody reaches.

---

## 5. The encryption, in plain words and then exactly

**Plain words.** Your password is turned into a key on your own device, slowly, so guessing is expensive. That key
never leaves the device. A second, random key locks everything that syncs; the server keeps that second key only
inside a box the first key opens, and keeps your records only in boxes the second key opens. The server can check it's
you (it gets a different key made from the same password, and keeps a scrambled fingerprint of it), but it can't open
anything. A TV never gets your password: your phone puts the second key in a box only that TV can open, and the server
passes the box along. Your recovery key is a spare, random first key: it opens its own copy of the box with the second
key in it, so forgetting the password doesn't lose anything, as long as you kept the spare; the spare itself is kept in
a box your password opens, so you can look at it again. If both are gone, so is the data; nobody, including us, can get
it back.

### 5.1 Names

- `pw` the password (NFKC-normalised, **not** trimmed); `email` lowercased.
- `salt` 16 random bytes made at sign-up, stored on the server in the clear (random, not the email: changing the email
  costs nothing; a password change may replace it).
- `mk` master key, 32 bytes; `wk` wrapping key; `ak` auth key; `dk` data key; `encKey`, `idKey` from it; `rk` recovery
  key; `rwk` / `rak` the recovery wrapping and auth keys.

### 5.2 From the password

```
mk  = PBKDF2-HMAC-SHA-256(pw, salt, iterations = 600000, 256 bits)      // WebCrypto deriveBits
wk  = HKDF-SHA-256(ikm = mk, salt = "", info = "airglow/v1/wrap", 256 bits)
ak  = HKDF-SHA-256(ikm = mk, salt = "", info = "airglow/v1/auth", 256 bits)
```
The account record carries `kdf = { alg: "pbkdf2-sha256", iterations: 600000, salt }` so a later Argon2id (`alg:
"argon2id", m, t, p`) or a higher count re-derives on the next sign-in and re-wraps (§2.7's path, without a new
password). **Floor and ceiling in every client:** `pbkdf2-sha256` below 600,000 or above 5,000,000, or any `alg` the client
doesn't know, is refused before anything is derived. Target: about 1 s on the iPhone, 2 to 4 s on the TV's SoC in the typed fallback (the TV's
normal path never derives anything).

### 5.3 The data key, the recovery key, and their wraps

```
dk    = random 32 bytes
wrap  = AES-256-GCM(key = wk, iv = random 12, aad = "airglow/v1/dk", plaintext = dk)        -> wrappedKey
rk    = random 100 bits, shown as 20 Crockford base-32 characters in five groups (no I, L, O, U; case-free)
rwk   = HKDF-SHA-256(ikm = rk, salt = "airglow/v1/recovery", info = "airglow/v1/recovery-wrap", 256 bits)
rak   = HKDF-SHA-256(ikm = rk, salt = "airglow/v1/recovery", info = "airglow/v1/recovery-auth", 256 bits)
rwrap = AES-256-GCM(key = rwk, iv, aad = "airglow/v1/dk", dk)                               -> recoveryWrappedKey
rkpw  = AES-256-GCM(key = wk, iv, aad = "airglow/v1/rk", rk)                                -> recoveryKeyWrappedByPw
```
`rk` is random and 100 bits, so no slow KDF is needed on it (1Password's Secret Key reasoning), and its HKDF salt is a
constant, not the password's KDF salt: a password change or a KDF upgrade can replace that salt without touching
`recoveryWrappedKey` or `recoveryAuthHash` (the known-answer tests include "change the password, then recover"). `rkpw` is what `Show
it` opens, with the password; it is never wrapped under `dk` or `encKey`, so a device that holds only `dk` (a TV, or a
stolen one) cannot learn `rk`, derive `rak` and take the account over. The server stores `wrappedKey`,
`recoveryWrappedKey`, `recoveryKeyWrappedByPw`, `dk_check` (§4.3), and the HMACs of `ak` and `rak` (§5.4).

### 5.4 What the server keeps to check it's you

```
PEPPER   = a 32-byte Worker secret (made by CI, §7)
authKey  = HKDF-SHA-256(PEPPER, "", "airglow/v1/pepper-auth")      ipKey = HKDF(PEPPER, "", "airglow/v1/pepper-ip")
fakeKey  = HKDF-SHA-256(PEPPER, "", "airglow/v1/pepper-fake-salt")
authSalt = random 16 bytes per account
authHash = HMAC-SHA-256(key = authKey, data = authSalt || ak)       // the same for rak -> recoveryAuthHash
```
Compared with `timingSafeEqual`. What a stolen D1 export gives: auth HMACs useless without the pepper; blobs useless
without `dk`; and `wrappedKey`, which **is** an offline oracle: a guess at the password costs one 600,000-iteration
PBKDF2 plus one AES-GCM tag check, no pepper needed, exactly Bitwarden's exposure. The pepper protects the auth path; the
password's length and the KDF protect the data. Rotating the pepper: `PEPPER_PREV` kept 30 days; a successful login
against the old HMAC re-HMACs under the new. Refresh hashes are not peppered, so signed-in devices survive a pepper
loss; nobody can sign in *again* until it is rotated.

### 5.5 Handing the data key to a TV

```
TV:     (tvPriv, tvPub) = ECDH P-256 keypair, fresh per code; k = base64url(SHA-256(tvPub)) (43 chars) in the QR link (#k=)
Phone:  checks SHA-256(tvPub from the server) == k from the link, else refuses ("This link doesn't match the TV it names")
        (ePriv, ePub) = ephemeral ECDH P-256
        shared = ECDH(ePriv, tvPub)
        hk  = HKDF-SHA-256(ikm = shared, salt = user_code, info = "airglow/v1/handover", 256 bits)
        aad = "airglow/v1/handover|" + user_code + "|" + base64url(SHA-256(tvPub))
        box = AES-256-GCM(key = hk, iv, aad, dk)   -> { ePub, iv, ct }
TV:     shared = ECDH(tvPriv, ePub); hk and aad as above; dk = open(box); then opens dk_check before anything else
```
Both ends know `user_code` and `tvPub`; nothing in the AAD is private to one side. The Worker sees `tvPub`, `ePub` and
the box; without `tvPriv` the box is noise. The hash check binds the link to the key the server reports; whether a
person is standing at that TV is the sheet's question and the same-network check (§3.2), not something the hash can
say. A code typed by hand has no `k`, so the phone trusts the server's `tvPub` for it and says so.

### 5.6 Record ids

Ids must not leak content and must be the same on every device, including a TV that never sees the password:
`id = base64url(HMAC-SHA-256(key = idKey, data = natural key))[0..22]` with `idKey` from `dk` (§4.3): providers
(`type|server|username` or `type|url`), add-ons (manifest url), favs and progress (`keyOf(item)`). Collections, months
(`plays:2026-10`) and setting names are not secrets. A password change changes none of them.

### 5.7 Where keys rest on each device

- iPhone: `dk` and the refresh token in the Keychain (Capacitor's secure storage plugin; `kSecAttrAccessibleAfter
  FirstUnlock`), never in localStorage. `wk` is dropped after the sign-in; `mk` never stored.
- Windows: Electron's `safeStorage` (DPAPI) for `dk` and the refresh token, in `userData`.
- TV: a new plugin method `secret.set/get/clear` in `TunerPlayerPlugin`: an AES key in the Android Keystore wraps `dk`
  and the refresh token, the wrapped bytes in the app's private files (Jetpack's `EncryptedSharedPreferences` is
  deprecated; this is the shape its replacements use). The WebView gets `dk` through the bridge at launch, into memory
  only. `encKey` and `idKey` are derived in memory from it.
- The web pages (`/tv`, `/signup`, `/recover`): memory only, the tab closed when done; `/tv`'s login is one-shot.

### 5.8 Tokens

Access token: 1 hour, HMAC-SHA-256-signed compact JSON `{ sub, dev, exp, scope }` (`TOKEN_SECRET`; `scope:
"approve"` for the `/tv` page's 5-minute one-shot); every authenticated request also reads `devices.revoked_at` (one
indexed read), so a signed-out device stops at once, not at the hour. Refresh token: the first is 32 random bytes;
every successor is deterministic, `next = HMAC-SHA-256(refreshKey, deviceId || prev)` with `refreshKey =
HKDF(TOKEN_SECRET, "", "airglow/v1/refresh")`, so the server (which stores only `SHA-256(next)` in `refresh_hash` and
`SHA-256(prev)` in `refresh_prev_hash`) can recompute the same successor from the token it is handed. **The rule:** a
refresh with the *current* token rotates (the successor becomes current, `refresh_used_at` cleared); a refresh with
the *previous* token while the successor has not yet been used (`refresh_used_at` null) recomputes the same successor
and re-signs the access token, however long ago the rotation was (a lost response, a crash before the Keystore write,
the TV switched off at the wall); a refresh with the previous token *after* the successor was used is a reuse by a
second holder and revokes the device with `revoked_why = reuse`. 90 days idle. **The client wipes only on an explicit
`{ error: "revoked" }`** from `/v1/token` or an authenticated call; never on a generic 401, a 5xx, the 503 for missing
secrets or a network error, which all just wait. The TV's device flow issues the same pair.

---

## 6. The Worker: API and schema

`worker/` in the repo: `wrangler.toml`, `src/index.js` (a plain `fetch` router, no framework; CORS
`Access-Control-Allow-Origin: *` with no credentials, since auth is a bearer token and Electron's renderer sends
`Origin: null`, Capacitor `http(s)://localhost` / `capacitor://localhost`), `src/auth.js`, `src/sync.js`,
`src/device.js`, `src/invites.js`, `src/cron.js`, `migrations/0001_init.sql`, `pages/` (the static `/tv`, `/signup`,
`/recover`), `test/` (Miniflare / `wrangler dev` tests run in CI).

### 6.1 Endpoints (JSON; `Authorization: Bearer <access>` where marked)

| Method and path | Body → answer | Notes |
|---|---|---|
| `GET /v1/health` | → `{ ok, version, ready }` | `ready` false until the secrets exist (then `/v1/*` answers 503); nothing about accounts or the owner |
| `POST /v1/prelogin` | `{ email }` → `{ kdf }` | the current default kdf + a fake salt from `fakeKey` for unknown emails |
| `POST /v1/signup` | `{ invite, email, kdf, authKey, wrappedKey, recoveryWrappedKey, recoveryAuthKey, recoveryKeyWrappedByPw, dkCheck, device }` → `{ account, access, refresh }` | 409 if the email exists; 403 bad invite (one neutral error whether the code is wrong, spent or expired); the owner code (`OWNER_CODE`, compared constant-time after NFKC and trim) is accepted as the invite once, makes that account `is_owner` and is marked spent in `meta`; 5/h per IP |
| `POST /v1/login` | `{ email, authKey, device: { name, kind, platform }, oneShot? }` → `{ access, refresh?, wrappedKey, recoveryKeyWrappedByPw, dkCheck, kdf, keyVersion, deviceId? }` | 401 one neutral error; 5 fails / 10 min per account + IP → `slow_down`; `oneShot` (the `/tv` page): a 5-minute access token with `scope: "approve"` (the lookup and the approval only), no refresh token, no device row |
| `POST /v1/token` | `{ refresh }` → `{ access, refresh }` or `{ error: "revoked" }` | the deterministic successor of §5.8; the previous token re-issues until its successor is used, then counts as a reuse and revokes |
| `POST /v1/logout` (auth) | → 204 | this device |
| `POST /v1/logout-all` (auth) | `{ authKey }` (phone/PC) or none from a TV → 204 | every device; the audit row |
| `GET /v1/devices` (auth) | → `{ devices: [{ id, name, kind, platform, how, approvedBy, createdAt, lastSeen, active, this }] }` | nothing about what plays; `approvedBy` is the approving device's name for a TV |
| `PATCH /v1/devices/:id` (auth) | `{ name }` → 204 | rename |
| `DELETE /v1/devices/:id` (auth) | → 204 | sign that one out |
| `POST /v1/password` (auth) | `{ authKey, newAuthKey, kdf, wrappedKey, recoveryKeyWrappedByPw, signOutOthers }` → `{ keyVersion }` | |
| `POST /v1/recovery-key` (auth) | `{ authKey, recoveryWrappedKey, recoveryAuthKey, recoveryKeyWrappedByPw }` → 204 | a new key |
| `POST /v1/recover` | `{ email, recoveryAuthKey, newAuthKey, kdf, wrappedKey, recoveryKeyWrappedByPw }` → `{ access, refresh }` | revokes all; 5/h per account (a D1 counter) |
| `POST /v1/device/code` | `{ name, kind, pub }` → `{ device_code, user_code, verification_uri, verification_uri_complete, expires_in: 600, interval: 5 }` | 20/h per IP (D1 counter); the TV's `ipKey`-HMAC and /64 kept for the same-network check |
| `POST /v1/device/token` | `{ device_code }` → `authorization_pending` / `slow_down` / `expired_token` / `access_denied` / `{ access, refresh, box, dkCheck, keyVersion, deviceId }` | the TV polls |
| `GET /v1/device/:user_code` (auth) | → `{ name, kind, pub, askedAt, sameNetwork }` | the approver's lookup; a code that matches nothing counts against the approving account and its IP: 5 misses per 10 min → `slow_down`; lookups need an account, so a stranger can't guess at all |
| `POST /v1/device/approve` (auth) | `{ user_code, box }` → 204 | binds the code to the account; only a device whose `how` is `password` or `recovery` (or the `/tv` page's `approve` scope) may call it; the approver's id is stored |
| `POST /v1/device/deny` (auth) | `{ user_code }` → 204 | "Not now" |
| `GET /v1/sync/seq` (auth) | → `{ seq }` | the idle poll: one read |
| `GET /v1/sync?since=<seq>&limit=100` (auth) | → `{ records, seq, more }` or `{ reset: true, seq }` | indexed by `(account, seq)`; `reset` for a cursor older than the tombstone horizon |
| `POST /v1/sync` (auth) | `{ records: [{ col, id, baseVer, ver, iv, blob, deleted }], wipe? }` → `{ ok, conflict: [...], seq }` | CAS per record; ≤ 100 records / 256 KB; `too_many_deletes` (§4.4) unless `wipe`, which only the confirmed actions send |
| `GET /v1/undo?since=<time>&col=<col>` (auth) | → `{ records: [{ col, id, ver, iv, blob, deleted, replacedAt }], more }` | the previous blobs with the `ver` they were written under; the client opens, re-encrypts and pushes them (§4.4) |
| `GET /v1/invites` (auth, owner) / `POST /v1/invites` (auth, owner) | → `{ code, expiresAt }` | 10/month (`INVITES_PER_MONTH`) |
| `DELETE /v1/account` (auth) | `{ authKey }` → 204 | |

Errors are `{ error: "code", message }` with the codes above; the apps map codes to the sentences of §10, never show
`message` raw.

### 6.2 D1 schema (`migrations/0001_init.sql`)

```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL,
  kdf_alg TEXT NOT NULL, kdf_iter INTEGER NOT NULL, kdf_salt BLOB NOT NULL,
  auth_salt BLOB NOT NULL, auth_hash BLOB NOT NULL,
  wrapped_key TEXT NOT NULL, dk_check TEXT NOT NULL,
  recovery_wrapped_key TEXT, recovery_auth_hash BLOB, recovery_key_wrapped_by_pw TEXT, recovery_set_at INTEGER,
  key_version INTEGER NOT NULL DEFAULT 1, seq INTEGER NOT NULL DEFAULT 0,
  record_count INTEGER NOT NULL DEFAULT 0, bytes INTEGER NOT NULL DEFAULT 0, is_owner INTEGER NOT NULL DEFAULT 0 );
CREATE TABLE devices (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL, kind TEXT NOT NULL, platform TEXT, how TEXT NOT NULL,          -- how: password | phone | recovery
  created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL,
  approved_by TEXT,                                                                   -- the approving device, for a TV
  refresh_hash BLOB, refresh_prev_hash BLOB, refresh_rotated_at INTEGER, refresh_used_at INTEGER,
  revoked_at INTEGER, revoked_why TEXT );
CREATE INDEX devices_account ON devices(account_id);
CREATE TABLE device_codes (
  device_code_hash BLOB PRIMARY KEY, user_code TEXT NOT NULL UNIQUE, tv_name TEXT NOT NULL, tv_kind TEXT NOT NULL,
  tv_pub TEXT NOT NULL, tv_net BLOB, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',          -- pending | approved | denied | used | expired
  account_id TEXT, box TEXT, approved_by_device TEXT, last_poll INTEGER );
CREATE TABLE records (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, col TEXT NOT NULL, id TEXT NOT NULL,
  ver INTEGER NOT NULL, iv TEXT NOT NULL, blob TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0,
  seq INTEGER NOT NULL, updated_at INTEGER NOT NULL, by_device TEXT,
  PRIMARY KEY (account_id, col, id) );
CREATE INDEX records_seq ON records(account_id, seq);
CREATE TABLE records_prev (                                      -- 30 days of what a record was before each change
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, col TEXT NOT NULL, id TEXT NOT NULL,
  ver INTEGER NOT NULL, iv TEXT, blob TEXT, deleted INTEGER NOT NULL, replaced_at INTEGER NOT NULL, by_device TEXT,
  PRIMARY KEY (account_id, col, id, ver) );
CREATE INDEX records_prev_at ON records_prev(account_id, replaced_at);
CREATE TABLE invites (
  code_hash BLOB PRIMARY KEY, made_by TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, used_by TEXT );
CREATE TABLE meta ( key TEXT PRIMARY KEY, value TEXT NOT NULL );   -- 'owner_claimed' once the owner code is spent
CREATE TABLE counters (                                          -- the hourly limits the binding can't express
  key TEXT PRIMARY KEY, n INTEGER NOT NULL, window_start INTEGER NOT NULL );
CREATE TABLE audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT, account_id TEXT, at INTEGER NOT NULL, event TEXT NOT NULL,
  device_id TEXT, ip_hash BLOB, detail TEXT );
CREATE INDEX audit_account ON audit(account_id, at);
```
`tv_net` is `HMAC(ipKey, ipv4)` or `HMAC(ipKey, ipv6 /64)`; the approver's lookup compares its own the same way and
answers `sameNetwork`. Housekeeping on a cron trigger (daily): expired device codes, tombstones over 90 days,
`records_prev` (which keeps one row per record per UTC day) and snapshots over 30 days, counters over a day, audit rows over 180 days, devices revoked over 30 days.
`seq` is per account (`accounts.seq + 1` in the same transaction as the write), so a pull by `since` is one indexed
range read.

### 6.3 Rate limits

The Rate Limiting binding (`[[ratelimits]]`, 60 s period) for the per-minute shields: `login` 10 / min per IP, `device
token` 20 / min per device code (a polling TV never reaches it), `sync` 60 / min per account. The rules the binding
can't express (10 and 60 s periods only) are rows in `counters`: `device/code` 20 / h per IP, `signup` 5 / h per IP,
`recover` 5 / h per account, the 5-in-10-minutes rules per account + IP for login failures and for approver lookups.
The binding is "permissive and eventually consistent"; the counters are the rule, the binding the shield.

---

## 7. CI: deploying the Worker, and the owner's first account

### 7.1 The job

A new job `accounts` in `.github/workflows/build.yml`, run on pushes that touch `worker/**` (and manually): checkout;
`npm ci` in `worker/`; `node --test` (the Miniflare tests); the D1 database (`npx wrangler d1 create airglow || true`,
then its id from `wrangler d1 list --json` into `wrangler.toml`; or `database_id` left out if the pinned wrangler
provisions on deploy); then `cloudflare/wrangler-action@v4` with `apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}`,
`accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`, `workingDirectory: worker`, `command: d1 migrations apply airglow
--remote` and then `deploy`; then the secrets step; then `curl <host>/v1/health` and fail unless `ready` is true. The job runs on `push` and
`workflow_dispatch` only, never on `pull_request` (a fork's PR must not reach the secrets).

### 7.2 The secrets step (CI makes them, once)

```yaml
- name: Worker secrets (made once, never printed)
  shell: bash            # bash -e alone has no pipefail: a failed `secret list` would read as "nothing exists"
  env: { AIRGLOW_OWNER_CODE: ${{ secrets.AIRGLOW_OWNER_CODE }} }
  run: |
    set -euo pipefail; set +x
    list=$(npx wrangler secret list --format json)
    echo "$list" | jq -e 'type == "array"' > /dev/null          # anything else: stop, touch nothing
    have=$(echo "$list" | jq -r '.[].name')
    ready=$(curl -fsS "https://$HOST/v1/health" | jq -r '.ready')
    for name in PEPPER TOKEN_SECRET; do
      if ! grep -qx "$name" <<< "$have"; then
        [ "$ready" = "true" ] && { echo "health says ready but $name is missing: refusing to touch secrets"; exit 1; }
        openssl rand -base64 32 | npx wrangler secret put "$name" > /dev/null
      fi
    done
    if ! grep -qx OWNER_CODE <<< "$have" && [ -n "${AIRGLOW_OWNER_CODE:-}" ]; then
      printf '%s' "$AIRGLOW_OWNER_CODE" | npx wrangler secret put OWNER_CODE > /dev/null
    fi
```
It fails closed: `pipefail`, the listing validated as a JSON array before any name is read from it, `PEPPER` and
`TOKEN_SECRET` never written while the live Worker says it is ready (both conditions must agree), an empty owner code
skipped (an empty code would be a bootstrap anyone could claim), and nothing echoed. The values go from `openssl`
into `wrangler` through a pipe and are never written to the repo or printed in the (public) CI logs. They are made
once: Worker secrets persist across deploys, and the step re-creates nothing that exists; a changed repository secret
later does not update the Worker's copy (rotate by hand with `wrangler secret put`). The Worker answers 503 on `/v1/*` (and `ready: false` on `/v1/health`) until
`PEPPER` and `TOKEN_SECRET` exist, so a deploy that beats the secrets step is harmless. **Deleting or renaming the
`acct` Worker deletes its secrets: the pepper is gone, every auth hash is unverifiable, and nobody can sign in again or
recover** (devices already signed in keep working, §5.4). The data stays safe (it is not under the pepper): the builder writes this in `NEXT.md` under
"things that are true but easy to miss", and the Worker's name is never changed casually. A pepper rotation is the
planned path (`PEPPER_PREV`, §5.4), not a delete.

### 7.3 What the owner does, once

1. In the GitHub repository's settings › Secrets and variables › Actions, add three secrets: `CLOUDFLARE_API_TOKEN` (a
   token with Workers Scripts Edit, D1 Edit, Account Settings Read), `CLOUDFLARE_ACCOUNT_ID`, and `AIRGLOW_OWNER_CODE`:
   a phrase he makes up (three or four words, four random words, or `openssl rand -base64 12`, never anything about his team; it is compared after NFKC and trim,
   case-sensitive). His email is not a secret (it is on every commit), so it is not the key to the first account; the
   phrase is, and it lives only there and in the Worker.
2. Run the workflow (or push `worker/**`). CI creates the database, deploys, makes the pepper and the token secret, puts
   the owner code into the Worker, and checks health.
3. On his iPhone or laptop: `Create an account with an invite`, type the phrase in the invite field (the field is just
   `Invite code`; nothing on screen or in `/v1/health` says an owner is still unclaimed), his email, a name, a password
   of 12 characters or more, and save the recovery key. That account is the owner's: it can make invites, and the phrase
   is spent. From then on sign-up needs an invite. If someone else somehow typed the phrase first, the Devices list and
   the invites would be theirs: the phrase is to be kept like a password until it is used.

`wrangler.toml` (no email in it):
```
name = "acct"
main = "src/index.js"
compatibility_date = "2026-10-01"
[assets]
directory = "pages"
run_worker_first = ["/v1/*", "/tv/*"]
[[d1_databases]]
binding = "DB"
database_name = "airglow"
database_id = "<filled by CI>"
[[ratelimits]]
name = "RL_LOGIN"
namespace_id = "1001"
simple = { limit = 10, period = 60 }
[[ratelimits]]
name = "RL_SYNC"
namespace_id = "1002"
simple = { limit = 60, period = 60 }
[triggers]
crons = ["17 4 * * *"]
[vars]
OPEN_SIGNUP = "false"
INVITES_PER_MONTH = "10"
```
The apps read the host from `core.js` (`ACCOUNTS_HOST`, overridable in `store 'acctHost'` for the fake Worker in tests).
The release job is unchanged: the Worker deploys from `tv-redesign` as well as `main` (one Worker, one database; a
`--env staging` is a later line).

---

## 8. Security notes (what could go wrong, and the answer)

| Threat | Answer |
|---|---|
| The D1 database leaks | Blobs under `encKey`; `dk` only wrapped under `wk` and `rwk`; `rk` only under `wk`. Auth HMACs are useless without the pepper. **`wrapped_key` is an offline guessing oracle**: each password guess costs 600,000 PBKDF2 iterations and a tag check, as in Bitwarden; the 12-character minimum and the KDF are the defence, which is why neither is negotiable. |
| The Worker's secrets leak too | The pepper lets an attacker test guesses against the auth hash offline at the KDF's cost: no worse than the oracle above. Rotate with `PEPPER_PREV` (§5.4). |
| The Worker is malicious (a bad deploy, a stolen Cloudflare token) | The apps' code is in the APK / IPA / installer, not served, and the apps refuse a weak KDF from `prelogin`; the `/tv`, `/signup` and `/recover` pages are served and are the one place a bad server could steal a password. Mitigations: the pages are files in this repo, deployed by CI from a reviewed commit; `/tv` leads with the app; the form's note says what the browser does. (SRI on a same-origin script protects nothing and is not claimed.) |
| Someone sends the owner a link to a code they started (remote phishing, RFC 8628 §5.4) | The sheet names the TV and the time, asks `Is this the code on your TV?`, says `If someone sent you this link, tap Not now`, shows the same-network tick only when it holds, and from another network asks for the last three letters from the TV screen; every new device lands in the Devices list with `signed in with your phone` and a `Sign out`; the key hash binds the link to the key the server reports, no more. |
| Code guessing | 64 M codes, 10 minutes; lookups need a signed-in account and are counted per account + IP; 20 code requests per IP per hour. |
| A stolen refresh token | Rotated on every use with a deterministic successor; a reuse of the previous token after its successor has been used revokes the device (the theft signal) and the next sync shows `Signed out from Laptop · a sign-in token was reused`. `revoked_at` is read on every call. A device wipes only on an explicit `revoked`. |
| A stolen TV (or a sold one) | `Sign out <device>` from any other device; the TV wipes on its next contact. A TV that never comes online keeps `dk` in the Keystore-wrapped store, which is Android's own protection; it holds no `rk` and no password, so it can't change either (§5.3), and a device that signed in with a phone can't approve another, so it can't enrol a second screen. A factory reset before selling is the advice in About. |
| Password change by an attacker who has a session | `POST /v1/password` needs the current auth key; the TV can't change it at all. |
| Recovery-key guessing | 100 bits, HKDF'd; 5 tries an hour per account (someone who knows the email can lock recovery for an hour: accepted); a recovery revokes every session and is in the audit list. |
| Email enumeration | `prelogin` answers for any email with the current default KDF and a stable fake salt; `signup` says `409` only with a valid invite; `recover` answers the same for unknown emails. |
| Replay / swapping records between accounts | AES-GCM AAD binds `accountId/col/id/ver`; clients refuse a lower `ver`; a record moved, rolled back or swapped fails to open and is reported as a sync error, not applied. |
| One bad push empties every device | Refused when it deletes more than half a collection unless a confirmed action sent `wipe`; 30 days of previous versions the client can open and push back; `Undo changes since…`. |
| A lost response or a crash mid-rotation | The deterministic successor re-issues until it has been used; the TV never wipes over a retry, a 5xx or a network error. |
| The owner's first account is squatted | The bootstrap needs the owner code, a phrase only he and the Worker know; `/v1/health` and `/signup` say nothing about whether it has been used; after the first use it is spent. |
| Someone on the sofa signs everyone out | `Sign out everywhere` on the TV needs only the remote's OK: accepted, the same trust as the TV's provider Sign out today; every device just asks for the password or the phone again. |
| Another iOS app claims `airglow://` | Harmless: the link carries the code and the TV's key hash, no secret; the app that opens it still has to be signed in to approve. |
| The WebView's localStorage on the TV | `dk` is never in it (§5.7); records at rest on the TV are the app's own store as today (the provider login is already there in the clear today; the account makes nothing worse on the device). |
| Logging | The Worker logs no bodies; `ip_hash` is `HMAC(ipKey, ip)` truncated, kept for the rate rules and the audit lines only. |

What the server knows: emails, device names and kinds, how and when each signed in, when things happened, sizes and
counts, which collections exist, and (from write times of `plays:<month>` and `progress` records) roughly *when*
someone watches, though never what. What it cannot know: provider logins, the TMDB key, the Stremio key, what anyone
watched, Saved, settings, the recovery key.

---

## 9. What the builder changes in which files (and the order)

1. **`worker/`** (new): `wrangler.toml`, `migrations/0001_init.sql` (§6.2), `src/index.js` (routing, CORS `*`, the 503
   until the secrets exist), `src/auth.js` (§5.4, §5.8 with the grace window and the `revoked_at` read, prelogin with
   the stable fake salt, signup with the owner bootstrap, login with `oneShot`, token, logout, password, recovery-key,
   recover, account delete), `src/device.js` (§2.3, §6.1's device endpoints, `tv_net`, `sameNetwork`), `src/sync.js`
   (§4, CAS, limits, the cursor, `reset`, `records_prev` one per day, the mass-delete guard with `wipe`, the undo
   listing), `src/invites.js` (the invite codes and the owner code's one use),
   `src/counters.js` (§6.3), `src/cron.js`, `pages/tv.html` (`Open in airglow` first), `pages/signup.html`,
   `pages/recover.html`, `pages/acct.css` (the brand files copied by the build), `pages/acct.js` (§5.2, §5.3, §5.5 in
   the browser, the KDF floor), `test/*.test.js` (Miniflare: the whole device flow, an approval refused from a phone-enrolled device, a sync with
   a conflict, a push over 256 KB refused, the mass-delete guard with and without `wipe`, undo then decrypt and
   re-push, a lost `/v1/token` response then a retry after 90 s (re-issued) and a reuse after the successor was used
   (revoked), the rate rules, the 503 without secrets, the owner code used once; and the CI secrets step run against a
   failing `secret list`, which must `put` nothing).
2. **`.github/workflows/build.yml`:** the `accounts` job of §7; `tests/mock-accounts.js` (a fake Worker for the TV,
   phone and desktop tests, started by `tests/tv/serve.sh`, with a `native.secret` stub for the browser runs).
3. **Shared data layer (`app/tv/js/`):** `account/crypto.js` (§5: `deriveKeys` with the floor and the ceiling, `wrapKey`, `unwrapKey`,
   `subkeys` (`encKey`, `idKey`), `dkCheck`, `encryptRecord`, `decryptRecord`, `handover`, `recoveryKey` with lenient
   Crockford decoding; WebCrypto only; `tests/account-crypto-test.js` with known-answer vectors, including a handover
   box and "change the password, then recover", that the TV, the phone page and the Worker's `acct.js` all decrypt),
   `account/api.js` (the endpoints, the token
   refresh, the host), `account/session.js` (signed-in state, `dk` in memory, the secure store per platform behind
   `native.secret`, `tuner.secret`, the phone's Keychain plugin), `account/sync.js` (§4: the dirty set, the collections'
   adapters with the `acc.id ↔ pid` map, the merge rules, `forget`, held records and `wipe`, part sets, the schedule,
   `seq` polls, the client-side undo, `on('acct-sync')`), `account/merge.js` (§2.6: the counts for the question, the
   snapshot parts, merge / replace, folding each provider's per-person copies into `u:`),
   `account/device.js` (the TV's code flow: `start`, `poll`, `cancel`). Hooks in the existing modules: `state.js` (`scoped()` with the
   `PERSON` set of §4.2a; favs, favOrder, progress mark dirty), `session.js` (providers from the account with their
   `pid`; `signIn` saves to the account; `removeAccount` sends `wipe`), `rows.js` (`playId` per play, the person-wide
   log under `u:`, `forgetTaste` and `resetRows` with `wipe`, picks, hiddenRows, rowsOff, notInterested; `rowStats`
   stays local), `shelves.js` (`hiddenKey()` through `scoped()`), `imdb.js` and the skip store (`titles`), `games.js` (`saveSeen`), `addons.js` (the list, the Stremio state),
   `tmdb.js` (`setKey`), `core.js` (`saveSettings` marks the shared keys dirty; `ACCOUNTS_HOST`).
4. **TV:** `screens/first.js` (the Welcome's new primary and its line, `01`, the typed fallback with Email / Password,
   the verifying rows for an account), `screens/account.js` (the `airglow account` group, `03`, the Devices sheet, the
   What syncs sheet, the two sign-outs), `screens/merge.js` (`02`, Back's toast), `main.js` (sync start after Home; the
   signed-out line), `app.css` (`accounts.css`'s TV part appended), `TunerPlayerPlugin` (`secret.set/get/clear` with a
   Keystore key; `android/.../Secret.java`), `tests/tv/account-*.js` (the code flow against the fake Worker, the merge
   question, the Account group) and the emulator test's checks; `NEXT.md`'s warning (§7.2).
5. **Windows:** `app/desktop/signin.js` (`05`'s shape with real fields, the KDF floor's sentence), `app/desktop/account.js`
   (`08` with Undo), `main.js` (`safeStorage` behind `tuner.secret`), `preload.js`, `tests/desktop/views.js` (the Account
   page, the devices list) and `app-windows.js` on CI.
6. **iPhone:** `app/phone/signin.js` (`05`, sign-up `06`, recover), `app/phone/account.js` (the group), `app/phone/approve.js`
   (`04`: the three states of §3.2; the `airglow://tv` link handled in `bridge.js` with `App.addListener('appUrlOpen')`),
   `ios/` (the `airglow` URL scheme in `Info.plist`, the Keychain plugin), `tests/phone/flows.js` (sign-in, approve with
   a fake code on the same and on another network).
7. **Docs:** `CLAUDE.md`'s module list (`account/*`, `worker/`), `CONTEXT.md`'s story, `NEXT.md`'s open items (§11) and
   the Worker warning.

Order: 1 and 3 together (the crypto vectors first, then the Worker against them), then 4 (the owner's TV is the first
test), then 5, then 6 (AltStore builds take longest to get onto the phone), then 2's CI gates and 7.

---

## 10. Strings (new; everything else is the TV's)

TV: `Sign in on your phone`, `Your provider, add-ons and history come with it`, `Use airglow without an account`, `Scan
the code with your phone's camera, or open <host>/tv and type the letters below.`, `Sign in to your airglow account
there. No account yet? Make one at <host>/signup with your invite.`, `Tap Sign in the TV. This screen moves on by
itself.`, `The code works for 10 minutes`, `Waiting for your phone`, `Your provider login, Stremio add-ons, TMDB key,
Saved and history come to this TV by themselves, locked for it. Nothing else to sign in to.`, `Type email and
password`, `Back returns to the choices`, `The code ran out · here is a new one`, `Signed in as <name>`, `Your account,
unlocked on this TV`, `Putting them together`, `This TV already has things`, `It was used without an account. Keep
both, or make this TV match your account.`, `On this TV`, `In your account`, `the same provider`, `<n> not in your
account`, `Merge them`, `Recommended`, `Keeps everything. The same channel or title saved on both becomes one.`, `Use
only what's in my account`, `This TV's own <n> saved channels and <n> plays are removed. The provider stays: it's the
same one.`, `Asked once, on this TV only. Neither choice can be undone here, so your account keeps a copy of today's
state for 30 days.`, `Pick one to finish signing in`, `airglow account`, `Signed in`, `Synced <n> min ago`, `Provider
logins, Stremio add-ons, TMDB key, Saved, history, Home rows, your settings`, `Sync now`, `Last synced <day time> ·
offline`, `Devices`, `this TV`, `What syncs`, `Not this TV's picture, sound or player settings: those stay here`, `Sign
out of this TV`, `Your provider, add-ons and history leave this TV. Your account keeps them`, `Sign out everywhere`,
`Every device asks for your password or your phone again`, `Signed out everywhere from <device>`, `Signed out from
<device> · a sign-in token was reused`, `Recovery key: on your phone or PC`, `airglow's server didn't answer · trying
again in 2 min`, `Can't reach airglow's server right now. You can use airglow without an account and sign in later.`,
`This server asked for a weak key. Not signing in.`

Phone and Windows: `Sign in`, `Your provider login, Stremio add-ons, TMDB key, Saved and history come to this iPhone /
PC by themselves. No other sign-in.`, `Forgot it? Use your recovery key`, `Create an account with an invite`, `Invite code`, `Your password never leaves this iPhone: it unlocks everything here. airglow's server
keeps only locked copies it can't open.`, `That password doesn't open this account`, `Wait a minute and try again`,
`Create an account`, `1 · Account`, `2 · Recovery`, `3 · Provider`, `Your recovery key`, `If you forget your password,
this key is the only way back in. airglow can't read what it keeps for you, so it can't reset it. Write it down or
save it in Passwords.`, `Copy`, `Save to Files` / `Save as…`, `I've put it somewhere safe`, `Continue`, `You can see it
again later in Account › airglow account › Recovery key; your password unlocks it. A new key can be made there too,
which retires this one.`, `Skip for now`, `Sign in this TV?`, `<TV> · <code> · asked <n> s ago`, `Is this the code on
your TV? Only sign in a TV you're looking at. If someone sent you this link, tap Not now.`, `On the same network as this
iPhone`, `The last three letters on your TV`, `This iPhone isn't on the TV's network, so the letters make sure it's your
TV.`, `Make sure the code is the one on your TV.`, `This link doesn't match the
TV it names`, `It gets your`, `The TV signs in to nothing else: your provider, Stremio and TMDB logins come with it.`,
`Sign in the TV`, `Not now`, `Locked on this iPhone for that TV only. airglow's server passes it on without being able
to read it.`, `Sign in a TV`, `Change password`, `Also sign out my other devices`, `Your other devices keep working:
everything is locked with a key the password only unwraps.`, `Recovery key`, `Show it`, `Make a new one`, `Make a new
recovery key`, `What the server has`, `Your email, a locked copy of your key and locked records. Not your password,
your provider passwords, your history or your TMDB key in the clear`, `Invite a friend`, `Works once, for 7 days. A
friend gets their own account: nothing of yours is shared`, `New code`, `copied`, `<n> invites left this month. Open
sign-up is off: only invited people can make an account.`, `Undo`, `Undo changes since…`, `Restore`, `Rename`, `This
PC`, `Active now`, `Last seen <time>`, `signed in <day> with <phone's name> / with the password / with the recovery key`, `Some changes weren't synced · <n>
deletions wait for a confirm`, `Sync them`, `Undo them`, `<name> stays on the <device> it was pasted on`,
`Signing a device out removes your account's things from it the next time it is online; the device keeps working
without an account until then.`, `Changes made offline will be lost`, `Sign out of this PC`, `Your provider, add-ons
and history leave this PC; your account keeps them`, `Delete account`, `Everything on the server goes. Your devices
keep what they have, as if they had never signed in.`

The Worker's pages: `Sign in your TV`, `<TV> · <code> · asked <n> s ago`, `Open in airglow`, `The app signs the TV in
with one tap. No app on this phone? Sign in below.`, `or sign in here`, `TV code`, `Email`, `Password`, `Your password
stays in this browser: it unlocks the key your TV needs. The TV gets a locked copy only it can open.`, `Done · open airglow on your phone or PC`.

---

## 11. Open items (for the owner, and for after the TV test)

1. **`airglow://` in the QR itself.** If the iPhone camera offers to open a custom-scheme QR, encode
   `airglow://tv?code=…&k=…` and keep the printed https address for phones without the app; the sign-in then skips the
   page (three steps). Test on his iPhone; the page path stays as the fallback either way.
2. **The host.** The mocks show `acct.airglow.workers.dev` (worker `acct`, subdomain `airglow`); the real one is
   whatever subdomain the owner's Cloudflare account has. A short custom domain is one `routes` line in `wrangler.toml`
   when he buys one; the typed step reads better with it.
3. **The phone's in-app scanner.** `Sign in a TV` types the letters; a camera scanner needs the Capacitor barcode
   plugin, a build-size and AltStore question.
4. **Argon2id.** When all three WebViews are known to run a WASM Argon2id fast enough on the TV (a measurement on the
   Philips: 19 MiB / 2 / 1 should take under 2 s), the account's `kdf` moves and the clients' floor gains the Argon2id
   minimums; nothing else changes.
5. **Email, later.** New-device and recovery notices through Resend's free tier or Cloudflare's Email Sending; a
   verified-email flag would then gate open sign-up (with Turnstile on `/signup`).
6. **Passkeys.** A passkey can't derive `wk` (nothing to feed PBKDF2), so it would only replace the auth step; the PRF
   extension could one day wrap `dk`. Not for v1.
7. **`keyVersion` rotation** of `dk` (after a suspected compromise): re-encrypt every record under a new key, from one
   device, with the old key kept until every device has caught up.
8. **Selling the TV.** `Sign out of this TV` plus the factory-reset line in About.
9. **The three-letter step at home.** Whether the owner's network shows the TV and the phone to the Worker as the same
    address (IPv4 against IPv6 never matches): measured on his network in the first TV test; if it shows every time,
    the step is still right (it fails closed) and the words stay.
10. **Friends' sizes.** A 60,000-channel provider still syncs only its login (the catalog never syncs). The 8 MB cap is
   mostly plays over years; months fold into a yearly record after a year.
