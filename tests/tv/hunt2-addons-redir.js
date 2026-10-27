const C = require('/home/user/tuner/tests/tv/addons-common.js');
module.exports = async ({ p, key }) => {
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, {});
  await p.route('http://junk.test/**', (route) => route.fulfill({ status: 302, headers: { Location: 'http://127.0.0.1:8899/addon/archivio/manifest.json' } }));
  console.log(await ev(async () => { const A = await import('/tv/js/addons.js'); return JSON.stringify(await A.readManifest('http://junk.test/r/manifest.json')); }));
  console.log(await ev(async () => { const A = await import('/tv/js/addons.js'); return JSON.stringify(await A.readManifest('http://127.0.0.1:8899/addon/archivio/manifest.json')); }));
  console.log(await ev(async () => { const A = await import('/tv/js/addons.js'); return JSON.stringify(await A.readManifest('127.0.0.1:8899/addon/kestrel/manifest.json')); }));
  console.log(await ev(async () => { const A = await import('/tv/js/addons.js'); return JSON.stringify(await A.readManifest('http://127.0.0.1:8899/addon/kestrel')); }));
};
