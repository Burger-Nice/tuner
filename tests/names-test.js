// node tests/names-test.js -> the one channel / group / programme name cleaner both apps use (app/tv/js/names.js).
// Exit 1 on a failure.
const path = require('path');
(async () => {
  const { cleanCh, cleanGroup, cleanProg } = await import(path.join(__dirname, '../app/tv/js/names.js'));
  let bad = 0;
  const eq = (f, a, want) => { const got = f(a); const ok = got === want; if (!ok) bad++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${f.name}(${JSON.stringify(a)}) = ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`); };
  eq(cleanCh, 'US: ESPN HD', 'ESPN');
  eq(cleanCh, '|US| CNN', 'CNN');
  eq(cleanCh, 'US| CNN', 'CNN');
  eq(cleanCh, 'US - TNT HD', 'TNT');
  eq(cleanCh, 'NEXT | POR - Trail Blazers vs Grizzlies', 'Trail Blazers vs Grizzlies');
  eq(cleanCh, 'NBA 05 | LAL vs MEM', 'NBA 05 · LAL vs MEM');
  eq(cleanCh, 'NBA 01: Memphis Grizzlies @ Golden State Warriors HD', 'NBA 01: Memphis Grizzlies @ Golden State Warriors');
  eq(cleanCh, 'PRIME: Prime Video NBA ᴿᴬᵂ', 'Prime Video NBA');
  eq(cleanCh, 'Sky Sports Main Event 4K UHD', 'Sky Sports Main Event');
  eq(cleanCh, 'NBA League Pass 3', 'NBA League Pass 3');
  eq(cleanCh, 'TV 2 - Sport', 'TV 2 - Sport');
  eq(cleanCh, 'RÚV', 'RÚV');
  eq(cleanCh, 'HD', 'HD');
  eq(cleanGroup, 'Iceland | ÍS', 'Iceland');
  eq(cleanGroup, 'UK | Entertainment', 'UK · Entertainment');
  eq(cleanGroup, '##### SPORTS #####', 'SPORTS');
  eq(cleanProg, 'NEXT | POR - Trail Blazers vs Grizzlies', 'POR - Trail Blazers vs Grizzlies');
  eq(cleanProg, 'LIVE: NBA Basketball', 'NBA Basketball');
  eq(cleanProg, 'Now You See Me', 'Now You See Me');
  eq(cleanProg, 'Newsnight', 'Newsnight');
  process.exit(bad ? 1 : 0);
})();
