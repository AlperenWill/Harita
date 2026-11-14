/**
 * Yerebatan — uzamsal ses (Web Audio, dosya yok; her şey sentezlenir).
 *  - Damlalar: sarnıçta sabit konumlu 10 kaynak, her biri HRTF PannerNode üzerinden. Sağdaki sütundan düşen damla sağ kulaktan duyulur;
 *    uzaklıkla ters orantılı söner (distanceModel 'inverse', refDistance 2 m).
 *  - Uzaktan yankılı ayak sesleri: oyuncudan 25–45 m uzakta rastgele konumlarda, uzun yankıyla (başka ziyaretçiler hissi).
 *  - Oyuncunun ayak sesi: konumsuz (kendi kulağımızın dibinde), ahşap platform tınısı + yankı.
 *  - Sütun uğultusu: bir ilgi noktasına yaklaştıkça yükselen hafif "hum" (yakınlıkla 0..1).
 *  - Medusa bas tonu: Medusa'ya bakıldığında derin, yavaş nabızlı bir bas.
 *  - Yankı: üstel sönen gürültüden üretilmiş 3,5 sn'lik dürtü yanıtı (taş + su, çok yankılı mekân).
 * Dinleyici (AudioListener) her karede kameranın konumu ve yönüyle güncellenir.
 */
const DRIP_SPOTS: [number, number, number][] = [
  [-50, 6, -20], [-30, 7, 10], [-10, 6, -5], [8, 7, 18], [25, 6, -15], [45, 7, 5], [60, 6, -25], [-60, 7, 22], [0, 8, 0], [35, 6, 24],
];
class CisternAudio {
  private ctx: AudioContext | null = null; private master: GainNode | null = null; private verb: ConvolverNode | null = null;
  private noise: AudioBuffer | null = null; private timers: ReturnType<typeof setInterval>[] = [];
  private hum: GainNode | null = null; private bass: GainNode | null = null; private drips: PannerNode[] = [];
  private player = { x: 0, y: 0, z: 0 };
  muted = false;

  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(ctx.destination);
    const ir = ctx.createBuffer(2, ctx.sampleRate * 3.5, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6); }
    this.verb = ctx.createConvolver(); this.verb.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0.55; this.verb.connect(wet).connect(this.master);
    const len = ctx.sampleRate; this.noise = ctx.createBuffer(1, len, ctx.sampleRate); const nd = this.noise.getChannelData(0); for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;

    // düşük uğultu (mekânın kendi sesi)
    const room = ctx.createBufferSource(); room.buffer = this.noise; room.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 120; const rg = ctx.createGain(); rg.gain.value = 0.05;
    room.connect(lp).connect(rg).connect(this.master); room.start();

    // damla kaynakları (uzamsal)
    for (const [x, y, z] of DRIP_SPOTS) {
      const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 2; p.maxDistance = 60; p.rolloffFactor = 1.3;
      p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z;
      p.connect(this.master); p.connect(this.verb); this.drips.push(p);
    }
    this.timers.push(setInterval(() => { for (const p of this.drips) if (Math.random() < 0.18) this.drip(p); }, 400));
    this.timers.push(setInterval(() => { if (Math.random() < 0.3) this.distantSteps(); }, 2500));

    // uğultu ve bas (yakınlık / bakışla kontrol edilir)
    this.hum = ctx.createGain(); this.hum.gain.value = 0; this.hum.connect(this.master);
    for (const f of [196, 293.7]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0.03; o.connect(g).connect(this.hum); o.start(); }
    this.bass = ctx.createGain(); this.bass.gain.value = 0; this.bass.connect(this.master); this.bass.connect(this.verb);
    const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.value = 43.65; const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.35; lg.gain.value = 0.04;
    const bg = ctx.createGain(); bg.gain.value = 0.12; lfo.connect(lg).connect(bg.gain); b.connect(bg).connect(this.bass); b.start(); lfo.start();
    const b2 = ctx.createOscillator(); b2.type = 'triangle'; b2.frequency.value = 87.3; const b2g = ctx.createGain(); b2g.gain.value = 0.03; b2.connect(b2g).connect(this.bass); b2.start();
  }
  private drip(out: AudioNode) {
    const ctx = this.ctx!, t = ctx.currentTime, f = 900 + Math.random() * 1200, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.42, t + 0.09);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g).connect(out); o.start(t); o.stop(t + 0.2);
  }
  /** Uzakta, rastgele bir yerde 3–6 yankılı adım */
  private distantSteps() {
    const ctx = this.ctx!; if (!this.noise) return;
    const a = Math.random() * Math.PI * 2, d = 25 + Math.random() * 20, p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 3;
    p.positionX.value = this.player.x + Math.cos(a) * d; p.positionY.value = 1; p.positionZ.value = this.player.z + Math.sin(a) * d;
    const g = ctx.createGain(); g.gain.value = 0.6; g.connect(p); p.connect(this.verb!); p.connect(this.master!);
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) this.thud(g, ctx.currentTime + i * 0.62, 0.5);
  }
  private thud(out: AudioNode, t: number, amp: number) {
    const ctx = this.ctx!, s = ctx.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.6 + Math.random() * 0.2;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 260 + Math.random() * 80; f.Q.value = 1.5;
    const g = ctx.createGain(); g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.16);
  }
  /** Oyuncunun adımı (ahşap platform) */
  footstep() { if (!this.ctx || !this.master) return; const g = this.ctx.createGain(); g.gain.value = 0.9; g.connect(this.master); g.connect(this.verb!); this.thud(g, this.ctx.currentTime, 0.7); }
  /** Bilgi kartı açılınca kısa tını */
  chime() {
    const ctx = this.ctx; if (!ctx || !this.master) return; const t = ctx.currentTime;
    [440, 659.25].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0, t + i * 0.12); g.gain.linearRampToValueAtTime(0.07, t + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 1.6); o.connect(g); g.connect(this.master!); g.connect(this.verb!); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 1.7); });
  }

  /** Her karede: dinleyici = kamera; uğultu ve bas düzeyleri */
  update(pos: { x: number; y: number; z: number }, fwd: { x: number; y: number; z: number }, humLevel: number, bassLevel: number) {
    this.player = pos; const ctx = this.ctx; if (!ctx) return;
    const L = ctx.listener, t = ctx.currentTime;
    if (L.positionX) {
      L.positionX.setValueAtTime(pos.x, t); L.positionY.setValueAtTime(pos.y, t); L.positionZ.setValueAtTime(pos.z, t);
      L.forwardX.setValueAtTime(fwd.x, t); L.forwardY.setValueAtTime(fwd.y, t); L.forwardZ.setValueAtTime(fwd.z, t);
      L.upX.setValueAtTime(0, t); L.upY.setValueAtTime(1, t); L.upZ.setValueAtTime(0, t);
    } else { (L as unknown as { setPosition: (...a: number[]) => void; setOrientation: (...a: number[]) => void }).setPosition(pos.x, pos.y, pos.z); (L as unknown as { setOrientation: (...a: number[]) => void }).setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0); }
    this.hum?.gain.setTargetAtTime(humLevel, t, 0.3);
    this.bass?.gain.setTargetAtTime(bassLevel, t, 0.6);
  }
  setMuted(m: boolean) { this.muted = m; if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.2); if (m) this.hush(); }
  speak(text: string) {
    if (this.muted || !('speechSynthesis' in window)) return; speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'tr-TR'; u.rate = 0.95; const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('tr')); if (v) u.voice = v; speechSynthesis.speak(u);
  }
  hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  dispose() { this.timers.forEach(clearInterval); this.timers = []; this.hush(); void this.ctx?.close(); this.ctx = null; this.master = null; this.drips = []; this.hum = this.bass = null; }
}
export const cisternAudio = new CisternAudio();
export { DRIP_SPOTS };
