// Account (SPEC 3.8, 08): a pushed page with Back (no avatar on it), the TV's groups as grouped lists: Provider (the
// line, Active, expiry, Connections, Check streams on this iPhone, Refresh), Playback, NBA (your team, the shield),
// Films and series (add-ons and the Stremio account, the TMDB key), App (version: AltStore refreshes it; Sign out).
import { S, on, settings } from '../tv/js/state.js';
import { accountFacts, signOut } from '../tv/js/session.js';
import { refreshNow, cacheAt } from '../tv/js/catalog.js';
import { resetGuides } from '../tv/js/guide.js';
import { shieldMode, favTeam } from '../tv/js/games.js';
import * as AD from '../tv/js/addons.js';
import * as TM from '../tv/js/tmdb.js';
import * as R from '../tv/js/rows.js';
import { toast } from '../tv/js/ui.js';
import { phoneInfo } from './bridge.js';
import { ic, esc, back, go, isShown, sheet, confirm, menu } from './ui.js';
import { checkStreams } from './streams.js';
import { teamSheet, shieldSheet } from './nba.js';

let el, sub = null;   // sub: null | 'addons'
const CHECK = 'tuner.phCheck';
const lastCheck = () => { try { return JSON.parse(localStorage.getItem(CHECK) || 'null'); } catch { return null; } };
let checking = null;
const row = ({ icon, g, t, s, v, vcls = '', act, chev = true, tog }) => `<button class="ac-row"${act ? ` data-act="${act}"` : ''}><span class="ico${g ? ' g' : ''}">${ic(icon)}</span><span class="col"><span class="t">${t}</span>${s ? `<span class="s">${s}</span>` : ''}</span>${v != null ? `<span class="v ${vcls}">${v}</span>` : ''}${tog != null ? `<span class="tog${tog ? '' : ' off'}"></span>` : chev && act ? ic('chevR', 'chev') : ''}</button>`;
const group = (h, rows, foot = '') => `<div class="ac-group"><div class="h">${esc(h)}</div><div class="box">${rows.join('')}</div>${foot ? `<div class="foot">${foot}</div>` : ''}</div>`;
function checkHtml() {
  const c = checking || lastCheck();
  if (!c) return '';
  const line = (k, name) => { const x = c[k]; if (!x) return ''; return `<div class="r"><span class="dotk${x.state === 'ok' ? ' ok' : ''}">${x.state === 'ok' ? ic('tick') : x.state === 'checking' ? '<span class="spin" style="width:14px;height:14px;border-width:2px"></span>' : ic('close')}</span><span><b>${name}</b> · ${esc(x.text)}</span></div>`; };
  return `<div class="chk">${line('live', 'Live')}${line('catchup', 'Replays (from tip-off)')}${c.at ? `<div class="r" style="color:var(--a-text-3)">Checked ${new Date(c.at).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</div>` : ''}</div>`;
}
function mainHtml() {
  const f = S.acc ? accountFacts() : null;
  const host = (() => { try { return new URL(S.acc?.server || S.acc?.url || '').host; } catch { return S.acc?.name || ''; } })();
  const exp = f?.exp ? `Expires ${f.exp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}${f.days != null ? ` · ${f.days} days left` : ''}` : S.acc?.type === 'm3u' ? 'M3U playlist' : '';
  const tmdb = TM.hasKey() ? 'Set' : 'Not set';
  const st = TM.status, pg = R.pageNow()?.src;
  const tmdbLine = !TM.hasKey() ? 'For the Home rows and Top rated: trending, the services, rows for what you like'
    : st.fail && st.lastAt > st.okAt ? `TMDB: not working right now · ${st.last}`
    : pg?.key ? `TMDB: working · ${pg.tmdb} of ${pg.rows} Home rows from TMDB` : st.ok ? 'TMDB: working · Home rows not worked out yet' : 'TMDB: set · Home asks it on its next visit';
  const ads = AD.addons();
  const team = window.NBA.team(favTeam());
  const info = phoneInfo();
  const shield = { off: 'Off', mine: 'My team', all: 'All games' }[shieldMode()];
  return `<div class="ph-top"><button class="ph-back" data-act="back" aria-label="Back">${ic('back')}</button><h1>Account</h1></div><div class="ac-list">
    ${group('Provider', [
      row({ icon: 'server', g: true, t: esc(host || 'Provider'), s: esc(exp), v: f ? (f.active ? `${ic('tick')}${esc(f.status === 'Playlist' ? 'Playlist' : 'Active')}` : esc(f.status)) : '', vcls: f?.active ? 'ok' : 'bad', chev: false }),
      f?.cons ? row({ icon: 'wifi', t: 'Connections', s: `${esc(f.cons)} · one stream each for the TV and this iPhone`, chev: false }) : '',
      row({ icon: 'phone', t: 'Check streams on this iPhone', s: 'Tries a live channel and a replay the way the player does, and says if each plays here', act: 'check' }),
      row({ icon: 'refresh', t: 'Refresh channels and guide', s: cacheAt('live') ? `Channels from ${new Date(cacheAt('live')).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : '', act: 'refresh' }),
    ], checkHtml())}
    ${group('Playback', [
      row({ icon: 'pip', t: 'Picture in picture and AirPlay', s: 'The two buttons on the video, top right', chev: false }),
      row({ icon: 'ext', t: 'Streams this iPhone can\'t play', s: 'MKV copies, and channels the provider won\'t send as HLS: Open in VLC or Infuse', chev: false }),
    ])}
    ${group('NBA', [
      row({ icon: 'ball', t: 'Your team', v: esc(team ? team.name : 'None'), act: 'team' }),
      row({ icon: 'shield', t: 'Spoiler shield', s: 'Scores hidden until you\'ve watched, on this iPhone', v: esc(shield), act: 'shield' }),
    ], 'This iPhone keeps its own list of games you\'ve seen: one you watched on the TV stays hidden here until you reveal it.')}
    ${group('Films and series', [
      row({ icon: 'film', t: 'Add-ons', s: esc(ads.length ? ads.map((a) => AD.label(a)).slice(0, 3).join(', ') : 'None yet'), v: String(ads.length), act: 'addons' }),
      row({ icon: 'key', t: 'TMDB key', s: esc(tmdbLine), v: esc(tmdb), act: 'tmdb' }),
    ])}
    ${group('App', [
      row({ icon: 'phone', t: 'Version', s: 'AltStore refreshes it', v: esc(info.version || 'dev'), chev: false }),
      row({ icon: 'out', t: 'Sign out', act: 'signout' }),
    ], 'airglow · an ad-free player for your own provider.')}
  </div>`;
}
function addonsHtml() {
  const ads = AD.addons();
  const st = AD.stremioState();
  return `<div class="ph-top"><button class="ph-back" data-act="up" aria-label="Back">${ic('back')}</button><h1>Add-ons</h1></div><div class="ac-list">
    ${group('Stremio account', [AD.stremioSignedIn() ? row({ icon: 'user', g: true, t: esc(st?.email || 'Signed in'), s: 'Your add-ons come from your Stremio account', act: 'stremio-sync', v: 'Sync' }) : row({ icon: 'user', g: true, t: 'Sign in to Stremio', s: 'Your Stremio account\'s add-ons, kept in step', act: 'stremio' })])}
    ${group('Your add-ons', ads.length ? ads.map((a, i) => row({ icon: 'film', t: esc(AD.label(a)), s: esc(AD.givesLine(a)), v: a.on ? 'On' : 'Off', act: `ad:${i}` })) : [row({ icon: 'film', t: 'No add-ons yet', s: 'Sign in to Stremio, or add one by its link', chev: false })])}
    ${group('By link', [row({ icon: 'plus', t: 'Add an add-on by its link', s: 'Its manifest.json address', act: 'addlink' })])}
  </div>`;
}
function draw() {
  if (!el) return;
  el.innerHTML = sub === 'addons' ? addonsHtml() : mainHtml();
}
function input(title, { label, placeholder = '', type = 'text', hint = '', pass = false, onOk, mode = 'url' }) {
  const ov = sheet(`<h3>${esc(title)}</h3>${hint ? `<p class="tx">${esc(hint)}</p>` : ''}<div style="padding:0 16px"><label class="si-lab" style="font:var(--ph-label);color:var(--a-text-2)">${esc(label)}</label><div class="si-in"><input id="acin" type="${pass ? 'password' : type}" placeholder="${esc(placeholder)}" inputmode="${mode}" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off"></div><div class="si-err" id="acerr" hidden></div></div><div class="act2" style="margin-top:12px"><button class="ghost" data-act="no">Cancel</button><button class="pill noicon" data-act="ok">Save</button></div>`, {
    onClick: async (a, t, close) => {
      if (a === 'no') return close();
      if (a !== 'ok') return;
      const v = ov.el.querySelector('#acin').value.trim(), err = ov.el.querySelector('#acerr');
      try { t.textContent = 'Checking…'; await onOk(v); close(); draw(); } catch (e) { err.hidden = false; err.textContent = e.message || 'That didn\'t work'; t.textContent = 'Save'; }
    },
  });
  setTimeout(() => ov.el.querySelector('#acin')?.focus(), 300);
}
async function stremioSignIn() {
  const ov = sheet(`<h3>Sign in to Stremio</h3><p class="tx">Your add-ons come from your Stremio account. Your password goes only to Stremio.</p><div style="padding:0 16px"><label style="font:var(--ph-label);color:var(--a-text-2)">Email</label><div class="si-in"><input id="se" type="email" inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="username"></div><label style="display:block;margin-top:12px;font:var(--ph-label);color:var(--a-text-2)">Password</label><div class="si-in"><input id="sp" type="password" autocomplete="current-password"></div><div class="si-err" id="serr" hidden></div></div><div class="act2" style="margin-top:12px"><button class="ghost" data-act="no">Cancel</button><button class="pill noicon" data-act="ok">Sign in</button></div>`, {
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
}
async function runCheck() {
  checking = { at: 0 };
  draw();
  try {
    await checkStreams((k, x) => { checking[k] = x; if (isShown('account')) draw(); });
  } catch (e) { checking.live = checking.live || { state: 'bad', text: e.message || 'The check failed' }; }
  checking.at = Date.now();
  try { localStorage.setItem(CHECK, JSON.stringify(checking)); } catch { /* none */ }
  const c = checking; checking = null;
  if (isShown('account')) draw();
  void c;
}
export default {
  name: 'account', tabs: true,
  mount(root) {
    el = root;
    root.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const a = b.dataset.act;
      if (a === 'back') return back();
      if (a === 'up') { sub = null; draw(); return; }
      if (a === 'check') { if (!checking) runCheck(); return; }
      if (a === 'refresh') { toast('Refreshing channels…'); refreshNow().then(() => { resetGuides(); toast('Channels are up to date'); draw(); }).catch((er) => toast(er?.message || 'Couldn\'t refresh the channels')); return; }
      if (a === 'team') return teamSheet(draw);
      if (a === 'shield') return shieldSheet(draw);
      if (a === 'addons') { sub = 'addons'; draw(); AD.stremioSync({ toast }).then((r) => { if (r) draw(); }).catch(() => {}); return; }
      if (a === 'tmdb') return input('TMDB key', { label: 'API key (v3) or read access token', hint: 'From themoviedb.org › Settings › API. It stays on this iPhone.', pass: true, mode: 'text', onOk: async (v) => { const k = TM.cleanKey(v); if (!k) { TM.clearKey(); return; } if (!TM.looksLikeKey(k)) throw new Error('That doesn\'t look like a TMDB key'); const r = await TM.checkKey(k).catch(() => ({ ok: false, why: 'TMDB didn\'t answer' })); if (!r.ok) throw new Error(r.why); TM.setKey(k); } });
      if (a === 'signout') return confirm({ title: 'Sign out?', text: 'airglow forgets this provider on this iPhone. Your TV stays signed in.', yes: 'Sign out', onYes: () => { signOut(true); go('signin'); } });
      if (a === 'stremio') return stremioSignIn();
      if (a === 'stremio-sync') { AD.stremioSync({ force: true, toast }).then(() => { toast('Add-ons are in step with Stremio'); draw(); }); return; }
      if (a === 'addlink') return input('Add an add-on', { label: 'Its link', placeholder: 'https://…/manifest.json', onOk: async (v) => { const r = await AD.readManifest(v); if (!r.ok) throw new Error(`That link gave ${r.why}`); AD.addAddon(r); } });
      if (a.startsWith('ad:')) {
        const ad = AD.addons()[+a.slice(3)];
        if (!ad) return;
        return menu(AD.label(ad), [{ label: ad.on ? 'Turn off' : 'Turn on', icon: ad.on ? 'close' : 'tick', run: () => { AD.setOn(ad, !ad.on); draw(); } }, { label: 'Remove', icon: 'close', run: () => { AD.removeAddon(ad); draw(); } }], { sub: AD.healthLine?.(ad) || '' });
      }
    });
    on('info', () => { if (isShown('account')) draw(); });
    on('addons', () => { if (isShown('account')) draw(); });
  },
  enter(root, params) { sub = params.open === 'addons' ? 'addons' : null; draw(); if (params.open === 'tmdb') root.querySelector('[data-act="tmdb"]')?.click(); },
};
void settings;
