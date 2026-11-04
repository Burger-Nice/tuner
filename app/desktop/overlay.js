// The overlay window (SPEC 9): transparent, never focused, over a window's content area while a picture is on screen.
// It draws the layers the main page sends (float.js) and sends the pointer back: on a drawn thing, which thing (its
// path from the root) and what happened; on a picture, the picture's own verbs (click, double-click, wheel, right-click).
// Where nothing is drawn the overlay lets the pointer through to the window under it (setIgnoreMouseEvents, forward).
(() => {
  const O = window.tuner.overlay;
  const WIN = O.name || new URLSearchParams(location.search).get('win') || 'main';
  const root = document.getElementById('root'), pics = document.getElementById('pics');
  let ignoring = true, drag = false, miniDrag = false, lastMove = 0;
  O.onLayers((p) => {
    if (p.cls != null) document.documentElement.className = `${p.cls} overlay-doc`;
    if (root._html !== p.html) {
      root.innerHTML = p.html;
      root._html = p.html;
      for (const el of root.querySelectorAll('[data-st]')) { const [t, l] = el.getAttribute('data-st').split(',').map(Number); el.scrollTop = t || 0; el.scrollLeft = l || 0; }
    }
    if (p.style != null) root.setAttribute('style', p.style);
    const ph = (p.pictures || []).map((r) => `<i data-pic="${r.id}" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px"></i>`).join('');
    if (pics._html !== ph) { pics.innerHTML = ph; pics._html = ph; }
    document.body.classList.toggle('nocursor', p.cursor === 'none');
  });
  const isHit = (t) => !!t && t !== document.body && t !== document.documentElement && t !== root && t !== pics;
  const setIgnore = (v) => { if (v !== ignoring) { ignoring = v; O.ignore(v); } };
  const pathOf = (el) => { const p = []; for (let e = el; e && e !== root; e = e.parentElement) { p.unshift([...e.parentElement.children].indexOf(e)); } return p; };
  const base = (e) => ({ win: WIN, x: e.clientX, y: e.clientY, button: e.button, buttons: e.buttons, shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, detail: e.detail });
  function route(e, type) {
    const t = e.target;
    if (t.closest?.('#pics > i')) { O.input({ ...base(e), kind: 'pic', type, id: t.dataset.pic, dy: e.deltaY || 0 }); return true; }
    if (root.contains(t) && t !== root) { O.input({ ...base(e), kind: 'el', type, path: pathOf(t), dy: e.deltaY || 0, dx: e.deltaX || 0 }); return true; }
    return false;
  }
  document.addEventListener('mousemove', (e) => {
    setIgnore(!isHit(e.target) && !drag);
    if (drag) { O.input({ ...base(e), kind: 'win', type: 'mousemove' }); return; }
    const now = performance.now();
    if (now - lastMove > 80) { lastMove = now; O.input({ ...base(e), kind: 'move', over: isHit(e.target) ? (e.target.closest('#pics > i') ? 'pic' : 'el') : '' }); }
  }, true);
  document.addEventListener('mouseleave', () => setIgnore(true));
  document.addEventListener('mousedown', (e) => {
    if (e.target.closest?.('[data-drag]') && e.button === 0 && !e.target.closest('[data-act], button')) { miniDrag = true; window.tuner.mini.drag('start'); e.preventDefault(); return; }
    if (route(e, 'mousedown')) { drag = e.button === 0; e.preventDefault(); }
  }, true);
  document.addEventListener('mouseup', (e) => {
    if (miniDrag) { miniDrag = false; window.tuner.mini.drag('end'); return; }
    if (drag) { drag = false; O.input({ ...base(e), kind: 'win', type: 'mouseup' }); }
  }, true);
  for (const type of ['click', 'dblclick', 'contextmenu']) document.addEventListener(type, (e) => { if (route(e, type)) e.preventDefault(); }, true);
  document.addEventListener('wheel', (e) => { if (route(e, 'wheel')) e.preventDefault(); }, { capture: true, passive: false });
  // hover in the page's handlers (a tooltip's rest, the volume slider): over and out of the things that ask for it
  let hov = null;
  document.addEventListener('mouseover', (e) => {
    const h = e.target.closest?.('[data-hover]');
    if (h === hov) return;
    if (hov && root.contains(hov)) O.input({ ...base(e), kind: 'el', type: 'mouseout', path: pathOf(hov) });
    hov = h;
    if (h && root.contains(h)) O.input({ ...base(e), kind: 'el', type: 'mouseover', path: pathOf(h) });
  }, true);
})();
