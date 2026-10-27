// The file fingerprint (OpenSubtitles' moviehash) and the range-read rules (design/ui-v1/subtitles/SPEC.md 5.1, 5.2).
//
// fingerprint = (size + the sum of the little-endian 64-bit words of the first and the last 64 KiB) mod 2^64, as 16
// lowercase hex digits.
//
// On the TV the reads are the native check's (Probe.java reads the same two 64 KiB blocks for the formats and sends the
// fingerprint with its result; PORT-NATIVE.md), so nothing is read twice. readFingerprint() below is the same rules
// over fetch, for the browser (development, tests) and as the reference the native port follows. It is NOT used on the
// TV: with CapacitorHttp on, a GET goes through the native proxy, which streams the answer but can't be stopped
// part-way reliably, and a server that ignores Range would start sending the whole film.
export const BLOCK = 65536;
const MASK = (1n << 64n) - 1n;

// head, tail: the first and last 64 KiB (Uint8Array or ArrayBuffer; a file under 64 KiB has no fingerprint)
export function moviehash(size, head, tail) {
  const h = head instanceof Uint8Array ? head : new Uint8Array(head), t = tail instanceof Uint8Array ? tail : new Uint8Array(tail);
  if (!(size >= BLOCK) || h.length < BLOCK || t.length < BLOCK) return '';
  let sum = BigInt(size) & MASK;
  for (const b of [h, t]) {
    const dv = new DataView(b.buffer, b.byteOffset, BLOCK);
    for (let i = 0; i < BLOCK; i += 8) sum = (sum + dv.getBigUint64(i, true)) & MASK;
  }
  return sum.toString(16).padStart(16, '0');
}

// "bytes 0-65535/1180090590" -> { from, to, total }
export function contentRange(v) {
  const m = /^\s*bytes\s+(\d+)-(\d+)\/(\d+|\*)\s*$/i.exec(String(v || ''));
  return m ? { from: +m[1], to: +m[2], total: m[3] === '*' ? 0 : +m[3] } : null;
}

export const CAP_BYTES = 1 << 20;   // 1 MB of reads per check (the native check adds one moov read of up to 8 MB)
export const TIMEOUT = 6000;        // a 6 s wall-clock timeout for the whole check

// Read at most `max` bytes of a response, then stop it (a 200 to a range request would otherwise send the whole film).
async function readUpTo(res, max, budget) {
  const out = new Uint8Array(max);
  let n = 0;
  if (!res.body?.getReader) { const b = new Uint8Array(await res.arrayBuffer()); out.set(b.subarray(0, max)); budget.used += Math.min(b.length, max); return out.subarray(0, Math.min(b.length, max)); }
  const rd = res.body.getReader();
  try {
    while (n < max) {
      const { done, value } = await rd.read();
      if (done) break;
      const k = Math.min(value.length, max - n);
      out.set(value.subarray(0, k), n); n += k; budget.used += k;
      if (budget.used > CAP_BYTES) throw new Error('cap');
    }
  } finally { rd.cancel().catch(() => {}); }
  return out.subarray(0, n);
}

// The two reads, by the rules:
//  1. head `Range: bytes=0-65535`, at most 64 KiB then close. 206: the size from Content-Range. 200 (no partial reads):
//     keep the 64 KiB, the size from Content-Length, skip the tail: no fingerprint, status 'head-only'.
//  2. tail `Range: bytes=<size-65536>-<size-1>`: it must be a 206 whose Content-Range names exactly that range, else the
//     check stops: 'couldnt' (a 200 would hand over the file's first 64 KiB as its last).
// -> { status: 'ok' | 'head-only' | 'couldnt', size, etag, hash, head, tail, why }
// opts: { fetch, headers, signal (Play cancels), timeout }
export async function readFingerprint(url, opts = {}) {
  const f = opts.fetch || globalThis.fetch, ctl = new AbortController(), budget = { used: 0 };
  const stop = () => ctl.abort();
  opts.signal?.addEventListener?.('abort', stop);
  const timer = setTimeout(stop, opts.timeout || TIMEOUT);
  const get = (range) => f(url, { headers: { ...(opts.headers || {}), Range: `bytes=${range}` }, signal: ctl.signal, cache: 'no-store' });
  try {
    const h = await get(`0-${BLOCK - 1}`);
    const etag = h.headers.get('etag') || '';
    if (h.status === 200) {
      const head = await readUpTo(h, BLOCK, budget);
      return { status: 'head-only', size: +h.headers.get('content-length') || 0, etag, hash: '', head, tail: null, why: 'no partial reads' };
    }
    if (h.status !== 206) { h.body?.cancel?.().catch(() => {}); return { status: 'couldnt', size: 0, etag, hash: '', why: `head ${h.status}` }; }
    const cr = contentRange(h.headers.get('content-range'));
    const head = await readUpTo(h, BLOCK, budget);
    const size = cr?.total || 0;
    if (!size) return { status: 'head-only', size: 0, etag, hash: '', head, tail: null, why: 'no size' };
    if (size < BLOCK) return { status: 'head-only', size, etag, hash: '', head, tail: null, why: 'small file' };   // (64-128 KiB: the blocks overlap, as OpenSubtitles reads them)
    const from = size - BLOCK, to = size - 1;
    const t = await get(`${from}-${to}`);
    const tr = contentRange(t.headers.get('content-range'));
    if (t.status !== 206 || !tr || tr.from !== from || tr.to !== to || (tr.total && tr.total !== size)) {
      t.body?.cancel?.().catch(() => {});
      return { status: 'couldnt', size, etag, hash: '', head, why: `tail ${t.status} ${t.headers.get('content-range') || ''}`.trim() };
    }
    const tail = await readUpTo(t, BLOCK, budget);
    if (tail.length < BLOCK || head.length < BLOCK) return { status: 'couldnt', size, etag, hash: '', head, why: 'short read' };
    return { status: 'ok', size, etag, hash: moviehash(size, head, tail), head, tail, why: '' };
  } catch (e) {
    return { status: 'couldnt', size: 0, etag: '', hash: '', why: ctl.signal.aborted ? (opts.signal?.aborted ? 'cancelled' : 'timeout') : e.message === 'cap' ? 'over the read cap' : String(e.message || e) };
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener?.('abort', stop);
  }
}
