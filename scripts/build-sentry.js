// Builds app/vendor/sentry.js: Sentry's browser SDK as one plain script (window.Sentry), for the three apps' pages,
// which have no bundler (design/ui-v1/error-reports/SPEC.md D9). Only what report-boot.js uses is exported.
// Runs after `npm install` (postinstall) and from build-web.js when the file is missing. app/vendor/ is gitignored.
const path = require('path');
const fs = require('fs');

const out = path.join(__dirname, '..', 'app', 'vendor', 'sentry.js');

async function build() {
  let esbuild;
  try { esbuild = require('esbuild'); } catch { console.warn('build-sentry: esbuild is not installed (npm install), skipped'); return false; }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await esbuild.build({
    stdin: {
      contents: `export { init, captureException, captureMessage, addBreadcrumb, setTag, close, getClient,
        globalHandlersIntegration, dedupeIntegration, linkedErrorsIntegration, makeFetchTransport } from '@sentry/browser';`,
      resolveDir: path.join(__dirname, '..'),
      loader: 'js',
    },
    bundle: true,
    format: 'iife',
    globalName: 'Sentry',
    minify: true,
    target: 'es2020',
    legalComments: 'none',
    outfile: out,
    logLevel: 'warning',
  });
  return true;
}

if (require.main === module) build().then((ok) => ok && console.log('app/vendor/sentry.js ready')).catch((e) => { console.error(e); process.exit(1); });
module.exports = { build, out };
