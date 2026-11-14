/**
 * Galata Kulesi — 2. bölüm: sarmal merdiven (görsel kısım; ritim mantığı StaircaseMechanic.ts).
 * Kamera: birinci şahıs, kilitli. Basamaklar çıkıldıkça kamera sarmal boyunca kendiliğinden ilerler;
 * oyuncu bakış yönünü değiştiremez. Pencere aralıklarından süzülen ışık, sis + toplamalı (additive) ışık
 * hacimleriyle verilir (gerçek hacimsel ışık hesaplaması yerine mobil dostu taklit).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { FLIGHTS, STEPS_PER_FLIGHT, TOTAL_STEPS } from './StaircaseMechanic';
import { INNER_R } from './dungeon';
import { scaledUV, useStoneMaterial } from './TowerExterior';

const RISE = 0.2, CORE_R = 0.95, WALK_R = 2.75, EYE = 1.6;
const STEP_ANGLE = (Math.PI * 2) / STEPS_PER_FLIGHT;
const TOP = (TOTAL_STEPS + 2) * RISE + 4;
export const stairPoint = (p: number) => {
  const a = p * STEP_ANGLE;
  return { a, x: Math.cos(a) * WALK_R, z: Math.sin(a) * WALK_R, y: p * RISE };
};

let fadeTex: THREE.CanvasTexture | null = null;
const shaftAlpha = () => {
  if (fadeTex) return fadeTex;
  const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d')!, gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
  return (fadeTex = new THREE.CanvasTexture(c));
};

export default function StaircaseScene({ steps, judge }: { steps: React.MutableRefObject<number>; judge: React.MutableRefObject<number> }) {
  const { camera, scene } = useThree();
  const wall = useStoneMaterial('#b3a792');
  const wallIn = useMemo(() => { const m = wall.clone(); m.side = THREE.BackSide; return m; }, [wall]);
  const stepMat = useStoneMaterial('#cbbfa8');
  const outer = useMemo(() => scaledUV(new THREE.CylinderGeometry(INNER_R, INNER_R, TOP, 40, 1, true), 9, TOP / 3), []);
  const core = useMemo(() => scaledUV(new THREE.CylinderGeometry(CORE_R, CORE_R, TOP, 20, 1, false), 2, TOP / 3), []);

  // basamaklar: tek InstancedMesh
  const stairs = useMemo(() => {
    const len = INNER_R - CORE_R - 0.05, geo = scaledUV(new THREE.BoxGeometry(len, RISE, 1.15), 1, 0.4);
    const n = TOTAL_STEPS + 1 + FLIGHTS;
    const m = new THREE.InstancedMesh(geo, stepMat, n);
    const q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
    let k = 0;
    for (let i = 0; i <= TOTAL_STEPS; i++) {
      const a = i * STEP_ANGLE, r = (CORE_R + INNER_R) / 2;
      q.setFromEuler(new THREE.Euler(0, -a, 0));
      m.setMatrixAt(k++, new THREE.Matrix4().compose(v.set(Math.cos(a) * r, i * RISE + RISE / 2 - 0.02, Math.sin(a) * r), q, s.set(1, 1, 1)));
      // sahanlık: biraz daha geniş bir basamak
      if (i > 0 && i % STEPS_PER_FLIGHT === 0) m.setMatrixAt(k++, new THREE.Matrix4().compose(v.set(Math.cos(a) * r, i * RISE + RISE / 2 - 0.03, Math.sin(a) * r), q, s.set(1, 1, 2.4)));
    }
    m.count = k; m.instanceMatrix.needsUpdate = true; return m;
  }, [stepMat]);

  // pencere aralıkları ve süzülen ışık hacimleri
  const slits = useMemo(() => {
    const out: { pos: THREE.Vector3; a: number; y: number }[] = [];
    for (let f = 0; f <= FLIGHTS; f++) for (const da of [0, 2.1, 4.2]) {
      const a = da + 0.15, y = f * STEPS_PER_FLIGHT * RISE + (da / (Math.PI * 2)) * STEPS_PER_FLIGHT * RISE + 2.2;
      out.push({ pos: new THREE.Vector3(Math.cos(a) * (INNER_R - 0.02), y, Math.sin(a) * (INNER_R - 0.02)), a, y });
    }
    return out;
  }, []);
  const shaftMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe6b8', alphaMap: shaftAlpha(), transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), []);

  useEffect(() => {
    scene.background = new THREE.Color('#1b1611'); scene.fog = new THREE.FogExp2('#4a3d2e', 0.085);
    (camera as THREE.PerspectiveCamera).fov = 70; (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    return () => { scene.fog = null; };
  }, [camera, scene]);

  const p = useRef(steps.current), bob = useRef(0), lastSteps = useRef(steps.current);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05);
    if (steps.current !== lastSteps.current) { bob.current = judge.current; lastSteps.current = steps.current; }
    p.current += (steps.current - p.current) * (1 - Math.exp(-dt * 7));
    bob.current *= Math.exp(-dt * 8);
    const pt = stairPoint(p.current);
    const breathe = Math.sin(clock.elapsedTime * 1.3) * 0.015;
    camera.position.set(pt.x, pt.y + EYE + RISE - bob.current * 0.06 + breathe, pt.z);
    // ileri (sarmal yönünde), hafif yukarı ve içe doğru bakış — oyuncu değiştiremez
    look.set(pt.x - Math.sin(pt.a) * 2.2 - Math.cos(pt.a) * 0.35, camera.position.y + 0.55, pt.z + Math.cos(pt.a) * 2.2 - Math.sin(pt.a) * 0.35);
    camera.lookAt(look);
  });

  return (
    <group>
      <ambientLight intensity={0.22} color="#d8c7ab" />
      <hemisphereLight args={['#ffe8c2', '#2a2118', 0.35]} />
      <mesh geometry={outer} material={wallIn} position={[0, TOP / 2 - 1, 0]} />
      <mesh geometry={core} material={wall} position={[0, TOP / 2 - 1, 0]} />
      <primitive object={stairs} />
      {slits.map((s, i) => (
        <group key={i}>
          <mesh position={s.pos} rotation={[0, -s.a - Math.PI / 2, 0]}><planeGeometry args={[0.35, 1.3]} /><meshBasicMaterial color="#fff1d6" toneMapped={false} /></mesh>
          {/* süzülen ışık: pencereden içeri ve aşağı doğru genişleyen hacim */}
          <mesh material={shaftMat} position={[Math.cos(s.a) * (INNER_R - 1.6), s.y - 0.9, Math.sin(s.a) * (INNER_R - 1.6)]}
            rotation={[0, -s.a, -(Math.PI / 2 - 0.55)]}>
            <cylinderGeometry args={[0.2, 0.75, 3.4, 10, 1, true]} />
          </mesh>
          <pointLight position={[Math.cos(s.a) * (INNER_R - 0.8), s.y, Math.sin(s.a) * (INNER_R - 0.8)]} intensity={5} distance={6} decay={2} color="#ffdcae" />
        </group>
      ))}
    </group>
  );
}
