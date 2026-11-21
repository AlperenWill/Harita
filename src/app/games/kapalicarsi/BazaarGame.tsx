/**
 * Kapalıçarşı — "Bin Dükkânın Sırrı": Kayıp Eşya Avcısı. Ana yönetici.
 *
 * Her girişte yeni bir tohumla yeni bir çarşı üretilir (ProceduralStreetGenerator). Oyuncu bir dedektiftir: kaybolan eşyayı (antika
 * anahtar, eski harita…) bulmak için esnafa sorular sorar, ipuçlarını defterine yazar, dükkânlara girip tezgâhları inceler.
 * KAMERA: serbest kamera yok. Sokakta birinci şahıs (göz yüksekliği 1,62 m, adımda hafif sallanma); dükkâna girince kamera kendiliğinden
 * tezgâha yaklaşır, bir nesneye dokununca o nesneye yakınlaşır. Pusula şeridi yönü gösterir (ipuçları pusula yönüyle verilir).
 * KONTROLLER: dokunmatikte tek parmak sürükleme = yürü (yukarı: ileri) ve dön (yana); çift dokunuş = en yakın dükkânın kapısına git.
 * Masaüstünde WASD (A/D yana adım) + tıkla ve fareyle bak (imleç kilidi, Esc bırakır); E: konuş / gir; Esc: dükkândan çık; çift tıklama = en yakın dükkân.
 * KALİTE: düşük/orta/yüksek + pil tasarrufu (kalabalık 100 kişiye iner, ışık huzmeleri ve sis kapanır).
 * Şanlıurfa ve öteki İstanbul oyunlarıyla tutarlılık: aynı cihaz profili, alttaki diyalog kutusu, daktilo + sesli okuma, WebGL yoksa fotoğraf yedeği.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { create } from 'zustand';
import { Controls, GameMenu, HudTheme, IconButton, StartSheet, EndSheet, TopRow, Objective } from '../shared/hud/Hud';
import { useSettings } from '../shared/hud/settings';
import { Footprints, MousePointer2 } from 'lucide-react';
import { ArrowLeft, BookOpen, Check, DoorOpen, LogOut, MessageCircle, Moon, RefreshCw, Search, Sun, X } from 'lucide-react';
import { TRADE_LABEL, freshSeed, generate, nearestEsnaf, nearestShop, nodeSquares, shopAtDoor, slide, streetAt, type Layout, type V2 } from './ProceduralStreetGenerator';
import { createCrowd, crowdMesh, stepCrowd, writeInstances, type Static } from './CrowdSystem';
import { Architecture, FACADE_H, OPEN_H } from './Architecture';
import { COUNTER, ShopInterior, toWorld } from './ShopInterior';
import { counterItems } from './items';
import { DialogueBox } from './DialogueSystem';
import { esnafTitle, type Clue, type Question } from './clues';
import { bazaarAudio } from './BazaarAudio';
import { LOOK_PITCH, LOOK_YAW, LookCrosshair, useMouseLook } from '../shared/mouseLook';

/* ---------- cihaz profili ---------- */
type Tier = 'low' | 'medium' | 'high';
const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const pinned = (() => { const q = new URLSearchParams(location.search).get('q'); return q === 'low' || q === 'medium' || q === 'high' ? (q as Tier) : null; })();
function detectTier(): Tier {
  if (pinned) return pinned;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low';
  return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high';
}
/** Kademe → ayarlar. NPC sayısı: yüksek 560, orta 400, düşük 220, pil tasarrufu 100 */
const profile = (t: Tier, saver: boolean) => ({
  tier: t, saver, npc: saver ? 100 : t === 'high' ? 560 : t === 'medium' ? 400 : 220, nearCap: t === 'low' ? 24 : 48, bloom: !saver && t !== 'low', shafts: !saver && t !== 'low', fog: !saver,
  lights: t === 'high' ? 8 : t === 'medium' ? 5 : 3, lod: t === 'high' ? 34 : t === 'medium' ? 26 : 18, dpr: (t === 'low' ? 1 : t === 'medium' ? [1, 1.4] : [1, 1.75]) as number | [number, number],
});
type Prof = ReturnType<typeof profile>;

/* ---------- durum ---------- */
type Phase = 'title' | 'street' | 'shop' | 'won';
interface S {
  seed: number; L: Layout; night: boolean; phase: Phase; shop: number | null; picked: number | null; esnaf: number | null; asked: Record<number, Question[]>; clues: (Clue & { where: string })[];
  visited: number[]; prompt: { shop: number | null; esnaf: number | null }; notebook: boolean; toast: { text: string; ok: boolean; t: number } | null; muted: boolean; tts: boolean; t0: number; tWin: number;
  set: (p: Partial<S>) => void;
}
const seed0 = Number(new URLSearchParams(location.search).get('seed')) || freshSeed();
const fresh = (seed: number) => ({ seed, L: generate(seed), phase: 'title' as Phase, shop: null, picked: null, esnaf: null, asked: {}, clues: [], visited: [], prompt: { shop: null, esnaf: null }, notebook: false, toast: null, t0: 0, tWin: 0 });
const useBz = create<S>((set) => ({ ...fresh(seed0), night: false, muted: false, tts: true, set: (p) => set(p) }));
const pause = { on: false };   // ≡ menü açıkken oyun durur
const live = { x: 0, z: 0, yaw: 0, pitch: 0, fwd: 0, strafe: 0, turn: 0, auto: null as V2 | null, autoYaw: null as number | null };
function placeAtStart(L: Layout) { Object.assign(live, { x: L.start.at[0], z: L.start.at[1], yaw: L.start.yaw, pitch: 0, auto: null, autoYaw: null }); }   // yüz çarşının içine
placeAtStart(useBz.getState().L);
const toast = (text: string, ok = true) => { useBz.getState().set({ toast: { text, ok, t: performance.now() } }); bazaarAudio.chime(ok); };
const speakIf = (t: string) => { if (useSettings.getState().tts) bazaarAudio.speak(t); };

export default function BazaarGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}

function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier), [saver, setSaver] = useState(false);
  const look = useMouseLook((dx, dy) => { live.yaw -= dx * LOOK_YAW; live.pitch = THREE.MathUtils.clamp(live.pitch - dy * LOOK_PITCH, -0.6, 0.9); live.autoYaw = null; }, () => { const s = useBz.getState(); return s.phase === 'street' && s.esnaf === null && !s.notebook; });
  const prof = useMemo(() => profile(tier, saver), [tier, saver]);
  const S = useBz();
  const keys = useRef(new Set<string>());

  useEffect(() => {
    type B = EventTarget & { level: number; charging: boolean }; let b: B | null = null; const check = () => b && setSaver(b.level < 0.2 && !b.charging);
    (navigator as Navigator & { getBattery?: () => Promise<B> }).getBattery?.().then((x) => { b = x; check(); x.addEventListener('levelchange', check); x.addEventListener('chargingchange', check); }).catch(() => {});
    return () => { b?.removeEventListener('levelchange', check); b?.removeEventListener('chargingchange', check); };
  }, []);
  const G = useSettings(); useEffect(() => { bazaarAudio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => { bazaarAudio.setNight(S.night); }, [S.night]);
  useEffect(() => { bazaarAudio.setDensity(prof.npc / 560); }, [prof.npc]);
  useEffect(() => () => { bazaarAudio.dispose(); }, []);

  const enterShop = useCallback((id: number) => {
    const s = useBz.getState(); s.set({ phase: 'shop', shop: id, picked: null, esnaf: null, visited: s.visited.includes(id) ? s.visited : [...s.visited, id] }); bazaarAudio.setInside(true);
  }, []);
  const exitShop = useCallback(() => { const s = useBz.getState(); if (s.phase !== 'shop' || s.shop === null) return; const sh = s.L.shops[s.shop]; Object.assign(live, { x: sh.door[0], z: sh.door[1], yaw: Math.atan2(sh.normal[0], sh.normal[1]) }); s.set({ phase: 'street', shop: null, picked: null }); bazaarAudio.setInside(false); }, []);
  const talk = useCallback((id: number) => { useBz.getState().set({ esnaf: id }); }, []);
  const choose = useCallback(() => {
    const s = useBz.getState(); if (s.shop === null || s.picked === null) return; const it = counterItems(s.L, s.shop)[s.picked];
    if (it.role === 'hedef') { s.set({ phase: 'won', tWin: performance.now() }); bazaarAudio.chime(true); bazaarAudio.setInside(false); return; }
    if (it.role === 'yem') toast(`Benzer ama değil: bu bir ${s.L.item.decoy}. Biri seni yanlış yöne göndermiş olabilir; hangi soruyu sorduğunu düşün.`, false);
    else toast('Tarife uymuyor. Defterdeki tarifi yeniden oku.', false);
    s.set({ picked: null });
  }, []);
  const newBazaar = (seed = freshSeed()) => { const f = fresh(seed); useBz.getState().set(f); placeAtStart(f.L); bazaarAudio.setInside(false); };
  const start = () => { bazaarAudio.unlock(); S.set({ phase: 'street', t0: performance.now() }); speakIf(`Kayıp: ${S.L.item.name}. ${S.L.item.desc}`); };

  // klavye
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useBz.getState(); if (e.repeat) return;
      if (e.code === 'KeyE' && s.phase === 'street' && s.esnaf === null) { if (s.prompt.esnaf !== null) talk(s.prompt.esnaf); else if (s.prompt.shop !== null) enterShop(s.prompt.shop); }
      if (e.code === 'Escape') { if (s.esnaf !== null) s.set({ esnaf: null }); else if (s.picked !== null) s.set({ picked: null }); else exitShop(); }
      if (e.code === 'KeyJ') s.set({ notebook: !s.notebook });
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0; const loop = () => { const k = keys.current; live.fwd = touch.current.fwd || (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0); live.strafe = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0); live.turn = 0;   /* kamera klavyeyle çevrilmez: fareyle (imleç kilidi) ya da sürüklemeyle */ raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); };
  }, [enterShop, exitShop, talk]);
  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __bazaar: unknown }).__bazaar = {
      tp: (x: number, z: number, yaw = 0) => { Object.assign(live, { x, z, yaw, auto: null }); useBz.getState().set({ phase: 'street' }); }, enter: enterShop, pick: (i: number) => useBz.getState().set({ picked: i }),
      night: (n: boolean) => useBz.getState().set({ night: n }), state: () => ({ ...useBz.getState(), L: undefined, live: { ...live } }), layout: () => useBz.getState().L,
    };
  }, [enterShop]);

  // dokunma: tek parmak sürükleme = yürü/dön; fare sürükleme = bak; çift dokunuş/tıklama = en yakın dükkâna git
  const touch = useRef({ id: -1, x0: 0, y0: 0, lx: 0, ly: 0, fwd: 0, last: 0, mouse: false });
  const onDown = (e: React.PointerEvent) => {
    look.lock(e); bazaarAudio.unlock(); const s = useBz.getState(); if (s.phase !== 'street' || s.esnaf !== null) return; const T = touch.current, now = performance.now();
    if (now - T.last < 300) { const sh = nearestShop(s.L, live.x, live.z); live.auto = [...sh.door]; live.autoYaw = Math.atan2(sh.normal[0], sh.normal[1]); }   // çift dokunuş
    T.last = now; T.id = e.pointerId; T.x0 = T.lx = e.clientX; T.y0 = T.ly = e.clientY; T.mouse = e.pointerType === 'mouse';
  };
  const onMove = (e: React.PointerEvent) => {
    const T = touch.current; if (e.pointerId !== T.id) return; const dx = e.clientX - T.lx, dy = e.clientY - T.ly; T.lx = e.clientX; T.ly = e.clientY;
    if (T.mouse) { live.yaw -= dx * 0.004; live.pitch = THREE.MathUtils.clamp(live.pitch - dy * 0.003, -0.6, 0.9); return; }
    live.yaw -= dx * 0.005; T.fwd = THREE.MathUtils.clamp(-(e.clientY - T.y0) / 70, -1, 1); live.auto = null;
  };
  const onUp = (e: React.PointerEvent) => { const T = touch.current; if (e.pointerId !== T.id) return; T.id = -1; T.fwd = 0; };

  const p = S.L, el = S.phase === 'won' ? (S.tWin - S.t0) / 1000 : 0;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#140e08] text-white" style={{ touchAction: 'none' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <HudTheme theme={THEME}>
      <LookCrosshair locked={look.locked} />
      <Canvas key={`${S.seed}-${S.night}`} dpr={prof.dpr} gl={{ antialias: prof.tier === 'high', powerPreference: 'high-performance' }} camera={{ fov: 70, near: 0.05, far: 160 }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}>
          <World L={p} prof={prof} night={S.night} />
          {prof.bloom && (
            <EffectComposer multisampling={0}>
              <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.3} intensity={S.night ? 0.9 : 0.6} />
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              <Vignette darkness={0.55} offset={0.25} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>

      <TopRow onExit={onExit} objective={S.phase !== 'title' ? <Objective icon={<Search size={15} />} label={`Kayıp: ${p.item.name} · ${S.clues.length} ipucu · ${S.visited.length} dükkân`} /> : undefined}
        right={<>{S.phase !== 'title' && <IconButton label="Defter" active={S.notebook} onClick={() => S.set({ notebook: !S.notebook })}><BookOpen size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; }} help={<Controls items={CONTROLS} />} onRestart={() => newBazaar()} onExit={onExit} /></>} />
      {S.phase === 'street' && <div className="pointer-events-none absolute inset-x-0 top-[176px] z-20 flex justify-center sm:top-[124px]"><Compass /></div>}
      {S.notebook && S.phase !== 'title' && <Notebook onClose={() => S.set({ notebook: false })} />}

      {S.phase === 'street' && S.esnaf === null && <Prompts onTalk={talk} onEnter={enterShop} />}
      {S.phase === 'street' && S.esnaf !== null && (
        <DialogueBox L={p} e={p.esnaf[S.esnaf]} asked={S.asked[S.esnaf] ?? []} speak={speakIf} onClose={() => { S.set({ esnaf: null }); bazaarAudio.hush(); }}
          onAsk={(c) => { const s = useBz.getState(), id = s.esnaf!, a = s.asked[id] ?? []; s.set({ asked: { ...s.asked, [id]: a.includes(c.q) ? a : [...a, c.q] }, clues: s.clues.some((x) => x.esnaf === c.esnaf && x.q === c.q) ? s.clues : [...s.clues, { ...c, where: streetAt(s.L, live.x, live.z) }] }); }} />
      )}
      {S.phase === 'shop' && S.shop !== null && <ShopUI onExit={exitShop} onChoose={choose} />}
      {S.toast && <Toast key={S.toast.t} />}
      {S.phase === 'title' && <TitleCard onStart={start} onReroll={() => newBazaar()} onNight={(n) => S.set({ night: n })} onExit={onExit} />}
      {S.phase === 'won' && <WinCard secs={el} onNew={() => newBazaar()} onExit={onExit} />}
      </HudTheme>
    </div>
  );
}

/* ---------- 3B dünya ---------- */
function World({ L, prof, night }: { L: Layout; prof: Prof; night: boolean }) {
  const phase = useBz((s) => s.phase), shop = useBz((s) => s.shop), picked = useBz((s) => s.picked);
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(night ? '#06080d' : '#2a1f14');
    scene.fog = prof.fog ? new THREE.FogExp2(night ? '#0a0d16' : '#b59a72', night ? 0.035 : 0.016) : null;
    return () => { scene.fog = null; };
  }, [scene, night, prof.fog]);
  return (
    <group>
      <hemisphereLight args={[night ? '#3a4a70' : '#e8e2d4', night ? '#0a0806' : '#6a4a2a', night ? 0.35 : 1.0]} />
      <ambientLight intensity={night ? 0.05 : 0.18} color={night ? '#8090c0' : '#ffe6c0'} />
      <Architecture L={L} night={night} hi={prof.shafts} lodRadius={prof.lod} />
      <LightPool L={L} n={prof.lights} night={night} />
      <CrowdView L={L} prof={prof} night={night} />
      {phase === 'shop' && shop !== null && <ShopInterior L={L} shop={shop} night={night} picked={picked} onPick={(i) => useBz.getState().set({ picked: i })} />}
      <Motes on={prof.shafts && !night} />
      <Controller L={L} />
    </group>
  );
}
/** Işık havuzu: sabit sayıda gerçek ışık her 0,3 sn'de oyuncuya en yakın dükkânlara (gündüz, sıcak) ya da kavşak lambalarına (gece, soğuk) taşınır */
function LightPool({ L, n, night }: { L: Layout; n: number; night: boolean }) {
  const refs = useRef<(THREE.PointLight | null)[]>([]), last = useRef(-1);
  const spots = useMemo(() => (night ? nodeSquares(L).map((q) => [q.c[0], FACADE_H - 0.5, q.c[1]] as const) : L.shops.map((s) => { const p = toWorld(s, 0, OPEN_H - 0.3, 0.6); return [p.x, p.y, p.z] as const; })), [L, night]);
  useFrame(({ clock }) => {
    if (clock.elapsedTime - last.current < 0.3) return; last.current = clock.elapsedTime;
    const near = spots.map((s, i) => [Math.hypot(s[0] - live.x, s[2] - live.z), i] as const).sort((a, b) => a[0] - b[0]).slice(0, n);
    near.forEach(([, i], k) => { const l = refs.current[k]; if (l) l.position.set(spots[i][0], spots[i][1], spots[i][2]); });
  });
  return <>{Array.from({ length: n }, (_, k) => <pointLight key={k} ref={(l) => { refs.current[k] = l; }} color={night ? '#bcd4ff' : '#ffc27a'} intensity={night ? 9 : 7} distance={night ? 14 : 9} decay={1.7} />)}</>;
}
/** Kalabalık: simülasyon + iki instanced ağ (yakın ayrıntılı, uzak siluet) + esnaf */
function CrowdView({ L, prof, night }: { L: Layout; prof: Prof; night: boolean }) {
  const time = useMemo(() => ({ value: 0 }), []);
  const crowd = useMemo(() => createCrowd(L, night ? Math.round(prof.npc * 0.06) : prof.npc, L.seed), [L, prof.npc, night]);
  const meshes = useMemo(() => ({ lo: crowdMesh(false, prof.npc, time), hi: crowdMesh(true, prof.nearCap + L.esnaf.length, time) }), [prof.npc, prof.nearCap, L, time]);
  const statics = useMemo<Static[]>(() => (night ? [] : L.esnaf.map((e, i) => ({ x: e.at[0], z: e.at[1], yaw: e.yaw, color: new THREE.Color(['#5a3a22', '#2f4a6b', '#3d5a3a', '#7a2a2a', '#2a2a2e'][i % 5]), skin: (i * 0.37) % 1, scarf: ['Ayşe', 'Fatma', 'Zeynep', 'Emine', 'Hatice'].includes(e.name) ? 1 : 0, gesture: i * 1.3 }))), [L, night]);
  useFrame(({ clock, camera }, raw) => {
    const dt = Math.min(raw, 0.05); time.value = clock.elapsedTime;
    stepCrowd(crowd, dt, [live.x, live.z]);
    writeInstances(crowd, statics, meshes.lo, meshes.hi, [camera.position.x, camera.position.z], prof.nearCap, clock.elapsedTime);
  });
  return <><primitive object={meshes.lo} /><primitive object={meshes.hi} /></>;
}
/** Işık huzmelerinde süzülen toz: oyuncunun çevresinde yavaşça dönen noktalar */
function Motes({ on }: { on: boolean }) {
  const ref = useRef<THREE.Points>(null!);
  const geo = useMemo(() => { const n = 260, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([(Math.random() - 0.5) * 16, Math.random() * 5, (Math.random() - 0.5) * 16], i * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g; }, []);
  useFrame(({ clock }) => { if (!ref.current) return; ref.current.position.set(live.x, 0, live.z); ref.current.rotation.y = clock.elapsedTime * 0.02; });
  if (!on) return null;
  return <points ref={ref} geometry={geo}><pointsMaterial color="#ffe8b8" size={0.035} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} /></points>;
}

/* ---------- birinci şahıs kontrol + dükkân kamerası ---------- */
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _v = new THREE.Vector3(), _l = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
function Controller({ L }: { L: Layout }) {
  const { camera } = useThree();
  const st = useRef({ step: 0, bob: 0, key: '', last: 0 }), cam = useRef({ p: new THREE.Vector3(live.x, 1.62, live.z), q: new THREE.Quaternion() });
  useEffect(() => { cam.current.p.set(live.x, 1.62, live.z); }, [L]);
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05), S = useBz.getState(), t = clock.elapsedTime;
    if (S.phase === 'street' && S.esnaf === null && !pause.on) {
      let fwd = live.fwd, strafe = live.strafe;
      if (live.auto) {   // çift dokunuş: en yakın dükkânın kapısına yürü, sonra dükkâna dön
        const dx = live.auto[0] - live.x, dz = live.auto[1] - live.z, d = Math.hypot(dx, dz);
        if (d < 0.25 || fwd !== 0) { if (live.autoYaw !== null && d < 0.25) live.yaw = live.autoYaw; live.auto = null; } else { live.yaw += Math.atan2(Math.sin(Math.atan2(-dx, -dz) - live.yaw), Math.cos(Math.atan2(-dx, -dz) - live.yaw)) * Math.min(1, dt * 8); fwd = Math.min(1, d); strafe = 0; }
      }
      live.yaw -= live.turn * dt * 1.8;
      const sp = 2.6, fx = -Math.sin(live.yaw), fz = -Math.cos(live.yaw), rx = Math.cos(live.yaw), rz = -Math.sin(live.yaw);
      const mx = (fx * fwd + rx * strafe) * sp * dt, mz = (fz * fwd + rz * strafe) * sp * dt, [nx, nz] = slide(L, [live.x, live.z], mx, mz), moved = Math.hypot(nx - live.x, nz - live.z);
      live.x = nx; live.z = nz; st.current.bob += moved * 2.4; st.current.step += moved; if (st.current.step > 0.72) { st.current.step = 0; bazaarAudio.step(); }
      // yakındaki esnaf / dükkân kapısı → düğmeler
      const e = nearestEsnaf(L, live.x, live.z), sh = e ? null : shopAtDoor(L, live.x, live.z, 1.5), k = `${e?.id ?? ''}|${sh?.id ?? ''}`;
      if (k !== st.current.key) { st.current.key = k; S.set({ prompt: { esnaf: e?.id ?? null, shop: sh?.id ?? null } }); }
    }
    // kamera hedefi
    let tp: THREE.Vector3, tq: THREE.Quaternion;
    if (S.phase === 'shop' && S.shop !== null) {
      const s = L.shops[S.shop], i = S.picked;
      tp = i === null ? toWorld(s, 0, 1.6, 0.25) : toWorld(s, COUNTER.xs[i], COUNTER.y + 0.62, COUNTER.z - 0.48);
      _l.copy(i === null ? toWorld(s, 0, COUNTER.y + 0.05, COUNTER.z + 0.1) : toWorld(s, COUNTER.xs[i], COUNTER.y + 0.34, COUNTER.z));
      tq = _q.setFromRotationMatrix(_m.lookAt(tp, _l, THREE.Object3D.DEFAULT_UP));
    } else if (S.phase === 'street' && S.esnaf !== null) {
      const e = L.esnaf[S.esnaf]; tp = _v.set(live.x, 1.62, live.z); _l.set(e.at[0], 1.5, e.at[1]); tq = _q.setFromRotationMatrix(_m.lookAt(tp, _l, THREE.Object3D.DEFAULT_UP));
      live.yaw = Math.atan2(-(e.at[0] - live.x), -(e.at[1] - live.z)); live.pitch = 0;
    } else {
      tp = _v.set(live.x, 1.62 + Math.sin(st.current.bob) * 0.035, live.z); tq = _q.setFromEuler(_e.set(live.pitch, live.yaw, Math.sin(st.current.bob * 0.5) * 0.004));
    }
    const k = 1 - Math.exp(-dt * (S.phase === 'shop' ? 3.5 : 14)), C = cam.current;
    if (C.p.distanceTo(tp) > 12) C.p.copy(tp); else C.p.lerp(tp, k); C.q.slerp(tq, k);
    camera.position.copy(C.p); camera.quaternion.copy(C.q);
    // ses: dinleyici + en yakın 4 dükkân
    if (t - st.current.last > 0.25) {
      st.current.last = t;
      const near = L.shops.map((s) => [Math.hypot(s.door[0] - live.x, s.door[1] - live.z), s] as const).sort((a, b) => a[0] - b[0]).slice(0, 4).map(([, s]) => ({ at: s.center, trade: s.trade }));
      const insideShop = S.phase === 'shop' && S.shop !== null ? [{ at: L.shops[S.shop].center, trade: L.shops[S.shop].trade }] : [];
      bazaarAudio.update([live.x, live.z], [-Math.sin(live.yaw), -Math.cos(live.yaw)], insideShop.length ? insideShop : near, near[0]?.trade === 'halici');
    }
  });
  return null;
}

/* ---------- arayüz ---------- */
function Compass() {
  const [yaw, setYaw] = useState(0);
  useEffect(() => { const id = setInterval(() => setYaw(live.yaw), 100); return () => clearInterval(id); }, []);
  const deg = ((-yaw * 180) / Math.PI + 720) % 360, dirs = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
  return (
    <div className="mx-auto w-44 overflow-hidden rounded-full bg-[#f7f5f1]/90 text-[#1f1b17] ring-1 ring-black/5 py-1 text-center sm:w-64" aria-label="Pusula">
      <div className="relative h-5">
        {dirs.map((d, i) => { const off = ((i * 45 - deg + 540) % 360) - 180; return Math.abs(off) < 80 ? <span key={d} className={`absolute top-0 -translate-x-1/2 text-xs font-bold ${d === 'K' ? 'text-[#b5652a]' : 'text-[#4a433c]'}`} style={{ left: `${50 + off * 0.6}%` }}>{d}</span> : null; })}
        <span className="absolute left-1/2 top-4 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-300" />
      </div>
    </div>
  );
}
function Prompts({ onTalk, onEnter }: { onTalk: (id: number) => void; onEnter: (id: number) => void }) {
  const { prompt, L, visited } = useBz();
  const street = useStreet(L);
  return (
    <>
      <p className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-[#f7f5f1]/90 text-[#1f1b17] ring-1 ring-black/5 px-3 py-1 text-xs text-[#4a433c]">{street}</p>
      <div className="absolute bottom-6 right-4 z-30 flex flex-col items-end gap-2 sm:bottom-8" onPointerDown={(e) => e.stopPropagation()}>
        {prompt.esnaf !== null && <button onClick={() => onTalk(prompt.esnaf!)} className="flex h-12 items-center gap-2 rounded-full bg-[#b5652a] px-4 text-sm font-semibold text-white shadow-lg"><MessageCircle size={18} /> Konuş: {esnafTitle(L.esnaf[prompt.esnaf])}<span className="hidden opacity-60 [@media(pointer:fine)]:inline">· E</span></button>}
        {prompt.shop !== null && <button onClick={() => onEnter(prompt.shop!)} className={`flex h-12 max-w-[70vw] items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-lg ${visited.includes(prompt.shop) ? 'bg-[#f7f5f1]/90 text-[#1f1b17] ring-1 ring-black/5' : 'bg-[#b5652a] text-white'}`}><DoorOpen size={18} className="shrink-0" /><span className="truncate">Dükkâna gir: {L.shops[prompt.shop].sign}</span><span className="hidden opacity-60 [@media(pointer:fine)]:inline">· E</span></button>}
      </div>
      <p className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 rounded-full bg-[#f7f5f1]/90 text-[#1f1b17] ring-1 ring-black/5 px-4 py-1.5 text-xs sm:block">WASD yürü · tıkla, fareyle bak (Esc: bırak) · çift tıkla: en yakın dükkân · E: konuş/gir · J: defter</p>
      <p className="pointer-events-none absolute bottom-6 left-4 rounded-full bg-[#f7f5f1]/90 text-[#1f1b17] ring-1 ring-black/5 px-3 py-1.5 text-[11px] sm:hidden">Sürükle: yürü/dön · çift dokun: en yakın dükkân</p>
    </>
  );
}
function useStreet(L: Layout) { const [s, set] = useState(''); useEffect(() => { const id = setInterval(() => set(streetAt(L, live.x, live.z)), 400); return () => clearInterval(id); }, [L]); return s; }
function Notebook({ onClose }: { onClose: () => void }) {
  const { L, clues, visited } = useBz();
  return (
    <div className="absolute left-3 top-16 z-40 max-h-[70vh] w-[min(26rem,calc(100%-1.5rem))] overflow-y-auto rounded-2xl bg-[#f3ead6] p-4 text-ink shadow-[0_10px_30px_rgba(31,27,23,0.18)]" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex items-center"><h2 className="font-bold">Dedektif defteri</h2><button onClick={onClose} className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-black/5" aria-label="Kapat"><X size={16} /></button></div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-800">Kayıp eşya</p>
      <p className="text-sm"><b>{L.item.name[0].toLocaleUpperCase('tr') + L.item.name.slice(1)}</b>: {L.item.desc}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-800">İpuçları ({clues.length})</p>
      {clues.length === 0 ? <p className="text-sm text-slate-600">Henüz kimseye sormadın. Kapı önünde duran esnafa yaklaş.</p> : (
        <ul className="mt-1 space-y-1.5">{clues.map((c, i) => <li key={i} className="rounded-lg bg-white/60 p-2 text-sm"><span className="text-xs text-slate-500">{c.esnaf} · {c.where}</span><br />{c.text}</li>)}</ul>
      )}
      <p className="mt-3 text-xs text-slate-500">Gezilen dükkân: {visited.length} · Çarşı no: {L.seed}</p>
    </div>
  );
}
function ShopUI({ onExit, onChoose }: { onExit: () => void; onChoose: () => void }) {
  const { L, shop, picked, set } = useBz(), s = L.shops[shop!], items = counterItems(L, shop!);
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center"><p className="rounded-full bg-[#f7f5f1]/90 text-[#1f1b17] ring-1 ring-black/5 px-4 py-1.5 text-sm font-semibold">{s.sign} · {TRADE_LABEL[s.trade].esnaf}</p></div>
      <div className="absolute inset-x-3 bottom-3 z-40 mx-auto max-w-lg sm:bottom-6" onPointerDown={(e) => e.stopPropagation()}>
        <div className="rounded-2xl bg-[#f7f5f1]/92 text-[#1f1b17] ring-1 ring-black/5 p-4 shadow-[0_10px_30px_rgba(31,27,23,0.18)] backdrop-blur">
          {picked === null ? <p className="text-sm text-[#4a433c]">Tezgâhta beş nesne var. İncelemek için birine dokun. Tarifi hatırla: <i>{L.item.desc}</i></p> : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#b5652a]">İnceleniyor</p>
              <p className="mt-1 text-[15px]">{items[picked].label}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={onChoose} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#b5652a] font-semibold text-white"><Check size={18} /> Aradığım bu!</button>
                <button onClick={() => set({ picked: null })} className="h-11 flex-1 rounded-xl bg-black/5 font-semibold">Geri koy</button>
              </div>
            </>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">{items.map((_, i) => <button key={i} onClick={() => set({ picked: i })} className={`inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs ${picked === i ? 'bg-[#b5652a] text-white' : 'bg-black/5'}`}><Search size={12} />{i + 1}</button>)}</div>
          <button onClick={onExit} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-black/5 text-sm font-semibold"><LogOut size={16} /> Dükkândan çık (Esc)</button>
        </div>
      </div>
    </>
  );
}
function Toast() {
  const t = useBz((s) => s.toast), [show, setShow] = useState(true);
  useEffect(() => { const id = setTimeout(() => setShow(false), t && !t.ok ? 5500 : 3000); return () => clearTimeout(id); }, [t]);
  if (!t || !show) return null;
  return <div className="pointer-events-none absolute left-1/2 top-[124px] z-50 sm:top-[72px] max-w-[90vw] -translate-x-1/2 rounded-2xl px-4 py-2 text-center text-sm font-semibold shadow-xl" style={{ background: '#f7f5f1', color: t.ok ? '#1f9d63' : '#b5452f' }}>{t.text}</div>;
}
function TitleCard({ onStart, onReroll, onNight, onExit }: { onStart: () => void; onReroll: () => void; onNight: (n: boolean) => void; onExit?: () => void }) {
  const { L, night } = useBz();
  const seg = (on: boolean) => `inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${on ? 'text-white' : 'ring-1 ring-black/10'}`;
  return <StartSheet kicker="İstanbul · Fatih · Kapalıçarşı" title="Bin Dükkânın Sırrı"
    intro={<>Bir eşya kayboldu: <b>{L.item.name}</b>. {L.item.desc} Çarşıda biri onu bir dükkâna bırakmış. Esnafa sor, ipuçlarını defterine yaz, tezgâhları incele. Ama dikkat: her soru doğru yola çıkarmaz.<span className="mt-1 block text-xs text-[#857b70]">Giriş: {L.start.gate} · Çarşı no {L.seed} (her girişte yeni bir çarşı)</span></>}
    controls={CONTROLS} note="Çarşı düzeni her seferinde yeniden üretilir; gerçek planın kopyası değildir. Bazı sokak ve kapı adları gerçektir, esnaf ve hikâye kurgudur."
    extra={<div className="flex gap-2"><button onClick={() => onNight(false)} aria-pressed={!night} className={seg(!night)} style={!night ? { background: THEME.accent } : undefined}><Sun size={16} /> Gündüz</button><button onClick={() => onNight(true)} aria-pressed={night} className={seg(night)} style={night ? { background: '#3b4a7a' } : undefined}><Moon size={16} /> Gece</button></div>}
    secondary={<button onClick={onReroll} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold ring-1 ring-black/10"><RefreshCw size={16} /> Başka çarşı</button>}
    cta="Çarşıya gir" ctaIcon={<DoorOpen size={18} />} onStart={onStart} onExit={onExit} />;
}
function WinCard({ secs, onNew, onExit }: { secs: number; onNew: () => void; onExit: () => void }) {
  const { L, visited, clues } = useBz(), sh = L.shops[L.target];
  return <EndSheet kicker="Bulundu!" title={L.item.name[0].toLocaleUpperCase('tr') + L.item.name.slice(1)} text={`${sh.owner}’in ${TRADE_LABEL[sh.trade].esnaf} dükkânında, ${L.streets[L.edges[sh.edge].street]?.name}. ${Math.floor(secs / 60)} dk ${Math.round(secs % 60)} sn · ${visited.length} dükkân · ${clues.length} ipucu.`} stayLabel="Yeni çarşı, yeni eşya" onStay={onNew} onExit={onExit} badge={<Search size={24} />} />;
}
const THEME = { accent: '#b5652a' };
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <><b>WASD</b> ya da joystick: yürü (A/D yana adım)</> },
  { icon: <MousePointer2 size={16} />, text: <>Tıkla, fareyle bak (Esc imleci bırakır) · telefonda sürükle</> },
  { icon: <MessageCircle size={16} />, text: <><b>E</b>: esnafla konuş / dükkâna gir · Esc: dükkândan çık</> },
  { icon: <BookOpen size={16} />, text: <>Defter: topladığın ipuçları · çift dokunuş: en yakın dükkân</> },
];
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Kapal%C4%B1%C3%A7ar%C5%9F%C4%B1').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  return (
    <div className="fixed inset-0 bg-[#140e08] text-white">
      {img && <img src={img} alt="Kapalıçarşı" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <h2 className="mt-1 text-lg font-bold">Kapalıçarşı</h2>
        <p className="mt-1 text-sm">Çarşının çekirdeği Cevahir Bedesteni, İstanbul’un fethinden kısa süre sonra Fatih döneminde yapıldı. Sokaklar orada toplanan esnafın adını taşır: Kalpakçılar, Kuyumcular, Aynacılar, Fesçiler…</p>
      </div>
    </div>
  );
}
