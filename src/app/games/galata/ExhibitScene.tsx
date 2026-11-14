/**
 * Galata Kulesi — 3. bölüm: sergi katı (Osmanlı → Cumhuriyet).
 * Kamera: halka biçimli galeride yalnızca ileri/geri (bakış sabit, hafifçe duvara dönük). Henüz dinlenmemiş
 * bir vitrine yaklaşınca kamera kendiliğinden kilitlenir, objenin etrafında yavaşça döner (auto-zoom orbit)
 * ve anlatım başlar. Oyuncu kamerayı hiçbir zaman serbestçe döndüremez.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EXHIBITS, GALLERY_R, START_ANGLE, VITRINE_R, nearestExhibit, type Exhibit } from './exhibits';
import { INNER_R } from './dungeon';
import { scaledUV, useStoneMaterial } from './TowerExterior';

const ROOM_H = 4.6;
const brass = new THREE.MeshStandardMaterial({ color: '#b8923e', metalness: 0.75, roughness: 0.35 });
const iron = new THREE.MeshStandardMaterial({ color: '#3b3836', metalness: 0.6, roughness: 0.55 });
const wood = new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 0.8 });

function mapTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 360; const g = c.getContext('2d')!;
  g.fillStyle = '#e8d9b5'; g.fillRect(0, 0, 512, 360);
  g.fillStyle = '#9fb7c2'; g.beginPath(); g.moveTo(0, 230); g.bezierCurveTo(140, 200, 260, 250, 512, 210); g.lineTo(512, 360); g.lineTo(0, 360); g.fill();   // Haliç
  g.strokeStyle = '#6b4a2f'; g.lineWidth = 6; g.beginPath(); g.moveTo(90, 215); g.lineTo(130, 70); g.lineTo(300, 40); g.lineTo(420, 110); g.lineTo(440, 205); g.stroke();   // surlar
  g.fillStyle = '#6b4a2f'; g.beginPath(); g.arc(250, 70, 14, 0, Math.PI * 2); g.fill();   // kule
  g.font = 'italic 26px serif'; g.fillText('Galata', 205, 150); g.font = 'italic 18px serif'; g.fillText('Christea Turris', 190, 105);
  g.strokeStyle = 'rgba(80,60,40,.35)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(140 + i * 45, 120); g.lineTo(150 + i * 40, 200); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function ExhibitObject({ id }: { id: string }) {
  const map = useMemo(() => (id === 'harita' ? mapTexture() : null), [id]);
  const wing = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.5, 0.35, 1.1, 0.25); for (let i = 0; i < 6; i++) s.lineTo(1.0 - i * 0.17, 0.05 - (i % 2) * 0.08); s.lineTo(0, 0);
    return new THREE.ShapeGeometry(s);
  }, []);
  if (id === 'harita') return <mesh rotation={[-1.1, 0, 0]} position={[0, 0.12, 0]}><planeGeometry args={[0.9, 0.63]} /><meshStandardMaterial map={map!} roughness={0.9} /></mesh>;
  if (id === 'zincir') return (
    <group position={[0, 0.12, 0]}>
      {Array.from({ length: 7 }, (_, i) => <mesh key={i} material={iron} position={[-0.42 + i * 0.14, 0, 0]} rotation={[i % 2 ? Math.PI / 2 : 0, 0, 0]}><torusGeometry args={[0.07, 0.018, 6, 16]} /></mesh>)}
    </group>
  );
  if (id === 'kanat') return (
    <group position={[0, 0.45, 0]}>
      <mesh geometry={wing} position={[0.04, 0, 0]} rotation={[0, 0, 0.25]} scale={0.5}><meshStandardMaterial color="#efe6d2" side={THREE.DoubleSide} roughness={0.9} /></mesh>
      <mesh geometry={wing} position={[-0.04, 0, 0]} rotation={[0, Math.PI, 0.25]} scale={0.5}><meshStandardMaterial color="#efe6d2" side={THREE.DoubleSide} roughness={0.9} /></mesh>
      <mesh material={wood} position={[0, -0.15, 0]}><cylinderGeometry args={[0.012, 0.012, 0.6, 6]} /></mesh>
    </group>
  );
  return (
    <group position={[0, 0.1, 0]}>
      <mesh material={brass} position={[0, 0.38, 0]} rotation={[0, 0, 1.2]}><cylinderGeometry args={[0.05, 0.035, 0.75, 16]} /></mesh>
      {[0, 2.1, 4.2].map((a) => <mesh key={a} material={wood} position={[Math.cos(a) * 0.1, 0.17, Math.sin(a) * 0.1]} rotation={[Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]}><cylinderGeometry args={[0.01, 0.01, 0.36, 5]} /></mesh>)}
    </group>
  );
}

function Vitrine({ e, done, active }: { e: Exhibit; done: boolean; active: boolean }) {
  const x = Math.cos(e.angle) * VITRINE_R, z = Math.sin(e.angle) * VITRINE_R;
  const glow = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => { glow.current.intensity = active ? 6 : done ? 2 : 3 + Math.sin(clock.elapsedTime * 2) * 1; });
  return (
    <group position={[x, 0, z]} rotation={[0, -e.angle - Math.PI / 2, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow={false}><boxGeometry args={[1.2, 1, 0.8]} /><meshStandardMaterial color="#3a2f26" roughness={0.7} /></mesh>
      <group position={[0, 1, 0]}><ExhibitObject id={e.id} /></group>
      <mesh position={[0, 1.42, 0]}><boxGeometry args={[1.16, 0.84, 0.76]} /><meshStandardMaterial color="#cfe3ea" transparent opacity={0.12} roughness={0.05} depthWrite={false} /></mesh>
      <pointLight ref={glow} position={[0, 2.1, 0.2]} distance={3.2} decay={2} color="#ffe2b4" />
      {done && <mesh position={[0.48, 1.06, 0.41]}><circleGeometry args={[0.05, 16]} /><meshBasicMaterial color="#3bb273" /></mesh>}
    </group>
  );
}

export default function ExhibitScene({ move, seen, locked, onLock }: {
  move: React.MutableRefObject<number>; seen: string[]; locked: Exhibit | null; onLock: (e: Exhibit) => void;
}) {
  const { camera, scene } = useThree();
  const wall = useStoneMaterial('#d6c9b2');
  const wallIn = useMemo(() => { const m = wall.clone(); m.side = THREE.BackSide; return m; }, [wall]);
  const walls = useMemo(() => scaledUV(new THREE.CylinderGeometry(INNER_R, INNER_R, ROOM_H, 40, 1, true), 9, ROOM_H / 3), []);
  const ang = useRef(START_ANGLE);
  const pos = useRef(new THREE.Vector3()), look = useRef(new THREE.Vector3()), init = useRef(false);
  const seenRef = useRef(seen); seenRef.current = seen;
  const lockedRef = useRef(locked); lockedRef.current = locked;

  useEffect(() => {
    scene.background = new THREE.Color('#2a2420'); scene.fog = null;
    (camera as THREE.PerspectiveCamera).fov = 60; (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera, scene]);

  const wantPos = useMemo(() => new THREE.Vector3(), []), wantLook = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05), L = lockedRef.current;
    if (L) {
      // otomatik yörünge: vitrinin önünde, yavaşça sağa-sola salınan yakın plan
      const cx = Math.cos(L.angle) * VITRINE_R, cz = Math.sin(L.angle) * VITRINE_R, sw = Math.sin(clock.elapsedTime * 0.35) * 0.45;
      const a = L.angle + Math.PI + sw;   // vitrinden odanın içine doğru
      wantPos.set(cx + Math.cos(a) * 1.55, 1.75, cz + Math.sin(a) * 1.55);
      wantLook.set(cx, 1.15, cz);
    } else {
      ang.current += move.current * dt * 0.38;
      const a = ang.current;
      wantPos.set(Math.cos(a) * GALLERY_R, 1.62, Math.sin(a) * GALLERY_R);
      // bakış: yürüme yönü, ~25° duvara (vitrinlere) dönük
      const t = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)), o = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      wantLook.copy(wantPos).addScaledVector(t, Math.cos(0.45) * 3).addScaledVector(o, Math.sin(0.45) * 3).setY(1.3);
      const near = nearestExhibit(a, seenRef.current);
      if (near) onLock(near);
    }
    if (!init.current) { pos.current.copy(wantPos); look.current.copy(wantLook); init.current = true; }
    const k = 1 - Math.exp(-dt * (L ? 2.2 : 6));
    pos.current.lerp(wantPos, k); look.current.lerp(wantLook, k);
    camera.position.copy(pos.current); camera.lookAt(look.current);
    const pc = camera as THREE.PerspectiveCamera, fov = L ? 42 : 60;   // otomatik yakınlaşma
    if (Math.abs(pc.fov - fov) > 0.05) { pc.fov += (fov - pc.fov) * k; pc.updateProjectionMatrix(); }
  });

  return (
    <group>
      <ambientLight intensity={0.35} color="#f3e3c8" />
      <hemisphereLight args={['#fff2da', '#3a2d22', 0.45]} />
      <mesh geometry={walls} material={wallIn} position={[0, ROOM_H / 2, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[INNER_R, 40]} /><meshStandardMaterial color="#6f5843" roughness={0.85} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}><circleGeometry args={[INNER_R, 40]} /><meshStandardMaterial color="#5a4a3b" roughness={1} /></mesh>
      {/* ahşap tavan kirişleri */}
      {[0, Math.PI / 3, (2 * Math.PI) / 3].map((r) => <mesh key={r} material={wood} position={[0, ROOM_H - 0.15, 0]} rotation={[0, r, 0]}><boxGeometry args={[INNER_R * 2, 0.25, 0.25]} /></mesh>)}
      {EXHIBITS.map((e) => <Vitrine key={e.id} e={e} done={seen.includes(e.id)} active={locked?.id === e.id} />)}
      <pointLight position={[0, 3.6, 0]} intensity={14} distance={9} decay={2} color="#ffe2b4" />
    </group>
  );
}
