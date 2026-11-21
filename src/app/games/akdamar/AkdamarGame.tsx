/**
 * Akdamar — "Taştaki Hikâyeler". Ana yönetici.
 *
 * BÖLÜM 1: Gevaş iskelesinden tekneyle adaya geç. Tekne kendiliğinden ilerler; yatay sürükleme ya da A/D dümeni çevirir,
 *   batı rüzgârı tekneyi doğuya iter. İskeleye yanaşınca adaya çıkılır.
 * BÖLÜM 2: Kamera kilisenin çevresinde döner (yatay sürükle / A-D; dikey sürükle yaklaş-uzaklaş). Üstteki ipucuna uyan
 *   kabartmayı bul ve dokun. Doğru sahne bilgi kartını açar; yanlışta hangi sahneye dokunduğun söylenir.
 * Öteki oyunlarla tutarlılık: ?q=, ?debug (__akdamar), tr-TR sesli okuma (rehber kadın sesi), WebGL yoksa Vikipedi yedeği.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Anchor, Search, Ship, Volume2, VolumeX } from 'lucide-react';
import { ISLAND, LAKE_LIMIT, PIER, RELIEFS, START, TARGETS, arrived, autoRudder, reliefPos, stepBoat, type Boat, type Relief, type Scene } from './site';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { EndCard, InfoCard, NavRail, StopList, TitleCard, TopBar, WalkAudio, WikiFallback, detectTier, dprFor, pinned, supportsWebGL, wrapA, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { AlmondTrees, BoatMesh, Church, Grass, Island, Khachkars, Lake, Pier, SUN_DIR, Shore, ShoreRocks, boatRef, useMats } from './AkdamarModels';

const audio = new WalkAudio({ freq: 300, gain: 0.12 }, 'female');
type Phase = 'title' | 'boat' | 'island';
interface S { phase: Phase; listOpen: boolean; found: string[]; card: Relief | null; wrong: string | null; muted: boolean; endShown: boolean; dist: number; set: (p: Partial<S>) => void }
const INITIAL = { phase: 'title' as Phase, listOpen: false, found: [] as string[], card: null, wrong: null, endShown: false, dist: 0 };
const useDb = create<S>((set) => ({ ...INITIAL, muted: false, set: (p) => set(p) }));
const BASE = ISLAND.h - 1.2;
const newBoat = (): Boat => ({ x: START[0], z: START[1], heading: 0.05, t: 0 });
const live = { boat: newBoat(), rudder: 0, orbit: Math.PI, radius: 20, auto: false, orbitTo: null as number | null };

export default function AkdamarGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <WikiFallback wiki="Akdamar Kilisesi" alt="Akdamar Kilisesi" items={TARGETS} onExit={onExit} speak={(t) => audio.speak(t)} />;
  return <Game onExit={onExit} />;
}
function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier), S = useDb();
  const keys = useRef(new Set<string>()), drag = useRef<{ id: number; x: number; y: number; mouse: boolean } | null>(null);
  useEffect(() => { audio.setMuted(S.muted); }, [S.muted]);
  useEffect(() => () => { audio.dispose(); useDb.setState(INITIAL); Object.assign(live, { boat: newBoat(), rudder: 0, orbit: Math.PI, radius: 20, auto: false, orbitTo: null }); }, []);
  const next = TARGETS.find((t) => !S.found.includes(t.id)) ?? null;
  const pick = useCallback((id: Scene) => { const s = useDb.getState(); if (s.phase !== 'island' || s.card) return; const want = TARGETS.find((t) => !s.found.includes(t.id)), r = RELIEFS.find((x) => x.id === id)!;
    if (want && want.id === id) { audio.tone(true); s.set({ found: [...s.found, id], card: r, wrong: null }); audio.speak(`${r.name}. ${r.text}`); }
    else { audio.tone(false); s.set({ wrong: s.found.includes(id) ? `${r.name}: bunu zaten buldun.` : `Bu sahne: ${r.name}. Aradığın bu değil, kilisenin çevresinde dolaş.` }); } }, []);
  const close = useCallback(() => { useDb.getState().set({ card: null }); audio.hush(); }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); if ((e.code === 'Escape' || e.code === 'KeyE') && useDb.getState().card) close(); };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0, last = performance.now();
    const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; const k = keys.current, lr = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      if (!drag.current || drag.current.mouse) { if (useDb.getState().phase === 'boat') live.rudder = lr; else live.orbit += lr * dt * 1.2; }
      live.radius = THREE.MathUtils.clamp(live.radius + ((k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0)) * dt * 8, 13, 28); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); };
  }, [close]);
  /** Adada gezinme: sonraki/önceki cephe (90°), arkanı dön, listeden kabartmaya git; baştan başla tekneden başlatır */
  const orbitBy = useCallback((d: number) => { live.orbitTo = live.orbit + d; useDb.getState().set({ card: null, wrong: null }); }, []);
  const goRelief = useCallback((i: number) => { const t = TARGETS[i]; if (!t) return; const want = reliefPos(t).orbit; live.orbitTo = live.orbit + wrapA(want - live.orbit); live.radius = 17; useDb.getState().set({ listOpen: false, card: null, wrong: null }); }, []);
  const restart = useCallback(() => { audio.hush(); Object.assign(live, { boat: newBoat(), rudder: 0, orbit: Math.PI, radius: 20, auto: false, orbitTo: null }); useDb.setState({ ...INITIAL, phase: 'boat' }); }, []);
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __akdamar: unknown }).__akdamar = { auto: (on = true) => { live.auto = on; }, land: () => { Object.assign(live.boat, { x: PIER[0], z: PIER[1] + 10 }); }, orbit: (a: number, r = 20) => { live.orbit = a; live.radius = r; }, pick, goRelief, orbitBy, state: () => ({ ...useDb.getState(), boat: { ...live.boat } }), RELIEFS, TARGETS, reliefPos }; }, [pick, goRelief, orbitBy]);
  const onDown = (e: React.PointerEvent) => { audio.unlock(); if (useDb.getState().phase === 'title') return; drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, mouse: e.pointerType === 'mouse' }; };
  const onMove = (e: React.PointerEvent) => { const d = drag.current; if (!d || d.id !== e.pointerId) return; const ph = useDb.getState().phase;
    if (ph === 'boat') live.rudder = THREE.MathUtils.clamp((e.clientX - (d.mouse ? d.x : d.x)) / 80, -1, 1);
    else { live.orbit -= (e.clientX - d.x) * 0.006; live.radius = THREE.MathUtils.clamp(live.radius + (e.clientY - d.y) * 0.04, 13, 28); d.x = e.clientX; d.y = e.clientY; } };
  const onUp = (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) { if (useDb.getState().phase === 'boat') live.rudder = 0; drag.current = null; } };

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#dce8f0]" style={{ touchAction: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={dprFor(tier)} gl={{ antialias: tier === 'high' }} camera={{ fov: 58, near: 0.3, far: 6000, position: [-60, 20, 560] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.75; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}><World tier={tier} onPick={pick} /><SkyEnvironment sky="#cfe2ee" sun="#fff0dc" ground="#5e7a82" sunDir={[-0.5, 0.62, 0.6]} /><Polish tier={tier} /></Suspense>
      </Canvas>
      <TopBar onExit={onExit}>
        <button onClick={() => { audio.unlock(); S.set({ muted: !S.muted }); }} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white" aria-label={S.muted ? 'Sesi aç' : 'Sesi kapat'}>{S.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        {S.phase === 'boat' && <div className="mx-auto rounded-full bg-black/45 px-3 py-2 text-xs text-white"><Anchor size={12} className="mr-1 inline" />İskeleye {Math.max(0, Math.round(S.dist))} m</div>}
        {S.phase === 'island' && <div className="mx-auto max-w-[70vw] rounded-2xl bg-black/50 px-3 py-2 text-center text-xs text-white"><p className="flex items-center justify-center gap-1 font-semibold text-amber-300"><Search size={12} /> Kabartma {Math.min(S.found.length + 1, TARGETS.length)}/{TARGETS.length}</p>{next ? <p className="mt-0.5">{next.clue}</p> : <p className="mt-0.5">Bütün sahneleri buldun.</p>}</div>}
      </TopBar>
      {S.phase === 'boat' && <p className="pointer-events-none absolute bottom-6 left-1/2 w-max max-w-[92vw] -translate-x-1/2 rounded-full bg-black/40 px-4 py-1.5 text-center text-xs text-white">Sağa-sola sürükle: dümen · rüzgâr tekneyi doğuya iter<span className="hidden [@media(pointer:fine)]:inline"> · A/D</span></p>}
      {S.phase === 'island' && !S.card && <p className="pointer-events-none absolute bottom-6 left-1/2 w-max max-w-[92vw] -translate-x-1/2 rounded-full bg-black/40 px-4 py-1.5 text-center text-xs text-white">{S.wrong ?? <>Yatay sürükle: kilisenin çevresinde dön · dikey: yaklaş · kabartmaya dokun<span className="hidden [@media(pointer:fine)]:inline"> · A/D, W/S</span></>}</p>}
      {S.phase === 'island' && !S.listOpen && !S.card && <NavRail onNext={() => orbitBy(Math.PI / 2)} onPrev={() => orbitBy(-Math.PI / 2)} onTurn={() => orbitBy(Math.PI)} onList={() => S.set({ listOpen: true, card: null })} nextDisabled={false} prevDisabled={false} listLabel="Kabartma listesi" />}
      {S.listOpen && <StopList title="Kabartmalar" items={TARGETS.map((x) => ({ id: x.id, name: S.found.includes(x.id) ? x.name : x.clue, done: S.found.includes(x.id) }))} doneLabel="Bulundu" todoLabel="Henüz bulunmadı · Git: o cepheye döner (ipucu)" onGo={goRelief} onRead={(i) => { const x = TARGETS[i]; S.set({ listOpen: false, card: x }); audio.speak(`${x.name}. ${x.text}`); }} onRestart={restart} onClose={() => S.set({ listOpen: false })} />}
      {S.card && !S.listOpen && <InfoCard kicker={`Kabartma ${S.found.indexOf(S.card.id) + 1} / ${TARGETS.length}`} title={S.card.name} text={S.card.text} source={{ title: 'Wikipedia — Akdamar Kilisesi', url: 'https://tr.wikipedia.org/wiki/Akdamar_Kilisesi' }} onClose={close} />}
      {S.phase === 'title' && <TitleCard kicker="Van · Gevaş · Van Gölü" title="Akdamar: Taştaki Hikâyeler" note="Mesafeler kısaltılmıştır; kabartmalar gerçeklerinden esinlenilmiş sade çizimlerdir." cta="Tekneye bin" icon={<Ship size={18} />} onStart={() => { audio.unlock(); S.set({ phase: 'boat' }); }}>
        <p>Van Gölü’ndeki Akdamar Adası’na tekneyle geç. 10. yüzyıldan kalma kilisenin dış duvarları taşa oyulmuş hikâyelerle kaplıdır: ipuçlarını izle, doğru kabartmayı bul.</p>
        <p className="mt-2 text-xs text-white/60">Teknede sağa-sola sürükle: dümen · adada sürükle: kilisenin çevresinde dön · kabartmaya dokun</p></TitleCard>}
      {S.phase === 'island' && S.found.length === TARGETS.length && !S.endShown && !S.card && <EndCard kicker="Hikâye kuşağı tamam" title="Taştaki hikâyeleri okudun" text="Kral Gagik’ten Yunus’a, asma kuşağına kadar beş sahneyi buldun. Kilise 2005–2007’deki restorasyondan sonra müze olarak açıldı." onStay={() => S.set({ endShown: true })} onExit={onExit} />}
    </div>
  );
}

/* ---------- 3B dünya (modeller: AkdamarModels.tsx) ---------- */
function World({ tier, onPick }: { tier: Tier; onPick: (id: Scene) => void }) {
  const m = useMats(), g = useRef<THREE.Group>(null), { scene } = useThree(), found = useDb((s) => s.found);
  useEffect(() => { scene.environmentIntensity = 0.4; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[-500, 620, 600]} turbidity={2.5} rayleigh={2.2} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#d4e2ea', 520, 5600]} />
      <hemisphereLight args={['#d2e4f0', '#5e7a82', 0.4]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={6.5} color="#fff0dc" />
      {tier !== 'low' && <Clouds />}
      <Lake />
      <Shore />
      <Island tier={tier} />
      <ShoreRocks m={m} n={tier === 'low' ? 40 : 110} />
      <Church m={m} found={found} onPick={onPick} />
      <Khachkars m={m} />
      <AlmondTrees n={tier === 'low' ? 24 : 55} />
      {tier !== 'low' && <Grass n={tier === 'high' ? 5000 : 2600} />}
      <Pier m={m} />
      <BoatMesh />
      <Controller />
    </group>
  );
}

/* ---------- tekne + kamera ---------- */
const _m = new THREE.Matrix4(), _l = new THREE.Vector3(), _q = new THREE.Quaternion(), _p = new THREE.Vector3();
function Controller() {
  const { camera } = useThree(), sm = useRef({ pos: new THREE.Vector3(-60, 20, 560), look: new THREE.Vector3(0, 10, 0), splash: 0, lastDist: -1 });
  useFrame((st, raw) => {
    const dt = Math.min(raw, 0.05), S = useDb.getState(), t = st.clock.elapsedTime, k = 1 - Math.exp(-dt * 2.5);
    const b = live.boat, bob = Math.sin(t * 1.6) * 0.18;
    if (S.phase === 'boat') {
      live.boat = stepBoat(b, live.auto ? autoRudder(b) : live.rudder, dt);
      const d = Math.hypot(live.boat.x, live.boat.z); if (d > LAKE_LIMIT) { live.boat.x *= LAKE_LIMIT / d; live.boat.z *= LAKE_LIMIT / d; }
      if (Math.hypot(live.boat.x, live.boat.z * 1.2) < ISLAND.r + 2 && !arrived(live.boat)) { live.boat.x -= Math.sin(live.boat.heading) * 9 * dt * 2; live.boat.z += Math.cos(live.boat.heading) * 9 * dt * 2; }   // kayalara çarpmasın
      const dist = Math.hypot(live.boat.x - PIER[0], live.boat.z - PIER[1]); if (Math.abs(dist - sm.current.lastDist) > 4) { sm.current.lastDist = dist; S.set({ dist }); }
      if (arrived(live.boat)) { S.set({ phase: 'island' }); audio.tone(true); audio.speak('Akdamar Adası’na hoş geldin. Kilisenin duvarlarındaki hikâyeleri bul.'); }
    }
    const B = live.boat; if (boatRef.current) { boatRef.current.position.set(B.x, bob, B.z); boatRef.current.rotation.set(Math.sin(t * 1.1) * 0.04, -B.heading, Math.sin(t * 1.3) * 0.05); }
    if (S.phase === 'title') { camera.position.set(-140, 40, 300); camera.quaternion.copy(_q.setFromRotationMatrix(_m.lookAt(camera.position, _l.set(0, 14, 0), THREE.Object3D.DEFAULT_UP))); return; }
    if (S.phase === 'boat') { const fx = Math.sin(B.heading), fz = -Math.cos(B.heading); _p.set(B.x - fx * 16, 7, B.z - fz * 16); _l.set(B.x + fx * 30, 3, B.z + fz * 30); }
    else { if (live.orbitTo !== null) { live.orbit += (live.orbitTo - live.orbit) * (1 - Math.exp(-dt * 3)); if (Math.abs(live.orbitTo - live.orbit) < 0.01) live.orbitTo = null; } else if (S.card) { const want = reliefPos(S.card).orbit; live.orbit += wrapA(want - live.orbit) * k; }
      _p.set(Math.sin(live.orbit) * live.radius, BASE + 4.5 + (live.radius - 13) * 0.25, -Math.cos(live.orbit) * live.radius); _l.set(0, BASE + 6.2, 0); }
    sm.current.pos.lerp(_p, S.phase === 'boat' ? k : 1 - Math.exp(-dt * 8)); sm.current.look.lerp(_l, k);
    camera.position.copy(sm.current.pos); camera.quaternion.copy(_q.setFromRotationMatrix(_m.lookAt(camera.position, sm.current.look, THREE.Object3D.DEFAULT_UP)));
  });
  return null;
}
