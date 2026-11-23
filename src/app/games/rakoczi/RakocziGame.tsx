/**
 * Rákóczi Müzesi — "Rodosto'daki Sürgün". Ana yönetici (öteki yeni oyunlarla aynı ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu avlu bahçesinden ahşap konağa yürür; zemin katta büstlü salonu ve Kelemen Mikes'in odasını gezer. Bodrum ve üst kat metinle anlatılır.
 * 6 ayrıntı: II. Ferenc Rákóczi, ahşap konak, bronz büst, Kelemen Mikes, üst katın koleksiyonu, Macar–Türk dostluğu.
 * Yaklaşınca "İncele: … E" istemi çıkar; kart E ile açılır. Kroki (M).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Feather, FileText, Footprints, Landmark, Map as MapIcon, MousePointer2, Search } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Modal, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { BOUNDS, CASES, DESK, ENTRY, FOUNTAIN, HOUSE, PARTITION_DOOR, PARTITION_X, PEDESTAL, SPOTS, START, STAIRS, TREES, DESK_AT, DESK_REACH, LETTERS, groundY, nearestLetter, nearestSpot, nextInOrder, slide, type Letter, type Spot } from './site';
import { Backdrop, Garden, Grass, Ground, House, Letters, SUN_DIR, Town, Yard, letterState, useMats } from './RakocziModels';

const THEME = { accent: '#8a5a32' };
const EYE = 1.62, WALK = 1.7, RUN = 3.6;
const audio = new WalkAudio({ freq: 620, gain: 0.07 }, 'any');

/* ---------- durum ---------- */
type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; nearLetter: Letter | null; nearDesk: boolean; letters: string[]; placed: string[]; ordering: boolean; ordered: boolean; toast: string | null; map: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, nearLetter: null, nearDesk: false, letters: [] as string[], placed: [] as string[], ordering: false, ordered: false, toast: null as string | null, map: false, endShown: false };
const useRak = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
let toastTimer = 0;
function toast(t: string) { useRak.getState().set({ toast: t }); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => useRak.getState().set({ toast: null }), 2600); }
/** Belgeyi al: kartını aç, sayacı ilerlet */
function takeLetter(l: Letter) { const s = useRak.getState(); const letters = s.letters.includes(l.id) ? s.letters : [...s.letters, l.id]; letterState.found = letters;
  s.set({ letters, card: { id: `let-${l.id}`, name: `${l.year} · ${l.name}`, kicker: `Mikes'in belgeleri · ${letters.length}/${LETTERS.length}`, text: l.text, source: l.source } }); audio.tone(true); audio.speak(`${l.year}. ${l.name}. ${l.text}`); }
const ORDER_CARD: Card = { id: 'sira', name: 'Sürgünün zaman çizelgesi', kicker: 'Mikes\'in masası',
  text: '1717\'de başlayan mektuplar, 1720\'de Rodosto\'ya yerleşme, 1735\'te prensin ölümü, 1758\'de son mektup, 1761\'de Mikes\'in ölümü ve 1906\'da kalıntıların Kassa\'ya taşınması. Sürgündeki küçük Macar topluluğunun hikâyesi, bu evde ve bu kentte yaklaşık kırk yıl sürdü.',
  source: { title: 'Magyar Elektronikus Könyvtár — Kelemen Mikes of Zágon', url: 'https://www.mek.oszk.hu/02000/02042/html/12.html' } };
/** Sıralama: seçilen belge sıradaki en erken belgeyse yerine konur */
function placeLetter(id: string) { const s = useRak.getState(), nx = nextInOrder(s.placed); if (!nx) return;
  if (nx.id !== id) { audio.tone(false); toast('Bu belge sırada değil; daha önce olan bir olay var'); return; }
  const placed = [...s.placed, id]; audio.tone(true);
  if (placed.length === LETTERS.length) { s.set({ placed, ordering: false, ordered: true, card: ORDER_CARD }); audio.speak(`${ORDER_CARD.name}. ${ORDER_CARD.text}`); } else s.set({ placed }); }
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: -0.02 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();

export default function RakocziGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useRak(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); letterState.found = []; useRak.setState(INITIAL); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  const inspect = useCallback((s: Spot) => {
    const st = useRak.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`);
  }, []);
  const close = useCallback(() => { useRak.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); letterState.found = []; useRak.setState({ ...INITIAL, started: true }); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useRak.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.ordering) s.set({ ordering: false }); else if (s.nearLetter) takeLetter(s.nearLetter); else if (s.nearDesk && !s.ordered && s.letters.length === LETTERS.length) s.set({ ordering: true }); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape' && s.ordering) s.set({ ordering: false });
      if (e.code === 'Escape' && s.card) { close(); e.preventDefault(); }
      if (e.code === 'KeyM') s.set({ map: !s.map });
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __rak: unknown }).__rak = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useRak.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      spot: (id: string) => { const s = SPOTS.find((q) => q.id === id); if (s) { live.x = s.at[0]; live.z = s.at[1]; useRak.getState().set({ started: true, card: null }); } },
      map: (v: boolean) => useRak.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; },
      land: () => { live.fly = null; },
      seeAll: () => { letterState.found = LETTERS.map((l) => l.id); useRak.getState().set({ seen: SPOTS.map((s) => s.id), letters: letterState.found, ordered: true }); },
      letters: () => { letterState.found = LETTERS.map((l) => l.id); useRak.getState().set({ letters: letterState.found }); },
      order: () => useRak.getState().set({ ordering: true }),
      SPOTS,
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useRak.getState(); return a.started && !a.card && !a.ordering && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + LETTERS.length + 1, found = S.seen.length + S.letters.length + (S.ordered ? 1 : 0), done = found >= total;
  const deskReady = S.nearDesk && !S.ordered && S.letters.length === LETTERS.length;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#dde7ee] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: 66, near: 0.1, far: 3000, position: [START.at[0], groundY(START.at[0], START.at[1]) + EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#d6e4ee" sun="#fff1dc" ground="#7f9068" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<Landmark size={15} />} label={done ? 'Hepsini buldun' : S.letters.length === LETTERS.length && !S.ordered ? 'Belgeleri masada sırala' : 'İzleri ve belgeleri bul'} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} letters={S.letters} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#8a5a32]" />
          <LookCrosshair locked={fpl.locked} />
          <Toast text={S.toast} tone="info" />
          {!S.card && S.ordering && <OrderPanel placed={S.placed} onClose={() => S.set({ ordering: false })} />}
          {!S.card && !S.ordering && S.nearLetter && <InteractPrompt icon={<FileText size={18} />} label={`Al: ${S.nearLetter.name}`} onClick={() => takeLetter(S.nearLetter!)} />}
          {!S.card && !S.ordering && !S.nearLetter && deskReady && <InteractPrompt icon={<Feather size={18} />} label="Belgeleri sırala" onClick={() => S.set({ ordering: true })} />}
          {!S.card && !S.ordering && !S.nearLetter && !deskReady && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Joystick ya da WASD ile yürü · E ile incele · 6 belgeyi bul, Mikes'in masasında tarih sırasına diz<span className="hidden [@media(pointer:fine)]:inline"> · tıkla, fareyle bak · M: kroki</span></Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.id.startsWith('let-') || S.card.id === 'sira' ? S.card.kicker : `${S.card.kicker} · ${S.seen.length}/${SPOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => speakAgain(S.card!)} />}
        {!S.started && <StartSheet kicker="Tekirdağ · Rodosto · 1720–1735" title="Rodosto'daki Sürgün"
          intro={<>Avlu bahçesinden ahşap konağa yürü; zemin katta bronz büstü ve Kelemen Mikes'in odasını bul: <b>6 ayrıntıyı</b> incele. Konakta ve bahçede <b>6 belge</b> saklı: hepsini bul, sonra Mikes'in masasında <b>tarih sırasına diz</b>. Bodrum ve üst kat metinle anlatılır.</>}
          controls={CONTROLS} note="Oyun yalnızca zemin kat ve bahçedir; oda düzeni, vitrinler ve ölçüler temsilîdir." cta="Konağa yürü" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Rákóczi Müzesi" title="Sürgündeki prensin evi"
          text="II. Ferenc Rákóczi'nin yıllarca yaşadığı ahşap ev, bugün Macar–Türk dostluğunu anlatan bir müze olarak ziyaret ediliyor."
          stayLabel="Konakta kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
function speakAgain(s: Card) { audio.hush(); audio.speak(`${s.name}. ${s.text}`); }
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (A/D yana adım, Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ya da düğme ile incele · <b>M</b>: kroki</> },
  { icon: <FileText size={16} />, text: <>Parlayan kâğıt tomarına yaklaş, <b>E</b> ile al; 6 belge bulununca Mikes'in masasında <b>E</b> ile sırala</> },
];

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.35; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3.2} rayleigh={1.3} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#e2e8ea', 280, 2600]} />
      <hemisphereLight args={['#e6eef4', '#8a8266', 0.45]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.4} color="#fff0d8" />
      {!low && <Clouds />}
      <Backdrop />
      <Ground tier={tier} />
      <Yard m={m} />
      <House m={m} tier={tier} />
      <Letters />
      <Town m={m} />
      <Garden n={low ? 10 : 28} />
      <Grass n={low ? 1500 : 4000} />
      <Markers />
    </group>
  );
}
/** Bulunmamış ayrıntıların üstünde hafif parıltı (yakınken belirginleşir) */
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const seen = useRak.getState().seen;
    SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !seen.includes(s.id); const d = Math.hypot(live.x - s.at[0], live.z - s.at[1]);
      m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.08; m.rotation.y = clock.elapsedTime * 1.2; m.scale.setScalar(d < 25 ? 1 : 0.6); }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useRak.getState(), active = S.started && !S.card && !S.ordering && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.72) { live.step = 0; audio.step(1000); } live.bob += moved * 2.4;
    const nl = S.started ? nearestLetter(live.x, live.z, S.letters) : null; if (nl !== S.nearLetter) S.set({ nearLetter: nl });
    const nd = S.started && Math.hypot(live.x - DESK_AT[0], live.z - DESK_AT[1]) < DESK_REACH; if (nd !== S.nearDesk) S.set({ nearDesk: nd });
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const gy = groundY(live.x, live.z), sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.035 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, gy + EYE, live.z, live.view, sway);
    easeFov(camera, 66, dt);
  });
  return null;
}

/* ---------- kroki ---------- */
/** Masada sıralama: belgeler (yılsız) karışık sırada; en erkenden başlayarak dokun. Yerleşenler üstte yıllarıyla dizilir. */
const SHUFFLED = ['l1758', 'l1720', 'l1906', 'l1717', 'l1761', 'l1735'];
function OrderPanel({ placed, onClose }: { placed: string[]; onClose: () => void }) {
  return (
    <Modal title="Belgeleri tarih sırasına diz" onClose={onClose}>
      <p className="mb-2 text-sm text-[#4a433c]">En erken olaydan başlayarak belgelere sırayla dokun. Kartlarda okuduğun yılları hatırla.</p>
      <ol className="mb-3 flex flex-wrap gap-1.5">{placed.map((id) => { const l = LETTERS.find((q) => q.id === id)!; return <li key={id} className="rounded-full bg-[#1f9d63] px-2.5 py-1 text-xs font-semibold text-white">{l.year} · {l.name}</li>; })}</ol>
      <div className="grid grid-cols-2 gap-2">{SHUFFLED.filter((id) => !placed.includes(id)).map((id) => { const l = LETTERS.find((q) => q.id === id)!; return <button key={id} onClick={() => placeLetter(id)} className="rounded-xl bg-[#f1e6c8] px-3 py-3 text-left text-sm font-semibold text-[#1f1b17] ring-1 ring-black/10 transition active:scale-95">{l.name}</button>; })}</div>
    </Modal>
  );
}
function Kroki({ seen, letters }: { seen: string[]; letters: string[] }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const W = BOUNDS.x1 - BOUNDS.x0, Hh = BOUNDS.z1 - BOUNDS.z0, sx = (x: number) => x - BOUNDS.x0, sz = (z: number) => z - BOUNDS.z0;
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-44 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-56" aria-label="Konak krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#c3d09a" opacity={0.75} />
        <rect x={sx(-30)} y={sz(8.8)} width={60} height={33} fill="#d8d0b8" />
        <rect x={sx(ENTRY.x0 - 0.2)} y={sz(8.8)} width={3.4} height={33} fill="#e2dac6" />
        <rect x={sx(HOUSE.x0 - 0.8)} y={sz(HOUSE.z0 - 0.8)} width={HOUSE.x1 - HOUSE.x0 + 1.6} height={HOUSE.z1 - HOUSE.z0 + 1.6} fill="#a98a66" stroke="#5b4630" strokeWidth={0.6} />
        <rect x={sx(HOUSE.x0)} y={sz(HOUSE.z0)} width={HOUSE.x1 - HOUSE.x0} height={HOUSE.z1 - HOUSE.z0} fill="#ecdcc0" />
        <rect x={sx(PARTITION_X - 0.2)} y={sz(HOUSE.z0)} width={0.4} height={HOUSE.z1 - HOUSE.z0} fill="#8a7458" />
        <rect x={sx(PARTITION_X - 0.4)} y={sz(PARTITION_DOOR.z0)} width={0.8} height={PARTITION_DOOR.z1 - PARTITION_DOOR.z0} fill="#ecdcc0" />
        {CASES.map((c, i) => <rect key={i} x={sx(c.x0)} y={sz(c.z0)} width={c.x1 - c.x0} height={c.z1 - c.z0} fill="#8a7458" />)}
        <rect x={sx(STAIRS.x0)} y={sz(STAIRS.z0)} width={STAIRS.x1 - STAIRS.x0} height={STAIRS.z1 - STAIRS.z0} fill="#8a6a44" />
        <rect x={sx(DESK.x0)} y={sz(DESK.z0)} width={DESK.x1 - DESK.x0} height={DESK.z1 - DESK.z0} fill="#8a6a44" />
        <circle cx={sx(PEDESTAL.c[0])} cy={sz(PEDESTAL.c[1])} r={PEDESTAL.r} fill="#7a5a36" />
        <circle cx={sx(FOUNTAIN.c[0])} cy={sz(FOUNTAIN.c[1])} r={FOUNTAIN.r} fill="#4a7f8c" />
        {TREES.map((t, i) => <circle key={i} cx={sx(t[0])} cy={sz(t[1])} r={1.4} fill="#4f7a3a" />)}
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={1.6} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={0.7} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-live.view.yaw * 180) / Math.PI})`}><path d="M0,-3 L2.2,2.2 L0,1.1 L-2.2,2.2 Z" fill="#1f1b17" stroke="#fff" strokeWidth={0.4} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} ayrıntı · {letters.length}/{LETTERS.length} belge</p>
    </div>
  );
}
