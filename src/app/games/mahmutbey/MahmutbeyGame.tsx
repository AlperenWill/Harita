/**
 * Kasaba Köyü Mahmut Bey Camii — "Çivisiz Cami". Ana yönetici (öteki yeni oyunlarla aynı ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu köy yolundan meydana yürür, son cemaat yerinden harime girer, ahşap direklerin arasında dolaşır. 6 ayrıntı:
 * Candaroğlu Mahmut Bey, "Çivisiz Cami", ahşap direkler, kalem işi tavan, Dünya Mirası, onarım.
 * Yaklaşınca yalnızca "İncele: … E" istemi çıkar; kart E ile açılır. Kroki (M).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Brush, DoorOpen, Footprints, Map as MapIcon, MousePointer2, Search } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Modal, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { BOUNDS, CEMETERY, FADED, HALL, HOUSES, MOTIF_NAMES, PORCH, POSTS, SPOTS, START, cellCenter, groundY, motifAt, nearestFaded, nearestSpot, slide, type Spot } from './site';
import { Cemetery, Grass, Ground, Houses, Mosque, Mountains, PaintCells, SUN_DIR, Trees, paintState, useMats } from './MahmutbeyModels';

const THEME = { accent: '#8a4a2a' };
const EYE = 1.62, WALK = 1.7, RUN = 3.6;
const audio = new WalkAudio({ freq: 600, gain: 0.07 }, 'any');

/* ---------- durum ---------- */
type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
type Cell = (typeof FADED)[number];
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; nearCell: Cell | null; painting: Cell | null; done: string[]; toast: string | null; map: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, nearCell: null, painting: null, done: [] as string[], toast: null as string | null, map: false, endShown: false };
const useMahmutbey = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const PAINT_CARD: Card = { id: 'kalemisi', name: 'Tavan bezemesi tamamlandı', kicker: 'Kalem işi',
  text: 'Caminin tavanı, kirişleri ve ahşap yüzeyleri kalem işi boyalı bezemelerle süslüdür ve bunlar dönemin ahşap camileri içinde iyi korunmuş örneklerdendir. Bezemeyi onaran usta, eksik bir parçayı çevresindeki desenin düzenine bakarak tamamlar. Oyundaki renk düzeni ve solmuş gözler temsilîdir; bu camide hangi parçaların onarıldığı bu oyunda doğrulanmadı.',
  source: { title: 'YÖK Açık Bilim — Kastamonu Kasaba Köy Mahmud Bey Camii', url: 'https://acikbilim.yok.gov.tr/handle/20.500.12812/466539' } };
let toastTimer = 0;
function choose(c: Cell, k: number) { const s = useMahmutbey.getState(); if (k !== motifAt(c.i, c.j)) { audio.tone(false); s.set({ toast: 'Bu renk düzene uymuyor: satır ve sütun boyunca renklerin nasıl sıralandığına bak.' }); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => useMahmutbey.getState().set({ toast: null }), 3000); return; }
  const done = [...s.done, c.id]; paintState.done = done; audio.tone(true);
  if (done.length === FADED.length) { s.set({ done, painting: null, card: PAINT_CARD, toast: null }); audio.speak(`${PAINT_CARD.name}. ${PAINT_CARD.text}`); } else { s.set({ done, painting: null, toast: `Göz tamamlandı · ${done.length}/${FADED.length}` }); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => useMahmutbey.getState().set({ toast: null }), 2200); } }
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: -0.02 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();

export default function MahmutbeyGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useMahmutbey(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); paintState.done = []; useMahmutbey.setState(INITIAL); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  const inspect = useCallback((s: Spot) => {
    const st = useMahmutbey.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`);
  }, []);
  const close = useCallback(() => { useMahmutbey.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); paintState.done = []; useMahmutbey.setState({ ...INITIAL, started: true }); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useMahmutbey.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.painting) s.set({ painting: null }); else if (s.nearCell) s.set({ painting: s.nearCell }); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape' && s.painting) s.set({ painting: null });
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
    (window as unknown as { __mahmutbey: unknown }).__mahmutbey = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useMahmutbey.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      spot: (id: string) => { const s = SPOTS.find((q) => q.id === id); if (s) { live.x = s.at[0]; live.z = s.at[1]; useMahmutbey.getState().set({ started: true, card: null }); } },
      map: (v: boolean) => useMahmutbey.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; },
      land: () => { live.fly = null; },
      seeAll: () => { paintState.done = FADED.map((f) => f.id); useMahmutbey.getState().set({ seen: SPOTS.map((s) => s.id), done: paintState.done }); },
      paint: (i: number) => useMahmutbey.getState().set({ painting: FADED[i] }),
      fill: (n: number) => { paintState.done = FADED.slice(0, n).map((f) => f.id); useMahmutbey.getState().set({ done: paintState.done }); },
      SPOTS,
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useMahmutbey.getState(); return a.started && !a.card && !a.painting && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + FADED.length, found = S.seen.length + S.done.length, done = found >= total;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#dfe8ec] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: 66, near: 0.1, far: 3000, position: [START.at[0], groundY(START.at[0], START.at[1]) + EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#d4e6f0" sun="#fff1dc" ground="#8f8a6a" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<DoorOpen size={15} />} label={done ? 'Hepsini buldun' : 'Ayrıntıları bul, tavanı tamamla'} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#8a4a2a]" />
          <LookCrosshair locked={fpl.locked} />
          <Toast text={S.toast} tone="info" />
          {!S.card && S.painting && <PaintPanel cell={S.painting} onClose={() => S.set({ painting: null })} />}
          {!S.card && !S.painting && S.nearCell && <InteractPrompt icon={<Brush size={18} />} label="Solmuş gözü tamamla" onClick={() => S.set({ painting: S.nearCell })} />}
          {!S.card && !S.painting && !S.nearCell && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Joystick ya da WASD ile yürü · E ile incele · tavanda solmuş 3 bezeme gözünün altında dur, rengini tamamla<span className="hidden [@media(pointer:fine)]:inline"> · tıkla, fareyle bak · M: kroki</span></Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.id === 'kalemisi' ? S.card.kicker : `${S.card.kicker} · ${S.seen.length}/${SPOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => speakAgain(S.card!)} />}
        {!S.started && <StartSheet kicker="Kastamonu · Kasaba Köyü · 1366 · UNESCO" title="Çivisiz Cami"
          intro={<>Köy yolundan Candaroğulları'nın ahşap camisine yürü; çivisiz birleştirilmiş direkleri ve kalem işi tavanı keşfet: <b>6 ayrıntıyı</b> bul ve incele. Tavanda <b>solmuş 3 bezeme gözü</b> var: altında durup komşu gözlerin renk düzenine bakarak eksik rengi tamamla.</>}
          controls={CONTROLS} note="Ölçüler, direk sayısı ve bezeme desenleri temsilîdir." cta="Köye gir" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Mahmut Bey Camii" title="Ahşabın ustalığı"
          text="Çivisiz ahşap iskeleti ve kalem işleriyle Mahmut Bey Camii, 650 yılı aşkın süredir bir köy camisi olarak yaşıyor ve Dünya Mirası olarak korunuyor."
          stayLabel="Köyde kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
function speakAgain(s: Card) { audio.hush(); audio.speak(`${s.name}. ${s.text}`); }
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (A/D yana adım, Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ya da düğme ile incele · <b>M</b>: kroki</> },
  { icon: <Brush size={16} />, text: <>Solmuş tavan gözünün altında <b>E</b>: komşu gözlere bak, eksik rengi seç</> },
];

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.35; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3.4} rayleigh={1.4} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#dde6ec', 260, 2600]} />
      <hemisphereLight args={['#dfeaf3', '#7d7458', 0.45]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.6} color="#fff0d8" />
      {!low && <Clouds />}
      <Mountains />
      <Ground tier={tier} />
      <Mosque m={m} />
      <PaintCells />
      <Cemetery m={m} />
      <Houses m={m} />
      <Trees n={low ? 120 : 260} />
      <Grass n={low ? 3000 : 7000} />
      <Markers />
    </group>
  );
}
/** Bulunmamış ayrıntıların üstünde hafif parıltı (yakınken belirginleşir) */
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const seen = useMahmutbey.getState().seen;
    SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !seen.includes(s.id); const d = Math.hypot(live.x - s.at[0], live.z - s.at[1]);
      m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.08; m.rotation.y = clock.elapsedTime * 1.2; m.scale.setScalar(d < 25 ? 1 : 0.6); }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useMahmutbey.getState(), active = S.started && !S.card && !S.painting && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.72) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const nc = S.started ? nearestFaded(live.x, live.z, S.done) : null; if (nc !== S.nearCell) S.set({ nearCell: nc });
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const gy = groundY(live.x, live.z), sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.035 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, gy + EYE, live.z, live.view, sway);
    easeFov(camera, 66, dt);
  });
  return null;
}

/* ---------- kroki ---------- */
/** Solmuş göz: çevresindeki 8 göz görünür, ortadaki eksik; 3 renkten biri seçilir */
const SW = ['#2d4a6e', '#3e6a4a', '#d6a63c'];
function PaintPanel({ cell, onClose }: { cell: Cell; onClose: () => void }) {
  const cellBox = (k: number | null, key: string) => <div key={key} className="grid aspect-square place-items-center rounded-sm" style={{ background: k === null ? '#b9a98c' : '#7a2a22', outline: '2px solid #e6c56a', outlineOffset: -4 }}>{k === null ? <span className="text-lg font-bold text-[#7a2a22]">?</span> : <span className="block h-1/2 w-1/2" style={{ background: SW[k], clipPath: 'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)' }} />}</div>;
  return (
    <Modal title="Kalem işini tamamla" onClose={onClose}>
      <p className="mb-2 text-sm text-[#4a433c]">Tavandaki gözler bir renk düzeniyle boyanmış. Ortadaki göz solmuş: komşularına bak, hangi renk gelmeli?</p>
      <div className="mx-auto mb-3 grid w-[min(70vw,240px)] grid-cols-3 gap-1 rounded bg-[#5a3c24] p-1">{[-1, 0, 1].flatMap((dj) => [-1, 0, 1].map((di) => cellBox(di === 0 && dj === 0 ? null : motifAt(cell.i + di, cell.j + dj), `${di},${dj}`)))}</div>
      <div className="grid grid-cols-3 gap-2">{MOTIF_NAMES.map((n, k) => <button key={n} onClick={() => choose(cell, k)} className="flex flex-col items-center gap-1 rounded-xl bg-[#f1e6c8] py-2 text-sm font-semibold ring-1 ring-black/10 active:scale-95"><span className="block h-6 w-6" style={{ background: SW[k], clipPath: 'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)' }} />{n}</button>)}</div>
    </Modal>
  );
}
function Kroki({ seen }: { seen: string[] }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const W = BOUNDS.x1 - BOUNDS.x0, Hh = BOUNDS.z1 - BOUNDS.z0, sx = (x: number) => x - BOUNDS.x0, sz = (z: number) => z - BOUNDS.z0;
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-44 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-56" aria-label="Köy krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#9fbf7a" opacity={0.6} />
        <rect x={sx(1.4)} y={sz(9)} width={5.2} height={BOUNDS.z1 - 9} fill="#cdbf9f" />
        <rect x={sx(HALL.x0 - 1)} y={sz(HALL.z0 - 1)} width={HALL.x1 - HALL.x0 + 2} height={PORCH.z1 - HALL.z0 + 1} fill="#a89c86" stroke="#6b5a46" strokeWidth={0.6} />
        {POSTS.map((p, i) => <circle key={i} cx={sx(p[0])} cy={sz(p[1])} r={0.5} fill="#7a5434" />)}
        <rect x={sx(CEMETERY.x0)} y={sz(CEMETERY.z0)} width={CEMETERY.x1 - CEMETERY.x0} height={CEMETERY.z1 - CEMETERY.z0} fill="none" stroke="#6b5a46" strokeWidth={0.6} />
        {HOUSES.map((h, i) => <rect key={i} x={sx(h.x - h.w / 2)} y={sz(h.z - h.d / 2)} width={h.w} height={h.d} fill="#e2d6c0" stroke="#8a7a66" strokeWidth={0.4} transform={`rotate(${(-h.yaw * 180) / Math.PI} ${sx(h.x)} ${sz(h.z)})`} />)}
        {FADED.map((f) => { const [x, z] = cellCenter(f.i, f.j); return <rect key={f.id} x={sx(x) - 0.5} y={sz(z) - 0.7} width={1} height={1.4} fill="#d6a63c" />; })}
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={1.8} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={0.8} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-live.view.yaw * 180) / Math.PI})`}><path d="M0,-3 L2.2,2.2 L0,1.1 L-2.2,2.2 Z" fill="#1f1b17" stroke="#fff" strokeWidth={0.4} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} bulundu</p>
    </div>
  );
}
