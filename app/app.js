(() => {
  'use strict';
  const { store, settings, saveSettings } = Core;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // Android / Google TV app (Capacitor): wire the native player and updater into the same
  // `window.tuner` interface the desktop app gets from preload.js, so the rest of the code is shared.
  const CAP = window.Capacitor;
  const ANDROID = CAP?.getPlatform?.() === 'android';
  // Which app this is: the TV and phone builds say so (scripts/build-web.js); the PC app loads app/ as is.
  const TARGET = window.TUNER_TARGET || 'pc';
  const TV = TARGET === 'tv' || /[?&]tv\b/.test(location.search);
  if (TV) document.documentElement.classList.add('tv');
  if (ANDROID && !window.tuner && CAP.registerPlugin) {
    const TP = CAP.registerPlugin('TunerPlayer');
    const AppPlugin = CAP.registerPlugin('App');
    document.documentElement.classList.add('android');
    let info = { version: '', code: 0 };
    const ready = TP.info().then((i) => (info = i)).catch(() => info);
    let ustatus = { state: 'idle' };
    const usubs = [];
    const uset = (st) => { ustatus = st; usubs.forEach((f) => f(st)); };
    let lastCheck = 0;
    const ucheck = async () => {
      if (ustatus.state === 'downloading') return;
      lastCheck = Date.now();
      uset({ state: 'checking' });
      try {
        const me = await ready;
        const r = await fetch('https://github.com/Burger-Nice/tuner/releases/latest/download/android.json', { cache: 'no-store' });
        const latest = await r.json();
        uset(+latest.code > +me.code ? { state: 'ready', version: latest.version, url: latest.url } : { state: 'current' });
      } catch (e) {
        uset({ state: 'error', message: 'Could not reach GitHub.' });
      }
    };
    TP.addListener('update', (e) => uset({ ...ustatus, state: 'downloading', percent: e.percent }));
    setTimeout(ucheck, 8000);
    setInterval(ucheck, 4 * 3600e3);
    // The TV keeps apps running in the background, so check again whenever Tuner comes back on screen.
    AppPlugin.addListener('resume', () => { if (Date.now() - lastCheck > 10 * 60e3) setTimeout(ucheck, 1500); });
    window.tuner = {
      platform: 'android',
      setUserAgent: () => {},
      openExternalPlayer: async () => false,
      version: async () => (await ready).version,
      ready,
      updates: {
        status: async () => ustatus,
        check: ucheck,
        install: async () => {
          if (!ustatus.url) return;
          const was = ustatus;
          uset({ ...was, state: 'downloading', percent: 0 });
          try { await TP.installUpdate({ url: was.url }); uset({ ...was, state: 'ready' }); } catch (e) { uset({ ...was, state: 'ready', note: e.message }); }
        },
        onStatus: (f) => usubs.push(f),
      },
      mpv: {
        available: async () => true,
        play: (o) => TP.play(o),
        stop: () => TP.stop(),
        command: (args) => TP.command({ args }),
        onEvent: (f) => TP.addListener('event', f),
      },
      onBack: (f) => AppPlugin.addListener('backButton', f),
      minimize: () => AppPlugin.minimizeApp(),
    };
  }
  const native = window.tuner || null; // Electron bridge (preload.js), or the Android bridge above
  if (ANDROID && !native) console.error('Tuner: the Android plugin bridge is missing, so the native player and updates are off.');
  if (native?.platform === 'darwin') document.documentElement.classList.add('mac');
  // The iPhone app (Capacitor). It has no mpv; Apple's player does that job.
  const IOS = window.Capacitor?.getPlatform?.() === 'ios' || /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (IOS) document.documentElement.classList.add('ios');

  // mpv, when present, is the full player for movies, episodes and full-screen TV.
  let mpvOk = false;
  let mpvCtx = null; // { kind: 'vod' | 'live', items, session }
  // The TV's own player is on screen: the app underneath skips drawing and only keeps what the player needs.
  const watching = () => ANDROID && !!mpvCtx;
  let sentList = ''; // the channel list the TV player already has
  native?.mpv?.available().then((ok) => (mpvOk = ok));
  const useMpv = () => mpvOk && settings().player !== 'builtin';

  // ---------- state ----------
  let accounts = store.get('accounts', []);
  let acc = null, src = null, info = null, epoch = 0;
  let favs = {}, progress = {}, recents = [];
  const catalog = { live: null, movie: null, series: null };
  const pending = {};
  const S = {
    live: { cat: '*', q: '', list: [], current: null, last: null },
    movie: { cat: '*', q: '', list: [], shown: 0, sort: 'rec', f: {} },
    series: { cat: '*', q: '', list: [], shown: 0, sort: 'rec', f: {} },
  };
  let view = null;

  const scoped = (k) => `a:${acc.id}:${k}`;
  const keyOf = (it) => `${it.kind}:${it.id}`;
  const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const initials = (n) => (String(n).replace(/^[A-Z]{2,3}\s*[|:\-]\s*/, '').replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('') || 'TV').toUpperCase();
  const hue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const hm = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtTime = (s) => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  const host = (u) => { try { return new URL(u).host; } catch { return u; } };

  // Redraw a block only when its content changed, and keep focus on the same control, so live score
  // updates and tab switches don't throw the remote's position out of the section.
  const focusKey = (el) => el.getAttributeNames().filter((n) => n.startsWith('data-')).map((n) => `[${n}="${CSS.escape(el.getAttribute(n))}"]`).join('') || (el.id ? `#${CSS.escape(el.id)}` : '');
  function setHtml(el, html) {
    if (el._html === html && el.childNodes.length) return false;
    const a = document.activeElement;
    const key = a && a !== el && el.contains(a) ? focusKey(a) : null;
    el.innerHTML = html;
    el._html = html;
    if (key !== null) (el.querySelector(key || ':not(*)') || el.querySelector(Nav.FOCUSABLE))?.focus({ preventScroll: true });
    return true;
  }

  // The TV layout sizes itself to the screen, so the interface size setting is for the PC and phone only.
  function applyScale() { if (TV) delete document.documentElement.dataset.scale; else document.documentElement.dataset.scale = settings().scale; }
  applyScale();
  if (native) native.setUserAgent(settings().ua);

  // Broken artwork falls back to initials.
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName !== 'IMG') return;
    if (img.parentNode?.dataset?.ini !== undefined) img.parentNode.classList.add('noimg');
    img.remove();
  }, true);

  function logo(url, name, cls = 'logo') {
    return `<span class="${cls}${url ? '' : ' noimg'}" data-ini="${esc(initials(name))}">${url ? `<img loading="lazy" decoding="async" src="${esc(url)}" alt="">` : ''}</span>`;
  }

  let toastT;
  function toast(msg, ms = 2800) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => (t.hidden = true), ms);
  }

  // ======================================================================
  // Sign in
  // ======================================================================
  function showLogin(err) {
    stopAll();
    $('#shell').hidden = true;
    $('#login').hidden = false;
    loginError(err || null);
    renderAccounts();
    setTimeout(() => { lockFields(); $('#xtServer').focus(); }, 30);
  }

  function loginError(msg) {
    const el = $('#loginErr');
    el.hidden = !msg;
    el.textContent = msg || '';
  }

  $$('.seg button').forEach((b) => b.addEventListener('click', () => {
    $$('.seg button').forEach((x) => x.classList.toggle('on', x === b));
    $('#xtForm').hidden = b.dataset.tab !== 'xtream';
    $('#m3uForm').hidden = b.dataset.tab !== 'm3u';
    loginError(null);
  }));

  // Pasting a full get.php link fills in the username and password.
  // Split it only once the whole link is in: on paste, or when you leave the field.
  // Doing it on every keystroke scrambled links typed letter by letter on a TV keyboard.
  const splitLink = (e) => {
    const v = e.target.value;
    if (!/username=/.test(v)) return;
    try {
      const p = Core.parseLogin(v);
      if (p.username) $('#xtUser').value = p.username;
      if (p.password) $('#xtPass').value = p.password;
      e.target.value = p.server;
    } catch {}
  };
  $('#xtServer').addEventListener('input', (e) => { if (e.inputType === 'insertFromPaste' || e.inputType === undefined) splitLink(e); });
  $('#xtServer').addEventListener('change', splitLink);

  $('#xtForm').addEventListener('submit', (e) => {
    e.preventDefault();
    let p;
    try { p = Core.parseLogin($('#xtServer').value, $('#xtUser').value, $('#xtPass').value); } catch (err) { return loginError(err.message); }
    if (!p.username || !p.password) return loginError('Enter your username and password.');
    signIn({ type: 'xtream', ...p, name: $('#xtName').value.trim() || host(p.server) }, e.submitter);
  });

  $('#m3uForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = $('#m3uUrl').value.trim();
    const file = $('#m3uFile').files[0];
    if (!url && !file) return loginError('Enter a playlist URL or choose a file.');
    // An Xtream get.php playlist link is better used as a full Xtream login.
    if (url && /get\.php\?.*username=/.test(url)) {
      const p = Core.parseLogin(url);
      return signIn({ type: 'xtream', ...p, name: $('#m3uName').value.trim() || host(p.server) }, e.submitter);
    }
    const a = { type: 'm3u', url: file ? null : url, name: $('#m3uName').value.trim() || (file ? file.name : host(url)) };
    if (file) a.text = await file.text();
    signIn(a, e.submitter);
  });

  function renderAccounts() {
    const box = $('#accounts');
    if (!accounts.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="label">Saved accounts</div>' + accounts.map((a, i) => `
      <button class="acct" data-i="${i}" type="button">
        <span class="av" style="color:hsl(${hue(a.name)} 70% 70%)">${esc(initials(a.name))}</span>
        <span class="who"><b>${esc(a.name)}</b><small>${esc(a.type === 'xtream' ? `${a.username} · ${host(a.server)}` : a.url ? host(a.url) : 'Local file')}</small></span>
        <span class="pill dim">${a.type === 'xtream' ? 'XTREAM' : 'M3U'}</span>
      </button>`).join('');
    $$('.acct', box).forEach((b) => b.addEventListener('click', () => signIn(withText(accounts[+b.dataset.i]), b)));
  }

  const withText = (a) => (a.type === 'm3u' && !a.url ? { ...a, text: store.get('m3u:' + a.id, '') } : { ...a });

  async function signIn(a, btn) {
    loginError(null);
    btn?.setAttribute('aria-busy', 'true');
    const label = btn?.textContent;
    if (btn?.classList.contains('btn')) btn.textContent = 'Connecting…';
    try {
      const s = a.type === 'xtream' ? Core.xtream(a) : Core.m3u(a);
      const d = await s.login();
      const same = accounts.find((x) => x.type === a.type && x.server === a.server && x.username === a.username && x.url === a.url && (a.url || x.name === a.name));
      a.id = a.id || same?.id || Math.random().toString(36).slice(2, 10);
      const { text, ...slim } = a;
      if (text && !store.set('m3u:' + a.id, text)) toast('This playlist is too large to remember. You will need to open the file again next time.', 5000);
      accounts = [slim, ...accounts.filter((x) => x.id !== a.id)];
      store.set('accounts', accounts);
      store.set('active', a.id);
      acc = a; src = s; info = d;
      enterShell();
    } catch (err) {
      $('#login').hidden && $('#shell').hidden ? showLogin(err.message) : $('#login').hidden ? toast(err.message, 5000) : loginError(err.message);
    } finally {
      btn?.removeAttribute('aria-busy');
      if (btn?.classList.contains('btn')) btn.textContent = label;
    }
  }

  function signOut() {
    store.del('active');
    acc = src = info = null;
    showLogin();
  }

  // ======================================================================
  // Shell & views
  // ======================================================================
  function enterShell() {
    epoch++;
    favs = store.get(scoped('favs'), {});
    progress = store.get(scoped('progress'), {});
    recents = store.get(scoped('recents'), []);
    for (const k in catalog) { catalog[k] = null; delete fresh[k]; }
    S.live = { cat: store.get(scoped('liveCat'), '*'), q: '', list: [], current: null, last: null, autoResume: true };
    for (const k of ['movie', 'series']) S[k] = { cat: '*', q: '', list: [], shown: 0, sort: 'rec', f: {}, ...store.get(scoped(k + 'View'), {}) };
    ['liveQ', 'movieQ', 'seriesQ'].forEach((id) => ($('#' + id).value = ''));
    $('#login').hidden = true;
    $('#shell').hidden = false;
    $$('.nav[data-view="series"]').forEach((b) => (b.hidden = acc.type !== 'xtream'));
    view = null;
    // On the TV, wait for the device check so the first screen is the right one.
    Promise.resolve(native?.ready).catch(() => {}).then(() => { go(TV ? 'home' : 'live'); if (TV) lockFields(); });
    startNba();
  }

  function go(name) {
    if (view === name) return;
    if (view === 'live') { livePlayer.stop(); exitFull(); }
    view = name;
    $$('.view').forEach((v) => (v.hidden = v.id !== 'view-' + name));
    $$('.nav').forEach((b) => b.classList.toggle('on', b.dataset.view === name));
    if (name === 'live') enterLive();
    else if (name === 'movie' || name === 'series') enterLib(name);
    else if (name === 'favs') renderFavs();
    else if (name === 'settings') renderSettings();
    else if (name === 'nba') enterNba();
    else if (name === 'home') enterHome();
    drawLiveGame();
    sumTick();
  }
  $$('.nav').forEach((b) => b.addEventListener('click', () => { go(b.dataset.view); if (TV) enterContent(b.dataset.view); }));

  // On the TV, OK on a menu item goes into that section, once its first row has loaded.
  const ENTRY = { home: '#homeRows .hcard', live: '#liveInner .ch.on, #liveInner .ch', movie: '#movieGrid .poster', series: '#seriesGrid .poster', nba: '#nbaGames .gcard.on, #nbaGames .gcard' };
  function enterContent(name) {
    const sel = ENTRY[name] || `#view-${name} :is(${Nav.FOCUSABLE})`;
    let tries = 0;
    const tick = () => {
      const a = document.activeElement;
      if (view !== name || !(a === document.body || a?.closest?.('.rail'))) return;
      const el = $$(sel).find((x) => x.getClientRects().length);
      if (el) el.focus();
      else if (++tries < 40) setTimeout(tick, 100);
    };
    setTimeout(tick, 50);
  }

  // Catalogs open from the copy saved on the device, so Tuner starts instantly. The provider is checked for
  // changes in the background, one list at a time and never while the TV player is up, and the new list is used
  // the next time you open that section.
  const fresh = {};
  let refreshQ = Promise.resolve();
  const cacheable = () => acc && (acc.type === 'xtream' || !!acc.url);
  function cacheKey(kind) {
    const who = `${acc.type}|${acc.server || ''}|${acc.username || ''}|${acc.password || ''}|${acc.url || ''}`;
    let h = 2166136261;
    for (let i = 0; i < who.length; i++) h = Math.imul(h ^ who.charCodeAt(i), 16777619);
    return `${acc.id}:${(h >>> 0).toString(36)}:${kind}`;
  }
  function adopt(kind, c) {
    for (const x of c.items) x._s = x.name.toLowerCase();
    if (kind !== 'live') tagLib(c);
    c.byId = new Map(c.items.map((x) => [x.id, x]));
    c.catName = new Map(c.cats.map((x) => [x.id, x.name]));
    return (catalog[kind] = c);
  }
  function ensure(kind) {
    if (catalog[kind]) return Promise.resolve(catalog[kind]);
    if (!pending[kind]) {
      const my = epoch;
      const load = async () => {
        if (cacheable()) {
          const hit = await Core.cache.get(cacheKey(kind));
          if (my !== epoch) throw new Error('stale');
          if (hit?.items?.length) {
            if (Date.now() - hit.at > 20 * 60e3) refreshLater(kind, my);
            return hit;
          }
        }
        const c = await src[kind]();
        if (my !== epoch) throw new Error('stale');
        if (cacheable()) Core.cache.set(cacheKey(kind), { at: Date.now(), cats: c.cats, items: c.items });
        return c;
      };
      pending[kind] = load()
        .then((c) => { if (my !== epoch) throw new Error('stale'); return adopt(kind, c); })
        .finally(() => delete pending[kind]);
    }
    return pending[kind];
  }
  function refreshLater(kind, my) {
    refreshQ = refreshQ.then(async () => {
      await new Promise((r) => setTimeout(r, 5000));
      while (watching()) await new Promise((r) => setTimeout(r, 30000));
      if (my !== epoch) return;
      try {
        const c = await src[kind]();
        if (my !== epoch) return;
        Core.cache.set(cacheKey(kind), { at: Date.now(), cats: c.cats, items: c.items });
        fresh[kind] = c;
      } catch {}
    });
  }
  function takeFresh(kind) {
    const c = fresh[kind];
    if (!c) return;
    delete fresh[kind];
    adopt(kind, c);
    if (kind === 'live' && S.live.current) S.live.current = catalog.live.byId.get(S.live.current.id) || S.live.current;
  }

  // ---------- shared: categories & filtering ----------
  const favList = (kind) => Object.values(favs).filter((f) => f.kind === kind);

  function continueList(kind) {
    const rows = Object.values(progress).filter((p) => p.t > 30 && p.t < p.d * 0.94).sort((a, b) => b.at - a.at);
    if (kind === 'movie') return rows.filter((p) => p.item.kind === 'movie').map((p) => catalog.movie?.byId.get(p.item.id) || p.item);
    const seen = new Set(), out = [];
    for (const p of rows) {
      if (p.item.kind !== 'episode' || seen.has(p.item.seriesId)) continue;
      seen.add(p.item.seriesId);
      out.push(catalog.series?.byId.get(p.item.seriesId) || { kind: 'series', id: p.item.seriesId, name: p.item.seriesName, poster: p.item.poster, cat: '' });
    }
    return out;
  }

  function renderCats(kind) {
    const st = S[kind], c = catalog[kind];
    const counts = new Map();
    for (const it of c.items) counts.set(it.cat, (counts.get(it.cat) || 0) + 1);
    const special = [['*', kind === 'live' ? 'All channels' : kind === 'movie' ? 'All movies' : 'All series', c.items.length]];
    if (kind === 'live' && recents.length) special.push(['recent', 'Recently watched', recents.filter((id) => c.byId.has(id)).length]);
    if (kind !== 'live') { const n = continueList(kind).length; if (n) special.push(['continue', 'Continue watching', n]); }
    special.push(['fav', 'Favorites', favList(kind).length]);
    const cats = c.cats.filter((k) => counts.get(k.id));
    if (!cats.length && counts.size > 1) for (const id of counts.keys()) cats.push({ id, name: id || 'Other' });
    const btn = (id, name, n) => {
      const p = kind === 'live' ? { name } : prettyCat(name);
      return `<button class="cat${id === st.cat ? ' on' : ''}" data-cat="${esc(id)}"><span>${esc(p.name)}${p.tag ? `<em class="cat-tag">${esc(p.tag)}</em>` : ''}</span><small>${n.toLocaleString()}</small></button>`;
    };
    $(`#${kind}Cats`).innerHTML = special.map((x) => btn(...x)).join('') + (cats.length ? '<div class="cat-sep"></div>' : '') + cats.map((k) => btn(k.id, k.name, counts.get(k.id))).join('');
  }

  function catTitle(kind) {
    const st = S[kind];
    if (st.q.trim()) return `Results for “${st.q.trim()}”`;
    const name = catalog[kind].catName.get(st.cat);
    return { '*': $(`#${kind}Cats .cat`)?.firstChild.textContent, fav: 'Favorites', recent: 'Recently watched', continue: 'Continue watching' }[st.cat] || (name && kind !== 'live' ? prettyCat(name).name : name) || st.cat;
  }

  function filtered(kind) {
    const st = S[kind], c = catalog[kind];
    const q = st.q.trim().toLowerCase();
    if (q) {
      const words = q.split(/\s+/);
      return c.items.filter((x) => words.every((w) => x._s.includes(w)));
    }
    if (st.cat === '*') return c.items;
    if (st.cat === 'fav') return favList(kind).map((f) => c.byId.get(f.id) || f);
    if (st.cat === 'recent') return recents.map((id) => c.byId.get(id)).filter(Boolean);
    if (st.cat === 'continue') return continueList(kind);
    return c.items.filter((x) => x.cat === st.cat);
  }

  // ---------- movies & series: language, genre, quality and subtitles ----------
  // Xtream lists don't carry these, but providers put them in their category and title names
  // ("EN | ACTION", "|FR| Title", "4K", "MULTI-SUB"), so they're read from there.
  const LANG_CODES = {
    EN: 'English', ENG: 'English', US: 'English', USA: 'English', UK: 'English', GB: 'English', AU: 'English',
    FR: 'French', FRA: 'French', FRE: 'French', VF: 'French', DE: 'German', GER: 'German', DEU: 'German',
    ES: 'Spanish', ESP: 'Spanish', SPA: 'Spanish', LAT: 'Spanish', IT: 'Italian', ITA: 'Italian',
    PT: 'Portuguese', POR: 'Portuguese', BR: 'Portuguese', NL: 'Dutch', DUT: 'Dutch', NED: 'Dutch',
    TR: 'Turkish', TUR: 'Turkish', AR: 'Arabic', ARA: 'Arabic', ARAB: 'Arabic', PL: 'Polish', POL: 'Polish',
    RU: 'Russian', RUS: 'Russian', HI: 'Hindi', HIN: 'Hindi', IN: 'Hindi', SE: 'Swedish', SV: 'Swedish', SWE: 'Swedish',
    NO: 'Norwegian', NOR: 'Norwegian', DK: 'Danish', DA: 'Danish', DAN: 'Danish', FI: 'Finnish', FIN: 'Finnish',
    IS: 'Icelandic', ISL: 'Icelandic', ICE: 'Icelandic', GR: 'Greek', GRE: 'Greek', RO: 'Romanian', ROM: 'Romanian',
    HU: 'Hungarian', HUN: 'Hungarian', CZ: 'Czech', CZE: 'Czech', AL: 'Albanian', ALB: 'Albanian',
    EXYU: 'Balkan', YU: 'Balkan', HR: 'Balkan', RS: 'Balkan', KR: 'Korean', KOR: 'Korean', JP: 'Japanese', JPN: 'Japanese',
    CN: 'Chinese', CHI: 'Chinese', FA: 'Persian', IR: 'Persian', KU: 'Kurdish', KUR: 'Kurdish', UR: 'Urdu', PK: 'Urdu',
    TA: 'Tamil', TAM: 'Tamil', TE: 'Telugu', PH: 'Filipino', TH: 'Thai', VN: 'Vietnamese', HE: 'Hebrew', IL: 'Hebrew',
    BG: 'Bulgarian', UA: 'Ukrainian', UKR: 'Ukrainian',
  };
  const LANG_WORDS = [
    [/\b(english)\b/i, 'English'], [/\b(french|fran[cç]ais)\b/i, 'French'], [/\b(german|deutsch)\b/i, 'German'],
    [/\b(spanish|espa[nñ]ol|castellano|latino)\b/i, 'Spanish'], [/\b(italian|italiano)\b/i, 'Italian'],
    [/\b(portuguese|portugu[eê]s|brasil)\b/i, 'Portuguese'], [/\b(dutch|nederlands)\b/i, 'Dutch'], [/\b(turkish|t[uü]rk)/i, 'Turkish'],
    [/\b(arabic)\b|عربي/i, 'Arabic'], [/\b(polish|polski)\b/i, 'Polish'], [/\b(russian)\b/i, 'Russian'], [/\b(hindi|bollywood)\b/i, 'Hindi'],
    [/\b(swedish|svensk)/i, 'Swedish'], [/\b(norwegian|norsk)/i, 'Norwegian'], [/\b(danish|dansk)/i, 'Danish'], [/\b(finnish|suomi)\b/i, 'Finnish'],
    [/\b(icelandic|[ií]slensk)/i, 'Icelandic'], [/\b(greek)\b/i, 'Greek'], [/\b(korean|k-?drama)\b/i, 'Korean'], [/\b(japanese)\b/i, 'Japanese'],
    [/\b(chinese|mandarin|cantonese)\b/i, 'Chinese'], [/\b(persian|farsi)\b/i, 'Persian'], [/\b(tamil)\b/i, 'Tamil'], [/\b(telugu)\b/i, 'Telugu'],
  ];
  const GENRES = [
    [/action/i, 'Action'], [/advent/i, 'Adventure'], [/anim(?!e)|cartoon/i, 'Animation'], [/\banime\b/i, 'Anime'], [/comed|com[ée]di|kom[öo]d|commedia|stand.?up/i, 'Comedy'],
    [/crime|gangster/i, 'Crime'], [/docu/i, 'Documentary'], [/dram/i, 'Drama'], [/family/i, 'Family'], [/fantas/i, 'Fantasy'],
    [/horr|terror|grusel/i, 'Horror'], [/\bkids?\b|child|enfant|kinder|infantil|junior/i, 'Kids'], [/music|concert/i, 'Music'], [/myster/i, 'Mystery'],
    [/roman/i, 'Romance'], [/sci.?fi|science fiction/i, 'Sci-Fi'], [/sport/i, 'Sport'], [/thrill|suspense/i, 'Thriller'], [/\bwar\b/i, 'War'],
    [/western/i, 'Western'], [/christmas|holiday/i, 'Christmas'], [/reality/i, 'Reality'], [/history|historic/i, 'History'],
  ];
  const codeAt = (s, re) => { const m = s.match(re); return m && LANG_CODES[m[1].toUpperCase().replace(/[^A-Z]/g, '')]; };
  const PREFIX = /^\W*([A-Za-z]{2,4}(?:-?YU)?)\s*[|:\-–—\]\)•▎▶►»]/, SUFFIX = /[|:\-–—\[(•]\s*([A-Z]{2,4})\W*$/;
  function langOf(s, strict) {
    const c = codeAt(s, PREFIX) || (!strict && codeAt(s, SUFFIX));
    if (c) return c;
    if (strict) return '';
    for (const [re, name] of LANG_WORDS) if (re.test(s)) return name;
    return '';
  }
  function qualityOf(s) {
    return /\b(4k|uhd|2160p?)\b/i.test(s) ? '4K' : /\b(fhd|1080p?)\b/i.test(s) ? 'Full HD' : /\b(hd|720p?)\b/i.test(s) ? 'HD' : /\bsd\b/i.test(s) ? 'SD' : '';
  }
  const SUBS = /multi[ -]?subs?|\bsubs?\b|subtitle|vostfr|\bsubbed\b/i;
  // "EN | NEW RELEASES" reads as "New Releases" with a small EN tag.
  const KEEP_CAPS = /^(4K|UHD|FHD|HD|SD|HDR|TV|UK|US|USA|EN|NBA|NFL|MLB|NHL|UFC|WWE|BBC|HBO|DC|3D|VIP|II|III|IV)$/;
  function prettyCat(name) {
    let rest = name, tag = '';
    const m = name.match(PREFIX) || name.match(SUFFIX);
    if (m && LANG_CODES[m[1].toUpperCase().replace(/[^A-Z]/g, '')]) {
      tag = m[1].toUpperCase();
      rest = (name.slice(0, m.index) + name.slice(m.index + m[0].length)).replace(/^[\s|:\-–—•▎]+|[\s|:\-–—•▎]+$/g, '');
    }
    if (rest === rest.toUpperCase() && /[A-Z]{3}/.test(rest)) {
      rest = rest.toLowerCase().replace(/[\p{L}\p{N}+]+/gu, (w) => (KEEP_CAPS.test(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)));
    }
    return { name: rest || name, tag };
  }
  // Providers don't share view counts, so "Popular" means well rated and recent, with a lift for anything
  // the provider files under trending, popular or top-10 style categories.
  const HOT = /popular|trending|\btop ?(10|20|50|100)\b|most watched|box ?office|blockbuster|\bhot\b/i;
  function popularity(x, hot) {
    const year = new Date().getFullYear();
    const rating = parseFloat(x.rating) || 5.5;
    const age = Math.max(0, year - (+x.year || year - 5));
    const fresh = x.added && Date.now() / 1000 - x.added < 60 * 86400 ? 0.6 : 0;
    return rating / (1 + age / 4) + fresh + (hot ? 2.5 : 0);
  }
  function tagLib(c) {
    const byCat = new Map();
    for (const k of c.cats) byCat.set(k.id, { lang: langOf(k.name), q: qualityOf(k.name), sub: SUBS.test(k.name), hot: HOT.test(k.name), genres: GENRES.filter(([re]) => re.test(k.name)).map(([, g]) => g) });
    const none = { lang: '', q: '', sub: false, hot: false, genres: [] };
    for (const x of c.items) {
      const k = byCat.get(x.cat) || none;
      x._lang = langOf(x.name, true) || k.lang;
      x._q = qualityOf(x.name) || k.q;
      x._sub = k.sub || SUBS.test(x.name);
      x._genres = x.genre ? [...new Set([...k.genres, ...String(x.genre).split(/[,/|]/).map((g) => g.trim()).filter(Boolean)])] : k.genres;
      x._pop = popularity(x, k.hot);
    }
    // English first, then categories with no language in the name, then the rest, each in the provider's order.
    const rank = (l) => (l === 'English' ? 0 : l ? 2 : 1);
    c.cats = c.cats.map((k, i) => ({ k, i, r: rank(byCat.get(k.id).lang) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.k);
    const count = (get) => { const m = new Map(); for (const x of c.items) for (const v of [].concat(get(x))) if (v) m.set(v, (m.get(v) || 0) + 1); return m; };
    c.facets = { lang: count((x) => x._lang), genre: count((x) => x._genres), q: count((x) => x._q), sub: count((x) => (x._sub ? 'yes' : '')) };
  }
  const QUALITY_ORDER = ['4K', 'Full HD', 'HD', 'SD'];
  // Language: "first" lists English titles first (the default when the provider marks languages), "any" keeps
  // every language mixed, and a language name shows only that language.
  const langMode = (kind) => S[kind].f.lang || (catalog[kind]?.facets.lang.has('English') ? 'first' : 'any');
  function facetFilter(kind, list) {
    const f = S[kind].f, lang = langMode(kind);
    const only = lang !== 'first' && lang !== 'any' ? lang : '';
    if (!only && !f.genre && !f.q && !f.sub) return list;
    return list.filter((x) => (!only || x._lang === only) && (!f.genre || x._genres?.includes(f.genre)) && (!f.q || x._q === f.q) && (!f.sub || x._sub));
  }
  const englishFirst = (list) => {
    const rank = (x) => (x._lang === 'English' ? 0 : x._lang ? 2 : 1);
    return list.map((x, i) => [rank(x), i, x]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((e) => e[2]);
  };

  // Sort and filters as a row of chips; OK on one slides in its choices from the right.
  function libChoices(kind) {
    const fc = catalog[kind].facets;
    const byCount = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
    const out = [{ key: 'sort', label: 'Sort', options: [['popular', 'Popular'], ['added', kind === 'movie' ? 'Recently added' : 'Recently updated'], ['rating', 'Top rated'], ['year', 'Newest releases'], ['az', 'A–Z']].map(([v, l]) => ({ v, l })) }];
    if (fc.lang.size > 1 || (fc.lang.size === 1 && !fc.lang.has('English'))) {
      out.push({ key: 'lang', label: 'Language', options: [
        ...(fc.lang.has('English') ? [{ v: 'first', l: 'English first' }] : []), { v: 'any', l: 'Any language' },
        ...byCount(fc.lang).map(([v, n]) => ({ v, l: v, n })),
      ] });
    }
    if (fc.genre.size > 1) out.push({ key: 'genre', label: 'Genre', options: [{ v: '', l: 'All genres' }, ...byCount(fc.genre).map(([v, n]) => ({ v, l: v, n }))] });
    if (fc.q.size > 1 || (fc.q.size === 1 && !fc.q.has('HD'))) out.push({ key: 'q', label: 'Quality', options: [{ v: '', l: 'Any quality' }, ...QUALITY_ORDER.filter((q) => fc.q.has(q)).map((q) => ({ v: q, l: q, n: fc.q.get(q) }))] });
    if (fc.sub.size) out.push({ key: 'sub', label: 'Subtitles', options: [{ v: '', l: 'Any' }, { v: 'yes', l: 'With subtitles', n: fc.sub.get('yes') }] });
    return out;
  }
  const choiceValue = (kind, key) => (key === 'sort' ? S[kind].sort : key === 'lang' ? langMode(kind) : S[kind].f[key] || '');
  const filtersActive = (kind) => { const f = S[kind].f; return !!(f.genre || f.q || f.sub || (f.lang && f.lang !== 'first' && f.lang !== 'any')); };
  const CHEVRON = '<svg class="chip-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const SORT_ICON = '<svg class="chip-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4m-3.5 3.5L17 4l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function renderFilters(kind) {
    // Short chips: the sort and language show their value; a filter shows its name until it's set.
    const chips = libChoices(kind).map((c) => {
      const v = choiceValue(kind, c.key);
      const opt = c.options.find((o) => o.v === v) || c.options[0];
      const set = c.key === 'lang' ? v !== 'first' && v !== 'any' : c.key !== 'sort' && !!v;
      const text = c.key === 'sort' || c.key === 'lang' || set ? opt.l : c.label;
      return `<button class="chip${set ? ' set' : ''}" data-chip="${c.key}">${c.key === 'sort' ? SORT_ICON : ''}<span class="chip-v">${esc(text)}</span>${CHEVRON}</button>`;
    });
    if (filtersActive(kind)) chips.push('<button class="chip clear" data-chip="clear"><span class="chip-v">Clear</span></button>');
    setHtml($(`#${kind}Filters`), chips.join(''));
  }
  function setChoice(kind, key, v) {
    const st = S[kind];
    if (key === 'clear') st.f = st.f.lang === 'first' || st.f.lang === 'any' ? { lang: st.f.lang } : {};
    else if (key === 'sort') st.sort = v;
    else st.f = { ...st.f, [key]: v };
    store.set(scoped(kind + 'View'), { sort: st.sort, f: st.f });
    refreshLib(kind);
  }

  // ---------- option sheet: a list of choices that slides in from the right ----------
  let sheet = null;
  function openSheet(title, options, value, onPick, back) {
    const box = $('#optSheet');
    box.innerHTML = `<div class="opt-scrim" data-close></div><div class="opt-panel" role="dialog" aria-label="${esc(title)}"><div class="opt-title">${esc(title)}</div><div class="opt-list" data-nav="v-strict">${options.map((o) => `<button class="opt${o.v === value ? ' on' : ''}" data-v="${esc(o.v)}"><svg class="opt-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="opt-l">${esc(o.l)}</span>${o.n != null ? `<small>${o.n.toLocaleString()}</small>` : ''}</button>`).join('')}</div></div>`;
    box.hidden = false;
    sheet = { onPick, back };
    requestAnimationFrame(() => box.classList.add('open'));
    const cur = box.querySelector('.opt.on') || box.querySelector('.opt');
    cur?.focus({ preventScroll: true });
    cur?.scrollIntoView({ block: 'center' });
  }
  function closeSheet() {
    const box = $('#optSheet');
    if (box.hidden) return;
    box.classList.remove('open');
    box.hidden = true;
    box.innerHTML = '';
    const back = sheet?.back;
    sheet = null;
    back?.();
  }
  $('#optSheet').addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) return closeSheet();
    const o = e.target.closest('.opt');
    if (!o || !sheet) return;
    const pick = sheet.onPick;
    closeSheet();
    pick(o.dataset.v);
  });

  function wireCats(kind, refresh) {
    $(`#${kind}Cats`).addEventListener('click', (e) => {
      const b = e.target.closest('.cat');
      if (!b) return;
      S[kind].cat = b.dataset.cat;
      S[kind].q = '';
      $(`#${kind}Q`).value = '';
      if (kind === 'live') store.set(scoped('liveCat'), b.dataset.cat);
      $$(`#${kind}Cats .cat`).forEach((x) => x.classList.toggle('on', x === b));
      refresh();
    });
    let t;
    $(`#${kind}Q`).addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => { S[kind].q = e.target.value; refresh(); }, 120);
    });
  }

  // ======================================================================
  // Live TV
  // ======================================================================
  const liveVideo = $('#liveVideo');
  const stage = $('#liveStage');
  const livePlayer = new Player(liveVideo, (s) => {
    $('#liveSpin').hidden = s !== 'loading';
    $('#tally').classList.toggle('on', s === 'playing');
    if (s === 'playing') { $('#liveMsg').hidden = true; updateNow(); checkLiveAudio(); checkLiveVideo(); }
    if (s === 'error' && S.live.current) {
      if (useMpv()) liveMsg('The preview can’t play this channel', 'It may be 4K or HEVC, which only the full player can decode. If the full player can’t play it either, the channel is probably offline.', [['Watch in full player', () => liveMpv(), true], ['Try again', () => livePlayer.retry()], ['Next channel', () => zap(1)]]);
      else liveMsg('This channel is not playing', 'It may be offline, or your provider may be blocking it right now. Try again or switch channel.', [['Try again', () => livePlayer.retry(), true], ['Next channel', () => zap(1)]]);
    }
    setPlayIcon();
  });
  livePlayer.onLevels = (levels) => {
    const sel = $('#lQuality');
    if (!levels || levels.length < 2) { sel.hidden = true; return; }
    sel.innerHTML = '<option value="-1">Auto</option>' + levels
      .map((l, i) => [i, l]).sort((a, b) => (b[1].height || 0) - (a[1].height || 0))
      .map(([i, l]) => `<option value="${i}">${l.height ? l.height + 'p' : Math.round(l.bitrate / 1000) + ' kbps'}</option>`).join('');
    sel.hidden = false;
  };
  $('#lQuality').addEventListener('change', (e) => livePlayer.setLevel(+e.target.value));

  liveVideo.volume = store.get('volume', 1);
  liveVideo.muted = store.get('muted', false);
  function syncVol() {
    $('#lVol').value = liveVideo.muted ? 0 : liveVideo.volume;
    $('#lMuteIco').innerHTML = liveVideo.muted || liveVideo.volume === 0
      ? '<path d="M3 9v6h4l5 5V4L7 9H3zm13.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z"/>'
      : '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/>';
    store.set('volume', liveVideo.volume);
    store.set('muted', liveVideo.muted);
  }
  liveVideo.addEventListener('volumechange', syncVol);
  syncVol();
  function setPlayIcon() {
    $('#lPlayIco').innerHTML = liveVideo.paused ? '<path d="M8 5v14l11-7z"/>' : '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>';
  }

  // Chromium drops audio it can't decode (AC3/E-AC3 on many sports and movie channels). mpv can play it.
  let audioCheckT;
  function checkLiveAudio() {
    clearTimeout(audioCheckT);
    const ch = S.live.current;
    audioCheckT = setTimeout(() => {
      if (S.live.current !== ch || liveVideo.paused || liveVideo.muted || !useMpv()) return;
      if ('webkitAudioDecodedByteCount' in liveVideo && liveVideo.webkitAudioDecodedByteCount === 0) {
        toast('No sound? This channel’s audio needs the full player. Press F to watch it full screen.', 6000);
      }
    }, 5000);
  }

  // Sound but no picture usually means HEVC video the preview can't decode.
  let videoCheckT;
  function checkLiveVideo() {
    clearTimeout(videoCheckT);
    const ch = S.live.current;
    videoCheckT = setTimeout(() => {
      if (S.live.current !== ch || liveVideo.paused || !useMpv()) return;
      const frames = 'webkitDecodedFrameCount' in liveVideo ? liveVideo.webkitDecodedFrameCount : 1;
      if (liveVideo.videoWidth === 0 || frames === 0) {
        liveMsg('No picture in the preview', 'This channel probably uses 4K or HEVC video. The full player can show it. If it’s a radio channel, you can ignore this.', [['Watch in full player', () => liveMpv(), true], ['Dismiss', () => ($('#liveMsg').hidden = true)]]);
      }
    }, 4000);
  }

  function liveMsg(title, text, actions = []) {
    $('#liveMsgTitle').textContent = title;
    $('#liveMsgText').textContent = text;
    const row = $('#liveMsgActions');
    row.innerHTML = '';
    actions.forEach(([label, fn, primary]) => {
      const b = document.createElement('button');
      b.className = 'btn' + (primary ? ' primary' : '');
      b.textContent = label;
      b.onclick = fn;
      row.appendChild(b);
    });
    $('#liveMsg').hidden = false;
  }

  async function enterLive() {
    takeFresh('live');
    const st = S.live;
    if (!catalog.live) {
      $('#liveInner').style.height = '';
      $('#liveInner').innerHTML = '<div class="loading-note"><div class="spinner"></div>Loading channels…</div>';
      $('#liveCats').innerHTML = '';
      liveMsg('Loading channels', 'Fetching the channel list from your provider.');
      try { await ensure('live'); } catch (e) {
        if (e.message === 'stale') return;
        $('#liveInner').innerHTML = `<div class="empty"><h3>Could not load channels</h3><p>${esc(e.message)}</p></div>`;
        liveMsg('Could not load channels', e.message, [['Try again', () => { view = null; go('live'); }, true]]);
        return;
      }
      if (view !== 'live') return;
    }
    if (st.cat !== '*' && !['fav', 'recent'].includes(st.cat) && !catalog.live.catName.has(st.cat)) st.cat = '*';
    renderCats('live');
    refreshLive();
    if (st.current) tune(st.current, { noFull: true });
    else if (st.autoResume) {
      st.autoResume = false;
      const last = catalog.live.byId.get(store.get(scoped('lastLive'), ''));
      if (last) tune(last, { noFull: true });
      else liveMsg('Pick a channel', `${catalog.live.items.length.toLocaleString()} channels ready. Choose one from the list, or press ↓ to start from the top.`);
    } else liveMsg('Pick a channel', 'Choose one from the list, or press ↓ to start from the top.');
    if (TV) setTimeout(() => { if (document.activeElement === document.body) ($('#liveInner .ch.on') || $('#liveInner .ch'))?.focus(); }, 300);
  }

  function refreshLive() {
    const st = S.live;
    st.list = filtered('live');
    $('#liveTitle').textContent = catTitle('live');
    $('#liveCount').textContent = st.list.length.toLocaleString();
    $('#liveList').scrollTop = 0;
    renderLiveList();
    if (st.current) scrollToCurrent();
  }
  wireCats('live', refreshLive);

  const listEl = $('#liveList'), inner = $('#liveInner');
  const rowH = () => rem() * 3.75;
  function renderLiveList() {
    const st = S.live;
    if (!catalog.live) return;
    const row = rowH();
    inner.style.height = st.list.length * row + 'px';
    if (!st.list.length) {
      inner.style.height = '';
      inner.innerHTML = `<div class="empty">${st.cat === 'fav' && !st.q ? '<h3>No favorite channels yet</h3><p>Press S or the star while watching to add one.</p>' : 'No channels match.'}</div>`;
      return;
    }
    const focused = document.activeElement?.closest?.('#liveInner .ch')?.dataset.i;
    const top = listEl.scrollTop, h = listEl.clientHeight || 600;
    const a = Math.max(0, Math.floor(top / row) - 8), b = Math.min(st.list.length, Math.ceil((top + h) / row) + 8);
    const showCat = st.cat === '*' || st.cat === 'fav' || st.cat === 'recent' || st.q;
    let html = '';
    for (let i = a; i < b; i++) {
      const c = st.list[i];
      const on = st.current?.id === c.id;
      const sub = showCat ? catalog.live.catName.get(c.cat) || '' : '';
      html += `<button class="ch${on ? ' on' : ''}" data-i="${i}" style="top:${i * row}px"><span class="num">${c.num}</span>${logo(c.logo, c.name)}<span class="meta"><span class="name">${esc(c.name)}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span>${favs[keyOf(c)] ? '<span class="star">★</span>' : ''}${on ? '<span class="eq"><i></i><i></i><i></i></span>' : ''}</button>`;
    }
    inner.innerHTML = html;
    if (focused != null) inner.querySelector(`[data-i="${focused}"]`)?.focus({ preventScroll: true });
  }
  let rafList = 0;
  listEl.addEventListener('scroll', () => { cancelAnimationFrame(rafList); rafList = requestAnimationFrame(renderLiveList); }, { passive: true });
  window.addEventListener('resize', () => view === 'live' && renderLiveList());
  inner.addEventListener('click', (e) => { const b = e.target.closest('.ch'); if (b) tune(S.live.list[+b.dataset.i]); });
  let previewT;
  inner.addEventListener('focusin', (e) => {
    if (!TV) return;
    const b = e.target.closest('.ch');
    const ch = b && S.live.list[+b.dataset.i];
    clearTimeout(previewT);
    if (!ch || ch === S.live.current) return;
    previewT = setTimeout(() => previewChannel(ch), 220);
  });
  function previewChannel(ch) {
    S.live.current = ch;
    $$('#liveInner .ch.on').forEach((x) => x.classList.remove('on'));
    inner.querySelector(`.ch[data-i="${S.live.list.indexOf(ch)}"]`)?.classList.add('on');
    updateNow();
    loadEpg(ch);
    autoLink(ch, ch.name);
  }

  function scrollToCurrent() {
    const i = S.live.list.findIndex((c) => c.id === S.live.current?.id);
    if (i < 0) return;
    const row = rowH(), y = i * row;
    if (y < listEl.scrollTop || y > listEl.scrollTop + listEl.clientHeight - row) listEl.scrollTop = y - listEl.clientHeight / 2 + row / 2;
    renderLiveList();
  }

  // The preview can't decode HEVC, which nearly every 4K channel uses. Those go to the full player.
  const needsFull = (ch) => /(^|[^a-z0-9])(4k|uhd|2160p?|hevc|h\.?265)(?![a-z0-9])/i.test(ch?.name || '');
  const fullPlayerMsg = (title, text) => liveMsg(title, text, [['Watch in full player', () => liveMpv(), true], ['Next channel', () => zap(1)]]);

  // noFull: tuned by Tuner itself (start-up, coming back from the full player), so never jump to full screen.
  function tune(ch, { noFull } = {}) {
    if (!ch) return;
    const st = S.live;
    if (st.current && st.current.id !== ch.id) st.last = st.current;
    st.current = ch;
    recents = [ch.id, ...recents.filter((id) => id !== ch.id)].slice(0, 50);
    store.set(scoped('recents'), recents);
    store.set(scoped('lastLive'), ch.id);
    $('#liveMsg').hidden = true;
    if (useMpv() && ANDROID) {
      // On Android and Google TV every channel plays in the native full-screen player.
      livePlayer.stop();
      liveMsg(ch.name, TV ? 'Press OK to watch.' : 'Tap Watch to play full screen.', [['Watch', () => liveMpv(), true]]);
      if (!noFull) liveMpv();
      else if (TV) setTimeout(() => { if (!document.activeElement?.closest?.('.view')) $('#liveInner .ch.on')?.focus({ preventScroll: true }); }, 60);
    } else if (useMpv() && needsFull(ch)) {
      livePlayer.stop();
      if (noFull) fullPlayerMsg('4K channel', 'This channel plays in the full player, which handles 4K and HEVC video.');
      else { fullPlayerMsg('Opening in the full player', '4K channels play in the full player.'); liveMpv(); }
    } else {
      livePlayer.load(ch.sources, { timeout: 15000 });
    }
    renderLiveList();
    scrollToCurrent();
    updateNow();
    showOsd();
    loadEpg(ch);
    autoLink(ch, ch.name);
  }

  function zap(d) {
    const st = S.live;
    const list = st.list.length ? st.list : catalog.live?.items || [];
    if (!list.length) return;
    let i = st.current ? list.findIndex((c) => c.id === st.current.id) : -1;
    i = i < 0 ? (d > 0 ? 0 : list.length - 1) : (i + d + list.length) % list.length;
    tune(list[i]);
  }

  function updateNow() {
    const ch = S.live.current;
    $('#nowCard').hidden = !ch;
    if (!ch) return;
    $('#nowLogo').outerHTML = logo(ch.logo, ch.name, 'logo lg').replace('<span ', '<span id="nowLogo" ');
    $('#nowName').textContent = ch.name;
    const parts = [`<span>CH ${ch.num}</span>`];
    const cat = catalog.live?.catName.get(ch.cat);
    if (cat) parts.push(`<span>${esc(cat)}</span>`);
    if (liveVideo.videoHeight && !liveVideo.paused) parts.push('<span class="pill live">LIVE</span>', `<span class="pill dim">${liveVideo.videoHeight}p</span>`);
    $('#nowSub').innerHTML = parts.join('');
    const on = !!favs[keyOf(ch)];
    $('#nowFav').textContent = on ? '★ Favorite' : '☆ Favorite';
    $('#nowFav').classList.toggle('on', on);
  }
  liveVideo.addEventListener('loadedmetadata', updateNow);
  liveVideo.addEventListener('resize', updateNow);

  let epgTimer, epgNow = '';
  async function loadEpg(ch) {
    clearInterval(epgTimer);
    epgNow = '';
    const box = $('#epg');
    box.innerHTML = '<div class="epg-empty">Loading guide…</div>';
    let list = [];
    try { list = await src.epg(ch); } catch {}
    if (S.live.current !== ch) return;
    const draw = () => {
      const now = Date.now();
      const cur = list.find((p) => p.start <= now && p.end > now);
      const next = list.filter((p) => p.start >= (cur ? cur.end : now)).slice(0, 4);
      const was = epgNow;
      epgNow = cur ? cur.title : '';
      $('#osdProg').textContent = epgNow;
      if (epgNow !== was) autoLink(ch, `${ch.name} ${epgNow}`);
      if (!cur && !next.length) { box.innerHTML = '<div class="epg-empty">No guide information for this channel.</div>'; return; }
      let html = '';
      if (cur) {
        const pct = Math.min(100, ((now - cur.start) / (cur.end - cur.start)) * 100);
        const left = Math.max(1, Math.round((cur.end - now) / 60000));
        html += `<div class="prog now"><span class="time">${hm(cur.start)}</span><div><div class="pt">${esc(cur.title)}</div>${cur.desc ? `<p>${esc(cur.desc)}</p>` : '<p></p>'}<div class="pbar"><i style="width:${pct}%"></i></div><div class="left-note">${left} min left · ends ${hm(cur.end)}</div></div></div>`;
      }
      html += next.map((p) => `<div class="prog"><span class="time">${hm(p.start)}</span><span class="pt">${esc(p.title)}</span></div>`).join('');
      box.innerHTML = html;
    };
    draw();
    epgTimer = setInterval(() => (S.live.current === ch ? draw() : clearInterval(epgTimer)), 30000);
  }

  let osdT;
  function showOsd() {
    const ch = S.live.current;
    if (!ch) return;
    $('#osdNum').textContent = ch.num;
    $('#osdName').textContent = ch.name;
    $('#osdProg').textContent = epgNow;
    $('#osd').classList.add('show');
    clearTimeout(osdT);
    osdT = setTimeout(() => $('#osd').classList.remove('show'), 3500);
  }

  // remote-style channel numbers
  let digitBuf = '', digitT;
  function digit(d) {
    digitBuf = (digitBuf + d).slice(-5);
    $('#digits').textContent = digitBuf;
    $('#digits').hidden = false;
    clearTimeout(digitT);
    digitT = setTimeout(() => {
      const n = parseInt(digitBuf, 10);
      digitBuf = '';
      $('#digits').hidden = true;
      const ch = catalog.live?.items.find((c) => c.num === n);
      ch ? tune(ch) : toast(`There is no channel ${n}.`);
    }, 1200);
  }

  function toggleFav(it) {
    if (!it) return;
    const k = keyOf(it);
    if (favs[k]) delete favs[k];
    else { const { _s, ...snap } = it; favs[k] = snap; }
    store.set(scoped('favs'), favs);
    toast(favs[k] ? `Added ${it.name} to favorites` : `Removed ${it.name} from favorites`);
    return !!favs[k];
  }
  function favCurrent() {
    const ch = S.live.current;
    if (!ch) return;
    toggleFav(ch);
    updateNow();
    renderCats('live');
    if (S.live.cat === 'fav') refreshLive(); else renderLiveList();
  }

  // Full-screen TV through mpv: the current list becomes mpv's playlist, so ↑/↓ and number keys zap channels.
  async function liveMpv() {
    const st = S.live;
    const list = st.list.length ? st.list : catalog.live?.items || [];
    if (!list.length) return;
    const index = Math.max(0, list.findIndex((c) => c.id === st.current?.id));
    // MPEG-TS is the one format every Xtream server offers, and mpv plays it best.
    const engine = 'mpegts';
    const entries = () => list.map((c) => ({ url: (c.sources.find((s) => s.engine === engine) || c.sources[0]).url, title: `${c.num} · ${c.name}`, num: c.num }));
    livePlayer.stop();
    let r;
    if (ANDROID) {
      // Big channel lists cross over to the TV player once; after that only the position does.
      const key = `${epoch}:${list.length}:${list[0].id}:${list[list.length - 1].id}:${st.cat}:${st.q}`;
      const opts = { mode: 'live', index, ua: settings().ua, key };
      r = key === sentList ? await native.mpv.play(opts).catch(() => null) : null;
      if (!r) r = await native.mpv.play({ ...opts, entries: entries() });
      if (r?.ok) sentList = key;
    } else r = await native.mpv.play({ mode: 'live', entries: entries(), index, ua: settings().ua });
    if (!r.ok) { toast(r.error, 4000); return tune(st.current || list[index]); }
    mpvCtx = { kind: 'live', items: list, session: r.session, index };
    showCover(`${list[index].num} · ${list[index].name}`);
  }

  function showCover(title) {
    $('#coverTitle').textContent = title;
    $('#cover').hidden = false;
    $('#coverClose').focus();
  }

  native?.mpv?.onEvent((e) => {
    const ctx = mpvCtx;
    if (!ctx || e.session !== ctx.session) return;
    if (e.type === 'game' && ctx.kind === 'live') {
      const ch = ctx.items[ctx.index];
      const g = (nba.link?.chId === ch?.id && gameById(nba.link.gameId)) || NBA.matchGame(ch?.name, nba.today);
      if (!g) { native.mpv.command(['show-text', 'No NBA game found for this channel', 4000]); return; }
      if (!ANDROID) { native.mpv.command(['show-text', scoreLine(delayed(g).g), 6000]); return; }
      // The TV player shows the score and box score at the side, and keeps it up to date while it's open.
      nba.panel = g.id;
      nba.panelJson = '';
      pushPanel();
      sumTick();
      return;
    }
    if (e.type === 'stats-closed') { nba.panel = null; return; }
    if (e.type === 'sync-start') { startSync(e.seenAt); return; }
    if (e.type === 'sync') { finishSync(e.at, e.seenAt); return; }
    if (e.type === 'track') {
      ctx.index = e.index;
      const it = ctx.items[e.index];
      if (ctx.kind === 'live' && it) {
        autoLink(it, it.name);
        if (ANDROID) {
          const g = linkedGameFor(it);
          native.mpv.command(['linked', !!g]);
          if (nba.panel) { if (g) { nba.panel = g.id; pushPanel(); } else { nba.panel = null; native.mpv.command(['stats', '']); } }
        }
      }
      if (it) $('#coverTitle').textContent = it.kind === 'live' ? `${it.num} · ${it.name}` : it.kind === 'episode' ? `${it.seriesName} · S${it.season} E${it.ep}` : it.name;
    } else if (e.type === 'progress' && ctx.kind === 'vod') {
      recordProgress(ctx.items[e.index], e.t, e.d, !!e.final);
    } else if (e.type === 'exit') {
      mpvCtx = null;
      nba.panel = null;
      $('#cover').hidden = true;
      // Catch up on what changed while the player was up.
      if (ANDROID) { onNba(); sumTick(); }
      if (ctx.kind === 'vod') {
        recordProgress(ctx.items[e.index], e.t, e.d, true);
        if (e.error) toast(`This video would not play. ${e.error}`, 6000);
        if (!$('#detail').hidden && detailItem) { drawDetail(); focusPrimary(); }
        if (view === 'live' && S.live.current) tune(S.live.current, { noFull: true });
      } else {
        const ch = ctx.items[e.index ?? ctx.index];
        if (e.error) toast(`That channel would not play. ${e.error}`, 6000);
        if (view === 'live' && ch) tune(ch, { noFull: true });
        if (TV) setTimeout(() => $('#liveInner .ch.on')?.focus({ preventScroll: true }), 120);
      }
    }
  });
  $('#coverClose').onclick = () => native?.mpv?.stop();

  // full window
  function toggleFull(force) {
    if (force !== false && !stage.classList.contains('full') && useMpv()) { liveMpv(); return; }
    if (IOS && force !== false && liveVideo.webkitEnterFullscreen) { try { liveVideo.webkitEnterFullscreen(); } catch {} return; }
    const on = force ?? !stage.classList.contains('full');
    stage.classList.toggle('full', on);
    if (on) { stage.focus(); document.documentElement.requestFullscreen?.().catch(() => {}); }
    else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    pokeUi();
  }
  function exitFull() { if (stage.classList.contains('full')) toggleFull(false); }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && stage.classList.contains('full')) { stage.classList.remove('full'); } });

  let idleT;
  function pokeUi() {
    stage.classList.add('ui');
    stage.classList.remove('idle');
    clearTimeout(idleT);
    idleT = setTimeout(() => { stage.classList.remove('ui'); if (stage.classList.contains('full')) stage.classList.add('idle'); }, 2600);
  }
  stage.addEventListener('mousemove', pokeUi);
  stage.addEventListener('dblclick', (e) => { if (!e.target.closest('.sc, .stage-msg')) toggleFull(); });
  liveVideo.addEventListener('click', () => { stage.focus(); pokeUi(); });

  $('#lPrev').onclick = () => zap(-1);
  $('#lNext').onclick = () => zap(1);
  $('#lPlay').onclick = () => (liveVideo.paused ? liveVideo.play().catch(() => {}) : liveVideo.pause());
  $('#lMute').onclick = () => (liveVideo.muted = !liveVideo.muted);
  $('#lVol').oninput = (e) => { liveVideo.volume = +e.target.value; liveVideo.muted = false; };
  $('#lPip').onclick = () => {
    if (liveVideo.webkitSetPresentationMode && !liveVideo.requestPictureInPicture) {
      liveVideo.webkitSetPresentationMode(liveVideo.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture');
      return;
    }
    (document.pictureInPictureElement ? document.exitPictureInPicture() : liveVideo.requestPictureInPicture()).catch(() => {});
  };
  $('#lFull').onclick = () => toggleFull();
  $('#nowFav').onclick = favCurrent;
  liveVideo.addEventListener('play', setPlayIcon);
  liveVideo.addEventListener('pause', setPlayIcon);

  function liveKeys(e, k) {
    const st = S.live;
    const full = stage.classList.contains('full');
    const a = document.activeElement;
    const onStage = full || a === stage || a === document.body || a === liveVideo;
    if (/^[0-9]$/.test(e.key)) { digit(e.key); return true; }
    if (k === 'chup') { zap(1); return true; }
    if (k === 'chdown') { zap(-1); return true; }
    if (onStage && !TV) {
      if (k === 'up') { zap(-1); return true; }
      if (k === 'down') { zap(1); return true; }
      if (full && (k === 'left' || k === 'right')) { liveVideo.muted = false; liveVideo.volume = Math.min(1, Math.max(0, liveVideo.volume + (k === 'right' ? 0.05 : -0.05))); toast(`Volume ${Math.round(liveVideo.volume * 100)}%`, 900); return true; }
      if (k === 'ok' && !a.closest?.('.sc')) { toggleFull(); return true; }
      if (k === 'back' && full) { toggleFull(false); return true; }
    }
    if (k === 'playpause' || (e.key === ' ' && a?.tagName !== 'BUTTON')) { $('#lPlay').click(); return true; }
    const map = { f: () => toggleFull(), m: () => $('#lMute').click(), p: () => $('#lPip').click(), s: favCurrent, i: showOsd, l: () => st.last && tune(st.last) };
    const fn = !e.shiftKey && map[e.key.toLowerCase()];
    if (fn) { fn(); return true; }
    return false;
  }

  // ======================================================================
  // Movies & series
  // ======================================================================
  const PAGE = 90;
  async function enterLib(kind) {
    takeFresh(kind);
    const grid = $(`#${kind}Grid`);
    if (!catalog[kind]) {
      $(`#${kind}Cats`).innerHTML = '';
      $(`#${kind}Title`).textContent = 'Loading…';
      $(`#${kind}Count`).textContent = '';
      grid.innerHTML = '<div class="skel"></div>'.repeat(18);
      try { await ensure(kind); } catch (e) {
        if (e.message === 'stale') return;
        grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Could not load ${kind === 'movie' ? 'movies' : 'series'}</h3><p>${esc(e.message)}</p><button class="btn primary" id="${kind}Retry">Try again</button></div>`;
        $(`#${kind}Retry`).onclick = () => { view = null; go(kind); };
        return;
      }
      if (view !== kind) return;
    }
    renderCats(kind);
    refreshLib(kind);
  }

  const sorters = {
    popular: (a, b) => (b._pop || 0) - (a._pop || 0),
    added: (a, b) => b.added - a.added,
    az: (a, b) => a.name.localeCompare(b.name),
    rating: (a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0),
    year: (a, b) => (+b.year || 0) - (+a.year || 0),
  };

  function refreshLib(kind) {
    const st = S[kind];
    let list = filtered(kind);
    const own = ['fav', 'continue', 'recent'].includes(st.cat); // your own lists keep their order
    if (!sorters[st.sort]) st.sort = 'popular';
    if (!own) {
      list = [...facetFilter(kind, list)].sort(sorters[st.sort]);
      if (langMode(kind) === 'first') list = englishFirst(list);
    }
    renderFilters(kind);
    st.list = list;
    st.shown = 0;
    $(`#${kind}Title`).textContent = catTitle(kind);
    $(`#${kind}Count`).textContent = list.length.toLocaleString();
    const grid = $(`#${kind}Grid`);
    $(`#${kind}Scroll`).scrollTop = 0;
    if (!list.length) {
      const filtering = filtersActive(kind) && !own;
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${st.cat === 'fav' && !st.q ? `<h3>Nothing saved yet</h3><p>Open any title and choose Add to favorites.</p>` : filtering ? `<p>Nothing matches these filters.</p><button class="btn" data-clear-filters>Clear filters</button>` : 'Nothing matches.'}</div>`;
      grid.querySelector('[data-clear-filters]')?.addEventListener('click', () => { setChoice(kind, 'clear'); $(`#${kind}Filters .chip`)?.focus(); });
      return;
    }
    grid.innerHTML = '';
    moreLib(kind);
  }

  function moreLib(kind) {
    const st = S[kind];
    if (st.shown >= st.list.length) return;
    const end = Math.min(st.list.length, st.shown + PAGE);
    let html = '';
    for (let i = st.shown; i < end; i++) html += posterCard(st.list[i], i);
    $(`#${kind}Grid`).insertAdjacentHTML('beforeend', html);
    st.shown = end;
  }

  function progressPct(it) {
    const p = progress[keyOf(it)];
    return p && p.d ? Math.min(100, (p.t / p.d) * 100) : 0;
  }

  function posterCard(it, i) {
    const pct = it.kind === 'movie' ? progressPct(it) : 0;
    const meta = [it.year, it.rating ? '★ ' + it.rating : ''].filter(Boolean).join('  ·  ');
    return `<button class="poster" data-i="${i}">
      <span class="art${it.poster ? '' : ' noimg'}" data-ini="${esc(initials(it.name))}" style="--h:${hue(it.name)}">${it.poster ? `<img loading="lazy" decoding="async" src="${esc(it.poster)}" alt="">` : ''}${favs[keyOf(it)] ? '<span class="pfav">★</span>' : ''}${pct > 1 && pct < 95 ? `<span class="pprog"><i style="width:${pct}%"></i></span>` : ''}</span>
      <span class="ptitle">${esc(it.name)}</span>${meta ? `<span class="psub">${esc(meta)}</span>` : ''}</button>`;
  }

  for (const kind of ['movie', 'series']) {
    wireCats(kind, () => refreshLib(kind));
    $(`#${kind}Filters`).addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const key = chip.dataset.chip;
      const refocus = () => $(`#${kind}Filters [data-chip="${key === 'clear' ? 'sort' : key}"]`)?.focus({ preventScroll: true });
      if (key === 'clear') { setChoice(kind, 'clear'); refocus(); return; }
      const c = libChoices(kind).find((x) => x.key === key);
      openSheet(c.label, c.options, choiceValue(kind, key), (v) => setChoice(kind, key, v), refocus);
    });
    const sc = $(`#${kind}Scroll`);
    sc.addEventListener('scroll', () => { if (sc.scrollTop + sc.clientHeight > sc.scrollHeight - 900) moreLib(kind); }, { passive: true });
    $(`#${kind}Grid`).addEventListener('click', (e) => { const b = e.target.closest('.poster'); if (b) openDetail(S[kind].list[+b.dataset.i]); });
  }

  // ---------- detail sheet ----------
  let detailItem = null, detailInfo = null, detailSeason = null, detailReturn = null;

  async function openDetail(it) {
    if (!it) return;
    detailReturn = document.activeElement;
    detailItem = it;
    detailInfo = null;
    detailSeason = null;
    $('#detail').hidden = false;
    drawDetail();
    $('#sheet').scrollTop = 0;
    focusPrimary();
    try {
      const d = it.kind === 'movie' ? await src.movieInfo(it) : await src.seriesInfo(it);
      if (detailItem !== it) return;
      detailInfo = d;
    } catch (e) {
      if (detailItem !== it) return;
      detailInfo = { error: e.message, seasons: [] };
    }
    const hadFocus = $('#sheet').contains(document.activeElement);
    drawDetail();
    if (hadFocus || !$('#sheet').contains(document.activeElement)) focusPrimary();
  }
  const focusPrimary = () => ($('#sheet [data-act="play"]') || $('#sheet .close'))?.focus();

  function closeDetail() {
    $('#detail').hidden = true;
    detailItem = null;
    if (view === 'movie' || view === 'series') { renderCats(view); }
    detailReturn?.isConnected && detailReturn.focus();
  }

  function seriesResume() {
    const eps = (detailInfo?.seasons || []).flatMap((s) => s.eps);
    if (!eps.length) return null;
    let latest = null;
    for (const e of eps) { const p = progress[keyOf(e)]; if (p && (!latest || p.at > latest.p.at)) latest = { e, p }; }
    if (!latest) return { ep: eps[0], label: `Play S${eps[0].season} E${eps[0].ep}` };
    const done = latest.p.t >= latest.p.d * 0.94;
    if (!done) return { ep: latest.e, label: latest.p.t > 30 ? `Resume S${latest.e.season} E${latest.e.ep} · ${fmtTime(latest.p.t)}` : `Play S${latest.e.season} E${latest.e.ep}` };
    const next = eps[eps.indexOf(latest.e) + 1];
    return next ? { ep: next, label: `Play next · S${next.season} E${next.ep}` } : { ep: eps[0], label: 'Watch again from S1 E1' };
  }

  function drawDetail() {
    const it = detailItem, d = detailInfo || {};
    const isMovie = it.kind === 'movie';
    const fav = !!favs[keyOf(it)];
    const p = isMovie ? progress[keyOf(it)] : null;
    const canResume = p && p.t > 30 && p.t < p.d * 0.94;
    const facts = [d.year || it.year, d.duration, (d.rating || it.rating) ? `<span class="star">★</span> ${esc(d.rating || it.rating)}` : '', !isMovie && d.seasons?.length ? `${d.seasons.length} season${d.seasons.length > 1 ? 's' : ''}` : '']
      .filter(Boolean).map((x) => `<span>${String(x).startsWith('<') ? x : esc(x)}</span>`).join('');
    let actions = '';
    if (isMovie) {
      actions += `<button class="btn primary lg" data-act="play">▶ ${canResume ? `Resume from ${fmtTime(p.t)}` : 'Play'}</button>`;
      if (canResume) actions += '<button class="btn lg" data-act="restart">Start over</button>';
    } else if (detailInfo) {
      const r = seriesResume();
      if (r) actions += `<button class="btn primary lg" data-act="play">▶ ${esc(r.label)}</button>`;
    }
    actions += `<button class="btn lg ${fav ? 'on' : ''}" data-act="fav">${fav ? '★ In favorites' : '☆ Add to favorites'}</button>`;

    const credits = [['Genre', d.genre], ['Cast', d.cast], ['Director', d.director]].filter(([, v]) => v);
    let seasons = '';
    if (!isMovie) {
      if (!detailInfo) seasons = '<div class="loading-note"><div class="spinner"></div>Loading episodes…</div>';
      else if (!d.seasons?.length) seasons = `<div class="empty">${esc(d.error || 'No episodes are listed for this series.')}</div>`;
      else {
        const resumeEp = seriesResume()?.ep;
        if (!detailSeason || !d.seasons.some((s) => s.n === detailSeason)) detailSeason = resumeEp?.season || d.seasons[0].n;
        const season = d.seasons.find((s) => s.n === detailSeason);
        seasons = `<div class="seasons">
          <div class="season-tabs">${d.seasons.map((s) => `<button data-season="${esc(s.n)}" class="${s.n === detailSeason ? 'on' : ''}">Season ${esc(s.n)}</button>`).join('')}</div>
          <div class="episodes">${season.eps.map((e, i) => {
            const pct = progressPct(e);
            return `<button class="ep${resumeEp === e ? ' current' : ''}" data-ep="${i}">
              <span class="ep-still${e.still ? '' : ' noimg'}" data-ini="E${e.ep}">${e.still ? `<img loading="lazy" decoding="async" src="${esc(e.still)}" alt="">` : ''}${pct > 1 ? `<span class="pprog"><i style="width:${pct}%"></i></span>` : ''}</span>
              <span><span class="ep-title"><span class="n">E${e.ep}</span>${esc(e.name)}</span>${e.duration ? `<span class="ep-meta">${esc(e.duration)}</span>` : ''}${e.plot ? `<span class="ep-plot">${esc(e.plot)}</span>` : ''}</span>
            </button>`;
          }).join('')}</div></div>`;
      }
    }

    const backdrop = d.backdrop || it.poster;
    $('#sheet').innerHTML = `
      <div class="hero">
        ${backdrop ? `<img class="bd" src="${esc(backdrop)}" alt="">` : ''}
        <button class="ib lg close" data-act="close" title="Close (Esc)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        <div class="hero-body">
          <span class="art cover${it.poster ? '' : ' noimg'}" data-ini="${esc(initials(it.name))}" style="--h:${hue(it.name)}">${it.poster ? `<img src="${esc(it.poster)}" alt="">` : ''}</span>
          <div class="hero-text">
            <div class="eyebrow">${isMovie ? 'Movie' : 'Series'}${catalog[it.kind]?.catName.get(it.cat) ? ' · ' + esc(catalog[it.kind].catName.get(it.cat)) : ''}</div>
            <h2>${esc(it.name)}</h2>
            <div class="facts">${facts}</div>
            ${d.plot ? `<p class="plot">${esc(d.plot)}</p>` : !detailInfo ? '<p class="plot" style="color:var(--dim)">Loading details…</p>' : '<p class="plot"></p>'}
            <div class="actions">${actions}</div>
          </div>
        </div>
      </div>
      ${credits.length ? `<dl class="credits">${credits.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
      ${seasons}`;
  }

  $('#sheet').addEventListener('click', (e) => {
    const t = e.target.closest('[data-act], [data-season], [data-ep]');
    if (!t) return;
    const it = detailItem;
    if (t.dataset.act === 'close') return closeDetail();
    if (t.dataset.act === 'fav') { toggleFav(it); drawDetail(); $('#sheet [data-act="fav"]').focus(); return; }
    if (t.dataset.act === 'play' || t.dataset.act === 'restart') {
      if (it.kind === 'movie') return playVod(it, { restart: t.dataset.act === 'restart' });
      const r = seriesResume();
      const eps = detailInfo.seasons.flatMap((s) => s.eps);
      return playVod(r.ep, { queue: eps });
    }
    if (t.dataset.season) { detailSeason = t.dataset.season; drawDetail(); $(`#sheet [data-season="${CSS.escape(detailSeason)}"]`)?.focus(); return; }
    if (t.dataset.ep) {
      const season = detailInfo.seasons.find((s) => s.n === detailSeason);
      playVod(season.eps[+t.dataset.ep], { queue: detailInfo.seasons.flatMap((s) => s.eps) });
    }
  });
  $('#detail').addEventListener('click', (e) => { if (e.target.id === 'detail') closeDetail(); });

  // ======================================================================
  // Movie / episode player
  // ======================================================================
  const vodVideo = $('#vodVideo');
  const vp = $('#vplayer');
  const vod = { item: null, queue: null, lastSave: 0, audioChecked: false };
  const vodPlayer = new Player(vodVideo, (s) => {
    $('#vodSpin').hidden = s !== 'loading';
    if (s === 'playing') { $('#vodMsg').hidden = true; checkAudio(); }
    if (s === 'error' && vod.item) {
      $('#vodMsgText').textContent = native
        ? 'The built-in player cannot open this file. It often uses a format like HEVC video or AC3/DTS audio. VLC can play it.'
        : IOS ? 'iPhone can’t open this file. It’s probably an MKV. The free VLC app from the App Store can play it.'
        : 'The built-in player cannot open this file. It may use a format like HEVC video or AC3/DTS audio.';
      const row = $('#vodMsgActions');
      row.innerHTML = '';
      const add = (label, fn, primary) => { const b = document.createElement('button'); b.className = 'btn' + (primary ? ' primary' : ''); b.textContent = label; b.onclick = fn; row.appendChild(b); };
      if (native) add('Open in VLC', openExternal, true);
      if (IOS) add('Open in VLC', () => { location.href = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(vod.item.url)}`; }, true);
      add('Try again', () => vodPlayer.retry(), !native);
      add('Copy link', copyLink);
      $('#vodMsg').hidden = false;
      row.firstChild.focus();
    }
  });
  vodVideo.volume = store.get('volume', 1);

  function playVod(item, opts = {}) {
    if (useMpv()) playVodMpv(item, opts);
    else playVodBuiltin(item, opts);
  }

  async function playVodMpv(item, { queue, restart } = {}) {
    const list = queue ? queue.slice(Math.max(0, queue.findIndex((e) => e.id === item.id))) : [item];
    const entries = list.map((it, i) => {
      const p = progress[keyOf(it)];
      const resume = i === 0 && restart ? 0 : p && p.t > 30 && p.t < p.d * 0.94 ? p.t : 0;
      const title = it.kind === 'episode' ? `${it.seriesName} · S${it.season} E${it.ep} · ${it.name}` : it.name;
      return { url: it.url, title, startAt: resume };
    });
    livePlayer.stop();
    const r = await native.mpv.play({ mode: 'vod', entries, index: 0, ua: settings().ua });
    if (!r.ok) { toast(`${r.error} Using the built-in player instead.`, 4000); return playVodBuiltin(item, { queue, restart }); }
    mpvCtx = { kind: 'vod', items: list, session: r.session };
    showCover(entries[0].title);
  }

  function playVodBuiltin(item, { queue, restart } = {}) {
    vod.item = item;
    vod.queue = queue || null;
    vod.audioChecked = false;
    const p = progress[keyOf(item)];
    const startAt = !restart && p && p.t > 30 && p.t < p.d * 0.94 ? p.t : 0;
    livePlayer.stop();
    vp.hidden = false;
    $('#vodMsg').hidden = true;
    $('#vpTitle').textContent = item.kind === 'episode' ? item.seriesName : item.name;
    $('#vpSub').textContent = item.kind === 'episode' ? `S${item.season} E${item.ep} · ${item.name}` : [item.year, item.rating && '★ ' + item.rating].filter(Boolean).join(' · ');
    $('#vpNext').hidden = !nextEpisode();
    $('#vpExt').hidden = !native;
    const ext = item.url.toLowerCase().split('?')[0];
    const sources = ext.endsWith('.m3u8') ? [{ url: item.url, engine: 'hls' }] : [{ url: item.url, engine: 'native' }];
    vodPlayer.load(sources, { startAt, timeout: 45000 });
    if (startAt) toast(`Resuming from ${fmtTime(startAt)}`, 2000);
    vodVideo.focus();
    pokeVod();
  }

  function nextEpisode() {
    if (!vod.queue || vod.item?.kind !== 'episode') return null;
    const i = vod.queue.findIndex((e) => e.id === vod.item.id);
    return i >= 0 ? vod.queue[i + 1] || null : null;
  }

  function recordProgress(it, t, d, force) {
    if (!it || !d || !isFinite(d) || t == null) return;
    const now = Date.now();
    const { _s, ...snap } = it;
    progress[keyOf(it)] = { t, d, at: now, item: snap };
    if (!force && now - vod.lastSave < 5000) return;
    vod.lastSave = now;
    const keys = Object.keys(progress);
    if (keys.length > 400) keys.sort((a, b) => progress[a].at - progress[b].at).slice(0, keys.length - 400).forEach((k) => delete progress[k]);
    store.set(scoped('progress'), progress);
  }
  const saveProgress = (force) => recordProgress(vod.item, vodVideo.currentTime, vodVideo.duration, force);
  vodVideo.addEventListener('timeupdate', () => saveProgress(false));
  vodVideo.addEventListener('pause', () => saveProgress(true));
  vodVideo.addEventListener('ended', () => {
    saveProgress(true);
    const n = nextEpisode();
    if (n) { toast(`Up next: S${n.season} E${n.ep} · ${n.name}`); playVod(n, { queue: vod.queue }); }
  });
  vodVideo.addEventListener('volumechange', () => store.set('volume', vodVideo.volume));

  // Chromium plays the picture but drops audio it can't decode (AC3, DTS). Detect that and say so.
  function checkAudio() {
    if (vod.audioChecked) return;
    vod.audioChecked = true;
    const it = vod.item;
    setTimeout(() => {
      if (vod.item !== it || vodVideo.paused || vodVideo.muted) return;
      if ('webkitAudioDecodedByteCount' in vodVideo && vodVideo.webkitAudioDecodedByteCount === 0) {
        toast(native ? 'No sound? This file’s audio format isn’t supported here. Use Open in VLC at the top.' : 'No sound? This file’s audio format isn’t supported in this player.', 7000);
      }
    }, 5000);
  }

  function closeVod() {
    saveProgress(true);
    vodPlayer.stop();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    vp.hidden = true;
    vod.item = null;
    if (!$('#detail').hidden && detailItem) { drawDetail(); focusPrimary(); }
    if (view === 'live' && S.live.current) tune(S.live.current, { noFull: true });
  }

  async function openExternal() {
    if (!vod.item || !native) return;
    vodVideo.pause();
    const ok = await native.openExternalPlayer(vod.item.url);
    toast(ok ? 'Opening in VLC…' : 'VLC was not found. Install it from videolan.org, or use Copy link and open it in any player.', 5000);
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(vod.item.url); toast('Stream link copied'); } catch { toast('Could not copy the link.'); }
  }

  $('#vpBack').onclick = closeVod;
  $('#vpNext').onclick = () => { const n = nextEpisode(); if (n) { saveProgress(true); playVod(n, { queue: vod.queue }); } };
  $('#vpExt').onclick = openExternal;
  let vpIdle;
  function pokeVod() {
    vp.classList.remove('idle');
    clearTimeout(vpIdle);
    vpIdle = setTimeout(() => { if (!vodVideo.paused) vp.classList.add('idle'); }, 2800);
  }
  vp.addEventListener('mousemove', pokeVod);
  vodVideo.addEventListener('pause', pokeVod);

  function vodKeys(e, k) {
    const a = document.activeElement;
    if (a?.tagName === 'BUTTON' && (k === 'ok' || e.key === ' ')) return; // let buttons click
    pokeVod();
    const seek = (s) => { if (isFinite(vodVideo.duration)) { vodVideo.currentTime = Math.max(0, Math.min(vodVideo.duration - 1, vodVideo.currentTime + s)); toast(`${fmtTime(vodVideo.currentTime)} / ${fmtTime(vodVideo.duration)}`, 900); } };
    const vol = (d) => { vodVideo.muted = false; vodVideo.volume = Math.min(1, Math.max(0, vodVideo.volume + d)); toast(`Volume ${Math.round(vodVideo.volume * 100)}%`, 900); };
    const acts = {
      back: closeVod, left: () => seek(-10), right: () => seek(10), up: () => vol(0.05), down: () => vol(-0.05),
      ok: () => (vodVideo.paused ? vodVideo.play() : vodVideo.pause()), playpause: () => (vodVideo.paused ? vodVideo.play() : vodVideo.pause()),
      play: () => vodVideo.play(), pause: () => vodVideo.pause(), chup: () => $('#vpNext').click(),
    };
    let fn = acts[k];
    if (!fn) {
      const key = e.key.toLowerCase();
      if (e.key === ' ') fn = acts.ok;
      else if (key === 'f') fn = () => (document.fullscreenElement ? document.exitFullscreen() : vp.requestFullscreen()).catch(() => {});
      else if (key === 'm') fn = () => (vodVideo.muted = !vodVideo.muted);
      else if (key === 'n') fn = () => $('#vpNext').click();
      else if (key === 'j') fn = () => seek(-30);
      else if (key === 'l') fn = () => seek(30);
    }
    if (fn) { e.preventDefault(); e.stopPropagation(); fn(); }
  }

  // ======================================================================
  // Saved (favorites + continue watching)
  // ======================================================================
  function renderFavs() {
    const page = $('#favsPage');
    const ch = favList('live'), mv = favList('movie'), se = favList('series');
    const cont = Object.values(progress).filter((p) => p.t > 30 && p.t < p.d * 0.94).sort((a, b) => b.at - a.at).slice(0, 18);
    const tiles = (items) => `<div class="grid">${items.map((it, i) => posterCard(it, i)).join('')}</div>`;
    let html = '<header><h2 class="page-title">Saved</h2><p class="page-sub">Your favorites and everything you are part-way through.</p></header>';
    if (cont.length) {
      html += `<section class="block" data-block="cont"><h3>Continue watching</h3><div class="grid">${cont.map((p, i) => {
        const it = p.item;
        const card = it.kind === 'episode'
          ? { kind: 'episode', id: it.id, name: `${it.seriesName}`, poster: it.poster, year: `S${it.season} E${it.ep}`, rating: '' }
          : it;
        return posterCard(card, i).replace('class="poster"', 'class="poster" data-cont="1"');
      }).join('')}</div></section>`;
    }
    if (ch.length) html += `<section class="block" data-block="live"><h3>Channels</h3><div class="chan-grid">${ch.map((c, i) => `<button class="chan-tile" data-i="${i}">${logo(c.logo, c.name)}<span>${esc(c.name)}</span></button>`).join('')}</div></section>`;
    if (mv.length) html += `<section class="block" data-block="movie"><h3>Movies</h3>${tiles(mv)}</section>`;
    if (se.length) html += `<section class="block" data-block="series"><h3>Series</h3>${tiles(se)}</section>`;
    if (!cont.length && !ch.length && !mv.length && !se.length) html += '<div class="empty"><h3>Nothing saved yet</h3><p>Star channels, movies and series to keep them here. Anything you start watching shows up here too.</p></div>';
    page.innerHTML = html;
    // The progress map stores what Continue watching needs, independent of the catalogs.
    page.onclick = async (e) => {
      const b = e.target.closest('.poster, .chan-tile');
      if (!b) return;
      const block = b.closest('.block').dataset.block, i = +b.dataset.i;
      if (block === 'cont') {
        const it = cont[i].item;
        if (it.kind === 'movie') return openDetail(it);
        const series = (await ensure('series').catch(() => null))?.byId.get(it.seriesId) || { kind: 'series', id: it.seriesId, name: it.seriesName, poster: it.poster, cat: '' };
        return openDetail(series);
      }
      if (block === 'live') { go('live'); const wait = await ensure('live').catch(() => null); const c = wait?.byId.get(ch[i].id) || ch[i]; tune(c); return; }
      openDetail(block === 'movie' ? mv[i] : se[i]);
    };
  }

  // ======================================================================
  // Account & settings
  // ======================================================================
  function renderSettings() {
    if (TV) return renderSettingsTv();
    const s = settings();
    const u = info?.user_info || {};
    const exp = u.exp_date ? new Date(+u.exp_date * 1000) : null;
    const daysLeft = exp ? Math.ceil((exp - Date.now()) / 86400000) : null;
    const rows = acc.type === 'xtream'
      ? [
          ['Status', `<span class="pill ${/active/i.test(u.status) ? 'ok' : 'live'}">${esc(String(u.status || 'Unknown').toUpperCase())}</span>`],
          ['Expires', exp ? `${exp.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}${daysLeft != null ? ` · ${daysLeft} days` : ''}` : 'Never'],
          ['Connections', `${esc(u.active_cons ?? '?')} of ${esc(u.max_connections ?? '?')} in use`],
          ['Trial', String(u.is_trial) === '1' ? 'Yes' : 'No'],
          ['Username', esc(acc.username)],
          ['Server', esc(host(acc.server))],
        ]
      : [['Source', esc(acc.url ? host(acc.url) : 'File on this computer')], ['Channels', (catalog.live?.items.length ?? '…').toLocaleString()]];

    setTimeout(() => lockFields($('#settingsPage')), 0);
    $('#settingsPage').innerHTML = `
      <header><h2 class="page-title">Account</h2><p class="page-sub">Signed in as <b>${esc(acc.name)}</b>.</p></header>
      <div class="cards">
        <div class="card">
          <h4>${esc(acc.name)}</h4>
          <dl class="kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
          <div class="row"><button class="btn" id="setReload">Reload channels &amp; library</button><button class="btn ghost danger" id="setOut">Sign out</button></div>
        </div>
        <div class="card">
          <h4>Accounts</h4>
          <div class="accounts">${accounts.map((a, i) => `
            <div class="acct"><span class="av" style="color:hsl(${hue(a.name)} 70% 70%)">${esc(initials(a.name))}</span>
              <span class="who"><b>${esc(a.name)}</b><small>${esc(a.type === 'xtream' ? `${a.username} · ${host(a.server)}` : a.url ? host(a.url) : 'Local file')}</small></span>
              ${a.id === acc.id ? '<span class="pill ok">IN USE</span>' : `<button class="btn" data-switch="${i}">Switch</button>`}
              <button class="ib" data-remove="${i}" title="Remove account"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            </div>`).join('')}</div>
          <div class="row"><button class="btn" id="setAdd">Add an account</button></div>
        </div>
        <div class="card">
          <h4>Playback</h4>
          <div class="field desktop-only">
            <label for="setPlayer">Movies, series and full-screen TV</label>
            <select id="setPlayer" ${mpvOk ? '' : 'disabled'}><option value="mpv">Full player (mpv) · plays every format</option><option value="builtin">Built-in player</option></select>
            <span class="hint">${mpvOk ? 'The full player handles HEVC, Dolby/DTS audio, MKV files, subtitles and extra audio tracks.' : native?.platform === 'win32' ? 'mpv was not found. Reinstall Tuner, or run <code>npm run get-mpv</code>, to get the full player.' : 'Install mpv to get the full player.'}</span>
          </div>
          <div class="field">
            <label for="setFormat">Live stream format</label>
            <select id="setFormat"><option value="hls">HLS first (smoother switching)</option><option value="ts">MPEG-TS first (some providers only offer this)</option></select>
            <span class="hint">If a channel won’t play, the other format is tried automatically.</span>
          </div>
          <div class="field desktop-only ua-field">
            <label for="setUa">User agent</label>
            <div class="row" style="flex-wrap:nowrap"><input id="setUa" type="text" placeholder="Default" value="${esc(s.ua)}" spellcheck="false"><button class="btn" id="setUaSave">Save</button></div>
            <span class="hint">Some providers only accept certain apps. Try <code>VLC/3.0.20 LibVLC/3.0.20</code> if streams refuse to start.</span>
          </div>
          <div class="field"${TV ? ' hidden' : ''}>
            <label for="setScale">Interface size</label>
            <select id="setScale"><option value="compact">Compact</option><option value="standard">Standard</option><option value="large">Large</option><option value="tv">TV (across the room)</option></select>
          </div>

        </div>
        <div class="card">
          <h4>NBA</h4>
          <div class="field">
            <label for="setTeam">Your team</label>
            <select id="setTeam">${[...NBA.TEAMS].sort((a, b) => a.city.localeCompare(b.city)).map((t) => `<option value="${t.abbr}">${esc(t.city === 'LA' || t.city === 'Los Angeles' ? 'Los Angeles' : t.city)} ${esc(t.name)}</option>`).join('')}</select>
            <span class="hint">Their games stay pinned at the top, and Tuner tells you when they tip off. Scores come from ESPN.</span>
          </div>
          <div class="field">
            <label for="setBug">Score on the picture</label>
            <select id="setBug"><option value="off">Off · score only when I ask (OK, or G on the PC)</option><option value="on">Show a score bug while I watch</option></select>
          </div>
          <div class="field">
            <label for="setDelay">Score delay on live TV</label>
            <select id="setDelay">${(() => {
              const opts = [[0, 'Off (real time)'], [15, '15 seconds'], [30, '30 seconds'], [45, '45 seconds'], [60, '1 minute'], [90, '1.5 minutes'], [120, '2 minutes']];
              const cur = +s.scoreDelay || 0;
              if (!opts.some(([v]) => v === cur)) opts.push([cur, `${cur} seconds (synced)`]);
              return opts.sort((a, b) => a[0] - b[0]).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
            })()}</select>
            <span class="hint">IPTV streams usually run 20–60 seconds behind the real game. Hold the score bug back so it doesn’t spoil a play before you see it. ${TV ? 'Easiest: while watching a game, press ←/→ right as you see a basket and choose <b>Sync the score to this stream</b>.' : 'Tip: when a basket happens on your stream, see how long the score bug took to show it.'}</span>
          </div>
        </div>
        <div class="card">
          <h4>Tuner ${esc(appVersion)}${TV ? ' · TV' : ''}</h4>
          <p class="hint" id="updateLine" style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap">${updateLine()}</p>
          ${IOS ? '' : `<div class="row"><button class="btn" data-update="check" ${native ? '' : 'disabled'}>Check for updates</button></div>`}
        </div>
        <div class="card desktop-only">
          <h4>Keyboard</h4>
          <div class="keys">
            <kbd>↑ ↓</kbd><span>Change channel (or move through lists)</span>
            <kbd>0–9</kbd><span>Type a channel number</span>
            <kbd>L</kbd><span>Back to the last channel</span>
            <kbd>Enter</kbd><span>Full screen on the live picture</span>
            <kbd>F</kbd><span>Full screen</span>
            <kbd>S</kbd><span>Favorite the current channel</span>
            <kbd>M</kbd><span>Mute</span>
            <kbd>← →</kbd><span>Seek 10s in movies, volume in full-screen live</span>
            <kbd>N</kbd><span>Next episode</span>
            <kbd>J</kbd><span>Switch subtitles (full player)</span>
            <kbd>#</kbd><span>Switch audio track (full player)</span>
            <kbd>/</kbd><span>Search</span>
            <kbd>Esc</kbd><span>Back</span>
          </div>
        </div>
      </div>`;
    $('#setPlayer').value = mpvOk ? s.player || 'mpv' : 'builtin';
    $('#setPlayer').onchange = (e) => { saveSettings({ player: e.target.value }); toast('Saved'); };
    $('#setBug').value = scoreBugOn() ? 'on' : 'off';
    $('#setBug').onchange = (e) => { saveSettings({ scoreBug: e.target.value === 'on' }); drawLiveGame(); toast('Saved'); };
    $('#setDelay').value = String(+s.scoreDelay || 0);
    $('#setDelay').onchange = (e) => { saveSettings({ scoreDelay: +e.target.value }); toast(+e.target.value ? `Scores on live TV now run ${e.target.value} seconds behind` : 'Scores on live TV are real time'); };
    $('#setTeam').value = favTeam();
    $('#setTeam').onchange = (e) => { saveSettings({ nbaTeam: e.target.value }); nba.today = sortGames(nba.today); onNba(); toast('Saved'); };
    $('#setFormat').value = s.liveFormat;
    $('#setScale').value = s.scale;
    $('#setOut').onclick = signOut;
    $('#setAdd').onclick = () => showLogin();
    $('#setReload').onclick = () => {
      for (const k in catalog) { catalog[k] = null; delete fresh[k]; }
      Core.cache.clear();
      toast('Channels and library will reload');
      go(TV ? 'home' : 'live');
    };
    $('#setFormat').onchange = (e) => { saveSettings({ liveFormat: e.target.value }); catalog.live = null; toast('Saved. Channels will reload with the new format.'); };
    $('#setScale').onchange = (e) => { saveSettings({ scale: e.target.value }); applyScale(); };
    $('#setUaSave').onclick = () => { const ua = $('#setUa').value.trim(); saveSettings({ ua }); native?.setUserAgent(ua); toast(native ? 'User agent saved' : 'Saved. User agent only applies in the desktop app.'); };
    $$('[data-switch]').forEach((b) => (b.onclick = () => signIn(withText(accounts[+b.dataset.switch]), b)));
    $$('[data-remove]').forEach((b) => (b.onclick = () => {
      const a = accounts[+b.dataset.remove];
      removeAccount(a);
      if (a.id !== acc?.id) renderSettings();
    }));
  }

  // ---------- Account on the TV: a profile header, then grouped rows; OK on a row opens its choices ----------
  const ICONS = {
    stream: '<path d="M3 7h18v11H3zM8 21h8M12 18v3"/>',
    team: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    bug: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M14 8h4v3h-4z"/>',
    delay: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    reload: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    update: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    out: '<path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3"/>',
  };
  const icon = (k) => `<svg class="srow-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;
  const CHEV_R = '<svg class="srow-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function updateShort() {
    switch (update.state) {
      case 'checking': return 'Checking…';
      case 'current': return 'Up to date';
      case 'downloading': return `Downloading ${update.percent || 0}%`;
      case 'ready': return `${update.version} available · Update now`;
      case 'error': return 'Couldn’t check · try again';
      default: return 'Check for updates';
    }
  }
  function renderSettingsTv() {
    const s = settings();
    const u = info?.user_info || {};
    const exp = u.exp_date ? new Date(+u.exp_date * 1000) : null;
    const daysLeft = exp ? Math.ceil((exp - Date.now()) / 86400000) : null;
    const active = acc.type !== 'xtream' || /active/i.test(u.status);
    const facts = acc.type === 'xtream'
      ? [exp ? `Expires ${exp.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}${daysLeft != null ? ` · ${daysLeft} days left` : ''}` : 'Never expires',
         `${u.active_cons ?? '?'} of ${u.max_connections ?? '?'} connections in use`, String(u.is_trial) === '1' ? 'Trial' : '']
      : [acc.url ? host(acc.url) : 'Playlist file', `${(catalog.live?.items.length ?? 0).toLocaleString()} channels`];
    const delays = [[0, 'Off · real time'], [15, '15 seconds'], [30, '30 seconds'], [45, '45 seconds'], [60, '1 minute'], [90, '1.5 minutes'], [120, '2 minutes']];
    const cur = +s.scoreDelay || 0;
    if (!delays.some(([v]) => v === cur)) delays.push([cur, `${cur} seconds · synced`]);
    delays.sort((a, b) => a[0] - b[0]);
    const teams = [...NBA.TEAMS].sort((a, b) => a.city.localeCompare(b.city)).map((t) => [t.abbr, `${t.city === 'LA' || t.city === 'Los Angeles' ? 'Los Angeles' : t.city} ${t.name}`]);
    // Each choice row: [key, icon, label, hint, options [[value, label]], current value, on pick]
    const choices = {
      format: ['stream', 'Live stream format', 'If a channel won’t play, the other one is tried too', [['hls', 'HLS first'], ['ts', 'MPEG-TS first']], s.liveFormat,
        (v) => { saveSettings({ liveFormat: v }); catalog.live = null; toast('Saved. Channels reload with the new format.'); }],
      team: ['team', 'Your team', 'Pinned on top, and Tuner tells you at tip-off', teams, favTeam(),
        (v) => { saveSettings({ nbaTeam: v }); nba.today = sortGames(nba.today); onNba(); toast('Saved'); }],
      bug: ['bug', 'Score on the picture', 'Otherwise press OK while watching', [['off', 'Off'], ['on', 'On']], scoreBugOn() ? 'on' : 'off',
        (v) => { saveSettings({ scoreBug: v === 'on' }); toast('Saved'); }],
      delay: ['delay', 'Score delay', 'Or press ←/→ during a game: Sync the score', delays.map(([v, l]) => [String(v), l]), String(cur),
        (v) => { saveSettings({ scoreDelay: +v }); toast(+v ? `Scores now run ${v} seconds behind live` : 'Scores are real time'); }],
    };
    const row = (key) => {
      const [ico, label, hint, opts, value] = choices[key];
      const shown = (opts.find(([v]) => v === value) || opts[0])[1];
      return `<button class="srow" data-set="${key}">${icon(ico)}<span class="srow-main"><span class="srow-l">${label}</span><span class="srow-h">${hint}</span></span><span class="srow-v">${esc(shown)}</span>${CHEV_R}</button>`;
    };
    const action = (key, ico, label, value, cls = '') => `<button class="srow${cls}" data-act="${key}">${icon(ico)}<span class="srow-main"><span class="srow-l">${label}</span></span>${value ? `<span class="srow-v" id="${key === 'update' ? 'tvUpdateVal' : ''}">${value}</span>` : ''}${CHEV_R}</button>`;
    $('#settingsPage').innerHTML = `
      <div class="tv-account">
        <header class="acct-hero">
          <span class="acct-av" style="--h:${hue(acc.name)}">${esc(initials(acc.name))}</span>
          <div class="acct-id">
            <h2>${esc(acc.name)}</h2>
            <p>${esc(acc.type === 'xtream' ? `${acc.username} · ${host(acc.server)}` : 'M3U playlist')}</p>
            <div class="acct-facts"><span class="pill ${active ? 'ok' : 'live'}">${esc(acc.type === 'xtream' ? String(u.status || 'Unknown').toUpperCase() : 'PLAYLIST')}</span>${facts.filter(Boolean).map((f) => `<span>${esc(f)}</span>`).join('')}</div>
          </div>
        </header>
        <section class="sgroup" data-nav="v"><h3>Playback</h3>${row('format')}</section>
        <section class="sgroup" data-nav="v"><h3>NBA</h3>${row('team')}${row('bug')}${row('delay')}</section>
        <section class="sgroup" data-nav="v"><h3>Accounts</h3>
          ${accounts.map((a, i) => `<button class="srow acct-row" data-acct="${i}"><span class="acct-av sm" style="--h:${hue(a.name)}">${esc(initials(a.name))}</span><span class="srow-main"><span class="srow-l">${esc(a.name)}</span><span class="srow-h">${esc(a.type === 'xtream' ? `${a.username} · ${host(a.server)}` : a.url ? host(a.url) : 'Playlist file')}</span></span>${a.id === acc.id ? '<span class="pill ok">IN USE</span>' : '<span class="srow-v">Switch</span>'}${CHEV_R}</button>`).join('')}
          ${action('add', 'add', 'Add an account')}
        </section>
        <section class="sgroup" data-nav="v"><h3>Tuner</h3>
          ${action('update', 'update', `Version ${esc(appVersion)} · TV`, esc(updateShort()), update.state === 'ready' ? ' hot' : '')}
          ${action('reload', 'reload', 'Reload channels & library')}
          ${action('out', 'out', 'Sign out', '', ' danger')}
        </section>
      </div>`;
    const page = $('#settingsPage');
    page.onclick = (e) => {
      const b = e.target.closest('.srow');
      if (!b) return;
      const back = () => page.querySelector(focusKey(b))?.focus({ preventScroll: true });
      if (b.dataset.set) {
        const [, label, , opts, value, pick] = choices[b.dataset.set];
        openSheet(label, opts.map(([v, l]) => ({ v, l })), value, (v) => { pick(v); renderSettingsTv(); back(); }, back);
      } else if (b.dataset.acct) {
        const a = accounts[+b.dataset.acct];
        const mine = a.id === acc.id;
        openSheet(a.name, [...(mine ? [] : [{ v: 'switch', l: 'Switch to this account' }]), { v: 'remove', l: 'Remove this account' }], '', (v) => {
          if (v === 'switch') signIn(withText(a));
          else { removeAccount(a); if (!mine) { renderSettingsTv(); page.querySelector('.srow')?.focus(); } }
        }, back);
      } else if (b.dataset.act === 'add') showLogin();
      else if (b.dataset.act === 'update') { if (update.state === 'ready') native?.updates.install(); else { updateDismissed = false; native?.updates.check(); } }
      else if (b.dataset.act === 'reload') {
        for (const k in catalog) { catalog[k] = null; delete fresh[k]; }
        Core.cache.clear();
        toast('Channels and library will reload');
        view = null;
        go('home');
      } else if (b.dataset.act === 'out') signOut();
    };
  }
  function removeAccount(a) {
    accounts = accounts.filter((x) => x !== a);
    store.set('accounts', accounts);
    ['favs', 'progress', 'recents', 'liveCat', 'lastLive', 'movieView', 'seriesView'].forEach((k) => store.del(`a:${a.id}:${k}`));
    store.del('m3u:' + a.id);
    if (a.id === acc.id) signOut();
  }

  // ======================================================================
  // NBA: live scores, box scores and play-by-play
  // ======================================================================
  const nba = {
    started: false, today: [], todayDay: '', offset: 0, other: [], err: '',
    selected: null, sum: null, sumErr: '', tab: 'away', gcTab: 'away',
    link: null, // { chId, gameId, manual } — which game the live channel is showing
    timer: 0, otherTimer: 0, sumTimer: 0, alerted: new Set(), watchFor: null, hist: new Map(), shownKey: null,
  };
  const favTeam = () => settings().nbaTeam || 'MEM';
  const isFav = (g) => g.home.abbr === favTeam() || g.away.abbr === favTeam();
  const dayGames = () => (nba.offset ? nba.other : nba.today);
  const gameById = (id) => nba.today.find((g) => g.id === id) || nba.other.find((g) => g.id === id) || null;
  const ordinal = (n) => (n <= 4 ? ['', '1st', '2nd', '3rd', '4th'][n] : n === 5 ? 'OT' : `${n - 4}OT`);
  const tipTime = (g) => new Date(g.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const statusText = (g) => (g.state === 'pre' ? `${tipTime(g)}` : g.state === 'in' ? g.detail.replace(' - ', ' · ') : g.detail || 'Final');
  const loser = (g, side) => g.state === 'post' && +g[side].score < +g[side === 'home' ? 'away' : 'home'].score;
  const tlogo = (t, cls = '') => `<img class="tlogo ${cls}" decoding="async" src="${esc(t.logo)}" alt="">`;

  // Team colors straight from ESPN can be near-black; use the alternate color then.
  function teamColor(t) {
    for (const c of [t.color, t.alt]) {
      if (!c) continue;
      const n = parseInt(c.slice(1), 16), lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
      if (lum > 0.18) return c;
    }
    return '#8a92a5';
  }

  // Broadcast-style block colors: the team color that reads as a solid fill, with legible text on it.
  function palette(t) {
    const lum = (c) => { const n = parseInt(c.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
    const cands = [t.color, t.alt].filter((c) => /^#[0-9a-f]{6}$/i.test(c || ''));
    const bg = cands.find((c) => lum(c) > 0.1 && lum(c) < 0.8) || cands[0] || '#283040';
    return { bg, fg: lum(bg) > 0.6 ? '#0b0d11' : '#ffffff' };
  }
  const teamVars = (t) => { const p = palette(t); return `--tb:${p.bg};--tf:${p.fg};--tc:${teamColor(t)}`; };
  const gameVars = (g) => `--away:${teamColor(g.away)};--home:${teamColor(g.home)};--away-b:${palette(g.away).bg};--home-b:${palette(g.home).bg}`;

  function sortGames(list) {
    const rank = (g) => (isFav(g) ? 0 : g.state === 'in' ? 1 : g.state === 'pre' ? 2 : 3);
    return [...list].sort((a, b) => rank(a) - rank(b) || a.date - b.date);
  }

  function startNba() {
    if (nba.started) return;
    nba.started = true;
    refreshToday();
  }

  const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  async function refreshToday() {
    clearTimeout(nba.timer);
    try {
      // ESPN's "today" follows US time and keeps last night's games well into the next morning.
      // Once they're all final and your own calendar has moved on, show your today's slate instead.
      let r = await NBA.scoreboard('');
      const local = isoDay(new Date());
      if (r.day && r.day < local && r.games.every((g) => g.state === 'post')) {
        try { const next = await NBA.scoreboard(local.replace(/-/g, '')); r = { day: next.day || local, games: next.games }; } catch {}
      }
      if (nba.todayDay && r.day !== nba.todayDay && nba.offset) { nba.offset = 0; nba.other = []; }
      nba.today = sortGames(r.games);
      nba.todayDay = r.day;
      nba.err = '';
    } catch (e) {
      nba.err = e.message;
    }
    onNba();
    nba.timer = setTimeout(refreshToday, nba.today.some((g) => g.state === 'in') ? 15000 : 120000);
  }

  async function refreshOther() {
    clearTimeout(nba.otherTimer);
    if (!nba.offset) return;
    const base = nba.todayDay ? new Date(nba.todayDay + 'T12:00:00') : new Date();
    base.setDate(base.getDate() + nba.offset);
    const ymd = `${base.getFullYear()}${String(base.getMonth() + 1).padStart(2, '0')}${String(base.getDate()).padStart(2, '0')}`;
    const want = nba.offset;
    try {
      const r = await NBA.scoreboard(ymd);
      if (want !== nba.offset) return;
      nba.loadingOther = false;
      nba.other = sortGames(r.games);
      nba.err = '';
    } catch (e) {
      nba.err = e.message;
      nba.loadingOther = false;
    }
    if (view === 'nba') drawNba();
    if (nba.other.some((g) => g.state === 'in')) nba.otherTimer = setTimeout(refreshOther, 15000);
  }

  function onNba() {
    const fav = nba.today.find((g) => isFav(g) && g.state === 'in');
    $('#nbaNavLive').hidden = !fav;
    if (fav && !nba.alerted.has(fav.id)) {
      nba.alerted.add(fav.id);
      const me = fav.home.abbr === favTeam() ? fav.home : fav.away;
      const msg = `${me.name} are live: ${fav.away.abbr} ${fav.away.score} – ${fav.home.score} ${fav.home.abbr} · ${statusText(fav)}`;
      if (watching()) native.mpv.command(['show-text', msg, 6000]); else toast(msg, 6000);
    }
    if (S.live.current && !nba.link) autoLink(S.live.current, `${S.live.current.name} ${epgNow}`);
    if (nba.link?.gameId) remember(gameById(nba.link.gameId));
    if (nba.panel) pushPanel();
    if (watching()) return; // the screens underneath catch up when the player closes
    if (view === 'nba') drawNba();
    if (view === 'home') drawHomeRow('nba');
    drawLiveGame();
  }

  // Keep the scoreboard entry in step with the fresher summary.
  function mergeGame(sg) {
    const g = gameById(sg.id);
    if (!g) return;
    Object.assign(g, { state: sg.state, detail: sg.detail || g.detail, clock: sg.clock, period: sg.period, final: sg.final });
    for (const side of ['home', 'away']) {
      if (sg[side].score) g[side].score = sg[side].score;
      if (sg[side].lines.length) g[side].lines = sg[side].lines;
    }
  }

  function focusId() {
    if (!$('#detail').hidden || !vp.hidden) return null;
    if (view === 'nba') return nba.selected;
    if (view === 'live' || mpvCtx?.kind === 'live') return nba.link?.gameId || null;
    return null;
  }

  async function sumTick() {
    clearTimeout(nba.sumTimer);
    // Behind the TV player the full box score is only needed while its panel is open.
    const id = watching() && !nba.panel ? null : focusId();
    if (id) {
      try {
        const s = await NBA.summary(id);
        if (focusId() === id) {
          nba.sum = s;
          nba.sumErr = '';
          mergeGame(s.game);
          if (nba.link?.gameId === id) remember(gameById(id));
          if (nba.panel === id) pushPanel();
          if (!watching()) { if (view === 'nba') drawNba(); drawLiveGame(); }
        }
      } catch (e) {
        nba.sumErr = e.message;
        if (view === 'nba' && !watching()) drawNba();
      }
    }
    const g = (id || nba.link?.gameId) && gameById(id || nba.link.gameId);
    nba.sumTimer = setTimeout(sumTick, g && g.state === 'in' ? 10000 : 60000);
  }

  // Work out which game a channel is showing from its name and what the guide says is on.
  function autoLink(ch, text) {
    if (!ch) return;
    if (nba.link?.chId === ch.id && nba.link.manual) return;
    const g = NBA.matchGame(text || ch.name, nba.today);
    const prev = nba.link?.gameId;
    nba.link = g ? { chId: ch.id, gameId: g.id } : null;
    if (nba.link?.gameId !== prev) {
      if (nba.sum?.game.id !== nba.link?.gameId) nba.sum = null;
      nba.gcTab = g && g.home.abbr === favTeam() ? 'home' : 'away';
      sumTick();
    }
    drawLiveGame();
  }

  function linkedGameFor(ch) {
    return ch && nba.link?.chId === ch.id && nba.link.gameId ? gameById(nba.link.gameId) : null;
  }

  function linkedGame() {
    const ch = S.live.current;
    return ch && nba.link?.chId === ch.id && nba.link.gameId ? gameById(nba.link.gameId) : null;
  }

  function bugHtml(g) {
    const t = (side) => `<span class="t" style="${teamVars(g[side])}">${tlogo(g[side], 'sm')}<b>${esc(g[side].abbr)}</b><span class="s">${esc(g[side].score)}</span></span>`;
    return `${t('away')}${t('home')}<span class="st${g.state === 'post' ? ' done' : ''}">${esc(statusText(g))}</span>`;
  }

  function linesTable(g) {
    const n = Math.max(4, g.away.lines.length, g.home.lines.length);
    const head = Array.from({ length: n }, (_, i) => `<th>${i < 4 ? i + 1 : ordinal(i + 1)}</th>`).join('');
    const row = (side) => `<tr class="trow-c" style="${teamVars(g[side])}"><td>${tlogo(g[side], 'sm')} ${esc(g[side].abbr)}</td>${Array.from({ length: n }, (_, i) => `<td>${esc(g[side].lines[i] ?? '')}</td>`).join('')}<td class="tot">${esc(g[side].score)}</td></tr>`;
    return `<div class="tbl-wrap"><table class="stat lines"><tr><th></th>${head}<th class="tot">T</th></tr>${row('away')}${row('home')}</table></div>`;
  }

  // Box score for one team. `compact` keeps the columns that fit under the live picture.
  function boxHtml(s, abbr, compact) {
    const team = s.box.find((b) => b.abbr === abbr);
    if (!team || !team.players.length) return '<div class="epg-empty">No box score yet. It appears at tip-off.</div>';
    const want = compact ? ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', '+/-'] : team.labels;
    const idx = want.map((l) => team.labels.indexOf(l)).filter((i) => i >= 0);
    const hiCols = new Map(['PTS', 'REB', 'AST'].map((l) => [team.labels.indexOf(l), Math.max(...team.players.map((p) => +p.stats[team.labels.indexOf(l)] || 0))]));
    const played = team.players.filter((p) => !p.dnp);
    const rows = (list) => list.map((p) => `<tr><td>${esc(compact ? p.short : p.name)}<span class="pos">${esc(p.pos)}</span></td>${idx.map((i) => {
      const v = p.stats[i] ?? '';
      return `<td${hiCols.get(i) && +v === hiCols.get(i) ? ' class="hi"' : ''}>${esc(v)}</td>`;
    }).join('')}</tr>`).join('');
    const starters = played.filter((p) => p.starter), bench = played.filter((p) => !p.starter);
    const dnp = compact ? '' : team.players.filter((p) => p.dnp).map((p) => `<tr class="dnp"><td>${esc(p.name)}<span class="pos">${esc(p.pos)}</span></td><td colspan="${idx.length}">${esc(p.reason ? p.reason.charAt(0) + p.reason.slice(1).toLowerCase() : 'Did not play')}</td></tr>`).join('');
    const sub = (label) => `<tr class="sub"><td colspan="${idx.length + 1}">${label}</td></tr>`;
    const totals = team.totals.length ? `<tr class="tot"><td>Team</td>${idx.map((i) => `<td>${esc(team.totals[i] ?? '')}</td>`).join('')}</tr>` : '';
    const side = s.game.home.abbr === abbr ? s.game.home : s.game.away;
    return `<div class="tbl-wrap" style="${teamVars(side)}"><table class="stat box"><tr><th>${compact ? '' : 'Starters'}</th>${idx.map((i) => `<th>${esc(team.labels[i])}</th>`).join('')}</tr>${rows(starters)}${bench.length ? sub('Bench') + rows(bench) : ''}${totals}${dnp}</table></div>`;
  }

  function playsHtml(s, limit) {
    if (!s.plays.length) return '<div class="epg-empty">No plays yet.</div>';
    const sideOf = (abbr) => (s.game.home.abbr === abbr ? s.game.home : s.game.away.abbr === abbr ? s.game.away : null);
    return `<div class="plays">${s.plays.slice(0, limit).map((p) => `<div class="play${p.scoring ? ' scoring' : ''}"><span class="ck">${esc(ordinal(p.period))} ${esc(p.clock)}</span><span class="tm"${sideOf(p.team) ? ` style="${teamVars(sideOf(p.team))}"` : ''}>${esc(p.team)}</span><span class="tx">${esc(p.text)}</span><span class="sco">${esc(p.away ?? '')}–${esc(p.home ?? '')}</span></div>`).join('')}</div>`;
  }

  const TEAM_STATS = [
    ['fieldGoalsMade-fieldGoalsAttempted', 'Field goals'], ['fieldGoalPct', 'FG %'],
    ['threePointFieldGoalsMade-threePointFieldGoalsAttempted', '3-pointers'], ['threePointFieldGoalPct', '3P %'],
    ['freeThrowsMade-freeThrowsAttempted', 'Free throws'], ['totalRebounds', 'Rebounds'], ['offensiveRebounds', 'Off. rebounds'],
    ['assists', 'Assists'], ['steals', 'Steals'], ['blocks', 'Blocks'], ['totalTurnovers', 'Turnovers'],
    ['pointsInPaint', 'Points in paint'], ['fastBreakPoints', 'Fast break points'], ['fouls', 'Fouls'], ['largestLead', 'Largest lead'],
  ];
  function teamStatsHtml(s, g) {
    const a = s.teams.find((t) => t.abbr === g.away.abbr)?.stats, h = s.teams.find((t) => t.abbr === g.home.abbr)?.stats;
    if (!a || !h) return '<div class="epg-empty">Team stats appear at tip-off.</div>';
    const ca = teamColor(g.away), ch = teamColor(g.home);
    return `<div class="tstat">${TEAM_STATS.filter(([k]) => a[k] != null).map(([k, label]) => {
      const av = parseFloat(a[k]) || 0, hv = parseFloat(h[k]) || 0, sum = av + hv || 1;
      return `<span class="a">${esc(a[k])}</span><span class="l">${label}</span><span class="h">${esc(h[k])}</span><span class="bars"><i style="flex:${av / sum};background:${ca}"></i><i style="flex:${hv / sum};background:${ch}"></i></span>`;
    }).join('')}</div>`;
  }

  // ---------- score delay ----------
  // IPTV streams run behind the real game. Keep a short history of each watched game and show the
  // state from `scoreDelay` seconds ago, so the score bug never spoils a play before you see it.
  const delayMs = () => (+settings().scoreDelay || 0) * 1000;
  function remember(g) {
    if (!g) return;
    let h = nba.hist.get(g.id);
    if (!h) nba.hist.set(g.id, (h = []));
    const s = nba.sum?.game.id === g.id ? nba.sum : null;
    const last = h[h.length - 1];
    const snap = JSON.stringify([g.state, g.detail, g.home.score, g.away.score, s?.plays[0]?.text, s?.plays.length]);
    if (last && last.key === snap) return;
    h.push({ t: Date.now(), key: snap, g: JSON.parse(JSON.stringify(g)), s });
    const cutoff = Date.now() - delayMs() - 60000;
    while (h.length > 2 && h[1].t < cutoff) h.shift();
  }
  // The game (and its box score) as it should look right now on a stream that is `scoreDelay` behind.
  function delayed(g) {
    const live = { g, s: g && nba.sum?.game.id === g.id ? nba.sum : null };
    const d = delayMs();
    const h = g && nba.hist.get(g.id);
    if (!d || !h?.length || g.state !== 'in') return live;
    const target = Date.now() - d;
    let pick = h[0];
    for (const e of h) if (e.t <= target) pick = e;
    return { g: pick.g, s: pick.s || live.s, key: pick.t };
  }
  const delayNote = () => (delayMs() ? `<span class="pill dim" title="Scores are held back to match your stream. Change under Account.">${settings().scoreDelay}s delay</span>` : '');
  setInterval(() => {
    if (!delayMs() || view !== 'live') return;
    const g = (nba.panel && gameById(nba.panel)) || linkedGame();
    const k = g && delayed(g).key;
    if (k !== nba.shownKey) { nba.shownKey = k; if (nba.panel) pushPanel(); if (!watching()) drawLiveGame(); }
  }, 1000);

  // ---------- NBA in the TV player: the score and box score at the side, and syncing the score to the stream ----------
  function panelData(g) {
    const { g: dg, s } = delayed(g);
    const team = (side) => {
      const t = dg[side];
      const b = s?.box.find((x) => x.abbr === t.abbr);
      const cols = ['MIN', 'PTS', 'REB', 'AST'].map((l) => (b ? b.labels.indexOf(l) : -1));
      const rows = b ? b.players.filter((p) => !p.dnp).map((p) => [p.short || p.name, ...cols.map((i) => (i >= 0 ? String(p.stats[i] ?? '') : ''))]) : [];
      return { abbr: t.abbr, color: teamColor(t), rows };
    };
    return {
      score: `${dg.away.abbr} ${dg.away.score ?? ''} – ${dg.home.score ?? ''} ${dg.home.abbr}   ${statusText(dg)}`,
      note: delayMs() ? `${settings().scoreDelay}s behind live, to match your stream` : '',
      away: team('away'), home: team('home'), first: dg.home.abbr === favTeam() ? 1 : 0, loading: !s,
    };
  }
  function pushPanel() {
    const g = nba.panel && gameById(nba.panel);
    if (!g || !watching()) return;
    const json = JSON.stringify(panelData(g));
    if (json === nba.panelJson) return;
    nba.panelJson = json;
    native.mpv.command(['stats', json]);
  }
  // You press left/right as you see a basket, pick it from the latest ones, and the score is held back by exactly that much.
  async function startSync(seenAt) {
    const g = linkedGame() || (nba.link?.gameId && gameById(nba.link.gameId));
    if (!g) { native.mpv.command(['show-text', 'No NBA game found for this channel', 4000]); return; }
    let s;
    try { s = await NBA.summary(g.id); } catch { native.mpv.command(['show-text', 'Couldn’t reach the scores right now', 4000]); return; }
    const plays = s.plays.filter((p) => p.scoring && p.at && p.at < seenAt).slice(0, 6);
    if (!plays.length) { native.mpv.command(['show-text', 'No baskets yet to sync with', 4000]); return; }
    native.mpv.command(['sync-plays', JSON.stringify({ seenAt, plays: plays.map((p) => ({ at: p.at, label: `${g.away.abbr} ${p.away} – ${p.home} ${g.home.abbr}    ${p.text}` })) })]);
  }
  function finishSync(at, seenAt) {
    const sec = Math.max(0, Math.min(600, Math.round((seenAt - at) / 1000) - 1));
    saveSettings({ scoreDelay: sec });
    native.mpv.command(['show-text', sec ? `Score synced: it now runs ${sec} s behind live, like your stream` : 'Score synced: your stream is live', 5000]);
    nba.panelJson = '';
    pushPanel();
  }

  // ---------- live TV: score bug + game card ----------
  // The TV keeps the picture clean unless you turn the bug on; the PC and phone show it unless you turn it off.
  const scoreBugOn = () => settings().scoreBug ?? !TV;
  function drawLiveGame() {
    if (watching()) return;
    const card = $('#gameCard'), bug = $('#scoreBug');
    const ch = S.live.current;
    if (view !== 'live' || !ch) { card.hidden = bug.hidden = true; return; }
    const linked = linkedGame();
    const { g, s } = delayed(linked);
    $('#livePtabs .ptab-dot').hidden = !linked;
    bug.hidden = !(g && g.state !== 'pre' && scoreBugOn());
    if (!bug.hidden) setHtml(bug, bugHtml(g));
    const live = nba.today.filter((x) => x.state === 'in');
    if (!g && !live.length) { card.hidden = true; return; }
    card.hidden = false;
    const picker = `<select data-relink title="Which game is on this channel?"><option value="">Not an NBA game</option>${nba.today.map((x) => `<option value="${x.id}"${g?.id === x.id ? ' selected' : ''}>${esc(x.away.abbr)} @ ${esc(x.home.abbr)} · ${esc(statusText(x))}</option>`).join('')}</select>`;
    if (!g) {
      card.style.cssText = '';
      card.classList.remove('linked');
      setHtml(card, `<div class="gc-head"><span class="title"><span class="live-dot"></span>NBA live now</span>${picker}</div>
        <div class="gc-strip">${live.map((x) => `<button class="gc-chip" data-link="${x.id}">${tlogo(x.away, 'sm')}${esc(x.away.abbr)} ${esc(x.away.score)} – ${esc(x.home.score)} ${esc(x.home.abbr)}${tlogo(x.home, 'sm')}<small>${esc(statusText(x))}</small></button>`).join('')}</div>
        <span class="hint">Watching one of these? Pick it to see the box score here.</span>`);
      return;
    }
    const tab = (id, label, logo) => `<button data-gctab="${id}" class="${nba.gcTab === id ? 'on' : ''}${id === 'plays' ? '' : ' team'}"${id === 'plays' ? '' : ` style="${teamVars(g[id])}"`}>${logo || ''}${label}</button>`;
    let body;
    if (g.state === 'pre') body = `<div class="epg-empty">Tip-off at ${esc(tipTime(g))}${g.tv.length ? ' on ' + esc(g.tv.join(', ')) : ''}.</div>`;
    else if (!s) body = '<div class="loading-note"><div class="spinner"></div>Loading box score…</div>';
    else body = nba.gcTab === 'plays' ? playsHtml(s, 8) : boxHtml(s, nba.gcTab === 'home' ? g.home.abbr : g.away.abbr, true);
    card.style.cssText = gameVars(g);
    card.classList.add('linked');
    setHtml(card, `<div class="gc-head"><span class="title">${g.state === 'in' ? '<span class="live-dot"></span>' : ''}${esc(g.away.name)} at ${esc(g.home.name)}</span>${delayNote()}${picker}</div>
      ${linesTable(g)}
      <div class="tabs gc-tabs">${tab('away', g.away.abbr, tlogo(g.away, 'sm'))}${tab('home', g.home.abbr, tlogo(g.home, 'sm'))}${tab('plays', 'Plays')}<button data-open-game="${g.id}">Full box score</button></div>
      ${body}`);
  }

  // Phone layout: the live screen switches between the channel list and what's playing.
  $('#livePtabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    $('#view-live').dataset.p = b.dataset.p;
    $$('#livePtabs [data-p]').forEach((x) => x.classList.toggle('on', x === b));
    if (b.dataset.p === 'chans') requestAnimationFrame(renderLiveList);
  });

  $('#gameCard').addEventListener('click', (e) => {
    const t = e.target.closest('[data-link], [data-gctab], [data-open-game]');
    if (!t || !S.live.current) return;
    if (t.dataset.link) { nba.link = { chId: S.live.current.id, gameId: t.dataset.link, manual: true }; nba.sum = null; sumTick(); drawLiveGame(); }
    else if (t.dataset.gctab) { nba.gcTab = t.dataset.gctab; drawLiveGame(); }
    else if (t.dataset.openGame) { nba.offset = 0; nba.selected = t.dataset.openGame; go('nba'); }
  });
  $('#gameCard').addEventListener('change', (e) => {
    if (!e.target.matches('[data-relink]') || !S.live.current) return;
    nba.link = { chId: S.live.current.id, gameId: e.target.value || null, manual: true };
    nba.sum = null;
    sumTick();
    drawLiveGame();
  });

  // Text for mpv's on-screen display in full-screen TV.
  function scoreLine(g) {
    return `${g.away.abbr} ${g.away.score}  –  ${g.home.score} ${g.home.abbr}    ${statusText(g)}`;
  }

  // ---------- NBA view ----------
  function enterNba() {
    startNba();
    if (!nba.selected || !dayGames().some((g) => g.id === nba.selected)) nba.selected = dayGames()[0]?.id || null;
    nba.tab = nba.tab === 'plays' || nba.tab === 'team' ? nba.tab : 'away';
    drawNba();
  }

  // The slate's real date, named relative to your own calendar: "Yesterday, Oct 23", "Today, Oct 24".
  function dayLabel() {
    const d = nba.todayDay ? new Date(nba.todayDay + 'T12:00:00') : new Date();
    d.setDate(d.getDate() + nba.offset);
    const now = new Date();
    const diff = Math.round((new Date(isoDay(d) + 'T12:00:00') - new Date(isoDay(now) + 'T12:00:00')) / 86400000);
    const rel = { '-1': 'Yesterday', 0: 'Today', 1: 'Tomorrow' }[diff];
    const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return rel ? `${rel}, ${date}` : d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function gameCardHtml(g) {
    const row = (side) => `<span class="trow" style="${teamVars(g[side])}">${tlogo(g[side])}<span style="min-width:0"><div class="tn">${esc(g[side].name)}</div><div class="rec">${esc(g[side].record)}</div></span></span><span class="gsc${loser(g, side) ? ' lose' : ''}">${g.state === 'pre' ? '' : esc(g[side].score)}</span>`;
    const me = isFav(g) ? (g.home.abbr === favTeam() ? g.home : g.away) : null;
    return `<button class="gcard${g.state === 'in' ? ' live' : ''}${me ? ' fav' : ''}${nba.selected === g.id ? ' on' : ''}" data-g="${g.id}"${me ? ` style="--fav:${teamColor(me)}"` : ''}>
      ${row('away')}${row('home')}
      <span class="gst"><span>${g.state === 'in' ? '<span class="live-dot"></span>' : ''}${esc(statusText(g))}</span><span class="tv">${esc(g.tv.join(', '))}</span></span></button>`;
  }

  function drawNba() {
    $('#nbaDay').textContent = dayLabel();
    const games = dayGames();
    const list = $('#nbaGames');
    if (!games.length) {
      list.innerHTML = nba.loadingOther ? '<div class="loading-note"><div class="spinner"></div>Loading games…</div>' : nba.err ? `<div class="empty"><h3>Scores unavailable</h3><p>${esc(nba.err)}</p></div>` : !nba.todayDay && !nba.offset ? '<div class="loading-note"><div class="spinner"></div>Loading games…</div>' : '<div class="empty">No games on this day.</div>';
      $('#nbaDetail').innerHTML = '';
      return;
    }
    if (!games.some((g) => g.id === nba.selected)) nba.selected = games[0].id;
    let html = '', last = '';
    for (const g of games) {
      const group = isFav(g) ? 'Your team' : g.state === 'in' ? 'Live' : g.state === 'pre' ? 'Upcoming' : 'Final';
      if (group !== last) { html += `<div class="nba-sep">${group}</div>`; last = group; }
      html += gameCardHtml(g);
    }
    const scroll = list.scrollTop;
    if (setHtml(list, html)) list.scrollTop = scroll;
    drawNbaDetail();
  }

  function drawNbaDetail() {
    const g = gameById(nba.selected);
    const box = $('#nbaDetail');
    if (!g) { setHtml(box, ''); return; }
    const s = nba.sum?.game.id === g.id ? nba.sum : null;
    const team = (side) => `<div class="sb-team ${side}">${tlogo(g[side], 'lg')}<div><div class="nm">${esc(g[side].name)}</div><div class="rc">${esc(g[side].record)}${side === 'home' ? ' · Home' : ''}</div></div><div class="big${loser(g, side) ? ' lose' : ''}">${g.state === 'pre' ? '' : esc(g[side].score)}</div></div>`;
    const leaders = ['PTS', 'REB', 'AST'].map((k) => {
      const a = g.away.leaders.find((l) => l.stat === k), h = g.home.leaders.find((l) => l.stat === k);
      return a || h ? `<span class="k">${k}</span><span class="v" style="${teamVars(g.away)}">${a ? `<b>${esc(a.value)}</b>${esc(a.who)}` : ''}</span><span class="v" style="${teamVars(g.home)}">${h ? `<b>${esc(h.value)}</b>${esc(h.who)}` : ''}</span>` : '';
    }).join('');
    const tab = (id, label, logo) => `<button data-ntab="${id}" class="${nba.tab === id ? 'on' : ''}${g[id] ? ' team' : ''}"${g[id] ? ` style="${teamVars(g[id])}"` : ''}>${logo || ''}${label}</button>`;
    let body;
    if (g.state === 'pre') body = '<div class="epg-empty">The box score fills in once the game starts.</div>';
    else if (!s) body = nba.sumErr ? `<div class="epg-empty">${esc(nba.sumErr)}</div>` : '<div class="loading-note"><div class="spinner"></div>Loading box score…</div>';
    else if (nba.tab === 'team') body = `<div class="panel">${teamStatsHtml(s, g)}</div>`;
    else if (nba.tab === 'plays') body = `<div class="panel">${playsHtml(s, 60)}</div>`;
    else body = `<div class="panel">${boxHtml(s, nba.tab === 'home' ? g.home.abbr : g.away.abbr, TV)}</div>`; // the remote can't scroll a wide table sideways

    $('#view-nba').classList.toggle('detail-open', !!nba.phoneDetail);
    const changed = setHtml(box, `
      <button class="btn ghost nba-back" data-nba-back>‹ Games</button>
      <div class="sb-hero" style="${gameVars(g)}">
        ${team('away')}
        <div class="sb-mid">
          <div class="st${g.state === 'in' ? ' live' : ''}">${g.state === 'in' ? '<span class="live-dot"></span>' : ''}${esc(g.state === 'pre' ? `${new Date(g.date).toLocaleDateString([], { weekday: 'short' })} ${tipTime(g)}` : statusText(g))}</div>
          ${g.tv.length ? `<div class="tv">${esc(g.tv.join(' · '))}</div>` : ''}
          <div class="sb-actions"><button class="btn primary" data-watch="${g.id}">Find on TV</button></div>
        </div>
        ${team('home')}
      </div>
      <div class="watch-list" id="watchList"></div>
      <div class="nba-row">
        <div class="panel"><h4>By quarter</h4>${linesTable(g)}</div>
        ${leaders ? `<div class="panel"><h4>Leaders</h4><div class="leaders"><span></span><span class="k">${esc(g.away.abbr)}</span><span class="k">${esc(g.home.abbr)}</span>${leaders}</div></div>` : ''}
      </div>
      <div class="tabs">${tab('away', g.away.name, tlogo(g.away, 'sm'))}${tab('home', g.home.name, tlogo(g.home, 'sm'))}${tab('team', 'Team stats')}${tab('plays', 'Play-by-play')}</div>
      ${body}`);
    if (changed && nba.watchFor === g.id) drawWatchList(g);
  }

  async function drawWatchList(g) {
    const box = $('#watchList');
    if (!box) return;
    // A redraw of the game puts back the last results straight away instead of searching again from blank.
    if (nba.watchHtml?.id === g.id) setHtml(box, nba.watchHtml.html);
    else box.innerHTML = '<div class="loading-note"><div class="spinner"></div>Searching your channels…</div>';
    let c;
    try { c = await ensure('live'); } catch (e) { box.innerHTML = `<div class="epg-empty">${esc(e.message)}</div>`; return; }
    if (nba.selected !== g.id || view !== 'nba') return;
    const exact = c.items.filter((ch) => NBA.matchGame(ch.name, [g]));
    const general = c.items.filter((ch) => !exact.includes(ch) && /\bNBA\b|league pass/i.test(ch.name)).slice(0, 12);
    const tile = (ch) => `<button class="chan-tile" data-tune="${esc(ch.id)}">${logo(ch.logo, ch.name)}<span>${esc(ch.name)}</span></button>`;
    const html = !exact.length && !general.length
      ? `<div class="epg-empty">No channel names mention this game. It may be on ${esc(g.tv.join(', ') || 'a channel without the teams in its name')}. Try the guide on your sports channels.</div>`
      : `${exact.length ? `<div class="nba-sep">Showing this game</div>${exact.slice(0, 12).map(tile).join('')}` : ''}${general.length ? `<div class="nba-sep">NBA channels</div>${general.map(tile).join('')}` : ''}`;
    nba.watchHtml = { id: g.id, html };
    setHtml(box, html);
  }

  $('#nbaGames').addEventListener('click', (e) => {
    const b = e.target.closest('.gcard');
    if (!b) return;
    nba.selected = b.dataset.g;
    nba.watchFor = null;
    nba.phoneDetail = true;
    $('#nbaDetail').scrollTop = 0;
    const g = gameById(nba.selected);
    nba.tab = g && g.home.abbr === favTeam() ? 'home' : 'away';
    nba.sumErr = '';
    drawNba();
    sumTick();
  });
  $('#nbaDetail').addEventListener('click', (e) => {
    if (e.target.closest('[data-nba-back]')) { nba.phoneDetail = false; $('#view-nba').classList.remove('detail-open'); return; }
    const t = e.target.closest('[data-ntab], [data-watch], [data-tune]');
    if (!t) return;
    if (t.dataset.ntab) { nba.tab = t.dataset.ntab; drawNbaDetail(); }
    else if (t.dataset.watch) { nba.watchFor = nba.watchFor === t.dataset.watch ? null : t.dataset.watch; nba.watchFor ? drawWatchList(gameById(t.dataset.watch)) : ($('#watchList').innerHTML = ''); }
    else if (t.dataset.tune) {
      const ch = catalog.live?.byId.get(t.dataset.tune);
      const gameId = nba.selected;
      if (!ch) return;
      go('live');
      tune(ch);
      nba.link = { chId: ch.id, gameId, manual: true };
      nba.sum = null;
      sumTick();
      drawLiveGame();
    }
  });
  const changeDay = (d) => { nba.offset += d; nba.other = []; nba.selected = null; nba.loadingOther = !!nba.offset; drawNba(); refreshOther(); };
  $('#nbaPrev').onclick = () => changeDay(-1);
  $('#nbaNext').onclick = () => changeDay(1);
  $('#nbaDay').onclick = () => { nba.offset = 0; nba.selected = null; drawNba(); };


  // ======================================================================
  // Home (TV): a hero for whatever is focused, then rows of things to watch
  // ======================================================================
  const home = { rows: [], epg: new Map(), heroT: 0, moved: false };

  async function enterHome() {
    ['live', 'movie', 'series'].forEach(takeFresh);
    drawHome();
    // Fill in rows as the catalogs arrive.
    for (const k of ['live', 'movie', 'series']) {
      if (!src || (k === 'series' && acc.type !== 'xtream') || catalog[k]) continue;
      ensure(k).then(() => { if (view === 'home') drawHome(); }).catch(() => {});
    }
  }

  function homeRows() {
    const rows = [];
    const games = nba.today.filter((g) => g.state === 'in' || (g.state === 'pre' && g.date - Date.now() < 4 * 3600e3) || (g.state === 'post' && isFav(g)));
    if (games.length) rows.push({ id: 'nba', title: games.some((g) => g.state === 'in') ? 'NBA · Live now' : 'NBA · Tonight', kind: 'game', items: sortGames(games) });
    const cont = Object.values(progress).filter((p) => p.t > 30 && p.t < p.d * 0.94).sort((a, b) => b.at - a.at).slice(0, 20);
    if (cont.length) rows.push({ id: 'cont', title: 'Continue watching', kind: 'cont', items: cont });
    const byId = catalog.live?.byId;
    const fav = favList('live').map((f) => byId?.get(f.id) || f);
    if (fav.length) rows.push({ id: 'fav', title: 'Your channels', kind: 'ch', items: fav });
    const rec = recents.map((id) => byId?.get(id)).filter(Boolean).slice(0, 24);
    if (rec.length) rows.push({ id: 'recent', title: 'Recently watched', kind: 'ch', items: rec });
    if (!fav.length && !rec.length && catalog.live) rows.push({ id: 'chans', title: 'Channels', kind: 'ch', items: catalog.live.items.slice(0, 30) });
    // Worked out once per list (the NBA row redraws often); English titles first when the provider marks languages.
    const newest = (c) => {
      if (!c._newest) {
        const all = [...c.items].sort((a, b) => b.added - a.added);
        const en = all.filter((x) => x._lang === 'English');
        c._newest = (en.length >= 12 ? en : all).slice(0, 30);
      }
      return c._newest;
    };
    const favMovies = favList('movie'), favSeries = favList('series');
    if (favMovies.length || favSeries.length) rows.push({ id: 'saved', title: 'My list', kind: 'poster', items: [...favMovies, ...favSeries] });
    if (catalog.movie?.items.length) rows.push({ id: 'movies', title: 'New movies', kind: 'poster', items: newest(catalog.movie) });
    if (catalog.series?.items.length) rows.push({ id: 'series', title: 'New series', kind: 'poster', items: newest(catalog.series) });
    return rows;
  }

  function homeCard(row, it, i) {
    const data = `data-row="${row.id}" data-i="${i}"`;
    if (row.kind === 'game') {
      const side = (s) => `<span class="hg-team">${tlogo(it[s])}<b>${it.state === 'pre' ? esc(it[s].abbr) : esc(it[s].score)}</b></span>`;
      return `<button class="hcard wide" ${data}><span class="thumb game" style="${gameVars(it)}">${side('away')}${side('home')}</span>
        <span class="cap">${it.state === 'in' ? '<span class="live-dot"></span>' : ''}${esc(it.away.abbr)} @ ${esc(it.home.abbr)} · ${esc(statusText(it))}</span></button>`;
    }
    if (row.kind === 'ch') {
      return `<button class="hcard wide" ${data}><span class="thumb ch">${logo(it.logo, it.name, 'logo xl')}<span class="chnum">${it.num ?? ''}</span></span><span class="cap">${esc(it.name)}</span></button>`;
    }
    const item = row.kind === 'cont' ? it.item : it;
    const pct = row.kind === 'cont' ? Math.min(100, (it.t / it.d) * 100) : 0;
    const name = item.kind === 'episode' ? item.seriesName : item.name;
    const poster = item.poster;
    return `<button class="hcard tall" ${data}><span class="thumb art${poster ? '' : ' noimg'}" data-ini="${esc(initials(name))}" style="--h:${hue(name)}">${poster ? `<img loading="lazy" decoding="async" src="${esc(poster)}" alt="">` : ''}${pct ? `<span class="pprog"><i style="width:${pct}%"></i></span>` : ''}</span>
      <span class="cap">${esc(item.kind === 'episode' ? `${name} · S${item.season} E${item.ep}` : name)}</span></button>`;
  }

  function rowHtml(row) {
    return `<section class="hrow" data-rowid="${row.id}"><h3>${esc(row.title)}</h3><div class="hrow-scroll" data-nav="h">${row.items.map((it, i) => homeCard(row, it, i)).join('')}</div></section>`;
  }

  function drawHome() {
    const box = $('#homeRows');
    const f = document.activeElement?.closest?.('.hcard');
    const keep = f && { row: f.dataset.row, i: f.dataset.i };
    home.rows = homeRows();
    if (!home.rows.length) {
      box.innerHTML = `<div class="empty"><h3>${catalog.live ? 'Nothing here yet' : 'Loading your channels…'}</h3><p>Star channels and start watching, and they show up here.</p></div>`;
      drawHero(null);
      return;
    }
    box.innerHTML = home.rows.map(rowHtml).join('');
    const back = keep && box.querySelector(`.hcard[data-row="${keep.row}"][data-i="${keep.i}"]`);
    if (back && home.moved) back.focus({ preventScroll: true });
    else if (document.activeElement === document.body) box.querySelector('.hcard')?.focus({ preventScroll: true });
    const cur = document.activeElement?.closest?.('.hcard');
    drawHero(cur ? homeItem(cur) : homeItem(box.querySelector('.hcard')));
  }

  // Redraw one row in place (the NBA row refreshes with the scores).
  function drawHomeRow(id) {
    const rows = homeRows();
    const row = rows.find((r) => r.id === id);
    const el = $(`#homeRows .hrow[data-rowid="${id}"]`);
    if (!row || !el) { if (!!row !== !!el) { drawHome(); $('#homeRows').scrollTop = 0; } return; }
    home.rows = rows;
    const f = document.activeElement?.closest?.('.hcard');
    const keepI = f && f.dataset.row === id ? f.dataset.i : null;
    const scroll = el.querySelector('.hrow-scroll').scrollLeft;
    el.outerHTML = rowHtml(row);
    const fresh = $(`#homeRows .hrow[data-rowid="${id}"]`);
    fresh.querySelector('.hrow-scroll').scrollLeft = scroll;
    if (keepI != null) { const c = fresh.querySelector(`.hcard[data-i="${keepI}"]`); c?.focus({ preventScroll: true }); if (c) drawHero(homeItem(c)); }
  }

  function homeItem(card) {
    if (!card) return null;
    const row = home.rows.find((r) => r.id === card.dataset.row);
    return row ? { row, it: row.items[+card.dataset.i] } : null;
  }

  async function heroEpg(ch) {
    const hit = home.epg.get(ch.id);
    if (hit && Date.now() - hit.at < 300000) return hit.list;
    let list = [];
    try { list = await src.epg(ch); } catch {}
    home.epg.set(ch.id, { at: Date.now(), list });
    return list;
  }

  function drawHero(sel) {
    const hero = $('#homeHero');
    if (!sel) { hero.innerHTML = `<div class="tvhero-body"><div class="eyebrow">Tuner</div><h1>${esc(acc?.name || '')}</h1></div>`; hero.style.cssText = ''; return; }
    const { row, it } = sel;
    let bg = '', eyebrow = '', title = '', meta = '', desc = '', art = '';
    hero.style.cssText = '';
    if (row.kind === 'game') {
      hero.style.cssText = gameVars(it);
      eyebrow = `NBA · ${it.state === 'in' ? '<span class="live-dot"></span>' : ''}${esc(statusText(it))}`;
      title = `${esc(it.away.name)} <span class="at">at</span> ${esc(it.home.name)}`;
      meta = it.state === 'pre' ? esc(`${it.away.record} · ${it.home.record}`) : `<span class="big-score">${esc(it.away.score)} – ${esc(it.home.score)}</span>`;
      const lead = it.away.leaders.find((l) => l.stat === 'PTS'), lead2 = it.home.leaders.find((l) => l.stat === 'PTS');
      desc = [lead && `${lead.who} ${lead.value} pts`, lead2 && `${lead2.who} ${lead2.value} pts`, it.tv.join(', ')].filter(Boolean).map(esc).join('  ·  ');
      art = `<div class="hero-logos">${tlogo(it.away)}${tlogo(it.home)}</div>`;
    } else if (row.kind === 'ch') {
      eyebrow = `Live · CH ${esc(it.num)}`;
      title = esc(it.name);
      meta = esc(catalog.live?.catName.get(it.cat) || '');
      desc = '<span class="dim">Loading what’s on…</span>';
      art = `<div class="hero-chlogo">${logo(it.logo, it.name, 'logo xxl')}</div>`;
      heroEpg(it).then((list) => {
        if (homeItem(document.activeElement?.closest?.('.hcard'))?.it !== it) return;
        const now = Date.now(), cur = list.find((p) => p.start <= now && p.end > now), next = list.find((p) => p.start >= (cur ? cur.end : now));
        const d = $('#homeHero .tvhero-body p');
        if (d) d.innerHTML = cur ? `<b>Now:</b> ${esc(cur.title)}${next ? `<br><span class="dim">Next ${hm(next.start)}: ${esc(next.title)}</span>` : ''}` : '<span class="dim">No guide information.</span>';
      });
    } else {
      const item = row.kind === 'cont' ? it.item : it;
      const isEp = item.kind === 'episode';
      eyebrow = isEp ? 'Series' : item.kind === 'series' ? 'Series' : 'Movie';
      title = esc(isEp ? item.seriesName : item.name);
      meta = [isEp ? `S${item.season} E${item.ep} · ${item.name}` : item.year, item.rating && `★ ${item.rating}`].filter(Boolean).map(esc).join('   ');
      if (row.kind === 'cont') desc = `Resume from ${fmtTime(it.t)} · ${Math.max(1, Math.round((it.d - it.t) / 60))} min left`;
      if (item.poster) bg = `<img class="tvhero-bg" decoding="async" src="${esc(item.poster)}" alt="">`;
    }
    hero.innerHTML = `${bg}${art}<div class="tvhero-body"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${meta ? `<div class="meta">${meta}</div>` : ''}<p>${desc}</p></div>`;
  }

  $('#homeRows').addEventListener('keydown', (e) => { if (Nav.keyOf(e)) home.moved = true; });
  $('#homeRows').addEventListener('focusin', (e) => {
    const card = e.target.closest('.hcard');
    if (!card) return;
    // Netflix-style: the focused row moves to the top, the focused card to the left.
    const rowEl = card.closest('.hrow'), rows = $('#homeRows'), strip = card.parentElement;
    rows.scrollTo({ top: rowEl.offsetTop - rows.offsetTop - 4, behavior: 'smooth' });
    // The focused card lines up where the first one sits, with room for it to grow without being cut off.
    strip.scrollTo({ left: Math.max(0, card.offsetLeft - strip.offsetLeft - parseFloat(getComputedStyle(strip).paddingLeft)), behavior: 'smooth' });
    clearTimeout(home.heroT);
    home.heroT = setTimeout(() => drawHero(homeItem(card)), 120);
  });

  $('#homeRows').addEventListener('click', async (e) => {
    const card = e.target.closest('.hcard');
    const sel = homeItem(card);
    if (!sel) return;
    const { row, it } = sel;
    if (row.kind === 'ch') return tune(catalog.live?.byId.get(it.id) || it);
    if (row.kind === 'game') {
      // Watch it if one of your channels is showing it, otherwise open the game.
      const c = await ensure('live').catch(() => null);
      const ch = c?.items.find((x) => NBA.matchGame(x.name, [it]));
      if (ch) { nba.link = { chId: ch.id, gameId: it.id, manual: true }; return tune(ch); }
      nba.offset = 0; nba.selected = it.id; nba.phoneDetail = true;
      return go('nba');
    }
    if (row.kind === 'cont') {
      const item = it.item;
      if (item.kind === 'movie') return playVod(item);
      const series = (await ensure('series').catch(() => null))?.byId.get(item.seriesId) || { kind: 'series', id: item.seriesId, name: item.seriesName, poster: item.poster, cat: '' };
      return openDetail(series);
    }
    openDetail(it);
  });

  // ======================================================================
  // Updates
  // ======================================================================
  let appVersion = '', update = { state: 'idle' }, updateDismissed = false;
  native?.version().then((v) => (appVersion = v));
  native?.updates.status().then(onUpdate);
  native?.updates.onStatus(onUpdate);
  function onUpdate(s) {
    const was = update.state;
    update = s || { state: 'idle' };
    const bar = $('#updateBar'), now = $('#updateNow');
    const showing = !bar.hidden;
    bar.hidden = !(update.state === 'ready' || (ANDROID && update.state === 'downloading')) || updateDismissed;
    if (update.state === 'ready') $('#updateText').textContent = update.note || (ANDROID ? `Tuner ${update.version} is available.` : `Tuner ${update.version} is ready to install.`);
    if (update.state === 'downloading') $('#updateText').textContent = `Downloading Tuner ${update.version}… ${update.percent || 0}%`;
    now.disabled = update.state === 'downloading';
    if (ANDROID) now.textContent = 'Update';
    // On the TV the remote can't reach a corner bar on its own, so the first time it appears, put focus on it.
    if (TV && !bar.hidden && !showing && was !== 'downloading' && !document.activeElement?.matches?.('input, select') && $('#optSheet').hidden) now.focus();
    if (view === 'settings' && $('#updateLine')) $('#updateLine').innerHTML = updateLine();
    if (view === 'settings' && $('#tvUpdateVal')) { $('#tvUpdateVal').textContent = updateShort(); $('#tvUpdateVal').closest('.srow').classList.toggle('hot', update.state === 'ready'); }
  }
  function updateLine() {
    switch (update.state) {
      case 'checking': return 'Checking for updates…';
      case 'current': return 'You have the latest version.';
      case 'downloading': return `Downloading ${esc(update.version)}… ${update.percent || 0}%`;
      case 'ready': return `Version ${esc(update.version)} is ${ANDROID ? 'available' : 'ready'}. <button class="btn primary" data-update="install">${ANDROID ? 'Update now' : 'Restart to update'}</button>`;
      case 'error': return `Could not check for updates: ${esc(update.message)}`;
      case 'dev': return 'Updates are off when running from source.';
      default: return IOS ? 'Updates arrive through AltStore.' : 'Updates install automatically.';
    }
  }
  $('#updateNow').onclick = () => native?.updates.install();
  $('#updateLater').onclick = () => {
    updateDismissed = true; $('#updateBar').hidden = true;
    toast(ANDROID ? 'You can update any time from Account.' : 'The update installs next time you close Tuner.');
    if (TV) enterContent(view);
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-update]');
    if (!b) return;
    if (b.dataset.update === 'install') native?.updates.install();
    else { updateDismissed = false; native?.updates.check(); }
  });

  // ======================================================================
  // Keyboard / remote
  // ======================================================================
  document.addEventListener('keydown', (e) => {
    let k = Nav.keyOf(e);
    const t = e.target;
    const typing = t.matches?.('input:not([type=range]):not([type=file]), textarea');
    if (typing && TV && t.readOnly) {
      if (k === 'ok') { e.preventDefault(); openField(t); return; }
      if (['up', 'down', 'left', 'right'].includes(k)) { e.preventDefault(); Nav.move(k, t.closest('#login, #sheet') || $('#shell')); return; }
      if (k !== 'back') return;
    }
    if (typing) {
      if (e.key === 'Escape') { t.blur(); e.preventDefault(); }
      else if ((k === 'down' || k === 'up') && !t.closest('#login')) { Nav.move(k, t.closest('.view') || document); e.preventDefault(); }
      else if (k === 'down' || k === 'up') { Nav.move(k, $('#login')); e.preventDefault(); }
      return;
    }
    // On a computer ↑/↓ change a dropdown's value; on the TV they move focus like everywhere else (OK opens it),
    // so the TV's browser never gets to move focus on its own.
    if (t.tagName === 'SELECT' && (k === 'up' || k === 'down') && !TV) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Backspace') k = 'back';

    if (!$('#optSheet').hidden) {
      if (k === 'back') { e.preventDefault(); closeSheet(); }
      else if (k === 'up' || k === 'down') { e.preventDefault(); Nav.move(k, $('#optSheet .opt-list')); }
      else if (k === 'left' || k === 'right') e.preventDefault();
      return;
    }

    if (!$('#cover').hidden) { if (k === 'back') { e.preventDefault(); native?.mpv?.stop(); } return; }
    if (!vp.hidden) return vodKeys(e, k);

    if (!$('#detail').hidden) {
      if (k === 'back') { e.preventDefault(); closeDetail(); }
      else if (['up', 'down', 'left', 'right'].includes(k)) { e.preventDefault(); Nav.move(k, $('#sheet')); }
      return;
    }

    if (!$('#login').hidden) {
      if (['up', 'down'].includes(k)) { e.preventDefault(); Nav.move(k, $('#login')); }
      return;
    }

    // The update prompt keeps the remote until you choose: ←/→ between Update and Later, Back means Later.
    if (t.closest?.('#updateBar')) {
      if (k === 'left' || k === 'right') { e.preventDefault(); Nav.move(k, $('#updateBar')); return; }
      if (k === 'up' || k === 'down') { e.preventDefault(); return; }
      if (k === 'back') { e.preventDefault(); $('#updateLater').click(); return; }
    }

    if (view === 'live' && liveKeys(e, k)) { e.preventDefault(); return; }

    // While the update prompt is up it can be reached from anywhere, like any other button on screen.
    if (['up', 'down', 'left', 'right'].includes(k)) { e.preventDefault(); Nav.move(k, $('#updateBar').hidden ? $('#shell') : document); return; }
    if (k === 'back') {
      e.preventDefault();
      const navOn = $('.nav.on');
      if (native?.minimize && document.activeElement === navOn) native.minimize();
      else navOn?.focus();
      return;
    }
    if (e.key === '/') { const q = $(`#${view}Q`); if (q) { e.preventDefault(); q.focus(); q.select(); } }
  });

  function stopAll() {
    livePlayer.stop();
    vodPlayer.stop();
    vp.hidden = true;
    $('#detail').hidden = true;
    exitFull();
  }

  // TV: text fields stay read-only (no on-screen keyboard) until you press OK on one.
  const FIELDS = 'input[type=search], input[type=text], input[type=url], input[type=password], input:not([type])';
  function lockFields(root = document) {
    if (!TV) return;
    root.querySelectorAll(FIELDS).forEach((f) => { if (f !== document.activeElement || !f.dataset.editing) f.readOnly = true; });
  }
  // Re-focusing the now-editable field is what makes Android open the keyboard.
  function openField(f) {
    f.dataset.opening = '1';
    f.blur();
    f.readOnly = false;
    f.dataset.editing = '1';
    f.focus();
    f.click();
    delete f.dataset.opening;
  }
  document.addEventListener('focusout', (e) => {
    if (TV && e.target.matches?.(FIELDS) && !e.target.dataset.opening) { e.target.readOnly = true; delete e.target.dataset.editing; }
  });
  document.addEventListener('focusin', (e) => {
    if (TV && e.target.matches?.(FIELDS) && !e.target.dataset.editing) e.target.readOnly = true;
  }, true);

  // The Android remote's Back button arrives here instead of as a key press.
  native?.onBack?.(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));

  // Lets the iPhone simulator test in CI drive the app. Only present in test builds.
  if (window.TUNER_TEST) {
    window.__tunerTest = {
      go, tune: (i) => tune(S.live.list[i]), openGame: (id) => { nba.selected = id; go('nba'); nba.phoneDetail = true; drawNba(); },
      state: () => ({ tv: TV, bridge: !!native, focus: document.activeElement?.id || document.activeElement?.className || '', view, channels: S.live.list.length, playing: S.live.current?.name, w: liveVideo.videoWidth, t: liveVideo.currentTime, err: !$('#liveMsg').hidden && $('#liveMsgTitle').textContent, games: nba.today.length, logos: [...document.images].filter((i) => i.complete && i.naturalWidth).length }),
    };
  }

  // ======================================================================
  // Start
  // ======================================================================
  const active = accounts.find((a) => a.id === store.get('active', null));
  if (active) {
    $('#bootText').textContent = `Connecting to ${active.name}…`;
    $('#boot').hidden = false;
    signIn(withText(active)).finally(() => ($('#boot').hidden = true));
  } else {
    showLogin();
  }
})();
