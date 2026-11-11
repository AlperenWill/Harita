import type { Category, Period } from '../data/types';

/**
 * Dönem atmosferleri tamamen Web Audio ile sentezlenir: ses dosyası indirilmez,
 * ilk yükleme bütçesine sıfır bayt ekler. Tarayıcı politikası gereği yalnızca bir kullanıcı
 * jestinden (nokta tıklaması) sonra başlar.
 */
type Preset = 'steppe' | 'cicada' | 'choir' | 'ney' | 'hearth' | 'city';

export function presetFor(period: Period, category: Category): Preset {
  if (category === 'somut-olmayan') return 'hearth';
  switch (period) {
    case 'antik': return 'cicada';
    case 'bizans': return 'choir';
    case 'selcuklu':
    case 'osmanli': return 'ney';
    case 'cumhuriyet': return 'city';
    case 'yasayan': return 'hearth';
    default: return 'steppe';
  }
}

class Ambient {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private timers: number[] = [];
  private noiseBuf: AudioBuffer | null = null;
  private gen = 0;

  private ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        // kahverengi gürültü: rüzgâr için yumuşak
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.5;
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private noise(filterType: BiquadFilterType, freq: number, q: number, gain: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(this.master!);
    src.start();
    this.nodes.push(src, f, g);
    return { src, f, g };
  }

  private tone(type: OscillatorType, freq: number, gain: number, detune = 0) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1200;
    const g = ctx.createGain();
    g.gain.value = gain;
    o.connect(lp).connect(g).connect(this.master!);
    o.start();
    this.nodes.push(o, lp, g);
    return { o, g, lp };
  }

  private lfo(target: AudioParam, rate: number, depth: number) {
    const ctx = this.ctx!;
    const l = ctx.createOscillator();
    l.frequency.value = rate;
    const g = ctx.createGain();
    g.gain.value = depth;
    l.connect(g).connect(target);
    l.start();
    this.nodes.push(l, g);
  }

  play(preset: Preset, water = false) {
    const ctx = this.ensure();
    this.gen++;
    this.stopNodes();
    // Her atmosferin tabanı: hafif rüzgâr
    const wind = this.noise('lowpass', 420, 0.7, 0.35);
    this.lfo(wind.f.frequency, 0.07, 180);

    if (water) {
      const w = this.noise('bandpass', 900, 0.6, 0.25);
      this.lfo(w.f.frequency, 0.31, 300);
    }
    if (preset === 'cicada') {
      const c = this.noise('bandpass', 5200, 8, 0.0);
      const am = ctx.createOscillator();
      am.frequency.value = 38;
      const amg = ctx.createGain();
      amg.gain.value = 0.05;
      am.connect(amg).connect(c.g.gain);
      am.start();
      this.nodes.push(am, amg);
    } else if (preset === 'choir') {
      [146.83, 220, 293.66].forEach((f, i) => {
        const t = this.tone('sawtooth', f, 0.018, (i - 1) * 7);
        t.lp.frequency.value = 700;
        this.lfo(t.g.gain, 0.05 + i * 0.02, 0.01);
      });
    } else if (preset === 'steppe') {
      this.tone('sine', 73.4, 0.06);
      this.tone('sine', 110, 0.03);
    } else if (preset === 'city') {
      this.tone('sine', 98, 0.025);
      this.schedule(() => this.bell(660 + Math.random() * 220), 5200);
    } else if (preset === 'hearth') {
      this.noise('highpass', 2500, 0.5, 0.02);
      this.schedule(() => this.drum(), 1400);
    } else if (preset === 'ney') {
      // Hicaz benzeri bir dizi: Re, Mi♭(yaklaşık), Fa#, Sol, La
      const scale = [293.66, 311.13, 369.99, 392, 440, 392, 369.99];
      const breath = this.noise('bandpass', 1800, 1.5, 0.015);
      void breath;
      const n = this.tone('sine', scale[0], 0.0);
      const h2 = this.tone('triangle', scale[0] * 2, 0.0);
      this.lfo(n.o.frequency, 5, 2.5);
      let step = 0;
      this.schedule(() => {
        const t = ctx.currentTime;
        const f = scale[step++ % scale.length];
        n.o.frequency.setTargetAtTime(f, t, 0.25);
        h2.o.frequency.setTargetAtTime(f * 2, t, 0.25);
        n.g.gain.setTargetAtTime(0.05, t, 0.6);
        h2.g.gain.setTargetAtTime(0.008, t, 0.6);
        n.g.gain.setTargetAtTime(0.0, t + 2.4, 0.8);
        h2.g.gain.setTargetAtTime(0.0, t + 2.4, 0.8);
      }, 3600);
    }
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setTargetAtTime(0.5, ctx.currentTime, 1.2);
  }

  private bell(freq: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.03, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3);
    o.connect(g).connect(this.master!);
    o.start();
    o.stop(ctx.currentTime + 3.1);
  }

  private drum() {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(140, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.25);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.09, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.connect(g).connect(this.master!);
    o.start();
    o.stop(ctx.currentTime + 0.45);
  }

  private schedule(fn: () => void, ms: number) {
    fn();
    this.timers.push(window.setInterval(fn, ms));
  }

  private stopNodes() {
    this.timers.forEach(clearInterval);
    this.timers = [];
    for (const n of this.nodes) {
      try {
        (n as OscillatorNode).stop?.();
      } catch {
        /* zaten durmuş */
      }
      n.disconnect();
    }
    this.nodes = [];
  }

  stop() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(0, t, 0.4);
    const g = ++this.gen;
    window.setTimeout(() => g === this.gen && this.stopNodes(), 1500);
  }
}

export const ambient = new Ambient();
