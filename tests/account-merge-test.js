// The sync merge rules (app/tv/js/account/rules.js, SPEC 4.4 with review 3's M2 and S1). Run: node tests/account-merge-test.js
import assert from 'node:assert/strict';
import * as R from '../app/tv/js/account/rules.js';

let fails = 0;
const check = (name, f) => { try { f(); console.log('ok  ', name); } catch (e) { fails++; console.log('FAIL', name, '\n    ', e.message); } };
const H = 3600e3, now = Date.now();

check('shield: turning it on again on A (after B revealed a game) hides that game on A after the next pull', () => {
  const b = { since: now - 5 * H, upTo: now - 1 * H, ids: [['g1', now - 2 * H]] };       // B revealed g1 (and everything to an hour ago)
  const a = { since: now, upTo: now - 12 * H, ids: [] };                                   // A turned the shield on now
  assert.deepEqual(R.shield(a, b, now), a, 'A keeps its stricter state');
  assert.deepEqual(R.shield(b, a, now), a, 'and B takes it on its next pull');
});
check('shield: same epoch: upTo = max, ids = union', () => {
  const x = R.shield({ since: 5, upTo: now - 3 * H, ids: [['g1', now - H]] }, { since: 5, upTo: now - 2 * H, ids: [['g2', now - H / 2]] }, now);
  assert.equal(x.upTo, now - 2 * H); assert.deepEqual(x.ids.map(([i]) => i).sort(), ['g1', 'g2']);
});
check('shield: a clock running ahead is clamped to the server\'s time + 5 min', () => {
  const ahead = { since: 1, upTo: now + 30 * 864e5, ids: [] };
  assert.equal(R.shield(ahead, { since: 1, upTo: now - H, ids: [] }, now).upTo, now + R.MIN5);
  assert.equal(R.shield({ since: now + 864e5, upTo: 0, ids: [] }, null, now).since, now + R.MIN5, 'a future epoch can\'t win forever');
});
check('forget: max, clamped (a TV a month ahead can\'t forget next month\'s plays)', () => {
  assert.equal(R.forget({ upTo: now + 30 * 864e5 }, { upTo: now - H }, now).upTo, now + R.MIN5);
  assert.equal(R.forget({ upTo: 5 }, { upTo: 9 }, now).upTo, 9);
});
check('plays: union by playId across parts, the newer copy of one play, nothing at or before forget', () => {
  const p = (id, at, extra = {}) => ({ playId: id, imdb: 'tt1', at, to: 10, ...extra });
  const out = R.plays([[p('a', 10), p('b', 20)], [p('b', 25, { to: 99 }), p('c', 5)]], 6);
  assert.deepEqual(out.map((x) => [x.playId, x.at]), [['a', 10], ['b', 25]]);
});
check('plays: migrating Continue watching on two devices does not duplicate history (review 3, S1)', () => {
  const tv = R.withIds([{ imdb: 'tt42', season: 0, episode: 0, at: 1000, source: 'history' }]);
  const phone = R.withIds([{ imdb: 'tt42', season: 0, episode: 0, at: 1200, source: 'history' }]);
  assert.equal(R.plays([tv, phone]).length, 1);
  const old = R.withIds([{ imdb: 'tt7', at: 5, source: 'provider' }]);
  assert.equal(R.withIds(old)[0].playId, old[0].playId, 'old plays get a stable id from their content');
});
check('plays: parts of 200 by month', () => {
  const list = Array.from({ length: 450 }, (_, i) => ({ playId: `p${i}`, at: Date.UTC(2026, 9, 1) + i * 1000 }));
  const parts = R.partsOf(list);
  assert.deepEqual(Object.keys(parts), ['2026-10:1', '2026-10:2', '2026-10:3']); assert.equal(parts['2026-10:3'].length, 50);
});
check('last write, newest progress, orders with unknown keys appended', () => {
  assert.equal(R.lww('mine', 'theirs', 10, 20), 'theirs'); assert.equal(R.lww('mine', 'theirs', 30, 20), 'mine');
  assert.equal(R.newest({ at: 5, t: 1 }, { at: 9, t: 2 }).t, 2);
  assert.deepEqual(R.order({ keys: ['a', 'b'] }, { keys: ['c', 'a'] }, 10, 20), { keys: ['c', 'a', 'b'] });
});
check('per key (settings, notes), Not interested keeps the later expiry', () => {
  assert.deepEqual(R.perKey({ team: ['MEM', 5], langs: [['en'], 9] }, { team: ['BOS', 7], langs: [['is'], 2] }), { team: ['BOS', 7], langs: [['en'], 9] });
  assert.deepEqual(R.notInterested({ a: 5, b: 9 }, { a: 7 }), { a: 7, b: 9 });
});
check('a provider\'s natural key: case, default port and a trailing slash don\'t matter', () => {
  const a = R.natural({ type: 'xtream', server: 'http://LINE.example.tv:80/', username: 'Bob' });
  assert.equal(a, R.natural({ type: 'xtream', server: 'line.example.tv', username: 'Bob' }));
  assert.notEqual(a, R.natural({ type: 'xtream', server: 'line.example.tv:8080', username: 'Bob' }));
  assert.equal(R.natural({ type: 'm3u', url: ' http://x/y.m3u ' }), 'm3u|http://x/y.m3u');
});
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
