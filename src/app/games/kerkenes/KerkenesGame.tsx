/**
 * Kerkenes Dağı — "Taş Surlu Kent". Ana yönetici (öteki yeni oyunlarla aynı ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu güney kapısından surların içine girer, ışınsal sokaklarda dolaşır, saray kompleksinin önüne ve kazı çukuruna gelir.
 * 5 ayrıntı: taş surlu kent, yedi kapı, saray kompleksi, kazı alanı, yıkım ve son.
 * Yaklaşınca yalnızca "İncele: … E" istemi çıkar; kart E ile açılır. Kroki (M).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, Map as MapIcon, Mountain, MousePointer2, Radar, Search } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Objective, StartSheet, ToolPanel, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { BOUNDS, GATE_ANGLES, NCELL, PALACE, PLOTS, PLOT_SIZE, RING, SPOTS, START, STREET_W, SURVEY_DONE, TRENCH, cellsNear, groundY, magAt, nearestSpot, plotAt, slide, type Spot } from './site';
import { Grass, Hills, Houses, Palace, SUN_DIR, Streets, Survey, Terrain, Trench, Wall, surveyState, useMats } from './KerkenesModels';

const THEME = { accent: '#8a5a2a' };
const EYE = 1.62, WALK = 1.7, RUN = 3.6;
const audio = new WalkAudio({ freq: 620, gain: 0.07 }, 'any');

/* ---------- durum ---------- */
type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; plot: string | null; pct: number; done: string[]; rev: number; map: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, plot: null as string | null, pct: 0, done: [] as string[], rev: 0, map: false, endShown: false };
const useKerk = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const SURVEY_SRC = { title: 'METU — Kerkenes Projesi: jeofizik araştırma', url: 'https://kerkenes.metu.edu.tr/en/node/55' };
const surveyCard = (k: number): Card => k < PLOTS.length
  ? { id: `tarama-${k}`, name: `Gömülü yapı ortaya çıktı (${k}/${PLOTS.length})`, kicker: 'Manyetik tarama', source: SURVEY_SRC,
      text: 'Kerkenes\'te kentin planı büyük ölçüde kazı yapılmadan çıkarıldı. 1993\'te başlayan manyetik (gradyometre) taramasında duvarlar, toprağın üstüne yakın oldukları ve kent yangınla yok olduğu için çok net izler bıraktı. Zemindeki koyu hücreler, gömülü duvarların izidir. Bu alandaki yapı planı temsilîdir.' }
  : { id: `tarama-${k}`, name: 'Kent haritalandı', kicker: 'Manyetik tarama', source: SURVEY_SRC,
      text: 'Kaynaklara göre manyetik tarama 2002\'de tamamlandı ve kentin 271 hektarının %90\'ından fazlasında gömülü duvarları, yapıları ve kent adalarını ortaya çıkardı. Sonradan özdirenç ve elektromanyetik ölçümlerle ayrıntı artırıldı; kazı açmalar bu haritaya göre yerleştirildi.' };
function coverage(id: string) { const c = surveyState.cells[id]; let n = 0; for (let i = 0; i < c.length; i++) n += c[i]; return n / c.length; }
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: -0.02 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();

export default function KerkenesGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useKerk(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); resetSurvey(); useKerk.setState(INITIAL); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  const inspect = useCallback((s: Spot) => {
    const st = useKerk.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`);
  }, []);
  const close = useCallback(() => { useKerk.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); resetSurvey(); useKerk.setState({ ...INITIAL, started: true }); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useKerk.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.near) inspect(s.near); }
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
    (window as unknown as { __kerk: unknown }).__kerk = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useKerk.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      spot: (id: string) => { const s = SPOTS.find((q) => q.id === id); if (s) { live.x = s.at[0]; live.z = s.at[1]; useKerk.getState().set({ started: true, card: null }); } },
      map: (v: boolean) => useKerk.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; },
      land: () => { live.fly = null; },
      seeAll: () => { for (const p of PLOTS) surveyState.cells[p.id].fill(1); surveyState.done = PLOTS.map((p) => p.id); surveyState.rev++; useKerk.getState().set({ seen: SPOTS.map((s) => s.id), done: surveyState.done }); },
      survey: (i: number, frac: number) => { const p = PLOTS[i], c = surveyState.cells[p.id]; for (let k = 0; k < c.length * frac; k++) c[k] = 1; if (frac >= 1) surveyState.done = [...new Set([...surveyState.done, p.id])]; surveyState.rev++; useKerk.getState().set({ done: surveyState.done, rev: surveyState.rev }); },
      SPOTS,
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useKerk.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + PLOTS.length, found = S.seen.length + S.done.length, done = found >= total;
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
            <SkyEnvironment sky="#d8e6ef" sun="#fff1dc" ground="#8a7a58" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<Mountain size={15} />} label={done ? 'Hepsini buldun' : S.plot ? `Taranıyor: %${Math.round(S.pct * 100)}` : 'İzleri bul, alanları tara'} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#8a5a2a]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && <ToolPanel title={<span className="flex items-center gap-1"><Radar size={14} /> Manyetik tarama · {S.done.length}/{PLOTS.length}</span>} defaultOpen={false}><SurveyMini plot={S.plot} rev={S.rev} /></ToolPanel>}
          {!S.card && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Joystick ya da WASD ile yürü · E ile incele · ipli tarama alanlarının içinde gidip gel, toprağın altını tara<span className="hidden [@media(pointer:fine)]:inline"> · tıkla, fareyle bak · M: kroki</span></Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.id.startsWith('tarama') ? S.card.kicker : `${S.card.kicker} · ${S.seen.length}/${SPOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => speakAgain(S.card!)} />}
        {!S.started && <StartSheet kicker="Yozgat · Kerkenes Dağı · Demir Çağı" title="Taş Surlu Kent"
          intro={<>Güney kapısından surların içine gir; ışınsal sokaklarda dolaş, saray kompleksini ve kazı alanını bul: <b>5 ayrıntıyı</b> incele. Kentin büyük kısmı kazılmadan, toprağın altı taranarak haritalandı: ipli <b>3 tarama alanında</b> gidip gelerek gömülü duvarları ortaya çıkar.</>}
          controls={CONTROLS} note="Sur uzunluğu, ev sayısı ve saray düzeni temsilîdir; oyunda kent ölçekli kısaltılmıştır." cta="Kente gir" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Kerkenes Dağı" title="Taşın sustuğu kent"
          text="Taş surlarıyla çevrili kent, MÖ 6. yüzyılda terk edildi. Bugün yalnızca temelleri ve sur izleri kaldı."
          stayLabel="Tepede kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
function speakAgain(s: Card) { audio.hush(); audio.speak(`${s.name}. ${s.text}`); }
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (A/D yana adım, Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ya da düğme ile incele · <b>M</b>: kroki</> },
  { icon: <Radar size={16} />, text: <>İpli karelerin içinde yürü: geçtiğin şerit taranır; alanın %85'i taranınca gömülü plan ortaya çıkar</> },
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
      <fog attach="fog" args={['#e4e6dc', 260, 2600]} />
      <hemisphereLight args={['#e6eef4', '#8a8266', 0.45]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.4} color="#fff0d8" />
      {!low && <Clouds />}
      <Hills />
      <Terrain tier={tier} />
      <Wall m={m} />
      <Streets m={m} />
      <Houses m={m} />
      <Survey m={m} />
      <Palace m={m} />
      <Trench m={m} />
      <Grass n={low ? 1500 : 4000} />
      <Markers />
    </group>
  );
}
/** Bulunmamış ayrıntıların üstünde hafif parıltı (yakınken belirginleşir) */
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const seen = useKerk.getState().seen;
    SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !seen.includes(s.id); const d = Math.hypot(live.x - s.at[0], live.z - s.at[1]);
      m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.08; m.rotation.y = clock.elapsedTime * 1.2; m.scale.setScalar(d < 25 ? 1 : 0.6); }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useKerk.getState(), active = S.started && !S.card && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.72) { live.step = 0; audio.step(1000); } live.bob += moved * 2.4;
    // manyetik tarama: alanın içinde geçilen hücreler işaretlenir
    const pl = S.started ? plotAt(live.x, live.z) : null;
    if (pl) { const c = surveyState.cells[pl.id]; let added = 0; for (const k of cellsNear(pl, live.x, live.z)) if (!c[k]) { c[k] = 1; added++; }
      if (added) { surveyState.rev++; const pct = coverage(pl.id); S.set({ rev: surveyState.rev, pct });
        if (pct >= SURVEY_DONE && !surveyState.done.includes(pl.id)) { surveyState.done = [...surveyState.done, pl.id]; const card = surveyCard(surveyState.done.length); S.set({ done: surveyState.done, card }); audio.tone(true); audio.speak(`${card.name}. ${card.text}`); } else audio.step(1600); } }
    if ((pl?.id ?? null) !== S.plot) S.set({ plot: pl?.id ?? null, pct: pl ? coverage(pl.id) : 0 });
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const gy = groundY(live.x, live.z), sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.035 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, gy + EYE, live.z, live.view, sway);
    easeFov(camera, 66, dt);
  });
  return null;
}

/* ---------- kroki ---------- */
function resetSurvey() { for (const p of PLOTS) surveyState.cells[p.id].fill(0); surveyState.done = []; surveyState.rev++; }
/** Panelde içinde bulunulan alanın taranmış hücreleri (koyu = güçlü manyetik iz) */
function SurveyMini({ plot, rev }: { plot: string | null; rev: number }) {
  const p = PLOTS.find((q) => q.id === plot); void rev;
  if (!p) return <p className="max-w-[160px] text-[11px] text-[#4a433c]">Krokideki mavi karelerden birine gir; içinde gidip geldikçe toprağın altı görünür.</p>;
  const c = surveyState.cells[p.id], s = 12;
  return <div><svg width={NCELL * s} height={NCELL * s} className="rounded" aria-label="Tarama ızgarası">{Array.from({ length: NCELL * NCELL }, (_, k) => { const i = k % NCELL, j = Math.floor(k / NCELL), v = magAt(p, i, j); const g = Math.round(255 * (1 - v * 0.85));
    return <rect key={k} x={i * s} y={j * s} width={s - 1} height={s - 1} fill={c[k] ? `rgb(${g},${g},${Math.min(255, g + 20)})` : '#d9d3c4'} />; })}</svg>
    <p className="mt-1 text-[11px] font-semibold">%{Math.round(coverage(p.id) * 100)} tarandı · hedef %{Math.round(SURVEY_DONE * 100)}</p></div>;
}
function Kroki({ seen }: { seen: string[] }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const W = BOUNDS.x1 - BOUNDS.x0, Hh = BOUNDS.z1 - BOUNDS.z0, sx = (x: number) => x - BOUNDS.x0, sz = (z: number) => z - BOUNDS.z0;
  const rm = (RING.r0 + RING.r1) / 2, gates = GATE_ANGLES.map((a) => [Math.cos(a) * rm, Math.sin(a) * rm] as [number, number]);
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-44 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-56" aria-label="Kent krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#c9bd9a" opacity={0.7} />
        <circle cx={sx(0)} cy={sz(0)} r={RING.r1} fill="#b9a784" />
        <circle cx={sx(0)} cy={sz(0)} r={RING.r0} fill="#e2d6b8" stroke="#6b5a46" strokeWidth={0.8} />
        {GATE_ANGLES.map((a, i) => <line key={i} x1={sx(0)} y1={sz(0)} x2={sx(Math.cos(a) * RING.r0)} y2={sz(Math.sin(a) * RING.r0)} stroke="#d9cba9" strokeWidth={STREET_W} />)}
        {gates.map((g, i) => <circle key={i} cx={sx(g[0])} cy={sz(g[1])} r={2.2} fill="#6b5a46" />)}
        <rect x={sx(PALACE.x0)} y={sz(PALACE.z0)} width={PALACE.x1 - PALACE.x0} height={PALACE.z1 - PALACE.z0} fill="#8a7757" />
        <rect x={sx(TRENCH.x0)} y={sz(TRENCH.z0)} width={TRENCH.x1 - TRENCH.x0} height={TRENCH.z1 - TRENCH.z0} fill="#2a2219" />
        {PLOTS.map((p) => <rect key={p.id} x={sx(p.c[0] - PLOT_SIZE / 2)} y={sz(p.c[1] - PLOT_SIZE / 2)} width={PLOT_SIZE} height={PLOT_SIZE} fill={surveyState.done.includes(p.id) ? '#2fb6c9' : 'none'} stroke="#2f7fb6" strokeWidth={2} />)}
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={5} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={2} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-live.view.yaw * 180) / Math.PI})`}><path d="M0,-6 L4.4,4.4 L0,2.2 L-4.4,4.4 Z" fill="#1f1b17" stroke="#fff" strokeWidth={0.8} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} bulundu</p>
    </div>
  );
}
