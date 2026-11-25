/**
 * Sahne sisi. `<fog attach="fog">` bir grubun içindeyse sisi gruba bağlar, sahneye değil; sis hiç görünmez
 * (Karadeniz denetiminde 13 oyunda bulundu). Bu bileşen nerede olursa olsun sisi doğrudan sahneye koyar.
 */
import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

export function SceneFog({ args }: { args: [string, number, number] }) {
  const scene = useThree((s) => s.scene);
  const [c, near, far] = args;
  useEffect(() => { const f = new THREE.Fog(c, near, far); scene.fog = f; return () => { if (scene.fog === f) scene.fog = null; }; }, [scene, c, near, far]);
  return null;
}
