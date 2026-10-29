// What the iPhone can play, and the way out when it can't (review 2, M1; PORT-NATIVE.md "The streams").
// The <video> plays what AVFoundation plays: HLS, MP4 / M4V / MOV. No MPEG-TS fallback: CapacitorHttp buffers fetch,
// so mpegts.js never gets a live body, and Xtream panels send no CORS headers for the WebView's own fetch.
import { S } from '../tv/js/state.js';
import { catalog, ensure } from '../tv/js/catalog.js';
import { pastFor } from '../tv/js/guide.js';
import { toast } from '../tv/js/ui.js';

// A channel's HLS link: its own hls source (core.js), else the .ts link turned into .m3u8 (Xtream serves both)
export function hlsOf(ch, fallback = '') {
  const s = ch?.sources?.find((x) => x.engine === 'hls')?.url;
  if (s) return s;
  const u = fallback || ch?.sources?.[0]?.url || '';
  return /\/live\/[^/]+\/[^/]+\/\d+\.ts(\?|$)/.test(u) ? u.replace(/\.ts(\?|$)/, '.m3u8$1') : u;
}
export function tsOf(ch, fallback = '') {
  return ch?.sources?.find((x) => x.engine === 'mpegts')?.url || fallback || hlsOf(ch);
}
// The plays-here term (SPEC 0.11a): MP4 / M4V / MOV / HLS play; MKV, AVI, WebM (and an MKV mime) don't
const NO = /\.(mkv|avi|webm|wmv|flv)(\?|$)/i;
export function playsHere(c) {
  const s = [c?.filename, c?.url, c?.behaviorHints?.filename].filter(Boolean).join(' ');
  if (/x-matroska|x-msvideo|webm/i.test(c?.mime || '')) return false;
  if (NO.test(String(c?.filename || '')) || NO.test(String(c?.url || '').split('#')[0])) return false;
  void s;
  return true;
}
// the hand-off (PORT-NATIVE.md: the x-callback URLs; Info.plist lists the schemes)
export const vlcUrl = (u) => `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(u || '')}`;
export const infuseUrl = (u) => `infuse://x-callback-url/play?url=${encodeURIComponent(u || '')}`;
export function handOff(url, app) {
  if (!url || /url=$/.test(url)) { toast('There is no link to hand over'); return; }
  // Capacitor hands a link it doesn't serve to iOS, which opens the app (or does nothing when it isn't installed)
  const t = setTimeout(() => toast(`If nothing opened, ${app} isn't on this iPhone (it's free in the App Store)`, 4500), 1800);
  document.addEventListener('visibilitychange', () => clearTimeout(t), { once: true });
  window.location.href = url;
}
// The provider's stream limit (SPEC 3.7, a named state): { limit: true, text } when every allowed stream is in use
export async function limitReached() {
  if (S.acc?.type !== 'xtream' || !S.src) return null;
  try {
    const d = await Promise.race([S.src.login(), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 6000))]);
    const u = d?.user_info || {};
    const max = +u.max_connections || 0, act = +u.active_cons || 0;
    if (max && act >= max) return { limit: true, text: `Your provider allows ${max} stream${max === 1 ? '' : 's'} · ${act === 1 ? 'another device is' : `${act} are`} using ${max === 1 ? 'it' : 'them'}` };
  } catch { /* unknown */ }
  return null;
}

// ---------- Account > Provider > Check streams on this iPhone ----------
// Tries a live channel's .m3u8 and a catch-up .m3u8 the way the player does, and says plainly whether each plays.
// onStep(key, { state: 'checking' | 'ok' | 'bad', text }) as it goes.
const MIN = 60e3;
function tryVideo(url, ms = 15000) {
  return new Promise((res) => {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
    v.style.cssText = 'position:fixed;left:-9999px;width:16px;height:9px';
    document.body.appendChild(v);
    let done = false;
    const fin = (r) => { if (done) return; done = true; clearTimeout(t); try { v.pause(); v.removeAttribute('src'); v.load(); } catch { /* gone */ } v.remove(); res(r); };
    const t = setTimeout(() => fin({ ok: false, why: 'no picture in 15 s' }), ms);
    v.addEventListener('loadeddata', () => fin({ ok: true, h: v.videoHeight }));
    v.addEventListener('error', () => fin({ ok: false, why: v.error?.code === 4 ? 'this iPhone refused the format' : 'the stream failed' }));
    if (v.canPlayType('application/vnd.apple.mpegurl')) { v.src = url; v.play().catch(() => {}); }
    else if (window.Hls?.isSupported()) { const h = new window.Hls(); h.on(window.Hls.Events.ERROR, (_, d) => { if (d.fatal) fin({ ok: false, why: d.response?.code ? `the provider answered ${d.response.code}` : 'the stream failed' }); }); h.on(window.Hls.Events.MANIFEST_PARSED, () => v.play().catch(() => {})); h.loadSource(url); h.attachMedia(v); const f0 = fin; v.addEventListener('emptied', () => h.destroy(), { once: true }); void f0; }
    else fin({ ok: false, why: 'this browser has no HLS player' });
  });
}
async function head(url) {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 10000);
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    clearTimeout(t);
    const txt = r.ok ? (await r.text()).slice(0, 200) : '';
    return { status: r.status, m3u: /#EXTM3U/.test(txt) };
  } catch { return { status: 0, m3u: false }; }
}
async function loadHls() {
  if (window.Hls || document.createElement('video').canPlayType('application/vnd.apple.mpegurl')) return;
  await new Promise((r) => { const s = document.createElement('script'); s.src = 'node_modules/hls.js/dist/hls.min.js'; s.onload = r; s.onerror = r; document.head.appendChild(s); });
}
const SPORTY = /\bnba\b|league pass|espn|sport/i;
export async function checkStreams(onStep) {
  await loadHls();
  const live = await ensure('live').catch(() => null);
  const items = (live?.items || []).filter((c) => !c._sep);
  // 1. live: a sports channel if there is one (that's what he'll watch), else the first
  const ch = items.find((c) => SPORTY.test(c.name)) || items[0];
  if (!ch) { onStep('live', { state: 'bad', text: 'No channels in the list to try' }); onStep('catchup', { state: 'bad', text: 'No channels to try' }); return; }
  onStep('live', { state: 'checking', text: `Trying ${ch.name}…` });
  const url = hlsOf(ch);
  const h = await head(url);
  const v = await tryVideo(url);
  const liveOk = v.ok;
  onStep('live', liveOk ? { state: 'ok', text: `Live channels play here (HLS) · ${ch.name}${v.h ? ` · ${v.h}p` : ''}` }
    : { state: 'bad', text: `Live HLS doesn't play: ${h.status && h.status !== 200 ? `the provider answered ${h.status}` : h.status === 200 && !h.m3u ? 'the provider sent no HLS playlist' : v.why} · ${ch.name}. Open in VLC still works.` });
  // 2. catch-up: a kept channel's programme that ended a while ago, as the player asks for it (the .m3u8 form first)
  const kept = items.filter((c) => c.archive > 0);
  const kc = kept.find((c) => SPORTY.test(c.name)) || kept[0];
  if (!kc || !S.src?.catchup) { onStep('catchup', { state: 'bad', text: kept.length ? 'This provider type has no replays' : 'No channel keeps replays (catch-up), so From tip-off can\'t work' }); return { liveOk, catchupOk: false }; }
  onStep('catchup', { state: 'checking', text: `Trying a replay on ${kc.name}…` });
  let p = null;
  try { const list = await pastFor(kc, { urgent: true }); p = [...(list || [])].reverse().find((x) => x.end < Date.now() - 10 * MIN && x.start > Date.now() - kc.archive * 864e5 + 3600e3 && x.kept !== false) || null; } catch { /* no table */ }
  const start = p ? p.start : Date.now() - 2 * 3600e3, endT = p ? p.end : start + 30 * MIN;
  const links = S.src.catchup(kc, start, endT, { raw: p?.raw || '' }) || [];
  const cu = links.find((l) => /\.m3u8/.test(l.url)) || links[0];
  if (!cu) { onStep('catchup', { state: 'bad', text: 'No replay link for this channel' }); return { liveOk, catchupOk: false }; }
  const h2 = await head(cu.url);
  const v2 = await tryVideo(cu.url, 20000);
  onStep('catchup', v2.ok ? { state: 'ok', text: `Replays play here (HLS) · From tip-off works · ${kc.name}` }
    : { state: 'bad', text: `Replays don't play as HLS: ${h2.status && h2.status !== 200 ? `the provider answered ${h2.status}` : h2.status === 200 && !h2.m3u ? 'the provider sent no HLS playlist' : v2.why} · ${kc.name}` });
  return { liveOk, catchupOk: v2.ok };
}
void catalog;
