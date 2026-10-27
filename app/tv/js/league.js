// The team and league pages' data (ESPN through app/nba.js), kept in memory and on the TV (IndexedDB) and refreshed in the
// background: peek() answers at once with what's kept, want() fetches when it's older than its age (one fetch at a time
// per key) and 'league' fires with the key when fresh data lands. Nothing is fetched while the native player is up.
//   keys: standings · leaders:<cat> · teamStats · players:<ABBR> · schedule:<ABBR> · roster:<ABBR> · news · news:<ABBR> · story:<id>
import { emit } from './state.js';
import { watching } from './player.js';

const { NBA } = window;
const MIN = 60e3;
// how old a copy may be before it's asked for again, and how long it's kept on the TV (SPEC 11)
const AGE = { standings: 10 * MIN, leaders: 60 * MIN, teamStats: 60 * MIN, players: 60 * MIN, schedule: 10 * MIN, roster: 12 * 60 * MIN, news: 10 * MIN, story: 24 * 60 * MIN };
const KEEP = { story: 24 * 60 * MIN, news: 24 * 60 * MIN };   // everything else: 7 days
const FETCH = {
  standings: () => NBA.standings(),
  leaders: (cat) => NBA.leaders(cat, 10),
  teamStats: () => NBA.teamStats(),
  players: (abbr) => NBA.teamPlayers(abbr),
  schedule: (abbr) => NBA.schedule(abbr),
  roster: (abbr) => NBA.roster(abbr),
  news: (abbr) => NBA.news(abbr || undefined),
  story: (id) => NBA.story(id),
};
const mem = new Map();       // key -> { data, at, err, errAt }
const flight = new Map();    // key -> the fetch in progress
const kind = (key) => key.split(':')[0];
const arg = (key) => key.slice(kind(key).length + 1);
const dbKey = (key) => `nba:${key}`;

// What's kept for this key now ({ data, at } or null). Doesn't fetch.
export function peek(key) { return mem.get(key) || null; }
// The last error for this key, if its last try failed and nothing newer came.
export const failed = (key) => mem.get(key)?.err || '';

// The data for this key: from memory, else the TV's copy, then fresh from ESPN when it's older than its age (or force).
// Resolves with the freshest data it has; 'league' (key) fires each time something new lands.
export async function want(key, { force = false } = {}) {
  let hit = mem.get(key);
  if (!hit) {
    const saved = await window.Core.cache.get(dbKey(key)).catch(() => null);
    if (saved && Date.now() - saved.at < (KEEP[kind(key)] || 7 * 24 * 60 * MIN)) { hit = { data: saved.data, at: saved.at }; mem.set(key, hit); emit('league', key); }
  }
  const stale = !hit || force || Date.now() - hit.at > (AGE[kind(key)] || 10 * MIN);
  if (!stale || (watching() && hit)) return hit?.data ?? null;
  if (!flight.has(key)) {
    const f = FETCH[kind(key)];
    if (!f) return hit?.data ?? null;
    flight.set(key, f(arg(key)).then((data) => {
      const e = { data, at: Date.now() };
      mem.set(key, e);
      window.Core.cache.set(dbKey(key), e);
      if (kind(key) === 'story') pruneStories();
      emit('league', key);
      return data;
    }, (err) => {
      const e = mem.get(key) || { data: null, at: 0 };
      mem.set(key, { ...e, err: err.message || 'ESPN isn’t answering', errAt: Date.now() });
      emit('league', key);
      return e.data;
    }).finally(() => flight.delete(key)));
  }
  return hit ? hit.data : flight.get(key);
}
export const loading = (key) => flight.has(key);
// Story texts: the newest 30 are kept (SPEC 11).
function pruneStories() {
  const st = [...mem].filter(([k]) => kind(k) === 'story').sort((a, b) => b[1].at - a[1].at);
  for (const [k] of st.slice(30)) { mem.delete(k); window.Core.cache.set(dbKey(k), null); }
}
// Every kept entry whose key starts with prefix ('schedule:'): [key, data] pairs.
export const peekAll = (prefix) => [...mem].filter(([k, v]) => k.startsWith(prefix) && v.data).map(([k, v]) => [k, v.data]);
// Clock text for "ESPN · 23:37": when this key's data was fetched.
export const fetchedAt = (key) => mem.get(key)?.at || 0;
