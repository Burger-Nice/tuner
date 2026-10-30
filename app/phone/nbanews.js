// News (nba-pages/SPEC.md 6, phone SPEC 3.3: a list with the preview on top) and the story reader (a full sheet).
// A story that would give away a game you haven't seen is covered (SPEC 8.3): its row says so, and a tap opens the card
// that names the game (Keep it hidden first). The reader scans every paragraph before it shows (shieldParagraphs).
// The team page's News rail uses storyCard() and openStory() from here.
import { esc, ic, sheet, push } from './ui.js';
import { on } from '../tv/js/state.js';
import { storyCover, shieldParagraphs, unseenFor, favTeam, shieldMode, markSeen } from '../tv/js/games.js';
import { peek, want, failed } from '../tv/js/league.js';
import { names, gameName } from '../tv/js/nba/common.js';
import { crest, dayDate, paint, blocks, downState } from './nbakit.js';

const TYPE = { HeadlineNews: 'News', Story: 'Story', Preview: 'Preview', Recap: 'Recap' };
const kindOf = (s) => TYPE[s.type] || 'Story';
export function ago(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  if (h < 48) return 'Yesterday';
  const d = Math.floor(h / 24);
  return d < 7 ? `${d} days ago` : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
// whose story: your team when it's tagged, else the first team; 'NBA' with none or 4 and more (round-ups)
function who(s) {
  const t = s.teams || [];
  if (!t.length || t.length >= 4) return 'NBA';
  return names(t.includes(favTeam()) ? favTeam() : t[0]).name;
}
function coverWho(s, g) {
  const both = [g.away.abbr, g.home.abbr].filter((a) => s.teams?.includes(a));
  const a = both.includes(favTeam()) ? favTeam() : both[0];
  return a ? `A ${names(a).name} story` : 'A story';
}
const sized = (url, w, h) => {
  try { const u = new URL(url); return u.host === 'a.espncdn.com' && u.pathname.startsWith('/photo/') ? `https://a.espncdn.com/combiner/i?img=${encodeURIComponent(u.pathname)}&w=${w}&h=${h}` : url; } catch { return url; }
};
const photo = (s, w, h) => (s.image ? `<img src="${esc(sized(s.image, w, h))}" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0">`
  : `<span class="noph">${crest(s.teams?.[0] || favTeam() || 'MEM', 34)}${s.teams?.[1] ? `<i>at</i>${crest(s.teams[1], 34)}` : ''}</span>`);

// every story drawn, by id, for the taps
const byId = new Map();
const keep = (s) => { byId.set(s.id, s); return s; };
export const storyById = (id) => byId.get(id) || null;

// ---------- the News section ----------
export function wantNews() {
  want('news');
  if (shieldMode() === 'off') return;
  if (favTeam()) want(`schedule:${favTeam()}`);
  for (const g of unseenFor()) for (const a of [g.home.abbr, g.away.abbr]) want(`roster:${a}`);   // (rule 2: players on either roster)
}
function rowHtml(s) {
  keep(s);
  const g = storyCover(s);
  if (g) return `<button class="nw-row cov nbz" data-story="${esc(s.id)}"><span class="th">${ic('eyeOff')}</span><span class="col"><b>${esc(coverWho(s, g))} · hidden by the shield</b><small>${esc(gameName(g))} · ${esc(dayDate(g.date))} · ${esc(ago(s.published))}</small></span></button>`;
  return `<button class="nw-row nbz" data-story="${esc(s.id)}"><span class="th">${photo(s, 192, 108)}</span><span class="col"><b>${esc(s.headline)}</b><small>${esc([kindOf(s), s.premium && 'ESPN+', ago(s.published), who(s)].filter(Boolean).join(' · '))}</small></span></button>`;
}
function leadHtml(s) {
  keep(s);
  const g = storyCover(s);
  if (g) return `<button class="nw-lead cov" data-story="${esc(s.id)}"><span class="ph">${ic('eyeOff')}</span><span class="tx"><span class="mt">${esc(ago(s.published))}</span><b>${esc(coverWho(s, g))} · hidden by the shield</b><span class="ds">It's about ${esc(gameName(g))} (${esc(dayDate(g.date))}), which you haven't seen on this iPhone.</span></span></button>`;
  return `<button class="nw-lead" data-story="${esc(s.id)}"><span class="ph">${photo(s, 786, 442)}</span><span class="tx"><span class="mt">${esc([kindOf(s), s.premium && 'ESPN+', ago(s.published), who(s)].filter(Boolean).join(' · '))}</span><b>${esc(s.headline)}</b>${s.description ? `<span class="ds">${esc(s.description)}</span>` : ''}</span></button>`;
}
export function newsHtml() {
  const d = peek('news')?.data;
  if (!d) return failed('news') ? downState('News isn’t reachable') : `<div class="sk" style="height:300px;margin:14px 16px 0;border-radius:16px"></div>${blocks(5, 64)}`;
  const list = d.filter((s) => Date.now() - s.published < 7 * 864e5 || d.length < 6).slice(0, 25);
  if (!list.length) return '<div class="state"><b>No stories this week</b><p>ESPN’s NBA stories show here, newest first.</p></div>';
  const covered = list.filter((s) => storyCover(s)).length;
  const note = covered ? `<div class="note">${ic('eyeOff')} ${covered} ${covered === 1 ? 'story' : 'stories'} hidden by the shield</div>` : '';
  return `${note}${leadHtml(list[0])}<div class="nw-list">${list.slice(1).map(rowHtml).join('')}</div>`;
}

// ---------- the team page's rail card ----------
export function storyCard(s) {
  keep(s);
  const g = storyCover(s);
  if (g) return `<button class="tp-nc cov" data-story="${esc(s.id)}"><span class="ph">${ic('eyeOff')}</span><b>${esc(coverWho(s, g))} · hidden by the shield</b><small>${esc(ago(s.published))}</small></button>`;
  return `<button class="tp-nc" data-story="${esc(s.id)}"><span class="ph">${photo(s, 480, 270)}</span><b>${esc(s.headline)}</b><small>${esc([kindOf(s), ago(s.published)].join(' · '))}</small></button>`;
}

// ---------- the reader ----------
let rd = null;   // { s, body }
function readerHtml(s) {
  const d = peek(`story:${s.id}`)?.data, bad = failed(`story:${s.id}`);
  let paras, note = '';
  if (s.premium) { paras = [s.description]; note = 'The rest of this story is for ESPN+ subscribers.'; }
  else if (d?.paragraphs?.length) paras = d.paragraphs;
  else { paras = [s.description]; note = d ? '' : bad ? 'The rest of the story isn’t reachable: ESPN isn’t answering.' : 'Loading the story…'; }
  paras = paras.filter(Boolean);
  // scanned before anything shows (SPEC 8.3): a paragraph that would tell a result you haven't seen reads so
  const shown = shieldParagraphs(paras), hid = shown.filter((p) => p == null).length;
  const words = paras.join(' ').split(/\s+/).length, mins = d?.paragraphs?.length ? Math.max(1, Math.round(words / 230)) : 0;
  const lb = [kindOf(s), s.premium && 'ESPN+', ago(s.published), mins && `${mins} min read`].filter(Boolean).map(esc).join(' · ');
  const by = [d?.byline || s.byline, 'ESPN'].filter(Boolean).map(esc).join(' · ');
  const text = shown.map((p, i) => (p == null ? `<p class="hidp">${ic('eyeOff')}<span>A result is hidden here</span></p>` : `<p${i ? '' : ' class="lede"'}>${esc(p)}</p>`)).join('');
  const t = (s.teams || []).length >= 4 ? [] : [...new Set([...(s.teams || []).filter((a) => a === favTeam()), ...(s.teams || [])])].slice(0, 2);
  const btns = t.length ? `<div class="nb-act nbz" style="margin-top:18px">${t.map((a) => `<button class="ghost" data-act="team" data-abbr="${esc(a)}">${crest(a, 22)}<span class="ellipsis">${esc(names(a).name)} page</span>${ic('chevR')}</button>`).join('')}</div>` : '';
  return `${s.image ? `<div class="rd-ph">${photo(s, 786, 442)}</div>` : ''}<div class="rd-in"><div class="rd-lb">${lb}</div><h2>${esc(s.headline)}</h2><div class="rd-by">${by}</div>${text}${note ? `<p class="rd-note">${esc(note)}</p>` : ''}${hid ? `<div class="note" style="margin:14px 0 0">${ic('eyeOff')} Shield: ${hid} paragraph${hid === 1 ? '' : 's'} hidden</div>` : ''}${btns}</div>`;
}
function openReader(s) {
  const sh = sheet('<div class="body rd-b" data-rd></div>', {
    full: true, cls: 'rd-sh',
    onClick: (act, t, close) => { if (act === 'team') { close(); push('team', { abbr: t.dataset.abbr }); } },
    onClose: () => { if (rd?.sh === sh) rd = null; },
  });
  rd = { s, sh, body: sh.el.querySelector('[data-rd]') };
  paint(rd.body, readerHtml(s));
  if (!s.premium) want(`story:${s.id}`);
}
// The card for a covered story: Keep it hidden, and Reveal (which is the confirm: it names the game), then the story.
function coverSheet(s, g) {
  sheet(`<h3>This story is about a game you haven't seen</h3><p class="tx">${esc(gameName(g))}, ${esc(dayDate(g.date))}. Reveal it to read the story; the result also shows everywhere else in airglow.</p><div class="act2"><button class="ghost" data-act="keep">Keep it hidden</button><button class="pill noicon" data-act="reveal">Reveal</button></div>`, {
    cls: 'nw-cov',
    onClick: (act, t, close) => { close(); if (act === 'reveal') { markSeen(g.id); setTimeout(() => openStory(s), 280); } },
  });
}
export function openStory(s) {
  if (!s) return;
  const g = storyCover(s);
  return g ? coverSheet(s, g) : openReader(s);
}
on('league', (k) => { if (rd && k === `story:${rd.s.id}`) paint(rd.body, readerHtml(rd.s)); });
on('nba', () => { if (rd) paint(rd.body, readerHtml(rd.s)); });
