// Sign in (SPEC 3.8, 09): the lockup, the three steps, the provider card (Xtream Codes · M3U link) with labelled fields
// and the attributes that make an iPhone type them right (review 2, S4: no capitals, no autocorrect, the URL keyboard,
// Passwords can fill them). Then the team and the shield, as on the TV; films come from Account › Add-ons.
import { S } from '../tv/js/state.js';
import { signIn } from '../tv/js/session.js';
import { ensure } from '../tv/js/catalog.js';
import { ic, esc, go } from './ui.js';
import { teamSheet, shieldSheet } from './nba.js';
import * as acct from '../tv/js/account/acct.js';
import { cardHtml, finishSignIn, showToggle } from './acctui.js';

let el, mode = 'xtream', step = 1, busy = false, err = '';
// airglow accounts (design/ui-v1/accounts-v1 05, 06 on the PC): the sign-in card leads; 'provider' is today's path
let am = 'in', ast = {};
const host = (u) => { try { return new URL(/^https?:/i.test(u) ? u : `http://${u}`).host; } catch { return u; } };
const val = (id) => el.querySelector(`#${id}`)?.value.trim() || '';
const field = (id, label, attrs) => `<label for="${id}">${label}</label><div class="si-in"><input id="${id}" ${attrs}></div>`;
function draw() {
  if (am !== 'provider' && step === 1) {
    el.innerHTML = `<div class="si"><div class="si-lockup"><img src="tv/brand/assets/lockup.svg" alt="airglow"><p>Your channels, your team, your films.<br>Ad-free, from your own provider.</p></div>${err && am === 'in' && !ast.err ? `<div class="si-err" style="margin:0 0 10px">${esc(err)}</div>` : ''}${cardHtml(am, ast)}</div>`;
    return;
  }
  const steps = [['Provider', 'the login you gave the TV'], ['Your team', 'and the spoiler shield'], ['Films', 'TMDB, add-ons']].map(([t, s], i) => `<span class="${step === i + 1 ? 'cur' : ''}">${i + 1} · ${t}<small>${s}</small></span>`).join('');
  let card;
  if (step === 1) {
    const x = mode === 'xtream';
    card = `<div class="si-card"><h2><span class="ico">${ic('key')}</span>Your provider</h2><p>Type the login you gave the TV once, or paste it. It stays on this PC.</p>
      <div class="chips"><button class="chip${x ? ' sel' : ''}" data-mode="xtream">Xtream Codes</button><button class="chip${x ? '' : ' sel'}" data-mode="m3u">M3U link</button></div>
      <form id="siForm" autocomplete="on" onsubmit="return false">${x
        ? field('siServer', 'Server', 'type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="url" placeholder="line.provider.tv:8080" enterkeyhint="next"')
          + field('siUser', 'Username', 'type="text" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="username" enterkeyhint="next"')
          + `<label for="siPass">Password</label><div class="si-in"><input id="siPass" type="password" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="current-password" enterkeyhint="go"><button type="button" class="show" data-act="show">Show</button></div>`
        : field('siUrl', 'Playlist link', 'type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="url" placeholder="http://…/get.php?username=…" enterkeyhint="go"')}
      ${err ? `<div class="si-err">${esc(err)}</div>` : ''}
      <button type="submit" class="pill${busy ? '' : ''} noicon" data-act="go" id="siGo">${busy ? 'Signing in…' : 'Sign in'}</button></form></div>
      ${acct.me() ? '<button class="ghost" data-act="skipprov" style="margin-top:12px;width:100%">Skip for now</button>' : ''}
      <div class="si-next">${acct.me() ? 'Your provider joins your account: your other screens get it by themselves.' : 'Then your team and the spoiler shield, as on the TV.'}</div>`;
  } else {
    const team = window.NBA.team(window.Core.settings().nbaTeam || 'MEM');
    card = `<div class="si-card"><h2><span class="ico">${ic('ball')}</span>Your team</h2><p>Its games lead Home and the NBA tab, and the spoiler shield follows it.</p>
      <div class="ac-group" style="margin-top:14px"><div class="box"><button class="ac-row" data-act="team"><span class="col"><span class="t">Your team</span></span><span class="v">${esc(team ? team.name : 'None')}</span>${ic('chevR', 'chev')}</button><button class="ac-row" data-act="shield"><span class="col"><span class="t">Spoiler shield</span><span class="s">Scores hidden until you've watched</span></span><span class="v">${esc({ off: 'Off', mine: 'My team', all: 'All games' }[window.Core.settings().shield || 'off'])}</span>${ic('chevR', 'chev')}</button></div></div>
      <button class="pill noicon" data-act="done">Done</button></div><div class="si-next">Films and series: add your Stremio add-ons and the TMDB key in Account.</div>`;
  }
  el.innerHTML = `<div class="si"><div class="si-lockup"><img src="tv/brand/assets/lockup.svg" alt="airglow"><p>Your channels, your team, your films.<br>Ad-free, from your own provider.</p></div><div class="si-steps">${steps}</div>${card}<div class="si-note">Your login goes only to your provider.</div></div>`;
}
const aval = (id) => el.querySelector(`#${id}`)?.value ?? '';
const keepVals = () => ({ e: aval('agEmail'), n: aval('agName'), i: aval('agInv'), r: aval('agRk') });
const putVals = (v) => { for (const [id, x] of [['agEmail', v.e], ['agName', v.n], ['agInv', v.i], ['agRk', v.r]]) { const f = el.querySelector(`#${id}`); if (f && x) f.value = x; } };
async function acctRun(kind) {
  if (ast.busy) return;
  const v = keepVals(), pw = aval('agPw');   // (passwords are never trimmed; the invite goes exactly as typed)
  ast = { busy: true }; draw(); putVals(v);
  try {
    if (kind === 'in') await acct.signIn({ email: v.e.trim(), password: pw });
    else if (kind === 'up') { const r = await acct.signUp({ invite: v.i, email: v.e.trim(), name: v.n.trim(), password: pw }); ast = { key: r.recoveryKey }; am = 'key'; draw(); return; }
    else if (kind === 'recover') await acct.recover({ email: v.e.trim(), recoveryKey: v.r, password: pw });
    ast = {}; await finishSignIn(() => { am = 'provider'; step = 1; draw(); });
  } catch (e) { ast = { err: e.code === 'short' ? 'The password needs 12 characters or more.' : e.message }; draw(); putVals(v); }
}
async function submit() {
  if (busy) return;
  let a;
  try {
    if (mode === 'xtream') {
      const p = window.Core.parseLogin(val('siServer'), val('siUser'), val('siPass'));
      if (!p.username || !p.password) throw new Error('Enter the username and the password.');
      a = { type: 'xtream', ...p, name: host(p.server) };
    } else {
      const url = val('siUrl');
      if (!url) throw new Error('Enter the playlist link.');
      if (/get\.php\?.*username=/.test(url)) { const p = window.Core.parseLogin(url); a = { type: 'xtream', ...p, name: host(p.server) }; } else a = { type: 'm3u', url, name: host(url) };
    }
  } catch (e) { err = e.message; draw(); return; }
  busy = true; err = ''; const keep = { s: val('siServer'), u: val('siUser'), p: val('siPass'), l: val('siUrl') }; draw(); restore(keep);
  try {
    await signIn(a);
    busy = false; step = 2; draw();
    ensure('live').catch(() => {});
  } catch (e) { busy = false; err = e.message || 'That didn\'t work'; draw(); restore(keep); }
}
function restore(k) { const set = (id, v) => { const i = el.querySelector(`#${id}`); if (i && v) i.value = v; }; set('siServer', k.s); set('siUser', k.u); set('siPass', k.p); set('siUrl', k.l); }
export default {
  name: 'signin', tab: true, tabs: false,
  mount(root) {
    el = root;
    root.addEventListener('click', (e) => {
      const m = e.target.closest('[data-mode]');
      if (m) { mode = m.dataset.mode; err = ''; draw(); return; }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const a = b.dataset.act;
      if (a === 'show' && b.dataset.for) return showToggle(el, b);
      if (a === 'agGo') return acctRun('in');
      if (a === 'agUp') return acctRun('up');
      if (a === 'agRec') return acctRun('recover');
      if (a === 'agForgot') { am = 'recover'; ast = {}; draw(); return; }
      if (a === 'agUpOpen') { am = 'up'; ast = {}; draw(); return; }
      if (a === 'agIn') { am = 'in'; ast = {}; draw(); return; }
      if (a === 'noacct') { acct.clearSignedOutLine(); am = 'provider'; err = ''; draw(); return; }
      if (a === 'rkcopy') { navigator.clipboard?.writeText(ast.key); b.textContent = 'Copied'; return; }
      if (a === 'rksave') {   // (Save as…: a text file with the email and the date)
        const f = new Blob([`airglow recovery key\n\n${ast.key}\n\nEmail: ${acct.me()?.email || ''}\nMade: ${new Date().toDateString()}\n`], { type: 'text/plain' });
        const l = document.createElement('a'); l.href = URL.createObjectURL(f); l.download = 'airglow recovery key.txt'; l.click(); return;
      }
      if (a === 'rkdone') { if (!el.querySelector('#rkok')?.checked) return; ast = {}; am = 'provider'; step = 1; draw(); finishSignIn(() => {}); return; }
      if (a === 'skipprov') { go('home'); return; }
      if (a === 'show') { const i = el.querySelector('#siPass'); i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? 'Show' : 'Hide'; return; }
      if (a === 'go') { e.preventDefault(); submit(); return; }
      if (a === 'team') return teamSheet(draw);
      if (a === 'shield') return shieldSheet(draw);
      if (a === 'done') { step = 1; go('home'); }
    });
    root.addEventListener('change', (e) => { if (e.target.id === 'rkok') { ast.ticked = e.target.checked; el.querySelector('[data-act="rkdone"]').disabled = !e.target.checked; } });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'agPw') { e.preventDefault(); acctRun(am === 'up' ? 'up' : am === 'recover' ? 'recover' : 'in'); return; } if (e.key === 'Enter' && e.target.id === 'siPass') submit(); if (e.key === 'Enter' && e.target.id === 'siUrl') submit(); });
  },
  enter(root, params) {
    if (!S.acc) step = 1;
    err = params.error || acct.signedOutLine() || '';
    am = params.acct || (acct.me() || params.provider ? 'provider' : am === 'provider' && !params.error ? 'provider' : 'in');
    if (am !== 'provider') ast = {};
    draw();
  },
};
