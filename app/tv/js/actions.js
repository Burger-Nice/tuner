// Actions several screens share: resume something, open a title's page.
import { S } from './state.js';
import { catalog, ensure } from './catalog.js';
import { playVod } from './player.js';
import { push } from './router.js';

// Continue watching plays straight away; an episode brings its series along for Up next when that comes quickly.
export async function resumeItem(it, { restart } = {}) {
  if (it.kind !== 'episode') return playVod(it, { restart });
  const d = await Promise.race([S.src.seriesInfo({ id: it.seriesId, name: it.seriesName, poster: it.poster }).catch(() => null), new Promise((r) => setTimeout(r, 1500))]);
  const eps = d?.seasons?.flatMap((x) => x.eps);
  const ep = eps?.find((e) => e.id === it.id);
  return playVod(ep || it, { queue: ep ? eps : null, restart });
}

// The title page for a library title, a provider item (a version) or an episode.
export async function openTitle(it) {
  const kind = it.kind === 'episode' ? 'series' : it.kind;
  const id = it.kind === 'episode' ? it.seriesId : it.id;
  const c = catalog[kind] || await ensure(kind).catch(() => null);
  const t = c?.titleById?.get(id) || c?.titles?.find((x) => x.id === id) || null;
  if (t) return push('detail', { title: t });
  // Not in the catalog (removed by the provider): a page from what was saved with it.
  const raw = it.kind === 'episode' ? { kind: 'series', id: it.seriesId, name: it.seriesName, poster: it.poster } : it;
  push('detail', { title: { kind, key: id, id, name: raw._title || raw.name, poster: raw.poster, year: raw.year, versions: [raw], _langs: new Set(), _qs: new Set() } });
}
