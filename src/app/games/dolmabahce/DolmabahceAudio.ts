/**
 * Dolmabahçe — ses (Web Audio; dosya yok). Lüks mekânın "sessizliği": neredeyse duyulmayan oda tonu + uzun yankı.
 *  - Ayak sesi zemine göre: mermerde sert ve parlak (yüksek geçiren kısa patlama, güçlü yankı gönderimi), halıda yumuşak ve boğuk
 *    (alçak geçiren, yankısız), parkede orta (bant geçiren tok vuruş). Yankının uzunluğu odaya göre: Muayede ~3,5 sn, oda ~1 sn.
 *  - Kristal tınısı: kristal bir nesneye yaklaşınca, nesnenin 3B konumundan (HRTF) uyumsuz kısmi tonlu kısa bir cam tınısı.
 *  - Anlatım: tarayıcının tr-TR konuşma sentezi (isteğe bağlı).
 */
import type { Surface, V3, Zone } from './palace';

const VERB: Record<Zone, number> = { medhal: 2.2, muayede: 3.6, avize: 3.6, koridor: 1.2, merdiven: 2.8, sufera: 1.6, ataturk: 0.8 };
class PalaceAudio {
  private ctx: AudioContext | null = null; private master: GainNode | null = null; private noise: AudioBuffer | null = null;
  private verbs: Partial<Record<Zone, { conv: ConvolverNode; wet: GainNode }>> = {}; private zone: Zone = 'medhal'; private tone: GainNode | null = null; private chimePan: PannerNode | null = null; muted = false;
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC()); this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(ctx.destination);
    const n = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, n, ctx.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    for (const z of Object.keys(VERB) as Zone[]) {   // oda başına yankı (üstel sönen gürültü dürtü yanıtı)
      const sec = VERB[z], ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const x = ir.getChannelData(c); for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 2.6); }
      const conv = ctx.createConvolver(); conv.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0; conv.connect(wet).connect(this.master); this.verbs[z] = { conv, wet };
    }
    // oda tonu: çok alçak, neredeyse duyulmaz uğultu (tam sessizlik "bozuk" gibi gelir)
    const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180; this.tone = ctx.createGain(); this.tone.gain.value = 0.025; s.connect(f).connect(this.tone).connect(this.master); s.start();
    this.chimePan = ctx.createPanner(); this.chimePan.panningModel = 'HRTF'; this.chimePan.distanceModel = 'inverse'; this.chimePan.refDistance = 3; this.chimePan.connect(this.master);
    this.setZone(this.zone);
  }
  setZone(z: Zone) { this.zone = z; const ctx = this.ctx; if (!ctx) return; for (const [k, v] of Object.entries(this.verbs)) v!.wet.gain.setTargetAtTime(k === z ? 0.55 : 0, ctx.currentTime, 0.3); }
  step(surface: Surface) {
    const ctx = this.ctx; if (!ctx || !this.noise || !this.master || this.muted) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = this.noise;
    const f = ctx.createBiquadFilter(), g = ctx.createGain(), P = surface === 'mermer' ? { type: 'highpass' as BiquadFilterType, f: 1800, amp: 0.22, dur: 0.07, wet: 1 } : surface === 'parke' ? { type: 'bandpass' as BiquadFilterType, f: 600, amp: 0.2, dur: 0.09, wet: 0.5 } : { type: 'lowpass' as BiquadFilterType, f: 300, amp: 0.12, dur: 0.12, wet: 0 };
    f.type = P.type; f.frequency.value = P.f; g.gain.setValueAtTime(P.amp, t); g.gain.exponentialRampToValueAtTime(0.001, t + P.dur); s.connect(f).connect(g); g.connect(this.master);
    const v = this.verbs[this.zone]; if (v && P.wet) { const w = ctx.createGain(); w.gain.value = P.wet; g.connect(w).connect(v.conv); }
    s.start(t, Math.random()); s.stop(t + P.dur + 0.02);
  }
  /** Cam tınısı: uyumsuz kısmi tonlar (kristal "çınlaması"), nesnenin konumundan */
  chime(at: V3) {
    const ctx = this.ctx; if (!ctx || !this.chimePan || this.muted) return; const t = ctx.currentTime, base = 1800 + Math.random() * 600;
    this.chimePan.positionX.setValueAtTime(at[0], t); this.chimePan.positionY.setValueAtTime(at[1], t); this.chimePan.positionZ.setValueAtTime(at[2], t);
    [1, 2.32, 4.25, 6.63].forEach((m, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = base * m; g.gain.setValueAtTime(0, t + i * 0.01); g.gain.linearRampToValueAtTime(0.05 / (i + 1), t + i * 0.01 + 0.005); g.gain.exponentialRampToValueAtTime(0.0005, t + 2.2 - i * 0.3); o.connect(g).connect(this.chimePan!); const v = this.verbs[this.zone]; if (v) g.connect(v.conv); o.start(t); o.stop(t + 2.3); });
  }
  listener(p: V3, fwd: [number, number]) { const ctx = this.ctx; if (!ctx) return; const L = ctx.listener, t = ctx.currentTime; if (!L.positionX) return; L.positionX.setValueAtTime(p[0], t); L.positionY.setValueAtTime(p[1] + 1.6, t); L.positionZ.setValueAtTime(p[2], t); L.forwardX.setValueAtTime(fwd[0], t); L.forwardY.setValueAtTime(0, t); L.forwardZ.setValueAtTime(fwd[1], t); }
  setMuted(m: boolean) { this.muted = m; if (m) this.hush(); if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.2); }
  speak(text: string) { if (this.muted || !('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'tr-TR'; u.rate = 0.95; const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('tr')); if (v) u.voice = v; speechSynthesis.speak(u); }
  hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  dispose() { this.hush(); void this.ctx?.close(); this.ctx = null; this.master = null; this.verbs = {}; this.tone = null; this.chimePan = null; }
}
export const palaceAudio = new PalaceAudio();
