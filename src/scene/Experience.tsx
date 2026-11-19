import { Suspense, lazy } from 'react';
import { useStore } from '../state/store';
import { CameraRig } from './CameraRig';
import { TurkeyMap } from './TurkeyMap';
import { SiteMarkers } from './SiteMarkers';
import { PALETTE } from './theme';

// Keşif modu (modeller, partiküller, ses, bilgi kartı) ilk ekran paketinde yer almaz.
const ExploreMode = lazy(() => import('./explore/ExploreMode'));

export function Experience() {
  const level = useStore((s) => s.level);
  return (
    <>
      <color attach="background" args={[PALETTE.bg]} />
      <fog attach="fog" args={[PALETTE.bg, 280, 520]} />
      <hemisphereLight args={['#ffffff', '#b9b2a6', 1.1]} />
      <directionalLight position={[-30, 60, 25]} intensity={1.5} color="#fffaf0" />
      <directionalLight position={[40, 20, -30]} intensity={0.4} color="#d6e8ee" />

      {/* Deniz: haritanın altındaki açık mavi düzlem (açık tema) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} onClick={(e) => e.delta < 6 && level === 'region' && useStore.getState().back()}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={PALETTE.sea} roughness={1} />
      </mesh>

      <TurkeyMap />
      <SiteMarkers />
      {level === 'site' && (
        <Suspense fallback={null}>
          <ExploreMode />
        </Suspense>
      )}
      <CameraRig />
    </>
  );
}
