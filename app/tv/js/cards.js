// Card and hero markup shared by the screens. Class names are the design kit's (design/ui-v1/kit), styled by ui.css.
import { esc, ic, tag, dot, liveP, logo, crest, teamVars, initials, hm, leftText, sized } from './util.js';
import { progressOf } from './state.js';
import { LANG_SHORT, prefLangs } from './catalog.js';
import { nba, show, clockText, isMine, mySide, ordinal } from './games.js';

const img = (url, w = 342) => (url ? `<img src="${esc(sized(url, w))}" alt="" decoding="async" loading="lazy">` : '');
const pct = (p) => (p && p.d ? Math.min(100, (p.t / p.d) * 100) : 0);

// 2:3 poster: tag 4K top-left, +N versions (or a language) top-right, resume bar flush; the caption below is the real title.
export function poster(t, i, { sm = false } = {}) {
  const tl = t._qs?.has('4K') ? tag('4K', 'q') : '';
  const lang = t._lang && !prefLangs().includes(t._lang) ? LANG_SHORT[t._lang] || '' : '';
  const tr = t.versions?.length > 1 ? tag('+' + (t.versions.length - 1)) : lang ? tag(lang) : '';
  const p = t.kind === 'movie' ? progressOf(t.versions?.[0] || t) : null;
  const art = t.poster ? `<div class="art" data-ini="${esc(initials(t.name))}" data-nt="${esc(t.name)}">${img(t.poster)}</div>` : `<div class="noart"><span class="ini">${esc(initials(t.name))}</span><span class="nt clamp3">${esc(t.name)}</span></div>`;
  const meta = [t.year, t._ir ? `★ ${t._ir.toFixed(1)}` : (t._genres?.[0] || '')].filter(Boolean).join(' · ');
  return `<div class="pc fx${sm ? ' sm' : ''}" tabindex="-1" data-i="${i}" data-key="t:${esc(t.kind)}:${esc(t.id)}" data-hold><div class="box">${art}${tl ? `<div class="tl">${tl}</div>` : ''}${tr ? `<div class="tr">${tr}</div>` : ''}${p && p.t > 30 && p.t < p.d * 0.94 ? `<div class="prog flush"><i style="width:${pct(p)}%"></i></div>` : ''}</div>
    <div class="cap">${esc(t.name)}</div><div class="cm">${esc(meta)}</div></div>`;
}

// Game card (272 x 124, the NBA hub's grid and Home's Tonight row): text at the top so a peeking row still reads.
export function liveCard(ch, prog, { i, live, pending } = {}) {   // pending: its guide hasn't come yet
  const pg = prog ? Math.max(0, Math.min(100, ((Date.now() - prog.start) / (prog.end - prog.start)) * 100)) : 0;
  return `<div class="hc fx" tabindex="-1" data-i="${i}" data-key="ch:${esc(ch.id)}" data-hold><div class="art noimg-bg"></div><div class="hs"></div>
    <div class="tp">${logo(ch.logo, ch.name, 'sm')}${live ? liveP() : ''}<span class="n">${ch.num}</span></div>
    <div class="bt"><b>${esc(prog?.title || ch.name)}</b><span>${esc(prog ? ch.name : pending ? '' : 'No guide information')}</span></div>${prog ? `<div class="prog flush"><i style="width:${pg}%"></i></div>` : ''}</div>`;
}
export function contCard(p, i) {
  const it = p.item;
  const kind = it.kind === 'episode' ? `S${it.season} · E${it.ep}` : 'Film';
  const title = it.kind === 'episode' ? it.seriesName : it._title || it.name;
  const art = it.still || it.poster;
  return `<div class="hc fx" tabindex="-1" data-i="${i}" data-key="p:${esc(it.kind)}:${esc(it.id)}" data-hold><div class="art">${img(art)}</div><div class="hs"></div>
    <div class="tp"><span class="t-label" style="line-height:22px">${esc(kind)}</span><span class="n">${leftText(p.d - p.t)}</span></div>
    <div class="bt"><b>${esc(title)}</b></div><div class="prog flush"><i style="width:${pct(p)}%"></i></div></div>`;
}
// 16:9 card (detail "More like this", episodes).
export function wideCard(t, i) {
  return `<div class="wc fx" tabindex="-1" data-i="${i}"><div class="art">${img(t.poster)}</div><div class="tx"><b>${esc(t.name)}</b><span>${esc([t.year, t._genres?.[0]].filter(Boolean).join(' · '))}</span></div></div>`;
}

// ---------- NBA ----------
const edge = (t) => `<span class="tedge" style="background:${teamVarsColor(t)}"></span>`;
const teamVarsColor = (t) => (teamVars(t).match(/--ta:([^;]+)/) || [])[1];
// Game card: upright Soft card, Sharp skewed score plate inside; under the shield the plate shows "hidden".
export function gameCard(g0, i) {
  const v = show(g0), g = v.g;
  let st = '', plate = '';
  if (g.state === 'in') st = `${liveP()}<span>${esc(clockText(g))}</span>`;
  else if (g.state === 'post') st = v.hidden ? '<span>Ended</span>' : `<span>Final${g.period > 4 ? ' / OT' : ''}</span>`;
  else { const d = Math.round((g.date - Date.now()) / 60000); st = `<span>${d <= 0 ? 'Tip-off' : d >= 60 ? `In ${Math.floor(d / 60)}h ${String(d % 60).padStart(2, '0')}m` : `In ${d} min`}</span>`; }
  const tv = `<span class="tvn">${esc(g.tv[0] || '')}</span>`;
  const aw = +g.away.score, hw = +g.home.score;
  const awWin = !v.hidden && g.state === 'post' && aw > hw, hwWin = !v.hidden && g.state === 'post' && hw > aw;
  if (g.state === 'pre') plate = `<span class="plate"><span class="x"><span class="score sm">${hm(g.date)}</span><span class="t-cap">tip-off</span></span></span>`;
  else if (v.hidden) plate = `<span class="plate"><span class="x">${ic('eyeOff')}<span class="t-cap">hidden</span></span></span>`;
  else plate = `<span class="plate"><span class="x"><span class="score md"${g.state === 'post' && !awWin ? ' style="opacity:.7"' : ''}>${esc(g.away.score)}</span><span class="score md"${g.state === 'post' && !hwWin ? ' style="opacity:.7"' : ''}>${esc(g.home.score)}</span></span></span>`;
  const lose = (w) => (g.state === 'post' && !v.hidden && !w ? ' lose' : '');
  const rec = (t) => (v.hidden ? '' : esc(t.record));
  return `<div class="gc fx" tabindex="-1" data-i="${i}" data-g="${esc(g0.id)}" data-key="g:${esc(g0.id)}"><div class="st">${st}${tv}</div>
    <div class="tr${lose(awWin)}${g.away.name.length > 10 ? ' long' : ''}">${edge(g.away)}${crest(g.away)}<span class="nm">${esc(g.away.name)}</span><span class="rc">${rec(g.away)}</span></div>
    <div class="tr${lose(hwWin)}${g.home.name.length > 10 ? ' long' : ''}">${edge(g.home)}${crest(g.home)}<span class="nm">${esc(g.home.name)}</span><span class="rc">${rec(g.home)}</span></div>${plate}
    <div class="pk ellipsis">${esc(g.away.name)} ${g.state === 'pre' || v.hidden ? 'at' : `${esc(g.away.score)} – ${esc(g.home.score)}`} ${esc(g.home.name)}</div></div>`;
}

// The broadcast-graphic hero (Home and the NBA hub): status row, two team plates and the score, buttons, and the slab
// with the game clock (the clock is shown once: when the slab carries it the status row drops it).
export function gameHero(g0, { channel, feeds = 0, top, hub = false, focusPrimary = true, searching = false } = {}) {
  const v = show(g0), g = v.g;
  const pre = g.state === 'pre', shield = v.hidden, choose = !channel && !pre && g.state !== 'post';
  const post = g.state === 'post';
  const side = (t, right) => `<div class="side${right ? ' r' : ''}" style="${teamVars(t)}">${right ? '' : crest(t, 'lg')}<div${right ? ' style="text-align:right"' : ''}><div class="nm">${esc(t.name)}</div><div class="rc">${shield ? '' : esc(t.record)}</div></div>${right ? crest(t, 'lg') : ''}</div>`;
  const status = pre
    ? `${hub ? '' : '<span class="t-label" style="color:var(--a-pink-text)">Your team</span>'}<span class="t-label t-2">NBA${dot}Tip-off</span>`
    : post ? `<span class="t-label t-2">NBA${dot}${shield ? 'Ended' : 'Final'}</span>`
    : `${liveP()}<span class="t-label t-2">NBA</span>${!shield && v.delayed != null ? `<span class="synced">${ic('clock')}${v.synced != null ? `Synced · ${v.synced} s behind live` : `Delayed ${v.delayed} s (default)`}</span>` : ''}`;
  const score = pre ? '<span class="score md">VS</span>'
    : shield ? `<span class="shield" style="height:44px;padding:0 12px;font-size:16px;gap:8px">${ic('eyeOff')}<span>Score hidden</span></span>`
    : `<span class="score">${esc(g.away.score)}</span><span class="t-3" style="font:700 22px var(--a-font-display)">–</span><span class="score">${esc(g.home.score)}</span>`;
  const primary = choose ? `${ic('search')}Choose channel` : pre ? `${ic('play')}Watch pre-game` : post ? `${ic('score')}Box score` : `${ic('play')}Watch live`;
  const secondary = shield ? ['reveal', 'Reveal score'] : choose ? ['guide', 'Open guide'] : post ? null : ['box', 'Box score'];
  const leaders = () => { const l = (t) => t.leaders?.find((x) => x.stat === 'PTS'); const a = l(g.away), h = l(g.home); return [a, h].filter(Boolean).map((x) => `<b style="color:var(--a-text-1);font-weight:650">${esc(x.who)}</b> ${esc(x.value)} pts`).join('<br>'); };
  const cap = choose ? (searching ? 'Looking for the channel…' : 'No channel found yet<br>Your pick is remembered')
    : hub && !shield && !pre ? leaders()
    : channel ? `On ${esc(channel.name)}${feeds > 1 ? `<br>Hold OK for ${feeds - 1} more channel${feeds > 2 ? 's' : ''}` : ''}` : '';
  let slab;
  const d = Math.round((g.date - Date.now()) / 60000);
  if (pre) slab = `<div class="slabfill"></div><div class="slabcontent ink"><span class="big">${d > 0 && d < 600 ? `${d} MIN` : hm(g.date)}</span><span class="cap">${nba.stale ? 'Scores unavailable' : `Tip-off ${hm(g.date)}`}</span></div>`;
  else if (post) slab = `<div class="slabfill"></div><div class="slabcontent ink"><span class="big">${shield ? 'END' : 'FINAL'}</span><span class="cap">${shield ? 'Score hidden' : nba.stale ? 'Scores unavailable' : g.period > 4 ? 'After overtime' : 'Full time'}</span></div>`;
  else { const c = /half/i.test(g.detail) ? ['HALF', ''] : [ordinal(g.period), g.clock]; slab = `<div class="slabfill"></div><div class="slabcontent ink"><span class="big">${esc(c[0])}</span>${c[1] ? `<span class="big">${esc(c[1])}</span>` : ''}<span class="cap">${shield ? 'Score hidden' : nba.stale ? 'Scores unavailable' : choose ? 'Game clock' : v.synced != null ? 'Live · synced' : 'Live'}</span></div>`; }
  return `<div class="hero-plate"${top ? ` style="top:${top}px"` : ''}>
  <div class="abs row-flex" style="left:24px;top:12px;gap:12px;height:24px">${hub ? '<span class="t-label" style="color:var(--a-pink-text)">Your team</span>' : ''}${status}</div>
  <div class="mt">${side(g.away)}<div class="sc">${score}</div>${side(g.home, 1)}</div>
  <div class="abs row-flex hero-btns" data-row style="left:24px;top:132px;gap:16px;width:572px"><span class="btn fx" tabindex="-1" data-act="primary"${channel && !pre ? ' data-hold' : ''}>${primary}</span>${secondary ? `<span class="btn2 fx" tabindex="-1" data-act="${secondary[0]}">${secondary[1]}</span>` : ''}${hub && !shield && !pre ? '<span class="btn2 fx" tabindex="-1" data-act="plays">Plays</span>' : ''}<span class="t-cap clamp2" style="margin-left:4px;line-height:18px;flex:1;min-width:0">${cap}</span></div>
  <div class="slabbox" style="left:619px;width:243px">${slab}</div>
</div>`;
}

// The resume hero (no game): the title's art in the plate, Resume focused.
export function resumeHero(p) {
  const it = p.item;
  const title = it.kind === 'episode' ? it.seriesName : it._title || it.name;
  const meta = it.kind === 'episode' ? `S${it.season} · E${it.ep}` : it.year || 'Film';
  return `<div class="hero-plate"><div class="hero-art"><div class="art">${img(it.still || it.poster, 780)}</div><div class="abs" style="inset:0;background:linear-gradient(90deg,var(--a-surface-1),rgba(45,43,53,.15) 70%)"></div></div>
  <div class="abs t-label" style="left:24px;top:18px">Continue watching</div>
  <div class="abs" style="left:24px;top:40px;width:460px"><div class="t-head ellipsis" style="font-size:30px;line-height:34px">${esc(title)}</div>
   <div class="metaline" style="margin-top:4px;font-size:16px">${esc(meta)}${dot}${leftText(p.d - p.t)}</div>
   <div class="prog" style="width:300px;margin-top:10px"><i style="width:${pct(p)}%"></i></div></div>
  <div class="abs row-flex hero-btns" data-row style="left:24px;top:132px;gap:16px"><span class="btn fx" tabindex="-1" data-act="resume">${ic('play')}Resume</span><span class="btn2 fx" tabindex="-1" data-act="restart">Start over</span><span class="btn2 fx" tabindex="-1" data-act="details">Details</span></div>
</div>`;
}
// The last-channel hero (no game, nothing to resume).
export function channelHero(ch, prog) {
  return `<div class="hero-plate">
  <div class="abs t-label" style="left:24px;top:18px">Last channel</div>
  <div class="abs row-flex" style="left:24px;top:44px;gap:16px">${logo(ch.logo, ch.name, 'lg')}<div><div class="t-head ellipsis" style="width:560px">${esc(prog?.title || ch.name)}</div><div class="metaline" style="margin-top:4px;width:560px;white-space:nowrap"><span class="ellipsis" style="min-width:0">${esc(ch.name)}</span>${prog ? `${dot}<span style="flex:none">${hm(prog.start)} to ${hm(prog.end)}</span>` : ''}</div></div></div>
  <div class="abs row-flex hero-btns" data-row style="left:24px;top:132px;gap:16px"><span class="btn fx" tabindex="-1" data-act="tune">${ic('play')}Watch</span><span class="btn2 fx" tabindex="-1" data-act="guide">Open guide</span></div>
</div>`;
}
export { isMine, mySide };
