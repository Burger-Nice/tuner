# Independent review 3: airglow accounts and sync, v1.2

Reviewer: independent (product design and applied security). I didn't make this design. What I read: `SPEC.md` v1.2 (the
"v1.2 changes" list, then §2.3–2.11, §3.2, §4, §5, §6, §7, §8, §9 and §11 checked against them), `png/04b` and
`png/contact-sheet.png`, `REVIEW-independent-2.md`, and against the code: `app/tv/js/state.js`, `session.js`, `rows.js`
(the plays log and its migration), `shelves.js` (`hiddenKey`), `addons.js` (`LKEY` / `SKEY`) and `games.js` (the seen
store). I grepped every `store.get/set/del` key in `app/tv/js`, `app/phone`, `app/desktop` and `core.js` against §4.2a.

**Overall: 8.0 / 10.** Review 2's six must-fixes are fixed in the spec body, not only in the change list. Every
should-fix landed. Two new problems need a few lines of spec each:

- The refresh-token rule depends on `refresh_used_at`, but the spec never says when that field is set. Read literally,
  the theft check never fires.
- Two "max" merges (`forget.upTo` and the spoiler shield's `upTo`) turn one device's wrong clock, or one device turning
  the shield back on, into a permanent change on every device. For the spoiler shield, that means scores show on every
  screen.

Neither needs a redesign.

---

## 1. Review 2's must-fixes: are they in the body?

| # | Review 2 asked | Where it is now | Verdict |
|---|---|---|---|
| 1 | Undo done by the client | §4.4 "Undo" and §6.1 `GET /v1/undo` return the old blobs with the `ver` they were written under. The client opens each one, re-encrypts it at `ver + 1` and pushes it with compare-and-set. `POST /v1/undo` is gone. §9's tests include "undo then decrypt and re-push". | **Fixed.** |
| 2 | The mass-delete guard: its door, and what a refused client does | §4.4 lists the five confirmed actions that send `wipe`. A refused client marks the records *held*, stops retrying them, and offers `Sync them` / `Undo them`. For logs, deletes now beat union (`rows/forget`, part tombstones). §9 hooks `wipe` into `session.js` and `rows.js`. | **Fixed.** Two small gaps (S3, S4). |
| 3 | A key inventory, and the `u:` / `pid` mapping | The §4.2a table, `scoped()` routed by a `PERSON` set, `acc.id ↔ pid` mapped at the sync boundary, nothing renamed. I checked it against the code. It is complete apart from three URL overrides (`stremioApi`, `stremioLink`, `tmdbImg`) that the `*Base / *Url` wildcard doesn't match, and they are device-only anyway. `PKEY` and `homePage` bypass `scoped()` in `rows.js` today. §4.2a says they "go through it", so the builder has to change them. | **Fixed.** One consequence was missed (S1). |
| 4 | A refresh successor that can be recomputed, and a wipe only on an explicit `revoked` | §5.8 makes the successor deterministic (`HMAC(refreshKey, deviceId‖prev)`). A previous token re-issues until its successor is used. The client wipes only on `{ error: "revoked" }`. §8 matches. | **Mostly fixed.** "Used" is undefined (M1). |
| 5 | A recovery salt that doesn't depend on the password's salt, with a test | §5.3 uses the constant salt `"airglow/v1/recovery"`. §2.7 says a fresh KDF salt is fine. §9's known-answer tests include "change the password, then recover". There is a KDF ceiling of 5 M. | **Fixed.** |
| 6 | A CI secrets step that fails closed | §7.2: `shell: bash`, `set -euo pipefail`, the listing validated with `jq -e 'type == "array"'`, no `put` while `ready` is true, an empty owner code skipped, `push` / `workflow_dispatch` only. §9 tests a failing `secret list`. | **Fixed in logic.** As written it can't authenticate or find its directory (S6). It fails *closed*, so this is a build snag, not a lockout. |

Review 2's should-fixes: all landed.

- **The owner code** is in §7.3, §6.1 and the `meta` table. The repo's example phrase is a risk (S5).
- **`/v1/health`** answers only `{ ok, version, ready }`.
- **`04b`** is drawn.
- **The Wi-Fi-only tick and the three-letter step**, also on `/tv`. §3.2 says honestly that the letters are friction,
  not proof.
- **Approval only from password- or recovery-signed devices** is enforced at `approve`, and Devices shows the approver
  (`approved_by`).
- **The `/tv` page's token** is scoped to lookup and approve for 5 minutes.
- **`pid`** is assigned once and kept, with a canonical natural key used for spotting duplicates.
- **`records_prev`** is kept once per record per day and counted in the cap. `rowStats` stays local.
- **The pasted M3U** is named per provider.
- The nits are done as well: `active` instead of `now`, 8-letter invites, five taps counted, `07`'s line, the pepper
  sentence.

---

## 2. Design (briefly)

The owner's question was "I still have to log into the provider and Stremio?". The design still answers it on every
screen. `01`'s waiting card, `04` / `04b`'s foot (`The TV signs in to nothing else`), `05`'s first line and `03`'s
"Synced" row all say it, and §4.2 delivers it: the provider login, the Stremio key and link, the TMDB key, Saved,
history and taste are in the account.

How much each device asks of him:

- **TV:** OK, then nothing.
- **Phone:** scan, `Open in airglow`, Safari's confirmation, `Sign in the TV`. That's five taps counted honestly, or
  three if open item 1 works.
- **iPhone and Windows sign-in:** one email and password.
- **TV with no phone to hand:** the typed fallback.

**`04b`** reads well: the hidden `WDJ-___`, three big boxes, a muted `Sign in the TV` until they match. Two notes:

- The disabled button is a dim gradient that still looks like it could be pressed. Give it the kit's disabled style.
- The line `This iPhone isn't on the TV's network` is *wrong* in the case §3.2 itself expects at home, where the TV
  talks to the Worker over IPv4 and the phone over IPv6. The owner would be told he isn't on his own Wi-Fi.

The contact sheet's captions are current. Brand: the glow gradient on the primary action only, the sheet anatomy and
the TV's Account group all match the kit.

---

## 3. Security

**M1. `refresh_used_at` is never defined, so reuse detection is dead as written.**

- **What §5.8 says.** A refresh with the *current* token rotates and clears `refresh_used_at`. A refresh with the
  *previous* token revokes only if `refresh_used_at` is set. Nothing ever sets it: presenting the successor for refresh
  rotates it, and rotating clears the field.
- **What follows from the literal reading.** A thief and the real device both converge on the same deterministic chain
  forever. Whoever refreshes second presents "the previous token" and gets the same successor. §8's "a sign-in token was
  reused" never happens.
- **Fix:**
  - Access tokens carry the refresh generation (for example `gen`, or the first bytes of `SHA-256(current)`).
  - Set `refresh_used_at` on the first authenticated request made with an access token of the *current* generation, as
    well as on a `/v1/token` call that presents the current token.
- **A client rule that goes with it.** Write the new refresh token to the secure store, and wait for the write to
  finish, *before* the new access token is used for anything. Without this rule, a crash after the first sync call but
  before the Keystore write gets the device revoked and wiped, which is exactly the case review 2 asked to protect.
- **Tests (Miniflare):**
  - Thief refreshes and calls sync, then the real device refreshes: revoked.
  - Real device refreshes and crashes before using the new token, then retries: re-issued.

**Smaller security points:**

- **The owner code:**
  - Its example (S5) is the kind of phrase a Grizzlies fan would pick, and it sits in a public repo.
  - It is case-sensitive, but it is typed into a field labelled `Invite code`. The invite field must send the raw text,
    with no uppercasing and no Crockford clean-up, or the bootstrap fails in a confusing way.
  - The limit is 5 sign-ups per hour *per IP*. While the code is unclaimed, add an account-wide counter on failed
    owner-code attempts (say 20 per hour), so a botnet can't grind a short phrase.
- **The `/tv` page's `approve` scope** must be checked deny-by-default in the router (every route lists the scopes it
  accepts), not by a check on the two allowed routes. Say so in §6.1.
- **A revoked approver.** When a phone is signed out as stolen, flag the TVs it approved in Devices (`approved by a
  device that was signed out`). This is cheap, and it closes the loop on "a stolen phone enrols a TV".
- **`records_prev` keeps "forgotten" plays.** After `Forget my taste`, the encrypted plays stay in `records_prev` for 30
  days. Either have the server drop `records_prev` rows for the parts a `wipe` tombstones, or say in the Forget confirm
  that a copy is kept for 30 days. §8's "what the server knows" should be honest either way.

---

## 4. Sync robustness

**M2. "max" merges ratchet. A wrong clock or one stricter device changes every device, and for the shield it shows
scores.**

**The spoiler shield (`shield/nbaSeen`: `upTo = max`, `ids = union`).**

- `games.js` `setShield()` deliberately *lowers* `upTo` (`Math.min(upTo, now − 12 h)`) and resets `ids` when the shield
  is turned on or made stricter. That makes last night's games unseen again.
- Under max and union, the next pull from any other device restores the higher `upTo` and the old `ids`. Those games
  become "seen" again and their scores show.
- A union of `ids` also can't express "turn the shield on again".
- Separately, a TV whose clock runs ahead (before NTP, or set by hand) pushes an `upTo` in the future. Every device then
  counts every game before that date as seen. The shield is off everywhere until that date, and nobody can see why.
- The spoiler shield is the owner's core feature, so this is a must-fix.

**`rows/forget.upTo = max` has the same ratchet.** A TV clock a month ahead silently drops every play logged for the
next month, on every device.

**Fix (a few lines):**

- Give `nbaSeen` an epoch: `{ since, upTo, ids }`. `setShield` and `revealAll` set `since` to the current time. Merge
  rule:
  - the higher `since` wins wholesale;
  - with the same `since`: `upTo` = max and `ids` = union.
- Every sync answer carries the server's `now`. Clients clamp any `upTo` they write or accept to at most server `now` +
  5 min. The same clamp applies to `forget.upTo`.
- Add both cases to the merge tests:
  - turn the shield on (on device A, after device B revealed a game): the game stays hidden on A after the next pull.
  - a clock running ahead: the future `upTo` is clamped.

**S1. Moving the plays log to `u:` re-runs its migration and duplicates history.**

- In `rows.js` `loadPlays()`, `migrate()` turns `progress` into plays whenever `k('playsFrom')` is missing.
- §4.2a keeps `playsFrom` per provider and per device, and plays become person-wide with a *random* `playId`.
- So every newly signed-in device (the TV after a handover, a friend's second phone) migrates the *synced* `progress`
  again, mints new `playId`s, and the union pushes duplicates. Every past film counts twice or three times in the taste
  profile, and the inflated log syncs back to every other device.
- **Fix, either of:**
  - make migration ids deterministic, `playId = HMAC(idKey, "migrated|" + pid + "|" + itemKey)`, so a union dedupes
    them;
  - when signed in, migrate only during the merge step (§2.6), once per device, and never on a device whose plays came
    from the account.

**S2. Undo granularity: say it.** `records_prev` keeps the *first* predecessor per UTC day. "Undo changes since 20:00"
therefore restores the state at 00:00, and the day's earlier good changes go too. That is acceptable, but:

- the Undo sheet should name it (`Restores each item as it was at the start of <day>`);
- `forget.upTo`'s max means Undo can't bring back forgotten plays. Say that in `Forget my taste`'s confirm.

**S3. `Undo them` on held deletes can't work as written.** It "drops the local deletes and pulls". A pull `since`
returns only *changed* records, so records the server still holds unchanged never come back. Fix: a held delete keeps
the record's plaintext locally (a soft delete) until the person picks one, so `Undo them` is local. Or add
`GET /v1/sync/records?ids=` for a re-fetch.

**S4. `wipe` is per request; make it per collection.** A request with `{ wipe: true }` also waves through any other
dirty deletes batched with it, for example a buggy mass delete in another collection. Send `wipe: ["progress"]`, or
send the confirmed action's records in a request of their own, and have the server check that `wipe` covers only the
collections being emptied.

**Other robustness points:**

- **What happens at the 8 MB cap.** Now that `records_prev` counts toward it, an account near the cap could stop
  syncing for 30 days. Say that the oldest previous versions are dropped first, before any write is refused.
- **The local plays cap and union.** The local log is cut to 2,000 plays (`plays.slice(-2000)`), but the server's
  months are not. Write down that a device never tombstones a part because its own copy is shorter. Union already
  implies it, but a builder pruning locally could get it wrong.

---

## 5. Buildability

- **S6. The secrets step, as written, can't run:**
  - It has no `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` in its `env`. It isn't run through `wrangler-action`, so
    it doesn't inherit them.
  - It has no `working-directory: worker`, so `wrangler.toml` and `node_modules` won't be found.
  - `$HOST` is never defined, which is fatal under `set -u`.
  - A brand-new `workers.dev` host can take a minute to answer. Add a short retry on the health `curl` (and treat a
    failure as "stop", as now).
  - All of these fail closed, so nothing is lost. Fix them so the first run goes green, and keep the
    failing-`secret list` test.
- **Everything else is buildable as written:**
  - the router and schema (`approved_by`, `meta`, `records_prev` keyed by `ver`, the daily cron);
  - the `oneShot` login;
  - the order of §9: crypto vectors, then the Worker, then the TV;
  - the `scoped()` routing table;
  - the platform secret stores.

  §9's list of tests is good. Add the M1, M2 and S1 cases above.

---

## 6. Scores

| Area | Score | Why |
|---|---|---|
| Looks and clarity | 8.5 | The screens say the one thing that matters ("nothing else to sign in to"). `04b` is clear. The step count is honest. The only false sentence is `04b`'s, in the IPv4 / IPv6 case. |
| Ease of use | 8.0 | The TV is OK-and-wait. The phone is four taps (three with open item 1). Merge is asked once, with a snapshot behind it. The other-network step and Safari's confirmation are friction he will feel, and it is acknowledged. |
| Security | 7.5 | The crypto is sound and the inventory of what the server knows is honest. The approval chain, the scoped one-shot, the owner code and the fail-closed CI are good. M1 means the theft check, as specified, never triggers. |
| Sync robustness | 7.0 | Compare-and-set, the guard with its door, client undo, the inventory and `pid` stability are solid. The max ratchets (M2), with the spoiler shield as the visible casualty, the duplicate migration (S1) and the held-delete undo (S3) are real, though each is small. |
| Buildability | 8.0 | The file-by-file plan, the order and the test list are concrete. The CI step needs its env (S6). |
| Brand fit | 8.5 | The kit's sheets, chips and glow are used with restraint, on all three platforms. |
| **Overall** | **8.0** | A design that is close to ready to build. The fixes are spec lines, not rework. |

---

## 7. Lists

### Must fix
1. **Define `refresh_used_at`** (§5.8, §6.1, §6.2):
   - access tokens carry the refresh generation;
   - "used" means the first authenticated call with the current generation (or a refresh that presents the current
     token);
   - the client stores the new refresh token (waiting for the write to finish) before it uses the new access token;
   - two Miniflare tests: a thief then the owner, which must revoke; a crash before use, which must re-issue.
2. **Stop the "max" ratchets** (§4.2, §4.4):
   - `shield/nbaSeen` gets an epoch `since` (set by `setShield` / `revealAll`): the higher `since` wins wholesale, and
     only then `upTo` = max and `ids` = union;
   - sync answers carry the server's `now`, and clients clamp `nbaSeen.upTo` and `forget.upTo` to it + 5 min;
   - tests for "turn the shield on again" and "a clock running ahead".

### Should fix
1. **S1:** make the `progress → plays` migration's `playId` deterministic, or run it only in the merge step, so signed-in
   devices don't duplicate history.
2. **S3:** held deletes keep their plaintext until resolved, so `Undo them` is local (or add a by-ids fetch).
3. **S4:** scope `wipe` to named collections, and send the confirmed action's records alone.
4. **S5:** remove the Grizzlies-flavoured example phrase. Tell him to use four random words (or `openssl rand -base64
   12`). The invite field sends raw text. Add an account-wide failure counter while the code is unclaimed.
5. **S6:** give the secrets step its Cloudflare env, `working-directory: worker`, a defined `HOST`, and a health retry.
6. Reword `04b`'s line so it is true in the IPv4 / IPv6 case: `airglow can't tell this iPhone is on the TV's network,
   so the letters make sure it's your TV.` Use the kit's disabled style on `Sign in the TV` until the letters match.
7. Say what happens at the 8 MB cap (drop the oldest `records_prev` first, before refusing writes).
8. `Forget my taste`: drop the `records_prev` rows of the parts it wipes, or say in the confirm that a copy is kept for
   30 days and Undo can't bring them back.
9. Scopes checked deny-by-default in the router.

### Nits
- Name the start-of-day granularity in the Undo sheet.
- Flag TVs approved by a device that was later signed out.
- §4.2a: list `stremioApi`, `stremioLink`, `tmdbImg` with the overrides, and say where the TMDB key lives under `u:`
  and that sign-out clears it.
- §4.2a: name `PKEY` and `homePage` in `rows.js` as the two direct `a:${S.acc.id}` uses to route through `scoped()`.
- §3.2: say plainly that the three-letter match is checked on the phone, not the server (it is implied).
- State that the local 2,000-play cut never tombstones server parts.
