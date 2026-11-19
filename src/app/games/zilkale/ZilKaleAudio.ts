/**
 * Zil Kale — ses (Web Audio; dosya yok, hepsi sentez).
 *  - Dere: sürekli akan su = pembe gürültü → bant geçiren (çağıltı) + alçak geçiren (uğultu) iki katman. Ses düzeyi oyuncunun dere orta
 *    çizgisine uzaklığıyla: g = 1 / (1 + d/7). Kaynak (HRTF panner) her an derenin oyuncuya en yakın noktasına taşınır.
 *  - Şelale: ayrı kaynak, şelale dibinde; mesafe modeli 'inverse' (yaklaştıkça gürleşir).
 *  - Rüzgâr: bant geçiren gürültü, kesim frekansı esintiyle oynar; kaynak oyuncunun RÜZGÂRIN GELDİĞİ yönüne (−ŵ·12 m) konur, yani rüzgâr
 *    sisle ve bitkilerle aynı yönden "esiyor" duyulur. Düzey = 0,05 + 0,2·hız.
 *  - İnek çanları: uzak yamaçlardan ara sıra; uyumsuz kısmi tonlu metal tını (1 : 2,76 : 5,4 : 8,9), rastgele 2–5 vuruş.
 *  - Tarih katmanı etkinleşince: eski plak cızırtısı (seyrek dürtüler + kısık tıslama) ve rüzgâr fısıltısı (formant süpürmeli bant gürültü).
 *  - Ayak sesi zemine göre: toprak (boğuk), taş (sert), tahta (tok).
 *  - Pil tasarrufu: çanlar ve fısıltı kapalı, dere tek katman.
 */
import type { Surface, V3 } from './valley';

class ZilAudio {
  private ctx: AudioContext | null = null; private master: GainNode | null = null; private noise: AudioBuffer | null = null;
  private creek: { pan: PannerNode; gain: GainNode } | null = null; private wind: { pan: PannerNode; gain: GainNode; f: BiquadFilterNode } | null = null; private falls: PannerNode | null = null;
  private bellT = 0; muted = false; saver = false;
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC()); this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.85; this.master.connect(ctx.destination);
    // pembe gürültü (Paul Kellet yaklaşımı): su ve rüzgâr için beyazdan daha doğal
    const n = ctx.sampleRate * 3; this.noise = ctx.createBuffer(1, n, ctx.sampleRate); const d = this.noise.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
    const loop = (f: BiquadFilterType, freq: number, q: number, out: AudioNode, g = 1) => { const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; s.loopStart = Math.random(); const fl = ctx.createBiquadFilter(); fl.type = f; fl.frequency.value = freq; fl.Q.value = q; const gn = ctx.createGain(); gn.gain.value = g; s.connect(fl).connect(gn).connect(out); s.start(0, Math.random() * 2); return fl; };
    const panner = (ref: number) => { const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = 1; return p; };
    { const pan = panner(6), gain = ctx.createGain(); gain.gain.value = 0; pan.connect(gain).connect(this.master); loop('bandpass', 1400, 0.6, pan, 0.9); loop('lowpass', 380, 0.7, pan, 1.2); this.creek = { pan, gain }; }
    { const pan = panner(4); pan.connect(this.master); loop('bandpass', 900, 0.4, pan, 1.6); loop('lowpass', 220, 0.6, pan, 1.4); this.falls = pan; }
    { const pan = panner(8), gain = ctx.createGain(); gain.gain.value = 0.05; pan.connect(gain).connect(this.master); const f = loop('bandpass', 500, 1.2, pan, 1.4); this.wind = { pan, gain, f }; }
  }
  private place(p: PannerNode, at: V3) { const t = this.ctx!.currentTime; p.positionX.setTargetAtTime(at[0], t, 0.1); p.positionY.setTargetAtTime(at[1], t, 0.1); p.positionZ.setTargetAtTime(at[2], t, 0.1); }
  /** Her ~0,1 sn: dinleyici, dere en yakın noktası, şelale, rüzgâr yönü/hızı, çan zamanlayıcı */
  update(o: { ear: V3; fwd: [number, number]; creekAt: V3; creekDist: number; falls: V3; wind: { dir: [number, number]; speed: number }; dt: number; hills: () => V3 }) {
    const ctx = this.ctx; if (!ctx) return; const t = ctx.currentTime, L = ctx.listener;
    if (L.positionX) { L.positionX.setValueAtTime(o.ear[0], t); L.positionY.setValueAtTime(o.ear[1], t); L.positionZ.setValueAtTime(o.ear[2], t); L.forwardX.setValueAtTime(o.fwd[0], t); L.forwardY.setValueAtTime(0, t); L.forwardZ.setValueAtTime(o.fwd[1], t); }
    if (this.creek) { this.place(this.creek.pan, o.creekAt); this.creek.gain.gain.setTargetAtTime(Math.min(1, 1 / (1 + o.creekDist / 7)) * 0.9, t, 0.3); }
    if (this.falls) this.place(this.falls, o.falls);
    if (this.wind) { this.place(this.wind.pan, [o.ear[0] - o.wind.dir[0] * 12, o.ear[1] + 3, o.ear[2] - o.wind.dir[1] * 12]); this.wind.gain.gain.setTargetAtTime(0.05 + 0.2 * o.wind.speed, t, 0.5); this.wind.f.frequency.setTargetAtTime(380 + 520 * o.wind.speed, t, 0.5); }
    this.bellT -= o.dt; if (this.bellT <= 0) { this.bellT = 9 + Math.random() * 16; if (!this.saver) this.bell(o.hills()); }
  }
  /** İnek çanı: uzak, kısa metal "tınk" dizisi */
  bell(at: V3) {
    const ctx = this.ctx; if (!ctx || !this.master || this.muted) return; const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 20; p.positionX.value = at[0]; p.positionY.value = at[1]; p.positionZ.value = at[2]; p.connect(this.master);
    const base = 520 + Math.random() * 160, hits = 2 + Math.floor(Math.random() * 4), t0 = ctx.currentTime;
    for (let h = 0; h < hits; h++) { const t = t0 + h * (0.35 + Math.random() * 0.4); [1, 2.76, 5.4, 8.9].forEach((m, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = base * m; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22 / (i + 1.5), t + 0.004); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.5 - i * 0.08); o.connect(g).connect(p); o.start(t); o.stop(t + 0.55); }); }
  }
  /** Tarih katmanı: plak cızırtısı + fısıltı (yaklaşık 2,5 sn) */
  history() {
    const ctx = this.ctx; if (!ctx || !this.master || !this.noise || this.muted) return; const t = ctx.currentTime, out = ctx.createGain(); out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(0.5, t + 0.3); out.gain.setValueAtTime(0.5, t + 1.8); out.gain.linearRampToValueAtTime(0, t + 2.6); out.connect(this.master);
    const len = Math.floor(ctx.sampleRate * 2.6), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() < 0.0016 ? (Math.random() * 2 - 1) * 0.9 : 0) + (Math.random() * 2 - 1) * 0.02;
    const s = ctx.createBufferSource(); s.buffer = buf; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900; s.connect(hp).connect(out); s.start(t);
    if (this.saver) return;
    const w = ctx.createBufferSource(); w.buffer = this.noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1900, t + 1.1); f.frequency.linearRampToValueAtTime(900, t + 2.4);
    const g = ctx.createGain(); g.gain.value = 1.6; w.connect(f).connect(g).connect(out); w.start(t, Math.random()); w.stop(t + 2.7);
  }
  step(s: Surface) {
    const ctx = this.ctx; if (!ctx || !this.noise || !this.master || this.muted) return; const t = ctx.currentTime, src = ctx.createBufferSource(); src.buffer = this.noise;
    const P = s === 'tas' ? { type: 'highpass' as BiquadFilterType, f: 1500, a: 0.35, d: 0.06 } : s === 'tahta' ? { type: 'bandpass' as BiquadFilterType, f: 450, a: 0.5, d: 0.1 } : { type: 'lowpass' as BiquadFilterType, f: 500, a: 0.45, d: 0.12 };
    const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = P.type; f.frequency.value = P.f; g.gain.setValueAtTime(P.a, t); g.gain.exponentialRampToValueAtTime(0.001, t + P.d); src.connect(f).connect(g).connect(this.master); src.start(t, Math.random() * 2); src.stop(t + P.d + 0.02);
  }
  setMuted(m: boolean) { this.muted = m; if (m) this.hush(); if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.2); }
  speak(text: string) { if (this.muted || !('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'tr-TR'; u.rate = 0.95; const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('tr')); if (v) u.voice = v; speechSynthesis.speak(u); }
  hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  dispose() { this.hush(); void this.ctx?.close(); this.ctx = null; this.master = null; this.creek = null; this.wind = null; this.falls = null; }
}
export const zilAudio = new ZilAudio();
