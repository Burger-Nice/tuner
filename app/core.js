// Data layer: storage, Xtream Codes API, M3U parsing.
// No DOM access in here, so the same file can ship in the TV builds.
(function (global) {
  'use strict';

  const store = {
    get(k, d) { try { const v = localStorage.getItem('tuner.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('tuner.' + k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem('tuner.' + k); } catch {} },
  };

  // Channel, movie and series lists can be tens of thousands of entries, too big for localStorage.
  // IndexedDB keeps them on the device so the app can open from them straight away.
  const cache = (() => {
    let opening = null;
    const db = () => opening || (opening = new Promise((resolve, reject) => {
      const r = indexedDB.open('tuner', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('catalog');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    }));
    const run = async (mode, fn) => {
      const d = await db();
      return new Promise((resolve, reject) => {
        const t = d.transaction('catalog', mode);
        const req = fn(t.objectStore('catalog'));
        t.oncomplete = () => resolve(req.result);
        t.onerror = t.onabort = () => reject(t.error);
      });
    };
    return {
      get: (k) => run('readonly', (st) => st.get(k)).catch(() => null),
      set: (k, v) => run('readwrite', (st) => st.put(v, k)).catch(() => {}),
      clear: () => run('readwrite', (st) => st.clear()).catch(() => {}),
    };
  })();

  const DEFAULTS = { liveFormat: 'hls', ua: '', scale: 'standard', player: 'mpv', nbaTeam: 'MEM' };
  const settings = () => ({ ...DEFAULTS, ...store.get('settings', {}) });
  const saveSettings = (patch) => { const s = { ...settings(), ...patch }; store.set('settings', s); return s; };

  async function fetchT(url, ms = 20000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
      return await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'The server took too long to answer.' : 'Could not reach the server. Check the address and your connection.');
    } finally {
      clearTimeout(t);
    }
  }

  async function getJSON(url, ms) {
    const res = await fetchT(url, ms);
    if (!res.ok) throw new Error(`The server answered ${res.status}. Check the server address.`);
    const text = await res.text();
    try { return JSON.parse(text); } catch { throw new Error('The server did not send Xtream data. Check the server address.'); }
  }

  const arr = (x) => (Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x) : []);
  const b64 = (s) => { try { return decodeURIComponent(escape(atob(s))); } catch { return s || ''; } };
  const yearOf = (...xs) => { for (const x of xs) { const m = String(x || '').match(/\b(19|20)\d{2}\b/); if (m) return m[0]; } return ''; };
  // The IMDb id and TMDB id some panels send (design/ui-v1/copies/RANKING.md 4.1): a tt id anywhere in the info, and
  // tmdb_id / tmdb. Only kept when it looks like one.
  const imdbIn = (...xs) => { for (const x of xs) { const m = String(x ?? '').match(/\btt\d{7,8}\b/); if (m) return m[0]; } return ''; };
  const tmdbOf = (...xs) => { for (const x of xs) if (/^\d{1,9}$/.test(String(x ?? '').trim())) return String(x).trim(); return ''; };
  const rating = (x) => { const n = parseFloat(x); return Number.isFinite(n) && n > 0 ? (Math.round(n * 10) / 10).toString() : ''; };

  // Accepts "host:port", "http://host:port/", or a full get.php / player_api.php link with credentials in it.
  function parseLogin(server, username, password) {
    let s = String(server || '').trim();
    if (!s) throw new Error('Enter the server address.');
    if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
    let u;
    try { u = new URL(s); } catch { throw new Error('That server address does not look right.'); }
    const path = u.pathname.replace(/\/(player_api|get|xmltv|panel_api)\.php$/i, '').replace(/\/+$/, '');
    return {
      server: u.origin + path,
      username: u.searchParams.get('username') || String(username || '').trim(),
      password: u.searchParams.get('password') || String(password || '').trim(),
    };
  }

  function liveSources(hlsUrl, tsUrl) {
    const hls = { url: hlsUrl, engine: 'hls' }, ts = { url: tsUrl, engine: 'mpegts' };
    return settings().liveFormat === 'ts' ? [ts, hls] : [hls, ts];
  }

  function engineFor(url) {
    const u = url.toLowerCase().split('?')[0];
    if (u.endsWith('.m3u8')) return 'hls';
    if (/\.(ts|flv)$/.test(u)) return 'mpegts';
    if (/\.(mp4|mkv|webm|mov|m4v|avi)$/.test(u)) return 'native';
    return null; // unknown: try everything
  }
  function guessSources(url) {
    const e = engineFor(url);
    if (e === 'native') return [{ url, engine: 'native' }];
    if (e === 'mpegts') return [{ url, engine: 'mpegts' }, { url, engine: 'native' }];
    return [{ url, engine: 'hls' }, { url, engine: 'mpegts' }, { url, engine: 'native' }];
  }

  // ---------- Xtream Codes ----------
  // "2026-10-26 14:30:00" as a time in the given IANA zone (the panel's), or the device's own when none is known.
  const zoneFmt = {};   // one formatter per zone: making one per programme time cost a lot on a TV
  function panelTime(str, tz) {
    const m = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)(?::(\d\d))?/.exec(String(str || ''));
    if (!m) return 0;
    const [, y, mo, d, h, mi, se] = m.map(Number);
    if (!tz) return new Date(y, mo - 1, d, h, mi, se || 0).getTime();
    const guess = Date.UTC(y, mo - 1, d, h, mi, se || 0);
    try {
      const fmt = zoneFmt[tz] || (zoneFmt[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      const p = Object.fromEntries(fmt.formatToParts(guess).map((x) => [x.type, x.value]));
      const asZone = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
      return guess - (asZone - guess);
    } catch { return new Date(y, mo - 1, d, h, mi, se || 0).getTime(); }
  }

  // A moment as the panel's clock reads it ('2026-10-26:14-30', what a timeshift link takes), in its zone (or the device's).
  function panelStamp(t, tz) {
    const two = (n) => String(n).padStart(2, '0');
    let p;
    try { p = tz && Object.fromEntries((zoneFmt[tz] || (zoneFmt[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }))).formatToParts(t).map((x) => [x.type, x.value])); } catch { p = null; }
    if (!p) { const d = new Date(t); p = { year: d.getFullYear(), month: two(d.getMonth() + 1), day: two(d.getDate()), hour: two(d.getHours()), minute: two(d.getMinutes()) }; }
    return `${p.year}-${p.month}-${p.day}:${p.hour}-${p.minute}`;
  }

  // A panel's own time string ('2026-10-27 01:00:00') as a timeshift stamp ('2026-10-27:01-00'), moved by whole hours.
  // (plus: ms after that start, for a moment inside the programme: the first-replay check plays its start + 5 min)
  function rawStamp(str, hours = 0, plus = 0) {
    const m = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)/.exec(String(str || ''));
    if (!m) return '';
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) + hours * 3600e3 + plus), two = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${two(d.getUTCMonth() + 1)}-${two(d.getUTCDate())}:${two(d.getUTCHours())}-${two(d.getUTCMinutes())}`;
  }

  // ---------- catch-up (the provider's archive of what a channel showed) ----------
  // M3U catch-up attributes (as Kodi's IPTV Simple and TiviMate read them): catchup="default|append|shift|flussonic|xc",
  // catchup-source (a template), catchup-days. Templates: {utc} {start} {utcend} {end} {lutc} {now} {duration[:div]}
  // {offset[:div]} and {Y} {m} {d} {H} {M} {S} (the start, UTC), also as ${start} and the like.
  function fillCatchup(tpl, start, end) {
    const s = Math.floor(start / 1000), e = Math.floor(end / 1000), now = Math.floor(Date.now() / 1000), d = new Date(start);
    const two = (n) => String(n).padStart(2, '0');
    const parts = { Y: d.getUTCFullYear(), m: two(d.getUTCMonth() + 1), d: two(d.getUTCDate()), H: two(d.getUTCHours()), M: two(d.getUTCMinutes()), S: two(d.getUTCSeconds()) };
    return tpl
      .replace(/\$?\{(utc|start|timestamp)\}/g, s).replace(/\$?\{(utcend|end)\}/g, e).replace(/\$?\{(lutc|now)\}/g, now)
      .replace(/\$?\{duration(?::(\d+))?\}/g, (_, k) => Math.floor((e - s) / (+k || 1)))
      .replace(/\$?\{offset(?::(\d+))?\}/g, (_, k) => Math.floor((now - s) / (+k || 1)))
      .replace(/\$?\{(?:utc|start):([YmdHMS\-:._ ]+)\}/g, (_, f) => f.replace(/[YmdHMS]/g, (c) => parts[c]))
      .replace(/\{([YmdHMS])\}/g, (_, c) => parts[c]);
  }
  function m3uCatchup(ch, start, end) {
    const c = ch.catchup;
    if (!c) return null;
    const url = ch.sources?.[0]?.url || ch.id;
    const s = Math.floor(start / 1000), dur = Math.floor((end - start) / 1000), now = Math.floor(Date.now() / 1000);
    let out = '';
    if (c.mode === 'append') out = url + fillCatchup(c.source || '?utc={utc}&lutc={lutc}', start, end);
    else if (c.mode === 'shift' || c.mode === 'timeshift') out = `${url}${url.includes('?') ? '&' : '?'}utc=${s}&lutc=${now}`;
    else if (c.mode === 'flussonic' || c.mode === 'fs') {
      out = /\/(index|video|mono)\.m3u8/.test(url) ? url.replace(/\/(index|video|mono)\.m3u8/, `/$1-${s}-${dur}.m3u8`)
        : /\/mpegts$|\.ts$/.test(url) ? url.replace(/\/mpegts$|\/?[^/]*\.ts$/, `/timeshift_abs-${s}.ts`) : '';
    } else if (c.mode === 'xc') {
      const m = /^(https?:\/\/[^/]+)\/(?:live\/)?([^/]+)\/([^/]+)\/(\d+)(?:\.\w+)?$/.exec(url);
      if (m) out = `${m[1]}/timeshift/${m[2]}/${m[3]}/${Math.ceil(dur / 60)}/${panelStamp(start, null)}/${m[4]}.ts`;
    } else if (c.source) out = fillCatchup(c.source, start, end);   // default: the template is the whole link
    return out ? guessSources(out) : null;
  }

  function xtream(acc) {
    const base = acc.server;
    const cred = `username=${encodeURIComponent(acc.username)}&password=${encodeURIComponent(acc.password)}`;
    const api = (action, extra = '', ms) => getJSON(`${base}/player_api.php?${cred}${action ? '&action=' + action : ''}${extra}`, ms);
    const path = (kind, id, ext) => `${base}/${kind}/${encodeURIComponent(acc.username)}/${encodeURIComponent(acc.password)}/${id}.${ext}`;
    const cats = (list) => arr(list).map((c) => ({ id: String(c.category_id), name: c.category_name || 'Untitled' }));
    const BIG = 120000; // full VOD catalogs can be tens of MB

    return {
      type: 'xtream',
      async login() {
        const d = await api('');
        if (!d || !d.user_info || String(d.user_info.auth) === '0') throw new Error('Wrong username or password.');
        if (d.user_info.status && !/active/i.test(d.user_info.status)) throw new Error(`This account is ${String(d.user_info.status).toLowerCase()}.`);
        return d;
      },
      async live() {
        const [c, s] = await Promise.all([api('get_live_categories'), api('get_live_streams', '', BIG)]);
        return {
          cats: cats(c),
          items: arr(s).map((x, i) => ({
            kind: 'live', id: String(x.stream_id), name: String(x.name || 'Channel').trim(), logo: x.stream_icon || '',
            cat: String(x.category_id ?? ''), num: +x.num || i + 1,
            archive: +x.tv_archive ? Math.max(1, +x.tv_archive_duration || 0) : 0,   // days the panel keeps
            sources: liveSources(path('live', x.stream_id, 'm3u8'), path('live', x.stream_id, 'ts')),
          })),
        };
      },
      async movie() {
        const [c, s] = await Promise.all([api('get_vod_categories'), api('get_vod_streams', '', BIG)]);
        return {
          cats: cats(c),
          items: arr(s).map((x) => ({
            kind: 'movie', id: String(x.stream_id), name: String(x.name || 'Movie').trim(), poster: x.stream_icon || '',
            cat: String(x.category_id ?? ''), rating: rating(x.rating), year: yearOf(x.year, x.releaseDate, x.name),
            added: +x.added || 0, url: path('movie', x.stream_id, x.container_extension || 'mp4'),
            ...(tmdbOf(x.tmdb_id, x.tmdb) ? { tmdb: tmdbOf(x.tmdb_id, x.tmdb) } : {}),
          })),
        };
      },
      async series() {
        const [c, s] = await Promise.all([api('get_series_categories'), api('get_series', '', BIG)]);
        return {
          cats: cats(c),
          items: arr(s).map((x) => ({
            kind: 'series', id: String(x.series_id), name: String(x.name || 'Series').trim(), poster: x.cover || '',
            cat: String(x.category_id ?? ''), rating: rating(x.rating), year: yearOf(x.releaseDate, x.release_date, x.year),
            added: +x.last_modified || 0,
            ...(tmdbOf(x.tmdb_id, x.tmdb) ? { tmdb: tmdbOf(x.tmdb_id, x.tmdb) } : {}),
          })),
        };
      },
      async movieInfo(m) {
        const d = await api('get_vod_info', `&vod_id=${m.id}`);
        const i = d.info || {};
        return {
          plot: i.plot || i.description || '', genre: i.genre || '', cast: i.cast || i.actors || '', director: i.director || '',
          year: yearOf(i.releasedate, i.release_date, m.year), duration: i.duration || '', rating: rating(i.rating) || m.rating,
          backdrop: arr(i.backdrop_path)[0] || i.cover_big || i.movie_image || m.poster,
          tmdb: tmdbOf(i.tmdb_id, i.tmdb, m.tmdb), imdb: imdbIn(i.imdb_id, i.imdb, i.kinopoisk_url, i.imdb_url, i.description),
          durationSecs: +i.duration_secs || 0,
        };
      },
      async seriesInfo(s) {
        const d = await api('get_series_info', `&series_id=${s.id}`);
        const i = d.info || {};
        const seasons = Object.entries(d.episodes || {})
          .map(([key, eps]) => {
            const list = arr(eps);
            const n = String(list[0]?.season ?? key);
            return {
              n,
              eps: list
                .map((e) => ({
                  kind: 'episode', id: String(e.id), season: n, ep: +e.episode_num || 0, name: e.title || `Episode ${e.episode_num}`,
                  plot: e.info?.plot || '', duration: e.info?.duration || '', still: e.info?.movie_image || '',
                  url: path('series', e.id, e.container_extension || 'mp4'),
                  seriesId: s.id, seriesName: s.name, poster: s.poster,
                }))
                .sort((a, b) => a.ep - b.ep),
            };
          })
          .filter((x) => x.eps.length)
          .sort((a, b) => +a.n - +b.n);
        return {
          plot: i.plot || '', genre: i.genre || '', cast: i.cast || '', director: i.director || '',
          year: yearOf(i.releaseDate, i.release_date, s.year), rating: rating(i.rating) || s.rating,
          backdrop: arr(i.backdrop_path)[0] || i.cover || s.poster, seasons,
          tmdb: tmdbOf(i.tmdb_id, i.tmdb, s.tmdb), imdb: imdbIn(i.imdb_id, i.imdb, i.imdb_url),
        };
      },
      // What a channel showed from start to end (ms), from the panel's archive: its timeshift link, which takes the start as
      // the panel's clock reads it and the length in minutes (design/ui-v1/catchup/SPEC.md 3.5). The clock, in this order:
      // the programme's own start string from the panel's table (o.raw, '2026-10-27 01:00:00'; o.plus ms after it, start
      // being that later moment), written back as it came with no zone conversion; else the moment in the panel's zone (from the login answer). Either way moved by the
      // channel's archive correction (o.shift, whole hours). The guide's clock offset (epgShift) is a different clock and
      // isn't used here. The .m3u8 link comes first: it's usually a VOD playlist that seeks.
      catchup(ch, start, end, o = {}) {
        if (!ch.archive) return null;
        const mins = Math.max(1, Math.ceil((end - start) / 60000)), hours = Math.round(o.shift || 0);
        const stamp = (o.raw && rawStamp(o.raw, hours, o.plus || 0)) || panelStamp(start + hours * 3600e3, acc.tz || null);
        const tail = `${encodeURIComponent(acc.username)}/${encodeURIComponent(acc.password)}/${mins}/${stamp}/${ch.id}`;
        return [{ url: `${base}/timeshift/${tail}.m3u8`, engine: 'hls' }, { url: `${base}/timeshift/${tail}.ts`, engine: 'mpegts' },
          { url: `${base}/streaming/timeshift.php?${cred}&stream=${ch.id}&start=${stamp}&duration=${mins}`, engine: 'mpegts' }];
      },
      // The channel's whole table (the past days the panel keeps, and what's coming), for the guide's past and for finding
      // which channel carried a game: each programme with its raw start string (for catchup) and has_archive (0: this one
      // isn't in the archive, whatever the channel keeps). Times as the provider sends them (guide.js applies epgShift).
      async table(ch) {
        const tz = acc.tz || null;
        const d = await api('get_simple_data_table', `&stream_id=${ch.id}`);
        return arr(d?.epg_listings).map((e) => ({
          title: b64(e.title), desc: b64(e.description), raw: String(e.start || ''),
          start: +e.start_timestamp ? +e.start_timestamp * 1000 : panelTime(e.start, tz), end: +e.stop_timestamp ? +e.stop_timestamp * 1000 : panelTime(e.end || e.stop, tz),
          kept: e.has_archive == null ? null : +e.has_archive === 1,
        })).filter((p) => p.end > p.start).sort((a, b) => a.start - b.start);
      },
      // The short guide first; when it has nothing for now, the full table (some panels only fill that one). Returned as
      // the provider sends it: guide.js applies the account's clock offset (acc.epgShift) in one place.
      // The offset: some panels' guide times are off by whole (or half) hours. Only the panel's own "on now" mark
      // (the table's now_playing) counts as evidence: each channel that has one gives the range of shifts that would put
      // it on now. A shift is used once 3 channels agree on it and they outnumber the channels that fit as they are, so
      // a channel that's off the air or a schedule with a gap can't move every guide.
      async epg(ch, why) {
        const tz = acc.tz || null;
        const when = (ts, str) => (+ts ? +ts * 1000 : panelTime(str, tz));
        const parse = (d) => arr(d?.epg_listings)
          .map((e) => ({ title: b64(e.title), desc: b64(e.description), start: when(e.start_timestamp, e.start), end: when(e.stop_timestamp, e.end || e.stop), np: +e.now_playing === 1 }))
          .filter((p) => p.end > p.start).sort((a, b) => a.start - b.start);
        const now = Date.now(), k0 = acc.epgShift || 0;
        const covers = (l, k) => l.some((p) => p.start + k <= now && p.end + k > now);
        let list = parse(await api('get_short_epg', `&stream_id=${ch.id}&limit=8`));
        if (why) why.short = list.length;
        if (!covers(list, k0)) {
          const full = parse(await api('get_simple_data_table', `&stream_id=${ch.id}`).catch(() => null));
          if (why) why.table = full.length;
          if (full.length) list = full;
        }
        const np = list.find((p) => p.np);
        const votes = (acc.epgVotes ||= {});   // channel id -> [lowest, highest] shift that puts its "on now" on now
        if (np) votes[ch.id] = [now - np.end + 1, now - np.start];
        const HALF = 1800e3, count = new Map();
        for (const [lo, hi] of Object.values(votes)) {
          for (let k = Math.ceil(Math.max(lo, -14 * 3600e3) / HALF) * HALF; k <= Math.min(hi, 14 * 3600e3); k += HALF) count.set(k, (count.get(k) || 0) + 1);
        }
        const zero = count.get(0) || 0;
        let best = 0, bn = 0;
        for (const [k, n] of count) if (k && (n > bn || (n === bn && Math.abs(k) < Math.abs(best)))) { best = k; bn = n; }
        acc.epgShift = bn >= 3 && bn > zero ? best : 0;
        if (why) why.shift = acc.epgShift;
        return list;
      },
    };
  }

  // ---------- M3U ----------
  function parseM3U(text) {
    const out = [];
    let cur = null, grp = '', head = {};
    for (const raw of text.split(/\r?\n/)) {
      const l = raw.trim();
      if (!l) continue;
      if (l.startsWith('#EXTM3U')) { for (const [, k, v] of l.matchAll(/([\w-]+)="([^"]*)"/g)) head[k.toLowerCase()] = v; continue; }
      if (l.startsWith('#EXTINF')) {
        cur = {};
        for (const [, k, v] of l.matchAll(/([\w-]+)="([^"]*)"/g)) cur[k.toLowerCase()] = v;
        const stripped = l.replace(/([\w-]+)="[^"]*"/g, '');
        cur.title = stripped.slice(stripped.indexOf(',') + 1).trim();
      } else if (l.startsWith('#EXTGRP:')) {
        grp = l.slice(8).trim();
      } else if (!l.startsWith('#') && /^[a-z]+:\/\//i.test(l)) {
        const c = cur || {};
        const name = c.title || c['tvg-name'] || l.split('/').filter(Boolean).pop();
        const cat = c['group-title'] || grp || 'Ungrouped';
        const isVod = /\/(movie|series)\//i.test(l) || engineFor(l) === 'native';
        out.push(isVod
          ? { kind: 'movie', id: l, name, poster: c['tvg-logo'] || '', cat, rating: '', year: yearOf(name), added: 0, url: l }
          : { kind: 'live', id: l, name, logo: c['tvg-logo'] || '', cat, num: parseInt(c['tvg-chno'], 10) || 0, sources: guessSources(l), ...catchupOf(c, head) });
        cur = null; grp = '';
      }
    }
    let n = 0;
    for (const x of out) if (x.kind === 'live') { n++; if (!x.num) x.num = n; }
    return out;
  }

  // A channel's catch-up from its attributes, else the playlist header's: { archive: days, catchup: { mode, source } }.
  function catchupOf(c, head) {
    const mode = (c.catchup || c['catchup-type'] || head.catchup || head['catchup-type'] || (+c['tvg-rec'] || +c.timeshift ? 'shift' : '')).toLowerCase();
    if (!mode) return {};
    const days = +(c['catchup-days'] || c['tvg-rec'] || c.timeshift || head['catchup-days']) || 1;
    return { archive: days, catchup: { mode, source: c['catchup-source'] || head['catchup-source'] || '' } };
  }

  function catsOf(items) {
    const seen = new Map();
    for (const x of items) if (!seen.has(x.cat)) seen.set(x.cat, { id: x.cat, name: x.cat });
    return [...seen.values()];
  }

  function m3u(acc) {
    let parsed = null;
    const load = async () => {
      if (parsed) return parsed;
      let text = acc.text;
      if (!text) {
        const res = await fetchT(acc.url, 90000);
        if (!res.ok) throw new Error(`The playlist server answered ${res.status}.`);
        text = await res.text();
      }
      parsed = parseM3U(text);
      if (!parsed.length) throw new Error('No channels found in that playlist.');
      return parsed;
    };
    const part = async (kind) => { const items = (await load()).filter((x) => x.kind === kind); return { cats: catsOf(items), items }; };
    return {
      type: 'm3u',
      async login() { const all = await load(); return { count: all.length }; },
      live: () => part('live'),
      movie: () => part('movie'),
      series: async () => ({ cats: [], items: [] }),
      movieInfo: async () => ({}),
      seriesInfo: async () => ({ seasons: [] }),
      epg: async () => [],
      table: async () => [],
      // (an M3U panel has no table: the moment moves by the channel's correction, o.shift hours)
      catchup: (ch, start, end, o = {}) => (ch.archive ? m3uCatchup(ch, start + Math.round(o.shift || 0) * 3600e3, end + Math.round(o.shift || 0) * 3600e3) : null),
    };
  }

  global.Core = { store, cache, settings, saveSettings, parseLogin, parseM3U, xtream, m3u, fillCatchup, rawStamp, panelStamp };
})(window);
