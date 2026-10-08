/* 饮料人格研究所 — WebAudio 合成音效 + 震动 */
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

  /* 滤波噪声(气泡/水声/开瓶) */
  function noise(dur, from, to, vol, delay, q) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = q || 1.2;
    f.frequency.setValueAtTime(from, t0);
    f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
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
    setSound(v) { state.sound = v; store.set('dp_sound', v); if (v) ensure(); },
    setVibrate(v) { state.vibrate = v; store.set('dp_vibrate', v); if (v) vib(20); },
    unlock() { ensure(); },

    /* —— 具体音效 —— */
    tap()      { tone(300, 0.05, 'triangle', 0.12); vib(8); },
    select()   { tone(560, 0.10, 'sine', 0.30, 920); noise(0.06, 1400, 2400, 0.10, 0, 3); vib(18); },
    page()     { noise(0.16, 500, 1600, 0.14); tone(340, 0.10, 'sine', 0.08, 520); vib(10); },
    back()     { noise(0.14, 1400, 420, 0.12); tone(420, 0.10, 'sine', 0.08, 300); vib(10); },
    pour() {   /* 开始测试:注水声 */
      noise(0.5, 300, 900, 0.20, 0, 0.8);
      tone(180, 0.5, 'sine', 0.06, 240);
      vib([20, 40, 20]);
    },
    bubble(i) {  /* 小气泡音(摇杯页随机) */
      tone(700 + Math.random() * 500, 0.06, 'sine', 0.10, 1200 + Math.random() * 600);
      vib(6);
    },
    shake() {    /* 摇杯 */
      noise(0.10, 2000, 700, 0.22, 0, 0.9);
      noise(0.10, 1800, 600, 0.22, 0.22, 0.9);
      noise(0.12, 2200, 800, 0.24, 0.46, 0.9);
      vib([40, 90, 40, 90, 50]);
    },
    reveal() {   /* 结果揭晓:开瓶 pop + 上行琶音 */
      noise(0.09, 2500, 900, 0.34, 0, 1.6);
      tone(523, 0.16, 'sine', 0.22, null, 0.10);
      tone(659, 0.16, 'sine', 0.22, null, 0.20);
      tone(784, 0.18, 'sine', 0.24, null, 0.30);
      tone(1047, 0.34, 'sine', 0.26, null, 0.40);
      noise(0.5, 3200, 2200, 0.05, 0.42, 2);
      vib([30, 60, 30, 60, 120]);
    },
    save() { tone(660, 0.10, 'sine', 0.2); tone(880, 0.16, 'sine', 0.2, null, 0.09); vib(15); },
    toggle() { tone(480, 0.06, 'square', 0.08); tone(720, 0.08, 'square', 0.08, null, 0.06); vib(12); }
  };
})();
