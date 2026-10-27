// Skip intro, per show (design/ui-v1/skip/SPEC.md 4.1, 4.3, 4.4, 9.5): the show's own choice for intros, his Skip intro
// presses counted for the offer, the offers let go, and the doubtful mark. Kept per account, by the show's key (its IMDb
// id, else the provider's series id). The rules are plain functions (tests/intros-test.js); the store is at the end.
//   show record: { name, choice: 'auto' | 'button' | null, pressed: ['S1E2', …], letGo, backs: [{ episode, at }], doubtfulUntil }
const DAY = 864e5, DOUBT = 7 * DAY;

export const episodeKey = (it) => (it?.kind === 'episode' ? `S${+it.season}E${+it.ep}` : '');
export const doubtful = (sh, now = Date.now()) => !!sh && (sh.doubtfulUntil || 0) > now;

// How Account and the show combine (4.1): Off wins over everything; the doubtful mark makes it buttons for 7 days; a
// show's own choice wins over Account; no choice (Same as Account) follows Account.
export function introMode(account, sh, now = Date.now()) {
  if (account === 'off') return 'off';
  if (doubtful(sh, now)) return 'button';
  if (sh?.choice === 'auto' || sh?.choice === 'button') return sh.choice;
  return account === 'auto' ? 'auto' : 'button';
}

// The offer may follow a press in this episode (4.4): only where yes changes something (Account on Show a button, no
// choice for the show, not doubtful), after one counted press in another episode, and fewer than 2 offers let go.
export function offerDue(account, sh, episode, now = Date.now()) {
  if (account !== 'button' || !sh || sh.choice || doubtful(sh, now) || (sh.letGo || 0) >= 2) return false;
  return (sh.pressed || []).some((e) => e !== episode);
}

const blank = () => ({ name: '', choice: null, pressed: [], letGo: 0, backs: [], doubtfulUntil: 0 });
// A skip the player reports once its way-back chip is over (9.5: skip { show, episode, how, part, level, anchored, back }):
// - a press on Skip intro (or Skip recap and intro) on a Sure window, not gone back from, counts for the offer;
// - a go-back after an intro skipped by itself with no anchored file is one strike; strikes in two different episodes
//   within 7 days make the show's times doubtful for 7 days (review 4: one go-back is often a slip or "play the theme").
export function afterSkip(sh, e, now = Date.now()) {
  const s = { ...blank(), ...(sh || {}) };
  const intro = e.part === 'intro' || e.part === 'both';
  if (!intro || !e.episode) return s;
  if (e.how === 'press' && !e.back && e.level === 'sure' && !s.pressed.includes(e.episode)) s.pressed = [...s.pressed, e.episode].slice(-20);
  if (e.how === 'self' && e.back && !e.anchored) {
    const backs = [...(s.backs || []).filter((b) => now - b.at < DOUBT && b.episode !== e.episode), { episode: e.episode, at: now }];
    if (new Set(backs.map((b) => b.episode)).size >= 2) { s.doubtfulUntil = now + DOUBT; s.backs = []; } else s.backs = backs;
  }
  return s;
}
// A pick in ▼ Options > Intros in this show, or yes on the offer: the show's choice (null: Same as Account). It is his
// decision, made after seeing the foot line, so it clears the doubtful mark.
export function afterChoice(sh, value) {
  return { ...blank(), ...(sh || {}), choice: value === 'auto' || value === 'button' ? value : null, doubtfulUntil: 0, backs: [] };
}
export const afterLetGo = (sh) => ({ ...blank(), ...(sh || {}), letGo: ((sh && sh.letGo) || 0) + 1 });

// "The episode before was watched" (4.3): finished, or played past 80%, in the last 3 days. In a binge it is the item
// before this one in the queue, of the same show (so a season's E1 after the last season's finale counts); opened on its
// own, the same season's previous number (an E1 opened on its own gets the button).
//   progress: { of(item) -> record, all() -> [records] }, records as state.js keeps them ({ t, d, at, done, item })
export const watchedP = (p, now = Date.now()) => !!p && (p.done || (p.d > 0 && p.t / p.d >= 0.8)) && (p.at || 0) >= now - 3 * DAY;
export function watchedBefore(it, prev, progress, now = Date.now()) {
  if (it?.kind !== 'episode') return false;
  if (prev?.kind === 'episode' && String(prev.seriesId) === String(it.seriesId)) return watchedP(progress.of(prev), now);
  const S0 = +it.season, E0 = +it.ep;
  return E0 > 1 && progress.all().some((p) => p?.item?.kind === 'episode' && String(p.item.seriesId) === String(it.seriesId)
    && +p.item.season === S0 && +p.item.ep === E0 - 1 && watchedP(p, now));
}

// ---------- the store (per account) ----------
export function showStore(store, key) {
  return {
    get: (k) => (k ? store.get(key, {})[k] || null : null),
    put: (k, v) => { if (!k) return; const all = store.get(key, {}); all[k] = v; const ks = Object.keys(all); if (ks.length > 300) delete all[ks[0]]; store.set(key, all); },
  };
}
