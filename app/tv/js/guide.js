// The programme guide: one short EPG per channel, kept for 10 minutes and shared by the guide grid, Home, search and the player.
import { S } from './state.js';

const guides = new Map();   // chId -> { at, list: Promise, ready: [] | undefined }
export const resetGuides = () => { guides.clear(); shifted = S.acc?.epgShift || 0; };

// The provider is one server, often with a limit on requests: at most 3 at a time, and what's on screen goes first
// (urgent), ahead of look-ahead rows and the search for your team's channel.
const MAX = 3, lanes = { now: [], later: [] }, queued = new Map();   // chId -> job still waiting
let running = 0;
function pump() {
  while (running < MAX) {
    const job = lanes.now.shift() || lanes.later.shift();
    if (!job) return;
    queued.delete(job.id);
    running++;
    job.run().then(job.res, job.rej).finally(() => { running--; pump(); });
  }
}
function enqueue(id, run, urgent) {
  return new Promise((res, rej) => { const job = { id, run, res, rej }; queued.set(id, job); (urgent ? lanes.now : lanes.later).push(job); pump(); });
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
    if (my === S.epoch) { reshift(); guides.set(ch.id, { at: Date.now(), list: Promise.resolve(l), ready: l }); }
    return l;
  }, () => {
    const keep = hit?.ready || [];
    if (my === S.epoch) guides.set(ch.id, { at: Date.now(), list: Promise.resolve(keep), ready: hit?.ready, failed: true });
    return keep;
  });
  guides.set(ch.id, { at: Date.now(), list, ready: hit?.ready });
  return list;
}
// The provider's clock offset (core.js epg) can be settled after some guides came in: move those by the difference.
let shifted = 0;
function reshift() {
  const k = S.acc?.epgShift || 0, d = k - shifted;
  if (!d) return;
  shifted = k;
  for (const g of guides.values()) if (g.ready) { g.ready = g.ready.map((p) => ({ ...p, start: p.start + d, end: p.end + d })); g.list = Promise.resolve(g.ready); }
}
export const guideNow = (ch) => guides.get(ch.id)?.ready;
// The last try for this channel's guide failed (it is tried again after 30 s).
export const guideFailed = (ch) => !!guides.get(ch.id)?.failed;
export const known = (ch) => guides.has(ch.id);
export const onNow = (list, now = Date.now()) => list?.find((p) => p.start <= now && p.end > now) || null;
export const nextUp = (list, now = Date.now()) => list?.find((p) => p.start > now) || null;

// Fetch guides for these channels through the queue, stopping when the caller no longer wants them.
export async function warm(chs, { still = () => true, urgent = false } = {}) {
  const want = chs.filter((c) => c && !known(c));
  await Promise.all(want.map((c) => (still() ? guideFor(c, { urgent }) : null)));
  return want.length;   // how many were fetched, so callers redraw only when something arrived
}
