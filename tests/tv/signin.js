module.exports = async ({ p, key }) => {
  await p.waitForFunction(() => !document.getElementById('app').classList.contains('l-on'), null, { timeout: 15000 }); await p.waitForTimeout(300);
  await key('Enter'); await key('Enter'); await p.keyboard.type('http://127.0.0.1:8899'); await key('Enter');
  await key('Enter'); await p.keyboard.type('demo'); await key('Enter');
  await key('Enter'); await p.keyboard.type('demo'); await key('Enter');
  await key('Enter'); await p.waitForTimeout(2500); await key('Enter');
};
