// Bug hunt: the player sheet opened from Leaders under the shield (My team, the Grizzlies' recent finals unseen):
// does a Grizzlies player's sheet keep its `Grizzlies page` button? node tests/tv/drive.js <out> hunt-league-sheet
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where, text } = H;
  await H.start({ settings: { shield: 'mine' }, seen: { upTo: 0, ids: [] } });
  console.log('  unseen:', await ev(async () => { const G = await import('/tv/js/games.js'); return G.unseenFor().length; }));
  await H.go('leaders'); await p.waitForTimeout(2000);
  for (const abbr of ['MEM', 'LAL']) {
    const name = await ev(async (abbr) => {
      const L = await import('/tv/js/league.js'), m = await import('/tv/js/nba/player.js');
      const pl = (L.peek('leaders:pts')?.data || []).find((x) => x.abbr === abbr) || (await NBA.leaders('pts', 10)).find((x) => x.abbr === abbr);
      m.openPlayer(pl, { from: 'leaders' }); return pl.name;
    }, abbr);
    await p.waitForTimeout(1200); const a = await where(`sheet: ${name}`); await shot(`sheet-${abbr}`);
    console.log('  text:', (await text('#overlays .ov')).slice(0, 240));
    check(/page/.test(await text('#overlays .ov .btn')), `${name} (${abbr}) from Leaders under the shield: the <Team> page button is there (${await text('#overlays .ov .btn')})`);
    await H.closeAll();
  }
  H.done();
};
