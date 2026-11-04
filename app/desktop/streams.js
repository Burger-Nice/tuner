// What the PC plays and the provider's stream limit. mpv plays every format (MKV, HEVC, AC3 / DTS, every subtitle
// format), so there is no plays-here term on Windows (SPEC 5.5) and no hand-off to another app: "Open in mpv's own
// window" is the way out (the title page's and the player's ⋯).
import { S } from '../tv/js/state.js';
import { toast } from '../tv/js/ui.js';

export const playsHere = () => true;
export function handOff(url) {
  if (!url) { toast('There is no link to hand over'); return; }
  window.tuner?.openExternalPlayer?.(url).then((ok) => { if (!ok) toast('mpv could not open it'); });
}
export const vlcUrl = (u) => u;
export const infuseUrl = (u) => u;
// the provider's streams: { max, active } (Account › Provider says `Streams · 4 allowed · 1 in use`; multiview reads it)
let last = null;
export async function streams(fresh = false) {
  if (S.acc?.type !== 'xtream' || !S.src) return null;
  if (!fresh && last && Date.now() - last.at < 60e3) return last;
  try {
    const d = await Promise.race([S.src.login(), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 6000))]);
    const u = d?.user_info || {};
    last = { max: +u.max_connections || 0, active: +u.active_cons || 0, at: Date.now() };
    return last;
  } catch { return last; }
}
// The provider's stream limit (a named state): { limit: true, text } when every allowed stream is in use
export async function limitReached() {
  const s = await streams(true);
  if (s?.max && s.active >= s.max) return { limit: true, text: `Your provider allows ${s.max} stream${s.max === 1 ? '' : 's'} · ${s.active === 1 ? 'another device is' : `${s.active} are`} using ${s.max === 1 ? 'it' : 'them'}` };
  return null;
}
