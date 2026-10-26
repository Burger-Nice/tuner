// The programme guide: one short EPG per channel, kept for 10 minutes and shared by the guide grid, Home, search and the player.
import { S } from './state.js';

const guides = new Map();   // chId -> { at, list: Promise, ready: [] | undefined }
export const resetGuides = () => guides.clear();

export function guideFor(ch) {
  const hit = guides.get(ch.id);
  if (hit && Date.now() - hit.at < 600000) return hit.list;
  const my = S.epoch;
  const list = (S.src?.epg ? S.src.epg(ch) : Promise.resolve([])).catch(() => []).then((l) => {
    if (my === S.epoch) guides.set(ch.id, { at: Date.now(), list: Promise.resolve(l), ready: l });
    return l;
  });
  guides.set(ch.id, { at: Date.now(), list, ready: hit?.ready });
  return list;
}
export const guideNow = (ch) => guides.get(ch.id)?.ready;
export const known = (ch) => guides.has(ch.id);
export const onNow = (list, now = Date.now()) => list?.find((p) => p.start <= now && p.end > now) || null;
export const nextUp = (list, now = Date.now()) => list?.find((p) => p.start > now) || null;

// Fetch a few channels at a time (the provider is one server), stopping when the caller no longer wants them.
export async function warm(chs, { batch = 2, still = () => true } = {}) {
  const want = chs.filter((c) => c && !known(c));
  for (let i = 0; i < want.length; i += batch) {
    if (!still()) return i;
    await Promise.all(want.slice(i, i + batch).map(guideFor));
  }
  return want.length;   // how many were fetched, so callers redraw only when something arrived
}
