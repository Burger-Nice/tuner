// Drives one <video> element. Tries each source in order (HLS, MPEG-TS, native) until one plays.
(function (global) {
  'use strict';

  class Player {
    constructor(video, onState) {
      this.video = video;
      this.onState = onState || (() => {});
      this.onLevels = null;
      this.token = 0;
      this.hls = null;
      this.mts = null;
      this.sources = [];
      video.addEventListener('playing', () => { clearTimeout(this.watch); this.onState('playing'); });
      video.addEventListener('waiting', () => this.onState('loading'));
      video.addEventListener('pause', () => this.onState('paused'));
    }

    load(sources, opts = {}) {
      this.sources = sources.filter(Boolean);
      this.opts = opts;
      this.i = 0;
      this._go();
    }

    retry() { this.i = 0; this._go(); }

    stop() {
      this.token++;
      clearTimeout(this.watch);
      this._teardown();
      this.onState('idle');
    }

    get source() { return this.sources[this.i]; }

    setLevel(i) { if (this.hls) this.hls.currentLevel = i; }

    _teardown() {
      const v = this.video;
      if (this.hls) { this.hls.destroy(); this.hls = null; }
      if (this.mts) { try { this.mts.destroy(); } catch {} this.mts = null; }
      v.onerror = null;
      v.removeAttribute('src');
      v.load();
    }

    _go() {
      const token = ++this.token;
      clearTimeout(this.watch);
      this._teardown();
      const s = this.sources[this.i];
      if (!s) { this.onState('error'); return; }
      this.onState('loading');
      if (this.onLevels) this.onLevels([]);

      const v = this.video;
      const opts = this.opts;
      const next = () => { if (token !== this.token) return; this.i++; this._go(); };
      const play = () => { const p = v.play(); if (p) p.catch(() => {}); };
      // A source that never starts is as good as a failed one.
      this.watch = setTimeout(next, opts.timeout || 15000);

      if (s.engine === 'hls' && global.Hls && Hls.isSupported()) {
        const hls = (this.hls = new Hls({
          backBufferLength: 30,
          maxBufferLength: 30,
          manifestLoadingMaxRetry: 1,
          levelLoadingMaxRetry: 2,
          startPosition: opts.startAt || -1,
        }));
        let recovered = false;
        hls.on(Hls.Events.MANIFEST_PARSED, (_, d) => { if (this.onLevels) this.onLevels(d.levels); play(); });
        hls.on(Hls.Events.ERROR, (_, d) => {
          if (!d.fatal) return;
          if (d.type === Hls.ErrorTypes.MEDIA_ERROR && !recovered) { recovered = true; hls.recoverMediaError(); return; }
          next();
        });
        hls.loadSource(s.url);
        hls.attachMedia(v);
      } else if (s.engine === 'mpegts' && global.mpegts && mpegts.getFeatureList().mseLivePlayback) {
        const p = (this.mts = mpegts.createPlayer(
          { type: /\.flv(\?|$)/i.test(s.url) ? 'flv' : 'mpegts', isLive: true, url: s.url },
          { enableStashBuffer: false, liveBufferLatencyChasing: true, liveBufferLatencyMaxLatency: 6, liveBufferLatencyMinRemain: 1.5 }
        ));
        p.on(mpegts.Events.ERROR, next);
        p.attachMediaElement(v);
        p.load();
        play();
      } else if (s.engine === 'native') {
        v.onerror = next;
        if (opts.startAt) v.addEventListener('loadedmetadata', () => { v.currentTime = opts.startAt; }, { once: true });
        v.src = s.url;
        play();
      } else {
        next();
      }
    }
  }

  global.Player = Player;
})(window);
