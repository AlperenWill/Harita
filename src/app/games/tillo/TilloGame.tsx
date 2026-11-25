/**
 * Siirt Tillo — "Işık Hadisesi" (kısa oyun). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu köyden türbeye yürür, içeride sandukaları ve doğu duvarını görür. Sol paneldeki takvimle bir tarih seçip "Gün doğumunu izle"
 * der: güneş tepenin arkasından o tarihin azimutunda doğar. Yalnızca gece ile gündüzün eşit olduğu günlerde güneş gedikten görünür ve
 * ışık pencereden girer; ama pencere 1960'lardaki onarımda yer değiştirmiştir — doğu duvarında doğru pencereyi açmak gerekir (2011).
 * 3 ayrıntı + pencere + ışık. Kroki yok (tek yapı).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { CalendarDays, Footprints, MousePointer2, Search, Sunrise, SquareDashed } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Modal, Objective, StartSheet, Toast, ToolPanel, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { CARD_LIGHT, CARD_WIN, OLD_WIN, ROOM, SAND, SPOTS, START, TRUE_WIN, WATCH, WINDOWS, WIN_AT, WIN_Y, beamZAt, dateLabel, dayOf, groundY, lightHits, nearestSpot, slide, sunriseAzimuth, throughNotch, type Spot } from './site';
import { Beam, Ground, Hills, Houses, Tomb, useMats } from './TilloModels';

const THEME = { accent: '#b0702a' };
const EYE = 1.62, WALK = 1.6, RUN = 3.4, FOV = 66;
const audio = new WalkAudio({ freq: 600, gain: 0.07 }, 'any');
const DAY_SUN = new THREE.Vector3(-0.3, 0.75, 0.55).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; endShown: boolean; win: number; winFixed: boolean; lit: boolean; day: number; watching: boolean; atWin: boolean; panel: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, endShown: false, win: OLD_WIN, winFixed: false, lit: false, day: dayOf(6, 1), watching: false, atWin: false, panel: false, toast: null as string | null };
const useTil = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.04 }, speed: 0, bob: 0, step: 0, t: 0, beam: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 4200) => { clearTimeout(toastT); useTil.getState().set({ toast: t }); toastT = setTimeout(() => useTil.getState().set({ toast: null }), ms); };
const WATCH_S = 9;
function watch() { const s = useTil.getState(); if (s.watching || s.card) return; Object.assign(live, { x: WATCH.at[0], z: WATCH.at[1], t: 0, beam: 0 }); live.view.yaw = WATCH.yaw; live.view.pitch = WATCH.pitch; s.set({ watching: true, panel: false }); audio.tone(true); }
function finishWatch() {
  const s = useTil.getState(), az = sunriseAzimuth(s.day), dev = az - 90; s.set({ watching: false });
  if (lightHits(s.win, s.day)) { s.set({ lit: true, card: CARD_LIGHT }); audio.tone(true); audio.speak(`${CARD_LIGHT.name}. ${CARD_LIGHT.text}`); return; }
  if (throughNotch(s.day)) { say('Güneş gedikten göründü, ışık içeri girdi ama sandukalara değil: pencere yanlış yerde. Doğu duvarındaki pencereye bak.', 5600); audio.tone(false); return; }
  say(`${dateLabel(s.day)}: güneş doğunun ${Math.abs(dev).toFixed(0)}° ${dev < 0 ? 'kuzeyinde' : 'güneyinde'} doğdu, gedikten görünmedi. Gece ile gündüzün eşit olduğu günü dene.`, 6000); audio.tone(false);
}

export default function TilloGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useTil(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0, t: 0, beam: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.04; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useTil.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useTil.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { useTil.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useTil.setState({ ...INITIAL, started: true }); reset(); }, []);
  const choose = useCallback((i: number) => { const st = useTil.getState(); st.set({ win: i, panel: false });
    if (i === TRUE_WIN) { st.set({ winFixed: true, card: CARD_WIN }); audio.tone(true); audio.speak(`${CARD_WIN.name}. ${CARD_WIN.text}`); } else say(i === OLD_WIN ? '1960\'lardaki pencere: buradan giren ışık sandukaların yanından geçer.' : 'Bu pencereden giren ışık sandukalara ulaşmaz.', 4200); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useTil.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.panel) s.set({ panel: false }); else if (s.atWin && !s.watching) s.set({ panel: true }); else if (s.near && !s.watching) inspect(s.near); }
      if (e.code === 'Escape') { if (s.card) close(); else if (s.panel) s.set({ panel: false }); }
      if (e.code === 'KeyG' && !s.card) watch();
      if (!s.watching && !s.card) { if (e.code === 'BracketRight' || e.code === 'Period') s.set({ day: (s.day % 365) + 1 }); if (e.code === 'BracketLeft' || e.code === 'Comma') s.set({ day: ((s.day + 363) % 365) + 1 }); }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __tillo: unknown }).__tillo = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useTil.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      day: (m: number, d: number) => useTil.getState().set({ day: dayOf(m, d) }),
      win: (i: number) => useTil.getState().set({ win: i }),
      choose: (i: number) => choose(i),
      watch: () => { useTil.getState().set({ started: true, card: null }); watch(); },
      at: (t: number) => { live.t = t; },
      panel: (v: boolean) => useTil.getState().set({ panel: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
    };
  }, [choose]);

  const fpl = useFpLook(live.view, () => { const a = useTil.getState(); return a.started && !a.card && !a.panel && !a.watching && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + 2, found = S.seen.length + (S.winFixed ? 1 : 0) + (S.lit ? 1 : 0), done = found >= total;
  const step = (d: number) => { if (!S.watching) S.set({ day: (((S.day - 1 + d) % 365) + 365) % 365 + 1 }); };
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#ece4d4] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.05, far: 3000, position: [START.at[0], groundY(START.at[0], START.at[1]) + EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#dde6ec" sun="#fff0d6" ground="#a8936a" sunDir={[DAY_SUN.x, DAY_SUN.y, DAY_SUN.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<Sunrise size={15} />} label={done ? 'Hepsini buldun' : S.lit ? 'Türbeyi gez' : S.winFixed ? 'Işığın gününü bul' : 'Işık neden sandukaya ulaşmıyor?'} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && <Toast text={S.toast} tone={S.toast?.startsWith('Güneş gedikten göründü') ? 'bad' : 'info'} />}
        {S.started && !S.card && !S.panel && <ToolPanel title={<span className="flex items-center gap-1.5"><CalendarDays size={14} /> Gün doğumu</span>}>
          <div className="w-44 space-y-2 text-[#1f1b17]">
            <div className="text-center text-sm font-bold">{dateLabel(S.day)}</div>
            <div className="grid grid-cols-4 gap-1 text-xs font-semibold">
              {[-10, -1, 1, 10].map((d) => <button key={d} onClick={() => step(d)} disabled={S.watching} className="rounded-lg bg-black/5 py-1.5 active:scale-95 disabled:opacity-40">{d > 0 ? `+${d}` : d}</button>)}
            </div>
            <button onClick={watch} disabled={S.watching} className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white disabled:opacity-50" style={{ background: THEME.accent }}><Sunrise size={14} /> Gün doğumunu izle</button>
            <div className="text-[10px] font-semibold text-[#6b6157]">Pencere: {S.win === TRUE_WIN ? 'yeni (2011)' : S.win === OLD_WIN ? '1960\'lardaki' : 'deneme'}</div>
          </div>
        </ToolPanel>}
        {S.panel && <WindowPanel win={S.win} onChoose={choose} onClose={() => S.set({ panel: false })} />}
        {S.started && (<>
          {!S.watching && <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#b0702a]" />}
          {!S.watching && <LookCrosshair locked={fpl.locked} />}
          {!S.card && !S.panel && !S.watching && S.atWin && <InteractPrompt icon={<SquareDashed size={18} />} label="Doğu duvarı: pencereyi seç" onClick={() => S.set({ panel: true })} />}
          {!S.card && !S.panel && !S.watching && !S.atWin && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>{S.watching ? 'Gün doğuyor… doğu penceresine bak' : <>Tarihi seç, gün doğumunu izle · doğu duvarında pencereyi seç<span className="hidden [@media(pointer:fine)]:inline"> · G: izle · [ ]: gün</span></>}</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Siirt · Tillo · İsmail Fakirullah Türbesi" title="Işık Hadisesi"
          intro={<>Yılda iki gün doğan güneşin ilk ışığı tepedeki gedikten ve türbenin penceresinden geçip sandukalara düşer. <b>Hangi günler?</b> Takvimden tarihi seç, gün doğumunu izle. Işık ulaşmıyorsa <b>pencerenin yerine</b> bak.</>}
          controls={CONTROLS} note="Güneşin doğduğu yön gökbilim formülüyle hesaplanır; gedik, pencere yerleri ve türbenin ölçüleri temsilîdir." cta="Türbeye yürü" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Tillo" title="Gün ile gecenin eşitlendiği sabah"
          text="Bir bilginin hocası için kurduğu ışık düzeneği, yerini değiştiren bir onarımdan sonra 2011'de yeniden çalıştı; her yıl iki sabah, birkaç dakikalığına."
          stayLabel="Türbede kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <CalendarDays size={16} />, text: <>Soldaki takvimle tarihi değiştir; <b>Gün doğumunu izle</b> (G)</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya ya da doğu duvarına yaklaş: <b>E</b></> },
];
/** Doğu duvarı, üstten görünüş: gedikten gelen ışığın üç pencereden geçişi */
function WindowPanel({ win, onChoose, onClose }: { win: number; onChoose: (i: number) => void; onClose: () => void }) {
  const H = ROOM.half, s = 30, ox = 140, oz = 110, X = (x: number) => ox + x * s, Z = (z: number) => oz + z * s;
  return <Modal title="Doğu duvarı · pencereyi seç" onClose={onClose} wide>
    <p className="mb-2 text-sm text-[#4a433c]">Ekinoks sabahı güneş tam doğudan (sağdan) gelir; ışık pencereden dümdüz içeri girer. Hangi pencereden giren ışık iki sandukanın ayak ucuna düşer?</p>
    <svg viewBox="0 0 300 220" className="mb-3 w-full rounded-xl bg-[#f3ede2]">
      <rect x={X(-H)} y={Z(-H)} width={2 * H * s} height={2 * H * s} fill="#e9dfcb" stroke="#8a7a5c" strokeWidth={6} />
      {SAND.xs.map((x) => <rect key={x} x={X(x - SAND.w / 2)} y={Z(SAND.z0)} width={SAND.w * s} height={(SAND.z1 - SAND.z0) * s} rx={4} fill="#2f5a3c" />)}
      <text x={X(0)} y={Z(SAND.z1) + 16} textAnchor="middle" fontSize={10} fill="#4a433c">ayak ucu</text>
      {WINDOWS.map((z, i) => <g key={i}><line x1={X(H + 1.6)} y1={Z(z)} x2={X(-H)} y2={Z(z)} stroke={i === win ? '#e0a030' : '#d9c9a8'} strokeWidth={2} strokeDasharray={i === win ? '' : '4 3'} />
        <rect x={X(H) - 2} y={Z(z) - 7} width={8} height={14} fill={i === win ? '#e0a030' : '#fff'} stroke="#8a7a5c" /><text x={X(H) + 26} y={Z(z) + 4} fontSize={11} fontWeight={700} fill="#4a433c">{i + 1}</text></g>)}
      <text x={X(H) + 18} y={20} fontSize={10} fill="#4a433c">doğu → gedik</text>
    </svg>
    <div className="grid grid-cols-3 gap-2">{WINDOWS.map((_, i) => <button key={i} onClick={() => onChoose(i)} className={`rounded-xl py-2.5 text-sm font-bold ${i === win ? 'text-white' : 'bg-black/5 text-[#1f1b17]'}`} style={i === win ? { background: THEME.accent } : undefined}>{i + 1}. pencere{i === OLD_WIN ? ' (1960\'lar)' : ''}</button>)}</div>
  </Modal>;
}

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), win = useTil((s) => s.win), day = useTil((s) => s.day), watching = useTil((s) => s.watching);
  const { scene, gl } = useThree(), sun = useRef<THREE.Mesh>(null), dl = useRef<THREE.DirectionalLight>(null), hemi = useRef<THREE.HemisphereLight>(null), skyG = useRef<THREE.Group>(null), envBase = useRef<number | null>(null);
  const [beamOn, setBeamOn] = useState(0);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  // hüzme: pencereden iki sandukanın ayak ucuna (ya da yanlış pencerede yere/duvara)
  const beam = useMemo(() => { const hit = lightHits(win, day), z1 = beamZAt(win, day, SAND.xs[0]), z2 = beamZAt(win, day, SAND.xs[1]), from: [number, number, number] = [ROOM.half + ROOM.t, WIN_Y, WINDOWS[win] + 0.0];
    const to: [number, number, number] = hit ? [SAND.xs[1], 0.97, z2] : [-ROOM.half + 0.05, 0.4, beamZAt(win, day, -ROOM.half)];
    const glow: [number, number, number][] = hit ? [[SAND.xs[0], 0.97, z1], [SAND.xs[1], 0.97, z2]] : [[-ROOM.half + 0.6, 0.17, beamZAt(win, day, -ROOM.half + 0.6)]];
    return { from, to, glow, notch: throughNotch(day) }; }, [win, day]);
  const az = (sunriseAzimuth(day) * Math.PI) / 180;
  useFrame((_, raw) => { const st = useTil.getState(), on = st.watching;
    if (on) { live.t = Math.min(WATCH_S, live.t + Math.min(raw, 0.25)); if (live.t >= WATCH_S) finishWatch(); }
    const k = on ? live.t / WATCH_S : 1, elev = on ? -3 + k * 13 : 40, e = (elev * Math.PI) / 180;
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(e), Math.sin(e), -Math.cos(az) * Math.cos(e));
    if (sun.current) { sun.current.visible = on; sun.current.position.copy(dir).multiplyScalar(700); }
    if (envBase.current === null) envBase.current = scene.environmentIntensity;
    const dawn = on ? Math.min(1, Math.max(0, (elev + 3) / 10)) : 1;
    scene.environmentIntensity = on ? 0.05 + 0.15 * dawn : envBase.current ?? 0.35; gl.toneMappingExposure = on ? 0.55 + 0.25 * dawn : 0.85;
    if (dl.current) { dl.current.intensity = on ? 0.35 * dawn : 0; dl.current.position.copy(dir).multiplyScalar(60); }
    if (hemi.current) hemi.current.intensity = on ? 0.08 + 0.2 * dawn : 0.45;
    if (skyG.current) skyG.current.visible = !on;
    scene.background = on ? new THREE.Color().setHSL(0.6 - 0.5 * dawn * 0.3, 0.35, 0.18 + 0.35 * dawn) : null;
    // hüzme: güneş sırtı aştıktan sonra, yalnızca gedikten görünüyorsa (birkaç saniye)
    const b = on && beam.notch && elev > 1 && elev < 7 ? Math.min(1, (elev - 1) / 1.2) * Math.min(1, (7 - elev) / 1.5) : st.lit && !on ? 0 : 0;
    if (Math.abs(b - live.beam) > 0.02) { live.beam = b; setBeamOn(b); } });
  return (
    <group ref={g}>
      <group ref={skyG} userData={{ noCast: true }}><Sky sunPosition={[DAY_SUN.x * 1000, DAY_SUN.y * 1000, DAY_SUN.z * 1000]} turbidity={4} rayleigh={1.2} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#e4e2d8', 300, 2600]} />
      <hemisphereLight ref={hemi} args={['#e7eef2', '#8a7a58', 0.45]} />
      {!watching && <Sun tier={tier} dir={DAY_SUN} intensity={5.5} color="#fff0d6" />}
      <directionalLight ref={dl} color="#ffb66a" intensity={0} />
      <mesh ref={sun} userData={{ noCast: true }} visible={false}><sphereGeometry args={[9, 24, 16]} /><meshBasicMaterial color="#ffd9a0" fog={false} /></mesh>
      <Hills />
      <Ground />
      <Houses m={m} />
      <Tomb m={m} win={win} />
      <Beam from={beam.from} to={beam.to} glow={beam.glow} on={beamOn} />
      <Markers />
    </group>
  );
}
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useTil.getState(); SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id) && !st.watching; m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.08, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useTil.getState(), active = S.started && !S.card && !S.panel && !S.watching && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const atWin = Math.hypot(live.x - WIN_AT[0], live.z - WIN_AT[1]) < 1.3 || (live.x > 2.4 && Math.abs(live.z) < 3 && Math.abs(live.x) < 3.4 && Math.abs(live.z) < 3.4); if (atWin !== S.atWin) S.set({ atWin });
    const gy = groundY(live.x, live.z), sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, gy + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}
