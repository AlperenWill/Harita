/**
 * Ayasofya — akustik ve atmosfer (Web Audio; dosya yok, hepsi sentezlenir).
 * Akustik simülasyon: her bölgenin kendi yankısı var — üstel sönen gürültüden üretilmiş dürtü yanıtları:
 *   ana nef 7 sn (çok uzun, taş ve hacim), apsis 4 sn, galeri 1,8 sn (alçak tavan, daha kuru), narteks 2,6 sn.
 * Adım ve fısıltı sesleri bulunduğun bölgenin yankısına gönderilir; bölge değişince yankılar 1,2 sn'de çapraz geçer.
 * Ortam: hafif rüzgâr, alçak şehir uğultusu, narteks yakınında su sesi (dışarıdaki şadırvanı anımsatır), uzaktan fısıltılar.
 * Müzik (isteğe bağlı, varsayılan kapalı): sentezlenmiş, çok kısık bir dem sesi (ison) — bir Bizans ilahisi ya da Osmanlı eseri DEĞİLDİR.
 * Ezan sentezlenmez; dini okuyuşu taklit etmek yerine mihrap önünde yalnızca ışık odaklanır.
 */
import type { Zone } from './hagia';
const RT: Record<Zone, number> = { avlu: 0.5, nef: 7, apsis: 4, galeri: 1.8, narteks: 2.6 };

class HagiaAudio {
  private ctx: AudioContext | null = null; private master: GainNode | null = null;
  private verbs = {} as Record<Zone, { in: GainNode; wet: GainNode }>;
  private noise: AudioBuffer | null = null; private timers: ReturnType<typeof setInterval>[] = [];
  private water: GainNode | null = null; private music: GainNode | null = null; private zone: Zone = 'narteks';
  muted = false;
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC()); this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(ctx.destination);
    for (const z of Object.keys(RT) as Zone[]) {
      const len = Math.floor(ctx.sampleRate * RT[z]), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, z === 'galeri' ? 4 : 2.4); }
      const conv = ctx.createConvolver(); conv.buffer = ir; const input = ctx.createGain(), wet = ctx.createGain(); wet.gain.value = z === this.zone ? 0.6 : 0;
      input.connect(conv).connect(wet).connect(this.master); this.verbs[z] = { in: input, wet };
    }
    const n = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, n, ctx.sampleRate); const nd = this.noise.getChannelData(0); let last = 0;
    for (let i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; nd[i] = last * 3.5; }
    const loop = (type: BiquadFilterType, f: number, q: number, gain: number, lfo = 0, amt = 0) => {
      const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = gain;
      s.connect(fl).connect(g).connect(this.master!); s.start(); if (lfo) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = lfo; og.gain.value = amt; o.connect(og).connect(fl.frequency); o.start(); } return g;
    };
    loop('lowpass', 300, 0.6, 0.12, 0.06, 120);          // rüzgâr
    loop('lowpass', 90, 0.5, 0.2);                       // şehir uğultusu
    this.water = loop('bandpass', 1500, 0.7, 0, 0.5, 500); // su (narteks)
    this.timers.push(setInterval(() => { if (Math.random() < 0.3) this.whisper(); }, 2600));
    // isteğe bağlı müzik: dem sesi (iki beşli aralıklı sinüs, çok yavaş nabız)
    this.music = ctx.createGain(); this.music.gain.value = 0; this.music.connect(this.verbs.nef.in); this.music.connect(this.master);
    for (const [f, a] of [[110, 0.05], [165, 0.03], [220, 0.018]] as const) { const o = ctx.createOscillator(); o.frequency.value = f; const g = ctx.createGain(); g.gain.value = a; const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 0.07 + f / 4000; lg.gain.value = a * 0.5; l.connect(lg).connect(g.gain); l.start(); o.connect(g).connect(this.music); o.start(); }
  }
  private burst(f: number, q: number, amp: number, dur: number, rate = 1) {
    const ctx = this.ctx; if (!ctx || !this.noise || !this.master) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = rate;
    const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + dur * 0.2); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl).connect(g); g.connect(this.master); g.connect(this.verbs[this.zone].in); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  /** Adım: mermerde kısa tık; yankısı bulunulan bölgeye göre değişir */
  footstep() { this.burst(520 + Math.random() * 120, 1.4, 0.8, 0.12, 3); }
  private whisper() { this.burst(2400 + Math.random() * 900, 0.8, 0.05, 0.9, 6); }
  chime() { const ctx = this.ctx; if (!ctx || !this.master) return; const t = ctx.currentTime; [392, 587.3].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0, t + i * 0.15); g.gain.linearRampToValueAtTime(0.06, t + i * 0.15 + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 2.2); o.connect(g); g.connect(this.master!); g.connect(this.verbs[this.zone].in); o.start(t + i * 0.15); o.stop(t + i * 0.15 + 2.3); }); }
  setZone(z: Zone) {
    this.zone = z; const ctx = this.ctx; if (!ctx) return; const t = ctx.currentTime;
    for (const k of Object.keys(this.verbs) as Zone[]) this.verbs[k].wet.gain.setTargetAtTime(k === z ? 0.6 : 0, t, 0.4);
    this.water?.gain.setTargetAtTime(z === 'avlu' ? 0.22 : z === 'narteks' ? 0.08 : 0.01, t, 0.8);   // şadırvan avluda
  }
  setMusic(on: boolean) { if (this.ctx && this.music) this.music.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 1.5); }
  setMuted(m: boolean) { this.muted = m; if (m) this.hush(); if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.2); }
  speak(text: string) { if (this.muted || !('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'tr-TR'; u.rate = 0.95; const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('tr')); if (v) u.voice = v; speechSynthesis.speak(u); }
  hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  dispose() { this.timers.forEach(clearInterval); this.timers = []; this.hush(); void this.ctx?.close(); this.ctx = null; this.master = null; this.verbs = {} as never; this.water = this.music = null; }
}
export const hagiaAudio = new HagiaAudio();
export { RT as REVERB_SECONDS };
