/**
 * Galata Kulesi — 2. bölüm: sarmal merdiven (görsel kısım; mantık StaircaseMechanic.ts, kamera Player.tsx).
 * Oyuncu basamakları kendisi yürür, bakış serbesttir. Her sahanlıkta dışarı bakan bir pencere vardır: içeri
 * gün ışığı süzülür (sis + toplamalı ışık hacmi; gerçek hacimsel ışık yerine mobil dostu taklit).
 * En tepede sergi katına açılan aydınlık bir kapı bulunur.
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { CORE_R, RISE, STEPS_PER_TURN, STEP_ANGLE, TOP_THETA, TOP_Y, TOTAL_STEPS, WALL_R, WINDOWS, floorAt, windowY } from './StaircaseMechanic';
import { scaledUV, useStoneMaterial } from './TowerExterior';

const H = TOP_Y + 5;

let fadeTex: THREE.CanvasTexture | null = null;
const shaftAlpha = () => {
  if (fadeTex) return fadeTex;
  const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d')!, gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
  return (fadeTex = new THREE.CanvasTexture(c));
};
/** Pencereden görünen gökyüzü ve şehir (düz resim) */
let viewTex: THREE.CanvasTexture | null = null;
const windowView = () => {
  if (viewTex) return viewTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#9cc6e6'); gr.addColorStop(0.65, '#f3dcc0'); gr.addColorStop(1, '#c9a27e'); g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(${150 + i * 4},${120 + i * 3},${100 + i * 2},.9)`; g.fillRect(i * 5, 92 - (i % 4) * 6, 6, 40); }
  g.fillStyle = '#5d87a0'; g.fillRect(0, 108, 64, 20);
  return (viewTex = new THREE.CanvasTexture(c));
};

export default function StaircaseScene() {
  const { camera, scene } = useThree();
  const wall = useStoneMaterial('#b3a792');
  const wallIn = useMemo(() => { const m = wall.clone(); m.side = THREE.BackSide; return m; }, [wall]);
  const stepMat = useStoneMaterial('#cbbfa8');
  const outer = useMemo(() => scaledUV(new THREE.CylinderGeometry(WALL_R, WALL_R, H, 48, 1, true), 9, H / 3), []);
  const core = useMemo(() => scaledUV(new THREE.CylinderGeometry(CORE_R, CORE_R, H, 20, 1, false), 2, H / 3), []);

  // basamaklar: tek InstancedMesh (her basamak bir sonraki basamağın altına kadar uzanan kalın bir taş)
  const stairs = useMemo(() => {
    const len = WALL_R - CORE_R - 0.04, geo = scaledUV(new THREE.BoxGeometry(len, 0.5, 1.1), 1, 0.4);
    const m = new THREE.InstancedMesh(geo, stepMat, TOTAL_STEPS + 2);
    const q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i <= TOTAL_STEPS + 1; i++) {
      const a = (i + 0.5) * STEP_ANGLE, r = (CORE_R + WALL_R) / 2, landing = i % STEPS_PER_TURN === 0 && i > 0;
      q.setFromEuler(new THREE.Euler(0, -a, 0));
      m.setMatrixAt(i, new THREE.Matrix4().compose(v.set(Math.cos(a) * r, (i + 1) * RISE - 0.25, Math.sin(a) * r), q, s.set(1, 1, landing ? 1.6 : 1)));
    }
    m.instanceMatrix.needsUpdate = true; return m;
  }, [stepMat]);
  // alt yüz: sarmalın altını kapatan eğik tavan (yukarı bakınca boşluk görünmesin)
  const underside = useMemo(() => {
    const seg = TOTAL_STEPS * 4, pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= seg; i++) {
      const th = (i / seg) * TOP_THETA, y = floorAt(th) - 0.5;
      for (const r of [CORE_R, WALL_R]) pos.push(Math.cos(th) * r, y, Math.sin(th) * r);
      if (i > 0) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }, []);
  const shaftMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe6b8', alphaMap: shaftAlpha(), transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), []);

  useEffect(() => {
    scene.background = new THREE.Color('#1b1611'); scene.fog = new THREE.FogExp2('#4a3d2e', 0.07);
    (camera as THREE.PerspectiveCamera).fov = 72; (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    return () => { scene.fog = null; };
  }, [camera, scene]);

  const topA = TOP_THETA + 0.3;
  return (
    <group>
      <ambientLight intensity={0.24} color="#d8c7ab" />
      <hemisphereLight args={['#ffe8c2', '#2a2118', 0.35]} />
      <mesh geometry={outer} material={wallIn} position={[0, H / 2 - 1, 0]} />
      <mesh geometry={core} material={wall} position={[0, H / 2 - 1, 0]} />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}><circleGeometry args={[WALL_R, 40]} /><meshStandardMaterial color="#7d7062" roughness={1} /></mesh>
      <primitive object={stairs} />
      <mesh geometry={underside}><meshStandardMaterial color="#8f8370" roughness={1} side={THREE.DoubleSide} /></mesh>
      {WINDOWS.map((w) => { const a = w.theta, y = windowY(w), px = Math.cos(a), pz = Math.sin(a); return (
        <group key={w.id}>
          <group position={[px * (WALL_R - 0.03), y, pz * (WALL_R - 0.03)]} rotation={[0, -a - Math.PI / 2, 0]}>
            <mesh><planeGeometry args={[0.7, 1.4]} /><meshBasicMaterial map={windowView()} toneMapped={false} /></mesh>
            <mesh position={[0, 0, -0.02]}><planeGeometry args={[1.0, 1.75]} /><meshStandardMaterial color="#6d6252" roughness={1} /></mesh>
          </group>
          <mesh material={shaftMat} position={[px * (WALL_R - 1.5), y - 0.9, pz * (WALL_R - 1.5)]} rotation={[0, -a, -(Math.PI / 2 - 0.55)]}>
            <cylinderGeometry args={[0.25, 0.85, 3.4, 10, 1, true]} />
          </mesh>
          <pointLight position={[px * (WALL_R - 0.9), y, pz * (WALL_R - 0.9)]} intensity={7} distance={7} decay={2} color="#ffdcae" />
        </group>); })}
      {/* en tepede sergi katına açılan kapı */}
      <group position={[Math.cos(topA) * (WALL_R - 0.03), TOP_Y + 1.1, Math.sin(topA) * (WALL_R - 0.03)]} rotation={[0, -topA - Math.PI / 2, 0]}>
        <mesh><planeGeometry args={[1.1, 2.2]} /><meshBasicMaterial color="#f0c27a" toneMapped={false} /></mesh>
      </group>
      <pointLight position={[Math.cos(topA) * (WALL_R - 1), TOP_Y + 1.6, Math.sin(topA) * (WALL_R - 1)]} intensity={8} distance={7} color="#ffcf8a" />
    </group>
  );
}
