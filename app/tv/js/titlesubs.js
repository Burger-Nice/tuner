// The title page's subtitles and real-quality checks (design/ui-v1/subtitles/SPEC.md 4, PORT-UI.md 1 and 2): the
// quality checks of the page's copies (asked at once, dropped to the background when it closes, cancelled by Play),
// the subtitles for the film or the episode Play plays (and the focused episode after 1 s), the Subtitles pill, the
// pill-row slot's text (priority 3: titlecopies.js slotHooks), the Subtitles sheet, Other languages, and the
// "Which film is this?" menu from the subtitles side (titlecopies.js whichFilm, shared with add-ons).
// detail.js owns the page; titlecopies.js owns the copies and the match; this owns the subtitles.
import { on } from './state.js';
import { esc, ic, keyOf, hm } from './util.js';
import { prepare, subState, subSettings, subMemory, forgetSubs, retryNow, checkCopies, leaveCopies, checkFor, checkedFor, probeStatus, probeKey, playable, cancelChecks } from './subs.js';
import { noteLength } from './imdb.js';
import { isDub, readName, rank, providerCopy } from './copies.js';
import { prefLangs } from './catalog.js';
import { openOverlay, scrollList } from './ui.js';
import { whichFilm, tagsHtml } from './titlecopies.js';
import { SPIN } from './screens/addons.js';
import { TICK } from './quality.js';

const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
const and = (l) => (l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}`);
const or = (l) => (l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} or ${l[l.length - 1]}`);
const lower = (s) => (s ? s[0].toLowerCase() + s.slice(1) : '');
// " · " in a text becomes the kit's dot (the slot is html)
export const dots = (s) => esc(s).split(' · ').join('<span class="dot-sep"></span>');

// t: the title; tc: its copies (titlecopies.js); opts.playEp(): the episode Play plays (a series); onChange: redraw
export function titleSubs(t, tc, { playEp = () => null, onChange } = {}) {
  const movie = t.kind === 'movie';
  const ts = { t, dead: false, info: {}, dropNote: '', also: new Map() };
  const sent = new Map();   // key -> the request's signature (prepare runs again only when it changes)
  const offs = [];
  let epT = 0;
  const changed = () => { if (!ts.dead) onChange?.(); };

  // ---- which copy ----
  // the copy Play plays when it is the provider's (its check gives fps, length, tracks and the fingerprint)
  ts.version = () => { if (!movie) return null; const b = tc.best(); return b?.source === 'provider' ? b.v : null; };
  const versions = () => (movie ? t.versions || [] : [playEp()].filter((e) => e?.url));
  const nameOrder = (vs) => rank(vs.map((v) => providerCopy(v)), { langs: prefLangs() }).map((c) => c.v);

  // ---- the requests (PORT-UI.md 2) ----
  function reqFor(ep) {
    const m = tc.match || {};
    const none = !!m.none;
    const base = { name: t.name, imdb: none ? '' : m.id || '', level: none ? 'unsure' : m.level || 'unsure', runtime: m.meta?.runtime || 0 };
    if (!movie) {
      if (!ep) return null;
      const vid = (tc.vids || []).find((x) => +x.season === +ep.season && +x.episode === +ep.ep) || ep._row?.vid;
      return { ...base, key: keyOf(ep), season: +ep.season, episode: +ep.ep, series: keyOf(t), episodeKnown: !!vid, version: ep.url ? ep : null, soundLang: checkedFor(ep)?.lang || '', dub: false, alsoLang: ts.also.get(keyOf(ep)) };
    }
    const v = ts.version(), b = tc.best(), k = v ? checkedFor(v) : null;
    const soundLang = k?.lang || v?._lang || b?.lang || '';
    const dub = isDub({ nameSaysDub: readName({ name: v?.name || b?.filename || '' }).dub, prefixLang: v?._lang && v._lang !== 'English' ? v._lang : '', taggedSound: k?.taggedSound || '', country: tc.meta?.country || '' });
    return { ...base, key: keyOf(t), version: v, soundLang, dub, alsoLang: ts.also.get(keyOf(t)) };
  }
  function want(req) {
    if (!req || !tc.match) return;
    const sig = JSON.stringify([req.imdb, req.level, req.version?.id || '', req.dub, req.soundLang, req.alsoLang || '', req.episodeKnown]);
    if (sent.get(req.key) === sig) return;
    sent.set(req.key, sig);
    prepare(req).then((st) => {
      // a language from Other languages: his pick names its file once there is one
      if (req.alsoLang) { const l = st.langs.find((x) => x.lang === req.alsoLang && x.fileId); if (l) subMemory()?.setPick(req.key, { source: 'opensubtitles', id: l.fileId, lang: l.lang }); }
    }).catch((e) => console.error(e));
  }
  // the film, or the episode Play plays; called on every change of the copies or the match (cheap: by signature)
  ts.sync = () => { if (movie) want(reqFor()); else want(reqFor(playEp())); };
  ts.target = () => (movie ? keyOf(t) : playEp() ? keyOf(playEp()) : '');

  // ---- the quality checks (PORT-UI.md 1) ----
  const refreshPlayable = () => playable(t.versions || []).then((pm) => { if (ts.dead) return; const same = pm.size === tc.pm.size && [...pm].every(([k, x]) => JSON.stringify(tc.pm.get(k)) === JSON.stringify(x)); if (!same) { tc.pm = pm; changed(); } }).catch(() => {});
  ts.open = (info = {}) => {
    ts.info = info;
    const vs = versions();
    if (vs.length) checkCopies(movie ? nameOrder(vs) : vs, 'title');
    refreshPlayable();
    ts.sync();
  };
  offs.push(on('probed', (k) => {
    if (ts.dead) return;
    if (k && !versions().some((v) => probeKey(v) === k)) return;
    refreshPlayable();
    // the IMDb match learns the length from the default copy's check (Likely -> Sure, or dropped)
    const v = ts.version(), len = v && checkedFor(v)?.len;
    if (movie && len) noteLength(t, len / 60).then((r) => { if (r === 'drop') { ts.dropNote = 'These subtitles were for another film.'; changed(); } });
    changed();
  }));
  offs.push(on('subs', (key) => { if (sent.has(key)) changed(); }));
  // checks for this page's copies: 'checking' (one running or about to), 'paused' (why: streams in use, account in
  // use, today's checks are used, backing off, refused twice today), or null (all checked, or none can run here)
  ts.checking = () => {
    const vs = versions();
    if (!vs.length) return null;
    const done = vs.filter((v) => checkFor(v)).length;
    if (done === vs.length) return null;
    const st = probeStatus();
    if (!st) return null;
    if (st.running && vs.some((v) => probeKey(v) === st.running)) return { state: 'checking', done, of: vs.length };
    if (st.why && st.why !== 'too soon') return { state: 'paused', why: st.why, done, of: vs.length };
    if (st.queued) return { state: 'checking', done, of: vs.length };
    return null;
  };
  // Play: never waits for a check, and cancels the one in flight (an episode's subtitles are fetched now)
  ts.beforePlay = (ep) => { cancelChecks(); if (ep) want(reqFor(ep)); };
  // the page went behind another one: its copies drop to the background (ts.open() asks again on the way back)
  ts.leave = () => { clearTimeout(epT); leaveCopies(versions()); };
  ts.destroy = () => {
    ts.dead = true; clearTimeout(epT);
    offs.forEach((f) => f());
    leaveCopies(versions());
    for (const k of sent.keys()) forgetSubs(k);
  };

  // ---- the words (SPEC 4.2, 8) ----
  // the selection: his pick for this title, else what the setting shows
  function view(key) {
    const prefs = subSettings();
    const st = key ? subState(key) : null;
    if (!st) return { st, sel: {}, pill: prefs.mode === 'off' ? 'Subtitles: Off' : 'Subtitles: looking…', dashed: prefs.mode !== 'off', side: '', avail: [] };
    const none = !!tc.match?.none;
    const pk = subMemory()?.pick(key);
    const avail = st.langs.filter((l) => l.source);
    let sel;
    if (pk?.source === 'off') sel = { off: true, why: 'picked' };
    else if (pk?.lang) sel = { lang: pk.lang, source: pk.source || 'opensubtitles' };
    else if (st.on) sel = { lang: st.on.lang, source: st.on.source };
    else sel = { off: true, why: st.offReason || '' };
    const s = st.status, unsure = (s === 'unsure' || s === 'wrong-film') && !none;
    let pill, dashed = false, side = '';
    if (unsure) pill = 'Subtitles: which film is it?';
    else if (sel.lang) pill = `Subtitles: ${sel.lang}`;
    else if (sel.why) pill = 'Subtitles: Off';
    else if (s === 'looking') { pill = 'Subtitles: looking…'; dashed = true; }
    else if (s === 'down') { pill = 'Subtitles: none yet'; dashed = true; }
    else if (none) pill = 'Subtitles: none';
    else pill = 'Subtitles: none found';
    const miss = st.missing.find((l) => l !== sel.lang);
    const what = movie ? 'film' : 'episode';
    if (s === 'unsure' && !none) { const n = (tc.match?.cands || []).length; side = n >= 2 ? `${NUM[n] || n} ${movie ? 'films' : 'series'} are called ${t.name}` : 'Not matched on IMDb yet'; }
    else if (s === 'wrong-film' && !none) side = st.note;
    else if (s === 'down' && !sel.lang) side = `OpenSubtitles isn't answering · trying again at ${hm(st.retryAt || Date.now() + 60e3)}`;
    else if (sel.why === 'dub') side = avail.length ? `Off for a dubbed copy · ${and(avail.map((l) => l.lang))} ready` : 'Off for a dubbed copy';
    else if (sel.off && sel.why) side = avail.length ? `${and(avail.map((l) => l.lang))} ready` : '';
    else if (sel.lang) {
      const src = sel.source === 'file' ? 'In the file' : 'From OpenSubtitles';
      const other = avail.find((l) => l.lang !== sel.lang);
      if (sel.source === 'file' && other?.source === 'opensubtitles') side = `In the file · ${other.lang} from OpenSubtitles`;
      else if (other) side = `${src} · ${other.lang}${other.source === 'file' ? ' in the file' : ' ready too'}`;
      else if (miss) side = `${src} · No ${miss} for this ${what}`;
      else side = src;
      if (!prefs.online) side = `${src} · OpenSubtitles is off in Account`;
    } else if (s === 'none') side = st.others.length ? `No ${or(prefs.langs)} for this ${what}` : 'Not in the file, none on OpenSubtitles';
    else if (s === 'file-only' && !prefs.online) side = 'OpenSubtitles is off in Account';
    return { st, sel, pill, dashed, side, avail, miss, none };
  }
  ts.view = view;
  // the Subtitles pill (for the film, or the episode Play plays); slotTaken: the time left or "Still asking" has the
  // slot, so a dashed pill keeps the retry time (SPEC v1.3 nit)
  ts.pillHtml = ({ slotTaken = false } = {}) => {
    const v = view(ts.target());
    let text = v.pill;
    if (slotTaken && v.st?.status === 'down' && !v.sel.lang) text += ` · trying ${hm(v.st.retryAt || Date.now() + 60e3)}`;
    // ("Subtitles: " is its own span: a crowded series row drops it, the CC icon says it: detail.js fitCol)
    return `<span class="pillbtn fx${v.dashed ? ' st-wait' : ''}" tabindex="-1" data-act="subs">${ic('cc')}<span>${text.startsWith('Subtitles: ') ? `<span class="st-pre">Subtitles: </span>${esc(text.slice(11))}` : esc(text)}</span></span>`;
  };
  // the slot's third text: while this page's copies are checked, the progress line; else the subtitles text
  ts.slot = () => {
    const ck = ts.checking();
    if (ck?.state === 'checking') return `<span class="st-run"><i style="width:${Math.round((ck.done / ck.of) * 100)}%"></i></span>Checking what each copy really is`;
    const v = view(ts.target());
    return v.side ? dots(v.side) : '';
  };
  // a series' meta line: the checked facts of the episode Play plays (nothing while unchecked: episodes claim nothing)
  ts.epTags = () => { const e = playEp(), k = e && checkedFor(e); return k ? tagsHtml(providerCopy(e, { checked: k })) : ''; };
  // the focused episode's words on its synopsis line (SPEC 4.6), and its list after 1 s of focus
  ts.focusEp = (e) => { clearTimeout(epT); if (!e || movie) return; epT = setTimeout(() => { if (!ts.dead) want(reqFor(e)); }, 1000); };
  ts.epText = (e) => {
    if (!e || !subState(keyOf(e))) return '';
    const v = view(keyOf(e)), s = v.st.status;
    if (v.sel.lang) return `${v.sel.lang} subtitles, ${v.sel.source === 'file' ? 'in the file' : 'from OpenSubtitles'}${v.miss ? ` (no ${v.miss})` : ''}`;
    if (v.sel.why) return v.sel.why === 'dub' ? 'Subtitles off for a dubbed copy' : 'Subtitles off';
    if (s === 'looking') return 'Looking for subtitles…';
    if (s === 'down') return 'OpenSubtitles isn\'t answering';
    if (s === 'none') return 'No subtitles in your languages';
    return '';
  };

  // ---- the Subtitles sheet (SPEC 4.4, detail-subs-sheet), or the match menu for "which film is it?" ----
  ts.sheet = (onDone) => {
    const key = ts.target();
    const v = view(key);
    if (!key) return null;
    if (v.st && (v.st.status === 'unsure' || v.st.status === 'wrong-film') && !v.none) return ts.match(onDone);
    const ep = movie ? null : playEp();
    const st = v.st, s = st?.status || 'looking';
    const m = tc.match;
    const how = !m ? 'looking it up' : m.none ? 'not matched: your choice' : m.via === 'picked' ? 'your pick' : m.level === 'sure' ? 'matched on IMDb' : m.level === 'likely' ? 'matched by name and year' : 'not matched yet';
    const year = tc.meta?.year || t.year;
    const head = `${t.name}${year && movie ? ` (${year})` : ''}${ep ? ` · S${ep.season} · E${ep.ep}` : ''}, ${how}`;
    const langs = st ? st.langs : subSettings().langs.map((lang) => ({ lang, source: '' }));
    const noneWords = s === 'looking' ? 'Looking on OpenSubtitles…' : s === 'down' ? 'OpenSubtitles isn\'t answering' : !subSettings().online ? 'OpenSubtitles is off in Account' : `None for this ${movie ? 'film' : 'episode'}`;
    const isOn = (l) => !!v.sel.lang && v.sel.lang === l.lang;
    const rows = langs.map((l, i) => {
      if (!l.source) return `<div class="lr ad-two dim"><span class="rd"></span><span class="grow"><span class="a">${esc(l.lang)}</span><span class="b">${s === 'looking' ? `${SPIN}` : ''}${esc(noneWords)}</span></span></div>`;
      const w = l.words || (l.source === 'opensubtitles' && !l.ready ? 'getting it…' : '');
      const b = `${l.source === 'file' ? 'In this copy\'s file' : 'OpenSubtitles'}${l.sounds ? ' · with sounds' : ''}${w ? ` · ${l.anchored ? TICK : ''}${esc(l.source === 'file' && l.anchored ? w : lower(w))}` : ''}`;
      return `<div class="lr ad-two fx" tabindex="-1" data-act="lang" data-v="${i}"><span class="rd${isOn(l) ? ' on' : ''}"></span><span class="grow"><span class="a">${esc(l.lang)}</span><span class="b">${b}</span></span></div>`;
    }).join('');
    // a language from Other languages that he picked shows as his
    const extra = v.sel.lang && !langs.some((l) => l.lang === v.sel.lang) ? `<div class="lr ad-two fx" tabindex="-1" data-act="cur"><span class="rd on"></span><span class="grow"><span class="a">${esc(v.sel.lang)}</span><span class="b">OpenSubtitles · getting it…</span></span></div>` : '';
    const off = `<div class="lr ad-two fx" tabindex="-1" data-act="off"><span class="rd${v.sel.off ? ' on' : ''}"></span><span class="grow"><span class="a">Off</span>${v.sel.why === 'dub' ? '<span class="b">This copy is dubbed, so they start off</span>' : ''}</span></div>`;
    const more = [
      s === 'down' ? `<div class="lr ad-two fx" tabindex="-1" data-act="retry"><span class="grow"><span class="a">Try now</span><span class="b">OpenSubtitles · trying again at ${hm(st.retryAt || Date.now() + 60e3)}</span></span><span class="v">${ic('refresh')}</span></div>` : '',
      st?.others.length ? `<div class="lr ad-two fx" tabindex="-1" data-act="others"><span class="grow"><span class="a">Other languages</span></span><span class="v">${st.others.length}${ic('chevR')}</span></div>` : '',
      m?.id || m?.none ? `<div class="lr ad-two fx" tabindex="-1" data-act="match"><span class="grow"><span class="a">Not this ${movie ? 'film' : 'series'}?</span><span class="b">Match it again</span></span><span class="v">${ic('chevR')}</span></div>`
        : m ? `<div class="lr ad-two fx" tabindex="-1" data-act="match"><span class="grow"><span class="a">Which ${movie ? 'film' : 'series'} is it?</span><span class="b">Pick it to get subtitles</span></span><span class="v">${ic('chevR')}</span></div>` : '',
    ].join('');
    // the foot: what the slot may have had no room for, and what this copy's file has (once checked)
    const k = movie ? (ts.version() && checkedFor(ts.version())) : ep && checkedFor(ep);
    const notes = [];
    if (ts.dropNote || s === 'wrong-film') notes.push('These subtitles were for another film.');
    if (k) notes.push(k.inFile.some((x) => x.lang && !x.forced) ? `In this copy's file: ${and([...new Set(k.inFile.filter((x) => x.lang && !x.forced).map((x) => x.lang))])}.` : 'None in this copy\'s file.');
    const ov = openOverlay(`<div class="sheet st-sheet"><h3>Subtitles</h3><div class="t-cap" style="margin-top:-4px">${esc(head)}</div><div class="sheet-body"><div class="inner" data-col>
      <div class="sec">Your languages</div>${rows}${extra}${off}${more ? `<div class="sec">More</div>${more}` : ''}</div></div>${notes.length ? `<div class="st-note">${esc(notes.join(' '))}</div>` : ''}</div>`, {
      focusSel: v.sel.lang ? (langs.findIndex(isOn) >= 0 ? `[data-act="lang"][data-v="${langs.findIndex(isOn)}"]` : '[data-act="cur"]') : '[data-act="off"]',
      onClick: (act, el) => {
        const mem = subMemory();
        if (act === 'lang') { const l = langs[+el.dataset.v]; mem?.setPick(key, { source: l.source, id: l.source === 'file' ? `track:${l.track?.raw || l.lang}` : l.fileId, lang: l.lang }); ov.close(); changed(); onDone?.(); }
        else if (act === 'cur') { ov.close(); onDone?.(); }
        else if (act === 'off') { mem?.setPick(key, { source: 'off' }); ov.close(); changed(); onDone?.(); }
        else if (act === 'retry') { ov.close(); if (!retryNow(key)) { sent.delete(key); ts.sync(); } changed(); onDone?.(); }
        else if (act === 'others') othersMenu(key, st.others, onDone, ov);   // (over the sheet: Back returns to it)
        else if (act === 'match') { ov.close(false); ts.match(onDone); }
      },
    });
    scrollList(ov.el);
    return ov;
  };
  // Other languages: by English name; a pick is fetched for this title and remembered as his
  function othersMenu(key, others, onDone, sheet) {
    const list = [...others].sort((a, b) => a.localeCompare(b));
    const cur = subMemory()?.pick(key)?.lang;
    const ov = openOverlay(`<div class="sheet st-sheet"><h3>Other languages</h3><div class="t-cap" style="margin-top:-4px">From OpenSubtitles · ${list.length}</div><div class="sheet-body"><div class="inner" data-col>${list.map((l) => `<div class="lr fx" tabindex="-1" data-act="pick" data-v="${esc(l)}"><span class="rd${l === cur ? ' on' : ''}"></span><span class="grow ellipsis">${esc(l)}</span></div>`).join('')}</div></div><div class="st-note">Picking one keeps it for this ${movie ? 'film' : 'episode'}.</div></div>`, {
      focusSel: cur && list.includes(cur) ? `[data-v="${CSS.escape(cur)}"]` : null,
      onClick: (act, el) => {
        if (act !== 'pick') return;
        const lang = el.dataset.v;
        ov.close(false); sheet?.close();
        subMemory()?.setPick(key, { source: 'opensubtitles', id: '', lang });
        ts.also.set(key, lang);
        want(movie ? reqFor() : reqFor(playEp()));
        changed(); onDone?.();
      },
    });
    scrollList(ov.el);
  }
  // "Which film is this?" (SPEC 4.5): the shared picker; his pick (or None of these) prepares the subtitles again
  ts.match = (onDone) => whichFilm(tc, () => { ts.dropNote = ''; sent.clear(); ts.sync(); changed(); onDone?.(); });
  return ts;
}
