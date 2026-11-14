/**
 * Yerebatan Sarnıcı — "Suyun Altındaki Işık". Ana oyun yöneticisi: sahne yükleme, oyuncu döngüsü, etkileşim, arayüz.
 *
 * Tamamen birinci şahıs: kamera her zaman oyuncunun gözündedir (platformun 1,62 m üstü); serbest kamera yoktur.
 * Bakış: masaüstünde Pointer Lock + fare, mobilde sağ yarıda parmak sürükleme; yukarı/aşağı ±45°.
 * Yürüme: WASD / sol joystick; koşma yok. Nişangâh ortada sabit; bir ilgi noktasına bakınca parlar → E / "İncele".
 * Medusa başlarına yaklaşıp bakınca inceleme modu kendiliğinden açılır (MedusaInteraction.tsx).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ArrowLeft, Eye, Settings2, Volume2, VolumeX } from 'lucide-react';
import { DECK_Y, EYE, MEDUSA_IDS, POIS, SIZE, START, lookingAt, type Poi } from './cistern';
import { createFP, headBob, look, useLookInput, walk, type FPState, type LookInput } from './FirstPersonController';
import { CisternFog, ColumnLights, Columns, HensEyeColumn, Vaults, Walkways, Walls, Water, FOG, type Tier } from './CisternScene';
import { AUTO_DIST, INSPECT_FOV, InfoPanel, Medusas, NORMAL_FOV, inspectPose } from './MedusaInteraction';
import { cisternAudio } from './AudioManager';

/* ---------- cihaz ---------- */
const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const isTouch = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches;
function detectTier(): Tier {
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'low' || q === 'medium' || q === 'high') return q;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low';
  return isTouch ? 'medium' : 'high';
}
function useDevice() {
  const [tier] = useState(detectTier), [saver, setSaver] = useState(false);
  useEffect(() => {
    type B = EventTarget & { level: number; charging: boolean }; let b: B | null = null;
    const check = () => b && setSaver(b.level < 0.2 && !b.charging);
    (navigator as Navigator & { getBattery?: () => Promise<B> }).getBattery?.().then((x) => { b = x; check(); x.addEventListener('levelchange', check); x.addEventListener('chargingchange', check); }).catch(() => {});
    return () => { b?.removeEventListener('levelchange', check); b?.removeEventListener('chargingchange', check); };
  }, []);
  const t: Tier = saver ? 'low' : tier;
  return { tier: t, shadows: t !== 'low', dpr: (t === 'low' ? 1 : t === 'medium' ? [1, 1.4] : [1, 1.75]) as number | [number, number], antialias: t !== 'low' };
}
const SENS_KEY = 'miras-yerebatan-sens';
const loadSens = () => { try { const v = Number(localStorage.getItem(SENS_KEY)); return v >= 0.3 && v <= 2.5 ? v : 1; } catch { return 1; } };

export default function CisternGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}

interface Shared {
  fp: React.MutableRefObject<FPState>; lookAcc: React.MutableRefObject<LookInput>; move: React.MutableRefObject<{ f: number; r: number }>;
  inspecting: React.MutableRefObject<string | null>; active: React.MutableRefObject<boolean>;
}

function Game({ onExit }: { onExit: () => void }) {
  const dev = useDevice();
  const wrap = useRef<HTMLDivElement>(null);
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [started, setStarted] = useState(false), [locked, setLocked] = useState(false);
  const [target, setTarget] = useState<Poi | null>(null);
  const [card, setCard] = useState<Poi | null>(null);
  const [inspect, setInspect] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [muted, setMuted] = useState(false), [sens, setSens] = useState(loadSens), [settings, setSettings] = useState(false);
  const stick = useRef({ x: 0, y: 0 });

  const shared: Shared = {
    fp: useRef(createFP(START.x, START.z, START.yaw)), lookAcc: useRef({ dyaw: 0, dpitch: 0 }), move: useRef({ f: 0, r: 0 }),
    inspecting: useRef<string | null>(null), active: useRef(false),
  };
  shared.inspecting.current = inspect;
  shared.active.current = started && (isTouch || locked) && !settings;

  useEffect(() => setEl(wrap.current), []);
  // test/inceleme: ?debug ile ışınlanma (window.__yer.tp(x, z, yaw))
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __yer: unknown }).__yer = { tp: (x: number, z: number, yaw = 0, pitch = 0) => { shared.fp.current = { ...shared.fp.current, x, z, yaw, pitch }; } }; });
  useLookInput(el, shared.lookAcc, { sens, enabled: started && !inspect, onLockChange: setLocked });
  useEffect(() => { try { localStorage.setItem(SENS_KEY, String(sens)); } catch { /* yoksay */ } }, [sens]);
  useEffect(() => { cisternAudio.setMuted(muted); }, [muted]);
  useEffect(() => () => cisternAudio.dispose(), []);

  const openPoi = useCallback((p: Poi) => {
    cisternAudio.chime(); cisternAudio.speak(p.text);
    setSeen((s) => (s.includes(p.id) ? s : [...s, p.id])); setCard(p);
    if (p.kind === 'medusa') setInspect(p.id);
  }, []);
  const closeCard = useCallback(() => { setCard(null); setInspect(null); cisternAudio.hush(); }, []);
  const interact = useCallback(() => {
    if (card) { closeCard(); return; }
    if (target) openPoi(target);
  }, [card, target, openPoi, closeCard]);

  // klavye: WASD, E
  useEffect(() => {
    const keys = new Set<string>();
    const sync = () => {
      const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const r = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      shared.move.current = { f: f || -stick.current.y, r: r || stick.current.x };
    };
    const down = (e: KeyboardEvent) => { keys.add(e.code); if (e.code === 'KeyE' && !e.repeat) interact(); sync(); };
    const up = (e: KeyboardEvent) => { keys.delete(e.code); sync(); };
    addEventListener('keydown', down); addEventListener('keyup', up);
    const id = setInterval(sync, 50);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interact]);

  const enter = () => {
    cisternAudio.unlock(); setStarted(true);
    if (!isTouch) wrap.current?.requestPointerLock?.();
  };
  const medusaSeen = seen.filter((s) => MEDUSA_IDS.includes(s)).length;

  return (
    <div ref={wrap} className="fixed inset-0 select-none overflow-hidden bg-[#140b07] text-white" style={{ touchAction: 'none' }}>
      <Canvas shadows={dev.shadows} dpr={dev.dpr} gl={{ antialias: dev.antialias, powerPreference: 'high-performance' }}
        camera={{ fov: NORMAL_FOV, near: 0.05, far: FOG[dev.tier].far, position: [START.x, DECK_Y + EYE, START.z] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.1; }}>
        <Suspense fallback={null}>
          <CisternFog tier={dev.tier} />
          <Columns tier={dev.tier} />
          <HensEyeColumn />
          <Vaults tier={dev.tier} />
          <Walls />
          <Walkways />
          <Water tier={dev.tier} />
          <ColumnLights tier={dev.tier} player={shared.fp as unknown as React.MutableRefObject<{ x: number; z: number }>} />
          <Medusas shadows={dev.shadows} />
          <Entrance shadows={dev.shadows} />
          <Player s={shared} onTarget={setTarget} onAutoInspect={(id) => { const p = POIS.find((x) => x.id === id)!; if (!seen.includes(id)) openPoi(p); }} card={card} onLeave={() => setCard(null)} />
        </Suspense>
      </Canvas>

      {/* nişangâh: ilgi noktasına bakınca parlar */}
      {started && !inspect && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`rounded-full transition-all duration-200 ${target ? 'h-5 w-5 border-2 border-orange-300 shadow-[0_0_14px_4px_rgba(255,150,70,.7)]' : 'h-1.5 w-1.5 bg-white/70'}`} />
        </div>
      )}
      {started && target && !card && (
        <p className="pointer-events-none absolute left-1/2 top-[57%] -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm">
          {target.name} · <b>{isTouch ? 'İncele’ye dokun' : 'E'}</b>
        </p>
      )}

      {/* üst çubuk */}
      <div className="absolute inset-x-0 top-0 flex items-start gap-2 p-3">
        <button onClick={() => { document.exitPointerLock?.(); onExit(); }} className="grid h-11 w-11 place-items-center rounded-full bg-black/55" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
        <button onClick={() => setMuted(!muted)} className="grid h-11 w-11 place-items-center rounded-full bg-black/55" aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <button onClick={() => { setSettings(!settings); document.exitPointerLock?.(); }} className="grid h-11 w-11 place-items-center rounded-full bg-black/55" aria-label="Ayarlar" aria-expanded={settings}><Settings2 size={18} /></button>
        {started && (
          <div className="mx-auto rounded-2xl bg-black/55 px-4 py-1.5 text-center text-xs">
            Medusa {medusaSeen}/2 · Keşif {seen.length}/{POIS.length}
          </div>
        )}
      </div>
      {settings && (
        <div className="absolute left-3 top-16 z-40 w-72 rounded-2xl bg-black/85 p-4 text-sm">
          <label className="block font-semibold" htmlFor="sens">Bakış hassasiyeti: {sens.toFixed(1)}×</label>
          <input id="sens" type="range" min={0.3} max={2.5} step={0.1} value={sens} onChange={(e) => setSens(Number(e.target.value))} className="mt-2 w-full accent-orange-400" />
          <p className="mt-2 text-xs text-white/60">{isTouch ? 'Dokunmatikte tam ekran kaydırma ≈ 120° × ayar.' : 'Fare: piksel başına 0,0022 rad × ayar.'} Kademe: {dev.tier}{dev.shadows ? '' : ' (gölge kapalı)'}.</p>
          <button onClick={() => { setSettings(false); if (!isTouch && started) wrap.current?.requestPointerLock?.(); }} className="mt-3 h-10 w-full rounded-lg bg-orange-500 font-semibold">Devam</button>
        </div>
      )}

      <InfoPanel poi={card} inspecting={!!inspect} onClose={closeCard} />
      {inspect && <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_60px_rgba(0,0,0,.85)]" />}

      {/* mobil: sol joystick, sağ "İncele" */}
      {started && isTouch && <Joystick stick={stick} />}
      {started && isTouch && (target || card) && (
        <button onClick={interact} className="absolute bottom-8 right-6 z-30 inline-flex h-14 items-center gap-2 rounded-full bg-orange-500 px-5 font-semibold shadow-lg"><Eye size={20} /> {card ? 'Kapat' : 'İncele'}</button>
      )}

      {!started && <StartCard onEnter={enter} />}
      {started && !isTouch && !locked && !settings && !card && (
        <button onClick={() => wrap.current?.requestPointerLock?.()} className="absolute inset-0 grid place-items-center bg-black/40">
          <span className="rounded-xl bg-black/70 px-5 py-3 text-sm">Devam etmek için tıkla (fare bakışı)</span>
        </button>
      )}
      {medusaSeen === 2 && !card && <p className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-orange-500/90 px-4 py-1.5 text-sm font-semibold">İki Medusa’yı da buldun · Sarnıçta dolaşmaya devam edebilirsin</p>}
    </div>
  );
}

/* ---------- oyuncu: kamera, hareket, bakış, etkileşim algılama ---------- */
function Player({ s, onTarget, onAutoInspect, card, onLeave }: { s: Shared; onTarget: (p: Poi | null) => void; onAutoInspect: (id: string) => void; card: Poi | null; onLeave: () => void }) {
  const { camera } = useThree();
  const last = useRef<string | null>(null), lastInspect = useRef('medusa-ters'), auto = useRef(new Set<string>());
  const fwd = useMemo(() => new THREE.Vector3(), []), euler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
  const blend = useRef(0);   // 0 = oyuncu gözü, 1 = inceleme bakış noktası
  const tmpPos = useMemo(() => new THREE.Vector3(), []), q = useMemo(() => new THREE.Quaternion(), []), q2 = useMemo(() => new THREE.Quaternion(), []);
  const mtx = useMemo(() => new THREE.Matrix4(), []);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), fp = s.fp, insp = s.inspecting.current;
    // bakış
    const L = s.lookAcc.current; if (s.active.current && !insp) fp.current = look(fp.current, L.dyaw, L.dpitch); L.dyaw = L.dpitch = 0;
    // yürüme (incelemede durur)
    const m = s.active.current && !insp ? s.move.current : { f: 0, r: 0 };
    const r = walk(fp.current, m.f, m.r, dt); fp.current = r.state;
    if (r.step) cisternAudio.footstep();
    const speed01 = Math.min(1, Math.hypot(fp.current.vx, fp.current.vz) / 1.1), bob = headBob(fp.current, speed01);
    // göz
    euler.set(fp.current.pitch, fp.current.yaw, 0);
    const eye = new THREE.Vector3(fp.current.x, DECK_Y + EYE + bob.y, fp.current.z);
    eye.x += Math.cos(fp.current.yaw) * bob.x; eye.z -= Math.sin(fp.current.yaw) * bob.x;
    q.setFromEuler(euler);
    // inceleme: göz ile Medusa bakış noktası arasında yumuşak geçiş + yakınlaşma
    blend.current += ((insp ? 1 : 0) - blend.current) * (1 - Math.exp(-dt * 1.6));
    if (insp) lastInspect.current = insp;
    if (blend.current > 0.001) {
      const pose = inspectPose(insp ?? lastInspect.current);   // çıkarken de aynı başın bakış noktasından geri süzül
      tmpPos.copy(eye).lerp(pose.eye, blend.current); mtx.lookAt(pose.eye, pose.target, new THREE.Vector3(0, 1, 0)); q2.setFromRotationMatrix(mtx);
      camera.position.copy(tmpPos); camera.quaternion.copy(q).slerp(q2, blend.current);
    } else { camera.position.copy(eye); camera.quaternion.copy(q); }
    const cam = camera as THREE.PerspectiveCamera, fov = THREE.MathUtils.lerp(NORMAL_FOV, INSPECT_FOV, blend.current);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }

    // nişangâh hedefi
    camera.getWorldDirection(fwd);
    const hit = insp ? null : lookingAt([eye.x, eye.y, eye.z], [fwd.x, fwd.y, fwd.z]);
    const id = hit?.id ?? null; if (id !== last.current) { last.current = id; onTarget(hit); }
    // Medusa: yaklaşıp bakınca inceleme kendiliğinden açılır (her baş için bir kez)
    if (hit?.kind === 'medusa' && !auto.current.has(hit.id) && Math.hypot(hit.pos[0] - eye.x, hit.pos[2] - eye.z) < AUTO_DIST) { auto.current.add(hit.id); onAutoInspect(hit.id); }
    // kartın konusundan uzaklaşınca kart kapanır
    if (card && !insp && Math.hypot(card.pos[0] - eye.x, card.pos[2] - eye.z) > 6) onLeave();

    // ses: dinleyici + uğultu (en yakın ilgi noktası) + bas (Medusa'ya bakış)
    let near = Infinity; for (const p of POIS) near = Math.min(near, Math.hypot(p.pos[0] - eye.x, p.pos[2] - eye.z));
    const hum = near < 5 ? (1 - near / 5) * 0.5 : 0, bass = hit?.kind === 'medusa' || insp ? 0.9 : 0;
    cisternAudio.update({ x: camera.position.x, y: camera.position.y, z: camera.position.z }, { x: fwd.x, y: fwd.y, z: fwd.z }, hum, bass);
  });
  return null;
}

/** Ana giriş: doğu duvarında kapı; gölgeli tek spot ışığı (gölge üreten/alan ikinci nesne) */
function Entrance({ shadows }: { shadows: boolean }) {
  const spot = useRef<THREE.SpotLight>(null!);
  const x = SIZE.len / 2 - 0.05, z = START.z;
  useEffect(() => { spot.current.target.position.set(x - 4, DECK_Y, z); spot.current.target.updateMatrixWorld(); }, [x, z]);
  return (
    <group>
      <mesh position={[x - 0.3, DECK_Y + 1.4, z - 1.1]} castShadow={shadows} receiveShadow={shadows}><boxGeometry args={[0.5, 2.9, 0.35]} /><meshStandardMaterial color="#3a2a1e" /></mesh>
      <mesh position={[x - 0.3, DECK_Y + 1.4, z + 1.1]} castShadow={shadows} receiveShadow={shadows}><boxGeometry args={[0.5, 2.9, 0.35]} /><meshStandardMaterial color="#3a2a1e" /></mesh>
      <mesh position={[x - 0.3, DECK_Y + 3, z]} castShadow={shadows} receiveShadow={shadows}><boxGeometry args={[0.5, 0.35, 2.6]} /><meshStandardMaterial color="#3a2a1e" /></mesh>
      <mesh position={[x - 0.02, DECK_Y + 1.4, z]} rotation={[0, -Math.PI / 2, 0]} receiveShadow={shadows}><planeGeometry args={[1.9, 2.8]} /><meshBasicMaterial color="#ffd7a3" toneMapped={false} /></mesh>
      <spotLight ref={spot} position={[x - 0.4, DECK_Y + 2.2, z]} angle={0.7} penumbra={0.7} intensity={22} distance={14} decay={1.6} color="#ffcf9a" castShadow={shadows} shadow-mapSize={[512, 512]} />
    </group>
  );
}

/* ---------- arayüz ---------- */
function Joystick({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const knob = useRef<HTMLSpanElement>(null);
  const set = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    stick.current = { x, y }; if (knob.current) knob.current.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
  };
  const reset = () => { stick.current = { x: 0, y: 0 }; if (knob.current) knob.current.style.transform = ''; };
  return (
    <div className="absolute bottom-8 left-6 z-30 grid h-28 w-28 touch-none place-items-center rounded-full border-2 border-white/60 bg-white/15" aria-label="Yürüme joystick'i"
      onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); set(e); }} onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) set(e); }} onPointerUp={reset} onPointerCancel={reset}>
      <span ref={knob} className="h-12 w-12 rounded-full bg-orange-500/90 shadow-lg" />
    </div>
  );
}
function StartCard({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 sm:place-items-center">
      <div className="w-full max-w-xl rounded-2xl bg-black/70 p-5 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">İstanbul · Sultanahmet · 532</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Yerebatan Sarnıcı: Suyun Altındaki Işık</h1>
        <p className="mt-2 text-sm text-white/80">336 sütunun arasında, platformlardan yavaşça yürü. Sütunları ve iki Medusa başını bul; nişangâh parladığında incele.</p>
        <p className="mt-2 text-xs text-white/60">{isTouch ? 'Sol joystick: yürü · sağ yarıda sürükle: bak · İncele düğmesi' : 'WASD: yürü · fare: bak · E: incele · Esc: fareyi bırak'}</p>
        <button onClick={onEnter} className="mt-4 h-12 w-full rounded-xl bg-orange-500 font-semibold">Sarnıca in</button>
      </div>
    </div>
  );
}

/** WebGL yoksa: fotoğraf + sesli anlatım */
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null), [i, setI] = useState(0);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Yerebatan_Sarn%C4%B1c%C4%B1').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  const p = POIS[i];
  return (
    <div className="fixed inset-0 bg-[#140b07] text-white">
      {img && <img src={img} alt="Yerebatan Sarnıcı" className="absolute inset-0 h-full w-full object-cover opacity-70" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <h2 className="mt-1 text-lg font-bold">{p.name}</h2><p className="mt-1 text-sm">{p.text}</p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => cisternAudio.speak(p.text)} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button>
          <button onClick={() => setI((i + 1) % POIS.length)} className="h-10 rounded-lg bg-orange-500 px-4 text-sm font-semibold">Sonraki</button>
        </div>
      </div>
    </div>
  );
}
