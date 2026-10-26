// A title's page: full-bleed backdrop under a flat scrim, a column that flows, Play or Resume (focused), Save, the version
// pill (language and quality, remembered per title) and More like this; series add season chips and the episode row.
import { $, esc, ic, dot, tag, setHtml, fmtTime, leftText, sized } from '../util.js';
import { S, on, settings, saveSettings, isFav, toggleFav, progressOf, inProgress } from '../state.js';
import { catalog, defaultVersion, pickVersion, versionLabel, prettyCat } from '../catalog.js';
import { wideCard } from '../cards.js';
import { playVod, watching } from '../player.js';
import { push } from '../router.js';
import { focus } from '../focus.js';
import { openOverlay, radioMenu, toast } from '../ui.js';

let el, t = null, ver = null, info = null, season = null, epFocus = null, my = 0;
const img = (url, w = 342) => (url ? `<img src="${esc(sized(url, w))}" alt="" decoding="async">` : '');
const SUBS = [['auto', 'Auto'], ['off', 'Off'], ['English', 'English'], ['Spanish', 'Spanish'], ['French', 'French'], ['German', 'German']];
const subLabel = () => SUBS.find(([v]) => v === (settings().subLang || 'auto'))?.[1] || 'Auto';

function episodes() { return (info?.seasons || []).flatMap((s) => s.eps); }
// Providers name episodes "Episode 1: Arrival", "Show - S01E01 - Arrival" or just "Episode 1": the title part only ('' if none).
const epName = (e) => { const n = String(e.name || '').replace(/^.*?\bS\d+\s*E\d+\b\s*[-:–.]?\s*/i, '').replace(/^(episode|ep\.?)\s*\d+\s*[-:–.]?\s*/i, '').trim(); return /^(episode|ep\.?)?\s*\d*$/i.test(n) ? '' : n; };
const epLine = (e) => `E${e.ep}${epName(e) ? ` · ${esc(epName(e))}` : ''}`;
// "00:52:10" or "3130" seconds as "52 min" / "1 h 5 min".
function epLen(d) {
  const m = String(d || '').match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  const min = m ? (m[3] != null ? +m[1] * 60 + +m[2] : +m[1]) + (m[3] != null && +m[3] >= 30 ? 1 : 0) : /^\d+$/.test(String(d)) ? Math.round(+d / 60) : 0;
  if (!min) return String(d || '');
  return min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`;
}
function seriesResume() {
  const eps = episodes();
  if (!eps.length) return null;
  let latest = null;
  for (const e of eps) { const p = progressOf(e); if (p && (!latest || p.at > latest.p.at)) latest = { e, p }; }
  if (!latest) return { ep: eps[0], label: `Play S${eps[0].season} · E${eps[0].ep}` };
  if (inProgress(latest.p)) return { ep: latest.e, label: `Resume S${latest.e.season} · E${latest.e.ep}`, p: latest.p };
  const next = eps[eps.indexOf(latest.e) + 1];
  return next ? { ep: next, label: `Play S${next.season} · E${next.ep}` } : { ep: eps[0], label: 'Watch again from S1 · E1' };
}

function moreLikeThis() {
  const c = catalog[t.kind];
  if (!c?.titles) return [];
  const g = t._genres?.[0];
  const pool = (c._sorted.popular || c.titles).filter((x) => x !== t && (!g || x._genres?.includes(g)));
  return pool.slice(0, 8);
}

let behind = false;
on('player-closed', () => { if (behind) { behind = false; draw(); } });
function draw() {
  if (watching()) { behind = true; return; }   // nothing to see under the TV player; drawn once it closes
  if (!t) return;
  const movie = t.kind === 'movie';
  const d = info || {};
  const genres = (t._genres?.length ? t._genres : d.genre ? String(d.genre).split(/[,/]/).map((x) => x.trim()) : []).slice(0, 3);
  const cat = catalog[t.kind]?.catName.get(t.cat);
  const eyebrow = [movie ? 'Movie' : 'Series', genres.join(' · ') || (cat ? prettyCat(cat).name : '')].filter(Boolean).join(dot);
  const rating = t._ir ? t._ir.toFixed(1) : d.rating || t.rating;
  const seasons = d.seasons?.length;
  const meta = [rating ? `<span class="star">${ic('star')}${esc(rating)}</span>` : '', d.year || t.year ? `<span>${esc(d.year || t.year)}</span>` : '', movie && d.duration ? `<span>${esc(d.duration)}</span>` : '', !movie && seasons ? `<span>${seasons} season${seasons > 1 ? 's' : ''}</span>` : '']
    .filter(Boolean).join(dot);
  const tags = [ver?._q === '4K' ? tag('4K', 'q') : ver?._q === 'Full HD' ? tag('HD', 'q') : '', ver?._hdr ? tag('HDR', 'q') : '', ver?._lang ? tag(ver._lang.slice(0, 2).toUpperCase()) : ''].join('');
  const p = movie && ver ? progressOf(ver) : null;
  const resume = movie && inProgress(p);
  let play = '';
  if (movie) play = resume ? `<span class="btn fx" tabindex="-1" data-act="play">${ic('play')}Resume ${fmtTime(p.t)}</span><span class="btn2 fx" tabindex="-1" data-act="restart">${ic('restart')}Start over</span>` : `<span class="btn fx" tabindex="-1" data-act="play">${ic('play')}Play</span>`;
  else { const r = info && seriesResume(); play = r ? `<span class="btn fx" tabindex="-1" data-act="play">${ic('play')}${esc(r.label)}</span>` : `<span class="btn fx" tabindex="-1" data-act="wait">${ic('play')}${info ? 'No episodes' : 'Loading…'}</span>`; }
  const saved = isFav(t);
  const credits = [d.director ? `Directed by <span class="t-2">${esc(d.director)}</span>` : '', d.cast ? `<span class="t-2">${esc(d.cast)}</span>` : ''].filter(Boolean).join(dot);
  const pills = `${t.versions.length > 1 ? `<span class="pillbtn fx" tabindex="-1" data-act="version">${ic('film')}${esc(versionLabel(ver))} ${ic('chevD')}</span>` : ''}<span class="pillbtn fx" tabindex="-1" data-act="subs">${ic('cc')}Subtitles: ${esc(subLabel())}</span>${resume ? `<span class="t-cap">${leftText(p.d - p.t)}</span>` : ''}`;
  const backdrop = d.backdrop || t.poster;
  let below = '';
  if (movie) {
    const more = moreLikeThis();
    below = more.length ? `<div class="abs rowtitle" style="left:48px;top:366px;font-size:20px">More like this</div><div class="rail abs" style="top:400px;left:0;right:0"><div class="track" data-row data-more>${more.map((x, i) => wideCard(x, i)).join('')}</div></div>` : '';
    el._more = more;
  } else if (info?.seasons?.length) {
    const r = seriesResume();
    if (!season || !info.seasons.some((s) => s.n === season)) season = r?.ep.season || info.seasons[0].n;
    const s = info.seasons.find((x) => x.n === season);
    const fe = epFocus && s.eps.includes(epFocus) ? epFocus : r?.ep && s.eps.includes(r.ep) ? r.ep : s.eps[0];
    const eps = s.eps.map((e, i) => {
      const ep = progressOf(e), done = ep && (ep.done || ep.t >= ep.d * 0.94), part = inProgress(ep);
      return `<div class="ep fx${done ? ' done' : ''}" tabindex="-1" data-ep="${i}"><div class="th"><div class="art">${img(e.still || t.poster)}</div><span class="num">${e.ep}</span>${done ? `<span class="chk">${ic('check')}</span>` : ''}${part ? `<div class="prog flush"><i style="width:${Math.min(100, (ep.t / ep.d) * 100)}%"></i></div>` : ''}</div><div class="eb"><b>${esc(epName(e) || `Episode ${e.ep}`)}</b><span>${part ? leftText(ep.d - ep.t) : esc(epLen(e.duration))}</span></div></div>`;
    }).join('');
    below = `<div class="abs seas" data-row style="left:48px;top:272px">${info.seasons.map((x) => `<span class="chip lg fx${x.n === season ? ' sel' : ''}" tabindex="-1" data-season="${esc(x.n)}">Season ${esc(x.n)}</span>`).join('')}<span class="t-cap" style="align-self:center;margin-left:8px">${s.eps.length} episode${s.eps.length > 1 ? 's' : ''}</span></div>
      <div class="rail abs" style="top:318px;left:0;right:0"><div class="track" data-row data-eps data-entry='[data-ep="${s.eps.indexOf(fe)}"]' style="gap:24px">${eps}</div></div>
      <div class="abs epsyn" data-syn style="left:48px;top:486px;width:864px"><b>${epLine(fe)}</b>${fe.plot ? `${dot}${esc(fe.plot)}` : ''}</div>`;
  } else if (info?.error) below = `<div class="abs t-body" style="left:48px;top:300px">${esc(info.error)}</div>`;
  else if (!movie) below = `<div class="abs t-cap" style="left:48px;top:300px">Loading episodes…</div>`;
  setHtml(el, `<div class="d-back"><div class="art">${img(backdrop, 1280)}</div><div class="d-scrim"></div></div><div class="d-scrim2"${movie ? '' : ' style="height:300px"'}></div>
<div class="d-col"${movie ? '' : ' style="top:32px"'}>
  <div class="t-label t-2">${eyebrow}</div>
  <div class="t-display clamp2" style="margin-top:6px">${esc(t.name)}</div>
  <div class="metaline" style="margin-top:10px">${meta}${tags ? dot + tags : ''}</div>
  ${d.plot ? `<div class="t-body clamp2" style="margin-top:12px;width:460px">${esc(d.plot)}</div>` : `<div class="t-body" style="margin-top:12px;color:var(--a-text-3)">${info ? '' : 'Loading details…'}</div>`}
  ${movie && credits ? `<div class="t-cap ellipsis" style="margin-top:8px;width:500px">${credits}</div>` : ''}
  <div class="row-flex" data-row style="gap:20px;margin-top:${movie ? 20 : 16}px;height:44px;padding-left:2px">${play}<span class="btn2 fx" tabindex="-1" data-act="save">${ic(saved ? 'check' : 'saved')}${saved ? 'Saved' : 'Save'}</span>${movie ? '' : `<span class="pillbtn fx" tabindex="-1" data-act="subs">${ic('cc')}Subtitles: ${esc(subLabel())}</span>`}</div>
  ${movie ? `<div class="row-flex" data-row style="gap:10px;margin-top:12px;height:36px">${pills}</div>` : ''}
</div>${below}`);
  placeTracks();
}
function placeTracks() {
  const a = document.activeElement;
  el.querySelectorAll('.track').forEach((tr) => {
    // (the episode row starts scrolled to its entry: the episode you're on)
    const f = tr.contains(a) ? a : tr._mem?.isConnected ? tr._mem : tr.dataset.entry ? tr.querySelector(tr.dataset.entry) : null;
    const i = f ? [...tr.children].indexOf(f) : 0;
    const w = tr.hasAttribute('data-eps') ? 224 : 222;
    tr.style.transform = i > 2 ? `translateX(${-(i - 2) * w}px)` : '';
  });
}

function play(restart) {
  if (t.kind === 'movie') return playVod(ver, { restart });
  const r = seriesResume();
  if (r) playVod(r.ep, { queue: episodes() });
}
function versionSheet() {
  const vs = [...t.versions];
  radioMenu({
    title: 'Version', value: ver.id, style: 'left:48px;top:150px;width:520px',
    rows: vs.map((v) => ({ v: v.id, l: versionLabel(v), sub: v._title !== t.name ? v.name.slice(0, 28) : '' })),
    extra: '<div class="t-cap" style="padding:8px 8px 2px">Default: your language at the best quality. Remembered per title.</div>',
    onPick: (id) => { ver = vs.find((v) => v.id === id) || ver; pickVersion(t, ver); draw(); focus(el.querySelector('[data-act="version"]')); },
  });
}
function subsMenu() {
  radioMenu({
    title: 'Subtitles', value: settings().subLang || 'auto', style: 'left:48px;top:150px;width:360px',
    rows: SUBS.map(([v, l]) => ({ v, l })),
    extra: '<div class="t-cap" style="padding:8px 8px 2px">Used when the file has them. Change it in the player with ▼.</div>',
    onPick: (v) => { saveSettings({ subLang: v }); draw(); focus(el.querySelector('[data-act="subs"]')); },
  });
}

export default {
  name: 'detail',
  bar: false,
  mount(root) {
    el = root;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act],[data-season],[data-ep],.wc');
      if (!b || !t) return;
      if (b.dataset.season) { season = b.dataset.season; epFocus = null; draw(); focus(el.querySelector(`[data-season="${CSS.escape(season)}"]`)); return; }
      if (b.dataset.ep != null) { const s = info.seasons.find((x) => x.n === season); return playVod(s.eps[+b.dataset.ep], { queue: episodes() }); }
      if (b.classList.contains('wc')) { const x = el._more?.[+b.dataset.i]; if (x) push('detail', { title: x }); return; }
      const act = b.dataset.act;
      if (act === 'play') play(false);
      else if (act === 'restart') play(true);
      else if (act === 'save') { const on = toggleFav(t); toast(on ? `Saved ${t.name}` : `Removed ${t.name} from Saved`); draw(); focus(el.querySelector('[data-act="save"]')); }
      else if (act === 'version') versionSheet();
      else if (act === 'subs') subsMenu();
    });
    root.addEventListener('tvfocus', (e) => {
      placeTracks();
      const ep = e.target.closest('.ep');
      if (ep && info) {
        const s = info.seasons.find((x) => x.n === season);
        epFocus = s.eps[+ep.dataset.ep];
        const syn = el.querySelector('[data-syn]');
        if (syn) syn.innerHTML = `<b>${epLine(epFocus)}</b>${epFocus.plot ? `${dot}${esc(epFocus.plot)}` : ''}`;
      }
    });
    on('progress', () => { if (!el.hidden) draw(); });
  },
  async enter(root, params, { fresh }) {
    if (params.title && (fresh || params.title !== t)) {
      t = params.title; ver = defaultVersion(t); info = null; season = null; epFocus = null;
      const mine = ++my;
      draw();
      try {
        const d = t.kind === 'movie' ? await S.src.movieInfo(ver) : await S.src.seriesInfo({ id: t.id, name: t.name, poster: t.poster });
        if (mine !== my) return;
        info = d;
      } catch (e) { if (mine !== my) return; info = { error: e.message, seasons: [] }; }
      const had = root.contains(document.activeElement) && document.activeElement.dataset.act;
      draw();
      focus(root.querySelector(had ? `[data-act="${had}"]` : '[data-act="play"]') || root.querySelector('.btn'));
    } else draw();
  },
  entry: (root) => root.querySelector('[data-act="play"]') || root.querySelector('.btn'),
};
