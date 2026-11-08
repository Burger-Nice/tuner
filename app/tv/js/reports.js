// Error reports for the modules (design/ui-v1/error-reports/SPEC.md): note() leaves a short safe note that rides
// along with the next report, screen() tags reports with where he was, problem() reports something that failed without
// crashing (a channel that won't play, sync that keeps stopping…), sendNow() is Account's "Send a report now".
// report-boot.js has already started Sentry (or not: then every call here does nothing). report-scrub.js decides what
// may leave the device; the facts here are cut to a fixed schema there too.
import { native } from './native.js';

const S = () => (window.AirglowReports?.state.on() ? window.Sentry : null);
const X = window.AirglowScrub;

export const reportsAvailable = () => !!window.AirglowReports?.state.dsn;

export function note(word, facts) {
  const s = S(); if (!s || !X) return;
  s.addBreadcrumb({ category: 'note', message: word, data: X.noteFacts(facts), level: 'info' });
}

let lastScreen = null;
export function screen(name) {
  if (!name || name === lastScreen) return;
  lastScreen = name;
  window.AirglowReports?.setScreen(name);
  note('screen');
  const heapMb = performance?.memory?.usedJSHeapSize ? Math.round(performance.memory.usedJSHeapSize / 1048576) : undefined;
  native?.reports?.({ screen: String(name).slice(0, 40), heapMb });
}

// kind: one of report-scrub.js KINDS; key: one enum fact that splits the issue (e.g. the cause id); err: an exception
// to send with its stack (its message never leaves).
export function problem(kind, facts = {}, { key, err } = {}) {
  const s = S(); if (!s || !X?.KINDS.includes(kind)) return;
  const f = X.facts(kind, facts);
  const fingerprint = ['problem', kind, X.safeCode(key ?? '-')];
  if (err) s.captureException(err, { tags: { kind }, extra: { facts: f }, fingerprint });
  else s.captureMessage(kind, { level: 'warning', tags: { kind }, extra: { facts: f }, fingerprint });
}

// A player's on-screen reason for a failed stream, as safe facts (the iPhone and Windows players; the TV's comes from Java)
export function whyFacts(why) {
  const s = String(why || '');
  const http = /answered (\d{3})/.exec(s);
  return { http: http ? +http[1] : undefined, error: http ? 'http' : s === 'mkv' ? 'mkv' : /format/i.test(s) ? 'format' : /limit|connections/i.test(s) ? 'limit' : /stopped|ended/i.test(s) ? 'stopped' : 'other' };
}

// Account › App: "Send a report now". The notes go with it; the facts are what Account can see now.
export function sendNow(facts) {
  const s = S(); if (!s) return false;
  s.captureMessage('manual', { level: 'info', tags: { kind: 'manual' }, extra: { facts: X.facts('manual', facts) }, fingerprint: ['problem', 'manual', String(Date.now())] });
  return true;
}

// The switch (Account › App), per device; the native side follows at once when turned off, at the next start when on.
export function setReports(on) {
  window.AirglowReports?.setOn(on);
  native?.reports?.({ on });
}

// At every start, so the native flag can't drift from the setting (SPEC D5).
{ let off = false; try { off = !!JSON.parse(localStorage.getItem('tuner.settings') || '{}').reportsOff; } catch { /* a corrupt value: the default */ } native?.reports?.({ on: !off }); }
