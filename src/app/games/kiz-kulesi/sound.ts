/**
 * Ortam sesi — Web Audio ile sentezlenir (dosya yok):
 *   vapur : motor uğultusu (alçak testere dalga + süzülmüş gürültü, hafif titreşim), su şıpırtısı, martılar, rüzgâr
 *   ada   : dalga şıpırtısı, martılar
 *   iç    : boğuk oda tonu, uzaktan dalga
 * Sesli okuma: tarayıcının tr-TR konuşma sentezi (cihazda Türkçe ses yoksa yalnızca yazı).
 */
type Mix = 'vapur' | 'ada' | 'ic' | 'sessiz';
const LEVELS: Record<Mix, Record<string, number>> = {
  vapur: { engine: 0.55, water: 0.45, gulls: 0.9, wind: 0.5 },
  ada: { engine: 0.08, water: 0.6, gulls: 1, wind: 0.3 },
  ic: { engine: 0, water: 0.15, gulls: 0.1, wind: 0.05 },
  sessiz: {},
};
class KizSound {
  private ctx: AudioContext | null = null; private master: GainNode | null = null;
  private g: Record<string, GainNode> = {}; private timers: ReturnType<typeof setInterval>[] = [];
  private mixName: Mix = 'sessiz'; muted = false;
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC()), master = (this.master = ctx.createGain()); master.gain.value = this.muted ? 0 : 0.6; master.connect(ctx.destination);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const layer = (n: string) => { const x = ctx.createGain(); x.gain.value = 0; x.connect(master); this.g[n] = x; return x; };
    const noise = (out: GainNode, type: BiquadFilterType, f: number, q: number, lfo = 0, amt = 0) => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; s.connect(fl).connect(out); s.start();
      if (lfo) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = lfo; og.gain.value = amt; o.connect(og).connect(fl.frequency); o.start(); }
    };
    const engine = layer('engine');
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 46; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    const og = ctx.createGain(); og.gain.value = 0.25; const trem = ctx.createOscillator(), tg = ctx.createGain(); trem.frequency.value = 7.5; tg.gain.value = 0.08; trem.connect(tg).connect(og.gain); trem.start();
    o.connect(lp).connect(og).connect(engine); o.start(); noise(engine, 'lowpass', 140, 0.8);
    noise(layer('water'), 'bandpass', 900, 0.6, 0.25, 500);
    noise(layer('wind'), 'lowpass', 500, 0.7, 0.09, 250);
    const gulls = layer('gulls');
    this.timers.push(setInterval(() => { if (Math.random() < 0.4) this.gull(gulls); }, 1600));
    this.mix(this.mixName);
  }
  private gull(out: GainNode) {
    const ctx = this.ctx!; const t = ctx.currentTime, n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const s = t + i * 0.3, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle';
      o.frequency.setValueAtTime(1400, s); o.frequency.linearRampToValueAtTime(2200, s + 0.06); o.frequency.exponentialRampToValueAtTime(850, s + 0.24);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.04, s + 0.03); g.gain.exponentialRampToValueAtTime(0.001, s + 0.26);
      o.connect(g).connect(out); o.start(s); o.stop(s + 0.28);
    }
  }
  mix(m: Mix) { this.mixName = m; if (!this.ctx) return; for (const [k, v] of Object.entries(this.g)) v.gain.setTargetAtTime(LEVELS[m][k] ?? 0, this.ctx.currentTime, 0.6); }
  setMuted(m: boolean) { this.muted = m; if (m) this.hush(); if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.6, this.ctx.currentTime, 0.2); }
  speak(text: string) {
    if (this.muted || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'tr-TR'; u.rate = 1; u.pitch = 1.05;
    const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('tr')); if (v) u.voice = v; speechSynthesis.speak(u);
  }
  hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  dispose() { this.timers.forEach(clearInterval); this.timers = []; this.hush(); void this.ctx?.close(); this.ctx = null; this.master = null; this.g = {}; }
}
export const kizSound = new KizSound();
