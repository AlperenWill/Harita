/**
 * Galata Kulesi — kat bazlı ses. Hepsi Web Audio ile sentezlenir (ses dosyası yok, 0 bayt):
 *   zindan  : seyrek su damlaları + taşın alçak uğultusu
 *   merdiven: her basamakta ayak sesi (yankılı), sahanlıkta nefes, pencerelerden hafif rüzgâr
 *   sergi   : sakin oda tonu
 *   teras   : rüzgâr + uzaktan martılar
 * Katlar arasında 1,5 sn'lik çapraz geçiş yapılır. Anlatım tarayıcının tr-TR konuşma sentezidir (varsa).
 */
export type Floor = 'giris' | 'zindan' | 'merdiven' | 'sergi' | 'teras';
type Layer = 'drone' | 'drips' | 'wind' | 'room' | 'gulls';

const MIX: Record<Floor, Partial<Record<Layer, number>>> = {
  giris: { wind: 0.25, drone: 0.15 },
  zindan: { drone: 0.5, drips: 1 },
  merdiven: { drone: 0.2, wind: 0.18 },
  sergi: { room: 0.6, wind: 0.05 },
  teras: { wind: 0.7, gulls: 1 },
};

class GalataAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private layers = {} as Record<Layer, GainNode>;
  private noise: AudioBuffer | null = null;
  private timers: ReturnType<typeof setInterval>[] = [];
  private floor: Floor = 'giris';
  muted = false;

  /** Tarayıcılar sesi ancak bir kullanıcı hareketinden sonra açar: ilk dokunuşta çağrılır */
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7; this.master.connect(ctx.destination);
    // kuleye uygun uzun, taş yankısı: üstel sönen gürültüden oluşturulan dürtü yanıtı
    const ir = ctx.createBuffer(2, ctx.sampleRate * 2.4, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }
    this.reverb = ctx.createConvolver(); this.reverb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.35; this.reverb.connect(wet).connect(this.master);
    const len = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const nd = this.noise.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; nd[i] = last * 3.5; }

    for (const name of ['drone', 'drips', 'wind', 'room', 'gulls'] as Layer[]) {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(this.master); g.connect(this.reverb); this.layers[name] = g;
    }
    this.loopNoise(this.layers.wind, 'lowpass', 420, 0.7, 0.08, 220);
    this.loopNoise(this.layers.room, 'bandpass', 250, 0.5);
    for (const f of [55, 82.4]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = f; og.gain.value = 0.08; o.connect(og).connect(this.layers.drone); o.start(); }
    this.timers.push(setInterval(() => Math.random() < 0.55 && this.drip(), 700));
    this.timers.push(setInterval(() => Math.random() < 0.35 && this.gull(), 1800));
    this.setFloor(this.floor, 0.1);
  }

  private loopNoise(out: GainNode, type: BiquadFilterType, f: number, q: number, lfoHz = 0, lfoAmt = 0) {
    const ctx = this.ctx!, s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q; s.connect(flt).connect(out); s.start();
    if (lfoHz) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = lfoHz; g.gain.value = lfoAmt; o.connect(g).connect(flt.frequency); o.start(); }
  }
  private drip() {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime, f = 1100 + Math.random() * 900, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.1);
    g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g).connect(this.layers.drips); o.start(t); o.stop(t + 0.25);
  }
  private gull() {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime, n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const s = t + i * 0.28, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle';
      o.frequency.setValueAtTime(1500, s); o.frequency.linearRampToValueAtTime(2300, s + 0.06); o.frequency.exponentialRampToValueAtTime(900, s + 0.22);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.035, s + 0.03); g.gain.exponentialRampToValueAtTime(0.001, s + 0.24);
      o.connect(g).connect(this.layers.gulls); o.start(s); o.stop(s + 0.26);
    }
  }

  /** Kat değişince katmanları çapraz geçişle karıştır */
  setFloor(floor: Floor, fade = 1.5) {
    this.floor = floor;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const name of Object.keys(this.layers) as Layer[]) this.layers[name].gain.setTargetAtTime(MIX[floor][name] ?? 0, t, fade / 3);
  }

  /** Merdivende basamak: kısa, yankılı taş tıkırtısı; "tam" vuruşta biraz daha parlak */
  footstep(bright = false) {
    const ctx = this.ctx; if (!ctx || !this.noise || !this.master) return;
    const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 3 + Math.random();
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = bright ? 900 : 600; f.Q.value = 1.2;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    s.connect(f).connect(g); g.connect(this.master); g.connect(this.reverb!); s.start(t, Math.random()); s.stop(t + 0.14);
  }
  /** Vuruş tıkı (merdiven ritmi): çok kısa, alçak sesli */
  tick(accent = false) {
    const ctx = this.ctx; if (!ctx || !this.master) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = accent ? 660 : 440;
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07); o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.08);
  }
  /** Nefes: süre boyunca yükselen, yumuşak süzülmüş gürültü */
  breath(seconds: number) {
    const ctx = this.ctx; if (!ctx || !this.noise || !this.master) return;
    const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1100, t + seconds);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + seconds * 0.8); g.gain.linearRampToValueAtTime(0, t + seconds + 0.6);
    s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + seconds + 0.7);
  }
  chime() {
    const ctx = this.ctx; if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    [587.33, 739.99, 880].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.1); g.gain.linearRampToValueAtTime(0.1, t + i * 0.1 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 1.4);
      o.connect(g); g.connect(this.master!); g.connect(this.reverb!); o.start(t + i * 0.1); o.stop(t + i * 0.1 + 1.5);
    });
  }

  /** Sesli anlatım (tarayıcının tr-TR sesi). Ses yoksa arayüzdeki altyazı yeterlidir. */
  speak(text: string) {
    if (this.muted || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'tr-TR'; u.rate = 0.95;
    const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('tr')); if (v) u.voice = v;
    speechSynthesis.speak(u);
  }
  hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }

  setMuted(m: boolean) {
    this.muted = m; if (m) this.hush();
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.2);
  }
  dispose() {
    this.timers.forEach(clearInterval); this.timers = []; this.hush();
    void this.ctx?.close(); this.ctx = null; this.master = null; this.reverb = null; this.layers = {} as Record<Layer, GainNode>;
  }
}
export const galataAudio = new GalataAudio();
