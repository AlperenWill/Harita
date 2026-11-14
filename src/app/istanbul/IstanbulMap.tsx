import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { CameraControls, Html } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import { feature } from 'topojson-client';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { geoCentroid } from 'd3-geo';
import { SITES } from './sites';
import type { IstanbulSite } from './types';
import { useJournal } from './store';
import { outline, shapesOf, sideOf, toWorld } from './geo';
import { TIER, type Tier } from './quality';

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

/* ---------------- İkonlar: cami = minare, saray = kubbe, müze = sütun ---------------- */
export function SiteIcon({ kind, size = 18 }: { kind: IstanbulSite['kind']; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as const;
  if (kind === 'cami') return <svg {...p}><path d="M11 2h2l.6 3H10.4zM10.5 6h3v2h-3zM10 9h4v1.5h-4zM10.5 11h3v11h-3z" /><path d="M3 22v-6a4 4 0 0 1 4-4 4 4 0 0 1 2.5.9V22zM21 22v-6a4 4 0 0 0-4-4 4 4 0 0 0-2.5.9V22z" opacity=".55" /></svg>;
  if (kind === 'saray') return <svg {...p}><path d="M12 3a7 7 0 0 1 7 7H5a7 7 0 0 1 7-7zM11.5 1h1v2.2h-1zM4 11h16v2H4zM5 13.5h2.5V20H5zM10.75 13.5h2.5V20h-2.5zM16.5 13.5H19V20h-2.5zM3 20.5h18V22H3z" /></svg>;
  return <svg {...p}><path d="M3 6l9-4 9 4v1.5H3zM4 8.5h16V10H4zM5.5 11H8v8H5.5zM10.75 11h2.5v8h-2.5zM16 11h2.5v8H16zM3 20h18v2H3z" /></svg>;
}

function Markers({ onPick, near }: { onPick: (s: IstanbulSite) => void; near: boolean }) {
  const visited = useJournal((s) => s.visited);
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
                  <p className="mt-1.5 text-[11px] font-semibold text-brand">{s.status === 'playable' ? '3D deneyim hazır' : 'Araştırma dosyası'}</p>
                </div>
              )}
            </div>
          </Html>
        );
      })}
    </>
  );
}

/* ---------------- Kamera ---------------- */
const ACTION = CameraControlsImpl.ACTION;
export interface MapCamApi { flyTo: (s: IstanbulSite) => Promise<void>; toPeninsula: () => void; overview: () => void }
function Cam({ apiRef, setNear, startNear }: { apiRef: React.MutableRefObject<MapCamApi | null>; setNear: (b: boolean) => void; startNear: boolean }) {
  const ref = useRef<CameraControlsImpl>(null!);
  const portrait = useThree((s) => s.size.height > s.size.width);
  useEffect(() => {
    const c = ref.current;
    c.touches.one = ACTION.TOUCH_ROTATE; c.touches.two = ACTION.TOUCH_DOLLY_TRUCK;
    c.mouseButtons.right = ACTION.TRUCK; c.dollyToCursor = true;
    c.minDistance = 1.2; c.maxDistance = 150; c.maxPolarAngle = 1.25; c.smoothTime = 0.5;
    c.setBoundary(new THREE.Box3(new THREE.Vector3(-60, 0, -40), new THREE.Vector3(60, 0, 40)));
    const k = portrait ? 1.6 : 1;
    const overview = () => void c.setLookAt(4, 70 * k, 52 * k, 4, 0, 0, true);
    const toPeninsula = () => void c.setLookAt(YARIMADA.x + 0.6, 2.4 * k, YARIMADA.z + 2.2 * k, YARIMADA.x, H, YARIMADA.z, true);
    apiRef.current = {
      overview, toPeninsula,
      // Sinematik yaklaşma: önce yarımadaya, sonra yapının hemen üstüne alçalarak
      flyTo: async (s) => {
        const [x, z] = toWorld(s.coordinates[0], s.coordinates[1]);
        c.smoothTime = 0.7; await c.setLookAt(x + 0.25, 0.9, z + 0.7, x, H, z, true); c.smoothTime = 0.5;
      },
    };
    if (startNear) { c.setLookAt(YARIMADA.x + 0.6, 2.4 * k, YARIMADA.z + 2.2 * k, YARIMADA.x, H, YARIMADA.z, false); } else c.setLookAt(4, 70 * k, 52 * k, 4, 0, 0, false);
  }, [apiRef, portrait, startNear]);
  const last = useRef<boolean | null>(null);
  useFrame(({ camera }) => {
    const near = camera.position.distanceTo(YARIMADA) < 14;
    if (near !== last.current) { last.current = near; setNear(near); }
  });
  return <CameraControls ref={ref} makeDefault />;
}

/* ---------------- Sahne ---------------- */
export default function IstanbulMapScene({ tier, apiRef, onPick, startNear }: { tier: Tier; apiRef: React.MutableRefObject<MapCamApi | null>; onPick: (s: IstanbulSite) => void; startNear: boolean }) {
  const [features, setFeatures] = useState<F[] | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [near, setNear] = useState(startNear);
  const t = TIER[tier];
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
