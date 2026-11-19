/**
 * Kapalıçarşı — ses (Web Audio; dosya yok, hepsi sentez). Her kaynak HRTF panner ile 3B konumludur: sağdaki dükkânın sesi sağ kulaktan.
 *  - Pazar uğultusu: sürekli bant geçiren gürültü + oyuncunun çevresinde rastgele konumlarda "konuşma benzeri" heceler
 *    (testere dalga + iki formant süzgeci; sözcük yok). Yoğunluk kalabalık sayısıyla orantılı; gece susar.
 *  - Uzak seslenmeler: ara sıra, uzak bir noktada perdesi kayan sesli bir çağrı benzeri ton.
 *  - Ayak sesi: taş zemin üstünde kısa, parlak gürültü patlaması.
 *  - Dükkân sesleri: en yakın 4 dükkânın zanaatına göre: bakırcı çekiç (uyumsuz kısmi tonlar), aktar öğütme (ritmik alçak gürültü),
 *    kuyumcu ince şıngırtı, lambacı cam tıkırtısı, antikacı saat tik-takı, kumaşçı kumaş hışırtısı, çinici seramik tıkırtısı;
 *    halıcıda sessizlik (o dükkânın yanında uğultu da kısılır). Dükkânın içindeyken uğultu ~8 dB kısılır, dükkân sesi öne çıkar.
 */
import type { Trade, V2 } from './ProceduralStreetGenerator';

class BazaarAudio {
  private ctx: AudioContext | null = null; private master: GainNode | null = null; private noise: AudioBuffer | null = null;
  private murmur: GainNode | null = null; private voices: PannerNode[] = []; private shopPan: PannerNode[] = []; private shopGain: GainNode[] = []; private shopTrade: (Trade | null)[] = [null, null, null, null];
  private timers: ReturnType<typeof setInterval>[] = []; private density = 1; private night = false; private inside = false; muted = false;
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC()); this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(ctx.destination);
    const n = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, n, ctx.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    // sürekli uğultu (konumsuz, iki katman)
    this.murmur = ctx.createGain(); this.murmur.gain.value = 0; this.murmur.connect(this.master);
    for (const [f, q, g] of [[420, 0.8, 0.09], [1300, 1.2, 0.04]] as const) { const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q; const gg = ctx.createGain(); gg.gain.value = g; s.connect(fl).connect(gg).connect(this.murmur); s.start(); }
    const pan = () => { const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 2; p.rolloffFactor = 1.2; p.connect(this.master!); return p; };
    for (let i = 0; i < 6; i++) this.voices.push(pan());
    for (let i = 0; i < 4; i++) { const p = pan(), g = ctx.createGain(); g.gain.value = 0.9; g.connect(p); this.shopPan.push(p); this.shopGain.push(g); }
    this.timers.push(setInterval(() => this.tick(), 160));
    this.setNight(this.night);
  }
  private burst(out: AudioNode, f: number, q: number, amp: number, dur: number, type: BiquadFilterType = 'bandpass') { const ctx = this.ctx!, t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = this.noise; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(fl).connect(g).connect(out); s.start(t, Math.random()); s.stop(t + dur + 0.02); }
  private tone(out: AudioNode, f: number, amp: number, dur: number, delay = 0) { const ctx = this.ctx!, t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02); }
  /** Konuşma benzeri hece dizisi (sözcük yok) */
  private phrase(out: AudioNode, pitch: number, amp: number) {
    const ctx = this.ctx!; let t = ctx.currentTime; const n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) { const d = 0.09 + Math.random() * 0.12, o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(pitch * (0.9 + Math.random() * 0.25), t);
      const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = 350 + Math.random() * 450; f2.frequency.value = 1000 + Math.random() * 1300; f1.Q.value = f2.Q.value = 6;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.03); g.gain.linearRampToValueAtTime(0, t + d); o.connect(f1).connect(g); o.connect(f2).connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.02); t += d + 0.03; }
  }
  /** Uzak seslenme: perdesi yükselip inen ünlü benzeri ton */
  private call(out: AudioNode) { const ctx = this.ctx!, t = ctx.currentTime, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; const p = 170 + Math.random() * 90; o.frequency.setValueAtTime(p, t); o.frequency.linearRampToValueAtTime(p * 1.35, t + 0.35); o.frequency.linearRampToValueAtTime(p * 1.1, t + 0.9); f.type = 'bandpass'; f.frequency.value = 800; f.Q.value = 3; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.1); g.gain.linearRampToValueAtTime(0, t + 1); o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + 1.05); }
  private tick() {
    if (!this.ctx || this.muted) return; const k = this.inside ? 0.35 : 1;
    if (!this.night && Math.random() < 0.55 * this.density) { const v = this.voices[Math.floor(Math.random() * 4)]; this.phrase(v, 95 + Math.random() * 140, 0.22 * k); }
    if (!this.night && Math.random() < 0.02) this.call(this.voices[5]);
    this.shopTrade.forEach((tr, i) => {
      const out = this.shopGain[i], r = Math.random();
      switch (tr) {
        case 'bakirci': if (r < 0.45) [1, 2.76, 5.4].forEach((m, j) => this.tone(out, 520 * m, 0.1 / (j + 1), 0.5)); break;   // çekiç: uyumsuz kısmi tonlar
        case 'baharatci': if (r < 0.7) this.burst(out, 240, 0.7, 0.18, 0.3, 'lowpass'); break;                                    // öğütme
        case 'kuyumcu': if (r < 0.3) this.tone(out, 3000 + Math.random() * 2500, 0.03, 0.4); break;
        case 'lambaci': if (r < 0.25) this.tone(out, 2200 + Math.random() * 1500, 0.04, 0.25); break;
        case 'antikaci': this.burst(out, 3800, 4, 0.12, 0.03, 'bandpass'); break;                                                // saat tik-takı
        case 'kumasci': if (r < 0.35) this.burst(out, 5000, 0.5, 0.05, 0.35, 'highpass'); break;
        case 'cinici': if (r < 0.2) this.tone(out, 1400 + Math.random() * 600, 0.04, 0.18); break;
        default: break;                                                                                                          // halıcı: sessizlik
      }
    });
  }
  /** Her karede: dinleyici + konumlu kaynaklar (uğultu sesleri çevrede, dükkân sesleri en yakın 4 dükkânda) */
  update(pos: V2, fwd: V2, near: { at: V2; trade: Trade }[], quiet: boolean) {
    const ctx = this.ctx; if (!ctx) return; const t = ctx.currentTime, L = ctx.listener;
    if (L.positionX) { L.positionX.setValueAtTime(pos[0], t); L.positionY.setValueAtTime(1.6, t); L.positionZ.setValueAtTime(pos[1], t); L.forwardX.setValueAtTime(fwd[0], t); L.forwardY.setValueAtTime(0, t); L.forwardZ.setValueAtTime(fwd[1], t); }
    this.voices.forEach((p, i) => { if (Math.random() < 0.02) { const a = Math.random() * Math.PI * 2, d = i === 5 ? 30 : 3 + Math.random() * 9; p.positionX.setValueAtTime(pos[0] + Math.cos(a) * d, t); p.positionY.setValueAtTime(1.6, t); p.positionZ.setValueAtTime(pos[1] + Math.sin(a) * d, t); } });
    near.slice(0, 4).forEach((s, i) => { this.shopTrade[i] = s.trade; const p = this.shopPan[i]; p.positionX.setTargetAtTime(s.at[0], t, 0.1); p.positionY.setTargetAtTime(1.5, t, 0.1); p.positionZ.setTargetAtTime(s.at[1], t, 0.1); });
    this.murmur?.gain.setTargetAtTime(this.night ? 0 : (0.6 + 0.4 * this.density) * (this.inside ? 0.4 : quiet ? 0.55 : 1), t, 0.4);
  }
  step() { if (this.ctx && this.master) this.burst(this.master, 1700 + Math.random() * 500, 1, 0.14, 0.09); }
  chime(ok = true) { if (!this.ctx || !this.master) return; (ok ? [659.25, 987.77] : [220, 196]).forEach((f, i) => this.tone(this.master!, f, 0.06, 1, i * 0.12)); }
  setDensity(d: number) { this.density = d; }
  setNight(n: boolean) { this.night = n; }
  setInside(v: boolean) { this.inside = v; this.shopGain.forEach((g) => this.ctx && g.gain.setTargetAtTime(v ? 1.6 : 0.9, this.ctx.currentTime, 0.3)); }
  setMuted(m: boolean) { this.muted = m; if (m) this.hush(); if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.2); }
  speak(text: string) { if (this.muted || !('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'tr-TR'; u.rate = 1; const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('tr')); if (v) u.voice = v; speechSynthesis.speak(u); }
  hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  dispose() { this.timers.forEach(clearInterval); this.timers = []; this.hush(); void this.ctx?.close(); this.ctx = null; this.master = null; this.murmur = null; this.voices = []; this.shopPan = []; this.shopGain = []; }
}
export const bazaarAudio = new BazaarAudio();
