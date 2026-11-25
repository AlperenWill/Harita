/**
 * Erzincan Tercan — Mama Hatun Kümbeti: "Halka Duvar" (kısa). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu batıdaki kapıdan yuvarlak duvarın içine girer, kümbetin çevresindeki halka koridorda dolaşır: 13 nişin önünden geçtikçe sayılır.
 * Kümbet gövdesindeki aşınmış üç dilimde E ile doğru taş biçimini seçip onarır. 5 ayrıntı + nişler + dilimler.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, Hammer, MousePointer2, Search, CircleDot } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Modal, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { CARD_LOBE, CARD_NICHE, CORRECT_PROFILE, ERODED, NICHES, PROFILES, SPOTS, START, groundY, nearLobe, nearNiche, nearestSpot, slide, type Spot } from './site';
import { Ground, Kervansaray, Kumbet, Mountains, RingWall, useMats } from './MamaModels';

const THEME = { accent: '#7a6340' };
const EYE = 1.62, WALK = 1.6, RUN = 3.4, FOV = 66;
const audio = new WalkAudio({ freq: 600, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(-0.4, 0.7, 0.55).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; niches: number[]; lobe: number; panel: number; fixed: number[]; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, niches: [] as number[], lobe: -1, panel: -1, fixed: [] as number[], endShown: false, toast: null as string | null };
const useMama = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.04 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3600) => { clearTimeout(toastT); useMama.getState().set({ toast: t }); toastT = setTimeout(() => useMama.getState().set({ toast: null }), ms); };
function fixLobe(k: number, prof: string) { const s = useMama.getState();
  if (prof !== CORRECT_PROFILE) { audio.tone(false); say('Bu taş gövdeye oturmuyor: komşu dilimlerin biçimine bak.'); return; }
  const fixed = [...s.fixed, k]; s.set({ fixed, panel: -1 }); audio.tone(true);
  if (fixed.length === ERODED.length) { s.set({ card: CARD_LOBE }); audio.speak(`${CARD_LOBE.name}. ${CARD_LOBE.text}`); } else say(`Dilim onarıldı · ${fixed.length}/${ERODED.length}`); }
export default function MamaHatunGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useMama(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.04; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useMama.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useMama.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { useMama.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useMama.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useMama.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.panel >= 0) s.set({ panel: -1 }); else if (s.lobe >= 0) s.set({ panel: s.lobe }); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape') { if (s.card) close(); else if (s.panel >= 0) s.set({ panel: -1 }); }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __mama: unknown }).__mama = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useMama.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      allNiches: () => useMama.getState().set({ niches: NICHES.map((_, i) => i), card: null }),
      panel: (k: number) => useMama.getState().set({ panel: k, card: null }),
      fixAll: () => { for (const k of ERODED) fixLobe(k, CORRECT_PROFILE); },
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useMama.getState(); return a.started && !a.card && a.panel < 0 && !pause.on; }, () => audio.unlock());
  const nichesDone = S.niches.length === NICHES.length, lobesDone = S.fixed.length === ERODED.length;
  const total = SPOTS.length + 2, found = S.seen.length + (nichesDone ? 1 : 0) + (lobesDone ? 1 : 0), done = found >= total;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#ebe6da] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.05, far: 3000, position: [START.at[0], groundY() + EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#dde6ec" sun="#fff0d6" ground="#a8936a" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<CircleDot size={15} />} label={done ? 'Hepsini buldun' : `Niş ${S.niches.length}/${NICHES.length} · dilim ${S.fixed.length}/${ERODED.length}`} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && S.panel < 0 && <Toast text={S.toast} tone={S.toast?.startsWith('Bu taş') ? 'bad' : 'ok'} />}
        {S.panel >= 0 && <LobePanel k={S.panel} onClose={() => S.set({ panel: -1 })} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#7a6340]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && S.panel < 0 && S.lobe >= 0 && <InteractPrompt icon={<Hammer size={18} />} label="Aşınmış dilimi onar" onClick={() => S.set({ panel: S.lobe })} />}
          {!S.card && S.panel < 0 && S.lobe < 0 && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && S.panel < 0 && <Hint>Batıdaki kapıdan gir · kümbetin çevresinde dolaş, nişleri say · aşınmış dilimde E</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Erzincan · Tercan · Saltuklu" title="Halka Duvar"
          intro={<>Dilimli bir kümbet ve onu saran yuvarlak bir duvar: Anadolu'da başka örneği olmayan bir plan. Kapıdan gir, duvarın iç yüzündeki <b>nişleri say</b>, kümbet gövdesinde <b>aşınmış dilimleri onar</b>.</>}
          controls={CONTROLS} note="Duvar yüksekliği, kümbet ölçüleri, sandukalı nişlerin yeri ve aşınmış dilimler temsilîdir." cta="Kapıya yürü" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && S.panel < 0 && <EndSheet kicker="Mama Hatun Kümbeti" title="Yuvarlak avlunun ortasında"
          text="Kervan yolunun kıyısında, dilimli bir gövde ve onu kucaklayan nişli bir duvar: bir Saltuklu melikesinin adını taşıyan eşsiz bir plan."
          stayLabel="Avluda kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <CircleDot size={16} />, text: <>Nişlerin önünden geç: sayılır · aşınmış dilimde <b>E</b>: doğru taşı seç</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
];
/** Dilim onarımı: üç taş profili (üstten kesit) */
function LobePanel({ k, onClose }: { k: number; onClose: () => void }) {
  const path = (p: string) => p === 'dış bükey' ? 'M10,40 Q50,0 90,40' : p === 'düz' ? 'M10,30 L90,30' : 'M10,20 Q50,60 90,20';
  return <Modal title="Aşınmış dilim" onClose={onClose} wide>
    <p className="mb-3 text-sm text-[#4a433c]">Gövdenin taşı erimiş. Yerine konacak taşın üstten kesiti hangisi olmalı? Komşu dilimlerin biçimine bak.</p>
    <div className="grid grid-cols-3 gap-2">{PROFILES.map((p) => <button key={p} onClick={() => fixLobe(k, p)} className="flex flex-col items-center gap-1 rounded-xl bg-black/5 py-2 text-xs font-semibold text-[#1f1b17] active:scale-95">
      <svg viewBox="0 0 100 60" className="h-12 w-24"><path d={`${path(p)} L90,55 L10,55 Z`} fill="#c8b79e" stroke="#6e5d48" strokeWidth={3} /></svg>{p}</button>)}</div>
  </Modal>;
}

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low', fixed = useMama((s) => s.fixed);
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.35; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3.5} rayleigh={1.3} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#e4e6e2', 400, 3600]} />
      <hemisphereLight args={['#e7eef2', '#7a7458', 0.5]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.5} color="#fff0d6" />
      {!low && <Clouds />}
      <Mountains />
      <Ground />
      <RingWall m={m} />
      <Kumbet m={m} fixed={fixed} />
      <Kervansaray m={m} />
      <Markers />
    </group>
  );
}
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useMama.getState(); SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef(''), lobeId = useRef(-1);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useMama.getState(), active = S.started && !S.card && S.panel < 0 && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const lb = S.started ? nearLobe(live.x, live.z, S.fixed) : -1; if (lb !== lobeId.current) { lobeId.current = lb; S.set({ lobe: lb }); }
    if (S.started) { const ni = nearNiche(live.x, live.z); if (ni >= 0 && !S.niches.includes(ni)) { const niches = [...S.niches, ni]; S.set({ niches }); audio.step(1300); if (niches.length === NICHES.length) { S.set({ card: CARD_NICHE }); audio.tone(true); audio.speak(`${CARD_NICHE.name}. ${CARD_NICHE.text}`); } else say(`Niş ${niches.length}/${NICHES.length}`, 1400); } }
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY() + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}
