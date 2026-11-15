(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const SVGNS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  const VENUE = 'Gautam Himtaj Resorts, ARAZI-542M, Ganeshpur, Tarna, Shivpur (Opp. BHEL), Varanasi, Uttar Pradesh 221003, India';
  const MAP_LINK = 'https://share.google/Yadpbm8V7tsYNzcfe';
  const EVENTS = {
    haldi:   { title: 'Haldi · Sandeep & Divyanshi',       utc: '20270125T093000Z' }, // 25 Jan 2027, 3:00 PM IST
    sangeet: { title: 'Sangeet · Sandeep & Divyanshi',     utc: '20270125T143000Z' }, // 25 Jan 2027, 8:00 PM IST
    vivah:   { title: 'Shubh Vivah · Sandeep & Divyanshi', utc: '20270126T143000Z' }  // 26 Jan 2027, 8:00 PM IST
  };
  const WEDDING = new Date('2027-01-26T20:00:00+05:30');

  const isHi = () => false;

  /* ---------------- Music: original shehnai-style raga (Bhupali), synthesized live ---------------- */
  const Synth = {
    ctx: null, playing: false, timer: null, nextTime: 0, idx: 0, beat: 0.42, prevFreq: null,
    SA: 293.66,
    // [semitones from Sa, beats]; null = rest
    tune: [
      [12,2],[9,1],[7,1],[4,2],[7,1],[9,1],[12,4],
      [14,1],[12,1],[9,1],[7,1],[9,2],[7,1],[4,1],[2,2],[0,4],
      [4,1],[7,1],[9,2],[12,1],[14,1],[16,2],[14,1],[12,1],[9,2],[7,4],
      [9,1],[7,1],[4,1],[2,1],[4,2],[2,1],[0,1],[0,4],[null,4]
    ],
    hz(st) { return this.SA * Math.pow(2, st / 12); },
    init() {
      const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = ctx.createGain(); this.master.gain.value = 0.0;
      const len = ctx.sampleRate * 2.5, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      const rev = ctx.createConvolver(); rev.buffer = ir;
      const wet = ctx.createGain(); wet.gain.value = 0.35;
      this.bus = ctx.createGain();
      this.bus.connect(this.master); this.bus.connect(rev); rev.connect(wet); wet.connect(this.master);
      this.master.connect(ctx.destination);
    },
    voice(freq, t, dur) {
      const ctx = this.ctx;
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      o1.type = 'sawtooth'; o2.type = 'square';
      const start = this.prevFreq || freq;
      [o1, o2].forEach((o) => { o.frequency.setValueAtTime(start, t); o.frequency.setTargetAtTime(freq, t, 0.04); });
      o2.detune.value = 6;
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 5.4; lg.gain.value = freq * 0.012;
      lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 1.2;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
      const g = ctx.createGain(); const m = ctx.createGain(); m.gain.value = 0.5;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.06);
      g.gain.setValueAtTime(0.14, t + dur * 0.8);
      g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
      o1.connect(bp); o2.connect(m); m.connect(bp); bp.connect(lp); lp.connect(g); g.connect(this.bus);
      [o1, o2, lfo].forEach((o) => { o.start(t); o.stop(t + dur + 0.1); });
      this.prevFreq = freq;
    },
    pluck(freq, t, vol = 0.07) {
      const ctx = this.ctx, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = freq;
      f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(400, t + 2.5);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
      o.connect(f); f.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 3.3);
    },
    drum(t, low) {
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = low ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(low ? 140 : 620, t);
      o.frequency.exponentialRampToValueAtTime(low ? 55 : 480, t + (low ? 0.35 : 0.08));
      g.gain.setValueAtTime(low ? 0.22 : 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (low ? 0.45 : 0.12));
      o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.5);
    },
    schedule() {
      const ctx = this.ctx;
      while (this.nextTime < ctx.currentTime + 0.6) {
        const [st, beats] = this.tune[this.idx];
        const dur = beats * this.beat, t = this.nextTime;
        if (st !== null) this.voice(this.hz(st), t, dur); else this.prevFreq = null;
        for (let b = 0; b < beats; b++) {
          const bt = t + b * this.beat;
          this.beatCount = (this.beatCount || 0) + 1;
          const pos = this.beatCount % 8;
          if (pos === 0 || pos === 5) this.drum(bt, true);
          else if (pos === 3 || pos === 6 || pos === 7) this.drum(bt, false);
          if (this.beatCount % 8 === 0) {
            const sa = this.SA / 2;
            this.pluck(sa * 1.5, bt); this.pluck(sa * 2, bt + this.beat * 2);
            this.pluck(sa * 2, bt + this.beat * 4); this.pluck(sa, bt + this.beat * 6, 0.09);
          }
        }
        this.nextTime += dur;
        this.idx = (this.idx + 1) % this.tune.length;
      }
    },
    play() {
      if (!this.ctx) this.init();
      this.ctx.resume();
      this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + 0.1);
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(0.55, this.ctx.currentTime, 0.8);
      clearInterval(this.timer);
      this.timer = setInterval(() => this.schedule(), 120);
      this.playing = true; $('#musicBtn').classList.add('playing');
    },
    pause() {
      if (!this.ctx) return;
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      clearInterval(this.timer);
      setTimeout(() => { if (!this.playing) this.ctx.suspend(); }, 700);
      this.playing = false; $('#musicBtn').classList.remove('playing');
    }
  };

  /* Plays music/wedding.mp3 if present; otherwise falls back to the synthesized tune. */
  const Music = (() => {
    const audio = new Audio('music/wedding.mp3');
    audio.loop = true; audio.preload = 'auto'; audio.volume = 0;
    let useFile = null, playing = false, fadeTimer = null;
    audio.addEventListener('canplaythrough', () => { if (useFile === null) useFile = true; }, { once: true });
    audio.addEventListener('error', () => { useFile = false; });
    const fade = (to, done) => {
      clearInterval(fadeTimer);
      fadeTimer = setInterval(() => {
        const v = audio.volume + (to > audio.volume ? 0.05 : -0.05);
        audio.volume = Math.min(1, Math.max(0, v));
        if (Math.abs(audio.volume - to) < 0.05) { audio.volume = to; clearInterval(fadeTimer); if (done) done(); }
      }, 60);
    };
    return {
      get playing() { return playing; },
      set resumeOnShow(v) { this._r = v; }, get resumeOnShow() { return this._r; },
      play() {
        playing = true; $('#musicBtn').classList.add('playing');
        if (useFile === false) return Synth.play();
        audio.play().then(() => { useFile = true; fade(0.8); }).catch(() => { useFile = false; if (playing) Synth.play(); });
      },
      pause() {
        playing = false; $('#musicBtn').classList.remove('playing');
        if (useFile) fade(0, () => audio.pause()); else Synth.pause();
      }
    };
  })();
  $('#musicBtn').addEventListener('click', () => (Music.playing ? Music.pause() : Music.play()));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Music.playing) { Music.pause(); Music.resumeOnShow = true; }
    else if (!document.hidden && Music.resumeOnShow) { Music.resumeOnShow = false; Music.play(); }
  });

  /* ---------------- Intro: tap the seal -> card opens -> curtains part ---------------- */
  const intro = $('#intro');
  document.body.classList.add('locked');
  $('#openBtn').addEventListener('click', () => {
    if (intro.classList.contains('opening')) return;
    intro.classList.add('opening');
    try { Music.play(); } catch (e) {}
    setTimeout(() => intro.classList.add('flaps-open'), 450);
    setTimeout(() => intro.classList.add('curtains-open'), 1500);
    setTimeout(() => { document.body.classList.add('entered'); Petals.burst(50); }, 2600);
    setTimeout(() => { intro.classList.add('leaving'); document.body.classList.remove('locked'); }, 4300);
    setTimeout(() => intro.classList.add('gone'), 5100);
  });

  /* ---------------- Couple scene: stars + hanging vines ---------------- */
  (function useCouplePhoto() {
    const img = $('#couplePhoto');
    if (!img) return;
    const show = () => { img.hidden = false; img.parentElement.classList.add('has-photo'); };
    if (img.complete && img.naturalWidth) show(); else img.addEventListener('load', show);
  })();
  (function buildCoupleScene() {
    const stars = $('#sceneStars'), vines = $('#sceneVines');
    if (!stars || !vines) return;
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 40; i++) el('circle', { cx: 25 + rnd() * 350, cy: 25 + rnd() * 150, r: 0.6 + rnd() * 1.3, opacity: 0.5 + rnd() * 0.5 }, stars);
    const archY = (x) => 170 - 150 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 200) / 180, 2)));
    const greens = ['#4f8a5b', '#6aa36f', '#86b97d', '#3f7a4c'];
    for (let x = 40; x <= 360; x += 13) {
      const top = archY(x) - 4, len = 40 + rnd() * (x > 150 && x < 250 ? 40 : 80);
      el('path', { d: `M${x} ${top} q${rnd() * 6 - 3} ${len / 2} ${rnd() * 4 - 2} ${len}`, stroke: '#5e8f5e', 'stroke-width': 0.8, fill: 'none' }, vines);
      for (let y = 6; y < len; y += 6) {
        const side = (y / 6) % 2 ? -1 : 1;
        el('ellipse', { cx: x + side * 2.6, cy: top + y, rx: 2.8, ry: 1.6, fill: greens[(rnd() * 4) | 0], transform: `rotate(${side * 35} ${x + side * 2.6} ${top + y})` }, vines);
      }
      if (rnd() > 0.6) el('circle', { cx: x, cy: top + len + 2, r: 2, fill: '#fff3c4' }, vines);
    }
  })();

  /* ---------------- Venue stage illustration ---------------- */
  $$('[data-venue]').forEach((svg, n) => {
    const P = `v${n}`;
    const STONE = '#e3c49b', STONE_D = '#c79d6c', LINE = '#a87d4f';
    const defs = el('defs', {}, svg);
    const lg = (id, stops, vertical = true) => {
      const g = el('linearGradient', { id, x1: 0, y1: 0, x2: vertical ? 0 : 1, y2: vertical ? 1 : 0 }, defs);
      stops.forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, g));
    };
    lg(P + 'vSky', [[0, '#bfe0ee'], [1, '#f4fafc']]);
    lg(P + 'vStone', [[0, '#efd6b3'], [1, '#d2a877']]);
    lg(P + 'vSpire', [[0, '#c99c69'], [.5, '#f0d7b4'], [1, '#c99c69']], false);
    lg(P + 'vCarpet', [[0, '#c4122f'], [1, '#8f0d22']]);
    lg(P + 'vGold', [[0, '#f6dc95'], [.5, '#c9973f'], [1, '#9c6a1f']]);

    el('rect', { width: 600, height: 380, fill: `url(#${P}vSky)` }, svg);
    const g = el('g', { stroke: LINE, 'stroke-width': 1 }, svg);

    // Outer curved spires
    [75, 525].forEach((cx) => {
      el('path', { d: `M${cx - 58} 205 Q${cx - 56} 120 ${cx} 62 Q${cx + 56} 120 ${cx + 58} 205Z`, fill: `url(#${P}vSpire)` }, g);
      for (let y = 80; y < 205; y += 14) {
        const w = 58 * Math.min(1, (y - 55) / 110) + 4;
        el('path', { d: `M${cx - w} ${y} Q${cx} ${y + 5} ${cx + w} ${y}`, fill: 'none', opacity: .6 }, g);
      }
      el('path', { d: `M${cx} 64 V205`, opacity: .4 }, g);
      el('ellipse', { cx, cy: 56, rx: 12, ry: 8, fill: STONE }, g);
      el('path', { d: `M${cx} 48 V36`, 'stroke-width': 2 }, g);
      el('circle', { cx, cy: 34, r: 3, fill: '#c9973f' }, g);
    });

    // Stepped pyramid towers
    [185, 415].forEach((cx) => {
      for (let i = 0; i < 9; i++) {
        const w = 120 - i * 12, y = 190 - i * 14;
        el('rect', { x: cx - w / 2, y, width: w, height: 14, fill: i % 2 ? STONE : `url(#${P}vStone)` }, g);
        for (let x = cx - w / 2 + 8; x < cx + w / 2 - 6; x += 13) el('rect', { x, y: y + 4, width: 6, height: 7, fill: STONE_D, stroke: 'none' }, g);
      }
      el('rect', { x: cx - 16, y: 50, width: 32, height: 16, fill: STONE }, g);
      el('path', { d: `M${cx - 14} 50 Q${cx} 30 ${cx + 14} 50Z`, fill: STONE }, g);
      el('circle', { cx, cy: 28, r: 3, fill: '#c9973f' }, g);
    });

    // Central block with lattice and domes
    el('rect', { x: 238, y: 140, width: 124, height: 64, fill: `url(#${P}vStone)` }, g);
    el('rect', { x: 252, y: 104, width: 96, height: 36, fill: STONE }, g);
    for (let x = 256; x < 346; x += 6) el('path', { d: `M${x} 106 L${x + 6} 138 M${x + 6} 106 L${x} 138`, opacity: .45 }, g);
    [262, 284, 306, 328].forEach((x) => { el('path', { d: `M${x - 7} 104 Q${x + 2} 86 ${x + 11} 104Z`, fill: STONE }, g); el('circle', { cx: x + 2, cy: 88, r: 2, fill: '#c9973f' }, g); });
    [238, 362].forEach((x) => el('path', { d: `M${x - 16} 142 Q${x} 112 ${x + 16} 142Z`, fill: STONE }, g));
    el('path', { d: 'M266 204 V176 Q300 146 334 176 V204', fill: STONE_D, opacity: .7 }, g);
    for (let x = 248; x < 356; x += 14) el('rect', { x, y: 186, width: 4, height: 18, fill: STONE_D, stroke: 'none' }, g);

    // Main wall, cornice, red band
    el('rect', { x: 0, y: 204, width: 600, height: 100, fill: `url(#${P}vStone)` }, g);
    el('rect', { x: 0, y: 200, width: 600, height: 10, fill: STONE_D }, g);
    el('rect', { x: 0, y: 210, width: 600, height: 16, fill: '#b8142e', stroke: 'none' }, g);
    // Niches with carved figures
    [[20, 98], [502, 580]].forEach(([a, b]) => {
      for (let x = a; x < b; x += 20) {
        el('path', { d: `M${x} 290 V250 Q${x + 8} 238 ${x + 16} 250 V290Z`, fill: STONE_D, opacity: .55 }, g);
        el('circle', { cx: x + 8, cy: 258, r: 3, fill: LINE, stroke: 'none', opacity: .6 }, g);
        el('path', { d: `M${x + 4} 286 Q${x + 8} 262 ${x + 12} 286Z`, fill: LINE, stroke: 'none', opacity: .5 }, g);
      }
    });
    [[178, 230], [370, 422]].forEach(([a, b]) => el('path', { d: `M${a} 296 V250 Q${(a + b) / 2} 228 ${b} 250 V296Z`, fill: STONE_D, opacity: .45 }, g));
    // Pillars
    [104, 160, 440, 496].forEach((x) => {
      el('rect', { x: x - 9, y: 226, width: 18, height: 78, fill: STONE }, g);
      for (let y = 234; y < 300; y += 10) el('path', { d: `M${x - 9} ${y} H${x + 9}`, opacity: .5 }, g);
      el('rect', { x: x - 12, y: 226, width: 24, height: 6, fill: STONE_D }, g);
    });

    // Centre arch, sunburst, floral ring
    el('path', { d: 'M250 304 V256 Q300 214 350 256 V304Z', fill: '#f1dcc0' }, g);
    const rays = el('g', { class: 'rays', stroke: '#d9b27c', 'stroke-width': 1.2 }, svg);
    for (let a = 0; a < 360; a += 10) {
      const r = (a * Math.PI) / 180;
      el('line', { x1: 300 + Math.cos(r) * 6, y1: 262 + Math.sin(r) * 6, x2: 300 + Math.cos(r) * 28, y2: 262 + Math.sin(r) * 28 }, rays);
    }
    const ring = el('g', {}, svg);
    for (let a = 0; a < 360; a += 9) {
      const r = (a * Math.PI) / 180, col = ['#3f56b5', '#fff', '#f5c518', '#fff'][(a / 9) % 4];
      el('circle', { cx: 300 + Math.cos(r) * 34, cy: 262 + Math.sin(r) * 34, r: 3.4, fill: col, stroke: '#2f6b3f', 'stroke-width': .5 }, ring);
    }

    // Floor + red carpet with white pattern
    el('rect', { x: 0, y: 304, width: 600, height: 76, fill: `url(#${P}vCarpet)` }, svg);
    const pat = el('g', { fill: 'none', stroke: '#f6d7dc', 'stroke-width': 1, opacity: .7 }, svg);
    for (let x = 30; x < 600; x += 90) {
      el('ellipse', { cx: x, cy: 330, rx: 34, ry: 8 }, pat);
      el('ellipse', { cx: x + 45, cy: 352, rx: 34, ry: 8 }, pat);
    }
    el('rect', { x: 0, y: 362, width: 600, height: 18, fill: `url(#${P}vStone)`, stroke: LINE }, svg);

    // Sofa + chairs
    const seat = (x, w, h) => {
      const s = el('g', { stroke: '#9c6a1f', 'stroke-width': 1.2 }, svg);
      el('path', { d: `M${x - w / 2} 312 V${312 - h} Q${x} ${312 - h - 16} ${x + w / 2} ${312 - h} V312Z`, fill: `url(#${P}vGold)` }, s);
      el('path', { d: `M${x - w / 2 + 6} 304 V${314 - h} Q${x} ${314 - h - 10} ${x + w / 2 - 6} ${314 - h} V304Z`, fill: '#fffaf2' }, s);
      el('rect', { x: x - w / 2 - 4, y: 300, width: w + 8, height: 10, rx: 4, fill: '#fffaf2' }, s);
      el('path', { d: `M${x - w / 2} 310 v10 M${x + w / 2} 310 v10`, 'stroke-width': 3 }, s);
    };
    seat(300, 76, 34); seat(232, 30, 46); seat(368, 30, 46);

    // Garlands: blue / white / yellow swags + drops
    const gar = el('g', { fill: 'none', 'stroke-linecap': 'round' }, svg);
    const swag = (d, cls = '') => {
      const s = el('g', { class: cls }, gar);
      el('path', { d, stroke: '#2f6b3f', 'stroke-width': 7, opacity: .8 }, s);
      el('path', { d, stroke: '#fff', 'stroke-width': 6, 'stroke-dasharray': '0 9' }, s);
      el('path', { d, stroke: '#3f56b5', 'stroke-width': 5, 'stroke-dasharray': '0 9', 'stroke-dashoffset': 3 }, s);
      el('path', { d, stroke: '#f5c518', 'stroke-width': 4.5, 'stroke-dasharray': '0 9', 'stroke-dashoffset': 6 }, s);
    };
    let d = 'M0 206';
    for (let x = 0; x < 600; x += 60) d += ` Q${x + 30} 232 ${x + 60} 206`;
    swag(d, 'swag');
    swag('M248 150 Q274 166 300 150 Q326 166 352 150');
    [104, 160, 440, 496].forEach((x) => swag(`M${x} 214 V262`, 'swag'));
    [[60, 150], [225, 375], [450, 540]].forEach(([a, b]) => swag(`M${a} 368 Q${(a + b) / 2} 392 ${b} 368`));

    // Twinkling fairy lights along the cornice
    const lights = el('g', { fill: '#fff3c4' }, svg);
    for (let x = 10; x < 600; x += 22) el('circle', { class: 'twinkle', cx: x, cy: 198, r: 1.8 }, lights);
  });

  /* ---------------- Hero mandala halo ---------------- */
  (function buildHeroMandala() {
    const svg = $('#heroMandala');
    if (!svg) return;
    const defs = el('defs', {}, svg);
    const grad = el('radialGradient', { id: 'heroGlow' }, defs);
    el('stop', { offset: '0', 'stop-color': '#ffffff', 'stop-opacity': '.9' }, grad);
    el('stop', { offset: '.55', 'stop-color': '#fbf3dc', 'stop-opacity': '.35' }, grad);
    el('stop', { offset: '1', 'stop-color': '#ffffff', 'stop-opacity': '0' }, grad);
    el('circle', { r: 200, fill: 'url(#heroGlow)' }, svg);
    const g = el('g', { fill: 'none', stroke: '#c9973f', 'stroke-width': 1.2 }, svg);
    [62, 104, 146, 176, 192].forEach((r, i) => el('circle', { r, 'stroke-width': i === 4 ? 0.8 : 1.2 }, g));
    const ring = (n, r0, r1, w, extra = {}, off = 0) => {
      for (let i = 0; i < n; i++) {
        const a = (360 / n) * i + off;
        el('path', { d: `M0 ${-r0} Q${w} ${-(r0 + r1) / 2} 0 ${-r1} Q${-w} ${-(r0 + r1) / 2} 0 ${-r0}Z`, transform: `rotate(${a})`, ...extra }, g);
      }
    };
    ring(12, 20, 60, 13, { fill: 'rgba(241,212,142,.35)' });
    ring(16, 62, 104, 15, { fill: 'rgba(255,250,235,.5)' });
    ring(16, 66, 96, 7, {}, 11.25);
    ring(32, 104, 144, 8, { fill: 'rgba(241,212,142,.25)' });
    for (let i = 0; i < 64; i++) {
      const a = ((360 / 64) * i * Math.PI) / 180;
      el('circle', { cx: Math.sin(a) * 161, cy: -Math.cos(a) * 161, r: i % 2 ? 1.6 : 3, fill: '#c9973f', stroke: 'none' }, g);
    }
    for (let i = 0; i < 48; i++) {
      el('line', { x1: 0, y1: -178, x2: 0, y2: -190, transform: `rotate(${7.5 * i})`, 'stroke-width': 1 }, g);
    }
  })();

  /* ---------------- Hero marigold garland ---------------- */
  (function buildHeroGarland() {
    const svg = $('#heroGarland');
    if (!svg) return;
    const cols = ['#f39c12', '#f7c531', '#e67e22', '#f7c531'];
    const swags = innerWidth > 700 ? 5 : 3, W = 1000 / swags;
    for (let s = 0; s < swags; s++) {
      const x0 = s * W, sag = 62;
      for (let i = 0; i <= 26; i++) {
        const t = i / 26, x = x0 + W * t, y = 8 + sag * 4 * t * (1 - t);
        el('ellipse', { cx: x, cy: y, rx: 8, ry: 7, fill: cols[i % cols.length] }, svg);
      }
      if (s > 0) {
        for (let j = 0; j < 9; j++) el('ellipse', { cx: x0, cy: 12 + j * 10, rx: 6, ry: 5.5, fill: cols[(j + 1) % cols.length] }, svg);
        el('path', { d: `M${x0 - 6} 104 L${x0 + 6} 104 L${x0} 116Z`, fill: '#c9973f' }, svg);
      }
    }
    for (let i = 0; i <= swags; i++) {
      el('circle', { cx: i * W, cy: 8, r: 10, fill: '#7a2350' }, svg);
      el('circle', { cx: i * W, cy: 8, r: 4, fill: '#f1d48e' }, svg);
    }
  })();

  /* ---------------- Monogram wreath leaves ---------------- */
  (function buildMonogram() {
    const g = $('#monoLeaves');
    if (!g) return;
    const C = 150, R = 110, toRad = (d) => (d * Math.PI) / 180;
    const sprig = (from, to) => {
      const dir = Math.sign(to - from), steps = Math.round(Math.abs(to - from) / 7);
      for (let i = 0; i <= steps; i++) {
        const p = i / steps, a = from + (to - from) * p;
        const x = C + Math.cos(toRad(a)) * R, y = C + Math.sin(toRad(a)) * R;
        const s = (0.55 + 0.55 * Math.sin(Math.PI * Math.min(1, p * 1.1))) * (i === steps ? 0.8 : 1);
        const tangent = a + 90 * dir;
        [-38, 38].forEach((off) => {
          el('path', { d: 'M0 0 Q7 -4.5 15 0 Q7 4.5 0 0Z', transform: `translate(${x} ${y}) rotate(${tangent + off}) scale(${s})` }, g);
        });
      }
      const ae = toRad(to), tip = to + 90 * dir;
      el('path', { d: 'M0 0 Q8 -4 16 0 Q8 4 0 0Z', transform: `translate(${C + Math.cos(ae) * R} ${C + Math.sin(ae) * R}) rotate(${tip}) scale(.9)` }, g);
    };
    sprig(-95, -20);
    sprig(85, 160);
  })();

  /* ---------------- Save-the-date calendar (January 2027) ---------------- */
  (function buildCalendar() {
    const cal = $('#calendar');
    if (!cal) return;
    const EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MARK = [25, 26];
    const heart = '<svg viewBox="0 0 32 30" aria-hidden="true"><path d="M16 29 C6 21 1 15 1 9 A7.5 7.5 0 0 1 16 5 A7.5 7.5 0 0 1 31 9 C31 15 26 21 16 29Z"/></svg>';
    let html = EN.map((d) => `<div class="dow">${d.toUpperCase()}</div>`).join('');
    const first = new Date(2027, 0, 1).getDay();
    for (let i = 0; i < first; i++) html += '<div></div>';
    for (let d = 1; d <= 31; d++) {
      const m = MARK.includes(d);
      html += `<div class="day${m ? ' mark' : ''}">${m ? heart : ''}<span>${d}</span></div>`;
    }
    cal.innerHTML = html;
  })();

  /* ---------------- Falling marigold & rose petals ---------------- */
  const Petals = (() => {
    const c = $('#petals'), ctx = c.getContext('2d');
    const colors = ['#f59e0b', '#fbbf24', '#f97316', '#ffd166', '#e11d48', '#fb7185'];
    let W, H, dpr, list = [];
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr;
      c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px';
    };
    const make = (top) => ({
      x: Math.random() * W, y: top ? -20 * dpr : Math.random() * H,
      r: (4 + Math.random() * 6) * dpr, vy: (0.4 + Math.random() * 0.9) * dpr,
      sw: Math.random() * Math.PI * 2, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.05,
      col: colors[(Math.random() * colors.length) | 0]
    });
    resize(); addEventListener('resize', resize);
    const base = innerWidth < 640 ? 14 : 24;
    for (let i = 0; i < base; i++) list.push(make(false));
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      list.forEach((p, i) => {
        p.sw += 0.02; p.y += p.vy; p.x += Math.sin(p.sw) * 0.6 * dpr; p.rot += p.vr;
        if (p.y > H + 20 * dpr) { if (list.length > base) list.splice(i, 1); else Object.assign(p, make(true)); }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.col; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      requestAnimationFrame(tick);
    };
    if (!reduce) tick();
    return { burst(n) { for (let i = 0; i < n; i++) { const p = make(true); p.y = -Math.random() * H * 0.5; p.vy *= 1.6; list.push(p); } } };
  })();

  /* ---------------- Countdown ---------------- */
  const pad = (n) => String(n).padStart(2, '0');
  const tickCountdown = () => {
    const diff = WEDDING - Date.now();
    if (diff <= 0) { $('#timer').hidden = true; $('#cdDone').hidden = false; return; }
    const s = Math.floor(diff / 1000);
    $('#cdD').textContent = Math.floor(s / 86400);
    $('#cdH').textContent = pad(Math.floor(s / 3600) % 24);
    $('#cdM').textContent = pad(Math.floor(s / 60) % 60);
    $('#cdS').textContent = pad(s % 60);
  };
  tickCountdown(); setInterval(tickCountdown, 1000);

  /* ---------------- Calendar ---------------- */
  $$('[data-cal]').forEach((a) => {
    const e = EVENTS[a.dataset.cal];
    const q = new URLSearchParams({
      action: 'TEMPLATE', text: e.title, dates: `${e.utc}/${e.utc}`,
      details: `Wedding celebrations of Sandeep Gupta & Divyanshi Jaiswal.\nDirections: ${MAP_LINK}`,
      location: VENUE
    });
    a.href = `https://calendar.google.com/calendar/render?${q}`;
  });
  const downloadIcs = () => {
    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sandeep-Divyanshi Wedding//EN', 'CALSCALE:GREGORIAN'];
    Object.entries(EVENTS).forEach(([k, e]) => {
      lines.push('BEGIN:VEVENT', `UID:${k}-2027@sandeep-divyanshi`, `DTSTAMP:${now}`, `DTSTART:${e.utc}`,
        `SUMMARY:${esc(e.title)}`, `LOCATION:${esc(VENUE)}`,
        `DESCRIPTION:${esc('Wedding celebrations of Sandeep Gupta & Divyanshi Jaiswal. Directions: ' + MAP_LINK)}`, 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'Sandeep-Divyanshi-Wedding.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('#saveDateBtn').addEventListener('click', downloadIcs);

  /* ---------------- Heart scratch card ---------------- */
  (function scratchCard() {
    const wrap = $('#heartWrap'), cv = $('#scratch');
    if (!wrap || !cv) return;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const HEART = new Path2D('M50 88 C22 66 2 50 2 28 C2 12 14 2 28 2 C38 2 46 8 50 16 C54 8 62 2 72 2 C86 2 98 12 98 28 C98 50 78 66 50 88Z');
    let W = 0, H = 0, total = 0, done = false, drawing = false, last = null, moves = 0;

    const opaque = () => {
      const d = ctx.getImageData(0, 0, W, H).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 32) if (d[i] > 128) n++;
      return n;
    };
    function paint() {
      const r = wrap.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.width = Math.round(r.width * dpr); H = cv.height = Math.round(r.height * dpr);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.scale(W / 100, H / 92);
      ctx.clip(HEART);
      const g = ctx.createLinearGradient(0, 0, 100, 92);
      g.addColorStop(0, '#f6dc95'); g.addColorStop(.35, '#d4a345'); g.addColorStop(.6, '#f3d27e'); g.addColorStop(1, '#b07e2a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 100, 92);
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.55})`;
        ctx.beginPath(); ctx.arc(Math.random() * 100, Math.random() * 92, Math.random() * 0.5 + 0.15, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 0.4;
      for (let x = -92; x < 100; x += 4) { ctx.beginPath(); ctx.moveTo(x, 92); ctx.lineTo(x + 92, 0); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = 'rgba(92,26,60,.9)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(W * 0.1)}px 'Great Vibes', cursive`;
      ctx.fillText('Scratch here', W / 2, H * 0.4);
      ctx.font = `${Math.round(W * 0.09)}px serif`;
      ctx.fillText('♥', W / 2, H * 0.56);
      total = opaque();
    }
    const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    const scratch = (p) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = W * 0.13;
      ctx.beginPath(); ctx.moveTo((last || p).x, (last || p).y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p;
    };
    const check = () => {
      if (done || !total) return;
      if (1 - opaque() / total > 0.5) {
        done = true;
        wrap.classList.add('revealed');
        Petals.burst(90);
        $('#saveDateBtn').hidden = false;
      }
    };
    cv.addEventListener('pointerdown', (e) => { if (done) return; drawing = true; last = null; cv.setPointerCapture(e.pointerId); scratch(pos(e)); });
    cv.addEventListener('pointermove', (e) => { if (!drawing) return; scratch(pos(e)); if (++moves % 10 === 0) check(); });
    ['pointerup', 'pointercancel'].forEach((t) => cv.addEventListener(t, () => { drawing = false; last = null; check(); }));
    let lastW = 0;
    const init = () => { const w = wrap.getBoundingClientRect().width; if (!done && w && w !== lastW) { lastW = w; paint(); } };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(init);
    addEventListener('resize', init);
  })();

  /* ---------------- Reveal on scroll ---------------- */
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.15 });
  $$('.reveal').forEach((n) => io.observe(n));

})();
