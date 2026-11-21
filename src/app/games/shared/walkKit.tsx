/**
 * Rotaya kilitli yürüyüş oyunları için ortak parçalar (Ani, İshak Paşa, Akdamar).
 * Troya / Efes / Pamukkale ile aynı sözleşme: ?q=low|medium|high, ?debug, tr-TR sesli okuma, WebGL yoksa Vikipedi fotoğraflı yedek.
 * Dokunmatik: dikey sürükleme yürütür, yatay sürükleme bakar. Klavye: W/S yürü, A/D ya da oklar bak.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { ArrowLeft, BookOpen, Check, ChevronLeft, ChevronRight, ExternalLink, MapPin, RotateCcw, Undo2, X } from 'lucide-react';
import { speakTr, type VoiceGender } from './voice';

export type Tier = 'low' | 'medium' | 'high';
export const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
export const pinned = (() => { const q = new URLSearchParams(location.search).get('q'); return q === 'low' || q === 'medium' || q === 'high' ? (q as Tier) : null; })();
export function detectTier(): Tier { if (pinned) return pinned; const nav = navigator as Navigator & { deviceMemory?: number }; if ((nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low'; return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high'; }
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const dprFor = (t: Tier): [number, number] => (t === 'high' ? [1, 2] : t === 'medium' ? [1, 1.5] : [0.75, 1]);
export const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export { makeRoute, type V3 } from './route';
import type { V3 } from './route';

/* ---------- canvas dokuları ---------- */
/** Kesme taş duvar dokusu (sıralı bloklar, derzler) */
export function ashlarTex(seed: number, base: string, light = 30, rowH = [10, 14] as [number, number]) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!, r = rng(seed); g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  let y = 0; while (y < 128) { const h = rowH[0] + r() * rowH[1]; let x = -r() * 20; while (x < 128) { const w = 16 + r() * 22, v = (light * (r() - 0.5)) | 0; g.fillStyle = `rgba(${v > 0 ? '255,250,235' : '0,0,0'},${Math.abs(v) / 120})`; g.fillRect(x + 1, y + 1, w - 2, h - 2); g.strokeStyle = 'rgba(40,30,20,.35)'; g.strokeRect(x + 1, y + 1, w - 2, h - 2); x += w; } y += h; }
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * 128, r() * 128, 1 + r() * 2, 1 + r() * 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
/** İki renkli (ör. kırmızı-siyah tüf) dama/şerit kesme taş — Ani ve Akdamar’da renkli taş işçiliği için */
export function bicolorTex(seed: number, a: string, b: string, pattern: 'rows' | 'checker') {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!, r = rng(seed);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { const odd = pattern === 'rows' ? j % 2 : (i + j) % 2; g.fillStyle = odd ? b : a; g.fillRect(i * 32 + (j % 2) * 16 - 16, j * 16, 32, 16); g.fillRect(i * 32 + (j % 2) * 16 + 112, j * 16, 32, 16); g.fillStyle = `rgba(255,255,255,${r() * 0.07})`; g.fillRect(i * 32 + (j % 2) * 16 - 16, j * 16, 32, 16); g.strokeStyle = 'rgba(20,10,5,.4)'; g.strokeRect(i * 32 + (j % 2) * 16 - 16 + 0.5, j * 16 + 0.5, 31, 15); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/* ---------- ses: rüzgâr, adım, tını, sesli okuma ---------- */
export class WalkAudio {
  private ctx: AudioContext | null = null; private master: GainNode | null = null; noise: AudioBuffer | null = null; muted = false;
  constructor(private wind = { freq: 500, gain: 0.09 }, private voice: VoiceGender = 'any') {}
  get context() { return this.ctx; } get out() { return this.master; }
  unlock() { if (this.ctx) { void this.ctx.resume(); return; } const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC()); this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7; this.master.connect(ctx.destination);
    const n = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, n, ctx.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = this.wind.freq; f.Q.value = 0.7; const g = ctx.createGain(); g.gain.value = this.wind.gain; const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11; const lg = ctx.createGain(); lg.gain.value = this.wind.gain * 0.55; lfo.connect(lg).connect(g.gain); s.connect(f).connect(g).connect(this.master); s.start(); lfo.start(); }
  step(freq = 700) { const ctx = this.ctx; if (!ctx || !this.noise || !this.master || this.muted) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = this.noise; const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.frequency.value = freq; g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1); s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + 0.12); }
  tone(ok: boolean) { const ctx = this.ctx; if (!ctx || !this.master || this.muted) return; const t = ctx.currentTime; (ok ? [523.3, 659.3, 784] : [220, 185]).forEach((fr, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = ok ? 'triangle' : 'sine'; o.frequency.value = fr; g.gain.setValueAtTime(0, t + i * 0.1); g.gain.linearRampToValueAtTime(0.08, t + i * 0.1 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + (ok ? 1.2 : 0.4)); o.connect(g).connect(this.master!); o.start(t + i * 0.1); o.stop(t + i * 0.1 + 1.3); }); }
  click() { const ctx = this.ctx; if (!ctx || !this.noise || !this.master || this.muted) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = this.noise; const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 2500; g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06); s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + 0.08); }
  setMuted(m: boolean) { this.muted = m; if (m) this.hush(); if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.2); }
  speak(t: string) { if (!this.muted) speakTr(t, { gender: this.voice }); }
  hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  dispose() { this.hush(); void this.ctx?.close(); this.ctx = null; this.master = null; }
}

/* ---------- giriş: klavye + sürükleme ---------- */
export interface Live { s: number; v: number; input: number; yaw: number; pitch: number }
export const newLive = (): Live => ({ s: 0, v: 0, input: 0, yaw: 0, pitch: 0 });
/** Klavye döngüsü ve işaretçi işleyicileri. canMove false iken sürükleme yalnızca bakış içindir. */
export function useWalkInput(live: Live, enabled: () => boolean, onKey?: (e: KeyboardEvent) => void, unlock?: () => void) {
  const keys = useRef(new Set<string>()), drag = useRef<{ id: number; x: number; y0: number; y: number; mouse: boolean } | null>(null), keyCb = useRef(onKey); keyCb.current = onKey;
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); if (!e.repeat) keyCb.current?.(e); };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0, last = performance.now();
    const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; const k = keys.current; const kb = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0); if (!drag.current || drag.current.mouse) live.input = kb;
      live.yaw += ((k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0) - (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0)) * dt * 1.8; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); };
  }, [live]);
  return {
    onPointerDown: (e: React.PointerEvent) => { unlock?.(); if (!enabled()) return; drag.current = { id: e.pointerId, x: e.clientX, y0: e.clientY, y: e.clientY, mouse: e.pointerType === 'mouse' }; },
    onPointerMove: (e: React.PointerEvent) => { const d = drag.current; if (!d || d.id !== e.pointerId) return; live.yaw += (e.clientX - d.x) * 0.005; if (d.mouse) live.pitch = THREE.MathUtils.clamp(live.pitch + (e.clientY - d.y) * 0.004, -1, 0.9); else live.input = THREE.MathUtils.clamp(-(e.clientY - d.y0) / 70, -1, 1); d.x = e.clientX; d.y = e.clientY; },
    onPointerUp: (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) { if (!drag.current.mouse) live.input = 0; drag.current = null; } },
  };
}

/* ---------- birinci şahıs kamera adımı (useFrame içinde çağrılır) ---------- */
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
export interface CamState { step: number; bob: number; head: number }
/** live.s'yi ilerletir, kamerayı rotaya koyar; adım sesi için true döner */
export function stepWalk(camera: THREE.Camera, live: Live, cs: CamState, route: { ROUTE_LEN: number; routeAt: (s: number) => { p: V3; dir: [number, number] } }, dt: number, canWalk: boolean, speed = 3.4, eye = 1.65): boolean {
  const back = Math.cos(live.yaw) < 0 ? -1 : 1, want = canWalk ? live.input * speed * back : 0;
  live.v += (want - live.v) * (1 - Math.exp(-dt * 5));
  const before = live.s; live.s = Math.max(0, Math.min(route.ROUTE_LEN, live.s + live.v * dt)); const moved = Math.abs(live.s - before), R = route.routeAt(live.s);
  cs.step += moved; cs.bob += moved * 2.2; let stepped = false; if (cs.step > 0.78) { cs.step = 0; stepped = true; }
  const hd = Math.atan2(-R.dir[0], -R.dir[1]); if (Number.isNaN(cs.head)) cs.head = hd; cs.head += wrapA(hd - cs.head) * (1 - Math.exp(-dt * 3));
  _e.set(live.pitch - 0.05, cs.head + live.yaw, 0); camera.quaternion.setFromEuler(_e);
  camera.position.set(R.p[0], R.p[1] + eye + Math.sin(cs.bob) * 0.03 * Math.min(1, Math.abs(live.v) / 2), R.p[2]);
  return stepped;
}

/* ---------- arayüz parçaları ---------- */
export interface Source { title: string; url: string }
const stop = (e: React.PointerEvent) => e.stopPropagation();
export function TopBar({ onExit, children }: { onExit: () => void; children?: ReactNode }) {
  return <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start gap-2 p-3" onPointerDown={stop}>
    <button onClick={onExit} className="pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black/45 text-white" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>{children}</div>;
}
export function InfoCard({ kicker, title, text, source, onClose, accent = 'text-amber-300' }: { kicker: string; title: string; text: string; source: Source; onClose: () => void; accent?: string }) {
  return (
    <div className="absolute inset-x-3 bottom-14 z-40 mx-auto max-w-lg sm:bottom-6 sm:left-auto sm:right-6 sm:mx-0" onPointerDown={stop}>
      <div className="max-h-[52vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#1f1a17]/90 p-5 text-white shadow-2xl backdrop-blur">
        <div className="flex items-start gap-2"><div><p className={`text-[11px] font-semibold uppercase tracking-wider ${accent}`}>{kicker}</p><h2 className="text-xl font-bold">{title}</h2></div>
          <button onClick={onClose} className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10" aria-label="Kapat"><X size={18} /></button></div>
        <p className="mt-2 text-sm leading-relaxed text-white/85">{text}</p>
        <a href={source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-white/60 underline">{source.title} <ExternalLink size={12} /></a>
      </div>
    </div>
  );
}
export function TitleCard({ kicker, title, children, note, cta, icon, onStart }: { kicker: string; title: string; children: ReactNode; note: string; cta: string; icon: ReactNode; onStart: () => void }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-40 p-4 text-white sm:p-8" onPointerDown={stop}>
      <div className="mx-auto max-w-xl rounded-2xl bg-black/60 p-5 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">{kicker}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h1>
        <div className="mt-2 text-sm text-white/85">{children}</div>
        <p className="mt-1 text-[11px] text-white/45">{note}</p>
        <button onClick={onStart} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 font-semibold text-black">{icon} {cta}</button>
      </div>
    </div>
  );
}
export function EndCard({ kicker, title, text, onStay, onExit }: { kicker: string; title: string; text: string; onStay: () => void; onExit: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/25 p-5" onPointerDown={stop}>
      <div className="w-full max-w-md rounded-3xl bg-[#f6efe2] p-6 text-center text-ink shadow-2xl">
        <p className="text-sm font-semibold text-amber-700">{kicker}</p><h2 className="mt-1 text-2xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{text}</p>
        <div className="mt-5 flex gap-2"><button onClick={onStay} className="h-11 flex-1 rounded-xl border border-line font-semibold">Gezmeye devam</button><button onClick={onExit} className="h-11 flex-1 rounded-xl bg-brand font-semibold text-white">Haritaya dön</button></div>
      </div>
    </div>
  );
}
export function Hint({ children }: { children: ReactNode }) {
  return <p className="pointer-events-none absolute bottom-6 left-1/2 z-20 w-max max-w-[92vw] -translate-x-1/2 rounded-full bg-black/40 px-4 py-1.5 text-center text-xs text-white">{children}</p>;
}
/** WebGL yoksa: Vikipedi fotoğrafı + noktaların metinleri */
export function WikiFallback({ wiki, alt, items, onExit, speak }: { wiki: string; alt: string; items: { name: string; text: string }[]; onExit: () => void; speak: (t: string) => void }) {
  const [img, setImg] = useState<string | null>(null), [i, setI] = useState(0);
  useEffect(() => { fetch(`https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wiki)}`).then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, [wiki]);
  const s = items[i];
  return (
    <div className="fixed inset-0 bg-[#2a2016] text-white">
      {img && <img src={img} alt={alt} className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <h2 className="mt-1 text-lg font-bold">{s.name}</h2><p className="mt-1 text-sm">{s.text}</p>
        <div className="mt-3 flex gap-2"><button onClick={() => speak(s.text)} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button><button onClick={() => setI((i + 1) % items.length)} className="h-10 rounded-lg bg-amber-300 px-4 text-sm font-semibold text-black">Sonraki</button></div>
      </div>
    </div>
  );
}

/* ---------- gezinme: sağ kenar düğmeleri ve durak listesi (Ani, İshak Paşa) ---------- */
export function NavRail({ onNext, onPrev, onTurn, onList, nextDisabled, prevDisabled, listLabel = 'Durak listesi' }: { onNext: () => void; onPrev: () => void; onTurn: () => void; onList: () => void; nextDisabled: boolean; prevDisabled: boolean; listLabel?: string }) {
  const B = ({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) => <button onClick={onClick} disabled={disabled} title={label} aria-label={label} className={`grid h-11 w-11 place-items-center rounded-full text-white shadow ${disabled ? 'bg-black/20 text-white/40' : 'bg-black/50 active:scale-95'}`}>{children}</button>;
  return <div className="absolute right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2" onPointerDown={stop}>
    <B label="Sonraki durak" disabled={nextDisabled} onClick={onNext}><ChevronRight size={20} /></B>
    <B label="Önceki durağa dön" disabled={prevDisabled} onClick={onPrev}><ChevronLeft size={20} /></B>
    <B label="Arkanı dön" onClick={onTurn}><Undo2 size={18} /></B>
    <B label={listLabel} onClick={onList}><BookOpen size={18} /></B>
  </div>;
}
export function StopList({ title, items, doneLabel, todoLabel, onGo, onRead, onRestart, onClose }: { title: string; items: { id: string; name: string; done: boolean }[]; doneLabel: string; todoLabel: string; onGo: (i: number) => void; onRead: (i: number) => void; onRestart: () => void; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/30 p-4" onPointerDown={stop}>
      <div className="max-h-[86vh] w-full max-w-md overflow-y-auto rounded-3xl bg-[#f6efe2] p-5 text-ink shadow-2xl">
        <div className="flex items-center gap-2"><BookOpen size={18} className="text-amber-700" /><h2 className="text-lg font-bold">{title} · {items.filter((x) => x.done).length}/{items.length}</h2>
          <button onClick={onClose} className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-black/5" aria-label="Listeyi kapat"><X size={18} /></button></div>
        <ol className="mt-3 space-y-2">{items.map((x, i) => (
          <li key={x.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${x.done ? 'bg-amber-300 text-black' : 'bg-slate-100 text-slate-500'}`}>{x.done ? <Check size={16} /> : i + 1}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{x.name}</p><p className="text-xs text-slate-500">{x.done ? doneLabel : todoLabel}</p></div>
            {x.done && <button onClick={() => onRead(i)} className="h-9 rounded-lg border border-line px-3 text-xs font-semibold">Oku</button>}
            <button onClick={() => onGo(i)} className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand px-3 text-xs font-semibold text-white"><MapPin size={12} /> Git</button>
          </li>))}</ol>
        <button onClick={onRestart} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line font-semibold"><RotateCcw size={16} /> Baştan başla</button>
      </div>
    </div>
  );
}
