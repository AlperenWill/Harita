import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { isCoarse, prefersReducedMotion } from '../theme';

/** Yapı çevresinde süzülen toz zerrecikleri (tek draw call, GPU'da Points). */
export function Dust({ color = '#ffe9c4' }: { color?: string }) {
  const ref = useRef<THREE.Points>(null!);
  const count = isCoarse() ? 140 : 360;
  const { geo, speeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 0.15 + Math.random() * 1.1;
      const t = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(t) * r;
      pos[i * 3 + 1] = Math.random() * 1.2;
      pos[i * 3 + 2] = Math.sin(t) * r;
      speeds[i] = 0.02 + Math.random() * 0.05;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { geo, speeds };
  }, [count]);
  const still = prefersReducedMotion();

  useFrame((st, dt) => {
    if (still) return;
    const a = geo.attributes.position as THREE.BufferAttribute;
    const t = st.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      let y = a.getY(i) + speeds[i] * dt;
      if (y > 1.2) y = 0;
      a.setY(i, y);
      a.setX(i, a.getX(i) + Math.sin(t * 0.5 + i) * 0.0008);
    }
    a.needsUpdate = true;
    ref.current.rotation.y += dt * 0.03;
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color={color} size={0.018} sizeAttenuation transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

let _grad: THREE.CanvasTexture | null = null;
function verticalFade() {
  if (_grad) return _grad;
  const cv = document.createElement('canvas');
  cv.width = 2;
  cv.height = 64;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 64);
  _grad = new THREE.CanvasTexture(cv);
  return _grad;
}

/** Yukarıdan süzülen ışık huzmeleri: açık uçlu koniler + dikey alfa geçişi, toplamalı karışım. */
export function LightShafts({ color = '#ffdca8' }: { color?: string }) {
  const ref = useRef<THREE.Group>(null!);
  const tex = verticalFade();
  useFrame((st) => {
    ref.current.children.forEach((c, i) => {
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = 0.07 + Math.sin(st.clock.elapsedTime * 0.4 + i * 2) * 0.03;
    });
  });
  return (
    <group ref={ref}>
      {[
        [0.25, 0.1, 0.18],
        [-0.3, -0.15, 0.12],
        [0.05, 0.3, 0.1],
      ].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 1.0, z]} rotation={[0.12 * (i - 1), 0, 0.18]}>
          <cylinderGeometry args={[r * 0.4, r, 2, 12, 1, true]} />
          <meshBasicMaterial color={color} alphaMap={tex} transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}
