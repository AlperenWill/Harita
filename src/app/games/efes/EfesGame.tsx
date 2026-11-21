/**
 * Efes — "Zaman Penceresi". Ana yönetici.
 *
 * Oyuncu antik kentin ziyaretçi yolunu yukarıdan aşağı yürür: Odeon → Kuretler Caddesi (Trajan Çeşmesi, Hadrian Tapınağı,
 * Yamaç Evler) → Celsus Kütüphanesi → Mermer Cadde → Büyük Tiyatro → Arkadiane ve antik liman.
 * KAMERA: birinci şahıs, rotaya kilitli (yalnız ileri/geri: W/S ya da dikey sürükleme), bakış serbest (fare / yatay sürükleme / ←→).
 *   Arkana dönüp ileri basarsan geldiğin yöne yürürsün. Yokuşta bakış eğime uyar. (Zil Kale ile aynı, denenmiş kontrol şeması.)
 * ZAMAN PENCERESİ: yedi noktaya yaklaşınca yapı bugünkü harabe hâlinden Roma dönemindeki sağlam hâline çözülerek dönüşür; caddelerin
 *   sütunları da ayağa kalkar. Kaynaklı bir kart açılır. Arkadiane'nin sonunda bugünkü tarlaların yerine antik liman ve deniz belirir.
 * DOKUNMATİK: tek parmak sürükleme = yürü (dikey) + bak (yatay); çift dokunuş = henüz görülmemiş sıradaki pencereye git.
 * Öteki oyunlarla tutarlılık: ?q=low|medium|high, ?debug (__efes), pil tasarrufu, tr-TR sesli okuma, WebGL yoksa Vikipedi fotoğraflı yedek.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Controls, GameMenu, Hint, HudTheme, InfoSheet, StartSheet, EndSheet, TopRow, Objective } from '../shared/hud/Hud';
import { useSettings } from '../shared/hud/settings';
import { ChevronsRight, Footprints, MousePointer2 } from 'lucide-react';
import { ArrowLeft, Hourglass, Landmark } from 'lucide-react';
import { ODEON, ROUTE_LEN, THEATRE, WINDOWS, nextUnseen, routeAt, type Window } from './site';
import { Celsus, Colonnades, Ground, Hadrian, Harbor, Terrace, Theatre, Trajan, Trees, useMats, type U } from './EfesScene';
import { activated, morphTarget, stepMorph } from '../zilkale/HistoryLayerMorphing';
import { speakTr } from '../shared/voice';
import { LOOK_PITCH, LOOK_YAW, LookCrosshair, useMouseLook } from '../shared/mouseLook';
import { Polish, SkyEnvironment } from '../shared/Polish';

type Tier = 'low' | 'medium' | 'high';
const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const pinned = (() => { const q = new URLSearchParams(location.search).get('q'); return q === 'low' || q === 'medium' || q === 'high' ? (q as Tier) : null; })();
function detectTier(): Tier {
  if (pinned) return pinned;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low';
  return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high';
}
const WALK = 3.5, EYE = 1.65;

/* ---------- ses (Web Audio, sentez): ağustos böcekleri, rüzgâr, mermerde ayak sesi, pencere tınısı ---------- */
class EfesAudio {
  private ctx: AudioContext | null = null; private master: GainNode | null = null; private noise: AudioBuffer | null = null; muted = false;
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC()); this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7; this.master.connect(ctx.destination);
    const n = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, n, ctx.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    // ağustos böceği: yüksek bant gürültü, hızlı genlik titreşimi (≈ 40 Hz) + yavaş kabarma
    const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = 5;
    const am = ctx.createGain(); am.gain.value = 0; const lfo = ctx.createOscillator(); lfo.frequency.value = 42; const lg = ctx.createGain(); lg.gain.value = 0.05; lfo.connect(lg).connect(am.gain);
    const swell = ctx.createOscillator(); swell.frequency.value = 0.08; const sg = ctx.createGain(); sg.gain.value = 0.03; swell.connect(sg).connect(am.gain);
    s.connect(f).connect(am).connect(this.master); s.start(); lfo.start(); swell.start();
    const w = ctx.createBufferSource(); w.buffer = this.noise; w.loop = true; const wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 420; const wg = ctx.createGain(); wg.gain.value = 0.05; w.connect(wf).connect(wg).connect(this.master); w.start(0.7);
  }
  step() { const ctx = this.ctx; if (!ctx || !this.noise || !this.master || this.muted) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = this.noise; const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 1400; g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07); s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + 0.08); }
  chime() { const ctx = this.ctx; if (!ctx || !this.master || this.muted) return; const t = ctx.currentTime; [523.3, 659.3, 784].forEach((fr, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = fr; g.gain.setValueAtTime(0, t + i * 0.12); g.gain.linearRampToValueAtTime(0.08, t + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 1.6); o.connect(g).connect(this.master!); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 1.7); }); }
  setMuted(m: boolean) { this.muted = m; if (m) this.hush(); if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.2); }
  speak(text: string) { if (!this.muted) speakTr(text, { gender: 'any' }); }
  hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  dispose() { this.hush(); void this.ctx?.close(); this.ctx = null; this.master = null; }
}
const audio = new EfesAudio();

/* ---------- durum ---------- */
interface S { started: boolean; seen: string[]; card: Window | null; muted: boolean; tts: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, seen: [] as string[], card: null, endShown: false };
const useDb = create<S>((set) => ({ ...INITIAL, muted: false, tts: true, set: (p) => set(p) }));
const pause = { on: false };   // ≡ menü açıkken oyun durur
const live = { s: 0, v: 0, input: 0, yaw: 0, pitch: -0.04, goal: null as number | null, morph: {} as Record<string, number> };
const U: U = Object.fromEntries([...WINDOWS.map((w) => w.id), 'all'].map((k) => [k, { value: 0 }]));

export default function EfesGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}

function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier), [saver, setSaver] = useState(() => location.search.includes('saver'));
  const look = useMouseLook((dx, dy) => { live.yaw -= dx * LOOK_YAW; live.pitch = THREE.MathUtils.clamp(live.pitch - dy * LOOK_PITCH, -1, 0.9); }, () => { const s = useDb.getState(); return s.started && !s.card; });
  const S = useDb();
  const keys = useRef(new Set<string>()), drag = useRef<{ id: number; x: number; y0: number; y: number; mouse: boolean } | null>(null), lastTap = useRef(0);
  useEffect(() => {
    type B = EventTarget & { level: number; charging: boolean }; let b: B | null = null; const check = () => b && setSaver(b.level < 0.2 && !b.charging);
    (navigator as Navigator & { getBattery?: () => Promise<B> }).getBattery?.().then((x) => { b = x; check(); x.addEventListener('levelchange', check); x.addEventListener('chargingchange', check); }).catch(() => {});
    return () => { b?.removeEventListener('levelchange', check); b?.removeEventListener('chargingchange', check); };
  }, []);
  const G = useSettings(); useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useDb.setState(INITIAL); Object.assign(live, { s: 0, v: 0, input: 0, yaw: 0, pitch: -0.04, goal: null, morph: {} }); for (const k in U) U[k].value = 0; }, []);
  const close = useCallback(() => { useDb.getState().set({ card: null }); audio.hush(); }, []);
  const goNext = useCallback(() => { const w = nextUnseen(live.s, useDb.getState().seen); if (w) live.goal = w.s; }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); const s = useDb.getState(); if (!s.started || e.repeat) return; if ((e.code === 'Escape' || e.code === 'KeyE') && s.card) close(); if (e.code === 'KeyN') goNext(); };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0, last = performance.now();
    const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; const k = keys.current;
      const kb = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0); if (!drag.current || drag.current.mouse) live.input = kb;
      void dt; raf = requestAnimationFrame(loop); };   // kamera klavyeyle çevrilmez: fareyle (imleç kilidi) ya da sürüklemeyle bakılır
    raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); };
  }, [close, goNext]);
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __efes: unknown }).__efes = { go: (s: number) => { live.s = s; live.goal = null; useDb.getState().set({ started: true }); }, look: (y: number, p = 0) => { live.yaw = y; live.pitch = p; }, state: () => ({ ...useDb.getState(), s: live.s, morph: { ...live.morph } }), WINDOWS, ROUTE_LEN }; }, []);

  const onDown = (e: React.PointerEvent) => { audio.unlock(); look.lock(e); if (!useDb.getState().started) return; const now = performance.now(); if (now - lastTap.current < 300) goNext(); lastTap.current = now; drag.current = { id: e.pointerId, x: e.clientX, y0: e.clientY, y: e.clientY, mouse: e.pointerType === 'mouse' }; };
  const onMove = (e: React.PointerEvent) => { const d = drag.current; if (!d || d.id !== e.pointerId) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY; live.yaw += dx * 0.005;
    if (d.mouse) live.pitch = THREE.MathUtils.clamp(live.pitch + dy * 0.004, -1, 0.9); else { live.input = THREE.MathUtils.clamp(-(e.clientY - d.y0) / 70, -1, 1); if (Math.abs(live.input) > 0.1) live.goal = null; } };
  const onUp = (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) { if (!drag.current.mouse) live.input = 0; drag.current = null; } };
  const start = () => { audio.unlock(); S.set({ started: true }); };
  const atEnd = useAtEnd();

  const nextW = WINDOWS.find((w) => !S.seen.includes(w.id));
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#cfe3ee] text-white" style={{ touchAction: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <HudTheme theme={THEME}>
      <LookCrosshair locked={look.locked} />
      <Canvas dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high', powerPreference: 'high-performance' }} camera={{ fov: 62, near: 0.1, far: 900, position: [110, 20, 20] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}><World tier={tier} saver={saver} /><SkyEnvironment sky={'#cfe3ee'} sun={'#fff2dc'} ground={'#c9b88e'} sunDir={[0.8, 0.6, 0.4]} /><Polish tier={tier} saver={saver} /></Suspense>
      </Canvas>

      <TopRow onExit={onExit} objective={S.started ? <Objective icon={<Hourglass size={15} />} label={nextW ? `Sıradaki: ${nextW.name}` : 'Bütün pencereler açıldı'} done={S.seen.length} total={WINDOWS.length} /> : undefined} right={<GameMenu onPause={(v) => { pause.on = v; }} help={<Controls items={CONTROLS} />} onExit={onExit} />} />
      {S.started && !S.card && <Hint>Dikey sürükle: yürü · yatay: bak · çift dokun: sıradaki pencere<span className="hidden [@media(pointer:fine)]:inline"> · W/S · tıkla, fareyle bak (Esc: bırak) · N</span></Hint>}
      {S.card && <Card w={S.card} onClose={close} />}
      {!S.started && <TitleCard onExit={onExit} onStart={start} />}
      {S.started && atEnd && S.seen.length === WINDOWS.length && !S.endShown && !S.card && <EndCard onStay={() => S.set({ endShown: true })} onExit={onExit} />}
      </HudTheme>
    </div>
  );
}
function useAtEnd() { const [e, setE] = useState(false); useEffect(() => { const id = setInterval(() => setE(live.s > ROUTE_LEN - 12), 500); return () => clearInterval(id); }, []); return e; }

/* ---------- 3B dünya ---------- */
function World({ tier, saver }: { tier: Tier; saver: boolean }) {
  const M = useMats(U, saver);
  return (
    <group>
      <Sky sunPosition={[120, 70, 60]} turbidity={6} rayleigh={1.2} mieCoefficient={0.004} mieDirectionalG={0.85} />
      <fog attach="fog" args={['#d9e4ea', 160, 620]} />
      <hemisphereLight args={['#eaf2f8', '#b8a678', 1.0]} />
      <directionalLight position={[120, 90, 60]} intensity={2.2} color="#fff2dc" />
      <ambientLight intensity={0.2} />
      <Ground />
      <Trees n={tier === 'low' ? 40 : tier === 'medium' ? 90 : 160} />
      <Colonnades M={M} />
      <Celsus M={M} />
      <Hadrian M={M} />
      <Trajan M={M} />
      <Terrace M={M} />
      <Theatre M={M} at={[ODEON.x, ODEON.z]} r={ODEON.r} rows={10} low={6} id="odeon" stage={14} />
      <Theatre M={M} at={[THEATRE.x, THEATRE.z]} r={THEATRE.r} rows={26} low={14} id="tiyatro" stage={40} />
      <Harbor M={M} u={U.arkadiane} />
      <Controller saver={saver} />
    </group>
  );
}

const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _l = new THREE.Vector3();
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
function Controller({ saver }: { saver: boolean }) {
  const { camera } = useThree();
  const st = useRef({ step: 0, bob: 0, grade: 0, head: NaN });
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useDb.getState();
    const back = Math.cos(live.yaw) < 0 ? -1 : 1;
    let want = S.started && !pause.on ? live.input * WALK * back : 0;
    if (live.goal !== null) { const d = live.goal - live.s; if (Math.abs(d) < 0.3) live.goal = null; else want = Math.sign(d) * Math.min(WALK * 1.4, Math.abs(d) * 1.5 + 0.8); }
    live.v += (want - live.v) * (1 - Math.exp(-dt * 5));
    const before = live.s; live.s = Math.max(0, Math.min(ROUTE_LEN, live.s + live.v * dt)); const moved = live.s - before, R = routeAt(live.s);
    st.current.step += Math.abs(moved); if (st.current.step > 0.8) { st.current.step = 0; audio.step(); } st.current.bob += Math.abs(moved) * 2.2;
    // zaman pencereleri
    let all = 0;
    for (const w of WINDOWS) { const prev = live.morph[w.id] ?? 0, tg = S.started ? morphTarget(live.s, w) : 0, next = saver ? (tg > 0.5 ? 1 : 0) : stepMorph(prev, tg, dt); live.morph[w.id] = next; U[w.id].value = next; all = Math.max(all, next);
      if (activated(prev, next) && S.started) { audio.chime(); const s2 = useDb.getState(); s2.set({ card: w, seen: s2.seen.includes(w.id) ? s2.seen : [...s2.seen, w.id] }); if (s2.tts) audio.speak(`${w.name}. ${w.then}`); }
      if (S.card?.id === w.id && tg === 0 && next < 0.4) S.set({ card: null }); }
    U.all.value = all;
    // kamera
    const hd = Math.atan2(-R.dir[0], -R.dir[1]); if (Number.isNaN(st.current.head)) st.current.head = hd; st.current.head += wrapA(hd - st.current.head) * (1 - Math.exp(-dt * 3));
    const grade = (routeAt(live.s + 2).p[1] - routeAt(live.s - 2).p[1]) / 4; st.current.grade += (Math.atan(grade) * 0.55 - st.current.grade) * (1 - Math.exp(-dt * 2));
    if (!S.started) { camera.position.set(118, 24, 26); camera.quaternion.copy(_q.setFromRotationMatrix(_m.lookAt(camera.position, _l.set(20, 2, -30), THREE.Object3D.DEFAULT_UP))); return; }
    _e.set(live.pitch + st.current.grade, st.current.head + live.yaw, 0); camera.quaternion.setFromEuler(_e);
    camera.position.set(R.p[0], R.p[1] + EYE + Math.sin(st.current.bob) * 0.035 * Math.min(1, Math.abs(live.v) / 2), R.p[2]);
  });
  return null;
}

/* ---------- arayüz ---------- */
function Card({ w, onClose }: { w: Window; onClose: () => void }) {
  return <InfoSheet kicker={`Zaman penceresi · ${w.era}`} title={w.name} text={<><p><span className="font-semibold text-[#1f1b17]">Bugün: </span>{w.now}</p><p><span className="font-semibold text-[#1f1b17]">O zaman: </span>{w.then}</p></>} source={w.source} onClose={onClose} />;
}
const THEME = { accent: '#b98a3e' };
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Dikey sürükle ya da W/S: ileri/geri</> },
  { icon: <MousePointer2 size={16} />, text: <>yatay sürükle ya da fare: etrafa bak</> },
  { icon: <ChevronsRight size={16} />, text: <>çift dokun: sıradaki pencereye git</> },
];
function TitleCard({ onStart, onExit }: { onStart: () => void; onExit?: () => void }) {
  return <StartSheet kicker="İzmir · Selçuk · UNESCO Dünya Mirası" title="Efes: Zaman Penceresi" intro={<>Antik kentin mermer caddelerinden aşağı yürü. Odeon’dan Celsus Kütüphanesi’ne, oradan Büyük Tiyatro’ya ve limana. Yedi noktada zaman penceresi açılır: yıkık yapılar Roma dönemindeki hâline döner.</>} controls={CONTROLS} note="Plan stilizedir, mesafeler kısaltılmıştır. Yapıların “sağlam hâli” bir canlandırmadır." cta="Kente gir" ctaIcon={<Landmark size={18} />} onStart={onStart} onExit={onExit} />;
}
function EndCard({ onStay, onExit, onRestart }: { onStay: () => void; onExit: () => void; onRestart?: () => void }) {
  return <EndSheet kicker="Bütün pencereler açıldı" title="Efes’in iki yüzü" text="Odeon’dan limana, kentin bugününü ve Roma dönemini yan yana gördün. Deniz bugün kilometrelerce uzakta." stayLabel="Gezmeye devam" onStay={onStay} onExit={onExit} onRestart={onRestart} />;
}
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null), [i, setI] = useState(0);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Efes').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  const w = WINDOWS[i];
  return (
    <div className="fixed inset-0 bg-[#2a2219] text-white">
      {img && <img src={img} alt="Efes" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <p className="mt-1 text-[11px] font-semibold uppercase text-amber-300">{w.era}</p><h2 className="text-lg font-bold">{w.name}</h2><p className="mt-1 text-sm">{w.then}</p>
        <div className="mt-3 flex gap-2"><button onClick={() => audio.speak(w.then)} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button><button onClick={() => setI((i + 1) % WINDOWS.length)} className="h-10 rounded-lg bg-amber-300 px-4 text-sm font-semibold text-black">Sonraki</button></div>
      </div>
    </div>
  );
}
