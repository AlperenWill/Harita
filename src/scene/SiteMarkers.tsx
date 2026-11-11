import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import type { HeritageSite } from '../data/types';
import { ELEVATION, PERIOD_BY_ID } from '../data/regions';
import { elevationToHeight, toWorld } from '../geo/projection';
import { useStore } from '../state/store';
import { useRegionSites } from '../state/useRegionSites';
import { PALETTE } from './theme';

const stemGeo = new THREE.CylinderGeometry(0.015, 0.015, 1, 5);
const headGeo = new THREE.OctahedronGeometry(0.16, 0); // low-poly "mühür taşı"
const ringGeo = new THREE.RingGeometry(0.2, 0.25, 24);
const TMP = new THREE.Vector3();
const hitGeo = new THREE.SphereGeometry(0.42, 8, 6); // görünmez, dokunmatik için büyük isabet alanı

export function SiteMarkers() {
  const region = useStore((s) => s.region);
  const level = useStore((s) => s.level);
  const sites = useRegionSites(region);
  if (!sites || level === 'country') return null;
  return (
    <group>
      {sites.map((s) => (
        <Marker key={s.id} site={s} />
      ))}
    </group>
  );
}

function Marker({ site }: { site: HeritageSite }) {
  const group = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Mesh>(null!);
  const level = useStore((s) => s.level);
  const province = useStore((s) => s.province);
  const activeSite = useStore((s) => s.site?.id);
  const discovered = useStore((s) => !!s.discovered[site.id]);
  const hovered = useStore((s) => s.hovered?.kind === 'site' && s.hovered.id === site.id);

  const [x, z] = useMemo(() => toWorld(site.coord[0], site.coord[1]), [site]);
  const y = elevationToHeight(ELEVATION[site.province]);
  const color = PERIOD_BY_ID[site.period].color;
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.15, emissive: color, emissiveIntensity: 0.35, flatShading: true }),
    [color],
  );

  // Bağlama duyarlı görünürlük: bölgede tüm noktalar küçük; ilde o ilinkiler büyük, diğerleri sönük;
  // keşif modunda yalnızca aktif nokta (o da modelin yerini alacağı için gizlenir).
  const inProvince = province === site.province;
  const visible = level !== 'site';
  const scale = level === 'region' ? 1 : inProvince ? 1.25 : 0.55;
  const stemH = level === 'region' ? 0.9 : inProvince ? 1.1 : 0.5;

  useFrame((st, dt) => {
    const g = group.current;
    const k = 1 - Math.exp(-dt * 10);
    // Ekran-sabit boyut: işaretçi kamera uzaklığıyla ölçeklenir, her zoom seviyesinde okunur kalır
    const dist = st.camera.position.distanceTo(g.position);
    const screen = THREE.MathUtils.clamp(dist * 0.045, 0.6, 3.2);
    const s = (visible ? scale * screen : 0.001) * (hovered ? 1.35 : 1);
    g.scale.lerp(TMP.set(s, s, s), k);
    head.current.rotation.y += dt * (hovered ? 2.2 : 0.6);
    head.current.position.y = stemH + Math.sin(st.clock.elapsedTime * 1.6 + x) * 0.04;
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    useStore.getState().setHovered({ kind: 'site', id: site.id, label: site.name });
    document.body.style.cursor = 'pointer';
  };
  const onOut = () => {
    const h = useStore.getState().hovered;
    if (h?.kind === 'site' && h.id === site.id) useStore.getState().setHovered(null);
    document.body.style.cursor = '';
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6 || !visible) return;
    import('./explore/ExploreMode'); // keşif modu chunk'ını hemen ısıt
    useStore.getState().selectSite(site);
  };

  return (
    <group ref={group} position={[x, y, z]} visible={activeSite !== site.id}>
      <mesh geometry={stemGeo} position={[0, stemH / 2, 0]} scale={[1, stemH, 1]}>
        <meshBasicMaterial color="#fff6e8" transparent opacity={0.55} />
      </mesh>
      <mesh ref={head} geometry={headGeo} material={mat} position={[0, stemH, 0]} />
      {discovered && (
        <Billboard position={[0, stemH, 0]}>
          <mesh geometry={ringGeo}>
            <meshBasicMaterial color={PALETTE.saffron} side={THREE.DoubleSide} />
          </mesh>
        </Billboard>
      )}
      <mesh
        geometry={hitGeo}
        position={[0, stemH, 0]}
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
      >
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}
