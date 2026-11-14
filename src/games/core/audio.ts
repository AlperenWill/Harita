import type { AmbientPreset } from './types';

/**
 * Ortak ses motoru: ambiyans Web Audio ile sentezlenir (ses dosyası yok, 0 bayt).
 * Her oyun bir ön ayar seçer ve bölgeye göre karışımı değiştirir; oyun mantığı burada değildir.
 * Dini okuyuşlar (ezan) sentezlenmez: lisanslı bir kayıt verilirse playRecording ile çalınır.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private layers: Record<string, GainNode> = {};
  private rec: HTMLAudioElement | null = null;
  private muted = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  start(preset: AmbientPreset) {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = (this.ctx = new AC());
    const master = (this.master = ctx.createGain()); master.gain.value = 0; master.connect(ctx.destination);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const layer = (name: string) => { const g = ctx.createGain(); g.gain.value = 0; g.connect(master); this.layers[name] = g; return g; };
    const noise = (out: GainNode, type: BiquadFilterType, f: number, q: number, lfoHz = 0, lfoAmt = 0) => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q; s.connect(flt).connect(out); s.start();
      if (lfoHz) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = lfoHz; g.gain.value = lfoAmt; o.connect(g).connect(flt.frequency); o.start(); }
    };
    noise(layer('wind'), 'lowpass', 380, 0.6, 0.07, 150);
    if (preset === 'courtyard-water') noise(layer('water'), 'bandpass', 1400, 0.8, 0.4, 500);
    if (preset === 'cistern-drips') { const g = layer('water'); this.timer = setInterval(() => this.drip(g), 900); }
    // kubbe yankısını anımsatan, çok alçak ve yavaş açılıp kapanan tını
    const pad = layer('pad');
    for (const [f, dt] of [[110, 0], [164.8, 4], [220, -3]] as const) {
      const o = ctx.createOscillator(); o.frequency.value = f; o.detune.value = dt;
      const og = ctx.createGain(); og.gain.value = 0.05; const sw = ctx.createOscillator(), swg = ctx.createGain();
      sw.frequency.value = 0.05 + f / 9000; swg.gain.value = 0.03; sw.connect(swg).connect(og.gain); sw.start(); o.connect(og).connect(pad); o.start();
    }
    master.gain.setTargetAtTime(this.muted ? 0 : 0.6, ctx.currentTime, 1.5);
  }
  private drip(out: GainNode) {
    if (!this.ctx || Math.random() < 0.4) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), t = this.ctx.currentTime, f = 900 + Math.random() * 900;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.12);
    g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.connect(g).connect(out); o.start(); o.stop(t + 0.3);
  }
  /** Katman düzeyleri 0–1 (ör. { wind: .3, water: .2, pad: 1 }) */
  mix(levels: Record<string, number>) {
    if (!this.ctx) return;
    for (const [k, v] of Object.entries(levels)) this.layers[k]?.gain.setTargetAtTime(v, this.ctx.currentTime, 0.8);
  }
  /** Kısa, yumuşak bir başarı tınısı */
  chime() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = this.ctx!.createOscillator(), g = this.ctx!.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.12); g.gain.linearRampToValueAtTime(0.12, t + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 1.6);
      o.connect(g).connect(this.master!); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 1.7);
    });
  }
  setMuted(m: boolean) { this.muted = m; if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.6, this.ctx.currentTime, 0.3); if (this.rec) this.rec.muted = m; }
  async recordingAvailable(url: string) { try { const r = await fetch(url, { method: 'HEAD' }); return r.ok && (r.headers.get('content-type') ?? '').startsWith('audio'); } catch { return false; } }
  playRecording(url: string) { this.rec?.pause(); this.rec = new Audio(url); this.rec.muted = this.muted; void this.rec.play(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; this.rec?.pause(); void this.ctx?.close(); this.ctx = null; this.master = null; this.layers = {}; }
}
export const sound = new SoundEngine();
