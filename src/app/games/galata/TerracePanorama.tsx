/**
 * Galata Kulesi — 4. bölüm: teras (ödül). Gün batımında 360° İstanbul.
 *
 * Tırmanışın ödülü manzaradır. Oyuncu balkonda kulenin çevresinde birinci şahıs yürür, serbestçe bakar ve
 * dört tarihi noktayı kendisi bulur; dürbünle (yakınlaştırma) bakıp tanır. Yönler gerçek koordinatlardan hesaplanır.
 * Işık: prosedürel gün batımı gökyüzü (drei Sky) + yerelde üretilen ortam haritası (drei Environment +
 * Lightformer; HDRI dosyası indirilmez). Gölgeler yalnızca bu bölümde açıktır (cihaz izin verirse).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Sky } from '@react-three/drei';
import { isWater, toLocal } from './panorama';
import { TOWER } from './dungeon';
import { TowerExterior } from './TowerExterior';
import { Skyline, Terrain, landHeight } from './Skyline';

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

/** Cephe dokusu: 4 sütun × 5 kat pencere, zemin katı koyu bant (beyaz; örnek rengiyle çarpılır) */
function facadeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  for (let f = 0; f < 5; f++) for (let k = 0; k < 4; k++) { const x = 9 + k * 30, y = 8 + f * 22; g.fillStyle = f === 4 ? '#5a5048' : '#4c5560'; g.fillRect(x, y, f === 4 ? 22 : 16, f === 4 ? 18 : 13); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x, y + (f === 4 ? 18 : 13), f === 4 ? 22 : 16, 2); }
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 104, 128, 3);   // kat silmesi
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/**
 * Şehir dokusu: 3–6 katlı binalar (pencereli cephe, çoğunda kiremit kırma çatı). Gövde ve çatı ayrı InstancedMesh; tepeleri izler.
 * Cephe dokusu yan yüzlerde, düz damlarda dokusuz gri: yukarıdan bakınca damda pencere görünmez.
 */
export function City({ count }: { count: number }) {
  const { body, roof } = useMemo(() => {
    const tex = facadeTexture(), side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), top = new THREE.MeshStandardMaterial({ color: '#b8ada0', roughness: 0.95 });
    const body = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), [side, side, top, top, side, side], count);
    const roof = new THREE.InstancedMesh(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), count);
    let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const tones = ['#f1e7d6', '#e9d6b8', '#e3c7a1', '#d9b28e', '#efe3cf', '#cfc3b3', '#e8c9b0'].map((c) => new THREE.Color(c));
    const tiles = ['#a4553f', '#b4644a', '#9a4e3a', '#b97355'].map((c) => new THREE.Color(c));
    const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0); let k = 0, rk = 0, guard = 0;
    while (k < count && guard++ < count * 25) {
      const d = 70 + Math.pow(r(), 0.75) * 3600, a = r() * Math.PI * 2, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (isWater(x, z) || isWater(x + 14, z) || isWater(x, z + 14)) continue;
      if (KEEP_CLEAR.some(([cx, cz, rr]) => Math.hypot(x - cx, z - cz) < rr)) continue;   // anıt yapıların çevresi açık
      const w = 9 + r() * 10, dd = 8 + r() * 8, h = 9 + r() * 10 + (d < 500 ? 4 : 0), y = landHeight(x, z) - 1;
      q.setFromAxisAngle(up, Math.round(r() * 4) * (Math.PI / 2) + (r() - 0.5) * 0.4);
      body.setMatrixAt(k, mat.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(w, h, dd))); body.setColorAt(k, tones[Math.floor(r() * tones.length)]); k++;
      if (r() < 0.68) { roof.setMatrixAt(rk, mat.compose(new THREE.Vector3(x, y + h, z), q, new THREE.Vector3(w * 1.06, 2.2 + r() * 1.6, dd * 1.06))); roof.setColorAt(rk, tiles[Math.floor(r() * tiles.length)]); rk++; }
    }
    for (const [m, n] of [[body, k], [roof, rk]] as const) { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); }
    return { body, roof };
  }, [count]);
  useEffect(() => () => { for (const m of [body, roof]) { m.geometry.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose()); } }, [body, roof]);
  return <><primitive object={body} /><primitive object={roof} /></>;
}

/** Şehir blokları anıtların çevresine konmaz (yerel m: x, z, yarıçap) */
const KEEP_CLEAR: [number, number, number][] = [
  [...toLocal([28.96403, 41.01611]), 120], [...toLocal([28.98008, 41.00854]), 90], [...toLocal([28.97684, 41.00539]), 120],
  [...toLocal([28.97197, 41.01702]), 80], [...toLocal([28.98339, 41.01153]), 160],
] as [number, number, number][];

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

export default function TerracePanorama({ shadows, blocks }: { shadows: boolean; blocks: number }) {
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
      <Terrain texture={ground} extent={EXTENT} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}><planeGeometry args={[60000, 60000]} /><meshStandardMaterial color="#4f7f97" roughness={0.22} metalness={0.35} /></mesh>
      {/* binalar küçüldü (3–6 kat): sayısı kademeye göre 4 katı */}
      <City count={Math.round(blocks * 4)} />
      <Skyline />
      <Ships />
      <TowerExterior shadows={shadows} />
    </group>
  );
}
