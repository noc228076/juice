/* 饮料人格研究所 — 全局统一 WebAudio 合成音效 + 震动引擎 */
'use strict';

const SFX = (function () {
  let ctx = null;
  let master = null;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) {} }
  };
  const state = {
    sound: store.get('dp_sound', true),
    vibrate: store.get('dp_vibrate', true)
  };

  function ensure() {
    if (!state.sound) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* 基础振荡器音 */
  function tone(freq, dur, type, vol, slideTo, delay) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol || 0.3, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  /* 滤波噪声(气泡/水声/开瓶/洗牌) */
  function noise(dur, from, to, vol, delay, q, filterType) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.4);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = filterType || 'bandpass';
    f.Q.value = q || 1.2;
    f.frequency.setValueAtTime(from, t0);
    if (to && to !== from) f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol || 0.25, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  function vib(p) {
    if (!state.vibrate) return;
    try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {}
  }

  return {
    get sound() { return state.sound; },
    get vibrate() { return state.vibrate; },
    isMuted() { return !state.sound; },
    setSound(v) { state.sound = v; store.set('dp_sound', v); if (v) ensure(); },
    setVibrate(v) { state.vibrate = v; store.set('dp_vibrate', v); if (v) vib(20); },
    unlock() { ensure(); },

    /* —— 基础操作音 —— */
    tap()      { tone(300, 0.05, 'triangle', 0.12); vib(8); },
    select()   { tone(560, 0.10, 'sine', 0.26, 920); noise(0.06, 1400, 2400, 0.10, 0, 3); vib(16); },
    advance()  { tone(620, 0.08, 'triangle', 0.15, 880); },
    page()     { noise(0.16, 500, 1600, 0.14); tone(340, 0.10, 'sine', 0.08, 520); vib(10); },
    back()     { noise(0.14, 1400, 420, 0.12); tone(420, 0.10, 'sine', 0.08, 300); vib(10); },

    /* —— 饮料特调音效 —— */
    pour() {
      noise(0.5, 300, 900, 0.20, 0, 0.8);
      tone(180, 0.5, 'sine', 0.06, 240);
      vib([20, 40, 20]);
    },
    bubble() {
      tone(700 + Math.random() * 500, 0.06, 'sine', 0.10, 1200 + Math.random() * 600);
      vib(6);
    },
    shake() {
      noise(0.10, 2000, 700, 0.22, 0, 0.9);
      noise(0.10, 1800, 600, 0.22, 0.22, 0.9);
      noise(0.12, 2200, 800, 0.24, 0.46, 0.9);
      vib([40, 90, 40, 90, 50]);
    },
    cheers() {
      tone(523, 0.16, 'sine', 0.22, null, 0.05);
      tone(659, 0.16, 'sine', 0.22, null, 0.15);
      tone(784, 0.18, 'sine', 0.24, null, 0.25);
      tone(1047, 0.32, 'sine', 0.26, null, 0.35);
    },
    reveal() {
      noise(0.09, 2500, 900, 0.34, 0, 1.6);
      tone(523, 0.16, 'sine', 0.22, null, 0.10);
      tone(659, 0.16, 'sine', 0.22, null, 0.20);
      tone(784, 0.18, 'sine', 0.24, null, 0.30);
      tone(1047, 0.34, 'sine', 0.26, null, 0.40);
      noise(0.5, 3200, 2200, 0.05, 0.42, 2);
      vib([30, 60, 30, 60, 120]);
    },

    /* —— 工位风水大师：磬声音效 —— */
    bell(strong) {
      const c = ensure(); if (!c) return;
      const t = c.currentTime;
      const f0 = strong ? 1046 : 784;
      const o1 = c.createOscillator(), o2 = c.createOscillator();
      const g1 = c.createGain(), g2 = c.createGain();
      o1.type = 'sine'; o1.frequency.value = f0;
      o2.type = 'sine'; o2.frequency.value = f0 * 2.76;
      g1.gain.setValueAtTime(strong ? 0.18 : 0.12, t);
      g1.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      g2.gain.setValueAtTime(strong ? 0.07 : 0.04, t);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      o1.connect(g1); g1.connect(master);
      o2.connect(g2); g2.connect(master);
      o1.start(t); o1.stop(t + 1.3);
      o2.start(t); o2.stop(t + 0.9);
      vib(strong ? [30, 40, 20] : 15);
    },

    /* —— 赛博塔罗：物理洗牌与翻牌空灵音 —— */
    tarotShuffle() {
      noise(0.45, 1400, 600, 0.22, 0, 1.0, 'lowpass');
      vib([15, 30, 15, 30]);
    },
    tarotFlip() {
      tone(300, 0.16, 'triangle', 0.14, 680);
      vib(12);
    },
    tarotReveal() {
      [523, 659, 784].forEach((f, i) => tone(f, 0.45, 'sine', 0.14, null, i * 0.10));
    },
    tarotDone() {
      [523, 659, 784, 1046, 784].forEach((f, i) => tone(f, 0.55, 'sine', 0.15, null, i * 0.12));
    },

    /* —— 自我说明书：竞技小游戏音效 —— */
    go() { tone(880, 0.12, 'square', 0.20); vib(30); },
    foul() { tone(180, 0.25, 'sawtooth', 0.22); vib([60, 40, 60]); },
    stage() { tone(587, 0.08, 'triangle', 0.16); tone(880, 0.12, 'triangle', 0.20, null, 0.08); vib(15); },
    wrong() { tone(200, 0.16, 'sawtooth', 0.22); vib([60, 40]); },
    win() { tone(587, 0.12, 'triangle', 0.16); tone(880, 0.22, 'triangle', 0.20, null, 0.10); },
    tick() { tone(1200, 0.02, 'sine', 0.08); },

    save() { tone(660, 0.10, 'sine', 0.2); tone(880, 0.16, 'sine', 0.2, null, 0.09); vib(15); },
    toggle() {
      const next = !state.sound;
      this.setSound(next);
      if (next) tone(720, 0.08, 'square', 0.10);
      return next;
    },
    toggleMute() {
      return !this.toggle();
    }
  };
})();

window.SFX = SFX;
