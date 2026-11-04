// Remind me (desktop SPEC 0.10, 7): a Windows notification 10 min before tip-off ("Grizzlies at Trail Blazers tips
// off at 02:00 · Watch"), kept by main so it fires with the window closed (the tray); the tray's menu shows your
// team's next game and Watch. A toast's text never carries a score, and it is never edited afterwards (the Action
// Center keeps it). In a browser (tests) the reminders live in memory.
import { hm } from '../tv/js/util.js';
import { myGame, nba, gameById } from '../tv/js/games.js';
import { toast } from '../tv/js/ui.js';

const T = window.tuner || null;
const mem = new Map();
const short = (n) => ({ 'Trail Blazers': 'Trail Blazers' }[n] || n);
export const nameOf = (g) => `${short(g.away.name)} at ${short(g.home.name)}`;
let list = [];
const load = () => (T?.reminders ? T.reminders.list().then((l) => { list = l || []; return list; }).catch(() => list) : Promise.resolve([...mem.values()]));
load();
T?.reminders?.onChange?.((l) => { list = l || []; });
export const isSet = (g) => !!g && (list.some((r) => r.id === `game:${g.id}`) || mem.has(`game:${g.id}`));
export async function toggle(g) {
  if (!g) return;
  const id = `game:${g.id}`;
  if (isSet(g)) {
    if (T?.reminders) list = await T.reminders.clear(id); else mem.delete(id);
    toast(`No reminder for ${nameOf(g)}`);
    return false;
  }
  if (g.state !== 'pre') { toast(`${nameOf(g)} has started`); return false; }
  const r = { id, at: g.date - 10 * 60e3, title: `${nameOf(g)} tips off at ${hm(g.date)}`, body: 'Watch · airglow', action: { kind: 'game', id: g.id, watch: true } };
  if (T?.reminders) list = await T.reminders.set(r); else mem.set(id, r);
  toast(`airglow reminds you at ${hm(r.at)}, 10 min before tip-off`);
  return true;
}
// Ctrl R: the focused game card, else the game page's, else your team's next game
export function remindFocused() {
  const a = document.activeElement?.closest?.('[data-g]');
  const id = a?.dataset.g || document.querySelector('#dk-pages > section:not([hidden]) [data-gid]')?.dataset.gid;
  const g = (id && gameById(id)) || myGame();
  if (g) toggle(g); else toast('No game to remind you of');
}
export const testList = () => (T?.reminders ? list : [...mem.values()]);
// the tray: your team's next game and Watch
export function trayNext() {
  if (!T?.tray) return;
  const g = myGame() || nba.today.find((x) => x.state !== 'post');
  if (!g) { T.tray.update(null); return; }
  T.tray.update({ label: `${nameOf(g)} · ${g.state === 'in' ? 'on now' : hm(g.date)}`, verb: g.state === 'in' ? 'Watch live' : 'Open the game', action: { kind: 'game', id: g.id, watch: g.state === 'in' } });
}
