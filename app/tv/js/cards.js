// Card and hero markup shared by the screens. Class names are the design kit's (design/ui-v1/kit), styled by ui.css.
import { esc, ic, tag, dot, liveP, logo, crest, teamVars, initials, hm, leftText, sized } from './util.js';
import { progressOf } from './state.js';
import { LANG_SHORT, prefLangs } from './catalog.js';
import { nba, show, clockText, isMine, mySide, ordinal, recordFor, behindReplay, liveShown, liveByClock, shielded, replayProgress, watchedOn } from './games.js';
import { tipsIn } from './nba/common.js';
import { heroRow, replaysOf, sourceCaption, nightLabel, videoMask, programmeView } from './catchup.js';
import { catalog } from './catalog.js';
import { posterTag } from './quality.js';

const img = (url, w = 342) => (url ? `<img src="${esc(sized(url, w))}" alt="" decoding="async" loading="lazy">` : '');
const pct = (p) => (p && p.d ? Math.min(100, (p.t / p.d) * 100) : 0);

// 2:3 poster: tag 4K top-left, +N versions (or a language) top-right, resume bar flush; the caption below is the real title.
// mine: an add-on catalog's title the provider has too (design/ui-v1/addons/SPEC.md 4.2): the [tv] mark
export function poster(t, i, { sm = false, mine = false } = {}) {
  const mk = videoMask(t);
  if (mk) return maskedPoster(t, i, mk, sm);
  // the real quality (subtitles SPEC 6.1): filled once a check found it, dashed while only a name says so
  const tl = t.kind === 'movie' || t.kind === 'series' ? posterTag(t) : t._qs?.has('4K') ? tag('4K', 'q') : '';
  const lang = t._lang && !prefLangs().includes(t._lang) ? LANG_SHORT[t._lang] || '' : '';
  const tr = t.versions?.length > 1 ? tag('+' + (t.versions.length - 1)) : lang ? tag(lang) : '';
  const p = t.kind === 'movie' ? progressOf(t.versions?.[0] || t) : null;
  const art = t.poster ? `<div class="art" data-ini="${esc(initials(t.name))}" data-nt="${esc(t.name)}">${img(t.poster)}</div>` : `<div class="noart"><span class="ini">${esc(initials(t.name))}</span><span class="nt clamp3">${esc(t.name)}</span></div>`;
  const meta = [t.year, t._ir ? `★ ${t._ir.toFixed(1)}` : (t._genres?.[0] || '')].filter(Boolean).join(' · ');
  return `<div class="pc fx${sm ? ' sm' : ''}" tabindex="-1" data-i="${i}" data-key="t:${esc(t.kind)}:${esc(t.id)}" data-hold><div class="box">${art}${tl ? `<div class="tl">${tl}</div>` : ''}${tr ? `<div class="tr">${tr}</div>` : ''}${mine ? `<span class="ad-mine">${ic('tv')}</span>` : ''}${p && p.t > 30 && p.t < p.d * 0.94 ? `<div class="prog flush"><i style="width:${pct(p)}%"></i></div>` : ''}</div>
    <div class="cap">${esc(t.name)}</div><div class="cm">${esc(meta)}</div></div>`;
}

// A video under the shield (catch-up 5.8): a hidden game's full game shows the matchup (airglow's name and the teams'
// colours, no rating, no duration); a title that could tell reads "Video naming …" on the neutral tile.
function maskedPoster(t, i, mk, sm) {
  const g = mk.g;
  const art = mk.kind === 'game'
    ? `<div class="noart" style="background:linear-gradient(160deg,${teamColor(g.away)} 0 50%,${teamColor(g.home)} 50% 100%)"><span class="ini" style="display:flex;gap:6px">${crest(g.away, 's32')}${crest(g.home, 's32')}</span><span class="nt clamp3">${esc(mk.title)}</span></div>`
    : `<div class="noart cu-noart">${ic('eyeOff')}<span class="nt clamp3">Name hidden</span></div>`;
  return `<div class="pc fx${sm ? ' sm' : ''}" tabindex="-1" data-i="${i}" data-key="t:${esc(t.kind)}:${esc(t.id)}" data-masked="${mk.kind}" data-hold><div class="box">${art}</div>
    <div class="cap">${esc(mk.title)}</div><div class="cm">${esc(mk.kind === 'game' ? mk.meta : 'Name hidden')}</div></div>`;
}
const teamColor = (t) => (teamVars(t).match(/--tp:([^;]+)/) || [])[1];

// Game card (272 x 124, the NBA hub's grid and Home's Tonight row): text at the top so a peeking row still reads.
export function liveCard(ch, prog, { i, live, pending } = {}) {   // pending: its guide hasn't come yet
  const pg = prog ? Math.max(0, Math.min(100, ((Date.now() - prog.start) / (prog.end - prog.start)) * 100)) : 0;
  // under the shield (catch-up 4.3): a studio show the morning after says it may show results, in place of the channel
  const v = prog ? programmeView(ch, prog) : null;
  const sub = v && (v.studio || v.mask === 'results') ? `<span class="cu-may">${ic('eyeOff')}May show results</span>` : esc(prog ? ch.name : pending ? '' : 'No guide information');
  return `<div class="hc fx" tabindex="-1" data-i="${i}" data-key="ch:${esc(ch.id)}" data-hold><div class="art noimg-bg"></div><div class="hs"></div>
    <div class="tp">${logo(ch.logo, ch.name, 'sm')}${live ? liveP() : ''}<span class="n">${ch.num}</span></div>
    <div class="bt"><b>${esc(v?.title || ch.name)}</b><span>${sub}</span></div>${prog ? `<div class="prog flush"><i style="width:${pg}%"></i></div>` : ''}</div>`;
}
export function contCard(p, i) {
  const it = p.item;
  if (it.kind === 'rp') return replayCard(p, i);
  const mk = it.kind === 'movie' ? videoMask(it) : null;   // (a hidden game's video: airglow's name, no minutes left)
  if (mk) return `<div class="hc fx" tabindex="-1" data-i="${i}" data-key="p:${esc(it.kind)}:${esc(it.id)}" data-hold><div class="art cu-noart"></div><div class="hs"></div><div class="tp"><span class="t-label" style="line-height:22px">${mk.kind === 'game' ? 'NBA · Replay' : 'Film'}</span></div><div class="bt"><b>${esc(mk.title)}</b></div><div class="prog flush"><i style="width:${pct(p)}%"></i></div></div>`;
  const kind = it.kind === 'episode' ? `S${it.season} · E${it.ep}` : 'Film';
  const title = it.kind === 'episode' ? it.seriesName : it._title || it.name;
  const art = it.still || it.poster;
  return `<div class="hc fx" tabindex="-1" data-i="${i}" data-key="p:${esc(it.kind)}:${esc(it.id)}" data-hold><div class="art">${img(art)}</div><div class="hs"></div>
    <div class="tp"><span class="t-label" style="line-height:22px">${esc(kind)}</span><span class="n">${leftText(p.d - p.t)}</span></div>
    <div class="bt"><b>${esc(title)}</b></div><div class="prog flush"><i style="width:${pct(p)}%"></i></div></div>`;
}
// A replay you stopped (catch-up 5.2): a game shows the team colours, its crests and `Stopped in Q3` (never minutes left);
// a programme its channel and where you are. The bar is on the window's scale.
export function replayCard(p, i) {
  const it = p.item;
  if (it.game) {
    const g = it.game, pos = it.pos;
    const where = pos?.chapter ? `Stopped in ${pos.chapter}` : pos?.mins ? `Stopped ${pos.mins >= 60 ? `${Math.floor(pos.mins / 60)} h ${pos.mins % 60} min` : `${pos.mins} min`} in` : 'Started';
    return `<div class="hc fx" tabindex="-1" data-i="${i}" data-key="p:rp:${esc(it.id)}" data-hold><div class="art" style="background:linear-gradient(120deg,${teamColor(g.away)} 0 48%,${teamColor(g.home)} 52% 100%)"></div><div class="hs"></div>
    <div class="tp"><span class="t-label" style="line-height:22px">NBA · Replay</span><span class="cu-crs">${crest({ abbr: g.away.abbr, logo: window.NBA.logoFor(g.away.abbr) }, 's24')}${crest({ abbr: g.home.abbr, logo: window.NBA.logoFor(g.home.abbr) }, 's24')}</span></div>
    <div class="bt"><b>${esc(`${g.away.name} at ${g.home.name}`)}</b><span>${esc(where)}</span></div><div class="prog flush"><i style="width:${pct(p)}%"></i></div></div>`;
  }
  return `<div class="hc fx" tabindex="-1" data-i="${i}" data-key="p:rp:${esc(it.id)}" data-hold><div class="art noimg-bg"></div><div class="hs"></div>
    <div class="tp">${logo(it.logo, it.channel || '', 'sm')}<span class="t-label" style="line-height:22px;margin-left:8px">Replay</span></div>
    <div class="bt"><b>${esc(it.title || it.name)}</b><span>${esc(it.channel || '')}</span></div><div class="prog flush"><i style="width:${pct(p)}%"></i></div></div>`;
}
// 16:9 card (detail "More like this", episodes).
export function wideCard(t, i) {
  const mk = videoMask(t);
  if (mk) return `<div class="wc fx" tabindex="-1" data-i="${i}"><div class="art cu-noart">${ic('eyeOff')}</div><div class="tx"><b>${esc(mk.title)}</b><span>${esc(mk.kind === 'game' ? mk.meta : 'Name hidden')}</span></div></div>`;
  return `<div class="wc fx" tabindex="-1" data-i="${i}"><div class="art">${img(t.poster)}</div><div class="tx"><b>${esc(t.name)}</b><span>${esc([t.year, t._genres?.[0]].filter(Boolean).join(' · '))}</span></div></div>`;
}

// ---------- NBA ----------
// A team's record as you may see it (the shield counts only the finals you've seen, and says so with the eye-off).
export function recText(t) {
  const r = recordFor(t);
  return r.partial ? `<span class="nb-rp">${esc(r.text)}${ic('eyeOff', 'xs')}</span>` : esc(r.text);
}
const edge = (t) => `<span class="tedge" style="background:${teamVarsColor(t)}"></span>`;
const teamVarsColor = (t) => (teamVars(t).match(/--ta:([^;]+)/) || [])[1];
// Game card: upright Soft card, Sharp skewed score plate inside; under the shield the plate shows "hidden".
export function gameCard(g0, i) {
  const v = show(g0), g = v.g;
  let st = '', plate = '';
  // behind in its replay (catch-up 5.3, 7.2): LIVE on the clock and your position, never the live clock
  const behind = shielded(g0) && behindReplay(g0);
  const pos = behind ? replayProgress(g0.id)?.item?.pos : null;
  if (behind) st = `${liveByClock(g0) ? liveP() : ''}<span>You're in ${esc(pos?.chapter || 'the replay')}</span>`;
  else if (g.state === 'in') st = `${liveP()}<span>${esc(clockText(g))}</span>`;
  else if (g.state === 'post') st = v.hidden ? '<span>Ended</span>' : `<span>Final${g.period > 4 ? ' / OT' : ''}</span>`;
  else { const d = Math.round((g.date - Date.now()) / 60000); st = `<span>${d <= 0 ? 'Tip-off' : d >= 60 ? `In ${Math.floor(d / 60)}h ${String(d % 60).padStart(2, '0')}m` : `In ${d} min`}</span>`; }
  const rp = g.state !== 'pre' && replaysOf(g0)?.length;
  const tv = rp ? `<span class="cu-rpl">${ic('hist')}Replay</span>` : `<span class="tvn">${esc(g.tv[0] || '')}</span>`;
  const aw = +g.away.score, hw = +g.home.score;
  const awWin = !v.hidden && g.state === 'post' && aw > hw, hwWin = !v.hidden && g.state === 'post' && hw > aw;
  if (g.state === 'pre') plate = `<span class="plate"><span class="x"><span class="score sm">${hm(g.date)}</span><span class="t-cap">tip-off</span></span></span>`;
  else if (v.hidden || behind) plate = `<span class="plate"><span class="x">${ic('eyeOff')}<span class="t-cap">hidden</span></span></span>`;
  else plate = `<span class="plate"><span class="x"><span class="score md"${g.state === 'post' && !awWin ? ' style="opacity:.7"' : ''}>${esc(g.away.score)}</span><span class="score md"${g.state === 'post' && !hwWin ? ' style="opacity:.7"' : ''}>${esc(g.home.score)}</span></span></span>`;
  const lose = (w) => (g.state === 'post' && !v.hidden && !w ? ' lose' : '');
  const rec = (t) => (v.hidden || behind ? '' : recText(t));   // (a hidden plate drops the records: 5.3)
  return `<div class="gc fx" tabindex="-1" data-i="${i}" data-g="${esc(g0.id)}" data-key="g:${esc(g0.id)}" data-hold><div class="st">${st}${tv}</div>
    <div class="tr${lose(awWin)}${g.away.name.length > 10 ? ' long' : ''}">${edge(g.away)}${crest(g.away)}<span class="nm">${esc(g.away.name)}</span><span class="rc">${rec(g.away)}</span></div>
    <div class="tr${lose(hwWin)}${g.home.name.length > 10 ? ' long' : ''}">${edge(g.home)}${crest(g.home)}<span class="nm">${esc(g.home.name)}</span><span class="rc">${rec(g.home)}</span></div>${plate}
    <div class="pk ellipsis">${esc(g.away.name)} ${g.state === 'pre' || v.hidden ? 'at' : `${esc(g.away.score)} – ${esc(g.home.score)}`} ${esc(g.home.name)}</div></div>`;
}

// The broadcast-graphic hero (Home and the NBA hub): status row, two team plates and the score, buttons, and the slab
// with the game clock (the clock is shown once: when the slab carries it the status row drops it).
export function gameHero(g0, { channel, feeds = 0, top, hub = false, focusPrimary = true, searching = false } = {}) {
  const row = heroRow(g0);
  if (row && !(row.kind === 'live-tipoff' && !channel)) return replayHero(g0, row, { channel, top, hub });
  const v = show(g0), g = v.g;
  const pre = g.state === 'pre', shield = v.hidden, choose = !channel && !pre && g.state !== 'post';
  // more than 3 h before tip-off, or no channel yet: the hub's hero opens the game page (Remind me comes with Reminders).
  // (its primary stays data-act="primary" whatever it says, so focus stays on it when the state changes: hubFar())
  const far = hub && pre && (g.date - Date.now() > 3 * 3600e3 || !channel);
  const post = g.state === 'post';
  const side = (t, right) => `<div class="side${right ? ' r' : ''}" style="${teamVars(t)}">${right ? '' : crest(t, 'lg')}<div${right ? ' style="text-align:right"' : ''}><div class="nm">${esc(t.name)}</div><div class="rc">${recText(t)}</div></div>${right ? crest(t, 'lg') : ''}</div>`;
  const status = pre
    ? `${hub ? '' : '<span class="t-label" style="color:var(--a-pink-text)">Your team</span>'}<span class="t-label t-2">NBA${dot}Tip-off</span>`
    : post ? `<span class="t-label t-2">NBA${dot}${shield ? 'Ended' : 'Final'}</span>`
    : `${liveP()}<span class="t-label t-2">NBA</span>${!shield && v.delayed != null ? `<span class="synced">${ic('clock')}${v.synced != null ? `Synced · ${v.synced} s behind live` : `Delayed ${v.delayed} s (default)`}</span>` : ''}`;
  const score = pre ? '<span class="score md">VS</span>'
    : shield ? `<span class="shield" style="height:44px;padding:0 12px;font-size:16px;gap:8px">${ic('eyeOff')}<span>Score hidden</span></span>`
    : `<span class="score">${esc(g.away.score)}</span><span class="t-3" style="font:700 22px var(--a-font-display)">–</span><span class="score">${esc(g.home.score)}</span>`;
  const primary = far ? 'Game page' : choose ? `${ic('search')}Choose channel` : pre ? `${ic('play')}Watch pre-game` : post ? `${ic('score')}Box score` : `${ic('play')}Watch live`;
  const secondary = far ? null : shield ? ['reveal', 'Reveal score'] : choose ? ['guide', 'Open guide'] : post ? null : pre ? ['box', 'Game page'] : ['box', 'Box score'];
  const leaders = () => { const l = (t) => t.leaders?.find((x) => x.stat === 'PTS'); const a = l(g.away), h = l(g.home); return [a, h].filter(Boolean).map((x) => `<b style="color:var(--a-text-1);font-weight:650">${esc(x.who)}</b> ${esc(x.value)} pts`).join('<br>'); };
  const cap = choose ? (searching ? 'Looking for the channel…' : 'No channel found yet<br>Your pick is remembered')
    : pre ? `${esc(tipsIn(g.date))}${channel || g.tv[0] ? `<br>${esc(channel?.name || g.tv[0])}` : ''}`
    : hub && !shield ? leaders()
    : channel ? `On ${esc(channel.name)}${feeds > 1 ? `<br>Hold OK for ${feeds - 1} more channel${feeds > 2 ? 's' : ''}` : ''}` : '';
  let slab;
  const d = Math.round((g.date - Date.now()) / 60000);
  if (pre) slab = `<div class="slabfill"></div><div class="slabcontent ink"><span class="big">${d > 0 && d < 600 ? `${d} MIN` : hm(g.date)}</span><span class="cap">${nba.stale ? 'Scores unavailable' : `Tip-off ${hm(g.date)}`}</span></div>`;
  else if (post) slab = `<div class="slabfill"></div><div class="slabcontent ink"><span class="big">${shield ? 'END' : 'FINAL'}</span><span class="cap">${shield ? 'Score hidden' : nba.stale ? 'Scores unavailable' : g.period > 4 ? 'After overtime' : 'Full time'}</span></div>`;
  else { const c = /half/i.test(g.detail) ? ['HALF', ''] : shield && g.period > 4 ? ['LIVE', ''] : [ordinal(g.period), g.clock]; slab = `<div class="slabfill"></div><div class="slabcontent ink"><span class="big">${esc(c[0])}</span>${c[1] ? `<span class="big">${esc(c[1])}</span>` : ''}<span class="cap">${shield ? 'Score hidden' : nba.stale ? 'Scores unavailable' : choose ? 'Game clock' : v.synced != null ? 'Live · synced' : 'Live'}</span></div>`; }
  return `<div class="hero-plate"${top ? ` style="top:${top}px"` : ''}>
  <div class="abs row-flex" style="left:24px;top:12px;gap:12px;height:24px">${hub ? '<span class="t-label" style="color:var(--a-pink-text)">Your team</span>' : ''}${status}</div>
  <div class="mt">${side(g.away)}<div class="sc">${score}</div>${side(g.home, 1)}</div>
  <div class="abs row-flex hero-btns" data-row style="left:24px;top:132px;gap:20px;width:572px"><span class="btn fx" tabindex="-1" data-act="primary"${channel && !pre ? ' data-hold' : ''}>${primary}</span>${secondary ? `<span class="btn2 fx" tabindex="-1" data-act="${secondary[0]}">${secondary[1]}</span>` : ''}${hub && !shield && !pre ? '<span class="btn2 fx" tabindex="-1" data-act="plays">Plays</span>' : ''}<span class="t-cap clamp2" style="margin-left:4px;line-height:18px;flex:1;min-width:0">${cap}</span></div>
  <div class="slabbox" style="left:619px;width:243px">${slab}</div>
</div>`;
}

// The hero state table's catch-up rows (catch-up 5.1). The primary keeps data-act="primary" whatever it says, so focus
// stays on it when the row changes; the others: tipoff (From tip-off), golive (Back to live), game (Game page),
// again (Watch again), reveal, box. Every watch button carries data-hold (hold OK: the sources sheet).
export function replayHero(g0, row, { channel, top, hub = false } = {}) {
  const v = show(g0), g = v.g, shield = v.hidden || (shielded(g0) && behindReplay(g0));
  const side = (t, right) => `<div class="side${right ? ' r' : ''}" style="${teamVars(t)}">${right ? '' : crest(t, 'lg')}<div${right ? ' style="text-align:right"' : ''}><div class="nm">${esc(t.name)}</div><div class="rc">${recText(t)}</div></div>${right ? crest(t, 'lg') : ''}</div>`;
  const mine = isMine(g0) ? '<span class="t-label" style="color:var(--a-pink-text)">Your team</span>' : '';
  const wo = watchedOn(g0.id) && catalog.live?.byId.get(watchedOn(g0.id))?.name;
  // live: the channel it's on now; behind: the one you watched it on; otherwise the replay's
  const chName = (row.kind === 'live-tipoff' ? channel?.name : row.kind === 'behind' ? wo : '') || (row.src?.kind === 'channel' ? row.src.name : '') || channel?.name || wo || '';
  const day = `<span class="t-label t-2">NBA${dot}${esc(nightLabel(g0.date))}</span>`;
  const k = row.kind;
  let status, btns, cap = '', big, small;
  const pos = row.pos;
  const posBig = pos?.chapter ? [pos.chapter === 'Halftime' ? 'HALF' : pos.chapter, pos.clock || ''] : pos?.mins != null ? [`${pos.mins} MIN`, ''] : ['REPLAY', ''];
  if (k === 'live-tipoff') {
    status = `${hub ? mine : ''}${liveP()}<span class="t-label t-2">NBA${chName ? `${dot}${esc(chName)}` : ''}</span>`;
    btns = [['primary', `${ic('play')}Watch live`, true], ['tipoff', `${ic('tipoff')}From tip-off`, true], shield ? ['reveal', 'Reveal score'] : ['box', 'Box score']];
    if (shield) { big = ['ON NOW', '']; small = 'Score hidden'; }
    else { const c = /half/i.test(g.detail) ? ['HALF', ''] : [ordinal(g.period), g.clock]; big = c; small = v.synced != null ? 'Live · synced' : 'Live'; }
  } else if (k === 'behind') {
    status = `${mine}${liveByClock(g0) ? liveP() : ''}<span class="t-label t-2">NBA${chName ? `${dot}${esc(chName)}` : ''}</span>`;
    btns = [['primary', `${ic('play')}Resume`, true], ['golive', 'Back to live'], ['game', 'Game page']];
    big = posBig; small = 'You stopped here';
  } else if (k === 'resume') {
    status = `${mine}${day}`;
    btns = [['primary', `${ic('play')}Resume`, true], ['tipoff', `${ic('tipoff')}From tip-off`, true], ['game', 'Game page']];
    big = posBig; small = 'You stopped here';
  } else if (k === 'morning') {
    status = `${mine}${day}`;
    btns = [['primary', `${ic('play')}Watch from tip-off`, true], ['game', 'Game page']];
    cap = sourceCaption(row.src);
    big = ['REPLAY', '']; small = 'Score hidden';
  } else if (k === 'looking') {
    status = `${mine}${day}`;
    btns = row.busy ? [['primary', 'Game page']] : [['primary', 'Game page'], ['pickch', `${ic('live')}Pick the channel`]];   // (none found: he can say which channel showed it)
    cap = row.busy ? 'Looking for a replay…' : 'No replay found<br>airglow keeps looking';
    big = ['END', '']; small = 'Score hidden';
  } else {   // seen
    const me = isMine(g0) ? mySide(g) : null, op = me ? (me === g.home ? g.away : g.home) : null;
    status = `${mine}<span class="t-label t-2">NBA${dot}Final${dot}${esc(nightLabel(g0.date))}</span>`;
    btns = [['primary', `${ic('score')}Box score`], ['again', `${ic('play')}Watch again`, true]];
    cap = me ? `Final${dot}${+me.score > +op.score ? 'W' : 'L'} ${esc(me.score)}–${esc(op.score)}` : `Final${dot}${esc(g.away.score)}–${esc(g.home.score)}`;
    big = ['FINAL', '']; small = g.period > 4 ? 'After overtime' : 'Full time';
  }
  const score = shield || k === 'behind' ? `<span class="shield" style="height:44px;padding:0 12px;font-size:16px;gap:8px">${ic('eyeOff')}<span>Score hidden</span></span>`
    : `<span class="score">${esc(g.away.score)}</span><span class="t-3" style="font:700 22px var(--a-font-display)">–</span><span class="score">${esc(g.home.score)}</span>`;
  const slab = `<div class="slabfill"></div><div class="slabcontent ink"><span class="big">${esc(big[0])}</span>${big[1] ? `<span class="big">${esc(big[1])}</span>` : ''}<span class="cap">${esc(small)}</span></div>`;
  const b = btns.map(([act, label, hold], i) => `<span class="${i ? 'btn2' : 'btn'} fx" tabindex="-1" data-act="${act}"${hold ? ' data-hold' : ''}>${label}</span>`).join('');
  return `<div class="hero-plate" data-row-kind="${k}"${top ? ` style="top:${top}px"` : ''}>
  <div class="abs row-flex" style="left:24px;top:12px;gap:12px;height:24px">${hub && k !== 'live-tipoff' ? '' : ''}${status}</div>
  <div class="mt">${side(g.away)}<div class="sc">${score}</div>${side(g.home, 1)}</div>
  <div class="abs row-flex hero-btns" data-row style="left:24px;top:132px;gap:20px;width:572px">${b}${cap ? `<span class="t-cap clamp2" style="margin-left:4px;line-height:18px;flex:1;min-width:0">${cap}</span>` : ''}</div>
  <div class="slabbox" style="left:619px;width:243px">${slab}</div>
</div>`;
}

// The resume hero (no game): the title's art in the plate, Resume focused.
export function resumeHero(p) {
  const it = p.item;
  const title = it.kind === 'episode' ? it.seriesName : it._title || it.name;
  const rp = it.kind === 'rp', where = rp ? (it.pos?.chapter ? `Stopped in ${it.pos.chapter}` : 'Started') : '';
  const meta = rp ? (it.game ? 'NBA · Replay' : `${it.channel || ''} · Replay`) : it.kind === 'episode' ? `S${it.season} · E${it.ep}` : it.year || 'Film';
  return `<div class="hero-plate"><div class="hero-art"><div class="art">${img(it.still || it.poster, 780)}</div><div class="abs" style="inset:0;background:linear-gradient(90deg,var(--a-surface-1),rgba(45,43,53,.15) 70%)"></div></div>
  <div class="abs t-label" style="left:24px;top:18px">Continue watching</div>
  <div class="abs" style="left:24px;top:40px;width:460px"><div class="t-head ellipsis" style="font-size:30px;line-height:34px">${esc(title)}</div>
   <div class="metaline" style="margin-top:4px;font-size:16px">${esc(meta)}${dot}${rp ? esc(where) : leftText(p.d - p.t)}</div>
   <div class="prog" style="width:300px;margin-top:10px"><i style="width:${pct(p)}%"></i></div></div>
  <div class="abs row-flex hero-btns" data-row style="left:24px;top:132px;gap:20px"><span class="btn fx" tabindex="-1" data-act="resume">${ic('play')}Resume</span><span class="btn2 fx" tabindex="-1" data-act="restart">${rp && it.game ? 'From tip-off' : 'Start over'}</span><span class="btn2 fx" tabindex="-1" data-act="details">${rp && it.game ? 'Game page' : 'Details'}</span></div>
</div>`;
}
// The last-channel hero (no game, nothing to resume).
export function channelHero(ch, prog) {
  return `<div class="hero-plate">
  <div class="abs t-label" style="left:24px;top:18px">Last channel</div>
  <div class="abs row-flex" style="left:24px;top:44px;gap:16px">${logo(ch.logo, ch.name, 'lg')}<div><div class="t-head ellipsis" style="width:560px">${esc((prog && programmeView(ch, prog).title) || ch.name)}</div><div class="metaline" style="margin-top:4px;width:560px;white-space:nowrap"><span class="ellipsis" style="min-width:0">${esc(ch.name)}</span>${prog ? `${dot}<span style="flex:none">${hm(prog.start)} to ${hm(prog.end)}</span>` : ''}</div></div></div>
  <div class="abs row-flex hero-btns" data-row style="left:24px;top:132px;gap:20px"><span class="btn fx" tabindex="-1" data-act="tune">${ic('play')}Watch</span><span class="btn2 fx" tabindex="-1" data-act="guide">Open guide</span></div>
</div>`;
}
export { isMine, mySide };
