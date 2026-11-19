import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import type { HeritageSite } from '../data/types';
import { ELEVATION } from '../data/regions';
import { elevationToHeight, toWorld } from '../geo/projection';
import { useStore } from '../state/store';
import { useRegionSites } from '../state/useRegionSites';
import { PALETTE } from './theme';
import { PLAYABLE_BY_ID } from '../data/playables';

interface Fan { a: number; n: number }

const stemGeo = new THREE.CylinderGeometry(0.015, 0.015, 1, 5);
const headGeo = new THREE.OctahedronGeometry(0.16, 0); // low-poly "mühür taşı"
const ringGeo = new THREE.RingGeometry(0.2, 0.25, 24);
const TMP = new THREE.Vector3();
const hitGeo = new THREE.SphereGeometry(0.42, 8, 6); // görünmez, dokunmatik için büyük isabet alanı

export function SiteMarkers() {
  const region = useStore((s) => s.region);
  const level = useStore((s) => s.level);
  const all = useRegionSites(region);
  // Haritada yalnızca oyunu olan noktalar (src/data/playables.ts)
  const sites = useMemo(() => all?.filter((s) => PLAYABLE_BY_ID.has(s.id)) ?? null, [all]);
  // Birbirine çok yakın noktalar (ör. İstanbul'un tarihi yarımadası) üst üste binmesin: küme merkezinin çevresine yelpaze gibi açılır
  const fans = useMemo(() => {
    const out = new Map<string, Fan>(); if (!sites) return out;
    const pts = sites.map((s) => ({ s, w: toWorld(s.coord[0], s.coord[1]) })), used = new Set<string>();
    for (const p of pts) {
      if (used.has(p.s.id)) continue;
      const group = pts.filter((q) => !used.has(q.s.id) && Math.hypot(q.w[0] - p.w[0], q.w[1] - p.w[1]) < 1.2);
      group.forEach((q) => used.add(q.s.id));
      const cx = group.reduce((a, q) => a + q.w[0], 0) / group.length, cz = group.reduce((a, q) => a + q.w[1], 0) / group.length;
      group.sort((a, b) => Math.atan2(a.w[1] - cz, a.w[0] - cx) - Math.atan2(b.w[1] - cz, b.w[0] - cx))
        .forEach((q, i) => out.set(q.s.id, { a: (i / group.length) * Math.PI * 2 - Math.PI / 2, n: group.length }));
    }
    return out;
  }, [sites]);
  if (!sites || level === 'country') return null;
  return (
    <group>
      {sites.map((s) => (
        <Marker key={s.id} site={s} fan={fans.get(s.id) ?? { a: 0, n: 1 }} />
      ))}
    </group>
  );
}

function Marker({ site, fan }: { site: HeritageSite; fan: Fan }) {
  const group = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Mesh>(null!);
  const level = useStore((s) => s.level);
  const province = useStore((s) => s.province);
  const activeSite = useStore((s) => s.site?.id);
  const discovered = useStore((s) => !!s.discovered[site.id]);
  const hovered = useStore((s) => s.hovered?.kind === 'site' && s.hovered.id === site.id);

  const [x, z] = useMemo(() => toWorld(site.coord[0], site.coord[1]), [site]);
  const play = PLAYABLE_BY_ID.get(site.id);
  const y = elevationToHeight(ELEVATION[site.province]);
  const color = PALETTE.marker;   // tüm oynanabilir noktalar tek renk (logo kırmızısı): "burada oyun var"
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
    // yelpaze: ekran-sabit yarıçap (yakınlaşınca noktalar gerçek yerlerine yaklaşır)
    if (fan.n > 1) { const R = (0.5 + 0.16 * fan.n) * screen * (level === 'site' ? 0 : 1); g.position.x += (x + Math.cos(fan.a) * R - g.position.x) * k; g.position.z += (z + Math.sin(fan.a) * R - g.position.z) * k; }
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
        <meshBasicMaterial color="#5b544c" transparent opacity={0.6} />
      </mesh>
      <mesh ref={head} geometry={headGeo} material={mat} position={[0, stemH, 0]} />
      {discovered && (
        <Billboard position={[0, stemH, 0]}>
          <mesh geometry={ringGeo}>
            <meshBasicMaterial color={PALETTE.saffron} side={THREE.DoubleSide} />
          </mesh>
        </Billboard>
      )}
      {level === 'province' && inProvince && play && (
        <Html position={[0, stemH + 0.42, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[5, 0]}>
          <div className={`map-label marker-label${hovered ? ' is-hover' : ''}`}>{fan.n > 3 && !hovered ? play.emoji : `${play.emoji} ${site.name}`}</div>
        </Html>
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
