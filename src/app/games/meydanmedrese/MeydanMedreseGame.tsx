/**
 * Meydan Medresesi — "Biçer'in Avlusu". Ana yönetici (öteki yeni oyunlarla aynı ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu meydandan kitabeli taç kapıya yürür, avluya girer, havuzun etrafında dolaşır ve kuzeydeki eyvana geçer. 5 ayrıntı:
 * taç kapı ve kitabe, avlulu plan, yaptıran tartışması, restorasyon, kent arşivi ve müze planı. Yaklaşınca "İncele: … E" istemi çıkar. Kroki (M).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { BookOpen, Footprints, Landmark, Map as MapIcon, MousePointer2, Search } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Modal, Objective, StartSheet, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { BOUNDS, COLUMNS, EAST_DIGITS, EYVAN_ROOM, HIJRI, KITABE_AT, KITABE_REACH, SPOTS, START, YEAR_CHOICES, groundY, hijriToGregorian, nearestSpot, slide, type Spot } from './site';
import { Ground, Houses, Madrasa, Mountains, SUN_DIR, Square, Trees, useMats } from './MeydanModels';

const THEME = { accent: '#7a5a2e' };
const EYE = 1.62, WALK = 1.7, RUN = 3.6;
const audio = new WalkAudio({ freq: 620, gain: 0.07 }, 'any');

/* ---------- durum ---------- */
type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; nearKitabe: boolean; reading: boolean; read: boolean; map: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, nearKitabe: false, reading: false, read: false, map: false, endShown: false };
const useMeyd = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const KITABE_CARD: Card = { id: 'kitabe', name: 'Kitabe okundu: H. 1112', kicker: 'Kitabe',
  text: 'Kitabedeki yıl Doğu Arap rakamlarıyla ١١١٢, yani Hicri 1112\'dir. Hicri yıl ay yılıdır ve yaklaşık 354 gün sürer; bu yüzden bir Hicri yıl iki Miladi yıla yayılabilir. Hicri 1112, Miladi 1700–1701\'e denk gelir. Kitabe iki satırlık nesih yazıdır ve ağırlıklı olarak Kur\'an ayetleri içerir. Oyundaki yazı kıvrımları temsilîdir, okunabilir bir metin değildir.',
  source: { title: 'Hakkâri Üniversitesi hakemli dergi makalesi — Meydan Medresesi', url: 'https://hjuoz.uoz.edu.krd/index.php/hum/article/download/1836/1306/7289' } };
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: -0.02 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();

export default function MeydanMedreseGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useMeyd(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useMeyd.setState(INITIAL); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  const inspect = useCallback((s: Spot) => {
    const st = useMeyd.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`);
  }, []);
  const close = useCallback(() => { useMeyd.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useMeyd.setState({ ...INITIAL, started: true }); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useMeyd.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.reading) s.set({ reading: false }); else if (s.nearKitabe && !s.read) s.set({ reading: true }); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape' && s.reading) s.set({ reading: false });
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
    (window as unknown as { __meyd: unknown }).__meyd = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useMeyd.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      spot: (id: string) => { const s = SPOTS.find((q) => q.id === id); if (s) { live.x = s.at[0]; live.z = s.at[1]; useMeyd.getState().set({ started: true, card: null }); } },
      map: (v: boolean) => useMeyd.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; },
      land: () => { live.fly = null; },
      seeAll: () => useMeyd.getState().set({ seen: SPOTS.map((s) => s.id), read: true }),
      reading: (v: boolean) => useMeyd.getState().set({ reading: v }),
      SPOTS,
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useMeyd.getState(); return a.started && !a.card && !a.reading && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + 1, found = S.seen.length + (S.read ? 1 : 0), done = found >= total;
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
            <SkyEnvironment sky="#d8e4ea" sun="#fff1dc" ground="#8f8670" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<Landmark size={15} />} label={done ? 'Hepsini buldun' : 'İzleri bul, kitabeyi oku'} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#7a5a2e]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && S.reading && <KitabePanel onClose={() => S.set({ reading: false })} onDone={() => { S.set({ reading: false, read: true, card: KITABE_CARD }); audio.tone(true); audio.speak(`${KITABE_CARD.name}. ${KITABE_CARD.text}`); }} />}
          {!S.card && !S.reading && S.nearKitabe && !S.read && <InteractPrompt icon={<BookOpen size={18} />} label="Kitabeyi oku" onClick={() => S.set({ reading: true })} />}
          {!S.card && !S.reading && !(S.nearKitabe && !S.read) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Joystick ya da WASD ile yürü · E ile incele · taç kapının önünde kitabedeki yılı oku<span className="hidden [@media(pointer:fine)]:inline"> · tıkla, fareyle bak · M: kroki</span></Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.id === 'kitabe' ? S.card.kicker : `${S.card.kicker} · ${S.seen.length}/${SPOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => speakAgain(S.card!)} />}
        {!S.started && <StartSheet kicker="Hakkâri · Biçer · 1700–1701" title="Biçer'in Avlusu"
          intro={<>Meydandan kitabeli taç kapıya yürü; avluya gir, revakların ve havuzun çevresinde dolaş, kuzey eyvanına geç: <b>5 ayrıntıyı</b> incele. Taç kapının önünde <b>kitabeyi oku</b>: Doğu Arap rakamlarını çöz ve Hicri yılı Miladi takvime çevir.</>}
          controls={CONTROLS} note="Yaptıranın kimliği tartışmalıdır; hücre sayısı ve iç düzen temsilîdir." cta="Medreseye gir" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Meydan Medresesi" title="Avlunun sessizliği"
          text="Kitabesi H. 1112 (M. 1700–1701) tarihini taşıyan medrese, bugün üniversite tarafından yeniden ziyarete açık."
          stayLabel="Avluda kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
function speakAgain(s: Card) { audio.hush(); audio.speak(`${s.name}. ${s.text}`); }
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (A/D yana adım, Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ya da düğme ile incele · <b>M</b>: kroki</> },
  { icon: <BookOpen size={16} />, text: <>Taç kapının hemen önünde <b>E</b>: kitabedeki yılı çöz</> },
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
      <fog attach="fog" args={['#e4e0d2', 240, 2400]} />
      <hemisphereLight args={['#e6eef4', '#8a8266', 0.45]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.4} color="#fff0d8" />
      {!low && <Clouds />}
      <Mountains />
      <Ground tier={tier} />
      <Square m={m} />
      <Madrasa m={m} />
      <Houses m={m} />
      <Trees n={low ? 6 : 12} />
      <Markers />
    </group>
  );
}
/** Bulunmamış ayrıntıların üstünde hafif parıltı (yakınken belirginleşir) */
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const seen = useMeyd.getState().seen;
    SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !seen.includes(s.id); const d = Math.hypot(live.x - s.at[0], live.z - s.at[1]);
      m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.08; m.rotation.y = clock.elapsedTime * 1.2; m.scale.setScalar(d < 25 ? 1 : 0.6); }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useMeyd.getState(), active = S.started && !S.card && !S.reading && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.72) { live.step = 0; audio.step(1000); } live.bob += moved * 2.4;
    const nk = S.started && Math.hypot(live.x - KITABE_AT[0], live.z - KITABE_AT[1]) < KITABE_REACH; if (nk !== S.nearKitabe) S.set({ nearKitabe: nk });
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const gy = groundY(live.x, live.z), sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.035 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, gy + EYE, live.z, live.view, sway);
    easeFov(camera, 66, dt);
  });
  return null;
}

/* ---------- kroki ---------- */
/** Kitabe: 1) kitabedeki dört Doğu Arap rakamını sırayla çöz; 2) Hicri yılı Miladi'ye çevir */
function KitabePanel({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const digits = String(HIJRI).split('').map(Number);
  const [pos, setPos] = useState(0), [wrong, setWrong] = useState<string | null>(null), [step, setStep] = useState<1 | 2>(1);
  const [g0, g1] = hijriToGregorian(HIJRI), answer = `${g0}–${g1}`;
  const pickDigit = (d: number) => { if (d === digits[pos]) { audio.step(700); setWrong(null); if (pos + 1 === digits.length) setStep(2); setPos(pos + 1); } else { audio.tone(false); setWrong(`${EAST_DIGITS[digits[pos]]} işareti ${d} değil; tablodan karşılaştır.`); } };
  const pickYear = (y: string) => { if (y === answer) onDone(); else { audio.tone(false); setWrong(y === String(HIJRI) ? 'Bu Hicri yıl; Miladi karşılığı farklı. Hicri yıl daha kısa (≈354 gün).' : 'Bu yıl değil. İpucu: M ≈ H × 0,97 + 621,6.'); } };
  return (
    <Modal title="Kitabeyi oku" onClose={onClose}>
      <p className="mb-2 text-sm text-[#4a433c]">Kitabenin sonunda yıl, Doğu Arap rakamlarıyla yazılmış:</p>
      <p className="mb-3 text-center font-serif text-4xl tracking-[0.3em] text-[#1f1b17]" dir="rtl">{digits.map((d, i) => <span key={i} className={i < pos ? 'text-[#1f9d63]' : i === pos && step === 1 ? 'underline decoration-[#b3392b] decoration-4 underline-offset-8' : ''}>{EAST_DIGITS[d]}</span>)}</p>
      {step === 1 ? <>
        <p className="mb-2 text-xs text-[#4a433c]">Rakamlar soldan sağa okunur. Altı çizili işaretin karşılığını seç ({pos + 1}/4):</p>
        <div className="mb-2 grid grid-cols-5 gap-1.5">{EAST_DIGITS.map((e, d) => <button key={d} onClick={() => pickDigit(d)} className="rounded-lg bg-[#f1e6c8] py-1.5 text-center ring-1 ring-black/10 active:scale-95"><span className="block font-serif text-xl leading-none">{e}</span><span className="text-[11px] font-semibold">{d}</span></button>)}</div>
        <p className="text-center text-sm font-semibold">Okunan: {digits.slice(0, pos).join('') || '…'}</p>
      </> : <>
        <p className="mb-2 text-sm">Kitabedeki yıl <b>Hicri {HIJRI}</b>. Hicri yıl ay yılıdır (≈354 gün). Miladi takvimde hangi yıllara denk gelir?</p>
        <div className="grid grid-cols-2 gap-2">{YEAR_CHOICES.map((y) => <button key={y} onClick={() => pickYear(y)} className="rounded-xl bg-[#f1e6c8] px-3 py-3 text-sm font-semibold ring-1 ring-black/10 active:scale-95">{y}</button>)}</div>
      </>}
      {wrong && <p className="mt-2 text-sm font-semibold text-[#b3392b]">{wrong}</p>}
    </Modal>
  );
}
function Kroki({ seen }: { seen: string[] }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const W = BOUNDS.x1 - BOUNDS.x0, Hh = BOUNDS.z1 - BOUNDS.z0, sx = (x: number) => x - BOUNDS.x0, sz = (z: number) => z - BOUNDS.z0;
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-44 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-56" aria-label="Medrese krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#d9d2b8" opacity={0.7} />
        <rect x={sx(-14)} y={sz(-16)} width={28} height={32} fill="#9a8c78" stroke="#5b5146" strokeWidth={0.6} />
        <rect x={sx(-9.6)} y={sz(-14.4)} width={19.2} height={28.8} fill="#e4dcc6" />
        <rect x={sx(-13.6)} y={sz(-12)} width={4} height={24} fill="#7a6c58" />
        <rect x={sx(9.6)} y={sz(-12)} width={4} height={24} fill="#7a6c58" />
        <circle cx={sx(0)} cy={sz(4)} r={1.7} fill="#3e7f8e" />
        {[[22.5, -23, 7, 6], [26.5, 12, 7, 8], [-32, -21.5, 8, 7], [-31, 11, 10, 6]].map(([x, z, w, d], i) => <rect key={i} x={sx(x)} y={sz(z)} width={w} height={d} fill="#e7e0cc" stroke="#8a7a66" strokeWidth={0.4} />)}
        <rect x={sx(EYVAN_ROOM.x0)} y={sz(EYVAN_ROOM.z0)} width={EYVAN_ROOM.x1 - EYVAN_ROOM.x0} height={-16 - EYVAN_ROOM.z0} fill="#b6a98f" />
        {COLUMNS.map((c, i) => <circle key={`c${i}`} cx={sx(c[0])} cy={sz(c[1])} r={0.5} fill="#6a5a44" />)}
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={2.2} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={0.8} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-live.view.yaw * 180) / Math.PI})`}><path d="M0,-3 L2.2,2.2 L0,1.1 L-2.2,2.2 Z" fill="#1f1b17" stroke="#fff" strokeWidth={0.4} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} bulundu</p>
    </div>
  );
}
