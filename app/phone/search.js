// Search (SPEC 3.6): our own field at the top, autofocused, the phone's keyboard; results in sections as on the TV:
// channels (by number or name), games (by team), films and series from the add-ons' search catalogs.
import { hm } from '../tv/js/util.js';
import { on } from '../tv/js/state.js';
import { ensure, searchAll } from '../tv/js/catalog.js';
import { guideNow, onNow } from '../tv/js/guide.js';
import { nba } from '../tv/js/games.js';
import { programmeView, videoMask } from '../tv/js/catchup.js';
import { playLive } from '../tv/js/player.js';
import * as AD from '../tv/js/addons.js';
import { ic, esc, push, isShown, tileOf, crestImg } from './ui.js';
import { gameCard } from './cards.js';
import { openTitle } from './detail.js';

let el, q = '', ads = null, adT = 0, chans = [], titles = [], gs = [];
function askAddons() {
  clearTimeout(adT);
  const qq = q.trim();
  if (qq.length < 3) { ads = null; return; }
  if (ads?.q === qq) return;
  adT = setTimeout(async () => {
    const st = { q: qq, asking: true, items: [] };
    ads = st; drawRes();
    const cats = AD.searchCatalogs();
    const lists = cats.length ? await Promise.all(cats.map((x) => AD.catalogPage(x.a, x.c, { search: qq }).catch(() => []))) : [await AD.cinemetaSearch('movie', qq).catch(() => []), await AD.cinemetaSearch('series', qq).catch(() => [])];
    if (ads !== st) return;
    const seen = new Set();
    for (const m of lists.flat()) { if (!m?.id || seen.has(m.id) || videoMask({ kind: 'movie', id: m.id, name: m.name })) continue; seen.add(m.id); st.items.push(m); }
    st.asking = false;
    drawRes();
  }, 450);
}
function drawRes() {
  const box = el?.querySelector('.sr-res');
  if (!box) return;
  if (!q.trim()) { box.innerHTML = '<div class="note">A channel, a number, a team, a film or a series.</div>'; return; }
  const r = searchAll(q, 40);
  chans = r.live.slice(0, 12);
  const n = q.trim().toLowerCase();
  gs = nba.today.filter((g) => [g.home, g.away].some((t) => `${t.name} ${window.NBA.team(t.abbr)?.city || ''} ${t.abbr}`.toLowerCase().includes(n)));
  titles = (ads?.items || []).slice(0, 30);
  const ch = chans.map((c, i) => { const p = onNow(guideNow(c)); return `<button class="sr-row" data-ch="${i}">${tileOf(c)}<span class="col"><b>${esc(c.name)}</b><small>${c.num ? `${c.num} · ` : ''}${p ? `${esc(programmeView(c, p).title)} · until ${hm(p.end)}` : 'Channel'}</small></span></button>`; }).join('');
  const ti = titles.map((m, i) => `<button class="sr-row" data-t="${i}"><span class="tile" style="width:40px;height:60px;border-radius:6px">${m.poster ? `<img src="${esc(m.poster)}" alt="" style="object-fit:cover;padding:0" loading="lazy">` : ''}</span><span class="col"><b>${esc(m.name)}</b><small>${m.type === 'series' ? 'Series' : 'Film'}${m.year || m.releaseInfo ? ` · ${esc(m.releaseInfo || m.year)}` : ''}</small></span></button>`).join('');
  box.innerHTML = `${gs.length ? `<div class="sr-sec"><div class="sec-h">Games</div><div class="nb-grid">${gs.map((g) => gameCard(g)).join('')}</div></div>` : ''}
    ${ch ? `<div class="sr-sec"><div class="sec-h">Channels</div>${ch}</div>` : ''}
    ${ti || ads?.asking ? `<div class="sr-sec"><div class="sec-h">Films and series</div>${ti}${ads?.asking ? '<div class="note">Asking your add-ons…</div>' : ''}</div>` : ''}
    ${!gs.length && !ch && !ti && !ads?.asking ? '<div class="state"><b>Nothing found</b><p>Try another spelling or part of the name.</p></div>' : ''}`;
}
export default {
  name: 'search', tab: true,
  mount(root) {
    el = root;
    root.innerHTML = `<div class="ph-top"><h1>Search</h1></div><div class="sr-field">${ic('search')}<input id="sr-q" type="search" placeholder="Channels, games, films, series" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search" autocomplete="off"></div><div class="sr-res"></div>`;
    root.querySelector('#sr-q').addEventListener('input', (e) => { q = e.target.value; askAddons(); drawRes(); });
    root.addEventListener('click', (e) => {
      const c = e.target.closest('[data-ch]');
      if (c) { const ch = chans[+c.dataset.ch]; if (ch) playLive(ch, chans, 'All channels'); return; }
      const t = e.target.closest('[data-t]');
      if (t) { const m = titles[+t.dataset.t]; if (m) openTitle({ kind: m.type === 'series' ? 'series' : 'movie', id: m.id, imdb: /^tt/.test(m.id) ? m.id : '', name: m.name, poster: m.poster, year: +m.year || 0 }); return; }
      const g = e.target.closest('.gcard[data-g]');
      if (g) push('game', { id: g.dataset.g });
    });
    on('nba', () => { if (isShown('search')) drawRes(); });
  },
  enter(root) { ensure('live').then(drawRes).catch(() => {}); drawRes(); setTimeout(() => root.querySelector('#sr-q')?.focus(), 250); },
};
void crestImg;
