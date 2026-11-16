/**
 * Nemrut — ses (Web Audio; dosya yok). Sürekli sert rüzgâr: süzülmüş gürültü, konumlu (HRTF) üç kaynak:
 *   ana rüzgâr rüzgârın geldiği yönde (batı-kuzeybatı, yukarıda), iki "kıvrılma" kaynağı heykel sırasının arkasında — heykellerin
 *   arkasından dolanan rüzgâr daha boğuk ve ıslıklı duyulur (dar bant, yüksek Q). Şiddet günün saatine göre: gece sakin, öğle hafif,
 *   gün doğumu/batımında sert. Restore: taş sürtünmesi (alçak, pürüzlü gürültü) + ince bir parıltı.
 */
import { WIND_DIR, type V3 } from './DynamicLightingSystem';
class NemrutAudio {
  private ctx: AudioContext | null = null; private master: GainNode | null = null; private noise: AudioBuffer | null = null;
  private main: GainNode | null = null; private mainF: BiquadFilterNode | null = null; private pans: PannerNode[] = []; private eg: GainNode[] = []; muted = false;
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC()); this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(ctx.destination);
    const n = ctx.sampleRate * 3; this.noise = ctx.createBuffer(1, n, ctx.sampleRate); const d = this.noise.getChannelData(0); let last = 0; for (let i = 0; i < n; i++) { last = (last + 0.03 * (Math.random() * 2 - 1)) / 1.03; d[i] = last * 4; }
    const src = (type: BiquadFilterType, f: number, q: number, pos: V3, lfo: number) => {
      const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = lfo; og.gain.value = f * 0.45; o.connect(og).connect(fl.frequency); o.start();
      const g = ctx.createGain(); g.gain.value = 0; const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'linear'; p.maxDistance = 600; p.refDistance = 60; p.positionX.value = pos[0]; p.positionY.value = pos[1]; p.positionZ.value = pos[2];
      s.connect(fl).connect(g).connect(p).connect(this.master!); s.start(); this.pans.push(p); return { g, fl };
    };
    const m = src('lowpass', 520, 0.7, [-WIND_DIR[0] * 160, 40, -WIND_DIR[1] * 160], 0.09); this.main = m.g; this.mainF = m.fl;
    for (const z of [-22, 24]) this.eg.push(src('bandpass', 1300, 5, [0, 6, z], 0.31 + z * 0.002).g);   // heykellerin arkasından dolanan rüzgâr
  }
  /** Her güncellemede: rüzgâr şiddeti (0..1), dinleyici, heykel sırasının x'i (kıvrılma kaynakları oraya taşınır) */
  update(wind: number, pos: V3, fwd: V3, rowX: number) {
    const ctx = this.ctx; if (!ctx || !this.main) return; const t = ctx.currentTime;
    this.main.gain.setTargetAtTime(0.18 + wind * 0.75, t, 0.6); this.mainF!.frequency.setTargetAtTime(320 + wind * 620, t, 0.8);
    for (const g of this.eg) g.gain.setTargetAtTime(wind * 0.22, t, 0.6);
    this.pans.slice(1).forEach((p) => p.positionX.setTargetAtTime(rowX - Math.sign(rowX) * 6, t, 0.3));
    const L = ctx.listener; if (L.positionX) { L.positionX.setValueAtTime(pos[0], t); L.positionY.setValueAtTime(pos[1], t); L.positionZ.setValueAtTime(pos[2], t); L.forwardX.setValueAtTime(fwd[0], t); L.forwardY.setValueAtTime(fwd[1], t); L.forwardZ.setValueAtTime(fwd[2], t); }
  }
  /** Restore sesi: taş sürtünmesi + parıltı */
  restore() {
    const ctx = this.ctx; if (!ctx || !this.noise || !this.master) return; const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.35; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(180, t); f.frequency.linearRampToValueAtTime(420, t + 1.6); f.Q.value = 1.2;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.3); g.gain.exponentialRampToValueAtTime(0.001, t + 2); s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + 2.1);
    [880, 1318.5, 1760].forEach((fr, i) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = fr; og.gain.setValueAtTime(0, t + 0.5 + i * 0.18); og.gain.linearRampToValueAtTime(0.04, t + 0.55 + i * 0.18); og.gain.exponentialRampToValueAtTime(0.001, t + 2.6 + i * 0.18); o.connect(og).connect(this.master!); o.start(t + 0.5 + i * 0.18); o.stop(t + 2.8 + i * 0.18); });
  }
  setMuted(m: boolean) { this.muted = m; if (m && 'speechSynthesis' in window) speechSynthesis.cancel(); if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.2); }
  speak(text: string) { if (this.muted || !('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'tr-TR'; u.rate = 0.95; const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('tr')); if (v) u.voice = v; speechSynthesis.speak(u); }
  dispose() { if ('speechSynthesis' in window) speechSynthesis.cancel(); void this.ctx?.close(); this.ctx = null; this.master = null; this.main = null; this.pans = []; this.eg = []; }
}
export const nemrutAudio = new NemrutAudio();
