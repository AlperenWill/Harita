/**
 * Topkapı — ses (Web Audio; dosya yok, hepsi sentezlenir).
 *  - Fısıltı: nesneye yaklaşınca kısa, yüksek frekanslı nefes sesi (sözcük içermez; metin ekranda görünür).
 *  - Divan: vezirlerin tartışması = beş konumlu (HRTF) "konuşma benzeri" uğultu kaynağı; formant süzgeçli gürültü heceleri.
 *    Gerçek sözcük ya da tarihî bir konuşma canlandırılmaz. Dinleme kipinde bu kaynaklar öne çıkar.
 *  - Koridor: mum çıtırtısı; Valide dairesi: sakin oda; hamam: akan su + damla + yankı; hazine: soğuk, tiz parıltı.
 *  - Anlatım: tarayıcının tr-TR konuşma sentezi (cihazda Türkçe ses yoksa yalnızca yazı).
 */
import type { V3 } from './palace';
export type Mix = 'dis' | 'divan' | 'koridor' | 'valide' | 'hamam' | 'hazine';
const LEVEL: Record<Mix, Record<string, number>> = {
  dis: { wind: 0.5, birds: 1 }, divan: { council: 0.5, room: 0.3 }, koridor: { room: 0.25, crackle: 1 }, valide: { room: 0.35 }, hamam: { water: 0.8, drips: 1, room: 0.2 }, hazine: { shimmer: 0.6, room: 0.15 },
};
const VIZIERS: V3[] = [[4, 1, 4.8], [7, 1, 4.8], [10, 1, 4.8], [5.5, 1, -4.8], [9, 1, -4.8]];
class TopkapiAudio {
  private ctx: AudioContext | null = null; private master: GainNode | null = null; private verb: ConvolverNode | null = null; private g: Record<string, GainNode> = {};
  private noise: AudioBuffer | null = null; private timers: ReturnType<typeof setInterval>[] = []; private pan: PannerNode[] = []; private mix: Mix = 'dis'; private listen = false; muted = false;
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC()); this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(ctx.destination);
    const ir = ctx.createBuffer(2, ctx.sampleRate * 2.2, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); }
    this.verb = ctx.createConvolver(); this.verb.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0.4; this.verb.connect(wet).connect(this.master);
    const n = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, n, ctx.sampleRate); const nd = this.noise.getChannelData(0); for (let i = 0; i < n; i++) nd[i] = Math.random() * 2 - 1;
    const layer = (k: string) => { const x = ctx.createGain(); x.gain.value = 0; x.connect(this.master!); x.connect(this.verb!); this.g[k] = x; return x; };
    const loop = (out: GainNode, type: BiquadFilterType, f: number, q: number, gain: number) => { const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const gg = ctx.createGain(); gg.gain.value = gain; s.connect(fl).connect(gg).connect(out); s.start(); };
    loop(layer('wind'), 'lowpass', 400, 0.6, 0.12); loop(layer('room'), 'lowpass', 160, 0.5, 0.2); loop(layer('water'), 'bandpass', 1700, 0.6, 0.12);
    for (const k of ['birds', 'crackle', 'drips', 'shimmer', 'council']) layer(k);
    for (const p of VIZIERS) { const pn = ctx.createPanner(); pn.panningModel = 'HRTF'; pn.distanceModel = 'inverse'; pn.refDistance = 2.5; pn.positionX.value = p[0]; pn.positionY.value = p[1]; pn.positionZ.value = p[2]; pn.connect(this.g.council); this.pan.push(pn); }
    this.timers.push(setInterval(() => { const m = this.mix; if (m === 'divan') { const i = Math.floor(Math.random() * this.pan.length); this.phrase(this.pan[i], 95 + i * 22); } if (m === 'dis' && Math.random() < 0.35) this.chirp(); if (m === 'koridor' && Math.random() < 0.6) this.burst(this.g.crackle, 3500, 2, 0.12, 0.03); if (m === 'hamam' && Math.random() < 0.5) this.tone(this.g.drips, 1000 + Math.random() * 900, 0.3, 0.2, true); if (m === 'hazine' && Math.random() < 0.4) this.tone(this.g.shimmer, 2600 + Math.random() * 2400, 0.05, 1.2, false); }, 520));
    this.setMix(this.mix);
  }
  private burst(out: AudioNode, f: number, q: number, amp: number, dur: number) { const ctx = this.ctx!; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = this.noise; const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(fl).connect(g).connect(out); s.start(t, Math.random()); s.stop(t + dur + 0.02); }
  private tone(out: AudioNode, f: number, amp: number, dur: number, drop: boolean) { const ctx = this.ctx!; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f, t); if (drop) o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.1); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02); }
  private chirp() { const f = 2200 + Math.random() * 1500; for (let i = 0; i < 3; i++) setTimeout(() => this.ctx && this.tone(this.g.birds, f * (1 + i * 0.08), 0.03, 0.09, false), i * 110); }
  /** Konuşma benzeri uğultu: testere dalga (ses teli) + iki formant süzgeci; 3–6 hece */
  private phrase(out: AudioNode, pitch: number) {
    const ctx = this.ctx!; let t = ctx.currentTime; const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) { const d = 0.11 + Math.random() * 0.12, o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(pitch * (0.9 + Math.random() * 0.25), t);
      const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = 350 + Math.random() * 450; f2.frequency.value = 1000 + Math.random() * 1300; f1.Q.value = f2.Q.value = 6;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.03); g.gain.linearRampToValueAtTime(0, t + d); o.connect(f1).connect(g); o.connect(f2).connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.02); t += d + 0.03; }
  }
  whisper() { if (this.ctx && this.master) { this.burst(this.master, 3200, 0.7, 0.07, 0.7); this.burst(this.verb!, 4200, 0.9, 0.05, 0.5); } }
  chime() { if (!this.ctx || !this.master) return; [523.25, 783.99].forEach((f, i) => setTimeout(() => this.ctx && this.tone(this.master!, f, 0.07, 1.6, false), i * 140)); }
  setMix(m: Mix) { this.mix = m; if (!this.ctx) return; const t = this.ctx.currentTime; for (const [k, v] of Object.entries(this.g)) v.gain.setTargetAtTime((LEVEL[m][k] ?? 0) * (k === 'council' && this.listen ? 2.4 : 1), t, 0.5); }
  /** Dinleme kipi: Divan uğultusu öne çıkar */
  setListening(on: boolean) { this.listen = on; this.setMix(this.mix); }
  listener(pos: V3, fwd: V3) { const ctx = this.ctx; if (!ctx) return; const L = ctx.listener, t = ctx.currentTime; if (!L.positionX) return; L.positionX.setValueAtTime(pos[0], t); L.positionY.setValueAtTime(pos[1], t); L.positionZ.setValueAtTime(pos[2], t); L.forwardX.setValueAtTime(fwd[0], t); L.forwardY.setValueAtTime(fwd[1], t); L.forwardZ.setValueAtTime(fwd[2], t); }
  setMuted(m: boolean) { this.muted = m; if (m) this.hush(); if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.2); }
  speak(text: string) { if (this.muted || !('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'tr-TR'; u.rate = 0.95; const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('tr')); if (v) u.voice = v; speechSynthesis.speak(u); }
  hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  dispose() { this.timers.forEach(clearInterval); this.timers = []; this.hush(); void this.ctx?.close(); this.ctx = null; this.master = null; this.g = {}; this.pan = []; }
}
export const topkapiAudio = new TopkapiAudio();
