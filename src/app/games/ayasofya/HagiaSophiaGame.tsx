/**
 * Ayasofya — "Işığın ve Taşın Dansı": serbest yürüyüş + rehber. Ana oyun yöneticisi.
 *
 * Oyuncu avludan nartekse, kubbenin altına, apsise ve rampadan güney galeriye serbestçe yürür (joystick / WASD); kamera üçüncü
 * şahıstan izler, sürükleyerek çevrilir, duvarların ve galeri döşemesinin içine girmez. Rehber Elif Hoca (kurgusal sanat tarihçisi)
 * on duraklık turu yönetir: durağa yürür, bekler, oyuncu yanına gelince anlatır (yazı + isteğe bağlı sesli okuma); rampadan birlikte geçer.
 * Yakındaki ilgi noktaları "İncele" ile kart açar; kamera hedefe döner ve uzaktaki hedeflerde görüş açısı daralır (dürbün etkisi).
 * Göz uyumu korunur: karanlık narteksten nefe geçince pozlama bir süre yüksek kalır → göz kamaşır, sonra uyum sağlar.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { Effect, ToneMappingMode } from 'postprocessing';
import { animated, useTransition } from '@react-spring/web';
import { create } from 'zustand';
import { ArrowLeft, Captions, CaptionsOff, DoorOpen, ExternalLink, Footprints, Music, Search, Settings2, Sun, Volume2, VolumeX, X } from 'lucide-react';
import { Character, newRig, type Palette } from '../kiz-kulesi/NPCController';
import { keys, readKeys, walk } from '../kiz-kulesi/input';
import { Joystick } from '../shared/Joystick';
import { Crowd, type Walker } from '../shared/Crowd';
import { EXPOSURE, POIS, adapt, inspectFov, sunVector, zoneAt, type Poi, type Zone } from './hagia';
import {
  EXTRAS, GUIDE, LEVEL_Y, START, STOP_RADIUS, TOUR, camClear, ceiling, eye3, guideGoal, guideStep, nearestDoor, nearestPoi, poiLevel, slide, walkable,
  type Door, type Level, type Role, type V2,
} from './walk';
import { Atmosphere, Columns, Furnishings, Galleries, GodRays, Lighting, Mosaics, Shell, Windows, type Tier } from './HagiaScene';
import { Outside } from './Outside';
import { setMarbleRes } from './materials';
import { hagiaAudio } from './AudioManager';

/* ---------- cihaz ve uyarlanabilir kalite ---------- */
const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const pinned = (() => { const q = new URLSearchParams(location.search).get('q'); return q === 'low' || q === 'medium' || q === 'high' ? (q as Tier) : null; })();
function detectTier(): Tier {
  if (pinned) return pinned;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low';
  try { const gl = document.createElement('canvas').getContext('webgl'), ext = gl?.getExtension('WEBGL_debug_renderer_info'), gpu = ext ? String(gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''; if (/Mali-[4T]|Adreno \(TM\) [1-5]\d\d|PowerVR|SwiftShader|llvmpipe/i.test(gpu)) return 'low'; } catch { /* bilgi yok */ }
  return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high';
}
/** Kademe → ayarlar. Pil tasarrufu: huzmeler ve dinamik gölge kapanır, statik aydınlatma kalır. */
function profile(tier: Tier, saver: boolean) {
  const t: Tier = saver ? 'low' : tier;
  return { tier: t, low: t === 'low', shadows: t !== 'low', rays: !saver, motes: t !== 'low', tesserae: t !== 'low', bloom: t !== 'low', ao: t === 'high',
    dpr: (t === 'low' ? 1 : t === 'medium' ? [1, 1.5] : [1, 2]) as number | [number, number], antialias: t === 'high' };
}
type Prof = ReturnType<typeof profile>;
/** Pozlama efekti: ton eşlemeden önce sahne rengini çarpar (göz uyumu) */
class ExposureEffect extends Effect {
  constructor() { super('Exposure', 'uniform float uExposure; void mainImage(const in vec4 i, const in vec2 uv, out vec4 o) { o = vec4(i.rgb * uExposure, i.a); }', { uniforms: new Map([['uExposure', new THREE.Uniform(1)]]) }); }
}

/* ---------- figürler ---------- */
export const ELIF: Palette = { skin: '#e0b28e', hair: '#3a2416', top: '#3f5f7f', pants: '#2b2f3a', shoes: '#5a3a26', kaftan: '#3f5f7f', trim: '#e9c46a', hat: 'yemeni', hatColor: '#7a2e3a' };
const VISITOR: Palette = { skin: '#c99272', hair: '#151515', top: '#2f8f83', pants: '#3a3a42', shoes: '#e9e6df' };
const ROLE: Record<Role, Palette[]> = {
  ziyaretci: [
    { skin: '#e2b48d', hair: '#3b2a20', top: '#b8483e', pants: '#2b3445', shoes: '#efe9df' },
    { skin: '#c48c66', hair: '#1f1510', top: '#f0ead8', topStripe: '#2b4a7a', pants: '#4a4a52', shoes: '#3a2a20' },
    { skin: '#e6c7a8', hair: '#6b4a2a', top: '#6b8f5a', pants: '#2a2a30', shoes: '#c9c3b8', kaftan: '#6b8f5a', hat: 'yemeni', hatColor: '#c2588a' },
    { skin: '#a9764f', hair: '#120c08', top: '#e8c35a', pants: '#3a4a63', shoes: '#efe9df' },
    { skin: '#d9b594', hair: '#2a1b12', top: '#4d5a7a', pants: '#6b5a46', shoes: '#2a2018', kaftan: '#4d5a7a', hat: 'yemeni', hatColor: '#e8e0d0' },
  ],
  gorevli: [{ skin: '#c99272', hair: '#151515', top: '#23262e', pants: '#23262e', shoes: '#151515' }],
  imam: [{ skin: '#d6a47e', hair: '#2b1f18', top: '#f2eee4', pants: '#f2eee4', shoes: '#3a2a20', kaftan: '#f2eee4', sash: '#2c5a4a', hat: 'sarik', hatColor: '#ffffff', beard: '#3b2b22' }],
};

/* ---------- durum ---------- */
interface Talk { lines: string[]; i: number; t0: number; onDone?: () => void }
interface S {
  started: boolean; level: Level; zone: Zone; stop: number; told: string[]; talk: Talk | null; card: Poi | null; seen: string[];
  prompt: { door: Door | null; poi: Poi | null }; muted: boolean; tts: boolean; music: boolean; fade: boolean; done: boolean; endShown: boolean; hour: number; panel: boolean;
  set: (p: Partial<S>) => void;
}
const INITIAL = { started: false, level: START.level, zone: 'avlu' as Zone, stop: 0, told: [] as string[], talk: null, card: null, seen: [] as string[], prompt: { door: null, poi: null }, fade: false, done: false, endShown: false };
const useAya = create<S>((set) => ({ ...INITIAL, muted: false, tts: true, music: false, hour: 10.5, panel: false, set: (p) => set(p) }));
const live = {
  player: newRig(START.at[0], START.at[1], START.yaw), guide: newRig(START.at[0] + 4, START.at[1] + 1.6, START.yaw),
  cam: { yaw: START.yaw, pitch: 0.3, dist: 5, drag: 0 }, goal: null as V2 | null,
};
function resetLive() { Object.assign(live.player, newRig(START.at[0], START.at[1], START.yaw)); Object.assign(live.guide, newRig(START.at[0] + 4, START.at[1] + 1.6, START.yaw)); Object.assign(live.cam, { yaw: START.yaw, pitch: 0.3, dist: 5, drag: 0 }); live.goal = null; }
const CPS = 40, lineTime = (s: string) => s.length / CPS + 1.6 + s.length * 0.03;
function say(lines: string[], onDone?: () => void) { useAya.getState().set({ talk: { lines, i: 0, t0: performance.now(), onDone } }); if (useAya.getState().tts) hagiaAudio.speak(lines[0]); }
function advance() {
  const s = useAya.getState(), t = s.talk; if (!t) return;
  const el = (performance.now() - t.t0) / 1000, line = t.lines[t.i];
  if (el < line.length / CPS) { s.set({ talk: { ...t, t0: performance.now() - (line.length / CPS) * 1000 - 1 } }); return; }
  if (t.i + 1 < t.lines.length) { s.set({ talk: { ...t, i: t.i + 1, t0: performance.now() } }); if (s.tts) hagiaAudio.speak(t.lines[t.i + 1]); return; }
  s.set({ talk: null }); hagiaAudio.hush(); t.onDone?.();
}

export default function HagiaSophiaGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}

function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier);
  const [saver, setSaver] = useState(false);
  const prof = useMemo(() => profile(tier, saver), [tier, saver]);
  useMemo(() => setMarbleRes(prof.tier === 'low' ? 512 : 1024), [prof.tier]);
  const [stage, setStage] = useState(0);            // aşamalı yükleme: 0 kabuk, 1 sütun/galeri, 2 ayrıntı
  const S = useAya();
  const exposure = useMemo(() => new ExposureEffect(), []);
  const stick = useRef({ x: 0, y: 0 });

  useEffect(() => {
    type B = EventTarget & { level: number; charging: boolean }; let b: B | null = null;
    const check = () => b && setSaver(b.level < 0.2 && !b.charging);
    (navigator as Navigator & { getBattery?: () => Promise<B> }).getBattery?.().then((x) => { b = x; check(); x.addEventListener('levelchange', check); x.addEventListener('chargingchange', check); }).catch(() => {});
    return () => { b?.removeEventListener('levelchange', check); b?.removeEventListener('chargingchange', check); };
  }, []);
  useEffect(() => { if (stage >= 2) return; const id = setTimeout(() => setStage((s) => s + 1), 350); return () => clearTimeout(id); }, [stage]);
  useEffect(() => { hagiaAudio.setMuted(S.muted); }, [S.muted]);
  useEffect(() => { hagiaAudio.setMusic(S.music); }, [S.music]);
  useEffect(() => { hagiaAudio.setZone(S.zone); }, [S.zone]);
  useEffect(() => () => { hagiaAudio.dispose(); useAya.setState(INITIAL); resetLive(); }, []);

  const enter = useCallback((d: Door) => {
    const st = useAya.getState(); if (st.fade) return;
    st.set({ fade: true, card: null }); hagiaAudio.hush();
    setTimeout(() => {
      const p = live.player, g = live.guide, fx = -Math.sin(d.yaw), fz = -Math.cos(d.yaw);
      p.x = d.spawn[0]; p.z = d.spawn[1]; p.y = g.y = LEVEL_Y[d.to]; p.yaw = d.yaw; p.speed = 0;
      const cand: V2[] = [[d.spawn[0] - fz * 1.1 - fx * 0.6, d.spawn[1] + fx * 1.1 - fz * 0.6], [d.spawn[0] + fz * 1.1 - fx * 0.6, d.spawn[1] - fx * 1.1 - fz * 0.6], [d.spawn[0] - fx * 1.2, d.spawn[1] - fz * 1.2]];
      const ok = cand.find((c) => walkable(d.to, c[0], c[1])) ?? ([...d.spawn] as V2); g.x = ok[0]; g.z = ok[1]; g.yaw = d.yaw;
      Object.assign(live.cam, { yaw: d.yaw, pitch: 0.25, dist: 4 });
      useAya.getState().set({ level: d.to });
      setTimeout(() => useAya.getState().set({ fade: false }), 250);
    }, 450);
  }, []);
  const inspect = useCallback((p: Poi) => { const s = useAya.getState(); s.set({ card: p, seen: s.seen.includes(p.id) ? s.seen : [...s.seen, p.id] }); hagiaAudio.chime(); if (s.tts && !s.talk) hagiaAudio.speak(p.text); }, []);
  const closeCard = useCallback(() => { useAya.getState().set({ card: null }); hagiaAudio.hush(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useAya.getState(); if (!s.started || e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') { if (s.talk) advance(); else if (s.card) closeCard(); }
      if (e.code === 'KeyE') { if (s.talk) advance(); else if (s.card) closeCard(); else if (s.prompt.door) enter(s.prompt.door); else if (s.prompt.poi) inspect(s.prompt.poi); }
      if (e.code === 'KeyF') { if (s.card) closeCard(); else if (s.prompt.poi) inspect(s.prompt.poi); }
      if (e.code === 'Escape' && s.card) closeCard();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0; const loop = () => { readKeys(stick.current); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); keys.clear(); };
  }, [enter, inspect, closeCard]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __aya: unknown }).__aya = {
      tp: (level: Level, x: number, z: number, yaw = 0, pitch = 0.3, dist = 5) => { const p = live.player, g = live.guide; p.x = x; p.z = z; p.yaw = yaw; p.y = g.y = LEVEL_Y[level]; g.x = x + 1.2; g.z = z + 1; Object.assign(live.cam, { yaw, pitch, dist, drag: 3 }); useAya.getState().set({ level, started: true, talk: null }); },
      stop: (i: number) => useAya.getState().set({ stop: i, told: TOUR.slice(0, i).map((s) => s.id) }),
      inspect: (id: string) => { const p = POIS.find((x) => x.id === id); if (p) inspect(p); },
      hour: (h: number) => useAya.getState().set({ hour: h }),
      state: () => ({ ...useAya.getState(), player: { ...live.player }, guide: { ...live.guide } }),
    };
  }, [inspect]);

  // sürükle: bak · tekerlek / iki parmak: yakınlaş
  const ptr = useRef(new Map<number, { x: number; y: number }>()), pinch = useRef<number | null>(null);
  const onDown = (e: React.PointerEvent) => { hagiaAudio.unlock(); ptr.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); };
  const onMove = (e: React.PointerEvent) => {
    const p = ptr.current.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; ptr.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptr.current.size === 2) { const [a, b] = [...ptr.current.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch.current) live.cam.dist = THREE.MathUtils.clamp(live.cam.dist * (pinch.current / d), 1.6, 9); pinch.current = d; return; }
    if (useAya.getState().card) return;
    live.cam.yaw -= dx * 0.006; live.cam.pitch = THREE.MathUtils.clamp(live.cam.pitch + dy * 0.004, -0.6, 1.25); live.cam.drag = 1.5;
  };
  const onUp = (e: React.PointerEvent) => { ptr.current.delete(e.pointerId); if (ptr.current.size < 2) pinch.current = null; };
  const onWheel = (e: React.WheelEvent) => { live.cam.dist = THREE.MathUtils.clamp(live.cam.dist * (1 + Math.sign(e.deltaY) * 0.1), 1.6, 9); };
  const start = () => { hagiaAudio.unlock(); hagiaAudio.setZone('avlu'); S.set({ started: true }); };
  const hh = Math.floor(S.hour), mm = S.hour % 1 ? '30' : '00';

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#0d0906] text-white" style={{ touchAction: 'none' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp} onWheel={onWheel}>
      <Canvas shadows={prof.shadows} dpr={prof.dpr} gl={{ antialias: prof.antialias, powerPreference: 'high-performance' }}
        camera={{ fov: 60, near: 0.1, far: 900, position: [-120, 14, 30] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = EXPOSURE.avlu; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}>
          <World prof={prof} stage={stage} exposure={exposure} />
          {prof.bloom && (
            <EffectComposer multisampling={0} enableNormalPass={prof.ao}>
              {prof.ao ? <N8AO aoRadius={2.2} intensity={2.4} distanceFalloff={1.2} halfRes /> : <></>}
              <Bloom mipmapBlur luminanceThreshold={1.05} luminanceSmoothing={0.25} intensity={prof.tier === 'high' ? 0.75 : 0.5} />
              <primitive object={exposure} />
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              <Vignette darkness={0.5} offset={0.28} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>

      {/* üst çubuk */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={onExit} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/55" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
        <button onClick={() => { hagiaAudio.unlock(); S.set({ muted: !S.muted }); }} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/55" aria-label={S.muted ? 'Sesi aç' : 'Sesi kapat'}>{S.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <button onClick={() => { S.set({ tts: !S.tts }); if (S.tts) hagiaAudio.hush(); }} className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-full ${S.tts ? 'bg-amber-500 text-black' : 'bg-black/55'}`} aria-label={S.tts ? 'Sesli okumayı kapat' : 'Sesli okumayı aç'} aria-pressed={S.tts}>{S.tts ? <Captions size={18} /> : <CaptionsOff size={18} />}</button>
        <button onClick={() => S.set({ panel: !S.panel })} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/55" aria-label="Işık ve ayarlar" aria-expanded={S.panel}><Settings2 size={18} /></button>
        {S.started && (
          <div className="mx-auto flex flex-col items-center gap-1 rounded-2xl bg-black/55 px-3 py-2">
            <div className="flex gap-1">{TOUR.map((t, i) => <span key={t.id} className={`h-1.5 w-3 rounded-full sm:w-6 ${S.told.includes(t.id) ? 'bg-amber-300' : i === S.stop ? 'bg-white' : 'bg-white/25'}`} />)}</div>
            <p className="text-xs">{ZONE_LABEL[S.zone]} · Keşif {S.seen.length}/{POIS.length} · <Sun size={11} className="-mt-0.5 inline" /> {hh}:{mm}</p>
          </div>
        )}
      </div>
      {S.panel && (
        <div className="absolute left-3 top-16 z-40 w-80 max-w-[calc(100%-1.5rem)] rounded-2xl bg-black/85 p-4 text-sm" onPointerDown={(e) => e.stopPropagation()}>
          <label htmlFor="hr" className="block font-semibold">Günün saati: {hh}:{mm}</label>
          <input id="hr" type="range" min={7} max={18.5} step={0.5} value={S.hour} onChange={(e) => S.set({ hour: Number(e.target.value) })} className="mt-2 w-full accent-amber-400" />
          <p className="mt-1 text-xs text-white/60">Güneş ekinoks gününe göre hesaplanır; huzmeler pencerelerden o saatin açısıyla girer.</p>
          <button onClick={() => { hagiaAudio.unlock(); S.set({ music: !S.music }); }} aria-pressed={S.music} className={`mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg ${S.music ? 'bg-amber-500 text-black' : 'bg-white/15'}`}><Music size={16} /> Ortam müziği (sentez): {S.music ? 'açık' : 'kapalı'}</button>
          <p className="mt-3 text-xs text-white/60">Kalite: {prof.tier}{saver ? ' · pil tasarrufu' : ''} — {prof.bloom ? 'bloom' : 'efekt yok'}{prof.ao ? ' + AO' : ''}{prof.shadows ? ' · gölge' : ''}{prof.rays ? ' · huzme' : ''}</p>
          {!pinned && <div className="mt-2 flex gap-1">{(['low', 'medium', 'high'] as Tier[]).map((t) => <button key={t} onClick={() => setTier(t)} className={`h-9 flex-1 rounded-lg text-xs ${tier === t ? 'bg-white text-black' : 'bg-white/15'}`}>{t}</button>)}</div>}
        </div>
      )}

      {S.started && (
        <>
          <Joystick stick={stick} onTouch={() => hagiaAudio.unlock()} />
          <Prompts enter={enter} inspect={inspect} />
          {!S.talk && !S.card && <Hint text={hintText(S)} />}
        </>
      )}
      <DialogueBox />
      <InfoCard poi={S.card} onClose={closeCard} />
      {S.card && <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_200px_70px_rgba(0,0,0,.7)]" />}
      {!S.started && <StartCard stage={stage} onEnter={start} />}
      {S.done && !S.endShown && !S.talk && <EndCard onStay={() => S.set({ endShown: true })} onExit={onExit} />}
      <div className={`pointer-events-none absolute inset-0 z-50 bg-black transition-opacity duration-300 ${S.fade ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
    </div>
  );
}
const ZONE_LABEL: Record<Zone, string> = { avlu: 'Avlu', narteks: 'Narteks', nef: 'Ana nef', apsis: 'Mihrap önü', galeri: 'Üst galeri' };
function hintText(S: S) {
  if (S.done) return 'Dilediğin gibi dolaş';
  const g = guideGoal(S.level, S.stop);
  return g.door ? `${GUIDE.name} rampada bekliyor: ${g.door.label}` : `${GUIDE.name}’nın yanına yürü`;
}

/* ---------- 3B dünya ---------- */
function World({ prof, stage, exposure }: { prof: Prof; stage: number; exposure: ExposureEffect }) {
  const started = useAya((s) => s.started), zone = useAya((s) => s.zone), hour = useAya((s) => s.hour);
  const outside = zone === 'avlu';
  const playerRef = useRef({ x: live.player.x, y: 0, z: live.player.z });
  const pRig = useMemo(() => ({ current: live.player }), []), gRig = useMemo(() => ({ current: live.guide }), []);
  const crowd = useMemo<Walker[]>(() => EXTRAS.filter((e) => !prof.low || !e.minTier).map((e, i) => ({ ...e, y: LEVEL_Y[e.level], palette: ROLE[e.role][i % ROLE[e.role].length] })), [prof.low]);
  const { camera } = useThree();
  useFrame(({ clock }) => {   // başlık ekranı: avlunun üstünden süzülen kamera
    if (started) return; const a = clock.elapsedTime * 0.035;
    camera.position.set(-112 + Math.sin(a) * 10, 16 + Math.sin(a * 0.7) * 2, 34 + Math.cos(a) * 8); camera.lookAt(-20, 26, 0);
  });
  return (
    <group>
      <Atmosphere outside={outside} />
      {outside && <Sky sunPosition={new THREE.Vector3(...sunVector(hour)).multiplyScalar(1000).toArray()} turbidity={5} rayleigh={1.5} mieCoefficient={0.004} mieDirectionalG={0.82} distance={800} />}
      <Lighting hour={hour} shadows={prof.shadows && !outside} focus={zone === 'apsis' ? 1 : 0.15} outside={false} />
      {outside && <OutdoorSun hour={hour} shadows={prof.shadows} />}
      <Outside hi={prof.tier === 'high'} low={prof.low} />
      <Shell tier={prof.tier} detail={prof.tesserae} />
      <Windows hour={hour} />
      {stage >= 1 && <><Columns tier={prof.tier} /><Galleries /></>}
      {stage >= 2 && <><Mosaics detail={prof.tesserae} tier={prof.tier} /><Furnishings tier={prof.tier} /><GodRays hour={hour} enabled={prof.rays && !outside} motes={prof.motes} /></>}
      <Crowd list={crowd} player={playerRef} />
      <Character rig={pRig} palette={VISITOR} castShadow={prof.shadows} />
      <Character rig={gRig} palette={ELIF} castShadow={prof.shadows} />
      <GoalMarker />
      {started && <Controller playerRef={playerRef} exposure={exposure} composer={prof.bloom} />}
    </group>
  );
}
/** Avluda gölgeli güneş: oyuncuyu izler (gölge çözünürlüğü yakında harcanır) */
function OutdoorSun({ hour, shadows }: { hour: number; shadows: boolean }) {
  const ref = useRef<THREE.DirectionalLight>(null!), s = sunVector(hour), day = Math.max(0, Math.min(1, s[1] * 4));
  useFrame(() => { const l = ref.current, p = live.player; l.position.set(p.x + s[0] * 90, Math.max(20, s[1] * 90), p.z + s[2] * 90); l.target.position.set(p.x, 0, p.z); l.target.updateMatrixWorld(); });
  return (
    <>
      <directionalLight ref={ref} intensity={1.4 + day * 1.8} color="#fff0da" castShadow={shadows} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.04}
        shadow-camera-left={-55} shadow-camera-right={55} shadow-camera-top={55} shadow-camera-bottom={-55} shadow-camera-near={5} shadow-camera-far={260} />
      <hemisphereLight args={['#dce9f5', '#8a7a5c', 0.5]} />
    </>
  );
}
function GoalMarker() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const g = live.goal, r = ref.current, s0 = useAya.getState(); r.visible = !!g && s0.started && !s0.done && !s0.talk; if (!g) return;
    r.position.set(g[0], LEVEL_Y[s0.level] + 0.06, g[1]); const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.08; r.scale.set(s, s, s);
  });
  return <mesh ref={ref} rotation-x={-Math.PI / 2}><ringGeometry args={[0.55, 0.7, 40]} /><meshBasicMaterial color={new THREE.Color('#ffd27a').multiplyScalar(2)} toneMapped={false} transparent opacity={0.8} /></mesh>;
}

const _t = new THREE.Vector3(), _c = new THREE.Vector3(), _look = new THREE.Vector3(), _lk = new THREE.Vector3(), _pt = new THREE.Vector3();
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
function Controller({ playerRef, exposure, composer }: { playerRef: React.MutableRefObject<{ x: number; y: number; z: number }>; exposure: ExposureEffect; composer: boolean }) {
  const { camera, gl } = useThree();
  const lookAt = useRef(new THREE.Vector3(live.player.x, 1.5, live.player.z)), camPos = useRef(camera.position.clone());
  const st = useRef({ key: '', zone: '' as Zone | '', exp: EXPOSURE.avlu, fov: 60, step: 0 });
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05), S = useAya.getState(), lv = S.level, p = live.player, g = live.guide, cam = live.cam, t = clock.elapsedTime, Y0 = LEVEL_Y[lv];
    const frozen = S.fade || !!S.card;

    /* oyuncu */
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    const mx = fx * -walk.y + rx * walk.x, mz = fz * -walk.y + rz * walk.x, ml = Math.hypot(mx, mz);
    const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 5.2 : 3.5) * Math.min(1, ml);
    if (!frozen && ml > 0.08) {
      const [nx, nz] = slide(lv, [p.x, p.z], (mx / ml) * speed * dt, (mz / ml) * speed * dt), moved = Math.hypot(nx - p.x, nz - p.z);
      p.speed = dt > 0 ? moved / dt : 0; p.x = nx; p.z = nz; p.yaw += wrap(Math.atan2(-mx, -mz) - p.yaw) * (1 - Math.exp(-dt * 12));
      st.current.step += moved; if (st.current.step > 0.75) { st.current.step = 0; hagiaAudio.footstep(); }
      if (cam.drag <= 0 && Math.abs(walk.x) < 0.5 && walk.y < -0.3) cam.yaw += wrap(p.yaw - cam.yaw) * (1 - Math.exp(-dt * 0.8));
    } else p.speed = 0;
    cam.drag -= dt; p.y = g.y = Y0;
    playerRef.current.x = p.x; playerRef.current.y = Y0; playerRef.current.z = p.z;

    /* rehber */
    if (!S.done && TOUR[S.stop].skipOn === lv) S.set({ stop: S.stop + 1, told: [...S.told, TOUR[S.stop].id] });   // geçiş durağı: oyuncu zaten geçmiş
    const pd = Math.hypot(p.x - g.x, p.z - g.z);
    const goal: V2 | null = S.done ? (pd > 3.2 ? [p.x, p.z] : null) : guideGoal(lv, S.stop).at;
    live.goal = S.done ? null : goal;
    const gg = goal ? Math.hypot(goal[0] - g.x, goal[1] - g.z) : 0, pg = goal ? Math.hypot(goal[0] - p.x, goal[1] - p.z) : 0;
    const waitForPlayer = !S.done && pd > 12 && gg < pg;
    if (goal && !S.talk && !waitForPlayer && gg > 0.4) {
      const step = guideStep(lv, [g.x, g.z], goal, dt, S.done ? Math.min(4.6, 1.4 + pd * 0.6) : pd < 3 ? 2.6 : 3.3);
      g.speed = dt > 0 ? step.moved / dt : 0; g.x = step.p[0]; g.z = step.p[1]; if (step.yaw !== null) g.yaw += wrap(step.yaw - g.yaw) * (1 - Math.exp(-dt * 10));
    } else { g.speed = 0; g.yaw += wrap(Math.atan2(-(p.x - g.x), -(p.z - g.z)) - g.yaw) * (1 - Math.exp(-dt * 4)); }
    if (S.done && pd > 30) { g.x = p.x; g.z = p.z; }
    g.look = pd < 9 ? _look.set(p.x, Y0 + 1.6, p.z) : null;
    if (!S.done && !S.talk && !S.fade && !S.card) {
      const stp = TOUR[S.stop], at = stp.level === lv && Math.hypot(stp.at[0] - g.x, stp.at[1] - g.z) < 0.6;
      if (at && pd < STOP_RADIUS && !S.told.includes(stp.id)) {
        g.point = _pt.set(...stp.look); const idx = S.stop;
        say(stp.lines, () => { const s2 = useAya.getState(), told = [...s2.told, stp.id]; live.guide.point = null; if (idx + 1 >= TOUR.length) s2.set({ told, done: true }); else s2.set({ told, stop: idx + 1 }); });
      }
    }
    const tk = useAya.getState().talk;
    if (tk) { const el = (performance.now() - tk.t0) / 1000; g.talking = true; g.mouth = el < tk.lines[tk.i].length / CPS + 0.2 ? Math.max(0, Math.sin(t * 15) * 0.55 + Math.sin(t * 9.7) * 0.35) : 0; if (tk.i > 0) g.point = null; if (el > lineTime(tk.lines[tk.i])) advance(); }
    else { g.talking = false; g.mouth = 0; }

    /* yakındaki rampa / ilgi noktası */
    const door = frozen ? null : nearestDoor(lv, p.x, p.z), poi = frozen ? null : nearestPoi(lv, p.x, p.z), k = `${door?.id ?? ''}|${poi?.id ?? ''}`;
    if (k !== st.current.key) { st.current.key = k; S.set({ prompt: { door, poi } }); }

    /* kamera */
    const card = S.card && poiLevel(S.card) === lv ? S.card : null, headY = Y0 + 1.6;
    _t.set(p.x, headY, p.z);
    let fov = 60, blocked = false;
    if (card) {
      // hedefe dön; göz oyuncunun başında, uzak hedefte görüş açısı daralır
      const dx = card.pos[0] - p.x, dz = card.pos[2] - p.z;
      if (Math.hypot(dx, dz) > 0.5) cam.yaw += wrap(Math.atan2(-dx, -dz) - cam.yaw) * (1 - Math.exp(-dt * 3));
      _c.set(p.x + Math.sin(cam.yaw) * 0.6, headY + 0.15, p.z + Math.cos(cam.yaw) * 0.6); _lk.set(card.pos[0] + 0.01, card.pos[1], card.pos[2]);
      fov = inspectFov(_c.distanceTo(_lk), card.radius) * 1.15;
    } else {
      const D = cam.dist, cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      _c.set(p.x + Math.sin(cam.yaw) * cp * D, headY + sp * D, p.z + Math.cos(cam.yaw) * cp * D);
      const n = Math.ceil(D / 0.2); let ok = 0;
      for (let i = 1; i <= n; i++) { const f = i / n; if (!camClear(lv, p.x + (_c.x - p.x) * f, p.z + (_c.z - p.z) * f)) break; ok = f; }
      if (ok < 1) { blocked = true; const f = Math.max(0.12, ok - 0.06); _c.set(p.x + (_c.x - p.x) * f, headY + (_c.y - headY) * f, p.z + (_c.z - p.z) * f); }
      _c.y = Math.max(Y0 + 0.35, Math.min(_c.y, Y0 + ceiling(lv, _c.x, _c.z) - 0.3));
      // yukarı bakınca (eğim < 0) bakış noktası yükselir: kubbeyi görmek için
      _lk.copy(_t); if (cam.pitch < 0) _lk.y += -cam.pitch * 14;
      if (S.talk && pd < 6) _lk.lerp(_look.set(g.x, Y0 + 1.5, g.z), 0.35);
    }
    const kk = 1 - Math.exp(-dt * (card ? 3 : 10));
    // duvar araya girince kamera yumuşatılmadan içeri alınır: aksi hâlde yumuşak geçiş sırasında duvarın içinden görünür
    if (camPos.current.distanceTo(_c) > 25) { camPos.current.copy(_c); lookAt.current.copy(_lk); } else { if (blocked && _c.distanceTo(_t) < camPos.current.distanceTo(_t)) camPos.current.copy(_c); else camPos.current.lerp(_c, kk); lookAt.current.lerp(_lk, kk); }
    camera.position.copy(camPos.current); camera.lookAt(lookAt.current);
    const pc = camera as THREE.PerspectiveCamera; st.current.fov += (fov - st.current.fov) * (1 - Math.exp(-dt * 2.5)); if (Math.abs(pc.fov - st.current.fov) > 0.02) { pc.fov = st.current.fov; pc.updateProjectionMatrix(); }

    /* bölge + göz uyumu */
    const z = zoneAt(eye3(lv, p.x, p.z)); if (z !== st.current.zone) { st.current.zone = z; S.set({ zone: z }); }
    st.current.exp = adapt(st.current.exp, EXPOSURE[z], dt);
    if (composer) { exposure.uniforms.get('uExposure')!.value = st.current.exp; gl.toneMappingExposure = 1; } else gl.toneMappingExposure = st.current.exp;
  });
  return null;
}

/* ---------- arayüz ---------- */
function Prompts({ enter, inspect }: { enter: (d: Door) => void; inspect: (p: Poi) => void }) {
  const prompt = useAya((s) => s.prompt), talk = useAya((s) => !!s.talk), card = useAya((s) => !!s.card), seen = useAya((s) => s.seen);
  if (card) return null;
  return (
    <div className={`absolute right-4 z-40 flex flex-col items-end gap-2 ${talk ? 'bottom-40' : 'bottom-24 sm:bottom-28'}`} onPointerDown={(e) => e.stopPropagation()}>
      {prompt.poi && (
        <button onClick={() => inspect(prompt.poi!)} className={`flex h-12 max-w-[62vw] items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-lg ${seen.includes(prompt.poi.id) ? 'bg-black/60' : 'bg-amber-400 text-black'}`}>
          <Search size={18} className="shrink-0" /><span className="truncate">İncele: {prompt.poi.name}</span><span className="hidden opacity-70 [@media(pointer:fine)]:inline">· F</span>
        </button>
      )}
      {prompt.door && (
        <button onClick={() => enter(prompt.door!)} className="flex h-14 max-w-[62vw] items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-ink shadow-xl">
          <DoorOpen size={20} className="shrink-0" /><span className="truncate">{prompt.door.label}</span><span className="hidden opacity-60 [@media(pointer:fine)]:inline">· E</span>
        </button>
      )}
    </div>
  );
}
function DialogueBox() {
  const talk = useAya((s) => s.talk);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!talk) return; let raf = 0;
    const loop = () => { const t = useAya.getState().talk; if (!t) return; setN(Math.floor(((performance.now() - t.t0) / 1000) * CPS)); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [talk]);
  if (!talk) return null;
  const line = talk.lines[talk.i];
  return (
    <div className="absolute inset-x-3 bottom-3 z-40 mx-auto max-w-2xl sm:bottom-6" onPointerDown={(e) => { e.stopPropagation(); advance(); }}>
      <div className="rounded-2xl border border-amber-200/20 bg-[#140f0a]/85 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-black">{GUIDE.name}</span>
          <span className="text-[11px] text-white/50">{GUIDE.role}</span>
          <span className="ml-auto text-[11px] text-white/40">{talk.i + 1}/{talk.lines.length} · dokun: geç</span>
        </div>
        <p className="mt-2 min-h-[3rem] text-[15px] leading-relaxed sm:text-base">{line.slice(0, n)}<span className="opacity-0">{line.slice(n)}</span></p>
      </div>
    </div>
  );
}
function Hint({ text }: { text: string }) {
  return <p className="pointer-events-none absolute bottom-6 left-1/2 z-30 max-w-[60vw] -translate-x-1/2 rounded-full bg-black/45 px-4 py-1.5 text-center text-xs backdrop-blur sm:text-sm">{text}<span className="hidden [@media(pointer:fine)]:inline"> · WASD yürü · sürükle: bak</span></p>;
}
function InfoCard({ poi, onClose }: { poi: Poi | null; onClose: () => void }) {
  const t = useTransition(poi, { keys: (p) => p?.id ?? 'x', from: { x: 40, opacity: 0 }, enter: { x: 0, opacity: 1 }, leave: { x: 40, opacity: 0 }, config: { tension: 230, friction: 24 } });
  const KIND = { mozaik: 'Mozaik', sutun: 'Sütun', mimari: 'Mimari', osmanli: 'Osmanlı eklemesi' } as const;
  return t((style, p) => p && (
    <animated.div style={{ transform: style.x.to((x) => `translateX(${x}px)`), opacity: style.opacity }} role="dialog" aria-label={p.name} onPointerDown={(e) => e.stopPropagation()}
      className="absolute bottom-3 right-3 z-40 w-[min(24rem,calc(100%-1.5rem))] rounded-2xl bg-black/80 p-4 shadow-2xl backdrop-blur sm:bottom-auto sm:top-16">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">{KIND[p.kind]} · {p.era}</p>
      <h3 className="text-lg font-bold">{p.name}</h3>
      <p className="mt-1 text-sm text-white/85">{p.text}</p>
      {p.kind === 'mozaik' && <p className="mt-2 text-xs text-white/55">Modeldeki pano stilize bir canlandırmadır; özgün mozaiğin kopyası değildir.</p>}
      <a href={p.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-white/60 underline">{p.source.title} <ExternalLink size={12} /></a>
      <button onClick={onClose} className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-white/15 text-sm font-semibold"><X size={16} /> Kapat <span className="text-white/50">(E)</span></button>
    </animated.div>
  ));
}
function StartCard({ stage, onEnter }: { stage: number; onEnter: () => void }) {
  const pct = Math.round(((stage + 1) / 3) * 100), ready = stage >= 2;
  return (
    <div className="absolute inset-x-0 bottom-0 z-40 p-4 sm:p-8" onPointerDown={(e) => e.stopPropagation()}>
      <div className="mx-auto w-full max-w-xl rounded-2xl bg-black/70 p-5 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">İstanbul · UNESCO Dünya Mirası · 537</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Ayasofya: Işığın ve Taşın Dansı</h1>
        <p className="mt-2 text-sm text-white/80">Avludan karanlık nartekse, kubbenin altına, mihraba ve rampadan üst galerideki mozaiklere serbestçe yürü. Sanat tarihçisi <b>{GUIDE.name}</b> yol gösterecek; yanına gidince anlatır.</p>
        <p className="mt-2 text-xs text-white/60">Joystick / WASD ile yürü (Shift: koş) · sürükle: bak (yukarı sürükle: kubbeye bak) · iki parmak / tekerlek: yakınlaş · E: rampa · F: incele</p>
        <p className="mt-1 text-[11px] text-white/45">Ölçüler yaklaşıktır, plan stilizedir; mozaikler canlandırmadır. Elif Hoca kurgusal bir karakterdir.</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${pct}%` }} /></div>
        <button onClick={onEnter} disabled={!ready} className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 font-semibold text-black disabled:opacity-50"><Footprints size={18} />Avluya gir</button>
      </div>
    </div>
  );
}
function EndCard({ onStay, onExit }: { onStay: () => void; onExit: () => void }) {
  const seen = useAya((s) => s.seen.length);
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/30 p-5" onPointerDown={(e) => e.stopPropagation()}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center text-ink shadow-2xl">
        <p className="text-sm font-semibold text-brand">Tur tamamlandı</p>
        <h2 className="mt-1 text-2xl font-bold">“Işık her saat başka düşer.”</h2>
        <p className="mt-2 text-sm text-slate-600">Avludan galeriye kadar yürüdün; {seen}/{POIS.length} noktayı inceledin. Ayarlardan günün saatini değiştirip ışığın nasıl değiştiğine bakabilirsin.</p>
        <div className="mt-5 flex gap-2">
          <button onClick={onStay} className="h-11 flex-1 rounded-xl border border-line font-semibold">Dolaşmaya devam</button>
          <button onClick={onExit} className="h-11 flex-1 rounded-xl bg-brand font-semibold text-white">Haritaya dön</button>
        </div>
      </div>
    </div>
  );
}
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null), [i, setI] = useState(0);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Ayasofya').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  const p = POIS[i];
  return (
    <div className="fixed inset-0 bg-[#0d0906] text-white">
      {img && <img src={img} alt="Ayasofya" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <h2 className="mt-1 text-lg font-bold">{p.name}</h2><p className="mt-1 text-sm">{p.text}</p>
        <div className="mt-3 flex gap-2"><button onClick={() => hagiaAudio.speak(p.text)} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button><button onClick={() => setI((i + 1) % POIS.length)} className="h-10 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-black">Sonraki</button></div>
      </div>
    </div>
  );
}
