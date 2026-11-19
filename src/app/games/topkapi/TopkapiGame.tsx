/**
 * Topkapı Sarayı — serbest yürüyüş + rehber. Ana oyun yöneticisi.
 *
 * Oyuncu sarayda serbestçe yürür (joystick / WASD), kamerayı sürükleyerek çevirir (üçüncü şahıs takip kamerası; duvara girmez).
 * Rehber Hasan Efendi (kurgusal saray kâtibi) sıradaki durağa yürür, oyuncuyu bekler; oyuncu yanına gelince anlatır (yazı + isteğe bağlı
 * sesli okuma). Durak bir iç mekândaysa rehber kapının önünde bekler; kapıdan oyuncuyla birlikte geçer. Tur bitince oyuncuyu izler.
 * Yakındaki yapı ve nesneler "İncele" ile bilgi kartı açar (kaynak bağlantılı). Hazine vitrinlerinde nesne sürükleyerek çevrilir.
 * Kapılar: yaklaşınca "gir" düğmesi; ekran kararır, bölge değişir. Aynı anda yalnızca bir bölge çizilir.
 * Kalite: düşük/orta/yüksek (cihaz + ?q=), kare hızı düşerse bir kademe iner; düşük pilde tasarruf kipi.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor, Sky } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { create } from 'zustand';
import { ArrowLeft, Captions, CaptionsOff, DoorOpen, Footprints, Info, Map as MapIcon, Search, Volume2, VolumeX, X } from 'lucide-react';
import { Character, newRig } from '../kiz-kulesi/NPCController';
import { keys, readKeys, walk } from '../kiz-kulesi/input';
import { makeMats } from './kit';
import { Courtyards } from './Courtyards';
import { DivanHall, Harem } from './Interiors';
import { TreasureRoom } from './TreasureRoom';
import { Extras, HASAN, VISITOR } from './people';
import { Joystick } from '../shared/Joystick';
import { topkapiAudio } from './AudioManager';
import {
  BUILDINGS, CEILING, DOORS, GATE1_X, GATE2_X, GATE3_X, GUIDE, START, STOP_RADIUS, THINGS, TOUR, ZONE_LABEL,
  camClear, guideGoal, guideStep, nearestDoor, nearestThing, slide, subZone, walkable, type Door, type Thing, type V2, type Zone,
} from './world';

/* ---------- cihaz profili ---------- */
type Tier = 'low' | 'medium' | 'high';
const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const pinned = (() => { const q = new URLSearchParams(location.search).get('q'); return q === 'low' || q === 'medium' || q === 'high' ? (q as Tier) : null; })();
function detectTier(): Tier {
  if (pinned) return pinned;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low';
  return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high';
}
const profile = (t: Tier) => ({
  tier: t, low: t === 'low', shadows: t !== 'low', shadowMap: t === 'high' ? 2048 : 1024, bloom: t !== 'low', ao: t === 'high',
  dpr: (t === 'low' ? 1 : t === 'medium' ? [1, 1.4] : [1, 1.75]) as number | [number, number], antialias: t === 'low',
});
type Prof = ReturnType<typeof profile>;

/* ---------- durum ---------- */
interface Talk { who: string; lines: string[]; i: number; t0: number; onDone?: () => void }
interface Prompt { door: Door | null; thing: Thing | null }
interface S {
  started: boolean; zone: Zone; stop: number; told: string[]; talk: Talk | null; card: Thing | null; seen: string[]; prompt: Prompt; muted: boolean; tts: boolean; fade: boolean; done: boolean; endShown: boolean; map: boolean;
  set: (p: Partial<S>) => void;
}
const INITIAL = { started: false, zone: START.zone, stop: 0, told: [] as string[], talk: null, card: null, seen: [] as string[], prompt: { door: null, thing: null }, fade: false, done: false, endShown: false };
const useTop = create<S>((set) => ({ ...INITIAL, muted: false, tts: true, map: true, set: (p) => set(p) }));
/** Kare döngüsü ile arayüz arasında paylaşılan canlı durum (React durumu değil) */
const live = {
  player: newRig(START.at[0], START.at[1], START.yaw), guide: newRig(START.at[0] + 4, START.at[1] + 2.6, START.yaw),
  cam: { yaw: START.yaw, pitch: 0.32, dist: 5.2, drag: 0 }, spin: { current: 0 } as React.MutableRefObject<number>, active: { current: null } as React.MutableRefObject<string | null>,
  goal: null as V2 | null,
};
function resetLive() {
  Object.assign(live.player, newRig(START.at[0], START.at[1], START.yaw)); Object.assign(live.guide, newRig(START.at[0] + 4, START.at[1] + 2.6, START.yaw));
  Object.assign(live.cam, { yaw: START.yaw, pitch: 0.32, dist: 5.2, drag: 0 }); live.active.current = null; live.goal = null;
}
const CPS = 40;   // daktilo hızı (harf/sn)
const lineTime = (s: string) => s.length / CPS + 1.6 + s.length * 0.03;

function say(who: string, lines: string[], onDone?: () => void) {
  useTop.getState().set({ talk: { who, lines, i: 0, t0: performance.now(), onDone } });
  if (useTop.getState().tts) topkapiAudio.speak(lines[0]);
}
function advance() {
  const s = useTop.getState(), t = s.talk; if (!t) return;
  const el = (performance.now() - t.t0) / 1000, line = t.lines[t.i];
  if (el < line.length / CPS) { s.set({ talk: { ...t, t0: performance.now() - (line.length / CPS) * 1000 - 1 } }); return; }   // önce satırı tamamla
  if (t.i + 1 < t.lines.length) { s.set({ talk: { ...t, i: t.i + 1, t0: performance.now() } }); if (s.tts) topkapiAudio.speak(t.lines[t.i + 1]); return; }
  s.set({ talk: null }); topkapiAudio.hush(); t.onDone?.();
}

export default function TopkapiGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}

function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier);
  const [saver, setSaver] = useState(false);
  const prof = useMemo(() => profile(saver ? 'low' : tier), [tier, saver]);
  const S = useTop();
  const stick = useRef({ x: 0, y: 0 });

  // düşük pil → tasarruf
  useEffect(() => {
    type B = EventTarget & { level: number; charging: boolean }; let b: B | null = null;
    const check = () => b && setSaver(b.level < 0.2 && !b.charging);
    (navigator as Navigator & { getBattery?: () => Promise<B> }).getBattery?.().then((x) => { b = x; check(); x.addEventListener('levelchange', check); x.addEventListener('chargingchange', check); }).catch(() => {});
    return () => { b?.removeEventListener('levelchange', check); b?.removeEventListener('chargingchange', check); };
  }, []);

  // kapıdan geçiş: karar → bölge değiştir → aç
  const enter = useCallback((d: Door) => {
    const st = useTop.getState(); if (st.fade) return;
    st.set({ fade: true, card: null }); live.active.current = null; topkapiAudio.hush();
    setTimeout(() => {
      const p = live.player, g = live.guide, fx = -Math.sin(d.yaw), fz = -Math.cos(d.yaw);
      p.x = d.spawn[0]; p.z = d.spawn[1]; p.yaw = d.yaw; p.speed = 0;
      // rehber oyuncunun hemen yanında/arkasında belirir
      const cand: V2[] = [[d.spawn[0] - fz * 1.1 - fx * 0.6, d.spawn[1] + fx * 1.1 - fz * 0.6], [d.spawn[0] + fz * 1.1 - fx * 0.6, d.spawn[1] - fx * 1.1 - fz * 0.6], [d.spawn[0] - fx * 1.2, d.spawn[1] - fz * 1.2], [d.spawn[0] + fx * 1.2, d.spawn[1] + fz * 1.2]];
      const ok = cand.find((c) => walkable(d.to, c[0], c[1])) ?? ([...d.spawn] as V2);
      g.x = ok[0]; g.z = ok[1]; g.yaw = d.yaw; g.speed = 0;
      live.cam.yaw = d.yaw; live.cam.pitch = d.to === 'avlu' ? 0.32 : 0.22; live.cam.dist = d.to === 'avlu' ? 5.2 : d.to === 'harem' ? 2.6 : 3.4;
      useTop.getState().set({ zone: d.to });
      setTimeout(() => useTop.getState().set({ fade: false }), 250);
    }, 450);
  }, []);
  const inspect = useCallback((t: Thing) => {
    const s = useTop.getState(); s.set({ card: t, seen: s.seen.includes(t.id) ? s.seen : [...s.seen, t.id] });
    live.active.current = t.id; live.spin.current = 0; topkapiAudio.chime(); if (s.tts && !s.talk) topkapiAudio.speak(t.text);
  }, []);
  const closeCard = () => { useTop.getState().set({ card: null }); live.active.current = null; topkapiAudio.hush(); };

  // klavye
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useTop.getState(); if (!s.started) return;
      if (e.code === 'Space' || e.code === 'Enter') { if (s.talk) advance(); else if (s.card) closeCard(); }
      if (e.code === 'KeyE') { if (s.talk) advance(); else if (s.prompt.door) enter(s.prompt.door); else if (s.prompt.thing) inspect(s.prompt.thing); }
      if (e.code === 'KeyF' && s.prompt.thing) inspect(s.prompt.thing);
      if (e.code === 'Escape' && s.card) closeCard();
      if (e.code === 'KeyM') s.set({ map: !s.map });
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0; const loop = () => { readKeys(stick.current); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); keys.clear(); };
  }, [enter, inspect]);

  // ses; çıkışta durumu sıfırla (yeniden girişte baştan başlasın)
  useEffect(() => { topkapiAudio.setMuted(S.muted); }, [S.muted]);
  useEffect(() => () => { topkapiAudio.dispose(); useTop.setState(INITIAL); resetLive(); }, []);

  // ?debug: ışınlanma ve durak atlama (ekran görüntüsü / test)
  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __topkapi: unknown }).__topkapi = {
      tp: (zone: Zone, x: number, z: number, yaw = 0, pitch = 0.3, dist = 5) => { live.player.x = x; live.player.z = z; live.player.yaw = yaw; live.guide.x = x + 1.2; live.guide.z = z + 1; Object.assign(live.cam, { yaw, pitch, dist, drag: 3 }); useTop.getState().set({ zone, started: true, talk: null }); },
      guide: (x: number, z: number) => { live.guide.x = x; live.guide.z = z; },
      stop: (i: number) => useTop.getState().set({ stop: i, told: TOUR.slice(0, i).map((s) => s.id) }),
      inspect: (id: string) => { const t = THINGS.find((x) => x.id === id); if (t) inspect(t); },
      state: () => ({ ...useTop.getState(), player: { ...live.player }, guide: { ...live.guide } }),
    };
  }, [inspect]);

  // sürükleyerek kamera / hazinede nesne çevirme, tekerlek ve iki parmakla yakınlaştırma
  const ptr = useRef(new Map<number, { x: number; y: number }>()), pinch = useRef<number | null>(null);
  const onDown = (e: React.PointerEvent) => { topkapiAudio.unlock(); ptr.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); };
  const onMove = (e: React.PointerEvent) => {
    const p = ptr.current.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; ptr.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptr.current.size === 2) { const [a, b] = [...ptr.current.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch.current) live.cam.dist = THREE.MathUtils.clamp(live.cam.dist * (pinch.current / d), 1.6, 9); pinch.current = d; return; }
    if (useTop.getState().card && live.active.current && ['kasikci', 'hancer'].includes(live.active.current)) { live.spin.current += dx * 0.012; return; }
    live.cam.yaw -= dx * 0.006; live.cam.pitch = THREE.MathUtils.clamp(live.cam.pitch + dy * 0.004, -0.15, 1.1); live.cam.drag = 1.5;
  };
  const onUp = (e: React.PointerEvent) => { ptr.current.delete(e.pointerId); if (ptr.current.size < 2) pinch.current = null; };
  const onWheel = (e: React.WheelEvent) => { live.cam.dist = THREE.MathUtils.clamp(live.cam.dist * (1 + Math.sign(e.deltaY) * 0.1), 1.6, 9); };

  const start = () => { topkapiAudio.unlock(); topkapiAudio.setMix('dis'); S.set({ started: true }); };

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#cfd9df] text-white" style={{ touchAction: 'none' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp} onWheel={onWheel}>
      <Canvas shadows={prof.shadows ? { type: THREE.PCFSoftShadowMap } : false} dpr={prof.dpr} gl={{ antialias: prof.antialias, powerPreference: 'high-performance' }}
        camera={{ fov: 58, near: 0.1, far: 700, position: [-90, 14, 22] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}>
          <World prof={prof} />
          {prof.bloom && (
            <EffectComposer multisampling={0} enableNormalPass={prof.ao}>
              {prof.ao ? <N8AO aoRadius={1.6} intensity={2.2} distanceFalloff={1} halfRes /> : <></>}
              <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.3} intensity={S.zone === 'avlu' ? 0.35 : 0.7} />
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              <Vignette darkness={S.zone === 'avlu' ? 0.35 : 0.55} offset={0.3} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>

      {/* üst çubuk */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={onExit} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/50 backdrop-blur" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
        <button onClick={() => S.set({ muted: !S.muted })} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/50 backdrop-blur" aria-label={S.muted ? 'Sesi aç' : 'Sesi kapat'}>{S.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <button onClick={() => { S.set({ tts: !S.tts }); if (S.tts) topkapiAudio.hush(); }} className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-full backdrop-blur ${S.tts ? 'bg-amber-500' : 'bg-black/50'}`} aria-label={S.tts ? 'Sesli okumayı kapat' : 'Sesli okumayı aç'} aria-pressed={S.tts}>{S.tts ? <Captions size={18} /> : <CaptionsOff size={18} />}</button>
        {S.started && (
          <div className="mx-auto flex flex-col items-center gap-1 rounded-2xl bg-black/50 px-3 py-2 backdrop-blur">
            <div className="flex gap-1">{TOUR.map((t, i) => <span key={t.id} className={`h-1.5 w-3 rounded-full sm:w-6 ${S.told.includes(t.id) ? 'bg-amber-300' : i === S.stop ? 'bg-white' : 'bg-white/25'}`} />)}</div>
            <p className="text-xs">{ZONE_LABEL[S.zone]} · {S.seen.length}/{THINGS.length} incelendi</p>
          </div>
        )}
        {S.started && S.zone === 'avlu' && (
          <button onClick={() => S.set({ map: !S.map })} className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-full backdrop-blur ${S.map ? 'bg-white/30' : 'bg-black/50'}`} aria-label="Krokiyi aç/kapat" aria-pressed={S.map}><MapIcon size={18} /></button>
        )}
      </div>
      {S.started && S.zone === 'avlu' && S.map && <MiniMap />}

      {S.started && (
        <>
          <Joystick stick={stick} onTouch={() => topkapiAudio.unlock()} />
          <Prompts enter={enter} inspect={inspect} />
          {!S.talk && !S.card && <Hint text={hintText(S)} />}
        </>
      )}
      <DialogueBox />
      {S.card && <Card t={S.card} onClose={closeCard} />}
      {!S.started && <TitleCard onStart={start} />}
      {S.done && !S.endShown && !S.talk && <EndCard onStay={() => S.set({ endShown: true })} onExit={onExit} />}
      <div className={`pointer-events-none absolute inset-0 z-50 bg-black transition-opacity duration-300 ${S.fade ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
    </div>
  );
}
function hintText(S: S) {
  if (S.done) return 'Sarayda dilediğin gibi dolaş';
  const g = guideGoal(S.zone, S.stop);
  if (g.door) return `${GUIDE.name} kapıda bekliyor: ${g.door.label}`;
  return `${GUIDE.name}’nin yanına yürü`;
}

/* ---------- 3B dünya: bölge, ışık, oyuncu, rehber, kamera ---------- */
const SUN = new THREE.Vector3(-0.45, 0.78, 0.42).normalize();
function World({ prof }: { prof: Prof }) {
  const zone = useTop((s) => s.zone), started = useTop((s) => s.started);
  const m = useMemo(() => makeMats(prof.tier === 'high'), [prof.tier]);
  const playerXZ = useRef({ x: live.player.x, z: live.player.z });
  const playerRig = useMemo(() => ({ current: live.player }), []), guideRig = useMemo(() => ({ current: live.guide }), []);
  const { scene, camera } = useThree();
  useEffect(() => {
    if (zone === 'avlu') { scene.fog = new THREE.Fog('#d6dfe3', 80, 330); scene.background = null; }
    else { scene.fog = null; scene.background = new THREE.Color('#0c0907'); }
    return () => { scene.fog = null; };
  }, [zone, scene]);
  // başlık ekranı: Bâbüsselâm'ın önünde yavaş süzülen kamera
  useFrame(({ clock }) => {
    if (started) return; const a = clock.elapsedTime * 0.04;
    camera.position.set(GATE2_X - 26 + Math.sin(a) * 8, 7 + Math.sin(a * 0.7) * 1.2, 16 + Math.cos(a) * 6); camera.lookAt(GATE2_X, 8, 0);
  });
  return (
    <group>
      {zone === 'avlu' && <Outdoor prof={prof} />}
      {zone === 'avlu' && <Courtyards m={m} low={prof.low} />}
      {zone === 'divan' && <DivanHall m={m} low={prof.low} />}
      {zone === 'harem' && <Harem m={m} low={prof.low} />}
      {zone === 'hazine' && <TreasureRoom spin={live.spin} active={live.active} fancy={!prof.low} />}
      <Extras zone={zone} low={prof.low} player={playerXZ} />
      <Character rig={playerRig} palette={VISITOR} castShadow={prof.shadows} />
      <Character rig={guideRig} palette={HASAN} castShadow={prof.shadows} />
      <GoalMarker />
      {started && <Controller playerXZ={playerXZ} />}
    </group>
  );
}
function Outdoor({ prof }: { prof: Prof }) {
  const sun = useRef<THREE.DirectionalLight>(null!);
  useFrame(() => {   // gölge kamerası oyuncuyu izler (gölge çözünürlüğü yakında harcanır)
    const l = sun.current, p = live.player; l.position.set(p.x + SUN.x * 90, SUN.y * 90, p.z + SUN.z * 90); l.target.position.set(p.x, 0, p.z); l.target.updateMatrixWorld();
  });
  return (
    <>
      <Sky sunPosition={SUN.clone().multiplyScalar(1000).toArray()} turbidity={5} rayleigh={1.4} mieCoefficient={0.004} mieDirectionalG={0.82} distance={4500} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.1} color="#cfe0f2" position={[0, 30, 0]} rotation-x={Math.PI / 2} scale={[80, 80, 1]} />
        <Lightformer form="rect" intensity={3} color="#fff0d6" position={SUN.clone().multiplyScalar(40).toArray()} scale={[14, 14, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.5} color="#a7b58a" position={[0, -8, 0]} rotation-x={-Math.PI / 2} scale={[80, 80, 1]} />
      </Environment>
      <hemisphereLight args={['#dce9f5', '#7d7a5c', 0.55]} />
      <directionalLight ref={sun} intensity={2.6} color="#fff1dc" castShadow={prof.shadows}
        shadow-mapSize={[prof.shadowMap, prof.shadowMap]} shadow-bias={-0.0004} shadow-normalBias={0.04}
        shadow-camera-left={-50} shadow-camera-right={50} shadow-camera-top={50} shadow-camera-bottom={-50} shadow-camera-near={10} shadow-camera-far={220} />
    </>
  );
}
/** Rehberin beklediği kapının / durağın yerde parlayan halkası */
function GoalMarker() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const g = live.goal, r = ref.current, s0 = useTop.getState(); r.visible = !!g && s0.started && !s0.done && !s0.talk; if (!g) return;
    r.position.set(g[0], 0.06, g[1]); const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.08; r.scale.set(s, s, s);
  });
  return <mesh ref={ref} rotation-x={-Math.PI / 2}><ringGeometry args={[0.55, 0.7, 40]} /><meshBasicMaterial color={new THREE.Color('#ffd27a').multiplyScalar(2)} toneMapped={false} transparent opacity={0.8} /></mesh>;
}

const _t = new THREE.Vector3(), _c = new THREE.Vector3(), _look = new THREE.Vector3(), _lk = new THREE.Vector3(), _pt = new THREE.Vector3();
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
function Controller({ playerXZ }: { playerXZ: React.MutableRefObject<{ x: number; z: number }> }) {
  const { camera } = useThree();
  const lookAt = useRef(new THREE.Vector3(live.player.x, 1.5, live.player.z)), camPos = useRef(camera.position.clone());
  const promptKey = useRef(''), mixKey = useRef(''), audioT = useRef(0);
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05), S = useTop.getState(), zone = S.zone, p = live.player, g = live.guide, cam = live.cam, t = clock.elapsedTime;
    const frozen = S.fade || !!S.card;

    /* oyuncu: kameraya göre yürü */
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    const mx = fx * -walk.y + rx * walk.x, mz = fz * -walk.y + rz * walk.x, ml = Math.hypot(mx, mz);
    const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 5.2 : 3.5) * Math.min(1, ml);
    if (!frozen && ml > 0.08) {
      const [nx, nz] = slide(zone, [p.x, p.z], (mx / ml) * speed * dt, (mz / ml) * speed * dt);
      p.speed = dt > 0 ? Math.hypot(nx - p.x, nz - p.z) / dt : 0; p.x = nx; p.z = nz;
      p.yaw += wrap(Math.atan2(-mx, -mz) - p.yaw) * (1 - Math.exp(-dt * 12));
      // kamera kendiliğinden oyuncunun arkasına döner (oyuncu sürüklemiyorsa ve ileri yürüyorsa)
      if (cam.drag <= 0 && Math.abs(walk.x) < 0.5 && walk.y < -0.3) cam.yaw += wrap(p.yaw - cam.yaw) * (1 - Math.exp(-dt * 0.8));
    } else p.speed = 0;
    cam.drag -= dt;
    playerXZ.current.x = p.x; playerXZ.current.z = p.z;

    /* rehber: sıradaki durağa / kapıya yürür, oyuncu geride kalırsa bekler; tur bitince oyuncuyu izler */
    const pd = Math.hypot(p.x - g.x, p.z - g.z);
    const goal: V2 | null = S.done ? (pd > 3.2 ? [p.x, p.z] : null) : guideGoal(zone, S.stop).at;
    live.goal = S.done ? null : goal;
    const gg = goal ? Math.hypot(goal[0] - g.x, goal[1] - g.z) : 0, playerToGoal = goal ? Math.hypot(goal[0] - p.x, goal[1] - p.z) : 0;
    const waitForPlayer = !S.done && pd > 11 && gg < playerToGoal;
    if (goal && !S.talk && !waitForPlayer && gg > 0.4) {
      const sp = S.done ? Math.min(4.6, 1.4 + pd * 0.6) : pd < 3 ? 2.6 : 3.3;
      const step = guideStep(zone, [g.x, g.z], goal, dt, sp);
      g.speed = dt > 0 ? step.moved / dt : 0; g.x = step.p[0]; g.z = step.p[1]; if (step.yaw !== null) g.yaw += wrap(step.yaw - g.yaw) * (1 - Math.exp(-dt * 10));
    } else {
      g.speed = 0; const want = Math.atan2(-(p.x - g.x), -(p.z - g.z)); g.yaw += wrap(want - g.yaw) * (1 - Math.exp(-dt * 4));
    }
    if (S.done && pd > 30) { g.x = p.x; g.z = p.z; }   // çok uzak kaldıysa yanına gelir
    g.look = pd < 9 ? _look.set(p.x, 1.6, p.z) : null;
    // durak anlatımı: rehber durağa varmış, oyuncu yakında, sıra bu durakta
    if (!S.done && !S.talk && !S.fade && !S.card) {
      const st = TOUR[S.stop], at = st.zone === zone && Math.hypot(st.at[0] - g.x, st.at[1] - g.z) < 0.6;
      if (at && pd < STOP_RADIUS && !S.told.includes(st.id)) {
        g.point = _pt.set(...st.look);
        const idx = S.stop;
        say(GUIDE.name, st.lines, () => {
          const s2 = useTop.getState(), told = [...s2.told, st.id]; live.guide.point = null;
          if (idx + 1 >= TOUR.length) s2.set({ told, done: true }); else s2.set({ told, stop: idx + 1 });
        });
      }
    }
    // konuşma: dudak senkronu (daktilo sürerken); satırlar kendiliğinden ilerler
    const tk = useTop.getState().talk;
    if (tk) {
      const el = (performance.now() - tk.t0) / 1000, typing = el < tk.lines[tk.i].length / CPS + 0.2;
      g.talking = true; g.mouth = typing ? Math.max(0, Math.sin(t * 15) * 0.55 + Math.sin(t * 9.7) * 0.35) : 0; if (tk.i > 0) g.point = null;
      if (el > lineTime(tk.lines[tk.i])) advance();
    } else { g.talking = false; g.mouth = 0; }

    /* yakındaki kapı / nesne → düğmeler */
    const door = frozen ? null : nearestDoor(zone, p.x, p.z), thing = frozen ? null : nearestThing(zone, p.x, p.z);
    const k = `${door?.id ?? ''}|${thing?.id ?? ''}`;
    if (k !== promptKey.current) { promptKey.current = k; S.set({ prompt: { door, thing } }); if (thing && !S.seen.includes(thing.id)) topkapiAudio.whisper(); }

    /* kamera */
    const card = S.card, headY = 1.55;
    _t.set(p.x, headY, p.z);
    if (card && card.zone === zone) {
      // inceleme: nesneye dön; hazinede vitrine yaklaş
      const dx = card.pos[0] - p.x, dz = card.pos[2] - p.z, want = Math.atan2(-dx, -dz);
      cam.yaw += wrap(want - cam.yaw) * (1 - Math.exp(-dt * 3));
      if (card.zone === 'hazine') {
        const d = Math.hypot(dx, dz) || 1; _c.set(card.pos[0] - (dx / d) * 0.95, card.pos[1] + 0.22, card.pos[2] - (dz / d) * 0.95); _lk.set(...card.pos);
      } else {
        _lk.set(card.pos[0], card.pos[1], card.pos[2]).lerp(_t, 0.25);
        const h = Math.min(CEILING[zone] - 0.4, headY + 1.2); let D = Math.max(cam.dist, zone === 'avlu' ? 6 : 2.5);
        while (D > 1 && !camClear(zone, p.x + Math.sin(cam.yaw) * D, p.z + Math.cos(cam.yaw) * D)) D -= 0.25;
        _c.set(p.x + Math.sin(cam.yaw) * D, h, p.z + Math.cos(cam.yaw) * D);
      }
    } else {
      const D = cam.dist, cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      _c.set(p.x + Math.sin(cam.yaw) * cp * D, headY + sp * D, p.z + Math.cos(cam.yaw) * cp * D);
      // çarpışma: hedeften kameraya doğru ilerle, engelde dur
      const n = Math.ceil(D / 0.2); let ok = 0;
      for (let i = 1; i <= n; i++) { const f = i / n, x = p.x + (_c.x - p.x) * f, z = p.z + (_c.z - p.z) * f; if (!camClear(zone, x, z)) break; ok = f; }
      if (ok < 1) { const f = Math.max(0.12, ok - 0.06); _c.set(p.x + (_c.x - p.x) * f, headY + (_c.y - headY) * f, p.z + (_c.z - p.z) * f); }
      _c.y = Math.max(0.35, Math.min(_c.y, CEILING[zone] - 0.3));
      _lk.copy(_t);
      if (S.talk && pd < 6) _lk.lerp(_look.set(g.x, 1.5, g.z), 0.35);   // konuşurken rehber de kadrajda
    }
    const kk = 1 - Math.exp(-dt * (card ? 3 : 10));
    if (camPos.current.distanceTo(_c) > 25) { camPos.current.copy(_c); lookAt.current.copy(_lk); } else { camPos.current.lerp(_c, kk); lookAt.current.lerp(_lk, kk); }
    camera.position.copy(camPos.current); camera.lookAt(lookAt.current);

    /* ses */
    const sz = subZone(zone, p.x); if (sz !== mixKey.current) { mixKey.current = sz; topkapiAudio.setMix(sz); }
    audioT.current += dt; if (audioT.current > 0.1) { audioT.current = 0; topkapiAudio.listener([camera.position.x, camera.position.y, camera.position.z], [lookAt.current.x - camera.position.x, 0, lookAt.current.z - camera.position.z]); }
  });
  return null;
}

/* ---------- arayüz ---------- */
function Prompts({ enter, inspect }: { enter: (d: Door) => void; inspect: (t: Thing) => void }) {
  const prompt = useTop((s) => s.prompt), talk = useTop((s) => !!s.talk), card = useTop((s) => !!s.card), seen = useTop((s) => s.seen);
  if (card) return null;
  return (
    <div className={`absolute right-4 z-40 flex flex-col items-end gap-2 ${talk ? 'bottom-40' : 'bottom-24 sm:bottom-28'}`} onPointerDown={(e) => e.stopPropagation()}>
      {prompt.thing && (
        <button onClick={() => inspect(prompt.thing!)} className={`flex h-12 max-w-[62vw] items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-lg backdrop-blur ${seen.includes(prompt.thing.id) ? 'bg-black/55' : 'bg-amber-400/95 text-black'}`}>
          <Search size={18} className="shrink-0" /><span className="truncate">İncele: {prompt.thing.name}</span><span className="hidden opacity-70 [@media(pointer:fine)]:inline">· F</span>
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
  const talk = useTop((s) => s.talk);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!talk) return; let raf = 0;
    const loop = () => { const t = useTop.getState().talk; if (!t) return; setN(Math.floor(((performance.now() - t.t0) / 1000) * CPS)); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [talk]);
  if (!talk) return null;
  const line = talk.lines[talk.i];
  return (
    <div className="absolute inset-x-3 bottom-3 z-40 mx-auto max-w-2xl sm:bottom-6" onPointerDown={(e) => { e.stopPropagation(); advance(); }}>
      <div className="rounded-2xl border border-amber-200/20 bg-[#1b130c]/85 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-black">{talk.who}</span>
          <span className="text-[11px] text-white/50">{GUIDE.role}</span>
          <span className="ml-auto text-[11px] text-white/40">{talk.i + 1}/{talk.lines.length} · dokun: geç</span>
        </div>
        <p className="mt-2 min-h-[3rem] text-[15px] leading-relaxed sm:text-base">{line.slice(0, n)}<span className="opacity-0">{line.slice(n)}</span></p>
      </div>
    </div>
  );
}
function Card({ t, onClose }: { t: Thing; onClose: () => void }) {
  const spin = t.id === 'kasikci' || t.id === 'hancer';
  return (
    <div className="absolute inset-x-3 bottom-3 z-40 mx-auto max-w-lg sm:bottom-6 sm:left-auto sm:right-6 sm:mx-0" onPointerDown={(e) => e.stopPropagation()}>
      <div className="rounded-2xl bg-white p-5 text-ink shadow-2xl">
        <div className="flex items-start gap-2">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-brand">{t.era}</p><h2 className="text-xl font-bold">{t.name}</h2></div>
          <button onClick={onClose} className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100" aria-label="Kapat"><X size={18} /></button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{t.text}</p>
        {spin && <p className="mt-2 text-xs text-slate-500">Ekranda sürükle: nesneyi çevir</p>}
        <a href={t.source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand underline"><Info size={12} />Kaynak: {t.source.title}</a>
      </div>
    </div>
  );
}
function MiniMap() {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const W = 236, H = 108, sx = (x: number) => x + 118, sz = (z: number) => z + 54, p = live.player, g = live.guide, goal = live.goal;
  return (
    <div className="pointer-events-none absolute right-3 top-16 z-30 w-40 rounded-xl bg-black/45 p-1.5 backdrop-blur sm:w-52" aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <rect x={0} y={0} width={W} height={H} rx={4} fill="#5d7a3c" opacity={0.6} />
        <rect x={0} y={sz(-3)} width={sx(49)} height={6} fill="#a59c8a" />
        {Object.values(BUILDINGS).map((b, i) => <rect key={i} x={sx(b.x0)} y={sz(b.z0)} width={b.x1 - b.x0} height={b.z1 - b.z0} fill="#e8dfcc" opacity={0.9} />)}
        {[GATE1_X, GATE2_X, GATE3_X].map((x) => <g key={x}><rect x={sx(x) - 1} y={0} width={2} height={sz(-3.6)} fill="#3a3229" /><rect x={sx(x) - 1} y={sz(3.6)} width={2} height={H - sz(3.6)} fill="#3a3229" /></g>)}
        {DOORS.filter((d) => d.zone === 'avlu').map((d) => <circle key={d.id} cx={sx(d.at[0])} cy={sz(d.at[1])} r={2} fill="#ffd27a" />)}
        {goal && <circle cx={sx(goal[0])} cy={sz(goal[1])} r={4} fill="none" stroke="#ffd27a" strokeWidth={1.5} />}
        <circle cx={sx(g.x)} cy={sz(g.z)} r={2.6} fill="#2c5a4a" stroke="#fff" strokeWidth={0.8} />
        <g transform={`translate(${sx(p.x)} ${sz(p.z)}) rotate(${(-p.yaw * 180) / Math.PI})`}><path d="M0,-5 L3.4,3.4 L0,1.6 L-3.4,3.4 Z" fill="#fff" /></g>
      </svg>
    </div>
  );
}
function Hint({ text }: { text: string }) {
  return <p className="pointer-events-none absolute bottom-6 left-1/2 z-30 max-w-[60vw] -translate-x-1/2 rounded-full bg-black/45 px-4 py-1.5 text-center text-xs backdrop-blur sm:text-sm">{text}<span className="hidden [@media(pointer:fine)]:inline"> · WASD yürü · sürükle: bak</span></p>;
}
function TitleCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-40 p-4 sm:p-8" onPointerDown={(e) => e.stopPropagation()}>
      <div className="mx-auto max-w-xl rounded-2xl bg-black/60 p-5 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">İstanbul · Sarayburnu</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Topkapı Sarayı</h1>
        <p className="mt-2 text-sm text-white/85">Sarayın avlularında, Divan’da, Harem’de ve Hazine’de serbestçe dolaş. Kâtip <b>{GUIDE.name}</b> sana yol gösterecek; yanına gidince anlatır. Parlayan düğmelerle yapıları ve hazineleri incele.</p>
        <p className="mt-2 text-xs text-white/60">Joystick / WASD ile yürü (Shift: koş) · ekranı sürükleyerek bak · iki parmak / tekerlek: yakınlaş · E: kapı · F: incele</p>
        <p className="mt-1 text-[11px] text-white/45">Saray planı ve figürler stilizedir; ölçüler kısaltılmıştır. Hasan Efendi kurgusal bir karakterdir.</p>
        <button onClick={onStart} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 font-semibold text-black"><Footprints size={18} />Saraya gir</button>
      </div>
    </div>
  );
}
function EndCard({ onStay, onExit }: { onStay: () => void; onExit: () => void }) {
  const seen = useTop((s) => s.seen.length);
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/30 p-5" onPointerDown={(e) => e.stopPropagation()}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center text-ink shadow-2xl">
        <p className="text-sm font-semibold text-brand">Tur tamamlandı</p>
        <h2 className="mt-1 text-2xl font-bold">“Sarayımıza yine bekleriz.”</h2>
        <p className="mt-2 text-sm text-slate-600">Üç avluyu, Divan’ı, Harem’i ve Hazine’yi gezdin; {seen}/{THINGS.length} nesneyi inceledin. Kalanları bulmak için dolaşmaya devam edebilirsin.</p>
        <div className="mt-5 flex gap-2">
          <button onClick={onStay} className="h-11 flex-1 rounded-xl border border-line font-semibold">Dolaşmaya devam</button>
          <button onClick={onExit} className="h-11 flex-1 rounded-xl bg-brand font-semibold text-white">Haritaya dön</button>
        </div>
      </div>
    </div>
  );
}

/** WebGL yoksa: fotoğraf + Hasan Efendi'nin anlatımı (sesli) */
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null);
  const lines = useMemo(() => TOUR.flatMap((s) => s.lines), []);
  const [i, setI] = useState(0);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Topkap%C4%B1_Saray%C4%B1').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  return (
    <div className="fixed inset-0 bg-ink text-white">
      {img && <img src={img} alt="Topkapı Sarayı" className="absolute inset-0 h-full w-full object-cover opacity-80" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/50" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/75 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <span className="mt-2 inline-block rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-black">{GUIDE.name}</span>
        <p className="mt-1">{lines[i]}</p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => topkapiAudio.speak(lines[i])} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button>
          <button onClick={() => setI((i + 1) % lines.length)} className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold">Devam</button>
        </div>
      </div>
    </div>
  );
}
