/**
 * Galata Kulesi — 4. bölüm: teras (ödül). Gün batımında 360° İstanbul.
 *
 * Neden: Tırmanışın ödülü manzaradır; ama serbest kamera yerine dört tarihi bakış noktası sunulur.
 * Oyuncu yatay kaydırarak (ya da düğmelerle) sıradaki noktaya geçer; kamera terasta o yöne yürür, döner
 * ve hedefe yavaşça yakınlaşır (dürbünle bakar gibi). Yönler gerçek koordinatlardan hesaplanır.
 * Işık: prosedürel gün batımı gökyüzü (drei Sky) + yerelde üretilen ortam haritası (drei Environment +
 * Lightformer; HDRI dosyası indirilmez). Gölgeler yalnızca bu bölümde açıktır (cihaz izin verirse).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Sky } from '@react-three/drei';
import { VIEWPOINTS, bearingOf, distanceOf, isWater, toLocal } from './panorama';
import { TOWER } from './dungeon';
import { BALCONY_R, TowerExterior } from './TowerExterior';

const SUN_BEARING = 250, SUN_ELEV = 4;   // ekim–kasım gün batımına yakın (yaklaşık)
const deg = Math.PI / 180;
export const SUN_DIR = new THREE.Vector3(Math.sin(SUN_BEARING * deg) * Math.cos(SUN_ELEV * deg), Math.sin(SUN_ELEV * deg), -Math.cos(SUN_BEARING * deg) * Math.cos(SUN_ELEV * deg));
const EXTENT = 9000;

function groundTexture() {
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d')!, img = g.createImageData(n, n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i / n - 0.5) * EXTENT, z = (j / n - 0.5) * EXTENT, w = isWater(x, z), k = (j * n + i) * 4, v = (Math.sin(i * 0.7) + Math.cos(j * 1.3)) * 3;
    img.data[k] = w ? 46 : 176 + v; img.data[k + 1] = w ? 86 : 156 + v; img.data[k + 2] = w ? 112 : 128 + v; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; return t;
}

/** Şehir dokusu: tek InstancedMesh, su maskesinin dışında rastgele (tohumlu) bloklar */
export function City({ count }: { count: number }) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), count);
    let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const tones = ['#e9dcc5', '#d9c3a0', '#c98f6b', '#e6d2b0', '#b9a58e', '#f0e6d4'].map((c) => new THREE.Color(c));
    const mat = new THREE.Matrix4(), q = new THREE.Quaternion(); let k = 0, guard = 0;
    while (k < count && guard++ < count * 20) {
      const d = 90 + Math.pow(r(), 0.7) * 3600, a = r() * Math.PI * 2, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (isWater(x, z) || isWater(x + 25, z) || isWater(x, z + 25)) continue;
      const w = 14 + r() * 22, h = 8 + r() * 16 + (d < 600 ? 6 : 0);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI);
      m.setMatrixAt(k, mat.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(w, h, w * (0.6 + r() * 0.6))));
      m.setColorAt(k, tones[Math.floor(r() * tones.length)]); k++;
    }
    m.count = k; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    return m;
  }, [count]);
  useEffect(() => () => { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }, [mesh]);
  return <primitive object={mesh} />;
}

const stoneM = new THREE.MeshStandardMaterial({ color: '#e7dccb', roughness: 0.85 });
const leadM = new THREE.MeshStandardMaterial({ color: '#8e9aa1', roughness: 0.5, metalness: 0.2 });
const ochreM = new THREE.MeshStandardMaterial({ color: '#cf9a6e', roughness: 0.85 });

function Minaret({ p, h }: { p: [number, number]; h: number }) {
  return (
    <group position={[p[0], 0, p[1]]}>
      <mesh material={stoneM} position={[0, h / 2, 0]}><cylinderGeometry args={[2, 2.4, h, 10]} /></mesh>
      <mesh material={stoneM} position={[0, h * 0.72, 0]}><cylinderGeometry args={[3, 3, 1, 10]} /></mesh>
      <mesh material={leadM} position={[0, h + 4, 0]}><coneGeometry args={[2.1, 8, 10]} /></mesh>
    </group>
  );
}
function Mosque({ at, w, d, domeR, domeY, minarets, minH, mat = stoneM }: { at: [number, number]; w: number; d: number; domeR: number; domeY: number; minarets: [number, number][]; minH: number; mat?: THREE.Material }) {
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh material={mat} position={[0, domeY / 2, 0]}><boxGeometry args={[w, domeY, d]} /></mesh>
      <mesh material={mat} position={[0, domeY + 2, 0]}><cylinderGeometry args={[domeR * 1.05, domeR * 1.1, 4, 24]} /></mesh>
      <mesh material={leadM} position={[0, domeY + 4, 0]}><sphereGeometry args={[domeR, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} material={leadM} position={[0, domeY - 2, s * domeR * 1.05]}><sphereGeometry args={[domeR * 0.75, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>)}
      {minarets.map((m, i) => <Minaret key={i} p={m} h={minH} />)}
    </group>
  );
}

function Landmarks() {
  const ay = toLocal(VIEWPOINTS[1].coord), su = toLocal(VIEWPOINTS[0].coord), kk = toLocal(VIEWPOINTS[2].coord);
  return (
    <group>
      {/* Süleymaniye: ana kubbe ~26,5 m çap, ~53 m yükseklik; 4 minare */}
      <Mosque at={su} w={58} d={60} domeR={13.3} domeY={36} minH={66} minarets={[[-38, -40], [38, -40], [-30, 30], [30, 30]]} />
      {/* Ayasofya: ana kubbe ~31 m çap, ~55 m; 4 minare; aşı boyalı cephe */}
      <Mosque at={ay} w={72} d={76} domeR={15.5} domeY={38} minH={58} mat={ochreM} minarets={[[-42, -44], [42, -44], [-42, 44], [42, 44]]} />
      {/* Kız Kulesi: küçük ada ve kule */}
      <group position={[kk[0], 0, kk[1]]}>
        <mesh material={stoneM} position={[0, 1.2, 0]}><cylinderGeometry args={[22, 24, 2.4, 20]} /></mesh>
        <mesh material={stoneM} position={[0, 9, 4]}><boxGeometry args={[14, 14, 20]} /></mesh>
        <mesh material={stoneM} position={[0, 20, -4]}><cylinderGeometry args={[3.2, 3.6, 22, 12]} /></mesh>
        <mesh material={leadM} position={[0, 33, -4]}><coneGeometry args={[3.8, 6, 12]} /></mesh>
      </group>
    </group>
  );
}

function Ships() {
  const ref = useRef<THREE.Group>(null!);
  const ships = useMemo(() => [[1500, -900, 0.3], [2100, -300, 1.4], [1300, 200, 2.6], [2400, 900, 0.9], [-300, 520, 1.6]] as const, []);
  useFrame(({ clock }) => ref.current.children.forEach((c, i) => { c.position.x = ships[i][0] + Math.sin(clock.elapsedTime * 0.02 + i) * 60; }));
  return (
    <group ref={ref}>
      {ships.map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
          <mesh position={[0, 3, 0]}><boxGeometry args={[46, 6, 11]} /><meshStandardMaterial color={i % 2 ? '#f2efe8' : '#3d4a56'} roughness={0.6} /></mesh>
          <mesh position={[-6, 8, 0]}><boxGeometry args={[16, 5, 9]} /><meshStandardMaterial color="#f5f3ee" roughness={0.6} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** Kamerayı terasta, bakış noktasının yönüne yürütüp o yöne çevirir; açıyı en kısa yoldan değiştirir */
function PanoramaCamera({ index }: { index: number }) {
  const { camera } = useThree();
  const cur = useRef(bearingOf(VIEWPOINTS[index].coord) * deg);
  const fov = useRef(55);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), vp = VIEWPOINTS[index];
    const want = bearingOf(vp.coord) * deg;
    let d = ((want - cur.current + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    cur.current += d * (1 - Math.exp(-dt * 1.6));
    const b = cur.current, r = BALCONY_R - 0.7;
    camera.position.set(Math.sin(b) * r, TOWER.terraceY + 1.65, -Math.cos(b) * r);
    const dist = distanceOf(vp.coord);
    v.set(Math.sin(b) * dist, 18, -Math.cos(b) * dist);
    camera.lookAt(v);
    d = Math.abs(d);
    // döndükten sonra hedefe yakınlaş (dürbün etkisi); dönerken geniş açı
    const targetFov = d > 0.08 ? 55 : THREE.MathUtils.clamp((2 * Math.atan(150 / dist)) / deg, 9, 40);
    fov.current += (targetFov - fov.current) * (1 - Math.exp(-dt * 1.2));
    const pc = camera as THREE.PerspectiveCamera; pc.fov = fov.current; pc.updateProjectionMatrix();
  });
  return null;
}

export default function TerracePanorama({ index, shadows, blocks }: { index: number; shadows: boolean; blocks: number }) {
  const { scene, gl } = useThree();
  const ground = useMemo(groundTexture, []);
  const sun = useRef<THREE.DirectionalLight>(null!);
  useEffect(() => {
    scene.fog = new THREE.Fog('#e7b48e', 700, 7000); scene.background = null;
    const prev = gl.toneMappingExposure; gl.toneMappingExposure = 0.85;
    const c = sun.current.shadow.camera; c.left = -14; c.right = 14; c.top = 14; c.bottom = -14; c.near = 1; c.far = 200; c.updateProjectionMatrix();
    sun.current.target.position.set(0, TOWER.terraceY, 0); sun.current.target.updateMatrixWorld();
    return () => { scene.fog = null; gl.toneMappingExposure = prev; };
  }, [scene, gl]);
  return (
    <group>
      <Sky sunPosition={SUN_DIR.clone().multiplyScalar(1000).toArray()} turbidity={10} rayleigh={3} mieCoefficient={0.006} mieDirectionalG={0.85} distance={20000} />
      {/* gün batımı ortam haritası: dosya yerine sahnede üretilir */}
      <Environment resolution={64} frames={1}>
        <color attach="background" args={['#3b3f5c']} />
        <Lightformer form="rect" intensity={3} color="#ff9a52" position={SUN_DIR.clone().multiplyScalar(10).toArray()} scale={[14, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.8} color="#8fa6d8" position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
      </Environment>
      <hemisphereLight args={['#ffd9b5', '#8a7f8f', 1.1]} />
      <directionalLight ref={sun} position={SUN_DIR.clone().multiplyScalar(90).add(new THREE.Vector3(0, TOWER.terraceY, 0)).toArray()} intensity={2.4} color="#ffb070"
        castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow={false}>
        <planeGeometry args={[EXTENT, EXTENT]} /><meshStandardMaterial map={ground} roughness={0.75} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}><planeGeometry args={[60000, 60000]} /><meshStandardMaterial color="#2e5670" roughness={0.6} /></mesh>
      <City count={blocks} />
      <Landmarks />
      <Ships />
      <TowerExterior shadows={shadows} />
      <PanoramaCamera index={index} />
    </group>
  );
}
