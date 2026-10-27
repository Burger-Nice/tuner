// The quality check's queue, budget and cache (design/ui-v1/subtitles/SPEC.md 5.2, 5.3). The check itself is native
// (Probe.java, PORT-NATIVE.md): this decides when one may run and keeps what it found. Plain code with its
// dependencies passed in (makeProbes), so tests/subs-probes.js runs it in node with a fake clock.
//
// The rules:
// - a check starts only when nothing else uses the account: the player, a live preview, and `active_cons` (re-read
//   with a login call before each batch; other devices use the same account). M3U accounts count as 1 connection;
// - one at a time, one request open at a time; Play cancels a check in flight (the socket is closed first);
// - which copies: the open title page's (name-best first, at once), then Continue watching, then Saved. Posters and
//   filters only read the cache and never ask;
// - 60 a day (about 8 MB), at least 60 s apart in the background;
// - a refused check backs off 30 min; two refusals in a day stop checks for the day;
// - results are kept 60 days per copy (key <account>:<kind>:<stream id>), checked again when the size or ETag seen
//   at play start changes, 20,000 entries, least recently used out first.

export const DAY_BUDGET = 60;
export const GAP = 60e3;
export const BACKOFF = 30 * 60e3;
export const KEEP = 60 * 86400e3;
export const MAX_ENTRIES = 20000;
const PRIO = { title: 0, continue: 1, saved: 2 };

const dayOf = (t) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

// deps:
//   now()                      -> ms
//   engine(job, signal)        -> Promise<result>  (native probe, or the browser's fingerprint-only reads)
//   streamsInUse()             -> number            (the player, live previews)
//   activeCons()               -> Promise<number>   (a login call: user_info.active_cons; M3U: 0)
//   load() / save(obj)         -> the cache record (async)
//   budgetStore { get(), set(v) } (sync: the day's count, refusals, back-off)
//   setTimer(f, ms), clearTimer(id)
// result: { status: 'ok'|'head-only'|'couldnt'|'refused'|'unavailable', size, etag, formats, dur, mbps, hash, why }
export function makeProbes(deps) {
  const D = { setTimer: (f, ms) => setTimeout(f, ms), clearTimer: (id) => clearTimeout(id), ...deps };   // (wrapped: a browser's setTimeout called as D.setTimer throws Illegal invocation)
  let cache = null, loading = null, dirty = false;
  const queue = [];          // { key, url, headers, prio, at }
  let running = null;        // { job, ctl }
  let timer = null, lastEnd = 0, batchOpen = false;
  const subs = new Set();

  const ensure = () => cache ? Promise.resolve(cache) : (loading || (loading = Promise.resolve(D.load()).then((c) => { cache = (c && typeof c === 'object') ? c : {}; for (const k of Object.keys(cache)) if (!fresh(cache[k])) { delete cache[k]; dirty = true; } return cache; })));   // (checks past their 60 days go)
  const persist = () => { if (!dirty) return; dirty = false; D.save(cache); };
  const budget = () => { const b = D.budgetStore.get() || {}; const day = dayOf(D.now()); return b.day === day ? b : { day, n: 0, refusals: 0, until: b.until || 0 }; };
  const setBudget = (b) => D.budgetStore.set(b);

  function fresh(e) { return e && D.now() - e.at < KEEP; }
  function get(key) {
    const e = cache?.[key];
    if (!fresh(e)) return null;
    e.used = D.now(); dirty = true;
    return e;
  }
  function put(key, r) {
    cache[key] = { key, at: D.now(), used: D.now(), status: r.status, size: r.size || 0, etag: r.etag || '', formats: r.formats || null, dur: r.dur || 0, mbps: r.mbps || 0, hash: r.hash || '', why: r.why || '' };
    const ks = Object.keys(cache);
    if (ks.length > MAX_ENTRIES) ks.sort((a, b) => cache[a].used - cache[b].used).slice(0, ks.length - MAX_ENTRIES).forEach((k) => delete cache[k]);
    dirty = true; persist();
  }

  // Why no check may start now ('' = it may)
  function blocked(background) {
    const b = budget();
    if (b.until && D.now() < b.until) return 'backing off';
    if (b.refusals >= 2) return 'refused twice today';
    if (b.n >= DAY_BUDGET) return 'today\'s checks are used';
    if (D.streamsInUse() > 0) return 'streams in use';
    if (background && D.now() - lastEnd < GAP) return 'too soon';
    return '';
  }
  function schedule(ms) { if (timer) D.clearTimer(timer); timer = D.setTimer(() => { timer = null; pump(); }, Math.max(0, ms)); }

  async function pump() {
    if (running || !queue.length) return;
    await ensure();
    queue.sort((a, b) => a.prio - b.prio || a.at - b.at);
    const job = queue[0];
    const why = blocked(job.prio > 0);
    if (why) {
      if (why === 'too soon') schedule(GAP - (D.now() - lastEnd));
      else if (why === 'streams in use') { batchOpen = false; schedule(GAP); }
      else if (why === 'backing off') schedule(budget().until - D.now());
      emit({ type: 'waiting', why });
      return;
    }
    // before each batch: does another device use the account?
    if (!batchOpen) {
      let cons = 0;
      try { cons = +(await D.activeCons()) || 0; } catch { cons = 0; }
      if (cons > 0) { schedule(5 * 60e3); emit({ type: 'waiting', why: 'account in use' }); return; }
      if (running || D.streamsInUse() > 0) return pump();
      batchOpen = true;
    }
    queue.shift();
    if (fresh(cache[job.key]) && !job.force) { emit({ type: 'cached', key: job.key }); return pump(); }
    const b = budget(); b.n++; setBudget(b);
    const ctl = new AbortController();
    running = { job, ctl };
    emit({ type: 'start', key: job.key });
    let r;
    try { r = await D.engine(job, ctl.signal); } catch (e) { r = { status: 'couldnt', why: String(e?.message || e) }; }
    running = null; lastEnd = D.now();
    if (ctl.signal.aborted) { emit({ type: 'cancelled', key: job.key }); queue.push({ ...job, at: D.now() }); batchOpen = false; return; }
    if (r.status === 'unavailable') {   // no check on this build: nothing counted, nothing kept
      const nb = budget(); nb.n = Math.max(0, nb.n - 1); setBudget(nb);
      queue.unshift(job); batchOpen = false; emit({ type: 'waiting', why: 'no check on this TV yet' });
      return;
    }
    if (r.status === 'refused') {
      const nb = budget(); nb.refusals = (nb.refusals || 0) + 1; nb.until = D.now() + BACKOFF; setBudget(nb);
      batchOpen = false;
      queue.push({ ...job, at: D.now() });
      emit({ type: 'refused', key: job.key });
      schedule(BACKOFF);
      return;
    }
    put(job.key, r);
    emit({ type: 'result', key: job.key, entry: cache[job.key] });
    if (queue.length) { if (queue[0].prio === 0) pump(); else schedule(GAP); } else batchOpen = false;
  }
  function emit(e) { subs.forEach((f) => { try { f(e); } catch (x) { console.error(x); } }); }

  return {
    ready: ensure,
    get,                                     // the cached entry, or null (touches it)
    peek: (key) => (fresh(cache?.[key]) ? cache[key] : null),
    // jobs: [{ key, url, headers }] in name-best order; why: 'title' | 'continue' | 'saved'
    async want(jobs, why = 'title') {
      await ensure();
      const prio = PRIO[why] ?? 2;
      for (const j of jobs) {
        if (fresh(cache[j.key]) || (running && running.job.key === j.key)) continue;
        const q = queue.find((x) => x.key === j.key);
        if (q) { q.prio = Math.min(q.prio, prio); continue; }
        queue.push({ ...j, prio, at: D.now() + queue.length * 1e-3 });
      }
      if (prio === 0) pump(); else if (!timer) schedule(0);
    },
    // a title page closed: its copies drop back to the background order
    leave(keys) { for (const q of queue) if (keys.includes(q.key) && q.prio === 0) q.prio = 3; },
    // Play: stop the check in flight (the native side closes the socket first)
    cancel() { if (running) running.ctl.abort(); batchOpen = false; },
    // at play start: the size or ETag changed -> forget the copy's result
    noteStart(key, { size, etag } = {}) {
      const e = cache?.[key];
      if (e && ((size && e.size && size !== e.size) || (etag && e.etag && etag !== e.etag))) { delete cache[key]; dirty = true; persist(); return true; }
      return false;
    },
    // the player closed, a preview stopped: try again
    poke() { if (!running && queue.length) schedule(1000); },
    status: () => ({ queued: queue.length, running: running?.job.key || '', budget: budget(), why: queue.length ? blocked(queue[0].prio > 0) : '' }),
    on: (f) => { subs.add(f); return () => subs.delete(f); },
    _queue: queue,
  };
}

// ---------- what a result says, in the copy ranking's terms (copies.js `checked`) ----------
// The nominal sound rates taken out of the bitrate (SPEC v1.1 S5): AAC 0.2, AC3 0.64, E-AC3 0.77, DTS 1.5,
// DTS-HD / TrueHD 4 Mb/s.
export function soundRate(a) {
  const m = String(a?.mime || '').toLowerCase();
  if (/true-?hd|mlp|dts-?hd|dts\.hd|dts\.uhd|dtshd/.test(m)) return 4;   // Media3: audio/true-hd, audio/vnd.dts.hd, audio/vnd.dts.uhd
  if (/dts/.test(m)) return 1.5;
  if (/eac3|e-ac3|ec-3/.test(m)) return 0.77;
  if (/ac3|ac-3/.test(m)) return 0.64;
  if (/aac|mp4a/.test(m)) return 0.2;
  if (/opus|vorbis|mpeg/.test(m)) return 0.2;
  return 0.2;
}
export function pictureMbps(size, dur, audio = []) {
  if (!size || !dur) return 0;
  const v = (size * 8) / dur / 1e6 - audio.reduce((s, a) => s + soundRate(a), 0);
  return v > 0 ? Math.round(v * 10) / 10 : 0;
}
export function resClass(w, h) {
  if (!w && !h) return '';
  if (w >= 3200 || h >= 1800) return '4K';
  if (w >= 1800 || h >= 1000) return '1080p';
  if (w >= 1200 || h >= 700) return '720p';
  return 'SD';
}
const LANG3 = { eng: 'English', en: 'English', ice: 'Icelandic', isl: 'Icelandic', is: 'Icelandic', spa: 'Spanish', es: 'Spanish', fre: 'French', fra: 'French', fr: 'French', ger: 'German', deu: 'German', de: 'German', ita: 'Italian', it: 'Italian', por: 'Portuguese', pt: 'Portuguese', dut: 'Dutch', nld: 'Dutch', nl: 'Dutch', swe: 'Swedish', sv: 'Swedish', nor: 'Norwegian', no: 'Norwegian', nob: 'Norwegian', dan: 'Danish', da: 'Danish', fin: 'Finnish', fi: 'Finnish', pol: 'Polish', pl: 'Polish', tur: 'Turkish', tr: 'Turkish', ara: 'Arabic', ar: 'Arabic', hin: 'Hindi', hi: 'Hindi', jpn: 'Japanese', ja: 'Japanese', kor: 'Korean', ko: 'Korean', rus: 'Russian', ru: 'Russian', chi: 'Chinese', zho: 'Chinese', zh: 'Chinese' };
const L = (c) => LANG3[String(c || '').toLowerCase().split(/[-_]/)[0]] || '';
// entry -> { res, hdr, dv, dvProfile, mbps, lang, taggedSound, len, subsInFile, inFile, ch, atmos, fps, w, h }
// (plays is decided at ranking time, natively, from these formats and the audio route: PORT-NATIVE.md `playable`)
export function checkedOf(e) {
  if (!e || !e.formats || e.status === 'couldnt') return null;
  const v = e.formats.video || {}, au = e.formats.audio || [], tx = e.formats.text || [];
  const a0 = au[0] || {};
  const dur = e.dur || 0;
  // the base layer's transfer (a Dolby Vision profile 8 copy is also HDR10; profile 5 has no HDR10 base)
  const hdr = v.transfer === 'pq' ? 'HDR10' : v.transfer === 'hlg' ? 'HLG' : '';
  const inFile = tx.map((t) => ({ lang: t.tagged === false ? (L(t.lang) ? 'English' : '') : L(t.lang), forced: !!t.forced, tagged: t.tagged !== false, raw: t.lang || '' }));
  return {
    res: resClass(v.w || 0, v.h || 0), w: v.w || 0, h: v.h || 0, fps: v.fps || 0,
    hdr, dv: !!v.dv, dvProfile: v.dv?.profile || 0,
    mbps: e.mbps || pictureMbps(e.size, dur, au),
    lang: L(a0.lang), taggedSound: a0.tagged ? L(a0.lang) : '',
    len: dur, ch: Math.max(0, ...au.map((a) => a.ch || 0)), atmos: au.some((a) => a.atmos === true),
    subsInFile: inFile.filter((t) => !t.forced && t.lang).map((t) => t.lang), inFile,
  };
}
