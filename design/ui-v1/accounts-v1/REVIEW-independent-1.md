# airglow accounts v1: independent review 1

Reviewer: independent (did not make the design). Read: `SPEC.md` (all of it), `png/contact-sheet.png`, `png/01`, `png/02`,
and the code the spec hooks into (`app/tv/js/state.js`, `session.js`, `rows.js`, `capacitor.config.json`, `main.js`).

**Overall: 7.1 / 10.** The design is clear, calm, on brand, and well researched. Its shape is right: the TV signs in from
the phone, the password manager model, local first, one question asked once. It is not ready to build as written. Two
things in the crypto can't work as specified (record ids come from a key the TV never has; the handover's AAD uses a value
the phone never sees). One screen tells the user something that isn't true (the "It's the TV you scanned" tick). The sync
model doesn't match how the app stores things today: Saved, progress and plays are kept per provider login, under a
random id each device makes up. Every one of these is fixable without changing the look of a single screen.

| Area | Score | In one line |
|---|---|---|
| Looks and clarity | 8.5 | The best-looking TV sign-in of the set, and the merge screen shows real counts. A few phrases are off. |
| Ease of use | 7.5 | Good on paper, but on the owner's iPhone the QR opens Safari, not the app, which adds a step and pushes him to type his password into the web page. |
| Security | 6.5 | Sound primitives, and the risks are stated honestly. But there is a false assurance on screen, a plaintext `now_playing`, no KDF floor, a recovery key "shown again" with no place it is kept, and refresh reuse that will sign the TV out at random. |
| Sync robustness | 6.0 | The collections ignore provider scoping. A device back after 90 days brings deleted things back. One bad push can wipe every device, with nothing on the server to undo it. |
| Buildability | 7.0 | The file plan and order are good. Missing: how the owner's first account is made, rate limits the binding can't express, CORS for Electron, and secrets made by CI. |
| Brand fit | 8.5 | The kit's tokens, the chalk QR box, the magenta pill, plain words, errors never red. |

---

## 1. Design, screen by screen

**TV sign-in (`01`).** It matches Netflix, Plex and YouTube TV, and it is easier to read than all of them: the letters are
big in their boxes, the three steps are numbered, and the waiting card moves on by itself. Six base-20 letters are easier
to read across a room than Netflix's 8 digits. Having one focusable thing (`Type email and password`) is right for a
remote. Text stays inside the safe area. The hint ends at about y 512, so leave it there and don't let it grow.
Step 2's `No account yet? Make one with your invite.` is a dead end for a friend standing at the TV: the TV gives them
nowhere to go. Add `<host>/signup` to that sentence, or make the `/tv` page offer sign-up.

**The QR target (must fix).** The QR carries `https://<host>/tv/WDJBMH#k=…`. With no Universal Links (§2.3 says AltStore
builds can't have them), the iPhone camera opens that in **Safari**, not the app. So the owner's usual path is: scan,
then Safari's `/tv` page, then find the small `Have the airglow app? Open it instead` link at the bottom of `07`, then the
app, then the sheet. Worse, the page invites him to type his password in the browser, which is the path §8 calls the
risky one. Pick one of these:
(a) Encode `airglow://tv?code=…&k=…` in the QR. The iOS camera offers to open custom schemes from a QR (check this on his
iPhone). Keep the printed `<host>/tv` for phones without the app.
(b) Keep https, but have the `/tv` page lead with a full-width `Open in airglow` on iOS, with the form below it.
I would ship (b) now and test (a). In either case, §2.3's "three steps, under 60 s" claim needs re-checking against the
real path.

**Phone approval (`04`).** The shape is right: Google's own "Sign in on TV" consent shows who is asking, with what code,
and what it gets. The `IT GETS YOUR` chips are an excellent touch. But the tick line claims more than it knows (see
§2.3 below). Change the line to: `Philips TV · WDJ-BMH · asked 20 s ago`, then `Is this the code on your TV?`. Show the
Wi-Fi half only when the addresses match.

**Recovery key (`06`).** This is the strongest screen. The copy explains *why* the key exists (Proton's lesson), the
Continue button is blocked until the box is ticked, and Copy and Save sit side by side. Three fixes:
- Add a check character, or accept Crockford's I/L→1 and O→0 when typed. Otherwise a typo burns one of the five tries
  an hour.
- On a phone, `Save to Files` puts the key in iCloud next to everything else. That's fine; 1Password's Emergency Kit
  does the same.
- `Show it` later needs a place where the key is kept (§2.4 below).

**Merge or replace (`02`).** Showing the two columns with real counts is better than anything Plex or Netflix do (they
just replace). Three fixes:
- The foot `Merge can't be undone either way` reads as if only Merge is permanent. Say `Neither choice can be undone
  here, so your account keeps a copy of today's state for 30 days.`
- `Use my account's only` is awkward. Say `Use only what's in my account`.
- Back doing nothing will feel broken on a remote. Have Back show a toast (`Pick one to finish signing in`) rather than
  stay silent.

**TV Account (`03`), Windows Account (`08`).** These are clear and use the existing group-row kit. `What syncs` with the
"not this TV's picture…" line answers the right question before anyone asks it. The Windows page is dense at 1080p but
readable. `08` lists `what it is watching` per device, which the server would see in plaintext (§2.5 below).

**Words.** Plain and on voice. `things` is used too often (`This TV already has things`, `Your things leave this TV`).
That's fine once, cute three times. Errors are neutral and never red: good.

**Against the references.** The TV sign-in is on par with Netflix, Plex and Disney+, and has a nicer waiting state. The
E2EE story matches Bitwarden and Standard Notes, and its recovery is better than Standard Notes (which has none) and as
good as 1Password's. Fix the QR path, and it is premium.

---

## 2. Security and crypto

### 2.1 Key derivation and auth: sound
- PBKDF2-SHA-256 600k, then HKDF into separate `wk` and `ak` (Bitwarden's shape), with the parameters stored per account
  so they can move to Argon2id later: right for WebCrypto only.
- The HMAC of `ak` with a pepper is a reasonable departure, given 10 ms of CPU. `ak` is a 256-bit output of the KDF, and
  Palant's point applies.
- **Correction to §5.4 and §8:** a stolen D1 is *not* "useless without the pepper". `wrapped_key` sits in D1, and an
  AES-GCM tag check against it is a guessing oracle at PBKDF2 600k per guess, with no pepper needed. That's the same as
  Bitwarden, but the spec should say it. The pepper protects the auth path only; the password's strength and the KDF
  are the real defence. The 12-character minimum matters, so keep it.
- **Must fix: a KDF floor in the clients now, not "later".** A malicious or broken server that answers `prelogin` with
  `iterations: 1000` gets an `ak` it can brute-force cheaply. This is one line per client: refuse anything below
  600,000 PBKDF2, or below agreed Argon2id minimums. It is Bitwarden's lesson, and §8 already cites it.
- Don't trim the password (§5.1). NFKC is fine; silently dropping a trailing space is a later lockout.
- Use one pepper with HKDF subkeys per purpose (auth, the fake salt, ip_hash), not the same key three ways.

### 2.2 Data key and records
- **Must fix: record ids (§5.6) come from `mk`, which the TV never has**, and `mk` changes on every password change, so
  every id would change and every record would be duplicated. Derive from the data key:
  `idKey = HKDF(dk, info "airglow/v1/ids")`.
- Should fix: don't use `dk` directly as the AES key and also as HKDF input. Make `dk` the root and derive
  `encKey = HKDF(dk, "airglow/v1/records")` and `idKey` from it.
- Should fix: store a key check value with the account, AES-GCM of a constant under `dk` (`dk_check`), so a TV after a
  handover, or a device after recovery, can prove it holds the right key before it writes anything.
- The AAD `accountId/col/id/ver` is good. Clients should also refuse a record whose `ver` is lower than the one they
  hold: the AAD stops swaps, not a server replaying an older valid version.

### 2.3 TV handover (ECDH) and the device flow
- **Must fix: `aad = device_code_id` (§5.5).** The phone never sees `device_code`. Use something both ends know:
  `aad = "airglow/v1/handover|" + user_code + "|" + hex(SHA-256(tvPub))`.
- **Must fix: the key-hash length.** "`SHA-256(tvPub)[0..8] hex`" reads as 8 hex characters, which is 32 bits. A
  malicious server could grind a P-256 key to match 32 bits. Use 128 bits (22 base64url characters in the fragment);
  the QR has room.
- **Must fix: the tick is a false assurance (RFC 8628 §5.4, remote phishing).** `/v1/device/code` is unauthenticated.
  An attacker can start a code on their own device and send the owner the link `airglow://tv?code=…&k=<their own key's
  hash>`. The hash matches, so the sheet says *"It's the TV you scanned"*, and one tap hands the attacker the data key,
  every provider login and a 90-day session. The hash proves the link and the server agree. It does not prove anyone
  stood at a TV. Fix:
  - Drop the word "scanned".
  - When `sameAddress` is false, require one extra step: `Type the last 3 letters your TV shows`, or pick the code
    from three.
  - Compare IPv6 addresses by /64. Phone and TV on the same Wi-Fi have different IPv6 addresses, so an exact match
    would almost never fire.
- Typed codes trust the server's `tvPub`, and the `/tv` web page trusts the server's JavaScript. Both are stated
  honestly. **But remove "Subresource Integrity on the page's one script" from §8.** SRI on a page served by the same
  server protects nothing: whoever changes the script changes the hash in the same response.
- The rule "the code dies after 5 wrong lookups" has no subject: a wrong code matches no code. Say what it means:
  counters per approving account and per IP. Note that lookups need an account (invite-only), which already makes
  guessing practically impossible.
- The `/tv` page's own login should be one-shot. Don't give it a refresh token and don't add a device row for a browser
  tab.

### 2.4 Recovery key
- **Must fix: `Show it` (§2.9) has nothing to show.** `rk` is stored nowhere. If a builder "fixes" that by putting `rk`
  in a record under `dk`, then every device that holds `dk` (including a stolen TV) can derive `rak` and call
  `/v1/recover`: it can take the account over, change the password and sign the owner out everywhere. Pick one:
  - store `rk` wrapped under `wk` (password-derived; the server keeps `recovery_key_wrapped_by_pw`), so only someone
    with the password can show it; or
  - drop `Show it` and keep `Make a new one`.
- 100 random bits with HKDF (no slow KDF) is correct. Five tries an hour per account is fine. Anyone who knows the email
  can lock recovery for an hour, which is acceptable.
- After a recovery, offer `Make a new recovery key`, because the old one has just been typed somewhere.

### 2.5 Server knowledge
- **Must fix: `devices.now_playing` is plaintext on the server**, which contradicts §8's "cannot know what anyone
  watched" and the screen copy `What the server has: … not your history`. Either encrypt it under `dk` in the device's
  `devices-meta` record, or drop it.
- Also say in §8: write times and sizes of `plays:<month>` and `progress` records show *when* someone watches, though not
  what. That's fine, but the copy should not claim more than that.

### 2.6 Sessions and tokens
- **Must fix: refresh-token reuse with no grace period will sign the owner's TV out at random.** If a response is lost on
  flaky Wi-Fi, the TV retries with the old token, the device is revoked, and the TV wipes its provider and drops to the
  first screen. Accept the previous token for about 60 s after a rotation, returning the *same* new pair. This is
  Auth0's reuse interval and Okta's grace period.
- Should fix: check `devices.revoked_at` on every authenticated request; it is one indexed read. Without this, a device
  signed out because it was stolen keeps pulling for up to an hour on its access token.
- Should fix: a rate limit of 5 failures per 10 minutes per *account* lets anyone with the email keep the owner out.
  Key it on account + IP, and leave existing sessions alone.

### 2.7 Invites and bootstrap
- **Must fix: there is no way to make the first account.** Sign-up is invite-only, and invites are made by the owner's
  account. Suggested:
  - The owner's email goes in a repository secret (`AIRGLOW_OWNER_EMAIL`), not in `[vars]`. The repo is public, and
    `OWNER_EMAILS = "birgir@…"` in `wrangler.toml` would publish his address.
  - While no `is_owner` account exists, sign-up for that one email needs no invite.
- Invite maths: four base-20 letters is about 17.3 bits, not "16 random bits". The mock's `KX7R-M2PQ` has digits, which
  aren't in the base-20 set. Pick one alphabet.

---

## 3. Sync model

- **Must fix: per-provider scoping.** Today `favs`, `favOrder`, `progress`, `recents`, `plays` and the Stremio state are
  stored as `a:<acc.id>:<key>` (`state.js` `scoped()`, `rows.js` `PKEY`). `acc.id` is a **random** 8-character id made
  per device (`session.js:54`). §4.2's flat `favs`, `progress` and `plays` collections lose that dimension, and saved
  channels from `line.provider.tv` and `backup.m3u` would mix. Fix:
  - Key scoped records by the provider record's synced id (the HMAC of `type|server|username`), e.g.
    `col = favs`, `id = <providerId>/<itemId>`, and `plays:<providerId>:<month>`.
  - Have `session.js` take the local `acc.id` from the account's provider record, so all devices agree.
  - Decide whether plays and taste are per provider or per person. Per person is probably what the owner means; then
    say so and migrate.
- **Must fix: a server-side undo for mass deletes.** Any signed-in device, or one bug in an adapter (a sign-out wipe or
  a replace that marks records deleted instead of clearing them locally), pushes tombstones that empty every device.
  The only snapshot is the one taken at the merge question. Two fixes:
  - Keep the previous blob of each overwritten or deleted record for 30 days (a `records_prev` table; the blobs are
    already encrypted, so this costs the server nothing in privacy), with `Account › Sync › Undo changes since…`.
  - Refuse a single push that deletes more than half of a collection unless it is flagged on purpose.
- **Should fix: the tombstone horizon.** Tombstones are purged at 90 days. A device whose `since` is older than that
  never hears about those deletes and pushes them back as new. Have the server answer `{ reset: true }` to a stale
  cursor, and have the client then do a full pull: its non-dirty records the server doesn't have are dropped.
- **Should fix: chunking rules.** A heavy month of plays (around 150 bytes a play, 33% more after base64) can pass
  64 KB. The snapshot (§2.6) certainly can. Give both an overflow rule (`plays:<p>:2026-10:2`; snapshot parts).
- Should fix: before a voluntary sign-out, push dirty records, or say that unsynced changes go.
- The merge rules per collection are otherwise right: union for logs, newest list for orders, per-key timestamps for
  settings, and compare-and-set on `baseVer`. "Never ask about conflicts" is the right product call.
- A play's identity `(imdb, season, episode, at)` breaks on `at` collisions after a merge. Give each play a random `pid`.

### Free-plan arithmetic
- **Should fix:** D1 Free databases are 500 MB each. 50 accounts × the 25 MB cap is 1.25 GB, so the cap and the
  headcount can't both hold. Set 8 MB per account (plays folded yearly after a year), or say that the cap is a ceiling
  nobody reaches.
- D1 counts index updates as rows written. Each record push is about 3 rows (the record, `records_seq`, `accounts`).
  That still fits.
- 10 ms of CPU: parsing a 1 MB JSON body plus 200 bound statements can go over 10 ms on Free. Cap a request at 256 KB
  and 100 records, and measure it in the Miniflare tests.
- The 15-minute timer: add `GET /v1/sync/seq` (one read, no body) so the idle polls cost nothing.

---

## 4. Buildability (Worker, D1, CI, apps)

- **Secrets: CI makes them; the owner doesn't.** The session can't read Actions secrets, and the owner shouldn't have to
  run `openssl`. In the `accounts` job, after the first deploy, run `wrangler secret list --format json`. For
  `PEPPER` and `TOKEN_SECRET`, if absent, run `openssl rand -base64 32 | wrangler secret put NAME`. The value is never
  echoed and never stored in the repo. Do **not** pass them through `wrangler-action`'s `secrets:` on every deploy.
  Worker secrets persist across deploys. Write it in `NEXT.md`: **deleting or renaming the `acct` Worker loses the
  pepper and locks every account out of sign-in and recovery** (the data stays safe but nobody can log in). The order
  on the first run is deploy, secrets, health check. The Worker answers 503 on `/v1/*` until both exist, rather than
  "refuses to start".
- **Rate limits:** the Rate Limiting binding only has 10 s and 60 s periods, so `20/h` and `5/h` (§6.3) can't be binding
  rules. Make those D1 counters, and keep the binding for `login 10/min`. Use the current `[[ratelimits]]` config block
  rather than `[[unsafe.bindings]]` if the pinned wrangler supports it.
- **CORS:** the shared `account/api.js` runs in the page, so Electron's renderer (`loadFile`, origin `file://`, which
  sends `Origin: null`) needs CORS, contrary to §9.1. Android Capacitor's origin is `http(s)://localhost`, and iOS's is
  `capacitor://localhost`. Since auth is a bearer token, not a cookie, `Access-Control-Allow-Origin: *` with no
  credentials is safe and the simplest.
- D1 bootstrap: the `d1 create || true` + `d1 list --json` + sed plan works. Recent wrangler can also provision D1 on
  deploy when `database_id` is left out; check the pinned version and use whichever works.
- Static assets: `/tv/WDJBMH` is not a file. Route `/tv/*` through the Worker, or set the SPA fallback, or the QR link
  404s.
- Apps: the module plan in §9 is good, and so is the order (crypto vectors first). Add:
  - the provider-scope mapping (§3 above) to `state.js` / `session.js` / `rows.js`;
  - a `native.secret` stub in `tests/mock-accounts.js` paths;
  - a test that the TV, the phone page and the Worker's `acct.js` all decrypt one fixed vector set, including a
    handover box.

---

## 5. Lists

### Must fix
1. The QR's path on iPhone: the https QR opens Safari's password page, not the app. Lead `/tv` with `Open in airglow`,
   and/or encode `airglow://` in the QR. Re-check the "three steps" claim.
2. The approval tick claims "It's the TV you scanned", which a phishing link also gets. Change the words, require an
   extra code check when the addresses differ, and compare IPv6 by /64.
3. Record ids are derived from `mk`, which the TV doesn't have and which changes with the password. Derive them from
   `dk`.
4. The handover AAD uses `device_code_id`, which the phone doesn't know. Use `user_code` + the full key hash. The key
   hash must be at least 128 bits.
5. The clients need a KDF floor (refuse fewer than 600k iterations) in v1.
6. `Show it` for the recovery key has no stored key. Wrap `rk` under `wk`, or drop `Show it`. Never store it under `dk`.
7. `devices.now_playing` is plaintext on the server, which contradicts the promise. Encrypt it or drop it.
8. Refresh-token rotation needs a grace window, or the TV will sign itself out and wipe on flaky Wi-Fi.
9. Synced collections must carry the provider scope (today's `a:<random acc.id>:…` stores), and `acc.id` must come from
   the account.
10. A server-side undo (30-day previous versions) and a mass-delete guard, so one bad push can't empty every device.
11. Bootstrap the owner's first account, and keep his email out of the public `wrangler.toml` (use a secret).
12. CI generates `PEPPER` / `TOKEN_SECRET` if absent (not owner-made, not re-put each deploy). Document that deleting the
    Worker locks everyone out.

### Should fix
- Correct "a stolen D1 is useless without the pepper": `wrapped_key` is an offline oracle at the KDF's cost.
- Remove SRI from §8 as a mitigation.
- Check `revoked_at` on every authenticated call. Key the failure limits on account + IP.
- `HKDF` subkeys from `dk` (records, ids) and from the pepper (auth, fake salt, ip_hash). Add a `dk_check` value.
- Clients reject a lower `ver` than they hold.
- A `reset` answer for cursors older than the tombstone horizon.
- Overflow chunking for play months and snapshots. Give each play a `pid`.
- The 25 MB × 50 vs D1's 500 MB arithmetic. Cap request bodies at about 256 KB / 100 records for the 10 ms CPU.
- Rate limits the binding can't express go to D1. Use `[[ratelimits]]`.
- CORS `*` without credentials (Electron is `Origin: null`).
- Route `/tv/*` through the Worker.
- Push dirty records before a voluntary sign-out.
- A recovery-key check character, or lenient Crockford decoding.
- The `/tv` web login is one-shot (no refresh token, no device row).
- `No account yet?` on the TV needs a place to go (`<host>/signup`).
- Offer a new recovery key right after a recovery.
- Note that a password change doesn't rotate `dk` (a past compromise of `dk` survives it). Name `keyVersion` rotation
  as the later path.

### Nits
- The `02` foot: "Neither choice can be undone here…". `Use only what's in my account`.
- Back on `02` shows a hint instead of doing nothing.
- Fewer "things".
- Don't trim passwords.
- The invite bits maths and alphabet (the mock has digits).
- The rule "the code dies after 5 wrong lookups" needs a subject.
- `prelogin`'s fake answer should match whatever KDF the real accounts use after an upgrade, or enumeration by
  parameters returns.
- Prune `progress` older than a year so the 5,000-record cap isn't hit by years of history.
