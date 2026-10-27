// Account: groups on the left, 56 px rows on the right. A row is itself the button (OK opens its choices or toggles it).
import { esc, ic, dot, setHtml, host } from '../util.js';
import { S, on, emit, settings, saveSettings, store } from '../state.js';
import { catalog, resetCatalogs, ensure, forget } from '../catalog.js';
import { resetGuides } from '../guide.js';
import { setShield, shieldMode, favTeam, delayFor, nba } from '../games.js';
import { native } from '../native.js';
import { accountFacts, switchTo, signOut, removeAccount } from '../session.js';
import { go, current } from '../router.js';
import { focus } from '../focus.js';
import { radioMenu, confirmMenu, toast, openOverlay, scrollList } from '../ui.js';
import { sfx } from '../sfx.js';
import { connectionCheck } from '../conncheck.js';
import { forgetReplays, keptWords, NOT_KEPT } from '../catchup.js';
import { addonsPane, addonsAct, addonsHold, addonsEnter, addonsEntry } from './addons.js';

const GROUPS = [['provider', 'Provider'], ['addons', 'Add-ons'], ['playback', 'Playback'], ['sound', 'Sound'], ['nba', 'NBA'], ['languages', 'Languages'], ['home', 'Home rows'], ['updates', 'Updates'], ['about', 'About']];
const TEAMS = window.NBA.TEAMS;
// Owner decision 13.1 (catch-up): which source Watch from tip-off plays
const REPLAYS = { channel: ['Channel replay first', 'Quarter skips and the as-aired score'], video: ['Full-game video first', 'From Movies, when there is one'], ask: ['Ask each time', 'Lists the sources'] };
const LANGS = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Icelandic', 'Polish', 'Turkish', 'Arabic', 'Hindi'];
let el, group = 'provider', scroll = 0;

const toggle = (on) => `<span class="onoff">${on ? 'On' : 'Off'}</span><span class="tg${on ? ' on' : ''}"><i></i></span>`;
const row = (act, t, v, sub = '', dis = false) => `<div class="arow fx${dis ? ' dis' : ''}" tabindex="-1" data-act="${act}"><span class="grow" style="min-width:0">${t}${sub ? `<div class="t-cap" style="margin-top:0">${sub}</div>` : ''}</span><span class="av">${v}</span></div>`;
const more = (v) => `${esc(v)} ${ic('chevR', 'sm')}`;
const short = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t);
const upd = () => native?.updates.status() || { state: 'idle' };

function body() {
  const s = settings();
  if (group === 'provider') {
    const f = accountFacts();
    const name = S.acc ? (S.acc.type === 'xtream' ? host(S.acc.server) : S.acc.name) : '';
    const exp = f.exp ? `Expires ${f.exp.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}${f.days != null ? (f.days < 0 ? ' · Expired' : ` · ${f.days} day${f.days === 1 ? '' : 's'} left`) : ''}` : '';
    return `<div class="t-title" style="margin-bottom:10px">Provider</div>
      ${row('info', esc(name), f.active ? `<span class="pill-ok">${ic('check', 'sm')}${esc(f.status)}</span>` : esc(f.status), esc(exp))}
      ${f.cons ? row('info', 'Connections', esc(f.cons)) : ''}
      ${S.accounts.length > 1 ? row('switch', 'Switch account', more(S.accounts.filter((a) => a.id !== S.acc?.id).map((a) => a.name).join(' · ').slice(0, 30))) : ''}
      ${row('add', 'Add account', ic('plus', 'sm'))}
      ${row('guidecheck', 'Check the guide', more(short(lastCh()?.name || 'No channel yet', 28)), 'What your provider sends for the last channel you watched')}
      ${row('conncheck', 'Check the connection', more('Run'), 'Tests your Wi-Fi, internet and provider, and how fast a channel arrives')}
      ${row('refresh', 'Refresh channels and guide', esc(catalog.live?._at ? `Updated ${new Date(catalog.live._at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}` : ''))}
      ${row('signout', 'Sign out', ic('chevR', 'sm'))}`;
  }
  if (group === 'addons') return addonsPane();
  if (group === 'playback') {
    const maxC = accountFacts().maxCons;
    return `<div class="t-title" style="margin-bottom:10px">Playback</div>
      ${row('zap', 'Up arrow in the player', more(s.zapUp === 'prev' ? 'Previous channel' : 'Next channel'), 'Down goes the other way. Also in the channel list')}
      ${row('format', 'Stream format', more(s.liveFormat === 'ts' ? 'Transport stream' : 'HLS'), 'Try the other one if a channel stutters')}
      ${row('ua', 'User agent', more(s.ua || 'Default'), 'Some providers only answer known players')}
      <div class="t-cap" style="margin-top:4px">Subtitles, audio, picture size and Match frame rate are in the player: press ▼ in a movie.</div>`;
  }
  if (group === 'sound') {
    const lv = { on: 'On', quiet: 'Quiet', off: 'Off' }[sfx.level()];
    return `<div class="t-title" style="margin-bottom:10px">Sound</div>
      ${row('sounds', 'Sounds', more(lv), 'Soft sounds for moving around, OK and Back, and the start-up. Never in the player, except Your team is live')}
      <div class="t-cap" style="margin-top:4px">Quiet is half as loud. The sounds follow the TV's volume.</div>
      <div class="t-cap" style="margin-top:4px">${audioLine()}</div>`;
  }
  if (group === 'nba') {
    const t = TEAMS.find((x) => x.abbr === favTeam());
    const mode = { off: 'Off', mine: 'My team', all: 'All games' }[shieldMode()];
    const ds = store.get(`a:${S.acc?.id}:delays`, {});
    const named = Object.entries(ds).map(([id, v]) => [catalog.live?.byId.get(id)?.name || 'A channel', v]).slice(0, 2).map(([n, v]) => `${n}: ${v} s behind live`).join(' · ');
    return `<div class="t-title" style="margin-bottom:10px">NBA</div>
      ${row('team', 'Your team', more(t ? `${t.city} ${t.name}` : 'None'))}
      ${row('shield', 'Spoiler shield', more(mode), 'Hides scores, leaders, records and finals everywhere until you reveal them')}
      ${row('bug', 'Score on picture', toggle(!!s.scoreBug), 'A small score in the corner while you watch a game')}
      ${row('delays', 'Score delay', more('Per channel'), esc(named || 'Set in the player: ◀ then Sync score. New channels start at 60 s'))}
      ${row('replays', 'Replays play', more(REPLAYS[s.replaysPlay || 'channel'][0]), 'What Watch from tip-off plays. Hold OK on it lists every source')}`;
  }
  if (group === 'languages') {
    const langs = s.langs || ['English'];
    return `<div class="t-title" style="margin-bottom:10px">Languages</div>
      ${row('langs', 'Shown first', more(langs.join(', ')), 'Movies and series in these languages come first, and pick the version you get by default')}
      ${row('subs', 'Subtitles', more({ auto: 'Auto', off: 'Off' }[s.subLang || 'auto'] || s.subLang), 'Used when a file has them')}`;
  }
  if (group === 'home') {
    return `<div class="t-title" style="margin-bottom:10px">Home rows</div>
      ${row('hero', 'Your team first', toggle(s.heroGame !== false), 'On game days your team\'s game is the big card on Home')}
      ${row('alert', 'Tell me when my team is live', toggle(s.liveAlert !== false), 'A quiet chip while you watch something else')}`;
  }
  if (group === 'updates') {
    const u = upd();
    const v = native?.info().version || '';
    const st = u.state === 'ready' ? row('install', `airglow ${esc(u.version)} is ready`, more('Update now'), 'Downloaded in the background. Installs at a quiet moment.')
      : u.state === 'downloading' ? row('info', 'Downloading the update', `${u.percent || 0}%`)
      : row('check', 'Check for updates', u.state === 'checking' ? 'Checking…' : u.state === 'current' ? 'Up to date' : u.state === 'error' ? 'Could not reach GitHub' : '');
    return `<div class="t-title" style="margin-bottom:10px">Updates</div>${row('info', 'Version', esc(v || 'This build'))}${st}`;
  }
  return `<div class="t-title" style="margin-bottom:10px">About</div>
    ${row('info', 'airglow', esc(native?.info().version || ''), 'An ad-free player for your own TV provider')}
    ${row('info', 'Scores', 'ESPN', 'Live scores, box scores and plays')}
    ${row('info', 'Ratings', 'IMDb', 'From IMDb\'s free datasets, updated weekly')}
    ${row('info', 'Channels', esc(catalog.live ? catalog.live.items.length.toLocaleString() : '…'), esc(catalog.movie ? `${catalog.movie.titles?.length.toLocaleString()} movies${catalog.series ? ` · ${catalog.series.titles?.length.toLocaleString()} series` : ''}` : ''))}`;
}
function draw() {
  if (!el || el.hidden) return;
  const u = upd();
  const side = GROUPS.map(([k, l]) => `<div class="gl fx${k === group ? ' sel' : ''}" tabindex="-1" data-g="${k}">${l}${k === 'updates' && u.state === 'ready' ? '<i class="udot s"></i>' : ''}</div>`).join('');
  // ◀ ▶ between the panes: into the groups on the selected one, into the settings on the first (not the item level with you)
  setHtml(el, `<div class="abs" data-col data-mem="off" data-entry=".gl.sel" style="left:48px;top:90px;width:200px">${side}</div><div class="abs" style="left:260px;top:84px;width:658px;height:435px;padding:6px 12px;box-sizing:border-box;overflow:hidden"><div class="inner" data-col data-mem="off" data-entry="${group === 'addons' ? addonsEntry : '.arow:not(.dis)'}" style="transition:transform 200ms var(--a-ease);transform:translateY(${-scroll}px)">${body()}</div></div>`);
}

// A toggle row's sound: on is bright, off is dim (replaces the OK sound for that press).
const flip = (on) => sfx.request(on ? 'toggle-on' : 'toggle-off');

const lastCh = () => catalog.live?.byId.get(store.get(`a:${S.acc?.id}:lastLive`, '')) || catalog.live?.items.find((c) => !c._sep) || null;
function audioLine() {
  const st = sfx.status();
  if (st.native) return 'Playing through the TV\'s low-latency sound path';
  if (st.audio === 'none') return 'This TV gives apps no audio for sounds.';
  return `Audio ${st.audio === 'running' ? 'ready' : st.audio} · ${st.loaded} of ${st.total} sounds loaded`;
}
// What the provider sends for one channel's guide, straight from the server (not the 10-minute copy): for a photo
// when the guide is empty.
async function guideCheck() {
  const ch = lastCh();
  if (!ch || !S.src?.epg) return toast('Watch a channel first, then check again.');
  const ov = openOverlay(`<div class="sheet"><h3>Guide check</h3><div class="sheet-body"><div class="inner" data-col><div class="lr fx" tabindex="-1"><span class="grow">Asking your provider about ${esc(ch.name)}…</span></div></div></div></div>`);
  const why = {}, now = Date.now(), t = (ms) => new Date(ms).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  let list = [], err = '';
  try { const k = S.acc?.epgShift || 0; list = (await S.src.epg(ch, why)).map((p) => ({ ...p, start: p.start + k, end: p.end + k })); } catch (e) { err = e.message; }
  const on = list.find((p) => p.start <= now && p.end > now);
  const lines = [
    ['Channel', `${ch.name} · id ${ch.id}`],
    ['Short guide', err ? `Error: ${err}` : `${why.short ?? 0} entries`],
    ['Full table', why.table == null ? 'Not needed' : `${why.table} entries`],
    ['Clock offset', why.shift ? `${why.shift > 0 ? '+' : '−'}${Math.abs(why.shift) / 3600e3} h (fixed here)` : 'None'],
    ['On now', on ? `${on.title} · ${t(on.start)}–${t(on.end)}` : 'Nothing'],
    ['First entry', list[0] ? `${list[0].title} · ${t(list[0].start)}` : '—'],
    ['Last entry', list.length ? `${list[list.length - 1].title} · ${t(list[list.length - 1].end)}` : '—'],
    ['TV time', `${t(now)} · provider time zone ${S.acc?.tz || 'not sent'}`],
    // catch-up (SPEC 12.1): does the provider keep this channel, and how many channels it keeps
    ['Replays', `${ch.archive ? keptWords(ch.archive) : NOT_KEPT} · ${(catalog.live?.items || []).filter((c) => c.archive > 0).length} channels have replays`],
  ];
  if (!ov.el.isConnected) return;
  ov.el.querySelector('.inner').innerHTML = lines.map(([k, v], i) => `<div class="lr fx" tabindex="-1"${i ? '' : ' data-first'}><span style="width:120px;flex:none" class="t-3">${k}</span><span class="grow ellipsis">${esc(v)}</span></div>`).join('');
  focus(ov.el.querySelector('.lr'));
}
function act(a) {
  const s = settings();
  if (a === 'guidecheck') return guideCheck();
  if (a === 'conncheck') return connectionCheck(lastCh());
  if (a === 'switch') {
    radioMenu({ title: 'Switch account', value: S.acc?.id, rows: S.accounts.map((x) => ({ v: x.id, l: x.name, sub: x.type === 'xtream' ? x.username : 'Playlist' })), onPick: async (id) => {
      const x = S.accounts.find((y) => y.id === id); if (!x || x.id === S.acc?.id) return;
      toast(`Switching to ${x.name}…`);
      try { await switchTo(x); go('home'); } catch (e) { toast(e.message, 5000); }
    } });
  } else if (a === 'add') go('first', { add: true });
  else if (a === 'refresh') { toast('Refreshing channels, movies and series…'); forget().then(() => { resetGuides(); return ensure('live'); }).then(() => { draw(); toast('Channels are up to date'); }).catch((e) => toast(e.message, 5000)); }
  else if (a === 'signout') confirmMenu({ title: 'Sign out?', text: `airglow forgets ${S.acc?.name || 'this account'} on this TV. Your saved channels and progress go with it.`, yes: 'Sign out', onYes: () => { const x = S.acc; signOut(); if (x) removeAccount(x); go('first'); } });
  else if (a === 'zap') radioMenu({ title: 'Up arrow in the player', value: s.zapUp || 'next', rows: [{ v: 'next', l: 'Next channel' }, { v: 'prev', l: 'Previous channel' }], onPick: (v) => { saveSettings({ zapUp: v }); draw(); } });
  else if (a === 'format') radioMenu({ title: 'Stream format', value: s.liveFormat, rows: [{ v: 'hls', l: 'HLS', sub: 'Most providers' }, { v: 'ts', l: 'Transport stream', sub: 'Steadier on some' }], onPick: (v) => { saveSettings({ liveFormat: v }); resetCatalogs(); draw(); } });
  else if (a === 'previews') { saveSettings({ previews: !s.previews }); flip(!s.previews); draw(); }
  else if (a === 'sounds') radioMenu({ title: 'Sounds', value: sfx.level(), rows: [{ v: 'on', l: 'On' }, { v: 'quiet', l: 'Quiet', sub: 'Half as loud' }, { v: 'off', l: 'Off' }], onPick: (v) => {
    saveSettings({ sounds: v }); sfx.mode(v); if (v !== 'off') setTimeout(() => sfx.play('select', { cd: 0 }), 60); draw();
  } });
  else if (a === 'ua') radioMenu({ title: 'User agent', value: s.ua || '', rows: [{ v: '', l: 'Default' }, { v: 'VLC/3.0.20 LibVLC/3.0.20', l: 'VLC' }, { v: 'IPTVSmartersPlayer', l: 'IPTV Smarters' }, { v: 'TiviMate/4.7.0', l: 'TiviMate' }], onPick: (v) => { saveSettings({ ua: v }); draw(); } });
  else if (a === 'team') teamSheet(draw);
  else if (a === 'shield') radioMenu({ title: 'Spoiler shield', value: shieldMode(), rows: [{ v: 'off', l: 'Off', sub: 'Scores everywhere' }, { v: 'mine', l: 'My team', sub: 'Your team\'s games hidden' }, { v: 'all', l: 'All games', sub: 'Every game hidden' }], extra: '<div class="t-cap" style="padding:8px 8px 2px">Reveal a game with its Reveal score button. Watching it counts as revealing it.</div>', onPick: (v) => { setShield(v); draw(); } });
  else if (a === 'replays') radioMenu({ title: 'Replays play', value: s.replaysPlay || 'channel', rows: Object.entries(REPLAYS).map(([v, [l, sub]]) => ({ v, l, sub })), style: 'right:48px;top:120px;width:420px',
    extra: '<div class="t-cap" style="padding:8px 8px 2px">Hold OK on Watch from tip-off lists every source, whatever this says.</div>', onPick: (v) => { saveSettings({ replaysPlay: v }); forgetReplays(); draw(); } });
  else if (a === 'bug') { saveSettings({ scoreBug: !s.scoreBug }); flip(!s.scoreBug); draw(); }
  else if (a === 'delays') {
    const ds = store.get(`a:${S.acc?.id}:delays`, {});
    const ids = Object.keys(ds);
    if (!ids.length) return toast('No delays yet. In the player press ◀ on a game channel, then Sync score.', 5000);
    radioMenu({ title: 'Score delay', value: null, rows: [...ids.map((id) => ({ v: id, l: catalog.live?.byId.get(id)?.name || 'A channel', sub: `${ds[id]} s` })), { v: '__reset', l: 'Reset all to 60 s' }], onPick: (v) => { if (v === '__reset') { store.set(`a:${S.acc.id}:delays`, {}); toast('Score delays reset'); } else toast('Sync it again in the player: ◀ then Sync score.', 4000); draw(); } });
  } else if (a === 'langs') {
    let langs = [...(s.langs || ['English'])];
    const drawL = () => ov.el.querySelector('.inner').innerHTML = LANGS.map((l) => `<div class="lr fx" tabindex="-1" data-act="${l}"><span class="ck${langs.includes(l) ? ' on' : ''}">${langs.includes(l) ? ic('check') : ''}</span><span class="grow">${l}</span>${langs.includes(l) ? `<small>${langs.indexOf(l) + 1}</small>` : ''}</div>`).join('');
    const ov = openOverlay(`<div class="sheet"><h3>Languages shown first</h3><div class="t-cap" style="margin-top:-6px">In the order you tick them</div><div class="sheet-body"><div class="inner" data-col></div></div></div>`, {
      onClick: (l) => { langs = langs.includes(l) ? langs.filter((x) => x !== l) : [...langs, l]; if (!langs.length) langs = ['English']; const at = document.activeElement?.dataset.act; drawL(); focus(ov.el.querySelector(`[data-act="${at}"]`)); },
      onClose: () => { saveSettings({ langs }); resetCatalogs(); draw(); },
    });
    drawL(); focus(ov.el.querySelector('.lr')); scrollList(ov.el);
  } else if (a === 'subs') radioMenu({ title: 'Subtitles', value: s.subLang || 'auto', rows: [{ v: 'auto', l: 'Auto' }, { v: 'off', l: 'Off' }, ...LANGS.slice(0, 6).map((l) => ({ v: l, l }))], onPick: (v) => { saveSettings({ subLang: v }); draw(); } });
  else if (a === 'hero') { saveSettings({ heroGame: s.heroGame === false }); flip(s.heroGame === false); draw(); }
  else if (a === 'alert') { saveSettings({ liveAlert: s.liveAlert === false }); flip(s.liveAlert === false); draw(); }
  else if (a === 'install') native?.updates.install();
  else if (a === 'check') native?.updates.check();
}

export default {
  name: 'account',
  mount(root) {
    el = root;
    root.addEventListener('click', (e) => {
      const g = e.target.closest('[data-g]'); if (g) { group = g.dataset.g; scroll = 0; draw(); focus(el.querySelector('.arow')); return; }
      const r = e.target.closest('.arow, .ad-row'); if (!r) return;
      if (r.dataset.act?.startsWith('ad:')) addonsAct(r.dataset.act, r, draw); else act(r.dataset.act);
    });
    root.addEventListener('tvhold', (e) => { const r = e.target.closest('.ad-row'); if (r) addonsHold(r, draw); });
    // Moving along the groups shows each one's rows.
    root.addEventListener('tvfocus', (e) => {
      const g = e.target.dataset.g;
      if (g && g !== group) { group = g; scroll = 0; draw(); if (g === 'addons') addonsEnter(draw); return; }
      const r = e.target.closest('.arow, .ad-row'); const inner = el.querySelector('.inner');
      if (r && inner) { const y = r.offsetTop; if (y - scroll > 330) scroll = y - 330; else if (y < scroll) scroll = Math.max(0, y - 40); inner.style.transform = `translateY(${-scroll}px)`; }
    });
    native?.updates.onStatus(() => { if (current() === 'account') draw(); });
    on('info', () => { if (current() === 'account') draw(); });
  },
  enter() { draw(); if (group === 'addons') addonsEnter(draw); },
  entry: (root) => (group === 'addons' && root.querySelector('.ad-row')) || root.querySelector('.arow') || root.querySelector('.gl.sel'),
};

// All 30 teams, and None (no hero game, no alert). Also opened from the first-run choices.
export function teamSheet(done) {
  const cur = favTeam() || 'none';
  const row = (v, l) => `<div class="lr fx" tabindex="-1" data-act="${v}"><span class="rd${v === cur ? ' on' : ''}"></span><span class="grow">${esc(l)}</span></div>`;
  const ov = openOverlay(`<div class="sheet"><h3>Your team</h3><div class="sheet-body"><div class="inner" data-col>${row('none', 'None')}${TEAMS.map((t) => row(t.abbr, `${t.city} ${t.name}`)).join('')}</div></div></div>`, {
    focusSel: `[data-act="${cur}"]`,
    onClick: (abbr) => { ov.close(); saveSettings({ nbaTeam: abbr }); emit('nba'); done?.(abbr); },
  });
  scrollList(ov.el);
}
