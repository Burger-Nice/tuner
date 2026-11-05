# airglow accounts v1.1: independent review 2

Reviewer: independent (did not make the design or review 1's fixes). Read: `SPEC.md` v1.1 (all of it), `REVIEW-independent-1.md`,
`png/contact-sheet.png`, the mocks' text (`0*.html`), and the code the spec hooks into (`app/tv/js/state.js` `scoped()`,
`session.js`, `rows.js`, `addons.js`, `games.js`, `subs.js`, `shelves.js`, `tmdb.js`, `capacitor.config.json`, `main.js`).

**Overall: 7.4 / 10.** v1.1 does the work. Eight of review 1's twelve must-fixes are fixed properly. They are in the
crypto sections, in the strings and in the mocks, not just listed at the top. The owner's wish is met on every sign-in
screen: one sign-in brings the provider login, the Stremio add-ons and link, the TMDB key, Saved and history. The
weak spots are the new mechanisms the fixes added. Undo restores records that no client can open. The mass-delete guard
blocks ordinary actions such as removing a provider or Forget my taste. The refresh grace window can't be built as
written. The CI secrets step can overwrite the pepper. The recovery key is tied to a salt that a password change may
replace. The provider scoping is done for Saved and progress but not for the stores that are per person. Each fix is a
paragraph of spec text, and none of them changes a screen.

| Area | Score | In one line |
|---|---|---|
| Looks and clarity | 8.5 | Calm, on brand and honest. `04` no longer claims what it can't know. The one screen the security depends on (`04` on another network) has no mock. |
| Ease of use | 8.0 | The QR path is fixed and its step count is honest. The three-letter step may show at home more often than the spec expects (IPv4 against IPv6). |
| Security | 7.5 | The floor, the ids, the AAD, the 256-bit hash and the recovery wrap are right. The recovery salt, the refresh mechanics, the CI fail-open and the owner bootstrap need work. |
| Sync robustness | 6.5 | Undo is undecryptable, the guard blocks legitimate bulk deletes, per-person and per-provider stores aren't mapped, and the history kept for undo grows faster than the cap. |
| Buildability | 7.0 | The file plan is clear. The refresh grace and the store rename (which misses `m3u:`, `info:`, `probes:` and IndexedDB) would stop a builder. |
| Brand fit | 8.5 | The kit's tokens, the chalk QR box, the magenta pill, neutral errors, no red. |

---

## 1. Review 1's twelve must-fixes: fixed or not

| # | Must-fix | Verdict | Where / what remains |
|---|---|---|---|
| 1 | The QR on iPhone opens Safari | **Fixed** | `07` leads with `Open in airglow`, the form sits under `or sign in here`, and §2.3 counts four steps. Remaining nit: Safari asks `Open in "airglow"?` before handing over, so in practice it's five taps. Count it, or test open item 1 first. |
| 2 | The "TV you scanned" tick | **Fixed** | `04`'s words, §3.2, §5.5 and the §8 row are all changed. IPv6 is compared by /64. Another network asks for the last three letters. See §3 for the follow-ups (IPv4 against IPv6, CGNAT, no mock). |
| 3 | Record ids from `mk` | **Fixed** | `idKey = HKDF(dk, "airglow/v1/ids")`, `encKey` is separate, and `dk_check` is stored and checked before the first write (§4.3, §5.6). |
| 4 | Handover AAD and hash length | **Fixed** | The AAD is `"airglow/v1/handover|" + user_code + "|" + b64u(SHA-256(tvPub))`. `k` is the full 256 bits, and the HKDF salt is `user_code`. Both ends know every input. |
| 5 | KDF floor | **Fixed** | It is in §5.2 and the string is in §10, and an unknown `alg` is refused too. Nit: add a ceiling, because a hostile `iterations: 1e10` hangs the TV. |
| 6 | `Show it` with nothing stored | **Fixed, with a new hazard** | `rkpw` is under `wk`, never under `dk`. But the recovery keys are derived with the account's KDF salt (§5.3), and a password change can replace that salt (see must-fix 5). |
| 7 | Plaintext `now_playing` | **Fixed** | It is gone from the schema and from `08`. Nit: `GET /v1/devices` still returns a field called `now`. Rename it `active` so nobody re-adds what plays. |
| 8 | Refresh grace | **Partly** | The intent is right. "Returns the same new pair" can't be done when only hashes are stored, and a crash before the new token is saved still leads to a revoke and a wipe (must-fix 4). |
| 9 | Provider scoping | **Partly** | `favs`, `progress` and `plays` carry `pid`. Add-ons, the Stremio link, the Home rows' stores and others are per provider on the device but per person in the account, and nothing maps one to the other (must-fix 3). |
| 10 | Server undo and mass-delete guard | **Fixed, with new bugs** | `records_prev` and `too_many_deletes` exist. Restored blobs fail their AAD (must-fix 1). The guard refuses ordinary actions, and no client is allowed to send `wipe` (must-fix 2). |
| 11 | Owner bootstrap, email kept out of `wrangler.toml` | **Fixed** | §7.3's steps are clear. The bootstrap can still be squatted (should-fix 1). |
| 12 | CI makes the secrets | **Fixed, fails open** | §7.2 creates them once and never echoes them. A failed `secret list` reads as "absent" and replaces the pepper (must-fix 6). The warning about deleting the Worker is in the spec and goes into `NEXT.md`. |

Should-fixes taken from review 1: all of them are present and correctly placed (the stolen-database sentence, SRI
removed, HKDF subkeys from the pepper, lower `ver` refused, `reset`, parts, `playId`, 8 MB and 256 KB, `GET /v1/sync/seq`,
`[[ratelimits]]` with D1 counters, CORS `*`, `run_worker_first` for `/tv/*`, dirty records pushed before sign-out,
lenient Crockford, the one-shot `/tv` login, `<host>/signup` on the TV, a new recovery key after recovery, the note on
`dk` rotation). One contradiction crept in: the v1.1 list says invite codes are "16 base-20 letters", while §2.10 and `08`
show two blocks of four (8 letters, about 34.6 bits, which is enough). Pick one.

---

## 2. Design and words

- **The owner's key wish is met and said everywhere.** It appears in `01`'s waiting card, in `04`'s `IT GETS YOUR` chips with
  `The TV signs in to nothing else…`, in `05`'s card, and on the TV's Welcome line. A sign-in skips the provider screen and
  the three quick choices. The one honest exception is stated: a pasted M3U with no URL stays on its device. Account should
  say this by name (`backup.m3u stays on the iPhone it was pasted on`) rather than leave the owner to discover it on the TV.
- **TV effort.** One focusable button on `01` and Up/Down only on `02`. Back on `02` now shows a toast. Text stays inside the
  safe area (the card ends at 484, the hint at 510). This is right for a remote.
- **The phone approval (`04`).** `Is this the code on your TV? Only sign in a TV you're looking at. If someone sent you
  this link, tap Not now.` is the right sentence: short, true, and it tells the person what to do. **The other-network
  state (`WDJ-___` plus the three-letter field) is the screen the anti-phishing story rests on, and it isn't mocked.** Mock
  it, along with the typed-code state (`Make sure the code is the one on your TV.`).
- `On the same Wi-Fi as this iPhone` claims more than an address match proves (§3). Say `On the same network as this
  iPhone`, and show it only when the iPhone is on Wi-Fi.
- `02`: `Use only what's in my account` and the new foot read well. The mocks show the name "Birgir" in `Signed in as Birgir`,
  the avatar's `B` and the Windows header, but sign-up collects only an email. Say where the name comes from (a `name` in
  `devices-meta`? a field at sign-up?).
- Contact-sheet captions are stale: the header says "v1", caption 2 still says "Use my account's only", and the
  Windows Undo line is cut off mid-word (`so a bad chang…`). Re-render them.
- `07`'s note `It isn't sent anywhere` is true of the password, but the page does send a key derived from it. Say `Your
  password stays in this browser: it unlocks the key your TV needs`. This is the one page a bad server could change, so
  it shouldn't over-promise.

---

## 3. Security and crypto

- **The recovery key and the salt (must-fix 5).** `rwk` and `rak` are `HKDF(rk, salt = salt, …)`, where `salt` is the
  password KDF's salt. §2.7 sends "the new KDF parameters" (which include `salt`) on a password change and re-wraps only
  `dk` and `rk` under the new `wk`. It does not re-make `recoveryWrappedKey` or `recoveryAuthHash`. A builder who gives
  a new password a fresh salt (normal practice), or the planned Argon2id upgrade, silently breaks recovery. The owner would
  find out only on the day he needs it. Fix: `rk`'s HKDF takes a constant salt (`""`, which is fine for 100 random bits)
  or its own `recovery_salt` that never changes, and the known-answer tests add "change the password, then recover".
- **Refresh grace (must-fix 4).** (a) The server keeps only `SHA-256` of refresh tokens, so it can't "return the same
  new pair" on a retry. Make the successor deterministic: `next = HMAC(TOKEN_SECRET, deviceId | prevToken)`, so a
  retry recomputes the same token. Re-sign the access token. (b) Rotation plus a crash between the response and the
  Keystore write (the TV switched off at the wall, the process killed) means the old token comes back after 60 s, the
  device is revoked and the TV wipes. Treat a reuse of the *previous* token as theft only if its successor has
  already been used (`refresh_used_at`). Otherwise re-issue. This is the usual rule beside Auth0's interval. (c) Say that a
  client wipes only on an explicit `{ error: "revoked" }` from `/v1/token` or an authenticated call. It never wipes on a
  generic 401, a 5xx, the 503 for missing secrets, or a network error.
- **The same-network check.** (a) Comparing addresses across IP families never matches. A TV that asks over IPv4
  while the iPhone looks up over IPv6 (iOS prefers IPv6) gets the three-letter step at home. The spec says it "costs the
  owner nothing at home". Measure it on his network, and if it's common, say so (it fails closed, so this is friction
  only). (b) On mobile data, CGNAT puts strangers behind one public IPv4, so the tick could show for an attacker on the
  same carrier. Show the tick only when the phone is on Wi-Fi (Capacitor's Network plugin). (c) The `/tv` browser
  page under iCloud Private Relay never matches. Spec that the page asks for the three letters too, unless the code was
  typed.
- **Who can approve.** A TV holds `dk` and an access token, so it can approve a code it started itself. A stolen TV could
  sign in a second device of the thief's before the owner revokes the first, and the Devices list would read `signed in
  with your phone`. Allow `/v1/device/approve` only for devices that signed in with the password or the recovery key, and
  store and show the approver (`signed in with Birgir's iPhone`).
- **The `/tv` one-shot token** is a 1-hour full access token with no device row. Scope it to `GET /v1/device/:code` and
  `approve` for 5 minutes. Then `revoked_at`, which needs a device row, isn't an edge case.
- **The owner bootstrap (should-fix 1).** The owner's email is public: it is the commit email in every commit and in
  `CLAUDE.md`. `/v1/health` advertises `owner: false`, and `/signup` shows `Not needed for the first account` to anyone.
  Anyone can register the owner's email first and become the owner, which locks him out of his own address until someone
  edits D1. Add a fourth secret the owner picks himself (`AIRGLOW_OWNER_CODE`), put it into the Worker the same way, and
  have the owner type it in the invite field. It costs the owner one more value in a form he is already filling in.
- Smaller points: `logout-all` from a TV needs no confirmation beyond the remote, so anyone on the sofa can sign out every
  device. That's acceptable, but say so. After a pepper loss, existing sessions keep working, because refresh hashes
  aren't peppered. §7.2's "nobody can sign in" is true, but a signed-in phone still works. A re-enrolment path could
  build on that later. The custom scheme `airglow://` can be claimed by another iOS app, which is harmless here because
  the link carries no secret. Note it in §8.

---

## 4. Sync robustness

- **Undo restores records no client can open (must-fix 1).** The AAD binds `accountId/col/id/ver`. `POST /v1/undo`
  "puts back … as new versions" on the server. The server can't re-encrypt, so a restored blob carries its old `ver`
  in its AAD. Under a new `ver` it fails to open, and under the old one it's refused as a lower `ver`. Make undo
  client-driven: `GET /v1/undo?since=` returns the previous blobs with their old `ver`. The client opens them with that
  `ver`, re-encrypts them under fresh `ver`s and pushes them as normal CAS writes. (`Restore` of a snapshot is already
  client-side, so keep it that way.)
- **The guard refuses ordinary actions (must-fix 2).** These all delete more than half of a collection: removing a provider
  (its `providers/<pid>`, `favs/<pid>/*` and `progress/<pid>/*`), `Forget my taste` (`forgetTaste`, which empties the plays
  log), `Reset rows`, and clearing Continue watching. "No client path sends `wipe`" means these get `too_many_deletes`
  forever and block the dirty queue. Name the user actions that may send `wipe` (each already has its own confirm), lean on
  `records_prev` for undo, and define what a client does on `too_many_deletes`: keep the data locally, show a line, and stop
  retrying. Also define tombstones for union logs. Today "union never loses an element" means that after Forget my taste,
  the TV's next merge brings every play back from the phone's copy. A tombstoned part must win over a union.
- **Per-person collections against per-provider stores (must-fix 3).** Today nearly everything is under
  `a:<acc.id>:*`. That covers `addons` (`addons.js` `LKEY`), `stremio` (`SKEY`), `picks`, `hiddenRows`, `rowStats`, `rowsOff`
  and `finishes` (`rows.js` `k()`), `notInterested` (`shelves.js`), `imdb`, `skipShows`, the pinned copy `ver`, and
  `nbaWatchedOn` / `replayPick` / `archiveShift` / `replayDelay`. In the IndexedDB cache it covers `plays` and `homePage`, and
  in `subs.js` the `probes:<id>`. §4.2 makes add-ons, Stremio, rows and plays per person, but with `acc.id = pid` they stay
  per provider on the device. The owner has two providers, so which local `addons` list is "the" account's? Switching line
  would make his add-ons and Home rows look like they had vanished. Fix:
  - Give the spec a full key inventory, with each key marked per person, per provider or per device.
  - When signed in, per-person keys live under one person-wide prefix (`u:<accountId>:*`). The merge step folds each
    provider's copy into it (union for add-ons, the newest for picks).
  - Name what happens to the rest. `skipShows`, `ver` and `imdb` aren't in either list in §4.2.
  - The rename covers only `a:*`. It misses `m3u:<id>`, `info:<id>`, `probes:<id>`, `active` and the IndexedDB entries.
    Either list every one, or (simpler and safer) keep the device's random `acc.id` and map `acc.id ↔ pid` in the sync
    adapter, translating keys at the sync boundary.
- **`pid` from the server URL** (should-fix). IPTV providers change DNS names often. An edited server URL gives a new
  `pid`, and Saved and progress are orphaned. Derive `pid` once, when the provider is first added, store it in the record,
  and keep it across edits. The natural key is only for spotting duplicates at merge, after canonicalising it (scheme,
  case, trailing slash, default port).
- **The history kept for undo grows faster than the cap** (should-fix). A play month part (up to 64 KB) is rewritten
  on every play, and each rewrite stores its predecessor in `records_prev`. At around 5 plays a day for 30 days, that is
  roughly 5 to 10 MB per account, more than the 8 MB cap, and §4.6's 400-of-500 MB sum doesn't count it. `rowStats` is
  written on every row a viewer enters (`enteredRow`), so with a 5 s debounce it becomes hundreds of pushes and previous
  versions a day, which also eats the 2,000-push daily cap. Count `records_prev` in the cap. Keep at most one previous
  version per record per day. Keep `rowStats` on the device, or sync it hourly.
- Smaller points: dedupe plays by `playId` across parts as well as within one. The sentence on the `delays` / `teamCh` "inside the
  provider record only when both devices use the same one" contradicts itself (one `pid` *is* the same one) and should be
  rewritten. A score delay tuned to one device's buffer arguably shouldn't travel at all.
- Good as is: CAS with `baseVer`; the merge rule per collection; refusing a lower `ver`; `reset` past the tombstone horizon;
  Replace and sign-out that clear locally and push nothing; the snapshot before the merge question; local first with
  sync after Home is drawn and paused in the player.

---

## 5. Buildability

- **The CI secrets step fails open (must-fix 6).** In GitHub Actions a `run:` step with no `shell:` runs `bash -e`
  *without* `pipefail`. If `wrangler secret list` fails (a network blip, a token problem, a warning on stdout), `jq`
  reads empty input, `have` is empty, and the loop pipes a new random value into `wrangler secret put PEPPER`. That
  overwrites the real one and locks every account out, which is the exact disaster §7.2 warns about. Fix:
  - Give the step `shell: bash` with `set -euo pipefail`.
  - Check that the output parses as a JSON array before acting on it.
  - Never `put` `PEPPER` or `TOKEN_SECRET` when `/v1/health` already answers `ready: true`; both conditions must agree.
  - Skip `OWNER_EMAIL` when `$AIRGLOW_OWNER_EMAIL` is empty (an empty owner email is a bootstrap anyone can claim). Note
    that the step never updates `OWNER_EMAIL` if the repo secret changes later.
  - Run the job only on `push` and `workflow_dispatch`, never on `pull_request`.
- The refresh grace (must-fix 4a) and the store rename (must-fix 3) would stop a builder halfway. The rest is buildable
  as written: the router, the schema, `[[ratelimits]]` and D1 counters, `run_worker_first`, CORS `*`. `CapacitorHttp` is
  on, so native fetches skip CORS anyway, and `https://localhost` and `file://` are both secure contexts for WebCrypto.
  The order puts the crypto vectors first, then the Worker, then the TV.
- Add to the Miniflare tests: undo then decrypt; Forget my taste and provider removal through the guard; change the
  password, then recover; a lost `/v1/token` response, then a retry after 90 s; the secrets step with a failing `secret
  list` (it must not `put`).

---

## 6. Lists

### Must fix
1. **Undo can't be opened:** the AAD binds `ver`, and the server re-versions blobs it can't re-encrypt. Make undo
   client-driven (fetch previous blobs, open them with their old `ver`, re-push them as new writes).
2. **The mass-delete guard blocks ordinary actions** (remove a provider, Forget my taste, Reset rows, clear Continue
   watching), and no client may send `wipe`. Name the confirmed actions that send it, define the client's behaviour on
   `too_many_deletes`, and make tombstones win over union for logs.
3. **Per-person collections against per-provider local stores:** add-ons, Stremio, the rows' stores, `notInterested` and
   others are per provider on the device. Write a full key inventory, use a person-wide local prefix when signed in, and
   either a complete rename (it misses `m3u:`, `info:`, `probes:`, `active` and IndexedDB) or an `acc.id ↔ pid` map at the
   sync boundary.
4. **The refresh grace as written can't return "the same pair"** (only hashes are kept), and a crash before the new token
   is saved still revokes and wipes. Use a deterministic successor, count a reuse as theft only once the successor has
   been used, and wipe only on an explicit `revoked` error.
5. **Recovery depends on the password KDF's salt**, which a password change or the KDF upgrade may replace, and the
   recovery wraps aren't re-made. Use a constant or separate recovery salt, and add a test vector for "change the
   password, then recover".
6. **The CI secrets step overwrites `PEPPER` if `secret list` fails** (`bash -e` without `pipefail`, `jq` on empty
   input). Fail closed: `pipefail`, validate the JSON, never `put` when `/v1/health` says `ready: true`, and skip an empty
   owner email.

### Should fix
1. The owner bootstrap can be squatted (his commit email is public, and `owner: false` is advertised). Add an
   owner-chosen `AIRGLOW_OWNER_CODE` secret, typed in the invite field.
2. Mock `04`'s other-network state and its typed-code state.
3. The same-network tick: expect the three-letter step when the families differ (IPv4 against IPv6), so measure it at
   home. Show the tick only when the phone is on Wi-Fi (CGNAT). Word it `On the same network`. The `/tv` page asks for
   the letters too.
4. Allow approvals only from devices that signed in with the password or the recovery key, and show the approver in
   Devices.
5. Scope the `/tv` one-shot token to lookup and approve, for 5 minutes.
6. Keep `pid` stable across provider edits (assign it once, match by a canonical natural key).
7. Count `records_prev` in the 8 MB cap, keep one previous version per record per day, and don't sync `rowStats` per row
   entry.
8. Name the pasted-M3U exception in Account, by provider name.

### Nits
- A KDF ceiling (refuse more than about 5 M iterations) so a hostile `prelogin` can't hang the TV.
- Rename `now` to `active` in `GET /v1/devices`.
- The invite-code length (16 letters in the v1.1 list, 8 in §2.10 and `08`).
- Where the display name "Birgir" comes from.
- Count Safari's `Open in "airglow"?` confirmation in the step count.
- Stale contact-sheet captions ("v1", "Use my account's only") and the truncated Undo line in `08`.
- `07`: `Your password stays in this browser` instead of `It isn't sent anywhere`.
- The self-contradicting `delays` / `teamCh` sentence in §4.2.
- Dedupe plays across parts.
- §7.2: existing sessions survive a pepper loss, so say "nobody can sign in again".
- `logout-all` from the TV needs no password: accepted, but say so in §8.
