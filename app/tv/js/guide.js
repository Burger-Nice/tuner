// The programme guide: one short EPG per channel, kept for 10 minutes and shared by the guide grid, Home, search and the player.
import { S } from './state.js';

const guides = new Map();   // chId -> { at, list: Promise, ready: [] | undefined }
// (a new account or a fresh start: the queue goes too, its jobs answer with nothing, so nothing runs for the old one)
export const resetGuides = () => {
  guides.clear(); tables.clear(); shifted = S.acc?.epgShift || 0;
  for (const job of [...lanes.now, ...lanes.later]) job.res([]);
  lanes.now.length = lanes.later.length = 0; queued.clear();
};

// The provider is one server, often with a limit on requests: at most 3 at a time, and what's on screen goes first
// (urgent), ahead of look-ahead rows and the search for your team's channel.
const MAX = 3, lanes = { now: [], later: [] }, queued = new Map();   // chId -> job still waiting
let running = 0;
function pump() {
  while (running < MAX) {
    const job = lanes.now.shift() || lanes.later.shift();
    if (!job) return;
    if (queued.get(job.id) === job) queued.delete(job.id);
    if (job.epoch !== S.epoch) { job.res([]); continue; }   // asked for by an account that's gone
    running++;
    job.run().then(job.res, job.rej).finally(() => { running--; pump(); });
  }
}
function enqueue(id, run, urgent) {
  return new Promise((res, rej) => { const job = { id, run, res, rej, epoch: S.epoch }; queued.set(id, job); (urgent ? lanes.now : lanes.later).push(job); pump(); });
}
// A failed answer is tried again after 30 s (a provider busy for a moment must not mean "no guide" for 10 minutes).
export function guideFor(ch, { urgent = false } = {}) {
  const hit = guides.get(ch.id);
  if (hit && Date.now() - hit.at < (hit.failed ? 30000 : 600000)) {
    const job = urgent && queued.get(ch.id);   // asked for again, now on screen: move it to the front
    if (job && lanes.later.includes(job)) { lanes.later.splice(lanes.later.indexOf(job), 1); lanes.now.push(job); }
    return hit.list;
  }
  const my = S.epoch;
  const list = enqueue(ch.id, () => (S.src?.epg ? S.src.epg(ch) : Promise.resolve([])), urgent).then((l) => {
    if (my !== S.epoch) return l;
    reshift();
    const ready = moved(l, shifted);   // the provider's times, on our clock
    guides.set(ch.id, { at: Date.now(), list: Promise.resolve(ready), ready });
    return ready;
  }, () => {
    // (failed the first time: an empty guide marked failed, so the screens say so and it's tried again in 30 s)
    const keep = hit?.ready || [];
    if (my === S.epoch) guides.set(ch.id, { at: Date.now(), list: Promise.resolve(keep), ready: keep, failed: true });
    return keep;
  });
  guides.set(ch.id, { at: Date.now(), list, ready: hit?.ready });
  return list;
}
// The provider's clock offset (core.js epg) can be settled after some guides came in: move those by the difference.
let shifted = 0;
const moved = (l, d) => (d ? l.map((p) => ({ ...p, start: p.start + d, end: p.end + d })) : l);
function reshift() {
  const k = S.acc?.epgShift || 0, d = k - shifted;
  if (!d) return;
  shifted = k;
  for (const g of [...guides.values(), ...tables.values()]) if (g.ready) { g.ready = moved(g.ready, d); g.list = Promise.resolve(g.ready); }
}
export const guideNow = (ch) => guides.get(ch.id)?.ready;

// ---------- the past (design/ui-v1/catchup/SPEC.md 4.6) ----------
// A kept channel's full table (get_simple_data_table: the days the panel keeps, has_archive and the raw start string),
// fetched the first time its row goes before now or a game's replay needs it, through the same queue (on-screen rows
// first), kept 10 minutes; a failure is tried again after 30 s. Times on our clock (epgShift), the raw string untouched.
const tables = new Map();   // chId -> { at, list: Promise, ready, failed }
export function pastFor(ch, { urgent = false } = {}) {
  const hit = tables.get(ch.id);
  if (hit && Date.now() - hit.at < (hit.failed ? 30000 : 600000)) return hit.list;
  const my = S.epoch;
  const list = enqueue(`t:${ch.id}`, () => (S.src?.table ? S.src.table(ch) : Promise.resolve([])), urgent).then((l) => {
    reshift();
    const ready = moved(l, shifted);
    if (my === S.epoch) tables.set(ch.id, { at: Date.now(), list: Promise.resolve(ready), ready });
    return ready;
  }, () => {
    const keep = hit?.ready || null;
    if (my === S.epoch) tables.set(ch.id, { at: Date.now(), list: Promise.resolve(keep || []), ready: keep, failed: true });
    return keep || [];
  });
  tables.set(ch.id, { at: Date.now(), list, ready: hit?.ready });
  return list;
}
export const pastNow = (ch) => tables.get(ch.id)?.ready;
export const pastFailed = (ch) => !!tables.get(ch.id)?.failed && !tables.get(ch.id)?.ready;
export const pastKnown = (ch) => { const t = tables.get(ch.id); return !!t && Date.now() - t.at < (t.failed ? 30000 : 600000); };
// The last try for this channel's guide failed (it is tried again after 30 s).
export const guideFailed = (ch) => !!guides.get(ch.id)?.failed;
// (a failed guide is unknown again after 30 s, a loaded one after its 10 minutes, so the screens ask for it again: the
// short guide runs dry after a few hours; the old copy stays on screen until the new one arrives)
export const known = (ch) => { const g = guides.get(ch.id); return !!g && Date.now() - g.at < (g.failed ? 30000 : 600000); };
// The provider answers again after being offline: every guide is asked for again, the copies kept on screen meanwhile.
export const staleGuides = () => { for (const g of [...guides.values(), ...tables.values()]) if (g.ready) g.at = 0; };
export const onNow = (list, now = Date.now()) => list?.find((p) => p.start <= now && p.end > now) || null;
export const nextUp = (list, now = Date.now()) => list?.find((p) => p.start > now) || null;

// Fetch guides for these channels through the queue, stopping when the caller no longer wants them.
export async function warm(chs, { still = () => true, urgent = false } = {}) {
  const want = chs.filter((c) => c && !known(c));
  await Promise.all(want.map((c) => (still() ? guideFor(c, { urgent }) : null)));
  return want.length;   // how many were fetched, so callers redraw only when something arrived
}
