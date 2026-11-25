/**
 * Ertuğrul Gazi Türbesi — "Söğüt'te Bir Sessizlik". Ana yönetici (öteki yeni oyunlarla aynı ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu Söğüt meydanından türbe bahçesinin kapısına yürür, nöbet noktaları ve büstlerin arasından türbeye gelir; batıdaki tepede camiyi,
 * doğuda şenlik alanını görür. 6 ayrıntı: Söğüt, türbe, mezarın tarihi, cami, nöbet ve büstler, anma ve şenlikler.
 * Yaklaşınca "İncele: … E" istemi çıkar; kart E ile açılır. Kroki (M).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, History, Landmark, Map as MapIcon, MousePointer2, Search } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, ToolPanel, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { AREA, BOUNDS, BUSTS, ERAS, GARDEN, GATE, HILL, MOSQUE, POSTS, SPOTS, START, TENT, TOMB, eraCounts, groundY, nearestSpot, slide, type Spot } from './site';
import { EraGroup, Garden, Grass, Hills, Landmarks, SUN_DIR, Terrain, Town, Trees, eraState, useMats } from './ErtugrulModels';

const THEME = { accent: '#5d7a62' };
const EYE = 1.62, WALK = 1.7, RUN = 3.6;
const audio = new WalkAudio({ freq: 620, gain: 0.07 }, 'any');

/* ---------- durum ---------- */
type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; era: number; eraSeen: string[]; toast: string | null; map: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, era: 3, eraSeen: [] as string[], toast: null as string | null, map: false, endShown: false };
const useErt = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
let toastTimer = 0;
/** Dönem seç: sahne değişir; oyuncu bahçedeyse dönem ilk kez seçildiğinde sayılır ve kartı açılır */
function pickEra(i: number) { const s = useErt.getState(); eraState.era = i; s.set({ era: i }); audio.tone(true);
  const e = ERAS[i]; if (s.eraSeen.includes(e.id)) return;
  if (!eraCounts(live.x, live.z)) { s.set({ toast: 'Dönemi saymak için türbe bahçesine gir' }); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => useErt.getState().set({ toast: null }), 2600); return; }
  const card: Card = { id: `era-${e.id}`, name: e.name, kicker: `Zaman şeridi · ${e.chip}`, text: e.text, source: e.source };
  window.setTimeout(() => { const st = useErt.getState(); if (st.card) return; st.set({ card, eraSeen: st.eraSeen.includes(e.id) ? st.eraSeen : [...st.eraSeen, e.id] }); audio.speak(`${e.name}. ${e.text}`); }, 1300); }
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: -0.02 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();

export default function ErtugrulGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useErt(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); eraState.era = 3; useErt.setState(INITIAL); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  const inspect = useCallback((s: Spot) => {
    const st = useErt.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`);
  }, []);
  const close = useCallback(() => { useErt.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); eraState.era = 3; useErt.setState({ ...INITIAL, started: true }); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useErt.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape' && s.card) { close(); e.preventDefault(); }
      if (e.code === 'KeyM') s.set({ map: !s.map });
      if (!s.card && /^Digit[1-4]$/.test(e.code)) pickEra(Number(e.code.slice(5)) - 1);
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __ert: unknown }).__ert = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useErt.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      spot: (id: string) => { const s = SPOTS.find((q) => q.id === id); if (s) { live.x = s.at[0]; live.z = s.at[1]; useErt.getState().set({ started: true, card: null }); } },
      map: (v: boolean) => useErt.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; },
      land: () => { live.fly = null; },
      seeAll: () => useErt.getState().set({ seen: SPOTS.map((s) => s.id), eraSeen: ERAS.map((e) => e.id) }),
      era: (i: number) => { eraState.era = i; useErt.getState().set({ era: i }); },
      SPOTS,
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useErt.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + ERAS.length, found = S.seen.length + S.eraSeen.length, done = found >= total;
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
          objective={S.started ? <Objective icon={<Landmark size={15} />} label={done ? 'Hepsini buldun' : 'İzleri bul, dönemleri gör'} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#5d7a62]" />
          <LookCrosshair locked={fpl.locked} />
          <Toast text={S.toast} tone="info" />
          {!S.card && <ToolPanel title={<span className="flex items-center gap-1"><History size={14} /> Zaman şeridi</span>}>
            <div className="grid grid-cols-2 gap-1.5">{ERAS.map((e, i) => <button key={e.id} onClick={() => pickEra(i)} className={`rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold leading-tight transition active:scale-95 ${S.era === i ? 'text-white' : 'bg-black/5 text-[#1f1b17]'}`} style={S.era === i ? { background: THEME.accent } : undefined}>{e.chip}{S.eraSeen.includes(e.id) ? ' ✓' : ''}</button>)}</div>
          </ToolPanel>}
          {!S.card && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Joystick ya da WASD ile yürü · E ile incele · türbe bahçesinde zaman şeridinden dönem seç (1–4)<span className="hidden [@media(pointer:fine)]:inline"> · fareyle sürükle: bak · M: kroki</span></Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.id.startsWith('era-') ? S.card.kicker : `${S.card.kicker} · ${S.seen.length}/${SPOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => speakAgain(S.card!)} />}
        {!S.started && <StartSheet kicker="Bilecik · Söğüt · 13. yüzyıl" title="Söğüt'te Bir Sessizlik"
          intro={<>Söğüt meydanından türbe bahçesine yürü; türbeyi, tepedeki camiyi ve şenlik alanını gez: <b>6 ayrıntıyı</b> incele. Bahçede <b>zaman şeridini</b> kullan: açık mezardan bugünkü türbeye ve büstlere, <b>4 dönemi</b> kendi gözünle gör.</>}
          controls={CONTROLS} note="Yapıların ölçüleri, büstlerin biçimi ve yerleşim temsilîdir; erken dönemlerin biçimi bilinmez, türbenin yapım tarihi kaynaklarda kesin değildir." cta="Söğüt'e gir" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Ertuğrul Gazi Türbesi" title="Bir beyliğin başlangıcı"
          text="Osmanlı Beyliği'nin çıkış yeri sayılan Söğüt'te türbe, her yıl anma törenleriyle ve yüz binlerce ziyaretçiyle yaşıyor."
          stayLabel="Söğüt'te kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
function speakAgain(s: Card) { audio.hush(); audio.speak(`${s.name}. ${s.text}`); }
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (A/D yana adım, Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ya da düğme ile incele · <b>M</b>: kroki</> },
  { icon: <History size={16} />, text: <>Sol üstteki <b>zaman şeridi</b> ya da <b>1–4</b>: dönem seç. Bahçedeyken seçilen dönem sayılır</> },
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
      <fog attach="fog" args={['#e2e6e0', 280, 2600]} />
      <hemisphereLight args={['#e6eef4', '#8a8266', 0.45]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.4} color="#fff0d8" />
      {!low && <Clouds />}
      <Hills />
      <Terrain tier={tier} />
      <Garden m={m} />
      <Landmarks m={m} />
      <EraGroup when={(e) => e >= 2}><Town m={m} /></EraGroup>
      <Trees n={low ? 20 : 60} />
      <Grass n={low ? 1500 : 4000} />
      <Markers />
    </group>
  );
}
/** Bulunmamış ayrıntıların üstünde hafif parıltı (yakınken belirginleşir) */
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const seen = useErt.getState().seen;
    SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !seen.includes(s.id); const d = Math.hypot(live.x - s.at[0], live.z - s.at[1]);
      m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.08; m.rotation.y = clock.elapsedTime * 1.2; m.scale.setScalar(d < 25 ? 1 : 0.6); }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useErt.getState(), active = S.started && !S.card && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.72) { live.step = 0; audio.step(1000); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const gy = groundY(live.x, live.z), sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.035 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, gy + EYE, live.z, live.view, sway);
    easeFov(camera, 66, dt);
  });
  return null;
}

/* ---------- kroki ---------- */
function Kroki({ seen }: { seen: string[] }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const W = BOUNDS.x1 - BOUNDS.x0, Hh = BOUNDS.z1 - BOUNDS.z0, sx = (x: number) => x - BOUNDS.x0, sz = (z: number) => z - BOUNDS.z0;
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-44 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-56" aria-label="Söğüt krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#c3d09a" opacity={0.75} />
        <rect x={sx(AREA.x0)} y={sz(AREA.z0)} width={AREA.x1 - AREA.x0} height={AREA.z1 - AREA.z0} fill="#d8d6b4" opacity={0.6} />
        <rect x={sx(-32)} y={sz(14)} width={64} height={48} fill="#e2dac6" />
        <circle cx={sx(HILL.c[0])} cy={sz(HILL.c[1])} r={HILL.s} fill="#b8c490" opacity={0.7} />
        <rect x={sx(GARDEN.x0)} y={sz(GARDEN.z0)} width={GARDEN.x1 - GARDEN.x0} height={GARDEN.z1 - GARDEN.z0} fill="#ece6d4" stroke="#6b6450" strokeWidth={1} />
        <rect x={sx(GATE.x0)} y={sz(GARDEN.z1 - 0.6)} width={GATE.x1 - GATE.x0} height={1.4} fill="#ece6d4" />
        <circle cx={sx(TOMB.c[0])} cy={sz(TOMB.c[1])} r={TOMB.r} fill="#8a9a92" stroke="#4a5a52" strokeWidth={0.8} />
        {POSTS.map((p, i) => <circle key={i} cx={sx(p[0])} cy={sz(p[1])} r={0.8} fill="#4a433c" />)}
        {BUSTS.map((p, i) => <circle key={i} cx={sx(p[0])} cy={sz(p[1])} r={0.5} fill="#8a8068" />)}
        <circle cx={sx(MOSQUE.c[0])} cy={sz(MOSQUE.c[1])} r={MOSQUE.r} fill="#8a9a92" />
        <circle cx={sx(TENT.c[0])} cy={sz(TENT.c[1])} r={TENT.r} fill="#2f2a26" />
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={2} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={0.8} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-live.view.yaw * 180) / Math.PI})`}><path d="M0,-3 L2.2,2.2 L0,1.1 L-2.2,2.2 Z" fill="#1f1b17" stroke="#fff" strokeWidth={0.4} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} bulundu</p>
    </div>
  );
}
