/**
 * Topkapı Sarayı — "Harem'in Fısıltıları & Hazine'nin Sırrı". Ana oyun yöneticisi.
 *
 * "Görünmez rehber": serbest yürüyüş ve serbest kamera yok. Oyuncu önceden tanımlı rotada ileri/geri gider; parlayan bir nesneye
 * yaklaşınca nesne fısıldar, biraz daha yaklaşınca kamera kendiliğinden yakınlaşır ve anlatım başlar (ObjectInteractionSystem).
 * Kamera kipleri: kapı ve odalar birinci şahıs + sınırlı bakış; avlular kendiliğinden süzülen kuş bakışı; Harem koridoru dar açı + hafif titreme.
 * Portal ayıklama: iç bölümde her 0,1 sn'de palace.visibleRooms çağrılır; yalnızca bulunulan oda ve kapı açıklığından görünen odalar
 * tam ayrıntıyla çizilir, diğerleri tek kutuluk yer tutucudur.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { create } from 'zustand';
import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink, Eye, RotateCw, Volume2, VolumeX, X } from 'lucide-react';
import { CHAPTERS, CHAPTER_LABEL, RAILS, ROOMS, THINGS, roomAt, thingsOf, visibleRooms, type Chapter, type RoomId, type Thing, type V3 } from './palace';
import { dragToYaw, inspectEye, nearestThing, pulse, twoFingerAngle, type Phase } from './ObjectInteractionSystem';
import { Courtyards, ImperialGate, Outdoors } from './ImperialGate';
import { InteriorRooms } from './HaremCorridor';
import { TreasureRoom } from './TreasureRoom';
import { topkapiAudio, type Mix } from './AudioManager';

type Tier = 'low' | 'medium' | 'high';
const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const isTouch = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches;
function detectTier(): Tier {
  const q = new URLSearchParams(location.search).get('q'); if (q === 'low' || q === 'medium' || q === 'high') return q;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low';
  return isTouch ? 'medium' : 'high';
}

/* ---------- durum (Zustand) ---------- */
interface S { chapter: Chapter | 'baslangic' | 'son'; seen: string[]; muted: boolean; inspect: Thing | null; whisper: Thing | null; go: (c: S['chapter']) => void; see: (id: string) => void; set: (p: Partial<S>) => void }
const useTopkapi = create<S>((set) => ({
  chapter: 'baslangic', seen: [], muted: false, inspect: null, whisper: null,
  go: (chapter) => set({ chapter, inspect: null, whisper: null }), see: (id) => set((s) => (s.seen.includes(id) ? s : { seen: [...s.seen, id] })), set: (p) => set(p),
}));

export default function TopkapiGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}

interface Shared { s: React.MutableRefObject<number>; move: React.MutableRefObject<number>; look: React.MutableRefObject<{ yaw: number; pitch: number }>; spin: React.MutableRefObject<number>; active: React.MutableRefObject<string | null>; glow: React.MutableRefObject<number> }
const jump: { u: number | null; c: string } = { u: null, c: '' };   // yalnızca ?debug
const SPEED = 3.5, LOOK_YAW = 1.75, LOOK_PITCH = 0.7, LOOK_SENS = 0.8;

function Game({ onExit }: { onExit: () => void }) {
  const st = useTopkapi();
  const [tier] = useState<Tier>(detectTier), [saver, setSaver] = useState(false);
  const [visible, setVisible] = useState<RoomId[]>(['divan']);
  const [room, setRoom] = useState<RoomId>('divan');
  const [atEnd, setAtEnd] = useState(false), [label, setLabel] = useState<string | null>(null), [fade, setFade] = useState(false);
  const sh: Shared = { s: useRef(0), move: useRef(0), look: useRef({ yaw: 0, pitch: 0 }), spin: useRef(0), active: useRef<string | null>(null), glow: useRef(0) };
  sh.active.current = st.inspect?.id ?? null;
  const fx = !saver && tier !== 'low';   // buhar ve mücevher pırıltısı (pil düşükse kapalı)

  useEffect(() => {
    type B = EventTarget & { level: number; charging: boolean }; let b: B | null = null; const check = () => b && setSaver(b.level < 0.2 && !b.charging);
    (navigator as Navigator & { getBattery?: () => Promise<B> }).getBattery?.().then((x) => { b = x; check(); x.addEventListener('levelchange', check); x.addEventListener('chargingchange', check); }).catch(() => {});
    return () => { b?.removeEventListener('levelchange', check); b?.removeEventListener('chargingchange', check); };
  }, []);
  useEffect(() => { topkapiAudio.setMuted(st.muted); }, [st.muted]);
  useEffect(() => { const m: Mix = st.chapter === 'ic' ? room : st.chapter === 'hazine' ? 'hazine' : 'dis'; topkapiAudio.setMix(m); }, [st.chapter, room]);
  useEffect(() => { topkapiAudio.setListening(st.inspect?.mode === 'listen'); }, [st.inspect]);
  useEffect(() => () => { topkapiAudio.dispose(); useTopkapi.setState({ chapter: 'baslangic', seen: [], inspect: null, whisper: null }); }, []);
  // fısıltı: nesne ilk kez "seslenince"
  useEffect(() => { if (st.whisper) topkapiAudio.whisper(); }, [st.whisper]);

  const go = useCallback((c: S['chapter']) => { setFade(true); topkapiAudio.hush(); setTimeout(() => { sh.s.current = 0; sh.look.current = { yaw: 0, pitch: 0 }; setAtEnd(false); setLabel(null); useTopkapi.getState().go(c); setTimeout(() => setFade(false), 150); }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const open = useCallback((t: Thing) => { topkapiAudio.chime(); topkapiAudio.speak(t.text); sh.spin.current = 0; useTopkapi.getState().set({ inspect: t, whisper: null }); useTopkapi.getState().see(t.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const close = useCallback(() => { topkapiAudio.hush(); useTopkapi.getState().set({ inspect: null }); }, []);
  const next = () => { const i = CHAPTERS.indexOf(st.chapter as Chapter); go(i < CHAPTERS.length - 1 ? CHAPTERS[i + 1] : 'son'); };
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __top: unknown }).__top = { go: (c: S['chapter'], u = 0) => { jump.u = u; jump.c = c; useTopkapi.getState().go(c); }, open: (id: string) => open(THINGS.find((t) => t.id === id)!) }; });

  // girdiler
  const keys = useRef(new Set<string>()), btn = useRef(0);
  useEffect(() => {
    const sync = () => { const k = keys.current; sh.move.current = Math.max(-1, Math.min(1, (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) + btn.current)); };
    const down = (e: KeyboardEvent) => { keys.current.add(e.code); if (e.code === 'KeyE' && !e.repeat) { const s = useTopkapi.getState(); if (s.inspect) close(); else if (s.whisper) open(s.whisper); } if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault(); sync(); };
    const up = (e: KeyboardEvent) => { keys.current.delete(e.code); sync(); };
    addEventListener('keydown', down); addEventListener('keyup', up); const id = setInterval(sync, 60);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, close]);
  // sürükleme: normalde bakış; "rotate" incelemesinde nesneyi çevirir. İki parmak: açı farkı kadar döndürür.
  const ptrs = useRef(new Map<number, { x: number; y: number }>()), twist = useRef<number | null>(null);
  const onDown = (e: React.PointerEvent) => { topkapiAudio.unlock(); ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); twist.current = null; };
  const onMove = (e: React.PointerEvent) => {
    const p = ptrs.current.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const insp = useTopkapi.getState().inspect;
    if (insp?.mode === 'rotate') {
      if (ptrs.current.size >= 2) { const [a, b] = [...ptrs.current.values()], ang = twoFingerAngle(a, b); if (twist.current !== null) sh.spin.current += ang - twist.current; twist.current = ang; }
      else sh.spin.current += dragToYaw(dx, innerWidth);
      return;
    }
    if (insp) return;
    const k = (2.6 * LOOK_SENS) / Math.max(360, innerWidth), l = sh.look.current;
    l.yaw = Math.max(-LOOK_YAW, Math.min(LOOK_YAW, l.yaw + dx * k)); l.pitch = Math.max(-LOOK_PITCH, Math.min(LOOK_PITCH, l.pitch - dy * k));
  };
  const onUp = (e: React.PointerEvent) => { ptrs.current.delete(e.pointerId); twist.current = null; };
  const hold = (v: number) => ({ onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); btn.current = v; }, onPointerUp: () => { btn.current = 0; }, onPointerLeave: () => { btn.current = 0; }, onPointerCancel: () => { btn.current = 0; } });

  const ch = st.chapter, playing = ch !== 'baslangic' && ch !== 'son', rail = ch === 'kapi' || ch === 'ic' || ch === 'hazine';
  const idx = CHAPTERS.indexOf(ch as Chapter);
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#120d09] text-white" style={{ touchAction: 'none' }}>
      <Canvas dpr={tier === 'low' ? 1 : [1, 1.6]} gl={{ antialias: tier !== 'low', powerPreference: 'high-performance' }} camera={{ fov: 60, near: 0.05, far: 700, position: [-34, 1.62, 0] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}>
        <Suspense fallback={null}>
          {(ch === 'baslangic' || ch === 'kapi' || ch === 'son') && <><Outdoors /><ImperialGate glow={sh.glow} /></>}
          {ch === 'baslangic' && <Still pos={[-30, 3.2, 9]} look={[-3, 6, 0]} />}
          {ch === 'son' && <Still pos={[-22, 2, -6]} look={[-3, 6.5, 0]} />}
          {ch === 'avlu' && <><Outdoors fogFar={620} /><Courtyards trees={tier === 'low' ? 40 : 110} onLabel={setLabel} onEnd={() => setAtEnd(true)} /></>}
          {ch === 'ic' && <><Indoors room={room} steam={fx} /><InteriorRooms visible={visible} tier={tier} steam={fx} /></>}
          {ch === 'hazine' && <><Indoors room="hazine" steam={false} /><TreasureRoom spin={sh.spin} active={sh.active} fancy={fx} /></>}
          {rail && <RailPlayer key={ch} chapter={ch} sh={sh} onEnd={setAtEnd} onRoom={setRoom} onVisible={setVisible} onAuto={open} />}
          {rail && thingsOf(ch).filter((t) => t.id !== 'tugra').map((t) => <Glow key={t.id} t={t} />)}
        </Suspense>
      </Canvas>

      {rail && <div className="absolute inset-0" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />}

      {/* üst çubuk */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3">
        <button onClick={onExit} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/55" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
        <button onClick={() => { topkapiAudio.unlock(); st.set({ muted: !st.muted }); }} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/55" aria-label={st.muted ? 'Sesi aç' : 'Sesi kapat'}>{st.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        {playing && (
          <div className="mx-auto flex flex-col items-center gap-1 rounded-2xl bg-black/55 px-4 py-2">
            <div className="flex gap-1">{CHAPTERS.map((c, i) => <span key={c} className={`h-1.5 w-9 rounded-full ${i < idx ? 'bg-amber-300' : i === idx ? 'bg-white' : 'bg-white/25'}`} />)}</div>
            <p className="text-xs">{CHAPTER_LABEL[ch as Chapter]}{ch === 'ic' ? ` · ${ROOMS.find((r) => r.id === room)!.name}` : ''} · {st.seen.length}/{THINGS.length}</p>
          </div>
        )}
      </div>

      {/* fısıltı */}
      {st.whisper && !st.inspect && (
        <div className="absolute inset-x-0 bottom-28 flex flex-col items-center gap-2 px-4">
          <p className="max-w-md text-center text-lg italic text-amber-100 drop-shadow-[0_2px_6px_rgba(0,0,0,.9)]">“{st.whisper.whisper}”</p>
          <button onClick={() => open(st.whisper!)} className="inline-flex h-11 items-center gap-2 rounded-full bg-amber-500 px-4 text-sm font-semibold text-black"><Eye size={16} /> {st.whisper.name}</button>
        </div>
      )}
      {st.inspect && <InfoPanel t={st.inspect} onClose={close} />}
      {st.inspect && <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_220px_80px_rgba(0,0,0,.85)]" />}
      {ch === 'avlu' && label && <p className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-4 py-1.5 text-sm">{label}</p>}

      {rail && !st.inspect && (
        <div className="absolute bottom-6 left-5 flex flex-col gap-2">
          <button {...hold(1)} className="grid h-14 w-14 place-items-center rounded-full bg-white/20 backdrop-blur active:bg-white/35" aria-label="İleri"><ChevronUp /></button>
          <button {...hold(-1)} className="grid h-14 w-14 place-items-center rounded-full bg-white/20 backdrop-blur active:bg-white/35" aria-label="Geri"><ChevronDown /></button>
        </div>
      )}
      {playing && !st.inspect && (atEnd || ch === 'avlu') && (
        <button onClick={next} className="absolute bottom-6 left-1/2 h-12 -translate-x-1/2 rounded-xl bg-brand px-6 font-semibold shadow-lg">
          {ch === 'kapi' ? 'Avlulara geç' : ch === 'avlu' ? (atEnd ? 'Divan’a gir' : 'Geç: Divan’a gir') : ch === 'ic' ? 'Hazineye geç' : 'Bitir'}
        </button>
      )}
      {rail && !atEnd && !st.inspect && !st.whisper && <p className="pointer-events-none absolute bottom-7 left-1/2 hidden -translate-x-1/2 rounded-full bg-black/45 px-4 py-1.5 text-xs sm:block">W/S: ilerle · sürükle: bak · parlayan nesneye yaklaş</p>}

      {ch === 'baslangic' && <Card title="Topkapı Sarayı: Harem’in Fısıltıları & Hazine’nin Sırrı" eyebrow="İstanbul · UNESCO Dünya Mirası · 1459" text="Sarayın duvarları konuşur. Bâb-ı Hümâyun’dan gir, avluların üzerinden süzül, Divan’da kafesin ardını dinle, Harem’in koridorlarından geç ve hazinedeki iki ünlü parçayı elinde çevir. Parlayan nesnelere yaklaşman yeter." button="Kapıya yürü" onClick={() => { topkapiAudio.unlock(); go('kapi'); }} />}
      {ch === 'son' && <Card title="Saray sustu" eyebrow={`${st.seen.length}/${THINGS.length} nesne dinlendi`} text="Kapıdan hazineye kadar sarayın sesini izledin. Buradaki mekânlar ve nesneler stilize canlandırmalardır; gerçek saray çok daha büyük ve katmanlıdır." button="Yeniden başla" onClick={() => { useTopkapi.setState({ seen: [] }); go('kapi'); }} second={{ label: 'Haritaya dön', onClick: onExit }} />}
      <div className={`pointer-events-none absolute inset-0 z-50 bg-black transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
    </div>
  );
}

/* ---------- sahne yardımcıları ---------- */
function Still({ pos, look }: { pos: V3; look: V3 }) { const { camera } = useThree(); useFrame(({ clock }) => { camera.position.set(pos[0] + Math.sin(clock.elapsedTime * 0.15) * 1.5, pos[1], pos[2]); camera.lookAt(...look); }); return null; }
/** İç mekân: koyu arka plan; hamamda buhar sisi (pil tasarrufunda kapalı) */
function Indoors({ room, steam }: { room: RoomId | 'hazine'; steam: boolean }) {
  const { scene } = useThree();
  useEffect(() => { const c = room === 'hazine' ? '#0b0d12' : '#120d09'; scene.background = new THREE.Color(c); scene.fog = room === 'hamam' && steam ? new THREE.FogExp2('#d9d6cf', 0.11) : new THREE.FogExp2(c, 0.012); return () => { scene.fog = null; }; }, [scene, room, steam]);
  return null;
}
/** Parlayan nesne işareti: evreye göre nabız */
function Glow({ t }: { t: Thing }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock, camera }) => {
    const s = useTopkapi.getState(), phase: Phase = s.inspect?.id === t.id ? 'inspect' : s.whisper?.id === t.id ? 'whisper' : 'far', seen = s.seen.includes(t.id);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = (seen ? 0.12 : 0.45) * pulse(clock.elapsedTime, phase) * (phase === 'inspect' ? 0 : 1);
    ref.current.quaternion.copy(camera.quaternion);
  });
  return <mesh ref={ref} position={t.pos}><ringGeometry args={[0.16, 0.22, 28]} /><meshBasicMaterial color="#ffd27a" transparent depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>;
}

/* ---------- raylı kamera + yaklaşma algılama + portal ayıklama ---------- */
function RailPlayer({ chapter, sh, onEnd, onRoom, onVisible, onAuto }: { chapter: 'kapi' | 'ic' | 'hazine'; sh: Shared; onEnd: (b: boolean) => void; onRoom: (r: RoomId) => void; onVisible: (v: RoomId[]) => void; onAuto: (t: Thing) => void }) {
  const { camera } = useThree();
  const curve = useMemo(() => new THREE.CatmullRomCurve3(RAILS[chapter].map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.2), [chapter]);
  const L = useMemo(() => curve.getLength(), [curve]), things = useMemo(() => thingsOf(chapter), [chapter]);
  const V = useMemo(() => ({ eye: new THREE.Vector3(), tan: new THREE.Vector3(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, 'YXZ'), m: new THREE.Matrix4(), up: new THREE.Vector3(0, 1, 0), ip: new THREE.Vector3(), tp: new THREE.Vector3(), dir: new THREE.Vector3() }), []);
  const R = useRef({ blend: 0, last: null as Thing | null, fov: 60, end: false, room: '' as string, vis: '', tick: 0 });
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.1), S = useTopkapi.getState(), insp = S.inspect, r = R.current;
    if (jump.u !== null && jump.c === chapter) { sh.s.current = jump.u * L; jump.u = null; }   // ?debug atlaması: oran → metre
    if (!insp) sh.s.current = Math.max(0, Math.min(L, sh.s.current + sh.move.current * SPEED * dt));
    const u = sh.s.current / L; curve.getPointAt(u, V.eye); curve.getTangentAt(u, V.tan);
    const room = chapter === 'ic' ? roomAt(V.eye.x) : null, baseFov = room?.fov ?? 60, shake = room?.shake ?? 0, t = clock.elapsedTime;
    // Harem koridoru: hafif titrek kamera (düşük frekanslı, küçük genlik; mide bulandırmayacak kadar)
    V.eye.y += Math.sin(sh.s.current * 4.2) * 0.012 + shake * (Math.sin(t * 5.3) * 0.006 + Math.sin(t * 11.7) * 0.003); V.eye.z += shake * Math.sin(t * 3.1) * 0.008;
    const l = sh.look.current, yaw = Math.atan2(-V.tan.x, -V.tan.z) - l.yaw + shake * Math.sin(t * 2.3) * 0.006;
    V.e.set(l.pitch + shake * Math.sin(t * 4.1) * 0.004, yaw, shake * Math.sin(t * 1.9) * 0.006); V.q.setFromEuler(V.e);

    // yaklaşma algılama: fısıltı → kendiliğinden inceleme
    const eye: V3 = [V.eye.x, V.eye.y, V.eye.z];
    if (!insp) { const n = nearestThing(eye, things, S.seen); if ((n?.phase === 'inspect') && n) onAuto(n.thing); else { const w = n?.thing ?? nearestThing(eye, things, [])?.thing ?? null; if ((w?.id ?? null) !== (S.whisper?.id ?? null)) S.set({ whisper: w }); } }
    if (chapter === 'kapi') { const d = Math.hypot(V.eye.x + 3, V.eye.z); sh.glow.current += ((insp ? 1 : d < 22 ? 0.25 + 0.2 * Math.sin(t * 3) : 0) - sh.glow.current) * 0.1; }

    // inceleme: göze yaklaşma + görüş daralması (macro'da çok dar açı)
    if (insp) r.last = insp; r.blend += ((insp ? 1 : 0) - r.blend) * (1 - Math.exp(-dt * 2));
    let fov = baseFov;
    if (r.blend > 0.002 && r.last) {
      const ie = inspectEye(r.last, eye); V.ip.set(...ie); V.tp.set(...r.last.pos); V.m.lookAt(V.ip, V.tp, V.up); V.q2.setFromRotationMatrix(V.m);
      camera.position.copy(V.eye).lerp(V.ip, r.blend); camera.quaternion.copy(V.q).slerp(V.q2, r.blend); fov = THREE.MathUtils.lerp(baseFov, r.last.fov, r.blend);
    } else { camera.position.copy(V.eye); camera.quaternion.copy(V.q); }
    r.fov += (fov - r.fov) * (1 - Math.exp(-dt * 4)); const cam = camera as THREE.PerspectiveCamera; if (Math.abs(cam.fov - r.fov) > 0.02) { cam.fov = r.fov; cam.updateProjectionMatrix(); }

    // portal ayıklama (0,1 sn'de bir): görüş yönü yaw = 0 → +x
    if (room && t - r.tick > 0.1) {
      r.tick = t; camera.getWorldDirection(V.dir);
      const hfov = 2 * Math.atan(Math.tan((cam.fov * Math.PI) / 360) * cam.aspect) * (180 / Math.PI);
      const vis = visibleRooms(eye, Math.atan2(V.dir.z, V.dir.x), hfov), key = vis.join();
      if (key !== r.vis) { r.vis = key; onVisible(vis); }
      if (room.id !== r.room) { r.room = room.id; onRoom(room.id); }
      topkapiAudio.listener(eye, [V.dir.x, V.dir.y, V.dir.z]);
    }
    const end = u > 0.985; if (end !== r.end) { r.end = end; onEnd(end); }
  });
  return null;
}

/* ---------- arayüz ---------- */
function InfoPanel({ t, onClose }: { t: Thing; onClose: () => void }) {
  return (
    <div className="absolute right-3 top-16 z-30 w-[min(24rem,calc(100%-1.5rem))] animate-fade-up rounded-2xl bg-black/80 p-4 shadow-2xl backdrop-blur" role="dialog" aria-label={t.name}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">{t.era}</p>
      <h3 className="text-lg font-bold">{t.name}</h3>
      <p className="mt-1 text-sm text-white/85">{t.text}</p>
      {t.mode === 'rotate' && <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-200"><RotateCw size={13} /> Sürükle ya da iki parmakla çevir</p>}
      {t.mode === 'listen' && <p className="mt-2 text-xs text-amber-200">Kulak ver: sesler bulundukları yönden gelir (kulaklık önerilir). Sözcükler anlaşılmaz; bu bir canlandırmadır.</p>}
      <a href={t.source.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-xs text-white/60 underline">{t.source.title} <ExternalLink size={12} /></a>
      <button onClick={onClose} className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-white/15 text-sm font-semibold"><X size={16} /> Devam et <span className="text-white/50">(E)</span></button>
    </div>
  );
}
function Card({ title, eyebrow, text, button, onClick, second }: { title: string; eyebrow: string; text: string; button: string; onClick: () => void; second?: { label: string; onClick: () => void } }) {
  return (
    <div className="absolute inset-0 grid place-items-end bg-gradient-to-t from-black/85 via-black/30 to-transparent p-4 sm:place-items-center">
      <div className="w-full max-w-xl rounded-2xl bg-black/70 p-5 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-white/80">{text}</p>
        <div className="mt-4 flex gap-2">
          {second && <button onClick={second.onClick} className="h-12 flex-1 rounded-xl border border-white/30 font-semibold">{second.label}</button>}
          <button onClick={onClick} className="h-12 flex-1 rounded-xl bg-brand font-semibold">{button}</button>
        </div>
      </div>
    </div>
  );
}
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null), [i, setI] = useState(0);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Topkap%C4%B1_Saray%C4%B1').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  const t = THINGS[i];
  return (
    <div className="fixed inset-0 bg-[#120d09] text-white">
      {img && <img src={img} alt="Topkapı Sarayı" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <h2 className="mt-1 text-lg font-bold">{t.name}</h2><p className="mt-1 text-sm">{t.text}</p>
        <div className="mt-3 flex gap-2"><button onClick={() => topkapiAudio.speak(t.text)} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button><button onClick={() => setI((i + 1) % THINGS.length)} className="h-10 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-black">Sonraki</button></div>
      </div>
    </div>
  );
}
