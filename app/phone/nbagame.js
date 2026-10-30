// The game page (pushed; the TV's screens/game.js, phone SPEC 3.3): the header (status, the two teams with their
// records, the score or `Score hidden`), the watch buttons (Watch live, From tip-off, Resume, Back to live, Watch again)
// and four tabs: Summary (top performers, team stats side by side, the teams' pages), Box score (each team, starters
// first, totals, who didn't play), Plays, Replays (the sources from tip-off, Pick the channel, Choose a video, Look
// again). Under the shield the Summary, Box score and Plays are the TV's shield cards (Resume / Watch from tip-off /
// No replay yet…) and Reveal asks first. Every score goes through games.js show().
import { hm } from '../tv/js/util.js';
import { on, S, store, scoped } from '../tv/js/state.js';
import { catalog, ensure } from '../tv/js/catalog.js';
import { nba, gameById, show, clockText, ordinal, wantSummary, summaryOf, holdGame, bestChannel, findFeeds, favTeam, recordFor, shielded, behindReplay, liveByClock, replayProgress, replayPick, setReplayPick, isSeen, watchedOn, shieldMode } from '../tv/js/games.js';
import { findReplays, replaysOf, replaysLooked, replaysBusy, keptUntil, nightLabel, keptFor, keptWords, videosNaming, videoMask, matchVideo } from '../tv/js/catchup.js';
import { watchFromTipoff, resumeGame, lookAgain, playVideoFor } from '../tv/js/replay.js';
import { playLive } from '../tv/js/player.js';
import { toast } from '../tv/js/ui.js';
import { tipsIn, gameName } from '../tv/js/nba/common.js';
import { esc, ic, push, back, isShown, menu, confirm, longPress } from './ui.js';
import { recText, dayWord } from './cards.js';
import { crest, revealIds, onReveal, paint } from './nbakit.js';
import { ringFor } from './home.js';

const { NBA } = window;
const tune = (ch) => playLive(ch, ringFor(ch), 'All channels');
const team = (t) => ({ ...t, logo: t.logo || NBA.logoFor(t.abbr) });
const STATS = [['fieldGoalPct', 'Field goal %'], ['threePointFieldGoalPct', '3-point %'], ['freeThrowPct', 'Free throw %'], ['totalRebounds', 'Rebounds'], ['assists', 'Assists'], ['totalTurnovers', 'Turnovers'], ['steals', 'Steals'], ['blocks', 'Blocks'], ['pointsInPaint', 'Points in the paint'], ['fastBreakPoints', 'Fast-break points'], ['largestLead', 'Largest lead']];
const COLS = ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', '+/-'];
const TABS = [['sum', 'Summary'], ['box', 'Box score'], ['plays', 'Plays'], ['replays', 'Replays']];

let gEl = null, gId = null, gTab = 'sum', gSide = 'away';
const none = (g, s, what) => `<div class="note gm-none">${g.state === 'pre' ? `The ${what.toLowerCase()} ${/s$/.test(what) ? 'appear' : 'appears'} at tip-off.` : !s && nba.sumFail?.has?.(g.id) ? `ESPN didn't send the ${what.toLowerCase()} for this game. Trying again.` : !s ? `Loading the ${what.toLowerCase()}…` : g.state === 'in' ? `ESPN hasn't sent the ${what.toLowerCase()} yet. It fills in as the game goes.` : `No ${what.toLowerCase()} from ESPN for this game.`}</div>`;
const teamBtn = (t) => `<button class="ghost sm" data-gact="team" data-abbr="${esc(t.abbr)}">${crest(team(t), 22)}<span class="ellipsis">${esc(t.name)} page</span>${ic('chevR')}</button>`;

// ---------- the tabs ----------
function summaryHtml(g, s) {
  const teamsRow = `<div class="nb-act nbz" style="margin:16px 16px 0">${teamBtn(g.away)}${teamBtn(g.home)}</div>`;
  if (g.state === 'pre') {
    const ch = bestChannel(gameById(gId) || g);
    return `<div class="cover"><div class="h">${ic('clock')}<span>${esc(tipsIn(g.date))}</span></div><p>${esc(dayWord(g.date))} · ${hm(g.date)}${ch ? ` · on ${esc(ch.name)}` : g.tv?.[0] ? ` · ${esc(g.tv[0])}` : ''}. The box score, plays and team stats fill in from tip-off.</p></div>${teamsRow}`;
  }
  if (!s) return `${none(g, s, 'Summary')}${teamsRow}`;
  // top performers: each team's leader in points, rebounds and assists
  const lead = (b) => {
    if (!b) return '';
    const best = (k) => { const i = b.labels.indexOf(k); if (i < 0) return null; let top = null; for (const p of b.players) { if (p.dnp) continue; const v = parseFloat(p.stats[i]) || 0; if (!top || v > top.v) top = { p, v }; } return top; };
    return ['PTS', 'REB', 'AST'].map((k) => { const t = best(k); return t ? `<div class="gm-tp nbz"><span class="k">${k}</span><span class="nm ellipsis">${esc(t.p.short || t.p.name)}</span><b>${t.v}</b></div>` : ''; }).join('');
  };
  const ba = s.box.find((b) => b.abbr === g.away.abbr), bh = s.box.find((b) => b.abbr === g.home.abbr);
  const perf = ba || bh ? `<div class="sec-h" style="margin-top:20px">Top performers</div><div class="gm-tps nbz"><div class="col">${crest(team(g.away), 26)}${lead(ba)}</div><div class="col">${crest(team(g.home), 26)}${lead(bh)}</div></div>` : '';
  const a = s.teams.find((t) => t.abbr === g.away.abbr)?.stats, h = s.teams.find((t) => t.abbr === g.home.abbr)?.stats;
  const mineAway = g.away.abbr === favTeam();
  const ts = a && h ? `<div class="sec-h" style="margin-top:22px">Team stats</div><div class="gm-ts">${STATS.filter(([k]) => a[k] != null).map(([k, n]) => {
    const av = parseFloat(a[k]) || 0, hv = parseFloat(h[k]) || 0, sum = av + hv || 1;
    return `<div class="r nbz"><span class="v">${esc(a[k])}</span><span class="n ellipsis">${n}</span><span class="v r2">${esc(h[k])}</span><div class="bars nbz"><i class="${mineAway ? 'me' : ''}" style="width:${((av / sum) * 100).toFixed(1)}%"></i><i class="${mineAway ? '' : 'me'}" style="width:${((hv / sum) * 100).toFixed(1)}%"></i></div></div>`;
  }).join('')}</div>` : none(g, s, 'Team stats');
  return `${perf}${ts}${teamsRow}`;
}
function boxHtml(g, s) {
  const side = gSide === 'home' ? g.home : g.away;
  const seg = `<div class="lb-seg gm-seg"><button class="${gSide === 'away' ? 'sel' : ''}" data-gside="away">${esc(g.away.name)}</button><button class="${gSide === 'home' ? 'sel' : ''}" data-gside="home">${esc(g.home.name)}</button></div>`;
  const b = s?.box.find((x) => x.abbr === side.abbr);
  if (!b || !b.players.length) return `${seg}${none(g, s, 'Box score')}`;
  const idx = COLS.map((c) => b.labels.indexOf(c));
  const played = b.players.filter((p) => !p.dnp), out = b.players.filter((p) => p.dnp);
  const rows = played.map((p) => `<tr class="${p.starter ? 'st' : ''}"><td><span class="pc"><span class="nm">${esc(p.short || p.name)}</span><small>${esc(p.pos)}${p.starter ? ' · starter' : ''}</small></span></td>${idx.map((i, k) => `<td${COLS[k] === 'PTS' ? ' class="b"' : ''}>${i >= 0 ? esc(p.stats[i] ?? '') : ''}</td>`).join('')}</tr>`).join('');
  const tot = b.totals.length ? `<tr class="tot"><td>Team</td>${idx.map((i, k) => `<td${COLS[k] === 'PTS' ? ' class="b"' : ''}>${i >= 0 ? esc(b.totals[i] ?? '') : ''}</td>`).join('')}</tr>` : '';
  const dnp = out.length ? `<div class="note">Didn’t play: ${out.map((p) => `${esc(p.short || p.name)}${p.reason ? ` (${esc(p.reason.toLowerCase())})` : ''}`).join(', ')}</div>` : '';
  return `${seg}<div class="tbl gm-box" data-x="box:${esc(side.abbr)}"><table class="box-t ro"><thead><tr><th>Player</th>${COLS.map((c) => `<th>${c === '3PT' ? '3P' : c}</th>`).join('')}</tr></thead><tbody>${rows}${tot}</tbody></table></div>${dnp}<div class="nb-act nbz" style="margin:14px 16px 0">${teamBtn(side)}</div>`;
}
function playsHtml(g, s) {
  if (!s?.plays.length) return none(g, s, 'Plays');
  return `<div class="play-l gm-plays">${s.plays.slice(0, 60).map((p) => `<div class="${p.scoring ? 'sc' : ''} nbz"><b>${esc(ordinal(p.period))} ${esc(p.clock)}</b>${p.team ? crest(p.team, 20) : '<span class="nocr"></span>'}<span class="tx">${esc(p.text)}</span>${p.scoring ? `<span class="sco">${esc(p.away)}–${esc(p.home)}</span>` : ''}</div>`).join('')}</div>`;
}
function replaysHtml(g0, g, v) {
  if (g.state === 'pre') return '<div class="note gm-none">Replays show from tip-off: airglow looks in your provider’s channel archives and videos.</div>';
  const reps = replaysOf(g0), pick = replayPick(g0.id), lk = replaysLooked(g0), busy = replaysBusy(g0);
  const rows = (reps || []).map((x, i) => `<button class="lv-row gm-src nbz" data-src="${i}"><span class="ico">${ic(x.kind === 'channel' ? 'hist' : 'film')}</span><span class="col"><b class="ellipsis">${esc(x.name)}</b><small class="ellipsis">${esc(x.detail || '')}${x.kind === 'channel' && x.windowStart ? ` · until ${esc(keptUntil(x.windowStart, x.days))}` : ''}</small></span>${x.best ? '<span class="tag">Best</span>' : pick && pick.kind === x.kind && pick.id === x.id ? '<span class="tag">Your pick</span>' : ''}</button>`).join('');
  const head = reps == null || busy ? `<div class="note">${ic('refresh')} Looking for a replay…</div>` : !reps.length ? `<div class="cover"><div class="h">${ic('hist')}<span>No replay of this game yet</span></div><p>Full games often reach Movies a few hours after the final. ${Date.now() < g0.date + 3 * 864e5 ? 'airglow keeps looking every hour.' : 'Look again when one may have arrived.'}</p></div>` : `<div class="note">From tip-off · ${esc(nightLabel(g0.date))}${v.hidden ? ' · the end stays hidden until you reach it' : ''}</div>`;
  return `${head}<div class="gm-srcs">${rows}
    <button class="lv-row gm-src nbz" data-gact="pickch"><span class="ico">${ic('live')}</span><span class="col"><b>Pick the channel…</b><small>The channel that showed it, from its replays</small></span></button>
    <button class="lv-row gm-src nbz" data-gact="choose"><span class="ico">${ic('search')}</span><span class="col"><b>Choose a video…</b><small>Every video naming either team</small></span></button>
    <button class="lv-row gm-src nbz" data-gact="look"><span class="ico">${ic('refresh')}</span><span class="col"><b>${busy ? 'Looking…' : 'Look again'}</b><small>${lk ? `Looked at ${hm(lk.at)} in ${lk.tables} channel archive${lk.tables === 1 ? '' : 's'} and ${lk.videos} NBA video${lk.videos === 1 ? '' : 's'}` : 'The archives and Movies, now'}</small></span></button></div>`;
}
// The shield's cards (the TV's catch-up 5.5): what's hidden, and the way to watch it first.
function shieldCard(g0, g) {
  const name = esc(gameName(g)), reps = replaysOf(g0), best = reps?.[0] || null, behind = behindReplay(g0);
  const rv = `<button class="ghost sm" data-gact="reveal">${ic('eyeOff')}<span class="ellipsis">Reveal ${name}</span></button>`;
  const card = (title, text, btns, cap = '') => `<div class="cover gm-cov"><div class="h">${ic('eyeOff')}<span>${title}</span></div><p>${text}</p><div class="act nbz">${btns}</div>${cap ? `<div class="note" style="margin:10px 0 0">${cap}</div>` : ''}</div>`;
  if (behind) return card(`${name} is hidden`, 'You’re behind in its replay: it counts as seen at the replay’s final buzzer.', `<button class="pill" data-gact="resume">${ic('play')}Resume</button>${rv}`);
  if (g.state === 'post' && best) {
    const until = best.kind === 'channel' ? keptUntil(best.windowStart, best.days) : '';
    const what = best.kind === 'channel' ? `${esc(best.name)} · replays until ${esc(until)}` : `${esc(best.name)}${replayPick(g0.id)?.kind === 'video' ? '' : ` · ${esc(best.detail || '')}`}`;
    return card(`${name} is hidden`, 'Watch it from tip-off: it counts as seen at the replay’s final buzzer.', `<button class="pill" data-gact="tipoff">${ic('play')}Watch from tip-off</button>${rv}`, `${what} · other sources in Replays`);
  }
  if (g.state === 'post' && reps) {
    const lk = replaysLooked(g0), day = new Date(g0.date + 3 * 864e5 - 6 * 3600e3).toLocaleDateString('en-GB', { weekday: 'short' });
    return card('No replay of this game yet', `Full games often reach Movies a few hours after the final. ${Date.now() < g0.date + 3 * 864e5 ? `airglow looks every hour until ${day}.` : 'Look again when one may have arrived.'}`,
      `<button class="ghost sm" data-gact="pickch">${ic('live')}Pick the channel</button><button class="ghost sm" data-gact="look">${ic('refresh')}${replaysBusy(g0) ? 'Looking…' : 'Look again'}</button><button class="ghost sm" data-gact="choose">${ic('search')}Choose a video</button>${rv}`,
      lk ? `Looked at ${hm(lk.at)} in ${lk.tables} channel archive${lk.tables === 1 ? '' : 's'} and ${lk.videos} NBA video${lk.videos === 1 ? '' : 's'}` : '');
  }
  if (g.state === 'post') return card(`${name} is hidden`, 'Looking for a replay of it…', rv);
  return card('The box score and plays are hidden', `The spoiler shield covers ${name}. Revealing it shows its score everywhere on this iPhone, from now on.`, `<button class="ghost sm" data-act="back">Keep it hidden</button>${rv}`);
}

function gameHtml() {
  const g0 = gameById(gId);
  if (!g0) return `<div class="ph-top"><button class="ph-back" data-act="back" aria-label="Back">${ic('back')}</button><h1 style="font:var(--ph-title)">Game</h1></div><div class="state"><b>This game is no longer listed</b><p>Back returns to where you were.</p></div>`;
  holdGame(g0);
  const v = show(g0), g = v.g, s = v.s || summaryOf(g0.id);
  const behind = behindReplay(g0) && shielded(g0);
  const hid = v.hidden || behind;
  const st = behind && g.state !== 'pre' ? `${liveByClock(g0) ? '<span class="live sm">Live</span>' : ''}<span class="ellipsis">You're in ${esc(replayProgress(g0.id)?.item?.pos?.chapter || 'the replay')}</span>`
    : g.state === 'pre' ? `<span class="ellipsis">${esc(dayWord(g.date))} · Tip-off ${hm(g.date)}</span>`
    : g.state === 'in' ? `<span class="live sm">Live</span><span class="ellipsis">${hid ? 'Score hidden' : esc(clockText(g))}${!hid && v.delayed != null ? ` · ${v.synced != null ? `synced, ${v.synced} s behind live` : `delayed ${v.delayed} s`}` : ''}</span>`
    : `<span class="ellipsis">${hid ? 'Ended' : `Final${g.period > 4 ? ' / OT' : ''}`} · ${esc(nightLabel(g0.date))}</span>`;
  const mid = hid ? `<span class="gm-hid">${ic('eyeOff')}Score hidden</span>` : g.state === 'pre' ? `<span class="gm-vs">${hm(g.date)}</span>` : `<span class="gm-sc">${esc(g.away.score)}<i>–</i>${esc(g.home.score)}</span>`;
  const side = (t) => `<button class="gm-side nbz" data-gact="team" data-abbr="${esc(t.abbr)}">${crest(team(t), 56)}<b class="ellipsis">${esc(t.name)}</b><span class="ellipsis">${hid ? `${esc(recordFor(t).text || '')}${recordFor(t).text ? ' · as of tip-off' : ''}` : recText(t)}</span></button>`;
  // the watch buttons (the TV's tab row, catch-up 5.5)
  const reps = replaysOf(g0), best = reps?.[0] || null;
  const acts = [];
  if (behind && g.state !== 'pre') { acts.push(['resume', `${ic('play')}Resume`, 1]); acts.push(liveByClock(g0) ? ['golive', 'Back to live'] : ['tipoff', 'From tip-off']); }
  else {
    if (g.state === 'in' || (g.state === 'pre' && g.date - Date.now() < 3 * 3600e3)) acts.push(['live', `${ic('play')}${g.state === 'pre' ? 'Watch pre-game' : 'Watch live'}`, 1]);
    if (g.state === 'in') acts.push(['tipoff', 'From tip-off']);
    if (g.state === 'post' && !hid && best) acts.push(['again', `${ic('play')}Watch again`, 1]);
    else if (g.state === 'post' && !hid) acts.push(['tipoff', `${ic('play')}From tip-off`, 1]);
  }
  if (hid && g.state !== 'pre') acts.push(['reveal', `${ic('eyeOff')}Reveal`]);
  const actHtml = acts.length ? `<div class="nb-act nbz gm-act">${acts.map(([a, l, p]) => `<button class="${p ? 'pill' : 'ghost'}" data-gact="${a}">${l}</button>`).join('')}</div>` : '';
  const tabs = TABS.filter(([k]) => !(hid && k === 'plays'));
  if (!tabs.some(([k]) => k === gTab)) gTab = 'sum';
  const seg = `<div class="lb-seg gm-tabs">${tabs.map(([k, l]) => `<button class="${k === gTab ? 'sel' : ''}" data-gtab="${k}">${l}</button>`).join('')}</div>`;
  let body;
  if (gTab === 'replays') body = replaysHtml(g0, g, v);
  else if (hid && g.state !== 'pre') body = shieldCard(g0, g);
  else if (gTab === 'box') body = boxHtml(g, s);
  else if (gTab === 'plays') body = playsHtml(g, s);
  else body = summaryHtml(g, s);
  return `<div class="ph-top"><button class="ph-back" data-act="back" aria-label="Back">${ic('back')}</button><span class="gm-st nbz">${st}</span></div>
    <div class="gm-head nbz">${side(g.away)}<div class="gm-mid">${mid}</div>${side(g.home)}</div>${actHtml}${seg}<div class="gm-body">${body}</div>`;
}
function drawGame() { if (gEl && isShown('game')) paint(gEl, gameHtml()); }

// ---------- the sources (the TV's replay.js sheets, as phone sheets) ----------
function goLive(g) {
  const p = replayProgress(g.id), id = p?.item?.src?.startsWith('channel:') ? p.item.src.slice(8) : watchedOn(g.id);
  const ch = (id && (catalog.live?.byId.get(String(id)) || catalog.live?.byId.get(+id))) || bestChannel(g);
  const go = () => { if (p) { p.item.live = true; store.set(scoped('progress'), S.progress); } if (ch) tune(ch); else toast('No channel found for this game yet. Pick it in Live and it will be remembered.'); };
  if (!shielded(g) || isSeen(g)) return go();
  confirm({ title: 'Going live may show the score', text: `${ch?.name || 'The channel'} is live now. Your replay stays where you left it.`, no: 'Stay in the replay', yes: 'Go live', onYes: go });
}
function pickChannel(g) {
  const { list, kept, days } = keptFor(g);
  if (!kept) { toast('Your provider keeps no channels for replays, so there’s nothing to rewatch from. Account › Provider shows it.', 7000); return; }
  if (!list.length) { toast(`Your provider keeps replays for ${days} day${days === 1 ? '' : 's'}: this game is older than that.`, 6000); return; }
  menu(`Which channel showed ${gameName(g)}?`, list.map((ch) => ({ label: ch.name, sub: keptWords(ch.archive), icon: 'live', run: async () => {
    setReplayPick(g.id, { kind: 'channel', id: String(ch.id) });
    const l = await findReplays(g, { force: true });
    const src = l.find((x) => x.kind === 'channel' && x.id === String(ch.id));
    if (src) watchFromTipoff(g, { source: src }); else toast(`${ch.name}’s replays don’t reach back to this game`, 5000);
  } })), { sub: `${nightLabel(g.date)} · your pick is remembered for this game` });
}
function chooseVideo(g) {
  ensure('movie').then(() => {
    const vids = videosNaming(g);
    if (!vids.length) { toast(`No videos name the ${g.away.name} or the ${g.home.name} yet. Full games often reach Movies a few hours after the final.`, 6000); return; }
    menu('Choose a video', vids.map((m) => {
      const mk = videoMask(m);
      return { label: mk ? (mk.kind === 'game' ? `${mk.title} · ${mk.full?.condensed ? 'condensed game' : 'full game'}` : mk.title) : m.name, sub: mk ? 'Name hidden' : m.added ? `added ${new Date(m.added * 1000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}` : '', icon: mk ? 'eyeOff' : 'film', run: () => {
        const r = matchVideo(m, g);
        if (!r) return playVideoFor(g, m);
        setReplayPick(g.id, { kind: 'video', id: m.id });
        findReplays(g, { force: true }).then((l) => watchFromTipoff(g, { source: l.find((x) => x.kind === 'video' && x.id === String(m.id)) || undefined }));
      } };
    }), { sub: `Videos naming the ${g.away.name} or the ${g.home.name}, newest first${shieldMode() !== 'off' ? ' · names that could tell stay hidden' : ''}` });
  }).catch(() => toast('Your provider’s movies didn’t load.'));
}

export const gamePage = {
  name: 'game',
  mount(root) {
    gEl = root;
    onReveal(root, drawGame);
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="back"]')) return back();
      const t = e.target.closest('[data-gtab]');
      if (t) { gTab = t.dataset.gtab; drawGame(); return; }
      const sd = e.target.closest('[data-gside]');
      if (sd) { gSide = sd.dataset.gside; drawGame(); return; }
      const g = gameById(gId);
      if (!g) return;
      const src = e.target.closest('[data-src]');
      if (src) { const x = replaysOf(g)?.[+src.dataset.src]; if (x) { setReplayPick(g.id, x); watchFromTipoff(g, { source: x }); } return; }
      const a = e.target.closest('[data-gact]');
      if (!a) return;
      const act = a.dataset.gact;
      if (act === 'team') return push('team', { abbr: a.dataset.abbr });
      if (act === 'live') { const ch = bestChannel(g); if (ch) tune(ch); else { toast('No channel found for this game yet. Pick it in Live and it will be remembered.', 4500); findFeeds(g); } }
      if (act === 'tipoff' || act === 'again') watchFromTipoff(g);
      if (act === 'resume') resumeGame(g);
      if (act === 'golive') goLive(g);
      if (act === 'reveal') revealIds([g.id], drawGame);
      if (act === 'pickch') pickChannel(g);
      if (act === 'choose') chooseVideo(g);
      if (act === 'look') { lookAgain(g).then(drawGame); drawGame(); }
    });
    // a long-press on a From tip-off button: the other sources (the Replays tab)
    longPress(root, '[data-gact="tipoff"],[data-gact="again"],[data-gact="resume"]', () => { gTab = 'replays'; drawGame(); });
    on('summary', (id) => { if (id === gId) drawGame(); });
    on('nba', drawGame); on('feeds', drawGame); on('replays', drawGame); on('progress', drawGame);
    setInterval(() => { if (isShown('game')) drawGame(); }, 15000);
  },
  enter(root, p, { fresh }) {
    if (gId && gId !== p.id) wantSummary(gId, false);
    const same = gId === p.id;
    gId = p.id;
    if (fresh || !same) { gTab = p.tab || 'sum'; const g = gameById(gId); gSide = g && g.home.abbr === favTeam() ? 'home' : 'away'; root._html = null; root.scrollTop = 0; }
    wantSummary(gId, true);
    const g = gameById(gId);
    if (g && g.state !== 'post') findFeeds(g).then(drawGame);
    if (g && g.state !== 'pre') findReplays(g);
    drawGame();
  },
  leave() { if (gId) wantSummary(gId, false); },
};
