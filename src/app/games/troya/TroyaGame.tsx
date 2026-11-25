/**
 * Troya — "Dokuz Kent". Ana yönetici.
 *
 * Ören yerinin ziyaretçi yolunda yürü: girişteki tahta at (modern kopya) → Troya VI surları → Troya II megaronları ve rampası →
 * Schliemann yarması (duvarlarında üst üste binen kentlerin renkli bantları) → Athena Tapınağı (Troya VIII) → Odeon (Troya IX).
 * BİLMECE: her yapının yanında “İncele (E)” çıkar; basınca “Bu yapı hangi katmana ait?” sorusu açılır (kendiliğinden açılmaz);
 *   doğru katmanı seçince kart açılır, katman cetvelinde işaretlenir.
 * KAMERA: birinci şahıs, rotaya kilitli (W/S ya da dikey sürükleme), bakış serbest (Efes, Pamukkale ile aynı şema).
 * Öteki oyunlarla tutarlılık: ?q=, ?debug (__troya), tr-TR sesli okuma, WebGL yoksa Vikipedi fotoğraflı yedek.
 */
import { freePos, walkFree } from '../shared/route';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Controls, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, StartSheet, EndSheet, TopRow, Objective } from '../shared/hud/Hud';
import { useSettings } from '../shared/hud/settings';
import { Footprints, Info, MousePointer2 } from 'lucide-react';
import { ArrowLeft, Layers, Pickaxe, Search } from 'lucide-react';
import { LAYERS, ROUTE_LEN, STOPS, isCorrect, nearStop, routeAt, type Stop } from './site';
import { Grass, Horizon, Horse, Megaron, Odeon, Rubble, SUN_DIR, Signs, Temple, Terrain, Trees, Trench, Walls, useMats } from './TroyaModels';
import { Clouds, Sun } from '../shared/scenery';
import { speakTr } from '../shared/voice';
import { LOOK_PITCH, LOOK_YAW, LookCrosshair, useMouseLook } from '../shared/mouseLook';
import { Polish, SkyEnvironment } from '../shared/Polish';

type Tier = 'low' | 'medium' | 'high';
const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const pinned = (() => { const q = new URLSearchParams(location.search).get('q'); return q === 'low' || q === 'medium' || q === 'high' ? (q as Tier) : null; })();
function detectTier(): Tier { if (pinned) return pinned; const nav = navigator as Navigator & { deviceMemory?: number }; if ((nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low'; return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high'; }
const WALK = 3.4, EYE = 1.65;

/* ---------- ses: rüzgâr (Çanakkale rüzgârı), toprak adım, doğru/yanlış tını ---------- */
class TroyaAudio {
  private ctx: AudioContext | null = null; private master: GainNode | null = null; private noise: AudioBuffer | null = null; muted = false;
  unlock() { if (this.ctx) { void this.ctx.resume(); return; } const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC()); this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7; this.master.connect(ctx.destination);
    const n = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, n, ctx.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.7; const g = ctx.createGain(); g.gain.value = 0.09; const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11; const lg = ctx.createGain(); lg.gain.value = 0.05; lfo.connect(lg).connect(g.gain); s.connect(f).connect(g).connect(this.master); s.start(); lfo.start(); }
  step() { const ctx = this.ctx; if (!ctx || !this.noise || !this.master || this.muted) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = this.noise; const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.frequency.value = 700; g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1); s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + 0.12); }
  tone(ok: boolean) { const ctx = this.ctx; if (!ctx || !this.master || this.muted) return; const t = ctx.currentTime; (ok ? [523.3, 659.3, 784] : [220, 185]).forEach((fr, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = ok ? 'triangle' : 'sine'; o.frequency.value = fr; g.gain.setValueAtTime(0, t + i * 0.1); g.gain.linearRampToValueAtTime(0.08, t + i * 0.1 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + (ok ? 1.2 : 0.4)); o.connect(g).connect(this.master!); o.start(t + i * 0.1); o.stop(t + i * 0.1 + 1.3); }); }
  setMuted(m: boolean) { this.muted = m; if (m) this.hush(); if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.2); }
  speak(t: string) { if (!this.muted) speakTr(t); }
  hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  dispose() { this.hush(); void this.ctx?.close(); this.ctx = null; this.master = null; }
}
const audio = new TroyaAudio();

/* ---------- durum ---------- */
interface S { started: boolean; solved: string[]; quiz: Stop | null; wrong: string | null; card: Stop | null; near: Stop | null; muted: boolean; tts: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, solved: [] as string[], quiz: null, wrong: null, card: null, near: null, endShown: false };
const useDb = create<S>((set) => ({ ...INITIAL, muted: false, tts: true, set: (p) => set(p) }));
const pause = { on: false };   // ≡ menü açıkken oyun durur
const live = { s: 0, v: 0, input: 0, o: 0, strafe: 0, yaw: 0, pitch: 0 };

export default function TroyaGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}
function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier), S = useDb();
  const look = useMouseLook((dx, dy) => { live.yaw -= dx * LOOK_YAW; live.pitch = THREE.MathUtils.clamp(live.pitch - dy * LOOK_PITCH, -1, 0.9); }, () => { const s = useDb.getState(); return s.started && !s.card && !s.quiz; });
  const keys = useRef(new Set<string>()), drag = useRef<{ id: number; x: number; y0: number; y: number; mouse: boolean } | null>(null);
  const G = useSettings(); useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useDb.setState(INITIAL); Object.assign(live, { s: 0, v: 0, input: 0, yaw: 0, pitch: 0 }); }, []);
  const close = useCallback(() => { useDb.getState().set({ card: null }); audio.hush(); }, []);
  /** Oyuncu isteyince: bilmeceli durakta soru, öbüründe bilgi kartı */
  const inspect = useCallback(() => { const s = useDb.getState(), sp = s.near; if (!sp || s.card || s.quiz) return;
    if (sp.answer && !s.solved.includes(sp.id)) s.set({ quiz: sp, wrong: null });
    else { s.set({ card: sp, solved: s.solved.includes(sp.id) ? s.solved : [...s.solved, sp.id] }); if (useSettings.getState().tts) audio.speak(`${sp.name}. ${sp.text}`); } }, []);
  const answer = useCallback((pick: string) => { const s = useDb.getState(), q = s.quiz; if (!q) return;
    if (isCorrect(q, pick)) { audio.tone(true); s.set({ quiz: null, wrong: null, card: q, solved: [...s.solved, q.id] }); if (useSettings.getState().tts) audio.speak(`${q.name}. ${q.text}`); }
    else { audio.tone(false); const L = LAYERS.find((l) => l.n === pick); s.set({ wrong: `${pick} değil: Troya ${pick} ${L?.era ?? ''}. Yapının malzemesine ve biçimine bir daha bak.` }); } }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); const s = useDb.getState(); if (e.repeat) return; if ((e.code === 'Escape' || e.code === 'KeyE') && s.card) close(); else if (e.code === 'Escape' && s.quiz) { e.preventDefault(); s.set({ quiz: null, wrong: null }); } else if (e.code === 'KeyE' && s.started && !s.quiz) inspect();
      if (s.quiz && /^Digit[1-3]$/.test(e.code)) answer(s.quiz.options[Number(e.code.slice(5)) - 1]); };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0, last = performance.now();
    const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; const k = keys.current; const kb = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0); if (!drag.current || drag.current.mouse) live.input = kb; live.strafe = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      void dt; raf = requestAnimationFrame(loop); };   // kamera klavyeyle çevrilmez: fareyle (imleç kilidi) ya da sürüklemeyle bakılır
    raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); };
  }, [close, answer, inspect]);
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __troya: unknown }).__troya = { go: (s: number) => { live.s = s; useDb.getState().set({ started: true }); }, look: (y: number, p = 0) => { live.yaw = y; live.pitch = p; }, answer, state: () => ({ ...useDb.getState(), s: live.s }), STOPS, ROUTE_LEN, routeAt }; }, [answer]);
  const onDown = (e: React.PointerEvent) => { audio.unlock(); look.lock(e); if (!useDb.getState().started) return; drag.current = { id: e.pointerId, x: e.clientX, y0: e.clientY, y: e.clientY, mouse: e.pointerType === 'mouse' }; };
  const onMove = (e: React.PointerEvent) => { const d = drag.current; if (!d || d.id !== e.pointerId || d.mouse) return; live.yaw += (e.clientX - d.x) * 0.005; if (d.mouse) live.pitch = THREE.MathUtils.clamp(live.pitch + (e.clientY - d.y) * 0.004, -1, 0.9); else live.input = THREE.MathUtils.clamp(-(e.clientY - d.y0) / 70, -1, 1); d.x = e.clientX; d.y = e.clientY; };
  const onUp = (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) { if (!drag.current.mouse) live.input = 0; drag.current = null; } };
  const quizzes = STOPS.filter((s) => s.answer);
  const nextQ = quizzes.find((q) => !S.solved.includes(q.id));

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#dfe7ec] text-white" style={{ touchAction: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <HudTheme theme={THEME}>
      <LookCrosshair locked={look.locked} />
      <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }} camera={{ fov: 62, near: 0.1, far: 1500, position: [120, 20, 110] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}><World tier={tier} /><SkyEnvironment sky={'#dfe7ec'} sun={'#fff2df'} ground={'#a99a6c'} sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} /><Polish tier={tier} /></Suspense>
      </Canvas>
      <TopRow onExit={onExit} objective={S.started ? <Objective icon={<Layers size={15} />} label={nextQ ? `Sıradaki: ${nextQ.name}` : 'Katman cetveli tamam'} done={S.solved.filter((id) => quizzes.some((q) => q.id === id)).length} total={quizzes.length} /> : undefined} right={<GameMenu onPause={(v) => { pause.on = v; }} help={<Controls items={CONTROLS} />} onExit={onExit} />} />
      {S.started && !S.card && !S.quiz && <Hint>Dikey sürükle: yürü · yatay: bak<span className="hidden [@media(pointer:fine)]:inline"> · WASD · fareyle sürükle: bak · 1/2/3: cevap</span></Hint>}
      {S.started && S.near && !S.card && !S.quiz && <InteractPrompt icon={<Search size={18} />} label={`${S.near.answer && !S.solved.includes(S.near.id) ? 'Bilmece' : 'İncele'}: ${S.near.name}`} onClick={inspect} muted={S.solved.includes(S.near.id)} />}
      {S.quiz && <Quiz q={S.quiz} wrong={S.wrong} onPick={answer} />}
      {S.card && <Card s={S.card} onClose={close} />}
      {!S.started && <TitleCard onExit={onExit} onStart={() => { audio.unlock(); S.set({ started: true }); }} />}
      {S.started && !nextQ && !S.endShown && !S.card && <EndCard onStay={() => S.set({ endShown: true })} onExit={onExit} />}
      </HudTheme>
    </div>
  );
}

/* ---------- 3B dünya (modeller: TroyaModels.tsx) ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null);
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.3; }, [scene]);   // ortam yansıması gölgeleri silmesin
  // gölge: noCast işaretli gruplar (arazi, ot, ufuk) gölge düşürmez; her şey gölge alır
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3.5} rayleigh={1.6} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#d9e3ea', 320, 1800]} />
      <hemisphereLight args={['#d6e4ef', '#7a6c4c', 0.35]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={6.5} color="#ffe6c4" />
      {tier !== 'low' && <Clouds />}
      <Terrain tier={tier} />
      <Horizon />
      <Trench m={m} /><Horse m={m} /><Walls m={m} /><Megaron m={m} /><Temple m={m} /><Odeon m={m} />
      <Signs m={m} />
      <Rubble n={tier === 'low' ? 120 : 320} />
      <Trees n={tier === 'low' ? 70 : tier === 'medium' ? 140 : 220} />
      {tier !== 'low' && <Grass n={tier === 'high' ? 9000 : 4500} />}
      <Controller />
    </group>
  );
}

/* ---------- hareket + kamera ---------- */
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _m = new THREE.Matrix4(), _l = new THREE.Vector3(), _q = new THREE.Quaternion();
function Controller() {
  const { camera } = useThree(), st = useRef({ step: 0, bob: 0, head: NaN, stop: '' });
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useDb.getState();
    const moved = walkFree(live, st.current, routeAt, ROUTE_LEN, dt, WALK, 3, S.started && !S.card && !S.quiz && !pause.on), P = freePos(routeAt, live.s, live.o);
    st.current.step += Math.abs(moved); if (st.current.step > 0.78) { st.current.step = 0; audio.step(); } st.current.bob += Math.abs(moved) * 2.2;
    const sp = S.started ? nearStop(live.s) : null;
    if ((sp?.id ?? '') !== st.current.stop) { st.current.stop = sp?.id ?? ''; S.set(sp ? { near: sp } : { near: null, quiz: null, wrong: null, card: null }); }   // yaklaşınca yalnızca "İncele" çıkar; uzaklaşınca açık kart/bilmece kapanır
    
    if (!S.started) { camera.position.set(110, 22, 100); camera.quaternion.copy(_q.setFromRotationMatrix(_m.lookAt(camera.position, _l.set(20, 4, 0), THREE.Object3D.DEFAULT_UP))); return; }
    _e.set(live.pitch - 0.05, st.current.head + live.yaw, 0); camera.quaternion.setFromEuler(_e);
    camera.position.set(P[0], P[1] + EYE + Math.sin(st.current.bob) * 0.03 * Math.min(1, Math.abs(live.v) / 2), P[2]);
  });
  return null;
}

/* ---------- arayüz ---------- */
function Quiz({ q, wrong, onPick }: { q: Stop; wrong: string | null; onPick: (p: string) => void }) {
  return (
    <div className="absolute inset-x-3 bottom-14 z-40 mx-auto max-w-md sm:bottom-6" onPointerDown={(e) => e.stopPropagation()}>
      <div className="rounded-2xl bg-[#f7f5f1] p-5 shadow-[0_18px_50px_rgba(31,27,23,0.25)] ring-1 ring-black/5 text-[#1f1b17]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a8782c]">Katman bilmecesi</p>
        <h2 className="text-lg font-bold">{q.name}: hangi Troya?</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">{q.options.map((o, i) => { const L = LAYERS.find((l) => l.n === o)!; return <button key={o} onClick={() => onPick(o)} className="rounded-xl px-2 py-2.5 text-center font-bold text-black active:scale-95" style={{ background: L.color }}>Troya {o}<span className="block text-[10px] font-medium opacity-75">{L.era}</span><span className="hidden text-[10px] opacity-60 [@media(pointer:fine)]:block">{i + 1}</span></button>; })}</div>
        {wrong && <p className="mt-2 text-xs text-[#a8782c]">{wrong}</p>}
      </div>
    </div>
  );
}
function Card({ s, onClose }: { s: Stop; onClose: () => void }) {
  return <InfoSheet kicker={`${s.answer ? `Troya ${s.answer} · $${LAYERS.find((l) => l.n === s.answer)!.era}` : 'Giriş'}`} title={s.name} text={s.text} source={s.source} onClose={onClose} />;
}
const THEME = { accent: '#b07a3c' };
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Dikey sürükle ya da WASD: bakılan yöne yürü (yolun çevresinde serbest)</> },
  { icon: <MousePointer2 size={16} />, text: <>yatay sürükle ya da fare: etrafa bak</> },
  { icon: <Info size={16} />, text: <>yapının yanında <b>E</b> / İncele: bilmeceyi aç, doğru katmanı seç</> },
];
function TitleCard({ onStart, onExit }: { onStart: () => void; onExit?: () => void }) {
  return <StartSheet kicker="Çanakkale · Hisarlık · UNESCO Dünya Mirası" title="Troya: Dokuz Kent" intro={<>Troya tek bir kent değil: yaklaşık 4.000 yıl boyunca aynı tepede üst üste kurulmuş dokuz kent. Ören yerini gez, her yapının hangi katmana ait olduğunu bul ve katman cetvelini doldur.</>} controls={CONTROLS} note="Plan stilizedir. Katman tarihleri yaklaşıktır, kaynaklara göre değişir." cta="Ören yerine gir" ctaIcon={<Pickaxe size={18} />} onStart={onStart} onExit={onExit} />;
}
function EndCard({ onStay, onExit, onRestart }: { onStay: () => void; onExit: () => void; onRestart?: () => void }) {
  return <EndSheet kicker="Katman cetveli tamam" title="Dokuz kentin izinde" text="Troya I’in duvarlarından Roma odeonuna kadar, aynı tepede binlerce yıl üst üste kurulmuş kentleri ayırt ettin." stayLabel="Gezmeye devam" onStay={onStay} onExit={onExit} onRestart={onRestart} />;
}
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null), [i, setI] = useState(0);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Truva').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  const s = STOPS[i];
  return (
    <div className="fixed inset-0 bg-[#2a2016] text-white">
      {img && <img src={img} alt="Troya" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <h2 className="mt-1 text-lg font-bold">{s.name}</h2><p className="mt-1 text-sm">{s.text}</p>
        <div className="mt-3 flex gap-2"><button onClick={() => audio.speak(s.text)} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button><button onClick={() => setI((i + 1) % STOPS.length)} className="h-10 rounded-lg bg-amber-300 px-4 text-sm font-semibold text-black">Sonraki</button></div>
      </div>
    </div>
  );
}
