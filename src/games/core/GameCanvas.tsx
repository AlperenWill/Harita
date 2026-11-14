import type { ReactNode } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import type { DeviceProfile } from './device';

/** Ortak R3F kurulumu: cihaz profiline göre gölge, DPR ve kenar yumuşatma. Kamera ve sahne oyunun kendisindedir. */
export function GameCanvas({ device, children, camera }: { device: DeviceProfile; children: ReactNode; camera?: CanvasProps['camera'] }) {
  return (
    <Canvas shadows={device.shadows} dpr={device.dpr} gl={{ antialias: device.antialias, powerPreference: 'high-performance' }} camera={camera} className="touch-none">
      {children}
    </Canvas>
  );
}
