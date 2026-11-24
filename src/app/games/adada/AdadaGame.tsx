/**
 * Adada Antik Kenti — "Dağ Eteğindeki Kent". Ana yönetici (öteki yeni oyunlarla aynı ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu sütunlu caddenin başından yürür, agoraya geçer, Trajan Tapınağı kalıntısına çıkar, kuzeybatıdaki tiyatro çanağına iner. 5 ayrıntı:
 * dağ eteğindeki kent, sütunlu cadde, agora, Trajan Tapınağı, tiyatro. Yaklaşınca "İncele: … E" istemi çıkar; kart E ile açılır. Kroki (M).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, Hand, Landmark, Map as MapIcon, MousePointer2, Search } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { AGORA, AREA, BOUNDS, PIECES, SLOT, SLOT_REACH, SPOTS, START, STREET, TEMPLE, THEATRE, TOWER, canPlace, groundY, nearestPiece, nearestSpot, slide, type Piece, type Spot } from './site';
import { Anastylosis, Grass, Mountains, Pines, Ruins, SUN_DIR, Stoas, Temple, Terrain, anaState, useMats } from './AdadaModels';

const THEME = { accent: '#7d6a3a' };
const EYE = 1.62, WALK = 1.7, RUN = 3.6;
const audio = new WalkAudio({ freq: 620, gain: 0.07 }, 'any');

/* ---------- durum ---------- */
type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; nearPiece: Piece | null; nearSlot: boolean; carry: Piece | null; placed: number; toast: string | null; map: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, nearPiece: null, nearSlot: false, carry: null, placed: 0, toast: null as string | null, map: false, endShown: false };
const useAda = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const ANA_CARD: Card = { id: 'anastilosis', name: 'Sütun yeniden ayakta', kicker: 'Anastilosis',
  text: 'Anastilosis, yıkılmış bir yapının özgün parçalarını yeniden yerlerine koyarak ayağa kaldırma yöntemidir. Her bloğun tek ve özgün konumu, yoğun inceleme ve deneme-yanılmayla bulunur; bu yüzden tamburların çapı, yüzeydeki izler ve kırık yüzlerin uyumu önemlidir. Adada\'da böyle bir çalışma yapıldığı bu oyunda doğrulanmadı; sütunun yeri ve parçaları temsilîdir.',
  source: { title: 'Aphrodisias Kazısı — Anastylosis', url: 'https://aphrodisias-excavations.com/anastylosis/' } };
let toastTimer = 0;
function toast(t: string, ms = 2800) { useAda.getState().set({ toast: t }); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => useAda.getState().set({ toast: null }), ms); }
const NEXT_HINT = ['önce zemine oturan kaide gelir', 'kaidenin üstüne en kalın tambur gelir', 'sonra orta kalınlıktaki tambur', 'sütun yukarı doğru incelir: en ince tambur', 'en üste başlık'];
/** Parçayı al: elinde başka parça varsa o yerine döner */
function pickPiece(p: Piece) { const s = useAda.getState(); const taken = anaState.taken.filter((id) => id !== s.carry?.id); taken.push(p.id); anaState.taken = taken; s.set({ carry: p }); audio.step(500); toast(`Aldın: ${p.name}${s.carry ? ` (${s.carry.name} yerine bırakıldı)` : ''}`); }
/** Taşıdığın parçayı sütun yerine koy */
function placePiece() { const s = useAda.getState(), p = s.carry; if (!p) { toast(`Sütun yeri boş. ${NEXT_HINT[s.placed]}; parçayı bul ve getir.`); return; }
  if (!canPlace(s.placed, p)) { audio.tone(false); toast(`${p.name} sırada değil: ${NEXT_HINT[s.placed]}.`); return; }
  const placed = s.placed + 1; anaState.placed = placed; audio.step(260); audio.tone(true);
  if (placed === PIECES.length) { s.set({ carry: null, placed, card: ANA_CARD }); audio.speak(`${ANA_CARD.name}. ${ANA_CARD.text}`); } else { s.set({ carry: null, placed }); toast(`${p.name} yerine oturdu · ${placed}/${PIECES.length}`); } }
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: -0.02 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();

export default function AdadaGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useAda(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); anaState.taken = []; anaState.placed = 0; useAda.setState(INITIAL); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  const inspect = useCallback((s: Spot) => {
    const st = useAda.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`);
  }, []);
  const close = useCallback(() => { useAda.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); anaState.taken = []; anaState.placed = 0; useAda.setState({ ...INITIAL, started: true }); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useAda.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.nearSlot && s.placed < PIECES.length) placePiece(); else if (s.nearPiece) pickPiece(s.nearPiece); else if (s.near) inspect(s.near); }
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
    (window as unknown as { __ada: unknown }).__ada = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useAda.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      spot: (id: string) => { const s = SPOTS.find((q) => q.id === id); if (s) { live.x = s.at[0]; live.z = s.at[1]; useAda.getState().set({ started: true, card: null }); } },
      map: (v: boolean) => useAda.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; },
      land: () => { live.fly = null; },
      seeAll: () => { anaState.placed = PIECES.length; anaState.taken = PIECES.map((p) => p.id); useAda.getState().set({ seen: SPOTS.map((s) => s.id), placed: PIECES.length }); },
      build: (n: number) => { anaState.placed = n; anaState.taken = PIECES.slice(0, n).map((p) => p.id); useAda.getState().set({ placed: n }); },
      SPOTS,
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useAda.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + 1, found = S.seen.length + (S.placed >= PIECES.length ? 1 : 0), done = found >= total;
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
            <SkyEnvironment sky="#d4e6ef" sun="#fff1dc" ground="#7f8a62" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<Landmark size={15} />} label={done ? 'Hepsini buldun' : S.carry ? `Taşıyorsun: ${S.carry.name}` : S.placed > 0 && S.placed < PIECES.length ? `Sütun ${S.placed}/${PIECES.length}` : 'İzleri bul, sütunu dik'} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#7d6a3a]" />
          <LookCrosshair locked={fpl.locked} />
          <Toast text={S.toast} tone="info" />
          {!S.card && S.nearSlot && S.placed < PIECES.length && <InteractPrompt icon={<Hand size={18} />} label={S.carry ? `Yerleştir: ${S.carry.name}` : 'Sütun yeri'} onClick={placePiece} />}
          {!S.card && !(S.nearSlot && S.placed < PIECES.length) && S.nearPiece && <InteractPrompt icon={<Hand size={18} />} label={`Al: ${S.nearPiece.name}`} onClick={() => pickPiece(S.nearPiece!)} />}
          {!S.card && !(S.nearSlot && S.placed < PIECES.length) && !S.nearPiece && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Joystick ya da WASD ile yürü · E ile incele · tapınağın doğusundaki boş sütun yerine dağınık parçaları sırayla taşı<span className="hidden [@media(pointer:fine)]:inline"> · tıkla, fareyle bak · M: kroki</span></Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.id === 'anastilosis' ? S.card.kicker : `${S.card.kicker} · ${S.seen.length}/${SPOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => speakAgain(S.card!)} />}
        {!S.started && <StartSheet kicker="Isparta · Sütçüler · Pisidia" title="Dağ Eteğindeki Kent"
          intro={<>Sütunlu caddenin başından yürü; agoraya geç, Trajan Tapınağı kalıntısına çık ve tiyatronun çanağına in: <b>5 ayrıntıyı</b> incele. Tapınağın doğusunda devrilmiş bir sütunun parçaları dağınık duruyor: kaideyi, üç tamburu ve başlığı bulup <b>doğru sırayla üst üste koy</b>.</>}
          controls={CONTROLS} note="Yerleşim, sütun sayıları ve yapı biçimleri temsilîdir; tiyatro kapasitesi kaynaklarda tutarsızdır." cta="Kente gir" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Adada Antik Kenti" title="Kesintisiz bir yaşam"
          text="Kazılar, bu dağ eteği kentinin yaklaşık 17 yüzyıl kesintisiz yerleşim gördüğünü ortaya koyuyor."
          stayLabel="Kentte kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
function speakAgain(s: Card) { audio.hush(); audio.speak(`${s.name}. ${s.text}`); }
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (A/D yana adım, Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ya da düğme ile incele · <b>M</b>: kroki</> },
  { icon: <Hand size={16} />, text: <>Yerdeki sütun parçasında <b>E</b>: al; sütun yerinde <b>E</b>: yerleştir (aşağıdan yukarı, kalından inceye)</> },
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
      <fog attach="fog" args={['#dfe6e0', 260, 2400]} />
      <hemisphereLight args={['#e6eef4', '#8a8266', 0.45]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.4} color="#fff0d8" />
      {!low && <Clouds />}
      <Mountains />
      <Terrain tier={tier} />
      <Stoas m={m} />
      <Temple m={m} />
      <Anastylosis m={m} />
      <Ruins m={m} />
      <Pines n={low ? 40 : 110} />
      <Grass n={low ? 1500 : 4000} />
      <Markers />
    </group>
  );
}
/** Bulunmamış ayrıntıların üstünde hafif parıltı (yakınken belirginleşir) */
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const seen = useAda.getState().seen;
    SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !seen.includes(s.id); const d = Math.hypot(live.x - s.at[0], live.z - s.at[1]);
      m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.08; m.rotation.y = clock.elapsedTime * 1.2; m.scale.setScalar(d < 25 ? 1 : 0.6); }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useAda.getState(), active = S.started && !S.card && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.72) { live.step = 0; audio.step(1000); } live.bob += moved * 2.4;
    const np = S.started ? nearestPiece(live.x, live.z, anaState.taken) : null; if (np !== S.nearPiece) S.set({ nearPiece: np });
    const ns = S.started && Math.hypot(live.x - SLOT[0], live.z - SLOT[1]) < SLOT_REACH; if (ns !== S.nearSlot) S.set({ nearSlot: ns });
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
  const tc = THEATRE.c, arc = `M ${sx(tc[0] - THEATRE.r1)} ${sz(tc[1])} A ${THEATRE.r1} ${THEATRE.r1} 0 0 1 ${sx(tc[0] + THEATRE.r1)} ${sz(tc[1])} Z`;
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-44 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-56" aria-label="Kent krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#b9c490" opacity={0.7} />
        <rect x={sx(AREA.x0)} y={sz(AREA.z0)} width={AREA.x1 - AREA.x0} height={AREA.z1 - AREA.z0} fill="#d8d0b4" opacity={0.6} />
        <path d={arc} transform={`rotate(180 ${sx(tc[0])} ${sz(tc[1])})`} fill="#c9bda0" stroke="#7a6c58" strokeWidth={0.5} />
        <rect x={sx(STREET.cx - STREET.half)} y={sz(STREET.z0)} width={STREET.half * 2} height={STREET.z1 - STREET.z0} fill="#ece4cc" />
        <rect x={sx(AGORA.x0)} y={sz(AGORA.z0)} width={AGORA.x1 - AGORA.x0} height={AGORA.z1 - AGORA.z0} fill="#ece4cc" stroke="#9a8c74" strokeWidth={0.5} />
        <rect x={sx(TEMPLE.x0)} y={sz(TEMPLE.z0)} width={TEMPLE.x1 - TEMPLE.x0} height={TEMPLE.z1 - TEMPLE.z0} fill="#a89c84" stroke="#5b5146" strokeWidth={0.6} />
        <circle cx={sx(TOWER.c[0])} cy={sz(TOWER.c[1])} r={TOWER.r} fill="#8a7e68" />
        {PIECES.map((p) => anaState.taken.includes(p.id) ? null : <rect key={p.id} x={sx(p.at[0]) - 0.9} y={sz(p.at[1]) - 0.9} width={1.8} height={1.8} fill="#8a7e68" />)}
        <circle cx={sx(SLOT[0])} cy={sz(SLOT[1])} r={1.6} fill="none" stroke="#4a433c" strokeWidth={0.6} />
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={2} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={0.8} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-live.view.yaw * 180) / Math.PI})`}><path d="M0,-3 L2.2,2.2 L0,1.1 L-2.2,2.2 Z" fill="#1f1b17" stroke="#fff" strokeWidth={0.4} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} bulundu</p>
    </div>
  );
}
