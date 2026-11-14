/**
 * Kulenin dış görünüşü (prosedürel; GLB yok). Ölçüler yaklaşıktır: gövde yarıçapı 8,2 m, teras ~51,65 m,
 * külah ucu ~66,9 m. Gövde 1K prosedürel taş dokusu + normal haritasıyla kaplanır.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { stoneTextures } from './textures';
import { TOWER } from './dungeon';

export const BALCONY_R = TOWER.outerR + 1.4;
const UPPER_TOP = TOWER.terraceY + 6;

function scaledUV(geo: THREE.BufferGeometry, sx: number, sy: number) {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  return geo;
}
export function useStoneMaterial(color = '#ffffff', sx = 1, sy = 1) {
  return useMemo(() => {
    const { map, normal } = stoneTextures();
    const m = new THREE.MeshStandardMaterial({ map, normalMap: normal, color, roughness: 0.95, normalScale: new THREE.Vector2(0.9, 0.9) });
    m.userData.uv = [sx, sy];
    return m;
  }, [color, sx, sy]);
}

export function TowerExterior({ shadows = false, segments = 40 }: { shadows?: boolean; segments?: number }) {
  const stone = useStoneMaterial('#f3ece0');
  const body = useMemo(() => scaledUV(new THREE.CylinderGeometry(TOWER.outerR, TOWER.outerR * 1.03, TOWER.terraceY, segments, 1, true), 8, 10), [segments]);
  const upper = useMemo(() => scaledUV(new THREE.CylinderGeometry(TOWER.outerR - 0.5, TOWER.outerR - 0.5, UPPER_TOP - TOWER.terraceY, segments, 1, true), 7, 1.3), [segments]);
  const lead = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7d8a92', roughness: 0.55, metalness: 0.15 }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1d1a17', roughness: 1 }), []);
  const rail = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2c2a28', roughness: 0.6, metalness: 0.4 }), []);
  // gövdedeki küçük kemerli pencereler (koyu nişler)
  const windows = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const rows = [9, 17, 25, 33, 41, 47];
    rows.forEach((y, r) => {
      const n = r < 2 ? 4 : 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r * 0.4;
        const m = new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * (TOWER.outerR + 0.02), y, Math.sin(a) * (TOWER.outerR + 0.02)),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a + Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1));
        out.push(m);
      }
    });
    return out;
  }, []);
  const winGeo = useMemo(() => { const s = new THREE.Shape(); s.moveTo(-0.55, 0); s.lineTo(-0.55, 1.6); s.absarc(0, 1.6, 0.55, Math.PI, 0, true); s.lineTo(0.55, 0); s.closePath(); return new THREE.ShapeGeometry(s, 6); }, []);
  const arches = useMemo(() => {
    const out: THREE.Matrix4[] = []; const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, r = TOWER.outerR - 0.48;
      out.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * r, TOWER.terraceY + 1.4, Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a + Math.PI / 2, 0)), new THREE.Vector3(1.3, 1.9, 1)));
    }
    return out;
  }, []);
  const posts = useMemo(() => {
    const out: THREE.Matrix4[] = []; const n = 120;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; out.push(new THREE.Matrix4().makeTranslation(Math.cos(a) * (BALCONY_R - 0.1), TOWER.terraceY + 0.55, Math.sin(a) * (BALCONY_R - 0.1))); }
    return out;
  }, []);
  return (
    <group>
      <mesh geometry={body} material={stone} position={[0, TOWER.terraceY / 2, 0]} castShadow={shadows} receiveShadow={shadows} />
      <Inst geo={winGeo} mat={dark} mats={windows} />
      {/* teras: konsollu döşeme, korkuluk */}
      <mesh position={[0, TOWER.terraceY - 0.2, 0]} receiveShadow={shadows} castShadow={shadows}>
        <cylinderGeometry args={[BALCONY_R, TOWER.outerR, 0.6, segments]} /><meshStandardMaterial color="#cfc3ad" roughness={0.9} />
      </mesh>
      <mesh position={[0, TOWER.terraceY + 1.08, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow={shadows}><torusGeometry args={[BALCONY_R - 0.1, 0.04, 6, 96]} /><primitive object={rail} attach="material" /></mesh>
      <Inst geo={useMemo(() => new THREE.CylinderGeometry(0.02, 0.02, 1.1, 4), [])} mat={rail} mats={posts} cast={shadows} />
      {/* üst kat ve kemerli açıklıklar */}
      <mesh geometry={upper} material={stone} position={[0, (TOWER.terraceY + UPPER_TOP) / 2, 0]} castShadow={shadows} receiveShadow={shadows} />
      <Inst geo={winGeo} mat={dark} mats={arches} />
      <mesh position={[0, UPPER_TOP + 0.2, 0]}><cylinderGeometry args={[TOWER.outerR + 0.2, TOWER.outerR - 0.4, 0.5, segments]} /><meshStandardMaterial color="#d9cdb6" roughness={0.9} /></mesh>
      {/* kurşun kaplı külah */}
      <mesh material={lead} position={[0, (UPPER_TOP + 0.4 + TOWER.height) / 2, 0]} castShadow={shadows}>
        <coneGeometry args={[TOWER.outerR + 0.4, TOWER.height - UPPER_TOP - 0.4, segments]} />
      </mesh>
      <mesh position={[0, TOWER.height + 0.6, 0]}><cylinderGeometry args={[0.06, 0.12, 1.4, 6]} /><meshStandardMaterial color="#b8962e" metalness={0.6} roughness={0.35} /></mesh>
    </group>
  );
}

function Inst({ geo, mat, mats, cast = false }: { geo: THREE.BufferGeometry; mat: THREE.Material; mats: THREE.Matrix4[]; cast?: boolean }) {
  const mesh = useMemo(() => { const m = new THREE.InstancedMesh(geo, mat, mats.length); mats.forEach((x, i) => m.setMatrixAt(i, x)); m.castShadow = cast; return m; }, [geo, mat, mats, cast]);
  return <primitive object={mesh} />;
}
export { scaledUV };
