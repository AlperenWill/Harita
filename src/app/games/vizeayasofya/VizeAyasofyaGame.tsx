/**
 * Vize Ayasofyası — "Bizye'nin Katedrali". Ana yönetici (öteki yeni oyunlarla aynı ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu yamaçtaki yoldan kiliseye yürür, narteksten girer; sütunlar arasında, çokgen kasnaklı kubbenin altında dolaşır. 6 ayrıntı:
 * Bizye'nin yamacı, bazilika planı, çokgen kasnaklı kubbe, tarihlendirme tartışması, cami olarak kullanım, yakın tarihli araştırma.
 * Yaklaşınca "İncele: … E" istemi çıkar; kart E ile açılır. Kroki (M).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Compass, Footprints, Landmark, Map as MapIcon, MousePointer2, Search } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { AREA, BOUNDS, CHURCH, COMPASS, MIHRAB, NARTHEX, NAVE, PIERS, PIER_R, QIBLA_DEG, QIBLA_TOL, SPOTS, mosqueBlock, START, groundY, headingDeg, nearestSpot, qiblaDiff, slide, type Spot } from './site';
import { Church, Cypress, Grass, Hills, SUN_DIR, Terrain, Town, WallRuins, mosqueState, useMats } from './VizeModels';

const THEME = { accent: '#9a5a3a' };
const EYE = 1.62, WALK = 1.7, RUN = 3.6;
const audio = new WalkAudio({ freq: 620, gain: 0.07 }, 'any');

/* ---------- durum ---------- */
type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; nearCompass: boolean; aiming: boolean; qibla: boolean; toast: string | null; map: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, nearCompass: false, aiming: false, qibla: false, toast: null as string | null, map: false, endShown: false };
const useViz = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const QIBLA_CARD: Card = { id: 'kible', name: 'Kıble', kicker: 'Kiliseden camiye',
  text: 'Kiliseler genellikle apsisleri doğuya bakacak biçimde yapılır. Vize\'den Mekke\'nin yönü ise yaklaşık 150°, yani güney-güneydoğudur (büyük daire hesabı). Bu yüzden camiye çevrilen kiliselerde mihrap çoğu zaman apsisin ortasına değil, kıble yönüne göre kaydırılarak konur; saflar da binanın eksenine göre çapraz dizilir. Oyundaki mihrabın, minberin ve safların yeri temsilîdir; Vize\'deki mihrabın gerçek yeri bu oyunda doğrulanmadı.',
  source: { title: 'TDV İslâm Ansiklopedisi — Kıble', url: 'https://islamansiklopedisi.org.tr/kible' } };
let toastTimer = 0;
function toast(t: string) { useViz.getState().set({ toast: t }); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => useViz.getState().set({ toast: null }), 2600); }
/** Pusula: ilk basış nişan kipini açar; ikinci basışta bakılan yön kıbleyle karşılaştırılır */
function useCompass() { const s = useViz.getState();
  if (!s.aiming) { s.set({ aiming: true }); audio.tone(true); return; }
  const d = qiblaDiff(live.view.yaw);
  if (Math.abs(d) <= QIBLA_TOL) { mosqueState.on = true; mosqueBlock.on = true; s.set({ aiming: false, qibla: true, card: QIBLA_CARD }); audio.tone(true); audio.speak(`${QIBLA_CARD.name}. ${QIBLA_CARD.text}`); }
  else { audio.tone(false); toast(`Henüz değil: ${Math.round(Math.abs(d))}° ${d > 0 ? 'sağa' : 'sola'} dön`); } }
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: -0.02 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();

export default function VizeAyasofyaGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useViz(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); mosqueState.on = false; mosqueBlock.on = false; useViz.setState(INITIAL); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  const inspect = useCallback((s: Spot) => {
    const st = useViz.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`);
  }, []);
  const close = useCallback(() => { useViz.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); mosqueState.on = false; mosqueBlock.on = false; useViz.setState({ ...INITIAL, started: true }); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useViz.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.nearCompass && !s.qibla) useCompass(); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape' && s.aiming) s.set({ aiming: false });
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
    (window as unknown as { __viz: unknown }).__viz = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useViz.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      spot: (id: string) => { const s = SPOTS.find((q) => q.id === id); if (s) { live.x = s.at[0]; live.z = s.at[1]; useViz.getState().set({ started: true, card: null }); } },
      map: (v: boolean) => useViz.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; },
      land: () => { live.fly = null; },
      seeAll: () => { mosqueState.on = true; mosqueBlock.on = true; useViz.getState().set({ seen: SPOTS.map((s) => s.id), qibla: true }); },
      mosque: (v: boolean) => { mosqueState.on = v; },
      aim: () => useViz.getState().set({ aiming: true }),
      SPOTS,
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useViz.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + 1, found = S.seen.length + (S.qibla ? 1 : 0), done = found >= total;
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
          objective={S.started ? <Objective icon={<Landmark size={15} />} label={done ? 'Hepsini buldun' : S.aiming ? 'Kıbleye dön, E' : 'İzleri bul, kıbleyi bul'} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} qibla={S.qibla} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#9a5a3a]" />
          <LookCrosshair locked={fpl.locked} />
          <Toast text={S.toast} tone="info" />
          {!S.card && S.aiming && <CompassHud />}
          {!S.card && S.nearCompass && !S.qibla && <InteractPrompt icon={<Compass size={18} />} label={S.aiming ? 'Bu yön kıble' : 'Kıbleyi bul'} onClick={useCompass} />}
          {!S.card && !(S.nearCompass && !S.qibla) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Joystick ya da WASD ile yürü · E ile incele · kubbenin altındaki pusulayla kıbleyi bul<span className="hidden [@media(pointer:fine)]:inline"> · fareyle sürükle: bak · M: kroki</span></Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.id === 'kible' ? S.card.kicker : `${S.card.kicker} · ${S.seen.length}/${SPOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => speakAgain(S.card!)} />}
        {!S.started && <StartSheet kicker="Kırklareli · Vize · Bizye" title="Bizye'nin Katedrali"
          intro={<>Yamaçtaki yoldan kiliseye yürü; narteksten gir, sütunların arasında ve çokgen kasnaklı kubbenin altında dolaş: <b>6 ayrıntıyı</b> incele. Kilise 15. yüzyılda camiye çevrildi: kubbenin altındaki <b>pusulayla kıbleyi bul</b>, mihrabın ve safların nereye kurulduğunu gör.</>}
          controls={CONTROLS} note="Ölçüler, sütun ve galeri düzeni temsilîdir; yapının tarihi bilim insanlarınca tartışılır." cta="Kiliseye yürü" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Vize Ayasofyası" title="Yamaçtaki katedral"
          text="Vize'deki Ayasofya, kilise ve cami olarak yüzyıllardır ayakta; yapının tarihi bugün de araştırmacıların tartıştığı bir konu."
          stayLabel="Kilisede kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
/** Pusula şeridi: bakılan yönün derecesi, ana yönler ve kıble işareti; altta yönlendirme */
function CompassHud() {
  const [, force] = useState(0);
  useEffect(() => { let id = 0; const loop = () => { force((x) => x + 1); id = requestAnimationFrame(loop); }; id = requestAnimationFrame(loop); return () => cancelAnimationFrame(id); }, []);
  const h = headingDeg(live.view.yaw), W = 260, span = 120, px = (deg: number) => { const d = ((deg - h + 540) % 360) - 180; return W / 2 + (d / span) * W; };
  const marks = [[0, 'K'], [45, 'KD'], [90, 'D'], [135, 'GD'], [180, 'G'], [225, 'GB'], [270, 'B'], [315, 'KB']] as const;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[68px] z-30 flex justify-center px-3 sm:top-[72px]">
      <div className="rounded-2xl bg-white px-3 py-2 text-[#1f1b17] shadow-[0_6px_20px_rgba(31,27,23,0.18)] ring-1 ring-black/10">
        <svg viewBox={`0 0 ${W} 34`} width={W} height={34} aria-label="Pusula">
          {Array.from({ length: 72 }, (_, i) => i * 5).map((d) => { const x = px(d); return x < 0 || x > W ? null : <line key={d} x1={x} x2={x} y1={d % 45 ? 22 : 16} y2={28} stroke="#4a433c" strokeWidth={1} />; })}
          {marks.map(([d, l]) => { const x = px(d); return x < 6 || x > W - 6 ? null : <text key={l} x={x} y={12} textAnchor="middle" fontSize={10} fontWeight={700} fill={d === 0 ? '#b3392b' : '#1f1b17'}>{l}</text>; })}
          {(() => { const x = px(QIBLA_DEG); return x < 0 || x > W ? null : <g><rect x={x - 3} y={14} width={6} height={16} rx={2} fill="#1f9d63" /></g>; })()}
          <line x1={W / 2} x2={W / 2} y1={0} y2={34} stroke="#1f1b17" strokeWidth={2} />
        </svg>
        <p className="text-center text-[11px] font-semibold">Yönün {Math.round(h)}° · Mekke ≈ {QIBLA_DEG}° (yeşil) · yeşili ortaya getir</p>
      </div>
    </div>
  );
}
function speakAgain(s: Card) { audio.hush(); audio.speak(`${s.name}. ${s.text}`); }
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (A/D yana adım, Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ya da düğme ile incele · <b>M</b>: kroki</> },
  { icon: <Compass size={16} />, text: <>Kubbenin altında pusula: <b>E</b> ile aç, Mekke yönüne (≈{QIBLA_DEG}°) dön, yeniden <b>E</b></> },
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
      <fog attach="fog" args={['#e6e8e2', 280, 2600]} />
      <hemisphereLight args={['#e6eef4', '#8a8266', 0.45]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.4} color="#fff0d8" />
      {!low && <Clouds />}
      <Hills />
      <Terrain tier={tier} />
      <Church m={m} tier={tier} />
      <WallRuins m={m} />
      <Town m={m} />
      <Cypress n={low ? 14 : 40} />
      <Grass n={low ? 1500 : 4000} />
      <Markers />
    </group>
  );
}
/** Bulunmamış ayrıntıların üstünde hafif parıltı (yakınken belirginleşir) */
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const seen = useViz.getState().seen;
    SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !seen.includes(s.id); const d = Math.hypot(live.x - s.at[0], live.z - s.at[1]);
      m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.08; m.rotation.y = clock.elapsedTime * 1.2; m.scale.setScalar(d < 25 ? 1 : 0.6); }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useViz.getState(), active = S.started && !S.card && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.72) { live.step = 0; audio.step(1000); } live.bob += moved * 2.4;
    const nc = S.started && Math.hypot(live.x - COMPASS.c[0], live.z - COMPASS.c[1]) < COMPASS.reach; if (nc !== S.nearCompass) S.set({ nearCompass: nc, ...(nc ? {} : { aiming: false }) });
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const gy = groundY(live.x, live.z), sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.035 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, gy + EYE, live.z, live.view, sway);
    easeFov(camera, 66, dt);
  });
  return null;
}

/* ---------- kroki ---------- */
function Kroki({ seen, qibla }: { seen: string[]; qibla: boolean }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const W = BOUNDS.x1 - BOUNDS.x0, Hh = BOUNDS.z1 - BOUNDS.z0, sx = (x: number) => x - BOUNDS.x0, sz = (z: number) => z - BOUNDS.z0;
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-44 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-56" aria-label="Kilise krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#c3d09a" opacity={0.75} />
        <rect x={sx(AREA.x0)} y={sz(AREA.z0)} width={AREA.x1 - AREA.x0} height={AREA.z1 - AREA.z0} fill="#d8d6b4" opacity={0.6} />
        <rect x={sx(-6)} y={sz(16)} width={12} height={AREA.z1 - 16} fill="#e2dac6" />
        <rect x={sx(CHURCH.x0)} y={sz(CHURCH.z0)} width={CHURCH.x1 - CHURCH.x0} height={CHURCH.z1 - CHURCH.z0} fill="#b0866a" stroke="#5b3a2a" strokeWidth={0.8} />
        <rect x={sx(NAVE.x0)} y={sz(NAVE.z0)} width={NAVE.x1 - NAVE.x0} height={NAVE.z1 - NAVE.z0} fill="#e6dcc6" />
        <rect x={sx(NARTHEX.x0)} y={sz(NARTHEX.z0)} width={NARTHEX.x1 - NARTHEX.x0} height={NARTHEX.z1 - NARTHEX.z0} fill="#ece4d0" />
        {PIERS.map((p, i) => <circle key={i} cx={sx(p[0])} cy={sz(p[1])} r={PIER_R} fill="#8a7e68" />)}
        <circle cx={sx(0)} cy={sz(-2)} r={4.3} fill="none" stroke="#7d8680" strokeWidth={0.8} strokeDasharray="1.5 1" />
        <rect x={sx(COMPASS.c[0]) - 0.9} y={sz(COMPASS.c[1]) - 0.9} width={1.8} height={1.8} fill={qibla ? '#1f9d63' : '#4a433c'} />
        {qibla && <><line x1={sx(0)} y1={sz(-2)} x2={sx(MIHRAB.at[0])} y2={sz(MIHRAB.at[1])} stroke="#1f9d63" strokeWidth={0.6} strokeDasharray="1 0.8" /><rect x={sx(MIHRAB.at[0]) - 1} y={sz(MIHRAB.at[1]) - 1} width={2} height={2} fill="#1f9d63" /></>}
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={2} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={0.8} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-live.view.yaw * 180) / Math.PI})`}><path d="M0,-3 L2.2,2.2 L0,1.1 L-2.2,2.2 Z" fill="#1f1b17" stroke="#fff" strokeWidth={0.4} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} bulundu</p>
    </div>
  );
}
