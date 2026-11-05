// The TV's side of signing in from a phone (design/ui-v1/accounts-v1/SPEC.md 2.3, 5.5): a fresh key pair per code, the
// code and the QR link, the poll (5 s, +5 on slow_down), the box opened with the TV's private key, dk_check, done.
import * as acct from './acct.js';
import * as K from './crypto.js';

let run = 0;
// start({ onCode, onDone, onExpired, onDenied, onError }) -> a cancel function. onCode({ code, link, host, expiresAt })
export function startTvSignIn(h) {
  const my = ++run;
  const live = () => my === run;
  (async () => {
    while (live()) {
      let kp, c;
      try {
        kp = await K.tvKeyPair();
        c = await acct.api('POST', '/v1/device/code', { name: acct.deviceInfo().name, kind: 'tv', pub: kp.pub });
      } catch (e) { if (live()) h.onError?.(e); await wait(30000); continue; }
      if (!live()) return;
      h.onCode?.({ code: c.user_code, link: `${c.verification_uri_complete}#k=${kp.k}`, host: new URL(c.verification_uri).host, expiresAt: Date.now() + c.expires_in * 1000 });
      let gap = (c.interval || 5) * 1000;
      for (;;) {
        await wait(gap);
        if (!live()) return;
        let r;
        try { r = await acct.api('POST', '/v1/device/token', { device_code: c.device_code }); }
        catch (e) {
          const code = e.body?.error || e.code;
          if (code === 'authorization_pending') continue;
          if (code === 'slow_down') { gap += 5000; continue; }
          if (code === 'expired_token') { h.onExpired?.(); break; }   // (a new code, drawn with "The code ran out")
          if (code === 'access_denied') { h.onDenied?.(); return; }
          h.onError?.(e); gap = Math.min(gap * 2, 30000); continue;   // (offline or 5xx: keep waiting, never wipe)
        }
        try {
          const dk = await K.handoverOpen(kp, r.box, c.user_code);
          await acct.adoptHandover(r, dk);
          if (live()) h.onDone?.(r);
        } catch (e) { if (live()) h.onError?.(new acct.AcctError('bad_check')); }
        return;
      }
    }
  })();
  return () => { if (my === run) run++; };
}
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
