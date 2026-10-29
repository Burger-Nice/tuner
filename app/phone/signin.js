// Sign in (SPEC 3.8, 09): the lockup, the three steps, the provider card (Xtream Codes · M3U link) with labelled fields
// and the attributes that make an iPhone type them right (review 2, S4: no capitals, no autocorrect, the URL keyboard,
// Passwords can fill them). Then the team and the shield, as on the TV; films come from Account › Add-ons.
import { S } from '../tv/js/state.js';
import { signIn } from '../tv/js/session.js';
import { ensure } from '../tv/js/catalog.js';
import { ic, esc, go } from './ui.js';
import { teamSheet, shieldSheet } from './nba.js';

let el, mode = 'xtream', step = 1, busy = false, err = '';
const host = (u) => { try { return new URL(/^https?:/i.test(u) ? u : `http://${u}`).host; } catch { return u; } };
const val = (id) => el.querySelector(`#${id}`)?.value.trim() || '';
const field = (id, label, attrs) => `<label for="${id}">${label}</label><div class="si-in"><input id="${id}" ${attrs}></div>`;
function draw() {
  const steps = [['Provider', 'the login you gave the TV'], ['Your team', 'and the spoiler shield'], ['Films', 'TMDB, add-ons']].map(([t, s], i) => `<span class="${step === i + 1 ? 'cur' : ''}">${i + 1} · ${t}<small>${s}</small></span>`).join('');
  let card;
  if (step === 1) {
    const x = mode === 'xtream';
    card = `<div class="si-card"><h2><span class="ico">${ic('key')}</span>Your provider</h2><p>Type the login you gave the TV once. It stays on this iPhone.</p>
      <div class="chips"><button class="chip${x ? ' sel' : ''}" data-mode="xtream">Xtream Codes</button><button class="chip${x ? '' : ' sel'}" data-mode="m3u">M3U link</button></div>
      <form id="siForm" autocomplete="on" onsubmit="return false">${x
        ? field('siServer', 'Server', 'type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="url" placeholder="line.provider.tv:8080" enterkeyhint="next"')
          + field('siUser', 'Username', 'type="text" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="username" enterkeyhint="next"')
          + `<label for="siPass">Password</label><div class="si-in"><input id="siPass" type="password" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="current-password" enterkeyhint="go"><button type="button" class="show" data-act="show">Show</button></div>`
        : field('siUrl', 'Playlist link', 'type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="url" placeholder="http://…/get.php?username=…" enterkeyhint="go"')}
      ${err ? `<div class="si-err">${esc(err)}</div>` : ''}
      <button type="submit" class="pill${busy ? '' : ''} noicon" data-act="go" id="siGo">${busy ? 'Signing in…' : 'Sign in'}</button></form></div>
      <div class="si-next">Then your team and the spoiler shield, as on the TV.</div>`;
  } else {
    const team = window.NBA.team(window.Core.settings().nbaTeam || 'MEM');
    card = `<div class="si-card"><h2><span class="ico">${ic('ball')}</span>Your team</h2><p>Its games lead Home and the NBA tab, and the spoiler shield follows it.</p>
      <div class="ac-group" style="margin-top:14px"><div class="box"><button class="ac-row" data-act="team"><span class="col"><span class="t">Your team</span></span><span class="v">${esc(team ? team.name : 'None')}</span>${ic('chevR', 'chev')}</button><button class="ac-row" data-act="shield"><span class="col"><span class="t">Spoiler shield</span><span class="s">Scores hidden until you've watched</span></span><span class="v">${esc({ off: 'Off', mine: 'My team', all: 'All games' }[window.Core.settings().shield || 'off'])}</span>${ic('chevR', 'chev')}</button></div></div>
      <button class="pill noicon" data-act="done">Done</button></div><div class="si-next">Films and series: add your Stremio add-ons and the TMDB key in Account.</div>`;
  }
  el.innerHTML = `<div class="si"><div class="si-lockup"><img src="tv/brand/assets/lockup.svg" alt="airglow"><p>Your channels, your team, your films.<br>Ad-free, from your own provider.</p></div><div class="si-steps">${steps}</div>${card}<div class="si-note">Your login goes only to your provider.</div></div>`;
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
      if (a === 'show') { const i = el.querySelector('#siPass'); i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? 'Show' : 'Hide'; return; }
      if (a === 'go') { e.preventDefault(); submit(); return; }
      if (a === 'team') return teamSheet(draw);
      if (a === 'shield') return shieldSheet(draw);
      if (a === 'done') { step = 1; go('home'); }
    });
    root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'siPass') submit(); if (e.key === 'Enter' && e.target.id === 'siUrl') submit(); });
  },
  enter(root, params) { if (!S.acc) step = 1; err = params.error || ''; draw(); },
};
