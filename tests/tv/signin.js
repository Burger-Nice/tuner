module.exports = async ({ p, key }) => {
  await p.waitForFunction(() => !document.getElementById('app').classList.contains('l-on'), null, { timeout: 15000 }); await p.waitForTimeout(300);
  // (the first screen's two doors: Use airglow without an account, then Type it here)
  if (await p.evaluate(() => !!document.querySelector('[data-act="noacct"]'))) { await key('ArrowRight'); await key('Enter'); }
  await key('Enter'); await key('Enter'); await p.keyboard.type('http://127.0.0.1:8899'); await key('Enter');
  await key('Enter'); await p.keyboard.type('demo'); await key('Enter');
  await key('Enter'); await p.keyboard.type('demo'); await key('Enter');
  await key('Enter'); await p.waitForTimeout(2500); await key('Enter');
};
