// Account > Add-ons (design/ui-v1/addons/SPEC.md 3): the list, an add-on's sheet, Move, the four ways to add one and
// their screens (the Stremio code, email, what came from Stremio, Stremio's list, typing the link, the confirm, the
// setup card). account.js draws the pane from addonsPane() and passes its actions here.
// The home-network phone page (SPEC 3.5) needs the native side (PORT-NATIVE.md): until TunerPlayer.info() says
// phonePage, "Send a link from your phone" says it comes with an update, and the setup card's code opens the add-on's own
// setup page (its Install button puts it in his Stremio account, which airglow then reads).
import { esc, ic, dot } from '../util.js';
import { S, settings, on } from '../state.js';
import * as A from '../addons.js';
import { openOverlay, toast, contextMenu, scrollList, closeTop } from '../ui.js';
import { focus } from '../focus.js';
import { qrSvg } from '../qr.js';
import { native } from '../native.js';

const PUZZLE = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4.5a2 2 0 1 1 4 0V6h3.5a1 1 0 0 1 1 1v3.5H17a2 2 0 1 0 0 4h1.5V18a1 1 0 0 1-1 1H14v-1.5a2 2 0 1 0-4 0V19H6.5a1 1 0 0 1-1-1v-3.5H7a2 2 0 1 0 0-4H5.5V7a1 1 0 0 1 1-1H10z"/></svg>';
const LINK = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
const KEYS = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>';
export const SPIN = '<svg class="ic ad-spin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9"/></svg>';
const BANG = `<span class="ad-bang">${ic('bang')}</span>`;
const toggle = (on) => `<span class="onoff">${on ? 'On' : 'Off'}</span><span class="tg${on ? ' on' : ''}"><i></i></span>`;
const hm = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
const FROM = { stremio: 'from your Stremio account', list: 'from Stremio\'s list', phone: 'sent from your phone', typed: 'typed on the TV', link: 'added by link' };

// ---------- the pane (SPEC 3.1) ----------
export function addonsPane() {
  const l = A.addons(), st = A.stremioState();
  const stLine = st?.signedOut ? '' : st?.syncedAt ? ` · synced with Stremio ${hm(st.syncedAt)}` : '';
  let html = `<div class="t-title" style="margin-bottom:10px">Add-ons</div>
    <div class="arow fx" tabindex="-1" data-act="ad:add"><span class="grow" style="min-width:0">Add an add-on<div class="t-cap" style="margin-top:0">From your Stremio account, Stremio's list, or your phone</div></span><span class="av">${ic('plus', 'sm')}</span></div>`;
  if (st?.signedOut) html += `<div class="arow fx" tabindex="-1" data-act="ad:resign"><span class="grow" style="min-width:0">Stremio signed you out<div class="t-cap" style="margin-top:0">Your add-ons stay as they were</div></span><span class="av">Sign in again ${ic('chevR', 'sm')}</span></div>`;
  if (l.length) html += `<div class="ad-sec">Installed · ${l.length}<small>Order: whose details and catalogs come first${stLine}</small></div>`;
  html += l.map((a, i) => addonRow(a, i)).join('');
  if (st && !st.signedOut) html += `<div class="arow fx" tabindex="-1" data-act="ad:stremio" style="margin-top:8px"><span class="grow" style="min-width:0">Stremio account<div class="t-cap" style="margin-top:0">${st.keep === false ? 'Signed in · not kept in step' : 'Signed in · add-ons you install in Stremio show up here'}</div></span><span class="av">Sign out ${ic('chevR', 'sm')}</span></div>`;
  return html;
}
let moving = null;   // { key, from }
function addonRow(a) {
  const s = A.stateOf(a), lift = moving?.key === a.key;
  const right = lift ? `<span class="st on">${A.orderOf(a)} of ${A.addons().length}</span><span class="grip">${ic('chevU', 'sm')}${ic('chevD', 'sm')}</span>`
    : `<span class="st${s === 'on' ? ' on' : s === 'down' || s === 'gone' ? ' warn' : ''}">${s === 'down' || s === 'gone' ? BANG : s === 'checking' ? SPIN : ''}${esc(A.STATE_WORDS[s])}${ic('chevR', 'sm')}</span>`;
  const line2 = s === 'down' || s === 'gone' ? A.healthLine(a) : s === 'setup' ? 'Set up on your phone' : A.givesLine(a);
  return `<div class="ad-row fx${s === 'off' ? ' off' : ''}${lift ? ' lift' : ''}" tabindex="-1" data-act="ad:open" data-ad="${esc(a.key)}" data-key="ad:${esc(a.key)}" data-hold><span class="ad-lg">${esc(A.initialsOf(a))}</span><span class="grow"><span class="a">${esc(A.label(a))}</span><span class="b">${esc(line2)}</span></span>${right}</div>`;
}
// Entry focus: the first add-on, or Add an add-on when there are none
export const addonsEntry = '.ad-row, .arow';

let redraw = () => {};
export function addonsEnter(draw) {
  redraw = draw;
  A.refreshManifests();
  A.stremioSync({ toast }).then((r) => { if (r) draw(); }).catch(() => {});
}
on('addons', () => redraw());
export function addonsAct(act, el, draw) {
  redraw = draw;
  if (act === 'ad:add') return ways();
  if (act === 'ad:resign') return stremioCode();
  if (act === 'ad:stremio') return stremioOut();
  if (act === 'ad:open') { const a = A.byKey(el.dataset.ad); if (a) sheet(a); }
}
// Hold OK on an add-on row: Move (focused) · Turn off / on · Set up again on your phone · Remove (SPEC 3.1)
export function addonsHold(el, draw) {
  redraw = draw;
  const a = A.byKey(el.dataset.ad); if (!a) return;
  const rows = [
    { icon: 'sort', label: 'Move', run: () => startMove(a) },
    { icon: a.on ? 'close' : 'check', label: a.on ? 'Turn off' : 'Turn on', run: () => { A.setOn(a, !a.on); draw(); } },
    ...(a.manifest?.behaviorHints?.configurable ? [{ icon: 'phone', label: 'Set up again on your phone', run: () => setupCard(a) }] : []),
    { icon: 'close', label: a.from === 'stremio' ? 'Hide in airglow' : 'Remove from airglow', run: () => remove(a) },
  ];
  contextMenu(el, rows);
}
function remove(a) {
  const name = A.label(a);
  A.removeAddon(a);
  toast(a.from === 'stremio' ? `${name} is hidden in airglow. It stays in your Stremio account` : `${name} removed`);
  redraw();
}

// ---------- Move (SPEC 3.1.4): the row lifts; ▲▼ move it, OK drops, Back puts it back ----------
function startMove(a) {
  moving = { key: a.key, from: A.orderOf(a) - 1 };
  let dropped = false;
  redraw();
  const ov = openOverlay('<div style="position:absolute;left:-9999px" data-col><span class="fx" tabindex="-1" data-act="drop"></span></div>', {
    scrim: false,
    onKey: (k) => {
      if (k === 'up' || k === 'down') { const i = A.orderOf(a) - 1, to = i + (k === 'down' ? 1 : -1); if (to >= 0 && to < A.addons().length) { A.move(a, to); redraw(); keepInView(a); } return true; }
      if (k === 'ok') { dropped = true; ov.close(); return true; }
      return false;
    },
    onClose: () => {
      if (!dropped) A.move(a, moving.from);
      moving = null; redraw();
      requestAnimationFrame(() => focus(document.querySelector(`[data-screen="account"] [data-ad="${CSS.escape(a.key)}"]`)));
    },
  });
  keepInView(a);
}
function keepInView(a) {
  const r = document.querySelector(`[data-screen="account"] [data-ad="${CSS.escape(a.key)}"]`);
  r?.dispatchEvent(new CustomEvent('tvfocus', { bubbles: true }));   // (account.js scrolls the pane to it)
}

// ---------- an add-on's sheet (SPEC 3.1.3) ----------
function sheet(a) {
  const m = a.manifest || {};
  const draw = () => {
    const cats = (m.catalogs || []).map((c) => [c, A.catalogRole(c)]).filter(([, r]) => r);
    const typeWord = (t) => (t === 'movie' ? 'movies' : 'series');
    const catRows = cats.map(([c, role]) => {
      const nm = `${A.catalogName(a, c)} ${typeWord(c.type)}`;
      if (role === 'search') return `<div class="ad-lr"><span class="grow"><span class="a">${esc(nm)}</span><span class="b">Used by Search</span></span></div>`;
      const g = A.genreOf(c), yr = g?.isRequired && /^\d{4}$/.test(g.options?.[0] || '');
      const only = A.stateOf(a) !== 'off' && !A.coveredByStreams(a, c) ? ' · only titles your provider has' : '';
      const on = A.catalogOn(a, c);
      return `<div class="ad-lr fx" tabindex="-1" data-act="cat" data-cat="${esc(A.catalogKey(c))}"><span class="grow"><span class="a">${esc(nm)}</span><span class="b">A chip in ${c.type === 'movie' ? 'Movies' : 'Series'}${yr ? ' · this year first' : ''}${esc(only)}</span></span>${toggle(on)}</div>`;
    }).join('');
    const health = A.healthLine(a);
    const gv = A.gives(a);
    return `<div class="ad-head"><span class="ad-lg xl">${esc(A.initialsOf(a))}</span><div class="tx" style="min-width:0"><b class="ellipsis" style="display:block">${esc(A.label(a))}</b><span>Version ${esc(m.version || '?')} · ${esc(FROM[a.from] || 'added here')}</span></div></div>
      <div class="ad-gives">${gv.map(([t]) => `<span>${esc(t.split(' · ')[0])}</span>`).join('') || '<span class="dim">Nothing airglow shows yet</span>'}</div>
      ${health ? `<div class="ad-note" style="display:flex;gap:8px;align-items:center">${BANG}<span>${esc(health)}</span></div>` : ''}
      <div class="sheet-body"><div class="inner" data-col>
        <div class="ad-lr fx" tabindex="-1" data-act="use"><span class="grow"><span class="a">Use this add-on</span></span>${toggle(a.on)}</div>
        ${catRows ? `<div class="sec" style="padding:6px 12px 0">Catalogs · chips in Movies and Series</div>${catRows}` : ''}
        <div class="sec" style="padding:6px 12px 0">More</div>
        <div class="ad-lr fx" tabindex="-1" data-act="move"><span class="ico">${ic('sort')}</span><span class="grow"><span class="a">Move up or down</span><span class="b">${A.orderOf(a)} of ${A.addons().length}: whose details and catalogs come first</span></span></div>
        ${m.behaviorHints?.configurable ? `<div class="ad-lr fx" tabindex="-1" data-act="setup"><span class="ico">${ic('phone')}</span><span class="grow"><span class="a">Set it up again on your phone</span><span class="b">On its own setup page</span></span></div>` : ''}
        <div class="ad-lr fx" tabindex="-1" data-act="remove"><span class="ico">${ic('close')}</span><span class="grow"><span class="a">${a.from === 'stremio' ? 'Hide in airglow' : 'Remove from airglow'}</span><span class="b">${a.from === 'stremio' ? 'It stays in your Stremio account' : 'You can add it again any time'}</span></span></div>
      </div></div>`;
  };
  const ov = openOverlay(`<div class="sheet ad-sheet">${draw()}</div>`, {
    focusSel: '[data-act="use"]',
    onClick: (act, t) => {
      const at = document.activeElement?.dataset;
      if (act === 'use') A.setOn(a, !a.on);
      else if (act === 'cat') { const c = (m.catalogs || []).find((x) => A.catalogKey(x) === t.dataset.cat); if (c) A.setCatalog(a, c, !A.catalogOn(a, c)); }
      else if (act === 'move') { ov.close(false); return startMove(a); }
      else if (act === 'setup') { ov.close(false); return setupCard(a); }
      else if (act === 'remove') { ov.close(); return remove(a); }
      const sh = ov.el.querySelector('.sheet'); sh.innerHTML = draw(); scrollList(ov.el);
      focus(ov.el.querySelector(at?.cat ? `[data-cat="${CSS.escape(at.cat)}"]` : `[data-act="${at?.act || 'use'}"]`));
      redraw();
    },
  });
  scrollList(ov.el);
}

// ---------- adding one: the four ways (SPEC 3.2) ----------
function ways() {
  const phone = A.phonePageReady();
  const row = (act, icon, a, b, extra = '', dis = false) => `<div class="ad-lr fx${dis ? ' dis' : ''}" tabindex="-1" data-act="${act}"><span class="ico">${icon}</span><span class="grow"><span class="a">${a}</span><span class="b">${b}</span></span>${extra}</div>`;
  const ov = openOverlay(`<div class="menu ad-ways"><h3>Add an add-on</h3><div data-col>
    ${row('stremio', ic('user'), 'Use your Stremio account', 'Sign in once on your phone. Your add-ons come over', '<small>Easiest</small>')}
    ${row('list', ic('search'), 'Pick from Stremio\'s list', 'Official and community add-ons, chosen with the remote')}
    ${row('phone', ic('phone'), 'Send a link from your phone', phone ? 'For one you set up on a web page. Same home network' : 'Comes with the next airglow update', '', !phone)}
    ${row('type', KEYS, 'Type the link', 'On the TV keyboard')}</div>
    <div class="t-cap" style="padding:10px 12px 0;line-height:20px">Copies of films come from add-ons set up with a service like Real-Debrid. Add-ons that play torrents directly won't show anything here.</div></div>`, {
    focusSel: '[data-act="stremio"]',
    onClick: (act) => {
      if (act === 'stremio') { if (A.stremioSignedIn()) { ov.close(false); found(); } else stremioCode(); }
      else if (act === 'list') stremioList();
      else if (act === 'phone') phoneScreen();
      else if (act === 'type') typeLink();
    },
  });
}

// A full-screen step (no top bar): Back closes it and returns to what opened it
function full(html, opts = {}) { return openOverlay(`<div class="ad-full">${html}</div>`, { scrim: false, ...opts }); }

// ---------- Use your Stremio account: the code (SPEC 3.3) ----------
function stremioCode() {
  let code = null, alive = true, timer = 0, made = 0, renewed = false;
  const ov = full('<div data-step></div>', { onClose: () => { alive = false; clearTimeout(timer); } });
  const step = ov.el.querySelector('[data-step]');
  const draw = (err) => {
    const letters = code ? [...code.code].map((c) => `<span>${esc(c)}</span>`).join('') : '<span>·</span><span>·</span><span>·</span><span>·</span>';
    step.innerHTML = `<div class="abs t-head" style="left:48px;top:64px">Sign in to Stremio on your phone</div>
      <div class="abs" style="left:48px;top:118px;width:470px"><ol class="ad-steps"><li>Scan the code with your phone's camera, or open <b>link.stremio.com</b> and enter the letters below.</li><li>Sign in to Stremio. Any way works: Google, Apple, Facebook or email.</li><li>That's all. This screen moves on by itself.</li></ol>
      <div class="ad-code">${letters}</div>${renewed ? '<div class="t-cap" style="margin-top:10px">The last code ran out. Here\'s a new one</div>' : ''}</div>
      <div class="abs" style="left:616px;top:64px;width:296px;text-align:center"><div class="qrbox">${code ? qrSvg(code.link, 200) : '<div style="width:200px;height:200px"></div>'}</div><div class="t-cap" style="margin-top:10px">${code ? `link.stremio.com/${esc(code.code)}` : ''}</div></div>
      <div class="card ad-wait" data-row>${err ? `${BANG}<div class="grow"><b>Can't reach Stremio</b><div class="t-cap">Check the TV's internet, then try again</div></div><span class="btn2 sm fx" tabindex="-1" data-act="retry">Try again</span>` : `${SPIN}<div class="grow"><b>Waiting for you to sign in</b><div class="t-cap">airglow reads your add-on list. It never changes your Stremio account.</div></div>`}<span class="btn2 sm fx" tabindex="-1" data-act="email">Use email and password</span></div>`;
    focus(step.querySelector(err ? '[data-act="retry"]' : '[data-act="email"]'));
  };
  const make = async () => {
    try { code = await A.stremioCreateCode(); made = Date.now(); if (alive) { draw(); poll(); } }
    catch { if (alive) draw(true); }
  };
  const poll = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (!alive) return;
      if (Date.now() - made > 10 * 60e3) { renewed = true; return make(); }   // a code lasts 10 minutes, then a new one
      let key = null;
      try { key = await A.stremioReadCode(code.code); } catch {}
      if (!alive) return;
      if (key) { ov.close(false); found(); } else poll();
    }, 3000);
  };
  ov.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'retry') { draw(); make(); }
    if (b.dataset.act === 'email') { stremioEmail(); }
  });
  draw(); make();
}

// ---------- email and password (SPEC 3.3) ----------
function stremioEmail() {
  let err = '', errAt = '', busy = false;
  const ov = full('<div data-step></div>');
  const step = ov.el.querySelector('[data-step]');
  const fld = (id, label, ph, type = 'text') => `<div class="fld" data-row><div class="fl">${label}</div><input class="field fx" tabindex="-1" id="${id}" type="${type}" placeholder="${esc(ph)}" readonly spellcheck="false" autocomplete="off" style="width:100%"></div>`;
  const line = (at) => (err && errAt === at ? `<div class="ad-err">${BANG}<span>${esc(err)}</span></div>` : '');
  const draw = () => {
    const keep = { e: step.querySelector('#adEmail')?.value || '', p: step.querySelector('#adPass')?.value || '' };
    step.innerHTML = `<div class="abs t-head" style="left:48px;top:64px">Sign in with email</div>
      <div class="abs" data-col style="left:48px;top:118px;width:520px">${fld('adEmail', 'Email', 'you@example.com', 'email')}${line('email')}${fld('adPass', 'Password', 'Password', 'password')}${line('pass')}</div>
      <div class="abs row-flex" data-row style="left:48px;top:${300 + (err ? 30 : 0)}px;gap:14px"><span class="btn fx" tabindex="-1" data-act="signin" style="transform-origin:0 50%">${busy ? 'Signing in…' : 'Sign in'}</span><span class="t-cap">OK on a field opens the keyboard</span></div>
      <div class="abs card" data-col style="left:616px;top:118px;width:296px;padding:18px"><div class="ad-note" style="margin-bottom:14px">Signed up with Google, Apple or Facebook? Those accounts have no password here. Use the code instead.</div><span class="btn2 sm fx" tabindex="-1" data-act="code">Use the code instead</span></div>`;
    step.querySelector('#adEmail').value = keep.e; step.querySelector('#adPass').value = keep.p;
  };
  const go = async () => {
    const email = step.querySelector('#adEmail').value.trim(), pw = step.querySelector('#adPass').value;
    if (!email) { err = 'Enter the email of your Stremio account'; errAt = 'email'; draw(); return focus(step.querySelector('#adEmail')); }
    busy = true; err = ''; draw(); focus(step.querySelector('[data-act="signin"]'));
    try { await A.stremioLogin(email, pw); busy = false; ov.close(false); closeTop(); found(); }
    catch (e) {
      busy = false;
      if (e.wrongEmail) { err = 'No Stremio account uses this email'; errAt = 'email'; }
      else { err = e.code ? e.message : 'Can\'t reach Stremio. Check the TV\'s internet'; errAt = 'pass'; }
      draw(); focus(step.querySelector(errAt === 'email' ? '#adEmail' : '#adPass'));
    }
  };
  fieldKeys(ov.el, ['adEmail', 'adPass'], () => step.querySelector('[data-act="signin"]'));
  ov.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'signin' && !busy) go();
    if (b.dataset.act === 'code') ov.close();
  });
  draw(); focus(step.querySelector('#adEmail'));
}
// Text fields open the TV keyboard on OK (as on the sign-in screen); Enter on it moves on, Back closes it.
export function fieldKeys(root, order, after) {
  let opening = false;
  root.addEventListener('click', (e) => {
    const f = e.target.closest('input.field'); if (!f || !f.readOnly) return;
    opening = true; f.readOnly = false; f.blur(); f.focus(); opening = false;
    try { f.setSelectionRange(f.value.length, f.value.length); } catch {}
  });
  root.addEventListener('keydown', (e) => {
    const f = e.target.closest?.('input.field'); if (!f || f.readOnly) return;
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); f.readOnly = true; const i = order.indexOf(f.id); focus(i >= 0 && i < order.length - 1 ? root.querySelector('#' + order[i + 1]) : after()); }
    if (e.key === 'Escape' || e.keyCode === 4) { e.preventDefault(); e.stopPropagation(); f.readOnly = true; focus(f); }
  }, true);
  root.addEventListener('focusout', (e) => { const f = e.target.closest?.('input.field'); if (f && !f.readOnly && !opening) f.readOnly = true; });
}

// ---------- what came from Stremio (add-stremio-found) ----------
async function found() {
  const ov = full(`<div data-step><div class="abs t-head" style="left:48px;top:48px">Your Stremio add-ons</div><div class="abs t-body" style="left:48px;top:96px;display:flex;gap:10px;align-items:center">${SPIN}Reading your add-on list…</div></div>`);
  const step = ov.el.querySelector('[data-step]');
  let got;
  try { got = await A.stremioCollection(); } catch (e) {
    if (!ov.el.isConnected) return;
    step.innerHTML = `<div class="abs t-head" style="left:48px;top:48px">Your Stremio add-ons</div><div class="abs" data-row style="left:48px;top:110px;display:flex;gap:14px;align-items:center">${BANG}<span class="t-body">${esc(e.signedOut ? 'Stremio signed you out. Sign in again from Add an add-on.' : 'Can\'t reach Stremio. Check the TV\'s internet')}</span><span class="btn2 sm fx" tabindex="-1" data-act="close">OK</span></div>`;
    ov.el.querySelector('[data-act="close"]').onclick = () => ov.close();
    return focus(step.querySelector('.fx'));
  }
  if (!ov.el.isConnected) return;
  const have = new Set(A.addons().map((a) => a.key));
  const picks = got.usable.map((x) => ({ ...x, on: x.start, have: have.has('ad' + A.hashOf(x.url)) }));
  let keep = A.stremioState()?.keep !== false;
  const left = got.left.length ? `Left out: ${got.left.map((x) => `<b style="color:var(--a-text-2)">${esc(x.name)}</b> (${esc(x.why)})`).join(', ').replace(/, ([^,]*)$/, ' and $1')}.` : '';
  const draw = () => {
    const n = picks.filter((p) => p.on && !p.have).length;
    const fake = { manifest: null };
    step.innerHTML = `<div class="abs t-head" style="left:48px;top:48px">Your Stremio add-ons</div>
      <div class="abs t-body" style="left:48px;top:88px;color:var(--a-text-2)">${got.total} in your account. airglow can use ${got.usable.length} of them.</div>
      <div class="abs ad-imp" style="left:48px;top:128px;width:520px;bottom:27px"><div class="sheet-body" style="max-height:${left ? 300 : 370}px;padding:0"><div class="inner" data-col style="display:flex;flex-direction:column;gap:4px">
        ${picks.map((p, i) => { fake.manifest = p.manifest; return `<div class="ad-lr fx${p.have ? ' dis' : ''}" tabindex="-1" data-act="tick" data-i="${i}"><span class="ck${p.on || p.have ? ' on' : ''}">${p.on || p.have ? ic('check') : ''}</span><span class="ad-lg">${esc(A.initialsOf(fake))}</span><span class="grow"><span class="a">${esc(A.decode(p.manifest.name))}</span><span class="b">${esc(p.have ? 'Already added' : A.givesLine({ manifest: p.manifest, kind: {} }))}</span></span></div>`; }).join('')}
      </div></div>${left ? `<div class="ad-why" style="padding:8px 12px 0;line-height:20px">${left}</div>` : ''}</div>
      <div class="abs card" data-col style="left:600px;top:128px;width:312px;padding:18px;box-sizing:border-box">
        <div class="ad-lr fx" tabindex="-1" data-act="keep" style="padding:0 6px"><span class="grow"><span class="a">Keep in step</span><span class="b">with Stremio</span></span>${toggle(keep)}</div>
        <div class="ad-note" style="margin:8px 0 18px">Add or remove one in Stremio later, on any device, and it changes here too, when airglow starts or you open Add-ons.</div>
        <span class="btn fx" tabindex="-1" data-act="add" style="transform-origin:0 50%">${n ? `Add ${n} add-on${n > 1 ? 's' : ''}` : 'Done'}</span></div>`;
  };
  ov.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const at = b.dataset.act === 'tick' ? `[data-i="${b.dataset.i}"]` : `[data-act="${b.dataset.act}"]`;
    if (b.dataset.act === 'tick') { const p = picks[+b.dataset.i]; if (!p.have) p.on = !p.on; }
    else if (b.dataset.act === 'keep') { keep = !keep; A.setKeepInStep(keep); }
    else if (b.dataset.act === 'add') {
      const chosen = picks.filter((p) => p.on && !p.have);
      A.importFromStremio(chosen);
      ov.close(false); closeTop();
      redraw();
      if (chosen.length) toast(`${chosen.length} add-on${chosen.length > 1 ? 's' : ''} added from your Stremio account`);
      requestAnimationFrame(() => focus(document.querySelector('[data-screen="account"] .ad-row') || document.querySelector('[data-screen="account"] .arow')));
      return;
    }
    draw(); scrollList(ov.el); focus(step.querySelector(at));
  });
  draw(); scrollList(ov.el); focus(step.querySelector('[data-act="add"]'));
}

// Sign out of Stremio: logout, then forget the key; Keep the add-ons (focused) / Remove them too (SPEC 3.3)
function stremioOut() {
  const ov = openOverlay(`<div class="menu" style="left:50%;top:50%;transform:translate(-50%,-50%);width:460px"><h3>Sign out of Stremio?</h3><p class="t-body" style="padding:0 8px 12px">airglow forgets your Stremio sign-in on this TV. Your Stremio account doesn't change.</p>
    <div data-row class="row-flex" style="gap:12px;padding:4px 8px"><span class="btn fx" tabindex="-1" data-act="keep">Keep the add-ons</span><span class="btn2 fx" tabindex="-1" data-act="drop">Remove them too</span></div></div>`, {
    focusSel: '[data-act="keep"]',
    onClick: async (act) => { ov.close(); await A.stremioSignOut(act === 'keep'); toast('Signed out of Stremio'); redraw(); },
  });
}

// ---------- Pick from Stremio's list (SPEC 3.4) ----------
const LANG_NAMES = [['English', /\benglish\b/i], ['Icelandic', /\bicelandic|íslensk/i], ['Spanish', /\bspanish|español|castellano|latino\b/i], ['Portuguese', /\bportugu[eê]s[e]?|brasil|brazil(ian)?|pt-?br\b/i], ['French', /\bfrench|français|francais\b/i], ['German', /\bgerman|deutsch\b/i], ['Italian', /\bitalian[o]?\b/i], ['Dutch', /\bdutch|nederlands\b/i], ['Polish', /\bpolish|polski\b/i], ['Turkish', /\bturkish|türkçe\b/i], ['Arabic', /\barabic\b/i], ['Hindi', /\bhindi\b/i], ['Russian', /\brussian\b/i], ['Greek', /\bgreek\b/i], ['Hebrew', /\bhebrew\b/i], ['Romanian', /\bromanian\b/i], ['Czech', /\bczech\b/i], ['Hungarian', /\bhungarian\b/i], ['Swedish', /\bswedish\b/i], ['Norwegian', /\bnorwegian\b/i], ['Danish', /\bdanish\b/i], ['Finnish', /\bfinnish\b/i], ['Croatian', /\bcroatian\b/i], ['Serbian', /\bserbian\b/i], ['Bulgarian', /\bbulgarian\b/i], ['Ukrainian', /\bukrainian\b/i], ['Persian', /\bpersian|farsi\b/i], ['Vietnamese', /\bvietnamese\b/i], ['Thai', /\bthai\b/i], ['Indonesian', /\bindonesian\b/i], ['Korean', /\bkorean\b/i], ['Japanese', /\bjapanese\b/i], ['Chinese', /\bchinese\b/i]];
// A subtitle add-on whose name or description names a language and none of his is left out (v1.2 S3)
function otherLangsOnly(x, mine) {
  const t = `${x.manifest.name || ''} ${x.desc || ''}`;
  if (/your language|\d+\+?\s*languages|all languages|multi-?lang/i.test(t)) return false;
  const named = LANG_NAMES.filter(([, re]) => re.test(t)).map(([l]) => l);
  return named.length > 0 && !named.some((l) => mine.includes(l));
}
const kindOf = (m) => { const r = (m.resources || []).map((x) => (typeof x === 'string' ? x : x.name)); return r.includes('subtitles') ? 'subs' : r.includes('stream') ? 'extras' : r.includes('catalog') || r.includes('meta') ? 'catalogs' : 'other'; };
function stremioList() {
  let src = 'community', kind = 'subs', lists = {}, failed = false;
  const ov = full('<div data-step></div>');
  const step = ov.el.querySelector('[data-step]');
  const mine = settings().langs || ['English'];
  const draw = (focusSel) => {
    const all = lists[src];
    const rows0 = (all || []).filter((x) => kindOf(x.manifest) === kind);
    const out = kind === 'subs' ? rows0.filter((x) => otherLangsOnly(x, mine)) : [];
    const rows = rows0.filter((x) => !out.includes(x));
    const have = new Set(A.addons().map((a) => a.key));
    const chip = (grp, v, l, sel) => `<span class="chip fx${sel ? ' sel' : ''}" tabindex="-1" data-act="${grp}" data-v="${v}">${l}</span>`;
    const right = (x) => (have.has('ad' + A.hashOf(x.url)) ? `<span class="v">${ic('check', 'sm')}Added</span>` : x.manifest.behaviorHints?.configurationRequired ? `<span class="v">${ic('phone', 'sm')}Set up on your phone</span>` : `<span class="v">${ic('plus', 'sm')}Add</span>`);
    step.innerHTML = `<div class="abs t-head" style="left:48px;top:40px">Stremio's add-ons</div>
      <div class="abs t-cap" style="left:300px;top:52px">${all ? `${esc(src === 'official' ? 'Official' : 'Community')} · ${all.length}${out.length ? ` · ${out.length} for other languages left out` : ''}` : ''}</div>
      <div class="abs chips" data-row style="left:48px;top:88px">${chip('src', 'official', 'Official', src === 'official')}${chip('src', 'community', 'Community', src === 'community')}<span class="ad-cut" style="width:1px;height:24px;background:var(--a-border-strong);align-self:center;margin:0 6px"></span>${chip('kind', 'catalogs', 'Catalogs', kind === 'catalogs')}${chip('kind', 'subs', 'Subtitles', kind === 'subs')}${chip('kind', 'extras', 'Extras', kind === 'extras')}</div>
      <div class="abs t-cap" style="left:48px;top:134px">Copies of films come from add-ons set up with a service like Real-Debrid, not from this list.</div>
      <div class="abs sheet-body" style="left:40px;top:160px;width:880px;height:353px;padding:4px 8px"><div class="inner" data-col style="display:flex;flex-direction:column;gap:6px">
        ${!all ? `<div class="t-body" style="display:flex;gap:10px;align-items:center;padding:12px">${failed ? `${BANG}Stremio's list didn't come. <span class="btn2 sm fx" tabindex="-1" data-act="retry">Try again</span>` : `${SPIN}Reading Stremio's list…`}</div>`
        : rows.length ? rows.map((x, i) => `<div class="ad-row ad-lr fx" tabindex="-1" data-act="row" data-i="${i}" data-key="sl:${esc(A.hashOf(x.url))}" style="height:52px;margin:0"><span class="ad-lg">${esc(A.initialsOf({ manifest: x.manifest }))}</span><span class="grow"><span class="a">${esc(A.decode(x.manifest.name))}</span><span class="b" data-desc>${esc(x.desc)}</span></span>${right(x)}</div>`).join('')
        : '<div class="t-body" style="padding:12px;color:var(--a-text-2)">Nothing of this kind here.</div>'}
      </div></div>`;
    step._rows = rows;
    scrollList(ov.el);
    focus(step.querySelector(focusSel || '[data-act="row"]') || step.querySelector('.chip.sel[data-act="kind"]'));
  };
  const load = async (which) => {
    failed = false;
    try { lists[which] = await A.stremioList(which); } catch { failed = true; }
    if (ov.el.isConnected && which === src) draw();
  };
  ov.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'src') { src = b.dataset.v; draw(`[data-act="src"][data-v="${src}"]`); if (!lists[src]) load(src); }
    else if (a === 'kind') { kind = b.dataset.v; draw(`[data-act="kind"][data-v="${kind}"]`); }
    else if (a === 'retry') { draw(); load(src); }
    else if (a === 'row') {
      const x = step._rows[+b.dataset.i]; if (!x) return;
      const had = A.byKey('ad' + A.hashOf(x.url));
      if (had) return sheet(had);
      if (x.manifest.behaviorHints?.configurationRequired) return setupCard({ url: x.url, manifest: x.manifest });
      confirm({ url: x.url, manifest: x.manifest }, 'list', () => draw(`[data-i="${b.dataset.i}"]`));
    }
  });
  draw(); load(src);
}

// ---------- Type the link (the last resort) ----------
function typeLink() {
  let err = '';
  const ov = full('<div data-step></div>');
  const step = ov.el.querySelector('[data-step]');
  const draw = () => {
    const v = step.querySelector('#adUrl')?.value || '';
    step.innerHTML = `<div class="abs t-head" style="left:48px;top:64px">Type the add-on's link</div>
      <div class="abs t-body" style="left:48px;top:104px;width:620px;color:var(--a-text-2)">It ends in <b style="color:var(--a-text-1)">manifest.json</b>. A configured add-on's link holds your account details: airglow keeps it private.</div>
      <div class="abs" data-col style="left:48px;top:160px;width:720px"><div class="fld" data-row><div class="fl">Add-on link</div><input class="field fx" tabindex="-1" id="adUrl" type="url" placeholder="https://…/manifest.json" readonly spellcheck="false" autocomplete="off" style="width:100%"></div>${err ? `<div class="ad-err">${BANG}<span>${esc(err)}</span></div>` : ''}</div>
      <div class="abs row-flex" data-row style="left:48px;top:${err ? 290 : 262}px;gap:14px"><span class="btn fx" tabindex="-1" data-act="go" style="transform-origin:0 50%">Add</span><span class="t-cap">OK on the field opens the keyboard · Back returns</span></div>`;
    step.querySelector('#adUrl').value = v;
  };
  fieldKeys(ov.el, ['adUrl'], () => step.querySelector('[data-act="go"]'));
  ov.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act="go"]'); if (!b) return;
    const v = step.querySelector('#adUrl').value.trim();
    if (!v) { err = 'Type or paste the link first'; draw(); return focus(step.querySelector('#adUrl')); }
    b.textContent = 'Reading…';
    const r = await A.readManifest(v);
    if (!ov.el.isConnected) return;
    if (!r.ok) { err = `That link isn't an add-on: it sent ${r.why}`; draw(); return focus(step.querySelector('#adUrl')); }
    confirm(r, 'typed', () => { ov.close(false); closeTop(); });
  });
  draw(); focus(step.querySelector('#adUrl'));
}

// ---------- Send a link from your phone (SPEC 3.5): the native page server ----------
function phoneScreen() {
  if (!A.phonePageReady()) return toast('This comes with the next airglow update. Type the link instead.');
  const token = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 56]).join('');
  const code = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  let c = code(), addr = '', note = '', off = null, visited = false, t60 = 0, t10 = 0, open = true;
  const ov = full('<div data-step></div>', { onClose: () => { open = false; off?.remove?.(); clearTimeout(t60); clearTimeout(t10); native?.phone?.stop(); } });
  const step = ov.el.querySelector('[data-step]');
  const draw = () => {
    const url = addr ? `http://${addr}/${token}` : '';
    step.innerHTML = `<div class="abs t-head" style="left:48px;top:64px">Send a link from your phone</div>
      <div class="abs" style="left:48px;top:118px;width:470px"><ol class="ad-steps"><li>Scan the code with your phone on the same home network.</li><li>Paste the add-on's link. It usually ends in <b>manifest.json</b>.</li><li>Tap Send. The TV asks you before adding it.</li></ol>${note ? `<div class="t-cap" style="margin-top:6px">${esc(note)}</div>` : ''}</div>
      <div class="abs" style="left:616px;top:64px;width:296px;text-align:center"><div class="qrbox">${url ? qrSvg(url, 200) : '<div style="width:200px;height:200px"></div>'}</div><div class="t-cap" style="margin-top:10px">${esc(addr)} · code <b style="color:var(--a-text-1)">${c.slice(0, 3)} ${c.slice(3)}</b></div></div>
      <div class="card ad-wait" data-row>${SPIN}<div class="grow"><b>Waiting for your phone</b><div class="t-cap">The page closes in 10 minutes, or when you go back</div></div><span class="btn2 sm fx" tabindex="-1" data-act="type">Type the link instead</span></div>`;
    focus(step.querySelector('[data-act="type"]'));
  };
  (async () => {
    // (listening first, and each wait checked: Back during a wait still stops the page and drops the listener)
    const l = await native.phone.onEvent((e) => {
      if (!open) return;
      if (e.type === 'visit') visited = true;
      else if (e.type === 'locked') { c = code(); note = 'Too many wrong codes · here\'s a new one'; native.phone.start({ token, code: c, port: 8790 }).catch(() => {}); draw(); }
      else if (e.type === 'sent' && e.url) A.readManifest(e.url).then((r) => { if (!open) return; if (r.ok) confirm(r, 'phone', () => { ov.close(false); closeTop(); }); else toast(`That link isn't an add-on: it sent ${r.why}`, 4000); });
    });
    if (!open) { l?.remove?.(); return; }
    off = l;
    try { const r = await native.phone.start({ token, code: c, port: 8790 }); addr = r?.address || ''; } catch { note = 'The TV couldn\'t open its page. Type the link instead.'; }
    if (!open) { native.phone.stop(); return; }
    if (ov.el.isConnected) draw();
  })();
  t60 = setTimeout(() => { if (!visited && ov.el.isConnected) { note = 'Phone not getting through? It must be on your home network, not a guest network.'; draw(); } }, 60000);
  t10 = setTimeout(() => { if (ov.el.isConnected) ov.close(); }, 10 * 60e3);
  ov.el.addEventListener('click', (e) => { if (e.target.closest('[data-act="type"]')) typeLink(); });
  draw();
}

// ---------- the setup card (SPEC 3.7) ----------
// The add-on's own page (<base>/configure) sets it up; its Install button puts it in his Stremio account, which airglow
// reads every 5 s while this card is open. (With the native phone page, a pasted link comes back the phone's way too.)
function setupCard(a) {
  const page = `${A.baseOf(a.manifest?.behaviorHints?.configurationRequired ? a.url : A.baseOf(a.url).replace(/\/[^/]{25,}$/, ''))}/configure`;
  const signed = A.stremioSignedIn();
  const name = A.decode(a.manifest?.name || 'This add-on');
  const before = new Set(A.addons().map((x) => x.key));
  let timer = 0;
  const ov = openOverlay(`<div class="menu" style="left:50%;top:50%;transform:translate(-50%,-50%);width:600px;padding:22px"><div class="ad-head"><span class="ad-lg xl">${esc(A.initialsOf(a))}</span><div class="tx"><b>${esc(name)} needs setting up</b><span>It asks for your details on its own page</span></div></div>
    <div class="row-flex" style="gap:22px;margin-top:16px;align-items:flex-start"><div class="qrbox">${qrSvg(page, 148)}</div>
    <ol class="ad-steps" style="font-size:15px;line-height:22px"><li>Scan this to open its setup page on your phone.</li><li>Make your choices, then press <b>Install</b>.</li><li>${signed ? 'It goes to your Stremio account, and airglow picks it up here.' : 'Install puts it in a Stremio account: sign in to Stremio here first (Add an add-on, Use your Stremio account).'}</li></ol></div>
    <div class="card" style="margin-top:14px;padding:12px 16px;display:flex;gap:12px;align-items:center">${SPIN}<span class="t-cap">Waiting for your ${signed ? 'Stremio account' : 'phone'} · Back cancels</span></div></div>`, {
    onClose: () => clearTimeout(timer),
  });
  document.activeElement?.blur?.();
  const poll = () => {
    if (!signed) return;
    timer = setTimeout(async () => {
      if (!ov.el.isConnected) return;
      await A.stremioSync({ force: true }).catch(() => null);
      const fresh = A.addons().find((x) => !before.has(x.key) && x.manifest?.id === a.manifest?.id);
      if (fresh) { ov.close(); toast(`${A.label(fresh)} is set up`); redraw(); return; }
      poll();
    }, 5000);
  };
  poll();
}

// ---------- before adding: what it gives (SPEC 3.6) ----------
export function confirm(r, from, done) {
  const m = r.manifest || {}, name = A.decode(m.name || 'this add-on');
  const fake = { manifest: m, kind: {} };
  const gv = A.gives(fake);
  const shows = (m.types || []).some((t) => t === 'movie' || t === 'series');
  const notes = [`${name} sees which films you open.`];
  if (A.hasConfig(r.url) || m.behaviorHints?.configurable) notes.push('Its link holds your account details, so airglow keeps it private and never shows it in full.');
  if (m.behaviorHints?.p2p) notes.push('It says it uses torrents. airglow shows only its direct links.');
  if (m.behaviorHints?.adult) notes.push('It says it has adult content.');
  if (!shows) notes.push('airglow doesn\'t show what it gives yet.');
  const whereFrom = { list: 'From Stremio\'s list', phone: 'Sent from your phone just now', typed: 'Typed on the TV', stremio: 'From your Stremio account' }[from] || '';
  const ov = openOverlay(`<div class="menu" style="left:50%;top:50%;transform:translate(-50%,-50%);width:520px;padding:22px 22px 18px"><div class="ad-head"><span class="ad-lg xl">${esc(A.initialsOf(fake))}</span><div class="tx" style="min-width:0"><b>Add ${esc(name)}?</b><span>${esc(whereFrom)} · ${esc(A.hostOf(r.url))}</span></div></div>
    <div class="ad-gives" style="margin-top:14px">${gv.map(([t]) => `<span>${esc(t.split(' · ')[0])}</span>`).join('')}</div>
    <div class="ad-note" style="margin-top:12px">${notes.map(esc).join(' ')}</div>
    <div class="row-flex" data-row style="gap:20px;margin-top:18px">${shows ? '<span class="btn fx" tabindex="-1" data-act="add" style="transform-origin:0 50%">Add it</span>' : ''}<span class="btn2 fx" tabindex="-1" data-act="no">Cancel</span></div></div>`, {
    focusSel: shows && !m.behaviorHints?.adult ? '[data-act="add"]' : '[data-act="no"]',
    onClick: (act) => {
      ov.close(act !== 'add');
      if (act !== 'add') return;
      const a = A.addAddon({ url: r.url, manifest: m }, from);
      toast(`${A.label(a)} added`);
      redraw();
      done?.();
    },
  });
}
export { PUZZLE, LINK, sheet as openAddonSheet };
on('addon-toast', (m) => toast(m, 4000));
