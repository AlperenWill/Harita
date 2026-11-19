/**
 * Zil Kale & Çamlıhemşin — "Sis İçindeki İzler". Ana yönetici.
 *
 * Oyuncu sisli Fırtına Vadisi'ne giren bir yolcudur. Köyden (ahşap Hemşin evi, serender) dere kıyısı patikasına, tek kemerli taş
 * köprüden şelaleye, oradan orman yokuşuyla Zil Kale'ye yürür.
 * KAMERA:
 *   - Vadide birinci şahıs, rotaya kilitli: yalnız İLERİ/GERİ (W/S ya da dikey sürükleme). Bakış serbest (fare sürükleme / yatay
 *     sürükleme / ←→). Arkana dönüp ileri basarsan geldiğin yöne yürürsün (girdi işareti bakış yönüne göre çevrilir).
 *   - Kale tepesinde (rotanın son 14 metresi) sabit üçüncü şahıs geniş açı: kale + arkadaki dağlar kadrajda; kamera kalenin DIŞINDA,
 *     karşı yamacın üstünde durur, duvarların içine asla girmez (SUMMIT_CAM, kale merkezinden ~40 m).
 * SİS: VolumetricFogSystem.density(s, t, open) her kare FogExp2'ye yazılır; köprü, şelale ve kale girişinde "açılma anı" (open → 1).
 *   Sis perdeleri rüzgârla sürüklenir; ışık huzmelerinin parlaklığı Henyey–Greenstein fazı × geçirgenlik (bakış güneşe dönünce güçlenir).
 * TARİH KATMANI: beş noktaya yaklaşınca yapı harabe ↔ sağlam hâl arasında çözülerek dönüşür (HistoryLayerMorphing); kart + cızırtı sesi.
 * DOKUNMATİK: tek parmak sürükleme = yürü (dikey) + bak (yatay); çift dokunuş = henüz görülmemiş en yakın Tarih Katmanı noktasına git.
 * Şanlıurfa ve öteki oyunlarla tutarlılık: aynı cihaz profili (?q=low|medium|high), ?debug kancası (__zil), pil tasarrufu, PerformanceMonitor
 *   ile kademe düşürme, tr-TR sesli okuma, WebGL yoksa Vikipedi fotoğraflı yedek ekran; kartlarda kaynak bağlantısı.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { create } from 'zustand';
import { ArrowLeft, Captions, CaptionsOff, ExternalLink, History, Mountain, Volume2, VolumeX, X } from 'lucide-react';
import { Character, newRig, type Palette } from '../kiz-kulesi/NPCController';
import { LAYERS, REVEALS, ROUTE_LEN, SUMMIT_CAM, SUMMIT_S, castleBase, fallsFoot, heightAt, nextLayer, riverX, routeAt, waterY, type Layer, type V3 } from './valley';
import { BASE_DENSITY, density, fogPlan, fogSheetTexture, linearFogRange, revealWeight, shaftIntensity, stepOpen, summitClear, wind, type FogPlan, type Tier } from './VolumetricFogSystem';
import { activated, makeMorphUniforms, morphTarget, stepMorph } from './HistoryLayerMorphing';
import { alderGeometry, billboardGeometry, fernGeometry, fernTexture, fillInstances, makeWind, mossGeometry, rhodoGeometry, scatter, spruceCardTexture, spruceGeometry, windMaterial, type WindUniforms } from './ProceduralVegetation';
import { Bridge, Castle, HemsinHouse, Mountains, mountainMat, PathRibbon, River, SUN_DIR, Serender, Terrain } from './OrganicArchitecture';
import { zilAudio } from './ZilKaleAudio';

const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const pinned = (() => { const q = new URLSearchParams(location.search).get('q'); return q === 'low' || q === 'medium' || q === 'high' ? (q as Tier) : null; })();
function detectTier(): Tier {
  if (pinned) return pinned;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low';
  return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high';
}
const TRAVELER: Palette = { skin: '#d2a07c', hair: '#2a1d14', top: '#7a2e24', pants: '#2e3238', shoes: '#4a3a2a', scarf: '#c9b27a' };
const FOG_COLOR = new THREE.Color('#b7c2c3'), WALK = 3.5, EYE = 1.65;

/* ---------- durum ---------- */
interface S { started: boolean; seen: string[]; card: Layer | null; reveal: string | null; summit: boolean; muted: boolean; tts: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, seen: [] as string[], card: null, reveal: null, summit: false, endShown: false };
const useDb = create<S>((set) => ({ ...INITIAL, muted: false, tts: true, set: (p) => set(p) }));
const live = { s: 0, v: 0, input: 0, yaw: 0, pitch: -0.05, goal: null as number | null, open: 0, sigma: BASE_DENSITY, rig: newRig(0, 0, 0), morph: {} as Record<string, number> };
const U = makeMorphUniforms();

export default function ZilKaleGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}

function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier), [saver, setSaver] = useState(() => location.search.includes('saver'));
  const plan = useMemo(() => fogPlan(tier, saver), [tier, saver]);
  const S = useDb();
  const keys = useRef(new Set<string>()), drag = useRef<{ id: number; x: number; y0: number; y: number; mouse: boolean } | null>(null), lastTap = useRef(0);

  useEffect(() => {
    type B = EventTarget & { level: number; charging: boolean }; let b: B | null = null; const check = () => b && setSaver(b.level < 0.2 && !b.charging);
    (navigator as Navigator & { getBattery?: () => Promise<B> }).getBattery?.().then((x) => { b = x; check(); x.addEventListener('levelchange', check); x.addEventListener('chargingchange', check); }).catch(() => {});
    return () => { b?.removeEventListener('levelchange', check); b?.removeEventListener('chargingchange', check); };
  }, []);
  useEffect(() => { zilAudio.setMuted(S.muted); }, [S.muted]);
  useEffect(() => { zilAudio.saver = saver; }, [saver]);
  useEffect(() => () => { zilAudio.dispose(); useDb.setState(INITIAL); Object.assign(live, { s: 0, v: 0, input: 0, yaw: 0, pitch: -0.05, goal: null, open: 0, morph: {} }); for (const k in U) U[k].value = 0; }, []);

  const close = useCallback(() => { useDb.getState().set({ card: null }); zilAudio.hush(); }, []);
  const goNext = useCallback(() => { const l = nextLayer(live.s, useDb.getState().seen); if (l) live.goal = l.s; }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); const s = useDb.getState(); if (!s.started || e.repeat) return;
      if ((e.code === 'Escape' || e.code === 'KeyE') && s.card) close(); if (e.code === 'KeyN') goNext(); };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0, last = performance.now();
    const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; const k = keys.current;
      const kb = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0); if (!drag.current || drag.current.mouse) live.input = kb;
      const turn = (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0) - (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0); live.yaw += turn * dt * 1.8; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); };
  }, [close, goNext]);
  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __zil: unknown }).__zil = { go: (s: number) => { live.s = s; live.goal = null; useDb.getState().set({ started: true }); }, look: (yaw: number, pitch = 0) => { live.yaw = yaw; live.pitch = pitch; }, state: () => ({ ...useDb.getState(), s: live.s, sigma: live.sigma, open: live.open, morph: { ...live.morph } }), REVEALS, LAYERS, ROUTE_LEN };
  }, []);

  // dokunmatik: dikey sürükleme = yürü, yatay = bak; fare: sürükleme = bak (iki eksen), W/S = yürü; çift dokunuş = sıradaki Tarih Katmanı
  const onDown = (e: React.PointerEvent) => {
    zilAudio.unlock(); if (!useDb.getState().started) return; const now = performance.now();
    if (now - lastTap.current < 300) goNext(); lastTap.current = now; drag.current = { id: e.pointerId, x: e.clientX, y0: e.clientY, y: e.clientY, mouse: e.pointerType === 'mouse' };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || d.id !== e.pointerId) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY;
    live.yaw += dx * 0.005;
    if (d.mouse) live.pitch = THREE.MathUtils.clamp(live.pitch + dy * 0.004, -1, 0.9);
    else { live.input = THREE.MathUtils.clamp(-(e.clientY - d.y0) / 70, -1, 1); if (Math.abs(live.input) > 0.1) live.goal = null; }
  };
  const onUp = (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) { if (!drag.current.mouse) live.input = 0; drag.current = null; } };
  const start = () => { zilAudio.unlock(); S.set({ started: true }); };
  const allSeen = S.seen.length === LAYERS.length;

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#b7c2c3] text-white" style={{ touchAction: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <Canvas dpr={plan.dpr} gl={{ antialias: plan.tier === 'high', powerPreference: 'high-performance' }} camera={{ fov: 62, near: 0.1, far: 1400, position: [20, 7, 18] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}>
          <World plan={plan} />
          {plan.bloom && (
            <EffectComposer multisampling={0}>
              <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.3} intensity={0.5} />
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              <Vignette darkness={0.4} offset={0.3} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={onExit} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/45" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
        <button onClick={() => { zilAudio.unlock(); S.set({ muted: !S.muted }); }} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/45" aria-label={S.muted ? 'Sesi aç' : 'Sesi kapat'}>{S.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <button onClick={() => { S.set({ tts: !S.tts }); if (S.tts) zilAudio.hush(); }} className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-full ${S.tts ? 'bg-emerald-300 text-black' : 'bg-black/45'}`} aria-label={S.tts ? 'Sesli okumayı kapat' : 'Sesli okumayı aç'} aria-pressed={S.tts}>{S.tts ? <Captions size={18} /> : <CaptionsOff size={18} />}</button>
        {S.started && (
          <div className="mx-auto flex flex-col items-center gap-1 rounded-2xl bg-black/45 px-4 py-2">
            <div className="flex gap-1">{LAYERS.map((l) => <History key={l.id} size={13} className={S.seen.includes(l.id) ? 'text-emerald-300' : 'text-white/30'} />)}</div>
            <p className="text-xs">{S.seen.length}/{LAYERS.length} tarih izi{plan.saver ? ' · pil tasarrufu' : ''}</p>
          </div>
        )}
      </div>
      {S.reveal && <p key={S.reveal} className="pointer-events-none absolute inset-x-0 top-[28%] text-center text-3xl font-bold tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.6)] sm:text-4xl" style={{ animation: 'zkfade 4.2s ease-out forwards' }}>{S.reveal}<span className="mt-1 block text-sm font-normal text-white/85">sis aralanıyor</span></p>}
      <style>{'@keyframes zkfade{0%{opacity:0;transform:translateY(8px)}15%{opacity:1;transform:none}70%{opacity:1}100%{opacity:0}}'}</style>
      {S.started && !S.card && <p className="pointer-events-none absolute bottom-6 left-1/2 w-max max-w-[92vw] -translate-x-1/2 rounded-full bg-black/40 px-4 py-1.5 text-center text-xs">{S.summit ? 'Zil Kale · geri yürümek için aşağı sürükle' : 'Dikey sürükle: yürü · yatay: bak · çift dokun: sıradaki tarih izi'}<span className="hidden [@media(pointer:fine)]:inline"> · W/S · fareyle bak · N</span></p>}
      {S.card && <Card l={S.card} onClose={close} />}
      {!S.started && <TitleCard onStart={start} />}
      {S.started && S.summit && allSeen && !S.endShown && !S.card && <EndCard onStay={() => S.set({ endShown: true })} onExit={onExit} />}
    </div>
  );
}

/* ---------- 3B dünya ---------- */
function World({ plan }: { plan: FogPlan }) {
  const rig = useMemo(() => ({ current: live.rig }), []);
  const sky = useMemo(() => FOG_COLOR.clone(), []);
  const ev = LAYERS.find((l) => l.id === 'ev')!, ser = LAYERS.find((l) => l.id === 'serender')!;
  const wind = useMemo(makeWind, []);
  const charRef = useRef<THREE.Group>(null);
  return (
    <group>
      {/* sisli hava: ışığın çoğu gökyüzünden dağınık gelir (yumuşak, gölgesiz); güneş zayıf ve sıcak */}
      <hemisphereLight args={['#eef3f4', '#5d6a44', 1.45]} />
      <directionalLight position={SUN_DIR.clone().multiplyScalar(200).toArray()} intensity={1.1} color="#fff1d8" />
      <ambientLight intensity={0.3} color="#d6dee0" />
      <Terrain tier={plan.tier} />
      <PathRibbon />
      <River tier={plan.tier} sky={sky} />
      <Bridge u={U} saver={plan.saver} />
      <Castle u={U} saver={plan.saver} tier={plan.tier} />
      <HemsinHouse at={ev.pos} u={U.ev} saver={plan.saver} />
      <Serender at={ser.pos} u={U.serender} saver={plan.saver} />
      <Mountains />
      <Vegetation tier={plan.tier} wind={wind} />
      {plan.sheets > 0 && <FogSheets count={plan.sheets} />}
      {plan.shafts > 0 && <LightShafts count={plan.shafts} />}
      <group ref={charRef} visible={false}><Character rig={rig} palette={TRAVELER} /></group>
      <Controller plan={plan} wind={wind} sky={sky} charRef={charRef} />
    </group>
  );
}

/** Bitki örtüsü: tür başına bir InstancedMesh (+ uzak ladin panoları) */
function Vegetation({ tier, wind }: { tier: Tier; wind: WindUniforms }) {
  const data = useMemo(() => {
    const spruce = scatter('spruce', tier), far = spruce.filter((p) => p.far), near = spruce.filter((p) => !p.far);
    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });
    return [
      { list: scatter('fern', tier), geo: fernGeometry(), mat: windMaterial(std({ map: fernTexture(), alphaTest: 0.45, side: THREE.DoubleSide, color: '#a8c890' }), wind, 0.6, 0.12), tilt: 0.7 },
      { list: scatter('moss', tier), geo: mossGeometry(), mat: std({ vertexColors: true, roughness: 1 }), tilt: 1 },
      { list: scatter('rhodo', tier), geo: rhodoGeometry(), mat: windMaterial(std({ vertexColors: true }), wind, 1.4, 0.08), tilt: 0.4 },
      { list: near, geo: spruceGeometry(), mat: windMaterial(std({ vertexColors: true, side: THREE.DoubleSide }), wind, 11, 0.18), tilt: 0 },
      { list: far, geo: billboardGeometry(), mat: windMaterial(std({ map: spruceCardTexture(), alphaTest: 0.5, side: THREE.DoubleSide }), wind, 11, 0.15), tilt: 0 },
      { list: scatter('alder', tier), geo: alderGeometry(), mat: windMaterial(std({ vertexColors: true }), wind, 7, 0.2), tilt: 0 },
    ];
  }, [tier, wind]);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  useEffect(() => { data.forEach((d, i) => { const m = refs.current[i]; if (m) fillInstances(m, d.list, d.tilt); }); }, [data]);
  return <>{data.map((d, i) => <instancedMesh key={`${tier}${i}`} ref={(m) => { refs.current[i] = m; }} args={[d.geo, d.mat, Math.max(1, d.list.length)]} frustumCulled={false} />)}</>;
}

/** Sis perdeleri: rüzgârla sürüklenen, kameraya dönük yumuşak katmanlar; oyuncunun çevresindeki 140 m'lik kutuda sarılır */
function FogSheets({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { mat, seeds } = useMemo(() => {
    const t = new THREE.CanvasTexture(fogSheetTexture()); const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, color: FOG_COLOR.clone().multiplyScalar(1.08), opacity: 0.5, fog: false });
    let s = 5; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return { mat: m, seeds: Array.from({ length: count }, () => ({ x: (r() - 0.5) * 140, z: (r() - 0.5) * 140, h: 1.5 + r() * 9, w: 16 + r() * 18, k: 0.6 + r() * 0.8 })) };
  }, [count]);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ camera, clock }) => {
    const m = ref.current; if (!m) return; const t = clock.elapsedTime, w = wind(t), cx = camera.position.x, cz = camera.position.z;
    mat.opacity = THREE.MathUtils.clamp(live.sigma / BASE_DENSITY, 0, 1.1) * 0.42;
    seeds.forEach((q, i) => {
      const wrap = (v: number, c: number) => c + ((((v - c + 70) % 140) + 140) % 140) - 70;
      const x = wrap(q.x + w.dir[0] * t * 1.6 * q.k, cx), z = wrap(q.z + w.dir[1] * t * 1.6 * q.k, cz);
      o.position.set(x, heightAt(x, z) + q.h, z); o.rotation.set(0, Math.atan2(cx - x, cz - z), 0); o.scale.set(q.w, q.w * 0.35, 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[undefined, mat, count]} frustumCulled={false} renderOrder={3}><planeGeometry args={[1, 1]} /></instancedMesh>;
}

/** Işık huzmeleri: ağaç tepelerinden güneş yönünde eğik, eklemeli koniler. Parlaklık = shaftIntensity(σ, cosθ) */
const SHAFT_VS = /* glsl */ `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const SHAFT_FS = /* glsl */ `uniform float uI; uniform vec3 uC; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){ float rim = pow(abs(dot(vN, vV)), 2.0); float along = smoothstep(0.0, 0.15, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
    gl_FragColor = vec4(uC * uI * rim * along * 0.22, 1.0); }`;
function LightShafts({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { geo, mat } = useMemo(() => {
    const g = new THREE.CylinderGeometry(2.6, 1.1, 36, 14, 1, true); g.translate(0, 18, 0);   // taban yerde, eksen +y
    const m = new THREE.ShaderMaterial({ vertexShader: SHAFT_VS, fragmentShader: SHAFT_FS, uniforms: { uI: { value: 0 }, uC: { value: new THREE.Color('#ffe8c0') } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    return { geo: g, mat: m };
  }, []);
  useEffect(() => {
    const m = ref.current; if (!m) return; const o = new THREE.Object3D(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), SUN_DIR); let sd = 9; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) { const R = routeAt(((i + 0.5) / count) * (ROUTE_LEN - 30)), side = r() < 0.5 ? -1 : 1, d = 5 + r() * 12, x = R.p[0] - R.dir[1] * d * side, z = R.p[2] + R.dir[0] * d * side;
      o.position.set(x, heightAt(x, z), z); o.quaternion.copy(q); o.scale.set(0.7 + r() * 0.6, 1, 0.7 + r() * 0.6); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
  }, [count]);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => { camera.getWorldDirection(fwd); mat.uniforms.uI.value = shaftIntensity(live.sigma, fwd.dot(SUN_DIR)) * (1 - summitClear(live.s)); });
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} renderOrder={4} />;
}

/* ---------- hareket, kamera, sis, tarih katmanı ---------- */
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _p2 = new THREE.Vector3(), _l = new THREE.Vector3(), _f = new THREE.Vector3();
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
function Controller({ plan, wind: wu, sky, charRef }: { plan: FogPlan; wind: WindUniforms; sky: THREE.Color; charRef: React.RefObject<THREE.Group> }) {
  const { camera, scene } = useThree();
  const st = useRef({ step: 0, bob: 0, grade: 0, head: NaN, reveal: '' as string, revealSeen: new Set<string>(), au: 0, summit: false });
  const fogs = useMemo(() => ({ exp: new THREE.FogExp2(FOG_COLOR.getHex(), BASE_DENSITY), lin: new THREE.Fog(FOG_COLOR.getHex(), 2, 60) }), []);
  useEffect(() => { scene.background = FOG_COLOR.clone(); return () => { scene.fog = null; scene.background = null; }; }, [scene]);
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __zilScene: unknown }).__zilScene = scene; }, [scene]);
  const ys = useMemo(() => ({ cam: Math.max(castleBase() + SUMMIT_CAM.up, heightAt(SUMMIT_CAM.pos[0], SUMMIT_CAM.pos[2]) + 4), look: castleBase() + 6 }), []);
  const hills = useCallback((): V3 => { const z = camera.position.z + (Math.random() - 0.5) * 180, side = Math.random() < 0.5 ? -1 : 1, x = riverX(z) + side * (60 + Math.random() * 50); return [x, heightAt(x, z), z]; }, [camera]);
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05), S = useDb.getState(), t = clock.elapsedTime;
    // --- hareket: bakış geriye dönükse ileri girdisi geldiğin yöne yürütür
    const back = Math.cos(live.yaw) < 0 && !S.summit ? -1 : 1;
    let want = S.started ? live.input * WALK * back : 0;
    if (live.goal !== null) { const d = live.goal - live.s; if (Math.abs(d) < 0.3) live.goal = null; else want = Math.sign(d) * Math.min(WALK * 1.4, Math.abs(d) * 1.5 + 0.8); }
    live.v += (want - live.v) * (1 - Math.exp(-dt * 5));
    const before = live.s; live.s = Math.max(0, Math.min(ROUTE_LEN, live.s + live.v * dt)); const moved = live.s - before, R = routeAt(live.s);
    st.current.step += Math.abs(moved); if (st.current.step > 0.8) { st.current.step = 0; zilAudio.step(R.surface); }
    st.current.bob += Math.abs(moved) * 2.2;
    // --- sis: açılma anı + rüzgâr
    const rw = revealWeight(live.s); live.open = stepOpen(live.open, rw.w > 0.5 ? 1 : 0, dt);
    if (rw.id && rw.id !== st.current.reveal) { st.current.reveal = rw.id; if (!st.current.revealSeen.has(rw.id)) { st.current.revealSeen.add(rw.id); S.set({ reveal: REVEALS.find((r) => r.id === rw.id)!.name }); setTimeout(() => useDb.getState().set({ reveal: null }), 4300); } }
    if (!rw.id) st.current.reveal = '';
    const sig = (live.sigma = density(live.s, t, live.open)), w = wind(t);
    if (plan.linear) { const [n, f] = linearFogRange(sig); fogs.lin.near = n; fogs.lin.far = f; scene.fog = fogs.lin; } else { fogs.exp.density = sig; scene.fog = fogs.exp; }
    sky.copy(FOG_COLOR).lerp(new THREE.Color('#9fb4c4'), summitClear(live.s) * 0.8); (scene.background as THREE.Color).copy(sky); fogs.exp.color.copy(sky); fogs.lin.color.copy(sky);
    wu.uTime.value = t; wu.uWind.value.set(w.dir[0], w.dir[1], 0); wu.uAmp.value = plan.windAnim ? 0.5 + w.speed : 0;
    // --- tarih katmanı
    for (const l of LAYERS) { const prev = live.morph[l.id] ?? 0, tg = S.started ? morphTarget(live.s, l) : 0, next = plan.saver ? (tg > 0.5 ? 1 : 0) : stepMorph(prev, tg, dt); live.morph[l.id] = next; U[l.id].value = next;
      if (activated(prev, next) && S.started) { zilAudio.history(); const s2 = useDb.getState(); s2.set({ card: l, seen: s2.seen.includes(l.id) ? s2.seen : [...s2.seen, l.id] }); if (s2.tts) zilAudio.speak(`${l.name}. ${l.pastText}`); }
      if (S.card?.id === l.id && tg === 0 && next < 0.4) S.set({ card: null }); }
    // --- kamera: vadide birinci şahıs (rotaya kilitli, serbest bakış); kale tepesinde sabit geniş açı
    const hd = Math.atan2(-R.dir[0], -R.dir[1]); if (Number.isNaN(st.current.head)) st.current.head = hd; st.current.head += wrapA(hd - st.current.head) * (1 - Math.exp(-dt * 3));
    const bob = Math.sin(st.current.bob) * 0.035 * Math.min(1, Math.abs(live.v) / 2);
    const grade = (routeAt(live.s + 2).p[1] - routeAt(live.s - 2).p[1]) / 4; st.current.grade += (Math.atan(grade) * 0.55 - st.current.grade) * (1 - Math.exp(-dt * 2));   // yokuşta bakış eğime uyar
    _e.set(live.pitch + st.current.grade, st.current.head + live.yaw, 0); _q.setFromEuler(_e); _p.set(R.p[0], R.p[1] + EYE + bob, R.p[2]);
    if (!S.started) { _p.set(riverX(34), waterY(34) + 5, 34); _q.setFromRotationMatrix(_m.lookAt(_p, _l.set(riverX(-50), waterY(-50) + 9, -50), THREE.Object3D.DEFAULT_UP)); }   // açılış: dere üstünden vadiye
    const sw = THREE.MathUtils.smoothstep(live.s, SUMMIT_S - 2, SUMMIT_S + 5);
    if (sw > 0) { _p2.set(SUMMIT_CAM.pos[0], ys.cam, SUMMIT_CAM.pos[2]); _q2.setFromRotationMatrix(_m.lookAt(_p2, _l.set(SUMMIT_CAM.look[0], ys.look, SUMMIT_CAM.look[2]), THREE.Object3D.DEFAULT_UP)); _p.lerp(_p2, sw); _q.slerp(_q2, sw); }
    camera.position.copy(_p); camera.quaternion.copy(_q);
    const summit = sw > 0.5; if (summit !== st.current.summit) { st.current.summit = summit; S.set({ summit }); }
    // oyuncu karakteri yalnız tepede görünür (birinci şahısta kendi gövdemizi görmeyiz)
    const r = live.rig; r.x = R.p[0]; r.y = R.p[1]; r.z = R.p[2]; r.speed = dt > 0 ? Math.abs(moved) / dt : 0; r.wind = w.speed;
    if (Math.abs(moved) > 1e-4) { const yw = Math.atan2(R.dir[0] * Math.sign(moved), R.dir[1] * Math.sign(moved)); r.yaw += wrapA(yw - r.yaw) * (1 - Math.exp(-dt * 8)); }
    if (charRef.current) charRef.current.visible = sw > 0.3;
    // uzak dağlar yalnızca tepede açılır (sis içinden "parlamasınlar")
    { const v = summitClear(live.s); mountainMat.opacity = v; mountainMat.visible = v > 0.01; mountainMat.color.setScalar(1).lerp(sky, 0.45); }   // hava perspektifi: uzak sırtlar gökyüzü rengine çalar
    // --- ses (~10 Hz)
    st.current.au += dt; if (st.current.au > 0.1) { camera.getWorldDirection(_f); const z = camera.position.z, cx = riverX(z);
      zilAudio.update({ ear: [camera.position.x, camera.position.y, camera.position.z], fwd: [_f.x, _f.z], creekAt: [cx, waterY(z), z], creekDist: Math.abs(camera.position.x - cx) + Math.max(0, camera.position.y - waterY(z) - 2) * 0.5, falls: fallsFoot(), wind: w, dt: st.current.au, hills }); st.current.au = 0; }
  });
  return null;
}

/* ---------- arayüz ---------- */
function Card({ l, onClose }: { l: Layer; onClose: () => void }) {
  return (
    <div className="absolute inset-x-3 bottom-14 z-40 mx-auto max-w-lg sm:bottom-6 sm:left-auto sm:right-6 sm:mx-0" onPointerDown={(e) => e.stopPropagation()}>
      <div className="rounded-2xl border border-emerald-100/25 bg-[#18211c]/90 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-2">
          <div><p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Tarih katmanı · {l.era}</p><h2 className="text-xl font-bold">{l.name}</h2></div>
          <button onClick={onClose} className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10" aria-label="Kapat"><X size={18} /></button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/70"><span className="font-semibold text-white/85">Bugün: </span>{l.ruinText}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-white/90"><span className="font-semibold text-emerald-200">Geçmişte: </span>{l.pastText}</p>
        <a href={l.source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-white/60 underline">{l.source.title} <ExternalLink size={12} /></a>
      </div>
    </div>
  );
}
function TitleCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-40 p-4 sm:p-8" onPointerDown={(e) => e.stopPropagation()}>
      <div className="mx-auto max-w-xl rounded-2xl bg-black/60 p-5 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Rize · Çamlıhemşin · Fırtına Vadisi</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Zil Kale: Sis İçindeki İzler</h1>
        <p className="mt-2 text-sm text-white/85">Sisli vadiye giren bir yolcusun. Dere kıyısından taş köprüye, şelaleye ve ormanın içinden Zil Kale’ye yürü. Sis bazı yerlerde birden aralanır. Eski taşlara ve ahşap evlere yaklaştıkça geçmişteki hâlleri belirir.</p>
        <p className="mt-2 text-xs text-white/60">Dikey sürükle ya da W/S: ileri/geri · yatay sürükle ya da fare: etrafa bak · çift dokun: sıradaki tarih izine git</p>
        <p className="mt-1 text-[11px] text-white/45">Vadi stilizedir, mesafeler kısaltılmıştır. Kalenin “sağlam hâli” bir canlandırmadır; yapım tarihi kesin bilinmiyor.</p>
        <button onClick={onStart} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 font-semibold text-black"><Mountain size={18} /> Vadiye gir</button>
      </div>
    </div>
  );
}
function EndCard({ onStay, onExit }: { onStay: () => void; onExit: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/25 p-5" onPointerDown={(e) => e.stopPropagation()}>
      <div className="w-full max-w-md rounded-3xl bg-[#eef1ec] p-6 text-center text-ink shadow-2xl">
        <p className="text-sm font-semibold text-emerald-700">Bütün izler bulundu</p>
        <h2 className="mt-1 text-2xl font-bold">Sisin içinden kaleye</h2>
        <p className="mt-2 text-sm text-slate-600">Ahşap evden serendere, kitabesi kaybolmuş köprüden Zil Kale’nin surlarına kadar vadinin beş tarih izini gördün.</p>
        <div className="mt-5 flex gap-2">
          <button onClick={onStay} className="h-11 flex-1 rounded-xl border border-line font-semibold">Manzaraya bak</button>
          <button onClick={onExit} className="h-11 flex-1 rounded-xl bg-brand font-semibold text-white">Haritaya dön</button>
        </div>
      </div>
    </div>
  );
}
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null), [i, setI] = useState(0);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Zilkale').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  const l = LAYERS[i];
  return (
    <div className="fixed inset-0 bg-[#1c2420] text-white">
      {img && <img src={img} alt="Zil Kale" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <p className="mt-1 text-[11px] font-semibold uppercase text-emerald-300">{l.era}</p><h2 className="text-lg font-bold">{l.name}</h2><p className="mt-1 text-sm">{l.pastText}</p>
        <div className="mt-3 flex gap-2"><button onClick={() => zilAudio.speak(l.pastText)} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button><button onClick={() => setI((i + 1) % LAYERS.length)} className="h-10 rounded-lg bg-emerald-300 px-4 text-sm font-semibold text-black">Sonraki</button></div>
      </div>
    </div>
  );
}
