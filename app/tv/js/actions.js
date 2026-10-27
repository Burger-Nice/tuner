// Actions several screens share: resume something, open a title's page.
import { S } from './state.js';
import { catalog, ensure } from './catalog.js';
import { playVod, queueAfter } from './player.js';
import { push } from './router.js';
import { gameById } from './games.js';
import { resumeGame, watchFromTipoff, playProgramme, openVideoGame, chooseVideo, playVideoFor } from './replay.js';
import { videoMask } from './catchup.js';

// Series episode lists, kept for a while so the next resume has Up next at once.
const seriesCache = new Map();   // seriesId -> { at, eps }
export function episodesOf(it) {
  const hit = seriesCache.get(it.seriesId);
  if (hit && Date.now() - hit.at < 30 * 60e3) return Promise.resolve(hit.eps);
  return S.src.seriesInfo({ id: it.seriesId, name: it.seriesName, poster: it.poster }).then((d) => {
    const eps = d?.seasons?.flatMap((x) => x.eps) || [];
    seriesCache.set(it.seriesId, { at: Date.now(), eps });
    return eps;
  });
}
// Continue watching plays straight away. An episode starts at once; the episodes after it join for Up next when
// the series' list arrives (at once when it was looked up recently).
export async function resumeItem(it, { restart } = {}) {
  if (it.kind === 'rp') return resumeReplay(it, { restart });
  if (it.kind === 'movie' && playMasked(it)) return;   // a hidden game's video: the hidden-end timeline (catch-up 5.8)
  if (it.kind !== 'episode') return playVod(it, { restart });
  const hit = seriesCache.get(it.seriesId);
  const known = hit && Date.now() - hit.at < 30 * 60e3 ? hit.eps : null;
  const ep = known?.find((e) => e.id === it.id);
  if (ep) return playVod(ep, { queue: known, restart });
  await playVod(it, { restart });
  episodesOf(it).then((eps) => { const i = eps.findIndex((e) => e.id === it.id); if (i >= 0) queueAfter(it, eps.slice(i + 1)); }).catch(() => {});
}

// The title page for a library title, a provider item (a version) or an episode.
// A replay you stopped (catch-up 5.2): a game resumes (or starts again from tip-off); a programme from where you were.
function resumeReplay(it, { restart } = {}) {
  if (it.game) { const g = gameById(it.game.id) || it.game; return restart ? watchFromTipoff(g) : resumeGame(g); }
  const ch = catalog.live?.byId.get(it.ch);
  if (ch) playProgramme(ch, { title: it.title, start: it.start, end: it.end }, { restart });
}
export async function openTitle(it) {
  if (it.kind === 'rp') { if (it.game) push('game', { id: it.game.id }); return; }
  const kind = it.kind === 'episode' ? 'series' : it.kind;
  const id = it.kind === 'episode' ? it.seriesId : it.id;
  const c = catalog[kind] || await ensure(kind).catch(() => null);
  const t = c?.titleById?.get(id) || c?.titles?.find((x) => x.id === id) || null;
  if (t) return openDetail(t);
  // Not in the catalog (removed by the provider): a page from what was saved with it.
  const raw = it.kind === 'episode' ? { kind: 'series', id: it.seriesId, name: it.seriesName, poster: it.poster } : it;
  push('detail', { title: { kind, key: id, id, name: raw._title || raw.name, poster: raw.poster, year: raw.year, versions: [raw], _langs: new Set(), _qs: new Set() } });
}

// A title's page, unless the spoiler shield masks it (catch-up 5.8): a hidden game's full game opens the game page with
// it as the pick; a title that could tell opens Choose a video on its row. Never the movie page for those (its duration,
// plot and More like this would tell).
export function openMasked(t) {
  const mk = videoMask(t);
  if (!mk) return false;
  const m = t.versions?.[0] || t;
  if (mk.kind === 'game') openVideoGame(mk.g, m); else chooseVideo(mk.g, { focusId: m.id });
  return true;
}
export function openDetail(t) { if (!openMasked(t)) push('detail', { title: t }); }
// Play on a masked title: the hidden 'video' timeline, its progress under rp:<gameId>.
export function playMasked(t) {
  const mk = videoMask(t);
  if (!mk) return false;
  playVideoFor(mk.g, t.versions?.[0] || t);
  return true;
}
