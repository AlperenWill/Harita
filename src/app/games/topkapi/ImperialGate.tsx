/**
 * Bâb-ı Hümâyun (birinci bölüm) ve kuş bakışı avlular (ikinci bölüm).
 *
 * Neden: Saraya giriş bir eşik deneyimidir. Kamera birinci şahıs, yalnızca ileri/geri; kapıya yaklaşınca tuğra parlar, kamera
 * kendiliğinden yukarı bakıp yakınlaşır ve kapı "konuşur". Avlularda ise sarayın büyüklüğünü hissettirmek için kamera önceden
 * tanımlı bir rotada drone gibi süzülür (kullanıcı kontrolü yok); yapılar sırayla etiketlenir.
 * LOD: avludaki ağaçlar uzakta kameraya dönük düz sprite (billboard), 55 m'den yakında 3D gövde + taç. Geçiş 0,3 sn'de bir güncellenir.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COURT, DRONE, DRONE_SECONDS, type V3 } from './palace';
import { gold, plaster, tughraTexture } from './materials';

const SKY = '#b9d3ea';
export function Outdoors({ fogFar = 420 }: { fogFar?: number }) {
  const { scene } = useThree();
  useEffect(() => { scene.background = new THREE.Color(SKY); scene.fog = new THREE.Fog('#cfe0ee', 60, fogFar); return () => { scene.fog = null; }; }, [scene, fogFar]);
  return (<><hemisphereLight args={['#f2f7ff', '#8a7a5c', 1.1]} /><directionalLight position={[-60, 90, 50]} intensity={2.1} color="#fff1dc" /></>);
}

/** Kapı: kalın taş kütle, sivri kemerli geçit, iki yanda niş, üstte kitabe kuşağı ve tuğra */
export function ImperialGate({ glow }: { glow: React.MutableRefObject<number> }) {
  const M = useMemo(() => ({ stone: plaster('#d9d2c2', 0.85), dark: plaster('#3a342c'), marble: plaster('#efeae0', 0.5), gold: gold(), ground: plaster('#b9ae98', 1), green: new THREE.MeshStandardMaterial({ color: '#20402c', roughness: 1, flatShading: true }),
    tugra: new THREE.MeshBasicMaterial({ map: tughraTexture(), transparent: true, toneMapped: false }) }), []);
  const arch = useMemo(() => { const s = new THREE.Shape(); s.moveTo(-9, 0); s.lineTo(9, 0); s.lineTo(9, 11); s.lineTo(-9, 11); s.lineTo(-9, 0); const h = new THREE.Path(); h.moveTo(-2.2, 0); h.lineTo(-2.2, 4.2); h.quadraticCurveTo(-2.1, 6.6, 0, 7.4); h.quadraticCurveTo(2.1, 6.6, 2.2, 4.2); h.lineTo(2.2, 0); s.holes.push(h); return new THREE.ExtrudeGeometry(s, { depth: 6, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-3, 0, 0); }, []);
  const halo = useRef<THREE.Mesh>(null!);
  useFrame(() => { M.tugra.color.setScalar(1 + glow.current * 0.9); (halo.current.material as THREE.MeshBasicMaterial).opacity = 0.1 + glow.current * 0.1; });
  const cypress = useMemo(() => { const g = mergeGeometries([new THREE.CylinderGeometry(0.2, 0.25, 1.2, 6).translate(0, 0.6, 0).toNonIndexed(), new THREE.ConeGeometry(1.1, 8, 7).translate(0, 5, 0).toNonIndexed()])!; const m = new THREE.InstancedMesh(g, M.green, 12); for (let i = 0; i < 12; i++) m.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-32 + (i >> 1) * 5.5, 0, (i % 2 ? 1 : -1) * (7 + (i % 3)))); return m; }, [M.green]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={M.ground}><planeGeometry args={[220, 160]} /></mesh>
      <mesh geometry={arch} material={M.stone} />
      {/* sur duvarları */}
      {[-1, 1].map((s) => <mesh key={s} material={M.stone} position={[0, 4.5, s * 34]}><boxGeometry args={[3, 9, 50]} /></mesh>)}
      {/* yan nişler ve mermer kemer çerçevesi */}
      {[-1, 1].map((s) => <mesh key={`n${s}`} material={M.dark} position={[-3.02, 2.6, s * 5.6]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[1.6, 3.6]} /></mesh>)}
      <mesh material={M.marble} position={[-3.03, 8.9, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[9, 1.1]} /></mesh>
      <mesh material={M.gold} position={[-3.05, 8.9, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[8.4, 0.5]} /></mesh>
      {/* tuğra */}
      <mesh ref={halo} position={[-3.04, 7.9, 0]} rotation={[0, -Math.PI / 2, 0]}><circleGeometry args={[1.5, 32]} /><meshBasicMaterial color="#ffd27a" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
      <mesh material={M.tugra} position={[-3.06, 7.9, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[2.2, 1.65]} /></mesh>
      <primitive object={cypress} />
    </group>
  );
}

/* ---------- avlular: düşük poligonlu saray maketi + billboard LOD ağaçlar ---------- */
function treeSprite() { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d')!; g.fillStyle = '#4a3524'; g.fillRect(29, 86, 6, 42); g.fillStyle = '#2f5a35'; g.beginPath(); g.ellipse(32, 52, 26, 46, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(24, 40, 12, 22, 0, 0, Math.PI * 2); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
export const LOD_NEAR = 55;
function Trees({ count }: { count: number }) {
  const { camera } = useThree();
  const spots = useMemo(() => { let s = 8; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); const out: V3[] = []; while (out.length < count) { const x = -30 + r() * 200, z = -26 + r() * 52; if (Math.abs(z) < 5 || COURT.some((b) => Math.abs(x - b.pos[0]) < b.size[0] / 2 + 3 && Math.abs(z - b.pos[2]) < b.size[2] / 2 + 3)) continue; out.push([x, 0, z]); } return out; }, [count]);
  const { mesh3d, sprites } = useMemo(() => {
    const g = mergeGeometries([new THREE.CylinderGeometry(0.22, 0.3, 2.6, 6).translate(0, 1.3, 0).toNonIndexed(), new THREE.IcosahedronGeometry(2.3, 0).scale(1, 1.3, 1).translate(0, 4.6, 0)])!;
    const a = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: '#35603a', roughness: 1, flatShading: true }), count);
    const b = new THREE.InstancedMesh(new THREE.PlaneGeometry(5, 9).translate(0, 4.5, 0), new THREE.MeshBasicMaterial({ map: treeSprite(), transparent: true, alphaTest: 0.4 }), count);
    a.frustumCulled = b.frustumCulled = false; return { mesh3d: a, sprites: b };
  }, [count]);
  const last = useRef(-1);
  useFrame(({ clock }) => {
    if (clock.elapsedTime - last.current < 0.3) return; last.current = clock.elapsedTime;
    let n3 = 0, ns = 0; const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    for (const s of spots) {
      p.set(...s);
      if (p.distanceTo(camera.position) < LOD_NEAR) mesh3d.setMatrixAt(n3++, m.makeTranslation(s[0], 0, s[2]));
      else { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(camera.position.x - s[0], camera.position.z - s[2])); sprites.setMatrixAt(ns++, m.compose(p, q, one)); }   // kameraya dönük (yalnızca düşey eksende)
    }
    mesh3d.count = n3; sprites.count = ns; mesh3d.instanceMatrix.needsUpdate = sprites.instanceMatrix.needsUpdate = true;
  });
  return <><primitive object={mesh3d} /><primitive object={sprites} /></>;
}
export function Courtyards({ trees, onLabel, onEnd }: { trees: number; onLabel: (name: string | null) => void; onEnd: () => void }) {
  const { camera } = useThree();
  const M = useMemo(() => ({ wall: plaster('#dcd3c0'), roof: new THREE.MeshStandardMaterial({ color: '#8f9aa0', roughness: 0.5, metalness: 0.3 }), grass: plaster('#7f9a62', 1), path: plaster('#d6ccb6', 1) }), []);
  const P = useMemo(() => ({ pos: new THREE.CatmullRomCurve3(DRONE.map((d) => new THREE.Vector3(...d.pos))), look: new THREE.CatmullRomCurve3(DRONE.map((d) => new THREE.Vector3(...d.look))) }), []);
  const t0 = useRef<number | null>(null), label = useRef<string | null>(null), ended = useRef(false);
  useFrame(({ clock }) => {
    if (t0.current === null) t0.current = clock.elapsedTime;
    const u = Math.min(1, (clock.elapsedTime - t0.current) / DRONE_SECONDS), e = u * u * (3 - 2 * u), lk = P.look.getPoint(e);
    camera.position.copy(P.pos.getPoint(e)); camera.position.y += Math.sin(clock.elapsedTime * 0.7) * 0.25; camera.lookAt(lk);
    const cam = camera as THREE.PerspectiveCamera; if (cam.fov !== 50) { cam.fov = 50; cam.updateProjectionMatrix(); }
    let best: string | null = null, bd = 34; for (const b of COURT) { const d = Math.hypot(b.pos[0] - lk.x, b.pos[2] - lk.z); if (d < bd) { bd = d; best = b.name; } }
    if (best !== label.current) { label.current = best; onLabel(best); }
    if (u >= 1 && !ended.current) { ended.current = true; onEnd(); }
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[70, 0, 0]} material={M.grass}><planeGeometry args={[420, 260]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[65, 0.03, 0]} material={M.path}><planeGeometry args={[230, 7]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} material={M.wall} position={[70, 3, s * 62]}><boxGeometry args={[250, 6, 1.5]} /></mesh>)}
      {COURT.map((b) => (
        <group key={b.id} position={[b.pos[0], 0, b.pos[2]]}>
          <mesh material={M.wall} position={[0, b.size[1] / 2, 0]}><boxGeometry args={b.size} /></mesh>
          {b.kind === 'kapi' ? [-1, 1].map((s) => <mesh key={s} material={M.roof} position={[0, b.size[1] + 2.5, s * b.size[2] * 0.36]}><coneGeometry args={[2.2, 5, 8]} /></mesh>)
            : <mesh material={M.roof} position={[0, b.size[1], 0]}><sphereGeometry args={[Math.min(b.size[0], b.size[2]) * 0.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>}
          {b.kind === 'kule' && <><mesh material={M.wall} position={[5, 16, -3]}><boxGeometry args={[4, 32, 4]} /></mesh><mesh material={M.roof} position={[5, 36, -3]}><coneGeometry args={[3.2, 8, 8]} /></mesh></>}
          <Html position={[0, b.size[1] + 9, 0]} center distanceFactor={90} style={{ pointerEvents: 'none' }}><span className="whitespace-nowrap rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white">{b.name}</span></Html>
        </group>
      ))}
      <Trees count={trees} />
    </group>
  );
}
