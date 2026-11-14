/**
 * Ambiyans: Web Audio ile sentezlenir (ses dosyası yok): rüzgâr, avluda şadırvan suyu, içeride yumuşak bir yankı tınısı.
 * Ezan: dini bir okuyuş olduğu için sentezlenmez. public/audio/sultanahmet-ezan.mp3 dosyası (lisanslı bir kayıt)
 * eklenirse arayüzdeki düğme etkinleşir; dosya depoda yoktur.
 */
export const AZAN_URL = `${import.meta.env.BASE_URL}audio/sultanahmet-ezan.mp3`;

class Ambience {
  private ctx: AudioContext | null = null;
  private nodes: { wind: GainNode; water: GainNode; pad: GainNode; master: GainNode } | null = null;
  private azan: HTMLAudioElement | null = null;

  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = (this.ctx = new AC());
    const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const noise = (type: BiquadFilterType, f: number, q: number) => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0; s.connect(flt).connect(g).connect(master); s.start(); return { g, flt };
    };
    const wind = noise('lowpass', 380, 0.6), water = noise('bandpass', 1400, 0.8);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.4; lg.gain.value = 500; lfo.connect(lg).connect(water.flt.frequency); lfo.start();
    // içeride: geniş kubbenin yankısını anımsatan, çok alçak ve yavaş açılıp kapanan tını
    const pad = ctx.createGain(); pad.gain.value = 0; pad.connect(master);
    for (const [f, dt] of [[110, 0], [164.8, 4], [220, -3]] as const) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = dt;
      const og = ctx.createGain(); og.gain.value = 0.05; const sw = ctx.createOscillator(), swg = ctx.createGain(); sw.frequency.value = 0.05 + f / 9000; swg.gain.value = 0.03;
      sw.connect(swg).connect(og.gain); sw.start(); o.connect(og).connect(pad); o.start();
    }
    this.nodes = { wind: wind.g, water: water.g, pad, master };
    master.gain.setTargetAtTime(0.6, ctx.currentTime, 1.5);
  }
  /** Konuma göre karışım: avluda su, içeride tını, dışarıda rüzgâr */
  setZone(zone: 'outside' | 'court' | 'hall') {
    if (!this.ctx || !this.nodes) return;
    const t = this.ctx.currentTime, n = this.nodes;
    n.wind.gain.setTargetAtTime(zone === 'hall' ? 0.05 : 0.35, t, 0.8);
    n.water.gain.setTargetAtTime(zone === 'court' ? 0.22 : 0.0, t, 0.8);
    n.pad.gain.setTargetAtTime(zone === 'hall' ? 1 : 0.15, t, 1.2);
  }
  setMuted(m: boolean) { if (this.ctx && this.nodes) this.nodes.master.gain.setTargetAtTime(m ? 0 : 0.6, this.ctx.currentTime, 0.3); if (this.azan) this.azan.muted = m; }
  async azanAvailable() { try { const r = await fetch(AZAN_URL, { method: 'HEAD' }); return r.ok && (r.headers.get('content-type') ?? '').startsWith('audio'); } catch { return false; } }
  playAzan() { this.azan ??= new Audio(AZAN_URL); this.azan.currentTime = 0; void this.azan.play(); }
  stop() { this.azan?.pause(); void this.ctx?.close(); this.ctx = null; this.nodes = null; }
}
export const ambience = new Ambience();
