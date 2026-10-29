// The cards the phone's screens share: game cards (the TV's shape at full width or 260 pt), posters, wide cards.
// Every score goes through games.js show() / hidden() / recordFor(), so the shield holds as on the TV.
import { hm, leftText, sized, teamPalette } from '../tv/js/util.js';
import { progressOf, inProgress } from '../tv/js/state.js';
import { show, clockText, isMine, favTeam, recordFor, shielded, behindReplay, replayProgress, liveByClock } from '../tv/js/games.js';
import { replaysOf, videoMask } from '../tv/js/catchup.js';
import { ic, esc, crestImg } from './ui.js';

const team = (t) => ({ ...t, logo: t.logo || window.NBA?.logoFor?.(t.abbr) || '' });
const edge = (t) => teamPalette(t).a && teamPalette(t).p ? teamPalette(t).p : 'var(--a-surface-3)';
// a record as he may see it (partial: only the finals he has seen count, and it says so)
export const recText = (t) => { const r = recordFor(t); return r.partial && r.text ? `${esc(r.text)} ${ic('eyeOff')}` : esc(r.text); };
export function gameCard(g0, { wide = true } = {}) {
  const v = show(g0), g = v.g;
  const behind = shielded(g0) && behindReplay(g0);
  const pos = behind ? replayProgress(g0.id)?.item?.pos : null;
  const mine = isMine(g0);
  let st;
  if (behind) st = `${liveByClock(g0) ? '<span class="live sm">Live</span>' : ''}<span>You're in ${esc(pos?.chapter || 'the replay')}</span>`;
  else if (g.state === 'in') st = `<span class="live sm">Live</span><span>${esc(clockText(g))}</span>`;
  else if (g.state === 'post') st = `<span>${v.hidden ? 'Ended' : `Final${g.period > 4 ? ' / OT' : ''}`}</span>`;
  else st = `<span>${mine ? 'Your team · ' : ''}${esc(dayWord(g.date))}</span>`;
  const rp = g.state !== 'pre' && replaysOf(g0)?.length;
  const tv = rp ? `<span class="tvn">${ic('refresh')} Replay</span>` : `<span class="tvn">${esc(g.tv?.[0] || '')}</span>`;
  const aw = +g.away.score, hw = +g.home.score, fin = g.state === 'post' && !v.hidden;
  let plate;
  if (g.state === 'pre') plate = `<span class="plate"><span class="tip">${hm(g.date)}</span></span>`;
  else if (v.hidden || behind) plate = `<span class="plate"><span class="hd">${ic('eyeOff')}Score hidden</span></span>`;
  else plate = `<span class="plate"><span class="x"><span${fin && aw < hw ? ' style="opacity:.6"' : ''}>${esc(g.away.score)}</span><span${fin && hw < aw ? ' style="opacity:.6"' : ''}>${esc(g.home.score)}</span></span></span>`;
  const rec = (t) => (v.hidden || behind ? '' : recText(t));
  const row = (t, lose) => `<div class="tr${t.abbr === favTeam() ? ' mine' : ''}${lose ? ' lose' : ''}"><span class="tedge" style="--te:${edge(t)}"></span>${crestImg(team(t), 26)}<span class="nm">${esc(t.name)}</span><span class="rc">${rec(t)}</span></div>`;
  return `<button class="gcard${wide ? '' : ' sm'}" data-g="${esc(g0.id)}"><div class="st${mine ? ' mine' : ''}">${st}${tv}</div><div class="teams">${row(g.away, fin && aw < hw)}${row(g.home, fin && hw < aw)}</div>${plate}</button>`;
}
// 'TONIGHT 02:00' words for a game day (the night rule: a tip-off before 06:00 is the evening before)
export function dayWord(t) {
  const n = new Date(t - 6 * 3600e3), now = new Date(Date.now() - 6 * 3600e3);
  const days = Math.round((new Date(n.toDateString()) - new Date(now.toDateString())) / 864e5);
  const late = new Date(t).getHours() < 6 ? ' · late' : '';
  if (days === 0) return `Tonight${late}`;
  if (days === 1) return `Tomorrow${late}`;
  if (days === -1) return 'Last night';
  return `${n.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}${late}`;
}
const pct = (p) => (p?.d ? Math.min(100, (p.t / p.d) * 100) : 0);
// 2:3 poster with its caption (name, year · runtime · rating); a 4K chip where a copy is known, MKV when nothing plays here
export function posterCard(it, i, { q = '', mkv = false } = {}) {
  const mk = videoMask(it);
  if (mk) return `<button class="poster" data-i="${i}"><div class="box"><div class="noart">${ic('eyeOff')}<br>${esc(mk.title)}</div></div><div class="cap">${esc(mk.title)}<small>${esc(mk.kind === 'game' ? mk.meta : 'Name hidden')}</small></div></button>`;
  const p = it.kind === 'movie' ? progressOf({ kind: 'movie', id: it.imdb || it.id }) : null;
  const meta = [it.year || '', it.runtime ? `${Math.floor(it.runtime / 60) ? `${Math.floor(it.runtime / 60)}h ` : ''}${it.runtime % 60}m` : '', it.rating ? (+it.rating).toFixed(1) : ''].filter(Boolean).join(' · ');
  const art = it.poster ? `<img src="${esc(sized(String(it.poster).replace(/\/poster\/(medium|large)\//, '/poster/small/'), 342))}" alt="" loading="lazy" decoding="async">` : `<div class="noart">${esc(it.name)}</div>`;
  return `<button class="poster" data-i="${i}"><div class="box">${art}${q ? `<span class="q">${esc(q)}</span>` : mkv ? '<span class="q">MKV</span>' : ''}${p && inProgress(p) ? `<div class="pb"><i style="--p:${pct(p)}%"></i></div>` : ''}</div><div class="cap">${esc(it.name)}<small>${esc(meta)}</small></div></button>`;
}
// Continue watching / a replay you stopped as a 198 x 111 card
export function contCard(p, i) {
  const it = p.item;
  if (it.kind === 'rp') {
    const g = it.game;
    const where = it.pos?.chapter ? `Stopped in ${it.pos.chapter}` : 'Started';
    const bg = g ? `background:linear-gradient(120deg,${teamPalette(g.away).p} 0 48%,${teamPalette(g.home).p} 52% 100%)` : '';
    return `<button class="wide" data-i="${i}"><div class="box" style="${bg}"><div class="shd"></div><div class="tl">${g ? `${crestImg(team(g.away), 24)}${crestImg(team(g.home), 24)}` : ''}</div><div class="bt"><b>${esc(g ? `${g.away.name} at ${g.home.name}` : it.title || it.name)}</b><span>${esc(g ? `NBA · Replay · ${where}` : `${it.channel || ''} · Replay`)}</span></div><div class="pb"><i style="--p:${pct(p)}%"></i></div></div></button>`;
  }
  const mk = it.kind === 'movie' ? videoMask(it) : null;
  const title = mk ? mk.title : it.kind === 'episode' ? it.seriesName : it._title || it.name;
  const sub = it.kind === 'episode' ? `S${it.season} · E${it.ep} · ${leftText(p.d - p.t)}` : mk ? 'Replay' : leftText(p.d - p.t);
  const art = !mk && (it.still || it.poster) ? `<img src="${esc(sized(it.still || it.poster, 500))}" alt="" loading="lazy">` : '';
  return `<button class="wide" data-i="${i}"><div class="box">${art}<div class="shd"></div><div class="bt"><b>${esc(title)}</b><span>${esc(sub)}</span></div><div class="pb"><i style="--p:${pct(p)}%"></i></div></div></button>`;
}
