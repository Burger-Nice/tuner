// Account > Provider > Check the connection (design/ui-v1/diagnosis/SPEC.md 7, 10.3, mocks acct-check-*.html): the five
// links in order (TV, Wi-Fi or Cable, Internet with a 3 s speed test, Provider, the last channel), each drawn as it
// answers, then a verdict in what it means for him (4K, HD). The checks run natively on the TV (TunerPlayer
// connectionCheck); in a desktop browser a smaller version runs here so the sheet can be seen and tested.
// No score, clock or result: the last channel is named by its title.
import { esc, ic } from './util.js';
import { native } from './native.js';
import { openOverlay } from './ui.js';
import { focus } from './focus.js';
import { apiUrl, urlOf } from './player.js';

const TICK = `<i><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></i>`;
const BANG = `<i class="bang">${ic('bang')}</i>`;
const disc = (icon, st) => `<span class="dg-c">${ic(icon)}${st === 'ok' ? TICK : st === 'bad' ? BANG : ''}</span>`;
// one row: [icon, label, state (ok / bad / off / run), reading, value]; link into it: ok / slow / cut / off / run
const vrow = ([icon, label, st, r, v], link) => `<div class="dg-vn ${st}${link && link !== 'ok' ? ` in-${link}` : ''}">${disc(icon, st)}<div class="tx"><b>${esc(label)}</b>${r ? `<small>${esc(r)}</small>` : ''}</div>${v ? `<span class="v">${esc(v)}</span>` : ''}</div>`;

// What a channel needs, from its name's quality tag (SPEC 4.2's typical figures).
const needOf = (n) => (/\b(4k|uhd|2160p?)\b/i.test(n) ? 20 : /\b(fhd|full ?hd|1080p?)\b/i.test(n) ? 8 : /\b(hd|720p?)\b/i.test(n) ? 5 : /\bsd\b/i.test(n) ? 3 : 6);
const clean = (n) => String(n || '').replace(/^[A-Z]{2,3}\s*[|:-]\s*/, '').trim();
const mb = (v) => String(Math.max(0, Math.round(v)));
const day = (s) => new Date(s * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The rows, the links and the verdict from the readings so far (r: tv, net, internet, speed, provider, channel, release). */
export function readout(r, chName) {
  const rows = [], links = [];
  const add = (row, link) => { if (rows.length) links.push(link); rows.push(row); };
  const next = () => (rows.length && rows[rows.length - 1][2] === 'run' ? 'off' : 'run');
  const wait = (icon, label, txt = 'Waiting') => { const st = next(); add([icon, label, st, st === 'run' ? 'Checking…' : txt], st === 'run' ? 'run' : 'off'); };
  // TV
  if (r.tv) add(r.tv.web ? ['tv', 'TV', 'off', 'Checked on the TV itself'] : ['tv', 'TV', 'ok', `Plays up to ${r.tv.plays}`]); else wait('tv', 'TV');
  // Wi-Fi or cable
  const n = r.net, sp = r.speed, cap = sp?.state === 1 ? sp.mbps : -1;
  const link = Math.max(n?.link || 0, sp?.link || 0);
  const wifiLimit = n?.type === 'wifi' && cap >= 0 && cap < 26 && (n.bars > 0 && n.bars <= 2 || (link > 0 && link < 40)) && (link > 0 ? cap / link >= 0.35 : n.bars === 1);
  if (!n) wait('wifi', 'Wi-Fi');
  else if (n.web) add(['wifi', 'Wi-Fi', 'off', 'Checked on the TV itself'], 'off');
  else if (n.type === 'none') add(['wifi', 'Wi-Fi', 'bad', 'Not connected'], 'cut');
  else if (n.type === 'cable') add(['cable', 'Cable', 'ok', 'Connected'], 'ok');
  else {
    const word = n.bars >= 3 ? 'Strong signal' : n.bars === 2 ? 'Weak signal' : n.bars === 1 ? 'Very weak signal' : 'Connected';
    add(wifiLimit ? ['wifiWeak', 'Wi-Fi', 'bad', `${n.bars ? `${n.bars} of 4 bars` : 'Weak'}${link ? ` · link ${link} Mbps` : ''}`] : ['wifi', 'Wi-Fi', 'ok', n.bars ? `${word} · ${n.bars} of 4 bars` : word], 'ok');
  }
  // Internet (and its speed)
  const inet = r.internet;
  if (!inet) wait('globe', 'Internet');
  else if (inet.code === 204 || (inet.web && inet.code > 0)) {
    if (!sp) add(['globe', 'Internet', 'run', 'Testing the speed…'], 'run');
    else if (wifiLimit) add(['globe', 'Internet', 'off', `Gets ${mb(cap)} Mbps through this Wi-Fi`], 'off');
    else add(['globe', 'Internet', 'ok', inet.ms ? `Answers in ${inet.ms} ms` : 'Answers', cap < 0 ? 'Not tested' : sp.full ? `${Math.floor(cap / 10) * 10}+ Mbps` : `${mb(cap)} Mbps`], cap >= 0 && cap < 3.9 ? 'slow' : 'ok');
    if (sp && cap >= 0 && cap < 3.9 && !wifiLimit) rows[rows.length - 1][2] = 'bad';
  } else add(['globe', 'Internet', 'bad', inet.code === -1 ? 'No answer' : 'Sign-in page'], 'cut');
  // Provider: the stream's own server, and the account
  const p = r.provider;
  const ended = p?.acct === 1 && ((p.status && !/active/i.test(p.status)) || (p.exp && p.exp * 1000 < Date.now()));
  if (!p) wait('server', 'Provider');
  else if (p.host === -1) add(['server', 'Provider', 'bad', 'No answer'], 'cut');
  else if (p.host === -2) add(['server', 'Provider', 'bad', 'Not found'], 'cut');
  else if (ended) add(['server', 'Provider', 'bad', 'Account ended'], 'ok');
  else add(['server', 'Provider', 'ok', p.acct === 1 ? (p.exp ? `Account active until ${day(p.exp)}` : 'Account active') : p.acct === -1 ? 'The account didn’t answer' : 'Answers', p.ms ? `${p.ms} ms` : ''], 'ok');
  // the last channel
  const c = r.channel, name = clean(chName) || 'No channel yet', need = needOf(chName || '');
  if (!c) wait('stream', 'Last channel', `${name} · waiting`);
  else if (c.state === 'run') add(['stream', 'Last channel', 'run', `${name} · testing for 5 s`], 'run');
  else if (c.state === 'one-stream') add(['stream', 'Last channel', 'off', `${name} · not tested`], 'off');
  else if (c.state === 'none') add(['stream', 'Last channel', 'off', 'Watch a channel first'], 'off');
  else if (c.state === 'fail') add(['stream', 'Last channel', 'bad', `${name} · ${c.code > 0 ? `refused (${c.code})` : 'no answer'}`], 'cut');
  else add(['stream', 'Last channel', c.mbps >= 0.9 * need ? 'ok' : 'bad', `${name} · needs about ${need}`, `${mb(c.mbps)} Mbps`], c.mbps >= 0.9 * need ? 'ok' : 'slow');
  return { rows, links, verdict: verdict(r, { cap, wifiLimit, ended, need, name }) };
}

function verdict(r, { cap, wifiLimit, ended, need, name }) {
  const n = r.net, inet = r.internet, p = r.provider, c = r.channel;
  const tier = (v) => (v >= 26 ? '4K channels' : v >= 10.4 ? 'HD' : v >= 3.9 ? 'SD' : '');
  if (n?.type === 'none') return ['Your TV is offline', 'Connect it to your Wi-Fi or a network cable.'];
  if (inet && inet.code === -1 && !inet.web) {
    if (n?.type === 'wifi' && n.bars > 0 && n.bars <= 2) return ['Your Wi-Fi is too weak to get through', 'Almost nothing reaches the TV. Move the router closer, or use a cable.'];
    if (p && p.host === 1) return ['Your internet works', 'The internet check didn’t answer, but your provider did.'];
    return ['Your internet isn’t working', 'Nothing gets past your router. Restart it.'];
  }
  if (inet && inet.code > 0 && inet.code !== 204 && !inet.web) return ['Your Wi-Fi wants you to sign in', 'Open its sign-in page in the TV’s network settings.'];
  if (!p) return null;
  if (p.host === -1) return ['Your provider isn’t answering', 'Your internet works. Their server doesn’t answer.'];
  if (p.host === -2) return ['Your internet can’t find your provider', 'Their address doesn’t work from here. Private DNS in the TV’s network settings may get around it.'];
  if (ended) return ['Your provider account has ended', p.exp ? `It expired on ${day(p.exp)}. Renew it with your provider.` : 'Renew it with your provider.'];
  if (c?.state === 'fail') return ['Your provider refused your last channel', c.code === 403 || c.code === 401 ? 'It may be your stream limit or your package.' : `Their server answered ${c.code > 0 ? c.code : 'nothing'} for ${name}.`];
  if (!c || c.state === 'run') return null;
  const slow = c.state === 'ok' && c.mbps < 0.9 * need;
  if (wifiLimit) return [cap >= 10.4 ? 'Enough for HD, not for 4K' : cap >= 3.9 ? 'Enough for SD, not for HD' : 'Your Wi-Fi is too weak for live TV', 'The Wi-Fi is the limit: the test got most of what it can carry. A cable would show your internet’s real speed.'];
  if (cap < 0) return slow ? ['Your last channel arrives too slowly', 'airglow couldn’t test your internet’s speed this time.'] : ['Everything answered', r.speed?.web ? 'The speed test runs on the TV itself.' : 'airglow couldn’t test your internet’s speed this time.'];
  if (slow && cap >= 1.3 * need) return ['Your last channel arrives too slowly', 'Your internet has room. It’s that channel at your provider.'];
  const t = tier(cap);
  if (!t) return ['Too slow for live TV', `Your internet gives ${mb(cap)} Mbps right now. Something else on your network may be using it.`];
  if (t === '4K channels') return ['Fast enough for 4K channels', 'Everything answered quickly. If one channel still stutters, it’s that channel at your provider.'];
  return [`Enough for ${t}, not for ${t === 'HD' ? '4K' : 'HD'}`, `Your internet gives ${mb(cap)} Mbps right now. ${t === 'HD' ? '4K channels need about 25.' : 'HD channels need about 8.'}`];
}

// ---------- the sheet ----------
export function connectionCheck(lastCh) {
  const ch = lastCh;
  const opts = { api: apiUrl(), url: ch ? urlOf(ch) : '', name: ch?.name || '' };
  let r = {}, done = false, stopped = false, sampled = false;
  const ov = openOverlay(`<div class="sheet dg-sheet"><h3>Connection check</h3><div class="dg-sub">This TV, your internet and your provider · about 10 s</div><div class="dg-out"></div></div>`, {
    onClose: () => { stopped = true; native?.diag?.stop(); },
    onClick: (a) => { if (a === 'again') run(false); else if (a === 'sample') run(true); },
  });
  const out = ov.el.querySelector('.dg-out');
  const draw = () => {
    if (!out.isConnected) return;
    const { rows, links, verdict: v } = readout(r, opts.name);
    const releasing = r.release?.state === 'waiting';
    const oneStream = r.channel?.state === 'one-stream' && !sampled;
    const foot = !done ? `<div class="sheet-foot"><span class="dg-wait">${releasing ? 'Letting the stream go…' : 'Checking…'}</span><span class="t-cap">${releasing ? 'Back closes' : 'Back stops'}</span></div>`
      : `<div class="sheet-foot" data-row><span class="btn sm fx" tabindex="-1" data-act="again">${ic('refresh', 'sm')}Run again</span>${oneStream ? `<span class="btn2 sm fx" tabindex="-1" data-act="sample">Test a channel too</span>` : ''}<span class="t-cap">Back closes</span></div>`;
    const had = document.activeElement?.dataset?.act;
    out.innerHTML = `<div class="dg-vpath fx" tabindex="-1">${rows.map((row, i) => vrow(row, i ? links[i - 1] : '')).join('')}</div>${v && (done || releasing) ? `<div class="dg-verdict"><b>${esc(v[0])}</b><span>${esc(v[1])}</span></div>` : ''}${foot}`;
    // while it runs there's nothing to press (focus rests on the readings); when done, Run again
    focus(out.querySelector(done ? `[data-act="${had === 'sample' && oneStream ? 'sample' : 'again'}"]` : '.dg-vpath'));
  };
  const run = async (sample) => {
    r = {}; done = false; sampled = sample;
    draw();
    const step = (k, d) => { if (stopped) return; r[k] = d; draw(); };
    let res;
    try { res = native?.diag ? await native.diag.check({ ...opts, sample }, step) : await webCheck({ ...opts, sample }, step, () => stopped); } catch { res = null; }
    if (stopped || res?.stopped) return;
    if (res && typeof res === 'object') r = { ...r, ...res };
    done = true;
    draw();
  };
  run(false);
}

// In a desktop browser (development, tests): what a page can check. The TV and Wi-Fi are only readable on the TV.
async function webCheck({ api, url, sample }, step, gone) {
  const timed = async (u, ms, o = {}) => { const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms), t0 = performance.now(); try { const x = await fetch(u, { ...o, signal: ac.signal, cache: 'no-store' }); return { x, ms: Math.round(performance.now() - t0) }; } finally { clearTimeout(t); } };
  step('tv', { web: true });
  step('net', { web: true, type: 'other' });
  let inet = { code: -1, web: true };
  try { const a = await timed('https://connectivitycheck.gstatic.com/generate_204', 2000, { mode: 'no-cors' }); inet = { code: 204, ms: a.ms, web: true }; } catch {}
  step('internet', inet);
  step('speed', { state: 2, web: true });
  const prov = {};
  let before = -1, max = -1;
  if (api) {
    try { const a = await timed(api, 3000); const u = (await a.x.json()).user_info || {}; Object.assign(prov, { host: 1, ms: a.ms, acct: 1, status: u.status || '', exp: +u.exp_date || 0, active: +u.active_cons, max: +u.max_connections }); before = +u.active_cons; max = +u.max_connections; } catch { prov.host = -1; }
  } else prov.host = 1;
  step('provider', prov);
  if (gone()) return { stopped: true };
  if (!url) { step('channel', { state: 'none' }); return {}; }
  if (!sample && max >= 0 && max < 2) { step('channel', { state: 'one-stream' }); return {}; }
  step('channel', { state: 'run' });
  let ch = { state: 'fail', code: -1 };
  try {
    const ac = new AbortController(), t0 = performance.now();
    const res = await fetch(url, { signal: ac.signal, cache: 'no-store' });
    if (!res.ok) ch = { state: 'fail', code: res.status };
    else {
      const rd = res.body.getReader();
      let got = 0, got1 = -1, t1 = 0;
      for (;;) { const { value, done } = await rd.read(); if (done) break; got += value.length; const t = performance.now() - t0; if (got1 < 0 && t >= 1000) { got1 = got; t1 = t; } if (t >= 5000) break; }
      ac.abort();
      const secs = (performance.now() - t0 - t1) / 1000;
      ch = { state: 'ok', mbps: Math.round(((got1 >= 0 ? got - got1 : got) * 8) / Math.max(0.2, secs) / 1e5) / 10 };
    }
  } catch {}
  step('channel', ch);
  if (api && before >= 0) {
    step('release', { state: 'waiting' });
    let freed = false;
    for (const until = Date.now() + 60000; !freed && Date.now() < until && !gone();) {
      try { const u = (await (await timed(api, 3000)).x.json()).user_info || {}; freed = +u.active_cons <= before; } catch {}
      if (!freed) await new Promise((ok) => setTimeout(ok, 5000));
    }
    step('release', { state: freed ? 'done' : 'gave-up' });
  }
  return {};
}
