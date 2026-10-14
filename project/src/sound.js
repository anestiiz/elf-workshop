// Маленький синтезатор на WebAudio — без файлов.
let ac = null;
let master = null;
let muted = false;

export const setMuted = (m) => { muted = m; music.sync(); };
export const isMuted = () => muted;

// общий выход: громкость + ограничитель, чтобы громкие тревожные звуки не хрипели
function out() {
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  if (!master) {
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 8;
    comp.attack.value = 0.003; comp.release.value = 0.15;
    master = ac.createGain(); master.gain.value = 1;
    master.connect(comp).connect(ac.destination);
  }
  return master;
}

function tone(freq, { dur = 0.12, type = 'sine', vol = 0.12, when = 0, slide = 0 } = {}) {
  if (muted) return;
  try {
    const dest = out();
    const t = ac.currentTime + when;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch { /* звук необязателен */ }
}

export const sfx = {
  pick:   () => tone(620, { dur: 0.08, type: 'triangle', slide: 200 }),
  land:   (combo = 0) => tone(780 + Math.min(combo, 12) * 40, { dur: 0.1, type: 'triangle', vol: 0.1 }),
  bench:  () => tone(420, { dur: 0.1, type: 'sine', vol: 0.1 }),
  toy:    () => [523, 659, 784, 1046].forEach((f, i) => tone(f, { dur: 0.16, type: 'triangle', vol: 0.11, when: i * 0.07 })),
  fail:   () => { tone(220, { dur: 0.35, type: 'sawtooth', vol: 0.22, slide: -120 }); },
  bad:    () => { tone(140, { dur: 0.25, type: 'square', vol: 0.2, slide: -60 }); tone(70, { dur: 0.3, type: 'sawtooth', vol: 0.16, when: 0.04 }); },
  nope:   () => tone(180, { dur: 0.14, type: 'square', vol: 0.14 }),
  trash:  () => tone(300, { dur: 0.1, type: 'sine', vol: 0.07, slide: -150 }),
  win:    () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, { dur: 0.22, type: 'triangle', vol: 0.11, when: i * 0.1 })),
  lose:   () => [392, 330, 262, 196].forEach((f, i) => tone(f, { dur: 0.42, type: 'sawtooth', vol: 0.2, when: i * 0.2, slide: -10 })),
  tick:   () => tone(1200, { dur: 0.05, type: 'square', vol: 0.1 }),
};

export const buzz = (ms = 12) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

// тревога как в Overcooked
export const alarm = {
  heart: (k = 0.5) => {
    const v = 0.3 + 0.45 * k;   // громкий стук: слышно поверх музыки
    // «тук-тук»: низкий удар + обертон, чтобы было слышно и в динамике телефона
    tone(90, { dur: 0.14, type: 'triangle', vol: v, slide: -30 });
    tone(180, { dur: 0.08, type: 'sine', vol: v * 0.5, slide: -60 });
    tone(80, { dur: 0.18, type: 'triangle', vol: v * 0.8, when: 0.18, slide: -25 });
    tone(160, { dur: 0.08, type: 'sine', vol: v * 0.4, when: 0.18, slide: -50 });
  },
  expire: () => {
    // сирена «ва-ва-ваа» + низкий удар
    tone(440, { dur: 0.22, type: 'sawtooth', vol: 0.28 });
    tone(330, { dur: 0.22, type: 'sawtooth', vol: 0.28, when: 0.24 });
    tone(220, { dur: 0.6, type: 'sawtooth', vol: 0.3, when: 0.48, slide: -90 });
    tone(60, { dur: 0.5, type: 'sine', vol: 0.5, when: 0.48 });
  },
  speedup: () => [440, 554, 659].forEach((f, i) => tone(f, { dur: 0.14, type: 'square', vol: 0.14, when: i * 0.08 })),
  junk: () => { tone(120, { dur: 0.25, type: 'sawtooth', vol: 0.24, slide: -40 }); tone(90, { dur: 0.25, type: 'square', vol: 0.18, when: 0.05 }); },
  assembled: () => [660, 990].forEach((f, i) => tone(f, { dur: 0.12, type: 'triangle', vol: 0.1, when: i * 0.08 })),
  whoosh: () => tone(500, { dur: 0.18, type: 'sine', vol: 0.06, slide: -350 }),
  freeze: () => [1568, 2093, 2637, 3136, 2637].forEach((f, i) => tone(f, { dur: 0.25, type: 'sine', vol: 0.09, when: i * 0.06 })),
  magnet: () => { tone(300, { dur: 0.35, type: 'triangle', vol: 0.14, slide: 900 }); tone(600, { dur: 0.3, type: 'sine', vol: 0.06, when: 0.05, slide: 1200 }); },
  reverse: () => { tone(500, { dur: 0.6, type: 'sawtooth', vol: 0.16, slide: -380 }); tone(250, { dur: 0.6, type: 'square', vol: 0.1, when: 0.1, slide: -150 }); },
  shuffle: () => [523, 392, 659, 330, 784].forEach((f, i) => tone(f, { dur: 0.1, type: 'square', vol: 0.12, when: i * 0.07 })),
  urgent: () => { [1568, 1175, 1568, 1175].forEach((f, i) => tone(f, { dur: 0.22, type: 'sine', vol: 0.14, when: i * 0.16 })); },
  reward: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, { dur: 0.14, type: 'triangle', vol: 0.12, when: i * 0.05 })),
};

// «бим-бом» — новый заказ, как звонок на раздаче
export const bimbom = () => {
  tone(1568, { dur: 0.5, type: 'sine', vol: 0.12 });
  tone(3136, { dur: 0.25, type: 'sine', vol: 0.025 });
  tone(1175, { dur: 0.7, type: 'sine', vol: 0.12, when: 0.2 });
  tone(2350, { dur: 0.3, type: 'sine', vol: 0.02, when: 0.2 });
};

// фоновая музыка: файл music_bg.mp3 из assets, играет по кругу.
// Сначала пробуем обычный <audio>; если браузер/страница его не пускает —
// декодируем mp3 в WebAudio и крутим буфер (так же, как звучат эффекты).
// start() нужно вызывать прямо в обработчике нажатия, иначе iPhone не даст играть.
const MUSIC_VOL = 0.42;
function b64ToBuf(dataUrl) {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8.buffer;
}
export const music = {
  src: null, wanted: false, duck: 1,
  mode: null,            // 'el' | 'wa'
  el: null,
  buf: null, node: null, gain: null, startedAt: 0, offset: 0, decoding: false,
  init(src, alt) {
    // основной файл — m4a (AAC); если браузер его не умеет — запасной mp3
    try {
      const probe = document.createElement('audio');
      if (alt && src && /\.m4a($|\?)/.test(src) && !probe.canPlayType('audio/mp4; codecs="mp4a.40.2"')) { src = alt; alt = null; }
    } catch {}
    this.src = src; this.alt = alt;
    // файл начинает качаться сразу, ещё на загрузочном экране — к нажатию «Начать» он уже готов
    try {
      if (src && !src.startsWith('data:')) {
        const el = new Audio(); el.loop = true; el.preload = 'auto'; el.src = src; this.el = el;
        el.onerror = () => { if (el === this.el) this.onElError(); };
        el.load();
      }
    } catch {}
    // страховка: если первый запуск не прошёл (телефон не дал, файл ещё грузился) —
    // пробуем снова при любом следующем касании экрана
    if (typeof window !== 'undefined') {
      const retry = () => this.ensure();
      window.addEventListener('pointerdown', retry, true);
      window.addEventListener('touchend', retry, true);
      window.addEventListener('click', retry, true);
    }
  },
  ensure() {
    if (!this.wanted || muted || this.hold || !this.src) return;
    out();
    if (this.mode === 'el' && this.el && this.el.paused) {
      const pr = this.el.play(); if (pr && pr.catch) pr.catch(() => this.toWebAudio());
    } else if (this.mode === 'wa' && !this.node) this.sync();
  },
  start() {
    if (!this.src) return;
    this.wanted = true;
    out(); // будим AudioContext внутри жеста
    if (!this.mode) {
      this.mode = 'el';
      const el = this.el || new Audio();
      el.loop = true; el.preload = 'auto';
      if (!this.el) el.src = this.src;
      this.el = el;
      el.volume = muted ? 0 : MUSIC_VOL * this.duck;
      const pr = el.play();
      if (pr && pr.catch) pr.catch(() => this.toWebAudio());
      el.onerror = () => { if (el === this.el) this.onElError(); };
      if (muted) el.pause();
      return;
    }
    this.sync();
  },
  toWebAudio() {
    if (this.mode === 'wa') return;
    this.mode = 'wa';
    if (this.el) { try { this.el.pause(); } catch {} this.el = null; }
    if (this.decoding) return;
    this.decoding = true;
    try {
      const ctx = ac || (out(), ac);
      const data = this.src.startsWith('data:') ? Promise.resolve(b64ToBuf(this.src)) : fetch(this.src).then((r) => r.arrayBuffer());
      data.then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .then((buf) => { this.buf = buf; this.decoding = false; this.sync(); })
        .catch(() => { this.decoding = false; this.useAlt(); });
    } catch { this.decoding = false; }
  },
  // файл не загрузился или формат не поддерживается: сначала запасной файл, потом WebAudio
  onElError() { if (this.alt && this.src !== this.alt) this.useAlt(); else this.toWebAudio(); },
  // основной файл не играет — переключаемся на запасной формат
  useAlt() {
    if (!this.alt || this.src === this.alt) return;
    this.src = this.alt; this.alt = null;
    this.mode = null; this.buf = null; this.node = null;
    try { if (this.el) this.el.pause(); } catch {}
    this.el = null;
    if (this.wanted) this.start();
  },
  stop() { this.wanted = false; this.sync(); },
  setDuck(d) {
    if (Math.abs(d - this.duck) < 0.02) return;
    this.duck = d; this.applyVol();
  },
  applyVol() {
    const v = MUSIC_VOL * this.duck;
    if (this.mode === 'el' && this.el) this.el.volume = v;
    if (this.mode === 'wa' && this.gain) this.gain.gain.setTargetAtTime(v, ac.currentTime, 0.15);
  },
  sync() {
    const on = this.wanted && !muted;
    if (this.mode === 'el' && this.el) {
      this.applyVol();
      if (on) { const pr = this.el.play(); if (pr && pr.catch) pr.catch(() => this.toWebAudio()); }
      else this.el.pause();
    }
    if (this.mode === 'wa' && this.buf) {
      if (on && !this.node) {
        out();
        this.gain = this.gain || ac.createGain();
        this.gain.gain.value = MUSIC_VOL * this.duck;
        this.gain.connect(master);
        const n = ac.createBufferSource();
        n.buffer = this.buf; n.loop = true;   // буфер зацикливается без паузы
        n.connect(this.gain);
        n.start(0, this.offset % this.buf.duration);
        this.startedAt = ac.currentTime - this.offset;
        this.node = n;
      } else if (!on && this.node) {
        this.offset = (ac.currentTime - this.startedAt) % this.buf.duration;
        try { this.node.stop(); } catch {}
        this.node.disconnect(); this.node = null;
      }
    }
  },
};
