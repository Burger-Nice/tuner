// First launch and sign-in: Welcome, then the type path (one field takes a full get.php link and fills the rest), a
// progress screen that opens Home as soon as channels are in, and three quick choices (team, spoilers, languages).
// Text fields open the TV keyboard only when you press OK on them.
import { $, esc, ic, brandImg, host } from '../util.js';
import { S, settings, saveSettings } from '../state.js';
import { ensure, catalog } from '../catalog.js';
import { signIn, switchTo } from '../session.js';
import { setShield, favTeam } from '../games.js';
import { teamSheet } from './account.js';
import { go, current } from '../router.js';
import { focus } from '../focus.js';
import { toast } from '../ui.js';

let el, step = 'welcome', err = '', errAt = '', add = false;
let seq = 0, tried = null, connected = false;   // the sign-in in flight (Back while connecting cancels it)
const TEAMS = window.NBA.TEAMS;
const lockup = (h) => `<img src="tv/brand/assets/lockup.svg" height="${h}" alt="airglow">`;

function welcome() {
  const saved = S.accounts;
  return `<div class="center-col" style="top:${saved.length ? 70 : 100}px">${lockup(64)}
    <div class="t-head" style="margin-top:34px">${add ? 'Add another provider' : 'Add your TV provider'}</div>
    <div class="t-body" style="margin-top:8px;width:560px;text-align:center">airglow plays the channels, films and series you already have. Paste your provider's link, or type the server, username and password.</div>
    ${err ? `<div class="t-body" style="margin-top:10px;color:var(--a-text-1);display:flex;align-items:center;gap:6px">${ic('info', 'sm')}<span>${esc(err)}</span></div>` : ''}
    <div class="row-flex" data-row style="gap:14px;margin-top:30px"><span class="btn fx" tabindex="-1" data-act="type">${ic('tv')}Type it here</span><span class="btn2 fx" tabindex="-1" data-act="m3u">Load an M3U link</span></div>
    ${saved.length ? `<div class="t-label" style="margin-top:28px">Saved accounts</div><div class="row-flex" data-row style="gap:12px;margin-top:10px;max-width:864px">${saved.slice(0, 3).map((a, i) => `<span class="btn2 fx" tabindex="-1" data-acc="${i}" style="max-width:260px"><span class="ellipsis">${esc(a.name)}</span></span>`).join('')}</div>` : ''}
  </div>`;
}
// An error sits under the field it's about (errAt 'server' or 'pass').
const errLine = (at) => (err && errAt === at ? `<div class="t-cap" style="margin:-8px 0 12px;color:var(--a-text-1);display:flex;align-items:center;gap:6px">${ic('info', 'sm')}<span>${esc(err)}</span></div>` : '');
const fld = (id, label, ph, type = 'text', val = '') => `<div class="fld" data-row><div class="fl">${label}</div><input class="field fx" tabindex="-1" id="${id}" type="${type}" placeholder="${esc(ph)}" value="${esc(val)}" readonly spellcheck="false" autocomplete="off" style="width:100%"></div>`;
function typeIt() {
  return `<div class="abs" style="left:48px;top:27px">${lockup(40)}</div>
    <div class="abs t-head" style="left:48px;top:96px">Type it here</div>
    <div class="abs" data-col style="left:48px;top:150px;width:520px">
      ${fld('fServer', 'Provider link or server', 'http://line.provider.tv:8080')}${errLine('server') || '<div class="t-cap" style="margin:-2px 0 12px">Paste a full get.php link and the rest fills in. OK opens the keyboard.</div>'}
      ${fld('fUser', 'Username', 'Username')}${fld('fPass', 'Password', 'Password', 'password')}${errLine('pass')}
    </div>
    <div class="abs row-flex" data-row style="left:48px;top:${err && errAt === 'pass' ? 458 : 440}px;gap:14px"><span class="btn fx" tabindex="-1" data-act="signin" style="transform-origin:0 50%">Sign in</span><span class="t-cap">Back returns to the choices</span></div>`;
}
function m3u() {
  return `<div class="abs" style="left:48px;top:27px">${lockup(40)}</div>
    <div class="abs t-head" style="left:48px;top:96px">Load an M3U link</div>
    <div class="abs" data-col style="left:48px;top:150px;width:620px">${fld('fUrl', 'Playlist link', 'https://example.com/playlist.m3u')}<div class="t-cap" style="margin:-2px 0 12px">An Xtream get.php link signs in as a full Xtream account, with movies and series.</div></div>
    <div class="abs row-flex" data-row style="left:48px;top:300px;gap:14px"><span class="btn fx" tabindex="-1" data-act="loadm3u" style="transform-origin:0 50%">Load</span><span class="t-cap" style="display:flex;align-items:center;gap:6px${err ? ';color:var(--a-text-1)' : ''}">${err ? `${ic('info', 'sm')}<span>${esc(err)}</span>` : 'Back returns to the choices'}</span></div>`;
}
function verifying(state) {
  const spin = '<svg class="ic" viewBox="0 0 24 24" style="width:28px;height:28px;color:var(--a-pink)"><path d="M12 3a9 9 0 1 0 9 9"/></svg>';
  const r = (done, t, v) => `<div class="vrow">${done ? `<span class="okdot">${ic('check')}</span>` : spin}<span class="grow">${t}</span><span class="t-cap">${esc(v)}</span></div>`;
  return `<div class="center-col" style="top:96px"><div class="t-head">Getting your provider ready</div>
    <div class="card" style="width:520px;margin-top:24px;padding:12px 20px">${r(state.ok, state.ok ? 'Connected' : 'Connecting', state.host || '')}${r(state.ch, 'Channels', state.ch ? state.ch.toLocaleString() : state.ok ? 'loading' : '')}${r(false, 'Movies and series', 'in the background')}</div>
    <div class="t-body" style="margin-top:18px">${state.ok ? 'Home opens as soon as channels are in. The rest loads in the background.' : 'Back cancels'}</div></div>`;
}
function choices() {
  const s = settings();
  const t = (grp, v, l, on) => `<span class="chip lg fx${on ? ' sel' : ''}" tabindex="-1" data-c="${grp}" data-v="${esc(v)}">${esc(l)}</span>`;
  const popular = ['MEM', 'BOS', 'GS', 'LAL', 'NY', 'MIA', 'DAL', 'DEN'];
  const team = favTeam();   // '' = None
  const teams = [...new Set([team, ...popular])].map((a) => TEAMS.find((x) => x.abbr === a)).filter(Boolean);
  const langs = s.langs || ['English'];
  return `<div class="abs" style="left:48px;top:27px">${lockup(40)}</div>
    <div class="abs t-head" style="left:48px;top:82px">Three quick choices</div><div class="abs t-body" style="left:48px;top:120px">You can change all three in Account. Back keeps these and skips ahead.</div>
    <div class="abs" style="left:48px;top:160px;width:864px"><div class="t-label" style="margin-bottom:8px">Your team</div>
      <div class="chips" data-row>${teams.map((x) => t('team', x.abbr, `${x.city} ${x.name}`, x.abbr === team)).join('')}${t('team', 'none', 'None', !team)}${t('more', '', 'More teams…', false)}</div>
      <div class="t-label" style="margin:16px 0 8px">Spoilers</div>
      <div class="chips" data-row>${[['off', 'Off'], ['mine', 'My team'], ['all', 'All games']].map(([v, l]) => t('shield', v, l, (s.shield || 'off') === v)).join('')}</div>
      <div class="t-cap" style="margin-top:8px">My team hides your team's score everywhere until you reveal it. Other games stay visible.</div>
      <div class="t-label" style="margin:16px 0 8px">Languages shown first</div>
      <div class="chips" data-row>${['English', 'Spanish', 'French', 'Swedish', 'Dutch', 'German', 'Icelandic'].map((l) => t('lang', l, l, langs.includes(l))).join('')}</div></div>
    <div class="abs" data-row style="left:48px;top:462px"><span class="btn fx" tabindex="-1" data-act="done" style="transform-origin:0 50%">Done</span></div>`;
}

function draw(state) {
  const html = step === 'type' ? typeIt() : step === 'm3u' ? m3u() : step === 'verify' ? verifying(state || {}) : step === 'choices' ? choices() : welcome();
  el.innerHTML = html;
  el._html = html;
  const entry = step === 'type' ? '#fServer' : step === 'm3u' ? '#fUrl' : step === 'choices' ? '[data-act="done"]' : step === 'verify' ? null : '.btn';
  if (entry) focus(el.querySelector(entry));
  else document.activeElement?.blur();   // the progress screen takes no focus, so a stray OK can't cancel it
}
const val = (id) => el.querySelector('#' + id)?.value.trim() || '';

// (the form it was typed into, even when what was typed was empty)
const formOf = (a) => a.form || (a.saved ? 'welcome' : a.type === 'm3u' && a.url ? 'm3u' : a.server ? 'type' : 'welcome');
// Back to the form it came from, the values kept. A wrong password lands on Password (cleared, to retype); a timeout or an
// unreachable server keeps everything and lands on Sign in, so trying again is one OK.
function backToForm(a, e) {
  err = e?.message || '';
  const wrong = /wrong username or password/i.test(err);                       // retype the password
  const missing = /enter (your|the)/i.test(err);                               // a field left empty: go to it
  errAt = e && (wrong || missing || /account is/i.test(err)) ? 'pass' : 'server';
  step = formOf(a);
  draw();
  if (step === 'type') {
    el.querySelector('#fServer').value = a.server || ''; el.querySelector('#fUser').value = a.username || '';
    if (!wrong) el.querySelector('#fPass').value = a.password || '';
    const empty = ['#fServer', '#fUser', '#fPass'].find((s) => !el.querySelector(s).value);
    if (e) focus(el.querySelector(missing && empty ? empty : wrong ? '#fPass' : '[data-act="signin"]'));
  }
  if (step === 'm3u') { el.querySelector('#fUrl').value = a.url || ''; if (e) focus(el.querySelector('[data-act="loadm3u"]')); }
}
async function run(a) {
  const my = ++seq, h = a.server ? host(a.server) : a.name || '';
  const gone = () => my !== seq;
  tried = a; connected = false;
  step = 'verify'; err = '';
  draw({ host: h });
  try {
    await (a.saved ? switchTo(a.saved, gone) : signIn(a, gone));
    if (gone()) return;
    connected = true;
    draw({ ok: true, host: h });
    if (a.saved) return go('home');
    const c = await ensure('live');
    draw({ ok: true, host: h, ch: c.items.length });
    if (!settings().setupDone) { step = 'choices'; draw(); }
    else go('home');
  } catch (e) {
    if (gone()) return;
    backToForm(a, e);
  }
}
function signInTyped() {
  let p;
  const typed = { type: 'xtream', server: val('fServer'), username: val('fUser'), password: val('fPass'), form: 'type' };
  try { p = window.Core.parseLogin(typed.server, typed.username, typed.password); } catch (e) { return backToForm(typed, e); }
  if (!p.username || !p.password) return backToForm(typed, new Error('Enter your username and password, or paste the full link.'));
  run({ type: 'xtream', ...p, name: host(p.server) });
}
function loadM3u() {
  const url = val('fUrl');
  if (!url) return backToForm({ type: 'm3u', url: '', form: 'm3u' }, new Error('Enter the playlist link.'));
  if (/get\.php\?.*username=/.test(url)) { const p = window.Core.parseLogin(url); return run({ type: 'xtream', ...p, name: host(p.server), form: 'm3u', url }); }
  run({ type: 'm3u', url, name: host(url), form: 'm3u' });
}
// A full get.php link pasted into the server field fills in the username and password.
function splitLink(input) {
  const v = input.value;
  if (!/username=/.test(v)) return;
  try { const p = window.Core.parseLogin(v); input.value = p.server; if (p.username) el.querySelector('#fUser').value = p.username; if (p.password) el.querySelector('#fPass').value = p.password; } catch {}
}
let opening = false;
function openField(f) {
  opening = true;
  f.readOnly = false;
  f.blur(); f.focus();   // re-focusing the now-editable field is what makes Android open the keyboard
  opening = false;
  try { f.setSelectionRange(f.value.length, f.value.length); } catch {}
}
function closeField(f, next) {
  f.readOnly = true;
  if (f.id === 'fServer') splitLink(f);
  if (next) focus(next); else focus(f);
}

export default {
  name: 'first',
  bar: false,
  mount(root) {
    el = root;
    root.addEventListener('click', (e) => {
      const f = e.target.closest('input.field');
      if (f) { if (f.readOnly) openField(f); return; }
      const ch = e.target.closest('[data-c]');
      if (ch) {
        const { c, v } = ch.dataset, s = settings();
        if (c === 'more') return teamSheet(() => { draw(); focus(el.querySelector('[data-c="team"].sel') || el.querySelector('[data-c="more"]')); });
        if (c === 'team') saveSettings({ nbaTeam: v || 'none' });
        if (c === 'shield') setShield(v);
        if (c === 'lang') { let l = s.langs || ['English']; l = l.includes(v) ? l.filter((x) => x !== v) : [...l, v]; saveSettings({ langs: l.length ? l : ['English'] }); }
        const keep = `[data-c="${c}"][data-v="${CSS.escape(v)}"]`;
        draw(); focus(el.querySelector(keep));
        return;
      }
      const b = e.target.closest('[data-act],[data-acc]');
      if (!b) return;
      if (b.dataset.acc != null) { const a = S.accounts[+b.dataset.acc]; run({ name: a.name, saved: a }); return; }
      const a = b.dataset.act;
      if (a === 'type') { step = 'type'; err = ''; draw(); }
      else if (a === 'm3u') { step = 'm3u'; err = ''; draw(); }
      else if (a === 'signin') signInTyped();
      else if (a === 'loadm3u') loadM3u();
      else if (a === 'done') { saveSettings({ setupDone: true }); go('home'); }
    });
    // Enter on the TV keyboard closes it and moves on; Back closes it too.
    root.addEventListener('keydown', (e) => {
      const f = e.target.closest?.('input.field');
      if (!f || f.readOnly) return;
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); const order = ['fServer', 'fUser', 'fPass']; const i = order.indexOf(f.id); closeField(f, i >= 0 && i < 2 ? el.querySelector('#' + order[i + 1]) : el.querySelector('.btn')); }
      if (e.key === 'Escape' || e.keyCode === 4) { e.preventDefault(); e.stopPropagation(); closeField(f); }
    }, true);
    root.addEventListener('focusout', (e) => { const f = e.target.closest?.('input.field'); if (f && !f.readOnly && !opening) { f.readOnly = true; if (f.id === 'fServer') splitLink(f); } });
  },
  enter(root, params) {
    add = !!params.add; err = params.error || '';
    step = 'welcome';
    draw();
  },
  back() {
    if (step === 'type' || step === 'm3u') { step = 'welcome'; err = ''; draw(); return true; }
    if (step === 'choices') { saveSettings({ setupDone: true }); go('home'); return true; }
    if (step === 'welcome' && add && S.acc) { go('account'); return true; }
    // While connecting, Back cancels (the answer, if it still comes, is ignored); once connected Home is seconds away.
    if (step === 'verify' && !connected && tried) { seq++; backToForm(tried); return true; }
    return step === 'verify';
  },
};
