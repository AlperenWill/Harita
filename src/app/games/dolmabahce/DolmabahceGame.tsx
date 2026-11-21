/**
 * Dolmabahçe Sarayı — "Kristal ve Işığın İhtişamı": Parıltı Avı. Ana yönetici.
 *
 * Oyuncu sarayı ilk kez gören bir misafirdir. Ziyaretçi rotasında yalnızca İLERİ/GERİ yürür (W/S, ya da ekranı dikey sürükleme);
 * kamera her bölümde en iyi açıyı kendisi bulur ve yavaşça süzülür (serbest kamera yok):
 *   Medhal: arkadan, göz hizasının biraz üstünden · Muayede: geniş açı, kubbeye doğru yükselen bakış · avizenin altı: avize çevresinde
 *   aşağıdan yörünge · Kristal Merdiven: merdiven boşluğunun köşesinden sabit (iki kol ve kristal korkuluklar kadrajda) · Süfera ve
 *   Atatürk'ün odası: sakin takip ya da sabit açı.
 * Parıltı Avı: on nesne hafifçe nabız atar (hale + ışıma). Yaklaşınca kristal tınısı çalar ve "İncele" çıkar; tıklayınca kamera nesneye
 * makro yakınlaşır, malzeme bilgisi kartı açılır. Çift dokunuş/tıklama: henüz bulunmamış en yakın nesneye kendiliğinden gider ve açar.
 * Kalite: ReflectionOptimizer.reflectionPlan (düzlemsel yansıma / ortam küpü, transmission, kristal sayısı, LOD); kare hızı düşerse kademe iner.
 * Şanlıurfa ve öteki oyunlarla tutarlılık: aynı cihaz profili, ?q= / ?debug, pil tasarrufu, sesli okuma, WebGL yoksa fotoğraf yedeği.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { create } from 'zustand';
import { Controls, GameMenu, Hint, HudTheme, InfoSheet, StartSheet, EndSheet, TopRow, Objective } from '../shared/hud/Hud';
import { useSettings } from '../shared/hud/settings';
import { ChevronsRight, Footprints, Info } from 'lucide-react';
import { ArrowLeft, Gem, Search, Sparkles } from 'lucide-react';
import { Character, newRig, type Palette } from '../kiz-kulesi/NPCController';
import { CHANDELIER, ROUTE_LEN, STAIR, UPPER, clampToRoom, routeAt, zoneAt, type V3, type Zone } from './palace';
import { SPARKLES, nearSparkle, nextUnfound, pulse, type Sparkle } from './SparkleHuntMechanic';
import { reflectionPlan, reflectorRoom, type Plan, type Tier } from './ReflectionOptimizer';
import { orbitCamera } from './CrystalChandelier';
import { PalaceScene } from './PalaceScene';
import { palaceAudio } from './DolmabahceAudio';

const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const pinned = (() => { const q = new URLSearchParams(location.search).get('q'); return q === 'low' || q === 'medium' || q === 'high' ? (q as Tier) : null; })();
function detectTier(): Tier {
  if (pinned) return pinned;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low';
  return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high';
}
const GUEST: Palette = { skin: '#d9a982', hair: '#2a1a12', top: '#24324a', pants: '#2a2a30', shoes: '#3a2a20', scarf: '#c9a24a' };

/* ---------- durum ---------- */
interface S { started: boolean; zone: Zone; found: string[]; card: Sparkle | null; near: Sparkle | null; muted: boolean; tts: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, zone: 'medhal' as Zone, found: [] as string[], card: null, near: null, endShown: false };
const useDb = create<S>((set) => ({ ...INITIAL, muted: false, tts: true, set: (p) => set(p) }));
const pause = { on: false };   // ≡ menü açıkken oyun durur
const live = { s: 0, v: 0, input: 0, goal: null as number | null, goalOpen: null as Sparkle | null, rig: newRig(0, 13, 0) };

export default function DolmabahceGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}

function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier), [saver, setSaver] = useState(false);
  const plan = useMemo(() => reflectionPlan(tier, saver), [tier, saver]);
  const S = useDb();
  const keys = useRef(new Set<string>()), drag = useRef<{ id: number; y0: number; last: number } | null>(null), lastTap = useRef(0);

  useEffect(() => {
    type B = EventTarget & { level: number; charging: boolean }; let b: B | null = null; const check = () => b && setSaver(b.level < 0.2 && !b.charging);
    (navigator as Navigator & { getBattery?: () => Promise<B> }).getBattery?.().then((x) => { b = x; check(); x.addEventListener('levelchange', check); x.addEventListener('chargingchange', check); }).catch(() => {});
    return () => { b?.removeEventListener('levelchange', check); b?.removeEventListener('chargingchange', check); };
  }, []);
  const G = useSettings(); useEffect(() => { palaceAudio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => { palaceAudio.setZone(S.zone); }, [S.zone]);
  useEffect(() => () => { palaceAudio.dispose(); useDb.setState(INITIAL); Object.assign(live, { s: 0, v: 0, input: 0, goal: null, goalOpen: null }); }, []);

  const open = useCallback((k: Sparkle) => { const s = useDb.getState(); s.set({ card: k, found: s.found.includes(k.id) ? s.found : [...s.found, k.id] }); if (useSettings.getState().tts) palaceAudio.speak(`${k.name}. ${k.text}`); }, []);
  const close = useCallback(() => { useDb.getState().set({ card: null }); palaceAudio.hush(); }, []);
  const goNext = useCallback(() => { const k = nextUnfound(live.s, useDb.getState().found); if (k) { live.goal = k.sAnchor; live.goalOpen = k; } }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); const s = useDb.getState(); if (!s.started || e.repeat) return;
      if (e.code === 'KeyE' || e.code === 'Enter') { if (s.card) close(); else if (s.near) open(s.near); }
      if (e.code === 'Escape' && s.card) close(); if (e.code === 'KeyN') goNext();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0; const loop = () => { const k = keys.current, kb = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0); live.input = drag.current ? live.input : kb; raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); };
  }, [open, close, goNext]);
  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __dolma: unknown }).__dolma = { go: (s: number) => { live.s = s; live.goal = null; useDb.getState().set({ started: true }); }, open: (id: string) => open(SPARKLES.find((k) => k.id === id)!), close, state: () => ({ ...useDb.getState(), s: live.s }) };
  }, [open, close]);

  // tek parmak / fare dikey sürükleme = ileri-geri; çift dokunuş = en yakın parlayan nesne
  const onDown = (e: React.PointerEvent) => {
    palaceAudio.unlock(); if (!useDb.getState().started || useDb.getState().card) return; const now = performance.now();
    if (now - lastTap.current < 300) goNext(); lastTap.current = now; drag.current = { id: e.pointerId, y0: e.clientY, last: now };
  };
  const onMove = (e: React.PointerEvent) => { const d = drag.current; if (!d || d.id !== e.pointerId) return; live.input = THREE.MathUtils.clamp(-(e.clientY - d.y0) / 70, -1, 1); if (Math.abs(live.input) > 0.1) live.goal = null; };
  const onUp = (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) { drag.current = null; live.input = 0; } };
  const start = () => { palaceAudio.unlock(); S.set({ started: true }); };

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#120d08] text-white" style={{ touchAction: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <HudTheme theme={THEME}>
      <Canvas dpr={plan.dpr} gl={{ antialias: plan.tier === 'high', powerPreference: 'high-performance' }} camera={{ fov: 55, near: 0.05, far: 200, position: [0, 2.4, 18] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}>
          <World plan={plan} />
          {plan.bloom && (
            <EffectComposer multisampling={0}>
              <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.25} intensity={plan.tier === 'high' ? 0.85 : 0.6} />
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              <Vignette darkness={0.45} offset={0.3} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>

      <TopRow onExit={onExit} objective={S.started ? <Objective icon={<Gem size={15} />} label={S.found.length < SPARKLES.length ? 'Salonlarda parlayan nesneleri bul' : 'Hepsi bulundu'} done={S.found.length} total={SPARKLES.length} /> : undefined} right={<GameMenu onPause={(v) => { pause.on = v; }} help={<Controls items={CONTROLS} />} onExit={onExit} />} />
      {S.started && !S.card && S.near && (
        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => open(S.near!)} className={`absolute bottom-24 left-1/2 z-40 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full px-5 text-sm font-semibold shadow-xl ${S.found.includes(S.near.id) ? 'bg-black/60' : 'animate-pulse bg-[#b98b2e] text-white'}`}>
          <Search size={18} /> İncele: {S.near.name}<span className="hidden opacity-60 [@media(pointer:fine)]:inline">· E</span>
        </button>
      )}
      {S.started && !S.card && <Hint>Dikey sürükle: ileri/geri · çift dokun: en yakın parıltı<span className="hidden [@media(pointer:fine)]:inline"> · W/S · N: sıradaki parıltı</span></Hint>}
      {S.card && <Card k={S.card} onClose={close} />}
      {!S.started && <TitleCard onStart={start} onExit={onExit} />}
      {S.started && S.found.length === SPARKLES.length && !S.endShown && !S.card && <EndCard onStay={() => S.set({ endShown: true })} onExit={onExit} />}
      </HudTheme>
    </div>
  );
}

/* ---------- 3B dünya ---------- */
function World({ plan }: { plan: Plan }) {
  const zone = useDb((s) => s.zone);
  const rig = useMemo(() => ({ current: live.rig }), []);
  return (
    <group>
      {/* ortam küpü: pencereler (soğuk) + avize halkaları (sıcak); metal ve kristal yansımaları buradan (düşük kademede tek yansıma kaynağı) */}
      <Environment resolution={plan.tier === 'high' ? 256 : 64} frames={1}>
        <color attach="background" args={['#2a2018']} />
        {[-1, 1].map((s) => <Lightformer key={s} form="rect" intensity={2.4} color="#dcecff" position={[s * 18, 5, -10]} rotation-y={s * -Math.PI / 2} scale={[30, 7, 1]} />)}
        <Lightformer form="ring" intensity={3} color="#ffcf8a" position={[0, 14, -10]} rotation-x={Math.PI / 2} scale={8} />
        <Lightformer form="rect" intensity={1.2} color="#f0d8b0" position={[0, 22, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#7a1a22" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[40, 40, 1]} />
      </Environment>
      <hemisphereLight args={['#fff4e0', '#5a3a24', 0.55]} />
      <directionalLight position={[60, 30, -20]} intensity={1.6} color="#dcecff" />
      <ambientLight intensity={0.12} color="#ffe2b8" />
      <PalaceScene plan={plan} reflector={reflectorRoom(zone)} />
      <Halos saver={plan.saver} />
      <Character rig={rig} palette={GUEST} />
      <Controller />
    </group>
  );
}
/** Parıltı haleleri: eklemeli, kameraya dönük yumuşak ışık lekesi + dört küçük yıldız; parlaklık = nabız(t) */
function Halos({ saver }: { saver: boolean }) {
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,248,225,1)'); gr.addColorStop(0.25, 'rgba(255,225,160,.55)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,255,240,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(64, 10); g.lineTo(64, 118); g.moveTo(10, 64); g.lineTo(118, 64); g.stroke(); return new THREE.CanvasTexture(c); }, []);
  const mats = useMemo(() => SPARKLES.map(() => new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color('#ffe0a0') })), [tex]);
  const refs = useRef<(THREE.Sprite | null)[]>([]);
  const size = (k: Sparkle) => (k.id === 'muayede-avize' ? 5 : k.id === 'kubbe' ? 4 : k.material === 'hali' ? 3 : k.id === 'yaldiz-tavan' || k.id === 'cam-tavan' ? 3 : k.id === 'sufera-avize' ? 2.6 : 0.9);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, found = useDb.getState().found;
    SPARKLES.forEach((k, i) => { const s = refs.current[i]; if (!s) return; const p = pulse(t, k, found.includes(k.id), saver); mats[i].opacity = Math.min(1, p * 0.45); const sc = size(k) * (0.8 + p * 0.15); s.scale.set(sc, sc, sc); s.material.rotation = t * 0.2 + i; });
  });
  return <>{SPARKLES.map((k, i) => <sprite key={k.id} ref={(s) => { refs.current[i] = s; }} material={mats[i]} position={k.pos} />)}</>;
}

/* ---------- hareket + kendiliğinden en iyi açı ---------- */
const _c = new THREE.Vector3(), _l = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
function cameraFor(z: Zone, p: V3, dir: [number, number], t: number): { pos: V3; look: V3; fov: number } {
  const head: V3 = [p[0], p[1] + 1.55, p[2]], behind = (d: number, h: number, up = 0): { pos: V3; look: V3; fov: number } => {
    const c = clampToRoom(z, [p[0] - dir[0] * d, p[1] + h, p[2] - dir[1] * d]), got = Math.hypot(c[0] - p[0], c[2] - p[2]);
    // duvar kamerayı karaktere yaklaştırırsa (oda sınırı) kamera yükselir ve omuz üstünden bakar: kafa kadrajı kapatmasın
    const lift = Math.max(0, d * 0.75 - got) * 0.9;
    return { pos: clampToRoom(z, [c[0], c[1] + lift, c[2]]), look: [p[0] + dir[0] * (4 + lift), head[1] + up - lift * 0.15, p[2] + dir[1] * (4 + lift)], fov: lift > 0.3 ? 62 : 55 };
  };
  switch (z) {
    case 'medhal': return behind(5, 2.6, 0.3);
    case 'muayede': return { ...behind(7.5, 3.2, 3.5), fov: 62 };
    case 'avize': return { pos: orbitCamera([CHANDELIER.x, CHANDELIER.y, CHANDELIER.z], t), look: [CHANDELIER.x, CHANDELIER.y - 0.8, CHANDELIER.z], fov: 62 };
    case 'koridor': return behind(3.2, 2, 0);
    case 'merdiven': return { pos: [STAIR.cx + 7.6, UPPER + 3.2, STAIR.cz + 8.6], look: [p[0], p[1] + 1.2, p[2]], fov: 58 };
    case 'sufera': return behind(5, 2.6, 0.8);
    default: return { pos: [45.2, UPPER + 2.8, -41.2], look: [p[0] + 1.5, p[1] + 1.3, p[2] - 0.6], fov: 50 };
  }
}
function Controller() {
  const { camera } = useThree();
  const st = useRef({ step: 0, near: '', zone: '' as Zone | '', chimed: new Set<string>(), fov: 55, last: 0 }), cam = useRef({ p: new THREE.Vector3(0, 2.6, 18), q: new THREE.Quaternion() });
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05), S = useDb.getState(), t = clock.elapsedTime;
    // hız: girdi ya da otomatik hedef; yumuşak hızlanma (lüks mekânda ani hareket yok)
    let want = S.started && !S.card && !pause.on ? live.input * 3.2 : 0;
    if (live.goal !== null && !S.card) { const d = live.goal - live.s; if (Math.abs(d) < 0.15) { live.goal = null; if (live.goalOpen) { const k = live.goalOpen; live.goalOpen = null; const s2 = useDb.getState(); s2.set({ card: k, found: s2.found.includes(k.id) ? s2.found : [...s2.found, k.id] }); if (s2.tts) palaceAudio.speak(`${k.name}. ${k.text}`); } } else want = Math.sign(d) * Math.min(4, Math.abs(d) * 2 + 0.6); }
    live.v += (want - live.v) * (1 - Math.exp(-dt * 4));
    const before = live.s; live.s = Math.max(0, Math.min(ROUTE_LEN, live.s + live.v * dt));
    const R = routeAt(live.s), r = live.rig, moved = live.s - before;
    r.x = R.p[0]; r.y = R.p[1]; r.z = R.p[2]; r.speed = dt > 0 ? Math.abs(moved) / dt : 0;   // ilk karede dt = 0 olabilir: NaN animasyonu kalıcı bozar
    if (Math.abs(moved) > 1e-4) { const want2 = Math.atan2(-R.dir[0] * Math.sign(moved), -R.dir[1] * Math.sign(moved)); r.yaw += Math.atan2(Math.sin(want2 - r.yaw), Math.cos(want2 - r.yaw)) * (1 - Math.exp(-dt * 8)); }
    st.current.step += Math.abs(moved); if (st.current.step > 0.75) { st.current.step = 0; palaceAudio.step(R.surface); }
    // bölge, yakın nesne, kristal tınısı
    const z = zoneAt(R.p); if (z !== st.current.zone) { st.current.zone = z; S.set({ zone: z }); }
    const n = nearSparkle(live.s); if ((n?.id ?? '') !== st.current.near) { st.current.near = n?.id ?? ''; S.set({ near: n }); if (n && !st.current.chimed.has(n.id) && (n.material === 'kristal' || n.material === 'altin')) { st.current.chimed.add(n.id); palaceAudio.chime(n.pos); } }
    // kamera: inceleme (makro) ya da bölgenin en iyi açısı; yavaş süzülme
    const c = S.card ? { pos: S.card.cam.from, look: S.card.cam.look, fov: S.card.cam.fov } : S.started ? cameraFor(z, R.p, R.dir, t) : { pos: [3, 2.4, 17] as V3, look: [0, 4, 0] as V3, fov: 50 };
    _c.set(...c.pos); _l.set(...c.look);
    const k = 1 - Math.exp(-dt * (S.card ? 2.2 : z === 'avize' ? 1.6 : 2.6)), C = cam.current;
    C.p.lerp(_c, k); _q.setFromRotationMatrix(_m.lookAt(C.p, _l, THREE.Object3D.DEFAULT_UP)); C.q.slerp(_q, k);
    camera.position.copy(C.p); camera.quaternion.copy(C.q);
    st.current.fov += (c.fov - st.current.fov) * k; const pc = camera as THREE.PerspectiveCamera; if (Math.abs(pc.fov - st.current.fov) > 0.05) { pc.fov = st.current.fov; pc.updateProjectionMatrix(); }
    if (t - st.current.last > 0.15) { st.current.last = t; palaceAudio.listener([camera.position.x, camera.position.y - 1.6, camera.position.z], [R.dir[0], R.dir[1]]); }
  });
  return null;
}

/* ---------- arayüz ---------- */
function Card({ k, onClose }: { k: Sparkle; onClose: () => void }) {
  return <InfoSheet kicker={`${k.matLabel}`} title={k.name} text={k.text} source={k.source} onClose={onClose} />;
}
const THEME = { accent: '#b98b2e' };
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Ekranı dikey sürükle ya da W/S: ileri/geri</> },
  { icon: <Info size={16} />, text: <>kamera açıyı kendisi bulur</> },
  { icon: <ChevronsRight size={16} />, text: <>çift dokun: en yakın parıltıya git</> },
];
function TitleCard({ onStart, onExit }: { onStart: () => void; onExit?: () => void }) {
  return <StartSheet kicker="İstanbul · Beşiktaş · 1843–1856" title="Dolmabahçe: Kristal ve Işığın İhtişamı" intro={<>Sarayı ilk kez gören bir misafirsin. Salonlarda hafifçe parlayan on nesneyi bul: kristal avizeler, Baccarat korkuluklar, altın yaldızlı tavanlar, Hereke halısı… Yaklaş, incele, hikâyesini öğren.</>} controls={CONTROLS} note="Plan stilizedir, ölçüler kısaltılmıştır. Avizenin Kraliçe Victoria’nın hediyesi olduğu bilgisi tartışmalıdır." cta="Saraya gir" ctaIcon={<Sparkles size={18} />} onStart={onStart} onExit={onExit} />;
}
function EndCard({ onStay, onExit, onRestart }: { onStay: () => void; onExit: () => void; onRestart?: () => void }) {
  return <EndSheet kicker="Tüm parıltılar bulundu" title="Sarayın ışığı seninle" text="Bohem kristalinden Baccarat korkuluklara, altın varaktan Hereke halısına on nesneyi inceledin." stayLabel="Gezmeye devam" onStay={onStay} onExit={onExit} onRestart={onRestart} />;
}
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null), [i, setI] = useState(0);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Dolmabah%C3%A7e_Saray%C4%B1').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  const k = SPARKLES[i];
  return (
    <div className="fixed inset-0 bg-[#120d08] text-white">
      {img && <img src={img} alt="Dolmabahçe Sarayı" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <p className="mt-1 text-[11px] font-semibold uppercase text-amber-300">{k.matLabel}</p><h2 className="text-lg font-bold">{k.name}</h2><p className="mt-1 text-sm">{k.text}</p>
        <div className="mt-3 flex gap-2"><button onClick={() => palaceAudio.speak(k.text)} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button><button onClick={() => setI((i + 1) % SPARKLES.length)} className="h-10 rounded-lg bg-amber-400 px-4 text-sm font-semibold text-black">Sonraki</button></div>
      </div>
    </div>
  );
}
