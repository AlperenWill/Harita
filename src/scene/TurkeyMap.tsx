import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { geoCentroid } from 'd3-geo';
import type { MultiPolygon, Polygon } from 'geojson';
import { REGIONS, REGION_OF_PROVINCE, ELEVATION, REGION_BY_ID, displayProvince } from '../data/regions';
import type { RegionId } from '../data/types';
import { loadTopology, provinceFeatures, regionGeometry, type ProvinceTopology } from '../geo/topology';
import { geometryToShapes, shapeOutline } from '../geo/shapes';
import { elevationToHeight, toWorld } from '../geo/projection';
import { useStore } from '../state/store';
import { PALETTE, provinceTint, shade } from './theme';
import { loadRegionSites } from '../data/heritage';

/** Genel görünümde bölgelerin sade, eşit yüksekliği */
const REGION_HEIGHT = 0.9;
const ROT: [number, number, number] = [-Math.PI / 2, 0, 0];

function useTopologies() {
  const [low, setLow] = useState<ProvinceTopology | null>(null);
  const [high, setHigh] = useState<ProvinceTopology | null>(null);
  const region = useStore((s) => s.region);

  useEffect(() => {
    loadTopology('low').then(setLow);
    // Yüksek çözünürlük: boşta kalınca önden indir (ilk etkileşimi geciktirmeden)
    const idle = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500));
    idle(() => loadTopology('high').then(setHigh));
  }, []);
  useEffect(() => {
    if (region && !high) loadTopology('high').then(setHigh);
  }, [region, high]);
  return { low, high };
}

export function TurkeyMap() {
  const { low, high } = useTopologies();
  const region = useStore((s) => s.region);

  const regionShapes = useMemo(() => {
    if (!low) return null;
    return REGIONS.map((r) => {
      const geom = regionGeometry(low, r.id);
      const [cx, cz] = toWorld(...(geoCentroid(geom) as [number, number]));
      return { def: r, shapes: geometryToShapes(geom), center: [cx, cz] as [number, number] };
    });
  }, [low]);

  // Aktif bölgenin illeri: yüksek LOD hazırsa o, değilse düşük LOD (anında geri bildirim)
  const provinceData = useMemo(() => {
    const topo = high ?? low;
    if (!topo || !region) return null;
    const names = new Set(REGION_BY_ID[region].provinces);
    return provinceFeatures(topo)
      .filter((f) => names.has(f.properties.name))
      .map((f, i) => {
        const [cx, cz] = toWorld(...(geoCentroid(f) as [number, number]));
        return {
          name: f.properties.name,
          geom: f.geometry as Polygon | MultiPolygon,
          shapes: geometryToShapes(f.geometry),
          center: [cx, cz] as [number, number],
          index: i,
        };
      });
  }, [high, low, region]);

  if (!regionShapes) return null;

  return (
    <group>
      {regionShapes.map(({ def, shapes, center }) =>
        def.id === region ? null : (
          <RegionMesh key={def.id} id={def.id} color={def.color} name={def.name} shapes={shapes} center={center} />
        ),
      )}
      {provinceData?.map((p) => (
        <ProvinceMesh
          key={`${region}-${p.name}-${high ? 'h' : 'l'}`}
          name={p.name}
          shapes={p.shapes}
          center={p.center}
          color={provinceTint(REGION_BY_ID[region!].color, p.index)}
        />
      ))}
    </group>
  );
}

function useExtrude(shapes: THREE.Shape[], depth: number) {
  return useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shapes, {
      depth,
      bevelEnabled: false,
      curveSegments: 1,
    });
    g.computeVertexNormals();
    return g;
  }, [shapes, depth]);
}

function RegionMesh({
  id, color, name, shapes, center,
}: { id: RegionId; color: string; name: string; shapes: THREE.Shape[]; center: [number, number] }) {
  const ref = useRef<THREE.Mesh>(null!);
  const level = useStore((s) => s.level);
  const activeRegion = useStore((s) => s.region);
  const hovered = useStore((s) => s.hovered?.kind === 'region' && s.hovered.id === id);
  const geo = useExtrude(shapes, REGION_HEIGHT);

  const top = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 }), [color]);
  const side = useMemo(
    () => new THREE.MeshStandardMaterial({ color: shade(color, PALETTE.sideDark), roughness: 1 }),
    [color],
  );
  const outline = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(shapeOutline(shapes, REGION_HEIGHT + 0.004), 3));
    return g;
  }, [shapes]);

  const dimmed = level !== 'country' && activeRegion !== id;
  const { base, muted, hot } = useMemo(() => {
    const b = new THREE.Color(color);
    return { base: b, muted: b.clone().lerp(new THREE.Color('#5a524a'), 0.55), hot: b.clone().offsetHSL(0, 0.04, 0.06) };
  }, [color]);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    const targetY = hovered && !dimmed ? 0.25 : 0;
    ref.current.position.y += (targetY - ref.current.position.y) * k;
    const targetScale = dimmed ? 0.45 : 1;
    ref.current.scale.z += (targetScale - ref.current.scale.z) * k;
    const targetColor = dimmed ? muted : hovered ? hot : base;
    top.color.lerp(targetColor, k);
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    useStore.getState().setHovered({ kind: 'region', id, label: dimmed ? `${name} — geç` : name });
    loadRegionSites(id); // üzerine gelinen bölgenin verisini önden indir
    document.body.style.cursor = 'pointer';
  };
  const onOut = () => {
    const h = useStore.getState().hovered;
    if (h?.kind === 'region' && h.id === id) useStore.getState().setHovered(null);
    document.body.style.cursor = '';
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return; // sürükleme sonrası tıklama sayılmaz
    useStore.getState().selectRegion(id);
  };

  return (
    <group>
      <mesh
        ref={ref}
        geometry={geo}
        material={[top, side]}
        rotation={ROT}
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
      >
        <lineSegments geometry={outline}>
          <lineBasicMaterial color="#fff6e8" transparent opacity={0.35} />
        </lineSegments>
      </mesh>
      {level === 'country' && (
        <Html position={[center[0], REGION_HEIGHT + 0.6, center[1]]} center style={{ pointerEvents: 'none' }}>
          <div className={`map-label region-label${hovered ? ' is-hover' : ''}`}>{name}</div>
        </Html>
      )}
    </group>
  );
}

function ProvinceMesh({
  name, shapes, center, color,
}: { name: string; shapes: THREE.Shape[]; center: [number, number]; color: THREE.Color }) {
  const ref = useRef<THREE.Mesh>(null!);
  const height = elevationToHeight(ELEVATION[name]);
  const geo = useExtrude(shapes, height);
  const level = useStore((s) => s.level);
  const selected = useStore((s) => s.province === name);
  const anySelected = useStore((s) => s.province !== null);
  const hovered = useStore((s) => s.hovered?.kind === 'province' && s.hovered.id === name);

  const top = useMemo(() => new THREE.MeshStandardMaterial({ color: color.clone(), roughness: 0.9 }), [color]);
  const side = useMemo(
    () => new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(PALETTE.sideDark), roughness: 1 }),
    [color],
  );
  const outline = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(shapeOutline(shapes, height + 0.004), 3));
    return g;
  }, [shapes, height]);
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#fff6e8', transparent: true, opacity: 0.6 }), []);

  // Bölgeye girildiğinde iller bölge yüksekliğinden gerçek rakımlarına "yükselir"
  const startScale = REGION_HEIGHT / height;
  const pulse = useRef(0);
  const tones = useMemo(
    () => ({ faded: color.clone().lerp(new THREE.Color('#6b625a'), 0.4), hot: color.clone().offsetHSL(0, 0.05, 0.07) }),
    [color],
  );

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 6);
    const m = ref.current;
    if (m.userData.init !== true) {
      m.scale.z = startScale;
      m.userData.init = true;
    }
    m.scale.z += (1 - m.scale.z) * k;
    const lift = hovered && level === 'region' ? 0.18 : 0;
    m.position.y += (lift - m.position.y) * k;
    pulse.current = Math.max(0, pulse.current - dt * 1.8);
    const faded = level !== 'region' && anySelected && !selected;
    const target = faded ? tones.faded : hovered ? tones.hot : color;
    top.color.lerp(target, k);
    top.emissive.setRGB(pulse.current * 0.25, pulse.current * 0.2, pulse.current * 0.12);
    lineMat.color.set(selected ? PALETTE.cini : '#fff6e8');
    lineMat.opacity = selected ? 1 : faded ? 0.25 : 0.6;
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    useStore.getState().setHovered({ kind: 'province', id: name, label: displayProvince(name) });
    document.body.style.cursor = 'pointer';
  };
  const onOut = () => {
    const h = useStore.getState().hovered;
    if (h?.kind === 'province' && h.id === name) useStore.getState().setHovered(null);
    document.body.style.cursor = '';
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    if (useStore.getState().level === 'site') return;
    pulse.current = 1; // tıklama geri bildirimi: kısa sıcak parlama
    useStore.getState().selectProvince(name);
  };

  const showLabel = level === 'region' || (level === 'province' && selected);
  return (
    <group>
      <mesh
        ref={ref}
        geometry={geo}
        material={[top, side]}
        rotation={ROT}
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
      >
        <lineSegments geometry={outline} material={lineMat} />
      </mesh>
      {showLabel && (
        <Html position={[center[0], height + 0.35, center[1]]} center style={{ pointerEvents: 'none' }}>
          <div className={`map-label province-label${hovered ? ' is-hover' : ''}${selected ? ' is-active' : ''}`}>
            {displayProvince(name)}
          </div>
        </Html>
      )}
    </group>
  );
}

export { REGION_HEIGHT };
export const provinceTop = (name: string) => elevationToHeight(ELEVATION[name]);
export const regionOf = (p: string) => REGION_OF_PROVINCE[p];
