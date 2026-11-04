// The few Win32 calls the Windows app needs (design/ui-v1/desktop-v1/SPEC.md 9), over koffi (a prebuilt FFI, no
// native build step). Main process only. A "host" is a plain STATIC window (SS_BLACKRECT: it paints itself black, no
// window procedure of ours) that mpv attaches to with --wid; one per picture.
//   Plan A: the host is a child (WS_CHILD) of the Electron window, at the video rect in client pixels.
//   Plan C: the host is a borderless popup owned by the Electron window (above it, follows its activation), at the
//           video rect in screen pixels.
// Hand-offs between Electron windows move the host (SetParent for A, the owner for C), never mpv.
const IS_WIN = process.platform === 'win32';
let U = null;
function lib() {
  if (U || !IS_WIN) return U;
  const koffi = require('koffi');
  const user32 = koffi.load('user32.dll');
  const POINT = koffi.struct('AG_POINT', { x: 'long', y: 'long' });
  const RECT = koffi.struct('AG_RECT', { left: 'long', top: 'long', right: 'long', bottom: 'long' });
  // HWNDs as pointer-sized integers: they are what mpv's --wid takes, and Electron's handles are read the same way
  U = {
    CreateWindowExW: user32.func('intptr_t __stdcall CreateWindowExW(uint32_t ex, str16 cls, str16 name, uint32_t style, int x, int y, int w, int h, intptr_t parent, intptr_t menu, intptr_t inst, intptr_t param)'),
    DestroyWindow: user32.func('bool __stdcall DestroyWindow(intptr_t hwnd)'),
    SetWindowPos: user32.func('bool __stdcall SetWindowPos(intptr_t hwnd, intptr_t after, int x, int y, int cx, int cy, uint32_t flags)'),
    SetParent: user32.func('intptr_t __stdcall SetParent(intptr_t child, intptr_t parent)'),
    ShowWindow: user32.func('bool __stdcall ShowWindow(intptr_t hwnd, int cmd)'),
    GetClientRect: user32.func('bool __stdcall GetClientRect(intptr_t hwnd, _Out_ AG_RECT *r)'),
    GetWindowRect: user32.func('bool __stdcall GetWindowRect(intptr_t hwnd, _Out_ AG_RECT *r)'),
    ClientToScreen: user32.func('bool __stdcall ClientToScreen(intptr_t hwnd, _Inout_ AG_POINT *p)'),
    SetWindowLongPtrW: user32.func('intptr_t __stdcall SetWindowLongPtrW(intptr_t hwnd, int index, intptr_t value)'),
    IsWindowVisible: user32.func('bool __stdcall IsWindowVisible(intptr_t hwnd)'),
    GetParent: user32.func('intptr_t __stdcall GetParent(intptr_t hwnd)'),
    GetWindow: user32.func('intptr_t __stdcall GetWindow(intptr_t hwnd, uint32_t cmd)'),
    // (tests only: real OS input, so the overlay's hit-testing and focus rules are what is tested)
    SetCursorPos: user32.func('bool __stdcall SetCursorPos(int x, int y)'),
    mouse_event: user32.func('void __stdcall mouse_event(uint32_t flags, uint32_t dx, uint32_t dy, uint32_t data, uintptr_t extra)'),
    keybd_event: user32.func('void __stdcall keybd_event(uint8_t vk, uint8_t scan, uint32_t flags, uintptr_t extra)'),
    GetForegroundWindow: user32.func('intptr_t __stdcall GetForegroundWindow()'),
    POINT, RECT,
  };
  return U;
}

const WS_CHILD = 0x40000000, WS_POPUP = 0x80000000, WS_VISIBLE = 0x10000000, WS_CLIPSIBLINGS = 0x04000000, WS_CLIPCHILDREN = 0x02000000, WS_DISABLED = 0x08000000;
const WS_EX_TOOLWINDOW = 0x80, WS_EX_NOACTIVATE = 0x08000000;
const SS_BLACKRECT = 0x4;
const SWP_NOSIZE = 0x1, SWP_NOMOVE = 0x2, SWP_NOZORDER = 0x4, SWP_NOACTIVATE = 0x10, SWP_SHOWWINDOW = 0x40, SWP_HIDEWINDOW = 0x80, SWP_NOOWNERZORDER = 0x200;
const HWND_TOP = 0;
const GWLP_HWNDPARENT = -8;

// an Electron window's HWND as a number
const hwndOf = (bw) => { const b = bw.getNativeWindowHandle(); return b.length >= 8 ? Number(b.readBigUInt64LE(0)) : b.readUInt32LE(0); };

// plan: 'A' | 'C'. rect in physical pixels: client pixels of the parent (A) or screen pixels (C).
function createHost(parentHwnd, plan, r = { x: 0, y: 0, w: 16, h: 9 }) {
  const u = lib();
  if (!u) return 0;
  const child = plan !== 'C';
  const style = ((child ? WS_CHILD | WS_CLIPSIBLINGS : WS_POPUP | WS_DISABLED) | WS_CLIPCHILDREN | SS_BLACKRECT) >>> 0;   // (unsigned: WS_POPUP is the top bit)
  const ex = (child ? 0 : WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE) >>> 0;
  const h = u.CreateWindowExW(ex, 'STATIC', 'airglow-host', style, r.x, r.y, Math.max(1, r.w), Math.max(1, r.h), parentHwnd, 0, 0, 0);
  return Number(h) || 0;
}
// place and show (or hide) a host; raised to the top of its siblings (A: above Chromium's own child windows)
function place(h, r, show = true) {
  const u = lib();
  if (!u || !h) return false;
  if (!show) return u.SetWindowPos(h, 0, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_HIDEWINDOW);
  return u.SetWindowPos(h, HWND_TOP, Math.round(r.x), Math.round(r.y), Math.max(1, Math.round(r.w)), Math.max(1, Math.round(r.h)), SWP_NOACTIVATE | SWP_SHOWWINDOW | SWP_NOOWNERZORDER);
}
// a popup host (C) placed just under a given window (the overlay), so the overlay stays above the picture
function placeUnder(h, above, r) {
  const u = lib();
  if (!u || !h) return false;
  return u.SetWindowPos(h, above || HWND_TOP, Math.round(r.x), Math.round(r.y), Math.max(1, Math.round(r.w)), Math.max(1, Math.round(r.h)), SWP_NOACTIVATE | SWP_SHOWWINDOW | SWP_NOOWNERZORDER);
}
function reparent(h, newParent, plan) {
  const u = lib();
  if (!u || !h) return false;
  if (plan === 'C') { u.SetWindowLongPtrW(h, GWLP_HWNDPARENT, newParent); return true; }
  return !!u.SetParent(h, newParent);
}
function destroy(h) { const u = lib(); if (u && h) u.DestroyWindow(h); }
function clientToScreen(parent, x, y) {
  const u = lib();
  if (!u) return { x, y };
  const p = { x: Math.round(x), y: Math.round(y) };
  u.ClientToScreen(parent, p);
  return p;
}
function info(h) {
  const u = lib();
  if (!u || !h) return null;
  const r = {}, c = {};
  u.GetWindowRect(h, r);
  u.GetClientRect(h, c);
  // the first child: mpv's own window inside the host, once mpv has attached
  const kid = Number(u.GetWindow(h, 5 /* GW_CHILD */)) || 0;
  return { visible: !!u.IsWindowVisible(h), parent: Number(u.GetParent(h)) || 0, screen: r, client: c, mpvChild: kid };
}
// tests: a real click / key at screen pixels (mouse_event / keybd_event go through Windows' own hit-testing)
const MOUSE = { move: 0x1, ldown: 0x2, lup: 0x4, rdown: 0x8, rup: 0x10, wheel: 0x800 };
const test = {
  move(x, y) { lib()?.SetCursorPos(Math.round(x), Math.round(y)); },
  click(x, y, { button = 'l', double = false } = {}) {
    const u = lib(); if (!u) return;
    u.SetCursorPos(Math.round(x), Math.round(y));
    const d = button === 'r' ? MOUSE.rdown : MOUSE.ldown, up = button === 'r' ? MOUSE.rup : MOUSE.lup;
    for (let i = 0; i < (double ? 2 : 1); i++) { u.mouse_event(d, 0, 0, 0, 0); u.mouse_event(up, 0, 0, 0, 0); }
  },
  wheel(x, y, delta) { const u = lib(); if (!u) return; u.SetCursorPos(Math.round(x), Math.round(y)); u.mouse_event(MOUSE.wheel, 0, 0, delta >>> 0, 0); },
  key(vk) { const u = lib(); if (!u) return; u.keybd_event(vk, 0, 0, 0); u.keybd_event(vk, 0, 2, 0); },
  foreground() { return Number(lib()?.GetForegroundWindow()) || 0; },
};

module.exports = { IS_WIN, available: () => !!lib(), hwndOf, createHost, place, placeUnder, reparent, destroy, clientToScreen, info, test };
