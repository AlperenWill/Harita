/**
 * Erzurum — Çifte Minareli Medrese ve Hatuniye Türbesi: "Kitabesiz Kapı" (detaylı). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu meydandan taç kapıya yürür, iki katlı revaklı avluya girer, güney eyvandan türbeye geçer. Yapıyı kimin ne zaman yaptırdığı
 * kaynaklarda farklıdır: üç ipucunu bul (E), sonra panoda her iddiayı dayanağıyla eşleştir. 5 ayrıntı + 3 ipucu + pano. Kroki (M).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { ClipboardList, Footprints, Map as MapIcon, MousePointer2, Search, SearchCheck } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Modal, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { CARD_PANO, CLAIMS, CLUES, MED, MINARETS, SPOTS, START, TURBE, ULU, groundY, matchOk, nearestClue, nearestSpot, slide, type Clue, type Spot } from './site';
import { Ground, HalfPanel, Madrasa, Minarets, Mountains, Portal, Surroundings, Turbe, useMats } from './CifteModels';

const THEME = { accent: '#2f5f86' };
const EYE = 1.62, WALK = 2.0, RUN = 4.4, FOV = 66;
const audio = new WalkAudio({ freq: 600, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(-0.4, 0.62, -0.62).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; clue: Clue | null; found: string[]; book: boolean; solved: boolean; map: boolean; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, clue: null, found: [] as string[], book: false, solved: false, map: false, endShown: false, toast: null as string | null };
const useCm = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.04 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3600) => { clearTimeout(toastT); useCm.getState().set({ toast: t }); toastT = setTimeout(() => useCm.getState().set({ toast: null }), ms); };
function takeClue(c: Clue) { const s = useCm.getState(); if (s.found.includes(c.id)) return; const found = [...s.found, c.id]; s.set({ found, card: { id: c.id, name: c.name, kicker: `İpucu · ${found.length}/${CLUES.length}`, text: c.text, source: c.source } }); audio.tone(true); audio.speak(`${c.name}. ${c.text}`); }
function checkBoard(m: Record<string, string>) { const s = useCm.getState(); if (matchOk(m)) { s.set({ solved: true, book: false, card: CARD_PANO }); audio.tone(true); audio.speak(`${CARD_PANO.name}. ${CARD_PANO.text}`); } else { audio.tone(false); say('Eşleşme tutmuyor: her iddianın hangi ipucuna dayandığını yeniden düşün.'); } }
export default function CifteMinareliGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useCm(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.04; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useCm.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useCm.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { useCm.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useCm.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useCm.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.book) s.set({ book: false }); else if (s.clue) takeClue(s.clue); else if (s.found.length === CLUES.length && !s.solved) s.set({ book: true }); else if (s.near) inspect(s.near); }
      if (e.code === 'KeyB' && !s.card) s.set({ book: !s.book });
      if (e.code === 'KeyM') s.set({ map: !s.map });
      if (e.code === 'Escape') { if (s.card) close(); else if (s.book) s.set({ book: false }); }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __cifte: unknown }).__cifte = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useCm.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      findAll: () => useCm.getState().set({ found: CLUES.map((c) => c.id), card: null }),
      book: (v: boolean) => useCm.getState().set({ book: v, card: null }),
      solve: () => checkBoard(Object.fromEntries(CLAIMS.map((c) => [c.id, c.ev]))),
      map: (v: boolean) => useCm.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useCm.getState(); return a.started && !a.card && !a.book && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + CLUES.length + 1, found = S.seen.length + S.found.length + (S.solved ? 1 : 0), done = found >= total;
  const allFound = S.found.length === CLUES.length;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e6e6e2] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.05, far: 4000, position: [START.at[0], groundY(START.at[0]) + EYE, START.at[1]] }}
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
          objective={S.started ? <Objective icon={<SearchCheck size={15} />} label={done ? 'Hepsini buldun' : allFound && !S.solved ? 'Pano: iddiaları dayanaklarıyla eşleştir' : `Kitabesiz kapı · ipucu ${S.found.length}/${CLUES.length}`} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="İpucu panosu (B)" active={S.book} onClick={() => S.set({ book: !S.book })}><ClipboardList size={18} /></IconButton>}{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} found={S.found} />}
        {S.started && !S.card && !S.book && <Toast text={S.toast} tone={S.toast?.startsWith('Eşleşme') ? 'bad' : 'ok'} />}
        {S.book && <Board found={S.found} solved={S.solved} onClose={() => S.set({ book: false })} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#2f5f86]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && !S.book && S.clue && <InteractPrompt icon={<SearchCheck size={18} />} label={`İpucu: ${S.clue.name}`} onClick={() => takeClue(S.clue!)} />}
          {!S.card && !S.book && !S.clue && allFound && !S.solved && <InteractPrompt icon={<ClipboardList size={18} />} label="Panoyu aç: iddiaları eşleştir" onClick={() => S.set({ book: true })} />}
          {!S.card && !S.book && !S.clue && !(allFound && !S.solved) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && !S.book && <Hint>Joystick ya da WASD ile yürü · taç kapı, avlu ve türbede ipuçlarını ara (E)<span className="hidden [@media(pointer:fine)]:inline"> · B: pano · M: kroki</span></Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Erzurum · İçkale · UNESCO Geçici Listesi" title="Kitabesiz Kapı"
          intro={<>Anadolu'nun en büyük Selçuklu medresesini kim, ne zaman yaptırdı? Kaynaklar aynı şeyi söylemiyor. Taç kapıdan gir, avluyu ve türbeyi dolaş, <b>3 ipucunu</b> bul; sonra panoda her iddiayı <b>dayanağıyla</b> eşleştir.</>}
          controls={CONTROLS} note="Oda ve revak düzeni, kabartmaların çizimi, kitabe yuvası ve yarım pano temsilîdir." cta="Medreseye yürü" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && !S.book && <EndSheet kicker="Çifte Minareli Medrese" title="Taşın sustuğu yer"
          text="Kitabesi olmayan bir yapının hikâyesini kaynaklar farklı anlatır; tarih, bu anlatıları kanıtlarla karşılaştırarak yazılır."
          stayLabel="Avluda kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <SearchCheck size={16} />, text: <>İpucunun yanında <b>E</b>: not al · <b>B</b>: pano</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele · <b>M</b>: kroki</> },
];
/** Pano: her iddiaya bir dayanak (bulunan ipuçlarından) seç */
function Board({ found, solved, onClose }: { found: string[]; solved: boolean; onClose: () => void }) {
  const [m, setM] = useState<Record<string, string>>({});
  const all = found.length === CLUES.length;
  return <Modal title="İddia ve dayanak" onClose={onClose} wide>
    <p className="mb-2 text-sm text-[#4a433c]">{solved ? 'Panoyu çözdün.' : all ? 'Her iddianın hangi ipucuna dayandığını seç.' : `Önce ipuçlarını bul (${found.length}/${CLUES.length}).`}</p>
    <div className="space-y-2">{CLAIMS.map((c) => <div key={c.id} className="rounded-2xl bg-black/5 p-2.5">
      <div className="mb-1.5 text-sm font-semibold text-[#1f1b17]">“{c.text}”</div>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">{CLUES.map((q) => <button key={q.id} disabled={!found.includes(q.id) || solved} onClick={() => setM({ ...m, [c.id]: q.id })} className={`rounded-lg px-2 py-1.5 text-left text-xs font-semibold disabled:opacity-40 ${m[c.id] === q.id ? 'text-white' : 'bg-white text-[#1f1b17]'}`} style={m[c.id] === q.id ? { background: THEME.accent } : undefined}>{found.includes(q.id) ? q.name : '?'}</button>)}</div>
    </div>)}</div>
    {all && !solved && <button onClick={() => { if (CLAIMS.some((c) => !m[c.id])) { say('Her iddiaya bir dayanak seç.'); return; } checkBoard(m); }} className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: THEME.accent }}>Eşleşmeyi kontrol et</button>}
  </Modal>;
}

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.35; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3} rayleigh={1.3} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#e2e6ea', 400, 3600]} />
      <hemisphereLight args={['#e7eef2', '#7a7468', 0.5]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.5} color="#fff2e0" />
      {!low && <Clouds />}
      <Mountains />
      <Ground />
      <Surroundings m={m} />
      <Madrasa m={m} />
      <Portal m={m} />
      <Minarets m={m} />
      <Turbe m={m} />
      <HalfPanel m={m} />
      <Markers />
    </group>
  );
}
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useCm.getState(); SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef(''), clueId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useCm.getState(), active = S.started && !S.card && !S.book && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const cl = S.started ? nearestClue(live.x, live.z, S.found) : null; if ((cl?.id ?? '') !== clueId.current) { clueId.current = cl?.id ?? ''; S.set({ clue: cl }); }
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY(live.x) + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}

/* ---------- kroki ---------- */
function Kroki({ seen, found }: { seen: string[]; found: string[] }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const x0 = -45, z0 = -60, W = 115, Hh = 110, sx = (x: number) => x - x0, sz = (z: number) => z - z0;
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-44 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-56" aria-label="Medrese krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#d8d2c4" />
        <rect x={sx(-45)} y={0} width={13} height={Hh} fill="#b8ab90" />
        <rect x={sx(MED.x0)} y={sz(MED.z0)} width={MED.x1 - MED.x0} height={MED.z1 - MED.z0} fill="#8f7b65" />
        <rect x={sx(-12.2)} y={sz(-14)} width={24.4} height={27} fill="#e6dccb" />
        <rect x={sx(ULU.x0)} y={sz(ULU.z0)} width={ULU.x1 - ULU.x0} height={ULU.z1 - ULU.z0} fill="#a39580" />
        <circle cx={sx(TURBE.x)} cy={sz(TURBE.z)} r={TURBE.r} fill="#8f7b65" />
        {MINARETS.map(([x, z], i) => <circle key={i} cx={sx(x)} cy={sz(z)} r={2.2} fill="#2f5f86" />)}
        {CLUES.map((c) => <rect key={c.id} x={sx(c.at[0]) - 2} y={sz(c.at[1]) - 2} width={4} height={4} transform={`rotate(45 ${sx(c.at[0])} ${sz(c.at[1])})`} fill={found.includes(c.id) ? THEME.accent : 'none'} stroke={THEME.accent} strokeWidth={1} />)}
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={2} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={0.8} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-live.view.yaw * 180) / Math.PI})`}><path d="M0,-3.5 L2.6,2.6 L0,1.3 L-2.6,2.6 Z" fill="#1f1b17" stroke="#fff" strokeWidth={0.5} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} ayrıntı · {found.length}/{CLUES.length} ipucu</p>
    </div>
  );
}
