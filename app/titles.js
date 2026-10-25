// Turns a title into a matching key, the same way in the app and in scripts/build-ratings.js, so provider
// titles like "|EN| The Dark Knight (2008) 4K" find "The Dark Knight" (2008) in the IMDb ratings file.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Titles = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Accents off, lowercase, "&" as "and", punctuation to spaces, and a leading article dropped.
  function norm(s) {
    return String(s || '')
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/['’`´]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/^(the|a|an) /, '');
  }

  // Provider extras: language prefixes ("EN -", "|EN|", "[EN]"), a year in brackets, quality and
  // subtitle tags, and season markers on series.
  const PREFIX = /^\s*(?:[[(|]\s*[A-Za-z]{2,5}(?:-[A-Za-z]{2})?\s*[\])|]|[A-Z]{2,5}(?:-[A-Z]{2})?\s*[:|\-–—])\s*/;
  const TAGS = /\b(4k|uhd|2160p?|1080p?|720p?|fhd|hd|sd|hdr10\+?|hdr|dv|dolby vision|hevc|h ?26[45]|x26[45]|multi[ -]?subs?|subs?|subbed|dual|vostfr|vf|vo|imax|3d|remastered|extended|director'?s cut|uncut)\b/gi;
  function clean(name) {
    let s = String(name || '');
    for (let i = 0; i < 2; i++) s = s.replace(PREFIX, '');
    let year = 0;
    s = s.replace(/[([]\s*((?:19|20)\d{2})\s*[)\]]/g, (m, y) => { year = year || +y; return ' '; });
    if (!year) s = s.replace(/\s((?:19|20)\d{2})\s*$/, (m, y) => { year = +y; return ' '; });
    s = s.replace(/\bS\d{1,2}(E\d{1,3})?\b|\bseason \d+\b/gi, ' ').replace(/\((US|UK|AU|CA|NZ|IE)\)/gi, ' ').replace(TAGS, ' ');
    return { key: norm(s), year };
  }

  return { norm, clean };
});
