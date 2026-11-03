// Names as a person reads them, shared by the TV and the iPhone app. Providers name channels and groups for their own
// panels: "US: ESPN HD", "|US| CNN", "US - TNT HD", "NEXT | POR - Trail Blazers vs Grizzlies", "Iceland | ÍS", "ᴿᴬᵂ"
// tags. Only what is shown changes; matching (games.js, search) keeps reading the provider's own name.
const MODS = /[ʰ-˿ᴀ-ᶿ⁰-₟꜀-ꜟ²³¹]+/g;   // small-letter tags ("ᴿᴬᵂ", "ᴴᴰ")
const BARS = /[|┃│¦]+/g;
// A short code before ":" or "|" ("US:", "PRIME:", "NEXT |", "UK|"), or a 2-3 letter country/team code before " - "
const PREFIX = /^(?:[A-Z0-9]{2,6}\s*[:|]|[A-Z]{2,3}\s+-\s+)\s*/;
const QUALITY = /[\s|:-]+(?:raw|hevc|h\.?265|fhd|uhd|hd|sd|4k|8k|50fps|60fps|backup|vip|\(?\d{3,4}p\)?)\b.*$/i;

function tidy(n) {
  return String(n || '').replace(MODS, ' ').replace(BARS, '|').replace(/[#=*~_]{3,}/g, ' ').replace(/\s+/g, ' ').trim();
}

// "US: ESPN HD" -> "ESPN", "|US| CNN" -> "CNN", "US - TNT HD" -> "TNT", "NEXT | POR - Trail Blazers vs Grizzlies" ->
// "Trail Blazers vs Grizzlies", "NBA 05 | LAL vs MEM" -> "NBA 05 · LAL vs MEM", "NBA 01: Memphis Grizzlies @ … HD" keeps its "NBA 01:"
export function cleanCh(n) {
  const raw = String(n || '').trim();
  let s = tidy(n).replace(/^\|\s*/, '');
  for (let i = 0; i < 2; i++) { const t = s.replace(PREFIX, '').replace(/^\|\s*/, ''); if (t === s || !t) break; s = t; }
  s = s.replace(QUALITY, '').replace(/[\s|:-]+$/, '').replace(/\s*\|\s*/g, ' · ').trim();
  return s || raw;
}

// Group names: "Iceland | ÍS" -> "Iceland", "UK | Entertainment" -> "UK · Entertainment", "##### SPORTS #####" -> "SPORTS"
export function cleanGroup(n) {
  const raw = String(n || '').trim();
  const parts = tidy(n).split(/\s*[|:]\s*/).map((x) => x.trim()).filter(Boolean);
  // a trailing language code after a country's full name ("Iceland | ÍS", "Germany | DE") says nothing new
  if (parts.length === 2 && parts[0].length > 3 && /^\p{Lu}{2,3}$/u.test(parts[1])) parts.pop();
  const s = [...new Set(parts)].join(' · ');
  return s || raw;
}

// A programme title without the provider's "NEXT | ", "LIVE: ", "NOW - " lead-in
export function cleanProg(t) {
  const raw = String(t || '').trim();
  const s = tidy(t).replace(/^(?:next|live|now|new|replay|upcoming)\s*[:|-]\s*/i, '').trim();
  return s || raw;
}

// A channel's display name, worked out once per name (it's read on every guide draw)
const memo = new Map();
export function chName(ch) {
  const n = typeof ch === 'string' ? ch : ch?.name;
  if (!n) return '';
  let v = memo.get(n);
  if (v === undefined) { if (memo.size > 20000) memo.clear(); v = cleanCh(n); memo.set(n, v); }
  return v;
}
