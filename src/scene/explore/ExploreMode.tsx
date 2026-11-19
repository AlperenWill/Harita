import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { useStore } from '../../state/store';
import { ELEVATION } from '../../data/regions';
import { elevationToHeight, toWorld } from '../../geo/projection';
import { SiteModel, modelKindFor } from './models';
import { ambient, presetFor } from '../../audio/ambient';

/**
 * 3D keşif modu — ayrı bir chunk olarak yalnızca ilk miras noktası açıldığında indirilir.
 * Harita sahnesinden çıkılmaz: model, ilin üst yüzeyine yerleştirilir ve kamera etrafında döner.
 */
export default function ExploreMode() {
  const site = useStore((s) => s.site);
  const muted = useStore((s) => s.muted);

  useEffect(() => {
    if (!site || muted) {
      ambient.stop();
      return;
    }
    ambient.play(presetFor(site.period, site.category), site.category === 'kopru');
    return () => ambient.stop();
  }, [site, muted]);

  if (!site) return null;
  return <SiteStage key={site.id} />;
}

function SiteStage() {
  const site = useStore((s) => s.site)!;
  const kind = useMemo(() => modelKindFor(site), [site]);
  const [x, z] = toWorld(site.coord[0], site.coord[1]);
  const y = elevationToHeight(ELEVATION[site.province]);
  const root = useRef<THREE.Group>(null!);

  // Belirme animasyonu: model yerden yükselir
  useFrame((_, dt) => {
    const g = root.current;
    const k = 1 - Math.exp(-dt * 4);
    g.scale.setScalar(g.scale.x + (1 - g.scale.x) * k);
  });

  return (
    <group position={[x, y + 0.002, z]}>
      {/* Zemin: ilin yüzeyinde sıcak taş bir platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[0.85, 48]} />
        <meshStandardMaterial color="#efe3cf" roughness={1} transparent opacity={0.55} />
      </mesh>
      <group ref={root} scale={0.01}>
        <SiteModel site={site} kind={kind} />
      </group>
      <ContactShadows position={[0, 0.003, 0]} scale={2} blur={2.2} opacity={0.55} far={1} resolution={256} frames={1} />
      <pointLight position={[0.4, 0.9, 0.5]} intensity={1.4} distance={3} color="#ffd9a0" />
    </group>
  );
}


