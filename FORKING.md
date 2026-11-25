# Making your own version

This repo is public, so you can fork it and build your own app from it. A fork builds and runs as it is, but a few
things still point at the original owner's accounts. This page lists what to change, in the order that matters.

How the app fits together, and how to build and test it, is in `CLAUDE.md`.

## 1. Fork it and turn the builds on

1. Press **Fork** on GitHub.
2. In your fork, open the **Actions** tab and enable workflows. GitHub turns them off in a new fork.

A push to `main` builds the Windows, Android TV and iPhone apps and publishes them as a release in your fork
(`.github/workflows/build.yml`). Version numbers are `0.4.<run number>`, and run numbers start again from 1 in a fork.

## 2. The Android signing key (do this first)

The file `android/tuner-release.keystore.enc` is the original owner's signing key, locked with a password you don't
have. Your builds can't use it.

1. Delete `android/tuner-release.keystore.enc` from your fork.
2. In your fork's **Settings > Secrets and variables > Actions**, add a secret named `TUNER_KEY_PASSWORD` with a long
   password of your own. Keep a copy somewhere safe.

The next build makes a new key, signs the TV app with it, and saves an encrypted copy back into your fork. Without the
secret, the TV app is built and tested but not published.

Your builds and the original's are signed with different keys, so one can't install over the other. Android also won't
keep both on the same device, because they share the package name `app.tuner`.

## 3. Where the app looks for updates

The apps check the original repo's releases for new versions. Point these at your fork (replace `Burger-Nice/tuner`):

| File | What it is |
|---|---|
| `app/tv/js/native.js` | the TV app's update check (`android.json`) |
| `scripts/android-manifest.js` | the download link written into `android.json` |
| `package.json` (`build.publish`) | the Windows app's updater |
| `app/desktop/player.js` | the Windows app's "reinstall" link |
| `scripts/altstore-source.js` | the iPhone's AltStore source and icon link |

`app/tv/js/catalog.js` also fetches a ratings file from the original repo's `ratings` release. It only reads public
data, so you can leave it, or point it at your own copy.

## 4. Error reports

`reports.json` holds the original owner's Sentry address. Builds from your `main` would send your app's crash reports
to their Sentry project.

- To send none: set `"dsn": ""` in `reports.json`.
- To get your own: make a Sentry project and put its DSN there. What a report may contain is in
  `design/ui-v1/error-reports/SPEC.md`.

## 5. Accounts (optional)

The app works without an account: choose "Without an account" at first launch. Sign-in and sync between devices use a
small server (`worker/`, a Cloudflare Worker with a D1 database). `app/core.js` points at the original owner's server
(`ACCOUNTS_HOST`), which needs an invite to join.

To run your own:

1. Add these secrets to your fork: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `AIRGLOW_OWNER_CODE` (a code
   only you know; it creates the first account).
2. Run the build. The `accounts` job deploys the Worker as `acct` and prints its address,
   `https://acct.<your-subdomain>.workers.dev`.
3. Set `ACCOUNTS_HOST` in `app/core.js` to that address.

Never rename or delete the `acct` Worker once people have accounts on it: it holds a secret that every sign-in depends
on. The design is in `design/ui-v1/accounts-v1/SPEC.md`.

Without the Cloudflare secrets, the `accounts` job's deploy step fails. The app builds don't depend on it.

## 6. What isn't in the repo

Nothing personal is stored here. You add your own on each device:

- your IPTV provider's login (Xtream Codes or M3U)
- your Stremio add-ons
- your own free TMDB key (Account > Provider), for better Home rows

## 7. Make it yours

- **The name and look:** the app's name, icon, TV banner and launch animation are under `design/` and
  `android/app/src/main/res/`. The package name `app.tuner` can stay.
- **The licence:** this repo has no licence file. Ask the owner before you share or publish your version.
