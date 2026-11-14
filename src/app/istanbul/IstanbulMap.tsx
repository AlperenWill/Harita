import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { feature } from 'topojson-client';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { geoCentroid } from 'd3-geo';
import { GAMES } from '../../games/core/registry';
import type { GameDefinition } from '../../games/core/types';
import { useProgress } from '../../games/core/progress';
import { profileFor, type Tier } from '../../games/core/device';
import { outline, shapesOf, sideOf, toWorld } from './geo';
import { SiteIcon } from './SiteIcon';

type IstanbulSite = GameDefinition;
const SITES = GAMES;

type F = Feature<Polygon | MultiPolygon, { name: string }>;
// Ortak palet: Anadolu haritasıyla aynı pastel ve sıcak tonlar; vurgu Miras kırmızısı
const COL = { avrupa: '#e2cc9c', anadolu: '#a3b49a', fatih: '#ddae94', sea: '#cfdfe3', bg: '#e9eef0' };
const H = 0.45;
// yapıların ağırlık merkezi: yarımada yakınlaşmasının hedefi
const YARIMADA = (() => { const [x, z] = toWorld(28.976, 41.0104); return new THREE.Vector3(x, 0, z); })();

/* ---------------- İlçeler ---------------- */
function District({ f, hovered, setHovered }: { f: F; hovered: string | null; setHovered: (n: string | null) => void }) {
  const name = f.properties.name, fatih = name === 'Fatih';
  const shapes = useMemo(() => shapesOf(f.geometry), [f]);
  const geo = useMemo(() => new THREE.ExtrudeGeometry(shapes, { depth: fatih ? H * 1.25 : H, bevelEnabled: false }), [shapes, fatih]);
  const lines = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(outline(shapes, (fatih ? H * 1.25 : H) + 0.003), 3)); return g; }, [shapes, fatih]);
  const base = fatih ? COL.fatih : COL[sideOf(name)];
  const mat = useMemo(() => [new THREE.MeshStandardMaterial({ color: base, roughness: 0.95 }), new THREE.MeshStandardMaterial({ color: new THREE.Color(base).multiplyScalar(0.7), roughness: 1 })], [base]);
  const ref = useRef<THREE.Mesh>(null!);
  const hot = useMemo(() => new THREE.Color(base).offsetHSL(0, 0.05, 0.07), [base]);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 10), on = hovered === name;
    ref.current.position.y += ((on ? 0.12 : 0) - ref.current.position.y) * k;
    (mat[0] as THREE.MeshStandardMaterial).color.lerp(on ? hot : new THREE.Color(base), k);
  });
  useEffect(() => () => { geo.dispose(); lines.dispose(); mat.forEach((m) => m.dispose()); }, [geo, lines, mat]);
  return (
    <mesh ref={ref} geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(name); }}
      onPointerOut={() => setHovered(null)}>
      <lineSegments geometry={lines}><lineBasicMaterial color="#fffaf0" transparent opacity={0.7} /></lineSegments>
    </mesh>
  );
}

function Markers({ onPick, near }: { onPick: (s: IstanbulSite) => void; near: boolean }) {
  const visited = useProgress((s) => s.visited);
  const [hover, setHover] = useState<string | null>(null);
  if (!near) return (
    <Html position={[YARIMADA.x, 2.2, YARIMADA.z]} center zIndexRange={[20, 0]}>
      <button onClick={() => onPick(SITES[0])} data-cluster
        className="flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-3 py-2 text-sm font-semibold text-ink shadow-lg ring-2 ring-brand hover:bg-brand-50">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-white"><SiteIcon kind="cami" size={14} /></span>
        Tarihi Yarımada · {SITES.length} UNESCO noktası
      </button>
    </Html>
  );
  return (
    <>
      {SITES.map((s) => {
        const [x, z] = toWorld(s.coordinates[0], s.coordinates[1]), seen = !!visited[s.id];
        return (
          <Html key={s.id} position={[x, H * 1.25 + 0.05, z]} center zIndexRange={[20, 0]}>
            <div className="relative" onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}>
              {/* 44×44 dokunma alanı */}
              <button onClick={() => onPick(s)} aria-label={s.name} onFocus={() => setHover(s.id)} onBlur={() => setHover(null)}
                className="grid h-11 w-11 place-items-center">
                <span className={`relative grid h-9 w-9 place-items-center rounded-full border-2 border-white shadow-lg transition hover:scale-110 ${s.status === 'playable' ? 'bg-brand text-white' : 'bg-white text-brand'}`}>
                  <SiteIcon kind={s.kind} />
                  {seen && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white ring-2 ring-white" aria-label="Ziyaret edildi">✓</span>}
                </span>
              </button>
              {hover === s.id && (
                <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 w-56 -translate-x-1/2 rounded-xl bg-white p-3 text-left shadow-xl ring-1 ring-line">
                  <p className="text-sm font-bold text-ink">{s.name}</p>
                  <p className="mt-0.5 line-clamp-3 text-xs text-ink-muted">{s.summary}</p>
                  <p className="mt-1.5 text-[11px] font-semibold text-brand">{s.status === 'playable' ? `Oyun: ${s.transformation.mechanic}` : 'Araştırma dosyası'}</p>
                </div>
              )}
            </div>
          </Html>
        );
      })}
    </>
  );
}

/* ---------------- Kamera: yalnızca hazır görünümler ----------------
 * Harita bir giriş kapısıdır, keşif alanı değil: kullanıcı kamerayı döndüremez/yakınlaştıramaz.
 * Üç önayar var (tüm İstanbul, Tarihi Yarımada, yapıya alçalış); geçişler yumuşak ve kesintisizdir. */
export interface MapCamApi { flyTo: (s: IstanbulSite) => Promise<void>; toPeninsula: () => void; overview: () => void }
function Cam({ apiRef, setNear, startNear }: { apiRef: React.MutableRefObject<MapCamApi | null>; setNear: (b: boolean) => void; startNear: boolean }) {
  const { camera } = useThree();
  const portrait = useThree((s) => s.size.height > s.size.width);
  const want = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
  const look = useRef(new THREE.Vector3());
  const arrive = useRef<(() => void) | null>(null);
  useEffect(() => {
    const k = portrait ? 1.6 : 1;
    const set = (p: [number, number, number], l: [number, number, number]) => { want.current.pos.set(...p); want.current.look.set(...l); };
    const overview = () => set([4, 70 * k, 52 * k], [4, 0, 0]);
    const toPeninsula = () => set([YARIMADA.x + 0.6, 2.4 * k, YARIMADA.z + 2.2 * k], [YARIMADA.x, H, YARIMADA.z]);
    apiRef.current = {
      overview, toPeninsula,
      flyTo: (s) => new Promise<void>((res) => {
        const [x, z] = toWorld(s.coordinates[0], s.coordinates[1]);
        set([x + 0.25, 0.9, z + 0.7], [x, H, z]); arrive.current = res;
        setTimeout(() => { arrive.current?.(); arrive.current = null; }, 1600);
      }),
    };
    if (startNear) toPeninsula(); else overview();
    camera.position.copy(want.current.pos); look.current.copy(want.current.look); camera.lookAt(look.current);
  }, [apiRef, portrait, startNear, camera]);
  const last = useRef<boolean | null>(null);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 3);
    camera.position.lerp(want.current.pos, k); look.current.lerp(want.current.look, k); camera.lookAt(look.current);
    if (arrive.current && camera.position.distanceTo(want.current.pos) < 0.05) { arrive.current(); arrive.current = null; }
    const near = want.current.pos.distanceTo(YARIMADA) < 14;
    if (near !== last.current) { last.current = near; setNear(near); }
  });
  return null;
}

/* ---------------- Sahne ---------------- */
export default function IstanbulMapScene({ tier, apiRef, onPick, startNear }: { tier: Tier; apiRef: React.MutableRefObject<MapCamApi | null>; onPick: (s: IstanbulSite) => void; startNear: boolean }) {
  const [features, setFeatures] = useState<F[] | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [near, setNear] = useState(startNear);
  const t = useMemo(() => profileFor(tier, false), [tier]);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/istanbul.topo.json`).then((r) => r.json())
      .then((topo) => setFeatures((feature(topo, topo.objects.districts) as unknown as { features: F[] }).features));
  }, []);
  const labels = useMemo(() => features?.map((f) => { const [x, z] = toWorld(...(geoCentroid(f) as [number, number])); return { name: f.properties.name, x, z }; }) ?? [], [features]);

  return (
    <Canvas shadows={t.shadows} dpr={t.dpr} gl={{ antialias: t.antialias }} camera={{ fov: 38, near: 0.1, far: 600, position: [4, 70, 52] }}>
      <color attach="background" args={[COL.bg]} />
      {t.fog && <fog attach="fog" args={[COL.bg, 90, 220]} />}
      <hemisphereLight args={['#fff6e6', '#9c8a66', 0.9]} />
      <directionalLight position={[-30, 60, 25]} intensity={1.6} castShadow={t.shadows} shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={60} shadow-camera-bottom={-60} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} /><meshStandardMaterial color={COL.sea} roughness={0.7} />
      </mesh>
      {features?.map((f) => <District key={f.properties.name} f={f} hovered={hovered} setHovered={setHovered} />)}
      {near && labels.map((l) => (
        <Html key={l.name} position={[l.x, H + 0.3, l.z]} center style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
          <span className={`whitespace-nowrap text-[11px] font-semibold ${hovered === l.name ? 'text-brand' : 'text-ink/60'}`}>{l.name}</span>
        </Html>
      ))}
      {!near && hovered && (() => { const l = labels.find((x) => x.name === hovered); return l && (
        <Html position={[l.x, H + 1, l.z]} center style={{ pointerEvents: 'none' }}><span className="whitespace-nowrap rounded-lg bg-white px-2 py-1 text-xs font-semibold shadow">{l.name}</span></Html>); })()}
      <Markers onPick={(s) => (near ? onPick(s) : apiRef.current?.toPeninsula())} near={near} />
      <Cam apiRef={apiRef} setNear={setNear} startNear={startNear} />
    </Canvas>
  );
}
