/**
 * Ani — "Bin Bir Kilise Kenti". Ana yönetici.
 *
 * Oyuncu belgeleme ekibinin fotoğrafçısıdır. Aslanlı Kapı'dan girer, plato boyunca güneye yürür:
 * surlar → Katedral → Ebul Menuçehr Camii → Tigran Honents → Arpaçay Köprüsü kalıntısı → Kız Kalesi.
 * MEKANİK: her noktada "Vizörü aç (E)" çıkar (kendiliğinden açılmaz); vizörde yapıyı ekranın ortasına (yatay yön) alınca deklanşör yanar, çekince albüme girer ve kart açılır.
 * KAMERA: birinci şahıs, rotaya kilitli (Troya, Efes ile aynı şema).
 */
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Camera, ChevronRight, Footprints, MousePointer2 } from 'lucide-react';
import { ROUTE_LEN, SHOTS, AIM_TOL, aimError, nearShot, routeAt, type Shot } from './site';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { Controls, EndCard, GameMenu, Hint, HudTheme, InfoCard, InteractPrompt, NavRail, Objective, StopList, TitleCard, TopBar, WalkAudio, useAudioSettings, WikiFallback, detectTier, dprFor, newLive, pinned, stepWalk, supportsWebGL, useWalkInput, wrapA, type CamState, type Tier } from '../shared/walkKit';
import { Bridge, Cathedral, Clouds, Columns, FarHills, Grass, SUN_DIR, Sun, HalfChurch, MaidenCastle, Mosque, River, RoundChurch, Rubble, Ruins, Terrain, Tigran, Walls, useMats } from './AniModels';

const audio = new WalkAudio({ freq: 420, gain: 0.11 }, 'female');
interface S { started: boolean; albumOpen: boolean; album: string[]; near: Shot | null; framed: boolean; vf: boolean; card: Shot | null; flash: number; muted: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, albumOpen: false, album: [] as string[], near: null, framed: false, vf: false, card: null, flash: 0, endShown: false };
const useDb = create<S>((set) => ({ ...INITIAL, muted: false, set: (p) => set(p) }));
const live = newLive();
const pause = { on: false };   // ≡ menü açıkken oyun durur

/** Duraklar arası otomatik yürüyüş (önceki / sonraki / albümden git): hedef s */
const nav = { to: null as number | null, turn: 0, speed: 18 };
const nextIdx = () => SHOTS.findIndex((x) => x.s > live.s + 3), prevIdx = () => { for (let i = SHOTS.length - 1; i >= 0; i--) if (SHOTS[i].s < live.s - 3) return i; return -1; };

export default function AniGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <WikiFallback wiki="Ani" alt="Ani" items={SHOTS} onExit={onExit} speak={(t) => audio.speak(t)} />;
  return <Game onExit={onExit} />;
}
function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier), S = useDb();
  useAudioSettings(audio);
  useEffect(() => () => { audio.dispose(); useDb.setState(INITIAL); Object.assign(live, newLive()); nav.to = null; nav.turn = 0; }, []);
  const close = useCallback(() => { useDb.getState().set({ card: null }); audio.hush(); }, []);
  const shoot = useCallback(() => { const s = useDb.getState(), n = s.near; if (!n || !s.framed || s.album.includes(n.id)) return;
    audio.click(); audio.tone(true); s.set({ album: [...s.album, n.id], card: n, flash: Date.now() }); audio.speak(`${n.name}. ${n.text}`); }, []);
  const input = useWalkInput(live, () => useDb.getState().started, (e) => { const s = useDb.getState(); if ((e.code === 'Escape' || e.code === 'KeyE') && s.card) close(); else if (e.code === 'Escape' && s.vf) s.set({ vf: false }); else if (e.code === 'KeyE' && s.near && !s.album.includes(s.near.id)) { if (s.vf) shoot(); else s.set({ vf: true }); } if (e.code === 'Space' || e.code === 'Enter') shoot(); }, () => audio.unlock(), () => { const s = useDb.getState(); return s.started && !s.card && !s.albumOpen; });
  const pending = S.near && !S.album.includes(S.near.id) && !S.card && !S.albumOpen;   // vizör yalnızca oyuncu açınca (E) görünür
  const goTo = useCallback((i: number) => { if (i < 0 || i >= SHOTS.length) return; nav.to = SHOTS[i].s; nav.speed = Math.max(18, Math.abs(nav.to - live.s) / 3); useDb.getState().set({ card: null, albumOpen: false }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); Object.assign(live, newLive()); nav.to = null; useDb.setState({ ...INITIAL, started: true }); }, []);
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __ani: unknown }).__ani = { go: (s: number) => { live.s = s; useDb.getState().set({ started: true }); }, look: (y: number, p = 0) => { live.yaw = y; live.pitch = p; }, shoot, goTo, state: () => ({ ...useDb.getState(), s: live.s, yaw: live.yaw, pitch: live.pitch }), SHOTS, ROUTE_LEN }; }, [shoot, goTo]);
  const lastTap = useRef(0);
  const onDown = (e: React.PointerEvent) => { input.onPointerDown(e); if (e.pointerType !== 'mouse' && useDb.getState().started) { const t = performance.now(); if (t - lastTap.current < 300) goTo(nextIdx()); lastTap.current = t; } };
  const nI = S.started ? nextIdx() : -1, pI = S.started ? prevIdx() : -1, nextShot = SHOTS.find((x) => !S.album.includes(x.id));

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#dfe6ea]" style={{ touchAction: 'none' }} {...input} onPointerDown={onDown} onPointerCancel={input.onPointerUp}>
      <HudTheme theme={THEME}>
      <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={dprFor(tier)} gl={{ antialias: tier === 'high' }} camera={{ fov: 62, near: 0.1, far: 2200, position: [60, 30, -260] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.72; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}><World tier={tier} /><SkyEnvironment sky="#cfdde6" sun="#ffe9cc" ground="#a59a68" sunDir={[-0.84, 0.42, -0.2]} /><Polish tier={tier} /></Suspense>
      </Canvas>
      <TopBar onExit={onExit} objective={S.started ? <Objective icon={<Camera size={15} />} label={nextShot ? `Sıradaki: ${nextShot.name}` : 'Albüm tamam'} done={S.album.length} total={SHOTS.length} /> : undefined} menu={<GameMenu onPause={(v) => { pause.on = v; }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
      {S.started && !S.albumOpen && <NavRail onNext={() => goTo(nI)} onPrev={() => goTo(pI)} onTurn={() => { nav.turn += Math.PI; }} onList={() => S.set({ albumOpen: true, card: null })} nextDisabled={nI < 0} prevDisabled={pI < 0} listLabel="Belge albümü" />}
      {S.albumOpen && <StopList title="Belge albümü" items={SHOTS.map((x) => ({ id: x.id, name: x.name, done: S.album.includes(x.id) }))} doneLabel="Fotoğraflandı" todoLabel="Henüz çekilmedi" onGo={goTo} onRead={(i) => { const x = SHOTS[i]; S.set({ albumOpen: false, card: x }); audio.speak(`${x.name}. ${x.text}`); }} onRestart={restart} onClose={() => S.set({ albumOpen: false })} />}
      {pending && !S.vf && <InteractPrompt icon={<Camera size={18} />} label={`Vizörü aç: ${S.near!.name}`} onClick={() => S.set({ vf: true })} />}
      {pending && S.vf && <Viewfinder name={S.near!.name} framed={S.framed} onShoot={shoot} />}
      {S.flash > 0 && <Flash key={S.flash} />}
      {S.started && !pending && !S.card && <Hint>Dikey sürükle: yürü · yatay: bak · çift dokun: sonraki durak<span className="hidden [@media(pointer:fine)]:inline"> · W/S yürü · tıkla, fareyle bak (Esc: bırak) · Boşluk: çek</span></Hint>}
      {S.card && !S.albumOpen && <InfoCard kicker={`Fotoğraf ${S.album.indexOf(S.card.id) + 1} / ${SHOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} />}
      {!S.started && <TitleCard kicker="Kars · Arpaçay kıyısı · UNESCO Dünya Mirası" title="Ani: Bin Bir Kilise Kenti" note="Plan stilizedir; yapılar ve kanyonlar ölçekli değildir." cta="Surlardan gir" icon={<Camera size={18} />} onExit={onExit} controls={CONTROLS} onStart={() => { audio.unlock(); S.set({ started: true }); }}>
        <p>İki kanyonun arasındaki platoda kurulmuş Ortaçağ başkenti Ani’yi belgeleme ekibinin fotoğrafçısı olarak gez. Her yapının yanında vizör açılır: yapıyı ortala, deklanşöre bas, albümü doldur.</p></TitleCard>}
      {S.started && S.album.length === SHOTS.length && !S.endShown && !S.card && <EndCard kicker="Belge albümü tamam" title="Ani kayda geçti" text="Surlardan Kız Kalesi’ne kadar kentin altı yapısını belgeledin. Ani’de bunlardan çok daha fazlası var: ‘bin bir kilise’ deyişi abartılı olsa da kentte onlarca yapı kalıntısı durur." onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}

/* ---------- arayüz: gezinme düğmeleri, albüm, vizör ve flaş ---------- */
function Viewfinder({ name, framed, onShoot }: { name: string; framed: boolean; onShoot: () => void }) {
  const c = framed ? 'border-amber-300' : 'border-white/70';
  return (<>
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[38vmin] w-[54vmin] -translate-x-1/2 -translate-y-1/2">
      {['left-0 top-0 border-l-4 border-t-4', 'right-0 top-0 border-r-4 border-t-4', 'left-0 bottom-0 border-l-4 border-b-4', 'right-0 bottom-0 border-r-4 border-b-4'].map((k) => <span key={k} className={`absolute h-8 w-8 ${k} ${c} transition-colors`} />)}
      <span className={`absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${c}`} />
    </div>
    <div className="absolute inset-x-0 bottom-6 z-30 flex flex-col items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
      <p className="rounded-full bg-black/50 px-4 py-1.5 text-center text-xs text-white">{framed ? `${name} vizörde, çek!` : `${name}: yapıyı vizörün ortasına al (yatay sürükle)`}</p>
      <button onClick={onShoot} disabled={!framed} className={`grid h-16 w-16 place-items-center rounded-full border-4 border-white transition ${framed ? 'bg-amber-300 text-black active:scale-90' : 'bg-white/20 text-white/60'}`} aria-label="Fotoğraf çek"><Camera size={26} /></button>
    </div>
  </>);
}
function Flash() { const [o, setO] = useState(0.85); useEffect(() => { const t = setTimeout(() => setO(0), 30); return () => clearTimeout(t); }, []); return <div className="pointer-events-none absolute inset-0 z-30 bg-white transition-opacity duration-500" style={{ opacity: o }} />; }

/* ---------- arayüz teması ve kontroller (ortak HUD) ---------- */
const THEME = { accent: '#b5523b' };
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Dikey sürükle ya da <b>W/S</b>: ileri / geri yürü</> },
  { icon: <MousePointer2 size={16} />, text: <>Yatay sürükle ya da <b>tıkla, fareyle bak</b> (Esc imleci bırakır)</> },
  { icon: <Camera size={16} />, text: <><b>E</b>: vizörü aç · yapıyı ortaya al, deklanşöre bas (<b>E</b> / <b>Boşluk</b>)</> },
  { icon: <ChevronRight size={16} />, text: <>Sağdaki oklar ya da çift dokunuş: sonraki / önceki durak</> },
];

/* ---------- 3B dünya (modeller: AniModels.tsx) ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null);
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.28; }, [scene]);   // ortam yansıması gölgeleri silmesin
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);   // yapılar gölge düşürür, zemin ve otlar yalnızca alır
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[-840, 420, -200]} turbidity={3} rayleigh={2.2} mieCoefficient={0.006} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#d3dde4', 320, 1900]} />
      <hemisphereLight args={['#cfe0ee', '#6f6545', 0.32]} />
      <Sun tier={tier} dir={SUN_DIR} />
      {tier !== 'low' && <Clouds />}
      <Terrain tier={tier} /><group userData={{ noCast: true }}><River /><FarHills /></group>
      <Walls m={m} /><Cathedral m={m} /><Mosque m={m} /><Tigran m={m} /><Bridge m={m} /><MaidenCastle m={m} />
      <HalfChurch m={m} /><RoundChurch m={m} /><Columns m={m} />
      <Ruins m={m} n={tier === 'low' ? 6 : 12} />
      <Rubble n={tier === 'low' ? 140 : 360} />
      {tier !== 'low' && <Grass n={tier === 'high' ? 9000 : 4500} />}
      <Controller />
    </group>
  );
}

/* ---------- hareket + kamera + vizör ---------- */
const _f = new THREE.Vector3(), _m = new THREE.Matrix4(), _l = new THREE.Vector3(), _q = new THREE.Quaternion();
function Controller() {
  const three = useThree(), { camera } = three;
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __aniGl: unknown }).__aniGl = three; }, [three]);
  const cs = useRef<CamState>({ step: 0, bob: 0, head: NaN });
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useDb.getState();
    if (!S.started) { camera.position.set(70, 30, -270); camera.quaternion.copy(_q.setFromRotationMatrix(_m.lookAt(camera.position, _l.set(0, 4, -120), THREE.Object3D.DEFAULT_UP))); return; }
    if (nav.to !== null) { const d = nav.to - live.s, st = Math.sign(d) * Math.min(Math.abs(d), nav.speed * dt); live.s += st; live.v = 0; if (Math.abs(st) > 0) audio.step(650);
      if (Math.abs(nav.to - live.s) < 0.01) { const sh = nearShot(live.s), R = routeAt(live.s), hd = Math.atan2(-R.dir[0], -R.dir[1]); cs.current.head = hd; nav.to = null;
        if (sh) { live.yaw = wrapA(Math.atan2(-(sh.target[0] - R.p[0]), -(sh.target[2] - R.p[2])) - hd); } } }   // varınca yapıya dön (dar dikey ekranda da kadrajda kalsın)
    if (nav.turn) { const k = Math.sign(nav.turn) * Math.min(Math.abs(nav.turn), dt * 4); live.yaw += k; nav.turn -= k; }
    if (stepWalk(camera, live, cs.current, { ROUTE_LEN, routeAt }, dt, !S.card && !S.albumOpen && nav.to === null && !pause.on)) audio.step(650);
    const n = nearShot(live.s);
    if (n && S.vf && n.target[1] < -10) { const want = Math.max(-0.7, Math.atan2(n.target[1] - camera.position.y, Math.hypot(n.target[0] - camera.position.x, n.target[2] - camera.position.z)) + 0.05); live.pitch += (want - live.pitch) * (1 - Math.exp(-dt * 2)); }   // kanyon dibindeki hedef: dokunmatikte eğim olmadığı için kamera kendiliğinden aşağı bakar
    else if (n === null && live.pitch < -0.2) live.pitch += (0 - live.pitch) * (1 - Math.exp(-dt * 2));
    camera.getWorldDirection(_f); const framed = !!n && aimError([camera.position.x, camera.position.z], [_f.x, _f.z], [n.target[0], n.target[2]]) < AIM_TOL;
    if ((n?.id ?? null) !== (S.near?.id ?? null) || framed !== S.framed) S.set({ near: n, framed, ...(n ? {} : { card: null }), ...((n?.id ?? null) !== (S.near?.id ?? null) ? { vf: false } : {}) });
  });
  return null;
}
