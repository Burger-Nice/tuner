# airglow accounts and sync, v1: sign in on any screen, your things follow, the server can't read them

The owner asked for "the login thing so I can log in on different devices", then chose a real account system over a
GitHub-only one "if my friends want to use it". This is that system: **airglow accounts**, a few people now (him and
friends), each with their own provider, add-ons and history, built so it could grow into a product later without a
rewrite. Three apps share it (`app/tv/js`'s data modules are already common to the TV, the iPhone and the Windows app),
and one small server holds the locked copies: a Cloudflare Worker with D1, deployed by CI, on the free plan.

Mocks (`png/`, contact sheet `png/contact-sheet.png`; built by `tools/build.js`, rendered by `tools/render.js`): the TV
sign-in with the code and the QR (`01`), the TV's merge-or-replace question (`02`), Account › airglow account on the TV
(`03`), the iPhone approving a TV (`04`), the iPhone sign-in (`05`) and the recovery key at sign-up (`06`), the page the
Worker serves to a phone without the app (`07`), and the Windows Account page with the devices (`08`).

---

## 0. Decisions (each with its reason, in plain words)

1. **The TV signs in from your phone, with a code and a QR (RFC 8628's device flow).** The TV shows six letters and a
   QR; the phone app (or a web page the Worker serves) approves it. This is what Netflix (`netflix.com/tv8`, 8 digits
   and a QR), Plex (`plex.tv/link`, 4 characters), YouTube (`yt.be/activate`), Disney+ (`disneyplus.com/begin`) and
   Spotify (`spotify.com/pair`) all do, because typing an email and a password with a remote is the worst part of any
   TV app. Typing stays as the fallback (the TV keyboard exists already).
2. **The code is six letters from RFC 8628's base-20 alphabet** (`BCDFGHJKLMNPQRSTVWXZ`: no vowels, so no accidental
   words; no `0/O`, `1/I`), shown as `WDJ-BMH`, valid 10 minutes, dead after 5 wrong tries, the server's `/tv` page
   rate-limited per address. 20^6 = 64 million codes against a 10-minute window and a per-IP limit is far beyond
   what a guesser can reach; Plex gets away with 4. The QR carries the same link plus a hash of the TV's handover key
   (§5.5), so a scanned sign-in also proves the phone is talking to the TV it is looking at.
3. **End-to-end encryption, the password-manager way (Bitwarden / 1Password / Standard Notes), with WebCrypto only.**
   The password never leaves the device: PBKDF2-HMAC-SHA-256 (600,000 iterations, OWASP's floor, Bitwarden's default)
   makes a master key; HKDF splits it into a *wrapping key* (stays on the device) and an *auth key* (what the server
   sees). A random *data key* encrypts everything that syncs; the server stores it only wrapped. Argon2id would be a
   stronger KDF but WebCrypto has none; PBKDF2 runs natively on the TV's WebView, in Electron and in WKWebView, with no
   WASM to ship, and the account carries its KDF parameters so it can move to Argon2id later (Bitwarden's path).
4. **A recovery key, shown once at sign-up, is the only way back without the password.** The server can't reset what
   it can't read, so a reset by email would be a lie (Proton explains this best: a reset without a backup of the key
   loses the data). 1Password's Emergency Kit and Proton's recovery phrase are the same idea. The key is 20 characters
   (100 bits), unwraps a second copy of the data key, and can be shown again or replaced from Account with the
   password. Losing both password and key means a fresh account; that sentence is on the screen, not in a help page.
5. **A password change re-wraps the data key; the data stays as it is and other devices keep working.** Only the
   wrapping changes (Standard Notes and Bitwarden do the same), so there is no bulk re-encryption and the TV, which
   never knew the password, needs nothing. Signing other devices out is a choice on that screen, off by default: the
   owner changes a password on his laptop and doesn't want the TV to ask for his phone again.
6. **Each syncable thing is a record the client encrypts; the server stores blobs and a sequence number.** The server
   can't merge what it can't read, so merging is the client's job and the rules are per collection (§4.4): last write
   wins per item for settings and saved items, union for logs (plays, the shield's seen list) and lists keyed by id.
   This is the Standard Notes shape (items keys, `items_key_id`, sync by cursor) with the merge rules airglow's data
   already implies (`plays` is append-only; `nbaSeen` is `{ upTo, ids }`).
7. **Local first.** Every app keeps working exactly as today with the account offline: the local store stays the
   source of truth; sync is a push of changed records and a pull by cursor, on launch, every 15 minutes, on a change
   (debounced 5 s), and when the app comes back. A device that was used without an account and then signs in is
   asked once: merge or replace (§2.6), with a snapshot kept 30 days so a wrong answer is not fatal.
8. **The provider logins sync (encrypted), the TMDB key syncs, add-ons sync, the Stremio link syncs.** That is the whole
   point of "log in on different devices": the TV, the phone and the laptop should all know the provider. Per-device
   things do not sync: the TV's picture, sound, zap direction and player settings, the PC's window, tray and mpv
   settings, the phone's data saver. §4.2 lists both sides.
9. **Invite-only, no payments, soft limits.** The owner makes invite codes (Account › Friends); open sign-up is a Worker
   flag left off. Each account is separate: nothing is shared between friends. Limits (§4.6) keep the free plan free:
   10 devices, 25 MB of records, 5,000 records per account; the Worker's own 100,000 requests a day covers about 50
   people at airglow's sync rhythm with room to spare.
10. **No email is sent in v1.** With no reset-by-email (decision 4) and invite-only sign-up, there is nothing an email
    must carry; the email is a sign-in name. Cloudflare's Email Sending is paid-plan only and Resend's free tier is
    100 a day; both are a §9 hook for later (new-device notices), not a dependency now.
11. **A phone without the airglow app can still sign a TV in**, through `/tv` on the Worker (`07`): the page does the
    same unwrapping in the browser. This is the Bitwarden web-vault compromise: the page's JavaScript comes from the
    server you are trusting with ciphertext, so a malicious server could serve a bad page. The owner deploys that
    server from this repo through CI; the risk is stated in §8, and the phone app is the preferred approver.
12. **The server stores an HMAC of the auth key, not a slow hash.** Workers Free gives 10 ms of CPU per request;
    a server-side PBKDF2 would not fit. The auth key is already a 256-bit output of 600,000 client-side iterations, so
    guessing it offline is as hard as guessing the password through the client KDF; HMAC-SHA-256 with a server-side
    pepper (a Worker secret) and a per-account salt makes a stolen database useless without the pepper. Bitwarden's own
    server-side iterations were shown to add little for the same reason.
13. **Sessions: a short access token (1 h, HMAC-signed) and a rotating refresh token (90 days, stored hashed).** "Sign
    out everywhere" revokes every refresh token; the device wipes the account's things the next time it is online and
    is told. A device that stays offline keeps what it has (there is no way to reach it), and the Devices list says so.
14. **Everything that already exists keeps working without an account.** The TV's and the phone's provider sign-in
    stay the second door on the first screen (`Use airglow without an account`). An account can be added later from
    Account; the merge question (§2.6) handles the history that is already there.

---

## 1. Research (what was read, what it establishes, which decision it backs)

TV sign-in patterns
- RFC 8628, OAuth 2.0 Device Authorization Grant (summaries by [Janssen](https://docs.jans.io/stable/janssen-server/auth-server/oauth-features/device-grant),
  [Kinde](https://docs.kinde.com/authenticate/device-authorization-flow/overview/), [Deadbolt](https://deadbolt.readthedocs.io/en/latest/plugins/device-authorization/)):
  `device_code` / `user_code` / `verification_uri(_complete)` / `expires_in` / `interval` (5 s default), the errors
  `authorization_pending`, `slow_down`, `access_denied`, `expired_token`; §6.1's base-20 user-code alphabet; §5's
  warnings on brute force and remote phishing (the approver must be told what it is approving). → Decisions 1, 2; §2.3, §6.
- Netflix, [How to sign in to Netflix](https://help.netflix.com/en/node/311830241325668): an 8-digit code at `netflix.com/tv8`,
  a QR on TVs that show one, the TV signs in by itself. → the TV screen's shape (`01`).
- Plex, [Connect app to your Plex account](https://support.plex.tv/articles/203395277-connect-app-to-your-plex-account/):
  a 4-character code at `plex.tv/link`, a QR on some platforms, the app refreshes itself a few seconds later. → the
  waiting card that moves on by itself.
- Spotify, [Spotify on TV](https://support.spotify.com/ng/article/spotify-on-tv/): "Log in with PIN" at `spotify.com/pair`.
  YouTube `yt.be/activate` and Disney+ `disneyplus.com/begin` (third-party guides only; the pattern is the same:
  code on the TV, sign in on the phone, enter the code). → Decision 1.

End-to-end encrypted sync with recovery
- Bitwarden, [Encryption key derivation](https://bitwarden.com/help/kdf-algorithms/) and the
  [security white paper](https://bitwarden.com/help/bitwarden-security-white-paper/): PBKDF2-SHA256 600,000 iterations
  (the floor since 2026.2.1), HKDF stretching of the master key, a protected symmetric key wrapped with it, Argon2id
  as the alternative, the KDF change re-wrapping the key. → Decisions 3, 5; §5.
- Bitwarden server-side iterations ([Palant, 2023](https://palant.info/2023/01/23/bitwarden-design-flaw-server-side-iterations/)):
  server-side PBKDF2 of the auth hash adds little; the client-side KDF is the defence. → Decision 12.
- Bitwarden, [Forgot master password](https://bitwarden.com/help/forgot-master-password) and
  [Emergency access](https://bitwarden.com/help/emergency-access/): zero knowledge means no reset; the ways out are a
  trusted contact's takeover or an emergency sheet. → Decision 4 (airglow picks a recovery key over a trusted contact:
  simpler for a few friends, and 1Password's and Proton's answer).
- 1Password, [About PBKDF2](https://support.1password.com/pbkdf2/) and the
  [security design changelog](https://agilebits.github.io/security-design/changelog.html): 650,000 iterations since
  2023, HKDF-derived salts, the Secret Key as a second high-entropy secret (2SKD). → §5.2's HKDF salting; the recovery
  key as a high-entropy secret that needs no slow KDF.
- Standard Notes, [protocol 004](https://raw.githubusercontent.com/standardnotes/app/main/packages/snjs/specification.md):
  Argon2id 64 MiB / 5 / 1 → 512 bits split into a master key and a server password; items keys as items encrypted
  with the master key; a password change re-encrypts only the items keys. → Decisions 5, 6; §4.3.
- Proton, [Data recovery and end-to-end encryption](https://proton.me/blog/data-recovery-end-to-end-encryption): a
  reset without a backup of the key loses the data; the recovery phrase is a second password that unlocks a copy of the
  key. → Decision 4 and the words on screen (`06`).
- OWASP, [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html):
  Argon2id 19 MiB / 2 / 1 preferred; PBKDF2-HMAC-SHA-256 at 600,000 when FIPS or availability demand it. → Decision 3.
- WebCrypto has no Argon2 ([WICG proposal](https://github.com/WICG/proposals/issues/59); WASM options
  [hash-wasm](https://mojoauth.com/security-guides/argon2-in-javascript-in-browser.md), [openpgpjs/argon2id](https://www.github.com/openpgpjs/argon2id)).
  → Decision 3's PBKDF2 now, parameters stored per account for Argon2id later.
- Android: Jetpack Security's `EncryptedSharedPreferences` is deprecated
  ([Include Security](https://blog.includesecurity.com/2026/08/encryptedsharedpreferences-is-dead-heres-what-you-should-use-instead/),
  [ProAndroidDev](https://proandroiddev.com/goodbye-encryptedsharedpreferences-a-2026-migration-guide-4b819b4a537a)); a
  Keystore-held AES key wrapping the app's secret is the recommended shape. → §5.7 (where the data key rests on the TV).

Cloudflare Workers + D1
- Workers limits ([limits](https://developers.cloudflare.com/workers/platform/limits/), [pricing](https://developers.cloudflare.com/workers/platform/pricing/)):
  Free = 100,000 requests a day (1,000 a minute burst), 10 ms CPU per request, 5 cron triggers, static assets free and
  unmetered. → Decisions 9, 12; §7.
- D1 ([limits](https://developers.cloudflare.com/d1/platform/limits), [pricing](https://developers.cloudflare.com/d1/platform/pricing/),
  [free-tier enforcement from 1 Sep 2026](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)):
  Free = 5 million rows read and 100,000 rows written a day, 5 GB in all, 10 databases of 500 MB; over the limit,
  queries fail until 00:00 UTC. → §4.6 (airglow writes one row per changed record, not per play).
- Workers Web Crypto ([docs](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)): PBKDF2, HKDF,
  AES-GCM, ECDH P-256 supported; `crypto.subtle.timingSafeEqual` for comparing hashes. → §6.
- [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/): `limit({ key })`
  with a 10 or 60 s period, free, "permissive, eventually consistent" (a loose filter, so §6.5 adds per-code counters in D1).
- [Static Assets](https://developers.cloudflare.com/workers/static-assets/): the `/tv`, `/signup` and `/recover`
  pages are files beside the Worker, served without running it; `run_worker_first` for `/v1/*`.
- [cloudflare/wrangler-action](https://github.com/cloudflare/wrangler-action) (v4; `apiToken`, `accountId`, `command`,
  `workingDirectory`, `secrets`): `d1 migrations apply` then `deploy`. → §7.
- Email, for later: [Cloudflare Email Sending](https://developers.cloudflare.com/changelog/post/2026-04-16-email-sending-public-beta/)
  (public beta, paid plan), [Resend free tier](https://resend.com/blog/new-free-tier) (3,000 a month, 100 a day). → Decision 10.
- [Turnstile](https://developers.cloudflare.com/turnstile/plans/): free up to 20 widgets. Not used in v1 (invite-only
  sign-up needs no bot wall); the `/signup` page gets it when open sign-up is switched on.

Where this departs from the models and why: Bitwarden and 1Password authenticate with SRP or a server-side slow hash;
airglow sends an HKDF-derived auth key over TLS and stores its HMAC (decision 12), because the Worker has 10 ms and the
auth key is not a password. Standard Notes has no recovery key; airglow adds one (decision 4). The device flow's
approver also carries a key (§5.5), which RFC 8628 never needed because OAuth servers hold the secrets; airglow's
can't, so the approver wraps the data key for the TV itself.

---

## 2. The flows

### 2.1 First run (every app)

The first screen has two doors and keeps the old one:

- TV (`screens/first.js` Welcome, revised): the lockup, `Sign in on your phone` (primary, entry focus), `Use airglow
  without an account` (secondary: today's `Type it here` / `Load an M3U link` path, unchanged), and the saved accounts
  row as now.
- iPhone (`05`) and Windows: the lockup and one line; the `Sign in` card (email, password with Show, `Sign in`, `Forgot
  it? Use your recovery key`); then `Create an account with an invite` and `Use airglow without an account`.
- After a sign-in, the three quick choices (team, shield, languages) are skipped when the account already has them;
  Home opens as soon as the provider's channels are in, as today.

### 2.2 Sign-up (iPhone, Windows, or the Worker's `/signup` page; never the TV)

1. **Account:** the invite code (from the link, or typed), email, password (12 characters or more; a strength line, no
   rules beyond length), `Continue`. The device makes the master key, the wrapping key and the auth key (§5.2), a random
   data key and a random recovery key, wraps the data key twice (§5.3), and calls `POST /v1/signup`.
2. **Recovery key (`06`):** the 20 characters in five groups, `Copy`, `Save to Files` (iOS share sheet; `Save as…` on
   Windows: a text file "airglow recovery key.txt" with the email and the date), the tick `I've put it somewhere safe`
   (Continue is dim until it is ticked), the line where to see it again. Shown once in the flow; later from Account
   with the password.
3. **Provider:** today's provider card (Xtream or M3U), or `Skip for now` (an account with no provider still syncs
   add-ons, Saved and settings; Home says what's missing).

### 2.3 Signing a TV in (`01` → `04`/`07` → `02` if needed → Home)

1. The TV calls `POST /v1/device/code` with its name ("Philips TV"; the Android model when it has no better name),
   its kind and a fresh ECDH P-256 public key (§5.5). It gets `user_code` (6 letters), `device_code` (random, 32 bytes,
   never shown), `expires_in` 600, `interval` 5, and draws `01`: the three steps, the letters, the QR with
   `https://<host>/tv/WDJBMH#k=<key-hash-8>`, the waiting card, `Type email and password` as the secondary button.
2. The TV polls `POST /v1/device/token` every 5 s (`slow_down` adds 5 s). `authorization_pending` keeps the card;
   `expired_token` redraws with a new code and a one-line note; `access_denied` ("Not now" on the phone) goes back to
   the choices.
3. On the phone, the QR opens `airglow://tv?code=WDJBMH&k=…` when the app is installed (a custom scheme: AltStore
   builds can't carry the associated-domains entitlement Universal Links need; the `/tv` page shows `Open it instead`
   for the same link), else the Worker's `/tv` page (`07`). Either shows the TV's name, the code and the check that the
   key hash in the link matches the key the server reports (`It's the TV you scanned`), what the TV will get, `Sign in
   the TV` and `Not now`. The app wraps the data key for the TV's public key (§5.5) and calls `POST /v1/device/approve`.
4. The TV's next poll returns the tokens and the wrapped key; the TV unwraps it, keeps the data key (§5.7), pulls the
   account's records, and shows `Signed in as Birgir` with the verifying rows (`02`'s background). If this TV already
   has things from life without an account, the merge question (§2.6) comes first. Home opens when the provider's
   channels are in.

Steps for the person: OK on the TV, scan, tap `Sign in the TV`. Three, two of them on the phone; under 60 s.

### 2.4 Signing in on the iPhone or Windows (`05`)

`POST /v1/prelogin { email }` returns the KDF parameters (for an unknown email, default parameters and a fake salt
derived from the email, so the answer doesn't say whether the account exists). The device derives the keys, calls
`POST /v1/login { email, authKey, device }`, unwraps the data key with its wrapping key, keeps it (§5.7), pulls the
records, merges with what is local (§2.6 if there is anything), and opens Home. A wrong password is the neutral
sentence under the field (`That password doesn't open this account`); five wrong in 10 minutes and the server
answers `slow_down` for the address, shown as `Wait a minute and try again`.

### 2.5 Sign-out

- `Sign out of this device` (TV `03`, phone, Windows): revokes this device's refresh token, wipes the account's data key
  and the synced records from the device, leaves the device as it was before the account (the local-only provider, if
  any, stays; if the provider came from the account, the first screen comes back).
- `Sign out everywhere` (every app; a confirm with the password on the phone and Windows, the TV only confirms): revokes
  all refresh tokens; every device wipes on its next contact and shows the first screen with `Signed out everywhere
  from <device name>` once. Offline devices keep what they hold until they come online, which the Devices list says
  (`08`'s foot).
- `Devices` lists each device (name, kind, how it signed in: *with your phone* or *with the password*, when, last seen,
  what it is watching if it says so) with `Sign out` per device and `Rename` on this one.

### 2.6 First sign-in on a device that already has things (`02`)

Asked once per device, only when the device has local data for a provider that is not already in the account or has
local plays / Saved / add-ons. Two choices:

- **Merge them** (recommended, focused): union by the rules of §4.4; duplicate providers (same server + user) become one;
  the device's plays go in with their timestamps; Saved is unioned, the account's order first.
- **Use my account's only**: the device's own records are dropped and the account's pulled. The provider stays if it is
  the same one.

Before either, the device uploads a **snapshot**: one encrypted record (`snapshot:<deviceId>:<date>`) holding the
device's local state, kept 30 days and listed under Account › Sync › Snapshots (`08`), restorable from any device
(`Restore` re-runs the merge with it). The foot says both.

### 2.7 Password change (iPhone, Windows; the TV never knows the password)

Asks for the current password and the new one twice. The device derives the new keys, re-wraps the data key with the
new wrapping key, and calls `POST /v1/password` with the old auth key, the new auth key, the new KDF parameters and
the new wrapped key. A tick `Also sign out my other devices` (off) revokes the other refresh tokens. Nothing is
re-encrypted. The recovery-wrapped copy stays valid (it wraps the same data key).

### 2.8 Forgot the password: the recovery key

`Forgot it? Use your recovery key` → email, the 20 characters, a new password twice. The device HKDFs the recovery key
into the recovery wrapping key and the recovery auth key (§5.3), unwraps the data key, derives the new password keys,
re-wraps, and calls `POST /v1/recover` with the recovery auth key as the proof. The server swaps the credentials,
revokes every refresh token (a recovery is a reason to) and keeps the recovery-wrapped copy. Five wrong keys in an hour
lock recovery for that account for an hour (and the Devices list gets a line `Recovery attempted · Tue 20:12`).

### 2.9 Recovery key, later

Account › Security › `Recovery key` (`08`): `Show it` (the password first; shown for 60 s with Copy / Save) and `Make a
new one` (a new random key, the data key re-wrapped under it, `POST /v1/recovery-key`; the old key stops working the
moment the server has the new wrap).

### 2.10 Invites and friends

Account › Friends › `Invite a friend` (`08`): a code `AIRGLOW-KX7R-M2PQ` (16 random bits per block from the same
base-20 set, prefixed so it reads as what it is) with `Copy`, `New code`; each code works once, for 7 days; the owner
has 10 a month (a Worker var). A friend opens the app, `Create an account with an invite`, types it (or opens
`https://<host>/signup?invite=…`). The friend's account is separate in every way; the owner's Devices and Friends
lists never show the friend's things, only that the invite was used (`used by a friend on 2 Nov`).

### 2.11 Delete account

Account › `Delete account`: the password, then the sentence `Everything on the server goes. Your devices keep what they
have, as if they had never signed in.` → `DELETE /v1/account`. D1 rows go at once; the audit row stays 30 days with the
email hashed.

---

## 3. Where it lives in each app, and the words

### 3.1 TV (`01`, `02`, `03`)

- **First run:** Welcome gains `Sign in on your phone` (primary) above today's path. `01` is the code screen:
  `Sign in on your phone`; the steps `Scan the code with your phone's camera, or open <host>/tv and type the letters
  below.` / `Sign in to your airglow account there. No account yet? Make one with your invite.` / `Tap Sign in the TV.
  This screen moves on by itself.`; the six letters (50 x 60 boxes, Outfit 700 34, a dash between the triplets); the QR
  (200 px in the 12 px chalk box, `qr.js`); the caption `<host>/tv/WDJBMH` and `The code works for 10 minutes`; the
  card `Waiting for your phone` with the one line about encryption and `Type email and password` (`btn2 sm`, the only
  focusable thing; OK opens today's field screen with Email and Password instead of the provider fields); the hint
  `Back returns to the choices`. Safe area kept: the card ends at y 484, the hint at 510.
- **The merge question (`02`):** a centred `menu` (640 wide) over the verifying screen, scrim behind: title, one line,
  the two columns `On this TV` / `In your account` (provider, saved channels, plays, add-ons, with the small notes
  `the same provider`, `14 not in your account`), the two rows (`Merge them` with the RECOMMENDED tag, focused; `Use my
  account's only`), the foot about the 30-day copy. Back does nothing here (the question has to be answered; the TV
  can't sign out of a half-merged state); Left/Right do nothing; Up/Down move between the two rows.
- **Account (`03`):** a new first group `airglow account`: `Birgir` / the email / `Signed in` (OK opens Devices);
  `Synced 2 min ago` / what syncs / `Sync now ›`; `Devices` / this TV named / `3 ›` (a right sheet listing the devices,
  OK on one offers `Sign out <name>`); `What syncs` / `Not this TV's picture, sound or player settings: those stay here`
  / `See ›` (a sheet with §4.2's two lists); `Sign out of this TV`; `Sign out everywhere` (a confirm menu: `Every device
  asks for your password or your phone again. The TV keeps working without an account.` / `Sign out everywhere` /
  `Cancel`). Not signed in: the group shows one row `Sign in on your phone ›` and the sub `Your provider, add-ons, Saved
  and history on every screen you own`. The avatar in the top bar shows the account's initial when signed in (it shows
  the icon today).
- The password is never typed on the TV except in the fallback; the recovery key, the password change and invites are
  phone and Windows things (`Recovery key: on your phone or PC` as a dim row, so the TV says where).

### 3.2 iPhone (`04`, `05`, `06`)

- **Sign in (`05`):** the first-run page described in §2.1; the fields carry the attributes the phone sign-in already
  uses (no capitals, no autocorrect, Passwords can fill them; `autocomplete="username"` / `"current-password"` so iOS
  offers to save the pair; `"new-password"` at sign-up).
- **Create an account (`06`):** three step chips (`1 · Account`, `2 · Recovery`, `3 · Provider`), the recovery-key card.
- **Approving a TV (`04`):** a bottom sheet over whatever was on screen (the app was opened by the link; if the app was
  not signed in, the sign-in card comes first and the sheet after): the TV icon, `Sign in this TV?`, `Philips TV · code
  WDJ-BMH · asked 20 s ago`, the tick line `It's the TV you scanned, and the TV is on your Wi-Fi. Only sign in a TV
  you're looking at.` (the Wi-Fi half only when the Worker saw both requests from the same public address; otherwise
  the line is `It's the TV you scanned. Only sign in a TV you're looking at.`; a typed code without the key hash gets
  `Make sure the code is the one on your TV.` with no tick), `IT GETS YOUR` chips, `Sign in the TV`, `Not now`, the
  note about where the lock lives. Also reachable by hand: Account › airglow account › `Sign in a TV` (the camera, or
  type the letters).
- **Account:** the group `airglow account` at the top of the pushed Account page: the email with `Signed in`; `Devices`;
  `Sign in a TV`; `Recovery key`; `Change password`; `Invite a friend`; `What syncs`; `Sign out`. The avatar on the tabs
  shows the initial.

### 3.3 Windows (`08`)

Account › `airglow account` as the first group of the two-pane page: the header line (`Birgir · email · synced just
now`); two columns of grouped rows: **Devices** (`3 of 10`; each device: icon, name, `This PC` tag, how and when it
signed in, what it is watching, `Active now` (ok dot) or `Last seen 18:41`, `Sign out` / `Rename`; the foot explaining
sign-out and sign-out-everywhere), **Friends** (`Invite a friend` with the code field, `copied`, `New code`; the foot
`3 invites left this month. Open sign-up is off`), the unnamed group (`Sign out of this PC`, `Delete account`);
**Security** (`Change password`, `Recovery key · Set · 28 Oct`, `What the server has`), **Sync** (`Synced just now` with
the list of what syncs and the `not this PC's player, window or tray settings` line, `Sync now`; `Snapshots · 1 from
Tue 28 Oct`). The sidebar's Account item reads `Account · synced` (or `· offline`, `· sign in`).

### 3.4 The Worker's pages (`07`)

Static files beside the Worker, in the brand (the TV's tokens and fonts, `phone.css`'s field and pill): `/tv` (the code,
filled from the link; email; password; `Sign in the TV`; the note; `Have the airglow app? Open it instead`), `/signup`
(the invite, email, password, then the recovery key page, then `Done · open airglow on your phone or PC`), `/recover`
(email, the recovery key, a new password). No account page on the web in v1: devices, invites and the rest are in the
apps.

### 3.5 States every screen shares

- Offline: the TV's Offline bar and the apps' equivalents already exist; the account rows say `Last synced Tue 20:41 ·
  offline` and `Sync now` is dim. Nothing else changes: local first.
- The server is down or answers 5xx: `airglow's server didn't answer · trying again in 2 min` on the Sync row; sign-in
  screens show `Can't reach airglow's server right now. You can use airglow without an account and sign in later.`
- A device was signed out from elsewhere: on the next contact the app wipes the account's things and shows the first
  screen with the one-time line `Signed out everywhere from Laptop`.
- Sync conflict (a record changed on two devices between syncs): merged by §4.4, never asked. The only question ever
  asked is §2.6's, once.
- Errors are neutral (icon + sentence), never red; red stays LIVE's.

---

## 4. The sync model

### 4.1 Records

A record is `{ col, id, ver, iv, blob, deleted, seq }`: the collection name and the item id in the clear (they are
short labels, never content: `providers`, `p:line.provider.tv:birgir` is a hash, see §5.6), a version counter, the
AES-GCM IV, the ciphertext, a deleted flag, and the server's sequence number. The plaintext is JSON. Records are at
most 64 KB; logs are chunked so none grows past that (`plays:2026-10`).

### 4.2 What syncs (and what doesn't)

| Collection | Record(s) | From | Merge rule (§4.4) |
|---|---|---|---|
| `providers` | one per provider login: `{ type, server, username, password, url, name, tz }` (the M3U text never; a large M3U is re-downloaded from its `url`) | `store 'accounts'`, `session.js` | union by key; last write per record |
| `keys` | `tmdb` `{ key }`; `stremio` `{ authKey, email, keep }`; `opensubs` later | `tmdb.js`, `addons.js` `scoped('stremio')` | last write |
| `addons` | one per add-on `{ key, url, manifest-less: name, from, on, catalogs, order }` (the manifest is re-fetched) | `addons.js` list | union by key; last write per record; order = the newest `order` list |
| `favs` | one per saved item `{ kind, item }` plus `favOrder` `{ keys }` | `state.js` favs / favOrder | union; last write per item; order merged by the newest list with unknown keys appended |
| `progress` | one per item `{ t, d, at, item }` | `state.js` progress | newest `at` wins |
| `plays` | one record per month `{ plays: [...] }` | `rows.js` plays (IndexedDB) | union by `(imdb, season, episode, at)`; sorted by `at`; the 2,000 cap per device stays local |
| `rows` | `picks`, `hiddenRows`, `rowsOff`, `notInterested`, `rowStats` | `rows.js` | last write per record (`notInterested` union by key with the later expiry) |
| `shield` | `nbaSeen` `{ upTo, ids }` | `games.js` SEEN | `upTo` = max; `ids` = union, pruned by the auto-seen window |
| `settings` | one record of the shared keys: `nbaTeam`, `shield`, `langs`, `subLang`, `replaysPlay`, `skipIntro`, `heroGame`, `gameNight`, `scoreBug`, `liveAlert` | `core.js` settings | last write per key (the record carries per-key timestamps) |
| `snapshots` | `snapshot:<device>:<date>` (§2.6) | the merge step | never merged; listed |
| `devices-meta` | `{ name }` per device, written by the device | Account | last write |

Stays on the device: `liveFormat`, `ua`, `scale`, `player`, `sounds`, `zapUp`, `previews`, `setupDone`, the TV's
picture and frame-rate settings, the catch-up delays and `teamCh` per channel (channel ids differ by provider copy;
they travel with the provider record only when both devices use the same one, as `providers.<id>.delays`), the PC's
Windows group, the phone's data saver and PiP, the guide and catalog caches, the subtitle files index, the probe budget.

### 4.3 Keys and encryption of records

One data key per account (`dk`, 32 bytes). Each record: AES-256-GCM with a fresh 12-byte IV and additional data
`accountId/col/id/ver` so a record can't be swapped for another or rolled back without the client noticing. (Standard
Notes gives each item its own key under an items key; airglow's records are small and few, one key is enough, and a
key rotation is a future `keyVersion` on the record.)

### 4.4 Merge rules, the client's

Pull first (`GET /v1/sync?since=<seq>`), apply each incoming record to the local store by its collection's rule,
then push the local records whose `dirty` flag is set. A push answers `conflict` for a record whose server `ver` moved
since the base the client holds; the client re-reads that record, merges, bumps `ver` and pushes again (compare-and-
set). The rules: *last write* uses the record's `at` inside the plaintext (device clocks; a skew of up to a day is
harmless for settings); *union* never loses an element; *newest list* for orders. Deletes are tombstones (`deleted`,
blob empty) kept 90 days.

### 4.5 When

On launch (after Home is drawn, never before: the launch budget stays), every 15 minutes while the app is open, 5 s
after a change (debounced), on return from background, and on `Sync now`. The TV's poll in the player is suspended
(nothing to sync while a stream plays; the play log is written at the end anyway).

### 4.6 Limits (and the free plan's arithmetic)

Per account: 10 devices, 5,000 records, 25 MB, 2,000 sync pushes a day. Per request: 200 records, 1 MB. The Worker:
50 people × (a few launches + 96 timer pulls + ~20 pushes) ≈ 7,000 requests a day against 100,000; TV sign-ins poll
120 times at most each. D1: a pull is one indexed read per changed record, a push one write per record; well under
5 M / 100 k. A `plays` month record is rewritten on each push (one row), which is why plays are chunked by month and
pushed debounced, not per play.

---

## 5. The encryption, in plain words and then exactly

**Plain words.** Your password is turned into a key on your own device, slowly, so guessing is expensive. That key
never leaves the device. A second, random key locks all your things; the server keeps that second key only inside a
box the first key opens, and keeps your things only in boxes the second key opens. The server can check it's you
(it gets a different key made from the same password, and keeps a scrambled fingerprint of it), but it can't open
anything. A TV never gets your password: your phone puts the second key in a box only that TV can open, and the server
passes the box along. Your recovery key is a spare, random first key: it opens its own copy of the box with the
second key in it, so forgetting the password doesn't lose your things, as long as you kept the spare. If both are gone,
so are the things; nobody, including us, can get them back.

### 5.1 Names

- `pw` the password (NFKC-normalised, trimmed); `email` lowercased.
- `salt` 16 random bytes made at sign-up, stored on the server in the clear (random, not the email: changing the email
  costs nothing).
- `mk` master key, 32 bytes; `wk` wrapping key; `ak` auth key; `dk` data key; `rk` recovery key; `rwk` / `rak` the
  recovery wrapping and auth keys.

### 5.2 From the password

```
mk  = PBKDF2-HMAC-SHA-256(pw, salt, iterations = 600000, 256 bits)      // WebCrypto deriveBits
wk  = HKDF-SHA-256(ikm = mk, salt = "", info = "airglow/v1/wrap", 256 bits)
ak  = HKDF-SHA-256(ikm = mk, salt = "", info = "airglow/v1/auth", 256 bits)
```
The account record carries `kdf = { alg: "pbkdf2-sha256", iterations: 600000, salt }` so a later Argon2id (`alg:
"argon2id", m, t, p`) or a higher count re-derives on the next sign-in and re-wraps (§2.7's path, without a new
password). Target: about 1 s on the iPhone, 2 to 4 s on the TV's SoC in the typed fallback (the TV's normal path never
derives anything).

### 5.3 The data key and its wraps

```
dk   = random 32 bytes
wrap = AES-256-GCM(key = wk, iv = random 12, aad = "airglow/v1/dk", plaintext = dk)       -> wrappedKey {iv, ct}
rk   = random 100 bits, shown as 20 Crockford base-32 characters in five groups (no I, L, O, U; case-free)
rwk  = HKDF-SHA-256(ikm = rk, salt = salt, info = "airglow/v1/recovery-wrap", 256 bits)
rak  = HKDF-SHA-256(ikm = rk, salt = salt, info = "airglow/v1/recovery-auth", 256 bits)
rwrap = AES-256-GCM(key = rwk, iv, aad = "airglow/v1/dk", dk)                             -> recoveryWrappedKey
```
`rk` is random and 100 bits, so no slow KDF is needed on it (1Password's Secret Key reasoning). The server stores
`wrappedKey`, `recoveryWrappedKey`, and the HMACs of `ak` and `rak` (§5.4).

### 5.4 What the server keeps to check it's you

```
authSalt = random 16 bytes per account
authHash = HMAC-SHA-256(key = PEPPER, data = authSalt || ak)       // PEPPER: a Worker secret, 32 bytes
```
Compared with `timingSafeEqual`. A stolen D1 export has HMACs without the pepper, wrapped keys without `wk`, and blobs
without `dk`. The pepper lives only in the Worker's secrets (set by CI from a repository secret, §7).

### 5.5 Handing the data key to a TV

```
TV:     (tvPriv, tvPub) = ECDH P-256 keypair, fresh per code; kh = SHA-256(tvPub)[0..8] hex, in the QR link (#k=)
Phone:  (ePriv, ePub) = ephemeral ECDH P-256
        shared = ECDH(ePriv, tvPub)
        hk = HKDF-SHA-256(ikm = shared, salt = user_code, info = "airglow/v1/handover", 256 bits)
        box = AES-256-GCM(key = hk, iv, aad = device_code_id, dk)   -> { ePub, iv, ct }
TV:     shared = ECDH(tvPriv, ePub); hk as above; dk = open(box)
```
The phone checks `SHA-256(tvPub)` against `#k=` from the QR before it wraps (the `It's the TV you scanned` tick). A
code typed by hand has no hash, so the phone trusts the server's copy of `tvPub` for it and says so (§3.2). The Worker
sees `tvPub`, `ePub` and the box; without `tvPriv` the box is noise.

### 5.6 Record ids

Ids must not leak content: `id = base64url(HMAC-SHA-256(key = HKDF(mk… info "airglow/v1/ids"), data = natural key))[0..22]`
for providers (`type|server|username`), add-ons (manifest url), favs (`keyOf(item)`), progress (`keyOf(item)`).
Collections, months (`plays:2026-10`) and setting names are not secrets.

### 5.7 Where keys rest on each device

- iPhone: `dk` and the refresh token in the Keychain (Capacitor's secure storage plugin; `kSecAttrAccessibleAfter
  FirstUnlock`), never in localStorage. `wk` is dropped after the sign-in; `mk` never stored.
- Windows: Electron's `safeStorage` (DPAPI) for `dk` and the refresh token, in `userData`.
- TV: a new plugin method `secret.set/get` in `TunerPlayerPlugin`: an AES key in the Android Keystore wraps `dk` and the
  refresh token, the wrapped bytes in the app's private files (the Jetpack `EncryptedSharedPreferences` is deprecated;
  this is the shape its replacements use). The WebView gets `dk` through the bridge at launch, into memory only.
- The web pages (`/tv`, `/signup`, `/recover`): memory only, the tab closed when done.

### 5.8 Tokens

Access token: 1 hour, HMAC-SHA-256-signed compact JSON `{ sub, dev, exp }` (a Worker secret `TOKEN_SECRET`); refresh
token: 32 random bytes, stored as SHA-256 in `devices.refresh_hash`, rotated on every use, 90 days idle. The TV's
device flow issues the same pair.

---

## 6. The Worker: API and schema

`worker/` in the repo: `wrangler.toml`, `src/index.js` (a plain `fetch` router, no framework), `src/auth.js`,
`src/sync.js`, `src/device.js`, `migrations/0001_init.sql`, `pages/` (the static `/tv`, `/signup`, `/recover`,
`/.well-known/`), `test/` (Miniflare / `wrangler dev` tests run in CI).

### 6.1 Endpoints (JSON; `Authorization: Bearer <access>` where marked)

| Method and path | Body → answer | Notes |
|---|---|---|
| `POST /v1/prelogin` | `{ email }` → `{ kdf }` | default kdf + a fake salt `HMAC(PEPPER, email)` for unknown emails |
| `POST /v1/signup` | `{ invite, email, kdf, authKey, wrappedKey, recoveryWrappedKey, recoveryAuthKey, device }` → `{ account, access, refresh }` | 409 if the email exists; 403 bad invite; rate 5/h per IP |
| `POST /v1/login` | `{ email, authKey, device: { name, kind, platform } }` → `{ access, refresh, wrappedKey, kdf, keyVersion, deviceId }` | 401 one neutral error; 5 fails / 10 min per account and per IP → `slow_down` |
| `POST /v1/token` | `{ refresh }` → `{ access, refresh }` | rotation; a reused old refresh token revokes the device (theft signal) |
| `POST /v1/logout` (auth) | → 204 | this device |
| `POST /v1/logout-all` (auth) | `{ authKey }` (phone/PC) or none from a TV → 204 | every device; the audit row |
| `GET /v1/devices` (auth) | → `{ devices: [{ id, name, kind, platform, how, createdAt, lastSeen, now, this }] }` | |
| `PATCH /v1/devices/:id` (auth) | `{ name }` → 204 | rename |
| `DELETE /v1/devices/:id` (auth) | → 204 | sign that one out |
| `POST /v1/password` (auth) | `{ authKey, newAuthKey, kdf, wrappedKey, signOutOthers }` → `{ keyVersion }` | |
| `POST /v1/recovery-key` (auth) | `{ authKey, recoveryWrappedKey, recoveryAuthKey }` → 204 | a new key |
| `POST /v1/recover` | `{ email, recoveryAuthKey, newAuthKey, kdf, wrappedKey }` → `{ access, refresh }` | revokes all; 5/h per account |
| `POST /v1/device/code` | `{ name, kind, pub }` → `{ device_code, user_code, verification_uri, verification_uri_complete, expires_in: 600, interval: 5 }` | 20/h per IP |
| `POST /v1/device/token` | `{ device_code }` → `authorization_pending` / `slow_down` / `expired_token` / `access_denied` / `{ access, refresh, box, keyVersion, deviceId }` | the TV polls |
| `GET /v1/device/:user_code` (auth) | → `{ name, kind, pub, askedAt, sameAddress }` | the approver looks the code up; 5 wrong codes per IP per 10 min, the code dies after 5 wrong lookups |
| `POST /v1/device/approve` (auth) | `{ user_code, box }` → 204 | binds the code to the account; `box` from §5.5 |
| `POST /v1/device/deny` (auth) | `{ user_code }` → 204 | "Not now" |
| `GET /v1/sync?since=<seq>&limit=200` (auth) | → `{ records, seq, more }` | indexed by `(account, seq)` |
| `POST /v1/sync` (auth) | `{ records: [{ col, id, baseVer, ver, iv, blob, deleted }] }` → `{ ok: [...], conflict: [{ col, id, ver, iv, blob }], seq }` | CAS per record; limits of §4.6 |
| `GET /v1/invites` (auth, owner) / `POST /v1/invites` (auth, owner) | → `{ code, expiresAt }` | `OWNER_EMAILS` var; 10/month |
| `DELETE /v1/account` (auth) | `{ authKey }` → 204 | |
| `GET /v1/health` | → `{ ok, version }` | CI's smoke test |

Errors are `{ error: "code", message }` with the codes above; the apps map codes to the sentences of §10, never show
`message` raw.

### 6.2 D1 schema (`migrations/0001_init.sql`)

```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL,
  kdf_alg TEXT NOT NULL, kdf_iter INTEGER NOT NULL, kdf_salt BLOB NOT NULL,
  auth_salt BLOB NOT NULL, auth_hash BLOB NOT NULL,
  wrapped_key TEXT NOT NULL, recovery_wrapped_key TEXT, recovery_auth_hash BLOB, recovery_set_at INTEGER,
  key_version INTEGER NOT NULL DEFAULT 1, seq INTEGER NOT NULL DEFAULT 0,
  record_count INTEGER NOT NULL DEFAULT 0, bytes INTEGER NOT NULL DEFAULT 0, is_owner INTEGER NOT NULL DEFAULT 0 );
CREATE TABLE devices (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL, kind TEXT NOT NULL, platform TEXT, how TEXT NOT NULL,          -- how: password | phone | recovery
  created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL, refresh_hash BLOB, refresh_rotated_at INTEGER,
  revoked_at INTEGER, now_playing TEXT );
CREATE INDEX devices_account ON devices(account_id);
CREATE TABLE device_codes (
  device_code_hash BLOB PRIMARY KEY, user_code TEXT NOT NULL UNIQUE, tv_name TEXT NOT NULL, tv_kind TEXT NOT NULL,
  tv_pub TEXT NOT NULL, tv_ip_hash BLOB, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',          -- pending | approved | denied | used | expired
  account_id TEXT, box TEXT, approved_by_device TEXT, last_poll INTEGER, wrong_lookups INTEGER NOT NULL DEFAULT 0 );
CREATE TABLE records (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, col TEXT NOT NULL, id TEXT NOT NULL,
  ver INTEGER NOT NULL, iv TEXT NOT NULL, blob TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0,
  seq INTEGER NOT NULL, updated_at INTEGER NOT NULL, by_device TEXT,
  PRIMARY KEY (account_id, col, id) );
CREATE INDEX records_seq ON records(account_id, seq);
CREATE TABLE invites (
  code_hash BLOB PRIMARY KEY, made_by TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, used_by TEXT );
CREATE TABLE audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT, account_id TEXT, at INTEGER NOT NULL, event TEXT NOT NULL,
  device_id TEXT, ip_hash BLOB, detail TEXT );
CREATE INDEX audit_account ON audit(account_id, at);
```
Housekeeping on a cron trigger (daily): expired device codes, tombstones over 90 days, snapshots over 30 days,
audit rows over 180 days, devices revoked over 30 days. `seq` is per account (`accounts.seq + 1` in the same
transaction as the write), so a pull by `since` is one indexed range read.

### 6.3 Rate limits

The Rate Limiting binding for the coarse per-IP limits (`login`: 10 / min; `device/code`: 20 / h; `signup`: 5 / h;
`recover`: 5 / h), plus the exact per-code counters in `device_codes.wrong_lookups` and a per-account failure count in
`audit` for the 5-in-10-minutes rules (the binding is "permissive and eventually consistent"; the counters are the
rule, the binding the shield).

---

## 7. CI: deploying the Worker

A new job `accounts` in `.github/workflows/build.yml`, run on pushes that touch `worker/**` (and manually): checkout;
`npm ci` in `worker/`; `node --test` (the Miniflare tests); then `cloudflare/wrangler-action@v4` with `apiToken:
${{ secrets.CLOUDFLARE_API_TOKEN }}`, `accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`, `workingDirectory: worker`,
and a two-line `command`:

```
d1 migrations apply airglow --remote
deploy
```
and `secrets:` carrying `PEPPER` and `TOKEN_SECRET` from two new repository secrets `AIRGLOW_PEPPER` and
`AIRGLOW_TOKEN_SECRET` (32 random bytes each, base64; the owner makes them once with `openssl rand -base64 32`; the
Worker refuses to start without them). The first run needs the D1 database to exist: a step before the action runs
`npx wrangler d1 create airglow || true` and reads the id into `wrangler.toml` with `wrangler d1 list --json` (sed), so
nothing is done by hand. The API token's scopes: Workers Scripts Edit, D1 Edit, Account Settings Read. After deploy,
`curl <host>/v1/health` as the smoke test. The release job is unchanged: the Worker deploys from `tv-redesign` as well
as `main` (one Worker, one database; a `--env staging` is a later line). The apps read the host from `core.js`
(`ACCOUNTS_HOST`, overridable in `store 'acctHost'` for the fake Worker in tests).

`wrangler.toml`:
```
name = "acct"
main = "src/index.js"
compatibility_date = "2026-10-01"
[assets]
directory = "pages"
run_worker_first = ["/v1/*"]
[[d1_databases]]
binding = "DB"
database_name = "airglow"
database_id = "<filled by CI>"
[[unsafe.bindings]]            # the rate limiters
name = "RL_LOGIN"
type = "ratelimit"
namespace_id = "1001"
simple = { limit = 10, period = 60 }
[triggers]
crons = ["17 4 * * *"]
[vars]
OPEN_SIGNUP = "false"
OWNER_EMAILS = "birgir@example.is"
INVITES_PER_MONTH = "10"
```

---

## 8. Security notes (what could go wrong, and the answer)

| Threat | Answer |
|---|---|
| The D1 database leaks | Blobs under `dk`; `dk` only wrapped under `wk` (600 k PBKDF2 of the password) and `rwk` (100 random bits); auth HMACs useless without the pepper, which is not in D1. |
| The Worker's secrets leak too | The pepper lets an attacker test guesses against the auth hash offline, at the cost of the client KDF per guess, the same exposure as Bitwarden's. The data stays locked. Rotate: a new pepper means every account signs in once with the password (the server re-HMACs on a successful login against the old pepper, kept 30 days as `PEPPER_PREV`). |
| The Worker is malicious (a bad deploy, a stolen Cloudflare token) | The apps' code is in the APK / IPA / installer, not served, so the apps are safe; the `/tv`, `/signup` and `/recover` pages are served and are the one place a bad server could steal a password. Mitigations: the pages are files in this repo, deployed by CI from a reviewed commit; the apps are the preferred path and `07` says so; Subresource Integrity on the page's one script; a later step is a `prelogin` KDF floor in the apps (a server that returns `iterations: 1000` is refused, Bitwarden's lesson). |
| Someone types a code into a stranger's TV (remote phishing, RFC 8628 §5.4) | The approver names the TV and the time, says `Only sign in a TV you're looking at`, and the QR path proves the TV's key; the same-address tick when both came from one network; a new device always lands in the Devices list with `signed in with your phone` and a `Sign out`. |
| Code guessing | 64 M codes, 10 minutes, 5 wrong lookups kill a code, 5 per IP per 10 min, 20 code requests per IP per hour. |
| A stolen refresh token | Rotated on every use; a reuse of a spent token revokes the device (the classic theft signal) and the next sync shows `Signed out from Laptop · a sign-in token was reused`. |
| A stolen TV (or a sold one) | `Sign out <device>` from any other device; the TV wipes on its next contact. A TV that never comes online keeps the data key in the Keystore-wrapped store, which is Android's own protection (a factory reset before selling is the advice in §10). |
| Password change by an attacker who has the session | `POST /v1/password` needs the current auth key; the TV can't change it at all. |
| Recovery-key guessing | 100 bits, HKDF'd; 5 tries an hour per account; a recovery revokes every session and is in the audit list. |
| Email enumeration | `prelogin` answers for any email; `signup` says `409` only with a valid invite; `recover` answers the same for unknown emails. |
| Replay / swapping records between accounts | AES-GCM AAD binds `accountId/col/id/ver`; a record moved or rolled back fails to open and is reported as a sync error, not applied. |
| The WebView's localStorage on the TV | `dk` is never in it (§5.7); records at rest on the TV are the app's own store as today (the provider login is already there in the clear today; the account makes nothing worse on the device). |
| Logging | The Worker logs no bodies; `ip_hash` is `HMAC(PEPPER, ip)` truncated, kept for the rate rules and the audit lines only. |

What the server knows: emails, device names and kinds, when things happened, sizes and counts, which collections exist.
What it cannot know: provider logins, the TMDB key, the Stremio key, what anyone watched, Saved, settings.

---

## 9. What the builder changes in which files (and the order)

1. **`worker/`** (new): `wrangler.toml`, `migrations/0001_init.sql` (§6.2), `src/index.js` (routing, CORS for the apps'
   origins: `capacitor://localhost`, `http://localhost`, `file://` is not needed by Electron with `fetch` from the main
   process), `src/auth.js` (§5.4, §5.8, prelogin, signup, login, token, logout, password, recovery-key, recover,
   account delete), `src/device.js` (§2.3, §6.1's device endpoints), `src/sync.js` (§4, CAS, limits, the cursor),
   `src/invites.js`, `src/cron.js`, `pages/tv.html`, `pages/signup.html`, `pages/recover.html`, `pages/acct.css`
   (the brand files copied by the build), `pages/acct.js` (§5.2, §5.3, §5.5 in the browser), `test/*.test.js`
   (Miniflare: the whole device flow, a sync with a conflict, the rate rules).
2. **`.github/workflows/build.yml`:** the `accounts` job of §7; `tests/mock-accounts.js` (a fake Worker for the TV,
   phone and desktop tests, started by `tests/tv/serve.sh`).
3. **Shared data layer (`app/tv/js/`):** `account/crypto.js` (§5: `deriveKeys`, `wrapKey`, `unwrapKey`, `encryptRecord`,
   `decryptRecord`, `handover`, `recoveryKey` with its Crockford encoding; WebCrypto only; `tests/account-crypto-test.js`
   with known-answer vectors so the TV, the phone, Windows and the Worker's page derive the same keys), `account/api.js`
   (the endpoints, the token refresh, the host), `account/session.js` (signed-in state, `dk` in memory, the secure store
   per platform behind `native.secret`, `tuner.secret`, the phone's Keychain plugin), `account/sync.js` (§4: the
   dirty set, the collections' adapters, the merge rules, the schedule, `on('acct-sync')`), `account/merge.js` (§2.6:
   the counts for the question, the snapshot, merge / replace), `account/device.js` (the TV's code flow: `start`,
   `poll`, `cancel`). Hooks in the existing modules: `state.js` (favs, favOrder, progress mark dirty), `session.js`
   (providers from the account; `signIn` saves to the account), `rows.js` (plays, picks, hiddenRows, rowsOff,
   notInterested, rowStats), `games.js` (`saveSeen`), `addons.js` (the list, the Stremio state), `tmdb.js` (`setKey`),
   `core.js` (`saveSettings` marks the shared keys dirty; `ACCOUNTS_HOST`).
4. **TV:** `screens/first.js` (the Welcome's new primary, `01`, the typed fallback with Email / Password, the verifying
   rows for an account), `screens/account.js` (the `airglow account` group, `03`, the Devices sheet, the What syncs
   sheet, the two sign-outs), `screens/merge.js` (`02`), `main.js` (sync start after Home; the signed-out-everywhere
   line), `app.css` (`accounts.css`'s TV part appended), `TunerPlayerPlugin` (`secret.set/get/clear` with a Keystore
   key; `android/.../Secret.java`), `tests/tv/account-*.js` (the code flow against the fake Worker, the merge question,
   the Account group) and the emulator test's checks.
5. **iPhone:** `app/phone/signin.js` (`05`, sign-up `06`, recover), `app/phone/account.js` (the group), `app/phone/approve.js`
   (`04`, the `airglow://tv` link handled in `bridge.js` with `App.addListener('appUrlOpen')`, the camera via the
   Capacitor barcode plugin or the camera roll's QR detection), `ios/` (the URL scheme in `Info.plist`, the Keychain
   plugin), `tests/phone/flows.js` (sign-in, approve with a fake code).
6. **Windows:** `app/desktop/signin.js` (`05`'s shape with real fields), `app/desktop/account.js` (`08`),
   `main.js` (`safeStorage` behind `tuner.secret`; the `airglow://` protocol is not needed on Windows), `preload.js`,
   `tests/desktop/views.js` (the Account page, the devices list) and `app-windows.js` on CI.
7. **Docs:** `CLAUDE.md`'s module list (`account/*`, `worker/`), `CONTEXT.md`'s story, `NEXT.md`'s open items (§11).

Order: 1 and 3 together (the crypto vectors first, then the Worker against them), then 4 (the owner's TV is the first
test), then 6, then 5 (AltStore builds take longest to get onto the phone), then 2's CI gates and 7.

---

## 10. Strings (new; everything else is the TV's)

TV: `Sign in on your phone`, `Use airglow without an account`, `Scan the code with your phone's camera, or open
<host>/tv and type the letters below.`, `Sign in to your airglow account there. No account yet? Make one with your
invite.`, `Tap Sign in the TV. This screen moves on by itself.`, `The code works for 10 minutes`, `Waiting for your
phone`, `Your provider login, add-ons, Saved and history come over encrypted for this TV. airglow's server never sees
them.`, `Type email and password`, `Back returns to the choices`, `The code ran out · here is a new one`, `Signed in as
<name>`, `Your things, unlocked on this TV`, `Putting them together`, `This TV already has things`, `It was used without
an account. Keep both, or make this TV match your account.`, `On this TV`, `In your account`, `the same provider`, `<n>
not in your account`, `Merge them`, `Recommended`, `Keeps everything. The same channel or title saved on both becomes
one.`, `Use my account's only`, `This TV's own <n> saved channels and <n> plays are removed. The provider stays: it's
the same one.`, `Asked once, on this TV only. Merge can't be undone either way, so the account keeps a copy of today's
state for 30 days.`, `airglow account`, `Signed in`, `Synced <n> min ago`, `Sync now`, `Last synced <day time> ·
offline`, `Devices`, `this TV`, `What syncs`, `Not this TV's picture, sound or player settings: those stay here`, `Sign
out of this TV`, `Your things leave this TV. Your account keeps them`, `Sign out everywhere`, `Every device asks for
your password or your phone again`, `Signed out everywhere from <device>`, `Recovery key: on your phone or PC`,
`airglow's server didn't answer · trying again in 2 min`, `Can't reach airglow's server right now. You can use airglow
without an account and sign in later.`

Phone and Windows: `Sign in`, `Your provider, add-ons, Saved and history come to this iPhone / PC.`, `Forgot it? Use
your recovery key`, `Create an account with an invite`, `Your password never leaves this iPhone: it unlocks your things
here. airglow's server keeps only locked copies it can't open.`, `That password doesn't open this account`, `Wait a
minute and try again`, `Create an account`, `1 · Account`, `2 · Recovery`, `3 · Provider`, `Your recovery key`, `If you
forget your password, this key is the only way back in. airglow can't read your things, so it can't reset them. Write
it down or save it in Passwords.`, `Copy`, `Save to Files` / `Save as…`, `I've put it somewhere safe`, `Continue`, `You
can see it again later in Account › airglow account › Recovery key; your password unlocks it. A new key can be made
there too, which retires this one.`, `Skip for now`, `Sign in this TV?`, `<TV> · code <code> · asked <n> s ago`, `It's
the TV you scanned, and the TV is on your Wi-Fi. Only sign in a TV you're looking at.`, `It gets your`, `Sign in the
TV`, `Not now`, `Locked on this iPhone for that TV only. airglow's server passes it on without being able to read it.`,
`Sign in a TV`, `Change password`, `Also sign out my other devices`, `Your other devices keep working: your things are
locked with a key the password only unwraps.`, `Recovery key`, `Show it`, `Make a new one`, `What the server has`,
`Your email, a locked copy of your key and locked records. Not your password, your provider passwords, your history or
your TMDB key in the clear`, `Invite a friend`, `Works once, for 7 days. A friend gets their own account: nothing of
yours is shared`, `New code`, `copied`, `<n> invites left this month. Open sign-up is off: only invited people can make
an account.`, `Snapshots`, `Restore`, `Rename`, `This PC`, `Active now`, `Last seen <time>`, `signed in <day> with your
phone / with the password / with the recovery key`, `Signing a device out removes your account's things from it the
next time it is online; the device keeps working without an account until then.`, `Sign out of this PC`, `Delete
account`, `Everything on the server goes. Your devices keep what they have, as if they had never signed in.`

The Worker's pages: `Sign in your TV`, `Type the letters your TV shows, then your airglow account.`, `TV code`, `Email`,
`Password`, `Your password is used here, in your browser, to unlock the key your TV needs. It isn't sent anywhere. The
TV gets a locked copy only it can open.`, `Have the airglow app? Open it instead`, `Done · open airglow on your phone or
PC`.

---

## 11. Open items (for the owner, and for after the TV test)

1. **The host.** The mocks show `acct.airglow.workers.dev` (worker `acct`, subdomain `airglow`); the real one is whatever
   subdomain the owner's Cloudflare account has. A short custom domain is one `routes` line in `wrangler.toml` when he
   buys one; the typed step reads better with it.
2. **Argon2id.** When all three WebViews are known to run a WASM Argon2id fast enough on the TV (a measurement on the
   Philips: 19 MiB / 2 / 1 should take under 2 s), the account's `kdf` moves; nothing else changes.
3. **The phone's QR scanner.** The iPhone's camera app opens `airglow://` links from a QR without any plugin; an in-app
   scanner (Account › Sign in a TV) needs the Capacitor barcode plugin, a build-size and AltStore question.
4. **Email, later.** New-device and recovery notices through Resend's free tier or Cloudflare's Email Sending; a
   verified-email flag would then gate open sign-up.
5. **Passkeys.** A passkey can't derive `wk` (nothing to feed PBKDF2), so it would only replace the auth step; the PRF
   extension could one day wrap `dk`. Not for v1.
6. **The M3U text.** Large playlists sync by `url` only; a pasted M3U with no link stays on the device it was pasted on,
   and Account says so on that provider's row.
7. **Selling the TV.** Add `Sign out of this TV` to the advice in About, and a line that a factory reset is the sure way.
8. **Friends' limits.** If a friend brings a 60,000-channel provider, the records are still small (the catalog never
   syncs; only the login does). The 25 MB cap is mostly plays over years; `plays` months older than two years could be
   folded into a yearly record.
