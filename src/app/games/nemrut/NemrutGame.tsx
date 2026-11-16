/**
 * Nemrut Dağı — "Tanrıların Alacakaranlığı". Ana yönetici: gün döngüsü durumu, sabit kameralar, atmosfer uygulaması, restore.
 *
 * Oyuncu bir nöbetçidir: yürümez, kamerayı çevirmez. Üç sabit bakış vardır (Doğu Terası, Batı Terası, Tümülüs kuş bakışı); kamera
 * heykellerin arkasına asla geçmez. Tek etkileşim zamandır: sürgü ya da ekranı sürükleme güneşi hareket ettirir.
 * Işık: tek gerçek zamanlı yönlü güneş + yarım küre dolgu; gökyüzü, sis, yıldızlar ve tanrı ışınları DynamicLightingSystem.atmosphere(saat)
 * çıktısından beslenir. Sürgü hareket ederken bu güncelleme 30 Hz'e düşer (pil), durunca her karede yapılır.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { EffectComposer, GodRays, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { ArrowLeft, ExternalLink, Volume2, VolumeX, ZoomIn, ZoomOut } from 'lucide-react';
import { BEST_HOUR, GOLDEN, WIND_DIR, approach, atmosphere, restoreTarget, shouldUpdate, type Terrace } from './DynamicLightingSystem';
import { CAMERAS, FIGURES, TERRACE_X, VIEW_LABEL, type View } from './terrain';
import { Scatter, Terrain, type Tier } from './ProceduralTerrain';
import { Colossi } from './ColossalHeads';
import { TimeSlider, useTimeGestures, wrapHour } from './TimeSliderUI';
import { nemrutAudio } from './AudioManager';

const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const isTouch = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches;
function detectTier(): Tier {
  const q = new URLSearchParams(location.search).get('q'); if (q === 'low' || q === 'medium' || q === 'high') return q;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low';
  return isTouch ? 'medium' : 'high';
}
const SRC = [
  { title: 'UNESCO — Nemrut Dağ', url: 'https://whc.unesco.org/en/list/448/' },
  { title: 'World Heritage Site — Nemrut Dag', url: 'https://www.worldheritagesite.org/list/Nemrut+Dag' },
];

export default function NemrutGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}

interface Shared { hour: React.MutableRefObject<number>; dragging: React.MutableRefObject<boolean>; near: React.MutableRefObject<boolean>; view: React.MutableRefObject<View>; restore: { dogu: React.MutableRefObject<number>; bati: React.MutableRefObject<number> } }

function Game({ onExit }: { onExit: () => void }) {
  const [tier] = useState<Tier>(detectTier), [saver, setSaver] = useState(false);
  const t: Tier = saver ? 'low' : tier, volumetric = t !== 'low';
  const [started, setStarted] = useState(false), [view, setView] = useState<View>('dogu'), [hour, setHourState] = useState(4.6);
  const [near, setNear] = useState(false), [muted, setMuted] = useState(false), [restored, setRestored] = useState(false), [fade, setFade] = useState(false), [figure, setFigure] = useState<number | null>(null);
  const sh: Shared = { hour: useRef(4.6), dragging: useRef(false), near: useRef(false), view: useRef<View>('dogu'), restore: { dogu: useRef(0), bati: useRef(0) } };
  sh.near.current = near; sh.view.current = view;
  const setHour = useCallback((h: number) => { sh.hour.current = h; setHourState(h); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const onDrag = useCallback((d: boolean) => { sh.dragging.current = d; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  // "en iyi ışık": bulunulan bakışın altın saatine yumuşakça akıt
  const anim = useRef<number | null>(null);
  const best = useCallback(() => {
    nemrutAudio.unlock(); const target = BEST_HOUR[sh.view.current], from = sh.hour.current, d = ((target - from + 36) % 24) - 12, t0 = performance.now();
    if (anim.current) cancelAnimationFrame(anim.current); sh.dragging.current = true;
    const step = () => { const k = Math.min(1, (performance.now() - t0) / 1600), e = k * k * (3 - 2 * k); setHour(wrapHour(from + d * e)); if (k < 1) anim.current = requestAnimationFrame(step); else sh.dragging.current = false; };
    anim.current = requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHour]);
  const gestures = useTimeGestures(sh.hour, setHour, onDrag, best);

  useEffect(() => {
    type B = EventTarget & { level: number; charging: boolean }; let b: B | null = null; const check = () => b && setSaver(b.level < 0.2 && !b.charging);
    (navigator as Navigator & { getBattery?: () => Promise<B> }).getBattery?.().then((x) => { b = x; check(); x.addEventListener('levelchange', check); x.addEventListener('chargingchange', check); }).catch(() => {});
    return () => { b?.removeEventListener('levelchange', check); b?.removeEventListener('chargingchange', check); };
  }, []);
  useEffect(() => { nemrutAudio.setMuted(muted); }, [muted]);
  useEffect(() => () => { nemrutAudio.dispose(); if (anim.current) cancelAnimationFrame(anim.current); }, []);
  useEffect(() => { if (restored) nemrutAudio.restore(); else setFigure(null); }, [restored]);
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __nem: unknown }).__nem = { hour: setHour, view: setView, near: setNear, start: () => setStarted(true) }; });
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.code === 'ArrowRight') setHour(wrapHour(sh.hour.current + 0.25)); if (e.code === 'ArrowLeft') setHour(wrapHour(sh.hour.current - 0.25)); if (e.code === 'Space') { e.preventDefault(); best(); } }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [best, setHour]);

  const go = (v: View) => { if (v === view) return; setFade(true); setTimeout(() => { setView(v); setNear(false); setTimeout(() => setFade(false), 150); }, 500); };
  const terrace: Terrace | null = view === 'tumulus' ? null : view;

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#05070d] text-white" style={{ touchAction: 'none' }}>
      <Canvas shadows={t !== 'low'} dpr={t === 'low' ? 1 : [1, 1.6]} gl={{ antialias: t === 'high', powerPreference: 'high-performance' }} camera={{ fov: 46, near: 0.5, far: 6000, position: CAMERAS.dogu.far }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}>
        <Suspense fallback={null}>
          <Atmos sh={sh} tier={t} volumetric={volumetric} onRestored={setRestored} />
          <Terrain tier={t} />
          <Scatter tier={t} />
          {/* LOD: teras bakışında o terasın başları ayrıntılı; diğer teras ve kuş bakışı basit siluet */}
          <Colossi side={1} hi={view === 'dogu'} restore={sh.restore.dogu} shadows={t !== 'low'} />
          <Colossi side={-1} hi={view === 'bati'} restore={sh.restore.bati} shadows={t !== 'low'} />
          <Rig sh={sh} />
        </Suspense>
      </Canvas>

      {started && <div className="absolute inset-0" {...gestures} onPointerDown={(e) => { nemrutAudio.unlock(); gestures.onPointerDown(e); }} />}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3">
        <button onClick={onExit} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/55" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
        <button onClick={() => { nemrutAudio.unlock(); setMuted(!muted); }} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/55" aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        {started && (
          <div className="pointer-events-auto mx-auto flex gap-1 rounded-2xl bg-black/55 p-1">
            {(['dogu', 'tumulus', 'bati'] as View[]).map((v) => <button key={v} onClick={() => go(v)} className={`h-9 rounded-xl px-3 text-xs font-semibold sm:text-sm ${v === view ? 'bg-white text-black' : 'text-white/85'}`}>{VIEW_LABEL[v]}</button>)}
          </div>
        )}
        {started && terrace && (
          <button onClick={() => setNear(!near)} className="pointer-events-auto ml-auto inline-flex h-11 items-center gap-1.5 rounded-full bg-black/55 px-3 text-sm" aria-pressed={near}>{near ? <ZoomOut size={16} /> : <ZoomIn size={16} />} {near ? 'Uzaklaş' : 'Yaklaş'}</button>
        )}
      </div>

      {started && terrace && restored && (
        <div className="absolute left-3 top-16 w-[min(20rem,calc(100%-1.5rem))] animate-fade-up rounded-2xl bg-black/65 p-3 text-sm backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">Canlandırma · varsayımsal renkler</p>
          <div className="mt-1.5 flex flex-wrap gap-1">{FIGURES.map((f, i) => <button key={f.id} onClick={() => { setFigure(i); nemrutAudio.speak(f.text); }} className={`rounded-full px-2.5 py-1 text-xs ${figure === i ? 'bg-amber-400 text-black' : 'bg-white/15'}`}>{f.name}</button>)}</div>
          {figure !== null && <p className="mt-2 text-white/85">{FIGURES[figure].text}</p>}
          <p className="mt-2 text-[11px] text-white/55">Başlar gövdelerine geri konmuş ve boyanmış hâlde gösterilir. Renkler bir tahmindir; heykellerin özgün boyasına dair kanıt bu çalışmada bulunamadı.</p>
          <a href={SRC[0].url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-white/60 underline">{SRC[0].title} <ExternalLink size={11} /></a>
        </div>
      )}
      {started && view === 'tumulus' && <p className="pointer-events-none absolute left-3 top-16 max-w-xs rounded-2xl bg-black/60 p-3 text-sm backdrop-blur">Tümülüs: yaklaşık 50 m yüksekliğinde, 150 m çapında kırma taş yığını. Altında I. Antiochos’un mezarının olduğu düşünülür; mezar odası bugüne kadar bulunamadı.</p>}

      {started && <TimeSlider hour={hour} onChange={setHour} onDrag={onDrag} onBest={best} golden={terrace ? GOLDEN[terrace] : null} />}
      {!started && (
        <div className="absolute inset-0 grid place-items-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 sm:place-items-center">
          <div className="w-full max-w-xl rounded-2xl bg-black/70 p-5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Adıyaman · UNESCO Dünya Mirası · 2.134 m</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Nemrut Dağı: Tanrıların Alacakaranlığı</h1>
            <p className="mt-2 text-sm text-white/80">İki bin yıldır burada nöbet tutuyorsun. Zamanı sen akıtırsın: sisli şafaktan sert öğleye, altın akşamdan yıldızlı geceye. Her teras kendi altın saatinde canlanır.</p>
            <button onClick={() => { nemrutAudio.unlock(); setStarted(true); }} className="mt-4 h-12 w-full rounded-xl bg-brand font-semibold">Nöbete başla</button>
          </div>
        </div>
      )}
      <div className={`pointer-events-none absolute inset-0 z-50 bg-black transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
    </div>
  );
}

/* ---------- sabit kamera: bakışa göre konum, yakın/uzak arasında yumuşak geçiş, hafif nefes ---------- */
function Rig({ sh }: { sh: Shared }) {
  const { camera } = useThree();
  const pos = useRef(new THREE.Vector3(...CAMERAS.dogu.far)), look = useRef(new THREE.Vector3(...CAMERAS.dogu.look)), cur = useRef<View>('dogu');
  const want = useMemo(() => new THREE.Vector3(), []), fwd = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.1), v = sh.view.current, c = CAMERAS[v], near = sh.near.current && v !== 'tumulus';
    want.set(...(near ? c.near : c.far));
    if (cur.current !== v) { cur.current = v; pos.current.copy(want); look.current.set(...c.look); }   // bakış değişimi kararma sırasında: anında
    pos.current.lerp(want, 1 - Math.exp(-dt * 1.6));
    camera.position.copy(pos.current); camera.position.y += Math.sin(clock.elapsedTime * 0.5) * (v === 'tumulus' ? 1.2 : 0.06); camera.position.z += Math.sin(clock.elapsedTime * 0.23) * (v === 'tumulus' ? 6 : 0.25);
    camera.lookAt(look.current);
    const cam = camera as THREE.PerspectiveCamera; if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
    camera.getWorldDirection(fwd);
    const a = atmosphere(sh.hour.current);
    nemrutAudio.update(a.wind, [camera.position.x, camera.position.y, camera.position.z], [fwd.x, fwd.y, fwd.z], v === 'bati' ? -TERRACE_X : TERRACE_X);
  });
  return null;
}

/* ---------- atmosfer: güneş, gökyüzü, sis, yıldızlar, tanrı ışınları, restore ---------- */
function Atmos({ sh, tier, volumetric, onRestored }: { sh: Shared; tier: Tier; volumetric: boolean; onRestored: (b: boolean) => void }) {
  const { scene, gl, camera } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null!), hemi = useRef<THREE.HemisphereLight>(null!), disc = useRef<THREE.Mesh>(null!), stars = useRef<THREE.Points>(null!), fogs = useRef<THREE.InstancedMesh>(null!);
  const sky = useRef<{ material: THREE.ShaderMaterial }>(null!);
  const st = useRef({ last: -1, restored: false, t: 0 });
  const starGeo = useMemo(() => { const n = tier === 'low' ? 700 : 2200, a = new Float32Array(n * 3); let s = 5; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < n; i++) { const u = r() * Math.PI * 2, v = Math.acos(r() * 0.98), R = 3800; a.set([Math.cos(u) * Math.sin(v) * R, Math.cos(v) * R, Math.sin(u) * Math.sin(v) * R], i * 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g; }, [tier]);
  // hacimsel sis taklidi: rüzgâr yönünde sürüklenen büyük, yumuşak, kameraya dönük bulutlar (tek InstancedMesh)
  const fog = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const n = tier === 'medium' ? 26 : 44, seeds = Array.from({ length: n }, (_, i) => ({ a: (i * 2.399) % (Math.PI * 2), d: 100 + ((i * 53) % 260), y: -20 + ((i * 17) % 60), s: 90 + ((i * 31) % 110), ph: i * 37.7 }));
    return { tex: new THREE.CanvasTexture(c), n, seeds };
  }, [tier]);
  useEffect(() => { scene.fog = volumetric ? new THREE.FogExp2('#888', 0.002) : new THREE.Fog('#888', 120, 1400); scene.background = new THREE.Color('#05070d'); return () => { scene.fog = null; }; }, [scene, volumetric]);
  useEffect(() => { const c = sun.current.shadow.camera; c.left = -34; c.right = 34; c.top = 30; c.bottom = -14; c.near = 10; c.far = 520; c.updateProjectionMatrix(); }, []);

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color() }), []);
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.1), S = st.current, now = clock.elapsedTime;
    // restore: her terasın hedefi (altın saat ya da yakınlaşma)
    const v = sh.view.current; let active = false;
    for (const tr of ['dogu', 'bati'] as Terrace[]) { const target = restoreTarget(tr, sh.hour.current, sh.near.current && v === tr); sh.restore[tr].current = approach(sh.restore[tr].current, target, dt); if (v === tr && sh.restore[tr].current > 0.5) active = true; }
    if (active !== S.restored) { S.restored = active; onRestored(active); }
    // pil: sürgü hareket ederken ışık/atmosfer 30 Hz
    if (!shouldUpdate(now, S.last, sh.dragging.current)) return; S.last = now;
    const a = atmosphere(sh.hour.current), ex = a.exposure;
    // güneş (ya da gece: soluk ay ışığı karşı yönden)
    const night = a.day < 0.04, dir = night ? [-a.sun[0], Math.max(0.35, -a.sun[1]), -a.sun[2]] : [a.sun[0], Math.max(0.03, a.sun[1]), a.sun[2]];
    const cx = v === 'bati' ? -TERRACE_X : TERRACE_X;   // gölge haritası etkin terasa oturtulur
    sun.current.position.set(cx + dir[0] * 260, dir[1] * 260, dir[2] * 260); sun.current.target.position.set(cx, 3, 0); sun.current.target.updateMatrixWorld();
    if (night) sun.current.color.setRGB(0.45, 0.55, 0.8); else sun.current.color.setRGB(...a.sunColor); sun.current.intensity = (night ? 0.12 : a.sunIntensity) * ex;
    hemi.current.color.setRGB(...a.ambientSky); hemi.current.groundColor.setRGB(...a.ambientGround); hemi.current.intensity = a.ambient * ex;
    // sis ve arka plan
    tmp.c.setRGB(...a.fogColor); scene.fog!.color.copy(tmp.c); (scene.background as THREE.Color).copy(tmp.c);
    // kuş bakışında kamera ~350 m uzakta: aynı sis her şeyi yutar; yoğunluk bu bakışta azaltılır
    const far = v === 'tumulus' ? 0.28 : 1;
    if (scene.fog instanceof THREE.FogExp2) scene.fog.density = a.fogDensity * far; else { (scene.fog as THREE.Fog).near = 60; (scene.fog as THREE.Fog).far = Math.min(2600, 2.2 / (a.fogDensity * far)); }
    // gökyüzü (drei Sky): güneş konumu; gece soluklaşır
    if (sky.current) { const u = sky.current.material.uniforms; u.sunPosition.value.set(a.sun[0], a.sun[1], a.sun[2]).multiplyScalar(1000); u.rayleigh.value = 0.6 + (1 - Math.min(1, Math.max(0, a.elevation / 30))) * 2.6; u.turbidity.value = 4 + a.fogDensity * 2200; }
    (stars.current.material as THREE.PointsMaterial).opacity = a.stars; stars.current.visible = a.stars > 0.02; stars.current.rotation.y = sh.hour.current * 0.26;
    // güneş diski: tanrı ışınlarının kaynağı (parlaklığı = ışın gücü)
    disc.current.position.set(camera.position.x + a.sun[0] * 3000, camera.position.y + a.sun[1] * 3000, camera.position.z + a.sun[2] * 3000);
    disc.current.visible = a.elevation > -3; (disc.current.material as THREE.MeshBasicMaterial).color.setRGB(a.sunColor[0], a.sunColor[1], a.sunColor[2]).multiplyScalar(0.5 + a.godRays * 2.5);
    gl.toneMappingExposure = 1;
    // sürüklenen sis bulutları
    if (fogs.current) {
      S.t += dt * (8 + a.wind * 26); const dens = Math.min(1, a.fogDensity / 0.006);
      fog.seeds.forEach((f, i) => { const drift = ((S.t + f.ph * 6) % 700) - 350; tmp.p.set(Math.cos(f.a) * f.d + WIND_DIR[0] * drift, f.y + Math.sin(S.t * 0.01 + f.ph) * 6, Math.sin(f.a) * f.d + WIND_DIR[1] * drift); tmp.q.copy(camera.quaternion); const k = f.s * (0.7 + dens * 0.8) * (1 - Math.abs(drift) / 350 * 0.6); fogs.current.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s.set(k, k * 0.45, 1))); });
      fogs.current.instanceMatrix.needsUpdate = true; const mm = fogs.current.material as THREE.MeshBasicMaterial; mm.opacity = (0.08 + dens * 0.5) * (v === 'tumulus' ? 0.35 : 1); mm.color.setRGB(...a.fogColor).lerp(new THREE.Color(1, 1, 1), 0.35 * a.day);
    }
  });
  return (
    <>
      <Sky ref={sky as never} distance={450000} sunPosition={[0, 1, 0]} mieCoefficient={0.006} mieDirectionalG={0.85} />
      <points ref={stars} geometry={starGeo}><pointsMaterial color="#dfe8ff" size={tier === 'low' ? 2.2 : 1.7} sizeAttenuation={false} transparent depthWrite={false} fog={false} /></points>
      <mesh ref={disc}><sphereGeometry args={[70, 20, 14]} /><meshBasicMaterial color="#fff2cc" fog={false} toneMapped={false} transparent depthWrite={false} /></mesh>
      <hemisphereLight ref={hemi} args={['#fff', '#444', 0.6]} />
      <directionalLight ref={sun} castShadow={tier !== 'low'} shadow-mapSize={tier === 'high' ? [2048, 2048] : [1024, 1024]} shadow-bias={-0.0006} shadow-normalBias={0.05} />
      {volumetric && <instancedMesh ref={fogs} args={[undefined, undefined, fog.n]} frustumCulled={false}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={fog.tex} transparent depthWrite={false} fog={false} /></instancedMesh>}
      {volumetric && <Rays disc={disc} />}
    </>
  );
}
/** Tanrı ışınları: ekran uzayında güneş diskinden yayılan ışık (postprocessing GodRays). Yalnızca orta/yüksek kademede. */
function Rays({ disc }: { disc: React.MutableRefObject<THREE.Mesh> }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  if (!ready || !disc.current) return null;
  return (
    <EffectComposer multisampling={0}>
      <GodRays sun={disc.current} samples={40} density={0.94} decay={0.93} weight={0.5} exposure={0.34} clampMax={1} blur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette darkness={0.5} offset={0.3} />
    </EffectComposer>
  );
}

function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null), [i, setI] = useState(0);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Nemrut_Da%C4%9F%C4%B1').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  const f = FIGURES[i];
  return (
    <div className="fixed inset-0 bg-[#05070d] text-white">
      {img && <img src={img} alt="Nemrut Dağı" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <h2 className="mt-1 text-lg font-bold">{f.name}</h2><p className="mt-1 text-sm">{f.text}</p>
        <div className="mt-3 flex gap-2"><button onClick={() => nemrutAudio.speak(f.text)} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button><button onClick={() => setI((i + 1) % FIGURES.length)} className="h-10 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-black">Sonraki</button></div>
      </div>
    </div>
  );
}
