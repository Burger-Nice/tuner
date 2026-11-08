# airglow: error reports (Sentry), v1.5 plan

## Change history

**v1.5 (an answer to the fifth independent review, 7/10)**
1. `message` is kept only on known problem kinds. The browser SDK copies thrown strings and stack-less DOMExceptions into it.
2. Our own errors send **their code only**, never their message:
   - `AppError`, `AcctError` and `AddonError` set `name` and `prototype.ours`, and are classic globals, so `instanceof` works.
   - `core.js`'s messages become codes, and a `WORDS` table turns them back into text for the screen.
3. Each exception in a cause chain is decided against its own object. Anything unmatched keeps its type only.
4. Frames are normalised to `app:///` first and exempt from the later rules. `in_app` is set on the device.
5. With nothing free-text left, the localStorage secret list is gone. Strict engine-message templates ("Cannot read properties of undefined (reading 'x')") are kept, because they're the clue in the commonest JS bug.
6. Windows: `installHeaderRewrite` skips the Sentry and fake-ingest hosts, so the provider's custom User-Agent never rides on a report.
7. Java:
   - It walks the real throwable chain, and `codeFor` takes the subclass and in-app facts.
   - It sets `release`, `dist` and `environment` (`REPORTS_ENV`).
   - `sendClientReports` is off.
   - The flag is written at every start and excluded from backup.
   - Turning reports on takes effect at the next start, and the row says so.
   - The test crash hook only exists when `REPORTS_TEST` is set.
8. One committed DSN in `reports.json`, read by `build-web.js`, Gradle and `main.js`.
9. CI runs only `--tests app.tuner.player.ReportsTest`. The five older JVM tests are left as they are.
10. `play-failed` with `stage: start` when `native.play` rejects. `heapMb` goes to native with `screen`, for `webview-gone`. The connection-check facts allow enum strings.
11. §5 adds ANRv2 main-thread frames.

**v1.4 (an answer to the fourth independent review, 7/10)**
1. **"Ours" is decided by class only.** An error counts as ours when it's an `AppError` (new, used for `core.js`'s
   `new Error(…)`), an `AcctError`, an `AddonError`, or carries `e.ours = true`.
   - Capacitor plugin rejections are foreign, even with a `code`. So is Stremio's own error text, which `apiErr` wraps:
     its message becomes `stremio-<code>`.
   - Rule 3 also blanks email addresses.
2. **Windows main-process crash files (D11) move to v2.** The Windows app is still being built, and main crashes are
   rare. So `main.js` gets no `uncaughtException` handler, and its behaviour really is unchanged.
3. **Java's message mapping is a pure function** `codeFor(className, errorCodeName, responseCode)`, tested without
   Android or Media3 objects. `unitTests.returnDefaultValues = true` is the fallback.
4. **`last-exit` is sent only when `importance <= IMPORTANCE_VISIBLE`.** Background kills when he switches apps aren't
   bugs.
5. **Facts.**
   - The Xtream stream id is dropped (no channel identity, as promised).
   - `lastCause` is the cause **id** only.
   - Native `diag.check` results pass the same schema filter.
   - `play-failed` gains `redirected`, `scheme` and `sameHostAsLogin` (true/false).
   - `sync-stopped` gains `status` (HTTP), `phase` (`pull|push|merge`), and the `waiting`/`held` counts.
6. **Plumbing.**
   - `postinstall` chains `fetch-mpv.js && build-sentry.js`.
   - Both of `build-web.js`'s inserts (the head and the `TUNER_TEST` replace) move before `vendor/sentry.js`.
   - The DSN check is `cfg.dsn != null`.
   - Windows gets `env` in `build-info.json` from `GITHUB_REF_NAME`.
   - Switching off calls `Sentry.close()` and clears native's cache at once.
   - `mock-sentry.js` answers with `Access-Control-Allow-Origin: *`.
7. **Cut, since strict "ours" makes the secret list a second net only:**
   - the M3U playlist scan
   - base64 add-on decoding
   - the local Playwright leak test (the emulator test is the proof)

   Also added to the list: `tuner.info:*` hosts.

**v1.3 (an answer to the third independent review, 6.5/10)**
1. **JS messages are replaced by type, as Java's already are.**
   - JSON `SyntaxError` becomes `json`. A URL `TypeError` becomes `uri`. A `DOMException` keeps only its name.
   - A fetch `TypeError` becomes `network`.
   - Messages from our own code are kept, then scrubbed. These are errors made with `new Error('…')` in `app/`, marked
     by a `code` field or a constant message.
   - This closes partial-secret leaks: V8's JSON errors quote fragments, and Safari's URL errors quote the whole input.
2. **Java has no scrubber port.**
   - It keeps messages only for JVM-made types (`NullPointerException`, `ClassCastException`, `IndexOutOfBounds*`,
     `ConcurrentModificationException`, `ArithmeticException`, `IllegalStateException` from our own `throw`s).
   - Everything else becomes its reason code or class name.
   - `reports({on})` only. No hosts, no `mem`, and no Base64 or org.json in JVM tests.
3. **Windows plumbing goes through `webPreferences.additionalArguments`** (packaged, version, dist, DSN override).
   `--smoke-test` and `AIRGLOW_TEST` never use the real DSN.
4. **The DSN order is written down** (D9). The simulator gets a disabled DSN, and local native builds are tagged
   `environment: dev`.
5. **CI.**
   - The scrub test runs in the `accounts` job.
   - The Java unit test runs as `testDebugUnitTest` in the `android` job.
6. **The JS transport uses `window.CapacitorWebFetch`.** CapacitorHttp is on, and would otherwise reroute Sentry's
   requests through native.
7. **Smaller fixes.**
   - Manifest `tools` namespace, and removal of both Sentry providers.
   - A static last `Diag` cause for `info()`.
   - `last-exit` keeps only low memory, native crash and signalled.
   - A fingerprint for unhandled errors.
   - Exception `module` is kept.
   - "Allowed Domains" stays `*`.
   - `sync-stopped` reads `syncStatus().error` only.
   - Add-on ids are tightened.
   - The access token isn't put on a global.
   - The hourly cap per kind is dropped.
8. **More facts for real bugs.**
   - `play-failed` gains codec, resolution, frame rate, HDR, decoder name, reconnects and custom UA.
   - `sync-stopped` becomes the real exception (stack kept, value = its name), after 2 failures in a row.
   - `webview-gone` gains player state, uptime, recreates, low-RAM flags, memory, `offscreenPreRaster` and the last
     screen.

**v1.2 (second review, 6/10):**
- M3U secrets come from the account URL, and channel ids are never sent.
- No free text: fixed fact schemas.
- The TV's `play-failed` is sent from Java.
- The TV gets its own plugin method, `BuildConfig` DSN and auto-init off.
- `build-web.js` copies `vendor/` and injects before the first script.
- The secret list is built at send time.
- Windows doesn't use `@sentry/electron`.
- One SDK, a full allowlist, `webview-gone` and `last-exit`, and `dist`.

**v1.1 (first review, 6/10):**
- Native owns its own init.
- The iPhone is JS-only.
- Windows minidumps are off.
- Links, hosts, encoded forms and add-on segments are scrubbed.
- Handled problems and "Send a report now" were added.
- The leak test was hardened.

## 0. The idea in one paragraph

When something breaks on the owner's TV, iPhone or Windows laptop, airglow sends a short report to Sentry. It also
sends one when something fails without crashing:
- a channel won't play
- sync keeps stopping
- the TV app reloads itself

A report holds:
- what went wrong (its type)
- where in our code (the stack)
- the app version and device
- a fixed set of safe facts and our own notes

The provider's username and password live inside every stream link, so the rule is that **no link, no provider or
add-on address, no channel identity and no secret ever leaves the device**. Four layers enforce it:
- almost nothing is collected
- outside messages are replaced by their type, every report is rebuilt from an allowlist, and his actual secrets and
  any links are blanked
- Sentry's server-side scrubbing
- a leak test that plants secrets and fails the build if any sent byte contains them

He can switch reports off per device, or send one by hand. Claude reads them through the Sentry connector.

## 1. Decisions, with reasons

**D1. One Sentry project, `airglow`, in the owner's organization `biggi-qu`.**
- The data is stored in the EU (`de.sentry.io`).
- Tags: `app: tv | iphone | windows`, and `side: js | native | main`.
- One project means a bug in the shared `app/tv/js` groups as one issue.

**D2. Errors and handled problems only.**
- Not used: tracing, Session Replay, profiling, logs, the feedback widget, sessions and minidumps.
- **JS (`@sentry/browser` 11.11.0, on all three apps):**
  - `defaultIntegrations: false`, `sendClientReports: false`.
  - `integrations: [globalHandlersIntegration(), dedupeIntegration(), linkedErrorsIntegration()]`.
  - `tracesSampleRate` is unset.
  - `transport: (o) => makeFetchTransport(o, window.CapacitorWebFetch || window.fetch.bind(window))`.
  - The v11 option names are checked against the package's types in step 1.
- **TV native (`io.sentry:sentry-android-core` 8.63.0, D5):**
  - Session tracking is off.
  - Activity-lifecycle, app-component, system-event, network-event and user-interaction breadcrumbs are off.
  - `attachScreenshot`, `attachViewHierarchy` and `attachAnrThreadDump` are off.
  - `sendDefaultPii` stays false.
  - ANR detection is on.
  - No Gradle plugin.
- **iPhone:** JS only.
- **Windows:** the renderer has JS only, and the main process has no SDK (D11).

**D3. What a report may hold.**
- `beforeSend` rebuilds the event from this allowlist, after the scrubber:
  - `event_id`, `timestamp`, `level`, `platform`, `release`, `dist`, `environment`, `fingerprint`
  - `message`
  - `exception.values[]`: `type`, `value`, `module`, `mechanism.{type,handled}`, and `stacktrace.frames[]` with
    `{filename, abs_path, function, module, lineno, colno, in_app}`
  - `tags` (`app`, `side`, `screen`, `kind`)
  - `contexts.os.{name,version}`
  - `contexts.device.{model,manufacturer,free_memory,low_memory}`
  - `contexts.app.{in_foreground}`
  - up to 20 breadcrumbs of category `note`
  - `extra.facts`
- Everything else is dropped, including `user`, `culture`, `request` and `server_name`.
- **`message`** is kept only on `captureMessage` events whose text is a known problem kind (D10). It's deleted
  everywhere else, because the browser SDK copies thrown strings and stack-less `DOMException`s into it.
- **`in_app` is set on the device:** frames under `app:///vendor/` or `node_modules/` are false, all other `app:///`
  frames are true.
- **Unhandled errors get `fingerprint` = type + the top in-app frame** (`file:function`), and that's also the device
  dedupe key.
- `note(word, facts)` and `problem(kind, facts)` accept only the facts in their schema (numbers and enum strings).

**D4. The JS scrubber**, `app/tv/js/report-scrub.js`.
- It's a classic IIFE setting `window.AirglowScrub`, plus `module.exports`, written like `core.js`.
- **Step 0, frames first.** Every frame's `filename`/`abs_path` from the app becomes `app:///<path>`, with the query
  dropped:
  - `https://localhost/…`, `http://localhost/…`, `capacitor://localhost/…`
  - `file:///…/app/…`

  A frame from anywhere else becomes `<link>`. After this, `filename`, `abs_path`, `module` and frame
  `function`/`lineno`/`colno` are exempt from the later rules, so grouping can't be broken by a match inside code names.
- **Step 1, each exception decided on its own.** The event's `exception.values[]` (Sentry orders them innermost-last) is
  matched against the real objects: `hint.originalException`, then its `.cause` chain and `AggregateError.errors`.
  Each value is replaced:

  | Error | Becomes |
  |---|---|
  | **Ours:** an `AppError`, `AcctError` or `AddonError` (each sets `this.name` and has `prototype.ours = true`) | its **code only**: `AppError.code`, `AcctError.code`, `AddonError.kind`. Never its message. |
  | `SyntaxError` from JSON parsing | `json` |
  | `TypeError` from `fetch`, or "Failed to fetch" / "Load failed" / "NetworkError" | `network` |
  | `TypeError` / `DOMException` about URLs ("Invalid URL", "is not a valid URL", "Failed to construct 'URL'") | `uri` |
  | any other `DOMException` | its `name` |
  | an engine message matching a strict template, with every identifier at most 40 characters of `[\w$.]` | kept as is. The templates: V8 `Cannot read properties of (undefined\|null) \(reading '[\w$]+'\)`, V8 `[\w$.]+ is not (a function\|defined\|iterable)`, JSC `undefined is not an object \(evaluating '[\w$.]+'\)`, JSC `[\w$.]+ is not a function` |
  | anything else, including Capacitor plugin rejections, Stremio's own text (`apiErr` gives `AddonError` kind `stremio-<code>`), and any value not matched to an object | its type only |

  - The classes are classic globals, so `instanceof` works before the modules load. `report-scrub.js` defines `AppError`
    as `window.AppError`. `acct.js` and `addons.js` extend it rather than `Error`.
  - `core.js`'s `new Error('…')` calls become `new AppError('<code>')`. A screen that shows the text looks the code up
    in a small `WORDS` table, the same way `AcctError` already works. `core.js:202`'s provider status becomes the code
    `account-<status>`, where status is an enum of `Active`/`Banned`/`Disabled`/`Expired`, and `other` for anything
    else.
- **Step 2, the last net** on what remains: messages (now codes), notes, fact strings and tags. It needs no secret list:
  1. Every `scheme://…` (also `\/`-escaped), every `/(live|movie|series|timeshift|streaming)/…` path, and every
     `host:port/…` becomes `<link>`.
  2. 24+ character letter-digit runs, and `password|username|token|key|auth|apikey=` values, become `<key>`.
  3. Email addresses become `<email>`.
  4. `C:\Users\<name>\` and `C:/Users/<name>/` become `C:\Users\~\`.
- **If it throws, the event is dropped.**
- v1.4's secret list built from localStorage is gone. After steps 0–1, no free text is left for it to guard, and the
  emulator leak test (§3) is the proof.

**D5. TV native.**
- **Init:** `app.tuner.player.App extends Application` (in the manifest as `android:name=".App"`) calls
  `SentryAndroid.init` in `onCreate`. It only does so when `BuildConfig.REPORTS_DSN` isn't empty and SharedPreferences
  `reports` is on (default on).
- **The manifest:**
  - `xmlns:tools` is added.
  - `<meta-data android:name="io.sentry.auto-init" android:value="false"/>`.
  - `io.sentry.android.core.SentryInitProvider` and `io.sentry.android.core.SentryPerformanceProvider` are both removed
    with `tools:node="remove"`, with authorities `${applicationId}.SentryInitProvider` / `.SentryPerformanceProvider`.
- **The DSN and identity:**
  - The real DSN is committed once, in `reports.json` at the repo root (it's public). `build-web.js` and Gradle both
    read it.
  - Gradle makes it `buildConfigField "String","REPORTS_DSN"`, alongside `GIT_SHA` and `REPORTS_ENV`, with
    `buildFeatures.buildConfig true`.
  - `-PreportsDsn=` overrides it for test builds only: the emulator gets `http://k@10.0.2.2:8791/1`.
  - Local debug builds (no `-PtunerVersionCode`) get an empty DSN, so there's no native Sentry.
  - `REPORTS_ENV` comes from `-PreportsEnv`, which CI sets to `production` when `GITHUB_REF_NAME == main`, else `dev`.
  - In `App`: `options.setRelease("airglow@" + VERSION_NAME)`, `setDist(GIT_SHA)`, `setEnvironment(REPORTS_ENV)` and
    `setSendClientReports(false)`.
- **JS → native:** `@PluginMethod reports({on, screen, heapMb})`.
  - JS calls it at **every start** and on each change, so the two flags can't drift.
  - The native flag lives in a SharedPreferences file excluded from backup (`data_extraction_rules`/`fullBackupContent`).
  - Off: `Sentry.close()` and deletes Sentry's cache directory at once.
  - On: takes effect at the next launch. The row's subtitle says so ("TV crashes are reported from the next start").
- **The crash hook for the emulator test** exists only when `BuildConfig.REPORTS_TEST` is true (`-PreportsTest`,
  emulator build only). It's the `reports({crash:true})` method, which throws `RuntimeException("<stream link>")` on the
  next player start.
- **`info().lastCause`:** a static the player's `Diag` updates with the cause **id** only (e.g. `provider-down`), never
  its title or lines.
- **`beforeSend` in Java (`Reports.java`, about 80 lines).**
  - It walks `event.getThrowable()` and its `getCause()` chain alongside `event.getExceptions()`. It matches them by
    position, checking that the class names agree, and does that order check in step 1.
  - For each throwable it calls a pure static `codeFor(String fullClassName, boolean isSubclassOfHttpDataSourceException,
    String errorCodeName, int responseCode, boolean inAppTop)`. The caller works out the subclass and `inAppTop` facts
    from the real object, so `ReportsTest` needs no Android or Media3 objects.
  - A `SentryException` with no matching throwable gets its class name only. So do ANRs, which have no throwable.
  - The rules:
  - These keep their message: `NullPointerException`, `ClassCastException`, `IndexOutOfBoundsException` (and its
    subclasses), `ConcurrentModificationException`, `ArithmeticException`, and `IllegalStateException` /
    `IllegalArgumentException` when their top frame is in `app.tuner`.
  - Media3 `PlaybackException` becomes `getErrorCodeName()`.
  - `HttpDataSource.InvalidResponseCodeException` becomes `http-<code>`.
  - Other `HttpDataSourceException`, `UnknownHostException`, `ConnectException`, `SocketTimeoutException`,
    `SSLException`, `FileNotFoundException`, `JSONException`, `URISyntaxException` and `ParserException` become their
    reason codes (`dns`, `refused`, `timeout`, `tls`, `404`, `json`, `uri`, `parse`).
  - Any other message becomes the class name.
  - Then the D3 allowlist.
  - `beforeBreadcrumb` keeps category `note` only.
- **Reason codes at the source:** `TunerPlayerPlugin` `:209` and `:230`, and `Probe` `:258`.
- **Reports Java sends itself:**
  - **`play-failed`:** from `PlayerActivity`'s give-up paths (about `:488` and `:2131`), with the D10 facts and
    `stage: 'playing'`.
    - When `native.play` itself rejects before the player opens (`LIST`, nothing to play, a bad playlist), JS sends
      `play-failed` with `stage: 'start'` and the rejection's code.
  - **`webview-gone`:** in `MainActivity.onRenderProcessGone`, before `recreate()`. Facts:
    - `didCrash()` and `rendererPriorityAtExit()`
    - whether `PlayerActivity` is up
    - process uptime in minutes
    - recreates in this process
    - `ActivityManager.isLowRamDevice()`, plus `availMem` / `totalMem` in MB
    - the `offscreenPreRaster` setting
    - the last JS screen and JS heap MB (`performance.memory`, where it exists), sent to native by `reports({screen, heapMb})` on each screen change
  - **`last-exit`:** at start, the newest unreported `getHistoricalProcessExitReasons` entry (API 30+).
    - It's sent only when `importance <= IMPORTANCE_VISIBLE` (he was using the app; background kills while he was
      elsewhere aren't bugs).
    - Only when the reason is `REASON_LOW_MEMORY`, `REASON_CRASH_NATIVE` or `REASON_SIGNALED`.
    - With `pss`/`rss`, importance, and `isLowMemoryKillReportSupported()`.
    - Java crashes and ANRs come from Sentry itself.

**D6. Caps.**
- The same fingerprint at most once every 10 minutes.
- At most 30 reports a day per device.
- Test builds turn the caps off.
- JS drops reports while offline. Android's disk cache is `maxCacheItems` 10, cleared when reports are turned off.
- On the server: the key's rate limit is 60 an hour, and spike protection is on.

**D7. Sentry server side.**
- Data Scrubber on, with the defaults.
- "Prevent storing of IP addresses" on.
- "Store Native Crash Reports" off.
- "Allowed Domains" stays `*` (Electron and Capacitor send no usable Origin).
- Advanced Data Scrubbing on `$message`, `$error.value` and `$breadcrumb` (not `$string`) removes:
  - `/(live|movie|series|timeshift)/[^/]+/[^/]+/`
  - `(password|username|token|key|auth)=[^&\s]+`
  - `(realdebrid|alldebrid|premiumize|debridlink|torbox)=[^/|&\s]+`
  - `[a-z][a-z0-9+.-]*://\S+`
- An email alert for new issues goes to the owner, so he knows when there's something to tell Claude about.

**D8. Off switch, and sending one by hand.**
- **Account › App: "Send error reports · On"**, with "Errors only. Never your passwords, links or what you watch."
  under it.
  - It's per device: `reportsOff` in `core.js` `DEFAULTS`, not synced.
  - Off means:
    - JS doesn't init, or calls `close()`.
    - Native calls `Sentry.close()` at once (through `reports({on:false})`) and clears its cache.
- **Account › App: "Send a report now"** sends a `problem('manual')` with:
  - the last 20 notes
  - the screen
  - the last `conncheck` result (pass or fail per step, and ms). On the TV this comes from native `diag.check`, and it
    passes the same schema filter (step ids, booleans, numbers, and enum strings such as `net.type`).
  - `liveFormat`, `player` and the quality cap
  - on the TV, `info().lastCause` (an id)

  The toast says "Sent. Tell Claude it's in."
- **Friends:** on by default for everyone, as on the owner's own devices (his call, 8 Nov). The switch is in Account.

**D9. Builds.**
- **The JS SDK.** `@sentry/browser` 11.11.0 and `esbuild` are devDependencies, pinned exactly.
  - `scripts/build-sentry.js` makes `app/vendor/sentry.js` (gitignored): a minified IIFE with
    `--target=chrome87,safari14`, exposing `window.Sentry` with the functions used.
  - `postinstall` becomes `node scripts/fetch-mpv.js && node scripts/build-sentry.js`.
  - `build-web.js` builds it if missing and copies `app/vendor/` into `www/vendor/`.
  - Both of `build-web.js`'s inserts (the head block and the `TUNER_TEST` replace, both before
    `<script src="core.js">` today) move before `vendor/sentry.js`.
- **Load order in all three HTML files:**
  1. the injected config
  2. `capacitor.js` and `test-boot.js` where present
  3. `vendor/sentry.js`, `report-scrub.js`, `report-boot.js`
  4. `titles.js`, `core.js`, `nba.js`
  5. the modules

  `build-web.js`'s injection point moves to before `vendor/sentry.js`. `reports.js` (ESM) gives `note()`, `screen()`
  and `problem()`.
- **The injected config, `window.TUNER_REPORTS = {release, dist, dsn, env, test}`:**
  - **TV and iPhone:** written by `build-web.js` from `VERSION`, `GITHUB_SHA`, `TUNER_REPORTS_DSN` and `TUNER_TEST`.
  - **Windows:** `main.js` passes `--airglow-reports=<base64 JSON>` through `webPreferences.additionalArguments` to every
    window. The JSON holds:
    - `packaged`: `app.isPackaged`
    - the version, from `package.json`
    - `dist`, from a `build-info.json` CI writes into `app/`
    - `dsn` from `AIRGLOW_REPORTS_DSN` (test runs only)
    - `test`, when `AIRGLOW_TEST` or `--smoke-test` is set

    `preload.js` reads it from `process.argv`, as it already reads `--airglow-overlay`, and exposes it as
    `window.tuner.reports`.
  - `main.js` `installHeaderRewrite` skips requests to `*.sentry.io` and the fake ingest, so the custom User-Agent never rides on a report.
- **Which DSN `report-boot.js` uses, first match wins:**
  1. `dsn` from the config, when `cfg.dsn != null`. CI's emulator and Windows test builds set the fake ingest. The iOS
     simulator build sets `''`, which means off.
  2. `test` set → off.
  3. A native platform (`Capacitor.isNativePlatform()`), or `packaged` on Windows → the real DSN from `reports.json`
     (committed, public by design). `build-web.js` writes it into the config; `main.js` reads it for Windows.
  4. Otherwise (a browser, `serve.sh`, Playwright, `npm start` unpackaged) → off.
- **Environment:** `production` when CI built it from `main`, otherwise `dev`. That includes the owner's local
  `npx cap run` builds. Windows gets `env` in `build-info.json`, which CI writes from `GITHUB_REF_NAME`.
- **Nothing is uploaded,** so there's no auth token in CI. `minifyEnabled false` stays.

**D10. Handled problems** (`captureMessage(kind)`, `fingerprint: ['problem', kind, <one enum fact>]`, `extra.facts`).
- **`play-failed`** (Java on the TV; JS on the iPhone and Windows):
  - what was playing: `live|vod|catchup|addon`
  - the source: `xtream|m3u|addon`
  - the container
  - the engines tried
  - the HTTP status
  - the error class (`getErrorCodeName()`, the mpv class, `MediaError.code`)
  - the TV's `Diag` cause id
  - the video format: `sampleMimeType`, `codecs`, height, frame rate, and HDR (colour transfer)
  - the decoder name from `DecoderInitializationException`
  - live reconnects
  - whether a custom UA is set
  - `liveFormat`, `player`
  - stalls in the last minute
  - `redirected`, `scheme` (`http|https`), and `sameHostAsLogin` (true/false)
  - No channel or stream id, ever.
- **`sync-stopped`:**
  - Sent after 2 failures in a row, not counting `offline`.
  - It's sent as `captureException(e)` with its value replaced by its type, so the stack is kept.
  - Facts:
    - `code`: `syncStatus().error`
    - `status`: the HTTP status, from `AcctError`
    - `phase`: `pull|push|merge`
    - the `waiting` and `held` counts
  - It never sends `detail` or `e.message`.
- **`guide-empty`:** channels, how many with EPG, the fallback used, and the clock offset in hours.
- **`addon-failed`:**
  - the manifest `id` only when it matches `^[a-z0-9.-]+$`, holds no segment of 12+ characters that contains a digit,
    and isn't UUID-like
  - otherwise `other`
  - the resource, the HTTP status, and the ms
- **`webview-gone`, `last-exit`:** D5.
- **`manual`:** D8.

**D11. Windows main process: v2.**
- v1 reports from the Windows renderer only. That covers the pages, the player's JS, and play failures with mpv's
  failure as a class (`dns`, `refused`, `http-<code>`, `decoder`, `exit-<code>`). mpv's stderr is never sent.
- `main.js` gets no crash handler in v1, so its behaviour is unchanged.
- v2, if Windows main crashes turn out to matter: `process.on('uncaughtExceptionMonitor')` and `render-process-gone`
  write reason codes to a pending file, which the renderer sends at its next start.

## 2. What changes in which file, in order

1. **SDK and plumbing:**
   - `package.json` (devDependencies, `postinstall`)
   - `scripts/build-sentry.js`, `.gitignore`
   - `build-web.js`: copy `vendor/`, the injection point, `TUNER_REPORTS`
   - `main.js`/`preload.js`: `--airglow-reports`, `build-info.json`
   - `android/app/build.gradle`: `sentry-android-core` 8.63.0, `buildConfig`, `REPORTS_DSN`, `GIT_SHA`
   - the manifest (D5)
   - `App.java`
   - `build.yml`:
     - the real DSN for release
     - the fake ingest for the emulator and Windows tests, and off for the simulator
     - `GITHUB_SHA`
     - `./gradlew testDebugUnitTest --tests app.tuner.player.ReportsTest` in the `android` job (the five older JVM tests are left alone)
     - the scrub test in the `accounts` job

   Prove on CI (`tests=both`, then `tests=windows`):
   - one forced error per app at the fake ingest
   - the APK growth
   - that the transport works through `CapacitorWebFetch`
2. **`report-scrub.js`** and **`tests/report-scrub-test.js`**.
3. **`report-boot.js`**, **`reports.js`**, and the script tags. `screen()` is called from `tv/js/router.js`,
   `phone/ui.js` and `desktop/ui.js`.
4. **Native:**
   - `Reports.java` (`beforeSend`, `play-failed`, `webview-gone`, `last-exit`)
   - `ReportsTest.java`
   - `reports({on,screen})`, and `lastCause` in `info()`
   - the reason codes in `TunerPlayerPlugin` and `Probe`
   - the calls in `PlayerActivity` and `MainActivity`
   - `Ui.note`
5. **Windows:**
   - `--airglow-reports` in `main.js`/`preload.js`
   - mpv's failure classes in `mpv.js` → `player.js`
   - `AppError` in `core.js`, and `ours` / `AddonError` in `addons.js` (`apiErr` → `stremio-<code>`)
6. **The Account rows** on all three apps.
7. **`note()` and `problem()` calls** in:
   - `player.js` (the iPhone and Windows)
   - `account/sync.js`
   - `guide.js`
   - `addons.js`
   - the update check
   - `rows.js`
   - `conncheck.js` (keep its last result)
8. **`CLAUDE.md` / `NEXT.md`:** reading reports through the Sentry connector (project `airglow`).

## 3. How it's proved before any release

- **The scrub test** (`tests/report-scrub-test.js`, CI's `accounts` job; it needs no dependencies).
  - It feeds events with real-shaped secrets in every field, object keys, `extra` and `fingerprint` included:
    - Xtream links (raw and `\/`-escaped)
    - `player_api.php` and M3U `get.php` links
    - an M3U channel id that is a link
    - a foreign error (a `TypeError`) whose message quotes a pasted M3U line with a CDN host and token (it must keep only its type)
    - a password with `@+#`, raw and encoded
    - a bare host
    - Torrentio `providers=…|realdebrid=KEY` and `/resolve/realdebrid/KEY/`
    - an add-on transport URL with a key segment
    - an add-on id with a UUID or hash
    - the username in a sentence
    - the Stremio email
    - a rejected plain object
    - both `C:\Users` forms
  - It also feeds **partial secrets**:
    - a V8 `JSON.parse` message quoting 10 characters from the middle of a password
    - Safari's `"…" is not a valid URL` quoting a whole link
    - a 60-character cut ending mid-key
  - It asserts that none survive (step 1 must replace them by type), and that frames, types, line numbers, our own
    messages and `manifest.json` stay intact.
  - It also checks that off-schema facts are dropped.
- **`ReportsTest.java`** (JVM, `testDebugUnitTest --tests app.tuner.player.ReportsTest`, no Android stubs needed) checks:
  - the message rules for each exception class
  - that a link in a `RuntimeException` message leaves only the class name
- **The end-to-end leak test, in the TV emulator job.**
  - `tests/mock-sentry.js` is the fake ingest on `:8791`. It gunzips and keeps every envelope's bytes.
  - The test build signs in to the fake provider with password `p@ss+Zq7#r9`, user `u-Hk29x`, an M3U account
    (`m3utok-Pq83Lz` in its link), and an add-on (`rdkey-Mx41Tq9`).
  - A `TUNER_TEST`-only hook forces, with the caps off:
    - an Error whose message is a stream link
    - a rejection holding the add-on link
    - a fetch to a dead host
    - a `JSON.parse` of a body holding the password
    - an M3U play failure
    - "Send a report now"
    - last, a native crash in `PlayerActivity` with a link in its message, then a relaunch
  - It greps every byte for the four secrets (raw, encoded, `\/`, and any 6-character slice of them), the fake host and
    `/live/`. It fails on any hit, or if any forced report is missing.
- `mock-sentry.js` answers every request with `Access-Control-Allow-Origin: *`, so the WebView's fetch resolves.
- The scrub test also checks that:
  - a `CapacitorException` with a `code` and a link in its message keeps only its type
  - Stremio's error text becomes `stremio-<code>`
  - an `AcctError` sends its code, never its message
  - a thrown string and a stack-less `DOMException` leave no `message`
  - a foreign `SyntaxError` as the `cause` of an `AppError` becomes `json`
  - a frame path containing a word that looks like a username stays intact
  - `Cannot read properties of undefined (reading 'title')` is kept, and the same template with a 60-character identifier is not
- **One real report per app,** after the project exists. Read it back with the Sentry connector, check the frames and
  that nothing secret arrived, then resolve it.

## 4. Research (8 Nov)

- `@sentry/capacitor` 4.5.0 starts the native SDK from JS `init`, replacing options set in Java, and pins JS 10.76.2.
  So it isn't used.
  - https://github.com/getsentry/sentry-capacitor
  - https://docs.sentry.io/platforms/javascript/guides/capacitor/configuration/options/
- `@sentry/browser` 11.11.0 is the latest (npm, 8 Nov). It ships no script bundle on npm (checked with `npm pack
  --dry-run`), hence the esbuild step. https://docs.sentry.io/platforms/javascript/install/cdn/
- `@sentry/electron` 8.3.0 brings `@sentry/node`, minidumps and IPC plumbing, so it isn't used (D11).
  https://docs.sentry.io/platforms/javascript/guides/electron/
- `io.sentry:sentry-android-core` 8.63.0 (Maven Central, 8 Nov).
  - Options: https://docs.sentry.io/platforms/android/configuration/options/
  - Manual init: https://docs.sentry.io/platforms/android/configuration/manual-init/
  - OkHttp recording comes only with the Gradle plugin or the interceptor:
    https://docs.sentry.io/platforms/android/integrations/okhttp/
- Sensitive data: key-based scrubbing can't see secrets in URL paths:
  https://docs.sentry.io/platforms/javascript/data-management/sensitive-data/
- `window.CapacitorWebFetch` is Capacitor's saved original fetch when CapacitorHttp is on (it's in
  `@capacitor/android`'s `native-bridge.js` in this repo's `node_modules`, 8 Nov).
- Exit reasons: https://developer.android.com/reference/android/app/ActivityManager#getHistoricalProcessExitReasons(java.lang.String,%20int,%20int)
- The WebView renderer dying: https://developer.android.com/reference/android/webkit/WebViewClient#onRenderProcessGone(android.webkit.WebView,%20android.webkit.RenderProcessGoneDetail)
- Quotas and spike protection: https://docs.sentry.io/pricing/quotas/
- **Where this departs from Sentry's defaults, and why:**
  - errors and handled problems only
  - no automatic breadcrumbs, contexts, sessions or minidumps
  - outside messages replaced by type
  - an allowlist rebuild of every event
  - links, hosts and channel identities removed
  - no SDK in Electron's main process

  The app's secrets live in link paths, host names, M3U channel ids and fragments quoted by parser errors. No default
  scrubber recognises any of these.

## 5. To settle in step 1

- The APK growth.
- The v11 option names.
- That the transport works through `CapacitorWebFetch`.
- That the three kept JS integrations catch `unhandledrejection` in the Android WebView and WKWebView.
- That `beforeSend` sees ANR events, and that an ANRv2 event still has main-thread frames after the allowlist. If it doesn't, copy the main thread's frames into the exception.

## 6. Out of scope for v1

- The Cloudflare Worker: its logs are readable through the Cloudflare connector.
- Performance tracing.

## 7. The owner's answers (8 Nov)

1. Build it now. The leak test is the proof, and the built code gets an independent code review before any release.
2. Create the Sentry project `airglow` in `biggi-qu` (EU), with the D7 settings and the new-issue email.
3. Friends: on by default.

## As built (8 Nov), and where it differs from the plan

- **Where reports go:**
  - The real address is only in builds from `main`, in the installed app.
  - Everything else sends nothing: `tv-redesign` CI builds, local `npx cap run` builds, `npm start`, browsers and every
    test.
  - To try the real project from a dev build, set `TUNER_REPORTS_DSN`, `AIRGLOW_REPORTS_DSN` or `-PreportsDsn` on
    purpose.
  - This is stricter than D9, after the code review: the owner's rule is that dev and test builds never reach it.
- **JS (`@sentry/browser` 11.11.0):**
  - `enhanceFetchErrorMessages: false`. v11 rewrites fetch errors to add the host by default, which would put the
    provider's address in reports and change the app's own messages.
  - `attachStacktrace: false`, or `captureMessage` problems come through as exceptions.
  - The esbuild target is `es2020`: esbuild refuses `chrome87,safari14` for the SDK's code. The TV's WebView is current
    Chrome.
  - The bundle is 93 KB (32 KB gzipped).
- **Our errors and their codes:**
  - `core.js` throws `AppError(code, text)`, built by its `fail()` helper. The text shows on screen as before, and
    reports carry the code (`wrong-login`, `server-http-403`, `playlist-empty`…).
  - `AcctError` and `AddonError` extend it.
  - `AddonError` keeps no `.code`, because the TV's Stremio sign-in uses `.code` to recognise Stremio's own answers.
    Stremio's errors report `stremio-<code>`.
- **Engine messages:**
  - A `reading`/`setting` key must be a plain identifier: no dots and no numbers, since a run-time key can be a host or
    a stream id.
  - The net also blanks bare host names that end in a common top-level domain.
- **Native:**
  - `Reports.java` with `App.java`, and the plugin's `reports({on, screen, heapMb, crash})`.
  - The emulator test's forced crash is a background-thread `RuntimeException` carrying a stream link (test builds
    only). CI restarts the app so Sentry sends it, and the leak check requires it.
  - The plugin's on-screen reject texts are unchanged ("Bad playlist: …", "Could not download the update: …"): plugin
    rejections reach Sentry as their type only. `playable`'s reject and `Probe`'s `why` carry reason codes, since nothing
    shows them.
  - The APK grows by 2.8 MB.
- **Problems actually sent:**
  - `play-failed`: TV from Java, with the `Diag` cause, format and decoder. iPhone and Windows from their players. A TV
    start failure comes from JS.
  - `sync-stopped`: after 2 failures in a row.
  - `guide-empty`: once a session, when 20 channels' guides came back and 60% or more were empty.
  - `addon-failed`: when an add-on turns Not answering, or stops being an add-on.
  - `webview-gone` and `last-exit`.
  - `manual`.
- **After the first real report (8 Nov):**
  - The SDK's `sdk.settings.infer_ip: never` is kept. The allowlist had dropped it, and Sentry's server then guessed a
    city from the connection.
  - `liveFormat` allows `hls`.
  - `manual` and `play-failed` carry the TV's `lastPlay`: sound format, how it's sent out, container, resumed and
    underruns. These come from a Media3 AnalyticsListener.
- **Not done in v1:**
  - Windows main-process crashes (D11).
  - Java `note()` calls from the player (the helper exists).
  - Most note words: today only `screen`, `play` and the problems' own.
- **Sentry's side, set 8 Nov:**
  - IP storage off.
  - A Replace rule on messages, error values, breadcrumbs and extra for links, stream paths, `key=`-style values and
    debrid keys.
  - The key's rate limit is 60 an hour.
  - Spike protection on, minidumps off.
  - An email alert for every new problem (for now in every environment, since the `production` environment exists only
    after the first release's report).
- **Tests:**
  - `tests/report-scrub-test.js` (54 checks, CI `accounts` job).
  - `ReportsTest` (5, CI `android` job).
  - `tests/tv/reports-leak.js` (local, the real SDK against `tests/mock-sentry.js`).
  - The emulator's leak probe and forced crash, with CI's "Check that error reports leak nothing".
