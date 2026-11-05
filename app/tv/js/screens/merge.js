// The TV's merge question (design/ui-v1/accounts-v1/SPEC.md 2.6, 3.1, mock 02): a centred menu over the verifying
// screen. Up/Down between the two rows, Left/Right nothing, Back only says to pick one (the TV can't sign out of a
// half-merged state). Resolves 'merge' or 'replace'.
import { esc, ic } from '../util.js';
import { openOverlay, toast } from '../ui.js';
import { focus } from '../focus.js';

const n = (x) => Number(x || 0).toLocaleString('en-GB');
export function askMerge(sum) {
  return new Promise((done) => {
    const h = sum.here, a = sum.account;
    const sameProv = h.providers.find((p) => p.same), otherProv = h.providers.filter((p) => !p.same);
    const provLine = h.providers.length ? `<div class="l"><b>${esc(h.providers[0].name)}</b><small>${h.providers[0].same ? 'the same provider' : 'not in your account'}</small></div>` : '<div class="l">No provider</div>';
    const savedNot = Math.max(0, h.saved - a.saved);
    const ov = openOverlay(`<div class="menu ag-merge" style="left:50%;top:50%;transform:translate(-50%,-50%);width:640px"><h3>This TV already has things</h3><div class="t-body">It was used without an account. Keep both, or make this TV match your account.</div>
      <div class="ag-two"><div><div class="h">${ic('tv')}On this TV</div>${provLine}<div class="l">${n(h.saved)} saved channels${savedNot ? ` <small>· ${n(savedNot)} not in your account</small>` : ''}</div><div class="l">${n(h.plays)} plays</div><div class="l">${n(h.addons)} add-ons</div></div>
      <div><div class="h">${ic('user')}In your account</div><div class="l"><b>${esc(a.providers[0] || 'No provider yet')}</b>${a.providers.length > 1 ? `<small>+${a.providers.length - 1}</small>` : ''}</div><div class="l">${n(a.saved)} saved</div><div class="l">${n(a.plays)} plays</div><div class="l">${n(a.addons)} add-ons</div></div></div>
      <div data-col>
        <div class="ad-lr fx" tabindex="-1" data-act="merge"><span class="ico">${ic('plus')}</span><span class="grow"><span class="a">Merge them<span class="ag-rec">Recommended</span></span><span class="b">Keeps everything. The same channel or title saved on both becomes one.</span></span>${ic('chevR', 'sm')}</div>
        <div class="ad-lr fx" tabindex="-1" data-act="replace"><span class="ico">${ic('refresh')}</span><span class="grow"><span class="a">Use only what's in my account</span><span class="b">This TV's own ${n(h.saved)} saved channels and ${n(h.plays)} plays are removed.${sameProv && !otherProv.length ? ' The provider stays: it\'s the same one.' : ''}</span></span>${ic('chevR', 'sm')}</div>
      </div>
      <div class="foot">Asked once, on this TV only. Neither choice can be undone here, so your account keeps a copy of today's state for 30 days.</div></div>`, {
      focusSel: '[data-act="merge"]',
      onClick: (act) => { if (act === 'merge' || act === 'replace') { ov.close(false); done(act); } },
      onKey: (k) => { if (k === 'back') { toast('Pick one to finish signing in'); return true; } return k === 'left' || k === 'right'; },
    });
    focus(ov.el.querySelector('[data-act="merge"]'));
  });
}
