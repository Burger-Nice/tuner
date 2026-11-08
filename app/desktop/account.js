// Account (desktop SPEC 5.8): a settings page in two panes, the Windows Settings shape: the groups at the left, 56 px
// rows at the right. The TV's groups (Provider, Playback, NBA, Languages, Films and series with the add-ons and the
// TMDB key typed in a real field, Home rows, Updates, About) plus Windows: start with Windows, the tray, notifications,
// the mini player, the player (hardware decoding, HDR, audio device, passthrough, mpv.conf), keyboard shortcuts.
// Provider gains Streams (max_connections / active_cons), which multiview reads.
import { S, on, settings, saveSettings } from '../tv/js/state.js';
import { accountFacts, signOut } from '../tv/js/session.js';
import { refreshNow, cacheAt } from '../tv/js/catalog.js';
import { resetGuides } from '../tv/js/guide.js';
import { shieldMode, favTeam } from '../tv/js/games.js';
import * as AD from '../tv/js/addons.js';
import * as TM from '../tv/js/tmdb.js';
import * as R from '../tv/js/rows.js';
import { toast } from '../tv/js/ui.js';
import { reportsAvailable, setReports, sendNow } from '../tv/js/reports.js';
import { lastConnCheck } from '../tv/js/conncheck.js';
import { desktopInfo, updates as UPD } from './bridge.js';
import { ic, esc, isShown, sheet, confirm, menu, radio } from './ui.js';
import { subSettings, saveSubSettings } from '../tv/js/subs.js';
import { teamSheet, shieldSheet } from './nba.js';
import { streams } from './streams.js';
import { groupRows, groupAct } from './acctui.js';
import * as acct from '../tv/js/account/acct.js';

const SUB_LANGS = ['English', 'Icelandic', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Polish', 'Turkish', 'Arabic', 'Hindi'];
const GROUPS = [['acct', 'airglow account', 'user'], ['provider', 'Provider', 'server'], ['playback', 'Playback', 'play'], ['nba', 'NBA', 'ball'], ['languages', 'Languages', 'cc'], ['films', 'Films and series', 'film'], ['rows', 'Home rows', 'home'], ['windows', 'Windows', 'win'], ['updates', 'Updates', 'refresh'], ['about', 'About', 'bang']];
let el, grp = acct.me() ? 'acct' : 'provider', prefs = null, strm = null, upd = { state: 'idle' }, devices = null;
const T = window.tuner;

const row = ({ icon, t, s, v, vcls = '', act, chev = true, tog }) => `<button class="ac-row"${act ? ` data-act="${act}"` : ''}><span class="ico">${ic(icon)}</span><span class="col"><span class="t">${t}</span>${s ? `<span class="s">${s}</span>` : ''}</span>${v != null && v !== '' ? `<span class="v ${vcls}">${v}</span>` : ''}${tog != null ? `<span class="tog${tog ? ' on' : ''}" role="switch" aria-checked="${tog ? 'true' : 'false'}"></span>` : chev && act ? ic('chevR', 'chev') : ''}</button>`;
const box = (h, rows, foot = '') => `<div class="ac-group">${h ? `<div class="h">${esc(h)}</div>` : ''}<div class="box">${rows.filter(Boolean).join('')}</div>${foot ? `<div class="foot">${foot}</div>` : ''}</div>`;
const when = (t) => new Date(t).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

function provider() {
  if (!S.acc) return box('', [row({ icon: 'key', t: 'Sign in', s: 'Xtream Codes or an M3U link', act: 'signin' })]);
  const f = accountFacts();
  const host = (() => { try { return new URL(S.acc?.server || S.acc?.url || '').host; } catch { return S.acc?.name || ''; } })();
  const exp = f?.exp ? `Expires ${f.exp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}${f.days != null ? ` · ${f.days} day${f.days === 1 ? '' : 's'} left` : ''}` : S.acc?.type === 'm3u' ? 'M3U playlist' : '';
  const sv = strm?.max ? `${strm.max} allowed · ${strm.active} in use` : f?.cons || '';
  return box('', [
    row({ icon: 'server', t: esc(host || 'Provider'), s: esc(exp), v: f.active ? `${ic('tick')}${esc(f.status === 'Playlist' ? 'Playlist' : 'Active')}` : esc(f.status), vcls: f.active ? 'ok' : '', chev: false }),
    sv ? row({ icon: 'grid', t: 'Streams', s: 'How many pictures play at once: the TV, this PC, multiview\'s tiles and the copy checks', v: esc(sv), chev: false }) : '',
    row({ icon: 'globe', t: 'Check the connection', s: 'This PC, the internet, the provider and the last channel, each as it answers', act: 'conncheck' }),
    row({ icon: 'refresh', t: 'Refresh channels and guide', s: cacheAt('live') ? `Channels from ${when(cacheAt('live'))}` : '', act: 'refresh' }),
    row({ icon: 'out', t: 'Sign out', s: 'airglow forgets this provider on this PC', act: 'signout' }),
  ]);
}
function playback() {
  const s = settings();
  return box('', [
    row({ icon: 'tipoff', t: 'Skip intro', s: 'The button, by itself, or off', v: esc({ button: 'Button', auto: 'By itself', off: 'Off' }[s.skipIntro || 'button']), act: 'skipintro' }),
    row({ icon: 'pip', t: 'Mini player when you leave a game', s: 'Leaving a live game or channel keeps it in the corner', tog: prefs?.miniOnLeave !== false, act: 'p:miniOnLeave' }),
    row({ icon: 'pin', t: 'Mini player always on top', tog: prefs?.miniOnTop !== false, act: 'p:miniOnTop' }),
    row({ icon: 'eye', t: 'Pause when the window is hidden', tog: !!prefs?.pauseHidden, act: 'p:pauseHidden' }),
    row({ icon: 'vol', t: 'Sounds', s: 'On launch and on a tune', v: esc(s.sounds === 'off' ? 'Off' : 'On'), act: 'sounds' }),
  ]);
}
function nbaGroup() {
  const team = window.NBA.team(favTeam());
  const shield = { off: 'Off', mine: 'My team', all: 'All games' }[shieldMode()];
  return box('', [
    row({ icon: 'ball', t: 'Your team', v: esc(team ? team.name : 'None'), act: 'team' }),
    row({ icon: 'shield', t: 'Spoiler shield', s: 'Scores hidden until you\'ve watched', v: esc(shield), act: 'shield' }),
    row({ icon: 'bell', t: 'Reminders', s: 'Remind me on a game is a Windows notification 10 min before tip-off, even when airglow is closed (in the tray)', v: String(reminders.length || ''), act: 'reminders' }),
  ], 'This PC keeps its own list of games you\'ve seen: one you watched on the TV stays hidden here until you reveal it.');
}
function languages() {
  const s = subSettings();
  return box('', [
    row({ icon: 'cc', t: 'Subtitles first in', v: esc((s.langs || []).slice(0, 2).join(', then ') || 'Off'), act: 'sublangs' }),
    row({ icon: 'globe', t: 'Find subtitles online', s: 'OpenSubtitles, when a copy has none in your languages', tog: !!s.online, act: 'subonline' }),
  ]);
}
function films() {
  const ads = AD.addons();
  const st = TM.status, pg = R.pageNow()?.src;
  const tmdbLine = !TM.hasKey() ? 'For the Home rows and Top rated: trending, the services, rows for what you like'
    : st.fail && st.lastAt > st.okAt ? `TMDB: not working right now · ${st.last}`
    : pg?.key ? `TMDB: working · ${pg.tmdb} of ${pg.rows} Home rows from TMDB` : st.ok ? 'TMDB: working · Home rows not worked out yet' : 'TMDB: set · Home asks it on its next visit';
  const sst = AD.stremioState();
  return box('Stremio account', [AD.stremioSignedIn() ? row({ icon: 'user', t: esc(sst?.email || 'Signed in'), s: 'Your add-ons come from your Stremio account', act: 'stremio-sync', v: 'Sync' }) : row({ icon: 'user', t: 'Sign in to Stremio', s: 'Your Stremio account\'s add-ons, kept in step', act: 'stremio' })])
    + box('Your add-ons', ads.length ? ads.map((a, i) => row({ icon: 'film', t: esc(AD.label(a)), s: esc(AD.givesLine(a)), v: a.on ? 'On' : 'Off', act: `ad:${i}` })) : [row({ icon: 'film', t: 'No add-ons yet', s: 'Sign in to Stremio, or add one by its link', chev: false })])
    + box('', [row({ icon: 'plus', t: 'Add an add-on by its link', s: 'Its manifest.json address', act: 'addlink' }), row({ icon: 'key', t: 'TMDB key', s: esc(tmdbLine), v: TM.hasKey() ? 'Set' : 'Not set', act: 'tmdb' })], 'This product uses the TMDB API but is not endorsed or certified by TMDB.');
}
function rowsGroup() {
  const off = R.rowsOff(), hid = R.hiddenRows();
  return box('Rows on Home', R.ROW_KINDS.map(([k, n]) => row({ icon: 'list', t: esc(n), tog: !off[k], act: `row:${k}` })))
    + box('', [
      Object.keys(hid).length ? row({ icon: 'eye', t: 'Hidden rows', s: esc(Object.values(hid).map((x) => x.name).join(', ')), v: 'Show again', act: 'unhide' }) : '',
      row({ icon: 'heart', t: 'Pick what you like', s: R.picked().length ? esc(R.picked().join(', ')) : 'Three genres start your rows', act: 'pick' }),
      row({ icon: 'refresh', t: 'Forget my taste', s: 'Home starts over from what you pick', act: 'forget' }),
    ]);
}
function windowsGroup() {
  const p = prefs || {};
  const dev = (devices || []).find((d) => d.id === p.audioDevice);
  return box('', [
    row({ icon: 'win', t: 'Start with Windows', s: 'In the tray, so reminders fire', tog: !!p.startWithWindows, act: 'p:startWithWindows' }),
    row({ icon: 'close', t: 'Close keeps airglow in the tray', s: 'Reminders need it', tog: p.closeToTray !== false, act: 'p:closeToTray' }),
    row({ icon: 'bell', t: 'Notifications', s: 'Tip-off reminders, an update ready', tog: p.notifications !== false, act: 'p:notifications' }),
  ]) + box('Player', [
    row({ icon: 'tv', t: 'Hardware decoding', s: 'mpv decodes on the graphics chip (d3d11va)', v: p.hwdec === 'off' ? 'Off' : 'Automatic', act: 'hwdec' }),
    row({ icon: 'eye', t: 'HDR', s: 'Passed through when Windows HDR is on', tog: p.hdr !== false, act: 'p:hdr' }),
    row({ icon: 'vol', t: 'Audio device', v: esc(dev?.name || 'Windows default'), act: 'audiodev' }),
    row({ icon: 'vol', t: 'Audio passthrough', s: 'AC3, DTS and EAC3 to a receiver over HDMI', tog: !!p.spdif, act: 'p:spdif' }),
    row({ icon: 'pip', t: 'The picture inside the window', s: 'Plan A (inside) or C (a window over it), if the picture misbehaves', v: p.plan === 'C' ? 'Over' : 'Inside', act: 'plan' }),
    row({ icon: 'ext', t: 'Open mpv.conf', s: 'Your own mpv options, read by mpv only', act: 'mpvconf' }),
  ], 'Player changes apply from the next picture.') + box('', [
    row({ icon: 'kbd', t: 'Keyboard shortcuts', s: 'Every key, the TV\'s words', v: '?', act: 'keys' }),
    row({ icon: 'win', t: 'Reset window layout', s: 'The sidebar, the mini player\'s place', act: 'resetwin' }),
  ]);
}
function updatesGroup() {
  const u = upd || {};
  const line = u.state === 'ready' ? `airglow ${esc(u.version)} is ready · Restart to update` : u.state === 'downloading' ? `Downloading ${esc(u.version || '')}${u.percent ? ` · ${u.percent}%` : ''}` : u.state === 'checking' ? 'Checking…' : u.state === 'error' ? `Couldn't check · ${esc(u.message || '')}` : u.state === 'dev' ? 'A development build: no updates' : 'Up to date';
  return box('', [
    row({ icon: 'refresh', t: line, s: `This is airglow ${esc(desktopInfo().version || 'dev')}`, v: u.state === 'ready' ? 'Restart' : 'Check', act: u.state === 'ready' ? 'install' : 'checkupd' }),
  ], 'Updates download quietly and install when you quit, or now with Restart. Never over the player.');
}
function about() {
  return box('', [
    row({ icon: 'bang', t: 'airglow', s: 'An ad-free player for your own provider', v: esc(desktopInfo().version || 'dev'), chev: false }),
    row({ icon: 'film', t: 'TMDB', s: 'This product uses the TMDB API but is not endorsed or certified by TMDB.', chev: false }),
    row({ icon: 'tv', t: 'mpv', s: 'Plays every copy: HEVC, MKV, AC3 / DTS, every subtitle format', chev: false }),
    ...(reportsAvailable() ? [row({ icon: 'bang', t: 'Send error reports', s: 'Errors only. Never your passwords, links or what you watch', tog: !settings().reportsOff, act: 'reports' }),
      row({ icon: 'refresh', t: 'Send a report now', s: 'Something not right? Send it, then tell Claude', act: 'reportnow' })] : []),
  ]);
}
// airglow account (design/ui-v1/accounts-v1 3.3, mock 08): devices, friends, security, sync and undo
const acctGroup = () => box('', groupRows(row), acct.me() ? 'Signing a device out removes your account\'s things from it the next time it is online; the device keeps working without an account until then.' : '');
const BODY = { acct: acctGroup, provider, playback, nba: nbaGroup, languages, films, rows: rowsGroup, windows: windowsGroup, updates: updatesGroup, about };
let reminders = [];
function draw() {
  if (!el) return;
  const y = el.querySelector('.ac-pane')?.scrollTop || 0;
  el.innerHTML = `<div class="ph-top"><h1>Account</h1><small>${esc(S.acc?.name || '')}</small></div><div class="ac-two"><nav class="ac-nav">${GROUPS.map(([k, n, i]) => `<button class="ac-g${grp === k ? ' sel' : ''}" data-grp="${k}">${ic(i)}<span>${esc(n)}</span>${k === 'updates' && upd.state === 'ready' ? '<i class="dotu"></i>' : ''}</button>`).join('')}</nav><div class="ac-pane"><h2>${esc(GROUPS.find((g) => g[0] === grp)[1])}</h2>${BODY[grp]()}</div></div>`;
  el.querySelector('.ac-pane').scrollTop = y;
}
// a real text field in a dialog (the TMDB key, a link)
export function input(title, { label, placeholder = '', type = 'text', hint = '', pass = false, onOk }) {
  const ov = sheet(`<h3>${esc(title)}</h3>${hint ? `<p class="tx">${esc(hint)}</p>` : ''}<label class="fld"><span>${esc(label)}</span><input id="acin" type="${pass ? 'password' : type}" placeholder="${esc(placeholder)}" spellcheck="false" autocomplete="off"></label><div class="si-err" id="acerr" hidden></div><div class="act2"><button class="ghost" data-act="no">Cancel</button><button class="pill noicon" data-act="ok">Save</button></div>`, {
    center: true,
    onClick: async (a, t, close) => {
      if (a === 'no') return close();
      if (a !== 'ok') return;
      const v = ov.el.querySelector('#acin').value.trim(), err = ov.el.querySelector('#acerr');
      try { t.textContent = 'Checking…'; await onOk(v); close(); draw(); } catch (e) { err.hidden = false; err.textContent = e.message || 'That didn\'t work'; t.textContent = 'Save'; }
    },
  });
  const inp = ov.el.querySelector('#acin');
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ov.el.querySelector('[data-act="ok"]').click(); });
  setTimeout(() => inp.focus(), 30);
}
function stremioSignIn() {
  const ov = sheet(`<h3>Sign in to Stremio</h3><p class="tx">Your add-ons come from your Stremio account. Your password goes only to Stremio.</p><label class="fld"><span>Email</span><input id="se" type="email" spellcheck="false" autocomplete="username"></label><label class="fld"><span>Password</span><input id="sp" type="password" autocomplete="current-password"></label><div class="si-err" id="serr" hidden></div><div class="act2"><button class="ghost" data-act="no">Cancel</button><button class="pill noicon" data-act="ok">Sign in</button></div>`, {
    center: true,
    onClick: async (a, t, close) => {
      if (a === 'no') return close();
      if (a !== 'ok') return;
      const err = ov.el.querySelector('#serr');
      try {
        t.textContent = 'Signing in…';
        await AD.stremioLogin(ov.el.querySelector('#se').value.trim(), ov.el.querySelector('#sp').value);
        const got = await AD.stremioCollection();
        AD.importFromStremio(got.usable.filter((x) => x.start && !AD.addons().some((y) => y.url === x.url)), got.usable.filter((x) => !x.start));
        close(); toast(`${got.usable.length} add-on${got.usable.length === 1 ? '' : 's'} from your Stremio account`); draw();
      } catch (e) { err.hidden = false; err.textContent = e.wrongEmail ? 'Stremio doesn\'t know that email' : e.message || 'Stremio didn\'t sign you in'; t.textContent = 'Sign in'; }
    },
  });
  setTimeout(() => ov.el.querySelector('#se')?.focus(), 30);
}
// Check the connection (the diagnosis' links, on a PC): the internet, the provider and the account, the last channel
// through mpv (what it would play), each drawn as it answers
async function connCheck() {
  const r = { inet: null, prov: null, ch: null };
  const line = (label, x, run) => `<div class="ck"><span class="dotk${x?.ok ? ' ok' : x ? ' bad' : ''}">${x ? ic(x.ok ? 'tick' : 'close') : '<span class="spin"></span>'}</span><b>${esc(label)}</b><span>${esc(x ? x.text : run)}</span></div>`;
  const ov = sheet('<h3>Check the connection</h3><p class="tx">This PC, your internet and your provider · about 10 s</p><div class="ck-out"></div><div class="act2"><button class="pill noicon" data-act="no">Done</button></div>', { center: true, onClick: (a, t, close) => close() });
  const paint = () => { const o = ov.el.querySelector('.ck-out'); if (o) o.innerHTML = line('Internet', r.inet, 'Checking…') + line('Provider', r.prov, r.inet ? 'Checking…' : 'Waiting') + line('The last channel', r.ch, r.prov ? 'Checking…' : 'Waiting'); };
  paint();
  let t0 = performance.now();
  try { await fetch('https://www.gstatic.com/generate_204', { cache: 'no-store', mode: 'no-cors' }); r.inet = { ok: true, text: `Answers in ${Math.round(performance.now() - t0)} ms` }; } catch { r.inet = { ok: false, text: 'No answer' }; }
  paint();
  t0 = performance.now();
  try { const d = await Promise.race([S.src.login(), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 8000))]); const f = accountFacts(); S.info = d || S.info; r.prov = { ok: f.active, text: `${f.active ? 'Account active' : f.status}${f.exp ? ` until ${f.exp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''} · ${Math.round(performance.now() - t0)} ms` }; } catch { r.prov = { ok: false, text: 'No answer' }; }
  paint();
  const { catalog } = await import('../tv/js/catalog.js');
  const { store, scoped } = await import('../tv/js/state.js');
  const ch = catalog.live?.byId.get(store.get(scoped('lastLive'), '')) || catalog.live?.items?.find((x) => !x._sep);
  const url = ch?.sources?.[0]?.url;
  if (!url || !T?.mpv) r.ch = { ok: false, text: url ? 'mpv is not here' : 'No channel yet' };
  else { const p = await T.mpv.probe(url); r.ch = p.ok ? { ok: true, text: `${ch.name} · ${p.line}` } : { ok: false, text: `${ch.name} · ${p.error || 'no picture'}` }; }
  paint();
}
async function setPref(k, v) { prefs = await T?.prefs?.set({ [k]: v }) || { ...prefs, [k]: v }; draw(); }
export default {
  name: 'account', tab: true,
  mount(root) {
    el = root;
    root.addEventListener('click', async (e) => {
      const g = e.target.closest('[data-grp]');
      if (g) { grp = g.dataset.grp; draw(); return; }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const a = b.dataset.act;
      if (a.startsWith('ag')) return groupAct(a, draw);
      if (a.startsWith('p:')) { const k = a.slice(2), on0 = (prefs || {})[k] ?? ['closeToTray', 'miniOnLeave', 'miniOnTop', 'notifications', 'hdr'].includes(k); return setPref(k, !on0); }
      if (a === 'signin') return import('./ui.js').then((u) => u.go('signin'));
      if (a === 'conncheck') return connCheck();
      if (a === 'refresh') { toast('Refreshing channels…'); refreshNow().then(() => { resetGuides(); toast('Channels are up to date'); draw(); }).catch((er) => toast(er?.message || 'Couldn\'t refresh the channels')); return; }
      if (a === 'signout') return confirm({ title: 'Sign out?', text: 'airglow forgets this provider on this PC. Your TV stays signed in.', yes: 'Sign out', onYes: () => { signOut(true); import('./ui.js').then((u) => u.go('signin')); } });
      if (a === 'team') return teamSheet(draw);
      if (a === 'shield') return shieldSheet(draw);
      if (a === 'reminders') return menu('Reminders', reminders.length ? reminders.map((r) => ({ label: r.title, sub: `${new Date(r.at).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · click to clear`, icon: 'bell', run: () => T.reminders.clear(r.id).then((l) => { reminders = l; draw(); }) })) : [{ label: 'No reminders', sub: 'Remind me on a game sets one', info: true }]);
      if (a === 'skipintro') return radio('Skip intro', [{ v: 'button', l: 'Button', sub: 'Skip intro shows; Enter skips' }, { v: 'auto', l: 'By itself' }, { v: 'off', l: 'Off' }], settings().skipIntro || 'button', (v) => { saveSettings({ skipIntro: v }); draw(); });
      if (a === 'sounds') { saveSettings({ sounds: settings().sounds === 'off' ? 'on' : 'off' }); draw(); return; }
      if (a === 'sublangs') { const cur = subSettings().langs || []; return radio('Subtitles first in', SUB_LANGS.map((l) => ({ v: l, l, sub: l === cur[0] && cur[1] ? `then ${cur.slice(1).join(', ')}` : '' })), cur[0], (v) => { saveSubSettings({ subLangs: [v, ...cur.filter((x) => x !== v)].slice(0, 3) }); draw(); }, { sub: 'The first one found shows. The others wait in the player' }); }
      if (a === 'subonline') { saveSubSettings({ subOnline: !subSettings().online }); draw(); return; }
      if (a === 'tmdb') return input('TMDB key', { label: 'API key (v3) or read access token', hint: 'From themoviedb.org › Settings › API. Paste it; it stays on this PC.', pass: true, onOk: async (v) => { const k = TM.cleanKey(v); if (!k) { TM.clearKey(); return; } if (!TM.looksLikeKey(k)) throw new Error('That doesn\'t look like a TMDB key'); const r = await TM.checkKey(k).catch(() => ({ ok: false, why: 'TMDB didn\'t answer' })); if (!r.ok) throw new Error(r.why); TM.setKey(k); } });
      if (a === 'stremio') return stremioSignIn();
      if (a === 'stremio-sync') { AD.stremioSync({ force: true, toast }).then(() => { toast('Add-ons are in step with Stremio'); draw(); }); return; }
      if (a === 'addlink') return input('Add an add-on', { label: 'Its link', placeholder: 'https://…/manifest.json', onOk: async (v) => { const r = await AD.readManifest(v); if (!r.ok) throw new Error(r.why === 'not a link airglow can open' ? 'That isn\'t a link airglow can open' : `That link gave ${r.why}`); AD.addAddon(r); } });
      if (a.startsWith('ad:')) {
        const ad = AD.addons()[+a.slice(3)];
        if (!ad) return;
        return menu(AD.label(ad), [{ label: ad.on ? 'Turn off' : 'Turn on', icon: ad.on ? 'close' : 'tick', run: () => { AD.setOn(ad, !ad.on); draw(); } }, { label: 'Remove', icon: 'close', run: () => { AD.removeAddon(ad); draw(); } }], { sub: AD.healthLine?.(ad) || '' });
      }
      if (a.startsWith('row:')) { const k = a.slice(4); R.setRowOn(k, !!R.rowsOff()[k]); draw(); return; }
      if (a === 'unhide') { Object.keys(R.hiddenRows()).forEach((id) => R.unhideRow(id)); draw(); return; }
      if (a === 'pick') return import('./home.js').then((h) => h.pickSheet());
      if (a === 'forget') return confirm({ title: 'Forget your taste?', text: 'Home forgets what you watched and picked, and starts over.', yes: 'Forget', onYes: () => { R.forgetTaste(); draw(); } });
      if (a === 'hwdec') return setPref('hwdec', prefs?.hwdec === 'off' ? 'auto-safe' : 'off');
      if (a === 'plan') return setPref('plan', prefs?.plan === 'C' ? 'A' : 'C');
      if (a === 'audiodev') { devices = devices || await T?.audioDevices?.() || []; return radio('Audio device', [{ v: '', l: 'Windows default' }, ...devices.filter((d) => d.id !== 'auto').map((d) => ({ v: d.id, l: d.name }))], prefs?.audioDevice || '', (v) => setPref('audioDevice', v)); }
      if (a === 'mpvconf') return T?.files?.mpvConf();
      if (a === 'keys') return import('./keys.js').then((k) => k.openSheet());
      if (a === 'resetwin') { try { localStorage.removeItem('tuner.dkRail'); } catch { /* none */ } toast('The window layout is reset'); return; }
      if (a === 'reports') { const on = !!settings().reportsOff; saveSettings({ reportsOff: !on }); setReports(on); draw(); return; }   // (the switch flips: on when it was off)
      if (a === 'reportnow') { const s2 = settings(); toast(sendNow({ ...(lastConnCheck() || {}), liveFormat: s2.liveFormat, player: s2.player }) ? 'Sent. Tell Claude it’s in' : 'Reports are off here'); return; }
      if (a === 'checkupd') return UPD.check();
      if (a === 'install') return UPD.install();
    });
    on('info', () => { if (isShown('account')) draw(); });
    on('addons', () => { if (isShown('account')) draw(); });
    UPD.onStatus((s) => { upd = s; if (isShown('account')) draw(); });
  },
  async enter(root, params) {
    if (params.open === 'addons' || params.open === 'tmdb') grp = 'films';
    if (params.open && GROUPS.some((g) => g[0] === params.open)) grp = params.open;
    draw();
    prefs = await T?.prefs?.get().catch(() => null) || prefs || {};
    upd = await Promise.resolve(UPD.status()).catch(() => upd) || upd;
    reminders = await T?.reminders?.list().catch(() => []) || [];
    draw();
    streams().then((s) => { strm = s; if (isShown('account')) draw(); });
    if (params.open === 'tmdb') root.querySelector('[data-act="tmdb"]')?.click();
  },
};
